import { api } from './api';

export interface TenantUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  createdAt: string;
  departmentId?: string | null;
  userRoles?: { role: { id: string; name: string }; scopeType: string }[];
}

export const userService = {
  async listAll(): Promise<TenantUser[]> {
    const { data } = await api.get<any>('/api/v1/users');
    if (Array.isArray(data)) return data;
    return data?.data ?? [];
  },

  /** Admin-only: set another member's password. Backend enforces user:password:reset + same-tenant. */
  async setMemberPassword(userId: string, newPassword: string): Promise<{ sessionsRevoked?: number }> {
    const { data } = await api.put<any>(`/api/v1/users/${userId}/password`, { newPassword });
    return data?.data ?? data ?? {};
  },
};
