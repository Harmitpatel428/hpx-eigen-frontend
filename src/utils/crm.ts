import { ZodSchema } from 'zod';

// Currency formatting (INR)
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Phone validation (10 digits)
export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
}

// Email validation
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Date formatting
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN');
}

// Date + time formatting
export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-IN');
}

// Relative time (e.g., "2 hours ago")
export function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoDate);
}

// Days between two dates
export function daysBetween(isoDate1: string, isoDate2: string): number {
  const date1 = new Date(isoDate1);
  const date2 = new Date(isoDate2);
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Color by status
export function statusColor(status: string): string {
  const colorMap: Record<string, string> = {
    New: 'bg-blue-500',
    Contacted: 'bg-yellow-500',
    Qualified: 'bg-green-500',
    Disqualified: 'bg-red-500',
    Converted: 'bg-purple-500',
    'PROSPECTING': 'bg-blue-500',
    'QUALIFICATION': 'bg-indigo-500',
    'PROPOSAL': 'bg-purple-500',
    'NEGOTIATION': 'bg-orange-500',
    'CLOSED_WON': 'bg-green-500',
    'CLOSED_LOST': 'bg-red-500',
    Completed: 'bg-green-500',
    Pending: 'bg-yellow-500',
    Cancelled: 'bg-gray-500',
  };
  return colorMap[status] || 'bg-gray-500';
}

// Color by health
export function healthColor(health: string): string {
  const colorMap: Record<string, string> = {
    'On-track': 'bg-green-500',
    'At-risk': 'bg-yellow-500',
    Lost: 'bg-red-500',
  };
  return colorMap[health] || 'bg-gray-500';
}

// Activity type icon color
export function activityTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    Call: 'text-blue-500',
    Email: 'text-orange-500',
    Meeting: 'text-green-500',
    Task: 'text-purple-500',
    Note: 'text-gray-500',
  };
  return colorMap[type] || 'text-gray-500';
}

// Activity type bg color
export function activityTypeBg(type: string): string {
  const colorMap: Record<string, string> = {
    Call: 'bg-blue-500/20',
    Email: 'bg-orange-500/20',
    Meeting: 'bg-green-500/20',
    Task: 'bg-purple-500/20',
    Note: 'bg-gray-500/20',
  };
  return colorMap[type] || 'bg-gray-500/20';
}

// Zod validation error formatter
export function formatValidationError(error: any): Record<string, string> {
  if (!error.errors) return {};
  const errors: Record<string, string> = {};
  error.errors.forEach((err: any) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}

// Debounce
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// CSV export helper
export function downloadCSV(filename: string, data: any[]): void {
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map((row) => Object.values(row).map((v) => JSON.stringify(v)).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
