// Display name for a user: "First Last" > email > "Unknown"
export function displayName(person: { firstName?: string | null; lastName?: string | null; email?: string | null }): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || person.email || 'Unknown';
}

// Currency formatting (INR) — UI display (no decimal)
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Currency formatting (INR) — PDF / audit display (2 decimal places)
export function formatINRFull(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMins) < 1) return 'just now';
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');
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

// Generic currency formatting (configurable currency, up to 1 decimal)
export function formatCurrency(value: number | string, currency: string = 'INR'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(num);
}

// Number formatting (en-IN locale)
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

