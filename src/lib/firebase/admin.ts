import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

export const initAdmin = () => {
  try {
    if (getApps().length === 0) {
      console.log('Initializing Firebase Admin...');
      
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccount) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
      }
      
      try {
        const serviceAccountJson = JSON.parse(serviceAccount);
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

// Initialize admin and get Firestore instance
initAdmin();
export const adminDb = getFirestore(); 