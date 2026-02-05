'use client';

import { useEffect, useState } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon, UserGroup02Icon } from "@hugeicons/core-free-icons";
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { CreateUserDialog, UsersTable } from '@/components/dashboard/team';
import { useBusinessUsers, useSelectedBranch } from '@/src/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { DashLoading } from '@/components/dashboard/dash-loading';

export default function TeamPage() {
  const { selectedBranch } = useSelectedBranch();
  const { users, loading, fetchUsers } = useBusinessUsers(selectedBranch?.id);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className='p-6'>
      {loading ? (
        <DashLoading />
      ) : filteredUsers.length === 0 ? (
        <div className='h-dvh flex items-center justify-center'>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery
                  ? 'No se encontraron usuarios'
                  : 'No hay usuarios en el equipo'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? 'Intenta ajustar la búsqueda'
                  : 'Agrega el primer miembro a tu equipo'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateUserDialog onSuccess={fetchUsers} />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-4'>
            <InputGroup className='w-96 bg-card'>
              <InputGroupAddon>
                <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
              </InputGroupAddon>
              <InputGroupInput
                placeholder='Buscar usuario...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <InputGroupAddon align="inline-end">{filteredUsers.length} usuarios</InputGroupAddon>
            </InputGroup>
            <CreateUserDialog onSuccess={fetchUsers} />
          </div>
          <UsersTable users={filteredUsers} onUserUpdated={fetchUsers} />
        </div>
      )}
    </div>
  );
}
