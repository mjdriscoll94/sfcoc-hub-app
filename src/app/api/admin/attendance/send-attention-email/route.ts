import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getEmailFromInformationHub, transporter } from '@/lib/email/config';
import { wrapMemberEmailFormattedHtml } from '@/lib/email/memberEmailTemplate';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';

interface AttentionEmailItem {
  householdName?: string;
  labels?: Array<{
    label?: string;
  }>;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
    const userSnapshot = await getAdminDb().collection('users').doc(decodedToken.uid).get();
    const userProfile = userSnapshot.data();
    const canSendAttendance = userProfile?.isAdmin === true || ['admin', 'organizer'].includes(userProfile?.role);
    if (!canSendAttendance) {
      return NextResponse.json({ error: 'You do not have permission to send attendance reports' }, { status: 403 });
    }

    const body = await request.json();
    const { items, subject, intro } = body as {
      items?: AttentionEmailItem[];
      subject?: string;
      intro?: string;
    };

    const settingsSnapshot = await getAdminDb().collection('adminSettings').doc('attendance').get();
    const configuredRecipients = settingsSnapshot.data()?.reportRecipients;
    const recipients = (Array.isArray(configuredRecipients) ? configuredRecipients : [])
      .map((email) => typeof email === 'string' ? email.trim() : '')
      .filter(Boolean);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No attendance report recipients are configured. Add them in Admin Settings.' },
        { status: 400 },
      );
    }

    const invalidRecipient = recipients.find((email) => !isValidEmail(email));
    if (invalidRecipient) {
      return NextResponse.json({ error: `Invalid email address: ${invalidRecipient}` }, { status: 400 });
    }

    const attentionItems = (items || []).filter(
      (item) => item.householdName?.trim() && Array.isArray(item.labels) && item.labels.length > 0,
    );
    if (attentionItems.length === 0) {
      return NextResponse.json({ error: 'No attention items were provided' }, { status: 400 });
    }

    const lines = attentionItems.map((item) => {
      const labels = (item.labels || [])
        .map((condition) => condition.label?.trim())
        .filter(Boolean)
        .join(', ');
      return `<li><strong>${escapeHtml(item.householdName!.trim())}</strong>: ${escapeHtml(labels)}</li>`;
    });

    const html = wrapMemberEmailFormattedHtml(`
      <p>${escapeHtml((intro || 'The following households currently need attendance follow-up:').trim())}</p>
      <ul>${lines.join('')}</ul>
    `);

    const result = await transporter.sendMail({
      from: getEmailFromInformationHub(),
      to: recipients,
      subject: (subject?.trim() || `Attendance follow-up needed (${attentionItems.length})`),
      html,
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
      itemCount: attentionItems.length,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Attendance attention email error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send attention email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
