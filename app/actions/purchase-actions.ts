'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  PurchaseInsert,
  PurchaseUpdate,
  PurchaseItemInsert,
} from '@/types';

/**
 * Obtiene todas las compras de un negocio
 */
export async function getPurchases(businessId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(
        `
        *,
        supplier:suppliers(*),
        branch:branches(*),
        created_by_user:users!purchases_created_by_fkey(id, name, email),
        approved_by_user:users!purchases_approved_by_fkey(id, name, email)
      `
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getPurchases:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene las compras de una sucursal específica
 */
export async function getBranchPurchases(branchId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(
        `
        *,
        supplier:suppliers(*),
        created_by_user:users!purchases_created_by_fkey(id, name, email),
        approved_by_user:users!purchases_approved_by_fkey(id, name, email)
      `
      )
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching branch purchases:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getBranchPurchases:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene una compra por ID con sus items
 */
export async function getPurchaseById(purchaseId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(
        `
        *,
        supplier:suppliers(*),
        branch:branches(*),
        created_by_user:users!purchases_created_by_fkey(id, name, email),
        approved_by_user:users!purchases_approved_by_fkey(id, name, email),
        purchase_items(
          *,
          product_presentation:product_presentations(
            *,
            product:products(*)
          )
        )
      `
      )
      .eq('id', purchaseId)
      .single();

    if (error) {
      console.error('Error fetching purchase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getPurchaseById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crea una nueva compra con sus items
 */
export async function createPurchase(
  purchase: PurchaseInsert,
  items: PurchaseItemInsert[]
) {
  const supabase = await createServerSupabaseClient();

  try {
    // Validar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Calcular total
    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    // Crear la compra
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        ...purchase,
        created_by: user.id,
        total,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      return { success: false, error: purchaseError.message };
    }

    // Crear los items de la compra
    const itemsWithPurchaseId = items.map(item => ({
      ...item,
      purchase_id: purchaseData.id,
      subtotal: item.quantity * item.unit_cost,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsWithPurchaseId);

    if (itemsError) {
      console.error('Error creating purchase items:', itemsError);
      // Intentar eliminar la compra si falló la creación de items
      await supabase.from('purchases').delete().eq('id', purchaseData.id);
      return { success: false, error: itemsError.message };
    }

    revalidatePath('/dashboard');
    return { success: true, data: purchaseData };
  } catch (error) {
    console.error('Error in createPurchase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza el estado de una compra
 */
export async function updatePurchaseStatus(
  purchaseId: string,
  status: string,
  notes?: string
) {
  const supabase = await createServerSupabaseClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const updates: PurchaseUpdate = { status };

    // Si se aprueba, registrar quién aprobó y cuándo
    if (status === 'approved') {
      updates.approved_by = user.id;
      updates.approved_at = new Date().toISOString();
    }

    // Si se marca como recibida, registrar cuándo
    if (status === 'received') {
      updates.received_at = new Date().toISOString();
    }

    // Agregar notas si se proporcionan
    if (notes) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from('purchases')
      .update(updates)
      .eq('id', purchaseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating purchase status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (error) {
    console.error('Error in updatePurchaseStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Aprueba una compra
 */
export async function approvePurchase(purchaseId: string) {
  return updatePurchaseStatus(purchaseId, 'approved');
}

/**
 * Marca una compra como recibida y actualiza el inventario
 */
export async function receivePurchase(purchaseId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    // Obtener la compra con sus items
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select(
        `
        *,
        purchase_items(*)
      `
      )
      .eq('id', purchaseId)
      .single();

    if (fetchError || !purchase) {
      return { success: false, error: 'Compra no encontrada' };
    }

    if (!purchase.branch_id) {
      return { success: false, error: 'La compra no tiene sucursal asignada' };
    }

    // NOTA: Actualización de inventario deshabilitada
    // La tabla 'inventory' no existe en el esquema actual
    // El stock se maneja directamente en la tabla 'products'
    // TODO: Implementar actualización de stock en products cuando se recibe una compra
    
    // Actualizar el stock del producto directamente
    for (const item of purchase.purchase_items) {
      // Obtener el producto asociado a la presentación
      const { data: presentation } = await supabase
        .from('product_presentations')
        .select('product_id')
        .eq('id', item.product_presentation_id)
        .single();

      if (presentation) {
        // Actualizar el stock del producto
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', presentation.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({
              stock: (product.stock || 0) + item.quantity,
            })
            .eq('id', presentation.product_id);
        }
      }
    }

    // Marcar la compra como recibida
    const result = await updatePurchaseStatus(purchaseId, 'received');

    revalidatePath('/dashboard');
    revalidatePath('/business');
    return result;
  } catch (error) {
    console.error('Error in receivePurchase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Cancela una compra
 */
export async function cancelPurchase(purchaseId: string, reason?: string) {
  return updatePurchaseStatus(purchaseId, 'cancelled', reason);
}

/**
 * Obtiene estadísticas de compras
 */
export async function getPurchaseStats(businessId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('status, total, created_at')
      .eq('business_id', businessId);

    if (error) {
      return { success: false, error: error.message };
    }

    const stats = {
      total: purchases?.length || 0,
      pending: purchases?.filter(p => p.status === 'pending').length || 0,
      approved: purchases?.filter(p => p.status === 'approved').length || 0,
      received: purchases?.filter(p => p.status === 'received').length || 0,
      cancelled: purchases?.filter(p => p.status === 'cancelled').length || 0,
      totalAmount: purchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error in getPurchaseStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
