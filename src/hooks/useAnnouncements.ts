'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  FirestoreError,
  Query
} from 'firebase/firestore';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  datePosted: Date;
  expiryDate?: Date;
  priority: 'high' | 'normal' | 'low';
  status: 'active' | 'archived';
}

export function useAnnouncements() {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setIsIndexBuilding(false);

    // Create query
    let q: Query;
    try {
      q = query(
        collection(db, 'announcements'),
        where('status', '==', 'active'),
        orderBy('datePosted', 'desc')
      );
    } catch (error) {
      console.error('Error creating query:', error);
      setError('Failed to create query');
      setLoading(false);
      return () => {};
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const announcementItems = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            datePosted: (data.datePosted as Timestamp)?.toDate() || new Date(),
            expiryDate: data.expiryDate ? (data.expiryDate as Timestamp).toDate() : undefined,
          } as AnnouncementItem;
        });
        setItems(announcementItems);
        setLoading(false);
        setIsIndexBuilding(false);
      },
      (error) => {
        console.error('Error fetching announcements:', error);
        
        // Check if the error is due to missing index
        if (error instanceof FirestoreError && 
            error.code === 'failed-precondition' && 
            error.message.includes('requires an index')) {
          setIsIndexBuilding(true);
          setError('The database is being optimized for faster queries. This may take a few minutes. Please refresh the page shortly.');
        } else {
          setError('Failed to load announcements');
        }
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return {
    items,
    loading,
    error,
    isIndexBuilding
  };
} 