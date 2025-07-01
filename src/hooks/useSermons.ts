'use client';

import { useState, useEffect } from 'react';
import { fetchSermons, YouTubeVideo } from '@/lib/youtube/api';

export function useSermons() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

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

  return {
    videos,
    loading,
    error,
    selectedVideo,
    selectVideo
  };
} 