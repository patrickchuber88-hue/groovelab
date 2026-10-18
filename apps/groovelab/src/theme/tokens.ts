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

  // 🌈 Module Primary & Surface Colors (Apple 2-Farben-Standard: border: 'transparent' bei getönten Flächen)
  colors: {
    campus: {
      primary: '#34a853',
      primaryDark: '#15803d',
      surface: 'rgba(52, 168, 83, 0.10)',
      surfaceLight: '#f0fdf4',
      border: 'transparent',
      text: '#166534'
    },
    groovelab: {
      primary: '#eab308',
      primaryDark: '#ca8a04',
      surface: 'rgba(234, 179, 8, 0.12)',
      surfaceLight: '#fffbeb',
      border: 'transparent',
      text: '#854d0e'
    },
    admin: {
      primary: '#ea4335',
      primaryDark: '#dc2626',
      surface: 'rgba(234, 67, 53, 0.10)',
      surfaceLight: '#fef2f2',
      border: 'transparent',
      text: '#991b1b'
    },
    neutral: {
      bgMain: '#f8fafc',
      cardBg: '#ffffff',
      border: '#e2e8f0',
      borderDark: '#cbd5e1',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      textDisabled: '#94a3b8'
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
