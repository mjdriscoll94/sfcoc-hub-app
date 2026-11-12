import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireApprovedMember } from '@/lib/auth/requestAuthorization';
import { errorStatus, loadPrayerPost, PrayerRequestError } from '@/lib/prayer/server';

type RouteContext = { params: Promise<{ id: string }> };

async function setFollowing(request: Request, context: RouteContext, following: boolean) {
  try {
    const profile = await requireApprovedMember(request);
    const { id } = await context.params;
    const db = getAdminDb();
    const reference = db.collection('prayerPraise').doc(id);
    const document = following ? await loadPrayerPost(db, id, profile) : await reference.get();
    if (!document.exists) throw new PrayerRequestError('Prayer request not found.', 404);
    const data = document.data() ?? {};
    if (data.type !== 'prayer') throw new PrayerRequestError('Only prayer requests can be followed.');
    if (data.author?.id === profile.uid) throw new PrayerRequestError('You do not need to follow your own prayer request.');
    if (data.status === 'archived' && following) throw new PrayerRequestError('Archived requests cannot be followed.');
    await document.ref.update({
      followerIds: following ? FieldValue.arrayUnion(profile.uid) : FieldValue.arrayRemove(profile.uid),
    });
    return NextResponse.json({ following });
  } catch (error) {
    const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
    return NextResponse.json({ error: status === 500 ? 'We couldn’t update this follow.' : error instanceof Error ? error.message : 'Request failed.' }, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  return setFollowing(request, context, true);
}

export async function DELETE(request: Request, context: RouteContext) {
  return setFollowing(request, context, false);
}
