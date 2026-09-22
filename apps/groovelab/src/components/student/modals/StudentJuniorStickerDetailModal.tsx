import React from "react";
import { createPortal } from "react-dom";
import { Check, Download, Music, Rocket, Star, X, Lock } from "lucide-react";
import { StudentStickerAwardCelebrationModal } from "./StudentStickerAwardCelebrationModal";

export interface StudentJuniorStickerDetailModalProps {
  sticker: any;
  onClose: () => void;
  assignedCampusSongs: any[];
  progressItems: any[];
  isSongMastered: (song: any) => boolean;
  onStartRocket: () => void;
  onDownloadJpg: (sticker: any) => void;
}

export const StudentJuniorStickerDetailModal: React.FC<StudentJuniorStickerDetailModalProps> = ({
  sticker,
  onClose,
  assignedCampusSongs,
  progressItems,
  isSongMastered,
  onStartRocket,
  onDownloadJpg,
}) => {
  if (!sticker || typeof document === "undefined") return null;

  const isSongSticker = sticker.category === 'songs' || sticker.id === 'song-master';
  const masteredSong = assignedCampusSongs.find(s => isSongMastered(s)) || assignedCampusSongs[0];
  const songTitleDisplay = masteredSong ? `${masteredSong.artist} – ${masteredSong.title}` : (progressItems.find(p => p.status === 'MASTERED')?.topic_name || '');

  // 🌟 WENN FREIGESCHALTET: ZEIGE DAS ANIMIERTE 3D SAMMLER-ZERTIFIKAT
  if (sticker.isUnlocked) {
    return (
      <StudentStickerAwardCelebrationModal
        sticker={sticker}
        topicName={songTitleDisplay}
        isAlreadyCollected={true}
        onDownloadJpg={(st) => onDownloadJpg(st)}
        onStickInAlbum={onClose}
      />
    );
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.94)',
      backdropFilter: 'blur(20px)',
      zIndex: 100001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '38px',
        maxWidth: '480px',
        width: '100%',
        padding: '36px 30px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        position: 'relative',
        animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
          className="hover-scale"
        >
          <X size={22} />
        </button>

        {/* Status Pill: Unlocked vs Locked */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {sticker.isUnlocked ? (
            <span style={{
              background: '#dcfce7',
              color: '#15803d',
              fontSize: '0.8rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '6px 16px',
              borderRadius: '100px',
              border: '1.5px solid #86efac',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={14} strokeWidth={3} /> Im Album freigeschaltet
            </span>
          ) : (
            <span style={{
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: '0.8rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '6px 16px',
              borderRadius: '100px',
              border: '1.5px solid #fecaca',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Lock size={14} strokeWidth={2.5} /> Noch verschlossen
            </span>
          )}

          {/* Rarity Pill */}
          <span style={{
            background: sticker.rarity === 'legendary' ? '#fef3c7' : sticker.rarity === 'epic' ? '#f3e8ff' : sticker.rarity === 'rare' ? '#eff6ff' : '#f0fdf4',
            color: sticker.rarity === 'legendary' ? '#b45309' : sticker.rarity === 'epic' ? '#7e22ce' : sticker.rarity === 'rare' ? '#1d4ed8' : '#15803d',
            fontSize: '0.8rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '6px 16px',
            borderRadius: '100px',
            border: sticker.rarity === 'legendary' ? '1.5px solid #facc15' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Star size={12} fill="currentColor" /> {sticker.rarityLabel}
          </span>
        </div>

        {/* Large 150px Floating Sticker Card (Full color vs Apple Frosted Teaser) */}
        <div style={{
          width: '150px',
          height: '150px',
          borderRadius: '34px',
          background: sticker.isUnlocked 
            ? '#0a0e1a' 
            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: sticker.isUnlocked 
            ? (sticker.rarity === 'legendary' ? '4px solid #facc15' : sticker.rarity === 'epic' ? '4px solid #c084fc' : sticker.rarity === 'rare' ? '4px solid #93c5fd' : '4px solid #34a853')
            : '2.5px dashed #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: sticker.isUnlocked 
            ? '0 16px 40px rgba(52, 168, 83, 0.35)' 
            : '0 10px 28px rgba(15, 23, 42, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          padding: '12px',
          boxSizing: 'border-box'
        }}>
          <img
            src={`/stickers/thumbs/${sticker.id}.png`}
            alt={sticker.title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '24px',
              filter: sticker.isUnlocked 
                ? 'drop-shadow(0 6px 14px rgba(255,255,255,0.2))' 
                : 'saturate(0.85) opacity(0.70) drop-shadow(0 6px 14px rgba(15, 23, 42, 0.10))',
              transition: 'all 0.2s ease'
            }}
            onError={(e) => {
              // Fallback to original path if thumb missing
              const currentSrc = e.currentTarget.src;
              if (currentSrc.includes('/thumbs/')) {
                e.currentTarget.src = `/stickers/${sticker.id}.png?v=1`;
                return;
              }
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const span = document.createElement('span');
                span.style.fontSize = '4.5rem';
                span.innerText = sticker.emoji;
                parent.appendChild(span);
              }
            }}
          />

          {/* Frosted Corner Lock Badge when locked (Leaves motive 100% visible) */}
          {!sticker.isUnlocked && (
            <div 
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.45)',
                border: '2.5px solid #ffffff',
                pointerEvents: 'none'
              }}
              title="Noch gesperrt"
            >
              <Lock size={15} color="#ffffff" strokeWidth={2.8} />
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#0f172a', margin: '0 0 4px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {sticker.title}
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 650, margin: 0, lineHeight: 1.35 }}>
            {sticker.desc}
          </p>
        </div>

        {/* Interpret + Songtitel Display for Song Stickers */}
        {isSongSticker && songTitleDisplay && (
          <div style={{ textAlign: 'center', margin: '2px 0' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Music size={12} /> Interpret &amp; Songtitel
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {songTitleDisplay}
            </div>
          </div>
        )}

        {/* Open, Borderless Progress / Achievement Flow */}
        <div style={{ textAlign: 'center', padding: '4px 8px' }}>
          {sticker.isUnlocked ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#15803d', fontWeight: 800, fontSize: '0.94rem' }}>
              <Check size={16} color="#15803d" />
              <span>Glückwunsch! Du besitzt diesen Sticker bereits!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Dein Ziel zum Freischalten
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {sticker.progressText || sticker.desc}
              </div>
            </div>
          )}
        </div>

        {/* ACTION BUTTON */}
        {!sticker.isUnlocked ? (
          <button
            onClick={onStartRocket}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '18px',
              fontWeight: 950,
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            className="hover-scale"
          >
            <Rocket size={20} fill="currentColor" />
            <span>Jetzt Übe-Rakete starten! 🚀</span>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button
              type="button"
              onClick={() => onDownloadJpg(sticker)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                padding: '16px',
                fontWeight: 950,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              className="hover-scale"
            >
              <Download size={18} />
              <span>Sticker als JPG herunterladen</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                padding: '14px',
                fontWeight: 950,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
              className="hover-scale"
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
