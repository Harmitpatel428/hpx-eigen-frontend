import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import type { ProcessMetrics } from '../../hooks/useDashboardMetrics';

const KEYFRAMES = `
  @keyframes pd-fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function anim(delay = 0, duration = 600): React.CSSProperties {
  return {
    animation: `pd-fadeUp ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
  };
}

export const ProcessDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<ProcessMetrics>();

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
    <>
      <style>{KEYFRAMES}</style>

      <div className="space-y-8">
        {/* Hero — July 22 editorial style */}
        <div style={anim(0)}>
          <h1 className="type-hero" style={{ marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Process operations overview.{' '}
            <span style={{ color: 'var(--color-info)' }}>
              {metrics.activeTasks} active tasks
            </span>{' '}
            in queue.
          </h1>

          <div style={{ display: 'flex', gap: 'var(--space-8)', ...anim(100, 500) }}>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Completion Rate</div>
              <div className="type-h2">{metrics.completionRate}%</div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Avg Processing</div>
              <div className="type-h2">{metrics.avgProcessingTime} {metrics.unit}</div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Pending Verifications</div>
              <div className="type-h2">{metrics.pendingVerifications}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Active Tasks',         value: metrics.activeTasks,                                subtitle: 'In progress',    accent: 'blue'  as const },
            { title: 'Completion Rate',       value: `${metrics.completionRate}%`,                       trend: 'up'   as const, trendValue: '+8%',       accent: 'blue'  as const },
            { title: 'Avg Processing',        value: `${metrics.avgProcessingTime} ${metrics.unit}`,     trend: 'down' as const, trendValue: '-1.2 days',  accent: 'blue'  as const },
            { title: 'Pending Verifications', value: metrics.pendingVerifications,                        subtitle: 'High priority', accent: 'amber' as const },
          ].map((card, i) => (
            <div key={card.title} style={anim(220 + i * 60)}>
              <KpiCard {...card} />
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="rounded-3xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100" style={anim(500)}>
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
    </>
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
