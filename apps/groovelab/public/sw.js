self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body,
        icon: payload.icon || '/pwa-icon.png',
        badge: payload.badge || '/pwa-icon.png',
        vibrate: [100, 50, 100],
        tag: 'campus-notification',
        renotify: true,
        data: {
          url: payload.url || '/',
          notificationId: payload.notificationId || null,
          supabaseUrl: payload.supabaseUrl || null,
          supabaseKey: payload.supabaseKey || null
        }
      };
      event.waitUntil(
        self.registration.showNotification(payload.title, options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
      event.waitUntil(
        self.registration.showNotification('Campus', {
          body: event.data.text(),
          icon: '/pwa-icon.png',
          badge: '/pwa-icon.png',
          vibrate: [100, 50, 100]
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const notificationId = event.notification.data?.notificationId;
  const supabaseUrl = event.notification.data?.supabaseUrl;
  const supabaseKey = event.notification.data?.supabaseKey;
  const url = event.notification.data?.url || '/';

  // Mark notification as read via direct REST API patch
  if (notificationId && supabaseUrl && supabaseKey) {
    event.waitUntil(
      Promise.all([
        fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ is_read: true })
        }).catch(err => console.error('Error marking notification as read in sw:', err)),
        focusOrOpenWindow(url)
      ])
    );
  } else {
    event.waitUntil(focusOrOpenWindow(url));
  }
});

function focusOrOpenWindow(targetUrl) {
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
    // 1. If we find an active window, navigate and focus it
    for (let i = 0; i < clientList.length; i++) {
      let client = clientList[i];
      if ('focus' in client) {
        if ('navigate' in client && client.url !== absoluteUrl) {
          client.navigate(absoluteUrl);
        }
        return client.focus();
      }
    }
    // 2. If no window is open, open a new one
    if (clients.openWindow) {
      return clients.openWindow(absoluteUrl);
    }
  });
}

// Add fetch event listener to satisfy PWA installability requirements
self.addEventListener('fetch', function(event) {
  // Pass-through to network, can be extended to caching later
  event.respondWith(
    fetch(event.request).catch(function() {
      // Fallback for document navigation when offline
      if (event.request.mode === 'navigate') {
        return new Response('Du bist offline. Bitte überprüfe deine Internetverbindung.', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })
  );
});

