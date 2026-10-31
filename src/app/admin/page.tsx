'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  Mail,
  ShieldCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ROLE_PERMISSIONS } from '@/types/roles';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import PendingUserQueue from '@/components/PendingUserQueue';
import VolunteerOpportunityApprovalQueue from '@/components/VolunteerOpportunityApprovalQueue';

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: typeof Users;
};

export default function ManageChurchOverview() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const permissions = userProfile?.role ? ROLE_PERMISSIONS[userProfile.role] : null;
  const isAdmin = Boolean(userProfile?.isAdmin);
  const canManageAnnouncements = isAdmin || Boolean(permissions?.canManageAnnouncements);
  const canManageVolunteer = isAdmin || Boolean(permissions?.canManageVolunteerOpportunities);
  const canManageLifeGroups = isAdmin || Boolean(permissions?.canManageLifeGroups);
  const canManageAttendance = isAdmin || Boolean(permissions?.canManageAttendance);
  const canAssignServiceRoles = isAdmin || Boolean(permissions?.canAssignServiceRoles);
  const canSendEmail = isAdmin || canManageAnnouncements || canManageLifeGroups;
  const canAccessManageChurch = isAdmin || canManageAnnouncements || canManageLifeGroups || canManageAttendance;

  useEffect(() => {
    document.title = 'Manage Church | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canAccessManageChurch) router.push('/');
  }, [userProfile, canAccessManageChurch, router]);

  if (!canAccessManageChurch) return null;

  const quickActions: QuickAction[] = [
    ...(canManageAnnouncements ? [{ href: '/admin/announcements/new', label: 'Post an announcement', description: 'Share an update with the church family.', icon: BellRing }] : []),
    ...(isAdmin || canManageVolunteer || canAssignServiceRoles ? [{ href: '/admin/calendar', label: 'Update the calendar', description: 'Add or manage church events.', icon: CalendarDays }] : []),
    ...(canManageAttendance ? [{ href: '/admin/attendance', label: 'Take attendance', description: 'Record Sunday household attendance.', icon: ClipboardCheck }] : []),
    ...(canManageVolunteer ? [{ href: '/admin/volunteer', label: 'Manage volunteers', description: 'Create and update volunteer opportunities.', icon: UsersRound }] : []),
    ...(canSendEmail ? [{ href: '/admin/send-email', label: 'Send an email', description: 'Contact members or a saved email list.', icon: Mail }] : []),
    ...(isAdmin ? [{ href: '/admin/users', label: 'Manage users', description: 'Review accounts, roles, and access.', icon: Users }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <header>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-coral/15 p-3 text-coral-dark"><ShieldCheck aria-hidden="true" className="h-7 w-7" /></span>
          <div>
            <p className="font-semibold text-coral-dark">Authorized workspace</p>
            <h1 className="text-3xl font-bold text-charcoal sm:text-4xl">Manage Church</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-lg text-text-light">
          Review items that need attention, then go directly to the task you need.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-2xl font-bold text-charcoal">Needs attention</h2>
        <p className="mt-1 text-text-light">Pending approvals and follow-up items appear here.</p>
        <div className="mt-5 grid gap-6">
          {isAdmin ? (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-xl font-bold text-charcoal">Pending member accounts</h3>
              <PendingUserQueue />
            </div>
          ) : null}
          {isAdmin ? (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-xl font-bold text-charcoal">Prayer request approvals</h3>
              <PrayerRequestApprovalQueue />
            </div>
          ) : null}
          {canManageVolunteer ? (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-xl font-bold text-charcoal">Volunteer opportunity approvals</h3>
              <VolunteerOpportunityApprovalQueue />
            </div>
          ) : null}
          {!isAdmin && !canManageVolunteer ? (
            <div className="rounded-2xl border border-border bg-white p-6 text-text-light">
              No approval queues are assigned to your role.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="common-tasks-heading">
        <h2 id="common-tasks-heading" className="text-2xl font-bold text-charcoal">Common tasks</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group flex min-h-32 items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm hover:border-coral hover:shadow-md">
                <span className="rounded-lg bg-coral/15 p-2 text-coral-dark"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-charcoal">{action.label}</span>
                  <span className="mt-1 block text-sm text-text-light">{action.description}</span>
                </span>
                <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-text-muted group-hover:text-coral-dark" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
