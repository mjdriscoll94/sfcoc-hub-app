'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchSermons, YouTubeVideo } from '@/lib/youtube/api';

export function useSermons() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadSermons() {
      try {
        setLoading(true);
        setError(null);
        const sermons = await fetchSermons();
        setVideos(sermons);
        if (sermons.length > 0 && !selectedVideo) {
          setSelectedVideo(sermons[0]);
        }
      } catch (error) {
        console.error('Error loading sermons:', error);
        setError('Failed to load sermons. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadSermons();
  }, [selectedVideo]);

  const selectVideo = (video: YouTubeVideo) => {
    setSelectedVideo(video);
  };

  // Memoized filtered videos
  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) {
      return videos;
    }

    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return videos.filter(video => {
      const searchableText = [
        video.title,
        video.description,
        new Date(video.publishedAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      ].join(' ').toLowerCase();

      // All search terms must match
      return searchTerms.every(term => searchableText.includes(term));
    });
  }, [videos, searchTerm]);

  return {
    videos: filteredVideos,
    loading,
    error,
    selectedVideo,
    selectVideo,
    searchTerm,
    setSearchTerm
  };
} 