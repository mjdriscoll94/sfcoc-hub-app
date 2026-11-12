import 'server-only';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import type { LeadershipLesson, LeadershipLessonInput, LeadershipLessonStatus } from '@/types/leadership';
import { extractYouTubeVideoId } from './youtube';

export class LeadershipLessonInputError extends Error {}

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return Date.now();
}

export function leadershipLessonFromDocument(document: DocumentSnapshot): LeadershipLesson {
  const data = document.data() ?? {};
  return {
    id: document.id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    order: Number(data.order ?? 0),
    youtubeVideoId: String(data.youtubeVideoId ?? ''),
    pdfUrl: String(data.pdfUrl ?? ''),
    pdfFileName: String(data.pdfFileName ?? 'Leadership resource.pdf'),
    status: data.status === 'published' ? 'published' : 'draft',
    captionsReviewed: data.captionsReviewed === true,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    createdBy: String(data.createdBy ?? ''),
  };
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new LeadershipLessonInputError(`${label} is required.`);
  if (text.length > maxLength) throw new LeadershipLessonInputError(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function secureUrl(value: unknown): string {
  const text = requiredText(value, 'PDF', 2000);
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

  return {
    title: requiredText(input.title, 'Title', 120),
    description: requiredText(input.description, 'Description', 600),
    youtubeVideoId,
    pdfUrl: secureUrl(input.pdfUrl),
    pdfFileName: requiredText(input.pdfFileName, 'PDF file name', 240),
    status,
    captionsReviewed,
  };
}
