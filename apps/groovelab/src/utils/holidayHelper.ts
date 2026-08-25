import { getItemWithTTL, setItemWithTTL } from './ttlCache';

export interface HolidayRange {
  start: string;
  end: string;
  name: string;
}

const parseICSDate = (icsDateStr: string): Date => {
  const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
  const year = parseInt(cleanStr.substring(0, 4), 10);
  const month = parseInt(cleanStr.substring(4, 6), 10) - 1;
  const day = parseInt(cleanStr.substring(6, 8), 10);

  if (cleanStr.includes('T')) {
    const hour = parseInt(cleanStr.substring(9, 11), 10);
    const min = parseInt(cleanStr.substring(11, 13), 10);
    const sec = parseInt(cleanStr.substring(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  return new Date(year, month, day);
};

const parseICS = (icsText: string): any[] => {
  const events: any[] = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx);
        const value = line.substring(colonIdx + 1);

        if (key.startsWith('SUMMARY')) {
          currentEvent.summary = value;
        } else if (key.startsWith('DESCRIPTION')) {
          currentEvent.description = value.replace(/\\n/g, '\n');
        } else if (key.startsWith('DTSTART')) {
          currentEvent.dtstart = parseICSDate(value);
          currentEvent.isAllDay = !value.includes('T');
        } else if (key.startsWith('DTEND')) {
          currentEvent.dtend = parseICSDate(value);
        } else if (key.startsWith('LOCATION')) {
          currentEvent.location = value;
        }
      }
    }
  }
  return events;
};

// In-memory runtime cache for instantaneous 0ms lookups during same-session navigation
const inMemoryHolidayCache = new Map<string, HolidayRange[]>();

/**
 * Enterprise SSRF Guard: Validates that external URLs do not target private/internal subnets or cloud metadata APIs.
 */
export function isSafeExternalUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();
    // Block loopback, localhost, and cloud metadata endpoint (AWS/GCP/Azure IMDS)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '169.254.169.254') {
      return false;
    }
    // Block RFC 1918 private subnets
    if (/^10\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) || /^192\.168\./.test(hostname)) {
      return false;
    }
    // Block link-local and custom internal names
    if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.lan')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * High-performance holiday loader with 24-hour TTL caching, SSRF validation, and 3.5s fetch timeout.
 * Prevents UI freezes, network waterfalls, and SSRF attacks on dashboard mount.
 */
export async function fetchHolidaysCached(url: string): Promise<HolidayRange[]> {
  if (!url || typeof window === 'undefined') return [];

  // 1. In-memory check
  if (inMemoryHolidayCache.has(url)) {
    return inMemoryHolidayCache.get(url)!;
  }

  // 2. Persistent TTL cache check (24h)
  const cacheKey = `campus_holidays_${encodeURIComponent(url)}`;
  const cachedHolidays = getItemWithTTL<HolidayRange[]>(cacheKey);
  if (cachedHolidays && cachedHolidays.length > 0) {
    inMemoryHolidayCache.set(url, cachedHolidays);
    return cachedHolidays;
  }

  try {
    const urls = (() => {
      try {
        if (url.startsWith('[')) return JSON.parse(url) as string[];
      } catch (e) {}
      if (url.includes(',')) return url.split(',').map(u => u.trim()).filter(Boolean);
      return [url];
    })().filter(isSafeExternalUrl);

    if (urls.length === 0) return [];

    let combinedEvents: any[] = [];

    for (const singleUrl of urls) {
      try {
        let text = '';
        try {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const tId = controller ? setTimeout(() => controller.abort(), 3500) : null;
          const res = await fetch(singleUrl, { signal: controller?.signal });
          if (tId) clearTimeout(tId);
          if (!res.ok) throw new Error();
          text = await res.text();
        } catch (corsErr) {
          const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(singleUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(singleUrl)}`
          ];

          let success = false;
          for (const proxyUrl of proxies) {
            try {
              const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
              const tId = controller ? setTimeout(() => controller.abort(), 3500) : null;
              const res = await fetch(proxyUrl, { signal: controller?.signal });
              if (tId) clearTimeout(tId);
              if (!res.ok) continue;
              if (proxyUrl.includes('allorigins')) {
                const json = await res.json();
                text = json.contents;
              } else {
                text = await res.text();
              }
              if (text && text.includes('BEGIN:VCALENDAR')) {
                success = true;
                break;
              }
            } catch (e) {}
          }
          if (!success) continue;
        }

        if (text) {
          const parsedSingle = parseICS(text);
          combinedEvents = [...combinedEvents, ...parsedSingle];
        }
      } catch (e) {
        console.warn('[HolidayHelper] Error fetching calendar URL:', singleUrl, e);
      }
    }

    if (combinedEvents.length === 0) return [];

    const holidayRanges: HolidayRange[] = combinedEvents
      .filter(ev => {
        const summary = (ev.summary || '').toLowerCase();
        return summary.includes('ferien') || summary.includes('feiertag') || summary.includes('schulfrei');
      })
      .map(ev => {
        const toYYYYMMDD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
        if (ev.dtend && ev.isAllDay) {
          end.setDate(end.getDate() - 1);
        }

        return {
          start: toYYYYMMDD(ev.dtstart),
          end: toYYYYMMDD(end),
          name: ev.summary || 'Ferien'
        };
      });

    if (holidayRanges.length > 0) {
      setItemWithTTL(cacheKey, holidayRanges, 24 * 60 * 60 * 1000);
      inMemoryHolidayCache.set(url, holidayRanges);
    }

    return holidayRanges;
  } catch (err) {
    console.error('[HolidayHelper] Error loading holidays:', err);
    return [];
  }
}
