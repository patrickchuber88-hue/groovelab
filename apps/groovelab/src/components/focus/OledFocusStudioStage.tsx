import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, Pause, CheckCircle, Square, X, Target,
  GraduationCap, Music, BookOpen, Smartphone, Volume2,
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { AuthoritativeHomeworkWidget } from '../student/homework/AuthoritativeHomeworkWidget';
import { ZenPlayAlongDock } from '../campus/ZenPlayAlongDock';
import { AudioTrackItem } from '../AudioTrackCarousel';
import { AuthoritativeHomeworkPlan } from '../student/hooks/useAuthoritativeHomeworkPlan';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface OledFocusStudioStageProps {
  /** Aktuell verstrichene Sekunden */
  elapsedSeconds: number;
  /** Ziel-Fokuszeit in Minuten (z. B. 3, 15, 20) */
  targetMinutes: number;
  /** Ob der Timer aktuell pausiert ist */
  isPaused: boolean;
  /** Ob das Tagesziel bereits erreicht wurde (oder Extra-Zeit läuft) */
  isGoalReached: boolean;
  /** Optionaler Pre-Start Countdown (z. B. 3, 2, 1) */
  preStartCountdown?: number | null;
  /** Callback beim Umschalten von Pause / Weiter */
  onTogglePause?: () => void;
  /** Callback beim erfolgreichen Abschließen / Beenden der Session */
  onFinishSession: () => void;
  /** Callback beim Verwerfen / Abbrechen der Session */
  onAbortSession?: () => void;
  /** Didaktischer Aufgabenplan (Hausaufgaben, Audio-Tracks etc.) */
  homeworkPlan?: AuthoritativeHomeworkPlan | null;
  /** Optionaler Callback zum Öffnen des Aufgabenhefts / der Notenansicht */
  onOpenHomeworkBook?: () => void;
  /** Instrumenten-Bezeichnung für personalisierte Quotes */
  instrumentLabel?: string;
  /** Aktueller Schüler-Datensatz */
  studentUser?: any;
  /** Schüler-ID */
  studentId?: string | null;
  /** Lokaler Fortschritt (Lehrwerke/Zuweisungen) */
  localProgress?: any[];
  /** Lehrwerke-Fortschritt */
  lehrwerke?: any[];
  /** Fortschritts-Items */
  progressItems?: any[];
  /** Aktive Song-Skills */
  activeSongSkills?: any[];
  /** Zugeordnete Campus-Songs */
  assignedCampusSongs?: any[];
  /** Audio-Tracks der Lehrkraft (Play-Alongs / Aufgaben-Takes) */
  audioTracks?: AudioTrackItem[];
  /** Ob das Gerät korrekt flach bzw. im Notenständer liegt */
  isPhoneFlat?: boolean;
  /** Ob Notenständer-Modus (Tablet ~75° Neigung) aktiv ist */
  isMusicStandMode?: boolean;
  /** Zuweisung einer CSS-Klasse */
  className?: string;
  /** Zuweisung von Inline-Styles */
  style?: React.CSSProperties;
}

/**
 * 🏛️ 0,1% DeepMind Enterprise Goldstandard: OledFocusStudioStage
 * 
 * Universelle, reflex- und ablenkungsfreie Dark-Studio-Bühne für:
 * - Mobile QR-Landingpage (Handy flach am Instrument / Pitch Black OLED)
 * - iPad / Tablet (Notenständer-Modus mit 60:40 Split & 56px Jumbo Targets)
 * - Desktop Dashboard (Zentriertes Pro-Studio Floating Atelier)
 * 
 * Gestaltungs- & Architektur-Axiome:
 * 1. Apple 2-Farben-Doktrin: Filled Grün (Beenden), Soft-Amber (Pause), Ghost Outline (Abbrechen).
 * 2. WCAG 2.2 AA / BFSG: Screenreader-Schutz (aria-hidden auf Sekunden-Tick, aria-live für Meilensteine).
 * 3. Ziffern-Jitter-Schutz: font-variant-numeric: tabular-nums verhindert horizontales Wackeln.
 * 4. Sound Before Sight: ZenPlayAlongDock mit Theme "dark" für sofortige Referenzakustik.
 * 5. Didaktische Kontinuität: AuthoritativeHomeworkWidget im transluzenten Dark Glass HUD.
 */
export const OledFocusStudioStage: React.FC<OledFocusStudioStageProps> = ({
  elapsedSeconds,
  targetMinutes,
  isPaused,
  isGoalReached,
  preStartCountdown = null,
  onTogglePause,
  onFinishSession,
  onAbortSession,
  homeworkPlan,
  onOpenHomeworkBook,
  instrumentLabel = 'Dein Instrument',
  studentUser,
  studentId,
  localProgress = [],
  lehrwerke = [],
  progressItems = [],
  activeSongSkills = [],
  assignedCampusSongs = [],
  audioTracks = [],
  isPhoneFlat = true,
  isMusicStandMode = false,
  className = '',
  style = {}
}) => {
  const [showHomeworkDetailsMobile, setShowHomeworkDetailsMobile] = useState(false);
  const targetSeconds = Math.max(60, targetMinutes * 60);

  // Zeitformatierung mit Tabular Nums (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Ring Geometrie (Radius 95, Circumference 596.9)
  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, elapsedSeconds / targetSeconds);
  const strokeDashoffset = circumference - (circumference * progressRatio);

  // Extra-Zeit (über das Ziel hinaus)
  const isExtraTime = elapsedSeconds > targetSeconds;

  // Responsive Device-Erkennung für Layout-Split
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth <= 1180;
  const isDesktop = viewportWidth > 1180;

  // Tastatur-Kürzel für Desktop (Space = Pause, Enter = Beenden, Esc = Abbrechen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Wenn User in einem Formularfeld tippt -> ignorieren
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePause?.();
      } else if (e.key === 'Escape' && onAbortSession) {
        e.preventDefault();
        if (confirm('Möchtest du diese Fokus-Session wirklich verwerfen?')) {
          onAbortSession();
        }
      } else if (e.key === 'Enter' && isGoalReached) {
        e.preventDefault();
        onFinishSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePause, onAbortSession, onFinishSession, isGoalReached]);

  // Audio-Tracks auflösen: Entweder explizit übergeben oder aus dem HomeworkPlan
  const resolvedTracks: AudioTrackItem[] = useMemo(() => {
    if (audioTracks && audioTracks.length > 0) return audioTracks;
    if (homeworkPlan?.audioTracks && homeworkPlan.audioTracks.length > 0) {
      return homeworkPlan.audioTracks.map((t, idx) => ({
        id: `track-${idx}`,
        url: t.url,
        title: t.label || `Referenz-Take ${idx + 1}`,
        label: t.label || `Referenz-Take ${idx + 1}`,
        duration: t.duration || 0,
        author: t.author || (studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Lehrkraft')
      }));
    }
    return [];
  }, [audioTracks, homeworkPlan, studentUser]);

  return (
    <div
      id="oled-focus-studio-stage"
      role="region"
      aria-label="Fokus-Übestudio"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        background: isMobile ? '#000000' : 'radial-gradient(ellipse at 50% 30%, #0d131f 0%, #06090e 65%, #000000 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile
          ? 'max(12px, env(safe-area-inset-top, 12px)) 16px max(16px, env(safe-area-inset-bottom, 16px)) 16px'
          : (isTablet ? '20px 24px' : '24px 32px'),
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...style
      }}
      className={`oled-studio-stage-wrapper ${className}`}
    >
      {/* BFSG & Screenreader Meilenstein-Ansage (Kein Sekunden-Spam!) */}
      <div
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      >
        {isGoalReached
          ? 'Tagesziel erreicht! Du kannst die Übung jetzt erfolgreich abschließen.'
          : (isPaused ? 'Übung pausiert.' : 'Fokus-Übung läuft.')}
      </div>

      {/* 3-2-1 Pre-Start Count-In Overlay */}
      {preStartCountdown !== null && preStartCountdown > 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: isMobile ? '140px' : '180px',
            height: isMobile ? '140px' : '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.02) 70%)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(16, 185, 129, 0.3)',
            animation: 'pulseSoft 0.8s infinite ease-in-out'
          }}>
            <span style={{ fontSize: isMobile ? '4.5rem' : '5.5rem', fontWeight: 950, color: '#10b981', lineHeight: 1, fontFamily: 'monospace, sans-serif' }}>
              {preStartCountdown}
            </span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Handy flach hinlegen! 📱
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: isMobile ? '0.85rem' : '0.95rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600, maxWidth: '320px' }}>
              {instrumentLabel} bereit machen · Voller Fokus aufs Üben
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TOP BAR / HUD (Status-Chip, Notenseite & Abbrechen) */}
          {/* ========================================================================= */}
          <header style={{
            width: '100%',
            maxWidth: isTablet ? '900px' : (isDesktop ? '860px' : '440px'),
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}>
              {/* Left Status Chip (Apple 2-Farben Filled Green) */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: isPaused
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
                border: 'none',
                borderRadius: '100px',
                padding: '6px 14px',
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                fontWeight: 850,
                color: isPaused ? '#f59e0b' : '#34d399',
                boxShadow: 'none'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isPaused ? '#f59e0b' : '#10b981',
                  boxShadow: isPaused ? '0 0 8px #f59e0b' : '0 0 8px #10b981'
                }} />
                <span>{isPaused ? 'Übung pausiert' : (isGoalReached ? 'Ziel erreicht!' : 'Fokus aktiv')}</span>
                <GraduationCap size={14} color={isPaused ? '#f59e0b' : '#34d399'} />
              </div>

              {/* Right Abort Action (Ghost Outline / Apple HIG Secondary) */}
              {onAbortSession && (
                <button
                  type="button"
                  onClick={() => {
                    if (isGoalReached || elapsedSeconds >= targetSeconds) {
                      onFinishSession();
                    } else if (confirm('Möchtest du diese Fokus-Session wirklich verwerfen? Der Fortschritt geht verloren.')) {
                      onAbortSession();
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '36px',
                    touchAction: 'manipulation',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-opacity"
                  title="Fokus-Session abbrechen"
                  aria-label="Fokus-Session abbrechen"
                >
                  <X size={14} />
                  <span>Verwerfen</span>
                </button>
              )}
            </div>

            {/* Authoritatives Hausaufgaben-HUD (Dark Glassmorphism) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '18px',
              padding: isMobile ? '8px 12px' : '10px 16px',
              boxSizing: 'border-box'
            }}>
              <AuthoritativeHomeworkWidget
                variant="hud"
                studentId={studentId || studentUser?.id}
                studentUser={studentUser}
                localProgress={localProgress}
                lehrwerke={lehrwerke}
                progressItems={progressItems}
                activeSongSkills={activeSongSkills}
                assignedCampusSongs={assignedCampusSongs}
                theme="dark"
                plan={homeworkPlan || undefined}
                onOpenHomework={onOpenHomeworkBook}
              />
            </div>
          </header>

          {/* ========================================================================= */}
          {/* CENTER STAGE / CONTENT (Split-View auf iPad, Zentriert auf Mobile/Desktop) */}
          {/* ========================================================================= */}
          <main style={{
            flex: 1,
            width: '100%',
            maxWidth: isTablet ? '960px' : (isDesktop ? '860px' : '440px'),
            display: 'flex',
            flexDirection: isTablet ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isTablet ? '32px' : '16px',
            margin: 'auto 0',
            boxSizing: 'border-box'
          }}>
            {/* iPad Linke Spalte: Audio Play-Along Dock */}
            {isTablet && resolvedTracks.length > 0 && (
              <div style={{ flex: '1 1 45%', width: '100%', maxWidth: '420px', zIndex: 12 }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 850, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Referenz-Audio der Lehrkraft
                  </span>
                </div>
                <ZenPlayAlongDock
                  tracks={resolvedTracks}
                  isMusicStandMode={isMusicStandMode}
                  teacherName={studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Deine Lehrkraft'}
                  theme="dark"
                />
              </div>
            )}

            {/* Timer Hero (Zentrierter Kreisring mit Tabular Nums) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '12px'
            }}>
              {/* SVG Ring Container */}
              <div style={{
                position: 'relative',
                width: isMobile ? '200px' : (isTablet ? '240px' : '230px'),
                height: isMobile ? '200px' : (isTablet ? '240px' : '230px'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: isGoalReached
                  ? 'drop-shadow(0 0 24px rgba(16, 185, 129, 0.35))'
                  : 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.15))'
              }}>
                <svg
                  width={isMobile ? '200' : (isTablet ? '240' : '230')}
                  height={isMobile ? '200' : (isTablet ? '240' : '230')}
                  viewBox="0 0 210 210"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                  {/* Background Track Ring */}
                  <circle
                    cx="105"
                    cy="105"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.10)"
                    strokeWidth="5"
                  />
                  {/* Animated Progress Arc */}
                  <circle
                    cx="105"
                    cy="105"
                    r={radius}
                    fill="none"
                    stroke={isGoalReached ? '#10b981' : (isPaused ? '#f59e0b' : '#34d399')}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={isGoalReached ? 0 : strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      transition: isPaused ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s ease'
                    }}
                  />
                </svg>

                {/* Ziffern-Zentrum mit tabular-nums (Anti-Jitter) */}
                <div style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: isMobile ? '3.0rem' : (isTablet ? '4.0rem' : '3.6rem'),
                      fontWeight: 900,
                      color: '#ffffff',
                      fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em',
                      lineHeight: 1
                    }}
                  >
                    {formatTime(elapsedSeconds)}
                  </span>
                  <div style={{
                    marginTop: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: isGoalReached ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '100px',
                    padding: '3px 10px',
                    color: isGoalReached ? '#34d399' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: isMobile ? '0.70rem' : '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {isGoalReached ? (
                      <>
                        <CheckCircle size={12} color="#34d399" />
                        <span>Ziel erreicht {isExtraTime ? `(+${Math.floor((elapsedSeconds - targetSeconds) / 60)}m)` : ''}</span>
                      </>
                    ) : (
                      <>
                        <Target size={12} color="rgba(255, 255, 255, 0.7)" />
                        <span>Ziel: {String(targetMinutes).padStart(2, '0')}:00 Min.</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Zitat / Pädagogischer Impuls (Nur auf Desktop & Tablet) */}
              {!isMobile && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.88rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 650,
                  maxWidth: '360px',
                  lineHeight: 1.4
                }}>
                  „{instrumentLabel} im Studio-Fokus. Präzision formt meisterhaften Klang.“
                </p>
              )}

              {/* Gyro-Sensor-Warnung wenn Smartphone nicht flach liegt */}
              {isMobile && !isPhoneFlat && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '8px 14px',
                  color: '#fca5a5',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  animation: 'pulseSoft 1.5s infinite ease-in-out'
                }}>
                  <Smartphone size={16} color="#ef4444" />
                  <span>Handy flach auf den Tisch legen! 🛑</span>
                </div>
              )}
            </div>

            {/* Mobile / Desktop Audio Play-Along Dock (Unten zentriert) */}
            {!isTablet && resolvedTracks.length > 0 && (
              <div style={{ width: '100%', maxWidth: '440px', marginTop: isMobile ? '8px' : '16px' }}>
                <ZenPlayAlongDock
                  tracks={resolvedTracks}
                  isMusicStandMode={isMusicStandMode}
                  teacherName={studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Deine Lehrkraft'}
                  theme="dark"
                />
              </div>
            )}
          </main>

          {/* ========================================================================= */}
          {/* BOTTOM CONTROLS (Apple 2-Farben Parität: Grün Beenden + Soft Amber Pause) */}
          {/* ========================================================================= */}
          <footer style={{
            width: '100%',
            maxWidth: isTablet ? '900px' : (isDesktop ? '860px' : '440px'),
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10
          }}>
            {/* Pause / Weiter Button (Apple Soft-Tinted) */}
            {onTogglePause && (
              <button
                type="button"
                onClick={onTogglePause}
                style={{
                  flex: isMobile ? 1 : '0 0 auto',
                  minHeight: isMobile ? '50px' : (isTablet ? '56px' : '48px'),
                  padding: isMobile ? '0 16px' : '0 24px',
                  borderRadius: '100px',
                  background: isPaused
                    ? 'rgba(245, 158, 11, 0.22)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: isPaused ? '#fbbf24' : '#ffffff',
                  fontSize: isMobile ? '0.90rem' : '0.95rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'none',
                  touchAction: 'manipulation',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale"
                title={isPaused ? 'Übung fortsetzen (Leertaste)' : 'Übung pausieren (Leertaste)'}
                aria-label={isPaused ? 'Übung fortsetzen' : 'Übung pausieren'}
              >
                {isPaused ? (
                  <>
                    <Play size={16} fill="#fbbf24" color="#fbbf24" />
                    <span>Weiter</span>
                  </>
                ) : (
                  <>
                    <Pause size={16} fill="#ffffff" color="#ffffff" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}

            {/* Haupt-CTA: Abschließen / Beenden (Apple Filled Green, Ausnahmslos border: none) */}
            <button
              type="button"
              onClick={onFinishSession}
              style={{
                flex: 2,
                minHeight: isMobile ? '50px' : (isTablet ? '56px' : '48px'),
                padding: isMobile ? '0 20px' : '0 28px',
                borderRadius: '100px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: isMobile ? '0.95rem' : '1.02rem',
                fontWeight: 950,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
                touchAction: 'manipulation',
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="hover-scale"
              title={isGoalReached ? 'Tagesziel erreicht! Übung abschließen' : 'Übung beenden und Zeit sichern'}
              aria-label="Übung beenden und Zeit sichern"
            >
              <CheckCircle size={18} color="#ffffff" />
              <span>{isGoalReached ? 'Abschließen & Sichern' : 'Beenden & Sichern'}</span>
            </button>
          </footer>
        </>
      )}
    </div>
  );
};
