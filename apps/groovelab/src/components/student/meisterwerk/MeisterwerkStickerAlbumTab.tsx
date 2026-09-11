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
import { ALL_STICKERS, calculateCampusSchoolYearNumber, StickerUnlockResult } from "../../../domain/stickersAndTresor";
import { getSchoolYearString } from "../studentDateUtils";
import { StudentStickerAwardCelebrationModal } from "../modals/StudentStickerAwardCelebrationModal";

export interface MeisterwerkStickerAlbumTabProps {
  isMobileOrSim: boolean;
  readOnly?: boolean;
  isDevSimulationActive: boolean;
  setIsDevSimulationActive: (val: boolean) => void;
  simulateMultiYearProgress: () => void;
  resetStickerAlbum: () => void;
  collectedStickers: Record<string, StickerUnlockResult>;
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
          background: 'radial-gradient(ellipse at 50% -10%, #162444 0%, #0e172a 40%, #090f1d 75%, #050a14 100%)',
          borderRadius: '0',
          position: 'relative',
          boxSizing: 'border-box',
          minHeight: '100%'
        }}>
          {/* Ambient Cosmic Aurora Glows (Native GPU Composited Gradients) */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute',
            top: '250px',
            right: '10%',
            width: '500px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(234, 179, 8, 0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* 🌌 SUBTLE MICRO-STARDUST CELESTIAL MATRIX */}
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            {[
              { cx: '7%', cy: '45px', r: 1, o: 0.25 },
              { cx: '13%', cy: '160px', r: 1.5, o: 0.35, tw: true },
              { cx: '21%', cy: '80px', r: 1, o: 0.2 },
              { cx: '30%', cy: '240px', r: 1.2, o: 0.3, tw: true },
              { cx: '37%', cy: '50px', r: 1, o: 0.2 },
              { cx: '45%', cy: '140px', r: 1.5, o: 0.35 },
              { cx: '54%', cy: '90px', r: 1, o: 0.25, tw: true },
              { cx: '63%', cy: '220px', r: 1.2, o: 0.3 },
              { cx: '72%', cy: '70px', r: 1.5, o: 0.4, tw: true },
              { cx: '81%', cy: '130px', r: 1, o: 0.2 },
              { cx: '90%', cy: '60px', r: 1.2, o: 0.35, tw: true },
              { cx: '11%', cy: '380px', r: 1.2, o: 0.25 },
              { cx: '24%', cy: '460px', r: 1.5, o: 0.35, tw: true },
              { cx: '33%', cy: '340px', r: 1, o: 0.2 },
              { cx: '47%', cy: '520px', r: 1.2, o: 0.3, tw: true },
              { cx: '56%', cy: '410px', r: 1, o: 0.25 },
              { cx: '67%', cy: '480px', r: 1.5, o: 0.35, tw: true },
              { cx: '77%', cy: '360px', r: 1, o: 0.2 },
              { cx: '86%', cy: '440px', r: 1.2, o: 0.3, tw: true },
              { cx: '94%', cy: '390px', r: 1, o: 0.25 },
              { cx: '9%', cy: '720px', r: 1.5, o: 0.35, tw: true },
              { cx: '20%', cy: '810px', r: 1, o: 0.2 },
              { cx: '32%', cy: '690px', r: 1.2, o: 0.3, tw: true },
              { cx: '43%', cy: '860px', r: 1, o: 0.25 },
              { cx: '55%', cy: '740px', r: 1.5, o: 0.35, tw: true },
              { cx: '66%', cy: '890px', r: 1, o: 0.2 },
              { cx: '78%', cy: '710px', r: 1.2, o: 0.3, tw: true },
              { cx: '89%', cy: '830px', r: 1.5, o: 0.35 },
              { cx: '16%', cy: '1050px', r: 1.2, o: 0.3, tw: true },
              { cx: '36%', cy: '1120px', r: 1, o: 0.25 },
              { cx: '58%', cy: '1080px', r: 1.5, o: 0.35, tw: true },
              { cx: '83%', cy: '1150px', r: 1.2, o: 0.3 }
            ].map((star, i) => (
              <circle
                key={i}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="#ffffff"
                opacity={star.o}
                className={star.tw ? 'celestial-twinkle' : undefined}
              />
            ))}
          </svg>

          {/* 🌠 ORGANISCHE LIQUID-AUREN IN DEN HAUSAUFGABENHEFT-FARBEN (FLUID AMBIENT TRAILS • GPU ACCELERATED) */}
          <div aria-hidden="true" className="fluid-ambient-aura aura-campus-green" />
          <div aria-hidden="true" className="fluid-ambient-aura aura-groovelab-gold" />
          <div aria-hidden="true" className="fluid-ambient-aura aura-audio-cyan" />
          <div aria-hidden="true" className="fluid-ambient-aura aura-streak-coral" />
          <div aria-hidden="true" className="fluid-ambient-aura aura-meister-purple" />

          {/* Keyframe animations */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes holoShimmer {
              0% { background-position: 0% 0%; }
              50% { background-position: 100% 100%; }
              100% { background-position: 0% 0%; }
            }
            @keyframes cardAmbientGlint {
              0% { transform: translateX(-150%) rotate(35deg); }
              25%, 100% { transform: translateX(250%) rotate(35deg); }
            }
            @keyframes cardLightSweep {
              0%, 15% { transform: translateX(-180%) rotate(25deg); opacity: 0; }
              20% { opacity: 0.65; }
              32% { transform: translateX(220%) rotate(25deg); opacity: 0; }
              100% { transform: translateX(220%) rotate(25deg); opacity: 0; }
            }
            @keyframes unlockedCardPulse {
              0%, 100% {
                box-shadow: 0 10px 28px -4px rgba(0, 0, 0, 0.45), 0 0 16px var(--sticker-glow, rgba(52, 168, 83, 0.3)), inset 0 1px 0 rgba(255, 255, 255, 0.16);
                border-color: var(--sticker-border, rgba(52, 168, 83, 0.7));
              }
              50% {
                box-shadow: 0 14px 34px -2px rgba(0, 0, 0, 0.55), 0 0 26px var(--sticker-glow-active, rgba(74, 222, 128, 0.55)), inset 0 1px 0 rgba(255, 255, 255, 0.28);
                border-color: var(--sticker-border-active, rgba(74, 222, 128, 0.95));
              }
            }
            @keyframes hallOfFameCardPulse {
              0%, 100% {
                box-shadow: 0 12px 32px -4px rgba(234, 179, 8, 0.3), 0 0 20px rgba(234, 179, 8, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25);
                border-color: rgba(234, 179, 8, 0.75);
              }
              50% {
                box-shadow: 0 18px 42px -2px rgba(234, 179, 8, 0.5), 0 0 32px rgba(250, 204, 21, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4);
                border-color: rgba(250, 204, 21, 1);
              }
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
                box-shadow: 0 12px 36px -4px rgba(234, 179, 8, 0.45), 0 0 0 2px rgba(234, 179, 8, 0.7);
                transform: translateY(0);
              }
              50% {
                box-shadow: 0 18px 45px -2px rgba(234, 179, 8, 0.65), 0 0 0 3.5px rgba(250, 204, 21, 0.95);
                transform: translateY(-3px);
              }
            }
            @keyframes vinylPeelSpring {
              0% { transform: scale(0.7) rotate(-7deg); opacity: 0; }
              65% { transform: scale(1.05) rotate(2deg); }
              85% { transform: scale(0.98) rotate(-1deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes celestialTwinkle {
              0%, 100% { opacity: 0.15; transform: scale(0.85); }
              50% { opacity: 0.6; transform: scale(1.2); }
            }
            .celestial-twinkle {
              animation: celestialTwinkle 4.5s ease-in-out infinite;
              transform-origin: center;
            }

            /* 🌊 ORGANIC FLUID AMBIENT TRAILS (NATIVE GPU RADIAL GRADIENTS • 0MS RASTER PENALTY) */
            @keyframes fluidDrift1 {
              0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
              35% { transform: translate3d(55px, -30px, 0) scale(1.10) rotate(8deg); }
              70% { transform: translate3d(-35px, 25px, 0) scale(0.95) rotate(-6deg); }
              100% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
            }
            @keyframes fluidDrift2 {
              0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
              40% { transform: translate3d(-50px, 35px, 0) scale(1.12) rotate(-9deg); }
              75% { transform: translate3d(30px, -20px, 0) scale(0.94) rotate(5deg); }
              100% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
            }
            @keyframes fluidDrift3 {
              0% { transform: translate3d(0, 0, 0) scale(0.96); }
              50% { transform: translate3d(40px, 35px, 0) scale(1.08); }
              100% { transform: translate3d(0, 0, 0) scale(0.96); }
            }

            .fluid-ambient-aura {
              position: absolute;
              border-radius: 50%;
              pointer-events: none;
              will-change: transform;
              z-index: 0;
            }
            .aura-campus-green {
              width: 520px;
              height: 270px;
              top: 80px;
              right: 8%;
              background: radial-gradient(ellipse at center, rgba(74, 222, 128, 0.11) 0%, rgba(34, 197, 94, 0.05) 35%, rgba(34, 197, 94, 0.015) 60%, transparent 80%);
              animation: fluidDrift1 26s ease-in-out infinite;
            }
            .aura-groovelab-gold {
              width: 560px;
              height: 290px;
              top: 380px;
              left: 6%;
              background: radial-gradient(ellipse at center, rgba(250, 204, 21, 0.10) 0%, rgba(234, 179, 8, 0.045) 35%, rgba(234, 179, 8, 0.012) 60%, transparent 80%);
              animation: fluidDrift2 30s ease-in-out infinite;
              animation-delay: -6s;
            }
            .aura-audio-cyan {
              width: 500px;
              height: 260px;
              top: 680px;
              right: 12%;
              background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.10) 0%, rgba(6, 182, 212, 0.045) 35%, rgba(6, 182, 212, 0.012) 60%, transparent 80%);
              animation: fluidDrift3 28s ease-in-out infinite;
              animation-delay: -12s;
            }
            .aura-streak-coral {
              width: 480px;
              height: 250px;
              top: 980px;
              left: 14%;
              background: radial-gradient(ellipse at center, rgba(248, 113, 113, 0.09) 0%, rgba(239, 68, 68, 0.04) 35%, rgba(239, 68, 68, 0.01) 60%, transparent 80%);
              animation: fluidDrift1 32s ease-in-out infinite;
              animation-delay: -18s;
            }
            .aura-meister-purple {
              width: 520px;
              height: 270px;
              top: 1260px;
              right: 16%;
              background: radial-gradient(ellipse at center, rgba(192, 132, 252, 0.09) 0%, rgba(168, 85, 247, 0.04) 35%, rgba(168, 85, 247, 0.01) 60%, transparent 80%);
              animation: fluidDrift2 29s ease-in-out infinite;
              animation-delay: -9s;
            }

            @media (prefers-reduced-motion: reduce) {
              .fluid-ambient-aura {
                animation: none !important;
                display: none !important;
              }
              .celestial-twinkle {
                animation: none !important;
              }
            }

            .active-milestone-card {
              animation: activeMilestoneBreathingGlow 3.2s ease-in-out infinite !important;
            }
            /* 👑 100% UNIFORM ANIMATION ACROSS ALL UNLOCKED CARDS */
            .unlocked-sticker-card,
            .hall-of-fame-card {
              animation: unlockedCardPulse 3.8s ease-in-out infinite !important;
            }
            .card-sweep-light {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                105deg,
                transparent 20%,
                rgba(255, 255, 255, 0.04) 38%,
                rgba(255, 255, 255, 0.22) 50%,
                rgba(255, 255, 255, 0.04) 62%,
                transparent 80%
              );
              pointer-events: none;
              border-radius: inherit;
              z-index: 1;
              animation: cardLightSweep 7.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .collector-sticker-card {
              transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease, border-color 0.2s ease, background 0.2s ease;
              transform-style: preserve-3d;
            }
            .collector-sticker-card:hover {
              transform: translateY(-6px) scale(1.015);
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
                grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
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
                grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
                gap: 10px;
              }
              .collector-sticker-card {
                min-height: 230px !important;
                padding: 14px 10px 10px 10px !important;
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
                grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
                gap: 10px;
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
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '4px',
              gap: '4px',
              width: isMobileOrSim ? '100%' : 'fit-content',
              boxSizing: 'border-box',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4)'
            }}>
              <button
                type="button"
                onClick={() => setActiveAlbumView('season')}
                style={{
                  flex: isMobileOrSim ? 1 : 'initial',
                  background: activeAlbumView === 'season' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: activeAlbumView === 'season' ? '#ffffff' : '#94a3b8',
                  border: activeAlbumView === 'season' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                  borderRadius: '20px',
                  padding: '9px 20px',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: activeAlbumView === 'season' ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.18s ease'
                }}
                className="hover-scale"
              >
                <Trophy size={16} strokeWidth={2.4} color={activeAlbumView === 'season' ? '#ffffff' : '#94a3b8'} />
                <span>Saison-Album (20 Meilensteine)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAlbumView('journey')}
                style={{
                  flex: isMobileOrSim ? 1 : 'initial',
                  background: activeAlbumView === 'journey' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'transparent',
                  color: activeAlbumView === 'journey' ? '#0f172a' : '#94a3b8',
                  border: activeAlbumView === 'journey' ? '1px solid rgba(255, 255, 255, 0.4)' : 'none',
                  borderRadius: '20px',
                  padding: '9px 20px',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: activeAlbumView === 'journey' ? '0 4px 16px rgba(234, 179, 8, 0.4)' : 'none',
                  transition: 'all 0.18s ease'
                }}
                className="hover-scale"
              >
                <Compass size={16} strokeWidth={2.4} color={activeAlbumView === 'journey' ? '#0f172a' : '#94a3b8'} />
                <span>Meine Campus-Jahre (Klangreise)</span>
                <span style={{
                  background: activeAlbumView === 'journey' ? '#0f172a' : 'rgba(255, 255, 255, 0.12)',
                  color: activeAlbumView === 'journey' ? '#facc15' : '#e2e8f0',
                  fontSize: '0.68rem',
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
                {/* 🏛️ APPLE TROPHY CASE SHOWCASE (HERO 3D SHOWCASE BANNER) */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(19, 28, 46, 0.85) 0%, rgba(15, 23, 40, 0.95) 50%, rgba(8, 13, 24, 0.98) 100%)',
                  borderRadius: '26px',
                  padding: isMobileOrSim ? '20px 18px' : '26px 32px',
                  color: '#ffffff',
                  boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  flexShrink: 0,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Subtle inner gold/emerald light aura */}
                  <div aria-hidden="true" style={{
                    position: 'absolute',
                    top: '-70px',
                    right: '10%',
                    width: '320px',
                    height: '240px',
                    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.18) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    filter: 'blur(30px)'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
                    {/* Left: Titles & Rank Crown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '520px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.1) 100%)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)'
                        }}>
                          <Trophy size={20} color="#facc15" strokeWidth={2.4} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 950, letterSpacing: '-0.4px', color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                          Sticker Sammelalbum
                        </h2>
                        <span style={{
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          color: '#fde047',
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          padding: '3px 12px',
                          borderRadius: '20px',
                          letterSpacing: '0.03em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 0 12px rgba(234, 179, 8, 0.2)'
                        }}>
                          <Star size={11} fill="#facc15" color="#facc15" /> {rankTitle}
                        </span>
                        {renderSchoolYearSelector()}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600, lineHeight: '1.45' }}>
                        Sammle XP, erstelle Übe-Streaks & meistere Songs, um alle 20 Saison-Meilensteine für dein Musik-Album freizuschalten.
                      </p>
                    </div>

                    {/* Right side: Floating Pedestal Wappen & Apple-Ring Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      {/* Album Cover Crest / Wappen for current school year */}
                      {currentCoverSticker && (
                        <div
                          onClick={() => setSelectedPreviewSticker(currentCoverSticker)}
                          title="Klicke hier, um dein Campus-Jahreswappen im Detail zu betrachten"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '20px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.15)'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)',
                            border: '2px solid #38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)'
                          }}>
                            <span style={{ fontSize: '1.7rem', userSelect: 'none' }}>{currentCoverSticker.emoji}</span>
                            <img
                              src={`/stickers/${currentCoverSticker.id}.png?v=1`}
                              alt={currentCoverSticker.title}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.08em' }}>
                                Cover-Wappen #{cycleYear}
                              </span>
                              <span style={{
                                fontSize: '0.60rem',
                                fontWeight: 850,
                                background: 'rgba(52, 168, 83, 0.2)',
                                border: '1px solid rgba(74, 222, 128, 0.4)',
                                color: '#4ade80',
                                padding: '1px 6px',
                                borderRadius: '6px'
                              }}>
                                {schoolYearNum}. Campus-Jahr
                              </span>
                            </div>
                            <div style={{ fontSize: '0.94rem', fontWeight: 950, color: '#ffffff' }}>
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
                                color: '#38bdf8',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 0 0 0',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Compass size={13} strokeWidth={2.4} />
                              <span>Zur Klangreise →</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Circular Apple-Watch Progress Badge */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '20px',
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flexShrink: 0,
                        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.5)'
                      }}>
                        {/* Circular SVG Ring */}
                        <div style={{ position: 'relative', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="54" height="54" viewBox="0 0 54 54" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="5" />
                            <circle
                              cx="27"
                              cy="27"
                              r="22"
                              fill="none"
                              stroke="url(#appleProgressGrad)"
                              strokeWidth="5"
                              strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 22}
                              strokeDashoffset={2 * Math.PI * 22 * (1 - percentage / 100)}
                              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                            />
                            <defs>
                              <linearGradient id="appleProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#34a853" />
                                <stop offset="50%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#facc15" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <span style={{ position: 'absolute', fontSize: '0.78rem', fontWeight: 950, color: '#ffffff' }}>
                            {percentage}%
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900, color: '#94a3b8', display: 'block' }}>
                            Saison-Fortschritt
                          </span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <strong style={{ fontSize: '1.45rem', fontWeight: 950, color: '#ffffff', lineHeight: 1.1 }}>
                              {collectedSeasonalCount}
                            </strong>
                            <span style={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: 700 }}>
                              / {totalSeasonalCount} gesammelt
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div style={{ marginTop: '16px', position: 'relative', zIndex: 2 }}>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #34a853 0%, #4ade80 70%, #facc15 100%)',
                        borderRadius: '10px',
                        boxShadow: '0 0 10px rgba(74, 222, 128, 0.6)',
                        transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }} />
                    </div>
                  </div>
                </div>

                {/* ARCHIVE SEAL BANNER (WHEN BROWSING PAST SCHOOL YEARS) */}
                {isArchived && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.14) 0%, rgba(161, 98, 7, 0.10) 100%)',
                    border: '1.5px solid rgba(250, 204, 21, 0.35)',
                    borderRadius: '18px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 4px 16px rgba(234, 179, 8, 0.12)',
                    backdropFilter: 'blur(12px)',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Archive size={20} color="#facc15" />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#fef08a' }}>
                          Archiv-Ansicht: Schuljahr {selectedSchoolYear} (Versiegelt)
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 650, color: '#fde047', opacity: 0.85 }}>
                          Historischer Sammelstand dieses Schuljahres. Meilensteine und Meisterschafts-Sticker sind unveränderlich archiviert.
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(250, 204, 21, 0.15)',
                      border: '1px solid rgba(250, 204, 21, 0.4)',
                      color: '#fef08a',
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
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
                      background: isXpLegendOpen ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sparkles size={16} color="#facc15" />
                      <strong style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>
                        XP-Legende &amp; Punkte-Guide
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                        (Wie du Punkte &amp; Sticker sammelst)
                      </span>
                    </div>
                    <ChevronRight 
                      size={16} 
                      color="#94a3b8" 
                      style={{ 
                        transform: isXpLegendOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </div>

                  {isXpLegendOpen && (
                    <div style={{
                      padding: '14px 18px 18px 18px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Clock size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#ffffff' }}>Übe-Fokus</strong>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Pro absolvierte Minute Übezeit erhältst du <strong style={{ color: '#38bdf8' }}>1 XP</strong>.</span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Target size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#ffffff' }}>Tägliches Fokus-Ziel</strong>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Tägliches Fokus-Ziel erreicht = <strong style={{ color: '#4ade80' }}>+10 XP</strong> Bonus.</span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Trophy size={18} color="#facc15" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#ffffff' }}>Song meistern</strong>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Lied auf 100% oder Stage-Ready = <strong style={{ color: '#facc15' }}>+50 XP</strong> Bonus.</span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Flame size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '0.78rem', display: 'block', color: '#ffffff' }}>Streak-Bonus</strong>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Disziplin-Bonus: 7 Tage = <strong style={{ color: '#f87171' }}>+25 XP</strong>, 14 Tage = <strong style={{ color: '#f87171' }}>+50 XP</strong>, 30 Tage = <strong style={{ color: '#f87171' }}>+100 XP</strong>.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CATEGORIES FILTER BAR TABS (SAISON-ALBUM: 20 MEILENSTEINE • APPLE GLASS PILLS) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '4px 2px',
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
                          background: isActive 
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          color: isActive ? '#4ade80' : '#94a3b8',
                          border: isActive ? '1.5px solid rgba(74, 222, 128, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '20px',
                          padding: '8px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isActive ? '0 4px 16px rgba(34, 197, 94, 0.25)' : 'none',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                        className="hover-scale"
                      >
                        <TabIcon size={14} strokeWidth={2.2} color={isActive ? '#4ade80' : '#94a3b8'} />
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
                              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#ffffff' }}>
                                {cat.title}
                              </h3>
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, display: isMobileOrSim ? 'none' : 'inline' }}>
                                • {cat.desc}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                background: isCatComplete ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                                border: isCatComplete ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: isCatComplete ? '#4ade80' : '#94a3b8',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                backdropFilter: 'blur(8px)'
                              }}>
                                {catCollectedCount} / {categoryStickers.length} gesammelt {isCatComplete ? '✓' : ''}
                              </span>
                            </div>
                          </div>

                          {/* 4-Column Grid for this category row */}
                          <div className="collector-row-grid">
                            {categoryStickers.map(st => {
                              const info = activeStickerSource[st.id] || { count: 0, details: [], progressPercent: 0 };
                              const isCollected = info.count > 0;
                              const isLegendary = st.rarity === 'legendary';
                              const isEpic = st.rarity === 'epic';
                              const isRare = st.rarity === 'rare';
                              const progressPct = Math.min(100, Math.max(0, info.progressPercent || 0));

                              return (
                                <div
                                  key={st.id}
                                  className={`collector-sticker-card ${isCollected ? 'unlocked-sticker-card' : ''}`}
                                  onClick={() => {
                                    if (!readOnly && isDevSimulationActive) {
                                      awardSticker(st.id, "Simulation");
                                    } else {
                                      setSelectedPreviewSticker(st);
                                    }
                                  }}
                                  style={{
                                    ['--sticker-glow' as any]: isLegendary ? 'rgba(250, 204, 21, 0.35)' : isEpic ? 'rgba(192, 132, 252, 0.35)' : isRare ? 'rgba(96, 165, 250, 0.35)' : 'rgba(74, 222, 128, 0.35)',
                                    ['--sticker-glow-active' as any]: isLegendary ? 'rgba(250, 204, 21, 0.65)' : isEpic ? 'rgba(192, 132, 252, 0.65)' : isRare ? 'rgba(96, 165, 250, 0.65)' : 'rgba(74, 222, 128, 0.65)',
                                    ['--sticker-border' as any]: isLegendary ? 'rgba(250, 204, 21, 0.75)' : isEpic ? 'rgba(192, 132, 252, 0.75)' : isRare ? 'rgba(96, 165, 250, 0.75)' : 'rgba(74, 222, 128, 0.75)',
                                    ['--sticker-border-active' as any]: isLegendary ? '#facc15' : isEpic ? '#c084fc' : isRare ? '#60a5fa' : '#4ade80',
                                    background: isCollected 
                                      ? 'radial-gradient(135% 135% at 50% 0%, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.92) 100%)' 
                                      : 'rgba(255, 255, 255, 0.02)',
                                    border: isCollected 
                                      ? (isLegendary ? '2px solid rgba(234, 179, 8, 0.75)' : isEpic ? '2px solid rgba(175, 82, 222, 0.75)' : isRare ? '2px solid rgba(59, 130, 246, 0.75)' : '2px solid rgba(34, 197, 94, 0.65)') 
                                      : '1.5px dashed rgba(255, 255, 255, 0.12)',
                                    borderRadius: '22px',
                                    padding: '18px 14px 14px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    gap: '10px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: isCollected 
                                      ? (isLegendary ? '0 12px 30px -4px rgba(234, 179, 8, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : isEpic ? '0 12px 30px -4px rgba(175, 82, 222, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : '0 12px 30px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)') 
                                      : 'inset 0 2px 8px rgba(0, 0, 0, 0.35)',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                    minHeight: '268px',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease'
                                  }}
                                >
                                  {/* Universal Light Glint Sweep for Collected Stickers */}
                                  {isCollected && <div className="card-sweep-light" />}

                                  {/* Holographic foil overlay for legendary/epic stickers */}
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
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                      }}>
                                        x{info.count}
                                      </span>
                                    )}

                                    <span style={{
                                      background: isCollected 
                                        ? (isLegendary ? 'rgba(234, 179, 8, 0.2)' : isEpic ? 'rgba(175, 82, 222, 0.2)' : isRare ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)') 
                                        : 'rgba(255, 255, 255, 0.06)',
                                      color: isCollected 
                                        ? (isLegendary ? '#facc15' : isEpic ? '#c084fc' : isRare ? '#60a5fa' : '#4ade80') 
                                        : '#64748b',
                                      border: isCollected 
                                        ? (isLegendary ? '1px solid rgba(250, 204, 21, 0.45)' : isEpic ? '1px solid rgba(192, 132, 252, 0.45)' : isRare ? '1px solid rgba(96, 165, 250, 0.45)' : '1px solid rgba(74, 222, 128, 0.45)') 
                                        : '1px solid rgba(255, 255, 255, 0.08)',
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

                                  {/* Top info section: Graphic Badge with Circular SVG Ring for Locked */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginTop: '10px' }}>
                                    {/* 104px DIE-CUT BADGE & PROGRESS RING */}
                                    <div style={{
                                      width: '104px',
                                      height: '104px',
                                      position: 'relative',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      zIndex: 2
                                    }}>
                                      {/* Apple Watch Circular SVG Progress Ring for Locked Stickers */}
                                      {!isCollected && (
                                        <svg 
                                          width="104" 
                                          height="104" 
                                          viewBox="0 0 104 104" 
                                          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none', zIndex: 3 }}
                                        >
                                          {/* Background Track */}
                                          <circle 
                                            cx="52" 
                                            cy="52" 
                                            r="47" 
                                            fill="none" 
                                            stroke="rgba(255, 255, 255, 0.07)" 
                                            strokeWidth="4" 
                                          />
                                          {/* Active Progress Stroke */}
                                          {progressPct > 0 && (
                                            <circle
                                              cx="52"
                                              cy="52"
                                              r="47"
                                              fill="none"
                                              stroke={`url(#ringGrad_${st.id})`}
                                              strokeWidth="4"
                                              strokeLinecap="round"
                                              strokeDasharray={2 * Math.PI * 47}
                                              strokeDashoffset={2 * Math.PI * 47 * (1 - progressPct / 100)}
                                              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                                            />
                                          )}
                                          <defs>
                                            <linearGradient id={`ringGrad_${st.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                              <stop offset="0%" stopColor="#38bdf8" />
                                              <stop offset="100%" stopColor="#4ade80" />
                                            </linearGradient>
                                          </defs>
                                        </svg>
                                      )}

                                      {/* Inner Sticker Disc */}
                                      <div style={{
                                        width: '92px',
                                        height: '92px',
                                        borderRadius: '50%',
                                        background: isCollected ? st.bg : 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        border: isCollected ? '3px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: isCollected 
                                          ? '0 6px 20px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)' 
                                          : 'inset 0 2px 6px rgba(0, 0, 0, 0.4)',
                                        transition: 'all 0.25s ease',
                                        overflow: 'hidden'
                                      }}>
                                        {/* Emoji Fallback */}
                                        <span style={{ 
                                          fontSize: isCollected ? '2.6rem' : '2.3rem', 
                                          zIndex: 1, 
                                          filter: isCollected ? 'none' : 'grayscale(100%) brightness(0.2) contrast(1.2)',
                                          userSelect: 'none'
                                        }}>
                                          {st.emoji}
                                        </span>

                                        {/* WebP/PNG Thumbnail Image */}
                                        <img 
                                          src={`/stickers/thumbs/${st.id}.png`} 
                                          alt={st.title} 
                                          loading="lazy"
                                          decoding="async"
                                          style={{ 
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover',
                                            borderRadius: '50%',
                                            zIndex: 2,
                                            filter: isCollected ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'grayscale(100%) brightness(0.18) contrast(1.2)',
                                            transition: 'opacity 0.2s ease-in-out'
                                          }}
                                          onError={(e) => {
                                            const currentSrc = e.currentTarget.src;
                                            if (currentSrc.includes('/thumbs/')) {
                                              e.currentTarget.src = `/stickers/${st.id}.png?v=1`;
                                              return;
                                            }
                                            e.currentTarget.style.opacity = '0';
                                          }}
                                        />

                                        {/* Locked Center Badge: Lock icon or progress % pill */}
                                        {!isCollected && (
                                          <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: '50%',
                                            background: 'rgba(8, 13, 24, 0.55)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 3
                                          }}>
                                            {progressPct > 0 ? (
                                              <span style={{
                                                background: 'rgba(15, 23, 42, 0.85)',
                                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                                color: '#38bdf8',
                                                fontSize: '0.66rem',
                                                fontWeight: 950,
                                                padding: '2px 6px',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
                                              }}>
                                                {progressPct}%
                                              </span>
                                            ) : (
                                              <Lock size={18} color="#64748b" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* STICKER TITLE & DESCRIPTION */}
                                    <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                                      <h4 style={{ 
                                        margin: '0 0 3px 0', 
                                        fontSize: '0.90rem', 
                                        fontWeight: 900, 
                                        color: isCollected ? '#ffffff' : '#cbd5e1' 
                                      }}>
                                        {st.title}
                                      </h4>
                                      <p style={{ 
                                        margin: 0, 
                                        fontSize: '0.72rem', 
                                        color: isCollected ? '#94a3b8' : '#64748b', 
                                        fontWeight: 600, 
                                        lineHeight: '1.3' 
                                      }}>
                                        {st.desc}
                                      </p>

                                      {/* Motivational Duolingo-style Progress Tip for locked stickers */}
                                      {!isCollected && info.progressText && (
                                        <div style={{ marginTop: '6px' }}>
                                          <span style={{
                                            display: 'inline-block',
                                            fontSize: '0.66rem',
                                            fontWeight: 800,
                                            color: '#38bdf8',
                                            background: 'rgba(56, 189, 248, 0.1)',
                                            border: '1px solid rgba(56, 189, 248, 0.25)',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            letterSpacing: '0.02em'
                                          }}>
                                            {info.progressText}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Bottom status / history preview */}
                                  <div style={{ width: '100%', zIndex: 2, paddingTop: '6px' }}>
                                    {isCollected ? (
                                      <div style={{
                                        width: '100%',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                        paddingTop: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.66rem',
                                        color: '#4ade80',
                                        fontWeight: 800
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
                                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                        paddingTop: '6px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: '0.66rem',
                                        color: progressPct > 0 ? '#38bdf8' : '#64748b',
                                        fontWeight: 700
                                      }}>
                                        {progressPct > 0 ? (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={11} color="#38bdf8" /> {info.current || 0} / {info.target || 0} ({progressPct}%)
                                          </span>
                                        ) : (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Lock size={12} color="#64748b" /> Noch gesperrt
                                          </span>
                                        )}
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

            // 3x3 Basis-Album: Genau 9 sichtbare Sticker (Campus-Jahre 1 bis 9)
            const basisStickers = campusStickers.slice(0, 9);
            // Unsichtbare Hall of Fame & Legenden-Stufen (Campus-Jahre 10 bis 15)
            const legendStickers = campusStickers.slice(9, 15);
            // Werden nur gelüftet, wenn Schüler Stufe 10+ erreicht hat oder ein Legenden-Wappen besitzt
            const showHallOfFame = schoolYearNum >= 10 || completedCycles > 0 || legendStickers.some(st => (activeStickerSource[st.id]?.count || 0) > 0);

            // 🎓 1. Musikalische Regelausbildung: Die ersten 6 Campus-Jahre (Jahre 1 bis 6)
            const regelausbildungStickers = basisStickers.slice(0, 6);
            // 👑 2. Große Hall of Fame & Legenden: Die königliche 3er-Reihe (Jahre 7 bis 9 • Immer sichtbar!)
            const hallOfFameStickers = basisStickers.slice(6, 9);
            const unlockedRegularCount = regelausbildungStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
            const unlockedHofCount = hallOfFameStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;

            // 🏆 Unified High-Performance Journey Card Renderer (0% Dropped Frames • GPU Composited)
            const renderJourneyStickerCard = (st: typeof ALL_STICKERS[0], targetYear: number, isHallOfFameTier: boolean) => {
              const info = activeStickerSource[st.id] || { count: 0, details: [] };
              const isCollected = info.count > 0;
              const isCurrentYear = st.id === currentCoverStickerId;
              const isLegendary = st.rarity === 'legendary' || isHallOfFameTier;
              const isEpic = st.rarity === 'epic';

              return (
                <div
                  key={st.id}
                  className={`collector-sticker-card ${
                    isCollected 
                      ? 'unlocked-sticker-card' 
                      : isCurrentYear 
                      ? 'active-milestone-card' 
                      : ''
                  }`}
                  onClick={() => setSelectedPreviewSticker(st)}
                  style={{
                    ['--sticker-glow' as any]: isHallOfFameTier ? 'rgba(250, 204, 21, 0.4)' : (st.color ? `${st.color}55` : 'rgba(74, 222, 128, 0.35)'),
                    ['--sticker-glow-active' as any]: isHallOfFameTier ? 'rgba(250, 204, 21, 0.75)' : (st.color ? `${st.color}aa` : 'rgba(74, 222, 128, 0.65)'),
                    ['--sticker-border' as any]: isHallOfFameTier ? 'rgba(250, 204, 21, 0.85)' : (st.color || 'rgba(74, 222, 128, 0.75)'),
                    ['--sticker-border-active' as any]: isHallOfFameTier ? '#facc15' : (st.color || '#4ade80'),
                    background: isCurrentYear
                      ? 'radial-gradient(135% 135% at 50% 0%, rgba(45, 30, 10, 0.9) 0%, rgba(20, 15, 8, 0.98) 100%)'
                      : isCollected
                      ? isHallOfFameTier
                        ? 'radial-gradient(135% 135% at 50% 0%, rgba(45, 34, 14, 0.9) 0%, rgba(20, 16, 9, 0.98) 100%)'
                        : 'radial-gradient(135% 135% at 50% 0%, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : isHallOfFameTier
                      ? 'radial-gradient(135% 135% at 50% 0%, rgba(30, 24, 12, 0.5) 0%, rgba(15, 12, 6, 0.75) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrentYear
                      ? '2.5px solid #facc15'
                      : isCollected
                      ? isHallOfFameTier
                        ? '2px solid rgba(250, 204, 21, 0.85)'
                        : `2px solid ${st.color || '#34a853'}`
                      : isHallOfFameTier
                      ? '1.5px dashed rgba(234, 179, 8, 0.45)'
                      : '1.5px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '22px',
                    padding: '18px 16px 14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '10px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isCurrentYear
                      ? '0 12px 32px -4px rgba(234, 179, 8, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      : isCollected
                      ? isHallOfFameTier
                        ? '0 12px 32px -4px rgba(234, 179, 8, 0.3), 0 0 20px rgba(234, 179, 8, 0.2)'
                        : '0 12px 30px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                      : 'inset 0 2px 6px rgba(0, 0, 0, 0.35)',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    minHeight: '270px',
                    justifyContent: 'space-between',
                    transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease'
                  }}
                >
                  {/* Universal Light Glint Sweep for Collected Stickers */}
                  {isCollected && <div className="card-sweep-light" />}

                  {/* Holographic foil overlay */}
                  {isCollected && (isLegendary || isEpic || isHallOfFameTier) && (
                    <div 
                      className="holo-foil-overlay" 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '20px',
                        pointerEvents: 'none',
                        opacity: isHallOfFameTier ? 0.4 : isLegendary ? 0.35 : 0.2,
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
                      color: isCurrentYear ? '#facc15' : isHallOfFameTier ? '#fde047' : '#94a3b8',
                      letterSpacing: '0.06em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isHallOfFameTier && <span>👑</span>}
                      #{String(targetYear).padStart(2, '0')}/09
                    </span>

                    <span style={{
                      background: isCurrentYear
                        ? 'rgba(234, 179, 8, 0.25)'
                        : isCollected
                        ? isHallOfFameTier
                          ? 'rgba(234, 179, 8, 0.25)'
                          : 'rgba(34, 197, 94, 0.2)'
                        : isHallOfFameTier
                        ? 'rgba(234, 179, 8, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: isCurrentYear
                        ? '#facc15'
                        : isCollected
                        ? isHallOfFameTier
                          ? '#facc15'
                          : '#4ade80'
                        : isHallOfFameTier
                        ? '#eab308'
                        : '#64748b',
                      border: isCurrentYear
                        ? '1px solid rgba(250, 204, 21, 0.5)'
                        : isCollected
                        ? isHallOfFameTier
                          ? '1px solid rgba(250, 204, 21, 0.55)'
                          : '1px solid rgba(74, 222, 128, 0.45)'
                        : isHallOfFameTier
                        ? '1px solid rgba(234, 179, 8, 0.28)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
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
                          <Star size={11} fill="currentColor" color="#facc15" /> Aktives Schuljahr
                        </>
                      ) : isCollected ? (
                        isHallOfFameTier ? (
                          <>
                            <Award size={11} color="#facc15" /> Hall of Fame
                          </>
                        ) : (
                          <>
                            <Check size={11} strokeWidth={2.5} /> Freigeschaltet
                          </>
                        )
                      ) : isHallOfFameTier ? (
                        <>
                          <Lock size={11} color="#eab308" /> Legende
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
                    background: isCollected ? (st.bg || '#f0fdf4') : 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    border: isCollected 
                      ? (isHallOfFameTier ? '3.5px solid #facc15' : '3.5px solid #ffffff')
                      : (isHallOfFameTier ? '1.5px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'),
                    boxShadow: isCollected 
                      ? (isCurrentYear 
                        ? '0 8px 26px rgba(234, 179, 8, 0.4), 0 0 0 1px rgba(250, 204, 21, 0.4)' 
                        : isHallOfFameTier
                        ? '0 8px 24px rgba(234, 179, 8, 0.35), 0 0 16px rgba(250, 204, 21, 0.25)'
                        : '0 6px 20px rgba(0, 0, 0, 0.35)') 
                      : 'inset 0 2px 6px rgba(0,0,0,0.4)',
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
                        filter: isCollected ? 'none' : 'grayscale(100%) brightness(0.2) contrast(1.2)',
                        userSelect: 'none'
                      }}>
                        {st.emoji}
                      </span>

                      <img 
                        src={`/stickers/thumbs/${st.id}.png`} 
                        alt={st.title} 
                        loading="lazy"
                        decoding="async"
                        style={{ 
                          position: 'absolute',
                          inset: 0,
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '50%',
                          zIndex: 2,
                          filter: isCollected ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'grayscale(100%) brightness(0.18) contrast(1.2)',
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          if (currentSrc.includes('/thumbs/')) {
                            e.currentTarget.src = `/stickers/${st.id}.png?v=1`;
                            return;
                          }
                          e.currentTarget.style.opacity = '0';
                        }}
                      />
                    </div>

                    {!isCollected && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: isHallOfFameTier ? 'rgba(25, 20, 10, 0.65)' : 'rgba(8, 13, 24, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isHallOfFameTier ? '#facc15' : '#94a3b8'
                      }}>
                        <Lock size={22} color={isHallOfFameTier ? '#eab308' : '#64748b'} />
                      </div>
                    )}
                  </div>

                  {/* Title & Pedagogical Leitmotif (Strict 1-Sentence Goldstandard) */}
                  <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '0.94rem', 
                      fontWeight: 900, 
                      color: isCollected ? (isHallOfFameTier ? '#fef08a' : '#ffffff') : (isHallOfFameTier ? '#fde047' : '#cbd5e1') 
                    }}>
                      {st.title}
                    </h4>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.74rem', 
                      color: isCollected ? '#94a3b8' : '#64748b', 
                      fontWeight: 650, 
                      lineHeight: '1.35' 
                    }}>
                      {st.desc}
                    </p>
                  </div>

                  {/* Bottom Footer Status */}
                  <div style={{ width: '100%', zIndex: 2, paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 750,
                      color: isCurrentYear 
                        ? '#facc15' 
                        : isCollected 
                        ? (isHallOfFameTier ? '#facc15' : '#4ade80') 
                        : (isHallOfFameTier ? '#eab308' : '#64748b')
                    }}>
                      {isCurrentYear 
                        ? '🎒 Dein aktives Campus-Wappen'
                        : isCollected 
                        ? (isHallOfFameTier ? `👑 Im ${targetYear}. Jahr (Hall of Fame) erreicht` : `✓ Im ${targetYear}. Campus-Schuljahr erhalten`)
                        : (isHallOfFameTier ? `🏆 Hall of Fame: Freischaltung im ${targetYear}. Jahr` : `🔒 Freischaltung im ${targetYear}. Campus-Jahr`)}
                    </span>
                  </div>
                </div>
              );
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
                {/* JOURNEY HERO BANNER */}
                <div style={{
                  background: 'radial-gradient(135% 135% at 50% 0%, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  borderRadius: '26px',
                  padding: isMobileOrSim ? '20px 18px' : '28px 32px',
                  color: '#ffffff',
                  boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Subtle cosmic gold ambient aura */}
                  <div style={{
                    position: 'absolute',
                    top: '-60px',
                    right: '-40px',
                    width: '320px',
                    height: '320px',
                    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.16) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    borderRadius: '50%'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
                    <div style={{ maxWidth: '640px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '16px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1.5px solid #facc15',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(234, 179, 8, 0.25)'
                        }}>
                          <Compass size={24} color="#facc15" strokeWidth={2.2} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 950, letterSpacing: '-0.4px', color: '#ffffff' }}>
                              Meine Campus-Jahre
                            </h2>
                            <span style={{
                              background: 'rgba(234, 179, 8, 0.2)',
                              border: '1px solid rgba(250, 204, 21, 0.5)',
                              color: '#facc15',
                              fontSize: '0.74rem',
                              fontWeight: 900,
                              padding: '3px 10px',
                              borderRadius: '20px'
                            }}>
                              3×3 Ausbildungs-Reise
                            </span>
                            {completedCycles > 0 && (
                              <span style={{
                                background: 'rgba(175, 82, 222, 0.2)',
                                border: '1px solid rgba(192, 132, 252, 0.5)',
                                color: '#c084fc',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                padding: '3px 10px',
                                borderRadius: '20px'
                              }}>
                                👑 Meisterzyklus #{completedCycles + 1}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: '#94a3b8', fontWeight: 600, lineHeight: '1.45' }}>
                            Für jedes aktive Schuljahr auf Campus-Groovelab erhältst du dein exklusives Ausbildungs-Wappen. Deine gesammelten Wappen begleiten dich deine gesamte musikalische Laufbahn!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right side stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '18px',
                        padding: '12px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#94a3b8' }}>
                          Aktive Stufe
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                          <strong style={{ fontSize: '1.55rem', fontWeight: 950, color: '#ffffff', lineHeight: 1 }}>
                            {schoolYearNum}. Campus-Jahr
                          </strong>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#4ade80', fontWeight: 750 }}>
                          #{cycleYear} Wappen aktiv
                        </span>
                      </div>

                      <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '18px',
                        padding: '12px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#94a3b8' }}>
                          Reise-Fortschritt
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                          <strong style={{ fontSize: '1.55rem', fontWeight: 950, color: '#ffffff', lineHeight: 1 }}>
                            {Math.min(9, unlockedCampusCount)}
                          </strong>
                          <span style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 700 }}>
                            / 9 Wappen ({Math.round((Math.min(9, unlockedCampusCount) / 9) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 9-Year Progress Bar */}
                  <div style={{ marginTop: '18px', position: 'relative', zIndex: 2 }}>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.round((Math.min(9, unlockedCampusCount) / 9) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 35%, #8b5cf6 65%, #facc15 100%)',
                        borderRadius: '10px',
                        boxShadow: '0 0 12px rgba(250, 204, 21, 0.4)',
                        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.68rem', fontWeight: 750, color: '#94a3b8' }}>
                      <span>🎒 Start (1. Jahr)</span>
                      <span>🌱 Grundstufe (3. Jahr)</span>
                      <span>⚡ 5. Jahr (Jubiläum)</span>
                      <span>🎓 Regelausbildung (6. Jahr)</span>
                      <span>🏆 Diplom &amp; Hall of Fame (9. Jahr)</span>
                    </div>
                  </div>
                </div>

                {/* 🎓 BEREICH 1: MUSIKALISCHE REGELAUSBILDUNG (JAHRE 1 – 6) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '18px',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GraduationCap size={22} color="#38bdf8" strokeWidth={2.2} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38bdf8',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            Regelausbildung • 6 Jahre
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: '#ffffff' }}>
                            Musikalische Regelausbildung (Jahre 1 – 6)
                          </h3>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                          Vom ersten Ton bis zur bühnenreifen Konzertreife – das 6-jährige Fundament deiner Instrumentalausbildung.
                        </p>
                      </div>
                    </div>

                    <span style={{
                      background: unlockedRegularCount === 6 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: unlockedRegularCount === 6 ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: unlockedRegularCount === 6 ? '#4ade80' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {unlockedRegularCount} / 6 Wappen
                    </span>
                  </div>

                  {/* 3x2 GRID: DIE ERSTEN 6 JAHRE */}
                  <div className="journey-3x3-grid">
                    {regelausbildungStickers.map((st, idx) => renderJourneyStickerCard(st, idx + 1, false))}
                  </div>
                </div>

                {/* 👑 BEREICH 2: GROSSE HALL OF FAME & LEGENDEN (JAHRE 7 – 9 • PROMINENT & IMMER SICHTBAR) */}
                <div style={{
                  background: 'radial-gradient(135% 135% at 50% 0%, rgba(35, 27, 12, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: '1.5px solid rgba(234, 179, 8, 0.45)',
                  borderRadius: '24px',
                  padding: isMobileOrSim ? '18px 14px' : '24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  width: '100%',
                  boxSizing: 'border-box',
                  boxShadow: '0 16px 36px -8px rgba(15, 23, 42, 0.5), 0 0 24px rgba(234, 179, 8, 0.12)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Ambient gold glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '420px',
                    height: '140px',
                    background: 'radial-gradient(ellipse, rgba(234, 179, 8, 0.18) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }} />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        background: 'rgba(234, 179, 8, 0.18)',
                        border: '1.5px solid #facc15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(234, 179, 8, 0.25)'
                      }}>
                        <Award size={22} color="#facc15" strokeWidth={2.2} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: 'rgba(234, 179, 8, 0.22)',
                            border: '1px solid #facc15',
                            color: '#facc15',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            letterSpacing: '0.04em'
                          }}>
                            👑 Hall of Fame • Jahre 7 – 9
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 950, color: '#ffffff' }}>
                            Große Hall of Fame &amp; Legenden
                          </h3>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                          Die königliche Spitzenklasse: Klang-Virtuose, Meister-Grad und Harmonie-Wächter auf höchstem Meisterschaftsniveau.
                        </p>
                      </div>
                    </div>

                    <span style={{
                      background: unlockedHofCount === 3 ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: unlockedHofCount === 3 ? '1px solid #facc15' : '1px solid rgba(234, 179, 8, 0.3)',
                      color: '#facc15',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      padding: '4px 12px',
                      borderRadius: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      👑 {unlockedHofCount} / 3 Legenden
                    </span>
                  </div>

                  {/* 3x1 GRID: DIE 3 HALL OF FAME STICKER (JAHRE 7, 8, 9) */}
                  <div className="journey-3x3-grid" style={{ position: 'relative', zIndex: 2 }}>
                    {hallOfFameStickers.map((st, idx) => renderJourneyStickerCard(st, idx + 7, true))}
                  </div>
                </div>

                {/* GEHEIME HALL OF FAME & LEGENDEN-KAMMER (WIRD NUR AB 10+ JAHREN AKTIVIERT) */}
                {showHallOfFame && (
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
                            Ab dem 10. Campus-Jahr betrittst du die unvergängliche Legenden-Klasse. Höchste Meister-Wappen für jahrzehntelange Hingabe und lebenslange musikalische Identität!
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
                            className={`collector-sticker-card ${
                              isCollected 
                                ? 'unlocked-sticker-card' 
                                : isCurrentYear 
                                ? 'active-milestone-card' 
                                : ''
                            }`}
                            onClick={() => setSelectedPreviewSticker(st)}
                            style={{
                              ['--sticker-glow' as any]: 'rgba(250, 204, 21, 0.4)',
                              ['--sticker-glow-active' as any]: 'rgba(250, 204, 21, 0.75)',
                              ['--sticker-border' as any]: 'rgba(250, 204, 21, 0.85)',
                              ['--sticker-border-active' as any]: '#facc15',
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
                              overflow: 'hidden',
                              boxShadow: isCollected 
                                ? '0 10px 28px -4px rgba(234, 179, 8, 0.25)' 
                                : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              minHeight: '270px',
                              justifyContent: 'space-between',
                              transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease'
                            }}
                          >
                            {/* Universal Light Glint Sweep for Unlocked Legends */}
                            {isCollected && <div className="card-sweep-light" />}

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
                                margin: '0 0 4px 0', 
                                fontSize: '0.94rem', 
                                fontWeight: 900, 
                                color: isCollected ? '#ffffff' : '#94a3b8' 
                              }}>
                                {st.title}
                              </h4>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.74rem', 
                                color: isCollected ? '#cbd5e1' : '#64748b', 
                                fontWeight: 650, 
                                lineHeight: '1.35' 
                              }}>
                                {st.desc}
                              </p>
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
                            Musizieren endet nie. Deine Campus-Reise begleitet dich ein ganzes Leben lang!
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
                )}
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
            const isSchuljahr = st.category === 'schuljahr';

            return (
              <div 
                role="dialog"
                aria-modal="true"
                aria-label={`Sticker ${st.title} Details`}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(5, 10, 20, 0.86)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000,
                  padding: '16px',
                  boxSizing: 'border-box',
                  animation: 'fadeIn 0.22s ease-out'
                }} 
                onClick={() => setSelectedPreviewSticker(null)}
              >
                {/* COMPACT APPLE TROPHY CASE CARD */}
                <div 
                  style={{
                    width: '100%',
                    maxWidth: '430px',
                    maxHeight: 'min(92vh, 760px)',
                    background: 'radial-gradient(135% 135% at 50% 0%, #1e293b 0%, #0c1322 100%)',
                    borderRadius: '28px',
                    border: isLegendary 
                      ? '2.5px solid #facc15' 
                      : isEpic 
                      ? '2.5px solid #af52de' 
                      : '2px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: isLegendary
                      ? '0 24px 60px -12px rgba(234, 179, 8, 0.35), 0 0 0 1px rgba(250, 204, 21, 0.2)'
                      : '0 24px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    padding: isMobileOrSim ? '20px 18px 18px 18px' : '26px 24px 22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'white',
                    position: 'relative',
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                    animation: 'peelIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
                        borderRadius: '26px',
                        pointerEvents: 'none',
                        opacity: isLegendary ? 0.3 : 0.15,
                        zIndex: 1
                      }} 
                    />
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewSticker(null)}
                    aria-label="Schließen"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
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
                    <X size={17} />
                  </button>

                  {/* Header Badge & Rarity Tag */}
                  <div style={{ textAlign: 'center', zIndex: 2, width: '100%', paddingRight: '28px', paddingLeft: '28px', boxSizing: 'border-box' }}>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em', 
                      color: isLegendary ? '#facc15' : isEpic ? '#c084fc' : st.color || '#34a853',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '3px 12px',
                      borderRadius: '100px',
                      border: isLegendary ? '1px solid rgba(250, 204, 21, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Star size={11} fill="currentColor" /> {isSchuljahr && parseInt(st.id.replace('schuljahr-', ''), 10) >= 7 ? '👑 Hall of Fame' : (st.rarityLabel || 'Standard')} • {isSchuljahr ? `Campus-Stufe #${parseInt(st.id.replace('schuljahr-', ''), 10)}` : `Schuljahr ${selectedSchoolYear || getSchoolYearString(displayDate)}`}
                    </span>
                    <h3 style={{ fontSize: '1.38rem', fontWeight: 950, margin: '6px 0 0 0', letterSpacing: '-0.3px', color: '#ffffff', lineHeight: '1.2' }}>
                      {st.title}
                    </h3>
                  </div>

                  {/* 3D STICKER BADGE (135px Compact Vinyl Graphic) */}
                  <div style={{
                    width: '135px',
                    height: '135px',
                    borderRadius: '50%',
                    background: isCollected ? (st.bg || '#f0fdf4') : 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    border: isCollected ? '4px solid #ffffff' : '1.5px dashed rgba(255, 255, 255, 0.2)',
                    boxShadow: isCollected 
                      ? `0 10px 26px ${st.color || '#34a853'}50, 0 0 0 1px rgba(255,255,255,0.7)` 
                      : '0 6px 18px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    margin: '2px 0',
                    flexShrink: 0
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
                        fontSize: isCollected ? '3.8rem' : '3.2rem', 
                        zIndex: 1, 
                        filter: isCollected ? 'none' : 'grayscale(100%) brightness(0.25) contrast(1.2)',
                        userSelect: 'none'
                      }}>
                        {st.emoji}
                      </span>

                      <img 
                        src={`/stickers/${st.id}.png?v=1`} 
                        alt={st.title} 
                        style={{ 
                          position: 'absolute',
                          inset: 0,
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '50%',
                          zIndex: 2,
                          filter: isCollected ? 'none' : 'grayscale(100%) brightness(0.22) contrast(1.2)'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>

                    {!isCollected && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(8, 13, 24, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                        pointerEvents: 'none'
                      }}>
                        <Lock size={30} color="#facc15" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
                      </div>
                    )}
                  </div>

                  {/* Student Name & School Subtitle (Subtle Trophy Engraving) */}
                  <div style={{ textAlign: 'center', width: '100%', zIndex: 2 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                        {actualStudentName}
                      </span>
                      {studentInstrument && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
                          {studentInstrument}
                        </span>
                      )}
                    </div>
                    {effectiveSchoolName && (
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Building2 size={11} color="#64748b" />
                        <span>{effectiveSchoolName}</span>
                      </div>
                    )}
                  </div>

                  {/* Dedicated Song topic if applicable (for Song-Master) */}
                  {!isSchuljahr && (st.category === 'songs' || st.id === 'song-master' || (activeTopic && !activeTopic.includes('Campus-Schuljahr') && activeTopic !== 'Simulation' && activeTopic !== 'Allgemein')) && (
                    <div style={{
                      width: '100%',
                      textAlign: 'center',
                      background: 'rgba(250, 204, 21, 0.08)',
                      border: '1px solid rgba(250, 204, 21, 0.25)',
                      borderRadius: '12px',
                      padding: '6px 10px',
                      boxSizing: 'border-box',
                      zIndex: 2
                    }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Music size={11} color="#facc15" /> Gemeistertes Werk
                      </div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 950, color: '#ffffff', marginTop: '2px', wordBreak: 'break-word' }}>
                        {activeTopic || 'Song gemeistert'}
                      </div>
                    </div>
                  )}

                  {/* Multi-song Sleek Chip Selector */}
                  {!isSchuljahr && details.length > 1 && (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '5px',
                      zIndex: 3
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
                              padding: '3px 10px',
                              fontSize: '0.68rem',
                              fontWeight: isSel ? 900 : 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <span>🎵</span>
                            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.topic}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Pedagogical Leitmotif Box (Clean, Concise 1-Sentence Goldstandard) */}
                  <div style={{ 
                    width: '100%', 
                    textAlign: 'center', 
                    padding: '10px 14px', 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    boxSizing: 'border-box',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <p style={{ fontSize: '0.86rem', color: '#f8fafc', margin: 0, lineHeight: '1.4', fontWeight: 700 }}>
                      „{st.desc}“
                    </p>
                    {st.equiv && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        color: '#38bdf8',
                        letterSpacing: '0.01em'
                      }}>
                        {st.equiv}
                      </span>
                    )}
                  </div>

                  {/* Status & Verification Line */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 2 }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      color: isCollected ? '#4ade80' : '#94a3b8', 
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isCollected ? (
                        <>
                          <Check size={12} color="#4ade80" strokeWidth={2.5} /> Freigeschaltet {st.multi && info.count > 1 ? `(${info.count}x)` : ''}
                        </>
                      ) : (
                        <>
                          <Lock size={12} color="#94a3b8" /> {(info as any).progressText || 'Noch nicht freigeschaltet'}
                        </>
                      )}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 950, letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center' }}>
                      <span style={{ color: '#34a853' }}>Campus</span>
                      <span style={{ color: '#94a3b8', margin: '0 1px' }}>-</span>
                      <span style={{ color: '#facc15' }}>Groovelab</span>
                    </span>
                  </div>

                  {/* Modal Action Buttons (Clean & Non-overflowing) */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2, marginTop: '4px' }}>
                    {isCollected && shareCard && (
                      <button
                        type="button"
                        onClick={() => shareCard(st, activeTopic)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '11px 16px',
                          fontSize: '0.86rem',
                          fontWeight: 950,
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        <Download size={16} />
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
                          borderRadius: '14px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
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
                        color: '#cbd5e1',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        fontSize: '0.80rem',
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

          {/* STICKER AWARD CELEBRATION 3D GOLDSTANDARD MODAL */}
          {awardedStickerToAnimate && (
            <StudentStickerAwardCelebrationModal
              sticker={awardedStickerToAnimate}
              actualStudentName={actualStudentName || student?.first_name || 'Musiker'}
              studentInstrument={studentInstrument || student?.instrument}
              schoolName={schoolName || student?.school_name}
              selectedSchoolYear={selectedSchoolYear}
              topicName={topicName}
              onDownloadJpg={(st, t) => downloadShareCard(st, t)}
              onStickInAlbum={() => setAwardedStickerToAnimate(null)}
            />
          )}

          {/* Safe-Area Spacer for Mobile / Gestures Bar */}
          <div style={{ height: 'calc(84px + env(safe-area-inset-bottom, 24px))', width: '100%', flexShrink: 0 }} />
        </div>
  );
};
