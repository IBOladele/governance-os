'use client';

import { useState, useEffect } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, X, Send, ChevronLeft } from 'lucide-react';

type Step = 'closed' | 'type' | 'form' | 'submitting' | 'done';

export default function FeedbackWidget() {
  const [step, setStep] = useState<Step>('closed');
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [pageUrl, setPageUrl] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('major');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (typeof window !== 'undefined') setPageUrl(window.location.href);
  }, [step]);

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return;
    setStep('submitting');
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          pageUrl,
          severity: type === 'bug' ? severity : null,
          area: type === 'feature' ? area : null,
          priority: type === 'feature' ? priority : null,
          submittedBy: 'admin@governanceos.app',
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Server error ${res.status}`);
      }
      setStep('done');
      setTimeout(() => {
        setStep('closed');
        setTitle(''); setDescription(''); setSeverity('major'); setArea(''); setPriority('medium');
      }, 3000);
    } catch (err) {
      setStep('form');
      alert(err instanceof Error ? err.message : 'Failed to submit — please try again.');
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {step === 'closed' && (
        <button
          onClick={() => setStep('type')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:shadow-xl text-sm font-medium"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Feedback
        </button>
      )}

      {/* Panel */}
      {step !== 'closed' && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              {step !== 'type' && (
                <button onClick={() => setStep('type')} className="hover:opacity-70">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <p className="font-semibold text-sm">
                {step === 'type' && 'Submit Feedback'}
                {step === 'form' && (type === 'bug' ? '🐛 Report a Bug' : '💡 Feature Request')}
                {step === 'submitting' && 'Submitting…'}
                {step === 'done' && '✅ Submitted!'}
              </p>
            </div>
            <button onClick={() => setStep('closed')} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5">
            {/* Step 1: Type selection */}
            {step === 'type' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">What would you like to submit?</p>
                <button
                  onClick={() => { setType('bug'); setStep('form'); }}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all text-left"
                >
                  <Bug className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Bug Report</p>
                    <p className="text-xs text-gray-500 mt-0.5">Something is broken or not working as expected</p>
                  </div>
                </button>
                <button
                  onClick={() => { setType('feature'); setStep('form'); }}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                >
                  <Lightbulb className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Feature Request</p>
                    <p className="text-xs text-gray-500 mt-0.5">Suggest an improvement or new capability</p>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2: Form */}
            {step === 'form' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {type === 'bug' ? 'Bug title' : 'Feature title'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={type === 'bug' ? 'e.g. Entity search not returning results' : 'e.g. Export compliance calendar to PDF'}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder={type === 'bug'
                      ? 'Steps to reproduce:\n1. Go to...\n2. Click...\n\nExpected: ...\nActual: ...'
                      : 'Describe what you want and why it would be valuable…'}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {type === 'bug' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={e => setSeverity(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                    >
                      <option value="critical">🔴 Critical — app broken</option>
                      <option value="major">🟠 Major — feature unusable</option>
                      <option value="minor">🟡 Minor — workaround exists</option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Area</label>
                      <select
                        value={area}
                        onChange={e => setArea(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                      >
                        <option value="">Select…</option>
                        <option>Entities</option>
                        <option>Directors</option>
                        <option>Compliance</option>
                        <option>Licenses</option>
                        <option>Capital</option>
                        <option>Board Meetings</option>
                        <option>Alerts</option>
                        <option>Documents</option>
                        <option>Dashboard</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                      >
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  📍 Page: {pageUrl.replace(/^https?:\/\/[^/]+/, '')}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !description.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Submit {type === 'bug' ? 'Bug Report' : 'Feature Request'}
                </button>
              </div>
            )}

            {/* Step 3: Submitting */}
            {step === 'submitting' && (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600">Submitting your {type === 'bug' ? 'bug report' : 'feature request'}…</p>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
              <div className="py-8 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-sm font-semibold text-gray-900">Submitted successfully!</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your {type === 'bug' ? 'bug report' : 'feature request'} has been received. The team will review it shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
