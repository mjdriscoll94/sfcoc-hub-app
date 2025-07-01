const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
const MAX_RESULTS = 50; // Maximum number of videos to fetch at once

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: string;
}

async function fetchWithErrorHandling(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('YouTube API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchSermons(): Promise<YouTubeVideo[]> {
  try {
    if (!YOUTUBE_API_KEY || !CHANNEL_ID) {
      throw new Error('YouTube API key or Channel ID is not configured');
    }

    // First try to get videos directly from search endpoint
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=${MAX_RESULTS}&order=date&type=video&key=${YOUTUBE_API_KEY}`;
    
    const searchData = await fetchWithErrorHandling(searchUrl);
    
    if (!searchData.items?.length) {
      throw new Error('No videos found in channel');
    }

    // Get video IDs to fetch additional details
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    // Fetch video statistics
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const videosData = await fetchWithErrorHandling(videosUrl);

    if (!videosData.items) {
      throw new Error('Could not fetch video details');
    }

    // Map the response to our interface
    return videosData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount || '0'
    }));

  } catch (error) {
    console.error('Error in fetchSermons:', error);
    throw error;
  }
} 