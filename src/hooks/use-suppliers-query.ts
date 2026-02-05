'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { createSupplier, updateSupplier } from '@/app/actions';
import { queryKeys } from '@/lib/query-keys';
import type { Supplier } from '@/src/types';

/**
 * Hook para obtener proveedores usando TanStack Query
 */
export function useSuppliersQuery(businessId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: businessId
      ? queryKeys.suppliers.byBusiness(businessId)
      : queryKeys.suppliers.all,
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID requerido');

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      return data as Supplier[];
    },
    enabled: !!businessId,
  });
}

/**
 * Hook para obtener un proveedor específico
 */
export function useSupplierQuery(supplierId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.suppliers.detail(supplierId!),
    queryFn: async () => {
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (error) throw error;

      return data as Supplier;
    },
    enabled: !!supplierId,
  });
}

/**
 * Hook para crear proveedor
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

/**
 * Hook para actualizar proveedor
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      updates,
    }: {
      supplierId: string;
      updates: any;
    }) => updateSupplier(supplierId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}
