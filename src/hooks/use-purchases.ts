'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from './use-supabase';
import type { PurchaseWithItems } from '@/src/types';

export function usePurchases(businessId?: string, branchId?: string) {
  const supabase = useSupabase();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId && !branchId) {
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      try {
        setLoading(true);

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

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setPurchases(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchases:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();

    // Suscribirse a cambios en tiempo real
    const filter = businessId
      ? `business_id=eq.${businessId}`
      : branchId
        ? `branch_id=eq.${branchId}`
        : undefined;

    if (filter) {
      const channel = supabase
        .channel('purchases-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'purchases',
            filter,
          },
          () => {
            fetchPurchases();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [businessId, branchId, supabase]);

  return { purchases, loading, error };
}

export function usePurchase(purchaseId?: string) {
  const supabase = useSupabase();
  const [purchase, setPurchase] = useState<PurchaseWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchaseId) {
      setLoading(false);
      return;
    }

    const fetchPurchase = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
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

        if (fetchError) throw fetchError;

        setPurchase(data as any);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchase();
  }, [purchaseId, supabase]);

  return { purchase, loading, error };
}

export function usePurchaseStats(businessId?: string) {
  const supabase = useSupabase();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);

        const { data: purchases, error: fetchError } = await supabase
          .from('purchases')
          .select('status, total, created_at')
          .eq('business_id', businessId);

        if (fetchError) throw fetchError;

        const calculatedStats = {
          total: purchases?.length || 0,
          pending: purchases?.filter(p => p.status === 'pending').length || 0,
          approved: purchases?.filter(p => p.status === 'approved').length || 0,
          received: purchases?.filter(p => p.status === 'received').length || 0,
          cancelled:
            purchases?.filter(p => p.status === 'cancelled').length || 0,
          totalAmount:
            purchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0,
        };

        setStats(calculatedStats);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase stats:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [businessId, supabase]);

  return { stats, loading, error };
}
