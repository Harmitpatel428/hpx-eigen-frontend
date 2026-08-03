import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import { formatCurrency } from '../../utils/format';
import { ArrowUpRight, ShieldOff, AlertCircle } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useDashboardMetrics';
import { ApiError } from '../../auth/services/api';


export const SalesDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<SalesMetrics>();

  if (isLoading) return <DashboardSkeleton />;
  
  if (error) {
    const is403 = error instanceof ApiError && error.status === 403;
    if (is403) {
      return (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-amber-50 p-12 text-center">
          <ShieldOff className="mb-4 h-10 w-10 text-amber-400" strokeWidth={1.5} />
          <p className="text-base font-medium text-amber-900">Department Access Required</p>
          <p className="mt-1 max-w-sm text-sm text-amber-700">
            Your account is not yet assigned to this department. Contact your administrator to request access.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl bg-rose-50 p-12 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-rose-400" strokeWidth={1.5} />
        <p className="text-base font-medium text-rose-900">Dashboard Unavailable</p>
        <p className="mt-1 max-w-sm text-sm text-rose-700">
          Could not load your metrics. This is likely a temporary issue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          Retry
        </button>
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
