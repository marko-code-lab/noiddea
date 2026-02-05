'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BranchUser } from '@/types';

export interface BranchUserWithUser extends BranchUser {
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
}

export function useBranchUsers(branchId?: string) {
  const [branchUsers, setBranchUsers] = useState<BranchUserWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    const fetchBranchUsers = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('branches_users')
          .select(
            `
            *,
            user:users(id, name, email, phone)
          `
          )
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .in('role', ['manager', 'cashier'])
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setBranchUsers((data as any) || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching branch users:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchBranchUsers();

    // Suscribirse a cambios en tiempo real
    const supabase = createClient();
    const channel = supabase
      .channel('branch-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branches_users',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          fetchBranchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  return { branchUsers, loading, error };
}
