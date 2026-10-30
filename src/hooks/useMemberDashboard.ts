'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { CalendarEvent } from '@/lib/firebase/models';
import { calendarEventFromFirestore, expandAllEvents } from '@/lib/calendar/recurrence';

export type DashboardAnnouncement = {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
};

type DashboardState = {
  announcements: DashboardAnnouncement[];
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
};

async function loadAnnouncements(): Promise<DashboardAnnouncement[]> {
  const snapshot = await getDocs(
    query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3))
  );

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      title: String(data.title ?? 'Announcement'),
      type: String(data.type ?? 'General'),
      createdAt: (data.createdAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
    };
  });
}

async function loadUpcomingEvents(): Promise<CalendarEvent[]> {
  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setMonth(rangeEnd.getMonth() + 6);

  const futureQuery = query(
    collection(db, 'calendarEvents'),
    where('startDate', '>=', Timestamp.fromDate(rangeStart)),
    where('startDate', '<=', Timestamp.fromDate(rangeEnd)),
    orderBy('startDate'),
    limit(20)
  );
  const recurringQuery = query(
    collection(db, 'calendarEvents'),
    where('hasRecurrence', '==', true),
    where('startDate', '<=', Timestamp.fromDate(rangeEnd)),
    orderBy('startDate')
  );
  const [futureSnapshot, recurringSnapshot] = await Promise.all([
    getDocs(futureQuery),
    getDocs(recurringQuery),
  ]);

  const raw: CalendarEvent[] = [];
  const seen = new Set<string>();
  for (const document of futureSnapshot.docs) {
    seen.add(document.id);
    raw.push(calendarEventFromFirestore(document.id, document.data()));
  }
  for (const document of recurringSnapshot.docs) {
    if (!seen.has(document.id)) {
      raw.push(calendarEventFromFirestore(document.id, document.data()));
    }
  }

  return expandAllEvents(raw, rangeStart, rangeEnd)
    .filter((event) => event.startDate >= rangeStart)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 3);
}

export function useMemberDashboard(): DashboardState {
  const [state, setState] = useState<DashboardState>({
    announcements: [],
    events: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [announcements, events] = await Promise.all([
          loadAnnouncements(),
          loadUpcomingEvents(),
        ]);
        if (active) {
          setState({ announcements, events, loading: false, error: null });
        }
      } catch (error) {
        console.error('Failed to load member dashboard:', error);
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            error: 'Some member updates could not be loaded. The full pages are still available.',
          }));
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
