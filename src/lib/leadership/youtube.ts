const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  let candidate: string | null = null;

  if (hostname === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      candidate = url.searchParams.get('v');
    } else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0])) candidate = parts[1] ?? null;
    }
  }

  return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

export function youtubeEmbedUrl(videoId: string): string {
  if (!YOUTUBE_ID_PATTERN.test(videoId)) throw new Error('Invalid YouTube video ID.');
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}
