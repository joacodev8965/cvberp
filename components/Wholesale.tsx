
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import * as XLSX from 'xlsx';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { analyzeWholesaleOrderFile } from '../services/geminiService';
import { SKU, Store, ProductionPlanItem, Remito, RemitoItem } from '../types';
import { Upload, Truck, Loader2, AlertCircle, Trash2, Printer, Download, CheckCircle, FileText, ChevronLeft, ChevronRight, Clock, XCircle, FileWarning, ChevronDown, Save } from 'lucide-react';
import { PrintRemito } from './ui/PrintRemito';
import { useAppContext } from '../App';
import { ProductionPlanner } from './ProductionPlanner';


// --- Types for this component ---
interface UploadQueueItem {
    id: string;
    fileContent: string;
    storeId: string;
    storeName: string;
    fileName: string;
    status: 'queued' | 'analyzing' | 'completed' | 'error';
    progress: number;
    error?: string;
    targetWeekStart: string;
}


// --- Helper Functions & Data ---
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

const WHOLESALE_TEMPLATE_DATA = [
    ['PRODUCTO', 'CATEGORÍA', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO', 'TOTALES'],
    ['ZEPELIN DE MASA BLANCO', 'BOULANGERIE'], ['ZEPELIN DE MASA MADRE INTEGRAL', 'BOULANGERIE'], ['PAN CENTENO 30%', 'BOULANGERIE'], ['PAN CENTENO 100%', 'BOULANGERIE'], ['BAGUETIN INTEGRAL', 'BOULANGERIE'], ['BAGUETIN BLANCO', 'BOULANGERIE'], ['BAGUETTE BLANCO', 'BOULANGERIE'], ['BAGUETTE INTEGRAL', 'BOULANGERIE'], ['CIABATTA', 'BOULANGERIE'], ['CIABATTA PIZZA', 'BOULANGERIE'], ['CREMONA', 'BOULANGERIE'], ['FOCACCIA RELLENA', 'BOULANGERIE'], ['FOCACCIA CON POMODORO Y PESTO DE ALBAHACA', 'BOULANGERIE'], ['CROISSANTS', 'VIENNOISERIE'], ['CROISSANT CON ALMENDRAS', 'VIENNOISERIE'], ['CHAUSSON DE MANZANA', 'VIENNOISERIE'], ['MEDIALUNAS INTEGRALES', 'VIENNOISERIE'], ['MEDIALUNAS DE GRASA SIN GRASA', 'VIENNOISERIE'], ['MEDIALUNA NOT MANTECA', 'VIENNOISERIE'], ['MEDIALUNA INTEGRAL CON CREMA DE DULCE DE LECHE', 'VIENNOISERIE'], ['MEDIALUNA INTEGRAL CON CREMA DE CAFÉ Y PISTACHO', 'VIENNOISERIE'], ['MEDIALUNA INTEGRAL CON CREMA PASTELERA', 'VIENNOISERIE'], ['MEDIALUNA INTEGRAL CON CREMA DE CHOCOLATE', 'VIENNOISERIE'], ['BROWNIE', 'VIENNOISERIE'], ['PAIN AU CHOCOLAT', 'VIENNOISERIE'], ['ROL DE ARÁNDANOS', 'VIENNOISERIE'], ['CINNAMON ROLL', 'VIENNOISERIE'], ['SCON DE QUESO', 'VIENNOISERIE'], ['ALFAJOR DE DULCE DE LECHE', 'VIENNOISERIE'], ['PEPAS DE CHÍA', 'VIENNOISERIE'], ['TORTITA NEGRA', 'VIENNOISERIE'], ['LIBRITO', 'VIENNOISERIE'], ['BUDÍN DE ZANAHORIA', 'BUDINES Y TORTAS'], ['BUDÍN DE BANANA', 'BUDINES Y TORTAS'], ['BUDÍN DE MANZANA Y PERA', 'BUDINES Y TORTAS'], ['10 CM APPLE CRUMBLE', 'BUDINES Y TORTAS'], ['10 CM ALFACOOKIE CON CREMA', 'BUDINES Y TORTAS'], ['14 CM ALFACOOKIE CON CREMA', 'BUDINES Y TORTAS'], ['14 CM TORTA CHOCO, CREMA Y DDL', 'BUDINES Y TORTAS'], ['TRUFA DE CHOCOLATE', 'BUDINES Y TORTAS'], ['BARRITA DE CHOCOLATE, JENGIBRE Y NARANJA', 'BUDINES Y TORTAS'], ['PAN DE MOLDE DE PAPA', 'PANES DE MOLDE – NO EMPAQUETADO'], ['PAN DE MOLDE BLANCO', 'PANES DE MOLDE – NO EMPAQUETADO'], ['PAN DE MOLDE INTEGRAL', 'PANES DE MOLDE – NO EMPAQUETADO'], ['BAGELS', 'PANES DE BURGER – NO EMPAQUETADO'], ['PAN DE BURGER CON QUESO GRATINADO', 'PANES DE BURGER – NO EMPAQUETADO'], ['PAN DE BURGER INTEGRAL', 'PANES DE BURGER – NO EMPAQUETADO'], ['CRACKERS DE SEMILLAS', 'PANES DE BURGER – NO EMPAQUETADO'], ['PREPIZZA DE MASA MADRE CON POMODORO', 'PIZZAS'], ['PREPIZZA DE MASA MADRE CON QUESO VEGANO DE CASTAÑAS', 'PIZZAS'], ['ENSALADA FALAFEL', 'ENSALADAS'], ['BURRITO', 'WRAPS'], ['VERDURAS', 'EMPANADAS'], ['CRIOLLA', 'EMPANADAS'], ['PUERROS', 'TARTAS'], ['CALABAZA', 'TARTAS'], ['SANDWICH BURGER', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['SANDWICH CAPRESSE', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['MALFATTI', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['DIPS RANCHERA SPICY', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['DIPS MAYONESA DE AJO Y CILANTRO', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['GNOCCHI DE PAPA 500 GR', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['GNOCCHI DE ESPINACA 500 GR', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['RAVIOLES DE VERDURA x1 plancha', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['RAVIOLES DE CALABAZA x1 plancha', 'SÁNDWICHES / ROLL / SUSHI / DIPS'], ['SALSA FILETTO 400 GR', 'SÁNDWICHES / ROLL / SUSHI / DIPS'],
];

// --- Sub-components ---
const EditableRemitoCard: React.FC<{
    remito: Remito;
    onSave: (updatedRemito: Remito) => void;
    onPrint: (remito: Remito) => void;
    onDelete: (remitoId: string) => void;
}> = ({ remito, onSave, onPrint, onDelete }) => {
    const { skus } = useAppContext();
    const [editableRemito, setEditableRemito] = useState(remito);
    const originalRemitoRef = useRef(remito); // To compare changes for stock validation

    const onItemChange = (skuId: string, field: keyof RemitoItem, value: number) => {
        setEditableRemito(prev => ({
            ...prev,
            items: prev.items.map(item => item.skuId === skuId ? { ...item, [field]: value } : item)
        }));
    };

    const handleSave = () => {
        onSave(editableRemito);
    }
    
    return (
        <Card className="flex-shrink-0 flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-start">
                <div><h4 className="font-semibold">{remito.storeName}</h4><p className="text-sm text-gray-500">{new Date(remito.date + 'T00:00:00').toLocaleDateString()}</p></div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handleSave} title="Guardar Cambios"><Save className="h-4 w-4 text-indigo-500"/></Button>
                    <Button size="sm" variant="ghost" onClick={() => onPrint(remito)} title="Imprimir"><Printer className="h-4 w-4"/></Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(remito.id)} title="Eliminar Remito"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                </div>
            </div>
            <div className="overflow-y-auto max-h-96 flex-grow"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead></TableRow></TableHeader><TableBody>{editableRemito.items.map(item => {
                const sku = skus.find(s => s.id === item.skuId);
                const originalQty = originalRemitoRef.current.items.find(i => i.skuId === item.skuId)?.quantity || 0;
                const availableStock = sku ? sku.quantityInStock + (originalQty - item.quantity) : 0;
                return (
                <TableRow key={item.skuId}>
                    <TableCell className="font-medium text-sm py-1 px-2">
                        {item.skuName}
                        {sku && sku.quantityInStock > 0 && <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Disp: {sku.quantityInStock})</span>}
                    </TableCell>
                    <TableCell className="py-1 px-2">
                        <Input type="number" defaultValue={item.quantity} onChange={e => onItemChange(item.skuId, 'quantity', Number(e.target.value))} className="w-20 h-8"/>
                    </TableCell>
                    <TableCell className="py-1 px-2">
                        <Input type="number" defaultValue={item.unitPrice} onChange={e => onItemChange(item.skuId, 'unitPrice', Number(e.target.value))} className="w-20 h-8" step="0.01"/>
                    </TableCell>
                </TableRow>
            )})}</TableBody></Table></div>
        </Card>
    );
};

// --- Main Component ---
export const Wholesale: React.FC = () => {
    // --- State & Context ---
    const { skus, stores, remitos, addRemitos, updateRemito, deleteRemito } = useAppContext();
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
    const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
    const [selectedStoreForUpload, setSelectedStoreForUpload] = useState<string>('');
    const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
    const [expandedRemitoStores, setExpandedRemitoStores] = useState<Set<string>>(new Set());
    const timersRef = useRef<{ progress: ReturnType<typeof setInterval> | null, removal: ReturnType<typeof setTimeout> | null }>({ progress: null, removal: null });

    // --- Derived State & Memoized Calculations ---
    const { weeks, remitoStatus, completionPercentage, currentWeek } = useMemo(() => {
        const weeks = getWeeksInMonth(currentDisplayMonth);
        const today = new Date();
        const status = new Map<string, Set<string>>();
        remitos.forEach(remito => {
            const remitoDate = new Date(remito.date + 'T00:00:00');
            const store = stores.find(s => s.name === remito.storeName);
            if (!store) return;
            const week = weeks.find(w => remitoDate >= w.start && remitoDate <= w.end);
            if (week) {
                if (!status.has(store.id)) status.set(store.id, new Set());
                status.get(store.id)?.add(week.id);
            }
        });
        const currentWeek = weeks.find(w => today >= w.start && today <= w.end);
        let perc = 0;
        if (currentWeek && stores.length > 0) {
            const completedStores = stores.filter(store => status.get(store.id)?.has(currentWeek.id)).length;
            perc = (completedStores / stores.length) * 100;
        }
        return { weeks, remitoStatus: status, completionPercentage: perc, currentWeek };
    }, [remitos, stores, currentDisplayMonth]);
    
    const remitosForWeek = useMemo(() => {
        if (!selectedWeekId) return [];
        const selectedWeek = weeks.find(w => w.id === selectedWeekId);
        if (!selectedWeek) return [];
        return remitos.filter(r => {
            const remitoDate = new Date(r.date + 'T00:00:00');
            return remitoDate >= selectedWeek.start && remitoDate <= selectedWeek.end;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [remitos, selectedWeekId, weeks]);
    
    const remitosByStore = useMemo(() => {
        return remitosForWeek.reduce((acc, remito) => {
            if (!acc[remito.storeName]) {
                acc[remito.storeName] = [];
            }
            acc[remito.storeName].push(remito);
            return acc;
        }, {} as Record<string, Remito[]>);
    }, [remitosForWeek]);
    
    // --- Handlers ---
    const handleAddFileToQueue = async (file: File, storeId: string, targetWeekStart: string) => {
        const storeName = stores.find(s => s.id === storeId)?.name;
        if (!file || !storeId || !storeName) return;
        
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (!result) { console.error("Could not read file content."); return; }
            let fileContent = '';
            try {
                if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                    const workbook = XLSX.read(result, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    fileContent = XLSX.utils.sheet_to_csv(worksheet);
                } else {
                    fileContent = result as string;
                }
                const newQueueItem: UploadQueueItem = {
                    id: `q-${Date.now()}`, fileContent, storeId, storeName,
                    fileName: file.name, status: 'queued', progress: 0, targetWeekStart,
                };
                setUploadQueue(prev => [...prev, newQueueItem]);
            } catch (err) { console.error("Error processing file:", err); }
        };
        reader.onerror = (error) => console.error('Error reading file:', error);
        if (fileExtension === 'xlsx' || fileExtension === 'xls') reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
    };

    // --- Effects ---
    useEffect(() => {
        if (!selectedWeekId && currentWeek) setSelectedWeekId(currentWeek.id);
        else if (!selectedWeekId && weeks.length > 0) setSelectedWeekId(weeks[0].id);
    }, [currentWeek, weeks, selectedWeekId]);

    useEffect(() => {
        const processNextItem = async () => {
            const nextItem = uploadQueue.find(item => item.status === 'queued');
            if (!nextItem) {
                setIsProcessingQueue(false);
                return;
            }

            setUploadQueue(prev => prev.map(item => item.id === nextItem.id ? { ...item, status: 'analyzing', progress: 0 } : item));
            
            const progressInterval = setInterval(() => {
                setUploadQueue(prev => prev.map(item =>
                    item.id === nextItem.id && item.status === 'analyzing'
                        ? { ...item, progress: Math.min(item.progress + 5, 95) }
                        : item
                ));
            }, 200);

            try {
                const wholesaleOrders = await analyzeWholesaleOrderFile(nextItem.fileContent, skus, nextItem.storeName, nextItem.targetWeekStart);
                const newRemitos: Remito[] = wholesaleOrders.map(order => ({
                    id: `${order.storeName.replace(/\s/g, '')}-${order.date}-${Math.random().toString(36).substr(2, 5)}`,
                    storeName: order.storeName,
                    date: order.date,
                    items: order.items.map(item => {
                        const sku = skus.find(s => s.name.toLowerCase() === item.skuName.toLowerCase());
                        return { skuId: sku?.id || 'not-found', skuName: item.skuName, quantity: item.quantity, unitPrice: sku?.salePrice || 0, ivaRate: 21, discountPercentage: 0 };
                    }),
                    status: 'unpaid', paidAmount: 0, discount: 0,
                }));
                addRemitos(newRemitos);
                setUploadQueue(prev => prev.map(item => item.id === nextItem.id ? { ...item, status: 'completed', progress: 100 } : item));
            } catch (error) {
                console.error('Error analyzing wholesale order:', error);
                setUploadQueue(prev => prev.map(item => item.id === nextItem.id ? { ...item, status: 'error', error: (error as Error).message, progress: 100 } : item));
            } finally {
                clearInterval(progressInterval);
                setTimeout(() => setUploadQueue(prev => prev.filter(q => q.id !== nextItem.id)), 5000);
                setTimeout(processNextItem, 500); // Process next with a small delay
            }
        };

        if (!isProcessingQueue && uploadQueue.some(item => item.status === 'queued')) {
            setIsProcessingQueue(true);
            processNextItem();
        }
    }, [uploadQueue, isProcessingQueue, skus, addRemitos]);

    // --- Other Handlers ---
    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentDisplayMonth(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
            return newDate;
        });
        setSelectedWeekId(null);
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet(WHOLESALE_TEMPLATE_DATA);
        ws['!cols'] = [{wch: 35}, {wch: 25}, ...Array(8).fill({wch: 10})];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
        XLSX.writeFile(wb, "Plantilla_Pedidos_Mayorista.xlsx");
    };

    const handlePrintRemito = (remitoToPrint: Remito) => {
        const store = stores.find(s => s.name === remitoToPrint.storeName);
        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Imprimir Remito</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="print-root"></div></body></html>`);
            printWindow.document.close();
            const printRoot = printWindow.document.getElementById('print-root');
            if (printRoot) {
                ReactDOM.createRoot(printRoot).render(<PrintRemito remito={remitoToPrint} store={store} />);
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
            }
        }
    };

    const toggleStoreExpansion = (storeName: string) => {
        setExpandedRemitoStores(prev => {
            const newSet = new Set(prev);
            if (newSet.has(storeName)) newSet.delete(storeName); else newSet.add(storeName);
            return newSet;
        });
    };
    
    const handleSaveRemito = (updatedRemito: Remito) => {
        const originalRemito = remitos.find(r => r.id === updatedRemito.id);
        if (originalRemito) updateRemito(updatedRemito, originalRemito);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold flex items-center"><Truck className="mr-2 h-6 w-6 text-indigo-500"/>Pedidos Mayoristas</h2>
                    <Button variant="ghost" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/>Descargar Plantilla</Button>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>1. Selecciona Local</Label><select value={selectedStoreForUpload} onChange={e => setSelectedStoreForUpload(e.target.value)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option value="">Seleccionar...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><Label>2. Selecciona Semana</Label><select value={selectedWeekId || ''} onChange={e => setSelectedWeekId(e.target.value)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent">{weeks.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}</select></div>
                    <div><Label>3. Sube el Archivo</Label><Input type="file" onChange={e => setSelectedFileForUpload(e.target.files?.[0] || null)} className="pt-1.5"/></div>
                </div>
                <div className="p-4 border-t dark:border-gray-700"><Button className="w-full" onClick={() => selectedFileForUpload && selectedStoreForUpload && selectedWeekId && handleAddFileToQueue(selectedFileForUpload, selectedStoreForUpload, weeks.find(w=>w.id===selectedWeekId)!.start.toISOString().split('T')[0])} disabled={!selectedFileForUpload || !selectedStoreForUpload || !selectedWeekId || isProcessingQueue}><Upload className="mr-2 h-4 w-4"/>Procesar Pedido</Button></div>
                 {uploadQueue.length > 0 && <div className="p-4 border-t dark:border-gray-700 space-y-2">{uploadQueue.map(item => (<div key={item.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md"><div className="flex justify-between items-center text-sm"><p className="font-medium">{item.fileName} ({item.storeName})</p><div className="flex items-center gap-2">{item.status === 'queued' && <Clock className="h-4 w-4 text-gray-500"/>}{item.status === 'analyzing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500"/>}{item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500"/>}{item.status === 'error' && <XCircle className="h-4 w-4 text-red-500"/>}<span className="capitalize">{item.status}</span></div></div>{item.status === 'analyzing' && <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700"><div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${item.progress}%`}}></div></div>}{item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}</div>))}</div>}
            </Card>

            <Card>
                <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4"><h3 className="text-lg font-bold">Estado de Pedidos por Semana</h3><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => handleMonthChange('prev')}><ChevronLeft/></Button><span className="font-semibold w-32 text-center capitalize">{currentDisplayMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span><Button variant="ghost" size="sm" onClick={() => handleMonthChange('next')}><ChevronRight/></Button></div></div>
                <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Local</TableHead>{weeks.map(week => <TableHead key={week.id} className={`text-center transition-colors ${week.id === selectedWeekId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}><button className="w-full" onClick={() => setSelectedWeekId(week.id)}>{week.label}</button></TableHead>)}</TableRow></TableHeader><TableBody>{stores.map(store => (<TableRow key={store.id}><TableCell className="font-semibold">{store.name}</TableCell>{weeks.map(week => (<TableCell key={week.id} className={`text-center transition-colors ${week.id === selectedWeekId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>{remitoStatus.get(store.id)?.has(week.id) ? <CheckCircle className="h-5 w-5 mx-auto text-green-500"/> : <FileWarning className="h-5 w-5 mx-auto text-yellow-500"/>}</TableCell>))}</TableRow>))}</TableBody></Table></div>
            </Card>

            {selectedWeekId && <Card><div className="p-4 border-b dark:border-gray-700"><h3 className="text-lg font-bold">Remitos para la Semana: {weeks.find(w=>w.id===selectedWeekId)?.label}</h3></div><div className="p-4 space-y-4">{Object.keys(remitosByStore).length > 0 ? (Object.entries(remitosByStore).map(([storeName, remitos]) => (<Card key={storeName} className="bg-gray-50 dark:bg-gray-800/50"><div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleStoreExpansion(storeName)}><h4 className="font-semibold text-lg">{storeName}</h4><div className="flex items-center gap-2"><span className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">{remitos.length} remitos</span><ChevronDown className={`h-5 w-5 transition-transform ${expandedRemitoStores.has(storeName) ? 'rotate-180' : ''}`}/></div></div>{expandedRemitoStores.has(storeName) && (<div className="p-4 border-t dark:border-gray-700 flex gap-4 overflow-x-auto">{remitos.map(remito => <EditableRemitoCard key={remito.id} remito={remito} onSave={handleSaveRemito} onPrint={handlePrintRemito} onDelete={deleteRemito}/>)}</div>)}</Card>))) : (<p className="text-center text-gray-500 py-8">No hay remitos para la semana seleccionada.</p>)}</div></Card>}
            
            <ProductionPlanner showManualCalculator={false} remitosToShow={remitosForWeek} />
        </div>
    );
};
