'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PendingUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  approvalStatus: 'pending' | 'rejected';
  createdAt: Date;
}

export default function PendingUserQueue() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('approvalStatus', 'in', ['pending', 'rejected']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          approvalStatus: data.approvalStatus,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as PendingUser;
      });
      setUsers(pendingUsers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching pending users:', error);
      setError('Failed to load pending users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApproval = async (uid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approvalStatus: status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      setError('Failed to update user status');
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

  if (users.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-4">
        No pending user accounts to review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.uid}
          className="bg-white/5 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium text-black dark:text-white">
                {user.displayName || 'No display name'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user.email} • {user.createdAt.toLocaleDateString()}
              </p>
              <p className="text-sm mt-1">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.approvalStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                  {user.approvalStatus.charAt(0).toUpperCase() + user.approvalStatus.slice(1)}
                </span>
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleApproval(user.uid, 'approved')}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Approve
              </button>
              {user.approvalStatus === 'pending' && (
                <button
                  onClick={() => handleApproval(user.uid, 'rejected')}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 