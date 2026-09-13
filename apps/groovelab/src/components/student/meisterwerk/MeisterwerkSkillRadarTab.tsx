import React, { useRef, useState } from "react";
import { 
  Target, ChevronDown, BarChart2, Info, Award, Compass, Sparkles, Scale, 
  Clock3, Zap, Music, BookOpen, Calendar, Edit3, CheckCircle2, HelpCircle, 
  Mic, FileText, Check 
} from "lucide-react";
import { getISOWeek, getSimulatedNow, getItemWeek, getSongColor, getLehrwerkColor } from "../studentDateUtils";
import { SKILL_TAGS } from "../meisterwerk.types";
import { cleanNotesText, isInternalMetadataNote } from "../../../domain/stickersAndTresor";
import { SkillRadarPentagon } from "../../common/SkillRadarPentagon";
import { SkillDetailSheetModal } from "./SkillDetailSheetModal";

export const getSkillMonochromeIcon = (key: string, size = 15) => {
  switch (key) {
    case 'rhythmus':
      return <Clock3 size={size} />;
    case 'technik':
      return <Zap size={size} />;
    case 'klang':
      return <Music size={size} />;
    case 'ausdruck':
      return <Sparkles size={size} />;
    case 'repertoire':
      return <BookOpen size={size} />;
    default:
      return <Compass size={size} />;
  }
};

export interface MeisterwerkSkillRadarTabProps {
  progressItems: any[];
  generalHomeworkNotes?: string;
  latestGeneralHomeworkNotesRef?: React.RefObject<string>;
  homeworkNotes?: string;
  homeworkNotesList?: any[];
  skillOverrides: Record<string, number>;
  pendingTargetFocusTags: string[];
  readOnly?: boolean;
  isTeacherTools?: boolean;
  isMobileView: boolean;
  useNotebookLayout?: boolean;
  uiLevel?: 'junior' | 'teen' | 'pro';
  teacherName?: string;
  studentName?: string;
  instrumentName?: string;
  handleMasterAllSkills: () => void;
  handleTriggerSkillQuest: (tagKey: string) => void;
  handleSetSkillLevel: (tagKey: string, targetLevel: number) => void;
  renderTextWithDidacticBadges: (text: string) => React.ReactNode;
}

export const MeisterwerkSkillRadarTab: React.FC<MeisterwerkSkillRadarTabProps> = ({
  progressItems,
  generalHomeworkNotes,
  latestGeneralHomeworkNotesRef = { current: "" },
  homeworkNotes,
  homeworkNotesList,
  skillOverrides,
  pendingTargetFocusTags,
  readOnly,
  isTeacherTools,
  isMobileView,
  useNotebookLayout = false,
  uiLevel = 'teen',
  teacherName,
  studentName,
  instrumentName,
  handleMasterAllSkills,
  handleTriggerSkillQuest,
  handleSetSkillLevel,
  renderTextWithDidacticBadges
}) => {
  const radarAnalysisCardsRef = useRef<HTMLDivElement | null>(null);
  const [selectedSkillForModal, setSelectedSkillForModal] = useState<string | null>(null);

    const feedbackEntries = (progressItems || [])
      .map((item: any) => {
        try {
          const notes: string[] = JSON.parse(item.homework_notes || '[]');
          const fbStr = notes.find(n => n.startsWith('FEEDBACK:'));
          if (!fbStr) return null;
          return JSON.parse(fbStr.substring(9));
        } catch { return null; }
      })
      .filter(Boolean)
      .slice(0, 12);

    const currentWeekStr = getISOWeek();
    const allActiveNotesText = [
      generalHomeworkNotes || '',
      latestGeneralHomeworkNotesRef.current || '',
      homeworkNotes || '',
      ...(homeworkNotesList || []),
      ...((progressItems || [])
        .filter((item: any) => item.is_current_homework && (item.updated_at ? getISOWeek(item.updated_at) === currentWeekStr : true))
        .map((item: any) => item.homework_notes || ''))
    ].join(' ');

    const counts = SKILL_TAGS.map(tag => {
      let level = skillOverrides[tag.key];

      if (typeof level !== 'number' || level < 1 || level > 5) {
        // Standardmässig Stufe 1 (Fundament 🌱) als didaktische Basis-Geometrie für maximale Progression
        level = 1;
      }

      const pct = Math.max(0.20, level / 5);
      
      const rankTitle = 
        tag.key === 'rhythmus' ? (level === 5 ? 'Groove-Meister' : (level === 4 ? 'Timing-Sicher' : (level === 3 ? 'Puls-Entdecker' : (level === 2 ? 'Rhythmus-Aufbau' : 'Rhythmus-Fundament')))) :
        tag.key === 'technik' ? (level === 5 ? 'Meister-Virtuose' : (level === 4 ? 'Feinmotoriker' : (level === 3 ? 'Technik-Aufsteiger' : (level === 2 ? 'Technik-Aufbau' : 'Technik-Fundament')))) :
        tag.key === 'intonation' ? (level === 5 ? 'Klang-Künstler' : (level === 4 ? 'Klang-Bewusst' : (level === 3 ? 'Klang-Gestalter' : (level === 2 ? 'Klang-Aufbau' : 'Klang-Fundament')))) :
        tag.key === 'ausdruck' ? (level === 5 ? 'Bühnen-Magier' : (level === 4 ? 'Ausdrucksstark' : (level === 3 ? 'Gefühls-Pionier' : (level === 2 ? 'Ausdruck-Aufbau' : 'Ausdrucks-Fundament')))) :
        (level === 5 ? 'Repertoire-Profi' : (level === 4 ? 'Spielfluss-Star' : (level === 3 ? 'Song-Entdecker' : (level === 2 ? 'Song-Aufbau' : 'Repertoire-Fundament'))));

      return {
        ...tag,
        baseInterventions: 0,
        interventions: 5 - level,
        count: level,
        level,
        pct,
        rankTitle
      };
    });

    const tagCounts = counts;

    // Single Source of Truth: Aktive Wochenschwerpunkte (dynamisch alle gesetzten Tags)
    const activeWeeklyTargetTags = SKILL_TAGS.filter(tag => {
      if (pendingTargetFocusTags.includes(tag.key)) return true;
      const cleanNotes = allActiveNotesText.trim();
      if (!cleanNotes) return false;
      const lowerText = cleanNotes.toLowerCase();
      if (tag.key === 'rhythmus' && (lowerText.includes('#rhythmus') || lowerText.includes('#timing'))) return true;
      if (tag.key === 'technik' && (lowerText.includes('#technik') || lowerText.includes('#motorik') || lowerText.includes('#fingersatz'))) return true;
      if (tag.key === 'intonation' && (lowerText.includes('#klang') || lowerText.includes('#intonation') || lowerText.includes('#tonkultur'))) return true;
      if (tag.key === 'ausdruck' && (lowerText.includes('#ausdruck') || lowerText.includes('#dynamik') || lowerText.includes('#phrasierung'))) return true;
      if (tag.key === 'repertoire' && (lowerText.includes('#repertoire') || lowerText.includes('#konzert') || lowerText.includes('#bühne') || lowerText.includes('#song') || lowerText.includes('#stück'))) return true;
      return false;
    }).map(t => t.key);

    const topStrength = tagCounts.find(t => t.level >= 4) || tagCounts[0];
    const currentFocus = tagCounts.find(t => activeWeeklyTargetTags.includes(t.key)) || tagCounts[0];

    const customTagCounts: { key: string; count: number }[] = [];
    feedbackEntries.forEach((fb: any) => {
      if (Array.isArray(fb.tags)) {
        fb.tags.forEach((t: string) => {
          if (!SKILL_TAGS.some(st => st.key === t)) {
            const existing = customTagCounts.find(c => c.key === t);
            if (existing) {
              existing.count++;
            } else {
              customTagCounts.push({ key: t, count: 1 });
            }
          }
        });
      }
    });

    const isMobileOrTabletView = isMobileView;
    return (
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: isMobileOrTabletView ? 'column' : 'row', overflowY: isMobileOrTabletView ? 'auto' : 'hidden', background: useNotebookLayout ? '#fcfaf7' : '#ffffff' }} className="modal-content-container custom-scrollbar">
        {/* LINKE BUCHSEITE: 5-PENTAGON KOMPETENZ-RADAR */}
        <div style={{
          flex: isMobileOrTabletView ? 'none' : '1.1 1 0%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRight: isMobileOrTabletView ? 'none' : '1px solid #e8e8ed',
          borderBottom: isMobileOrTabletView ? '1.5px solid #e8e8ed' : 'none',
          padding: isMobileOrTabletView ? '16px 14px' : '20px 24px',
          position: 'relative',
          background: '#ffffff',
          gap: '14px',
          overflowY: 'auto'
        }}>
          {/* Apple Glassmorphic Legend Pill */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '8px 18px',
            fontSize: '0.84rem',
            fontWeight: 750,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid #e2e8f0',
            borderRadius: '100px',
            boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 5
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
              <Target size={14} className="text-slate-800" />
              <span>{uiLevel === 'junior' ? 'Sternen-Wochenfokus' : 'Aktiver Wochenfokus'}</span>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
              <Award size={14} className="text-slate-800" />
              <span>{uiLevel === 'junior' ? 'Meister-Zauberer' : 'Meisterstufe (Stufe 5)'}</span>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ color: '#475569', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Compass size={14} className="text-slate-500" />
              <span>{uiLevel === 'junior' ? 'Tippe auf eine Spitze für deinen Zaubertipp!' : 'Stufen 1–5: Förder-Entwicklungsraster'}</span>
            </span>
          </div>

          {/* Screenreader Accessible Data Table (WCAG 2.2 AA) */}
          <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }} aria-live="polite">
            <table>
              <caption>Musikalische Fähigkeiten und Wochen-Lernziele (5 Säulen)</caption>
              <thead>
                <tr>
                  <th scope="col">Musikalische Säule</th>
                  <th scope="col">Aktuelle Stufe</th>
                  <th scope="col">Status-Titel</th>
                  <th scope="col">Wochenschwerpunkt</th>
                </tr>
              </thead>
              <tbody>
                {tagCounts.map(tag => (
                  <tr key={tag.key}>
                    <td>{tag.label}</td>
                    <td>Stufe {tag.level} von 5</td>
                    <td>{tag.rankTitle}</td>
                    <td>{activeWeeklyTargetTags.includes(tag.key) ? 'Aktiver Wochenschwerpunkt' : 'Reguläre Übung'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Harmonisiertes SVG Radar Center Container (Single Source of Truth Component) */}
          <div style={{
            margin: 'auto 0',
            width: '100%',
            maxWidth: isMobileOrTabletView ? '360px' : '440px',
            maxHeight: isMobileOrTabletView ? '360px' : '440px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <SkillRadarPentagon
              levels={skillOverrides}
              activeFocusTags={activeWeeklyTargetTags}
              size={isMobileOrTabletView ? 'compact' : 'normal'}
              uiLevel={uiLevel}
              studentName={studentName}
              instrumentName={instrumentName}
              showVignette={false}
              onSkillClick={(tagKey) => {
                setSelectedSkillForModal(tagKey);
                if (handleTriggerSkillQuest) {
                  handleTriggerSkillQuest(tagKey);
                }
              }}
            />
          </div>

          {/* VORWOCHEN-RÜCKBLICK & LEHRER-STUNDENEINSTIEG */}
          {(!readOnly || isTeacherTools) && (() => {
            const now = getSimulatedNow();
            const currentWeekStr = getISOWeek(now);

            // 1. Alle Hausaufgaben-Snapshots sammeln
            const allHwItems = (progressItems || []).filter((item: any) => 
              item?.topic_name && item.topic_name.startsWith('Hausaufgabe KW ')
            );

            // 2. Chronologisch absteigend sortieren
            allHwItems.sort((a: any, b: any) => {
              const wA = getItemWeek(a);
              const wB = getItemWeek(b);
              if (wA !== wB) return (wB || '').localeCompare(wA || '');
              const tA = new Date(a.updated_at || a.created_at || 0).getTime();
              const tB = new Date(b.updated_at || b.created_at || 0).getTime();
              return tB - tA;
            });

            // 3. Letzte Hausaufgabe vor der aktuellen Woche suchen (pastItem)
            const pastItem = allHwItems.find((item: any) => getItemWeek(item) < currentWeekStr);
            const prevWeekItem = pastItem || allHwItems[0] || null;

            if (!prevWeekItem) {
              return (
                <div style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '14px 16px',
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                  zIndex: 5
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    <Calendar size={16} className="text-slate-800" />
                    <span>Vorwochen-Check-In & Stundeneinstieg</span>
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Music size={18} className="text-slate-500 shrink-0" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                        Bereit für den neuen Stundeneinstieg
                      </span>
                      <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 550 }}>
                        Wähle ein Stück oder Lehrwerk aus, um die heutige Einheit zu beginnen.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {SKILL_TAGS.map(t => {
                      const isTarget = activeWeeklyTargetTags.includes(t.key);
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => handleTriggerSkillQuest(t.key)}
                          aria-label={`Fokus ${t.label} für heute setzen`}
                          style={{
                            background: isTarget ? '#fefce8' : '#f8fafc',
                            border: `1px solid ${isTarget ? '#fde047' : '#e2e8f0'}`,
                            color: isTarget ? '#854d0e' : '#475569',
                            borderRadius: '100px',
                            padding: '6px 12px',
                            minHeight: '34px',
                            fontSize: '0.70rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale-mini"
                        >
                          <span>{getSkillMonochromeIcon(t.key, 12)}</span>
                          <span>{t.shortLabel}</span>
                          {isTarget && <Target size={11} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const kwMatch = prevWeekItem.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
            const prevWeekNum = kwMatch ? kwMatch[1] : (getItemWeek(prevWeekItem).split('-W')[1] || '');
            const isMastered = prevWeekItem.status === 'MASTERED' || prevWeekItem.status === 'COMPLETED';

            const rawHomeworkNotes = String(prevWeekItem.homework_notes || '');

            // 1. Array-Elemente entpacken (falls JSON-Array)
            let parsedArray: string[] = [];
            try {
              const parsed = typeof prevWeekItem.homework_notes === 'string' 
                ? JSON.parse(prevWeekItem.homework_notes) 
                : prevWeekItem.homework_notes;
              if (Array.isArray(parsed)) {
                parsedArray = parsed.map(String);
              }
            } catch {}

            // Helper: Extrahiert ein JSON-Array via Klammer-Zählung (depth-matching), immun gegen verschachtelte Klammern
            const extractJsonArrayFrom = (source: string, prefix: string): any[] | null => {
              const idx = source.indexOf(prefix);
              if (idx === -1) return null;
              const after = source.substring(idx + prefix.length).trim();
              if (!after.startsWith('[')) return null;
              let depth = 0;
              let endIdx = -1;
              for (let i = 0; i < after.length; i++) {
                if (after[i] === '[') depth++;
                else if (after[i] === ']') {
                  depth--;
                  if (depth === 0) { endIdx = i; break; }
                }
              }
              if (endIdx === -1) return null;
              try {
                return JSON.parse(after.substring(0, endIdx + 1));
              } catch {
                return null;
              }
            };

            // 2. SNAPSHOT_LEHRWERKE parsen
            let assignedLehrwerke: Array<{ title: string; pages: number[] }> = [];
            const lwEntry = parsedArray.find(n => n.includes('SNAPSHOT_LEHRWERKE:')) || (rawHomeworkNotes.includes('SNAPSHOT_LEHRWERKE:') ? rawHomeworkNotes : '');
            if (lwEntry) {
              const parsedLw = extractJsonArrayFrom(lwEntry, 'SNAPSHOT_LEHRWERKE:');
              if (Array.isArray(parsedLw)) {
                assignedLehrwerke = parsedLw.map((lw: any) => ({
                  title: lw.title || 'Lehrwerk',
                  pages: Array.isArray(lw.pages) ? lw.pages : []
                }));
              }
            }

            // 3. SNAPSHOT_SONGS parsen
            let assignedSongs: Array<{ title: string; status?: string }> = [];
            const songEntry = parsedArray.find(n => n.includes('SNAPSHOT_SONGS:')) || (rawHomeworkNotes.includes('SNAPSHOT_SONGS:') ? rawHomeworkNotes : '');
            if (songEntry) {
              const parsedSongs = extractJsonArrayFrom(songEntry, 'SNAPSHOT_SONGS:');
              if (Array.isArray(parsedSongs)) {
                assignedSongs = parsedSongs.map((s: any) => ({
                  title: s.topic_name || s.title || 'Song',
                  status: s.status || 'IN_PROGRESS'
                }));
              }
            }

            // Fallback Songs aus progressItems wenn SNAPSHOT_SONGS leer
            if (assignedSongs.length === 0) {
              const activeSongs = (progressItems || []).filter((p: any) =>
                !p.topic_name?.startsWith('Hausaufgabe KW ') &&
                !p.topic_name?.includes(' - Seite ') &&
                p.is_current_homework
              );
              if (activeSongs.length > 0) {
                assignedSongs = activeSongs.slice(0, 3).map((p: any) => ({
                  title: p.topic_name,
                  status: p.status
                }));
              }
            }

            // 4. STUDENT_QUESTION parsen
            let studentQuestion: { text: string; date?: string } | null = null;
            const qEntry = parsedArray.find(n => n.includes('STUDENT_QUESTION:') || n.includes('❓ Frage für den Unterricht:')) || 
                           (rawHomeworkNotes.includes('STUDENT_QUESTION:') || rawHomeworkNotes.includes('❓ Frage für den Unterricht:') ? rawHomeworkNotes : '');
            if (qEntry) {
              if (qEntry.includes('STUDENT_QUESTION:')) {
                const after = qEntry.substring(qEntry.indexOf('STUDENT_QUESTION:') + 'STUDENT_QUESTION:'.length).trim();
                const pipeIdx = after.indexOf('|');
                if (pipeIdx !== -1) {
                  let qText = after.slice(pipeIdx + 1).trim();
                  const stopMatch = qText.match(/(AUDIO:|SNAPSHOT_|LATENCY:|STICKER:)/);
                  if (stopMatch && stopMatch.index !== undefined) {
                    qText = qText.substring(0, stopMatch.index).trim();
                  }
                  studentQuestion = {
                    date: after.slice(0, pipeIdx).trim(),
                    text: qText
                  };
                } else {
                  let qText = after;
                  const stopMatch = qText.match(/(AUDIO:|SNAPSHOT_|LATENCY:|STICKER:)/);
                  if (stopMatch && stopMatch.index !== undefined) {
                    qText = qText.substring(0, stopMatch.index).trim();
                  }
                  studentQuestion = { text: qText };
                }
              } else if (qEntry.includes('❓ Frage für den Unterricht:')) {
                const after = qEntry.substring(qEntry.indexOf('❓ Frage für den Unterricht:') + '❓ Frage für den Unterricht:'.length).trim();
                let qText = after;
                const stopMatch = qText.match(/(AUDIO:|SNAPSHOT_|LATENCY:|STICKER:)/);
                if (stopMatch && stopMatch.index !== undefined) {
                  qText = qText.substring(0, stopMatch.index).trim();
                }
                studentQuestion = { text: qText };
              }
            }

            // 5. AUDIO-Aufnahmen Zähler
            let audioCount = 0;
            if (parsedArray.length > 0) {
              audioCount = parsedArray.filter(n => n.startsWith('AUDIO:') || n.includes('AUDIO:https:')).length;
            } else {
              const audioMatches = Array.from(rawHomeworkNotes.matchAll(/AUDIO:https:[^\s,|]+/g));
              audioCount = audioMatches.length;
            }

            // 6. Didaktische Notiz (Aufgabenstellung)
            let didacticNote = (prevWeekItem.teacher_notes || '').trim();
            if (!didacticNote) {
              if (parsedArray.length > 0) {
                // Bei geparstem Array: Alle didaktischen Texte filtern, die KEIN internes Protokoll-Token sind
                const validLines = parsedArray.filter(n => {
                  if (typeof n !== 'string') return false;
                  const s = n.trim();
                  if (!s) return false;
                  if (isInternalMetadataNote(s)) return false;
                  if (s.startsWith('AUDIO:')) return false;
                  if (s.startsWith('SNAPSHOT_')) return false;
                  if (s.startsWith('STUDENT_')) return false;
                  if (s.startsWith('STICKER:')) return false;
                  if (s.startsWith('LATENCY:')) return false;
                  if (s.startsWith('LOOP:')) return false;
                  if (s.startsWith('SYSTEM:')) return false;
                  if (s.startsWith('FEEDBACK:')) return false;
                  if (s.startsWith('❓')) return false;
                  return true;
                });
                didacticNote = validLines.map(cleanNotesText).filter(Boolean).join(' ').trim();
              } else {
                // Bei unstrukturiertem String: Tokens sauber extrahieren und entfernen
                let cleaned = rawHomeworkNotes;
                ['SNAPSHOT_LEHRWERKE:', 'SNAPSHOT_SONGS:'].forEach(pfx => {
                  const pIdx = cleaned.indexOf(pfx);
                  if (pIdx !== -1) {
                    const afterP = cleaned.substring(pIdx + pfx.length).trim();
                    if (afterP.startsWith('[')) {
                      let d = 0;
                      let endI = -1;
                      for (let i = 0; i < afterP.length; i++) {
                        if (afterP[i] === '[') d++;
                        else if (afterP[i] === ']') {
                          d--;
                          if (d === 0) { endI = i; break; }
                        }
                      }
                      if (endI !== -1) {
                        cleaned = cleaned.substring(0, pIdx) + ' ' + afterP.substring(endI + 1);
                      }
                    }
                  }
                });
                cleaned = cleaned
                  .replace(/STUDENT_QUESTION:[^|\s]+\|[^]*?(?=(AUDIO:|SNAPSHOT_|LATENCY:|STICKER:|\s{2,}|$))/g, '')
                  .replace(/STUDENT_QUESTION:[^]*?(?=(AUDIO:|SNAPSHOT_|LATENCY:|STICKER:|\s{2,}|$))/g, '')
                  .replace(/❓\s*Frage für den Unterricht:[^]*?(?=(AUDIO:|SNAPSHOT_|LATENCY:|STICKER:|\s{2,}|$))/g, '')
                  .replace(/AUDIO:[^\s,|]+(?:\|[^|\s]*){0,7}/g, '')
                  .replace(/STICKER:[^\s|]+(?:\|[^|\s]*){0,3}/g, '')
                  .replace(/\["STICKER:[^\]]+"\]/g, '')
                  .replace(/LATENCY:[^\s]+/g, '')
                  .replace(/\[\s*\]/g, '')
                  .trim();
                didacticNote = cleanNotesText(cleaned);
              }
            }

            return (
              <div style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '14px 16px',
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                zIndex: 5
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    <Calendar size={16} className="text-slate-800" />
                    <span>Vorwochen-Check-In & Stundeneinstieg</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isMastered && (
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        color: '#15803d',
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={11} />
                        Quittiert
                      </span>
                    )}
                    {prevWeekNum && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: '#0369a1',
                        background: '#f0f9ff',
                        border: '1px solid #e0f2fe',
                        padding: '3px 9px',
                        borderRadius: '100px'
                      }}>
                        KW {prevWeekNum}
                      </span>
                    )}
                  </div>
                </div>

                {/* Didaktische Inhalte */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* A. Schüler-Frage für den Unterricht (Pädagogisches Highlight) */}
                  {studentQuestion && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: '1.5px solid #fde68a',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>
                        <HelpCircle size={13} className="text-amber-700 shrink-0" />
                        <span>Schüler-Frage für heute:</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 750, color: '#78350f', lineHeight: 1.4 }}>
                        »{studentQuestion.text}«
                      </p>
                    </div>
                  )}

                  {/* B. Songs & Lehrwerke Badges */}
                  {(assignedSongs.length > 0 || assignedLehrwerke.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {assignedSongs.map((s, idx) => {
                        const c = getSongColor(s.title);
                        return (
                          <span
                            key={`song-${idx}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.74rem',
                              fontWeight: 750,
                              background: c.from,
                              color: '#0f172a',
                              border: `1px solid ${c.to}`,
                              padding: '4px 9px',
                              borderRadius: '8px'
                            }}
                          >
                            <Music size={12} style={{ color: c.text }} />
                            <span>{s.title}</span>
                          </span>
                        );
                      })}

                      {assignedLehrwerke.map((lw, idx) => {
                        const c = getLehrwerkColor(lw.title);
                        return (
                          <span
                            key={`lw-${idx}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.74rem',
                              fontWeight: 750,
                              background: c.from,
                              color: '#0f172a',
                              border: `1px solid ${c.to}`,
                              padding: '4px 9px',
                              borderRadius: '8px'
                            }}
                          >
                            <BookOpen size={12} style={{ color: c.text }} />
                            <span>{lw.title}{lw.pages.length > 0 ? ` (S. ${lw.pages.join(', ')})` : ''}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* C. Aufgabenstellung / Notiz der Lehrkraft */}
                  {didacticNote && (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.80rem',
                      color: '#334155',
                      lineHeight: '1.4',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '7px'
                    }}>
                      <FileText size={13} className="text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <strong style={{ color: '#0f172a' }}>Aufgabe: </strong>
                        <span>{didacticNote}</span>
                      </div>
                    </div>
                  )}

                  {/* D. Schüler-Aktivität (Audios) */}
                  {audioCount > 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 750,
                      color: '#0369a1',
                      background: '#f0f9ff',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      width: 'fit-content'
                    }}>
                      <Mic size={12} />
                      <span>{audioCount} {audioCount === 1 ? 'Übe-Aufnahme' : 'Übe-Aufnahmen'} vom Schüler eingereicht</span>
                    </div>
                  )}
                </div>

                {/* E. 1-Tap Quittierung & Fokus-Ziele */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={handleMasterAllSkills}
                    aria-label="Vorwoche als super gemeistert quittieren und 100 XP vergeben"
                    style={{
                      background: isMastered
                        ? 'linear-gradient(180deg, #15803d 0%, #166534 100%)'
                        : 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '10px 16px',
                      minHeight: '44px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    {isMastered ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                    <span>{isMastered ? 'Vorwoche quittiert (+100 XP vergeben)' : 'Vorwoche super gemeistert (+100 XP)'}</span>
                  </button>

                  {/* 5 Säulen Quick Focus Selector */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {SKILL_TAGS.map(t => {
                      const isTarget = activeWeeklyTargetTags.includes(t.key);
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => handleTriggerSkillQuest(t.key)}
                          aria-label={`Fokus ${t.label} für heute setzen`}
                          style={{
                            background: isTarget ? '#fefce8' : '#f8fafc',
                            border: `1px solid ${isTarget ? '#fde047' : '#e2e8f0'}`,
                            color: isTarget ? '#854d0e' : '#475569',
                            borderRadius: '100px',
                            padding: '6px 12px',
                            minHeight: '34px',
                            fontSize: '0.70rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale-mini"
                        >
                          <span>{getSkillMonochromeIcon(t.key, 12)}</span>
                          <span>{t.shortLabel}</span>
                          {isTarget && <Target size={11} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Floating Apple Scroll Indicator Pill for Mobile */}
          {isMobileOrTabletView && (
            <button
              type="button"
              onClick={() => {
                radarAnalysisCardsRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                marginTop: '10px',
                marginBottom: '4px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '100px',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              className="hover-scale"
            >
              <span>Detail-Analyse & Superkräfte anzeigen</span>
              <ChevronDown size={14} color="#22c55e" />
            </button>
          )}
        </div>

        {/* RECHTE BUCHSEITE: 5 SÄULEN SUPERKRÄFTE & EXPEDITION */}
        <div
          ref={radarAnalysisCardsRef}
          style={{
            flex: isMobileOrTabletView ? 'none' : '1 1 0%',
            width: '100%',
            overflowY: isMobileOrTabletView ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: isMobileOrTabletView ? '16px 16px calc(140px + env(safe-area-inset-bottom, 20px)) 16px' : '24px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1. HERO WOCHENFOKUS & LEHRER-IMPULS (Pure White Stage) */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: isMobileOrTabletView ? '16px 18px' : '20px 22px',
              boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: 850, fontSize: isMobileOrTabletView ? '0.92rem' : '1.04rem' }}>
                  <Target size={18} className="text-slate-900" />
                  <span style={{ whiteSpace: 'nowrap' }}>Aktiver Wochenschwerpunkt</span>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: activeWeeklyTargetTags.length > 0 ? '#b45309' : '#475569',
                  background: activeWeeklyTargetTags.length > 0 ? '#fef3c7' : '#f1f5f9',
                  border: `1px solid ${activeWeeklyTargetTags.length > 0 ? '#fde68a' : '#e2e8f0'}`,
                  padding: '4px 12px',
                  borderRadius: '100px',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {activeWeeklyTargetTags.length > 0 ? (
                    <>
                      <Target size={12} />
                      <span>Fokus aktiv</span>
                    </>
                  ) : uiLevel === 'junior' ? (
                    <>
                      <Sparkles size={12} />
                      <span>Rundum-Zauber</span>
                    </>
                  ) : uiLevel === 'pro' ? (
                    <>
                      <Scale size={12} />
                      <span>Harmonische Balance</span>
                    </>
                  ) : (
                    <>
                      <Compass size={12} />
                      <span>Ganzheitlich</span>
                    </>
                  )}
                </span>
              </div>

              {activeWeeklyTargetTags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeWeeklyTargetTags.map(tagKey => {
                    const tagObj = SKILL_TAGS.find(t => t.key === tagKey);
                    if (!tagObj) return null;
                    return (
                      <span key={tagKey} style={{
                        background: tagObj.bg || '#fefce8',
                        border: `1px solid ${tagObj.border || '#fef08a'}`,
                        color: tagObj.color || '#854d0e',
                        padding: '6px 14px',
                        borderRadius: '100px',
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}>
                        {getSkillMonochromeIcon(tagKey, 14)} {tagObj.label} <Target size={12} />
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600, lineHeight: 1.45 }}>
                  {uiLevel === 'junior'
                    ? 'Du trainierst alle deine 5 Superkräfte gleichzeitig – wie ein wahrer Zaubermusiker!'
                    : uiLevel === 'pro'
                      ? 'Ganzheitliche Repertoire- und Technikpflege über alle 5 Säulen hinweg.'
                      : 'Du stärkst alle 5 Fähigkeiten gleichzeitig für deinen perfekten Bandsound!'}
                </div>
              )}

              {/* Didaktischer Wochen-Leitfaden (Tier-1 Enterprise+ Master-Standard) */}
              {(() => {
                const currentWeekStr = getISOWeek();
                const currentItem = (progressItems || []).find((item: any) => 
                  (item.updated_at && getISOWeek(item.updated_at) === currentWeekStr) ||
                  (item.created_at && getISOWeek(item.created_at) === currentWeekStr) ||
                  item.is_current_homework
                );

                let rawImpulseLines: string[] = [];
                if (currentItem?.teacher_notes) {
                  const cleaned = cleanNotesText(currentItem.teacher_notes);
                  if (cleaned) rawImpulseLines = cleaned.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                }
                if (rawImpulseLines.length === 0 && currentItem?.homework_notes) {
                  try {
                    const parsed = typeof currentItem.homework_notes === 'string'
                      ? JSON.parse(currentItem.homework_notes)
                      : currentItem.homework_notes;
                    if (Array.isArray(parsed)) {
                      rawImpulseLines = parsed.filter((n: string) => typeof n === 'string' && !isInternalMetadataNote(n)).map(s => s.trim()).filter(Boolean);
                    }
                  } catch (e) {
                    const cleaned = cleanNotesText(currentItem.homework_notes);
                    if (cleaned) rawImpulseLines = cleaned.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                  }
                }
                if (rawImpulseLines.length === 0 && generalHomeworkNotes) {
                  rawImpulseLines = String(generalHomeworkNotes).split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                }

                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Target size={13} color="#64748b" strokeWidth={2.6} />
                      <span>Didaktischer Wochen-Leitfaden</span>
                    </span>
                    {rawImpulseLines.length > 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                        {rawImpulseLines.map((line, lIdx) => (
                          <div key={`impulse-line-${lIdx}`} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5, fontWeight: 550 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.76rem', flexShrink: 0 }}>•</span>
                            <span>{renderTextWithDidacticBadges(line)}</span>
                          </div>
                        ))}
                      </div>
                    ) : rawImpulseLines.length === 1 ? (
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5, fontWeight: 550 }}>
                        „{renderTextWithDidacticBadges(rawImpulseLines[0])}“
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
                        „Jede musikalische Meisterleistung beginnt mit Freude am Entdecken und geduldigem Wachsen.“
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 2. 5-SÄULEN KOMPETENZ-ÜBERSICHT (Minimalist Apple-Dots Equalizer) */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: isMobileOrTabletView ? '16px 18px' : '20px 22px',
              boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: 850, fontSize: isMobileOrTabletView ? '0.92rem' : '1.04rem' }}>
                  <BarChart2 size={18} className="text-slate-900" />
                  <span style={{ whiteSpace: 'nowrap' }}>Kompetenz-Übersicht (5 Säulen)</span>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                  5 Stufen System
                </span>
              </div>

              {/* Juristische Klarstellung & Pädagogische Orientierung (Art. 22 DSGVO / Schulrecht) */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '0.78rem',
                color: '#475569',
                lineHeight: 1.45
              }}>
                <Info size={16} className="text-slate-600" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong style={{ color: '#1e293b' }}>Pädagogisches Entwicklungsraster:</strong> Dient der individuellen Förderung musikalischer Schwerpunkte (keine statische Notengebung). Einstufung erfolgt persönlich und pädagogisch durch deine Fachlehrkraft.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tagCounts.map(s => {
                  const isTarget = activeWeeklyTargetTags.includes(s.key);
                  const isMeister = s.level >= 5;
                  return (
                    <div
                      key={s.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        background: isTarget ? (s.lightBg || '#fffbeb') : '#f8fafc',
                        border: `1px solid ${isTarget ? (s.border || '#fde68a') : '#f1f5f9'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedSkillForModal(s.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedSkillForModal(s.key);
                          }
                        }}
                        title={`${s.label}: Didaktische Details & Übetipps ansehen`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          minWidth: isMobileOrTabletView ? '110px' : '140px',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          padding: '2px 4px',
                          outline: 'none',
                          transition: 'opacity 0.15s ease'
                        }}
                        className="hover-scale-mini"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {getSkillMonochromeIcon(s.key, 16)}
                        </span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: s.color || '#0f172a' }}>
                          {s.shortLabel}
                        </span>
                        {isTarget && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 850, color: s.color || '#b45309', background: s.bg || '#fef3c7', border: `1px solid ${s.border || '#fde68a'}`, padding: '2px 7px', borderRadius: '100px' }}>
                            Fokus
                          </span>
                        )}
                      </div>

                      {/* 5 Apple-Dots (Direkt klickbar für Lehrkräfte mit 28px Touch-Hitbox & 13.5px Dot) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {[1, 2, 3, 4, 5].map(seg => {
                          const isFilled = s.level >= seg;
                          let dotColor = '#cbd5e1';
                          if (isFilled) {
                            if (isTarget) dotColor = s.dotColor || s.color || '#f59e0b';
                            else if (isMeister) dotColor = '#16a34a';
                            else dotColor = s.dotColor || s.color || '#3b82f6';
                          }
                          return (
                            <button
                              key={seg}
                              type="button"
                              disabled={readOnly && !isTeacherTools}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetSkillLevel(s.key, seg);
                              }}
                              title={`Stufe ${seg}/5 für ${s.shortLabel} festlegen`}
                              style={{
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: (readOnly && !isTeacherTools) ? 'default' : 'pointer'
                              }}
                              className={(!readOnly || isTeacherTools) ? 'hover-scale-mini' : ''}
                            >
                              <span style={{
                                width: '13.5px',
                                height: '13.5px',
                                borderRadius: '50%',
                                background: dotColor,
                                transition: 'all 0.15s ease',
                                boxShadow: isFilled ? `0 1px 4px ${dotColor}66` : 'none',
                                display: 'inline-block'
                              }} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Level / Meister Badge mit wachstumsorientierter Stufenbezeichnung */}
                      <div style={{ minWidth: '120px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {isMeister ? (
                          <span style={{ fontSize: '0.84rem', fontWeight: 850, color: '#16a34a', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Award size={14} /> Meisterstufe
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.84rem', fontWeight: 750, color: s.color || '#475569', whiteSpace: 'nowrap' }}>
                            Stufe {s.level} · {s.level === 1 ? 'Fundament' : s.level === 2 ? 'Aufbau' : s.level === 3 ? 'Entwickelt' : 'Sicher'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45, fontWeight: 550, marginTop: '4px' }}>
                Mit jedem geübten Song und jeder fachlichen Quittierung durch deine Lehrkraft wachsen deine musikalischen Fähigkeiten kontinuierlich weiter.
              </div>
            </div>
          </div>

          {/* Custom tag pills */}
          {customTagCounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Weitere dokumentierte Trainings-Schwerpunkte
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {customTagCounts.sort((a, b) => b.count - a.count).map(tag => (
                  <span key={tag.key} style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.80rem', fontWeight: 800,
                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    <Edit3 size={12} /> {tag.key} · {tag.count}×
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🌟 Didaktik-Karte Modal für 5 Säulen & Wochenfokus */}
        {selectedSkillForModal && (
          <SkillDetailSheetModal
            skillKey={selectedSkillForModal}
            currentLevel={skillOverrides[selectedSkillForModal] || 1}
            isWeeklyFocus={activeWeeklyTargetTags.includes(selectedSkillForModal)}
            uiLevel={uiLevel}
            teacherName={teacherName}
            onClose={() => setSelectedSkillForModal(null)}
            onStartPractice={() => {
              setSelectedSkillForModal(null);
            }}
          />
        )}
      </div>
    );
};
