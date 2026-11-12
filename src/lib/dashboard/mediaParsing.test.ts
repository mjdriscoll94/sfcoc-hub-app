import { describe, expect, it } from 'vitest';
import {
  latestSpotifyEpisodeFromEmbed,
  latestYouTubeSermon,
  youtubeUploadsPlaylistId,
} from './mediaParsing';

describe('dashboard media parsing', () => {
  it('finds a channel uploads playlist', () => {
    expect(youtubeUploadsPlaylistId({
      items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU123' } } }],
    })).toBe('UU123');
  });

  it('skips Bible studies and maps the latest Sunday sermon', () => {
    expect(latestYouTubeSermon({
      items: [
        {
          snippet: { title: 'Acts 5 | Wednesday Bible Study', resourceId: { videoId: 'study123' } },
          contentDetails: { videoId: 'study123', videoPublishedAt: '2026-11-12T15:00:00Z' },
        },
        {
          snippet: { title: 'Submission to God | Sunday Worship Service', resourceId: { videoId: 'video123' } },
          contentDetails: { videoId: 'video123', videoPublishedAt: '2026-11-08T15:00:00Z' },
        },
      ],
    })).toEqual({
      id: 'video123',
      title: 'Submission to God',
      publishedAt: Date.parse('2026-11-08T15:00:00Z'),
      url: 'https://www.youtube.com/watch?v=video123',
    });
  });

  it('maps the latest Spotify episode only for the expected show', () => {
    const nextData = JSON.stringify({
      props: { pageProps: { state: { data: { entity: {
        type: 'episode',
        id: 'episode123',
        title: 'Faith in Real Life',
        relatedEntityUri: 'spotify:show:show123',
        releaseDate: { isoString: '2026-11-12T12:00:00Z' },
      } } } } },
    });
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;

    expect(latestSpotifyEpisodeFromEmbed(html, 'show123')).toEqual({
      id: 'episode123',
      title: 'Faith in Real Life',
      publishedAt: Date.parse('2026-11-12T12:00:00Z'),
      url: 'https://open.spotify.com/episode/episode123',
    });
    expect(latestSpotifyEpisodeFromEmbed(html, 'another-show')).toBeNull();
  });
});

