import React from 'react';
import { useDepartment } from '../../context/DepartmentContext';
import { Building2, Factory, FileText } from 'lucide-react';

/**
 * Maps department names to icons, labels, and colors.
 * This works with the current schema (no Department.type enum).
 */
function getDepartmentConfig(name: string) {
  const normalized = name.toLowerCase().trim();
  
  if (normalized.includes('sales')) {
    return { icon: Building2, label: 'Sales', color: 'text-emerald-600', activeBg: 'bg-white shadow-sm' };
  }
  if (normalized.includes('process')) {
    return { icon: Factory, label: 'Process', color: 'text-blue-600', activeBg: 'bg-white shadow-sm' };
  }
  if (normalized.includes('documentation') || normalized.includes('doc')) {
    return { icon: FileText, label: 'Docs', color: 'text-amber-600', activeBg: 'bg-white shadow-sm' };
  }
  
  // Default fallback
  return { icon: Building2, label: name, color: 'text-gray-600', activeBg: 'bg-white shadow-sm' };
}

export const DepartmentSwitcher: React.FC = () => {
  const { activeDepartment, departments, switchDepartment, isLoading } = useDepartment();

  if (isLoading) {
    return <div className="h-10 w-52 animate-pulse rounded-full bg-gray-100" />;
  }

  if (departments.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-gray-100/80 p-1">
      {departments.map((dept) => {
        const config = getDepartmentConfig(dept.name);
        const Icon = config.icon;
        const isActive = activeDepartment?.id === dept.id;

        return (
          <button
            key={dept.id}
            onClick={() => switchDepartment(dept.id)}
            className={`
              relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium
              transition-all duration-200 ease-out
              ${isActive 
                ? `${config.activeBg} ${config.color}` 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }
            `}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">{config.label}</span>
            {isActive && (
              <span className={`absolute -bottom-0.5 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
            )}
          </button>
        );
      })}
    </div>
  );
};
