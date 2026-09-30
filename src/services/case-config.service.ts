import { api } from './api';
import type {
  CaseFieldDefinition,
  CaseFieldOption,
  CaseFieldOptionPayload,
  CreateCaseFieldPayload,
  UpdateCaseFieldPayload,
} from '../types/caseConfig';

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const { data } = await promise;
  return ((data as { data?: T })?.data ?? data) as T;
}

const base = '/api/v1/case-fields';

// Errors intentionally propagate so react-query can surface 403/500.
export const caseConfigService = {
  listFields(includeArchived = false): Promise<CaseFieldDefinition[]> {
    return unwrap(api.get(`${base}?includeArchived=${includeArchived}`));
  },
  createField(payload: CreateCaseFieldPayload): Promise<CaseFieldDefinition> {
    return unwrap(api.post(base, payload));
  },
  updateField(id: string, payload: UpdateCaseFieldPayload): Promise<CaseFieldDefinition> {
    return unwrap(api.patch(`${base}/${id}`, payload));
  },
  activateField(id: string): Promise<CaseFieldDefinition> {
    return unwrap(api.post(`${base}/${id}/activate`));
  },
  setFieldReadOnly(id: string): Promise<CaseFieldDefinition> {
    return unwrap(api.post(`${base}/${id}/read-only`));
  },
  archiveField(id: string): Promise<CaseFieldDefinition> {
    return unwrap(api.post(`${base}/${id}/archive`));
  },
  listOptions(fieldId: string, includeArchived = false): Promise<CaseFieldOption[]> {
    return unwrap(api.get(`${base}/${fieldId}/options?includeArchived=${includeArchived}`));
  },
  createOption(fieldId: string, payload: CaseFieldOptionPayload): Promise<CaseFieldOption> {
    return unwrap(api.post(`${base}/${fieldId}/options`, payload));
  },
  updateOption(fieldId: string, optionId: string, payload: Partial<CaseFieldOptionPayload>): Promise<CaseFieldOption> {
    return unwrap(api.patch(`${base}/${fieldId}/options/${optionId}`, payload));
  },
  archiveOption(fieldId: string, optionId: string): Promise<CaseFieldOption> {
    return unwrap(api.post(`${base}/${fieldId}/options/${optionId}/archive`));
  },
};
