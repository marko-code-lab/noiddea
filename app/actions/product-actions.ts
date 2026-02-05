/**
 * Server Actions para gestión de productos
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * Crea un nuevo producto con sus presentaciones
 */
export async function createProduct(data: {
  branchId: string;
  name: string;
  description?: string;
  expiration?: string; // ISO date string (timestampz)
  brand?: string;
  barcode?: string;
  sku?: string;
  cost: number;
  price: number;
  stock?: number;
  bonification?: number;
  presentations: Array<{
    variant: string;
    units: number;
    price?: number;
  }>;
}) {
  try {
    // Validar datos básicos (presentaciones ahora son opcionales, "unidad" se crea automáticamente)
    if (!data.branchId || !data.name) {
      return {
        success: false,
        error: 'Branch ID y nombre del producto son requeridos',
      };
    }

    // Obtener usuario autenticado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Obtener el negocio del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    // Verificar que tenga permisos
    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para crear productos',
      };
    }

    // Verificar que el branch pertenezca al negocio
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, business_id')
      .eq('id', data.branchId)
      .eq('business_id', businessUser.business_id)
      .single();

    if (branchError || !branch) {
      console.error('Error verificando branch:', branchError);
      return {
        success: false,
        error: 'La sucursal no existe o no pertenece a tu negocio',
      };
    }

    // Usar admin client para crear el producto
    const admin = createAdminClient();

    // Insertar producto con costo, precio, stock y bonificación
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        branch_id: data.branchId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        expiration: data.expiration || null,
        brand: data.brand?.trim() || null,
        barcode: data.barcode?.trim() || null,
        sku: data.sku?.trim() || null,
        cost: data.cost,
        price: data.price,
        stock: data.stock || 0,
        bonification: data.bonification || 0,
        created_by_user_id: user.id,
        is_active: true,
      } as any)
      .select()
      .single();

    if (productError) {
      console.error('❌ Error creando producto:', productError);
      return {
        success: false,
        error: `Error creando producto: ${productError.message}`,
      };
    }

    // Crear presentación "unidad" automáticamente
    // La base de datos usa variant/units, no name/unit
    const presentationsData = [
      // Presentación base "unidad" con el precio base del producto
      {
        product_id: product.id,
        variant: 'unidad',
        units: 1,
        price: data.price,
        is_active: true,
      },
      // Presentaciones adicionales
      ...data.presentations.map(p => ({
        product_id: product.id,
        variant: p.variant.trim(),
        units: p.units,
        price: p.price || data.price,
        is_active: true,
      })),
    ];

    const { error: presentationsError } = await admin
      .from('product_presentations')
      .insert(presentationsData);

    if (presentationsError) {
      console.error('❌ Error creando presentaciones:', presentationsError);
      // Intentar eliminar el producto creado
      await admin.from('products').delete().eq('id', product.id);
      return {
        success: false,
        error: `Error creando presentaciones: ${presentationsError.message}`,
      };
    }

    console.log('✅ Producto creado:', product.id, product.name);

    return {
      success: true,
      productId: product.id,
      productName: product.name,
    };
  } catch (error) {
    console.error('❌ Error en createProduct:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene todos los productos de un negocio con sus presentaciones
 * Si se proporciona branchId, filtra por productos creados en esa sucursal
 * Soporta paginación para mejor rendimiento con grandes volúmenes de datos
 */
export async function getProducts(
  branchId?: string,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
  }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado', products: [] };
    }

    let businessId: string | null = null;

    // OPTIMIZACIÓN: Hacer ambas consultas en paralelo
    const [businessUserResult, branchUserResult] = await Promise.all([
      supabase
        .from('businesses_users')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('branches_users')
        .select('branch:branches(business_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (businessUserResult.data) {
      businessId = businessUserResult.data.business_id;
    } else if (branchUserResult.data) {
      const branch = branchUserResult.data.branch as any;
      businessId = branch?.business_id;
    }

    if (!businessId) {
      return {
        success: false,
        error: 'No tienes un negocio asociado',
        products: [],
      };
    }

    // Construir query - el stock ahora está directamente en products
    let query = supabase
      .from('products')
      .select(
        `
        *,
        product_presentations (*)
      `,
        { count: 'exact' }
      )
      .eq('is_active', true);

    // Si se proporciona branchId, filtrar por sucursal
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    // Búsqueda por texto (nombre, descripción, marca)
    if (options?.search) {
      const searchTerm = options.search.toLowerCase();
      query = query.or(
        `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`
      );
    }

    // Paginación
    const page = options?.page || 1;
    const limit = options?.limit || 50; // Default: 50 productos por página
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: products, error: productsError, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (productsError) {
      logger.error('Error obteniendo productos', productsError, { branchId, options });
      return { success: false, error: productsError.message, products: [] };
    }

    return {
      success: true,
      products: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    logger.error('Error en getProducts', error, { branchId, options });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      products: [],
    };
  }
}

/**
 * Obtiene un producto específico por ID
 * Evita consultas N+1 al obtener todos los productos
 */
export async function getProductById(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado', product: null };
    }

    // Obtener producto directamente por ID
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(
        `
        *,
        product_presentations (*)
      `
      )
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return {
        success: false,
        error: productError?.message || 'Producto no encontrado',
        product: null,
      };
    }

    // Verificar que el usuario tenga acceso al negocio del producto
    let businessId: string | null = null;

    const [businessUserResult, branchUserResult] = await Promise.all([
      supabase
        .from('businesses_users')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('branches_users')
        .select('branch:branches(business_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (businessUserResult.data) {
      businessId = businessUserResult.data.business_id;
    } else if (branchUserResult.data) {
      const branch = branchUserResult.data.branch as any;
      businessId = branch?.business_id;
    }

    // Obtener el business_id del producto a través de la branch
    const { data: productBranch } = await supabase
      .from('branches')
      .select('business_id')
      .eq('id', product.branch_id)
      .single();

    if (!productBranch || productBranch.business_id !== businessId) {
      return {
        success: false,
        error: 'No tienes acceso a este producto',
        product: null,
      };
    }

    return {
      success: true,
      product,
    };
  } catch (error) {
    logger.error('Error en getProductById', error, { productId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      product: null,
    };
  }
}

/**
 * Actualiza un producto existente
 */
export async function updateProduct(
  productId: string,
  data: {
    name?: string;
    description?: string;
    expiration?: string; // ISO date string (timestampz)
    brand?: string;
    barcode?: string;
    sku?: string;
    stock?: number;
    cost?: number;
    price?: number;
    bonification?: number;
    is_active?: boolean;
  }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Verificar permisos del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para actualizar productos',
      };
    }

    // Actualizar producto
    const admin = createAdminClient();
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim() || null;
    if (data.expiration !== undefined) updateData.expiration = data.expiration || null;
    if (data.brand !== undefined) updateData.brand = data.brand.trim() || null;
    if (data.barcode !== undefined) updateData.barcode = data.barcode.trim() || null;
    if (data.sku !== undefined) updateData.sku = data.sku.trim() || null;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.bonification !== undefined) updateData.bonification = data.bonification;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { error: updateError } = await admin
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      console.error('❌ Error actualizando producto:', updateError);
      return { success: false, error: updateError.message };
    }

    // Si se actualizó el precio base, actualizar también la presentación "unidad"
    if (data.price !== undefined) {
      const { error: unitPresentationError } = await admin
        .from('product_presentations')
        .update({ price: data.price } as any)
        .eq('product_id', productId)
        .eq('variant', 'unidad'); // La base de datos usa variant, no name

      if (unitPresentationError) {
        console.error('⚠️ Error actualizando presentación unidad:', unitPresentationError);
        // No retornar error, el producto principal ya se actualizó
      } else {
        console.log('✅ Presentación "unidad" actualizada con nuevo precio:', data.price);
      }
    }

    console.log('✅ Producto actualizado:', productId);

    return { success: true };
  } catch (error) {
    console.error('❌ Error en updateProduct:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza las presentaciones de un producto
 */
export async function updateProductPresentations(
  productId: string,
  presentations: Array<{
    id?: string;
    variant: string;
    units: number;
    price?: number;
  }>
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Verificar permisos
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para actualizar presentaciones',
      };
    }

    const admin = createAdminClient();

    // 1. Obtener presentaciones existentes (excluyendo "unidad")
    // La presentación "unidad" nunca se edita ni elimina
    const { data: existingPresentations } = await admin
      .from('product_presentations')
      .select('id, variant')
      .eq('product_id', productId)
      .neq('variant', 'unidad'); // Excluir "unidad" - la base de datos usa variant

    const existingIds = existingPresentations?.map(p => p.id) || [];
    const updatingIds = presentations.filter(p => p.id).map(p => p.id!);

    // 2. Eliminar presentaciones que ya no están en la lista
    // (nunca se eliminará "unidad" porque está excluida en la query)
    const toDelete = existingIds.filter(id => !updatingIds.includes(id));
    if (toDelete.length > 0) {
      await admin
        .from('product_presentations')
        .delete()
        .in('id', toDelete);
    }

    // 3. Actualizar o crear presentaciones usando operaciones batch
    const toUpdate = presentations.filter(p => p.id);
    const toInsert = presentations.filter(p => !p.id);

    // Actualizar todas las presentaciones existentes en batch
    if (toUpdate.length > 0) {
      // Supabase no soporta update batch directo, pero podemos hacerlo en paralelo
      await Promise.all(
        toUpdate.map(presentation =>
          admin
            .from('product_presentations')
            .update({
              variant: presentation.variant,
              units: presentation.units,
              price: presentation.price || null,
            } as any)
            .eq('id', presentation.id!)
        )
      );
    }

    // Insertar todas las nuevas presentaciones en batch
    if (toInsert.length > 0) {
      await admin
        .from('product_presentations')
        .insert(
          toInsert.map(presentation => ({
            product_id: productId,
            variant: presentation.variant,
            units: presentation.units,
            price: presentation.price || null,
            is_active: true,
          })) as any
        );
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error actualizando presentaciones:', error);
    return { success: false, error: 'Error actualizando presentaciones' };
  }
}

/**
 * Elimina un producto (soft delete)
 */
export async function deleteProduct(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Verificar permisos - primero intentar desde businesses_users (admin/owner)
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    let businessId: string | null = null;
    let userBranchId: string | null = null;
    let hasPermission = false;

    if (businessUser) {
      // Usuario es admin/owner
      if (businessUser.role === 'owner' || businessUser.role === 'admin') {
        businessId = businessUser.business_id;
        hasPermission = true;
      }
    } else {
      // Si no es admin/owner, intentar desde branches_users (manager)
      const { data: branchUser } = await supabase
        .from('branches_users')
        .select('branch_id, role, branch:branches(business_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (branchUser && branchUser.role === 'manager') {
        const branch = branchUser.branch as any;
        businessId = branch?.business_id;
        userBranchId = branchUser.branch_id;
        hasPermission = true;
      }
    }

    if (!hasPermission || !businessId) {
      return {
        success: false,
        error: 'No tienes permisos para eliminar productos',
      };
    }

    // Usar admin client para obtener el producto y verificar permisos
    const admin = createAdminClient();

    // Verificar que el producto existe
    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, branch_id')
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      console.error('❌ Error obteniendo producto:', productError);
      return { success: false, error: 'Error verificando producto' };
    }

    if (!product) {
      return { success: false, error: 'Producto no encontrado' };
    }

    // Verificar que la sucursal del producto pertenece al negocio del usuario
    const { data: branch } = await admin
      .from('branches')
      .select('business_id')
      .eq('id', product.branch_id)
      .maybeSingle();

    if (!branch || branch.business_id !== businessId) {
      return {
        success: false,
        error: 'No tienes permisos para eliminar este producto',
      };
    }

    // Si es manager, verificar que el producto pertenezca a su sucursal asignada
    if (userBranchId && product.branch_id !== userBranchId) {
      return {
        success: false,
        error: 'No tienes permisos para eliminar productos de otras sucursales',
      };
    }

    // Soft delete: marcar como inactivo
    console.log('🗑️ Intentando eliminar producto:', productId);

    const { data: updatedProduct, error: deleteError } = await admin
      .from('products')
      .update({ is_active: false } as any)
      .eq('id', productId)
      .select();

    if (deleteError) {
      console.error('❌ Error eliminando producto:', deleteError);
      console.error('❌ Detalles del error:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code,
      });
      return {
        success: false,
        error: `Error eliminando producto: ${deleteError.message}`
      };
    }

    console.log('✅ Producto marcado como inactivo:', updatedProduct);

    // También marcar presentaciones como inactivas
    const { error: presentationsError } = await admin
      .from('product_presentations')
      .update({ is_active: false } as any)
      .eq('product_id', productId);

    if (presentationsError) {
      console.error('❌ Error marcando presentaciones como inactivas:', presentationsError);
      // No retornar error, el producto ya está marcado como inactivo
    }

    console.log('✅ Producto eliminado correctamente (soft delete)');
    return { success: true };
  } catch (error) {
    console.error('❌ Error en deleteProduct:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Elimina múltiples productos a la vez
 */
export async function deleteProducts(productIds: string[]) {
  try {
    if (!productIds || productIds.length === 0) {
      return { success: false, error: 'No se proporcionaron productos para eliminar' };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Verificar permisos - primero intentar desde businesses_users (admin/owner)
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    let businessId: string | null = null;
    let userBranchId: string | null = null;
    let hasPermission = false;

    if (businessUser) {
      // Usuario es admin/owner
      if (businessUser.role === 'owner' || businessUser.role === 'admin') {
        businessId = businessUser.business_id;
        hasPermission = true;
      }
    } else {
      // Si no es admin/owner, intentar desde branches_users (manager)
      const { data: branchUser } = await supabase
        .from('branches_users')
        .select('branch_id, role, branch:branches(business_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (branchUser && branchUser.role === 'manager') {
        const branch = branchUser.branch as any;
        businessId = branch?.business_id;
        userBranchId = branchUser.branch_id;
        hasPermission = true;
      }
    }

    if (!hasPermission || !businessId) {
      return {
        success: false,
        error: 'No tienes permisos para eliminar productos',
      };
    }

    const admin = createAdminClient();

    // Verificar que todos los productos pertenezcan al negocio del usuario
    const { data: products, error: productsError } = await admin
      .from('products')
      .select('id, branch_id')
      .in('id', productIds);

    if (productsError || !products) {
      return { success: false, error: 'Error verificando productos' };
    }

    // Verificar que todas las sucursales pertenezcan al negocio
    const branchIds = [...new Set(products.map((p: any) => p.branch_id))];
    const { data: branches, error: branchesError } = await admin
      .from('branches')
      .select('id, business_id')
      .in('id', branchIds);

    if (branchesError || !branches) {
      return { success: false, error: 'Error verificando sucursales' };
    }

    const invalidBranches = branches.filter(
      (b: any) => b.business_id !== businessId
    );

    if (invalidBranches.length > 0) {
      return {
        success: false,
        error: 'Algunos productos no pertenecen a tu negocio',
      };
    }

    // Si es manager, verificar que todos los productos pertenezcan a su sucursal asignada
    if (userBranchId) {
      const invalidProducts = products.filter(
        (p: any) => p.branch_id !== userBranchId
      );

      if (invalidProducts.length > 0) {
        return {
          success: false,
          error: 'No tienes permisos para eliminar productos de otras sucursales',
        };
      }
    }

    // Eliminar todos los productos (soft delete)
    const { error: deleteError } = await admin
      .from('products')
      .update({ is_active: false } as any)
      .in('id', productIds);

    if (deleteError) {
      return {
        success: false,
        error: `Error eliminando productos: ${deleteError.message}`,
      };
    }

    // Marcar presentaciones como inactivas
    await admin
      .from('product_presentations')
      .update({ is_active: false } as any)
      .in('product_id', productIds);

    return {
      success: true,
      deletedCount: productIds.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Importa todos los productos de una sucursal a otra
 * Todos los productos importados tendrán stock 0
 */
export async function importProductsFromBranch(data: {
  sourceBranchId: string;
  targetBranchId: string;
}) {
  try {
    // Validar datos
    if (!data.sourceBranchId || !data.targetBranchId) {
      return {
        success: false,
        error: 'Las sucursales de origen y destino son requeridas',
      };
    }

    if (data.sourceBranchId === data.targetBranchId) {
      return {
        success: false,
        error: 'No puedes importar productos de la misma sucursal',
      };
    }

    // Obtener usuario autenticado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Obtener el negocio del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    // Verificar que tenga permisos
    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para importar productos',
      };
    }

    // Verificar que ambas sucursales pertenezcan al negocio
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, business_id, name')
      .in('id', [data.sourceBranchId, data.targetBranchId])
      .eq('business_id', businessUser.business_id);

    if (branchesError || !branches || branches.length !== 2) {
      return {
        success: false,
        error: 'Las sucursales no existen o no pertenecen a tu negocio',
      };
    }

    const sourceBranch = branches.find(b => b.id === data.sourceBranchId);
    const targetBranch = branches.find(b => b.id === data.targetBranchId);

    if (!sourceBranch || !targetBranch) {
      return {
        success: false,
        error: 'No se encontraron las sucursales especificadas',
      };
    }

    // Obtener todos los productos activos de la sucursal origen con sus presentaciones
    const { data: sourceProducts, error: productsError } = await supabase
      .from('products')
      .select(
        `
        *,
        product_presentations (*)
      `
      )
      .eq('branch_id', data.sourceBranchId)
      .eq('is_active', true);

    if (productsError) {
      console.error('❌ Error obteniendo productos:', productsError);
      return {
        success: false,
        error: `Error obteniendo productos: ${productsError.message}`,
      };
    }

    if (!sourceProducts || sourceProducts.length === 0) {
      return {
        success: false,
        error: 'No hay productos para importar en la sucursal seleccionada',
      };
    }

    // Usar admin client para crear los productos
    const admin = createAdminClient();

    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Importar cada producto
    for (const sourceProduct of sourceProducts) {
      try {
        // Validar que el producto tenga los campos requeridos
        if (!sourceProduct.name) {
          console.error(`❌ Producto sin nombre:`, sourceProduct);
          errorCount++;
          errors.push(`Producto sin nombre (ID: ${sourceProduct.id})`);
          continue;
        }

        // Crear el producto en la sucursal destino con stock 0
        const productData: any = {
          branch_id: data.targetBranchId,
          name: sourceProduct.name.trim(),
          description: sourceProduct.description?.trim() || null,
          expiration: sourceProduct.expiration || null,
          brand: sourceProduct.brand?.trim() || null,
          barcode: sourceProduct.barcode?.trim() || null,
          sku: sourceProduct.sku?.trim() || null,
          stock: 0, // Todos los productos importados tienen stock 0
          created_by_user_id: user.id,
          is_active: true,
        };

        // Restore cost and price to products table
        if (sourceProduct.cost !== undefined && sourceProduct.cost !== null) {
          productData.cost = sourceProduct.cost;
        }
        if (sourceProduct.price !== undefined && sourceProduct.price !== null) {
          productData.price = sourceProduct.price;
        }

        const { data: newProduct, error: productError } = await admin
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (productError) {
          console.error(`❌ Error creando producto ${sourceProduct.name}:`, productError);
          console.error('Datos del producto:', productData);
          errorCount++;
          errors.push(`${sourceProduct.name}: ${productError.message}`);
          continue;
        }

        // Obtener las presentaciones del producto origen
        const presentations = sourceProduct.product_presentations || [];
        console.log(`📦 Producto ${sourceProduct.name}: ${presentations.length} presentaciones encontradas`);
        if (presentations.length > 0) {
          console.log('🔍 Estructura de la primera presentación:', JSON.stringify(presentations[0], null, 2));
        }

        // Siempre crear al menos la presentación "unidad" si no hay presentaciones
        // o si las presentaciones existentes usan el formato antiguo (variant/units)
        let presentationsData: any[] = [];

        if (presentations.length > 0) {
          // Mapear presentaciones: la base de datos usa variant/units, no name/unit
          presentationsData = presentations
            .filter((p: any) => p.is_active !== false)
            .map((p: any) => {
              // La base de datos real usa variant y units
              let presentationVariant: string;
              let presentationUnits: number;

              if (p.variant && p.units !== undefined) {
                // Formato correcto: variant/units
                presentationVariant = p.variant;
                presentationUnits = p.units;
              } else if (p.name && p.unit !== undefined) {
                // Si viene con name/unit (del schema desactualizado), convertir a variant/units
                presentationVariant = p.name;
                // Intentar extraer units de unit (ej: "unidad x6" -> 6)
                const unitMatch = p.unit.match(/x(\d+)/);
                presentationUnits = unitMatch ? parseInt(unitMatch[1]) : 1;
              } else {
                // Fallback: usar valores por defecto
                console.warn(`⚠️ Presentación con formato desconocido para ${sourceProduct.name}:`, p);
                presentationVariant = 'unidad';
                presentationUnits = 1;
              }

              // Usar variant y units como en la base de datos real
              return {
                product_id: newProduct.id,
                variant: presentationVariant,
                units: presentationUnits,
                price: p.price !== undefined && p.price !== null ? p.price : (sourceProduct.price || 0),
                is_active: true,
              };
            });
        } else {
          // Si no hay presentaciones, crear la presentación "unidad" por defecto
          presentationsData = [
            {
              product_id: newProduct.id,
              variant: 'unidad',
              units: 1,
              price: sourceProduct.price || 0,
              is_active: true,
            },
          ];
        }

        // Insertar todas las presentaciones
        if (presentationsData.length > 0) {
          // Limpiar los datos: usar variant y units como en la base de datos real
          const cleanedPresentationsData = presentationsData.map((p: any) => {
            // La base de datos usa variant y units, no name y unit
            const cleaned: any = {
              product_id: p.product_id,
              variant: p.variant,
              units: p.units,
              price: p.price !== undefined && p.price !== null ? p.price : 0,
              is_active: true,
            };
            return cleaned;
          });

          console.log(`💾 Insertando ${cleanedPresentationsData.length} presentaciones para ${sourceProduct.name}`);
          console.log('📋 Datos de presentaciones a insertar:', JSON.stringify(cleanedPresentationsData, null, 2));
          const { error: presentationsError } = await admin
            .from('product_presentations')
            .insert(cleanedPresentationsData as any);

          if (presentationsError) {
            console.error(
              `❌ Error creando presentaciones para ${sourceProduct.name}:`,
              presentationsError
            );
            console.error('Datos de presentaciones:', presentationsData);
            // Eliminar el producto creado si falla la creación de presentaciones
            await admin.from('products').delete().eq('id', newProduct.id);
            errorCount++;
            errors.push(
              `${sourceProduct.name}: Error creando presentaciones - ${presentationsError.message}`
            );
            continue;
          }
          console.log(`✅ Presentaciones creadas para ${sourceProduct.name}`);
        }

        importedCount++;
      } catch (error) {
        console.error(`❌ Error importando producto ${sourceProduct.name}:`, error);
        errorCount++;
        errors.push(
          `${sourceProduct.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    console.log(
      `✅ Importación completada: ${importedCount} productos importados, ${errorCount} errores`
    );

    return {
      success: true,
      importedCount,
      errorCount,
      totalProducts: sourceProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('❌ Error en importProductsFromBranch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Transfiere stock de un producto de una sucursal a otra
 * Si el producto no existe en la sucursal destino, lo crea
 */
export async function transferProductStock(data: {
  productId: string;
  sourceBranchId: string;
  targetBranchId: string;
  quantity: number;
  targetProductId?: string; // ID del producto destino si ya existe
  newProductName?: string; // Nombre del nuevo producto si se va a crear
  newProductDescription?: string; // Descripción del nuevo producto
  createIfNotExists?: boolean;
}) {
  try {
    // Validar datos
    if (!data.productId || !data.sourceBranchId || !data.targetBranchId || !data.quantity) {
      return {
        success: false,
        error: 'Todos los campos son requeridos',
      };
    }

    if (data.quantity <= 0) {
      return {
        success: false,
        error: 'La cantidad debe ser mayor a 0',
      };
    }

    if (data.sourceBranchId === data.targetBranchId) {
      return {
        success: false,
        error: 'No puedes transferir a la misma sucursal',
      };
    }

    // Obtener usuario autenticado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Obtener el negocio del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    // Verificar que tenga permisos
    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para transferir productos',
      };
    }

    // Verificar que ambas sucursales pertenezcan al negocio
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, business_id, name')
      .in('id', [data.sourceBranchId, data.targetBranchId])
      .eq('business_id', businessUser.business_id);

    if (branchesError || !branches || branches.length !== 2) {
      return {
        success: false,
        error: 'Las sucursales no existen o no pertenecen a tu negocio',
      };
    }

    const admin = createAdminClient();

    // Obtener el producto de la sucursal origen
    const { data: sourceProduct, error: productError } = await admin
      .from('products')
      .select('*')
      .eq('id', data.productId)
      .eq('branch_id', data.sourceBranchId)
      .single();

    if (productError || !sourceProduct) {
      return {
        success: false,
        error: 'El producto no existe en la sucursal origen',
      };
    }

    // Verificar que hay suficiente stock
    const currentStock = sourceProduct.stock || 0;
    if (currentStock < data.quantity) {
      return {
        success: false,
        error: `Stock insuficiente. Disponible: ${currentStock} unidades`,
      };
    }

    let targetProduct: any = null;

    // Si se proporciona un targetProductId, usar ese producto
    if (data.targetProductId) {
      const { data: product, error: productError } = await admin
        .from('products')
        .select('*')
        .eq('id', data.targetProductId)
        .eq('branch_id', data.targetBranchId)
        .single();

      if (productError || !product) {
        return {
          success: false,
          error: 'El producto destino seleccionado no existe',
        };
      }

      targetProduct = product;
    } else if (data.newProductName) {
      // Si se proporciona un nombre para crear, crear el producto
      if (!data.createIfNotExists) {
        return {
          success: false,
          error: 'Debes activar la opción para crear el producto',
        };
      }

      // Crear el producto en la sucursal destino
      const { data: newProduct, error: createError } = await admin
        .from('products')
        .insert({
          branch_id: data.targetBranchId,
          name: data.newProductName.trim(),
          description: data.newProductDescription?.trim() || sourceProduct.description,
          expiration: sourceProduct.expiration,
          brand: sourceProduct.brand,
          barcode: sourceProduct.barcode,
          sku: sourceProduct.sku,
          cost: sourceProduct.cost,
          price: sourceProduct.price,
          stock: data.quantity,
          bonification: sourceProduct.bonification,
          created_by_user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: `Error creando producto en destino: ${createError.message}`,
        };
      }

      // Copiar las presentaciones del producto origen
      const { data: sourcePresentations } = await admin
        .from('product_presentations')
        .select('*')
        .eq('product_id', sourceProduct.id);

      if (sourcePresentations && sourcePresentations.length > 0) {
        const presentationsToInsert = sourcePresentations.map((pres: any) => ({
          product_id: newProduct.id,
          variant: pres.variant,
          units: pres.units,
          price: pres.price,
          is_active: pres.is_active,
        }));

        await admin.from('product_presentations').insert(presentationsToInsert);
      }

      // Restar stock de la sucursal origen
      const { error: updateError } = await admin
        .from('products')
        .update({ stock: currentStock - data.quantity })
        .eq('id', data.productId);

      if (updateError) {
        return {
          success: false,
          error: `Error actualizando stock origen: ${updateError.message}`,
        };
      }

      return {
        success: true,
        message: `Producto "${data.newProductName}" creado en destino y ${data.quantity} unidades transferidas`,
      };
    } else {
      // Si no se proporcionó targetProductId ni newProductName, buscar por nombre/barcode
      const { data: existingProducts } = await admin
        .from('products')
        .select('*')
        .eq('branch_id', data.targetBranchId);

      targetProduct = existingProducts?.find(
        (p) => p.name === sourceProduct.name || (sourceProduct.barcode && p.barcode === sourceProduct.barcode)
      );

      if (!targetProduct) {
        // El producto no existe en destino
        if (!data.createIfNotExists) {
          return {
            success: false,
            error: 'El producto no existe en la sucursal destino. Selecciona un producto o crea uno nuevo.',
          };
        }

        // Crear el producto con el nombre del origen
        const { data: newProduct, error: createError } = await admin
          .from('products')
          .insert({
            branch_id: data.targetBranchId,
            name: sourceProduct.name,
            description: sourceProduct.description,
            expiration: sourceProduct.expiration,
            brand: sourceProduct.brand,
            barcode: sourceProduct.barcode,
            sku: sourceProduct.sku,
            cost: sourceProduct.cost,
            price: sourceProduct.price,
            stock: data.quantity,
            bonification: sourceProduct.bonification,
            created_by_user_id: user.id,
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          return {
            success: false,
            error: `Error creando producto en destino: ${createError.message}`,
          };
        }

        // Copiar las presentaciones del producto origen
        const { data: sourcePresentations } = await admin
          .from('product_presentations')
          .select('*')
          .eq('product_id', sourceProduct.id);

        if (sourcePresentations && sourcePresentations.length > 0) {
          const presentationsToInsert = sourcePresentations.map((pres: any) => ({
            product_id: newProduct.id,
            variant: pres.variant,
            units: pres.units,
            price: pres.price,
            is_active: pres.is_active,
          }));

          await admin.from('product_presentations').insert(presentationsToInsert);
        }

        // Restar stock de la sucursal origen
        const { error: updateError } = await admin
          .from('products')
          .update({ stock: currentStock - data.quantity })
          .eq('id', data.productId);

        if (updateError) {
          return {
            success: false,
            error: `Error actualizando stock origen: ${updateError.message}`,
          };
        }

        return {
          success: true,
          message: `Producto creado en destino y ${data.quantity} unidades transferidas`,
        };
      }
      // El producto existe en destino, solo actualizar stock
      const targetStock = targetProduct.stock || 0;

      // Sumar stock a destino
      const { error: updateTargetError } = await admin
        .from('products')
        .update({ stock: targetStock + data.quantity })
        .eq('id', targetProduct.id);

      if (updateTargetError) {
        return {
          success: false,
          error: `Error actualizando stock destino: ${updateTargetError.message}`,
        };
      }

      // Restar stock de origen
      const { error: updateSourceError } = await admin
        .from('products')
        .update({ stock: currentStock - data.quantity })
        .eq('id', data.productId);

      if (updateSourceError) {
        // Revertir el cambio en destino si falla la actualización de origen
        await admin
          .from('products')
          .update({ stock: targetStock })
          .eq('id', targetProduct.id);

        return {
          success: false,
          error: `Error actualizando stock origen: ${updateSourceError.message}`,
        };
      }

      return {
        success: true,
        message: `${data.quantity} unidades transferidas exitosamente`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Importa productos desde un archivo Excel
 * El archivo debe tener las siguientes columnas:
 * - nombre (requerido)
 * - descripcion (opcional)
 * - marca (opcional)
 * - codigo_barras (opcional)
 * - sku (opcional)
 * - costo (requerido)
 * - precio (requerido)
 * - stock (opcional, default 0)
 * - bonificacion (opcional, default 0)
 * - fecha_vencimiento (opcional, formato: YYYY-MM-DD)
 * - presentaciones (opcional, formato: "variante:unidades:precio" separadas por "|")
 */
export async function importProductsFromExcel(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const branchId = formData.get('branchId') as string;

    if (!file) {
      return {
        success: false,
        error: 'No se proporcionó ningún archivo',
      };
    }

    if (!branchId) {
      return {
        success: false,
        error: 'No se proporcionó el ID de la sucursal',
      };
    }

    // Validar que sea un archivo Excel
    const validExtensions = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    ];

    if (!validExtensions.includes(file.type) && !file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
      return {
        success: false,
        error: 'El archivo debe ser un Excel (.xlsx, .xls, .xlsm)',
      };
    }

    // Obtener usuario autenticado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Obtener el negocio del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    // Verificar que tenga permisos
    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para importar productos',
      };
    }

    // Verificar que el branch pertenezca al negocio
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, business_id')
      .eq('id', branchId)
      .eq('business_id', businessUser.business_id)
      .single();

    if (branchError || !branch) {
      return {
        success: false,
        error: 'La sucursal no existe o no pertenece a tu negocio',
      };
    }

    // Leer el archivo Excel
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Obtener la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        error: 'El archivo Excel no contiene hojas',
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as any[][];

    if (data.length < 2) {
      return {
        success: false,
        error: 'El archivo Excel debe tener al menos una fila de datos (además del encabezado)',
      };
    }

    // Obtener encabezados (primera fila)
    const headers = data[0].map((h: any) =>
      String(h || '').toLowerCase().trim()
    ) as string[];

    // Mapear nombres de columnas comunes
    const columnMap: Record<string, string> = {
      'nombre': 'nombre',
      'name': 'nombre',
      'producto': 'nombre',
      'product': 'nombre',
      'descripcion': 'descripcion',
      'description': 'descripcion',
      'desc': 'descripcion',
      'marca': 'marca',
      'brand': 'marca',
      'codigo_barras': 'codigo_barras',
      'barcode': 'codigo_barras',
      'codigo': 'codigo_barras',
      'sku': 'sku',
      'costo': 'costo',
      'cost': 'costo',
      'precio': 'precio',
      'price': 'precio',
      'stock': 'stock',
      'inventario': 'stock',
      'inventory': 'stock',
      'bonificacion': 'bonificacion',
      'bonification': 'bonificacion',
      'fecha_vencimiento': 'fecha_vencimiento',
      'expiration': 'fecha_vencimiento',
      'exp': 'fecha_vencimiento',
      'vencimiento': 'fecha_vencimiento',
      'presentaciones': 'presentaciones',
      'presentations': 'presentaciones',
      'variantes': 'presentaciones',
      'variants': 'presentaciones',
    };

    // Crear índice de columnas
    const columnIndex: Record<string, number> = {};
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      const mappedColumn = columnMap[normalizedHeader];
      if (mappedColumn) {
        columnIndex[mappedColumn] = index;
      }
    });

    // Validar columnas requeridas
    if (columnIndex['nombre'] === undefined) {
      return {
        success: false,
        error: 'El archivo debe tener una columna "nombre" o "name"',
      };
    }

    if (columnIndex['costo'] === undefined && columnIndex['precio'] === undefined) {
      return {
        success: false,
        error: 'El archivo debe tener columnas "costo" y "precio" (o "cost" y "price")',
      };
    }

    const admin = createAdminClient();
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Procesar cada fila (empezando desde la fila 2, índice 1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Saltar filas vacías
      if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
        continue;
      }

      try {
        // Extraer datos de la fila
        const getValue = (column: string): string | null => {
          const index = columnIndex[column];
          if (index === undefined || index >= row.length) return null;
          const value = row[index];
          return value !== null && value !== undefined ? String(value).trim() : null;
        };

        const nombre = getValue('nombre');
        if (!nombre || nombre === '') {
          errorCount++;
          errors.push(`Fila ${i + 1}: Nombre es requerido`);
          continue;
        }

        const descripcion = getValue('descripcion');
        const marca = getValue('marca');
        const codigoBarras = getValue('codigo_barras');
        const sku = getValue('sku');

        // Parsear números
        const costoStr = getValue('costo') || getValue('precio') || '0';
        const precioStr = getValue('precio') || getValue('costo') || '0';
        const stockStr = getValue('stock') || '0';
        const bonificacionStr = getValue('bonificacion') || '0';

        const costo = parseFloat(String(costoStr).replace(/[^0-9.-]/g, '')) || 0;
        const precio = parseFloat(String(precioStr).replace(/[^0-9.-]/g, '')) || 0;
        const stock = parseFloat(String(stockStr).replace(/[^0-9.-]/g, '')) || 0;
        const bonificacion = parseFloat(String(bonificacionStr).replace(/[^0-9.-]/g, '')) || 0;

        if (costo < 0 || precio < 0) {
          errorCount++;
          errors.push(`Fila ${i + 1} (${nombre}): Costo y precio deben ser números positivos`);
          continue;
        }

        // Parsear fecha de vencimiento
        let fechaVencimiento: string | null = null;
        const fechaStr = getValue('fecha_vencimiento');
        if (fechaStr) {
          try {
            // Intentar parsear diferentes formatos de fecha
            const date = new Date(fechaStr);
            if (!isNaN(date.getTime())) {
              fechaVencimiento = date.toISOString();
            }
          } catch {
            // Si no se puede parsear, se deja como null
          }
        }

        // Parsear presentaciones
        const presentaciones: Array<{ variant: string; units: number; price?: number }> = [];
        const presentacionesStr = getValue('presentaciones');
        if (presentacionesStr) {
          // Formato: "variante:unidades:precio|variante2:unidades2:precio2"
          const presentacionesArray = presentacionesStr.split('|');
          for (const presStr of presentacionesArray) {
            const parts = presStr.split(':').map(p => p.trim());
            if (parts.length >= 2) {
              const variant = parts[0];
              const units = parseInt(parts[1]) || 1;
              const price = parts[2] ? parseFloat(parts[2].replace(/[^0-9.-]/g, '')) : undefined;

              if (variant && units > 0) {
                presentaciones.push({ variant, units, price });
              }
            }
          }
        }

        // Crear el producto
        const productData: any = {
          branch_id: branchId,
          name: nombre,
          description: descripcion || null,
          expiration: fechaVencimiento,
          brand: marca || null,
          barcode: codigoBarras || null,
          sku: sku || null,
          cost: costo,
          price: precio,
          stock: stock,
          bonification: bonificacion,
          created_by_user_id: user.id,
          is_active: true,
        };

        const { data: product, error: productError } = await admin
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (productError) {
          console.error(`❌ Error creando producto ${nombre}:`, productError);
          errorCount++;
          errors.push(`Fila ${i + 1} (${nombre}): ${productError.message}`);
          continue;
        }

        // Crear presentaciones
        const presentationsData: any[] = [
          // Presentación base "unidad"
          {
            product_id: product.id,
            variant: 'unidad',
            units: 1,
            price: precio,
            is_active: true,
          },
          // Presentaciones adicionales
          ...presentaciones.map(p => ({
            product_id: product.id,
            variant: p.variant,
            units: p.units,
            price: p.price || precio,
            is_active: true,
          })),
        ];

        if (presentationsData.length > 0) {
          const { error: presentationsError } = await admin
            .from('product_presentations')
            .insert(presentationsData);

          if (presentationsError) {
            console.error(`❌ Error creando presentaciones para ${nombre}:`, presentationsError);
            // Eliminar el producto creado si falla la creación de presentaciones
            await admin.from('products').delete().eq('id', product.id);
            errorCount++;
            errors.push(`Fila ${i + 1} (${nombre}): Error creando presentaciones - ${presentationsError.message}`);
            continue;
          }
        }

        importedCount++;
      } catch (error) {
        console.error(`❌ Error procesando fila ${i + 1}:`, error);
        errorCount++;
        errors.push(`Fila ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    console.log(
      `✅ Importación desde Excel completada: ${importedCount} productos importados, ${errorCount} errores`
    );

    return {
      success: true,
      importedCount,
      errorCount,
      totalRows: data.length - 1,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('❌ Error en importProductsFromExcel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Genera una plantilla Excel para importar productos
 */
export async function generateExcelTemplate() {
  try {
    const XLSX = await import('xlsx');

    // Crear datos de ejemplo
    const data = [
      // Encabezados
      [
        'nombre',
        'descripcion',
        'marca',
        'codigo_barras',
        'sku',
        'costo',
        'precio',
        'stock',
        'bonificacion',
        'fecha_vencimiento',
        'presentaciones',
      ],
      // Fila de ejemplo
      [
        'Producto Ejemplo',
        'Descripción del producto',
        'Marca Ejemplo',
        '1234567890123',
        'SKU-001',
        10.50,
        15.99,
        100,
        0,
        '2025-12-31',
        'pack:6:89.99|caja:12:179.99',
      ],
      // Fila de ejemplo 2
      [
        'Otro Producto',
        '',
        'Otra Marca',
        '',
        'SKU-002',
        5.00,
        8.50,
        50,
        0,
        '',
        '',
      ],
    ];

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 20 }, // nombre
      { wch: 30 }, // descripcion
      { wch: 15 }, // marca
      { wch: 15 }, // codigo_barras
      { wch: 15 }, // sku
      { wch: 12 }, // costo
      { wch: 12 }, // precio
      { wch: 10 }, // stock
      { wch: 12 }, // bonificacion
      { wch: 18 }, // fecha_vencimiento
      { wch: 40 }, // presentaciones
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // Generar buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      success: true,
      buffer: Buffer.from(buffer),
      filename: 'plantilla-importacion-productos.xlsx',
    };
  } catch (error) {
    console.error('❌ Error generando plantilla Excel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Exporta productos a un archivo Excel
 * El formato es el mismo que la plantilla de importación
 */
export async function exportProductsToExcel(branchId?: string) {
  try {
    // Obtener productos usando la función existente
    const productsResult = await getProducts(branchId);

    if (!productsResult.success) {
      return {
        success: false,
        error: productsResult.error || 'Error al obtener productos',
      };
    }

    const products = productsResult.products || [];

    if (products.length === 0) {
      return {
        success: false,
        error: 'No hay productos para exportar',
      };
    }

    const XLSX = await import('xlsx');

    // Crear encabezados (igual que la plantilla)
    const headers = [
      'nombre',
      'descripcion',
      'marca',
      'codigo_barras',
      'sku',
      'costo',
      'precio',
      'stock',
      'bonificacion',
      'fecha_vencimiento',
      'presentaciones',
    ];

    // Preparar datos
    const data: any[][] = [headers];

    // Procesar cada producto
    for (const product of products) {
      // Formatear fecha de vencimiento
      let fechaVencimiento = '';
      if (product.expiration) {
        try {
          const date = new Date(product.expiration);
          if (!isNaN(date.getTime())) {
            // Formato YYYY-MM-DD
            fechaVencimiento = date.toISOString().split('T')[0];
          }
        } catch {
          // Si no se puede parsear, dejar vacío
        }
      }

      // Formatear presentaciones (excluyendo "unidad" que es la base)
      const presentations: string[] = [];
      if (product.product_presentations && Array.isArray(product.product_presentations)) {
        for (const pres of product.product_presentations) {
          // Excluir la presentación "unidad" ya que es la base
          if (pres.variant && pres.variant !== 'unidad' && pres.is_active !== false) {
            const units = pres.units || 1;
            const price = pres.price !== null && pres.price !== undefined ? pres.price : '';
            presentations.push(`${pres.variant}:${units}:${price}`);
          }
        }
      }
      const presentacionesStr = presentations.join('|');

      // Crear fila con los datos del producto
      const row = [
        product.name || '',
        product.description || '',
        product.brand || '',
        product.barcode || '',
        product.sku || '',
        product.cost || 0,
        product.price || 0,
        product.stock || 0,
        product.bonification || 0,
        fechaVencimiento,
        presentacionesStr,
      ];

      data.push(row);
    }

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar ancho de columnas (igual que la plantilla)
    const columnWidths = [
      { wch: 20 }, // nombre
      { wch: 30 }, // descripcion
      { wch: 15 }, // marca
      { wch: 15 }, // codigo_barras
      { wch: 15 }, // sku
      { wch: 12 }, // costo
      { wch: 12 }, // precio
      { wch: 10 }, // stock
      { wch: 12 }, // bonificacion
      { wch: 18 }, // fecha_vencimiento
      { wch: 40 }, // presentaciones
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // Generar buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Obtener nombre de la sucursal para el nombre del archivo
    let filename = 'reporte-productos.xlsx';
    if (branchId) {
      const supabase = await createServerSupabaseClient();
      const { data: branch } = await supabase
        .from('branches')
        .select('name')
        .eq('id', branchId)
        .single();

      if (branch?.name) {
        // Limpiar el nombre de la sucursal para usarlo en el nombre del archivo
        const branchName = branch.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        filename = `reporte-productos-${branchName}.xlsx`;
      }
    }

    // Convertir buffer a base64 para poder serializarlo
    const base64 = Buffer.from(buffer).toString('base64');

    return {
      success: true,
      base64,
      filename,
      productCount: products.length,
    };
  } catch (error) {
    console.error('❌ Error exportando productos a Excel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
