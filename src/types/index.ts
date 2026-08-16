// ============================================================================
// CORE AUTH & USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  teamId?: string | null;
  departmentId?: string | null;
  userRoles?: { role: { id: string; name: string } }[];
}

// ============================================================================
// AUTHORIZATION — RBAC + ABAC
// ============================================================================

/** The data-access scope bound to a role assignment */
export type ScopeType = 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION';

export interface Permission {
  id: string;
  slug: string;
  module: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: string;
  _count?: { users: number };
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export interface Team {
  id: string;
  name: string;
  departmentId: string | null;
  _count?: { users: number };
}

export interface UserRoleAssignment {
  id: string;
  email: string;
  status: string;
  teamId: string | null;
  departmentId: string | null;
  scopeType: ScopeType;
}


export interface AuthTokens {
  accessToken: string;
  sessionId: string;
  expiresAt: string;
  userId: string;
}

export interface Session {
  id: string;
  status: string;
  createdAt: string;
  lastActivityAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

// ============================================================================
// CRM DOMAIN — ENUMS
// ============================================================================

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED' | 'CONVERTED';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'EMAIL_CAMPAIGN' | 'SOCIAL_MEDIA' | 'TRADE_SHOW' | 'OTHER';
export type LeadStage =
  // Active selectable stages
  | 'NEW' | 'QUALIFIED' | 'FOLLOW_UP' | 'CALL_BACK_REQUESTED' | 'CALL_NOT_RECEIVED' | 'OTHER' | 'DISQUALIFIED'
  // Legacy read-only values — historical records only
  | 'CONTACTED' | 'CONVERTED';

export type LeadActivityType =
  | 'STAGE_CHANGE' | 'FOLLOW_UP_SCHEDULED' | 'CALLBACK_SCHEDULED' | 'CALL_NOT_RECEIVED_EVENT'
  | 'ASSIGNMENT_CHANGE' | 'LEAD_CREATED' | 'NOTE_ADDED' | 'OTHER';
export type LeadActivityState = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface LeadActivity {
  id: string;
  tenantId: string;
  leadId: string;
  actorUserId: string | null;
  actor?: { id: string; firstName: string | null; lastName: string | null } | null;
  type: LeadActivityType;
  state: LeadActivityState;
  subject: string;
  metadata: Record<string, unknown>;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export type LeadPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type OpportunityStage = 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';

// ============================================================================
// CRM DOMAIN — MODELS
// ============================================================================

export interface LeadTag {
  id: string;
  tenantId: string;
  name: string;
  color: string | null;
  usageCount: number;
}

// ============================================================================
// CUSTOM FIELDS — metadata-driven, extensible to any module
// ============================================================================

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown';

export interface CustomFieldDef {
  id: string;
  tenantId: string;
  module: 'lead'; // expand to union when other modules need it
  name: string;
  key: string; // snake_case, derived from name, immutable after creation
  type: CustomFieldType;
  options?: string[]; // only populated for dropdown type
  required: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  fieldId: string;
  key: string;
  type: CustomFieldType;
  value: string | null;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number | null;
  stage: LeadStage | null;
  followUpDate: string | null;
  expectedValue: string | null; // Decimal comes back as string from JSON
  priority: LeadPriority;
  expectedCloseDate: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  area: string | null; // renamed "Office / Factory Location" in UI
  postalCode: string | null;
  freeformAddress: string | null; // ponytail: needs backend migration (ALTER TABLE leads ADD COLUMN "freeformAddress" TEXT)
  ownerId: string | null;
  owner?: { id: string; firstName: string | null; lastName: string | null } | null;
  notes: string | null;
  tags: LeadTag[];
  customFieldValues?: CustomFieldValue[]; // ponytail: needs backend API at /api/v1/lead-fields
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DYNAMIC FORM ENGINE — Architecture foundation for configurable forms
// ============================================================================

export type FormFieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'currency' | 'percentage'
  | 'dropdown' | 'multi-select' | 'checkbox' | 'radio' | 'textarea'
  | 'date' | 'datetime' | 'url'
  | 'user-picker' | 'department-picker' | 'tag-selector';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface VisibilityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: FormFieldOption[];
  visible?: boolean;
  displayOrder: number;
  visibilityCondition?: VisibilityCondition;
  width?: 'full' | 'half';
}

export interface FormSectionConfig {
  id: string;
  label: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  displayOrder: number;
  visible?: boolean;
  fields: FormFieldConfig[];
}

export interface FormConfig {
  id: string;
  module: string;
  tenantId?: string;
  sections: FormSectionConfig[];
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  role: string | null;
  isMain: boolean;
  company: string | null;
  leadId: string | null;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  leadId: string;
  contactId: string | null;
  ownerId: string;
  value: string;
  currency: string;
  stage: OpportunityStage;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  createdAt: string;
  lead?: { id: string; firstName: string; lastName: string; company: string | null } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  daysInStage?: number;
}

export interface Activity {
  id: string;
  opportunityId: string;
  userId: string;
  type: ActivityType;
  subject: string;
  notes: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PipelineRecord {
  id: string;
  opportunityId: string;
  stage: string;
  enteredAt: string;
  exitedAt: string | null;
  durationDays: number | null;
}

export interface DashboardStats {
  totalLeads: number;
  leadsChange: number;
  openOpportunities: number;
  oppChange: number;
  pipelineValue: string;
  pipelineValueCr: string;
}

// ============================================================================
// PAGINATION & FILTER HELPERS
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterState {
  status?: LeadStatus | LeadStatus[];
  source?: LeadSource | LeadSource[];
  stage?: OpportunityStage | OpportunityStage[];
  owner?: string;
  type?: ActivityType | ActivityType[];
  dateRange?: [string, string];
  valueRange?: [number, number];
  searchQuery?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total?: number;
}

// ============================================================================
// S3 FINANCE DOMAIN — ENUMS
// ============================================================================

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH' | 'NEFT' | 'RTGS' | 'IMPS' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'RECEIVED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

// ============================================================================
// S3 FINANCE DOMAIN — MODELS
// ============================================================================

export interface Invoice {
  id: string;
  tenantId: string;
  opportunityId: string;
  amount: number | string;
  taxPercentage: number | string;
  discount: number | string;
  otherCharges: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paymentTerms: string | null;
  internalNotes: string | null;
  invoiceNotes: string | null;
  termsConditions: string | null;
  attachments: string[];
  status: InvoiceStatus;
  dueDate: string | null;
  invoiceDate: string;
  invoiceNumber: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  opportunity?: {
    title?: string;
    lead?: { firstName?: string; lastName?: string; company?: string };
    contact?: { firstName?: string; lastName?: string; company?: string };
  };
}

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number | string;
  method: PaymentMethod;
  referenceNumber: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  status: PaymentStatus;
  receivedBy: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ============================================================================
// S4 DOCUMENTATION TRACKER DOMAIN
// ============================================================================

export type DocPresetCategory = 'GOVERNMENT' | 'FINANCIAL' | 'LEGAL' | 'OPERATIONAL' | 'COMPLIANCE' | 'CUSTOM';
export type DocDocumentStatus =
  | 'REQUESTED' | 'PENDING_COLLECTION' | 'RECEIVED' | 'UNDER_VERIFICATION'
  | 'APPROVED' | 'REJECTED' | 'RE_REQUESTED' | 'EXPIRED'
  | 'NOT_APPLICABLE' | 'WAIVED' | 'MANAGER_APPROVED';
export type DocCaseStatus = 'ACTIVE' | 'DOCUMENTATION_READY' | 'TRANSFERRED_TO_PROCESS' | 'CLOSED' | 'CANCELLED';
export type DocNoteType   = 'INTERNAL' | 'CUSTOMER';
export type DocStorageType =
  | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'SHAREPOINT' | 'NAS_PATH'
  | 'LOCAL_FOLDER' | 'PHYSICAL_CABINET' | 'REFERENCE_NUMBER' | 'EMAIL'
  | 'EXTERNAL_PORTAL' | 'STORED_OFFLINE' | 'OTHER';
export type DocEventType =
  | 'CASE_CREATED' | 'PRESET_APPLIED' | 'DOCUMENT_STATUS_CHANGED' | 'DOCUMENT_RECEIVED'
  | 'DOCUMENT_VERIFIED' | 'DOCUMENT_REJECTED' | 'DOCUMENT_WAIVED' | 'DOCUMENT_APPROVED'
  | 'REMINDER_SENT' | 'NOTE_ADDED' | 'STORAGE_REF_ADDED' | 'MANAGER_OVERRIDE'
  | 'TRANSFERRED_TO_PROCESS' | 'CASE_CLOSED' | 'CASE_CANCELLED' | 'EXPIRY_WARNING';

export interface DocPresetItem {
  id: string;
  presetId: string;
  tenantId: string;
  name: string;
  description: string | null;
  isMandatory: boolean;
  isBlocking: boolean;
  displayOrder: number;
  verificationRequired: boolean;
  expiryTrackingEnabled: boolean;
  expiryDays: number | null;
  metadataFields: unknown[];
  notes: string | null;
  conditionRule: unknown | null;
  createdAt: string;
}

export interface DocPreset {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: DocPresetCategory;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  version: number;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: DocPresetItem[];
  _count?: { cases: number };
}

export interface DocStorageRef {
  id: string;
  tenantId: string;
  documentId: string;
  storageType: DocStorageType;
  reference: string;
  label: string | null;
  addedBy: string;
  createdAt: string;
}

export interface DocCaseDocument {
  id: string;
  tenantId: string;
  caseId: string;
  presetItemId: string | null;
  name: string;
  description: string | null;
  isMandatory: boolean;
  isBlocking: boolean;
  displayOrder: number;
  verificationRequired: boolean;
  expiryTrackingEnabled: boolean;
  expiryDate: string | null;
  status: DocDocumentStatus;
  receivedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verificationRemarks: string | null;
  rejectionReason: string | null;
  isWaived: boolean;
  waivedBy: string | null;
  waivedReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  storageRefs: DocStorageRef[];
}

export interface DocCaseEvent {
  id: string;
  tenantId: string;
  caseId: string;
  documentId: string | null;
  eventType: DocEventType;
  actorUserId: string | null;
  actorDepartment: string | null;
  fromStatus: DocDocumentStatus | null;
  toStatus: DocDocumentStatus | null;
  remarks: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface DocCaseNote {
  id: string;
  tenantId: string;
  caseId: string;
  noteType: DocNoteType;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface DocManagerOverride {
  id: string;
  tenantId: string;
  caseId: string;
  overriddenBy: string;
  reason: string;
  allowedAt: string;
  expiresAt: string | null;
}

export interface DocCase {
  id: string;
  tenantId: string;
  leadId: string;
  presetId: string | null;
  presetVersion: number | null;
  assignedTo: string | null;
  status: DocCaseStatus;
  priority: number;
  totalDocs: number;
  receivedDocs: number;
  verifiedDocs: number;
  approvedDocs: number;
  rejectedDocs: number;
  mandatoryDocs: number;
  mandatoryApproved: number;
  completionPercent: number;
  isReady: boolean;
  dueDate: string | null;
  transferredAt: string | null;
  transferredBy: string | null;
  closedAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    status?: string;
  };
  preset: { id: string; name: string; category: DocPresetCategory; color: string | null; icon: string | null } | null;
  documents?: DocCaseDocument[];
  events?: DocCaseEvent[];
  caseNotes?: DocCaseNote[];
  overrides?: DocManagerOverride[];
  _count?: { documents: number };
}

export interface DocDashboardKPIs {
  totalCases: number;
  activeCases: number;
  readyCases: number;
  transferredCases: number;
  pendingVerification: number;
  overdueDocCount: number;
  rejectedDocs: number;
  todayActivity: number;
}
