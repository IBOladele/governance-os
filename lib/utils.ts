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
    'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Andorra': '🇦🇩',
    'Angola': '🇦🇴', 'Antigua and Barbuda': '🇦🇬', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲',
    'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿', 'Bahamas': '🇧🇸',
    'Bahrain': '🇧🇭', 'Bangladesh': '🇧🇩', 'Barbados': '🇧🇧', 'Belarus': '🇧🇾',
    'Belgium': '🇧🇪', 'Belize': '🇧🇿', 'Benin': '🇧🇯', 'Bhutan': '🇧🇹',
    'Bolivia': '🇧🇴', 'Bosnia and Herzegovina': '🇧🇦', 'Botswana': '🇧🇼', 'Brazil': '🇧🇷',
    'Brunei': '🇧🇳', 'Bulgaria': '🇧🇬', 'Burkina Faso': '🇧🇫', 'Burundi': '🇧🇮',
    'Cabo Verde': '🇨🇻', 'Cambodia': '🇰🇭', 'Cameroon': '🇨🇲', 'Canada': '🇨🇦',
    'Central African Republic': '🇨🇫', 'Chad': '🇹🇩', 'Chile': '🇨🇱', 'China': '🇨🇳',
    'Colombia': '🇨🇴', 'Comoros': '🇰🇲', 'Congo (Brazzaville)': '🇨🇬', 'Congo (DRC)': '🇨🇩',
    'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷', 'Cuba': '🇨🇺', 'Cyprus': '🇨🇾',
    'Czech Republic': '🇨🇿', 'Denmark': '🇩🇰', 'Djibouti': '🇩🇯', 'Dominica': '🇩🇲',
    'Dominican Republic': '🇩🇴', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'El Salvador': '🇸🇻',
    'Equatorial Guinea': '🇬🇶', 'Eritrea': '🇪🇷', 'Estonia': '🇪🇪', 'Eswatini': '🇸🇿',
    'Ethiopia': '🇪🇹', 'Fiji': '🇫🇯', 'Finland': '🇫🇮', 'France': '🇫🇷',
    'Gabon': '🇬🇦', 'Gambia': '🇬🇲', 'Georgia': '🇬🇪', 'Germany': '🇩🇪',
    'Ghana': '🇬🇭', 'Greece': '🇬🇷', 'Grenada': '🇬🇩', 'Guatemala': '🇬🇹',
    'Guinea': '🇬🇳', 'Guinea-Bissau': '🇬🇼', 'Guyana': '🇬🇾', 'Haiti': '🇭🇹',
    'Honduras': '🇭🇳', 'Hong Kong': '🇭🇰', 'Hungary': '🇭🇺', 'Iceland': '🇮🇸',
    'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
    'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'Italy': '🇮🇹', 'Jamaica': '🇯🇲',
    'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Kazakhstan': '🇰🇿', 'Kenya': '🇰🇪',
    'Kiribati': '🇰🇮', 'Kosovo': '🇽🇰', 'Kuwait': '🇰🇼', 'Kyrgyzstan': '🇰🇬',
    'Laos': '🇱🇦', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧', 'Lesotho': '🇱🇸',
    'Liberia': '🇱🇷', 'Libya': '🇱🇾', 'Liechtenstein': '🇱🇮', 'Lithuania': '🇱🇹',
    'Luxembourg': '🇱🇺', 'Madagascar': '🇲🇬', 'Malawi': '🇲🇼', 'Malaysia': '🇲🇾',
    'Maldives': '🇲🇻', 'Mali': '🇲🇱', 'Malta': '🇲🇹', 'Marshall Islands': '🇲🇭',
    'Mauritania': '🇲🇷', 'Mauritius': '🇲🇺', 'Mexico': '🇲🇽', 'Micronesia': '🇫🇲',
    'Moldova': '🇲🇩', 'Monaco': '🇲🇨', 'Mongolia': '🇲🇳', 'Montenegro': '🇲🇪',
    'Morocco': '🇲🇦', 'Mozambique': '🇲🇿', 'Myanmar': '🇲🇲', 'Namibia': '🇳🇦',
    'Nauru': '🇳🇷', 'Nepal': '🇳🇵', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿',
    'Nicaragua': '🇳🇮', 'Niger': '🇳🇪', 'Nigeria': '🇳🇬', 'North Korea': '🇰🇵',
    'North Macedonia': '🇲🇰', 'Norway': '🇳🇴', 'Oman': '🇴🇲', 'Pakistan': '🇵🇰',
    'Palau': '🇵🇼', 'Palestine': '🇵🇸', 'Panama': '🇵🇦', 'Papua New Guinea': '🇵🇬',
    'Paraguay': '🇵🇾', 'Peru': '🇵🇪', 'Philippines': '🇵🇭', 'Poland': '🇵🇱',
    'Portugal': '🇵🇹', 'Qatar': '🇶🇦', 'Romania': '🇷🇴', 'Russia': '🇷🇺',
    'Rwanda': '🇷🇼', 'Saint Kitts and Nevis': '🇰🇳', 'Saint Lucia': '🇱🇨',
    'Saint Vincent and the Grenadines': '🇻🇨', 'Samoa': '🇼🇸', 'San Marino': '🇸🇲',
    'Sao Tome and Principe': '🇸🇹', 'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳',
    'Serbia': '🇷🇸', 'Seychelles': '🇸🇨', 'Sierra Leone': '🇸🇱', 'Singapore': '🇸🇬',
    'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Solomon Islands': '🇸🇧', 'Somalia': '🇸🇴',
    'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'South Sudan': '🇸🇸', 'Spain': '🇪🇸',
    'Sri Lanka': '🇱🇰', 'Sudan': '🇸🇩', 'Suriname': '🇸🇷', 'Sweden': '🇸🇪',
    'Switzerland': '🇨🇭', 'Syria': '🇸🇾', 'Taiwan': '🇹🇼', 'Tajikistan': '🇹🇯',
    'Tanzania': '🇹🇿', 'Thailand': '🇹🇭', 'Timor-Leste': '🇹🇱', 'Togo': '🇹🇬',
    'Tonga': '🇹🇴', 'Trinidad and Tobago': '🇹🇹', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
    'Turkmenistan': '🇹🇲', 'Tuvalu': '🇹🇻', 'UAE': '🇦🇪', 'Uganda': '🇺🇬',
    'Ukraine': '🇺🇦', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸', 'Uruguay': '🇺🇾',
    'Uzbekistan': '🇺🇿', 'Vanuatu': '🇻🇺', 'Vatican City': '🇻🇦', 'Venezuela': '🇻🇪',
    'Vietnam': '🇻🇳', 'Yemen': '🇾🇪', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼',
  };
  return flags[country] ?? '🏳️';
}
