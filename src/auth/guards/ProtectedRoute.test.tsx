import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';
import { PermissionServiceImpl } from '../services/PermissionServiceImpl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthState } from '../contracts/AuthContext';

const mockUseAuth = (status: AuthState, setupPermissions?: (perms: PermissionServiceImpl) => void) => {
  const permissions = new PermissionServiceImpl();
  if (setupPermissions) {
    setupPermissions(permissions);
  }
  
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    status,
    // Current contract: AUTHENTICATED/error states require a truthy user
    // (ProtectedRoute redirects to /login when `!user`). A realistic user
    // object is required here so those states actually reach their branch.
    user: { id: 'test-user-1', email: 'test@example.com' },
    permissions,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  it('renders nothing during RESTORING (avoids dashboard flash, per d0273c5)', () => {
    mockUseAuth('RESTORING');

    const { container } = renderWithRouter(
      <ProtectedRoute>
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );

    // Deliberate product behavior (commit d0273c5, "production incident
    // resolution"): ProtectedRoute returns null while RESTORING instead of
    // rendering loadingFallback, so children never flash before redirect/auth.
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects to login when UNAUTHENTICATED', () => {
    mockUseAuth('UNAUTHENTICATED');
    
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders error UI during RESTORE_ERROR', () => {
    mockUseAuth('RESTORE_ERROR');
    
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('auth-error')).toBeInTheDocument();
  });

  it('renders children when AUTHENTICATED and no requirements', () => {
    mockUseAuth('AUTHENTICATED');
    
    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children when user has required role', () => {
    mockUseAuth('AUTHENTICATED', (p) => p.setManifest({}, ['admin']));
    
    renderWithRouter(
      <ProtectedRoute requireRole="admin">
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders fallback when user is missing required role', () => {
    mockUseAuth('AUTHENTICATED', (p) => p.setManifest({}, ['user']));
    
    renderWithRouter(
      <ProtectedRoute requireRole="admin" fallback={<div data-testid="fallback">Access Denied</div>}>
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children when user has required permission', () => {
    mockUseAuth('AUTHENTICATED', (p) => p.setManifest({ 'edit:users': 'desc' }, []));
    
    renderWithRouter(
      <ProtectedRoute requirePermission="edit:users">
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders fallback when user is missing required permission', () => {
    mockUseAuth('AUTHENTICATED', (p) => p.setManifest({ 'view:users': 'desc' }, []));
    
    renderWithRouter(
      <ProtectedRoute requirePermission="edit:users" fallback={<div data-testid="fallback">Access Denied</div>}>
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });
});
