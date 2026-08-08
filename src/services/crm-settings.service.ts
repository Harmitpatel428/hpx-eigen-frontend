import { api } from './api';

export type LeadHeaderPreference = 'name' | 'company' | 'phone';

export interface CrmSettings {
  leadHeaderPreference: LeadHeaderPreference | null;
}

export const crmSettingsService = {
  async get(): Promise<CrmSettings> {
    const { data } = await api.get<CrmSettings>('/api/v1/settings/crm');
    return data;
  },
  async setLeadHeaderPreference(preference: LeadHeaderPreference): Promise<CrmSettings> {
    const { data } = await api.post<{ success: boolean; leadHeaderPreference: LeadHeaderPreference }>(
      '/api/v1/settings/crm/lead-header',
      { preference },
    );
    return { leadHeaderPreference: data.leadHeaderPreference };
  },
};
