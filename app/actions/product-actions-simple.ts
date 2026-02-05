'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Crea un producto simple con presentación "Unidad" automática
 * Para el 90% de los casos de uso
 */
export async function createSimpleProduct(data: {
  branchId: string;
  name: string;
  barcode?: string;
  expiration?: string; // ISO date string (timestampz)
  brand?: string;
  description?: string;
  cost: number;
  price: number;
}) {
  try {
    // Validar datos esenciales
    if (!data.branchId || !data.name || data.cost <= 0 || data.price <= 0) {
      return {
        success: false,
        error: 'Branch ID, nombre, costo y precio son requeridos y deben ser mayores a 0',
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
      .eq('is_active', true)
      .single();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    // Verificar permisos
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

    // Usar admin client
    const admin = createAdminClient();

    // Crear producto
    // Nota: La columna en la BD es 'branch_id', no 'created_by_branch_id' como en los tipos
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        branch_id: data.branchId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        expiration: data.expiration || null,
        brand: data.brand?.trim() || null,
        barcode: data.barcode?.trim() || null,
        created_by_user_id: user.id,
        is_active: true,
      } as any)
      .select()
      .single();

    if (productError) {
      console.error('Error creando producto:', productError);
      return {
        success: false,
        error: `Error creando producto: ${productError.message}`,
      };
    }

    // Crear presentación "Unidad" automática
    const { error: presentationError } = await admin
      .from('product_presentations')
      .insert({
        product_id: product.id,
        name: 'Unidad',
        unit: 'unidad',
        cost: data.cost,
        price: data.price,
        barcode: data.barcode?.trim() || null,
        is_active: true,
      });

    if (presentationError) {
      console.error('Error creando presentación:', presentationError);
      // Rollback: eliminar producto
      await admin.from('products').delete().eq('id', product.id);
      return {
        success: false,
        error: `Error creando presentación: ${presentationError.message}`,
      };
    }

    // Revalidar páginas
    revalidatePath('/admin/products');

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    console.error('Error en createSimpleProduct:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
