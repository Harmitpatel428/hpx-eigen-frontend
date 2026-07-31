import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DepartmentProvider } from './context/DepartmentContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';

import { LeadsPage } from './pages/LeadsPage';
import { ContactsPage } from './pages/ContactsPage';
import { PipelineAnalyticsPage as PipelinePage } from './pages/PipelineAnalyticsPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

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

// ─── Error Boundary ────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
          <div className="max-w-lg rounded-3xl bg-white p-8 shadow-lg ring-1 ring-gray-100">
            <h1 className="text-xl font-semibold text-red-600">Application Error</h1>
            <p className="mt-2 text-sm font-mono text-gray-700 bg-gray-100 p-3 rounded-xl overflow-auto">
              {this.state.error?.message}
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Check DevTools Console for full stack trace.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <ErrorBoundary>
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
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
