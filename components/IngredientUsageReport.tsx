

import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { analyzeSalesReport } from '../services/geminiService';
import { KpiCard } from './KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { SalesReportData, SalesSummary } from '../types';
import { Upload, Sparkles, Loader2, AlertCircle, TrendingUp, Package, Trophy, RefreshCw } from 'lucide-react';
import { useAppContext } from '../App';

interface UsageReportItem {
    ingredientName: string;
    totalQuantity: number;
    unit: string;
}

export const IngredientUsageReport: React.FC = () => {
    const { skus, ingredients } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [salesReport, setSalesReport] = useState<{ salesData: SalesReportData[], summary: SalesSummary } | null>(null);
    const [usageReport, setUsageReport] = useState<UsageReportItem[] | null>(null);

    const handleReset = () => {
        setFile(null);
        setFileContent(null);
        setSalesReport(null);
        setUsageReport(null);
        setError('');
        // Reset the file input visually
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            handleReset();
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) {
                    setFileContent(content);
                } else {
                    setError('El archivo está vacío o no se pudo leer.');
                }
            };
            reader.onerror = () => setError('Error al leer el archivo.');
            reader.readAsText(selectedFile);
        }
    };

    const calculateUsage = (salesData: SalesReportData[]): UsageReportItem[] => {
        const ingredientTotals = new Map<string, { totalQuantity: number; unit: string; name: string }>();

        salesData.forEach(soldItem => {
            const sku = skus.find(s => s.name.trim().toLowerCase() === soldItem.productName.trim().toLowerCase());

            if (sku) {
                sku.recipe.forEach(recipeItem => {
                    const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
                    if (ingredient) {
                        const consumedQuantity = recipeItem.quantity * soldItem.quantitySold;
                        const existing = ingredientTotals.get(ingredient.id);
                        if (existing) {
                            existing.totalQuantity += consumedQuantity;
                        } else {
                            ingredientTotals.set(ingredient.id, {
                                totalQuantity: consumedQuantity,
                                unit: ingredient.unit,
                                name: ingredient.name,
                            });
                        }
                    }
                });
            }
        });

        return Array.from(ingredientTotals.values())
            .map(item => ({
                ingredientName: item.name,
                totalQuantity: item.totalQuantity,
                unit: item.unit
            }))
            .sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));
    };

    const handleAnalyze = useCallback(async () => {
        if (!fileContent) {
            setError('No hay contenido de archivo para analizar.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSalesReport(null);
        setUsageReport(null);

        try {
            const salesResult = await analyzeSalesReport(fileContent);
            setSalesReport(salesResult);
            
            const usage = calculateUsage(salesResult.salesData);
            setUsageReport(usage);

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [fileContent, skus, ingredients]);

    const renderInitialState = () => (
        <Card>
            <div className="p-6">
                <h2 className="text-2xl font-bold flex items-center"><Sparkles className="h-6 w-6 mr-2 text-indigo-500" />Análisis de Consumo por Ventas</h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Sube tu reporte de ventas (CSV, TXT). La IA analizará las ventas y el sistema calculará el consumo de insumos basado en tus recetas.</p>
            </div>
            <div className="p-6 border-t dark:border-gray-700">
                <label htmlFor="file-upload" className="flex justify-center w-full px-4 py-6 border-2 border-dashed rounded-md cursor-pointer border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400">
                    <div className="text-center">
                        <Upload className="w-10 h-10 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Haz clic para subir un archivo</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">CSV o TXT</p>
                    </div>
                    <input id="file-upload" type="file" className="sr-only" accept=".csv,.txt" onChange={handleFileChange} />
                </label>
            </div>
        </Card>
    );

    const renderFileLoadedState = () => (
        <Card>
            <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Archivo Cargado</h2>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">{file?.name}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" onClick={handleReset} className="flex-1 sm:flex-none"><RefreshCw className="mr-2 h-4 w-4" />Subir otro</Button>
                    <Button onClick={handleAnalyze} disabled={isLoading} className="flex-1 sm:flex-none">
                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>) : 'Analizar Reporte'}
                    </Button>
                </div>
            </div>
        </Card>
    );

    const renderResults = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Resultados del Análisis</h2>
                <Button variant="ghost" onClick={handleReset}><RefreshCw className="mr-2 h-4 w-4" />Analizar otro reporte</Button>
            </div>
            {salesReport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard title="Ingresos Totales" value={`$${salesReport.summary.totalRevenue.toFixed(2)}`} icon={TrendingUp} />
                    <KpiCard title="Unidades Vendidas" value={salesReport.summary.totalUnitsSold.toString()} icon={Package} />
                    <KpiCard title="Producto Estrella" value={salesReport.summary.bestSellingProduct.name} subtitle={`${salesReport.summary.bestSellingProduct.unitsSold} unidades`} icon={Trophy} />
                </div>
            )}
            {usageReport && (
                <Card>
                    <div className="p-4"><h3 className="text-xl font-bold">Consumo de Insumos Calculado</h3></div>
                    <Table>
                        <TableHeader><TableRow><TableHead>Insumo</TableHead><TableHead className="text-right">Cantidad Consumida</TableHead><TableHead>Unidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {usageReport.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.ingredientName}</TableCell>
                                    <TableCell className="text-right font-mono">{item.totalQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
             {salesReport && (
                <Card>
                   <div className="p-4"><h3 className="text-xl font-bold">Detalle de Ventas Analizado por IA</h3></div>
                    <Table>
                        <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Precio Unitario</TableHead><TableHead className="text-right">Ingreso Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {salesReport.salesData.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                    <TableCell className="text-right">{item.quantitySold}</TableCell>
                                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">${item.totalRevenue.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {!file && renderInitialState()}
            {file && !salesReport && !isLoading && renderFileLoadedState()}
            
            {error && (
                <Card className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-500/30">
                    <div className="p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                        <div><h3 className="font-semibold text-red-800 dark:text-red-200">Error</h3><p className="text-sm text-red-700 dark:text-red-300">{error}</p></div>
                    </div>
                </Card>
            )}
            
            {isLoading && (
                <div className="text-center p-10">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-500" />
                    <p className="mt-4 text-lg">La IA está analizando tu reporte...</p>
                    <p className="text-sm text-gray-500">Esto puede tardar unos segundos.</p>
                </div>
            )}
            
            {(salesReport || usageReport) && !isLoading && renderResults()}
        </div>
    );
};
