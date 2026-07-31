import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDepartments } from '../../context/DepartmentContext';

export function DepartmentRouter() {
  const { primaryDepartmentSlug, loading } = useDepartments();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (primaryDepartmentSlug === 'sales') {
      navigate('/sales/leads', { replace: true });
    } else if (primaryDepartmentSlug === 'process') {
      navigate('/process/projects', { replace: true });
    } else if (primaryDepartmentSlug === 'docs') {
      navigate('/docs/templates', { replace: true });
    } else if (primaryDepartmentSlug) {
      // Fallback if they have a primary dept but we don't have a specific slug path yet
      navigate(`/${primaryDepartmentSlug}`, { replace: true });
    }
  }, [loading, primaryDepartmentSlug, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[var(--bg-app)] text-[var(--text-tertiary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]" />
      </div>
    );
  }

  if (!primaryDepartmentSlug) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[var(--bg-app)]">
        <h1 className="type-title mb-4">Access Denied</h1>
        <p className="type-body text-center max-w-md">
          You do not have access to any departments. Please contact your Organization Admin.
        </p>
      </div>
    );
  }

  return null;
}
