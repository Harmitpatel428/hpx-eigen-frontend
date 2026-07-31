import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import { formatCurrency } from '../../utils/format';
import { ArrowUpRight } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useDashboardMetrics';

export const SalesDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<SalesMetrics>();

  if (isLoading) return <DashboardSkeleton />;
  
  if (error) {
    return (
      <div className="rounded-3xl bg-rose-50 p-6 text-rose-700">
        <p className="font-medium">Failed to load dashboard</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
          Good morning. Your active pipeline is currently sitting at{' '}
          <span className="font-normal text-emerald-600">
            {formatCurrency(metrics.pipelineValue, metrics.currency)}
          </span>
          .
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          trend="up"
          trendValue="+4%"
          accent="emerald"
        />
        <KpiCard
          title="Active Deals"
          value={metrics.activeDeals}
          subtitle="In pipeline"
        />
        <KpiCard
          title="Avg Velocity"
          value={`${metrics.avgVelocity} days`}
          trend="down"
          trendValue="-2 days"
          accent="emerald"
        />
        <KpiCard
          title="Pipeline Value"
          value={formatCurrency(metrics.pipelineValue, metrics.currency)}
          trend="up"
          trendValue="+12%"
          accent="emerald"
        />
      </div>

      {/* Pipeline Momentum */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-light tracking-tight text-gray-900">
            Pipeline Momentum
          </h2>
          <button className="group flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
            View all
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
          <p className="text-sm text-gray-400">Pipeline visualization coming soon</p>
        </div>
      </div>
    </div>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8">
    <div className="h-32 animate-pulse rounded-3xl bg-gray-100" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl bg-gray-100" />
      ))}
    </div>
  </div>
);

export default SalesDashboard;
