import type { Ingredient, SKU, ExpenseItem, Store, MaintenanceTask, Supplier } from '../types';

export const mockSuppliers: Supplier[] = [
  { 
    id: 'sup-1', 
    name: 'Harinas del Sur', 
    contactPerson: 'Juan Perez', 
    phone: '111-222-3333', 
    taxId: '20-12345678-9', 
    paymentTerms: '30 días', 
    deliveryInfo: 'Entregas Lunes y Jueves', 
    mappingHistory: {},
    documents: [
      {
        id: 'doc-mock-1',
        fileName: 'factura_julio_2024.pdf',
        fileType: 'application/pdf',
        uploadDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0], // Last month
        status: 'approved',
        content: 'mock-b64-content', // Placeholder
        extractedItems: [
          { id: 'item-mock-1', productName: 'Harina 000', quantity: 50, unitPrice: 1.20, matchType: 'ingredient', matchedId: 'flour' },
          { id: 'item-mock-2', productName: 'Levadura Seca 500g', quantity: 10, unitPrice: 2.50, matchType: 'ingredient', matchedId: 'yeast' }
        ],
        totalAmount: (50 * 1.20) + (10 * 2.50),
        dueDate: new Date().toISOString().split('T')[0],
        expenseCategory: 'Proveedores',
        paidAmount: 0,
      },
      {
        id: 'doc-mock-2',
        fileName: 'remito_actual.pdf',
        fileType: 'application/pdf',
        uploadDate: new Date().toISOString().split('T')[0], // This month
        status: 'approved',
        content: 'mock-b64-content',
        extractedItems: [
          { id: 'item-mock-3', productName: 'Harina 000', quantity: 25, unitPrice: 1.25, matchType: 'ingredient', matchedId: 'flour' },
        ],
        totalAmount: 25 * 1.25,
        dueDate: new Date().toISOString().split('T')[0],
        expenseCategory: 'Proveedores',
        paidAmount: 0,
      }
    ] 
  },
  { id: 'sup-2', name: 'Lácteos Andinos', contactPerson: 'Ana Gomez', phone: '444-555-6666', taxId: '27-87654321-5', paymentTerms: '15 días', deliveryInfo: 'Pedido con 48hs de antelación', documents: [], mappingHistory: {} },
  { id: 'sup-3', name: 'Dulce Caña', contactPerson: 'Carlos Ruiz', phone: '777-888-9999', taxId: '30-11223344-7', paymentTerms: 'Contado', deliveryInfo: 'Entregas diarias', documents: [], mappingHistory: {} },
  { id: 'sup-4', name: 'Granja Feliz', contactPerson: 'Maria Sol', phone: '123-456-7890', taxId: '27-22334455-6', paymentTerms: 'Contado', deliveryInfo: 'Entregas Martes', documents: [], mappingHistory: {} },
  { id: 'sup-5', name: 'Cacao Real', contactPerson: 'Luis Fonzi', phone: '987-654-3210', taxId: '30-33445566-8', paymentTerms: '60 días', deliveryInfo: 'Entregas quincenales', documents: [], mappingHistory: {} },
];

export const mockIngredients: Ingredient[] = [
  { 
    id: 'flour', name: 'Harina', unit: 'kg', 
    quantityInStock: 50,
    priceHistory: [
      { id: 'ph-1', date: '2024-07-20', cost: 1.20, supplierId: 'sup-1' },
      { id: 'ph-2', date: '2024-06-15', cost: 1.15, supplierId: 'sup-1' },
    ]
  },
  { 
    id: 'sugar', name: 'Azúcar', unit: 'kg',
    quantityInStock: 25,
    priceHistory: [
      { id: 'ph-3', date: '2024-07-18', cost: 1.50, supplierId: 'sup-3' },
    ]
  },
  { 
    id: 'butter', name: 'Mantequilla', unit: 'kg',
    quantityInStock: 10,
    priceHistory: [
      { id: 'ph-4', date: '2024-07-21', cost: 8.50, supplierId: 'sup-2' },
      { id: 'ph-5', date: '2024-07-01', cost: 8.25, supplierId: 'sup-2' },
    ]
  },
  {
    id: 'egg', name: 'Huevo', unit: 'unidad',
    quantityInStock: 120,
    priceHistory: [
      { id: 'ph-6', date: '2024-07-21', cost: 0.25, supplierId: 'sup-4' },
    ]
  },
  { 
    id: 'yeast', name: 'Levadura', unit: 'g',
    quantityInStock: 500,
    priceHistory: [
      { id: 'ph-7', date: '2024-07-15', cost: 0.05, supplierId: 'sup-1' },
    ]
  },
  { 
    id: 'chocolate', name: 'Chocolate Chips', unit: 'kg',
    quantityInStock: 5,
    priceHistory: [
      { id: 'ph-8', date: '2024-07-19', cost: 12.00, supplierId: 'sup-5' },
    ]
  },
];

const wholesaleProducts: [string, string][] = [
    ['ZEPELIN DE MASA BLANCO', 'BOULANGERIE'],
    ['ZEPELIN DE MASA MADRE INTEGRAL', 'BOULANGERIE'],
    ['PAN CENTENO 30%', 'BOULANGERIE'],
    ['PAN CENTENO 100%', 'BOULANGERIE'],
    ['BAGUETIN INTEGRAL', 'BOULANGERIE'],
    ['BAGUETIN BLANCO', 'BOULANGERIE'],
    ['BAGUETTE BLANCO', 'BOULANGERIE'],
    ['BAGUETTE INTEGRAL', 'BOULANGERIE'],
    ['CIABATTA', 'BOULANGERIE'],
    ['CIABATTA PIZZA', 'BOULANGERIE'],
    ['CREMONA', 'BOULANGERIE'],
    ['FOCACCIA RELLENA', 'BOULANGERIE'],
    ['FOCACCIA CON POMODORO Y PESTO DE ALBAHACA', 'BOULANGERIE'],
    ['CROISSANTS', 'VIENNOISERIE'],
    ['CROISSANT CON ALMENDRAS', 'VIENNOISERIE'],
    ['CHAUSSON DE MANZANA', 'VIENNOISERIE'],
    ['MEDIALUNAS INTEGRALES', 'VIENNOISERIE'],
    ['MEDIALUNAS DE GRASA SIN GRASA', 'VIENNOISERIE'],
    ['MEDIALUNA NOT MANTECA', 'VIENNOISERIE'],
    ['MEDIALUNA INTEGRAL CON CREMA DE DULCE DE LECHE', 'VIENNOISERIE'],
    ['MEDIALUNA INTEGRAL CON CREMA DE CAFÉ Y PISTACHO', 'VIENNOISERIE'],
    ['MEDIALUNA INTEGRAL CON CREMA PASTELERA', 'VIENNOISERIE'],
    ['MEDIALUNA INTEGRAL CON CREMA DE CHOCOLATE', 'VIENNOISERIE'],
    ['BROWNIE', 'VIENNOISERIE'],
    ['PAIN AU CHOCOLAT', 'VIENNOISERIE'],
    ['ROL DE ARÁNDANOS', 'VIENNOISERIE'],
    ['CINNAMON ROLL', 'VIENNOISERIE'],
    ['SCON DE QUESO', 'VIENNOISERIE'],
    ['ALFAJOR DE DULCE DE LECHE', 'VIENNOISERIE'],
    ['PEPAS DE CHÍA', 'VIENNOISERIE'],
    ['TORTITA NEGRA', 'VIENNOISERIE'],
    ['LIBRITO', 'VIENNOISERIE'],
    ['BUDÍN DE ZANAHORIA', 'BUDINES Y TORTAS'],
    ['BUDÍN DE BANANA', 'BUDINES Y TORTAS'],
    ['BUDÍN DE MANZANA Y PERA', 'BUDINES Y TORTAS'],
    ['10 CM APPLE CRUMBLE', 'BUDINES Y TORTAS'],
    ['10 CM ALFACOOKIE CON CREMA', 'BUDINES Y TORTAS'],
    ['14 CM ALFACOOKIE CON CREMA', 'BUDINES Y TORTAS'],
    ['14 CM TORTA CHOCO, CREMA Y DDL', 'BUDINES Y TORTAS'],
    ['TRUFA DE CHOCOLATE', 'BUDINES Y TORTAS'],
    ['BARRITA DE CHOCOLATE, JENGIBRE Y NARANJA', 'BUDINES Y TORTAS'],
    ['PAN DE MOLDE DE PAPA', 'PANES DE MOLDE – NO EMPAQUETADO'],
    ['PAN DE MOLDE BLANCO', 'PANES DE MOLDE – NO EMPAQUETADO'],
    ['PAN DE MOLDE INTEGRAL', 'PANES DE MOLDE – NO EMPAQUETADO'],
    ['BAGELS', 'PANES DE BURGER – NO EMPAQUETADO'],
    ['PAN DE BURGER CON QUESO GRATINADO', 'PANES DE BURGER – NO EMPAQUETADO'],
    ['PAN DE BURGER INTEGRAL', 'PANES DE BURGER – NO EMPAQUETADO'],
    ['CRACKERS DE SEMILLAS', 'PANES DE BURGER – NO EMPAQUETADO'],
    ['PREPIZZA DE MASA MADRE CON POMODORO', 'PIZZAS'],
    ['PREPIZZA DE MASA MADRE CON QUESO VEGANO DE CASTAÑAS', 'PIZZAS'],
    ['ENSALADA FALAFEL', 'ENSALADAS'],
    ['BURRITO', 'WRAPS'],
    ['VERDURAS', 'EMPANADAS'],
    ['CRIOLLA', 'EMPANADAS'],
    ['PUERROS', 'TARTAS'],
    ['CALABAZA', 'TARTAS'],
    ['SANDWICH BURGER', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['SANDWICH CAPRESSE', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['MALFATTI', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['DIPS RANCHERA SPICY', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['DIPS MAYONESA DE AJO Y CILANTRO', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['GNOCCHI DE PAPA 500 GR', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['GNOCCHI DE ESPINACA 500 GR', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['RAVIOLES DE VERDURA x1 plancha', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['RAVIOLES DE CALABAZA x1 plancha', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
    ['SALSA FILETTO 400 GR', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
];

const generatedSkus: SKU[] = wholesaleProducts.map((p, i) => {
    const name = p[0];
    const category = p[1];
    
    // Assign a fictitious cost based on a simple algorithm for consistency
    const cost = 1.0 + ((name.length * 13) % 451) / 100; // Cost between $1.00 and $5.50
    
    let recipe: SKU['recipe'] = [];
    // Add simple recipes for some items to make the app more realistic
    if (name === 'CROISSANTS') {
        recipe = [
            { ingredientId: 'flour', quantity: 0.1 },
            { ingredientId: 'butter', quantity: 0.05 },
            { ingredientId: 'sugar', quantity: 0.02 },
        ];
    } else if (name === 'BAGUETTE BLANCO') {
        recipe = [
            { ingredientId: 'flour', quantity: 0.3 },
            { ingredientId: 'yeast', quantity: 3 },
        ];
    } else if (name === 'BROWNIE') {
        recipe = [
            { ingredientId: 'chocolate', quantity: 0.05 },
            { ingredientId: 'flour', quantity: 0.06 },
            { ingredientId: 'sugar', quantity: 0.08 },
            { ingredientId: 'butter', quantity: 0.04 },
            { ingredientId: 'egg', quantity: 1 },
        ];
    }

    const isManufactured = recipe.length > 0;

    return {
        id: `sku-wholesale-${i}`,
        name: name,
        category: category,
        recipe: recipe,
        // For manufactured goods, costs come from recipe. For purchased, we set it directly.
        wastageFactor: isManufactured ? 0.05 : 0,
        laborCost: isManufactured ? 0.50 : 0,
        overheadCost: isManufactured ? 0.20 : 0,
        franchiseFee: isManufactured ? 0.10 : 0,
        calculatedCost: isManufactured ? undefined : cost, // Let it be calculated for items with recipes
        salePrice: Math.round((isManufactured ? (cost + 0.8) * 2.2 : cost * 2.5) * 20) / 20, // Different markup logic, rounded to nearest 0.05
        quantityInStock: 0,
        priceHistory: [],
    };
});

export const mockSKUs: SKU[] = generatedSkus;


const generateDatedExpenses = (): ExpenseItem[] => {
    const expenses: ExpenseItem[] = [];
    const now = new Date();

    // Generate data for the current month and the 2 previous months
    for (let i = 0; i < 3; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        
        // Alquiler (fixed)
        expenses.push({
            id: `exp-rent-${i}`,
            category: 'Costos Operativos',
            description: 'Alquiler del Local',
            amount: 4500,
            date: new Date(new Date(monthDate).setDate(5)).toISOString().split('T')[0],
            type: 'fixed'
        });
        
        // Electricidad (variable)
        expenses.push({
            id: `exp-elec-${i}`,
            category: 'Costos Operativos',
            description: 'Servicio de Electricidad',
            amount: 800 + (Math.random() * 200 - 100), // +/- 100 from base
            date: new Date(new Date(monthDate).setDate(15)).toISOString().split('T')[0],
            type: 'variable'
        });
        
        // Agua y Gas (variable)
        expenses.push({
            id: `exp-gas-${i}`,
            category: 'Costos Operativos',
            description: 'Servicio de Agua y Gas',
            amount: 450 + (Math.random() * 100 - 50),
            date: new Date(new Date(monthDate).setDate(15)).toISOString().split('T')[0],
            type: 'variable'
        });
        
        // Mantenimiento (fixed, but maybe not every month)
        if (i % 2 === 0) { // Every other month
             expenses.push({
                id: `exp-maint-${i}`,
                category: 'Mantenimiento',
                description: 'Mantenimiento de Hornos',
                amount: 250,
                date: new Date(new Date(monthDate).setDate(20)).toISOString().split('T')[0],
                type: 'fixed'
            });
        }
        
        // Impuestos (fixed)
        expenses.push({
            id: `exp-taxes-${i}`,
            category: 'Impuestos',
            description: 'Impuestos sobre Nómina', // This will be replaced, but good for history
            amount: 1200,
            date: new Date(new Date(monthDate).setDate(28)).toISOString().split('T')[0],
            type: 'fixed'
        });
    }
    return expenses;
};

export const mockExpenses: ExpenseItem[] = generateDatedExpenses();

export const mockStores: Store[] = [
    { id: 'store-001', name: 'Sucursal Centro', address: 'Av. Principal 123', paymentTerms: 30 },
    { id: 'store-002', name: 'Sucursal Norte', address: 'Calle del Roble 456', paymentTerms: 15 },
];

export const mockMaintenanceTasks: MaintenanceTask[] = [
    { id: 'task-001', equipmentName: 'Horno Principal', description: 'Limpieza profunda de quemadores', frequencyDays: 30, lastCompleted: '2024-07-01' },
    { id: 'task-002', equipmentName: 'Amasadora #1', description: 'Engrase de rodamientos', frequencyDays: 90, lastCompleted: '2024-06-15' },
    { id: 'task-003', equipmentName: 'Refrigerador de Masa', description: 'Limpieza de filtros de aire', frequencyDays: 60, lastCompleted: '2024-07-10' },
];