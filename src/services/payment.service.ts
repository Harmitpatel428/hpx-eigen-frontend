import { api } from './api';
import type { Payment } from '../types';

export const paymentService = {
  async findAll(filters?: { method?: string; invoiceId?: string }): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (filters?.method) params.set('method', filters.method);
    if (filters?.invoiceId) params.set('invoiceId', filters.invoiceId);
    
    const { data } = await api.get<any>('/api/v1/payments', { params });
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async create(input: {
    invoiceId: string; amount: number | string; method?: string; paidAt?: string;
  }): Promise<Payment> {
    const { data } = await api.post<any>('/api/v1/payments', input);
    return data?.data || data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/payments/${id}`);
  },
};
