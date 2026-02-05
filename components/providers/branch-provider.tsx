'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useBranches } from '@/src/hooks/use-branches-query';
import { useUser } from '@/src/hooks/use-user';
import { useSupabase } from '@/src/hooks/use-supabase';
import type { Branch } from '@/src/types';

interface BranchContextType {
  selectedBranch: Branch | null;
  branches: Branch[];
  isLoading: boolean;
  selectBranch: (branch: Branch) => void;
  isManager: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const STORAGE_KEY = 'selected-branch-id';

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { data: allBranches = [], isLoading: isBranchesLoading } = useBranches();
  const { user } = useUser();
  const supabase = useSupabase();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [managerBranchId, setManagerBranchId] = useState<string | null>(null);
  const [isLoadingUserRole, setIsLoadingUserRole] = useState(true);
  const hasInitializedBranch = useRef(false);

  // Verificar si el usuario es manager y obtener su branch asignado
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        console.log('[BranchProvider] No user found');
        setIsLoadingUserRole(false);
        hasInitializedBranch.current = false;
        return;
      }

      try {

        console.log('[BranchProvider] Checking user role for:', user.id);

        // Verificar si es manager
        const { data: branchUser, error } = await supabase
          .from('branches_users')
          .select('branch_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('role', 'manager')
          .maybeSingle();

        if (error) {
          console.error('[BranchProvider] Error checking role:', error);
        }

        if (branchUser) {
          console.log('[BranchProvider] User is manager, branch:', branchUser.branch_id);
          setIsManager(true);
          setManagerBranchId(branchUser.branch_id);
        } else {
          console.log('[BranchProvider] User is admin/owner');
          setIsManager(false);
          setManagerBranchId(null);
        }
      } catch (error) {
        console.error('[BranchProvider] Error checking user role:', error);
      } finally {
        setIsLoadingUserRole(false);
      }
    };

    checkUserRole();
  }, [user, supabase]);

  // Cargar el branch seleccionado
  useEffect(() => {
    if (isBranchesLoading || isLoadingUserRole) {
      console.log('[BranchProvider] Loading...', { isBranchesLoading, isLoadingUserRole });
      return;
    }

    if (!allBranches.length) {
      console.log('[BranchProvider] No branches available');
      hasInitializedBranch.current = false;
      setSelectedBranch(null);
      return;
    }

    // Evitar actualizaciones innecesarias si ya se inicializó y el branch seleccionado sigue siendo válido
    if (hasInitializedBranch.current && selectedBranch) {
      const currentBranchExists = allBranches.some(b => b.id === selectedBranch.id);
      if (currentBranchExists) {
        // Si es manager, verificar que sigue siendo el mismo branch
        if (isManager && managerBranchId && selectedBranch.id === managerBranchId) {
          return;
        }
        // Si no es manager y el branch actual existe, no actualizar
        if (!isManager) {
          return;
        }
      }
    }

    console.log('[BranchProvider] Selecting branch...', {
      isManager,
      managerBranchId,
      branchesCount: allBranches.length,
    });

    // Si es manager, solo puede ver su branch asignado
    if (isManager && managerBranchId) {
      const managerBranch = allBranches.find(b => b.id === managerBranchId);
      if (managerBranch && (!selectedBranch || selectedBranch.id !== managerBranch.id)) {
        console.log('[BranchProvider] Manager branch found:', managerBranch.name);
        setSelectedBranch(managerBranch);
        localStorage.setItem(STORAGE_KEY, managerBranch.id);
        hasInitializedBranch.current = true;
      } else if (!managerBranch) {
        console.error('[BranchProvider] Manager branch not found in allBranches');
        setSelectedBranch(null);
        hasInitializedBranch.current = false;
      }
      return;
    }

    // Para admins: usar el branch guardado en localStorage o el primero
    const storedBranchId = localStorage.getItem(STORAGE_KEY);

    if (storedBranchId) {
      const storedBranch = allBranches.find(b => b.id === storedBranchId);
      if (storedBranch && (!selectedBranch || selectedBranch.id !== storedBranch.id)) {
        console.log('[BranchProvider] Using stored branch:', storedBranch.name);
        setSelectedBranch(storedBranch);
        hasInitializedBranch.current = true;
        return;
      }
    }

    // Si no hay branch guardado o no existe, usar el primero
    if (allBranches[0] && (!selectedBranch || selectedBranch.id !== allBranches[0].id)) {
      console.log('[BranchProvider] Using first branch:', allBranches[0].name);
      setSelectedBranch(allBranches[0]);
      localStorage.setItem(STORAGE_KEY, allBranches[0].id);
      hasInitializedBranch.current = true;
    }
  }, [allBranches, isBranchesLoading, isManager, managerBranchId, isLoadingUserRole, selectedBranch]);

  const selectBranch = (branch: Branch) => {
    // Los managers no pueden cambiar de branch
    if (isManager) {
      console.warn('Managers no pueden cambiar de sucursal');
      return;
    }

    setSelectedBranch(branch);
    localStorage.setItem(STORAGE_KEY, branch.id);
  };

  // Filtrar branches según el rol
  const branches = isManager && managerBranchId
    ? allBranches.filter(b => b.id === managerBranchId)
    : allBranches;

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        branches,
        isLoading: isBranchesLoading || isLoadingUserRole,
        selectBranch,
        isManager,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useSelectedBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useSelectedBranch must be used within a BranchProvider');
  }
  return context;
}

