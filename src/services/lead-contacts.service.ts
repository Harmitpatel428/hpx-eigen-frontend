import { api } from './api';

export interface LeadContact {
  id: string;
  leadId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  role: string | null;
  isMain: boolean;
  createdAt: string;
}

export interface UpsertContactPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  role?: string;
  isMain?: boolean;
}

export const leadContactsService = {
  async list(leadId: string): Promise<LeadContact[]> {
    const { data } = await api.get<any>(`/api/v1/leads/${leadId}/contacts`);
    return data?.data ?? [];
  },

  async add(leadId: string, payload: UpsertContactPayload): Promise<LeadContact[]> {
    const { data } = await api.post<any>(`/api/v1/leads/${leadId}/contacts`, payload);
    return data?.data ?? [];
  },

  async update(leadId: string, contactId: string, payload: Partial<UpsertContactPayload>): Promise<LeadContact[]> {
    const { data } = await api.put<any>(`/api/v1/leads/${leadId}/contacts/${contactId}`, payload);
    return data?.data ?? [];
  },

  async remove(leadId: string, contactId: string): Promise<LeadContact[]> {
    const { data } = await api.delete<any>(`/api/v1/leads/${leadId}/contacts/${contactId}`);
    return data?.data ?? [];
  },
};
