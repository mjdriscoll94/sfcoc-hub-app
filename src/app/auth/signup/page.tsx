'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
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
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 pt-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="text-center text-3xl font-bold text-text uppercase tracking-wide">
            Create your account
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="display-name" className="sr-only">
                Display Name
              </label>
              <input
                id="display-name"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-sage/20 placeholder-text/50 text-text bg-card rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Display Name"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-sage/20 placeholder-text/50 text-text bg-card focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-sage/20 placeholder-text/50 text-text bg-card rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
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

          {success && (
            <div className="rounded-md bg-success/10 p-4 border border-success/20">
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
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-on-primary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary uppercase tracking-wide ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
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
  );
} 