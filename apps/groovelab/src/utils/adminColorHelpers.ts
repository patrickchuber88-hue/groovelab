/**
 * Admin Color & Gradient Helpers
 * Extracted to shared utils to eliminate circular bundle chunks between AdminDashboard and its subviews.
 */

export const getStationColor = (name: string | null | undefined, dbColor?: string | null): string => {
  if (!name) return "#64748b";
  
  const isStandardIpad = /^ipad\s*\d+/i.test(name);
  if (dbColor && dbColor !== "#e5e7eb" && dbColor !== "#e2e8f0" && dbColor !== "#cbd5e1") {
    if (isStandardIpad && dbColor === "#64748b") {
      // Fall through to number-based standard color
    } else {
      return dbColor;
    }
  }

  if (name.toLowerCase().includes("lehrer")) return "#34a853"; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return "#64748b";
  const num = parseInt(matches[matches.length - 1], 10);
  if (num === 1 || num === 2) return "#eab308"; // Yellow
  if (num === 3 || num === 4) return "#a855f7"; // Purple
  if (num === 5 || num === 6) return "#3b82f6"; // Blue
  if (num === 7 || num === 8) return "#eab308"; // Yellow
  return "#64748b";
};

export const CANONICAL_LEHRWERK_COLOR = {
  from: '#ffe4e6',
  to: '#fecdd3',
  text: '#e11d48',
  accent: '#e11d48',
  border: '#fecdd3',
  badgeBg: '#fff1f2',
  badgeText: '#e11d48',
  shadowFrom: 'rgba(225, 29, 72, 0.18)',
  shadowTo: 'rgba(225, 29, 72, 0.12)'
};

export const getLehrwerkColor = (_title?: string, _lehrwerkeList: any[] = []) => {
  return CANONICAL_LEHRWERK_COLOR;
};

/**
 * Berechnet einen deterministischen HSL-Farbton (0-360) anhand des ersten Buchstabens.
 */
export const getAlphabeticalHue = (str: string): number => {
  const trimmed = (str || '').trim();
  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  return Math.round(((clampedCode - 65) / 25) * 360);
};

export const getAlphabeticalUniColor = (name: string) => {
  const trimmed = (name || '').trim();
  if (trimmed.toLowerCase() === 'ohne zuweisung') {
    return {
      avatarBg: '#f1f5f9',
      avatarColor: '#475569'
    };
  }
  const hue = getAlphabeticalHue(trimmed);
  return {
    avatarBg: `hsl(${hue}, 80%, 93%)`,
    avatarColor: `hsl(${hue}, 90%, 25%)`
  };
};

import { getSongColor as getCanonicalSongColor } from '../components/student/studentDateUtils';

export const getSongColor = (title: string) => {
  return getCanonicalSongColor(title);
};
