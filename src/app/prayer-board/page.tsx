'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrayerPraise, type PrayerPraiseItem } from '@/hooks/usePrayerPraise';
import PrayerRequestForm from '@/components/PrayerRequestForm';
import { addPrayerPraise } from '@/lib/firebase/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTourActive } from '@/components/tour';
import { LoadingCardList } from '@/components/LoadingSkeleton';

type FilterType = 'all' | 'prayer' | 'praise';

/** Fake prayer request shown only during the onboarding tour so steps can reference it. */
export const TOUR_DEMO_REQUEST_ID = 'tour-demo-request';
const TOUR_DEMO_REQUEST: PrayerPraiseItem = {
  id: TOUR_DEMO_REQUEST_ID,
  type: 'prayer',
  title: 'Example prayer request',
  description: 'This is an example. You can tap "I prayed" to support a request, or use the filters above to switch between All, Prayers, and Praises.',
  author: { id: 'tour-demo', name: 'Tour' },
  dateCreated: new Date(),
  prayerCount: 0,
  isAnonymous: false,
  isAdminOnly: false,
  status: 'active',
  approvalStatus: 'approved',
};

export default function PrayerBoard() {
  useEffect(() => {
    document.title = 'Prayer Board | Sioux Falls Church of Christ';
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { userProfile } = useAuth();
  const { tourActive } = useTourActive();

  // Use the Firestore hook with the active filter
  const { items: requests, loading, error, isIndexBuilding, incrementPrayerCount } = usePrayerPraise(
    activeFilter === 'all' ? undefined : activeFilter
  );

  // When tour is active, prepend a fake request so the tour can reference it; it never touches Firestore
  const displayRequests = useMemo(() => {
    if (!tourActive || (activeFilter !== 'all' && activeFilter !== 'prayer')) return requests;
    const rest = requests.filter((r) => r.id !== TOUR_DEMO_REQUEST_ID);
    return [TOUR_DEMO_REQUEST, ...rest];
  }, [tourActive, activeFilter, requests]);

  // Log any errors from the hook
  useEffect(() => {
    if (error) {
      console.error('Prayer/Praise hook error:', error);
    }
  }, [error]);

  const handleSubmit = async (data: {
    type: 'prayer' | 'praise';
    title: string;
    description: string;
    isAnonymous: boolean;
    isAdminOnly: boolean;
  }) => {
    try {
      await addPrayerPraise({
        type: data.type,
        title: data.title,
        description: data.description,
        author: {
          id: userProfile?.uid || 'anonymous',
          name: userProfile?.displayName || 'Anonymous',
        },
        isAnonymous: data.isAnonymous,
        isAdminOnly: data.isAdminOnly,
        status: 'active'
      }, userProfile?.isAdmin || false);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding prayer/praise:', error);
      throw error;
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text">Prayer &amp; Praise</h1>
        <p className="mx-auto mt-2 max-w-2xl text-text-light">Share a request, celebrate an answer, and support your church family.</p>
      </div>

      {/* Filter Toggle Group and Add Button */}
      <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row" id="prayer-board-toolbar">
        <div className="inline-flex rounded-lg bg-sage/10 p-1" id="prayer-board-filters">
          <button
            onClick={() => setActiveFilter('all')}
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === 'all'
                ? 'text-white shadow-sm'
                : 'text-text'
            }`}
            style={{
              backgroundColor: activeFilter === 'all' ? '#E88B5F' : 'transparent'
            }}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('prayer')}
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === 'prayer'
                ? 'text-white shadow-sm'
                : 'text-text'
            }`}
            style={{
              backgroundColor: activeFilter === 'prayer' ? '#E88B5F' : 'transparent'
            }}
          >
            Prayers
          </button>
          <button
            onClick={() => setActiveFilter('praise')}
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === 'praise'
                ? 'text-white shadow-sm'
                : 'text-text'
            }`}
            style={{
              backgroundColor: activeFilter === 'praise' ? '#70A8A0' : 'transparent'
            }}
          >
            Praises
          </button>
        </div>
        
        <div className="inline-flex" id="prayer-board-add-wrap">
          <button
            id="prayer-board-add"
            onClick={() => setIsFormOpen(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: '#E88B5F'
            }}
            aria-label="Add prayer request"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 6v12m6-6H6"
              />
            </svg>
            <span>Add request</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <LoadingCardList label="Loading prayer and praise posts…" count={3} />
      )}

      {/* Index Building State */}
      {isIndexBuilding && (
        <div className="text-center p-8 bg-info/10 border border-info/20 rounded-lg">
          <div className="animate-pulse mb-4">
            <div className="h-8 w-8 mx-auto rounded-full bg-info/20"></div>
          </div>
          <h3 className="mb-2 text-lg font-medium text-info">
            Optimizing Database
          </h3>
          <p className="text-info/80">
            We&apos;re optimizing the database for faster queries. This may take a few minutes.
            Please refresh the page shortly.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isIndexBuilding && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-bg p-6 text-center text-error">
          <p>{error}</p>
        </div>
      )}

      {/* Prayer Requests List */}
      {!loading && !error && !isIndexBuilding && (
        <div className="space-y-6">
          {displayRequests.map((request) => (
            <div
              key={request.id}
              id={request.id === TOUR_DEMO_REQUEST_ID ? 'tour-demo-request' : undefined}
              className="rounded-xl border border-border bg-card shadow-sm"
            >
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleCard(request.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                        request.type === 'prayer' 
                          ? 'text-white' 
                          : 'text-white'
                      }`} style={{
                        backgroundColor: request.type === 'prayer' ? '#E88B5F' : '#70A8A0'
                      }}>
                        {request.type === 'prayer' ? 'Prayer Request' : 'Praise'}
                      </span>
                      <span className="text-sm text-text/80 tabular-nums">
                        {request.dateCreated instanceof Date 
                          ? request.dateCreated.toLocaleDateString()
                          : new Date(request.dateCreated).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-text">
                        {request.title}
                      </h3>
                      <span id={request.id === TOUR_DEMO_REQUEST_ID ? 'tour-demo-caret' : undefined}>
                        <svg
                          className={`w-5 h-5 text-text/60 transition-transform ${
                            expandedCards.has(request.id) ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm mt-4">
                  <span className="text-text font-medium">{request.isAnonymous ? 'Anonymous' : request.author.name}</span>
                  {request.id === TOUR_DEMO_REQUEST_ID ? (
                    <span
                      id="tour-demo-i-prayed"
                      className="flex items-center space-x-2"
                      style={{ color: request.type === 'prayer' ? '#E88B5F' : '#70A8A0' }}
                    >
                      <span className="text-sm font-medium uppercase tracking-wide" style={{ color: request.type === 'prayer' ? '#E88B5F' : '#70A8A0' }}>
                        {request.type === 'prayer' ? 'I prayed' : 'I gave thanks'}
                      </span>
                      <span className="text-white px-2 py-0.5 rounded-full text-sm" style={{ backgroundColor: request.type === 'prayer' ? '#E88B5F' : '#70A8A0' }}>
                        {request.prayerCount}
                      </span>
                    </span>
                  ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      incrementPrayerCount(request.id);
                    }}
                    className="group flex min-h-11 items-center space-x-2 rounded-lg px-2 hover:bg-bg hover:opacity-80"
                    style={{
                      color: request.type === 'prayer' ? '#E88B5F' : '#70A8A0'
                    }}
                  >
                    <span className={`text-sm font-medium uppercase tracking-wide transition-colors`}
                          style={{
                            color: request.type === 'prayer' ? '#E88B5F' : '#70A8A0'
                          }}>
                      {request.type === 'prayer' ? 'I prayed' : 'I gave thanks'}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-sm text-white tabular-nums transition-colors"
                          style={{
                            backgroundColor: request.type === 'prayer' ? '#E88B5F' : '#70A8A0'
                          }}>
                      {request.prayerCount}
                    </span>
                  </button>
                  )}
                </div>
              </div>
              
              {expandedCards.has(request.id) && (
                <div className="px-6 pb-6 pt-2 border-t border-sage/20">
                  <p className="text-text/80 whitespace-pre-wrap">
                    {request.description}
                  </p>
                </div>
              )}
            </div>
          ))}

          {displayRequests.length === 0 && (
            <div className="text-center p-8 text-text/50">
              No prayer requests or praises yet.
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFormOpen(false);
            }
          }}
        >
          {/* Modal Content - card style to match site */}
          <div
            className="relative w-full max-w-lg rounded-2xl border bg-white shadow-lg"
            style={{
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: '#FFFFFF',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - coral gradient like nav/sections */}
            <div
              className="flex items-center justify-between rounded-t-2xl px-6 py-4"
              style={{
                background: 'linear-gradient(135deg, var(--coral-light) 0%, var(--coral) 100%)',
              }}
            >
              <h3 className="text-lg font-semibold text-on-primary">
                New Prayer Request or Praise
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-on-primary/90 hover:bg-white/20 hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal"
                aria-label="Close"
              >
                <span className="text-2xl leading-none">✕</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="rounded-b-2xl border-t border-border bg-white p-6" style={{ backgroundColor: '#FFFFFF' }}>
              <PrayerRequestForm onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
