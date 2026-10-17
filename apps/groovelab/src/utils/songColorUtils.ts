/**
 * Autonomous Leaf Utility: Song & Lehrwerk Color Utilities
 * Bounded Context: Independent Leaf UI Helpers
 * Decoupled from studentDateUtils and admin views to eliminate circular chunk deadlocks (TDZ).
 */

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

export const getLehrwerkColor = (_title?: string, _customLehrwerkeList?: any[]) => {
  return CANONICAL_LEHRWERK_COLOR;
};

export const CURATED_ALPHABETICAL_SONG_PALETTE: Record<string, { from: string; to: string; text: string; shadowFrom?: string; shadowTo?: string }> = {
  A: { from: '#ffe4e6', to: '#fecdd3', text: '#be123c', shadowFrom: 'rgba(190, 18, 60, 0.2)', shadowTo: 'rgba(190, 18, 60, 0.12)' },
  B: { from: '#ffedd5', to: '#fed7aa', text: '#c2410c', shadowFrom: 'rgba(194, 65, 12, 0.2)', shadowTo: 'rgba(194, 65, 12, 0.12)' },
  C: { from: '#fef3c7', to: '#fde68a', text: '#b45309', shadowFrom: 'rgba(180, 83, 9, 0.2)', shadowTo: 'rgba(180, 83, 9, 0.12)' },
  D: { from: '#fef9c3', to: '#fef08a', text: '#854d0e', shadowFrom: 'rgba(133, 77, 14, 0.2)', shadowTo: 'rgba(133, 77, 14, 0.12)' },
  E: { from: '#ecfccb', to: '#d9f99d', text: '#4d7c0f', shadowFrom: 'rgba(77, 124, 15, 0.2)', shadowTo: 'rgba(77, 124, 15, 0.12)' },
  F: { from: '#d1fae5', to: '#a7f3d0', text: '#047857', shadowFrom: 'rgba(4, 120, 87, 0.2)', shadowTo: 'rgba(4, 120, 87, 0.12)' },
  G: { from: '#ccfbf1', to: '#99f6e4', text: '#0f766e', shadowFrom: 'rgba(15, 118, 110, 0.2)', shadowTo: 'rgba(15, 118, 110, 0.12)' },
  H: { from: '#e0f2fe', to: '#bae6fd', text: '#0369a1', shadowFrom: 'rgba(3, 105, 161, 0.2)', shadowTo: 'rgba(3, 105, 161, 0.12)' },
  I: { from: '#dbeafe', to: '#bfdbfe', text: '#1d4ed8', shadowFrom: 'rgba(29, 78, 216, 0.2)', shadowTo: 'rgba(29, 78, 216, 0.12)' },
  J: { from: '#e0e7ff', to: '#c7d2fe', text: '#4338ca', shadowFrom: 'rgba(67, 56, 202, 0.2)', shadowTo: 'rgba(67, 56, 202, 0.12)' },
  K: { from: '#ede9fe', to: '#ddd6fe', text: '#6d28d9', shadowFrom: 'rgba(109, 40, 217, 0.2)', shadowTo: 'rgba(109, 40, 217, 0.12)' },
  L: { from: '#f3e8ff', to: '#e9d5ff', text: '#7e22ce', shadowFrom: 'rgba(126, 34, 206, 0.2)', shadowTo: 'rgba(126, 34, 206, 0.12)' },
  M: { from: '#fae8ff', to: '#f5d0fe', text: '#a21caf', shadowFrom: 'rgba(162, 28, 175, 0.2)', shadowTo: 'rgba(162, 28, 175, 0.12)' },
  N: { from: '#fce7f3', to: '#fbcfe8', text: '#be185d', shadowFrom: 'rgba(190, 24, 93, 0.2)', shadowTo: 'rgba(190, 24, 93, 0.12)' },
  O: { from: '#f5f3ff', to: '#ede9fe', text: '#5b21b6', shadowFrom: 'rgba(91, 33, 182, 0.2)', shadowTo: 'rgba(91, 33, 182, 0.12)' },
  P: { from: '#fff1f2', to: '#ffe4e6', text: '#9f1239', shadowFrom: 'rgba(159, 18, 57, 0.2)', shadowTo: 'rgba(159, 18, 57, 0.12)' },
  Q: { from: '#ffedd5', to: '#fed7aa', text: '#9a3412', shadowFrom: 'rgba(154, 52, 18, 0.2)', shadowTo: 'rgba(154, 52, 18, 0.12)' },
  R: { from: '#ffe4e6', to: '#fecdd3', text: '#881337', shadowFrom: 'rgba(136, 19, 55, 0.2)', shadowTo: 'rgba(136, 19, 55, 0.12)' },
  S: { from: '#dcfce7', to: '#bbf7d0', text: '#15803d', shadowFrom: 'rgba(21, 128, 61, 0.2)', shadowTo: 'rgba(21, 128, 61, 0.12)' },
  T: { from: '#cffafe', to: '#a5f3fc', text: '#0e7490', shadowFrom: 'rgba(14, 116, 144, 0.2)', shadowTo: 'rgba(14, 116, 144, 0.12)' },
  U: { from: '#e0f2fe', to: '#bae6fd', text: '#0284c7', shadowFrom: 'rgba(2, 132, 199, 0.2)', shadowTo: 'rgba(2, 132, 199, 0.12)' },
  V: { from: '#ede9fe', to: '#ddd6fe', text: '#5b21b6', shadowFrom: 'rgba(91, 33, 182, 0.2)', shadowTo: 'rgba(91, 33, 182, 0.12)' },
  W: { from: '#ccfbf1', to: '#99f6e4', text: '#115e59', shadowFrom: 'rgba(17, 94, 89, 0.2)', shadowTo: 'rgba(17, 94, 89, 0.12)' },
  X: { from: '#f1f5f9', to: '#e2e8f0', text: '#334155', shadowFrom: 'rgba(51, 65, 85, 0.2)', shadowTo: 'rgba(51, 65, 85, 0.12)' },
  Y: { from: '#f8fafc', to: '#f1f5f9', text: '#1e293b', shadowFrom: 'rgba(30, 41, 59, 0.2)', shadowTo: 'rgba(30, 41, 59, 0.12)' },
  Z: { from: '#e2e8f0', to: '#cbd5e1', text: '#0f172a', shadowFrom: 'rgba(15, 23, 42, 0.2)', shadowTo: 'rgba(15, 23, 42, 0.12)' }
};

export const getSongColor = (title: string) => {
  let clean = (title || '').trim();
  // If formatted as "Artist - SongTitle", extract the actual song title so color is 100% harmonized across all views
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length >= 2 && parts[1]?.trim()) {
      clean = parts.slice(1).join(' - ').trim();
    }
  }
  // Strip trailing parens like (Akustik)
  clean = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const firstChar = clean.charAt(0).toUpperCase();
  if (CURATED_ALPHABETICAL_SONG_PALETTE[firstChar]) {
    return CURATED_ALPHABETICAL_SONG_PALETTE[firstChar];
  }
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 92%)`,
    to: `hsl(${hue}, 80%, 82%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};
