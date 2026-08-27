/**
 * Multi-Tab Coordination Service via BroadcastChannel
 * Tier-1 SaaS Enterprise+ Architecture
 * Campus-Groovelab
 * 
 * Coordinates open browser tabs to share Realtime events, local mutations,
 * and online states, reducing duplicate WebSocket connections and server load.
 */

type CoordinatorMessageType = 
  | 'TAB_PING' 
  | 'TAB_PONG' 
  | 'STATE_SYNC' 
  | 'NOTES_CHANGED' 
  | 'SCHEDULE_CHANGED' 
  | 'PRESENCE_SYNC';

interface CoordinatorMessage {
  type: CoordinatorMessageType;
  tabId: string;
  payload?: any;
  timestamp: number;
}

const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID().substring(0, 8) 
  : `tab_${Math.random().toString(36).substring(2, 8)}`;

let channel: BroadcastChannel | null = null;
const listeners = new Set<(msg: CoordinatorMessage) => void>();

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel('campus_groovelab_tab_sync');
    channel.onmessage = (event: MessageEvent<CoordinatorMessage>) => {
      if (!event.data || event.data.tabId === TAB_ID) return;
      listeners.forEach(fn => {
        try {
          fn(event.data);
        } catch (err) {
          console.warn('[TabCoordinator] Listener error:', err);
        }
      });
    };
  } catch (e) {
    console.warn('[TabCoordinator] BroadcastChannel not supported in this environment');
  }
}

export function broadcastTabEvent(type: CoordinatorMessageType, payload?: any): void {
  if (!channel) return;
  try {
    channel.postMessage({
      type,
      tabId: TAB_ID,
      payload,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[TabCoordinator] Failed to broadcast message:', err);
  }
}

export function subscribeToTabEvents(callback: (msg: CoordinatorMessage) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getTabId(): string {
  return TAB_ID;
}
