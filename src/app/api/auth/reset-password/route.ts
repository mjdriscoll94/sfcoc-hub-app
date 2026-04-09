import { NextResponse } from 'next/server';
import { createFirebasePasswordResetLink } from '@/lib/auth/passwordResetServer';
import { sendPasswordResetEmail } from '@/lib/email/emailService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    try {
      const resetLink = await createFirebasePasswordResetLink(trimmed);
      const result = await sendPasswordResetEmail(trimmed, resetLink);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to send password reset email' },
          { status: 500 }
        );
      }
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/user-not-found') {
        // Do not reveal whether an account exists
      } else {
        console.error('Password reset error:', err);
        return NextResponse.json(
          { error: 'Unable to process request. Try again later.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists for that address, we sent password reset instructions.',
    });
  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 