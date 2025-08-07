import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Store, Remito, Payment, AccountAdjustment, PaymentMethod } from '../types';
import { CreditCard, DollarSign, PlusCircle, Save, AlertTriangle, Printer, Eye } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { PrintRemito } from './ui/PrintRemito';
import { Modal } from './ui/Modal';
import { useAppContext } from '../App';
import { safeParseYYYYMMDD } from '../services/dateUtils';

// --- Helper Functions ---
const calculateRemitoTotal = (remito: Remito) => {
    const itemsTotal = remito.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercentage / 100), 0);
    return itemsTotal - remito.discount;
};

const calculateRemitoBalance = (remito: Remito) => {
    return calculateRemitoTotal(remito) - remito.paidAmount;
};

// --- Record Payment Modal (Moved to top-level) ---
const RecordPaymentModal: React.FC<{
    store: Store;
    unpaidRemitos: Remito[];
    onClose: () => void;
}> = ({ store, unpaidRemitos, onClose }) => {
    const { addPayment } = useAppContext();
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transferencia');
    const [allocations, setAllocations] = useState<Record<string, number>>({});

    const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, amount) => sum + amount, 0), [allocations]);
    const unallocatedAmount = paymentAmount - totalAllocated;

    const handleAllocationChange = (remitoId: string, amount: number) => {
        const remito = unpaidRemitos.find(r => r.id === remitoId);
        if (!remito) return;
        const balance = calculateRemitoBalance(remito);
        const newAmount = Math.max(0, Math.min(amount, balance));
        setAllocations(prev => ({ ...prev, [remitoId]: newAmount }));
    };
    
    const handleAutoAllocate = () => {
        let remainingToAllocate = paymentAmount;
        const newAllocations: Record<string, number> = {};
        
        const sortedRemitos = [...unpaidRemitos];
        
        for (const remito of sortedRemitos) {
            if (remainingToAllocate <= 0) break;
            const balance = calculateRemitoBalance(remito);
            const amountToAllocate = Math.min(remainingToAllocate, balance);
            newAllocations[remito.id] = amountToAllocate;
            remainingToAllocate -= amountToAllocate;
        }
        
        setAllocations(newAllocations);
    };

    const handleSubmit = () => {
        if (totalAllocated > paymentAmount) {
            alert("El monto asignado no puede ser mayor al monto del pago.");
            return;
        }
        if (totalAllocated <= 0) {
             alert("Debe asignar el pago a al menos un remito.");
            return;
        }
        
        const finalAllocations = Object.entries(allocations)
            .filter(([, amount]) => amount > 0)
            .map(([remitoId, amount]) => ({ remitoId, amount }));
            
        addPayment({
            storeId: store.id,
            date: paymentDate,
            amount: paymentAmount,
            method: paymentMethod,
            allocations: finalAllocations,
        });
        onClose();
    };

    return (
        <Modal title={`Registrar Pago para ${store.name}`} onClose={onClose} size="4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h4 className="font-semibold">Detalles del Pago</h4>
                    <div><Label htmlFor="paymentAmount">Monto del Pago</Label><Input id="paymentAmount" type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} /></div>
                    <div><Label htmlFor="paymentDate">Fecha</Label><Input id="paymentDate" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
                    <div><Label htmlFor="paymentMethod">Método</Label><select id="paymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option>Transferencia</option><option>Efectivo</option></select></div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Monto del Pago:</span> <span className="font-medium">${paymentAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Monto Asignado:</span> <span className="font-medium">${totalAllocated.toFixed(2)}</span></div>
                        <hr className="dark:border-gray-600"/>
                        <div className={`flex justify-between font-bold ${unallocatedAmount < 0 ? 'text-red-500' : 'text-green-500'}`}><span >Sin Asignar:</span> <span>${unallocatedAmount.toFixed(2)}</span></div>
                    </div>
                     <Button onClick={handleAutoAllocate} disabled={paymentAmount <= 0}>Asignar Automáticamente</Button>
                </div>
                <div className="md:col-span-2">
                    <h4 className="font-semibold mb-2">Asignar a Remitos Pendientes</h4>
                    <div className="max-h-96 overflow-y-auto overflow-x-auto border dark:border-gray-700 rounded-md">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Remito</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead className="w-40 text-right">Asignar</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {unpaidRemitos.map(remito => {
                                        const date = safeParseYYYYMMDD(remito.date);
                                        return (
                                        <TableRow key={remito.id}>
                                            <TableCell>{date ? date.toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'Inválida'}</TableCell>
                                            <TableCell>#{remito.id.slice(-6)}</TableCell>
                                            <TableCell className="text-right">${calculateRemitoBalance(remito).toFixed(2)}</TableCell>
                                            <TableCell className="text-right"><Input type="number" value={allocations[remito.id] || ''} onChange={e => handleAllocationChange(remito.id, Number(e.target.value))} className="h-8 text-right" placeholder="0.00"/></TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-6"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>Registrar Pago</Button></div>
        </Modal>
    );
};

// --- Main Collections Component ---
export const Collections: React.FC = () => {
    const { stores, remitos, payments, accountAdjustments } = useAppContext();
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [viewingRemito, setViewingRemito] = useState<Remito | null>(null);
    
    useEffect(() => {
        if (!selectedStoreId && stores.length > 0) {
            setSelectedStoreId(stores[0].id);
        }
    }, [stores, selectedStoreId]);

    const storeData = useMemo(() => {
        return stores.map(store => {
            const storeRemitos = remitos.filter(r => r.storeName === store.name);
            const storeAdjustments = accountAdjustments.filter(a => a.storeId === store.id);
            const totalDebt = storeRemitos.reduce((sum, r) => sum + calculateRemitoBalance(r), 0) + storeAdjustments.reduce((sum, a) => sum + a.amount, 0);
            
            const now = new Date();
            const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

            const overdueDebt = storeRemitos.reduce((sum, r) => {
                const remitoDate = safeParseYYYYMMDD(r.date);
                if (remitoDate) {
                    const dueDate = new Date(remitoDate);
                    dueDate.setUTCDate(dueDate.getUTCDate() + store.paymentTerms);
                    if (dueDate < todayUTC && r.status !== 'paid') {
                        return sum + calculateRemitoBalance(r);
                    }
                }
                return sum;
            }, 0);

            return { storeId: store.id, storeName: store.name, totalDebt, overdueDebt };
        });
    }, [stores, remitos, accountAdjustments]);

    const overallTotals = useMemo(() => {
        return storeData.reduce((acc, data) => {
            acc.totalDebt += data.totalDebt;
            acc.overdueDebt += data.overdueDebt;
            return acc;
        }, { totalDebt: 0, overdueDebt: 0 });
    }, [storeData]);
    
    const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId), [stores, selectedStoreId]);
    
    const selectedStoreData = useMemo(() => {
        if (!selectedStoreId) return null;
        return storeData.find(d => d.storeId === selectedStoreId);
    }, [selectedStoreId, storeData]);

    const unpaidRemitosForSelectedStore = useMemo(() => {
        if (!selectedStore) return [];
        return remitos
            .filter(r => r.storeName === selectedStore.name && r.status !== 'paid')
            .sort((a,b) => {
                 const dateA = safeParseYYYYMMDD(a.date);
                 const dateB = safeParseYYYYMMDD(b.date);
                 if (!dateA) return 1;
                 if (!dateB) return -1;
                 return dateA.getTime() - dateB.getTime();
            });
    }, [remitos, selectedStore]);
    
    const transactionsForSelectedStore = useMemo(() => {
        if (!selectedStore) return [];
        
        const remitoTransactions = remitos
            .filter(r => r.storeName === selectedStore.name)
            .map(r => {
                const remitoDate = safeParseYYYYMMDD(r.date);
                let dueDateStr = r.date;
                if (remitoDate) {
                    const dueDate = new Date(remitoDate);
                    dueDate.setUTCDate(dueDate.getUTCDate() + selectedStore.paymentTerms);
                    dueDateStr = dueDate.toISOString().split('T')[0];
                }

                return {
                    id: r.id,
                    date: r.date,
                    type: 'remito' as const,
                    description: `Remito #${r.id.slice(-6)}`,
                    dueDate: dueDateStr,
                    debit: calculateRemitoTotal(r),
                    credit: r.paidAmount,
                    balance: calculateRemitoBalance(r),
                    status: r.status,
                };
            });

        const adjustmentTransactions = accountAdjustments
            .filter(a => a.storeId === selectedStore.id)
            .map(a => ({
                id: a.id,
                date: a.date,
                type: 'adjustment' as const,
                description: a.description,
                dueDate: a.date,
                debit: a.amount > 0 ? a.amount : 0,
                credit: a.amount < 0 ? -a.amount : 0,
                balance: a.amount,
                status: 'paid' as Remito['status']
            }));
            
        return [...remitoTransactions, ...adjustmentTransactions].sort((a, b) => {
             const dateA = safeParseYYYYMMDD(a.date);
             const dateB = safeParseYYYYMMDD(b.date);
             if (!dateA) return 1;
             if (!dateB) return -1;
             return dateA.getTime() - dateB.getTime();
        });
    }, [selectedStore, remitos, accountAdjustments]);
    
    const handlePrintRemito = (remitoToPrint: Remito) => {
        const store = stores.find(s => s.name === remitoToPrint.storeName);
        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Imprimir Remito</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="print-root"></div></body></html>`);
            printWindow.document.close();
            const printRoot = printWindow.document.getElementById('print-root');
            if (printRoot) {
                ReactDOM.createRoot(printRoot).render(<PrintRemito remito={remitoToPrint} store={store} />);
                const doPrint = () => {
                    printWindow.print();
                    printWindow.close();
                }
                if (printWindow.document.readyState === "complete") {
                    setTimeout(doPrint, 500); 
                } else {
                    printWindow.onload = () => setTimeout(doPrint, 500);
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            {showPaymentModal && selectedStore && <RecordPaymentModal store={selectedStore} unpaidRemitos={unpaidRemitosForSelectedStore} onClose={() => setShowPaymentModal(false)} />}
            {viewingRemito && selectedStore && (
                <Modal title={`Detalle Remito #${viewingRemito.id.slice(-6)}`} onClose={() => setViewingRemito(null)} size="4xl">
                    <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg max-h-[70vh] overflow-y-auto">
                        <PrintRemito remito={viewingRemito} store={selectedStore} />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => handlePrintRemito(viewingRemito)}>
                            <Printer className="mr-2 h-4 w-4" /> Imprimir
                        </Button>
                        <Button variant="ghost" onClick={() => setViewingRemito(null)}>Cerrar</Button>
                    </div>
                </Modal>
            )}

            <h2 className="text-2xl font-bold flex items-center"><CreditCard className="mr-2 h-6 w-6 text-indigo-500" />Cobranzas y Cuentas Corrientes</h2>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                <KpiCard title="Deuda Total" value={`$${overallTotals.totalDebt.toFixed(2)}`} icon={DollarSign} />
                <KpiCard title="Deuda Vencida" value={`$${overallTotals.overdueDebt.toFixed(2)}`} icon={AlertTriangle} changeType={overallTotals.overdueDebt > 0 ? 'increase' : undefined} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <Card className="lg:col-span-1 flex flex-col">
                    <div className="p-4 border-b dark:border-gray-700"><h3 className="text-lg font-bold">Clientes</h3></div>
                    <div className="overflow-y-auto">
                        {storeData.map(data => (
                            <button key={data.storeId} onClick={() => setSelectedStoreId(data.storeId)} className={`w-full text-left p-4 border-l-4 transition-colors ${selectedStoreId === data.storeId ? 'border-indigo-500 bg-gray-100 dark:bg-gray-700' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                <p className="font-semibold">{data.storeName}</p>
                                <p className="text-sm text-gray-500">Saldo: ${data.totalDebt.toFixed(2)}</p>
                                {data.overdueDebt > 0 && <p className="text-sm text-red-500">Vencido: ${data.overdueDebt.toFixed(2)}</p>}
                            </button>
                        ))}
                    </div>
                </Card>
                <div className="lg:col-span-2 space-y-6">
                     {selectedStore ? (
                        <>
                            {selectedStoreData && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <KpiCard title={`Deuda Total - ${selectedStore.name}`} value={`$${selectedStoreData.totalDebt.toFixed(2)}`} icon={DollarSign} />
                                    <KpiCard title={`Deuda Vencida - ${selectedStore.name}`} value={`$${selectedStoreData.overdueDebt.toFixed(2)}`} icon={AlertTriangle} changeType={selectedStoreData.overdueDebt > 0 ? 'increase' : undefined} />
                                </div>
                            )}
                            <Card>
                                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-lg font-bold">Cuenta Corriente: {selectedStore.name}</h3>
                                    <Button onClick={() => setShowPaymentModal(true)}><PlusCircle className="mr-2 h-4 w-4"/>Registrar Pago</Button>
                                </div>
                                <div className="overflow-x-auto max-h-[60vh]">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vencimiento</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Débito</TableHead><TableHead className="text-right">Crédito</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                        {transactionsForSelectedStore.map(tx => {
                                            const now = new Date();
                                            const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                                            const dueDateObj = safeParseYYYYMMDD(tx.dueDate);
                                            const isOverdue = dueDateObj && dueDateObj < todayUTC && tx.status !== 'paid';

                                            const handleViewRemito = () => {
                                                if (tx.type === 'remito') {
                                                    const remitoToView = remitos.find(r => r.id === tx.id);
                                                    if (remitoToView) setViewingRemito(remitoToView);
                                                }
                                            }
                                            return (
                                            <TableRow key={tx.id}>
                                                <TableCell>{safeParseYYYYMMDD(tx.date)?.toLocaleDateString('es-ES', { timeZone: 'UTC' }) ?? 'Inválida'}</TableCell>
                                                <TableCell className={`${isOverdue ? 'text-red-500 font-semibold' : ''}`}>{dueDateObj?.toLocaleDateString('es-ES', { timeZone: 'UTC' }) ?? 'N/A'}</TableCell>
                                                <TableCell>
                                                    {tx.type === 'remito' ? (
                                                        <button onClick={handleViewRemito} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                                            {tx.description} <Eye className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        tx.description
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">${tx.debit.toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-green-600">${tx.credit.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold">${tx.balance.toFixed(2)}</TableCell>
                                            </TableRow>
                                        )})}
                                        </TableBody>
                                    </Table>
                                 </div>
                            </Card>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full"><p className="text-gray-500">Selecciona un cliente para ver su cuenta.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};
