import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered successfully with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

export async function subscribeUserToPush(userId: string): Promise<boolean> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) {
      console.warn('Service Worker registration not available.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return false;
    }

    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    };

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe(subscribeOptions);
    }

    // Convert keys to strings
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    const p256dhString = p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : '';
    const authString = auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : '';

    // Save subscription in database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: p256dhString,
        auth: authString
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Failed to save push subscription in database:', error);
      return false;
    }

    // Enable push notifications flags for user
    const { error: userError } = await supabase
      .from('users')
      .update({ push_notifications_enabled: true })
      .eq('id', userId);

    if (userError) {
      console.error('Failed to update users push enabled flag:', userError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in subscribeUserToPush:', err);
    return false;
  }
}

export async function unsubscribeUserFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Unsubscribe from browser PushManager
        await subscription.unsubscribe();

        // Delete from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        if (error) {
          console.error('Failed to delete push subscription from database:', error);
        }
      }
    }

    // Disable push notifications flag in users table
    const { error: userError } = await supabase
      .from('users')
      .update({ push_notifications_enabled: false })
      .eq('id', userId);

    if (userError) {
      console.error('Failed to disable user push flag:', userError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in unsubscribeUserFromPush:', err);
    return false;
  }
}
