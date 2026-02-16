'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ShepherdJourneyProvider, useShepherd } from 'react-shepherd';
import { useAuth } from '@/lib/auth/AuthContext';
import { getOnboardingSteps } from '@/lib/tour/onboardingSteps';
import 'shepherd.js/dist/css/shepherd.css';

type OnboardingTourContextValue = {
  startTour: () => void;
};

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

export function useOnboardingTour(): OnboardingTourContextValue {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) {
    return {
      startTour: () => {
        // If called outside provider, navigate to home with tour param
        if (typeof window !== 'undefined') {
          window.location.href = '/?tour=1';
        }
      }
    };
  }
  return ctx;
}

function TourInner({ children }: { children: React.ReactNode }) {
  const Shepherd = useShepherd();
  const { user, userProfile, markOnboardingTourCompleted } = useAuth();
  const [mounted, setMounted] = useState(false);

  const hasCompletedTour = !!userProfile?.onboardingTourCompletedAt;

  const startTour = useCallback(() => {
    if (!Shepherd) return;
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' }
      }
    });
    const steps = getOnboardingSteps(!!user);
    tour.addSteps(steps);
    tour.on('complete', () => markOnboardingTourCompleted());
    tour.on('cancel', () => {});
    tour.start();
  }, [Shepherd, user, markOnboardingTourCompleted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-start for first-time visitors on home page (logged-in users only)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const isHome = window.location.pathname === '/';
    const urlParams = new URLSearchParams(window.location.search);
    const forceTour = urlParams.get('tour') === '1';
    if (isHome && user && (forceTour || !hasCompletedTour)) {
      const timer = setTimeout(startTour, 800);
      return () => clearTimeout(timer);
    }
  }, [mounted, user, hasCompletedTour, startTour]);

  return (
    <OnboardingTourContext.Provider value={{ startTour }}>
      {children}
    </OnboardingTourContext.Provider>
  );
}

function TourTriggerButton() {
  const { startTour } = useOnboardingTour();
  return (
    <button
      onClick={startTour}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label="Take a tour of the site"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}

export function OnboardingTourProvider({ children }: { children: React.ReactNode }) {
  return (
    <ShepherdJourneyProvider>
      <TourInner>
        <TourTriggerButton />
        {children}
      </TourInner>
    </ShepherdJourneyProvider>
  );
}
