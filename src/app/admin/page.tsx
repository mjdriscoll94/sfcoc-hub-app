'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import PendingUserQueue from '@/components/PendingUserQueue';
import VolunteerOpportunityApprovalQueue from '@/components/VolunteerOpportunityApprovalQueue';
import { Users, FileText, Upload, UsersRound, CalendarDays, Megaphone, Mail, ClipboardList, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/roles';

function AdminMenu({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: LucideIcon;
  items: { href: string; label: string; description: string; icon: LucideIcon }[];
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 text-charcoal">
        <Icon className="h-5 w-5 text-coral" aria-hidden="true" />
        <span className="flex-1 font-semibold">{label}</span>
      </div>
      <div className="border-t border-border px-3 py-2">
        {items.map(({ href, label: itemLabel, description, icon: ItemIcon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ItemIcon className="h-5 w-5 flex-shrink-0 text-coral" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium text-charcoal">{itemLabel}</span>
              <span className="block text-sm text-text-light">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  useEffect(() => {
    document.title = 'Admin Dashboard | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();

  const canAccessAdmin = userProfile?.isAdmin || (
    userProfile?.role && (
      ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageAnnouncements ||
      ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageLifeGroups
    )
  );
  const canManageVolunteer = userProfile?.isAdmin || (
    userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageVolunteerOpportunities
  );
  const canAssignServiceRoles = userProfile?.isAdmin || (
    userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canAssignServiceRoles
  );
  const canManageLifeGroups = userProfile?.isAdmin || (
    !!userProfile?.role && ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageLifeGroups
  );

  useEffect(() => {
    if (userProfile && !canAccessAdmin) {
      router.push('/');
      return;
    }
  }, [userProfile, canAccessAdmin, router]);

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-text-light">
            Manage prayer requests, users, and other administrative tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <AdminMenu
            label="People & Groups"
            icon={Users}
            items={[
              ...(userProfile?.isAdmin ? [{ href: '/admin/users', label: 'User Management', description: 'Manage user accounts and approvals', icon: Users }] : []),
              ...(canManageLifeGroups ? [{ href: '/admin/life-groups', label: 'Life Groups', description: 'Manage life groups and members', icon: Users }] : []),
              ...(userProfile?.isAdmin ? [{ href: '/admin/attendance', label: 'Attendance', description: 'Track Sunday household attendance', icon: ClipboardList }] : []),
            ]}
          />
          <AdminMenu
            label="Email & Communication"
            icon={Mail}
            items={[
              ...(canAccessAdmin ? [{ href: '/admin/announcements/new', label: 'Add Announcement', description: 'Create a new announcement', icon: PlusIcon as unknown as LucideIcon }] : []),
              ...(userProfile?.isAdmin ? [
                { href: '/admin/send-email', label: 'Send Email', description: 'Broadcast to members or send a test', icon: Mail },
                { href: '/admin/send-email/lists', label: 'Email Lists', description: 'Manage custom email lists and groups', icon: Users },
                { href: '/admin/announcements', label: 'Manage Announcements', description: 'View, edit, or delete announcements', icon: Megaphone },
              ] : []),
            ]}
          />
          <AdminMenu
            label="Events & Scheduling"
            icon={CalendarDays}
            items={[
              ...(userProfile?.isAdmin || canManageVolunteer || canAssignServiceRoles ? [{ href: '/admin/calendar', label: 'Calendar', description: 'Add and manage church calendar events', icon: CalendarDays }] : []),
              ...(canAssignServiceRoles ? [{ href: '/service-roles', label: 'Service Roles', description: 'Manage Sunday service assignments', icon: Users }] : []),
              ...(canManageVolunteer ? [{ href: '/admin/volunteer', label: 'Volunteer Opportunities', description: 'Manage volunteer opportunities', icon: UsersRound }] : []),
              ...(userProfile?.isAdmin ? [{ href: '/admin/events', label: 'Home Page Events', description: 'Manage events shown on the home page', icon: CalendarDays }] : []),
            ]}
          />
          <AdminMenu
            label="Content Management"
            icon={FileText}
            items={userProfile?.isAdmin ? [
              { href: '/admin/bulletin', label: 'Upload Bulletin', description: 'Manage and upload weekly bulletins', icon: FileText },
              { href: '/admin/lesson-notes', label: 'Upload Sermon Notes', description: 'Manage and upload lesson notes', icon: Upload },
            ] : []}
          />
          {userProfile?.isAdmin && (
            <Link href="/admin/prayer-requests" className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-4 font-semibold text-charcoal shadow-sm hover:border-coral hover:shadow-md">
              <FileText className="h-5 w-5 text-coral" aria-hidden="true" />
              Manage Prayer Requests
            </Link>
          )}
        </div>

        {/* Approval Queues */}
        <div>
          <h2 className="text-lg font-semibold text-charcoal mb-3">Approvals & Pending Items</h2>
          <div className="grid grid-cols-1 gap-8">
          {/* Prayer Request Approval Queue - Admin only */}
          {userProfile?.isAdmin && (
          <div className="bg-white rounded-lg p-6 border border-border shadow">
            <h2 className="text-xl font-semibold text-charcoal mb-4 sm:text-left text-center">
              Prayer Request Approval Queue
            </h2>
            <PrayerRequestApprovalQueue />
          </div>
          )}

          {/* Volunteer Opportunity Approval Queue - Admin and Organizer */}
          {canManageVolunteer && (
          <div className="bg-white rounded-lg p-6 border border-border shadow">
            <h2 className="text-xl font-semibold text-charcoal mb-4 sm:text-left text-center">
              Volunteer Opportunity Approval Queue
            </h2>
            <VolunteerOpportunityApprovalQueue />
          </div>
          )}

          {/* Pending User Accounts - Admin only */}
          {userProfile?.isAdmin && (
          <div className="bg-white rounded-lg p-6 border border-border shadow">
            <h2 className="text-xl font-semibold text-charcoal mb-4 sm:text-left text-center">
              Pending User Accounts
            </h2>
            <PendingUserQueue />
          </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
} 
