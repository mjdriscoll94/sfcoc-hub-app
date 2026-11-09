'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Debug: Log config values (without exposing sensitive data)
console.log('Firebase Config Status:', {
  apiKeyExists: !!firebaseConfig.apiKey,
  authDomainExists: !!firebaseConfig.authDomain,
  projectIdExists: !!firebaseConfig.projectId,
  storageBucketExists: !!firebaseConfig.storageBucket,
  messagingSenderIdExists: !!firebaseConfig.messagingSenderId,
  appIdExists: !!firebaseConfig.appId,
  measurementIdExists: !!firebaseConfig.measurementId,
  databaseURLExists: !!firebaseConfig.databaseURL
});

// Initialize Firebase once and reuse it across route changes and hot reloads.
let app: FirebaseApp;
let isNewApp = false;
try {
  if (getApps().length === 0) {
    console.log('Initializing new Firebase app...');
    app = initializeApp(firebaseConfig);
    isNewApp = true;
  } else {
    console.log('Using existing Firebase app...');
    app = getApps()[0];
  }
  console.log('Firebase app initialized successfully:', {
    projectId: app.options.projectId,
    databaseURL: app.options.databaseURL
  });
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  throw error;
}

// Initialize Firestore. In the browser, keep a multi-tab IndexedDB cache so
// previously viewed data can appear immediately while Firestore refreshes it.
console.log('Initializing Firestore...');
const db: Firestore = isNewApp
  ? initializeFirestore(
      app,
      typeof window === 'undefined'
        ? {}
        : {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          }
    )
  : getFirestore(app);

// Initialize Auth with persistence
console.log('Initializing Auth...');
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence set to local');
    // Add auth state change listener for debugging
    onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User is signed in' : 'User is signed out');
    });
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Initialize Realtime Database
console.log('Initializing Realtime Database...');
const rtdb = getDatabase(app);
console.log('Realtime Database initialized');

// Initialize Storage
console.log('Initializing Storage...');
const storage = getStorage(app);
console.log('Storage initialized');

export { app, db, auth, rtdb, storage };
