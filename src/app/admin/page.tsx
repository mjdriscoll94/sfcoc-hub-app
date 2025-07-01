'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserProfile } from '@/types';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import PendingUserQueue from '@/components/PendingUserQueue';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Users } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      router.push('/');
      return;
    }

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              uid: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as UserProfile;
          });
        setUsers(usersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userProfile, router]);

  if (!userProfile?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage prayer requests, users, and other administrative tasks.
          </p>
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

          {/* User Management */}
          <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-gray-400 dark:text-gray-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral mx-auto"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-4">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {users.map((user) => (
                      <tr key={user.uid}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.displayName || 'No display name'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {user.role || 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.approvalStatus === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              : user.approvalStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                          }`}>
                            {user.approvalStatus?.charAt(0).toUpperCase() + user.approvalStatus?.slice(1) || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 