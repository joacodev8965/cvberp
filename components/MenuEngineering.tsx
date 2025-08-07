

import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { getMenuEngineeringAnalysis } from '../services/geminiService';
import { Loader2, AlertCircle, LayoutGrid, Star, Rabbit, Tractor, Dog, HelpCircle } from 'lucide-react';
import { useAppContext } from '../App';

interface AnalysisItem {
  skuName: string;
  classification: "Estrella" | "Vaca Lechera" | "Caballo de Batalla" | "Perro";
  recommendation: string;
}

const classificationConfig = {
    "Estrella": { icon: Star, color: 'text-green-500', title: 'Estrellas', description: 'Alta rentabilidad y popularidad.'},
    "Vaca Lechera": { icon: Rabbit, color: 'text-blue-500', title: 'Vacas Lecheras (Puzzles)', description: 'Alta rentabilidad, baja popularidad.' },
    "Caballo de Batalla": { icon: Tractor, color: 'text-yellow-500', title: 'Caballos de Batalla', description: 'Baja rentabilidad, alta popularidad.'},
    "Perro": { icon: Dog, color: 'text-red-500', title: 'Perros', description: 'Baja rentabilidad y popularidad.'}
};

export const MenuEngineering: React.FC = () => {
  const { skus, historicalSales } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisItem[] | null>(null);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const result = await getMenuEngineeringAnalysis(skus, historicalSales);
      setAnalysis(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [skus, historicalSales]);

  const groupedAnalysis = analysis?.reduce((acc, item) => {
    (acc[item.classification] = acc[item.classification] || []).push(item);
    return acc;
  }, {} as Record<string, AnalysisItem[]>) || {};

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold flex items-center">
            <LayoutGrid className="h-6 w-6 mr-2 text-indigo-500" />
            Matriz del Menú (Ingeniería de Menú)
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Analiza tus productos para clasificarlos según su popularidad y rentabilidad.
            La IA te dará recomendaciones estratégicas para cada uno.
          </p>
        </div>
        <div className="p-6 border-t dark:border-gray-700">
          <Button onClick={handleAnalyze} disabled={isLoading || skus.length === 0 || historicalSales.length === 0}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</> : 'Generar Análisis del Menú'}
          </Button>
          {(skus.length === 0 || historicalSales.length === 0) &&
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              Necesitas tener SKUs y un historial de ventas cargado para realizar este análisis.
            </p>
          }
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

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(classificationConfig).map(([key, config]) => {
              const items = groupedAnalysis[key as keyof typeof classificationConfig] || [];
              const Icon = config.icon || HelpCircle;
              return (
                <Card key={key} className="flex flex-col">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h3 className={`text-xl font-bold flex items-center ${config.color}`}>
                            <Icon className="h-6 w-6 mr-2"/>
                            {config.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
                    </div>
                    {items.length > 0 ? (
                        <div className="p-4 space-y-3 flex-grow">
                        {items.map(item => (
                            <div key={item.skuName} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <p className="font-semibold">{item.skuName}</p>
                                <p className="text-sm text-indigo-600 dark:text-indigo-400">{item.recommendation}</p>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500 flex-grow flex items-center justify-center">
                            <p>Ningún producto en esta categoría.</p>
                        </div>
                    )}
                </Card>
            )
          })}
        </div>
      )}
    </div>
  );
};
