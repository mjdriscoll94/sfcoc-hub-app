'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from '@/lib/auth/AuthContext';
import { useHomePageEvents } from '@/hooks/useHomePageEvents';
import EventIcon from '@/components/EventIcon';
import { useOnboardingTour, isOnboardingTourActive } from '@/components/tour';

export default function Home() {
  const pathname = usePathname();
  const { user, userProfile, markOnboardingTourSeen } = useAuth();
  const startTour = useOnboardingTour();
  const tourStartedRef = useRef(false);
  const { categories, loading } = useHomePageEvents();

  useEffect(() => {
    document.title = 'Home | Sioux Falls Church of Christ';
  }, []);

  // Start onboarding tour once when a logged-in user lands on home for the first time
  useEffect(() => {
    if (
      pathname !== "/" ||
      !user ||
      !userProfile ||
      userProfile.hasSeenOnboardingTour === true ||
      tourStartedRef.current ||
      isOnboardingTourActive()
    ) {
      return;
    }
    tourStartedRef.current = true;
    startTour(markOnboardingTourSeen);
  }, [pathname, user, userProfile, startTour, markOnboardingTourSeen]);

  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set([0])); // Start with first category expanded

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px]" id="tour-home-hero">
        <div className="absolute inset-0">
          <Image
            src="/images/church-interior.jpg"
            alt="Church sanctuary with congregation"
            fill
            className="object-cover"
            priority
            quality={100}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="text-white max-w-2xl text-center">
            <h1 className="text-2xl md:text-4xl font-bold mb-4 uppercase tracking-wide">
              Sioux Falls Church of Christ
            </h1>
            <p className="text-xl md:text-2xl mb-8 uppercase tracking-wide">
              One body. Many members. United and serving together.
            </p>
            {user && (
              <div className="flex justify-center">
                <Link
                  href="/calendar"
                  className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center space-x-2 focus-ring uppercase tracking-wide"
                >
                  <span>View Calendar</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Regular Events Section */}
      <section className="py-16 bg-gradient-to-b from-bg-secondary to-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-charcoal uppercase tracking-wide">Events</h2>
            <p className="mt-4 text-lg text-text-light uppercase tracking-wide">Join us for our regular gatherings</p>
          </div>
          
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center text-text-light py-12">No events to display. Add events from the admin dashboard.</p>
            ) : (
              categories.map((category, categoryIndex) => (
                <div 
                  key={category.id} 
                  className="bg-white rounded-lg border border-border overflow-hidden shadow hover:shadow-md transition-all"
                >
                  <button
                    onClick={() => toggleCategory(categoryIndex)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left bg-gradient-to-r from-coral/5 to-sage/5 hover:from-coral/10 hover:to-sage/10 transition-all focus-ring"
                  >
                    <h3 className="text-xl font-semibold text-charcoal">
                      {category.title}
                    </h3>
                    <svg
                      className={`w-5 h-5 text-coral transform transition-transform ${
                        expandedCategories.has(categoryIndex) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  
                  <div
                    className={`transition-all duration-200 ease-in-out ${
                      expandedCategories.has(categoryIndex)
                        ? 'max-h-[1000px] opacity-100'
                        : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 pt-2 bg-white">
                      {category.events.map((event, eventIndex) => (
                        <div
                          key={event.id ?? eventIndex}
                          className="bg-card rounded-lg p-4 border border-border hover:border-coral hover:shadow-md transition-all flex items-start space-x-4 shadow-sm focus-ring"
                        >
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-gradient-to-br from-coral/20 to-sage/20 rounded-full">
                              <EventIcon icon={event.icon} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-charcoal mb-1">{event.name}</h4>
                            <p className="text-coral font-semibold text-sm mb-1">{event.time}</p>
                            <p className="text-sage font-medium text-sm mb-1">{event.day}</p>
                            <p className="text-text-light text-sm leading-snug">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <div className="text-center mt-12">
              <Link
                href="/calendar"
                className="inline-flex items-center px-6 py-3 bg-white border-2 border-black text-black font-semibold rounded-lg hover:bg-gray-50 transition-all focus-ring"
              >
                <span>View Full Calendar</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
