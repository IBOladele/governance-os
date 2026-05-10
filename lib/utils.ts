import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export function daysUntil(date: Date | string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = typeof date === 'string' ? new Date(date) : date;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getCapitalHealthColor(current: number, minimum: number): string {
  const ratio = current / minimum;
  if (ratio < 1) return 'text-red-600';
  if (ratio < 1.2) return 'text-yellow-600';
  return 'text-green-600';
}

export function getCapitalHealthBg(current: number, minimum: number): string {
  const ratio = current / minimum;
  if (ratio < 1) return 'bg-red-50 border-red-200';
  if (ratio < 1.2) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
}

export function getLicenseDaysColor(days: number): string {
  if (days < 0) return 'text-red-600';
  if (days < 60) return 'text-orange-600';
  if (days < 180) return 'text-yellow-600';
  return 'text-green-600';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    not_applicable: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-orange-100 text-orange-800',
    pending_renewal: 'bg-yellow-100 text-yellow-800',
    dormant: 'bg-gray-100 text-gray-600',
    dissolved: 'bg-red-100 text-red-800',
    in_formation: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-600',
    unread: 'bg-red-100 text-red-800',
    read: 'bg-gray-100 text-gray-600',
    dismissed: 'bg-gray-50 text-gray-400',
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-600';
}

export function getSeverityIcon(severity: string): string {
  if (severity === 'critical') return '🔴';
  if (severity === 'warning') return '🟡';
  return '🔵';
}

export function getFlagEmoji(country: string): string {
  const flags: Record<string, string> = {
    'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Belgium': '🇧🇪',
    'Brazil': '🇧🇷', 'Canada': '🇨🇦', 'Colombia': '🇨🇴',
    'Czech Republic': '🇨🇿', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
    'France': '🇫🇷', 'Germany': '🇩🇪', 'Greece': '🇬🇷',
    'Hong Kong': '🇭🇰', 'Hungary': '🇭🇺', 'India': '🇮🇳',
    'Indonesia': '🇮🇩', 'Ireland': '🇮🇪', 'Italy': '🇮🇹',
    'Japan': '🇯🇵', 'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺',
    'Malaysia': '🇲🇾', 'Malta': '🇲🇹', 'Mexico': '🇲🇽',
    'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴',
    'Philippines': '🇵🇭', 'Poland': '🇵🇱', 'Portugal': '🇵🇹',
    'Romania': '🇷🇴', 'Singapore': '🇸🇬', 'South Africa': '🇿🇦',
    'Spain': '🇪🇸', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭',
    'Thailand': '🇹🇭', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸',
  };
  return flags[country] ?? '🏳️';
}
