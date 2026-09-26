import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Compass, ArrowLeft, Award, Sparkles, Volume2, Info, BookOpen, Star,
  CheckCircle, Globe, ChevronRight, ChevronDown, ChevronUp, Share2, Printer, MapPin, Play, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { CONTINENTS, WORLD_TOUR_COUNTRIES } from '../../../../domain/worldTourCatalog';
import { WorldTourCountry, ContinentId, WorldTourStudentProgress } from '../../../../types/worldTour';
import { WorldTourService } from '../../../../services/worldTourService';
import { WorldTourScorePlayer } from './WorldTourScorePlayer';
import { WorldTourDiplomaModal } from './WorldTourDiplomaModal';

interface WorldTourMapSpreadProps {
  onBackToHub?: () => void;
  studentId?: string;
  studentName?: string;
  studentInstrument?: string | null;
  uiLevel?: 'junior' | 'teen' | 'pro';
  isMobileView?: boolean;
  onMasteryAchieved?: (stars: number, score: number, xp: number, countryCode: string) => void;
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
 * 📍 EXAKTE GEOGRAFISCHE LÄNDERKOORDINATEN DER 21 HYMNEN & KULTURSTATIONEN
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
  // 1. Afrika (Polyrhythmik & Kora)
  { code: 'WA_KUKU', name: 'Westafrika (Mali/Guinea)', lat: 10.5, lon: -11.0, flag: '🇬🇳', continent: 'africa', chordFrequencies: [196.00, 246.94, 293.66] },
  { code: 'WA_JARABI', name: 'Senegal / Gambia', lat: 14.5, lon: -14.4, flag: '🇸🇳', continent: 'africa', chordFrequencies: [174.61, 220.00, 261.63] },
  { code: 'ZA_SHOSHO', name: 'Südafrika (Zulu)', lat: -29.0, lon: 24.5, flag: '🇿🇦', continent: 'africa', chordFrequencies: [130.81, 164.81, 196.00] },

  // 2. Lateinamerika & Nordamerika (Synkopen & Pentatonik)
  { code: 'CU_SON', name: 'Kuba (Son Cubano)', lat: 21.5, lon: -79.5, flag: '🇨🇺', continent: 'americas', chordFrequencies: [196.00, 246.94, 293.66] },
  { code: 'BR_CHORO', name: 'Brasilien (Tico-Tico no Fubá)', lat: -22.9, lon: -43.2, flag: '🇧🇷', continent: 'americas', chordFrequencies: [220.00, 261.63, 329.63] },
  { code: 'PE_KASHWA', name: 'Anden / Peru (Inka)', lat: -13.5, lon: -71.9, flag: '🇵🇪', continent: 'americas', chordFrequencies: [220.00, 261.63, 329.63] },
  { code: 'US', name: 'USA (Star-Spangled)', lat: 39.5, lon: -98.3, flag: '🇺🇸', continent: 'americas', chordFrequencies: [233.08, 349.23, 466.16] },

  // 3. Asien & Orient (Koto, Raga & Maqam)
  { code: 'JP', name: 'Japan (Edo Koto)', lat: 36.2, lon: 138.2, flag: '🇯🇵', continent: 'asia', chordFrequencies: [220.00, 246.94, 261.63] },
  { code: 'IN_RAGA', name: 'Indien (Raga Bhupali)', lat: 20.6, lon: 78.9, flag: '🇮🇳', continent: 'asia', chordFrequencies: [261.63, 293.66, 329.63] },
  { code: 'EG_MAQAM', name: 'Ägypten / Orient (Maqam)', lat: 26.8, lon: 30.8, flag: '🇪🇬', continent: 'asia', chordFrequencies: [146.83, 174.61, 220.00] },

  // 4. Ozeanien (Songlines & Maori)
  { code: 'AU', name: 'Australien (Songlines)', lat: -25.2, lon: 133.7, flag: '🇦🇺', continent: 'oceania', chordFrequencies: [146.83, 220.00, 293.66] },
  { code: 'NZ_MAORI', name: 'Neuseeland (Maori Waiata)', lat: -40.9, lon: 174.8, flag: '🇳🇿', continent: 'oceania', chordFrequencies: [174.61, 220.00, 261.63] },
  { code: 'US_HAWAII', name: 'Hawaii (Aloha \'Oe)', lat: 21.3, lon: -157.8, flag: '🌺', continent: 'oceania', chordFrequencies: [261.63, 329.63, 392.00] },

  // 5. Europa (Balkan, Keltisch, Klassik & Flamenco)
  { code: 'BG_HORO', name: 'Balkan / Bulgarien (7/8)', lat: 42.7, lon: 25.4, flag: '🇧🇬', continent: 'europe', chordFrequencies: [146.83, 220.00, 293.66] },
  { code: 'IE_JIG', name: 'Irland (Slip Jig)', lat: 53.4, lon: -8.2, flag: '🇮🇪', continent: 'europe', chordFrequencies: [164.81, 196.00, 246.94] },
  { code: 'DE', name: 'Deutschland (Klassik)', lat: 51.5, lon: 10.5, flag: '🇩🇪', continent: 'europe', chordFrequencies: [196.00, 246.94, 293.66] },
  { code: 'FR', name: 'Frankreich (Marseillaise)', lat: 46.8, lon: 2.3, flag: '🇫🇷', continent: 'europe', chordFrequencies: [146.83, 185.00, 220.00] },
  { code: 'EU', name: 'Europa-Union (Beethoven)', lat: 50.8, lon: 4.3, flag: '🇪🇺', continent: 'europe', chordFrequencies: [130.81, 164.81, 196.00] },
  { code: 'ES_FLAMENCO', name: 'Spanien (Flamenco)', lat: 37.38, lon: -5.98, flag: '🇪🇸', continent: 'europe', chordFrequencies: [164.81, 220.00, 261.63] },
  { code: 'IT', name: 'Italien (Fratelli d\'Italia)', lat: 41.9, lon: 12.5, flag: '🇮🇹', continent: 'europe', chordFrequencies: [130.81, 164.81, 196.00] },
  { code: 'GB', name: 'Großbritannien (God Save the King)', lat: 51.5, lon: -0.12, flag: '🇬🇧', continent: 'europe', chordFrequencies: [196.00, 246.94, 293.66] }
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
  studentId,
  studentName = 'Musikschüler',
  studentInstrument = 'Klavier',
  uiLevel = 'teen',
  isMobileView = false,
  onMasteryAchieved
}) => {
  const [activeView, setActiveView] = useState<'map' | 'score'>('map');
  const [selectedContinent, setSelectedContinent] = useState<ContinentId | 'all'>('all');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('DE');
  const [projectionMode, setProjectionMode] = useState<'3d' | '2d'>('3d');
  const [progressMap, setProgressMap] = useState<Record<string, WorldTourStudentProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDiplomaOpen, setIsDiplomaOpen] = useState(false);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
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
    WorldTourService.fetchStudentProgress(studentId).then(res => {
      if (isMounted) {
        setProgressMap(res);
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [studentId]);

  const activeCountry = useMemo(() => {
    return WORLD_TOUR_COUNTRIES.find(c => c.code === selectedCountryCode) || WORLD_TOUR_COUNTRIES[0];
  }, [selectedCountryCode]);

  const schoolStats = useMemo(() => {
    return WorldTourService.calculateSchoolWorldMilestone(progressMap);
  }, [progressMap]);

  const jingleCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (jingleCtxRef.current && jingleCtxRef.current.state !== 'closed') {
        jingleCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 🎵 Web Audio Kultur-Jingle (Shared Context Pool gegen Hardware-Exhaustion)
  const playCultureJingle = useCallback((frequencies: number[]) => {
    try {
      if (!jingleCtxRef.current || jingleCtxRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        jingleCtxRef.current = new AudioCtx();
      }
      const ctx = jingleCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
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
    setProgressMap(prev => {
      const existing = prev[activeCountry.code];
      const finalStars = Math.max(existing?.stars ?? 0, stars);
      const finalScore = Math.max(existing?.bestScorePercent ?? 0, score);
      const isUnlocked = finalStars >= 1 || Boolean(existing?.isUnlocked);
      return {
        ...prev,
        [activeCountry.code]: {
          countryCode: activeCountry.code,
          stars: finalStars,
          bestScorePercent: finalScore,
          bestTempoBpm: Math.max(existing?.bestTempoBpm ?? 0, activeCountry.score.defaultBpm),
          instrument: studentInstrument || existing?.instrument || undefined,
          isUnlocked,
          unlockedAt: existing?.unlockedAt || (isUnlocked ? new Date().toISOString() : undefined)
        }
      };
    });
    onMasteryAchieved?.(stars, score, xp, activeCountry.code);
  }, [activeCountry.code, activeCountry.score.defaultBpm, studentInstrument, onMasteryAchieved]);

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

  // 📍 3D BEACONS MIT SMART RADIAL REPULSION (Anti-Kollision für Europa & Ballungsräume)
  const projectedBeacons = useMemo(() => {
    // 1. Orthografische Projektion aller 21 Stationen
    const visible = GLOBE_BEACONS.map(beacon => {
      const proj = projectOrthographic(
        beacon.lat,
        beacon.lon,
        rotation.lambda,
        rotation.phi,
        globeRadius,
        cx,
        cy
      );
      return {
        ...beacon,
        proj,
        adjustedX: proj.x,
        adjustedY: proj.y,
        repulsed: false
      };
    }).filter(b => b.proj.z >= -0.04);

    // 2. Mehrstufige elastische Radial-Repulsion für benachbarte Stationen
    const minDistance = 38;
    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const dx = visible[j].adjustedX - visible[i].adjustedX;
          const dy = visible[j].adjustedY - visible[i].adjustedY;
          const dist = Math.hypot(dx, dy);
          if (dist < minDistance && dist > 0.001) {
            const overlap = (minDistance - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            visible[i].adjustedX -= nx * overlap * 0.65;
            visible[i].adjustedY -= ny * overlap * 0.65;
            visible[j].adjustedX += nx * overlap * 0.65;
            visible[j].adjustedY += ny * overlap * 0.65;
            visible[i].repulsed = true;
            visible[j].repulsed = true;
          }
        }
      }
    }

    return visible;
  }, [rotation, globeRadius, cx, cy]);

  // 🗺️ 2D KONTINENTE MIT FREUNDLICHEN PASTELL-FARBEN
  const landmasses2D = useMemo(() => {
    return SPHERICAL_LANDMASSES.map(land => {
      const points = land.points.map(([lat, lon]) => {
        const x = ((lon + 180) / 360) * 1140 + 30;
        const y = ((90 - lat) / 180) * 480 + 40;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' L ');
      const isEurope = land.id.includes('europe') || land.id.includes('british') || land.id.includes('ireland') || land.id.includes('scandinavia');
      const isAfrica = land.id.includes('africa') || land.id.includes('madagascar');
      const isAsia = land.id.includes('asia') || land.id.includes('japan');
      const isNorthAmerica = land.id.includes('north-america') || land.id.includes('greenland');
      const isSouthAmerica = land.id.includes('south-america');

      return {
        id: land.id,
        fill: isEurope ? '#86efac' : isAfrica ? '#fde047' : isAsia ? '#6ee7b7' : isNorthAmerica ? '#fed7aa' : isSouthAmerica ? '#fbcfe8' : '#c7d2fe',
        stroke: isEurope ? '#15803d' : isAfrica ? '#ca8a04' : isAsia ? '#059669' : isNorthAmerica ? '#ea580c' : isSouthAmerica ? '#db2777' : '#4f46e5',
        d: `M ${points} Z`
      };
    });
  }, []);

  // 🗺️ 2D PINS MIT SMART ANTI-KOLLISION (Garantiert keine Überlappungen in Europa)
  const pins2D = useMemo(() => {
    const list = WORLD_TOUR_COUNTRIES.map(country => {
      const baseX = (country.mapCoordinates.x / 100) * 1140 + 30;
      const baseY = (country.mapCoordinates.y / 100) * 480 + 40;
      return {
        country,
        x: baseX,
        y: baseY
      };
    });

    const minDistance = 36;
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const dx = list[j].x - list[i].x;
          const dy = list[j].y - list[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist < minDistance && dist > 0.001) {
            const overlap = (minDistance - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            list[i].x -= nx * overlap * 0.7;
            list[i].y -= ny * overlap * 0.7;
            list[j].x += nx * overlap * 0.7;
            list[j].y += ny * overlap * 0.7;
          }
        }
      }
    }

    return list;
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: activeView === 'map' ? (projectionMode === '2d' ? '#f0fdf4' : '#0f172a') : '#fcfaf7',
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
            <span style={{ fontSize: '1.5rem' }}>{projectionMode === '2d' ? '🗺️' : '🌎'}</span>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                {projectionMode === '2d' ? 'Expeditions-Atlas • Weltreise der Klänge' : 'The Golden Globe of Sound • 3D Klang-Globus'}
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 650 }}>
                {projectionMode === '2d' ? 'Entdecke alle 21 Kultur-Stationen im globalen Überblick' : 'Drehe die Erdkugel und entdecke das Weltmusikerbe'}
              </span>
            </div>
          </div>
        </div>

        {/* HUD Progress Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 2D Karte / 3D Globus Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '100px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <button
              onClick={() => setProjectionMode('2d')}
              style={{
                background: projectionMode === '2d' ? '#38bdf8' : 'transparent',
                color: projectionMode === '2d' ? '#0f172a' : '#cbd5e1',
                border: 'none',
                borderRadius: '100px',
                padding: '5px 11px',
                fontSize: '0.74rem',
                fontWeight: 850,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="2D Entdeckerkarte anzeigen"
            >
              🗺️ 2D Karte
            </button>
            <button
              onClick={() => setProjectionMode('3d')}
              style={{
                background: projectionMode === '3d' ? '#38bdf8' : 'transparent',
                color: projectionMode === '3d' ? '#0f172a' : '#cbd5e1',
                border: 'none',
                borderRadius: '100px',
                padding: '5px 11px',
                fontSize: '0.74rem',
                fontWeight: 850,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="3D Klang-Globus anzeigen"
            >
              🌎 3D Globus
            </button>
          </div>

          {/* Zoom In / Out Buttons (in 3D Mode) */}
          {projectionMode === '3d' && (
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
          )}

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
            <span>🌍 {totalMasteredCountries} / {WORLD_TOUR_COUNTRIES.length} Länder</span>
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
          onMouseDown={projectionMode === '3d' ? (e => handlePointerDown(e.clientX, e.clientY)) : undefined}
          onMouseMove={projectionMode === '3d' ? (e => handlePointerMove(e.clientX, e.clientY)) : undefined}
          onMouseUp={projectionMode === '3d' ? handlePointerUp : undefined}
          onTouchStart={projectionMode === '3d' ? (e => {
            if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }) : undefined}
          onTouchMove={projectionMode === '3d' ? (e => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }) : undefined}
          onTouchEnd={projectionMode === '3d' ? handlePointerUp : undefined}
          style={{
            flex: 1,
            width: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: projectionMode === '2d' ? 'default' : (isDraggingRef.current ? 'grabbing' : 'grab'),
            background: projectionMode === '2d'
              ? 'radial-gradient(ellipse at 50% 45%, #f0fdf4 0%, #e0f2fe 65%, #dbeafe 100%)'
              : 'radial-gradient(ellipse at 50% 45%, #1e293b 0%, #0f172a 60%, #020617 100%)'
          }}
        >
          {/* Dezente Sternen-Partikel im Weltall (nur im 3D-Modus) */}
          {projectionMode === '3d' && (
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
          )}

          {/* Hinweis-Overlay für Kinder */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: projectionMode === '2d' ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.08)',
            border: projectionMode === '2d' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: projectionMode === '2d' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            fontSize: '0.74rem',
            fontWeight: 800,
            color: projectionMode === '2d' ? '#334155' : '#94a3b8',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <span>{projectionMode === '2d' ? '🗺️ Wähle eine Station auf der Entdecker-Karte' : '👆 Ziehe den Globus mit Maus oder Finger'}</span>
          </div>

          {/* ========================================================================= */}
          {/* ANSICHT A: 2D ILLUSTRIERTE ENTDECKERKARTE (1200 × 580)                    */}
          {/* ========================================================================= */}
          {projectionMode === '2d' ? (
            <svg
              viewBox="0 0 1200 580"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 'calc(100vh - 160px)',
                overflow: 'visible',
                pointerEvents: 'auto'
              }}
            >
              <defs>
                <filter id="medallionShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.18" floodColor="#0f172a" />
                </filter>
                <filter id="medallionGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodOpacity="0.85" floodColor="#facc15" />
                </filter>
              </defs>

              {/* 1. Ozean-Hintergrund mit sanften Rändern */}
              <rect x="15" y="15" width="1170" height="550" rx="28" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="2" />

              {/* 2. Nautisches Gradnetz (Äquator, Tropen, Meridiane) */}
              {/* Äquator */}
              <line x1="25" y1="280" x2="1175" y2="280" stroke="#93c5fd" strokeWidth="1.4" strokeDasharray="6 4" opacity="0.75" />
              <text x="35" y="275" fontSize="10" fontWeight="800" fill="#0284c7" opacity="0.8">Äquator (0°)</text>

              {/* Nördlicher Wendekreis */}
              <line x1="25" y1="217" x2="1175" y2="217" stroke="#bae6fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              {/* Südlicher Wendekreis */}
              <line x1="25" y1="343" x2="1175" y2="343" stroke="#bae6fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

              {/* Nullmeridian (Greenwich) */}
              <line x1="600" y1="25" x2="600" y2="555" stroke="#93c5fd" strokeWidth="1.4" strokeDasharray="6 4" opacity="0.75" />
              <text x="606" y="550" fontSize="9" fontWeight="800" fill="#0284c7" opacity="0.8">Nullmeridian (0°)</text>

              {/* Meridiane bei -120, -60, +60, +120 */}
              <line x1="220" y1="25" x2="220" y2="555" stroke="#bae6fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <line x1="410" y1="25" x2="410" y2="555" stroke="#bae6fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <line x1="790" y1="25" x2="790" y2="555" stroke="#bae6fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <line x1="980" y1="25" x2="980" y2="555" stroke="#bae6fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

              {/* 3. Kontinente der Erde (Pastellfarben) */}
              {landmasses2D.map(land => (
                <path
                  key={land.id}
                  d={land.d}
                  fill={land.fill}
                  stroke={land.stroke}
                  strokeWidth="1.5"
                  opacity="0.9"
                  style={{ transition: 'all 0.2s ease' }}
                />
              ))}

              {/* 4. Nostalgische Kompassrose (Windrose) im Pazifik unten links */}
              <g transform="translate(100, 480)" pointerEvents="none">
                <circle cx="0" cy="0" r="28" fill="rgba(255,255,255,0.7)" stroke="#ca8a04" strokeWidth="1.5" />
                <polygon points="0,-24 5,-6 24,0 6,5 0,24 -5,6 -24,0 -6,-5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                <polygon points="0,-24 0,0 5,-6" fill="#ca8a04" />
                <polygon points="24,0 0,0 6,5" fill="#ca8a04" />
                <polygon points="0,24 0,0 -5,6" fill="#ca8a04" />
                <polygon points="-24,0 0,0 -6,-5" fill="#ca8a04" />
                <circle cx="0" cy="0" r="4" fill="#0f172a" />
                <text x="0" y="-27" fontSize="9" fontWeight="900" fill="#0f172a" textAnchor="middle">N</text>
                <text x="0" y="35" fontSize="9" fontWeight="900" fill="#0f172a" textAnchor="middle">S</text>
                <text x="32" y="3" fontSize="9" fontWeight="900" fill="#0f172a" textAnchor="middle">O</text>
                <text x="-32" y="3" fontSize="9" fontWeight="900" fill="#0f172a" textAnchor="middle">W</text>
              </g>

              {/* 5. Interaktive 36px Flaggen-Medaillons aller 21 Stationen */}
              {pins2D.map(({ country, x, y }) => {
                const isSelected = selectedCountryCode === country.code;
                const isHovered = hoveredCountryCode === country.code;
                const progress = progressMap[country.code];
                const stars = progress?.stars ?? 0;
                const isMastered = stars > 0;
                const beacon = GLOBE_BEACONS.find(b => b.code === country.code) || {
                  code: country.code,
                  name: country.name,
                  lat: country.geoCoordinates?.lat ?? 0,
                  lon: country.geoCoordinates?.lon ?? 0,
                  flag: country.flagEmoji,
                  continent: country.continent,
                  chordFrequencies: [261.63, 329.63, 392.00]
                };

                return (
                  <g
                    key={country.code}
                    role="button"
                    tabIndex={0}
                    aria-label={`Station ${country.name}, ${country.pieceTitle}. ${isMastered ? 'Gemeistert mit ' + stars + ' Sternen' : 'Station noch offen'}`}
                    transform={`translate(${x}, ${y})`}
                    onClick={e => {
                      e.stopPropagation();
                      handlePinClick(beacon);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePinClick(beacon);
                      }
                    }}
                    onMouseEnter={() => setHoveredCountryCode(country.code)}
                    onMouseLeave={() => setHoveredCountryCode(null)}
                    onFocus={() => setHoveredCountryCode(country.code)}
                    onBlur={() => setHoveredCountryCode(null)}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {/* Radar-Impuls bei Auswahl */}
                    {isSelected && (
                      <circle cx="0" cy="0" r="22" fill="none" stroke="#facc15" strokeWidth="2.5">
                        <animate attributeName="r" values="16;32" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Touch-Target 44×44px für Barrierefreiheit */}
                    <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />

                    {/* Medaillon-Körper (36px Kreis) */}
                    <circle
                      cx="0"
                      cy="0"
                      r="18"
                      fill={isSelected ? '#0f172a' : '#ffffff'}
                      stroke={isSelected ? '#facc15' : isMastered ? '#22c55e' : '#0284c7'}
                      strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                      filter={isSelected ? 'url(#medallionGlow)' : 'url(#medallionShadow)'}
                    />

                    {/* Flaggen-Emoji zentriert */}
                    <text
                      x="0"
                      y="1"
                      fontSize="18"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ pointerEvents: 'none' }}
                    >
                      {country.flagEmoji}
                    </text>

                    {/* Mini Meister-Stern Krone bei gemeisterten Ländern */}
                    {isMastered && (
                      <g transform="translate(12, -12)">
                        <circle r="7.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.2" />
                        <text x="0" y="1" fontSize="8.5" textAnchor="middle" dominantBaseline="central" fill="#0f172a">
                          ★
                        </text>
                      </g>
                    )}

                    {/* Länder-Kürzel Pill unter dem Medaillon */}
                    <g transform="translate(0, 27)" pointerEvents="none">
                      <rect
                        x="-16"
                        y="-7"
                        width="32"
                        height="14"
                        rx="7"
                        fill={isSelected ? '#0f172a' : 'rgba(255, 255, 255, 0.95)'}
                        stroke={isSelected ? '#facc15' : '#cbd5e1'}
                        strokeWidth="1"
                        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.15))"
                      />
                      <text
                        x="0"
                        y="3"
                        fontSize="8.5"
                        fontWeight="900"
                        textAnchor="middle"
                        fill={isSelected ? '#facc15' : '#1e293b'}
                      >
                        {country.code.startsWith('WA_') ? country.code.replace('WA_', '') : country.code.startsWith('ZA_') ? 'ZA' : country.code.startsWith('CU_') ? 'CU' : country.code.startsWith('BR_') ? 'BR' : country.code.startsWith('PE_') ? 'PE' : country.code.startsWith('IN_') ? 'IN' : country.code.startsWith('EG_') ? 'EG' : country.code.startsWith('NZ_') ? 'NZ' : country.code.startsWith('BG_') ? 'BG' : country.code.startsWith('IE_') ? 'IE' : country.code.startsWith('ES_') ? 'ES' : country.code}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          ) : (
            /* ========================================================================= */
            /* ANSICHT B: 3D DREHBARER KLANG-GLOBUS                                      */
            /* ========================================================================= */
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
            {/* 7. INTERAKTIVE 34px FLAGGEN-MEDAILLONS MIT ELASTISCHER RADIAL-REPULSION */}
            {/* ========================================================================= */}
            {projectedBeacons.map(beacon => {
              const isSelected = selectedCountryCode === beacon.code;
              const isHovered = hoveredCountryCode === beacon.code;
              const progress = progressMap[beacon.code];
              const stars = progress?.stars ?? 0;
              const isMastered = stars > 0;

              const depthScale = Math.max(0.7, Math.min(1.2, 0.75 + beacon.proj.z * 0.45));
              const depthOpacity = Math.max(0.35, Math.min(1, beacon.proj.z * 2.5 + 0.15));
              const nameW = Math.max(76, beacon.name.length * 7 + 16);

              return (
                <g
                  key={beacon.code}
                  role="button"
                  tabIndex={0}
                  aria-label={`Station ${beacon.name}, ${beacon.continent}. ${isMastered ? 'Gemeistert mit ' + stars + ' Sternen' : 'Station noch offen'}`}
                  transform={`translate(${beacon.adjustedX}, ${beacon.adjustedY})`}
                  opacity={depthOpacity}
                  onClick={e => {
                    e.stopPropagation();
                    handlePinClick(beacon);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePinClick(beacon);
                    }
                  }}
                  onMouseEnter={() => setHoveredCountryCode(beacon.code)}
                  onMouseLeave={() => setHoveredCountryCode(null)}
                  onFocus={() => setHoveredCountryCode(beacon.code)}
                  onBlur={() => setHoveredCountryCode(null)}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {/* Dotted Leader Line bei Repulsion zum echten Bodenpunkt */}
                  {beacon.repulsed && (
                    <line
                      x1={beacon.proj.x - beacon.adjustedX}
                      y1={beacon.proj.y - beacon.adjustedY}
                      x2={0}
                      y2={0}
                      stroke={isSelected ? '#facc15' : 'rgba(255,255,255,0.45)'}
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Hotspot-Punkt auf der Erdoberfläche */}
                  <circle
                    cx={beacon.proj.x - beacon.adjustedX}
                    cy={beacon.proj.y - beacon.adjustedY}
                    r={(isSelected ? 5 : isHovered ? 4.5 : 3.5) * depthScale}
                    fill={isMastered ? '#facc15' : isSelected ? '#ffffff' : '#38bdf8'}
                    stroke={isSelected ? '#facc15' : '#0f172a'}
                    strokeWidth={1.4 * depthScale}
                  />

                  {/* Radar-Impuls bei Auswahl */}
                  {isSelected && (
                    <circle cx="0" cy="0" r={22 * depthScale} fill="none" stroke="#facc15" strokeWidth="2.4">
                      <animate attributeName="r" values={`${14 * depthScale};${30 * depthScale}`} dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Touch-Target 44×44px */}
                  <circle cx="0" cy="0" r={22 * depthScale} fill="transparent" pointerEvents="all" />

                  {/* 34px Kreisrundes Flaggen-Medaillon */}
                  <circle
                    cx="0"
                    cy="0"
                    r={17 * depthScale}
                    fill={isSelected ? '#0f172a' : '#ffffff'}
                    stroke={isSelected ? '#facc15' : isMastered ? '#22c55e' : '#38bdf8'}
                    strokeWidth={(isSelected ? 2.8 : isHovered ? 2.2 : 1.6) * depthScale}
                    filter={isSelected ? 'url(#goldGlow)' : 'drop-shadow(0 3px 8px rgba(0,0,0,0.45))'}
                  />

                  {/* Flaggen-Emoji im Zentrum */}
                  <text
                    x="0"
                    y="1"
                    fontSize={16 * depthScale}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ pointerEvents: 'none' }}
                  >
                    {beacon.flag}
                  </text>

                  {/* Mini Meister-Stern Krone */}
                  {isMastered && (
                    <g transform={`translate(${11 * depthScale}, ${-11 * depthScale})`}>
                      <circle r={6.5 * depthScale} fill="#facc15" stroke="#0f172a" strokeWidth={1} />
                      <text x="0" y="1" fontSize={7.5 * depthScale} textAnchor="middle" dominantBaseline="central" fill="#0f172a">
                        ★
                      </text>
                    </g>
                  )}

                  {/* Schwebendes Namens-Pill (NUR bei Hover oder Fokus/Auswahl) */}
                  {(isSelected || isHovered) && (
                    <g transform={`translate(0, ${-26 * depthScale})`} pointerEvents="none">
                      <rect
                        x={-nameW / 2}
                        y={-10}
                        width={nameW}
                        height={20}
                        rx={10}
                        fill="#0f172a"
                        stroke="#facc15"
                        strokeWidth={1.4}
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.6))"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="900"
                        fill="#ffffff"
                      >
                        {beacon.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}

          {/* ========================================================================= */}
          {/* 🗂️ SCHWEBENDE EXPEDITIONS-AKTE (Floating Glassmorphism Card am Boden)     */}
          {/* ========================================================================= */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: isMobileView ? 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom, 20px) + 16px)' : '20px',
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
                  „{activeCountry.pieceTitle || activeCountry.anthemTitle}“
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Kultur/Komponist: <strong style={{ color: '#ffffff' }}>{activeCountry.composer}</strong> ({activeCountry.composerDates})
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
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.45)',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                title="Notenpult öffnen und Kulturstück üben oder prüfen"
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* 15s Story Audio Button */}
              <button
                onClick={handlePlayStory}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  background: isStoryPlaying ? '#0284c7' : '#f0f9ff',
                  color: isStoryPlaying ? '#ffffff' : '#0369a1',
                  border: '1.5px solid #bae6fd',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                <Volume2 size={16} />
                <span>{isStoryPlaying ? 'Story pausieren' : 'Expeditions-Story (15s)'}</span>
              </button>

              {/* Faltbares Kultur-Dossier Button */}
              <button
                onClick={() => setIsDossierOpen(prev => !prev)}
                aria-expanded={isDossierOpen}
                aria-label="Kultur-Dossier und didaktischen Tipp ein- oder ausklappen"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 15px',
                  borderRadius: '12px',
                  background: isDossierOpen ? '#f1f5f9' : '#ffffff',
                  color: isDossierOpen ? '#0f172a' : '#475569',
                  border: '1.5px solid #e2e8f0',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                <BookOpen size={16} color={isDossierOpen ? '#0284c7' : '#64748b'} />
                <span>{isDossierOpen ? 'Dossier einklappen' : 'Kultur-Dossier & Tipp'}</span>
                {isDossierOpen ? <ChevronUp size={15} color="#64748b" /> : <ChevronDown size={15} color="#64748b" />}
              </button>
            </div>
          </div>

          {/* Didactic & Fun Fact Info Cards (Aufklappbares Expeditions-Dossier) */}
          {isDossierOpen && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
              gap: '14px',
              color: '#0f172a',
              animation: 'fade-in 0.2s ease'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '14px 18px',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <BookOpen size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
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
                padding: '14px 18px',
                border: '1.5px solid #fef08a',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Sparkles size={18} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
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
          )}

          {/* 🎼 MAIN SCORE PLAYER */}
          <WorldTourScorePlayer
            country={activeCountry}
            studentInstrument={studentInstrument}
            studentId={studentId}
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
          totalCountries={WORLD_TOUR_COUNTRIES.length}
        />
      )}
    </div>
  );
};
