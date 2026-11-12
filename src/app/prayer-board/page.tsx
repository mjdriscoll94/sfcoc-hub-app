'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Archive, Bell, BellOff } from 'lucide-react';
import { usePrayerPraise, type PrayerPraiseItem } from '@/hooks/usePrayerPraise';
import PrayerRequestForm from '@/components/PrayerRequestForm';
import PrayerRequestUpdates from '@/components/PrayerRequestUpdates';
import { useTourActive } from '@/components/tour';
import { LoadingCardList } from '@/components/LoadingSkeleton';

type FilterType = 'all' | 'prayer' | 'praise' | 'following';

/** Fake prayer request shown only during the onboarding tour so steps can reference it. */
const TOUR_DEMO_REQUEST_ID = 'tour-demo-request';
const TOUR_DEMO_REQUEST: PrayerPraiseItem = {
  id: TOUR_DEMO_REQUEST_ID,
  type: 'prayer',
  title: 'Example prayer request',
  description: 'This is an example. You can tap "I prayed" to support a request, or use the filters above to switch between All, Prayers, and Praises.',
  author: { id: 'tour-demo', name: 'Tour' },
  dateCreated: Date.now(),
  lastActivityAt: Date.now(),
  prayerCount: 0,
  updateCount: 0,
  isAnonymous: false,
  isAdminOnly: false,
  status: 'active',
  approvalStatus: 'approved',
  isFollowing: false,
  followerCount: 0,
  canManage: false,
  canFollow: false,
};

function ExpandableDescription({
  requestId,
  description,
  forceControl = false,
}: {
  requestId: string;
  description: string;
  forceControl?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const descriptionId = `prayer-description-${requestId}`;

  useEffect(() => {
    if (expanded) return;
    const element = descriptionRef.current;
    if (!element) return;

    const measureOverflow = () => {
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    };
    measureOverflow();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description, expanded]);

  return (
    <div className="mt-3">
      <p
        ref={descriptionRef}
        id={descriptionId}
        className={`whitespace-pre-wrap text-text/80 ${expanded ? '' : 'line-clamp-2'}`}
      >
        {description}
      </p>
      {hasOverflow || forceControl ? (
        <button
          id={forceControl ? 'tour-demo-see-more' : undefined}
          type="button"
          aria-controls={descriptionId}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 min-h-10 rounded-lg px-2 text-sm font-semibold text-coral-dark hover:bg-coral/10"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  );
}

export default function PrayerBoard() {
  useEffect(() => {
    document.title = 'Prayer Board | Sioux Falls Church of Christ';
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const { tourActive } = useTourActive();

  const {
    items: requests,
    loading,
    error,
    isIndexBuilding,
    retry,
    createPrayerRequest,
    incrementPrayerCount,
    setFollowing,
    updatePrayerRequest,
  } = usePrayerPraise(
    activeFilter === 'prayer' || activeFilter === 'praise' ? activeFilter : undefined,
    false,
    activeFilter === 'following' ? 'following' : 'active',
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

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const requestId = new URLSearchParams(window.location.search).get('request');
    if (!requestId) return;
    const card = document.getElementById(`prayer-request-${requestId}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [displayRequests, loading]);

  const handleSubmit = async (data: {
    type: 'prayer' | 'praise';
    title: string;
    description: string;
    isAnonymous: boolean;
    isAdminOnly: boolean;
  }) => {
    try {
      await createPrayerRequest(data);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding prayer/praise:', error);
      throw error;
    }
  };

  const handleFollow = async (request: PrayerPraiseItem) => {
    setActionError(null);
    try {
      await setFollowing(request.id, !request.isFollowing);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'The follow could not be updated.');
    }
  };

  const handleArchive = async (request: PrayerPraiseItem) => {
    if (!window.confirm('Archive this prayer request? Followers will be notified.')) return;
    setActionError(null);
    try {
      await updatePrayerRequest(request.id, { action: 'archive' });
      retry();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'The prayer request could not be archived.');
    }
  };

  const handlePrayed = async (request: PrayerPraiseItem) => {
    setActionError(null);
    try {
      await incrementPrayerCount(request.id);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Your prayer response could not be saved.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text">Prayer &amp; Praise</h1>
        <p className="mx-auto mt-2 max-w-2xl text-text-light">Share a request, celebrate an answer, and support your church family.</p>
      </div>

      {/* Filter Toggle Group and Add Button */}
      <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row" id="prayer-board-toolbar">
        <div className="grid grid-cols-2 rounded-lg bg-sage/10 p-1 sm:inline-flex" id="prayer-board-filters">
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
          <button
            onClick={() => setActiveFilter('following')}
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === 'following' ? 'text-white shadow-sm' : 'text-text'
            }`}
            style={{ backgroundColor: activeFilter === 'following' ? '#34434A' : 'transparent' }}
          >
            Following
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

      {actionError ? <div role="alert" className="mb-6 rounded-xl border border-error/30 bg-error-bg p-4 text-center text-error">{actionError}</div> : null}

      {/* Prayer Requests List */}
      {!loading && !error && !isIndexBuilding && (
        <div className="space-y-6">
          {displayRequests.map((request) => (
            <div
              key={request.id}
              id={request.id === TOUR_DEMO_REQUEST_ID ? 'tour-demo-request' : `prayer-request-${request.id}`}
              className="rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="p-6">
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
                      <span className="text-sm text-text/80 tabular-nums">{new Date(request.dateCreated).toLocaleDateString()}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-text">
                      {request.title}
                    </h3>
                    <ExpandableDescription
                      requestId={request.id}
                      description={request.description}
                      forceControl={request.id === TOUR_DEMO_REQUEST_ID}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col gap-2 border-t border-sage/20 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-text font-medium">{request.isAnonymous ? 'Anonymous' : request.author.name}</span>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                  {request.canFollow ? (
                    <button
                      type="button"
                      onClick={() => handleFollow(request)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold ${request.isFollowing ? 'bg-coral/10 text-coral-dark' : 'text-charcoal hover:bg-bg'}`}
                      aria-pressed={request.isFollowing}
                    >
                      {request.isFollowing ? <BellOff aria-hidden="true" className="h-4 w-4" /> : <Bell aria-hidden="true" className="h-4 w-4" />}
                      {request.isFollowing ? 'Unfollow' : 'Follow updates'}
                    </button>
                  ) : null}
                  {request.type === 'prayer' && request.canManage && request.id !== TOUR_DEMO_REQUEST_ID ? (
                    <button type="button" onClick={() => handleArchive(request)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-text-light hover:bg-bg hover:text-charcoal">
                      <Archive aria-hidden="true" className="h-4 w-4" /> Archive
                    </button>
                  ) : null}
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
                    type="button"
                    onClick={() => handlePrayed(request)}
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
                {request.type === 'prayer' && request.id !== TOUR_DEMO_REQUEST_ID ? <PrayerRequestUpdates request={request} onChanged={retry} /> : null}
              </div>
            </div>
          ))}

          {displayRequests.length === 0 && (
            <div className="text-center p-8 text-text/50">
              {activeFilter === 'following' ? 'You are not following any active prayer requests.' : 'No prayer requests or praises yet.'}
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
