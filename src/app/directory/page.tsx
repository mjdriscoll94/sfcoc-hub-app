'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/types/roles';
import { Phone, Mail, MapPin, Search, Plus, Users, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface DirectoryMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  photoURL: string | null;
  familyMembers?: {
    firstName: string;
    lastName: string;
    relationship: string;
    birthday: string;
  }[];
}

export default function DirectoryPage() {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { userProfile } = useAuth();

  // Check if user has permission to access directory
  const canAccessDirectory = userProfile && (
    userProfile.isAdmin || // Legacy admin check
    (userProfile.role && ROLE_PERMISSIONS[userProfile.role]?.canAccessDirectory) // New role check
  );

  useEffect(() => {
    const fetchMembers = async () => {
      if (!canAccessDirectory) return;

      try {
        const membersRef = collection(db, 'members');
        const snapshot = await getDocs(membersRef);
        const membersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DirectoryMember[];

        // Sort by last name, then first name
        const sortedMembers = membersData.sort((a, b) => {
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          if (lastNameCompare !== 0) return lastNameCompare;
          return a.firstName.localeCompare(b.firstName);
        });

        setMembers(sortedMembers);
      } catch (err) {
        console.error('Error fetching directory:', err);
        setError('Failed to load directory');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [canAccessDirectory]);

  // Filter members based on search term
  const displayMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.address?.toLowerCase().includes(searchLower) ||
      member.familyMembers?.some(
        familyMember =>
          familyMember.firstName.toLowerCase().includes(searchLower) ||
          familyMember.lastName.toLowerCase().includes(searchLower)
      )
    );
  });

  if (!canAccessDirectory) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#171717] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
            <p className="text-center text-gray-500 dark:text-white/60">
              You do not have permission to access the directory. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#171717] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Church Directory</h1>
            <div className="relative">
              <input
                type="text"
                placeholder="Search directory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-[#D6805F] focus:border-[#D6805F]"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-white/40" />
            </div>
          </div>
          <Link
            href="/directory/submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#D6805F] hover:bg-[#D6805F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F]"
          >
            <Plus className="h-5 w-5 mr-2" />
            Submit Information
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-6">
            <p className="text-center text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : displayMembers.length === 0 ? (
          <div className="bg-white dark:bg-white/5 rounded-lg p-6 text-center">
            <p className="text-gray-500 dark:text-white/60">No directory entries found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {member.photoURL ? (
                      <div className="relative h-24 w-24">
                        <Image
                          src={member.photoURL}
                          alt={`${member.firstName} ${member.lastName}'s family`}
                          fill
                          className="rounded-lg object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                        <Users className="h-12 w-12 text-gray-400 dark:text-white/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                        {member.firstName} {member.lastName}
                      </h2>
                      {member.email && (
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-white/60">
                          <Mail className="h-4 w-4 mr-2" />
                          <a href={`mailto:${member.email}`} className="truncate hover:text-[#D6805F]">
                            {member.email}
                          </a>
                        </div>
                      )}
                      {member.phoneNumber && (
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-white/60">
                          <Phone className="h-4 w-4 mr-2" />
                          <a href={`tel:${member.phoneNumber}`} className="hover:text-[#D6805F]">
                            {member.phoneNumber}
                          </a>
                        </div>
                      )}
                      {member.address && (
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-white/60">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="truncate">{member.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {member.familyMembers && member.familyMembers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Family Members
                      </h3>
                      <div className="space-y-2">
                        {member.familyMembers.map((familyMember, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <User className="h-4 w-4 text-gray-400 dark:text-white/40 mr-2" />
                            <span className="text-gray-900 dark:text-white">
                              {familyMember.firstName} {familyMember.lastName}
                            </span>
                            <span className="text-gray-500 dark:text-white/60 ml-2">
                              ({familyMember.relationship})
                            </span>
                            {familyMember.birthday && (
                              <span className="text-gray-500 dark:text-white/60 ml-2">
                                • Born: {new Date(familyMember.birthday).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 