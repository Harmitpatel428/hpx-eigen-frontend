export interface User {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  userRoles?: { role: { id: string; name: string } }[];
}

export interface AuthTokens {
  accessToken: string;
  sessionId: string;
  expiresAt: string;
  userId: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  ownerId: string | null;
  createdAt: string;
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
  stage: string;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  createdAt: string;
  lead?: { id: string; firstName: string; lastName: string; company: string | null };
  contact?: { id: string; firstName: string; lastName: string } | null;
  daysInStage?: number;
}

export interface Activity {
  id: string;
  opportunityId: string;
  userId: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
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

export interface Session {
  id: string;
  status: string;
  createdAt: string;
  lastActivityAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED' | 'CONVERTED';
export type OpportunityStage = 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
