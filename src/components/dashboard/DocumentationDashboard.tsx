import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import type { DocumentationMetrics } from '../../hooks/useDashboardMetrics';

export const DocumentationDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<DocumentationMetrics>();

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
      <div className="space-y-2">
        <h1 className="text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
          Documentation center.{' '}
          <span className="font-normal text-amber-600">
            {metrics.activeDrafts} drafts
          </span>{' '}
          awaiting review.
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Active Drafts" value={metrics.activeDrafts} subtitle="In progress" accent="amber" />
        <KpiCard title="Review Turnaround" value={`${metrics.reviewTurnaround} ${metrics.unit}`} trend="down" trendValue="-3 hrs" accent="amber" />
        <KpiCard title="Compliance Rate" value={`${metrics.complianceRate}%`} trend="up" trendValue="+2%" accent="emerald" />
        <KpiCard title="Pending Signatures" value={metrics.pendingSignatures} subtitle="Awaiting client" accent="rose" />
      </div>

      {/* Empty state for documents */}
      <div className="rounded-3xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Document workflows</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Document lifecycle tracking will be available once the Document data model is added to your schema.
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

export default DocumentationDashboard;
