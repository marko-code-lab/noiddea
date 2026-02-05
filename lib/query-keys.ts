/**
 * Query Keys Factory
 * Centraliza todas las keys de TanStack Query para mejor mantenimiento
 */

export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
  },

  // Business
  business: {
    all: ['business'] as const,
    detail: (id: string) => ['business', id] as const,
    current: ['business', 'current'] as const,
  },

  // Branches
  branches: {
    all: ['branches'] as const,
    byBusiness: (businessId: string) =>
      ['branches', 'business', businessId] as const,
    detail: (id: string) => ['branches', id] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    byBusiness: (businessId: string) =>
      ['products', 'business', businessId] as const,
    byBranch: (branchId: string) => ['products', 'branch', branchId] as const,
    detail: (id: string) => ['products', id] as const,
    search: (query: string) => ['products', 'search', query] as const,
  },

  // Suppliers
  suppliers: {
    all: ['suppliers'] as const,
    byBusiness: (businessId: string) =>
      ['suppliers', 'business', businessId] as const,
    detail: (id: string) => ['suppliers', id] as const,
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    byBranch: (branchId: string) => ['inventory', 'branch', branchId] as const,
    lowStock: (branchId: string) =>
      ['inventory', 'low-stock', branchId] as const,
    stats: (branchId: string) => ['inventory', 'stats', branchId] as const,
    detail: (branchId: string, presentationId: string) =>
      [
        'inventory',
        'branch',
        branchId,
        'presentation',
        presentationId,
      ] as const,
  },

  // Purchases
  purchases: {
    all: ['purchases'] as const,
    byBusiness: (businessId: string) =>
      ['purchases', 'business', businessId] as const,
    byBranch: (branchId: string) => ['purchases', 'branch', branchId] as const,
    detail: (id: string) => ['purchases', id] as const,
    stats: (businessId: string) => ['purchases', 'stats', businessId] as const,
  },

  // Sales
  sales: {
    all: ['sales'] as const,
    byBranch: (branchId: string) => ['sales', 'branch', branchId] as const,
    detail: (id: string) => ['sales', id] as const,
  },

  // Team/Users
  team: {
    all: ['team'] as const,
    byBusiness: (businessId: string) =>
      ['team', 'business', businessId] as const,
    managers: (businessId: string) => ['team', 'managers', businessId] as const,
    admins: (businessId: string) => ['team', 'admins', businessId] as const,
  },

  // Sessions
  sessions: {
    all: ['sessions'] as const,
    byBranch: (branchId: string) => ['sessions', 'branch', branchId] as const,
    byBusiness: (businessId: string) =>
      ['sessions', 'business', businessId] as const,
    detail: (id: string) => ['sessions', id] as const,
  },
} as const;
