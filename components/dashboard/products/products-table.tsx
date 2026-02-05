'use client';

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProductWithPresentations } from '@/src/types';
import { formatCurrency } from '@/lib/currency';
import {
  EditProductDialog,
  DeleteProductDialog,
  ShareProductDialog,
  DeleteProductsDialog,
} from '@/components/dashboard/products';
import { useState, useMemo, useEffect, useRef } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { ShareIcon, DeleteIcon, PackageAddIcon, Edit02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { AddStockDialog } from './add-stock-dialog';

interface ProductsTableProps {
  products: ProductWithPresentations[];
  onProductUpdated?: () => void;
  onSelectionChange?: (selectedIds: string[], selectedProducts: ProductWithPresentations[]) => void;
  onBulkDelete?: () => void;
}

export function ProductsTable({
  products,
  onProductUpdated,
  onSelectionChange,
  onBulkDelete,
}: ProductsTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingProduct, setEditingProduct] = useState<ProductWithPresentations | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductWithPresentations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProducts, setDeletingProducts] = useState<string[]>([]);
  const [deleteProductsDialogOpen, setDeleteProductsDialogOpen] = useState(false);
  const [sharingProduct, setSharingProduct] = useState<ProductWithPresentations | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);

  // La selección se calcula más abajo una vez creado `table`

  const columns = useMemo<ColumnDef<ProductWithPresentations>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate') as boolean
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Seleccionar todos'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Seleccionar ${row.original.name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: 'Producto',
        cell: ({ row }) => <div>{row.original.name}</div>,
      },
      {
        id: 'expiration',
        header: 'Vencimiento',
        cell: ({ row }) => {
          const expiration = (row.original as any).expiration;
          if (!expiration) return <div>-</div>;
          try {
            const date = new Date(expiration);
            return <div>{date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>;
          } catch {
            return <div>-</div>;
          }
        },
      },
      {
        accessorKey: 'brand',
        header: 'Marca',
        cell: ({ row }) => <div>{row.original.brand || '-'}</div>,
      },
      {
        id: 'cost',
        header: () => <div className='text-center'>Costo</div>,
        cell: ({ row }) => (
          <div className='text-center'>
            {(row.original as any).cost ? formatCurrency((row.original as any).cost) : '-'}
          </div>
        ),
      },
      {
        id: 'price',
        header: () => <div className='text-center'>Venta</div>,
        cell: ({ row }) => (
          <div className='text-center'>
            {(row.original as any).price ? formatCurrency((row.original as any).price) : '-'}
          </div>
        ),
      },
      {
        id: 'bonification',
        header: () => <div className='text-center'>Bonificación</div>,
        cell: ({ row }) => (
          <div className='text-center'>
            {(row.original as any).bonification
              ? formatCurrency((row.original as any).bonification)
              : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'stock',
        header: () => <div className='text-center'>Stock</div>,
        cell: ({ row }) => <div className='text-center'>{row.original.stock ?? 0}</div>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className='flex justify-end'>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant='ghost' size='icon-sm'>
                    <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                  </Button>
                } />
                <DropdownMenuContent align='end'>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleAddStock(product)}>
                      <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} />
                      Ingresar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(product)}>
                      <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare(product)}>
                      <HugeiconsIcon icon={ShareIcon} strokeWidth={2} />
                      Compartir
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-destructive'
                      onClick={() => handleDelete(product)}
                    >
                      <HugeiconsIcon icon={DeleteIcon} strokeWidth={2} />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
  });

  // Calcular selección basada en los IDs reales de filas (robusto frente a paginación/orden)
  const selectedProducts = useMemo(() => {
    const selectedRowIds = Object.keys(rowSelection);
    if (selectedRowIds.length === 0) return [] as ProductWithPresentations[];
    return selectedRowIds
      .map((id) => table.getRowModel().rows.find((r) => r.id === id)?.original)
      .filter((p): p is ProductWithPresentations => !!p);
  }, [rowSelection, table, products]);

  const selectedProductIds = useMemo(() => selectedProducts.map((p) => p.id), [selectedProducts]);

  // Usar ref para evitar llamadas innecesarias y rastrear el callback
  const prevSelectionRef = useRef<string>('');
  const onSelectionChangeRef = useRef(onSelectionChange);

  // Mantener el ref actualizado
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Notificar cambios en la selección solo si realmente cambió
  useEffect(() => {
    if (!onSelectionChangeRef.current) return;

    const currentSelectionString = [...selectedProductIds].sort().join(',');

    if (prevSelectionRef.current !== currentSelectionString) {
      prevSelectionRef.current = currentSelectionString;
      onSelectionChangeRef.current(selectedProductIds, selectedProducts);
    }
  }, [selectedProductIds, selectedProducts]);

  const handleEdit = (product: ProductWithPresentations) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const handleAddStock = (product: ProductWithPresentations) => {
    setAddStockDialogOpen(true);
  };

  const handleDelete = (product: ProductWithPresentations) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleShare = (product: ProductWithPresentations) => {
    setSharingProduct(product);
    setShareDialogOpen(true);
  };

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete();
    } else {
      setDeletingProducts(selectedProductIds);
      setDeleteProductsDialogOpen(true);
    }
  };

  const handleEditSuccess = () => {
    onProductUpdated?.();
  };

  const handleDeleteSuccess = () => {
    setRowSelection({});
    onProductUpdated?.();
  };

  const handleShareSuccess = () => {
    onProductUpdated?.();
  };

  return (
    <div className='w-full'>
      <div className='border bg-background rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={row.getIsSelected() ? 'bg-muted/50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No hay productos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de edición */}
      <EditProductDialog
        product={editingProduct}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Diálogo de ingreso de stock */}
      <AddStockDialog
        open={addStockDialogOpen}
        onOpenChange={setAddStockDialogOpen}
      />

      {/* Diálogo de eliminación individual */}
      <DeleteProductDialog
        product={deletingProduct}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      {/* Diálogo de eliminación múltiple (solo si no se pasa onBulkDelete) */}
      {!onBulkDelete && (
        <DeleteProductsDialog
          productIds={selectedProductIds}
          productNames={selectedProducts.map((p) => p.name)}
          open={deleteProductsDialogOpen}
          onOpenChange={setDeleteProductsDialogOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Diálogo de compartir stock */}
      <ShareProductDialog
        product={sharingProduct}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onSuccess={handleShareSuccess}
      />
    </div>
  );
}
