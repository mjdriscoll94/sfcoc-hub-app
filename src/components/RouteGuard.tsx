'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const protectedPaths = [
  '/prayer-board',
  '/announcements',
  '/volunteer',
  '/admin',
  '/calendar',
  '/settings',
  '/directory'
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
        console.log('RouteGuard: Unauthorized access attempt, redirecting to signin');
        // Redirect to login if not authenticated
        router.push(`/auth/signin?redirect=${encodeURIComponent(pathname || '/')}`);
      } else if (requiresAdmin && !userProfile?.isAdmin) {
        console.log('RouteGuard: Non-admin access attempt, redirecting to home');
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

  // If the path requires auth and there's no user, don't render children
  const requiresAuth = protectedPaths.some(path => pathname?.startsWith(path));
  if (requiresAuth && !user) {
    return null;
  }

  // If the path requires admin and the user isn't an admin, don't render children
  const requiresAdmin = adminPaths.some(path => pathname?.startsWith(path));
  if (requiresAdmin && !userProfile?.isAdmin) {
    return null;
  }

  return <>{children}</>;
} 