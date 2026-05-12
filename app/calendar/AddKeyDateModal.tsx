'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'filing',     label: '📋 Filing' },
  { value: 'regulatory', label: '🏛️ Regulatory' },
  { value: 'corporate',  label: '🏢 Corporate' },
  { value: 'financial',  label: '💰 Financial' },
  { value: 'other',      label: '📌 Other' },
];

const RECURRENCES = [
  { value: '',          label: 'One-off (no recurrence)' },
  { value: 'annual',    label: 'Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly',   label: 'Monthly' },
];

interface Entity { id: string; name: string; country: string; }

interface Props {
  entities: Entity[];
  existing?: {
    id: string; title: string; date: string; category: string;
    description: string | null; recurrence: string | null;
    status: string; notes: string | null; entityId: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = {
  title: '', date: '', category: 'filing', description: '',
  recurrence: '', status: 'pending', notes: '', entityId: '',
};

export default function AddKeyDateModal({ entities, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState(existing ? {
    title:       existing.title,
    date:        existing.date.split('T')[0],
    category:    existing.category,
    description: existing.description ?? '',
    recurrence:  existing.recurrence  ?? '',
    status:      existing.status,
    notes:       existing.notes       ?? '',
    entityId:    existing.entityId    ?? '',
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true); setError('');
    try {
      const url    = existing ? `/api/key-dates/${existing.id}` : '/api/key-dates';
      const method = existing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, entityId: form.entityId || null, recurrence: form.recurrence || null }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed to save'); }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{existing ? 'Edit Key Date' : 'Add Key Date'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Filing deadlines, AGMs, regulatory windows, and more</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input required value={form.title} onChange={set('title')}
              placeholder="e.g. Annual Corporation Tax Filing, AGM, VAT Return"
              className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input required type="date" value={form.date} onChange={set('date')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={set('category')} className={inp}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Recurrence</label>
              <select value={form.recurrence} onChange={set('recurrence')} className={inp}>
                {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className={inp}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entity <span className="text-gray-400 font-normal">(optional — leave blank for group-wide)</span></label>
            <select value={form.entityId} onChange={set('entityId')} className={inp}>
              <option value="">— Group-wide / not entity-specific —</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.country})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={set('description')}
              placeholder="e.g. HMRC Corporation Tax CT600 form due 12 months after year end"
              className={`${inp} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={set('notes')}
              placeholder="Internal notes, responsible person, reference numbers…"
              className={`${inp} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Key Date'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
