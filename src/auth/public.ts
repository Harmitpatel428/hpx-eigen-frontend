// Public API for Authentication Module

// Components
export { AuthProvider } from './context/AuthContext';
export { ProtectedRoute } from './guards/ProtectedRoute';
export type { ProtectedRouteProps } from './guards/ProtectedRoute';

// Hooks
export { useAuth } from './context/AuthContext';

// Types and Contracts
export type { AuthState, User, AuthContextValue } from './contracts/AuthContext';
export type { PermissionManifest, PermissionService } from './contracts/PermissionService';

// Note: No internal modules (machine, events, storage, services) are exported.
// They are explicitly encapsulated and governed by this public API boundary.
