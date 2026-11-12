import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';
import { normalizeEmailListEntries } from '@/lib/utils/emailListImport';
import { filterSuppressedEmailAddresses } from '@/lib/email/unsubscribeStore';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection('emailLists').orderBy('name').get();
    const lists = snap.docs.map((doc) => {
      const data = doc.data();
      const emails = (data.emails as string[]) || [];
      return { id: doc.id, name: data.name || '', emailCount: emails.length };
    });
    return NextResponse.json(lists);
  } catch (error) {
    console.error('GET email-lists error:', error);
    return NextResponse.json({ error: 'Failed to load lists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, emails: rawEmails } = body as { name?: string; emails?: string[] };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const { emails: normalizedEmails, duplicatesRemoved } = normalizeEmailListEntries(
      Array.isArray(rawEmails) ? rawEmails : []
    );
    const adminDb = getAdminDb();
    const { emails, suppressedCount } = await filterSuppressedEmailAddresses(
      adminDb,
      normalizedEmails
    );
    const ref = await adminDb.collection('emailLists').add({
      name: name.trim(),
      emails,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return NextResponse.json({
      id: ref.id,
      name: name.trim(),
      emailCount: emails.length,
      duplicatesRemoved,
      suppressedRemoved: suppressedCount,
    });
  } catch (error) {
    console.error('POST email-lists error:', error);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
