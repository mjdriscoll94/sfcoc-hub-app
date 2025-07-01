import { NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/notifications/subscriptionStore';
import type { PushSubscription } from 'web-push';

interface SubscriptionRequest {
  subscription: PushSubscription;
  topics: string[];
}

export async function POST(request: Request) {
  try {
    console.log('[API] Received subscription request');
    
    const data = await request.json() as SubscriptionRequest;
    console.log('[API] Subscription data:', {
      endpoint: data.subscription?.endpoint,
      topics: data.topics,
      hasAuth: !!data.subscription?.keys?.auth,
      hasP256dh: !!data.subscription?.keys?.p256dh,
      keys: data.subscription?.keys
    });

    if (!data.subscription || !data.topics) {
      console.error('[API] Missing required fields in subscription request');
      return NextResponse.json(
        { error: 'Missing required fields: subscription and topics' },
        { status: 400 }
      );
    }

    // Validate the subscription object has the required fields
    if (!data.subscription.endpoint || !data.subscription.keys) {
      console.error('[API] Invalid subscription object:', {
        endpoint: data.subscription.endpoint,
        hasKeys: !!data.subscription.keys
      });
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // Validate the subscription keys
    if (!data.subscription.keys.p256dh || !data.subscription.keys.auth) {
      console.error('[API] Missing required keys in subscription:', {
        hasP256dh: !!data.subscription.keys.p256dh,
        hasAuth: !!data.subscription.keys.auth
      });
      return NextResponse.json(
        { error: 'Missing required keys: p256dh and auth' },
        { status: 400 }
      );
    }

    // Save the subscription with its topics
    try {
      await saveSubscription(data.subscription, data.topics);
      console.log('[API] Successfully saved subscription with topics:', {
        endpoint: data.subscription.endpoint,
        topics: data.topics
      });
    } catch (error) {
      console.error('[API] Error saving subscription:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to save subscription to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error processing subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process subscription' },
      { status: 500 }
    );
  }
} 