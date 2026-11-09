import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function toMillis(value: unknown, fallback = Date.now()): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return fallback;
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
    const approvalStatus = userSnapshot.data()?.approvalStatus;
    if (!userSnapshot.exists || approvalStatus === 'pending' || approvalStatus === 'rejected') {
      return NextResponse.json({ error: 'Member access is not approved.' }, { status: 403 });
    }

    const snapshot = await db.collection('volunteerOpportunities')
      .where('status', '==', 'open')
      .where('approvalStatus', '==', 'approved')
      .orderBy('dateTime', 'asc')
      .get();

    const items = snapshot.docs.map((document) => {
      const data = document.data();
      const volunteers = Array.isArray(data.volunteers)
        ? data.volunteers.flatMap((volunteer: unknown) => {
            if (!volunteer || typeof volunteer !== 'object') return [];
            const entry = volunteer as Record<string, unknown>;
            return [{ id: String(entry.id ?? ''), name: String(entry.name ?? '') }];
          })
        : [];
      const createdBy = data.createdBy && typeof data.createdBy === 'object'
        ? data.createdBy as Record<string, unknown>
        : {};
      return {
        id: document.id,
        title: String(data.title ?? 'Volunteer opportunity'),
        description: String(data.description ?? ''),
        dateTime: toMillis(data.dateTime),
        location: String(data.location ?? ''),
        contactEmail: String(data.contactEmail ?? ''),
        contactPhone: data.contactPhone ? String(data.contactPhone) : undefined,
        maxVolunteers: Number(data.maxVolunteers) || 1,
        currentVolunteers: Number(data.currentVolunteers) || 0,
        volunteers,
        status: 'open' as const,
        createdAt: toMillis(data.createdAt),
        createdBy: {
          uid: String(createdBy.uid ?? ''),
          displayName: String(createdBy.displayName ?? ''),
        },
      };
    });

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error loading volunteer opportunities:', error);
    return NextResponse.json(
      { error: 'We couldn’t load volunteer opportunities. Please try again.' },
      { status: 500 }
    );
  }
}
