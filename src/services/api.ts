import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: inject auth + tenant headers ─────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  const departmentId = localStorage.getItem('activeDepartmentId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
      const code = err.response?.data?.code;
      if (code === 'SESSION_EXPIRED' || code === 'SESSION_REVOKED') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userId');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

