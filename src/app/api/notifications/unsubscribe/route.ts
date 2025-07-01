import { NextResponse } from 'next/server';
import { removeSubscription } from '@/lib/notifications/subscriptionStore';
import type { PushSubscription } from 'web-push';

interface UnsubscribeRequest {
  subscription: PushSubscription;
}

export async function POST(request: Request) {
  try {
    console.log('[API] Received unsubscribe request');
    
    const data = await request.json() as UnsubscribeRequest;
    console.log('[API] Unsubscribe data:', data);

    if (!data.subscription) {
      console.error('[API] Missing subscription in unsubscribe request');
      return NextResponse.json(
        { error: 'Missing subscription' },
        { status: 400 }
      );
    }

    // Remove the subscription
    await removeSubscription(data.subscription);
    console.log('[API] Successfully removed subscription');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
} 