'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Globe, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,         label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p),       label: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p),       label: 'One number' },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'org' | 'account'>('org');
  const [form, setForm] = useState({
    orgName:   '',
    orgSlug:   '',
    name:      '',
    email:     '',
    password:  '',
    confirm:   '',
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(p => ({
      ...p,
      [f]: val,
      ...(f === 'orgName' ? { orgSlug: slugify(val) } : {}),
    }));
  };

  const passOk = PASSWORD_RULES.every(r => r.test(form.password));
  const confirmOk = form.password === form.confirm && form.confirm.length > 0;

  const handleOrgNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orgName.trim()) return;
    setStep('account');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passOk) { setError('Please meet all password requirements.'); return; }
    if (!confirmOk) { setError('Passwords do not match.'); return; }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName:  form.orgName,
          orgSlug:  form.orgSlug || slugify(form.orgName),
          name:     form.name,
          email:    form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setSaving(false); return; }

      // Auto sign-in
      const signInResult = await signIn('credentials', {
        email:    form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push('/dashboard');
      } else {
        router.push('/login?registered=1');
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white placeholder:text-gray-400';

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[480px] shrink-0 bg-slate-950 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Globe className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-semibold text-white text-sm">EntityOS</span>
        </Link>

        <div>
          <blockquote className="text-2xl font-semibold text-white leading-snug mb-6">
            "We cut our compliance review time by 60% in the first month."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              SA
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sarah Adeyemi</p>
              <p className="text-xs text-slate-400">Head of Legal, Fintech Group</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { val: '150+', label: 'Jurisdictions' },
            { val: 'SOC 2', label: 'Compliant' },
            { val: '99.9%', label: 'Uptime SLA' },
            { val: 'Free', label: 'to get started' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <p className="text-xl font-bold text-white">{s.val}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        {/* mobile logo */}
        <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">EntityOS</span>
        </Link>

        <div className="w-full max-w-md">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {['Organisation', 'Your account'].map((label, i) => {
              const idx = i + 1;
              const current = step === 'org' ? 1 : 2;
              const done = idx < current;
              const active = idx === current;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-8 ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {done ? '✓' : idx}
                    </div>
                    <span className={`text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* ── Step 1: Organisation ──────────────────────────────────────── */}
          {step === 'org' && (
            <form onSubmit={handleOrgNext} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create your organisation</h1>
                <p className="text-sm text-gray-500 mt-1">This is the name of your company or group.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Organisation name *</label>
                <input
                  required autoFocus
                  value={form.orgName} onChange={set('orgName')}
                  placeholder="Monster Labs Group"
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  URL slug
                  <span className="font-normal text-gray-400 ml-1">(auto-generated)</span>
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
                  <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 shrink-0">
                    app/
                  </span>
                  <input
                    value={form.orgSlug} onChange={set('orgSlug')}
                    placeholder="monster-labs-group"
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors">
                Continue →
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── Step 2: Account ───────────────────────────────────────────── */}
          {step === 'account' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <button type="button" onClick={() => setStep('org')}
                  className="text-xs text-indigo-600 hover:underline mb-2">
                  ← Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
                <p className="text-sm text-gray-500 mt-1">
                  You'll be the super admin of <span className="font-medium text-gray-700">{form.orgName}</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name *</label>
                <input required autoFocus
                  value={form.name} onChange={set('name')}
                  placeholder="Sarah Adeyemi"
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Work email *</label>
                <input required type="email"
                  value={form.email} onChange={set('email')}
                  placeholder="sarah@company.com"
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password *</label>
                <div className="relative">
                  <input required
                    type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={set('password')}
                    placeholder="Min. 8 characters"
                    className={`${inp} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <ul className="mt-2 space-y-1">
                    {PASSWORD_RULES.map(r => {
                      const ok = r.test(form.password);
                      return (
                        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                          <CheckCircle className={`w-3.5 h-3.5 ${ok ? 'text-emerald-500' : 'text-gray-300'}`} />
                          {r.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password *</label>
                <div className="relative">
                  <input required
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm} onChange={set('confirm')}
                    placeholder="Repeat your password"
                    className={`${inp} pr-10 ${form.confirm && !confirmOk ? 'border-red-300 focus:ring-red-400' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirm && !confirmOk && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors">
                {saving ? 'Creating your account…' : 'Create account'}
              </button>

              <p className="text-center text-xs text-gray-400 leading-relaxed">
                By signing up you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
