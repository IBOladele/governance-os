'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { FormField, Input, Select, Textarea, Button } from '@/components/ui/FormField';
import type { Entity } from '@/lib/db/schema';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (Brazzaville)', 'Congo (DRC)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
  'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'UAE',
  'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];
const LEGAL_STRUCTURES = ['Private Limited Company', 'Proprietary Limited Company', 'Corporation (Delaware)', 'Corporation', 'Limited Liability Company', 'Branch', 'Representative Office'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
}

export default function AddEntityModal({ isOpen, onClose, entities }: Props) {
  const [form, setForm] = useState({
    name: '', country: '', legalStructure: '', registrationNumber: '',
    incorporationDate: '', financialYearEnd: '', auditor: '',
    parentEntityId: '', regulator: '', status: 'active', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to register entity');
        return;
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        setForm({ name: '', country: '', legalStructure: '', registrationNumber: '', incorporationDate: '', financialYearEnd: '', auditor: '', parentEntityId: '', regulator: '', status: 'active', notes: '' });
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to register entity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Entity" subtitle="Add a new legal entity to the registry" size="lg">
      {saved ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
          <p className="font-semibold text-green-800">Entity registered successfully</p>
          <p className="text-sm text-gray-400">Closing...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Entity Name" required className="col-span-2">
              <Input placeholder="e.g. Acme Financial Ltd" value={form.name} onChange={set('name')} required />
            </FormField>

            <FormField label="Country" required>
              <Select value={form.country} onChange={set('country')} required placeholder="Select country"
                options={COUNTRIES.map(c => ({ value: c, label: c }))} />
            </FormField>

            <FormField label="Legal Structure" required>
              <Select value={form.legalStructure} onChange={set('legalStructure')} required placeholder="Select structure"
                options={LEGAL_STRUCTURES.map(l => ({ value: l, label: l }))} />
            </FormField>

            <FormField label="Registration Number" required>
              <Input placeholder="e.g. 12345678" value={form.registrationNumber} onChange={set('registrationNumber')} required />
            </FormField>

            <FormField label="Incorporation Date" required>
              <Input type="date" value={form.incorporationDate} onChange={set('incorporationDate')} required />
            </FormField>

            <FormField label="Regulator" required>
              <Input placeholder="e.g. FCA, MAS, FinCEN" value={form.regulator} onChange={set('regulator')} required />
            </FormField>

            <FormField label="Auditor">
              <Input placeholder="e.g. Ernst & Young LLP" value={form.auditor} onChange={set('auditor')} />
            </FormField>

            <FormField label="Financial Year End">
              <Select value={form.financialYearEnd} onChange={set('financialYearEnd')} placeholder="Select month"
                options={MONTHS.map(m => ({ value: m, label: m }))} />
            </FormField>

            <FormField label="Parent Entity">
              <Select value={form.parentEntityId} onChange={set('parentEntityId')} placeholder="— None (HoldCo) —"
                options={entities.map(e => ({ value: e.id, label: e.name }))} />
            </FormField>

            <FormField label="Status">
              <Select value={form.status} onChange={set('status')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'in_formation', label: 'In Formation' },
                  { value: 'dormant', label: 'Dormant' },
                  { value: 'dissolved', label: 'Dissolved' },
                ]} />
            </FormField>

            <FormField label="Notes" className="col-span-2">
              <Textarea placeholder="Any additional notes about this entity..." value={form.notes} onChange={set('notes')} />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Register Entity</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
