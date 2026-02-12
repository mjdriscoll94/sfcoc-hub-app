'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

export type AnnouncementType = 'Weekly' | 'KFC' | 'General' | 'Youth' | 'Young Adult';

export interface AdminAnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  createdAt: Date;
  createdBy: {
    uid: string;
    displayName: string;
  };
  status: 'active' | 'archived';
}

function parseTimestamp(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as Timestamp).toDate === 'function') {
    return (v as Timestamp).toDate();
  }
  return new Date();
}

export function useAnnouncementsAdmin() {
  const [items, setItems] = useState<AdminAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? '',
            content: data.content ?? '',
            type: (data.type as AnnouncementType) || 'General',
            createdAt: parseTimestamp(data.createdAt),
            createdBy: data.createdBy ?? { uid: '', displayName: 'Unknown' },
            status: (data.status as 'active' | 'archived') ?? 'active',
          } as AdminAnnouncementItem;
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error('useAnnouncementsAdmin', err);
        setError('Failed to load announcements');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const updateAnnouncement = async (
    id: string,
    data: Partial<Pick<AdminAnnouncementItem, 'title' | 'content' | 'type' | 'status'>>
  ) => {
    const ref = doc(db, 'announcements', id);
    await updateDoc(ref, data);
  };

  const deleteAnnouncement = async (id: string) => {
    await deleteDoc(doc(db, 'announcements', id));
  };

  return {
    items,
    loading,
    error,
    updateAnnouncement,
    deleteAnnouncement,
  };
}
