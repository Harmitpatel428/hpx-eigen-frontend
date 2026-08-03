import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
    // Check all known token storage keys
    const token = 
      localStorage.getItem('hpx:access-token') || 
      localStorage.getItem('accessToken') || 
      localStorage.getItem('token');
      
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
    if (error.response?.status === 401) {
      // Prevent redirect loop when already on login page
      const isLoginPage = window.location.pathname.includes('/login');
      if (!isLoginPage) {
        if (typeof window !== 'undefined') {
          (window as any).tokenStorage?.clear?.();
          localStorage.removeItem('hpx:access-token');
          localStorage.removeItem('hpx:active-department');
        }
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Session expired. Please log in again.'));
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
