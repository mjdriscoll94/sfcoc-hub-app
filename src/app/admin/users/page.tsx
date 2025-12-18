'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { UserPlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserProfile } from '@/types';
import { Users } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function UserManagement() {
  useEffect(() => {
    document.title = 'User Management | Sioux Falls Church of Christ';
  }, []);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

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
        const usersData: UserProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAtDate = data.createdAt?.toDate?.() || new Date();
          
          const processedData: UserProfile = {
            uid: doc.id,
            email: data.email || null,
            displayName: data.displayName || null,
            isAdmin: data.isAdmin || false,
            createdAt: createdAtDate,
            approvalStatus: data.approvalStatus || 'approved',
            disabled: data.disabled || false,
            customClaims: data.customClaims,
            role: data.role || 'user'
          };
          
          usersData.push(processedData);
        });
        
        setUsers(usersData);
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
      // Update Firestore
      await updateDoc(doc(db, 'users', uid), {
        approvalStatus: status,
        updatedAt: new Date()
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.uid === uid 
          ? { ...user, approvalStatus: status }
          : user
      ));

      console.log(`User ${uid} ${status} successfully`);
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
    }
  };

  const getStatusBadgeColor = (status: string = 'approved') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
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

  const handleRoleClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsConfirmationOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;

    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      const currentRole = selectedUser.role || 'user';
      const newRole = currentRole === 'user' ? 'organizer' : currentRole === 'organizer' ? 'admin' : 'user';
      
      await updateDoc(userRef, {
        role: newRole,
        isAdmin: newRole === 'admin', // Keep isAdmin for backward compatibility
        updatedAt: new Date()
      });

      setUsers(users.map(u => 
        u.uid === selectedUser.uid ? { ...u, role: newRole, isAdmin: newRole === 'admin' } : u
      ));
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    } finally {
      setIsConfirmationOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleStyle = (role: string) => {
    switch(role) {
      case 'admin':
        return 'bg-[#D6805F] text-white hover:bg-[#C57050] cursor-pointer';
      case 'organizer':
        return 'bg-[#85AAA0] text-white hover:bg-[#769B91] cursor-pointer';
      default:
        return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/20 cursor-pointer';
    }
  };

  const getNextRole = (currentRole: string) => {
    switch(currentRole) {
      case 'user':
        return 'organizer';
      case 'organizer':
        return 'admin';
      default:
        return 'user';
    }
  };

  if (!userProfile?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">User Management</h1>
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
        <div className="bg-card rounded-lg shadow overflow-hidden">
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
              <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-[#D6805F] flex items-center justify-center text-white">
                          {user.displayName?.[0] || user.email?.[0] || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-charcoal">
                            {user.displayName || 'No display name'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Created: {user.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-charcoal">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(user.approvalStatus)}`}>
                        {(user.approvalStatus || 'approved').charAt(0).toUpperCase() + (user.approvalStatus || 'approved').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleRoleClick(user)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${getRoleStyle(user.role || 'user')}`}
                      >
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {user.approvalStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproval(user.uid, 'approved')}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200"
                            title="Approve User"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApproval(user.uid, 'rejected')}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200"
                            title="Reject User"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {user.approvalStatus === 'rejected' && (
                        <button
                          onClick={() => handleApproval(user.uid, 'approved')}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200"
                          title="Approve User"
                        >
                          <CheckIcon className="h-5 w-5" />
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
            <ul className="divide-y divide-gray-200 dark:divide-white/10">
              {users.map((user) => (
                <li key={user.uid} className="px-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-charcoal">
                          {user.displayName || 'No display name'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(user.approvalStatus)}`}>
                        {(user.approvalStatus || 'approved').charAt(0).toUpperCase() + (user.approvalStatus || 'approved').slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {user.createdAt.toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        {user.approvalStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproval(user.uid, 'approved')}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200"
                              title="Approve User"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleApproval(user.uid, 'rejected')}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200"
                              title="Reject User"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {user.approvalStatus === 'rejected' && (
                          <button
                            onClick={() => handleApproval(user.uid, 'approved')}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200"
                            title="Approve User"
                          >
                            <CheckIcon className="h-5 w-5" />
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

      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleConfirmRoleChange}
        title="Change User Role"
        message={selectedUser ? `Are you sure you want to change ${selectedUser.displayName || selectedUser.email || 'this user'}'s role from ${selectedUser.role || 'user'} to ${getNextRole(selectedUser.role || 'user')}?` : ''}
        confirmText={`Change to ${selectedUser ? getNextRole(selectedUser.role || 'user') : ''}`}
        cancelText="Cancel"
      />
    </div>
  );
} 