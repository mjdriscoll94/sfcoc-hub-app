import 'server-only';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import type { LeadershipLesson } from '@/types/leadership';
export { LeadershipLessonInputError, parseLeadershipLessonInput } from './input';

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
