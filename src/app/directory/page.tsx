'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/types/roles';
import { Phone, Mail, MapPin, Search, Plus, Users, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import DirectoryModal from '@/components/DirectoryModal';

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
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleCardClick = (member: DirectoryMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DirectoryModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <BackButton className="mr-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Church Directory</h1>
        </div>
        {canAccessDirectory && (
          <Link
            href="/directory/submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D6805F] hover:bg-[#c0734f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F]"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Entry
          </Link>
        )}
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
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
              onClick={() => handleCardClick(member)}
              className="bg-white dark:bg-white/5 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden cursor-pointer hover:shadow-md dark:hover:bg-white/10 transition-all"
            >
              <div className="p-6">
                {member.photoURL ? (
                  <div className="relative h-48 w-full mb-4">
                    <Image
                      src={member.photoURL}
                      alt={`${member.lastName} Family`}
                      fill
                      className="rounded-lg object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full mb-4 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <Users className="h-16 w-16 text-gray-400 dark:text-white/40" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                    {member.lastName}
                  </h2>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </div>
                    {member.familyMembers?.map((familyMember, index) => (
                      <div key={index} className="text-sm text-gray-900 dark:text-white">
                        {familyMember.firstName} {familyMember.lastName}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
                    Click to view details
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 