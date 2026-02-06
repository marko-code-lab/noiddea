'use client';

import { CreateProductDialog } from '@/components/dashboard/products/create-product-dialog';
import { ImportProductsDialog } from '@/components/dashboard/products/import-products-dialog';
import { ProductsTable } from '@/components/dashboard/products/products-table';
import { DeleteProductsDialog } from '@/components/dashboard/products/delete-products-dialog';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProducts, useSelectedBranch } from '@/src/hooks';
import { HugeiconsIcon } from "@hugeicons/react";
import { DownloadIcon, FileIcon, FilterIcon, CheckListIcon, PackageIcon, SearchIcon, BashIcon, PackageOutOfStockIcon, DeleteIcon, CalendarOff, CalendarRemove01Icon, PackageOutOfStockFreeIcons } from "@hugeicons/core-free-icons";
import { useState, useCallback, useMemo } from 'react';
import type { ProductWithPresentations } from '@/src/types';
import { CreateReportDialog } from '@/components/dashboard/products/create-report-dialog';
import { DashLoading } from '@/components/dashboard/dash-loading';
import { cn } from '@/lib/utils';

export default function ProductsPage() {
  const { selectedBranch, isLoading: branchLoading } = useSelectedBranch();
  const {
    data: products = [],
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useProducts(selectedBranch?.id);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter] = useState<string>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithPresentations[]>([]);
  const [deleteProductsDialogOpen, setDeleteProductsDialogOpen] = useState(false);

  // Estado de carga: cargando si no hay sucursal o si los productos están cargando
  const isLoading = branchLoading || !selectedBranch || productsLoading;
  const isUpdatingData = productsFetching;

  const filteredProducts = useMemo(() => {
    return products.filter((product: ProductWithPresentations) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBrand = brandFilter === 'all' || product.brand === brandFilter;

      return matchesSearch && matchesBrand;
    });
  }, [products, searchQuery, brandFilter]);

  const handleSelectionChange = useCallback((ids: string[], products: ProductWithPresentations[]) => {
    setSelectedProductIds(ids);
    setSelectedProducts(products);
  }, []);

  const handleBulkDelete = () => {
    setDeleteProductsDialogOpen(true);
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedProductIds([]);
    setSelectedProducts([]);
    // TanStack Query invalidará automáticamente las queries
  };

  return (
    <div className='p-6'>
      {isLoading ? (
        <DashLoading />
      ) : (
        <div className='space-y-4'>
          <div className={cn('flex justify-between gap-4', !products.length && 'hidden')}>
            <div className='flex items-center gap-2'>
              <InputGroup className='w-96 bg-card'>
                <InputGroupInput
                  placeholder='Busqueda...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={isUpdatingData}
                />
                <InputGroupAddon>
                  <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
                </InputGroupAddon>
                <InputGroupAddon align='inline-end'>{products.length} productos</InputGroupAddon>
              </InputGroup>
              <div className='flex items-center gap-2'>
                <Button variant='outline' className={'border-dashed!'}><HugeiconsIcon icon={PackageOutOfStockFreeIcons} strokeWidth={2} /> Menos stock</Button>
                <Button variant='outline' className={'border-dashed!'}><HugeiconsIcon icon={CalendarRemove01Icon} strokeWidth={2} /> Vence pronto</Button>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {isUpdatingData && (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Spinner className='size-4' />
                  <span>Actualizando...</span>
                </div>
              )}
              {selectedProductIds.length > 0 ? (
                <Button
                  variant='destructive'
                  onClick={handleBulkDelete}
                  disabled={isUpdatingData}
                >
                  <HugeiconsIcon icon={DeleteIcon} strokeWidth={2} />
                  Eliminar {selectedProductIds.length} producto(s)
                </Button>
              ) : (
                <>
                  <CreateReportDialog />
                  <CreateProductDialog />
                </>
              )}
            </div>
          </div>
          {filteredProducts.length === 0 ? (
            <div className='h-dvh flex items-center justify-center'>
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <HugeiconsIcon icon={PackageOutOfStockIcon} strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>
                    {searchQuery || brandFilter !== 'all'
                      ? 'No se encontraron productos'
                      : 'No hay productos en esta sucursal'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {searchQuery || brandFilter !== 'all'
                      ? 'Intenta ajustar los filtros de búsqueda'
                      : 'Crea tu primer producto para esta sucursal'}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex items-center gap-2'>
                    <ImportProductsDialog />
                    <CreateProductDialog />
                  </div>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div className='relative'>
              {isUpdatingData && (
                <div className='absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 rounded-lg' />
              )}
              <ProductsTable
                products={filteredProducts}
                onProductUpdated={() => { }}
                onSelectionChange={handleSelectionChange}
                onBulkDelete={handleBulkDelete}
              />
            </div>
          )}
        </div>
      )}

      {/* Diálogo de eliminación múltiple */}
      <DeleteProductsDialog
        productIds={selectedProductIds}
        productNames={selectedProducts.map((p) => p.name)}
        open={deleteProductsDialogOpen}
        onOpenChange={setDeleteProductsDialogOpen}
        onSuccess={handleBulkDeleteSuccess}
      />
    </div>
  );
}
