'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import PendingUserQueue from '@/components/PendingUserQueue';
import VolunteerOpportunityApprovalQueue from '@/components/VolunteerOpportunityApprovalQueue';
import BuildInfo from '@/components/BuildInfo';
import { Users, FileText, Upload, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  useEffect(() => {
    document.title = 'Admin Dashboard | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      router.push('/');
      return;
    }
  }, [userProfile, router]);

  if (!userProfile?.isAdmin) {
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
          {/* User Management */}
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

          {/* Add Announcement */}
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

          {/* Directory Management */}
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

          {/* Upload Sermon Notes */}
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

          {/* Volunteer Opportunity Management */}
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
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Prayer Request Approval Queue */}
          <div className="bg-white rounded-lg p-6 border border-border shadow">
            <h2 className="text-xl font-semibold text-charcoal mb-4 sm:text-left text-center">
              Prayer Request Approval Queue
            </h2>
            <PrayerRequestApprovalQueue />
          </div>

          {/* Volunteer Opportunity Approval Queue */}
          <div className="bg-white rounded-lg p-6 border border-border shadow">
            <h2 className="text-xl font-semibold text-charcoal mb-4 sm:text-left text-center">
              Volunteer Opportunity Approval Queue
            </h2>
            <VolunteerOpportunityApprovalQueue />
          </div>

          {/* Pending User Accounts */}
          <div className="bg-white rounded-lg p-6 border border-border shadow">
            <h2 className="text-xl font-semibold text-charcoal mb-4 sm:text-left text-center">
              Pending User Accounts
            </h2>
            <PendingUserQueue />
          </div>
        </div>

        {/* Build Information */}
        <BuildInfo />
      </div>
    </div>
  );
} 