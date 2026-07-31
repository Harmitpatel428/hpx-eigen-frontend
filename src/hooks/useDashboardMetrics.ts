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
    queryFn: async () => {
      if (!activeDepartment) throw new Error('No active department');
      const response = await get<DashboardResponse>('/api/v1/dashboard/metrics');
      return response.data as T;
    },
    enabled: isReady && !!activeDepartment,
    staleTime: 1000 * 60 * 2, // 2 minutes — dashboard data is relatively static
    gcTime: 1000 * 60 * 10,
  });
}
