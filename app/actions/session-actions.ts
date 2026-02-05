'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Obtiene todas las sesiones de usuarios de la tienda (user_sessions)
 * Filtra por el negocio del usuario actual
 */
export async function getUserSessions(branchId?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Debes estar autenticado', sessions: [] };
    }

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
        sessions: [],
      };
    }

    const { data: branches } = await supabase
      .from('branches')
      .select('id')
      .eq('business_id', targetBusinessId);

    if (!branches || branches.length === 0) {
      return { success: true, sessions: [] };
    }

    const businessBranchIds = branches.map(b => b.id);

    let query = (supabase as any)
      .from('user_sessions')
      .select('*')
      .in('branch_id', businessBranchIds)
      .order('created_at', { ascending: false });

    if (branchId && businessBranchIds.includes(branchId)) {
      query = query.eq('branch_id', branchId);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      return {
        success: false,
        error: sessionsError.message,
        sessions: [],
      };
    }

    if (!sessions || sessions.length === 0) {
      return { success: true, sessions: [] };
    }

    const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))] as string[];
    const branchIds = [...new Set(sessions.map((s: any) => s.branch_id).filter(Boolean))] as string[];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .in('id', userIds);

    const { data: branchesData } = await supabase
      .from('branches')
      .select('id, name, location')
      .in('id', branchIds);

    const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
    const branchesMap = new Map((branchesData || []).map((b: any) => [b.id, b]));

    const getNumericValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value) || 0;
      return 0;
    };

    const mappedSessions = sessions.map((session: any) => {
      const user = usersMap.get(session.user_id);
      const branch = branchesMap.get(session.branch_id);
      const paymentTotals = session.payment_totals || {};
      
      const cashAmount = getNumericValue(paymentTotals.cash);
      const digitalWalletAmount = getNumericValue(paymentTotals.digital_wallet);
      const cardAmount = getNumericValue(paymentTotals.card);
      const transferAmount = getNumericValue(paymentTotals.transfer);
      const totalAmount = getNumericValue(paymentTotals.total) || 
        (cashAmount + digitalWalletAmount + cardAmount + transferAmount);

      return {
        id: session.id,
        user_id: session.user_id,
        branch_id: session.branch_id,
        started_at: session.created_at,
        closed_at: session.closed_at || null,
        created_at: session.created_at,
        cash_amount: cashAmount,
        digital_wallet_amount: digitalWalletAmount,
        card_amount: cardAmount,
        transfer_amount: transferAmount,
        total_amount: totalAmount,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        } : undefined,
        branch: branch ? {
          id: branch.id,
          name: branch.name,
          location: branch.location,
        } : undefined,
      };
    });

    return { success: true, sessions: mappedSessions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      sessions: [],
    };
  }
}

