import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';
}

const accentMap = {
  emerald: 'text-emerald-600 bg-emerald-50',
  blue: 'text-blue-600 bg-blue-50',
  amber: 'text-amber-600 bg-amber-50',
  rose: 'text-rose-600 bg-rose-50',
  purple: 'text-purple-600 bg-purple-50',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  accent = 'emerald'
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 transition-all duration-300 hover:shadow-md hover:ring-gray-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <p className="text-[32px] font-light tracking-tight text-gray-900 leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-[13px] text-gray-500">{subtitle}</p>
          )}
        </div>
        
        {trend && trendValue && (
          <div className={`
            flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold
            ${accentMap[accent]}
          `}>
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};
