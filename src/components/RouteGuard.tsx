'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const protectedPaths = [
  '/prayer-board',
  '/announcements',
  '/volunteer',
  '/admin',
  '/calendar'
];

const adminPaths = ['/admin'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // Check if the current path requires protection
      const requiresAuth = protectedPaths.some(path => pathname?.startsWith(path));
      const requiresAdmin = adminPaths.some(path => pathname?.startsWith(path));

      if (requiresAuth && !user) {
        // Redirect to login if not authenticated
        router.push(`/auth/signin?redirect=${encodeURIComponent(pathname || '/')}`);
      } else if (requiresAdmin && !userProfile?.isAdmin) {
        // Redirect to home if not admin
        router.push('/');
      }
    }
  }, [loading, user, userProfile, pathname, router]);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  return <>{children}</>;
} 