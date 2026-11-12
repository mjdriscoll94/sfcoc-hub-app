import 'server-only';
import type { DashboardMediaItem } from '@/types/dashboardMedia';
import {
  latestSpotifyEpisodeFromEmbed,
  latestYouTubeSermon,
  youtubeUploadsPlaylistId,
} from '@/lib/dashboard/mediaParsing';

const MEDIA_REVALIDATE_SECONDS = 15 * 60;
const REQUEST_TIMEOUT_MS = 4_000;
export const SPOTIFY_PODCAST_SHOW_ID = '6BUbTQmZOpUZ9KvpOLPtwy';
export const SPOTIFY_PODCAST_URL = `https://open.spotify.com/show/${SPOTIFY_PODCAST_SHOW_ID}`;

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate: MEDIA_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Media service returned ${response.status}.`);
  return response.json();
}

export async function loadLatestSermon(): Promise<DashboardMediaItem | null> {
  const apiKey = process.env.YOUTUBE_API_KEY ?? process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID ?? process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return null;

  const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
  channelUrl.search = new URLSearchParams({
    part: 'contentDetails',
    id: channelId,
    key: apiKey,
  }).toString();
  const uploadsPlaylistId = youtubeUploadsPlaylistId(await fetchJson(channelUrl));
  if (!uploadsPlaylistId) return null;

  const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  playlistUrl.search = new URLSearchParams({
    part: 'snippet,contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: '25',
    key: apiKey,
  }).toString();
  return latestYouTubeSermon(await fetchJson(playlistUrl));
}

export async function loadLatestPodcastEpisode(): Promise<DashboardMediaItem | null> {
  const response = await fetch(`https://open.spotify.com/embed/show/${SPOTIFY_PODCAST_SHOW_ID}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SFCOC-Church-Hub/1.0)' },
    next: { revalidate: MEDIA_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Spotify returned ${response.status}.`);
  return latestSpotifyEpisodeFromEmbed(await response.text(), SPOTIFY_PODCAST_SHOW_ID);
}

