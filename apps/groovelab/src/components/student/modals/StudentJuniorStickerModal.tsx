import React from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles, X, Lock, Clock, Flame, Music, Award, Star } from "lucide-react";

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

  const unlockedTotal = allStickers.filter(st => unifiedStickersMap[st.id]?.isUnlocked).length;
  const categoriesList = [
    { id: 'all', label: `Alle (${allStickers.length})` },
    { id: 'schuljahr', label: '🎒 Schuljahre' },
    { id: 'ueben', label: '⏱️ Übe-Fleiß' },
    { id: 'xp', label: '⭐ Zauber-XP' },
    { id: 'streaks', label: '🔥 Streaks' },
    { id: 'songs', label: '🎵 Repertoire' },
    { id: 'spezial', label: '🏆 Spezial' }
  ];

  return createPortal(
    <div style={{
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
            top: '20px',
            right: '20px',
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
            zIndex: 10
          }}
          className="hover-scale"
          title="Album schließen"
        >
          <X size={24} />
        </button>

        {/* FIXED HEADER (Never overlapped) */}
        <div style={{ flexShrink: 0, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#d97706',
              width: '54px',
              height: '54px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              boxShadow: '0 6px 18px rgba(217, 119, 6, 0.2)',
              flexShrink: 0
            }}>
              🏆
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 950, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Deine Auszeichnungen
                </span>
                <span style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '2px 10px',
                  borderRadius: '100px'
                }}>
                  {allStickers.filter(st => unifiedStickersMap[st.id]?.isUnlocked).length} von {allStickers.length} freigeschaltet ✨
                </span>
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Dein Sticker-Sammelalbum ★
              </h2>
            </div>
          </div>

          {/* CATEGORY FILTER TABS (Generous spacing & Touch-friendly) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '4px 2px',
            margin: '4px 0 8px 0',
            WebkitOverflowScrolling: 'touch'
          }}>
            {[
              { id: 'all', label: `Alle (${allStickers.length})` },
              { id: 'schuljahr', label: '🎒 Schuljahre' },
              { id: 'ueben', label: '⏱️ Übe-Fleiß' },
              { id: 'xp', label: '⭐ Zauber-XP' },
              { id: 'streaks', label: '🔥 Streaks' },
              { id: 'songs', label: '🎵 Repertoire' },
              { id: 'spezial', label: '🏆 Spezial' }
            ].map(tab => {
              const isActive = juniorStickerCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setJuniorStickerCategory(tab.id as any)}
                  style={{
                    background: isActive ? '#0f172a' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                    borderRadius: '100px',
                    padding: '9px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  className="hover-scale"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SCROLLABLE 3D COLLECTOR STICKER CONTENT */}
        <div
          style={{
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            flex: isMobile ? '1 1 0%' : 1,
            minHeight: 0,
            maxHeight: '100%',
            padding: isMobile ? '6px 4px calc(80px + env(safe-area-inset-bottom, 24px)) 4px' : '6px 4px 16px 4px'
          }}
          className={isMobile ? "mobile-scroll-container" : ""}
        >
          {(() => {
            const categories = [
              { id: 'schuljahr', title: '🎒 Schuljahr-Wappen & Ausbildungs-Reise', icon: Award, iconColor: '#0284c7' },
              { id: 'ueben', title: '⏱️ Übe-Fleiß & Zeiterfolge', icon: Clock, iconColor: '#10b981' },
              { id: 'xp', title: '⭐ Zauber-XP & Meilensteine', icon: Sparkles, iconColor: '#eab308' },
              { id: 'streaks', title: '🔥 Übe-Streaks & Kontinuität', icon: Flame, iconColor: '#ef4444' },
              { id: 'songs', title: '🎵 Repertoire & Meisterstücke', icon: Music, iconColor: '#8b5cf6' },
              { id: 'spezial', title: '🏆 Spezial-Auszeichnungen & Bühne', icon: Star, iconColor: '#d97706' }
            ].filter(cat => juniorStickerCategory === 'all' || cat.id === juniorStickerCategory);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '28px', width: '100%' }}>
                {categories.map(cat => {
                  const categoryStickers = allStickers.filter(st => st.category === cat.id);
                  if (categoryStickers.length === 0) return null;

                  const catUnlockedCount = categoryStickers.filter(st => unifiedStickersMap[st.id]?.isUnlocked).length;
                  const isCatComplete = catUnlockedCount === categoryStickers.length;
                  const CatIcon = cat.icon;

                  return (
                    <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      {/* Category Header Row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CatIcon size={16} color={cat.iconColor} strokeWidth={2.4} />
                          <h3 style={{ margin: 0, fontSize: isMobile ? '0.88rem' : '0.98rem', fontWeight: 950, color: '#0f172a' }}>
                            {cat.title}
                          </h3>
                        </div>

                        <span style={{
                          background: isCatComplete ? '#dcfce7' : '#f1f5f9',
                          border: isCatComplete ? '1px solid #86efac' : '1px solid #e2e8f0',
                          color: isCatComplete ? '#15803d' : '#64748b',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {catUnlockedCount} / {categoryStickers.length} {isCatComplete ? '✓' : ''}
                        </span>
                      </div>

                      {/* Responsive Grid: 2-Columns on Mobile, 4-Columns on Desktop */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: isMobile ? '10px' : '14px',
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
                              onClick={() => onSelectSticker({ ...st, isUnlocked, progressText })}
                              style={{
                                background: isUnlocked ? '#ffffff' : '#f8fafc',
                                border: isUnlocked 
                                  ? (isLegendary ? '2.5px solid #facc15' : isEpic ? '2.5px solid #c084fc' : isRare ? '2.5px solid #93c5fd' : '2.5px solid #86efac') 
                                  : '1.5px dashed #cbd5e1',
                                borderRadius: '22px',
                                padding: isMobile ? '12px 8px' : '16px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '8px',
                                position: 'relative',
                                boxShadow: isUnlocked 
                                  ? `0 10px 24px ${rarityGlow}` 
                                  : '0 2px 6px rgba(0, 0, 0, 0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                overflow: 'hidden',
                                boxSizing: 'border-box'
                              }}
                              className="hover-scale"
                            >
                              {/* RARITY PILL */}
                              <span style={{
                                fontSize: '0.60rem',
                                fontWeight: 950,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                padding: '2px 8px',
                                borderRadius: '100px',
                                background: isLegendary ? '#fef3c7' : isEpic ? '#f3e8ff' : isRare ? '#eff6ff' : '#f1f5f9',
                                color: isLegendary ? '#b45309' : isEpic ? '#7e22ce' : isRare ? '#1d4ed8' : '#64748b',
                                border: isLegendary ? '1px solid #fde68a' : 'none'
                              }}>
                                {st.rarityLabel}
                              </span>

                              {/* STICKER THUMBNAIL BADGE */}
                              <div style={{
                                width: isMobile ? '74px' : '88px',
                                height: isMobile ? '74px' : '88px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '18px',
                                background: '#0a0e1a',
                                border: isUnlocked 
                                  ? (isLegendary ? '2px solid #facc15' : isEpic ? '2px solid #c084fc' : isRare ? '2px solid #93c5fd' : '2px solid #4ade80')
                                  : '1.5px solid #334155',
                                boxShadow: isUnlocked
                                  ? `0 6px 16px ${rarityGlow}`
                                  : 'inset 0 2px 6px rgba(0,0,0,0.4)',
                                overflow: 'hidden',
                                padding: '4px'
                              }}>
                                <img
                                  src={`/stickers/thumbs/${st.id}.png`}
                                  alt={st.title}
                                  loading="lazy"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    borderRadius: '14px',
                                    filter: isUnlocked 
                                      ? 'drop-shadow(0 4px 8px rgba(255,255,255,0.18))' 
                                      : 'grayscale(100%) contrast(1.1) brightness(0.25)',
                                    transition: 'transform 0.2s ease'
                                  }}
                                  onError={(e) => {
                                    // Fallback to uncompressed png if thumb missing
                                    const src = e.currentTarget.src;
                                    if (src.includes('/thumbs/')) {
                                      e.currentTarget.src = `/stickers/${st.id}.png?v=1`;
                                      return;
                                    }
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      const span = document.createElement('span');
                                      span.style.fontSize = isMobile ? '2.2rem' : '2.6rem';
                                      span.innerText = st.emoji;
                                      parent.appendChild(span);
                                    }
                                  }}
                                />

                                {/* Lock Overlay for Locked Stickers */}
                                {!isUnlocked ? (
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '16px',
                                    background: 'rgba(15, 23, 42, 0.65)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none'
                                  }}>
                                    <div style={{
                                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                      color: '#ffffff',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)'
                                    }}>
                                      <Lock size={12} color="#ffffff" strokeWidth={2.6} />
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.45)',
                                    border: '1.5px solid #ffffff'
                                  }}>
                                    <Check size={12} strokeWidth={3} color="#ffffff" />
                                  </div>
                                )}
                              </div>

                              {/* TITLE & PROGRESS / STATUS */}
                              <div style={{ width: '100%' }}>
                                <h4 style={{
                                  margin: '0 0 4px 0',
                                  fontSize: isMobile ? '0.80rem' : '0.88rem',
                                  fontWeight: 950,
                                  color: '#0f172a',
                                  lineHeight: 1.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  minHeight: isMobile ? '1.9rem' : '2.1rem'
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
                                    fontSize: '0.64rem',
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
                                    fontSize: '0.64rem',
                                    color: '#b45309',
                                    fontWeight: 900,
                                    background: '#fef3c7',
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    border: '1px solid #fde68a',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    <Lock size={10} /> {progressText || 'Noch gesperrt'}
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
            );
          })()}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div
          style={{
            flexShrink: 0,
            paddingTop: '12px',
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
              padding: '16px',
              borderRadius: '20px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontSize: '1.05rem',
              fontWeight: 950,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(217, 119, 6, 0.35)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <Sparkles size={20} fill="#ffffff" />
            <span>Auf zum Instrument! 🚀</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
