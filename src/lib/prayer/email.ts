import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';
import { transporter, getEmailFromInformationHub } from '@/lib/email/config';
import { appendUnsubscribeFooter, createUnsubscribeUrl, unsubscribeHeaders } from '@/lib/email/broadcastEmail';
import { filterSuppressedEmailAddresses } from '@/lib/email/unsubscribeStore';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function baseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function recipientEmails(db: Firestore, userIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  const snapshots = await db.getAll(...uniqueIds.map((id) => db.collection('users').doc(id)));
  const addresses = Array.from(new Set(snapshots.flatMap((snapshot) => {
    const email = snapshot.data()?.email;
    return typeof email === 'string' && email.includes('@') ? [email] : [];
  })));
  return (await filterSuppressedEmailAddresses(db, addresses)).emails;
}

async function sendPrivatePrayerEmail(to: string[], subject: string, html: string): Promise<void> {
  for (const address of Array.from(new Set(to))) {
    const unsubscribeUrl = createUnsubscribeUrl(address);
    await transporter.sendMail({
      from: getEmailFromInformationHub(),
      to: address,
      subject,
      html: appendUnsubscribeFooter(html, unsubscribeUrl),
      headers: unsubscribeHeaders(unsubscribeUrl),
    });
  }
}

export async function sendPrayerUpdateNotifications(args: {
  db: Firestore;
  requestId: string;
  requestTitle: string;
  updateText: string;
  followerIds: string[];
  updaterId: string;
  authorId: string;
  updaterIsAdmin: boolean;
  archivedAfterUpdate?: boolean;
}): Promise<void> {
  const recipientIds = args.followerIds.filter((id) => id !== args.updaterId);
  if (args.updaterIsAdmin && args.authorId && args.authorId !== args.updaterId) recipientIds.push(args.authorId);
  const emails = await recipientEmails(args.db, recipientIds);
  if (emails.length === 0) return;
  const requestUrl = `${baseUrl()}/prayer-board?request=${encodeURIComponent(args.requestId)}`;
  const archiveNote = args.archivedAfterUpdate
    ? '<p style="margin:16px 0 0"><strong>This request was archived after this final update.</strong></p>'
    : '';
  await sendPrivatePrayerEmail(
    emails,
    'A prayer request you follow has an update',
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f3b40;max-width:640px;margin:auto">
      <h1 style="font-size:22px">${escapeHtml(args.requestTitle)}</h1>
      <p style="white-space:pre-wrap">${escapeHtml(args.updateText)}</p>
      ${archiveNote}
      <p><a href="${requestUrl}" style="display:inline-block;padding:12px 18px;background:#34434a;color:#fff;text-decoration:none;border-radius:8px">Open Prayer Board</a></p>
      <p style="font-size:13px"><a href="${baseUrl()}/settings#followed-prayer-requests">Manage followed prayer requests</a></p>
    </div>`,
  );
}

export async function sendPrayerArchiveNotice(args: {
  db: Firestore;
  requestTitle: string;
  followerIds: string[];
}): Promise<void> {
  const emails = await recipientEmails(args.db, args.followerIds);
  if (emails.length === 0) return;
  await sendPrivatePrayerEmail(
    emails,
    'A prayer request you followed was archived',
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f3b40;max-width:640px;margin:auto">
      <h1 style="font-size:22px">${escapeHtml(args.requestTitle)}</h1>
      <p>This prayer request is no longer active. If it is restored later, you will continue receiving new updates.</p>
      <p><a href="${baseUrl()}/settings#followed-prayer-requests">Manage followed requests</a></p>
    </div>`,
  );
}

export async function sendPrayerArchiveWarning(args: {
  db: Firestore;
  requestId: string;
  requestTitle: string;
  authorId: string;
}): Promise<void> {
  const emails = await recipientEmails(args.db, [args.authorId]);
  if (emails.length === 0) return;
  await sendPrivatePrayerEmail(
    emails,
    'Your prayer request will be archived soon',
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f3b40;max-width:640px;margin:auto">
      <h1 style="font-size:22px">${escapeHtml(args.requestTitle)}</h1>
      <p>This prayer request has had no updates for nearly three months. Add an update within seven days if you would like to keep it active.</p>
      <p><a href="${baseUrl()}/prayer-board?request=${encodeURIComponent(args.requestId)}">Open Prayer Board</a></p>
    </div>`,
  );
}
