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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { createBranchEmployee } from '@/app/actions';
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useSelectedBranch, useBusiness } from '@/src/hooks';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupButton } from '@/components/ui/input-group';
import { InputGroupInput } from '@/components/ui/input-group';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipContent } from '@/components/ui/tooltip';

interface CreateUserDialogProps {
  onSuccess?: () => void;
}

const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cajero' },
];

export function CreateUserDialog({ onSuccess }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { selectedBranch } = useSelectedBranch();
  const { business } = useBusiness();

  const [formData, setFormData] = useState({
    name: '',
    emailName: '', // Solo el nombre del email (sin @domain.app)
    phone: '',
    password: '',
    role: '',
  });

  // Función helper para construir el dominio del negocio
  const getBusinessDomain = (businessName: string) => {
    if (!businessName.trim()) return '';
    return `${businessName.trim().toLowerCase().replace(/ /g, '')}.app`;
  };

  // Email completo para validación y envío
  const fullEmail = formData.emailName.trim() && business?.name
    ? `${formData.emailName.trim()}@${getBusinessDomain(business.name)}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranch) {
      toast.error('No hay sucursal seleccionada');
      return;
    }

    if (!business?.name) {
      toast.error('No se encontró el negocio');
      return;
    }

    if (!formData.emailName.trim()) {
      toast.error('El nombre de usuario del correo es requerido');
      return;
    }

    if (formData.emailName.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (!formData.role) {
      toast.error('Selecciona un rol');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createBranchEmployee({
        name: formData.name,
        email: fullEmail,
        phone: formData.phone,
        password: formData.password,
        branchId: selectedBranch.id,
        role: formData.role as 'cashier' | 'manager',
        benefit: 0,
      });

      if (result.success) {
        toast.success('Usuario creado correctamente');
        setOpen(false);
        // Resetear el formulario
        setFormData({
          name: '',
          emailName: '',
          phone: '',
          password: '',
          role: '',
        });
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al crear usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button><HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} /> Agregar usuario</Button>
      } />
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Agrega un nuevo miembro a la sucursal {selectedBranch?.name || ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='name'>Nombre</FieldLabel>
              <Input
                id='name'
                value={formData.name}
                placeholder='Juan Pérez'
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </Field>
            <div className='grid grid-cols-2 gap-4'>
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
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InputGroupButton
                          variant="ghost"
                          aria-label="Info"
                          size="icon-xs"
                        >
                          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                        </InputGroupButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>El número de teléfono del usuario</p>
                      </TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor='password'>Contraseña</FieldLabel>
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••••••••••'
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor='email-name'>Nombre de usuario</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id='email-name'
                  type='text'
                  placeholder='usuario'
                  value={formData.emailName}
                  onChange={(e) =>
                    setFormData({ ...formData, emailName: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>
                    @{business?.name ? getBusinessDomain(business.name) : 'negocio.app'}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor='role'>Rol</FieldLabel>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Selecciona un rol' />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting && <Spinner />}
                  Crear Usuario
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
