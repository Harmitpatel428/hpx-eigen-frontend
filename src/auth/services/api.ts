import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../storage/tokenStorage';
import { authEventBus, AUTH_EVENTS } from '../events/authEvents';
import { AuthenticationError, RateLimitError, ServerError, NetworkError } from '../errors';

const BASE_URL = import.meta.env?.VITE_API_URL || '';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// --- Request Interceptor ---
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = tokenStorage.get();
  const tenantId = tokenStorage.getTenantId();

  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  if (tenantId) {
    config.headers.set('x-tenant-id', tenantId);
  }
  
  if (!config.headers.has('X-Correlation-ID')) {
    // Basic fallback for crypto.randomUUID if not in a secure context
    const correlationId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    config.headers.set('X-Correlation-ID', correlationId);
  }

  return config;
});

// --- Response Interceptor ---
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
      const isAuthEndpoint = originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/login');
      
      // Do not attempt to refresh if the failure came from the auth endpoints themselves
      if (isAuthEndpoint) {
        return Promise.reject(new AuthenticationError('Authentication failed', '401'));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      authEventBus.dispatch(AUTH_EVENTS.REFRESH_STARTED);

      try {
        const currentTokens = tokenStorage.get();
        if (!currentTokens?.refreshToken) {
          throw new AuthenticationError('No refresh token available');
        }

        // We use a separate axios instance/call to bypass interceptors
        // so we don't accidentally enter an infinite loop
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
        
      } catch (err: any) {
        processQueue(err, null);
        
        tokenStorage.clear();
        authEventBus.dispatch(AUTH_EVENTS.REFRESH_FAILED, err);
        authEventBus.dispatch(AUTH_EVENTS.LOGOUT);
        
        if (err.response?.status === 429) {
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
