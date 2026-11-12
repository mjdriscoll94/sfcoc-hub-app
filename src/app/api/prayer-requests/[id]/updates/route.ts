import { after, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireApprovedMember } from '@/lib/auth/requestAuthorization';
import { sendPrayerUpdateNotifications } from '@/lib/prayer/email';
import {
  errorStatus,
  isAdministrator,
  loadPrayerPost,
  PrayerRequestError,
  prayerUpdateFromDocument,
  requiredText,
} from '@/lib/prayer/server';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
  if (status !== 500) return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed.' }, { status });
  console.error(`Prayer update ${operation} error:`, error);
  return NextResponse.json({ error: `We couldn’t ${operation} prayer request updates.` }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const profile = await requireApprovedMember(request);
    const { id } = await params;
    const document = await loadPrayerPost(getAdminDb(), id, profile);
    const snapshot = await document.ref.collection('updates').orderBy('createdAt', 'desc').get();
    return NextResponse.json(
      { updates: snapshot.docs.map(prayerUpdateFromDocument) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return errorResponse(error, 'load');
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const profile = await requireApprovedMember(request);
    const { id } = await params;
    const db = getAdminDb();
    const document = await loadPrayerPost(db, id, profile);
    const data = document.data() ?? {};
    const admin = isAdministrator(profile);
    const isAuthor = data.author?.id === profile.uid;
    if (data.type !== 'prayer') throw new PrayerRequestError('Updates are available only for prayer requests.');
    if (data.approvalStatus !== 'approved') throw new PrayerRequestError('Updates can be added after the prayer request is approved.');
    if (!admin && !isAuthor) throw new PrayerRequestError('Only the request author or an administrator can add an update.', 403);

    const body = await request.json() as Record<string, unknown>;
    const text = requiredText(body.text, 'Update', 3000);
    const archiveAfter = body.archiveAfter === true;
    const now = Timestamp.now();
    const updateReference = document.ref.collection('updates').doc();
    const batch = db.batch();
    batch.set(updateReference, {
      text,
      authorId: profile.uid,
      authorName: isAuthor && data.isAnonymous === true ? 'Request author' : profile.displayName || 'Member',
      authorIsAdmin: admin,
      createdAt: now,
      updatedAt: now,
      moderationStatus: 'published',
    });
    batch.update(document.ref, {
      updateCount: FieldValue.increment(1),
      lastActivityAt: now,
      archiveWarningSentAt: null,
      status: archiveAfter ? 'archived' : 'active',
      archivedAt: archiveAfter ? now : null,
      archivedReason: archiveAfter ? 'manual' : null,
    });
    await batch.commit();

    after(async () => {
      try {
        await sendPrayerUpdateNotifications({
          db,
          requestId: id,
          requestTitle: String(data.title ?? 'Prayer request'),
          updateText: text,
          followerIds: Array.isArray(data.followerIds) ? data.followerIds : [],
          updaterId: profile.uid,
          authorId: String(data.author?.id ?? ''),
          updaterIsAdmin: admin,
          archivedAfterUpdate: archiveAfter,
        });
      } catch (error) {
        console.error(`Prayer update notification failed for ${id}:`, error);
      }
    });

    const created = await updateReference.get();
    return NextResponse.json({ update: prayerUpdateFromDocument(created), archived: archiveAfter }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'create');
  }
}
