import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DepartmentProvider } from './context/DepartmentContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';

// Import your actual ProtectedRoute from the correct path
import { ProtectedRoute } from './auth/guards/ProtectedRoute';

const LeadsPage = React.lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })));
const PipelinePage = React.lazy(() => import('./pages/PipelineAnalyticsPage').then(m => ({ default: m.PipelineAnalyticsPage })));
const ActivitiesPage = React.lazy(() => import('./pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const InvoicesPage = React.lazy(() => import('./pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const PaymentsPage = React.lazy(() => import('./pages/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DocumentationPage = React.lazy(() => import('./pages/DocumentationPage').then(m => ({ default: m.DocumentationPage })));
const RecycleBinPage = React.lazy(() => import('./pages/RecycleBinPage').then(m => ({ default: m.RecycleBinPage })));

const PageFallback = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
  </div>
);

export default function ProtectedApp() {
  return (
    <DepartmentProvider>
        <Routes>
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/leads" element={<React.Suspense fallback={<PageFallback />}><LeadsPage /></React.Suspense>} />
            <Route path="/contacts" element={<React.Suspense fallback={<PageFallback />}><ContactsPage /></React.Suspense>} />
            <Route path="/pipeline" element={<React.Suspense fallback={<PageFallback />}><PipelinePage /></React.Suspense>} />
            <Route path="/activities" element={<React.Suspense fallback={<PageFallback />}><ActivitiesPage /></React.Suspense>} />
            <Route path="/invoices" element={<React.Suspense fallback={<PageFallback />}><InvoicesPage /></React.Suspense>} />
            <Route path="/payments" element={<React.Suspense fallback={<PageFallback />}><PaymentsPage /></React.Suspense>} />
            <Route path="/settings" element={<React.Suspense fallback={<PageFallback />}><SettingsPage /></React.Suspense>} />
            <Route path="/documentation" element={<React.Suspense fallback={<PageFallback />}><DocumentationPage /></React.Suspense>} />
            <Route path="/recycle-bin" element={<React.Suspense fallback={<PageFallback />}><RecycleBinPage /></React.Suspense>} />
          </Route>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </DepartmentProvider>
  );
}
