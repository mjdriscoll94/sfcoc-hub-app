import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { toIcsString } from '@/lib/calendar/ics';

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
    const snapshot = await adminDb
      .collection('calendarEvents')
      .where('startDate', '>=', Timestamp.fromDate(from))
      .where('startDate', '<=', Timestamp.fromDate(to))
      .orderBy('startDate')
      .get();

    const events = snapshot.docs.map((doc) => {
      const d = doc.data();
      const startDate = d.startDate?.toDate?.() ?? new Date(d.startDate);
      return {
        id: doc.id,
        title: d.title ?? '',
        description: d.description,
        startDate,
        endDate: d.endDate?.toDate?.() ?? (d.endDate ? new Date(d.endDate) : undefined),
        allDay: d.allDay ?? false,
        location: d.location,
      };
    });

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
