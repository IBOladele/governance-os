'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, AlertCircle, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShareholderType = 'founding' | 'nominee' | 'investor' | 'corporate' | 'individual';
type LoanStatus = 'active' | 'repaid' | 'converted' | 'written_off';

interface OwnerEntity { id: string; name: string; }

interface Loan {
  id: string;
  principal: number;
  currency: string;
  interestRate: number | null;
  issueDate: string;
  maturityDate: string | null;
  isConvertible: boolean;
  conversionTerms: string | null;
  status: LoanStatus;
  notes: string | null;
}

interface Shareholder {
  id: string;
  name: string;
  email: string | null;
  shareholderType: ShareholderType;
  shareClass: string;
  sharesHeld: number;
  totalShares: number;
  percentageOwned: number;
  entityOwnerId: string | null;
  ownerEntity: OwnerEntity | null;
  isActive: boolean;
  appointmentDate: string | null;
  notes: string | null;
  loans: Loan[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ShareholderType, string> = {
  founding:   'Founding',
  nominee:    'Nominee',
  investor:   'Investor',
  corporate:  'Corporate',
  individual: 'Individual',
};

const TYPE_COLORS: Record<ShareholderType, string> = {
  founding:   'bg-indigo-100 text-indigo-700',
  nominee:    'bg-amber-100 text-amber-700',
  investor:   'bg-green-100 text-green-700',
  corporate:  'bg-blue-100 text-blue-700',
  individual: 'bg-gray-100 text-gray-700',
};

const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  active:      'bg-green-100 text-green-700',
  repaid:      'bg-gray-100 text-gray-600',
  converted:   'bg-indigo-100 text-indigo-700',
  written_off: 'bg-red-100 text-red-700',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function fmtCcy(n: number, ccy: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
}

// ─── Shareholder Modal ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', email: '', shareholderType: 'founding' as ShareholderType,
  shareClass: 'Ordinary', sharesHeld: '', totalShares: '', percentageOwned: '',
  entityOwnerId: '', isActive: true, appointmentDate: '', notes: '',
};

function ShareholderModal({
  entityId, entities, existing, onClose, onSaved,
}: {
  entityId: string;
  entities: { id: string; name: string }[];
  existing: Shareholder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(existing ? {
    name: existing.name, email: existing.email ?? '', shareholderType: existing.shareholderType,
    shareClass: existing.shareClass, sharesHeld: String(existing.sharesHeld || ''),
    totalShares: String(existing.totalShares || ''), percentageOwned: String(existing.percentageOwned || ''),
    entityOwnerId: existing.entityOwnerId ?? '', isActive: existing.isActive,
    appointmentDate: existing.appointmentDate ? existing.appointmentDate.split('T')[0] : '',
    notes: existing.notes ?? '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = existing
        ? `/api/shareholders/${existing.id}`
        : `/api/entities/${entityId}/shareholders`;
      const method = existing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{existing ? 'Edit Shareholder' : 'Add Shareholder'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <input required value={form.name} onChange={set('name')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select required value={form.shareholderType} onChange={set('shareholderType')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Share Class</label>
              <input value={form.shareClass} onChange={set('shareClass')} placeholder="Ordinary"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shares Held</label>
              <input type="number" min="0" value={form.sharesHeld} onChange={set('sharesHeld')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Issued Shares</label>
              <input type="number" min="0" value={form.totalShares} onChange={set('totalShares')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                % Owned <span className="text-gray-400 font-normal">(auto-derived if shares entered, or enter directly)</span>
              </label>
              <input type="number" min="0" max="100" step="0.0001" value={form.percentageOwned} onChange={set('percentageOwned')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {form.shareholderType === 'corporate' && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Linked Entity (if in system)</label>
                <select value={form.entityOwnerId} onChange={set('entityOwnerId')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— None —</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Appointment Date</label>
              <input type="date" value={form.appointmentDate} onChange={set('appointmentDate')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={set('notes')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="sh-active" checked={form.isActive}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="rounded" />
              <label htmlFor="sh-active" className="text-sm text-gray-700">Active shareholder</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Shareholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Loan Modal ───────────────────────────────────────────────────────────────

const EMPTY_LOAN = {
  principal: '', currency: 'USD', interestRate: '', issueDate: '',
  maturityDate: '', isConvertible: false, conversionTerms: '', status: 'active', notes: '',
};

function LoanModal({
  shareholder, existing, onClose, onSaved,
}: {
  shareholder: Shareholder;
  existing: Loan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(existing ? {
    principal: String(existing.principal), currency: existing.currency,
    interestRate: existing.interestRate != null ? String(existing.interestRate) : '',
    issueDate: existing.issueDate.split('T')[0],
    maturityDate: existing.maturityDate ? existing.maturityDate.split('T')[0] : '',
    isConvertible: existing.isConvertible, conversionTerms: existing.conversionTerms ?? '',
    status: existing.status, notes: existing.notes ?? '',
  } : EMPTY_LOAN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const url = existing
        ? `/api/shareholders/loans/${existing.id}`
        : `/api/shareholders/${shareholder.id}/loans`;
      const method = existing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {existing ? 'Edit Shareholder Loan' : 'Add Shareholder Loan'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Lender: {shareholder.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Principal *</label>
              <input required type="number" min="0" step="0.01" value={form.principal} onChange={set('principal')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <input value={form.currency} onChange={set('currency')} placeholder="USD"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate % <span className="text-gray-400">(blank = interest-free)</span></label>
              <input type="number" min="0" step="0.01" value={form.interestRate} onChange={set('interestRate')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="active">Active</option>
                <option value="repaid">Repaid</option>
                <option value="converted">Converted to Equity</option>
                <option value="written_off">Written Off</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date *</label>
              <input required type="date" value={form.issueDate} onChange={set('issueDate')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Maturity Date <span className="text-gray-400">(blank = on-demand)</span></label>
              <input type="date" value={form.maturityDate} onChange={set('maturityDate')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="loan-conv" checked={form.isConvertible}
                onChange={e => setForm(p => ({ ...p, isConvertible: e.target.checked }))}
                className="rounded" />
              <label htmlFor="loan-conv" className="text-sm text-gray-700">Convertible to equity</label>
            </div>
            {form.isConvertible && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Conversion Terms</label>
                <textarea rows={2} value={form.conversionTerms} onChange={set('conversionTerms')}
                  placeholder="e.g. Converts at Series A at 20% discount to round price"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={set('notes')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function ShareholdersTab({
  entityId,
  entities,
}: {
  entityId: string;
  entities: { id: string; name: string }[];
}) {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modalSh, setModalSh]           = useState<Shareholder | 'new' | null>(null);
  const [loanModal, setLoanModal]       = useState<{ sh: Shareholder; loan: Loan | null } | null>(null);
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/entities/${entityId}/shareholders`);
    if (res.ok) setShareholders(await res.json());
    setLoading(false);
  }, [entityId]);

  useEffect(() => { load(); }, [load]);

  const deleteShareholder = async (id: string) => {
    if (!confirm('Remove this shareholder? Their loan records will also be deleted.')) return;
    await fetch(`/api/shareholders/${id}`, { method: 'DELETE' });
    load();
  };

  const deleteLoan = async (id: string) => {
    if (!confirm('Delete this loan record?')) return;
    await fetch(`/api/shareholders/loans/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const totalPct = shareholders.filter(s => s.isActive).reduce((sum, s) => sum + s.percentageOwned, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Share Register</h3>
          {shareholders.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {shareholders.filter(s => s.isActive).length} active shareholder{shareholders.filter(s => s.isActive).length !== 1 ? 's' : ''} ·{' '}
              <span className={totalPct > 100.01 ? 'text-red-600 font-medium' : totalPct < 99.9 && shareholders.length > 0 ? 'text-amber-600' : 'text-gray-400'}>
                {totalPct.toFixed(2)}% accounted for
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => setModalSh('new')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Shareholder
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
      ) : shareholders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No shareholders recorded yet.</p>
          <p className="text-xs mt-1">Add founding shareholders, nominee holders, or investors.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shareholders.map(sh => (
            <div key={sh.id} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Shareholder row */}
              <div className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{sh.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[sh.shareholderType]}`}>
                      {TYPE_LABELS[sh.shareholderType]}
                    </span>
                    {!sh.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                    )}
                    {sh.ownerEntity && (
                      <span className="text-xs text-indigo-600">→ {sh.ownerEntity.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sh.shareClass}
                    {sh.sharesHeld > 0 && ` · ${fmt(sh.sharesHeld)} of ${fmt(sh.totalShares)} shares`}
                    {sh.email && ` · ${sh.email}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">{sh.percentageOwned.toFixed(2)}%</p>
                  {sh.loans.length > 0 && (
                    <p className="text-xs text-amber-600 font-medium">{sh.loans.length} loan{sh.loans.length > 1 ? 's' : ''}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setLoanModal({ sh, loan: null })}
                    title="Add loan"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                    <DollarSign className="w-4 h-4" />
                  </button>
                  <button onClick={() => setModalSh(sh)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteShareholder(sh.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {sh.loans.length > 0 && (
                    <button onClick={() => toggleExpand(sh.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-1">
                      {expanded[sh.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Loans sub-table */}
              {expanded[sh.id] && sh.loans.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Shareholder Loans</p>
                  {sh.loans.map(loan => (
                    <div key={loan.id} className="flex items-center gap-4 bg-white rounded-lg px-4 py-3 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {fmtCcy(loan.principal, loan.currency)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LOAN_STATUS_COLORS[loan.status]}`}>
                            {loan.status.replace('_', ' ')}
                          </span>
                          {loan.isConvertible && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Convertible</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {loan.interestRate != null ? `${loan.interestRate}% p.a.` : 'Interest-free'}
                          {' · Issued '}
                          {new Date(loan.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {loan.maturityDate
                            ? ` · Due ${new Date(loan.maturityDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : ' · On-demand'}
                        </p>
                        {loan.conversionTerms && (
                          <p className="text-xs text-purple-600 mt-0.5 truncate">{loan.conversionTerms}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setLoanModal({ sh, loan })}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteLoan(loan.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modalSh && (
        <ShareholderModal
          entityId={entityId}
          entities={entities}
          existing={modalSh === 'new' ? null : modalSh}
          onClose={() => setModalSh(null)}
          onSaved={() => { setModalSh(null); load(); }}
        />
      )}
      {loanModal && (
        <LoanModal
          shareholder={loanModal.sh}
          existing={loanModal.loan}
          onClose={() => setLoanModal(null)}
          onSaved={() => { setLoanModal(null); load(); }}
        />
      )}
    </div>
  );
}
