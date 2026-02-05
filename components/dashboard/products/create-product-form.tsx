'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { CreateProductData } from '@/src/hooks/use-products';
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, DeleteIcon } from "@hugeicons/core-free-icons";
import { Spinner } from '@/components/ui/spinner';

interface CreateProductFormProps {
  branchId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onSubmit: (data: CreateProductData) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

interface Presentation {
  id: string;
  variant: string;  // pack, blister, caja, unidad
  units: string;    // cuántas unidades incluye
  price: string;    // precio de venta de esta presentación
}

export function CreateProductForm({
  branchId,
  onSuccess,
  onCancel,
  onSubmit,
  isLoading = false,
}: CreateProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expiration: '',
    brand: '',
    barcode: '',
    sku: '',
    cost: '',      // Costo general del producto
    price: '',     // Precio base del producto
    stock: '',     // Stock inicial del producto
    bonification: '',     // Bonificación del producto
  });

  // Presentaciones adicionales (la variante "unidad" se crea automáticamente)
  const [presentations, setPresentations] = useState<Presentation[]>([]);

  const handleAddPresentation = () => {
    setPresentations([
      ...presentations,
      {
        id: Date.now().toString(),
        variant: '',
        units: '1',
        price: '',
      },
    ]);
  };

  const handleRemovePresentation = (id: string) => {
    setPresentations(presentations.filter(p => p.id !== id));
  };

  const handlePresentationChange = (
    id: string,
    field: keyof Presentation,
    value: string
  ) => {
    setPresentations(
      presentations.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (!formData.name.trim()) {
      toast.error('El nombre del producto es requerido');
      return;
    }

    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      toast.error('El costo del producto es requerido');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('El precio de venta es requerido');
      return;
    }

    // Validar presentaciones adicionales (si las hay)
    const additionalPresentations = presentations.filter(p => p.variant.trim());
    for (const presentation of additionalPresentations) {
      if (!presentation.units || parseInt(presentation.units) <= 0) {
        toast.error('Las unidades deben ser mayor a 0 en las presentaciones');
        return;
      }
      if (!presentation.price || parseFloat(presentation.price) <= 0) {
        toast.error('El precio es requerido en las presentaciones adicionales');
        return;
      }
    }

    // Convertir fecha de expiración a ISO string si existe
    const expirationISO = formData.expiration
      ? new Date(formData.expiration).toISOString()
      : undefined;

    const data: CreateProductData = {
      branchId,
      name: formData.name,
      description: formData.description || undefined,
      expiration: expirationISO,
      brand: formData.brand || undefined,
      barcode: formData.barcode || undefined,
      sku: formData.sku || undefined,
      cost: parseFloat(formData.cost),
      price: parseFloat(formData.price),
      stock: formData.stock ? parseInt(formData.stock) : 0,
      bonification: formData.bonification ? parseFloat(formData.bonification) : 0,
      // Solo enviar presentaciones adicionales (unidad se crea automáticamente)
      presentations: additionalPresentations.map(p => ({
        variant: p.variant,
        units: parseInt(p.units),
        price: parseFloat(p.price),
      })),
    };

    const result = await onSubmit(data);

    if (result?.success) {
      toast.success('Producto creado exitosamente');
      onSuccess?.();
    } else {
      toast.error(result?.error || 'Error al crear producto');
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <FieldGroup>
        <div className='grid grid-cols-3 gap-4'>
          <Field className='col-span-2'>
            <FieldLabel>Nombre del producto</FieldLabel>
            <Input
              placeholder='Ej: Coca-Cola'
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Field>
          <Field>
            <FieldLabel>Marca</FieldLabel>
            <Input
              placeholder='Ej: Coca-Cola'
              value={formData.brand}
              onChange={e => setFormData({ ...formData, brand: e.target.value })}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            placeholder='Descripción del producto...'
            value={formData.description}
            onChange={e =>
              setFormData({ ...formData, description: e.target.value })
            }
            className='h-20 resize-none'
          />
        </Field>
        <div className='grid grid-cols-3 gap-4'>
          <Field>
            <FieldLabel>Fecha de Vencimiento</FieldLabel>
            <Input
              type='date'
              value={formData.expiration}
              onChange={e =>
                setFormData({ ...formData, expiration: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Código de barras</FieldLabel>
            <Input
              placeholder='7891234567890'
              value={formData.barcode}
              onChange={e => setFormData({ ...formData, barcode: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Stock Inicial</FieldLabel>
            <Input
              type='number'
              min='0'
              placeholder='0'
              value={formData.stock}
              onChange={e => setFormData({ ...formData, stock: e.target.value })}
            />
          </Field>
        </div>
        <div className='grid grid-cols-3 gap-4'>
          <Field>
            <FieldLabel>Costo de Compra</FieldLabel>
            <Input
              type='number'
              step='0.01'
              min='0.01'
              placeholder='0.00'
              value={formData.cost}
              onChange={e => setFormData({ ...formData, cost: e.target.value })}
              required
            />
          </Field>
          <Field>
            <FieldLabel>Precio de Venta</FieldLabel>
            <Input
              type='number'
              step='0.01'
              min='0.01'
              placeholder='0.00'
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </Field>
          <Field>
            <FieldLabel>Bonificación</FieldLabel>
            <Input
              type='number'
              step='0.01'
              min='0'
              placeholder='0.00'
              value={formData.bonification}
              onChange={e => setFormData({ ...formData, bonification: e.target.value })}
            />
          </Field>
        </div>
      </FieldGroup>
      <FieldGroup>
        <Field>
          <FieldLabel>Presentaciones</FieldLabel>
          <FieldDescription>
            La presentación unidad existe por defecto y usa el precio base del producto
          </FieldDescription>
          {presentations.length === 0 ? (
            <div className='border border-dashed rounded-lg p-8 text-center'>
              <p className='text-sm text-muted-foreground'>
                No hay presentaciones adicionales. Agrega una para continuar.
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {presentations.map((presentation) => (
                <div
                  key={presentation.id}
                  className='p-4 border border-dashed rounded-lg space-y-4'
                >
                  <FieldGroup className='grid grid-cols-[1fr_1fr_1fr_auto] gap-4'>
                    <Field>
                      <FieldLabel>Variante</FieldLabel>
                      <Select
                        value={presentation.variant}
                        onValueChange={value =>
                          handlePresentationChange(presentation.id, 'variant', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Tipo' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='pack'>Pack</SelectItem>
                          <SelectItem value='blister'>Blister</SelectItem>
                          <SelectItem value='caja'>Caja</SelectItem>
                          <SelectItem value='sixpack'>Six Pack</SelectItem>
                          <SelectItem value='docena'>Docena</SelectItem>
                          <SelectItem value='pallet'>Pallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>Unidades</FieldLabel>
                      <Input
                        type='number'
                        min='1'
                        placeholder='Ej: 6'
                        value={presentation.units}
                        onChange={e =>
                          handlePresentationChange(
                            presentation.id,
                            'units',
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Precio de Venta</FieldLabel>
                      <Input
                        type='number'
                        step='0.01'
                        min='0'
                        placeholder='0.00'
                        value={presentation.price}
                        onChange={e =>
                          handlePresentationChange(
                            presentation.id,
                            'price',
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Button
                      type='button'
                      variant='destructive'
                      size='icon-sm'
                      className={'my-auto'}
                      onClick={() => handleRemovePresentation(presentation.id)}
                    >
                      <HugeiconsIcon icon={DeleteIcon} strokeWidth={2} />
                    </Button>
                  </FieldGroup>
                </div>
              ))}
            </div>
          )}
          <Button
            type='button'
            variant='outline'
            onClick={handleAddPresentation}
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Agregar
          </Button>
        </Field>
      </FieldGroup>
      <footer className='sticky bottom-0 left-0 bg-background flex items-center justify-end gap-2 pt-4'>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type='submit' disabled={isLoading}>
          {isLoading && <Spinner />} Crear producto
        </Button>
      </footer>
    </form>
  );
}
