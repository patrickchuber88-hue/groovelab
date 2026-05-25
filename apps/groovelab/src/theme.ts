export const defaultTheme = {
  background: '#ffffff', // white
  text: '#1e293b', // anthracite
  muted: '#64748b', // grayish text
  accent: '#f59e0b', // yellow
  border: '#e5e7eb' // light gray border
};

/**
 * Apply a theme by setting CSS variables on the root element.
 * Pass a partial theme to override specific values.
 */
export const applyTheme = (theme: Partial<typeof defaultTheme> = {}) => {
  const root = document.documentElement;
  const merged = { ...defaultTheme, ...theme } as typeof defaultTheme;
  Object.entries(merged).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
};

/** Reset to the default standard theme */
export const resetToStandardTheme = () => {
  applyTheme();
};

// Initialize with the standard theme on load
if (typeof window !== 'undefined') {
  resetToStandardTheme();
}
