/**
 * Custom hook para gestionar productos por sucursal
 */

import { useCallback } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/app/actions';
import { useAsync } from './use-async';
import type { ProductWithPresentations } from '@/src/types';

export interface CreateProductData {
  branchId: string;
  name: string;
  description?: string;
  expiration?: string; // ISO date string (timestampz)
  brand?: string;
  barcode?: string;
  sku?: string;
  cost: number;      // Costo general
  price: number;     // Precio base
  stock?: number;    // Stock inicial (opcional, default 0)
  bonification?: number;    // Bonificación (opcional, default 0)
  // Presentaciones adicionales (la variante "unidad" se crea automáticamente)
  presentations: Array<{
    variant: string;  // tipo: pack, blister, caja, sixpack, docena, pallet
    units: number;    // cuántas unidades incluye
    price: number;    // precio específico de esta variante (requerido para adicionales)
  }>;
}

/**
 * Hook para gestionar productos
 * @param branchId - ID de la sucursal para filtrar productos
 */
export function useProducts(branchId?: string) {
  const {
    data: productsData,
    isLoading,
    error,
    execute: fetchProductsBase,
  } = useAsync<
    {
      success: boolean;
      products: ProductWithPresentations[];
      error?: string;
    },
    [string?]
  >(getProducts, { immediate: false });

  const { isLoading: creating, execute: executeCreate } = useAsync<
    { success: boolean; error?: string; productId?: string; productName?: string },
    [CreateProductData]
  >(createProduct, { immediate: false });

  const { isLoading: updating, execute: executeUpdate } = useAsync<
    { success: boolean; error?: string },
    [string, Record<string, unknown>]
  >(updateProduct, { immediate: false });

  const { isLoading: deleting, execute: executeDelete } = useAsync<
    { success: boolean; error?: string },
    [string]
  >(deleteProduct, { immediate: false });

  const products = productsData?.products || [];

  // Función para obtener productos, pasando el branchId si existe
  const fetchProducts = useCallback(() => {
    if (branchId) {
      return fetchProductsBase(branchId);
    }
    return fetchProductsBase();
  }, [fetchProductsBase, branchId]);

  // Crear producto y refrescar lista
  const create = useCallback(
    async (data: CreateProductData) => {
      try {
        const result = await executeCreate(data);
        if (result?.success) {
          // Refrescar la lista de productos después de crear
          await fetchProducts();
        }
        return result;
      } catch (error) {
        console.error('Error creating product:', error);
        return { success: false, error: 'Error inesperado al crear producto' };
      }
    },
    [executeCreate, fetchProducts]
  );

  // Actualizar producto y refrescar lista
  const update = useCallback(
    async (productId: string, data: Partial<Omit<CreateProductData, 'branchId' | 'presentations'>>) => {
      try {
        const result = await executeUpdate(productId, data);
        if (result?.success) {
          // Refrescar la lista de productos después de actualizar
          await fetchProducts();
        }
        return result;
      } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: 'Error inesperado al actualizar producto' };
      }
    },
    [executeUpdate, fetchProducts]
  );

  // Eliminar producto y refrescar lista
  const remove = useCallback(
    async (productId: string) => {
      try {
        const result = await executeDelete(productId);
        if (result?.success) {
          // Refrescar la lista de productos después de eliminar
          await fetchProducts();
        }
        return result;
      } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: 'Error inesperado al eliminar producto' };
      }
    },
    [executeDelete, fetchProducts]
  );

  return {
    // Datos
    products,

    // Estados de carga
    loading: isLoading,
    isLoading,
    creating,
    updating,
    deleting,

    // Error
    error,

    // Acciones
    fetchProducts,
    createProduct: create,
    updateProduct: update,
    deleteProduct: remove,
  };
}
