'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { createBranch } from '@/app/actions';
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '../ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useRouter } from 'next/navigation';

interface CreateBranchDialogProps {
  onSuccess?: () => void;
}

export function CreateBranchDialog({ onSuccess }: CreateBranchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (!formData.location.trim()) {
      toast.error('La ubicación es requerida');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createBranch({
        name: formData.name,
        location: formData.location,
        phone: formData.phone || undefined,
      });

      if (result.success) {
        toast.success('Sucursal creada correctamente');
        // Resetear formulario
        setFormData({
          name: '',
          location: '',
          phone: '',
        });
        // Invalidar queries para refrescar la lista
        queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al crear sucursal');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al crear sucursal');
    } finally {
      setIsSubmitting(false);
      router.refresh();
    }
  };

  return (
    <Card className='w-md z-10'>
      <CardHeader>
        <CardTitle>Crear sucursal</CardTitle>
        <CardDescription>
          Agrega una nueva sucursal a tu negocio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='name'>Nombre de la sucursal</FieldLabel>
              <Input
                id='name'
                value={formData.name}
                placeholder='Sucursal Norte'
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor='location'>Ubicación</FieldLabel>
              <Input
                id='location'
                value={formData.location}
                placeholder='Av. Principal 123'
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor='phone'>Teléfono</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>+51</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="000 000 000"
                  id="phone"
                  type="text"
                  maxLength={9}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <Tooltip>
                    <TooltipTrigger render={
                      <InputGroupButton
                        variant="ghost"
                        aria-label="Info"
                        size="icon-xs"
                      >
                        <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                      </InputGroupButton>
                    } />
                    <TooltipContent>
                      <p>Si la sucursal no cuenta con teléfono propio, ingresa el número de la empresa</p>
                    </TooltipContent>
                  </Tooltip>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <Button type='submit' disabled={isSubmitting} className='w-full'>
                {isSubmitting && <Spinner />}
                Crear Sucursal
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

