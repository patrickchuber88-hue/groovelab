import React, { useState, useMemo, useEffect } from 'react';
import {
  History, ArrowLeft, RotateCcw, Calendar, CheckCircle2,
  HelpCircle, Mic, BookOpen, ChevronDown
} from 'lucide-react';
import { SKILL_TAGS } from '../../meisterwerk.types';
import type { WeekBarItem } from './MeisterwerkArchiveWeekBar';
export type { WeekBarItem };

export interface MonthGroup {
  monthKey: string;      // z. B. "2026-10"
  monthTitle: string;    // z. B. "Oktober 2026"
  totalWeeks: number;
  totalHomeworkCount: number;
  hasAudio: boolean;
  hasQuestion: boolean;
  weeks: WeekBarItem[];
}

/**
 * 📅 Ermittelt deterministisch Jahr und Monat einer ISO-Woche (z. B. "2026-W41" -> "Oktober 2026")
 * nach der ISO-8601-Donnerstag-Regel.
 */
const getMonthInfoForWeek = (weekIso: string): { monthKey: string; monthTitle: string } => {
  if (!weekIso || !weekIso.includes('-W')) {
    return { monthKey: 'unbekannt', monthTitle: 'Weitere Wochen' };
  }
  const [yearStr, weekStr] = weekIso.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  if (isNaN(year) || isNaN(week)) {
    return { monthKey: 'unbekannt', monthTitle: 'Weitere Wochen' };
  }

  // ISO 8601: Der Donnerstag definiert das ISO-Wochenjahr und den dominanten Monat
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const thursdayWeek1 = new Date(jan4.getTime() + (4 - dayOfWeek) * 86400000);
  const thursday = new Date(thursdayWeek1.getTime() + (week - 1) * 7 * 86400000);

  const m = thursday.getUTCMonth();
  const y = thursday.getUTCFullYear();
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const monthTitle = `${monthNames[m] || 'Monat'} ${y}`;
  return { monthKey, monthTitle };
};

export interface MeisterwerkArchiveModuleViewProps {
  weeks: WeekBarItem[];
  selectedWeekIso: string | null;
  currentWeekIso: string;
  onSelectWeek: (weekIso: string) => void;
  onBackToModules: () => void;
  isReadOnly: boolean;
  pendingFeedbackStatus?: 'beherrscht' | 'in_entwicklung' | 'wiederholen' | null;
  setPendingFeedbackStatus?: React.Dispatch<React.SetStateAction<any>>;
  pendingFeedbackTags?: string[];
  setPendingFeedbackTags?: React.Dispatch<React.SetStateAction<any>>;
  onSaveFeedback?: () => Promise<void> | void;
  isSavingFeedback?: boolean;
  isMobileView?: boolean;
}

export const MeisterwerkArchiveModuleView: React.FC<MeisterwerkArchiveModuleViewProps> = ({
  weeks,
  selectedWeekIso,
  currentWeekIso,
  onSelectWeek,
  onBackToModules,
  isReadOnly,
  pendingFeedbackStatus,
  setPendingFeedbackStatus,
  pendingFeedbackTags = [],
  setPendingFeedbackTags,
  onSaveFeedback,
  isSavingFeedback = false,
  isMobileView = false
}) => {
  const selectedWeekItem = weeks.find(w => w.weekIso === selectedWeekIso);
  const selectedWeekNum = selectedWeekItem?.weekNum || selectedWeekIso?.split('-W')[1] || '';

  // 🏛️ Gruppierung nach Kalendermonaten (Apple Inset Grouped Standard)
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const groupMap = new Map<string, MonthGroup>();
    for (const wk of weeks) {
      const { monthKey, monthTitle } = getMonthInfoForWeek(wk.weekIso);
      let group = groupMap.get(monthKey);
      if (!group) {
        group = {
          monthKey,
          monthTitle,
          totalWeeks: 0,
          totalHomeworkCount: 0,
          hasAudio: false,
          hasQuestion: false,
          weeks: []
        };
        groupMap.set(monthKey, group);
      }
      group.weeks.push(wk);
      group.totalWeeks += 1;
      group.totalHomeworkCount += (wk.homeworkCount || 0);
      if (wk.hasAudio) group.hasAudio = true;
      if (wk.hasQuestion) group.hasQuestion = true;
    }
    return Array.from(groupMap.values());
  }, [weeks]);

  // 🧭 Akkordeon-State: Aktueller / gewählter Monat standardmäßig geöffnet
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
    const activeWeek = selectedWeekIso || currentWeekIso;
    const initialKey = activeWeek ? getMonthInfoForWeek(activeWeek).monthKey : '';
    return initialKey ? { [initialKey]: true } : {};
  });

  // Auto-Expand: Öffnet den Monat automatisch, wenn eine darin liegende Woche ausgewählt wird
  useEffect(() => {
    if (selectedWeekIso) {
      const key = getMonthInfoForWeek(selectedWeekIso).monthKey;
      setExpandedMonths(prev => ({ ...prev, [key]: true }));
    }
  }, [selectedWeekIso]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflowY: isMobileView ? 'visible' : 'auto',
        padding: isMobileView
          ? '14px 12px calc(88px + env(safe-area-inset-bottom, 24px)) 12px'
          : '20px 22px 24px 22px',
        boxSizing: 'border-box'
      }}
      className="animation-fade-in no-scrollbar"
    >
      {/* 🧭 Top Navigation Hub: Zurück zu den Studio-Modulen & Schnellzugriff */}
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
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={onBackToModules}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBackToModules();
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '100px',
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Zurück zu den Studio-Modulen"
          aria-label="Zurück zu den Studio-Modulen"
        >
          <ArrowLeft size={13} strokeWidth={2.6} />
          <span>Studio-Module</span>
        </button>

        {selectedWeekIso && selectedWeekIso !== currentWeekIso && (
          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={() => onSelectWeek(currentWeekIso)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectWeek(currentWeekIso);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              background: '#0f172a',
              border: 'none',
              borderRadius: '100px',
              fontSize: '0.70rem',
              fontWeight: 800,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.15)'
            }}
            className="hover-scale-mini"
            title="Zur aktuellen Woche springen"
            aria-label="Zur aktuellen Woche springen"
          >
            <RotateCcw size={11} strokeWidth={2.6} />
            <span>Aktuelle Woche</span>
          </button>
        )}
      </div>

      {/* 🏛️ Modul-Header Card: Unterrichts-Archiv */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px -2px rgba(15, 23, 42, 0.25)',
            flexShrink: 0
          }}
        >
          <History size={22} strokeWidth={2.4} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Unterrichts-Archiv
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 750,
                color: '#475569',
                background: '#f1f5f9',
                padding: '2px 7px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0'
              }}
            >
              Chronik
            </span>
            <span
              style={{
                fontSize: '0.64rem',
                fontWeight: 750,
                color: '#334155',
                background: '#f1f5f9',
                padding: '2px 7px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0'
              }}
            >
              {weeks.length} {weeks.length === 1 ? 'Woche' : 'Wochen'}
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>
            Frühere Wochen, Notizen &amp; Hausaufgaben-Historie
          </div>
        </div>
      </div>

      {/* 📅 Ausklappbare Monats-Karten Chronik (Apple Inset Grouped Standard) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          minHeight: 0
        }}
        role="feed"
        aria-label="Liste archivierter Unterrichtswochen gruppiert nach Monaten"
      >
        {monthGroups.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            Keine vergangenen Hausaufgaben-Wochen gefunden.
          </div>
        ) : (
          monthGroups.map((group) => {
            const isOpen = !!expandedMonths[group.monthKey];

            return (
              <div
                key={group.monthKey}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* 🏛️ Monats-Header Card (exakt wie im Screenshot) */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-label={`${group.monthTitle}, ${group.totalWeeks} ${group.totalWeeks === 1 ? 'Woche' : 'Wochen'}, ${group.totalHomeworkCount} Aufgaben. ${isOpen ? 'Einklappen' : 'Ausklappen'}`}
                  onClick={() => toggleMonth(group.monthKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleMonth(group.monthKey);
                    }
                  }}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#475569',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-bg-slate-100"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} style={{ color: '#10b981' }} />
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{group.monthTitle}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                      ({group.totalWeeks} {group.totalWeeks === 1 ? 'Woche' : 'Wochen'})
                    </span>
                  </div>
                  <span
                    style={{
                      transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#64748b'
                    }}
                  >
                    <ChevronDown size={16} />
                  </span>
                </div>

                {/* 📋 Separate Wochen-Karten (exakt wie die Unterrichtstermin-Karten im Screenshot) */}
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.weeks.map((wk) => {
                      const isSelected = wk.weekIso === selectedWeekIso;
                      const isCurrent = wk.weekIso === currentWeekIso;

                      return (
                        <div
                          key={wk.weekIso}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Kalenderwoche ${wk.weekNum}, ${wk.dateRangeStr || ''}`}
                          onClick={() => onSelectWeek(wk.weekIso)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectWeek(wk.weekIso);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '16px',
                            background: isSelected ? '#f8fafc' : '#ffffff',
                            border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                            boxShadow: isSelected
                              ? '0 2px 8px rgba(15, 23, 42, 0.08)'
                              : '0 1px 3px rgba(0, 0, 0, 0.02)',
                            cursor: 'pointer',
                            gap: '12px',
                            boxSizing: 'border-box',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale-mini"
                        >
                          {/* Linke Seite: Quadratischer Datums-Badge (wie [MO 02] im Screenshot) & Text */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            {/* Quadratischer Badge [KW / Nr] */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isSelected ? '#0f172a' : '#f1f5f9',
                                borderRadius: '12px',
                                width: '46px',
                                height: '46px',
                                border: isSelected ? '1px solid #0f172a' : '1px solid rgba(0, 0, 0, 0.06)',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  color: isSelected ? '#94a3b8' : '#64748b',
                                  letterSpacing: '0.04em',
                                  lineHeight: 1
                                }}
                              >
                                KW
                              </span>
                              <span
                                style={{
                                  fontSize: '16px',
                                  fontWeight: 900,
                                  color: isSelected ? '#ffffff' : '#0f172a',
                                  marginTop: '2px',
                                  lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums'
                                }}
                              >
                                {wk.weekNum}
                              </span>
                            </div>

                            {/* Text-Spalte (Titel & Datum / Metadaten) */}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    letterSpacing: '-0.01em'
                                  }}
                                >
                                  Kalenderwoche {wk.weekNum}
                                </span>
                                {isCurrent && (
                                  <span
                                    style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 800,
                                      color: '#ffffff',
                                      background: '#0f172a',
                                      padding: '1.5px 6px',
                                      borderRadius: '100px',
                                      whiteSpace: 'nowrap',
                                      letterSpacing: '0.02em'
                                    }}
                                  >
                                    Aktuell
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#64748b',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  marginTop: '2px',
                                  fontVariantNumeric: 'tabular-nums'
                                }}
                              >
                                {wk.dateRangeStr} • {wk.homeworkCount > 0 ? `${wk.homeworkCount} ${wk.homeworkCount === 1 ? 'Aufgabe' : 'Aufgaben'}` : '0 Aufgaben'}
                              </span>
                            </div>
                          </div>

                          {/* Rechte Seite: Neutrale Apple Badges & Action-Chips */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {/* Schülerfrage */}
                            {wk.hasQuestion && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#334155',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Schülerfrage für den Unterricht hinterlegt"
                              >
                                <HelpCircle size={12} strokeWidth={2.4} style={{ color: '#475569' }} />
                                <span>Frage</span>
                              </span>
                            )}

                            {/* Audio-Memos */}
                            {wk.hasAudio && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#334155',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Unterrichts-Audioaufnahme vorhanden"
                              >
                                <Mic size={12} strokeWidth={2.4} style={{ color: '#475569' }} />
                                <span>Audio</span>
                              </span>
                            )}

                            {/* Feedback-Status */}
                            {wk.feedbackStatus && (
                              <span
                                style={{
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#334155',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`Status: ${wk.feedbackStatus}`}
                              >
                                {wk.feedbackStatus === 'beherrscht'
                                  ? '✓ Beherrscht'
                                  : wk.feedbackStatus === 'in_entwicklung'
                                  ? '~ In Entwicklung'
                                  : '↩ Wiederholen'}
                              </span>
                            )}

                            {/* Aufgaben-Pille */}
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 750,
                                color: wk.homeworkCount > 0 ? '#0f172a' : '#94a3b8',
                                background: wk.homeworkCount > 0 ? '#f1f5f9' : 'transparent',
                                border: wk.homeworkCount > 0 ? '1px solid #cbd5e1' : '1px dashed #e2e8f0',
                                padding: '5px 9px',
                                borderRadius: '10px',
                                whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            >
                              {wk.homeworkCount > 0
                                ? `${wk.homeworkCount} ${wk.homeworkCount === 1 ? 'Aufgabe' : 'Aufgaben'}`
                                : '0 Aufgaben'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ✏️ Lehrkraft-Bereich: Wochen-Bewertung (nur sichtbar bei !isReadOnly & aktiver Woche) */}
      {!isReadOnly && selectedWeekIso && setPendingFeedbackStatus && setPendingFeedbackTags && onSaveFeedback && (
        <div
          style={{
            padding: '14px 16px',
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            marginTop: '4px',
            flexShrink: 0
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={15} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>
                Wochen-Bewertung KW {selectedWeekNum}
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650, marginTop: '2px' }}>
              Bewerte die Hausaufgabe dieser archivierten Unterrichtswoche.
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Wie lief die Aufgabe?
            </span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {([
                { key: 'beherrscht', label: '✓ Beherrscht', bg: '#ecfdf5', color: '#059669', border: '#10b981' },
                { key: 'in_entwicklung', label: '~ In Entwicklung', bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
                { key: 'wiederholen', label: '↩ Wiederholen', bg: '#fee2e2', color: '#dc2626', border: '#fecaca' }
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPendingFeedbackStatus((prev: any) => prev === opt.key ? null : opt.key)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    background: pendingFeedbackStatus === opt.key ? opt.bg : '#ffffff',
                    border: `1.5px solid ${pendingFeedbackStatus === opt.key ? opt.border : '#e2e8f0'}`,
                    borderRadius: '100px',
                    cursor: 'pointer',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    color: pendingFeedbackStatus === opt.key ? opt.color : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Musikalische Kern-Dimensionen
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
              {SKILL_TAGS.map(tag => {
                const active = pendingFeedbackTags.includes(tag.key);
                const limitReached = !active && pendingFeedbackTags.length >= 2;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => setPendingFeedbackTags((prev: any) => {
                      if (prev.includes(tag.key)) return prev.filter((t: any) => t !== tag.key);
                      if (prev.length >= 2) return prev;
                      return [...prev, tag.key];
                    })}
                    style={{
                      padding: '4px 8px',
                      background: active ? '#f0fdf4' : '#f8fafc',
                      border: `1.5px solid ${active ? '#16a34a' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      cursor: limitReached ? 'not-allowed' : 'pointer',
                      fontSize: '0.66rem',
                      fontWeight: 750,
                      color: active ? '#15803d' : '#64748b',
                      opacity: limitReached ? 0.5 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onSaveFeedback}
            disabled={isSavingFeedback}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: isSavingFeedback ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
              opacity: isSavingFeedback ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <CheckCircle2 size={13} strokeWidth={2.4} />
            <span>{isSavingFeedback ? 'Speichern...' : 'Bewertung speichern'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
