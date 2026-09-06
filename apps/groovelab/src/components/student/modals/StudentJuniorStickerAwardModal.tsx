import React, { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { Award, BookOpen, Download, Music } from "lucide-react";

const Confetti = lazy(() => import("react-confetti"));

export interface StudentJuniorStickerAwardModalProps {
  sticker: any;
  assignedCampusSongs: any[];
  progressItems: any[];
  isSongMastered: (song: any) => boolean;
  onDownloadJpg: (sticker: any) => void;
  onStickInAlbum: () => void;
}

export const StudentJuniorStickerAwardModal: React.FC<StudentJuniorStickerAwardModalProps> = ({
  sticker,
  assignedCampusSongs,
  progressItems,
  isSongMastered,
  onDownloadJpg,
  onStickInAlbum,
}) => {
  if (!sticker || typeof document === "undefined") return null;

  const isSongSticker = sticker.category === 'songs' || sticker.id === 'song-master';
  const masteredSong = assignedCampusSongs.find(s => isSongMastered(s)) || assignedCampusSongs[0];
  const songTitleDisplay = masteredSong ? `${masteredSong.artist} – ${masteredSong.title}` : (progressItems.find(p => p.status === 'MASTERED')?.topic_name || '');

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      zIndex: 100000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <Suspense fallback={null}>
        <Confetti recycle={false} numberOfPieces={350} gravity={0.22} />
      </Suspense>
      <div style={{
        background: '#ffffff',
        borderRadius: '36px',
        padding: '36px 32px',
        textAlign: 'center',
        maxWidth: '460px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <span style={{
          background: '#fef3c7',
          color: '#d97706',
          fontSize: '0.8rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '6px 16px',
          borderRadius: '100px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Award size={14} /> Neuer Sticker freigeschaltet!
        </span>

        {/* Animated Floating Sticker Badge */}
        <div style={{
          width: '150px',
          height: '150px',
          borderRadius: '32px',
          background: '#0a0e1a',
          border: '4px solid #facc15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 16px 40px rgba(250, 204, 21, 0.35)',
          overflow: 'hidden',
          padding: '10px',
          animation: 'spinStickerAward 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <img
            src={`/stickers/${sticker.id}.png?v=1`}
            alt={sticker.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '22px',
              filter: 'drop-shadow(0 6px 14px rgba(255,255,255,0.2))'
            }}
            onError={(e) => {
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
        </div>

        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#0f172a', margin: '0 0 6px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {sticker.title}
          </h2>
          {isSongSticker && songTitleDisplay && (
            <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Music size={12} /> Interpret &amp; Songtitel
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {songTitleDisplay}
              </div>
            </div>
          )}
          <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#15803d', marginBottom: '8px' }}>
            Super gemacht! Du warst richtig fleißig!
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 650, margin: 0, lineHeight: 1.3 }}>
            {sticker.desc}
          </p>
        </div>

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
              fontSize: '1.05rem',
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
            onClick={onStickInAlbum}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '16px',
              fontWeight: 950,
              fontSize: '1.05rem',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(52, 168, 83, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            className="hover-scale"
          >
            <BookOpen size={18} />
            <span>In mein Album kleben</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spinStickerAward {
          from { transform: scale(0) rotate(-180deg); }
          to { transform: scale(1) rotate(0deg); }
        }
      `}} />
    </div>,
    document.body
  );
};
