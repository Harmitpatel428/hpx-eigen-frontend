/**
 * Auth API surface. The axios instance now lives in the unified factory
 * (`src/services/http.ts`) — this file re-exports the single authed client so
 * existing `import { api } from '.../auth/services/api'` sites keep working,
 * and keeps the typed helpers unchanged.
 */
export { api } from '../../services/http';
import { api } from '../../services/http';

// --- Typed HTTP Helpers ---
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
