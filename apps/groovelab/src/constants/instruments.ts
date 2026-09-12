import { renderInstrumentIcon } from '../utils/instruments';

export const APP_INSTRUMENT_ICONS: Record<string, any> = new Proxy({
  "Musik": "🎼"
} as Record<string, any>, {
  get: (target, prop: string) => {
    if (prop === "Musik") return "🎼";
    if (typeof prop === "string") {
      return renderInstrumentIcon(prop);
    }
    return target[prop];
  }
});

export const APP_INSTRUMENT_COLORS: Record<string, string> = { 
  "Guitar": "#ef4444", 
  "E-Gitarre": "#ef4444",
  "Bass": "#eab308", 
  "E-Bass": "#eab308", 
  "Drums": "#3b82f6", 
  "E-Drums": "#3b82f6", 
  "Vocals": "#34a853", 
  "Piano": "#a855f7", 
  "E-Piano": "#a855f7", 
  "Keys": "#a855f7" 
};

export const brandColor = "#f59e0b"; // Orange (matched with legend)
