// S2 CRM Domain Types

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Disqualified' | 'Converted';
export type LeadSource = 'Website' | 'Referral' | 'Email' | 'Event' | 'Cold Call';

export interface Lead {
  id: string;
  tenantId: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  expectedValue: number; // in INR
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type OpportunityStage = 'Initial Contact' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
export type OpportunityHealth = 'On-track' | 'At-risk' | 'Lost';
export type CloseOutcome = 'Won' | 'Lost';

export interface Opportunity {
  id: string;
  tenantId: string;
  name: string;
  companyId: string;
  companyName?: string;
  stage: OpportunityStage;
  value: number; // in INR
  expectedCloseValue: number; // in INR
  closeDate: string; // ISO date
  actualCloseDate: string | null;
  ownerId: string;
  ownerName?: string;
  health: OpportunityHealth;
  description: string;
  linkedLeadId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Task' | 'Note';
export type ActivityStatus = 'Completed' | 'Pending' | 'Cancelled';
export type ActivityOutcome = 'Not Set' | 'Positive' | 'Neutral' | 'Negative' | 'Interested' | 'Not Interested' | 'Callback' | 'No Answer';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Activity {
  id: string;
  tenantId: string;
  type: ActivityType;
  description: string;
  linkedLeadId: string | null;
  linkedOpportunityId: string | null;
  linkedLeadName?: string;
  linkedOpportunityName?: string;
  date: string; // ISO datetime
  dueDate: string | null; // for tasks
  ownerId: string;
  ownerName?: string;
  status: ActivityStatus;
  outcome: ActivityOutcome;
  notes: string;
  priority: TaskPriority | null; // for tasks
  duration: number | null; // for calls, in minutes
  subject: string | null; // for emails
  emailAddress: string | null; // for emails
  attendees: string[] | null; // for meetings
  location: string | null; // for meetings
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Contact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  companyName?: string;
  roleTitle: string;
  linkedLeadId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PipelineAnalytics {
  totalPipelineValue: number; // ₹
  opportunityCount: number;
  averageDealSize: number; // ₹
  winRate: number; // %
  forecastValue: number; // ₹
  stageVelocity: Record<OpportunityStage, number>; // days
  winRateTrend: Array<{ month: string; winRate: number }>;
  funnelData: Array<{ stage: OpportunityStage; count: number; value: number; conversionPercent: number }>;
}

export interface FilterState {
  status?: LeadStatus | LeadStatus[];
  source?: LeadSource | LeadSource[];
  stage?: OpportunityStage | OpportunityStage[];
  owner?: string;
  health?: OpportunityHealth;
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
// S3 FINANCE DOMAIN
// ============================================================================

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: string;
  tenantId: string;
  opportunityId: string;
  amount: number | string;
  status: InvoiceStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH';

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number | string;
  method: PaymentMethod;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
