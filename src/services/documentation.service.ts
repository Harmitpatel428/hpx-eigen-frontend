import { api } from './api';
import type {
  DocCase, DocPreset, DocDashboardKPIs, DocDocumentStatus,
  DocNoteType, DocStorageType, DocPresetCategory, DocPresetItem,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(res: { data: { data?: T; success?: boolean } & T }): T {
  const d = res.data;
  return ('data' in d && d.data !== undefined) ? (d.data as T) : (d as unknown as T);
}

function unwrapList<T>(res: { data: { data: T[]; total: number; page: number; pageSize: number } }) {
  return res.data;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreatePresetPayload {
  name: string;
  description?: string;
  category?: DocPresetCategory;
  color?: string;
  icon?: string;
  items: Array<{
    name: string;
    description?: string;
    isMandatory?: boolean;
    isBlocking?: boolean;
    displayOrder?: number;
    verificationRequired?: boolean;
    expiryTrackingEnabled?: boolean;
    expiryDays?: number;
    notes?: string;
  }>;
}

export interface UpdatePresetPayload {
  name?: string;
  description?: string;
  category?: DocPresetCategory;
  color?: string;
  icon?: string;
  isActive?: boolean;
  changeNote?: string;
  items?: CreatePresetPayload['items'];
}

export interface CreateCasePayload {
  leadId: string;
  presetId?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: number;
  notes?: string;
}

export interface ListCasesParams {
  status?: string;
  assignedTo?: string;
  isReady?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const documentationService = {

  // PRESETS
  listPresets: async (includeInactive = false): Promise<DocPreset[]> => {
    const res = await api.get(`/documentation/presets?includeInactive=${includeInactive}`);
    return unwrap<DocPreset[]>(res);
  },

  getPreset: async (id: string): Promise<DocPreset> => {
    const res = await api.get(`/documentation/presets/${id}`);
    return unwrap<DocPreset>(res);
  },

  createPreset: async (payload: CreatePresetPayload): Promise<DocPreset> => {
    const res = await api.post('/documentation/presets', payload);
    return unwrap<DocPreset>(res);
  },

  updatePreset: async (id: string, payload: UpdatePresetPayload): Promise<DocPreset> => {
    const res = await api.put(`/documentation/presets/${id}`, payload);
    return unwrap<DocPreset>(res);
  },

  deletePreset: async (id: string): Promise<void> => {
    await api.delete(`/documentation/presets/${id}`);
  },

  getSuggestions: async (name: string): Promise<string[]> => {
    const res = await api.post('/documentation/presets/suggestions', { name });
    return unwrap<string[]>(res);
  },

  // CASES
  listCases: async (params: ListCasesParams = {}) => {
    const qs = new URLSearchParams();
    if (params.status)              qs.set('status', params.status);
    if (params.assignedTo)          qs.set('assignedTo', params.assignedTo);
    if (params.isReady !== undefined) qs.set('isReady', String(params.isReady));
    if (params.search)              qs.set('search', params.search);
    if (params.page)                qs.set('page', String(params.page));
    if (params.pageSize)            qs.set('pageSize', String(params.pageSize));
    const res = await api.get(`/documentation/cases?${qs}`);
    return unwrapList<DocCase>(res);
  },

  getCase: async (id: string): Promise<DocCase> => {
    const res = await api.get(`/documentation/cases/${id}`);
    return unwrap<DocCase>(res);
  },

  createCase: async (payload: CreateCasePayload): Promise<DocCase> => {
    const res = await api.post('/documentation/cases', payload);
    return unwrap<DocCase>(res);
  },

  transferToProcess: async (caseId: string): Promise<DocCase> => {
    const res = await api.post(`/documentation/cases/${caseId}/transfer`, {});
    return unwrap<DocCase>(res);
  },

  managerOverride: async (caseId: string, reason: string, expiresAt?: string): Promise<void> => {
    await api.post(`/documentation/cases/${caseId}/override`, { reason, expiresAt });
  },

  addNote: async (caseId: string, noteType: DocNoteType, content: string) => {
    const res = await api.post(`/documentation/cases/${caseId}/notes`, { noteType, content });
    return unwrap(res);
  },

  addReminder: async (caseId: string, reminderDate: string, dueDate?: string, message?: string) => {
    const res = await api.post(`/documentation/cases/${caseId}/reminders`, { reminderDate, dueDate, message });
    return unwrap(res);
  },

  addDocument: async (caseId: string, payload: {
    name: string; description?: string; isMandatory?: boolean;
    isBlocking?: boolean; verificationRequired?: boolean;
  }) => {
    const res = await api.post(`/documentation/cases/${caseId}/documents`, payload);
    return unwrap(res);
  },

  // DOCUMENTS
  updateDocumentStatus: async (docId: string, payload: {
    status: DocDocumentStatus; remarks?: string;
    rejectionReason?: string; waivedReason?: string; expiryDate?: string;
  }) => {
    const res = await api.patch(`/documentation/documents/${docId}/status`, payload);
    return unwrap(res);
  },

  verifyDocument: async (docId: string, result: 'APPROVED' | 'REJECTED', remarks?: string, rejectionReason?: string) => {
    const res = await api.patch(`/documentation/documents/${docId}/verify`, { result, remarks, rejectionReason });
    return unwrap(res);
  },

  addStorageRef: async (docId: string, payload: { storageType: DocStorageType; reference: string; label?: string }) => {
    const res = await api.post(`/documentation/documents/${docId}/storage-refs`, payload);
    return unwrap(res);
  },

  // DASHBOARD
  getDashboardKPIs: async (): Promise<DocDashboardKPIs> => {
    const res = await api.get('/documentation/dashboard');
    return unwrap<DocDashboardKPIs>(res);
  },
};
