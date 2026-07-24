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
export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED' | 'CONVERTED';
export type OpportunityStage = 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';

// ============================================================================
// CRM DOMAIN — MODELS
// ============================================================================

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
  expectedValue: string | null; // Decimal comes back as string from JSON
  ownerId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
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
