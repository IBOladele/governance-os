'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = searchParams.get('error');

  // Already logged in → redirect to dashboard
  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  const handleOktaSignIn = async () => {
    setLoading(true);
    await signIn('okta', { callbackUrl: '/dashboard' });
  };

  const ERROR_MESSAGES: Record<string, string> = {
    OAuthSignin:   'Could not initiate Okta sign-in. Please try again.',
    OAuthCallback: 'There was a problem completing the Okta sign-in.',
    OAuthAccountNotLinked: 'This Okta account is not yet provisioned in EntityOS.',
    SessionRequired: 'Please sign in to access EntityOS.',
    default: 'An authentication error occurred. Please try again.',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">EntityOS</p>
                <p className="text-indigo-200 text-xs">GovernanceOS</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Sign in with your Okta account to access the entity management system.
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8 space-y-6">
            {/* Error alert */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default}
                </p>
              </div>
            )}

            {/* SSO button */}
            <button
              onClick={handleOktaSignIn}
              disabled={loading || status === 'loading'}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirecting to Okta…
                </>
              ) : (
                <>
                  {/* Okta icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18a6 6 0 110-12 6 6 0 010 12z"/>
                  </svg>
                  Continue with Okta SSO
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">Authorized users only</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
              <Lock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Single Sign-On (SSO)</p>
                <p className="text-xs text-gray-500">
                  GovernanceOS uses your Okta identity provider. Your access level is determined by your role assignment in Okta.
                  Contact <a href="mailto:it@governanceos.app" className="text-indigo-600 hover:underline">IT</a> if you cannot log in.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} GovernanceOS Holdings Pte. Ltd. · EntityOS v1.0 · Confidential
        </p>
      </div>
    </div>
  );
}
