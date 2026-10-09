import { api } from './api';
import type { Contact } from '../types';

export interface ContactListResult {
  data: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

export const contactService = {
  /**
   * Server-side list: search + pagination are performed by the API
   * (GET /api/v1/contacts supports ?search, ?page, ?pageSize and returns
   * { data, total, page, pageSize }). Scope/permission filtering stays on the server.
   */
  async list(params: { search?: string; page?: number; pageSize?: number } = {}): Promise<ContactListResult> {
    const { data } = await api.get<any>('/api/v1/contacts', { params });
    return {
      data: Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []),
      total: typeof data?.total === 'number' ? data.total : (Array.isArray(data?.data) ? data.data.length : 0),
      page: typeof data?.page === 'number' ? data.page : (params.page ?? 1),
      pageSize: typeof data?.pageSize === 'number' ? data.pageSize : (params.pageSize ?? 50),
    };
  },

  async create(input: {
    firstName: string; lastName: string; email?: string;
    phone?: string; title?: string; company?: string; leadId?: string;
  }): Promise<Contact> {
    const { data } = await api.post<any>('/api/v1/contacts', input);
    return data?.data || data;
  },
};
