import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireLeadershipMember } from '@/lib/auth/requestAuthorization';
import { leadershipLessonFromDocument } from '@/lib/leadership/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireLeadershipMember(request);
    const snapshot = await getAdminDb()
      .collection('leadershipLessons')
      .where('status', '==', 'published')
      .get();
    const lessons = snapshot.docs
      .map(leadershipLessonFromDocument)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

    return NextResponse.json(
      { lessons },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof RequestAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Leadership lessons member API error:', error);
    return NextResponse.json({ error: 'We couldn’t load the leadership course.' }, { status: 500 });
  }
}
