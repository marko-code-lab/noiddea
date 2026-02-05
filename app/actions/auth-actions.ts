/**
 * Server Actions para autenticación y registro básico
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserInsert, BusinessInsert, BusinessUserInsert } from '@/src/types';
import { redirect } from 'next/navigation';
import { DEFAULT_THEME } from '@/lib/business-themes';

// ============================================
// Acciones de Autenticación
// ============================================

/**
 * Valida que el email no esté registrado
 */
export async function validateEmail(email: string) {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Email inválido' };
    }

    const supabase = await createServerSupabaseClient();

    // Verificar si el email ya está registrado
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: 'Este correo ya está registrado' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error validando email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Registra un nuevo usuario con email y contraseña
 * Crea usuario en Auth, en tabla users y crea el business asociado
 * El usuario se auto-confirma automáticamente para evitar errores de login
 */
export async function signupUser(data: {
  email: string;
  name: string;
  phone: string;
  password: string;
  businessName: string;
  taxId?: string;
}) {
  try {
    // Validar datos
    if (!data.email || !data.name || !data.phone || !data.password || !data.businessName) {
      return { success: false, error: 'Todos los campos son requeridos' };
    }

    if (data.password.length < 8) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres',
      };
    }

    const adminClient = createAdminClient();
    const supabase = await createServerSupabaseClient();

    // Verificar que el nombre del negocio no esté en uso
    const { data: existingBusiness } = await adminClient
      .from('businesses')
      .select('id')
      .eq('name', data.businessName.trim())
      .maybeSingle();

    if (existingBusiness) {
      return {
        success: false,
        error: 'Este nombre de negocio ya está en uso',
      };
    }

    // Crear usuario con el cliente admin para auto-confirmar el email
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirmar el email
        user_metadata: {
          name: data.name,
          phone: data.phone,
        },
      });

    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return {
        success: false,
        error: authError.message || 'Error creando usuario',
      };
    }

    if (!authData.user) {
      return { success: false, error: 'Error al crear usuario' };
    }

    // Crear perfil de usuario en la tabla users
    const userData: UserInsert = {
      id: authData.user.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
    };

    const { error: profileError } = await supabase
      .from('users')
      .insert(userData);

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Intentar limpiar el usuario de auth si falla
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: 'Error creando perfil de usuario' };
    }

    console.log('✅ Usuario registrado y auto-confirmado:', data.email);

    // Crear el negocio asociado
    const businessData: BusinessInsert = {
      name: data.businessName.trim(),
      tax_id: data.taxId?.trim() || 'Pendiente',
      description: null,
      website: null,
      theme: DEFAULT_THEME,
    } as BusinessInsert;

    const { data: business, error: businessError } = await adminClient
      .from('businesses')
      .insert(businessData)
      .select()
      .single();

    if (businessError) {
      console.error('❌ Error creando negocio:', businessError);
      // Limpiar usuario si falla la creación del negocio
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from('users').delete().eq('id', authData.user.id);
      return {
        success: false,
        error: `Error creando negocio: ${businessError.message}`,
      };
    }

    console.log('✅ Negocio creado:', business.id, business.name);

    // Asignar al usuario como owner del negocio
    const businessUserData: BusinessUserInsert = {
      business_id: business.id,
      user_id: authData.user.id,
      role: 'owner',
      is_active: true,
    };

    const { error: relationError } = await adminClient
      .from('businesses_users')
      .insert(businessUserData);

    if (relationError) {
      console.error('❌ Error asignando usuario:', relationError);
      // Limpiar negocio y usuario si falla
      await adminClient.from('businesses').delete().eq('id', business.id);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from('users').delete().eq('id', authData.user.id);
      return {
        success: false,
        error: `Error asignando propietario: ${relationError.message}`,
      };
    }

    console.log('✅ Usuario asignado como owner:', authData.user.id, '→', business.id);

    return {
      success: true,
      userId: authData.user.id,
      email: data.email,
      businessId: business.id,
      businessName: business.name,
    };
  } catch (error) {
    console.error('Error en signupUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Inicia sesión con email y contraseña
 * Retorna información sobre si el usuario tiene un negocio
 */
export async function loginUser(data: { email: string; password: string }) {
  console.log('🔍 [SERVER] loginUser llamado con:', data.email);

  try {
    // Validar datos
    if (!data.email || !data.password) {
      console.log('❌ [SERVER] Validación falló: datos incompletos');
      return { success: false, error: 'Email y contraseña son requeridos' };
    }

    console.log('🔍 [SERVER] Creando cliente Supabase...');
    const supabase = await createServerSupabaseClient();

    console.log('🔍 [SERVER] Intentando signInWithPassword...');
    // Iniciar sesión
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

    console.log('🔍 [SERVER] Auth response:', {
      hasError: !!authError,
      hasUser: !!authData?.user,
      errorMessage: authError?.message,
      errorStatus: authError?.status,
    });

    if (authError) {
      console.error('❌ [SERVER] Error de auth:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
      });
      return {
        success: false,
        error:
          authError.message === 'Invalid login credentials'
            ? 'Email o contraseña incorrectos'
            : `Error al iniciar sesión: ${authError.message}`,
      };
    }

    if (!authData.user) {
      console.log('❌ [SERVER] No se obtuvo usuario');
      return {
        success: false,
        error: 'Error al iniciar sesión: No se obtuvo usuario',
      };
    }

    console.log(
      '✅ [SERVER] Sesión iniciada:',
      data.email,
      'ID:',
      authData.user.id
    );

    // Verificar si el usuario es admin/owner (business level)
    console.log('🔍 [SERVER] Verificando rol de business...');
    const { data: businessUser, error: businessError } = await supabase
      .from('businesses_users')
      .select('business_id, role, businesses(tax_id)')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (businessError && businessError.code !== 'PGRST116') {
      console.error('⚠️ [SERVER] Error verificando negocio:', businessError);
    }

    console.log('🔍 [SERVER] Business user:', businessUser);

    // Verificar si el RUC está pendiente
    let needsTaxId = false;
    if (businessUser) {
      const businesses = businessUser.businesses as any;
      if (businesses && (Array.isArray(businesses) ? businesses[0] : businesses)) {
        const business = Array.isArray(businesses) ? businesses[0] : businesses;
        needsTaxId = !business.tax_id || business.tax_id === 'Pendiente' || String(business.tax_id).trim() === '';
      }
    }

    // Si no es admin/owner, verificar si es manager/cashier/seller (branch level)
    if (!businessUser) {
      console.log(
        '🔍 [SERVER] No es admin/owner, verificando rol de branch...'
      );
      const { data: branchUser, error: branchError } = await supabase
        .from('branches_users')
        .select('branch_id, role, branch:branches(business_id)')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (branchError && branchError.code !== 'PGRST116') {
        console.error('⚠️ [SERVER] Error verificando branch:', branchError);
      }

      console.log('🔍 [SERVER] Branch user:', branchUser);

      if (branchUser) {
        // Usuario es manager/cashier/seller
        const branch = branchUser.branch as any;
        const response = {
          success: true,
          userId: authData.user.id,
          email: data.email,
          hasBusiness: true, // Tiene acceso a través de la sucursal
          businessId: branch?.business_id,
          role: branchUser.role,
          branchId: branchUser.branch_id,
          isManager: branchUser.role === 'manager',
        };

        console.log('✅ [SERVER] Usuario de branch, retornando:', response);
        return response;
      }
    }

    // Usuario es admin/owner o no tiene asignación
    const response = {
      success: true,
      userId: authData.user.id,
      email: data.email,
      hasBusiness: !!businessUser,
      businessId: businessUser?.business_id,
      role: businessUser?.role,
      needsTaxId: needsTaxId,
    };

    console.log('✅ [SERVER] Retornando:', response);
    return response;
  } catch (error) {
    console.error('❌ [SERVER] Excepción en loginUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Cierra la sesión del usuario
 * Limpia la sesión de Supabase y redirige a /login
 */
export async function logoutUser() {
  try {
    const supabase = await createServerSupabaseClient();

    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error cerrando sesión:', error);
      // Aún así redirigir al login para limpiar el estado
    } else {
      console.log('✅ Sesión cerrada correctamente');
    }
  } catch (error) {
    console.error('Error en logoutUser:', error);
    // Aún así redirigir al login
  }

  // Siempre redirigir al login después de intentar cerrar sesión
  redirect('/login');
}
