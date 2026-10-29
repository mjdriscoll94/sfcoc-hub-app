'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, Timestamp, getDocs, where } from 'firebase/firestore';
import BackButton from '@/components/BackButton';
import { LifeGroup, LifeGroupMember, FamilyUnit, FamilyMember, LifeGroupMemberFacingResource } from '@/types';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, ArrowUpTrayIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from '@/components/ConfirmationModal';
import LifeGroupHistoryPanel from '@/components/LifeGroupHistoryPanel';
import { uploadLifeGroupResource } from '@/lib/cloudinary/upload';
import { ROLE_PERMISSIONS } from '@/types/roles';
import { getActiveHouseholdMembers } from '@/lib/utils/householdMembers';

export default function LifeGroupsManagement() {
  useEffect(() => {
    document.title = 'Life Groups Management | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [lifeGroups, setLifeGroups] = useState<LifeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<LifeGroup | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [uploadingCurriculum, setUploadingCurriculum] = useState(false);
  const [curriculumUrl, setCurriculumUrl] = useState<string | null>(null);
  const [curriculumFileName, setCurriculumFileName] = useState<string | null>(null);
  const [memberFacingResources, setMemberFacingResources] = useState<LifeGroupMemberFacingResource[]>([]);
  const [memberResourceTitle, setMemberResourceTitle] = useState('');
  const [memberResourceFile, setMemberResourceFile] = useState<File | null>(null);
  const [uploadingMemberResource, setUploadingMemberResource] = useState(false);
  const [memberResourcesListError, setMemberResourcesListError] = useState<string | null>(null);
  const [familyUnits, setFamilyUnits] = useState<FamilyUnit[]>([]);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    meetingDay: '',
    meetingTime: '',
    meetingLocation: '',
  });

  const canManageLifeGroups = userProfile?.isAdmin || (
    !!userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageLifeGroups
  );
  useEffect(() => {
    if (userProfile && !canManageLifeGroups) {
      router.push('/');
    }
  }, [userProfile, canManageLifeGroups, router]);

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
            members: (data.members || []).map((member: Omit<LifeGroupMember, 'addedAt'> & { addedAt: Timestamp }) => ({
              ...member,
              addedAt: (member.addedAt as Timestamp)?.toDate() || new Date(),
            })),
            familyUnitIds: data.familyUnitIds || [],
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

  // Member-facing resources (multiple files for member+ on public page)
  useEffect(() => {
    // Equality-only query avoids needing a composite index (where + orderBy on another field).
    const q = query(collection(db, 'lifeGroupResources'), where('type', '==', 'memberResource'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LifeGroupMemberFacingResource[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            url: data.url,
            fileName: data.fileName || 'Resource',
            title: data.title,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            createdBy: data.createdBy,
          };
        });
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMemberFacingResources(list);
        setMemberResourcesListError(null);
      },
      (err) => {
        console.error('Error fetching member-facing resources:', err);
        setMemberResourcesListError('Could not load member resources. See the browser console for details.');
      }
    );
    return () => unsubscribe();
  }, []);

  // Attendance households are the source of truth for life group membership.
  useEffect(() => {
    const q = query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const units = snapshot.docs.flatMap(doc => {
          const data = doc.data();
          if (data.active === false) return [];
          const allMembers = (data.members || []) as FamilyMember[];
          const activeMembers = getActiveHouseholdMembers(allMembers);
          if (allMembers.length > 0 && activeMembers.length === 0) return [];
          return [{
            id: doc.id,
            familyName: data.householdName || 'Unnamed Household',
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
            members: activeMembers.map((member: FamilyMember) => ({
              ...member,
            })),
            totalCount: activeMembers.length,
          } as FamilyUnit];
        });
        setFamilyUnits(units);
      },
      (err) => {
        console.error('Error fetching attendance households:', err);
        setError('Failed to load households');
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

      const existingNames = new Set(lifeGroups.filter((group) => group.id !== editingId).map((group) => group.name));
      let genericGroupNumber = 1;
      while (existingNames.has(`Life Group ${genericGroupNumber}`)) genericGroupNumber += 1;
      const groupName = formData.name.trim() || `Life Group ${genericGroupNumber}`;

      let leaderName = 'Unassigned';
      let leaderHouseholdId = '';
      if (formData.leaderId.includes('|')) {
        const [familyUnitId, memberId] = formData.leaderId.split('|');
        leaderHouseholdId = familyUnitId;
        const family = familyUnits.find(f => f.id === familyUnitId);
        const member = family?.members.find(m => m.id === memberId);
        if (member) {
          leaderName = `${member.firstName} ${member.lastName}`;
        }
      } else if (editingId) {
        const group = lifeGroups.find(g => g.id === editingId);
        if (group) {
          leaderName = group.leaderName || 'Unknown';
          leaderHouseholdId = group.leaderHouseholdId || '';
        }
      }

      const groupData = {
        name: groupName,
        description: formData.description || null,
        leaderId: formData.leaderId,
        leaderHouseholdId,
        leaderName,
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

  const handleAddMember = async (groupId: string, familyUnitId: string) => {
    try {
      const group = lifeGroups.find(g => g.id === groupId);
      if (!group) return;

      const familyUnit = familyUnits.find(f => f.id === familyUnitId);
      if (!familyUnit) return;

      const currentFamilyUnitIds = group.familyUnitIds || [];
      if (currentFamilyUnitIds.includes(familyUnitId)) {
        setError('This household is already in this group');
        return;
      }

      const otherGroupWithFamily = lifeGroups.find(
        g => g.id !== groupId && (g.familyUnitIds || []).includes(familyUnitId)
      );
      if (otherGroupWithFamily) {
        setError(`This household is already in "${otherGroupWithFamily.name}". Remove it from that group first.`);
        return;
      }

      await updateDoc(doc(db, 'lifeGroups', groupId), {
        familyUnitIds: [...currentFamilyUnitIds, familyUnitId],
        updatedAt: Timestamp.now(),
      });

      setError(null);
    } catch (err) {
      console.error('Error adding household:', err);
      setError('Failed to add household');
    }
  };

  const handleRemoveMember = async (groupId: string, familyUnitId: string) => {
    try {
      const group = lifeGroups.find(g => g.id === groupId);
      if (!group) return;

      const currentFamilyUnitIds = group.familyUnitIds || [];
      await updateDoc(doc(db, 'lifeGroups', groupId), {
        familyUnitIds: currentFamilyUnitIds.filter(id => id !== familyUnitId),
        updatedAt: Timestamp.now(),
      });

      setError(null);
    } catch (err) {
      console.error('Error removing household:', err);
      setError('Failed to remove household');
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

  const handleMemberResourceUpload = async () => {
    if (!memberResourceFile) return;
    if (!userProfile) {
      setError('You must be signed in to upload.');
      return;
    }
    setUploadingMemberResource(true);
    setError(null);
    try {
      const fileUrl = await uploadLifeGroupResource(memberResourceFile);
      await addDoc(collection(db, 'lifeGroupResources'), {
        type: 'memberResource',
        url: fileUrl,
        fileName: memberResourceFile.name,
        title: memberResourceTitle.trim() || null,
        createdAt: Timestamp.now(),
        createdBy: userProfile.uid,
      });
      setMemberResourceFile(null);
      setMemberResourceTitle('');
    } catch (err) {
      console.error('Error uploading member resource:', err);
      setError('Failed to upload resource');
    } finally {
      setUploadingMemberResource(false);
    }
  };

  const handleDeleteMemberResource = async (id: string) => {
    if (!window.confirm('Remove this resource from the life group page?')) return;
    try {
      await deleteDoc(doc(db, 'lifeGroupResources', id));
      setError(null);
    } catch (err) {
      console.error('Error deleting member resource:', err);
      setError('Failed to delete resource');
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

  // Any household member can be selected as a life group leader. The household
  // collection intentionally does not duplicate role metadata.
  const lifeGroupLeaderOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    familyUnits.forEach((family) => {
      family.members.forEach((member) => {
        options.push({
          value: `${family.id}|${member.id}`,
          label: `${member.firstName} ${member.lastName} (${family.familyName})`,
        });
      });
    });
    return options;
  }, [familyUnits]);

  if (!canManageLifeGroups) {
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <BackButton className="mr-4" />
          <h1 className="text-3xl font-bold text-charcoal">Life Groups Management</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/life-groups/randomizer')}
            className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-charcoal transition-colors hover:border-coral hover:text-coral"
          >
            <SparklesIcon className="mr-2 h-5 w-5" />
            Group Randomizer
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            aria-expanded={showHistory}
            className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-charcoal transition-colors hover:border-coral hover:text-coral"
          >
            <ClockIcon className="mr-2 h-5 w-5" />
            {showHistory ? 'Hide Assignment History' : 'Assignment History'}
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-[#E88B5F] text-white rounded-lg hover:bg-[#D6714A] transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Life Group
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {showHistory ? (
        <LifeGroupHistoryPanel
          lifeGroups={lifeGroups}
          households={familyUnits}
          userId={userProfile.uid}
        />
      ) : null}

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

      {/* Member-facing resources (shown to approved member+ on public life groups page) */}
      <div className="mb-8 bg-white rounded-lg border border-border p-6">
        <h2 className="text-2xl font-bold text-charcoal mb-2">Member resources</h2>
        <p className="text-text-light mb-6">
          Upload files visible to approved members, life group leaders, organizers, and admins on the public Life Groups page. (Basic &quot;user&quot; accounts do not see this section.)
        </p>

        {memberResourcesListError && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {memberResourcesListError}
          </p>
        )}

        {memberFacingResources.length > 0 && (
          <ul className="space-y-2 mb-6">
            {memberFacingResources.map((res) => (
              <li
                key={res.id}
                className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-md border border-border"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral hover:underline font-medium truncate block"
                  >
                    {res.title?.trim() || res.fileName}
                  </a>
                  <p className="text-xs text-text-light truncate">{res.fileName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteMemberResource(res.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md shrink-0"
                  title="Remove resource"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-charcoal mb-3">Add resource</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Display title (optional)</label>
              <input
                type="text"
                value={memberResourceTitle}
                onChange={(e) => setMemberResourceTitle(e.target.value)}
                placeholder="e.g. Spring study guide"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">File</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setMemberResourceFile(e.target.files?.[0] || null)}
                  className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                />
                <button
                  type="button"
                  onClick={handleMemberResourceUpload}
                  disabled={!memberResourceFile || uploadingMemberResource}
                  className="px-4 py-2 bg-[#E88B5F] text-white rounded-md hover:bg-[#D6714A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {uploadingMemberResource ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Life Group Form */}
      {(showCreateForm || editingId) && (
        <div className="mb-8 bg-white rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-charcoal mb-4">
            {editingId ? 'Edit Life Group' : 'Create New Life Group'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Group Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`Life Group ${lifeGroups.length + 1}`}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
              />
              <p className="mt-1 text-xs text-text-light">Leave blank to use the next generic Life Group name.</p>
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
              <label className="block text-sm font-medium text-charcoal mb-1">Leader</label>
              <select
                value={formData.leaderId}
                onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
              >
                <option value="">Assign later in the Group Randomizer</option>
                {lifeGroupLeaderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {lifeGroupLeaderOptions.length === 0 && (
                <p className="mt-1 text-xs text-text-light">
                  Add members in the household manager to select a leader here.
                </p>
              )}
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

      {/* Household source-of-truth summary */}
      <div className="mb-8 bg-white rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-charcoal">Households</h2>
            <p className="text-text-light mt-1">
              Life groups now use the shared attendance household list.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/households')}
            className="inline-flex items-center px-4 py-2 bg-[#E88B5F] text-white rounded-lg hover:bg-[#D6714A] transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Manage Households
          </button>
        </div>


        {/* Household List */}
        <div className="space-y-3">
          {familyUnits.length === 0 ? (
            <p className="text-text-light text-center py-4">No active households yet. Add one in the household manager.</p>
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
                      onClick={() => router.push('/admin/households')}
                      className="p-2 text-coral hover:bg-coral/10 rounded-md transition-colors"
                      title="Manage household"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {expandedFamilies.has(family.id) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="space-y-2">
                      {family.members.map((member) => (
                        <div key={member.id} className="p-2 bg-white rounded-md text-sm text-charcoal">
                          {member.firstName} {member.lastName}
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
                      <div><span className="font-medium">Members:</span> {
                        (group.familyUnitIds || []).reduce((total, familyUnitId) => {
                          const family = familyUnits.find(f => f.id === familyUnitId);
                          return total + (family?.totalCount || 0);
                        }, 0)
                      } {((group.familyUnitIds || []).reduce((total, familyUnitId) => {
                        const family = familyUnits.find(f => f.id === familyUnitId);
                        return total + (family?.totalCount || 0);
                      }, 0)) === 1 ? 'person' : 'people'} across {(group.familyUnitIds || []).length} {(group.familyUnitIds || []).length === 1 ? 'household' : 'households'}</div>
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

                {/* Households Section */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-charcoal">Households</h4>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddMember(group.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B5F] bg-white text-charcoal"
                    >
                      <option value="">Add Household...</option>
                      {familyUnits
                        .filter(family => {
                          const inThisGroup = (group.familyUnitIds || []).includes(family.id);
                          if (inThisGroup) return false;
                          const inOtherGroup = lifeGroups.some(
                            g => g.id !== group.id && (g.familyUnitIds || []).includes(family.id)
                          );
                          return !inOtherGroup;
                        })
                        .map((family) => (
                          <option key={family.id} value={family.id}>
                            {family.familyName} - ({family.totalCount} {family.totalCount === 1 ? 'person' : 'people'})
                          </option>
                        ))}
                    </select>
                  </div>
                  {(group.familyUnitIds || []).length === 0 ? (
                    <p className="text-text-light text-sm">No households yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(group.familyUnitIds || []).map((familyUnitId) => {
                        const family = familyUnits.find(f => f.id === familyUnitId);
                        if (!family) return null;
                        return (
                          <div
                            key={familyUnitId}
                            className="border border-border rounded-lg p-3 bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => toggleFamilyExpand(familyUnitId)}
                                className="flex items-center space-x-2 flex-1 text-left"
                              >
                                {expandedFamilies.has(familyUnitId) ? (
                                  <ChevronDownIcon className="h-4 w-4 text-charcoal" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4 text-charcoal" />
                                )}
                                <span className="font-semibold text-charcoal">
                                  {family.familyName} - ({family.totalCount} {family.totalCount === 1 ? 'person' : 'people'})
                                </span>
                              </button>
                              <button
                                onClick={() => handleRemoveMember(group.id, familyUnitId)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors ml-2"
                                title="Remove household"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                            {expandedFamilies.has(familyUnitId) && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <div className="space-y-1">
                                  {family.members.map((member) => (
                                    <div key={member.id} className="p-2 bg-white rounded-md text-sm text-charcoal">
                                      {member.firstName} {member.lastName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

    </div>
  );
}
