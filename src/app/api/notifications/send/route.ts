import { NextResponse } from 'next/server';
import webpush, { PushSubscription } from 'web-push';
import { getSubscriptionsForTopic } from '@/lib/notifications/subscriptionStore';

// Configure web-push with VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
  console.error('Missing VAPID configuration:', {
    hasPublicKey: !!vapidPublicKey,
    hasPrivateKey: !!vapidPrivateKey,
    hasEmail: !!vapidEmail
  });
}

webpush.setVapidDetails(
  'mailto:' + (vapidEmail || ''),
  vapidPublicKey || '',
  vapidPrivateKey || ''
);

interface NotificationData {
  topic: string;
  notification: {
    title: string;
    body: string;
    url?: string;
    data?: Record<string, unknown>;
  };
}

interface SendResult {
  success: boolean;
  endpoint: string;
  error?: string;
}

export async function POST(request: Request) {
  try {
    console.log('[API] Received notification send request');
    
    const data = await request.json() as NotificationData;
    console.log('[API] Notification data:', {
      topic: data.topic,
      title: data.notification.title,
      hasBody: !!data.notification.body,
      url: data.notification.url
    });
    
    if (!data.topic || !data.notification) {
      console.error('[API] Missing required fields in notification request');
      return NextResponse.json(
        { error: 'Missing required fields: topic and notification' },
        { status: 400 }
      );
    }

    // Get all subscriptions for the topic
    const subscriptions = await getSubscriptionsForTopic(data.topic);
    console.log(`[API] Found ${subscriptions.length} subscriptions for topic: ${data.topic}`);

    if (!subscriptions.length) {
      console.log('[API] No subscriptions found for topic:', data.topic);
      return NextResponse.json(
        { message: 'No subscriptions found for topic' },
        { status: 200 }
      );
    }

    // Log each subscription endpoint
    subscriptions.forEach((sub, index) => {
      console.log(`[API] Subscription ${index + 1}:`, {
        endpoint: sub.endpoint,
        hasAuth: !!sub.keys?.auth,
        hasP256dh: !!sub.keys?.p256dh
      });
    });

    // Send notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: PushSubscription) => {
        try {
          console.log('[API] Sending notification to subscription:', subscription.endpoint);
          
          const payload = JSON.stringify({
            title: data.notification.title,
            body: data.notification.body,
            url: data.notification.url || '/',
            data: {
              topic: data.topic,
              ...data.notification.data
            }
          });

          console.log('[API] Notification payload:', payload);

          await webpush.sendNotification(subscription, payload);
          console.log('[API] Successfully sent notification to:', subscription.endpoint);
          return { success: true, endpoint: subscription.endpoint } as SendResult;
        } catch (error) {
          console.error('[API] Error sending notification to subscription:', {
            endpoint: subscription.endpoint,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: (error as any).statusCode
          });
          
          // Check if subscription is expired/invalid
          if (error instanceof Error && 'statusCode' in error && (error.statusCode === 404 || error.statusCode === 410)) {
            console.log('[API] Subscription is expired or invalid:', subscription.endpoint);
            // Here you would typically remove the invalid subscription from your storage
            // await removeSubscription(subscription);
          }
          
          return { 
            success: false, 
            endpoint: subscription.endpoint, 
            error: error instanceof Error ? error.message : 'Unknown error'
          } as SendResult;
        }
      })
    );

    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log('[API] Notification sending complete:', {
      total: results.length,
      successful,
      failed,
      results: results.map(r => ({
        status: r.status,
        success: r.status === 'fulfilled' && r.value.success,
        error: r.status === 'rejected' ? r.reason : (r.status === 'fulfilled' && !r.value.success ? r.value.error : undefined)
      }))
    });

    return NextResponse.json({
      message: `Notifications sent. Success: ${successful}, Failed: ${failed}`,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    });

  } catch (error) {
    console.error('[API] Error processing notification request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 