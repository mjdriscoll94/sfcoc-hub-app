'use client';

import { useState } from 'react';
import { usePrayerPraise, PrayerPraiseItem } from '@/hooks/usePrayerPraise';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface EditingItem {
  id: string;
  title: string;
  description: string;
  priority: 'Urgent' | 'Batched' | '';
}

export default function PrayerRequestApprovalQueue() {
  const { items, loading, error, updateApprovalStatus, updatePrayerRequest } = usePrayerPraise(undefined, true);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const pendingItems = items.filter(item => item.approvalStatus === 'pending');

  const handleApprove = async (id: string) => {
    try {
      if (editingItem?.id === id && !editingItem.priority) {
        throw new Error('Please select a priority before approving');
      }
      await updateApprovalStatus(id, 'approved');
      if (editingItem?.id === id) {
        await updatePrayerRequest(id, {
          title: editingItem.title,
          description: editingItem.description,
          priority: editingItem.priority as 'Urgent' | 'Batched'
        });
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateApprovalStatus(id, 'rejected');
      if (editingItem?.id === id) {
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleEdit = (item: PrayerPraiseItem) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      description: item.description,
      priority: item.priority || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
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
              <div className="flex-1">
                {editingItem?.id === item.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 rounded-md text-white"
                    />
                    <textarea
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 rounded-md text-white min-h-[100px]"
                    />
                    <select
                      value={editingItem.priority}
                      onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as 'Urgent' | 'Batched' | '' })}
                      className="w-full px-3 py-2 bg-white/10 rounded-md text-white"
                      required
                    >
                      <option value="">Select Priority</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Batched">Batched</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-black dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.type === 'prayer' ? 'Prayer Request' : 'Praise Report'} by{' '}
                      {item.isAnonymous ? 'Anonymous' : item.author.name} •{' '}
                      {item.dateCreated.toLocaleDateString()}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">
                      {item.description}
                    </p>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                {editingItem?.id === item.id ? (
                  <>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Save & Approve
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
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
                  </>
                )}
              </div>
            </div>
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