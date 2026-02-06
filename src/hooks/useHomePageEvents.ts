import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { EventCategory } from '@/types';

export function useHomePageEvents() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'eventCategories'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title || '',
            order: d.order ?? 0,
            events: (d.events || []).map((e: Record<string, unknown>, i: number) => ({
              id: e.id ?? `event-${i}`,
              name: e.name || '',
              time: e.time || '',
              day: e.day || '',
              description: e.description || '',
              icon: (e.icon as EventCategory['events'][0]['icon']) || 'book',
            })),
            createdAt: (d.createdAt as Timestamp)?.toDate?.(),
            updatedAt: (d.updatedAt as Timestamp)?.toDate?.(),
          } as EventCategory;
        });
        setCategories(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching event categories:', err);
        setError('Failed to load events');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { categories, loading, error };
}
