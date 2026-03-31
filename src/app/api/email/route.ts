import { NextResponse } from 'next/server';
import { transporter, getEmailFromAnnouncements } from '@/lib/email/config';

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

    const mailOptions = {
      from: getEmailFromAnnouncements(),
      to: recipients,
      subject,
      html: content,
    };

    console.log('Attempting to send email with options:', {
      from: mailOptions.from,
      subject: mailOptions.subject,
      recipientCount: recipients.length,
    });

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', { messageId: result.messageId });
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
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
