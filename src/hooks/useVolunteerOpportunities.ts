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
  FirestoreError,
  Query
} from 'firebase/firestore';

export interface VolunteerOpportunityItem {
  id: string;
  title: string;
  description: string;
  dateTime: Date;
  location: string;
  contactEmail: string;
  contactPhone?: string;
  maxVolunteers: number;
  currentVolunteers: number;
  volunteers: Array<{
    id: string;
    name: string;
  }>;
  status: 'open' | 'closed' | 'cancelled';
  createdAt: Date;
  createdBy: {
    uid: string;
    displayName: string;
  };
}

export function useVolunteerOpportunities() {
  const [items, setItems] = useState<VolunteerOpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setIsIndexBuilding(false);

    // Create query - only show approved opportunities
    let q: Query;
    try {
      q = query(
        collection(db, 'volunteerOpportunities'),
        where('status', '==', 'open'),
        where('approvalStatus', '==', 'approved'),
        orderBy('dateTime', 'asc')
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
        const volunteerItems = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dateTime: (data.dateTime as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            volunteers: data.volunteers || [],
            currentVolunteers: data.currentVolunteers || 0
          } as VolunteerOpportunityItem;
        });
        setItems(volunteerItems);
        setLoading(false);
        setIsIndexBuilding(false);
      },
      (error) => {
        console.error('Error fetching volunteer opportunities:', error);
        
        // Check if the error is due to missing index
        if (error instanceof FirestoreError && 
            error.code === 'failed-precondition' && 
            error.message.includes('requires an index')) {
          setIsIndexBuilding(true);
          setError('The database is being optimized for faster queries. This may take a few minutes. Please refresh the page shortly.');
        } else {
          setError('Failed to load volunteer opportunities');
        }
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Function to sign up for a volunteer opportunity
  const signUpForOpportunity = async (opportunityId: string, userId: string, userName: string) => {
    try {
      const docRef = doc(db, 'volunteerOpportunities', opportunityId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      if (!data) {
        throw new Error('Opportunity not found');
      }

      const currentVolunteers = data.volunteers || [];
      
      if (currentVolunteers.length >= data.maxVolunteers) {
        throw new Error('This opportunity is already full');
      }

      if (currentVolunteers.some((user: { id: string }) => user.id === userId)) {
        throw new Error('You have already signed up for this opportunity');
      }

      await updateDoc(docRef, {
        volunteers: [...currentVolunteers, { id: userId, name: userName }],
        currentVolunteers: currentVolunteers.length + 1,
        status: currentVolunteers.length + 1 >= data.maxVolunteers ? 'closed' : 'open',
      });
    } catch (error) {
      console.error('Error signing up for opportunity:', error);
      throw error;
    }
  };

  // Function to remove sign up from a volunteer opportunity
  const removeSignUp = async (opportunityId: string, userId: string) => {
    try {
      const docRef = doc(db, 'volunteerOpportunities', opportunityId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      if (!data) {
        throw new Error('Opportunity not found');
      }

      const currentVolunteers = data.volunteers || [];
      const updatedVolunteers = currentVolunteers.filter((user: { id: string }) => user.id !== userId);
      
      if (currentVolunteers.length === updatedVolunteers.length) {
        throw new Error('You are not signed up for this opportunity');
      }

      await updateDoc(docRef, {
        volunteers: updatedVolunteers,
        currentVolunteers: updatedVolunteers.length,
        status: 'open', // Reopen if it was closed
      });
    } catch (error) {
      console.error('Error removing sign up:', error);
      throw error;
    }
  };

  return {
    items,
    loading,
    error,
    isIndexBuilding,
    signUpForOpportunity,
    removeSignUp
  };
} 