import { renderInstrumentIcon } from '../utils/instruments';

export const APP_INSTRUMENT_ICONS: Record<string, any> = { 
  "Gitarre": renderInstrumentIcon("Gitarre"), 
  "Guitar": renderInstrumentIcon("Guitar"), 
  "E-Gitarre": renderInstrumentIcon("E-Gitarre"),
  "Bass": renderInstrumentIcon("Bass"), 
  "E-Bass": renderInstrumentIcon("E-Bass"), 
  "Drums": renderInstrumentIcon("Drums"), 
  "E-Drums": renderInstrumentIcon("E-Drums"), 
  "Vocals": renderInstrumentIcon("Vocals"), 
  "Gesang": renderInstrumentIcon("Gesang"),
  "Piano / Keys": renderInstrumentIcon("Keys"), 
  "Piano": renderInstrumentIcon("Piano"), 
  "E-Piano": renderInstrumentIcon("E-Piano"), 
  "Keys": renderInstrumentIcon("Keys"),
  "Musik": "🎼"
};

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
