'use client';

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
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { deleteProducts } from '@/app/actions';

interface DeleteProductsDialogProps {
  productIds: string[];
  productNames: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteProductsDialog({
  productIds,
  productNames,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProductsDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (productIds.length === 0) return;

    setDeleting(true);
    try {
      console.log('🗑️ [Dialog] Iniciando eliminación:', productIds);
      const result = await deleteProducts(productIds);
      console.log('📦 [Dialog] Resultado:', result);

      if (result && result.success) {
        // Invalidar todas las queries de productos
        console.log('🔄 [Dialog] Invalidando cache...');
        await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        // Invalidar también queries por branch
        await queryClient.invalidateQueries({ queryKey: ['products', 'branch'] });
        
        console.log('✅ [Dialog] Cache invalidado para productos');
        toast.success(
          `${result.deletedCount || productIds.length} producto(s) eliminado(s) correctamente`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        console.error('❌ [Dialog] Error en respuesta:', result);
        toast.error(result?.error || 'Error al eliminar productos');
      }
    } catch (error) {
      console.error('❌ [Dialog] Error inesperado:', error);
      toast.error('Error inesperado al eliminar productos');
    } finally {
      setDeleting(false);
    }
  };

  if (productIds.length === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro de eliminar {productIds.length} producto(s)?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer, se perderán todos los datos asociados a estos productos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
            {deleting && <Spinner />}
            Eliminar {productIds.length} producto(s)
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

