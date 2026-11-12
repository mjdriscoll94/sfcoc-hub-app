import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireAdministrator } from '@/lib/auth/requestAuthorization';
import { LeadershipLessonInputError, leadershipLessonFromDocument, parseLeadershipLessonInput } from '@/lib/leadership/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, operation: string) {
  if (error instanceof RequestAuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof LeadershipLessonInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(`Leadership lesson ${operation} error:`, error);
  return NextResponse.json({ error: `We couldn’t ${operation} the lesson.` }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireAdministrator(request);
    const { id } = await params;
    const db = getAdminDb();
    const reference = db.collection('leadershipLessons').doc(id);
    const existing = await reference.get();
    if (!existing.exists) return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });

    const body = await request.json() as Record<string, unknown>;
    const current = existing.data() ?? {};
    const input = parseLeadershipLessonInput({ ...current, ...body });
    const order = body.order === undefined
      ? Number(current.order ?? 0)
      : Math.max(1, Math.round(Number(body.order)));
    if (!Number.isFinite(order)) throw new LeadershipLessonInputError('Lesson order must be a number.');

    await reference.update({ ...input, order, updatedAt: Timestamp.now() });
    const updated = await reference.get();
    return NextResponse.json({ lesson: leadershipLessonFromDocument(updated) });
  } catch (error) {
    return errorResponse(error, 'update');
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireAdministrator(request);
    const { id } = await params;
    const reference = getAdminDb().collection('leadershipLessons').doc(id);
    const existing = await reference.get();
    if (!existing.exists) return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    await reference.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'delete');
  }
}
