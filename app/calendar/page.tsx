import Header from '@/components/layout/Header';
import { getComplianceObligations, getLicenses, getBoardMeetings, getEntities } from '@/lib/db/queries';
import { formatDate, daysUntil, getFlagEmoji, getStatusColor } from '@/lib/utils';
import { Calendar, Shield, CheckSquare, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const [compliance, licenses, meetings, entities] = await Promise.all([
    getComplianceObligations(),
    getLicenses(),
    getBoardMeetings(),
    getEntities(),
  ]);

  const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));

  // Build unified event list for the next 365 days
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() + 1);

  type CalEvent = {
    date: string;
    dateObj: Date;
    type: 'compliance' | 'license' | 'meeting';
    title: string;
    entity: string;
    entityId: string;
    country: string;
    status: string;
    days: number;
    detail: string;
  };

  const events: CalEvent[] = [];

  // Compliance
  for (const c of compliance) {
    const d = new Date(c.dueDate);
    const days = daysUntil(c.dueDate);
    if (d >= now && d <= cutoff && c.status !== 'completed' && c.status !== 'not_applicable') {
      const e = entityMap[c.entityId];
      events.push({
        date: c.dueDate.slice(0, 10),
        dateObj: d,
        type: 'compliance',
        title: c.requirementType,
        entity: e?.name ?? c.entityId,
        entityId: c.entityId,
        country: e?.country ?? '',
        status: c.status,
        days,
        detail: `${c.regulator} · Owner: ${c.owner}`,
      });
    }
    // Also show overdue
    if (days < 0 && c.status === 'overdue') {
      const e = entityMap[c.entityId];
      events.push({
        date: c.dueDate.slice(0, 10),
        dateObj: d,
        type: 'compliance',
        title: `OVERDUE: ${c.requirementType}`,
        entity: e?.name ?? c.entityId,
        entityId: c.entityId,
        country: e?.country ?? '',
        status: 'overdue',
        days,
        detail: `${c.regulator} · Owner: ${c.owner}`,
      });
    }
  }

  // Licenses expiring
  for (const l of licenses) {
    if (!l.expiryDate) continue;
    const d = new Date(l.expiryDate);
    const days = daysUntil(l.expiryDate);
    if (d <= cutoff && l.status !== 'expired' && days <= 180) {
      const e = entityMap[l.entityId];
      events.push({
        date: l.expiryDate.slice(0, 10),
        dateObj: d,
        type: 'license',
        title: `${l.licenseType} expiry`,
        entity: e?.name ?? l.entityId,
        entityId: l.entityId,
        country: e?.country ?? '',
        status: l.status,
        days,
        detail: `${l.regulator} · ${l.licenseNumber}`,
      });
    }
  }

  // Board meetings
  for (const m of meetings) {
    const d = new Date(m.meetingDate);
    const days = daysUntil(m.meetingDate);
    if (d >= now && d <= cutoff && m.status === 'scheduled') {
      const e = entityMap[m.entityId];
      events.push({
        date: m.meetingDate.slice(0, 10),
        dateObj: d,
        type: 'meeting',
        title: m.meetingType,
        entity: e?.name ?? m.entityId,
        entityId: m.entityId,
        country: e?.country ?? '',
        status: m.status,
        days,
        detail: `Chair: ${m.chair} · ${m.timezone}`,
      });
    }
  }

  // Sort by date
  events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Group by month
  const byMonth: Record<string, CalEvent[]> = {};
  for (const ev of events) {
    const d = ev.dateObj;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(ev);
  }

  const typeIcon = (t: CalEvent['type']) => {
    if (t === 'compliance') return <CheckSquare className="w-3.5 h-3.5" />;
    if (t === 'license') return <Shield className="w-3.5 h-3.5" />;
    return <Calendar className="w-3.5 h-3.5" />;
  };

  const typeColor = (ev: CalEvent) => {
    if (ev.status === 'overdue' || ev.days < 0) return 'bg-red-50 border-red-200 text-red-800';
    if (ev.days <= 30) return 'bg-orange-50 border-orange-200 text-orange-800';
    if (ev.days <= 60) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    if (ev.type === 'meeting') return 'bg-blue-50 border-blue-200 text-blue-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const urgentCount = events.filter(e => e.days <= 30 || e.days < 0).length;
  const thisMonth = events.filter(e => {
    const d = e.dateObj;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div>
      <Header title="Key Dates Calendar" subtitle="Compliance deadlines, license renewals, and board meetings" />
      <div className="px-8 py-6 space-y-6">

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total upcoming', value: events.length, icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'This month', value: thisMonth, icon: Clock, color: 'text-blue-600 bg-blue-50' },
            { label: 'Critical (≤30d)', value: urgentCount, icon: CheckSquare, color: 'text-red-600 bg-red-50' },
            { label: 'Compliance events', value: events.filter(e => e.type === 'compliance').length, icon: CheckSquare, color: 'text-green-600 bg-green-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Legend:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Overdue / ≤30d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> 31–60d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> 61–90d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Meeting</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> &gt;90d</span>
        </div>

        {/* Monthly timeline */}
        <div className="space-y-8">
          {Object.entries(byMonth).map(([monthKey, monthEvents]) => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(+year, +month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return (
              <div key={monthKey}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-bold text-gray-900">{monthName}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {monthEvents.map((ev, i) => (
                    <Link
                      key={i}
                      href={`/entities/${ev.entityId}`}
                      className={`flex items-start gap-4 p-3 rounded-lg border transition-all hover:shadow-sm ${typeColor(ev)}`}
                    >
                      {/* Date badge */}
                      <div className="shrink-0 w-10 text-center">
                        <p className="text-lg font-bold leading-tight">{ev.dateObj.getDate()}</p>
                        <p className="text-xs opacity-70">
                          {ev.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                      </div>

                      {/* Event detail */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {typeIcon(ev.type)}
                          <p className="text-sm font-semibold truncate">{ev.title}</p>
                        </div>
                        <p className="text-xs opacity-80">
                          {getFlagEmoji(ev.country)} {ev.entity}
                        </p>
                        <p className="text-xs opacity-60 mt-0.5">{ev.detail}</p>
                      </div>

                      {/* Days badge */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold">
                          {ev.days < 0 ? `${Math.abs(ev.days)}d ago` : ev.days === 0 ? 'Today' : `${ev.days}d`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No upcoming key dates found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
