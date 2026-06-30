'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { getDateFromSundayKey, normalizeAttendanceName, type AttendanceHousehold } from '@/lib/utils/attendance';

interface FirestoreAttendanceHousehold {
  householdName?: string;
  normalizedName?: string;
  active?: boolean;
  availableFrom?: Timestamp;
  createdAt?: Timestamp;
}

interface HistoryRecord {
  id: string;
  serviceDate: Date;
  noService: boolean;
  counts: Record<string, number>;
}

const COLUMNS_PER_PAGE = 8;

export default function AttendanceHistoryPage() {
  useEffect(() => {
    document.title = 'Attendance History | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [households, setHouseholds] = useState<AttendanceHousehold[]>([]);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [page, setPage] = useState(0);
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

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const [householdsSnapshot, recordsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc'))),
          getDocs(query(collection(db, 'attendanceRecords'), orderBy('serviceDate', 'desc'))),
        ]);

        setHouseholds(
          householdsSnapshot.docs
            .map((snapshot) => {
              const data = snapshot.data() as FirestoreAttendanceHousehold;
              return {
                id: snapshot.id,
                householdName: data.householdName || 'Unnamed Household',
                normalizedName: data.normalizedName || normalizeAttendanceName(data.householdName || ''),
                active: data.active !== false,
                availableFrom: data.availableFrom?.toDate() || data.createdAt?.toDate() || new Date(2000, 0, 2, 12, 0, 0, 0),
              };
            })
            .filter((household) => household.active),
        );

        setRecords(
          recordsSnapshot.docs.map((snapshot) => {
            const data = snapshot.data() as { serviceDate?: Timestamp; noService?: boolean; counts?: Record<string, number> };
            return {
              id: snapshot.id,
              serviceDate: data.serviceDate?.toDate() || getDateFromSundayKey(snapshot.id),
              noService: data.noService === true,
              counts: data.counts || {},
            };
          }),
        );
      } catch (loadError) {
        console.error('Error loading attendance history:', loadError);
        setError('Failed to load attendance history.');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [userProfile]);

  if (!userProfile?.isAdmin) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(records.length / COLUMNS_PER_PAGE));
  const pagedRecords = records.slice(page * COLUMNS_PER_PAGE, (page + 1) * COLUMNS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center">
          <BackButton className="mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Attendance History</h1>
            <p className="mt-2 text-sm text-text-light">Browse attendance by Sunday in a paged column view.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-charcoal transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous history page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="rounded-md border border-border px-3 py-2 text-sm font-medium text-charcoal">
            Page {page + 1} of {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-charcoal transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next history page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#D6805F]"></div>
        </div>
      ) : pagedRecords.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-light">
          No attendance history found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 min-w-[220px] border-b border-r border-border bg-slate-50 px-4 py-3 text-left font-semibold text-charcoal">
                  Household
                </th>
                {pagedRecords.map((record) => (
                  <th key={record.id} className="min-w-[120px] border-b border-border px-3 py-3 text-center font-semibold text-charcoal">
                    <div>{format(record.serviceDate, 'MMM d, yyyy')}</div>
                    <div className="mt-1 text-xs font-normal text-text-light">
                      {record.noService ? 'No Service' : 'Service'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {households.map((household) => (
                <tr key={household.id} className="odd:bg-white even:bg-slate-50/40">
                  <td className="sticky left-0 z-10 border-r border-t border-border bg-inherit px-4 py-3 font-medium text-charcoal">
                    {household.householdName}
                  </td>
                  {pagedRecords.map((record) => {
                    const unavailable = household.availableFrom.getTime() > record.serviceDate.getTime();
                    const count = record.counts[household.id];
                    return (
                      <td key={record.id} className="border-t border-border px-3 py-3 text-center text-charcoal">
                        {record.noService ? (
                          <span className="text-xs text-text-light">-</span>
                        ) : unavailable ? (
                          <span className="text-xs text-text-light">N/A</span>
                        ) : typeof count === 'number' ? (
                          <span className={count === 0 ? 'font-semibold text-red-700' : 'font-semibold text-charcoal'}>{count}</span>
                        ) : (
                          <span className="text-xs text-text-light">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
