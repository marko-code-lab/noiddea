'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Obtiene las estadísticas del dashboard
 */
export async function getDashboardStats() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado' };
    }

    // Obtener el business_id del usuario actual
    let targetBusinessId: string | null = null;

    const { data: businessUser } = await supabase
      .from('businesses_users')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (businessUser) {
      targetBusinessId = businessUser.business_id;
    } else {
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
      return {
        success: false,
        error: 'No tienes un negocio asociado',
      };
    }

    // Obtener todas las sucursales del negocio
    const { data: branches } = await supabase
      .from('branches')
      .select('id')
      .eq('business_id', targetBusinessId);

    if (!branches || branches.length === 0) {
      return {
        success: true,
        data: {
          totalRevenue: 0,
          newCustomers: 0,
          productsSold: 0,
          growthRate: 0,
          chartData: [],
          recentSessions: [],
        },
      };
    }

    const branchIds = branches.map(b => b.id);

    // Obtener sesiones de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions30d } = await (supabase as any)
      .from('user_sessions')
      .select('*')
      .in('branch_id', branchIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Obtener sesiones del mes anterior para comparar
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: sessionsPreviousMonth } = await (supabase as any)
      .from('user_sessions')
      .select('*')
      .in('branch_id', branchIds)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    const getNumericValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value) || 0;
      return 0;
    };

    const getSessionTotal = (session: any): number => {
      const paymentTotals = session.payment_totals || {};
      return getNumericValue(paymentTotals.total) || 
        (getNumericValue(paymentTotals.cash) + 
         getNumericValue(paymentTotals.digital_wallet) + 
         getNumericValue(paymentTotals.card) + 
         getNumericValue(paymentTotals.transfer));
    };

    const totalRevenue = (sessions30d || []).reduce((sum: number, session: any) => 
      sum + getSessionTotal(session), 0);

    const previousRevenue = (sessionsPreviousMonth || []).reduce((sum: number, session: any) => 
      sum + getSessionTotal(session), 0);

    const growthRate = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    const uniqueUsers = new Set((sessions30d || []).map((s: any) => s.user_id).filter(Boolean));
    const newCustomers = uniqueUsers.size;
    const productsSold = sessions30d?.length || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: sessions7d } = await (supabase as any)
      .from('user_sessions')
      .select('*')
      .in('branch_id', branchIds)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Agrupar por día
    const chartDataMap = new Map<string, number>();
    const today = new Date();
    
    // Inicializar los últimos 7 días con 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      chartDataMap.set(dateKey, 0);
    }

    (sessions7d || []).forEach((session: any) => {
      const date = new Date(session.created_at);
      const dateKey = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      const total = getSessionTotal(session);
      chartDataMap.set(dateKey, (chartDataMap.get(dateKey) || 0) + total);
    });

    const chartData = Array.from(chartDataMap.entries()).map(([date, value]) => ({
      date,
      value: Math.round(value),
    }));

    const recentSessionsData = (sessions30d || []).slice(0, 8);
    const userIds = [...new Set(recentSessionsData.map((s: any) => s.user_id).filter(Boolean))] as string[];
    const branchIdsForSessions = [...new Set(recentSessionsData.map((s: any) => s.branch_id).filter(Boolean))] as string[];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    const { data: branchesData } = await supabase
      .from('branches')
      .select('id, name')
      .in('id', branchIdsForSessions);

    const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
    const branchesMap = new Map((branchesData || []).map((b: any) => [b.id, b]));

    const recentSessions = recentSessionsData.map((session: any) => ({
      id: session.id,
      header: `${usersMap.get(session.user_id)?.name || 'Usuario'} - ${branchesMap.get(session.branch_id)?.name || 'Sucursal'}`,
      type: session.closed_at ? 'Finalizada' : 'En curso',
      status: session.closed_at ? 'Done' : 'In Process',
      reviewer: usersMap.get(session.user_id)?.name || 'N/A',
      total: getSessionTotal(session),
      created_at: session.created_at,
    }));

    return {
      success: true,
      data: {
        totalRevenue,
        newCustomers,
        productsSold,
        growthRate: Math.round(growthRate * 10) / 10,
        chartData,
        recentSessions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

