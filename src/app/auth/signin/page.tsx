'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Image from 'next/image';

interface FirebaseError extends Error {
  code?: string;
}

export default function SignInPage() {
  useEffect(() => {
    document.title = 'Sign In | Sioux Falls Church of Christ';
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [user, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (error) {
      const firebaseError = error as FirebaseError;
      setError(firebaseError.message || 'An error occurred during sign in');
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
            <h1 className="text-center text-3xl font-bold text-text">Member sign in</h1>
            <p className="mt-2 text-center text-base text-text-light">
              Sign in to view announcements, the church calendar, Prayer Board, and other member information.
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-base text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-error/10 p-4 border border-error/20">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative flex min-h-12 w-full justify-center rounded-lg border border-transparent bg-charcoal px-4 py-3 text-base font-bold text-white hover:bg-charcoal-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-primary hover:opacity-80"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signup"
              className="font-medium text-primary hover:opacity-80"
            >
              Need an account? Request member access
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
