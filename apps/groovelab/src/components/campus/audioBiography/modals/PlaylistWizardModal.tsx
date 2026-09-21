import React, { useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { CustomPlaylist, UNIVERSAL_PLAYLIST_COVERS, VIBE_THEMES } from '../types';
import { SpotifyCoverArtwork } from '../views/SpotifyCoverArtwork';

interface PlaylistWizardModalProps {
  onClose: () => void;
  onSavePlaylist: (playlist: Omit<CustomPlaylist, 'id' | 'createdAt' | 'tracks'>) => void;
  isLight: boolean;
  isMobileOrSim?: boolean;
}

export const PlaylistWizardModal: React.FC<PlaylistWizardModalProps> = ({
  onClose,
  onSavePlaylist,
  isLight,
  isMobileOrSim
}) => {
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [wizardDesc, setWizardDesc] = useState<string>('');
  const [showDedicationInput, setShowDedicationInput] = useState<boolean>(false);
  const [wizardTheme, setWizardTheme] = useState<CustomPlaylist['vibeTheme']>('sunset_gold');
  const [wizardIcon, setWizardIcon] = useState<string>('music');
  const [wizardCoverPresetId, setWizardCoverPresetId] = useState<string>('cov_spring_summer_concert');
  const [wizardCoverCategory, setWizardCoverCategory] = useState<'all' | 'kids' | 'urban_vibes' | 'classic_jazz' | 'events_stage'>('all');

  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  const completePlaylistWizard = () => {
    if (!wizardTitle.trim()) {
      alert('Bitte gib einen Namen für deine Playlist ein.');
      return;
    }

    onSavePlaylist({
      title: wizardTitle.trim(),
      description: wizardDesc.trim() || undefined,
      vibeTheme: wizardTheme,
      iconName: wizardIcon,
      coverPresetId: wizardCoverPresetId,
      schoolYear: '2026/2027'
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Playlist Erstellungs-Assistent"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '28px',
        padding: isMobileOrSim ? '20px' : '28px',
        maxWidth: wizardStep === 2 ? '780px' : '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
        transition: 'max-width 0.25s ease'
      }}>
        {/* Apple HIG Header with 2-Segment Progress Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
            {[1, 2].map((stepIdx) => {
              const isDone = wizardStep > stepIdx;
              const isCurrent = wizardStep === stepIdx;
              return (
                <div
                  key={`wizard-progress-${stepIdx}`}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '100px',
                    background: isDone || isCurrent
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                      : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)'),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.70rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669' }}>
                Schritt {wizardStep} von 2
              </div>
              <h3 style={{
                margin: '2px 0 0 0',
                fontSize: isMobileOrSim ? '1.20rem' : '1.35rem',
                fontWeight: 950,
                color: colors.textPrimary,
                letterSpacing: '-0.02em'
              }}>
                {wizardStep === 1 && 'Wie soll deine Playlist heißen?'}
                {wizardStep === 2 && 'Wähle dein Lieblings-Cover'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textSecondary,
                cursor: 'pointer'
              }}
              className="hover-scale"
              aria-label="Schließen"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* STEP 1: TITLE & DESC */}
        {wizardStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 900, color: colors.textSecondary, letterSpacing: '0.02em', marginBottom: '10px' }}>
                Wähle ein Thema oder tippe selbst:
              </span>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: '10px'
              }}>
                {[
                  { id: 'sommer', emoji: '🌸', shortLabel: 'Sommerkonzert', fullTitle: '🌸 Sommerkonzert', theme: 'sunset_gold' as const, icon: 'trophy', desc: 'Vorspielstücke für den Sommer', coverId: 'cov_spring_summer_concert' },
                  { id: 'vorspiel', emoji: '🏛️', shortLabel: 'Klassenvorspiel', fullTitle: '🏛️ Klassenvorspiel', theme: 'forest_emerald' as const, icon: 'award', desc: 'Gemeinsames Vorspielen vor Eltern & Freunden', coverId: 'cov_class_recital' },
                  { id: 'eltern', emoji: '💝', shortLabel: 'Mama & Papa', fullTitle: '💝 Musik-Geschenk für Mama & Papa', theme: 'royal_ruby' as const, icon: 'heart', desc: 'Persönliche Aufnahme für die Eltern', coverId: 'cov_family_gift' },
                  { id: 'geburtstag', emoji: '🎂', shortLabel: 'Geburtstag', fullTitle: '🎂 Geburtstags-Ständchen', theme: 'vintage_tape' as const, icon: 'gift', desc: 'Glückwünsche & Stücke von Herzen', coverId: 'cov_grandparents_birthday' },
                  { id: 'weihnachten', emoji: '🎄', shortLabel: 'Weihnachten', fullTitle: '🎄 Mein Weihnachtsalbum', theme: 'christmas_gold' as const, icon: 'gift', desc: 'Festliche Klänge für Heiligabend', coverId: 'cov_weihnachtskonzert' },
                  { id: 'lieblinge', emoji: '⭐', shortLabel: 'Lieblingsstücke', fullTitle: '⭐ Meine Lieblingsstücke', theme: 'royal_velvet' as const, icon: 'heart', desc: 'Meine aktuellen Lieblingsstücke', coverId: 'cov_masterpieces_stage' }
                ].map((item) => {
                  const isChosen = wizardTitle === item.fullTitle || wizardTitle === item.shortLabel;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setWizardTitle(item.fullTitle);
                        setWizardDesc(item.desc);
                        setWizardTheme(item.theme);
                        setWizardIcon(item.icon);
                        setWizardCoverPresetId(item.coverId);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: isChosen
                          ? '2px solid #10b981'
                          : `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: isChosen
                          ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.16)')
                          : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)'),
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'left'
                      }}
                      className="hover-scale"
                    >
                      <span style={{ fontSize: '1.45rem', flexShrink: 0 }}>{item.emoji}</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 900, color: isChosen ? '#059669' : colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 850, color: colors.textPrimary, marginBottom: '6px' }}>
                  Name deiner Playlist:
                </label>
                <input
                  type="text"
                  placeholder="z. B. Meine besten Songs..."
                  value={wizardTitle}
                  onChange={(e) => setWizardTitle(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 16px',
                    borderRadius: '14px',
                    border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                    background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.3)',
                    color: colors.textPrimary,
                    fontSize: '0.94rem',
                    fontWeight: 750,
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              {!showDedicationInput && !wizardDesc ? (
                <button
                  type="button"
                  onClick={() => setShowDedicationInput(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    color: '#059669',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  + Widmung oder Notiz hinzufügen
                </button>
              ) : (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: colors.textSecondary }}>
                      Widmung oder Notiz (optional):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setWizardDesc('');
                        setShowDedicationInput(false);
                      }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                    >
                      Entfernen
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="z. B. Für Familie & Freunde..."
                    value={wizardDesc}
                    onChange={(e) => setWizardDesc(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '12px',
                      border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)'}`,
                      background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.25)',
                      color: colors.textPrimary,
                      fontSize: '0.86rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!wizardTitle.trim()) {
                  alert('Bitte gib einen Namen für deine Playlist ein.');
                  return;
                }
                setWizardStep(2);
              }}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 950,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px'
              }}
              className="hover-scale"
            >
              <span>Weiter zum Cover</span>
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* STEP 2: COVER GRID */}
        {wizardStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: colors.textSecondary }}>
                Wähle aus kuratierten Cover-Designs für jedes Musikgenre:
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '10px' }}>
                {[
                  { id: 'all', label: 'Alle' },
                  { id: 'kids', label: '👶 Kids' },
                  { id: 'urban_vibes', label: '⚡ Vibes' },
                  { id: 'classic_jazz', label: '🎻 Klassik' },
                  { id: 'events_stage', label: '🎤 Bühne' }
                ].map(cat => {
                  const isCatActive = wizardCoverCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setWizardCoverCategory(cat.id as any)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '100px',
                        border: `1.5px solid ${isCatActive ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)')}`,
                        background: isCatActive ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)') : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                        color: isCatActive ? '#10b981' : colors.textPrimary,
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '12px',
              maxHeight: '380px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {UNIVERSAL_PLAYLIST_COVERS
                .filter(cov => wizardCoverCategory === 'all' || cov.category === wizardCoverCategory)
                .map(cov => {
                  const isChosen = wizardCoverPresetId === cov.id;
                  return (
                    <div
                      key={cov.id}
                      onClick={() => {
                        setWizardCoverPresetId(cov.id);
                        setWizardTheme(cov.vibeTheme);
                        setWizardIcon(cov.iconName);
                      }}
                      style={{
                        borderRadius: '14px',
                        border: `2px solid ${isChosen ? '#10b981' : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)')}`,
                        background: isChosen ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.15)') : (isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.2)'),
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden' }}>
                        <SpotifyCoverArtwork
                          gradient={cov.gradient}
                          accentColor={cov.accentColor}
                          badge={cov.badge}
                          title={cov.defaultTitle}
                          subtitle={cov.subTitle}
                          iconName={cov.iconName}
                          emoji={cov.emoji}
                        />
                        {isChosen && (
                          <div style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid #ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            zIndex: 10
                          }}>
                            <Check size={12} strokeWidth={3.5} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 900, color: isChosen ? '#10b981' : colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cov.defaultTitle}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '100px',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
                  background: 'transparent',
                  color: colors.textPrimary,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={completePlaylistWizard}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <Check size={16} strokeWidth={3} />
                <span>Playlist jetzt erstellen</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
