import { after, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireApprovedMember } from '@/lib/auth/requestAuthorization';
import { sendPrayerArchiveNotice } from '@/lib/prayer/email';
import {
  errorStatus,
  isAdministrator,
  loadPrayerPost,
  prayerPostFromDocument,
  PrayerRequestError,
  requiredText,
} from '@/lib/prayer/server';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
  if (status !== 500) return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed.' }, { status });
  console.error(`Prayer request ${operation} error:`, error);
  return NextResponse.json({ error: `We couldn’t ${operation} the prayer request.` }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const profile = await requireApprovedMember(request);
    const { id } = await params;
    const db = getAdminDb();
    const document = await loadPrayerPost(db, id, profile);
    const current = document.data() ?? {};
    const body = await request.json() as Record<string, unknown>;
    const admin = isAdministrator(profile);
    const isAuthor = current.author?.id === profile.uid;
    const action = body.action;

    if (action === 'archive' || action === 'restore') {
      if (!admin && !isAuthor) throw new PrayerRequestError('Only the request author or an administrator can do that.', 403);
      const restoring = action === 'restore';
      await document.ref.update(restoring ? {
        status: 'active',
        archivedAt: null,
        archivedReason: null,
        archiveWarningSentAt: null,
      } : {
        status: 'archived',
        archivedAt: Timestamp.now(),
        archivedReason: 'manual',
      });
      if (!restoring) {
        after(async () => {
          try {
            await sendPrayerArchiveNotice({
              db,
              requestTitle: String(current.title ?? 'Prayer request'),
              followerIds: Array.isArray(current.followerIds) ? current.followerIds : [],
            });
          } catch (error) {
            console.error(`Prayer archive notification failed for ${id}:`, error);
          }
        });
      }
    } else {
      if (!admin) throw new PrayerRequestError('Administrator access is required.', 403);
      const updates: Record<string, unknown> = {};
      if (body.title !== undefined) updates.title = requiredText(body.title, 'Title', 160);
      if (body.description !== undefined) updates.description = requiredText(body.description, 'Description', 4000);
      if (body.priority === 'Urgent' || body.priority === 'Batched' || body.priority === null) updates.priority = body.priority;
      if (body.approvalStatus === 'approved' || body.approvalStatus === 'pending' || body.approvalStatus === 'rejected') {
        updates.approvalStatus = body.approvalStatus;
      }
      if (typeof body.isSent === 'boolean') updates.isSent = body.isSent;
      if (body.status === 'active' || body.status === 'archived') {
        updates.status = body.status;
        updates.archivedAt = body.status === 'archived' ? Timestamp.now() : null;
        updates.archivedReason = body.status === 'archived' ? 'manual' : null;
      }
      await document.ref.update(updates);
      if (body.status === 'archived' && current.status !== 'archived') {
        after(async () => {
          try {
            await sendPrayerArchiveNotice({
              db,
              requestTitle: String(current.title ?? 'Prayer request'),
              followerIds: Array.isArray(current.followerIds) ? current.followerIds : [],
            });
          } catch (error) {
            console.error(`Prayer archive notification failed for ${id}:`, error);
          }
        });
      }
    }

    const updated = await document.ref.get();
    return NextResponse.json({ request: prayerPostFromDocument(updated, profile) });
  } catch (error) {
    return errorResponse(error, 'update');
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const profile = await requireApprovedMember(request);
    if (!isAdministrator(profile)) throw new PrayerRequestError('Administrator access is required.', 403);
    const { id } = await params;
    const db = getAdminDb();
    const document = await loadPrayerPost(db, id, profile);
    const updates = await document.ref.collection('updates').get();
    const batch = db.batch();
    updates.docs.forEach((update) => batch.delete(update.ref));
    batch.delete(document.ref);
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'delete');
  }
}
