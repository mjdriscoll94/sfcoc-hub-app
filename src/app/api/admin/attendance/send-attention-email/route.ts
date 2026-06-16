import { NextResponse } from 'next/server';
import { getEmailFromInformationHub, transporter } from '@/lib/email/config';
import { wrapMemberEmailHtml } from '@/lib/email/memberEmailTemplate';

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
    const body = await request.json();
    const { to, items, subject, intro } = body as {
      to?: string[];
      items?: AttentionEmailItem[];
      subject?: string;
      intro?: string;
    };

    const recipients = (to || []).map((email) => email.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
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

    const html = wrapMemberEmailHtml(`
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
