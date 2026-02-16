import { auth } from '@/lib/firebase/config';
import { ActionCodeSettings, sendPasswordResetEmail as firebaseSendPasswordReset } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User, UserProfile } from '@/types';
import { sendWelcomeEmail } from '@/lib/email/emailService';
import { db } from '@/lib/firebase/config';
import { convertToDate } from '@/lib/utils/dateUtils';

const DEFAULT_EMAIL_SUBSCRIPTIONS = {
  announcements: true,
  events: true,
  newsletter: true
};

const actionCodeSettings: ActionCodeSettings = {
  url: process.env.NEXT_PUBLIC_PASSWORD_RESET_URL || 'http://localhost:3000/auth/reset-password',
  handleCodeInApp: true,
};

export const generatePasswordResetLink = async (email: string): Promise<string> => {
  try {
    await firebaseSendPasswordReset(auth, email, actionCodeSettings);
    return `${actionCodeSettings.url}?email=${encodeURIComponent(email)}`;
  } catch (error) {
    console.error('Error generating password reset link:', error);
    throw error;
  }
};

// Function to ensure user profile has all required fields
async function ensureUserProfileFields(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
  const updates: Partial<UserProfile> = {};
  let needsUpdate = false;

  // Check if emailSubscriptions exists and has all required fields
  if (!data.emailSubscriptions || typeof data.emailSubscriptions !== 'object') {
    updates.emailSubscriptions = DEFAULT_EMAIL_SUBSCRIPTIONS;
    needsUpdate = true;
  } else {
    const currentSubs = data.emailSubscriptions;
    if (typeof currentSubs.announcements !== 'boolean' ||
        typeof currentSubs.events !== 'boolean' ||
        typeof currentSubs.newsletter !== 'boolean') {
      updates.emailSubscriptions = {
        announcements: currentSubs.announcements ?? true,
        events: currentSubs.events ?? true,
        newsletter: currentSubs.newsletter ?? true
      };
      needsUpdate = true;
    }
  }

  // Ensure dates exist
  if (!data.createdAt) {
    updates.createdAt = new Date();
    needsUpdate = true;
  }
  if (!data.updatedAt) {
    updates.updatedAt = new Date();
    needsUpdate = true;
  }

  // If any required fields are missing, update the document
  if (needsUpdate) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);
  return {
    ...data,
    ...updates,
    createdAt: convertToDate(updates.createdAt || data.createdAt),
    updatedAt: convertToDate(updates.updatedAt || data.updatedAt),
    photoURL: data.photoURL || null
  } as UserProfile;
  }

  return {
    ...data,
    createdAt: convertToDate(data.createdAt),
    updatedAt: convertToDate(data.updatedAt),
    photoURL: data.photoURL || null
  } as UserProfile;
}

export const createUserProfile = async (user: User, additionalData?: Partial<UserProfile>) => {
  if (!user.uid) return null;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName, photoURL } = user;
    const now = new Date();

    const newProfile: UserProfile = {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      createdAt: now,
      updatedAt: now,
      emailSubscriptions: DEFAULT_EMAIL_SUBSCRIPTIONS,
      role: 'user',
      isAdmin: false,
      notificationsEnabled: false,
      approvalStatus: 'pending',
      ...additionalData
    };

    try {
      await setDoc(userRef, newProfile);

      // Send welcome email
      if (email) {
        try {
          await sendWelcomeEmail(email, displayName || undefined);
        } catch (error) {
          console.error('Error sending welcome email:', error);
        }
      }

      return newProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }

  // For existing profiles, ensure all required fields exist
  const data = snapshot.data();
  if (!data) return null;

  return ensureUserProfileFields(user.uid, data as Partial<UserProfile>);
}; 