/**
 * ==============================================================================
 * CAMPUS-GROOVELAB MULTI-TAB AUTH BROADCAST SYNCHRONIZER
 * Standard: OWASP ASVS Level 3 Multi-Session & Tab State Synchronization
 * ==============================================================================
 */

import { executeSessionZeroize } from './sessionZeroize';

const AUTH_CHANNEL_NAME = 'campus_groovelab_auth_channel';

// Unique identifier for the current browser tab to filter out echo broadcasts
const CURRENT_TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

let broadcastChannel: BroadcastChannel | null = null;
const processedNonces = new Set<string>();
let lastProcessedTime = 0;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  } catch (err) {
    console.warn('[AuthBroadcastSync] BroadcastChannel not supported in this environment:', err);
  }
}

/**
 * Initializes the multi-tab auth event listener.
 */
export function initAuthBroadcastListener(onRemoteLogout?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleLogoutMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== 'CG_AUTH_REMOTE_LOGOUT') return;

    // 1. Ignore broadcasts originating from the current tab (echo prevention)
    if (data.senderId === CURRENT_TAB_ID) return;

    // 2. Deduplicate messages via unique nonce or rapid burst window (3 seconds)
    const now = Date.now();
    if (data.nonce && processedNonces.has(data.nonce)) return;
    if (now - lastProcessedTime < 2000) return;

    if (data.nonce) {
      processedNonces.add(data.nonce);
      // Keep set bounded
      if (processedNonces.size > 100) {
        const first = processedNonces.values().next().value;
        if (first) processedNonces.delete(first);
      }
    }
    lastProcessedTime = now;

    console.info('[AuthBroadcastSync] Received remote logout signal from peer tab. Zeroizing session without re-broadcasting...');

    // 3. Zeroize without re-broadcasting to prevent infinite ping-pong loops
    executeSessionZeroize({ preserveDeviceKey: true, broadcast: false });

    if (onRemoteLogout) {
      try {
        onRemoteLogout();
      } catch (e) {
        console.warn('[AuthBroadcastSync] onRemoteLogout callback error:', e);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('campus_auth_remote_logout'));
    } catch (_) {}
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleLogoutMessage);
  }

  // Storage event fallback for older browsers or isolated webviews
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'cg_broadcast_logout_trigger' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        if (payload.senderId === CURRENT_TAB_ID) return;

        const now = Date.now();
        if (payload.nonce && processedNonces.has(payload.nonce)) return;
        if (now - lastProcessedTime < 2000) return;

        if (payload.nonce) processedNonces.add(payload.nonce);
        lastProcessedTime = now;

        console.info('[AuthBroadcastSync] Storage trigger detected remote logout from peer tab.');
        executeSessionZeroize({ preserveDeviceKey: true, broadcast: false });

        if (onRemoteLogout) {
          onRemoteLogout();
        }

        window.dispatchEvent(new CustomEvent('campus_auth_remote_logout'));
      } catch (_) {
        // Fallback for non-JSON timestamp triggers
        const now = Date.now();
        if (now - lastProcessedTime > 2000) {
          lastProcessedTime = now;
          executeSessionZeroize({ preserveDeviceKey: true, broadcast: false });
          if (onRemoteLogout) onRemoteLogout();
        }
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleLogoutMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Broadcasts a logout event to all other open tabs in the browser.
 */
export function broadcastLogoutToPeerTabs(): void {
  if (typeof window === 'undefined') return;

  try {
    const nonce = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload = {
      type: 'CG_AUTH_REMOTE_LOGOUT',
      senderId: CURRENT_TAB_ID,
      nonce,
      timestamp: Date.now()
    };

    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
    // Storage fallback trigger
    localStorage.setItem('cg_broadcast_logout_trigger', JSON.stringify(payload));
  } catch (err) {
    console.warn('[AuthBroadcastSync] Failed to broadcast logout signal:', err);
  }
}
