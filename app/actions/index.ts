/**
 * Server Actions - Exportaciones centralizadas
 */

// Auth actions
export * from './auth-actions';

// Business actions
export * from './business-actions';

// Branch actions
export * from './branch-actions';

// User actions
export * from './user-actions';

// Product actions
export * from './product-actions';
export { 
  importProductsFromExcel, 
  generateExcelTemplate, 
  exportProductsToExcel,
  getProductById 
} from './product-actions';
// NOTE: product-actions-simple.ts exists but is not currently used
// export * from './product-actions-simple';

// Supplier actions
export * from './supplier-actions';

// Purchase actions
export * from './purchase-actions';

// Presentation actions
export * from './presentation-actions';

// Session actions
export * from './session-actions';

// Dashboard actions
export * from './dashboard-actions';
