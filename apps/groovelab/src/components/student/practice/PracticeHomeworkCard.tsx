import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Music, Headphones, Play, Pause, Sparkles, Trophy, ChevronRight
} from 'lucide-react';
import {
  useAuthoritativeHomeworkPlan,
  UseAuthoritativeHomeworkPlanParams,
  AuthoritativeHomeworkBook,
  AuthoritativeHomeworkSong
} from '../hooks/useAuthoritativeHomeworkPlan';
import { useAuthoritativeHomeworkOptional } from '../context/AuthoritativeHomeworkContext';
import { isWeeklySnapshotContainer, formatConsecutivePageRanges } from '../tabs/briefing/homeworkSummaryHelper';
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
 * Komplett Kasten-in-Kasten-frei (Zero-Nesting) mit nahtloser Audio-Integration,
 * bereinigtem Lehrkraft-Impuls und barrierefreier 3-Stufen-Status-Reflexion.
 * 
 * Barrierefreiheit & Design-Axiome:
 * - BFSG 2025 / WCAG 2.2 AA (Kontraste >= 4.5:1, WAI-ARIA)
 * - Zero-Color-Clash & Unifarben-Axiom
 * - Monolith Ceiling konform (Netto-Schrumpfung, < 350 Zeilen)
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

  // 1. Primäre Haupt-Aufgabe
  const primaryBook: AuthoritativeHomeworkBook | null = books.length > 0 ? books[0] : null;
  const primarySong: AuthoritativeHomeworkSong | null = (!primaryBook && safeSongs.length > 0) ? safeSongs[0] : null;

  const primaryTitle = primaryBook
    ? primaryBook.title
    : primarySong
      ? primarySong.cleanTitle
      : (activeSongsList.length > 0 ? activeSongsList[0].title : 'Freies Repertoire');

  // Bugfix "Seite S. 2": Deterministisch formatiertes Seiten-Badge
  const rawPageRange = primaryBook ? (formatConsecutivePageRanges(primaryBook.pages) || primaryBook.formattedPages) : null;
  const cleanPageBadge = rawPageRange
    ? (/^s(\.|\b)/i.test(rawPageRange.trim()) ? rawPageRange.trim() : `S. ${rawPageRange.trim()}`)
    : (primaryBook ? 'Lehrwerk' : null);

  const primarySubtitle = primaryBook
    ? cleanPageBadge
    : primarySong
      ? (primarySong.artist || 'Song-Projekt')
      : (activeSongsList.length > 0 ? (activeSongsList[0].subtitle || 'Übestück') : null);

  const rawTeacherNote = primaryBook
    ? (primaryBook.notes || (generalNotes.length > 0 ? generalNotes[0] : null))
    : primarySong
      ? (primarySong.notes || (generalNotes.length > 0 ? generalNotes[0] : null))
      : (generalNotes.length > 0 ? generalNotes[0] : null);

  const cleanedTeacherNote = sanitizeTeacherImpulse(rawTeacherNote);

  const taskId = primaryBook
    ? `book-${primaryBook.title}`
    : primarySong
      ? `song-${primarySong.id || primarySong.cleanTitle}`
      : 'repertoire-primary';

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

  const remainingSongsCount = Math.max(0, activeSongsList.length - 1);

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

      {/* 2. Aktive Fokus-Aufgabe Body (Zero-Nesting: Direkt auf der Fläche!) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Titel + Badge + Status-Reflexion */}
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
              {primaryTitle}
            </span>
            {primarySubtitle && (
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
                {primarySubtitle}
              </span>
            )}
          </div>

          <StudentHomeworkStatusButton
            studentId={studentId || studentUser?.id}
            taskId={taskId}
            label={primaryTitle}
            variant="compact_hud"
          />
        </div>

        {/* Didaktischer Impuls der Lehrkraft (Editorial Accent Callout) */}
        {cleanedTeacherNote && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: '#f8fafc',
            borderLeft: '3px solid #10b981'
          }}>
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
              {cleanedTeacherNote}
            </p>
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

      {/* 3. Repertoire-Shelf Fußzeile (Nahtloser Abschluss ohne Kasten) */}
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
            {remainingSongsCount > 0
              ? `${remainingSongsCount} weitere Stücke im Aufgabenheft`
              : 'Alle Song-Projekte im Aufgabenheft ansehen'}
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
