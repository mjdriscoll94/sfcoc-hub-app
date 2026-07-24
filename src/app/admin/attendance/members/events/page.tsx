'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';

type CelebrationType = 'birthday' | 'anniversary';

interface ImportantEvent {
  id: string;
  type: CelebrationType | 'baptism' | 'attendanceStart' | 'other';
  date: string;
  title: string;
}

interface CelebrationEvent {
  id: string;
  householdName: string;
  type: CelebrationType;
  title: string;
  day: number;
  month: number;
}

const MONTHS = Array.from({ length: 12 }, (_, month) => format(new Date(2026, month, 1), 'MMMM'));

const getEventDateParts = (date: string) => {
  const match = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsedDate = new Date(2000, month, day);

  return parsedDate.getMonth() === month && parsedDate.getDate() === day ? { month, day } : null;
};

export default function BirthdayAndAnniversaryListPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [eventsByMonth, setEventsByMonth] = useState<CelebrationEvent[][]>(() => MONTHS.map(() => []));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Birthday and Anniversary List | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) return;

    const loadCelebrations = async () => {
      try {
        setLoading(true);
        setError(null);

        const snapshot = await getDocs(collection(db, 'attendanceHouseholds'));
        const celebrations = snapshot.docs.flatMap((household) => {
          const data = household.data() as { householdName?: string; active?: boolean; importantEvents?: ImportantEvent[] };
          if (data.active === false || !Array.isArray(data.importantEvents)) return [];

          return data.importantEvents.flatMap((event) => {
            if (event.type !== 'birthday' && event.type !== 'anniversary') return [];
            const dateParts = getEventDateParts(event.date);
            if (!dateParts) return [];

            return [{
              id: event.id,
              householdName: data.householdName || 'Unnamed Household',
              type: event.type,
              title: event.title || (event.type === 'birthday' ? 'Birthday' : 'Anniversary'),
              ...dateParts,
            }];
          });
        });

        const groupedEvents = MONTHS.map((_, month) =>
          celebrations
            .filter((event) => event.month === month)
            .sort((a, b) => a.day - b.day || a.householdName.localeCompare(b.householdName) || a.title.localeCompare(b.title)),
        );
        setEventsByMonth(groupedEvents);
      } catch (loadError) {
        console.error('Error loading birthday and anniversary events:', loadError);
        setError('Failed to load birthday and anniversary events.');
      } finally {
        setLoading(false);
      }
    };

    loadCelebrations();
  }, [userProfile]);

  if (!userProfile?.isAdmin) return null;

  const hasEvents = eventsByMonth.some((events) => events.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Birthday and Anniversary List</h1>
          <p className="mt-2 text-sm text-text-light">Birthdays and anniversaries from member important events, organized by month.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#D6805F]" />
        </div>
      ) : !hasEvents ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-text-light shadow-sm">
          No birthdays or anniversaries have been recorded yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {eventsByMonth.map((events, month) => (
            <section key={MONTHS[month]} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <h2 className="bg-slate-50 px-5 py-3 text-lg font-semibold text-charcoal">{MONTHS[month]}</h2>
              {events.length === 0 ? (
                <p className="px-5 py-4 text-sm text-text-light">No celebrations recorded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {events.map((event) => (
                    <li key={`${event.id}-${event.householdName}`} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-8 text-right text-lg font-semibold text-charcoal">{event.day}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-charcoal">{event.title}</p>
                        <p className="text-sm text-text-light">{event.householdName}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {event.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
