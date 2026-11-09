import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function toMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
    const db = getAdminDb();
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const userProfile = userSnapshot.data();
    const canManageAttendance =
      userProfile?.isAdmin === true || ['admin', 'organizer'].includes(userProfile?.role);

    if (!canManageAttendance) {
      return NextResponse.json(
        { error: 'You do not have permission to view households and members.' },
        { status: 403 }
      );
    }

    const snapshot = await db.collection('attendanceHouseholds').orderBy('householdName', 'asc').get();
    const households = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        householdName: data.householdName,
        normalizedName: data.normalizedName,
        active: data.active,
        isLifeGroupLeader: data.isLifeGroupLeader,
        availableFrom: toMillis(data.availableFrom) ?? toMillis(data.createdAt),
        members: Array.isArray(data.members) ? data.members : [],
        importantEvents: Array.isArray(data.importantEvents) ? data.importantEvents : [],
      };
    });

    return NextResponse.json(
      { households },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error loading admin households:', error);
    return NextResponse.json(
      { error: 'We couldn’t load households and members. Please try again.' },
      { status: 500 }
    );
  }
}
