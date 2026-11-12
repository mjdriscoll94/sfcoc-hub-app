import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { transporter, getEmailFromAnnouncements } from '@/lib/email/config';
import { appendUnsubscribeFooter, createUnsubscribeUrl, unsubscribeHeaders } from '@/lib/email/broadcastEmail';
import { filterSuppressedEmailAddresses } from '@/lib/email/unsubscribeStore';
import { getAdminDb } from '@/lib/firebase/admin';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendBatchedPrayerPraiseEmailServer() {
  const db = getAdminDb();
  const cutoff = Date.now() - (2 * 60 * 60 * 1000);
  const [postsSnapshot, usersSnapshot] = await Promise.all([
    db.collection('prayerPraise').where('status', '==', 'active').get(),
    db.collection('users').where('approvalStatus', '==', 'approved').get(),
  ]);

  const posts = postsSnapshot.docs.filter((document) => {
    const data = document.data();
    const createdAt = data.dateCreated instanceof Timestamp ? data.dateCreated.toMillis() : 0;
    return data.approvalStatus === 'approved'
      && data.priority === 'Batched'
      && data.isSent !== true
      && data.isAdminOnly !== true
      && createdAt <= cutoff;
  });

  const sendGroup = async (type: 'prayer' | 'praise') => {
    const matching = posts.filter((document) => document.data().type === type);
    if (matching.length === 0) return 0;
    const preference = type === 'prayer' ? 'prayerRequests' : 'praiseReports';
    const candidateEmails = usersSnapshot.docs.flatMap((document) => {
      const data = document.data();
      return data.emailSubscriptions?.[preference] === true && typeof data.email === 'string' ? [data.email] : [];
    });
    const { emails } = await filterSuppressedEmailAddresses(db, candidateEmails);
    if (emails.length === 0) return 0;

    const heading = type === 'prayer' ? 'New Prayer Requests' : 'New Praise Reports';
    const cards = matching.map((document) => {
      const data = document.data();
      return `<div style="margin-bottom:20px;padding:15px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#333;margin-top:0">${escapeHtml(data.title)}</h2>
        <p>${escapeHtml(data.description)}</p>
        <p style="font-style:italic;color:#888">${type === 'prayer' ? 'Requested' : 'Shared'} by: ${data.isAnonymous === true ? 'Anonymous' : escapeHtml(data.author?.name)}</p>
      </div>`;
    }).join('');
    const content = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>${heading}</h1>${cards}</div>`;

    for (const email of emails) {
      const unsubscribeUrl = createUnsubscribeUrl(email);
      await transporter.sendMail({
        from: getEmailFromAnnouncements(),
        to: email,
        subject: heading,
        html: appendUnsubscribeFooter(content, unsubscribeUrl),
        headers: unsubscribeHeaders(unsubscribeUrl),
      });
    }

    const batch = db.batch();
    matching.forEach((document) => batch.update(document.ref, { isSent: true }));
    await batch.commit();
    return matching.length;
  };

  const [prayerRequests, praiseReports] = await Promise.all([sendGroup('prayer'), sendGroup('praise')]);
  return { prayerRequests, praiseReports };
}
