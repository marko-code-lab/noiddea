'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/app/actions';
import { queryKeys } from '@/lib/query-keys';
import type { ProductWithPresentations } from '@/types';
import type { CreateProductData } from './use-products';

/**
 * Hook para obtener productos usando TanStack Query
 * @param branchId - ID de la sucursal para filtrar productos (opcional)
 */
export function useProducts(branchId?: string) {
  return useQuery({
    queryKey: branchId
      ? queryKeys.products.byBranch(branchId)
      : queryKeys.products.all,
    queryFn: async () => {
      // Obtener TODOS los productos sin paginación
      const result = await getProducts(branchId, { limit: 10000 });
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener productos');
      }
      return result.products;
    },
    enabled: true,
  });
}

/**
 * Hook para crear producto
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (_, variables) => {
      // Invalidar todas las queries de productos
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      // Invalidar también la query específica del branch
      if (variables.branchId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.byBranch(variables.branchId) });
      }
    },
  });
}

/**
 * Hook para actualizar producto
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(productId, data),
    onSuccess: () => {
      // Invalidar todas las queries de productos sin forzar refetch inmediato
      // Esto mejora el rendimiento y evita recargas innecesarias
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.products.all,
        refetchType: 'none', // Solo marcar como stale, no refetch inmediato
      });
      // Invalidar todas las queries por branch también
      queryClient.invalidateQueries({ 
        queryKey: ['products', 'branch'],
        refetchType: 'none',
      });
    },
  });
}

/**
 * Hook para eliminar producto
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      // Invalidar todas las queries de productos
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      // Invalidar todas las queries por branch también
      queryClient.invalidateQueries({ queryKey: ['products', 'branch'] });
    },
  });
}

/**
 * Hook para obtener un producto específico
 * OPTIMIZADO: Usa getProductById para evitar consultas N+1
 */
export function useProduct(productId?: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId!),
    queryFn: async () => {
      // Importar getProductById dinámicamente para evitar circular dependencies
      const { getProductById } = await import('@/app/actions');
      const result = await getProductById(productId!);
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener producto');
      }
      if (!result.product) {
        throw new Error('Producto no encontrado');
      }
      return result.product;
    },
    enabled: !!productId,
    // Cache más largo para productos individuales (cambian menos frecuentemente)
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}
