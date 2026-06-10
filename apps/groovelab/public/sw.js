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
        self.registration.showNotification('Campus Groovelab', {
          body: event.data.text()
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
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
          for (let i = 0; i < clientList.length; i++) {
            let client = clientList[i];
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
      ])
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});
