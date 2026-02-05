'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  createPurchase,
  updatePurchaseStatus,
  receivePurchase,
} from '@/app/actions';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook para obtener compras usando TanStack Query
 */
export function usePurchasesQuery(businessId?: string, branchId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: businessId
      ? queryKeys.purchases.byBusiness(businessId)
      : branchId
        ? queryKeys.purchases.byBranch(branchId)
        : queryKeys.purchases.all,
    queryFn: async () => {
      if (!businessId && !branchId) {
        throw new Error('Business ID o Branch ID requerido');
      }

      let query = supabase
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
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      } else if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    },
    enabled: !!(businessId || branchId),
  });
}

/**
 * Hook para obtener una compra específica
 */
export function usePurchaseQuery(purchaseId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.purchases.detail(purchaseId!),
    queryFn: async () => {
      if (!purchaseId) {
        throw new Error('Purchase ID is required');
      }

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

      if (error) throw error;

      return data;
    },
    enabled: !!purchaseId,
  });
}

/**
 * Hook para crear compra
 */
export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchase, items }: { purchase: any; items: any[] }) =>
      createPurchase(purchase, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });
}

/**
 * Hook para actualizar estado de compra
 */
export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      purchaseId,
      status,
      notes,
    }: {
      purchaseId: string;
      status: string;
      notes?: string;
    }) => updatePurchaseStatus(purchaseId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });
}

/**
 * Hook para recibir compra
 */
export function useReceivePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseId: string) => receivePurchase(purchaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook para estadísticas de compras
 */
export function usePurchaseStatsQuery(businessId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.purchases.stats(businessId!),
    queryFn: async () => {
      if (!businessId) {
        throw new Error('Business ID is required');
      }

      const { data, error } = await supabase
        .from('purchases')
        .select('status, total, created_at')
        .eq('business_id', businessId);

      if (error) throw error;

      const purchases = data || [];

      return {
        total: purchases.length,
        pending: purchases.filter(p => p.status === 'pending').length,
        approved: purchases.filter(p => p.status === 'approved').length,
        received: purchases.filter(p => p.status === 'received').length,
        cancelled: purchases.filter(p => p.status === 'cancelled').length,
        totalAmount: purchases.reduce((sum, p) => sum + (p.total || 0), 0),
      };
    },
    enabled: !!businessId,
  });
}
