import { NextResponse } from 'next/server';
import { transporter, getEmailFromAnnouncements } from '@/lib/email/config';
import { wrapMemberEmailHtml } from '@/lib/email/memberEmailTemplate';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const TEST_SUBJECT = 'SFCOC Information Hub — email test (admin)';

const TEST_BODY_PLAIN = `This is a test message from the SFCOC Information Hub admin tools.

It was sent only to this address so you can verify that outbound email (including SES and your domain) is working.

If you did not trigger this test from the admin Send Email page, you can ignore this message.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to } = body as { to?: string };

    if (!to?.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const address = to.trim();
    if (!isValidEmail(address)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const html = wrapMemberEmailHtml(TEST_BODY_PLAIN);

    const result = await transporter.sendMail({
      from: getEmailFromAnnouncements(),
      to: address,
      subject: TEST_SUBJECT,
      html,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Admin send-test-email error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { error: 'Failed to send test email', details: { message: err.message } },
      { status: 500 }
    );
  }
}
