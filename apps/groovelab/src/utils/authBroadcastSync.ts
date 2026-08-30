/**
 * ==============================================================================
 * CAMPUS-GROOVELAB MULTI-TAB AUTH BROADCAST SYNCHRONIZER
 * Standard: OWASP ASVS Level 3 Multi-Session & Tab State Synchronization
 * ==============================================================================
 */

import { executeSessionZeroize } from './sessionZeroize';

const AUTH_CHANNEL_NAME = 'campus_groovelab_auth_channel';

let broadcastChannel: BroadcastChannel | null = null;

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
    if (event.data?.type === 'CG_AUTH_REMOTE_LOGOUT') {
      console.info('[AuthBroadcastSync] Received remote logout signal from peer tab. Zeroizing session...');
      if (onRemoteLogout) {
        onRemoteLogout();
      } else {
        executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleLogoutMessage);
  }

  // Storage event fallback for older browsers or isolated webviews
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'cg_broadcast_logout_trigger' && e.newValue) {
      console.info('[AuthBroadcastSync] Storage trigger detected logout event from peer tab.');
      if (onRemoteLogout) {
        onRemoteLogout();
      } else {
        executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
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
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CG_AUTH_REMOTE_LOGOUT', timestamp: Date.now() });
    }
    // Storage fallback trigger
    localStorage.setItem('cg_broadcast_logout_trigger', String(Date.now()));
  } catch (err) {
    console.warn('[AuthBroadcastSync] Failed to broadcast logout signal:', err);
  }
}
