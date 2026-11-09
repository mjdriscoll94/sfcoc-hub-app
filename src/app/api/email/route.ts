import { NextResponse } from 'next/server';
import { transporter, getEmailFromAnnouncements } from '@/lib/email/config';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  appendUnsubscribeFooter,
  createUnsubscribeUrl,
  isOptionalBroadcastEmail,
  unsubscribeHeaders,
} from '@/lib/email/broadcastEmail';
import { filterSuppressedEmailAddresses } from '@/lib/email/unsubscribeStore';

export async function POST(request: Request) {
  try {
    console.log('Email API route called');

    let body;
    try {
      body = await request.json();
    } catch (parseError: unknown) {
      const error = parseError instanceof Error ? parseError : new Error(String(parseError));
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { type, subject, content, recipients } = body;

    console.log('Email request data:', {
      type,
      subject,
      recipientCount: recipients?.length,
      hasContent: !!content,
    });

    if (!type || !subject || !content || !recipients) {
      const missingFields = [];
      if (!type) missingFields.push('type');
      if (!subject) missingFields.push('subject');
      if (!content) missingFields.push('content');
      if (!recipients) missingFields.push('recipients');

      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', details: { missingFields } },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.some((recipient) => typeof recipient !== 'string')) {
      return NextResponse.json({ error: 'Recipients must be email addresses.' }, { status: 400 });
    }

    const uniqueRecipients = Array.from(
      new Set(recipients.map((recipient) => recipient.trim()).filter(Boolean))
    );
    const isBroadcast = isOptionalBroadcastEmail(String(type));
    const suppressionResult = isBroadcast
      ? await filterSuppressedEmailAddresses(getAdminDb(), uniqueRecipients)
      : { emails: uniqueRecipients, suppressedCount: 0 };

    if (suppressionResult.emails.length === 0) {
      return NextResponse.json({
        success: true,
        recipientCount: 0,
        suppressedCount: suppressionResult.suppressedCount,
      });
    }

    console.log('Attempting to send email with options:', {
      from: getEmailFromAnnouncements(),
      subject,
      recipientCount: suppressionResult.emails.length,
    });

    try {
      let lastMessageId = '';
      for (const to of suppressionResult.emails) {
        const unsubscribeUrl = isBroadcast ? createUnsubscribeUrl(to) : null;
        const result = await transporter.sendMail({
          from: getEmailFromAnnouncements(),
          to,
          subject,
          html: unsubscribeUrl ? appendUnsubscribeFooter(content, unsubscribeUrl) : content,
          ...(unsubscribeUrl ? { headers: unsubscribeHeaders(unsubscribeUrl) } : {}),
        });
        lastMessageId = result.messageId;
      }
      console.log('Email sent successfully:', { messageId: lastMessageId });
      return NextResponse.json({
        success: true,
        messageId: lastMessageId,
        recipientCount: suppressionResult.emails.length,
        suppressedCount: suppressionResult.suppressedCount,
      });
    } catch (emailError: unknown) {
      const err = emailError instanceof Error ? emailError : new Error(String(emailError));
      console.error('SES send error:', { message: err.message });
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: { message: err.message },
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Unexpected error in email API route:', { message: err.message, stack: err.stack });
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
