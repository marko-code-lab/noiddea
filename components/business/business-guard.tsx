'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelectedBranch } from '@/src/hooks';
import { Spinner } from '@/components/ui/spinner';

interface BusinessGuardProps {
  children: React.ReactNode;
}

export function BusinessGuard({ children }: BusinessGuardProps) {
  const { isManager, isLoading } = useSelectedBranch();
  const router = useRouter();

  useEffect(() => {
    // Si es manager, redirigir al dashboard
    if (!isLoading && isManager) {
      router.push('/dashboard');
    }
  }, [isManager, isLoading, router]);

  // Mostrar loading mientras verifica
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-dvh'>
        <Spinner className='size-6' />
      </div>
    );
  }

  // Si es manager, no mostrar nada (ya está redirigiendo)
  if (isManager) {
    return null;
  }

  // Si no es manager, mostrar el contenido
  return <>{children}</>;
}

