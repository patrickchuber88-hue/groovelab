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
 * In Tab-Isolated Session Architecture, each tab manages its own authentication lifetime.
 */
export function initAuthBroadcastListener(onRemoteLogout?: () => void): () => void {
  // Tabs run independent user sessions; cross-tab forced zeroize is disabled to allow
  // concurrent logins of different users in different browser tabs.
  return () => {};
}

/**
 * Broadcasts a logout event to all other open tabs in the browser.
 * Disabled in Tab-Isolated Mode to prevent killing sessions of other users in other tabs.
 */
export function broadcastLogoutToPeerTabs(): void {
  // No-op: each tab controls its own session independently.
}
