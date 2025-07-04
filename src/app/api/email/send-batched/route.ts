import { NextResponse } from 'next/server';
import { sendBatchedPrayerPraiseEmail } from '@/lib/email/emailService';

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sendBatchedPrayerPraiseEmail();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in batched email API route:', error);
    return NextResponse.json(
      { error: 'Failed to send batched emails' },
      { status: 500 }
    );
  }
} 