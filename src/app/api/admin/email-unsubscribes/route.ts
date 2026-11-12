import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/roles';
import { readUnsubscribeToken } from '@/lib/email/unsubscribeToken';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
    const db = getAdminDb();
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const profile = userSnapshot.data();
    const role = profile?.role as UserRole | undefined;
    const canManageEmail =
      profile?.isAdmin === true ||
      (role &&
        (ROLE_PERMISSIONS[role]?.canManageAnnouncements ||
          ROLE_PERMISSIONS[role]?.canManageLifeGroups));

    if (!canManageEmail) {
      return NextResponse.json(
        { error: 'You do not have permission to view unsubscribed addresses.' },
        { status: 403 }
      );
    }

    const snapshot = await db
      .collection('emailUnsubscribes')
      .orderBy('unsubscribedAt', 'desc')
      .limit(500)
      .get();
    const unsubscribed = snapshot.docs.map((document) => {
      const data = document.data();
      const removedFromLists = Array.isArray(data.removedFromLists)
        ? data.removedFromLists
            .filter(
              (item: unknown): item is { id: string; name: string } =>
                !!item &&
                typeof item === 'object' &&
                typeof (item as { id?: unknown }).id === 'string' &&
                typeof (item as { name?: unknown }).name === 'string'
            )
            .map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))
        : [];
      return {
        id: document.id,
        email:
          typeof data.emailToken === 'string'
            ? readUnsubscribeToken(data.emailToken) || 'Address unavailable'
            : 'Address unavailable',
        unsubscribedAt:
          data.unsubscribedAt && typeof data.unsubscribedAt.toDate === 'function'
            ? data.unsubscribedAt.toDate().toISOString()
            : null,
        removedFromLists,
      };
    });

    return NextResponse.json(
      { unsubscribed },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('GET email-unsubscribes error:', error);
    return NextResponse.json(
      { error: 'We couldn’t load unsubscribed addresses. Please try again.' },
      { status: 500 }
    );
  }
}
