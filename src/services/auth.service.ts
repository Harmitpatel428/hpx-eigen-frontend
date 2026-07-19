import { api } from './api';
import type { AuthTokens, User } from '../types';

export const authService = {
  async login(tenantId: string, email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/api/auth/login', { tenantId, email, password });
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/api/auth/me');
    return data;
  },

  async refresh(_sessionId: string, refreshToken: string): Promise<{ accessToken: string }> {
    const { data } = await api.post('/api/auth/refresh', { refreshToken });
    return data;
  },

  storeTokens(tokens: AuthTokens, tenantId: string): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('sessionId', tokens.sessionId);
    localStorage.setItem('userId', tokens.userId);
    localStorage.setItem('tenantId', tenantId);
  },

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userId');
    localStorage.removeItem('tenantId');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },
};
