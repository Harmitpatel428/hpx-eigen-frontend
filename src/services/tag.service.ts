import { api } from './api';
import type { LeadTag } from '../types';

export const tagService = {
  async findAll(search?: string): Promise<LeadTag[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const { data } = await api.get<any>(`/api/v1/lead-tags?${params}`);
    return data?.data ?? [];
  },

  async create(name: string, color?: string): Promise<LeadTag> {
    const { data } = await api.post<any>('/api/v1/lead-tags', { name, color });
    return data?.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/lead-tags/${id}`);
  },
};
