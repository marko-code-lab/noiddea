'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from './use-supabase';
import { useUser } from './use-user';
import type { Business, BusinessUser, BusinessUserRole } from '@/src/types';

interface BusinessData {
  business: Business;
  role: BusinessUserRole | null;
  businessUser: BusinessUser | null;
}

export function useBusiness() {
  const supabase = useSupabase();
  const { user, isLoading: isLoadingUser } = useUser();
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      // Si no hay usuario o aún está cargando, esperar
      if (isLoadingUser) {
        return;
      }

      if (!user) {
        setBusinessData(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Primero intentar obtener el negocio desde businesses_users (admin/owner)
        const { data: businessUserData, error: businessUserError } =
          await supabase
            .from('businesses_users')
            .select(
              `
            id,
            user_id,
            business_id,
            role,
            is_active,
            created_at,
            businesses (
              id,
              name,
              description,
              tax_id,
              website,
              created_at
            )
          `
            )
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (businessUserError && businessUserError.code !== 'PGRST116') {
          throw businessUserError;
        }

        if (businessUserData && businessUserData.businesses) {
          // Usuario es admin/owner
          setBusinessData({
            business: businessUserData.businesses as Business,
            role: businessUserData.role as BusinessUserRole,
            businessUser: {
              id: businessUserData.id,
              user_id: businessUserData.user_id,
              business_id: businessUserData.business_id,
              role: businessUserData.role,
              is_active: businessUserData.is_active,
              created_at: businessUserData.created_at,
            } as BusinessUser,
          });
        } else {
          // Si no está en businesses_users, intentar obtener desde branches_users (manager)
          const { data: branchUserData, error: branchUserError } =
            await supabase
              .from('branches_users')
              .select(
                `
              id,
              user_id,
              branch_id,
              role,
              is_active,
              created_at,
              branch:branches (
                id,
                name,
                business_id,
                business:businesses (
                  id,
                  name,
                  description,
                  tax_id,
                  website,
                  created_at
                )
              )
            `
              )
              .eq('user_id', user.id)
              .eq('is_active', true)
              .maybeSingle();

          if (branchUserError && branchUserError.code !== 'PGRST116') {
            throw branchUserError;
          }

          if (branchUserData && branchUserData.branch) {
            const branch = branchUserData.branch as any;
            if (branch.business) {
              // Usuario es manager/cashier/seller - obtener business desde branch
              setBusinessData({
                business: branch.business as Business,
                role: null, // No tiene rol de business, solo de branch
                businessUser: null, // No tiene registro en businesses_users
              });
            } else {
              setBusinessData(null);
            }
          } else {
            setBusinessData(null);
          }
        }
      } catch (err) {
        console.error('Error fetching business:', err);
        setError(err as Error);
        setBusinessData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [user, isLoadingUser, supabase]);

  return {
    business: businessData?.business ?? null,
    role: businessData?.role ?? null,
    businessUser: businessData?.businessUser ?? null,
    isLoading: isLoadingUser || isLoading,
    error,
    hasBusiness: !!businessData?.business,
  };
}
