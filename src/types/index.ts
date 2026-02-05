// Exportar todos los tipos de Supabase
export * from './supabase';
import type { Database } from './supabase';

// Tipos auxiliares para trabajar con las tablas
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// ============================================
// Tipos de Base de Datos
// ============================================

// Tablas principales
export type User = Tables<'users'>;
export type Business = Tables<'businesses'>;
export type Branch = Tables<'branches'>;
export type Supplier = Tables<'suppliers'>;
export type BusinessUser = Tables<'businesses_users'>;
export type BranchUser = Tables<'branches_users'>;

// Productos e Inventario
export type Product = Tables<'products'>;
export type ProductPresentation = Tables<'product_presentations'>;

// Ventas
export type Sale = Tables<'sales'>;
export type SaleItem = Tables<'sale_items'>;

// Compras
export type Purchase = Tables<'purchases'>;
export type PurchaseItem = Tables<'purchase_items'>;

// Tipos para inserción
export type UserInsert = TablesInsert<'users'>;
export type BusinessInsert = TablesInsert<'businesses'>;
export type BranchInsert = TablesInsert<'branches'>;
export type SupplierInsert = TablesInsert<'suppliers'>;
export type BusinessUserInsert = TablesInsert<'businesses_users'>;
export type BranchUserInsert = TablesInsert<'branches_users'>;
export type ProductInsert = TablesInsert<'products'>;
export type ProductPresentationInsert = TablesInsert<'product_presentations'>;
export type SaleInsert = TablesInsert<'sales'>;
export type SaleItemInsert = TablesInsert<'sale_items'>;
export type PurchaseInsert = TablesInsert<'purchases'>;
export type PurchaseItemInsert = TablesInsert<'purchase_items'>;

// Tipos para actualización
export type UserUpdate = TablesUpdate<'users'>;
export type BusinessUpdate = TablesUpdate<'businesses'>;
export type BranchUpdate = TablesUpdate<'branches'>;
export type SupplierUpdate = TablesUpdate<'suppliers'>;
export type BusinessUserUpdate = TablesUpdate<'businesses_users'>;
export type BranchUserUpdate = TablesUpdate<'branches_users'>;
export type ProductUpdate = TablesUpdate<'products'>;
export type ProductPresentationUpdate = TablesUpdate<'product_presentations'>;
export type SaleUpdate = TablesUpdate<'sales'>;
export type SaleItemUpdate = TablesUpdate<'sale_items'>;
export type PurchaseUpdate = TablesUpdate<'purchases'>;
export type PurchaseItemUpdate = TablesUpdate<'purchase_items'>;

// Enums
export type BusinessUserRole = Enums<'business_user_role'>;
export type BranchUserRole = Enums<'branch_user_role'>;
export type PaymentMethod = Enums<'payment_method_enum'>;
export type SaleStatus = Enums<'sale_status_enum'>;

// ============================================
// Tipos Extendidos
// ============================================

// Usuario con información adicional de la relación business/branch
export interface UserWithBusiness extends User {
  business_user?: BusinessUser & {
    business?: Business;
  };
}

export interface UserWithBranch extends User {
  branch_user?: BranchUser & {
    branch?: Branch;
  };
}

// Business con sus usuarios y sucursales
export interface BusinessWithRelations extends Business {
  business_users?: (BusinessUser & { user?: User })[];
  branches?: Branch[];
}

// Branch con sus usuarios y proveedores
export interface BranchWithRelations extends Branch {
  branch_users?: (BranchUser & { user?: User })[];
  suppliers?: Supplier[];
  business?: Business;
}

// BranchUser con información del usuario
export interface BranchUserWithUser extends BranchUser {
  user?: User;
}

// Producto con sus presentaciones
export interface ProductWithPresentations extends Product {
  product_presentations?: ProductPresentation[];
  business?: Business;
  created_by_branch?: Branch;
  created_by_user?: User;
}

// Presentación de producto con información adicional
export interface ProductPresentationWithProduct extends ProductPresentation {
  product?: Product;
}

// Venta con items y relaciones
export interface SaleWithItems extends Sale {
  sale_items?: (SaleItem & {
    product_presentation?: ProductPresentation & {
      product?: Product;
    };
  })[];
  branch?: Branch;
  user?: User;
}

// Compra con items y relaciones
export interface PurchaseWithItems extends Purchase {
  purchase_items?: (PurchaseItem & {
    product_presentation?: ProductPresentation & {
      product?: Product;
    };
  })[];
  supplier?: Supplier;
  business?: Business;
  branch?: Branch;
  created_by_user?: User;
  approved_by_user?: User;
}

// ============================================
// Tipos de API
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// ============================================
// Tipos de Paginación
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// Tipos de Filtros
// ============================================

export interface FilterParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export interface SupplierFilters extends FilterParams {
  branchId?: string;
}

export interface UserFilters extends FilterParams {
  role?: BusinessUserRole | BranchUserRole;
  businessId?: string;
  branchId?: string;
}

export interface ProductFilters extends FilterParams {
  businessId?: string;
  branchId?: string;
  brand?: string;
}

export interface SaleFilters extends FilterParams {
  branchId?: string;
  userId?: string;
  paymentMethod?: PaymentMethod;
  salesStatus?: SaleStatus;
}

export interface PurchaseFilters extends FilterParams {
  businessId?: string;
  branchId?: string;
  supplierId?: string;
  purchaseStatus?: string;
  type?: string;
}

// ============================================
// Tipos de Estadísticas y Reportes
// ============================================

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByPaymentMethod: Record<PaymentMethod, number>;
  salesByStatus: Record<SaleStatus, number>;
  topSellingProducts: {
    product: ProductPresentation;
    quantity: number;
    revenue: number;
  }[];
}

export interface ProductStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
}

export interface PurchaseStats {
  totalPurchases: number;
  totalSpent: number;
  averagePurchaseValue: number;
  purchasesBySupplier: Record<string, number>;
  pendingPurchases: number;
}

export interface DashboardStats {
  sales: SalesStats;
  products: ProductStats;
  purchases: PurchaseStats;
}

// ============================================
// Tipos de Formularios
// ============================================

export interface CreateSaleForm {
  branchId: string;
  userId: string;
  customer?: string;
  paymentMethod: PaymentMethod;
  items: {
    productPresentationId: string;
    quantity: number;
    unitPrice: number;
    bonus?: number;
  }[];
}

export interface CreatePurchaseForm {
  businessId: string;
  branchId?: string;
  supplierId: string;
  type: string;
  notes?: string;
  items: {
    productPresentationId: string;
    quantity: number;
    unitCost: number;
  }[];
}

export interface CreateProductForm {
  businessId: string;
  name: string;
  description?: string;
  expiration?: string; // ISO date string (timestampz)
  brand?: string;
  barcode?: string;
  sku?: string;
  presentations: {
    name: string;
    unit?: string;
    cost?: number;
    price?: number;
    barcode?: string;
    sku?: string;
  }[];
}
