'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { resetUserBenefit } from '@/app/actions';
import type { BusinessUser } from '@/src/hooks/use-business-users';

interface ResetBenefitDialogProps {
  user: BusinessUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResetBenefitDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: ResetBenefitDialogProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!user) return;

    setIsResetting(true);

    try {
      const result = await resetUserBenefit(user.id);

      if (result.success) {
        toast.success('Beneficio restablecido correctamente');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al restablecer beneficio');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al restablecer beneficio');
    } finally {
      setIsResetting(false);
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Restablecer beneficio a 0?</AlertDialogTitle>
          <AlertDialogDescription>
            Verificar y almacenar esta información puede ser importante para resguardar los derechos de los empleados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancelar
          </Button>
          <Button onClick={handleReset} disabled={isResetting}>
            {isResetting && <Spinner className='mr-2' />}
            Restablecer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

