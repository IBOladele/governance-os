'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { FormField, Input, Select, Button } from '@/components/ui/FormField';
import type { Entity } from '@/lib/db/schema';

interface Props {
  entity: Entity;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'dissolved', label: 'Dissolved' },
  { value: 'in_formation', label: 'In Formation' },
];

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map(m => ({ value: m, label: m }));

// Extract just the month name from "31 December" → "December"
const extractMonth = (fyEnd: string) => {
  const parts = fyEnd.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : fyEnd;
};

export default function EntityEditModal({ entity }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: entity.name,
    formerName: entity.formerName ?? '',
    status: entity.status,
    registeredAddress: entity.registeredAddress ?? '',
    governingLaw: entity.governingLaw ?? '',
    auditor: entity.auditor ?? '',
    regulator: entity.regulator ?? '',
    regulatorUrl: entity.regulatorUrl ?? '',
    financialYearEnd: extractMonth(entity.financialYearEnd ?? ''),
    incorporationDate: entity.incorporationDate ?? '',
    legalStructure: entity.legalStructure ?? '',
    purpose: entity.purpose ?? '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/entities/${entity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              form.name,
          formerName:        form.formerName || null,
          status:            form.status,
          registeredAddress: form.registeredAddress,
          governingLaw:      form.governingLaw,
          auditor:           form.auditor,
          regulator:         form.regulator,
          regulatorUrl:      form.regulatorUrl || null,
          financialYearEnd:  form.financialYearEnd,
          incorporationDate: form.incorporationDate || null,
          legalStructure:    form.legalStructure,
          purpose:           form.purpose || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to save changes');
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setSaved(false); setOpen(true); }}
        className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5" /> Edit Entity
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit Entity" subtitle={entity.name} size="lg">
        {saved ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-green-800">Changes saved successfully</p>
            <p className="text-sm text-gray-500">Entity record has been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identity */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identity</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Legal Name" required className="col-span-2">
                  <Input value={form.name} onChange={set('name')} required placeholder="Entity legal name" />
                </FormField>
                <FormField label="Former Name" hint="Previous legal name if applicable">
                  <Input value={form.formerName} onChange={set('formerName')} placeholder="e.g. Acme Former Name Ltd" />
                </FormField>
                <FormField label="Purpose">
                  <Input value={form.purpose} onChange={set('purpose')} placeholder="e.g. payment_institution" />
                </FormField>
                <FormField label="Legal Structure">
                  <Input value={form.legalStructure} onChange={set('legalStructure')} placeholder="e.g. Private Limited Company" />
                </FormField>
                <FormField label="Status">
                  <Select value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
                </FormField>
              </div>
            </div>

            {/* Registered Address */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Address & Jurisdiction</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Registered Address" className="col-span-2">
                  <textarea
                    value={form.registeredAddress}
                    onChange={set('registeredAddress')}
                    rows={2}
                    placeholder="Full registered address"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </FormField>
                <FormField label="Governing Law">
                  <Input value={form.governingLaw} onChange={set('governingLaw')} placeholder="e.g. England and Wales" />
                </FormField>
                <FormField label="Incorporation Date">
                  <Input type="date" value={form.incorporationDate} onChange={set('incorporationDate')} />
                </FormField>
              </div>
            </div>

            {/* Compliance */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Compliance & Finance</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Regulator">
                  <Input value={form.regulator} onChange={set('regulator')} placeholder="e.g. MAS, FCA, ASIC" />
                </FormField>
                <FormField label="Regulator Website URL">
                  <Input value={form.regulatorUrl} onChange={set('regulatorUrl')} placeholder="https://www.mas.gov.sg" />
                </FormField>
                <FormField label="Auditor">
                  <Input value={form.auditor} onChange={set('auditor')} placeholder="e.g. KPMG, Deloitte" />
                </FormField>
                <FormField label="Financial Year End">
                  <Select value={form.financialYearEnd} onChange={set('financialYearEnd')} options={MONTH_OPTIONS} placeholder="Select month" />
                </FormField>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
