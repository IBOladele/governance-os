'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Globe, Lock, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin:            'Could not initiate Okta sign-in. Please try again.',
  OAuthCallback:          'There was a problem completing the Okta sign-in.',
  OAuthAccountNotLinked:  'This Okta account is not yet provisioned in EntityOS.',
  SessionRequired:        'Please sign in to access EntityOS.',
  CredentialsSignin:      'Invalid email or password.',
  EmailNotVerified:       'Please verify your email address before signing in. Check your inbox for the verification link.',
  VerifyFailed:           'That verification link is invalid or has expired. Please sign up again or contact support.',
  default:                'An authentication error occurred. Please try again.',
};

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const verified = searchParams.get('verified') === '1';

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    const res = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      router.replace('/dashboard');
    } else {
      setFormError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">EntityOS</p>
                <p className="text-indigo-200 text-xs">Entity Management Platform</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-indigo-200 text-sm mt-1">Sign in to access your entity portfolio.</p>
          </div>

          {/* Body */}
          <div className="px-8 py-8 space-y-5">
            {/* Email verified success banner */}
            {verified && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">Email verified! You can now sign in.</p>
              </div>
            )}

            {/* URL-level error (from NextAuth redirect) */}
            {error && !verified && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default}</p>
              </div>
            )}

            {/* Credentials form */}
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <Link href="/forgot-password" className="hover:text-indigo-600 transition-colors">
                Forgot password?
              </Link>
              <Link href="/signup" className="hover:text-indigo-600 transition-colors">
                Create account
              </Link>
            </div>

            {/* Footer note */}
            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
              <Lock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                Access is restricted to authorised users only. Contact your administrator if you cannot sign in.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} EntityOS · Confidential
        </p>
      </div>
    </div>
  );
}
