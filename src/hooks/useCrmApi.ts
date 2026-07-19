import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead, Opportunity, Activity, Contact, FilterState, PaginationState } from '../types/crm';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// LEADS
// ============================================================================

export function useLeads(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  return useQuery({
    queryKey: ['leads', tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId,
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.status && { status: Array.isArray(filters.status) ? filters.status.join(',') : filters.status }),
        ...(filters?.source && { source: Array.isArray(filters.source) ? filters.source.join(',') : filters.source }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
        ...(filters?.valueRange && { minValue: String(filters.valueRange[0]), maxValue: String(filters.valueRange[1]) }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await fetch(`${API_BASE}/api/v1/leads?${params}`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const res = await fetch(`${API_BASE}/api/v1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error('Failed to create lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/v1/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useConvertLeadToOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { leadId: string; opportunityName: string; stage: string; value: number; closeDate: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/leads/${payload.leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to convert lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

export function useOpportunities(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  return useQuery({
    queryKey: ['opportunities', tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId,
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.stage && { stage: Array.isArray(filters.stage) ? filters.stage.join(',') : filters.stage }),
        ...(filters?.owner && { owner: filters.owner }),
        ...(filters?.health && { health: filters.health }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
        ...(filters?.valueRange && { minValue: String(filters.valueRange[0]), maxValue: String(filters.valueRange[1]) }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await fetch(`${API_BASE}/api/v1/opportunities?${params}`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opp: Partial<Opportunity>) => {
      const res = await fetch(`${API_BASE}/api/v1/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opp),
      });
      if (!res.ok) throw new Error('Failed to create opportunity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...opp }: Partial<Opportunity> & { id: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opp),
      });
      if (!res.ok) throw new Error('Failed to update opportunity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/v1/opportunities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete opportunity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useUpdateOpportunityStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useCloseOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; outcome: 'Won' | 'Lost'; actualCloseDate: string; actualCloseValue?: number; reason?: string; notes?: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/opportunities/${payload.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to close opportunity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export function useActivities(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  return useQuery({
    queryKey: ['activities', tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId,
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.type && { type: Array.isArray(filters.type) ? filters.type.join(',') : filters.type }),
        ...(filters?.owner && { owner: filters.owner }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await fetch(`${API_BASE}/api/v1/activities?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activity: Partial<Activity>) => {
      const res = await fetch(`${API_BASE}/api/v1/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
      if (!res.ok) throw new Error('Failed to create activity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...activity }: Partial<Activity> & { id: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
      if (!res.ok) throw new Error('Failed to update activity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/v1/activities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete activity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useMarkActivityComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/v1/activities/${id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark complete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// ============================================================================
// CONTACTS
// ============================================================================

export function useContacts(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  return useQuery({
    queryKey: ['contacts', tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId,
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await fetch(`${API_BASE}/api/v1/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<Contact>) => {
      const res = await fetch(`${API_BASE}/api/v1/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error('Failed to create contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...contact }: Partial<Contact> & { id: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error('Failed to update contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/v1/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useLinkContactToLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, leadId }: { contactId: string; leadId: string }) => {
      const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/link-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error('Failed to link contact to lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function usePipelineAnalytics(tenantId: string, filters?: { owner?: string; dateRange?: [string, string] }) {
  return useQuery({
    queryKey: ['analytics', 'pipeline', tenantId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId,
        ...(filters?.owner && { owner: filters.owner }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
      });
      const res = await fetch(`${API_BASE}/api/v1/analytics/pipeline?${params}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}
