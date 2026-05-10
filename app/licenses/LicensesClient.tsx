'use client';

import { useState, useMemo } from 'react';
import { Shield, AlertTriangle, Plus, Clock, X, CheckCircle2 } from 'lucide-react';
import { formatDate, getStatusColor, getFlagEmoji, daysUntil } from '@/lib/utils';
import type { License, Entity } from '@/lib/db/schema';

// ─── DaysChip ─────────────────────────────────────────────────────────────────

function DaysChip({ days }: { days: number }) {
  if (days < 0)
    return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expired {Math.abs(days)}d ago</span>;
  if (days <= 30)
    return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">⚠ {days}d remaining</span>;
  if (days <= 180)
    return <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{days}d remaining</span>;
  return <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{days}d remaining</span>;
}

// ─── Add License Modal ────────────────────────────────────────────────────────

interface AddLicenseModalProps {
  entities: Entity[];
  onClose: () => void;
  onSaved: (license: License) => void;
}

function AddLicenseModal({ entities, onClose, onSaved }: AddLicenseModalProps) {
  const [form, setForm] = useState({
    entityId: '',
    licenseType: '',
    regulator: '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
    status: 'active' as License['status'],
    renewalRequired: true,
    renewalLeadDays: 90,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: form.entityId,
          licenseType: form.licenseType,
          regulator: form.regulator,
          licenseNumber: form.licenseNumber,
          issueDate: form.issueDate,
          expiryDate: form.expiryDate,
          status: form.status,
          renewalRequired: form.renewalRequired,
          renewalLeadDays: Number(form.renewalLeadDays),
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to create license');
        return;
      }
      setSaved(true);
      setTimeout(() => {
        onSaved(json.data);
        onClose();
      }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create license');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add License</h2>
            <p className="text-sm text-gray-500">Register a new regulatory license</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-green-800">License added</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              {/* Entity */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity <span className="text-red-500">*</span>
                </label>
                <select value={form.entityId} onChange={set('entityId')} required className={inputCls}>
                  <option value="">Select entity…</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* License Type */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Type <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.licenseType}
                  onChange={set('licenseType')}
                  required
                  placeholder="e.g. Payment Institution License"
                  className={inputCls}
                />
              </div>

              {/* Regulator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regulator <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.regulator}
                  onChange={set('regulator')}
                  required
                  placeholder="e.g. FCA"
                  className={inputCls}
                />
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.licenseNumber}
                  onChange={set('licenseNumber')}
                  required
                  placeholder="e.g. FCA-123456"
                  className={inputCls}
                />
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={set('issueDate')}
                  required
                  className={inputCls}
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={set('expiryDate')}
                  required
                  className={inputCls}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  <option value="active">active</option>
                  <option value="expired">expired</option>
                  <option value="suspended">suspended</option>
                  <option value="pending_renewal">pending_renewal</option>
                </select>
              </div>

              {/* Renewal Lead Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Lead Days</label>
                <input
                  type="number"
                  value={form.renewalLeadDays}
                  onChange={set('renewalLeadDays')}
                  min={0}
                  className={inputCls}
                />
              </div>

              {/* Renewal Required */}
              <div className="col-span-2 flex items-center gap-2">
                <input
                  id="renewalRequired"
                  type="checkbox"
                  checked={form.renewalRequired}
                  onChange={e => setForm(p => ({ ...p, renewalRequired: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <label htmlFor="renewalRequired" className="text-sm font-medium text-gray-700">
                  Renewal Required
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                placeholder="Optional context or notes"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <><Shield className="w-3.5 h-3.5" /> Add License</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface Props {
  initialLicenses: License[];
  entities: Entity[];
}

export default function LicensesClient({ initialLicenses, entities }: Props) {
  const [licenses, setLicenses] = useState<License[]>(initialLicenses);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);

  // ── derived: filtered list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return licenses.filter(lic => {
      if (filterEntity && lic.entityId !== filterEntity) return false;
      if (filterStatus && lic.status !== filterStatus) return false;
      return true;
    });
  }, [licenses, filterEntity, filterStatus]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate)),
    [filtered],
  );

  // ── derived: summary cards (always based on all licenses) ─────────────────
  const expired = useMemo(() => licenses.filter(l => l.status === 'expired'), [licenses]);
  const criticalExpiring = useMemo(
    () => licenses.filter(l => l.status === 'active' && daysUntil(l.expiryDate) <= 60),
    [licenses],
  );
  const warningExpiring = useMemo(
    () =>
      licenses.filter(
        l => l.status === 'active' && daysUntil(l.expiryDate) > 60 && daysUntil(l.expiryDate) <= 180,
      ),
    [licenses],
  );
  const healthy = useMemo(
    () => licenses.filter(l => l.status === 'active' && daysUntil(l.expiryDate) > 180),
    [licenses],
  );

  function onLicenseSaved(license: License) {
    setLicenses(prev => [license, ...prev]);
  }

  return (
    <>
      {showModal && (
        <AddLicenseModal
          entities={entities}
          onClose={() => setShowModal(false)}
          onSaved={onLicenseSaved}
        />
      )}

      <div className="px-8 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Expired', value: expired.length, color: 'bg-red-500', urgent: expired.length > 0 },
            { label: 'Expiring in <60 days', value: criticalExpiring.length, color: 'bg-orange-500', urgent: criticalExpiring.length > 0 },
            { label: 'Expiring in 60–180 days', value: warningExpiring.length, color: 'bg-yellow-500', urgent: false },
            { label: 'Healthy (>180 days)', value: healthy.length, color: 'bg-green-500', urgent: false },
          ].map(s => (
            <div
              key={s.label}
              className={`rounded-xl border p-4 flex items-center gap-3 ${s.urgent ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}
            >
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                {s.value}
              </div>
              <p className="text-xs font-medium text-gray-700 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="">All entities</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="expired">expired</option>
            <option value="suspended">suspended</option>
            <option value="pending_renewal">pending_renewal</option>
          </select>

          {(filterEntity || filterStatus) && (
            <button
              onClick={() => { setFilterEntity(''); setFilterStatus(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}

          <div className="ml-auto">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add License
            </button>
          </div>
        </div>

        {/* License table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium">License</th>
                <th className="text-left px-6 py-3 font-medium">Entity</th>
                <th className="text-left px-6 py-3 font-medium">Regulator</th>
                <th className="text-left px-6 py-3 font-medium">License No.</th>
                <th className="text-left px-6 py-3 font-medium">Issue Date</th>
                <th className="text-left px-6 py-3 font-medium">Expiry</th>
                <th className="text-left px-6 py-3 font-medium">Time Left</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No licenses match the selected filters
                  </td>
                </tr>
              ) : (
                sortedFiltered.map(lic => {
                  const entity = entities.find(e => e.id === lic.entityId);
                  const days = daysUntil(lic.expiryDate);
                  const isUrgent = days < 60;
                  return (
                    <tr
                      key={lic.id}
                      className={`hover:bg-gray-50 transition-colors ${isUrgent ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {isUrgent && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-900">{lic.licenseType}</p>
                            {lic.notes && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{lic.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>{getFlagEmoji(entity?.country ?? '')}</span>
                          <span className="text-xs text-gray-700">{entity?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{lic.regulator}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-600">{lic.licenseNumber}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{formatDate(lic.issueDate)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`font-medium text-sm ${days < 0 ? 'text-red-600' : days < 60 ? 'text-orange-600' : 'text-gray-700'}`}
                        >
                          {formatDate(lic.expiryDate)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <DaysChip days={days} />
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(lic.status)}`}
                        >
                          {lic.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Renewal Timeline */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Renewal Timeline — Next 12 Months
          </h3>
          <div className="relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100" />
            <div className="flex items-start gap-4 overflow-x-auto pb-2">
              {sortedFiltered
                .filter(l => daysUntil(l.expiryDate) <= 365)
                .map(lic => {
                  const entity = entities.find(e => e.id === lic.entityId);
                  const days = daysUntil(lic.expiryDate);
                  const dotColor =
                    days < 0
                      ? 'bg-red-500'
                      : days < 60
                        ? 'bg-orange-500'
                        : days < 180
                          ? 'bg-yellow-500'
                          : 'bg-green-500';
                  return (
                    <div key={lic.id} className="flex flex-col items-center gap-2 min-w-[120px]">
                      <div className={`w-4 h-4 rounded-full border-2 border-white shadow ${dotColor} z-10`} />
                      <div className="text-center mt-1">
                        <p className="text-xs font-semibold text-gray-700">{entity?.country}</p>
                        <p className="text-xs text-gray-500 leading-tight">
                          {lic.licenseType.split('(')[0].trim()}
                        </p>
                        <p
                          className={`text-xs font-medium mt-0.5 ${days < 0 ? 'text-red-600' : days < 60 ? 'text-orange-600' : 'text-gray-500'}`}
                        >
                          {days < 0 ? 'Expired' : formatDate(lic.expiryDate)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {sortedFiltered.filter(l => daysUntil(l.expiryDate) <= 365).length === 0 && (
                <p className="text-sm text-gray-400 py-4">No licenses expiring in the next 12 months</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
