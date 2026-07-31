import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
    // Use your existing tokenStorage if available, fallback to localStorage
    const token = typeof window !== 'undefined'
      ? (window as any).tokenStorage?.getAccessToken?.() 
        || localStorage.getItem('hpx:access-token')
      : null;

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
      // Clear auth state
      if (typeof window !== 'undefined') {
        (window as any).tokenStorage?.clear?.();
        localStorage.removeItem('hpx:access-token');
        localStorage.removeItem('hpx:active-department');
      }
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    if (error.response?.status === 403) {
      return Promise.reject(new Error('Insufficient permissions.'));
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
