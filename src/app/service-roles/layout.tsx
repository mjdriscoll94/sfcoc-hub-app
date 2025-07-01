'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServiceRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin');
    }
  }, [user, authLoading, router]);

  return <>{children}</>;
} 