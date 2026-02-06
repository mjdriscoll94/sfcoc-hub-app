'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import PendingUserQueue from '@/components/PendingUserQueue';
import VolunteerOpportunityApprovalQueue from '@/components/VolunteerOpportunityApprovalQueue';
import BuildInfo from '@/components/BuildInfo';
import { Users, FileText, Upload, UsersRound, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ROLE_PERMISSIONS } from '@/types/roles';

export default function AdminDashboard() {
  useEffect(() => {
    document.title = 'Admin Dashboard | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();

  const canAccessAdmin = userProfile?.isAdmin || (
    userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageAnnouncements
  );
  const canManageVolunteer = userProfile?.isAdmin || (
    userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageVolunteerOpportunities
  );
  const canAssignServiceRoles = userProfile?.isAdmin || (
    userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canAssignServiceRoles
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

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* User Management - Admin only */}
          {userProfile?.isAdmin && (
          <Link
            href="/admin/users"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-semibold text-charcoal">User Management</p>
              <p className="text-sm text-text-light">Manage user accounts and approvals</p>
            </div>
          </Link>
          )}

          {/* Add Announcement - Admin and Organizer */}
          {canAccessAdmin && (
          <Link
            href="/admin/announcements/new"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <PlusIcon className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Add Announcement</p>
              <p className="text-sm text-text-light">Create a new announcement</p>
            </div>
          </Link>
          )}

          {/* Directory Management - Admin only */}
          {userProfile?.isAdmin && (
          <Link
            href="/admin/directory"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Directory</p>
              <p className="text-sm text-text-light">Manage church directory</p>
            </div>
          </Link>
          )}

          {/* Upload Sermon Notes - Admin only */}
          {userProfile?.isAdmin && (
          <Link
            href="/admin/lesson-notes"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <Upload className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Upload Sermon Notes</p>
              <p className="text-sm text-text-light">Manage and upload lesson notes</p>
            </div>
          </Link>
          )}

          {/* Upload Bulletin - Admin only */}
          {userProfile?.isAdmin && (
          <Link
            href="/admin/bulletin"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Upload Bulletin</p>
              <p className="text-sm text-text-light">Manage and upload weekly bulletins</p>
            </div>
          </Link>
          )}

          {/* Volunteer Opportunity Management - Admin and Organizer */}
          {canManageVolunteer && (
          <Link
            href="/admin/volunteer"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <UsersRound className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Volunteer Opportunities</p>
              <p className="text-sm text-text-light">Manage volunteer opportunities</p>
            </div>
          </Link>
          )}

          {/* Service Roles - Admin and Organizer */}
          {canAssignServiceRoles && (
          <Link
            href="/service-roles"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Service Roles</p>
              <p className="text-sm text-text-light">Manage Sunday service role assignments</p>
            </div>
          </Link>
          )}

          {/* Home Page Events - Admin only */}
          {userProfile?.isAdmin && (
          <Link
            href="/admin/events"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <CalendarDays className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Home Page Events</p>
              <p className="text-sm text-text-light">Manage events displayed on the home page</p>
            </div>
          </Link>
          )}

          {/* Life Groups Management - Admin only */}
          {userProfile?.isAdmin && (
          <Link
            href="/admin/life-groups"
            className="relative rounded-lg border border-border bg-white px-6 py-5 shadow hover:shadow-md flex items-center space-x-3 hover:border-coral transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
          >
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-coral" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-charcoal">Life Groups</p>
              <p className="text-sm text-text-light">Manage life groups and members</p>
            </div>
          </Link>
          )}
        </div>

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

        {/* Build Information */}
        <BuildInfo />
      </div>
    </div>
  );
} 