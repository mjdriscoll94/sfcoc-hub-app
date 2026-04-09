'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Forgot password | Sioux Falls Church of Christ';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong.');
        setStatus('idle');
        return;
      }
      setStatus('done');
    } catch {
      setError('Network error. Try again.');
      setStatus('idle');
    }
  };

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
            <h2 className="text-center text-2xl font-bold text-text uppercase tracking-wide">
              Reset your password
            </h2>
            <p className="text-center text-sm text-text-light mt-2">
              Enter the email you use for your account. If we find it, we&apos;ll send a link to choose a new password.
            </p>
          </div>

          {status === 'done' ? (
            <div className="rounded-md bg-sage/10 border border-sage/30 p-4 text-sm text-text">
              <p className="font-medium text-charcoal mb-2">Check your email</p>
              <p>
                If an account exists for that address, we sent password reset instructions. The link expires after a
                while for security.
              </p>
              <p className="mt-4">
                <Link href="/auth/signin" className="font-medium text-primary hover:opacity-80">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-charcoal mb-1">
                  Email
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-sage/20 placeholder-text/50 text-text bg-card rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="rounded-md bg-error/10 p-3 border border-error/20 text-sm text-error">{error}</div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-on-primary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary uppercase tracking-wide disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending…' : 'Send reset link'}
              </button>

              <div className="text-center">
                <Link href="/auth/signin" className="text-sm font-medium text-primary hover:opacity-80">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
