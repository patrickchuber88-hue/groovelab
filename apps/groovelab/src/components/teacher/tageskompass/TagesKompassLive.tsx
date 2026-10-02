import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Check, 
  ArrowRight, 
  Coffee,
  Volume2,
  Edit2,
  Zap
} from 'lucide-react';
import { 
  TagesKompassStudent, 
  TagesKompassPrep, 
  TagesKompassTimelineSlot,
  formatTagesKompassStudentName,
  formatTagesKompassGroupNames
} from './types';
import { AvatarImage } from '../../common/AvatarImage';
import { TagesKompassSmartInput } from './TagesKompassSmartInput';
import { 
  WochenFahrplanAudioPlayer, 
  WochenFahrplanDidaktikChips, 
  WochenFahrplanBookPill,
  parseHomeworkAudioNotes,
  parseHomeworkLehrwerke,
  extractActiveDidacticTags
} from './wochenfahrplan';
import { resolveStudentInstrument } from '../utils/teacherDashboardUtils';

interface TagesKompassLiveProps {
  isPause?: boolean;
  pauseMinutesRemaining?: number;
  nextPauseSlot?: TagesKompassTimelineSlot | null;
  activeStudent: TagesKompassStudent | null;
  activeGroupStudents?: TagesKompassStudent[];
  prep: TagesKompassPrep | null;
  slotStartTime?: string;
  slotEndTime?: string;
  currentRoom?: string;
  slotIdx?: number;
  totalSlots?: number;
  nextSlot?: TagesKompassTimelineSlot | null;
  playingAudioUrl?: string | null;
  onTogglePlayAudio?: (url: string) => void;
  onSaveQuickHomework: (prep: TagesKompassPrep, customNote?: string) => Promise<void>;
  onOpenStudio?: () => void;
  onOpenToolbox?: () => void;
  onOpenNotes?: () => void;
  onOpenQuickModal?: (student?: any) => void;
  onOpenDocument?: (student?: any) => void;
  teacher?: any;
}

export const TagesKompassLive: React.FC<TagesKompassLiveProps> = ({
  isPause = false,
  pauseMinutesRemaining = 0,
  nextPauseSlot,
  activeStudent,
  activeGroupStudents = [],
  prep,
  slotStartTime = '13:45',
  slotEndTime = '14:15',
  currentRoom = 'Raum 4',
  slotIdx = 1,
  totalSlots = 7,
  nextSlot,
  playingAudioUrl,
  onTogglePlayAudio,
  onSaveQuickHomework,
  onOpenStudio,
  onOpenToolbox,
  onOpenNotes,
  onOpenQuickModal,
  onOpenDocument,
  teacher
}) => {
  const [isEditingCurrentHomework, setIsEditingCurrentHomework] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Daten der Vorwoche (Wochen-Fahrplan)
  const prevNotes = prep?.prevWeekNotes || [];
  const prevTextNote = prevNotes.find(n => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('LEHRWERK:') && !n.startsWith('LOOP:') && !n.startsWith('STICKER:')) || '';
  const prevAudioTracks = useMemo(() => parseHomeworkAudioNotes(prevNotes), [prevNotes]);
  const prevLehrwerke = useMemo(() => parseHomeworkLehrwerke(prevNotes), [prevNotes]);
  const activePrevTags = useMemo(() => extractActiveDidacticTags(prevTextNote), [prevTextNote]);
  const hasPrevHomework = Boolean(prevTextNote || prevAudioTracks.length > 0 || prevLehrwerke.length > 0 || (prep?.prevWeekItems && prep.prevWeekItems.length > 0));

  // Daten dieser Woche (Wochen-Fahrplan)
  const currentNotes = prep?.currentWeekNotes || [];
  const currentTextNote = currentNotes.find(n => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('LEHRWERK:') && !n.startsWith('LOOP:') && !n.startsWith('STICKER:')) || '';
  const currentAudioTracks = useMemo(() => parseHomeworkAudioNotes(currentNotes), [currentNotes]);
  const currentLehrwerke = useMemo(() => parseHomeworkLehrwerke(currentNotes), [currentNotes]);
  const activeCurrentTags = useMemo(() => extractActiveDidacticTags(currentTextNote), [currentTextNote]);
  const hasCurrentHomework = Boolean(currentTextNote || currentAudioTracks.length > 0 || currentLehrwerke.length > 0 || (prep?.currentWeekItems && prep.currentWeekItems.length > 0));

  // 1. Pausen-Modus (Relax & Prep)
  if (isPause) {
    const nextStudentName = formatTagesKompassStudentName(nextPauseSlot?.student, nextPauseSlot?.studentName);
    const nextInst = resolveStudentInstrument(nextPauseSlot?.student?.instrument, nextPauseSlot?.instrument, teacher?.instrument);
    const nextTime = nextPauseSlot?.timeSlot || nextPauseSlot?.start_time || '';

    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '18px 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coffee size={20} color="#64748b" />
            <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e293b' }}>
              Pause & Vorbereitung
            </span>
          </div>

          <span 
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              color: '#475569',
              background: '#e2e8f0',
              padding: '3px 10px',
              borderRadius: '100px'
            }}
          >
            {pauseMinutesRemaining > 0 ? `Noch ${pauseMinutesRemaining} Min.` : 'Gleich geht es weiter'}
          </span>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          Nutze die Pause zum Durchatmen oder Vorbereiten.
        </div>

        {nextPauseSlot && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '10px 14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Als Nächstes:</span>
              <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a' }}>{nextStudentName}</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>• {nextInst}</span>
            </div>
            {nextTime && (
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>{nextTime} Uhr</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. Live Focus Session für aktiven Schüler
  const isGroup = activeGroupStudents.length > 1;
  const studentDisplayName = isGroup 
    ? formatTagesKompassGroupNames(activeGroupStudents)
    : formatTagesKompassStudentName(activeStudent, prep?.studentName);

  const studentInstrument = resolveStudentInstrument(activeStudent?.instrument, prep?.instrument, teacher?.instrument);

  // Berechne Restzeit & Fortschrittsbalken
  const now = new Date();
  const [startH, startM] = slotStartTime.split(':').map(Number);
  const [endH, endM] = slotEndTime.split(':').map(Number);
  const startMs = new Date(now).setHours(startH || 0, startM || 0, 0, 0);
  const endMs = new Date(now).setHours(endH || 0, endM || 0, 0, 0);
  const totalMs = Math.max(endMs - startMs, 1);
  const elapsedMs = Math.max(0, Math.min(now.getTime() - startMs, totalMs));
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
  const minutesRemaining = Math.max(0, Math.ceil((endMs - now.getTime()) / 60000));

  const handleSaveText = async (text: string) => {
    if (!prep) return;
    setIsSaving(true);
    try {
      await onSaveQuickHomework(prep, text);
      setIsEditingCurrentHomework(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAudio = async (audioUrl: string) => {
    if (!prep) return;
    setIsSaving(true);
    try {
      await onSaveQuickHomework(prep, `AUDIO:${audioUrl}`);
      setIsEditingCurrentHomework(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* 1. Apple-Style Live Header mit Quick-Tools */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '10px',
          width: '100%'
        }}
      >
        {/* Links: Schüler & Fach */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#f1f5f9',
              flexShrink: 0
            }}
          >
            <AvatarImage 
              src={activeStudent?.photo_url && !activeStudent.photo_url.includes('avatar_ghost') ? activeStudent.photo_url : null} 
              user={{
                ...(activeStudent || prep || {}),
                role: 'student',
                instrument: studentInstrument,
                resolved_instrument: studentInstrument
              }} 
              activePlatform="campus" 
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {studentDisplayName}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748b' }}>
              {studentInstrument} • {currentRoom}
            </div>
          </div>
        </div>

        {/* Rechts: Restzeit-Pille & Dezent Quick-Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Restzeit Badge */}
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              color: '#15803d',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              padding: '3px 9px',
              borderRadius: '100px',
              whiteSpace: 'nowrap'
            }}
          >
            {slotStartTime}–{slotEndTime} ({minutesRemaining}m)
          </span>
        </div>
      </div>

      {/* Diskreter Restzeit-Fortschrittsbalken */}
      <div 
        style={{
          width: '100%',
          height: '3px',
          background: '#f1f5f9',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: minutesRemaining <= 3 ? '#eab308' : '#34a853',
            transition: 'width 0.5s ease'
          }}
        />
      </div>

      {/* 2. Didaktischer Fokus (Hausaufgabe Vorwoche vs. Heute) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {hasCurrentHomework && !isEditingCurrentHomework ? (
          // Zustand A: Für heute ist bereits eine Hausaufgabe zugewiesen
          <div 
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hausaufgabe für heute zugewiesen ✓
              </span>
              <button
                type="button"
                onClick={() => onOpenQuickModal ? onOpenQuickModal(activeStudent) : setIsEditingCurrentHomework(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#15803d',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Edit2 size={12} />
                <span>Bearbeiten</span>
              </button>
            </div>

            {currentTextNote && (
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#14532d', lineHeight: 1.4 }}>
                {currentTextNote}
              </div>
            )}

            {/* Didaktische Fokus-Badges */}
            {activeCurrentTags.length > 0 && (
              <WochenFahrplanDidaktikChips mode="badge" activeItems={activeCurrentTags} />
            )}

            {/* Angehängte Lehrwerke & Noten */}
            {currentLehrwerke.length > 0 && (
              <WochenFahrplanBookPill 
                lehrwerke={currentLehrwerke} 
                onOpenBook={() => onOpenDocument?.(activeStudent)} 
              />
            )}

            {/* 0,1% Goldstandard Unified Audio Waveform Player */}
            {currentAudioTracks.length > 0 && (
              <div style={{ marginTop: '2px' }}>
                <WochenFahrplanAudioPlayer
                  tracks={currentAudioTracks}
                  readOnly={true}
                  topicName="Wochen-Fahrplan"
                />
              </div>
            )}
          </div>
        ) : (
          // Zustand B: Zeige Vorwochen-Hausaufgabe als aktives Unterrichtsziel
          <div 
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Aufgabe der letzten Woche (KW {prep?.prevWeekNum || ''})
              </span>
              {isEditingCurrentHomework && (
                <button
                  type="button"
                  onClick={() => setIsEditingCurrentHomework(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: hasPrevHomework ? '#1e293b' : '#94a3b8', lineHeight: 1.4 }}>
              {hasPrevHomework 
                ? (prevTextNote || (prevAudioTracks.length > 0 ? 'Sprachmemo aus Vorwoche' : 'Aufgabe hinterlegt'))
                : 'Keine Hausaufgabe aus der Vorwoche erfasst.'}
            </div>

            {/* Didaktische Fokus-Badges Vorwoche */}
            {activePrevTags.length > 0 && (
              <WochenFahrplanDidaktikChips mode="badge" activeItems={activePrevTags} />
            )}

            {/* Angehängte Lehrwerke & Noten Vorwoche */}
            {prevLehrwerke.length > 0 && (
              <WochenFahrplanBookPill 
                lehrwerke={prevLehrwerke} 
                onOpenBook={() => onOpenDocument?.(activeStudent)} 
              />
            )}

            {/* 0,1% Goldstandard Unified Audio Waveform Player Vorwoche */}
            {prevAudioTracks.length > 0 && (
              <div style={{ marginTop: '2px' }}>
                <WochenFahrplanAudioPlayer
                  tracks={prevAudioTracks}
                  readOnly={true}
                  topicName="Vorwoche"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. Instant-Hybrid Smart-Input für neue Hausaufgabe */}
        {(!hasCurrentHomework || isEditingCurrentHomework) && prep && (
          <div style={{ marginTop: '2px' }}>
            <TagesKompassSmartInput
              studentId={prep.studentId}
              studentName={studentDisplayName}
              isSaving={isSaving}
              onSaveText={handleSaveText}
              onSaveAudio={handleSaveAudio}
            />
            {onOpenQuickModal && (
              <button
                type="button"
                onClick={() => onOpenQuickModal(activeStudent)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  marginTop: '6px',
                  background: 'transparent',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={12} color="#059669" />
                <span>Im Schnellmodal (mit Metronom & Didaktik-Chips) öffnen</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Smart Transition Teaser (Letzte 3 Minuten vor Unterrichtsende) */}
      {minutesRemaining <= 3 && nextSlot && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fffbeb',
            border: '1px solid #fef08a',
            borderRadius: '12px',
            padding: '8px 12px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
              Als Nächstes ({nextSlot.timeSlot || nextSlot.start_time} Uhr):
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#78350f' }}>
              {formatTagesKompassStudentName(nextSlot.student, nextSlot.studentName)}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
              • {resolveStudentInstrument(nextSlot.student?.instrument, nextSlot.instrument, teacher?.instrument)}
            </span>
          </div>

          <ArrowRight size={14} color="#92400e" />
        </div>
      )}
    </div>
  );
};
