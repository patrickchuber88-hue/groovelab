import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles, X, Lock, Clock, Flame, Music, Award, Star, ChevronRight, Compass } from "lucide-react";

export type JuniorStickerCategory = 'all' | 'schuljahr' | 'ueben' | 'xp' | 'streaks' | 'songs' | 'spezial';

export interface StudentJuniorStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStickers: any[];
  unifiedStickersMap: Record<string, any>;
  juniorStickerCategory: JuniorStickerCategory;
  setJuniorStickerCategory: (category: JuniorStickerCategory) => void;
  onSelectSticker: (sticker: any) => void;
  onStartInstrument: () => void;
}

export const StudentJuniorStickerModal: React.FC<StudentJuniorStickerModalProps> = ({
  isOpen,
  onClose,
  allStickers,
  unifiedStickersMap,
  juniorStickerCategory,
  setJuniorStickerCategory,
  onSelectSticker,
  onStartInstrument,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // 1. Trennung: Aktive Übe-Sticker (20 Gamification-Erfolge) vs. 15-jährige Schuljahres-Chronik
  const activeGamificationStickers = useMemo(() => {
    return allStickers.filter(st => st.category !== 'schuljahr');
  }, [allStickers]);

  const schoolYearStickers = useMemo(() => {
    return allStickers.filter(st => st.category === 'schuljahr');
  }, [allStickers]);

  // Freigeschaltete Zähler
  const unlockedActiveCount = useMemo(() => {
    return activeGamificationStickers.filter(st => unifiedStickersMap[st.id]?.isUnlocked).length;
  }, [activeGamificationStickers, unifiedStickersMap]);

  const unlockedSchoolYears = useMemo(() => {
    return schoolYearStickers.filter(st => unifiedStickersMap[st.id]?.isUnlocked);
  }, [schoolYearStickers, unifiedStickersMap]);

  // Aktuelles Schuljahr-Wappen (Höchstes freigeschaltetes Schuljahr oder Jahr 1)
  const currentSchoolYearSticker = useMemo(() => {
    if (unlockedSchoolYears.length > 0) {
      return unlockedSchoolYears[unlockedSchoolYears.length - 1];
    }
    return schoolYearStickers[0];
  }, [unlockedSchoolYears, schoolYearStickers]);

  const currentSchoolYearStatus = currentSchoolYearSticker 
    ? (unifiedStickersMap[currentSchoolYearSticker.id] || { isUnlocked: false, progressText: '' })
    : { isUnlocked: false, progressText: '' };

  // Nächster erreichbarer Meilenstein (unter den 20 Übe-Stickern)
  const nextMilestone = useMemo(() => {
    const lockedCandidates = activeGamificationStickers.filter(st => 
      !unifiedStickersMap[st.id]?.isUnlocked && st.category !== 'spezial'
    );
    if (lockedCandidates.length === 0) return null;

    let best = lockedCandidates[0];
    let bestPct = -1;
    for (const cand of lockedCandidates) {
      const status = unifiedStickersMap[cand.id];
      const pct = status?.progressPercent ?? 0;
      if (pct > bestPct) {
        bestPct = pct;
        best = cand;
      }
    }
    const status = unifiedStickersMap[best.id] || { isUnlocked: false, progressText: '', progressPercent: 0 };
    return {
      sticker: best,
      status,
      percent: Math.min(100, Math.max(5, status.progressPercent || 0))
    };
  }, [activeGamificationStickers, unifiedStickersMap]);

  // Tab-Leiste: Schnelle, motivierende Kategorien zuerst – Schuljahre als Chronik am Ende
  const categoriesList = [
    { id: 'all', label: `Alle (${activeGamificationStickers.length})` },
    { id: 'ueben', label: '⏱️ Übe-Fleiß' },
    { id: 'xp', label: '⭐ Zauber-XP' },
    { id: 'streaks', label: '🔥 Streaks' },
    { id: 'songs', label: '🎵 Repertoire' },
    { id: 'spezial', label: '🏆 Spezial' },
    { id: 'schuljahr', label: `🎒 Schuljahre (${unlockedSchoolYears.length}/${schoolYearStickers.length})` }
  ];

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Dein Sticker-Sammelalbum"
      style={{
        position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(16px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '0' : '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: isMobile ? '0' : '36px',
        maxWidth: isMobile ? '100vw' : '920px',
        width: '100%',
        height: isMobile ? '100dvh' : '92vh',
        maxHeight: isMobile ? '100dvh' : '92vh',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? 'max(16px, env(safe-area-inset-top, 16px)) 14px 14px 14px' : '28px 28px 20px 28px',
        boxShadow: isMobile ? 'none' : '0 35px 80px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }} className={isMobile ? "mobile-modal-shell" : ""}>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? '14px' : '20px',
            right: isMobile ? '14px' : '20px',
            background: '#f1f5f9',
            border: 'none',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            zIndex: 10,
            touchAction: 'manipulation',
            userSelect: 'none'
          }}
          className="hover-scale"
          title="Album schließen"
          aria-label="Album schließen"
        >
          <X size={22} />
        </button>

        {/* FIXED HEADER */}
        <div style={{ flexShrink: 0, marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#d97706',
              width: '50px',
              height: '50px',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.7rem',
              boxShadow: '0 6px 18px rgba(217, 119, 6, 0.2)',
              flexShrink: 0
            }}>
              🏆
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Deine Auszeichnungen
                </span>
                <span style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  padding: '2px 10px',
                  borderRadius: '100px'
                }}>
                  {unlockedActiveCount} von {activeGamificationStickers.length} gesammelt ✨
                </span>
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: isMobile ? '1.35rem' : '1.5rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Dein Sticker-Sammelalbum ★
              </h2>
            </div>
          </div>

          {/* CATEGORY FILTER TABS */}
          <div 
            role="tablist"
            aria-label="Sticker Kategorien"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              padding: '4px 2px',
              margin: '2px 0 6px 0',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {categoriesList.map(tab => {
              const isActive = juniorStickerCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={0}
                  onClick={() => setJuniorStickerCategory(tab.id as any)}
                  style={{
                    background: isActive ? '#0f172a' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                    borderRadius: '100px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    touchAction: 'manipulation',
                    userSelect: 'none'
                  }}
                  className="hover-scale"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SCROLLABLE STICKER CONTENT */}
        <div
          style={{
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            flex: isMobile ? '1 1 0%' : 1,
            minHeight: 0,
            maxHeight: '100%',
            padding: isMobile ? '4px 2px calc(80px + env(safe-area-inset-bottom, 24px)) 2px' : '4px 2px 14px 2px'
          }}
          className={isMobile ? "mobile-scroll-container" : ""}
        >
          {/* ========================================================================= */}
          {/* 🌟 DUO-HIGHLIGHT HERO IN "ALLE": Aktueller Rang + Nächster Meilenstein    */}
          {/* ========================================================================= */}
          {juniorStickerCategory === 'all' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: isMobile ? '18px' : '22px'
            }}>
              {/* LINKER HERO: Aktueller Campus-Rang (Schuljahr-Wappen) */}
              {currentSchoolYearSticker && (
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSticker({ 
                    ...currentSchoolYearSticker, 
                    isUnlocked: currentSchoolYearStatus.isUnlocked, 
                    progressText: currentSchoolYearStatus.progressText 
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSticker({ 
                        ...currentSchoolYearSticker, 
                        isUnlocked: currentSchoolYearStatus.isUnlocked, 
                        progressText: currentSchoolYearStatus.progressText 
                      });
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1.5px solid #86efac',
                    borderRadius: '24px',
                    padding: isMobile ? '12px 14px' : '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.14)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  className="hover-scale"
                  aria-label={`Aktueller Campus-Rang: ${currentSchoolYearSticker.title}`}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: isMobile ? '60px' : '68px',
                    height: isMobile ? '60px' : '68px',
                    borderRadius: '18px',
                    background: '#0a0e1a',
                    border: '2px solid #34a853',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    padding: '3px'
                  }}>
                    <img
                      src={`/stickers/thumbs/${currentSchoolYearSticker.id}.png`}
                      alt={currentSchoolYearSticker.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '14px'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = `/stickers/${currentSchoolYearSticker.id}.png?v=1`;
                      }}
                    />
                  </div>

                  {/* Text & Action */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        background: '#15803d',
                        color: '#ffffff',
                        fontSize: '0.62rem',
                        fontWeight: 950,
                        padding: '2px 8px',
                        borderRadius: '100px',
                        letterSpacing: '0.04em'
                      }}>
                        CAMPUS-RANG 🎒
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#15803d' }}>
                        ★ Im Album
                      </span>
                    </div>

                    <h3 style={{
                      margin: '2px 0 2px 0',
                      fontSize: isMobile ? '0.90rem' : '1.02rem',
                      fontWeight: 950,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {currentSchoolYearSticker.title}
                    </h3>

                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.72rem',
                      color: '#475569',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {currentSchoolYearSticker.equiv || 'Dein aktueller Ausbildungs-Meilenstein'}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setJuniorStickerCategory('schuljahr');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: '100px',
                        padding: '4px 10px',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      <span>Chronik aller 15 Jahre</span>
                      <ChevronRight size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}

              {/* RECHTER HERO: Nächste Mission / Nächster Meilenstein */}
              {nextMilestone ? (
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSticker({ 
                    ...nextMilestone.sticker, 
                    isUnlocked: false, 
                    progressText: nextMilestone.status.progressText 
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSticker({ 
                        ...nextMilestone.sticker, 
                        isUnlocked: false, 
                        progressText: nextMilestone.status.progressText 
                      });
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1.5px solid #fde68a',
                    borderRadius: '24px',
                    padding: isMobile ? '12px 14px' : '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 8px 20px rgba(217, 119, 6, 0.12)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  className="hover-scale"
                  aria-label={`Nächste Mission: ${nextMilestone.sticker.title}`}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: isMobile ? '60px' : '68px',
                    height: isMobile ? '60px' : '68px',
                    borderRadius: '18px',
                    background: '#ffffff',
                    border: '2px dashed #f59e0b',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    padding: '3px',
                    position: 'relative'
                  }}>
                    <img
                      src={`/stickers/thumbs/${nextMilestone.sticker.id}.png`}
                      alt={nextMilestone.sticker.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '14px',
                        filter: 'saturate(0.85) opacity(0.72) drop-shadow(0 2px 6px rgba(0,0,0,0.06))'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = `/stickers/${nextMilestone.sticker.id}.png?v=1`;
                      }}
                    />
                    {/* Corner Lock Medallion */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)',
                      border: '1.5px solid #ffffff'
                    }}>
                      <Lock size={10} color="#ffffff" strokeWidth={2.8} />
                    </div>
                  </div>

                  {/* Text & Progress Bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        background: '#d97706',
                        color: '#ffffff',
                        fontSize: '0.62rem',
                        fontWeight: 950,
                        padding: '2px 8px',
                        borderRadius: '100px',
                        letterSpacing: '0.04em'
                      }}>
                        NÄCHSTE MISSION 🎯
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309' }}>
                        Greifbar nah
                      </span>
                    </div>

                    <h3 style={{
                      margin: '2px 0 2px 0',
                      fontSize: isMobile ? '0.90rem' : '1.02rem',
                      fontWeight: 950,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {nextMilestone.sticker.title}
                    </h3>

                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.72rem',
                      color: '#92400e',
                      fontWeight: 850,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {nextMilestone.status.progressText || 'Jetzt weiterspielen und freischalten!'}
                    </p>

                    {/* Apple Style Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '7px',
                      borderRadius: '100px',
                      background: 'rgba(217, 119, 6, 0.15)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${nextMilestone.percent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '100px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1.5px solid #fde68a',
                  borderRadius: '24px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Sparkles size={28} color="#d97706" />
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '0.96rem', fontWeight: 950, color: '#92400e' }}>
                      Alle Sammel-Sticker gemeistert! 🌟
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#b45309', fontWeight: 800 }}>
                      Herausragende Leistung! Dein musikalischer Fleiß ist legendär.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 🎒 DEDIZIERTER TAB "SCHULJAHRE": Apple HIG 15-Jahre Meilenstein-Pfad      */}
          {/* ========================================================================= */}
          {juniorStickerCategory === 'schuljahr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {/* Intro Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1.5px solid #bae6fd',
                borderRadius: '24px',
                padding: isMobile ? '14px 16px' : '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}>
                    <Compass size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: isMobile ? '0.94rem' : '1.05rem', fontWeight: 950, color: '#0369a1' }}>
                      Die 15-jährige Ausbildungs-Reise
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#0c4a6e', fontWeight: 700 }}>
                      Zu jedem neuen Campus-Schuljahr erhältst du ein exklusives Wappen für deine musikalische Chronik.
                    </p>
                  </div>
                </div>

                <span style={{
                  background: '#ffffff',
                  border: '1px solid #7dd3fc',
                  color: '#0284c7',
                  fontSize: '0.72rem',
                  fontWeight: 950,
                  padding: '4px 12px',
                  borderRadius: '100px'
                }}>
                  {unlockedSchoolYears.length} von 15 Meilensteinen erreicht 🎒
                </span>
              </div>

              {/* Grid aller 15 Schuljahre im kompakten Meilenstein-Format */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: isMobile ? '10px' : '12px',
                width: '100%'
              }}>
                {schoolYearStickers.map((st, idx) => {
                  const yearNumber = idx + 1;
                  const status = unifiedStickersMap[st.id] || { isUnlocked: false, progressText: '' };
                  const isUnlocked = status.isUnlocked;
                  const isCurrent = currentSchoolYearSticker?.id === st.id;

                  const isLegendary = st.rarity === 'legendary';
                  const isEpic = st.rarity === 'epic';
                  const isRare = st.rarity === 'rare';

                  const rarityGlow = isLegendary 
                    ? 'rgba(250, 204, 21, 0.4)' 
                    : isEpic 
                    ? 'rgba(192, 132, 252, 0.35)' 
                    : isRare 
                    ? 'rgba(96, 165, 250, 0.3)' 
                    : 'rgba(52, 168, 83, 0.3)';

                  return (
                    <div
                      key={st.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectSticker({ ...st, isUnlocked, progressText: status.progressText })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectSticker({ ...st, isUnlocked, progressText: status.progressText });
                        }
                      }}
                      style={{
                        background: isUnlocked ? '#ffffff' : '#f8fafc',
                        border: isCurrent
                          ? '2.5px solid #10b981'
                          : isUnlocked 
                          ? (isLegendary ? '2px solid #facc15' : isEpic ? '2px solid #c084fc' : isRare ? '2px solid #93c5fd' : '2px solid #86efac') 
                          : '1.5px dashed #cbd5e1',
                        borderRadius: '20px',
                        padding: isMobile ? '10px 8px' : '12px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '6px',
                        position: 'relative',
                        boxShadow: isCurrent 
                          ? '0 10px 24px rgba(16, 185, 129, 0.28)' 
                          : isUnlocked 
                          ? `0 6px 18px ${rarityGlow}` 
                          : '0 2px 6px rgba(0, 0, 0, 0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                      className="hover-scale"
                      aria-label={`${st.title} (${isUnlocked ? 'Gemeistert' : 'Gesperrt'})`}
                    >
                      {/* Top Badges Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {isCurrent ? (
                          <span style={{
                            fontSize: '0.58rem',
                            fontWeight: 950,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            background: '#10b981',
                            color: '#ffffff',
                            letterSpacing: '0.04em'
                          }}>
                            DU BIST HIER 📍
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.58rem',
                            fontWeight: 950,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '100px',
                            background: isLegendary ? '#fef3c7' : isEpic ? '#f3e8ff' : isRare ? '#eff6ff' : '#f1f5f9',
                            color: isLegendary ? '#b45309' : isEpic ? '#7e22ce' : isRare ? '#1d4ed8' : '#475569'
                          }}>
                            {st.rarityLabel}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.58rem',
                          fontWeight: 900,
                          color: '#64748b'
                        }}>
                          Jahr {yearNumber}
                        </span>
                      </div>

                      {/* Thumbnail Badge (Kompakt 66px Desktop / 58px Mobile) */}
                      <div style={{
                        width: isMobile ? '58px' : '66px',
                        height: isMobile ? '58px' : '66px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        background: isUnlocked 
                          ? '#0a0e1a' 
                          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: isUnlocked 
                          ? (isLegendary ? '2px solid #facc15' : isEpic ? '2px solid #c084fc' : isRare ? '2px solid #93c5fd' : '2px solid #4ade80')
                          : '1.5px dashed #cbd5e1',
                        boxShadow: isUnlocked
                          ? `0 4px 12px ${rarityGlow}`
                          : '0 2px 6px rgba(15, 23, 42, 0.05)',
                        overflow: 'hidden',
                        padding: '3px'
                      }}>
                        <img
                          src={`/stickers/thumbs/${st.id}.png`}
                          alt={st.title}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '12px',
                            filter: isUnlocked 
                              ? 'drop-shadow(0 4px 8px rgba(255,255,255,0.18))' 
                              : 'saturate(0.85) opacity(0.70) drop-shadow(0 2px 6px rgba(15,23,42,0.06))'
                          }}
                          onError={(e) => {
                            e.currentTarget.src = `/stickers/${st.id}.png?v=1`;
                          }}
                        />

                        {/* Lock / Check Icon (Always in Corner, Never on Character) */}
                        {!isUnlocked ? (
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#ffffff',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)',
                            border: '1.5px solid #ffffff'
                          }}>
                            <Lock size={10} color="#ffffff" strokeWidth={2.8} />
                          </div>
                        ) : (
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.45)',
                            border: '1.5px solid #ffffff'
                          }}>
                            <Check size={11} strokeWidth={3} color="#ffffff" />
                          </div>
                        )}
                      </div>

                      {/* Title & Equiv / Status */}
                      <div style={{ width: '100%' }}>
                        <h4 style={{
                          margin: '0 0 2px 0',
                          fontSize: isMobile ? '0.78rem' : '0.84rem',
                          fontWeight: 950,
                          color: '#0f172a',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {st.title.replace(/\s*\([^)]*\)\s*$/, '')}
                        </h4>

                        {isUnlocked ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.62rem',
                            fontWeight: 950,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            border: '1px solid #bbf7d0'
                          }}>
                            ✓ Gemeistert
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.60rem',
                            color: '#64748b',
                            fontWeight: 800,
                            background: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '100px'
                          }}>
                            <Lock size={9} /> Jahr {yearNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 🎮 AKTION-KATEGORIEN (Übe-Fleiß, Zauber-XP, Streaks, Repertoire, Spezial)   */}
          {/* ========================================================================= */}
          {juniorStickerCategory !== 'schuljahr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '18px' : '24px', width: '100%' }}>
              {[
                { id: 'ueben', title: '⏱️ Übe-Fleiß & Zeiterfolge', icon: Clock, iconColor: '#10b981' },
                { id: 'xp', title: '⭐ Zauber-XP & Meilensteine', icon: Sparkles, iconColor: '#eab308' },
                { id: 'streaks', title: '🔥 Übe-Streaks & Kontinuität', icon: Flame, iconColor: '#ef4444' },
                { id: 'songs', title: '🎵 Repertoire & Meisterstücke', icon: Music, iconColor: '#8b5cf6' },
                { id: 'spezial', title: '🏆 Spezial-Auszeichnungen & Bühne', icon: Star, iconColor: '#d97706' }
              ]
                .filter(cat => juniorStickerCategory === 'all' || cat.id === juniorStickerCategory)
                .map(cat => {
                  const categoryStickers = activeGamificationStickers.filter(st => st.category === cat.id);
                  if (categoryStickers.length === 0) return null;

                  const catUnlockedCount = categoryStickers.filter(st => unifiedStickersMap[st.id]?.isUnlocked).length;
                  const isCatComplete = catUnlockedCount === categoryStickers.length;
                  const CatIcon = cat.icon;

                  return (
                    <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      {/* Category Header Row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CatIcon size={16} color={cat.iconColor} strokeWidth={2.4} />
                          <h3 style={{ margin: 0, fontSize: isMobile ? '0.86rem' : '0.94rem', fontWeight: 950, color: '#0f172a' }}>
                            {cat.title}
                          </h3>
                        </div>

                        <span style={{
                          background: isCatComplete ? '#dcfce7' : '#f1f5f9',
                          border: isCatComplete ? '1px solid #86efac' : '1px solid #e2e8f0',
                          color: isCatComplete ? '#15803d' : '#64748b',
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {catUnlockedCount} / {categoryStickers.length} {isCatComplete ? '✓' : ''}
                        </span>
                      </div>

                      {/* Kompaktes Apple HIG Squircle Grid (4-Spaltig Desktop / 2-Spaltig Mobile) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: isMobile ? '10px' : '12px',
                        width: '100%'
                      }}>
                        {categoryStickers.map(st => {
                          const status = unifiedStickersMap[st.id] || { isUnlocked: false, progressText: '', count: 0, details: [] };
                          const isUnlocked = status.isUnlocked;
                          const progressText = status.progressText;

                          const isLegendary = st.rarity === 'legendary';
                          const isEpic = st.rarity === 'epic';
                          const isRare = st.rarity === 'rare';

                          const rarityGlow = isLegendary 
                            ? 'rgba(250, 204, 21, 0.45)' 
                            : isEpic 
                            ? 'rgba(192, 132, 252, 0.4)' 
                            : isRare 
                            ? 'rgba(96, 165, 250, 0.35)' 
                            : 'rgba(52, 168, 83, 0.35)';

                          return (
                            <div
                              key={st.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelectSticker({ ...st, isUnlocked, progressText })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onSelectSticker({ ...st, isUnlocked, progressText });
                                }
                              }}
                              style={{
                                background: isUnlocked ? '#ffffff' : '#f8fafc',
                                border: isUnlocked 
                                  ? (isLegendary ? '2px solid #facc15' : isEpic ? '2px solid #c084fc' : isRare ? '2px solid #93c5fd' : '2px solid #86efac') 
                                  : '1.5px dashed #cbd5e1',
                                borderRadius: '20px',
                                padding: isMobile ? '10px 8px' : '12px 10px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '6px',
                                position: 'relative',
                                boxShadow: isUnlocked 
                                  ? `0 8px 18px ${rarityGlow}` 
                                  : '0 2px 6px rgba(0, 0, 0, 0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                overflow: 'hidden',
                                boxSizing: 'border-box'
                              }}
                              className="hover-scale"
                              aria-label={`${st.title} (${isUnlocked ? 'Im Album' : progressText || 'Gesperrt'})`}
                            >
                              {/* RARITY PILL */}
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 950,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                padding: '2px 8px',
                                borderRadius: '100px',
                                background: isLegendary ? '#fef3c7' : isEpic ? '#f3e8ff' : isRare ? '#eff6ff' : '#f1f5f9',
                                color: isLegendary ? '#b45309' : isEpic ? '#7e22ce' : isRare ? '#1d4ed8' : '#475569',
                                border: isLegendary ? '1px solid #fde68a' : 'none'
                              }}>
                                {st.rarityLabel}
                              </span>

                              {/* STICKER THUMBNAIL BADGE (Kompakt 66px Desktop / 58px Mobile) */}
                              <div style={{
                                width: isMobile ? '58px' : '66px',
                                height: isMobile ? '58px' : '66px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '16px',
                                background: isUnlocked 
                                  ? '#0a0e1a' 
                                  : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                border: isUnlocked 
                                  ? (isLegendary ? '2px solid #facc15' : isEpic ? '2px solid #c084fc' : isRare ? '2px solid #93c5fd' : '2px solid #4ade80')
                                  : '1.5px dashed #cbd5e1',
                                boxShadow: isUnlocked
                                  ? `0 4px 12px ${rarityGlow}`
                                  : '0 2px 6px rgba(15, 23, 42, 0.05)',
                                overflow: 'hidden',
                                padding: '3px'
                              }}>
                                <img
                                  src={`/stickers/thumbs/${st.id}.png`}
                                  alt={st.title}
                                  loading="lazy"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    filter: isUnlocked 
                                      ? 'drop-shadow(0 4px 8px rgba(255,255,255,0.18))' 
                                      : 'saturate(0.85) opacity(0.70) drop-shadow(0 2px 6px rgba(15,23,42,0.06))',
                                    transition: 'transform 0.2s ease'
                                  }}
                                  onError={(e) => {
                                    const src = e.currentTarget.src;
                                    if (src.includes('/thumbs/')) {
                                      e.currentTarget.src = `/stickers/${st.id}.png?v=1`;
                                      return;
                                    }
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      const span = document.createElement('span');
                                      span.style.fontSize = isMobile ? '1.8rem' : '2.1rem';
                                      span.innerText = st.emoji;
                                      parent.appendChild(span);
                                    }
                                  }}
                                />

                                {/* Lock / Check Icon (Always in Corner, Never on Character) */}
                                {!isUnlocked ? (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: '#ffffff',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)',
                                    border: '1.5px solid #ffffff'
                                  }}>
                                    <Lock size={10} color="#ffffff" strokeWidth={2.8} />
                                  </div>
                                ) : (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.45)',
                                    border: '1.5px solid #ffffff'
                                  }}>
                                    <Check size={11} strokeWidth={3} color="#ffffff" />
                                  </div>
                                )}
                              </div>

                              {/* TITLE & PROGRESS / STATUS */}
                              <div style={{ width: '100%' }}>
                                <h4 style={{
                                  margin: '0 0 2px 0',
                                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                                  fontWeight: 950,
                                  color: '#0f172a',
                                  lineHeight: 1.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {st.title}
                                </h4>

                                {isUnlocked ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    fontSize: '0.62rem',
                                    fontWeight: 950,
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    border: '1px solid #bbf7d0'
                                  }}>
                                    ★ Im Album!
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.60rem',
                                    color: '#b45309',
                                    fontWeight: 900,
                                    background: '#fef3c7',
                                    padding: '2px 6px',
                                    borderRadius: '100px',
                                    border: '1px solid #fde68a',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    <Lock size={9} /> {progressText || 'Noch gesperrt'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div
          style={{
            flexShrink: 0,
            paddingTop: '10px',
            paddingBottom: isMobile ? 'calc(max(10px, env(safe-area-inset-bottom, 10px)) + 2px)' : '4px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            position: 'relative',
            zIndex: 20
          }}
          className={isMobile ? "mobile-modal-footer" : ""}
        >
          <button
            onClick={() => {
              onClose();
              onStartInstrument();
            }}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '15px',
              borderRadius: '20px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontSize: isMobile ? '0.98rem' : '1.02rem',
              fontWeight: 950,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 22px rgba(217, 119, 6, 0.32)',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation',
              userSelect: 'none'
            }}
            className="hover-scale"
            aria-label="Auf zum Instrument!"
          >
            <Sparkles size={18} fill="#ffffff" />
            <span>Auf zum Instrument! 🚀</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
