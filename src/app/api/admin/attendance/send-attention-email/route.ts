import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getEmailFromInformationHub, transporter } from '@/lib/email/config';
import { wrapMemberEmailFormattedHtml } from '@/lib/email/memberEmailTemplate';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';

interface AttentionEmailItem {
  householdName?: string;
  category?: string;
  recentCounts?: number[];
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
    const { items, subject, intro, reportType } = body as {
      items?: AttentionEmailItem[];
      subject?: string;
      intro?: string;
      reportType?: 'attendance' | 'visitor';
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

    const renderItem = (item: AttentionEmailItem) => {
      const labels = (item.labels || [])
        .map((condition) => condition.label?.trim())
        .filter(Boolean)
        .join(', ');
      const recentCounts = (Array.isArray(item.recentCounts) ? item.recentCounts : [])
        .filter((count) => typeof count === 'number' && Number.isFinite(count))
        .slice(0, 6);
      const countsHtml = recentCounts.length > 0
        ? `<div style="margin-top: 4px; color: #555; font-size: 13px;">
            Last 6 recorded weeks (newest &rarr; oldest):
            <strong>${recentCounts.map((count) => escapeHtml(String(count))).join(' &nbsp;|&nbsp; ')}</strong>
          </div>`
        : '';
      return `<li style="margin-bottom: 12px;">
        <strong>${escapeHtml(item.householdName!.trim())}</strong>
        <div style="margin-top: 2px; color: #666; font-size: 13px;">Reason: ${escapeHtml(labels)}</div>
        ${countsHtml}
      </li>`;
    };

    const categoryOrder = ['Consistently Gone', 'Increasingly Missing', 'Recently Missing'];
    const hasCategories = attentionItems.some((item) => item.category?.trim());
    const reportContent = hasCategories
      ? categoryOrder
          .map((category) => {
            const categoryItems = attentionItems.filter((item) => item.category === category);
            if (categoryItems.length === 0) return '';
            return `
              <h2 style="margin: 24px 0 8px; color: #333; font-size: 18px;">${escapeHtml(category)}</h2>
              <ul style="margin-top: 0; padding-left: 22px;">${categoryItems.map(renderItem).join('')}</ul>
            `;
          })
          .join('')
      : `<ul>${attentionItems.map(renderItem).join('')}</ul>`;

    const html = wrapMemberEmailFormattedHtml(`
      <p>${escapeHtml((intro || 'The following households currently need attendance follow-up:').trim())}</p>
      ${hasCategories ? '<p style="color: #666; font-size: 13px;">Attendance counts are shown with the most recent week on the left.</p>' : ''}
      ${reportContent}
    `);

    const finalSubject = subject?.trim() || `Attendance follow-up needed (${attentionItems.length})`;
    const historyItems = attentionItems.map((item) => ({
      householdName: item.householdName!.trim(),
      labels: (item.labels || []).map((condition) => condition.label?.trim()).filter(Boolean),
      ...(item.category?.trim() ? { category: item.category.trim() } : {}),
      ...(Array.isArray(item.recentCounts) ? {
        recentCounts: item.recentCounts
          .filter((count) => typeof count === 'number' && Number.isFinite(count))
          .slice(0, 6),
      } : {}),
    }));
    const historyRef = getAdminDb().collection('attendanceEmailHistory').doc();
    await historyRef.set({
      reportType: reportType === 'visitor' ? 'visitor' : 'attendance',
      subject: finalSubject,
      recipients,
      items: historyItems,
      itemCount: historyItems.length,
      status: 'sending',
      requestedAt: FieldValue.serverTimestamp(),
      sentBy: decodedToken.uid,
      sentByEmail: decodedToken.email || userProfile?.email || '',
    });

    let result;
    try {
      result = await transporter.sendMail({
      from: getEmailFromInformationHub(),
      to: recipients,
      subject: finalSubject,
      html,
      });
    } catch (sendError) {
      await historyRef.update({
        status: 'failed',
        failedAt: FieldValue.serverTimestamp(),
        error: sendError instanceof Error ? sendError.message.slice(0, 500) : 'Failed to send report',
      }).catch((historyError) => console.error('Failed to record attendance email failure:', historyError));
      throw sendError;
    }

    await historyRef.update({
      status: 'sent',
      sentAt: FieldValue.serverTimestamp(),
      messageId: result.messageId || '',
    });

    return NextResponse.json({
      success: true,
      historyId: historyRef.id,
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
