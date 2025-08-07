import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './ui/Card';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon: Icon, change, changeType }) => {
  const changeColor = changeType === 'increase' ? 'text-red-500' : 'text-green-500';

  return (
    <Card className="p-4 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            <div className="mt-2">
                <p className="text-2xl font-bold">{value}</p>
                {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
        </div>
        <Icon className="h-6 w-6 text-gray-400 flex-shrink-0" />
      </div>
       {change && (
        <div className="mt-2 text-xs">
          <span className={`${changeColor} font-semibold`}>{change}</span>
          <span className="text-gray-500 dark:text-gray-400"> {changeType ? (changeType === 'increase' ? '↑' : '↓') : ''}</span>
        </div>
      )}
    </Card>
  );
};