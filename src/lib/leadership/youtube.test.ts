import { describe, expect, it } from 'vitest';
import { extractYouTubeVideoId, youtubeEmbedUrl } from './youtube';

describe('leadership YouTube links', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts a video ID from %s', (input, expected) => {
    expect(extractYouTubeVideoId(input)).toBe(expected);
  });

  it('rejects non-YouTube and malformed links', () => {
    expect(extractYouTubeVideoId('https://example.com/dQw4w9WgXcQ')).toBeNull();
    expect(extractYouTubeVideoId('not-a-valid-video')).toBeNull();
  });

  it('uses the privacy-enhanced embed host', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'
    );
  });
});
