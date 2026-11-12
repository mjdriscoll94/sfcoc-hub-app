'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authenticatedJson } from '@/lib/api/authenticatedFetch';
import type { DashboardMediaItem } from '@/types/dashboardMedia';

type DashboardMediaResponse = {
  sermon: DashboardMediaItem | null;
  podcast: DashboardMediaItem | null;
  podcastShowUrl: string;
};

type DashboardMediaState = {
  sermon: DashboardMediaItem | null;
  podcast: DashboardMediaItem | null;
  podcastShowUrl: string;
  loading: boolean;
};

const INITIAL_STATE: DashboardMediaState = {
  sermon: null,
  podcast: null,
  podcastShowUrl: 'https://open.spotify.com/show/6BUbTQmZOpUZ9KvpOLPtwy',
  loading: true,
};

export function useDashboardMedia(): DashboardMediaState {
  const { user } = useAuth();
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    authenticatedJson<DashboardMediaResponse>('/api/member/dashboard/media', { signal: controller.signal })
      .then((data) => setState({ ...data, loading: false }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Dashboard media load error:', error);
        setState((current) => ({ ...current, loading: false }));
      });

    return () => controller.abort();
  }, [user]);

  return state;
}

