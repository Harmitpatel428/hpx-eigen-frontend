import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { get } from '../auth/services/api';

export type DepartmentType = 'SALES' | 'PROCESS' | 'DOCUMENTATION';

export interface Department {
  id: string;
  type: DepartmentType;
  name: string;
}

interface DepartmentContextType {
  activeDepartment: Department | null;
  departments: Department[];
  isLoading: boolean;
  error: Error | null;
  switchDepartment: (deptId: string) => void;
  isReady: boolean;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);
const STORAGE_KEY = 'hpx:active-department';

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = (window as any).tokenStorage?.getAccessToken?.() 
    || localStorage.getItem('hpx:access-token');
  return !!token;
}

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const hasAuth = isAuthenticated();

  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const {
    data: departments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'me', 'departments'],
    queryFn: async () => {
      return get<Department[]>('/api/v1/auth/me/departments');
    },
    enabled: hasAuth,
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 401) return false;
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  const activeDepartment = departments?.find(d => d.id === activeDepartmentId) 
    ?? departments?.[0] 
    ?? null;

  const switchDepartment = useCallback((deptId: string) => {
    if (deptId === activeDepartmentId) return;
    
    setActiveDepartmentId(deptId);
    localStorage.setItem(STORAGE_KEY, deptId);
    
    const invalidateKeys = [
      'dashboard', 'leads', 'contacts', 'opportunities',
      'activities', 'invoices', 'payments', 'process-tasks', 'documents'
    ];
    invalidateKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
    
    navigate('/overview', { replace: true });
  }, [activeDepartmentId, queryClient, navigate]);

  useEffect(() => {
    if (departments?.length && !activeDepartmentId) {
      setActiveDepartmentId(departments[0].id);
      localStorage.setItem(STORAGE_KEY, departments[0].id);
    }
  }, [departments, activeDepartmentId]);

  return (
    <DepartmentContext.Provider
      value={{
        activeDepartment,
        departments: departments ?? [],
        isLoading,
        error: error as Error | null,
        switchDepartment,
        isReady: !isLoading && (!!departments || !hasAuth),
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export const useDepartment = () => {
  const ctx = useContext(DepartmentContext);
  if (!ctx) throw new Error('useDepartment must be used within DepartmentProvider');
  return ctx;
};
