import React from 'react';
import { Compass, Clock, DoorClosed, CheckCircle, Volume2, Play, Pause } from 'lucide-react';
import { TagesKompassTeacher, TagesKompassStudent, TagesKompassPrep, formatTagesKompassStudentName } from './types';
import { AvatarImage } from '../../common/AvatarImage';

interface TagesKompassPreflightProps {
  teacher: TagesKompassTeacher;
  totalSlots: number;
  firstSlotStartStr?: string;
  lastSlotEndStr?: string;
  currentRoom?: string;
  firstStudent?: TagesKompassStudent | null;
  firstStudentPrep?: TagesKompassPrep | null;
  playingAudioUrl?: string | null;
  onTogglePlayAudio?: (url: string) => void;
  urgentCancellationsCount?: number;
}

export const TagesKompassPreflight: React.FC<TagesKompassPreflightProps> = ({
  teacher,
  totalSlots,
  firstSlotStartStr = '13:15',
  lastSlotEndStr = '16:45',
  currentRoom = 'Raum 4',
  firstStudent,
  firstStudentPrep,
  playingAudioUrl,
  onTogglePlayAudio,
  urgentCancellationsCount = 0
}) => {
  const prevNotes = firstStudentPrep?.prevWeekNotes || [];
  const prevAudioNote = prevNotes.find(n => typeof n === 'string' && n.startsWith('AUDIO:'));
  const prevAudioUrl = prevAudioNote ? prevAudioNote.replace('AUDIO:', '').trim() : null;
  const prevTextNote = prevNotes.find(n => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('LEHRWERK:')) || '';

  const isAudioPlaying = Boolean(prevAudioUrl && playingAudioUrl === prevAudioUrl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* 1. Preflight Header (100% Monochrom, Kein Blau) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div 
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0'
            }}
          >
            <Compass size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Tages-Kompass
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              Dein Unterrichtstag im Überblick
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 750,
            color: '#334155',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }} />
          <span>{totalSlots} {totalSlots === 1 ? 'Einheit heute' : 'Einheiten heute'}</span>
        </span>
      </div>

      {/* 2. Flüssige Tages-Metazeile (Kompakt & harmonisch, ohne Kachel-Gitter) */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="#64748b" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
            {firstSlotStartStr} – {lastSlotEndStr} Uhr
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', background: '#e2e8f0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DoorClosed size={14} color="#64748b" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
            {currentRoom} (Bereit)
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', background: '#e2e8f0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} color={urgentCancellationsCount > 0 ? '#ea580c' : '#16a34a'} />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: urgentCancellationsCount > 0 ? '#ea580c' : '#16a34a' }}>
            {urgentCancellationsCount > 0 ? `${urgentCancellationsCount} Ausfall` : 'Keine Ausfälle'}
          </span>
        </div>
      </div>

      {/* 3. Start-Fokus: Erster Schüler des Tages */}
      {firstStudent && (
        <div 
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>
              Erster Schüler heute um {firstSlotStartStr} Uhr
            </span>
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 750,
              color: '#15803d',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              padding: '2px 8px',
              borderRadius: '100px'
            }}>
              Bereit
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#f1f5f9',
                flexShrink: 0
              }}
            >
              <AvatarImage 
                src={firstStudent.photo_url && !firstStudent.photo_url.includes('avatar_ghost') ? firstStudent.photo_url : null} 
                user={{
                  ...firstStudent,
                  role: 'student',
                  instrument: firstStudent.instrument || 'Gitarre',
                  resolved_instrument: firstStudent.instrument || 'Gitarre'
                }} 
                activePlatform="campus" 
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatTagesKompassStudentName(firstStudent)}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                {firstStudent.instrument || 'Gitarre'} • {currentRoom}
              </div>
            </div>
          </div>

          {/* Vorwochen-Vorschau zur mentalen Einstimmung */}
          {(prevTextNote || prevAudioUrl) && (
            <div 
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Letzte Aufgabe: </span>
                {prevTextNote || 'Sprachmemo hinterlegt'}
              </div>

              {prevAudioUrl && onTogglePlayAudio && (
                <button
                  type="button"
                  onClick={() => onTogglePlayAudio(prevAudioUrl)}
                  aria-label={isAudioPlaying ? "Sprachmemo pausieren" : "Sprachmemo der Vorwoche abspielen"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isAudioPlaying ? '#fee2e2' : '#f0fdf4',
                    color: isAudioPlaying ? '#dc2626' : '#16a34a',
                    border: isAudioPlaying ? '1px solid #fecaca' : '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  {isAudioPlaying ? <Pause size={11} fill="#dc2626" /> : <Play size={11} fill="#16a34a" />}
                  <span>{isAudioPlaying ? 'Stop' : 'Anhören'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Subtiler System-Hinweis */}
      <div style={{ textAlign: 'center', padding: '2px 0', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600 }}>
        Schaltet um {firstSlotStartStr} Uhr automatisch in den Live-Unterricht
      </div>
    </div>
  );
};
