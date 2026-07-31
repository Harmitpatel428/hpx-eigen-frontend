import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ProtectedRoute } from './auth/public';
import { ThemeProvider } from './context/ThemeContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { AppShell } from './components/layout/AppShell';
import { DepartmentRouter } from './components/layout/DepartmentRouter';
import { ErrorBoundary } from './components/ErrorBoundary';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage').then(m => ({ default: m.OpportunitiesPage })));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const PipelineAnalyticsPage = lazy(() => import('./pages/PipelineAnalyticsPage').then(m => ({ default: m.PipelineAnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const OrgManagement = lazy(() => import('./pages/settings/OrgManagement').then(m => ({ default: m.OrgManagement })));

const ProcessDashboard = lazy(() => import('./pages/ProcessDashboard').then(m => ({ default: m.ProcessDashboard })));
const DocsDashboard = lazy(() => import('./pages/DocsDashboard').then(m => ({ default: m.DocsDashboard })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-screen bg-[var(--bg-app)] text-[var(--text-tertiary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]" />
      </div>
    }>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Dynamic Root */}
        <Route path="/" element={<ProtectedRoute><DepartmentRouter /></ProtectedRoute>} />

        {/* Sales Branch */}
        <Route path="/sales">
          <Route path="leads" element={<ProtectedRoute><AppShell><LeadsPage /></AppShell></ProtectedRoute>} />
          <Route path="contacts" element={<ProtectedRoute><AppShell><ContactsPage /></AppShell></ProtectedRoute>} />
          <Route path="opportunities" element={<ProtectedRoute><AppShell><OpportunitiesPage /></AppShell></ProtectedRoute>} />
          <Route path="activities" element={<ProtectedRoute><AppShell><ActivitiesPage /></AppShell></ProtectedRoute>} />
          <Route path="pipeline" element={<ProtectedRoute><AppShell><PipelineAnalyticsPage /></AppShell></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute><AppShell><InvoicesPage /></AppShell></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute><AppShell><PaymentsPage /></AppShell></ProtectedRoute>} />
        </Route>

        {/* Process Branch */}
        <Route path="/process">
          <Route path="projects" element={<ProtectedRoute><AppShell><ProcessDashboard /></AppShell></ProtectedRoute>} />
        </Route>

        {/* Docs Branch */}
        <Route path="/docs">
          <Route path="templates" element={<ProtectedRoute><AppShell><DocsDashboard /></AppShell></ProtectedRoute>} />
        </Route>

        {/* Settings Branch */}
        <Route path="/settings" element={<ProtectedRoute><AppShell><SettingsPage /></AppShell></ProtectedRoute>} />
        <Route path="/settings/org-management" element={<ProtectedRoute><AppShell><OrgManagement /></AppShell></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="hpx-ui-theme">
        <ErrorBoundary>
          <AuthProvider>
            <DepartmentProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </DepartmentProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
