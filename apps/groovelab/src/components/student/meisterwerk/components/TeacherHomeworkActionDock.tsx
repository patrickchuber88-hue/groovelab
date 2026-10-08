/**
 * 🏛️ Campus-Groovelab Teacher Homework Action Dock (Aufgabenheft / Meisterwerk)
 * TeacherHomeworkActionDock.tsx
 *
 * 0,1% Goldstandard Autarker Feature-Monolith:
 * - Entlastet die rechte Spalte von MeisterwerkDocumentTab.tsx von visuellem Overload
 * - 2-Spaltiges Action-Dock im Ruhezustand (64px, touch- & tablet-optimiert):
 *     Spalte 1: ✍️ Hausaufgabe & Notizen (mit Live-Statusindikator)
 *     Spalte 2: 🎙️ Audio aufnehmen (mit Live-Statusindikator)
 * - Bei Klick öffnen sich spezialisierte, barrierefreie Studio-Masken (Modals / Sheets):
 *     1. Hausaufgaben-Redaktion: Diktat, Segmented Control, Textbausteine-Dock, Gruppen-Tags
 *     2. Akustik-Aufnahme-Studio: 4-Klick Einzähler, Metronom/BPM, Pegel, Live-Timer
 * - Konform mit dem Monolith Ceiling & Zero-Inline-Feature Axiom (< 700 Zeilen)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Mic,
  Lock,
  Check,
  Timer,
  Square,
  Volume2,
  Plus,
  X,
  Sparkles,
  RefreshCw,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { DidacticTextbausteineDock } from './DidacticTextbausteineDock';
import { Student } from '../../meisterwerk.types';
import { isInternalMetadataNote } from '../../../../domain/stickersAndTresor';
import { useVoiceToText } from '../../../../hooks/useVoiceToText';

export interface TeacherHomeworkActionDockProps {
  student: Student;
  viewingWeekIso: string;
  viewingWeekNum: string;
  viewingWeekOffset: number;
  setViewingWeekOffset?: (fn: ((prev: number) => number) | number) => void;
  readOnly?: boolean;
  isMobileView?: boolean;

  // Notizen-State & Handlers
  activeNoteTarget: 'student' | 'teacher';
  setActiveNoteTarget: (target: 'student' | 'teacher') => void;
  activeViewingStudentNotes: string;
  generalHomeworkNotes: string;
  setGeneralHomeworkNotes: (val: string) => void;
  latestGeneralHomeworkNotesRef: React.MutableRefObject<string>;
  teacherNotes: string;
  setTeacherNotes: (val: string) => void;
  latestTeacherNotesRef: React.MutableRefObject<string>;
  homeworkNotesList: any[];
  setHomeworkNotesList: (val: any[]) => void;
  triggerDebouncedAutoSave: (delayMs?: number) => void;
  triggerImmediateAutoSave: () => void;
  effectiveGroupStudents: any[];
  studentFirstName: string;
  carriedOverWeekLabel?: string;
  isAudioCarriedOver?: boolean;
  isNotesCarriedOver?: boolean;
  isBooksCarriedOver?: boolean;
  isSongsCarriedOver?: boolean;
  PRESET_CHIPS: any[];
  handleTogglePresetChip: (chip: any, e?: React.MouseEvent) => void;

  // Audio-State & Handlers
  audioNotesCount: number;
  hasTresorStorage: boolean;
  isRecordingAudio: boolean;
  isUploadingAudio: boolean;
  audioDuration: number;
  formatRecordTime: (dur: number) => string;
  handleStartPlayAlongRecording: () => void;
  stopRecordingAudio: () => void;
  cancelPlayAlongCountIn: () => void;
  playAlongCountInRemaining: number | null;
  isCountInEnabled: boolean;
  setIsCountInEnabled: (val: boolean) => void;
  showPlayAlongMetronomePopup: boolean;
  setShowPlayAlongMetronomePopup: (val: boolean) => void;
  isRecordingMetronomeActive: boolean;
  setIsRecordingMetronomeActive: (val: boolean) => void;
  recordingBpm: number;
  setRecordingBpm: (fn: ((prev: number) => number) | number) => void;
  playMetronomeTick: (bypass?: boolean) => void;
  audioLabel: string;
  setAudioLabel: (val: string) => void;
}

export const TeacherHomeworkActionDock: React.FC<TeacherHomeworkActionDockProps> = ({
  student,
  viewingWeekIso,
  viewingWeekNum,
  viewingWeekOffset,
  setViewingWeekOffset,
  readOnly = false,
  isMobileView = false,

  // Notizen
  activeNoteTarget,
  setActiveNoteTarget,
  activeViewingStudentNotes,
  generalHomeworkNotes,
  setGeneralHomeworkNotes,
  latestGeneralHomeworkNotesRef,
  teacherNotes,
  setTeacherNotes,
  latestTeacherNotesRef,
  homeworkNotesList,
  setHomeworkNotesList,
  triggerDebouncedAutoSave,
  triggerImmediateAutoSave,
  effectiveGroupStudents,
  studentFirstName,
  carriedOverWeekLabel,
  isAudioCarriedOver,
  isNotesCarriedOver,
  isBooksCarriedOver,
  isSongsCarriedOver,
  PRESET_CHIPS,
  handleTogglePresetChip,

  // Audio
  audioNotesCount,
  hasTresorStorage,
  isRecordingAudio,
  isUploadingAudio,
  audioDuration,
  formatRecordTime,
  handleStartPlayAlongRecording,
  stopRecordingAudio,
  cancelPlayAlongCountIn,
  playAlongCountInRemaining,
  isCountInEnabled,
  setIsCountInEnabled,
  showPlayAlongMetronomePopup,
  setShowPlayAlongMetronomePopup,
  isRecordingMetronomeActive,
  setIsRecordingMetronomeActive,
  recordingBpm,
  setRecordingBpm,
  playMetronomeTick,
  audioLabel,
  setAudioLabel
}) => {
  const [isNotesSheetOpen, setIsNotesSheetOpen] = useState(false);
  const [isAudioSheetOpen, setIsAudioSheetOpen] = useState(false);

  const studentNotesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const teacherNotesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const studentNotesSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Escape-Key Schließen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNotesSheetOpen) setIsNotesSheetOpen(false);
        if (isAudioSheetOpen && !isRecordingAudio) setIsAudioSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotesSheetOpen, isAudioSheetOpen, isRecordingAudio]);

  // Automatisch Audio-Sheet öffnen, wenn eine Aufnahme aktiv ist
  useEffect(() => {
    if (isRecordingAudio || playAlongCountInRemaining !== null) {
      setIsAudioSheetOpen(true);
    }
  }, [isRecordingAudio, playAlongCountInRemaining]);

  const hasStudentNotes = Boolean((activeViewingStudentNotes || '').trim());
  const hasTeacherNotes = Boolean((teacherNotes || '').trim());
  const hasAnyNotes = hasStudentNotes || hasTeacherNotes;

  const notesStatusLabel = hasStudentNotes
    ? 'Fahrplan aktiv'
    : hasTeacherNotes
    ? 'Interne Notiz aktiv'
    : 'Notiz hinzufügen';

  // 🎙️ Prominente Diktier-Transkription (0,1% Goldstandard)
  const handleTranscriptReceived = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    const cleanSpoken = text.trim();
    if (activeNoteTarget === 'student') {
      const current = latestGeneralHomeworkNotesRef.current !== undefined
        ? latestGeneralHomeworkNotesRef.current
        : generalHomeworkNotes;
      const trimmed = current.trim();
      const next = trimmed ? `${trimmed}\n${cleanSpoken}` : cleanSpoken;
      latestGeneralHomeworkNotesRef.current = next;
      setGeneralHomeworkNotes(next);
      const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
      const noteLines = next.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
      const combined = [...specialNotes, ...noteLines];
      setHomeworkNotesList(combined);
      try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
    } else {
      const current = latestTeacherNotesRef.current !== undefined
        ? latestTeacherNotesRef.current
        : teacherNotes;
      const trimmed = current.trim();
      const next = trimmed ? `${trimmed}\n${cleanSpoken}` : cleanSpoken;
      latestTeacherNotesRef.current = next;
      setTeacherNotes(next);
      try { localStorage.setItem(`campus_teacher_notes_${student.id}`, next); } catch {}
    }
    triggerDebouncedAutoSave(350);
  }, [activeNoteTarget, generalHomeworkNotes, homeworkNotesList, latestGeneralHomeworkNotesRef, latestTeacherNotesRef, setGeneralHomeworkNotes, setHomeworkNotesList, setTeacherNotes, student.id, teacherNotes, triggerDebouncedAutoSave]);

  const { isListening: isHeroListening, toggleListening: toggleHeroListening } = useVoiceToText({
    onResult: handleTranscriptReceived
  });

  const audioStatusLabel = audioNotesCount > 0
    ? `${audioNotesCount} ${audioNotesCount === 1 ? 'Aufnahme' : 'Aufnahmen'}`
    : 'Hörbeispiel aufnehmen';

  if (readOnly) return null;

  return (
    <>
      {/* ========================================================================= */}
      {/* 🏛️ 2-SPALTIGES TEACHER HOMEWORK ACTION DOCK                               */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: isMobileView ? '8px' : '12px',
          width: '100%',
          boxSizing: 'border-box',
          paddingTop: '6px'
        }}
      >
        {/* SPALTE 1: HAUSAUFGABE BUTTON (0,1% Goldstandard: Solid Campus-Grün #34a853) */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={() => setIsNotesSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsNotesSheetOpen(true);
            }
          }}
          style={{
            background: '#34a853',
            border: 'none',
            borderRadius: '16px',
            padding: isMobileView ? '10px 12px' : '12px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: isMobileView ? '8px' : '12px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '62px'
          }}
          className="hover-scale-mini"
          title="Hausaufgaben & Notizen bearbeiten"
          aria-label="Hausaufgaben & Notizen bearbeiten"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.22)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Edit3 size={18} strokeWidth={2.4} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: isMobileView ? '0.80rem' : '0.86rem',
                fontWeight: 850,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}
            >
              Hausaufgabe
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hasAnyNotes && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
              )}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.95)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {notesStatusLabel}
              </span>
            </div>
          </div>
        </button>

        {/* SPALTE 2: AUDIO-STUDIO BUTTON (0,1% Goldstandard: Solid Studio-Gelb #facc15 / Recording Red) */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={() => setIsAudioSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsAudioSheetOpen(true);
            }
          }}
          style={{
            background: isRecordingAudio ? '#ef4444' : '#facc15',
            border: isRecordingAudio ? '1.5px solid #b91c1c' : 'none',
            borderRadius: '16px',
            padding: isMobileView ? '10px 12px' : '12px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: isMobileView ? '8px' : '12px',
            boxShadow: isRecordingAudio
              ? '0 4px 14px rgba(239, 68, 68, 0.35)'
              : '0 4px 14px rgba(234, 179, 8, 0.35)',
            transition: 'all 0.15s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '62px'
          }}
          className="hover-scale-mini"
          title="Audio-Studio öffnen"
          aria-label="Audio-Studio öffnen"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: isRecordingAudio ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.08)',
              color: isRecordingAudio ? '#ffffff' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Mic size={18} strokeWidth={2.4} style={{ animation: isRecordingAudio ? 'pulse 1s infinite' : 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: isMobileView ? '0.80rem' : '0.86rem',
                fontWeight: 850,
                color: isRecordingAudio ? '#ffffff' : '#0f172a',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}
            >
              Audio-Studio
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isRecordingAudio ? (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 0.6s infinite' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff' }}>
                    Aufnahme läuft...
                  </span>
                </>
              ) : (
                <>
                  {audioNotesCount > 0 && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0f172a' }} />
                  )}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isRecordingAudio ? 'rgba(255, 255, 255, 0.95)' : '#334155',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {audioStatusLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 🎭 MASKE 1: HAUSAUFGABEN- & NOTIZEN-EDITOR SHEET                          */}
      {/* ========================================================================= */}
      {isNotesSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hausaufgaben & Notizen bearbeiten"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: isMobileView ? '12px' : '24px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              triggerImmediateAutoSave();
              setIsNotesSheetOpen(false);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: isMobileView ? '20px' : '24px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Editorial Header (0,1% Goldstandard: Solid Campus-Grün #34a853 Brand Header) */}
            <div
              style={{
                padding: '16px 20px',
                background: '#34a853',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <Edit3 size={16} strokeWidth={2.4} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, letterSpacing: '0.02em', color: '#ffffff' }}>
                      HAUSAUFGABEN & NOTIZEN
                    </span>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        background: 'rgba(255, 255, 255, 0.25)',
                        color: '#ffffff',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        letterSpacing: '0.03em'
                      }}
                    >
                      CAMPUS
                    </span>
                  </div>
                  <span style={{ fontSize: '0.70rem', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 650 }}>
                    Wochen-Fahrplan & didaktische Aufgabenstellung
                  </span>
                </div>
              </div>

              {/* Schließen Button */}
              <button
                type="button"
                onClick={() => {
                  triggerImmediateAutoSave();
                  setIsNotesSheetOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '100px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Schließen"
              >
                <X size={16} />
              </button>
            </div>

            {/* Sub-Header mit Segmented Tab Switcher */}
            <div
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                background: '#fafafa'
              }}
            >
              {/* Apple Segmented Control */}
              <div
                role="tablist"
                aria-label="Notiz-Kategorie"
                style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: '3px',
                  borderRadius: '12px',
                  gap: '4px'
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeNoteTarget === 'student'}
                  tabIndex={0}
                  onClick={() => setActiveNoteTarget('student')}
                  style={{
                    border: 'none',
                    background: activeNoteTarget === 'student' ? '#ffffff' : 'transparent',
                    color: activeNoteTarget === 'student' ? '#15803d' : '#64748b',
                    fontWeight: activeNoteTarget === 'student' ? 850 : 650,
                    fontSize: '0.82rem',
                    padding: '6px 14px',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    boxShadow: activeNoteTarget === 'student' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <BookOpen size={14} />
                  <span>Hausaufgaben-Fahrplan</span>
                  {hasStudentNotes && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853' }} />
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeNoteTarget === 'teacher'}
                  tabIndex={0}
                  onClick={() => setActiveNoteTarget('teacher')}
                  style={{
                    border: 'none',
                    background: activeNoteTarget === 'teacher' ? '#ffffff' : 'transparent',
                    color: activeNoteTarget === 'teacher' ? '#92400e' : '#64748b',
                    fontWeight: activeNoteTarget === 'teacher' ? 850 : 650,
                    fontSize: '0.82rem',
                    padding: '6px 14px',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    boxShadow: activeNoteTarget === 'teacher' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Lock size={13} />
                  <span>Interne Notiz (Nur Lehrer)</span>
                  {hasTeacherNotes && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b45309' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Scrollbarer Inhaltsbereich */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Vorwochen-Hinweis falls aktiv */}
              {activeNoteTarget === 'student' && viewingWeekOffset === 0 && (isAudioCarriedOver || isNotesCarriedOver || isBooksCarriedOver || isSongsCarriedOver) && !(generalHomeworkNotes || '').trim() && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    color: '#475569',
                    fontWeight: 650
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>💡</span>
                  <span>
                    Schüler übt aktuell mit den Aufgaben aus {carriedOverWeekLabel || 'der Vorwoche'}. Sobald du neue Einträge speicherst, lösen diese die Vorwoche ab.
                  </span>
                </div>
              )}

              {/* Duo/Gruppen-Zuweisung falls mehrere Schüler */}
              {activeNoteTarget === 'student' && viewingWeekOffset === 0 && effectiveGroupStudents.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>
                    Gruppen-Zuweisung:
                  </span>
                  {effectiveGroupStudents.map((grpStud, gIdx) => {
                    const gName = (grpStud?.first_name || (grpStud as any)?.name?.split(' ')[0] || '').trim();
                    if (!gName) return null;
                    const isCurrentStudent = gName.toLowerCase() === studentFirstName.toLowerCase();
                    return (
                      <button
                        key={`grp-${gIdx}-${gName}`}
                        type="button"
                        onClick={() => {
                          const tagToInsert = `@${gName}: `;
                          const currentText = generalHomeworkNotes || '';
                          const cursor = studentNotesSelectionRef.current?.start ?? currentText.length;
                          const nextText = currentText.slice(0, cursor) + (currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '') + tagToInsert + currentText.slice(cursor);
                          latestGeneralHomeworkNotesRef.current = nextText;
                          setGeneralHomeworkNotes(nextText);
                          const specialNotes = (homeworkNotesList || []).filter((n: string) => typeof n === 'string' && isInternalMetadataNote(n));
                          const noteLines = nextText.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && !isInternalMetadataNote(s));
                          const combined = [...specialNotes, ...noteLines];
                          setHomeworkNotesList(combined);
                          try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                          triggerDebouncedAutoSave(350);
                        }}
                        style={{
                          background: isCurrentStudent ? '#e6f4ea' : '#ede9fe',
                          border: isCurrentStudent ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(139, 92, 246, 0.4)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: isCurrentStudent ? '#15803d' : '#6d28d9',
                          cursor: 'pointer'
                        }}
                        className="hover-scale-mini"
                      >
                        + @{gName}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const tagToInsert = '@Alle: ';
                      const currentText = generalHomeworkNotes || '';
                      const cursor = studentNotesSelectionRef.current?.start ?? currentText.length;
                      const nextText = currentText.slice(0, cursor) + (currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '') + tagToInsert + currentText.slice(cursor);
                      latestGeneralHomeworkNotesRef.current = nextText;
                      setGeneralHomeworkNotes(nextText);
                      const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
                      const noteLines = nextText.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                      const combined = [...specialNotes, ...noteLines];
                      setHomeworkNotesList(combined);
                      try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                      triggerDebouncedAutoSave(350);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                    className="hover-scale-mini"
                  >
                    + @Alle
                  </button>
                </div>
              )}

              {/* 🎙️ PROMINENTE 0,1% GOLDSTANDARD DIKTIER-LEISTE */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: isHeroListening
                    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                    : (activeNoteTarget === 'student'
                        ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
                        : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'),
                  border: isHeroListening
                    ? '1.5px solid #ef4444'
                    : (activeNoteTarget === 'student' ? '1.5px solid #a7f3d0' : '1.5px solid #fde68a'),
                  boxShadow: isHeroListening
                    ? '0 0 16px rgba(239, 68, 68, 0.25)'
                    : '0 2px 8px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isHeroListening
                        ? '#dc2626'
                        : (activeNoteTarget === 'student' ? '#16a34a' : '#d97706'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isHeroListening ? '0 0 12px rgba(220, 38, 38, 0.6)' : 'none',
                      animation: isHeroListening ? 'pulse 1.2s infinite' : 'none'
                    }}
                  >
                    <Mic size={18} strokeWidth={2.5} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.86rem',
                      fontWeight: 850,
                      color: isHeroListening
                        ? '#991b1b'
                        : (activeNoteTarget === 'student' ? '#065f46' : '#92400e'),
                      letterSpacing: '-0.01em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {isHeroListening ? (
                        <>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', animation: 'pulse 1s infinite' }} />
                          <span>Hört zu... Sprich frei heraus!</span>
                        </>
                      ) : (
                        <span>{activeNoteTarget === 'student' ? 'Hausaufgabe per Sprache diktieren' : 'Interne Notiz per Sprache diktieren'}</span>
                      )}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      color: isHeroListening
                        ? '#b91c1c'
                        : (activeNoteTarget === 'student' ? '#047857' : '#b45309'),
                      fontWeight: 600
                    }}>
                      {isHeroListening
                        ? 'Satzzeichen wie „Punkt“ oder „Absatz“ werden automatisch formatiert'
                        : '1 Klick zum Starten • Sprich deine Übeanweisung einfach ein'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleHeroListening}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isHeroListening
                      ? '#dc2626'
                      : (activeNoteTarget === 'student' ? '#34a853' : '#b45309'),
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: isHeroListening
                      ? '0 2px 10px rgba(220, 38, 38, 0.4)'
                      : '0 2px 10px rgba(0, 0, 0, 0.12)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  {isHeroListening ? (
                    <>
                      <Square size={13} fill="#ffffff" />
                      <span>Diktat beenden</span>
                    </>
                  ) : (
                    <>
                      <Mic size={14} strokeWidth={2.4} />
                      <span>Jetzt diktieren</span>
                    </>
                  )}
                </button>
              </div>

              {/* Textarea */}
              <div
                style={{
                  background: activeNoteTarget === 'student' ? '#ffffff' : '#fffdf5',
                  border: activeNoteTarget === 'student' ? '1.5px solid #34a853' : '1.5px solid #fde68a',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {activeNoteTarget === 'student' ? (
                  <textarea
                    ref={studentNotesTextareaRef}
                    placeholder="Trage hier Notizen, Hausaufgaben oder den Wochen-Fahrplan ein (oder oben auf '🎙️ Jetzt diktieren' tippen)..."
                    value={activeViewingStudentNotes}
                    rows={6}
                    onChange={(e) => {
                      const val = e.target.value;
                      studentNotesSelectionRef.current = {
                        start: e.target.selectionStart ?? val.length,
                        end: e.target.selectionEnd ?? val.length
                      };
                      if (viewingWeekOffset === 0) {
                        latestGeneralHomeworkNotesRef.current = val;
                        setGeneralHomeworkNotes(val);
                        triggerDebouncedAutoSave(500);
                      }
                    }}
                    onBlur={(e) => {
                      if (viewingWeekOffset === 0) {
                        const currentVal = latestGeneralHomeworkNotesRef.current || e.target.value || '';
                        const specialNotes = (homeworkNotesList || []).filter((n: string) => typeof n === 'string' && isInternalMetadataNote(n));
                        const noteLines = currentVal.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && !isInternalMetadataNote(s));
                        const combined = [...specialNotes, ...noteLines];
                        setHomeworkNotesList(combined);
                        try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                      }
                      triggerImmediateAutoSave();
                    }}
                    style={{
                      width: '100%',
                      minHeight: '140px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.96rem',
                      fontWeight: 550,
                      lineHeight: 1.6,
                      color: '#0f172a',
                      background: 'transparent',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                ) : (
                  <textarea
                    ref={teacherNotesTextareaRef}
                    placeholder="Vertrauliche Notizen zum Schüler (nur für dich als Lehrkraft sichtbar)..."
                    value={teacherNotes}
                    rows={6}
                    onChange={(e) => {
                      const val = e.target.value;
                      latestTeacherNotesRef.current = val;
                      setTeacherNotes(val);
                      try { localStorage.setItem(`campus_teacher_notes_${student.id}`, val); } catch {}
                      triggerDebouncedAutoSave(350);
                    }}
                    onBlur={() => triggerImmediateAutoSave()}
                    style={{
                      width: '100%',
                      minHeight: '140px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.96rem',
                      fontWeight: 550,
                      lineHeight: 1.6,
                      color: '#78350f',
                      background: 'transparent',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                )}
              </div>

              {/* Textbausteine-Dock im Editor */}
              {activeNoteTarget === 'student' && (
                <div style={{ paddingTop: '4px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#34a853" />
                    <span>Didaktische Vorlagen & Schnelltexte:</span>
                  </div>
                  <DidacticTextbausteineDock
                    schoolId={student?.school_id}
                    activeViewingStudentNotes={activeViewingStudentNotes || ''}
                    onTogglePresetChip={handleTogglePresetChip}
                    fallbackChips={PRESET_CHIPS}
                  />
                </div>
              )}
            </div>

            {/* Footer mit Übernehmen-Button */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                role="button"
                tabIndex={0}
                onClick={() => {
                  triggerImmediateAutoSave();
                  setIsNotesSheetOpen(false);
                }}
                style={{
                  background: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'none'
                }}
                className="hover-scale"
              >
                <Check size={16} strokeWidth={3} />
                <span>Fertig & Fahrplan übernehmen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎙️ MASKE 2: AKUSTIK- & AUFNAHME-STUDIO SHEET                              */}
      {/* ========================================================================= */}
      {isAudioSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Audio-Studio Aufnahme"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: isMobileView ? '12px' : '24px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRecordingAudio) {
              setIsAudioSheetOpen(false);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: isMobileView ? '20px' : '24px',
              width: '100%',
              maxWidth: '540px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Studio Header (0,1% Goldstandard: Solid Studio-Gelb #facc15) */}
            <div
              style={{
                padding: '16px 20px',
                background: '#facc15',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.08)',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <Mic size={16} strokeWidth={2.4} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, letterSpacing: '0.02em', color: '#0f172a' }}>
                    AUDIO-STUDIO
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#334155', fontWeight: 650 }}>
                    {hasTresorStorage ? 'Tresor-Aufnahme (bis zu 7 Min.)' : 'Direkt-Aufnahme (60s)'}
                  </span>
                </div>
              </div>

              {!isRecordingAudio && (
                <button
                  type="button"
                  onClick={() => setIsAudioSheetOpen(false)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.08)',
                    border: 'none',
                    borderRadius: '100px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0f172a',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                  title="Schließen"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Studio Content */}
            <div
              style={{
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center',
                background: '#ffffff'
              }}
            >
              {/* Spur-Titel Input */}
              <div style={{ width: '100%' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Titel des Hörbeispiels:
                </label>
                <input
                  type="text"
                  placeholder="z.B. Guitar Fitness S. 2 – Hörbeispiel Tempo 80..."
                  value={audioLabel}
                  onChange={(e) => setAudioLabel(e.target.value)}
                  disabled={isRecordingAudio}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.88rem',
                    fontWeight: 650,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Studio Controls: Einzähler & Metronom */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  width: '100%'
                }}
              >
                {/* Einzähler Toggle */}
                <button
                  type="button"
                  onClick={() => setIsCountInEnabled(!isCountInEnabled)}
                  disabled={isRecordingAudio}
                  style={{
                    background: isCountInEnabled ? '#fefce8' : '#f8fafc',
                    color: isCountInEnabled ? '#713f12' : '#64748b',
                    border: isCountInEnabled ? '1.5px solid #facc15' : '1px solid #e2e8f0',
                    borderRadius: '100px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: isRecordingAudio ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <Timer size={14} strokeWidth={isCountInEnabled ? 2.6 : 2} />
                  <span>{isCountInEnabled ? '✓ 4 Klicks Einzählen' : 'Einzählen aus'}</span>
                </button>

                {/* Metronom / BPM Split-Pill */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: isRecordingMetronomeActive ? '#fefce8' : '#f8fafc',
                    border: isRecordingMetronomeActive ? '1.5px solid #facc15' : '1px solid #cbd5e1',
                    borderRadius: '100px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease', overflow: 'hidden'
                  }}>
                    {/* Linker Teil: 1-Tap Metronom AN/AUS Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isRecordingMetronomeActive;
                        setIsRecordingMetronomeActive(next);
                        if (next) playMetronomeTick(true);
                      }}
                      disabled={isRecordingAudio}
                      aria-label={isRecordingMetronomeActive ? `Metronom aktiv (${recordingBpm} BPM). Tippen zum Ausschalten.` : 'Metronom einschalten'}
                      title={isRecordingMetronomeActive ? `Metronom aktiv (${recordingBpm} BPM). Tippen zum Ausschalten.` : 'Metronom einschalten'}
                      style={{
                        background: 'transparent', border: 'none', padding: '8px 12px',
                        fontSize: '0.78rem', fontWeight: 800,
                        color: isRecordingMetronomeActive ? '#713f12' : '#64748b',
                        cursor: isRecordingAudio ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px', outline: 'none'
                      }}
                      className="hover-scale-mini"
                    >
                      <Volume2 size={14} strokeWidth={isRecordingMetronomeActive ? 2.6 : 2} />
                      <span>{isRecordingMetronomeActive ? '✓ Metronom an' : 'Metronom aus'}</span>
                    </button>

                    {/* Vertikaler Trenner */}
                    <div style={{ width: '1px', height: '18px', background: isRecordingMetronomeActive ? '#eab308' : '#cbd5e1', flexShrink: 0 }} />

                    {/* Rechter Teil: BPM Trigger für Popover */}
                    <button
                      type="button"
                      onClick={() => setShowPlayAlongMetronomePopup(!showPlayAlongMetronomePopup)}
                      disabled={isRecordingAudio}
                      aria-label={`Tempo: ${recordingBpm} BPM. Tippen zum Einstellen.`}
                      title={`Tempo einstellen (${recordingBpm} BPM)`}
                      style={{
                        background: 'transparent', border: 'none', padding: '8px 10px',
                        fontSize: '0.78rem', fontWeight: 800,
                        color: isRecordingMetronomeActive ? '#713f12' : '#0f172a',
                        cursor: isRecordingAudio ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '3px', outline: 'none'
                      }}
                      className="hover-scale-mini"
                    >
                      <span>{recordingBpm} BPM</span>
                      <ChevronDown size={12} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Metronom Popup */}
                  {showPlayAlongMetronomePopup && !isRecordingAudio && (
                    <div style={{
                      position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                      background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
                      padding: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '190px'
                    }}>
                      {/* Metronom AN/AUS Schalter im Popup */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isRecordingMetronomeActive;
                          setIsRecordingMetronomeActive(next);
                          if (next) playMetronomeTick(true);
                        }}
                        style={{
                          background: isRecordingMetronomeActive ? '#fefce8' : '#f8fafc',
                          border: isRecordingMetronomeActive ? '1.5px solid #facc15' : '1px solid #cbd5e1',
                          borderRadius: '8px', padding: '7px 10px', fontSize: '0.75rem', fontWeight: 800,
                          cursor: 'pointer', color: isRecordingMetronomeActive ? '#713f12' : '#64748b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <Volume2 size={13} strokeWidth={2.4} />
                        <span>{isRecordingMetronomeActive ? '✓ Metronom aktiv' : 'Metronom einschalten'}</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setRecordingBpm(prev => Math.max(40, prev - 5))}
                          style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 800 }}
                        >
                          -5
                        </button>
                        <span style={{ fontSize: '0.88rem', fontWeight: 900 }}>{recordingBpm} BPM</span>
                        <button
                          type="button"
                          onClick={() => setRecordingBpm(prev => Math.min(260, prev + 5))}
                          style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 800 }}
                        >
                          +5
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => playMetronomeTick(true)}
                        style={{
                          background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px',
                          padding: '6px', fontSize: '0.72rem', fontWeight: 750, cursor: 'pointer', color: '#713f12'
                        }}
                      >
                        🔊 Klick kurz testen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Großer Aufnahme-Knopf / Einzähler-Status */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 0'
                }}
              >
                {playAlongCountInRemaining !== null ? (
                  <button
                    type="button"
                    onClick={cancelPlayAlongCountIn}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: '#facc15',
                      color: '#0f172a',
                      border: '4px solid #fef08a',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      animation: 'pulse 0.5s infinite'
                    }}
                  >
                    <span style={{ fontSize: '1.8rem', fontWeight: 950 }}>{playAlongCountInRemaining}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800 }}>Abbrechen</span>
                  </button>
                ) : !isRecordingAudio ? (
                  <button
                    type="button"
                    onClick={handleStartPlayAlongRecording}
                    disabled={isUploadingAudio}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: '#facc15',
                      color: '#0f172a',
                      border: '4px solid #fef08a',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isUploadingAudio ? 'not-allowed' : 'pointer',
                      boxShadow: 'none',
                      transition: 'transform 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <Mic size={28} color="#0f172a" strokeWidth={2.4} />
                    <span style={{ fontSize: '0.70rem', fontWeight: 900, marginTop: '2px', color: '#0f172a' }}>
                      START
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecordingAudio}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: '4px solid #fee2e2',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      animation: 'pulse 1s infinite'
                    }}
                  >
                    <Square size={24} fill="#ffffff" />
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, marginTop: '2px' }}>
                      STOPP
                    </span>
                  </button>
                )}

                {/* Aufnahme-Timer */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 950, color: isRecordingAudio ? '#dc2626' : '#0f172a', letterSpacing: '0.04em' }}>
                    {formatRecordTime(audioDuration)}
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650, marginLeft: '4px' }}>
                      / {hasTresorStorage ? '07:00' : '01:00'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: isRecordingAudio ? '#dc2626' : isUploadingAudio ? '#d97706' : '#713f12', fontWeight: 650 }}>
                    {isRecordingAudio ? 'Aufnahme läuft...' : isUploadingAudio ? 'Wird gespeichert...' : 'Tippe auf Start um die Aufnahme zu beginnen'}
                  </span>
                </div>
              </div>

              {/* Datenschutz- & Tresorhinweis */}
              <div
                style={{
                  fontSize: '0.70rem',
                  color: '#713f12',
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <Lock size={12} color="#eab308" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Didaktischer Audio-Tresor:</strong> Dient ausschließlich dem 1:1-Übungsgebrauch für diesen Schüler.
                </span>
              </div>
            </div>

            {/* Studio Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                role="button"
                tabIndex={0}
                onClick={() => setIsAudioSheetOpen(false)}
                disabled={isRecordingAudio}
                style={{
                  background: '#facc15',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 22px',
                  fontSize: '0.86rem',
                  fontWeight: 850,
                  cursor: isRecordingAudio ? 'not-allowed' : 'pointer',
                  boxShadow: 'none'
                }}
                className={isRecordingAudio ? '' : 'hover-scale'}
              >
                Fertig & Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
