import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { sendPrayerArchiveNotice, sendPrayerArchiveWarning } from '@/lib/prayer/email';
import { toMillis } from '@/lib/prayer/server';
import { prayerArchiveAction } from '@/lib/prayer/archival';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const snapshot = await db.collection('prayerPraise').where('status', '==', 'active').get();
  const now = Date.now();
  let archived = 0;
  let warned = 0;
  const errors: string[] = [];

  for (const document of snapshot.docs) {
    const data = document.data();
    if (data.type !== 'prayer' || data.approvalStatus !== 'approved') continue;
    const activityAt = toMillis(data.lastActivityAt, toMillis(data.dateCreated));
    const warningSentAt = data.archiveWarningSentAt ? toMillis(data.archiveWarningSentAt, 0) : 0;
    const action = prayerArchiveAction({ now, lastActivityAt: activityAt, warningSentAt });

    try {
      if (action === 'archive') {
        await document.ref.update({
          status: 'archived',
          archivedAt: Timestamp.now(),
          archivedReason: 'automatic',
        });
        archived += 1;
        await sendPrayerArchiveNotice({
          db,
          requestTitle: String(data.title ?? 'Prayer request'),
          followerIds: Array.isArray(data.followerIds) ? data.followerIds : [],
        });
        continue;
      }

      if (action === 'warn') {
        await sendPrayerArchiveWarning({
          db,
          requestId: document.id,
          requestTitle: String(data.title ?? 'Prayer request'),
          authorId: String(data.author?.id ?? ''),
        });
        await document.ref.update({ archiveWarningSentAt: Timestamp.now() });
        warned += 1;
      }
    } catch (error) {
      console.error(`Prayer archive processing failed for ${document.id}:`, error);
      errors.push(document.id);
    }
  }

  return NextResponse.json({ success: errors.length === 0, archived, warned, errors });
}
