import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';

/** React-query keys for a lead's notes. Notes live in the leadNote table; two views are cached:
 *  the full list (modal) and a cheap {count, latest} summary (panel preview). */
export const leadNotesKeys = {
  list: (leadId: string) => ['notes', leadId] as const,
  summary: (leadId: string) => ['notes-summary', leadId] as const,
};

/**
 * Invalidate BOTH cached views after any leadNote write. Every notes mutation must call this so the
 * modal (list) and the panel preview (summary) converge on server truth.
 *
 * Consistency window: the two keys refetch independently, so for a few frames one view can be a
 * refetch ahead of the other. This is acceptable — both endpoints read the same leadNote table with
 * identical filters/order server-side, so the surfaces converge to the same data once both settle.
 */
export function invalidateLeadNotes(queryClient: QueryClient, leadId: string): void {
  queryClient.invalidateQueries({ queryKey: leadNotesKeys.list(leadId) });
  queryClient.invalidateQueries({ queryKey: leadNotesKeys.summary(leadId) });
}

export interface LeadNote {
  id: string;
  leadId: string;
  tenantId: string;
  authorId: string;
  content: string;
  /** Provenance. 'user' (default) or 'legacy_backfill'. May be absent on very old cached payloads. */
  source?: string | null;
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
