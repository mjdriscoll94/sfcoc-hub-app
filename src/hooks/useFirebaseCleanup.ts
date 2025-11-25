'use client';

import { useEffect } from 'react';
import { getApps } from 'firebase/app';

/**
 * Hook to ensure proper Firebase cleanup on component unmount
 * This prevents "access control checks" errors caused by stale Firebase connections
 * 
 * Usage: Call this hook in components that use Firebase real-time listeners (onSnapshot, etc.)
 */
export function useFirebaseCleanup() {
  useEffect(() => {
    // Cleanup function that runs when component unmounts
    return () => {
      // Note: We don't actually delete the app here in normal unmount
      // because other components might still be using it.
      // The global cleanup in config.ts handles app deletion on page unload.
      
      // This hook is mainly for cleaning up listeners in individual components
      // by returning cleanup functions from their useEffect hooks
    };
  }, []);
}

/**
 * Hook to clean up Firebase on route changes in Next.js
 * Use this in layout.tsx or page.tsx files that need aggressive cleanup
 */
export function useFirebaseRouteCleanup() {
  useEffect(() => {
    const handleRouteChange = async () => {
      try {
        const apps = getApps();
        if (apps.length > 1) {
          // If we have multiple Firebase app instances, clean up duplicates
          console.log('Multiple Firebase apps detected, cleaning up duplicates...');
          const [primaryApp, ...duplicates] = apps;
          await Promise.all(duplicates.map(app => app.delete()));
        }
      } catch (error) {
        console.error('Error during route cleanup:', error);
      }
    };

    // Listen for visibility changes (tab switching, navigation)
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleRouteChange);
      
      return () => {
        window.removeEventListener('visibilitychange', handleRouteChange);
      };
    }
  }, []);
}

