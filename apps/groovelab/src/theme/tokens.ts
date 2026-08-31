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

  // 💡 Studio Diffusion Shadows & Inset Glows
  shadows: {
    appleDiffusion: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',
    appleHover: '0 14px 34px -4px rgba(0, 0, 0, 0.12)',
    modalDrop: '0 24px 60px -12px rgba(0, 0, 0, 0.25)',
    cardSoft: '0 4px 15px rgba(0, 0, 0, 0.04)',
    innerSubtle: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
    innerLightBorder: 'inset 0 1px 0 rgba(255, 255, 255, 0.45)',
    campusGlow: '0 0 16px rgba(52, 168, 83, 0.25)',
    grooveGlow: '0 0 16px rgba(234, 179, 8, 0.25)',
    adminGlow: '0 0 16px rgba(234, 67, 53, 0.25)'
  },

  // 🌈 Module Primary & Surface Colors
  colors: {
    campus: {
      primary: '#34a853',
      primaryDark: '#15803d',
      surface: '#e6f4ea',
      surfaceLight: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534'
    },
    groovelab: {
      primary: '#eab308',
      primaryDark: '#ca8a04',
      surface: '#fefce8',
      surfaceLight: '#fffbeb',
      border: '#fde047',
      text: '#854d0e'
    },
    admin: {
      primary: '#ea4335',
      primaryDark: '#dc2626',
      surface: '#fce8e6',
      surfaceLight: '#fef2f2',
      border: '#fecaca',
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
