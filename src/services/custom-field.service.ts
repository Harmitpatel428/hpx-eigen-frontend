// ponytail: backend needs POST/GET/PATCH/DELETE /api/v1/lead-fields
// Until then, calls will 404 — the UI handles this gracefully (empty field list, toast on save)

import { api } from './api';
import type { CustomFieldDef } from '../types';

export interface CreateCustomFieldPayload {
  name: string;
  key: string;
  type: CustomFieldDef['type'];
  options?: string[];
  required?: boolean;
  displayOrder?: number;
}

export interface UpdateCustomFieldPayload {
  name?: string;
  options?: string[];
  required?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const { data } = await promise;
  return ((data as { data?: T })?.data ?? data) as T;
}

export const customFieldService = {
  async list(): Promise<CustomFieldDef[]> {
    try {
      return await unwrap<CustomFieldDef[]>(api.get('/api/v1/lead-fields'));
    } catch {
      return []; // graceful degradation until backend ships
    }
  },

  async create(payload: CreateCustomFieldPayload): Promise<CustomFieldDef> {
    return unwrap<CustomFieldDef>(api.post('/api/v1/lead-fields', payload));
  },

  async update(id: string, payload: UpdateCustomFieldPayload): Promise<CustomFieldDef> {
    return unwrap<CustomFieldDef>(api.patch(`/api/v1/lead-fields/${id}`, payload));
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/lead-fields/${id}`);
  },
};
