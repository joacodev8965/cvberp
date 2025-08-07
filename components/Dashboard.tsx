
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KpiCard } from './KpiCard';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, AlertTriangle, Bell, Archive, Package, ArrowLeft, ClipboardList } from 'lucide-react';
import { Remito, SKU, Ingredient } from '../types';
import { Card } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { useAppContext } from '../App';
import { Button } from './ui/Button';

interface StorePerformanceData {
    storeId: string;
    storeName: string;
    revenue: number;
    cogs: number;
    profit: number;
    margin: number;
}
type ActiveTab = 'general' | 'inventory';


const calculateRemitoBalance = (remito: Remito) => {
    const itemsTotal = remito.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercentage / 100), 0);
    const totalWithDiscount = itemsTotal - remito.discount;
    return totalWithDiscount - remito.paidAmount;
};

const StockTable: React.FC<{ items: (SKU | Ingredient)[]; type: 'sku' | 'ingredient' }> = ({ items, type }) => {
    return (
        <div className="max-h-96 overflow-y-auto">
            <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Stock Actual</TableHead><TableHead>Unidad</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                    {items.map(item => {
                        let status = 'ok';
                        if (item.minStock !== undefined && item.quantityInStock < item.minStock) {
                            status = 'low';
                        }
                        return (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right font-semibold">{item.quantityInStock.toLocaleString()}</TableCell>
                            <TableCell>{'unit' in item ? item.unit : 'unidad'}</TableCell>
                            <TableCell>
                                {status === 'low' && <span className="text-xs font-semibold inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"><AlertTriangle className="mr-1 h-3 w-3"/>Bajo</span>}
                            </TableCell>
                        </TableRow>
                    )})}
                </TableBody>
            </Table>
        </div>
    )
};

const StoreDetailView: React.FC<{
    storeData: StorePerformanceData;
    onBack: () => void;
}> = ({ storeData, onBack }) => {
    const { remitos } = useAppContext();
    
    const storeRemitos = useMemo(() => {
        return remitos
            .filter(r => r.storeName === storeData.storeName)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [remitos, storeData.storeName]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al Resumen General</Button>
            <h2 className="text-2xl font-bold">Detalle de {storeData.storeName}</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Ingresos" value={`$${storeData.revenue.toFixed(2)}`} icon={TrendingUp} />
                <KpiCard title="Ganancia Bruta" value={`$${storeData.profit.toFixed(2)}`} icon={PiggyBank} />
                <KpiCard title="Margen Bruto" value={`${storeData.margin.toFixed(2)}%`} icon={DollarSign} />
                <KpiCard title="Costos (COGS)" value={`$${storeData.cogs.toFixed(2)}`} icon={TrendingDown} />
            </div>
             <Card>
                <div className="p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold flex items-center"><ClipboardList className="mr-2 h-5 w-5"/>Últimos Remitos</h3>
                </div>
                <div className="overflow-x-auto">
                     <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {storeRemitos.length > 0 ? (
                                storeRemitos.map(remito => {
                                    const total = remito.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) - remito.discount;
                                    const balance = calculateRemitoBalance(remito);
                                    return (
                                        <TableRow key={remito.id}>
                                            <TableCell>{new Date(remito.date + 'T00:00:00').toLocaleDateString()}</TableCell>
                                            <TableCell><span className={`px-2 py-1 text-xs font-semibold rounded-full ${remito.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{remito.status}</span></TableCell>
                                            <TableCell className="text-right">${total.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-semibold">${balance.toFixed(2)}</TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center py-6">No hay remitos para este local.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};


export const Dashboard: React.FC = () => {
    const { skus, stores, historicalSales, remitos, accountAdjustments, suppliers, ingredients } = useAppContext();
    const [activeTab, setActiveTab] = useState<ActiveTab>('general');
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

    const dashboardNotifications = useMemo(() => {
        const notifications: { id: string; message: string; type: 'warning' | 'info' }[] = [];
        const today = new Date();
        
        suppliers.forEach(supplier => {
            supplier.documents.forEach(doc => {
                if (doc.status === 'approved' || doc.status === 'in_payment_order' || doc.status === 'partially_paid') {
                    const dueDate = new Date(doc.dueDate + 'T00:00:00');
                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7 && diffDays >= 0) {
                         notifications.push({ id: `sup-doc-${doc.id}`, message: `Factura de ${supplier.name} (${doc.fileName}) vence en ${diffDays} días.`, type: 'warning' });
                    }
                }
            });
        });
        return notifications;
    }, [suppliers]);

    const performanceData = useMemo<StorePerformanceData[]>(() => {
        const dataByStore = new Map<string, { revenue: number, cogs: number }>();

        historicalSales.forEach(sale => {
            const sku = skus.find(s => s.name.toLowerCase() === sale.skuName.toLowerCase());
            if (!sku) return;

            const saleRevenue = sale.quantity * sale.unitPrice;
            const saleCogs = sale.quantity * (sku.calculatedCost || 0);

            const currentData = dataByStore.get(sale.storeId) || { revenue: 0, cogs: 0 };
            currentData.revenue += saleRevenue;
            currentData.cogs += saleCogs;
            dataByStore.set(sale.storeId, currentData);
        });
        
        return stores.map(store => {
            const storeData = dataByStore.get(store.id) || { revenue: 0, cogs: 0 };
            const profit = storeData.revenue - storeData.cogs;
            const margin = storeData.revenue > 0 ? (profit / storeData.revenue) * 100 : 0;

            return {
                storeId: store.id,
                storeName: store.name,
                revenue: storeData.revenue,
                cogs: storeData.cogs,
                profit: profit,
                margin: margin,
            };
        });

    }, [skus, stores, historicalSales]);

    const totals = useMemo(() => {
        return performanceData.reduce((acc, store) => {
            acc.revenue += store.revenue;
            acc.cogs += store.cogs;
            acc.profit += store.profit;
            return acc;
        }, { revenue: 0, cogs: 0, profit: 0 });
    }, [performanceData]);

    const totalMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
    
    const debtTotals = useMemo(() => {
        const storeDebts = stores.map(store => {
            const storeRemitos = remitos.filter(r => r.storeName === store.name);
            const storeAdjustments = accountAdjustments.filter(a => a.storeId === store.id);
            let totalDebt = storeAdjustments.reduce((sum, a) => sum + a.amount, 0);
            let overdueDebt = 0;
            const today = new Date();

            storeRemitos.forEach(remito => {
                const balance = calculateRemitoBalance(remito);
                if (balance > 0.01) { // Use a small epsilon to avoid floating point issues
                    totalDebt += balance;
                    const dueDate = new Date(remito.date);
                    dueDate.setDate(dueDate.getDate() + store.paymentTerms);
                    if (dueDate < today && remito.status !== 'paid') {
                        overdueDebt += balance;
                    }
                }
            });
            return { totalDebt, overdueDebt };
        });

        return storeDebts.reduce((acc, data) => {
            acc.totalDebt += data.totalDebt;
            acc.overdueDebt += data.overdueDebt;
            return acc;
        }, { totalDebt: 0, overdueDebt: 0 });

    }, [stores, remitos, accountAdjustments]);
    
    const selectedStorePerformance = useMemo(() => {
        if (!selectedStoreId) return null;
        return performanceData.find(p => p.storeId === selectedStoreId);
    }, [selectedStoreId, performanceData]);

    if (stores.length === 0) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-semibold">Bienvenido a CVB ERP</h2>
                <p className="text-gray-500 mt-2">No hay locales registrados. Ve a "Locales y Ventas" para empezar.</p>
            </div>
        )
    }

    if (activeTab === 'general' && selectedStorePerformance) {
        return <StoreDetailView storeData={selectedStorePerformance} onBack={() => setSelectedStoreId(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('general')} className={`${activeTab === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Resumen General</button>
                    <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Inventario General</button>
                </nav>
            </div>
            
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KpiCard title="Ingresos Totales" value={`$${totals.revenue.toFixed(2)}`} icon={TrendingUp} />
                        <KpiCard title="Ganancia Bruta Total" value={`$${totals.profit.toFixed(2)}`} icon={PiggyBank} />
                        <KpiCard title="Margen Bruto Total" value={`${totalMargin.toFixed(2)}%`} icon={DollarSign} />
                        <KpiCard title="Deuda Total Clientes" value={`$${debtTotals.totalDebt.toFixed(2)}`} icon={DollarSign} />
                        <KpiCard title="Deuda Vencida Clientes" value={`$${debtTotals.overdueDebt.toFixed(2)}`} icon={AlertTriangle} changeType={debtTotals.overdueDebt > 0 ? 'increase' : undefined} />
                        <KpiCard title="Costos de Ventas (COGS)" value={`$${totals.cogs.toFixed(2)}`} icon={TrendingDown} />
                    </div>

                    {dashboardNotifications.length > 0 && (
                        <Card>
                            <div className="p-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold flex items-center"><Bell className="mr-2 h-5 w-5 text-yellow-500"/>Alertas y Notificaciones</h3>
                            </div>
                            <div className="p-4 space-y-2 max-h-40 overflow-y-auto">
                                {dashboardNotifications.map(n => (
                                    <div key={n.id} className="flex items-start gap-3 p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">{n.message}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <div className="p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold">Rendimiento por Local</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Local</TableHead>
                                        <TableHead className="text-right">Ingresos</TableHead>
                                        <TableHead className="text-right">COGS</TableHead>
                                        <TableHead className="text-right">Ganancia Bruta</TableHead>
                                        <TableHead className="text-right">Margen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performanceData.length > 0 ? (
                                        performanceData.map(d => (
                                            <TableRow key={d.storeId} onClick={() => setSelectedStoreId(d.storeId)} className="cursor-pointer">
                                                <TableCell className="font-medium">{d.storeName}</TableCell>
                                                <TableCell className="text-right">${d.revenue.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">${d.cogs.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-semibold">${d.profit.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right font-semibold ${d.margin < 15 ? 'text-red-500' : 'text-green-500'}`}>{d.margin.toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-gray-500 py-10">
                                                No hay datos de ventas para analizar. Sube un historial de ventas en "Locales y Ventas".
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4">Comparativa Visual de Locales</h3>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <BarChart data={performanceData} margin={{ top: 5, right: 20, left: 20, bottom: 5, }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                    <XAxis dataKey="storeName" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(value) => `$${value/1000}k`} />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }}
                                        contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                                        formatter={(value: number) => `$${value.toFixed(2)}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Ingresos" fill="#4f46e5" cursor="pointer" onClick={(data: any) => setSelectedStoreId(data.payload.storeId)}/>
                                    <Bar dataKey="cogs" name="COGS" fill="#fbbf24" cursor="pointer" onClick={(data: any) => setSelectedStoreId(data.payload.storeId)} />
                                    <Bar dataKey="profit" name="Ganancia" fill="#10b981" cursor="pointer" onClick={(data: any) => setSelectedStoreId(data.payload.storeId)} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
             {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <div className="p-4 border-b dark:border-gray-700">
                           <h3 className="text-lg font-semibold flex items-center"><Package className="mr-2 h-5 w-5 text-blue-500"/>Stock de Insumos</h3>
                        </div>
                        <StockTable items={ingredients} type="ingredient" />
                    </Card>
                     <Card>
                        <div className="p-4 border-b dark:border-gray-700">
                           <h3 className="text-lg font-semibold flex items-center"><Archive className="mr-2 h-5 w-5 text-green-500"/>Stock de Producto Terminado</h3>
                        </div>
                         <StockTable items={skus} type="sku" />
                    </Card>
                </div>
            )}
        </div>
    );
};