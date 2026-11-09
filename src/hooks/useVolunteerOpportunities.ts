'use client';

import { useCallback, useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/AuthContext';
import { FIRESTORE_LOAD_TIMEOUT_MS, FIRESTORE_TIMEOUT_MESSAGE } from '@/lib/firebase/loading';
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

type VolunteerOpportunitiesResponse = {
  items?: Array<Omit<VolunteerOpportunityItem, 'dateTime' | 'createdAt'> & {
    dateTime: number;
    createdAt: number;
  }>;
  error?: string;
};

export function useVolunteerOpportunities() {
  const { user } = useAuth();
  const [items, setItems] = useState<VolunteerOpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;
    let active = true;
    let realtimeHasLoaded = false;
    setLoading(true);
    setError(null);
    setIsIndexBuilding(false);
    const controller = new AbortController();
    const loadingTimeout = window.setTimeout(() => controller.abort(), FIRESTORE_LOAD_TIMEOUT_MS);

    async function loadInitialItems() {
      try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/member/volunteer-opportunities', {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json() as VolunteerOpportunitiesResponse;
        if (!response.ok) {
          throw new Error(data.error || 'We couldn’t load volunteer opportunities.');
        }

        if (active) {
          if (!realtimeHasLoaded) {
            setItems((data.items || []).map((item) => ({
              ...item,
              dateTime: new Date(item.dateTime),
              createdAt: new Date(item.createdAt),
            })));
          }
          setLoading(false);
          setError(null);
          setIsIndexBuilding(false);
        }
      } catch (loadError) {
        if (!active) return;
        console.error('Failed to load volunteer opportunities:', loadError);
        setLoading(false);
        setError(
          loadError instanceof DOMException && loadError.name === 'AbortError'
            ? FIRESTORE_TIMEOUT_MESSAGE
            : loadError instanceof Error
              ? loadError.message
              : 'We couldn’t load volunteer opportunities. Please try again.'
        );
      } finally {
        window.clearTimeout(loadingTimeout);
      }
    }

    // Create query - only show approved opportunities
    let unsubscribe = () => {};
    try {
      const q: Query = query(
        collection(db, 'volunteerOpportunities'),
        where('status', '==', 'open'),
        where('approvalStatus', '==', 'approved'),
        orderBy('dateTime', 'asc')
      );
      // Keep the real-time listener for live capacity and sign-up updates. The
      // authenticated API above supplies the fast initial response.
      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          realtimeHasLoaded = true;
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
          setError(null);
          setIsIndexBuilding(false);
        },
        (error) => {
          console.error('Error fetching real-time volunteer updates:', error);

          // The API can still provide the initial list if real-time updates are
          // temporarily unavailable.
          if (error instanceof FirestoreError &&
              error.code === 'failed-precondition' &&
              error.message.includes('requires an index')) {
            setIsIndexBuilding(true);
            setError('The database is being optimized for faster queries. This may take a few minutes. Please refresh the page shortly.');
          }
        }
      );
    } catch (queryError) {
      console.error('Error starting real-time volunteer updates:', queryError);
    }

    loadInitialItems();

    // Cleanup subscription
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [reloadKey, user]);

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
    retry,
    signUpForOpportunity,
    removeSignUp
  };
}
