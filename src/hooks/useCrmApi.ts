import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead, Opportunity, Activity, Contact, FilterState, PaginationState, Invoice, Payment } from '../types';
import { api } from '../services/api';
import { useAuth } from '../auth/public';

// ============================================================================
// LEADS
// ============================================================================

export function useLeads(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['leads', user?.id, tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.status && { status: Array.isArray(filters.status) ? filters.status.join(',') : filters.status }),
        ...(filters?.source && { source: Array.isArray(filters.source) ? filters.source.join(',') : filters.source }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
        ...(filters?.valueRange && { minValue: String(filters.valueRange[0]), maxValue: String(filters.valueRange[1]) }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await api.get(`/api/v1/leads?${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const res = await api.post(`/api/v1/leads`, lead);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', user?.id] });
    },
  });
}

export function useUpdateLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: string }) => {
      const res = await api.patch(`/api/v1/leads/${id}`, lead);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', user?.id] });
    },
  });
}

export function useDeleteLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/leads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', user?.id] });
    },
  });
}

export function useConvertLeadToOpportunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { leadId: string; opportunityName: string; stage: string; value: number; closeDate: string }) => {
      const res = await api.post(`/api/v1/leads/${payload.leadId}/convert`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', user?.id] });
    },
  });
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

export const useOpportunities = (tenantId?: string, filters?: any, pagination?: any) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['opportunities', user?.id, tenantId, filters, pagination],
    queryFn: async () => {
      const res = await api.get('/api/v1/opportunities');
      // Handle both { data: [...] } and bare [...] envelopes
      return res.data?.data || res.data || [];
    }
  });
};

export function useCreateOpportunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opp: Partial<Opportunity>) => {
      const res = await api.post(`/api/v1/opportunities`, opp);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', user?.id] });
    },
  });
}

export function useUpdateOpportunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...opp }: Partial<Opportunity> & { id: string }) => {
      const res = await api.patch(`/api/v1/opportunities/${id}`, opp);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', user?.id] });
    },
  });
}

export function useDeleteOpportunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/opportunities/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', user?.id] });
    },
  });
}

export function useUpdateOpportunityStageMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await api.patch(`/api/v1/opportunities/${id}`, { stage });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', user?.id] });
    },
  });
}

export function useCloseOpportunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; outcome: 'Won' | 'Lost'; actualCloseDate: string; actualCloseValue?: number; reason?: string; notes?: string }) => {
      const res = await api.post(`/api/v1/opportunities/${payload.id}/close`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', user?.id] });
    },
  });
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export function useActivities(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activities', user?.id, tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.type && { type: Array.isArray(filters.type) ? filters.type.join(',') : filters.type }),
        ...(filters?.owner && { owner: filters.owner }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await api.get(`/api/v1/activities?${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activity: Partial<Activity>) => {
      const res = await api.post(`/api/v1/activities`, activity);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', user?.id] });
    },
  });
}

export function useUpdateActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...activity }: Partial<Activity> & { id: string }) => {
      const res = await api.patch(`/api/v1/activities/${id}`, activity);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', user?.id] });
    },
  });
}

export function useDeleteActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/activities/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', user?.id] });
    },
  });
}

export function useMarkActivityComplete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/activities/${id}/complete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', user?.id] });
    },
  });
}

// ============================================================================
// CONTACTS
// ============================================================================

export function useContacts(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['contacts', user?.id, tenantId, filters, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(pagination && { page: String(pagination.page), pageSize: String(pagination.pageSize) }),
        ...(filters?.searchQuery && { search: filters.searchQuery }),
      });
      const res = await api.get(`/api/v1/contacts?${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<Contact>) => {
      const res = await api.post(`/api/v1/contacts`, contact);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
    },
  });
}

export function useUpdateContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...contact }: Partial<Contact> & { id: string }) => {
      const res = await api.patch(`/api/v1/contacts/${id}`, contact);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
    },
  });
}

export function useDeleteContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/contacts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
    },
  });
}

export function useLinkContactToLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, leadId }: { contactId: string; leadId: string }) => {
      const res = await api.post(`/api/v1/contacts/${contactId}/link-lead`, { leadId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
    },
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function usePipelineAnalytics(tenantId: string, filters?: { owner?: string; dateRange?: [string, string] }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['analytics', 'pipeline', user?.id, tenantId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters?.owner && { owner: filters.owner }),
        ...(filters?.dateRange && { startDate: filters.dateRange[0], endDate: filters.dateRange[1] }),
      });
      const res = await api.get(`/api/v1/analytics/pipeline?${params}`);
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// INVOICES
// ============================================================================

export function useInvoices(tenantId: string, filters?: { status?: string; opportunityId?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['invoices', user?.id, tenantId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters?.status && { status: filters.status }),
        ...(filters?.opportunityId && { opportunityId: filters.opportunityId }),
      });
      const res = await api.get(`/api/v1/invoices?${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, ...invoice }: Partial<Invoice> & { tenantId: string }) => {
      const res = await api.post(`/api/v1/invoices`, invoice);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] });
    },
  });
}

// ============================================================================
// PAYMENTS
// ============================================================================

export function usePayments(tenantId: string, filters?: { method?: string; invoiceId?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payments', user?.id, tenantId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters?.method && { method: filters.method }),
        ...(filters?.invoiceId && { invoiceId: filters.invoiceId }),
      });
      const res = await api.get(`/api/v1/payments?${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, ...payment }: Partial<Payment> & { tenantId: string }) => {
      const res = await api.post(`/api/v1/payments`, payment);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] }); // Payment updates invoice status
    },
  });
}
