'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { formatDate, getStatusColor, getFlagEmoji } from '@/lib/utils';
import { Users, Plus, Calendar, UserCheck, Briefcase, ShieldCheck, Pencil, X, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { FormField, Input, Select, Button } from '@/components/ui/FormField';
import type { Director, Entity, BoardMeeting } from '@/lib/db/schema';

// ── DateSelect ──────────────────────────────────────────────────────────────
// Day / Month / Year dropdowns — much easier to jump to past years than
// the native <input type="date"> calendar widget.
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function DateSelect({
  value,
  onChange,
  required,
  minYear,
  maxYear,
}: {
  value: string;          // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  required?: boolean;
  minYear?: number;
  maxYear?: number;
}) {
  const now = new Date();
  const min = minYear ?? 1970;
  const max = maxYear ?? now.getFullYear() + 10;

  const parts   = value ? value.split('-') : ['', '', ''];
  const selYear = parts[0] ?? '';
  const selMon  = parts[1] ?? '';   // '01'–'12'
  const selDay  = parts[2] ?? '';   // '01'–'31'

  const daysInMonth = selYear && selMon
    ? new Date(Number(selYear), Number(selMon), 0).getDate()
    : 31;

  const emit = (y: string, m: string, d: string) => {
    if (y && m && d) onChange(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    else if (!y && !m && !d) onChange('');
    // partial — don't emit yet
  };

  const sel = 'w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={selDay}
        onChange={e => emit(selYear, selMon, e.target.value)}
        required={required}
        className={sel}
      >
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
        ))}
      </select>
      <select
        value={selMon}
        onChange={e => emit(selYear, e.target.value, selDay)}
        className={sel}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      <select
        value={selYear}
        onChange={e => emit(e.target.value, selMon, selDay)}
        className={sel}
      >
        <option value="">Year</option>
        {Array.from({ length: max - min + 1 }, (_, i) => max - i).map(y => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: 'Director', label: 'Director' },
  { value: 'Director & CEO', label: 'Director & CEO' },
  { value: 'Chief Executive Officer', label: 'Chief Executive Officer (Executive)' },
  { value: 'Managing Director', label: 'Managing Director (Executive)' },
  { value: 'President Director', label: 'President Director' },
  { value: 'Chief Financial Officer', label: 'Chief Financial Officer (Executive)' },
  { value: 'Chief Compliance Officer', label: 'Chief Compliance Officer (Executive)' },
  { value: 'Chief Operating Officer', label: 'Chief Operating Officer (Executive)' },
  { value: 'Chairman', label: 'Chairman' },
  { value: 'Non-Executive Director', label: 'Non-Executive Director' },
  { value: 'Independent Director', label: 'Independent Director' },
  { value: 'Vice President', label: 'Vice President (Senior Employee)' },
  { value: 'Legal Representative', label: 'Legal Representative' },
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Commissioner', label: 'Commissioner' },
  { value: 'Officer', label: 'Officer / Senior Employee' },
];

const ROLE_CATEGORY = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes('independent')) return 'independent';
  if (r.includes('non-executive')) return 'non-executive';
  if (['ceo', 'president', 'cfo', 'coo', 'cmo', 'cto', 'cco', 'chief', 'managing director', 'chairman'].some(k => r.includes(k))) return 'executive';
  return 'employee';
};

const CATEGORY_CONFIG = {
  executive: { label: 'Executive Directors', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', icon: Briefcase },
  'non-executive': { label: 'Non-Executive Directors', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', icon: Users },
  independent: { label: 'Independent Directors', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', icon: ShieldCheck },
  employee: { label: 'Senior Employees / Officers', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', icon: UserCheck },
};

// ISO-style nationality list (common demonyms) - alphabetised
const NATIONALITY_OPTIONS: { value: string; label: string }[] = [
  'American', 'Argentine', 'Australian', 'Austrian', 'Bangladeshi', 'Belgian',
  'Brazilian', 'British', 'Bulgarian', 'Canadian', 'Chilean', 'Chinese',
  'Colombian', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Egyptian', 'Emirati',
  'Estonian', 'Filipino', 'Finnish', 'French', 'German', 'Greek', 'Hong Konger',
  'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Irish', 'Israeli', 'Italian',
  'Japanese', 'Jordanian', 'Kazakh', 'Kenyan', 'Kuwaiti', 'Latvian', 'Lithuanian',
  'Luxembourgish', 'Malaysian', 'Maltese', 'Mexican', 'Moroccan', 'Nepali',
  'New Zealander', 'Nigerian', 'Norwegian', 'Omani', 'Pakistani', 'Peruvian',
  'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Saudi', 'Singaporean',
  'Slovak', 'Slovenian', 'South African', 'South Korean', 'Spanish', 'Sri Lankan',
  'Swedish', 'Swiss', 'Taiwanese', 'Thai', 'Turkish', 'Ukrainian', 'Uruguayan',
  'Venezuelan', 'Vietnamese',
].map(n => ({ value: n, label: n }));

const BLANK_ADD = { name: '', email: '', role: '', entityId: '', nationality: '', appointmentDate: '', termExpiry: '' };

interface Props {
  initialDirectors: Director[];
  entities: Entity[];
  boardMeetings: BoardMeeting[];
}

export default function DirectorsClient({ initialDirectors, entities, boardMeetings }: Props) {
  const router = useRouter();
  const [directorList, setDirectorList] = useState(initialDirectors);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_ADD);
  const [addSaving, setAddSaving] = useState(false);
  const [addSaved, setAddSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDir, setEditDir] = useState<Director | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', nationality: '', appointmentDate: '', termExpiry: '', isActive: true, guideUrl: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (dir: Director) => {
    if (!confirm(`Remove ${dir.name}? This cannot be undone.`)) return;
    setDeletingId(dir.id);
    try {
      const res = await fetch(`/api/directors/${dir.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to delete director');
        return;
      }
      setDirectorList(prev => prev.filter(d => d.id !== dir.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete director');
    } finally {
      setDeletingId(null);
    }
  };

  const setAdd = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddForm(prev => ({ ...prev, [field]: e.target.value }));
  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
  // Direct string setters for DateSelect (no synthetic event needed)
  const setAddDate  = (field: string) => (val: string) => setAddForm(prev => ({ ...prev, [field]: val }));
  const setEditDate = (field: string) => (val: string) => setEditForm(prev => ({ ...prev, [field]: val }));

  const toYMD = (d: string | Date | null | undefined): string =>
    d ? new Date(d).toISOString().slice(0, 10) : '';

  const openEdit = (dir: Director) => {
    setEditDir(dir);
    setEditForm({
      name: dir.name,
      email: dir.email,
      role: dir.role,
      nationality: dir.nationality,
      appointmentDate: toYMD(dir.appointmentDate),
      termExpiry: toYMD(dir.termExpiry),
      isActive: dir.isActive,
      guideUrl: dir.guideUrl ?? '',
    });
    setEditSaved(false);
    setEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    try {
      const res = await fetch('/api/directors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: addForm.entityId,
          name: addForm.name,
          email: addForm.email,
          role: addForm.role,
          nationality: addForm.nationality,
          appointmentDate: addForm.appointmentDate || undefined,
          termExpiry: addForm.termExpiry || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to add director');
        return;
      }
      setDirectorList(prev => [...prev, json.data]);
      setAddSaved(true);
      setTimeout(() => { setAddSaved(false); setAddOpen(false); setAddForm(BLANK_ADD); }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add director');
    } finally {
      setAddSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDir) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/directors/${editDir.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          nationality: editForm.nationality,
          appointmentDate: editForm.appointmentDate || undefined,
          termExpiry: editForm.termExpiry || null,
          isActive: editForm.isActive,
          guideUrl: editForm.guideUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to update director');
        return;
      }
      setDirectorList(prev => prev.map(d => d.id === editDir.id ? json.data : d));
      setEditSaved(true);
      setTimeout(() => { setEditSaved(false); setEditOpen(false); }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update director');
    } finally {
      setEditSaving(false);
    }
  };

  const activeDirectors = directorList.filter(d => d.isActive);
  const byEntity = entities.map(entity => ({
    entity,
    directors: directorList.filter(d => d.entityId === entity.id && d.isActive),
  })).filter(g => g.directors.length > 0);

  return (
    <div>
      <Header
        title="Directors Registry"
        subtitle={`${activeDirectors.length} active directors & officers across ${byEntity.length} entities`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Executive Directors', value: activeDirectors.filter(d => ROLE_CATEGORY(d.role) === 'executive').length, color: 'bg-indigo-500' },
            { label: 'Non-Executive', value: activeDirectors.filter(d => ROLE_CATEGORY(d.role) === 'non-executive').length, color: 'bg-blue-500' },
            { label: 'Independent Directors', value: activeDirectors.filter(d => ROLE_CATEGORY(d.role) === 'independent').length, color: 'bg-green-500' },
            { label: 'Terms Expiring <1yr', value: directorList.filter(d => {
              if (!d.termExpiry) return false;
              const days = Math.ceil((new Date(d.termExpiry).getTime() - Date.now()) / 86400000);
              return days > 0 && days < 365;
            }).length, color: 'bg-yellow-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                {s.value}
              </div>
              <p className="text-sm font-medium text-gray-700 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Directors & Officers by Entity</h2>
          <button onClick={() => { setAddSaved(false); setAddOpen(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Director
          </button>
        </div>

        {/* Directors by entity */}
        <div className="space-y-4">
          {byEntity.map(({ entity, directors: entityDirs }) => {
            const byCategory = {
              executive: entityDirs.filter(d => ROLE_CATEGORY(d.role) === 'executive'),
              'non-executive': entityDirs.filter(d => ROLE_CATEGORY(d.role) === 'non-executive'),
              independent: entityDirs.filter(d => ROLE_CATEGORY(d.role) === 'independent'),
              employee: entityDirs.filter(d => ROLE_CATEGORY(d.role) === 'employee'),
            };
            return (
              <div key={entity.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <span className="text-xl">{getFlagEmoji(entity.country)}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{entity.name}</p>
                    <p className="text-xs text-gray-500">{entity.country} · {(entity.regulator ?? 'N/A').split(' (')[0]}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {Object.entries(byCategory).filter(([, d]) => d.length > 0).map(([cat, d]) => {
                      const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                      return (
                        <span key={cat} className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {d.length} {cfg.label.split(' ')[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {(Object.entries(byCategory) as [keyof typeof CATEGORY_CONFIG, typeof entityDirs][])
                    .filter(([, d]) => d.length > 0)
                    .map(([cat, dirList]) => {
                      const cfg = CATEGORY_CONFIG[cat];
                      return (
                        <div key={cat} className="px-6 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <cfg.icon className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{cfg.label}</p>
                          </div>
                          <div className="space-y-1.5">
                            {dirList.map(dir => {
                              const termDays = dir.termExpiry ? Math.ceil((new Date(dir.termExpiry).getTime() - Date.now()) / 86400000) : null;
                              const termWarning = termDays !== null && termDays < 365 && termDays > 0;
                              const termExpired = termDays !== null && termDays <= 0;
                              return (
                                <div key={dir.id} className="flex items-center gap-3 py-1 group">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    cat === 'independent' ? 'bg-green-100 text-green-700' :
                                    cat === 'executive' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {dir.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{dir.name}</p>
                                    <p className="text-xs text-gray-500">{dir.role} · {dir.nationality}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-gray-400">Appointed {formatDate(dir.appointmentDate)}</p>
                                    {dir.termExpiry && (
                                      <p className={`text-xs font-medium ${termExpired ? 'text-red-600' : termWarning ? 'text-orange-600' : 'text-gray-400'}`}>
                                        {termExpired ? '⚠ Term expired' : termWarning ? `⚠ Term ends ${formatDate(dir.termExpiry)}` : `Until ${formatDate(dir.termExpiry)}`}
                                      </p>
                                    )}
                                  </div>
                                  <a href={`mailto:${dir.email}`} className="text-xs text-indigo-400 hover:text-indigo-600 shrink-0 ml-2 hidden group-hover:block">{dir.email}</a>
                                  {dir.guideUrl && (
                                    <a
                                      href={dir.guideUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Director guide"
                                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 rounded-lg transition-all text-gray-400 hover:text-indigo-600 shrink-0"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => openEdit(dir)}
                                    className="ml-1 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-indigo-600 shrink-0"
                                    title="Edit director"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(dir)}
                                    disabled={deletingId === dir.id}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all text-gray-400 hover:text-red-600 shrink-0 disabled:opacity-50"
                                    title="Delete director"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Board Meetings */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Board Meetings</h2>
            <button
              onClick={() => router.push('/board-meetings')}
              className="ml-auto flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-3 h-3" /> Schedule Meeting
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium">Entity</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Location</th>
                <th className="text-left px-6 py-3 font-medium">Agenda</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {boardMeetings.map(meeting => {
                const entity = entities.find(e => e.id === meeting.entityId);
                return (
                  <tr key={meeting.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <span>{getFlagEmoji(entity?.country ?? '')}</span>
                        <span className="font-medium text-gray-800 text-xs">{entity?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">{meeting.meetingType}</td>
                    <td className="px-6 py-3 font-medium text-gray-800 text-xs">{formatDate(meeting.meetingDate)}</td>
                    <td className="px-6 py-3 text-gray-600 text-xs">{meeting.location}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs max-w-xs truncate">{meeting.agenda}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Director Modal ── */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Director / Officer" subtitle="Register a new director or senior officer">
        {addSaved ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-green-800">Director added successfully</p>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required className="col-span-2">
                <Input placeholder="e.g. Jane Smith" value={addForm.name} onChange={setAdd('name')} required />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" placeholder="jane@governanceos.app" value={addForm.email} onChange={setAdd('email')} required />
              </FormField>
              <FormField label="Nationality">
                <Select value={addForm.nationality} onChange={setAdd('nationality')} placeholder="Select nationality" options={NATIONALITY_OPTIONS} />
              </FormField>
              <FormField label="Role / Title" required className="col-span-2">
                <Select value={addForm.role} onChange={setAdd('role')} required placeholder="Select role" options={ROLE_OPTIONS} />
              </FormField>
              <FormField label="Entity" required className="col-span-2">
                <Select value={addForm.entityId} onChange={setAdd('entityId')} required placeholder="Select entity"
                  options={entities.map(e => ({ value: e.id, label: e.name }))} />
              </FormField>
              <FormField label="Appointment Date" required>
                <DateSelect value={addForm.appointmentDate} onChange={setAddDate('appointmentDate')} required minYear={1990} />
              </FormField>
              <FormField label="Term Expiry" hint="Leave blank for indefinite">
                <DateSelect value={addForm.termExpiry} onChange={setAddDate('termExpiry')} minYear={1990} />
              </FormField>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={addSaving}>Add Director</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Edit Director Modal ── */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Director" subtitle={editDir?.name}>
        {editSaved ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-green-800">Director updated successfully</p>
          </div>
        ) : (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required className="col-span-2">
                <Input placeholder="Full name" value={editForm.name} onChange={setEdit('name')} required />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" placeholder="email@governanceos.app" value={editForm.email} onChange={setEdit('email')} required />
              </FormField>
              <FormField label="Nationality">
                <Select value={editForm.nationality} onChange={setEdit('nationality')} placeholder="Select nationality" options={NATIONALITY_OPTIONS} />
              </FormField>
              <FormField label="Role / Title" required className="col-span-2">
                <Select value={editForm.role} onChange={setEdit('role')} required placeholder="Select role" options={ROLE_OPTIONS} />
              </FormField>
              <FormField label="Appointment Date" required>
                <DateSelect value={editForm.appointmentDate} onChange={setEditDate('appointmentDate')} required minYear={1990} />
              </FormField>
              <FormField label="Term Expiry" hint="Leave blank for indefinite">
                <DateSelect value={editForm.termExpiry} onChange={setEditDate('termExpiry')} minYear={1990} />
              </FormField>
              <FormField label="Status" className="col-span-2">
                <Select
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Resigned / Inactive' }]}
                />
              </FormField>
              <FormField label="Director Guide URL" hint="Link to onboarding guide or D&O materials" className="col-span-2">
                <Input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={editForm.guideUrl}
                  onChange={setEdit('guideUrl')}
                />
              </FormField>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={editSaving}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
