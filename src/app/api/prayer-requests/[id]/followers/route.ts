import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireAdministrator } from '@/lib/auth/requestAuthorization';
import { errorStatus, loadPrayerPost } from '@/lib/prayer/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const profile = await requireAdministrator(request);
    const { id } = await params;
    const db = getAdminDb();
    const prayer = await loadPrayerPost(db, id, profile);
    const ids = Array.isArray(prayer.data()?.followerIds)
      ? prayer.data()!.followerIds.filter((value: unknown): value is string => typeof value === 'string')
      : [];
    const snapshots = ids.length > 0
      ? await db.getAll(...ids.map((uid: string) => db.collection('users').doc(uid)))
      : [];
    return NextResponse.json({
      followers: snapshots.map((snapshot) => ({
        uid: snapshot.id,
        name: String(snapshot.data()?.displayName ?? 'Member'),
        email: String(snapshot.data()?.email ?? ''),
      })),
    });
  } catch (error) {
    const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
    return NextResponse.json({ error: status === 500 ? 'We couldn’t load followers.' : error instanceof Error ? error.message : 'Request failed.' }, { status });
  }
}
