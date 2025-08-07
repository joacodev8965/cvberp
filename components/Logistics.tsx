import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from './ui/Card';
import { Ingredient, Supplier, SupplierDocument, AnalyzedItem, SKU, ExpenseCategory, PaymentOrder, SupplierContact } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Trash2, Edit, Save, PlusCircle, X, BookUser, Upload, FileText, Camera, ShoppingCart, DollarSign, Download, Eye, Loader2, Clock, CheckCircle, AlertTriangle, ClipboardCopy, Star, BarChart2, RefreshCw, Landmark } from 'lucide-react';
import { analyzeInvoice } from '../services/geminiService';
import { toBase64, base64ToBlob } from '../services/fileUtils';
import { Modal } from './ui/Modal';
import { useAppContext } from '../App';
import { KpiCard } from './KpiCard';
import { PriceChangeAlertModal, PriceChange } from './ui/PriceChangeAlertModal';

// --- Helper Components (Moved to top-level) ---

const PaymentOrderModal: React.FC<{
    invoicesToPay: (SupplierDocument & { supplierId: string, supplierName: string, balance: number })[];
    onClose: () => void;
    onSubmit: (order: Omit<PaymentOrder, 'id'>) => void;
}> = ({ invoicesToPay, onClose, onSubmit }) => {
    const [allocations, setAllocations] = useState<Record<string, number>>(() =>
        invoicesToPay.reduce((acc, inv) => ({ ...acc, [inv.id]: inv.balance }), {})
    );
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Transferencia');
    const [reference, setReference] = useState('');

    const totalToPay = useMemo(() => Object.values(allocations).reduce((sum, amount) => sum + amount, 0), [allocations]);

    const handleSubmit = () => {
        const documents = Object.entries(allocations)
            .map(([documentId, amount]) => {
                const invoice = invoicesToPay.find(inv => inv.id === documentId);
                if (!invoice || amount <= 0) return null;
                return { supplierId: invoice.supplierId, documentId, amount };
            })
            .filter(Boolean) as PaymentOrder['documents'];

        if (documents.length === 0) { alert("Debe asignar un monto a al menos una factura."); return; }

        onSubmit({
            creationDate: new Date().toISOString().split('T')[0],
            paymentDate,
            status: 'paid',
            documents,
            totalAmount: totalToPay,
            paymentMethod,
            reference
        });
    };

    return (
        <Modal title="Crear Orden de Pago" onClose={onClose} size="4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h4 className="font-semibold">Detalles del Pago</h4>
                    <div><Label>Monto Total a Pagar</Label><Input value={`$${totalToPay.toFixed(2)}`} disabled className="font-bold text-lg h-12" /></div>
                    <div><Label>Fecha de Pago</Label><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
                    <div><Label>Método de Pago</Label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option>Transferencia</option><option>Efectivo</option><option>Cheque</option></select></div>
                    <div><Label>Referencia</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="ID Transacción, Nro Cheque" /></div>
                </div>
                <div className="md:col-span-2">
                    <h4 className="font-semibold mb-2">Facturas Incluidas</h4>
                    <div className="max-h-96 overflow-y-auto border dark:border-gray-700 rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Factura</TableHead><TableHead>Proveedor</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead className="w-40 text-right">Monto a Pagar</TableHead></TableRow></TableHeader>
                            <TableBody>{invoicesToPay.map(inv => (
                                <TableRow key={inv.id}>
                                    <TableCell className="text-sm">{inv.fileName}</TableCell>
                                    <TableCell className="text-sm">{inv.supplierName}</TableCell>
                                    <TableCell className="text-right">${inv.balance.toFixed(2)}</TableCell>
                                    <TableCell><Input type="number" value={allocations[inv.id] || ''} onChange={e => setAllocations(p => ({ ...p, [inv.id]: Math.min(Number(e.target.value), inv.balance) }))} className="h-8 text-right" /></TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-6"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>Registrar Pago</Button></div>
        </Modal>
    )
};

const AccountsPayableTab: React.FC<{
    suppliers: Supplier[];
    processPaymentOrder: (order: Omit<PaymentOrder, 'id'>) => void;
}> = ({ suppliers, processPaymentOrder }) => {
    const [selectedInvoices, setSelectedInvoices] = useState<Record<string, boolean>>({});
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);

    const debtData = useMemo(() => {
        let totalDebt = 0;
        let overdueDebt = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pendingInvoices = suppliers.flatMap(s =>
            s.documents
                .filter(d => (d.status === 'approved' || d.status === 'partially_paid') && d.totalAmount)
                .map(d => {
                    const balance = d.totalAmount! - d.paidAmount;
                    const dueDate = new Date(d.dueDate + 'T00:00:00');
                    const isOverdue = dueDate < today;

                    totalDebt += balance;
                    if (isOverdue) {
                        overdueDebt += balance;
                    }

                    return {
                        ...d,
                        supplierId: s.id,
                        supplierName: s.name,
                        balance,
                        isOverdue
                    };
                })
        ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return { totalDebt, overdueDebt, pendingInvoices };
    }, [suppliers]);

    const handleToggleSelect = (docId: string) => {
        setSelectedInvoices(prev => ({ ...prev, [docId]: !prev[docId] }));
    }

    const selectedDocs = useMemo(() => {
        return debtData.pendingInvoices.filter(inv => selectedInvoices[inv.id]);
    }, [debtData.pendingInvoices, selectedInvoices]);

    const handleSubmitPaymentOrder = (order: Omit<PaymentOrder, 'id'>) => {
        processPaymentOrder(order);
        setPaymentModalOpen(false);
        setSelectedInvoices({});
    };

    return (
        <div className="space-y-6">
            {isPaymentModalOpen && <PaymentOrderModal invoicesToPay={selectedDocs} onClose={() => setPaymentModalOpen(false)} onSubmit={handleSubmitPaymentOrder} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <KpiCard title="Deuda Total a Proveedores" value={`$${debtData.totalDebt.toFixed(2)}`} icon={DollarSign} />
                <KpiCard title="Deuda Vencida" value={`$${debtData.overdueDebt.toFixed(2)}`} icon={AlertTriangle} changeType={debtData.overdueDebt > 0 ? 'increase' : undefined} />
            </div>
            <Card>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Facturas Pendientes de Pago</h3>
                    <Button onClick={() => setPaymentModalOpen(true)} disabled={selectedDocs.length === 0}>
                        Crear Orden de Pago ({selectedDocs.length})
                    </Button>
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead className="w-12"><Input type="checkbox" onChange={(e) => setSelectedInvoices(e.target.checked ? debtData.pendingInvoices.reduce((acc, inv) => ({ ...acc, [inv.id]: true }), {}) : {})} /></TableHead>
                            <TableHead>Proveedor</TableHead><TableHead>Factura</TableHead>
                            <TableHead>Vencimiento</TableHead><TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>{debtData.pendingInvoices.map(inv => (
                            <TableRow key={inv.id} className={inv.isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                <TableCell><Input type="checkbox" checked={!!selectedInvoices[inv.id]} onChange={() => handleToggleSelect(inv.id)} /></TableCell>
                                <TableCell className="font-medium">{inv.supplierName}</TableCell>
                                <TableCell>{inv.fileName}</TableCell>
                                <TableCell className={inv.isOverdue ? 'font-bold text-red-500' : ''}>{new Date(inv.dueDate + 'T00:00:00').toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">${inv.totalAmount?.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold">${inv.balance.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    )
};

const SupplierCurrentAccount: React.FC<{ supplier: Supplier, paymentOrders: PaymentOrder[] }> = ({ supplier, paymentOrders }) => {
    const transactions = useMemo(() => {
        const invoiceTxs = supplier.documents
            .filter(d => d.totalAmount)
            .map(d => ({
                date: d.uploadDate,
                type: 'invoice',
                description: `Factura: ${d.fileName}`,
                debit: d.totalAmount!,
                credit: 0
            }));

        const paymentTxs = paymentOrders
            .flatMap(po => po.documents.filter(d => d.supplierId === supplier.id).map(d => ({
                date: po.paymentDate,
                type: 'payment',
                description: `Pago (OP #${po.id.slice(-6)})`,
                debit: 0,
                credit: d.amount
            })));

        return [...invoiceTxs, ...paymentTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [supplier, paymentOrders]);

    let runningBalance = 0;
    const transactionsWithBalance = transactions.map(tx => {
        runningBalance += tx.debit - tx.credit;
        return { ...tx, balance: runningBalance };
    });

    return (
        <div className="space-y-4">
            <KpiCard title="Saldo Actual con Proveedor" value={`$${runningBalance.toFixed(2)}`} icon={DollarSign} />
            <div className="overflow-x-auto max-h-[60vh]">
                <Table>
                    <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead className="text-right">Débito</TableHead><TableHead className="text-right">Crédito</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                    <TableBody>{transactionsWithBalance.map((tx, i) => (
                        <TableRow key={`${tx.date}-${i}`}>
                            <TableCell>{new Date(tx.date + 'T00:00:00').toLocaleDateString()}</TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell className="text-right">${tx.debit > 0 ? tx.debit.toFixed(2) : '-'}</TableCell>
                            <TableCell className="text-right text-green-600">${tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</TableCell>
                            <TableCell className="text-right font-bold">${tx.balance.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </div>
        </div>
    )
};


const FileUploader: React.FC<{ onFileUpload: (file: File) => void }> = ({ onFileUpload }) => {
    const [dragging, setDragging] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFile = (files: FileList | null) => {
        if (files && files[0]) {
            onFileUpload(files[0]);
        }
    };
    
    return (
        <div className="mt-1">
            <label 
                htmlFor="invoice-upload"
                onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
            >
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Arrastra una factura</span> o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400">(PDF, JPG, PNG)</p>
                <input id="invoice-upload" ref={fileInputRef} type="file" className="sr-only" accept="image/png, image/jpeg, application/pdf" onChange={(e) => handleFile(e.target.files)}/>
            </label>
             <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="w-full mt-2 text-xs">
                <Camera className="mr-2 h-4 w-4" /> Tomar Foto de Factura
            </Button>
        </div>
    );
};

const CreateItemModal: React.FC<{
    itemType: 'ingredient' | 'sku';
    onClose: () => void;
    onSuccess: (newItem: Ingredient | SKU) => void;
}> = ({ itemType, onClose, onSuccess }) => {
    const { addIngredient, addSku, skuCategories } = useAppContext();
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [category, setCategory] = useState('');

    const handleCreate = () => {
        if (!name) { alert("El nombre es obligatorio."); return; }
        
        let newItem;
        if (itemType === 'ingredient') {
            if (!unit) { alert("La unidad es obligatoria para los insumos."); return; }
            newItem = addIngredient({ name, unit });
        } else {
            if (!category) { alert("La categoría es obligatoria para los SKUs."); return; }
            newItem = addSku({ name, category, recipe: [], wastageFactor: 0, laborCost: 0, overheadCost: 0, franchiseFee: 0, salePrice: 0 });
        }
        onSuccess(newItem);
        onClose();
    };

    return (
        <Modal title={`Crear Nuevo ${itemType === 'ingredient' ? 'Insumo' : 'SKU'}`} onClose={onClose} size="lg" className="z-[60]">
            <div className="space-y-4">
                <div><Label htmlFor="itemName">Nombre</Label><Input id="itemName" value={name} onChange={e => setName(e.target.value)} /></div>
                {itemType === 'ingredient' ? (
                    <div><Label htmlFor="itemUnit">Unidad</Label><Input id="itemUnit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="kg, litro, unidad"/></div>
                ) : (
                    <div>
                        <Label htmlFor="itemCategory">Categoría</Label>
                        <Input id="itemCategory" list="logistics-sku-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="Viennoiserie, Bebidas"/>
                        <datalist id="logistics-sku-categories">
                            {skuCategories.map(cat => <option key={cat} value={cat} />)}
                        </datalist>
                    </div>
                )}
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleCreate}>Crear y Seleccionar</Button></div>
            </div>
        </Modal>
    );
};

const ReviewInvoiceModal: React.FC<{
    doc: SupplierDocument;
    onSave: (updatedDoc: SupplierDocument) => void;
    onClose: () => void;
}> = ({ doc, onSave, onClose }) => {
    const { ingredients, skus, skuCategories, expenseCategories } = useAppContext();
    const [items, setItems] = useState<AnalyzedItem[]>(doc.extractedItems || []);
    const [dueDate, setDueDate] = useState<string>(doc.dueDate || new Date().toISOString().split('T')[0]);
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>(doc.expenseCategory || 'Proveedores');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [createItemType, setCreateItemType] = useState<'ingredient' | 'sku'>('ingredient');
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyName = (name: string, id: string) => {
        navigator.clipboard.writeText(name).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('No se pudo copiar el texto.');
        });
    };

    const handleItemChange = (itemId: string, field: keyof AnalyzedItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            
            const updatedItem: AnalyzedItem = { ...item, [field]: value };
            if (field === 'matchType') {
                updatedItem.matchedId = null;
            }
    
            const selectedEntity = updatedItem.matchType === 'ingredient' ? ingredients.find(i => i.id === updatedItem.matchedId) : skus.find(s => s.id === updatedItem.matchedId);
            const isPackage = !!(selectedEntity?.unitsPerPackage && selectedEntity.unitsPerPackage > 1);
    
            if (isPackage) {
                const packageQty = updatedItem.packageQuantity ?? item.quantity;
                const packagePrice = updatedItem.packagePrice ?? item.unitPrice;
    
                if (selectedEntity.unitsPerPackage && selectedEntity.unitsPerPackage > 0) {
                     updatedItem.quantity = packageQty * selectedEntity.unitsPerPackage;
                     updatedItem.unitPrice = packagePrice / selectedEntity.unitsPerPackage;
                }
    
                if (updatedItem.packageQuantity === undefined) updatedItem.packageQuantity = packageQty;
                if (updatedItem.packagePrice === undefined) updatedItem.packagePrice = packagePrice;
            }
            
            return updatedItem;
        }));
    };

    const handleSaveAndClose = () => {
        onSave({ ...doc, extractedItems: items, dueDate, expenseCategory });
    };

    const handleOpenCreateModal = (itemId: string, type: 'ingredient' | 'sku') => {
        setActiveItemId(itemId);
        setCreateItemType(type);
        setCreateModalOpen(true);
    };

    const handleCreationSuccess = (newItem: Ingredient | SKU) => {
        if(activeItemId) {
            handleItemChange(activeItemId, 'matchType', createItemType);
            setTimeout(() => {
                handleItemChange(activeItemId, 'matchedId', newItem.id);
            }, 0);
        }
    };
    
    const allAssigned = items.every(item => item.matchedId !== null);

    return (
        <>
        {isCreateModalOpen && <CreateItemModal itemType={createItemType} onClose={() => setCreateModalOpen(false)} onSuccess={handleCreationSuccess}/>}
        <Modal title={`Revisar Factura: ${doc.fileName}`} onClose={onClose} size="4xl">
            <div className="space-y-4">
                <p className="text-sm text-gray-500">Verifica y asigna cada item. Puedes guardar el progreso y continuar después.</p>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Item Factura</TableHead><TableHead>Detalle Compra</TableHead><TableHead>Asignar a</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.map(item => {
                                const selectedEntity =
                                    item.matchType === 'ingredient'
                                        ? ingredients.find(i => i.id === item.matchedId)
                                        : item.matchType === 'sku'
                                        ? skus.find(s => s.id === item.matchedId)
                                        : undefined;
                                const isPackage = !!(selectedEntity?.unitsPerPackage && selectedEntity.unitsPerPackage > 1);
                                
                                return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium align-top pt-5">
                                        <div className="flex items-start gap-2">
                                            <span className="flex-grow">{item.productName}</span>
                                            <Button variant="ghost" size="sm" onClick={() => handleCopyName(item.productName, item.id)} title="Copiar nombre">
                                                {copiedId === item.id ? <CheckCircle className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            {isPackage ? (
                                                <>
                                                    <div className="flex gap-2 items-center">
                                                        <Input type="number" value={item.packageQuantity || item.quantity} onChange={e => handleItemChange(item.id, 'packageQuantity', Number(e.target.value))} className="w-24 h-8"/>
                                                        <Label className="whitespace-nowrap">x {selectedEntity?.purchaseUnit || 'Paquetes'}</Label>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <Input type="number" value={item.packagePrice || item.unitPrice} onChange={e => handleItemChange(item.id, 'packagePrice', Number(e.target.value))} className="w-24 h-8"/>
                                                        <Label>c/u</Label>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">Total: {item.quantity.toFixed(2)} {(selectedEntity && 'unit' in selectedEntity) ? selectedEntity.unit : 'unidad'}s a ${item.unitPrice.toFixed(3)} c/u</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex gap-2 items-center">
                                                        <Input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-24 h-8"/>
                                                        <Label>{(selectedEntity && 'unit' in selectedEntity) ? selectedEntity.unit : 'Unidades'}</Label>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <Input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value))} className="w-24 h-8" step="0.01"/>
                                                        <Label>c/u</Label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top pt-5">
                                        <div className="flex gap-2">
                                            <select value={item.matchType || ''} onChange={e => handleItemChange(item.id, 'matchType', e.target.value as ('ingredient'|'sku'))} className="w-full h-10 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent">
                                                <option value="">-- No asignar --</option><option value="ingredient">Insumo</option><option value="sku">SKU</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {item.matchType === 'ingredient' && (<select value={item.matchedId || ''} onChange={e => handleItemChange(item.id, 'matchedId', e.target.value)} className="w-full h-10 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option value="">-- Selecciona Insumo --</option>{ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}</select>)}
                                            {item.matchType === 'sku' && (<select value={item.matchedId || ''} onChange={e => handleItemChange(item.id, 'matchedId', e.target.value)} className="w-full h-10 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option value="">-- Selecciona SKU --</option>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>)}
                                            {item.matchType && <Button variant="ghost" size="sm" onClick={() => handleOpenCreateModal(item.id, item.matchType!)}><PlusCircle className="h-5 w-5"/></Button>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                <div className="pt-4 mt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="invoice-due-date">Fecha de Vencimiento</Label>
                        <Input 
                            id="invoice-due-date"
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="invoice-expense-category">Categoría de Gasto</Label>
                        <select 
                            id="invoice-expense-category"
                            value={expenseCategory} 
                            onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)} 
                            className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"
                        >
                            {expenseCategories.filter(cat => cat !== 'Salarios').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSaveAndClose}>{allAssigned ? "Confirmar y Procesar" : "Guardar Progreso"}</Button>
                </div>
            </div>
        </Modal>
        </>
    );
};

const ManualPurchaseModal: React.FC<{
    supplier: Supplier;
    onClose: () => void;
}> = ({ supplier, onClose }) => {
    const { ingredients, skus, addManualPurchase } = useAppContext();
    const [itemType, setItemType] = useState<'ingredient' | 'sku'>('ingredient');
    const [itemId, setItemId] = useState('');
    const [purchaseQuantity, setPurchaseQuantity] = useState(1);
    const [cost, setCost] = useState(0);

    const selectedItem = useMemo(() => {
        if (!itemId) return null;
        return itemType === 'ingredient'
            ? ingredients.find(i => i.id === itemId)
            : skus.find(s => s.id === itemId);
    }, [itemId, itemType, ingredients, skus]);

    const isPackagePurchase = useMemo(() => {
        if (!selectedItem) return false;
        return 'unitsPerPackage' in selectedItem && typeof selectedItem.unitsPerPackage === 'number' && selectedItem.unitsPerPackage > 1;
    }, [selectedItem]);
    
    useEffect(() => {
        setItemId('');
        setPurchaseQuantity(1);
        setCost(0);
    }, [itemType]);

    const handleSubmit = () => {
        let finalUnitCost = 0;
        let finalTotalUnits = 0;

        if (isPackagePurchase) {
            const unitsPerPack = selectedItem?.unitsPerPackage || 1;
            finalUnitCost = cost / unitsPerPack;
            finalTotalUnits = purchaseQuantity * unitsPerPack;
        } else {
            finalTotalUnits = purchaseQuantity;
            finalUnitCost = purchaseQuantity > 0 ? cost / purchaseQuantity : 0;
        }

        if (!itemId || finalTotalUnits <= 0 || cost <= 0 || !isFinite(finalUnitCost)) {
            alert('Por favor, completa todos los campos con valores positivos.');
            return;
        }
        
        addManualPurchase({ itemType, itemId, quantity: finalTotalUnits, unitCost: finalUnitCost, supplierId: supplier.id });
        onClose();
    };

    const calculatedUnitCost = useMemo(() => {
        if (isPackagePurchase) {
            return cost > 0 ? cost / (selectedItem?.unitsPerPackage || 1) : null;
        }
        return cost > 0 && purchaseQuantity > 0 ? cost / purchaseQuantity : null;
    }, [isPackagePurchase, cost, purchaseQuantity, selectedItem]);

    return (
        <Modal title={`Registrar Compra Manual para ${supplier.name}`} onClose={onClose} size="lg">
            <div className="space-y-4">
                <div>
                    <Label>Tipo de Item</Label>
                    <select value={itemType} onChange={e => setItemType(e.target.value as any)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent">
                        <option value="ingredient">Insumo</option>
                        <option value="sku">SKU (Producto Comprado)</option>
                    </select>
                </div>
                <div>
                    <Label>Item</Label>
                    <select value={itemId} onChange={e => setItemId(e.target.value)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent">
                        <option value="">-- Seleccionar --</option>
                        {itemType === 'ingredient'
                            ? ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                            : skus.filter(s => !s.recipe || s.recipe.length === 0).map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                        }
                    </select>
                    {itemType === 'sku' && <p className="text-xs text-gray-400 mt-1">Solo se muestran SKUs comprados (sin receta).</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {isPackagePurchase ? (
                        <>
                            <div>
                                <Label>Cantidad de {selectedItem?.purchaseUnit || 'Paquetes'}</Label>
                                <Input type="number" value={purchaseQuantity} onChange={e => setPurchaseQuantity(Number(e.target.value) || 0)} min="1" />
                            </div>
                            <div>
                                <Label>Costo por {selectedItem?.purchaseUnit || 'Paquete'}</Label>
                                <Input type="number" value={cost} onChange={e => setCost(Number(e.target.value) || 0)} step="0.01" min="0"/>
                            </div>
                        </>
                    ) : (
                         <>
                            <div>
                                <Label>Cantidad de Unidades</Label>
                                <Input type="number" value={purchaseQuantity} onChange={e => setPurchaseQuantity(Number(e.target.value) || 0)} min="1" />
                            </div>
                            <div>
                                <Label>Costo TOTAL por estas Unidades</Label>
                                <Input type="number" value={cost} onChange={e => setCost(Number(e.target.value) || 0)} step="0.01" min="0"/>
                            </div>
                        </>
                    )}
                </div>

                {calculatedUnitCost !== null && (
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Costo por unidad calculado: <span className="font-bold text-gray-800 dark:text-gray-200">${calculatedUnitCost.toFixed(3)}</span></p>
                    </div>
                )}
                
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>Registrar Compra</Button></div>
            </div>
        </Modal>
    );
};

type LogisticsTab = 'management' | 'accountsPayable';
type SupplierDetailTab = 'details' | 'documents' | 'currentAccount';

export const Logistics: React.FC = () => {
  const { 
    ingredients, skus, suppliers, paymentOrders,
    addSupplier, updateSupplier, deleteSupplier,
    addDocument, updateDocument, deleteDocument, confirmInvoiceData,
    processPaymentOrder, getLatestIngredientCost
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<LogisticsTab>('management');
  const [supplierDetailTab, setSupplierDetailTab] = useState<SupplierDetailTab>('documents');
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formState, setFormState] = useState<Partial<Supplier>>({});

  const [reviewingDoc, setReviewingDoc] = useState<SupplierDocument | null>(null);
  const [showManualPurchase, setShowManualPurchase] = useState(false);
  
  const [priceAlertData, setPriceAlertData] = useState<{ changes: PriceChange[], onConfirm: () => void } | null>(null);


  useEffect(() => {
      if(activeTab === 'management' && suppliers.length > 0 && !selectedSupplierId) setSelectedSupplierId(suppliers[0].id);
      if(selectedSupplierId && !suppliers.some(s => s.id === selectedSupplierId)) setSelectedSupplierId(suppliers[0]?.id || null);
  }, [suppliers, selectedSupplierId, activeTab]);

  const selectedSupplier = useMemo(() => suppliers.find(s => s.id === selectedSupplierId), [selectedSupplierId, suppliers]);
  
  const handleSelectSupplier = (id: string) => { setSelectedSupplierId(id); setIsEditing(false); setSupplierDetailTab('documents'); };
  
  const handleEdit = () => { if (selectedSupplier) { setFormState(selectedSupplier); setIsEditing(true); } };

  const handleSave = () => {
    if(showAddForm) {
      if(!formState.name) return alert('El nombre es obligatorio');
      addSupplier(formState as Omit<Supplier, 'id' | 'documents' | 'mappingHistory'>);
      setShowAddForm(false);
    } else if (formState.id) { 
      updateSupplier(formState as Supplier); 
      setIsEditing(false);
    }
    setFormState({});
  };
  
  const handleViewDoc = (doc: SupplierDocument) => window.open(URL.createObjectURL(base64ToBlob(doc.content, doc.fileType)), '_blank');
  
  const handleDownloadDoc = (doc: SupplierDocument) => {
     const url = URL.createObjectURL(base64ToBlob(doc.content, doc.fileType));
     const link = document.createElement('a');
     link.href = url;
     link.download = doc.fileName;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (file: File) => {
      if (!selectedSupplier) return;
      const content = await toBase64(file);
      const uploadDateString = new Date().toISOString().split('T')[0];
      const newDocData: Omit<SupplierDocument, 'id'> = { 
        fileName: file.name, 
        fileType: file.type, 
        uploadDate: uploadDateString, 
        status: 'processing', 
        content,
        dueDate: uploadDateString, 
        paidAmount: 0,
        expenseCategory: 'Proveedores',
      };
      const newDoc = addDocument(selectedSupplier.id, newDocData);

      try {
          const extractedItems = await analyzeInvoice(content, file.type);
          const itemsWithIds: AnalyzedItem[] = extractedItems.map(item => {
              const mapping = selectedSupplier.mappingHistory[item.productName];
              const matchedId = mapping?.matchedId || null;
              const matchType = mapping?.matchType || null;
              
              const selectedEntity = matchType === 'ingredient' ? ingredients.find(i => i.id === matchedId) : skus.find(s => s.id === matchedId);
              const isPackage = !!(selectedEntity?.unitsPerPackage && selectedEntity.unitsPerPackage > 1);

              return { 
                ...item, 
                id: `item-${Date.now()}-${Math.random()}`, 
                matchType, 
                matchedId,
                packageQuantity: isPackage ? item.quantity : undefined,
                packagePrice: isPackage ? item.unitPrice : undefined,
              };
          });
          const updatedDoc: SupplierDocument = {...newDoc, status: 'pending_review', extractedItems: itemsWithIds };
          updateDocument(selectedSupplier.id, updatedDoc);
          setReviewingDoc(updatedDoc);
      } catch (error) {
          console.error(error);
          updateDocument(selectedSupplier.id, {...newDoc, status: 'error'});
      }
  };
  
  const handleReviewModalSave = (updatedDoc: SupplierDocument) => {
      if(!selectedSupplier) return;
      
      const allAssigned = updatedDoc.extractedItems?.every(item => item.matchedId !== null);
      
      const priceChanges: PriceChange[] = [];
      if (allAssigned && updatedDoc.extractedItems) {
          for (const item of updatedDoc.extractedItems) {
              if (item.matchType === 'ingredient' && item.matchedId) {
                  const ingredient = ingredients.find(i => i.id === item.matchedId);
                  if (ingredient) {
                      const oldCost = getLatestIngredientCost(ingredient);
                      const newCost = item.unitPrice;
                      if (oldCost > 0 && Math.abs(oldCost - newCost) > 0.001) {
                          priceChanges.push({ name: ingredient.name, oldCost, newCost });
                      }
                  }
              }
          }
      }

      const confirmAction = () => {
          if (allAssigned) {
              confirmInvoiceData(selectedSupplier.id, updatedDoc.id, updatedDoc.extractedItems!, updatedDoc.expenseCategory, updatedDoc.dueDate);
          } else {
              updateDocument(selectedSupplier.id, updatedDoc);
          }
          setReviewingDoc(null);
      };

      if (priceChanges.length > 0) {
          setPriceAlertData({ changes: priceChanges, onConfirm: confirmAction });
      } else {
          confirmAction();
      }
  };

  const getStatusIcon = (status: SupplierDocument['status']) => {
      switch(status) {
          case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500"><title>Procesando</title></Loader2>;
          case 'pending_review': return <Clock className="h-4 w-4 text-yellow-500"><title>Pendiente de revisión</title></Clock>;
          case 'approved': return <CheckCircle className="h-4 w-4 text-blue-500"><title>Aprobado para pagar</title></CheckCircle>;
          case 'in_payment_order': return <DollarSign className="h-4 w-4 text-orange-500"><title>En orden de pago</title></DollarSign>;
          case 'partially_paid': return <DollarSign className="h-4 w-4 text-green-500 opacity-70"><title>Parcialmente pagado</title></DollarSign>;
          case 'paid': return <CheckCircle className="h-4 w-4 text-green-500"><title>Pagado</title></CheckCircle>;
          case 'error': return <AlertTriangle className="h-4 w-4 text-red-500"><title>Error</title></AlertTriangle>;
          default: return <FileText className="h-4 w-4 text-gray-500"><title>Documento</title></FileText>;
      }
  }

  const handleRetryAnalysis = (doc: SupplierDocument) => {
      if(!selectedSupplier) return;
      updateDocument(selectedSupplier.id, { ...doc, status: 'processing' });
      setTimeout(async () => {
          try {
              const extractedItems = await analyzeInvoice(doc.content, doc.fileType);
              const itemsWithIds = extractedItems.map(item => ({...item, id: `item-${Date.now()}-${Math.random()}`}));
              const updatedDoc: SupplierDocument = {...doc, status: 'pending_review', extractedItems: itemsWithIds };
              updateDocument(selectedSupplier.id, updatedDoc);
              setReviewingDoc(updatedDoc);
          } catch(error) {
              updateDocument(selectedSupplier.id, {...doc, status: 'error'});
          }
      }, 500);
  };
  
  return (
    <>
        {priceAlertData && (
            <PriceChangeAlertModal
                isOpen={true}
                changes={priceAlertData.changes}
                onClose={() => setPriceAlertData(null)}
                onConfirm={() => {
                    if (priceAlertData.onConfirm) {
                        priceAlertData.onConfirm();
                    }
                    setPriceAlertData(null);
                }}
            />
        )}
        {reviewingDoc && selectedSupplier && <ReviewInvoiceModal doc={reviewingDoc} onSave={handleReviewModalSave} onClose={() => setReviewingDoc(null)} />}
        {showManualPurchase && selectedSupplier && <ManualPurchaseModal supplier={selectedSupplier} onClose={() => setShowManualPurchase(false)} />}
        
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button onClick={() => setActiveTab('management')} className={`${activeTab === 'management' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}><BookUser className="h-5 w-5"/>Gestión de Proveedores</button>
                <button onClick={() => setActiveTab('accountsPayable')} className={`${activeTab === 'accountsPayable' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}><Landmark className="h-5 w-5"/>Cuentas por Pagar</button>
            </nav>
        </div>
        
        {activeTab === 'management' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <Card className="lg:col-span-1 flex flex-col">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center"><BookUser className="mr-2 h-5 w-5"/>Proveedores</h2>
                        <Button size="sm" onClick={() => { setShowAddForm(true); setFormState({}); setSelectedSupplierId(null); setIsEditing(false); }}><PlusCircle className="h-4 w-4"/></Button>
                    </div>
                    <div className="overflow-y-auto">
                        {suppliers.map(s => (
                            <button key={s.id} onClick={() => handleSelectSupplier(s.id)} className={`w-full text-left p-4 border-l-4 transition-colors ${selectedSupplierId === s.id ? 'border-indigo-500 bg-gray-100 dark:bg-gray-700' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                <p className="font-semibold">{s.name}</p>
                                <p className="text-sm text-gray-500">{s.contactPerson}</p>
                            </button>
                        ))}
                    </div>
                </Card>
                <div className="lg:col-span-2 space-y-6">
                {(selectedSupplier || showAddForm) ? ( <>
                    <Card>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold">{showAddForm ? 'Nuevo Proveedor' : (isEditing ? 'Editando Proveedor' : selectedSupplier?.name)}</h3>
                            <div className="flex gap-2">
                                {isEditing || showAddForm ? (
                                    <>
                                    <Button size="sm" onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setShowAddForm(false); }}>Cancelar</Button>
                                    </>
                                ) : (
                                    <>
                                    <Button size="sm" variant="ghost" onClick={() => deleteSupplier(selectedSupplier!.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                    <Button size="sm" variant="ghost" onClick={handleEdit}><Edit className="mr-2 h-4 w-4"/>Editar</Button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input placeholder="Nombre" value={formState.name || ''} onChange={e => setFormState({...formState, name: e.target.value})} disabled={!isEditing && !showAddForm} />
                            <Input placeholder="Persona de Contacto" value={formState.contactPerson || ''} onChange={e => setFormState({...formState, contactPerson: e.target.value})} disabled={!isEditing && !showAddForm} />
                            <Input placeholder="Teléfono" value={formState.phone || ''} onChange={e => setFormState({...formState, phone: e.target.value})} disabled={!isEditing && !showAddForm} />
                            <Input placeholder="ID Fiscal (CUIT)" value={formState.taxId || ''} onChange={e => setFormState({...formState, taxId: e.target.value})} disabled={!isEditing && !showAddForm} />
                            <Input placeholder="Plazos de Pago" value={formState.paymentTerms || ''} onChange={e => setFormState({...formState, paymentTerms: e.target.value})} disabled={!isEditing && !showAddForm} />
                            <Input placeholder="Info de Entregas" value={formState.deliveryInfo || ''} onChange={e => setFormState({...formState, deliveryInfo: e.target.value})} disabled={!isEditing && !showAddForm} />
                        </div>
                    </Card>
                    {selectedSupplier && !showAddForm && (
                        <Card>
                            <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs"><button onClick={() => setSupplierDetailTab('documents')} className={`${supplierDetailTab === 'documents' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Documentos</button><button onClick={() => setSupplierDetailTab('currentAccount')} className={`${supplierDetailTab === 'currentAccount' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Cuenta Corriente</button></nav></div>
                            {supplierDetailTab === 'documents' && (
                                <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 space-y-2">
                                        <Label className="font-semibold">Cargar Nueva Factura</Label>
                                        <FileUploader onFileUpload={handleFileUpload} />
                                        <Button variant="ghost" className="w-full" onClick={() => setShowManualPurchase(true)}><ShoppingCart className="mr-2 h-4 w-4"/>Registrar Compra Manual</Button>
                                    </div>
                                    <div className="lg:col-span-2 max-h-96 overflow-y-auto pr-2 space-y-4">
                                        {Object.entries(selectedSupplier.documents.sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).reduce((acc, doc) => {
                                            const monthYear = new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long' }).format(new Date(doc.uploadDate));
                                            if (!acc[monthYear]) acc[monthYear] = [];
                                            acc[monthYear].push(doc);
                                            return acc;
                                        }, {} as Record<string, SupplierDocument[]>)).map(([monthYear, docs]) => (
                                            <div key={monthYear}>
                                                <h4 className="font-semibold text-sm text-gray-500 mb-2">{monthYear}</h4>
                                                <div className="space-y-2">
                                                    {docs.map(doc => (
                                                        <div key={doc.id} className="flex justify-between items-center p-2 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                                            <div className="flex items-center gap-3 flex-1 min-w-0" >
                                                                {getStatusIcon(doc.status)}
                                                                <div className="flex-1 min-w-0" onClick={() => (doc.status === 'pending_review' || doc.status === 'error') && setReviewingDoc(doc)}>
                                                                    <p className={`text-sm font-medium truncate ${(doc.status === 'pending_review' || doc.status === 'error') ? 'cursor-pointer hover:underline' : ''}`}>{doc.fileName}</p>
                                                                    <p className="text-xs text-gray-500">{new Date(doc.uploadDate + 'T00:00:00').toLocaleDateString()} {doc.totalAmount ? `- $${doc.totalAmount.toFixed(2)}` : ''}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {doc.status === 'error' && <Button variant="ghost" size="sm" onClick={() => handleRetryAnalysis(doc)} title="Reintentar Análisis"><RefreshCw className="h-4 w-4"/></Button>}
                                                                <Button variant="ghost" size="sm" onClick={() => handleViewDoc(doc)}><Eye className="h-4 w-4"/></Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleDownloadDoc(doc)}><Download className="h-4 w-4"/></Button>
                                                                <Button variant="ghost" size="sm" onClick={() => deleteDocument(selectedSupplier.id, doc.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {selectedSupplier.documents.length === 0 && <p className="text-sm text-gray-500 text-center py-10">No hay documentos para este proveedor.</p>}
                                    </div>
                                </div>
                            )}
                            {supplierDetailTab === 'currentAccount' && (
                                <div className="p-4">
                                    <SupplierCurrentAccount supplier={selectedSupplier} paymentOrders={paymentOrders} />
                                </div>
                            )}
                        </Card>
                    )}
                </>)
                : ( <div className="flex items-center justify-center h-full"><p className="text-gray-500">Selecciona un proveedor para ver sus detalles o añade uno nuevo.</p></div>)}
                </div>
            </div>
        )}
        {activeTab === 'accountsPayable' && <AccountsPayableTab suppliers={suppliers} processPaymentOrder={processPaymentOrder} />}
    </>
  );
};
