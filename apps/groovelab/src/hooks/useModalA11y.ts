import { useEffect, useRef, useCallback } from 'react';

/**
 * 0,1% Enterprise Goldstandard WAI-ARIA Modal Accessibility Hook
 * 
 * Invariants:
 * 1. Global Escape Listener: Closes the active top modal with preventDefault & stopPropagation.
 * 2. Focus Trap: Traps Tab / Shift+Tab cycling within focusable elements inside the modal.
 * 3. Initial Focus: Automatically focuses initialFocusRef, autofocus element, or the first focusable element.
 * 4. Focus Restoration: Safely restores focus to the previously active element upon closing or unmounting.
 * 5. Modal Stack Management: Accurately stacks nested modals so only the topmost modal traps focus and closes on Escape.
 * 6. Memory-Safe & Leak-Proof: Clean event listener registration, timeout cancellation, and JSDOM resilience.
 */

export interface UseModalA11yOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  '[role="button"]:not([tabindex="-1"])',
  '[role="slider"]:not([tabindex="-1"])'
].join(', ');

// Shared modal stack to handle multi-layer & nested modals cleanly
let modalIdCounter = 0;
const activeModalStack: string[] = [];

function isElementVisible(el: HTMLElement): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return false;
  // Browser layout check
  if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
    return window.getComputedStyle(el).visibility !== 'hidden';
  }
  // Headless / JSDOM / Pre-layout fallback
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => !el.hasAttribute('disabled') && isElementVisible(el));
}

export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  optionsOrIsOpen: UseModalA11yOptions | boolean,
  onCloseCallback?: () => void
): React.RefObject<T> {
  const options: UseModalA11yOptions = typeof optionsOrIsOpen === 'boolean'
    ? { isOpen: optionsOrIsOpen, onClose: onCloseCallback }
    : optionsOrIsOpen;

  const {
    isOpen,
    onClose,
    initialFocusRef,
    closeOnEscape = true,
    restoreFocus = true,
    trapFocus = true
  } = options;

  const modalRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef<string>('');
  if (!modalIdRef.current) {
    modalIdRef.current = `modal-a11y-${++modalIdCounter}`;
  }

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Manage modal stack registration
  useEffect(() => {
    const id = modalIdRef.current;
    if (isOpen) {
      if (!activeModalStack.includes(id)) {
        activeModalStack.push(id);
      }
    } else {
      const idx = activeModalStack.indexOf(id);
      if (idx !== -1) {
        activeModalStack.splice(idx, 1);
      }
    }

    return () => {
      const idx = activeModalStack.indexOf(id);
      if (idx !== -1) {
        activeModalStack.splice(idx, 1);
      }
    };
  }, [isOpen]);

  // Handle focus retention and initial focus
  useEffect(() => {
    if (!isOpen) {
      if (restoreFocus && previousActiveElement.current) {
        const elToFocus = previousActiveElement.current;
        previousActiveElement.current = null;
        // Restore focus on next tick so DOM updates finish
        const timer = setTimeout(() => {
          if (typeof elToFocus.focus === 'function' && document.body.contains(elToFocus)) {
            elToFocus.focus();
          }
        }, 16);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Save currently focused element before opening, ensuring we don't overwrite with elements inside modal
    if (document.activeElement instanceof HTMLElement) {
      if (!previousActiveElement.current && (!modalRef.current || !modalRef.current.contains(document.activeElement))) {
        previousActiveElement.current = document.activeElement;
      }
    }

    // Initial focus into modal
    const focusTimeout = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      if (modalRef.current) {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length > 0) {
          const autoFocusEl = focusable.find((el) => el.hasAttribute('autofocus'));
          (autoFocusEl || focusable[0]).focus();
        } else {
          // If modal container has no tabIndex, make it focusable temporarily
          if (!modalRef.current.hasAttribute('tabindex')) {
            modalRef.current.setAttribute('tabindex', '-1');
          }
          modalRef.current.focus();
        }
      }
    }, 16);

    return () => clearTimeout(focusTimeout);
  }, [isOpen, initialFocusRef, restoreFocus]);

  // Keydown listener for Escape and Tab cycling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    // Only the topmost active modal handles keys
    const isTopModal = activeModalStack[activeModalStack.length - 1] === modalIdRef.current;
    if (!isTopModal) return;

    // 1. Escape key handling
    if (e.key === 'Escape' && closeOnEscape && onCloseRef.current) {
      e.preventDefault();
      e.stopPropagation();
      onCloseRef.current();
      return;
    }

    // 2. Tab cycling focus trap
    if (e.key === 'Tab' && trapFocus && modalRef.current) {
      const focusables = getFocusableElements(modalRef.current);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      const isInside = Boolean(activeEl && modalRef.current.contains(activeEl));
      const isFocusableElement = Boolean(activeEl && focusables.includes(activeEl as HTMLElement));

      if (e.shiftKey) {
        // Shift + Tab: if outside, on container, non-focusable or on first element -> cycle to last
        if (!isInside || !isFocusableElement || activeEl === firstElement || activeEl === modalRef.current) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if outside, on container, non-focusable or on last element -> cycle to first
        if (!isInside || !isFocusableElement || activeEl === lastElement || activeEl === modalRef.current) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [isOpen, closeOnEscape, trapFocus]);

  useEffect(() => {
    if (!isOpen) return;

    // Capture phase listener to ensure modal handles keystrokes before external page handlers
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, handleKeyDown]);

  // Cleanup on unmount if modal was open
  useEffect(() => {
    return () => {
      if (restoreFocus && previousActiveElement.current) {
        const el = previousActiveElement.current;
        previousActiveElement.current = null;
        if (typeof el.focus === 'function' && document.body.contains(el)) {
          setTimeout(() => {
            if (typeof el.focus === 'function' && document.body.contains(el)) {
              el.focus();
            }
          }, 16);
        }
      }
    };
  }, [restoreFocus]);

  return modalRef;
}
