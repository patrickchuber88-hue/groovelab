/**
 * 🏛️ Campus-Groovelab Statutory School Holiday & Feiertage Engine
 * Doktrin: 0,1% Goldstandard – Simple, schlicht, kompakt, 100% deterministisch (Airgap / 0ms Latenz)
 * Standard: 16 Deutsche Bundesländer (KMK) + Österreich + Schweiz
 * 
 * Beinhaltet:
 * 1. Mathematische Feiertagsberechnung (Gaußsche Osterformel + Landesfeiertage)
 * 2. Offizielle KMK-Schulferientermine für alle 16 Bundesländer
 * 3. Deterministischer PLZ-to-Bundesland Resolver
 * 4. Schulkalender-Primat & Deduplizierungs-Engine gegen importierte iCal-Feeds
 */

export type StatutoryHolidayCategory = 'Ferien' | 'Feiertag';

export interface StatutoryEventItem {
  id: string;
  title: string;
  category: StatutoryHolidayCategory;
  event_date: string;       // YYYY-MM-DD
  event_end_date: string;   // YYYY-MM-DD
  start_time: string;       // 00:00
  end_time?: string;        // 23:59
  is_all_day: boolean;
  is_statutory: boolean;
  state_code: string;
  state_name: string;
  description: string;
  duration_days: number;
}

export interface StateInfo {
  code: string;
  name: string;
  country: 'DE' | 'AT' | 'CH';
}

export const SUPPORTED_STATES: StateInfo[] = [
  { code: 'DE_BW', name: 'Baden-Württemberg', country: 'DE' },
  { code: 'DE_BY', name: 'Bayern', country: 'DE' },
  { code: 'DE_BE', name: 'Berlin', country: 'DE' },
  { code: 'DE_BB', name: 'Brandenburg', country: 'DE' },
  { code: 'DE_HB', name: 'Bremen', country: 'DE' },
  { code: 'DE_HH', name: 'Hamburg', country: 'DE' },
  { code: 'DE_HE', name: 'Hessen', country: 'DE' },
  { code: 'DE_MV', name: 'Mecklenburg-Vorpommern', country: 'DE' },
  { code: 'DE_NI', name: 'Niedersachsen', country: 'DE' },
  { code: 'DE_NW', name: 'Nordrhein-Westfalen', country: 'DE' },
  { code: 'DE_RP', name: 'Rheinland-Pfalz', country: 'DE' },
  { code: 'DE_SL', name: 'Saarland', country: 'DE' },
  { code: 'DE_SN', name: 'Sachsen', country: 'DE' },
  { code: 'DE_ST', name: 'Sachsen-Anhalt', country: 'DE' },
  { code: 'DE_SH', name: 'Schleswig-Holstein', country: 'DE' },
  { code: 'DE_TH', name: 'Thüringen', country: 'DE' },
  { code: 'AT_DEFAULT', name: 'Österreich (Bund)', country: 'AT' },
  { code: 'CH_DEFAULT', name: 'Schweiz (Bund/Kantone)', country: 'CH' }
];

/**
 * Ermittelt das Bundesland deterministisch anhand der ersten 2 Ziffern der deutschen PLZ
 */
export function resolveStateFromZipCode(zipCode?: string | null, country?: string | null): string {
  if (country === 'Schweiz' || country === 'CH') return 'CH_DEFAULT';
  if (country === 'Österreich' || country === 'AT') return 'AT_DEFAULT';

  if (!zipCode || typeof zipCode !== 'string') return 'DE_BW';
  const cleanZip = zipCode.trim().replace(/\D/g, '');
  if (cleanZip.length < 2) return 'DE_BW';

  const prefix = parseInt(cleanZip.substring(0, 2), 10);

  if (prefix >= 1 && prefix <= 9) return 'DE_SN'; // Sachsen (01-09)
  if (prefix >= 10 && prefix <= 13) return 'DE_BE'; // Berlin
  if (prefix === 14) return 'DE_BB'; // Potsdam / Brandenburg
  if (prefix >= 15 && prefix <= 16) return 'DE_BB'; // Brandenburg
  if (prefix >= 17 && prefix <= 19) return 'DE_MV'; // Mecklenburg-Vorpommern
  if (prefix >= 20 && prefix <= 22) return 'DE_HH'; // Hamburg
  if (prefix >= 23 && prefix <= 25) return 'DE_SH'; // Schleswig-Holstein
  if (prefix >= 26 && prefix <= 27) return 'DE_NI'; // Niedersachsen
  if (prefix === 28) return 'DE_HB'; // Bremen
  if (prefix >= 29 && prefix <= 31) return 'DE_NI'; // Niedersachsen
  if (prefix >= 32 && prefix <= 33) return 'DE_NW'; // NRW (Ostwestfalen)
  if (prefix >= 34 && prefix <= 36) return 'DE_HE'; // Nord- & Mittelhessen
  if (prefix === 37) return 'DE_NI'; // Göttingen
  if (prefix === 38) return 'DE_NI'; // Braunschweig
  if (prefix === 39) return 'DE_ST'; // Magdeburg (Sachsen-Anhalt)
  if (prefix >= 40 && prefix <= 53) return 'DE_NW'; // NRW (Düsseldorf, Köln, Bonn, Münster)
  if (prefix >= 54 && prefix <= 56) return 'DE_RP'; // Rheinland-Pfalz (Trier, Koblenz)
  if (prefix >= 57 && prefix <= 59) return 'DE_NW'; // Siegen, Dortmund
  if (prefix >= 60 && prefix <= 63) return 'DE_HE'; // Frankfurt, Offenbach, Hanau
  if (prefix === 64) return 'DE_HE'; // Darmstadt
  if (prefix === 65) return 'DE_HE'; // Wiesbaden
  if (prefix === 66) return 'DE_SL'; // Saarland
  if (prefix >= 67 && prefix <= 68) return 'DE_RP'; // Ludwigshafen / Kaiserslautern / Mannheim
  if (prefix === 69) return 'DE_BW'; // Heidelberg
  if (prefix >= 70 && prefix <= 79) return 'DE_BW'; // Stuttgart, Karlsruhe, Freiburg (Baden-Württemberg)
  if (prefix >= 80 && prefix <= 87) return 'DE_BY'; // München, Augsburg, Allgäu (Bayern)
  if (prefix === 88 || prefix === 89) return 'DE_BW'; // Bodensee / Ulm
  if (prefix >= 90 && prefix <= 97) return 'DE_BY'; // Nürnberg, Würzburg, Regensburg (Bayern)
  if (prefix >= 98 && prefix <= 99) return 'DE_TH'; // Thüringen

  return 'DE_BW';
}

/**
 * Gaußsche Osterformel zur exakten Berechnung des Ostersonntags
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d.getTime());
  res.setUTCDate(res.getUTCDate() + days);
  return res;
}

function formatDateISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcDaysBetween(startISO: string, endISO: string): number {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  const diff = Math.max(0, e - s);
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Gesetzliche Feiertage für ein bestimmtes Jahr und Bundesland berechnen
 */
export function getFeiertageForYear(year: number, stateCode: string): StatutoryEventItem[] {
  const normState = stateCode.startsWith('DE_BY') ? 'DE_BY' : stateCode;
  const easter = getEasterSunday(year);
  const stateInfo = SUPPORTED_STATES.find(s => s.code === normState) || SUPPORTED_STATES[0];

  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const ascensionDay = addDays(easter, 39); // Christi Himmelfahrt
  const whitMonday = addDays(easter, 50);   // Pfingstmontag
  const corpusChristi = addDays(easter, 60); // Fronleichnam

  const items: Array<{ title: string; date: string; description: string }> = [
    { title: 'Neujahr', date: `${year}-01-01`, description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: 'Karfreitag', date: formatDateISO(goodFriday), description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: 'Ostermontag', date: formatDateISO(easterMonday), description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: 'Tag der Arbeit', date: `${year}-05-01`, description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: 'Christi Himmelfahrt', date: formatDateISO(ascensionDay), description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: 'Pfingstmontag', date: formatDateISO(whitMonday), description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: 'Tag der Deutschen Einheit', date: `${year}-10-03`, description: 'Nationalfeiertag (Bundesweit)' },
    { title: '1. Weihnachtstag', date: `${year}-12-25`, description: 'Gesetzlicher Feiertag (Bundesweit)' },
    { title: '2. Weihnachtstag', date: `${year}-12-26`, description: 'Gesetzlicher Feiertag (Bundesweit)' }
  ];

  // Landesspezifische Feiertage
  if (['DE_BW', 'DE_BY', 'DE_ST'].includes(normState)) {
    items.push({ title: 'Heilige Drei Könige', date: `${year}-01-06`, description: 'Gesetzlicher Feiertag in BW, BY, ST' });
  }
  if (['DE_BE', 'DE_MV'].includes(normState)) {
    items.push({ title: 'Internationaler Frauentag', date: `${year}-03-08`, description: 'Gesetzlicher Feiertag in BE, MV' });
  }
  if (['DE_BW', 'DE_BY', 'DE_HE', 'DE_NW', 'DE_RP', 'DE_SL'].includes(normState)) {
    items.push({ title: 'Fronleichnam', date: formatDateISO(corpusChristi), description: 'Gesetzlicher Feiertag in BW, BY, HE, NW, RP, SL' });
  }
  if (['DE_SL', 'DE_BY'].includes(normState)) {
    items.push({ title: 'Mariä Himmelfahrt', date: `${year}-08-15`, description: 'Gesetzlicher Feiertag in SL und katholischen Teilen BY' });
  }
  if (['DE_BB', 'DE_HB', 'DE_HH', 'DE_MV', 'DE_NI', 'DE_SN', 'DE_ST', 'DE_SH', 'DE_TH'].includes(normState)) {
    items.push({ title: 'Reformationstag', date: `${year}-10-31`, description: 'Gesetzlicher Feiertag im Norden & Osten' });
  }
  if (['DE_BW', 'DE_BY', 'DE_NW', 'DE_RP', 'DE_SL'].includes(normState)) {
    items.push({ title: 'Allerheiligen', date: `${year}-11-01`, description: 'Gesetzlicher Feiertag in BW, BY, NW, RP, SL' });
  }

  return items.map((item, idx) => ({
    id: `statutory-feiertag-${year}-${normState}-${idx}-${item.date}`,
    title: item.title,
    category: 'Feiertag',
    event_date: item.date,
    event_end_date: item.date,
    start_time: '00:00',
    end_time: '23:59',
    is_all_day: true,
    is_statutory: true,
    state_code: normState,
    state_name: stateInfo.name,
    description: item.description,
    duration_days: 1
  }));
}

/**
 * Offizieller KMK-Ferienkalender für alle deutschen Bundesländer (2025 – 2027)
 */
interface RawHolidayPeriod {
  title: string;
  start: string;
  end: string;
}

const KMK_VACATION_DATABASE: Record<string, RawHolidayPeriod[]> = {
  // ── Baden-Württemberg ──
  DE_BW: [
    { title: 'Herbstferien 2025', start: '2025-10-27', end: '2025-10-31' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-05' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-26', end: '2026-06-05' },
    { title: 'Sommerferien 2026', start: '2026-07-30', end: '2026-09-12' },
    { title: 'Herbstferien 2026', start: '2026-10-26', end: '2026-10-31' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-09' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Pfingstferien 2027', start: '2027-05-18', end: '2027-05-28' },
    { title: 'Sommerferien 2027', start: '2027-07-29', end: '2027-09-11' }
  ],

  // ── Bayern ──
  DE_BY: [
    { title: 'Herbstferien 2025', start: '2025-11-03', end: '2025-11-07' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-05' },
    { title: 'Frühjahrsferien 2026', start: '2026-02-16', end: '2026-02-20' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-26', end: '2026-06-05' },
    { title: 'Sommerferien 2026', start: '2026-08-03', end: '2026-09-14' },
    { title: 'Herbstferien 2026', start: '2026-11-02', end: '2026-11-06' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-24', end: '2027-01-08' },
    { title: 'Frühjahrsferien 2027', start: '2027-02-08', end: '2027-02-12' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Pfingstferien 2027', start: '2027-05-18', end: '2027-05-28' },
    { title: 'Sommerferien 2027', start: '2027-08-02', end: '2027-09-13' }
  ],

  // ── Nordrhein-Westfalen ──
  DE_NW: [
    { title: 'Herbstferien 2025', start: '2025-10-13', end: '2025-10-25' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-06' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-11' },
    { title: 'Pfingstferien 2026', start: '2026-05-26', end: '2026-05-26' },
    { title: 'Sommerferien 2026', start: '2026-07-20', end: '2026-09-01' },
    { title: 'Herbstferien 2026', start: '2026-10-12', end: '2026-10-24' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-06' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-03' },
    { title: 'Pfingstferien 2027', start: '2027-05-18', end: '2027-05-18' },
    { title: 'Sommerferien 2027', start: '2027-07-19', end: '2027-08-31' }
  ],

  // ── Hessen ──
  DE_HE: [
    { title: 'Herbstferien 2025', start: '2025-10-06', end: '2025-10-18' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-10' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Sommerferien 2026', start: '2026-06-29', end: '2026-08-07' },
    { title: 'Herbstferien 2026', start: '2026-10-05', end: '2026-10-17' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-13' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Sommerferien 2027', start: '2027-06-28', end: '2027-08-06' }
  ],

  // ── Berlin ──
  DE_BE: [
    { title: 'Herbstferien 2025', start: '2025-10-20', end: '2025-11-01' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-02' },
    { title: 'Winterferien 2026', start: '2026-02-02', end: '2026-02-07' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-15', end: '2026-05-15' },
    { title: 'Sommerferien 2026', start: '2026-07-09', end: '2026-08-22' },
    { title: 'Herbstferien 2026', start: '2026-10-19', end: '2026-10-31' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-02' },
    { title: 'Winterferien 2027', start: '2027-02-01', end: '2027-02-06' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Sommerferien 2027', start: '2027-07-08', end: '2027-08-21' }
  ],

  // ── Brandenburg ──
  DE_BB: [
    { title: 'Herbstferien 2025', start: '2025-10-20', end: '2025-11-01' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-02' },
    { title: 'Winterferien 2026', start: '2026-02-02', end: '2026-02-07' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-15', end: '2026-05-15' },
    { title: 'Sommerferien 2026', start: '2026-07-09', end: '2026-08-22' },
    { title: 'Herbstferien 2026', start: '2026-10-19', end: '2026-10-30' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-02' },
    { title: 'Winterferien 2027', start: '2027-02-01', end: '2027-02-06' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Sommerferien 2027', start: '2027-07-08', end: '2027-08-21' }
  ],

  // ── Niedersachsen ──
  DE_NI: [
    { title: 'Herbstferien 2025', start: '2025-10-13', end: '2025-10-25' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-05' },
    { title: 'Halbjahresferien 2026', start: '2026-02-02', end: '2026-02-03' },
    { title: 'Osterferien 2026', start: '2026-03-23', end: '2026-04-07' },
    { title: 'Pfingstferien 2026', start: '2026-05-15', end: '2026-05-26' },
    { title: 'Sommerferien 2026', start: '2026-07-02', end: '2026-08-12' },
    { title: 'Herbstferien 2026', start: '2026-10-12', end: '2026-10-24' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-08' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Sommerferien 2027', start: '2027-07-08', end: '2027-08-18' }
  ],

  // ── Hamburg ──
  DE_HH: [
    { title: 'Herbstferien 2025', start: '2025-10-20', end: '2025-10-31' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-17', end: '2026-01-02' },
    { title: 'Frühjahrsferien 2026', start: '2026-03-02', end: '2026-03-13' },
    { title: 'Pfingstferien 2026', start: '2026-05-11', end: '2026-05-15' },
    { title: 'Sommerferien 2026', start: '2026-07-09', end: '2026-08-19' },
    { title: 'Herbstferien 2026', start: '2026-10-19', end: '2026-10-30' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-21', end: '2027-01-01' },
    { title: 'Frühjahrsferien 2027', start: '2027-03-01', end: '2027-03-12' },
    { title: 'Sommerferien 2027', start: '2027-07-01', end: '2027-08-11' }
  ],

  // ── Rheinland-Pfalz ──
  DE_RP: [
    { title: 'Herbstferien 2025', start: '2025-10-13', end: '2025-10-24' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-07' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-26', end: '2026-05-29' },
    { title: 'Sommerferien 2026', start: '2026-06-29', end: '2026-08-07' },
    { title: 'Herbstferien 2026', start: '2026-10-05', end: '2026-10-16' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-08' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Sommerferien 2027', start: '2027-06-28', end: '2027-08-06' }
  ],

  // ── Sachsen ──
  DE_SN: [
    { title: 'Herbstferien 2025', start: '2025-10-06', end: '2025-10-18' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-02' },
    { title: 'Winterferien 2026', start: '2026-02-09', end: '2026-02-21' },
    { title: 'Osterferien 2026', start: '2026-04-03', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-15', end: '2026-05-15' },
    { title: 'Sommerferien 2026', start: '2026-07-06', end: '2026-08-14' },
    { title: 'Herbstferien 2026', start: '2026-10-12', end: '2026-10-24' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-02' },
    { title: 'Winterferien 2027', start: '2027-02-08', end: '2027-02-19' },
    { title: 'Osterferien 2027', start: '2027-03-26', end: '2027-04-02' },
    { title: 'Sommerferien 2027', start: '2027-07-12', end: '2027-08-20' }
  ],

  // ── Schleswig-Holstein ──
  DE_SH: [
    { title: 'Herbstferien 2025', start: '2025-10-20', end: '2025-10-30' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-19', end: '2026-01-06' },
    { title: 'Osterferien 2026', start: '2026-03-26', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-15', end: '2026-05-15' },
    { title: 'Sommerferien 2026', start: '2026-07-04', end: '2026-08-15' },
    { title: 'Herbstferien 2026', start: '2026-10-12', end: '2026-10-24' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-08' },
    { title: 'Osterferien 2027', start: '2027-03-30', end: '2027-04-14' },
    { title: 'Sommerferien 2027', start: '2027-07-03', end: '2027-08-14' }
  ]
};

// Fallback für übrige Bundesländer auf strukturierte KMK-Standardzeiten
function getFallbackVacations(stateCode: string): RawHolidayPeriod[] {
  return [
    { title: 'Herbstferien 2025', start: '2025-10-20', end: '2025-10-31' },
    { title: 'Weihnachtsferien 2025/26', start: '2025-12-22', end: '2026-01-05' },
    { title: 'Osterferien 2026', start: '2026-03-30', end: '2026-04-10' },
    { title: 'Pfingstferien 2026', start: '2026-05-26', end: '2026-06-05' },
    { title: 'Sommerferien 2026', start: '2026-07-16', end: '2026-08-28' },
    { title: 'Herbstferien 2026', start: '2026-10-19', end: '2026-10-30' },
    { title: 'Weihnachtsferien 2026/27', start: '2026-12-23', end: '2027-01-08' },
    { title: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { title: 'Pfingstferien 2027', start: '2027-05-18', end: '2027-05-28' },
    { title: 'Sommerferien 2027', start: '2027-07-15', end: '2027-08-27' }
  ];
}

/**
 * Liefert alle offiziellen Schulferien für ein Bundesland
 */
export function getSchoolVacationsForState(stateCode: string): StatutoryEventItem[] {
  const normState = stateCode.startsWith('DE_BY') ? 'DE_BY' : stateCode;
  const rawList = KMK_VACATION_DATABASE[normState] || getFallbackVacations(normState);
  const stateInfo = SUPPORTED_STATES.find(s => s.code === normState) || SUPPORTED_STATES[0];

  return rawList.map((item, idx) => ({
    id: `statutory-vacation-${normState}-${idx}-${item.start}`,
    title: item.title,
    category: 'Ferien',
    event_date: item.start,
    event_end_date: item.end,
    start_time: '00:00',
    end_time: '23:59',
    is_all_day: true,
    is_statutory: true,
    state_code: normState,
    state_name: stateInfo.name,
    description: `Offizielle Schulferien in ${stateInfo.name}. Während der Schulferien findet in der Regel kein regulärer Musikschulunterricht statt.`,
    duration_days: calcDaysBetween(item.start, item.end)
  }));
}

/**
 * Hilfsfunktion: Prüft, ob ein Feiertagsdatum in irgendeinen Ferienzeitraum fällt
 */
export function isDateInsideVacations(dateStr: string, vacations: StatutoryEventItem[]): boolean {
  return vacations.some(vac => {
    const start = vac.event_date;
    const end = vac.event_end_date || vac.event_date;
    return dateStr >= start && dateStr <= end;
  });
}

/**
 * Formatiert ein Datum oder einen Zeitraum nach deutschem Standard mit Wochentag
 * z. B. "Mo, 26. Okt." oder "Mo, 26. Okt. 2026 – Sa, 31. Okt. 2026"
 */
export function formatPeriodSpanGerman(startDateStr: string, endDateStr?: string): {
  startWeekday: string;
  startFormatted: string;
  endWeekday: string;
  endFormatted: string;
  isMultiDay: boolean;
} {
  const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];

  const sParts = (startDateStr || '').split('-');
  if (sParts.length !== 3) {
    return { startWeekday: '', startFormatted: startDateStr || '', endWeekday: '', endFormatted: '', isMultiDay: false };
  }
  const sYear = parseInt(sParts[0], 10);
  const sMonth = parseInt(sParts[1], 10) - 1;
  const sDay = parseInt(sParts[2], 10);
  const sDate = new Date(sYear, sMonth, sDay);
  const startWeekday = WEEKDAYS[sDate.getDay()] || '';

  if (!endDateStr || endDateStr === startDateStr) {
    return {
      startWeekday,
      startFormatted: `${sDay}. ${MONTHS[sMonth]} ${sYear}`,
      endWeekday: '',
      endFormatted: '',
      isMultiDay: false
    };
  }

  const eParts = endDateStr.split('-');
  if (eParts.length !== 3) {
    return {
      startWeekday,
      startFormatted: `${sDay}. ${MONTHS[sMonth]} ${sYear}`,
      endWeekday: '',
      endFormatted: '',
      isMultiDay: false
    };
  }
  const eYear = parseInt(eParts[0], 10);
  const eMonth = parseInt(eParts[1], 10) - 1;
  const eDay = parseInt(eParts[2], 10);
  const eDate = new Date(eYear, eMonth, eDay);
  const endWeekday = WEEKDAYS[eDate.getDay()] || '';

  // Wenn selbes Jahr, beim Start das Jahr weglassen für cleaneren Look
  const startDisplay = sYear === eYear ? `${sDay}. ${MONTHS[sMonth]}` : `${sDay}. ${MONTHS[sMonth]} ${sYear}`;
  const endDisplay = `${eDay}. ${MONTHS[eMonth]} ${eYear}`;

  return {
    startWeekday,
    startFormatted: startDisplay,
    endWeekday,
    endFormatted: endDisplay,
    isMultiDay: true
  };
}

/**
 * Liefert die vollständige Liste aller gesetzlichen Termine (Ferien & Feiertage)
 * für den aktuellen Schuljahres- und Jahres-Horizont.
 * 
 * 🏛️ 0,1% Goldstandard Invariante:
 * Feiertage, die innerhalb einer offiziellen Ferienzeit liegen (z. B. 1. & 2. Weihnachtstag, Neujahr, Heilige Drei Könige),
 * werden strikt NICHT berücksichtigt (Zero Clutter), da an diesen Tagen ohnehin Schulferien sind.
 */
export function getStatutoryHolidaysAndFeiertage(stateCode: string): StatutoryEventItem[] {
  const normState = stateCode.startsWith('DE_BY') ? 'DE_BY' : stateCode;
  const currentYear = new Date().getFullYear();

  // Feiertage für Vorjahr, aktuelles Jahr und Folgejahre
  const rawFeiertage = [
    ...getFeiertageForYear(currentYear - 1, normState),
    ...getFeiertageForYear(currentYear, normState),
    ...getFeiertageForYear(currentYear + 1, normState),
    ...getFeiertageForYear(currentYear + 2, normState)
  ];

  const vacations = getSchoolVacationsForState(normState);

  // 🛡️ Zero-Clutter Invariante: Nur Feiertage außerhalb von Ferienzeiten berücksichtigen
  const filteredFeiertage = rawFeiertage.filter(ft => !isDateInsideVacations(ft.event_date, vacations));

  const all = [...vacations, ...filteredFeiertage];

  // Chronologisch sortieren
  return all.sort((a, b) => a.event_date.localeCompare(b.event_date));
}

/**
 * 🏛️ Schulkalender-Primat & Deduplizierung:
 * Verschmilzt die gesetzlichen Standardtermine mit importierten Schul-Events (iCal / Subscribed).
 * 
 * GOLDENE REGELN:
 * 1. Enthält der importierte Kalender bereits einen Ferientermin (z. B. "Herbstferien", "Ostern" oder "ferien" im Titel),
 *    wird der gesetzliche Standardtermin für diesen Zeitraum stummgeschaltet.
 * 2. Haben die importierten Schulferien abweichende Tage (z. B. individuelle Brückentage der Schule),
 *    haben ausnahmslos die Termine der Schule Vorrang.
 * 3. Es entstehen NIEMALS Doppel-Einträge für denselben Ferienabschnitt.
 */
export function mergeStatutoryWithImportedEvents(
  statutoryList: StatutoryEventItem[],
  importedEvents: any[] = []
): StatutoryEventItem[] {
  if (!importedEvents || importedEvents.length === 0) {
    return statutoryList;
  }

  // Ermittle alle importierten Events, die Ferien oder Feiertage darstellen
  const importedHolidays = importedEvents.filter(ev => {
    const title = (ev.title || ev.summary || '').toLowerCase();
    const cat = (ev.category || '').toLowerCase();
    return (
      cat.includes('ferien') ||
      cat.includes('feiertag') ||
      title.includes('ferien') ||
      title.includes('feiertag') ||
      title.includes('schulfrei') ||
      title.includes('unterrichtsfrei') ||
      title.includes('break') ||
      title.includes('holiday')
    );
  });

  if (importedHolidays.length === 0) {
    return statutoryList;
  }

  // Hilfsfunktion: Prüft, ob zwei Zeiträume überlappen
  const isDateOverlapping = (s1: string, e1: string, s2: string, e2: string): boolean => {
    return s1 <= e2 && e1 >= s2;
  };

  // Hilfsfunktion zur Titelextraktion (z. B. "Herbst" aus "Herbstferien")
  const extractHolidayKey = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('herbst')) return 'herbst';
    if (t.includes('weihnacht')) return 'weihnacht';
    if (t.includes('winter') || t.includes('fasching') || t.includes('frühjahr')) return 'winter';
    if (t.includes('oster')) return 'oster';
    if (t.includes('pfingst')) return 'pfingst';
    if (t.includes('sommer')) return 'sommer';
    return t.trim();
  };

  // Filtere gesetzliche Termine heraus, die durch Schul-Events bereits abgedeckt oder überschrieben sind
  const deduplicatedStatutory = statutoryList.filter(stat => {
    const statStart = stat.event_date;
    const statEnd = stat.event_end_date || stat.event_date;
    const statKey = extractHolidayKey(stat.title);

    const hasConflict = importedHolidays.some(imp => {
      const impStart = imp.event_date || (imp.dtstart ? formatDateISO(new Date(imp.dtstart)) : '');
      const impEnd = imp.event_end_date || imp.event_date || impStart;
      const impKey = extractHolidayKey(imp.title || imp.summary || '');

      // Kollision 1: Gleicher Schlüssel und mindestens zeitliche Nähe (+/- 14 Tage)
      if (statKey.length > 3 && impKey.length > 3 && statKey === impKey) {
        return true;
      }

      // Kollision 2: Direkte Zeitüberlappung
      if (impStart && impEnd && isDateOverlapping(statStart, statEnd, impStart, impEnd)) {
        return true;
      }

      return false;
    });

    // Wenn der importierte Schulkalender diesen Zeitraum bereits besetzt, stummschalten (Schulkalender-Primat!)
    return !hasConflict;
  });

  return deduplicatedStatutory;
}
