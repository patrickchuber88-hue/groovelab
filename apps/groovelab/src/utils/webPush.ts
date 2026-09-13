import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BAq9l0chUV4DOE58mzN74drPzhGrhE4xSmRcRCc4BRPyDACTIS3qUU-uCce237nw7Lq6CFgGqsIerlvbNAZJhA4'; // Fallback public key

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

function isDevelopmentHost(): boolean {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isDevelopmentHost()) {
    return null;
  }
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const regPromise = navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      const registration = await withTimeout(regPromise, 3500, null);
      if (registration) {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      }
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

export async function subscribeUserToPush(userId: string): Promise<boolean> {
  if (isDevelopmentHost()) {
    return false;
  }
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this environment.');
      return false;
    }

    // 1. Request notification permission with Safari compatibility and timeout (3.5s)
    let permission = Notification.permission;
    if (permission !== 'granted') {
      const permPromise = new Promise<NotificationPermission>((resolve) => {
        try {
          const res = Notification.requestPermission((p) => resolve(p));
          if (res && typeof (res as any).then === 'function') {
            (res as Promise<NotificationPermission>).then(resolve).catch(() => resolve('denied'));
          }
        } catch (e) {
          resolve('denied');
        }
      });
      permission = await withTimeout(permPromise, 3500, Notification.permission);
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return false;
    }

    // 2. Service Worker registration with timeout (3.5s)
    const registration = await registerServiceWorker();
    if (!registration || !('pushManager' in registration)) {
      console.warn('Service Worker or PushManager not available.');
      return false;
    }

    // 3. Push subscription with timeout (3.5s)
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    };

    const subscriptionPromise = (async () => {
      try {
        let sub = await registration.pushManager.getSubscription();
        if (!sub) {
          sub = await registration.pushManager.subscribe(subscribeOptions);
        }
        return sub;
      } catch (e) {
        console.warn('pushManager.subscribe failed:', e);
        return null;
      }
    })();

    const subscription = await withTimeout(subscriptionPromise, 3500, null);
    if (!subscription) {
      console.warn('Could not establish push subscription.');
      return false;
    }

    // 4. Convert keys to strings
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    const p256dhString = p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : '';
    const authString = auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : '';

    // 5. Save subscription in database (timeout 3.5s)
    const dbSavePromise = supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: p256dhString,
        auth: authString
      }, {
        onConflict: 'endpoint'
      });

    await withTimeout(dbSavePromise, 3500, null as any);

    // 6. Enable push notifications flag for user (timeout 3.5s)
    const userUpdatePromise = supabase
      .from('users')
      .update({ push_notifications_enabled: true })
      .eq('id', userId);

    await withTimeout(userUpdatePromise, 3500, null as any);

    return true;
  } catch (err) {
    console.error('Error in subscribeUserToPush:', err);
    return false;
  }
}

export async function unsubscribeUserFromPush(userId: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const regPromise = navigator.serviceWorker.getRegistration();
      const registration = await withTimeout(regPromise, 2500, null);
      if (registration && 'pushManager' in registration) {
        const subPromise = registration.pushManager.getSubscription();
        const subscription = await withTimeout(subPromise, 2500, null);
        if (subscription) {
          await withTimeout(subscription.unsubscribe(), 2500, false);
          await withTimeout(
            supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint),
            2500,
            null as any
          );
        }
      }
    }

    await withTimeout(
      supabase.from('users').update({ push_notifications_enabled: false }).eq('id', userId),
      2500,
      null as any
    );

    return true;
  } catch (err) {
    console.error('Error in unsubscribeUserFromPush:', err);
    return false;
  }
}
