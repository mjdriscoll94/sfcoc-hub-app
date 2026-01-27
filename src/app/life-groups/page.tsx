'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { LifeGroup } from '@/types';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LifeGroupsPage() {
  useEffect(() => {
    document.title = 'Life Groups | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const [lifeGroups, setLifeGroups] = useState<LifeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [curriculumUrl, setCurriculumUrl] = useState<string | null>(null);
  const [curriculumFileName, setCurriculumFileName] = useState<string | null>(null);

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
        }).filter(group => group.isActive);
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

  // Check if user is a life group leader
  const isLifeGroupLeader = userProfile && (
    userProfile.role === 'lifeGroupLeader' ||
    userProfile.isAdmin ||
    lifeGroups.some(group => group.leaderId === userProfile.uid)
  );

  // Fetch leader resources
  useEffect(() => {
    if (!isLifeGroupLeader) return;

    const fetchResources = async () => {
      try {
        const resourcesRef = collection(db, 'lifeGroupResources');
        const snapshot = await getDocs(resourcesRef);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.type === 'curriculum') {
            setCurriculumUrl(data.url);
            setCurriculumFileName(data.fileName || null);
          }
        });
      } catch (err) {
        console.error('Error fetching resources:', err);
      }
    };

    fetchResources();
  }, [isLifeGroupLeader]);



  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal">Life Groups</h1>
        <p className="mt-2 text-text-light">
          Connect with others in small groups for fellowship, study, and support.
        </p>
      </div>

      {/* Life Group Leader Resources Section */}
      {isLifeGroupLeader && (
        <div className="mb-8 bg-white rounded-lg border border-border p-6">
          <h2 className="text-2xl font-bold text-charcoal mb-6">Leader Resources</h2>

          {/* Curriculum Section */}
          {curriculumUrl ? (
            <div className="border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Curriculum</h3>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
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
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Curriculum</h3>
              <p className="text-text-light">No curriculum document available yet.</p>
            </div>
          )}
        </div>
      )}

      {lifeGroups.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-light">No life groups are currently available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lifeGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-charcoal mb-2">{group.name}</h3>
              {group.description && (
                <p className="text-text-light mb-4">{group.description}</p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-charcoal">
                  <svg className="w-4 h-4 mr-2 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Leader:</span>
                  <span className="ml-2">{group.leaderName}</span>
                </div>
                {group.meetingDay && (
                  <div className="flex items-center text-charcoal">
                    <svg className="w-4 h-4 mr-2 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Meets:</span>
                    <span className="ml-2">
                      {group.meetingDay}
                      {group.meetingTime && ` at ${group.meetingTime}`}
                    </span>
                  </div>
                )}
                {group.meetingLocation && (
                  <div className="flex items-center text-charcoal">
                    <svg className="w-4 h-4 mr-2 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">Location:</span>
                    <span className="ml-2">{group.meetingLocation}</span>
                  </div>
                )}
                <div className="flex items-center text-charcoal">
                  <svg className="w-4 h-4 mr-2 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-medium">Members:</span>
                  <span className="ml-2">{group.members.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
