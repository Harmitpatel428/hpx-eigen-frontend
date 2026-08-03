import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AuthContextValue, AuthState, User } from '../contracts/AuthContext';
import { AuthMachine } from '../machine/authMachine';
import { authEventBus, AUTH_EVENTS } from '../events/authEvents';
import { tokenStorage } from '../storage/tokenStorage';
import { api } from '../services/api';
import { PermissionServiceImpl } from '../services/PermissionServiceImpl';
import * as Sentry from '@sentry/react';

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fsm = useRef(new AuthMachine());
  const permissionService = useRef(new PermissionServiceImpl());
  const [status, setStatus] = useState<AuthState>(fsm.current.state);
  const [user, setUser] = useState<User | null>(null);

  // Sync FSM state to React state
  useEffect(() => {
    return fsm.current.subscribe((newState) => {
      setStatus(newState);
    });
  }, []);

  // Orchestrate Auth Events
  useEffect(() => {
    const unsubRefreshStart = authEventBus.subscribe(AUTH_EVENTS.REFRESH_STARTED, () => {
      if (fsm.current.state === 'AUTHENTICATED') {
        fsm.current.transition('REFRESHING');
      }
    });

    const unsubRefreshSuccess = authEventBus.subscribe(AUTH_EVENTS.REFRESH_SUCCESS, () => {
      if (fsm.current.state === 'REFRESHING') {
        fsm.current.transition('AUTHENTICATED');
      }
    });

    const unsubLogout = authEventBus.subscribe(AUTH_EVENTS.LOGOUT, () => {
      setUser(null);
      if (fsm.current.state !== 'UNAUTHENTICATED') {
        fsm.current.transition('UNAUTHENTICATED');
      }
    });

    return () => {
      unsubRefreshStart();
      unsubRefreshSuccess();
      unsubLogout();
    };
  }, []);

  // Session Restoration
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (fsm.current.state !== 'UNINITIALIZED') return;

      // Skip restore on all public auth pages to prevent a 401 loop:
      // AuthContext fires /users/me with no token → 401 → interceptor redirects
      // to /login → appears as an unexpected page refresh on /signup.
      const currentPath = window.location.pathname;
      const isPublicAuthRoute =
        currentPath.includes('/login') ||
        currentPath.includes('/signup') ||
        currentPath.includes('/register');

      if (isPublicAuthRoute) {
        fsm.current.transition('UNAUTHENTICATED');
        return;
      }

      const tokens = tokenStorage.get();
      if (!tokens) {
        fsm.current.transition('UNAUTHENTICATED');
        return;
      }

      try {
        fsm.current.transition('RESTORING');
        const res = await api.get<User>('/api/v1/users/me');
        if (isMounted) {
          setUser(res.data);

          // Seed permissions cache
          const perms = (res.data as any).permissions || {};
          const roles = res.data.roles || [];
          permissionService.current.setManifest(perms, roles);

          fsm.current.transition('AUTHENTICATED');
        }
      } catch (error) {
        if (isMounted) {
          fsm.current.transition('RESTORE_ERROR');
          fsm.current.transition('UNAUTHENTICATED');
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cross-Tab Synchronization
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleStorage = (e: StorageEvent) => {
      // By standard, storage events only fire for OTHER tabs.
      // But we robustly check the key and state.
      if (e.key === 'auth:tokens') {
        // If newValue is null, tokens were cleared -> LOGOUT
        if (!e.newValue) {
          if (fsm.current.state !== 'UNAUTHENTICATED') {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              if (fsm.current.state !== 'UNAUTHENTICATED') {
                authEventBus.dispatch(AUTH_EVENTS.LOGOUT);
              }
            }, 50);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearTimeout(timeoutId);
    };
  }, []);

  // Public API
  const login = useCallback(async (email: string, password: string) => {
    try {
      Sentry.addBreadcrumb({ category: 'auth', message: 'Login attempt started', level: 'info' });
      const res = await api.post('/api/v1/auth/login', { email, password });
      
      Sentry.addBreadcrumb({ category: 'auth', message: 'Login API success', level: 'info', data: res.data });
      const accessToken = res.data?.data?.accessToken;
      const refreshToken = res.data?.data?.refreshToken;
      const user = res.data?.data?.user;

      if (!accessToken) {
        console.error('Token missing from response!', res.data);
        throw new Error('Login failed: No token received.');
      }

      // Save to localStorage
      localStorage.setItem('hpx:access-token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      Sentry.addBreadcrumb({ category: 'auth', message: 'Token saved to localStorage', level: 'info' });
      if (refreshToken) {
        localStorage.setItem('hpx:refresh-token', refreshToken);
      }

      try {
        tokenStorage.set({
          accessToken,
          refreshToken,
          sessionId: res.data?.data?.sessionId,
          userId: user?.id,
        });
        Sentry.addBreadcrumb({ category: 'auth', message: 'Token saved to tokenStorage', level: 'info' });
      } catch (e) {
        console.warn('Failed to sync to tokenStorage class', e);
      }
      
      if (user) {
        setUser(user);
        const perms = (user as any).permissions || {};
        const roles = user.roles || [];
        permissionService.current.setManifest(perms, roles);
      }

      if (fsm.current.state !== 'AUTHENTICATED') {
        fsm.current.transition('AUTHENTICATED');
      }

      Sentry.addBreadcrumb({ category: 'auth', message: 'State updated, login complete', level: 'info' });
      // Navigation is handled by the caller (e.g., LoginPage)
    } catch (error: any) {
      Sentry.captureException(error);
      // Extract real error message from backend response
      let message = 'Login failed. Please try again.';
      if (error?.response?.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error?.message) {
        message = error.message;
      }
      
      console.error('[AuthContext] Login error thrown to UI:', message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (e) {
      // Ignore transport errors on logout
    } finally {
      tokenStorage.clear();
      permissionService.current.clear();
      authEventBus.dispatch(AUTH_EVENTS.LOGOUT);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    permissions: permissionService.current,
    login,
    logout,
  }), [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
