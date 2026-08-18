import { api } from './api';

export type WaChannelType = 'INDIVIDUAL_NUMBER' | 'GROUP' | 'USERNAME' | 'BUSINESS_ACCOUNT';
export type WaChannelStatus = 'ACTIVE' | 'INVALID' | 'ARCHIVED';

export interface WaChannel {
  id: string;
  channelType: WaChannelType;
  identifier: string;
  displayName: string;
  status: WaChannelStatus;
  metadata: Record<string, unknown>;
  isPrimary: boolean;
  role: string;
  label: string | null;
  createdAt: string;
}

export const waChannelsService = {
  async list(leadId: string): Promise<WaChannel[]> {
    const { data } = await api.get<any>(`/api/v1/leads/${leadId}/wa-channels`);
    return data?.data ?? [];
  },

  async create(leadId: string, payload: {
    channelType?: WaChannelType;
    identifier: string;
    displayName: string;
    isPrimary?: boolean;
    label?: string;
  }): Promise<WaChannel[]> {
    const { data } = await api.post<any>(`/api/v1/leads/${leadId}/wa-channels`, payload);
    return data?.data ?? [];
  },

  async update(leadId: string, channelId: string, payload: {
    displayName?: string;
    label?: string | null;
    isPrimary?: boolean;
    status?: WaChannelStatus;
  }): Promise<WaChannel[]> {
    const { data } = await api.patch<any>(`/api/v1/leads/${leadId}/wa-channels/${channelId}`, payload);
    return data?.data ?? [];
  },

  async remove(leadId: string, channelId: string): Promise<WaChannel[]> {
    const { data } = await api.delete<any>(`/api/v1/leads/${leadId}/wa-channels/${channelId}`);
    return data?.data ?? [];
  },

  async makePrimary(leadId: string, channelId: string): Promise<WaChannel[]> {
    const { data } = await api.post<any>(`/api/v1/leads/${leadId}/wa-channels/${channelId}/make-primary`);
    return data?.data ?? [];
  },
};

export function buildWaUrl(channel: WaChannel): string {
  if (channel.channelType === 'GROUP') {
    return channel.identifier.startsWith('http')
      ? channel.identifier
      : `https://chat.whatsapp.com/${channel.identifier}`;
  }
  return `https://wa.me/${channel.identifier.replace(/\D/g, '')}`;
}

export const CHANNEL_TYPE_LABELS: Record<WaChannelType, string> = {
  INDIVIDUAL_NUMBER: 'Individual',
  GROUP: 'Group',
  USERNAME: 'Username',
  BUSINESS_ACCOUNT: 'Business',
};
