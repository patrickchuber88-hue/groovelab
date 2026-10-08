import React from 'react';
import { Volume2, Check, Music, Globe } from 'lucide-react';
import { ParsedWorldTourMastery } from '../../meisterwerk.types';

interface WorldTourMasteryNoteCardProps {
  masteries: ParsedWorldTourMastery[];
  readOnly?: boolean;
  studentFirstName?: string;
  onAcknowledge?: (countryCode: string) => void;
  onOpenStation?: (countryCode: string) => void;
  onSpeak?: (text: string, key?: string) => void;
  isSpeaking?: boolean;
  activeTtsKey?: string | null;
  isMobileView?: boolean;
}

export const WorldTourMasteryNoteCard: React.FC<WorldTourMasteryNoteCardProps> = ({
  masteries,
  readOnly = false,
  studentFirstName = 'Schüler',
  onAcknowledge,
  onOpenStation,
  onSpeak,
  isSpeaking = false,
  activeTtsKey = null,
  isMobileView = false
}) => {
  if (!masteries || masteries.length === 0) return null;

  const renderSingleItem = (item: ParsedWorldTourMastery, index: number) => {
    const ttsKey = `wt_mastery_${item.countryCode}_${index}`;
    const isSpeakingThis = isSpeaking && activeTtsKey === ttsKey;

    const speechText = readOnly
      ? `Du hast die Nationalhymne von ${item.countryName}, ${item.anthemTitle}, mit ${item.stars} ${item.stars === 1 ? 'Stern' : 'Sternen'} und ${item.score} Prozent gemeistert.`
      : `${studentFirstName} hat die Nationalhymne von ${item.countryName}, ${item.anthemTitle}, mit ${item.stars} ${item.stars === 1 ? 'Stern' : 'Sternen'} und ${item.score} Prozent gemeistert.`;

    const starString = '⭐'.repeat(Math.max(1, Math.min(3, item.stars)));

    return (
      <div
        key={`wt-mastery-row-${item.countryCode}-${index}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '6px 0',
          borderBottom: index < masteries.length - 1 ? '1px dashed #fef08a' : 'none'
        }}
      >
        {/* Left: Message & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
            {item.flagEmoji}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: isMobileView ? '0.86rem' : '0.90rem',
                  fontWeight: 750,
                  color: '#0f172a',
                  lineHeight: 1.35
                }}
              >
                „Ich habe die Hymne gemeistert: <strong>{item.anthemTitle}</strong> ({item.countryName})“
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '3px',
                fontSize: '0.74rem',
                color: '#854d0e',
                fontWeight: 650,
                flexWrap: 'wrap'
              }}
            >
              <span style={{ letterSpacing: '0.05em' }}>{starString}</span>
              <span>•</span>
              <span
                style={{
                  background: '#fef08a',
                  color: '#854d0e',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontWeight: 800
                }}
              >
                {item.score}%
              </span>
              <span>•</span>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>+{item.xp} XP</span>

              {item.isAcknowledged ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontWeight: 800
                  }}
                >
                  <Check size={11} strokeWidth={2.5} />
                  <span>Besprochen & Gewürdigt ✓</span>
                </span>
              ) : (
                <span style={{ color: '#92400e', opacity: 0.85 }}>
                  {readOnly ? '✨ Für Deine Lehrkraft zur nächsten Stunde notiert' : `✨ Notiz von ${studentFirstName}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* 1-Click Jump to Score Player in WorldTour */}
          {onOpenStation && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              onClick={() => onOpenStation(item.countryCode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenStation(item.countryCode);
                }
              }}
              title="Notenblatt in WorldTour öffnen"
              aria-label={`Notenblatt von ${item.anthemTitle} in WorldTour öffnen`}
              style={{
                border: '1px solid rgba(250, 204, 21, 0.7)',
                background: '#ffffff',
                color: '#854d0e',
                borderRadius: '8px',
                width: isMobileView ? '34px' : '30px',
                height: isMobileView ? '34px' : '30px',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation'
              }}
              className="hover-scale-mini"
            >
              <Music size={14} strokeWidth={2.2} />
            </button>
          )}

          {/* TTS Vorlesen Button */}
          {onSpeak && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              onClick={() => onSpeak(speechText, ttsKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSpeak(speechText, ttsKey);
                }
              }}
              title="Erfolgs-Notiz vorlesen"
              aria-label="Erfolgs-Notiz vorlesen"
              style={{
                border: '1px solid rgba(250, 204, 21, 0.7)',
                background: isSpeakingThis ? '#fef08a' : '#ffffff',
                color: '#854d0e',
                borderRadius: '8px',
                width: isMobileView ? '34px' : '30px',
                height: isMobileView ? '34px' : '30px',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation'
              }}
              className="hover-scale-mini"
            >
              <Volume2 size={14} strokeWidth={2.2} />
            </button>
          )}

          {/* Teacher Acknowledge Button */}
          {!readOnly && !item.isAcknowledged && onAcknowledge && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              onClick={() => onAcknowledge(item.countryCode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAcknowledge(item.countryCode);
                }
              }}
              title="Als im Unterricht gewürdigt markieren"
              aria-label="Als im Unterricht gewürdigt markieren"
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                height: isMobileView ? '34px' : '30px',
                borderRadius: '100px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation'
              }}
              className="hover-scale-mini"
            >
              <Check size={13} strokeWidth={2.5} />
              <span>Im Unterricht gewürdigt</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: '#fffdf0',
        border: '1.5px solid #fde047',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.15s ease'
      }}
    >
      {/* Header Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#facc15',
              color: '#0f172a',
              fontSize: '0.68rem',
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '2px 8px',
              borderRadius: '100px',
              boxShadow: 'none',
              flexShrink: 0
            }}
          >
            <Globe size={11} strokeWidth={2.5} />
            <span>WorldTour</span>
          </span>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#854d0e',
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}
          >
            {readOnly ? 'Notiz an Lehrkraft' : `Schülernotiz von ${studentFirstName}`}
          </span>
        </div>

        {masteries.length > 1 && (
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              background: '#fef08a',
              color: '#854d0e',
              padding: '1px 6px',
              borderRadius: '100px'
            }}
          >
            {masteries.length} Hymnen gemeistert
          </span>
        )}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {masteries.map((m, idx) => renderSingleItem(m, idx))}
      </div>
    </div>
  );
};
