import React, { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: T) => ReactNode;
}

export const DataTable = React.memo(<T,>({
  columns,
  data,
  rowKey,
  onRowClick,
  onSort,
  sortKey,
  sortOrder = 'asc',
  isLoading,
  emptyMessage = 'No data',
  rowActions,
}: DataTableProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[var(--color-accent)]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)] text-sm">
        {emptyMessage}
      </div>
    );
  }

  const getRowKey = (row: T): string => {
    return typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey as keyof T]);
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-medium)]">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-subtle)] 
                  ${col.sortable ? 'cursor-pointer hover:text-[var(--text-primary)] transition-colors' : ''}
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                style={{ width: col.width }}
                onClick={() => col.sortable && onSort?.(String(col.key), sortKey === String(col.key) && sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                  {col.label}
                  {col.sortable && sortKey === String(col.key) && (
                    sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
            {rowActions && <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-subtle)]">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-light)] bg-[var(--bg-app)]">
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              className={`transition-colors hover:bg-[var(--bg-subtle)] ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => {
                const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                return (
                  <td key={String(col.key)} className={`px-4 py-2 text-sm text-[var(--text-primary)] ${alignClass}`}>
                    {col.render ? col.render((row as any)[col.key], row) : String((row as any)[col.key] ?? '')}
                  </td>
                );
              })}
              {rowActions && (
                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}) as <T>(props: DataTableProps<T>) => JSX.Element;
