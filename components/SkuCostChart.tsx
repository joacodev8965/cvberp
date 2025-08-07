
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from './ui/Card';
import { SKU } from '../types';

interface SkuCostChartProps {
  data: (SKU & { totalCost: number })[];
}

export const SkuCostChart: React.FC<SkuCostChartProps> = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);

  return (
    <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Top 10 SKUs por Costo Unitario</h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart
                    data={sortedData}
                    margin={{
                        top: 5, right: 30, left: 20, bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                        cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }}
                        contentStyle={{
                            backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: '#fff'
                        }}
                    />
                    <Legend />
                    <Bar dataKey="totalCost" name="Costo Total" fill="#4f46e5" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </Card>
  );
};
