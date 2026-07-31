import React from 'react';
import { useDepartments } from '../../context/DepartmentContext';
import { useNavigate } from 'react-router-dom';

export function DepartmentSwitcher() {
  const { departments, activeDepartmentId, setDepartmentFromSlug, getSlugFromDepartmentId } = useDepartments();
  const navigate = useNavigate();

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeptId = e.target.value;
    const slug = getSlugFromDepartmentId(newDeptId);
    if (slug) {
      setDepartmentFromSlug(slug);
      // Navigate to the default route of the selected department
      if (slug === 'sales') navigate('/sales/leads');
      else if (slug === 'process') navigate('/process/projects');
      else if (slug === 'docs') navigate('/docs/templates');
    }
  };

  return (
    <div className="mb-6">
      <label htmlFor="department-switcher" className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
        Department
      </label>
      <select
        id="department-switcher"
        value={activeDepartmentId || ''}
        onChange={handleDepartmentChange}
        className="w-full bg-[var(--bg-app)] border border-[var(--border-medium)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
      >
        <option value="" disabled>Select Department</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  );
}
