

import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { analyzeScenario } from '../services/geminiService';
import { Sparkles, Loader2, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useAppContext } from '../App';

interface AffectedSkuResult {
  skuName: string;
  oldCost: number;
  newCost: number;
  oldMargin: number;
  newMargin: number;
}

interface AnalysisResult {
  summary: string;
  affectedSkus: AffectedSkuResult[];
  recommendations: string[];
}

export const Simulation: React.FC = () => {
  const { skus, ingredients, getLatestIngredientCost } = useAppContext();
  const [prompt, setPrompt] = useState('aumento del 15% en el precio de la harina y un 5% en los salarios de los panaderos');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = useCallback(async () => {
    if (!prompt) {
      setError('Por favor, describe un escenario para analizar.');
      return;
    }
    setIsLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const result = await analyzeScenario(prompt, skus, ingredients, getLatestIngredientCost);
      setAnalysis(result);
    } catch (e) {
      const err = e as Error;
      setError(`Error al analizar el escenario: ${err.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, skus, ingredients, getLatestIngredientCost]);

  const MarginChange = ({ margin }: { margin: number }) => {
    const isNegative = margin < 0;
    const isLow = margin < 15;
    const color = isNegative ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-green-500';
    return <span className={`font-bold ${color}`}>{margin.toFixed(2)}%</span>;
  };
  
  const CostChange = ({ oldCost, newCost }: { oldCost: number, newCost: number}) => {
     const increase = newCost > oldCost;
     const Icon = increase ? TrendingUp : TrendingDown;
     const color = increase ? 'text-red-500' : 'text-green-500';
     return (
        <div className="flex items-center justify-end gap-2">
            <span>${oldCost.toFixed(2)}</span>
            <ArrowRight size={14} className="text-gray-400"/>
            <span className={`font-bold ${color}`}>${newCost.toFixed(2)}</span>
            <Icon size={16} className={color}/>
        </div>
     )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-indigo-500" />
            Motor de Simulación "What-If"
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Ajusta las variables para simular escenarios y ver el impacto inmediato en tus costos.
            Describe tu escenario en lenguaje natural.
          </p>
        </div>

        <div className="p-6 border-t dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <Label htmlFor="scenario-prompt">Describe el escenario</Label>
              <Input
                id="scenario-prompt"
                placeholder="Ej: Aumento del 10% en harina, baja del 5% en azúcar..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={isLoading || skus.length === 0}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</>
              ) : ( 'Analizar Impacto' )}
            </Button>
            {skus.length === 0 && <p className="text-sm text-yellow-600 dark:text-yellow-400">Añade SKUs para poder analizar escenarios.</p>}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-500/30">
          <div className="p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {analysis && (
        <div className="space-y-6">
            <Card>
                <div className="p-6">
                    <h3 className="text-xl font-bold">Análisis del Escenario por IA</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{analysis.summary}</p>
                </div>
            </Card>

            <Card>
                <div className="p-4"><h3 className="text-lg font-semibold">Impacto en Costos y Márgenes de Productos</h3></div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Cambio en Costo Unitario</TableHead>
                            <TableHead className="text-right">Margen Anterior</TableHead>
                            <TableHead className="text-right">Nuevo Margen</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analysis.affectedSkus.map((sku) => (
                        <TableRow key={sku.skuName}>
                            <TableCell className="font-medium">{sku.skuName}</TableCell>
                            <TableCell className="text-right"><CostChange oldCost={sku.oldCost} newCost={sku.newCost} /></TableCell>
                            <TableCell className="text-right"><MarginChange margin={sku.oldMargin} /></TableCell>
                            <TableCell className="text-right"><MarginChange margin={sku.newMargin} /></TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
             <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold">Recomendaciones Estratégicas</h3>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                        {analysis.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                        ))}
                    </ul>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};
