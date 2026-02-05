/**
 * Server Actions para gestión de usuarios
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Verifica si el usuario actual tiene un negocio o sucursal asociada
 */
export async function checkUserHasBusiness() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { hasBusiness: false, authenticated: false };
    }

    // Primero verificar si es admin/owner (business level)
    const { data: businessUser, error: businessError } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (businessError && businessError.code !== 'PGRST116') {
      console.error('Error verificando negocio:', businessError);
    }

    if (businessUser) {
      // Usuario es admin/owner
      return {
        hasBusiness: true,
        authenticated: true,
        businessId: businessUser.business_id,
        role: businessUser.role,
        isAdmin: true,
      };
    }

    // Si no es admin/owner, verificar si es manager/cashier (branch level)
    const { data: branchUser, error: branchError } = await supabase
      .from('branches_users')
      .select('branch_id, role, branch:branches(business_id)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (branchError && branchError.code !== 'PGRST116') {
      console.error('Error verificando branch:', branchError);
    }

    if (branchUser) {
      // Usuario es manager/cashier
      const branch = branchUser.branch as any;
      return {
        hasBusiness: true,
        authenticated: true,
        businessId: branch?.business_id,
        role: branchUser.role,
        branchId: branchUser.branch_id,
        isAdmin: false,
        isManager: branchUser.role === 'manager',
      };
    }

    // Usuario no tiene negocio ni sucursal asignada
    return {
      hasBusiness: false,
      authenticated: true,
    };
  } catch (error) {
    console.error('Error en checkUserHasBusiness:', error);
    return { hasBusiness: false, authenticated: false };
  }
}

/**
 * Obtiene la información del usuario actual
 */
export async function getCurrentUser() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, error: 'No autenticado' };
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError);
      return { user: null, error: 'Error obteniendo perfil' };
    }

    return { user: profile, error: null };
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return { user: null, error: 'Error desconocido' };
  }
}

/**
 * Crea un nuevo administrador (business level)
 */
export async function createAdminUser(data: {
  email: string;
  name: string;
  phone: string;
  password: string;
  businessId: string;
  role: 'admin' | 'owner';
}) {
  const { revalidatePath } = await import('next/cache');

  try {
    const supabase = await createServerSupabaseClient();

    // Verificar que el usuario actual tenga permisos
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: 'No autenticado' };
    }

    const { data: currentBusinessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('business_id', data.businessId)
      .eq('is_active', true)
      .single();

    if (!currentBusinessUser) {
      return {
        success: false,
        error: 'No tienes permisos para crear administradores',
      };
    }

    // Usar el cliente admin para crear el usuario en auth
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Crear usuario en auth
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name,
        },
      });

    if (authError || !authData.user) {
      console.error('Error creando usuario en auth:', authError);
      return {
        success: false,
        error: authError?.message || 'Error creando usuario',
      };
    }

    // Crear perfil en la tabla users usando admin client
    const { error: profileError } = await admin.from('users').insert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
    });

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Intentar eliminar el usuario de auth si falla el perfil
      await admin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: 'Error creando perfil de usuario' };
    }

    // Asignar rol en businesses_users usando admin client
    const { error: roleError } = await admin.from('businesses_users').insert({
      user_id: authData.user.id,
      business_id: data.businessId,
      role: data.role,
      is_active: true,
    });

    if (roleError) {
      console.error('Error asignando rol:', roleError);
      return {
        success: false,
        error: `Error asignando rol al usuario: ${roleError.message}`,
      };
    }

    // Revalidar la página de team
    revalidatePath('/admin/team');

    return { success: true, data: authData.user };
  } catch (error) {
    console.error('Error en createAdminUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crea un nuevo manager (branch level)
 */
export async function createManagerUser(data: {
  email: string;
  name: string;
  phone: string;
  password: string;
  branchId: string;
  benefit?: number;
}) {
  const { revalidatePath } = await import('next/cache');

  try {
    const supabase = await createServerSupabaseClient();

    // Verificar que el usuario actual tenga permisos
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener la sucursal para verificar el business_id
    const { data: branch } = await supabase
      .from('branches')
      .select('business_id')
      .eq('id', data.branchId)
      .single();

    if (!branch) {
      return { success: false, error: 'Sucursal no encontrada' };
    }

    // Verificar que el usuario actual sea admin del business
    const { data: currentBusinessUser } = await supabase
      .from('businesses_users')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('business_id', branch.business_id)
      .eq('is_active', true)
      .single();

    if (!currentBusinessUser) {
      return {
        success: false,
        error: 'No tienes permisos para crear managers',
      };
    }

    // Usar el cliente admin para crear el usuario en auth
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Crear usuario en auth
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name,
        },
      });

    if (authError || !authData.user) {
      console.error('Error creando usuario en auth:', authError);
      return {
        success: false,
        error: authError?.message || 'Error creando usuario',
      };
    }

    // Crear perfil en la tabla users usando admin client
    const { error: profileError } = await admin.from('users').insert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
    });

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Intentar eliminar el usuario de auth si falla el perfil
      await admin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: 'Error creando perfil de usuario' };
    }

    // Asignar a la sucursal como manager en branches_users usando admin client
    const { error: roleError } = await admin.from('branches_users').insert({
      user_id: authData.user.id,
      branch_id: data.branchId,
      role: 'manager',
      is_active: true,
      benefit: data.benefit || null,
    });

    if (roleError) {
      console.error('Error asignando rol:', roleError);
      return {
        success: false,
        error: `Error asignando manager a sucursal: ${roleError.message}`,
      };
    }

    // Revalidar la página de team
    revalidatePath('/admin/team');

    return { success: true, data: authData.user };
  } catch (error) {
    console.error('Error en createManagerUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crea un nuevo empleado (cashier)
 */
export async function createBranchEmployee(data: {
  email: string;
  name: string;
  phone: string;
  password: string;
  branchId: string;
  role: 'cashier' | 'manager';
  benefit?: number;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar que el usuario actual tenga permisos (admin o manager de la sucursal)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: 'No autenticado' };
    }

    // Usar el cliente admin para crear el usuario en auth
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Crear usuario en auth
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name,
        },
      });

    if (authError || !authData.user) {
      console.error('Error creando usuario en auth:', authError);
      return {
        success: false,
        error: authError?.message || 'Error creando usuario',
      };
    }

    // Crear perfil en la tabla users usando admin client
    const { error: profileError } = await admin.from('users').insert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
    });

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      await admin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: 'Error creando perfil de usuario' };
    }

    // Asignar a la sucursal en branches_users usando admin client
    const { error: roleError } = await admin.from('branches_users').insert({
      user_id: authData.user.id,
      branch_id: data.branchId,
      role: data.role,
      is_active: true,
      benefit: data.benefit || null,
    });

    if (roleError) {
      console.error('Error asignando rol:', roleError);
      return {
        success: false,
        error: `Error asignando empleado a sucursal: ${roleError.message}`,
      };
    }

    return { success: true, data: authData.user };
  } catch (error) {
    console.error('Error en createBranchEmployee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene todos los usuarios de branches_users (solo managers y cashiers)
 * Si se proporciona branchId, filtra solo los usuarios de esa sucursal
 */
export async function getBusinessUsers(branchId?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado', users: [] };
    }

    // Obtener el business_id del usuario actual
    let targetBusinessId: string | null = null;

    // Primero intentar buscar en businesses_users (admin/owner)
    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (businessUser) {
      targetBusinessId = businessUser.business_id;
    } else {
      // Si no está en businesses_users, buscar en branches_users (manager)
      const { data: branchUser } = await supabase
        .from('branches_users')
        .select('branch:branches(business_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (branchUser && (branchUser.branch as any)?.business_id) {
        targetBusinessId = (branchUser.branch as any).business_id;
      }
    }

    if (!targetBusinessId) {
      return { success: false, error: 'No tienes un negocio asociado', users: [] };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Construir query base
    let query = admin
      .from('branches_users')
      .select(`
        id,
        user_id,
        role,
        branch_id,
        benefit,
        is_active,
        users!inner(id, email, name, phone),
        branches!inner(id, name)
      `)
      .eq('branches.business_id', targetBusinessId)
      .eq('is_active', true)
      .in('role', ['manager', 'cashier']);

    // Si se proporciona branchId, filtrar por esa sucursal
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    // Obtener usuarios de branch level (managers/cashiers)
    const { data: branchUsers } = await query;

    // Formatear usuarios
    const allUsers = (branchUsers || []).map((bu: any) => ({
      id: bu.id,
      userId: bu.user_id,
      name: bu.users.name,
      email: bu.users.email,
      phone: bu.users.phone,
      role: bu.role,
      branchId: bu.branch_id,
      branchName: bu.branches?.name,
      benefit: bu.benefit,
      isActive: bu.is_active,
      level: 'branch' as const,
    }));

    return { success: true, users: allUsers };
  } catch (error) {
    console.error('Error en getBusinessUsers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      users: [],
    };
  }
}

/**
 * Actualiza un usuario
 */
export async function updateUser(
  userId: string,
  relationId: string,
  level: 'business' | 'branch',
  data: {
    name?: string;
    phone?: string;
    role?: string;
    benefit?: number;
  }
) {
  const { revalidatePath } = await import('next/cache');

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Actualizar datos del usuario en la tabla users
    const userUpdate: any = {};
    if (data.name !== undefined) userUpdate.name = data.name;
    if (data.phone !== undefined) userUpdate.phone = data.phone;

    if (Object.keys(userUpdate).length > 0) {
      const { error: userError } = await admin
        .from('users')
        .update(userUpdate)
        .eq('id', userId);

      if (userError) {
        console.error('Error actualizando usuario:', userError);
        return { success: false, error: 'Error actualizando usuario' };
      }
    }

    // Actualizar role y benefit según el nivel
    if (level === 'business') {
      const roleUpdate: any = {};
      if (data.role !== undefined) roleUpdate.role = data.role;

      if (Object.keys(roleUpdate).length > 0) {
        const { error: roleError } = await admin
          .from('businesses_users')
          .update(roleUpdate)
          .eq('id', relationId);

        if (roleError) {
          console.error('Error actualizando rol:', roleError);
          return { success: false, error: 'Error actualizando rol' };
        }
      }
    } else {
      const branchUpdate: any = {};
      if (data.role !== undefined) branchUpdate.role = data.role;
      if (data.benefit !== undefined) branchUpdate.benefit = data.benefit;

      if (Object.keys(branchUpdate).length > 0) {
        const { error: branchError } = await admin
          .from('branches_users')
          .update(branchUpdate)
          .eq('id', relationId);

        if (branchError) {
          console.error('Error actualizando usuario de sucursal:', branchError);
          return { success: false, error: 'Error actualizando rol' };
        }
      }
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error('Error en updateUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Restablece el beneficio de un usuario a 0
 */
export async function resetUserBenefit(relationId: string) {
  const { revalidatePath } = await import('next/cache');

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Resetear el beneficio a 0
    const { error } = await admin
      .from('branches_users')
      .update({ benefit: 0 } as any)
      .eq('id', relationId);

    if (error) {
      console.error('Error restableciendo beneficio:', error);
      return { success: false, error: 'Error restableciendo beneficio' };
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error('Error en resetUserBenefit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Elimina (desactiva) un usuario
 */
export async function deleteUser(
  relationId: string,
  level: 'business' | 'branch'
) {
  const { revalidatePath } = await import('next/cache');

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Obtener el user_id antes de eliminar la relación
    let userId: string | null = null;

    if (level === 'business') {
      const { data: businessUser } = await admin
        .from('businesses_users')
        .select('user_id')
        .eq('id', relationId)
        .single();

      userId = businessUser?.user_id || null;

      // Eliminar la relación en businesses_users
      const { error } = await admin
        .from('businesses_users')
        .delete()
        .eq('id', relationId);

      if (error) {
        console.error('Error eliminando usuario de business:', error);
        return { success: false, error: 'Error eliminando usuario' };
      }
    } else {
      const { data: branchUser } = await admin
        .from('branches_users')
        .select('user_id')
        .eq('id', relationId)
        .single();

      userId = branchUser?.user_id || null;

      // Eliminar la relación en branches_users
      const { error } = await admin
        .from('branches_users')
        .delete()
        .eq('id', relationId);

      if (error) {
        console.error('Error eliminando usuario de branch:', error);
        return { success: false, error: 'Error eliminando usuario' };
      }
    }

    // Si se obtuvo el userId, eliminar también el usuario de la tabla users y auth
    if (userId) {
      // Eliminar de la tabla users
      const { error: userError } = await admin
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        console.error('Error eliminando usuario de la tabla users:', userError);
        // Continuar aunque falle, para intentar eliminar de auth
      }

      // Eliminar del sistema de autenticación
      const { error: authError } = await admin.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Error eliminando usuario de auth:', authError);
        return { 
          success: false, 
          error: 'Error eliminando usuario del sistema de autenticación' 
        };
      }
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error('Error en deleteUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
