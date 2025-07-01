'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  DocumentData,
  FirestoreError,
  Query,
  addDoc
} from 'firebase/firestore';

export interface PrayerPraiseItem {
  id: string;
  type: 'prayer' | 'praise';
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
  };
  dateCreated: Date;
  prayerCount: number;
  isAnonymous: boolean;
  isAdminOnly: boolean;
  status: 'active' | 'archived';
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export function usePrayerPraise(type?: 'prayer' | 'praise', includeUnapproved: boolean = false) {
  const [items, setItems] = useState<PrayerPraiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setIsIndexBuilding(false);

    // Create query based on type and approval status
    let q: Query;
    try {
      const baseQuery = includeUnapproved
        ? query(collection(db, 'prayerPraise'))
        : query(
            collection(db, 'prayerPraise'),
            where('approvalStatus', '==', 'approved')
          );

      q = type
        ? query(
            baseQuery,
            where('type', '==', type),
            where('status', '==', 'active'),
            orderBy('dateCreated', 'desc')
          )
        : query(
            baseQuery,
            where('status', '==', 'active'),
            orderBy('dateCreated', 'desc')
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
        const prayerPraiseItems = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dateCreated: (data.dateCreated as Timestamp)?.toDate() || new Date(),
          } as PrayerPraiseItem;
        });
        setItems(prayerPraiseItems);
        setLoading(false);
        setIsIndexBuilding(false);
      },
      (error) => {
        console.error('Error fetching prayer/praise items:', error);
        
        // Check if the error is due to missing index
        if (error instanceof FirestoreError && 
            error.code === 'failed-precondition' && 
            error.message.includes('requires an index')) {
          setIsIndexBuilding(true);
          setError('The database is being optimized for faster queries. This may take a few minutes. Please refresh the page shortly.');
        } else {
          setError('Failed to load prayer and praise items');
        }
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [type, includeUnapproved]);

  // Function to increment prayer count
  const incrementPrayerCount = async (id: string) => {
    try {
      const docRef = doc(db, 'prayerPraise', id);
      const docSnap = await getDoc(docRef);
      const currentCount = docSnap.data()?.prayerCount || 0;
      
      await updateDoc(docRef, {
        prayerCount: currentCount + 1
      });
    } catch (error) {
      console.error('Error incrementing prayer count:', error);
      throw new Error('Failed to update prayer count');
    }
  };

  // Function to update approval status
  const updateApprovalStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const docRef = doc(db, 'prayerPraise', id);
      await updateDoc(docRef, {
        approvalStatus: status
      });
    } catch (error) {
      console.error('Error updating approval status:', error);
      throw new Error('Failed to update approval status');
    }
  };

  return {
    items,
    loading,
    error,
    isIndexBuilding,
    incrementPrayerCount,
    updateApprovalStatus
  };
} 