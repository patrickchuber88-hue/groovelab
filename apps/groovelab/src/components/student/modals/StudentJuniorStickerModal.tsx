import React from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles, X } from "lucide-react";

export type JuniorStickerCategory = 'all' | 'ueben' | 'xp' | 'streaks' | 'songs' | 'spezial';

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
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '36px',
        maxWidth: '880px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 28px',
        boxShadow: '0 35px 80px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
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

        {/* SCROLLABLE 3D PANINI STICKER GRID */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          padding: '6px 4px 16px 4px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '16px'
          }}>
            {allStickers
              .filter(st => juniorStickerCategory === 'all' || st.category === juniorStickerCategory)
              .map((st) => {
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
                      background: isUnlocked ? '#ffffff' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      border: isUnlocked 
                        ? (isLegendary ? '3px solid #facc15' : isEpic ? '3px solid #c084fc' : isRare ? '3px solid #93c5fd' : '3px solid #86efac') 
                        : '2px dashed #cbd5e1',
                      borderRadius: '26px',
                      padding: '16px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '10px',
                      position: 'relative',
                      boxShadow: isUnlocked 
                        ? `0 12px 28px ${rarityGlow}` 
                        : '0 4px 12px rgba(0, 0, 0, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      overflow: 'hidden'
                    }}
                    className="hover-scale"
                  >
                    {/* RARITY BADGE */}
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 950,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: isLegendary ? '#fef3c7' : isEpic ? '#f3e8ff' : isRare ? '#eff6ff' : '#f1f5f9',
                      color: isLegendary ? '#b45309' : isEpic ? '#7e22ce' : isRare ? '#1d4ed8' : '#64748b',
                      border: isLegendary ? '1px solid #fde68a' : 'none'
                    }}>
                      {st.rarityLabel}
                    </span>

                    {/* STICKER IMAGE CONTAINER - COLLECTIBLE PANINI BADGE */}
                    <div style={{
                      width: '92px',
                      height: '92px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '22px',
                      background: '#0a0e1a',
                      border: isUnlocked 
                        ? (isLegendary ? '2.5px solid #facc15' : isEpic ? '2.5px solid #c084fc' : isRare ? '2.5px solid #93c5fd' : '2.5px solid #4ade80')
                        : '2px solid #334155',
                      boxShadow: isUnlocked
                        ? `0 8px 20px ${rarityGlow}`
                        : 'inset 0 2px 6px rgba(0,0,0,0.4)',
                      overflow: 'hidden',
                      padding: '5px'
                    }}>
                      {/* Genuine Full Color Image */}
                      <img
                        src={`/stickers/${st.id}.png?v=1`}
                        alt={st.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '16px',
                          filter: isUnlocked 
                            ? 'drop-shadow(0 4px 10px rgba(255,255,255,0.18))' 
                            : 'grayscale(25%) contrast(0.9) brightness(0.72)',
                          transition: 'transform 0.3s ease'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const span = document.createElement('span');
                            span.style.fontSize = '2.8rem';
                            span.innerText = st.emoji;
                            parent.appendChild(span);
                          }
                        }}
                      />

                      {/* Gentle Mystery Shimmer Overlay for Locked Stickers */}
                      {!isUnlocked && (
                        <div 
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '20px',
                            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}

                      {/* Floating Mystery Badge or Checkmark */}
                      {!isUnlocked ? (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#ffffff',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 3px 10px rgba(245, 158, 11, 0.45)',
                          border: '2px solid #ffffff'
                        }}>
                          <Sparkles size={12} color="#ffffff" />
                        </div>
                      ) : (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 3px 10px rgba(16, 185, 129, 0.45)',
                          border: '2px solid #ffffff'
                        }}>
                          <Check size={13} strokeWidth={3} color="#ffffff" />
                        </div>
                      )}
                    </div>

                    {/* TITLE & CHILD-FRIENDLY PROGRESS/STATUS */}
                    <div style={{ width: '100%' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.94rem', fontWeight: 950, color: '#0f172a', lineHeight: 1.2 }}>
                        {st.title}
                      </h4>
                      {isUnlocked ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '0.68rem',
                          fontWeight: 950,
                          padding: '3px 10px',
                          borderRadius: '100px',
                          border: '1px solid #bbf7d0'
                        }}>
                          ★ Im Album!
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.70rem',
                          color: '#b45309',
                          fontWeight: 900,
                          background: '#fef3c7',
                          padding: '3px 10px',
                          borderRadius: '100px',
                          border: '1px solid #fde68a'
                        }}>
                          {progressText || 'Noch gesperrt'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div style={{ flexShrink: 0, paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
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
