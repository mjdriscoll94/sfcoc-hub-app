import { PushSubscription } from 'web-push';
import { ref as clientRef, get as clientGet, set as clientSet, remove as clientRemove, Database as ClientDatabase } from 'firebase/database';
import { getDatabase as getAdminDatabase, Reference as AdminReference } from 'firebase-admin/database';
import { rtdb } from '@/lib/firebase/config';
import { initAdmin } from '@/lib/firebase/admin';

// Type for subscription keys
interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

// Type for storing a subscription with its associated topics
interface StoredSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
  expirationTime: number | null;
  topics: string[];
}

const SUBSCRIPTIONS_PATH = 'push_subscriptions';
const TOPICS_PATH = 'push_topics';

// Helper function to create a safe key from endpoint URL
function createSafeKey(endpoint: string): string {
  return Buffer.from(endpoint).toString('base64').replace(/[/+=]/g, '_');
}

// Helper functions for database operations
async function getServerData(path: string) {
  const { rtdb: adminRtdb } = initAdmin();
  const ref = adminRtdb.ref(path);
  const snapshot = await ref.once('value');
  return snapshot.val();
}

async function setServerData(path: string, data: any) {
  const { rtdb: adminRtdb } = initAdmin();
  const ref = adminRtdb.ref(path);
  await ref.set(data);
}

async function removeServerData(path: string) {
  const { rtdb: adminRtdb } = initAdmin();
  const ref = adminRtdb.ref(path);
  await ref.remove();
}

async function getClientData(path: string) {
  const ref = clientRef(rtdb, path);
  const snapshot = await clientGet(ref);
  return snapshot.val();
}

async function setClientData(path: string, data: any) {
  const ref = clientRef(rtdb, path);
  await clientSet(ref, data);
}

async function removeClientData(path: string) {
  const ref = clientRef(rtdb, path);
  await clientRemove(ref);
}

export async function saveSubscription(subscription: PushSubscription, topics: string[] = []): Promise<void> {
  console.log('Saving subscription:', {
    endpoint: subscription.endpoint,
    topics,
    keys: subscription.keys
  });
  
  const isServer = typeof window === 'undefined';
  
  try {
    // Convert the subscription to a plain object that can be stored
    const storedSubscription: StoredSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || ''
      },
      expirationTime: subscription.expirationTime || null,
      topics
    };

    // Validate the subscription data
    if (!storedSubscription.keys.p256dh || !storedSubscription.keys.auth) {
      throw new Error('Missing required subscription keys');
    }

    // Save the subscription
    const safeKey = createSafeKey(subscription.endpoint);
    if (isServer) {
      await setServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`, storedSubscription);
      // Update topic indices
      for (const topic of topics) {
        await setServerData(`${TOPICS_PATH}/${topic}/${safeKey}`, true);
      }
    } else {
      await setClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`, storedSubscription);
      // Update topic indices
      for (const topic of topics) {
        await setClientData(`${TOPICS_PATH}/${topic}/${safeKey}`, true);
      }
    }
    
    console.log('Successfully saved subscription:', {
      endpoint: subscription.endpoint,
      topics
    });
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

export async function removeSubscription(subscription: PushSubscription): Promise<void> {
  console.log('Removing subscription:', subscription.endpoint);
  
  const isServer = typeof window === 'undefined';
  
  try {
    const safeKey = createSafeKey(subscription.endpoint);
    
    // Get the subscription to find its topics
    const storedData = isServer 
      ? await getServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription
      : await getClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription;
    
    if (storedData) {
      // Remove from topic indices
      for (const topic of storedData.topics) {
        if (isServer) {
          await removeServerData(`${TOPICS_PATH}/${topic}/${safeKey}`);
        } else {
          await removeClientData(`${TOPICS_PATH}/${topic}/${safeKey}`);
        }
      }
    }
    
    // Remove the subscription
    if (isServer) {
      await removeServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`);
    } else {
      await removeClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`);
    }
    console.log('Successfully removed subscription');
  } catch (error) {
    console.error('Error removing subscription:', error);
    throw error;
  }
}

export async function getSubscriptionsForTopic(topic: string): Promise<PushSubscription[]> {
  console.log('Getting subscriptions for topic:', topic);
  
  const isServer = typeof window === 'undefined';
  
  try {
    // Get all subscription endpoints for this topic
    const subscriptionKeys = isServer
      ? await getServerData(`${TOPICS_PATH}/${topic}`) || {}
      : await getClientData(`${TOPICS_PATH}/${topic}`) || {};
    
    // Get the full subscription data for each endpoint
    const subscriptions = await Promise.all(
      Object.keys(subscriptionKeys).map(async (safeKey) => {
        const storedData = isServer
          ? await getServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription
          : await getClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription;
        
        if (!storedData) return null;
        
        return {
          endpoint: storedData.endpoint,
          keys: storedData.keys,
          expirationTime: storedData.expirationTime,
          getKey: (name: 'p256dh' | 'auth') => storedData.keys[name] || null,
          toJSON: () => ({
            endpoint: storedData.endpoint,
            keys: storedData.keys,
            expirationTime: storedData.expirationTime
          })
        } as PushSubscription;
      })
    );
    
    // Filter out any null values from deleted subscriptions
    const validSubscriptions = subscriptions.filter(Boolean) as PushSubscription[];
    
    console.log('Found subscriptions:', {
      topic,
      count: validSubscriptions.length,
      subscriptions: validSubscriptions.map(sub => ({
        endpoint: sub.endpoint
      }))
    });
    
    return validSubscriptions;
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    throw error;
  }
}

export async function addTopicToSubscription(subscription: PushSubscription, topic: string): Promise<void> {
  console.log('Adding topic to subscription:', {
    endpoint: subscription.endpoint,
    topic
  });
  
  const isServer = typeof window === 'undefined';
  
  try {
    const safeKey = createSafeKey(subscription.endpoint);
    const storedData = isServer
      ? await getServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription
      : await getClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription;
    
    if (storedData) {
      if (!storedData.topics.includes(topic)) {
        storedData.topics.push(topic);
        if (isServer) {
          await setServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`, storedData);
          await setServerData(`${TOPICS_PATH}/${topic}/${safeKey}`, true);
        } else {
          await setClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`, storedData);
          await setClientData(`${TOPICS_PATH}/${topic}/${safeKey}`, true);
        }
        
        console.log('Successfully added topic to subscription:', {
          endpoint: subscription.endpoint,
          topics: storedData.topics
        });
      }
    }
  } catch (error) {
    console.error('Error adding topic to subscription:', error);
    throw error;
  }
}

export async function removeTopicFromSubscription(subscription: PushSubscription, topic: string): Promise<void> {
  console.log('Removing topic from subscription:', {
    endpoint: subscription.endpoint,
    topic
  });
  
  const isServer = typeof window === 'undefined';
  
  try {
    const safeKey = createSafeKey(subscription.endpoint);
    const storedData = isServer
      ? await getServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription
      : await getClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`) as StoredSubscription;
    
    if (storedData) {
      storedData.topics = storedData.topics.filter(t => t !== topic);
      if (isServer) {
        await setServerData(`${SUBSCRIPTIONS_PATH}/${safeKey}`, storedData);
        await removeServerData(`${TOPICS_PATH}/${topic}/${safeKey}`);
      } else {
        await setClientData(`${SUBSCRIPTIONS_PATH}/${safeKey}`, storedData);
        await removeClientData(`${TOPICS_PATH}/${topic}/${safeKey}`);
      }
      
      console.log('Successfully removed topic from subscription:', {
        endpoint: subscription.endpoint,
        remainingTopics: storedData.topics
      });
    }
  } catch (error) {
    console.error('Error removing topic from subscription:', error);
    throw error;
  }
} 