'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from './use-supabase';
import type { Supplier } from '@/src/types';

export function useSuppliers(businessId?: string) {
  const supabase = useSupabase();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchSuppliers = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        setSuppliers(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('suppliers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchSuppliers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, supabase]);

  return { suppliers, loading, error, refetch: () => { } };
}

export function useSupplier(supplierId?: string) {
  const supabase = useSupabase();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supplierId) {
      setLoading(false);
      return;
    }

    const fetchSupplier = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();

        if (fetchError) throw fetchError;

        setSupplier(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching supplier:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [supplierId, supabase]);

  return { supplier, loading, error };
}
