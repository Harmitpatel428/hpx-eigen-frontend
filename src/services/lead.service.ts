import { api } from './api';
import type { Lead } from '../types';

export const leadService = {
  async findAll(filters?: { status?: string; source?: string }): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.source && filters.source !== 'ALL') params.set('source', filters.source);
    const { data } = await api.get<any>('/api/v1/leads', { params });
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async create(input: {
    firstName: string; lastName: string; email?: string;
    phone?: string; company?: string; source?: string;
  }): Promise<Lead> {
    const { data } = await api.post<any>('/api/v1/leads', input);
    return data?.data || data;
  },

  async update(id: string, input: Partial<Lead>): Promise<Lead> {
    const { data } = await api.put<any>(`/api/v1/leads/${id}`, input);
    return data?.data || data;
  },
};
