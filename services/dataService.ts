
import { BackupData, Ingredient, SKU, Supplier, Remito, AccountAdjustment, HRSettings, ExpenseCategory, ProductionLog, SupplierDocument } from '../types';
import { mockIngredients, mockSKUs, mockExpenses, mockStores, mockMaintenanceTasks, mockSuppliers } from './mockData';
import { isValidDateString } from './dateUtils';

const healData = (data: any, type: keyof BackupData): any[] => {
    if (!Array.isArray(data)) return [];
    const todayStr = () => new Date().toISOString().split('T')[0];
    switch (type) {
        case 'ingredients': return data.map(ing => ({ ...ing, priceHistory: Array.isArray(ing.priceHistory) ? ing.priceHistory.map((ph: any) => ({ ...ph, date: isValidDateString(ph.date) ? ph.date : todayStr() })) : [], quantityInStock: ing.quantityInStock ?? 0 }));
        case 'skus': return data.map(sku => ({ ...sku, recipe: Array.isArray(sku.recipe) ? sku.recipe : [], quantityInStock: sku.quantityInStock ?? 0, priceHistory: Array.isArray(sku.priceHistory) ? sku.priceHistory : [] }));
        case 'suppliers': return data.map(supplier => ({ ...supplier, contacts: Array.isArray(supplier.contacts) ? supplier.contacts : [], rating: supplier.rating ?? 0, notes: supplier.notes || '', mappingHistory: supplier.mappingHistory || {}, documents: Array.isArray(supplier.documents) ? supplier.documents.map((doc: any) => ({ ...doc, uploadDate: isValidDateString(doc.uploadDate) ? doc.uploadDate : todayStr(), dueDate: isValidDateString(doc.dueDate) ? doc.dueDate : todayStr(), paidAmount: doc.paidAmount ?? 0, status: doc.status || 'pending_review', expenseCategory: doc.expenseCategory || 'Proveedores' })) : [] }));
        case 'remitos': return data.map(remito => ({ ...remito, date: isValidDateString(remito.date) ? remito.date : todayStr(), status: remito.status || 'unpaid', paidAmount: remito.paidAmount ?? 0, discount: remito.discount ?? 0, items: Array.isArray(remito.items) ? remito.items : [] }));
        case 'accountAdjustments': return data.map(adj => ({ ...adj, date: isValidDateString(adj.date) ? adj.date : todayStr() }));
        default: return data;
    }
};

const loadData = <T extends any>(key: string, mockData: T, healKey?: keyof BackupData): T => {
    try {
        const saved = localStorage.getItem(`cvb_erp_${key}`);
        if(saved) {
            const parsed = JSON.parse(saved);
            return healKey ? healData(parsed, healKey) as T : parsed;
        }
        return mockData;
    } catch {
        return mockData;
    }
};

export const loadInitialData = () => {
    const data = {
        ingredients: loadData('ingredients', mockIngredients, 'ingredients'),
        skus: loadData('skus', mockSKUs, 'skus'),
        expenses: loadData('expenses', mockExpenses),
        expenseCategories: loadData('expense_categories', ['Salarios', 'Impuestos', 'Costos Operativos', 'Mantenimiento', 'Proveedores']) as ExpenseCategory[],
        stores: loadData('stores', mockStores),
        historicalSales: loadData('historicalSales', []),
        maintenanceTasks: loadData('maintenanceTasks', mockMaintenanceTasks),
        suppliers: loadData('suppliers', mockSuppliers, 'suppliers'),
        paymentOrders: loadData('paymentOrders', []),
        remitos: loadData('remitos', [], 'remitos'),
        payments: loadData('payments', []),
        accountAdjustments: loadData('accountAdjustments', [], 'accountAdjustments'),
        employees: loadData('employees', []),
        employeeCategories: loadData('employeeCategories', ['Producción', 'Administración', 'Logística', 'Ventas']),
        hrSettings: loadData('hrSettings', { socialContributionsPercentage: 30, employeeWithholdingPercentage: 17 }) as HRSettings,
        payrolls: loadData('payrolls', []),
        skuCategories: loadData('sku_categories', []) as string[],
        budgets: loadData('budgets', []),
        errorLogs: loadData('error_logs', []),
        productionLog: loadData('productionLog', []) as ProductionLog[],
    };

    if (data.skuCategories.length === 0) {
        const derivedFromMocks = Array.from(new Set(mockSKUs.map(s => s.category).filter(Boolean))).sort();
        data.skuCategories = derivedFromMocks.length > 0 ? derivedFromMocks : ['Viennoiserie', 'Panadería Artesanal', 'Repostería', 'Bebidas', 'Comidas'];
    }
    
    return data;
};

let debounceTimeout: number | null = null;

export const persistAllData = (dataToPersist: Record<string, any>) => {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }

    debounceTimeout = window.setTimeout(() => {
        Object.entries(dataToPersist).forEach(([key, value]) => {
            let storageKey = key;
            if (key === 'skuCategories') {
                storageKey = `sku_categories`;
            }
             if (key === 'errorLogs') {
                storageKey = `error_logs`;
            }
            localStorage.setItem(`cvb_erp_${storageKey}`, JSON.stringify(value));
        });
    }, 500);
};