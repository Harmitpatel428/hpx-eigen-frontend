import React, { Suspense } from 'react';
import { useDepartment } from '../context/DepartmentContext';

// Route-level code splitting per department dashboard
const SalesDashboard = React.lazy(() => import('../components/dashboard/SalesDashboard'));
const ProcessDashboard = React.lazy(() => import('../components/dashboard/ProcessDashboard'));
const DocumentationDashboard = React.lazy(() => import('../components/dashboard/DocumentationDashboard'));

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

export const OverviewPage: React.FC = () => {
  const { activeDepartment, isLoading } = useDepartment();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!activeDepartment) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">No department assigned</p>
          <p className="mt-1 text-sm text-gray-500">Contact your administrator to get access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px]">
      <Suspense fallback={<DashboardSkeleton />}>
        {activeDepartment.type === 'SALES' && <SalesDashboard />}
        {activeDepartment.type === 'PROCESS' && <ProcessDashboard />}
        {activeDepartment.type === 'DOCUMENTATION' && <DocumentationDashboard />}
      </Suspense>
    </div>
  );
};
