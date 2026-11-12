import { NextResponse } from 'next/server';
import { sendBatchedPrayerPraiseEmailServer } from '@/lib/prayer/batchedEmail';

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || !authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sendBatchedPrayerPraiseEmailServer();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in batched email API route:', error);
    return NextResponse.json(
      { error: 'Failed to send batched emails' },
      { status: 500 }
    );
  }
}
