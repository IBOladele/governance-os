'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { FormField, Input, Select, Button } from '@/components/ui/FormField';
import { getFlagEmoji } from '@/lib/utils';
import type { Entity } from '@/lib/db/schema';

interface Props {
  entity: Entity;
}

const STATUS_OPTIONS = [
  { value: 'active',       label: 'Active' },
  { value: 'dormant',      label: 'Dormant' },
  { value: 'dissolved',    label: 'Dissolved' },
  { value: 'in_formation', label: 'In Formation' },
];

const MONTH_OPTIONS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
].map(m => ({ value: m, label: m }));

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain',
  'Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros',
  'Congo (Brazzaville)','Congo (DRC)','Costa Rica','Croatia','Cuba','Cyprus',
  'Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia',
  'Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia',
  'Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau',
  'Guyana','Haiti','Honduras','Hong Kong','Hungary','Iceland','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan',
  'Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein',
  'Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali',
  'Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia',
  'Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger',
  'Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau',
  'Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines',
  'Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal',
  'Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia',
  'Solomon Islands','Somalia','South Africa','South Korea','South Sudan',
  'Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','UAE',
  'Uganda','Ukraine','United Kingdom','United States','Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

const extractMonth = (fyEnd: string) => {
  const parts = fyEnd.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : fyEnd;
};

const toDateInput = (d: Date | string | null | undefined): string => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
};

export default function EntityEditModal({ entity }: Props) {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const [form, setForm] = useState({
    name:              entity.name,
    formerName:        entity.formerName ?? '',
    country:           entity.country ?? '',
    status:            entity.status,
    registeredAddress: entity.registeredAddress ?? '',
    governingLaw:      entity.governingLaw ?? '',
    auditor:           entity.auditor ?? '',
    regulator:         entity.regulator ?? '',
    regulatorUrl:      entity.regulatorUrl ?? '',
    financialYearEnd:  extractMonth(entity.financialYearEnd ?? ''),
    incorporationDate: toDateInput(entity.incorporationDate),
    legalStructure:    entity.legalStructure ?? '',
    purpose:           entity.purpose ?? '',
  });

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/entities/${entity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              form.name,
          formerName:        form.formerName  || null,
          country:           form.country,
          status:            form.status,
          registeredAddress: form.registeredAddress,
          governingLaw:      form.governingLaw,
          auditor:           form.auditor     || null,
          regulator:         form.regulator   || null,
          regulatorUrl:      form.regulatorUrl || null,
          financialYearEnd:  form.financialYearEnd,
          incorporationDate: form.incorporationDate || null,
          legalStructure:    form.legalStructure,
          purpose:           form.purpose     || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save changes'); return; }
      setSaved(true);
      router.refresh();
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setSaved(false); setError(''); setOpen(true); }}
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
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

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

            {/* Address & Jurisdiction */}
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

                {/* Country of Incorporation with flag */}
                <FormField label="Country of Incorporation" className="col-span-2">
                  <div className="relative">
                    {form.country && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none z-10">
                        {getFlagEmoji(form.country)}
                      </span>
                    )}
                    <select
                      value={form.country}
                      onChange={set('country')}
                      className={`w-full border border-gray-200 rounded-lg py-2 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${form.country ? 'pl-10' : 'pl-3'}`}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{getFlagEmoji(c)} {c}</option>
                      ))}
                    </select>
                  </div>
                </FormField>

                <FormField label="Governing Law">
                  <Input value={form.governingLaw} onChange={set('governingLaw')} placeholder="e.g. England and Wales" />
                </FormField>
                <FormField label="Incorporation Date">
                  <Input type="date" value={form.incorporationDate} onChange={set('incorporationDate')} />
                </FormField>
              </div>
            </div>

            {/* Compliance & Finance */}
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
