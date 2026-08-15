// Singleton Realtime Connection Manager for Campus-Groovelab
// Prevents duplicate WebSocket connection bloat across components and tabs
// Supports multi-tenant school-scoped filtering for optimal enterprise isolation

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface RealtimeSubscriptionOptions {
  schoolId?: string | number;
  filter?: string; // Optional Postgres change filter e.g. "school_id=eq.123"
}

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<(payload: any) => void>> = new Map();

  /**
   * Subscribes to a Supabase Postgres Changes topic with shared WebSocket reuse and optional multi-tenant filtering.
   */
  public subscribe(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: any) => void,
    options?: RealtimeSubscriptionOptions
  ): () => void {
    const filter = options?.filter || (options?.schoolId ? `school_id=eq.${options.schoolId}` : undefined);
    const topic = filter ? `public:${table}:${filter}` : `public:${table}`;
    const listenerKey = `${topic}:${event}`;

    if (!this.listeners.has(listenerKey)) {
      this.listeners.set(listenerKey, new Set());
    }
    this.listeners.get(listenerKey)!.add(callback);

    // Initialize underlying channel if not already open
    if (!this.channels.has(topic)) {
      const channel = supabase.channel(topic);
      const postgresChangesConfig: any = {
        event: '*',
        schema: 'public',
        table
      };
      if (filter) {
        postgresChangesConfig.filter = filter;
      }

      channel
        .on(
          'postgres_changes' as any,
          postgresChangesConfig,
          (payload: any) => {
            const eventKey = `${topic}:${payload.eventType}`;
            const wildcardKey = `${topic}:*`;

            this.listeners.get(eventKey)?.forEach((cb) => cb(payload));
            this.listeners.get(wildcardKey)?.forEach((cb) => cb(payload));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[RealtimeManager] Subscribed to shared channel: ${topic}`);
          }
        });

      this.channels.set(topic, channel);
    }

    // Return cleanup unsubscribe function
    return () => {
      const callbacks = this.listeners.get(listenerKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(listenerKey);
        }
      }

      // If no remaining listeners for this topic, unsubscribe and clean up channel
      const activeListenersForTopic = Array.from(this.listeners.keys()).filter((k) =>
        k.startsWith(`${topic}:`)
      );
      if (activeListenersForTopic.length === 0) {
        const channel = this.channels.get(topic);
        if (channel) {
          channel.unsubscribe();
          this.channels.delete(topic);
          console.log(`[RealtimeManager] Unsubscribed and closed channel: ${topic}`);
        }
      }
    };
  }
}

export const realtimeManager = new RealtimeManager();

