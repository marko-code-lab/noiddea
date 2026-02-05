'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/src/hooks';
import { Spinner } from '@/components/ui/spinner';
import { checkUserHasBusiness } from '@/app/actions/user-actions';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading: isLoadingUser } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Esperar a que se cargue el usuario
      if (isLoadingUser) {
        return;
      }

      // Si no hay usuario, permitir acceso a las rutas de auth
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Si hay usuario, verificar su estado y redirigir
      try {
        const result = await checkUserHasBusiness();

        if (result.authenticated && result.hasBusiness) {
          // Usuario autenticado con negocio/sucursal
          if (result.isManager) {
            // Manager → redirigir a dashboard
            router.push('/dashboard');
            return;
          } else if (result.isAdmin) {
            // Admin/Owner → redirigir a business
            router.push('/business');
            return;
          } else {
            // Otro rol (cashier) → redirigir a business (cashiers no deberían estar aquí pero por seguridad)
            router.push('/business');
            return;
          }
        } else if (result.authenticated && !result.hasBusiness) {
          // Usuario autenticado pero sin negocio → redirigir a crear negocio
          router.push('/business/create');
          return;
        }

        // Si no está autenticado, permitir acceso
        setIsChecking(false);
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        // En caso de error, permitir acceso
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [user, isLoadingUser, router]);

  // Mostrar loading mientras verifica
  if (isLoadingUser || isChecking) {
    return (
      <div className='flex items-center justify-center h-dvh'>
        <Spinner />
      </div>
    );
  }

  // Si no hay usuario o no está autenticado, mostrar el contenido (login/signup)
  return <>{children}</>;
}

