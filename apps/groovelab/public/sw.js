const CACHE_NAME = 'groovelab-static-v112';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    }).catch(function(err) {
      console.warn('Pre-caching failed during install:', err);
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return clients.claim();
    })
  );
});

self.addEventListener('push', function(event) {
  // Set native app badge counter on PWA icon
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge().catch(function(err) {
      console.warn('Could not set app badge:', err);
    });
  }

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
        self.registration.showNotification(payload.title || 'Campus', options)
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

  // Clear native app badge on interaction
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(function(err) {
      console.warn('Could not clear app badge:', err);
    });
  }

  const notificationId = event.notification.data?.notificationId;
  const supabaseUrl = event.notification.data?.supabaseUrl;
  const supabaseKey = event.notification.data?.supabaseKey;
  const url = event.notification.data?.url || '/';

  // 1. Immediately focus or open the window
  const navigationPromise = focusOrOpenWindow(url);

  // 2. Perform DB update in parallel without blocking client response
  let dbUpdatePromise = Promise.resolve();
  if (notificationId && supabaseUrl && supabaseKey) {
    dbUpdatePromise = fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ is_read: true })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('PATCH status: ' + res.status);
      return res;
    })
    .catch(function(err) {
      console.error('Error marking notification as read in sw:', err);
    });
  }

  // 3. Keep SW active until settled, but do not block UI opening on db latency
  event.waitUntil(
    Promise.allSettled([navigationPromise, dbUpdatePromise])
  );
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

self.addEventListener('fetch', function(event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Only handle http and https requests to avoid crashing on chrome-extension://, ws://, etc.
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip API/Supabase internal traffic
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) {
    return;
  }

  // Navigate mode (HTML documents) -> Network First with Cache Fallback
  // Navigate mode (HTML documents) -> Stale-While-Revalidate with root /index.html (SPA app-shell offline-first pattern)
  if (event.request.mode === 'navigate') {
    const isReload = url.searchParams.has('reload_cb') || url.searchParams.has('reload_manual');

    if (isReload) {
      // Hard reload requested: fetch index.html from network, update cache, bypass local cache
      event.respondWith(
        fetch('/index.html')
          .then(function(response) {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put('/index.html', responseClone);
                cache.put('/', responseClone);
              });
            }
            return response;
          })
          .catch(function() {
            return caches.match('/index.html').then(function(cachedResponse) {
              return cachedResponse || caches.match('/');
            });
          })
      );
      return;
    }

    // Normal navigate mode: serve index.html shell from cache immediately, and fetch updates in background
    event.respondWith(
      caches.match('/index.html').then(function(cachedResponse) {
        const fallbackResponse = cachedResponse || caches.match('/');
        
        const fetchPromise = fetch('/index.html')
          .then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put('/index.html', responseClone);
                cache.put('/', responseClone);
              });
            }
            return networkResponse;
          })
          .catch(function(err) {
            console.warn('Background navigate sync failed:', err);
          });

        return fallbackResponse || fetchPromise || new Response('Du bist offline. Bitte überprüfe deine Internetverbindung.', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function(cachedResponse) {
      const fetchPromise = fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function(err) {
        console.warn('Background fetch failed for:', event.request.url, err);
        // Ensure we never return undefined if cachedResponse is missing
        if (!cachedResponse) {
          return new Response('Ressource offline nicht verfügbar.', { status: 503 });
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});

