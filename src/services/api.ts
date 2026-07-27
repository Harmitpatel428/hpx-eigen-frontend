import axios from 'axios';

// Hardcoded to bypass Vercel env var caching issues
const PROD_API_URL = 'https://hpx-eigen-backend.onrender.com';
const DEV_API_URL = 'http://127.0.0.1:3000';

// Deterministic check: if we are in production, use Render. Otherwise, use local.
const BASE_URL = import.meta.env.PROD ? PROD_API_URL : DEV_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: inject auth + tenant headers ─────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
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
