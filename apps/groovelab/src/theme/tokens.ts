/**
 * 🎨 Campus-Groovelab Enterprise+ Design Token Catalog
 * Single Source of Truth for Apple Squircle Radii, Shadows, Colors & Transitions
 */

export const DESIGN_TOKENS = {
  // 🍏 Apple Squircle Radii Standards
  radii: {
    hero: '28px',
    card: '20px',
    modal: '24px',
    button: '14px',
    input: '12px',
    badge: '8px',
    pill: '9999px',
    circle: '50%'
  },

  // 📏 0,1% Luxury Height Matrix (Apple HIG / Linear Standard)
  heights: {
    chatItem: '82px',       // Großzügige Nachrichten-Zeile mit 48px Avatar & 2-Zeilen-Preview
    entityCard: '88px',     // Der unangefochtene Goldstandard: Schüler-, Termin-, Ferien- & Tagesplan-Karten
    roomCard: '94px',       // Großzügige Raum-Karten mit Headroom & Ausstattungs-Tags
    heroCard: '136px',      // iCal-Abo-Banner, Dashboard-Action-Heros
    metricCard: '128px'     // Master-Admin & Sekretariats-KPIs
  },

  // 🎨 0,1% Standard Borders & Accents
  borders: {
    accentLeft: '4px solid', // Einheitlicher 4px Farbbalken (eliminiert 3px vs. 5px Drift)
    cardBorder: '1px solid #e2e8f0',
    cardBorderHover: '1px solid #cbd5e1'
  },

  // 💡 Studio Diffusion Shadows & Inset Glows
  shadows: {
    appleDiffusion: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',
    appleHover: '0 14px 34px -4px rgba(0, 0, 0, 0.12)',
    modalDrop: '0 24px 60px -12px rgba(0, 0, 0, 0.25)',
    cardSoft: '0 4px 15px rgba(0, 0, 0, 0.04)',
    innerSubtle: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
    innerLightBorder: 'inset 0 1px 0 rgba(255, 255, 255, 0.45)',
    campusGlow: 'none',
    grooveGlow: 'none',
    adminGlow: 'none'
  },

  // 🌈 Module Primary & Surface Colors (12-Ton Notenschnipsel / Boomwhacker Chromatic Standard)
  colors: {
    campus: {
      primary: '#34a853',      // Autoritatives Campus-Grün (Screenshot 1)
      primaryDark: '#137333',
      surface: '#e6f4ea',       // Helle Tonal-Variante von Campus-Grün
      surfaceLight: '#e6f4ea',
      border: 'transparent',
      text: '#137333'
    },
    groovelab: {
      primary: '#facc15',      // Autoritatives GrooveLab-Gelb (Screenshot 2)
      primaryDark: '#854d0e',
      surface: '#fef9c3',       // Helle Tonal-Variante von GrooveLab-Gelb
      surfaceLight: '#fef9c3',
      border: 'transparent',
      text: '#854d0e'
    },
    admin: {
      primary: '#ef4444',      // Note C (Rot)
      primaryDark: '#b91c1c',
      surface: '#fee2e2',
      surfaceLight: '#fee2e2',
      border: 'transparent',
      text: '#b91c1c'
    },
    neutral: {
      bgMain: '#f8fafc',       // Note REST (Pause)
      cardBg: '#ffffff',
      border: 'transparent',
      borderDark: '#94a3b8',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      textDisabled: '#94a3b8'
    },
    notenschnipsel: {
      C:  { solid: '#ef4444', bg: '#fee2e2', text: '#b91c1c' },
      Cs: { solid: '#f87171', bg: '#fee2e2', text: '#b91c1c' },
      D:  { solid: '#f97316', bg: '#ffedd5', text: '#c2410c' },
      Ds: { solid: '#fb923c', bg: '#ffedd5', text: '#c2410c' },
      E:  { solid: '#facc15', bg: '#fef9c3', text: '#854d0e' },
      F:  { solid: '#34a853', bg: '#e6f4ea', text: '#137333' },
      Fs: { solid: '#10b981', bg: '#d1fae5', text: '#047857' },
      G:  { solid: '#06b6d4', bg: '#cffafe', text: '#0e7490' },
      Gs: { solid: '#0ea5e9', bg: '#e0f2fe', text: '#0369a1' },
      A:  { solid: '#3b82f6', bg: '#dbeafe', text: '#1d4ed8' },
      As: { solid: '#6366f1', bg: '#e0e7ff', text: '#4338ca' },
      B:  { solid: '#a855f7', bg: '#f3e8ff', text: '#7e22ce' },
      REST: { solid: '#94a3b8', bg: '#f1f5f9', text: '#475569' }
    }
  },

  // ⏱️ Tactile Physics & Apple Easing Transitions
  transitions: {
    appleSpring: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fast: 'all 0.12s ease',
    bounce: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },

  // 🔤 Typography & Font Stacks
  typography: {
    fontBody: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontHeading: "'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'SF Mono', Monaco, Menlo, Consolas, monospace"
  }
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
