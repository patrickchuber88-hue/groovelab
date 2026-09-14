const CACHE_NAME = 'groovelab-static-v1789419594191';
const DYNAMIC_CACHE = 'groovelab-dynamic-v1789419594191';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.png',
  '/campus_login_hero.png',
  '/avatars/gitarre_avatar_new.png',
  '/avatars/schlagzeug_avatar.png',
  '/avatars/klavier_avatar_new.png',
  '/avatars/gesang_avatar.png',
  '/avatars/saxophon_avatar_new.png',
  '/avatars/bass_avatar.png',
  '/avatars/violine_avatar_new.png'
];

// Security Hardening: Allowed origins for background sync & push notifications
const ALLOWED_PUSH_HOSTS = [
  'campus-groovelab.de',
  'supabase.campus-groovelab.de',
  'localhost',
  '127.0.0.1',
  '178.105.10.2'
];

function isValidPushHost(urlStr) {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr, self.location.origin);
    const host = parsed.hostname;
    return ALLOWED_PUSH_HOSTS.some(function(allowed) {
      return host === allowed || host.endsWith('.' + allowed);
    });
  } catch (e) {
    return false;
  }
}

function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(function() {
          limitCacheSize(cacheName, maxItems);
        });
      }
    });
  }).catch(function() {});
}

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
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return clients.claim();
    }).then(function() {
      // 🚀 Broadcast to all client windows that a new PWA version has activated
      return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        clientList.forEach(function(client) {
          client.postMessage({ type: 'PWA_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'PWA_VERSION', version: CACHE_NAME });
    }
  }
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
      const targetUrl = payload.url || '/';
      const safeUrl = isValidPushHost(targetUrl) ? targetUrl : '/';

      const options = {
        body: payload.body,
        icon: payload.icon || '/pwa-icon.png',
        badge: payload.badge || '/pwa-icon.png',
        image: payload.image || undefined,
        vibrate: payload.vibrate || [80, 40, 80],
        tag: payload.tag || 'campus-notification',
        renotify: true,
        actions: payload.actions || [
          { action: 'review', title: 'Termin prüfen 📱' }
        ],
        data: {
          url: safeUrl,
          notificationId: payload.notificationId || null,
          supabaseUrl: (payload.supabaseUrl && isValidPushHost(payload.supabaseUrl)) ? payload.supabaseUrl : null,
          supabaseKey: payload.supabaseKey || null
        }
      };
      event.waitUntil(
        self.registration.showNotification(payload.title || 'Campus-Groovelab', options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
      event.waitUntil(
        self.registration.showNotification('Campus-Groovelab', {
          body: event.data.text(),
          icon: '/pwa-icon.png',
          badge: '/pwa-icon.png',
          vibrate: [80, 40, 80],
          actions: [{ action: 'review', title: 'Termin prüfen 📱' }]
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
  const rawUrl = event.notification.data?.url || '/';
  const url = isValidPushHost(rawUrl) ? rawUrl : '/';

  // 1. Immediately focus or open the window
  const navigationPromise = focusOrOpenWindow(url);

  // 2. Perform DB update in parallel without blocking client response
  let dbUpdatePromise = Promise.resolve();
  if (notificationId && supabaseUrl && supabaseKey && isValidPushHost(supabaseUrl)) {
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
  const safeTarget = isValidPushHost(targetUrl) ? targetUrl : '/';
  const absoluteUrl = new URL(safeTarget, self.location.origin).href;

  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
    // 1. If we find an active window, navigate and focus it
    for (let i = 0; i < clientList.length; i++) {
      let client = clientList[i];
      if ('focus' in client) {
        if ('navigate' in client && client.url !== absoluteUrl) {
          client.navigate(absoluteUrl);
        }
        if ('postMessage' in client) {
          try {
            client.postMessage({ type: 'PUSH_NOTIFICATION_CLICK', url: absoluteUrl });
          } catch (e) {}
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

  // 🛡️ Localhost & Vite Development Shield:
  // Never intercept, cache, or clone dev-server modules, HMR updates or local requests.
  // This prevents LevelDB/IndexedDB storage starvation and Chromium IPC main thread freezes on localhost!
  const isDevHost = self.location.hostname === 'localhost' ||
                    self.location.hostname === '127.0.0.1' ||
                    self.location.hostname.endsWith('.localhost') ||
                    self.location.hostname.endsWith('.local');

  const isViteDevAsset = url.pathname.includes('/@vite/') ||
                         url.pathname.includes('/node_modules/.vite/') ||
                         url.pathname.includes('/@fs/') ||
                         url.pathname.includes('/@id/') ||
                         url.searchParams.has('t') ||
                         url.searchParams.has('import');

  if (isDevHost || isViteDevAsset) {
    return; // Pass through cleanly to browser native network stack without caching
  }

  // Skip API/Supabase internal traffic, auth endpoints, and cloud storage media (Quota & Memory Shield)
  if (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/storage/v1/')
  ) {
    return;
  }

  // Navigate mode (HTML documents) -> Network First with Snappy Cache Fallback (prevents PWA stale cache poisoning & cold launch freeze)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      new Promise(function(resolve) {
        let hasResolved = false;
        // 📱 Snappy 1200ms Apple-Level Mobile Network Timeout:
        // If network takes longer than 1.2s, immediately fall back to cached shell to prevent blank freeze
        const networkTimeout = setTimeout(function() {
          caches.match('/index.html').then(function(cached) {
            if (cached && !hasResolved) {
              hasResolved = true;
              resolve(cached);
            }
          });
        }, 1200);

        fetch(event.request)
          .then(function(networkResponse) {
            clearTimeout(networkTimeout);
            if (networkResponse && networkResponse.status === 200) {
              const cloneForIndex = networkResponse.clone();
              const cloneForRoot = networkResponse.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put('/index.html', cloneForIndex);
                cache.put('/', cloneForRoot);
              });
            }
            if (!hasResolved) {
              hasResolved = true;
              resolve(networkResponse);
            }
          })
          .catch(function() {
            clearTimeout(networkTimeout);
            if (!hasResolved) {
              hasResolved = true;
              caches.match('/index.html').then(function(cachedResponse) {
                if (cachedResponse) {
                  resolve(cachedResponse);
                  return;
                }
                caches.match('/').then(function(rootCached) {
                  resolve(rootCached || new Response('Du bist offline. Bitte überprüfe deine Internetverbindung.', {
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                  }));
                });
              });
            }
          });
      })
    );
    return;
  }

  // Skip audio/video media streams or range requests to prevent Cache API QuotaExceededError
  if (
    event.request.headers.get('range') ||
    /\.(mp3|wav|ogg|m4a|webm|mp4|aac|flac)$/i.test(url.pathname)
  ) {
    return;
  }

  // 1. Immutable Vite chunks with content-hash (/assets/*-[hash].*) -> Cache-First
  const isImmutableViteAsset = url.pathname.startsWith('/assets/') && /\-[a-zA-Z0-9_-]{8,}\.(js|css|woff2)$/.test(url.pathname);
  if (isImmutableViteAsset) {
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
              limitCacheSize(CACHE_NAME, 80);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Static assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate with LRU limit
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function(cachedResponse) {
      const fetchPromise = fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, 50);
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

      if (cachedResponse) {
        event.waitUntil(fetchPromise);
        return cachedResponse;
      }

      return fetchPromise;
    })
  );
});

