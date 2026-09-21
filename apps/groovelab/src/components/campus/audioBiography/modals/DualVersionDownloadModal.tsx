import React from 'react';
import { Download, Sparkles, Mic } from 'lucide-react';

interface DownloadMenuTrack {
  rawUrl?: string;
  masteredUrl?: string;
  trackId?: string;
  title: string;
}

interface DualVersionDownloadModalProps {
  track: DownloadMenuTrack;
  onClose: () => void;
  onDownload: (mode: 'master' | 'raw' | 'both', track: DownloadMenuTrack) => void | Promise<void>;
  isLight: boolean;
}

export const DualVersionDownloadModal: React.FC<DualVersionDownloadModalProps> = ({
  track,
  onClose,
  onDownload,
  isLight
}) => {
  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Song herunterladen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '24px',
        padding: '24px',
        maxWidth: '460px',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Download size={22} color="#10b981" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                Song herunterladen
              </h3>
              <span style={{ fontSize: '0.78rem', color: colors.textSecondary, fontWeight: 600 }}>
                "{track.title}"
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: isLight ? '#475569' : '#e2e8f0', lineHeight: 1.4, fontWeight: 500 }}>
          Wähle dein bevorzugtes Format. Beide Spuren sind in verlustfreier Studioqualität (WAV) nach <b>EBU R128 Studio-Standard</b> pegelangeglichen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Option 1: Studio Master */}
          <button
            type="button"
            onClick={() => onDownload('master', track)}
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              border: `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.3)'}`,
              background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)',
              color: colors.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              textAlign: 'left'
            }}
            className="hover-scale"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#10b981' }}>
                  Studio Audio-Processing (.wav)
                </div>
                <div style={{ fontSize: '0.74rem', color: isLight ? '#475569' : '#cbd5e1' }}>
                  Mit Studio Audio-Processing • HD Studio-Master
                </div>
              </div>
            </div>
            <Download size={16} color="#10b981" />
          </button>

          {/* Option 2: Pure RAW */}
          <button
            type="button"
            onClick={() => onDownload('raw', track)}
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              border: `1.5px solid ${isLight ? '#93c5fd' : 'rgba(59, 130, 246, 0.3)'}`,
              background: isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)',
              color: colors.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              textAlign: 'left'
            }}
            className="hover-scale"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Mic size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#3b82f6' }}>
                  Pure RAW (.wav)
                </div>
                <div style={{ fontSize: '0.74rem', color: isLight ? '#475569' : '#cbd5e1' }}>
                  Unbearbeitete Originalaufnahme • Pegel-Match
                </div>
              </div>
            </div>
            <Download size={16} color="#3b82f6" />
          </button>

          {/* Option 3: Both Versions */}
          <button
            type="button"
            onClick={() => onDownload('both', track)}
            style={{
              padding: '12px 16px',
              borderRadius: '16px',
              border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
              color: colors.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              fontWeight: 800
            }}
            className="hover-scale"
          >
            <Download size={14} color="#f59e0b" />
            <span>Beide Versionen herunterladen (Master + RAW)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
