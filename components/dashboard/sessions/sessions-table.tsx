'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, Logout01Icon, MoreHorizontalIcon, MoreVerticalCircle01Icon, ProfileIcon } from "@hugeicons/core-free-icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface UserSession {
  id: string;
  user_id: string;
  branch_id: string;
  started_at: string;
  closed_at: string | null;
  created_at: string;
  cash_amount?: number;
  digital_wallet_amount?: number;
  card_amount?: number;
  transfer_amount?: number;
  total_amount?: number;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  branch?: {
    id: string;
    name: string;
    location: string;
  };
}

interface SessionsTableProps {
  sessions: UserSession[];
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function formatDuration(startedAt: string, closedAt: string | null): string {
  if (!closedAt) return 'En curso';

  try {
    const start = new Date(startedAt);
    const end = new Date(closedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  } catch {
    return '-';
  }
}

function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  return (
    <div className='border rounded-lg overflow-hidden bg-card'>
      <Table>
        <TableHeader className='bg-muted'>
          <TableRow className='hover:bg-transparent'>
            <TableHead>Usuario</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Fin</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead className='text-center'>Efectivo</TableHead>
            <TableHead className='text-center'>Billetera Digital</TableHead>
            <TableHead className='text-center'>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className='w-5' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className='text-center text-muted-foreground py-8'>
                No hay sesiones registradas
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  {session.user?.name || '-'}
                </TableCell>
                <TableCell>
                  {formatDate(session.started_at)}
                </TableCell>
                <TableCell>
                  {session.closed_at ?
                    formatDate(session.closed_at)
                    : '-'}
                </TableCell>
                <TableCell>
                  {formatDuration(session.started_at, session.closed_at)}
                </TableCell>
                <TableCell className='text-center'>
                  {formatCurrency(session.cash_amount || 0)}
                </TableCell>
                <TableCell className='text-center'>
                  {formatCurrency(session.digital_wallet_amount || 0)}
                </TableCell>
                <TableCell className='text-center'>
                  {formatCurrency(session.total_amount || 0)}
                </TableCell>
                <TableCell>
                  <Badge variant={session.closed_at ? 'secondary' : 'default'}>
                    {session.closed_at ? 'Finalizada' : 'Activa'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant='ghost' size='icon-sm'>
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                      </Button>
                    } />
                    <DropdownMenuContent align='end' className={'w-40'}>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem >
                          <HugeiconsIcon icon={ProfileIcon} strokeWidth={2} />
                          Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
                          Descargar
                        </DropdownMenuItem>
                        <DropdownMenuItem variant='destructive'>
                          <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                          Finalizar sesión
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

