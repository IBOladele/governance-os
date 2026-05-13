'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type {
  BoardMeeting, MeetingAttendee, MeetingDocument, MeetingResolution,
  Entity, Director,
} from '@/lib/db/schema';
import { formatDate, cn, getFlagEmoji } from '@/lib/utils';
import {
  ArrowLeft, Calendar, Clock, MapPin, Video, Building2,
  Users, FileText, CheckSquare, MessageSquare, Download,
  CheckCircle2, XCircle, Clock3, Minus,
  ThumbsUp, ThumbsDown, AlertCircle, Edit2, Save, X,
  ClipboardCheck, BadgeCheck, UserCheck, Upload, Plus,
  Eye, Trash2,
} from 'lucide-react';

interface Props {
  id: string;
  boardMeetings: BoardMeeting[];
  meetingAttendees: MeetingAttendee[];
  meetingDocuments: MeetingDocument[];
  meetingResolutions: MeetingResolution[];
  entities: Entity[];
  directors: Director[];
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  completed:  'bg-green-100 text-green-700 border-green-200',
  draft:      'bg-gray-100 text-gray-600 border-gray-200',
  cancelled:  'bg-red-100 text-red-600 border-red-200',
};

const ATTENDEE_ICONS: Record<string, React.ReactNode> = {
  accepted:  <CheckCircle2 className="w-4 h-4 text-green-500" />,
  declined:  <XCircle      className="w-4 h-4 text-red-500" />,
  invited:   <Clock3       className="w-4 h-4 text-amber-500" />,
  tentative: <Minus        className="w-4 h-4 text-slate-400" />,
};

const ATTENDEE_LABELS: Record<string, string> = {
  accepted:  'Accepted',
  declined:  'Declined',
  invited:   'Pending',
  tentative: 'Tentative',
};

const ATTENDEE_COLORS: Record<string, string> = {
  accepted:  'bg-green-50 text-green-700 border-green-200',
  declined:  'bg-red-50 text-red-700 border-red-200',
  invited:   'bg-amber-50 text-amber-700 border-amber-200',
  tentative: 'bg-slate-50 text-slate-600 border-slate-200',
};

const RESOLUTION_COLORS: Record<string, string> = {
  passed:    'bg-green-100 text-green-700',
  defeated:  'bg-red-100 text-red-700',
  deferred:  'bg-amber-100 text-amber-700',
  proposed:  'bg-blue-100 text-blue-700',
};

const DOC_ICONS: Record<string, string> = {
  pdf:  '📄',
  docx: '📝',
  xlsx: '📊',
  pptx: '📊',
};

const CATEGORY_COLORS: Record<string, string> = {
  pack:       'bg-indigo-50 text-indigo-700',
  agenda:     'bg-blue-50 text-blue-700',
  minutes:    'bg-green-50 text-green-700',
  resolution: 'bg-purple-50 text-purple-700',
  other:      'bg-gray-50 text-gray-600',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function generateICS(meeting: BoardMeeting, entityName: string): string {
  const [y, mo, d] = meeting.meetingDate.split('-');
  // Guard against null/missing meetingTime
  const timeStr = meeting.meetingTime ?? '09:00';
  const [h, m] = timeStr.split(':');
  const dtStart = `${y}${mo}${d}T${(h ?? '09').padStart(2,'0')}${(m ?? '00').padStart(2,'0')}00`;
  // Add 2 hours for end time
  const endH = String(Number(h ?? 9) + 2).padStart(2, '0');
  const dtEnd = `${y}${mo}${d}T${endH}${(m ?? '00').padStart(2,'0')}00`;
  // Guard against null timezone and null location
  const tz = meeting.timezone || 'UTC';
  const location = meeting.virtualLink ?? meeting.location ?? '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EntityOS//EN',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@governanceos.app`,
    `DTSTART;TZID=${tz}:${dtStart}`,
    `DTEND;TZID=${tz}:${dtEnd}`,
    `SUMMARY:${meeting.meetingType} — ${entityName}`,
    `DESCRIPTION:Agenda: ${meeting.agenda ?? ''}`,
    location ? `LOCATION:${location}` : 'LOCATION:',
    `ORGANIZER:mailto:admin@governanceos.app`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

type Tab = 'overview' | 'attendees' | 'documents' | 'resolutions';

export default function MeetingDetailClient({
  id,
  boardMeetings,
  meetingAttendees,
  meetingDocuments,
  meetingResolutions,
  entities,
  directors,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [notes, setNotes]         = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savedNotes, setSavedNotes]     = useState(false);

  // Inline agenda editing
  const [editingAgenda, setEditingAgenda] = useState(false);
  const [agendaDraft,   setAgendaDraft]   = useState('');
  const [savingAgenda,  setSavingAgenda]  = useState(false);

  const saveAgenda = async () => {
    setSavingAgenda(true);
    try {
      const res = await fetch(`/api/board-meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenda: agendaDraft }),
      });
      const json = await res.json();
      if (res.ok) {
        setMeetingData(json.data);
        setEditingAgenda(false);
      }
    } finally { setSavingAgenda(false); }
  };

  // Inline minutes editing
  const [minutesOpen,   setMinutesOpen]   = useState(false);
  const [minutesDraft,  setMinutesDraft]  = useState('');
  const [minutesUrlDraft, setMinutesUrlDraft] = useState('');
  const [savingMinutes, setSavingMinutes] = useState(false);

  const openMinutesModal = (mtg: BoardMeeting) => {
    setMinutesDraft(mtg.minutes ?? '');
    setMinutesUrlDraft(mtg.minutesUrl ?? '');
    setMinutesOpen(true);
  };

  const saveMinutes = async () => {
    setSavingMinutes(true);
    try {
      const res = await fetch(`/api/board-meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: minutesDraft, minutesUrl: minutesUrlDraft || null }),
      });
      const json = await res.json();
      if (res.ok) {
        setMeetingData(json.data);
        setMinutesOpen(false);
      }
    } finally { setSavingMinutes(false); }
  };

  // Mark as Held state
  const [heldOpen, setHeldOpen]     = useState(false);
  const [heldStep, setHeldStep]     = useState(1);
  const [heldSaving, setHeldSaving] = useState(false);
  const [heldSaved, setHeldSaved]   = useState(false);
  const [meetingData, setMeetingData] = useState<BoardMeeting | null>(null); // local override after confirming

  const [heldForm, setHeldForm] = useState({
    heldDate:         '',          // filled when modal opens
    quorumConfirmed:  true,
    directorsPresent: 0,           // filled when modal opens
    presentIds:       [] as string[],
    minutesSummary:   '',
    minutesFilename:  '',
    confirmedBy:      'Alex Chen',
  });

  const openHeldModal = (mtg: BoardMeeting) => {
    const invitedDirs = meetingAttendees.filter(a => a.meetingId === mtg.id);
    setHeldForm({
      heldDate:         mtg.meetingDate,
      quorumConfirmed:  true,
      directorsPresent: invitedDirs.filter(a => a.status === 'accepted').length,
      presentIds:       invitedDirs.filter(a => a.status === 'accepted').map(a => a.directorId),
      minutesSummary:   '',
      minutesFilename:  '',
      confirmedBy:      'Alex Chen',
    });
    setHeldStep(1);
    setHeldSaved(false);
    setHeldOpen(true);
  };

  const confirmHeld = async () => {
    setHeldSaving(true);
    try {
      const res = await fetch(`/api/board-meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:           'completed',
          heldAt:           heldForm.heldDate,
          confirmedBy:      heldForm.confirmedBy,
          directorsPresent: heldForm.directorsPresent,
          minutesUrl:       heldForm.minutesFilename || null,
          minutes:          heldForm.minutesSummary || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to confirm meeting');
        return;
      }
      setMeetingData(json.data);
      setHeldSaved(true);
      setTimeout(() => { setHeldSaved(false); setHeldOpen(false); }, 1600);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm meeting');
    } finally {
      setHeldSaving(false);
    }
  };

  // Local doc + resolution state (so uploads/adds persist in session)
  const [localDocs, setLocalDocs]               = useState<MeetingDocument[]>([]);
  const [localResolutions, setLocalResolutions] = useState<MeetingResolution[]>([]);
  const [deletedDocIds, setDeletedDocIds]       = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc]             = useState<MeetingDocument | null>(null);

  // Upload Document modal
  const [docOpen, setDocOpen]         = useState(false);
  const [docSaving, setDocSaving]     = useState(false);
  const [docSaved, setDocSaved]       = useState(false);
  const [docSelectedFile, setDocSelectedFile] = useState<File | null>(null);
  const [docForm, setDocForm]         = useState({
    name: '', category: 'pack', uploadedBy: 'Alex Chen',
  });
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const openDocModal = () => {
    setDocForm({ name: '', category: 'pack', uploadedBy: 'Alex Chen' });
    setDocSelectedFile(null);
    setDocSaved(false);
    setDocOpen(true);
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocSaving(true);
    try {
      let storageUrl: string | null = null;
      let fileType = 'OTHER';
      let fileSize = 0;

      // 1. Upload actual file bytes if a file was chosen
      if (docSelectedFile) {
        const fd = new FormData();
        fd.append('file', docSelectedFile);
        const upRes = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => ({}));
          throw new Error(upErr.error || 'File upload failed');
        }
        const upJson = await upRes.json();
        storageUrl = upJson.url;
        fileType = docSelectedFile.name.split('.').pop()?.toUpperCase() ?? 'OTHER';
        fileSize = Math.round(docSelectedFile.size / 1024);
      }

      // 2. Save document metadata record
      const res = await fetch(`/api/board-meetings/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       docForm.name,
          category:   docForm.category,
          uploadedBy: docForm.uploadedBy,
          fileType,
          fileSize,
          storageUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to add document');
        return;
      }
      setLocalDocs(prev => [...prev, json.data]);
      setDocSaved(true);
      setTimeout(() => { setDocSaved(false); setDocOpen(false); }, 1400);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setDocSaving(false);
    }
  };

  // Add Resolution modal
  const [resOpen, setResOpen]     = useState(false);
  const [resSaving, setResSaving] = useState(false);
  const [resSaved, setResSaved]   = useState(false);
  const [resForm, setResForm]     = useState({
    title: '', description: '', proposedBy: 'Alex Chen',
    votesFor: 0, votesAgainst: 0, votesAbstain: 0,
    status: 'proposed' as MeetingResolution['status'], notes: '',
  });

  const openResModal = () => {
    setResForm({ title: '', description: '', proposedBy: 'Alex Chen', votesFor: 0, votesAgainst: 0, votesAbstain: 0, status: 'proposed', notes: '' });
    setResSaved(false);
    setResOpen(true);
  };

  const handleResAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setResSaving(true);
    try {
      const res = await fetch(`/api/board-meetings/${id}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:        resForm.title,
          description:  resForm.description,
          proposedBy:   resForm.proposedBy,
          votesFor:     resForm.votesFor,
          votesAgainst: resForm.votesAgainst,
          votesAbstain: resForm.votesAbstain,
          status:       resForm.status,
          notes:        resForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to add resolution');
        return;
      }
      setLocalResolutions(prev => [...prev, json.data]);
      setResSaved(true);
      setTimeout(() => { setResSaved(false); setResOpen(false); }, 1400);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add resolution');
    } finally {
      setResSaving(false);
    }
  };

  const rawMeeting = boardMeetings.find(m => m.id === id);

  if (!rawMeeting) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Meeting not found</p>
        <Link href="/board-meetings" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
          ← Back to Board Meetings
        </Link>
      </div>
    );
  }

  // Use local override (after "Mark as Held") or raw seed data
  const currentMeeting = meetingData ?? rawMeeting;
  // Re-alias for brevity — all code below uses `meeting`
  const meeting = currentMeeting;

  const entity      = entities.find(e => e.id === meeting.entityId);
  const attendees   = meetingAttendees.filter(a => a.meetingId === meeting.id);
  const docs        = [...meetingDocuments.filter(d => d.meetingId === meeting.id), ...localDocs]
                        .filter(d => !deletedDocIds.has(d.id));
  const resolutions = [...meetingResolutions.filter(r => r.meetingId === meeting.id), ...localResolutions];

  const directorMap = Object.fromEntries(directors.map(d => [d.id, d]));

  const accepted  = attendees.filter(a => a.status === 'accepted').length;
  const quorumMet = accepted >= meeting.quorumRequired;

  const agendaItems = meeting.agenda.split(/[;,\n]/).map(s => s.trim()).filter(Boolean);

  const downloadICS = () => {
    const content = generateICS(meeting, entity?.name ?? meeting.entityId);
    const blob = new Blob([content], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${meeting.id}-${meeting.meetingDate}.ics`;
    // Must be in the DOM for Firefox/Safari compatibility
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveNotes = async () => {
    try {
      const res = await fetch(`/api/board-meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),  // send the `notes` state the user typed, not the stale server value
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || 'Failed to save notes');
        return;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save notes');
      return;
    }
    setEditingNotes(false);
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  }

  const tabs = [
    { id: 'overview',    label: 'Overview',    icon: Calendar,    count: null },
    { id: 'attendees',   label: 'Attendees',   icon: Users,       count: attendees.length },
    { id: 'documents',   label: 'Documents',   icon: FileText,    count: docs.length },
    { id: 'resolutions', label: 'Resolutions', icon: CheckSquare, count: resolutions.length },
  ] as const;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/board-meetings" className="text-slate-400 hover:text-slate-600 transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{getFlagEmoji(entity?.country ?? '')}</span>
              <h1 className="text-2xl font-bold text-slate-900">{meeting.meetingType}</h1>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium border capitalize', STATUS_COLORS[meeting.status] ?? '')}>
                {meeting.status}
              </span>
            </div>
            <p className="text-slate-500 text-sm">{entity?.name} · {entity?.country}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadICS}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Add to Calendar
          </button>
          {meeting.status === 'scheduled' && (
            <button
              onClick={() => openHeldModal(meeting)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Mark as Held
            </button>
          )}
          {meeting.status === 'completed' && meeting.confirmedBy && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
              <BadgeCheck className="w-4 h-4" />
              Confirmed by {meeting.confirmedBy}
            </div>
          )}
          {meeting.status === 'completed' && (
            <button
              onClick={() => openMinutesModal(meeting)}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {meeting.minutes ? 'Edit Minutes' : 'Add Minutes'}
            </button>
          )}
          <Link
            href={`/board-meetings/new?edit=${meeting.id}`}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-4 divide-x divide-slate-100">
          <div className="px-4 first:pl-0">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date
            </p>
            <p className="text-sm font-medium text-slate-800">{formatDate(meeting.meetingDate)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time
            </p>
            <p className="text-sm font-medium text-slate-800">
              {meeting.meetingTime} {meeting.timezone?.split('/')[1]?.replace('_', ' ')}
            </p>
          </div>
          <div className="px-4">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              {meeting.locationType === 'virtual'  ? <Video     className="w-3.5 h-3.5" /> :
               meeting.locationType === 'physical' ? <Building2 className="w-3.5 h-3.5" /> :
               <MapPin className="w-3.5 h-3.5" />}
              Location
            </p>
            <p className="text-sm font-medium text-slate-800 capitalize">
              {meeting.locationType} · {meeting.location}
            </p>
          </div>
          <div className="px-4">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Quorum
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-slate-800">
                {accepted}/{meeting.quorumRequired} confirmed
              </p>
              {quorumMet
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <AlertCircle  className="w-3.5 h-3.5 text-amber-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* Chair + recurrence sub-info */}
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <span><span className="font-medium text-slate-700">Chair:</span> {meeting.chair}</span>
        {meeting.recurrence && meeting.recurrence !== 'none' && (
          <span><span className="font-medium text-slate-700">Recurrence:</span> {meeting.recurrence}</span>
        )}
        <span><span className="font-medium text-slate-700">Created by:</span> {meeting.createdBy}</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map(({ id: tabId, label, icon: Icon, count }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId as Tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tabId
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== null && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  activeTab === tabId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="space-y-4">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-5 gap-5">
            {/* Agenda */}
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Agenda
                </h3>
                <div className="flex items-center gap-2">
                  {editingAgenda ? (
                    <>
                      <button
                        onClick={saveAgenda}
                        disabled={savingAgenda}
                        className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingAgenda(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setAgendaDraft(meeting.agenda ?? ''); setEditingAgenda(true); }}
                      className="text-slate-400 hover:text-indigo-600"
                      title="Edit agenda"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {editingAgenda ? (
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={6}
                  placeholder="Enter agenda items, one per line or separated by semicolons…"
                  value={agendaDraft}
                  onChange={e => setAgendaDraft(e.target.value)}
                />
              ) : agendaItems.length > 0 ? (
                <ol className="space-y-2">
                  {agendaItems.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-400">No agenda set. Click the edit icon to add items.</p>
              )}
            </div>

            {/* Meeting Notes */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  Meeting Notes
                </h3>
                <div className="flex items-center gap-2">
                  {savedNotes && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  {editingNotes ? (
                    <>
                      <button onClick={saveNotes} className="text-indigo-600 hover:text-indigo-700">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingNotes(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditingNotes(true)} className="text-slate-400 hover:text-indigo-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {editingNotes ? (
                <textarea
                  value={notes || (meeting.notes ?? '')}
                  onChange={e => setNotes(e.target.value)}
                  rows={8}
                  placeholder="Add meeting notes, action items, observations…"
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  autoFocus
                />
              ) : (
                <div
                  className="text-sm text-slate-600 cursor-pointer hover:bg-slate-50 rounded-lg p-2 min-h-32 transition-colors"
                  onClick={() => setEditingNotes(true)}
                >
                  {notes || meeting.notes
                    ? (notes || meeting.notes)?.split('\n').map((l, i) => <p key={i}>{l || <br />}</p>)
                    : <span className="text-slate-300 italic">Click to add notes…</span>
                  }
                </div>
              )}
            </div>

            {/* Completion audit trail */}
            {meeting.status === 'completed' && meeting.heldAt && (
              <div className="col-span-5 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800">Meeting Confirmed as Held</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5">
                      <span className="text-xs text-green-700">
                        <span className="font-medium">Date held:</span> {formatDate(meeting.heldAt)}
                      </span>
                      {meeting.confirmedBy && (
                        <span className="text-xs text-green-700">
                          <span className="font-medium">Confirmed by:</span> {meeting.confirmedBy}
                        </span>
                      )}
                      {meeting.directorsPresent !== null && (
                        <span className="text-xs text-green-700">
                          <span className="font-medium">Directors present:</span> {meeting.directorsPresent}
                          {meeting.directorsPresent >= meeting.quorumRequired
                            ? <span className="ml-1 text-green-600">✓ quorum</span>
                            : <span className="ml-1 text-amber-600">⚠ below quorum</span>}
                        </span>
                      )}
                      {meeting.minutesUrl && (
                        <span className="text-xs text-green-700">
                          <span className="font-medium">Minutes:</span> {meeting.minutesUrl}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Minutes — always shown on completed meetings */}
            {meeting.status === 'completed' && (
              <div className={`col-span-5 rounded-xl p-4 flex items-start gap-3 border ${meeting.minutes ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${meeting.minutes ? 'text-green-600' : 'text-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${meeting.minutes ? 'text-green-800' : 'text-slate-500'}`}>
                    {meeting.minutes ? 'Meeting Minutes' : 'No minutes recorded yet'}
                  </p>
                  {meeting.minutes && <p className="text-xs text-green-700 mt-1 whitespace-pre-line">{meeting.minutes}</p>}
                  {meeting.minutesUrl && (
                    <a href={meeting.minutesUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1 block">
                      📎 {meeting.minutesUrl}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => openMinutesModal(meeting)}
                  className="text-slate-400 hover:text-indigo-600 shrink-0"
                  title={meeting.minutes ? 'Edit minutes' : 'Add minutes'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDEES ── */}
        {activeTab === 'attendees' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Quorum status bar */}
            <div className={cn(
              'px-5 py-3 border-b flex items-center gap-3 text-sm',
              quorumMet ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'
            )}>
              {quorumMet
                ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                : <AlertCircle  className="w-4 h-4 text-amber-600 shrink-0" />}
              <span className={quorumMet ? 'text-green-700' : 'text-amber-700'}>
                {quorumMet
                  ? `Quorum met — ${accepted} of ${meeting.quorumRequired} required directors have accepted`
                  : `Quorum not yet met — ${accepted} accepted, ${meeting.quorumRequired} required`}
              </span>
            </div>

            {/* Summary chips */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 text-xs font-medium">
              {(['accepted', 'invited', 'tentative', 'declined'] as const).map(status => {
                const count = attendees.filter(a => a.status === status).length;
                if (count === 0) return null;
                return (
                  <span key={status} className={cn('px-2.5 py-1 rounded-full border', ATTENDEE_COLORS[status])}>
                    {ATTENDEE_LABELS[status]}: {count}
                  </span>
                );
              })}
            </div>

            {attendees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No attendees invited yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {attendees.map(att => {
                  const dir = directorMap[att.directorId];
                  return (
                    <div key={att.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                        {dir?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '??'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{dir?.name ?? att.directorId}</p>
                        <p className="text-xs text-slate-400">{dir?.role} · {dir?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ATTENDEE_ICONS[att.status]}
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', ATTENDEE_COLORS[att.status])}>
                          {ATTENDEE_LABELS[att.status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 text-right w-32">
                        {att.respondedAt
                          ? `Responded ${formatDate(att.respondedAt)}`
                          : `Invited ${formatDate(att.invitedAt)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">{docs.length} document{docs.length !== 1 ? 's' : ''} attached</p>
              <button
                onClick={openDocModal}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Document
              </button>
            </div>

            {docs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-slate-50 transition-colors">
                    <div className="text-2xl shrink-0">{DOC_ICONS[doc.fileType] ?? '📎'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {doc.fileSize > 0 ? formatFileSize(doc.fileSize) + ' · ' : ''}Uploaded by {doc.uploadedBy} on {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0', CATEGORY_COLORS[doc.category] ?? 'bg-gray-50 text-gray-600')}>
                      {doc.category}
                    </span>
                    {/* Actions — visible on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => setDeletedDocIds(prev => new Set([...prev, doc.id]))}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RESOLUTIONS ── */}
        {activeTab === 'resolutions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{resolutions.length} resolution{resolutions.length !== 1 ? 's' : ''}</p>
              <button
                onClick={openResModal}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Resolution
              </button>
            </div>

            {resolutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                No resolutions recorded yet.
              </div>
            ) : resolutions.map(res => {
              const totalVotes = res.votesFor + res.votesAgainst + res.votesAbstain;
              const forPct = totalVotes > 0 ? (res.votesFor / totalVotes) * 100 : 0;

              return (
                <div key={res.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-800">{res.title}</h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', RESOLUTION_COLORS[res.status] ?? 'bg-gray-100 text-gray-600')}>
                          {res.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{res.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{res.votesFor} For</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                      <ThumbsDown className="w-4 h-4" />
                      <span>{res.votesAgainst} Against</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                      <Minus className="w-4 h-4" />
                      <span>{res.votesAbstain} Abstain</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${forPct}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Proposed by {res.proposedBy}</p>
                  </div>

                  {res.notes && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-3 py-2">{res.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document Preview Modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl shrink-0">{DOC_ICONS[previewDoc.fileType] ?? '📎'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{previewDoc.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {previewDoc.fileSize > 0 ? formatFileSize(previewDoc.fileSize) + ' · ' : ''}
                    {previewDoc.fileType.toUpperCase()} · {CATEGORY_COLORS[previewDoc.category] ? previewDoc.category : 'other'}
                  </p>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600 shrink-0 ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata grid */}
            <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Uploaded by</p>
                <p className="text-sm text-slate-700">{previewDoc.uploadedBy}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Upload date</p>
                <p className="text-sm text-slate-700">{formatDate(previewDoc.uploadedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Category</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', CATEGORY_COLORS[previewDoc.category] ?? 'bg-gray-50 text-gray-600')}>
                  {previewDoc.category}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">File size</p>
                <p className="text-sm text-slate-700">{previewDoc.fileSize > 0 ? formatFileSize(previewDoc.fileSize) : '—'}</p>
              </div>
            </div>

            {/* Preview area */}
            <div className="px-6 py-10 flex flex-col items-center justify-center gap-4 bg-slate-50 min-h-48">
              <div className="text-6xl">{DOC_ICONS[previewDoc.fileType] ?? '📎'}</div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Preview not available in this environment</p>
                <p className="text-xs text-slate-400 mt-1">Download the file to view it in full</p>
              </div>
              {previewDoc.storageUrl ? (
                <a
                  href={previewDoc.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Open / Download {previewDoc.fileType.toUpperCase()}
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">No file attached — document was registered without a file upload</p>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setDeletedDocIds(prev => new Set([...prev, previewDoc.id]));
                  setPreviewDoc(null);
                }}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete document
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Document Modal ── */}
      {docOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDocOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-500" /> Upload Document
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Attach a document to this meeting</p>
              </div>
              <button onClick={() => setDocOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5">
              {docSaved ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="font-semibold text-green-800">Document added</p>
                </div>
              ) : (
                <form onSubmit={handleDocUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Document name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={docForm.name}
                      onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Q2 2026 Board Pack.pdf"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <p className="text-xs text-slate-400 mt-1">Include the file extension so the icon displays correctly.</p>
                  </div>

                  {/* File picker */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">File <span className="text-xs font-normal text-slate-400">(optional — attach the actual file)</span></label>
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${docSelectedFile ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                      {docSelectedFile ? (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <FileText className="w-5 h-5 shrink-0" />
                          <span className="font-medium truncate max-w-xs">{docSelectedFile.name}</span>
                          <button type="button" onClick={ev => { ev.preventDefault(); setDocSelectedFile(null); }} className="ml-1 text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-slate-300" />
                          <span className="text-sm text-slate-400">Click to select a file</span>
                        </>
                      )}
                      <input
                        ref={docFileInputRef}
                        type="file"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setDocSelectedFile(f);
                          if (!docForm.name) setDocForm(p => ({ ...p, name: f.name }));
                        }}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                      <select
                        value={docForm.category}
                        onChange={e => setDocForm(p => ({ ...p, category: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="pack">Board Pack</option>
                        <option value="agenda">Agenda</option>
                        <option value="minutes">Minutes</option>
                        <option value="resolution">Resolution</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Uploaded by</label>
                      <input
                        type="text"
                        value={docForm.uploadedBy}
                        onChange={e => setDocForm(p => ({ ...p, uploadedBy: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setDocOpen(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button
                      type="submit"
                      disabled={docSaving || !docForm.name}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {docSaving ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Uploading…</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Upload Document</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Resolution Modal ── */}
      {resOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" /> Add Resolution
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Record a resolution passed at this meeting</p>
              </div>
              <button onClick={() => setResOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5">
              {resSaved ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="font-semibold text-green-800">Resolution recorded</p>
                </div>
              ) : (
                <form onSubmit={handleResAdd} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Resolution title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={resForm.title}
                      onChange={e => setResForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Approval of Q2 Financial Statements"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                    <textarea
                      rows={2}
                      value={resForm.description}
                      onChange={e => setResForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Board resolves to…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Proposed by</label>
                      <input
                        type="text"
                        value={resForm.proposedBy}
                        onChange={e => setResForm(p => ({ ...p, proposedBy: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Outcome</label>
                      <select
                        value={resForm.status}
                        onChange={e => setResForm(p => ({ ...p, status: e.target.value as MeetingResolution['status'] }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="proposed">Proposed</option>
                        <option value="passed">Passed</option>
                        <option value="defeated">Defeated</option>
                        <option value="deferred">Deferred</option>
                      </select>
                    </div>
                  </div>

                  {/* Vote counts */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vote count</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'For', key: 'votesFor', color: 'text-green-600', icon: ThumbsUp },
                        { label: 'Against', key: 'votesAgainst', color: 'text-red-500', icon: ThumbsDown },
                        { label: 'Abstain', key: 'votesAbstain', color: 'text-slate-400', icon: Minus },
                      ].map(({ label, key, color, icon: Icon }) => (
                        <div key={key}>
                          <label className={cn('flex items-center gap-1 text-xs font-medium mb-1', color)}>
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={resForm[key as keyof typeof resForm] as number}
                            onChange={e => setResForm(p => ({ ...p, [key]: Number(e.target.value) }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={resForm.notes}
                      onChange={e => setResForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Any qualifications or conditions attached to this resolution"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setResOpen(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button
                      type="submit"
                      disabled={resSaving || !resForm.title}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {resSaving ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving…</>
                      ) : (
                        <><CheckSquare className="w-4 h-4" /> Record Resolution</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mark as Held Modal ── */}
      {heldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHeldOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-green-600" />
                    Mark Meeting as Held
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">{meeting.meetingType} · {entity?.name}</p>
                </div>
                <button onClick={() => setHeldOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Step indicator */}
              {!heldSaved && (
                <div className="flex items-center gap-2 mt-4">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        heldStep > s  ? 'bg-green-500 text-white' :
                        heldStep === s ? 'bg-indigo-600 text-white' :
                        'bg-slate-100 text-slate-400'
                      )}>
                        {heldStep > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                      </div>
                      <span className={cn('text-xs font-medium', heldStep === s ? 'text-slate-700' : 'text-slate-400')}>
                        {s === 1 ? 'Confirm details' : s === 2 ? 'Roll call' : 'Minutes'}
                      </span>
                      {s < 3 && <div className={cn('flex-1 h-px w-8', heldStep > s ? 'bg-green-400' : 'bg-slate-200')} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {heldSaved ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <BadgeCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-semibold text-green-800">Meeting confirmed as held</p>
                  <p className="text-sm text-slate-500">Status updated to Completed. The record has been saved.</p>
                </div>

              ) : heldStep === 1 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date Held</label>
                      <input
                        type="date"
                        value={heldForm.heldDate}
                        onChange={e => setHeldForm(p => ({ ...p, heldDate: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmed by</label>
                      <input
                        type="text"
                        value={heldForm.confirmedBy}
                        onChange={e => setHeldForm(p => ({ ...p, confirmedBy: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Was quorum met?</label>
                    <div className="flex gap-3">
                      {[true, false].map(val => (
                        <label key={String(val)} className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium flex-1 justify-center',
                          heldForm.quorumConfirmed === val
                            ? val ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}>
                          <input type="radio" className="hidden" checked={heldForm.quorumConfirmed === val}
                            onChange={() => setHeldForm(p => ({ ...p, quorumConfirmed: val }))} />
                          {val ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {val ? `Yes — quorum met` : 'No — below quorum'}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Required: {meeting.quorumRequired} director{meeting.quorumRequired !== 1 ? 's' : ''}</p>
                  </div>
                </div>

              ) : heldStep === 2 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Tick the directors who were <strong>physically or virtually present</strong>:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {attendees.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No invited directors found for this meeting.</p>
                    ) : attendees.map(att => {
                      const dir = directorMap[att.directorId];
                      const isPresent = heldForm.presentIds.includes(att.directorId);
                      return (
                        <label key={att.id} className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                          isPresent ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                        )}>
                          <input
                            type="checkbox"
                            checked={isPresent}
                            onChange={() => {
                              const next = isPresent
                                ? heldForm.presentIds.filter(x => x !== att.directorId)
                                : [...heldForm.presentIds, att.directorId];
                              setHeldForm(p => ({ ...p, presentIds: next, directorsPresent: next.length }));
                            }}
                            className="rounded text-green-600"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{dir?.name ?? att.directorId}</p>
                            <p className="text-xs text-slate-400">{dir?.role}</p>
                          </div>
                          {isPresent && <UserCheck className="w-4 h-4 text-green-500" />}
                        </label>
                      );
                    })}
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 text-xs px-3 py-2 rounded-lg border',
                    heldForm.directorsPresent >= meeting.quorumRequired
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  )}>
                    {heldForm.directorsPresent >= meeting.quorumRequired
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <AlertCircle className="w-3.5 h-3.5" />}
                    {heldForm.directorsPresent} of {meeting.quorumRequired} required present
                    {heldForm.directorsPresent >= meeting.quorumRequired ? ' — quorum satisfied' : ' — quorum not met'}
                  </div>
                </div>

              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Minutes summary</label>
                    <textarea
                      value={heldForm.minutesSummary}
                      onChange={e => setHeldForm(p => ({ ...p, minutesSummary: e.target.value }))}
                      rows={4}
                      placeholder="Brief summary of key decisions and action items from the meeting…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Minutes document filename <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={heldForm.minutesFilename}
                      onChange={e => setHeldForm(p => ({ ...p, minutesFilename: e.target.value }))}
                      placeholder="e.g. Q2-2026-Board-Minutes.docx"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-600 text-sm mb-2">Confirmation summary</p>
                    <p><span className="font-medium">Date held:</span> {heldForm.heldDate ? formatDate(heldForm.heldDate) : '—'}</p>
                    <p><span className="font-medium">Confirmed by:</span> {heldForm.confirmedBy || '—'}</p>
                    <p><span className="font-medium">Directors present:</span> {heldForm.directorsPresent} (quorum: {meeting.quorumRequired})</p>
                    <p><span className="font-medium">Quorum:</span> {heldForm.quorumConfirmed ? '✅ Met' : '⚠️ Not met'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!heldSaved && (
              <div className="px-6 pb-6 flex items-center justify-between">
                <button
                  onClick={() => heldStep > 1 ? setHeldStep(s => s - 1) : setHeldOpen(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  {heldStep > 1 ? '← Back' : 'Cancel'}
                </button>
                {heldStep < 3 ? (
                  <button
                    onClick={() => setHeldStep(s => s + 1)}
                    disabled={heldStep === 1 && !heldForm.heldDate}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    onClick={confirmHeld}
                    disabled={heldSaving}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {heldSaving ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Saving…
                      </>
                    ) : (
                      <><BadgeCheck className="w-4 h-4" /> Confirm Meeting Held</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Minutes Modal ── */}
      {minutesOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {meeting.minutes ? 'Edit Minutes' : 'Add Minutes'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{meeting.meetingType} · {formatDate(meeting.meetingDate)}</p>
              </div>
              <button onClick={() => setMinutesOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Minutes summary</label>
                <textarea
                  value={minutesDraft}
                  onChange={e => setMinutesDraft(e.target.value)}
                  rows={5}
                  placeholder="Key decisions, resolutions, and action items from the meeting…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Minutes document URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={minutesUrlDraft}
                  onChange={e => setMinutesUrlDraft(e.target.value)}
                  placeholder="e.g. /uploads/docs/Q2-2026-Board-Minutes.pdf"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => setMinutesOpen(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={saveMinutes}
                disabled={savingMinutes}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingMinutes ? 'Saving…' : <><Save className="w-4 h-4" /> Save Minutes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
