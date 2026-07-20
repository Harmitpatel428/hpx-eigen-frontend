import { api } from './api';
import type { Invoice } from '../types/crm';

export const invoiceService = {
  async findAll(filters?: { status?: string; opportunityId?: string }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.opportunityId) params.set('opportunityId', filters.opportunityId);
    
    const { data } = await api.get<any>('/api/v1/invoices', { params });
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async create(input: {
    opportunityId: string; amount: number | string; status?: string; dueDate?: string;
  }): Promise<Invoice> {
    const { data } = await api.post<any>('/api/v1/invoices', input);
    return data?.data || data;
  },

  async update(id: string, input: {
    amount?: number | string; status?: string; dueDate?: string;
  }): Promise<Invoice> {
    const { data } = await api.patch<any>(`/api/v1/invoices/${id}`, input);
    return data?.data || data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/invoices/${id}`);
  },
};
