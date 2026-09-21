import React, { useState } from 'react';
import { X, ChevronDown, Lock, RotateCcw, Share2, Copy, Check, ExternalLink, Shield } from 'lucide-react';
import { CustomPlaylist } from '../types';

interface ShareModalProps {
  onClose: () => void;
  student: any;
  customPlaylists: CustomPlaylist[];
  sharePin: string;
  onReRollPin: () => void;
  onSavePin: (pin: string) => void;
  copySuccess: boolean;
  onCopyShareLink: () => void;
  shareTargetPlaylistId: string | null;
  onSelectTargetPlaylistId: (id: string | null) => void;
  shareDesignTheme: 'dark' | 'light';
  onSelectShareDesignTheme: (theme: 'dark' | 'light') => void;
  shareAnonymously: boolean;
  onToggleShareAnonymously: () => void;
  buildShareUrl: () => string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  onClose,
  student,
  customPlaylists,
  sharePin,
  onReRollPin,
  onSavePin,
  copySuccess,
  onCopyShareLink,
  shareTargetPlaylistId,
  onSelectTargetPlaylistId,
  shareDesignTheme,
  onSelectShareDesignTheme,
  shareAnonymously,
  onToggleShareAnonymously,
  buildShareUrl
}) => {
  const [showAdvancedShareOptions, setShowAdvancedShareOptions] = useState<boolean>(false);

  const handleShareFamily = async () => {
    const shareUrl = buildShareUrl();
    const title = `Musikalisches Album von ${student?.first_name || 'Schüler'}`;
    const text = `Hör dir meine neuesten Musik-Aufnahmen an! Mein Familien-PIN lautet: ${sharePin}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        console.warn('Navigator.share error:', err);
      }
    }
    onCopyShareLink();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Musik sicher teilen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        maxWidth: '430px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '24px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.3rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              flexShrink: 0
            }}>
              🎁
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 900, color: '#0f172a' }}>
                Musik sicher teilen
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                Für Mama, Papa & Oma • Kein Login nötig
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            className="hover-scale"
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Applaus Info */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>👏 ❤️ ⭐</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#166534' }}>
              Live-Applaus für {student?.first_name || 'dich'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#15803d', lineHeight: 1.4 }}>
            Deine Familie kann deine Stücke sofort im Browser auf jedem Handy oder Tablet anhören und dir mit 1 Klick Applaus schicken!
          </p>
        </div>

        {/* Target Playlist Selector */}
        {customPlaylists.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 800, marginBottom: '6px' }}>
              Was möchtest du teilen?
            </label>
            <div style={{
              position: 'relative',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <select
                value={shareTargetPlaylistId || ''}
                onChange={(e) => onSelectTargetPlaylistId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'transparent',
                  color: '#0f172a',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              >
                <option value="">💽 Alle Meilensteine & Stücke</option>
                {customPlaylists.map(pl => (
                  <option key={pl.id} value={pl.id}>
                    {pl.title} ({pl.tracks?.length || 0} Stücke)
                  </option>
                ))}
              </select>
              <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '14px', pointerEvents: 'none' }} />
            </div>
          </div>
        )}

        {/* PIN-Box */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={15} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
                DEIN FAMILIEN-PIN
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.18em' }}>
                {sharePin || '4829'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onReRollPin}
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#047857',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '100px'
            }}
            className="hover-scale"
          >
            <RotateCcw size={12} strokeWidth={2.4} />
            <span>Neu würfeln</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleShareFamily}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '16px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.94rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
            className="hover-scale"
          >
            <Share2 size={20} strokeWidth={2.4} />
            <span>Mit Familie teilen</span>
          </button>

          <button
            type="button"
            onClick={onCopyShareLink}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '16px',
              border: '1.5px solid #cbd5e1',
              background: copySuccess ? '#10b981' : '#ffffff',
              color: copySuccess ? '#ffffff' : '#334155',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            className="hover-scale"
          >
            {copySuccess ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
            <span>{copySuccess ? 'Nachricht & Link kopiert!' : 'Link & Nachricht kopieren'}</span>
          </button>
        </div>

        {/* Advanced Options Accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvancedShareOptions(!showAdvancedShareOptions)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 4px'
            }}
          >
            <span>⚙️ {showAdvancedShareOptions ? 'Weniger Optionen' : 'Erweiterte Einstellungen (Design & Name)'}</span>
            <ChevronDown size={12} style={{ transform: showAdvancedShareOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>

          {showAdvancedShareOptions && (
            <div style={{
              marginTop: '10px',
              padding: '12px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  Design der Playlist:
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onSelectShareDesignTheme('light')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: shareDesignTheme === 'light' ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      background: shareDesignTheme === 'light' ? '#f0fdf4' : '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ☀️ Hell
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectShareDesignTheme('dark')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: shareDesignTheme === 'dark' ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      background: shareDesignTheme === 'dark' ? '#f0fdf4' : '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🌙 Dunkel
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  Name anonymisieren
                </span>
                <div
                  role="switch"
                  aria-checked={shareAnonymously}
                  onClick={onToggleShareAnonymously}
                  style={{
                    width: '38px',
                    height: '22px',
                    borderRadius: '999px',
                    backgroundColor: shareAnonymously ? '#10b981' : '#cbd5e1',
                    padding: '2px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      transform: shareAnonymously ? 'translateX(16px)' : 'translateX(0px)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => {
                    const url = buildShareUrl();
                    window.open(url, '_blank');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ExternalLink size={12} />
                  <span>PIN-Seite im Browser testen</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          borderRadius: '10px',
          background: '#f8fafc'
        }}>
          <Shield size={13} color="#10b981" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: 1.3 }}>
            Geschützter Web-Stream für den privaten Familienkreis.
          </span>
        </div>
      </div>
    </div>
  );
};
