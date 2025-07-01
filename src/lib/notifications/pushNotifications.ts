import { PushSubscription } from 'web-push';
import { saveSubscription, removeSubscription } from '@/lib/notifications/subscriptionStore';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Import the SUBSCRIPTION_STORE_KEY constant
const SUBSCRIPTION_STORE_KEY = 'push_subscriptions';

// Store the last known PWA status in localStorage
const PWA_STATUS_KEY = 'pwa_installed';

// Check if the browser supports push notifications
export function isPushNotificationSupported() {
  const result = {
    supported: false,
    reason: '',
    isIOS: false,
    isPWA: false,
    shouldPromptPWA: false
  };

  // Check if running on iOS
  result.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Check if running in standalone mode (added to home screen)
  result.isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                 (window.navigator as any).standalone || 
                 document.referrer.includes('ios-app://');

  // Get the last known PWA status
  const lastPWAStatus = localStorage.getItem(PWA_STATUS_KEY) === 'true';

  // If this is the first load or PWA status changed
  if (typeof window !== 'undefined') {
    if (lastPWAStatus !== result.isPWA) {
      console.log('PWA status changed:', { was: lastPWAStatus, now: result.isPWA });
      
      // Store the new status
      localStorage.setItem(PWA_STATUS_KEY, result.isPWA.toString());
      
      // If this is a fresh PWA installation (wasn't installed before or was removed)
      if (result.isPWA) {
        console.log('Fresh PWA installation detected, resetting notification status');
        result.supported = false;
        result.reason = 'Please enable notifications for the newly installed app.';
        // Clear any existing subscriptions from localStorage
        localStorage.removeItem(SUBSCRIPTION_STORE_KEY);
        return result;
      }
      
      // If the app was removed from home screen
      if (lastPWAStatus && !result.isPWA) {
        console.log('PWA was removed from home screen');
        result.supported = false;
        result.reason = 'App was removed from home screen. Please re-add to enable notifications.';
        return result;
      }
    }
  }

  if (result.isIOS) {
    if (result.isPWA) {
      // iOS PWA supports notifications
      result.supported = true;
    } else {
      result.shouldPromptPWA = true;
      result.reason = 'To enable notifications, please add this app to your home screen.';
      return result;
    }
  }

  if (!('serviceWorker' in navigator)) {
    result.reason = 'Service Workers are not supported in this browser.';
    return result;
  }

  if (!('PushManager' in window)) {
    result.reason = 'Push notifications are not supported in this browser.';
    return result;
  }

  result.supported = true;
  return result;
}

// Check and manage notification subscription status
export async function checkNotificationStatus(updateUserProfile: (updates: any) => Promise<void>) {
  try {
    console.log('Checking notification status...');
    
    const support = isPushNotificationSupported();
    console.log('Push notification support:', support);
    
    // If not supported or PWA status changed, unsubscribe
    if (!support.supported) {
      console.log('Notifications not supported or PWA status changed, unsubscribing...');
      await unsubscribeFromNotifications(updateUserProfile);
      return;
    }

    // Check if we have an active service worker registration
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    // If we're in PWA mode but don't have a subscription, update the profile
    if (!subscription && support.isPWA) {
      console.log('In PWA mode but no subscription found, updating profile');
      await updateUserProfile({ notificationsEnabled: false });
    }
  } catch (error) {
    console.error('Error checking notification status:', error);
    // On error, disable notifications to be safe
    await updateUserProfile({ notificationsEnabled: false });
  }
}

export async function subscribeToNotifications(updateUserProfile: (updates: any) => Promise<void>) {
  try {
    console.log('Starting notification subscription process...');
    
    if (!publicVapidKey) {
      throw new Error('VAPID key is missing');
    }

    const support = isPushNotificationSupported();
    console.log('Push notification support status:', support);

    if (!support.supported) {
      throw new Error(support.reason);
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted');
      }
    } else if (Notification.permission === 'denied') {
      throw new Error('Notifications have been blocked. Please enable them in your browser settings.');
    }

    // Get the current hostname (works for both localhost and ngrok)
    const hostname = window.location.origin;
    console.log('Current hostname:', hostname);

    // Get service worker registration
    console.log('Getting service worker registration...');
    let registration;
    try {
      registration = await navigator.serviceWorker.getRegistration('/service-worker.js');
      if (!registration) {
        console.log('No service worker found, registering new one...');
        registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
      }
      console.log('Service worker registration successful:', registration);
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw new Error('Failed to register service worker');
    }

    // Wait for the service worker to be ready
    console.log('Waiting for service worker to be ready...');
    await navigator.serviceWorker.ready;
    console.log('Service worker is ready');

    // Get existing subscription
    console.log('Checking existing subscription...');
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Found existing subscription, unsubscribing first...');
      await subscription.unsubscribe();
    }

    // Create new subscription
    console.log('Creating new push subscription...');
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
      console.log('Push notification subscription successful:', subscription);
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw new Error('Failed to subscribe to push notifications');
    }

    // Send subscription to backend
    console.log('Sending subscription to server...');
    try {
      const topics = ['announcements'];
      console.log('Subscribing to topics:', topics);
      
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription,
          topics
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send subscription to server');
      }

      const result = await response.json();
      console.log('Server subscription response:', result);
      
      // Double check that the subscription was saved
      const storedSubscription = await fetch('/api/notifications/check-subscription', {
        method: 'POST',
        body: JSON.stringify({
          subscription,
          topic: 'announcements'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(res => res.json());
      
      console.log('Subscription verification:', storedSubscription);
    } catch (error) {
      console.error('Server subscription failed:', error);
      // If server subscription fails, unsubscribe locally to maintain consistency
      if (subscription) {
        await subscription.unsubscribe();
      }
      throw new Error('Failed to register subscription with server');
    }

    // Update user profile
    console.log('Updating user profile...');
    await updateUserProfile({
      notificationsEnabled: true,
      lastNotificationCheck: new Date().toISOString(),
    });

    // Notify the service worker to skip waiting and activate
    const activeServiceWorker = registration.active;
    if (activeServiceWorker) {
      activeServiceWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    console.log('Subscription process completed successfully');
    return true;
  } catch (error) {
    console.error('Error in subscribeToNotifications:', error);
    // Make sure to update the profile to disabled state if subscription fails
    try {
      await updateUserProfile({ notificationsEnabled: false });
    } catch (profileError) {
      console.error('Failed to update profile after subscription error:', profileError);
    }
    throw error;
  }
}

export async function unsubscribeFromNotifications(updateUserProfile: (updates: any) => Promise<void>) {
  try {
    console.log('Starting unsubscription process...');
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker registration found');
    
    // Get existing subscription
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Found existing subscription, unsubscribing...');
      
      // Send unsubscribe request to server first
      try {
        console.log('Notifying server about unsubscription...');
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (serverError) {
        console.error('Failed to notify server about unsubscription:', serverError);
        // Continue with local unsubscription even if server request fails
      }
      
      // Unsubscribe locally
      await subscription.unsubscribe();
      console.log('Successfully unsubscribed locally');
    } else {
      console.log('No existing subscription found');
    }
    
    // Update user profile
    console.log('Updating user profile to disable notifications...');
    await updateUserProfile({ notificationsEnabled: false });
    
    console.log('Unsubscription process completed successfully');
  } catch (error) {
    console.error('Error in unsubscribeFromNotifications:', error);
    throw error;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
} 