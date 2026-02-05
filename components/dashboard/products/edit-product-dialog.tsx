'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { ProductPresentation, ProductWithPresentations } from '@/src/types';
import { Spinner } from '@/components/ui/spinner';
import { updateProductPresentations } from '@/app/actions';
import { useUpdateProduct } from '@/src/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, DeleteIcon } from "@hugeicons/core-free-icons";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldTitle } from '@/components/ui/field';

interface Presentation {
  id?: string;
  variant: string;
  units: string;
  price: string;
  isNew?: boolean;
}

interface EditProductDialogProps {
  product: ProductWithPresentations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: EditProductDialogProps) {
  const updateProductMutation = useUpdateProduct();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expiration: '',
    brand: '',
    barcode: '',
    sku: '',
    stock: '',
    cost: '',
    price: '',
    bonification: '',
  });
  const [presentations, setPresentations] = useState<Presentation[]>([]);

  // Actualizar form data cuando cambia el producto
  useEffect(() => {
    if (product) {
      // Formatear fecha de expiración para input type="date" (YYYY-MM-DD)
      const expirationDate = (product as any).expiration
        ? new Date((product as any).expiration).toISOString().split('T')[0]
        : '';

      setFormData({
        name: product.name || '',
        description: product.description || '',
        expiration: expirationDate,
        brand: product.brand || '',
        barcode: product.barcode || '',
        sku: product.sku || '',
        stock: product.stock?.toString() || '0',
        cost: (product as any).cost?.toString() || '',
        price: (product as any).price?.toString() || '',
        bonification: (product as any).bonification?.toString() || '0',
      });

      // Cargar presentaciones existentes, excluyendo la presentación "unidad"
      // que no es editable (usa el precio base del producto)
      if (product.product_presentations) {
        setPresentations(
          product.product_presentations
            .filter(p => (p as any).variant !== 'unidad') // Excluir "unidad"
            .map(p => ({
              id: p.id,
              variant: (p as any).variant || '',
              units: (p as any).units?.toString() || '1',
              price: p.price?.toString() || '',
              isNew: false,
            }))
        );
      }
    }
  }, [product]);

  const handleAddPresentation = () => {
    setPresentations([
      ...presentations,
      {
        variant: '',
        units: '1',
        price: '',
        isNew: true,
      },
    ]);
  };

  const handleRemovePresentation = (index: number) => {
    // Permitir eliminar todas las presentaciones adicionales
    // La presentación "unidad" siempre existe pero no está en esta lista
    setPresentations(presentations.filter((_, i) => i !== index));
  };

  const handlePresentationChange = (
    index: number,
    field: keyof Presentation,
    value: string
  ) => {
    setPresentations(
      presentations.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    // Validar que las presentaciones adicionales tengan variante
    const validPresentations = presentations.filter(p => p.variant.trim());

    // Validar presentaciones adicionales (si las hay)
    for (const presentation of validPresentations) {
      if (!presentation.units || parseInt(presentation.units) <= 0 || isNaN(parseInt(presentation.units))) {
        toast.error('Las unidades deben ser mayor a 0 en las presentaciones');
        return;
      }
      if (!presentation.price || parseFloat(presentation.price) < 0 || isNaN(parseFloat(presentation.price))) {
        toast.error('El precio debe ser un número válido en las presentaciones');
        return;
      }
    }

    // Las presentaciones adicionales son opcionales
    // La presentación "unidad" siempre existe en el backend

    setIsSubmitting(true);

    try {
      // Actualizar información del producto
      // Convertir fecha de expiración a ISO string si existe
      const expirationISO = formData.expiration
        ? new Date(formData.expiration).toISOString()
        : undefined;

      const result = await updateProductMutation.mutateAsync({
        productId: product.id,
        data: {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          expiration: expirationISO,
          brand: formData.brand?.trim() || undefined,
          barcode: formData.barcode?.trim() || undefined,
          sku: formData.sku?.trim() || undefined,
          stock: formData.stock ? parseInt(formData.stock) : undefined,
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          price: formData.price ? parseFloat(formData.price) : undefined,
          bonification: formData.bonification ? parseFloat(formData.bonification) : 0,
        },
      });

      if (!result.success) {
        toast.error(result.error || 'Error al actualizar producto');
        setIsSubmitting(false);
        return;
      }

      // Actualizar presentaciones adicionales
      // Siempre llamar a updateProductPresentations para sincronizar el estado
      // (incluso si el array está vacío, para eliminar presentaciones que ya no existen)
      // La presentación "unidad" no se toca, siempre existe
      const presentationsResult = await updateProductPresentations(
        product.id,
        validPresentations.map(p => ({
          id: p.id,
          variant: p.variant.trim(),
          units: parseInt(p.units, 10),
          price: parseFloat(p.price),
        }))
      );

      if (!presentationsResult.success) {
        toast.error(presentationsResult.error || 'Error al actualizar presentaciones');
        setIsSubmitting(false);
        return;
      }

      // El hook useUpdateProduct ya invalida las queries en onSuccess
      // Solo invalidamos sin forzar refetch inmediato para mejor rendimiento
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'products';
        },
        refetchType: 'none', // No forzar refetch inmediato, solo marcar como stale
      });

      toast.success('Producto actualizado correctamente');
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al actualizar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={'min-w-xl'}>
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifica la información del producto y sus presentaciones
          </DialogDescription>
        </DialogHeader>
        <div className='no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <FieldGroup>
              <div className='grid grid-cols-3 gap-4'>
                <Field className='col-span-2'>
                  <FieldLabel htmlFor="name">
                    Nombre del producto
                  </FieldLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting || updateProductMutation.isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="brand">Marca</FieldLabel>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="description">Descripción</FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  disabled={isSubmitting}
                />
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="expiration">Fecha de Vencimiento</FieldLabel>
                  <Input
                    id="expiration"
                    type="date"
                    value={formData.expiration}
                    onChange={(e) => setFormData({ ...formData, expiration: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="barcode">Código de Barras</FieldLabel>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="stock">Stock</FieldLabel>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="cost">Costo de Compra</FieldLabel>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="price">Precio de Venta</FieldLabel>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="bonification">Bonificación</FieldLabel>
                  <Input
                    id="bonification"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={formData.bonification}
                    onChange={(e) => setFormData({ ...formData, bonification: e.target.value })}
                    disabled={isSubmitting || updateProductMutation.isPending}
                  />
                </Field>
              </div>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldTitle>Presentaciones Adicionales</FieldTitle>
                <FieldDescription>
                  La presentación unidad existe por defecto y usa el precio base del producto
                </FieldDescription>
              </Field>
              <div className='space-y-4'>
                {presentations.length === 0 ? (
                  <div className='border-2 border-dashed rounded-lg p-8 text-center'>
                    <p className='text-sm text-muted-foreground'>
                      No hay presentaciones adicionales. Solo existe la presentación Unidad.
                    </p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {presentations.map((presentation, index) => (
                      <div
                        key={index}
                        className='p-4 border rounded-lg space-y-4'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-medium'>
                            Presentación {index + 1}
                          </span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemovePresentation(index)}
                            disabled={isSubmitting || updateProductMutation.isPending}
                          >
                            <HugeiconsIcon icon={DeleteIcon} className='size-4' strokeWidth={2} />
                          </Button>
                        </div>

                        <div className='grid grid-cols-3 gap-4'>
                          <Field>
                            <FieldLabel>Variante</FieldLabel>
                            <Select
                              value={presentation.variant}
                              onValueChange={(value) =>
                                handlePresentationChange(index, 'variant', value as ProductPresentation['variant'])
                              }
                              disabled={isSubmitting || updateProductMutation.isPending}
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
                              onChange={(e) =>
                                handlePresentationChange(index, 'units', e.target.value)
                              }
                              disabled={isSubmitting || updateProductMutation.isPending}
                            />
                          </Field>
                          <Field>
                            <FieldLabel>Precio de Venta</FieldLabel>
                            <div className='relative'>
                              <Input
                                type='number'
                                step='0.01'
                                min='0'
                                placeholder='0.00'
                                value={presentation.price}
                                onChange={(e) =>
                                  handlePresentationChange(index, 'price', e.target.value)
                                }
                                disabled={isSubmitting || updateProductMutation.isPending}
                              />
                            </div>
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleAddPresentation}
                  disabled={isSubmitting}
                >
                  <HugeiconsIcon icon={PlusSignIcon} className='size-4' strokeWidth={2} />
                  Agregar
                </Button>
              </div>
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

