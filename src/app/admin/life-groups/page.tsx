'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, Timestamp, getDocs, where } from 'firebase/firestore';
import BackButton from '@/components/BackButton';
import { LifeGroup, LifeGroupMember, FamilyUnit, FamilyMember } from '@/types';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, ArrowUpTrayIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from '@/components/ConfirmationModal';
import { uploadLifeGroupResource } from '@/lib/cloudinary/upload';

interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export default function LifeGroupsManagement() {
  useEffect(() => {
    document.title = 'Life Groups Management | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [lifeGroups, setLifeGroups] = useState<LifeGroup[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<LifeGroup | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [uploadingCurriculum, setUploadingCurriculum] = useState(false);
  const [curriculumUrl, setCurriculumUrl] = useState<string | null>(null);
  const [curriculumFileName, setCurriculumFileName] = useState<string | null>(null);
  const [familyUnits, setFamilyUnits] = useState<FamilyUnit[]>([]);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [familyToDelete, setFamilyToDelete] = useState<FamilyUnit | null>(null);
  const [isDeleteFamilyConfirmationOpen, setIsDeleteFamilyConfirmationOpen] = useState(false);
  const [familyFormData, setFamilyFormData] = useState({
    familyName: '',
    members: [] as Omit<FamilyMember, 'id'>[],
  });
  const [newMemberForm, setNewMemberForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    relationship: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    meetingDay: '',
    meetingTime: '',
    meetingLocation: '',
  });

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [userProfile, router]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const fetchedUsers = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as UserProfile[];
        setUsers(fetchedUsers.filter(u => u.email)); // Only include users with emails
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch life groups
  useEffect(() => {
    const q = query(
      collection(db, 'lifeGroups'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groups = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
            members: (data.members || []).map((member: any) => ({
              ...member,
              addedAt: (member.addedAt as Timestamp)?.toDate() || new Date(),
            })),
          } as LifeGroup;
        });
        setLifeGroups(groups);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching life groups:', err);
        setError('Failed to load life groups');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch curriculum resource
  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const resourcesRef = collection(db, 'lifeGroupResources');
        const snapshot = await getDocs(query(resourcesRef, where('type', '==', 'curriculum')));
        
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setCurriculumUrl(data.url);
          setCurriculumFileName(data.fileName || null);
        }
      } catch (err) {
        console.error('Error fetching curriculum:', err);
      }
    };

    fetchCurriculum();
  }, []);

  // Fetch family units
  useEffect(() => {
    // Temporarily remove orderBy to test if index is the issue
    const q = query(collection(db, 'lifegroupParticipants'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const units = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
            members: (data.members || []).map((member: any) => ({
              ...member,
            })),
            totalCount: (data.members || []).length, // Auto-calculate
          } as FamilyUnit;
        });
        // Sort manually instead of using orderBy
        units.sort((a, b) => a.familyName.localeCompare(b.familyName));
        setFamilyUnits(units);
      },
      (err) => {
        console.error('Error fetching family units:', err);
        setError('Failed to load family units');
      }
    );

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      leaderId: '',
      meetingDay: '',
      meetingTime: '',
      meetingLocation: '',
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateForm(true);
    setEditingId(null);
  };

  const handleEdit = (group: LifeGroup) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      leaderId: group.leaderId,
      meetingDay: group.meetingDay || '',
      meetingTime: group.meetingTime || '',
      meetingLocation: group.meetingLocation || '',
    });
    setEditingId(group.id);
    setShowCreateForm(false);
  };

  const handleCancel = () => {
    resetForm();
    setShowCreateForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      if (!userProfile) return;

      const leader = users.find(u => u.uid === formData.leaderId);
      if (!leader) {
        setError('Please select a leader');
        return;
      }

      const groupData = {
        name: formData.name,
        description: formData.description || null,
        leaderId: formData.leaderId,
        leaderName: leader.displayName || leader.email || 'Unknown',
        meetingDay: formData.meetingDay || null,
        meetingTime: formData.meetingTime || null,
        meetingLocation: formData.meetingLocation || null,
        updatedAt: Timestamp.now(),
        isActive: true,
      };

      if (editingId) {
        // Update existing group
        await updateDoc(doc(db, 'lifeGroups', editingId), groupData);
      } else {
        // Create new group
        await addDoc(collection(db, 'lifeGroups'), {
          ...groupData,
          members: [],
          createdAt: Timestamp.now(),
          createdBy: userProfile.uid,
        });
      }

      resetForm();
      setShowCreateForm(false);
      setEditingId(null);
      setError(null);
    } catch (err) {
      console.error('Error saving life group:', err);
      setError('Failed to save life group');
    }
  };

  const handleDeleteClick = (group: LifeGroup) => {
    setGroupToDelete(group);
    setIsDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    try {
      await deleteDoc(doc(db, 'lifeGroups', groupToDelete.id));
      setGroupToDelete(null);
      setIsDeleteConfirmationOpen(false);
      setError(null);
    } catch (err) {
      console.error('Error deleting life group:', err);
      setError('Failed to delete life group');
      setIsDeleteConfirmationOpen(false);
    }
  };

  const handleAddMember = async (groupId: string, userId: string) => {
    try {
      const group = lifeGroups.find(g => g.id === groupId);
      if (!group) return;

      const user = users.find(u => u.uid === userId);
      if (!user) return;

      // Check if user is already a member
      if (group.members.some(m => m.userId === userId)) {
        setError('User is already a member of this group');
        return;
      }

      const newMember: LifeGroupMember = {
        userId: user.uid,
        displayName: user.displayName,
        email: user.email,
        addedAt: new Date(),
        addedBy: userProfile?.uid || '',
      };

      await updateDoc(doc(db, 'lifeGroups', groupId), {
        members: [...group.members, {
          ...newMember,
          addedAt: Timestamp.now(),
        }],
        updatedAt: Timestamp.now(),
      });

      setError(null);
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add member');
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      const group = lifeGroups.find(g => g.id === groupId);
      if (!group) return;

      await updateDoc(doc(db, 'lifeGroups', groupId), {
        members: group.members.filter(m => m.userId !== userId),
        updatedAt: Timestamp.now(),
      });

      setError(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member');
    }
  };

  const handleCurriculumUpload = async () => {
    if (!curriculumFile || !userProfile) return;

    setUploadingCurriculum(true);
    setError(null);

    try {
      const fileUrl = await uploadLifeGroupResource(curriculumFile);

      // Check if curriculum already exists
      const resourcesRef = collection(db, 'lifeGroupResources');
      const snapshot = await getDocs(query(resourcesRef, where('type', '==', 'curriculum')));
      
      if (!snapshot.empty) {
        // Update existing
        const docRef = snapshot.docs[0];
        await updateDoc(doc(db, 'lifeGroupResources', docRef.id), {
          url: fileUrl,
          fileName: curriculumFile.name,
          updatedAt: Timestamp.now(),
          updatedBy: userProfile.uid,
        });
      } else {
        // Create new
        await addDoc(resourcesRef, {
          type: 'curriculum',
          url: fileUrl,
          fileName: curriculumFile.name,
          createdAt: Timestamp.now(),
          createdBy: userProfile.uid,
          updatedAt: Timestamp.now(),
        });
      }

      setCurriculumUrl(fileUrl);
      setCurriculumFileName(curriculumFile.name);
      setCurriculumFile(null);
      setError(null);
    } catch (err) {
      console.error('Error uploading curriculum:', err);
      setError('Failed to upload curriculum file');
    } finally {
      setUploadingCurriculum(false);
    }
  };

  const handleDeleteCurriculum = async () => {
    if (!userProfile) return;

    try {
      const resourcesRef = collection(db, 'lifeGroupResources');
      const snapshot = await getDocs(query(resourcesRef, where('type', '==', 'curriculum')));
      
      if (!snapshot.empty) {
        await deleteDoc(doc(db, 'lifeGroupResources', snapshot.docs[0].id));
        setCurriculumUrl(null);
        setCurriculumFileName(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error deleting curriculum:', err);
      setError('Failed to delete curriculum file');
    }
  };

  // Family Unit Management Functions
  const handleCreateFamily = () => {
    setFamilyFormData({ familyName: '', members: [] });
    setNewMemberForm({ firstName: '', lastName: '', age: '', relationship: '' });
    setShowFamilyForm(true);
    setEditingFamilyId(null);
  };

  const handleEditFamily = (family: FamilyUnit) => {
    setFamilyFormData({
      familyName: family.familyName,
      members: family.members.map(m => ({
        firstName: m.firstName,
        lastName: m.lastName,
        age: m.age,
        relationship: m.relationship,
      })),
    });
    setNewMemberForm({ firstName: '', lastName: '', age: '', relationship: '' });
    setShowFamilyForm(true);
    setEditingFamilyId(family.id);
  };

  const handleCancelFamily = () => {
    setFamilyFormData({ familyName: '', members: [] });
    setNewMemberForm({ firstName: '', lastName: '', age: '', relationship: '' });
    setShowFamilyForm(false);
    setEditingFamilyId(null);
  };

  const handleAddMemberToForm = () => {
    if (!newMemberForm.firstName.trim() || !newMemberForm.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    const member: Omit<FamilyMember, 'id'> = {
      firstName: newMemberForm.firstName.trim(),
      lastName: newMemberForm.lastName.trim(),
      age: newMemberForm.age ? parseInt(newMemberForm.age) : undefined,
      relationship: newMemberForm.relationship.trim() || undefined,
    };

    setFamilyFormData({
      ...familyFormData,
      members: [...familyFormData.members, member],
    });

    setNewMemberForm({ firstName: '', lastName: '', age: '', relationship: '' });
    setError(null);
  };

  const handleRemoveMemberFromForm = (index: number) => {
    setFamilyFormData({
      ...familyFormData,
      members: familyFormData.members.filter((_, i) => i !== index),
    });
  };

  const handleSaveFamily = async () => {
    console.log('=== handleSaveFamily CALLED ===');
    console.log('Family Form Data:', JSON.stringify(familyFormData, null, 2));
    console.log('User Profile exists:', !!userProfile);
    console.log('User Profile UID:', userProfile?.uid);
    console.log('Editing Family ID:', editingFamilyId);

    if (!familyFormData.familyName.trim()) {
      setError('Family name is required');
      console.log('ERROR: Family name is empty');
      return;
    }

    if (!userProfile) {
      setError('You must be logged in to save a family unit');
      console.log('ERROR: No user profile');
      return;
    }

    try {
      const membersWithIds = familyFormData.members.map((member, index) => {
        const memberData: any = {
          id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
          firstName: member.firstName,
          lastName: member.lastName,
        };
        
        // Only include age if it's a valid number
        if (member.age !== undefined && member.age !== null && typeof member.age === 'number' && !isNaN(member.age)) {
          memberData.age = member.age;
        }
        
        // Only include relationship if it's a valid non-empty string
        if (member.relationship && typeof member.relationship === 'string' && member.relationship.trim() !== '') {
          memberData.relationship = member.relationship.trim();
        }
        
        return memberData;
      });

      const familyData = {
        familyName: familyFormData.familyName.trim(),
        members: membersWithIds,
        totalCount: membersWithIds.length,
        updatedAt: Timestamp.now(),
      };

      console.log('About to save family data:', JSON.stringify(familyData, null, 2));
      console.log('Collection name: lifegroupParticipants');

      if (editingFamilyId) {
        console.log('Updating existing family unit:', editingFamilyId);
        await updateDoc(doc(db, 'lifegroupParticipants', editingFamilyId), familyData);
        console.log('Family unit updated successfully');
      } else {
        console.log('Creating new family unit...');
        const docRef = await addDoc(collection(db, 'lifegroupParticipants'), {
          ...familyData,
          createdAt: Timestamp.now(),
          createdBy: userProfile.uid,
        });
        console.log('Family unit created successfully with ID:', docRef.id);
        console.log('Document path:', docRef.path);
      }

      console.log('Save completed, calling handleCancelFamily');
      handleCancelFamily();
      setError(null);
    } catch (err) {
      console.error('=== ERROR SAVING FAMILY UNIT ===');
      console.error('Error details:', err);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('Error code:', (err as any)?.code);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
      setError(err instanceof Error ? err.message : 'Failed to save family unit');
    }
  };

  const handleDeleteFamilyClick = (family: FamilyUnit) => {
    setFamilyToDelete(family);
    setIsDeleteFamilyConfirmationOpen(true);
  };

  const handleDeleteFamilyConfirm = async () => {
    if (!familyToDelete) return;

    try {
      await deleteDoc(doc(db, 'lifegroupParticipants', familyToDelete.id));
      setFamilyToDelete(null);
      setIsDeleteFamilyConfirmationOpen(false);
      setError(null);
    } catch (err) {
      console.error('Error deleting family unit:', err);
      setError('Failed to delete family unit');
      setIsDeleteFamilyConfirmationOpen(false);
    }
  };

  const toggleFamilyExpand = (familyId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        newSet.delete(familyId);
      } else {
        newSet.add(familyId);
      }
      return newSet;
    });
  };

  if (!userProfile?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E88B5F]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <BackButton className="mr-4" />
          <h1 className="text-3xl font-bold text-charcoal">Life Groups Management</h1>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-[#E88B5F] text-white rounded-lg hover:bg-[#D6714A] transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Life Group
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Curriculum Management Section */}
      <div className="mb-8 bg-white rounded-lg border border-border p-6">
        <h2 className="text-2xl font-bold text-charcoal mb-4">Curriculum Management</h2>
        <p className="text-text-light mb-6">
          Upload and manage the curriculum document for life group leaders.
        </p>

        <div className="border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-charcoal mb-4">Curriculum Document</h3>
          {curriculumUrl ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <a
                    href={curriculumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral hover:underline font-medium"
                  >
                    {curriculumFileName || 'Curriculum Document'}
                  </a>
                  <p className="text-sm text-text-light">Click to view/download</p>
                </div>
              </div>
              <button
                onClick={handleDeleteCurriculum}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete curriculum"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <p className="text-text-light mb-4">No curriculum document uploaded yet.</p>
          )}
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-charcoal mb-2">
              {curriculumUrl ? 'Replace Curriculum Document' : 'Upload Curriculum Document'}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCurriculumFile(e.target.files?.[0] || null)}
                className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
              />
              <button
                onClick={handleCurriculumUpload}
                disabled={!curriculumFile || uploadingCurriculum}
                className="px-4 py-2 bg-[#E88B5F] text-white rounded-md hover:bg-[#D6714A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploadingCurriculum ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                    {curriculumUrl ? 'Replace' : 'Upload'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Family Units Management Section */}
      <div className="mb-8 bg-white rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-charcoal">Family Units</h2>
            <p className="text-text-light mt-1">
              Manage family units and their members for life groups.
            </p>
          </div>
          <button
            onClick={handleCreateFamily}
            className="inline-flex items-center px-4 py-2 bg-[#E88B5F] text-white rounded-lg hover:bg-[#D6714A] transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Family Unit
          </button>
        </div>

        {/* Create/Edit Family Form */}
        {showFamilyForm && (
          <div className="mb-6 border border-border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-charcoal mb-4">
              {editingFamilyId ? 'Edit Family Unit' : 'Create New Family Unit'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Family Name *</label>
                <input
                  type="text"
                  value={familyFormData.familyName}
                  onChange={(e) => setFamilyFormData({ ...familyFormData, familyName: e.target.value })}
                  placeholder="e.g., Smith Family"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                  required
                />
              </div>

              {/* Add Member Form */}
              <div className="border border-border rounded-lg p-4 bg-white">
                <h4 className="text-sm font-semibold text-charcoal mb-3">Add Family Member</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">First Name *</label>
                    <input
                      type="text"
                      value={newMemberForm.firstName}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, firstName: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={newMemberForm.lastName}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Age</label>
                    <input
                      type="number"
                      value={newMemberForm.age}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, age: e.target.value })}
                      className="w-full px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Relationship</label>
                    <input
                      type="text"
                      value={newMemberForm.relationship}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, relationship: e.target.value })}
                      placeholder="e.g., Parent, Child"
                      className="w-full px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddMemberToForm}
                  className="mt-3 px-3 py-1 bg-[#E88B5F] text-white rounded-md hover:bg-[#D6714A] transition-colors text-sm"
                >
                  Add Member
                </button>
              </div>

              {/* Current Members List */}
              {familyFormData.members.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-charcoal mb-2">
                    Family Members ({familyFormData.members.length})
                  </h4>
                  <div className="space-y-2">
                    {familyFormData.members.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white border border-border rounded-md"
                      >
                        <span className="text-charcoal text-sm">
                          {member.firstName} {member.lastName}
                          {member.age && ` (Age: ${member.age})`}
                          {member.relationship && ` - ${member.relationship}`}
                        </span>
                        <button
                          onClick={() => handleRemoveMemberFromForm(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelFamily}
                  className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log('=== CREATE BUTTON CLICKED ===');
                    console.log('Current state:', { 
                      familyFormData, 
                      userProfile: !!userProfile,
                      editingFamilyId 
                    });
                    handleSaveFamily();
                  }}
                  disabled={!familyFormData.familyName.trim()}
                  className="px-4 py-2 bg-[#E88B5F] text-white rounded-md hover:bg-[#D6714A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingFamilyId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Family Units List */}
        <div className="space-y-3">
          {familyUnits.length === 0 ? (
            <p className="text-text-light text-center py-4">No family units yet. Create your first one!</p>
          ) : (
            familyUnits.map((family) => (
              <div key={family.id} className="border border-border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleFamilyExpand(family.id)}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    {expandedFamilies.has(family.id) ? (
                      <ChevronDownIcon className="h-5 w-5 text-charcoal" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-charcoal" />
                    )}
                    <span className="font-semibold text-charcoal">{family.familyName}</span>
                    <span className="text-text-light text-sm">({family.totalCount} {family.totalCount === 1 ? 'person' : 'people'})</span>
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditFamily(family)}
                      className="p-2 text-coral hover:bg-coral/10 rounded-md transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFamilyClick(family)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {expandedFamilies.has(family.id) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="space-y-2">
                      {family.members.map((member) => (
                        <div key={member.id} className="p-2 bg-white rounded-md text-sm text-charcoal">
                          {member.firstName} {member.lastName}
                          {member.age && ` (Age: ${member.age})`}
                          {member.relationship && ` - ${member.relationship}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingId) && (
        <div className="mb-8 bg-white rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-charcoal mb-4">
            {editingId ? 'Edit Life Group' : 'Create New Life Group'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Group Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Leader *</label>
              <select
                value={formData.leaderId}
                onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                required
              >
                <option value="">Select a leader</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Meeting Day</label>
                <input
                  type="text"
                  value={formData.meetingDay}
                  onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                  placeholder="e.g., Every Tuesday"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Meeting Time</label>
                <input
                  type="text"
                  value={formData.meetingTime}
                  onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                  placeholder="e.g., 7:00 PM"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Meeting Location</label>
                <input
                  type="text"
                  value={formData.meetingLocation}
                  onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
                  placeholder="e.g., Church Building"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#E88B5F] text-white rounded-md hover:bg-[#D6714A] transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Life Groups List */}
      <div className="space-y-6">
        {lifeGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg border border-border p-6">
            {editingId === group.id ? (
              <div className="text-center py-4 text-text-light">
                Editing in form above...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-charcoal mb-2">{group.name}</h3>
                    {group.description && (
                      <p className="text-text-light mb-2">{group.description}</p>
                    )}
                    <div className="space-y-1 text-sm text-charcoal">
                      <div><span className="font-medium">Leader:</span> {group.leaderName}</div>
                      {group.meetingDay && (
                        <div>
                          <span className="font-medium">Meets:</span> {group.meetingDay}
                          {group.meetingTime && ` at ${group.meetingTime}`}
                        </div>
                      )}
                      {group.meetingLocation && (
                        <div><span className="font-medium">Location:</span> {group.meetingLocation}</div>
                      )}
                      <div><span className="font-medium">Members:</span> {group.members.length}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-2 text-coral hover:bg-coral/10 rounded-md transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(group)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Members Section */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-charcoal">Members</h4>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddMember(group.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                    >
                      <option value="">Add Member...</option>
                      {users
                        .filter(user => !group.members.some(m => m.userId === user.uid))
                        .map((user) => (
                          <option key={user.uid} value={user.uid}>
                            {user.displayName || user.email}
                          </option>
                        ))}
                    </select>
                  </div>
                  {group.members.length === 0 ? (
                    <p className="text-text-light text-sm">No members yet</p>
                  ) : (
                    <div className="space-y-2">
                      {group.members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                        >
                          <span className="text-charcoal">
                            {member.displayName || member.email || 'Unknown'}
                          </span>
                          <button
                            onClick={() => handleRemoveMember(group.id, member.userId)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Remove member"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {lifeGroups.length === 0 && !showCreateForm && (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-light mb-4">No life groups yet. Create your first one!</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-[#E88B5F] text-white rounded-lg hover:bg-[#D6714A] transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Life Group
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteConfirmationOpen}
        onClose={() => {
          setIsDeleteConfirmationOpen(false);
          setGroupToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Life Group"
        message={groupToDelete ? `Are you sure you want to delete "${groupToDelete.name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={isDeleteFamilyConfirmationOpen}
        onClose={() => {
          setIsDeleteFamilyConfirmationOpen(false);
          setFamilyToDelete(null);
        }}
        onConfirm={handleDeleteFamilyConfirm}
        title="Delete Family Unit"
        message={familyToDelete ? `Are you sure you want to delete "${familyToDelete.familyName}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
