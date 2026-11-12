import 'server-only';
import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import type { AuthorizedProfile } from '@/lib/auth/requestAuthorization';
import type { PrayerPraiseItem, PrayerRequestUpdate } from '@/types/prayer';

export class PrayerRequestError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 = 400) {
    super(message);
  }
}

export function isAdministrator(profile: AuthorizedProfile): boolean {
  return profile.isAdmin || profile.role === 'admin';
}

export function toMillis(value: unknown, fallback = Date.now()): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

export function requiredText(value: unknown, label: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new PrayerRequestError(`${label} is required.`);
  if (text.length > maxLength) throw new PrayerRequestError(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

export function prayerPostFromDocument(
  document: DocumentSnapshot,
  profile: AuthorizedProfile,
): PrayerPraiseItem {
  const data = document.data() ?? {};
  const followerIds = Array.isArray(data.followerIds)
    ? data.followerIds.filter((value): value is string => typeof value === 'string')
    : [];
  const authorId = String(data.author?.id ?? '');
  const admin = isAdministrator(profile);
  const createdAt = toMillis(data.dateCreated);
  return {
    id: document.id,
    type: data.type === 'praise' ? 'praise' : 'prayer',
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    author: {
      id: authorId,
      name: String(data.author?.name ?? 'Member'),
    },
    dateCreated: createdAt,
    lastActivityAt: toMillis(data.lastActivityAt, createdAt),
    prayerCount: Number(data.prayerCount ?? 0),
    updateCount: Number(data.updateCount ?? 0),
    isAnonymous: data.isAnonymous === true,
    isAdminOnly: data.isAdminOnly === true,
    status: data.status === 'archived' ? 'archived' : 'active',
    approvalStatus: data.approvalStatus === 'pending' || data.approvalStatus === 'rejected'
      ? data.approvalStatus
      : 'approved',
    priority: data.priority === 'Urgent' || data.priority === 'Batched' ? data.priority : undefined,
    isFollowing: followerIds.includes(profile.uid),
    followerCount: followerIds.length,
    canManage: admin || authorId === profile.uid,
    canFollow: data.type === 'prayer' && authorId !== profile.uid && data.status !== 'archived',
    archivedAt: data.archivedAt ? toMillis(data.archivedAt) : undefined,
    archivedReason: data.archivedReason === 'automatic' ? 'automatic' : data.archivedReason === 'manual' ? 'manual' : undefined,
  };
}

export function prayerUpdateFromDocument(document: DocumentSnapshot): PrayerRequestUpdate {
  const data = document.data() ?? {};
  const createdAt = toMillis(data.createdAt);
  const updatedAt = toMillis(data.updatedAt, createdAt);
  return {
    id: document.id,
    text: String(data.text ?? ''),
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? 'Member'),
    authorIsAdmin: data.authorIsAdmin === true,
    createdAt,
    updatedAt,
    edited: updatedAt > createdAt + 1000,
  };
}

export function canViewPrayerPost(data: FirebaseFirestore.DocumentData, profile: AuthorizedProfile): boolean {
  const admin = isAdministrator(profile);
  const isAuthor = data.author?.id === profile.uid;
  if (data.isAdminOnly === true && !admin) return false;
  if (data.approvalStatus !== 'approved' && !admin && !isAuthor) return false;
  if (data.status === 'archived' && !admin && !isAuthor) return false;
  return true;
}

export async function loadPrayerPost(
  db: Firestore,
  id: string,
  profile: AuthorizedProfile,
): Promise<DocumentSnapshot> {
  const document = await db.collection('prayerPraise').doc(id).get();
  if (!document.exists) throw new PrayerRequestError('Prayer request not found.', 404);
  if (!canViewPrayerPost(document.data() ?? {}, profile)) {
    throw new PrayerRequestError('You do not have access to this prayer request.', 403);
  }
  return document;
}

export function errorStatus(error: unknown): number {
  if (error instanceof PrayerRequestError) return error.status;
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') return error.status;
  return 500;
}
