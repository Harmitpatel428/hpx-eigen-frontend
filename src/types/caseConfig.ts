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
