'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from '@/types/roles';

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/auth/signin');
      } else if (userProfile && !userProfile.isAdmin && 
                 (!userProfile.role || !ROLE_PERMISSIONS[userProfile.role]?.canAccessDirectory)) {
        router.replace('/');
      }
    }
  }, [user, userProfile, authLoading, router]);

  if (authLoading) {
    return null;
  }

  return <>{children}</>;
} 