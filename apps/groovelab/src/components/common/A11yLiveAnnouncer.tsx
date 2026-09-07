import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface A11yContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const A11yContext = createContext<A11yContextType>({
  announce: () => {}
});

/**
 * Utility function to trigger screenreader announcements from anywhere in the app
 * without needing React context injection.
 */
export function announceA11y(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('a11y-announce', {
        detail: { message, priority }
      })
    );
  }
}

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!message) return;
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  // Listen to global window events for cross-tree decoupling
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; priority?: 'polite' | 'assertive' }>;
      if (customEvent.detail?.message) {
        announce(customEvent.detail.message, customEvent.detail.priority || 'polite');
      }
    };

    window.addEventListener('a11y-announce', handleEvent);
    return () => window.removeEventListener('a11y-announce', handleEvent);
  }, [announce]);

  const srOnlyStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
  };

  return (
    <A11yContext.Provider value={{ announce }}>
      {children}
      {/* WCAG 4.1.3 Status Messages (Polite & Assertive Live Regions) */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        style={srOnlyStyle}
      >
        {politeMessage}
      </div>
      <div 
        role="alert" 
        aria-live="assertive" 
        aria-atomic="true" 
        style={srOnlyStyle}
      >
        {assertiveMessage}
      </div>
    </A11yContext.Provider>
  );
};

export const useA11y = () => useContext(A11yContext);
