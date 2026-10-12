import { api } from './api';

export type LeadHeaderPreference = 'name' | 'company';

export interface CrmSettings {
  leadHeaderPreference: LeadHeaderPreference;
  allowImpersonation: boolean;
  caseOperationsEngineEnabled: boolean;
  pendingReminderTemplate: string | null;
  pendingReminderOrgName: string | null;
}

export const crmSettingsService = {
  async get(): Promise<CrmSettings> {
    const { data } = await api.get<{
      leadHeaderPreference: LeadHeaderPreference | null; allowImpersonation: boolean;
      caseOperationsEngineEnabled?: boolean;
      pendingReminderTemplate?: string | null; pendingReminderOrgName?: string | null;
    }>('/api/v1/settings/crm');
    return {
      leadHeaderPreference: data.leadHeaderPreference ?? 'name',
      allowImpersonation: data.allowImpersonation ?? false,
      caseOperationsEngineEnabled: data.caseOperationsEngineEnabled ?? false,
      pendingReminderTemplate: data.pendingReminderTemplate ?? null,
      pendingReminderOrgName: data.pendingReminderOrgName ?? null,
    };
  },
  async setLeadHeaderPreference(preference: LeadHeaderPreference): Promise<CrmSettings> {
    const { data } = await api.post<{ success: boolean; leadHeaderPreference: LeadHeaderPreference }>(
      '/api/v1/settings/crm/lead-header',
      { preference },
    );
    return {
      leadHeaderPreference: data.leadHeaderPreference, allowImpersonation: false,
      caseOperationsEngineEnabled: false, pendingReminderTemplate: null, pendingReminderOrgName: null,
    };
  },
  async setReminderTemplate(template: string, organizationName: string): Promise<void> {
    await api.post('/api/v1/settings/crm/reminder-template', { template, organizationName });
  },
  async setCaseEngineEnabled(enabled: boolean): Promise<void> {
    await api.post('/api/v1/settings/crm/case-operations-engine', { enabled });
  },
  async setImpersonation(enabled: boolean): Promise<void> {
    await api.post('/api/v1/settings/crm/impersonation', { enabled });
  },
};
