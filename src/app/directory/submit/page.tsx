'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import DirectorySubmissionForm from '@/components/DirectorySubmissionForm';
import { ROLE_PERMISSIONS } from '@/types/roles';
import BackButton from '@/components/BackButton';

export default function DirectorySubmitPage() {
  const { userProfile } = useAuth();

  // Check if user has permission to submit to directory
  const canSubmitToDirectory = userProfile && (
    userProfile.isAdmin || // Legacy admin check
    (userProfile.role && ROLE_PERMISSIONS[userProfile.role]?.canAccessDirectory) // New role check
  );

  if (!canSubmitToDirectory) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#171717] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
            <p className="text-center text-white/60 dark:text-white/60">
              You do not have permission to submit directory information. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-white dark:text-white">Submit Directory Information</h1>
      </div>
      <DirectorySubmissionForm />
    </div>
  );
} 