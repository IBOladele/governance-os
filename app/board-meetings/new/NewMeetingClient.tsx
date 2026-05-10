'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Calendar, Clock, MapPin, Video, Building2,
  Users, ChevronDown, CheckCircle2, AlertCircle,
} from 'lucide-react';
import type { Entity, Director, BoardMeeting, MeetingAttendee } from '@/lib/db/schema';

const MEETING_TYPES = [
  'Board Meeting',
  'Annual General Meeting',
  'Committee Meeting',
  'Shareholder Meeting',
  'Special Resolution',
];

const TIMEZONES = [
  { label: 'Singapore (SGT)',        value: 'Asia/Singapore' },
  { label: 'London (GMT/BST)',       value: 'Europe/London' },
  { label: 'Amsterdam (CET/CEST)',   value: 'Europe/Amsterdam' },
  { label: 'Vilnius (EET/EEST)',     value: 'Europe/Vilnius' },
  { label: 'Malta (CET/CEST)',       value: 'Europe/Malta' },
  { label: 'Mumbai / Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Kuala Lumpur (MYT)',     value: 'Asia/Kuala_Lumpur' },
  { label: 'Tokyo (JST)',            value: 'Asia/Tokyo' },
  { label: 'Hong Kong (HKT)',        value: 'Asia/Hong_Kong' },
  { label: 'Jakarta (WIB)',          value: 'Asia/Jakarta' },
  { label: 'New York (ET)',          value: 'America/New_York' },
  { label: 'São Paulo (BRT)',        value: 'America/Sao_Paulo' },
  { label: 'Toronto (ET)',           value: 'America/Toronto' },
  { label: 'Auckland (NZST)',        value: 'Pacific/Auckland' },
];

const RECURRENCE = [
  { label: 'None (one-time)',  value: 'none' },
  { label: 'Quarterly',       value: 'quarterly' },
  { label: 'Annual',          value: 'annual' },
];

interface FormData {
  entityId: string;
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  timezone: string;
  locationType: 'physical' | 'virtual' | 'hybrid';
  location: string;
  virtualLink: string;
  chair: string;
  owner: string;
  quorumRequired: number;
  agenda: string;
  recurrence: string;
  invitedDirectors: string[];
  saveDraft: boolean;
}

const DEFAULT_FORM: FormData = {
  entityId: '',
  meetingType: 'Board Meeting',
  meetingDate: '',
  meetingTime: '10:00',
  timezone: 'Asia/Singapore',
  locationType: 'virtual',
  location: '',
  virtualLink: '',
  chair: '',
  owner: 'Alex Chen',
  quorumRequired: 3,
  agenda: '',
  recurrence: 'none',
  invitedDirectors: [],
  saveDraft: false,
};

interface Props {
  entities: Entity[];
  directors: Director[];
  editMeeting?: BoardMeeting | null;
  editAttendees?: MeetingAttendee[];
}

function buildInitialForm(
  editMeeting?: BoardMeeting | null,
  editAttendees?: MeetingAttendee[],
): FormData {
  if (!editMeeting) return DEFAULT_FORM;
  // Extract owner from createdBy field
  const owner = editMeeting.createdBy || 'Alex Chen';
  return {
    entityId: editMeeting.entityId,
    meetingType: editMeeting.meetingType,
    meetingDate: editMeeting.meetingDate,
    meetingTime: editMeeting.meetingTime,
    timezone: editMeeting.timezone,
    locationType: editMeeting.locationType,
    location: editMeeting.location || '',
    virtualLink: editMeeting.virtualLink || '',
    chair: editMeeting.chair,
    owner,
    quorumRequired: editMeeting.quorumRequired,
    agenda: editMeeting.agenda,
    recurrence: editMeeting.recurrence || 'none',
    invitedDirectors: (editAttendees || []).map(a => a.directorId),
    saveDraft: editMeeting.status === 'draft',
  };
}

export default function NewMeetingClient({ entities, directors, editMeeting, editAttendees }: Props) {
  const router = useRouter();
  const isEdit = !!editMeeting;
  const [form, setForm]     = useState<FormData>(() => buildInitialForm(editMeeting, editAttendees));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const entityDirectors = directors.filter(d => d.entityId === form.entityId && d.isActive);
  const selectedEntity = entities.find(e => e.id === form.entityId);

  function toggleDirector(id: string) {
    set('invitedDirectors', form.invitedDirectors.includes(id)
      ? form.invitedDirectors.filter(d => d !== id)
      : [...form.invitedDirectors, id]);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.entityId)    e.entityId    = 'Please select an entity';
    if (!form.meetingDate) e.meetingDate = 'Please select a date';
    if (!form.chair)       e.chair       = 'Chair is required';
    if (!form.agenda)      e.agenda      = 'Agenda is required';
    if (!form.location && form.locationType !== 'virtual') e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(asDraft = false) {
    if (!asDraft && !validate()) return;
    setSaving(true);
    try {
      const payload = {
        entityId:         form.entityId,
        meetingType:      form.meetingType,
        meetingDate:      form.meetingDate,
        meetingTime:      form.meetingTime,
        timezone:         form.timezone,
        locationType:     form.locationType,
        location:         form.location || null,
        virtualLink:      form.virtualLink || null,
        chair:            form.chair,
        quorumRequired:   form.quorumRequired,
        agenda:           form.agenda,
        recurrence:       form.recurrence,
        invitedDirectors: form.invitedDirectors,
        asDraft,
        createdBy:        form.owner || 'Alex Chen',
      };

      let res: Response;
      if (isEdit && editMeeting) {
        res = await fetch(`/api/board-meetings/${editMeeting.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/board-meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to save meeting');
        return;
      }

      setSaved(true);
      setTimeout(() => router.push('/board-meetings'), 600);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">Meeting {isEdit ? 'updated' : (form.saveDraft ? 'saved as draft' : 'scheduled')}!</p>
          <p className="text-slate-400 text-sm mt-1">{isEdit ? 'Your changes have been saved.' : 'Calendar invites will be sent to invited directors.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/board-meetings" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Board Meeting' : 'Schedule Board Meeting'}</h1>
          <p className="text-sm text-slate-500">{isEdit ? 'Update the details for this meeting' : 'Fill in the details to create a new meeting'}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Section 1: Entity & Meeting Type */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Meeting Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Entity <span className="text-red-500">*</span>
              </label>
              <select
                value={form.entityId}
                onChange={e => { set('entityId', e.target.value); set('invitedDirectors', []); }}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  errors.entityId ? 'border-red-300' : 'border-slate-200'
                )}
              >
                <option value="">Select entity…</option>
                {entities.filter(e => e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.country})</option>
                ))}
              </select>
              {errors.entityId && <p className="text-xs text-red-500 mt-1">{errors.entityId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting Type</label>
              <select
                value={form.meetingType}
                onChange={e => set('meetingType', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.meetingDate}
                onChange={e => set('meetingDate', e.target.value)}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  errors.meetingDate ? 'border-red-300' : 'border-slate-200'
                )}
              />
              {errors.meetingDate && <p className="text-xs text-red-500 mt-1">{errors.meetingDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
              <input
                type="time"
                value={form.meetingTime}
                onChange={e => set('meetingTime', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
              <select
                value={form.timezone}
                onChange={e => set('timezone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Recurrence</label>
            <select
              value={form.recurrence}
              onChange={e => set('recurrence', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {RECURRENCE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Location</h2>

          <div className="flex gap-3">
            {(['virtual', 'physical', 'hybrid'] as const).map(lt => (
              <button
                key={lt}
                onClick={() => set('locationType', lt)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize',
                  form.locationType === lt
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {lt === 'virtual' && <Video className="w-4 h-4" />}
                {lt === 'physical' && <Building2 className="w-4 h-4" />}
                {lt === 'hybrid' && <MapPin className="w-4 h-4" />}
                {lt}
              </button>
            ))}
          </div>

          {form.locationType !== 'virtual' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Physical Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. 168 Robinson Road, Singapore 068912"
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  errors.location ? 'border-red-300' : 'border-slate-200'
                )}
              />
              {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
            </div>
          )}

          {(form.locationType === 'virtual' || form.locationType === 'hybrid') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Virtual Meeting Link</label>
              <input
                type="url"
                value={form.virtualLink}
                onChange={e => set('virtualLink', e.target.value)}
                placeholder="https://zoom.us/j/… or https://teams.microsoft.com/…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}
        </div>

        {/* Section 3: Governance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Governance</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Chair <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.chair}
                onChange={e => set('chair', e.target.value)}
                placeholder="e.g. Alex Chen"
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  errors.chair ? 'border-red-300' : 'border-slate-200'
                )}
              />
              {errors.chair && <p className="text-xs text-red-500 mt-1">{errors.chair}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting Owner / DRI</label>
              <input
                type="text"
                value={form.owner}
                onChange={e => set('owner', e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Quorum Required</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.quorumRequired}
                onChange={e => set('quorumRequired', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Agenda <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.agenda}
              onChange={e => set('agenda', e.target.value)}
              rows={4}
              placeholder="e.g. 1. Call to order&#10;2. Review of Q1 financials&#10;3. Compliance update&#10;4. Risk report&#10;5. Any other business"
              className={cn(
                'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none',
                errors.agenda ? 'border-red-300' : 'border-slate-200'
              )}
            />
            {errors.agenda && <p className="text-xs text-red-500 mt-1">{errors.agenda}</p>}
          </div>
        </div>

        {/* Section 4: Invite Directors */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Invite Directors</h2>
            {form.entityId && entityDirectors.length > 0 && (
              <button
                onClick={() => set('invitedDirectors',
                  form.invitedDirectors.length === entityDirectors.length
                    ? [] : entityDirectors.map(d => d.id)
                )}
                className="text-xs text-indigo-600 hover:underline"
              >
                {form.invitedDirectors.length === entityDirectors.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {!form.entityId ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <AlertCircle className="w-4 h-4" />
              Select an entity to see available directors
            </div>
          ) : entityDirectors.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No active directors found for this entity.</p>
          ) : (
            <div className="space-y-2">
              {entityDirectors.map(dir => (
                <label
                  key={dir.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    form.invitedDirectors.includes(dir.id)
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.invitedDirectors.includes(dir.id)}
                    onChange={() => toggleDirector(dir.id)}
                    className="rounded text-indigo-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{dir.name}</p>
                    <p className="text-xs text-slate-500">{dir.role} · {dir.email}</p>
                  </div>
                  {form.invitedDirectors.includes(dir.id) && (
                    <span className="text-xs text-indigo-600 font-medium">Invited</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {form.invitedDirectors.length > 0 && form.invitedDirectors.length < form.quorumRequired && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Only {form.invitedDirectors.length} director{form.invitedDirectors.length > 1 ? 's' : ''} invited — quorum requires {form.quorumRequired}
            </div>
          )}

          {form.invitedDirectors.length >= form.quorumRequired && form.invitedDirectors.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Quorum satisfied ({form.invitedDirectors.length}/{form.quorumRequired} directors invited)
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Link href="/board-meetings" className="text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { set('saveDraft', true); handleSubmit(true); }}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isEdit ? 'Saving…' : 'Scheduling…'}
                </span>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  {isEdit ? 'Save Changes' : 'Schedule Meeting'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
