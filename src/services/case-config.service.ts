import { api } from './api';
import type {
  CaseFieldDefinition,
  CaseFieldOption,
  CaseFieldOptionPayload,
  CaseFieldRule,
  CaseType,
  CaseTypeFieldPlacement,
  CreateCaseFieldPayload,
  CreateCaseTypePayload,
  CreateRulePayload,
  PlacementPayload,
  UpdateCaseFieldPayload,
  UpdateCaseTypePayload,
  UpdateRulePayload,
} from '../types/caseConfig';

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const { data } = await promise;
  return ((data as { data?: T })?.data ?? data) as T;
}

const base = '/api/v1/case-fields';
const typesBase = '/api/v1/case-types';
const rulesBase = '/api/v1/case-field-rules';

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
  listCaseTypes(includeArchived = false): Promise<CaseType[]> {
    return unwrap(api.get(`${typesBase}?includeArchived=${includeArchived}`));
  },
  createCaseType(payload: CreateCaseTypePayload): Promise<CaseType> {
    return unwrap(api.post(typesBase, payload));
  },
  updateCaseType(id: string, payload: UpdateCaseTypePayload): Promise<CaseType> {
    return unwrap(api.patch(`${typesBase}/${id}`, payload));
  },
  publishCaseType(id: string): Promise<CaseType> {
    return unwrap(api.post(`${typesBase}/${id}/publish`));
  },
  archiveCaseType(id: string): Promise<CaseType> {
    return unwrap(api.post(`${typesBase}/${id}/archive`));
  },
  listPlacements(caseTypeId: string): Promise<CaseTypeFieldPlacement[]> {
    return unwrap(api.get(`${typesBase}/${caseTypeId}/fields`));
  },
  addPlacement(caseTypeId: string, payload: PlacementPayload): Promise<CaseTypeFieldPlacement> {
    return unwrap(api.post(`${typesBase}/${caseTypeId}/fields`, payload));
  },
  updatePlacement(caseTypeId: string, fieldId: string, payload: { displayOrder: number }): Promise<CaseTypeFieldPlacement> {
    return unwrap(api.patch(`${typesBase}/${caseTypeId}/fields/${fieldId}`, payload));
  },
  removePlacement(caseTypeId: string, fieldId: string): Promise<unknown> {
    return unwrap(api.delete(`${typesBase}/${caseTypeId}/fields/${fieldId}`));
  },
  listRules(includeArchived = false): Promise<CaseFieldRule[]> {
    return unwrap(api.get(`${rulesBase}?includeArchived=${includeArchived}`));
  },
  createRule(payload: CreateRulePayload): Promise<CaseFieldRule> {
    return unwrap(api.post(rulesBase, payload));
  },
  updateRule(id: string, payload: UpdateRulePayload): Promise<CaseFieldRule> {
    return unwrap(api.patch(`${rulesBase}/${id}`, payload));
  },
  archiveRule(id: string): Promise<CaseFieldRule> {
    return unwrap(api.post(`${rulesBase}/${id}/archive`));
  },
};
