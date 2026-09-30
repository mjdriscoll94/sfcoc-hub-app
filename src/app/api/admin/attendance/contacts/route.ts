import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';
import {
  attendanceContactOutcomeAllowsNotes,
  isAttendanceContactOutcome,
} from '@/lib/utils/attendanceContacts';

interface ReportItem {
  householdId?: string;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
    const db = getAdminDb();
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const userProfile = userSnapshot.data();
    const canManageAttendance = userProfile?.isAdmin === true || ['admin', 'organizer'].includes(userProfile?.role);
    if (!canManageAttendance) {
      return NextResponse.json({ error: 'You do not have permission to record attendance contacts' }, { status: 403 });
    }

    const body = await request.json();
    const householdId = typeof body.householdId === 'string' ? body.householdId.trim() : '';
    const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const outcome = body.outcome;

    if (!householdId || !reportId || !isAttendanceContactOutcome(outcome)) {
      return NextResponse.json({ error: 'A valid household, report, and contact outcome are required' }, { status: 400 });
    }
    if (notes.length > 4000) {
      return NextResponse.json({ error: 'Notes must be 4,000 characters or fewer' }, { status: 400 });
    }
    if (!attendanceContactOutcomeAllowsNotes(outcome) && notes) {
      return NextResponse.json({ error: 'Notes are not accepted for this contact outcome' }, { status: 400 });
    }

    const [householdSnapshot, reportSnapshot] = await Promise.all([
      db.collection('attendanceHouseholds').doc(householdId).get(),
      db.collection('attendanceEmailHistory').doc(reportId).get(),
    ]);
    if (!householdSnapshot.exists) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }
    if (!reportSnapshot.exists) {
      return NextResponse.json({ error: 'Attendance report not found' }, { status: 404 });
    }
    if (reportSnapshot.data()?.status !== 'sent') {
      return NextResponse.json({ error: 'Contacts can only be recorded from a successfully sent report' }, { status: 400 });
    }

    const reportItems = reportSnapshot.data()?.items;
    const householdWasInReport = Array.isArray(reportItems) && reportItems.some(
      (item: ReportItem) => item?.householdId === householdId,
    );
    if (!householdWasInReport) {
      return NextResponse.json({ error: 'This household was not included in the attendance report' }, { status: 400 });
    }

    const householdName = householdSnapshot.data()?.householdName || 'Unnamed Household';
    const contactRef = db.collection('attendanceContacts').doc();
    await contactRef.set({
      householdId,
      householdName,
      outcome,
      contactedAt: FieldValue.serverTimestamp(),
      contactedByUserId: decodedToken.uid,
      contactedByEmail: decodedToken.email || userProfile?.email || '',
      reportId,
      ...(notes ? { notes } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, contactId: contactRef.id });
  } catch (error) {
    console.error('Attendance contact error:', error);
    const message = error instanceof Error ? error.message : 'Failed to record attendance contact';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
