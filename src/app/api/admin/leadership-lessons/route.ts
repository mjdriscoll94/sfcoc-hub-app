import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireAdministrator } from '@/lib/auth/requestAuthorization';
import { LeadershipLessonInputError, leadershipLessonFromDocument, parseLeadershipLessonInput } from '@/lib/leadership/server';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  try {
    await requireAdministrator(request);
    const snapshot = await getAdminDb().collection('leadershipLessons').orderBy('order').get();
    return NextResponse.json({ lessons: snapshot.docs.map(leadershipLessonFromDocument) });
  } catch (error) {
    return errorResponse(error, 'load');
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireAdministrator(request);
    const input = parseLeadershipLessonInput(await request.json());
    const db = getAdminDb();
    const lastLesson = await db.collection('leadershipLessons').orderBy('order', 'desc').limit(1).get();
    const order = Number(lastLesson.docs[0]?.data().order ?? 0) + 1;
    const now = Timestamp.now();
    const reference = await db.collection('leadershipLessons').add({
      ...input,
      order,
      createdAt: now,
      updatedAt: now,
      createdBy: profile.uid,
    });
    const created = await reference.get();
    return NextResponse.json({ lesson: leadershipLessonFromDocument(created) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'create');
  }
}
