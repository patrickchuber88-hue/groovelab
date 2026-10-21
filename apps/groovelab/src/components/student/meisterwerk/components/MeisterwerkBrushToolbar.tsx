import React from 'react';
import { Edit3, MousePointer, RotateCcw } from 'lucide-react';

export type MeisterwerkBrushType = 'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY' | 'STUDENT_FOCUS';

export interface MeisterwerkBrushToolbarProps {
  activeBrush: MeisterwerkBrushType;
  setActiveBrush: React.Dispatch<React.SetStateAction<MeisterwerkBrushType>>;
  isStudentViewingTeacherBook: boolean;
  focusCount?: number;
}

/**
 * 🖌️ MeisterwerkBrushToolbar
 * Apple Segmented Tool Control für Lehrwerk-Seiten.
 * Trennt strikt den neutralen Auswahlmodus (Nicht färben) von den didaktischen
 * Farb-Pinseln (Hausaufgabe, Gemeistert) und dem Radiergummi (Zurücksetzen).
 * 
 * 0,1% Enterprise Goldstandard / Apple 2-Farben Design System konform (border: none bei gefüllten Zuständen).
 */
export const MeisterwerkBrushToolbar: React.FC<MeisterwerkBrushToolbarProps> = ({
  activeBrush,
  setActiveBrush,
  isStudentViewingTeacherBook,
  focusCount = 0
}) => {
  if (isStudentViewingTeacherBook) {
    const isFocusActive = activeBrush === 'STUDENT_FOCUS';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'white',
          borderRadius: '18px',
          padding: '10px 16px',
          border: isFocusActive ? '1.5px solid #a855f7' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isFocusActive ? '0 3px 12px rgba(168, 85, 247, 0.12)' : '0 4px 15px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isFocusActive ? '#7e22ce' : '#4b5563', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Edit3 size={13} strokeWidth={2.2} />
            <span>Pinsel für geübte Seiten:</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveBrush(prev => (prev === 'STUDENT_FOCUS' ? 'NONE' : 'STUDENT_FOCUS'));
            }}
            style={{
              height: '30px',
              borderRadius: '12px',
              padding: '0 12px',
              background: isFocusActive ? '#9333ea' : '#f3e8ff',
              border: 'none',
              color: isFocusActive ? '#ffffff' : '#6b21a8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
              boxShadow: isFocusActive ? '0 2px 10px rgba(147, 51, 234, 0.35)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              fontWeight: 850
            }}
            className="hover-scale-mini"
            title={`Zuhause geübt${focusCount > 0 ? ` (${focusCount})` : ''}`}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isFocusActive ? '#ffffff' : '#9333ea'
              }}
            />
            <span>{isFocusActive ? '✓ Pinsel aktiv' : 'Zuhause geübt'}</span>
            {focusCount > 0 && (
              <span style={{ fontSize: '0.66rem', fontWeight: 800, opacity: 0.85 }}>
                ({focusCount})
              </span>
            )}
          </button>
        </div>
        {isFocusActive && (
          <div style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: 700, paddingLeft: '18px' }}>
            Tippe auf Seiten in der Übersicht, um zu markieren, welche Seiten du zuhause geübt hast!
          </div>
        )}
      </div>
    );
  }

  // Teacher View: Apple Segmented Tool Control
  const isSelectActive = activeBrush === 'NONE';
  const isHomeworkActive = activeBrush === 'HOMEWORK';
  const isMasteredActive = activeBrush === 'MASTERED';
  const isLockedActive = activeBrush === 'LOCKED';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'white',
        borderRadius: '18px',
        padding: '10px 14px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        transition: 'all 0.15s ease'
      }}
      role="group"
      aria-label="Werkzeuge und Pinsel zur Seitenauswahl"
    >
      {/* Header with Title and Active State Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Edit3 size={13} strokeWidth={2.2} style={{ color: '#64748b' }} />
          <span>Werkzeug & Pinsel:</span>
        </span>

        {/* Apple Soft Tinted Active State Badge */}
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '999px',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: isSelectActive
              ? '#f1f5f9'
              : isHomeworkActive
              ? 'rgba(234, 179, 8, 0.14)'
              : isMasteredActive
              ? 'rgba(16, 185, 129, 0.14)'
              : 'rgba(100, 116, 139, 0.14)',
            color: isSelectActive
              ? '#475569'
              : isHomeworkActive
              ? '#854d0e'
              : isMasteredActive
              ? '#166534'
              : '#334155'
          }}
        >
          {isSelectActive && '↖ Auswählen (neutral)'}
          {isHomeworkActive && '🟡 Hausaufgabe aktiv'}
          {isMasteredActive && '🟢 Gemeistert aktiv'}
          {isLockedActive && '⌫ Zurücksetzen aktiv'}
        </span>
      </div>

      {/* Apple Segmented Control Track */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '2px',
          border: 'none'
        }}
      >
        {/* 1. Neutral / Auswählen Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBrush('NONE');
          }}
          style={{
            flex: 1,
            height: '28px',
            borderRadius: '9px',
            padding: '0 6px',
            background: isSelectActive ? '#ffffff' : 'transparent',
            border: 'none',
            color: isSelectActive ? '#0f172a' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            boxShadow: isSelectActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '0.71rem',
            fontWeight: isSelectActive ? 850 : 700
          }}
          title="Auswählen (Neutral): Klick auf Seitenzahlen navigiert nur, ohne zu färben"
          aria-pressed={isSelectActive}
        >
          <MousePointer size={11} strokeWidth={2.4} style={{ color: isSelectActive ? '#0f172a' : '#64748b' }} />
          <span>Auswählen</span>
        </button>

        {/* 2. Hausaufgabe (Gelb) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBrush(prev => (prev === 'HOMEWORK' ? 'NONE' : 'HOMEWORK'));
          }}
          style={{
            flex: 1,
            height: '28px',
            borderRadius: '9px',
            padding: '0 6px',
            background: isHomeworkActive ? '#fde047' : 'transparent',
            border: 'none',
            color: isHomeworkActive ? '#854d0e' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            boxShadow: isHomeworkActive ? '0 1.5px 5px rgba(234, 179, 8, 0.3)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '0.71rem',
            fontWeight: isHomeworkActive ? 850 : 700
          }}
          title="Hausaufgabe-Pinsel: Klick auf Seiten färbt sie gelb als Hausaufgabe"
          aria-pressed={isHomeworkActive}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#facc15',
              flexShrink: 0
            }}
          />
          <span>Aufgabe</span>
        </button>

        {/* 3. Gemeistert (Grün) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBrush(prev => (prev === 'MASTERED' ? 'NONE' : 'MASTERED'));
          }}
          style={{
            flex: 1,
            height: '28px',
            borderRadius: '9px',
            padding: '0 6px',
            background: isMasteredActive ? '#10b981' : 'transparent',
            border: 'none',
            color: isMasteredActive ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            boxShadow: isMasteredActive ? '0 1.5px 5px rgba(16, 185, 129, 0.3)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '0.71rem',
            fontWeight: isMasteredActive ? 850 : 700
          }}
          title="Gemeistert-Pinsel: Klick auf Seiten färbt sie grün als gemeistert"
          aria-pressed={isMasteredActive}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isMasteredActive ? '#ffffff' : '#10b981',
              flexShrink: 0
            }}
          />
          <span>Gemeistert</span>
        </button>

        {/* 4. Zurücksetzen (Radiergummi / Grau) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBrush(prev => (prev === 'LOCKED' ? 'NONE' : 'LOCKED'));
          }}
          style={{
            flex: 1,
            height: '28px',
            borderRadius: '9px',
            padding: '0 6px',
            background: isLockedActive ? '#64748b' : 'transparent',
            border: 'none',
            color: isLockedActive ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            boxShadow: isLockedActive ? '0 1.5px 5px rgba(100, 116, 139, 0.3)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '0.71rem',
            fontWeight: isLockedActive ? 850 : 700
          }}
          title="Radiergummi: Klick auf Seiten setzt den Status zurück auf offen (grau)"
          aria-pressed={isLockedActive}
        >
          <RotateCcw size={10} strokeWidth={2.4} style={{ color: isLockedActive ? '#ffffff' : '#64748b' }} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
