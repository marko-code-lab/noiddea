'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from './use-supabase';
import { useBusiness } from './use-business';
import type { Branch } from '@/types';

export function useBranches() {
  const supabase = useSupabase();
  const { business, isLoading: isLoadingBusiness, role } = useBusiness();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBranches = useCallback(async () => {
    // Si no hay negocio o aún está cargando, esperar
    if (isLoadingBusiness) {
      return;
    }

    if (!business) {
      setBranches([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Si el usuario es admin u owner, obtener todas las sucursales del business
      if (role === 'admin' || role === 'owner') {
        const { data, error: fetchError } = await supabase
          .from('branches')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setBranches(data || []);
      } else {
        // Si no es admin/owner, buscar en branches_users (manager, cashier, seller)
        const { data, error: fetchError } = await supabase
          .from('branches_users')
          .select('branch:branches(*)')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (fetchError) {
          throw fetchError;
        }

        // Extraer las sucursales del resultado
        const branchesData =
          data
            ?.map((item: any) => item.branch)
            .filter(
              (branch: any) =>
                branch !== null && branch.business_id === business.id
            ) || [];

        // Ordenar por fecha de creación
        branchesData.sort((a: any, b: any) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setBranches(branchesData);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError(err as Error);
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [business, isLoadingBusiness, role, supabase]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    isLoading: isLoadingBusiness || isLoading,
    error,
    refetch: fetchBranches,
  };
}
