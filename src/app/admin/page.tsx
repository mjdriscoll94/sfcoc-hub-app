'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import PendingUserQueue from '@/components/PendingUserQueue';
import { Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-white dark:text-white">
            Manage prayer requests, users, and other administrative tasks.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* User Management */}
          <Link
            href="/admin/users"
            className="relative rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#D6805F] dark:hover:border-[#D6805F] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#D6805F]"
          >
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-[#D6805F]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">User Management</p>
              <p className="text-sm text-gray-500 dark:text-white/60">Manage user accounts and approvals</p>
            </div>
          </Link>

          {/* Add Announcement */}
          <Link
            href="/admin/announcements/new"
            className="relative rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#D6805F] dark:hover:border-[#D6805F] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#D6805F]"
          >
            <div className="flex-shrink-0">
              <PlusIcon className="h-6 w-6 text-[#D6805F]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Add Announcement</p>
              <p className="text-sm text-gray-500 dark:text-white/60">Create a new announcement</p>
            </div>
          </Link>

          {/* Directory Management */}
          <Link
            href="/admin/directory"
            className="relative rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#D6805F] dark:hover:border-[#D6805F] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#D6805F]"
          >
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-[#D6805F]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Directory</p>
              <p className="text-sm text-gray-500 dark:text-white/60">Manage church directory</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Prayer Request Approval Queue */}
          <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Prayer Request Approval Queue
            </h2>
            <PrayerRequestApprovalQueue />
          </div>

          {/* Pending User Accounts */}
          <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Pending User Accounts
            </h2>
            <PendingUserQueue />
          </div>
        </div>
      </div>
    </div>
  );
} 