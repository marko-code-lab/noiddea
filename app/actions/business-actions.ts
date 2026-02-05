/**
 * Server Actions para gestión de negocios
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BusinessInsert, BusinessUserInsert } from '@/types';
import { DEFAULT_THEME } from '@/lib/business-themes';

/**
 * Valida que el nombre del negocio no esté en uso
 */
export async function validateBusinessName(name: string) {
  try {
    if (!name || !name.trim()) {
      return { success: false, error: 'El nombre del negocio es requerido' };
    }

    const trimmedName = name.trim();

    // Usar admin client para verificar disponibilidad (sin necesidad de autenticación)
    const admin = createAdminClient();

    // Verificar si el nombre ya está en uso
    const { data: existingBusiness, error } = await admin
      .from('businesses')
      .select('id')
      .eq('name', trimmedName)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error validando nombre de negocio:', error);
      return {
        success: false,
        error: 'Error al validar el nombre del negocio',
      };
    }

    if (existingBusiness) {
      return {
        success: false,
        error: 'Este nombre de negocio ya está en uso',
        available: false,
      };
    }

    return { success: true, available: true };
  } catch (error) {
    console.error('Error validando nombre de negocio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crea un nuevo negocio y asigna al usuario actual como owner
 */
export async function createBusiness(data: {
  name: string;
  tax_id: string;
  description?: string;
  website?: string;
}) {
  try {
    // Validar datos
    if (!data.name || !data.tax_id) {
      return { success: false, error: 'Nombre y RFC/Tax ID son requeridos' };
    }

    // Obtener usuario autenticado con el cliente regular
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    console.log('🔍 Usuario autenticado:', user.id, user.email);

    // Verificar si el usuario ya tiene un negocio
    const { data: existingBusiness } = await supabase
      .from('businesses_users')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingBusiness) {
      return {
        success: false,
        error: 'Ya tienes un negocio creado',
        businessId: existingBusiness.business_id,
      };
    }

    // Usar admin client para crear el negocio (evita problemas con RLS)
    const admin = createAdminClient();

    // Crear el negocio
    const businessData: BusinessInsert = {
      name: data.name.trim(),
      tax_id: data.tax_id.trim(),
      description: data.description?.trim() || null,
      website: data.website?.trim() || null,
      theme: DEFAULT_THEME,
    } as BusinessInsert;

    const { data: business, error: businessError } = await admin
      .from('businesses')
      .insert(businessData)
      .select()
      .single();

    if (businessError) {
      console.error('❌ Error creando negocio:', businessError);
      return {
        success: false,
        error: `Error creando negocio: ${businessError.message}`,
      };
    }

    console.log('✅ Negocio creado:', business.id, business.name);

    // Asignar al usuario como owner del negocio
    const businessUserData: BusinessUserInsert = {
      business_id: business.id,
      user_id: user.id,
      role: 'owner',
      is_active: true,
    };

    const { error: relationError } = await admin
      .from('businesses_users')
      .insert(businessUserData);

    if (relationError) {
      console.error('❌ Error asignando usuario:', relationError);
      // Intentar limpiar el negocio creado
      await admin.from('businesses').delete().eq('id', business.id);
      return {
        success: false,
        error: `Error asignando propietario: ${relationError.message}`,
      };
    }

    console.log('✅ Usuario asignado como owner:', user.id, '→', business.id);

    // Revalidar rutas relevantes para actualizar el cache
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/business');
    revalidatePath('/business/create');
    revalidatePath('/dashboard');

    return {
      success: true,
      businessId: business.id,
      businessName: business.name,
    };
  } catch (error) {
    console.error('❌ Error en createBusiness:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza la información de un negocio
 */
export async function updateBusiness(
  businessId: string,
  data: {
    tax_id?: string;
    description?: string | null;
    website?: string | null;
    theme?: string | null;
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

    // Verificar que el usuario tenga permisos (owner o admin del negocio)
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .maybeSingle();

    if (!businessUser || (businessUser.role !== 'owner' && businessUser.role !== 'admin')) {
      return {
        success: false,
        error: 'No tienes permisos para editar este negocio',
      };
    }

    // Preparar datos para actualizar
    // NOTA: El nombre del negocio no se puede cambiar después de la creación
    const updateData: any = {};
    if (data.tax_id !== undefined) updateData.tax_id = data.tax_id.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.website !== undefined) updateData.website = data.website?.trim() || null;
    if (data.theme !== undefined) updateData.theme = data.theme;

    // Usar admin client para actualizar
    const admin = createAdminClient();
    const { data: updatedBusiness, error: updateError } = await admin
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando negocio:', updateError);
      return {
        success: false,
        error: `Error actualizando negocio: ${updateError.message}`,
      };
    }

    // Revalidar rutas relevantes
    revalidatePath('/business');
    revalidatePath('/business/settings');
    revalidatePath('/dashboard');

    return {
      success: true,
      business: updatedBusiness,
    };
  } catch (error) {
    console.error('Error en updateBusiness:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
