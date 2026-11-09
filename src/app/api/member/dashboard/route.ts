import { NextResponse } from 'next/server';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { calendarEventFromFirestore, expandAllEvents } from '@/lib/calendar/recurrence';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function toMillis(value: unknown, fallback = Date.now()): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return fallback;
}

async function loadAnnouncements(db: Firestore) {
  const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').limit(3).get();
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      title: String(data.title ?? 'Announcement'),
      type: String(data.type ?? 'General'),
      createdAt: toMillis(data.createdAt),
    };
  });
}

async function loadUpcomingEvents(db: Firestore) {
  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setMonth(rangeEnd.getMonth() + 6);

  const [futureSnapshot, recurringSnapshot] = await Promise.all([
    db.collection('calendarEvents')
      .where('startDate', '>=', Timestamp.fromDate(rangeStart))
      .where('startDate', '<=', Timestamp.fromDate(rangeEnd))
      .orderBy('startDate')
      .limit(20)
      .get(),
    db.collection('calendarEvents')
      .where('hasRecurrence', '==', true)
      .where('startDate', '<=', Timestamp.fromDate(rangeEnd))
      .orderBy('startDate')
      .get(),
  ]);

  const events = [];
  const seen = new Set<string>();
  for (const document of futureSnapshot.docs) {
    seen.add(document.id);
    events.push(calendarEventFromFirestore(document.id, document.data()));
  }
  for (const document of recurringSnapshot.docs) {
    if (!seen.has(document.id)) {
      events.push(calendarEventFromFirestore(document.id, document.data()));
    }
  }

  return expandAllEvents(events, rangeStart, rangeEnd)
    .filter((event) => event.startDate >= rangeStart)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 3)
    .map((event) => ({
      id: event.id || '',
      title: event.title,
      startDate: event.startDate.getTime(),
      allDay: event.allDay === true,
      location: event.location,
    }));
}

async function loadLatestResource(db: Firestore, collectionName: 'bulletins' | 'lesson-notes') {
  const snapshot = await db.collection(collectionName).orderBy('uploadedAt', 'desc').limit(1).get();
  const document = snapshot.docs[0];
  if (!document) return null;
  const data = document.data();
  return {
    id: document.id,
    title: String(data.title ?? (collectionName === 'bulletins' ? 'Bulletin' : 'Lesson notes')),
    date: toMillis(data.date),
    fileUrl: String(data.fileUrl ?? ''),
  };
}

async function loadPrayerCount(db: Firestore) {
  const snapshot = await db.collection('prayerPraise').where('status', '==', 'active').get();
  return snapshot.docs.filter((document) => document.data().approvalStatus === 'approved').length;
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

    const [announcements, events, bulletin, lessonNote, prayerCount] = await Promise.allSettled([
      loadAnnouncements(db),
      loadUpcomingEvents(db),
      loadLatestResource(db, 'bulletins'),
      loadLatestResource(db, 'lesson-notes'),
      loadPrayerCount(db),
    ]);

    const results = [announcements, events, bulletin, lessonNote, prayerCount];
    const failures = results.filter((result) => result.status === 'rejected');
    failures.forEach((failure) => {
      if (failure.status === 'rejected') console.error('Member dashboard data error:', failure.reason);
    });

    return NextResponse.json(
      {
        announcements: announcements.status === 'fulfilled' ? announcements.value : [],
        events: events.status === 'fulfilled' ? events.value : [],
        bulletin: bulletin.status === 'fulfilled' ? bulletin.value : null,
        lessonNote: lessonNote.status === 'fulfilled' ? lessonNote.value : null,
        prayerCount: prayerCount.status === 'fulfilled' ? prayerCount.value : 0,
        partialError: failures.length > 0,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error loading member dashboard:', error);
    return NextResponse.json(
      { error: 'We couldn’t load your member home. Please try again.' },
      { status: 500 }
    );
  }
}
