import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireApprovedMember } from '@/lib/auth/requestAuthorization';
import { errorStatus, loadPrayerPost } from '@/lib/prayer/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const profile = await requireApprovedMember(request);
    const { id } = await params;
    const document = await loadPrayerPost(getAdminDb(), id, profile);
    await document.ref.update({ prayerCount: FieldValue.increment(1) });
    const updated = await document.ref.get();
    return NextResponse.json({ prayerCount: Number(updated.data()?.prayerCount ?? 0) });
  } catch (error) {
    const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
    return NextResponse.json({ error: status === 500 ? 'We couldn’t record your support.' : error instanceof Error ? error.message : 'Request failed.' }, { status });
  }
}
