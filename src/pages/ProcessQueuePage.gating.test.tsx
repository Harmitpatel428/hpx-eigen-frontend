import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/guards/ProtectedRoute';
import * as AuthContextModule from '../auth/context/AuthContext';
import { PermissionServiceImpl } from '../auth/services/PermissionServiceImpl';
import { ProcessQueuePage } from './ProcessQueuePage';

vi.mock('../services/process.service', () => ({ processService: { listIncoming: vi.fn().mockResolvedValue([]) } }));
vi.mock('../services/documentation.service', () => ({
  documentationService: { getDashboardKPIs: vi.fn().mockResolvedValue({}) },
}));

const mockAuth = (manifest: Record<string, string>) => {
  const permissions = new PermissionServiceImpl();
  permissions.setManifest(manifest, []);
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    status: 'AUTHENTICATED',
    user: { id: 'u1', email: 'u@example.com' },
    permissions,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });
};

// Same route wiring as ProtectedApp's /process entry.
const renderAt = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/process']}>
        <Routes>
          <Route path="/process" element={
            <ProtectedRoute requirePermission="process:view" fallback={<Navigate to="/overview" replace />}>
              <ProcessQueuePage />
            </ProtectedRoute>
          } />
          <Route path="/overview" element={<div data-testid="overview">Overview</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('/process route gating', () => {
  it('renders the page when process:view is granted', () => {
    mockAuth({ 'process:view': '' });
    renderAt();
    expect(screen.getByRole('heading', { name: 'Process' })).toBeInTheDocument();
    expect(screen.queryByTestId('overview')).not.toBeInTheDocument();
  });

  it('redirects to /overview when process:view is not granted', () => {
    mockAuth({ 'doc:view': '' });
    renderAt();
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Process' })).not.toBeInTheDocument();
  });
});
