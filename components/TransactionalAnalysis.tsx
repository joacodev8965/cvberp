

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { analyzeTransactions } from '../services/geminiService';
import { Loader2, AlertCircle, BarChartHorizontalBig, ShoppingBasket, Lightbulb } from 'lucide-react';
import { useAppContext } from '../App';

interface HourlySale {
    hour: number;
    quantity: number;
}
interface PeakHoursResult {
    skuName: string;
    hourlySales: HourlySale[];
}
interface MarketBasketResult {
    itemPair: string[];
    recommendation: string;
}
interface AnalysisResult {
    peakHoursAnalysis: PeakHoursResult[];
    marketBasketAnalysis: MarketBasketResult[];
}

// Function to generate a color palette
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

const PeakHoursChart: React.FC<{ data: PeakHoursResult[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i }));
        data.forEach((product, productIndex) => {
            hours.forEach(hourData => {
                const saleData = product.hourlySales.find(s => s.hour === hourData.hour);
                (hourData as any)[product.skuName] = saleData ? saleData.quantity : 0;
            });
        });
        return hours;
    }, [data]);
    
    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                <YAxis allowDecimals={false}/>
                <Tooltip 
                    cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }}
                    contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                />
                <Legend />
                {data.map((product, index) => (
                    <Bar key={product.skuName} dataKey={product.skuName} stackId="a" fill={COLORS[index % COLORS.length]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

export const TransactionalAnalysis: React.FC = () => {
    const { stores, historicalSales, skus } = useAppContext();
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        if (stores.length > 0 && !selectedStoreId) {
            setSelectedStoreId(stores[0].id);
        }
    }, [stores, selectedStoreId]);

    const handleAnalyze = useCallback(async () => {
        if (!selectedStoreId) {
            setError('Por favor, selecciona un local para analizar.');
            return;
        }
        const salesForStore = historicalSales.filter(s => s.storeId === selectedStoreId);
        if (salesForStore.length === 0) {
            setError('No hay datos de ventas para el local seleccionado.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);

        try {
            const result = await analyzeTransactions(salesForStore, skus);
            setAnalysisResult(result);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedStoreId, historicalSales, skus]);

    const salesForSelectedStore = useMemo(() => {
        return historicalSales.filter(s => s.storeId === selectedStoreId);
    }, [historicalSales, selectedStoreId]);

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-6">
                    <h2 className="text-2xl font-bold flex items-center">
                        <BarChartHorizontalBig className="h-6 w-6 mr-2 text-indigo-500" />
                        Análisis Transaccional
                    </h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        Selecciona un local para analizar los patrones de compra de tus clientes, como las horas pico y los productos que se compran juntos.
                    </p>
                </div>
                <div className="p-6 border-t dark:border-gray-700 space-y-4">
                    <div>
                        <Label htmlFor="store-select">Selecciona un Local</Label>
                        <select
                            id="store-select"
                            value={selectedStoreId}
                            onChange={(e) => {
                                setSelectedStoreId(e.target.value);
                                setAnalysisResult(null);
                                setError('');
                            }}
                            className="w-full h-10 px-3 py-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500"
                            disabled={stores.length === 0}
                        >
                            <option value="">{stores.length === 0 ? "No hay locales para analizar" : "Seleccionar..."}</option>
                            {stores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={handleAnalyze} disabled={isLoading || !selectedStoreId || salesForSelectedStore.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</> : 'Realizar Análisis'}
                    </Button>
                    {!isLoading && selectedStoreId && salesForSelectedStore.length === 0 && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">No hay historial de ventas para este local. Carga ventas en 'Locales y Ventas'.</p>
                    )}
                </div>
            </Card>

            {error && (
                <Card className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-500/30">
                    <div className="p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                </Card>
            )}

            {isLoading && (
                 <div className="text-center p-10">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-500" />
                    <p className="mt-4 text-lg">La IA está analizando las transacciones...</p>
                    <p className="text-sm text-gray-500">Esto puede tomar unos segundos.</p>
                </div>
            )}

            {analysisResult && !isLoading && (
                <div className="space-y-6">
                    <Card>
                        <div className="p-6">
                            <h3 className="text-xl font-bold flex items-center"><ShoppingBasket className="h-5 w-5 mr-2 text-blue-500" />Análisis de Horas Pico</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ventas por hora para los productos más vendidos.</p>
                        </div>
                        <div className="p-4">
                            <PeakHoursChart data={analysisResult.peakHoursAnalysis} />
                        </div>
                    </Card>

                    <Card>
                        <div className="p-6">
                            <h3 className="text-xl font-bold flex items-center"><Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />Análisis de Cesta de Compra y Recomendaciones</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pares de productos comprados juntos frecuentemente.</p>
                        </div>
                        <div className="p-4 space-y-4">
                            {analysisResult.marketBasketAnalysis.map((item, index) => (
                                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="font-semibold">{item.itemPair.join(' + ')}</p>
                                    <p className="mt-1 text-indigo-600 dark:text-indigo-400">{item.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
