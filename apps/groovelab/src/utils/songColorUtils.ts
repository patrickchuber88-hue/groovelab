/**
 * Autonomous Leaf Utility: Song & Lehrwerk Color Utilities
 * Bounded Context: Independent Leaf UI Helpers
 * Decoupled from studentDateUtils and admin views to eliminate circular chunk deadlocks (TDZ).
 */

export const CANONICAL_LEHRWERK_COLOR = {
  from: '#fee2e2',
  to: '#fee2e2',
  text: '#b91c1c',
  accent: '#ef4444',
  border: 'transparent',
  badgeBg: '#fee2e2',
  badgeText: '#b91c1c',
  shadowFrom: 'rgba(15, 23, 42, 0.04)',
  shadowTo: 'rgba(15, 23, 42, 0.02)'
};

export const getLehrwerkColor = (_title?: string, _customLehrwerkeList?: any[]) => {
  return CANONICAL_LEHRWERK_COLOR;
};

// 100% Solid Single-Color Mapping auf die 12 Notenschnipsel-Tonfarben (BOOMWHACKER_COLORS C bis H + REST)
export const CURATED_ALPHABETICAL_SONG_PALETTE: Record<string, { from: string; to: string; text: string; shadowFrom?: string; shadowTo?: string }> = {
  A: { from: '#dbeafe', to: '#dbeafe', text: '#1d4ed8', shadowFrom: 'none', shadowTo: 'none' }, // Note A (Blau)
  B: { from: '#f3e8ff', to: '#f3e8ff', text: '#7e22ce', shadowFrom: 'none', shadowTo: 'none' }, // Note B/H (Violett)
  C: { from: '#fee2e2', to: '#fee2e2', text: '#b91c1c', shadowFrom: 'none', shadowTo: 'none' }, // Note C (Rot)
  D: { from: '#ffedd5', to: '#ffedd5', text: '#c2410c', shadowFrom: 'none', shadowTo: 'none' }, // Note D (Orange)
  E: { from: '#fef9c3', to: '#fef9c3', text: '#854d0e', shadowFrom: 'none', shadowTo: 'none' }, // Note E (GrooveLab-Gelb hell)
  F: { from: '#e6f4ea', to: '#e6f4ea', text: '#137333', shadowFrom: 'none', shadowTo: 'none' }, // Note F (Campus-Grün hell)
  G: { from: '#cffafe', to: '#cffafe', text: '#0e7490', shadowFrom: 'none', shadowTo: 'none' }, // Note G (Türkis)
  H: { from: '#f3e8ff', to: '#f3e8ff', text: '#7e22ce', shadowFrom: 'none', shadowTo: 'none' }, // Note H (Violett)
  I: { from: '#e0e7ff', to: '#e0e7ff', text: '#4338ca', shadowFrom: 'none', shadowTo: 'none' }, // Note A# (Indigo)
  J: { from: '#d1fae5', to: '#d1fae5', text: '#047857', shadowFrom: 'none', shadowTo: 'none' }, // Note F# (Smaragd)
  K: { from: '#e0f2fe', to: '#e0f2fe', text: '#0369a1', shadowFrom: 'none', shadowTo: 'none' }, // Note G# (Himmelblau)
  L: { from: '#fee2e2', to: '#fee2e2', text: '#b91c1c', shadowFrom: 'none', shadowTo: 'none' }, // Note C# (Hellrot)
  M: { from: '#ffedd5', to: '#ffedd5', text: '#c2410c', shadowFrom: 'none', shadowTo: 'none' }, // Note D# (Hellorange)
  N: { from: '#fef9c3', to: '#fef9c3', text: '#854d0e', shadowFrom: 'none', shadowTo: 'none' }, // Note E (GrooveLab-Gelb hell)
  O: { from: '#e6f4ea', to: '#e6f4ea', text: '#137333', shadowFrom: 'none', shadowTo: 'none' }, // Note F (Campus-Grün hell)
  P: { from: '#d1fae5', to: '#d1fae5', text: '#047857', shadowFrom: 'none', shadowTo: 'none' }, // Note F# (Smaragd)
  Q: { from: '#cffafe', to: '#cffafe', text: '#0e7490', shadowFrom: 'none', shadowTo: 'none' }, // Note G (Türkis)
  R: { from: '#e0f2fe', to: '#e0f2fe', text: '#0369a1', shadowFrom: 'none', shadowTo: 'none' }, // Note G# (Himmelblau)
  S: { from: '#dbeafe', to: '#dbeafe', text: '#1d4ed8', shadowFrom: 'none', shadowTo: 'none' }, // Note A (Blau)
  T: { from: '#e0e7ff', to: '#e0e7ff', text: '#4338ca', shadowFrom: 'none', shadowTo: 'none' }, // Note A# (Indigo)
  U: { from: '#f3e8ff', to: '#f3e8ff', text: '#7e22ce', shadowFrom: 'none', shadowTo: 'none' }, // Note B (Violett)
  V: { from: '#fee2e2', to: '#fee2e2', text: '#b91c1c', shadowFrom: 'none', shadowTo: 'none' }, // Note C (Rot)
  W: { from: '#ffedd5', to: '#ffedd5', text: '#c2410c', shadowFrom: 'none', shadowTo: 'none' }, // Note D (Orange)
  X: { from: '#f1f5f9', to: '#f1f5f9', text: '#475569', shadowFrom: 'none', shadowTo: 'none' }, // Note REST (Pause)
  Y: { from: '#e0e7ff', to: '#e0e7ff', text: '#4338ca', shadowFrom: 'none', shadowTo: 'none' }, // Note A# (Indigo)
  Z: { from: '#e6f4ea', to: '#e6f4ea', text: '#137333', shadowFrom: 'none', shadowTo: 'none' }  // Note F (Campus-Grün hell)
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
  return CURATED_ALPHABETICAL_SONG_PALETTE.C;
};
