'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ROLE_PERMISSIONS } from '@/types/roles';

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

  // Admin or organizer can access admin routes (organizer has limited access enforced per-page)
  const canAccessAdmin = userProfile?.isAdmin || (
    userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageAnnouncements
  );

  useEffect(() => {
    if (!loading) {
      const requiresAuth = protectedPaths.some(path => pathname?.startsWith(path));
      const requiresAdmin = adminPaths.some(path => pathname?.startsWith(path));

      if (requiresAuth && !user) {
        console.log('RouteGuard: Unauthorized access attempt, redirecting to signin');
        router.push(`/auth/signin?redirect=${encodeURIComponent(pathname || '/')}`);
      } else if (requiresAdmin && !canAccessAdmin) {
        console.log('RouteGuard: No admin/organizer access, redirecting to home');
        router.push('/');
      }
    }
  }, [loading, user, userProfile, pathname, router, canAccessAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  const requiresAuth = protectedPaths.some(path => pathname?.startsWith(path));
  if (requiresAuth && !user) {
    return null;
  }

  const requiresAdmin = adminPaths.some(path => pathname?.startsWith(path));
  if (requiresAdmin && !canAccessAdmin) {
    return null;
  }

  return <>{children}</>;
} 