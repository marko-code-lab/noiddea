'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { transferProductStock, getBranches, getProducts } from '@/app/actions';
import { useSelectedBranch } from '@/src/hooks';
import type { ProductWithPresentations } from '@/src/types';
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';

interface ShareProductDialogProps {
  product: ProductWithPresentations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShareProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: ShareProductDialogProps) {
  const { selectedBranch } = useSelectedBranch();
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [targetProductId, setTargetProductId] = useState<string>('');
  const [createNewProduct, setCreateNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductDescription, setNewProductDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [branches, setBranches] = useState<Array<{ id: string; name: string; location: string }>>([]);
  const [targetProducts, setTargetProducts] = useState<Array<{ id: string; name: string; stock: number }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (open && selectedBranch) {
      loadBranches();
      // Reset form when dialog opens
      setTargetBranchId('');
      setTargetProductId('');
      setCreateNewProduct(false);
      setNewProductName('');
      setNewProductDescription('');
      setQuantity('');
      setTargetProducts([]);
    }
  }, [open, selectedBranch]);

  useEffect(() => {
    if (targetBranchId) {
      loadTargetProducts();
    } else {
      setTargetProducts([]);
      setTargetProductId('');
    }
  }, [targetBranchId]);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const result = await getBranches();
      if (result.success && result.branches) {
        // Filtrar la sucursal actual
        const filteredBranches = result.branches.filter(
          (branch) => branch.id !== selectedBranch?.id
        );
        setBranches(filteredBranches);
      }
    } catch (error) {
      toast.error('Error cargando sucursales');
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadTargetProducts = async () => {
    if (!targetBranchId) return;

    setLoadingProducts(true);
    try {
      const result = await getProducts(targetBranchId);
      if (result && result.success && result.products) {
        const products = result.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          stock: p.stock || 0,
        }));
        setTargetProducts(products);

        // Si hay productos, buscar si existe uno con el mismo nombre
        const matchingProduct = products.find((p: any) => p.name === product?.name);
        if (matchingProduct) {
          setTargetProductId(matchingProduct.id);
          setCreateNewProduct(false);
        } else {
          setTargetProductId('');
          setCreateNewProduct(true);
          setNewProductName(product?.name || '');
        }
      }
    } catch (error) {
      toast.error('Error cargando productos de la sucursal destino');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !selectedBranch) {
      toast.error('Producto o sucursal no seleccionados');
      return;
    }

    if (!targetBranchId) {
      toast.error('Selecciona una sucursal destino');
      return;
    }

    if (!createNewProduct && !targetProductId) {
      toast.error('Selecciona un producto destino o activa la opción para crear uno nuevo');
      return;
    }

    if (createNewProduct && !newProductName.trim()) {
      toast.error('Ingresa el nombre del nuevo producto');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }

    const currentStock = product.stock || 0;
    if (qty > currentStock) {
      toast.error(`Stock insuficiente. Disponible: ${currentStock} unidades`);
      return;
    }

    setTransferring(true);
    try {
      const result = await transferProductStock({
        productId: product.id,
        sourceBranchId: selectedBranch.id,
        targetBranchId,
        targetProductId: createNewProduct ? undefined : targetProductId,
        newProductName: createNewProduct ? newProductName.trim() : undefined,
        newProductDescription: createNewProduct ? newProductDescription.trim() : undefined,
        quantity: qty,
        createIfNotExists: createNewProduct,
      });

      if (result && result.success) {
        toast.success(result.message || 'Stock transferido exitosamente');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result?.error || 'Error al transferir stock');
      }
    } catch (error) {
      toast.error('Error inesperado al transferir stock');
    } finally {
      setTransferring(false);
    }
  };

  if (!product) return null;

  const currentStock = product.stock || 0;
  const maxQuantity = currentStock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='min-w-md'>
        <DialogHeader>
          <DialogTitle>Compartir Producto</DialogTitle>
          <DialogDescription>
            Transfiere stock de <strong>{product.name}</strong> a otra sucursal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='product'>Producto</FieldLabel>
              <Input
                id='product'
                value={product.name}
                disabled
                className='bg-muted'
              />
              <FieldDescription>
                {currentStock} unidades disponibles
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor='targetBranch'>Sucursal Destino</FieldLabel>
              <Select
                value={targetBranchId}
                onValueChange={(value) => {
                  setTargetBranchId(value as string);
                  setTargetProductId('');
                  setCreateNewProduct(false);
                }}
                disabled={loadingBranches || transferring}
              >
                <SelectTrigger id='targetBranch'>
                  <SelectValue placeholder='Selecciona una sucursal' />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {branches.length === 0 && !loadingBranches && (
                <p className='text-sm text-muted-foreground'>
                  No hay otras sucursales disponibles
                </p>
              )}
            </Field>
            {targetBranchId && (
              <Field>
                <FieldLabel htmlFor='targetProduct'>Producto Destino</FieldLabel>
                <Select
                  value={createNewProduct ? 'new' : targetProductId}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setCreateNewProduct(true);
                      setTargetProductId('');
                      setNewProductName(product?.name || '');
                    } else {
                      setCreateNewProduct(false);
                      setTargetProductId(value as string);
                    }
                  }}
                  disabled={loadingProducts || transferring}
                >
                  <SelectTrigger id='targetProduct'>
                    <SelectValue placeholder='Selecciona un producto' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='new'>
                      <div className='flex items-center gap-2'>
                        <HugeiconsIcon icon={PlusSignIcon} className='h-4 w-4' strokeWidth={2} />
                        <span>Crear nuevo producto</span>
                      </div>
                    </SelectItem>
                    {targetProducts.map((targetProduct) => (
                      <SelectItem key={targetProduct.id} value={targetProduct.id}>
                        {targetProduct.name} (Stock: {targetProduct.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingProducts && (
                  <p className='text-sm text-muted-foreground'>Cargando productos...</p>
                )}
                {!loadingProducts && targetProducts.length === 0 && targetBranchId && (
                  <p className='text-sm text-muted-foreground'>
                    No hay productos en esta sucursal. Selecciona "Crear nuevo producto"
                  </p>
                )}
              </Field>
            )}
            {createNewProduct && targetBranchId && (
              <Field>
                <FieldLabel htmlFor='newProductName'>Nombre del Nuevo Producto</FieldLabel>
                <Input
                  id='newProductName'
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder='Nombre del producto'
                  disabled={transferring}
                  required
                />
                <FieldDescription>
                  El producto se creará en la sucursal destino con el stock transferido
                </FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor='quantity'>Cantidad a Transferir</FieldLabel>
              <Input
                id='quantity'
                type='number'
                min='1'
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder='Ej: 10'
                disabled={transferring}
                required
              />
              <FieldDescription>
                Máximo: {maxQuantity} unidades
              </FieldDescription>
            </Field>
            <Field orientation='horizontal' className='justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={transferring}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={
                  transferring ||
                  !targetBranchId ||
                  !quantity ||
                  (!createNewProduct && !targetProductId) ||
                  (createNewProduct && !newProductName.trim())
                }
              >
                {transferring && <Spinner />}
                Transferir
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

