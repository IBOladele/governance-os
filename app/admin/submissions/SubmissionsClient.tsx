'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Bug, Lightbulb, CheckCircle, XCircle, Clock, Search, ExternalLink } from 'lucide-react';
import type { Submission } from '@/lib/db/schema';

interface Props {
  initialSubmissions: Submission[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  implementing: 'bg-indigo-100 text-indigo-800',
  done: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-800',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600',
  major: 'text-orange-600',
  minor: 'text-yellow-600',
};

export default function SubmissionsClient({ initialSubmissions }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [filter, setFilter] = useState<'all' | 'bug' | 'feature'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = submissions.filter(s => {
    const matchType = filter === 'all' || s.type === filter;
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  async function updateStatus(id: string, status: string, extra?: Record<string, unknown>) {
    setActionLoading(true);
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = { status, ...extra };
    if (status === 'approved') {
      payload.approvedBy = 'admin@governanceos.app';
      payload.approvedAt = now;
    }
    if (status === 'rejected') {
      payload.rejectedBy = 'admin@governanceos.app';
      payload.rejectedAt = now;
    }
    if (status === 'done') {
      payload.implementedAt = now;
    }
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { data } = await res.json();
      setSubmissions(prev => prev.map(s => s.id === id ? data : s));
      if (selected?.id === id) setSelected(data);
    } finally {
      setActionLoading(false);
    }
  }

  const openCount = submissions.filter(s => s.status === 'open').length;
  const inReviewCount = submissions.filter(s => s.status === 'in_review').length;
  const bugCount = submissions.filter(s => s.type === 'bug').length;
  const featureCount = submissions.filter(s => s.type === 'feature').length;

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open', value: openCount, color: 'text-blue-600 bg-blue-50' },
          { label: 'In Review', value: inReviewCount, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Bug Reports', value: bugCount, color: 'text-red-600 bg-red-50' },
          { label: 'Feature Requests', value: featureCount, color: 'text-indigo-600 bg-indigo-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['all', 'bug', 'feature'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filter === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {t === 'all' ? 'All' : t === 'bug' ? '🐛 Bugs' : '💡 Features'}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="implementing">Implementing</option>
          <option value="done">Done</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} of {submissions.length}</span>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* List */}
        <div className="col-span-2 space-y-2">
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected?.id === s.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                {s.type === 'bug' ? (
                  <Bug className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <Lightbulb className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                )}
                <p className="text-sm font-semibold text-gray-900 leading-snug">{s.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {s.status.replace('_', ' ')}
                </span>
                {s.severity && (
                  <span className={`text-xs font-medium ${SEVERITY_COLORS[s.severity] ?? ''}`}>{s.severity}</span>
                )}
                {s.priority && (
                  <span className="text-xs text-gray-400">{s.priority} priority</span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{formatDate(s.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{s.description}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">No submissions match your filters.</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="col-span-3">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-6 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {selected.type === 'bug' ? (
                    <Bug className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <Lightbulb className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{selected.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted by {selected.submittedBy} on {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status] ?? ''}`}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selected.pageUrl && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Page</p>
                    <p className="text-xs font-mono text-gray-700 truncate">{selected.pageUrl.replace(/^https?:\/\/[^/]+/, '')}</p>
                  </div>
                )}
                {selected.severity && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Severity</p>
                    <p className={`text-sm font-semibold capitalize ${SEVERITY_COLORS[selected.severity]}`}>{selected.severity}</p>
                  </div>
                )}
                {selected.area && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Area</p>
                    <p className="text-sm text-gray-700">{selected.area}</p>
                  </div>
                )}
                {selected.priority && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Priority</p>
                    <p className="text-sm text-gray-700 capitalize">{selected.priority}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{selected.description}</p>
              </div>

              {/* PRD content */}
              {selected.prdContent && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generated PRD</p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selected.prdContent}
                  </div>
                </div>
              )}

              {/* Rejection note */}
              {selected.status === 'rejected' && selected.rejectionNote && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection reason</p>
                  <p className="text-sm text-red-600">{selected.rejectionNote}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                {selected.status === 'open' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'in_review')}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" /> Mark In Review
                  </button>
                )}
                {['open', 'in_review'].includes(selected.status) && (
                  <>
                    <button
                      onClick={() => updateStatus(selected.id, 'approved')}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const note = prompt('Rejection reason (optional):');
                        updateStatus(selected.id, 'rejected', { rejectionNote: note ?? '' });
                      }}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                {selected.status === 'approved' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'implementing')}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" /> Mark Implementing
                  </button>
                )}
                {selected.status === 'implementing' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'done')}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Done
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Select a submission to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
