import React, { useState, useEffect } from 'react';
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
  Moon
} from 'lucide-react';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';

interface DevicePreset {
  id: string;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }> | any;
  hasNotch?: boolean;
  hasPunchHole?: boolean;
  hasHomeBar?: boolean;
  borderRadius?: string;
  safeTop?: number;
  safeBottom?: number;
}

const PRESETS: DevicePreset[] = [
  {
    id: 'iphone14',
    name: 'iPhone 14 (390×844)',
    category: 'mobile',
    width: 390,
    height: 844,
    icon: Smartphone,
    hasNotch: true,
    hasHomeBar: true,
    borderRadius: '44px',
    safeTop: 47,
    safeBottom: 34
  },
  {
    id: 'android',
    name: 'Android / Pixel (412×915)',
    category: 'mobile',
    width: 412,
    height: 915,
    icon: Smartphone,
    hasNotch: false,
    hasPunchHole: true,
    hasHomeBar: true,
    borderRadius: '36px',
    safeTop: 36,
    safeBottom: 24
  },
  {
    id: 'ipad_portrait',
    name: 'iPad Portrait (768×1024)',
    category: 'tablet',
    width: 768,
    height: 1024,
    icon: Tablet,
    hasNotch: false,
    hasHomeBar: true,
    borderRadius: '28px',
    safeTop: 28,
    safeBottom: 20
  },
  {
    id: 'ipad_landscape',
    name: 'iPad Landscape (1024×768)',
    category: 'tablet',
    width: 1024,
    height: 768,
    icon: Tablet,
    hasNotch: false,
    hasHomeBar: true,
    borderRadius: '28px',
    safeTop: 28,
    safeBottom: 20
  },
  {
    id: 'desktop',
    name: 'Desktop (Full Width)',
    category: 'desktop',
    width: 0, // 0 = 100% full width
    height: 0,
    icon: Monitor,
    hasNotch: false,
    hasHomeBar: false,
    borderRadius: '0px',
    safeTop: 0,
    safeBottom: 0
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

      {/* Center: Dynamic Island / Notch or Punch Hole */}
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
            boxSizing: 'border-box'
          }}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0a0f1d' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a' }} />
        </div>
      )}

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
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
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
  onRefresh?: () => void;
}

const MobileBrowserBar: React.FC<BrowserBarProps> = ({ onRefresh }) => {
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
          maxWidth: '300px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <Lock size={11} color="#10b981" />
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
          >
            campus-groovelab.com
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
            color: '#64748b'
          }}
          title="Seite neu laden"
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
  const isDev = isDevEnvironment();

  const [isActive, setIsActive] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !isDev) return false;
    return localStorage.getItem('groovelab_dev_simulator_active') === 'true';
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'iphone14';
    return localStorage.getItem('groovelab_dev_device_preset') || 'iphone14';
  });

  const [simulationMode, setSimulationMode] = useState<'browser' | 'pwa'>(() => {
    if (typeof window === 'undefined') return 'pwa';
    return (localStorage.getItem('groovelab_dev_simulation_mode') as 'browser' | 'pwa') || 'pwa';
  });

  const [statusBarStyle, setStatusBarStyle] = useState<'auto' | 'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem('groovelab_dev_status_bar_style') as 'auto' | 'light' | 'dark') || 'auto';
  });

  const [currentTime, setCurrentTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [isRotated, setIsRotated] = useState(false);
  const [showTouchCursor, setShowTouchCursor] = useState(true);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [isDockMinimized, setIsDockMinimized] = useState(false);

  // Clock interval for authentic live status bar
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save state preferences
  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_simulator_active', String(isActive));
  }, [isActive, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_device_preset', selectedPresetId);
    window.dispatchEvent(new CustomEvent('groovelab_orientation_changed'));
  }, [selectedPresetId, isRotated, isActive, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_simulation_mode', simulationMode);
  }, [simulationMode, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_status_bar_style', statusBarStyle);
  }, [statusBarStyle, isDev]);

  // Deep JavaScript Runtime Standalone Interception
  useEffect(() => {
    if (!isDev || !isActive) return;

    const originalMatchMedia = window.matchMedia;
    let originalNavigatorStandalone: unknown;
    try {
      originalNavigatorStandalone = (window.navigator as unknown as { standalone?: unknown }).standalone;
    } catch {
      // Ignore if navigator property cannot be read
    }

    const isPwa = simulationMode === 'pwa';

    // 1. Monkey-patch window.navigator.standalone
    try {
      Object.defineProperty(window.navigator, 'standalone', {
        value: isPwa,
        configurable: true,
        writable: true
      });
    } catch {
      (window.navigator as unknown as { standalone: boolean }).standalone = isPwa;
    }

    // 2. Monkey-patch window.matchMedia for (display-mode: standalone)
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

    // 3. Dispatch resize & custom pwa change events so existing React hooks and styles re-evaluate
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new CustomEvent('groovelab_pwa_mode_changed', { detail: { isPwa } }));

    return () => {
      // Revert on unmount or mode switch
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
  }, [isDev, isActive, simulationMode]);

  // Keyboard shortcut: Shift + D to toggle simulator, Shift + P to toggle Browser/PWA
  useEffect(() => {
    if (!isDev) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsActive(prev => !prev);
      } else if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setSimulationMode(prev => (prev === 'pwa' ? 'browser' : 'pwa'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDev]);

  // In production mode, render children transparently with zero overhead
  if (!isDev) {
    return <>{children}</>;
  }

  const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];

  const frameWidth = isRotated ? (currentPreset.height || 0) : (currentPreset.width || 0);
  const frameHeight = isRotated ? (currentPreset.width || 0) : (currentPreset.height || 0);
  const isDesktop = currentPreset.category === 'desktop' || frameWidth === 0;
  const isPwa = simulationMode === 'pwa';

  // Status bar dark vs light icons
  const isStatusBarDark = statusBarStyle === 'dark';

  // Track touch cursor inside simulator viewport
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
    window.dispatchEvent(new Event('resize'));
  };

  // Inactive mode: render children transparently
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Simulated Device Viewport Canvas */}
      <div
        style={{
          height: isDesktop ? 'auto' : '100vh',
          maxHeight: isDesktop ? 'none' : '100vh',
          width: '100%',
          background: isDesktop ? 'var(--bg-color)' : '#090d16',
          backgroundImage: isDesktop
            ? 'none'
            : 'radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.5) 0%, rgba(9, 13, 22, 1) 100%), linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
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
        {/* Interactive Floating Control Dock (Top Bar) */}
        <div
          style={{
            position: 'fixed',
            top: '16px',
            zIndex: 999990,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '100px',
            padding: isDockMinimized ? '6px 14px' : '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '94vw',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {/* Mode Switcher: Browser vs 100% PWA App */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '3px',
              borderRadius: '100px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <button
              onClick={() => setSimulationMode('browser')}
              style={{
                padding: '5px 10px',
                borderRadius: '100px',
                border: simulationMode === 'browser' ? '1px solid #3b82f6' : '1px solid transparent',
                background: simulationMode === 'browser' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: simulationMode === 'browser' ? '#60a5fa' : '#94a3b8',
                fontSize: '0.74rem',
                fontWeight: simulationMode === 'browser' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Web Browser Modus (Mobile Safari / Chrome)"
            >
              <Globe size={13} />
              <span>Browser</span>
            </button>

            <button
              onClick={() => setSimulationMode('pwa')}
              style={{
                padding: '5px 11px',
                borderRadius: '100px',
                border: simulationMode === 'pwa' ? '1px solid #10b981' : '1px solid transparent',
                background: simulationMode === 'pwa' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: simulationMode === 'pwa' ? '#34d399' : '#94a3b8',
                fontSize: '0.74rem',
                fontWeight: simulationMode === 'pwa' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="PWA App Modus (100% Standalone mit nativer Statusleiste, Safe-Areas und display-mode: standalone)"
            >
              <Smartphone size={13} />
              <span>PWA App</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  background: '#10b981',
                  color: '#090d16',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  fontWeight: 900
                }}
              >
                100%
              </span>
            </button>
          </div>

          {/* Status Bar Theme Toggle (Visible in PWA mode) */}
          {isPwa && !isDesktop && (
            <button
              onClick={() => setStatusBarStyle(prev => (prev === 'dark' ? 'light' : 'dark'))}
              style={{
                background: isStatusBarDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isStatusBarDark ? '#fbbf24' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '100px',
                padding: '4px 9px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Statusleisten-Kontrast umschalten (Helle Icons für dunkle Screens / Dunkle Icons für helle Screens)"
            >
              {isStatusBarDark ? <Moon size={12} /> : <Sun size={12} />}
              <span>{isStatusBarDark ? 'Helle Icons' : 'Dunkle Icons'}</span>
            </button>
          )}

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Presets Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {PRESETS.map(preset => {
              const Icon = preset.icon;
              const isSelected = selectedPresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '100px',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                    background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: isSelected ? '#60a5fa' : '#94a3b8',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? 800 : 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={13} />
                  <span>{preset.name.split(' (')[0]}</span>
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Rotation Toggle Button */}
          <button
            onClick={() => setIsRotated(prev => !prev)}
            style={{
              background: isRotated ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isRotated ? '#60a5fa' : '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Kippen / Drehen (Rotate Viewport)"
          >
            <RotateCcw size={13} />
          </button>

          {/* Virtual Touch Cursor Toggle */}
          <button
            onClick={() => setShowTouchCursor(prev => !prev)}
            style={{
              background: showTouchCursor ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: showTouchCursor ? '#34d399' : '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '100px',
              padding: '4px 9px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            title="Virtuellen Touch-Zeiger aktivieren/deaktivieren"
          >
            <TouchpadIcon size={12} />
            <span>Touch</span>
          </button>

          {/* Resolution & Mode Indicator Badge */}
          <div
            style={{
              fontSize: '0.70rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: isPwa ? '#34d399' : '#94a3b8',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>
              {frameWidth} × {frameHeight}
            </span>
            <span style={{ color: isPwa ? '#10b981' : '#60a5fa' }}>{isPwa ? '• PWA' : '• WEB'}</span>
          </div>

          {/* Close Simulator Button */}
          <button
            onClick={() => setIsActive(false)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
            title="Simulator Beenden (Shift + D)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content Rendering: Desktop vs Phone/Tablet Canvas */}
        {isDesktop ? (
          <div className="sim-viewport-desktop" style={{ width: '100%', minHeight: '100vh', paddingTop: '64px' }}>
            {children}
          </div>
        ) : (
          /* Physical Device Hardware Shell */
          <div
            style={{
              position: 'relative',
              width: `${frameWidth}px`,
              height: `${frameHeight}px`,
              background: '#ffffff',
              borderRadius: currentPreset.borderRadius || '36px',
              boxShadow:
                '0 0 0 12px #1e293b, 0 0 0 14px #0f172a, 0 25px 60px -10px rgba(0, 0, 0, 0.75), 0 0 40px rgba(59, 130, 246, 0.15)',
              overflow: 'hidden',
              transform: 'translate3d(0, 0, 0)', // Containing block for inner position: fixed elements
              transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease',
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* PWA Mode: Native Live Status Bar */}
            {isPwa && (
              <NativeStatusBar
                preset={currentPreset}
                time={currentTime}
                isDarkTheme={isStatusBarDark}
                isRotated={isRotated}
              />
            )}

            {/* Browser Mode: Mobile Safari / Chrome Top Address Bar */}
            {!isPwa && (
              <>
                {/* iPhone Notch in Browser mode */}
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
                <MobileBrowserBar onRefresh={handleBrowserRefresh} />
              </>
            )}

            {/* iOS Home Indicator Bar (Bottom Bezel) */}
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
                  transition: 'transform 0.05s ease-out'
                }}
              />
            )}

            {/* Viewport Content Wrapper with Preset & Standalone Class / CSS Variable Injection */}
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
                  isPwa && !isRotated ? `${currentPreset.safeTop || 44}px` : '0px',
                ['--safe-area-inset-bottom' as unknown as string]: currentPreset.hasHomeBar
                  ? `${currentPreset.safeBottom || 34}px`
                  : '0px',
                ['--sat' as unknown as string]: isPwa && !isRotated ? `${currentPreset.safeTop || 44}px` : '0px',
                ['--sab' as unknown as string]: currentPreset.hasHomeBar ? `${currentPreset.safeBottom || 34}px` : '0px',
                ['--safe-top' as unknown as string]:
                  isPwa && !isRotated ? `${currentPreset.safeTop || 44}px` : '0px',
                ['--safe-bottom' as unknown as string]: currentPreset.hasHomeBar
                  ? `${currentPreset.safeBottom || 34}px`
                  : '0px'
              }}
            >
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
