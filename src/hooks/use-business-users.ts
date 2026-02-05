'use client';

import { useState, useCallback } from 'react';
import { getBusinessUsers } from '@/app/actions';

export interface BusinessUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  branchId?: string;
  branchName?: string;
  benefit?: number;
  isActive: boolean;
  level: 'business' | 'branch';
}

export function useBusinessUsers(branchId?: string) {
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getBusinessUsers(branchId);
      
      if (result.success && result.users) {
        setUsers(result.users);
        setError(null);
      } else {
        setError(result.error || 'Error desconocido');
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching business users:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  return { users, loading, error, fetchUsers };
}

