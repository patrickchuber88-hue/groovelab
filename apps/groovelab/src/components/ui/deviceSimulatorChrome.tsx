import React from 'react';
import { Smartphone, Tablet, Monitor, Wifi, Lock, RefreshCw } from 'lucide-react';

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

export const PRESETS: DevicePreset[] = [
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
    width: 0,
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

export interface StatusBarProps {
  preset: DevicePreset;
  time: string;
  isDarkTheme: boolean;
  isRotated: boolean;
}

export const NativeStatusBar: React.FC<StatusBarProps> = ({ preset, time, isDarkTheme, isRotated }) => {
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: textColor }}>
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
            <div style={{ width: '100%', height: '100%', background: textColor, borderRadius: '1.5px' }} />
          </div>
          <div style={{ width: '1.5px', height: '4px', background: textColor, borderRadius: '0 1px 1px 0' }} />
        </div>
      </div>
    </div>
  );
};

export interface BrowserBarProps {
  currentPath: string;
  onRefresh?: () => void;
}

export const MobileBrowserBar: React.FC<BrowserBarProps> = ({ currentPath, onRefresh }) => {
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

export function isInteractiveInputField(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  const role = target.getAttribute ? target.getAttribute('role') : null;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(target.isContentEditable) ||
    role === 'textbox' ||
    role === 'combobox' ||
    role === 'searchbox'
  );
}
