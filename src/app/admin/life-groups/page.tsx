'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, Timestamp, getDocs, where } from 'firebase/firestore';
import BackButton from '@/components/BackButton';
import { LifeGroup, LifeGroupMember } from '@/types';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
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
    </div>
  );
}
