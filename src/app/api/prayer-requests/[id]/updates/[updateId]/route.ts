import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireApprovedMember } from '@/lib/auth/requestAuthorization';
import {
  errorStatus,
  isAdministrator,
  loadPrayerPost,
  PrayerRequestError,
  prayerUpdateFromDocument,
  requiredText,
  toMillis,
} from '@/lib/prayer/server';

type RouteContext = { params: Promise<{ id: string; updateId: string }> };

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
  if (status !== 500) return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed.' }, { status });
  console.error(`Prayer update ${operation} error:`, error);
  return NextResponse.json({ error: `We couldn’t ${operation} this update.` }, { status: 500 });
}

async function authorizedUpdate(request: Request, context: RouteContext) {
  const profile = await requireApprovedMember(request);
  const { id, updateId } = await context.params;
  const db = getAdminDb();
  const prayer = await loadPrayerPost(db, id, profile);
  const update = await prayer.ref.collection('updates').doc(updateId).get();
  if (!update.exists) throw new PrayerRequestError('Update not found.', 404);
  const data = update.data() ?? {};
  if (!isAdministrator(profile) && data.authorId !== profile.uid) {
    throw new PrayerRequestError('You can manage only your own updates.', 403);
  }
  return { profile, prayer, update, db };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { update } = await authorizedUpdate(request, context);
    const body = await request.json() as Record<string, unknown>;
    await update.ref.update({
      text: requiredText(body.text, 'Update', 3000),
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ update: prayerUpdateFromDocument(await update.ref.get()) });
  } catch (error) {
    return errorResponse(error, 'edit');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { prayer, update, db } = await authorizedUpdate(request, context);
    const remaining = await prayer.ref.collection('updates').orderBy('createdAt', 'desc').get();
    const nextLatest = remaining.docs.find((document) => document.id !== update.id);
    const prayerData = prayer.data() ?? {};
    const batch = db.batch();
    batch.delete(update.ref);
    batch.update(prayer.ref, {
      updateCount: FieldValue.increment(-1),
      lastActivityAt: nextLatest
        ? Timestamp.fromMillis(toMillis(nextLatest.data().createdAt))
        : prayerData.dateCreated,
      archiveWarningSentAt: null,
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'delete');
  }
}
