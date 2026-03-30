import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { toIcsString } from '@/lib/calendar/ics';
import { calendarEventFromFirestore, expandAllEvents } from '@/lib/calendar/recurrence';

/**
 * GET /api/calendar/feed
 * Returns calendar events as an iCal (.ics) feed so users can subscribe in
 * Google Calendar, Apple Calendar, Yahoo, Outlook, TeamUp, etc.
 * Query params: from (ISO date), to (ISO date). Default: from=today, to=1 year from today.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = fromParam ? new Date(fromParam) : today;
    const to = toParam ? new Date(toParam) : new Date(today.getFullYear() + 1, 11, 31, 23, 59, 59);

    const adminDb = getAdminDb();
    const fromTs = Timestamp.fromDate(from);
    const toTs = Timestamp.fromDate(to);

    const [snapInRange, snapRecurring] = await Promise.all([
      adminDb
        .collection('calendarEvents')
        .where('startDate', '>=', fromTs)
        .where('startDate', '<=', toTs)
        .orderBy('startDate')
        .get(),
      adminDb
        .collection('calendarEvents')
        .where('hasRecurrence', '==', true)
        .where('startDate', '<=', toTs)
        .orderBy('startDate')
        .get(),
    ]);

    const raw: ReturnType<typeof calendarEventFromFirestore>[] = [];
    const seen = new Set<string>();
    for (const doc of snapInRange.docs) {
      seen.add(doc.id);
      raw.push(calendarEventFromFirestore(doc.id, doc.data() as Record<string, unknown>));
    }
    for (const doc of snapRecurring.docs) {
      if (seen.has(doc.id)) continue;
      raw.push(calendarEventFromFirestore(doc.id, doc.data() as Record<string, unknown>));
    }

    const events = expandAllEvents(raw, from, to).map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      startDate: ev.startDate,
      endDate: ev.endDate,
      allDay: ev.allDay ?? false,
      location: ev.location,
    }));

    const ics = toIcsString(events, 'SFCoC Church Calendar');

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="sfcoc-calendar.ics"',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Calendar feed error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar feed' },
      { status: 500 }
    );
  }
}
