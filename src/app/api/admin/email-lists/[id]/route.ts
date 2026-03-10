import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';

function normalizeEmails(emails: string[]): string[] {
  const set = new Set<string>();
  for (const e of emails) {
    const t = e.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) set.add(t);
  }
  return [...set];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();
    const doc = await adminDb.collection('emailLists').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }
    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      name: data.name || '',
      emails: (data.emails as string[]) || [],
    });
  } catch (error) {
    console.error('GET email-list error:', error);
    return NextResponse.json({ error: 'Failed to load list' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, emails: rawEmails } = body as { name?: string; emails?: string[] };
    const adminDb = getAdminDb();
    const ref = adminDb.collection('emailLists').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }
    const updates: Record<string, unknown> = { updatedAt: admin.firestore.Timestamp.now() };
    if (name !== undefined) updates.name = String(name).trim();
    if (rawEmails !== undefined) updates.emails = normalizeEmails(Array.isArray(rawEmails) ? rawEmails : []);
    await ref.update(updates);
    const updated = await ref.get();
    const data = updated.data()!;
    return NextResponse.json({
      id: updated.id,
      name: data.name || '',
      emailCount: ((data.emails as string[]) || []).length,
    });
  } catch (error) {
    console.error('PATCH email-list error:', error);
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();
    const ref = adminDb.collection('emailLists').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE email-list error:', error);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
