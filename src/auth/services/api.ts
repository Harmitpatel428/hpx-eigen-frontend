import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Sentry from '@sentry/react';
import { tokenStorage } from '../storage/tokenStorage';
import { authEventBus, AUTH_EVENTS } from '../events/authEvents';
import { AuthenticationError, RateLimitError, ServerError, NetworkError } from '../errors';

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Production-grade API client for HPX Eigen CRM.
 * Restores the frozen auth-v1 contract: single-flight refresh-on-401,
 * x-tenant-id + X-Correlation-ID injection, and logout-on-refresh-failure
 * teardown (see baseline/frontend-auth-v1 @ 07b52d9). The X-Department-Id
 * header and typed helpers are the post-freeze department-switcher additions,
 * kept intact.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// --- Single-flight refresh state (module-level, shared across concurrent 401s) ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// --- Request Interceptor: Auth + tenant + correlation + department ---
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = tokenStorage.get();
    const tenantId = tokenStorage.getTenantId();

    if (tokens?.accessToken) {
      config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
    if (tenantId) {
      // Client-side scoping/observability only — backend is JWT-authoritative
      // for tenant, so this header is never a trust anchor.
      config.headers.set('x-tenant-id', tenantId);
    }

    if (!config.headers.has('X-Correlation-ID')) {
      // Fallback for crypto.randomUUID if not in a secure context
      const correlationId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      config.headers.set('X-Correlation-ID', correlationId);
    }

    // Post-freeze department-switcher feature: inject active department.
    const activeDepartment = localStorage.getItem('hpx:active-department');
    if (activeDepartment) {
      config.headers.set('X-Department-Id', activeDepartment);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor: single-flight refresh on 401 ---
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      Sentry.captureException(error);
      Sentry.setTag('api.url', error.config?.url || 'unknown');
      Sentry.setTag('api.status', error.response.status);
      Sentry.setContext('api_payload', (error.config?.data as Record<string, unknown>) || {});
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Network Errors (Offline, DNS, etc.)
    if (!error.response) {
      return Promise.reject(new NetworkError(error.message));
    }

    const status = error.response.status;

    if (status >= 500) {
      return Promise.reject(new ServerError(`Server Error: ${status}`, status.toString()));
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/login');

      // Do not attempt to refresh if the failure came from the auth endpoints themselves
      if (isAuthEndpoint) {
        return Promise.reject(new AuthenticationError('Authentication failed', '401'));
      }

      // Concurrent 401s queue behind the single in-flight refresh.
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      authEventBus.dispatch(AUTH_EVENTS.REFRESH_STARTED);

      try {
        const currentTokens = tokenStorage.get();
        if (!currentTokens?.refreshToken) {
          throw new AuthenticationError('No refresh token available');
        }

        // Bare axios.post bypasses this instance's interceptors so a 401 on the
        // refresh call itself can't recurse into another refresh (infinite loop).
        const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refreshToken: currentTokens.refreshToken,
        });

        const newTokens = res.data;
        tokenStorage.set({
          ...currentTokens,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || currentTokens.refreshToken,
        });

        authEventBus.dispatch(AUTH_EVENTS.REFRESH_SUCCESS);

        originalRequest.headers.set('Authorization', `Bearer ${newTokens.accessToken}`);

        processQueue(null, newTokens.accessToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);

        tokenStorage.clear();
        authEventBus.dispatch(AUTH_EVENTS.REFRESH_FAILED, err);
        authEventBus.dispatch(AUTH_EVENTS.LOGOUT);

        if ((err as AxiosError)?.response?.status === 429) {
          return Promise.reject(new RateLimitError('Too many refresh attempts', '429'));
        }

        return Promise.reject(new AuthenticationError('Session expired', '401'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// --- Typed HTTP Helpers ---
export async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<{ success: boolean; data: T }>(path, { params });
  return response.data.data;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await api.post<{ success: boolean; data: T }>(path, body);
  return response.data.data;
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  const response = await api.put<{ success: boolean; data: T }>(path, body);
  return response.data.data;
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const response = await api.patch<{ success: boolean; data: T }>(path, body);
  return response.data.data;
}

export async function del<T>(path: string): Promise<T> {
  const response = await api.delete<{ success: boolean; data: T }>(path);
  return response.data.data;
}
