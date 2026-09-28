import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as Sentry from '@sentry/react';
import { tokenStorage } from '../auth/storage/tokenStorage';
import { authEventBus, AUTH_EVENTS } from '../auth/events/authEvents';
import { AuthenticationError, RateLimitError, ServerError, NetworkError } from '../auth/errors';

/**
 * Unified API client factory — the ONLY `axios.create` in `src/`.
 *
 * There is exactly ONE authed instance (`api`) app-wide, so its single-flight
 * refresh state below is genuinely one lock. `publicApi` is a bare client for
 * token-authenticated public endpoints: no auth headers, no refresh, so a stray
 * public 401 never bounces a visitor to /login.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

// Fail fast in dev/test if the API base URL is missing — a silent '' there means
// requests hit the vitest/dev origin and fail confusingly. In prod we must NOT
// throw: vercel.json rewrites /api/* same-origin, so '' is correct and a boot
// throw would white-screen the SPA. (Deliberate ruling — keep exactly.)
if (!API_BASE_URL && (import.meta.env.DEV || import.meta.env.MODE === 'test')) {
  throw new Error('VITE_API_URL is not set. Define it in your .env (dev) / .env.test (test).');
}
if (!API_BASE_URL && import.meta.env.MODE === 'production') {
  console.error('VITE_API_URL is empty; relying on same-origin /api/* rewrite (vercel.json).');
}

// --- Single-flight refresh state (module scope; owned by the one authed instance) ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token as string);
  });
  failedQueue = [];
};

function createApiClient(withAuth: boolean): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 15000,
  });

  // --- Request interceptor ---
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (!config.headers.has('X-Correlation-ID')) {
        const correlationId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        config.headers.set('X-Correlation-ID', correlationId);
      }

      // /auth/login and /auth/refresh are public endpoints — a stale Bearer/tenant/
      // department header there is meaningless and only bloats the CORS preflight.
      const isAuthEndpoint =
        !!config.url && (config.url.includes('/auth/login') || config.url.includes('/auth/refresh'));

      if (withAuth && !isAuthEndpoint) {
        const tokens = tokenStorage.get();
        if (tokens?.accessToken) {
          config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
        }
        const tenantId = tokenStorage.getTenantId();
        if (tenantId) {
          // Client-side scoping/observability only — backend is JWT-authoritative
          // for tenant, so this header is never a trust anchor.
          config.headers.set('x-tenant-id', tenantId);
        }
        const activeDepartment = localStorage.getItem('hpx:active-department');
        if (activeDepartment) {
          config.headers.set('X-Department-Id', activeDepartment);
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // --- Response interceptor: single-flight refresh (authed instance only) ---
  if (withAuth) {
    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Network errors (offline, DNS, timeout) have no response.
        if (!error.response) {
          return Promise.reject(new NetworkError(error.message));
        }

        const status = error.response.status;

        // Sentry: 401s that are about to be refreshed are handled noise — skip
        // them. Capture everything else (403/404/5xx/etc).
        if (status !== 401) {
          Sentry.captureException(error);
          Sentry.setTag('api.url', error.config?.url || 'unknown');
          Sentry.setTag('api.status', status);
          Sentry.setContext('api_payload', (error.config?.data as Record<string, unknown>) || {});
        }

        if (status >= 500) {
          return Promise.reject(new ServerError(`Server Error: ${status}`, status.toString()));
        }

        if (status === 401 && originalRequest && !originalRequest._retry) {
          const isAuthEndpoint =
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/refresh');

          // Never refresh on the auth endpoints themselves.
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
                return instance(originalRequest);
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

            // Bare axios.post bypasses this instance's interceptors so a 401 on
            // the refresh call itself can't recurse into another refresh.
            // G1 returns FLAT { accessToken } and does NOT rotate the refresh token.
            const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
              refreshToken: currentTokens.refreshToken,
            });

            const accessToken = res.data.accessToken;
            const refreshToken = res.data.refreshToken ?? currentTokens.refreshToken;
            tokenStorage.set({ ...currentTokens, accessToken, refreshToken });

            authEventBus.dispatch(AUTH_EVENTS.REFRESH_SUCCESS);

            originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
            processQueue(null, accessToken);
            return instance(originalRequest);
          } catch (err) {
            processQueue(err, null);

            // Terminal refresh failure is worth capturing (not handled noise).
            Sentry.captureException(err);

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
  }

  return instance;
}

export const api = createApiClient(true);
export const publicApi = createApiClient(false);
