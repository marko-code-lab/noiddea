'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from './use-supabase';
import { createBranch } from '@/app/actions';
import { queryKeys } from '@/lib/query-keys';
import type { Branch } from '@/src/types';

/**
 * Hook para obtener sucursales usando TanStack Query
 */
export function useBranches(businessId?: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: businessId
      ? queryKeys.branches.byBusiness(businessId)
      : queryKeys.branches.all,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No autenticado');

      let targetBusinessId = businessId;

      if (!targetBusinessId) {
        // Primero intentar buscar en businesses_users (admin/owner)
        const { data: businessUser } = await supabase
          .from('businesses_users')
          .select('business_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (businessUser) {
          targetBusinessId = businessUser.business_id;
        } else {
          // Si no está en businesses_users, buscar en branches_users (manager/cashier)
          const { data: branchUser } = await supabase
            .from('branches_users')
            .select('branch:branches(business_id)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (!branchUser || !(branchUser.branch as any)?.business_id) {
            throw new Error('No tienes un negocio asociado');
          }

          targetBusinessId = (branchUser.branch as any).business_id;
        }
      }

      if (!targetBusinessId) {
        throw new Error('No business ID found');
      }

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', targetBusinessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as Branch[];
    },
    enabled: true,
  });
}

/**
 * Hook para obtener una sucursal específica
 */
export function useBranch(branchId?: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: branchId
      ? queryKeys.branches.detail(branchId)
      : ['branches', 'detail'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*, business:businesses(*)')
        .eq('id', branchId!)
        .single();

      if (error) throw error;

      return data;
    },
    enabled: !!branchId,
  });
}

/**
 * Hook para crear sucursal
 */
export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
    },
  });
}
