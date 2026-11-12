import type { DashboardMediaItem } from '@/types/dashboardMedia';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? value as UnknownRecord : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sermonDisplayTitle(title: string): string {
  const parts = title.split('|').map((part) => part.trim()).filter(Boolean);
  const contentParts = parts.filter((part) => {
    if (/^Sunday (?:(?:Morning|Worship) Service|Worship|Sermon)$/i.test(part)) return false;
    if (/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(part)) return false;
    return true;
  });
  return contentParts.length > 0 ? contentParts.join(' | ') : title;
}

export function youtubeUploadsPlaylistId(payload: unknown): string | null {
  const root = record(payload);
  const items = Array.isArray(root?.items) ? root.items : [];
  const first = record(items[0]);
  const contentDetails = record(first?.contentDetails);
  const relatedPlaylists = record(contentDetails?.relatedPlaylists);
  return nonEmptyString(relatedPlaylists?.uploads);
}

export function latestYouTubeVideo(payload: unknown): DashboardMediaItem | null {
  const root = record(payload);
  const items = Array.isArray(root?.items) ? root.items : [];
  const first = record(items[0]);
  const snippet = record(first?.snippet);
  const contentDetails = record(first?.contentDetails);
  const resourceId = record(snippet?.resourceId);
  const id = nonEmptyString(contentDetails?.videoId) ?? nonEmptyString(resourceId?.videoId);
  const title = nonEmptyString(snippet?.title);
  const publishedAtText = nonEmptyString(contentDetails?.videoPublishedAt) ?? nonEmptyString(snippet?.publishedAt);
  const publishedAt = publishedAtText ? Date.parse(publishedAtText) : Number.NaN;

  if (!id || !title || !Number.isFinite(publishedAt)) return null;
  return {
    id,
    title: sermonDisplayTitle(title),
    publishedAt,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
  };
}

export function latestYouTubeSermon(payload: unknown): DashboardMediaItem | null {
  const root = record(payload);
  const items = Array.isArray(root?.items) ? root.items : [];
  const sermon = items.find((item) => {
    const snippet = record(record(item)?.snippet);
    const title = nonEmptyString(snippet?.title) ?? '';
    return /\bSunday (?:(?:Morning|Worship) Service|Worship|Sermon)\b/i.test(title);
  });
  return sermon ? latestYouTubeVideo({ items: [sermon] }) : null;
}

export function latestSpotifyEpisodeFromEmbed(html: string, showId: string): DashboardMediaItem | null {
  const match = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return null;

  try {
    const root = record(JSON.parse(match[1]));
    const props = record(root?.props);
    const pageProps = record(props?.pageProps);
    const state = record(pageProps?.state);
    const data = record(state?.data);
    const entity = record(data?.entity);
    const releaseDate = record(entity?.releaseDate);
    const id = nonEmptyString(entity?.id);
    const title = nonEmptyString(entity?.title) ?? nonEmptyString(entity?.name);
    const relatedEntityUri = nonEmptyString(entity?.relatedEntityUri);
    const publishedAtText = nonEmptyString(releaseDate?.isoString);
    const publishedAt = publishedAtText ? Date.parse(publishedAtText) : Number.NaN;

    if (
      entity?.type !== 'episode'
      || relatedEntityUri !== `spotify:show:${showId}`
      || !id
      || !/^[A-Za-z0-9]+$/.test(id)
      || !title
      || !Number.isFinite(publishedAt)
    ) return null;

    return {
      id,
      title,
      publishedAt,
      url: `https://open.spotify.com/episode/${id}`,
    };
  } catch {
    return null;
  }
}

