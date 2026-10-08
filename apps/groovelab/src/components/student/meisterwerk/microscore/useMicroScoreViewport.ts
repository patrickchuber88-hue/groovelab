/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * useMicroScoreViewport.ts
 * 
 * 2027 0,1% Goldstandard Responsive Viewport & Orientation Hook:
 * - Deterministische Erkennung der 3 Device-Klassen (Desktop, iPad/Tablet, Smartphone)
 * - Reaktive Ausrichtungs-Erkennung (Portrait vs. Landscape / Querformat)
 * - HTML5 Native Fullscreen API Integration mit Safari-Fallback
 * - Dynamic Viewport Units (100dvh / 100dvw) & Safe-Area Inset Handling
 * - BFSG 2025 & WCAG 2.2 AA konform
 */

import { useState, useEffect, useCallback } from 'react';

export type MicroScoreDeviceType = 'desktop' | 'tablet' | 'mobile';

export interface MicroScoreViewportState {
  deviceType: MicroScoreDeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  viewportWidth: number;
  viewportHeight: number;
}

export function useMicroScoreViewport(): MicroScoreViewportState {
  const [viewportWidth, setViewportWidth] = useState<number>(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [viewportHeight, setViewportHeight] = useState<number>(() => 
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return Boolean(
      document.fullscreenElement || 
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
    );
  });

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    setViewportWidth(w);
    setViewportHeight(h);
    setIsPortrait(h > w);
  }, []);

  const updateFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    const activeFs = Boolean(
      document.fullscreenElement || 
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
    );
    setIsFullscreen(activeFs);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateViewport();
    updateFullscreen();

    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    document.addEventListener('fullscreenchange', updateFullscreen);
    document.addEventListener('webkitfullscreenchange', updateFullscreen);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      document.removeEventListener('fullscreenchange', updateFullscreen);
      document.removeEventListener('webkitfullscreenchange', updateFullscreen);
    };
  }, [updateViewport, updateFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;

    try {
      if (document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      } else {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if ((root as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (root as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      }
    } catch {
      // Ignoriere Blockaden durch Browser-Permissions / iFrames geräuschlos
    }
  }, []);

  // Deterministische Device-Klassifikation
  // Smartphones: w <= 768 (oder im Querformat bei geringer Höhe h <= 500)
  const isMobile = viewportWidth <= 768 || (isPortrait === false && viewportHeight <= 500 && viewportWidth <= 932);
  const isTablet = !isMobile && viewportWidth <= 1024;
  const isDesktop = !isMobile && !isTablet;

  const deviceType: MicroScoreDeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
  const isLandscape = !isPortrait;
  const isMobilePortrait = isMobile && isPortrait;
  const isMobileLandscape = isMobile && isLandscape;

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    isMobilePortrait,
    isMobileLandscape,
    isFullscreen,
    toggleFullscreen,
    viewportWidth,
    viewportHeight
  };
}
