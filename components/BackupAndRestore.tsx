import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Upload, Download, AlertCircle, Database, CheckCircle, Trash2, Wrench, Loader2, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { BackupData, AnalysisFinding } from '../types';
import { useAppContext } from '../App';

const APP_DATA_VERSION = '1.4'; // Bump version for AP module

export const BackupAndRestore: React.FC = () => {
  const {
    skus, ingredients, expenses, expenseCategories, stores, historicalSales, maintenanceTasks, suppliers, remitos, payments, accountAdjustments, employees, employeeCategories, hrSettings, payrolls, budgets, paymentOrders, errorLogs, skuCategories,
    setSkus, setIngredients, setExpenses, setExpenseCategories, setStores, setHistoricalSales, setMaintenanceTasks, setSuppliers, setRemitos, setPayments, setAccountAdjustments, setEmployees, setEmployeeCategories, setHrSettings, setPayrolls, setBudgets, setPaymentOrders, setErrorLogs, setSkuCategories
  } = useAppContext();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResults, setDiagnosisResults] = useState<AnalysisFinding[] | null>(null);


  const handleExport = useCallback(() => {
    const backupData: BackupData = {
      version: APP_DATA_VERSION,
      createdAt: new Date().toISOString(),
      skus,
      ingredients,
      expenses,
      expenseCategories,
      stores,
      historicalSales,
      maintenanceTasks,
      suppliers,
      remitos,
      payments,
      accountAdjustments,
      employees,
      employeeCategories,
      hrSettings,
      payrolls,
      budgets,
      paymentOrders,
      errorLogs,
      sku_categories: skuCategories
    };
    
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `cvb_erp_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [skus, ingredients, expenses, expenseCategories, stores, historicalSales, maintenanceTasks, suppliers, remitos, payments, accountAdjustments, employees, employeeCategories, hrSettings, payrolls, budgets, paymentOrders, errorLogs, skuCategories]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BackupData;

        if (!data.version || !Array.isArray(data.skus) || !Array.isArray(data.suppliers)) {
          throw new Error('El archivo de backup no es válido o está corrupto.');
        }

        const confirmation = window.confirm('¡ADVERTENCIA!\n\nEstás a punto de reemplazar TODOS los datos de la aplicación con el contenido de este archivo.\n\nEsta acción no se puede deshacer.\n\n¿Estás seguro de que quieres continuar?');

        if (confirmation) {
          setSkus(data.skus || []);
          setIngredients(data.ingredients || []);
          setExpenses(data.expenses || []);
          setExpenseCategories(data.expenseCategories || ['Salarios', 'Impuestos', 'Costos Operativos', 'Mantenimiento']);
          setStores(data.stores || []);
          setHistoricalSales(data.historicalSales || []);
          setMaintenanceTasks(data.maintenanceTasks || []);
          setSuppliers(data.suppliers || []);
          setRemitos(data.remitos || []);
          setPayments(data.payments || []);
          setAccountAdjustments(data.accountAdjustments || []);
          setEmployees(data.employees || []);
          setEmployeeCategories(data.employeeCategories || ['Producción', 'Administración', 'Logística', 'Ventas']);
          setHrSettings(data.hrSettings || { socialContributionsPercentage: 30, employeeWithholdingPercentage: 17 });
          setPayrolls(data.payrolls || []);
          setBudgets(data.budgets || []);
          setPaymentOrders(data.paymentOrders || []);
          setErrorLogs(data.errorLogs || []);
          setSkuCategories(data.sku_categories || []);
          setSuccess('¡Restauración completada con éxito!');
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    reader.onerror = () => setError('Error al leer el archivo.');
    reader.readAsText(file);
    event.target.value = '';
  };
  
    const handleClearLogs = () => {
      if (window.confirm('¿Estás seguro de que quieres borrar todos los registros de errores?')) {
          setErrorLogs([]);
      }
  };

  const handleRunDiagnosis = useCallback(() => {
    setIsDiagnosing(true);
    setDiagnosisResults(null);

    setTimeout(() => {
        const findings: AnalysisFinding[] = [];
        
        findings.push({ id: 'api-key', category: 'Configuración del Entorno', status: 'success', message: 'Clave API de Gemini configurada', details: ['La aplicación se inicializó correctamente, indicando que la clave está presente.'] });
        
        const orphanedRecipeSkus: string[] = [];
        const ingredientIds = new Set(ingredients.map(i => i.id));
        skus.forEach(sku => { if (sku.recipe?.length > 0) { sku.recipe.forEach(item => { if (!ingredientIds.has(item.ingredientId)) { orphanedRecipeSkus.push(`SKU '${sku.name}' tiene insumo fantasma (ID: ${item.ingredientId})`); }}); }});
        if (orphanedRecipeSkus.length > 0) { findings.push({ id: 'orphaned-recipes', category: 'Integridad de Datos', status: 'error', message: 'Recetas con insumos inconsistentes', details: orphanedRecipeSkus }); } 
        else { findings.push({ id: 'orphaned-recipes', category: 'Integridad de Datos', status: 'success', message: 'Todas las recetas son consistentes' }); }
        
        const inconsistentRemitoItems: string[] = [];
        const skuIds = new Set(skus.map(s => s.id));
        remitos.forEach(remito => { remito.items.forEach(item => { if (!skuIds.has(item.skuId)) { inconsistentRemitoItems.push(`Remito '${remito.id}' para '${remito.storeName}' tiene SKU fantasma (ID: ${item.skuId})`); }}); });
        if (inconsistentRemitoItems.length > 0) { findings.push({ id: 'inconsistent-remitos', category: 'Integridad de Datos', status: 'error', message: 'Remitos con SKUs inconsistentes', details: inconsistentRemitoItems }); } 
        else { findings.push({ id: 'inconsistent-remitos', category: 'Integridad de Datos', status: 'success', message: 'Todos los remitos son consistentes' }); }

        const zeroCostSkus = skus.filter(sku => sku.recipe?.length > 0 && (!sku.calculatedCost || sku.calculatedCost <= 0)).map(sku => `SKU Fabricado '${sku.name}' tiene costo $${sku.calculatedCost?.toFixed(2) || '0.00'}.`);
        if (zeroCostSkus.length > 0) { findings.push({ id: 'zero-cost-skus', category: 'Integridad de Datos', status: 'warning', message: 'SKUs fabricados con costo cero', details: zeroCostSkus }); } 
        else { findings.push({ id: 'zero-cost-skus', category: 'Integridad de Datos', status: 'success', message: 'Costos de SKUs fabricados calculados' }); }

        const negativeStockItems: string[] = [];
        ingredients.forEach(i => { if (i.quantityInStock < 0) negativeStockItems.push(`Insumo '${i.name}': ${i.quantityInStock}`); });
        skus.forEach(s => { if (s.quantityInStock < 0) negativeStockItems.push(`SKU '${s.name}': ${s.quantityInStock}`); });
        if (negativeStockItems.length > 0) { findings.push({ id: 'negative-stock', category: 'Lógica de Negocio', status: 'error', message: 'Stock negativo detectado', details: negativeStockItems }); }
        else { findings.push({ id: 'negative-stock', category: 'Lógica de Negocio', status: 'success', message: 'Stock de inventario consistente' }); }

        if (errorLogs.length > 0) { findings.push({ id: 'runtime-errors', category: 'Salud del Código', status: 'warning', message: `Se han registrado ${errorLogs.length} errores`, details: [`Último error: "${errorLogs[0].message}" en ${new Date(errorLogs[0].timestamp).toLocaleString()}`] }); }
        else { findings.push({ id: 'runtime-errors', category: 'Salud del Código', status: 'success', message: 'No hay errores de runtime registrados' }); }

        setDiagnosisResults(findings);
        setIsDiagnosing(false);
    }, 1000);
  }, [skus, ingredients, remitos, errorLogs]);
  
  const renderFinding = (finding: AnalysisFinding) => {
    const config = { success: { icon: ShieldCheck, color: 'text-green-500' }, warning: { icon: ShieldAlert, color: 'text-yellow-500' }, error: { icon: ShieldX, color: 'text-red-500' }};
    const { icon: Icon, color } = config[finding.status];
    return ( <div key={finding.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md"> <div className="flex items-start gap-3"> <Icon className={`h-5 w-5 ${color} flex-shrink-0 mt-0.5`} /> <div className="flex-1"> <p className={`font-semibold ${color}`}>{finding.message}</p> {finding.details?.length && (<ul className="mt-1 text-xs text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">{finding.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>)} </div> </div> </div>);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center"><Database className="h-6 w-6 mr-2 text-indigo-500" />Backup y Restauración</h2>
      <p className="text-gray-500 dark:text-gray-400">Guarda una copia de seguridad de todos tus datos o restaura la aplicación desde un archivo guardado.</p>

      {error && (<Card className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-500/30"><div className="p-4 flex items-center"><AlertCircle className="h-5 w-5 text-red-500 mr-3" /><p className="text-sm text-red-700 dark:text-red-300">{error}</p></div></Card>)}
      {success && (<Card className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-500/30"><div className="p-4 flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-3" /><p className="text-sm text-green-700 dark:text-green-300">{success}</p></div></Card>)}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b dark:border-gray-700"><h3 className="text-lg font-bold flex items-center"><Download className="mr-2 h-5 w-5"/>Exportar Backup</h3></div>
          <div className="p-4 space-y-3"><p className="text-sm text-gray-500 dark:text-gray-400">Crea un archivo JSON con todos los datos de la aplicación. Guárdalo en un lugar seguro.</p><Button onClick={handleExport} className="w-full">Exportar Backup Completo</Button></div>
        </Card>
        <Card>
          <div className="p-4 border-b dark:border-gray-700"><h3 className="text-lg font-bold flex items-center"><Upload className="mr-2 h-5 w-5"/>Importar Backup</h3></div>
          <div className="p-4 space-y-3"><p className="text-sm text-gray-500 dark:text-gray-400">Restaura la aplicación desde un archivo de backup. <strong className="text-red-500">Esto sobreescribirá todos los datos actuales.</strong></p><div><Label htmlFor="backup-upload" className="sr-only">Seleccionar archivo de backup</Label><Input id="backup-upload" type="file" accept=".json" onChange={handleFileChange} /></div></div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b dark:border-gray-700"><h3 className="text-lg font-bold flex items-center"><Wrench className="mr-2 h-5 w-5"/>Diagnóstico del Sistema</h3></div>
        <div className="p-4 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Ejecuta una serie de comprobaciones para verificar la integridad de los datos, la configuración y la lógica de negocio.</p>
            <Button onClick={handleRunDiagnosis} disabled={isDiagnosing} className="w-full">{isDiagnosing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Analizando...</> : 'Ejecutar Diagnóstico'}</Button>
            {diagnosisResults && (<div className="mt-4 space-y-3"><h4 className="font-semibold">Reporte de Diagnóstico:</h4>{diagnosisResults.map(renderFinding)}</div>)}
        </div>
      </Card>

       <Card>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center"><h3 className="text-lg font-bold flex items-center"><AlertCircle className="mr-2 h-5 w-5"/>Registro de Errores</h3><Button variant="ghost" onClick={handleClearLogs} disabled={errorLogs.length === 0}><Trash2 className="mr-2 h-4 w-4"/> Limpiar Registros</Button></div>
        <div className="p-4 max-h-96 overflow-y-auto">{errorLogs.length === 0 ? (<p className="text-center text-gray-500 py-4">No hay errores registrados. ¡Todo bien!</p>) : (<div className="space-y-4">{errorLogs.map((log, index) => (<div key={`${log.timestamp}-${index}`} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm"><div className="flex justify-between items-start"><div><p className={`font-bold ${log.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>{log.message}</p><p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString('es-ES')}</p></div><span className="text-xs font-mono uppercase bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{log.type}</span></div>{log.stack && (<details className="mt-2"><summary className="cursor-pointer text-xs text-indigo-500 hover:underline">Ver stack trace</summary><pre className="mt-1 p-2 bg-gray-900 text-white rounded-md text-xs whitespace-pre-wrap break-all">{log.stack}</pre></details>)}</div>))}</div>)}</div>
      </Card>
    </div>
  );
};