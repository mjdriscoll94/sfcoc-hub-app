'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { normalizeAttendanceName } from '@/lib/utils/attendance';

interface FirestoreAttendanceHousehold {
  householdName?: string;
  normalizedName?: string;
  active?: boolean;
  availableFrom?: Timestamp;
  createdAt?: Timestamp;
}

interface AttendanceMemberRow {
  id: string;
  householdName: string;
  normalizedName: string;
  availableFrom: Date;
}

export default function AttendanceMembersPage() {
  useEffect(() => {
    document.title = 'Attendance Members List | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<AttendanceMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      return;
    }

    const loadMembers = async () => {
      try {
        setLoading(true);
        setError(null);

        const snapshot = await getDocs(query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc')));
        setMembers(
          snapshot.docs
            .map((doc) => {
              const data = doc.data() as FirestoreAttendanceHousehold;
              return {
                id: doc.id,
                householdName: data.householdName || 'Unnamed Household',
                normalizedName: data.normalizedName || normalizeAttendanceName(data.householdName || ''),
                availableFrom: data.availableFrom?.toDate() || data.createdAt?.toDate() || new Date(2000, 0, 2, 12, 0, 0, 0),
                active: data.active !== false,
              };
            })
            .filter((member) => member.active)
            .map((member) => ({
              id: member.id,
              householdName: member.householdName,
              normalizedName: member.normalizedName,
              availableFrom: member.availableFrom,
            })),
        );
      } catch (loadError) {
        console.error('Error loading attendance members:', loadError);
        setError('Failed to load attendance members.');
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [userProfile]);

  if (!userProfile?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Members List</h1>
          <p className="mt-2 text-sm text-text-light">All imported attendance households and when they started attending.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#D6805F]"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-charcoal">Household</th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-charcoal">Started Attending</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="odd:bg-white even:bg-slate-50/40">
                  <td className="border-t border-border px-4 py-3 text-charcoal">{member.householdName}</td>
                  <td className="border-t border-border px-4 py-3 text-charcoal">{format(member.availableFrom, 'MMMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
