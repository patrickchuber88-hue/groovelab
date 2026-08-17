import React from 'react';
import { Sparkles, Award, Star, Rocket } from 'lucide-react';

interface MeisterOhrStickerProps {
  matchedAt?: string | Date;
  teacherPercent?: number;
  studentPercent?: number;
  xpAmount?: number;
  isCompact?: boolean;
}

export const MeisterOhrSticker: React.FC<MeisterOhrStickerProps> = ({
  matchedAt,
  teacherPercent,
  studentPercent,
  xpAmount,
  isCompact = false
}) => {
  const tPercent = teacherPercent ?? 0;
  const sPercent = studentPercent ?? 0;
  const diff = Math.abs(tPercent - sPercent);

  // Determine Tier
  const isTier1 = diff <= 10;
  const isTier2 = diff > 10 && diff <= 20;
  const isTier3 = diff > 20;

  const calculatedXp = xpAmount !== undefined ? xpAmount : (isTier1 ? 50 : isTier2 ? 25 : 5);

  const dateFormatted = matchedAt
    ? new Date(matchedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  // Tier-specific styles & texts
  let bgGradient = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)';
  let borderColor = '#f59e0b';
  let glowColor = 'rgba(245, 158, 11, 0.35)';
  let titleColor = '#78350f';
  let subtitleColor = '#92400e';
  let iconEmoji = '🎯';
  let titleText = 'MEISTER-OHR';
  let mottoText = 'BÄMM! Perfektes Gehör!';
  let xpBadgeBg = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';

  if (isTier2) {
    bgGradient = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)';
    borderColor = '#0284c7';
    glowColor = 'rgba(2, 132, 199, 0.3)';
    titleColor = '#0c4a6e';
    subtitleColor = '#0369a1';
    iconEmoji = '✨';
    titleText = 'SUPER GEHÖR';
    mottoText = 'Klasse! Fast perfekt getroffen!';
    xpBadgeBg = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
  } else if (isTier3) {
    bgGradient = 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)';
    borderColor = '#9333ea';
    glowColor = 'rgba(147, 51, 234, 0.25)';
    titleColor = '#581c87';
    subtitleColor = '#7e22ce';
    iconEmoji = '🚀';
    titleText = 'WEITER-ROCKER';
    mottoText = 'Super Versuch! Dranbleiben!';
    xpBadgeBg = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: isCompact ? 'row' : 'column',
        alignItems: 'center',
        gap: isCompact ? '12px' : '8px',
        padding: isCompact ? '8px 14px' : '14px 18px',
        background: bgGradient,
        borderRadius: '18px',
        border: `2px solid ${borderColor}`,
        boxShadow: `0 6px 20px -2px ${glowColor}, 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
        animation: isTier1 ? 'paniniGlow 3s ease-in-out infinite alternate' : 'none'
      }}
      className="panini-sticker-foil"
    >
      {/* Holographic Panini Foil Sheen (Only for Tier 1 & 2) */}
      {(isTier1 || isTier2) && (
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 40%, rgba(255, 255, 255, 0.45) 50%, transparent 60%)',
            transform: 'rotate(25deg)',
            pointerEvents: 'none',
            animation: 'paniniShine 4s infinite linear'
          }}
        />
      )}

      {/* Top Header Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '8px'
        }}
      >
        <div
          style={{
            fontSize: '0.62rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: subtitleColor,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Sparkles size={11} />
          <span>SONG MATCH</span>
        </div>

        <span
          style={{
            fontSize: '0.60rem',
            fontWeight: 800,
            color: subtitleColor,
            background: 'rgba(255, 255, 255, 0.75)',
            padding: '1px 6px',
            borderRadius: '99px',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {dateFormatted}
        </span>
      </div>

      {/* Center Emblem & Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          marginTop: isCompact ? '0' : '2px'
        }}
      >
        {/* Medal / Emblem Icon */}
        <div
          style={{
            width: isCompact ? '34px' : '42px',
            height: isCompact ? '34px' : '42px',
            borderRadius: '12px',
            background: isTier1
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : isTier2
              ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'
              : 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 3px 8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.4)`,
            color: '#ffffff',
            flexShrink: 0,
            fontSize: isCompact ? '1.15rem' : '1.35rem'
          }}
        >
          {iconEmoji}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: isCompact ? '0.88rem' : '0.96rem',
              fontWeight: 950,
              color: titleColor,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{titleText}</span>
            {isTier1 && <Award size={14} style={{ color: '#d97706' }} />}
            {isTier2 && <Star size={14} style={{ color: '#0284c7' }} fill="#0284c7" />}
            {isTier3 && <Rocket size={14} style={{ color: '#9333ea' }} />}
          </div>

          <div
            style={{
              fontSize: '0.70rem',
              fontWeight: 700,
              color: subtitleColor,
              lineHeight: 1.2
            }}
          >
            {teacherPercent !== undefined && studentPercent !== undefined ? (
              <span>
                Lehrer: {teacherPercent}% ⚡ Du: {studentPercent}% • <em>{mottoText}</em>
              </span>
            ) : (
              <span>{mottoText}</span>
            )}
          </div>
        </div>

        {/* High-Contrast XP Badge */}
        <div
          style={{
            background: xpBadgeBg,
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '99px',
            fontSize: '0.76rem',
            fontWeight: 900,
            letterSpacing: '-0.01em',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <Sparkles size={11} />
          <span>+{calculatedXp} CAMPUS-XP</span>
        </div>
      </div>
    </div>
  );
};
