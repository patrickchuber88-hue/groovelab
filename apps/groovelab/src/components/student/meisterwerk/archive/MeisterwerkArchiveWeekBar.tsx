import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar, HelpCircle, Headphones, BookOpen } from 'lucide-react';

export interface WeekBarItem {
  weekIso: string;
  weekNum: string;
  dateRangeStr: string;
  homeworkCount: number;
  hasQuestion: boolean;
  hasAudio: boolean;
  feedbackStatus?: 'beherrscht' | 'in_entwicklung' | 'wiederholen' | null;
}

export interface MeisterwerkArchiveWeekBarProps {
  weeks: WeekBarItem[];
  selectedWeekIso: string;
  currentWeekIso: string;
  onSelectWeek: (weekIso: string) => void;
  onBackToCurrent?: () => void;
  isMobileView?: boolean;
}

export const MeisterwerkArchiveWeekBar: React.FC<MeisterwerkArchiveWeekBarProps> = ({
  weeks,
  selectedWeekIso,
  currentWeekIso,
  onSelectWeek,
  onBackToCurrent,
  isMobileView = false
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activePillRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active pill into view when selectedWeekIso changes
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedWeekIso]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const isCurrentWeekSelected = selectedWeekIso === currentWeekIso;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        boxSizing: 'border-box',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: isMobileView ? '14px' : '18px',
        padding: isMobileView ? '8px 10px' : '10px 14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}
      role="region"
      aria-label="Kalenderwochen Archiv-Auswahl"
    >
      {/* Top Header Row: Label & Schnellzugriff zur aktuellen Woche */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              background: '#ecfdf5',
              color: '#16a34a',
              flexShrink: 0
            }}
          >
            <Calendar size={13} strokeWidth={2.5} />
          </span>
          <span
            style={{
              fontSize: isMobileView ? '0.74rem' : '0.80rem',
              fontWeight: 900,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Wochen-Archiv
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              color: '#64748b',
              fontWeight: 650
            }}
          >
            ({weeks.length} {weeks.length === 1 ? 'Woche' : 'Wochen'})
          </span>
        </div>

        {/* Back to current week button */}
        {!isCurrentWeekSelected && onBackToCurrent && (
          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={onBackToCurrent}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onBackToCurrent();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              height: '26px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '100px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
            className="hover-scale-mini"
            title="Zur aktuellen Woche zurückkehren"
            aria-label="Zur aktuellen Woche zurückkehren"
          >
            <RotateCcw size={11} strokeWidth={2.4} color="#475569" />
            <span>Zur aktuellen Woche</span>
          </button>
        )}
      </div>

      {/* Single-Row Horizontal Week Pill Bar with Navigation Chevrons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          minWidth: 0
        }}
      >
        {/* Scroll Left Button */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={handleScrollLeft}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleScrollLeft();
            }
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Vorherige Wochen anzeigen"
          aria-label="Vorherige Wochen anzeigen"
        >
          <ChevronLeft size={13} strokeWidth={2.4} />
        </button>

        {/* Scrollable Row */}
        <div
          ref={scrollContainerRef}
          role="tablist"
          aria-label="Kalenderwochen"
          className="custom-scrollbar-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
            padding: '2px 1px',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {weeks.map((wk, idx) => {
            const isSelected = wk.weekIso === selectedWeekIso;
            const isCurrent = wk.weekIso === currentWeekIso;

            return (
              <button
                key={wk.weekIso}
                ref={isSelected ? activePillRef : null}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectWeek(wk.weekIso)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectWeek(wk.weekIso);
                  } else if (e.key === 'ArrowRight' && idx < weeks.length - 1) {
                    e.preventDefault();
                    onSelectWeek(weeks[idx + 1].weekIso);
                  } else if (e.key === 'ArrowLeft' && idx > 0) {
                    e.preventDefault();
                    onSelectWeek(weeks[idx - 1].weekIso);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: isSelected ? '5px 12px' : '5px 10px',
                  borderRadius: '100px',
                  background: isSelected ? '#16a34a' : (isCurrent ? '#f0fdf4' : '#ffffff'),
                  border: isSelected ? 'none' : (isCurrent ? '1.5px solid #86efac' : '1px solid #cbd5e1'),
                  color: isSelected ? '#ffffff' : '#0f172a',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(22, 163, 74, 0.28)' : '0 1px 2px rgba(0,0,0,0.02)',
                  outline: 'none'
                }}
                className={isSelected ? '' : 'hover-scale-mini'}
                title={`KW ${wk.weekNum} ${wk.dateRangeStr ? `(${wk.dateRangeStr})` : ''} auswählen`}
              >
                {/* Week Label */}
                <span style={{ fontWeight: 900, whiteSpace: 'nowrap' }}>
                  KW {wk.weekNum}
                </span>

                {/* Date snippet */}
                {wk.dateRangeStr && (
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 650,
                      opacity: isSelected ? 0.9 : 0.7,
                      color: isSelected ? '#ffffff' : '#475569',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {wk.dateRangeStr.replace(/\s*–\s*/, '–')}
                  </span>
                )}

                {/* Micro Indicators for Questions & Audio */}
                {wk.hasQuestion && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#fef08a',
                      color: isSelected ? '#ffffff' : '#713f12',
                      fontSize: '0.60rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}
                    title="Enthält Frage an die Lehrkraft"
                  >
                    ❓
                  </span>
                )}

                {wk.hasAudio && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#dbeafe',
                      color: isSelected ? '#ffffff' : '#1e40af',
                      fontSize: '0.60rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}
                    title="Enthält Audio-Aufnahme"
                  >
                    🎙️
                  </span>
                )}

                {/* Task Count Badge */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1px 6px',
                    borderRadius: '100px',
                    fontSize: '0.62rem',
                    fontWeight: 850,
                    background: isSelected
                      ? 'rgba(255, 255, 255, 0.22)'
                      : (wk.homeworkCount > 0 ? '#dcfce7' : '#f1f5f9'),
                    color: isSelected
                      ? '#ffffff'
                      : (wk.homeworkCount > 0 ? '#15803d' : '#64748b'),
                    flexShrink: 0
                  }}
                >
                  {wk.homeworkCount} {wk.homeworkCount === 1 ? 'Aufgabe' : 'Aufgaben'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={handleScrollRight}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleScrollRight();
            }
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Nächste Wochen anzeigen"
          aria-label="Nächste Wochen anzeigen"
        >
          <ChevronRight size={13} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
};
