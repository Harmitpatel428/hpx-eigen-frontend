import axios from 'axios';
import * as Sentry from '@sentry/react';
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({ 
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Request interceptor: inject auth + tenant headers ─────────────
api.interceptors.request.use((config) => {
  // Check all known token storage keys
  const token = 
    localStorage.getItem('hpx:access-token') || 
    localStorage.getItem('accessToken') || 
    localStorage.getItem('token');
    
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const tenantId = localStorage.getItem('auth:tenant') || localStorage.getItem('tenantId');
  const departmentId = localStorage.getItem('hpx:active-department') || localStorage.getItem('activeDepartmentId');
  
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  if (departmentId) {
    config.headers['x-department-context'] = departmentId;
  }
  
  return config;
});

// ─── Response interceptor: handle 401 → clear session ─────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Prevent redirect loop: never redirect when already on the login page
      const isLoginPage = window.location.pathname.includes('/login');
      if (!isLoginPage) {
        if (typeof window !== 'undefined') {
          (window as any).tokenStorage?.clear?.();
        }
        localStorage.removeItem('hpx:access-token');
        localStorage.removeItem('auth:tokens');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userId');
        window.location.href = '/login';
      }
    }

    // Capture API errors in Sentry, but ignore 401s (session expirations) to reduce noise
    if (err.response && err.response.status !== 401) {
      Sentry.captureException(err);
    }

    return Promise.reject(err);
  }
);

