/**
 * Server Actions para gestión de sucursales (branches)
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BranchInsert } from '@/src/types';

/**
 * Crea una nueva sucursal para un negocio
 */
export async function createBranch(data: {
  name: string;
  location: string;
  phone?: string;
}) {
  try {
    // Validar datos
    if (!data.name || !data.location) {
      return { success: false, error: 'Nombre y ubicación son requeridos' };
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
      .maybeSingle();

    if (!businessUser) {
      return { success: false, error: 'No tienes un negocio asociado' };
    }

    // Verificar que tenga permisos (owner o admin)
    if (businessUser.role !== 'owner' && businessUser.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para crear sucursales',
      };
    }

    // Usar admin client para crear la sucursal
    const admin = createAdminClient();

    const branchData: BranchInsert = {
      business_id: businessUser.business_id,
      name: data.name.trim(),
      location: data.location.trim(),
      phone: data.phone?.trim() || null,
    };

    const { data: branch, error: branchError } = await admin
      .from('branches')
      .insert(branchData)
      .select()
      .single();

    if (branchError) {
      console.error('❌ Error creando sucursal:', branchError);
      return {
        success: false,
        error: `Error creando sucursal: ${branchError.message}`,
      };
    }

    console.log('✅ Sucursal creada:', branch.id, branch.name);

    return {
      success: true,
      branchId: branch.id,
      branchName: branch.name,
    };
  } catch (error) {
    console.error('❌ Error en createBranch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza una sucursal existente
 */
export async function updateBranch(
  branchId: string,
  data: {
    name?: string;
    location?: string;
    phone?: string | null;
  }
) {
  const { revalidatePath } = await import('next/cache');

  try {
    // Obtener usuario autenticado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    const admin = createAdminClient();

    // Obtener la sucursal para conocer su negocio asociado
    const { data: branch, error: branchError } = await admin
      .from('branches')
      .select('id, business_id')
      .eq('id', branchId)
      .maybeSingle();

    if (branchError) {
      console.error('❌ Error obteniendo sucursal:', branchError);
      return {
        success: false,
        error: `Error obteniendo sucursal: ${branchError.message}`,
      };
    }

    if (!branch) {
      return { success: false, error: 'Sucursal no encontrada' };
    }

    // Verificar que el usuario tenga permisos (owner o admin del negocio)
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', branch.business_id)
      .eq('is_active', true)
      .maybeSingle();

    if (
      !businessUser ||
      (businessUser.role !== 'owner' && businessUser.role !== 'admin')
    ) {
      return {
        success: false,
        error: 'No tienes permisos para editar esta sucursal',
      };
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.location !== undefined) {
      updateData.location = data.location.trim();
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone?.trim() || null;
    }

    const { data: updatedBranch, error: updateError } = await admin
      .from('branches')
      .update(updateData)
      .eq('id', branchId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error actualizando sucursal:', updateError);
      return {
        success: false,
        error: `Error actualizando sucursal: ${updateError.message}`,
      };
    }

    // Revalidar rutas relacionadas
    revalidatePath('/business');
    revalidatePath('/business/settings');
    revalidatePath('/business');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');

    return {
      success: true,
      branch: updatedBranch,
    };
  } catch (error) {
    console.error('❌ Error en updateBranch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene todas las sucursales de un negocio
 */
export async function getBranches() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado', branches: [] };
    }

    // Obtener el negocio del usuario
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!businessUser) {
      return {
        success: false,
        error: 'No tienes un negocio asociado',
        branches: [],
      };
    }

    // Obtener sucursales del negocio
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('*')
      .eq('business_id', businessUser.business_id)
      .order('created_at', { ascending: false });

    if (branchesError) {
      console.error('❌ Error obteniendo sucursales:', branchesError);
      return { success: false, error: branchesError.message, branches: [] };
    }

    return {
      success: true,
      branches: branches || [],
    };
  } catch (error) {
    console.error('❌ Error en getBranches:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      branches: [],
    };
  }
}
