import type { PermissionService } from './PermissionService';

export type AuthState =
  | 'UNINITIALIZED'
  | 'RESTORING'
  | 'AUTHENTICATED'
  | 'REFRESHING'
  | 'UNAUTHENTICATED'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'RESTORE_ERROR';

export interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  permissionsVersion?: number;
}

export interface AuthContextValue {
  /** Current state of the finite state machine (FSM) */
  status: AuthState;

  /** Authenticated user details, if available */
  user: User | null;

  /** Evaluates authorization logic synchronously */
  permissions: PermissionService;

  /** Initiates the login flow */
  login: (email: string, password: string) => Promise<void>;

  /** Initiates the strict logout flow */
  logout: () => Promise<void>;
}
