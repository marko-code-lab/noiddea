'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { SupplierInsert, SupplierUpdate } from '@/src/types';

/**
 * Obtiene todos los proveedores de un negocio
 */
export async function getSuppliers(businessId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching suppliers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getSuppliers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene un proveedor por ID
 */
export async function getSupplierById(supplierId: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error) {
      console.error('Error fetching supplier:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getSupplierById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crea un nuevo proveedor
 */
export async function createSupplier(supplier: SupplierInsert) {
  const supabase = await createServerSupabaseClient();

  try {
    // Validar que el usuario tenga permisos (admin/owner)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', supplier.business_id)
      .eq('is_active', true)
      .single();

    if (!businessUser) {
      return {
        success: false,
        error: 'No tienes permisos para crear proveedores',
      };
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/suppliers');
    return { success: true, data };
  } catch (error) {
    console.error('Error in createSupplier:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza un proveedor
 */
export async function updateSupplier(
  supplierId: string,
  updates: SupplierUpdate
) {
  const supabase = await createServerSupabaseClient();

  try {
    // Validar que el usuario tenga permisos
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener el proveedor para verificar el business_id
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('business_id')
      .eq('id', supplierId)
      .single();

    if (!supplier) {
      return { success: false, error: 'Proveedor no encontrado' };
    }

    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', supplier.business_id)
      .eq('is_active', true)
      .single();

    if (!businessUser) {
      return {
        success: false,
        error: 'No tienes permisos para actualizar este proveedor',
      };
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/suppliers');
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateSupplier:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Desactiva un proveedor (soft delete)
 */
export async function deactivateSupplier(supplierId: string) {
  return updateSupplier(supplierId, { is_active: false });
}

/**
 * Reactiva un proveedor
 */
export async function activateSupplier(supplierId: string) {
  return updateSupplier(supplierId, { is_active: true });
}

/**
 * Busca proveedores por nombre
 */
export async function searchSuppliers(businessId: string, searchTerm: string) {
  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .ilike('name', `%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error searching suppliers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in searchSuppliers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
