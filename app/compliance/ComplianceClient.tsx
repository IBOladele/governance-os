'use client';

import { Fragment, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { formatDate, getFlagEmoji } from '@/lib/utils';
import {
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  Upload,
  Sparkles,
  Info,
  X,
  TrendingDown,
  Calendar,
  ArrowUpDown,
  RefreshCw,
  Globe,
  ExternalLink,
  User,
  Users,
} from 'lucide-react';
import type { ComplianceObligation, Entity, ComplianceStatus } from '@/lib/db/schema';

interface Props {
  initialObligations: ComplianceObligation[];
  entities: Entity[];
}

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:        { label: 'Pending',        color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock3 },
  submitted:      { label: 'Submitted',      color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: ClipboardCheck },
  overdue:        { label: 'Overdue',        color: 'bg-red-100 text-red-700 border-red-200',        icon: AlertCircle },
  completed:      { label: 'Completed',      color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle2 },
  not_applicable: { label: 'N/A',            color: 'bg-gray-100 text-gray-600 border-gray-200',     icon: ClipboardCheck },
};

const RECURRENCE_LABEL: Record<string, string> = {
  annual: 'Annual', quarterly: 'Quarterly', monthly: 'Monthly', none: 'One-off',
};

type SortKey = 'dueDate' | 'entity' | 'requirementType' | 'daysRemaining';

interface ImportResult {
  totalRows?: number;
  totalPlanned?: number;
  entitiesProcessed?: number;
  supportedJurisdictions?: number;
  unsupportedCountries?: string[];
  created: number;
  skipped: number;
  results?: Array<{ row?: number; status: string; message?: string; requirementType?: string; entityId?: string; dueDate?: string }>;
}

function daysUntil(dateStr: string | Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/** Parses "Compliance DRI: X | Finance DRI: Y" from the notes field */
function parseDris(notes: string | null): { compliance: string; finance: string } {
  if (!notes) return { compliance: '', finance: '' };
  const compMatch = notes.match(/Compliance DRI:\s*([^|]+)/i);
  const finMatch  = notes.match(/Finance DRI:\s*([^|]+)/i);
  return {
    compliance: compMatch?.[1]?.trim() ?? '',
    finance:    finMatch?.[1]?.trim() ?? '',
  };
}

/** Returns "Danny G." style short name */
function shortName(full: string): string {
  if (!full) return '';
  // Handle "First Last / Title" patterns — take everything before " / " or " - "
  const namePart = full.split(/\s*[\/\-]\s*/)[0].trim();
  const parts = namePart.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

/** Compact initials avatar */
function Avatar({ name, color }: { name: string; color: string }) {
  const parts = name.split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <span title={name} className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white flex-shrink-0 ${color}`}>
      {initials}
    </span>
  );
}

/** Strip leading asterisks from Jira bold-style regulators like "** FCA" → "FCA" */
function cleanRegulator(r: string): string {
  return r?.replace(/^\*+\s*/, '').trim() ?? r;
}

/** Extract Jira issue key from description prefix like "[GRR-53] UK | Freq: Annual" */
function extractJiraKey(desc: string | null): string | null {
  if (!desc) return null;
  const m = desc.match(/^\[([A-Z]+-\d+)\]/);
  return m ? m[1] : null;
}

/** Strip Jira key prefix and "Freq:" from description for clean display */
function cleanDescription(desc: string | null): string {
  if (!desc) return '';
  return desc
    .replace(/^\[[A-Z]+-\d+\]\s*/, '')   // remove [GRR-53]
    .replace(/\|\s*Freq:\s*[^\|]+/g, '') // remove Freq: Annual
    .trim()
    .replace(/^[\|\-\s]+/, '')            // remove leading pipes/dashes
    .trim();
}

function DriCell({ notes, owner }: { notes: string | null; owner: string | null }) {
  const { compliance, finance } = parseDris(notes);
  if (!compliance && !finance) {
    return <span className="text-gray-500 text-xs">{owner ? shortName(owner) : '—'}</span>;
  }
  return (
    <div className="space-y-1">
      {compliance && (
        <div className="flex items-center gap-1.5" title={`Compliance DRI: ${compliance}`}>
          <Avatar name={compliance} color="bg-indigo-400" />
          <span className="text-xs text-gray-700 truncate max-w-[100px]">{shortName(compliance)}</span>
        </div>
      )}
      {finance && (
        <div className="flex items-center gap-1.5" title={`Finance DRI: ${finance}`}>
          <Avatar name={finance} color="bg-emerald-400" />
          <span className="text-xs text-gray-500 truncate max-w-[100px]">{shortName(finance)}</span>
        </div>
      )}
    </div>
  );
}

function DaysRemainingBadge({ dueDate, status }: { dueDate: string | Date; status: ComplianceStatus }) {
  if (status === 'completed' || status === 'not_applicable') {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const days = daysUntil(dueDate);

  if (status === 'overdue' || days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300">
        <TrendingDown className="w-3 h-3" />
        {Math.abs(days)}d overdue
      </span>
    );
  }

  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300">
        <AlertCircle className="w-3 h-3" />
        Due today!
      </span>
    );
  }

  if (days <= 14) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-200">
        <Clock3 className="w-3 h-3" />
        {days}d
      </span>
    );
  }

  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
        <Clock3 className="w-3 h-3" />
        {days}d
      </span>
    );
  }

  if (days <= 60) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
        <Calendar className="w-3 h-3" />
        {days}d
      </span>
    );
  }

  if (days <= 90) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        <Calendar className="w-3 h-3" />
        {days}d
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      {days}d
    </span>
  );
}

function UrgencyBar({ days, status }: { days: number; status: ComplianceStatus }) {
  if (status === 'completed' || status === 'not_applicable') return null;
  if (days > 90) return null;

  const pct = status === 'overdue' || days < 0
    ? 100
    : Math.max(5, 100 - (days / 90) * 100);

  const color = days < 0 || status === 'overdue'
    ? 'bg-red-500'
    : days <= 14 ? 'bg-red-400'
    : days <= 30 ? 'bg-orange-400'
    : days <= 60 ? 'bg-amber-400'
    : 'bg-yellow-300';

  return (
    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ComplianceClient({ initialObligations, entities }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | ComplianceStatus>('all');
  const [entityFilter, setEntityFilter] = useState<'all' | string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | '14d' | '30d' | '60d' | '90d'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('daysRemaining');
  const [sortAsc, setSortAsc] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showRefs, setShowRefs] = useState(false);
  const [refs, setRefs] = useState<{ entities: any[]; directors: any[]; shareholders: any[] } | null>(null);
  const [refsLoading, setRefsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [importResult, setImportResult] = useState<{ title: string; data: ImportResult } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearAll = async () => {
    if (!confirm(`This will permanently delete all ${initialObligations.length} compliance obligations. Are you sure?`)) return;
    setClearing(true);
    setImportError(null);
    try {
      const res = await fetch('/api/compliance/clear?confirm=yes', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error || 'Clear failed');
      } else {
        router.refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setClearing(false);
    }
  };

  const handleJiraSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setImportError(null);
    try {
      const res = await fetch('/api/webhooks/jira?sync=true');
      const text = await res.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setImportError(json.error || `Jira sync failed (${res.status})`);
      } else {
        setSyncResult({ created: json.created ?? 0, updated: json.updated ?? 0, skipped: json.skipped ?? 0 });
        router.refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Jira sync failed');
    } finally {
      setSyncing(false);
    }
  };

  async function updateStatus(id: string, status: ComplianceStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/compliance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setImportError(j.error || 'Failed to update status');
      } else {
        router.refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/compliance/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error || 'Upload failed');
      } else {
        setImportResult({ title: 'CSV Import', data: json });
        router.refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAutoPopulate = async () => {
    if (!confirm('Generate baseline compliance obligations (Annual Return, Corporate Tax, Audited Financials, Regulatory Capital Return) for all active entities over the next 12 months?')) {
      return;
    }
    setAutoPopulating(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await fetch('/api/compliance/auto-populate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error || 'Auto-populate failed');
      } else {
        setImportResult({ title: 'Auto-populate', data: json });
        router.refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Auto-populate failed');
    } finally {
      setAutoPopulating(false);
    }
  };

  const entityMap = useMemo(() => {
    const m = new Map<string, Entity>();
    entities.forEach(e => m.set(e.id, e));
    return m;
  }, [entities]);

  // Enrich with days remaining for sorting/filtering
  const enriched = useMemo(() => {
    return initialObligations.map(o => ({
      ...o,
      daysRemaining: daysUntil(o.dueDate),
    }));
  }, [initialObligations]);

  const filtered = useMemo(() => {
    return enriched
      .filter(o => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (entityFilter !== 'all' && o.entityId !== entityFilter) return false;
        if (urgencyFilter !== 'all') {
          const d = o.daysRemaining;
          if (urgencyFilter === 'overdue' && d >= 0) return false;
          if (urgencyFilter === '14d' && (d < 0 || d > 14)) return false;
          if (urgencyFilter === '30d' && (d < 0 || d > 30)) return false;
          if (urgencyFilter === '60d' && (d < 0 || d > 60)) return false;
          if (urgencyFilter === '90d' && (d < 0 || d > 90)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'daysRemaining') {
          cmp = a.daysRemaining - b.daysRemaining;
        } else if (sortKey === 'dueDate') {
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else if (sortKey === 'entity') {
          const ea = entityMap.get(a.entityId)?.name ?? '';
          const eb = entityMap.get(b.entityId)?.name ?? '';
          cmp = ea.localeCompare(eb);
        } else if (sortKey === 'requirementType') {
          cmp = a.requirementType.localeCompare(b.requirementType);
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [enriched, statusFilter, entityFilter, urgencyFilter, sortKey, sortAsc, entityMap]);

  const counts = useMemo(() => {
    const c = { pending: 0, submitted: 0, overdue: 0, completed: 0, not_applicable: 0 };
    initialObligations.forEach(o => { c[o.status] = (c[o.status] ?? 0) + 1; });
    return c;
  }, [initialObligations]);

  const urgencyCounts = useMemo(() => {
    const active = enriched.filter(o => o.status !== 'completed' && o.status !== 'not_applicable');
    return {
      overdue: active.filter(o => o.daysRemaining < 0).length,
      within14: active.filter(o => o.daysRemaining >= 0 && o.daysRemaining <= 14).length,
      within30: active.filter(o => o.daysRemaining >= 0 && o.daysRemaining <= 30).length,
      within90: active.filter(o => o.daysRemaining >= 0 && o.daysRemaining <= 90).length,
    };
  }, [enriched]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(a => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-gray-400 inline ml-1" />;
    return <span className="text-indigo-500 ml-1 text-xs">{sortAsc ? '↑' : '↓'}</span>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Header title="Compliance & Finance" subtitle="Regulatory filings and obligations across all entities" />

      <main className="flex-1 p-8 space-y-6">
        {/* Action bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={async () => {
              setShowRefs(v => !v);
              if (!refs) {
                setRefsLoading(true);
                try {
                  const r = await fetch('/api/compliance/references');
                  const j = await r.json();
                  setRefs(j);
                } finally { setRefsLoading(false); }
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Info className="w-4 h-4" />
            Reference IDs
          </button>
          <button
            onClick={handleAutoPopulate}
            disabled={autoPopulating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {autoPopulating ? 'Generating…' : 'Auto-populate from entities'}
          </button>
          <a
            href="/compliance_obligations_template.csv"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 ml-auto"
          >
            Download template
          </a>
          <button
            onClick={handleJiraSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Pull latest changes from Jira GRR project"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Jira'}
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing || initialObligations.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        </div>

        {/* Urgency callout bar */}
        {(urgencyCounts.overdue > 0 || urgencyCounts.within14 > 0) && (
          <div className={`rounded-lg border p-4 flex items-center gap-4 ${
            urgencyCounts.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${urgencyCounts.overdue > 0 ? 'text-red-500' : 'text-orange-500'}`} />
            <div className="flex-1 text-sm">
              {urgencyCounts.overdue > 0 && (
                <span className="font-semibold text-red-700">{urgencyCounts.overdue} obligation{urgencyCounts.overdue !== 1 ? 's' : ''} overdue. </span>
              )}
              {urgencyCounts.within14 > 0 && (
                <span className="text-orange-700">{urgencyCounts.within14} due within 14 days. </span>
              )}
              {urgencyCounts.within30 > 0 && urgencyCounts.within14 === 0 && (
                <span className="text-amber-700">{urgencyCounts.within30} due within 30 days. </span>
              )}
            </div>
            <button
              onClick={() => { setUrgencyFilter('overdue'); setStatusFilter('all'); }}
              className="text-xs font-medium text-red-600 hover:text-red-800 underline"
            >
              View overdue
            </button>
          </div>
        )}

        {/* Reference IDs panel */}
        {showRefs && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reference IDs</h3>
                <p className="text-sm text-gray-500 mt-0.5">Copy entity, director, or shareholder IDs to use in CSV uploads.</p>
              </div>
              <button onClick={() => setShowRefs(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {refsLoading && <p className="text-sm text-gray-400">Loading…</p>}

            {refs && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Entities */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Entities (entityId)</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {refs.entities.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 group">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{e.name}</p>
                          <p className="text-xs text-gray-400">{e.country}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(e.id)}
                          className="ml-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 hover:bg-indigo-100 cursor-pointer"
                          title="Click to copy"
                        >
                          {e.id.slice(0, 12)}…
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Directors */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Directors</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {refs.directors.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 group">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{d.name}</p>
                          <p className="text-xs text-gray-400 truncate">{d.role} · {d.entity?.name}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(d.id)}
                          className="ml-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 hover:bg-indigo-100 cursor-pointer"
                          title="Click to copy"
                        >
                          {d.id.slice(0, 12)}…
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shareholders */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shareholders</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {refs.shareholders.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 group">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400 truncate">{s.shareholderType} · {s.entity?.name}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(s.id)}
                          className="ml-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 hover:bg-indigo-100 cursor-pointer"
                          title="Click to copy"
                        >
                          {s.id.slice(0, 12)}…
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CSV import panel */}
        {showImport && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Import compliance obligations from CSV</h3>
                <p className="text-sm text-gray-500 mt-1">Upload a CSV to create multiple obligations at once.</p>
              </div>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 text-sm text-indigo-900">
              <div className="flex gap-2 items-start">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="font-medium">CSV format</div>
                  <div>Required: <code className="bg-white px-1 rounded">entityId</code>, <code className="bg-white px-1 rounded">requirementType</code>, <code className="bg-white px-1 rounded">regulator</code>, <code className="bg-white px-1 rounded">dueDate</code> (YYYY-MM-DD).</div>
                  <div>Optional: <code className="bg-white px-1 rounded">description</code>, <code className="bg-white px-1 rounded">status</code>, <code className="bg-white px-1 rounded">owner</code>, <code className="bg-white px-1 rounded">notes</code>, <code className="bg-white px-1 rounded">recurrence</code> (annual/quarterly/monthly/none).</div>
                </div>
              </div>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleUpload(f);
              }}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-700 font-medium">
                {uploading ? 'Uploading…' : 'Click to select a CSV, or drag & drop'}
              </div>
              <div className="text-xs text-gray-500 mt-1">.csv file only</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </div>
          </div>
        )}

        {importError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">{importError}</div>
            <button onClick={() => setImportError(null)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
          </div>
        )}

        {syncResult && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Jira sync complete</div>
              <div className="text-green-800 mt-0.5">
                {syncResult.created} created, {syncResult.updated} updated, {syncResult.skipped} skipped.
              </div>
            </div>
            <button onClick={() => setSyncResult(null)} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
          </div>
        )}

        {importResult && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{importResult.title} complete</div>
              <div className="text-green-800 mt-0.5">
                {importResult.data.created} created, {importResult.data.skipped} skipped
                {importResult.data.entitiesProcessed != null && ` across ${importResult.data.entitiesProcessed} entities`}.
              </div>
            </div>
            <button onClick={() => setImportResult(null)} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Status summary cards */}
        <div className="grid grid-cols-5 gap-4">
          {(['pending', 'submitted', 'overdue', 'completed', 'not_applicable'] as ComplianceStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  statusFilter === s ? 'ring-2 ring-indigo-500 border-indigo-300' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{cfg.label}</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{counts[s]}</div>
              </button>
            );
          })}
        </div>

        {/* Urgency filter pills */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 text-xs font-medium">Urgency:</span>
          {[
            { key: 'all' as const, label: 'All upcoming' },
            { key: 'overdue' as const, label: `Overdue (${urgencyCounts.overdue})`, color: 'red' },
            { key: '14d' as const, label: `≤14 days (${urgencyCounts.within14})`, color: 'orange' },
            { key: '30d' as const, label: `≤30 days`, color: 'amber' },
            { key: '90d' as const, label: `≤90 days`, color: 'yellow' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setUrgencyFilter(urgencyFilter === key ? 'all' : key)}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                urgencyFilter === key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded px-3 py-1.5 bg-white"
            >
              <option value="all">All entities</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 ml-auto">
              {filtered.length} obligation{filtered.length === 1 ? '' : 's'}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('entity')}>
                  Entity <SortIcon k="entity" />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('requirementType')}>
                  Requirement <SortIcon k="requirementType" />
                </th>
                <th className="px-4 py-3">Regulator</th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('dueDate')}>
                  Due Date <SortIcon k="dueDate" />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleSort('daysRemaining')}>
                  Countdown <SortIcon k="daysRemaining" />
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">DRI / Owner</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No compliance obligations match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map(o => {
                  const entity = entityMap.get(o.entityId);
                  const cfg = STATUS_CONFIG[o.status];
                  const expanded = expandedId === o.id;
                  const isUrgent = o.daysRemaining < 0 || (o.daysRemaining <= 14 && o.status !== 'completed' && o.status !== 'not_applicable');
                  const jiraKey = extractJiraKey(o.description);
                  const cleanedDesc = cleanDescription(o.description);
                  const { compliance: compDri, finance: finDri } = parseDris(o.notes);

                  return (
                    <Fragment key={o.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : o.id)}
                        className={`cursor-pointer transition-colors ${
                          isUrgent ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'
                        } ${expanded ? 'bg-indigo-50/30' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">
                              {entity
                                ? entity.country === 'Unknown'
                                  ? <Globe className="w-4 h-4 text-gray-400" />
                                  : getFlagEmoji(entity.country)
                                : null}
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{entity?.name ?? o.entityId}</div>
                              {(o as any).recurrence && (o as any).recurrence !== 'none' && (
                                <div className="text-xs text-gray-400">{RECURRENCE_LABEL[(o as any).recurrence] ?? (o as any).recurrence}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2 flex-wrap">
                            <div className="font-medium text-gray-900 leading-snug">{o.requirementType}</div>
                            {jiraKey && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-500 border border-blue-100 whitespace-nowrap mt-0.5">
                                {jiraKey}
                              </span>
                            )}
                          </div>
                          {cleanedDesc && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{cleanedDesc}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cleanRegulator(o.regulator)}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{formatDate(o.dueDate)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <DaysRemainingBadge dueDate={o.dueDate} status={o.status} />
                          <UrgencyBar days={o.daysRemaining} status={o.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DriCell notes={o.notes} owner={o.owner} />
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {o.status === 'completed' ? (
                            <button
                              onClick={() => updateStatus(o.id, 'pending')}
                              disabled={updatingId === o.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus(o.id, 'completed')}
                              disabled={updatingId === o.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {updatingId === o.id ? 'Saving…' : 'Mark Done'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-indigo-50/20">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-4 gap-6 text-sm">
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Jurisdiction / Frequency</div>
                                <div className="text-gray-700">
                                  {cleanedDesc || '—'}
                                  {(o as any).recurrence && (o as any).recurrence !== 'none' && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200">
                                      {RECURRENCE_LABEL[(o as any).recurrence]}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Responsible</div>
                                {(compDri || finDri) ? (
                                  <div className="space-y-2">
                                    {compDri && (
                                      <div className="flex items-start gap-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 font-medium whitespace-nowrap mt-0.5">
                                          <User className="w-2.5 h-2.5" />
                                          Compliance
                                        </span>
                                        <span className="text-xs text-gray-700 leading-snug">{compDri}</span>
                                      </div>
                                    )}
                                    {finDri && (
                                      <div className="flex items-start gap-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 font-medium whitespace-nowrap mt-0.5">
                                          <Users className="w-2.5 h-2.5" />
                                          Finance
                                        </span>
                                        <span className="text-xs text-gray-700 leading-snug">{finDri}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-700">{o.owner || '—'}</div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Jira Reference</div>
                                <div className="text-gray-700">
                                  {jiraKey ? (
                                    <a
                                      href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? 'https://your-org.atlassian.net'}/browse/${jiraKey}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-mono text-xs"
                                    >
                                      {jiraKey}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Filing Reference</div>
                                <div className="text-gray-700">{(o as any).filingReference || '—'}</div>
                              </div>
                              {(o.status === 'completed' || o.status === 'submitted') && (
                                <>
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submitted Date</div>
                                    <div className="text-gray-700">{(o as any).submittedDate ? formatDate((o as any).submittedDate) : '—'}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Confirmed By</div>
                                    <div className="text-gray-700">{(o as any).confirmedBy || '—'}</div>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              {o.status !== 'completed' && o.status !== 'not_applicable' && (
                                <>
                                  <button
                                    onClick={() => updateStatus(o.id, 'submitted')}
                                    disabled={updatingId === o.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                                  >
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                    Mark Submitted
                                  </button>
                                  <button
                                    onClick={() => updateStatus(o.id, 'not_applicable')}
                                    disabled={updatingId === o.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Mark N/A
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
