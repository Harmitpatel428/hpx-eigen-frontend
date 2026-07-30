import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  
  // Authorization checks
  requireRole?: string;
  requireAnyRole?: string[];
  requirePermission?: string;
  requireAnyPermission?: string[];
  requireAllPermissions?: string[];
  
  // Custom Fallbacks
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  
  // Redirect
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
  requireAnyRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  fallback = null,
  loadingFallback = <div data-testid="auth-loading">Loading session...</div>,
  errorFallback = <div data-testid="auth-error">Authentication error.</div>,
  redirectTo = '/login',
}) => {
  const { status, permissions } = useAuth();

  // 1. FSM States - In Progress
  if (status === 'UNINITIALIZED' || status === 'RESTORING' || status === 'REFRESHING') {
    return <>{loadingFallback}</>;
  }

  // 2. FSM States - Logged Out
  if (status === 'UNAUTHENTICATED') {
    return <Navigate to={redirectTo} replace />;
  }
  
  // 3. FSM States - Errors
  if (status === 'AUTH_ERROR' || status === 'RESTORE_ERROR' || status === 'NETWORK_ERROR') {
    return <>{errorFallback}</>;
  }

  // 4. Authorized State - Delegate to PermissionService
  if (requireRole && !permissions.hasRole(requireRole)) {
    return <>{fallback}</>;
  }
  
  if (requireAnyRole && !permissions.hasAnyRole(requireAnyRole)) {
    return <>{fallback}</>;
  }
  
  if (requirePermission && !permissions.can(requirePermission)) {
    return <>{fallback}</>;
  }
  
  if (requireAnyPermission && !permissions.canAny(requireAnyPermission)) {
    return <>{fallback}</>;
  }
  
  if (requireAllPermissions && !permissions.canAll(requireAllPermissions)) {
    return <>{fallback}</>;
  }

  // 5. Authorized - Render
  return <>{children}</>;
};
