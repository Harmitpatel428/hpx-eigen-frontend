import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface OpportunityType {
  id: string;
  tenantId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useOpportunityTypes(tenantId: string) {
  return useQuery({
    queryKey: ['opportunity-types', tenantId],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings/opportunity-types');
      return res.data as OpportunityType[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateOpportunityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const res = await api.post('/api/v1/settings/opportunity-types', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
    },
  });
}

export function useUpdateOpportunityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, isActive }: { id: string; name?: string; isActive?: boolean }) => {
      const res = await api.patch(`/api/v1/settings/opportunity-types/${id}`, { name, isActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
    },
  });
}

export function useReorderOpportunityTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { typeIds: string[] }) => {
      const res = await api.put('/api/v1/settings/opportunity-types/reorder', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
    },
  });
}

export function useDeleteOpportunityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/settings/opportunity-types/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
    },
  });
}
