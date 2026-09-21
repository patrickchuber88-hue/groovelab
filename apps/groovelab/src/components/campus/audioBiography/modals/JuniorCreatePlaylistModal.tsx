import React, { useState } from 'react';
import { X, Disc, Check } from 'lucide-react';
import { CustomPlaylist, UNIVERSAL_PLAYLIST_COVERS, UniversalPlaylistCoverConfig } from '../types';

export interface JuniorCreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  colors: { textPrimary: string; textSecondary: string };
  student?: { first_name?: string } | null;
  customPlaylists: CustomPlaylist[];
  onSavePlaylists: (playlists: CustomPlaylist[]) => void;
}

export const JuniorCreatePlaylistModal: React.FC<JuniorCreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  isLight,
  colors,
  student,
  customPlaylists,
  onSavePlaylists
}) => {
  const [juniorCoverCategoryFilter, setJuniorCoverCategoryFilter] = useState<'all' | 'concert_stage' | 'music_gifts' | 'repertoire_growth'>('concert_stage');
  const [newJuniorPlaylistTitle, setNewJuniorPlaylistTitle] = useState('');
  const [newJuniorPlaylistCover, setNewJuniorPlaylistCover] = useState<string>('upc_concert');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newJuniorPlaylistTitle.trim()) return;
    const chosenCover = UNIVERSAL_PLAYLIST_COVERS.find((c: UniversalPlaylistCoverConfig) => c.id === newJuniorPlaylistCover) || UNIVERSAL_PLAYLIST_COVERS[0];
    const newPl: CustomPlaylist = {
      id: `pl_${Date.now()}`,
      title: newJuniorPlaylistTitle.trim(),
      description: chosenCover.subTitle || `Erstellt von ${student?.first_name || 'Schüler'}`,
      vibeTheme: chosenCover.vibeTheme || 'sunset_gold',
      iconName: chosenCover.iconName || 'disc',
      coverPresetId: chosenCover.id,
      schoolYear: '2026/2027',
      tracks: [],
      createdAt: new Date().toISOString()
    };
    const updated = [newPl, ...customPlaylists];
    onSavePlaylists(updated);
    onClose();
    setNewJuniorPlaylistTitle('');
    try {
      window.dispatchEvent(new CustomEvent('groovelab_playlists_changed', { detail: updated }));
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Neues Musik-Album anlegen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: isLight ? '#ffffff' : '#1e293b',
          borderRadius: '28px',
          maxWidth: '620px',
          width: '100%',
          padding: '28px 30px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Disc size={26} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.28rem',
                  fontWeight: 900,
                  color: colors.textPrimary,
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                Neues Musik-Album anlegen
              </h3>
              <span style={{ fontSize: '0.78rem', color: colors.textSecondary, fontWeight: 600 }}>
                Erstelle eine Sammlung für Konzerte, Familie oder dein Repertoire
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pedagogical Category Tabs */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px'
            }}
          >
            1. Musikalischer Anlass / Kategorie
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.25)',
              padding: '5px',
              borderRadius: '16px'
            }}
          >
            {[
              { id: 'concert_stage', label: 'Bühne & Vorspiel', icon: '🏛️' },
              { id: 'music_gifts', label: 'Musik-Geschenke', icon: '🎁' },
              { id: 'repertoire_growth', label: 'Mein Repertoire', icon: '🎼' }
            ].map((cat) => {
              const isCatChosen = (juniorCoverCategoryFilter === cat.id) || (juniorCoverCategoryFilter === 'all' && cat.id === 'concert_stage');
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setJuniorCoverCategoryFilter(cat.id as any)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isCatChosen ? (isLight ? '#ffffff' : '#334155') : 'transparent',
                    color: isCatChosen ? '#059669' : colors.textSecondary,
                    fontSize: '0.78rem',
                    fontWeight: isCatChosen ? 900 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: isCatChosen ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pedagogical Cover Cards */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px'
            }}
          >
            2. Album-Vorlage wählen (Cover & Thema)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {UNIVERSAL_PLAYLIST_COVERS
              .filter((cov: UniversalPlaylistCoverConfig) => {
                const activeCat = juniorCoverCategoryFilter === 'all' ? 'concert_stage' : juniorCoverCategoryFilter;
                return cov.category === activeCat;
              })
              .map((cov: UniversalPlaylistCoverConfig) => {
                const isChosen = newJuniorPlaylistCover === cov.id;
                return (
                  <div
                    key={cov.id}
                    onClick={() => {
                      setNewJuniorPlaylistCover(cov.id);
                      setNewJuniorPlaylistTitle(cov.defaultTitle);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '18px',
                      border: isChosen ? '2.5px solid #10b981' : `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                      background: isChosen ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.15)') : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.02)'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      boxShadow: isChosen ? '0 6px 18px rgba(16, 185, 129, 0.22)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      minHeight: '68px',
                      boxSizing: 'border-box'
                    }}
                    className="hover-scale"
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: cov.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.18)'
                      }}
                    >
                      <span style={{ fontSize: '1.35rem' }}>{cov.emoji}</span>
                    </div>

                    <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <div
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 850,
                          color: isChosen ? '#047857' : colors.textPrimary,
                          lineHeight: 1.25
                        }}
                      >
                        {cov.defaultTitle}
                      </div>
                      <div
                        style={{
                          fontSize: '0.70rem',
                          color: colors.textSecondary,
                          fontWeight: 600,
                          lineHeight: 1.3,
                          marginTop: '2px'
                        }}
                      >
                        {cov.subTitle}
                      </div>
                    </div>

                    {isChosen && (
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Album Title Input */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px'
            }}
          >
            3. Album-Titel anpassen
          </label>
          <input
            type="text"
            value={newJuniorPlaylistTitle}
            onChange={(e) => setNewJuniorPlaylistTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newJuniorPlaylistTitle.trim()) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="z. B. Mein Sommerkonzert 2026, Geschenk für Oma..."
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: '16px',
              border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
              background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.2)',
              color: colors.textPrimary,
              fontSize: '0.94rem',
              fontWeight: 750,
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '16px',
              border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
              background: 'transparent',
              color: colors.textSecondary,
              fontWeight: 800,
              fontSize: '0.90rem',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!newJuniorPlaylistTitle.trim()}
            onClick={handleCreate}
            style={{
              flex: 1.6,
              padding: '14px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.94rem',
              cursor: newJuniorPlaylistTitle.trim() ? 'pointer' : 'not-allowed',
              opacity: newJuniorPlaylistTitle.trim() ? 1 : 0.5,
              boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            className="hover-scale"
          >
            <span>Album anlegen</span>
            <span>✨</span>
          </button>
        </div>
      </div>
    </div>
  );
};
