import { NextResponse } from 'next/server';
import { generatePasswordResetLink } from '@/lib/auth/authUtils';
import { sendPasswordResetEmail } from '@/lib/email/emailService';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate a password reset link
    const resetLink = await generatePasswordResetLink(email);
    
    // Send the password reset email
    const result = await sendPasswordResetEmail(email, resetLink);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 