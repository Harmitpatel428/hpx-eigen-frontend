import { api } from './api';

export interface TenantUser {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  userRoles?: { role: { id: string; name: string }; scopeType: string }[];
}

export const userService = {
  async listAll(): Promise<TenantUser[]> {
    const { data } = await api.get<any>('/api/v1/users');
    if (Array.isArray(data)) return data;
    return data?.data ?? [];
  },
};
