import axios from 'axios';

let BASE_URL = 'http://127.0.0.1:3000'; // Default to local dev

// If in production, hardcode the Render backend URL
if (import.meta.env.PROD) {
  BASE_URL = 'https://hpx-eigen-backend.onrender.com';
}

// Allow explicit local override if needed
if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http')) {
  BASE_URL = import.meta.env.VITE_API_URL;
}

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
