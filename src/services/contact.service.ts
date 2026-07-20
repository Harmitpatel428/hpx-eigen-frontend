import { api } from './api';
import type { Contact } from '../types';

export const contactService = {
  async findAll(): Promise<Contact[]> {
    const { data } = await api.get<any>('/api/v1/contacts');
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async create(input: {
    firstName: string; lastName: string; email?: string;
    phone?: string; title?: string; company?: string; leadId?: string;
  }): Promise<Contact> {
    const { data } = await api.post<Contact>('/api/v1/contacts', input);
    return data;
  },
};
