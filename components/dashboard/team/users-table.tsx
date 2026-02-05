'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { BusinessUser } from '@/hooks/use-business-users';
import { ResetBenefitDialog } from './reset-benefit-dialog';
import { DeleteUserDialog } from './delete-user-dialog';
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, MoreHorizontalCircle01Icon, ArrowReloadHorizontalIcon, MoreHorizontalIcon, Edit01Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface UsersTableProps {
  users: BusinessUser[];
  onUserUpdated?: () => void;
}

const roleLabels: Record<string, string> = {
  manager: 'Manager',
  cashier: 'Cajero',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  manager: 'secondary',
  cashier: 'outline',
};

export function UsersTable({ users, onUserUpdated }: UsersTableProps) {
  const [resettingUser, setResettingUser] = useState<BusinessUser | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<BusinessUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleResetBenefit = (user: BusinessUser) => {
    setResettingUser(user);
    setResetDialogOpen(true);
  };

  const handleDelete = (user: BusinessUser) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    onUserUpdated?.();
  };

  return (
    <>
      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className=''>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className='text-center'>Beneficio</TableHead>
              <TableHead className='w-5' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>
                  {user.email}
                </TableCell>
                <TableCell>+51 {user.phone || '-'}</TableCell>
                <TableCell>
                  <Badge className={cn(user.role === 'manager' ? 'bg-blue-50 dark:bg-blue-950 dark:text-blue-300 text-blue-700' : 'bg-green-50 dark:bg-green-950 dark:text-green-300 text-green-700')}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell className='text-center'>
                  {formatCurrency(user.benefit ? user.benefit : 0)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant='ghost' size='icon-sm'>
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                      </Button>
                    } />
                    <DropdownMenuContent align='end' className='w-34'>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleResetBenefit(user)}>
                          <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} />
                          Bonus a cero
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-destructive'
                          onClick={() => handleDelete(user)}
                        >
                          <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de restablecimiento de beneficio */}
      <ResetBenefitDialog
        user={resettingUser}
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Diálogo de eliminación */}
      <DeleteUserDialog
        user={deletingUser}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}

