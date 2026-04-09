'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

function readActionParams(): { mode: string | null; oobCode: string | null } {
  if (typeof window === 'undefined') {
    return { mode: null, oobCode: null };
  }
  const q = new URLSearchParams(window.location.search);
  let oobCode = q.get('oobCode');
  let mode = q.get('mode');
  if (!oobCode) {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const hq = new URLSearchParams(hash);
      oobCode = hq.get('oobCode');
      mode = mode || hq.get('mode');
    }
  }
  return { mode, oobCode };
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const resolveCode = useCallback(() => {
    const fromNext = searchParams.get('oobCode');
    const modeNext = searchParams.get('mode');
    if (fromNext) {
      return { mode: modeNext, oobCode: fromNext };
    }
    return readActionParams();
  }, [searchParams]);

  useEffect(() => {
    document.title = 'Set new password | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { mode, oobCode: code } = resolveCode();
      if (mode !== 'resetPassword' || !code) {
        if (!cancelled) {
          setOobCode(null);
          setLoading(false);
        }
        return;
      }
      try {
        const email = await verifyPasswordResetCode(auth, code);
        if (!cancelled) {
          setOobCode(code);
          setEmailHint(email);
        }
      } catch {
        if (!cancelled) {
          setOobCode(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolveCode, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!oobCode) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reset password. Request a new link.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center px-4 py-8">
        <div className="max-w-md w-full card p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-charcoal">Password updated</h2>
          <p className="text-sm text-text-light">You can sign in with your new password.</p>
          <Link
            href="/auth/signin"
            className="inline-flex justify-center w-full py-2 px-4 rounded-md text-on-primary bg-primary font-semibold text-sm hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!oobCode) {
    return (
      <div className="flex flex-col items-center px-4 py-8">
        <div className="max-w-md w-full card p-8 space-y-4">
          <div className="flex flex-col items-center">
            <Image src="/images/logo_colored.svg" alt="" width={64} height={64} className="mb-4" />
            <h2 className="text-xl font-bold text-charcoal text-center">Link invalid or expired</h2>
          </div>
          <p className="text-sm text-text-light text-center">
            This password reset link can&apos;t be used. Request a new one and try again.
          </p>
          <Link
            href="/auth/forgot-password"
            className="block text-center py-2 px-4 rounded-md text-on-primary bg-primary font-semibold text-sm"
          >
            Request a new link
          </Link>
          <div className="text-center">
            <Link href="/auth/signin" className="text-sm text-primary font-medium">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-md w-full">
        <div className="card p-8 space-y-6">
          <div className="flex flex-col items-center">
            <Image
              src="/images/logo_colored.svg"
              alt="Sioux Falls Church of Christ"
              width={80}
              height={80}
              className="mb-6"
            />
            <h2 className="text-center text-2xl font-bold text-text uppercase tracking-wide">Set a new password</h2>
            {emailHint && (
              <p className="text-center text-sm text-text-light mt-2">
                Account: <span className="text-charcoal font-medium">{emailHint}</span>
              </p>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-charcoal mb-1">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-sage/20 rounded-md bg-card text-text focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-charcoal mb-1">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="block w-full px-3 py-2 border border-sage/20 rounded-md bg-card text-text focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            {error && (
              <div className="rounded-md bg-error/10 p-3 border border-error/20 text-sm text-error">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 rounded-md text-on-primary bg-primary font-semibold text-sm uppercase tracking-wide hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>

          <div className="text-center">
            <Link href="/auth/signin" className="text-sm font-medium text-primary hover:opacity-80">
              Cancel and sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
