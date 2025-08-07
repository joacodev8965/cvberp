export interface PriceHistoryItem {
  id: string; // Unique ID for each price entry
  date: string; // YYYY-MM-DD
  cost: number;
  supplierId: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  priceHistory: PriceHistoryItem[];
  quantityInStock: number;
  purchaseUnit?: string; // e.g., 'Caja', 'Pack'
  unitsPerPackage?: number; // e.g., 6
  minStock?: number;
  maxStock?: number;
}

export interface AnalyzedItem {
    id: string;
    productName: string;
    quantity: number; // This will represent the UNIT quantity after calculation
    unitPrice: number; // This will represent the UNIT price after calculation
    packageQuantity?: number;
    packagePrice?: number;
    matchType: 'ingredient' | 'sku' | null;
    matchedId: string | null;
}

export interface SupplierContact {
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
}

export interface SupplierDocument {
    id: string;
    fileName: string;
    fileType: string;
    uploadDate: string; // YYYY-MM-DD
    dueDate: string; // YYYY-MM-DD
    status: 'pending_review' | 'approved' | 'in_payment_order' | 'partially_paid' | 'paid' | 'error' | 'processing';
    content: string; // base64
    extractedItems?: AnalyzedItem[];
    totalAmount?: number;
    paidAmount: number;
    expenseCategory: ExpenseCategory;
    paymentOrderId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string; // Main contact, can be deprecated
  phone?: string; // Main phone, can be deprecated
  contacts?: SupplierContact[];
  taxId?: string;
  paymentTerms?: string;
  deliveryInfo?: string;
  documents: SupplierDocument[];
  mappingHistory: Record<string, { matchType: 'ingredient' | 'sku'; matchedId: string; }>;
  rating?: number; // 1-5
  notes?: string;
}

export interface PaymentOrder {
    id: string;
    creationDate: string; // YYYY-MM-DD
    paymentDate: string; // YYYY-MM-DD
    status: 'paid'; // Status is simplified as it's recorded post-payment.
    documents: { supplierId: string, documentId: string, amount: number }[];
    totalAmount: number;
    paymentMethod: string;
    reference?: string;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface SKU {
  id:string;
  name: string;
  category: string;
  recipe: RecipeItem[];
  wastageFactor: number; // e.g., 0.05 for 5%
  laborCost: number; // cost per unit
  overheadCost: number; // cost per unit
  franchiseFee: number; // cost per unit
  salePrice: number;
  calculatedCost?: number; // Optional, can be calculated on the fly
  quantityInStock: number;
  purchaseUnit?: string;
  unitsPerPackage?: number;
  minStock?: number;
  maxStock?: number;
  priceHistory: PriceHistoryItem[];
}

export enum Page {
  DASHBOARD = 'dashboard',
  SKUS = 'skus',
  INGREDIENTS = 'ingredients',
  RECIPE_CALCULATOR = 'recipe_calculator',
  PRODUCTION_PLAN = 'production_plan',
  MAINTENANCE = 'maintenance',
  WHOLESALE = 'wholesale',
  STRUCTURE = 'structure',
  SIMULATION = 'simulation',
  LOCATIONS_SALES = 'locations_sales',
  INGREDIENT_USAGE_REPORT = 'ingredient_usage_report',
  MENU_ENGINEERING = 'menu_engineering',
  PRICING_ENGINE = 'pricing_engine',
  TRANSACTION_ANALYSIS = 'transaction_analysis',
  BACKUP_RESTORE = 'backup_restore',
  LOGISTICS = 'logistics',
  COLLECTIONS = 'collections',
  HUMAN_RESOURCES = 'human_resources',
  SEVERANCE_CALCULATOR = 'severance_calculator',
}

export type ExpenseCategory = string;

export interface ExpenseItem {
    id: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    date: string; // YYYY-MM-DD
    type: 'fixed' | 'variable';
    sourceDocumentId?: string; // Link to the supplier document
    supplierId?: string;
    supplierName?: string;
}

export interface Budget {
    id: string; // e.g., '2025-08-Salarios'
    monthYear: string; // YYYY-MM
    category: ExpenseCategory;
    amount: number;
}


export interface SalesReportData {
    productName: string;
    quantitySold: number;
    unitPrice: number;
    totalRevenue: number;
}

export interface SalesSummary {
    totalRevenue: number;
    totalUnitsSold: number;
    bestSellingProduct: {
        name: string;
        unitsSold: number;
    };
}

export interface Store {
  id: string;
  name: string;
  address: string;
  paymentTerms: number; // Net days (e.g., 15, 30, 60)
}

export interface HistoricalSale {
    id: string;
    storeId: string;
    datetime: string; // YYYY-MM-DDTHH:mm:ss
    skuName: string; 
    quantity: number;
    unitPrice: number;
}

export interface MaintenanceTask {
  id: string;
  equipmentName: string;
  description: string;
  frequencyDays: number;
  lastCompleted: string; // YYYY-MM-DD
}

// Wholesale & Collections Types
export interface WholesaleOrderItem {
    skuName: string;
    quantity: number;
}

export interface WholesaleOrder {
    storeName: string;
    date: string; // YYYY-MM-DD
    items: WholesaleOrderItem[];
}

export type PaymentMethod = 'Efectivo' | 'Transferencia';

export interface PaymentAllocation {
    remitoId: string;
    amount: number;
}

export interface Payment {
    id: string;
    storeId: string;
    date: string; // YYYY-MM-DD
    amount: number;
    method: PaymentMethod;
    allocations: PaymentAllocation[];
}

export interface AccountAdjustment {
    id: string;
    storeId: string;
    date: string;
    description: string;
    amount: number; // Positive for charge, negative for credit
}

export interface ProductionPlanItem {
    skuId: string;
    skuName: string;
    category: string;
    totalQuantity: number;
}

export interface RemitoItem {
    skuId: string;
    skuName: string;
    quantity: number;
    unitPrice: number;
    ivaRate: number; // e.g., 21 for 21%
    discountPercentage: number;
}

export interface Remito {
    id: string; // storeName-date
    storeName: string;
    date: string; // YYYY-MM-DD
    items: RemitoItem[];
    // Collections-related fields
    status: 'unpaid' | 'partially_paid' | 'paid';
    paidAmount: number;
    discount: number; // A global discount on the remito
}

// Human Resources Types
export interface EmployeeDocument {
    id: string;
    fileName: string;
    fileType: string;
    uploadDate: string;
    content: string; // base64
}

export interface Employee {
    id: string;
    name: string;
    category: string;
    netSalary: number;
    nonTaxableBonus: number;
    registeredPercentage: number; // 0-100
    documents: EmployeeDocument[];
}

export interface HRSettings {
    socialContributionsPercentage: number; // e.g., 30 for 30%
    employeeWithholdingPercentage: number; // e.g., 17 for 17%
}

export interface PayrollAdjustment {
  id: string;
  type: 'addition' | 'deduction';
  description: string;
  amount: number;
}

export interface EmployeePayroll {
  employeeId: string;
  baseSalary: number; // net salary at time of calculation
  nonTaxableBonus: number;
  registeredPercentage: number;
  adjustments: PayrollAdjustment[];
  grossPay: number;
  withholdings: number;
  netPay: number;
  employerContributions: number;
  totalLaborCost: number;
}

export interface Payroll {
  monthYear: string; // YYYY-MM
  employeePayrolls: EmployeePayroll[];
}

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  type: 'error' | 'rejection';
}

export interface ProductionLog {
    date: string; // YYYY-MM-DD
    status: 'Pendiente' | 'Producido';
    producedItems: { skuId: string; quantity: number }[];
}


export interface BackupData {
  version: string;
  createdAt: string;
  skus: SKU[];
  ingredients: Ingredient[];
  expenses: ExpenseItem[];
  expenseCategories?: string[];
  stores: Store[];
  historicalSales: HistoricalSale[];
  maintenanceTasks: MaintenanceTask[];
  suppliers: Supplier[];
  remitos: Remito[];
  payments: Payment[];
  accountAdjustments: AccountAdjustment[];
  // HR Data
  employees?: Employee[];
  employeeCategories?: string[];
  hrSettings?: HRSettings;
  payrolls?: Payroll[];
  budgets?: Budget[];
  paymentOrders?: PaymentOrder[];
  errorLogs?: ErrorLog[];
  sku_categories?: string[];
  productionLog?: ProductionLog[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type: ToastType) => void;
}


// --- App Context ---
export interface AppContextType {
    // State
    skus: SKU[]; setSkus: React.Dispatch<React.SetStateAction<SKU[]>>;
    ingredients: Ingredient[]; setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
    expenses: ExpenseItem[]; setExpenses: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
    expenseCategories: ExpenseCategory[]; setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    stores: Store[]; setStores: React.Dispatch<React.SetStateAction<Store[]>>;
    historicalSales: HistoricalSale[]; setHistoricalSales: React.Dispatch<React.SetStateAction<HistoricalSale[]>>;
    maintenanceTasks: MaintenanceTask[]; setMaintenanceTasks: React.Dispatch<React.SetStateAction<MaintenanceTask[]>>;
    suppliers: Supplier[]; setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    remitos: Remito[]; setRemitos: React.Dispatch<React.SetStateAction<Remito[]>>;
    payments: Payment[]; setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
    accountAdjustments: AccountAdjustment[]; setAccountAdjustments: React.Dispatch<React.SetStateAction<AccountAdjustment[]>>;
    employees: Employee[]; setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    employeeCategories: string[]; setEmployeeCategories: React.Dispatch<React.SetStateAction<string[]>>;
    hrSettings: HRSettings; setHrSettings: React.Dispatch<React.SetStateAction<HRSettings>>;
    payrolls: Payroll[]; setPayrolls: React.Dispatch<React.SetStateAction<Payroll[]>>;
    budgets: Budget[]; setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
    paymentOrders: PaymentOrder[]; setPaymentOrders: React.Dispatch<React.SetStateAction<PaymentOrder[]>>;
    errorLogs: ErrorLog[]; setErrorLogs: React.Dispatch<React.SetStateAction<ErrorLog[]>>;
    skuCategories: string[]; setSkuCategories: React.Dispatch<React.SetStateAction<string[]>>;
    productionLog: ProductionLog[]; setProductionLog: React.Dispatch<React.SetStateAction<ProductionLog[]>>;

    // Handlers
    addIngredient: (ingredient: Omit<Ingredient, 'id' | 'priceHistory' | 'quantityInStock'>) => Ingredient;
    updateIngredient: (updatedIng: Ingredient) => void;
    deleteIngredient: (ingredientId: string) => void;
    addSupplier: (supplier: Omit<Supplier, 'id' | 'documents' | 'mappingHistory'>) => void;
    updateSupplier: (updatedSup: Supplier) => void;
    deleteSupplier: (supplierId: string) => void;
    addDocument: (supplierId: string, doc: Omit<SupplierDocument, 'id'>) => SupplierDocument;
    updateDocument: (supplierId: string, doc: SupplierDocument) => void;
    deleteDocument: (supplierId: string, documentId: string) => void;
    confirmInvoiceData: (supplierId: string, documentId: string, confirmedItems: AnalyzedItem[], expenseCategory: ExpenseCategory, dueDate: string) => void;
    addManualPurchase: (data: { itemType: 'sku' | 'ingredient'; itemId: string; quantity: number; unitCost: number, supplierId: string }) => void;
    addSku: (sku: Omit<SKU, 'id' | 'quantityInStock' | 'priceHistory'>) => SKU;
    updateSku: (updatedSku: SKU) => void;
    addRemitos: (newRemitos: Remito[]) => void;
    updateRemito: (updatedRemito: Remito, originalRemito: Remito) => void;
    deleteRemito: (remitoId: string) => void;
    addPayment: (payment: Omit<Payment, 'id'>) => void;
    addAccountAdjustment: (adjustment: Omit<AccountAdjustment, 'id'>) => void;
    updateEmployee: (updatedEmployee: Employee) => void;
    processPaymentOrder: (order: Omit<PaymentOrder, 'id'>) => void;
    confirmProductionBatch: (date: string, itemsToProduce: ProductionPlanItem[], originalPlan: ProductionPlanItem[]) => boolean;
    produceForStock: (itemsToProduce: { skuId: string; quantity: number }[]) => boolean;

    // Derived State/Helpers
    getLatestIngredientCost: (ingredient: Ingredient) => number;
    skusWithCalculatedCost: SKU[];
}

export interface AnalysisFinding {
  id: string;
  category: 'Configuración del Entorno' | 'Integridad de Datos' | 'Lógica de Negocio' | 'Salud del Código';
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
}