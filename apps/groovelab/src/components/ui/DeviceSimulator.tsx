import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  X,
  TouchpadIcon,
  Wifi,
  Lock,
  RefreshCw,
  Globe,
  Sun,
  Moon,
  Layers,
  ZoomIn
} from 'lucide-react';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';

export interface DevicePreset {
  id: string;
  name: string;
  shortName: string;
  category: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  hasDynamicIsland?: boolean;
  hasNotch?: boolean;
  hasPunchHole?: boolean;
  hasHomeBar?: boolean;
  hasHomeButton?: boolean;
  borderRadius?: string;
  safeTop?: number;
  safeBottom?: number;
  dpr?: number;
}

const PRESETS: DevicePreset[] = [
  {
    id: 'iphone16pro',
    name: 'iPhone 16 Pro (393×852)',
    shortName: 'iPhone 16 Pro',
    category: 'mobile',
    width: 393,
    height: 852,
    icon: Smartphone,
    hasDynamicIsland: true,
    hasHomeBar: true,
    borderRadius: '48px',
    safeTop: 59,
    safeBottom: 34,
    dpr: 3
  },
  {
    id: 'iphone14',
    name: 'iPhone 14 (390×844)',
    shortName: 'iPhone 14',
    category: 'mobile',
    width: 390,
    height: 844,
    icon: Smartphone,
    hasNotch: true,
    hasHomeBar: true,
    borderRadius: '44px',
    safeTop: 47,
    safeBottom: 34,
    dpr: 3
  },
  {
    id: 'pixel8',
    name: 'Pixel 8 / Android (412×892)',
    shortName: 'Pixel 8',
    category: 'mobile',
    width: 412,
    height: 892,
    icon: Smartphone,
    hasNotch: false,
    hasPunchHole: true,
    hasHomeBar: true,
    borderRadius: '36px',
    safeTop: 36,
    safeBottom: 24,
    dpr: 2.6
  },
  {
    id: 'iphone_se',
    name: 'iPhone SE (375×667)',
    shortName: 'iPhone SE',
    category: 'mobile',
    width: 375,
    height: 667,
    icon: Smartphone,
    hasNotch: false,
    hasHomeBar: false,
    hasHomeButton: true,
    borderRadius: '24px',
    safeTop: 20,
    safeBottom: 0,
    dpr: 2
  },
  {
    id: 'ipad_air',
    name: 'iPad Air 11" (820×1180)',
    shortName: 'iPad Air',
    category: 'tablet',
    width: 820,
    height: 1180,
    icon: Tablet,
    hasNotch: false,
    hasHomeBar: true,
    borderRadius: '26px',
    safeTop: 24,
    safeBottom: 20,
    dpr: 2
  },
  {
    id: 'ipad_pro_12',
    name: 'iPad Pro 12.9" (1024×1366)',
    shortName: 'iPad Pro',
    category: 'tablet',
    width: 1024,
    height: 1366,
    icon: Tablet,
    hasNotch: false,
    hasHomeBar: true,
    borderRadius: '28px',
    safeTop: 24,
    safeBottom: 20,
    dpr: 2
  },
  {
    id: 'desktop',
    name: 'Desktop (Full Width)',
    shortName: 'Desktop',
    category: 'desktop',
    width: 0, // 0 = 100% full width
    height: 0,
    icon: Monitor,
    hasNotch: false,
    hasHomeBar: false,
    borderRadius: '0px',
    safeTop: 0,
    safeBottom: 0,
    dpr: 1
  }
];

interface StatusBarProps {
  preset: DevicePreset;
  time: string;
  isDarkTheme: boolean;
  isRotated: boolean;
}

const NativeStatusBar: React.FC<StatusBarProps> = ({ preset, time, isDarkTheme, isRotated }) => {
  if (isRotated || preset.category === 'desktop') return null;

  const textColor = isDarkTheme ? '#ffffff' : '#0f172a';
  const subColor = isDarkTheme ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.75)';
  const barHeight = preset.safeTop || 44;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${barHeight}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        zIndex: 9999,
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      {/* Left: Real-time clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Roboto, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: textColor,
            letterSpacing: '-0.2px'
          }}
        >
          {time}
        </span>
      </div>

      {/* Center: Apple Dynamic Island */}
      {preset.hasDynamicIsland && (
        <div
          style={{
            position: 'absolute',
            top: '11px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '124px',
            height: '35px',
            background: '#000000',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        >
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#0a0f1d', border: '1px solid #1e293b' }} />
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#0e172a' }} />
        </div>
      )}

      {/* Center: Classic Notch */}
      {preset.hasNotch && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120px',
            height: '28px',
            background: '#000000',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0a0f1d' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a' }} />
        </div>
      )}

      {/* Center: Android Punch Hole */}
      {preset.hasPunchHole && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#000000',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Right: Cellular, 5G, Wi-Fi, Battery */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: textColor }}>
        {/* Cellular Signal (4 bars) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5px', height: '11px', marginRight: '2px' }}>
          <div style={{ width: '3px', height: '3px', background: textColor, borderRadius: '0.5px' }} />
          <div style={{ width: '3px', height: '5px', background: textColor, borderRadius: '0.5px' }} />
          <div style={{ width: '3px', height: '8px', background: textColor, borderRadius: '0.5px' }} />
          <div style={{ width: '3px', height: '11px', background: textColor, borderRadius: '0.5px' }} />
        </div>

        {preset.category === 'mobile' && (
          <span style={{ fontSize: '10px', fontWeight: 800, color: subColor, marginRight: '1px' }}>5G</span>
        )}

        <Wifi size={14} strokeWidth={2.5} style={{ color: textColor }} />

        {/* Battery Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px', marginLeft: '2px' }}>
          <div
            style={{
              width: '22px',
              height: '11px',
              borderRadius: '3.5px',
              border: `1.5px solid ${textColor}`,
              padding: '1px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: textColor,
                borderRadius: '1.5px'
              }}
            />
          </div>
          <div
            style={{
              width: '1.5px',
              height: '4px',
              background: textColor,
              borderRadius: '0 1px 1px 0'
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface BrowserBarProps {
  currentPath: string;
  onRefresh?: () => void;
}

const MobileBrowserBar: React.FC<BrowserBarProps> = ({ currentPath, onRefresh }) => {
  return (
    <div
      style={{
        height: '46px',
        background: 'rgba(248, 250, 252, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        boxSizing: 'border-box',
        zIndex: 9998,
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          height: '30px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid rgba(203, 213, 225, 0.8)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <Lock size={11} color="#10b981" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
          >
            campus-groovelab.com{currentPath}
          </span>
        </div>

        <button
          onClick={onRefresh}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#64748b',
            flexShrink: 0
          }}
          title="Seite neu laden"
          aria-label="Seite im Simulator neu laden"
        >
          <RefreshCw size={11} />
        </button>
      </div>
    </div>
  );
};

interface DeviceSimulatorProps {
  children: React.ReactNode;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({ children }) => {
  // 1. RECURSION GUARD: If running inside the simulator guest iframe, transparently render children with zero overhead
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (isInsideIframe) {
    return <>{children}</>;
  }

  const isDev = isDevEnvironment();

  const [isActive, setIsActive] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !isDev) return false;
    return localStorage.getItem('groovelab_dev_simulator_active') === 'true';
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'iphone16pro';
    return localStorage.getItem('groovelab_dev_device_preset') || 'iphone16pro';
  });

  const [simulationMode, setSimulationMode] = useState<'browser' | 'pwa'>(() => {
    if (typeof window === 'undefined') return 'pwa';
    return (localStorage.getItem('groovelab_dev_simulation_mode') as 'browser' | 'pwa') || 'pwa';
  });

  const [renderEngine, setRenderEngine] = useState<'iframe' | 'indom'>(() => {
    if (typeof window === 'undefined') return 'iframe';
    return (localStorage.getItem('groovelab_dev_render_engine') as 'iframe' | 'indom') || 'iframe';
  });

  const [statusBarStyle, setStatusBarStyle] = useState<'auto' | 'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem('groovelab_dev_status_bar_style') as 'auto' | 'light' | 'dark') || 'auto';
  });

  const [zoomLevel, setZoomLevel] = useState<'auto' | number>(() => {
    if (typeof window === 'undefined') return 'auto';
    const saved = localStorage.getItem('groovelab_dev_zoom_level');
    if (saved === 'auto') return 'auto';
    const n = parseFloat(saved || '');
    return isNaN(n) ? 'auto' : n;
  });

  const [isRotated, setIsRotated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('groovelab_dev_is_rotated') === 'true';
  });

  const [currentTime, setCurrentTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname + window.location.search;
  });

  const [showTouchCursor, setShowTouchCursor] = useState(true);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [windowDimensions, setWindowDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 900
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track window resize for Auto-Fit zoom calculations
  useEffect(() => {
    if (!isDev) return;
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDev]);

  // Real-time live status bar clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  // Persist developer preferences
  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_simulator_active', String(isActive));
  }, [isActive, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_device_preset', selectedPresetId);
    window.dispatchEvent(new CustomEvent('groovelab_orientation_changed'));
  }, [selectedPresetId, isRotated, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_simulation_mode', simulationMode);
  }, [simulationMode, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_render_engine', renderEngine);
  }, [renderEngine, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_status_bar_style', statusBarStyle);
  }, [statusBarStyle, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_zoom_level', String(zoomLevel));
  }, [zoomLevel, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_is_rotated', String(isRotated));
  }, [isRotated, isDev]);

  const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
  const frameWidth = isRotated ? (currentPreset.height || 0) : (currentPreset.width || 0);
  const frameHeight = isRotated ? (currentPreset.width || 0) : (currentPreset.height || 0);
  const isDesktop = currentPreset.category === 'desktop' || frameWidth === 0;
  const isPwa = simulationMode === 'pwa';

  // Iframe Synchronizer: Injects CSS Safe-Area Variables & PWA standalone flag directly into guest document
  const syncIframeDocument = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return;

      const doc = iframe.contentDocument;
      const root = doc.documentElement;

      // 1. Sync current pathname with address bar
      try {
        const loc = iframe.contentWindow.location;
        if (loc && loc.pathname) {
          setCurrentPath(loc.pathname + loc.search + loc.hash);
        }
      } catch {}

      // 2. Inject Safe-Area CSS variables
      const sat = isPwa && !isRotated ? `${currentPreset.safeTop || 47}px` : '0px';
      const sab = currentPreset.hasHomeBar ? `${currentPreset.safeBottom || 34}px` : '0px';
      root.style.setProperty('--sat', sat);
      root.style.setProperty('--sab', sab);
      root.style.setProperty('--safe-area-inset-top', sat);
      root.style.setProperty('--safe-area-inset-bottom', sab);
      root.style.setProperty('--safe-top', sat);
      root.style.setProperty('--safe-bottom', sab);

      // 2b. Inject Simulator Viewport Classes into Guest Document
      const viewportCategoryClass = `sim-viewport-${currentPreset.category}`;
      const viewportOrientationClass = frameWidth > frameHeight ? 'sim-viewport-landscape' : 'sim-viewport-portrait';
      const viewportPwaClass = isPwa ? 'sim-viewport-pwa' : 'sim-viewport-browser';
      [root, doc.body].forEach(el => {
        if (!el) return;
        Array.from(el.classList).forEach(cls => {
          if (cls.startsWith('sim-viewport-') || cls === 'pwa-standalone-mode') {
            el.classList.remove(cls);
          }
        });
        el.classList.add(viewportCategoryClass, viewportOrientationClass, viewportPwaClass);
        if (isPwa) el.classList.add('pwa-standalone-mode');
      });

      // 2c. 🏛️ 0,1% Goldstandard: PWA Scrollbar Suppression in Guest Document
      let simScrollStyle = doc.getElementById('sim-pwa-scrollbar-suppression') as HTMLStyleElement | null;
      if (isPwa) {
        if (!simScrollStyle) {
          simScrollStyle = doc.createElement('style');
          simScrollStyle.id = 'sim-pwa-scrollbar-suppression';
          doc.head.appendChild(simScrollStyle);
        }
        simScrollStyle.textContent = `
          * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
          *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        `;
      } else if (simScrollStyle) {
        simScrollStyle.remove();
      }

      // 3. Inject PWA Standalone flag into iframe window
      try {
        Object.defineProperty(iframe.contentWindow.navigator, 'standalone', {
          value: isPwa,
          configurable: true,
          writable: true
        });
      } catch {
        (iframe.contentWindow.navigator as unknown as { standalone: boolean }).standalone = isPwa;
      }

      // 4. Inject matchMedia override for (display-mode: standalone)
      const originalMatchMedia = iframe.contentWindow.matchMedia;
      iframe.contentWindow.matchMedia = function (query: string): MediaQueryList {
        if (typeof query === 'string' && query.includes('display-mode: standalone')) {
          const mql = originalMatchMedia ? originalMatchMedia.call(iframe.contentWindow, query) : {
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          };
          return {
            ...mql,
            matches: isPwa,
            media: query
          } as unknown as MediaQueryList;
        }
        return originalMatchMedia ? originalMatchMedia.call(iframe.contentWindow, query) : ({} as unknown as MediaQueryList);
      };

      // 5. Dispatch native events in guest iframe
      iframe.contentWindow.dispatchEvent(new Event('resize'));
      iframe.contentWindow.dispatchEvent(new CustomEvent('groovelab_pwa_mode_changed', { detail: { isPwa } }));

      // 6. Navigation listeners in iframe
      iframe.contentWindow.addEventListener('popstate', () => {
        try {
          if (iframe.contentWindow?.location) {
            setCurrentPath(iframe.contentWindow.location.pathname + iframe.contentWindow.location.search);
          }
        } catch {}
      });
      iframe.contentWindow.addEventListener('hashchange', () => {
        try {
          if (iframe.contentWindow?.location) {
            setCurrentPath(iframe.contentWindow.location.pathname + iframe.contentWindow.location.search);
          }
        } catch {}
      });
    } catch {
      // Graceful fallback if same-origin is delayed during hot-reload
    }
  }, [currentPreset, isPwa, isRotated]);

  // Re-sync iframe when preset, orientation or PWA mode changes
  useEffect(() => {
    if (renderEngine === 'iframe' && isActive) {
      syncIframeDocument();
    }
  }, [renderEngine, isActive, syncIframeDocument]);

  // In-DOM Mode Fallback Monkey-Patching for Root Window
  useEffect(() => {
    if (!isDev || !isActive || renderEngine !== 'indom') return;

    const originalMatchMedia = window.matchMedia;
    let originalNavigatorStandalone: unknown;
    try {
      originalNavigatorStandalone = (window.navigator as unknown as { standalone?: unknown }).standalone;
    } catch {
      // Ignore
    }

    try {
      Object.defineProperty(window.navigator, 'standalone', {
        value: isPwa,
        configurable: true,
        writable: true
      });
    } catch {
      (window.navigator as unknown as { standalone: boolean }).standalone = isPwa;
    }

    window.matchMedia = function (query: string): MediaQueryList {
      if (typeof query === 'string' && query.includes('display-mode: standalone')) {
        const mql = originalMatchMedia ? originalMatchMedia.call(window, query) : {
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        };
        return {
          ...mql,
          matches: isPwa,
          media: query
        } as unknown as MediaQueryList;
      }
      return originalMatchMedia ? originalMatchMedia.call(window, query) : ({} as unknown as MediaQueryList);
    };

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new CustomEvent('groovelab_pwa_mode_changed', { detail: { isPwa } }));

    return () => {
      window.matchMedia = originalMatchMedia;
      try {
        Object.defineProperty(window.navigator, 'standalone', {
          value: originalNavigatorStandalone,
          configurable: true,
          writable: true
        });
      } catch {
        (window.navigator as unknown as { standalone: unknown }).standalone = originalNavigatorStandalone;
      }
      window.dispatchEvent(new Event('resize'));
    };
  }, [isDev, isActive, simulationMode, renderEngine, isPwa]);

  // Global Keyboard Shortcuts (Shift + D: Toggle, Shift + P: PWA/Browser, Shift + R: Rotate)
  useEffect(() => {
    if (!isDev) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isContentEditable = (e.target as HTMLElement)?.isContentEditable;
      const role = (e.target as HTMLElement)?.getAttribute('role');

      // Fail-safe protection: Never intercept shortcuts when typing in inputs or text fields
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        isContentEditable ||
        role === 'textbox'
      ) {
        return;
      }

      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsActive(prev => !prev);
      } else if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setSimulationMode(prev => (prev === 'pwa' ? 'browser' : 'pwa'));
      } else if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        setIsRotated(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDev]);

  // In production mode, render children transparently with zero overhead
  if (!isDev) {
    return <>{children}</>;
  }

  // Calculate dynamic matrix zoom scale
  const computeEffectiveScale = (): number => {
    if (isDesktop) return 1;
    if (typeof zoomLevel === 'number') return zoomLevel;

    // Auto-Fit mode: adapt scale to available viewport dimensions
    const maxAvailableHeight = windowDimensions.height - 120; // 60px dock + margins
    const maxAvailableWidth = windowDimensions.width - 48;

    const scaleY = maxAvailableHeight / (frameHeight + 24);
    const scaleX = maxAvailableWidth / (frameWidth + 24);

    const autoScale = Math.min(1, Math.min(scaleX, scaleY));
    return Math.max(0.35, Math.min(1, autoScale));
  };

  const effectiveScale = computeEffectiveScale();
  const isStatusBarDark = statusBarStyle === 'dark';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showTouchCursor || isDesktop) {
      if (touchPos) setTouchPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTouchPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseLeave = () => {
    setTouchPos(null);
  };

  const handleBrowserRefresh = () => {
    if (renderEngine === 'iframe' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.location.reload();
      } catch {
        window.location.reload();
      }
    } else {
      window.dispatchEvent(new Event('resize'));
    }
  };

  // Inactive mode: render children transparently
  if (!isActive) {
    return <>{children}</>;
  }

  const iframeSrc = typeof window !== 'undefined' ? window.location.href : '/';

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Background Device Stage Canvas */}
      <div
        style={{
          height: isDesktop ? 'auto' : '100vh',
          maxHeight: isDesktop ? 'none' : '100vh',
          width: '100%',
          background: isDesktop ? 'var(--bg-color)' : '#070a11',
          backgroundImage: isDesktop
            ? 'none'
            : 'radial-gradient(circle at 50% 10%, rgba(30, 41, 59, 0.6) 0%, rgba(7, 10, 17, 1) 100%), linear-gradient(0deg, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: isDesktop ? 'flex-start' : 'center',
          paddingTop: isDesktop ? '0px' : '64px',
          paddingBottom: isDesktop ? '0px' : '20px',
          boxSizing: 'border-box',
          overflow: isDesktop ? 'visible' : 'hidden'
        }}
      >
        {/* Top Control Floating Cockpit Dock */}
        <div
          style={{
            position: 'fixed',
            top: '12px',
            zIndex: 999990,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '100px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '96vw',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {/* Engine Selector: Iframe (100% Breakpoint Truth) vs In-DOM */}
          <button
            onClick={() => setRenderEngine(prev => (prev === 'iframe' ? 'indom' : 'iframe'))}
            style={{
              padding: '4px 10px',
              borderRadius: '100px',
              border: renderEngine === 'iframe' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
              background: renderEngine === 'iframe' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: renderEngine === 'iframe' ? '#34d399' : '#94a3b8',
              fontSize: '0.70rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
            title={
              renderEngine === 'iframe'
                ? 'Iframe Engine: 100% native CSS Media Queries & Breakpoints aktiv (Klicken für In-DOM React-Tree)'
                : 'In-DOM Engine: Direktes React-Tree Rendering aktiv (Klicken für 100% Iframe-Fidelity)'
            }
            aria-label="Simulator Rendering Engine umschalten"
          >
            <Layers size={12} />
            <span>{renderEngine === 'iframe' ? '100% Iframe' : 'In-DOM'}</span>
          </button>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Mode Switcher: Browser vs 100% PWA App */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '2px',
              borderRadius: '100px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <button
              onClick={() => setSimulationMode('browser')}
              style={{
                padding: '4px 9px',
                borderRadius: '100px',
                border: simulationMode === 'browser' ? '1px solid #3b82f6' : '1px solid transparent',
                background: simulationMode === 'browser' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: simulationMode === 'browser' ? '#60a5fa' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: simulationMode === 'browser' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Browser Modus (Shift + P)"
              aria-label="Browser Modus aktivieren"
            >
              <Globe size={12} />
              <span>Browser</span>
            </button>

            <button
              onClick={() => setSimulationMode('pwa')}
              style={{
                padding: '4px 10px',
                borderRadius: '100px',
                border: simulationMode === 'pwa' ? '1px solid #10b981' : '1px solid transparent',
                background: simulationMode === 'pwa' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: simulationMode === 'pwa' ? '#34d399' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: simulationMode === 'pwa' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="PWA App Modus (100% Standalone mit Safe-Areas) (Shift + P)"
              aria-label="PWA Modus aktivieren"
            >
              <Smartphone size={12} />
              <span>PWA</span>
            </button>
          </div>

          {/* Status Bar Contrast Toggle */}
          {isPwa && !isDesktop && (
            <button
              onClick={() => setStatusBarStyle(prev => (prev === 'dark' ? 'light' : 'dark'))}
              style={{
                background: isStatusBarDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isStatusBarDark ? '#fbbf24' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '100px',
                padding: '4px 8px',
                fontSize: '0.70rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Statusleisten-Icons umschalten"
              aria-label="Statusleisten-Icons umschalten"
            >
              {isStatusBarDark ? <Moon size={11} /> : <Sun size={11} />}
              <span>{isStatusBarDark ? 'Helle Icons' : 'Dunkle Icons'}</span>
            </button>
          )}

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Hardware Presets Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {PRESETS.map(preset => {
              const Icon = preset.icon;
              const isSelected = selectedPresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '100px',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                    background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: isSelected ? '#60a5fa' : '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 800 : 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title={preset.name}
                  aria-label={`Preset ${preset.name} auswählen`}
                >
                  <Icon size={12} />
                  <span>{preset.shortName}</span>
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Zoom Matrix Selector */}
          {!isDesktop && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ZoomIn size={12} style={{ color: '#94a3b8', marginRight: '2px' }} />
              {(['auto', 1, 0.75, 0.5] as const).map(z => (
                <button
                  key={String(z)}
                  onClick={() => setZoomLevel(z)}
                  style={{
                    padding: '3px 7px',
                    borderRadius: '6px',
                    border: zoomLevel === z ? '1px solid #3b82f6' : '1px solid transparent',
                    background: zoomLevel === z ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                    color: zoomLevel === z ? '#60a5fa' : '#94a3b8',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title={`Zoom: ${z === 'auto' ? 'Auto-Fit' : `${z * 100}%`}`}
                  aria-label={`Zoom-Stufe ${z === 'auto' ? 'Auto-Fit' : `${z * 100}%`}`}
                >
                  {z === 'auto' ? 'Auto' : `${Math.round(z * 100)}%`}
                </button>
              ))}
            </div>
          )}

          {/* Rotation Toggle Button (Shift + R) */}
          {!isDesktop && (
            <button
              onClick={() => setIsRotated(prev => !prev)}
              style={{
                background: isRotated ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: isRotated ? '#60a5fa' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Kippen / Drehen (Shift + R)"
              aria-label="Geräteausrichtung drehen"
            >
              <RotateCcw size={12} />
            </button>
          )}

          {/* Touch Cursor Toggle */}
          {!isDesktop && (
            <button
              onClick={() => setShowTouchCursor(prev => !prev)}
              style={{
                background: showTouchCursor ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: showTouchCursor ? '#34d399' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '100px',
                padding: '3px 8px',
                fontSize: '0.70rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer'
              }}
              title="Virtuellen Touch-Zeiger umschalten"
              aria-label="Virtuellen Touch-Zeiger umschalten"
            >
              <TouchpadIcon size={11} />
              <span>Touch</span>
            </button>
          )}

          {/* Dimension & Status Badge */}
          <div
            style={{
              fontSize: '0.68rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: isPwa ? '#34d399' : '#94a3b8',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '3px 7px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>
              {frameWidth}×{frameHeight}
            </span>
            <span style={{ color: isPwa ? '#10b981' : '#60a5fa' }}>{isPwa ? '• PWA' : '• WEB'}</span>
          </div>

          {/* Close Simulator Button (Shift + D) */}
          <button
            onClick={() => setIsActive(false)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: '4px'
            }}
            title="Simulator Schließen (Shift + D)"
            aria-label="Simulator beenden"
          >
            <X size={13} />
          </button>
        </div>

        {/* Content Rendering: Desktop vs Phone/Tablet Physical Hardware Frame */}
        {isDesktop ? (
          <div className="sim-viewport-desktop" style={{ width: '100%', minHeight: '100vh', paddingTop: '64px' }}>
            {children}
          </div>
        ) : (
          /* Scaled Matrix Shell Container */
          <div
            style={{
              width: `${Math.round(frameWidth * effectiveScale)}px`,
              height: `${Math.round(frameHeight * effectiveScale)}px`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              position: 'relative',
              transition: 'width 0.25s ease, height 0.25s ease'
            }}
          >
            {/* Physical Hardware Frame */}
            <div
              style={{
                position: 'relative',
                width: `${frameWidth}px`,
                height: `${frameHeight}px`,
                background: '#ffffff',
                borderRadius: currentPreset.borderRadius || '36px',
                boxShadow:
                  '0 0 0 12px #1e293b, 0 0 0 14px #0f172a, 0 25px 65px -10px rgba(0, 0, 0, 0.8), 0 0 45px rgba(59, 130, 246, 0.15)',
                overflow: 'hidden',
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top center',
                transition: 'width 0.25s ease, height 0.25s ease, border-radius 0.25s ease',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Native Status Bar (PWA Mode) */}
              {isPwa && (
                <NativeStatusBar
                  preset={currentPreset}
                  time={currentTime}
                  isDarkTheme={isStatusBarDark}
                  isRotated={isRotated}
                />
              )}

              {/* Mobile Browser Top Address Bar (Browser Mode) */}
              {!isPwa && (
                <>
                  {currentPreset.hasDynamicIsland && !isRotated && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '124px',
                        height: '32px',
                        background: '#000000',
                        borderRadius: '18px',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 12px',
                        pointerEvents: 'none'
                      }}
                    >
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#0a0f1d' }} />
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#0f172a' }} />
                    </div>
                  )}

                  {currentPreset.hasNotch && !isRotated && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '24px',
                        background: '#000000',
                        borderRadius: '16px',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 10px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        pointerEvents: 'none'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0a0f1d' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0f172a' }} />
                    </div>
                  )}
                  <MobileBrowserBar currentPath={currentPath} onRefresh={handleBrowserRefresh} />
                </>
              )}

              {/* iOS Home Indicator Bar */}
              {currentPreset.hasHomeBar && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '134px',
                    height: '5px',
                    background: isStatusBarDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '100px',
                    zIndex: 9999,
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Touch Circle Cursor Overlay */}
              {showTouchCursor && touchPos && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${touchPos.y - 18}px`,
                    left: `${touchPos.x - 18}px`,
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isPwa ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)',
                    border: '2px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: isPwa ? '0 0 12px rgba(16, 185, 129, 0.5)' : '0 0 12px rgba(59, 130, 246, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 99999,
                    transition: 'transform 0.04s ease-out'
                  }}
                />
              )}

              {/* Dual Engine Viewport: Iframe (100% Native Breakpoint Truth) vs In-DOM */}
              {renderEngine === 'iframe' ? (
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  title="Device Simulator Guest Viewport"
                  onLoad={syncIframeDocument}
                  style={{
                    width: '100%',
                    height: '100%',
                    flex: 1,
                    border: 'none',
                    background: '#ffffff',
                    display: 'block'
                  }}
                />
              ) : (
                <div
                  className={`sim-viewport-${currentPreset.category} ${frameWidth > frameHeight ? 'sim-viewport-landscape' : 'sim-viewport-portrait'} ${isPwa ? 'sim-viewport-pwa pwa-standalone-mode' : 'sim-viewport-browser'} no-scrollbar`}
                  style={{
                    width: '100%',
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    position: 'relative',
                    boxSizing: 'border-box',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    ['--safe-area-inset-top' as unknown as string]:
                      isPwa && !isRotated ? `${currentPreset.safeTop || 47}px` : '0px',
                    ['--safe-area-inset-bottom' as unknown as string]: currentPreset.hasHomeBar
                      ? `${currentPreset.safeBottom || 34}px`
                      : '0px',
                    ['--sat' as unknown as string]: isPwa && !isRotated ? `${currentPreset.safeTop || 47}px` : '0px',
                    ['--sab' as unknown as string]: currentPreset.hasHomeBar ? `${currentPreset.safeBottom || 34}px` : '0px',
                    ['--safe-top' as unknown as string]:
                      isPwa && !isRotated ? `${currentPreset.safeTop || 47}px` : '0px',
                    ['--safe-bottom' as unknown as string]: currentPreset.hasHomeBar
                      ? `${currentPreset.safeBottom || 34}px`
                      : '0px'
                  }}
                >
                  {children}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
