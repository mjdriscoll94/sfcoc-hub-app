import { NextResponse } from 'next/server';
import { requireApprovedMember } from '@/lib/auth/requestAuthorization';
import {
  loadLatestPodcastEpisode,
  loadLatestSermon,
  SPOTIFY_PODCAST_URL,
} from '@/lib/dashboard/latestMedia';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireApprovedMember(request);
    const [sermon, podcast] = await Promise.allSettled([
      loadLatestSermon(),
      loadLatestPodcastEpisode(),
    ]);

    if (sermon.status === 'rejected') console.error('Latest YouTube sermon error:', sermon.reason);
    if (podcast.status === 'rejected') console.error('Latest Spotify episode error:', podcast.reason);

    return NextResponse.json(
      {
        sermon: sermon.status === 'fulfilled' ? sermon.value : null,
        podcast: podcast.status === 'fulfilled' ? podcast.value : null,
        podcastShowUrl: SPOTIFY_PODCAST_URL,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Dashboard media error:', error);
    return NextResponse.json(
      { error: 'We couldn’t load the latest sermon and podcast.' },
      { status: error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 500 },
    );
  }
}

