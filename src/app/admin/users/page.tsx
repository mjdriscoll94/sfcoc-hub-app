'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { UserPlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

// Add CheckIcon and XMarkIcon components at the top
const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  disabled?: boolean;
  customClaims?: { admin: boolean };
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const router = useRouter();

  // Redirect if not admin
  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [userProfile, router]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const userData: UserData[] = [];
        
        // Process each user and ensure they have an approvalStatus
        const batch: Promise<void>[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAtDate = data.createdAt?.toDate?.() || new Date();
          
          const processedData: UserData = {
            uid: doc.id,
            email: data.email || null,
            displayName: data.displayName || null,
            isAdmin: data.isAdmin || false,
            createdAt: createdAtDate.toISOString(),
            approvalStatus: data.approvalStatus || 'approved',
            disabled: data.disabled || false,
            customClaims: data.customClaims
          };
          
          // Set default approvalStatus if it's undefined
          if (!data.approvalStatus) {
            batch.push(updateDoc(doc.ref, { approvalStatus: 'approved' }));
          }
          
          userData.push(processedData);
        });
        
        // Update any users that needed default approvalStatus
        if (batch.length > 0) {
          await Promise.all(batch);
        }
        
        setUsers(userData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleApproval = async (uid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approvalStatus: status
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.uid === uid 
          ? { ...user, approvalStatus: status }
          : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
    }
  };

  const getStatusBadgeColor = (status: string = 'approved') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMakeAdmin = async (uid: string) => {
    try {
      const response = await fetch('/api/admin/users/make-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to make user admin');
      }

      // Update the local state
      setUsers(users.map(u => {
        if (u.uid === uid) {
          return {
            ...u,
            customClaims: { ...u.customClaims, admin: true }
          };
        }
        return u;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const handleEnableUser = async (uid: string) => {
    try {
      const response = await fetch('/api/admin/users/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to enable user');
      }

      // Update the local state
      setUsers(users.map(u => {
        if (u.uid === uid) {
          return { ...u, disabled: false };
        }
        return u;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable user');
    }
  };

  const handleDisableUser = async (uid: string) => {
    try {
      const response = await fetch('/api/admin/users/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable user');
      }

      // Update the local state
      setUsers(users.map(u => {
        if (u.uid === uid) {
          return { ...u, disabled: true };
        }
        return u;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user');
    }
  };

  if (!userProfile?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded-lg">
          <p className="text-red-600 dark:text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 rounded-lg shadow overflow-hidden">
          {/* Desktop view */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-white/5 divide-y divide-gray-200 dark:divide-white/10">
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName || 'No name'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {user.disabled ? 'Disabled' : 'Active'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {user.customClaims?.admin ? 'Admin' : 'User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {!user.customClaims?.admin && (
                        <button
                          onClick={() => handleMakeAdmin(user.uid)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200"
                        >
                          <UserPlusIcon className="h-5 w-5" />
                        </button>
                      )}
                      {user.disabled ? (
                        <button
                          onClick={() => handleEnableUser(user.uid)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDisableUser(user.uid)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="sm:hidden">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.uid} className="px-4 py-4">
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || 'No display name'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(user.approvalStatus)}`}>
                          {(user.approvalStatus || 'approved').charAt(0).toUpperCase() + (user.approvalStatus || 'approved').slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        {user.approvalStatus === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproval(user.uid, 'approved')}
                              className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50 transition-colors duration-200"
                              title="Approve User"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              onClick={() => handleApproval(user.uid, 'rejected')}
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                              title="Reject User"
                            >
                              <XMarkIcon />
                            </button>
                          </div>
                        )}
                        {user.approvalStatus === 'rejected' && (
                          <button
                            onClick={() => handleApproval(user.uid, 'approved')}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50 transition-colors duration-200"
                            title="Approve User"
                          >
                            <CheckIcon />
                          </button>
                        )}
                        {(!user.approvalStatus || user.approvalStatus === 'approved') && (
                          <button
                            onClick={() => handleApproval(user.uid, 'rejected')}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                            title="Revoke Access"
                          >
                            <XMarkIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 