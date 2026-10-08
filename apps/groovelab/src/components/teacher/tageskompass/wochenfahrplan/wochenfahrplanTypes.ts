export interface DidacticFocusItem {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  phrase: string;
  keywords: string[];
}

export const DIDACTIC_FOCUS_LIST: DidacticFocusItem[] = [
  { id: 'fingersatz', icon: '🖐️', label: 'Fingersatz', subtitle: 'Technik & Handhaltung', phrase: 'Auf den richtigen Fingersatz achten', keywords: ['fingersatz', 'handhaltung'] },
  { id: 'rhythmus', icon: '🥁', label: 'Rhythmus', subtitle: 'Groove & Zählen', phrase: 'Rhythmus laut mitzählen und Groove halten', keywords: ['rhythmus', 'groove', 'takt zählen', 'mitzählen'] },
  { id: 'slowmo', icon: '🐢', label: 'Slow-Mo', subtitle: 'Langsames Üben & Isolieren', phrase: 'Langsam üben und schwierige Stellen 5x isolieren', keywords: ['slow-mo', 'slowmo', 'slow practice', 'langsam üben', 'schwierige stellen isolieren'] },
  { id: 'dynamik', icon: '🔊', label: 'Dynamik', subtitle: 'Ausdruck & Klangqualität', phrase: 'Dynamik und saubere Betonung beachten', keywords: ['dynamik', 'klangqualität', 'laut/leise', 'betonung'] },
  { id: 'auswendig', icon: '🧠', label: 'Auswendig', subtitle: 'Struktur & Gedächtnis', phrase: 'Ablauf auswendig versuchen', keywords: ['auswendig', 'gedächtnis', 'ohne noten'] }
];

export function extractActiveDidacticTags(text?: string | null): DidacticFocusItem[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return DIDACTIC_FOCUS_LIST.filter(f => 
    lower.includes(f.phrase.toLowerCase()) ||
    lower.includes(`fokus: ${f.label.toLowerCase()}`) ||
    lower.includes(f.label.toLowerCase()) ||
    f.keywords.some(kw => lower.includes(kw.toLowerCase()))
  );
}

export interface WochenFahrplanAudioTrack {
  url: string;
  label?: string;
  duration?: number;
  bpm?: number;
  date?: string;
  isTeacher?: boolean;
}

export function parseHomeworkAudioNotes(notes: any[]): WochenFahrplanAudioTrack[] {
  if (!Array.isArray(notes)) return [];
  const tracks: WochenFahrplanAudioTrack[] = [];
  const seenUrls = new Set<string>();

  notes
    .map((note) => (typeof note === 'string' ? note : String(note || '')))
    .filter(n => n.includes('AUDIO:'))
    .forEach((raw) => {
      const cleanStr = raw.startsWith('[') ? raw.replace(/[\[\]"]/g, '') : raw;
      const audioContent = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6);
      const parts = audioContent.split('|');
      const url = parts[0]?.replace(/^["']|["']$/g, '').trim();
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);

      const duration = parseInt(parts[1] || '0', 10);
      const date = parts[2]?.trim();
      const label = parts[3]?.trim() || `Aufnahme #${tracks.length + 1}`;
      let bpm: number | undefined = undefined;
      const bpmMatch = audioContent.match(/BPM:(\d+)/);
      if (bpmMatch && bpmMatch[1]) {
        bpm = parseInt(bpmMatch[1], 10);
      }
      tracks.push({ url, duration, date, label, bpm, isTeacher: true });
    });

  return tracks;
}

export interface LehrwerkReference {
  title: string;
  pages: number[];
  notes?: string;
}

export function parseHomeworkLehrwerke(notes: any[]): LehrwerkReference[] {
  if (!Array.isArray(notes)) return [];
  const results: LehrwerkReference[] = [];
  notes.forEach((note) => {
    const str = typeof note === 'string' ? note : '';
    if (str.startsWith('LEHRWERK:')) {
      const payload = str.replace('LEHRWERK:', '').trim();
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.title) {
          results.push({
            title: parsed.title,
            pages: Array.isArray(parsed.pages) ? parsed.pages : [],
            notes: parsed.notes
          });
        }
      } catch {
        const parts = payload.split('|');
        if (parts[0]) {
          results.push({
            title: parts[0],
            pages: parts[1] ? parts[1].split(',').map(Number).filter(n => !isNaN(n)) : []
          });
        }
      }
    }
  });
  return results;
}
