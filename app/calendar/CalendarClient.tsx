'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Shield, CheckSquare, Clock, Plus, Pencil, Trash2, Flag } from 'lucide-react';
import Link from 'next/link';
import { getFlagEmoji, daysUntil } from '@/lib/utils';
import AddKeyDateModal from './AddKeyDateModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entity { id: string; name: string; country: string; }

interface StaticEvent {
  date: string; dateObj: Date; type: 'compliance' | 'license' | 'meeting';
  title: string; entity: string; entityId: string; country: string;
  status: string; days: number; detail: string;
}

interface KeyDate {
  id: string; title: string; date: string; category: string;
  description: string | null; recurrence: string | null;
  status: string; notes: string | null; entityId: string | null;
  entity: { id: string; name: string; country: string } | null;
}

interface Props {
  staticEvents: StaticEvent[];
  entities: Entity[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  filing:     { label: 'Filing',     icon: '📋', color: 'bg-violet-50 border-violet-200 text-violet-800' },
  regulatory: { label: 'Regulatory', icon: '🏛️', color: 'bg-rose-50 border-rose-200 text-rose-800' },
  corporate:  { label: 'Corporate',  icon: '🏢', color: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
  financial:  { label: 'Financial',  icon: '💰', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  other:      { label: 'Other',      icon: '📌', color: 'bg-gray-50 border-gray-200 text-gray-700' },
};

function staticColor(ev: StaticEvent) {
  if (ev.status === 'overdue' || ev.days < 0) return 'bg-red-50 border-red-200 text-red-800';
  if (ev.days <= 30)  return 'bg-orange-50 border-orange-200 text-orange-800';
  if (ev.days <= 60)  return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  if (ev.type === 'meeting') return 'bg-blue-50 border-blue-200 text-blue-800';
  return 'bg-gray-50 border-gray-200 text-gray-800';
}

function staticIcon(t: StaticEvent['type']) {
  if (t === 'compliance') return <CheckSquare className="w-3.5 h-3.5" />;
  if (t === 'license')    return <Shield      className="w-3.5 h-3.5" />;
  return <Calendar className="w-3.5 h-3.5" />;
}

function keyDateColor(kd: KeyDate, days: number) {
  if (kd.status === 'completed') return 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
  if (kd.status === 'cancelled') return 'bg-gray-50 border-gray-200 text-gray-400 opacity-40 line-through';
  return CATEGORY_META[kd.category]?.color ?? CATEGORY_META.other.color;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarClient({ staticEvents, entities }: Props) {
  const [keyDates, setKeyDates]     = useState<KeyDate[]>([]);
  const [modal, setModal]           = useState<'new' | KeyDate | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const loadKeyDates = useCallback(async () => {
    const res = await fetch('/api/key-dates');
    if (res.ok) setKeyDates(await res.json());
  }, []);

  useEffect(() => { loadKeyDates(); }, [loadKeyDates]);

  const deleteKeyDate = async (id: string) => {
    await fetch(`/api/key-dates/${id}`, { method: 'DELETE' });
    setConfirmDel(null);
    loadKeyDates();
  };

  // ── Merge static + key dates into unified timeline ─────────────────────────

  type Row =
    | { kind: 'static'; ev: StaticEvent; dateObj: Date; days: number }
    | { kind: 'key';    kd: KeyDate;     dateObj: Date; days: number };

  const now = new Date(); now.setHours(0,0,0,0);
  const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() + 2);

  const rows: Row[] = [
    ...staticEvents.map(ev => ({ kind: 'static' as const, ev, dateObj: ev.dateObj, days: ev.days })),
    ...keyDates
      .filter(kd => kd.status !== 'cancelled')
      .map(kd => {
        const dateObj = new Date(kd.date);
        const days    = Math.ceil((dateObj.getTime() - now.getTime()) / 86400000);
        return { kind: 'key' as const, kd, dateObj, days };
      })
      .filter(r => r.dateObj <= cutoff),
  ].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Group by month
  const byMonth: Record<string, Row[]> = {};
  for (const row of rows) {
    const key = monthKey(row.dateObj);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(row);
  }

  const urgentCount  = rows.filter(r => r.days <= 30 || r.days < 0).length;
  const thisMonthCnt = rows.filter(r => {
    return r.dateObj.getFullYear() === now.getFullYear() && r.dateObj.getMonth() === now.getMonth();
  }).length;
  const keyDateCnt = keyDates.filter(k => k.status === 'pending').length;

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total upcoming',  value: rows.length,                                          icon: Calendar,     color: 'text-indigo-600 bg-indigo-50' },
          { label: 'This month',      value: thisMonthCnt,                                         icon: Clock,        color: 'text-blue-600 bg-blue-50' },
          { label: 'Critical (≤30d)', value: urgentCount,                                          icon: CheckSquare,  color: 'text-red-600 bg-red-50' },
          { label: 'Key dates',       value: keyDateCnt,                                           icon: Flag,         color: 'text-violet-600 bg-violet-50' },
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

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="font-medium text-gray-700">Legend:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Overdue / ≤30d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> 31–60d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Meeting</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-400 inline-block" /> Filing</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> Regulatory</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Financial</span>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Key Date
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(byMonth).map(([mk, monthRows]) => {
          const [year, month] = mk.split('-');
          const monthName = new Date(+year, +month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          return (
            <div key={mk}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-gray-900">{monthName}</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{monthRows.length} event{monthRows.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-2">
                {monthRows.map((row, i) => {
                  if (row.kind === 'static') {
                    const ev = row.ev;
                    return (
                      <Link key={`s-${i}`} href={`/entities/${ev.entityId}`}
                        className={`flex items-start gap-4 p-3 rounded-lg border transition-all hover:shadow-sm ${staticColor(ev)}`}>
                        <div className="shrink-0 w-10 text-center">
                          <p className="text-lg font-bold leading-tight">{ev.dateObj.getDate()}</p>
                          <p className="text-xs opacity-70">{ev.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {staticIcon(ev.type)}
                            <p className="text-sm font-semibold truncate">{ev.title}</p>
                          </div>
                          <p className="text-xs opacity-80">{getFlagEmoji(ev.country)} {ev.entity}</p>
                          <p className="text-xs opacity-60 mt-0.5">{ev.detail}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold">
                            {ev.days < 0 ? `${Math.abs(ev.days)}d ago` : ev.days === 0 ? 'Today' : `${ev.days}d`}
                          </p>
                        </div>
                      </Link>
                    );
                  }

                  // Key date row
                  const kd   = row.kd;
                  const days = row.days;
                  const meta = CATEGORY_META[kd.category] ?? CATEGORY_META.other;
                  return (
                    <div key={`k-${kd.id}`}
                      className={`flex items-start gap-4 p-3 rounded-lg border ${keyDateColor(kd, days)}`}>
                      <div className="shrink-0 w-10 text-center">
                        <p className="text-lg font-bold leading-tight">{row.dateObj.getDate()}</p>
                        <p className="text-xs opacity-70">{row.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{meta.icon}</span>
                          <p className="text-sm font-semibold truncate">{kd.title}</p>
                          {kd.recurrence && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 font-medium capitalize shrink-0">
                              {kd.recurrence}
                            </span>
                          )}
                          {kd.status === 'completed' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">✓ Done</span>
                          )}
                        </div>
                        {kd.entity ? (
                          <p className="text-xs opacity-80">{getFlagEmoji(kd.entity.country)} {kd.entity.name}</p>
                        ) : (
                          <p className="text-xs opacity-60">Group-wide</p>
                        )}
                        {kd.description && <p className="text-xs opacity-60 mt-0.5 truncate">{kd.description}</p>}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <p className="text-sm font-bold mr-2">
                          {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`}
                        </p>
                        <button onClick={() => setModal(kd)}
                          className="p-1 text-current opacity-50 hover:opacity-100 rounded hover:bg-white/40 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDel(kd.id)}
                          className="p-1 text-current opacity-50 hover:opacity-100 rounded hover:bg-white/40 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No upcoming key dates found.</p>
            <button onClick={() => setModal('new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Add your first key date
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <p className="font-semibold text-gray-900 mb-2">Delete key date?</p>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteKeyDate(confirmDel)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <AddKeyDateModal
          entities={entities}
          existing={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadKeyDates(); }}
        />
      )}
    </div>
  );
}
