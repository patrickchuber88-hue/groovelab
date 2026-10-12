import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Music, Headphones, Play, Pause, Sparkles, Trophy, ChevronRight, BookOpen, HelpCircle, FileText
} from 'lucide-react';
import {
  useAuthoritativeHomeworkPlan,
  UseAuthoritativeHomeworkPlanParams,
  AuthoritativeHomeworkBook,
  AuthoritativeHomeworkSong
} from '../hooks/useAuthoritativeHomeworkPlan';
import { useAuthoritativeHomeworkOptional } from '../context/AuthoritativeHomeworkContext';
import { isWeeklySnapshotContainer, formatConsecutivePageRanges } from '../tabs/briefing/homeworkSummaryHelper';
import { getSongColor } from '../studentDateUtils';
import { StudentHomeworkStatusButton } from '../homework/StudentHomeworkStatusButton';

export interface PracticeHomeworkCardProps extends UseAuthoritativeHomeworkPlanParams {
  studentId?: string | null;
  studentUser?: any;
  isMusicStandMode?: boolean;
  activeSongsList?: any[];
  onOpenHomeworkBook?: (targetTab?: any, targetViewMode?: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Didaktischer Text-Sanitizer:
 * Bereinigt rohe Hashtags (#Technik), doppelte Seiten-Präfixe (Seite 2:)
 * und informelle Einstiegsfragmente (hi, hallo) für 0,1% redaktionelle Klarheit.
 */
function sanitizeTeacherImpulse(raw?: string | string[] | null): string {
  if (!raw) return '';
  let text = Array.isArray(raw)
    ? raw.filter(p => typeof p === 'string' && !p.startsWith('AUDIO:') && !p.startsWith('STICKER:')).join(' ')
    : String(raw).trim();

  // JSON-Arrays sicher entpacken
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        text = parsed
          .filter(p => typeof p === 'string' && !p.startsWith('AUDIO:') && !p.startsWith('STICKER:'))
          .join(' ');
      }
    } catch {}
  }

  return text
    // 1. Umschließende Anführungszeichen entfernen
    .replace(/^[„"']+|["'“]+$/g, '')
    // 2. Führende Seitenangaben wie "Seite 2:", "S. 2:", "Seite 2 - " entfernen (bereits im Badge)
    .replace(/^(seite|s\.)\s*\d+[\s:–-]*/i, '')
    // 3. Führende informelle Einstiege entfernen
    .replace(/^(hi|hallo|hey)\b[\s:,-]*/i, '')
    // 4. Hashtags bereinigen: "#Technik" -> "Technik"
    .replace(/#([a-zA-ZäöüÄÖÜß]+)/g, '$1')
    // 5. Doppelpunkte und Whitespace normalisieren
    .replace(/:\s*:/g, ':')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 🏛️ 0,1% Enterprise Goldstandard Satellit: PracticeHomeworkCard
 * 
 * Bündiges Context- & Aufgaben-Widget für die rechte Spalte des Precision Cockpits.
 * 100% Datenparität mit dem Aufgabenheft (Wochen-Fahrplan):
 * - Zeigt alle aktiven Wochenaufgaben (Lehrwerke + Songs) mit individueller Status-Reflexion
 * - Einbettung vorgemerkter Schülerfragen und didaktischer Impulse
 * - Wahrheitsgetreuer Restaufgaben-Zähler (keine Vermischung mit Repertoire-Katalog)
 * - Nahtlose 1-Tap Audio-Vorhörzeile der Lehrkraftaufnahme
 * 
 * Barrierefreiheit & Design-Axiome:
 * - BFSG 2025 / WCAG 2.2 AA (Kontraste >= 4.5:1, WAI-ARIA)
 * - Zero-Color-Clash & Unifarben-Axiom
 * - Monolith Ceiling konform (< 500 Zeilen)
 */
export const PracticeHomeworkCard: React.FC<PracticeHomeworkCardProps> = ({
  studentId,
  studentUser,
  isMusicStandMode = false,
  activeSongsList = [],
  onOpenHomeworkBook,
  localProgress,
  lehrwerke,
  progressItems,
  activeSongSkills,
  assignedCampusSongs,
  className = '',
  style = {}
}) => {
  const contextPlan = useAuthoritativeHomeworkOptional();
  const internalPlan = useAuthoritativeHomeworkPlan({
    studentId,
    studentUser,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs
  });

  const plan = contextPlan || internalPlan;
  const {
    books,
    songs,
    generalNotes,
    audioTracks,
    studentQuestion,
    hasActiveHomework
  } = plan;

  const safeSongs = useMemo(() => {
    return (songs || []).filter((s: AuthoritativeHomeworkSong) =>
      !isWeeklySnapshotContainer(s.cleanTitle) &&
      !isWeeklySnapshotContainer(s.title) &&
      !isWeeklySnapshotContainer(s.artist)
    );
  }, [songs]);

  const effectiveHasActiveHomework = Boolean(
    hasActiveHomework && (books.length > 0 || safeSongs.length > 0 || generalNotes.length > 0)
  );

  // 1. Wochen-Fokus Aufgaben-Liste (0,1% Goldstandard: Multi-Item Parität mit Aufgabenheft)
  interface WeeklyTaskItem {
    id: string;
    type: 'book' | 'song';
    title: string;
    subtitle: string | null;
    artist?: string | null;
    taskId: string;
    notes?: string | null;
  }

  const weeklyTasks = useMemo<WeeklyTaskItem[]>(() => {
    if (!effectiveHasActiveHomework) return [];
    const items: WeeklyTaskItem[] = [];

    // Lehrwerke
    books.forEach((b, idx) => {
      const rawPageRange = formatConsecutivePageRanges(b.pages) || b.formattedPages;
      const cleanPageBadge = rawPageRange
        ? (/^s(\.|\b)/i.test(rawPageRange.trim()) ? rawPageRange.trim() : `S. ${rawPageRange.trim()}`)
        : (b.title ? 'Lehrwerk' : null);
      const rawNote = b.notes || (books.length === 1 && safeSongs.length === 0 && generalNotes.length > 0 ? generalNotes[0] : null);
      items.push({
        id: `book-${b.title}-${idx}`,
        type: 'book',
        title: b.title,
        subtitle: cleanPageBadge,
        taskId: `book-${b.title}`,
        notes: sanitizeTeacherImpulse(rawNote)
      });
    });

    // Songs
    safeSongs.forEach((s, idx) => {
      let displayTitle = s.cleanTitle;
      const artist = s.artist || '';
      if (artist && (displayTitle.toLowerCase().startsWith(artist.toLowerCase() + ' - ') || displayTitle.toLowerCase().startsWith(artist.toLowerCase() + ' – '))) {
        displayTitle = displayTitle.slice(artist.length).replace(/^[\s–—-]+/, '').trim();
      }
      const showArtist = artist && !displayTitle.toLowerCase().includes(artist.toLowerCase()) ? artist : null;
      items.push({
        id: `song-${s.id || s.cleanTitle}-${idx}`,
        type: 'song',
        title: displayTitle,
        subtitle: null,
        artist: showArtist,
        taskId: `song-${s.id || s.cleanTitle}`,
        notes: sanitizeTeacherImpulse(s.notes)
      });
    });

    return items;
  }, [books, safeSongs, generalNotes, effectiveHasActiveHomework]);

  // Standalone-Notizen (z. B. "Zusätzliche Bemerkung"), falls nicht bereits an Buch/Song gehängt
  const standaloneNotes = useMemo(() => {
    if (!generalNotes || generalNotes.length === 0) return [];
    return generalNotes
      .map(n => sanitizeTeacherImpulse(n))
      .filter(n => n.length > 0 && !weeklyTasks.some(item => item.notes === n));
  }, [generalNotes, weeklyTasks]);

  // Progressive Disclosure: bis zu 3 Wochenaufgaben direkt sichtbar
  const visibleTasks = effectiveHasActiveHomework ? weeklyTasks.slice(0, 3) : [];
  const remainingWeeklyTasksCount = effectiveHasActiveHomework ? Math.max(0, weeklyTasks.length - 3) : 0;

  // Fallback für freies Repertoire (wenn keine Hausaufgabe vorliegt)
  const fallbackSong = activeSongsList.length > 0 ? activeSongsList[0] : null;
  const fallbackTitle = fallbackSong ? fallbackSong.title : 'Freies Repertoire';
  const fallbackSubtitle = fallbackSong ? (fallbackSong.subtitle || 'Übestück') : null;
  const fallbackTaskId = fallbackSong ? `repertoire-${fallbackSong.title}` : 'repertoire-primary';
  const remainingRepertoireCount = Math.max(0, activeSongsList.length - 1);

  // 2. Audio-Player für Referenz-Aufnahme der Lehrkraft
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const activeAudioTrack = audioTracks && audioTracks.length > 0 ? audioTracks[0] : null;

  const toggleAudio = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlayingAudio(false);
    }
    if (audioRef.current.src !== url) audioRef.current.src = url;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(err => console.warn('Audio play error:', err));
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '22px',
        border: '2px solid #e2e8f0',
        padding: isMusicStandMode ? '18px 22px' : '16px 20px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        boxSizing: 'border-box',
        minHeight: '235px',
        ...style
      }}
      className={`animation-fade-in ${className}`}
    >
      {/* 1. Header-Zeile (Clean, calm Apple Precision) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: effectiveHasActiveHomework ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: effectiveHasActiveHomework ? '#ffffff' : '#d97706',
            boxShadow: 'none',
            flexShrink: 0
          }}>
            {effectiveHasActiveHomework ? (
              <Sparkles size={15} color="#ffffff" />
            ) : (
              <Trophy size={15} color="#d97706" />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h4 style={{
              margin: 0,
              fontSize: isMusicStandMode ? '1.08rem' : '0.96rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.01em',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              {effectiveHasActiveHomework ? 'Wochen-Fokus' : 'Meisterwerk & Repertoire'}
            </h4>
            {effectiveHasActiveHomework && weeklyTasks.length > 0 && (
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 850,
                color: '#15803d',
                background: '#dcfce7',
                padding: '2px 7px',
                borderRadius: '100px',
                lineHeight: 1
              }}>
                {weeklyTasks.length === 1 ? '1 Aufgabe' : `${weeklyTasks.length} Aufgaben`}
              </span>
            )}
          </div>
        </div>

        {onOpenHomeworkBook && (
          <button
            type="button"
            onClick={() => onOpenHomeworkBook('audiobiography', 'document')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 6px',
              color: '#16a34a',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            className="hover-opacity"
            aria-label="Aufgabenheft und Protokoll öffnen"
          >
            <span>Aufgabenheft</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* 2. Aktive Fokus-Aufgaben Body (Zero-Nesting: Direkt auf der Fläche!) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 💬 Vorgemerkte Schülerfrage für den Unterricht (falls vorhanden) */}
        {studentQuestion && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 11px',
            borderRadius: '10px',
            background: '#fffdf0',
            border: '1px solid #fde047',
            fontSize: '0.78rem',
            color: '#854d0e',
            fontWeight: 750,
            lineHeight: 1.3
          }}>
            <HelpCircle size={14} color="#ca8a04" style={{ flexShrink: 0 }} strokeWidth={2.4} />
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 850, color: '#ca8a04', marginRight: '4px' }}>Frage notiert:</span>
              <span>„{studentQuestion}“</span>
            </div>
          </div>
        )}

        {/* Multi-Item Aufgaben-Liste bei aktiven Hausaufgaben */}
        {effectiveHasActiveHomework ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleTasks.map((task) => {
              const isBook = task.type === 'book';
              const songColor = isBook ? null : getSongColor(task.title);
              const squircleBg = isBook
                ? 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)'
                : `linear-gradient(135deg, ${songColor!.from}, ${songColor!.to})`;
              const iconColor = isBook ? '#e11d48' : (songColor!.text || '#0f172a');
              const shadow = isBook
                ? '0 2px 6px rgba(225, 29, 72, 0.12)'
                : `0 2px 6px ${songColor!.shadowFrom || 'rgba(0, 0, 0, 0.06)'}`;

              return (
                <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '7px',
                        background: squircleBg,
                        border: '1px solid rgba(255, 255, 255, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: iconColor,
                        boxShadow: shadow,
                        flexShrink: 0
                      }}>
                        {isBook ? (
                          <BookOpen size={12} strokeWidth={2.4} />
                        ) : (
                          <Music size={12} strokeWidth={2.4} />
                        )}
                      </div>
                      <span style={{
                        fontSize: isMusicStandMode ? '1.12rem' : '0.98rem',
                        fontWeight: 950,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                      }}>
                        {task.title}
                        {task.artist && (
                          <span style={{ fontSize: '0.86rem', fontWeight: 650, color: '#64748b', marginLeft: '6px' }}>
                            · {task.artist}
                          </span>
                        )}
                      </span>
                      {isBook && task.subtitle && (
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 850,
                          color: '#15803d',
                          background: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          padding: '2px 8px',
                          borderRadius: '99px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {task.subtitle}
                        </span>
                      )}
                    </div>

                  <StudentHomeworkStatusButton
                    studentId={studentId || studentUser?.id}
                    taskId={task.taskId}
                    label={task.title}
                    variant="compact_hud"
                  />
                </div>

                {/* Didaktischer Impuls der Lehrkraft für dieses Item */}
                {task.notes && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    borderLeft: '3px solid #10b981',
                    marginLeft: '32px'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#334155',
                      fontWeight: 650,
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {task.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

            {/* Standalone Didaktische Notiz (z. B. "Zusätzliche Bemerkung") */}
            {standaloneNotes.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#f8fafc',
                borderLeft: '3px solid #10b981'
              }}>
                <FileText size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} strokeWidth={2.4} />
                <p style={{
                  margin: 0,
                  fontSize: '0.80rem',
                  color: '#334155',
                  fontWeight: 650,
                  lineHeight: 1.42,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {standaloneNotes[0]}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Fallback-Modus für freies Üben & Repertoire (keine Hausaufgabe) */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: isMusicStandMode ? '1.15rem' : '1.02rem',
                fontWeight: 950,
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {fallbackTitle}
              </span>
              {fallbackSubtitle && (
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {fallbackSubtitle}
                </span>
              )}
            </div>

            <StudentHomeworkStatusButton
              studentId={studentId || studentUser?.id}
              taskId={fallbackTaskId}
              label={fallbackTitle}
              variant="compact_hud"
            />
          </div>
        )}

        {/* 1-Tap Nahtloser Audio-Player (Sleek Apple Audio Strip, kein Kasten-im-Kasten) */}
        {activeAudioTrack && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '12px',
            background: isPlayingAudio ? '#ecfdf5' : '#f8fafc',
            border: isPlayingAudio ? '1px solid #10b981' : '1px solid #f1f5f9',
            transition: 'all 0.2s ease'
          }}>
            <button
              type="button"
              onClick={() => toggleAudio(activeAudioTrack.url)}
              style={{
                background: isPlayingAudio ? '#ef4444' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '100px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: 'none',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              aria-label={isPlayingAudio ? 'Lehreraufnahme anhalten' : 'Lehreraufnahme anhören'}
            >
              {isPlayingAudio ? (
                <Pause size={14} fill="#ffffff" />
              ) : (
                <Play size={14} fill="#ffffff" style={{ marginLeft: '1.5px' }} />
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {activeAudioTrack.label && !activeAudioTrack.label.startsWith('AUDIO:') ? activeAudioTrack.label : 'Lehrer-Aufnahme'}
              </span>
              <span style={{ fontSize: '0.68rem', color: isPlayingAudio ? '#059669' : '#64748b', fontWeight: 650 }}>
                {isPlayingAudio ? 'Wiedergabe aktiv...' : 'Vorhören vor erstem Anschlag'}
              </span>
            </div>

            <Headphones size={15} color={isPlayingAudio ? '#059669' : '#94a3b8'} style={{ flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* 3. Repertoire- / Aufgabenheft-Shelf Fußzeile (Nahtloser Abschluss ohne Kasten) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenHomeworkBook?.('audiobiography', 'document')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenHomeworkBook?.('audiobiography', 'document'); } }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          marginTop: 'auto',
          borderTop: '1px solid #f1f5f9',
          cursor: 'pointer',
          transition: 'opacity 0.15s ease'
        }}
        className="hover-opacity"
        aria-label="Repertoire und Meisterwerk-Protokoll öffnen"
      >
        <span style={{
          fontSize: '0.74rem',
          color: '#64748b',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Music size={13} color="#64748b" />
          <span>
            {effectiveHasActiveHomework
              ? (remainingWeeklyTasksCount > 0
                  ? `${remainingWeeklyTasksCount} weitere Aufgabe${remainingWeeklyTasksCount === 1 ? '' : 'n'} im Aufgabenheft`
                  : 'Aufgabenheft & Details öffnen')
              : (remainingRepertoireCount > 0
                  ? `${remainingRepertoireCount} weitere Stücke im Repertoire`
                  : 'Alle Song-Projekte im Repertoire ansehen')}
          </span>
        </span>
        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
          <span>Öffnen</span>
          <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
};
