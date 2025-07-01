// Service Worker for SFCOC PWA

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', async (event) => {
  console.log('[Service Worker] Push Received:', {
    hasData: !!event.data,
    timestamp: new Date().toISOString()
  });
  
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', {
      title: data.title,
      body: data.body?.substring(0, 50) + (data.body?.length > 50 ? '...' : ''),
      url: data.url,
      hasData: !!data.data
    });

    // Ensure we have the required notification data
    if (!data.title) {
      console.error('[Service Worker] Push notification missing title');
      return;
    }

    const options = {
      body: data.body || '',
      icon: '/icons/icon-512x512.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/',
        ...data.data
      },
      actions: data.actions || [],
      // Ensure notification is shown even if the app is in the foreground
      requireInteraction: true,
      // Renotify even if there's an existing notification
      renotify: true,
      tag: 'announcement'
    };

    console.log('[Service Worker] Showing notification with options:', {
      title: data.title,
      body: options.body?.substring(0, 50) + (options.body?.length > 50 ? '...' : ''),
      url: options.data.url,
      requireInteraction: options.requireInteraction,
      renotify: options.renotify
    });

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('[Service Worker] Notification shown successfully');
        })
        .catch((error) => {
          console.error('[Service Worker] Error showing notification:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            type: error.name,
            timestamp: new Date().toISOString()
          });
        })
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push event:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', {
    title: event.notification.title,
    url: event.notification.data?.url,
    timestamp: new Date().toISOString()
  });

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      console.log('[Service Worker] Found', clientList.length, 'clients');
      
      // Try to find an existing window/tab to focus
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          console.log('[Service Worker] Focusing existing client:', client.url);
          return client.focus();
        }
      }
      
      // If no existing window/tab, open a new one
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window for:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
    .catch((error) => {
      console.error('[Service Worker] Error handling notification click:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error.name,
        timestamp: new Date().toISOString()
      });
    })
  );
});

// Handle incoming messages from the web app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 