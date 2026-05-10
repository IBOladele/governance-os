'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { getFlagEmoji } from '@/lib/utils';
import { AlertTriangle, Info } from 'lucide-react';
import type { Alert } from '@/lib/db/schema';
import type { Entity } from '@/lib/db/schema';

const severityIcon = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
};

const categoryLabel: Record<string, string> = {
  compliance: '📋 Compliance',
  license: '🛡 License',
  capital: '💰 Capital',
  board: '👥 Board',
};

const categoryRoute: Record<string, string> = {
  compliance: '/compliance',
  license: '/licenses',
  capital: '/capital',
  board: '/board-meetings',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

interface Props {
  alerts: Alert[];
  entities: Entity[];
}

export default function AlertsClient({ alerts: initialAlerts, entities }: Props) {
  const router = useRouter();

  // Local state — exclude dismissed from the start (they shouldn't show at all)
  const [alerts, setAlerts] = useState<Alert[]>(
    initialAlerts.filter(a => a.status !== 'dismissed')
  );
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Apply both filters (AND logic)
  const filtered = useMemo(() => {
    return alerts.filter(a => {
      const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
      const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
      return matchSeverity && matchCategory;
    });
  }, [alerts, severityFilter, categoryFilter]);

  const filteredUnread = filtered.filter(a => a.status === 'unread');
  const filteredRead = filtered.filter(a => a.status === 'read');

  // Summary counts are based on filtered+local state
  const criticalCount = filtered.filter(a => a.severity === 'critical').length;
  const warningCount = filtered.filter(a => a.severity === 'warning').length;
  const infoCount = filtered.filter(a => a.severity === 'info').length;
  const unreadCount = filteredUnread.length;

  async function handleMarkAllRead() {
    const unreadIds = filteredUnread.map(a => a.id);
    if (unreadIds.length === 0) return;

    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: unreadIds, status: 'read' }),
    });

    setAlerts(prev =>
      prev.map(a => (unreadIds.includes(a.id) ? { ...a, status: 'read' } : a))
    );
  }

  async function handleDismiss(id: string) {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: [id], status: 'dismissed' }),
    });

    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  function handleTakeAction(category: string) {
    const route = categoryRoute[category] ?? '/';
    router.push(route);
  }

  const totalUnreadForHeader = alerts.filter(a => a.status === 'unread').length;
  const totalCriticalForHeader = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div>
      <Header
        title="Alerts & Notifications"
        subtitle={`${totalUnreadForHeader} unread · ${totalCriticalForHeader} critical`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* Alert summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Critical', count: criticalCount, color: 'bg-red-500', textColor: 'text-red-700', bg: 'bg-red-50 border-red-200' },
            { label: 'Warnings', count: warningCount, color: 'bg-yellow-500', textColor: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
            { label: 'Info', count: infoCount, color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
            { label: 'Unread', count: unreadCount, color: 'bg-indigo-500', textColor: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.bg}`}>
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                {s.count}
              </div>
              <p className={`text-sm font-semibold ${s.textColor}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters + Mark all read */}
        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="all">All severities</option>
            <option value="critical">critical</option>
            <option value="warning">warning</option>
            <option value="info">info</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="all">All categories</option>
            <option value="compliance">compliance</option>
            <option value="license">license</option>
            <option value="capital">capital</option>
            <option value="board">board</option>
          </select>
          <button
            onClick={handleMarkAllRead}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-4 py-2 rounded-lg transition-colors"
          >
            Mark all as read
          </button>
        </div>

        {/* Unread Alerts */}
        {filteredUnread.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              Unread ({filteredUnread.length})
            </h2>
            <div className="space-y-3">
              {filteredUnread.map(alert => {
                const sev = severityIcon[alert.severity as keyof typeof severityIcon];
                const entity = entities.find(e => e.id === alert.entityId);
                return (
                  <div key={alert.id} className={`rounded-xl border p-5 ${sev.bg} relative`}>
                    <div className={`absolute top-5 right-5 w-2 h-2 rounded-full ${sev.dot}`} />
                    <div className="flex items-start gap-3">
                      <sev.icon className={`w-5 h-5 ${sev.color} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{categoryLabel[alert.category]}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            {getFlagEmoji(entity?.country ?? '')} {entity?.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">{formatTime(alert.createdAt)}</span>
                        </div>
                        <p className="font-semibold text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 ml-8">
                      <button
                        onClick={() => handleTakeAction(alert.category)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 px-3 py-1 rounded-full transition-colors"
                      >
                        Take action →
                      </button>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1 rounded-full transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Read Alerts */}
        {filteredRead.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">Read ({filteredRead.length})</h2>
            <div className="space-y-2">
              {filteredRead.map(alert => {
                const sev = severityIcon[alert.severity as keyof typeof severityIcon];
                const entity = entities.find(e => e.id === alert.entityId);
                return (
                  <div key={alert.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 opacity-70">
                    <sev.icon className={`w-4 h-4 ${sev.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-400">{categoryLabel[alert.category]}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{getFlagEmoji(entity?.country ?? '')} {entity?.name}</span>
                        <span className="text-xs text-gray-300 ml-auto">{formatTime(alert.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1 rounded-full transition-colors shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
