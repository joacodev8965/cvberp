

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Store, HistoricalSale } from '../types';
import { analyzeSalesFileForHistory } from '../services/geminiService';
import { PlusCircle, Trash2, Edit, Save, Upload, Loader2, AlertCircle, FileText, Store as StoreIcon } from 'lucide-react';
import { useAppContext } from '../App';
import { useToast } from './ui/Toast';

const paymentTermOptions = [
    { label: 'Pago Contado (al día)', value: 0 }, { label: '1 día', value: 1 }, { label: '5 días', value: 5 },
    { label: '7 días', value: 7 }, { label: '10 días', value: 10 }, { label: '15 días', value: 15 },
    { label: '30 días', value: 30 }, { label: '45 días', value: 45 }, { label: '60 días', value: 60 },
    { label: '90 días', value: 90 }, { label: '120 días', value: 120 }, { label: '180 días', value: 180 },
];

export const LocationsAndSales: React.FC = () => {
  const { stores, setStores, historicalSales, setHistoricalSales } = useAppContext();
  const { showToast } = useToast();
  
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeFormData, setStoreFormData] = useState({ name: '', address: '', paymentTerms: 30 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStoreForUpload, setSelectedStoreForUpload] = useState<string>('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>('all');

  useEffect(() => {
    if (!viewingStoreId && stores.length > 0) setViewingStoreId(stores[0].id);
    if (viewingStoreId && !stores.some(s => s.id === viewingStoreId)) setViewingStoreId(stores.length > 0 ? stores[0].id : null);
  }, [stores, viewingStoreId]);
  
  const onAddStore = (store: Omit<Store, 'id'>) => { setStores(prev => [...prev, { ...store, id: `store-${Date.now()}` }]); showToast('Local añadido', 'success'); };
  const onUpdateStore = (updatedStore: Store) => { setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s)); showToast('Local actualizado', 'success'); };
  const onDeleteStore = (storeId: string) => { if (window.confirm('¿Estás seguro? Se eliminarán también las ventas asociadas.')) { setStores(prev => prev.filter(s => s.id !== storeId)); setHistoricalSales(prev => prev.filter(hs => hs.storeId !== storeId)); showToast('Local eliminado', 'success'); }};
  const onAddSales = (sales: HistoricalSale[]) => { setHistoricalSales(prev => [...prev, ...sales]); showToast(`${sales.length} registros de ventas importados`, 'success'); };

  const handleEdit = (store: Store) => { setEditingStoreId(store.id); setStoreFormData({ name: store.name, address: store.address, paymentTerms: store.paymentTerms }); setShowAddForm(false); };
  const handleCancelEdit = () => { setEditingStoreId(null); setStoreFormData({ name: '', address: '', paymentTerms: 30 }); };
  const handleSave = () => {
    if (!storeFormData.name) { alert('El nombre del local es obligatorio.'); return; }
    if (editingStoreId) { onUpdateStore({ id: editingStoreId, ...storeFormData }); handleCancelEdit(); } 
    else { onAddStore(storeFormData); setShowAddForm(false); setStoreFormData({ name: '', address: '', paymentTerms: 30 }); }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      reader.onload = (e) => {
          const result = e.target?.result;
          if (!result) { setError('Error al leer el archivo.'); return; }
          let textContent = '';
          try {
              if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                  const workbook = XLSX.read(result, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[sheetName];
                  textContent = XLSX.utils.sheet_to_csv(worksheet);
              } else { textContent = result as string; }
              setFileContent(textContent); setFileName(file.name); setError('');
          } catch (err) { console.error("Error processing file:", err); setError("No se pudo procesar el archivo. Asegúrate que el formato sea correcto."); }
      };
      reader.onerror = () => setError('No se pudo leer el archivo.');
      if (fileExtension === 'xlsx' || fileExtension === 'xls') reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
  };

  const handleAnalyzeAndSave = async () => {
    if (!selectedStoreForUpload) { setError('Por favor, selecciona un local para asociar las ventas.'); return; }
    if (!fileContent) { setError('No se ha cargado ningún archivo.'); return; }
    setIsLoading(true); setError('');
    try {
      const newSales = await analyzeSalesFileForHistory(fileContent, selectedStoreForUpload);
      onAddSales(newSales);
      setFileContent(null); setFileName(''); setSelectedStoreForUpload('');
      const fileInput = document.getElementById('sales-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e) { setError((e as Error).message); } finally { setIsLoading(false); }
  };
  
  const salesCountByStore = (storeId: string) => historicalSales.filter(s => s.storeId === storeId).length;
  const selectStoreForViewing = (storeId: string) => { setViewingStoreId(storeId); setActiveMonth('all'); };
  const salesForViewingStore = useMemo(() => viewingStoreId ? historicalSales.filter(s => s.storeId === viewingStoreId) : [], [historicalSales, viewingStoreId]);
  const availableMonths = useMemo(() => Array.from(new Set(salesForViewingStore.map(s => s.datetime.substring(0, 7)))).sort((a,b) => b.localeCompare(a)), [salesForViewingStore]);
  const displayedSales = useMemo(() => activeMonth === 'all' ? salesForViewingStore : salesForViewingStore.filter(s => s.datetime.startsWith(activeMonth)), [salesForViewingStore, activeMonth]);
  const viewingStoreName = useMemo(() => stores.find(s => s.id === viewingStoreId)?.name || '', [stores, viewingStoreId]);

  return (
    <div className="space-y-8">
      <Card>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold flex items-center"><StoreIcon className="mr-2 h-5 w-5"/>Gestión de Locales</h2>{!showAddForm && <Button onClick={() => { setShowAddForm(true); setEditingStoreId(null); }}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Local</Button>}</div>
        {showAddForm && (<div className="p-4 space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><div><Label htmlFor="storeName">Nombre del Local</Label><Input id="storeName" value={storeFormData.name} onChange={e => setStoreFormData({...storeFormData, name: e.target.value})} placeholder="Sucursal Centro"/></div><div><Label htmlFor="storeAddress">Dirección</Label><Input id="storeAddress" value={storeFormData.address} onChange={e => setStoreFormData({...storeFormData, address: e.target.value})} placeholder="Av. Principal 123"/></div><div><Label htmlFor="storePaymentTerms">Acuerdo de Pago</Label><select id="storePaymentTerms" value={storeFormData.paymentTerms} onChange={e => setStoreFormData({ ...storeFormData, paymentTerms: Number(e.target.value) })} className="w-full h-10 px-3 py-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500">{paymentTermOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div></div><div className="flex gap-2 mt-2"><Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar</Button><Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button></div></div>)}
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Dirección</TableHead><TableHead>Acuerdo de Pago</TableHead><TableHead>Ventas Registradas</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader><TableBody>{stores.map(store => (editingStoreId === store.id ? (<TableRow key={store.id}><TableCell><Input value={storeFormData.name} onChange={e => setStoreFormData({...storeFormData, name: e.target.value})}/></TableCell><TableCell><Input value={storeFormData.address} onChange={e => setStoreFormData({...storeFormData, address: e.target.value})}/></TableCell><TableCell><select value={storeFormData.paymentTerms} onChange={e => setStoreFormData({ ...storeFormData, paymentTerms: Number(e.target.value) })} className="w-full h-10 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500">{paymentTermOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></TableCell><TableCell>{salesCountByStore(store.id)}</TableCell><TableCell className="text-center"><div className="flex justify-center gap-2"><Button size="sm" onClick={handleSave}><Save className="h-4 w-4"/></Button><Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancelar</Button></div></TableCell></TableRow>) : (<TableRow key={store.id} onClick={() => selectStoreForViewing(store.id)} className={`cursor-pointer transition-colors ${viewingStoreId === store.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-100/50 dark:hover:bg-gray-700/50'}`}><TableCell className="font-medium">{store.name}</TableCell><TableCell>{store.address}</TableCell><TableCell>{paymentTermOptions.find(o => o.value === store.paymentTerms)?.label || `${store.paymentTerms} días`}</TableCell><TableCell>{salesCountByStore(store.id)}</TableCell><TableCell className="text-center"><div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="sm" onClick={() => handleEdit(store)}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="sm" onClick={() => onDeleteStore(store.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div></TableCell></TableRow>)))}</TableBody></Table></div>
      </Card>
      <Card>
        <div className="p-4 border-b dark:border-gray-700"><h2 className="text-xl font-bold flex items-center"><Upload className="mr-2 h-5 w-5"/>Subir Historial de Ventas</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sube un archivo (Excel, CSV, TXT) con las transacciones para un local específico.</p></div>
        <div className="p-4 space-y-4">{error && (<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500"/><p className="text-sm text-red-700 dark:text-red-200">{error}</p></div>)}<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label htmlFor="store-select-upload">Asociar ventas al local:</Label><select id="store-select-upload" value={selectedStoreForUpload} onChange={e => setSelectedStoreForUpload(e.target.value)} className="w-full h-10 px-3 py-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" disabled={stores.length === 0}><option value="">Selecciona un local...</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div><div><Label htmlFor="sales-file-upload">Archivo de ventas:</Label><Input id="sales-file-upload" type="file" onChange={handleFileChange} accept=".csv,.txt,.xlsx,.xls" className="pt-2"/></div></div>{fileName && <div className="flex items-center gap-2 text-sm text-gray-500"><FileText className="h-4 w-4"/><span>{fileName}</span></div>}<Button onClick={handleAnalyzeAndSave} disabled={isLoading || !fileContent || !selectedStoreForUpload}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Procesando...</> : 'Analizar y Guardar Ventas'}</Button></div>
      </Card>
      <Card>
        <div className="p-4 border-b dark:border-gray-700"><h2 className="text-xl font-bold">Historial de Ventas para: <span className="text-indigo-500">{viewingStoreName || 'Ningún local seleccionado'}</span></h2></div>
        {viewingStoreId ? (<><div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-2"><Button variant={activeMonth === 'all' ? 'default' : 'ghost'} onClick={() => setActiveMonth('all')}>Todos los Meses</Button>{availableMonths.map(month => (<Button key={month} variant={activeMonth === month ? 'default' : 'ghost'} onClick={() => setActiveMonth(month)}>{new Date(`${month}-02T00:00:00`).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</Button>))}</div><div className="overflow-x-auto max-h-[500px]"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Precio Unitario</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{displayedSales.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center p-6">No hay ventas registradas para este período.</TableCell></TableRow>) : (displayedSales.sort((a,b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()).map(sale => (<TableRow key={sale.id}><TableCell>{new Date(sale.datetime).toLocaleDateString()}</TableCell><TableCell className="font-medium">{sale.skuName}</TableCell><TableCell className="text-right">{sale.quantity}</TableCell><TableCell className="text-right">${sale.unitPrice.toFixed(2)}</TableCell><TableCell className="text-right font-semibold">${(sale.quantity * sale.unitPrice).toFixed(2)}</TableCell></TableRow>)))}</TableBody></Table></div></>) : (<div className="p-6 text-center text-gray-500">Selecciona un local de la lista para ver su historial de ventas, o añade uno nuevo para empezar.</div>)}
      </Card>
    </div>
  );
};
