import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface Department {
  id: string;
  name: string;
  isPrimary: boolean;
}

interface DepartmentContextValue {
  departments: Department[];
  activeDepartmentId: string | null;
  loading: boolean;
  setDepartmentFromSlug: (slug: string) => void;
  getSlugFromDepartmentId: (id: string) => string | null;
  primaryDepartmentSlug: string | null;
}

const DepartmentContext = createContext<DepartmentContextValue | undefined>(undefined);

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user's assigned departments
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/api/auth/me/departments');
        const departments = res.data?.data || res.data || [];
        if (!Array.isArray(departments)) {
          console.error('Expected departments to be an array, got:', departments);
          return;
        }

        setDepartments(departments);
        
        // If there's no active ID but we have departments, default to primary
        if (!activeDepartmentId && departments.length > 0) {
          const primary = departments.find((d: Department) => d.isPrimary) || departments[0];
          setActiveDepartmentId(primary.id);
          // Set in localStorage for the api interceptor to pick it up synchronously
          localStorage.setItem('activeDepartmentId', primary.id);
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const setDepartmentFromSlug = (slug: string) => {
    // slug is typically 'sales', 'process', 'docs'
    // For this simple mock, we match by name prefix
    const match = departments.find(d => d.name.toLowerCase().startsWith(slug.toLowerCase()));
    if (match) {
      setActiveDepartmentId(match.id);
      localStorage.setItem('activeDepartmentId', match.id);
    }
  };

  const getSlugFromDepartmentId = (id: string) => {
    const match = departments.find(d => d.id === id);
    if (!match) return null;
    if (match.name.toLowerCase().includes('sales')) return 'sales';
    if (match.name.toLowerCase().includes('process')) return 'process';
    if (match.name.toLowerCase().includes('docs') || match.name.toLowerCase().includes('documentation')) return 'docs';
    return match.name.toLowerCase();
  };

  const primaryDepartmentSlug = departments.length > 0 
    ? getSlugFromDepartmentId(departments.find(d => d.isPrimary)?.id || departments[0].id) 
    : null;

  return (
    <DepartmentContext.Provider value={{
      departments,
      activeDepartmentId,
      loading,
      setDepartmentFromSlug,
      getSlugFromDepartmentId,
      primaryDepartmentSlug
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartments() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartments must be used within a DepartmentProvider');
  }
  return context;
}
