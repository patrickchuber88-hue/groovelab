import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, RotateCcw, X, TouchpadIcon, Move, Sliders, ChevronDown } from 'lucide-react';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';

interface DevicePreset {
  id: string;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  icon: any;
  hasNotch?: boolean;
  hasHomeBar?: boolean;
  borderRadius?: string;
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
    borderRadius: '44px'
  },
  {
    id: 'android',
    name: 'Android / Pixel (412×915)',
    category: 'mobile',
    width: 412,
    height: 915,
    icon: Smartphone,
    hasNotch: false,
    hasHomeBar: true,
    borderRadius: '36px'
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
    borderRadius: '28px'
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
    borderRadius: '28px'
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
    borderRadius: '0px'
  }
];

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

  const [isRotated, setIsRotated] = useState(false);
  const [showTouchCursor, setShowTouchCursor] = useState(true);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [isDockMinimized, setIsDockMinimized] = useState(false);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_simulator_active', String(isActive));
  }, [isActive, isDev]);

  useEffect(() => {
    if (!isDev) return;
    localStorage.setItem('groovelab_dev_device_preset', selectedPresetId);
    window.dispatchEvent(new CustomEvent('groovelab_orientation_changed'));
  }, [selectedPresetId, isRotated, isActive, isDev]);

  // Keyboard shortcut: Shift + D to toggle simulator (strictly gated to dev mode)
  useEffect(() => {
    if (!isDev) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        // Prevent toggle if active inside input or textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setIsActive(prev => !prev);
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

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Floating Toggle Button (Visible strictly in development environment) */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <button
          onClick={() => setIsActive(prev => !prev)}
          style={{
            background: isActive
              ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '100px',
            padding: '10px 18px',
            fontWeight: 800,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <Sliders size={16} />
          <span>{isActive ? 'Simulator Aktiv' : 'Dev Simulator'}</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}
          >
            Shift+D
          </span>
        </button>
      </div>

      {/* Main App Content Container */}
      {!isActive ? (
        // Standard View without Simulator
        <div style={{ width: '100%', minHeight: '100vh' }}>
          {children}
        </div>
      ) : (
        /* Simulated Device Viewport Canvas */
        <div
          style={{
            height: isDesktop ? 'auto' : '100vh',
            maxHeight: isDesktop ? 'none' : '100vh',
            width: '100%',
            background: isDesktop ? 'var(--bg-color)' : '#090d16',
            backgroundImage: isDesktop ? 'none' :
              'radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.5) 0%, rgba(9, 13, 22, 1) 100%), linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 32px 32px, 32px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isDesktop ? 'flex-start' : 'center',
            paddingTop: isDesktop ? '0px' : '60px',
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
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '100px',
              padding: isDockMinimized ? '6px 14px' : '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              maxWidth: '92vw',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}
          >
            {/* Presets Selector Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {PRESETS.map(preset => {
                const Icon = preset.icon;
                const isSelected = selectedPresetId === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '100px',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                      background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      color: isSelected ? '#60a5fa' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 800 : 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={14} />
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
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Kippen / Drehen (Rotate Viewport)"
            >
              <RotateCcw size={14} />
            </button>

            {/* Virtual Touch Cursor Toggle */}
            <button
              onClick={() => setShowTouchCursor(prev => !prev)}
              style={{
                background: showTouchCursor ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: showTouchCursor ? '#34d399' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '100px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
              title="Virtuellen Touch-Zeiger aktivieren/deaktivieren"
            >
              <TouchpadIcon size={13} />
              <span>Touch</span>
            </button>

            {/* Resolution Indicator Badge */}
            <div
              style={{
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#94a3b8',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {frameWidth} × {frameHeight} px
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
              title="Simulator Beenden"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content Rendering: Desktop vs Phone/Tablet Canvas */}
          {isDesktop ? (
            <div className="sim-viewport-desktop" style={{ width: '100%', minHeight: '100vh', paddingTop: '60px' }}>
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
                  '0 0 0 12px #1e293b, 0 0 0 14px #0f172a, 0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(59, 130, 246, 0.15)',
                overflow: 'hidden',
                transform: 'translate3d(0, 0, 0)', // Containing block for inner position: fixed elements
                transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease'
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Dynamic Island / iPhone Notch (Top Bezel) */}
              {currentPreset.hasNotch && !isRotated && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '120px',
                    height: '30px',
                    background: '#000000',
                    borderRadius: '20px',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Camera Lens Circle */}
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0a0f1d' }} />
                  {/* Sensor Lens Pill */}
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a' }} />
                </div>
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
                    background: 'rgba(15, 23, 42, 0.4)',
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
                    background: 'rgba(59, 130, 246, 0.35)',
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 99999,
                    transition: 'transform 0.05s ease-out'
                  }}
                />
              )}

              {/* Viewport Content Wrapper with Preset & Orientation Class Injection */}
              <div
                className={`sim-viewport-${currentPreset.category} ${frameWidth > frameHeight ? 'sim-viewport-landscape' : 'sim-viewport-portrait'} no-scrollbar`}
                style={{
                  width: '100%',
                  height: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  position: 'relative',
                  boxSizing: 'border-box',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {children}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
