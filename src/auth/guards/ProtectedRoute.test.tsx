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
    user: null,
    permissions,
    login: vi.fn(),
    logout: vi.fn(),
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
  it('renders loading UI during RESTORING', () => {
    mockUseAuth('RESTORING');
    
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
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
