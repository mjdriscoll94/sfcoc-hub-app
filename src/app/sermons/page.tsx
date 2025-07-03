'use client';

import { useState, useEffect } from 'react';
import { useSermons } from '@/hooks/useSermons';

interface GroupedSermons {
  [key: string]: {
    monthLabel: string;
    videos: any[];
  };
}

export default function SermonsPage() {
  const { videos, loading, error, selectedVideo, selectVideo, searchTerm, setSearchTerm } = useSermons();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const groupVideosByMonth = (videos: any[]): GroupedSermons => {
    return videos.reduce((groups: GroupedSermons, video) => {
      const date = new Date(video.publishedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthLabel,
          videos: []
        };
      }
      
      groups[monthKey].videos.push(video);
      return groups;
    }, {});
  };

  const toggleMonth = (monthKey: string) => {
    const newExpandedMonths = new Set(expandedMonths);
    if (newExpandedMonths.has(monthKey)) {
      newExpandedMonths.delete(monthKey);
    } else {
      newExpandedMonths.add(monthKey);
    }
    setExpandedMonths(newExpandedMonths);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  const groupedVideos = groupVideosByMonth(videos);
  const monthKeys = Object.keys(groupedVideos).sort().reverse();

  // Initialize expanded state for the current month if no search term
  useEffect(() => {
    if (!searchTerm && monthKeys.length > 0) {
      setExpandedMonths(new Set([monthKeys[0]]));
    }
  }, [monthKeys, searchTerm]);

  // Auto-expand all months when searching
  useEffect(() => {
    if (searchTerm) {
      setExpandedMonths(new Set(monthKeys));
    } else if (monthKeys.length > 0) {
      setExpandedMonths(new Set([monthKeys[0]]));
    }
  }, [searchTerm, monthKeys]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Sermons</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sermons..."
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
            <svg
              className="absolute right-3 top-2.5 h-5 w-5 text-white/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center p-8 bg-white/5 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-white">Error Loading Sermons</h3>
          <p className="mt-2 text-sm text-white/60">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-coral hover:bg-coral/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral"
            >
              Try Again
            </button>
          </div>
          {(!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || !process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID) && (
            <div className="mt-4 p-4 bg-white/10 rounded-md text-sm text-white/80">
              <p className="font-medium">Missing Configuration:</p>
              <ul className="mt-2 list-disc list-inside">
                {!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY && (
                  <li>YouTube API Key is not configured</li>
                )}
                {!process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID && (
                  <li>YouTube Channel ID is not configured</li>
                )}
              </ul>
              <p className="mt-2">
                Please check your environment variables in .env.local
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            {selectedVideo ? (
              <div className="space-y-4">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id}`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                  ></iframe>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {selectedVideo.title}
                  </h2>
                  <div className="flex items-center text-sm text-white/60 mb-4">
                    <span>{formatDate(selectedVideo.publishedAt)}</span>
                    <span className="mx-2">•</span>
                    <span>{formatViewCount(selectedVideo.viewCount)}</span>
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap">
                    {selectedVideo.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="aspect-w-16 aspect-h-9 bg-white/5 rounded-lg flex items-center justify-center">
                <p className="text-white/60">No video selected</p>
              </div>
            )}
          </div>

          {/* Video List */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 rounded-lg">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-medium text-white">
                  {searchTerm ? 'Search Results' : 'Sermons'}
                  {searchTerm && videos.length === 0 && (
                    <span className="block text-sm text-white/60 mt-1">
                      No results found
                    </span>
                  )}
                </h3>
              </div>
              <div className="divide-y divide-white/10 max-h-[600px] overflow-y-auto">
                {monthKeys.map((monthKey) => (
                  <div key={monthKey} className="border-b border-white/10 last:border-b-0">
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-white/5"
                    >
                      <span className="font-medium">{groupedVideos[monthKey].monthLabel}</span>
                      <svg
                        className={`w-5 h-5 transform transition-transform ${
                          expandedMonths.has(monthKey) ? 'rotate-180' : ''
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
                    {expandedMonths.has(monthKey) && (
                      <div className="divide-y divide-white/10">
                        {groupedVideos[monthKey].videos.map((video) => (
                          <button
                            key={video.id}
                            onClick={() => selectVideo(video)}
                            className={`w-full text-left p-4 hover:bg-white/10 transition-colors ${
                              selectedVideo?.id === video.id ? 'bg-white/10' : ''
                            }`}
                          >
                            <div className="flex space-x-4">
                              <div className="flex-shrink-0">
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-32 h-18 object-cover rounded"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-white truncate">
                                  {video.title}
                                </h4>
                                <p className="text-sm text-white/60 mt-1">
                                  {new Date(video.publishedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-sm text-white/60">
                                  {formatViewCount(video.viewCount)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 