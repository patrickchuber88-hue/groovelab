import { useEffect, useRef } from 'react';

export interface UseMessageReadObserverParams {
  containerRef: React.RefObject<HTMLElement | null>;
  messages: any[];
  currentUserId: string;
  onMarkMessagesRead?: (messageIds: string[]) => void | Promise<void>;
  enabled?: boolean;
}

/**
 * 🏛️ useMessageReadObserver
 * 0,1% WhatsApp & Apple Goldstandard Viewport Read Engine.
 * Markiert Nachrichten erst dann autoritativ als gelesen, wenn sie tatsächlich
 * für mindestens 600ms im Sichtbereich (Viewport) des Scroll-Containers verweilen.
 * Verhindert blindes Quittieren und bündelt Leseaufrufe in 300ms Batches.
 */
export function useMessageReadObserver({
  containerRef,
  messages,
  currentUserId,
  onMarkMessagesRead,
  enabled = true
}: UseMessageReadObserverParams) {
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const processedIdsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<any>(null);
  const dwellTimersRef = useRef<Map<string, any>>(new Map());

  // Flush batched read IDs to backend
  const flushPendingReads = () => {
    if (pendingIdsRef.current.size === 0) return;
    const idsToMark = Array.from(pendingIdsRef.current);
    pendingIdsRef.current.clear();

    if (onMarkMessagesRead) {
      onMarkMessagesRead(idsToMark);
    }
  };

  useEffect(() => {
    if (!enabled || !containerRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const msgId = target.getAttribute('data-message-id');
          const isRead = target.getAttribute('data-is-read') === 'true';
          const senderId = target.getAttribute('data-sender-id');

          if (!msgId || isRead || senderId === currentUserId || processedIdsRef.current.has(msgId)) {
            return;
          }

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Start dwell timer (mindestens 600ms echte Wahrnehmungszeit)
            if (!dwellTimersRef.current.has(msgId)) {
              const timer = setTimeout(() => {
                processedIdsRef.current.add(msgId);
                pendingIdsRef.current.add(msgId);
                dwellTimersRef.current.delete(msgId);

                // Debounce flush
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                debounceTimerRef.current = setTimeout(flushPendingReads, 300);
              }, 600);
              dwellTimersRef.current.set(msgId, timer);
            }
          } else {
            // Cancel timer wenn Nachricht vor Ablauf der 600ms weggescrollt wird
            if (dwellTimersRef.current.has(msgId)) {
              clearTimeout(dwellTimersRef.current.get(msgId));
              dwellTimersRef.current.delete(msgId);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5
      }
    );

    // Observe all message nodes within container
    const messageNodes = container.querySelectorAll<HTMLElement>('[data-message-id]');
    messageNodes.forEach((node) => {
      const msgId = node.getAttribute('data-message-id');
      const isRead = node.getAttribute('data-is-read') === 'true';
      const senderId = node.getAttribute('data-sender-id');

      if (msgId && !isRead && senderId !== currentUserId && !processedIdsRef.current.has(msgId)) {
        observer.observe(node);
      }
    });

    return () => {
      observer.disconnect();
      dwellTimersRef.current.forEach((t) => clearTimeout(t));
      dwellTimersRef.current.clear();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messages, currentUserId, enabled, containerRef]);

  return {
    markDirectlyAsProcessed: (id: string) => processedIdsRef.current.add(id)
  };
}

export default useMessageReadObserver;
