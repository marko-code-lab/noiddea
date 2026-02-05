'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Spinner } from '@/components/ui/spinner';
import { useSelectedBranch } from '@/src/hooks';
import { toast } from 'sonner';
import { updateBranch } from '@/app/actions';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  const { selectedBranch, isLoading, isManager } = useSelectedBranch();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
  });

  useEffect(() => {
    if (selectedBranch) {
      setFormData({
        name: selectedBranch.name || '',
        location: selectedBranch.location || '',
        phone: selectedBranch.phone || '',
      });
    }
  }, [selectedBranch]);

  const hasChanges =
    !!selectedBranch &&
    (formData.name !== (selectedBranch.name || '') ||
      formData.location !== (selectedBranch.location || '') ||
      formData.phone !== (selectedBranch.phone || ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranch) {
      toast.error('No se encontró la sucursal seleccionada');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('El nombre de la sucursal es requerido');
      return;
    }

    if (!formData.location.trim()) {
      toast.error('La ubicación es requerida');
      return;
    }

    if (isManager) {
      toast.error('No tienes permisos para editar esta sucursal');
      return;
    }

    setLoading(true);

    try {
      const result = await updateBranch(selectedBranch.id, {
        name: formData.name,
        location: formData.location,
        phone: formData.phone || null,
      });

      if (result.success) {
        toast.success('Sucursal actualizada correctamente');
        queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
        router.refresh();
      } else {
        toast.error(result.error || 'Error al actualizar la sucursal');
      }
    } catch (error) {
      console.error('Error actualizando sucursal:', error);
      toast.error('Error inesperado al actualizar la sucursal');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (selectedBranch) {
      setFormData({
        name: selectedBranch.name || '',
        location: selectedBranch.location || '',
        phone: selectedBranch.phone || '',
      });
      toast.info('Cambios descartados');
    }
  };

  if (isLoading || !selectedBranch) {
    return (
      <div className='h-dvh flex items-center justify-center'>
        <div className='w-md space-y-4'>
          <Skeleton className='h-9' />
          <Skeleton className='h-9' />
          <Skeleton className='h-9' />
          <Skeleton className='h-9' />
        </div>
      </div>
    );
  }

  const isDisabled = loading || isManager;

  return (
    <div className='h-dvh flex items-center justify-center'>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldSet className='w-md'>
              <FieldLegend className='text-xl!'>Configurar sucursal</FieldLegend>
              <FieldDescription>
                Configura la información de la sucursal seleccionada.
              </FieldDescription>
              {isManager && (
                <FieldDescription>
                  No tienes permisos para editar la sucursal. Contacta a un administrador.
                </FieldDescription>
              )}
              <FieldGroup>
                <Field>
                  <FieldLabel>Nombre de la sucursal</FieldLabel>
                  <Input
                    placeholder='Sucursal Norte'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={isDisabled}
                  />
                </Field>
                <Field>
                  <FieldLabel>Ubicación</FieldLabel>
                  <Input
                    placeholder='Av. Principal 123'
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    disabled={isDisabled}
                  />
                </Field>
                <Field>
                  <FieldLabel>Teléfono</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>+51</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder='000 000 000'
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      disabled={isDisabled}
                    />
                    <InputGroupAddon align='inline-end'>
                      <Tooltip>
                        <TooltipTrigger>
                          <InputGroupButton
                            variant='ghost'
                            aria-label='Info'
                            size='icon-xs'
                            disabled={isDisabled}
                          >
                            <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                          </InputGroupButton>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Si la sucursal no cuenta con teléfono propio, ingresa el número de
                            la empresa.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <div className='flex justify-end gap-2'>
                    {hasChanges && (
                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleReset}
                        disabled={isDisabled}
                      >
                        Descartar
                      </Button>
                    )}
                    <Button
                      type='submit'
                      disabled={isDisabled || !hasChanges}
                    >
                      {loading && <Spinner />}
                      Guardar cambios
                    </Button>
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}