import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AuthContextValue, AuthState, User } from '../contracts/AuthContext';
import { AuthMachine } from '../machine/authMachine';
import { authEventBus, AUTH_EVENTS } from '../events/authEvents';
import { tokenStorage } from '../storage/tokenStorage';
import { api } from '../services/api';
import { PermissionServiceImpl } from '../services/PermissionServiceImpl';

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

      // Skip restore on login page to prevent 401 loop
      if (window.location.pathname.includes('/login')) {
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
      const res = await api.post('/api/v1/auth/login', { email, password });
      // Depending on whether api.ts intercepts this or not, res.data may already be the payload
      // But we just updated backend to return { success, data }
      const data = res.data.data || res.data;
      
      if (typeof window !== 'undefined' && (window as any).tokenStorage?.setAccessToken) {
        (window as any).tokenStorage.setAccessToken(data.accessToken);
        (window as any).tokenStorage.setRefreshToken?.(data.refreshToken);
      } else {
        localStorage.setItem('hpx:access-token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('hpx:refresh-token', data.refreshToken);
      }
      
      tokenStorage.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        sessionId: data.sessionId,
        userId: data.userId || data.user?.id,
      });
      
      if (data.user) {
        setUser(data.user);
        const perms = (data.user as any).permissions || {};
        const roles = data.user.roles || [];
        permissionService.current.setManifest(perms, roles);
      }

      if (fsm.current.state !== 'AUTHENTICATED') {
        fsm.current.transition('AUTHENTICATED');
      }

      // Hard reload to bootstrap DepartmentContext with auth state
      window.location.href = '/overview';
    } catch (error: any) {
      // Extract real error message from backend response
      let message = 'Login failed. Please try again.';
      if (error?.response?.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error?.message) {
        message = error.message;
      }
      
      console.error('[AuthContext] Login error:', error);
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
