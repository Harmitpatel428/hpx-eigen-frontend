import { useQuery } from '@tanstack/react-query';
import { useDepartment } from '../context/DepartmentContext';
import { get } from '../auth/services/api';

export interface SalesMetrics {
  pipelineValue: number;
  activeDeals: number;
  winRate: number;
  avgVelocity: number;
  currency: string;
}

export interface ProcessMetrics {
  activeTasks: number;
  completionRate: number;
  avgProcessingTime: number;
  pendingVerifications: number;
  unit: string;
}

export interface DocumentationMetrics {
  activeDrafts: number;
  reviewTurnaround: number;
  complianceRate: number;
  pendingSignatures: number;
  unit: string;
}

type DashboardMetrics = SalesMetrics | ProcessMetrics | DocumentationMetrics;

interface DashboardResponse {
  data: DashboardMetrics;
  meta: {
    departmentId: string;
    departmentName: string;
    departmentType: string;
    generatedAt: string;
  };
}

export function useDashboardMetrics<T extends DashboardMetrics>() {
  const { activeDepartment, isReady } = useDepartment();

  return useQuery({
    queryKey: ['dashboard', 'metrics', activeDepartment?.id],
    queryFn: async (): Promise<T> => {
      if (!activeDepartment) throw new Error('No active department');
      // get() already unwraps response.data.data — returns DashboardMetrics directly
      const data = await get<T>('/api/v1/dashboard/metrics');
      if (!data) throw new Error('Empty metrics response');
      return data;
    },
    enabled: isReady && !!activeDepartment,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}
