import React, { useRef } from "react";
import { Target, ChevronDown } from "lucide-react";
import { getISOWeek } from "../studentDateUtils";
import { SKILL_TAGS } from "../meisterwerk.types";
import { cleanNotesText, isInternalMetadataNote } from "../../../domain/stickersAndTresor";

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
  handleMasterAllSkills,
  handleTriggerSkillQuest,
  handleSetSkillLevel,
  renderTextWithDidacticBadges
}) => {
  const radarAnalysisCardsRef = useRef<HTMLDivElement | null>(null);

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

    const N = SKILL_TAGS.length;
    const cx = 260, cy = 250, rMax = 135;
    const getPoint = (index: number, val: number) => {
      const angle = (Math.PI * 2 / N) * index - Math.PI / 2;
      return {
        x: cx + rMax * val * Math.cos(angle),
        y: cy + rMax * val * Math.sin(angle),
        angle
      };
    };

    const dataPoints = tagCounts.map((t, i) => getPoint(i, Math.max(t.pct, 0.20)));
    const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const gridPaths = gridLevels.map(lvl => {
      const pts = SKILL_TAGS.map((_, i) => getPoint(i, lvl));
      return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    });

    const isMobileOrTabletView = isMobileView;
    return (
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: isMobileOrTabletView ? 'column' : 'row', overflowY: isMobileOrTabletView ? 'auto' : 'hidden', background: useNotebookLayout ? '#fcfaf7' : '#ffffff' }} className="modal-content-container custom-scrollbar">
        {/* LINKE BUCHSEITE: 5-PENTAGON SKILL-RADAR */}
        <div style={{
          flex: isMobileOrTabletView ? 'none' : '1 1 0%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRight: isMobileOrTabletView ? 'none' : '1px solid #e8e8ed',
          borderBottom: isMobileOrTabletView ? '1.5px solid #e8e8ed' : 'none',
          padding: isMobileOrTabletView ? '16px 14px' : '24px 28px',
          position: 'relative',
          background: '#ffffff'
        }}>
          {/* Apple Glassmorphic Legend Pill */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '6px 16px',
            fontSize: '0.74rem',
            fontWeight: 750,
            background: 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(20px)',
            border: '1px solid #e2e8f0',
            borderRadius: '100px',
            boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
            zIndex: 5
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0f172a' }}>
              <span>🎯</span>
              <span>Aktiver Wochenfokus</span>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0f172a' }}>
              <span>🌟</span>
              <span>Meisterstufe (Stufe 5)</span>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ color: '#64748b', fontWeight: 650 }}>
              Stufen 1–5: Kompetenz-Profil
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

          {/* SVG Radar Center Container (Apple Health / Watch Aesthetic) */}
          <div style={{
            margin: 'auto 0',
            width: '100%',
            maxHeight: isMobileOrTabletView ? '340px' : '440px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <svg
              width="100%"
              height="100%"
              viewBox="-20 -20 560 520"
              style={{
                maxWidth: '520px',
                maxHeight: '490px',
                display: 'block',
                overflow: 'visible'
              }}
            >
              <defs>
                {/* Apple Aurora Liquid-Glass Gradient (Harmonizes with Indigo, Blue, Green, Purple, Gold) */}
                <linearGradient id="appleAuroraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                  <stop offset="45%" stopColor="#a855f7" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.14" />
                </linearGradient>

                {/* Soft Aurora Polygon Diffusion Shadow */}
                <filter id="applePolyShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#6366f1" floodOpacity="0.18" />
                </filter>
              </defs>

              {/* 1. Concentric Chronometer Grid Pentagons */}
              {gridPaths.map((d, i) => {
                const isOuter = i === 3;
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={isOuter ? "#cbd5e1" : "#e2e8f0"}
                    strokeWidth={isOuter ? "1.4" : "0.9"}
                  />
                );
              })}

              {/* 2. Axis Spokes (Fine Precision Lines) */}
              {SKILL_TAGS.map((_, i) => {
                const pt = getPoint(i, 1);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#e2e8f0"
                    strokeWidth="0.9"
                  />
                );
              })}

              {/* 3. Primary Apple Aurora Liquid-Glass Radar Polygon */}
              <path
                d={dataPath}
                fill="url(#appleAuroraGradient)"
                stroke="#6366f1"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#applePolyShadow)"
                style={{ transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />

              {/* 4. Apple Minimalist Nodes */}
              {tagCounts.map((tag, i) => {
                const p = getPoint(i, Math.max(tag.pct, 0.20));
                const isSuperkraft = tag.level >= 4;
                const isTargetFocus = activeWeeklyTargetTags.includes(tag.key);
                const tagThemeColor = tag.color || '#ff9f0a';
                return (
                  <g key={i}>
                    {isTargetFocus ? (
                      <g>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="15"
                          fill={`${tagThemeColor}22`}
                          stroke={tagThemeColor}
                          strokeWidth="1.6"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="6.5"
                          fill={tagThemeColor}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
                        />
                      </g>
                    ) : isSuperkraft ? (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5.5"
                        fill="#34c759"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                      />
                    ) : (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill={tag.dotColor || '#0a84ff'}
                        stroke="#ffffff"
                        strokeWidth="2"
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                      />
                    )}
                  </g>
                );
              })}

              {/* 5. Apple 2-Line Typographic Labels with Distinct Category Tag Colors */}
              {tagCounts.map((tag, i) => {
                const p = getPoint(i, 1.25);
                const isSuperkraft = tag.level >= 4;
                const isTargetFocus = activeWeeklyTargetTags.includes(tag.key);
                
                let textAnchor: "middle" | "start" | "end" = "middle";
                let offsetX = 0;
                let offsetY = 0;

                if (i === 0) {
                  // Top (Rhythmus)
                  textAnchor = "middle";
                  offsetY = -14;
                } else if (i === 1) {
                  // Top Right (Spieltechnik)
                  textAnchor = "start";
                  offsetX = 10;
                  offsetY = -4;
                } else if (i === 2) {
                  // Bottom Right (Klang)
                  textAnchor = "start";
                  offsetX = 10;
                  offsetY = 10;
                } else if (i === 3) {
                  // Bottom Left (Ausdruck)
                  textAnchor = "end";
                  offsetX = -10;
                  offsetY = 10;
                } else if (i === 4) {
                  // Top Left (Repertoire)
                  textAnchor = "end";
                  offsetX = -10;
                  offsetY = -4;
                }

                const posX = p.x + offsetX;
                const posY = p.y + offsetY;

                return (
                  <g key={i}>
                    {/* Zeile 1: Name mit didaktischer Kategoriefarbe */}
                    <text
                      x={posX}
                      y={posY}
                      textAnchor={textAnchor}
                      fontSize="12"
                      fontWeight="800"
                      fill={tag.color || '#1d1d1f'}
                      style={{ letterSpacing: '-0.01em', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}
                    >
                      {tag.icon} {tag.shortLabel}
                    </text>
                    {/* Zeile 2: Subtitle & Level */}
                    <text
                      x={posX}
                      y={posY + 14}
                      textAnchor={textAnchor}
                      fontSize="10.5"
                      fontWeight="650"
                      fill={isTargetFocus ? (tag.color || '#d97706') : (isSuperkraft ? '#15803d' : '#0284c7')}
                      style={{ letterSpacing: '0.01em', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' }}
                    >
                      Stufe {tag.level} · {isTargetFocus ? 'Fokus 🎯' : (isSuperkraft ? 'Meister 🌟' : 'Aufsteiger 🚀')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* VORWOCHEN-RÜCKBLICK & LEHRER-STUNDENEINSTIEG */}
          {(!readOnly || isTeacherTools) && (() => {
            const now = new Date();
            const prevWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const prevWeekISO = getISOWeek(prevWeekDate);
            const prevWeekNum = prevWeekISO.split('-W')[1] || '';

            const prevWeekItem = (progressItems || []).find((item: any) => {
              if (!item.homework_notes) return false;
              const isMatch = (item.updated_at && getISOWeek(item.updated_at) === prevWeekISO) ||
                              (item.created_at && getISOWeek(item.created_at) === prevWeekISO);
              if (!isMatch) return false;
              const clean = item.homework_notes.replace(/\["STICKER:[^\]]+"\]/g, '').trim();
              return clean.length > 0 && clean !== '[]';
            });

            let prevWeekText = '';
            if (prevWeekItem?.homework_notes) {
              try {
                const parsed = JSON.parse(prevWeekItem.homework_notes);
                if (Array.isArray(parsed)) {
                  prevWeekText = parsed.filter((n: string) => !n.startsWith('STICKER:')).join(' ');
                }
              } catch (e) {
                prevWeekText = String(prevWeekItem.homework_notes).replace(/STICKER:[^|]+\|[^|]+\|[^|]+/, '').trim();
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
                    <span>📅</span>
                    <span>Vorwochen-Check-In & Stundeneinstieg</span>
                  </div>
                  {prevWeekText && (
                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: 750,
                      color: '#0369a1',
                      background: '#f0f9ff',
                      border: '1px solid #e0f2fe',
                      padding: '2px 8px',
                      borderRadius: '100px'
                    }}>
                      KW {prevWeekNum}
                    </span>
                  )}
                </div>

                {prevWeekText ? (
                  <>
                    {/* Vorwochen-Hausaufgabe (Kompakte Apple-Infozeile) */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.74rem',
                      color: '#334155',
                      lineHeight: '1.4'
                    }}>
                      <strong style={{ color: '#0f172a' }}>{prevWeekItem?.topic_name || `Hausaufgabe KW ${prevWeekNum}`}:</strong> {prevWeekText}
                    </div>

                    {/* 1-Tap Quittierung & Fokus-Ziele */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleMasterAllSkills}
                        style={{
                          background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <span>🌟 Vorwoche super gemeistert (+100 XP)</span>
                      </button>

                      {/* 5 Säulen Quick Focus Selector */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {SKILL_TAGS.map(t => {
                          const isTarget = activeWeeklyTargetTags.includes(t.key);
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => handleTriggerSkillQuest(t.key)}
                              style={{
                                background: isTarget ? '#fefce8' : '#f8fafc',
                                border: `1px solid ${isTarget ? '#fde047' : '#e2e8f0'}`,
                                color: isTarget ? '#854d0e' : '#475569',
                                borderRadius: '100px',
                                padding: '4px 10px',
                                fontSize: '0.68rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale-mini"
                            >
                              <span>{t.icon}</span>
                              <span>{t.shortLabel}</span>
                              {isTarget && <span style={{ fontSize: '0.60rem' }}>🎯</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>🎵</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                        Bereit für den neuen Stundeneinstieg
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>
                        Wähle ein Stück oder Lehrwerk aus, um die heutige Einheit zu beginnen.
                      </span>
                    </div>
                  </div>
                )}
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
              padding: isMobileOrTabletView ? '14px 16px' : '18px 20px',
              boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 850, fontSize: isMobileOrTabletView ? '0.82rem' : '0.86rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎯</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Aktiver Wochenschwerpunkt</span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: activeWeeklyTargetTags.length > 0 ? '#b45309' : '#64748b',
                  background: activeWeeklyTargetTags.length > 0 ? '#fef3c7' : '#f1f5f9',
                  border: `1px solid ${activeWeeklyTargetTags.length > 0 ? '#fde68a' : '#e2e8f0'}`,
                  padding: '2px 9px',
                  borderRadius: '100px',
                  whiteSpace: 'nowrap'
                }}>
                  {activeWeeklyTargetTags.length > 0 ? 'Fokus aktiv' : 'Ausgeglichen'}
                </span>
              </div>

              {activeWeeklyTargetTags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeWeeklyTargetTags.map(tagKey => {
                    const tagObj = SKILL_TAGS.find(t => t.key === tagKey);
                    if (!tagObj) return null;
                    return (
                      <span key={tagKey} style={{
                        background: tagObj.bg || '#fefce8',
                        border: `1px solid ${tagObj.border || '#fef08a'}`,
                        color: tagObj.color || '#854d0e',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}>
                        {tagObj.icon} {tagObj.label} 🎯
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  Gleichmäßiges Training aller 5 Kern-Säulen in dieser Unterrichtswoche.
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
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={11} color="#64748b" strokeWidth={2.6} />
                      <span>Didaktischer Wochen-Leitfaden</span>
                    </span>
                    {rawImpulseLines.length > 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                        {rawImpulseLines.map((line, lIdx) => (
                          <div key={`impulse-line-${lIdx}`} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.45, fontWeight: 550 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.70rem', flexShrink: 0 }}>•</span>
                            <span>{renderTextWithDidacticBadges(line)}</span>
                          </div>
                        ))}
                      </div>
                    ) : rawImpulseLines.length === 1 ? (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.45, fontWeight: 550 }}>
                        „{renderTextWithDidacticBadges(rawImpulseLines[0])}“
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.45 }}>
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
              padding: isMobileOrTabletView ? '14px 16px' : '18px 20px',
              boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 850, fontSize: isMobileOrTabletView ? '0.82rem' : '0.86rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>📊</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Kompetenz-Übersicht (5 Säulen)</span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                  5 Stufen System
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        padding: '8px 12px',
                        borderRadius: '12px',
                        background: isTarget ? (s.lightBg || '#fffbeb') : '#f8fafc',
                        border: `1px solid ${isTarget ? (s.border || '#fde68a') : '#f1f5f9'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: isMobileOrTabletView ? '100px' : '130px' }}>
                        <span style={{ fontSize: '0.84rem' }}>{s.icon}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: s.color || '#0f172a' }}>
                          {s.shortLabel}
                        </span>
                        {isTarget && (
                          <span style={{ fontSize: '0.60rem', fontWeight: 850, color: s.color || '#b45309', background: s.bg || '#fef3c7', border: `1px solid ${s.border || '#fde68a'}`, padding: '1px 5px', borderRadius: '100px' }}>
                            Fokus
                          </span>
                        )}
                      </div>

                      {/* 5 Apple-Dots (Direkt klickbar für Lehrkräfte mit 22px Touch-Hitbox) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map(seg => {
                          const isFilled = s.level >= seg;
                          let dotColor = '#e2e8f0';
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
                                width: '22px',
                                height: '22px',
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
                                width: '11px',
                                height: '11px',
                                borderRadius: '50%',
                                background: dotColor,
                                transition: 'all 0.15s ease',
                                boxShadow: isFilled ? `0 1px 3px ${dotColor}66` : 'none',
                                display: 'inline-block'
                              }} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Level / Meister Badge */}
                      <div style={{ minWidth: '85px', textAlign: 'right' }}>
                        {isMeister ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#16a34a' }}>
                            🌟 Meister
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 750, color: s.color || '#64748b' }}>
                            Stufe {s.level}/5
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '0.70rem', color: '#64748b', lineHeight: 1.4, fontWeight: 500, marginTop: '2px' }}>
                Mit jedem geübten Song und jeder Vorwochen-Quittierung wachsen deine musikalischen Fähigkeiten kontinuierlich weiter.
              </div>
            </div>
          </div>

          {/* Custom tag pills */}
          {customTagCounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Weitere dokumentierte Trainings-Schwerpunkte
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {customTagCounts.sort((a, b) => b.count - a.count).map(tag => (
                  <span key={tag.key} style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800
                  }}>
                    ✏️ {tag.key} · {tag.count}×
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
};
