import { api } from './api';

export type LeadHeaderPreference = 'name' | 'company';

export interface CrmSettings {
  leadHeaderPreference: LeadHeaderPreference;
  allowImpersonation: boolean;
}

export const crmSettingsService = {
  async get(): Promise<CrmSettings> {
    const { data } = await api.get<{ leadHeaderPreference: LeadHeaderPreference | null; allowImpersonation: boolean }>('/api/v1/settings/crm');
    return { leadHeaderPreference: data.leadHeaderPreference ?? 'name', allowImpersonation: data.allowImpersonation ?? false };
  },
  async setLeadHeaderPreference(preference: LeadHeaderPreference): Promise<CrmSettings> {
    const { data } = await api.post<{ success: boolean; leadHeaderPreference: LeadHeaderPreference }>(
      '/api/v1/settings/crm/lead-header',
      { preference },
    );
    return { leadHeaderPreference: data.leadHeaderPreference, allowImpersonation: false };
  },
  async setImpersonation(enabled: boolean): Promise<void> {
    await api.post('/api/v1/settings/crm/impersonation', { enabled });
  },
};
