'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authenticatedJson } from '@/lib/api/authenticatedFetch';
import type { PrayerPraiseItem } from '@/types/prayer';

export type { PrayerPraiseItem } from '@/types/prayer';

type PrayerView = 'active' | 'following' | 'mine' | 'archived' | 'admin';

export function usePrayerPraise(
  type?: 'prayer' | 'praise',
  includeUnapproved = false,
  requestedView: PrayerView = 'active',
  includeArchived = false,
) {
  const { user } = useAuth();
  const [items, setItems] = useState<PrayerPraiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('view', includeUnapproved ? 'admin' : requestedView);
    if (type) params.set('type', type);
    if (includeArchived) params.set('includeArchived', 'true');

    authenticatedJson<{ requests: PrayerPraiseItem[] }>(`/api/prayer-requests?${params}`, { signal: controller.signal })
      .then((data) => setItems(data.requests))
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        console.error('Prayer request load error:', caught);
        setError(caught instanceof Error ? caught.message : 'We couldn’t load prayer requests.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [includeArchived, includeUnapproved, reloadKey, requestedView, type, user]);

  const createPrayerRequest = async (data: {
    type: 'prayer' | 'praise';
    title: string;
    description: string;
    isAnonymous: boolean;
    isAdminOnly: boolean;
  }) => {
    await authenticatedJson('/api/prayer-requests', { method: 'POST', body: JSON.stringify(data) });
    retry();
  };

  const incrementPrayerCount = async (id: string) => {
    const result = await authenticatedJson<{ prayerCount: number }>(`/api/prayer-requests/${id}/prayed`, { method: 'POST' });
    setItems((current) => current.map((item) => item.id === id ? { ...item, prayerCount: result.prayerCount } : item));
  };

  const updatePrayerRequest = async (id: string, data: Record<string, unknown>) => {
    const result = await authenticatedJson<{ request: PrayerPraiseItem }>(`/api/prayer-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setItems((current) => current.map((item) => item.id === id ? result.request : item));
    return result.request;
  };

  const updateApprovalStatus = async (id: string, approvalStatus: 'approved' | 'rejected') => {
    await updatePrayerRequest(id, { approvalStatus });
  };

  const deletePrayerRequest = async (id: string) => {
    await authenticatedJson(`/api/prayer-requests/${id}`, { method: 'DELETE' });
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const setFollowing = async (id: string, following: boolean) => {
    await authenticatedJson(`/api/prayer-requests/${id}/follow`, { method: following ? 'POST' : 'DELETE' });
    setItems((current) => current.map((item) => item.id === id ? {
      ...item,
      isFollowing: following,
      followerCount: Math.max(0, item.followerCount + (following ? 1 : -1)),
    } : item));
  };

  return {
    items,
    loading,
    error,
    isIndexBuilding: false,
    retry,
    createPrayerRequest,
    incrementPrayerCount,
    updateApprovalStatus,
    updatePrayerRequest,
    deletePrayerRequest,
    setFollowing,
  };
}
