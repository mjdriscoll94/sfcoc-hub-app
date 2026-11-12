'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FIRESTORE_LOAD_TIMEOUT_MS, FIRESTORE_TIMEOUT_MESSAGE } from '@/lib/firebase/loading';
import type { LeadershipLesson } from '@/types/leadership';

type LeadershipLessonsResponse = {
  lessons?: LeadershipLesson[];
  error?: string;
};

export function useLeadershipLessons(options: { admin?: boolean } = {}) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LeadershipLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FIRESTORE_LOAD_TIMEOUT_MS);

    async function loadLessons() {
      setLoading(true);
      setError(null);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(
          options.admin ? '/api/admin/leadership-lessons' : '/api/member/leadership-lessons',
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: controller.signal,
          }
        );
        const data = await response.json() as LeadershipLessonsResponse;
        if (!response.ok) throw new Error(data.error || 'We couldn’t load the leadership course.');
        if (active) setLessons(data.lessons ?? []);
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof DOMException && caught.name === 'AbortError'
            ? FIRESTORE_TIMEOUT_MESSAGE
            : caught instanceof Error
              ? caught.message
              : 'We couldn’t load the leadership course.'
        );
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }

    loadLessons();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [options.admin, reloadKey, user]);

  return { lessons, loading, error, retry };
}
