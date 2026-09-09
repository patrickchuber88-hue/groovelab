import React from 'react';
import { Compass } from 'lucide-react';
import { SKILL_TAGS } from '../student/meisterwerk.types';

export interface SkillRadarPentagonProps {
  levels: Record<string, number>;
  activeFocusTags?: Array<{ key: string; label?: string; icon?: string } | string>;
  size?: 'normal' | 'compact';
  uiLevel?: 'junior' | 'teen' | 'pro';
  studentName?: string;
  instrumentName?: string;
  showVignette?: boolean;
  onSkillClick?: (skillKey: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SkillRadarPentagon: React.FC<SkillRadarPentagonProps> = ({
  levels,
  activeFocusTags = [],
  size = 'normal',
  uiLevel = 'teen',
  studentName,
  instrumentName,
  showVignette = true,
  onSkillClick,
  className,
  style
}) => {
  const N = SKILL_TAGS.length;
  const cx = 260, cy = 245, rMax = 165;
  const isJunior = uiLevel === 'junior';
  const isPro = uiLevel === 'pro';

  const getPoint = (index: number, val: number) => {
    const angle = (Math.PI * 2 / N) * index - Math.PI / 2;
    return {
      x: cx + rMax * val * Math.cos(angle),
      y: cy + rMax * val * Math.sin(angle),
      angle
    };
  };

  // Robuste Fokus-Prüfung für String- oder Objekt-Arrays
  const isTagInFocus = (key: string, legacyKey?: string) => {
    return activeFocusTags.some((f: any) => {
      const k = typeof f === 'string' ? f : f?.key;
      return k === key || (legacyKey && k === legacyKey);
    });
  };

  const tagCounts = SKILL_TAGS.map(tag => {
    let level = levels[tag.key] ?? (tag.legacyKey ? levels[tag.legacyKey] : undefined);
    if (typeof level !== 'number' || level < 1 || level > 5) {
      level = 1;
    }
    // Pädagogischer Goldstandard: Stufe 1 startet bei 0.30 (30 % Radius) als stabiles, stolzes Fundament
    const pct = 0.30 + ((level - 1) / 4) * 0.70;
    return {
      ...tag,
      level,
      pct
    };
  });

  const dataPoints = tagCounts.map((t, i) => getPoint(i, t.pct));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
  
  // 5 didaktische Entwicklungsstufen (1: Fundament (0.30), 2: Aufbau (0.475), 3: Entdecker (0.65), 4: Virtuos (0.825), 5: Meister (1.00))
  const gridLevels = [0.30, 0.475, 0.65, 0.825, 1.0];
  const gridPaths = gridLevels.map(lvl => {
    const pts = SKILL_TAGS.map((_, i) => getPoint(i, lvl));
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
  });

  const isCompact = size === 'compact';
  const maxWidth = isCompact ? '380px' : '520px';

  const getLevelLabel = (level: number, isTargetFocus: boolean) => {
    if (isJunior) {
      if (isTargetFocus) return '★ Wochen-Quest 🎯';
      if (level === 5) return '👑 Meister-Zauberer';
      if (level === 4) return '🌟 Stern-Champion';
      if (level === 3) return '✨ Musik-Könner';
      if (level === 2) return '🚀 Entdecker-Aufbau';
      return '🌱 Entdecker-Basis';
    }
    if (isPro) {
      if (isTargetFocus) return 'Fokus';
      if (level === 5) return 'Exzellenz';
      if (level === 4) return 'Stilsicher';
      if (level === 3) return 'Fortgeschritten';
      if (level === 2) return 'Fundiert';
      return 'Basis';
    }
    // Teen
    if (isTargetFocus) return 'Fokus';
    if (level === 5) return 'Band-Meister';
    if (level === 4) return 'Stage-Ready';
    if (level === 3) return 'Solist';
    if (level === 2) return 'Aufbau';
    return 'Fundament';
  };

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {/* 🌟 Personalisierungs-Vignette (Schüler-Vorname & Instrument) */}
      {showVignette && (studentName || instrumentName) && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          padding: '4px 14px',
          borderRadius: '100px',
          background: isJunior ? 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)' : '#f8fafc',
          border: `1px solid ${isJunior ? '#fde047' : '#e2e8f0'}`,
          fontSize: isCompact ? '0.76rem' : '0.82rem',
          fontWeight: 850,
          color: isJunior ? '#92400e' : '#0f172a',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
        }}>
          {studentName && <span>{studentName}</span>}
          {studentName && instrumentName && <span style={{ color: isJunior ? '#facc15' : '#cbd5e1' }}>•</span>}
          {instrumentName && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: isJunior ? '#b45309' : '#0369a1'
            }}>
              <span>🎵</span>
              <span>{instrumentName}</span>
            </span>
          )}
        </div>
      )}

      <svg
        viewBox="0 0 520 490"
        role="img"
        aria-label={isJunior ? "Mein Musik-Stern (5 Säulen der Musik)" : "5-Säulen Kompetenz-Radar Visualisierung"}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* Junior Magical Star Gradient vs Teen Aurora vs Pro Studio */}
          <linearGradient id="pentagonAuroraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {isJunior ? (
              <>
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.48" />
                <stop offset="35%" stopColor="#ec4899" stopOpacity="0.32" />
                <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.20" />
              </>
            ) : isPro ? (
              <>
                <stop offset="0%" stopColor="#475569" stopOpacity="0.30" />
                <stop offset="50%" stopColor="#334155" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.10" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.14" />
              </>
            )}
          </linearGradient>

          {/* Soft Polygon Diffusion Shadow */}
          <filter id="pentagonPolyShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation={isJunior ? "12" : "10"} floodColor={isJunior ? "#f59e0b" : "#6366f1"} floodOpacity={isJunior ? "0.26" : "0.18"} />
          </filter>
        </defs>

        {/* 0. Basis-Fundament Aura (Sanfte visuelle Erdung der 1. Entwicklungsstufe) */}
        <path
          d={gridPaths[0]}
          fill={isJunior ? "rgba(245, 158, 11, 0.08)" : isPro ? "rgba(15, 23, 42, 0.04)" : "rgba(99, 102, 241, 0.06)"}
          stroke="none"
        />

        {/* 1. Concentric Chronometer Grid Pentagons (Exakt 5 Stufen) */}
        {gridPaths.map((d, i) => {
          const isOuter = i === gridLevels.length - 1;
          const isBase = i === 0;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={isOuter ? (isJunior ? "#fde68a" : "#cbd5e1") : isBase ? (isJunior ? "#fef3c7" : "#e2e8f0") : (isJunior ? "#fef3c7" : "#f1f5f9")}
              strokeWidth={isOuter ? (isJunior ? "2.0" : "1.6") : isBase ? "1.2" : "0.9"}
              strokeDasharray={isJunior && !isOuter ? "4 3" : undefined}
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
              stroke={isJunior ? "#fde68a" : "#e2e8f0"}
              strokeWidth={isJunior ? "1.4" : "1.1"}
            />
          );
        })}

        {/* 3. Primary Liquid-Glass Radar Polygon */}
        <path
          d={dataPath}
          fill="url(#pentagonAuroraGradient)"
          stroke={isJunior ? "#f59e0b" : isPro ? "#334155" : "#6366f1"}
          strokeWidth={isJunior ? "3.2" : "2.8"}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#pentagonPolyShadow)"
          style={{ transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />

        {/* 4. Minimalist / Magical Interactive Nodes */}
        {tagCounts.map((tag, i) => {
          const p = getPoint(i, tag.pct);
          const isSuperkraft = tag.level >= 4;
          const isTargetFocus = isTagInFocus(tag.key, tag.legacyKey);
          const tagThemeColor = tag.color || '#ff9f0a';
          return (
            <g
              key={i}
              onClick={() => onSkillClick && onSkillClick(tag.key)}
              onKeyDown={(e) => {
                if (onSkillClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSkillClick(tag.key);
                }
              }}
              tabIndex={onSkillClick ? 0 : undefined}
              role={onSkillClick ? "button" : undefined}
              aria-label={`${tag.label}, Stufe ${tag.level} von 5`}
              style={{ cursor: onSkillClick ? 'pointer' : 'default', outline: 'none' }}
              className={onSkillClick ? "hover-scale" : undefined}
            >
              {isTargetFocus ? (
                <g>
                  {/* Glowing Focus Orbit */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isCompact ? "15" : "20"}
                    fill={`${tagThemeColor}26`}
                    stroke={tagThemeColor}
                    strokeWidth="2.2"
                  >
                    <animate attributeName="r" values={isCompact ? "13;17;13" : "18;23;18"} dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isCompact ? "7.0" : "8.5"}
                    fill={tagThemeColor}
                    stroke="#ffffff"
                    strokeWidth="3.0"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
                  />
                  {isJunior && (
                    <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="11">
                      ⭐
                    </text>
                  )}
                </g>
              ) : isSuperkraft ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isCompact ? "6.0" : "7.5"}
                  fill="#34c759"
                  stroke="#ffffff"
                  strokeWidth="2.8"
                  style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.14))' }}
                />
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isCompact ? "5.0" : "6.0"}
                  fill={tag.dotColor || '#0a84ff'}
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                />
              )}
            </g>
          );
        })}

        {/* 5. Typographic Labels with Distinct Category Tag Colors */}
        {tagCounts.map((tag, i) => {
          const p = getPoint(i, 1.15);
          const isSuperkraft = tag.level >= 4;
          const isTargetFocus = isTagInFocus(tag.key, tag.legacyKey);
          
          let textAnchor: "middle" | "start" | "end" = "middle";
          let offsetX = 0;
          let offsetY = 0;

          if (i === 0) {
            // Top (Rhythmus)
            textAnchor = "middle";
            offsetY = -12;
          } else if (i === 1) {
            // Top Right (Technik)
            textAnchor = "start";
            offsetX = 12;
            offsetY = -4;
          } else if (i === 2) {
            // Bottom Right (Klang)
            textAnchor = "start";
            offsetX = 12;
            offsetY = 12;
          } else if (i === 3) {
            // Bottom Left (Ausdruck)
            textAnchor = "end";
            offsetX = -12;
            offsetY = 12;
          } else if (i === 4) {
            // Top Left (Repertoire)
            textAnchor = "end";
            offsetX = -12;
            offsetY = -4;
          }

          const posX = p.x + offsetX;
          const posY = p.y + offsetY;
          const subtitleText = getLevelLabel(tag.level, isTargetFocus);

          return (
            <g
              key={i}
              onClick={() => onSkillClick && onSkillClick(tag.key)}
              onKeyDown={(e) => {
                if (onSkillClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSkillClick(tag.key);
                }
              }}
              tabIndex={onSkillClick ? 0 : undefined}
              role={onSkillClick ? "button" : undefined}
              aria-label={`${tag.label}: ${subtitleText}`}
              style={{ cursor: onSkillClick ? 'pointer' : 'default', outline: 'none' }}
              className={onSkillClick ? "hover-scale" : undefined}
            >
              {/* Zeile 1: Name mit didaktischer Kategoriefarbe */}
              <text
                x={posX}
                y={posY}
                textAnchor={textAnchor}
                fontSize={isCompact ? "14" : (isJunior ? "16" : "15")}
                fontWeight="900"
                fill={tag.color || '#1d1d1f'}
                style={{
                  letterSpacing: '-0.01em',
                  fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif'
                }}
              >
                {isJunior ? `${tag.icon} ` : ''}{tag.shortLabel}
              </text>
              {/* Zeile 2: Subtitle & Level */}
              <text
                x={posX}
                y={posY + (isJunior ? 18 : 16)}
                textAnchor={textAnchor}
                fontSize={isCompact ? "11" : (isJunior ? "12.5" : "12")}
                fontWeight="800"
                fill={isTargetFocus ? (tag.color || '#d97706') : (isSuperkraft ? '#15803d' : (isJunior ? '#6366f1' : '#0284c7'))}
                style={{
                  letterSpacing: '0.01em',
                  fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif'
                }}
              >
                {subtitleText}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 💡 Taktiler Mini-CTA / Didaktischer Impuls-Hinweis (BFSG 2025 / WCAG 2.2 AA) */}
      {onSkillClick && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            const firstTag = (activeFocusTags[0] && (typeof activeFocusTags[0] === 'string' ? activeFocusTags[0] : (activeFocusTags[0] as any).key)) || 'rhythmus';
            onSkillClick(firstTag);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const firstTag = (activeFocusTags[0] && (typeof activeFocusTags[0] === 'string' ? activeFocusTags[0] : (activeFocusTags[0] as any).key)) || 'rhythmus';
              onSkillClick(firstTag);
            }
          }}
          style={{
            marginTop: isCompact ? '4px' : '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '100px',
            background: isJunior ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#f8fafc',
            border: `1px solid ${isJunior ? '#fde047' : '#e2e8f0'}`,
            fontSize: isCompact ? '0.72rem' : '0.78rem',
            fontWeight: 750,
            color: isJunior ? '#92400e' : (isPro ? '#334155' : '#0369a1'),
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            outline: 'none'
          }}
          className="hover-scale"
          title="Didaktische Details & Übetipps öffnen"
          aria-label={
            isJunior
              ? 'Tippe auf eine Spitze für deinen Übe-Zaubertipp und Wochen-Impuls'
              : isPro
              ? 'Tippe auf eine Säule für didaktische Kriterien und Übe-Strategien'
              : 'Tippe auf eine Säule für deinen persönlichen Übe-Tipp und Detail-Fokus'
          }
        >
          <Compass size={14} />
          <span>
            {isJunior
              ? 'Tippe auf eine Spitze für deinen Übe-Zaubertipp & Wochen-Impuls!'
              : isPro
              ? 'Tippe auf eine Säule für didaktische Kriterien & Übe-Strategien'
              : 'Tippe auf eine Säule für deinen persönlichen Übe-Tipp & Detail-Fokus'}
          </span>
        </div>
      )}
    </div>
  );
};
