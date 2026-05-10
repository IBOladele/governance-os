'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { formatDate, cn, getFlagEmoji } from '@/lib/utils';
import {
  Calendar, Plus, ChevronRight, Clock, MapPin, Users,
  Video, Building2, CheckCircle2, AlertCircle, Filter, CalendarPlus,
} from 'lucide-react';
import type { BoardMeeting, Entity } from '@/lib/db/schema';

function generateICS(meeting: BoardMeeting, entityName: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dt = new Date(`${meeting.meetingDate}T${meeting.meetingTime ?? '10:00'}:00`);
  const end = new Date(dt.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const loc = meeting.virtualLink || meeting.location || meeting.locationType;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GovernanceOS//EN',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@governanceos.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${meeting.meetingType} — ${entityName}`,
    `DESCRIPTION:Chair: ${meeting.chair}\\nAgenda: ${meeting.agenda?.replace(/\n/g, '\\n') ?? ''}`,
    loc ? `LOCATION:${loc}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function downloadICS(meeting: BoardMeeting, entityName: string) {
  const blob = new Blob([generateICS(meeting, entityName)], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${entityName.replace(/\s+/g, '-')}-${meeting.meetingDate}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  draft:      'bg-gray-100 text-gray-600',
  cancelled:  'bg-red-100 text-red-600',
};

const TYPE_COLORS: Record<string, string> = {
  'Board Meeting':       'bg-indigo-50 text-indigo-700',
  'Annual General Meeting': 'bg-purple-50 text-purple-700',
  'Committee Meeting':   'bg-amber-50 text-amber-700',
  'Shareholder Meeting': 'bg-teal-50 text-teal-700',
  'Special Resolution':  'bg-rose-50 text-rose-700',
};

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  virtual:  <Video  className="w-3.5 h-3.5" />,
  physical: <Building2 className="w-3.5 h-3.5" />,
  hybrid:   <MapPin className="w-3.5 h-3.5" />,
};

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysFromNow(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  boardMeetings: BoardMeeting[];
  entities: Entity[];
}

export default function BoardMeetingsClient({ boardMeetings, entities }: Props) {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [view, setView] = useState<'upcoming' | 'all' | 'past'>('upcoming');

  const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));

  const sorted = useMemo(
    () => [...boardMeetings].sort((a, b) => a.meetingDate.localeCompare(b.meetingDate)),
    [boardMeetings]
  );

  const filtered = useMemo(() => {
    let list = sorted;

    if (view === 'upcoming') list = list.filter(m => daysFromNow(m.meetingDate) >= 0 && m.status !== 'completed' && m.status !== 'cancelled');
    if (view === 'past')     list = list.filter(m => daysFromNow(m.meetingDate) < 0 || m.status === 'completed');

    if (filterEntity) list = list.filter(m => m.entityId === filterEntity);
    if (filterStatus) list = list.filter(m => m.status === filterStatus);
    if (filterType)   list = list.filter(m => m.meetingType === filterType);
    if (search)       list = list.filter(m => {
      const ent = entityMap[m.entityId];
      return (
        m.meetingType.toLowerCase().includes(search.toLowerCase()) ||
        m.chair.toLowerCase().includes(search.toLowerCase()) ||
        (ent?.name ?? '').toLowerCase().includes(search.toLowerCase())
      );
    });

    return list;
  }, [sorted, view, filterEntity, filterStatus, filterType, search, entityMap]);

  // Stats
  const upcoming30 = sorted.filter(m => { const d = daysFromNow(m.meetingDate); return d >= 0 && d <= 30 && m.status === 'scheduled'; });
  const upcoming7  = sorted.filter(m => { const d = daysFromNow(m.meetingDate); return d >= 0 && d <= 7 && m.status === 'scheduled'; });
  const completedAll = sorted.filter(m => m.status === 'completed');
  const thisMonth  = sorted.filter(m => {
    const d = new Date(m.meetingDate);
    return d.getUTCMonth() === TODAY.getMonth() && d.getUTCFullYear() === TODAY.getFullYear();
  });

  const uniqueEntitiesWithMeetings = [...new Set(boardMeetings.map(m => m.entityId))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Board Meetings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sorted.length} meetings across {uniqueEntitiesWithMeetings.length} entities
          </p>
        </div>
        <Link
          href="/board-meetings/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Meetings</p>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{sorted.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">in calendar year 2026–27</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Next 30 Days</p>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{upcoming30.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{upcoming7.length} in the next 7 days</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">This Month</p>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{thisMonth.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">April 2026</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Completed</p>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedAll.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">minutes available</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {/* View toggle */}
        <div className="flex items-center gap-1 mb-4">
          {(['upcoming', 'all', 'past'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                view === v ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {v === 'upcoming' ? 'Upcoming' : v === 'all' ? 'All Meetings' : 'Past'}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search entity, chair…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <select
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Entities</option>
              {uniqueEntitiesWithMeetings.map(eid => (
                <option key={eid} value={eid}>{entityMap[eid]?.name ?? eid}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Types</option>
              <option value="Board Meeting">Board Meeting</option>
              <option value="Annual General Meeting">AGM</option>
              <option value="Committee Meeting">Committee</option>
              <option value="Shareholder Meeting">Shareholder</option>
              <option value="Special Resolution">Special Resolution</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Entity</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Chair</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Quorum</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No meetings match the selected filters.
                  </td>
                </tr>
              ) : filtered.map(meeting => {
                const entity = entityMap[meeting.entityId];
                const days = daysFromNow(meeting.meetingDate);
                const isUrgent = days >= 0 && days <= 7 && meeting.status === 'scheduled';

                return (
                  <tr key={meeting.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {formatDate(meeting.meetingDate)}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {meeting.meetingTime} {meeting.timezone?.split('/')[1]?.replace('_', ' ')}
                      </div>
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium mt-0.5">
                          <AlertCircle className="w-3 h-3" />
                          {days === 0 ? 'Today' : `${days}d away`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getFlagEmoji(entity?.country ?? '')}</span>
                        <div>
                          <p className="font-medium text-slate-800 leading-tight">{entity?.name ?? meeting.entityId}</p>
                          <p className="text-xs text-slate-400">{entity?.country}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', TYPE_COLORS[meeting.meetingType] ?? 'bg-gray-100 text-gray-600')}>
                        {meeting.meetingType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{meeting.chair}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        {LOCATION_ICONS[meeting.locationType]}
                        <span className="capitalize">{meeting.locationType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {meeting.quorumRequired}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', STATUS_COLORS[meeting.status] ?? 'bg-gray-100 text-gray-600')}>
                        {meeting.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <button
                          onClick={() => downloadICS(meeting, entity?.name ?? meeting.entityId)}
                          title="Add to calendar"
                          className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 text-xs font-medium"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/board-meetings/${meeting.id}`}
                          className="flex items-center gap-1 text-indigo-600 text-xs font-medium"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {filtered.length} of {sorted.length} meetings
          </p>
          {(filterEntity || filterStatus || filterType || search) && (
            <button
              onClick={() => { setFilterEntity(''); setFilterStatus(''); setFilterType(''); setSearch(''); }}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
