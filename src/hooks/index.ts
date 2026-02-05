// Hooks de Supabase
export { useSupabase } from './use-supabase';
export { useAuth } from './use-auth';
export { useUser } from './use-user';
export { useBusiness } from './use-business';
export { useBranches } from './use-branches';
// useProducts ahora viene de use-products-query (TanStack Query)
// export { useProducts } from './use-products'; // Deshabilitado - usar TanStack Query
export { useSuppliers, useSupplier } from './use-suppliers';
export { usePurchases, usePurchase, usePurchaseStats } from './use-purchases';
export { useBranchUsers } from './use-branch-users';

// Hooks con TanStack Query (nuevos - preferidos)
export * from './use-products-query';
export * from './use-branches-query';
export * from './use-suppliers-query';
export * from './use-purchases-query';

// Re-exportar hooks de TanStack Query con nombres específicos
export { useCreateProduct, useUpdateProduct, useDeleteProduct, useProduct } from './use-products-query';

// Hooks de utilidad
export { useAsync } from './use-async';
export { useDebounce } from './use-debounce';

// Hook de contexto
export { useSelectedBranch } from './use-selected-branch';
export { useBusinessUsers } from './use-business-users';
