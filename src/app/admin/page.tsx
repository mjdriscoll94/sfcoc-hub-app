'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PlusIcon } from '@heroicons/react/24/outline';
import { FileText } from 'lucide-react';
import PrayerRequestApprovalQueue from '@/components/PrayerRequestApprovalQueue';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Users } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  notificationsEnabled: boolean;
  createdAt: Date;
  approvalStatus: string;
  role?: string;
  updatedAt: Date;
}

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
            // Safely handle Timestamp conversion
            const createdAtDate = data.createdAt?.toDate?.() || new Date();
            const updatedAtDate = data.updatedAt?.toDate?.() || createdAtDate;
            
            return {
              ...data,
              uid: doc.id,
              createdAt: createdAtDate,
              updatedAt: updatedAtDate,
              email: data.email || null,
              displayName: data.displayName || null,
              isAdmin: data.isAdmin || false,
              notificationsEnabled: data.notificationsEnabled || false,
              approvalStatus: data.approvalStatus || 'approved',
              role: data.role || 'user'
            } as UserProfile;
          })
          .filter(user => user.approvalStatus === 'approved')
          .sort((a, b) => {
            // Get display text for sorting (display name or email)
            const getDisplayText = (user: UserProfile) => 
              (user.displayName || user.email || '').toLowerCase();
            
            return getDisplayText(a).localeCompare(getDisplayText(b));
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
  }, [userProfile, router]);

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
        isAdmin: newRole === 'admin' // Keep isAdmin for backward compatibility
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

  if (!userProfile?.isAdmin) {
    return null;
  }

  const getRoleButtonStyle = (role: string) => {
    switch(role) {
      case 'admin':
        return 'bg-[#D6805F] text-white';
      case 'organizer':
        return 'bg-[#85AAA0] text-white';
      default:
        return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60';
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* User Management */}
        <Link
          href="/admin/users"
          className="relative rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#D6805F] dark:hover:border-[#D6805F] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#D6805F]"
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

        {/* Prayer Request Management */}
        <div className="bg-white dark:bg-white/5 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Prayer Request Queue</h2>
          <PrayerRequestApprovalQueue />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : users.length > 0 ? (
        <div className="bg-white dark:bg-white/5 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Roles and Permissions</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
              Manage roles for approved users
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-white/10">
            <ul role="list" className="divide-y divide-gray-200 dark:divide-white/10">
              {users.map((user) => (
                <li key={user.uid} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[#D6805F] flex items-center justify-center text-white flex-shrink-0">
                        {user.displayName?.[0] || (user.email?.[0] ?? 'U')}
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.displayName || 'No display name'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-white/60 truncate">{user.email || 'No email'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRoleClick(user)}
                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                        getRoleButtonStyle(user.role || 'user')
                      }`}
                    >
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
          <p className="text-center text-gray-500 dark:text-white/60">No approved users found</p>
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