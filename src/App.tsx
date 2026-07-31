import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DepartmentProvider } from './context/DepartmentContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';

// Lazy-loaded pages for performance
const LeadsPage = React.lazy(() => import('./pages/LeadsPage'));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage'));
const PipelinePage = React.lazy(() => import('./pages/PipelinePage'));
const ActivitiesPage = React.lazy(() => import('./pages/ActivitiesPage'));
const InvoicesPage = React.lazy(() => import('./pages/InvoicesPage'));
const PaymentsPage = React.lazy(() => import('./pages/PaymentsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
  </div>
);

// Simple auth guard — replace with your actual auth check
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('hpx:access-token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DepartmentProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected App Shell */}
              <Route element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </Suspense>
        </DepartmentProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
