
import React, { useState, useCallback, useMemo, useEffect, createContext, useContext } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SkuManagement } from './components/SkuManagement';
import { IngredientManagement } from './components/IngredientManagement';
import { Logistics } from './components/Logistics';
import { Structure } from './components/Structure';
import { Simulation } from './components/Simulation';
import { RecipeCalculator } from './components/RecipeCalculator';
import { ProductionPlanner } from './components/ProductionPlanner';
import { IngredientUsageReport } from './components/IngredientUsageReport';
import { LocationsAndSales } from './components/LocationsAndSales';
import { PricingEngine } from './components/PricingEngine';
import { MenuEngineering } from './components/MenuEngineering';
import { Maintenance } from './components/Maintenance';
import { TransactionalAnalysis } from './components/TransactionalAnalysis';
import { Wholesale } from './components/Wholesale';
import { Collections } from './components/Collections';
import { BackupAndRestore } from './components/BackupAndRestore';
import { WelcomeModal } from './components/WelcomeModal';
import { HumanResources } from './components/HumanResources';
import { SeveranceCalculator } from './components/SeveranceCalculator';
import { useToast } from './components/ui/Toast';
import { persistAllData, loadInitialData } from './services/dataService';

import { Page, SKU, Ingredient, ExpenseItem, Store, HistoricalSale, MaintenanceTask, Supplier, SupplierDocument, AnalyzedItem, PriceHistoryItem, Remito, RemitoItem, Payment, AccountAdjustment, Employee, HRSettings, ExpenseCategory, Payroll, Budget, PaymentOrder, ErrorLog, BackupData, AppContextType, ProductionLog, ProductionPlanItem } from './types';
import { PieChart, DollarSign, BrainCircuit, List, ClipboardPen, Building2, ClipboardList, ClipboardCheck, Store as StoreIcon, Tag, LayoutGrid, Wrench, BarChartHorizontalBig, Truck, BookUser, Database, Package, CreditCard, Landmark, FilePieChart, Users, Briefcase, Banknote, Calculator } from 'lucide-react';
import { isValidDateString } from './services/dateUtils';


export const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};

const CoreApp: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    const shouldShow = localStorage.getItem('cvb_erp_hide_welcome') !== 'true';
    setShowWelcomeModal(shouldShow);
  }, []);

  const toggleDesktopSidebar = useCallback(() => setIsDesktopSidebarVisible(prev => !prev), []);

  const pageComponents: Record<Page, React.ReactNode> = {
    [Page.DASHBOARD]: <Dashboard />,
    [Page.SKUS]: <SkuManagement />,
    [Page.LOGISTICS]: <Logistics />,
    [Page.INGREDIENTS]: <IngredientManagement />,
    [Page.RECIPE_CALCULATOR]: <RecipeCalculator skuToEdit={null}/>,
    [Page.STRUCTURE]: <Structure />,
    [Page.SIMULATION]: <Simulation />,
    [Page.PRODUCTION_PLAN]: <ProductionPlanner />,
    [Page.WHOLESALE]: <Wholesale />,
    [Page.COLLECTIONS]: <Collections />,
    [Page.HUMAN_RESOURCES]: <HumanResources />,
    [Page.SEVERANCE_CALCULATOR]: <SeveranceCalculator />,
    [Page.INGREDIENT_USAGE_REPORT]: <IngredientUsageReport />,
    [Page.LOCATIONS_SALES]: <LocationsAndSales />,
    [Page.PRICING_ENGINE]: <PricingEngine />,
    [Page.MENU_ENGINEERING]: <MenuEngineering />,
    [Page.MAINTENANCE]: <Maintenance />,
    [Page.TRANSACTION_ANALYSIS]: <TransactionalAnalysis />,
    [Page.BACKUP_RESTORE]: <BackupAndRestore />,
  };

  const pageConfig = useMemo(() => [
    { id: Page.DASHBOARD, title: 'Dashboard', icon: PieChart, isCategory: false },
    { id: 'PRODUCCION', title: 'PRODUCCION', icon: Wrench, isCategory: true, pages: [{ id: Page.SKUS, title: 'Gestión de SKUs', icon: List }, { id: Page.INGREDIENTS, title: 'Insumos', icon: Package }, { id: Page.RECIPE_CALCULATOR, title: 'Calculadora de Recetas', icon: ClipboardPen }, { id: Page.PRODUCTION_PLAN, title: 'Plan de Producción', icon: ClipboardCheck }, { id: Page.MAINTENANCE, title: 'Mantenimiento', icon: Wrench }] },
    { id: 'VENTAS', title: 'VENTAS', icon: Truck, isCategory: true, pages: [{ id: Page.WHOLESALE, title: 'Mayorista', icon: Truck }] },
    { id: 'ADMINISTRACION', title: 'ADMINISTRACION', icon: Users, isCategory: true, pages: [{ id: Page.LOGISTICS, title: 'Gestión de Proveedores', icon: BookUser }, { id: Page.COLLECTIONS, title: 'Cobranzas y Ctas. Ctes.', icon: CreditCard }, { id: Page.HUMAN_RESOURCES, title: 'Recursos Humanos', icon: Briefcase }] },
    { id: 'SOCIOS/GERENTE', title: 'SOCIOS/GERENTE', icon: Building2, isCategory: true, pages: [{ id: Page.STRUCTURE, title: 'Estructura de Costos', icon: Banknote }, { id: Page.SIMULATION, title: 'Simulación "What-If"', icon: BrainCircuit }, { id: Page.SEVERANCE_CALCULATOR, title: 'Calcu Indemnización', icon: Calculator }, { id: Page.LOCATIONS_SALES, title: 'Locales y Ventas', icon: StoreIcon }, { id: Page.INGREDIENT_USAGE_REPORT, title: 'Reporte de Consumo', icon: FilePieChart }, { id: Page.MENU_ENGINEERING, title: 'Matriz del Menú', icon: LayoutGrid }, { id: Page.PRICING_ENGINE, title: 'Motor de Precios', icon: Tag }, { id: Page.TRANSACTION_ANALYSIS, title: 'Análisis Transaccional', icon: BarChartHorizontalBig }, { id: Page.BACKUP_RESTORE, title: 'Backup y Restauración', icon: Database }] }
  ], []);

  const getPageTitle = useCallback((page: Page): string => {
    for (const item of pageConfig) {
      if (!item.isCategory && item.id === page) return item.title;
      if (item.isCategory) {
        const subPage = item.pages.find(p => p.id === page);
        if (subPage) return subPage.title;
      }
    }
    const dashboardConfig = pageConfig.find(p => p.id === Page.DASHBOARD);
    return dashboardConfig?.title ?? 'Dashboard';
  }, [pageConfig]);


  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar activePage={activePage} setActivePage={setActivePage} pageConfig={pageConfig} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isDesktopSidebarVisible={isDesktopSidebarVisible}/>
       {showWelcomeModal && <WelcomeModal onClose={() => setShowWelcomeModal(false)} onDoNotShowAgain={() => { localStorage.setItem('cvb_erp_hide_welcome', 'true'); setShowWelcomeModal(false); }} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getPageTitle(activePage)} onMenuClick={() => setIsSidebarOpen(true)} isDesktopSidebarVisible={isDesktopSidebarVisible} toggleDesktopSidebar={toggleDesktopSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
          {pageComponents[activePage]}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
    const [initialData] = useState(() => loadInitialData());

    const [ingredients, setIngredients] = useState<Ingredient[]>(initialData.ingredients);
    const [skus, setSkus] = useState<SKU[]>(initialData.skus);
    const [expenses, setExpenses] = useState<ExpenseItem[]>(initialData.expenses);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(initialData.expenseCategories);
    const [stores, setStores] = useState<Store[]>(initialData.stores);
    const [historicalSales, setHistoricalSales] = useState<HistoricalSale[]>(initialData.historicalSales);
    const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(initialData.maintenanceTasks);
    const [suppliers, setSuppliers] = useState<Supplier[]>(initialData.suppliers);
    const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>(initialData.paymentOrders);
    const [remitos, setRemitos] = useState<Remito[]>(initialData.remitos);
    const [payments, setPayments] = useState<Payment[]>(initialData.payments);
    const [accountAdjustments, setAccountAdjustments] = useState<AccountAdjustment[]>(initialData.accountAdjustments);
    const [employees, setEmployees] = useState<Employee[]>(initialData.employees);
    const [employeeCategories, setEmployeeCategories] = useState<string[]>(initialData.employeeCategories);
    const [hrSettings, setHrSettings] = useState<HRSettings>(initialData.hrSettings);
    const [payrolls, setPayrolls] = useState<Payroll[]>(initialData.payrolls);
    const [skuCategories, setSkuCategories] = useState<string[]>(initialData.skuCategories);
    const [budgets, setBudgets] = useState<Budget[]>(initialData.budgets);
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(initialData.errorLogs);
    const [productionLog, setProductionLog] = useState<ProductionLog[]>(initialData.productionLog);

    const { showToast } = useToast();

    // Handlers
    const getLatestIngredientCost = useCallback((ingredient: Ingredient): number => {
      if (!ingredient.priceHistory || ingredient.priceHistory.length === 0) return 0;
      const sortedHistory = [...ingredient.priceHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sortedHistory[0].cost;
    }, []);

    const getLatestSkuCost = useCallback((sku: SKU): number => {
        if (!sku.priceHistory || sku.priceHistory.length === 0) return sku.calculatedCost || 0;
        const sortedHistory = [...sku.priceHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return sortedHistory[0].cost;
    }, []);
  
    const recalculateSkuCosts = useCallback((prevSkus: SKU[], updatedIngredients: Ingredient[]): SKU[] => {
      return prevSkus.map(sku => {
          if (sku.recipe && sku.recipe.length > 0) {
              const ingredientsCost = sku.recipe.reduce((total, item) => {
                  const ingredient = updatedIngredients.find(i => i.id === item.ingredientId);
                  return total + (ingredient ? getLatestIngredientCost(ingredient) * item.quantity : 0);
              }, 0);
              const costBeforeWastage = ingredientsCost + sku.laborCost + sku.overheadCost + sku.franchiseFee;
              const totalCost = costBeforeWastage / (1 - sku.wastageFactor);
              return { ...sku, calculatedCost: totalCost };
          } else {
              return { ...sku, calculatedCost: getLatestSkuCost(sku) };
          }
      });
    }, [getLatestIngredientCost, getLatestSkuCost]);

    const skusWithCalculatedCost = useMemo(() => recalculateSkuCosts(skus, ingredients), [skus, ingredients, recalculateSkuCosts]);

    const manageSkuCategory = useCallback((category: string) => {
      if (category && !skuCategories.some(c => c.toLowerCase() === category.toLowerCase())) {
          setSkuCategories(prev => [...prev, category].sort());
      }
    }, [skuCategories]);

    const addIngredient = useCallback((ingredient: Omit<Ingredient, 'id' | 'priceHistory' | 'quantityInStock'>): Ingredient => {
      const newIngredient = { ...ingredient, id: `ing-${Date.now()}`, priceHistory: [], quantityInStock: 0 };
      setIngredients(prev => [ ...prev, newIngredient ]);
      showToast('Insumo añadido con éxito', 'success');
      return newIngredient;
    }, [showToast]);
  
    const updateIngredient = useCallback((updatedIng: Ingredient) => {
      setIngredients(prev => {
          const newIngredients = prev.map(ing => {
              if (ing.id === updatedIng.id) {
                  // If quantityInStock is being updated manually, don't touch price history.
                  // Otherwise, assume it's a full update from form.
                  if (updatedIng.priceHistory.length === ing.priceHistory.length) {
                       return { ...ing, quantityInStock: updatedIng.quantityInStock };
                  }
                  return updatedIng;
              }
              return ing;
          });
          setSkus(prevSkus => recalculateSkuCosts(prevSkus, newIngredients));
          return newIngredients;
      });
      showToast('Insumo actualizado', 'success');
    }, [recalculateSkuCosts, showToast]);
  
    const deleteIngredient = useCallback((ingredientId: string) => {
      if (window.confirm('¿Estás seguro de que quieres eliminar este insumo y todo su historial?')) {
        setIngredients(prev => {
            const newIngredients = prev.filter(ing => ing.id !== ingredientId);
            setSkus(prevSkus => recalculateSkuCosts(prevSkus, newIngredients));
            showToast('Insumo eliminado', 'success');
            return newIngredients;
        });
      }
    }, [recalculateSkuCosts, showToast]);
  
    const addSupplier = useCallback((supplier: Omit<Supplier, 'id' | 'documents' | 'mappingHistory'>) => {
      const newSupplier = { ...supplier, id: `sup-${Date.now()}`, documents: [], mappingHistory: {} };
      setSuppliers(prev => [...prev, newSupplier]);
      showToast('Proveedor añadido', 'success');
    }, [showToast]);
    
    const updateSupplier = useCallback((updatedSup: Supplier) => { setSuppliers(prev => prev.map(s => s.id === updatedSup.id ? updatedSup : s)); showToast('Proveedor actualizado', 'success'); }, [showToast]);
  
    const deleteSupplier = useCallback((supplierId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este proveedor?')) {
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
            showToast('Proveedor eliminado', 'success');
        }
    }, [showToast]);
  
    const addDocument = useCallback((supplierId: string, doc: Omit<SupplierDocument, 'id'>): SupplierDocument => {
        const newDoc = { ...doc, id: `doc-${Date.now()}` };
        setSuppliers(prev => prev.map(s => {
            if (s.id === supplierId) {
                return { ...s, documents: [...s.documents, newDoc] };
            }
            return s;
        }));
        return newDoc;
    }, []);
  
    const updateDocument = useCallback((supplierId: string, doc: SupplierDocument) => { setSuppliers(prev => prev.map(s => s.id === supplierId ? {...s, documents: s.documents.map(d => d.id === doc.id ? doc : d)} : s)); }, []);
  
    const deleteDocument = useCallback((supplierId: string, documentId: string) => {
      setSuppliers(prev => prev.map(s => {
          if (s.id === supplierId) {
              return { ...s, documents: s.documents.filter(d => d.id !== documentId) };
          }
          return s;
      }));
    }, []);

    const processPaymentOrder = useCallback((order: Omit<PaymentOrder, 'id'>) => {
        const newOrder: PaymentOrder = { ...order, id: `po-${Date.now()}`};
        
        setPaymentOrders(prev => [...prev, newOrder]);
        
        setSuppliers(prevSuppliers => {
            const updatedSuppliers = new Map(prevSuppliers.map(s => [s.id, { ...s, documents: [...s.documents] }]));

            newOrder.documents.forEach(({ supplierId, documentId, amount }) => {
                const supplier = updatedSuppliers.get(supplierId);
                if (supplier) {
                    const docIndex = supplier.documents.findIndex(d => d.id === documentId);
                    if (docIndex > -1) {
                        const doc = { ...supplier.documents[docIndex] };
                        doc.paidAmount = (doc.paidAmount || 0) + amount;
                        
                        // Use a small epsilon for floating point comparison
                        if (doc.paidAmount >= (doc.totalAmount || 0) - 0.01) {
                            doc.status = 'paid';
                        } else {
                            doc.status = 'partially_paid';
                        }
                        supplier.documents[docIndex] = doc;
                    }
                }
            });
            return Array.from(updatedSuppliers.values());
        });

        showToast('Orden de pago procesada', 'success');
    }, [showToast]);
  
    const confirmInvoiceData = useCallback((supplierId: string, documentId: string, confirmedItems: AnalyzedItem[], expenseCategory: ExpenseCategory, dueDate: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;
        const ingredientsToUpdateMap = new Map<string, Ingredient>(ingredients.map(i => [i.id, { ...i, priceHistory: [...i.priceHistory] }]));
        const skusToUpdateMap = new Map<string, SKU>(skus.map(s => [s.id, { ...s, priceHistory: [...(s.priceHistory || [])] }]));
        const newMappingHistory = { ...supplier.mappingHistory };

        confirmedItems.forEach(item => {
            if (item.matchedId && item.matchType) newMappingHistory[item.productName] = { matchType: item.matchType, matchedId: item.matchedId };
            
            if (item.matchType === 'ingredient' && item.matchedId) {
                const ingredient = ingredientsToUpdateMap.get(item.matchedId);
                if (ingredient) {
                    if (item.unitPrice > 0) ingredient.priceHistory.push({ id: `ph-${Date.now()}-${Math.random()}`, date: new Date().toISOString().split('T')[0], cost: item.unitPrice, supplierId: supplierId });
                    if (item.quantity > 0) ingredient.quantityInStock = (ingredient.quantityInStock || 0) + item.quantity;
                }
            } else if (item.matchType === 'sku' && item.matchedId) {
                const sku = skusToUpdateMap.get(item.matchedId);
                if (sku) {
                    if (item.quantity > 0) sku.quantityInStock = (sku.quantityInStock || 0) + item.quantity;
                    if (item.unitPrice > 0) sku.priceHistory.push({ id: `ph-${Date.now()}-${Math.random()}`, date: new Date().toISOString().split('T')[0], cost: item.unitPrice, supplierId: supplierId });
                }
            }
        });

        const updatedIngredientsArray = Array.from(ingredientsToUpdateMap.values());
        const updatedSkusArray = Array.from(skusToUpdateMap.values());
        const finalSkus = recalculateSkuCosts(updatedSkusArray, updatedIngredientsArray);

        setIngredients(updatedIngredientsArray);
        setSkus(finalSkus);

        const totalAmount = confirmedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const doc = supplier.documents.find(d => d.id === documentId);
        if(!doc) return;

        const updatedDoc: SupplierDocument = { ...doc, status: 'approved', extractedItems: confirmedItems, totalAmount, expenseCategory, dueDate };
        updateDocument(supplierId, updatedDoc);
        showToast('Factura procesada y stock actualizado', 'success');
    }, [suppliers, ingredients, skus, recalculateSkuCosts, updateDocument, showToast]);
  
    const addManualPurchase = useCallback((data: { itemType: 'sku' | 'ingredient'; itemId: string; quantity: number; unitCost: number, supplierId: string }) => {
      const { itemType, itemId, quantity, unitCost, supplierId } = data;
      const newPriceHistoryItem: PriceHistoryItem = { id: `ph-${Date.now()}`, date: new Date().toISOString().split('T')[0], cost: unitCost, supplierId };

      if (itemType === 'ingredient') {
        setIngredients(prev => {
          const newIngredients = prev.map(ing => {
            if (ing.id === itemId) {
              return { ...ing, quantityInStock: ing.quantityInStock + quantity, priceHistory: [...ing.priceHistory, newPriceHistoryItem] };
            }
            return ing;
          });
          setSkus(prevSkus => recalculateSkuCosts(prevSkus, newIngredients));
          return newIngredients;
        });
      } else {
        setSkus(prev => prev.map(sku => {
            if (sku.id === itemId) {
                const updatedSku = { ...sku, quantityInStock: sku.quantityInStock + quantity, priceHistory: [...(sku.priceHistory || []), newPriceHistoryItem]};
                updatedSku.calculatedCost = getLatestSkuCost(updatedSku);
                return updatedSku;
            }
            return sku;
          }));
      }
      showToast('Compra manual registrada.', 'success');
    }, [recalculateSkuCosts, showToast, getLatestSkuCost]);
  
    const addSku = useCallback((sku: Omit<SKU, 'id' | 'quantityInStock' | 'priceHistory'>): SKU => {
      const newSku = { ...sku, id: `sku-${Date.now()}`, quantityInStock: 0, priceHistory: [] };
      manageSkuCategory(newSku.category);
      setSkus(prev => {
          const newSkus = [ ...prev, newSku ];
          showToast('SKU añadido con éxito.', 'success');
          if (newSku.recipe && newSku.recipe.length > 0) return recalculateSkuCosts(newSkus, ingredients);
          return newSkus;
      });
      return newSku;
    }, [ingredients, recalculateSkuCosts, manageSkuCategory, showToast]);
    
    const updateSku = useCallback((updatedSku: SKU) => {
      manageSkuCategory(updatedSku.category);
      setSkus(prev => {
          const newSkus = prev.map(s => s.id === updatedSku.id ? updatedSku : s);
          return recalculateSkuCosts(newSkus, ingredients);
      });
      showToast('SKU actualizado.', 'success');
    }, [ingredients, recalculateSkuCosts, manageSkuCategory, showToast]);
    
    const calculateRemitoTotal = (remito: Remito) => {
        const itemsTotal = remito.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercentage / 100), 0);
        return itemsTotal - remito.discount;
    };
    
    const addRemitos = useCallback((newRemitos: Remito[]) => {
        setRemitos(prev => [...prev, ...newRemitos]);
        showToast(`${newRemitos.length} remitos creados.`, 'success');
    }, [showToast]);
  
    const updateRemito = useCallback((updatedRemito: Remito, originalRemito: Remito) => {
        const diffs = new Map<string, number>(); // skuId -> quantity difference
        updatedRemito.items.forEach(newItem => {
            const oldItem = originalRemito.items.find(i => i.skuId === newItem.skuId);
            const oldQty = oldItem ? oldItem.quantity : 0;
            const diff = newItem.quantity - oldQty;
            if (diff > 0) diffs.set(newItem.skuId, diff);
        });

        if (diffs.size > 0) {
            const skusToUpdate = new Map(skus.map(s => [s.id, { ...s }]));
            for (const [skuId, diff] of diffs.entries()) {
                const sku = skusToUpdate.get(skuId);
                if (!sku || sku.quantityInStock < diff) {
                    showToast(`Stock insuficiente para ${sku?.name || skuId}. Solo hay ${sku?.quantityInStock || 0} disponibles.`, 'error');
                    return; // Abort update
                }
                sku.quantityInStock -= diff;
            }
            setSkus(Array.from(skusToUpdate.values()));
        }
        
        setRemitos(prev => prev.map(r => r.id === updatedRemito.id ? updatedRemito : r));
        showToast('Remito actualizado', 'info');
    }, [skus, showToast]);
    
    const deleteRemito = useCallback((remitoId: string) => {
        if(window.confirm('¿Seguro que quieres eliminar este remito?')) {
            setRemitos(prev => prev.filter(r => r.id !== remitoId));
            showToast('Remito eliminado', 'success');
        }
    }, [showToast]);
  
    const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
        const newPayment: Payment = { ...payment, id: `pay-${Date.now()}` };
        let remitosToUpdate = new Map<string, Remito>();
        newPayment.allocations.forEach(alloc => {
            const remito = remitos.find(r => r.id === alloc.remitoId);
            if (remito) {
                const existingRemito = remitosToUpdate.get(remito.id) || remito;
                const newPaidAmount = existingRemito.paidAmount + alloc.amount;
                const total = calculateRemitoTotal(existingRemito);
                const newStatus = newPaidAmount >= total - 0.01 ? 'paid' : 'partially_paid';
                remitosToUpdate.set(remito.id, { ...existingRemito, paidAmount: newPaidAmount, status: newStatus });
            }
        });
        setPayments(prev => [...prev, newPayment]);
        setRemitos(prev => prev.map(r => remitosToUpdate.get(r.id) || r));
        showToast('Pago registrado', 'success');
    }, [remitos, showToast]);
  
    const addAccountAdjustment = useCallback((adjustment: Omit<AccountAdjustment, 'id'>) => {
        const newAdjustment = { ...adjustment, id: `adj-${Date.now()}` };
        setAccountAdjustments(prev => [...prev, newAdjustment]);
        showToast('Ajuste de cuenta registrado', 'success');
    }, [showToast]);
  
    const updateEmployee = useCallback((updatedEmployee: Employee) => { setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e)); showToast('Empleado actualizado.', 'success'); }, [showToast]);

    const confirmProductionBatch = useCallback((date: string, itemsToProduce: ProductionPlanItem[], originalPlan: ProductionPlanItem[]): boolean => {
        const ingredientsToConsume = new Map<string, number>();
        const skusToProduce = new Map<string, number>();

        // Calculate total required ingredients
        for (const item of itemsToProduce) {
            const sku = skus.find(s => s.id === item.skuId);
            if (!sku || !sku.recipe) continue;
            for (const recipeItem of sku.recipe) {
                const totalNeeded = recipeItem.quantity * item.totalQuantity;
                ingredientsToConsume.set(recipeItem.ingredientId, (ingredientsToConsume.get(recipeItem.ingredientId) || 0) + totalNeeded);
            }
        }
        
        // Validate stock
        for (const [id, needed] of ingredientsToConsume.entries()) {
            const ingredient = ingredients.find(i => i.id === id);
            if (!ingredient || ingredient.quantityInStock < needed) {
                showToast(`Stock insuficiente para ${ingredient?.name}. Se necesitan ${needed.toFixed(2)}, hay ${ingredient?.quantityInStock.toFixed(2)}.`, 'error');
                return false;
            }
        }
        
        // Calculate surplus for finished goods stock
        for (const producedItem of itemsToProduce) {
            const originalItem = originalPlan.find(p => p.skuId === producedItem.skuId);
            const originalQty = originalItem?.totalQuantity || 0;
            const surplus = producedItem.totalQuantity - originalQty;
            if (surplus > 0) {
                skusToProduce.set(producedItem.skuId, surplus);
            }
        }

        // Apply stock changes
        setIngredients(prev => prev.map(ing => {
            const consumed = ingredientsToConsume.get(ing.id);
            return consumed ? { ...ing, quantityInStock: ing.quantityInStock - consumed } : ing;
        }));

        setSkus(prev => prev.map(sku => {
            const produced = skusToProduce.get(sku.id);
            return produced ? { ...sku, quantityInStock: sku.quantityInStock + produced } : sku;
        }));
        
        // Log production
        setProductionLog(prev => {
            const existing = prev.find(p => p.date === date);
            const producedItems = itemsToProduce.map(p => ({ skuId: p.skuId, quantity: p.totalQuantity }));
            if(existing) {
                return prev.map(p => p.date === date ? { ...p, status: 'Producido', producedItems } : p);
            }
            return [...prev, { date, status: 'Producido', producedItems }];
        });

        showToast(`Producción del ${date} confirmada. Stock actualizado.`, 'success');
        return true;
    }, [ingredients, skus, showToast]);

    const produceForStock = useCallback((itemsToProduce: { skuId: string; quantity: number }[]): boolean => {
        const ingredientsToConsume = new Map<string, number>();
        
        for (const item of itemsToProduce) {
            const sku = skus.find(s => s.id === item.skuId);
            if (!sku || !sku.recipe) continue;
            for (const recipeItem of sku.recipe) {
                const totalNeeded = recipeItem.quantity * item.quantity;
                ingredientsToConsume.set(recipeItem.ingredientId, (ingredientsToConsume.get(recipeItem.ingredientId) || 0) + totalNeeded);
            }
        }
        
        for (const [id, needed] of ingredientsToConsume.entries()) {
            const ingredient = ingredients.find(i => i.id === id);
            if (!ingredient || ingredient.quantityInStock < needed) {
                showToast(`Stock insuficiente para ${ingredient?.name}.`, 'error');
                return false;
            }
        }
        
        setIngredients(prev => prev.map(ing => {
            const consumed = ingredientsToConsume.get(ing.id);
            return consumed ? { ...ing, quantityInStock: ing.quantityInStock - consumed } : ing;
        }));

        setSkus(prev => prev.map(sku => {
            const producedItem = itemsToProduce.find(p => p.skuId === sku.id);
            return producedItem ? { ...sku, quantityInStock: sku.quantityInStock + producedItem.quantity } : sku;
        }));

        showToast('Producción para stock completada.', 'success');
        return true;
    }, [ingredients, skus, showToast]);


    // Data persistence with debounce
    const stateToPersist = useMemo(() => ({
        ingredients, skus, expenses, expenseCategories, stores, historicalSales, maintenanceTasks,
        suppliers, paymentOrders, remitos, payments, accountAdjustments, employees, employeeCategories,
        hrSettings, payrolls, skuCategories, budgets, errorLogs, productionLog
    }), [
        ingredients, skus, expenses, expenseCategories, stores, historicalSales, maintenanceTasks,
        suppliers, paymentOrders, remitos, payments, accountAdjustments, employees, employeeCategories,
        hrSettings, payrolls, skuCategories, budgets, errorLogs, productionLog
    ]);

    useEffect(() => {
        persistAllData(stateToPersist);
    }, [stateToPersist]);

    // Error logging
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            const newLog: ErrorLog = { timestamp: new Date().toISOString(), message: event.message, stack: event.error?.stack, type: 'error' };
            setErrorLogs(prev => [newLog, ...prev].slice(0, 50));
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const newLog: ErrorLog = { timestamp: new Date().toISOString(), message: reason instanceof Error ? reason.message : String(reason), stack: reason instanceof Error ? reason.stack : 'No stack available.', type: 'rejection' };
            setErrorLogs(prev => [newLog, ...prev].slice(0, 50));
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    // Multi-tab sync
    useEffect(() => {
      const handleStorageChange = (event: StorageEvent) => {
          if (event.key && event.key.startsWith('cvb_erp_') && event.newValue) {
              try {
                  const parsedData = JSON.parse(event.newValue);
                  const dataTypeKey = event.key.replace('cvb_erp_', '');
                  
                  const healData = (data: any, type: keyof BackupData): any[] => { /* ... simplified for brevity ... */ return Array.isArray(data) ? data : []; };

                  const stateUpdaters: Partial<Record<string, (data: any) => void>> = {
                      ingredients: d => setIngredients(healData(d, 'ingredients')), skus: d => setSkus(healData(d, 'skus')),
                      suppliers: d => setSuppliers(healData(d, 'suppliers')), remitos: d => setRemitos(healData(d, 'remitos')),
                      accountAdjustments: d => setAccountAdjustments(healData(d, 'accountAdjustments')),
                      expenses: setExpenses, expenseCategories: setExpenseCategories, stores: setStores,
                      historicalSales: setHistoricalSales, maintenanceTasks: setMaintenanceTasks,
                      sku_categories: setSkuCategories, payments: setPayments, employees: setEmployees,
                      employeeCategories: setEmployeeCategories, hrSettings: setHrSettings, payrolls: setPayrolls,
                      budgets: setBudgets, paymentOrders: setPaymentOrders, errorLogs: setErrorLogs, productionLog: setProductionLog
                  };
                  const updater = stateUpdaters[dataTypeKey];
                  if (updater) updater(parsedData);
              } catch (e) { console.error("Failed to parse localStorage data on sync:", e); }
          }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }, []); // Dependencies are stable setters
    
    // Combined Expense Generation Effect
    useEffect(() => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthYear = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;
      const currentMonthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const latestPayroll = payrolls.find(p => p.monthYear === currentMonthYear) || payrolls.find(p => p.monthYear === lastMonthYear);
      let totalLaborCost = 0;
      if (latestPayroll) { totalLaborCost = latestPayroll.employeePayrolls.reduce((sum, ep) => sum + ep.totalLaborCost, 0);
      } else { totalLaborCost = employees.reduce((total, employee) => { const registeredSalary = (employee.netSalary * (employee.registeredPercentage / 100)); const grossPay = employee.netSalary + employee.nonTaxableBonus; const contributions = registeredSalary * (hrSettings.socialContributionsPercentage / 100); return total + grossPay + contributions; }, 0); }
      const salaryExpense: ExpenseItem = { id: 'exp-hr-calculated', category: 'Salarios', description: `Costo total de nómina ${latestPayroll ? `(${latestPayroll.monthYear})` : '(estimado)'}`, amount: totalLaborCost, date: new Date().toISOString().split('T')[0], type: 'variable' };
      const supplierExpenses: ExpenseItem[] = suppliers.flatMap(supplier => 
        supplier.documents
            .filter(doc => ['approved', 'in_payment_order', 'partially_paid', 'paid'].includes(doc.status) && doc.totalAmount && doc.expenseCategory)
            .map(doc => ({ 
                id: `exp-sup-${doc.id}`, 
                category: doc.expenseCategory, 
                description: `Factura: ${doc.fileName}`, 
                amount: doc.totalAmount!, 
                date: doc.uploadDate, 
                type: 'variable', 
                sourceDocumentId: doc.id, 
                supplierId: supplier.id, 
                supplierName: supplier.name 
            }))
      );
      setExpenses(prevExpenses => [ ...prevExpenses.filter(e => !e.id.startsWith('exp-hr-calculated') && !e.id.startsWith('exp-sup-')), salaryExpense, ...supplierExpenses ]);
    }, [employees, hrSettings, payrolls, suppliers]);

    const contextValue = useMemo<AppContextType>(() => ({
        // State
        skus, setSkus,
        ingredients, setIngredients,
        expenses, setExpenses,
        expenseCategories, setExpenseCategories,
        stores, setStores,
        historicalSales, setHistoricalSales,
        maintenanceTasks, setMaintenanceTasks,
        suppliers, setSuppliers,
        remitos, setRemitos,
        payments, setPayments,
        accountAdjustments, setAccountAdjustments,
        employees, setEmployees,
        employeeCategories, setEmployeeCategories,
        hrSettings, setHrSettings,
        payrolls, setPayrolls,
        budgets, setBudgets,
        paymentOrders, setPaymentOrders,
        errorLogs, setErrorLogs,
        skuCategories, setSkuCategories,
        productionLog, setProductionLog,

        // Handlers
        addIngredient, updateIngredient, deleteIngredient,
        addSupplier, updateSupplier, deleteSupplier,
        addDocument, updateDocument, deleteDocument,
        confirmInvoiceData, addManualPurchase,
        addSku, updateSku,
        addRemitos, updateRemito, deleteRemito,
        addPayment, addAccountAdjustment,
        updateEmployee,
        processPaymentOrder,
        confirmProductionBatch, produceForStock,

        // Derived State/Helpers
        getLatestIngredientCost,
        skusWithCalculatedCost,
    }), [
        skus, ingredients, expenses, expenseCategories, stores, historicalSales, maintenanceTasks,
        suppliers, remitos, payments, accountAdjustments, employees, employeeCategories, hrSettings,
        payrolls, budgets, paymentOrders, errorLogs, skuCategories, productionLog, addIngredient, updateIngredient,
        deleteIngredient, addSupplier, updateSupplier, deleteSupplier, addDocument, updateDocument,
        deleteDocument, confirmInvoiceData, addManualPurchase, addSku, updateSku, addRemitos,
        updateRemito, deleteRemito, addPayment, addAccountAdjustment, updateEmployee,
        processPaymentOrder, getLatestIngredientCost, skusWithCalculatedCost,
        confirmProductionBatch, produceForStock
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            <CoreApp />
        </AppContext.Provider>
    );
};

export default App;