import Header from '@/components/layout/Header';
import { getComplianceObligations, getLicenses, getBoardMeetings, getEntities } from '@/lib/db/queries';
import { daysUntil } from '@/lib/utils';
import CalendarClient from './CalendarClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const [compliance, licenses, meetings, entities] = await Promise.all([
    getComplianceObligations(),
    getLicenses(),
    getBoardMeetings(),
    getEntities(),
  ]);

  const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() + 1);

  type StaticEvent = {
    date: string; dateObj: Date; type: 'compliance' | 'license' | 'meeting';
    title: string; entity: string; entityId: string; country: string;
    status: string; days: number; detail: string;
  };

  const staticEvents: StaticEvent[] = [];

  // Compliance deadlines
  for (const c of compliance) {
    const d    = new Date(c.dueDate);
    const days = daysUntil(c.dueDate);
    const e    = entityMap[c.entityId];
    if (d >= now && d <= cutoff && c.status !== 'completed' && c.status !== 'not_applicable') {
      staticEvents.push({
        date: c.dueDate.slice(0, 10), dateObj: d, type: 'compliance',
        title: c.requirementType, entity: e?.name ?? c.entityId,
        entityId: c.entityId, country: e?.country ?? '', status: c.status, days,
        detail: `${c.regulator} · Owner: ${c.owner}`,
      });
    }
    if (days < 0 && c.status === 'overdue') {
      staticEvents.push({
        date: c.dueDate.slice(0, 10), dateObj: d, type: 'compliance',
        title: `OVERDUE: ${c.requirementType}`, entity: e?.name ?? c.entityId,
        entityId: c.entityId, country: e?.country ?? '', status: 'overdue', days,
        detail: `${c.regulator} · Owner: ${c.owner}`,
      });
    }
  }

  // License renewals
  for (const l of licenses) {
    if (!l.expiryDate) continue;
    const d    = new Date(l.expiryDate);
    const days = daysUntil(l.expiryDate);
    const e    = entityMap[l.entityId];
    if (d <= cutoff && l.status !== 'expired' && days <= 180) {
      staticEvents.push({
        date: l.expiryDate.slice(0, 10), dateObj: d, type: 'license',
        title: `${l.licenseType} expiry`, entity: e?.name ?? l.entityId,
        entityId: l.entityId, country: e?.country ?? '', status: l.status, days,
        detail: `${l.regulator} · ${l.licenseNumber}`,
      });
    }
  }

  // Board meetings
  for (const m of meetings) {
    const d    = new Date(m.meetingDate);
    const days = daysUntil(m.meetingDate);
    const e    = entityMap[m.entityId];
    if (d >= now && d <= cutoff && m.status === 'scheduled') {
      staticEvents.push({
        date: m.meetingDate.slice(0, 10), dateObj: d, type: 'meeting',
        title: m.meetingType, entity: e?.name ?? m.entityId,
        entityId: m.entityId, country: e?.country ?? '', status: m.status, days,
        detail: `Chair: ${m.chair} · ${m.timezone}`,
      });
    }
  }

  staticEvents.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  return (
    <div>
      <Header
        title="Key Dates Calendar"
        subtitle="Compliance deadlines, license renewals, board meetings, and custom key dates"
      />
      <CalendarClient
        staticEvents={staticEvents}
        entities={entities.map(e => ({ id: e.id, name: e.name, country: e.country }))}
      />
    </div>
  );
}
