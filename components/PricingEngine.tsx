

import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { getPricingSuggestion } from '../services/geminiService';
import { Loader2, AlertCircle, Tag, TrendingUp } from 'lucide-react';
import { useAppContext } from '../App';

interface Suggestion {
  suggestedPrice: number;
  reasoning: string;
  expectedImpact: string;
}

export const PricingEngine: React.FC = () => {
  const { skus, historicalSales } = useAppContext();
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!selectedSkuId) {
      setError('Por favor, selecciona un producto para analizar.');
      return;
    }
    const selectedSku = skus.find(s => s.id === selectedSkuId);
    if (!selectedSku) {
      setError('Producto seleccionado no encontrado.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuggestion(null);

    try {
      const result = await getPricingSuggestion(selectedSku, historicalSales);
      setSuggestion(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSkuId, skus, historicalSales]);

  const selectedSkuDetails = skus.find(s => s.id === selectedSkuId);
  const newMargin = selectedSkuDetails && suggestion
    ? ((suggestion.suggestedPrice - (selectedSkuDetails.calculatedCost || 0)) / suggestion.suggestedPrice) * 100
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Tag className="h-6 w-6 mr-2 text-indigo-500" />
            Motor de Sugerencia de Precios (Pricing Engine)
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Selecciona un producto y la IA recomendará un precio de venta óptimo basado en costos y datos históricos de ventas.
          </p>
        </div>
        <div className="p-6 border-t dark:border-gray-700 space-y-4">
          <div>
            <Label htmlFor="sku-select">Selecciona un Producto</Label>
            <select
              id="sku-select"
              value={selectedSkuId}
              onChange={(e) => {
                setSelectedSkuId(e.target.value);
                setSuggestion(null);
                setError('');
              }}
              className="w-full h-10 px-3 py-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar...</option>
              {skus.map(sku => (
                <option key={sku.id} value={sku.id}>{sku.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleAnalyze} disabled={isLoading || !selectedSkuId}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</> : 'Obtener Sugerencia de Precio'}
          </Button>
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

      {suggestion && selectedSkuDetails && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-bold">Recomendación para: {selectedSkuDetails.name}</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Precio Actual</p>
                    <p className="text-3xl font-bold">${selectedSkuDetails.salePrice.toFixed(2)}</p>
                </div>
                 <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-500/50">
                    <p className="text-sm text-indigo-600 dark:text-indigo-300 font-semibold">Precio Sugerido por IA</p>
                    <p className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-200">${suggestion.suggestedPrice.toFixed(2)}</p>
                </div>
                 <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nuevo Margen Bruto</p>
                    <p className="text-3xl font-bold flex items-center justify-center gap-2">
                        {newMargin.toFixed(2)}%
                        <TrendingUp className="h-6 w-6 text-green-500"/>
                    </p>
                </div>
            </div>
             <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold">Razonamiento de la IA</h4>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{suggestion.reasoning}</p>
                </div>
                <div>
                    <h4 className="font-semibold">Impacto Esperado</h4>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{suggestion.expectedImpact}</p>
                </div>
             </div>
          </div>
        </Card>
      )}
    </div>
  );
};
