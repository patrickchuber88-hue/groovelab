import React, { useState } from "react";
import {
  BookOpen,
  Music,
  Sliders,
  RotateCcw,
  Download,
  Star,
  Check,
  X,
  Award,
  ChevronRight,
  Lock
} from "lucide-react";
import Confetti from "react-confetti";
import { isDevEnvironment } from "../../../utils/tenantUrlHelper";
import { ALL_STICKERS } from "../../../domain/stickersAndTresor";
import { getSchoolYearString } from "../studentDateUtils";

export interface MeisterwerkStickerAlbumTabProps {
  isMobileOrSim: boolean;
  readOnly?: boolean;
  isDevSimulationActive: boolean;
  setIsDevSimulationActive: (val: boolean) => void;
  simulateMultiYearProgress: () => void;
  resetStickerAlbum: () => void;
  collectedStickers: Record<string, { count: number; details: any[] }>;
  renderSchoolYearSelector: () => React.ReactNode;
  awardSticker: (stickerId: string, reason?: string) => void;
  awardedStickerToAnimate: any;
  setAwardedStickerToAnimate: (val: any) => void;
  downloadShareCard: (sticker: any, topicName?: string) => void;
  topicName?: string;
  actualStudentName?: string;
  studentInstrument?: string | null;
  shareCard?: (sticker: any, topicOverride?: string) => Promise<void>;
}

export const MeisterwerkStickerAlbumTab: React.FC<MeisterwerkStickerAlbumTabProps> = ({
  isMobileOrSim,
  readOnly,
  isDevSimulationActive,
  setIsDevSimulationActive,
  simulateMultiYearProgress,
  resetStickerAlbum,
  collectedStickers,
  renderSchoolYearSelector,
  awardSticker,
  awardedStickerToAnimate,
  setAwardedStickerToAnimate,
  downloadShareCard,
  topicName,
  actualStudentName,
  studentInstrument,
  shareCard
}) => {
  const [selectedPreviewSticker, setSelectedPreviewSticker] = useState<any | null>(null);
  const [isXpLegendOpen, setIsXpLegendOpen] = useState(false);
  const [stickerCategoryFilter, setStickerCategoryFilter] = useState<'all' | 'milestone' | 'streak' | 'songs' | 'audio' | 'bonus'>('all');
  const [selectedStickerDetailIdx, setSelectedStickerDetailIdx] = useState<number>(0);

  return (
        <div style={{
          flex: 1,
          width: '100%',
          padding: isMobileOrSim ? '20px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px 32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '0',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          {/* Keyframe animations */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes holoShimmer {
              0% { background-position: 0% 0%; }
              50% { background-position: 100% 100%; }
              100% { background-position: 0% 0%; }
            }
            @keyframes stickerGlow {
              0%, 100% { box-shadow: 0 0 15px rgba(52, 168, 83, 0.25); }
              50% { box-shadow: 0 0 28px rgba(52, 168, 83, 0.5); }
            }
            @keyframes peelIn {
              0% { transform: scale(0.7) rotate(-6deg); opacity: 0; }
              70% { transform: scale(1.04) rotate(2deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            .panini-sticker-card {
              transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
              transform-style: preserve-3d;
            }
            .panini-sticker-card:hover {
              transform: translateY(-4px);
            }
            .holo-foil-overlay {
              background: linear-gradient(135deg, 
                rgba(255, 0, 128, 0.25) 0%, 
                rgba(0, 255, 255, 0.25) 25%, 
                rgba(255, 255, 0, 0.25) 50%, 
                rgba(0, 255, 128, 0.25) 75%, 
                rgba(255, 0, 255, 0.25) 100%
              );
              background-size: 300% 300%;
              mix-blend-mode: color-dodge;
              animation: holoShimmer 4s ease infinite;
            }
            .panini-row-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              width: 100%;
            }
            @media (max-width: 1100px) {
              .panini-row-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
              }
            }
            @media (max-width: 580px) {
              .panini-row-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
              }
            }
          `}} />


          {/* SIMULATOR TOGGLE BAR (Dev Mode Only) */}
          {!readOnly && isDevEnvironment() && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '10px 18px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              zIndex: 20,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} color="#64748b" />
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  Entwickler-Modus (Simulation)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={isDevSimulationActive}
                    onChange={(e) => setIsDevSimulationActive(e.target.checked)}
                    style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#34a853' }}
                  />
                  <span>Klick-Vergabe simulieren</span>
                </label>

                <button
                  type="button"
                  onClick={simulateMultiYearProgress}
                  style={{
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                    border: '1px solid #ca8a04',
                    color: '#0f172a',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(234, 179, 8, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <span>🎓 3 Schuljahre simulieren</span>
                </button>

                <button
                  type="button"
                  onClick={resetStickerAlbum}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <RotateCcw size={12} color="#ef4444" />
                  Album leeren
                </button>
              </div>
            </div>
          )}

          {/* ALBUM HEADER & PROGRESS TRACKER HERO BANNER (APPLE SQUIRCLE WHITE STAGE) */}
          {(() => {
            const activeStickerSource = collectedStickers;
            const totalCount = ALL_STICKERS.length;
            const collectedCount = ALL_STICKERS.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
            const percentage = Math.round((collectedCount / totalCount) * 100);

            let rankTitle = '🌱 Rookie-Sammler';
            if (percentage >= 100) rankTitle = '👑 Master Collector';
            else if (percentage >= 75) rankTitle = '🔥 Sammel-Legende';
            else if (percentage >= 50) rankTitle = '⚡ Groove-Profi';
            else if (percentage >= 25) rankTitle = '🎵 Vinyl-Jäger';

            return (
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: isMobileOrSim ? '16px 18px' : '20px 26px',
                color: '#0f172a',
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Subtle soft green aura */}
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '220px',
                  height: '220px',
                  background: 'radial-gradient(circle, rgba(52, 168, 83, 0.08) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 2 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.4rem' }}>🏆</span>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.4px', color: '#0f172a' }}>
                        Sticker Sammelalbum
                      </h2>
                      <span style={{
                        background: '#e6f4ea',
                        border: '1px solid #a7f3d0',
                        color: '#137333',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        letterSpacing: '0.02em'
                      }}>
                        {rankTitle}
                      </span>
                      {renderSchoolYearSelector()}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 600, maxWidth: '520px', lineHeight: '1.4' }}>
                      Sammle XP, erstelle Streaks & meistere Songs, um alle haptischen Sammel-Sticker für dein Musik-Album freizuschalten.
                    </p>
                  </div>

                  {/* Score pill */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '10px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '2px',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#64748b' }}>
                      Sammelfortschritt
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                      <strong style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {collectedCount}
                      </strong>
                      <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 700 }}>
                        / {totalCount} Sticker ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '14px', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #34a853 0%, #4ade80 100%)',
                      borderRadius: '10px',
                      transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* XP LEGENDE TOGGLEABLE PANEL */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            flexShrink: 0
          }}>
            <div 
              onClick={() => setIsXpLegendOpen(!isXpLegendOpen)}
              style={{
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isXpLegendOpen ? '#f8fafc' : 'white',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>🎮</span>
                <strong style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                  XP-Legende & Punkte-Guide
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  (Wie du Punkte & Sticker sammelst)
                </span>
              </div>
              <ChevronRight 
                size={16} 
                color="#64748b" 
                style={{ 
                  transform: isXpLegendOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </div>

            {isXpLegendOpen && (
              <div style={{
                padding: '14px 18px 18px 18px',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>⏱️</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Übe-Fokus</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Pro absolvierte Minute Übezeit erhältst du <strong>1 XP</strong>.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>🎯</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Tägliches Fokus-Ziel</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Tägliches Fokus-Ziel erreicht = <strong>+10 XP</strong> Bonus <em>(z.B. 3m Timer + 1m Extra = 4 XP Übezeit + 10 XP Bonus = 14 XP total)</em>.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>🏆</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Song meistern</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Lied auf 100% oder Stage-Ready = <strong>+50 XP</strong> Bonus.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔥</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Streak-Bonus</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Disziplin-Bonus: 7 Tage = <strong>+25 XP</strong>, 14 Tage = <strong>+50 XP</strong>, 30 Tage = <strong>+100 XP</strong>.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORIES FILTER BAR TABS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '2px 2px 4px 2px',
            flexShrink: 0,
            minHeight: '44px'
          }}>
            {[
              { id: 'all', label: `Alle (${ALL_STICKERS.length})` },
              { id: 'ueben', label: '⏱️ Übe-Fleiß' },
              { id: 'xp', label: '⭐ XP & Stufen' },
              { id: 'streaks', label: '🔥 Streaks' },
              { id: 'songs', label: '🎵 Repertoire' },
              { id: 'spezial', label: '🏆 Spezial' }
            ].map(tab => {
              const isActive = stickerCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStickerCategoryFilter(tab.id as any)}
                  style={{
                    background: isActive ? '#0f172a' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3D PANINI STICKER ALBUM ROWS (GENAU 4 STICKER PRO REIHE • JEDE KATEGORIE EINE REIHE) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
            {[
              { id: 'ueben', title: 'Übe-Fleiß & Zeiterfolge', icon: '⏱️', desc: 'Fokussierte Übezeit am Instrument sammeln' },
              { id: 'xp', title: 'XP & Meilensteine', icon: '⭐', desc: 'Erfahrungspunkte durch Unterricht und Fleiß aufbauen' },
              { id: 'streaks', title: 'Übe-Streaks & Kontinuität', icon: '🔥', desc: 'Tägliche Spielroutine und Beständigkeit meistern' },
              { id: 'songs', title: 'Repertoire & Meisterwerke', icon: '🎵', desc: 'Songs bühnenreif erlernen und Repertoire erweitern' },
              { id: 'spezial', title: 'Spezial-Auszeichnungen & Bühnenreife', icon: '🏆', desc: 'Live-Auftritte, Kreativität und besondere Leistungen' }
            ]
              .filter(cat => stickerCategoryFilter === 'all' || cat.id === stickerCategoryFilter)
              .map(cat => {
                const categoryStickers = ALL_STICKERS.filter(st => st.category === cat.id);
                const activeStickerSource = collectedStickers;
                const catCollectedCount = categoryStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
                const isCatComplete = catCollectedCount === categoryStickers.length;

                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {/* Category Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '0 4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                          {cat.title}
                        </h3>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: isMobileOrSim ? 'none' : 'inline' }}>
                          • {cat.desc}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          background: isCatComplete ? '#e6f4ea' : '#f1f5f9',
                          border: isCatComplete ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                          color: isCatComplete ? '#137333' : '#64748b',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '12px'
                        }}>
                          {catCollectedCount} / {categoryStickers.length} gesammelt {isCatComplete ? '✓' : ''}
                        </span>
                      </div>
                    </div>

                    {/* 4-Column Grid for this category row */}
                    <div className="panini-row-grid">
                      {categoryStickers.map(st => {
                        const info = activeStickerSource[st.id] || { count: 0, details: [] };
                        const isCollected = info.count > 0;
                        const isLegendary = st.rarity === 'legendary';
                        const isEpic = st.rarity === 'epic';
                        const isRare = st.rarity === 'rare';

                        return (
                          <div
                            key={st.id}
                            className="panini-sticker-card"
                            onClick={() => {
                              if (!readOnly && isDevSimulationActive) {
                                awardSticker(st.id, "Simulation");
                              } else {
                                setSelectedPreviewSticker(st);
                              }
                            }}
                            style={{
                              background: isCollected ? '#ffffff' : '#f8fafc',
                              border: isCollected 
                                ? (isLegendary ? '2px solid #eab308' : isEpic ? '2px solid #af52de' : isRare ? '2px solid #3b82f6' : '2px solid #34a853') 
                                : '1.5px dashed #cbd5e1',
                              borderRadius: '20px',
                              padding: '18px 14px 14px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: '10px',
                              position: 'relative',
                              boxShadow: isCollected 
                                ? (isLegendary ? '0 8px 24px -4px rgba(234, 179, 8, 0.22), 0 1px 3px rgba(0,0,0,0.02)' : '0 6px 18px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)') 
                                : 'inset 0 1px 4px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              minHeight: '260px',
                              justifyContent: 'space-between'
                            }}
                          >
                            {/* Holographic foil overlay for legendary/epic stickers */}
                            {isCollected && (isLegendary || isEpic) && (
                              <div 
                                className="holo-foil-overlay" 
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  borderRadius: '18px',
                                  pointerEvents: 'none',
                                  opacity: isLegendary ? 0.35 : 0.2,
                                  zIndex: 1
                                }} 
                              />
                            )}

                            {/* Manual Award Button for Teachers ONLY */}
                            {!readOnly && st.id !== 'song-master' && !st.auto && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const context = prompt(`Beschreibung für den Sticker "${st.title}" eingeben (z.B. Name des Auftritts):`);
                                  if (context !== null) {
                                    awardSticker(st.id, context || undefined);
                                  }
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '12px',
                                  left: '12px',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: st.color,
                                  color: 'white',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                  zIndex: 10,
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem'
                                }}
                                title="Sticker manuell vergeben (Nur für Lehrer)"
                                className="hover-scale"
                              >
                                +
                              </button>
                            )}

                            {/* Rarity Pill Badge */}
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              zIndex: 5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isCollected && st.multi && info.count > 1 && (
                                <span style={{
                                  background: st.color,
                                  color: 'white',
                                  fontWeight: 900,
                                  fontSize: '0.66rem',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                  x{info.count}
                                </span>
                              )}

                              <span style={{
                                background: isCollected 
                                  ? (isLegendary ? '#fef3c7' : isEpic ? '#f3e8ff' : isRare ? '#eff6ff' : '#e6f4ea') 
                                  : '#f1f5f9',
                                color: isCollected 
                                  ? (isLegendary ? '#b45309' : isEpic ? '#7e22ce' : isRare ? '#1d4ed8' : '#137333') 
                                  : '#94a3b8',
                                border: isCollected 
                                  ? (isLegendary ? '1px solid #fde68a' : isEpic ? '1px solid #e9d5ff' : isRare ? '1px solid #bfdbfe' : '1px solid #a7f3d0') 
                                  : '1px solid #e2e8f0',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '8px',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase'
                              }}>
                                {st.rarityLabel || 'Standard'}
                              </span>
                            </div>

                            {/* Top info section: Graphic Badge */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginTop: '10px' }}>
                              {/* BALANCED DIE-CUT STICKER GRAPHIC (100px Diameter) */}
                              <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: isCollected ? st.bg : '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                border: isCollected ? '3.5px solid #ffffff' : '1.5px dashed #cbd5e1',
                                boxShadow: isCollected 
                                  ? '0 6px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.04)' 
                                  : 'inset 0 2px 4px rgba(0,0,0,0.03)',
                                transition: 'all 0.25s ease',
                                zIndex: 2
                              }}>
                                <div style={{
                                  position: 'relative',
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '50%',
                                  overflow: 'hidden'
                                }}>
                                  {/* Emoji Fallback */}
                                  <span style={{ 
                                    fontSize: isCollected ? '2.7rem' : '2.4rem', 
                                    zIndex: 1, 
                                    filter: isCollected ? 'none' : 'grayscale(100%) opacity(0.3)',
                                    userSelect: 'none'
                                  }}>
                                    {st.emoji}
                                  </span>

                                  {/* High-Res PNG Image */}
                                  <img 
                                    src={`/stickers/${st.id}.png?v=1`} 
                                    alt={st.title} 
                                    loading="eager"
                                    decoding="async"
                                    style={{ 
                                      position: 'absolute',
                                      inset: 0,
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      borderRadius: '50%',
                                      zIndex: 2,
                                      filter: isCollected ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))' : 'grayscale(100%) opacity(0.3) blur(1px)',
                                      transition: 'opacity 0.2s ease-in-out'
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.opacity = '0';
                                    }}
                                  />
                                </div>

                                {!isCollected && (
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '50%',
                                    background: 'rgba(241, 245, 249, 0.75)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    fontSize: '1.2rem'
                                  }}>
                                    🔒
                                  </div>
                                )}
                              </div>

                              {/* STICKER TITLE & DESCRIPTION */}
                              <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                                <h4 style={{ 
                                  margin: '0 0 3px 0', 
                                  fontSize: '0.9rem', 
                                  fontWeight: 900, 
                                  color: isCollected ? '#0f172a' : '#64748b' 
                                }}>
                                  {st.title}
                                </h4>
                                <p style={{ 
                                  margin: 0, 
                                  fontSize: '0.72rem', 
                                  color: isCollected ? '#64748b' : '#94a3b8', 
                                  fontWeight: 600, 
                                  lineHeight: '1.3' 
                                }}>
                                  {st.desc}
                                </p>
                              </div>
                            </div>

                            {/* Bottom status / history preview */}
                            <div style={{ width: '100%', zIndex: 2, paddingTop: '6px' }}>
                              {isCollected ? (
                                <div style={{
                                  width: '100%',
                                  borderTop: '1px solid #f1f5f9',
                                  paddingTop: '6px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.66rem',
                                  color: '#34a853',
                                  fontWeight: 750
                                }}>
                                  <span>✓ Freigeschaltet</span>
                                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                                    {st.multi ? `${info.count}x` : (info.details[0]?.date || 'Aktiv')}
                                  </span>
                                </div>
                              ) : (
                                <div style={{
                                  width: '100%',
                                  borderTop: '1px solid #f1f5f9',
                                  paddingTop: '6px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  fontSize: '0.66rem',
                                  color: '#94a3b8',
                                  fontWeight: 600
                                }}>
                                  <span>🔒 Noch gesperrt</span>
                                </div>
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

          {/* BRAND NEW 3D PANINI INSPECTOR & DETAIL MODAL (REPLACING SPOTIFY-WRAPPED) */}
          {selectedPreviewSticker && (() => {
            const st = selectedPreviewSticker;
            const info = collectedStickers[st.id] || { count: 0, details: [] };
            const isCollected = info.count > 0;
            const details = info.details || [];
            
            const activeIdx = (selectedStickerDetailIdx !== null && selectedStickerDetailIdx >= 0 && selectedStickerDetailIdx < details.length)
              ? selectedStickerDetailIdx
              : (details.length > 0 ? details.length - 1 : 0);

            const activeDetail = details[activeIdx];
            const activeTopic = activeDetail?.topic || details.slice(-1)[0]?.topic;
            const displayDate = activeDetail?.date || info.details?.[0]?.date || new Date().toLocaleDateString('de-DE');
            const displayTopic = activeTopic || 'Herausforderung gemeistert';
            const isLegendary = st.rarity === 'legendary';
            const isEpic = st.rarity === 'epic';

            return (
              <div 
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000,
                  padding: '20px',
                  animation: 'fadeIn 0.25s ease-out'
                }} 
                onClick={() => setSelectedPreviewSticker(null)}
              >
                {/* 3D PANINI COLLECTOR'S CARD */}
                <div 
                  style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '32px',
                    border: isLegendary 
                      ? '2.5px solid #eab308' 
                      : isEpic 
                      ? '2.5px solid #af52de' 
                      : '2px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: isLegendary
                      ? '0 25px 60px -12px rgba(234, 179, 8, 0.35)'
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'peelIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Holographic foil overlay inside card modal */}
                  {(isLegendary || isEpic) && (
                    <div 
                      className="holo-foil-overlay" 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '30px',
                        pointerEvents: 'none',
                        opacity: isLegendary ? 0.3 : 0.15
                      }} 
                    />
                  )}

                  {/* Close button */}
                  <button
                    onClick={() => setSelectedPreviewSticker(null)}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      transition: 'all 0.15s',
                      zIndex: 10
                    }}
                    className="hover-scale"
                  >
                    <X size={18} />
                  </button>

                  {/* Header Badge & Rarity Tag with Schuljahr Stamp */}
                  <div style={{ textAlign: 'center', marginTop: '4px', zIndex: 2 }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.12em', 
                      color: isLegendary ? '#facc15' : isEpic ? '#c084fc' : st.color || '#34a853',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '4px 14px',
                      borderRadius: '100px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Star size={12} fill="currentColor" /> {st.rarityLabel || 'Standard'} • Schuljahr {getSchoolYearString(displayDate)}
                    </span>
                    <h3 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '10px 0 0 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
                      {st.title}
                    </h3>
                  </div>

                  {/* XXL STICKER DISPLAY IMAGE (170px) */}
                  <div style={{
                    width: '170px',
                    height: '170px',
                    borderRadius: '50%',
                    background: isCollected ? st.bg : 'rgba(255,255,255,0.05)',
                    border: '5px solid #ffffff',
                    boxShadow: isCollected 
                      ? `0 12px 30px ${st.color}50, 0 0 0 2px rgba(255,255,255,0.8)` 
                      : '0 8px 20px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    margin: '8px 0'
                  }}>
                    <img 
                      src={`/stickers/${st.id}.png?v=1`} 
                      alt={st.title} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        filter: isCollected ? 'none' : 'grayscale(80%) opacity(0.75)'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const span = document.createElement('span');
                          span.style.fontSize = '4.5rem';
                          span.innerText = st.emoji;
                          span.style.filter = isCollected ? 'none' : 'grayscale(80%) opacity(0.5)';
                          parent.appendChild(span);
                        }
                      }}
                    />
                    {!isCollected && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <Lock size={36} color="#facc15" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }} />
                      </div>
                    )}
                  </div>

                  {/* Student Name & Instrument Badge */}
                  <div style={{ textAlign: 'center', width: '100%', zIndex: 2, marginTop: '-4px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                      {actualStudentName}
                    </h2>
                    {studentInstrument && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', display: 'block' }}>
                        {studentInstrument}
                      </span>
                    )}
                  </div>

                  {/* Song Master Interpret & Title Badge (Clean, Non-overloaded Meisterwerk Dedication) */}
                  {(st.category === 'songs' || st.id === 'song-master' || activeTopic) && (
                    <div style={{
                      width: '100%',
                      textAlign: 'center',
                      margin: '4px 0 0 0',
                      zIndex: 2
                    }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Music size={12} color="#facc15" /> Gemeistertes Werk
                      </div>
                      {(() => {
                        const topicStr = activeTopic || (details[0]?.topic) || (isCollected ? 'Song gemeistert' : '');
                        if (!topicStr) return null;
                        
                        if (topicStr.includes(' - ')) {
                          const parts = topicStr.split(' - ');
                          const artist = parts[0].trim();
                          const songTitle = parts.slice(1).join(' - ').trim();
                          return (
                            <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#ffffff', marginTop: '2px', wordBreak: 'break-word', letterSpacing: '-0.02em' }}>
                              <span style={{ color: '#facc15' }}>{artist}</span>
                              <span style={{ opacity: 0.45, margin: '0 6px', fontWeight: 400 }}>–</span>
                              <span>{songTitle}</span>
                            </div>
                          );
                        }
                        return (
                          <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#ffffff', marginTop: '2px', wordBreak: 'break-word', letterSpacing: '-0.02em' }}>
                            {topicStr}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Multi-song Sleek Chip Selector (Modern Glass Pills instead of heavy select box) */}
                  {details.length > 1 && (
                    <div style={{
                      width: '100%',
                      margin: '4px 0 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      zIndex: 3
                    }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {details.length} Songs im Repertoire (Klick zum Wechseln):
                      </span>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '6px',
                        maxWidth: '100%'
                      }}>
                        {details.map((d: any, idx: number) => {
                          const isSel = idx === activeIdx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedStickerDetailIdx(idx)}
                              style={{
                                background: isSel ? 'rgba(250, 204, 21, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                                border: isSel ? '1.5px solid #facc15' : '1px solid rgba(255, 255, 255, 0.12)',
                                color: isSel ? '#facc15' : '#e2e8f0',
                                borderRadius: '100px',
                                padding: '4px 12px',
                                fontSize: '0.74rem',
                                fontWeight: isSel ? 900 : 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease',
                                boxShadow: isSel ? '0 2px 8px rgba(250, 204, 21, 0.25)' : 'none'
                              }}
                              className="hover-scale"
                            >
                              <span>🎵</span>
                              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.topic}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Open, Borderless Description Flow */}
                  <div style={{ 
                    width: '100%', 
                    textAlign: 'center', 
                    padding: '8px 12px', 
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <p style={{ fontSize: '0.94rem', color: '#f8fafc', margin: 0, lineHeight: '1.45', fontWeight: 700 }}>
                      {st.desc}
                    </p>
                    {st.equiv && (
                      <p style={{
                        fontSize: '0.84rem',
                        fontWeight: 650,
                        color: '#38bdf8',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        {st.equiv}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ 
                        fontSize: '0.74rem', 
                        color: isCollected ? '#4ade80' : '#94a3b8', 
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isCollected ? (
                          <>
                            <Check size={13} color="#4ade80" /> Freigeschaltet ({info.count}x gesammelt)
                          </>
                        ) : (
                          <>
                            <Lock size={12} color="#94a3b8" /> {(info as any).progressText || 'Noch nicht freigeschaltet'}
                          </>
                        )}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                      <span style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 900 }}>
                        campus-groovelab.de
                      </span>
                    </div>
                  </div>

                  {/* Collection Timeline Details */}
                  {isCollected && details.length > 0 && (
                    <div style={{ 
                      width: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      maxHeight: '130px', 
                      overflowY: 'auto',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      zIndex: 2
                    }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Erhalten am (Klick zum Auswählen):
                      </span>
                      {details.map((dt: any, dIdx: number) => (
                        <div 
                          key={dIdx} 
                          onClick={() => setSelectedStickerDetailIdx(dIdx)}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: '0.74rem', 
                            color: dIdx === activeIdx ? '#facc15' : '#cbd5e1', 
                            fontWeight: dIdx === activeIdx ? 900 : 600,
                            background: dIdx === activeIdx ? 'rgba(250, 204, 21, 0.18)' : 'transparent',
                            border: dIdx === activeIdx ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid transparent',
                            padding: '6px 10px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                            {dIdx === activeIdx ? '✓ ' : ''}{dt.topic}
                          </span>
                          <span style={{ color: dIdx === activeIdx ? '#facc15' : '#94a3b8' }}>{dt.date}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 2, marginTop: '4px' }}>
                    {isCollected && shareCard && (
                      <button
                        type="button"
                        onClick={() => shareCard(st, activeTopic)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '14px',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        <Download size={18} />
                        <span>Sticker als JPG herunterladen</span>
                      </button>
                    )}

                    {st.id !== 'song-master' && !st.auto && (
                      <button
                        type="button"
                        onClick={() => {
                          const context = prompt(`Beschreibung für den Sticker "${st.title}" eingeben (z.B. Name des Auftritts):`);
                          if (context !== null) {
                            awardSticker(st.id, context || undefined);
                            setSelectedPreviewSticker(null);
                          }
                        }}
                        style={{
                          width: '100%',
                          background: st.color || '#34a853',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        + Sticker jetzt vergeben
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPreviewSticker(null)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#94a3b8',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '12px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STICKER AWARD CELEBRATION ANIMATION POPUP */}
          {awardedStickerToAnimate && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20000,
              animation: 'fadeIn 0.25s ease-out'
            }}>
              <Confetti recycle={false} numberOfPieces={300} />
              <div 
                style={{
                  background: 'white',
                  borderRadius: '32px',
                  padding: '40px',
                  textAlign: 'center',
                  maxWidth: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#34a853', letterSpacing: '0.1em' }}>
                  Sticker freigeschaltet!
                </span>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: awardedStickerToAnimate.bg,
                  border: `6px solid ${awardedStickerToAnimate.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 12px 30px ${awardedStickerToAnimate.bg}`,
                  overflow: 'hidden',
                  animation: 'spinStickerAward 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <img 
                    src={`/stickers/${awardedStickerToAnimate.id}.png?v=1`} 
                    alt={awardedStickerToAnimate.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.style.fontSize = '4.5rem';
                        span.innerText = awardedStickerToAnimate.emoji;
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    {awardedStickerToAnimate.title}
                  </h2>
                  {(awardedStickerToAnimate.category === 'songs' || awardedStickerToAnimate.id === 'song-master' || topicName) && (
                    <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Music size={12} /> Interpret &amp; Songtitel
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                        {topicName || 'Song gemeistert'}
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 650, margin: 0, lineHeight: 1.35 }}>
                    {awardedStickerToAnimate.desc}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => downloadShareCard(awardedStickerToAnimate, topicName)}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '14px 24px',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    <Download size={18} />
                    <span>Sticker als JPG herunterladen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAwardedStickerToAnimate(null)}
                    style={{
                      background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 24px',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
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
            </div>
          )}


        </div>
  );
};
