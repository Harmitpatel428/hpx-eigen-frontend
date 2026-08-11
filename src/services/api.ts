import axios from 'axios';
import * as Sentry from '@sentry/react';
import { tokenStorage } from '../auth/storage/tokenStorage';
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({ 
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Request interceptor: inject auth + tenant headers ─────────────
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()?.accessToken;
    
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
    if (err.response) {
      // Capture the exact API error, including 401s, 403s, and 500s
      Sentry.captureException(err);
      
      // Add context about the request
      Sentry.setTag('api.url', err.config?.url || 'unknown');
      Sentry.setTag('api.status', err.response.status);
      Sentry.setContext('api_payload', err.config?.data || {});
    }

    if (err.response?.status === 401) {
      // Prevent redirect loop: never redirect when already on the login page
      const isLoginPage = window.location.pathname.includes('/login') ||
        window.location.pathname.includes('/accept-invite');
      if (!isLoginPage) {
        tokenStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

