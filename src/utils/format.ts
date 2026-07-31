export function formatCurrency(value: number | string, currency: string = 'INR'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  
  return formatter.format(num);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}
