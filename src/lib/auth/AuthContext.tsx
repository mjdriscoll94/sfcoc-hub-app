'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { isPushNotificationSupported } from '../notifications/pushNotifications';
import { UserProfile } from '@/types';
import { createUserProfile } from './authUtils';
import { convertToDate } from '@/lib/utils/dateUtils';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  updateUserProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
  updateUserProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to check PWA status and reset notifications if needed
  const checkPWAStatusAndReset = async (profile: UserProfile) => {
    const support = isPushNotificationSupported();
    
    // If notifications were enabled but we're not in PWA mode, reset them
    if (profile.notificationsEnabled && !support.isPWA) {
      console.log('Resetting notification status due to PWA status change');
      await updateDoc(doc(db, 'users', profile.uid), {
        notificationsEnabled: false,
        lastNotificationCheck: new Date().toISOString()
      });
      
      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        notificationsEnabled: false,
        lastNotificationCheck: new Date().toISOString()
      } : null);
    }
  };

  // Function to load user profile
  const loadUserProfile = async (user: User) => {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Set default approvalStatus for existing users
        if (!data.approvalStatus) {
          await updateDoc(docRef, {
            approvalStatus: 'approved' // Assume existing users are approved
          });
          data.approvalStatus = 'approved';
        }
        const profile = data as UserProfile;
        // Check PWA status and reset notifications if needed
        await checkPWAStatusAndReset(profile);
        setUserProfile(profile);
        return profile;
      } else {
        // Create new profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isAdmin: false,
          notificationsEnabled: false,
          approvalStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          emailSubscriptions: {
            announcements: false,
            events: false,
            newsletter: false,
          },
        };
        await setDoc(docRef, newProfile);
        setUserProfile(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError(error as Error);
      throw error;
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // First, ensure the user profile exists
        const profile = await createUserProfile(user);
        if (profile) {
          setUserProfile({
            ...profile,
            createdAt: convertToDate(profile.createdAt),
            updatedAt: convertToDate(profile.updatedAt)
          });
        }

        // Then, set up real-time updates for the profile
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const updatedProfile = {
              ...data,
              createdAt: convertToDate(data.createdAt),
              updatedAt: convertToDate(data.updatedAt),
              emailSubscriptions: {
                announcements: data.emailSubscriptions?.announcements ?? true,
                events: data.emailSubscriptions?.events ?? true,
                newsletter: data.emailSubscriptions?.newsletter ?? true
              }
            } as UserProfile;
            setUserProfile(updatedProfile);
          }
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const profile = await loadUserProfile(result.user);
      
      // Check if user is approved
      if (profile.approvalStatus === 'pending') {
        await firebaseSignOut(auth);
        throw new Error('Your account is pending approval. Please wait for an administrator to approve your account.');
      } else if (profile.approvalStatus === 'rejected') {
        await firebaseSignOut(auth);
        throw new Error('Your account has been rejected. Please contact an administrator for assistance.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error as Error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile with pending status
      const profile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        isAdmin: false,
        notificationsEnabled: false,
        approvalStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailSubscriptions: {
          announcements: false,
          events: false,
          newsletter: false,
        },
      };
      
      await setDoc(doc(db, 'users', result.user.uid), profile);
      setUserProfile(profile);
      
      // Sign out immediately after signup since approval is required
      await firebaseSignOut(auth);
      throw new Error('Your account has been created and is pending approval. You will be able to sign in once an administrator approves your account.');
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error as Error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out process');
      setError(null);
      
      // Clear all state first
      setUserProfile(null);
      setUser(null);
      
      // Unsubscribe from any Firestore listeners
      if (typeof window !== 'undefined') {
        const unsubFuncs = (window as any).__firebaseUnsubscribes || [];
        unsubFuncs.forEach((unsub: () => void) => unsub());
      }
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear any persisted state
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      
      // Force reload the page to clear any remaining state
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      
      console.log('AuthContext: Sign out complete');
    } catch (error) {
      console.error('AuthContext: Sign out error:', error);
      setError(error as Error);
      throw error;
    }
  };

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile({
      ...profile,
      createdAt: convertToDate(profile.createdAt),
      updatedAt: convertToDate(profile.updatedAt)
    });
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signOut,
    signUp,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 