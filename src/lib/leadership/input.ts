import type { LeadershipLessonInput, LeadershipLessonStatus } from '@/types/leadership';
import { extractYouTubeVideoId } from './youtube';

export class LeadershipLessonInputError extends Error {}

function requiredText(value: unknown, label: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new LeadershipLessonInputError(`${label} is required.`);
  if (text.length > maxLength) throw new LeadershipLessonInputError(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function optionalSecureUrl(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') throw new Error();
    return url.toString();
  } catch {
    throw new LeadershipLessonInputError('A valid HTTPS PDF URL is required.');
  }
}

export function parseLeadershipLessonInput(value: unknown): LeadershipLessonInput {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const status: LeadershipLessonStatus = input.status === 'published' ? 'published' : 'draft';
  const captionsReviewed = input.captionsReviewed === true;
  const youtubeVideoId = extractYouTubeVideoId(requiredText(input.youtubeVideoId, 'YouTube video', 500));
  if (!youtubeVideoId) throw new LeadershipLessonInputError('Enter a valid YouTube video link or video ID.');
  if (status === 'published' && !captionsReviewed) {
    throw new LeadershipLessonInputError('Review the automatic captions before publishing this lesson.');
  }

  const pdfUrl = optionalSecureUrl(input.pdfUrl);
  return {
    title: requiredText(input.title, 'Title', 120),
    description: requiredText(input.description, 'Description', 600),
    youtubeVideoId,
    pdfUrl,
    pdfFileName: pdfUrl ? requiredText(input.pdfFileName, 'PDF file name', 240) : '',
    status,
    captionsReviewed,
  };
}
