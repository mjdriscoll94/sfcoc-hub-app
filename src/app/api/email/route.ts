import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create reusable transporter object using Resend SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY || "re_9MZjEWtL_7HPtgrq6XYN1LnoBHTnghvU6"
  }
});

export async function POST(request: Request) {
  try {
    console.log('Email API route called');
    
    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError: unknown) {
      const error = verifyError instanceof Error ? verifyError : new Error(String(verifyError));
      console.error('SMTP connection verification failed:', {
        error: error.message,
        stack: error.stack
      });
      return NextResponse.json(
        { error: 'Failed to connect to SMTP server', details: error.message },
        { status: 500 }
      );
    }

    // Parse request body
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
      hasContent: !!content
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
      from: `SFCOC ${type} <announcements@sfcoc.org>`,
      to: recipients,
      subject,
      html: content,
    };

    console.log('Attempting to send email with options:', {
      from: mailOptions.from,
      subject: mailOptions.subject,
      recipientCount: recipients.length
    });

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', {
        messageId: result.messageId,
        response: result.response
      });
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        response: result.response
      });
    } catch (emailError: any) {
      console.error('SMTP error:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      return NextResponse.json(
        { 
          error: 'Failed to send email via SMTP', 
          details: {
            message: emailError.message,
            code: emailError.code,
            response: emailError.response
          }
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in email API route:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 