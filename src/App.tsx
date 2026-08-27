import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

// ─── Error Boundary that wraps EVERYTHING ──────────────────────────
class GlobalErrorBoundary extends React.Component<
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
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary]', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          minHeight: '100vh', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f9fafb',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ 
            maxWidth: '500px', 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '24px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
          }}>
            <h1 style={{ color: '#dc2626', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Critical Error
            </h1>
            <pre style={{ 
              background: '#f3f4f6', 
              padding: '1rem', 
              borderRadius: '12px', 
              fontSize: '0.875rem',
              overflow: 'auto',
              color: '#374151'
            }}>
              {this.state.error?.message}
            </pre>
            <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
              Open DevTools Console for full stack trace.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected App Shell (lazy loaded) ─────────────────────────────
const ProtectedApp = React.lazy(() => import('./ProtectedApp'));

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

export const App: React.FC = () => {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred. Please refresh.</p>} showDialog>
              <Routes>
              {/* Login is completely isolated — no DepartmentProvider */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              
              {/* Everything else loads the full app shell with providers */}
              <Route path="/*" element={
                <React.Suspense fallback={
                  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '32px', height: '32px', border: '2px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                }>
                  <ProtectedApp />
                </React.Suspense>
              } />
              </Routes>
            </Sentry.ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
