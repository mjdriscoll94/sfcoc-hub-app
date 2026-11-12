'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleCapabilities } from '@/types/roles';

const protectedPaths = [
  '/prayer-board',
  '/announcements',
  '/volunteer',
  '/admin',
  '/calendar',
  '/life-groups',
  '/settings',
  '/directory'
];

const adminPaths = ['/admin'];
const leadershipPaths = ['/resources/leadership-development'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Per-page enforcement still controls which Manage Church tools each authorized role can use.
  const canAccessAdmin = getRoleCapabilities(userProfile).canAccessManageChurch;
  const canAccessLeadership = getRoleCapabilities(userProfile).canAccessLeadershipDevelopment;

  useEffect(() => {
    if (!loading) {
      const requiresLeadership = leadershipPaths.some(path => pathname?.startsWith(path));
      const requiresAuth = protectedPaths.some(path => pathname?.startsWith(path)) || requiresLeadership;
      const requiresAdmin = adminPaths.some(path => pathname?.startsWith(path));

      if (requiresAuth && !user) {
        console.log('RouteGuard: Unauthorized access attempt, redirecting to signin');
        router.push(`/auth/signin?redirect=${encodeURIComponent(pathname || '/')}`);
      } else if (requiresAdmin && !canAccessAdmin) {
        console.log('RouteGuard: No admin/organizer access, redirecting to home');
        router.push('/');
      } else if (requiresLeadership && !canAccessLeadership) {
        router.push('/resources');
      }
    }
  }, [loading, user, userProfile, pathname, router, canAccessAdmin, canAccessLeadership]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  const requiresLeadership = leadershipPaths.some(path => pathname?.startsWith(path));
  const requiresAuth = protectedPaths.some(path => pathname?.startsWith(path)) || requiresLeadership;
  if (requiresAuth && !user) {
    return null;
  }

  const requiresAdmin = adminPaths.some(path => pathname?.startsWith(path));
  if (requiresAdmin && !canAccessAdmin) {
    return null;
  }

  if (requiresLeadership && !canAccessLeadership) return null;

  return <>{children}</>;
}
