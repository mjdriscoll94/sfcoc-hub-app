import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';
import { removeEmailSuppression } from '@/lib/email/unsubscribeStore';

const SUBSCRIPTION_KEYS = [
  'announcements',
  'events',
  'newsletter',
  'prayerRequests',
  'praiseReports',
] as const;

export async function PATCH(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
    const body = (await request.json()) as { emailSubscriptions?: Record<string, unknown> };
    const supplied = body.emailSubscriptions;
    if (!supplied || SUBSCRIPTION_KEYS.some((key) => typeof supplied[key] !== 'boolean')) {
      return NextResponse.json({ error: 'Complete email preferences are required.' }, { status: 400 });
    }

    const emailSubscriptions = Object.fromEntries(
      SUBSCRIPTION_KEYS.map((key) => [key, supplied[key] as boolean])
    );
    const db = getAdminDb();
    const userRef = db.collection('users').doc(decodedToken.uid);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: 'Member profile not found.' }, { status: 404 });
    }

    const isExplicitlyResubscribing = Object.values(emailSubscriptions).some(Boolean);
    const email = String(userSnapshot.data()?.email || decodedToken.email || '').trim();
    const updates: Record<string, unknown> = {
      emailSubscriptions,
      updatedAt: Timestamp.now(),
    };

    if (isExplicitlyResubscribing) {
      if (email) await removeEmailSuppression(db, email);
      updates.emailGloballyUnsubscribed = false;
      updates.emailUnsubscribedAt = FieldValue.delete();
    }

    await userRef.update(updates);
    return NextResponse.json({ success: true, emailSubscriptions });
  } catch (error) {
    console.error('PATCH email preferences error:', error);
    return NextResponse.json(
      { error: 'We couldn’t update your email preferences. Please try again.' },
      { status: 500 }
    );
  }
}
