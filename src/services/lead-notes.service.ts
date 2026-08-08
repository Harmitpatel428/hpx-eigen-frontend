import { api } from './api';

export interface LeadNote {
  id: string;
  leadId: string;
  tenantId: string;
  authorId: string;
  content: string;
  followUpDate: string | null;
  followUpTime: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateNotePayload {
  content: string;
  followUpDate?: string;
  followUpTime?: string;
}

export interface UpdateNotePayload {
  content?: string;
  followUpDate?: string | null;
  followUpTime?: string | null;
}

export interface NotesSummary {
  count: number;
  latest: {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
  } | null;
}

export const leadNotesService = {
  async summary(leadId: string): Promise<NotesSummary> {
    const { data } = await api.get<any>(`/api/v1/leads/${leadId}/notes/summary`);
    return data?.data ?? { count: 0, latest: null };
  },

  async list(leadId: string, limit = 15, skip = 0): Promise<LeadNote[]> {
    const { data } = await api.get<any>(`/api/v1/leads/${leadId}/notes?limit=${limit}&skip=${skip}`);
    return data?.data ?? [];
  },

  async create(leadId: string, payload: CreateNotePayload): Promise<LeadNote> {
    const { data } = await api.post<any>(`/api/v1/leads/${leadId}/notes`, payload);
    return data?.data;
  },

  async update(leadId: string, noteId: string, payload: UpdateNotePayload): Promise<LeadNote> {
    const { data } = await api.patch<any>(`/api/v1/leads/${leadId}/notes/${noteId}`, payload);
    return data?.data;
  },

  async delete(leadId: string, noteId: string): Promise<void> {
    await api.delete<any>(`/api/v1/leads/${leadId}/notes/${noteId}`);
  },
};
