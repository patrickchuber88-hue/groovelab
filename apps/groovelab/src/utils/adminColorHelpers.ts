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

export const getLehrwerkColor = (title: string, lehrwerkeList: any[] = []) => {
  const trimmed = (title || '').trim();
  const sorted = [...lehrwerkeList].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
  
  if (index !== -1 && sorted.length > 0) {
    const position = index % 26;
    const hue = Math.round((position / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  }

  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 94%)`,
    to: `hsl(${hue}, 80%, 84%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};

export const getSongColor = (title: string) => {
  const trimmed = (title || '').trim();
  const firstChar = trimmed.charAt(0).toUpperCase();
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
