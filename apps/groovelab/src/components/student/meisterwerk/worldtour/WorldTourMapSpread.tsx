import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Compass, ArrowLeft, Award, Sparkles, Volume2, Info, BookOpen, Star,
  CheckCircle, Globe, ChevronRight, Share2, Printer, MapPin, Play, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { CONTINENTS, WORLD_TOUR_COUNTRIES } from '../../../../domain/worldTourCatalog';
import { WorldTourCountry, ContinentId, WorldTourStudentProgress } from '../../../../types/worldTour';
import { WorldTourService } from '../../../../services/worldTourService';
import { WorldTourScorePlayer } from './WorldTourScorePlayer';
import { WorldTourDiplomaModal } from './WorldTourDiplomaModal';

interface WorldTourMapSpreadProps {
  onBackToHub?: () => void;
  studentName?: string;
  studentInstrument?: string | null;
  uiLevel?: 'junior' | 'teen' | 'pro';
  isMobileView?: boolean;
}

/**
 * 🌍 3D SPHERICAL PROJECTION MATH (Pure TypeScript / Zero Dependencies)
 * Mathematisch exakte orthografische Rotation einer dreidimensionalen Erdkugel.
 */
interface GeoPoint {
  lat: number;
  lon: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number; // z > 0: sichtbare Vorderseite; z < 0: Rückseite
  visible: boolean;
}

function projectOrthographic(
  lat: number,
  lon: number,
  lambda0: number, // Längendrehung in Grad (-180..180)
  phi0: number,    // Breitendrehung / Neigung in Grad (-90..90)
  radius: number,
  cx: number,
  cy: number
): ProjectedPoint {
  const radLat = (lat * Math.PI) / 180;
  const radLon = (lon * Math.PI) / 180;
  const radLam0 = (lambda0 * Math.PI) / 180;
  const radPhi0 = (phi0 * Math.PI) / 180;

  const dLon = radLon - radLam0;

  const cosLat = Math.cos(radLat);
  const sinLat = Math.sin(radLat);
  const cosPhi0 = Math.cos(radPhi0);
  const sinPhi0 = Math.sin(radPhi0);
  const cosDLon = Math.cos(dLon);
  const sinDLon = Math.sin(dLon);

  // 3D-Kugelkoordinaten rotiert
  const x = cosLat * sinDLon;
  const y = cosPhi0 * sinLat - sinPhi0 * cosLat * cosDLon;
  const z = sinPhi0 * sinLat + cosPhi0 * cosLat * cosDLon;

  return {
    x: cx + radius * x,
    y: cy - radius * y,
    z,
    visible: z >= -0.08
  };
}

/**
 * 📍 EXAKTE GEOGRAFISCHE LÄNDERKOORDINATEN DER 13 HYMNEN
 */
interface GlobeCountryBeacon {
  code: string;
  name: string;
  lat: number;
  lon: number;
  flag: string;
  continent: ContinentId;
  chordFrequencies: number[];
}

const GLOBE_BEACONS: GlobeCountryBeacon[] = [
  { code: 'DE', name: 'Deutschland', lat: 51.5, lon: 10.5, flag: '🇩🇪', continent: 'europe', chordFrequencies: [392.00, 493.88, 587.33] },
  { code: 'FR', name: 'Frankreich', lat: 46.8, lon: 2.3, flag: '🇫🇷', continent: 'europe', chordFrequencies: [293.66, 369.99, 440.00, 587.33] },
  { code: 'GB', name: 'Großbritannien', lat: 53.5, lon: -2.0, flag: '🇬🇧', continent: 'europe', chordFrequencies: [392.00, 493.88, 587.33] },
  { code: 'IT', name: 'Italien', lat: 42.5, lon: 12.8, flag: '🇮🇹', continent: 'europe', chordFrequencies: [392.00, 493.88, 659.25] },
  { code: 'ES', name: 'Spanien', lat: 40.2, lon: -3.7, flag: '🇪🇸', continent: 'europe', chordFrequencies: [261.63, 329.63, 392.00, 523.25] },
  { code: 'AT', name: 'Österreich', lat: 47.6, lon: 14.2, flag: '🇦🇹', continent: 'europe', chordFrequencies: [349.23, 440.00, 523.25] },
  { code: 'CH', name: 'Schweiz', lat: 46.8, lon: 8.2, flag: '🇨🇭', continent: 'europe', chordFrequencies: [466.16, 587.33, 698.46] },
  { code: 'NL', name: 'Niederlande', lat: 52.2, lon: 5.3, flag: '🇳🇱', continent: 'europe', chordFrequencies: [349.23, 440.00, 523.25] },
  { code: 'US', name: 'USA', lat: 39.5, lon: -98.3, flag: '🇺🇸', continent: 'americas', chordFrequencies: [233.08, 349.23, 466.16, 587.33] },
  { code: 'CA', name: 'Kanada', lat: 56.0, lon: -106.0, flag: '🇨🇦', continent: 'americas', chordFrequencies: [349.23, 440.00, 523.25] },
  { code: 'JP', name: 'Japan', lat: 36.2, lon: 138.2, flag: '🇯🇵', continent: 'asia', chordFrequencies: [293.66, 349.23, 440.00] },
  { code: 'AU', name: 'Australien', lat: -25.2, lon: 133.7, flag: '🇦🇺', continent: 'oceania', chordFrequencies: [392.00, 493.88, 587.33] },
  { code: 'EU', name: 'Europa-Union', lat: 50.8, lon: 4.3, flag: '🇪🇺', continent: 'europe', chordFrequencies: [293.66, 369.99, 440.00] }
];

/**
 * 🗺️ REALE SPHERISCHE KONTINENT-POLYGON-DATEN (Breite / Länge)
 */
const SPHERICAL_LANDMASSES: Array<{ id: string; points: Array<[number, number]>; fill: string }> = [
  // Europa & Skandinavien
  {
    id: 'europe-main',
    fill: '#22c55e',
    points: [
      [36, -6], [37, -9], [42, -9], [43.5, -8], [43.5, -2], [47, -3], [48.5, -5],
      [49.5, -1], [51, 2], [54, 8], [55, 12], [54, 18], [45, 18], [40, 19],
      [37, 23], [40, 26], [45, 30], [55, 30], [60, 28], [55, 20], [50, 14],
      [47, 8], [44, 8], [41, 14], [38, 16], [36, 14], [38, -1], [36, -6]
    ]
  },
  {
    id: 'british-isles',
    fill: '#22c55e',
    points: [
      [50, -5], [51.5, 1], [53, 0], [55, -1.5], [58.5, -3.5], [58, -5], [55, -5], [51.5, -5], [50, -5]
    ]
  },
  {
    id: 'ireland',
    fill: '#22c55e',
    points: [
      [51.5, -9.5], [54, -6], [55, -7], [54, -10], [51.5, -9.5]
    ]
  },
  {
    id: 'scandinavia',
    fill: '#22c55e',
    points: [
      [56, 12], [58, 6], [62, 5], [69, 15], [71, 25], [69, 31], [65, 23], [60, 19], [56, 12]
    ]
  },

  // Afrika
  {
    id: 'africa',
    fill: '#eab308',
    points: [
      [35, -6], [37, 10], [31, 32], [22, 38], [12, 44], [12, 51], [0, 42],
      [-12, 40], [-26, 33], [-34, 18], [-23, 14], [-5, 12], [5, 9], [4, 7],
      [5, -4], [14, -17], [21, -17], [30, -10], [35, -6]
    ]
  },
  {
    id: 'madagascar',
    fill: '#eab308',
    points: [
      [-12, 49], [-16, 49.5], [-25, 47], [-25, 43], [-16, 44], [-12, 49]
    ]
  },

  // Asien
  {
    id: 'asia',
    fill: '#10b981',
    points: [
      [75, 100], [70, 175], [60, 165], [50, 140], [42, 131], [38, 120], [22, 114],
      [10, 105], [1, 104], [16, 95], [22, 89], [8, 77], [25, 68], [25, 57],
      [13, 44], [28, 34], [37, 36], [41, 29], [45, 50], [60, 60], [70, 65], [75, 100]
    ]
  },
  {
    id: 'japan',
    fill: '#10b981',
    points: [
      [45, 142], [43, 145], [35, 140], [31, 131], [33, 130], [37, 138], [41, 140], [45, 142]
    ]
  },

  // Nordamerika
  {
    id: 'north-america',
    fill: '#f59e0b',
    points: [
      [70, -160], [70, -130], [60, -90], [55, -80], [60, -65], [47, -53], [44, -65],
      [30, -81], [25, -80], [25, -97], [16, -93], [8, -77], [18, -105], [32, -117],
      [48, -125], [60, -140], [65, -168], [70, -160]
    ]
  },
  {
    id: 'greenland',
    fill: '#f59e0b',
    points: [
      [83, -30], [70, -20], [60, -44], [70, -55], [78, -70], [83, -30]
    ]
  },

  // Südamerika
  {
    id: 'south-america',
    fill: '#f97316',
    points: [
      [12, -73], [10, -62], [5, -51], [-3, -40], [-8, -35], [-23, -43], [-35, -57],
      [-55, -67], [-50, -75], [-18, -71], [-5, -81], [2, -78], [12, -73]
    ]
  },

  // Australien & Ozeanien
  {
    id: 'australia',
    fill: '#8b5cf6',
    points: [
      [-12, 132], [-11, 142], [-24, 153], [-38, 145], [-35, 115], [-22, 114], [-15, 124], [-12, 132]
    ]
  },
  {
    id: 'new-zealand',
    fill: '#8b5cf6',
    points: [
      [-35, 173], [-37, 178], [-41, 175], [-46, 168], [-44, 169], [-35, 173]
    ]
  }
];

export const WorldTourMapSpread: React.FC<WorldTourMapSpreadProps> = ({
  onBackToHub,
  studentName = 'Musikschüler',
  studentInstrument = 'Klavier',
  uiLevel = 'teen',
  isMobileView = false
}) => {
  const [activeView, setActiveView] = useState<'map' | 'score'>('map');
  const [selectedContinent, setSelectedContinent] = useState<ContinentId | 'all'>('all');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('DE');
  const [progressMap, setProgressMap] = useState<Record<string, WorldTourStudentProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDiplomaOpen, setIsDiplomaOpen] = useState(false);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(null);

  // 🌍 GLOBUS DREH-ZUSTAND
  // Startet zentriert auf Europa: Lambda = 15° E, Phi = 35° N
  const [rotation, setRotation] = useState<{ lambda: number; phi: number }>({ lambda: 15, phi: 35 });
  const [globeRadius, setGlobeRadius] = useState<number>(240);

  // Dragging & Velocity State
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Load student progress
  useEffect(() => {
    let isMounted = true;
    WorldTourService.fetchStudentProgress().then(res => {
      if (isMounted) {
        setProgressMap(res);
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const activeCountry = useMemo(() => {
    return WORLD_TOUR_COUNTRIES.find(c => c.code === selectedCountryCode) || WORLD_TOUR_COUNTRIES[0];
  }, [selectedCountryCode]);

  const schoolStats = useMemo(() => {
    return WorldTourService.calculateSchoolWorldMilestone(progressMap);
  }, [progressMap]);

  // 🎵 Web Audio Kultur-Jingle (1.2 Sekunden warmer Akkord)
  const playCultureJingle = useCallback((frequencies: number[]) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      frequencies.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2 / frequencies.length, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.25);
      });
    } catch {
      // Graceful degradation
    }
  }, []);

  const handleMasteryAchieved = useCallback((stars: number, score: number, xp: number) => {
    setProgressMap(prev => ({
      ...prev,
      [activeCountry.code]: {
        countryCode: activeCountry.code,
        stars,
        bestScorePercent: score,
        bestTempoBpm: activeCountry.score.defaultBpm,
        instrument: studentInstrument || undefined,
        isUnlocked: true,
        unlockedAt: new Date().toISOString()
      }
    }));
  }, [activeCountry.code, activeCountry.score.defaultBpm, studentInstrument]);

  // Butterweiche animierte Rotation zu Zielkoordinaten (SLERP-Kameraflug)
  const rotateToTarget = useCallback((targetLam: number, targetPhi: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const startLam = rotation.lambda;
    const startPhi = rotation.phi;
    const startTime = performance.now();
    const duration = 650; // ms

    // Kürzester Rotationsweg auf der Kugel
    let dLam = ((targetLam - startLam + 540) % 360) - 180;
    const dPhi = targetPhi - startPhi;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - t, 3);

      setRotation({
        lambda: startLam + dLam * ease,
        phi: startPhi + dPhi * ease
      });

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [rotation]);

  // Kontinent-Auswahl rotiert den Globus direkt zur passenden Region
  const handleSelectContinent = (contId: ContinentId | 'all') => {
    setSelectedContinent(contId);
    if (contId === 'all') {
      rotateToTarget(15, 30);
    } else if (contId === 'europe') {
      rotateToTarget(12, 48);
    } else if (contId === 'americas') {
      rotateToTarget(-95, 38);
    } else if (contId === 'asia') {
      rotateToTarget(125, 35);
    } else if (contId === 'oceania') {
      rotateToTarget(140, -25);
    } else if (contId === 'africa') {
      rotateToTarget(20, 5);
    }
  };

  // Klick auf ein Land: Zentriert das Land sanft auf der Kugel und spielt den Jingle ab!
  const handlePinClick = (beacon: GlobeCountryBeacon) => {
    setSelectedCountryCode(beacon.code);
    playCultureJingle(beacon.chordFrequencies);
    rotateToTarget(beacon.lon, beacon.lat);
  };

  // 🖱️ DRAGGING & TOUCH-SPIN LOGIK (Physikalischer Schwung mit Reibung)
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: clientX, y: clientY };
    velocityRef.current = { vx: 0, vy: 0 };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - lastMousePosRef.current.x;
    const dy = clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: clientX, y: clientY };

    velocityRef.current = { vx: dx * 0.4, vy: dy * 0.4 };

    setRotation(prev => ({
      lambda: prev.lambda - dx * 0.45,
      phi: Math.max(-65, Math.min(65, prev.phi + dy * 0.45))
    }));
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Sanftes Ausgleiten mit Reibungs-Dämpfung
    const coast = () => {
      velocityRef.current.vx *= 0.92;
      velocityRef.current.vy *= 0.92;

      if (Math.abs(velocityRef.current.vx) > 0.05 || Math.abs(velocityRef.current.vy) > 0.05) {
        setRotation(prev => ({
          lambda: prev.lambda - velocityRef.current.vx,
          phi: Math.max(-65, Math.min(65, prev.phi + velocityRef.current.vy))
        }));
        animFrameRef.current = requestAnimationFrame(coast);
      }
    };
    animFrameRef.current = requestAnimationFrame(coast);
  };

  const handlePlayStory = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!isStoryPlaying) {
        const utterance = new SpeechSynthesisUtterance(activeCountry.story15s);
        utterance.lang = 'de-DE';
        utterance.rate = 0.95;
        utterance.onend = () => setIsStoryPlaying(false);
        utterance.onerror = () => setIsStoryPlaying(false);
        setIsStoryPlaying(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsStoryPlaying(false);
      }
    }
  };

  const activeProgress = progressMap[activeCountry.code];
  const activeStars = activeProgress?.stars ?? 0;
  const totalMasteredCountries = useMemo(() => {
    return Object.values(progressMap).filter(p => (p.stars ?? 0) > 0).length;
  }, [progressMap]);

  // Globus-Mittelpunkt im 1400 × 640 Canvas
  const cx = 700;
  const cy = 290;

  // 3D-Gradnetz: Parallelen (Äquator, Wendekreise, Polarkreise)
  const graticuleParallels = useMemo(() => {
    const latitudes = [-66.5, -30, -23.5, 0, 23.5, 30, 66.5];
    return latitudes.map(lat => {
      const points: Array<{ x: number; y: number; visible: boolean }> = [];
      for (let lon = -180; lon <= 180; lon += 6) {
        const pt = projectOrthographic(lat, lon, rotation.lambda, rotation.phi, globeRadius, cx, cy);
        points.push(pt);
      }
      return { lat, points };
    });
  }, [rotation, globeRadius]);

  // 3D-Gradnetz: Meridiane
  const graticuleMeridians = useMemo(() => {
    const longitudes = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
    return longitudes.map(lon => {
      const points: Array<{ x: number; y: number; visible: boolean }> = [];
      for (let lat = -80; lat <= 80; lat += 5) {
        const pt = projectOrthographic(lat, lon, rotation.lambda, rotation.phi, globeRadius, cx, cy);
        points.push(pt);
      }
      return { lon, points };
    });
  }, [rotation, globeRadius]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: activeView === 'map' ? '#0f172a' : '#fcfaf7',
      position: 'relative',
      overflow: 'hidden',
      color: '#f8fafc',
      userSelect: 'none'
    }}>
      {/* 🧭 Top Expeditions-HUD Header (Dark Space Gold Edition) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: isMobileView ? '10px 14px' : '12px 24px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        zIndex: 20
      }}>
        {/* Navigation & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeView === 'score' ? (
            <button
              onClick={() => setActiveView('map')}
              aria-label="Zurück zum Klang-Globus"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                background: '#38bdf8',
                border: 'none',
                color: '#0f172a',
                fontWeight: 900,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <ArrowLeft size={16} />
              <span>Zum Klang-Globus 🌍</span>
            </button>
          ) : onBackToHub ? (
            <button
              onClick={onBackToHub}
              aria-label="Zurück zum Studio"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 750,
                fontSize: '0.84rem',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <ArrowLeft size={16} />
              <span>Studio</span>
            </button>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>🌎</span>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                The Golden Globe of Sound • 3D Klang-Globus
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 650 }}>
                Drehe die Erdkugel und entdecke das Weltmusikerbe
              </span>
            </div>
          </div>
        </div>

        {/* HUD Progress Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Zoom In / Out Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', padding: '3px', borderRadius: '100px' }}>
            <button
              onClick={() => setGlobeRadius(r => Math.min(340, r + 25))}
              style={{ background: 'none', border: 'none', color: '#ffffff', padding: '6px 8px', cursor: 'pointer', borderRadius: '50%' }}
              title="Globus vergrößern"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => setGlobeRadius(r => Math.max(180, r - 25))}
              style={{ background: 'none', border: 'none', color: '#ffffff', padding: '6px 8px', cursor: 'pointer', borderRadius: '50%' }}
              title="Globus verkleinern"
            >
              <ZoomOut size={15} />
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.80rem',
            fontWeight: 800,
            color: '#ffffff'
          }}>
            <span>🌍 {totalMasteredCountries} / 13 Länder</span>
            <span style={{ opacity: 0.35 }}>•</span>
            <span style={{ color: '#facc15' }}>✨ {schoolStats.totalXP} XP</span>
          </div>

          <button
            onClick={() => setIsDiplomaOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              border: 'none',
              color: '#0f172a',
              fontWeight: 850,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(234, 179, 8, 0.35)',
              touchAction: 'manipulation'
            }}
            className="hover-scale"
            title="Drucke dein offizielles A4-Expeditions-Diplom"
          >
            <Printer size={14} strokeWidth={2.6} />
            <span>Diplom</span>
          </button>
        </div>

        {/* Kontinent-Schnellreise Buttons */}
        {activeView === 'map' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            width: '100%',
            paddingTop: '6px'
          }} className="custom-scrollbar">
            <button
              onClick={() => handleSelectContinent('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: selectedContinent === 'all' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                background: selectedContinent === 'all' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                color: selectedContinent === 'all' ? '#0f172a' : '#cbd5e1',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              🌐 Weltübersicht
            </button>
            {CONTINENTS.map(cont => {
              const isSelected = selectedContinent === cont.id;
              return (
                <button
                  key={cont.id}
                  onClick={() => handleSelectContinent(cont.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    border: isSelected ? `2px solid ${cont.color}` : '1px solid rgba(255,255,255,0.15)',
                    background: isSelected ? cont.color : 'rgba(255,255,255,0.06)',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: isSelected ? `0 2px 10px ${cont.color}50` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cont.emoji}</span>
                  <span>{cont.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ANSICHT 1: DER INTERAKTIVE 3D-GLOBUS (DREHBAR & TOUCH-INTERAKTIV)         */}
      {/* ========================================================================= */}
      {activeView === 'map' ? (
        <div
          onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onTouchStart={e => {
            if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={e => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handlePointerUp}
          style={{
            flex: 1,
            width: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: isDraggingRef.current ? 'grabbing' : 'grab',
            background: 'radial-gradient(ellipse at 50% 45%, #1e293b 0%, #0f172a 60%, #020617 100%)'
          }}
        >
          {/* Dezente Sternen-Partikel im Weltall */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 150px 80px, #e2e8f0, rgba(0,0,0,0)),
              radial-gradient(1.5px 1.5px at 320px 240px, #38bdf8, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 580px 140px, #ffffff, rgba(0,0,0,0)),
              radial-gradient(1.5px 1.5px at 890px 70px, #facc15, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 1120px 210px, #e2e8f0, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 1340px 90px, #ffffff, rgba(0,0,0,0))
            `,
            backgroundSize: '400px 300px',
            opacity: 0.6,
            pointerEvents: 'none'
          }} />

          {/* Hinweis-Overlay für Kinder: „Klicke & Ziehe zum Drehen“ */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: '0.74rem',
            color: '#94a3b8',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <span>👆 Ziehe den Globus mit Maus oder Finger</span>
          </div>

          {/* HAUPT-SVG DES 3D-GLOBUS (1400 × 640) */}
          <svg
            viewBox="0 0 1400 640"
            style={{
              width: '100%',
              height: '100%',
              maxHeight: 'calc(100vh - 160px)',
              overflow: 'visible',
              pointerEvents: 'auto'
            }}
          >
            <defs>
              {/* Ozean-Tiefen-Gradient mit Sonnenlicht von oben links */}
              <radialGradient id="globeOcean" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="45%" stopColor="#1e3a8a" />
                <stop offset="85%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* Erdatmosphäre Äußerer Halo (Rayleigh-Streuung) */}
              <radialGradient id="atmosphereHalo" cx="50%" cy="50%" r="50%">
                <stop offset="90%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="96%" stopColor="#38bdf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>

              {/* Sphärischer Schatten an den Kanten (Vignette) */}
              <radialGradient id="globeShadow" cx="50%" cy="50%" r="50%">
                <stop offset="75%" stopColor="transparent" />
                <stop offset="95%" stopColor="#020617" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
              </radialGradient>

              {/* Horizont-Beschneidung: Nur Punkte innerhalb der Kugel */}
              <clipPath id="globeSphereClip">
                <circle cx={cx} cy={cy} r={globeRadius} />
              </clipPath>

              {/* Goldener Schein für ausgewählte Pins */}
              <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodOpacity="0.8" floodColor="#facc15" />
              </filter>
            </defs>

            {/* 1. Äußere leuchtende Atmosphäre (Halo) */}
            <circle cx={cx} cy={cy} r={globeRadius + 18} fill="url(#atmosphereHalo)" pointerEvents="none" />

            {/* 2. Ozean-Kugel (Der Planetenkörper) */}
            <circle
              cx={cx}
              cy={cy}
              r={globeRadius}
              fill="url(#globeOcean)"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="2"
              filter="drop-shadow(0 15px 40px rgba(0, 0, 0, 0.6))"
            />

            {/* ========================================================================= */}
            {/* ELEMENTE INNERHALB DER KUGEL-BESCHNEIDUNG                                  */}
            {/* ========================================================================= */}
            <g clipPath="url(#globeSphereClip)">
              {/* 3. 3D-Gradnetz: Längenkreise (Meridiane) */}
              {graticuleMeridians.map((meridian, mIdx) => {
                const visibleSegments: string[] = [];
                let currentPath = '';

                meridian.points.forEach((pt, pIdx) => {
                  if (pt.visible) {
                    if (!currentPath) {
                      currentPath = `M ${pt.x},${pt.y}`;
                    } else {
                      currentPath += ` L ${pt.x},${pt.y}`;
                    }
                  } else {
                    if (currentPath) {
                      visibleSegments.push(currentPath);
                      currentPath = '';
                    }
                  }
                });
                if (currentPath) visibleSegments.push(currentPath);

                return visibleSegments.map((d, sIdx) => (
                  <path
                    key={`meridian-${mIdx}-${sIdx}`}
                    d={d}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="0.8"
                    strokeDasharray="3 4"
                    opacity="0.25"
                  />
                ));
              })}

              {/* 4. 3D-Gradnetz: Breitenkreise (Äquator, Wendekreise) */}
              {graticuleParallels.map((parallel, pIdx) => {
                const visibleSegments: string[] = [];
                let currentPath = '';

                parallel.points.forEach(pt => {
                  if (pt.visible) {
                    if (!currentPath) {
                      currentPath = `M ${pt.x},${pt.y}`;
                    } else {
                      currentPath += ` L ${pt.x},${pt.y}`;
                    }
                  } else {
                    if (currentPath) {
                      visibleSegments.push(currentPath);
                      currentPath = '';
                    }
                  }
                });
                if (currentPath) visibleSegments.push(currentPath);

                const isEquator = parallel.lat === 0;

                return visibleSegments.map((d, sIdx) => (
                  <path
                    key={`parallel-${pIdx}-${sIdx}`}
                    d={d}
                    fill="none"
                    stroke={isEquator ? '#facc15' : '#38bdf8'}
                    strokeWidth={isEquator ? 1.5 : 0.8}
                    strokeDasharray={isEquator ? '5 4' : '3 4'}
                    opacity={isEquator ? 0.6 : 0.25}
                  />
                ));
              })}

              {/* 5. 3D-Landmassen (Smaragdgrün & Goldgelb) */}
              {SPHERICAL_LANDMASSES.map(land => {
                // Projiziere alle Punkte des Kontinents
                const projected = land.points.map(([lat, lon]) =>
                  projectOrthographic(lat, lon, rotation.lambda, rotation.phi, globeRadius, cx, cy)
                );

                // Prüfe, ob mindestens ein Teil des Kontinents auf der Vorderseite liegt
                const visibleCount = projected.filter(p => p.visible).length;
                if (visibleCount === 0) return null;

                // Erzeuge geschlossenen Pfad
                let pathString = `M ${projected[0].x},${projected[0].y}`;
                for (let i = 1; i < projected.length; i++) {
                  pathString += ` L ${projected[i].x},${projected[i].y}`;
                }
                pathString += ' Z';

                return (
                  <path
                    key={land.id}
                    d={pathString}
                    fill={land.fill}
                    stroke="#15803d"
                    strokeWidth="1.2"
                    opacity={visibleCount > projected.length * 0.3 ? 0.92 : 0.4}
                    style={{ transition: 'fill 0.2s ease' }}
                  />
                );
              })}

              {/* 6. Sphärische Vignette / Kanten-Schatten */}
              <circle cx={cx} cy={cy} r={globeRadius} fill="url(#globeShadow)" pointerEvents="none" />
            </g>

            {/* ========================================================================= */}
            {/* 7. INTERAKTIVE KULTUR-BEACONS DER 13 LÄNDER AUF DER 3D-KUGEL             */}
            {/* ========================================================================= */}
            {GLOBE_BEACONS.map(beacon => {
              const proj = projectOrthographic(
                beacon.lat,
                beacon.lon,
                rotation.lambda,
                rotation.phi,
                globeRadius,
                cx,
                cy
              );

              // Nur auf der sichtbaren Vorderseite der Erdkugel anzeigen
              if (proj.z < -0.02) return null;

              const isSelected = selectedCountryCode === beacon.code;
              const isHovered = hoveredCountryCode === beacon.code;
              const progress = progressMap[beacon.code];
              const stars = progress?.stars ?? 0;
              const isMastered = stars > 0;

              // Perspektivische 3D-Tiefenskalierung: Im Zentrum groß, am Rand kleiner
              const depthScale = Math.max(0.65, Math.min(1.2, 0.75 + proj.z * 0.45));
              const depthOpacity = Math.max(0.35, Math.min(1, proj.z * 2.5 + 0.15));

              const badgeW = (beacon.name.length > 9 ? 112 : 98) * depthScale;
              const badgeH = 26 * depthScale;

              return (
                <g
                  key={beacon.code}
                  transform={`translate(${proj.x}, ${proj.y})`}
                  opacity={depthOpacity}
                  onClick={e => {
                    e.stopPropagation();
                    handlePinClick(beacon);
                  }}
                  onMouseEnter={() => setHoveredCountryCode(beacon.code)}
                  onMouseLeave={() => setHoveredCountryCode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Radar-Impuls bei Auswahl */}
                  {isSelected && (
                    <circle cx="0" cy="0" r={16 * depthScale} fill="none" stroke="#facc15" strokeWidth="2">
                      <animate attributeName="r" values={`${10 * depthScale};${28 * depthScale}`} dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Hotspot Leuchtpunkt auf der Erde */}
                  <circle
                    cx="0"
                    cy="0"
                    r={(isSelected ? 6 : isHovered ? 5 : 4) * depthScale}
                    fill={isMastered ? '#facc15' : isSelected ? '#ffffff' : '#38bdf8'}
                    stroke={isSelected ? '#facc15' : '#0f172a'}
                    strokeWidth={1.8 * depthScale}
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
                  />

                  {/* Verbindungs-Stift zur 3D-Pille */}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={-16 * depthScale}
                    stroke={isSelected ? '#facc15' : 'rgba(255,255,255,0.7)'}
                    strokeWidth={1.5 * depthScale}
                  />

                  {/* Volltext Flaggen-Pille schwebt über dem Land */}
                  <g transform={`translate(${-badgeW / 2}, ${-16 * depthScale - badgeH})`}>
                    <rect
                      x="0"
                      y="0"
                      width={badgeW}
                      height={badgeH}
                      rx={badgeH / 2}
                      fill={isSelected ? '#0f172a' : isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.94)'}
                      stroke={isSelected ? '#facc15' : isMastered ? '#eab308' : '#38bdf8'}
                      strokeWidth={(isSelected ? 2.2 : 1.4) * depthScale}
                      filter={isSelected ? 'url(#goldGlow)' : 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))'}
                    />

                    {/* Flagge */}
                    <text
                      x={8 * depthScale}
                      y={badgeH - 8 * depthScale}
                      fontSize={13 * depthScale}
                    >
                      {beacon.flag}
                    </text>

                    {/* Ausgeschriebener Name */}
                    <text
                      x={26 * depthScale}
                      y={badgeH - 9 * depthScale}
                      fontSize={9.5 * depthScale}
                      fontWeight="900"
                      fill={isSelected ? '#ffffff' : '#0f172a'}
                    >
                      {beacon.name}
                    </text>

                    {/* Meister-Stern */}
                    {isMastered && (
                      <text
                        x={badgeW - 12 * depthScale}
                        y={-2}
                        fontSize={11 * depthScale}
                      >
                        ⭐
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>

          {/* ========================================================================= */}
          {/* 🗂️ SCHWEBENDE EXPEDITIONS-AKTE (Floating Glassmorphism Card am Boden)     */}
          {/* ========================================================================= */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '20px',
              right: '20px',
              maxWidth: '920px',
              margin: '0 auto',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              zIndex: 15,
              animation: 'fade-in 0.25s ease'
            }}
          >
            {/* Country Identity Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '2.6rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
                {activeCountry.flagEmoji}
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                    {activeCountry.name}
                  </h3>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8'
                  }}>
                    {activeCountry.era} ({activeCountry.composedYear})
                  </span>
                  {activeStars > 0 && (
                    <span style={{ fontSize: '0.9rem' }}>
                      {'⭐'.repeat(activeStars)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 750, color: '#38bdf8', marginTop: '2px' }}>
                  „{activeCountry.anthemTitle}“
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Komponist: <strong style={{ color: '#ffffff' }}>{activeCountry.composer}</strong> ({activeCountry.composerDates})
                </div>
              </div>
            </div>

            {/* Quick Actions (15s Story Audio & Primary "Notenpult öffnen ➔" Button) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handlePlayStory}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '12px',
                  background: isStoryPlaying ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                title="15-Sekunden Audio-Geschichte anhören"
              >
                <Volume2 size={16} />
                <span>{isStoryPlaying ? 'Pause' : 'Story (15s)'}</span>
              </button>

              <button
                onClick={() => setActiveView('score')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
                  color: '#0f172a',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(250, 204, 21, 0.4)',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                title="Notenpult öffnen und Hymne üben oder prüfen"
              >
                <span>Notenpult öffnen</span>
                <ChevronRight size={18} strokeWidth={2.8} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ANSICHT 2: DAS VOLLFLÄCHIGE NOTEN- & ÜBE-PULT                             */
        /* ========================================================================= */
        <div style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          padding: isMobileView ? '16px 14px' : '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }} className="custom-scrollbar">
          {/* Country Dossier Header Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '20px 24px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '3.2rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}>
                {activeCountry.flagEmoji}
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                    {activeCountry.name}
                  </h1>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '100px',
                    background: '#f1f5f9',
                    color: '#475569'
                  }}>
                    {activeCountry.era} ({activeCountry.composedYear})
                  </span>
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 750, color: '#334155', marginTop: '4px' }}>
                  „{activeCountry.anthemTitle}“
                </div>
                <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: '2px' }}>
                  Komponist: <strong style={{ color: '#0f172a' }}>{activeCountry.composer}</strong> ({activeCountry.composerDates})
                </div>
              </div>
            </div>

            {/* 15s Story Audio Button */}
            <button
              onClick={handlePlayStory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '14px',
                background: isStoryPlaying ? '#0284c7' : '#f0f9ff',
                color: isStoryPlaying ? '#ffffff' : '#0369a1',
                border: '1.5px solid #bae6fd',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <Volume2 size={18} />
              <span>{isStoryPlaying ? 'Story pausieren' : 'Expeditions-Story (15s)'}</span>
            </button>
          </div>

          {/* Didactic & Fun Fact Info Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
            gap: '14px',
            color: '#0f172a'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <BookOpen size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Wusstest du schon?
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginTop: '4px' }}>
                  {activeCountry.funFact}
                </div>
              </div>
            </div>

            <div style={{
              background: '#fefce8',
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1.5px solid #fef08a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Sparkles size={20} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e' }}>
                  Didaktischer Tipp für dein Instrument
                </div>
                <div style={{ fontSize: '0.78rem', color: '#713f12', lineHeight: 1.45, marginTop: '4px' }}>
                  {activeCountry.didacticTip}
                </div>
              </div>
            </div>
          </div>

          {/* 🎼 MAIN SCORE PLAYER */}
          <WorldTourScorePlayer
            country={activeCountry}
            studentInstrument={studentInstrument}
            onMasteryAchieved={handleMasteryAchieved}
            uiLevel={uiLevel}
          />
        </div>
      )}

      {/* A4 Printable Diploma Modal */}
      {isDiplomaOpen && (
        <WorldTourDiplomaModal
          isOpen={isDiplomaOpen}
          onClose={() => setIsDiplomaOpen(false)}
          studentName={studentName}
          instrumentName={studentInstrument || 'Klavier'}
          unlockedCount={totalMasteredCountries}
          totalCountries={13}
        />
      )}
    </div>
  );
};
