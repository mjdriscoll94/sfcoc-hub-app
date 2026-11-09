import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

function escapeControlCharactersInJsonStrings(value: string): string {
  let normalized = '';
  let inString = false;
  let escaped = false;

  for (const character of value) {
    if (!inString) {
      normalized += character;
      if (character === '"') inString = true;
      continue;
    }

    if (escaped) {
      normalized += character;
      escaped = false;
    } else if (character === '\\') {
      normalized += character;
      escaped = true;
    } else if (character === '"') {
      normalized += character;
      inString = false;
    } else if (character === '\n') {
      normalized += '\\n';
    } else if (character === '\r') {
      normalized += '\\r';
    } else if (character === '\t') {
      normalized += '\\t';
    } else {
      normalized += character;
    }
  }

  return normalized;
}

function parseServiceAccount(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(escapeControlCharactersInJsonStrings(value));
  }
}

export const initAdmin = () => {
  try {
    if (getApps().length === 0) {
      console.log('Initializing Firebase Admin...');
      
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccount) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
      }
      
      try {
        const serviceAccountJson = parseServiceAccount(serviceAccount);
        console.log('Service account parsed successfully:', {
          projectId: serviceAccountJson.project_id,
          clientEmail: serviceAccountJson.client_email
        });
        
        const app = initializeApp({
          credential: cert(serviceAccountJson),
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
        });
        
        console.log('Firebase Admin app initialized successfully');
        
        // Initialize Realtime Database
        console.log('Initializing Admin Realtime Database...');
        const rtdb = getDatabase(app);
        console.log('Admin Realtime Database initialized successfully');
        
        return { app, rtdb };
      } catch (parseError) {
        console.error('Failed to parse service account JSON:', parseError);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
      }
    } else {
      console.log('Firebase Admin already initialized');
      const app = getApps()[0];
      const rtdb = getDatabase(app);
      return { app, rtdb };
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
};

/** Lazy app reference — avoids requiring FIREBASE_SERVICE_ACCOUNT_KEY at build time (e.g. Vercel). */
export function getAdminApp() {
  initAdmin();
  return getApps()[0];
}

/** Lazy Firestore instance. */
export function getAdminDb() {
  return getFirestore(getAdminApp());
}
