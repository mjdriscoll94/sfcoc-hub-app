'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';

export default function SignUpPage() {
  useEffect(() => {
    document.title = 'Sign Up | Sioux Falls Church of Christ';
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); 
    setSuccess(null);

    try {
      await signUp(email, password, displayName);
      setSuccess('Your account has been created and is pending approval. You will be notified when an administrator approves your account.');
      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'We could not submit your access request.';
      if (message.toLowerCase().includes('pending approval')) {
        setSuccess('Your request was submitted. Church staff will review it before you can sign in.');
        setEmail('');
        setPassword('');
        setDisplayName('');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
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
            <h1 className="text-center text-3xl font-bold text-text">Request member access</h1>
            <p className="mt-2 text-center text-base text-text-light">
              Submit your information for church staff to review. You will be able to sign in after your request is approved.
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
          <p className="text-sm text-text-light">All fields are required.</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="display-name" className="mb-2 block font-semibold text-charcoal">
                Full name
              </label>
              <input
                id="display-name"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="relative block min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-base text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="First and last name"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="mb-2 block font-semibold text-charcoal">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-base text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block font-semibold text-charcoal">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-base text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-describedby="password-help"
              />
              <p id="password-help" className="mt-2 text-sm text-text-light">Use at least 6 characters.</p>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-md bg-error/10 p-4 border border-error/20">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div role="status" className="rounded-md bg-success/10 p-4 border border-success/20">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-success">
                    {success}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative flex min-h-12 w-full justify-center rounded-lg border border-transparent bg-charcoal px-4 py-3 text-base font-bold text-white hover:bg-charcoal-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Submitting request…' : 'Request member access'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="font-medium text-primary hover:opacity-80"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
