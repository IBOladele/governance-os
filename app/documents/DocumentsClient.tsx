'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileText, Upload, Search, FolderOpen, Shield, Building2,
  DollarSign, Users, ChevronDown, ChevronRight, X, CheckCircle2,
  FileArchive, File, ExternalLink,
} from 'lucide-react';
import { getFlagEmoji } from '@/lib/utils';
import type { Entity } from '@/lib/db/schema';

// ─── types ──────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  entityId: string;
  name: string;
  category: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  storageUrl: string | null;
  version: number;
  tags: string[];
  notes: string | null;
  uploadedAt: string;
}

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'constitutional', label: 'Constitutional', icon: Building2, color: 'bg-indigo-100 text-indigo-700' },
  { key: 'compliance',     label: 'Compliance',     icon: Shield,    color: 'bg-blue-100 text-blue-700'   },
  { key: 'license',        label: 'License',        icon: Shield,    color: 'bg-cyan-100 text-cyan-700'   },
  { key: 'financial',      label: 'Financial',      icon: DollarSign,color: 'bg-green-100 text-green-700' },
  { key: 'meeting',        label: 'Meeting',        icon: Users,     color: 'bg-purple-100 text-purple-700'},
  { key: 'other',          label: 'Other',          icon: File,      color: 'bg-gray-100 text-gray-600'   },
];

const FILE_TYPES = ['PDF', 'DOCX', 'XLSX', 'PNG', 'JPG', 'ZIP', 'OTHER'];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (['PDF'].includes(type)) return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
  if (['DOCX'].includes(type)) return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
  if (['XLSX'].includes(type)) return <FileText className="w-4 h-4 text-green-400 shrink-0" />;
  if (['ZIP'].includes(type)) return <FileArchive className="w-4 h-4 text-yellow-500 shrink-0" />;
  return <File className="w-4 h-4 text-gray-400 shrink-0" />;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  entities: Entity[];
  onClose: () => void;
  onSaved: (doc: Document) => void;
}

function UploadModal({ entities, onClose, onSaved }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const [form, setForm] = useState({
    entityId:   '',
    name:       '',
    category:   'constitutional',
    fileType:   'PDF',
    uploadedBy: 'Alex Chen',
    notes:      '',
    tags:       '',
  });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Derive fileType from extension
  function extToType(filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase() ?? '';
    return FILE_TYPES.includes(ext) ? ext : 'OTHER';
  }

  function applyFile(file: File) {
    setSelectedFile(file);
    setForm(p => ({
      ...p,
      name:     p.name || file.name.replace(/\.[^.]+$/, ''), // don't overwrite if user typed one
      fileType: extToType(file.name),
    }));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.entityId || !form.name) return;
    setSaving(true);
    setUploadPct(0);
    try {
      let storageUrl: string | null = null;

      // 1. Upload the actual file if one was selected
      if (selectedFile) {
        setUploadPct(20);
        const fd = new FormData();
        fd.append('file', selectedFile);
        const upRes = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => ({}));
          throw new Error(upErr.error || 'File upload failed');
        }
        const upJson = await upRes.json();
        storageUrl = upJson.url;
        setUploadPct(70);
      }

      // 2. Create the metadata record
      const res = await fetch('/api/documents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId:   form.entityId,
          name:       form.name,
          category:   form.category,
          fileType:   form.fileType,
          fileSize:   selectedFile ? Math.round(selectedFile.size / 1024) : 0,
          uploadedBy: form.uploadedBy,
          notes:      form.notes || null,
          tags:       form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          storageUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setUploadPct(100);
      setSaved(true);
      setTimeout(() => { onSaved(json); onClose(); }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
            <p className="text-sm text-gray-500">Add a file to the document vault</p>
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
            <p className="font-semibold text-green-800">Document uploaded</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* ── File drop zone ── */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-50'
                  : selectedFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {fileIcon(extToType(selectedFile.name))}
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                    className="ml-2 p-1 hover:bg-red-100 rounded-full"
                  >
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-sm font-medium text-gray-600">Drop a file here, or <span className="text-indigo-600">browse</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX, XLSX, PNG, ZIP · max 50 MB</p>
                </>
              )}
            </div>

            {/* ── Metadata ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name} onChange={set('name')} required
                  placeholder="e.g. Certificate of Incorporation"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity <span className="text-red-500">*</span></label>
                <select
                  value={form.entityId} onChange={set('entityId')} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select entity…</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category} onChange={set('category')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                <select
                  value={form.fileType} onChange={set('fileType')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {FILE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uploaded By</label>
                <input
                  value={form.uploadedBy} onChange={set('uploadedBy')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  value={form.tags} onChange={set('tags')}
                  placeholder="e.g. 2024, annual, audited"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes} onChange={set('notes')} rows={2}
                placeholder="Optional context or description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Upload progress bar */}
            {saving && uploadPct > 0 && (
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {uploadPct < 70 ? 'Uploading…' : 'Saving…'}
                  </>
                ) : (
                  <><Upload className="w-3.5 h-3.5" /> {selectedFile ? 'Upload & Save' : 'Register Document'}</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Entity Folder Row ────────────────────────────────────────────────────────

interface EntityFolderProps {
  entity: Entity;
  docs: Document[];
}

function EntityFolder({ entity, docs }: EntityFolderProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className="text-sm">{getFlagEmoji(entity.country)}</span>
        <span className="font-medium text-gray-900 text-sm">{entity.name}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {docs.length} doc{docs.length !== 1 ? 's' : ''}
        </span>
      </button>

      {open && docs.length > 0 && (
        <table className="w-full text-sm border-t border-gray-100">
          <tbody className="divide-y divide-gray-50">
            {docs.map(doc => {
              const cat = CATEGORIES.find(c => c.key === doc.category);
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 pl-12">
                    <div className="flex items-center gap-2">
                      {fileIcon(doc.fileType)}
                      <span className="font-medium text-gray-800">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-36">
                    {cat && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>
                        {cat.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 w-16">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {doc.fileType}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-20 text-xs text-gray-400">{formatBytes(doc.fileSize)}</td>
                  <td className="px-4 py-3 w-16">
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                      v{doc.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-32 text-xs text-gray-400">
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 w-32 text-xs text-gray-400">{doc.uploadedBy}</td>
                  <td className="px-4 py-3 w-10">
                    {doc.storageUrl && (
                      <a
                        href={doc.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open / Download"
                        className="text-indigo-500 hover:text-indigo-700"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {open && docs.length === 0 && (
        <div className="px-12 py-4 text-sm text-gray-400 border-t border-gray-100">No documents in this folder.</div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  entities: Entity[];
  initialDocuments: Document[];
}

export default function DocumentsClient({ entities, initialDocuments }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterEnt, setFilterEnt] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView]           = useState<'folder' | 'table'>('folder');

  // Filter docs
  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (filterCat && d.category !== filterCat) return false;
      if (filterEnt && d.entityId !== filterEnt) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.name.toLowerCase().includes(q)
          || d.uploadedBy.toLowerCase().includes(q)
          || (d.notes ?? '').toLowerCase().includes(q)
          || d.tags.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [documents, search, filterCat, filterEnt]);

  // Category counts
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    documents.forEach(d => { m[d.category] = (m[d.category] ?? 0) + 1; });
    return m;
  }, [documents]);

  // Entities that have filtered docs
  const entitiesWithDocs = useMemo(() => {
    const ids = new Set(filtered.map(d => d.entityId));
    return entities.filter(e => ids.has(e.id));
  }, [entities, filtered]);

  function onDocSaved(doc: Document) {
    setDocuments(prev => [doc, ...prev]);
  }

  return (
    <>
      {showUpload && (
        <UploadModal
          entities={entities}
          onClose={() => setShowUpload(false)}
          onSaved={onDocSaved}
        />
      )}

      <div className="px-8 py-6 space-y-6">
        {/* Category summary */}
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {CATEGORIES.map(cat => {
            const count = catCounts[cat.key] ?? 0;
            const active = filterCat === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setFilterCat(active ? '' : cat.key)}
                className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-all text-left ${
                  active ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                  <cat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <select
            value={filterEnt}
            onChange={e => setFilterEnt(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="">All entities</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['folder', 'table'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  view === v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v === 'folder' ? 'Folder View' : 'Table View'}
              </button>
            ))}
          </div>

          {(search || filterCat || filterEnt) && (
            <button
              onClick={() => { setSearch(''); setFilterCat(''); setFilterEnt(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}

          <div className="ml-auto">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Result count */}
        <p className="text-xs text-gray-400">
          {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          {(search || filterCat || filterEnt) ? ' matching filters' : ' total'}
        </p>

        {/* Folder view */}
        {view === 'folder' && (
          <div className="space-y-3">
            {entitiesWithDocs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-12 text-center text-gray-400">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No documents found</p>
              </div>
            ) : (
              entitiesWithDocs.map(entity => (
                <EntityFolder
                  key={entity.id}
                  entity={entity}
                  docs={filtered.filter(d => d.entityId === entity.id)}
                />
              ))
            )}
          </div>
        )}

        {/* Table view */}
        {view === 'table' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Document</th>
                  <th className="text-left px-6 py-3 font-medium">Entity</th>
                  <th className="text-left px-6 py-3 font-medium">Category</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-left px-6 py-3 font-medium">Size</th>
                  <th className="text-left px-6 py-3 font-medium">Version</th>
                  <th className="text-left px-6 py-3 font-medium">Date</th>
                  <th className="text-left px-6 py-3 font-medium">By</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">No documents found</td>
                  </tr>
                ) : filtered.map(doc => {
                  const entity = entities.find(e => e.id === doc.entityId);
                  const cat = CATEGORIES.find(c => c.key === doc.category);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {fileIcon(doc.fileType)}
                          <span className="font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{getFlagEmoji(entity?.country ?? '')}</span>
                          <span className="text-xs text-gray-600">{entity?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {cat && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>
                            {cat.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {doc.fileType}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{formatBytes(doc.fileSize)}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">v{doc.version}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{doc.uploadedBy}</td>
                      <td className="px-4 py-3">
                        {doc.storageUrl && (
                          <a
                            href={doc.storageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open / Download"
                            className="text-indigo-500 hover:text-indigo-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* S3 integration note */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3 text-sm text-gray-500">
          <FolderOpen className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Production integration: Connect to AWS S3 (or Azure Blob) for encrypted document storage with
            pre-signed URLs, automatic versioning, and audit logging on every access.
          </p>
        </div>
      </div>
    </>
  );
}
