import React, { useState, useEffect } from 'react';
import { subscribeUserToPush } from '../utils/webPush';
import { SharedAudioEngine } from '../utils/sharedAudioEngine';
import { requestPersistentStorage } from '../utils/storagePersistence';
import { flushOfflineSyncQueue } from '../services/offlineSyncService';
import { runStorageJanitor, runClientStorageJanitor } from '../services/storageJanitorService';

export interface UseCampusPwaAndSystemEventsParams {
  isLocalhost: boolean;
  loggedInUserId: string | null;
}

export interface UseCampusPwaAndSystemEventsReturn {
  windowWidth: number;
  setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
  showInstallBanner: boolean;
  setShowInstallBanner: React.Dispatch<React.SetStateAction<boolean>>;
  showInstallGuide: boolean;
  setShowInstallGuide: React.Dispatch<React.SetStateAction<boolean>>;
  showPwaUpdateToast: boolean;
  setShowPwaUpdateToast: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 🏛️ Hook: useCampusPwaAndSystemEvents
 * Bounded Context für PWA-Lifecycle, Service Worker Update-Prüfung, Storage-Janitor & System-Events.
 */
export function useCampusPwaAndSystemEvents({
  isLocalhost,
  loggedInUserId
}: UseCampusPwaAndSystemEventsParams): UseCampusPwaAndSystemEventsReturn {
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPwaUpdateToast, setShowPwaUpdateToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset install banner dismiss state when scanning QR code or following QR links
    const isQR = window.location.pathname.includes('/qr/') || 
                 window.location.search.includes('qr') || 
                 window.location.search.includes('auto_pair') || 
                 window.location.search.includes('token');
    if (isQR) {
      localStorage.removeItem('groovelab_install_prompt_dismissed');
    }

    // In local development, unregister any stale service worker and purge CacheStorage to prevent freezing Vite HMR!
    if (isLocalhost) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        }).catch(() => {});
      }
    } else if ('serviceWorker' in navigator) {
      // Register service worker in production to ensure PWA installability and update checking
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('Service Worker registered successfully on load:', reg.scope);

          // 📱 Tier-1 Storage Persistence Guard (Protects IndexedDB & Offline Vault from iOS ITP 7-day auto-purge)
          requestPersistentStorage().catch(() => {});

          // If there is already a waiting worker, prompt user to update smoothly via floating toast
          if (reg.waiting && navigator.serviceWorker.controller) {
            console.log('[PWA] Waiting service worker found on load.');
            setShowPwaUpdateToast(true);
          }

          // 🚀 Real-time PWA Service Worker update detection
          const handleSwMessage = (e: MessageEvent) => {
            if (e.data?.type === 'PWA_UPDATED') {
              console.log('[PWA] Received PWA_UPDATED notification:', e.data.version);
              setShowPwaUpdateToast(true);
            }
          };
          navigator.serviceWorker.addEventListener('message', handleSwMessage);

          const handleControllerChange = () => {
            console.log('[PWA] Service Worker controller changed.');
            setShowPwaUpdateToast(true);
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

          // Fast version checker via /version.json
          const checkServerVersion = async () => {
            try {
              const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
              if (res.ok) {
                const data = await res.json();
                const currentAppVer = sessionStorage.getItem('campus_app_loaded_version');
                if (!currentAppVer) {
                  sessionStorage.setItem('campus_app_loaded_version', data.version);
                } else if (currentAppVer !== data.version) {
                  console.log('[PWA] New server version detected via version.json:', data.version);
                  setShowPwaUpdateToast(true);
                }
              }
            } catch {}
          };
          checkServerVersion();
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              checkServerVersion();
              reg.update().catch(() => {});
            }
          });

          // Register offline sync queue flusher on network restore
          window.addEventListener('online', () => {
            console.log('[OfflineSync] Network restored. Flushing offline queue...');
            flushOfflineSyncQueue();
          });

          // Check for updates on the server periodically (every 5 minutes)
          setInterval(() => {
            if (navigator.onLine) {
              reg.update().catch((err) => {
                console.warn('[PWA] Service Worker update check failed:', err);
              });
              checkServerVersion();
              console.log('[PWA] Checking for updates on the server...');
            }
          }, 1000 * 60 * 5);

          // Handle updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New content is available; prompt user via toast.');
                    setShowPwaUpdateToast(true);
                  } else {
                    console.log('[PWA] Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => console.error('Service Worker registration failed on load:', err));
    }

    // Intercept external links inside standalone PWA to prevent flickering and white screen in WebKit in-app browser
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        try {
          if (!anchor.href.startsWith('http://') && !anchor.href.startsWith('https://')) {
            return; // Allow mailto:, tel:, etc. to bypass URL checking and use default OS handling
          }
          const url = new URL(anchor.href, window.location.origin);
          const isExternal = url.origin !== window.location.origin;
          const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

          if (isStandalone && isExternal) {
            e.preventDefault();
            window.open(anchor.href, '_blank');
          }
        } catch (err) {
          // Ignore malformed URLs
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    // Clear native PWA app badge when app is launched or becomes active
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }

    // iOS Web AudioContext auto-unlock on first user interaction via SharedAudioEngine singleton
    SharedAudioEngine.initAutoUnlock();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) return;

      const dismissedTime = localStorage.getItem('groovelab_install_prompt_dismissed');
      const dismissedRecent = dismissedTime && (Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000);
      
      if (!dismissedRecent) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, [isLocalhost]);

  useEffect(() => {
    if (typeof window === 'undefined' || !loggedInUserId) return;
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && !isStandalone) {
      const dismissedTime = localStorage.getItem('groovelab_install_prompt_dismissed');
      const dismissedRecent = dismissedTime && (Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000);
      if (!dismissedRecent) {
        setShowInstallBanner(true);
      }
    }

    // Auto-subscribe or sync web push notifications in the background if permission is already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        subscribeUserToPush(loggedInUserId)
          .then((success) => console.log('PWA Push auto-subscribe sync outcome:', success))
          .catch((err) => console.error('Failed to sync push subscription:', err));
      }, 2000);
    }
  }, [loggedInUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automated Audio Storage Janitor & Client Cache Janitor Background Task
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Always prune stale local client caches on mount to prevent QuotaExceededError
    runClientStorageJanitor().catch(() => {});

    const lastRunStr = localStorage.getItem('groovelab_storage_janitor_last_run');
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (Date.now() - lastRun > twentyFourHoursMs) {
      console.log('[StorageJanitor] Triggering scheduled 24h background audio storage audit...');
      runStorageJanitor('campus-assets').catch(err => {
        console.warn('[StorageJanitor] Background storage audit error:', err);
      });
    }
  }, []);

  return {
    windowWidth,
    setWindowWidth,
    deferredPrompt,
    setDeferredPrompt,
    showInstallBanner,
    setShowInstallBanner,
    showInstallGuide,
    setShowInstallGuide,
    showPwaUpdateToast,
    setShowPwaUpdateToast
  };
}
