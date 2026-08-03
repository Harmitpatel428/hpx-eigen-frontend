import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import { ShieldOff, AlertCircle } from 'lucide-react';
import type { ProcessMetrics } from '../../hooks/useDashboardMetrics';
import { ApiError } from '../../auth/services/api';

export const ProcessDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<ProcessMetrics>();

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
      <div className="space-y-2">
        <h1 className="text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
          Process operations overview.{' '}
          <span className="font-normal text-blue-600">
            {metrics.activeTasks} active tasks
          </span>{' '}
          in queue.
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Active Tasks" value={metrics.activeTasks} subtitle="In progress" accent="blue" />
        <KpiCard title="Completion Rate" value={`${metrics.completionRate}%`} trend="up" trendValue="+8%" accent="blue" />
        <KpiCard title="Avg Processing" value={`${metrics.avgProcessingTime} ${metrics.unit}`} trend="down" trendValue="-1.2 days" accent="blue" />
        <KpiCard title="Pending Verifications" value={metrics.pendingVerifications} subtitle="High priority" accent="amber" />
      </div>

      {/* Empty state for process tasks */}
      <div className="rounded-3xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Process tasks</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Process task tracking will be available once the ProcessTask data model is added to your schema.
          </p>
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

export default ProcessDashboard;
