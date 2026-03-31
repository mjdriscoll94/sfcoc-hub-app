import { NextResponse } from 'next/server';
import { transporter, getEmailFromInformationHub } from '@/lib/email/config';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.siouxfallschurchofchrist.org';
const LOGO_URL = 'https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png';

function buildApprovedEmail(greeting: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" alt="SFCOC Logo" style="width: 120px; height: auto;" loading="eager" decoding="async" />
      </div>
      <h1 style="color: #333;">Account approved</h1>
      <p style="color: #666; line-height: 1.6;">${greeting}</p>
      <p style="color: #666; line-height: 1.6;">Your account has been approved. You may now sign in to the Sioux Falls Church of Christ Information Hub app.</p>
      <p style="color: #666; line-height: 1.6;">Visit the app and log in with the email and password you used when you signed up.</p>
      <p style="margin: 20px 0;">
        <a href="${BASE_URL}/auth/signin" style="background-color: #E88B5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign in</a>
      </p>
      <p style="color: #666; line-height: 1.6;">If you have any questions, please contact the church office.</p>
      <p style="color: #666; line-height: 1.6;">Blessings,<br>Sioux Falls Church of Christ</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">This is an automated message from the SFCOC Information Hub.</p>
    </div>
  `;
}

function buildRejectedEmail(greeting: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" alt="SFCOC Logo" style="width: 120px; height: auto;" loading="eager" decoding="async" />
      </div>
      <h1 style="color: #333;">Account request update</h1>
      <p style="color: #666; line-height: 1.6;">${greeting}</p>
      <p style="color: #666; line-height: 1.6;">We were unable to approve your account request for the Sioux Falls Church of Christ Information Hub at this time.</p>
      <p style="color: #666; line-height: 1.6;">If you believe this was in error or have questions, please contact the church office.</p>
      <p style="color: #666; line-height: 1.6;">Blessings,<br>Sioux Falls Church of Christ</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">This is an automated message from the SFCOC Information Hub.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, displayName, status } = body as {
      email: string;
      displayName?: string | null;
      status: 'approved' | 'rejected';
    };

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const name = displayName?.trim() || '';
    const greeting = name ? `Hi ${name},` : 'Hi,';

    const subject =
      status === 'approved'
        ? 'Your SFCOC account has been approved'
        : 'Update on your SFCOC account request';

    const html =
      status === 'approved'
        ? buildApprovedEmail(greeting)
        : buildRejectedEmail(greeting);

    await transporter.sendMail({
      from: getEmailFromInformationHub(),
      to: email.trim(),
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending account status notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification email' },
      { status: 500 }
    );
  }
}
