/**
 * Server Actions para gestión de presentaciones de productos
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type {
  ProductPresentationInsert,
  ProductPresentationUpdate,
} from '@/src/types';

/**
 * Crea una nueva presentación para un producto existente
 * Campos disponibles: variant, units, price, product_id, is_active
 */
export async function createPresentation(data: {
  product_id: string;
  variant: string;  // Tipo de presentación: pack, blister, caja, etc.
  units: number;    // Cantidad de unidades en esta presentación
  price?: number;   // Precio de venta de esta presentación
}) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Verificar que el producto existe y obtener el business_id a través del branch
    const { data: product } = await supabase
      .from('products')
      .select('branch_id, branches!inner(business_id)')
      .eq('id', data.product_id)
      .single();

    if (!product || !product.branches) {
      return { success: false, error: 'Producto no encontrado' };
    }

    const businessId = (product.branches as any).business_id;

    // Verificar permisos del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .maybeSingle();

    if (!businessUser) {
      return {
        success: false,
        error: 'No tienes permisos para crear presentaciones',
      };
    }

    // Usar admin client para crear la presentación
    const admin = createAdminClient();

    const presentationData: ProductPresentationInsert = {
      product_id: data.product_id,
      variant: data.variant.trim(),
      units: data.units,
      price: data.price || null,
      is_active: true,
    };

    const { data: presentation, error: createError } = await admin
      .from('product_presentations')
      .insert(presentationData)
      .select()
      .single();

    if (createError) {
      console.error('Error creando presentación:', createError);
      return { success: false, error: createError.message };
    }

    revalidatePath('/admin/products');
    return { success: true, data: presentation };
  } catch (error) {
    console.error('Error en createPresentation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza una presentación existente
 * Campos disponibles: variant, units, price, is_active
 */
export async function updatePresentation(
  presentationId: string,
  data: {
    variant?: string;
    units?: number;
    price?: number;
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

    // Obtener la presentación para verificar el producto y el business_id
    const { data: presentation } = await supabase
      .from('product_presentations')
      .select('product_id, products!inner(branch_id, branches!inner(business_id))')
      .eq('id', presentationId)
      .single();

    if (!presentation || !presentation.products) {
      return { success: false, error: 'Presentación no encontrada' };
    }

    const product = presentation.products as any;
    const businessId = product?.branches?.business_id;

    if (!businessId) {
      return { success: false, error: 'No se pudo verificar el negocio' };
    }

    // Verificar permisos del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .maybeSingle();

    if (!businessUser) {
      return {
        success: false,
        error: 'No tienes permisos para editar presentaciones',
      };
    }

    // Usar admin client para actualizar
    const admin = createAdminClient();

    const updateData: ProductPresentationUpdate = {};
    if (data.variant !== undefined) updateData.variant = data.variant.trim();
    if (data.units !== undefined) updateData.units = data.units;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: updatedPresentation, error: updateError } = await admin
      .from('product_presentations')
      .update(updateData)
      .eq('id', presentationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando presentación:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/products');
    return { success: true, data: updatedPresentation };
  } catch (error) {
    console.error('Error en updatePresentation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Elimina (desactiva) una presentación
 */
export async function deletePresentation(presentationId: string) {
  return updatePresentation(presentationId, { is_active: false });
}

/**
 * Activa una presentación
 */
export async function activatePresentation(presentationId: string) {
  return updatePresentation(presentationId, { is_active: true });
}
