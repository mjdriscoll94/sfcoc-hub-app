'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import DirectorySubmissionForm from '@/components/DirectorySubmissionForm';
import { ROLE_PERMISSIONS } from '@/types/roles';

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
            <p className="text-center text-gray-500 dark:text-white/60">
              You do not have permission to submit directory information. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#171717] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Submit Directory Information</h1>
            <p className="text-gray-600 dark:text-white/60 mb-8">
              Please fill out the form below to submit your information to the church directory. 
              An administrator will review your submission before it appears in the directory.
            </p>
            <DirectorySubmissionForm />
          </div>
        </div>
      </div>
    </div>
  );
} 