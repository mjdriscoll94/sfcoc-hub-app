'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, updateDoc, addDoc, Timestamp, where, deleteDoc } from 'firebase/firestore';
import { CheckCircle, XCircle, User, Users } from 'lucide-react';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import ConfirmationModal from '@/components/ConfirmationModal';

interface DirectorySubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  anniversary?: string;
  photoURL?: string;
  familyMembers: {
    firstName: string;
    lastName: string;
    relationship: string;
    birthday: string;
  }[];
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

interface DirectoryMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  anniversary?: string;
  photoURL?: string;
  familyMembers: {
    firstName: string;
    lastName: string;
    relationship: string;
    birthday: string;
  }[];
  addedAt: Date;
  addedBy: string;
}

export default function DirectoryAdminPage() {
  useEffect(() => {
    document.title = 'Directory Management | Sioux Falls Church of Christ';
  }, []);

  const [submissions, setSubmissions] = useState<DirectorySubmission[]>([]);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch pending submissions
        const submissionsRef = collection(db, 'directorySubmissions');
        const submissionsQuery = query(submissionsRef, where('status', '==', 'pending'));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        const submissionsData = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt.toDate()
        })) as DirectorySubmission[];

        setSubmissions(submissionsData.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()));

        // Fetch all members
        const membersRef = collection(db, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        const membersData = membersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          addedAt: doc.data().addedAt.toDate()
        })) as DirectoryMember[];

        setMembers(membersData.sort((a, b) => a.lastName.localeCompare(b.lastName)));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile, router]);

  const handleApprove = async (submission: DirectorySubmission) => {
    try {
      setLoading(true);
      
      // Add to members collection
      await addDoc(collection(db, 'members'), {
        firstName: submission.firstName,
        lastName: submission.lastName,
        email: submission.email,
        phoneNumber: submission.phoneNumber,
        address: submission.address,
        anniversary: submission.anniversary,
        photoURL: submission.photoURL,
        familyMembers: submission.familyMembers,
        addedAt: Timestamp.now(),
        addedBy: userProfile?.uid
      });

      // Update submission status
      const submissionRef = doc(db, 'directorySubmissions', submission.id);
      await updateDoc(submissionRef, {
        status: 'approved'
      });

      // Remove from local state
      setSubmissions(prev => prev.filter(s => s.id !== submission.id));
    } catch (err) {
      console.error('Error approving submission:', err);
      setError('Failed to approve submission');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (submission: DirectorySubmission) => {
    try {
      setLoading(true);
      
      // Update submission status
      const submissionRef = doc(db, 'directorySubmissions', submission.id);
      await updateDoc(submissionRef, {
        status: 'rejected'
      });

      // Remove from local state
      setSubmissions(prev => prev.filter(s => s.id !== submission.id));
    } catch (err) {
      console.error('Error rejecting submission:', err);
      setError('Failed to reject submission');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (member: DirectoryMember) => {
    setSelectedMember(member);
    setIsConfirmationOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedMember) return;

    try {
      setLoading(true);
      
      // Delete from members collection
      await deleteDoc(doc(db, 'members', selectedMember.id));

      // Remove from local state
      setMembers(prev => prev.filter(m => m.id !== selectedMember.id));
      
      setIsConfirmationOpen(false);
      setSelectedMember(null);
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">Directory Management</h1>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Pending Submissions Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-charcoal mb-6">Pending Submissions</h2>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-card rounded-lg p-6 border border-border">
            <p className="text-center text-text-light">No pending submissions</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {submission.photoURL ? (
                        <div className="relative h-24 w-24">
                          <Image
                            src={submission.photoURL}
                            alt={`${submission.lastName} Family`}
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
                      <div>
                        <h2 className="text-xl font-semibold text-charcoal">
                          {submission.lastName}
                        </h2>
                        <p className="text-sm text-text-light">
                          Submitted {submission.submittedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleApprove(submission)}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(submission)}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-text-light mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-charcoal">{submission.email}</p>
                        <p className="text-sm text-charcoal">{submission.phoneNumber}</p>
                        <p className="text-sm text-charcoal">{submission.address}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-text-light mb-2">Family Members</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-gray-400 dark:text-white/40 mr-2" />
                          <span className="text-sm text-charcoal">
                            {submission.firstName} {submission.lastName}
                          </span>
                          <span className="text-sm text-text-light ml-2">
                            (Primary Contact)
                          </span>
                        </div>
                        {submission.familyMembers.map((member, index) => (
                          <div key={index} className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 dark:text-white/40 mr-2" />
                            <span className="text-sm text-charcoal">
                              {member.firstName} {member.lastName}
                            </span>
                            <span className="text-sm text-text-light ml-2">
                              ({member.relationship})
                            </span>
                            {member.birthday && (
                              <span className="text-sm text-text-light ml-2">
                                • Born: {new Date(member.birthday).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Directory Members Section */}
      <div>
        <h2 className="text-2xl font-semibold text-charcoal mb-6">Directory Members</h2>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-card rounded-lg p-6 border border-border">
            <p className="text-center text-text-light">No directory members</p>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-card rounded-lg shadow-sm border border-border overflow-hidden p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {member.photoURL ? (
                      <div className="relative h-24 w-24">
                        <Image
                          src={member.photoURL}
                          alt={`${member.lastName} Family`}
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
                    <div>
                      <h3 className="text-xl font-semibold text-charcoal">
                        {member.lastName}
                      </h3>
                      <p className="text-sm text-text-light">
                        Added {member.addedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMember(member)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setSelectedMember(null);
        }}
        onConfirm={confirmDelete}
        title="Remove Directory Member"
        message={`Are you sure you want to remove ${selectedMember?.firstName} ${selectedMember?.lastName} from the directory? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  );
} 