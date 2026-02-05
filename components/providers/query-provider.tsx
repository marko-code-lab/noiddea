'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Opciones optimizadas para escalabilidad
            staleTime: 5 * 60 * 1000, // 5 minutos (aumentado para reducir requests)
            gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
            retry: (failureCount, error: any) => {
              // No reintentar en errores 4xx (errores del cliente)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Reintentar hasta 2 veces para errores de servidor
              return failureCount < 2;
            },
            refetchOnWindowFocus: false, // Evitar refetch innecesario
            refetchOnReconnect: true,
            refetchOnMount: false, // Usar cache si los datos están frescos
          },
          mutations: {
            // Opciones por defecto para mutaciones
            retry: 0,
            // Invalidar queries relacionadas después de mutaciones exitosas
            onError: (error) => {
              console.error('Mutation error:', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position='bottom' />
      )}
    </QueryClientProvider>
  );
}
