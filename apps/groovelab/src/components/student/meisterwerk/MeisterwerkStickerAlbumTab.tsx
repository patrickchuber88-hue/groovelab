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
  Lock,
  Trophy,
  Compass,
  Clock,
  Sparkles,
  Flame,
  Target,
  Archive,
  Building2,
  GraduationCap
} from "lucide-react";
import Confetti from "react-confetti";
import { isDevEnvironment } from "../../../utils/tenantUrlHelper";
import { ALL_STICKERS, calculateCampusSchoolYearNumber } from "../../../domain/stickersAndTresor";
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
  selectedSchoolYear?: string;
  currentSchoolYear?: string;
  student?: any;
  schoolName?: string;
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
  shareCard,
  selectedSchoolYear,
  currentSchoolYear,
  student,
  schoolName
}) => {
  const [activeAlbumView, setActiveAlbumView] = useState<'season' | 'journey'>('season');
  const [selectedPreviewSticker, setSelectedPreviewSticker] = useState<any | null>(null);
  const [isXpLegendOpen, setIsXpLegendOpen] = useState(false);
  const [stickerCategoryFilter, setStickerCategoryFilter] = useState<'all' | 'ueben' | 'xp' | 'streaks' | 'songs' | 'spezial'>('all');
  const [selectedStickerDetailIdx, setSelectedStickerDetailIdx] = useState<number>(0);

  const effectiveSchoolName = (() => {
    const candidates = [
      schoolName,
      student?.school_name,
      student?.school?.name,
      Array.isArray(student?.schools) ? student?.schools[0]?.name : null,
      typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name')) : null
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        const trimmed = c.trim();
        if (trimmed && trimmed !== 'Campus-Groovelab' && trimmed.toLowerCase() !== 'musikschule' && trimmed !== 'Campus-Groovelab Musikschule') {
          return trimmed;
        }
      }
    }
    return 'Campus-Groovelab Partner-Musikschule';
  })();

  // 🛡️ Deterministische Zählung: Ausbildungsjahre werden STRIKT ab Registrierungsdatum des Benutzers berechnet
  const schoolYearNum = (() => {
    const regDateStr = student?.activated_at || student?.created_at || (student as any)?.registered_at;
    return calculateCampusSchoolYearNumber(regDateStr, selectedSchoolYear || currentSchoolYear);
  })();

  const cycleYear = ((schoolYearNum - 1) % 15) + 1;
  const completedCycles = Math.floor((schoolYearNum - 1) / 15);
  const currentCoverStickerId = `schuljahr-${cycleYear}`;
  const currentCoverSticker = ALL_STICKERS.find(s => s.id === currentCoverStickerId);

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
            @keyframes activeMilestoneBreathingGlow {
              0%, 100% {
                box-shadow: 0 8px 24px -4px rgba(234, 179, 8, 0.28), 0 0 0 1.5px rgba(234, 179, 8, 0.5);
                transform: translateY(0);
              }
              50% {
                box-shadow: 0 12px 32px -2px rgba(234, 179, 8, 0.42), 0 0 0 3px rgba(234, 179, 8, 0.85);
                transform: translateY(-2px);
              }
            }
            @keyframes vinylPeelSpring {
              0% { transform: scale(0.7) rotate(-7deg); opacity: 0; }
              65% { transform: scale(1.05) rotate(2deg); }
              85% { transform: scale(0.98) rotate(-1deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            .active-milestone-card {
              animation: activeMilestoneBreathingGlow 3.5s ease-in-out infinite !important;
            }
            .collector-sticker-card {
              transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
              transform-style: preserve-3d;
            }
            .collector-sticker-card:hover {
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
            .collector-row-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              width: 100%;
            }
            @media (max-width: 1100px) {
              .collector-row-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
              }
            }
            @media (max-width: 580px) {
              .collector-row-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
              }
            }
            .journey-3x3-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 18px;
              width: 100%;
            }
            @media (max-width: 960px) {
              .journey-3x3-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
              }
            }
            @media (max-width: 600px) {
              .journey-3x3-grid {
                grid-template-columns: 1fr;
                gap: 12px;
              }
            }
            .hall-of-fame-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 18px;
              width: 100%;
            }
            @media (max-width: 960px) {
              .hall-of-fame-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
              }
            }
            @media (max-width: 600px) {
              .hall-of-fame-grid {
                grid-template-columns: 1fr;
                gap: 12px;
              }
            }
          `}} />

          {/* ERGONOMIC MASTER CONTAINER (MAX-WIDTH: 1140PX ZENTRIERT • PREVENTS WIDESCREEN STRETCH) */}
          <div style={{
            maxWidth: '1140px',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box'
          }}>


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

          {/* SUB-TAB VIEW SWITCHER (SAISON-ALBUM VS. MEINE CAMPUS-JAHRE) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            width: '100%',
            zIndex: 10
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#e2e8f0',
              borderRadius: '24px',
              padding: '4px',
              gap: '4px',
              width: isMobileOrSim ? '100%' : 'fit-content',
              boxSizing: 'border-box'
            }}>
              <button
                type="button"
                onClick={() => setActiveAlbumView('season')}
                style={{
                  flex: isMobileOrSim ? 1 : 'initial',
                  background: activeAlbumView === 'season' ? '#ffffff' : 'transparent',
                  color: activeAlbumView === 'season' ? '#0f172a' : '#64748b',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: activeAlbumView === 'season' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <Trophy size={16} strokeWidth={2.2} color={activeAlbumView === 'season' ? '#16a34a' : '#64748b'} />
                <span>Saison-Album (20 Meilensteine)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAlbumView('journey')}
                style={{
                  flex: isMobileOrSim ? 1 : 'initial',
                  background: activeAlbumView === 'journey' ? '#ffffff' : 'transparent',
                  color: activeAlbumView === 'journey' ? '#0f172a' : '#64748b',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: activeAlbumView === 'journey' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <Compass size={16} strokeWidth={2.2} color={activeAlbumView === 'journey' ? '#d97706' : '#64748b'} />
                <span>Meine Campus-Jahre (Klangreise)</span>
                <span style={{
                  background: activeAlbumView === 'journey' ? '#0f172a' : '#cbd5e1',
                  color: activeAlbumView === 'journey' ? '#facc15' : '#1e293b',
                  fontSize: '0.66rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 900
                }}>
                  {schoolYearNum}. Jahr
                </span>
              </button>
            </div>
          </div>

          {/* VIEW 1: SAISON-ALBUM (EXACTLY 20 MEILENSTEINE • KINDGERECHT & AUFGERÄUMT) */}
          {activeAlbumView === 'season' && (() => {
            const activeStickerSource = collectedStickers;
            // Seasonal milestone collection (20 core milestone stickers, strictly excluding schuljahr)
            const seasonalStickers = ALL_STICKERS.filter(st => st.category !== 'schuljahr');
            const totalSeasonalCount = seasonalStickers.length; // 20
            const collectedSeasonalCount = seasonalStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
            const percentage = Math.round((collectedSeasonalCount / totalSeasonalCount) * 100);

            let rankTitle = '🌱 Rookie-Sammler';
            if (percentage >= 100) rankTitle = '👑 Meister-Album vollendet';
            else if (percentage >= 75) rankTitle = '🔥 Sammel-Legende';
            else if (percentage >= 50) rankTitle = '⚡ Groove-Profi';
            else if (percentage >= 25) rankTitle = '🎵 Klang-Pionier';

            const isArchived = Boolean(selectedSchoolYear && currentSchoolYear && selectedSchoolYear !== currentSchoolYear);

            return (
              <>
                {/* ALBUM HEADER & PROGRESS TRACKER HERO BANNER */}
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
                        <Trophy size={22} color="#16a34a" strokeWidth={2.2} />
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
                        Sammle XP, erstelle Streaks & meistere Songs, um alle 20 Saison-Meilensteine für dein Musik-Album freizuschalten.
                      </p>
                    </div>

                    {/* Right side: Cover Crest & Score Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Album Cover Crest / Wappen for current school year */}
                      {currentCoverSticker && (
                        <div
                          onClick={() => setSelectedPreviewSticker(currentCoverSticker)}
                          title="Klicke hier, um dein Campus-Jahreswappen im Detail zu betrachten"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: currentCoverSticker.bg || '#e0f2fe',
                            border: `2px solid ${currentCoverSticker.color || '#0284c7'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                          }}>
                            <span style={{ fontSize: '1.4rem', userSelect: 'none' }}>{currentCoverSticker.emoji}</span>
                            <img
                              src={`/stickers/${currentCoverSticker.id}.png?v=1`}
                              alt={currentCoverSticker.title}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.06em' }}>
                                Cover-Wappen #{cycleYear}/15
                              </span>
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                background: '#e6f4ea',
                                color: '#137333',
                                padding: '1px 5px',
                                borderRadius: '6px'
                              }}>
                                {schoolYearNum}. Campus-Jahr
                              </span>
                            </div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                              {currentCoverSticker.title}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAlbumView('journey');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0284c7',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 0 0 0',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Compass size={12} strokeWidth={2.2} />
                              <span>Zur Klangreise →</span>
                            </button>
                          </div>
                        </div>
                      )}

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
                          Saison-Fortschritt
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                          <strong style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                            {collectedSeasonalCount}
                          </strong>
                          <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 700 }}>
                            / {totalSeasonalCount} Sticker ({percentage}%)
                          </span>
                        </div>
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

                {/* ARCHIVE SEAL BANNER (WHEN BROWSING PAST SCHOOL YEARS) */}
                {isArchived && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                    border: '1.5px solid #fde047',
                    borderRadius: '18px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(234, 179, 8, 0.08)',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Archive size={20} color="#854d0e" />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#854d0e' }}>
                          Archiv-Ansicht: Schuljahr {selectedSchoolYear} (Versiegelt)
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 650, color: '#a16207' }}>
                          Historischer Sammelstand dieses Schuljahres. Meilensteine und Meisterschafts-Sticker sind unveränderlich archiviert.
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: '#ffffff',
                      border: '1px solid #fde047',
                      color: '#854d0e',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      padding: '4px 12px',
                      borderRadius: '20px',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Lock size={12} /> Versiegelt
                    </span>
                  </div>
                )}

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
                      <Sparkles size={16} color="#64748b" />
                      <strong style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                        XP-Legende &amp; Punkte-Guide
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        (Wie du Punkte &amp; Sticker sammelst)
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
                        <Clock size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Übe-Fokus</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Pro absolvierte Minute Übezeit erhältst du <strong>1 XP</strong>.</span>
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Target size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Tägliches Fokus-Ziel</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Tägliches Fokus-Ziel erreicht = <strong>+10 XP</strong> Bonus.</span>
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Trophy size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Song meistern</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Lied auf 100% oder Stage-Ready = <strong>+50 XP</strong> Bonus.</span>
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Flame size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Streak-Bonus</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Disziplin-Bonus: 7 Tage = <strong>+25 XP</strong>, 14 Tage = <strong>+50 XP</strong>, 30 Tage = <strong>+100 XP</strong>.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CATEGORIES FILTER BAR TABS (SAISON-ALBUM: 20 MEILENSTEINE • MONOCHROME LUCIDE ICONS) */}
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
                    { id: 'all', label: 'Alle (20 Meilensteine)', icon: Trophy },
                    { id: 'ueben', label: 'Übe-Fleiß', icon: Clock },
                    { id: 'xp', label: 'XP & Stufen', icon: Sparkles },
                    { id: 'streaks', label: 'Streaks', icon: Flame },
                    { id: 'songs', label: 'Repertoire', icon: Music },
                    { id: 'spezial', label: 'Spezial', icon: Award }
                  ].map(tab => {
                    const isActive = stickerCategoryFilter === tab.id;
                    const TabIcon = tab.icon;
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
                        <TabIcon size={14} strokeWidth={2.2} color={isActive ? '#ffffff' : '#64748b'} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 3D MEISTERWERK STICKER ALBUM ROWS (GENAU 4 STICKER PRO REIHE • JEDE KATEGORIE EINE REIHE • TOTAL 20) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
                  {[
                    { id: 'ueben', title: 'Übe-Fleiß & Zeiterfolge', icon: Clock, iconColor: '#0284c7', desc: 'Fokussierte Übezeit am Instrument sammeln' },
                    { id: 'xp', title: 'XP & Meilensteine', icon: Sparkles, iconColor: '#eab308', desc: 'Erfahrungspunkte durch Unterricht und Fleiß aufbauen' },
                    { id: 'streaks', title: 'Übe-Streaks & Kontinuität', icon: Flame, iconColor: '#ef4444', desc: 'Tägliche Spielroutine und Beständigkeit meistern' },
                    { id: 'songs', title: 'Repertoire & Meisterwerke', icon: Music, iconColor: '#8b5cf6', desc: 'Songs bühnenreif erlernen und Repertoire erweitern' },
                    { id: 'spezial', title: 'Spezial-Auszeichnungen & Bühnenreife', icon: Award, iconColor: '#34a853', desc: 'Live-Auftritte, Kreativität und besondere Leistungen' }
                  ]
                    .filter(cat => stickerCategoryFilter === 'all' || cat.id === stickerCategoryFilter)
                    .map(cat => {
                      const categoryStickers = ALL_STICKERS.filter(st => st.category === cat.id);
                      const catCollectedCount = categoryStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
                      const isCatComplete = catCollectedCount === categoryStickers.length;
                      const CatIcon = cat.icon;

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
                              <CatIcon size={18} color={cat.iconColor} strokeWidth={2.2} />
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
                          <div className="collector-row-grid">
                            {categoryStickers.map(st => {
                              const info = activeStickerSource[st.id] || { count: 0, details: [] };
                              const isCollected = info.count > 0;
                              const isLegendary = st.rarity === 'legendary';
                              const isEpic = st.rarity === 'epic';
                              const isRare = st.rarity === 'rare';

                              return (
                                <div
                                  key={st.id}
                                  className="collector-sticker-card"
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
                                          color: '#94a3b8'
                                        }}>
                                          <Lock size={20} color="#94a3b8" />
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
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          <Check size={12} strokeWidth={2.5} /> Freigeschaltet
                                        </span>
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
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          <Lock size={12} /> Noch gesperrt
                                        </span>
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
              </>
            );
          })()}

          {/* VIEW 2: CAMPUS-EHRENHALLE (3X3 BASIS-ALBUM + PROGRESSIVE HALL OF FAME) */}
          {activeAlbumView === 'journey' && (() => {
            const activeStickerSource = collectedStickers;
            const campusStickers = ALL_STICKERS.filter(st => st.category === 'schuljahr');
            const unlockedCampusCount = campusStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;

            // 3x3 Basis-Album (Campus-Jahre 1 bis 9)
            const basisStickers = campusStickers.slice(0, 9);
            // Progressive Hall of Fame & Legenden-Grad (Campus-Jahre 10 bis 15)
            const legendStickers = campusStickers.slice(9, 15);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
                {/* JOURNEY HERO BANNER */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: isMobileOrSim ? '20px 18px' : '26px 32px',
                  color: '#0f172a',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Subtle soft amber-gold glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '260px',
                    height: '260px',
                    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    borderRadius: '50%'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
                    <div style={{ maxWidth: '640px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '14px',
                          background: '#fef9c3',
                          border: '1.5px solid #fde047',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Compass size={22} color="#ca8a04" strokeWidth={2.2} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.4px', color: '#0f172a' }}>
                              Meine Campus-Jahre
                            </h2>
                            <span style={{
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              color: '#92400e',
                              fontSize: '0.74rem',
                              fontWeight: 900,
                              padding: '3px 10px',
                              borderRadius: '20px'
                            }}>
                              3×3 Basis-Album + Hall of Fame
                            </span>
                            {completedCycles > 0 && (
                              <span style={{
                                background: '#ede9fe',
                                border: '1px solid #ddd6fe',
                                color: '#6d28d9',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                padding: '3px 10px',
                                borderRadius: '20px'
                              }}>
                                👑 Meisterzyklus #{completedCycles + 1}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 600, lineHeight: '1.45' }}>
                            Für jedes aktive Schuljahr auf Campus-Groovelab erhältst du dein exklusives Ausbildungs-Wappen. Deine gesammelten Wappen begleiten dich deine gesamte musikalische Laufbahn – unabhängig von deinem Alter oder Einstiegszeitpunkt!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right side stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '18px',
                        padding: '12px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#64748b' }}>
                          Aktive Stufe
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                          <strong style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                            {schoolYearNum}. Campus-Jahr
                          </strong>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 750 }}>
                          #{String(cycleYear).padStart(2, '0')}/15 Wappen aktiv
                        </span>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '18px',
                        padding: '12px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#64748b' }}>
                          Reise-Fortschritt
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                          <strong style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                            {unlockedCampusCount}
                          </strong>
                          <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 700 }}>
                            / 15 Wappen ({Math.round((unlockedCampusCount / 15) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 15-Year Progress Bar */}
                  <div style={{ marginTop: '16px', position: 'relative', zIndex: 2 }}>
                    <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.round((unlockedCampusCount / 15) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 30%, #8b5cf6 60%, #eab308 100%)',
                        borderRadius: '10px',
                        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.68rem', fontWeight: 750, color: '#64748b' }}>
                      <span>🎒 Start (1. Jahr)</span>
                      <span>⚡ 5. Jahr (Jubiläum)</span>
                      <span>🎓 8. Jahr (Diplom-Grad)</span>
                      <span>👑 10. Jahr (Dekade)</span>
                      <span>🏆 15. Jahr (Kaiserkrone)</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: DAS 3X3 BASIS-ALBUM (CAMPUS-JAHRE 1 BIS 9) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GraduationCap size={22} color="#0284c7" strokeWidth={2.2} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: '#ecfeff',
                            border: '1px solid #a5f3fc',
                            color: '#0891b2',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            Basis-Stufen 1 – 9
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: '#0f172a' }}>
                            Musikalische Grundausbildung &amp; Diplomzyklus
                          </h3>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          Von den ersten Tönen und Entdeckerjahren bis zum offiziellen Campus-Diplomgrad (8 Jahre) und Ensemble-Führung.
                        </p>
                      </div>
                    </div>

                    <span style={{
                      background: basisStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length === 9 ? '#e6f4ea' : '#f1f5f9',
                      border: basisStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length === 9 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      color: basisStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length === 9 ? '#137333' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {basisStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length} / 9 Wappen
                    </span>
                  </div>

                  {/* 3x3 GRID (GENAU 9 STICKER IN 3 REIHEN) */}
                  <div className="journey-3x3-grid">
                    {basisStickers.map((st, idx) => {
                      const info = activeStickerSource[st.id] || { count: 0, details: [] };
                      const isCollected = info.count > 0;
                      const isCurrentYear = st.id === currentCoverStickerId;
                      const targetYear = idx + 1;
                      const isLegendary = st.rarity === 'legendary';
                      const isEpic = st.rarity === 'epic';

                      return (
                        <div
                          key={st.id}
                          className={`collector-sticker-card ${isCurrentYear ? 'active-milestone-card' : ''}`}
                          onClick={() => setSelectedPreviewSticker(st)}
                          style={{
                            background: isCollected ? '#ffffff' : '#f8fafc',
                            border: isCurrentYear
                              ? '2.5px solid #eab308'
                              : isCollected
                              ? `2px solid ${st.color || '#34a853'}`
                              : '1.5px dashed #cbd5e1',
                            borderRadius: '22px',
                            padding: '18px 16px 14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '10px',
                            position: 'relative',
                            boxShadow: isCurrentYear
                              ? '0 10px 28px -4px rgba(234, 179, 8, 0.28), 0 0 0 1px rgba(234, 179, 8, 0.4)'
                              : isCollected
                              ? '0 6px 18px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)'
                              : 'inset 0 1px 4px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            minHeight: '290px',
                            justifyContent: 'space-between'
                          }}
                        >
                          {/* Holographic foil overlay */}
                          {isCollected && (isLegendary || isEpic) && (
                            <div 
                              className="holo-foil-overlay" 
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '20px',
                                pointerEvents: 'none',
                                opacity: isLegendary ? 0.35 : 0.2,
                                zIndex: 1
                              }} 
                            />
                          )}

                          {/* Top Bar: Sequence Number & Status Pill */}
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 5
                          }}>
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              color: '#64748b',
                              letterSpacing: '0.06em'
                            }}>
                              #{String(targetYear).padStart(2, '0')}/09
                            </span>

                            <span style={{
                              background: isCurrentYear
                                ? '#fef3c7'
                                : isCollected
                                ? '#e6f4ea'
                                : '#f1f5f9',
                              color: isCurrentYear
                                ? '#92400e'
                                : isCollected
                                ? '#137333'
                                : '#94a3b8',
                              border: isCurrentYear
                                ? '1px solid #fde68a'
                                : isCollected
                                ? '1px solid #a7f3d0'
                                : '1px solid #e2e8f0',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isCurrentYear ? (
                                <>
                                  <Star size={11} fill="currentColor" color="#d97706" /> Aktives Schuljahr
                                </>
                              ) : isCollected ? (
                                <>
                                  <Check size={11} strokeWidth={2.5} /> Freigeschaltet
                                </>
                              ) : (
                                <>
                                  <Lock size={11} /> Gesperrt
                                </>
                              )}
                            </span>
                          </div>

                          {/* Center Graphic Badge (110px Die-Cut Vinyl Sticker) */}
                          <div style={{
                            width: '110px',
                            height: '110px',
                            borderRadius: '50%',
                            background: isCollected ? (st.bg || '#f0fdf4') : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            border: isCollected ? '3.5px solid #ffffff' : '1.5px dashed #cbd5e1',
                            boxShadow: isCollected 
                              ? (isCurrentYear ? '0 8px 24px rgba(234, 179, 8, 0.35), 0 0 0 1px rgba(234,179,8,0.3)' : '0 6px 18px rgba(0, 0, 0, 0.1)') 
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
                              <span style={{ 
                                fontSize: isCollected ? '3rem' : '2.6rem', 
                                zIndex: 1, 
                                filter: isCollected ? 'none' : 'grayscale(100%) opacity(0.3)',
                                userSelect: 'none'
                              }}>
                                {st.emoji}
                              </span>

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
                                  filter: isCollected ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' : 'grayscale(100%) opacity(0.28) blur(1px)',
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
                                color: '#94a3b8'
                              }}>
                                <Lock size={22} color="#94a3b8" />
                              </div>
                            )}
                          </div>

                          {/* Title & Description */}
                          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                            <h4 style={{ 
                              margin: '0 0 3px 0', 
                              fontSize: '0.94rem', 
                              fontWeight: 900, 
                              color: isCollected ? '#0f172a' : '#64748b' 
                            }}>
                              {st.title}
                            </h4>
                            <p style={{ 
                              margin: '0 0 4px 0', 
                              fontSize: '0.74rem', 
                              color: isCollected ? '#475569' : '#94a3b8', 
                              fontWeight: 650, 
                              lineHeight: '1.35' 
                            }}>
                              {st.desc}
                            </p>
                            {st.equiv && (
                              <p style={{
                                margin: 0,
                                fontSize: '0.70rem',
                                color: '#0284c7',
                                fontWeight: 700,
                                lineHeight: '1.3'
                              }}>
                                {st.equiv}
                              </p>
                            )}
                          </div>

                          {/* Bottom Footer Status */}
                          <div style={{ width: '100%', zIndex: 2, paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              color: isCurrentYear ? '#d97706' : isCollected ? '#34a853' : '#94a3b8'
                            }}>
                              {isCurrentYear 
                                ? '🎒 Dein aktives Campus-Wappen'
                                : isCollected 
                                ? `✓ Im ${targetYear}. Campus-Schuljahr erhalten` 
                                : `🔒 Freischaltung im ${targetYear}. Campus-Jahr`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 2: 🏛️ GROSSE HALL OF FAME & LEGENDEN-KAMMER (STUFEN 10 BIS 15+) */}
                <div style={{
                  background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                  borderRadius: '26px',
                  padding: isMobileOrSim ? '20px 16px' : '28px 30px',
                  border: '2px solid rgba(234, 179, 8, 0.4)',
                  boxShadow: '0 16px 36px -8px rgba(15, 23, 42, 0.4), 0 0 24px rgba(234, 179, 8, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Subtle top gold aura */}
                  <div style={{
                    position: 'absolute',
                    top: '-60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '380px',
                    height: '180px',
                    background: 'radial-gradient(ellipse, rgba(234, 179, 8, 0.22) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }} />

                  {/* Hall of Fame Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '16px',
                        background: 'rgba(234, 179, 8, 0.15)',
                        border: '1.5px solid #facc15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Award size={24} color="#facc15" strokeWidth={2.2} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: '#ffffff', letterSpacing: '-0.3px' }}>
                            Große Hall of Fame &amp; Legenden-Kammer
                          </h3>
                          <span style={{
                            background: 'rgba(234, 179, 8, 0.2)',
                            border: '1px solid #facc15',
                            color: '#facc15',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 9px',
                            borderRadius: '20px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em'
                          }}>
                            10+ Jahre Musikkultur
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#94a3b8', fontWeight: 600, maxWidth: '640px', lineHeight: '1.4' }}>
                          Ab dem 10. Campus-Jahr betrittst du die unvergängliche Legenden-Klasse. Höchste Meister-Wappen für jahrzehntelange Hingabe und lebenslange musikalische Identität – ohne Verfallsdatum und ohne künstlichen Abschluss!
                        </p>
                      </div>
                    </div>

                    <span style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '6px 14px',
                      borderRadius: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      👑 {legendStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length} / 6 Legenden aktiv
                    </span>
                  </div>

                  {/* Hall of Fame Grid (6 Legenden-Stufen 10–15) */}
                  <div className="hall-of-fame-grid" style={{ position: 'relative', zIndex: 2 }}>
                    {legendStickers.map((st, idx) => {
                      const info = activeStickerSource[st.id] || { count: 0, details: [] };
                      const isCollected = info.count > 0;
                      const isCurrentYear = st.id === currentCoverStickerId;
                      const targetYear = idx + 10;

                      return (
                        <div
                          key={st.id}
                          className={`collector-sticker-card ${isCurrentYear ? 'active-milestone-card' : ''}`}
                          onClick={() => setSelectedPreviewSticker(st)}
                          style={{
                            background: isCollected ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.55)',
                            border: isCurrentYear 
                              ? '2px solid #facc15' 
                              : isCollected 
                              ? '2px solid #eab308' 
                              : '1.5px dashed rgba(234, 179, 8, 0.35)',
                            borderRadius: '22px',
                            padding: '18px 16px 14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '10px',
                            position: 'relative',
                            boxShadow: isCollected 
                              ? '0 10px 28px -4px rgba(234, 179, 8, 0.25)' 
                              : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            minHeight: '290px',
                            justifyContent: 'space-between'
                          }}
                        >
                          {/* Holo Foil for Unlocked Legends */}
                          {isCollected && (
                            <div 
                              className="holo-foil-overlay" 
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '20px',
                                pointerEvents: 'none',
                                opacity: 0.3,
                                zIndex: 1
                              }} 
                            />
                          )}

                          {/* Top Bar */}
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 5
                          }}>
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              color: '#facc15',
                              letterSpacing: '0.06em'
                            }}>
                              STUFE #{targetYear}
                            </span>

                            <span style={{
                              background: isCurrentYear 
                                ? '#facc15' 
                                : isCollected 
                                ? 'rgba(52, 168, 83, 0.25)' 
                                : 'rgba(255, 255, 255, 0.08)',
                              color: isCurrentYear 
                                ? '#0f172a' 
                                : isCollected 
                                ? '#4ade80' 
                                : '#94a3b8',
                              border: isCurrentYear
                                ? '1px solid #ca8a04'
                                : isCollected
                                ? '1px solid rgba(74, 222, 128, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.12)',
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isCurrentYear ? (
                                <>
                                  <Star size={11} fill="currentColor" /> Aktives Schuljahr
                                </>
                              ) : isCollected ? (
                                <>
                                  <Check size={11} strokeWidth={2.5} /> Freigeschaltet
                                </>
                              ) : (
                                <>
                                  <Lock size={11} /> Gesperrt
                                </>
                              )}
                            </span>
                          </div>

                          {/* Center 110px Die-Cut Vinyl Sticker */}
                          <div style={{
                            width: '110px',
                            height: '110px',
                            borderRadius: '50%',
                            background: isCollected ? st.bg : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            border: isCollected ? '3.5px solid #ffffff' : '1.5px dashed rgba(234, 179, 8, 0.3)',
                            boxShadow: isCollected 
                              ? '0 8px 24px rgba(234, 179, 8, 0.35)' 
                              : 'none',
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
                              <span style={{ 
                                fontSize: isCollected ? '3rem' : '2.6rem', 
                                zIndex: 1, 
                                filter: isCollected ? 'none' : 'grayscale(100%) opacity(0.3)',
                                userSelect: 'none'
                              }}>
                                {st.emoji}
                              </span>

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
                                  filter: isCollected ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' : 'grayscale(100%) opacity(0.28) blur(1px)',
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
                                background: 'rgba(15, 23, 42, 0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#facc15'
                              }}>
                                <Lock size={22} color="#facc15" />
                              </div>
                            )}
                          </div>

                          {/* Title & Description */}
                          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                            <h4 style={{ 
                              margin: '0 0 3px 0', 
                              fontSize: '0.94rem', 
                              fontWeight: 900, 
                              color: isCollected ? '#ffffff' : '#94a3b8' 
                            }}>
                              {st.title}
                            </h4>
                            <p style={{ 
                              margin: '0 0 4px 0', 
                              fontSize: '0.74rem', 
                              color: isCollected ? '#cbd5e1' : '#64748b', 
                              fontWeight: 650, 
                              lineHeight: '1.35' 
                            }}>
                              {st.desc}
                            </p>
                            {st.equiv && (
                              <p style={{
                                margin: 0,
                                fontSize: '0.70rem',
                                color: '#38bdf8',
                                fontWeight: 700,
                                lineHeight: '1.3'
                              }}>
                                {st.equiv}
                              </p>
                            )}
                          </div>

                          {/* Bottom Footer Status */}
                          <div style={{ width: '100%', zIndex: 2, paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              color: isCurrentYear ? '#facc15' : isCollected ? '#4ade80' : '#64748b'
                            }}>
                              {isCurrentYear 
                                ? '👑 Dein aktives Legenden-Wappen'
                                : isCollected 
                                ? `✓ Im ${targetYear}. Campus-Schuljahr erobert` 
                                : `🔒 Freischaltung im ${targetYear}. Campus-Jahr`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* INFINITE HORIZON TIER CARD (STUFE 16+ LEBENSLANGE MUSIKKULTUR) */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1.5px dashed rgba(234, 179, 8, 0.5)',
                    borderRadius: '20px',
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.1) 100%)',
                        border: '2px solid #facc15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        color: '#facc15',
                        boxShadow: '0 0 16px rgba(234, 179, 8, 0.25)'
                      }}>
                        ∞
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: 'rgba(234, 179, 8, 0.2)',
                            color: '#facc15',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            textTransform: 'uppercase'
                          }}>
                            Unendlicher Horizont
                          </span>
                          <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: '#ffffff' }}>
                            Stufe 16+ Lebenslange Musikkultur
                          </h4>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                          Musizieren endet nie. Deine Campus-Reise begleitet dich ein ganzes Leben lang. Jeder weitere Meilenstein wird automatisch in deiner Chronik verewigt!
                        </p>
                      </div>
                    </div>

                    <span style={{
                      background: 'rgba(250, 204, 21, 0.15)',
                      border: '1px solid #facc15',
                      color: '#facc15',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '6px 14px',
                      borderRadius: '14px',
                      whiteSpace: 'nowrap'
                    }}>
                      ✨ Grenzenlose Klangkultur
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CLOSE ERGONOMIC MASTER CONTAINER (MAX-WIDTH: 1140PX) */}
          </div>


          {/* 3D STICKER INSPECTOR & DETAIL MODAL */}
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
                {/* 3D COLLECTOR CARD */}
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
                      <Star size={12} fill="currentColor" /> {st.rarityLabel || 'Standard'} • {st.category === 'schuljahr' ? `Ausbildungsstufe #${st.id.replace('schuljahr-', '').padStart(2, '0')}/15` : `Schuljahr ${selectedSchoolYear || getSchoolYearString(displayDate)}`}
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
                    {effectiveSchoolName && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        borderRadius: '100px',
                        padding: '4px 14px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        color: '#cbd5e1',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '8px'
                      }}>
                        <Building2 size={12} color="#94a3b8" />
                        <span>{effectiveSchoolName}</span>
                      </div>
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
                      <span style={{ fontSize: '0.82rem', fontWeight: 950, letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center' }}>
                        <span style={{ color: '#34a853' }}>Campus</span>
                        <span style={{ color: '#94a3b8', margin: '0 1px' }}>-</span>
                        <span style={{ color: '#facc15' }}>Groovelab</span>
                        <span style={{ color: '#64748b', fontSize: '0.70rem', fontWeight: 700, marginLeft: '2px' }}>.de</span>
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
