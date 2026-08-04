// Safe Memory-Leak Free Event Listener Hook for Campus-Groovelab
// Ensures automatic listener unbinding upon component unmount

import { useEffect, useRef } from 'react';

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: HTMLElement | Window | Document = typeof window !== 'undefined' ? window : (null as any)
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element || !element.addEventListener) return;

    const eventListener: EventListener = (event) => savedHandler.current(event as any);
    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}
