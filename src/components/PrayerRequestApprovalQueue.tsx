'use client';

import { usePrayerPraise, PrayerPraiseItem } from '@/hooks/usePrayerPraise';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function PrayerRequestApprovalQueue() {
  const { items, loading, error, updateApprovalStatus } = usePrayerPraise(undefined, true);

  const pendingItems = items.filter(item => item.approvalStatus === 'pending');

  const handleApprove = async (id: string) => {
    try {
      await updateApprovalStatus(id, 'approved');
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateApprovalStatus(id, 'rejected');
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        {error}
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <div className="bg-white dark:bg-transparent">
        <div className="bg-white dark:bg-transparent rounded-lg p-6">
          <div className="text-gray-900 dark:text-gray-500 text-center py-4">
            No pending prayer requests to approve.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Pending Prayer Requests</h2>
      <div className="space-y-4">
        {pendingItems.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-black dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.type === 'prayer' ? 'Prayer Request' : 'Praise Report'} by{' '}
                  {item.isAnonymous ? 'Anonymous' : item.author.name} •{' '}
                  {item.dateCreated.toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Reject
                </button>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              {item.description}
            </p>
            {item.isAdminOnly && (
              <p className="text-xs text-amber-500">
                Note: This request will only be visible to admins
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 