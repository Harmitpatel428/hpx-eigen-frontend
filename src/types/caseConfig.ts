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

// Per-case workspace (Phase 11)
export interface FieldRuntime {
  isHidden: boolean;
  isApplicable: boolean;
  isRequired: boolean;
  defaultValue: unknown | null;
}
export type CaseFieldWithRuntime = CaseFieldDefinition & FieldRuntime;

export interface StoredFieldValue {
  id: string;
  fieldId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  optionId: string | null;
  selections: { optionId: string }[];
  version: number;
}

export interface FieldValuesResponse {
  fields: CaseFieldWithRuntime[];
  values: StoredFieldValue[];
}

export type CaseStageStatus =
  | 'PENDING' | 'READY' | 'IN_PROGRESS' | 'WAITING_EXTERNAL' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';
export type CaseSlaState =
  | 'ON_TRACK' | 'AT_RISK' | 'OVERDUE' | 'WAITING_EXTERNAL'
  | 'COMPLETED_ON_TIME' | 'COMPLETED_LATE' | 'EXCEPTION_APPROVED'
  | null;

export interface CaseStage {
  id: string;
  timelineId: string;
  templateId: string | null;
  key: string;
  label: string;
  sequence: number;
  status: CaseStageStatus;
  durationValue: number | null;
  durationType: 'DAYS' | 'WEEKS' | 'MONTHS' | null;
  externalWaiting: boolean;
  dependsOnPrevious: boolean;
  enforceRequiredOnComplete: boolean;
  hardBlock: boolean;
  slaState: CaseSlaState;
  startedAt: string | null;
  completedAt: string | null;
  plannedStart: string | null;
  plannedFinish: string | null;
  latestFinish: string | null;
  hardBlockUnlockedAt: string | null;
  hardBlockUnlockedReason: string | null;
}

export interface CaseTimelineResponse {
  timeline: {
    id: string;
    caseId: string;
    caseTypeId: string;
    status: string;
    targetDate: string | null;
    feasible: boolean | null;
    deficitDays: number | null;
    exceptionApproved: boolean;
    exceptionReason: string | null;
  } | null;
  stages: CaseStage[];
}

export interface ForecastResponse {
  projectedCompletion: string | null;
  stages: { stageKey: string; estimateDays: number; confidence: string; explanation: string }[];
}

export interface PatchValueEntry {
  fieldId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  optionId?: string | null;
  selections?: { optionId: string }[];
  version?: number;
}
