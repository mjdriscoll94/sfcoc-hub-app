'use client';

import { useState, useEffect } from 'react';
import { usePrayerPraise } from '@/hooks/usePrayerPraise';
import PrayerRequestForm from '@/components/PrayerRequestForm';
import { addPrayerPraise } from '@/lib/firebase/utils';
import { useAuth } from '@/lib/auth/AuthContext';

type FilterType = 'all' | 'prayer' | 'praise';

export default function PrayerBoard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { userProfile } = useAuth();
  
  // Use the Firestore hook with the active filter
  const { items: requests, loading, error, isIndexBuilding, incrementPrayerCount } = usePrayerPraise(
    activeFilter === 'all' ? undefined : activeFilter
  );

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
        <h1 className="text-3xl font-bold text-text uppercase tracking-wide">Prayer & Praise</h1>
      </div>

      {/* Filter Toggle Group and Add Button */}
      <div className="flex justify-center items-center gap-4 mb-8">
        <div className="inline-flex rounded-lg p-1 bg-sage/10">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors uppercase tracking-wide ${
              activeFilter === 'all'
                ? 'bg-coral text-white shadow-sm'
                : 'text-text hover:text-coral'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('prayer')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors uppercase tracking-wide ${
              activeFilter === 'prayer'
                ? 'bg-coral text-white shadow-sm'
                : 'text-text hover:text-coral'
            }`}
          >
            Prayers
          </button>
          <button
            onClick={() => setActiveFilter('praise')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors uppercase tracking-wide ${
              activeFilter === 'praise'
                ? 'bg-sage text-white shadow-sm'
                : 'text-text hover:text-sage'
            }`}
          >
            Praises
          </button>
        </div>
        
        <div className="inline-flex rounded-lg p-1">
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 flex items-center justify-center rounded-md bg-coral text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral transition-colors uppercase tracking-wide"
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
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Index Building State */}
      {isIndexBuilding && (
        <div className="text-center p-8 bg-info/10 border border-info/20 rounded-lg">
          <div className="animate-pulse mb-4">
            <div className="h-8 w-8 mx-auto rounded-full bg-info/20"></div>
          </div>
          <h3 className="text-lg font-medium text-info mb-2 uppercase tracking-wide">
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
        <div className="text-center p-4 text-error">
          <p>{error}</p>
        </div>
      )}

      {/* Prayer Requests List */}
      {!loading && !error && !isIndexBuilding && (
        <div className="space-y-6">
          {requests.map((request) => (
            <div key={request.id} className="bg-card rounded-lg shadow border border-sage/20">
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleCard(request.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                        request.type === 'prayer' 
                          ? 'bg-coral text-white' 
                          : 'bg-sage text-white'
                      }`}>
                        {request.type === 'prayer' ? 'Prayer Request' : 'Praise'}
                      </span>
                      <span className="text-sm text-text/60">
                        {request.dateCreated instanceof Date 
                          ? request.dateCreated.toLocaleDateString()
                          : new Date(request.dateCreated).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-text">
                        {request.title}
                      </h3>
                      <svg
                        className={`w-5 h-5 text-text/40 transition-transform ${
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
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-white/60 mt-4">
                  <span className="text-text/70">{request.isAnonymous ? 'Anonymous' : request.author.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      incrementPrayerCount(request.id);
                    }}
                    className={`flex items-center space-x-2 ${
                      request.type === 'prayer' 
                        ? 'text-coral hover:opacity-80' 
                        : 'text-sage hover:opacity-80'
                    } group`}
                  >
                    <span className={`text-sm font-medium uppercase tracking-wide ${
                      request.type === 'prayer'
                        ? 'text-coral'
                        : 'text-sage'
                    } transition-colors`}>
                      {request.type === 'prayer' ? 'I prayed' : 'I gave thanks'}
                    </span>
                    <span className={`${
                      request.type === 'prayer'
                        ? 'bg-coral text-white'
                        : 'bg-sage text-white'
                    } px-2 py-0.5 rounded-full text-sm transition-colors`}>
                      {request.prayerCount}
                    </span>
                  </button>
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

          {requests.length === 0 && (
            <div className="text-center p-8 text-text/50">
              No prayer requests or praises yet.
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFormOpen(false);
            }
          }}
        >
          {/* Modal Content */}
          <div 
            className="bg-card backdrop-blur-md rounded-lg shadow-xl w-full max-w-lg relative border border-sage/20"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-sage/20">
              <h3 className="text-lg font-medium text-text uppercase tracking-wide">
                New Prayer Request or Praise
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-text/40 hover:text-text/60 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <PrayerRequestForm onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 