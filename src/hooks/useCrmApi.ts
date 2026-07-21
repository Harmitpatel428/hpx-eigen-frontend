import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead, Opportunity, Activity, Contact, FilterState, PaginationState, Invoice, Payment } from '../types/crm';
import { api } from '../services/api';

// ============================================================================
// LEADS
// ============================================================================

export function useLeads(tenantId: string, filters?: FilterState, pagination?: PaginationState) {
  return useQuery({
    queryKey: ['leads', tenantId, filters, pagination],
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const res = await api.post(`/api/v1/leads`, lead);
      return res.data;
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
      const res = await api.patch(`/api/v1/leads/${id}`, lead);
      return res.data;
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
      const res = await api.delete(`/api/v1/leads/${id}`);
      return res.data;
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
      const res = await api.post(`/api/v1/leads/${payload.leadId}/convert`, payload);
      return res.data;
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

export const useOpportunities = (tenantId?: string, filters?: any, pagination?: any) => {
  return useQuery({
    queryKey: ['opportunities', tenantId, filters, pagination],
    queryFn: async () => {
      const res = await api.get('/api/v1/opportunities');
      console.log("RAW API RESPONSE IN HOOK:", res.data);
      // Handle both { data: [...] } and bare [...] envelopes
      return res.data?.data || res.data || [];
    }
  });
};

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opp: Partial<Opportunity>) => {
      const res = await api.post(`/api/v1/opportunities`, opp);
      return res.data;
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
      const res = await api.patch(`/api/v1/opportunities/${id}`, opp);
      return res.data;
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
      const res = await api.delete(`/api/v1/opportunities/${id}`);
      return res.data;
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
      const res = await api.patch(`/api/v1/opportunities/${id}`, { stage });
      return res.data;
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
      const res = await api.post(`/api/v1/opportunities/${payload.id}/close`, payload);
      return res.data;
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activity: Partial<Activity>) => {
      const res = await api.post(`/api/v1/activities`, activity);
      return res.data;
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
      const res = await api.patch(`/api/v1/activities/${id}`, activity);
      return res.data;
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
      const res = await api.delete(`/api/v1/activities/${id}`);
      return res.data;
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
      const res = await api.post(`/api/v1/activities/${id}/complete`);
      return res.data;
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<Contact>) => {
      const res = await api.post(`/api/v1/contacts`, contact);
      return res.data;
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
      const res = await api.patch(`/api/v1/contacts/${id}`, contact);
      return res.data;
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
      const res = await api.delete(`/api/v1/contacts/${id}`);
      return res.data;
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
      const res = await api.post(`/api/v1/contacts/${contactId}/link-lead`, { leadId });
      return res.data;
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
  return useQuery({
    queryKey: ['invoices', tenantId, filters],
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, ...invoice }: Partial<Invoice> & { tenantId: string }) => {
      const res = await api.post(`/api/v1/invoices`, invoice);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// ============================================================================
// PAYMENTS
// ============================================================================

export function usePayments(tenantId: string, filters?: { method?: string; invoiceId?: string }) {
  return useQuery({
    queryKey: ['payments', tenantId, filters],
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, ...payment }: Partial<Payment> & { tenantId: string }) => {
      const res = await api.post(`/api/v1/payments`, payment);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] }); // Payment updates invoice status
    },
  });
}
