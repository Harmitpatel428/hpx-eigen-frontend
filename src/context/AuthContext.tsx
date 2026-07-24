import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';
import { authService } from '../services/auth.service';

/** Compiled permission manifest from /api/v1/auth/manifest */
export type PermissionManifest = Record<string, string>;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: PermissionManifest;
  permissionsLoading: boolean;
  /**
   * Returns true if the user has the given permission slug.
   * Usage: {can('lead:create') && <Button>New Lead</Button>}
   */
  can: (slug: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MANIFEST_QUERY_KEY = ['auth', 'manifest'];

async function fetchManifest(): Promise<PermissionManifest> {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return {};

  const response = await fetch('/api/v1/auth/manifest', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return {};
  return response.json() as Promise<PermissionManifest>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Restore session on mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      authService
        .me()
        .then(setUser)
        .catch(() => {
          authService.clearTokens();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch permission manifest — enabled only when authenticated
  const {
    data: permissions = {},
    isLoading: permissionsLoading,
  } = useQuery<PermissionManifest>({
    queryKey: MANIFEST_QUERY_KEY,
    queryFn: fetchManifest,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes — Redis cache is the source of truth
    retry: false,
  });

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authService.login(email, password);
    authService.storeTokens(tokens, (tokens as unknown as { tenantId: string }).tenantId);
    const me = await authService.me();
    setUser(me);
    // Invalidate and refetch permission manifest after login
    await queryClient.invalidateQueries({ queryKey: MANIFEST_QUERY_KEY });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      authService.clearTokens();
      setUser(null);
      // Clear cached manifest on logout
      queryClient.removeQueries({ queryKey: MANIFEST_QUERY_KEY });
    }
  }, [queryClient]);

  /** Check if the authenticated user has a given permission slug */
  const can = useCallback(
    (slug: string): boolean => slug in permissions,
    [permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        permissions,
        permissionsLoading,
        can,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
