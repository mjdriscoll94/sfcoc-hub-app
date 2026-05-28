'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { ChurchCalendar } from '@/components/calendar/ChurchCalendar';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/roles';

export default function AdminCalendarPage() {
  const { userProfile } = useAuth();
  const router = useRouter();

  const canAccess =
    userProfile?.isAdmin ||
    (userProfile?.role &&
      (ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageVolunteerOpportunities ||
        ROLE_PERMISSIONS[userProfile.role as UserRole]?.canAssignServiceRoles));

  useEffect(() => {
    document.title = 'Admin Calendar | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canAccess) {
      router.push('/');
    }
  }, [userProfile, canAccess, router]);

  if (!canAccess) return null;

  return (
    <ChurchCalendar
      backHref="/admin"
      backLabel="Back to admin"
      title="Calendar"
    />
  );
}
