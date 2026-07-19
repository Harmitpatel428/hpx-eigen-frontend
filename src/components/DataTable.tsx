import React, { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: T) => ReactNode;
}

export function DataTable<T>({
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
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#16213e]">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                style={{ width: col.width }}
                onClick={() => col.sortable && onSort?.(String(col.key), sortKey === String(col.key) && sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortKey === String(col.key) && (
                    sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            ))}
            {rowActions && <th className="px-6 py-3 text-right text-sm font-medium text-gray-300">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={String(row[rowKey])}
              className={`border-b border-[#16213e] transition-colors ${
                idx % 2 === 0 ? 'bg-[#0a0e27]' : 'bg-[#1a1a2e]'
              } hover:bg-[#16213e] cursor-pointer`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 text-sm text-white">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
              {rowActions && (
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
