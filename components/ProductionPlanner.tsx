
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { SKU, Ingredient, Remito, ProductionPlanItem, RemitoItem } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { ClipboardCheck, PlusCircle, Trash2, ChevronLeft, ChevronRight, ChevronDown, Download, Calculator, Package, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAppContext } from '../App';

interface ManualProductionItem {
    skuId: string;
    quantity: number;
}

interface ShoppingListItem {
    ingredientId: string;
    ingredientName: string;
    totalQuantity: number;
    unit: string;
}

const getWeeksInMonth = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const weeks = [];
    let firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay();
    let startDay = 1 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

    for (let i = 0; i < 6; i++) {
        const weekStart = new Date(year, month, startDay + i * 7);
        if (weekStart.getMonth() > month && i > 0) break;
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        weeks.push({
            id: `w-${year}-${month}-${i}`,
            start: weekStart,
            end: weekEnd,
            label: `${weekStart.toLocaleDateString('es-ES', {day: '2-digit'})} - ${weekEnd.toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})}`
        });
    }
    return weeks;
};

interface ProductionPlannerProps {
    showManualCalculator?: boolean;
    remitosToShow?: Remito[];
}

export const ProductionPlanner: React.FC<ProductionPlannerProps> = ({ showManualCalculator = true, remitosToShow }) => {
    const { skus, ingredients, remitos: allRemitos, productionLog, confirmProductionBatch, produceForStock } = useAppContext();
    const sourceRemitos = remitosToShow ?? allRemitos;

    // --- State for manual calculator ---
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
    const [manualProductionItems, setManualProductionItems] = useState<ManualProductionItem[]>([]);
    const [manualMode, setManualMode] = useState<'Simulación' | 'Producir para Stock'>('Simulación');

    // --- State for automatic planner ---
    const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
    const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [modifiedQuantities, setModifiedQuantities] = useState<Record<string, Record<string, number>>>({}); // date -> skuId -> new quantity

    useEffect(() => {
        if (skus.length > 0 && !selectedSkuId) {
            setSelectedSkuId(skus.find(s => s.recipe.length > 0)?.id || skus[0].id);
        }
    }, [skus, selectedSkuId]);

    const weeks = useMemo(() => getWeeksInMonth(currentDisplayMonth), [currentDisplayMonth]);
    const currentWeek = useMemo(() => {
        const today = new Date();
        return weeks.find(w => today >= w.start && today <= w.end);
    }, [weeks]);

    useEffect(() => {
        if (!selectedWeekId && currentWeek) {
            setSelectedWeekId(currentWeek.id);
        } else if (!selectedWeekId && weeks.length > 0) {
            setSelectedWeekId(weeks[0].id);
        }
    }, [currentWeek, weeks, selectedWeekId]);


    // --- Manual Calculator Logic ---
    const handleAddItem = () => {
        if (!selectedSkuId || quantityToAdd <= 0) return;
        setManualProductionItems(prev => {
            const existing = prev.find(item => item.skuId === selectedSkuId);
            if (existing) {
                return prev.map(item => item.skuId === selectedSkuId ? { ...item, quantity: item.quantity + quantityToAdd } : item);
            }
            return [...prev, { skuId: selectedSkuId, quantity: quantityToAdd }];
        });
    };
    const handleRemoveItem = (skuId: string) => setManualProductionItems(prev => prev.filter(item => item.skuId !== skuId));
    const handleProduceForStock = () => {
        if(produceForStock(manualProductionItems)) {
            setManualProductionItems([]);
        }
    }
    const manualShoppingList = useMemo<ShoppingListItem[]>(() => {
        const aggregated = new Map<string, ShoppingListItem>();
        manualProductionItems.forEach(item => {
            const sku = skus.find(s => s.id === item.skuId);
            if (sku?.recipe) {
                sku.recipe.forEach(recipeItem => {
                    const ing = ingredients.find(i => i.id === recipeItem.ingredientId);
                    if (ing) {
                        const needed = recipeItem.quantity * item.quantity;
                        const existing = aggregated.get(ing.id);
                        if (existing) {
                            existing.totalQuantity += needed;
                        } else {
                            aggregated.set(ing.id, { ingredientId: ing.id, ingredientName: ing.name, totalQuantity: needed, unit: ing.unit });
                        }
                    }
                });
            }
        });
        return Array.from(aggregated.values()).sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));
    }, [manualProductionItems, skus, ingredients]);

    // --- Automatic Planner Logic ---
    const remitosForWeek = useMemo(() => {
        if (!selectedWeekId) return [];
        const week = weeks.find(w => w.id === selectedWeekId);
        if (!week) return [];
        return sourceRemitos.filter(r => {
            const remitoDate = new Date(r.date + 'T00:00:00');
            return remitoDate >= week.start && remitoDate <= week.end;
        });
    }, [sourceRemitos, selectedWeekId, weeks]);
    
    const { dailyProductionPlan, requiredIngredientsByDay } = useMemo(() => {
        const planByDay: Record<string, ProductionPlanItem[]> = {};
        remitosForWeek.forEach(remito => {
            const dateStr = remito.date;
            if (!planByDay[dateStr]) planByDay[dateStr] = [];

            remito.items.forEach(item => {
                const sku = skus.find(s => s.id === item.skuId);
                if (sku) {
                    const planMap = new Map(planByDay[dateStr].map(p => [p.skuId, p]));
                    const existingPlan = planMap.get(sku.id);
                    if (existingPlan) {
                        existingPlan.totalQuantity += item.quantity;
                    } else {
                        planMap.set(sku.id, { skuId: sku.id, skuName: sku.name, category: sku.category, totalQuantity: item.quantity });
                    }
                    planByDay[dateStr] = Array.from(planMap.values());
                }
            });
        });
        
        Object.keys(planByDay).forEach(date => {
            setModifiedQuantities(prev => {
                const dayQuantities = { ...(prev[date] || {}) };
                planByDay[date].forEach(item => {
                    if (dayQuantities[item.skuId] === undefined) {
                        dayQuantities[item.skuId] = item.totalQuantity;
                    }
                });
                return { ...prev, [date]: dayQuantities };
            });
        });

        const modifiedPlan = { ...planByDay };
        Object.entries(modifiedQuantities).forEach(([date, skuQtys]) => {
            if (modifiedPlan[date]) {
                 modifiedPlan[date] = modifiedPlan[date].map(item => ({
                     ...item,
                     totalQuantity: skuQtys[item.skuId] ?? item.totalQuantity
                 }));
            }
        });
        
        const ingredientsByDay: Record<string, Map<string, ShoppingListItem>> = {};
        Object.entries(modifiedPlan).forEach(([date, items]) => {
             ingredientsByDay[date] = new Map();
             items.forEach(item => {
                const sku = skus.find(s => s.id === item.skuId);
                if (sku?.recipe) {
                    const ingredientMap = ingredientsByDay[date];
                    sku.recipe.forEach(recipeItem => {
                        const ing = ingredients.find(i => i.id === recipeItem.ingredientId);
                        if (ing) {
                            const needed = recipeItem.quantity * item.totalQuantity;
                            const existingIng = ingredientMap.get(ing.id);
                            if (existingIng) existingIng.totalQuantity += needed;
                            else ingredientMap.set(ing.id, { ingredientId: ing.id, ingredientName: ing.name, totalQuantity: needed, unit: ing.unit });
                        }
                    });
                }
             })
        });

        const finalIngredientsByDay: Record<string, ShoppingListItem[]> = {};
        for (const date in ingredientsByDay) {
            finalIngredientsByDay[date] = Array.from(ingredientsByDay[date].values()).sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));
        }

        const sortedPlanByDay = Object.keys(modifiedPlan)
            .sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
            .reduce((obj, key) => {
                obj[key] = modifiedPlan[key];
                return obj;
            }, {} as Record<string, ProductionPlanItem[]>);

        return { dailyProductionPlan: sortedPlanByDay, requiredIngredientsByDay: finalIngredientsByDay };
    }, [remitosForWeek, skus, ingredients, modifiedQuantities]);

    // --- Handlers & UI Logic ---
    const handleMonthChange = (direction: 'prev' | 'next') => setCurrentDisplayMonth(prev => { const newDate = new Date(prev); newDate.setDate(1); newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); return newDate; });
    const toggleDay = (date: string) => setExpandedDays(prev => { const newSet = new Set(prev); if (newSet.has(date)) newSet.delete(date); else newSet.add(date); return newSet; });
    const handleQuantityChange = (date: string, skuId: string, quantity: number) => setModifiedQuantities(prev => ({ ...prev, [date]: { ...(prev[date] || {}), [skuId]: quantity } }));
    const handleConfirmProduction = (date: string, items: ProductionPlanItem[]) => {
        const originalRemitos = remitosForWeek.filter(r => r.date === date);
        const originalPlanMap = new Map<string, number>();
        originalRemitos.forEach(r => r.items.forEach(i => originalPlanMap.set(i.skuId, (originalPlanMap.get(i.skuId) || 0) + i.quantity)));
        const originalPlan = Array.from(originalPlanMap.entries()).map(([skuId, totalQuantity]) => ({skuId, totalQuantity, skuName:'', category:''}));
        confirmProductionBatch(date, items, originalPlan as any);
    };
    
    const handleExportDailyPlan = (date: string, items: ProductionPlanItem[]) => { /* ... export logic ... */ };

    return (
        <div className="space-y-6">
            {showManualCalculator && (
                <Card>
                    <div className="p-4"><h3 className="text-xl font-bold flex items-center"><Calculator className="mr-2 h-5 w-5"/>Calculadora de Planificación Manual</h3><p className="text-sm text-gray-500">Estima insumos para producciones puntuales o fabrícalos directamente para añadir al stock.</p></div>
                     <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2 bg-gray-50 dark:bg-gray-800/50"><Button variant={manualMode === 'Simulación' ? 'default' : 'ghost'} onClick={()=>setManualMode('Simulación')}>Simulación</Button><Button variant={manualMode === 'Producir para Stock' ? 'default' : 'ghost'} onClick={()=>setManualMode('Producir para Stock')}>Producir para Stock</Button></div>
                     <div className="p-4 border-t dark:border-gray-700">
                        {skus.length > 0 ? (
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="flex-grow min-w-[200px]"><Label>Producto</Label><select value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)} className="w-full h-10 px-3 py-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent">{skus.filter(s => s.recipe.length > 0).map(sku => (<option key={sku.id} value={sku.id}>{sku.name}</option>))}</select></div>
                                <div className="w-32"><Label>Cantidad</Label><Input type="number" value={quantityToAdd} onChange={e => setQuantityToAdd(Number(e.target.value))} min="1"/></div>
                                <Button onClick={handleAddItem} disabled={!selectedSkuId || quantityToAdd <= 0}><PlusCircle className="mr-2 h-4 w-4" />Añadir</Button>
                            </div>
                        ) : <p className="text-center text-gray-500">No hay productos fabricados (con receta) definidos.</p>}
                    </div>
                     {(manualProductionItems.length > 0 || manualShoppingList.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                            <div className="bg-white dark:bg-gray-800 p-4"><h4 className="font-semibold mb-2">Productos a Fabricar</h4><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{manualProductionItems.map(item => { const sku = skus.find(s => s.id === item.skuId); return (<TableRow key={item.skuId}><TableCell>{sku?.name}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.skuId)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>);})}</TableBody></Table></div>
                            <div className="bg-white dark:bg-gray-800 p-4"><h4 className="font-semibold mb-2">Insumos Requeridos</h4><Table><TableHeader><TableRow><TableHead>Insumo</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader><TableBody>{manualShoppingList.map(item => (<TableRow key={item.ingredientId}><TableCell>{item.ingredientName}</TableCell><TableCell className="text-right">{item.totalQuantity.toFixed(2)} {item.unit}</TableCell></TableRow>))}</TableBody></Table></div>
                        </div>
                    )}
                    {manualMode === 'Producir para Stock' && manualProductionItems.length > 0 && <div className="p-4 border-t dark:border-gray-700"><Button onClick={handleProduceForStock} className="w-full">Confirmar y Producir para Stock</Button></div>}
                </Card>
            )}

            <Card>
                <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-xl font-bold flex items-center"><ClipboardCheck className="mr-2 h-5 w-5"/>Plan de Producción Automático</h3>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleMonthChange('prev')}><ChevronLeft/></Button>
                        <span className="font-semibold w-32 text-center capitalize">{currentDisplayMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleMonthChange('next')}><ChevronRight/></Button>
                    </div>
                </div>
                 <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-2">{weeks.map(week => <Button key={week.id} variant={selectedWeekId === week.id ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedWeekId(week.id)}>{week.label}</Button>)}</div>
                 <div className="space-y-4 p-4">
                    {Object.keys(dailyProductionPlan).length > 0 ? (
                        Object.entries(dailyProductionPlan).map(([date, items]) => {
                            const isExpanded = expandedDays.has(date);
                            const ingredientsForDay = requiredIngredientsByDay[date] || [];
                            const productionStatus = productionLog.find(p => p.date === date)?.status || 'Pendiente';
                            return (
                                <Card key={date} className="bg-gray-50 dark:bg-gray-800/50">
                                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleDay(date)}>
                                        <div className="flex items-center gap-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${productionStatus === 'Producido' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'}`}>{productionStatus}</span><h4 className="font-semibold text-lg capitalize">{new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4></div>
                                        <div className="flex items-center gap-2"><Button onClick={(e) => { e.stopPropagation(); handleExportDailyPlan(date, items); }} size="sm" variant="ghost"><Download className="mr-2 h-4 w-4"/>Exportar</Button><ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div>
                                    </div>
                                    {isExpanded && (
                                        <>
                                        <div className="p-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><h5 className="font-bold mb-2 flex items-center"><ClipboardCheck className="mr-2 h-4 w-4"/>Productos a Fabricar</h5><div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader><TableBody>{items.sort((a,b)=>a.skuName.localeCompare(b.skuName)).map(item => (<TableRow key={item.skuId}><TableCell>{item.skuName}</TableCell><TableCell className="text-right w-28"><Input type="number" value={modifiedQuantities[date]?.[item.skuId] ?? item.totalQuantity} onChange={e => handleQuantityChange(date, item.skuId, Number(e.target.value))} className="h-8 text-right" disabled={productionStatus==='Producido'} /></TableCell></TableRow>))}</TableBody></Table></div></div>
                                            <div><h5 className="font-bold mb-2 flex items-center"><Package className="mr-2 h-4 w-4"/>Insumos Requeridos</h5><div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Insumo</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader><TableBody>{ingredientsForDay.map(ing => (<TableRow key={ing.ingredientId}><TableCell>{ing.ingredientName}</TableCell><TableCell className="text-right">{ing.totalQuantity.toFixed(3)} {ing.unit}</TableCell></TableRow>))}</TableBody></Table></div></div>
                                        </div>
                                        {productionStatus === 'Pendiente' && <div className="p-4 border-t dark:border-gray-700"><Button className="w-full" onClick={() => handleConfirmProduction(date, items)}>Confirmar y Producir Lote del Día</Button></div>}
                                        </>
                                    )}
                                </Card>
                            );
                        })
                    ) : (
                        <p className="text-center text-gray-500 py-8">No hay pedidos cargados para esta semana.</p>
                    )}
                 </div>
            </Card>
        </div>
    );
};
