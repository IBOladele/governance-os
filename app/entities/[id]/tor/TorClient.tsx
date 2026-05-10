'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Upload, X, CheckSquare, Square, Plus, Loader2, Download, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Entity, Director } from '@/lib/db/schema';
import type { JurisdictionTemplate } from '@/lib/tor/jurisdictions';

interface Props {
  entity: Entity;
  directors: Director[];
  template: JurisdictionTemplate;
}

interface UploadedFile {
  file: File;
  name: string;
  size: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileDropZone({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: UploadedFile | null;
  onChange: (f: UploadedFile | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange({ file: f, name: f.name, size: formatFileSize(f.size) });
  }, [onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange({ file: f, name: f.name, size: formatFileSize(f.size) });
  };

  if (value) {
    return (
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800">{value.name}</p>
            <p className="text-xs text-indigo-500">{value.size}</p>
          </div>
        </div>
        <button onClick={() => onChange(null)} className="p-1 hover:bg-indigo-100 rounded-full">
          <X className="w-4 h-4 text-indigo-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
        dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleChange} />
      <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

export default function TorClient({ entity, directors, template }: Props) {
  // Form state
  const [quorum, setQuorum] = useState(template.quorumDefault);
  const [meetingFrequency, setMeetingFrequency] = useState('Quarterly');
  const [noticePeriodDays, setNoticePeriodDays] = useState(template.noticePeriodDays);
  const [chairCastingVote, setChairCastingVote] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [purpose, setPurpose] = useState((entity as Entity & { purpose?: string }).purpose ?? '');

  // Reserved matters
  const [selectedMatters, setSelectedMatters] = useState<Set<string>>(
    new Set(template.reservedMattersDefaults)
  );
  const [customMatter, setCustomMatter] = useState('');
  const [extraMatters, setExtraMatters] = useState<string[]>([]);

  // Stage 2 files
  const [constitutionFile, setConstitutionFile] = useState<UploadedFile | null>(null);
  const [shaFile, setShaFile] = useState<UploadedFile | null>(null);
  const [showStage2, setShowStage2] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState('');

  const toggleMatter = (m: string) => {
    setSelectedMatters(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const addCustomMatter = () => {
    const trimmed = customMatter.trim();
    if (!trimmed) return;
    setExtraMatters(prev => [...prev, trimmed]);
    setSelectedMatters(prev => new Set([...prev, trimmed]));
    setCustomMatter('');
  };

  const allMatters = [...template.reservedMattersDefaults, ...extraMatters];

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    const hasFiles = !!(constitutionFile || shaFile);

    try {
      const formData = new FormData();

      const torData = {
        quorum,
        meetingFrequency,
        noticePeriodDays,
        chairCastingVote,
        reservedMatters: [...selectedMatters],
        customReservedMatters: '',
        purpose: purpose || `Licensed financial services company operating in ${entity.country}`,
        effectiveDate,
      };
      formData.append('data', JSON.stringify(torData));

      if (constitutionFile) formData.append('constitution', constitutionFile.file);
      if (shaFile) formData.append('sha', shaFile.file);

      if (hasFiles) {
        setAiStatus('Extracting text from uploaded documents…');
        setTimeout(() => setAiStatus('Analyzing with AI — identifying clauses and conflicts…'), 2000);
        setTimeout(() => setAiStatus('Merging AI findings into template…'), 5000);
      } else {
        setAiStatus('Building document from jurisdiction template…');
      }

      const resp = await fetch(`/api/entities/${entity.id}/tor`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? 'Generation failed');
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = entity.name.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `ToR_${safeName}_Board_${effectiveDate}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating(false);
      setAiStatus('');
    }
  };

  const hasFiles = !!(constitutionFile || shaFile);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <Link
          href={`/entities/${entity.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {entity.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Board Terms of Reference Generator
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {entity.name} · {entity.country} · {template.act} {template.actYear}
            </p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
            Regulated by {template.regulator.split('(')[0].trim()}
          </span>
        </div>
      </div>

      <div className="px-8 py-6 max-w-5xl mx-auto space-y-6">

        {/* Jurisdiction notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Statutory defaults for {entity.country}</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Pre-filled with {template.act} ({template.actYear}) requirements — quorum: {template.quorumDefault} directors,
              notice: {template.noticePeriodDays} days, minutes retention: {template.minutesRetentionYears} years.
              Adjust as needed for your constitution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left column — form */}
          <div className="col-span-2 space-y-5">

            {/* Meeting parameters */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Meeting Parameters</h2>
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Meeting Frequency
                  </label>
                  <select
                    value={meetingFrequency}
                    onChange={e => setMeetingFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Monthly</option>
                    <option>Bi-monthly</option>
                    <option>Quarterly</option>
                    <option>Semi-annually</option>
                    <option>Annually</option>
                    <option>As required</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Quorum (directors)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={directors.length || 10}
                    value={quorum}
                    onChange={e => setQuorum(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Statutory minimum: {template.quorumDefault} · Current board: {directors.length}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Notice Period (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={noticePeriodDays}
                    onChange={e => setNoticePeriodDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Statutory minimum: {template.noticePeriodDays} days
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Business Purpose / Description
                  </label>
                  <textarea
                    rows={2}
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder={`e.g. Licensed payment institution providing cross-border remittance services in ${entity.country}`}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChairCastingVote(!chairCastingVote)}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    {chairCastingVote
                      ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                      : <Square className="w-5 h-5 text-gray-300" />}
                    Chairperson has a casting vote on tied resolutions
                  </button>
                </div>
              </div>
            </div>

            {/* Reserved matters */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Reserved Matters</h2>
              <p className="text-xs text-gray-400 mb-4">
                Decisions requiring full Board approval — pre-populated with {entity.country} best practice defaults.
                {' '}{selectedMatters.size} of {allMatters.length} selected.
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {allMatters.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMatter(m)}
                    className="w-full flex items-start gap-2.5 text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {selectedMatters.has(m)
                      ? <CheckSquare className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      : <Square className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                    <span className={`text-sm ${selectedMatters.has(m) ? 'text-gray-800' : 'text-gray-400'}`}>{m}</span>
                  </button>
                ))}
              </div>

              {/* Add custom matter */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                <input
                  type="text"
                  value={customMatter}
                  onChange={e => setCustomMatter(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomMatter()}
                  placeholder="Add custom reserved matter…"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={addCustomMatter}
                  disabled={!customMatter.trim()}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Stage 2 — AI document analysis */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowStage2(!showStage2)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      Stage 2 — AI Document Analysis
                      {hasFiles && (
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          {(constitutionFile ? 1 : 0) + (shaFile ? 1 : 0)} file{(constitutionFile && shaFile) ? 's' : ''} ready
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      Upload your Constitution and/or SHA for AI-powered clause extraction
                    </p>
                  </div>
                </div>
                {showStage2 ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showStage2 && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-50">
                  <div className="bg-violet-50 rounded-lg px-4 py-3 mt-4">
                    <p className="text-xs text-violet-700 font-medium">What AI extracts</p>
                    <ul className="text-xs text-violet-600 mt-1 space-y-0.5 list-disc list-inside">
                      <li>Quorum and notice period overrides in your constitution</li>
                      <li>Reserved matters and approval thresholds from your SHA</li>
                      <li>Conflicts between constitution, SHA and statutory defaults</li>
                      <li>Any specific chairman powers or voting provisions</li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Company Constitution / Articles</p>
                      <FileDropZone
                        label="Upload Constitution"
                        hint="PDF or DOCX · Drag & drop or click"
                        value={constitutionFile}
                        onChange={setConstitutionFile}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Shareholder Agreement (SHA)</p>
                      <FileDropZone
                        label="Upload SHA"
                        hint="PDF or DOCX · Drag & drop or click"
                        value={shaFile}
                        onChange={setShaFile}
                      />
                    </div>
                  </div>
                  {!hasFiles && (
                    <p className="text-xs text-gray-400 text-center">
                      No files uploaded — generating with statutory template only (Stage 1)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column — summary + generate */}
          <div className="space-y-5">

            {/* Summary card */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Document Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Entity</span>
                  <span className="font-medium text-gray-800 text-right max-w-[140px] truncate">{entity.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Jurisdiction</span>
                  <span className="font-medium text-gray-800">{entity.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Legislation</span>
                  <span className="font-medium text-gray-800 text-right text-xs">{template.act}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Frequency</span>
                  <span className="font-medium text-gray-800">{meetingFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quorum</span>
                  <span className="font-medium text-gray-800">{quorum} of {directors.length} directors</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Notice</span>
                  <span className="font-medium text-gray-800">{noticePeriodDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reserved matters</span>
                  <span className="font-medium text-gray-800">{selectedMatters.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Effective</span>
                  <span className="font-medium text-gray-800">{effectiveDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mode</span>
                  <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${hasFiles ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                    {hasFiles ? '✦ Stage 2 + AI' : 'Stage 1 — Template'}
                  </span>
                </div>
              </div>
            </div>

            {/* Board composition preview */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Board ({directors.length})</h3>
              <div className="space-y-2">
                {directors.slice(0, 6).map(d => (
                  <div key={d.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                      {d.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{d.name}</p>
                      <p className="text-xs text-gray-400 truncate">{d.role}</p>
                    </div>
                  </div>
                ))}
                {directors.length > 6 && (
                  <p className="text-xs text-gray-400">+{directors.length - 6} more directors</p>
                )}
                {directors.length === 0 && (
                  <p className="text-xs text-gray-400">No active directors recorded</p>
                )}
              </div>
            </div>

            {/* Generate button */}
            <div className="space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              {generating && aiStatus && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-violet-600 animate-spin shrink-0" />
                  <p className="text-xs text-violet-700">{aiStatus}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  hasFiles
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-indigo-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <>
                    {hasFiles ? <Sparkles className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {hasFiles ? 'Generate with AI Analysis' : 'Generate ToR Document'}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Downloads as .docx — review with legal counsel before adoption.
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-semibold">Legal notice: </span>
                {template.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
