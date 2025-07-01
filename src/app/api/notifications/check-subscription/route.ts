import { NextResponse } from 'next/server';
import { getSubscriptionsForTopic } from '@/lib/notifications/subscriptionStore';
import type { PushSubscription } from 'web-push';

interface CheckSubscriptionRequest {
  subscription: PushSubscription;
  topic: string;
}

export async function POST(request: Request) {
  try {
    console.log('[API] Received check-subscription request');
    
    const data = await request.json() as CheckSubscriptionRequest;
    console.log('[API] Check subscription data:', {
      endpoint: data.subscription?.endpoint,
      topic: data.topic
    });

    if (!data.subscription || !data.topic) {
      console.error('[API] Missing required fields in check request');
      return NextResponse.json(
        { error: 'Missing required fields: subscription and topic' },
        { status: 400 }
      );
    }

    // Get all subscriptions for the topic
    const subscriptions = await getSubscriptionsForTopic(data.topic);
    console.log(`[API] Found ${subscriptions.length} subscriptions for topic: ${data.topic}`);

    // Check if our subscription is in the list
    const found = subscriptions.some(sub => sub.endpoint === data.subscription.endpoint);
    console.log('[API] Subscription status:', {
      endpoint: data.subscription.endpoint,
      topic: data.topic,
      found
    });

    return NextResponse.json({
      found,
      totalSubscriptions: subscriptions.length
    });
  } catch (error) {
    console.error('[API] Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
} 