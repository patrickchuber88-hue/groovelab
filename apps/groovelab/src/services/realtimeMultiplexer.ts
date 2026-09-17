/**
 * Campus-Groovelab Tier-1 Realtime WebSocket Multiplexer
 * 
 * Centralized Realtime channel manager:
 * - Eliminates channel proliferation across 22+ components
 * - Implements strict reference-counted channel lifecycle
 * - Automatically cleans up unused channels to prevent Supabase connection exhaustion
 * - Deduplicates broadcast and postgres-change event processing
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeCallback = (payload: any) => void;

interface ChannelRecord {
  channel: RealtimeChannel;
  refCount: number;
  subscribers: Set<RealtimeCallback>;
  isSubscribed: boolean;
}

export class RealtimeMultiplexer {
  private static instance: RealtimeMultiplexer | null = null;
  private channels: Map<string, ChannelRecord> = new Map();

  private constructor() {}

  public static getInstance(): RealtimeMultiplexer {
    if (!RealtimeMultiplexer.instance) {
      RealtimeMultiplexer.instance = new RealtimeMultiplexer();
    }
    return RealtimeMultiplexer.instance;
  }

  /**
   * Subscribes to a shared topic channel with automatic ref-counting.
   */
  public subscribe(
    topic: string,
    callback: RealtimeCallback,
    setupChannel?: (channel: RealtimeChannel) => void
  ): () => void {
    let record = this.channels.get(topic);

    if (!record) {
      const channel = supabase.channel(topic);
      record = {
        channel,
        refCount: 0,
        subscribers: new Set(),
        isSubscribed: false
      };
      this.channels.set(topic, record);

      if (setupChannel) {
        setupChannel(channel);
      }

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && record) {
          record.isSubscribed = true;
        }
      });
    }

    record.refCount++;
    record.subscribers.add(callback);

    // Return unsubscription teardown
    return () => {
      const existing = this.channels.get(topic);
      if (!existing) return;

      existing.subscribers.delete(callback);
      existing.refCount--;

      if (existing.refCount <= 0) {
        try {
          supabase.removeChannel(existing.channel);
        } catch (err) {
          console.warn(`[RealtimeMultiplexer] Error removing channel ${topic}:`, err);
        }
        this.channels.delete(topic);
      }
    };
  }

  /**
   * Shared school presence channel subscription.
   */
  public subscribeSchoolPresence(
    schoolId: string,
    onPresenceSync: (state: any) => void
  ): () => void {
    const topic = `school_presence_${schoolId}`;
    return this.subscribe(
      topic,
      onPresenceSync,
      (channel) => {
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const rec = this.channels.get(topic);
          rec?.subscribers.forEach(cb => cb(state));
        });
      }
    );
  }

  /**
   * Broadcasts an event to all subscribers of a shared topic.
   */
  public broadcastToTopic(topic: string, event: string, payload: any): void {
    const record = this.channels.get(topic);
    if (record && record.isSubscribed) {
      record.channel.send({
        type: 'broadcast',
        event,
        payload
      });
    }
  }

  /**
   * Teardown all active channels (e.g. on logout).
   */
  public teardownAll(): void {
    this.channels.forEach((record) => {
      try {
        supabase.removeChannel(record.channel);
      } catch (_) {}
    });
    this.channels.clear();
  }
}

export const realtimeMultiplexer = RealtimeMultiplexer.getInstance();
