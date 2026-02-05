'use client';

import { useEffect, useState } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { ClockIcon } from "@hugeicons/core-free-icons";
import { SessionsTable, type UserSession } from '@/components/dashboard/sessions';
import { getUserSessions } from '@/app/actions';
import { useSelectedBranch } from '@/src/hooks';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { DashLoading } from '@/components/dashboard/dash-loading';

export default function SessionsPage() {
  const { selectedBranch } = useSelectedBranch();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const result = await getUserSessions(selectedBranch?.id);

        if (result.success && result.sessions) {
          setSessions(result.sessions as UserSession[]);
        }
      } catch (error) {
        // Error silencioso - el estado de loading se maneja en finally
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [selectedBranch?.id]);

  // Filtrar sesiones por búsqueda
  const filteredSessions = sessions.filter((session) => {
    if (searchQuery === '') return true;

    const query = searchQuery.toLowerCase();
    return (
      session.user?.name.toLowerCase().includes(query) ||
      session.user?.email.toLowerCase().includes(query) ||
      session.branch?.name.toLowerCase().includes(query) ||
      session.branch?.location.toLowerCase().includes(query)
    );
  });

  return (
    <div className={cn('p-6 h-dvh container mx-auto', filteredSessions.length === 0 && 'flex items-center justify-center')}>
      {loading ? (
        <DashLoading />
      ) : filteredSessions.length === 0 ? (
        <div className='py-24'>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <HugeiconsIcon icon={ClockIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery
                  ? 'No se encontraron sesiones'
                  : 'No hay sesiones registradas'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? 'Intenta ajustar la búsqueda'
                  : 'Las sesiones de los usuarios en la tienda aparecerán aquí'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <SessionsTable sessions={filteredSessions} />
      )}
    </div>
  );
}