'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FIRESTORE_LOAD_TIMEOUT_MS, FIRESTORE_TIMEOUT_MESSAGE } from '@/lib/firebase/loading';
import { localDateFromDateOnlyKey } from '@/lib/calendar/dateOnly';

export type DashboardAnnouncement = {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
};

export type DashboardEvent = {
  id: string;
  title: string;
  startDate: Date;
  allDay: boolean;
  dateKey?: string;
  location?: string;
};

export type DashboardResource = {
  id: string;
  title: string;
  date: Date;
  fileUrl: string;
};

type DashboardState = {
  announcements: DashboardAnnouncement[];
  events: DashboardEvent[];
  bulletin: DashboardResource | null;
  lessonNote: DashboardResource | null;
  prayerCount: number;
  loading: boolean;
  error: string | null;
};

type DashboardResponse = {
  announcements?: Array<Omit<DashboardAnnouncement, 'createdAt'> & { createdAt: number }>;
  events?: Array<Omit<DashboardEvent, 'startDate'> & { startDate: number }>;
  bulletin?: (Omit<DashboardResource, 'date'> & { date: number }) | null;
  lessonNote?: (Omit<DashboardResource, 'date'> & { date: number }) | null;
  prayerCount?: number;
  partialError?: boolean;
  error?: string;
};

const INITIAL_STATE: DashboardState = {
  announcements: [],
  events: [],
  bulletin: null,
  lessonNote: null,
  prayerCount: 0,
  loading: true,
  error: null,
};

export function useMemberDashboard(): DashboardState & { retry: () => void } {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;
    let active = true;
    const controller = new AbortController();
    const loadingTimeout = window.setTimeout(() => controller.abort(), FIRESTORE_LOAD_TIMEOUT_MS);

    async function loadDashboard() {
      try {
        setState((current) => ({ ...current, loading: true, error: null }));
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/member/dashboard', {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json() as DashboardResponse;
        if (!response.ok) {
          throw new Error(data.error || 'We couldn’t load your member home.');
        }

        if (active) {
          setState({
            announcements: (data.announcements || []).map((announcement) => ({
              ...announcement,
              createdAt: new Date(announcement.createdAt),
            })),
            events: (data.events || []).map((event) => ({
              ...event,
              startDate:
                (event.allDay && event.dateKey
                  ? localDateFromDateOnlyKey(event.dateKey)
                  : null) ?? new Date(event.startDate),
            })),
            bulletin: data.bulletin ? { ...data.bulletin, date: new Date(data.bulletin.date) } : null,
            lessonNote: data.lessonNote ? { ...data.lessonNote, date: new Date(data.lessonNote.date) } : null,
            prayerCount: data.prayerCount || 0,
            loading: false,
            error: data.partialError
              ? 'Some member updates could not be loaded. The full pages are still available.'
              : null,
          });
        }
      } catch (error) {
        if (!active) return;
        console.error('Failed to load member dashboard:', error);
        setState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof DOMException && error.name === 'AbortError'
              ? FIRESTORE_TIMEOUT_MESSAGE
              : error instanceof Error
                ? error.message
                : 'We couldn’t load your member home. Please try again.',
        }));
      } finally {
        window.clearTimeout(loadingTimeout);
      }
    }

    loadDashboard();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(loadingTimeout);
    };
  }, [reloadKey, user]);

  return { ...state, retry };
}
