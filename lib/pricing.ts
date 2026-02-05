/**
 * Utilidades para cálculo de precios con overrides por sucursal
 */

import type { ProductPresentation } from '@/src/types';

/**
 * Calcula el precio final de venta
 * Usa el precio de la presentación directamente (el inventario ya no existe)
 */
export function getFinalPrice(
  presentation: ProductPresentation
): number {
  return presentation.price ?? 0;
}

/**
 * Calcula el costo final de compra
 * Nota: product_presentations no tiene columna cost, se debe obtener desde otra fuente
 */
export function getFinalCost(
  presentation: ProductPresentation,
  cost?: number
): number {
  return cost ?? 0;
}

/**
 * Calcula el margen de ganancia
 */
export function getProfit(
  presentation: ProductPresentation,
  cost?: number
): number {
  const price = getFinalPrice(presentation);
  const finalCost = getFinalCost(presentation, cost);
  return price - finalCost;
}

/**
 * Calcula el porcentaje de margen
 */
export function getProfitMargin(
  presentation: ProductPresentation,
  cost?: number
): number {
  const price = getFinalPrice(presentation);
  const finalCost = getFinalCost(presentation, cost);

  if (finalCost === 0) return 0;

  return ((price - finalCost) / finalCost) * 100;
}

/**
 * Verifica si el producto tiene precio personalizado en la sucursal
 * Nota: Ya no hay inventario, así que siempre retorna false
 */
export function hasCustomPricing(): boolean {
  return false;
}
