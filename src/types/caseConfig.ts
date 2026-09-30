export type CaseFieldType =
  | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DECIMAL' | 'CURRENCY' | 'PERCENTAGE'
  | 'DATE' | 'DATETIME' | 'TIME' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT'
  | 'EMAIL' | 'PHONE' | 'URL' | 'USER_REFERENCE' | 'DEPARTMENT_REFERENCE'
  | 'CASE_REFERENCE' | 'DOCUMENT_REFERENCE';

export type CaseFieldStatus = 'DRAFT' | 'ACTIVE' | 'READ_ONLY' | 'ARCHIVED';

export const SELECT_TYPES: CaseFieldType[] = ['SELECT', 'MULTI_SELECT'];
export const isSelectType = (t: CaseFieldType) => SELECT_TYPES.includes(t);

export interface CaseFieldDefinition {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string | null;
  type: CaseFieldType;
  status: CaseFieldStatus;
  owningDepartmentId: string;
  validationRules: Record<string, unknown>;
  visibility: Record<string, unknown>;
  reportable: boolean;
  filterable: boolean;
  sortable: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CaseFieldOption {
  id: string;
  tenantId: string;
  fieldId: string;
  key: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
  parentOptionId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCaseFieldPayload {
  key: string;
  name: string;
  description?: string;
  type: CaseFieldType;
  owningDepartmentId: string;
  validationRules?: Record<string, unknown>;
  reportable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  displayOrder?: number;
}

export interface UpdateCaseFieldPayload {
  name?: string;
  description?: string | null;
  validationRules?: Record<string, unknown>;
  reportable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  displayOrder?: number;
}

export interface CaseFieldOptionPayload {
  key: string;
  label: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type CaseTypeStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type CaseFieldRuleEffectType = 'REQUIRE_FIELD' | 'HIDE_FIELD' | 'SET_DEFAULT';
export type CaseFieldConditionOperator =
  | 'EQUALS' | 'NOT_EQUALS' | 'IS_EMPTY' | 'IS_NOT_EMPTY'
  | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'NOT_IN';

export interface CaseType {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string | null;
  status: CaseTypeStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CaseTypeFieldPlacement {
  id: string;
  tenantId: string;
  caseTypeId: string;
  fieldId: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFieldRule {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  conditionFieldId: string;
  conditionOperator: CaseFieldConditionOperator;
  conditionValue: unknown;
  conditionOptionId: string | null;
  effectType: CaseFieldRuleEffectType;
  targetFieldId: string;
  defaultPayload: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCaseTypePayload {
  key: string;
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateCaseTypePayload {
  name?: string;
  description?: string | null;
  displayOrder?: number;
}

export interface PlacementPayload {
  fieldId: string;
  displayOrder?: number;
}

export interface CreateRulePayload {
  name: string;
  description?: string;
  priority?: number;
  conditionFieldId: string;
  conditionOperator: CaseFieldConditionOperator;
  conditionValue?: unknown;
  conditionOptionId?: string | null;
  effectType: CaseFieldRuleEffectType;
  targetFieldId: string;
  defaultPayload?: unknown;
}

export type UpdateRulePayload = Partial<CreateRulePayload> & { isActive?: boolean };
