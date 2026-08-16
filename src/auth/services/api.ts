import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Sentry from '@sentry/react';
import { tokenStorage } from '../storage/tokenStorage';
/**
 * Typed error that carries the HTTP status code so callers can distinguish
 * 403 Forbidden from 500 Internal Server Error, etc.
 */
export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Production-grade API client for HPX Eigen CRM.
 * Integrates with existing tokenStorage for accessToken management.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// ─── Request Interceptor: Attach Bearer + Department Context ───────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get()?.accessToken;
      
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Inject active department for backend middleware
    const activeDepartment = localStorage.getItem('hpx:active-department');
    if (activeDepartment && config.headers) {
      config.headers['X-Department-Id'] = activeDepartment;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Unified 401 Handling ────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Capture the exact API error, including 401s, 403s, and 500s
      Sentry.captureException(error);
      
      // Add context about the request
      Sentry.setTag('api.url', error.config?.url || 'unknown');
      Sentry.setTag('api.status', error.response.status);
      Sentry.setContext('api_payload', error.config?.data || {});
    }

    if (error.response?.status === 401) {
      // Prevent redirect loop on any public auth route
      const currentPath = window.location.pathname;
      const isPublicAuthRoute =
        currentPath.includes('/login') ||
        currentPath.includes('/signup') ||
        currentPath.includes('/register') ||
        currentPath.includes('/accept-invite');

      if (!isPublicAuthRoute) {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
      // On auth routes (login, signup, etc.) the 401 means wrong credentials —
      // pass the original error through so the caller can read the response body.
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      return Promise.reject(new ApiError('Insufficient permissions.', 403));
    }

    if (error.response?.status === 500) {
      return Promise.reject(new ApiError('A server error occurred. Please try again later.', 500));
    }

    const message = (error.response?.data as any)?.error?.message 
      || (error.response?.data as any)?.message 
      || error.message 
      || 'Request failed.';

    return Promise.reject(new Error(message));
  }
);

// ─── Typed HTTP Helpers ────────────────────────────────────────────
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
