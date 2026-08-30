import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Music, AlertCircle, Play, Pause, ArrowDown, ArrowRight, Library, Shield, ShieldCheck, FileText, LogOut, Award, Users, User, Monitor, Tablet, X, Camera, Clock, QrCode, Plus, ExternalLink, BarChart, Star, Box, Settings, Lock, Pencil, Trash2, Zap, RotateCcw, Check, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Mic, Calendar, PlayCircle, Youtube, Megaphone, Mail, School, GraduationCap, Trophy, Compass, MapPin, RefreshCw, Repeat, BookOpen, Info, Disc, Building } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from './lib/supabase';
import { dbCircuitBreaker } from './utils/circuitBreaker';
import { subscribeUserToPush } from './utils/webPush';
import { StudioAvatar, getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl, renderBandAvatar, resolveStudentInstrumentAsync, getEffectiveInstrument } from './components/StudioAvatar';
import { reportClientError, initGlobalErrorListeners } from './lib/errorTelemetry';
import { isDevEnvironment } from './utils/tenantUrlHelper';

// Initialize global error interception
initGlobalErrorListeners();

// Dynamic lazy imports for top-level dashboards & heavy screens to enable code-splitting & reduce initial bundle size by ~70%
const Startseite2 = lazy(() => import('./components/Startseite2').then(m => ({ default: m.Startseite2 })));
const Startseite = lazy(() => import('./components/Startseite').then(m => ({ default: m.Startseite })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MasterAdminDashboard = lazy(() => import('./components/MasterAdminDashboard').then(m => ({ default: m.MasterAdminDashboard })));
const SecretaryDashboard = lazy(() => import('./components/SecretaryDashboard').then(m => ({ default: m.SecretaryDashboard })));
const StudentAvatarDashboard = lazy(() => import('./components/StudentAvatarDashboard').then(m => ({ default: m.StudentAvatarDashboard })));
const EnsembleDashboard = lazy(() => import('./components/EnsembleDashboard').then(m => ({ default: m.EnsembleDashboard })));
const BandProfileContent = lazy(() => import('./components/BandProfileContent'));
const ArtistGateway = lazy(() => import('./components/ArtistGateway').then(m => ({ default: m.ArtistGateway })));
const QRLandingPage = lazy(() => import('./components/QRLandingPage').then(m => ({ default: m.QRLandingPage })));
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const QRCodeModal = lazy(() => import('./components/QRCodeModal').then(m => ({ default: m.QRCodeModal })));
const DeviceSetupScreen = lazy(() => import('./components/DeviceSetupScreen').then(m => ({ default: m.DeviceSetupScreen })));
const TeacherDetailModal = lazy(() => import('./components/TeacherDetailModal').then(m => ({ default: m.TeacherDetailModal })));
const StudentDetailModal = lazy(() => import('./components/StudentDetailModal').then(m => ({ default: m.StudentDetailModal })));
const ContractEndPrompt = lazy(() => import('./components/ContractEndPrompt').then(m => ({ default: m.ContractEndPrompt })));
const SignupWizard = lazy(() => import('./components/SignupWizard').then(m => ({ default: m.SignupWizard })));
const StudentRadarChart = lazy(() => import('./components/StudentRadarChart'));
const CampusDirectMessages = lazy(() => import('./components/CampusDirectMessages').then(m => ({ default: m.default || m.CampusDirectMessages })));
const GrooveLabMessagesBoard = lazy(() => import('./components/GrooveLabMessagesBoard'));
const StudentOnboardingPage = lazy(() => import('./components/StudentOnboardingPage').then(m => ({ default: m.StudentOnboardingPage })));
const DeviceOnboardingPage = lazy(() => import('./components/DeviceOnboardingPage').then(m => ({ default: m.DeviceOnboardingPage })));
const SchoolSelfOnboardingModal = lazy(() => import('./components/SchoolSelfOnboardingModal').then(m => ({ default: m.SchoolSelfOnboardingModal })));
const CampusPinUnlockModal = lazy(() => import('./components/CampusPinUnlockModal').then(m => ({ default: m.CampusPinUnlockModal })));
const PilotOnboardingModal = lazy(() => import('./components/PilotOnboardingModal').then(m => ({ default: m.PilotOnboardingModal })));
const GhostSupportCapsule = lazy(() => import('./components/masterAdmin/GhostSupportCapsule').then(m => ({ default: m.GhostSupportCapsule })));
const SharedAudioBiographyPage = lazy(() => import('./components/campus/SharedAudioBiographyPage').then(m => ({ default: m.SharedAudioBiographyPage })));
const HelpCenterModal = lazy(() => import('./components/help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));
const TrialInfoModal = lazy(() => import('./components/TrialInfoModal').then(m => ({ default: m.TrialInfoModal })));
const AdminSecuritySuiteModal = lazy(() => import('./components/AdminSecuritySuiteModal').then(m => ({ default: m.AdminSecuritySuiteModal })));


import { MobileBottomNav } from './components/ui/MobileBottomNav';
import ConfettiModal from './components/ConfettiModal';
import { normalizeInstrument, renderInstrumentIcon } from './utils/instruments';
import { getDistanceFromLatLonInM } from './utils/geo';
import { ProfileSelector } from './components/ProfileSelector';
import { flushOfflineSyncQueue } from './services/offlineSyncService';
import { DeviceSimulator } from './components/ui/DeviceSimulator';
import { MobileTopHeader } from './components/ui/MobileTopHeader';
import { formatTeacherFullName } from './utils/nameHelper';
import { CampusLevelSwitcher, CampusUiLevel } from './components/campus/CampusLevelSwitcher';
import { useMasterPricing } from './context/MasterPricingContext';
import { LegalTextModal } from './components/LegalTextModal';
import { MaintenanceLockoutOverlay } from './components/MaintenanceLockoutOverlay';
import { GlobalBroadcastBanner } from './components/GlobalBroadcastBanner';
import { PwaUpdateToast } from './components/ui/PwaUpdateToast';
import { OfflineStatusBadge } from './components/ui/OfflineStatusBadge';
import { runStorageJanitor, runClientStorageJanitor } from './services/storageJanitorService';
import { verifyMasterSessionLease, revokeMasterSessionLease } from './utils/masterAuditLogger';
import './App.css';

// --- GLOBAL CAMERA KILL SWITCH ---
// This guarantees that any third-party scanner library like react-qr-scanner
// cannot keep the camera active after the user has logged in.
if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  if (!(window as any)._cameraPatched) {
    (window as any)._cameraPatched = true;
    (window as any)._activeMediaStreams = [];
    
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await originalGetUserMedia(constraints);
      (window as any)._activeMediaStreams.push(stream);
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if ((window as any)._activeMediaStreams) {
            (window as any)._activeMediaStreams = (window as any)._activeMediaStreams.filter((s: MediaStream) => s.active && s !== stream);
          }
        }, { once: true });
      });
      return stream;
    };
    
    (window as any).stopAllCameras = () => {
      if ((window as any)._activeMediaStreams) {
        (window as any)._activeMediaStreams.forEach((stream: MediaStream) => {
          stream.getTracks().forEach(track => {
            track.stop();
            stream.removeTrack(track);
          });
        });
        (window as any)._activeMediaStreams = [];
      }
    };
  }
}

let _lastReplaceStateTime = 0;
let _replaceStateCount = 0;

export const safeReplaceState = (data: any, unused: string, url?: string | URL | null) => {
  if (typeof window === 'undefined' || !window.history) return;
  try {
    const now = Date.now();
    if (now - _lastReplaceStateTime > 10000) {
      _lastReplaceStateTime = now;
      _replaceStateCount = 0;
    }
    _replaceStateCount++;
    if (_replaceStateCount > 25) {
      return;
    }
    window.history.replaceState(data, unused, url);
  } catch (e) {
    console.warn('[History] safeReplaceState caught error:', e);
  }
};

const APP_INSTRUMENT_ICONS: Record<string, any> = { 
  "Gitarre": renderInstrumentIcon("Gitarre"), 
  "Guitar": renderInstrumentIcon("Guitar"), 
  "E-Gitarre": renderInstrumentIcon("E-Gitarre"),
  "Bass": renderInstrumentIcon("Bass"), 
  "E-Bass": renderInstrumentIcon("E-Bass"), 
  "Drums": renderInstrumentIcon("Drums"), 
  "E-Drums": renderInstrumentIcon("E-Drums"), 
  "Vocals": renderInstrumentIcon("Vocals"), 
  "Gesang": renderInstrumentIcon("Gesang"),
  "Piano / Keys": renderInstrumentIcon("Keys"), 
  "Piano": renderInstrumentIcon("Piano"), 
  "E-Piano": renderInstrumentIcon("E-Piano"), 
  "Keys": renderInstrumentIcon("Keys"),
  "Musik": "🎼"
};
const APP_INSTRUMENT_COLORS: Record<string, string> = { 
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#eab308", "E-Bass": "#eab308", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#34a853", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};
const brandColor = "#f59e0b"; // Orange (matched with legend)


const showMissionsFeature = false;
const showEnsemblesFeature = false;

// --- Band Name Generator Words ---
const BAND_ADJECTIVES_EN = [
  "Electric", "Sonic", "Neon", "Atomic", "Static", "Magnetic", "Pulse", "Kinetic", "Turbo", "Hyper",
  "Cosmic", "Lunar", "Solar", "Stellar", "Midnight", "Aurora", "Thunder", "Storm", "Crystal", "Frozen",
  "Golden", "Velvet", "Silver", "Wild", "Mystic", "Royal", "Infinite", "Eternal", "Fearless", "Savage",
  "Groovy", "Funky", "Echo", "Reverb", "Loud", "Deep", "Raw", "Broken", "Blazing", "Drifting",
  "Vibrant", "Quantum", "Astral", "Retro", "Stealth", "Heavy", "Acoustic", "Chilled", "Fierce", "Radiant",
  "Sublime", "Dynamic", "Slick", "Epic", "Primal", "Liquid", "Shining", "Sparkling", "Virtual", "Glow",
  "Glitch", "Vintage", "Solaris", "Radioactive", "Gravity", "Techno", "Melodic", "Harmonic", "Synth", "Phantom",
  "Shadow", "Rogue", "Ghostly", "Crying", "Howling", "Smiling", "Flying", "Silent", "Whispering", "Endless",
  "Amplified", "Distorted", "Screaming", "Thundering", "Raging", "Fallen", "Rising", "Ignited", "Burning", "Flashing",
  "Ablaze", "Furious", "Rebellious", "Wicked", "Ripped", "Cracked", "Spiraled", "Twisted", "Haunted", "Blessed"
];
const BAND_NOUNS_EN = [
  "Rhythm", "Sound", "Vibe", "Beat", "Pulse", "Wave", "Groove", "Theory", "Symphony", "Note",
  "Collective", "Crew", "Squad", "Gang", "Tribe", "Pack", "Union", "Alliance", "Force", "League",
  "Studio", "Lab", "Stage", "Arena", "Chamber", "Vault", "Signal", "Circuit", "Grid", "Portal",
  "Flow", "Soul", "Vision", "Quest", "Flash", "Dream", "Mission", "Code", "Spark", "Surge",
  "Engine", "Network", "Dimension", "System", "Legacy", "Station", "Horizon", "Infinity", "Focus", "Frequency",
  "Impact", "Rebel", "Spirit", "Legend", "Ghost", "Genius", "Rider", "Junction", "Engineers", "Project",
  "Vanguard", "Patriots", "Nomads", "Monsters", "Aliens", "Robots", "Cyborgs", "Wolves", "Shadows", "Astronauts",
  "Pilots", "Giants", "Wizards", "Knights", "Kings", "Queens", "Lords", "Masters", "Outlaws", "Glitchers",
  "Riot", "Noise", "Feedback", "Friction", "Fever", "Echoes", "Screams", "Chords", "Melodies", "Anthems",
  "Riff", "Solo", "Beatbox", "Synthesizer", "Vinyl", "Records", "Basses", "Drums", "Guitars", "Vocals",
  "Runners", "Chasers", "Seekers", "Hunters", "Finders", "Keepers", "Breakers", "Shakers", "Makers", "Gamers",
  "Hackers", "Coders", "Agents", "Spies", "Scouts", "Rangers", "Guards", "Warriors", "Phantoms", "Spectres",
  "Demons", "Angels", "Dragons", "Beasts", "Hawks", "Eagles", "Ravens", "Falcons", "Panthers", "Cats",
  "Sharks", "Vipers", "Snakes", "Spiders", "Scorpions", "Monkeys", "Gorillas", "Bears", "Foxes", "Coyotes"
];
const BAND_ADJECTIVES_DE = [
  "Laute", "Starke", "Freie", "Wilde", "Coole", "Echte", "Neue", "Große", "Junge", "Heiße",
  "Kreative", "Magische", "Bunte", "Fette", "Schnelle", "Sanfte", "Kluge", "Helle", "Dunkle", "Fitte",
  "Mutige", "Leise", "Zahme", "Freche", "Schlaue", "Schöne", "Kleine", "Fröhliche", "Heitere", "Erste",
  "Beste", "Süße", "Feine", "Reine", "Stille", "Blinde", "Goldene", "Silberne", "Rotierende", "Fliegende",
  "Singende", "Springende", "Tanzende", "Spielende", "Glückliche", "Stolze", "Schrille", "Fetzige", "Warme", "Kalte",
  "Schwere", "Finstere", "Glühende", "Tosende", "Bebende", "Flüssige", "Heimliche", "Scharfe", "Wache", "Rebellische",
  "Zornige", "Uralte", "Geheime", "Heilige", "Fremde", "Lustige", "Düstere", "Schlaflose", "Ruhelose", "Gefährliche",
  "Unzahme", "Flüchtige", "Riesige", "Winzige", "Grelle", "Verzauberte", "Verlorene", "Versteckte", "Lautlose", "Heißblütige",
  "Kaltblütige", "Eisige", "Feurige", "Wässrige", "Luftige", "Erdige", "Kosmische", "Galaktische", "Astrale", "Sonnige",
  "Schattige", "Geisterhafte", "Traumhafte", "Zauberhafte", "Wunderbare", "Sonderbare", "Unglaubliche", "Fabelhafte", "Tapfere", "Furchtlose"
];
const BAND_NOUNS_DE = [
  "Klänge", "Bands", "Wege", "Kräfte", "Geister", "Wellen", "Feuer", "Lichter", "Räume", "Träume",
  "Schulen", "Helden", "Rebellen", "Rhythmen", "Stimmen", "Töne", "Spieler", "Meister", "Macher", "Freunde",
  "Sounds", "Songs", "Künstler", "Löwen", "Tiger", "Wölfe", "Vögel", "Sterne", "Monde", "Sonnen",
  "Blitze", "Wolken", "Welten", "Spuren", "Farben", "Schritte", "Herzen", "Lieder", "Saiten", "Tasten",
  "Trommeln", "Gitarren", "Bässe", "Pfeile", "Funken", "Stürme", "Winde", "Inseln", "Berge", "Täler",
  "Riffs", "Gitarristen", "Drummer", "Sänger", "Stürmer", "Sieger", "Gewinner", "Kämpfer", "Reiter", "Jäger",
  "Sucher", "Entdecker", "Forscher", "Erfinder", "Baumeister", "Magier", "Hexer", "Ritter", "Könige", "Fürsten",
  "Herrscher", "Götter", "Riesen", "Zwerge", "Drachen", "Monster", "Aliens", "Roboter", "Cyborgs", "Piraten",
  "Banditen", "Outlaws", "Spione", "Agenten", "Wächter", "Krieger", "Schatten", "Phantome", "Gespenster", "Wunder",
  "Rätsel", "Geheimnisse", "Legenden", "Mythen", "Geschichten", "Märchen", "Visionen", "Wirbelstürme", "Orkane", "Vulkane"
];

const generateRandomBandName = (lang?: 'de' | 'en') => {
  const useGerman = lang ? (lang === 'de') : (Math.random() < 0.3);
  if (useGerman) {
    const adj = BAND_ADJECTIVES_DE[Math.floor(Math.random() * BAND_ADJECTIVES_DE.length)];
    const noun = BAND_NOUNS_DE[Math.floor(Math.random() * BAND_NOUNS_DE.length)];
    return `${adj} ${noun}`;
  } else {
    const adj = BAND_ADJECTIVES_EN[Math.floor(Math.random() * BAND_ADJECTIVES_EN.length)];
    const noun = BAND_NOUNS_EN[Math.floor(Math.random() * BAND_NOUNS_EN.length)];
    return `${adj} ${noun}`;
  }
};

const getRoleColor = (role: string, stationName?: string, stationColor?: string) => {
  const r = role?.toLowerCase();
  if (r === 'teacher' || r === 'admin') {
    if (!stationName) return '#64748b'; // Gray for teachers in Home/no station mode
    return '#34a853'; // Green when checked in at a station
  }
  if (!stationName) return '#64748b'; // Default gray
  
  if (stationColor && stationColor !== '#e5e7eb' && stationColor !== '#e2e8f0' && stationColor !== '#cbd5e1') {
    return stationColor;
  }
  
  const match = stationName.match(/\d+/);
  if (!match) return '#64748b';
  
  const num = parseInt(match[0]);
  if (num === 1 || num === 2) return '#eab308'; // Yellow
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  
  return '#64748b';
};

// --- Types & Interfaces ---
interface UserProfile {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  first_name: string;
  last_name?: string;
  instrument?: string;
  photo_url?: string;
  school_id?: string;
  schools?: { name: string };
  qr_token?: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  level?: number;
  media_link?: string;
  tomplay_url?: string;
  instrumentation?: Record<string, number>;
  school_id?: string;
}

interface SongSkill {
  id: string;
  song_id: string;
  user_id?: string;
  title: string;
  artist: string;
  progress: number;
  instrument: string;
  difficulty_level: 'starter' | 'original';
  is_stage_ready: boolean;
  locked: boolean;
  is_pending_approval: boolean;
  media_link?: string;
  tomplay_url?: string;
  verified_by_id?: string;
  verified_by?: { first_name: string, last_name: string };
}

interface BandMember {
  id: string;
  user_id: string | null;
  instrument: string;
  external_name?: string;
  users?: {
    id: string;
    first_name: string;
    photo_url: string;
  };
  profiles?: any;
}

interface Band {
  id: string;
  name: string;
  photo_url?: string;
  genre?: string;
  bio?: string;
  band_members?: BandMember[];
  band_songs?: { songs: Song }[];
  myInstrument?: string;
  myMemberId?: string;
  confetti_seen?: boolean;
  coach_id?: string;
  coach_is_manual?: boolean;
  coach?: { first_name: string, last_name: string, photo_url: string };
}

interface WallFormation {
  id: string;
  members: Array<{
    user_id: string;
    first_name: string;
    photo_url?: string;
    instrument: string;
    created_at: string;
  }>;
  memberMap: Record<string, any>;
  level: string;
  isComplete: boolean;
  isInitial?: boolean;
}

interface WallSong {
  id: string;
  song_id: string;
  artist: string;
  title: string;
  media_link?: string;
  instrumentation: Record<string, number>;
  formations: WallFormation[];
  level: string;
}

// --- Defensive Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard ErrorBoundary caught an error:", error, errorInfo);
    
    // Report silently to centralized telemetry
    reportClientError(error, {
      componentStack: errorInfo?.componentStack,
      severity: 'CRITICAL',
      context: 'ErrorBoundary.componentDidCatch'
    });
    
    // Auto-recover from dynamic module script/chunk loading errors
    const errorMessage = String(error?.message || error || "");
    const isChunkError = 
      errorMessage.includes("Importing a module script failed") ||
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("chunk") ||
      errorMessage.includes("loading-error") ||
      errorMessage.includes("dynamically imported");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("last_chunk_error_reload");
      const now = Date.now();
      
      // Auto-reload to load the fresh code bundle if we haven't reloaded in the last 15 seconds
      if (!lastReload || now - parseInt(lastReload) > 15000) {
        sessionStorage.setItem("last_chunk_error_reload", String(now));
        console.warn("Dynamic chunk loading failure detected. Triggering automatic hard reload to fetch the latest application bundle...");
        
        // Append a cache-busting parameter and reload
        const url = new URL(window.location.href);
        url.searchParams.set("reload_cb", String(now));
        window.location.href = url.toString();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass-panel animation-slide-up" style={{ 
          padding: '60px 40px', 
          textAlign: 'center', 
          margin: '40px auto', 
          maxWidth: '600px',
          background: 'white',
          borderRadius: '32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🎸</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '12px' }}>Hoppla! Ein kleiner "Saitenriss"...</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Beim Laden dieses Bereichs ist ein Fehler aufgetreten. Keine Sorge, deine Daten sind sicher!
          </p>
          {this.state.error && (
            <pre style={{
              background: '#f8fafc',
              color: '#ef4444',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              fontSize: '0.8rem',
              overflowX: 'auto',
              marginBottom: '24px',
              fontFamily: 'monospace',
              border: '1px solid #cbd5e1'
            }}>
              {this.state.error.message || String(this.state.error)}
              {this.state.error.stack && `\n\n${this.state.error.stack.split('\n').slice(0, 4).join('\n')}`}
            </pre>
          )}
          <button 
            onClick={() => {
              // Perform a hard cache-busting reload
              const url = new URL(window.location.href);
              url.searchParams.set("reload_manual", String(Date.now()));
              window.location.href = url.toString();
            }}
            style={{ 
              padding: '16px 32px', 
              background: 'var(--primary-color)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontWeight: 800, 
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Dashboard neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GroupedSongCard({ songGroup, onUpdateProgress, onSubmitForApproval, isBandReady, onDelete, userBands = [], userId, isExpanded, onToggle, onOpenPdfViewer }: any) {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const [activeDifficulty, setActiveDifficulty] = useState('starter'); // 'starter' | 'original'
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isChallengeHovered, setIsChallengeHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  
  const currentLevelSkills = songGroup.skills.filter((s: any) => s.difficulty_level === activeDifficulty);

  // Find the band this song belongs to (Finalized Band or Pending Proposal)
  const matchingBand = (songGroup.isBandSong || true) ? userBands.find((b: any) => 
    b.band_songs?.some((bs: any) => bs.song_id === songGroup.song_id) ||
    b.songs?.id === songGroup.song_id ||
    (b.status === 'proposal' && b.song_id === songGroup.song_id)
  ) : null;

  // Generate all required slots based on song instrumentation
  const instrumentation = songGroup.instrumentation || {};
  const slots: any[] = [];
  
  // Normalize instrumentation keys to prevent duplicates like "Guitar" and "E-Gitarre"
  const normalizedInst: Record<string, number> = {};
  Object.entries(instrumentation).forEach(([inst, count]) => {
    let key = inst;
    const lower = inst.toLowerCase();
    // Use consistent naming as seen in the editor
    if (lower === 'guitar' || lower === 'e-gitarre') key = 'E-Gitarre';
    else if (lower === 'bass' || lower === 'e-bass') key = 'E-Bass';
    else if (lower === 'drums' || lower === 'e-drums') key = 'E-Drums';
    else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') key = 'E-Piano';
    else if (lower === 'vocals' || lower === 'gesang') key = 'Vocals';
    
    // Take the maximum count if multiple names map to the same key (defensive)
    normalizedInst[key] = Math.max(normalizedInst[key] || 0, count as number);
  });

  Object.entries(normalizedInst).forEach(([inst, count]) => {
    if (inst.toLowerCase().includes('vocals') || inst.toLowerCase().includes('gesang')) return;
    for (let i = 1; i <= (count as number); i++) {
      slots.push({ instrument: inst, partNumber: i });
    }
  });

  if (slots.length === 0) {
    const uniqueInsts = Array.from(new Set(songGroup.skills.map((s: any) => s.instrument)));
    uniqueInsts.forEach((inst: any) => {
       if (!inst.toLowerCase().includes('vocals')) slots.push({ instrument: inst, partNumber: 1 });
    });
  }

  const getBaseInst = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
    if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
    if (n.includes('piano') || n.includes('keys')) return 'Piano';
    if (n.includes('bass')) return 'Bass';
    return name;
  };

  slots.sort((a, b) => {
    const orderMap: Record<string, number> = { 'Guitar': 1, 'Drums': 2, 'Piano': 3, 'Bass': 4 };
    const idxA = orderMap[getBaseInst(a.instrument)] || 99;
    const idxB = orderMap[getBaseInst(b.instrument)] || 99;
    if (idxA !== idxB) return idxA - idxB;
    return a.partNumber - b.partNumber;
  });

  const displaySkills = slots.map(slot => {
    const existing = currentLevelSkills.find((s: any) => {
      const sInst = (s.instrument || '').toLowerCase();
      const tInst = slot.instrument.toLowerCase();
      const isMatch = sInst === tInst || 
             (sInst === 'guitar' && tInst === 'e-gitarre') || (sInst === 'e-gitarre' && tInst === 'guitar') ||
             (sInst === 'bass' && tInst === 'e-bass') || (sInst === 'e-bass' && tInst === 'bass') ||
             (sInst === 'drums' && tInst === 'e-drums') || (sInst === 'e-drums' && tInst === 'drums') ||
             (sInst === 'piano' && tInst === 'e-piano') || (sInst === 'e-piano' && tInst === 'piano') || (sInst === 'keys' && tInst === 'e-piano');
      
      return isMatch && (s.part_number || 1) === slot.partNumber;
    });
    const result = existing ? { ...existing } : {
      id: `mock::${songGroup.song_id}::${slot.instrument}::${slot.partNumber}::${activeDifficulty}`,
      song_id: songGroup.song_id,
      instrument: slot.instrument,
      part_number: slot.partNumber,
      difficulty_level: activeDifficulty,
      progress: 0,
      is_stage_ready: false,
      is_pending_approval: false,
      isMock: true
    };
    if (!result.part_number) {
      result.part_number = slot.partNumber;
    }
    return result;
  });

  const getSkillLabel = (s: any) => {
    const instrumentation = songGroup?.instrumentation || {};
    const reqCount = instrumentation[s.instrument] || 0;
    if (reqCount > 1) {
      return `${s.instrument} ${s.part_number || 1}`;
    }
    const totalWithSameInst = displaySkills.filter((x: any) => x.instrument === s.instrument).length;
    if (totalWithSameInst > 1) {
      return `${s.instrument} ${s.part_number || 1}`;
    }
    return s.instrument;
  };

  const [activeSlotId, setActiveSlotId] = useState(() => {
    const pending = displaySkills.find((s: any) => s?.is_pending_approval);
    if (pending) return pending.id;

    // Smart Match: If the user plays an instrument in the band, select that instrument slot by default!
    const userBandInst = matchingBand?.myInstrument;
    if (userBandInst) {
      const matchedSlot = displaySkills.find((s: any) => {
        const sBase = getBaseInst(s.instrument);
        const uBase = getBaseInst(userBandInst);
        if (sBase === uBase) {
          // Match parts (e.g. "E-Gitarre 2" -> part 2)
          const partMatch = userBandInst.match(/\d+/);
          const userPartNum = partMatch ? parseInt(partMatch[0]) : 1;
          return (s.part_number || 1) === userPartNum;
        }
        return false;
      });
      if (matchedSlot) return matchedSlot.id;
      
      const baseMatchedSlot = displaySkills.find((s: any) => getBaseInst(s.instrument) === getBaseInst(userBandInst));
      if (baseMatchedSlot) return baseMatchedSlot.id;
    }

    return displaySkills[0]?.id || '';
  });

  useEffect(() => {
    // If current activeSlotId is not in the new displaySkills (common on difficulty switch)
    if (!displaySkills.find((s: any) => s?.id === activeSlotId)) {
      // Find the previous skill to know which instrument/part we were on
      let prevInst = '';
      let prevPart = 1;

      if (activeSlotId.startsWith('mock::')) {
        const parts = activeSlotId.split('::');
        prevInst = parts[2];   // instrument
        prevPart = parseInt(parts[3]) || 1; // partNumber
      } else {
        const prevSkill = songGroup.skills.find((s: any) => s.id === activeSlotId);
        if (prevSkill) {
          prevInst = prevSkill.instrument;
          prevPart = prevSkill.part_number || 1;
        }
      }
      
      if (prevInst) {
         // Try to find same instrument and part in the new list
         const match = displaySkills.find((s: any) => 
            s.instrument === prevInst && 
            (s.part_number || 1) === prevPart
         );
         if (match) {
           setActiveSlotId(match.id);
           return;
         }
      }

      // Fallback: stay on first instrument
      setActiveSlotId(displaySkills[0]?.id || '');
    }
  }, [activeDifficulty, displaySkills]);

  const activeSkill = displaySkills.find((s: any) => s?.id === activeSlotId) || (() => {
    if (activeSlotId && activeSlotId.startsWith('mock::')) {
      const parts = activeSlotId.split('::');
      const inst = parts[2];
      const partNum = parseInt(parts[3]) || 1;
      return displaySkills.find((s: any) => s.instrument === inst && (s.part_number || 1) === partNum);
    }
    return null;
  })() || displaySkills[0] || { progress: 0 };

  const [localProgress, setLocalProgress] = useState(activeSkill.progress);
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(activeSkill.progress);
    }
  }, [activeSkill.id, activeSkill.progress, isDragging]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', marginBottom: '16px', position: 'relative' }}>
      <div 
        onClick={onToggle}

        className={`glass-panel animation-slide-up ${isBandReady ? 'band-ready' : ''} ${activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? 'challenge-glow' : ''}`} 
        style={{ 
          padding: isExpanded ? (isMobile ? '20px' : '32px') : (isMobile ? '14px 16px' : '20px 24px'), 
          position: 'relative', 
          overflow: 'visible', 
          borderRadius: isMobile ? '20px' : '28px', 
          display: 'flex', 
          flexDirection: 'column',
          flex: 1,
          background: 'white', 
          borderLeft: `${isMobile ? '5px' : '8px'} solid ${isBandReady ? '#f59e0b' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || '#cbd5e1')}`,
          boxShadow: activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? `0 0 30px ${brandColor}22` : '0 10px 30px rgba(0,0,0,0.02)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          cursor: 'pointer'
        }}
      >
        {songGroup.isBandSong && (
          <div style={{ 
            position: 'absolute', 
            top: '-10px', 
            right: isMobile ? '16px' : '60px', 
            background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
            color: 'white', 
            fontSize: '0.65rem', 
            fontWeight: 900, 
            padding: '4px 12px', 
            borderRadius: '100px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            boxShadow: '0 8px 16px rgba(245, 158, 11, 0.4)', 
            zIndex: 20,
            border: '2px solid white'
          }}>
            <Users size={12} fill="white" /> Band Song
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '32px', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isMobile ? '100%' : '320px', flexShrink: 0 }}>
            <div 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (songGroup.tomplay_url || songGroup.media_link) window.open(songGroup.tomplay_url || songGroup.media_link, '_blank'); 
              }}
              style={{ 
                width: isMobile ? '44px' : '52px', height: isMobile ? '44px' : '52px', borderRadius: isMobile ? '12px' : '16px', 
                background: (songGroup.tomplay_url || songGroup.media_link) ? 'linear-gradient(135deg, #f8fafc, #f1f5f9)' : '#f8fafc', 
                color: (songGroup.tomplay_url || songGroup.media_link) ? brandColor : '#cbd5e1', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: (songGroup.tomplay_url || songGroup.media_link) ? 'pointer' : 'default', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                flexShrink: 0,
                boxShadow: (songGroup.tomplay_url || songGroup.media_link) ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                border: '1px solid #f1f5f9'
              }}
              className={(songGroup.tomplay_url || songGroup.media_link) ? "hover-scale" : ""}
            >
              <Music size={isMobile ? 20 : 24} />
            </div>
            
            <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                {songGroup.artist}
              </div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                {songGroup.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              {displaySkills.map((s: any) => (
                <div 
                  key={s.id} 
                  onClick={(e) => { e.stopPropagation(); setActiveSlotId(s.id); if (!isExpanded) onToggle(); }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: s.id === activeSlotId ? '5.5px 11.5px' : '6px 12px',
                    background: s.id === activeSlotId 
                      ? '#ffffff' 
                      : (s.progress > 0 ? APP_INSTRUMENT_COLORS[s.instrument] + '10' : '#f8fafc'),
                    borderRadius: '12px',
                    border: s.id === activeSlotId 
                      ? `1.5px solid ${APP_INSTRUMENT_COLORS[s.instrument] || brandColor}` 
                      : '1px solid ' + (s.progress > 0 ? APP_INSTRUMENT_COLORS[s.instrument] + '20' : '#f1f5f9'),
                    opacity: s.id === activeSlotId ? 1 : (s.progress > 0 ? 0.9 : 0.35),
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer'
                  }}
                  title={getSkillLabel(s) + ' (' + s.progress + '%)'}
                >
                  <span style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {APP_INSTRUMENT_ICONS[s.instrument] || '🎸'}
                    {displaySkills.filter((x: any) => x.instrument === s.instrument).length > 1 && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 900, 
                        opacity: 0.9, 
                        color: (s.id === activeSlotId || s.progress > 0) ? (APP_INSTRUMENT_COLORS[s.instrument] || brandColor) : '#94a3b8' 
                      }}>{s.part_number || 1}</span>
                    )}
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 900, 
                    color: (s.id === activeSlotId || s.progress > 0) ? (APP_INSTRUMENT_COLORS[s.instrument] || brandColor) : '#94a3b8' 
                  }}>
                    {s.id === activeSlotId ? localProgress : s.progress}%
                  </span>
                </div>
              ))}
            </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '16px' : '32px', 
            flexShrink: 0, 
            paddingLeft: isMobile ? 0 : '20px', 
            borderLeft: (!isMobile && width > 1000) ? '1px solid #f1f5f9' : 'none', 
            marginLeft: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-start',
            borderTop: isMobile ? '1px solid #f1f5f9' : 'none',
            paddingTop: isMobile ? '12px' : 0,
            marginTop: isMobile ? '4px' : 0
          }}>
            <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: isMobile ? 'auto' : '100px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Gesamt</div>
              <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 950, color: localProgress >= 100 ? '#34a853' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor), lineHeight: 1 }}>
                {localProgress}%
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(); }} 
              style={{ 
                width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', borderRadius: isMobile ? '10px' : '14px', 
                background: isExpanded ? '#1e293b' : '#f8fafc', 
                border: 'none', 
                color: isExpanded ? 'white' : '#64748b', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                boxShadow: isExpanded ? '0 8px 16px rgba(0,0,0,0.15)' : 'none',
                flexShrink: 0
              }}
            >
              <ChevronDown size={isMobile ? 20 : 24} />
            </button>
          </div>
        </div>

        <div style={{ 
          maxHeight: isExpanded ? '1000px' : '0', 
          opacity: isExpanded ? 1 : 0, 
          overflow: 'hidden', 
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
          marginTop: isExpanded ? '32px' : '0', 
          paddingTop: isExpanded ? '32px' : '0', 
          borderTop: isExpanded ? '2px solid #f8fafc' : 'none' 
        }}>
          <div style={{ display: 'flex', gap: isMobile ? '20px' : '48px', alignItems: 'flex-start', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ flex: isMobile ? '1 1 100%' : 2, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>Schwierigkeitsgrad:</div>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '5px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDifficulty('starter'); }} 
                      style={{ 
                        background: activeDifficulty === 'starter' ? 'white' : 'transparent', 
                        color: activeDifficulty === 'starter' ? '#34a853' : '#64748b', 
                        border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', 
                        boxShadow: activeDifficulty === 'starter' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      Starter
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDifficulty('original'); }} 
                      style={{ 
                        background: activeDifficulty === 'original' ? 'white' : 'transparent', 
                        color: activeDifficulty === 'original' ? '#f59e0b' : '#64748b', 
                        border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', 
                        boxShadow: activeDifficulty === 'original' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      Pro
                    </button>
                  </div>
                </div>

                {/* Cloud Link Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {songGroup.guitar_pro_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(songGroup.guitar_pro_url, '_blank');
                      }}
                      className="cloud-link-btn gp-btn"
                    >
                      <Music size={15} className="icon-main" style={{ strokeWidth: 2.5 }} />
                      GP
                      <ExternalLink size={12} style={{ opacity: 0.6 }} />
                    </button>
                  )}
                </div>
              </div>

              {activeSkill.is_pending_approval ? (
                <div style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)', color: '#ca8a04', padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #fde047' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Clock size={28} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>Wartet auf Bestätigung</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>Dein Lehrer schaut sich deine Performance gerade an.</div>
                  </div>
                </div>
              ) : activeSkill.is_stage_ready ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '20px', 
                    background: 'white', border: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                    flexShrink: 0
                  }}>
                    {APP_INSTRUMENT_ICONS[activeSkill.instrument]}
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #e6f4ea, #e6f4ea)', color: '#34a853', padding: '24px', borderRadius: '24px', flex: 1, display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e6f4ea' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <Award size={28} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{getSkillLabel(activeSkill)} Meisterleistung!</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>Du hast dieses Instrument zu 100% gemeistert.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '1.2rem' }}>{APP_INSTRUMENT_ICONS[activeSkill.instrument]}</span>
                       {getSkillLabel(activeSkill)} Training
                    </span>
                    <span style={{ color: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor }}>{localProgress}%</span>
                  </div>
                  
                  <div style={{ position: 'relative', width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px' }}></div>
                    
                    <div style={{ 
                      position: 'absolute', 
                      height: '12px', 
                      width: `${localProgress}%`, 
                      background: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, 
                      borderRadius: '6px', 
                      transition: 'width 0.2s ease-out' 
                    }}></div>
                    
                    <input 
                      type="range" 
                      min="0" max="90" step="5"
                      value={localProgress} 
                      onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setLocalProgress(val);
                      }}
                      onPointerUp={(e) => {
                        setIsDragging(false);
                        const finalVal = parseInt(e.currentTarget.value);
                        setLocalProgress(finalVal);
                        onUpdateProgress(activeSkill.id, finalVal, { 
                          songId: activeSkill.song_id, 
                          instrument: activeSkill.instrument, 
                          difficulty: activeSkill.difficulty_level,
                          partNumber: activeSkill.part_number || 1
                        });
                      }}
                      onPointerCancel={(e) => {
                        setIsDragging(false);
                        const finalVal = parseInt(e.currentTarget.value);
                        setLocalProgress(finalVal);
                        onUpdateProgress(activeSkill.id, finalVal, { 
                          songId: activeSkill.song_id, 
                          instrument: activeSkill.instrument, 
                          difficulty: activeSkill.difficulty_level,
                          partNumber: activeSkill.part_number || 1
                        });
                      }}
                      style={{ 
                        width: '100%', 
                        height: '40px', 
                        appearance: 'none', 
                        background: 'transparent', 
                        cursor: 'pointer', 
                        position: 'relative', 
                        zIndex: 10,
                        margin: 0,
                        color: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor
                      }} 
                      className="custom-range-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '200px', paddingTop: isMobile ? '12px' : '40px' }}>
              {!activeSkill.is_pending_approval && !activeSkill.is_stage_ready && localProgress >= 90 && (
                <button 
                  
                  
                  onClick={() => onSubmitForApproval({ ...activeSkill, progress: localProgress })} 
                  style={{ 
                    width: '100%', padding: '18px', borderRadius: '20px', 
                    background: isChallengeHovered ? '#000000' : brandColor, 
                    color: 'white', border: 'none', 
                    fontWeight: 900, fontSize: '1rem', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                    boxShadow: isChallengeHovered ? `0 15px 30px rgba(0,0,0,0.3)` : `0 12px 24px ${brandColor}44`,
                    transform: isChallengeHovered ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }} 
                >
                  <Zap size={22} fill="white" /> CHALLENGE STARTEN
                </button>
              )}
            </div>
          </div>

          {songGroup.isBandSong && matchingBand && (() => {
            const required = songGroup.instrumentation || {};
            
            // --- PRO CODER: ALIAS-AWARE OCCUPANCY CHECK ---
            const normalize = (name: string) => {
              const n = (name || '').toLowerCase().trim();
              if (n === 'guitar' || n === 'e-gitarre') return 'E-Gitarre';
              if (n === 'bass' || n === 'e-bass') return 'E-Bass';
              if (n === 'drums' || n === 'e-drums' || n === 'schlagzeug') return 'E-Drums';
              if (n === 'piano' || n === 'keys' || n === 'e-piano') return 'E-Piano';
              if (n === 'vocals' || n === 'gesang') return 'Vocals';
              return name;
            };

            const filled: Record<string, number> = {};
            matchingBand.band_members?.forEach((m: any) => {
              const norm = normalize(m.instrument);
              filled[norm] = (filled[norm] || 0) + 1;
            });
            
            const missing: string[] = [];
            let isFullyStaffed = true;
            
            const bandSong = matchingBand.band_songs?.find((bs: any) => bs.song_id === songGroup.song_id);
            const isSongActive = 
              (matchingBand.songs?.id === songGroup.song_id) || 
              (bandSong?.status === 'active');

            if (isSongActive) {
              isFullyStaffed = true;
            } else {
              const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
              order.forEach(targetInst => {
                const matchingEntries = Object.entries(required).filter(([inst]) => {
                  const norm = normalize(inst);
                  const normTarget = normalize(targetInst);
                  return norm === normTarget;
                });

                matchingEntries.forEach(([inst, count]) => {
                  const normTarget = normalize(inst);
                  if (normTarget === 'Vocals') return;
                  
                  const needed = count as number;
                  const current = filled[normTarget] || 0;
                  if (current < needed) {
                    isFullyStaffed = false;
                    for(let i=0; i < (needed-current); i++) missing.push(inst);
                  }
                });
              });
            }

            return (
              <div style={{ marginTop: '32px', padding: '24px', background: isFullyStaffed ? 'linear-gradient(135deg, #f8fafc, #f1f5f9)' : '#f8fafc', borderRadius: '24px', border: isFullyStaffed ? '2px solid #eab308' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#ec4899' }}><Users size={20} /></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Band-Belegung: <span style={{ color: '#ec4899' }}>{matchingBand.name}</span>
                    </div>
                  </div>
                  
                  {isFullyStaffed ? (
                    <div style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: 'white', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }}>
                      <Star size={14} fill="white" /> VOLLSTÄNDIG
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
                      {missing.length} Platz {missing.length === 1 ? 'frei' : 'frei'}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {(() => {
                    const grouped: Record<string, any> = {};
                    (matchingBand.band_members || []).forEach((m: any) => {
                      const u = Array.isArray(m.users) ? m.users[0] : m.users;
                      const uid = u?.id || m.external_name || m.user_id;
                      if (!uid) return;
                      if (!grouped[uid]) {
                        grouped[uid] = { ...m, user: u, instruments: [m.instrument] };
                      } else {
                        if (!grouped[uid].instruments.includes(m.instrument)) {
                          grouped[uid].instruments.push(m.instrument);
                        }
                      }
                    });

                    return Object.values(grouped).map((member: any, idx: number) => {
                      const u = member.user;
                      const nonVocals = member.instruments.filter((inst: string) => !inst.toLowerCase().includes('vocals') && !inst.toLowerCase().includes('gesang'));
                      const displayInst = nonVocals.length > 0 ? nonVocals[0] : member.instruments[0];

                      return (
                        <div key={`mem-${idx}`} style={{ 
                          display: 'flex', alignItems: 'center', gap: '10px', 
                          background: 'white', padding: '8px 14px', borderRadius: '16px', 
                          border: member.user_id === userId ? '1.5px solid #ef4444' : '1px solid #f1f5f9',
                          boxShadow: member.user_id === userId ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)' 
                        }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                            {member.user_id ? (
                               <StudioAvatar src={u?.photo_url} user={u} />
                            ) : (
                               <div style={{ width: '100%', height: '100%', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>{member.external_name?.[0] || 'E'}</div>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                            {APP_INSTRUMENT_ICONS[displayInst] || '🎸'} {member.user_id ? (u?.first_name || 'Mitglied') : member.external_name}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  
                  {missing.map((inst, idx) => (
                    <div key={`miss-${idx}`} style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', 
                      background: 'rgba(0,0,0,0.02)', padding: '8px 14px', borderRadius: '16px', 
                      border: '1px dashed #cbd5e1', opacity: 0.6
                    }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                        ?
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8' }}>
                        {APP_INSTRUMENT_ICONS[inst] || '🎸'} Gesucht
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isConfirmingDelete ? (
          <div style={{ display: 'flex', gap: '8px', animation: 'scaleIn 0.2s' }}>
             <button 
              onClick={() => onDelete(songGroup.song_id)}
              style={{ 
                width: '52px', height: '52px', borderRadius: '18px', 
                background: '#f43f5e', border: 'none', color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Endgültig löschen"
            >
              <Check size={24} strokeWidth={3} />
            </button>
            <button 
              onClick={() => setIsConfirmingDelete(false)}
              style={{ 
                width: '52px', height: '52px', borderRadius: '18px', 
                background: '#94a3b8', border: 'none', color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Abbrechen"
            >
              <X size={24} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsConfirmingDelete(true)}
            style={{ 
              width: '52px', height: '52px', borderRadius: '18px', 
              background: '#fff1f2', 
              border: '1px solid #ffe4e6', 
              color: '#f43f5e', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.1)'
            }}
            className="hover-scale"
            title="Arrangement entfernen"
          >
            <Trash2 size={24} />
          </button>
        )}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  // Purge legacy shared credentials from localStorage to enforce per-tab isolation
  try {
    localStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_cached_user');
    localStorage.removeItem('groovelab_location_mode');
  } catch (e) {}
}

// Auto-setup kiosk mode from URL parameters
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const isStandalone = typeof window !== 'undefined' && 
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

// Handle platform override from URL (e.g. from LandingPage search)
const targetPlatform = params.get('platform');
if (targetPlatform && (targetPlatform === 'campus' || targetPlatform === 'groovelab' || targetPlatform === 'ensembles')) {
  sessionStorage.setItem('groovelab_active_platform', targetPlatform);
  if (isStandalone) {
    params.delete('platform');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
    if (typeof window !== 'undefined' && window.history) {
      safeReplaceState({}, '', newUrl);
    }
  }
}

const kioskTokenParam = params.get('kiosk_token');
if (kioskTokenParam) {
  localStorage.setItem('groovelab_kiosk_token', kioskTokenParam);
  
  // Persist station_id if provided in the redirect URL
  const urlStationId = params.get('station_id') || params.get('kiosk_station_id');
  if (urlStationId) {
    localStorage.setItem('groovelab_station_id', urlStationId);
  } else {
    localStorage.removeItem('groovelab_station_id');
  }

  // Persist kiosk_room_id if provided
  const urlRoomId = params.get('kiosk_room_id');
  if (urlRoomId) {
    localStorage.setItem('groovelab_kiosk_room_id', urlRoomId);
  } else {
    localStorage.removeItem('groovelab_kiosk_room_id');
  }

  sessionStorage.removeItem('groovelab_user_id');
  sessionStorage.removeItem('groovelab_location_mode');
  
  // Strip sensitive tokens from URL history universally across all browsers
  params.delete('kiosk_token');
  params.delete('station_id');
  params.delete('kiosk_station_id');
  params.delete('kiosk_room_id');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  window.history.replaceState({}, '', newUrl);
}

const kioskStationId = params.get('kiosk_station_id') || params.get('station_id');
if (kioskStationId) {
  localStorage.setItem('groovelab_station_id', kioskStationId);
  sessionStorage.removeItem('groovelab_user_id');
  sessionStorage.removeItem('groovelab_location_mode');
  
  // Strip parameters and redirect to clean up URL ONLY in standalone mode
  if (isStandalone) {
    params.delete('kiosk_station_id');
    params.delete('station_id');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
    window.location.replace(newUrl);
  }
}

// Persist kiosk_room_id to localStorage so we can restore it on "Beenden"
const kioskRoomIdFromUrl = params.get('kiosk_room_id');
if (kioskRoomIdFromUrl) {
  localStorage.setItem('groovelab_kiosk_room_id', kioskRoomIdFromUrl);
}

if (typeof window !== 'undefined') {
  window.alert = (message: string) => {
    // 1. Remove existing custom alert if any
    const existing = document.getElementById('apple-alert-root');
    if (existing) {
      existing.remove();
    }

    // 2. Create styling tag if not present
    if (!document.getElementById('apple-alert-styles')) {
      const style = document.createElement('style');
      style.id = 'apple-alert-styles';
      style.innerHTML = `
        @keyframes appleAlertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes appleAlertScaleIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .apple-alert-close-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
        .apple-alert-close-btn:active {
          transform: translateY(0);
          filter: brightness(0.95);
        }
      `;
      document.head.appendChild(style);
    }

    // 3. Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'apple-alert-root';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'rgba(15, 23, 42, 0.3)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.setProperty('-webkit-backdrop-filter', 'blur(8px)');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.fontFamily = 'inherit';

    // Determine type
    const msgLower = String(message).toLowerCase();
    const isError = msgLower.includes('fehler') || msgLower.includes('error') || msgLower.includes('fehlgeschlagen') || msgLower.includes('konnte nicht') || msgLower.includes('deaktiviert') || msgLower.includes('gesperrt');
    const isSuccess = msgLower.includes('erfolg') || msgLower.includes('erfolgreich') || msgLower.includes('glückwunsch') || msgLower.includes('kopiert') || msgLower.includes('bereit') || msgLower.includes('gespeichert') || msgLower.includes('zurückgesetzt') || msgLower.includes('gelöscht') || msgLower.includes('gesendet') || msgLower.includes('eingereicht') || msgLower.includes('akzeptiert') || msgLower.includes('✅') || msgLower.includes('🎉') || msgLower.includes('🤘') || msgLower.includes('🚀');

    let iconHtml = '';
    const activePlat = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab';
    let isCampus = activePlat === 'campus';
    if (typeof window !== 'undefined' && !isCampus) {
      if (document.body && (
        document.body.innerText.includes('Campus Räumlichkeiten') ||
        document.body.innerText.includes('Campus Stundenplan') ||
        document.body.innerText.includes('Campus')
      )) {
        isCampus = true;
      }
    }
    let titleText = isCampus ? 'Campus' : (activePlat === 'groovelab' ? 'GrooveLab' : 'Campus-Groovelab');
    let btnBackground = 'linear-gradient(135deg, #34a853, #34a853)';
    let btnShadow = '0 4px 12px rgba(52, 168, 83, 0.2)';
    
    if (isError) {
      titleText = 'Hinweis';
      btnBackground = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btnShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
      `;
    } else if (isSuccess) {
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(52, 168, 83, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(52, 168, 83, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `;
    } else {
      btnBackground = 'linear-gradient(135deg, #eab308, #ca8a04)';
      btnShadow = '0 4px 12px rgba(234, 179, 8, 0.2)';
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(234, 179, 8, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(234, 179, 8, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
      `;
    }

    // Create alert box
    const alertBox = document.createElement('div');
    alertBox.style.background = 'rgba(255, 255, 255, 0.95)';
    alertBox.style.backdropFilter = 'blur(20px)';
    alertBox.style.setProperty('-webkit-backdrop-filter', 'blur(20px)');
    alertBox.style.borderRadius = '24px';
    alertBox.style.width = '320px';
    alertBox.style.maxWidth = '90%';
    alertBox.style.display = 'flex';
    alertBox.style.flexDirection = 'column';
    alertBox.style.alignItems = 'center';
    alertBox.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.15), 0 1px 3px rgba(15, 23, 42, 0.05)';
    alertBox.style.border = '1px solid rgba(226, 232, 240, 0.8)';
    alertBox.style.color = '#0f172a';
    alertBox.style.textAlign = 'center';
    alertBox.style.transform = 'scale(0.95) translateY(10px)';
    alertBox.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out';
    alertBox.style.boxSizing = 'border-box';
    alertBox.style.padding = '28px 24px 24px';

    // Safe innerHTML
    const escapedMessage = String(message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");

    alertBox.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;">
        ${iconHtml}
        <div style="font-size: 1.25rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">
          ${titleText}
        </div>
        <div style="font-size: 0.95rem; font-weight: 600; color: #475569; line-height: 1.5; white-space: normal; word-break: break-word; margin-bottom: 24px;">
          ${escapedMessage}
        </div>
        <button class="apple-alert-close-btn" style="
          width: 100%;
          padding: 14px 20px;
          border-radius: 16px;
          background: ${btnBackground};
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          outline: none;
          box-shadow: ${btnShadow};
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          font-family: inherit;
        ">OK</button>
      </div>
    `;

    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    // Trigger animations in next tick
    setTimeout(() => {
      overlay.style.opacity = '1';
      alertBox.style.transform = 'scale(1) translateY(0)';
    }, 15);

    const closeAlert = () => {
      overlay.style.opacity = '0';
      alertBox.style.transform = 'scale(0.95) translateY(10px)';
      setTimeout(() => {
        overlay.remove();
      }, 250);
    };

    const closeBtn = alertBox.querySelector('.apple-alert-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeAlert);
    }

    // Support ESC and ENTER key to close
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeAlert();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);
  };
}

function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/[\s\-.]+/);
  return parts
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

const DashboardLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '40px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div className="animate-spin" style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(245, 158, 11, 0.1)',
      borderTopColor: '#f59e0b',
      borderRadius: '50%'
    }}></div>
    <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
      Bereich wird geladen...
    </div>
  </div>
);

async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries = 3,
  delay = 500
): Promise<{ data: T | null; error: any }> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const res = await queryFn();
      if (!res.error) return res;
      
      const status = res.error?.status || res.error?.code;
      const isNetworkError = !status || status >= 500 || status === 'PGRST100' || String(res.error?.message || '').toLowerCase().includes('fetch');
      if (!isNetworkError || attempt === retries - 1) {
        return res;
      }
    } catch (err: any) {
      if (attempt === retries - 1) {
        return { data: null, error: err };
      }
    }
    attempt++;
    console.warn(`[SupabaseRetry] Query failed, retrying attempt ${attempt}/${retries} in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }
  return { data: null, error: new Error('All query attempts failed.') };
}

function App() {
  const masterPricing = useMasterPricing();

  const [maintenanceBypass, setMaintenanceBypass] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (
      sessionStorage.getItem('cg_maintenance_bypass') === 'true' || 
      localStorage.getItem('cg_maintenance_bypass') === 'true'
    );
  });

  const maintenanceState = useMemo(() => {
    if (masterPricing?.specialOffers) {
      const entry = masterPricing.specialOffers.find((o: any) => o?.id === '__cg_master_maintenance_state__');
      if (entry?.state) return entry.state;
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('cg_master_maintenance_state');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }
    return null;
  }, [masterPricing?.specialOffers]);

  const broadcastAnnouncement = useMemo(() => {
    if (masterPricing?.specialOffers) {
      const entry = masterPricing.specialOffers.find((o: any) => o?.id === '__cg_master_broadcast_announcement__');
      if (entry?.state) return entry.state;
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('cg_master_broadcast_announcement');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }
    return null;
  }, [masterPricing?.specialOffers]);

  // Declarative definition of renderLegalModals to ensure availability across all routes/landing pages
  const renderLegalModals = () => {
    const isLegalOpen = showPrivacy || showAgb || showImpressum;
    const initialTab: 'privacy' | 'terms' | 'impressum' = showPrivacy ? 'privacy' : (showAgb ? 'terms' : 'impressum');

    return (
      <LegalTextModal 
        isOpen={isLegalOpen}
        initialTab={initialTab}
        onClose={() => {
          setShowPrivacy(false);
          setShowAgb(false);
          setShowImpressum(false);
        }}
      />
    );
  };

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showStandardLogin, setShowStandardLogin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('groovelab_local_profiles');
      const list = stored ? JSON.parse(stored) : [];
      return !Array.isArray(list) || list.length === 0;
    } catch {
      return true;
    }
  });

  const isSignup = location.pathname === '/signup';
  const currentView = (location.pathname === '/login' || location.pathname === '/signup')
    ? 'login'
    : (location.pathname === '/' ? 'landing' : 'dashboard');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMouseOver = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        const tagName = target.tagName?.toLowerCase();
        const isButton = tagName === 'button' || target.getAttribute('role') === 'button' || target.style.cursor === 'pointer' || tagName === 'a';
        if (isButton && !target.hasAttribute('title')) {
          const text = target.innerText?.trim();
          const ariaLabel = target.getAttribute('aria-label');
          const desc = ariaLabel || text;

          let tooltip = '';
          if (desc) {
            const descLower = desc.toLowerCase();
            if (descLower.includes('speichern') || descLower.includes('save')) {
              tooltip = 'Änderungen speichern und sichern';
            } else if (descLower.includes('abbrechen') || descLower.includes('cancel')) {
              tooltip = 'Vorgang abbrechen und Änderungen verwerfen';
            } else if (descLower.includes('schließen') || descLower.includes('close') || descLower === 'x') {
              tooltip = 'Dieses Fenster schließen';
            } else if (descLower.includes('löschen') || descLower.includes('delete') || descLower.includes('entfernen')) {
              tooltip = 'Diesen Eintrag unwiderruflich löschen';
            } else if (descLower.includes('bearbeiten') || descLower.includes('edit')) {
              tooltip = 'Diesen Eintrag bearbeiten';
            } else if (descLower.includes('hinzufügen') || descLower.includes('neu') || descLower === '+') {
              tooltip = 'Einen neuen Eintrag hinzufügen';
            } else if (descLower.includes('abmelden') || descLower.includes('logout') || descLower.includes('ausloggen')) {
              tooltip = 'Sicher vom System abmelden';
            } else if (descLower.includes('profil')) {
              tooltip = 'Benutzerprofil anzeigen und bearbeiten';
            } else if (descLower.includes('einstellungen') || descLower.includes('settings')) {
              tooltip = 'Systemeinstellungen öffnen';
            } else if (descLower.includes('aktualisieren') || descLower.includes('refresh') || descLower.includes('neu laden')) {
              tooltip = 'Daten neu laden und aktualisieren';
            } else if (descLower.includes('suchen') || descLower.includes('search')) {
              tooltip = 'Suche ausführen';
            } else if (descLower.includes('stundenplan einreichen') || descLower.includes('einreichen')) {
              tooltip = 'Diesen Stundenplan offiziell zur Prüfung einreichen';
            } else if (descLower.includes('krankmelden') || descLower.includes('krank')) {
              tooltip = 'Als krank melden und Termine für den Zeitraum absagen';
            } else if (descLower.includes('raumzuteilung') || descLower.includes('räume zuteilen')) {
              tooltip = 'Räume für die heutigen Termine zuteilen';
            } else if (descLower.includes('zurück')) {
              tooltip = 'Zur vorherigen Ansicht zurückkehren';
            } else if (descLower.includes('weiter')) {
              tooltip = 'Zur nächsten Ansicht fortfahren';
            } else if (descLower.includes('senden') || descLower.includes('abschicken')) {
              tooltip = 'Nachricht oder Daten absenden';
            } else if (descLower.includes('chat') || descLower.includes('nachricht')) {
              tooltip = 'Chat-Nachrichten anzeigen';
            } else if (descLower.includes('bestätigen') || descLower.includes('freigeben') || descLower.includes('akzeptieren')) {
              tooltip = 'Aktion bestätigen und freigeben';
            }
          }

          if (!tooltip) {
            const svg = target.querySelector('svg');
            if (svg) {
              if (svg.classList.contains('lucide-trash') || svg.classList.contains('lucide-trash2')) {
                tooltip = 'Diesen Eintrag löschen';
              } else if (svg.classList.contains('lucide-pencil') || svg.classList.contains('lucide-edit')) {
                tooltip = 'Diesen Eintrag bearbeiten';
              } else if (svg.classList.contains('lucide-plus') || svg.classList.contains('lucide-plus-circle')) {
                tooltip = 'Einen neuen Eintrag hinzufügen';
              } else if (svg.classList.contains('lucide-x') || svg.classList.contains('lucide-x-circle')) {
                tooltip = 'Schließen';
              } else if (svg.classList.contains('lucide-settings')) {
                tooltip = 'Einstellungen öffnen';
              } else if (svg.classList.contains('lucide-chevron-left')) {
                tooltip = 'Zurück / Vorherige Seite';
              } else if (svg.classList.contains('lucide-chevron-right')) {
                tooltip = 'Weiter / Nächste Seite';
              } else if (svg.classList.contains('lucide-calendar')) {
                tooltip = 'Kalender öffnen';
              } else if (svg.classList.contains('lucide-user')) {
                tooltip = 'Profil anzeigen';
              } else if (svg.classList.contains('lucide-logout')) {
                tooltip = 'Abmelden';
              }
            }
          }

          if (!tooltip && desc && desc.length < 50) {
            tooltip = `${desc} ausführen`;
          }

          if (tooltip) {
            target.setAttribute('title', tooltip);
          }
        }
        target = target.parentElement;
      }
    };

    document.body.addEventListener('mouseover', handleMouseOver);
    return () => document.body.removeEventListener('mouseover', handleMouseOver);
  }, []);

  const qrPathMatch = location.pathname.match(/^\/qr\/([^/?#]+)/);

  const [loggedInUserId, setLoggedInUserIdRaw] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                         localStorage.getItem('groovelab_is_master_admin') === 'true';
    const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
    const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

    const urlParams = new URLSearchParams(window.location.search);
    const isGhost = urlParams.get('support_ghost') === 'true' || 
                    urlParams.get('ghost_session') === 'true' || 
                    sessionStorage.getItem('groovelab_support_ghost') === 'true';
    const ghostSchoolId = urlParams.get('school_id') || 
                          urlParams.get('ghost_school_id') || 
                          sessionStorage.getItem('groovelab_ghost_school_id');
    if (isGhost && ghostSchoolId && isMasterValid) {
      return 'master-support-id';
    }
    const storedId = sessionStorage.getItem('groovelab_user_id');
    if (storedId) return storedId;
    try {
      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {}
    return null;
  });

  const setLoggedInUserId = React.useCallback((val: string | null | ((prev: string | null) => string | null)) => {
    setLoggedInUserIdRaw((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        if (nextVal) {
          sessionStorage.setItem('groovelab_user_id', nextVal);
        } else {
          sessionStorage.removeItem('groovelab_user_id');
        }
      }
      return nextVal;
    });
  }, []);

  const [locationMode, setLocationModeRaw] = useState<'lab' | 'home'>(() => {
    if (typeof window === 'undefined') return 'home';
    return (sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home';
  });

  const setLocationMode = React.useCallback((val: 'lab' | 'home' | ((prev: 'lab' | 'home') => 'lab' | 'home')) => {
    setLocationModeRaw((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev === nextVal) return prev;
      if (typeof window !== 'undefined') {
        if (nextVal) {
          sessionStorage.setItem('groovelab_location_mode', nextVal);
        } else {
          sessionStorage.removeItem('groovelab_location_mode');
        }
      }
      return nextVal;
    });
  }, []);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);



  const [showDeletionPrompt, setShowDeletionPrompt] = useState(false);
  const [deletionPromptUserId, setDeletionPromptUserId] = useState<string | null>(null);
  const [deletionPromptIsHome, setDeletionPromptIsHome] = useState<boolean | undefined>(undefined);

  const [showAutoLockWarning, setShowAutoLockWarning] = useState(false);
  const [autoLockCountdown, setAutoLockCountdown] = useState(30);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPwaUpdateToast, setShowPwaUpdateToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset install banner dismiss state when scanning QR code or following QR links
    const isQR = window.location.pathname.includes('/qr/') || 
                 window.location.search.includes('qr') || 
                 window.location.search.includes('auto_pair') || 
                 window.location.search.includes('token');
    if (isQR) {
      localStorage.removeItem('groovelab_install_prompt_dismissed');
    }

    // Check if running on localhost / local development environment
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local')
    );

    // In local development, unregister any stale service worker to prevent cached index.html from freezing Vite HMR!
    if (isLocalhost) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      }
    } else if ('serviceWorker' in navigator) {
      // Register service worker in production to ensure PWA installability and update checking
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('Service Worker registered successfully on load:', reg.scope);

          // If there is already a waiting worker, prompt user to update smoothly via floating toast
          if (reg.waiting && navigator.serviceWorker.controller) {
            console.log('[PWA] Waiting service worker found on load.');
            setShowPwaUpdateToast(true);
          }

          // Register offline sync queue flusher on network restore
          window.addEventListener('online', () => {
            console.log('[OfflineSync] Network restored. Flushing offline queue...');
            flushOfflineSyncQueue();
          });

          // Check for updates on the server periodically (every 5 minutes)
          setInterval(() => {
            if (navigator.onLine) {
              reg.update().catch((err) => {
                console.warn('[PWA] Service Worker update check failed:', err);
              });
              console.log('[PWA] Checking for updates on the server...');
            }
          }, 1000 * 60 * 5);

          // Handle updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New content is available; prompt user via toast.');
                    setShowPwaUpdateToast(true);
                  } else {
                    console.log('[PWA] Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => console.error('Service Worker registration failed on load:', err));
    }

    // Intercept external links inside standalone PWA to prevent flickering and white screen in WebKit in-app browser
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        try {
          if (!anchor.href.startsWith('http://') && !anchor.href.startsWith('https://')) {
            return; // Allow mailto:, tel:, etc. to bypass URL checking and use default OS handling
          }
          const url = new URL(anchor.href, window.location.origin);
          const isExternal = url.origin !== window.location.origin;
          const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

          if (isStandalone && isExternal) {
            e.preventDefault();
            window.open(anchor.href, '_blank');
          }
        } catch (err) {
          // Ignore malformed URLs
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    // Clear native PWA app badge when app is launched or becomes active
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }

    // iOS Web AudioContext auto-unlock on first user interaction
    const unlockAudioContext = () => {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const dummyCtx = new AudioCtxClass();
          if (dummyCtx.state === 'suspended') {
            dummyCtx.resume().catch(() => {});
          }
          const osc = dummyCtx.createOscillator();
          const gain = dummyCtx.createGain();
          gain.gain.value = 0.00001;
          osc.connect(gain);
          gain.connect(dummyCtx.destination);
          osc.start(0);
          osc.stop(0.001);
        }
      } catch (e) {}
    };
    window.addEventListener('pointerdown', unlockAudioContext, { passive: true, once: true });
    window.addEventListener('keydown', unlockAudioContext, { passive: true, once: true });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) return;

      const dismissedTime = localStorage.getItem('groovelab_install_prompt_dismissed');
      const dismissedRecent = dismissedTime && (Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000);
      
      if (!dismissedRecent) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('click', handleAnchorClick);
      window.removeEventListener('pointerdown', unlockAudioContext);
      window.removeEventListener('keydown', unlockAudioContext);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !loggedInUserId) return;
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && !isStandalone) {
      const dismissedTime = localStorage.getItem('groovelab_install_prompt_dismissed');
      const dismissedRecent = dismissedTime && (Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000);
      if (!dismissedRecent) {
        setShowInstallBanner(true);
      }
    }

    // Auto-subscribe or sync web push notifications in the background if permission is already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        subscribeUserToPush(loggedInUserId)
          .then((success) => console.log('PWA Push auto-subscribe sync outcome:', success))
          .catch((err) => console.error('Failed to sync push subscription:', err));
      }, 2000);
    }
  }, [loggedInUserId]);

  const debounceDashboardTimerRef = useRef<any>(null);
  
  const debouncedFetchDashboardData = (userId: string, isInitial: boolean = false) => {
    if (debounceDashboardTimerRef.current) clearTimeout(debounceDashboardTimerRef.current);
    debounceDashboardTimerRef.current = setTimeout(() => {
      fetchDashboardData(userId, isInitial);
    }, 300);
  };

  // States for Kiosk lookup and legal modals
  const [kioskDetails, setKioskDetails] = useState<any>(null);
  const [loadingKiosk, setLoadingKiosk] = useState<boolean>(() => typeof window !== 'undefined' ? !!localStorage.getItem('groovelab_kiosk_token') : false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAgb, setShowAgb] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showPilotAgreementModal, setShowPilotAgreementModal] = useState(false);
  const [showTrialInfoModal, setShowTrialInfoModal] = useState(false);
  const [stationIdFromStorage, setStationIdFromStorage] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('groovelab_station_id') : null);
  const [isCampusUnlocked, setIsCampusUnlocked] = useState(false);
  const [showCampusPinPrompt, setShowCampusPinPrompt] = useState(false);
  const [isGlobalHelpCenterOpen, setIsGlobalHelpCenterOpen] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_simulated_date') || null;
    }
    return null;
  });

  const [campusStudentUiLevel, setCampusStudentUiLevel] = useState<CampusUiLevel>(() => {
    if (typeof window === 'undefined') return 'junior';
    const saved = localStorage.getItem('campus_student_ui_level');
    if (saved === 'junior' || saved === 'teen' || saved === 'pro') return saved as CampusUiLevel;
    return 'junior';
  });

  const [parentUnlocked, setParentUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
  });

  const [, setParentPermissionsVersion] = useState<number>(0);

  useEffect(() => {
    const handleLevelChangeEvt = (e: any) => {
      if (e?.detail) setCampusStudentUiLevel(e.detail);
    };
    const handleParentModeChange = (e: any) => {
      if (typeof e?.detail === 'boolean') setParentUnlocked(e.detail);
    };
    const handlePermissionChange = () => {
      setParentPermissionsVersion(v => v + 1);
    };
    const handleSimDateSync = () => {
      const s = localStorage.getItem('groovelab_simulated_date');
      setSimulatedDate(s || null);
    };
    const handleOpenHelpCenter = () => {
      setIsGlobalHelpCenterOpen(true);
    };
    window.addEventListener('campus_ui_level_changed', handleLevelChangeEvt);
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    window.addEventListener('campus_board_permission_changed', handlePermissionChange);
    window.addEventListener('campus_open_help_center', handleOpenHelpCenter);
    window.addEventListener('storage', handleSimDateSync);
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => {
      window.removeEventListener('campus_ui_level_changed', handleLevelChangeEvt);
      window.removeEventListener('groovelab_parent_mode_changed', handleParentModeChange);
      window.removeEventListener('campus_board_permission_changed', handlePermissionChange);
      window.removeEventListener('campus_open_help_center', handleOpenHelpCenter);
      window.removeEventListener('storage', handleSimDateSync);
      window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    };
  }, []);

  // Effect to resolve the kiosk token on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check query params to capture and persist the coupling state on this device
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('kiosk_token');
    const urlStationId = params.get('station_id');
    const urlRoomId = params.get('kiosk_room_id');

    if (urlToken && urlStationId) {
      console.log('[KioskAutoSave] Found coupling parameters in URL, saving to localStorage:', { urlToken, urlStationId, urlRoomId });
      localStorage.setItem('groovelab_kiosk_token', urlToken);
      localStorage.setItem('groovelab_station_id', urlStationId);
      if (urlRoomId) {
        localStorage.setItem('groovelab_kiosk_room_id', urlRoomId);
      }
      localStorage.setItem('groovelab_active_platform', 'groovelab');
      setStationIdFromStorage(urlStationId);

      // Clean up the URL parameters if running in standalone (PWA) mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isStandalone) {
        const cleanUrl = window.location.origin + window.location.pathname;
        safeReplaceState({}, document.title, cleanUrl);
      }
    }
    
    const token = localStorage.getItem('groovelab_kiosk_token');
    if (!token) {
      setLoadingKiosk(false);
      return;
    }
    
    async function loadKiosk() {
      try {
        console.log('[KioskResolver] Resolving kiosk token:', token);
        const { data, error } = await supabase
          .from('kiosks')
          .select('*, stations(*), rooms(*)')
          .eq('secret_token', token)
          .maybeSingle();
          
        if (error) throw error;
        if (data) {
          console.log('[KioskResolver] Resolved Kiosk:', data);
          setKioskDetails(data);
          if (data.station_id) {
            localStorage.setItem('groovelab_station_id', data.station_id);
            setStationIdFromStorage(data.station_id);
          }
          if (data.room_id) {
            localStorage.setItem('groovelab_kiosk_room_id', data.room_id);
          }
        } else {
          console.warn("[KioskResolver] Invalid kiosk token. Clearing kiosk storage.");
          localStorage.removeItem('groovelab_kiosk_token');
          localStorage.removeItem('groovelab_station_id');
          localStorage.removeItem('groovelab_kiosk_room_id');
          setStationIdFromStorage(null);
        }
      } catch (err) {
        console.error("[KioskResolver] Error loading kiosk details:", err);
      } finally {
        setLoadingKiosk(false);
      }
    }
    loadKiosk();
  }, []);

  // Clean up legacy local storage dummy data and delete dummy textbooks/progress from Supabase
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('campus_lehrwerke');
    }
    
    async function cleanupDummies() {
      try {
        const dummyTitles = [
          'GrooveLab Guitar Vol. 1',
          'GrooveLab Drums Vol. 1',
          'GrooveLab Guitar Vol. 2',
          'GrooveLab Drums Vol. 2',
          'GrooveLab Bass Vol. 1',
          'GrooveLab Keyboard Vol. 1',
          'GrooveLab Keys Vol. 1',
          'GrooveLab Vocals Vol. 1'
        ];
        
        // Delete textbook entries
        await supabase
          .from('lehrwerke')
          .delete()
          .in('title', dummyTitles);

        // Delete progress items referencing dummy textbooks
        for (const title of dummyTitles) {
          await supabase
            .from('progress_matrix')
            .delete()
            .like('topic_name', `${title} - %`);
        }
      } catch (err) {
        console.error('[Cleanup] Failed to clean up dummy textbooks:', err);
      }
    }
    cleanupDummies();
  }, []);

  // Kiosk Room Auto-Bootstrap: when kiosk_room_id is in the URL WITHOUT kiosk_setup=1,
  // automatically resolve a station ID for that room and go directly to the QR-scanner.
  // When kiosk_setup=1 is present (= came from "Beenden" button), show DeviceSetupScreen instead.
  // CRITICAL: Skip auto-bootstrap if pairing params (kiosk_token, station_id) are present.
  const kioskRoomIdParam = searchParams.get('kiosk_room_id');
  const kioskSetupParam = searchParams.get('kiosk_setup');
  const isPairingRedirect = searchParams.has('kiosk_token') && searchParams.has('station_id');

  const [kioskBootstrapping, setKioskBootstrapping] = useState<boolean>(() => {
    // Only auto-bootstrap if kiosk_room_id is present AND kiosk_setup is NOT set AND we are NOT in a pairing redirect
    return !!kioskRoomIdParam && kioskSetupParam !== '1' && !isPairingRedirect;
  });

  useEffect(() => {
    const kioskRoomId = searchParams.get('kiosk_room_id');
    const isSetupMode = searchParams.get('kiosk_setup') === '1';
    // Skip auto-bootstrap when setup mode is requested or we are in a pairing redirect
    if (!kioskRoomId || isSetupMode || isPairingRedirect) return;

    const bootstrap = async () => {
      try {
        console.log('[KioskBootstrap] Auto-resolving station for room:', kioskRoomId);
        // Fetch the first non-teacher station for this room
        const { data: roomStations } = await supabase
          .from('stations')
          .select('id, name')
          .eq('room_id', kioskRoomId)
          .order('name');

        if (roomStations && roomStations.length > 0) {
          // Pick first non-teacher station, or first station as fallback
          const nonTeacher = roomStations.find((s: any) => !s.name?.toLowerCase().includes('lehrer'));
          const chosen = nonTeacher || roomStations[0];
          localStorage.setItem('groovelab_station_id', chosen.id);
          console.log('[KioskBootstrap] Station set to:', chosen.name, chosen.id);
        } else {
          // No stations found – set skip so LoginScreen opens in home mode
          localStorage.setItem('groovelab_station_id', 'skip');
          console.warn('[KioskBootstrap] No stations found for room. Falling back to skip.');
        }
      } catch (err) {
        console.error('[KioskBootstrap] Failed to resolve station:', err);
        localStorage.setItem('groovelab_station_id', 'skip');
      }

      // Remove kiosk_room_id from URL and reload cleanly → LoginScreen will show
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.replace(cleanUrl);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automated Audio Storage Janitor & Client Cache Janitor Background Task
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Always prune stale local client caches on mount to prevent QuotaExceededError
    runClientStorageJanitor().catch(() => {});

    const lastRunStr = localStorage.getItem('groovelab_storage_janitor_last_run');
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (Date.now() - lastRun > twentyFourHoursMs) {
      console.log('[StorageJanitor] Triggering scheduled 24h background audio storage audit...');
      runStorageJanitor('campus-assets').catch(err => {
        console.warn('[StorageJanitor] Background storage audit error:', err);
      });
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSchoolPaused, setIsSchoolPaused] = useState(false);
  const [showSchoolOnboardingModal, setShowSchoolOnboardingModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') === 'school_onboarding' || 
           params.get('onboarding') === 'school' || 
           params.has('school_onboarding') ||
           window.location.search.includes('invite=school_onboarding');
  });

  const [showAdminSecuritySuiteModal, setShowAdminSecuritySuiteModal] = useState(false);

  useEffect(() => {
    const handleOpenSecuritySuite = () => setShowAdminSecuritySuiteModal(true);
    window.addEventListener('open_admin_security_suite', handleOpenSecuritySuite);
    return () => window.removeEventListener('open_admin_security_suite', handleOpenSecuritySuite);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('invite') === 'school_onboarding' || params.get('onboarding') === 'school' || params.has('school_onboarding')) {
        setShowSchoolOnboardingModal(true);
      }
    }
  }, [location.search]);

  const [user, setUserRaw] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                           localStorage.getItem('groovelab_is_master_admin') === 'true';
      const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
      const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

      const urlParams = new URLSearchParams(window.location.search);
      const isGhost = urlParams.get('support_ghost') === 'true' || 
                      urlParams.get('ghost_session') === 'true' || 
                      sessionStorage.getItem('groovelab_support_ghost') === 'true';
      const ghostSchoolId = urlParams.get('school_id') || 
                            urlParams.get('ghost_school_id') || 
                            sessionStorage.getItem('groovelab_ghost_school_id');
      const ghostRole = urlParams.get('role') || 
                        sessionStorage.getItem('groovelab_ghost_active_role') || 
                        'admin';

      if (isGhost && ghostSchoolId && isMasterValid) {
        return {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: ghostRole,
          first_name: 'Master',
          last_name: 'Support',
          is_master_admin: false,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule'
          }
        };
      }

      const cached = sessionStorage.getItem('groovelab_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error('Failed to parse cached user:', e);
      return null;
    }
  });
  const setUser = React.useCallback((val: any) => {
    setUserRaw((prev: any) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;

      // Tier-1 Silent Background Sync: Deep Equality Guard
      if (prev && nextVal && typeof prev === 'object' && typeof nextVal === 'object') {
        try {
          if (JSON.stringify(prev) === JSON.stringify(nextVal)) {
            return prev; // Same object reference -> 0 React re-renders!
          }
        } catch {
          // fallback
        }
      }

      if (typeof window !== 'undefined') {
        if (nextVal) {
          sessionStorage.setItem('groovelab_cached_user', JSON.stringify(nextVal));
          if (nextVal.id) {
            sessionStorage.setItem('groovelab_user_id', nextVal.id);
          }
          if (nextVal.token_version !== undefined && nextVal.token_version !== null) {
            sessionStorage.setItem('groovelab_token_version', String(nextVal.token_version));
          }
          if (!sessionStorage.getItem('groovelab_session_started_at')) {
            sessionStorage.setItem('groovelab_session_started_at', String(Date.now()));
          }
        } else {
          sessionStorage.removeItem('groovelab_cached_user');
          sessionStorage.removeItem('groovelab_token_version');
          sessionStorage.removeItem('groovelab_session_started_at');
        }
      }
      return nextVal;
    });
  }, []);

  useEffect(() => {
    if (loading) return; // wait until supabase auth/session loading is complete

    const isGhostSessionActive = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('support_ghost') === 'true' ||
      sessionStorage.getItem('groovelab_support_ghost') === 'true'
    );
    if (isGhostSessionActive) return; // Don't redirect during support ghost sessions
    
    const isPublicRoute = 
      location.pathname === '/' || 
      location.pathname === '/landingpage' || 
      location.pathname === '/landingpage2' || 
      location.pathname === '/startseite' || 
      location.pathname === '/startseite2' || 
      location.pathname === '/starseite2' || 
      location.pathname === '/login' || 
      location.pathname === '/signup' || 
      location.pathname.startsWith('/qr/') ||
      location.pathname.startsWith('/onboarding/') ||
      location.pathname.startsWith('/device-onboarding/') ||
      location.pathname.startsWith('/shared-biography/') ||
      location.pathname.startsWith('/shared/');

      
    const isAuth = !!loggedInUserId;
    if (isAuth) {
      // Redirect logged-in users at / or /login or /signup to /dashboard
      if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Redirect unauthenticated users trying to access dashboard/protected routes to /
      if (!isPublicRoute) {
        navigate('/', { replace: true });
      }
    }
  }, [loggedInUserId, location.pathname, loading, navigate]);

  // Auto-switch context when support_ghost is active in URL (Placed before any early returns)
  useEffect(() => {
    const ghostUrlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isGhostParam = ghostUrlParams.get('support_ghost') === 'true' || 
                         ghostUrlParams.get('ghost_session') === 'true' || 
                         sessionStorage.getItem('groovelab_support_ghost') === 'true';
    const ghostSchoolId = ghostUrlParams.get('school_id') || 
                          ghostUrlParams.get('ghost_school_id') || 
                          sessionStorage.getItem('groovelab_ghost_school_id');
    const ghostUserId = ghostUrlParams.get('ghost_user_id') || 
                        sessionStorage.getItem('groovelab_ghost_impersonated_user_id');
    const ghostTicketId = ghostUrlParams.get('ticket_id');
    const ghostRole = ghostUrlParams.get('role') || 
                      sessionStorage.getItem('groovelab_ghost_active_role') || 
                      'admin';

    const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                         localStorage.getItem('groovelab_is_master_admin') === 'true';
    const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
    const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

    if (isGhostParam && (ghostSchoolId || ghostUserId)) {
      if (!isMasterValid) {
        console.warn('[Security] Unauthorized Ghost Mode attempt blocked.');
        sessionStorage.removeItem('groovelab_support_ghost');
        sessionStorage.removeItem('groovelab_ghost_school_id');
        sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
        sessionStorage.removeItem('groovelab_ghost_active_role');
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }

      // Consume one-time ghost token
      if (ghostAuthToken) {
        localStorage.removeItem('groovelab_ghost_auth_token');
      }

      sessionStorage.setItem('groovelab_support_ghost', 'true');
      if (ghostSchoolId) sessionStorage.setItem('groovelab_ghost_school_id', ghostSchoolId);
      if (ghostUserId) sessionStorage.setItem('groovelab_ghost_impersonated_user_id', ghostUserId);
      if (ghostRole) sessionStorage.setItem('groovelab_ghost_active_role', ghostRole);

      const resolveGhostIdentity = async () => {
        let realUser: any = null;
        let schoolData: any = null;

        // 1. If explicit user ID provided (e.g. from Ticket or Persona switcher)
        if (ghostUserId) {
          const { data: uData } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', ghostUserId)
            .maybeSingle();
          if (uData) realUser = uData;
        }

        // 2. If no user yet, but school ID present -> resolve primary admin or teacher
        if (!realUser && ghostSchoolId) {
          const { data: uData } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('school_id', ghostSchoolId)
            .eq('role', ghostRole === 'teacher' ? 'teacher' : 'admin')
            .limit(1)
            .maybeSingle();
          if (uData) realUser = uData;
        }

        // 3. School metadata
        if (realUser?.schools) {
          schoolData = Array.isArray(realUser.schools) ? realUser.schools[0] : realUser.schools;
        } else if (ghostSchoolId) {
          const { data: sData } = await supabase.from('schools').select('*').eq('id', ghostSchoolId).maybeSingle();
          schoolData = sData;
        }

        if (schoolData?.name) {
          sessionStorage.setItem('groovelab_ghost_school_name', schoolData.name);
        }

        if (realUser) {
          sessionStorage.setItem('groovelab_ghost_impersonated_user_id', realUser.id);
          sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', realUser.id);
          const targetRole = realUser.role || ghostRole;
          sessionStorage.setItem('groovelab_ghost_active_role', targetRole);

          const impersonatedUserObj = {
            ...realUser,
            is_ghost_mode: true,
            ghost_ticket_id: ghostTicketId,
            schools: schoolData || realUser.schools
          };

          setUserRaw(impersonatedUserObj);
          setLoggedInUserId(realUser.id);

          try {
            sessionStorage.setItem('groovelab_cached_user', JSON.stringify(impersonatedUserObj));
          } catch (e) {}

          const targetPlatform: 'campus' | 'groovelab' = (realUser.is_groovelab_active && !realUser.is_campus_active) ? 'groovelab' : 'campus';
          const targetWorkspace = targetRole === 'admin' || targetRole === 'secretary' ? 'secretary' : (targetRole === 'teacher' ? 'teacher' : 'student');
          const targetTab = targetRole === 'student' ? 'homework_book' : (targetRole === 'teacher' ? 'briefing' : 'briefing');

          setActivePlatform(targetPlatform);
          setActiveStudentTab(targetTab);
          try {
            sessionStorage.setItem('groovelab_active_workspace', targetWorkspace);
            sessionStorage.setItem('groovelab_active_platform', targetPlatform);
            localStorage.setItem('campus_active_tab', targetTab);
          } catch (e) {}
        } else if (schoolData) {
          // Fallback if zero users in DB for school
          const ghostUser = {
            id: 'master-support-id',
            school_id: schoolData.id,
            role: ghostRole,
            first_name: `${schoolData.name} Support`,
            last_name: '',
            is_master_admin: false,
            is_ghost_mode: true,
            schools: schoolData
          };
          setUserRaw(ghostUser);
          setLoggedInUserId('master-support-id');
          setActivePlatform('campus');
          setActiveStudentTab('briefing');
        }
      };

      resolveGhostIdentity();
    }
  }, []);

  const [session, setSessionRaw] = useState<any>(null);
  const setSession = React.useCallback((val: any) => {
    setSessionRaw((prev: any) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev && nextVal && typeof prev === 'object' && typeof nextVal === 'object') {
        try {
          if (JSON.stringify(prev) === JSON.stringify(nextVal)) {
            return prev;
          }
        } catch {}
      }
      return nextVal;
    });
  }, []);
  const [totalPresenceMins, setTotalPresenceMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !user) return;
    
    const updateData: any = {
      first_name: editingProfile.first_name,
      last_name: editingProfile.last_name,
      photo_url: (user.role === 'admin' || user.role === 'secretary') ? '/campus_login_hero.png' : editingProfile.photo_url
    };

    if (user.role === 'student') {
      updateData.age = editingProfile.age;
    } else {
      updateData.groovelab_instrument = editingProfile.groovelab_instrument;
      updateData.bio = editingProfile.bio;
      updateData.expertise = editingProfile.expertise;
      updateData.bands = editingProfile.bands;
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
    
    if (error) alert('Fehler beim Aktualisieren: ' + error.message);
    else {
      const { data: updatedUser, error: userErr } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
      if (userErr || !updatedUser) {
        console.error('[Dashboard] User data fetch error:', userErr);
        return;
      }
      console.log('[Dashboard] User data updated:', updatedUser.first_name, 'School:', updatedUser.school_id);
      if (updatedUser) setUser(updatedUser);
      setShowEditProfile(false);
    }
  };
  const [userSongs, setUserSongs] = useState<any[]>([]);
  const [userBands, setUserBands] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [globalSongs, setGlobalSongs] = useState<any[]>([]);
  const [plannedSlots, setPlannedSlots] = useState<string[]>([]);
  const [globalPlannedSlots, setGlobalPlannedSlots] = useState<any[]>([]);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [activePlatform, setActivePlatformRaw] = useState<'campus' | 'groovelab' | 'ensembles'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const platParam = urlParams.get('platform');
      if (platParam === 'campus' || platParam === 'groovelab' || platParam === 'ensembles') {
        return platParam as any;
      }
    }
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform')) : null;
    if (!showEnsemblesFeature && saved === 'ensembles') {
      return 'campus';
    }
    return (saved as 'campus' | 'groovelab' | 'ensembles') || 'campus';
  });
  const setActivePlatform = React.useCallback((val: any, forceUnlock = false) => {
    const schoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
    const schoolHasCampus = schoolObj?.has_campus_subscription ?? true;
    const schoolHasGroove = schoolObj?.has_groovelab_subscription ?? true;

    let targetVal = val;
    if (targetVal === 'campus' && !schoolHasCampus) {
      targetVal = 'groovelab';
    } else if (targetVal === 'groovelab' && !schoolHasGroove) {
      targetVal = 'campus';
    }
    // Instantly stop all active camera and microphone streams when switching modules
    if (typeof (window as any).stopAllCameras === 'function') {
      (window as any).stopAllCameras();
    }

    React.startTransition(() => {
      setActivePlatformRaw(targetVal);
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_active_platform', targetVal);
      localStorage.setItem('groovelab_active_platform', targetVal);
    }
    
    // Auto-switch the active tab to the saved tab of the target platform to load flawlessly
    if (targetVal === 'campus') {
      const savedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem('campus_active_tab') || localStorage.getItem('campus_active_tab')) : null) || 'briefing';
      setActiveStudentTabRaw(savedTab);
    } else if (targetVal === 'ensembles') {
      const savedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem('ensembles_active_tab') || localStorage.getItem('ensembles_active_tab')) : null) || 'overview';
      setActiveStudentTabRaw(savedTab);
    } else {
      const savedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_tab') || localStorage.getItem('groovelab_active_tab')) : null) || 'live';
      setActiveStudentTabRaw(savedTab);
    }
  }, [locationMode, user?.role, user?.schools]);

  const [activeStudentTab, setActiveStudentTabRaw] = useState<string>(() => {
    const platform = (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform')) : null) || 'campus';
    if (platform === 'campus') {
      return (typeof window !== 'undefined' ? (sessionStorage.getItem('campus_active_tab') || localStorage.getItem('campus_active_tab')) : null) || 'briefing';
    }
    if (platform === 'ensembles') {
      return (typeof window !== 'undefined' ? (sessionStorage.getItem('ensembles_active_tab') || localStorage.getItem('ensembles_active_tab')) : null) || 'overview';
    }
    return (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_tab') || localStorage.getItem('groovelab_active_tab')) : null) || 'live';
  });
  const setActiveStudentTab = React.useCallback((val: any) => {
    if (val === 'messages') {
      setSelectedCampusRecipient(null);
    }
    setActiveStudentTabRaw(val);
    // Persist the tab to the correct sessionStorage and localStorage keys based on the current active platform
    const platform = (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform')) : null) || 'campus';
    if (typeof window !== 'undefined') {
      if (platform === 'campus') {
        sessionStorage.setItem('campus_active_tab', val);
        localStorage.setItem('campus_active_tab', val);
      } else if (platform === 'ensembles') {
        sessionStorage.setItem('ensembles_active_tab', val);
        localStorage.setItem('ensembles_active_tab', val);
      } else {
        sessionStorage.setItem('groovelab_active_tab', val);
        localStorage.setItem('groovelab_active_tab', val);
      }
    }
  }, []);

  // Auto-refresh bands for staff profile and GrooveLab view
  useEffect(() => {
    if (user?.id && (user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary')) {
      const schoolId = user.school_id || (Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id);
      if (!schoolId) return;

      supabase
        .from('bands')
        .select('*, songs(id, title, artist, instrumentation), band_members(*, users!user_id(id, first_name, last_name, photo_url, role, teacher_id)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id(id, first_name, last_name, photo_url)')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
        .then(({ data: freshBands, error }) => {
          if (!error && freshBands) {
            const realBands = freshBands.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
            setAllBands(realBands);
            
            const teacherCoachedBands = realBands.filter((band: any) => {
              const isCoach = band.coach_id === user.id || (band.coach && band.coach.id === user.id);
              const isMember = (band.band_members || []).some((m: any) => m.user_id === user.id);
              const hasMyStudent = (band.band_members || []).some((m: any) => {
                const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                return u && u.teacher_id === user.id;
              });
              return isCoach || isMember || hasMyStudent;
            });

            setUserBands(teacherCoachedBands);
          }
        });
    }
  }, [user?.id, activePlatform, activeStudentTab]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [sidebarNotificationsCount, setSidebarNotificationsCount] = useState<number>(0);
  const [selectedMatchingInsts, setSelectedMatchingInsts] = useState<Record<string, string>>({});
  const [activeBandSubTab, setActiveBandSubTab] = useState<'meine' | 'alle'>(() => {
    return (localStorage.getItem('groovelab_active_band_subtab') as 'meine' | 'alle') || 'meine';
  });
  
  const [campusTeacherStats, setCampusTeacherStats] = useState<{ studentCount: number, totalMinutes: number, teachingDays: string[], primaryRoom: string, schedules: any[] } | null>(null);

  useEffect(() => {
    if (activeStudentTab === 'profile' && activePlatform === 'campus' && user && (user.role === 'teacher' || user.role === 'admin')) {
      const fetchStats = async () => {
        try {
          const { data: scheds } = await supabase
            .from('schedules')
            .select('*, rooms(name)')
            .eq('teacher_id', user.id);
          
          if (scheds) {
            const uniqueStudents = new Set(scheds.filter(s => s.student_id).map(s => s.student_id));
            const totalMins = scheds.filter(s => s.student_id).reduce((acc, curr) => acc + (curr.duration || 30), 0);
            
            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
            const uniqueDays = Array.from(new Set(scheds.map(s => s.day_of_week)))
              .sort((a, b) => a - b)
              .map(d => DAYS_DE[d]);

            // Primary room calculation
            const roomCounts: Record<string, number> = {};
            scheds.forEach(s => {
              const rName = s.rooms?.name;
              if (rName) {
                roomCounts[rName] = (roomCounts[rName] || 0) + 1;
              }
            });
            let primary = 'Kein Raum';
            let maxCount = 0;
            Object.entries(roomCounts).forEach(([rName, count]) => {
              if (count > maxCount) {
                maxCount = count;
                primary = rName;
              }
            });

            setCampusTeacherStats({
              studentCount: uniqueStudents.size,
              totalMinutes: totalMins,
              teachingDays: uniqueDays,
              primaryRoom: primary,
              schedules: scheds
            });
          }
        } catch (err) {
          console.error('Error fetching teacher stats:', err);
        }
      };
      fetchStats();
    }
  }, [activeStudentTab, activePlatform, user?.id]);

  const [selectedBandForProfile, setSelectedBandForProfileRaw] = useState<any>(null);
  const setSelectedBandForProfile = React.useCallback((val: any) => {
    React.startTransition(() => {
      setSelectedBandForProfileRaw(val);
    });
  }, []);

  const [selectedBandForGateway, setSelectedBandForGatewayRaw] = useState<any>(null);
  const setSelectedBandForGateway = React.useCallback((val: any) => {
    React.startTransition(() => {
      setSelectedBandForGatewayRaw(val);
    });
  }, []);

  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  const [showBandProfile, setShowBandProfileRaw] = useState(() => localStorage.getItem('groovelab_show_band_profile') === 'true');
  const setShowBandProfile = React.useCallback((val: any) => {
    React.startTransition(() => {
      setShowBandProfileRaw(val);
    });
  }, []);

  const [bandProfileView, setBandProfileView] = useState<'public' | 'backstage'>(() => {
    const saved = localStorage.getItem('groovelab_band_profile_view');
    return (saved === 'public' || saved === 'backstage') ? saved : 'public';
  });


  const [bandSearchText, setBandSearchText] = useState('');
  const [bandSearchLetter, setBandSearchLetter] = useState<string | null>(null);
  const [expandedMatchingSong, setExpandedMatchingSong] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [publicPassUser, setPublicPassUser] = useState<any>(null);
  const [loadingPublicPass, setLoadingPublicPass] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [activePdfFolderUrl, setActivePdfFolderUrl] = useState<string | null>(null);
  const [activePdfSong, setActivePdfSong] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [practiceSearchQuery, setPracticeSearchQuery] = useState('');
  const [practiceAlphaFilter, setPracticeAlphaFilter] = useState<string | null>(null);
  const [practiceSearchType, setPracticeSearchType] = useState<'title' | 'artist'>('title');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryAlphaFilter, setLibraryAlphaFilter] = useState<string | null>(null);
  const [librarySearchType, setLibrarySearchType] = useState<'title' | 'artist'>('title');
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [personalRejections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [studentMessagesLoading, setStudentMessagesLoading] = useState(false);
  const [selectedStudentMessage, setSelectedStudentMessage] = useState<any>(null);
  const [studentMessagesFilter, setStudentMessagesFilter] = useState<'all' | 'school' | 'band'>('all');
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);

  // Campus 1-on-1 Direct Messaging states
  const [campusMessages, setCampusMessages] = useState<any[]>([]);
  const [campusMessagesLoading, setCampusMessagesLoading] = useState(false);
  const [campusUnreadCount, setCampusUnreadCount] = useState(0);
  const [selectedCampusRecipient, setSelectedCampusRecipient] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`groovelab_deleted_messages_${user.id}`);
      if (stored) {
        try {
          setDeletedMessageIds(JSON.parse(stored));
        } catch (e) {
          setDeletedMessageIds([]);
        }
      } else {
        setDeletedMessageIds([]);
      }
    } else {
      setDeletedMessageIds([]);
    }
  }, [user?.id]);

  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);

  const openUserProfile = async (userIdOrUser: any) => {
    if (!userIdOrUser) return;
    
    if (typeof userIdOrUser === 'object') {
      if (userIdOrUser.role === 'teacher' || userIdOrUser.role === 'admin') {
        setSelectedTeacher(userIdOrUser);
      } else {
        setSelectedStudentProfile(userIdOrUser);
      }
      return;
    }
    
    if (typeof userIdOrUser === 'string') {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userIdOrUser)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        if (data) {
          if (data.role === 'teacher' || data.role === 'admin') {
            setSelectedTeacher(data);
          } else {
            setSelectedStudentProfile(data);
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
  };

  useEffect(() => {
    if (selectedTeacher?.id) {
      sessionStorage.setItem('groovelab_selected_teacher_id', selectedTeacher.id);
    } else {
      sessionStorage.removeItem('groovelab_selected_teacher_id');
    }
  }, [selectedTeacher]);

  useEffect(() => {
    if (selectedStudentProfile?.id) {
      sessionStorage.setItem('groovelab_selected_student_id', selectedStudentProfile.id);
    } else {
      sessionStorage.removeItem('groovelab_selected_student_id');
    }
  }, [selectedStudentProfile]);

  useEffect(() => {
    const savedTeacherId = sessionStorage.getItem('groovelab_selected_teacher_id');
    if (savedTeacherId && !selectedTeacher) {
      openUserProfile(savedTeacherId);
    }
    const savedStudentId = sessionStorage.getItem('groovelab_selected_student_id');
    if (savedStudentId && !selectedStudentProfile) {
      openUserProfile(savedStudentId);
    }
  }, []);

  useEffect(() => {
    (window as any).openUserProfile = openUserProfile;
    return () => {
      delete (window as any).openUserProfile;
    };
  }, []);

  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [showBandNaming, setShowBandNaming] = useState(false);
  const [namingTarget, setNamingTarget] = useState<{song: any, form: any} | null>(null);
  const [showBandConsent, setShowBandConsent] = useState(false);
  const [consentTarget, setConsentTarget] = useState<{song: any, form: any} | null>(null);
  const [showEditBand, setShowEditBand] = useState(false);
  const [isJoiningVocal, setIsJoiningVocal] = useState<string | null>(null);
  const [isJoiningGuest, setIsJoiningGuest] = useState<string | null>(null);
  const [showTeacherVocalPicker, setShowTeacherVocalPicker] = useState<string | null>(null);
  const [externalVocalists, setExternalVocalists] = useState<any[]>([]);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [restoredBandId] = useState(() => localStorage.getItem('groovelab_selected_band_id'));

  const [suggestingSkill, setSuggestingSkill] = useState<any>(null);
  const [exclusiveProposal, setExclusiveProposal] = useState<boolean>(true);
  const [matchingLevelFilter, setMatchingLevelFilter] = useState<'all' | 'starter' | 'pro'>('all');
  const [pendingFounding, setPendingFounding] = useState<any | null>(null);
  const [showFoundingModal, setShowFoundingModal] = useState(false);
  const [foundingName, setFoundingName] = useState('');
  const [foundingLanguage, setFoundingLanguage] = useState<'de' | 'en'>('de');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [lastAutoTriggeredFormId, setLastAutoTriggeredFormId] = useState<string | null>(sessionStorage.getItem('groovelab_last_form_id'));
  
  const updateAutoTriggerId = (id: string | null) => {
    setLastAutoTriggeredFormId(id);
    if (id) sessionStorage.setItem('groovelab_last_form_id', id);
    else sessionStorage.removeItem('groovelab_last_form_id');
  };
  
  useEffect(() => {
    if (showFoundingModal && !foundingName) {
      setFoundingName(generateRandomBandName(foundingLanguage));
    } else if (!showFoundingModal) {
      setFoundingName('');
    }
  }, [showFoundingModal, foundingLanguage]);

  const ignoredFoundingIds = useRef<string[]>([]);
  const gatewayJustClosed = useRef<boolean>(false);
  const lastWriteTimeRef = useRef<number>(0);
  
  const [annBandId, setAnnBandId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'students' | 'teachers' | 'specific'>('all');
  const [selectedTargetUserIds, setSelectedTargetUserIds] = useState<string[]>([]);
  const [recipientSearchText, setRecipientSearchText] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [selectedMailMessage, setSelectedMailMessage] = useState<any>(null);
  const [isMailComposing, setIsMailComposing] = useState(false);
  
  // Removed redundant FAILSAFE effect to prevent loop conflicts.
  // The detection logic is now centralized in fetchDashboardData for better control.

  // (Auto-prompt logic now handled centrally in fetchDashboardData)

  const dismissSuggestion = (songSkillId: string) => {
    if (!user?.id) return;
    const storageKey = `groovelab_prompted_${user.id}`;
    const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!promptedIds.includes(songSkillId)) {
      promptedIds.push(songSkillId);
      localStorage.setItem(storageKey, JSON.stringify(promptedIds));
    }

    // Also mark the specific song as ignored for auto-founding trigger
    if (suggestingSkill?.song_id) {
       const inst = (suggestingSkill.instrument || '').toLowerCase();
       localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.song_id}_${inst}`, 'true');
    }
    if (suggestingSkill?.songs?.id) {
       const inst = (suggestingSkill.instrument || '').toLowerCase();
       localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.songs.id}_${inst}`, 'true');
    }

    console.log('[DEBUG-Groovelab] setSuggestingSkill(null) in dismissSuggestion');
    setSuggestingSkill(null);
    setSelectedCoachId('');
  };

  // Load student messages when they view the tab
  useEffect(() => {
    if (activeStudentTab === 'messages' && user?.role?.toLowerCase() === 'student') {
      fetchStudentMessages();
    }
  }, [activeStudentTab, userBands, user?.id]);

  // Auto-trigger Band Founding Modal when formation is complete
  useEffect(() => {
    if (loading || !user || suggestingSkill || selectedBandForGateway || pendingFounding || showBandProfile || gatewayJustClosed.current) return;

    // 1. Auto-trigger: If user is in a band and mastered a new skill, suggest it to their band first
    if (userBands.length > 0) {
      const stageReadySkills = userSongs.filter((s: any) => s.is_stage_ready && s.instrument !== 'Vocals');
      
      for (const skill of stageReadySkills) {
        const inst = (skill.instrument || '').toLowerCase();
        const isIgnored = localStorage.getItem(`groovelab_founding_ignored_${user.id}_${skill.song_id}_${inst}`);
        if (isIgnored) continue;
        
        // Has it already been suggested/added to ANY of their bands?
        const alreadyInBand = userBands.some((b: any) => 
          b.song_id === skill.song_id || 
          (b.band_songs || []).some((bs: any) => bs.song_id === skill.song_id || bs.songs?.id === skill.song_id)
        );
        
        if (!alreadyInBand) {
          console.log('[AutoTrigger] Suggesting skill to band:', skill.title);
          console.log('[DEBUG-Groovelab] setSuggestingSkill (suggest to band) in auto-trigger', skill.title);
          setSuggestingSkill({
            ...skill,
            songs: { id: skill.song_id, title: skill.title }
          });
          return;
        }
      }
    }
  }, [wallSongs, activeStudentTab, user, userBands, userSongs, suggestingSkill, selectedBandForGateway, pendingFounding, showBandProfile, loading]);

  // Safety check: If suggestingSkill is set but userBands loads and indicates
  // that the song is already suggested or active in their band, dismiss the popup immediately.
  // ONLY run this for individual suggestions (!suggestingSkill.formation_group), NOT for band founding!
  useEffect(() => {
    if (suggestingSkill && !suggestingSkill.formation_group && user && userBands.length > 0) {
      const targetSongId = suggestingSkill.song_id || suggestingSkill.songs?.id;
      if (targetSongId) {
        const alreadyInBand = userBands.some((b: any) => 
          b.song_id === targetSongId || 
          (b.band_songs || []).some((bs: any) => bs.song_id === targetSongId || bs.songs?.id === targetSongId)
        );
        if (alreadyInBand) {
          console.log('[AutoTrigger] Automatically dismissing congratulations modal since song is already in band repertoire:', targetSongId);
          console.log('[DEBUG-Groovelab] setSuggestingSkill(null) inside safety check effect!');
          setSuggestingSkill(null);
        }
      }
    }
  }, [userBands, suggestingSkill, user]);

  // Safety check for Band Founding: If suggestingSkill is set for band founding (with formation_group),
  // query Supabase directly to check if a band already exists for this group or if the user is already in a band for this song.
  // This handles the case where someone else already founded the band (e.g. manual widget click)
  // before the background polling runs.
  useEffect(() => {
    if (suggestingSkill && suggestingSkill.formation_group && user) {
      const targetSongId = suggestingSkill.song_id || suggestingSkill.songs?.id;
      const targetGroup = suggestingSkill.formation_group;
      
      const checkDbForExistingBand = async () => {
        try {
          // 1. Check if a band already exists for this formation group in the database
          const { data: existingBands } = await supabase
            .from('bands')
            .select('id, name, status')
            .eq('formation_group', targetGroup)
            .in('status', ['forming', 'active']);
            
          if (existingBands && existingBands.length > 0) {
            console.log('[SafetyCheck] Band already exists in DB for group:', targetGroup);
            setSuggestingSkill(null);
            fetchDashboardData(user.id, false);
            return;
          }
          
          // 2. Check if this student is already in a band for this song
          if (targetSongId) {
            const { data: memberships } = await supabase
              .from('band_members')
              .select('id, bands(id, status, song_id)')
              .eq('user_id', user.id);
              
            const alreadyInBand = (memberships || []).some((m: any) => 
              m.bands && 
              ['forming', 'active'].includes(m.bands.status) && 
              m.bands.song_id === targetSongId
            );
            
            if (alreadyInBand) {
              console.log('[SafetyCheck] Student is already in a band for this song in DB:', targetSongId);
              setSuggestingSkill(null);
              fetchDashboardData(user.id, false);
            }
          }
        } catch (err) {
          console.error('[SafetyCheck] Error checking database for existing band:', err);
        }
      };
      
      checkDbForExistingBand();
    }
  }, [suggestingSkill, user]);

  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState<any>(null);

  // PERSISTENCE LOGIC: Save band profile state
  useEffect(() => {
    localStorage.setItem('groovelab_show_band_profile', showBandProfile.toString());
    localStorage.setItem('groovelab_band_profile_view', bandProfileView);
    if (selectedBandForProfile?.id) {
      localStorage.setItem('groovelab_selected_band_id', selectedBandForProfile.id);
    } else if (!showBandProfile) {
      localStorage.removeItem('groovelab_selected_band_id');
    }
  }, [showBandProfile, bandProfileView, selectedBandForProfile]);

  const BAND_AVATARS = [
    // 20 New 3D Studio Band Avatars (Alternating sizes/types matching the student avatar style)
    { id: 'band_avatar_new_01', url: '/avatars/band_avatar_new_01.png', size: 3 },
    { id: 'band_avatar_new_02', url: '/avatars/band_avatar_new_02.png', size: 3 },
    { id: 'band_avatar_new_03', url: '/avatars/band_avatar_new_03.png', size: 3 },
    { id: 'band_avatar_new_04', url: '/avatars/band_avatar_new_04.png', size: 3 },
    { id: 'band_avatar_new_05', url: '/avatars/band_avatar_new_05.png', size: 4 },
    { id: 'band_avatar_new_06', url: '/avatars/band_avatar_new_06.png', size: 4 },
    { id: 'band_avatar_new_07', url: '/avatars/band_avatar_new_07.png', size: 5 },
    { id: 'band_avatar_new_08', url: '/avatars/band_avatar_new_08.png', size: 5 },
    { id: 'band_avatar_new_09', url: '/avatars/band_avatar_new_09.png', size: 4 },
    { id: 'band_avatar_new_10', url: '/avatars/band_avatar_new_10.png', size: 3 },
    { id: 'band_avatar_new_11', url: '/avatars/band_avatar_new_11.png', size: 3 },
    { id: 'band_avatar_new_12', url: '/avatars/band_avatar_new_12.png', size: 3 },
    { id: 'band_avatar_new_13', url: '/avatars/band_avatar_new_13.png', size: 4 },
    { id: 'band_avatar_new_14', url: '/avatars/band_avatar_new_14.png', size: 4 },
    { id: 'band_avatar_new_15', url: '/avatars/band_avatar_new_15.png', size: 5 },
    { id: 'band_avatar_new_16', url: '/avatars/band_avatar_new_16.png', size: 4 },
    { id: 'band_avatar_new_17', url: '/avatars/band_avatar_new_17.png', size: 3 },
    { id: 'band_avatar_new_18', url: '/avatars/band_avatar_new_18.png', size: 4 },
    { id: 'band_avatar_new_19', url: '/avatars/band_avatar_new_19.png', size: 5 },
    { id: 'band_avatar_new_20', url: '/avatars/band_avatar_new_20.png', size: 3 },

    { id: 'band_kids_formation_light_1', url: '/avatars/band_kids_formation_light_1.png', size: 5 },
    { id: 'band_kids_formation_light_2', url: '/avatars/band_kids_formation_light_2.png', size: 5 },
    { id: 'band_kids_formation_light_3', url: '/avatars/band_kids_formation_light_3.png', size: 5 },
    { id: 'band_kids_formation_light_4', url: '/avatars/band_kids_formation_light_4.png', size: 5 },
    { id: 'band_kids_formation_1', url: '/avatars/band_kids_formation_1.png', size: 5 },
    { id: 'band_kids_formation_2', url: '/avatars/band_kids_formation_2.png', size: 5 },
    { id: 'band_kids_formation_3', url: '/avatars/band_kids_formation_3.png', size: 5 },
    { id: 'band_kids_formation_4', url: '/avatars/band_kids_formation_4.png', size: 5 },
    { id: 'band_kids_duo', url: '/avatars/band_kids_duo.png', size: 2 },
    { id: 'band_kids_trio', url: '/avatars/band_kids_trio.png', size: 3 },
    { id: 'band_kids_quartet', url: '/avatars/band_kids_quartet.png', size: 4 },
    { id: 'band_kids_quintet', url: '/avatars/band_kids_quintet.png', size: 5 },
    { id: 'band_kids_groovelab', url: '/avatars/band_kids_groovelab.png', size: 4 },
    
    // Teen Rock / Alternative / Indie
    { id: 'band_teen_alternative_rock', url: '/avatars/band_teen_alternative_rock.png', size: 4 },
    { id: 'band_teen_grunge_trio', url: '/avatars/band_teen_grunge_trio.png', size: 3 },
    { id: 'band_teen_hard_rock', url: '/avatars/band_teen_hard_rock.png', size: 4 },
    { id: 'band_teen_indie_pop', url: '/avatars/band_teen_indie_pop.png', size: 4 },
    { id: 'band_teen_indie_trio', url: '/avatars/band_teen_indie_trio.png', size: 3 },
    { id: 'band_teen_metal_quintet', url: '/avatars/band_teen_metal_quintet.png', size: 5 },
    { id: 'band_teen_modern_pop', url: '/avatars/band_teen_modern_pop.png', size: 4 },
    { id: 'band_teen_pop_duo', url: '/avatars/band_teen_pop_duo.png', size: 2 },
    { id: 'band_teen_quad_instrumental_1', url: '/avatars/band_teen_quad_instrumental_1.png', size: 4 },
    { id: 'band_teen_quad_instrumental_2', url: '/avatars/band_teen_quad_instrumental_2.png', size: 4 },
    { id: 'band_teen_quintet_vocals_1', url: '/avatars/band_teen_quintet_vocals_1.png', size: 5 },
    { id: 'band_teen_quintet_vocals_2', url: '/avatars/band_teen_quintet_vocals_2.png', size: 5 },
    { id: 'band_avatar_acoustic_duo', url: '/avatars/band_avatar_acoustic_duo.png', size: 2 },
    { id: 'band_neon_rock_1', url: '/avatars/band_neon_rock_1.png', size: 4 },

    // Dynamic Group Avatars
    { id: '3_1', url: '/band_avatar_3_musicians_1_1777469162449.png', size: 3 },
    { id: '3_2', url: '/band_avatar_3_musicians_2_1777469216449.png', size: 3 },
    { id: '3_3', url: '/band_avatar_3_musicians_3_1777469286463.png', size: 3 },
    { id: '4_1', url: '/band_avatar_4_musicians_1_1777469178768.png', size: 4 },
    { id: '4_2', url: '/band_avatar_4_musicians_2_1777469299351.png', size: 4 },
    { id: '4_3', url: '/band_avatar_4_musicians_3_1777469315500.png', size: 4 },
    { id: '5_1', url: '/band_avatar_5_musicians_1_1777469193682.png', size: 5 },
    { id: '5_2', url: '/band_avatar_5_musicians_2_1777469330208.png', size: 5 },
    { id: '5_3', url: '/band_avatar_5_musicians_3_1777469343103.png', size: 5 },
    
    // Classic Bands
    { id: 'band_pop_1', url: '/avatars/band_pop_1.png', size: 3 },
    { id: 'band_rock_1', url: '/avatars/band_rock_1.png', size: 4 },
    { id: 'band_trio_1', url: '/avatars/band_trio_1.png', size: 3 },
    { id: 'band_duo_1', url: '/avatars/band_duo_1.png', size: 2 },
    { id: 'band_quartet_1', url: '/avatars/band_quartet_1.png', size: 4 },
    { id: 'band_quintet_1', url: '/avatars/band_quintet_1.png', size: 5 },
  ];

  const CAMPUS_AVATARS = [
    { id: 'avatar_blockfloete', url: '/avatars/blockfloete_avatar.png' },
    { id: 'avatar_bariton', url: '/avatars/bariton_avatar.png' },
    { id: 'avatar_cello', url: '/avatars/cello_avatar_new.png' },
    { id: 'avatar_ebass', url: '/avatars/ebass_avatar.png' },
    { id: 'avatar_egitarre', url: '/avatars/egitarre_avatar.png' },
    { id: 'avatar_gitarre', url: '/avatars/gitarre_avatar_new.png' },
    { id: 'avatar_horn', url: '/avatars/horn_avatar_new.png' },
    { id: 'avatar_klarinette', url: '/avatars/klarinette_avatar_new.png' },
    { id: 'avatar_klavier', url: '/avatars/klavier_avatar_new.png' },
    { id: 'avatar_kontrabass', url: '/avatars/kontrabass_avatar.png' },
    { id: 'avatar_oboe', url: '/avatars/oboe_avatar.png' },
    { id: 'avatar_posaune', url: '/avatars/posaune_avatar.png' },
    { id: 'avatar_querfloete', url: '/avatars/querfloete_avatar.png' },
    { id: 'avatar_saxophon', url: '/avatars/saxophon_avatar_new.png' },
    { id: 'avatar_schlagzeug', url: '/avatars/schlagzeug_avatar.png' },
    { id: 'avatar_trompete', url: '/avatars/trompete_avatar_new.png' },
    { id: 'avatar_violine', url: '/avatars/violine_avatar_new.png' },
    { id: 'avatar_vocals', url: '/avatars/gesang_avatar.png' }
  ];

  const STUDENT_AVATARS = [
    // E-Gitarre (15)
    { id: 'student_boy_guitar_1', url: '/avatars/student_boy_black_guitar.png', category: 'E-Gitarre' },
    { id: 'student_girl_guitar_1', url: '/avatars/student_girl_blonde_guitar.png', category: 'E-Gitarre' },
    { id: 'student_boy_blonde_guitar', url: '/avatars/student_boy_blonde_guitar.png', category: 'E-Gitarre' },
    { id: 'student_girl_black_guitar', url: '/avatars/student_girl_black_guitar.png', category: 'E-Gitarre' },
    { id: 'student_eguitar_alt', url: '/avatars/student_eguitar_1.png', category: 'E-Gitarre' },
    { id: 'bandstyle_boy_eguitar', url: '/avatars/bandstyle_boy_eguitar.png', category: 'E-Gitarre' },
    { id: 'bandstyle_girl_eguitar', url: '/avatars/bandstyle_girl_eguitar.png', category: 'E-Gitarre' },
    { id: 'teen_boy_eguitar_realistic', url: '/avatars/teen_boy_eguitar_realistic.png', category: 'E-Gitarre' },
    { id: 'teen_girl_eguitar_focused', url: '/avatars/teen_girl_eguitar_focused.png', category: 'E-Gitarre' },
    { id: 'teen_boy_eguitar_17', url: '/avatars/teen_boy_eguitar_17.png', category: 'E-Gitarre' },
    { id: 'teen_boy_acoustic_guitar', url: '/avatars/teen_boy_acoustic_guitar.png', category: 'E-Gitarre' },
    { id: 'teen_girl_acoustic_guitar', url: '/avatars/teen_girl_acoustic_guitar.png', category: 'E-Gitarre' },
    { id: 'student_eguitar_new_1', url: '/avatars/student_eguitar_new_1.png', category: 'E-Gitarre' },
    { id: 'student_eguitar_new_2', url: '/avatars/student_eguitar_new_2.png', category: 'E-Gitarre' },
    { id: 'student_eguitar_new_3', url: '/avatars/student_eguitar_new_3.png', category: 'E-Gitarre' },

    // E-Piano / Keyboard (15)
    { id: 'student_boy_piano_1', url: '/avatars/student_boy_black_piano.png', category: 'E-Piano' },
    { id: 'student_girl_piano_1', url: '/avatars/student_girl_black_piano.png', category: 'E-Piano' },
    { id: 'student_piano_alt', url: '/avatars/student_piano_1.png', category: 'E-Piano' },
    { id: 'student_boy_piano_2', url: '/avatars/student_boy_piano_2.png', category: 'E-Piano' },
    { id: 'student_girl_piano_2', url: '/avatars/student_girl_piano_2.png', category: 'E-Piano' },
    { id: 'student_girl_lightbrown_piano', url: '/avatars/student_girl_lightbrown_piano.png', category: 'E-Piano' },
    { id: 'student_boy_lightbrown_piano', url: '/avatars/student_boy_lightbrown_piano.png', category: 'E-Piano' },
    { id: 'student_boy_keyboard_1', url: '/avatars/student_boy_keyboard_1.png', category: 'E-Piano' },
    { id: 'student_boy_producer_1', url: '/avatars/student_boy_producer_1.png', category: 'E-Piano' },
    { id: 'student_tech_1', url: '/avatars/student_tech_1.png', category: 'E-Piano' },
    { id: 'bandstyle_boy_epiano', url: '/avatars/bandstyle_boy_epiano.png', category: 'E-Piano' },
    { id: 'bandstyle_girl_epiano', url: '/avatars/bandstyle_girl_epiano.png', category: 'E-Piano' },
    { id: 'avatar_boy_piano', url: '/avatar_boy_piano.jpg', category: 'E-Piano' },
    { id: 'avatar_girl_piano', url: '/avatar_girl_piano.jpg', category: 'E-Piano' },
    { id: 'student_epiano_new_1', url: '/avatars/student_epiano_new_1.png', category: 'E-Piano' },

    // E-Drums (15)
    { id: 'student_boy_drums_1', url: '/avatars/student_boy_black_drums.png', category: 'E-Drum' },
    { id: 'student_girl_drums_1', url: '/avatars/student_girl_blonde_drums.png', category: 'E-Drum' },
    { id: 'student_boy_blonde_drums', url: '/avatars/student_boy_blonde_drums.png', category: 'E-Drum' },
    { id: 'student_girl_black_drums', url: '/avatars/student_girl_black_drums.png', category: 'E-Drum' },
    { id: 'student_drums_alt', url: '/avatars/student_drums_1.png', category: 'E-Drum' },
    { id: 'student_boy_drums_2', url: '/avatars/student_boy_drums_2.png', category: 'E-Drum' },
    { id: 'student_girl_drums_2', url: '/avatars/student_girl_drums_2.png', category: 'E-Drum' },
    { id: 'student_boy_drums_3', url: '/avatars/student_boy_drums_3.png', category: 'E-Drum' },
    { id: 'student_girl_drums_3', url: '/avatars/student_girl_drums_3.png', category: 'E-Drum' },
    { id: 'bandstyle_boy_edrums', url: '/avatars/bandstyle_boy_edrums.png', category: 'E-Drum' },
    { id: 'bandstyle_girl_edrums', url: '/avatars/bandstyle_girl_edrums.png', category: 'E-Drum' },
    { id: 'avatar_boy_drums', url: '/avatar_boy_drums.jpg', category: 'E-Drum' },
    { id: 'avatar_girl_drums', url: '/avatar_girl_drums.jpg', category: 'E-Drum' },
    { id: 'student_edrums_new_1', url: '/avatars/student_edrums_new_1.png', category: 'E-Drum' },
    { id: 'student_edrums_new_2', url: '/avatars/student_edrums_new_2.png', category: 'E-Drum' },

    // E-Bass (15)
    { id: 'student_girl_bass_1', url: '/avatars/student_girl_black_bass.png', category: 'E-Bass' },
    { id: 'student_bass_alt', url: '/avatars/student_bass_1.png', category: 'E-Bass' },
    { id: 'student_girl_ebass_1', url: '/avatars/student_girl_ebass_1.png', category: 'E-Bass' },
    { id: 'bandstyle_boy_ebass', url: '/avatars/bandstyle_boy_ebass.png', category: 'E-Bass' },
    { id: 'bandstyle_girl_ebass', url: '/avatars/bandstyle_girl_ebass.png', category: 'E-Bass' },
    { id: 'avatar_boy_bass', url: '/avatar_boy_bass.jpg', category: 'E-Bass' },
    { id: 'avatar_girl_bass', url: '/avatar_girl_bass.jpg', category: 'E-Bass' },
    { id: 'student_ebass_new_1', url: '/avatars/student_ebass_new_1.png', category: 'E-Bass' },
    { id: 'student_ebass_new_2', url: '/avatars/student_ebass_new_2.png', category: 'E-Bass' },
    { id: 'student_ebass_new_3', url: '/avatars/student_ebass_new_3.png', category: 'E-Bass' },
    { id: 'student_ebass_new_4', url: '/avatars/student_ebass_new_4.png', category: 'E-Bass' },
    { id: 'student_ebass_new_5', url: '/avatars/student_ebass_new_5.png', category: 'E-Bass' },
    { id: 'student_ebass_new_6', url: '/avatars/student_ebass_new_6.png', category: 'E-Bass' },
    { id: 'student_ebass_new_7', url: '/avatars/student_ebass_new_7.png', category: 'E-Bass' },
    { id: 'student_ebass_new_8', url: '/avatars/student_ebass_new_8.png', category: 'E-Bass' },

    // Gesang (15)
    { id: 'student_boy_vocals_1', url: '/avatars/student_boy_red_vocals.png', category: 'Gesang' },
    { id: 'student_girl_vocals_1', url: '/avatars/student_girl_red_vocals.png', category: 'Gesang' },
    { id: 'student_boy_vocals_new', url: '/avatars/student_boy_vocals_1.png', category: 'Gesang' },
    { id: 'student_girl_vocals_new', url: '/avatars/student_girl_vocals_1.png', category: 'Gesang' },
    { id: 'student_vocals_alt', url: '/avatars/student_vocals_1.png', category: 'Gesang' },
    { id: 'student_vocals_new_2', url: '/avatars/student_vocals_new_2.png', category: 'Gesang' },
    { id: 'student_vocals_new_3', url: '/avatars/student_vocals_new_3.png', category: 'Gesang' },
    { id: 'student_vocals_new_4', url: '/avatars/student_vocals_new_4.png', category: 'Gesang' },
    { id: 'student_vocals_new_5', url: '/avatars/student_vocals_new_5.png', category: 'Gesang' },
    { id: 'student_vocals_new_6', url: '/avatars/student_vocals_new_6.png', category: 'Gesang' },
    { id: 'student_vocals_new_7', url: '/avatars/student_vocals_new_7.png', category: 'Gesang' },
    { id: 'student_vocals_new_8', url: '/avatars/student_vocals_new_8.png', category: 'Gesang' },
    { id: 'student_vocals_new_9', url: '/avatars/student_vocals_new_9.png', category: 'Gesang' },
    { id: 'student_vocals_new_10', url: '/avatars/student_vocals_new_10.png', category: 'Gesang' },
    { id: 'student_vocals_new_11', url: '/avatars/student_vocals_new_11.png', category: 'Gesang' },

    // Allgemein / Sonstige
    { id: 'avatar_boy_general', url: '/avatar_boy.jpg', category: 'Sonstige' },
    { id: 'avatar_girl_general', url: '/avatar_girl.jpg', category: 'Sonstige' }
  ];

  const TEACHER_AVATARS = [
    { id: 'teacher_male', url: '/avatar_teacher_male.jpg' },
    { id: 'teacher_female', url: '/avatar_teacher_female.jpg' },
    { id: 'teacher_expert', url: '/avatar_teacher_expert.jpg' },
    { id: 'teacher_drums', url: '/avatar_teacher_drums.jpg' },
    { id: 'teacher_drummer', url: '/avatar_teacher_drummer.jpg' },
    { id: 'teacher_gold_glasses', url: '/avatar_teacher_gold_glasses.jpg' },
    { id: 'teacher_senior', url: '/avatar_teacher_senior.jpg' },
    { id: 'teacher_clean', url: '/avatar_teacher_clean.jpg' },
  ];
  const [customBandName, setCustomBandName] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<string[]>([]);
  const [avatarPickerType, setAvatarPickerType] = useState<'band' | 'student' | 'teacher'>('band');
  const [avatarInstrumentFilter, setAvatarInstrumentFilter] = useState<'Alle' | 'E-Gitarre' | 'E-Piano' | 'E-Drum' | 'E-Bass' | 'Gesang'>('Alle');
  const [bandAvatarSizeFilter, setBandAvatarSizeFilter] = useState<'Alle' | '3' | '4' | '5'>('Alle');

  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    const urlBandId = searchParams.get('band');
    const isShared = searchParams.get('view') === 'shared';
    const urlCampusPassToken = searchParams.get('campus_pass');
    
    if (urlBandId) {
      if (isShared) setIsSharedView(true);
      console.log(`[PublicView] Detected band ID in URL: ${urlBandId} (Shared: ${isShared})`);
      const fetchPublicBand = async () => {
        try {
          const { data, error } = await supabase
            .from('bands')
            .select('*, songs(*), band_members(*, users!user_id(*)), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!bands_coach_id_fkey(first_name, last_name, photo_url)')
            .eq('id', urlBandId)
            .single();
            
          if (error) {
            console.error('[PublicView] Supabase error fetching band:', error);
            return;
          }
          
          if (data) {
            console.log('[PublicView] Band data loaded successfully:', data.name);
            setSelectedBandForProfile(data);
            setShowBandProfile(true);
            document.title = `${data.name} | GrooveLab Profile`;
          }
        } catch (err) {
          console.error('[PublicView] Unexpected crash during fetch:', err);
        }
      };
      fetchPublicBand();
    }

    if (urlCampusPassToken) {
      console.log(`[PublicPassView] Detected campus pass token in URL: ${urlCampusPassToken}`);
      const fetchPublicPass = async () => {
        try {
          setLoadingPublicPass(true);
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlCampusPassToken);
          const upperToken = urlCampusPassToken.toUpperCase();
          let passQuery = supabase
            .from('users')
            .select('id, first_name, last_name, role, email, instrument, qr_token, photo_url, school_id, ausweis_id, ausweis_nummer');
          if (isUuid) {
            passQuery = passQuery.or(`id.eq.${urlCampusPassToken},qr_token.eq.${urlCampusPassToken},teacher_qr_token.eq.${urlCampusPassToken}`);
          } else {
            passQuery = passQuery.or(`teacher_qr_token.eq.${urlCampusPassToken},ausweis_nummer.eq.${urlCampusPassToken},ausweis_nummer.eq.${upperToken}`);
          }
          const { data, error } = await passQuery.maybeSingle();
            
          if (error) {
            console.error('[PublicPassView] Supabase error fetching user for pass:', error);
            return;
          }
          
          if (data) {
            console.log('[PublicPassView] User pass loaded successfully:', data.first_name);
            setPublicPassUser(data);
            document.title = `Campus Pass | ${data.first_name} ${data.last_name}`;
          }
        } catch (err) {
          console.error('[PublicPassView] Unexpected crash during fetch:', err);
        } finally {
          setLoadingPublicPass(false);
        }
      };
      fetchPublicPass();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activePlatform === 'campus') {
      sessionStorage.setItem('campus_active_tab', activeStudentTab);
      localStorage.setItem('campus_active_tab', activeStudentTab);
    } else if (activePlatform === 'ensembles') {
      sessionStorage.setItem('ensembles_active_tab', activeStudentTab);
      localStorage.setItem('ensembles_active_tab', activeStudentTab);
    } else {
      sessionStorage.setItem('groovelab_active_tab', activeStudentTab);
      localStorage.setItem('groovelab_active_tab', activeStudentTab);
    }
  }, [activeStudentTab, activePlatform]);

  const previousPlatform = React.useRef(activePlatform);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_active_platform', activePlatform);
      localStorage.setItem('groovelab_active_platform', activePlatform);
    }
    if (previousPlatform.current === activePlatform) {
      return;
    }
    previousPlatform.current = activePlatform;
    
    // Load the saved tab for the new platform to guarantee flawless switching
    const storageKey = activePlatform === 'campus' ? 'campus_active_tab' : (activePlatform === 'ensembles' ? 'ensembles_active_tab' : 'groovelab_active_tab');
    const savedTab = typeof window !== 'undefined' ? (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) : null;
    
    let fallbackTab = 'live';
    if (activePlatform === 'campus') {
      fallbackTab = 'briefing';
    } else if (activePlatform === 'ensembles') {
      fallbackTab = 'overview';
    }
    
    setActiveStudentTab(savedTab || fallbackTab);
  }, [activePlatform]);

  // Safety Hook: Enforce that students in the Campus module can NEVER see the GrooveLab Live Lab tab.
  // If a student is on the 'campus' platform but the activeStudentTab is not a valid campus tab (e.g. 'live'),
  // we immediately redirect/correct them to 'briefing' to keep the modules strictly isolated.
  useEffect(() => {
    // Only enforce campus tab restrictions when on the campus platform
    if (activePlatform !== 'campus') return;
    if (user && user.role?.toLowerCase() === 'student') {
        const campusSettings = user?.schools?.opening_hours?.campus_settings || {};
        const showLeaderboard = campusSettings.show_leaderboard !== false;
        const showDetailedStats = campusSettings.show_detailed_stats !== false;
        const flamesActive = campusSettings.flames_active !== false;
        
        const allowedTabs = ['briefing', 'homework_book', 'mediathek', 'events', 'profile', 'all_appointments', 'messages', 'settings'];
        if (flamesActive) allowedTabs.push('practice_board');
        if (showLeaderboard) allowedTabs.push('campus_cup');

        if (!allowedTabs.includes(activeStudentTab)) {
          console.log('[Safety Hook] Enforcing student Campus Briefing Board redirect from invalid tab:', activeStudentTab);
          setActiveStudentTab('briefing');
          sessionStorage.setItem('campus_active_tab', 'briefing');
        }
      }
  }, [user, activePlatform, activeStudentTab]);
  const { width, height } = useWindowSize();
  const isMobile = width < 768;

  const [liveSessionMins, setLiveSessionMins] = useState(0);

  useEffect(() => {
    console.log('--- Groovelab Diagnostics ---');
    console.log('Base Origin:', window.location.origin);
    console.log('User Agent:', navigator.userAgent);

    if (!user?.id) return;

    const schoolId = user.school_id;

    // We build a single consolidated high-performance channel for all user-specific updates
    const syncChannel = supabase
      .channel(`realtime_app_sync_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users_raw', filter: `id=eq.${user.id}` },
        async (payload: any) => {
          if (payload.new) {
            const remoteVersion = payload.new.token_version;
            const localVersion = Number(sessionStorage.getItem('groovelab_token_version') || 1);
            if (remoteVersion && remoteVersion > localVersion) {
              console.warn('[Security] Remote session revocation triggered for current user!');
              try {
                navigator.mediaDevices?.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
              } catch (e) {}
              sessionStorage.clear();
              localStorage.removeItem('groovelab_user_id');
              localStorage.removeItem('groovelab_cached_user');
              setUser(null);
              setLoggedInUserId(null);
              alert('Sitzung widerrufen: Deine Anmeldung wurde aus Sicherheitsgründen durch die Schulleitung oder Administration zentral beendet.');
              window.location.href = '/';
              return;
            }
          }
          // Ignore pure heartbeat / presence updates to prevent continuous re-render cascades
          if (payload.old && payload.new) {
            const hasSubstantiveChange = Object.keys(payload.new).some(
              k => k !== 'last_seen' && payload.old[k] !== payload.new[k]
            );
            if (!hasSubstantiveChange) return;
          }
          console.log('[Realtime] Current user profile update detected, refetching...');
          const { data: updatedUser } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
          if (updatedUser) {
            setUser(updatedUser);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        async (payload: any) => {
          // Ignore pure heartbeat / presence updates to prevent continuous re-render cascades
          if (payload.old && payload.new) {
            const hasSubstantiveChange = Object.keys(payload.new).some(
              k => k !== 'last_seen' && payload.old[k] !== payload.new[k]
            );
            if (!hasSubstantiveChange) return;
          }
          console.log('[Realtime] Current user profile update detected, refetching...');
          const { data: updatedUser } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
          if (updatedUser) {
            setUser(updatedUser);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'schools', filter: `id=eq.${schoolId}` },
        (payload: any) => {
          if (payload.new && payload.new.sessions_revoked_at) {
            const schoolRevokedTime = new Date(payload.new.sessions_revoked_at).getTime();
            const sessionStartTime = Number(sessionStorage.getItem('groovelab_session_started_at') || Date.now());
            if (schoolRevokedTime > sessionStartTime) {
              console.warn('[Security] School-wide session revocation triggered!');
              try {
                navigator.mediaDevices?.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
              } catch (e) {}
              sessionStorage.clear();
              localStorage.removeItem('groovelab_user_id');
              localStorage.removeItem('groovelab_cached_user');
              setUser(null);
              setLoggedInUserId(null);
              alert('Sicherheits-Abmeldung: Alle aktiven Sitzungen deiner Musikschule wurden durch die Schulleitung zentral beendet.');
              window.location.href = '/';
              return;
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          console.log('[Realtime] Session change detected:', payload);
          
          const currentStationId = localStorage.getItem('groovelab_station_id');
          const isKiosk = currentStationId && currentStationId !== 'skip';

          if (isKiosk) {
            // 1. If user checked in at a different station, auto logout this one
            if (payload.eventType === 'INSERT' && payload.new) {
              const newStationId = payload.new.station_id;
              if (newStationId && newStationId !== currentStationId) {
                console.warn('[Realtime] User checked in at another station. Logging out this station.');
                handleLogout(false);
                return;
              }
            }
            // 2. If the active session for this station was checked out, auto logout
            if (payload.eventType === 'UPDATE' && payload.new && payload.new.check_out_time) {
              if (payload.new.station_id === currentStationId) {
                console.warn('[Realtime] Session checked out. Logging out this station.');
                handleLogout(false);
                return;
              }
            }
          }

          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_song_skills', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] user_song_skills update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campus_direct_messages' },
        () => {
          console.log('[Realtime] campus_direct_messages update detected');
          fetchCampusMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'band_members', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] band_members update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules', filter: `student_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] schedules update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_occurrences', filter: `student_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] schedule_occurrences update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      );

    // If the user has a school_id, also subscribe to the school's bands updates
    if (schoolId) {
      syncChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bands', filter: `school_id=eq.${schoolId}` },
        () => {
          console.log('[Realtime] bands update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      );
    }

    syncChannel.subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
    };
  }, [user]);

  const isKioskMode = (stationIdFromStorage && stationIdFromStorage !== 'skip') || (typeof window !== 'undefined' ? !!localStorage.getItem('groovelab_kiosk_token') : false);

  // Enterprise Kiosk Inactivity Auto-Reset (Schutz vor verwaisten Sessions auf Schul-iPads)
  useEffect(() => {
    if (!loggedInUserId || !isKioskMode) return;

    let timeoutId: any;
    const KIOSK_IDLE_LIMIT_MS = 5 * 60 * 1000; // 5 Minuten Inaktivität

    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[Kiosk] Inactivity timeout reached. Resetting session to Kiosk login screen.');
        handleLogout(true, false);
      }, KIOSK_IDLE_LIMIT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [loggedInUserId, isKioskMode]);

  useEffect(() => {
    if (loggedInUserId) {
      if (typeof (window as any).stopAllCameras === 'function') {
        (window as any).stopAllCameras();
      }
      // Safety timeout: if fetchDashboardData hangs (e.g. frozen auth lock),
      // force-clear the loading spinner after 10 seconds.
      const safetyTimer = setTimeout(() => {
        setLoading(prev => {
          if (prev) {
            console.warn('[Dashboard] Safety timeout: loading was stuck for 10s. Force-clearing.');
            return false;
          }
          return prev;
        });
      }, 10000);
      fetchDashboardData(loggedInUserId, true).finally(() => clearTimeout(safetyTimer));
    }
  }, [loggedInUserId]);

  useEffect(() => {
    let interval: any;
    if (session && !session.check_out_time) {
      const start = new Date(session.check_in_time).getTime();
      const update = () => {
        const now = new Date().getTime();
        setLiveSessionMins(Math.max(0, Math.floor((now - start) / 60000)));
      };
      update();
      interval = setInterval(update, 60000);
    } else {
      setLiveSessionMins(0);
    }
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (loggedInUserId) {
      // 1. Dashboard Data Fetch (Interval)
      const dashboardInterval = setInterval(() => {
        fetchDashboardData(loggedInUserId);
      }, 45000);

      // 2. Continuous Heartbeat Monitor (Students only)
      const heartbeatInterval = setInterval(async () => {
        if (!user || user.role !== 'student' || !session || session.check_out_time) return;

        console.log('[Heartbeat] Updating last_seen...');
        
        // Update user's last_seen in DB to keep them active on the dashboard
        const now = new Date().toISOString();
        await supabase.from('users').update({ last_seen: now }).eq('id', user.id);
      }, 30000); // Every 30 seconds

      return () => {
        clearInterval(dashboardInterval);
        clearInterval(heartbeatInterval);
      };
    }
  }, [loggedInUserId, user, session]);

  // Realtime Session Monitor (Single Login Rule - Students only)
  useEffect(() => {
    if (!session?.id) return;

    // Only students are subject to the automatic logout single-login rule!
    // Teachers and admins must never be automatically logged out by this monitor.
    const isStudent = user?.role?.toLowerCase() === 'student';
    if (!isStudent) return;

    const channel = supabase
      .channel(`session_monitor_${session.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        // Only logout if check_out_time was set by someone else (e.g. admin or new session)
        // and we are not currently in the process of logging out ourselves
        if (payload.new.check_out_time && !payload.new.metadata?.is_tab_close && !payload.new.metadata?.is_switching_station) {
          if (isKioskMode) {
            handleLogout(false); // Logout but do not try to update DB again
          } else {
            setSession(null); // Personal device: just reset session to show the check-in overlay
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, user?.role, isKioskMode]);

  // Periodic Geolocation Check (Auto Checkout if outside Geofence) - Disabled per user request
  useEffect(() => {
    // Geofencing is only verified at login. Periodic checks after login are completely disabled.
    console.log('[Geofence Monitor] Periodic geofence monitoring is disabled.');
    return;
  }, []);

  const fetchDashboardData = async (userId: string, isInitial: boolean = false) => {
    try {
      if (isInitial) setLoading(true);
      console.log(`[Dashboard] Fetching data for user: ${userId}`);
      
      // Stage 1 light: Fetch user record and current session in parallel with automatic retries
      const [userRes, sessionRes] = await Promise.all([
        safeSupabaseQuery(async () => await supabase.from('users').select('*, schools(*)').eq('id', userId).maybeSingle()),
        safeSupabaseQuery(async () => await supabase.from('sessions').select('*, stations(name, color)').eq('user_id', userId).is('check_out_time', null).order('check_in_time', { ascending: false }).limit(1).maybeSingle())
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Stage 1 Light:', err);
        return [ {error: err}, {error: err} ] as any;
      });

      if (userRes?.error) {
        console.error('[Dashboard] User Fetch Error or Network Issue:', userRes.error);
      }

      let userData = userRes?.data;
      let usedOfflineCache = false;

      // --- OFFLINE & PERSISTENT CACHE FALLBACK LOGIC ---
      if (!userData) {
        console.warn('[Dashboard] Attempting to load user from local cache...');
        const cachedUserStr = sessionStorage.getItem('groovelab_cached_user');
        if (cachedUserStr) {
          try {
            const parsed = JSON.parse(cachedUserStr);
            if (parsed && (parsed.id === userId || !userId)) {
              userData = parsed;
              usedOfflineCache = true;
            }
          } catch (e) {}
        }
        
        if (!userData) {
          const cachedStr = localStorage.getItem(`groovelab_offline_user_cache_${userId || 'last'}`);
          if (cachedStr) {
            try {
              const parsedCache = JSON.parse(cachedStr);
              const cacheAge = Date.now() - parsedCache.timestamp;
              if (cacheAge < 172800000 && (!userId || parsedCache.data?.id === userId)) {
                console.log('[Dashboard] Valid offline cache found! Age (hours):', (cacheAge / 3600000).toFixed(1));
                userData = parsedCache.data;
                usedOfflineCache = true;
                setIsOfflineMode(true);
              } else if (cacheAge >= 172800000) {
                console.warn('[Dashboard] Offline cache expired (TTL > 48h). Purging.');
                localStorage.removeItem(`groovelab_offline_user_cache_${userId || 'last'}`);
              }
            } catch (e) {
              console.error('[Dashboard] Error parsing offline cache:', e);
              localStorage.removeItem(`groovelab_offline_user_cache_${userId || 'last'}`);
            }
          }
        }
      } else if (userData) {
        // --- UPDATE OFFLINE CACHE & PERSISTENT USER ---
        try {
          sessionStorage.setItem('groovelab_cached_user', JSON.stringify(userData));
          sessionStorage.setItem('groovelab_user_id', userData.id);
        } catch (e) {}
        try {
          const minimalUserData = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            roles: userData.roles,
            school_id: userData.school_id,
            is_campus_active: userData.is_campus_active,
            is_groovelab_active: userData.is_groovelab_active,
            avatar_url: userData.avatar_url,
            photo_url: userData.photo_url,
            schools: Array.isArray(userData.schools) 
              ? userData.schools.map((s: any) => ({ id: s.id, has_campus_subscription: s.has_campus_subscription, has_groovelab_subscription: s.has_groovelab_subscription }))
              : userData.schools ? { id: userData.schools.id, has_campus_subscription: userData.schools.has_campus_subscription, has_groovelab_subscription: userData.schools.has_groovelab_subscription } : null
          };
          localStorage.setItem(`groovelab_offline_user_cache_${userData.id}`, JSON.stringify({
            timestamp: Date.now(),
            data: minimalUserData
          }));
          setIsOfflineMode(false); // We got fresh data
        } catch (e) {
          console.error('[Dashboard] Failed to write offline cache:', e);
        }
      }

      if (userData) {
        const activeWorkspace = sessionStorage.getItem('groovelab_active_workspace');
        if (activeWorkspace === 'teacher' && (userData.role === 'teacher' || (userData.roles && userData.roles.includes('teacher')) || userData.role === 'admin' || userData.role === 'secretary')) {
          userData.role = 'teacher';
        }
        if (!userData.photo_url && !userData.avatar_url) {
          const r = (userData.role || '').toLowerCase();
          const rolesArr = userData.roles || [];
          const isPureAdminOrSec = (r === 'admin' || r === 'secretary') && !rolesArr.includes('teacher') && !rolesArr.includes('student');
          if (isPureAdminOrSec) {
            userData.photo_url = '/campus_login_hero.png';
            userData.avatar_url = '/campus_login_hero.png';
          }
        }
        if (userData.role === 'student') {
          try {
            userData.resolved_instrument = await resolveStudentInstrumentAsync(userData);
            if (!userData.instrument || userData.instrument === 'Allgemein' || userData.instrument === 'ohne Zuweisung' || userData.instrument === 'Musiker' || userData.instrument === 'Schüler' || userData.instrument === 'Instrument') {
              userData.instrument = userData.resolved_instrument;
            }
          } catch (e) {}
        }
      }

      if (!userData) {
        console.warn('[Dashboard] No user data found for ID:', userId);
        setLoading(false);
        // We only trigger diagnostic exit hatch if this is an actual DB fetch error and we have NO offline cache
        if (userRes?.error && isInitial) {
           if (typeof window !== 'undefined') {
              (window as any).fetchDashboardDataError = userRes.error;
              (window as any).fetchDashboardDataStack = new Error().stack;
           }
        }
        return;
      }

      // Check if user needs to accept the pilot phase onboarding agreement
      const userRole = (userData.role || '').toLowerCase();
      const userRolesArr = userData.roles || [];
      const isAdminOrSecUser = userRole === 'admin' || userRole === 'secretary' || userRolesArr.includes('admin') || userRolesArr.includes('secretary');
      let schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
      
      if (isAdminOrSecUser && schoolId) {
        try {
          // 1. Check if school already accepted terms during signup / self-onboarding (avv_signed_at)
          const { data: schoolRecord } = await supabase
            .from('schools')
            .select('avv_signed_at, status')
            .eq('id', schoolId)
            .maybeSingle();

          if (schoolRecord?.avv_signed_at) {
            setShowPilotAgreementModal(false);
          } else {
            const { data: agreementData, error: agreementError } = await supabase
              .from('pilot_agreements')
              .select('id')
              .eq('school_id', schoolId)
              .maybeSingle();

            if (agreementError) {
              console.error('[Dashboard] Error querying pilot agreements:', agreementError);
            } else if (!agreementData) {
              console.log('[Dashboard] No pilot agreement found for school. Displaying onboarding modal.');
              setShowPilotAgreementModal(true);
            } else {
              setShowPilotAgreementModal(false);
            }
          }
        } catch (err) {
          console.error('[Dashboard] Catch exception querying pilot agreements:', err);
        }
      }



      // STRICT DB SESSION VERIFICATION (Closing the backdoor):
      const isStudent = userData.role?.toLowerCase() === 'student';
      if (isStudent && locationMode === 'lab') {
        const storedStationId = localStorage.getItem('groovelab_station_id');
        const hasNoSession = !sessionRes.data && !sessionRes.error;
        const hasDifferentStation = sessionRes.data && storedStationId && sessionRes.data.station_id !== storedStationId;

        if (hasNoSession || (hasDifferentStation && isKioskMode)) {
          if (isKioskMode) {
            console.warn('[Dashboard] Student in Lab mode on Kiosk has no active database session or is checked in at another station! Force logout.');
            setLoading(false);
            handleLogout(false);
            return;
          } else {
            console.log('[Dashboard] Student in Lab mode on Personal Device has no active session. Remain logged in.');
          }
        }
      }

      // Determine what platform the user is allowed to access and what is default:
      const schoolObj = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
      const schoolHasCampus = schoolObj?.has_campus_subscription ?? true;
      const schoolHasGroove = schoolObj?.has_groovelab_subscription ?? true;

      const isCampusActive = Boolean(schoolHasCampus && userData.is_campus_active);
      const isGroovelabActive = Boolean(schoolHasGroove && userData.is_groovelab_active);

      let allowedPlatform: 'campus' | 'groovelab' = 'campus';
      let defaultTab = 'briefing';

      if (isCampusActive) {
        allowedPlatform = 'campus';
        defaultTab = 'briefing';
      } else if (isGroovelabActive) {
        allowedPlatform = 'groovelab';
        defaultTab = 'live';
      } else {
        allowedPlatform = 'campus';
        defaultTab = 'qr_landing';
      }

      if (isInitial) {
        const isTeacher = userData.role?.toLowerCase() === 'teacher';
        const isSecretary = userData.role?.toLowerCase() === 'secretary';

        if (isStudent) {
          const startPlat = allowedPlatform;
          setActivePlatform(startPlat);
          sessionStorage.setItem('groovelab_active_platform', startPlat);
          
          const storageKey = startPlat === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
          const storedTab = sessionStorage.getItem(storageKey);
          const startTab = storedTab ? storedTab : defaultTab;
          
          setActiveStudentTab(startTab);
          sessionStorage.setItem(storageKey, startTab);
        } else if (isTeacher) {
          const startPlat = allowedPlatform;
          setActivePlatform(startPlat);
          sessionStorage.setItem('groovelab_active_platform', startPlat);
          
          const storageKey = startPlat === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
          const storedTab = sessionStorage.getItem(storageKey);
          const startTab = storedTab ? storedTab : defaultTab;
          
          setActiveStudentTab(startTab);
          sessionStorage.setItem(storageKey, startTab);
        } else if (isSecretary) {
          const startPlat = allowedPlatform;
          setActivePlatform(startPlat);
          sessionStorage.setItem('groovelab_active_platform', startPlat);
          sessionStorage.setItem('groovelab_active_workspace', 'secretary');
          
          const storedSubtab = sessionStorage.getItem('groovelab_secretary_subtab');
          sessionStorage.setItem('groovelab_secretary_subtab', storedSubtab || 'briefing');
          
          const storedTab = sessionStorage.getItem('campus_active_tab');
          const startTab = storedTab ? storedTab : defaultTab;
          
          setActiveStudentTab(startTab);
          sessionStorage.setItem('campus_active_tab', startTab);
        } else {
          setActivePlatform(allowedPlatform);
          sessionStorage.setItem('groovelab_active_platform', allowedPlatform);

          if (allowedPlatform === 'campus') {
            const storedTab = sessionStorage.getItem('campus_active_tab');
            let defaultTab = storedTab ? storedTab : (isStudent ? 'briefing' : 'live');
            
            const isTeacherOrAdmin = userData.role?.toLowerCase() === 'teacher' || userData.role?.toLowerCase() === 'admin';
            if (isTeacherOrAdmin) {
              const studentTabs = ['briefing', 'practice_board', 'mediathek', 'practice', 'library', 'repertoire', 'matching'];
              if (studentTabs.includes(defaultTab)) {
                defaultTab = 'live';
              }
            }
            
            setActiveStudentTab(defaultTab);
            sessionStorage.setItem('campus_active_tab', defaultTab);
          } else {
            const storedTab = sessionStorage.getItem('groovelab_active_tab');
            let defaultTab = storedTab ? storedTab : 'live';
            
            const isTeacherOrAdmin = userData.role?.toLowerCase() === 'teacher' || userData.role?.toLowerCase() === 'admin';
            if (isTeacherOrAdmin) {
              const studentTabs = ['briefing', 'practice_board', 'mediathek', 'practice', 'library', 'repertoire', 'matching'];
              if (studentTabs.includes(defaultTab)) {
                defaultTab = 'live';
              }
            }
            
            setActiveStudentTab(defaultTab);
            sessionStorage.setItem('groovelab_active_tab', defaultTab);
          }
        }
      }

      schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
      if (typeof window !== 'undefined') {
        (window as any).debugSchoolId = schoolId;
        (window as any).debugUserId = userId;
        (window as any).debugUserData = JSON.stringify(userData);
      }
      if (!schoolId || schoolId.length !== 36) {
        console.warn('[Dashboard] No valid school_id found. Board will be empty.');
        setUser(userData);
        setLoading(false);
        return;
      }

      const schoolData = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
      const isMaster = userData.is_master_admin === true;
      if (schoolData?.is_paused && !isMaster) {
        console.warn('[Dashboard] School is paused!');
        setIsSchoolPaused(true);
        setUser(userData);
        setLoading(false);
        return;
      } else {
        setIsSchoolPaused(false);
      }

      // ─── INSTANT UI UNBLOCK FOR STUDENTS ───
      // We set the user and session immediately so the dashboard mounts.
      // The heavier details (Stage 2) load in the background, updating the view reactively.
      setUser(userData);
      setSession(sessionRes.data);
      if (isInitial) {
        setLoading(false); 
      }

      // Bypass heavy Stage 2 queries for staff (teacher/admin/secretary)
      const isStaff = userData.role?.toLowerCase() === 'teacher' || 
                      userData.role?.toLowerCase() === 'admin' || 
                      userData.role?.toLowerCase() === 'secretary';

      if (isStaff) {
        console.log('[Dashboard] Staff user detected. Bypassing heavy Stage 2 student queries for instant load.');
        if (sessionRes.data) {
          setLocationMode('lab');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
        } else {
          setLocationMode('home');
          sessionStorage.setItem('groovelab_location_mode', 'home');
        }
        // Always fetch school users and messages for staff
        (async () => {
          let sId = schoolId || userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
          if (!sId && userData?.id) {
            const { data: uData } = await supabase.from('users').select('school_id').eq('id', userData.id).maybeSingle();
            if (uData?.school_id) sId = uData.school_id;
          }

          const schoolIds = new Set<string>();
          if (sId) schoolIds.add(sId);
          if (Array.isArray(userData?.schools)) {
            userData.schools.forEach((s: any) => { if (s?.id) schoolIds.add(s.id); });
          } else if (userData?.schools?.id) {
            schoolIds.add(userData.schools.id);
          }

          if (sId) {
            fetchActiveStudentCount(sId).catch(err => console.error('Error fetching student count:', err));
            supabase.from('users')
              .select('id, first_name, last_name, role, avatar_url, photo_url, instrument, last_seen, sick_until, sick_start, phone, is_active, nickname, is_groovelab_active, is_campus_active')
              .eq('school_id', sId)
              .in('role', ['teacher', 'admin'])
              .order('first_name')
              .then(res => {
                if (res.data) setTeachers(res.data);
              });
          }

          const mergedUsersMap = new Map<string, any>();
          const sidList = Array.from(schoolIds);

          if (sidList.length > 0) {
            const [uRes, pRes] = await Promise.all([
              supabase
                .from('users')
                .select('id, school_id, first_name, last_name, role, roles, instrument, avatar_url, photo_url, is_active, is_campus_active, is_groovelab_active, qr_token, teacher_id, lesson_duration, birth_date, is_app_user')
                .in('school_id', sidList)
                .order('first_name'),
              supabase
                .from('pending_students_decrypted')
                .select('id, school_id, first_name, last_name, instrument, qr_token')
                .in('school_id', sidList)
                .then(r => r, () => ({ data: [] }))
            ]);

            (uRes.data || []).forEach((u: any) => mergedUsersMap.set(u.id, u));
            (pRes.data || []).forEach((p: any) => {
              if (p && p.id && !mergedUsersMap.has(p.id)) {
                mergedUsersMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
              }
            });
          }

          const allUsers = Array.from(mergedUsersMap.values());
          if (allUsers.length > 0) {
            setSchoolUsers(allUsers);
          }
          if (sId) {
            checkAnnouncements(sId, userData);
            fetchAnnouncements(sId);
          }
          fetchCampusMessages();
        })().catch(err => console.error('Error in staff background fetches:', err));
        return;
      }

      // Stage 1 student heavy: Fetch sessions history and band memberships for students
      const [allSessionsRes, membershipsRes] = await Promise.all([
        supabase.from('sessions').select('check_in_time, check_out_time').eq('user_id', userId),
        supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))))').eq('user_id', userId)
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Student Stage 1 Heavy:', err);
        return [ {error: err}, {error: err} ] as any;
      });

      if (membershipsRes?.error) console.error('[Dashboard] Memberships Fetch Error:', membershipsRes.error);

      const bandIds = (membershipsRes?.data || []).map((m: any) => m.bands?.id).filter(Boolean);

      // Stage 2: Fetch all detailed boards, library, school bands, teachers, active session metrics in a single parallel block
      const [skillsRes, wallRes, membersRes, userBandsRes, bandsRes, teachersRes, activeSessionsRes] = await Promise.all([
        supabase.from('user_song_skills').select(`
          id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
          songs (*)
        `).eq('user_id', userId),
        supabase.from('songs').select(`
          *,
          user_song_skills (
            id, song_id, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
            profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
          ),
          band_songs (
            id, band_id, status, is_exclusive, difficulty_level,
            bands (id, name, photo_url, school_id),
            band_song_slots (
              id, user_id, instrument, status,
              profiles:users!band_song_slots_user_id_fkey(first_name, photo_url)
            )
          )
        `).eq('school_id', schoolId).eq('is_groovelab_active', true).eq('user_song_skills.is_stage_ready', true).order('level').order('artist'),
        Promise.resolve({ data: [], error: null }),
        bandIds.length > 0
          ? supabase.from('bands').select(`
              *,
              songs (*),
              band_members (*, users(id, first_name, last_name, photo_url, role)),
              band_songs (*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))),
              coach:users!coach_id (first_name, last_name, photo_url)
            `).in('id', bandIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('bands').select('*, songs(id, title, artist, instrumentation), band_members(*, users!user_id(id, first_name, last_name, photo_url, role)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
        supabase.from('users').select('id, first_name, last_name, role, avatar_url, photo_url, instrument, last_seen, sick_until, sick_start, phone, is_active, nickname, is_groovelab_active, is_campus_active').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
        supabase.from('sessions').select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen, is_groovelab_active)').is('check_out_time', null).eq('users.school_id', schoolId).eq('users.role', 'student')
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Stage 2:', err);
        return [ {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err} ] as any;
      });

      if (skillsRes.error) console.error('[Dashboard] Skills Fetch Error:', skillsRes.error);
      if (wallRes.error) console.error('[Dashboard] Songs query error:', wallRes.error);

      setUser(userData);
      setSession(sessionRes.data);
      if (sessionRes.error) console.error('[Dashboard] Error fetching session:', sessionRes.error);

      // If this is a teacher or admin, make sure locationMode reflects their session state in the DB
      const isTeacherOrAdmin = userData.role?.toLowerCase() === 'teacher' || userData.role?.toLowerCase() === 'admin';
      if (isTeacherOrAdmin) {
        if (sessionRes.data) {
          setLocationMode('lab');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
        } else {
          setLocationMode('home');
          sessionStorage.setItem('groovelab_location_mode', 'home');
        }
      }

      // Parse active sessions in parallel
      if (activeSessionsRes.data) {
        const count = activeSessionsRes.data.filter((s: any) => {
          const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
          if (!u) return false;
          const isStudent = u.role?.toLowerCase() === 'student';
          const isStaff = u.role?.toLowerCase() === 'teacher' || u.role?.toLowerCase() === 'admin';
          return isStudent && !isStaff && s.station_id && s.gps_verified && u.is_groovelab_active;
        }).length;
        setActiveStudentsCount(count);
      }

      // Populate global library songs in parallel
      if (wallRes.data) {
        setGlobalSongs(wallRes.data);
      }

      // Populate school teachers in parallel
      if (teachersRes.data) {
        setTeachers(teachersRes.data);
      }

      if (allSessionsRes.data) {
        const totalMins = allSessionsRes.data.reduce((acc: number, s: any) => {
          const start = new Date(s.check_in_time);
          const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
          return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
        }, 0);
        setTotalPresenceMins(totalMins);
      }

      const safeSkills = skillsRes.data || [];

      // Build a map of all school skills for easy lookup (defined early for bandsData enrichment)
      const schoolSkillsMap: Record<string, any[]> = {};
      (wallRes.data || []).forEach((song: any) => {
        (song.user_song_skills || []).forEach((skill: any) => {
          if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
          schoolSkillsMap[skill.user_id].push(skill);
        });
      });

      // Align bandsData and m.profiles so they are enriched early
      const bandsData = bandsRes?.data || [];
      if (bandsRes?.error) console.error('[Dashboard] Error fetching all school bands:', bandsRes.error);
      bandsData.forEach((band: any) => {
        (band.band_members || []).forEach((m: any) => {
          const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
          if (u) {
            u.user_song_skills = schoolSkillsMap[u.id] || [];
            if (!m.profiles) {
              m.profiles = u;
            }
          }
        });
      });
      const instrumentalSongs = safeSkills.map((p: any) => {
          const song = Array.isArray(p.songs) ? p.songs[0] : p.songs;
          if (!song || song.is_groovelab_active === false) return null;
          // EXCLUDE VOCALS/GESANG FROM INDIVIDUAL SKILLS: THEY MUST BE IN A FORMATION
          const pi = (p.instrument || '').toLowerCase();
          if (pi.includes('vocal') || pi.includes('gesang')) return null;

          return {
            id: p.id, song_id: song.id, user_id: userId, title: song.title || '...', artist: song.artist || '...',
            progress: p.is_stage_ready ? 100 : Math.min(90, p.progress_percent || 0),
            instrument: p.instrument, difficulty_level: p.difficulty_level || 'original',
            part_number: p.part_number || 1,
            is_stage_ready: !!p.is_stage_ready, is_favorite: !!p.is_favorite, locked: !p.is_stage_ready,
            is_pending_approval: !!p.is_pending_approval, media_link: song.media_link, tomplay_url: song.tomplay_url, instrumentation: song.instrumentation,
            pdf_folder_url: song.pdf_folder_url, guitar_pro_url: song.guitar_pro_url,
            pdf_guitar_url: song.pdf_guitar_url, pdf_bass_url: song.pdf_bass_url,
            pdf_drums_url: song.pdf_drums_url, pdf_keys_url: song.pdf_keys_url,
            pdf_vocals_url: song.pdf_vocals_url,
            playalong_url: song.playalong_url
          };
      }).filter(Boolean);

      // Add vocal songs if they are registered as singers
      const vocalSongs = (membershipsRes?.data || []).flatMap((m: any) => {
        const mi = (m.instrument || '').toLowerCase();
        
        const band = m.bands;
        if (!band) return [];

        const songs: any[] = [];
        const addedSongIds = new Set<string>();

        // 1. Process from band_songs where user is assigned to Vocals slot
        (band.band_songs || []).forEach((bs: any) => {
          const s = Array.isArray(bs.songs) ? bs.songs[0] : bs.songs;
          if (!s || s.is_groovelab_active === false) return;
          
          const isMyVocalSlot = (bs.band_song_slots || []).some((slot: any) => 
            slot.user_id === userId && 
            ((slot.instrument || '').toLowerCase().includes('vocal') || (slot.instrument || '').toLowerCase().includes('gesang'))
          );
          
          if (isMyVocalSlot) {
            songs.push({
              id: `vocal_proj_${bs.id}_${s.id}`, song_id: s.id, user_id: userId, title: s.title || '...', artist: s.artist || '...',
              progress: 100, instrument: 'Vocals', difficulty_level: bs.difficulty_level || 'original',
              is_stage_ready: true, is_favorite: false, locked: false, is_pending_approval: false,
              media_link: s.media_link, tomplay_url: s.tomplay_url, instrumentation: s.instrumentation,
              pdf_folder_url: s.pdf_folder_url, guitar_pro_url: s.guitar_pro_url,
              pdf_guitar_url: s.pdf_guitar_url, pdf_bass_url: s.pdf_bass_url,
              pdf_drums_url: s.pdf_drums_url, pdf_keys_url: s.pdf_keys_url,
              pdf_vocals_url: s.pdf_vocals_url,
              playalong_url: s.playalong_url
            });
            addedSongIds.add(s.id);
          }
        });

        // 2. Fallback for the main band song if it wasn't added yet (to be safe), ONLY if the member's primary instrument is vocals/gesang
        const isPrimaryVocalist = mi.includes('vocal') || mi.includes('gesang');
        if (isPrimaryVocalist) {
          const bSong = Array.isArray(band.songs) ? band.songs[0] : band.songs;
          if (bSong && !addedSongIds.has(bSong.id)) {
            // Check if this student has a Vocals slot for the main song (or if they are the core vocalist, fallback to adding it if no slots exist at all)
            const mainBandSongRow = (band.band_songs || []).find((bs: any) => {
              const s = Array.isArray(bs.songs) ? bs.songs[0] : bs.songs;
              return s && s.id === bSong.id;
            });
            
            let shouldAddMain = false;
            if (mainBandSongRow) {
              const hasAnyVocalSlots = (mainBandSongRow.band_song_slots || []).some((slot: any) => 
                ((slot.instrument || '').toLowerCase().includes('vocal') || (slot.instrument || '').toLowerCase().includes('gesang'))
              );
              if (hasAnyVocalSlots) {
                shouldAddMain = (mainBandSongRow.band_song_slots || []).some((slot: any) => 
                  slot.user_id === userId && 
                  ((slot.instrument || '').toLowerCase().includes('vocal') || (slot.instrument || '').toLowerCase().includes('gesang'))
                );
              } else {
                shouldAddMain = true; // Fallback if slots aren't populated yet
              }
            } else {
              shouldAddMain = true; // Fallback if band_songs row doesn't exist yet
            }

            if (shouldAddMain) {
              songs.push({
                id: `vocal_${band.id}_${bSong.id}`, song_id: bSong.id, user_id: userId, title: bSong.title || '...', artist: bSong.artist || '...',
                progress: 100, instrument: 'Vocals', difficulty_level: 'original',
                is_stage_ready: true, is_favorite: false, locked: false, is_pending_approval: false,
                media_link: bSong.media_link, tomplay_url: bSong.tomplay_url, instrumentation: bSong.instrumentation,
                pdf_folder_url: bSong.pdf_folder_url, guitar_pro_url: bSong.guitar_pro_url,
                pdf_guitar_url: bSong.pdf_guitar_url, pdf_bass_url: bSong.pdf_bass_url,
                pdf_drums_url: bSong.pdf_drums_url, pdf_keys_url: bSong.pdf_keys_url,
                pdf_vocals_url: bSong.pdf_vocals_url,
                playalong_url: bSong.playalong_url
              });
            }
          }
        }
        return songs;
      });

      // De-duplicate combined list by (song_id, instrument, part_number, difficulty_level) to ensure bulletproof UI counts
      const combinedSongs = [...instrumentalSongs, ...vocalSongs];
      const uniqueCombined: any[] = [];
      const seenCombinedKeys = new Set<string>();

      combinedSongs.forEach((song: any) => {
        const key = `${song.song_id}_${(song.instrument || '').toLowerCase()}_${song.part_number || 1}_${song.difficulty_level || 'starter'}`;
        if (!seenCombinedKeys.has(key)) {
          seenCombinedKeys.add(key);
          uniqueCombined.push(song);
        }
      });

      setUserSongs(prev => {
        const timeSinceLastWrite = Date.now() - lastWriteTimeRef.current;
        const isRecentlyWritten = timeSinceLastWrite < 15000;
        
        // Map existing ones and keep their local progress to prevent visual jumps.
        // We only retain items that still exist in the remote uniqueCombined array (i.e. not deleted!).
        const merged = prev
          .map(localSong => {
            const remoteSong = uniqueCombined.find(r => 
              r.song_id === localSong.song_id && 
              (r.instrument || '').toLowerCase() === (localSong.instrument || '').toLowerCase() &&
              (r.part_number || 1) === (localSong.part_number || 1) &&
              (r.difficulty_level || 'starter') === (localSong.difficulty_level || 'starter')
            );
            if (remoteSong) {
              const isStageReadyChanged = remoteSong.is_stage_ready !== localSong.is_stage_ready;
              const isApprovalChanged = remoteSong.is_pending_approval !== localSong.is_pending_approval;
              
              // We only adopt the remote progress if:
              // 1. We did not write recently (meaning the DB is settled and holds the truth)
              // 2. OR the remote progress is higher (e.g. updated from teacher or another device)
              // 3. OR the stage-ready status or approval status changed
              if (!isRecentlyWritten || remoteSong.progress > localSong.progress || isStageReadyChanged || isApprovalChanged) {
                return remoteSong;
              }
              // Protect local optimistic progress from being overwritten by stale remote poll
              return { ...remoteSong, progress: localSong.progress };
            }
            return null;
          })
          .filter((song): song is any => song !== null);

        // Add any new remote songs that are not in the local prev array
        uniqueCombined.forEach(r => {
          const exists = prev.some(l => 
            l.song_id === r.song_id && 
            (l.instrument || '').toLowerCase() === (r.instrument || '').toLowerCase() &&
            (l.part_number || 1) === (r.part_number || 1) &&
            (l.difficulty_level || 'starter') === (r.difficulty_level || 'starter')
          );
          if (!exists) {
            merged.push(r);
          }
        });

        return merged;
      });

      if (wallRes.data) console.log(`[Dashboard] wallRes returned ${wallRes.data.length} songs.`);

      const wallData = wallRes.data || [];
      console.log('[Dashboard] Wall data fetched. Count:', wallData.length);
      const allMembers = membersRes.data || [];

      // --- FOUNDING DETECTION (Manual Trigger Only) ---
      // We no longer auto-set pendingFounding here to prevent unexpected popups.
      // Students trigger founding manually via the "JETZT BAND GRÜNDEN" button on the board.

      // --- BAND PROJECT AUTO-FILLING (Optimized: ONLY runs on initial full load to save heavy redundant DB operations!) ---
      const formingBands = bandsData.filter((b: any) => b.status === 'forming' || b.status === 'active');
      if (isInitial && !isStudent && formingBands.length > 0) {
        // Run auto-fill asynchronously to not block the main dashboard load
        (async () => {
          const currentMemberships = await supabase.from('band_members').select('user_id, bands(id, song_id)').then(r => r.data || []);
          for (const band of formingBands) {
            const bandSong = band.band_songs?.[0];
            if (!bandSong) continue;
            const instrumentation = bandSong.songs?.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
            const slots = bandSong.band_song_slots || [];
            for (const [inst, count] of Object.entries(instrumentation)) {
              if (inst.toLowerCase().includes('vocals')) continue;
              if (slots.filter((s: any) => s.instrument === inst).length < (count as number)) {
                const songData = wallData.find((s: any) => s.id === band.song_id);
                if (songData) {
                  const level = bandSong.difficulty_level || 'original';
                  const candidate = (songData.user_song_skills || []).find((s: any) => {
                    if (!s.is_stage_ready || s.difficulty_level !== level || s.user_id === userId) return false;
                    
                    // 1. MUST match the slot instrument we are looking to fill!
                    if (normalizeInstrument(s.instrument) !== normalizeInstrument(inst)) return false;

                    // 2. If the user is already a member of this band, their assigned instrument in band_members MUST also match!
                    const memberRecord = (band.band_members || []).find((m: any) => m.user_id === s.user_id);
                    if (memberRecord) {
                      if (normalizeInstrument(memberRecord.instrument) !== normalizeInstrument(inst)) return false;
                    }

                    // 3. If exclusive, only allow current band members to auto-fill
                    if (bandSong.is_exclusive) {
                      if (!memberRecord) return false;
                    }

                    // Make sure they are not already in the slots of this proposed song
                    const isAlreadyInSlots = slots.some((sl: any) => sl.user_id === s.user_id);
                    if (isAlreadyInSlots) return false;

                    // Make sure they are not active on this song in a DIFFERENT band
                    return !currentMemberships.some((m: any) => m.user_id === s.user_id && m.bands?.id !== band.id && m.bands?.song_id === songData.id);
                  });
                  if (candidate) {
                    // Check if they are already in the band_members table for this band with the correct instrument
                    const isAlreadyMember = (band.band_members || []).some((m: any) => m.user_id === candidate.user_id && normalizeInstrument(m.instrument) === normalizeInstrument(inst));
                    if (!isAlreadyMember) {
                      await supabase.from('band_members').insert({ band_id: band.id, user_id: candidate.user_id, instrument: inst });
                    }
                    await supabase.from('band_song_slots').insert({ band_song_id: bandSong.id, user_id: candidate.user_id, instrument: inst, status: 'joined' });
                    currentMemberships.push({ user_id: candidate.user_id, bands: { id: band.id, song_id: band.song_id } } as any);
                  }
                }
              }
            }
          }
        })();
      }

        const processedWall: any[] = [];
        
        wallData.forEach((song: any) => {
          console.log('[Dashboard] Processing song:', song.title, 'ID:', song.id);
          const instrumentation = song?.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
          const requiredInsts: Record<string, number> = {};
          
          // Normalize instrumentation keys
          Object.entries(instrumentation).forEach(([inst, count]) => {
            const lower = inst.toLowerCase();
            // IMPORTANT: Vocals are NOT considered for the matching/founding process. 
            // They are added later via the Vocal-Finder tool.
            if (lower === 'vocals' || lower === 'gesang') return;

            let key = inst;
            if (lower === 'guitar' || lower === 'e-gitarre') key = 'E-Gitarre';
            else if (lower === 'bass' || lower === 'e-bass') key = 'E-Bass';
            else if (lower === 'drums' || lower === 'e-drums') key = 'E-Drums';
            else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') key = 'E-Piano';
            requiredInsts[key] = Math.max(requiredInsts[key] || 0, count as number);
          });

          
          // Filter to all skills from the same school (practicing or mastered)
          const schoolSkills = (song?.user_song_skills || []);

          // Split by level
          ['starter', 'original'].forEach(level => {
            // CRITICAL: Only include musicians who have mastered the song (100% or stage ready)
            const levelSkills = schoolSkills.filter((s: any) => 
              (s?.difficulty_level || 'original') === level && 
              (s.is_stage_ready || (s.progress_percent || 0) >= 100)
            );
            
            const formationsList: any[] = [];
            const allBandFormations: any[] = [];
            const projectsForThisSongMap = new Map<string, any>();
            // Collect band_songs from formingBands
            (formingBands || []).forEach((b: any) => {
              (b.band_songs || []).forEach((bs: any) => {
                if (bs.song_id === song.id && bs.band_id) {
                  projectsForThisSongMap.set(b.id, {
                    ...bs,
                    bands: b,
                    band_song_slots: bs.band_song_slots || []
                  });
                }
              });
            });

            // Also check forming bands that are currently founding on this song
            (formingBands || []).filter((b: any) => b.song_id === song.id).forEach((b: any) => {
              if (!projectsForThisSongMap.has(b.id)) {
                projectsForThisSongMap.set(b.id, {
                  id: `forming_${b.id}`,
                  band_id: b.id,
                  status: 'forming',
                  bands: b,
                  band_song_slots: []
                });
              }
            });

            const projectsForThisSong = Array.from(projectsForThisSongMap.values());

            projectsForThisSong.forEach((bs: any) => {
              if (bs.status === 'mastered' || bs.status === 'active') return;
              const bsLevel = bs.difficulty_level || 'original';
              if (bsLevel !== level) return;
              
              const band = formingBands.find((b: any) => b.id === bs.band_id) || bs.bands;
              if (!band || band.school_id !== schoolId) return;

              const isUserBandMember = (band.band_members || []).some((m: any) => m.user_id === userId);

              const slots = bs.band_song_slots || [];
              const members: any[] = [];
              const addedUserIds = new Set<string>();
              const addedSlotKeys = new Set<string>();

              // 1. Add participants from slots (guests and suggester)
              slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
                const normalizedMemberInst = normalizeInstrument(sl.instrument);
                
                // Skip core band members in slots unless it's Vocals, so smart allocation handles them
                const coreBand = formingBands.find((b: any) => b.id === bs.band_id) || bs.bands;
                const isCoreMember = (coreBand?.band_members || []).some((bm: any) => bm.user_id === sl.user_id);
                if (isCoreMember && !normalizedMemberInst.includes('vocal') && !normalizedMemberInst.includes('gesang')) {
                  return;
                }

                const slPart = sl.part_number || 1;
                const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
                
                if (addedSlotKeys.has(slotKey)) return;
                addedSlotKeys.add(slotKey);
                addedUserIds.add(sl.user_id);
                
                const prof = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;

                const skills = schoolSkillsMap[sl.user_id] || [];
                const isMastered = skills.some((sk: any) => 
                  sk.song_id === song.id && 
                  normalizeInstrument(sk.instrument) === normalizedMemberInst && 
                  (sk.part_number || 1) === slPart &&
                  (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                );

                members.push({
                  user_id: sl.user_id,
                  first_name: prof?.first_name || 'Musiker',
                  photo_url: prof?.photo_url,
                  instrument: normalizedMemberInst,
                  part_number: slPart,
                  isFromBand: true,
                  isMastered
                });
              });

              // 2. Add core band members who aren't in slots yet
              const coreBand = formingBands.find((b: any) => b.id === bs.band_id);
              const instCount: Record<string, number> = {};
              members.forEach((m: any) => {
                instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
              });

              (coreBand?.band_members || []).forEach((bm: any) => {
                if (addedUserIds.has(bm.user_id)) return;
                
                const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
                const normalizedMemberInst = normalizeInstrument(bm.instrument);
                const skills = schoolSkillsMap[bm.user_id] || [];
                
                const requiredInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
                let targetInstrument = normalizedMemberInst;
                
                const isInstSlotFilled = (instName: string) => {
                  const normTarget = normalizeInstrument(instName);
                  const matchingKey = Object.keys(requiredInsts).find(k => normalizeInstrument(k) === normTarget);
                  const countRequired = matchingKey ? requiredInsts[matchingKey] : 0;
                  const countFilled = members.filter((m: any) => normalizeInstrument(m.instrument) === normTarget).length;
                  return countFilled >= countRequired;
                };

                const coreInstRequired = Object.keys(requiredInsts).some(ri => normalizeInstrument(ri) === normalizedMemberInst);
                const coreInstFilled = isInstSlotFilled(bm.instrument);

                if (coreInstRequired && !coreInstFilled) {
                  targetInstrument = normalizedMemberInst;
                } else {
                  const alternativeInst = Object.keys(requiredInsts).find(ri => {
                    const normRi = normalizeInstrument(ri);
                    if (isInstSlotFilled(ri)) return false;
                    return skills.some((sk: any) => 
                      sk.song_id === song.id && 
                      normalizeInstrument(sk.instrument) === normRi && 
                      (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                    );
                  });
                  if (alternativeInst) {
                    targetInstrument = normalizeInstrument(alternativeInst);
                  }
                }

                addedUserIds.add(bm.user_id);

                if (prof) {
                  const nextPart = (instCount[targetInstrument] || 0) + 1;
                  instCount[targetInstrument] = nextPart;

                  const isMastered = skills.some((sk: any) => 
                    sk.song_id === song.id && 
                    normalizeInstrument(sk.instrument) === targetInstrument && 
                    (sk.part_number || 1) === nextPart &&
                    (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                  );

                  members.push({
                    user_id: bm.user_id,
                    first_name: prof.first_name || 'Musiker',
                    photo_url: prof.photo_url,
                    instrument: targetInstrument,
                    part_number: nextPart,
                    isFromBand: true,
                    isMastered
                  });
                }
              });

              const requiredInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
              const totalRequired = Object.entries(requiredInsts).reduce((acc, [inst, count]) => {
                const low = inst.toLowerCase();
                if (low.includes('vocals') || low.includes('gesang')) return acc;
                return acc + (count as number);
              }, 0);

              const instrumentalists = members.filter((m: any) => {
                const low = (m.instrument || '').toLowerCase();
                return !low.includes('vocals') && !low.includes('gesang');
              }).length;

              const formationObj = {
                id: `band_${bs.id}`,
                originBand: band,
                bandSongId: bs.id,
                band_song_slots: bs.band_song_slots || [],
                song_id: song.id,
                status: bs.status,
                members,
                memberMap: members.reduce((acc: any, m: any) => ({ ...acc, [`${m.instrument}_${m.part_number}`]: m }), {}),
                level
              };

              allBandFormations.push(formationObj);

              if (instrumentalists >= totalRequired) {
                if (!(bs.status === 'proposal' && isUserBandMember)) {
                  return;
                }
              }

              formationsList.push(formationObj);
            });


            // Filter out musicians who are already in a band project for THIS EXACT INSTRUMENT
            const availableMusicians = levelSkills.filter((skill: any) => {
              const normInst = normalizeInstrument(skill.instrument);
              
              // 1. Check if they are in ANY band project for this song ON THIS INSTRUMENT
              const inBandOnThisInst = allBandFormations.some(f => 
                f.members.some((m: any) => m.user_id === skill.user_id && m.instrument === normInst)
              );
              if (inBandOnThisInst) return false;

              // 2. Check existing "solo" formations (already in list)
              const isTaken = formationsList.some(f => 
                f.members.some((m: any) => m.user_id === skill.user_id && m.instrument === normInst)
              );
              return !isTaken;
            }).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

            if (levelSkills.length > 0) {
              console.log(`[Matching] Song: ${song.title}, Level: ${level}, Mastered pool: ${levelSkills.length}, Available: ${availableMusicians.length}`);
            }

            // 1. Explicit groups
            availableMusicians.filter((s: any) => s.formation_group).forEach((skill: any) => {
              const prof = Array.isArray(skill.profiles) ? skill.profiles[0] : skill.profiles;
              if (!prof) return;

              const normalizedMemberInst = normalizeInstrument(skill.instrument);

              let form = formationsList.find(f => f.id === skill.formation_group);
              if (!form) {
                form = { id: skill.formation_group, members: [], memberMap: {}, level };
                formationsList.push(form);
              }
              
              const currentCount = form.members.filter((m: any) => m.instrument === normalizedMemberInst).length;
              const nextPart = skill.part_number || (currentCount + 1);

              const memberObj = {
                user_id: skill.user_id,
                skill_id: skill.id,
                first_name: prof?.first_name || 'Musiker',
                photo_url: prof?.photo_url,
                instrument: normalizedMemberInst,
                part_number: nextPart,
                created_at: skill.created_at,
                isMastered: true
              };
              form.members.push(memberObj);
              form.memberMap[`${normalizedMemberInst}_${nextPart}`] = memberObj;
            });

            // 2. Automatic groups
            availableMusicians.filter((s: any) => !s.formation_group).forEach((skill: any) => {
              const prof = Array.isArray(skill.profiles) ? skill.profiles[0] : skill.profiles;
              if (!prof) return;

              const normalizedMemberInst = normalizeInstrument(skill.instrument);
              
              let form = formationsList.find(f => {
                if (f.originBand) return false; // DO NOT automatically match pool players to active band projects in memory!
                const userAlreadyIn = f.members.some((m: any) => {
                  const mNorm = normalizeInstrument(m.instrument);
                  const isVocals = normalizedMemberInst.toLowerCase().includes('vocal') || normalizedMemberInst.toLowerCase().includes('gesang');
                  const mIsVocals = mNorm.toLowerCase().includes('vocal') || mNorm.toLowerCase().includes('gesang');
                  if (isVocals || mIsVocals) return false;
                  return m.user_id === skill.user_id;
                });
                if (userAlreadyIn) return false;
                const currentCount = f.members.filter((m: any) => m.instrument === normalizedMemberInst).length;
                const requiredCount = song.instrumentation?.[normalizedMemberInst] || song.instrumentation?.[skill.instrument] || 0;
                return currentCount < requiredCount;
              });

              if (!form) {
                form = { id: `auto_${song.id}_${level}_${formationsList.length}`, members: [], memberMap: {}, level };
                formationsList.push(form);
              }

              const currentCount = form.members.filter((m: any) => m.instrument === normalizedMemberInst).length;
              const nextPart = skill.part_number || (currentCount + 1);

              const memberObj = {
                user_id: skill.user_id,
                skill_id: skill.id,
                first_name: prof?.first_name || 'Musiker',
                photo_url: prof?.photo_url,
                instrument: normalizedMemberInst,
                part_number: nextPart,
                created_at: skill.created_at,
                isMastered: true
              };
              form.members.push(memberObj);
              form.memberMap[`${normalizedMemberInst}_${nextPart}`] = memberObj;
            });

            // 3. Fallback: Only show if there is actually at least one unmatched mastered musician!
            if (formationsList.length === 0 && availableMusicians.length > 0) {
              formationsList.push({ id: `first_slot_${song.id}_${level}`, members: [], memberMap: {}, isInitial: true, level });
            }
            
            const levelFormations = formationsList.map(form => {
              const isComplete = Object.keys(requiredInsts).every(inst => {
                const lower = inst.toLowerCase();
                if (lower.includes('vocals') || lower.includes('gesang')) return true;
                const needed = requiredInsts[inst] || 0;
                if (needed === 0) return true;
                
                const normTarget = normalizeInstrument(inst);
                const matchingCount = form.members.filter((m: any) => {
                  return normalizeInstrument(m.instrument) === normTarget;
                }).length;
                
                return matchingCount >= needed;
              });
              return { ...form, isComplete };
            });

            if (levelFormations.length > 0) {
              const uniqueId = `${song.id}_${level}`;
              // Avoid duplicates
              if (!processedWall.some(w => w.id === uniqueId)) {
                processedWall.push({
                  id: uniqueId,
                  song_id: song.id,
                  artist: song.artist || 'Unbekannter Künstler',
                  title: song.title || 'Unbekannter Titel',
                  media_link: song.media_link,
                  instrumentation: requiredInsts,
                  formations: levelFormations,
                  level: level
                });
              }
            }
          });
        });

        // --- FINAL FILTERING: Keep all formations until founded ---
        const filteredWall = processedWall.filter((ws: any) => ws.formations.length > 0);

        console.log('[Dashboard] Setting processedWall. Final count:', filteredWall.length);
        console.log('[Dashboard] Processed IDs:', filteredWall.map(w => w.id));
      setWallSongs(filteredWall);
      console.log('[Dashboard] fetchDashboardData complete.');


      // Library songs and user bands are already loaded in Stage 2!
      const userBandsData = userBandsRes?.data || [];
      if (userBandsData) {
        const uniqueBands = userBandsData.map((band: any) => {
          const myMembership = (band.band_members || []).find((m: any) => m.user_id === userId);
          
          // Enrich all members with skills from schoolSkillsMap
          (band.band_members || []).forEach((m: any) => {
             const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
             if (u) {
                u.user_song_skills = schoolSkillsMap[u.id] || [];
             }
          });

          return {
            ...band,
            myInstrument: myMembership?.instrument,
            myMemberId: myMembership?.id,
            confetti_seen: !!myMembership?.confetti_seen
          };
        });
        setUserBands(uniqueBands);
        
        // If a band profile is currently open, update its data too
        if (selectedBandForProfile) {
          const updatedSelected = uniqueBands.find((b: any) => b.id === selectedBandForProfile.id);
          if (updatedSelected) {
            setSelectedBandForProfile(updatedSelected);
          }
        } else if (restoredBandId && showBandProfile) {
          // Restore from localStorage on initial load
          const restored = uniqueBands.find((b: any) => b.id === restoredBandId);
          if (restored) {
            setSelectedBandForProfile(restored);
          }
        }
        
        const unseen = userBandsData.find((b: any) => {
          const m = (b.band_members || []).find((m: any) => m.user_id === userId);
          return m && !m.confetti_seen;
        });
        if (unseen) {
          const m = (unseen.band_members || []).find((m: any) => m.user_id === userId);
          setShowConfetti({ id: m.id, bands: unseen });
        }
      }

      // School bands and teachers are already loaded in Stage 2!
      if (bandsData && bandsData.length > 0) {
        const realBands = bandsData.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
        setAllBands(realBands);

        // Couple all coached and student bands for teachers/coaches
        if (userData?.role === 'teacher' || userData?.role === 'admin' || userData?.role === 'secretary') {
          const teacherCoachedBands = realBands.filter((band: any) => {
            const isCoach = band.coach_id === userId || (band.coach && band.coach.id === userId);
            const isMember = (band.band_members || []).some((m: any) => m.user_id === userId);
            const hasMyStudent = (band.band_members || []).some((m: any) => {
              const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
              return u && u.teacher_id === userId;
            });
            return isCoach || isMember || hasMyStudent;
          });

          setUserBands(teacherCoachedBands);
        }

        // Fallback: If selectedBandForProfile wasn't found in uniqueBands (e.g. teacher viewing student band)
        // try to restore it from all bands.
        if (selectedBandForProfile) {
          setSelectedBandForProfile((prev: any) => {
            const foundInAll = bandsData.find((b: any) => b.id === prev?.id);
            return foundInAll || prev;
          });
        } else if (restoredBandId && showBandProfile) {
          const restoredFromAll = bandsData.find((b: any) => b.id === restoredBandId);
          if (restoredFromAll) {
            setSelectedBandForProfile(restoredFromAll);
          }
        }
      }

      // Lade die Wochenplan-Daten (mit kleiner Verzögerung für State-Stabilität)
      setTimeout(() => {
        fetchPlanningData(userData.school_id, userId);
      }, 100);

      // Activity Chart Data (Letzte 7 Tage)
      const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = days[d.getDay()];
        const mins = (allSessionsRes.data || [])
          .filter((s: any) => new Date(s.check_in_time).toDateString() === d.toDateString())
          .reduce((acc: number, s: any) => {
            const start = new Date(s.check_in_time);
            const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
            return acc + Math.floor((end.getTime() - start.getTime()) / 60000);
          }, 0);
        last7.push({ day: dayStr, mins });
      }
      setStudentActivity(last7);


      // Fetch school users strictly belonging to current schoolId (enforce multi-tenant isolation)
      const [uResExact, uResSchool] = await Promise.all([
        supabase.from('users').select('*').eq('school_id', schoolId).eq('role', 'student').order('first_name'),
        supabase.from('users').select('*').eq('school_id', schoolId).order('first_name')
      ]);
      const mergedUsersMap = new Map<string, any>();
      (uResExact.data || []).forEach(u => mergedUsersMap.set(u.id, u));
      (uResSchool.data || []).forEach(u => mergedUsersMap.set(u.id, u));
      const allUsers = Array.from(mergedUsersMap.values());
      if (typeof window !== 'undefined') {
        (window as any).debugAllUsersLength = allUsers?.length;
      }
      if (allUsers.length > 0) {
        setSchoolUsers(allUsers);
      }

      checkAnnouncements(schoolId, userData);
      if (userData.role !== 'student') {
        fetchAnnouncements(schoolId);
      } else {
        fetchStudentMessagesBackground(schoolId, userId, bandIds);
      }

      // Fetch Campus Direct Messages
      fetchCampusMessages();

    } catch (error: any) {
      console.error('[Dashboard] UNCAUGHT ERROR in fetchDashboardData:', error);
      if (typeof window !== 'undefined') {
        (window as any).fetchDashboardDataError = error?.message || String(error);
        (window as any).fetchDashboardDataStack = error?.stack || '';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveBand = async (bandId: string) => {
    if (!user) return;
    if (!window.confirm('Möchtest du diese Band wirklich verlassen? Dein Platz wird für andere Musiker freigegeben.')) return;

    try {
      setLoading(true);
      // 1. Remove from band_members
      const { error: err1 } = await supabase.from('band_members').delete().eq('band_id', bandId).eq('user_id', user.id);
      if (err1) throw err1;

      // 2. Remove from band_song_slots for all songs in this band
      const { data: bandSongs, error: errSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (errSongs) throw errSongs;

      if (bandSongs && bandSongs.length > 0) {
        const songIds = bandSongs.map(s => s.id);
        const { error: err2 } = await supabase.from('band_song_slots').delete().in('band_song_id', songIds).eq('user_id', user.id);
        if (err2) throw err2;
      }

      await fetchDashboardData(user.id);
      alert('Du hast die Band verlassen.');
    } catch (err) {
      console.error('Error leaving band:', err);
      alert('Fehler beim Verlassen der Band.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanningData = async (schoolId: string, userIdArg?: string) => {
    const currentUserId = userIdArg || loggedInUserId || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null);
    console.log(`[Planning] Fetching for School: ${schoolId}, User: ${currentUserId}`);
    if (!currentUserId || !schoolId) {
      console.warn('[Planning] Missing userId or schoolId', { currentUserId, schoolId });
      return;
    }
    
    try {
      // 1. Hole alle Planungs-Einträge der Schule
      const { data: planningData, error: planningError } = await supabase
        .from('lab_planning')
        .select('*')
        .eq('school_id', schoolId);
      
      console.log(`[Planning] DB Result:`, { count: planningData?.length, error: planningError });
        
      if (planningError) {
        console.error('[Planning] Fetch Error:', planningError);
        return;
      }

      // 2. Hole alle Profile der Schule für den in-memory Join
      const { data: profilesData, error: profilesError } = await supabase
        .from('users')
        .select('id, first_name, role')
        .eq('school_id', schoolId);

      if (profilesError) {
        console.error('[Planning] Profiles Fetch Error:', profilesError);
      }

      if (planningData) {
        const profilesMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }

        const enrichedPlanningData = planningData.map((item: any) => ({
          ...item,
          profiles: profilesMap[item.user_id] || null
        }));

        setGlobalPlannedSlots(enrichedPlanningData);
        const mySlots = enrichedPlanningData.filter((s: any) => s.user_id === currentUserId).map((s: any) => `${s.day}-${s.time}`);
        setPlannedSlots(mySlots);
      }
    } catch (err) {
      console.error('[Planning] Unexpected error:', err);
    }
  };

  useEffect(() => {
    let schoolId = user?.school_id;
    if (!schoolId && user?.schools) {
      schoolId = Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id;
    }
    if (schoolId && loggedInUserId) {
      fetchPlanningData(schoolId, loggedInUserId);
    }
  }, [activeStudentTab, loggedInUserId, user]);

  const toggleSlot = async (day: string, time: string) => {
    if (!loggedInUserId) {
      console.error('[Planning] Kein loggedInUserId gefunden.');
      return;
    }
    
    // Attempt to find schoolId from multiple sources
    let schoolId = user?.school_id;
    if (!schoolId && user?.schools) {
      schoolId = Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id;
    }
    
    console.log(`[Planning] Toggle attempt for ${day}-${time}. SchoolId: ${schoolId}, UserId: ${loggedInUserId}`);
    if (!schoolId) {
      console.warn('[Planning] Keine School ID gefunden, breche ab.');
      return;
    }

    const key = `${day}-${time}`;
    const isPlanned = plannedSlots.includes(key);
    console.log(`[Planning] Toggle: ${key} (Current status: ${isPlanned ? 'planned' : 'not planned'})`);
    
    // Optimistic Update
    const newPlanned = isPlanned 
      ? plannedSlots.filter(s => s !== key) 
      : [...plannedSlots, key];
    setPlannedSlots(newPlanned);

    try {
      let result;
      if (isPlanned) {
        result = await supabase.from('lab_planning')
          .delete()
          .eq('user_id', loggedInUserId)
          .eq('day', day)
          .eq('time', time);
      } else {
        result = await supabase.from('lab_planning').insert({
          user_id: loggedInUserId,
          school_id: schoolId,
          day,
          time
        });
      }
      
      if (result.error) {
        console.error('[Planning] Datenbank-Fehler:', result.error.message, result.error);
        await fetchPlanningData(schoolId, loggedInUserId);
      } else {
        console.log('[Planning] Datenbank-Erfolg:', isPlanned ? 'Deleted' : 'Inserted');
        await fetchPlanningData(schoolId, loggedInUserId);
      }
    } catch (err) {
      console.error('[Planning] Kritischer Fehler beim Toggeln:', err);
      await fetchPlanningData(schoolId);
    }
  };

  const checkAnnouncements = async (schoolId: string, currentUser: any) => {
    if (!schoolId || !currentUser) return;
    try {
      const { data: annBands } = await supabase
        .from('bands')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
        
      if (!annBands || annBands.length === 0) return;
      const bandIds = annBands.map(b => b.id);
      
      const { data: messages } = await supabase
        .from('band_shoutbox')
        .select('*, users(first_name, last_name, photo_url)')
        .in('band_id', bandIds)
        .order('created_at', { ascending: false });
        
      if (!messages || messages.length === 0) return;
      
      const unread = messages.find((msg: any) => {
        let parsed;
        try {
          parsed = JSON.parse(msg.content);
        } catch (e) {
          parsed = {
            title: 'Wichtige Mitteilung',
            target_type: 'all',
            target_user_ids: [],
            message: msg.content
          };
        }
        
        let targetsUser = false;
        if (parsed.target_type === 'all') targetsUser = true;
        else if (parsed.target_type === 'students' && currentUser.role === 'student') targetsUser = true;
        else if (parsed.target_type === 'teachers' && (currentUser.role === 'teacher' || currentUser.role === 'admin')) targetsUser = true;
        else if (parsed.target_type === 'specific' && parsed.target_user_ids?.includes(currentUser.id)) targetsUser = true;
        
        if (!targetsUser) return false;
        
        const hasRead = msg.read_by && msg.read_by.includes(currentUser.id);
        return !hasRead;
      });
      
      if (unread) {
        setActiveAnnouncement(unread);
      }
    } catch (err) {
      console.error('Error checking announcements:', err);
    }
  };

  const fetchAnnouncements = async (schoolId: string) => {
    if (!schoolId) return;
    try {
      const { data: annBands } = await supabase
        .from('bands')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
        
      let bandIds: string[] = [];
      if (!annBands || annBands.length === 0) {
        const { data: newBand, error: insertErr } = await supabase
          .from('bands')
          .insert({
            name: '__SYSTEM_ANNOUNCEMENTS__',
            status: 'active',
            school_id: schoolId,
            coach_id: null,
            genre: 'System',
            photo_url: '/logo.png'
          })
          .select();
        if (insertErr) {
          console.error('[fetchAnnouncements] Error inserting band:', insertErr);
        }
        if (newBand && newBand[0]) {
          bandIds = [newBand[0].id];
          setAnnBandId(newBand[0].id);
        }
      } else {
        bandIds = annBands.map(b => b.id);
        setAnnBandId(annBands[0].id);
      }
      
      if (bandIds.length === 0) return;
      
      const { data: messages } = await supabase
        .from('band_shoutbox')
        .select('*, users(first_name, last_name, photo_url)')
        .in('band_id', bandIds)
        .order('created_at', { ascending: false });
        
      if (messages) {
        setAnnouncements(messages);
      }
    } catch (err) {
      console.error('[Announcements] Error fetching history:', err);
    }
  };

  const fetchStudentMessagesBackground = async (schoolId: string, userId: string, bandIds: string[]) => {
    try {
      // 1. Fetch school announcements
      const { data: annBands } = await supabase
        .from('bands')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
      
      let schoolMessages: any[] = [];
      if (annBands && annBands.length > 0) {
        const { data } = await supabase
          .from('band_shoutbox')
          .select('*, users(first_name, last_name, role, photo_url)')
          .in('band_id', annBands.map(b => b.id))
          .order('created_at', { ascending: false });
        if (data) schoolMessages = data;
      }

      // 2. Fetch band shoutbox messages
      let bandMessages: any[] = [];
      if (bandIds && bandIds.length > 0) {
        const { data } = await supabase
          .from('band_shoutbox')
          .select('*, users(first_name, last_name, role, photo_url), bands(id, name)')
          .in('band_id', bandIds)
          .order('created_at', { ascending: false });
        if (data) bandMessages = data;
      }

      // 3. Process school
      const processedSchool = schoolMessages.map(msg => {
        let parsed;
        try {
          parsed = JSON.parse(msg.content);
        } catch (e) {
          parsed = {
            title: 'Wichtige Mitteilung',
            target_type: 'all',
            target_user_ids: [],
            message: msg.content
          };
        }
        
        let targetsUser = false;
        if (parsed.target_type === 'all') targetsUser = true;
        else if (parsed.target_type === 'students') targetsUser = true;
        else if (parsed.target_type === 'specific' && parsed.target_user_ids?.includes(userId)) targetsUser = true;
        
        if (!targetsUser) return null;
        
        return {
          id: msg.id,
          type: 'school',
          title: parsed.title || 'Wichtige Mitteilung',
          content: parsed.message || '',
          sender: msg.users || { first_name: 'Academy', last_name: 'Coach', photo_url: '/logo.png' },
          created_at: msg.created_at,
          read_by: msg.read_by || []
        };
      }).filter(Boolean);

      // 4. Process band
      const processedBand = bandMessages.map(msg => {
        return {
          id: msg.id,
          type: 'band',
          title: `Neuigkeiten aus ${msg.bands?.name || 'deiner Band'}`,
          content: msg.content || '',
          sender: msg.users || { first_name: 'Mitglied', last_name: '', photo_url: '/avatar_ghost.jpg' },
          created_at: msg.created_at,
          read_by: msg.read_by || [],
          bandName: msg.bands?.name
        };
      });

      const combined = [...processedSchool, ...processedBand].filter(Boolean).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setStudentMessages(combined);
    } catch (err) {
      console.error('[StudentMessagesBackground] Error:', err);
    }
  };

  const fetchStudentMessages = async () => {
    if (!user || user.role !== 'student' || !user.school_id) return;
    setStudentMessagesLoading(true);
    const bandIds = userBands.map(b => b.id);
    await fetchStudentMessagesBackground(user.school_id, user.id, bandIds);
    setStudentMessagesLoading(false);
  };

  const fetchCampusMessages = React.useCallback(async () => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid) return;
    setCampusMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('*')
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setCampusMessages(data);
        const unread = data.filter((m: any) => m.recipient_id === uid && !m.is_read).length;
        setCampusUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching campus messages:', err);
    } finally {
      setCampusMessagesLoading(false);
    }
  }, [user?.id]);

  const handleSendCampusMessage = async (recipientId: string, content: string) => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid) return;
    try {
      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: uid,
        recipient_id: recipientId,
        content
      });
      if (error) throw error;

      // Group lesson message replication: Check if recipient has a group_id
      try {
        let recipientGroupId: string | null = null;
        const { data: recUser } = await supabase.from('users').select('group_id').eq('id', recipientId).maybeSingle();
        if (recUser?.group_id) recipientGroupId = recUser.group_id;
        else {
          const { data: recPending } = await supabase.from('pending_students_decrypted').select('group_id').eq('id', recipientId).maybeSingle();
          if (recPending?.group_id) recipientGroupId = recPending.group_id;
        }

        if (recipientGroupId) {
          const { data: groupUsers } = await supabase.from('users').select('id').eq('group_id', recipientGroupId).neq('id', recipientId);
          const { data: groupPending } = await supabase.from('pending_students_decrypted').select('id').eq('group_id', recipientGroupId).neq('id', recipientId);
          
          const partnerIds = new Set<string>();
          (groupUsers || []).forEach((u: any) => { if (u?.id && u.id !== uid) partnerIds.add(u.id); });
          (groupPending || []).forEach((p: any) => { if (p?.id && p.id !== uid) partnerIds.add(p.id); });

          for (const partnerId of Array.from(partnerIds)) {
            await supabase.from('campus_direct_messages').insert({
              sender_id: uid,
              recipient_id: partnerId,
              content
            });
          }
        }
      } catch (grpErr) {
        console.error('Error replicating group lesson message:', grpErr);
      }

      fetchCampusMessages();
    } catch (err) {
      console.error('Error sending campus message:', err);
    }
  };

  const handleMarkCampusMessagesAsRead = async (senderId: string) => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid) return;
    try {
      const { error } = await supabase
        .from('campus_direct_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('recipient_id', uid);
      if (error) throw error;
      fetchCampusMessages();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const handleAcknowledgeStudentMessage = async (msgOrId: any) => {
    if (!user) return;
    const msgId = typeof msgOrId === 'string' ? msgOrId : msgOrId?.id;
    if (!msgId) return;
    
    // Optimistic update of local states in studentMessages and announcements
    setStudentMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const rBy = m.read_by || [];
      return rBy.includes(user.id) ? m : { ...m, read_by: [...rBy, user.id] };
    }));
    
    setAnnouncements(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const rBy = m.read_by || [];
      return rBy.includes(user.id) ? m : { ...m, read_by: [...rBy, user.id] };
    }));
    
    setSelectedStudentMessage((prev: any) => {
      if (!prev || prev.id !== msgId) return prev;
      const rBy = prev.read_by || [];
      return rBy.includes(user.id) ? prev : { ...prev, read_by: [...rBy, user.id] };
    });
    
    try {
      const { data: current } = await supabase
        .from('band_shoutbox')
        .select('read_by')
        .eq('id', msgId)
        .maybeSingle();

      const existingReadBy = Array.isArray(current?.read_by) ? current.read_by : [];
      if (!existingReadBy.includes(user.id)) {
        await supabase
          .from('band_shoutbox')
          .update({ read_by: [...existingReadBy, user.id] })
          .eq('id', msgId);
      }
    } catch (err) {
      console.error('Error acknowledging student message:', err);
    }
  };

  const handleDeleteMessageForSelf = (msgId: string) => {
    if (!user) return;
    if (!window.confirm('Möchtest du diese Nachricht wirklich für dich aus deiner Mailbox löschen?')) return;
    
    const newDeleted = [...deletedMessageIds, msgId];
    setDeletedMessageIds(newDeleted);
    localStorage.setItem(`groovelab_deleted_messages_${user.id}`, JSON.stringify(newDeleted));
    
    // Auto-select the next or first available message after deletion
    const remaining = studentMessages.filter(m => {
      if (newDeleted.includes(m.id)) return false;
      if (studentMessagesFilter === 'school') return m.type === 'school';
      if (studentMessagesFilter === 'band') return m.type === 'band';
      return true;
    });
    
    setSelectedStudentMessage(remaining.length > 0 ? remaining[0] : null);
  };

  const handleAcknowledgeAnnouncement = async (msg: any) => {
    if (!user) return;
    const currentReadBy = msg.read_by || [];
    if (currentReadBy.includes(user.id)) {
      setActiveAnnouncement(null);
      return;
    }
    const newReadBy = [...currentReadBy, user.id];
    
    setActiveAnnouncement(null);
    
    try {
      await supabase
        .from('band_shoutbox')
        .update({ read_by: newReadBy })
        .eq('id', msg.id);
    } catch (err) {
      console.error('Error acknowledging announcement:', err);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!user || !user.school_id) return;
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      throw new Error('Bitte Betreff und Nachricht ausfüllen.');
    }
    
    setLoading(true);
    try {
      let bandId = annBandId;
      if (!bandId) {
        const { data: annBands } = await supabase
          .from('bands')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
          
        if (!annBands || annBands.length === 0) {
          const { data: newBand, error: insertErr } = await supabase
            .from('bands')
            .insert({
              name: '__SYSTEM_ANNOUNCEMENTS__',
              status: 'active',
              school_id: user.school_id,
              coach_id: null,
              genre: 'System',
              photo_url: '/logo.png'
            })
            .select();
          if (insertErr) {
            console.error('[handlePostAnnouncement] Error inserting band:', insertErr);
          }
          if (newBand && newBand[0]) {
            bandId = newBand[0].id;
            setAnnBandId(bandId);
          }
        } else {
          bandId = annBands[0].id;
          setAnnBandId(annBands[0].id);
        }
      }
      
      if (!bandId) {
        throw new Error('Fehler beim Erstellen der System-Band.');
      }
      
      const payload = {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        target_type: announcementTarget,
        target_user_ids: announcementTarget === 'specific' ? selectedTargetUserIds : []
      };
      
      const { error } = await supabase.from('band_shoutbox').insert({
        band_id: bandId,
        user_id: user.id,
        content: JSON.stringify(payload),
        read_by: [user.id]
      });
      
      if (error) {
        throw new Error('Fehler beim Senden: ' + error.message);
      } else {
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setAnnouncementTarget('all');
        setSelectedTargetUserIds([]);
        setRecipientSearchText('');
        
        await fetchAnnouncements(user.school_id);
      }
    } catch (err: any) {
      console.error('[Announcements] Error posting:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (msgId: string) => {
    if (!window.confirm('Möchtest du diese Mitteilung wirklich unwiderruflich löschen? Sie wird dann für alle Empfänger entfernt.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('band_shoutbox').delete().eq('id', msgId);
      if (error) {
        alert('Fehler beim Löschen: ' + error.message);
      } else {
        if (user?.school_id) {
          await fetchAnnouncements(user.school_id);
        }
      }
    } catch (err: any) {
      console.error('[Announcements] Error deleting:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpRequest = async () => {
    if (!session?.station_id || !loggedInUserId) return;
    
    const sId = user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id);
    
    // Optimistic UI: Show success toast immediately
    setToastMessage({ text: 'Hilfe wurde angefordert. Der Lehrer sieht deinen Tisch im Dashboard.', type: 'success' });
    
    // Perform insert in background
    supabase
      .from('help_requests')
      .insert({
        user_id: loggedInUserId,
        station_id: session.station_id,
        school_id: sId,
        status: 'pending'
      })
      .then(({ error }) => {
        if (error) {
          setToastMessage({ text: 'Fehler beim Senden: ' + error.message, type: 'error' });
        }
      });
  };

  const updateProgress = async (skillId: string, newProgress: number, meta?: { songId: string, instrument: string, difficulty: string, partNumber?: number }) => {
    lastWriteTimeRef.current = Date.now();

    // 1. Resolve slot metadata with absolute certainty
    let songId = '';
    let instrument = '';
    let difficulty = 'starter';
    let partNumber = 1;

    if (meta) {
      songId = meta.songId;
      instrument = meta.instrument;
      difficulty = meta.difficulty;
      partNumber = meta.partNumber || 1;
    }

    if (!songId || !instrument || !user) {
      console.warn('[Dashboard] Cannot update progress: Missing songId, instrument or user context.', { skillId, meta });
      return;
    }

    const songInfo = (globalSongs || []).find((s: any) => s.id === songId) || {};

    // 2. Perform concurrent-safe, optimistic UI update inside functional state updater
    setUserSongs(prev => {
      // Find slot in local state by matching natural keys, avoiding UUID mismatches
      const existing = prev.find(s => 
        s.song_id === songId && 
        (s.instrument || '').toLowerCase() === instrument.toLowerCase() && 
        (s.part_number || 1) === partNumber &&
        s.difficulty_level === difficulty
      );

      const isLocked = existing ? !!existing.locked : true;
      const clamped = isLocked ? Math.min(newProgress, 90) : newProgress;

      // Construct the updated/optimistic skill state
      const updatedSkill = existing ? {
        ...existing,
        progress: clamped
      } : {
        id: skillId,
        user_id: user.id,
        song_id: songId,
        instrument: instrument,
        difficulty_level: difficulty,
        part_number: partNumber,
        progress: clamped,
        is_stage_ready: false,
        is_pending_approval: false,
        title: songInfo.title || 'Unbenannter Song',
        artist: songInfo.artist || 'Unbekannter Künstler',
        media_link: songInfo.media_link,
        tomplay_url: songInfo.tomplay_url,
        instrumentation: songInfo.instrumentation
      };

      // 3. Trigger unified, bulletproof DB UPSERT in the background
      supabase
        .from('user_song_skills')
        .upsert({
          user_id: user.id,
          song_id: songId,
          instrument: instrument,
          difficulty_level: difficulty,
          part_number: partNumber,
          progress_percent: clamped,
          is_stage_ready: existing ? !!existing.is_stage_ready : false
        }, {
          onConflict: 'user_id,song_id,instrument,difficulty_level,part_number'
        })
        .select()
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const realSkill = {
              ...data[0],
              progress: data[0].is_stage_ready ? 100 : Math.min(90, data[0].progress_percent || 0),
              title: songInfo.title || 'Unbenannter Song',
              artist: songInfo.artist || 'Unbekannter Künstler',
              media_link: songInfo.media_link,
              tomplay_url: songInfo.tomplay_url,
              instrumentation: songInfo.instrumentation
            };
            
            // Atomically replace local state with database row by matching natural keys
            setUserSongs(current => current.map(s => 
              (s.song_id === songId && 
               (s.instrument || '').toLowerCase() === instrument.toLowerCase() && 
               (s.part_number || 1) === partNumber &&
               s.difficulty_level === difficulty) ? realSkill : s
            ));
          } else if (error) {
            console.error('[Dashboard] Error saving skill progress:', error);
          }
        });

      // Update state locally
      if (existing) {
        return prev.map(s => s.id === existing.id ? updatedSkill : s);
      } else {
        return [...prev, updatedSkill];
      }
    });
  };


  const handleFinalizeBandName = async () => {
    if (!pendingFounding || !foundingName.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bands')
        .update({ name: foundingName.trim() })
        .eq('id', pendingFounding.id);
      
      if (error) throw error;
      
      localStorage.setItem(`groovelab_announcement_${user.id}_${pendingFounding.id}`, 'true');
      setShowFoundingModal(false);
      setFoundingName('');
      fetchDashboardData(user.id);
    } catch (err: any) {
      alert('Fehler beim Speichern des Bandnamens: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFoundBand = async (songToFound?: any) => {
    if (loading) return;
    const target = songToFound || pendingFounding;
    if (!target || !user) return;
    try {
      setLoading(true);
      const groupID = target.formation_group;
      
      console.log('[Founding] Founding Artist Gateway for:', target.title || target.songs?.title);
      
      // 1. Determine members and coach BEFORE creating the band record
      let formationMembers: any[] = [];
      let calculatedCoachId = selectedCoachId || null;

      // Self-healing: if an inconsistent/empty band exists for this group from a previous failed attempt, delete it.
      // If a valid band exists, open the celebration gateway for it!
      if (groupID) {
        const { data: existingGroupBand } = await supabase
          .from('bands')
          .select('id, band_members(id)')
          .eq('formation_group', groupID)
          .maybeSingle();

        if (existingGroupBand && (!existingGroupBand.band_members || existingGroupBand.band_members.length === 0)) {
          console.log('[Founding] Found empty/inconsistent band from a previous failed attempt. Deleting it to self-heal.');
          await supabase.from('bands').delete().eq('id', existingGroupBand.id);
        } else if (existingGroupBand) {
          console.log('[Founding] Valid band already exists for this group. Opening existing gateway.');
          setPendingFounding(null);
          console.log('[DEBUG-Groovelab] setSuggestingSkill(null) in handleFoundBand (existing group)');
          setSuggestingSkill(null);
          setSelectedCoachId('');
          
          const { data: fullBand } = await supabase
            .from('bands')
            .select('*, band_songs(*, songs(*)), band_members(*, users!user_id(*)), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))')
            .eq('id', existingGroupBand.id)
            .single();

          if (fullBand) {
            setSelectedBandForGateway(fullBand);
          }
          
          await fetchDashboardData(user.id, false);
          return;
        }
      }

      if (groupID) {
        console.log('[Founding] Pre-fetching members for group:', groupID);
        const { data: groupData } = await supabase
          .from('user_song_skills')
          .select('id, user_id, instrument, verified_by_id, created_at, profiles:users(first_name, photo_url)')
          .eq('formation_group', groupID);
          
        if (groupData && groupData.length > 0) {
           // The active user founding the band is the designated leader.
           const actualLeaderId = user.id;

          formationMembers = groupData.map((d: any) => ({
            id: d.id,
            skill_id: d.id,
            user_id: d.user_id,
            instrument: d.instrument,
            first_name: d.profiles?.first_name || 'Musiker',
            photo_url: d.profiles?.photo_url,
            verified_by_id: d.verified_by_id
          }));

          if (!calculatedCoachId) {
            const coachCounts: Record<string, number> = {};
            formationMembers.forEach(m => {
              if (m.verified_by_id) coachCounts[m.verified_by_id] = (coachCounts[m.verified_by_id] || 0) + 1;
            });
            const sortedCoaches = Object.entries(coachCounts).sort((a, b) => b[1] - a[1]);
            if (sortedCoaches.length > 0) calculatedCoachId = sortedCoaches[0][0];
          }
        }
      }

      // 2. Create Band record (status: forming)
      const { data: newBand, error: bErr } = await supabase
        .from('bands')
        .insert({ 
          name: foundingName || `${target.title || target.songs?.title} Band`, 
          school_id: user.school_id,
          song_id: target.song_id || target.songs?.id || target.id,
          coach_id: calculatedCoachId,
          status: 'forming',
          formation_group: groupID
        })
        .select()
        .single();
      
      if (bErr || !newBand) throw bErr || new Error('Band creation failed');

      // 2. Create Band Song project
      const { data: bSong, error: bsErr } = await supabase
        .from('band_songs')
        .insert({ 
          band_id: newBand.id, 
          song_id: target.song_id || target.songs?.id || target.id, 
          status: 'active',
          suggested_by: user.id,
          difficulty_level: target.difficulty_level || target.level || 'starter'
        })
        .select()
        .single();
      
      if (bsErr || !bSong) throw bsErr;

      // 4. Finalize member list
      if (formationMembers.length === 0) {
        formationMembers = target.members || [];
      }

      // Ensure all members are flattened and have all necessary fields
      const flatMembers = formationMembers.map((m: any) => {
        const prof = m.profiles || m.users || m;
        const firstName = m.first_name || prof?.first_name || 'Musiker';
        const photoUrl = m.photo_url || prof?.photo_url || null;
        return {
          id: m.id || m.skill_id || null,
          skill_id: m.skill_id || m.id || null,
          user_id: m.user_id,
          instrument: m.instrument,
          part_number: m.part_number || 1,
          first_name: firstName,
          photo_url: photoUrl,
          verified_by_id: m.verified_by_id || null
        };
      });

      // Final safety: The founder (current user) MUST be in the list
      if (!flatMembers.some((m: any) => m.user_id === user.id)) {
        flatMembers.unshift({
          id: target.id || target.skill_id || null,
          skill_id: target.skill_id || target.id || null,
          user_id: user.id,
          instrument: target.instrument || user.instrument || 'Musiker',
          part_number: target.part_number || 1,
          first_name: user.first_name,
          photo_url: user.photo_url,
          verified_by_id: null
        });
      }

      // Deduplicate by user_id to be safe
      const uniqueMembers = Array.from(new Map(flatMembers.map(m => [m.user_id, m])).values());
      
      console.log('[Founding] Final member list to insert:', uniqueMembers.length);

      // Prepare bulk data
      const memberInserts = uniqueMembers.map((m: any) => ({
        band_id: newBand.id,
        user_id: m.user_id,
        instrument: m.instrument,
        confetti_seen: m.user_id === user.id ? true : false
      }));

      const slotInserts = uniqueMembers.map((m: any) => ({
        band_song_id: bSong.id,
        user_id: m.user_id,
        instrument: m.instrument,
        part_number: m.part_number || 1,
        status: m.user_id === user.id ? 'accepted' : 'joined',
        is_founder: m.user_id === user.id
      }));

      // Bulk Insert Members
      const { error: memErr } = await supabase.from('band_members').insert(memberInserts);
      if (memErr) throw new Error('Mitglieder konnten nicht hinzugefügt werden: ' + memErr.message);

      // Bulk Insert Slots
      const { error: slotErr } = await supabase.from('band_song_slots').insert(slotInserts);
      if (slotErr) throw new Error('Song-Slots konnten nicht erstellt werden: ' + slotErr.message);

      const createdSlots = slotInserts;

      // Also update the formation_group column for all these skills in the database to link them!
      const skillIdsToUpdate = uniqueMembers
        .map((m: any) => m.skill_id || m.id)
        .filter(Boolean);
      if (skillIdsToUpdate.length > 0 && groupID) {
        await supabase
          .from('user_song_skills')
          .update({ formation_group: groupID })
          .in('id', skillIdsToUpdate);
      }

      // Also mark the specific skill record as prompted so the Glückwunsch modal doesn't re-appear
      const promptKey = `groovelab_prompted_${user.id}`;
      const promptedIds = JSON.parse(localStorage.getItem(promptKey) || '[]');
      if (!promptedIds.includes(target.id)) {
        promptedIds.push(target.id);
        localStorage.setItem(promptKey, JSON.stringify(promptedIds));
      }

      console.log('[Founding] Artist Gateway Created for all members!');

      // Send Realtime Broadcast notification that a band has been founded
      try {
        const liveLabChannel = supabase.channel(`realtime_live_lab_${user.school_id}`);
        liveLabChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            liveLabChannel.send({
              type: 'broadcast',
              event: 'band-founded',
              payload: {
                bandName: newBand.name,
                songTitle: target.title || target.songs?.title || 'einem Song'
              }
            });
            console.log('[Founding] Sent band-founded broadcast for', newBand.name);
          }
        });
      } catch (bcErr) {
        console.error('Failed to send band-founded broadcast:', bcErr);
      }
      
      // 1. Close all triggers/modals first
      localStorage.setItem(`groovelab_founding_done_${user.id}_${target.song_id || target.id}`, 'true');
      if (groupID) localStorage.setItem(`groovelab_form_done_${user.id}_${groupID}`, 'true');
      
      setShowFoundingModal(false);
      setPendingFounding(null);
      setFoundingName('');
      console.log('[DEBUG-Groovelab] setSuggestingSkill(null) at the end of handleFoundBand');
      setSuggestingSkill(null); // Close the congrats modal immediately
      setSelectedCoachId(''); // Clear selected coach!
      
      // 2. Open the gateway celebration UI IMMEDIATELY for the founder
      // We do this before the background sync to ensure the user sees the "WOW" effect instantly
      console.log('[Founding] Opening Celebration Gateway UI...');
      setSelectedBandForGateway({ 
        ...newBand, 
        songs: { title: target.title || target.songs?.title || 'Dein Song' }, 
        band_members: uniqueMembers.map((m: any) => ({
          ...m,
          role: m.user_id === user.id ? 'leader' : 'member'
        })),
        band_songs: [{
          ...bSong,
          band_song_slots: createdSlots
        }]
      });

      // 3. Background sync - ensure loading is NOT set to true during this sync
      console.log('[Founding] Triggering background data sync in parallel...');
      // We don't await this if we want maximum speed, but awaiting it ensures consistency 
      // before switching tabs. Let's await it but keep it fast.
      await fetchDashboardData(user.id, false);
      
      // 4. Switch to bands tab so the gateway can stay visible if closed
      setActiveStudentTab('bands');
      
    } catch (err: any) {
      console.error('[Founding] Error during band creation:', err);
      alert('Fehler bei der Gateway-Eröffnung: ' + err.message);
    } finally {
      console.log('[Founding] Finishing process, clearing loading state.');
      // Safety: always ensure loading is false
      setLoading(false);
      // Extra safety: force it again after a tiny delay if we're still stuck
      setTimeout(() => {
        console.log('[Founding] Final safety check, loading is:', loading);
        if (loading) setLoading(false);
      }, 500);
    }
  };

  const handleAcceptBand = async (band: any) => {
    if (!user) return;
    try {
      setLoading(true);
      let bandSong = band.band_songs?.[0];
      
      // Fallback: If band_songs is missing, try to fetch it
      if (!bandSong) {
        console.log('[Accept] band_songs missing, fetching fallback...');
        const { data: fallback } = await supabase
          .from('band_songs')
          .select('*, band_song_slots(*)')
          .eq('band_id', band.id)
          .eq('song_id', band.song_id)
          .single();
        bandSong = fallback;
      }

      if (!bandSong) throw new Error('Kein Song-Projekt gefunden');

      const { error } = await supabase
        .from('band_song_slots')
        .update({ status: 'accepted' })
        .eq('band_song_id', bandSong.id)
        .eq('user_id', user.id);

      if (error) throw error;

      alert('Du bist jetzt offizielles Mitglied! 🤘');
      fetchDashboardData(user.id);
      
      // Update local state to reflect acceptance
      if (selectedBandForGateway && selectedBandForGateway.id === band.id) {
         const updatedBandSongs = selectedBandForGateway.band_songs?.map((bs: any, idx: number) => {
            if (idx === 0) { // Assuming first song is the one we are accepting
               return {
                  ...bs,
                  band_song_slots: bs.band_song_slots?.map((s: any) => 
                     s.user_id === user.id ? { ...s, status: 'accepted' } : s
                  )
               };
            }
            return bs;
         });
         
         setSelectedBandForGateway({
           ...selectedBandForGateway,
           band_songs: updatedBandSongs
         });
      }
    } catch (err: any) {
      alert('Fehler beim Beitreten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleCloseAnnouncement = () => {

    if (!pendingFounding || !user) return;
    localStorage.setItem(`groovelab_announcement_${user.id}_${pendingFounding.id}`, 'true');
    setShowFoundingModal(false);
    setPendingFounding(null);
  };

  const handleRejectFounding = async () => {
    if (!pendingFounding || !user) return;
    if (!window.confirm('Möchtest du wirklich nicht beitreten? Dein Platz wird für andere Schüler freigegeben.')) return;
    
    // Add to session blacklist synchronously
    if (!ignoredFoundingIds.current.includes(pendingFounding.id)) {
      ignoredFoundingIds.current.push(pendingFounding.id);
    }

    // Handle local detection IDs (non-UUID strings)
    const isLocalId = pendingFounding.id.startsWith('local_') || 
                      pendingFounding.id.startsWith('effect_triggered_') || 
                      pendingFounding.id.startsWith('auto_') || 
                      pendingFounding.id.startsWith('first_slot_');

    if (isLocalId) {
      // CLEAR the formation for EVERYONE involved to free up the slots
      const songId = pendingFounding.songs?.id || pendingFounding.songs?.song_id;
      const memberIds = pendingFounding.band_song_slots.map((m: any) => m.user_id);
      
      if (songId && memberIds.length > 0) {
        await supabase
          .from('user_song_skills')
          .update({ formation_group: null })
          .in('user_id', memberIds)
          .eq('song_id', songId);
      }

      setShowFoundingModal(false);
      setPendingFounding(null);
      setTimeout(() => fetchDashboardData(user.id), 500);
      return;
    }

    try {
      const { error } = await supabase
        .from('band_song_slots')
        .delete()
        .eq('band_song_id', pendingFounding.id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setShowFoundingModal(false);
      setPendingFounding(null);
      fetchDashboardData(user.id);
    } catch (err: any) {
      alert('Fehler beim Ablehnen: ' + err.message);
    }
  };

  const handleFinalizeFounding = async () => {
    if (!pendingFounding || !user) return;
    let finalName = foundingName;
    if (!finalName) {
      const suggestions = ['Groove Lab Rebels', 'Sonic Echo', 'Neon Harmony', 'The Beat Unit', 'Midnight Pulse', 'Echo Theory', 'Static Flow', 'Vibe Collective', 'The Sonic Rebels', 'Pulse Brigade'];
      finalName = suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    setLoading(true);
    try {
      // 1. Create the band
      const avatarMap: Record<string, string[]> = {
        '3': ['band_avatar_3_musicians_1_1777469162449.png', 'band_avatar_3_musicians_2_1777469216449.png', 'band_avatar_3_musicians_3_1777469286463.png'],
        '4': ['band_avatar_4_musicians_1_1777469178768.png', 'band_avatar_4_musicians_2_1777469299351.png', 'band_avatar_4_musicians_3_1777469315500.png'],
        '5': ['band_avatar_5_musicians_1_1777469193682.png', 'band_avatar_5_musicians_2_1777469330208.png', 'band_avatar_5_musicians_3_1777469343103.png']
      };
      const count = pendingFounding.band_song_slots.length;
      const sizeKey = count <= 3 ? '3' : (count === 4 ? '4' : '5');
      const avatarFile = avatarMap[sizeKey][Math.floor(Math.random() * 3)];

      const { data: band, error: bandErr } = await supabase
        .from('bands')
        .insert({
          name: finalName,
          school_id: user.school_id,
          song_id: pendingFounding.song_id,
          status: 'active',
          photo_url: `/brain/2c435655-1542-47aa-a374-93257d55c94c/${avatarFile}`
        })
        .select()
        .single();

      if (bandErr) throw bandErr;

      // 2. Add members
      const memberInserts = pendingFounding.band_song_slots.map((s: any) => ({
        band_id: band.id,
        user_id: s.user_id,
        instrument: s.instrument,
        confetti_seen: false
      }));

      const { error: membersErr } = await supabase.from('band_members').insert(memberInserts);
      if (membersErr) throw membersErr;

      // 3. Link band_song and clear slots
      const { error: bsErr } = await supabase.from('band_songs').update({ band_id: band.id, status: 'active' }).eq('id', pendingFounding.id);
      if (bsErr) throw bsErr;
      
      alert(`Glückwunsch! Die Band "${finalName}" wurde erfolgreich gegründet! 🚀🎸`);
      setShowFoundingModal(false);
      setPendingFounding(null);
      setFoundingName('');
      fetchDashboardData(user.id);
    } catch (err: any) {
      alert('Fehler bei der Gründung: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    console.log('Attempting to delete song:', songId, 'for user:', loggedInUserId);
    if (!window.confirm('Möchtest du diesen Song aus deinem Übe-Board entfernen?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('user_song_skills').delete().eq('song_id', songId).eq('user_id', loggedInUserId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      console.log('Delete successful');
      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
    } catch (e: any) {
      alert('Fehler beim Löschen: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSongToRepertoire = async (song: any) => {
    if (!loggedInUserId) return;
    try {
      setLoading(true);
      
      const req = song.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
      // By default, do not add Vocals until band is ready
      const instrumentsToAdd = Object.keys(req).filter(inst => req[inst] > 0);
      
      if (instrumentsToAdd.length === 0) {
        alert('Dieser Song hat keine Instrumente hinterlegt.');
        setLoading(false);
        return;
      }
      
      const insertData: any[] = [];
      instrumentsToAdd.forEach(inst => {
        insertData.push({
          user_id: loggedInUserId,
          song_id: song.id,
          instrument: inst,
          difficulty_level: 'starter',
          progress_percent: 0,
          is_stage_ready: false
        });
        insertData.push({
          user_id: loggedInUserId,
          song_id: song.id,
          instrument: inst,
          difficulty_level: 'original',
          progress_percent: 0,
          is_stage_ready: false
        });
      });

      const { error } = await supabase.from('user_song_skills').insert(insertData);
      
      if (error) {
        if (error.code === '23505') {
          alert('Dieser Song ist bereits in deinem Repertoire!');
        } else {
          throw error;
        }
      } else {
        await fetchDashboardData(loggedInUserId);
        setActiveStudentTab('practice');
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (skill: any) => {
    if (!loggedInUserId || !user) return;
    try {
      setLoading(true);
      console.log('[CHALLENGE] Starting submission for:', skill);
      
      const { data, error: findErr } = await supabase
        .from('user_song_skills')
        .select('id, progress_percent, is_pending_approval')
        .match({ 
          user_id: loggedInUserId, 
          song_id: skill.song_id,
          instrument: skill.instrument,
          difficulty_level: skill.difficulty_level,
          part_number: skill.part_number || 1
        });

      if (findErr) throw new Error('Find-Error: ' + findErr.message);
      const existing = data && data.length > 0 ? data[0] : null;


      let updateResult;
      if (existing) {
        console.log('[CHALLENGE] Updating existing record:', existing.id);
        updateResult = await supabase.from('user_song_skills').update({ 
          is_pending_approval: true,
          progress_percent: 90 
        }).eq('id', existing.id).select();
      } else {
        console.log('[CHALLENGE] No record found, inserting new one.');
        updateResult = await supabase.from('user_song_skills').insert({
          user_id: loggedInUserId,
          song_id: skill.song_id,
          instrument: skill.instrument,
          difficulty_level: skill.difficulty_level || 'original',
          part_number: skill.part_number || 1,
          progress_percent: skill.progress || 90,
          is_pending_approval: true,
          is_stage_ready: false
        }).select();
      }
      
      if (updateResult.error) throw new Error('Update-Error: ' + updateResult.error.message);
      
      // Let's send a realtime broadcast message to the teacher!
      const teacherId = user.teacher_id;
      if (teacherId) {
        const channel = supabase.channel(`realtime_teacher_challenges_${teacherId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'challenge-submitted',
              payload: {
                studentId: loggedInUserId,
                studentName: `${user.first_name} ${user.last_name ? user.last_name.charAt(0) + '.' : ''}`,
                songTitle: skill.songs?.title || skill.title || 'Song',
                instrument: skill.instrument
              }
            });
            setTimeout(() => supabase.removeChannel(channel), 1000);
          }
        });
      }

      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
      alert('Challenge eingereicht! Dein Lehrer hat eine Benachrichtigung erhalten.');

    } catch (e: any) {
      alert('Einreichungs-Fehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestToBand = async (bandId: string, skill: any) => {
    try {
      // 1. Create the proposal in band_songs
      const { data: bsData, error: bsErr } = await supabase
        .from('band_songs')
        .insert({
          band_id: bandId,
          song_id: skill.song_id,
          status: 'proposal',
          suggested_by: user.id,
          is_exclusive: exclusiveProposal,
          difficulty_level: skill.difficulty_level || 'original'
        })
        .select()
        .single();

      if (bsErr) {
        if (bsErr.code === '23505') {
          alert('Dieser Song wurde bereits für diese Band vorgeschlagen oder ist bereits im Repertoire.');
        } else {
          throw bsErr;
        }
        return;
      }

      // 2. Create the first slot for the suggester
      const { error: slotErr } = await supabase
        .from('band_song_slots')
        .insert({
          band_song_id: bsData.id,
          user_id: user.id,
          instrument: skill.instrument,
          part_number: skill.part_number || 1
        });

      if (slotErr) throw slotErr;

      // 3. Send a Shoutbox notification (Only if not fully mastered by all required players)
      const song = globalSongs.find((s: any) => s.id === skill.song_id);
      let isFullyMastered = false;
      if (song?.instrumentation) {
        const req = song.instrumentation;
        const normSugInst = normalizeInstrument(skill.instrument);
        isFullyMastered = Object.entries(req).every(([inst, count]) => {
          const normReq = normalizeInstrument(inst);
          if (normReq === 'Vocals') return true;
          const needed = count as number;
          if (needed <= 0) return true;
          const suggesterSatisfies = (normSugInst === normReq);
          const filledCount = suggesterSatisfies ? 1 : 0;
          return filledCount >= needed;
        });
      }

      if (!isFullyMastered) {
        await supabase.from('band_shoutbox').insert({
          band_id: bandId,
          user_id: user.id,
          content: `Ich habe die Challenge für "${skill.songs?.title || skill.title}" gemeistert und den Song für unsere Band vorgeschlagen! Wer ist dabei? 🎸🚀`
        });

        alert('Song erfolgreich vorgeschlagen! Deine Bandmitglieder wurden benachrichtigt.');
      } else {
        await supabase.from('band_songs').update({ status: 'active' }).eq('id', bsData.id);
        await supabase.from('band_shoutbox').insert({
          band_id: bandId,
          user_id: user.id,
          content: `🔥 Juhu! Wir haben "${song?.title || skill.songs?.title || skill.title}" vollständig besetzt und gemeistert! Der Song ist ab sofort in unserem Repertoire!`
        });
        alert('Song wurde zu deinem Repertoire in dieser Band hinzugefügt.');
      }
      
      dismissSuggestion(skill.id);
      fetchDashboardData(user.id);
    } catch (err: any) {
      console.error('[SuggestToBand] Error:', err);
      alert('Fehler beim Vorschlagen des Songs: ' + (err.message || 'Unbekannter Fehler'));
    }
  };

  const clearConfetti = async () => {
    if (!showConfetti) return;
    const bandToOpen = showConfetti.bands;
    await supabase.from('band_members').update({ confetti_seen: true }).eq('id', showConfetti.id);
    setShowConfetti(null);
    
    // Now trigger the Artist Gateway debut once
    if (bandToOpen && bandToOpen.status === 'forming') {
      setSelectedBandForGateway(bandToOpen);
    }
  };

  const handleLogout = async (updateDb = true, askConfirm = false) => {
    if (askConfirm === true) {
      if (!window.confirm('Möchtest du dich wirklich abmelden?')) {
        return;
      }
    }
    const currentUser = user;
    const currentSession = session;

    // Resolve school token and subdomain before clearing any states
    const schoolId = currentUser?.school_id || (currentUser?.schools ? (Array.isArray(currentUser.schools) ? currentUser.schools[0]?.id : currentUser.schools?.id) : null);
    let schoolToken = localStorage.getItem('groovelab_kiosk_token');
    let schoolSubdomain = null;
    let resolvedSchoolName = null;
    let hasCampusSubscription = true;
    let hasGroovelabSubscription = false;
    if (schoolId) {
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('groovelab_kiosk_token, campus_login_token, subdomain, name, has_campus_subscription, has_groovelab_subscription')
          .eq('id', schoolId)
          .single();
        schoolToken = schoolData?.groovelab_kiosk_token || schoolData?.campus_login_token || null;
        schoolSubdomain = schoolData?.subdomain || null;
        resolvedSchoolName = schoolData?.name || null;
        if (schoolData) {
          hasCampusSubscription = schoolData.has_campus_subscription !== false;
          hasGroovelabSubscription = schoolData.has_groovelab_subscription === true;
        }
      } catch (err) {
        console.error('[Logout] Error fetching school data:', err);
      }
    }

    try {
      if (loggedInUserId) {
        // Mark user as offline
        const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
        const { error } = await supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId);
        if (error) console.error('Error updating last_seen on logout:', error);
      }

      if (updateDb && currentSession?.id) {
        // Session beenden
        const { error } = await supabase
          .from('sessions')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', currentSession.id);
        if (error) console.error('Error ending session on logout:', error);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Detect if device is a kiosk
    const storedKioskRoomId = localStorage.getItem('groovelab_kiosk_room_id');
    const storedKioskToken = localStorage.getItem('groovelab_kiosk_token');
    const isDeviceKiosk = !!(storedKioskRoomId || storedKioskToken);

    let roomId = null;

    if (isDeviceKiosk) {
      roomId = storedKioskRoomId;
      const storedStationId = localStorage.getItem('groovelab_station_id');

      // Fallback 1: Lookup room ID from active station ID in stations table
      if (!roomId) {
        const activeStationId = currentSession?.station_id || storedStationId;
        if (activeStationId && activeStationId !== 'skip') {
          try {
            const { data: stationData } = await supabase
              .from('stations')
              .select('room_id')
              .eq('id', activeStationId)
              .single();
            if (stationData?.room_id) {
              roomId = stationData.room_id;
            }
          } catch (err) {
            console.error('[Logout] Error resolving room from station:', err);
          }
        }
      }

      // Fallback 2: Lookup first room for user's school ID
      if (!roomId && schoolId) {
        try {
          let roomsQuery = supabase
            .from('rooms')
            .select('id')
            .eq('school_id', schoolId);
          if (activePlatform === 'campus') {
            roomsQuery = roomsQuery.eq('is_campus_active', true);
          } else {
            roomsQuery = roomsQuery.eq('is_groovelab_active', true);
          }
          const { data: roomData } = await roomsQuery
            .order('sort_order', { ascending: true })
            .limit(1);
          if (roomData && roomData.length > 0) {
            roomId = roomData[0].id;
          }
        } catch (err) {
          console.error('[Logout] Error resolving room from school:', err);
        }
      }
    }

    const finalSub = schoolSubdomain || (resolvedSchoolName
      ? resolvedSchoolName
          .toLowerCase()
          .trim()
          .replace(/[äöüß]/g, (match: string) => {
            const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
            return mapping[match] || match;
          })
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
      : '');

    let currentPlatform = activePlatform || localStorage.getItem('groovelab_active_platform') || 'campus';
    if (hasGroovelabSubscription && !hasCampusSubscription) {
      currentPlatform = 'groovelab';
    }

    const getRedirectUrl = (params: string = '') => {
      let baseUrl = `${window.location.origin}/login`;
      if (finalSub) {
        const host = window.location.hostname;
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          baseUrl = `${window.location.origin}/login`;
          params = params ? `${params}&subdomain=${finalSub}` : `subdomain=${finalSub}`;
        } else if (host.startsWith(`${finalSub}.`)) {
          // If already on the correct subdomain, stay on it
          baseUrl = `${window.location.origin}/login`;
        } else {
          // Stay on the current working domain and pass the school/subdomain parameter to avoid DNS/proxy failures
          baseUrl = `${window.location.origin}/login`;
          params = params ? `${params}&school=${finalSub}` : `school=${finalSub}`;
        }
      }
      const platformParam = `platform=${currentPlatform}`;
      const finalParams = params ? `${params}&${platformParam}` : platformParam;
      return `${baseUrl}?${finalParams}`;
    };

    const storedStationIdForCheck = localStorage.getItem('groovelab_station_id');
    const isGeneralKiosk = !storedStationIdForCheck || storedStationIdForCheck === 'skip';

    if (isDeviceKiosk && isGeneralKiosk) {
      console.log('[Logout] Redirecting general kiosk to clean login page.');
      localStorage.setItem('groovelab_station_id', 'skip');
      localStorage.removeItem('groovelab_kiosk_room_id');

      // Clear local credentials/states
      localStorage.removeItem('isBillingBooked');
      localStorage.removeItem('isCancelled');
      localStorage.removeItem('contractStartDate');
      localStorage.removeItem('bookedExtraUsers');
      localStorage.removeItem('nextBillingOption');
      localStorage.removeItem('nextBillingOptionEffectiveAt');
      localStorage.removeItem('unbooked_52_temp');
      setLoggedInUserId(null);
      setUser(null);
      setSession(null);
      setIsCampusUnlocked(false);
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_location_mode');
      localStorage.removeItem('groovelab_user_id');
      localStorage.removeItem('groovelab_location_mode');
      localStorage.removeItem('groovelab_active_tab');

      window.location.replace(getRedirectUrl());
      return;
    }

    if (isDeviceKiosk && roomId) {
      console.log('[Logout] Redirecting Kiosk device to school room:', roomId);
      // Keep groovelab_station_id so the kiosk device remains configured for that station!
      localStorage.setItem('groovelab_kiosk_room_id', roomId);

      // Clear local credentials/states
      localStorage.removeItem('isBillingBooked');
      localStorage.removeItem('isCancelled');
      localStorage.removeItem('contractStartDate');
      localStorage.removeItem('bookedExtraUsers');
      localStorage.removeItem('nextBillingOption');
      localStorage.removeItem('nextBillingOptionEffectiveAt');
      localStorage.removeItem('unbooked_52_temp');
      setLoggedInUserId(null);
      setUser(null);
      setSession(null);
      setIsCampusUnlocked(false);
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_location_mode');
      sessionStorage.removeItem('groovelab_cached_user');
      sessionStorage.removeItem('groovelab_active_tab');
      sessionStorage.removeItem('campus_active_tab');
      sessionStorage.removeItem('groovelab_active_platform');
      sessionStorage.removeItem('groovelab_active_workspace');
      sessionStorage.removeItem('groovelab_secretary_subtab');

      // If the device has a coupled station (not general uncoupled kiosk), do not pass kiosk_room_id
      // to avoid triggering auto-bootstrap on load which would overwrite the coupled station.
      if (!isGeneralKiosk) {
        window.location.replace(getRedirectUrl());
      } else {
        window.location.replace(getRedirectUrl(`kiosk_room_id=${roomId}`));
      }
      return;
    }

    console.log('[Logout] Logging out personal device.');
    localStorage.removeItem('groovelab_station_id');
    localStorage.removeItem('groovelab_kiosk_token');
    localStorage.removeItem('groovelab_kiosk_room_id');
    localStorage.removeItem('isBillingBooked');
    localStorage.removeItem('isCancelled');
    localStorage.removeItem('contractStartDate');
    localStorage.removeItem('bookedExtraUsers');
    localStorage.removeItem('nextBillingOption');
    localStorage.removeItem('nextBillingOptionEffectiveAt');
    localStorage.removeItem('unbooked_52_temp');
    setLoggedInUserId(null);
    setUser(null);
    setSession(null);
    setIsCampusUnlocked(false);
    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
    sessionStorage.removeItem('groovelab_cached_user');
    sessionStorage.removeItem('groovelab_active_platform');
    sessionStorage.removeItem('groovelab_active_tab');
    sessionStorage.removeItem('campus_active_tab');
    sessionStorage.removeItem('groovelab_active_workspace');
    sessionStorage.removeItem('groovelab_secretary_subtab');

    window.location.replace(getRedirectUrl());
  };

  const hasInviteSchoolId = searchParams.has('invite_school_id');

  const handleLogin = async (userId: string, isHome?: boolean, stationId?: string | null) => {
    if (stationId !== undefined) {
      setStationIdFromStorage(stationId);
    }
    const currentStationId = stationId !== undefined ? stationId : stationIdFromStorage;
    const localIsKioskMode = (currentStationId && currentStationId !== 'skip') || (typeof window !== 'undefined' ? !!localStorage.getItem('groovelab_kiosk_token') : false);

    const { data: userToLogin } = await supabase.from('users').select('role, roles, contract_ends_at, contract_decision_made, is_external_vocalist, is_campus_active, is_groovelab_active, schools(has_campus_subscription, has_groovelab_subscription)').eq('id', userId).single();
    if (userToLogin?.role === 'student' && userToLogin.contract_ends_at) {
      const endsAt = new Date(userToLogin.contract_ends_at).getTime();
      if (Date.now() > endsAt) {
        alert("Dein Vertrag ist abgelaufen. Bitte wende dich an die Verwaltung.");
        return;
      }
      
      if (userToLogin.contract_decision_made === false || userToLogin.contract_decision_made === null) {
        setDeletionPromptUserId(userId);
        setDeletionPromptIsHome(isHome);
        setShowDeletionPrompt(true);
        return; // Pause login until decision is made
      }
    }

    const existingWorkspace = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_workspace') : null;
    const currentRole = userToLogin?.role?.toLowerCase() || 'teacher';
    if (currentRole === 'admin' || currentRole === 'secretary') {
      sessionStorage.setItem('groovelab_active_workspace', 'secretary');
      if (currentRole === 'secretary') {
        sessionStorage.setItem('groovelab_secretary_subtab', 'briefing');
      }
    } else if (existingWorkspace === 'teacher') {
      sessionStorage.setItem('groovelab_active_workspace', 'teacher');
    } else if (existingWorkspace === 'master_admin') {
      sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
    } else if (currentRole === 'student') {
      sessionStorage.setItem('groovelab_active_workspace', 'student');
    } else {
      sessionStorage.setItem('groovelab_active_workspace', 'teacher');
    }

    // Determine module availability for user & school
    const schoolObj = Array.isArray(userToLogin?.schools) ? userToLogin.schools[0] : userToLogin?.schools;
    const schoolHasCampus = schoolObj?.has_campus_subscription ?? true;
    const schoolHasGroove = schoolObj?.has_groovelab_subscription ?? true;

    const isCampusActive = Boolean(schoolHasCampus && userToLogin?.is_campus_active);
    const isGroovelabActive = Boolean(schoolHasGroove && userToLogin?.is_groovelab_active);

    if (isCampusActive) {
      // 1. Campus -> Briefing Board
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'briefing');
      setActivePlatform('campus');
      setActiveStudentTab('briefing');
    } else if (isGroovelabActive) {
      // 2. GrooveLab -> Live Lab Board
      sessionStorage.setItem('groovelab_active_platform', 'groovelab');
      sessionStorage.setItem('groovelab_active_tab', 'live');
      setActivePlatform('groovelab');
      setActiveStudentTab('live');
    } else {
      // 3. Fallback: QR Landingpage
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'qr_landing');
      setActivePlatform('campus');
      setActiveStudentTab('qr_landing');
    }

    // Force checkout from active sessions for Campus logins / Admins / Secretaries to prevent automatic check-in visibility
    const isCampus = activePlatform === 'campus' || currentRole === 'admin' || currentRole === 'secretary';
    if (isCampus) {
      await supabase
        .from('sessions')
        .update({ check_out_time: new Date().toISOString() })
        .eq('user_id', userId)
        .is('check_out_time', null);
    }

    const isStaff = userToLogin?.role === 'teacher' || userToLogin?.role === 'admin' || userToLogin?.role === 'secretary';
    const mode = (isStaff && activePlatform === 'groovelab') ? 'lab' : (isHome ? 'home' : 'lab');
    
    // If we are switching profiles, mark the OLD one as offline first
    if (loggedInUserId && loggedInUserId !== userId) {
      const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
      await supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId);
    }

    // Store in sessionStorage per-tab so each browser tab is 100% isolated
    sessionStorage.setItem('groovelab_user_id', userId);
    sessionStorage.setItem('groovelab_location_mode', mode);

    // Default start tab: Always open the briefing board for all users in Campus, and for staff/teachers in GrooveLab.
    // GrooveLab students start on the 'live' tab.
    
    // Check if the user selected 'groovelab' on the login screen
    let selectedPlat = sessionStorage.getItem('groovelab_active_platform') || 'campus';
    if (!localIsKioskMode && (userToLogin?.role === 'student' || userToLogin?.role === 'teacher')) {
      selectedPlat = 'campus';
      sessionStorage.setItem('groovelab_active_platform', 'campus');
    } else if (localIsKioskMode) {
      selectedPlat = 'groovelab';
      sessionStorage.setItem('groovelab_active_platform', 'groovelab');
    }
    
    if (userToLogin?.role === 'student') {
      if (selectedPlat === 'groovelab') {
        sessionStorage.setItem('groovelab_active_tab', 'live');
      } else {
        sessionStorage.setItem('campus_active_tab', 'briefing');
        sessionStorage.setItem('groovelab_active_tab', 'briefing');
      }
    } else if (userToLogin?.role === 'teacher') {
      if (selectedPlat === 'groovelab') {
        sessionStorage.setItem('groovelab_active_tab', 'live');
      } else {
        sessionStorage.setItem('campus_active_tab', 'live');
        sessionStorage.setItem('groovelab_active_tab', 'live');
      }
    } else if (userToLogin?.role === 'secretary') {
      sessionStorage.setItem('groovelab_active_workspace', 'secretary');
      sessionStorage.setItem('groovelab_secretary_subtab', 'briefing');
      sessionStorage.setItem('campus_active_tab', 'briefing');
    } else {
      sessionStorage.setItem('campus_active_tab', 'live');
      if (userToLogin?.role === 'student') {
        if (selectedPlat === 'groovelab') {
          sessionStorage.setItem('groovelab_active_tab', 'live');
        } else {
          sessionStorage.setItem('groovelab_active_tab', 'briefing');
          sessionStorage.setItem('campus_active_tab', 'briefing');
        }
      } else {
        sessionStorage.setItem('groovelab_active_tab', 'live');
      }
    }
    
    const resolvedPlatform = selectedPlat;
    const startTab = (resolvedPlatform === 'groovelab' && userToLogin?.role === 'student') ? 'live' :
                      (userToLogin?.role === 'student') ? 'briefing' : 
                      (userToLogin?.role === 'teacher') ? 'live' :
                      (userToLogin?.role === 'secretary') ? 'briefing' : 'live';
    setActiveStudentTab(startTab);

    // Immediate Heartbeat on Login (non-blocking for instantaneous login transition!)
    supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
      
    // Force a hard reload to absolutely guarantee that any lingering camera 
    // media streams from the browser are destroyed.
    // If there are search parameters (like qr_token or teacher_qr_token), reload to the clean origin page to prevent infinite loops.
    setTimeout(() => {
      if (window.location.search) {
        window.location.replace(window.location.origin + window.location.pathname);
      } else {
        window.location.reload();
      }
    }, 50);
  };

  // Dedicated hook for active tab initialization, persistence and role-based correction
  useEffect(() => {
    if (user && user.id) {
      const storageKey = activePlatform === 'campus' ? 'campus_active_tab' : (activePlatform === 'ensembles' ? 'ensembles_active_tab' : 'groovelab_active_tab');
      const storedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) : null);
      if (!storedTab) {
        const startTab = user.role === 'student' 
          ? (activePlatform === 'campus' ? 'briefing' : 'live') 
          : (activePlatform === 'campus' ? 'briefing' : 'live');
        console.log('[Tab Sync] No tab stored in storage. Fallback to start tab:', startTab);
        setActiveStudentTab(startTab);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, startTab);
          localStorage.setItem(storageKey, startTab);
        }
      } else {
        // Auto-correct if teacher/admin somehow has a student-only tab active
        const isTeacherOrAdmin = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
        if (isTeacherOrAdmin && activePlatform !== 'campus') {
          const studentTabs = ['practice', 'library', 'repertoire', 'matching'];
          if (studentTabs.includes(activeStudentTab)) {
            const fallbackTab = 'live';
            console.log('[Tab Sync] Auto-correcting student-only tab for teacher/admin to fallback:', fallbackTab);
            setActiveStudentTab(fallbackTab);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(storageKey, fallbackTab);
              localStorage.setItem(storageKey, fallbackTab);
            }
          }
        }
        // Auto-correct if a student on groovelab has an invalid campus-only tab saved (e.g. 'briefing' from old Safety Hook bug)
        const isStudent = user.role?.toLowerCase() === 'student';
        if (isStudent && activePlatform === 'groovelab') {
          const validGroovelabStudentTabs = ['live', 'practice', 'library', 'repertoire', 'matching', 'bands', 'messages', 'profile', 'settings'];
          if (!validGroovelabStudentTabs.includes(activeStudentTab)) {
            console.log('[Tab Sync] Auto-correcting invalid groovelab student tab to live:', activeStudentTab);
            setActiveStudentTab('live');
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('groovelab_active_tab', 'live');
              localStorage.setItem('groovelab_active_tab', 'live');
            }
          }
        }
      }
    }
  }, [user?.id, user?.role, activePlatform]);

  // Lock platform to groovelab on page load/initial mount in lab mode for security
  useEffect(() => {
    if (user && user.role === 'student' && locationMode === 'lab') {
      const activePlat = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform')) : null;
      if (activePlat !== 'campus' && activePlat !== 'groovelab') {
        console.log('[Lab Lock] Resetting platform to groovelab on page load for student security');
        setActivePlatformRaw('groovelab');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('groovelab_active_platform', 'groovelab');
          localStorage.setItem('groovelab_active_platform', 'groovelab');
        }
        const savedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_tab') || localStorage.getItem('groovelab_active_tab')) : null) || 'live';
        setActiveStudentTabRaw(savedTab);
      }
    }
  }, [user?.id, user?.role, locationMode]);

  // Subscription Hard Lock Enforcement
  useEffect(() => {
    if (user && user.id) {
      const schoolObj = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      if (!schoolObj) return;
      const schoolHasCampus = schoolObj?.has_campus_subscription ?? true;
      const schoolHasGroove = schoolObj?.has_groovelab_subscription ?? true;

      if (activePlatform === 'campus' && !schoolHasCampus) {
        console.log('[Subscription Lock] Campus not active. Redirecting to GrooveLab.');
        setActivePlatform('groovelab');
      } else if (activePlatform === 'groovelab' && !schoolHasGroove) {
        console.log('[Subscription Lock] GrooveLab not active. Redirecting to Campus.');
        setActivePlatform('campus');
      }
    }
  }, [user?.id, user?.schools, activePlatform]);

  // Automatic Inactivity Timeout (Auto-Lock) for shared devices in Lab Mode
  useEffect(() => {
    if (!loggedInUserId || locationMode !== 'lab') {
      setShowAutoLockWarning(false);
      return;
    }

    let mainTimeoutId: any = null;
    
    // 20 minutes = 1,200,000 milliseconds
    const TIMEOUT_DURATION = 1200000; 

    const isMediaActive = () => {
      const mediaElements = Array.from(document.querySelectorAll('audio, video'));
      const html5Active = mediaElements.some((media: any) => !media.paused && !media.ended);
      const sessionActive = !!session;
      return html5Active || sessionActive;
    };

    const handleTimeoutReached = () => {
      if (isMediaActive()) {
        resetTimer();
        return;
      }

      if (document.visibilityState === 'hidden') {
        console.log('[Auto-Lock] User inactive in background, logging out directly...');
        handleLogout(true, false);
      } else {
        setShowAutoLockWarning(true);
        setAutoLockCountdown(30);
      }
    };

    const resetTimer = () => {
      setShowAutoLockWarning(false);
      if (mainTimeoutId) clearTimeout(mainTimeoutId);
      mainTimeoutId = setTimeout(handleTimeoutReached, TIMEOUT_DURATION);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => {
      if (!showAutoLockWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, activityHandler);
    });

    resetTimer();

    return () => {
      if (mainTimeoutId) clearTimeout(mainTimeoutId);
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, [loggedInUserId, locationMode, showAutoLockWarning, session]);

  // Handle countdown ticks for the visual Auto-Lock warning modal
  useEffect(() => {
    if (!showAutoLockWarning) return;

    const intervalId = setInterval(() => {
      setAutoLockCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          console.log('[Auto-Lock] Warning countdown finished, logging out...');
          setShowAutoLockWarning(false);
          handleLogout(true, false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showAutoLockWarning]);

  useEffect(() => {
    let debounceCountTimer: any = null;
    const debouncedFetchActiveStudentCount = (schoolId: string) => {
      if (debounceCountTimer) clearTimeout(debounceCountTimer);
      debounceCountTimer = setTimeout(() => {
        fetchActiveStudentCount(schoolId);
      }, 500);
    };

    // Realtime subscription for sessions (Active Student Count)
    const sessionsChannel = supabase
      .channel('public:sessions_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        if (user?.school_id) {
          debouncedFetchActiveStudentCount(user.school_id);
        }
      })
      .subscribe();

    // Activity-driven Heartbeat (90s): only writes to DB if user interacted recently
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      lastActivityTime = Date.now();
    };
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    const updateHeartbeat = async () => {
      try {
        if (document.hidden) return;
        // If idle for > 5 minutes, skip DB write to protect Postgres WAL and autovacuum
        if (Date.now() - lastActivityTime > 5 * 60 * 1000) return;

        const now = new Date().toISOString();
        if (user?.id) {
          await supabase
            .from('users')
            .update({ last_seen: now })
            .eq('id', user.id);
        }
      } catch (err) {
        console.warn('[Heartbeat] background update caught error:', err);
      }
    };

    updateHeartbeat(); // Immediate heartbeat on load/mount
    const heartbeat = setInterval(updateHeartbeat, 90000); // 90 seconds interval

    // Immediate heartbeat, Realtime reconnection, layout reflow, screen blurring protection, and audio suspension when backgrounding tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(16px)';
        document.body.style.transition = 'filter 0.15s ease-out';
        try {
          if ((window as any).__groovelabAudioCtx && (window as any).__groovelabAudioCtx.state === 'running') {
            (window as any).__groovelabAudioCtx.suspend().catch(() => {});
          }
        } catch (e) {}
      } else {
        document.body.style.filter = 'none';
        lastActivityTime = Date.now();
        dbCircuitBreaker.recordSuccess();
        try {
          if ((window as any).__groovelabAudioCtx && (window as any).__groovelabAudioCtx.state === 'suspended') {
            (window as any).__groovelabAudioCtx.resume().catch(() => {});
          }
        } catch (e) {}
        try { (supabase.realtime as any)?.connect?.(); } catch (e) {}
        updateHeartbeat();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
          window.dispatchEvent(new CustomEvent('groovelab_orientation_changed'));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOnlineSync = () => {
      console.info('[Network] Device came online. Reconnecting Realtime & refreshing state...');
      lastActivityTime = Date.now();
      dbCircuitBreaker.recordSuccess();
      try { (supabase.realtime as any)?.connect?.(); } catch (e) {}
      updateHeartbeat();
    };
    window.addEventListener('online', handleOnlineSync);

    const handleBeforeUnload = () => {
      if (user?.id) {
        const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
        const body = JSON.stringify({ last_seen: pastDate });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`;
        
        // Use fetch with keepalive for reliable delivery on tab close
        fetch(url, {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body,
          keepalive: true
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      supabase.removeChannel(sessionsChannel);
      clearInterval(heartbeat);
      if (debounceCountTimer) clearTimeout(debounceCountTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineSync);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, user?.school_id, session?.id]);

  const fetchSession = async (uid: string) => {
    const { data: sData } = await supabase
      .from('sessions')
      .select('*, stations(name)')
      .eq('user_id', uid)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setSession(sData);
  };

  const fetchActiveStudentCount = async (schoolId: string) => {
    // Fetch sessions and join users to filter by school and heartbeat
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen, is_groovelab_active)')
      .is('check_out_time', null)
      .eq('users.school_id', schoolId)
      .eq('users.role', 'student');
    
    // Only count students who have an active session at a station and are gps_verified
    const count = (activeSessions || []).filter(s => {
      const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
      if (!u) return false;
      const isStudent = u.role?.toLowerCase() === 'student';
      const isStaff = u.role?.toLowerCase() === 'teacher' || u.role?.toLowerCase() === 'admin';
      return isStudent && !isStaff && s.station_id && s.gps_verified && u.is_groovelab_active;
    }).length;
    
    setActiveStudentsCount(count);
  };

  // Pre-calculate session and lockout hooks unconditionally BEFORE any early returns
  const ghostUrlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isGhostParam = ghostUrlParams.get('support_ghost') === 'true' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true');
  const ghostSchoolId = ghostUrlParams.get('school_id') || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_ghost_school_id') : null);

  const currentActiveWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
  const isMasterSessionFlag = typeof window !== 'undefined' && (sessionStorage.getItem('groovelab_is_master_admin') === 'true' || localStorage.getItem('groovelab_is_master_admin') === 'true');

  // SECURITY ISOLATION:
  // MasterAdminDashboard (Leitstand) is exclusively accessible if:
  // 1. Session was explicitly authenticated via Master-Admin login / Leitstand bypass (isMasterSessionFlag === true)
  // 2. Active workspace is 'master_admin' (never 'teacher', 'secretary', 'admin', 'student')
  // 3. User is not in support-ghost session mode
  const isMasterAdminSession = Boolean(
    isMasterSessionFlag && 
    currentActiveWorkspace === 'master_admin'
  ) && !(isGhostParam && ghostSchoolId);

  // Enterprise+ Tier 3: Master Admin Ephemeral Session Lease TTL Guard (Zero Standing Privileges)
  useEffect(() => {
    if (!isMasterAdminSession) return;

    const checkMasterLease = async () => {
      const { isValid } = await verifyMasterSessionLease();
      if (!isValid && sessionStorage.getItem('groovelab_is_master_admin') === 'true') {
        console.warn('[Security] Master Admin Session Lease abgelaufen. Auto-Lockout wird ausgeführt.');
        sessionStorage.removeItem('groovelab_is_master_admin');
        sessionStorage.removeItem('groovelab_user_id');
        window.location.href = '/';
      }
    };

    checkMasterLease();
    const interval = setInterval(checkMasterLease, 30000);
    return () => clearInterval(interval);
  }, [isMasterAdminSession]);

  const currentSchoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
  const currentSchoolId = user?.school_id || currentSchoolObj?.id;

  const isMaintenanceLockoutActive = useMemo(() => {
    if (!maintenanceState || !maintenanceState.isActive) return false;
    if (maintenanceBypass) return false;
    if (isMasterAdminSession) return false;

    // Check scope
    if (maintenanceState.scope === 'all') return true;
    if (maintenanceState.scope === 'campus_only' && activePlatform === 'campus') return true;
    if (maintenanceState.scope === 'groovelab_only' && activePlatform === 'groovelab') return true;
    if (maintenanceState.scope === 'schools_only' && currentSchoolId && (maintenanceState.targetSchoolIds || []).includes(currentSchoolId)) return true;

    return false;
  }, [maintenanceState, maintenanceBypass, isMasterAdminSession, activePlatform, currentSchoolId]);

  const urlBandId = searchParams.get('band');

  // 1. PUBLIC BAND VIEW (Prioritized for sharing)
  if (urlBandId) {
    if (selectedBandForProfile && showBandProfile) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#09090b', overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
           {/* Small non-clickable brand indicator for public visitors */}
           <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
              <div style={{ width: '32px', height: '32px', background: '#fefce8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={18} color="#eab308" />
              </div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>GROOVELAB</div>
           </div>
           <BandProfileContent 
             selectedBandForProfile={selectedBandForProfile} 
             user={user} 
             bandProfileView={bandProfileView} 
             setBandProfileView={setBandProfileView} 
             brandColor={brandColor} 
             width={width} 
             APP_INSTRUMENT_COLORS={APP_INSTRUMENT_COLORS} 
             APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS} 
             setShowBandProfile={setShowBandProfile} 
             setEditingBand={setEditingBand} 
             setShowEditBand={setShowEditBand} 
             setShowAvatarPicker={setShowAvatarPicker}
             setAvatarPickerType={setAvatarPickerType}
             isSharedView={isSharedView}
           />
        </div>
      );
    }
    // Show a minimalist loading state for public visitors
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
      </div>
    );
  }

  // 1.5 PUBLIC CAMPUS PASS VIEW
  const urlCampusPassToken = searchParams.get('campus_pass');
  if (urlCampusPassToken) {
    if (publicPassUser) {
      return (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 6000, 
          background: '#09090b', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto'
        }}>
          {/* Brand header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '32px', height: '32px', background: '#e6f4ea', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34a853', fontWeight: 900, fontSize: '1.2rem' }}>C</span>
            </div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>CAMPUS PASS</div>
          </div>
          
          {/* Standing credit-card style layout */}
          <div style={{ maxWidth: '380px', width: '100%' }}>
            <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', fontSize: '0.85rem' }}>Lade QR Code...</div>}>
              <QRCodeModal 
                user={publicPassUser} 
                activePlatform="campus" 
                onClose={() => {
                  window.close();
                }} 
              />
            </Suspense>
          </div>
        </div>
      );
    }
    // Show a minimalist loading state for public visitors
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#34a853', borderRadius: '50%' }}></div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Lade Campus Pass...</div>
      </div>
    );
  }

  // 1.7 KIOSK RESOLUTION SPINNER
  if (loadingKiosk) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lade Kiosk-Konfiguration…</div>
      </div>
    );
  }

  // 1.8a KIOSK SETUP MODE: kiosk_room_id + kiosk_setup=1 → show DeviceSetupScreen
  if (kioskRoomIdParam && kioskSetupParam === '1') {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}><div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>Lade Setup...</div></div>}>
        <DeviceSetupScreen />
      </Suspense>
    );
  }

  // 1.8b KIOSK ROOM AUTO-BOOTSTRAP (show spinner while resolving station)
  if (kioskBootstrapping) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Kiosk wird gestartet…</div>
      </div>
    );
  }

  // 0. ONBOARDING PAGE
  const onboardingPathMatch = location.pathname.match(/^\/onboarding\/([^/?#]+)/);
  if (onboardingPathMatch) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <StudentOnboardingPage token={onboardingPathMatch[1]} />
      </Suspense>
    );
  }

  // 0.0 DEVICE ONBOARDING PAGE
  const deviceOnboardingPathMatch = location.pathname.match(/^\/device-onboarding\/([^/?#]+)/);
  if (deviceOnboardingPathMatch) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <DeviceOnboardingPage token={deviceOnboardingPathMatch[1]} />
      </Suspense>
    );
  }

  // 0.1 QR LANDING PAGE — Weg 2: Nativer Kamera-Scan oder fixer QR-Token-Link (Sofort abfangen vor allen States!)
  const urlParams = new URLSearchParams(location.search);
  const isInviteSchoolLink = urlParams.has('invite_school_id');
  const queryQrToken = !isInviteSchoolLink ? (urlParams.get('token') || urlParams.get('qr_token')) : null;

  const sessionQrToken = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_qr_token') : null;
  const localLastQrToken = typeof window !== 'undefined' ? localStorage.getItem('groovelab_last_qr_token') : null;

  const effectiveQrToken = !isInviteSchoolLink && (qrPathMatch 
    ? qrPathMatch[1] 
    : (queryQrToken || sessionQrToken || (location.pathname.startsWith('/qr/') ? localLastQrToken : null)));

  if (effectiveQrToken) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_qr_token', effectiveQrToken);
      localStorage.setItem('groovelab_last_qr_token', effectiveQrToken);
      if (!location.pathname.startsWith('/qr/')) {
        safeReplaceState(null, '', `/qr/${effectiveQrToken}`);
      }
    }

    const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);
    const currentUserId = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null;

    if (isStandalone && currentUserId) {
      // User is logged in via PWA standalone app.
      // Redirect the QR link to the external browser (Safari/Chrome) and auto-pair it
      const externalUrl = `${window.location.origin}/qr/${effectiveQrToken}?auto_pair=true`;
      window.open(externalUrl, '_blank');
      
      // Clean up the URL in the PWA so it returns to the dashboard
      navigate('/dashboard', { replace: true });
    } else {
      return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Campus Pass...</div>}>
          <QRLandingPage token={effectiveQrToken} />
        </Suspense>
      );
    }
  }

  // 0.9 PUBLIC SHARED AUDIO-BIOGRAPHY LANDING PAGE
  if (location.pathname.startsWith('/shared-biography/') || location.pathname.startsWith('/shared/') || location.pathname.startsWith('/bio/')) {
    const studentIdParam = location.pathname.split('/').filter(Boolean).pop();
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#090d16', color: '#64748b' }}>Lade Audio-Biografie...</div>}>
        <SharedAudioBiographyPage studentId={studentIdParam} />
      </Suspense>
    );
  }

  // 1. SIGNUP WIZARD
  if (location.pathname === '/signup') {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Registrierung...</div>}>
        <SignupWizard 
          onBackToLogin={() => {
            navigate('/login');
          }} 
          onSignupSuccess={(uid) => {
            handleLogin(uid, false);
          }}
        />
      </Suspense>
    );
  }

  // 1.1 DETAILED LANDING PAGES
  if (location.pathname === '/landingpage' || location.pathname === '/startseite') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <Startseite 
          onLogin={() => navigate('/login?school=musaek-bs&groovelab=true')} 
          onRegister={(email) => navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')} 
          onShowPrivacy={() => setShowPrivacy(true)}
          onShowAgb={() => setShowAgb(true)}
          onShowImpressum={() => setShowImpressum(true)}
        />
        {renderLegalModals()}
      </Suspense>
    );
  }

  if (location.pathname === '/landingpage2' || location.pathname === '/startseite2' || location.pathname === '/starseite2') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <Startseite2 
          onLogin={() => navigate('/login?school=musaek-bs&groovelab=true')} 
          onRegister={(email) => navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')} 
          onShowPrivacy={() => setShowPrivacy(true)}
          onShowAgb={() => setShowAgb(true)}
          onShowImpressum={() => setShowImpressum(true)}
        />
        {renderLegalModals()}
      </Suspense>
    );
  }

  // 2. AUTHENTICATION CHECK
  if (!loggedInUserId && !showDeletionPrompt) {
    if (showSchoolOnboardingModal) {
      return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#0f172a' }}>
          <Suspense fallback={<DashboardLoader />}>
            <SchoolSelfOnboardingModal
              onClose={() => {
                setShowSchoolOnboardingModal(false);
                navigate('/', { replace: true });
              }}
              onSuccess={(schoolData, userData) => {
                setShowSchoolOnboardingModal(false);
                if (userData?.id) {
                  handleLogin(userData.id, false);
                } else {
                  navigate('/login', { replace: true });
                  window.location.reload();
                }
              }}
            />
          </Suspense>
        </div>
      );
    }

    if (location.pathname === '/') {
      const urlParams = new URLSearchParams(location.search);
      
      const hasSubdomain = (() => {
        if (typeof window === 'undefined') return false;
        const host = window.location.hostname;
        let sub = null;
        const mainDomains = ['.campus-groovelab.de', '.groovelab.de', '.campus-groovelab.com'];
        for (const domain of mainDomains) {
          if (host.endsWith(domain)) {
            sub = host.substring(0, host.length - domain.length);
            break;
          }
        }
        if (!sub) {
          const parts = host.split('.');
          if (parts.length >= 3) {
            const first = parts[0];
            if (first !== 'www' && first !== 'admin' && first !== 'campus-groovelab') {
              sub = first;
            }
          } else if (parts.length === 2 && parts[1] === 'localhost') {
            sub = parts[0];
          }
        }
        if (!sub) {
          sub = urlParams.get('school') || urlParams.get('subdomain');
        }
        return !!sub;
      })();

      const isParentOnboarding = urlParams.has('invite_school_id') || 
                                 urlParams.get('onboarding') === 'parent' || 
                                 urlParams.get('platform') === 'groovelab' ||
                                 hasSubdomain || 
                                 isKioskMode;
      if (isParentOnboarding) {
        return (
          <Suspense fallback={<DashboardLoader />}>
            <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />
          </Suspense>
        );
      }

      return (
        <Suspense fallback={<DashboardLoader />}>
          <Startseite 
            onLogin={() => navigate('/login?school=musaek-bs&groovelab=true')} 
            onRegister={(email) => navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')} 
            onShowPrivacy={() => setShowPrivacy(true)}
            onShowAgb={() => setShowAgb(true)}
            onShowImpressum={() => setShowImpressum(true)}
          />
          {renderLegalModals()}
        </Suspense>
      );
    }
    if (location.pathname === '/login') {
      return (
        <Suspense fallback={<DashboardLoader />}>
          <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<DashboardLoader />}>
        <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />
      </Suspense>
    );
  }

  if (showDeletionPrompt && deletionPromptUserId) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Kündigungs-Abfrage...</div>}>
        <ContractEndPrompt
          userId={deletionPromptUserId}
          isHome={deletionPromptIsHome}
          onDecisionComplete={(uid, home) => {
            setShowDeletionPrompt(false);
            setDeletionPromptUserId(null);
            handleLogin(uid, home);
          }}
          onCancel={() => {
            setShowDeletionPrompt(false);
            setDeletionPromptUserId(null);
          }}
        />
      </Suspense>
    );
  }

  if (loading || !user) {
    const debugError = typeof window !== 'undefined' ? (window as any).fetchDashboardDataError : null;
    const debugStack = typeof window !== 'undefined' ? (window as any).fetchDashboardDataStack : null;

    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#09090b', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column', 
        gap: '16px',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        {loading && (
          <div className="animate-spin" style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255, 255, 255, 0.05)', 
            borderTopColor: '#facc15', 
            borderRadius: '50%',
            marginBottom: '8px'
          }}></div>
        )}
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em', textAlign: 'center' }}>
          {loading ? 'Sitzung wird wiederhergestellt...' : 'Sitzungs-Daten konnten nicht geladen werden.'}
        </div>

        {debugError && (
          <div style={{ 
            marginTop: '20px', 
            color: '#ef4444', 
            fontSize: '12px', 
            textAlign: 'center', 
            maxWidth: '100%', 
            wordBreak: 'break-all',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px',
            borderRadius: '8px'
          }}>
            <strong>Fehlerdetails:</strong> {debugError}
            {debugStack && (
              <pre style={{ 
                marginTop: '10px', 
                fontSize: '10px', 
                color: '#f87171', 
                textAlign: 'left', 
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>{debugStack}</pre>
            )}
          </div>
        )}

        {/* Exit Hatch: allow manual reset if stuck or database is unreachable */}
        {(!loading || debugError) && (
          <button
            type="button"
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e) {}
              sessionStorage.removeItem('groovelab_user_id');
              sessionStorage.removeItem('groovelab_location_mode');
              localStorage.removeItem('groovelab_user_id');
              localStorage.removeItem('groovelab_location_mode');
              localStorage.removeItem('groovelab_cached_user');
              setLoggedInUserId(null);
              setUser(null);
              setLoading(false);
              window.location.reload();
            }}
            style={{
              marginTop: '24px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#a1a1aa',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            Sitzung zurücksetzen & neu anmelden
          </button>
        )}
      </div>
    );
  }

  // 2.5 MASTER ADMIN PORTAL — nur via is_master_admin DB-Flag
  // SECURITY: Niemals per Vorname oder Rolle erkennen — ausschließlich das is_master_admin-Flag aus der DB ist maßgeblich.
  if (isMasterAdminSession) {
    return (
      <>
        <Suspense fallback={<DashboardLoader />}>
          <MasterAdminDashboard onLogout={handleLogout} currentUser={{ ...user, is_master_admin: true }} />
        </Suspense>
        {showSchoolOnboardingModal && (
          <SchoolSelfOnboardingModal
            onClose={() => setShowSchoolOnboardingModal(false)}
            onSuccess={(schoolData, userData) => {
              setShowSchoolOnboardingModal(false);
              window.location.reload();
            }}
          />
        )}
      </>
    );
  }

  const handleSwitchActiveRole = async (newRole: string) => {
    try {
      const userId = user?.id;
      if (!userId) return;

      // 1. Transition local React state & cached user
      React.startTransition(() => {
        setUser((prevUser: any) => {
          if (!prevUser) return prevUser;
          const updated = { 
            ...prevUser, 
            role: newRole,
            is_ghost_mode: prevUser.is_ghost_mode ?? isGhostParam
          };
          try {
            sessionStorage.setItem('groovelab_cached_user', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      });

      if (isGhostParam) {
        sessionStorage.setItem('groovelab_ghost_active_role', newRole);
        sessionStorage.setItem('groovelab_support_ghost', 'true');
      }

      // 2. Await database role update FIRST before triggering platform/tab refetches
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) {
        console.warn('Role update in Supabase notice:', error.message);
      }

      // 3. Update active workspace and platform tabs
      if (newRole === 'teacher') {
        const schoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
        const schoolHasCampus = schoolObj?.has_campus_subscription ?? true;
        const schoolHasGroove = schoolObj?.has_groovelab_subscription ?? true;

        let targetPlatform: 'campus' | 'groovelab' = 'campus';
        const savedPlat = sessionStorage.getItem('groovelab_active_platform');
        if (savedPlat === 'groovelab' && schoolHasGroove) {
          targetPlatform = 'groovelab';
        } else if (!schoolHasCampus && schoolHasGroove) {
          targetPlatform = 'groovelab';
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('groovelab_active_workspace', 'teacher');
          localStorage.setItem('groovelab_active_workspace', 'teacher');
          sessionStorage.setItem('groovelab_active_platform', targetPlatform);
          localStorage.setItem('groovelab_active_platform', targetPlatform);
        }
        const startTab = targetPlatform === 'campus' 
          ? (typeof window !== 'undefined' ? (sessionStorage.getItem('campus_active_tab') || localStorage.getItem('campus_active_tab')) : null) || 'briefing'
          : (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_tab') || localStorage.getItem('groovelab_active_tab')) : null) || 'live';
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(targetPlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab', startTab);
          localStorage.setItem(targetPlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab', startTab);
        }
        React.startTransition(() => {
          setActivePlatform(targetPlatform);
          setActiveStudentTab(startTab);
        });
      } else if (newRole === 'admin' || newRole === 'secretary') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('groovelab_active_workspace', 'secretary');
          localStorage.setItem('groovelab_active_workspace', 'secretary');
          sessionStorage.setItem('groovelab_active_platform', 'campus');
          localStorage.setItem('groovelab_active_platform', 'campus');
          sessionStorage.setItem('campus_active_tab', 'briefing');
          localStorage.setItem('campus_active_tab', 'briefing');
        }
        React.startTransition(() => {
          setActivePlatform('campus');
          setActiveStudentTab('briefing');
        });
      }
    } catch (err: any) {
      console.warn('Fehler beim Rollenwechsel:', err);
    }
  };

  // 2.5b SECRETARY DASHBOARD BYPASS
  const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
  if ((user.role?.toLowerCase() === 'secretary' || user.role?.toLowerCase() === 'admin') && activeWorkspace !== 'teacher') {
    return (
      <ErrorBoundary>
        {isGhostParam && (
          <GhostSupportCapsule 
            schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
            currentRole={user?.role}
            onRoleChange={handleSwitchActiveRole}
          />
        )}
        <Suspense fallback={<DashboardLoader />}>
          <SecretaryDashboard 
            schoolId={user.school_id} 
            userId={user.id} 
            userRole={user.role}
            userRoles={user.roles}
            onLogout={handleLogout} 
            onRoleSwitched={handleSwitchActiveRole}
            activePlatform={activePlatform}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // 2.5c INACTIVE STUDENT MODULE ACCESS SECURITY GUARD
  if (user.role?.toLowerCase() === 'student') {
    const isCampusActive = user.is_campus_active === true;
    const isGroovelabActive = user.is_groovelab_active === true;

    // Case 1: Student has NO active modules -> Strictly block entry to GrooveLab & Campus dashboards, force QRLandingPage!
    if (!isCampusActive && !isGroovelabActive) {
      const tokenToUse = user.qr_token || user.ausweis_nummer || user.id;
      return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Campus Pass...</div>}>
          <QRLandingPage token={tokenToUse} />
        </Suspense>
      );
    }
  }

  // 2.6 DEACTIVATED / PAUSED SCHOOL CHECK
  if (isSchoolPaused) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#09090b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        padding: '24px',
        textAlign: 'center',
        fontFamily: '"Outfit", "Inter", sans-serif',
        zIndex: 9999
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '48px 32px',
          borderRadius: '32px',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <Clock size={40} color="#ef4444" className="animate-pulse" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Zugang pausiert
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 32px 0' }}>
            Diese Schule wurde vorübergehend deaktiviert. Schüler- und Lehrerprofile sind für die Dauer der Deaktivierung nicht nutzbar und es können keine Daten geladen oder gesendet werden.
          </p>
          <button
            onClick={() => handleLogout(false)}
            style={{
              padding: '14px 28px',
              borderRadius: '14px',
              background: '#ffffff',
              color: '#09090b',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}
            
            
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  // 3. MAIN DASHBOARD LOGIC (Resumes here after Auth/Loading checks)
  const calculateSkillXP = (skill: any) => {
    const prog = skill.progress || 0;
    if (skill.is_stage_ready || prog === 100) return 500;
    return prog * 2;
  };
 
  const myBands = userBands;

  const studentRadarData = (() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
    userSongs.forEach((s: any) => {
      const sInst = s.instrument?.toLowerCase();
      if (!sInst) return;
      
      let target: string | null = null;
      if (sInst === 'guitar' || sInst === 'e-gitarre') target = 'Guitar';
      else if (sInst === 'bass' || sInst === 'e-bass') target = 'Bass';
      else if (sInst === 'drums' || sInst === 'e-drums') target = 'Drums';
      else if (sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano') target = 'Keys';
      else if (sInst === 'vocals' || sInst === 'gesang') target = 'Vocals';
      
      if (target && radarBase[target] !== undefined) {
        radarBase[target] += calculateSkillXP(s);
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  })();

  const totalPracticeMins = totalPresenceMins + liveSessionMins;

  // Group userSongs by song_id
  const songIdsInPractice = Array.from(new Set(
    userSongs
      .filter((s: any) => s.progress < 100 || s.is_pending_approval)
      .map((s: any) => s.song_id)
  ));

  const practiceSongs = userSongs.filter((s: any) => songIdsInPractice.includes(s.song_id));
  const repertoireSongs = userSongs.filter((s: any) => {
    if (s.instrument === 'Vocals') return true; // All registered vocal songs are part of repertoire
    return s.progress === 100 && s.is_stage_ready && !s.is_pending_approval;
  });

  const groupSongs = (songs: any[]) => Object.values((songs || []).reduce((acc: any, skill: any) => {
    if (!skill || !skill.song_id) return acc;
    if (!acc[skill.song_id]) {
      const wallMatch = (wallSongs || []).find((ws: any) => ws?.song_id === skill.song_id && ws?.level === skill.difficulty_level);
      
      // Check if this is a band song
      const isBandSong = (userBands || []).some((b: any) => 
        b.song_id === skill.song_id || (b.band_songs || []).some((bs: any) => bs.song_id === skill.song_id)
      );

      acc[skill.song_id] = {
        song_id: skill.song_id,
        title: skill.title || 'Unbenannter Song',
        artist: skill.artist || 'Unbekannter Künstler',
        media_link: skill.media_link,
        tomplay_url: skill.tomplay_url,
        pdf_folder_url: skill.pdf_folder_url,
        guitar_pro_url: skill.guitar_pro_url,
        pdf_guitar_url: skill.pdf_guitar_url,
        pdf_bass_url: skill.pdf_bass_url,
        pdf_drums_url: skill.pdf_drums_url,
        pdf_keys_url: skill.pdf_keys_url,
        pdf_vocals_url: skill.pdf_vocals_url,
        playalong_url: skill.playalong_url,
        instrumentation: skill.instrumentation,
        isBandReady: wallMatch?.isComplete || false,
        isBandSong: isBandSong,
        skills: []
      };
    }
    // Deduplicate by instrument AND difficulty level AND part number
    if (!acc[skill.song_id].skills.find((s: any) => 
      s?.instrument === skill.instrument && 
      s?.difficulty_level === skill.difficulty_level &&
      (s?.part_number || 1) === (skill.part_number || 1)
    )) {
      acc[skill.song_id].skills.push(skill);
    }
    return acc;
  }, {}));

  const filteredPractice = (userSongs || []).filter((s: any) => {
    const term = practiceSearchQuery.toLowerCase();
    const matchesSearch = practiceSearchType === 'title' 
      ? (s.title || '').toLowerCase().includes(term)
      : (s.artist || '').toLowerCase().includes(term);
      
    const valForAlpha = practiceSearchType === 'title' ? (s.title || '') : (s.artist || '');
    const matchesAlpha = !practiceAlphaFilter 
      ? true 
      : valForAlpha.trim().toUpperCase().startsWith(practiceAlphaFilter);
      
    return matchesSearch && matchesAlpha;
  });

  const groupedPracticeSongs = groupSongs(filteredPractice);
  const groupedRepertoireSongs = groupSongs(repertoireSongs);
  const filteredLibrary = (globalSongs || []).filter((s: any) => {
    const term = librarySearchQuery.toLowerCase();
    const matchesSearch = librarySearchType === 'title' 
      ? (s.title || '').toLowerCase().includes(term)
      : (s.artist || '').toLowerCase().includes(term);
      
    const valForAlpha = librarySearchType === 'title' ? (s.title || '') : (s.artist || '');
    const matchesAlpha = !libraryAlphaFilter 
      ? true 
      : valForAlpha.trim().toUpperCase().startsWith(libraryAlphaFilter);
      
    return matchesSearch && matchesAlpha;
  }).sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'de-DE'));

  const getTeacherTheme = (name: string, userId: string) => {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('patrick')) {
      return {
        solidBg: '#f59e0b', solidBorder: '#d97706',
        lightBg: 'rgba(245, 158, 11, 0.12)', lightBorder: 'rgba(245, 158, 11, 0.5)', lightText: '#d97706'
      };
    }
    if (nameLower.includes('manuel')) {
      return {
        solidBg: '#ea4335', solidBorder: '#c62828',
        lightBg: 'rgba(234, 67, 53, 0.12)', lightBorder: 'rgba(234, 67, 53, 0.5)', lightText: '#ea4335'
      };
    }
    if (nameLower.includes('boris')) {
      return {
        solidBg: '#34a853', solidBorder: '#34a853',
        lightBg: 'rgba(52, 168, 83, 0.12)', lightBorder: 'rgba(52, 168, 83, 0.5)', lightText: '#34a853'
      };
    }
    
    const palettes = [
      { solidBg: '#3b82f6', solidBorder: '#2563eb', lightBg: 'rgba(59, 130, 246, 0.12)', lightBorder: 'rgba(59, 130, 246, 0.5)', lightText: '#2563eb' }, // Blue
      { solidBg: '#8b5cf6', solidBorder: '#7c3aed', lightBg: 'rgba(139, 92, 246, 0.12)', lightBorder: 'rgba(139, 92, 246, 0.5)', lightText: '#7c3aed' }, // Violet
      { solidBg: '#ec4899', solidBorder: '#db2777', lightBg: 'rgba(236, 72, 153, 0.12)', lightBorder: 'rgba(236, 72, 153, 0.5)', lightText: '#db2777' }, // Pink
      { solidBg: '#34a853', solidBorder: '#34a853', lightBg: 'rgba(52, 168, 83, 0.12)', lightBorder: 'rgba(52, 168, 83, 0.5)', lightText: '#34a853' }, // Teal
      { solidBg: '#f43f5e', solidBorder: '#e11d48', lightBg: 'rgba(244, 63, 94, 0.12)', lightBorder: 'rgba(244, 63, 94, 0.5)', lightText: '#e11d48' }, // Rose
    ];
    
    let hash = 0;
    for (let i = 0; i < nameLower.length; i++) {
      hash = nameLower.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  const getTeacherColorStyle = (teachersInSlot: any[], loggedInUserId: string | undefined) => {
    if (teachersInSlot.length > 1) {
      const containsMe = teachersInSlot.some(t => t.user_id === loggedInUserId);
      // Sort consistently by first_name to ensure same order of colors & initials (e.g. M+P)
      const sortedTeachers = [...teachersInSlot].sort((a, b) => {
        const nameA = a.profiles?.first_name || '';
        const nameB = b.profiles?.first_name || '';
        return nameA.localeCompare(nameB, 'de-DE');
      });
      const themes = sortedTeachers.map(t => {
        const name = (t.profiles?.first_name || '').toLowerCase();
        return getTeacherTheme(name, t.user_id || '');
      });
      const color1 = themes[0]?.solidBg || '#f59e0b';
      const color2 = themes[1]?.solidBg || '#34a853';
      const lightColor1 = themes[0]?.lightBg || 'rgba(245, 158, 11, 0.12)';
      const lightColor2 = themes[1]?.lightBg || 'rgba(52, 168, 83, 0.12)';

      if (containsMe) {
        return {
          bgColor: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
          border: '1px solid #cbd5e1',
          textColor: 'white'
        };
      } else {
        return {
          bgColor: `linear-gradient(135deg, ${lightColor1} 0%, ${lightColor2} 100%)`,
          border: '1px dashed #cbd5e1',
          textColor: '#475569'
        };
      }
    }

    const primaryTeacher = teachersInSlot[0];
    const teacherName = (primaryTeacher?.profiles?.first_name || '').toLowerCase();
    const isMe = primaryTeacher?.user_id === loggedInUserId;
    
    const theme = getTeacherTheme(teacherName, primaryTeacher?.user_id || '');

    if (isMe) {
      return {
        bgColor: theme.solidBg,
        border: `1px solid ${theme.solidBorder}`,
        textColor: 'white'
      };
    } else {
      return {
        bgColor: theme.lightBg,
        border: `1px dashed ${theme.lightBorder}`,
        textColor: theme.lightText
      };
    }
  };

  const getTeacherPresenceList = () => {
    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
    const hours = schoolData?.opening_hours || {};

    const dayKeys: { [key: string]: string } = {
      'Mo': 'monday',
      'Di': 'tuesday',
      'Mi': 'wednesday',
      'Do': 'thursday',
      'Fr': 'friday',
      'Sa': 'saturday',
      'So': 'sunday'
    };

    const teacherSlots = globalPlannedSlots.filter((s: any) => {
      const isRoleMatch = s.profiles?.role?.toLowerCase() === 'teacher' || 
                          s.profiles?.role?.toLowerCase() === 'admin';
      if (!isRoleMatch) return false;

      const dayKey = dayKeys[s.day];
      if (!dayKey) return false;
      const dayHours = hours[dayKey];
      if (!dayHours || dayHours.active === false) return false;

      return s.time >= dayHours.start && s.time < dayHours.end;
    });
    
    if (teacherSlots.length === 0) return [];

    const teacherGroups: { [userId: string]: { name: string; slots: { day: string; time: string }[] } } = {};
    
    teacherSlots.forEach((slot: any) => {
      const userId = slot.user_id;
      const name = slot.profiles?.first_name || 'Lehrer';
      if (!teacherGroups[userId]) {
        teacherGroups[userId] = { name, slots: [] };
      }
      teacherGroups[userId].slots.push({ day: slot.day, time: slot.time });
    });

    const presenceList: { teacherName: string; day: string; rangeStr: string; sortKey: number }[] = [];
    const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };

    Object.values(teacherGroups).forEach(group => {
      const slotsByDay: { [day: string]: string[] } = {};
      group.slots.forEach(s => {
        if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
        slotsByDay[s.day].push(s.time);
      });

      Object.entries(slotsByDay).forEach(([day, times]) => {
        times.sort();

        const add15 = (t: string) => {
          let [h, m] = t.split(':').map(Number);
          m += 15;
          if (m >= 60) { h += 1; m = 0; }
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        const toMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        const ranges: { start: string; end: string }[] = [];
        let currentRange: { start: string; end: string } | null = null;

        times.forEach(t => {
          if (!currentRange) {
            currentRange = { start: t, end: add15(t) };
          } else {
            if (toMin(t) === toMin(currentRange.end)) {
              currentRange.end = add15(t);
            } else {
              ranges.push(currentRange);
              currentRange = { start: t, end: add15(t) };
            }
          }
        });
        if (currentRange) ranges.push(currentRange);

        ranges.forEach(r => {
          presenceList.push({
            teacherName: group.name,
            day,
            rangeStr: `${r.start} Uhr - ${r.end} Uhr`,
            sortKey: (dayOrder[day] || 99) * 10000 + toMin(r.start)
          });
        });
      });
    });

    presenceList.sort((a, b) => a.sortKey - b.sortKey);
    return presenceList;
  };

  const school = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
  let trialDaysLeft = null;
  if (school?.is_trial && school?.trial_ends_at) {
    const end = new Date(school.trial_ends_at).getTime();
    const now = new Date().getTime();
    trialDaysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('groovelab_install_prompt_dismissed', String(Date.now()));
  };

  return (
    <DeviceSimulator>
      {isGhostParam && (
        <GhostSupportCapsule 
          schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
          currentRole={user?.role}
          onRoleChange={handleSwitchActiveRole}
        />
      )}
      {isMaintenanceLockoutActive && maintenanceState && (
        <MaintenanceLockoutOverlay 
          maintenanceState={maintenanceState} 
          onBypassUnlocked={() => setMaintenanceBypass(true)} 
          currentRole={user?.role}
          currentSchoolId={school?.id}
          activePlatform={activePlatform}
        />
      )}
      <GlobalBroadcastBanner announcement={broadcastAnnouncement} currentRole={user?.role} />
      {/* Soft Trial Pre-Expiry Warning Banner for Admin/Secretary (Days 27-30) */}
      {(user?.role === 'admin' || user?.role === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
          borderBottom: '1px solid #fde68a',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={16} color="#b45309" />
            <span style={{ fontSize: '0.84rem', fontWeight: 650, color: '#92400e' }}>
              Hinweis: Die 30-tägige Probezeit Ihrer Musikschule endet in <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tagen'}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTrialInfoModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.2)'
            }}
          >
            Jetzt ansehen &amp; freischalten
          </button>
        </div>
      )}
      {showPwaUpdateToast && (
        <PwaUpdateToast 
          onUpdate={() => window.location.replace(window.location.pathname + '?reload_manual=1')}
          onDismiss={() => setShowPwaUpdateToast(false)}
        />
      )}
      <OfflineStatusBadge />
      <div className="app-layout">
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toastMessage.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(16px)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            pointerEvents: 'auto',
            animation: 'slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setToastMessage(null)}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} color="#34a853" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {showInstallBanner && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '16px',
          right: '16px',
          margin: '0 auto',
          maxWidth: '440px',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          padding: '10px 14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'appleAlertScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'auto',
          boxSizing: 'border-box'
        }}>
          {/* App Icon (Actual App Logo) */}
          <img 
            src="/pwa-icon.png" 
            alt="App Logo" 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              objectFit: 'cover',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              flexShrink: 0
            }}
          />

          {/* 2-line Text content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              {activePlatform === 'campus' ? 'Campus App' : 'GrooveLab'} installieren
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 550, color: '#64748b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {typeof window !== 'undefined' ? window.location.hostname : 'groovelab.app'}
            </span>
          </div>

          {/* Action & Close buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) ? (
              <button 
                onClick={() => setShowInstallGuide(true)}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '30px',
                  transition: 'background 0.2s'
                }}
                className="hover-scale"
              >
                Anleitung
              </button>
            ) : deferredPrompt ? (
              <button 
                onClick={handleInstallPWA}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '30px',
                  transition: 'background 0.2s'
                }}
                className="hover-scale"
              >
                Installieren
              </button>
            ) : (
              <button 
                onClick={() => setShowInstallGuide(true)}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '30px',
                  transition: 'background 0.2s'
                }}
                className="hover-scale"
              >
                Anleitung
              </button>
            )}
            <button 
              onClick={handleDismissInstall}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
              title="Schließen"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showInstallGuide && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowInstallGuide(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative',
              animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)'
              }}>
                🎓
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                  Campus installieren
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 550, color: '#64748b' }}>
                  Für den Homescreen auf deinem Handy
                </span>
              </div>
            </div>

            {/* Instruction steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '8px 0' }}>
              {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream ? (
                // iOS Safari Instructions
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.08)',
                      color: '#34a853',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      1
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Tippe unten (auf dem iPad oben) im Safari-Browser auf das <strong>Teilen-Symbol</strong>.
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: '#007aff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        gap: '6px'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        Teilen-Symbol
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.08)',
                      color: '#34a853',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      2
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Scrolle nach unten und wähle <strong>Zum Home-Bildschirm</strong>.
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: '#334155',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Zum Home-Bildschirm
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.08)',
                      color: '#34a853',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      3
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Tippe oben rechts auf <strong>Hinzufügen</strong>.
                    </div>
                  </div>
                </>
              ) : (
                // Android/Chrome Instructions
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.08)',
                      color: '#34a853',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      1
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Tippe oben rechts im Browser auf das <strong>Menü-Symbol (3 Punkte)</strong>.
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: '#334155',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        gap: '6px'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                        Menü
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.08)',
                      color: '#34a853',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      2
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Wähle <strong>App installieren</strong> oder <strong>Zum Startbildschirm hinzufügen</strong>.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.08)',
                      color: '#34a853',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      3
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Bestätige die Installation.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Help / Tip Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '12px',
              fontSize: '0.8rem',
              color: '#475569',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                💡 App nicht auffindbar?
              </span>
              <span>
                {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream ? (
                  'Unter iOS landen neu hinzugefügte Apps manchmal nur in der App-Mediathek (ganz rechts). Du kannst das Symbol von dort einfach auf deinen Home-Bildschirm ziehen.'
                ) : (
                  'Einige Android-Launcher platzieren Apps direkt in der App-Übersicht (App Drawer). Suche dort nach "Campus", halte das Symbol gedrückt und ziehe es auf deinen Startbildschirm.'
                )}
              </span>
            </div>

            {/* Close Button */}
            <button 
              onClick={() => setShowInstallGuide(false)}
              style={{
                background: '#34a853',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
              className="hover-scale"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-nav .hover-scale { transition: all 0.2s ease !important; }
        .sidebar-nav .hover-scale:hover { 
          transform: translateX(4px); 
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
        @keyframes slideUpFade {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
      {/* Sidebar Navigation (iPad/Desktop) */}
      <aside className="sidebar-nav" style={{ display: windowWidth >= 1024 ? 'flex' : 'none' }}>
        <div className="sidebar-logo" style={{ padding: '8px 0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activePlatform === 'campus' ? (
            <>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                background: 'rgba(52, 168, 83, 0.08)', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.1)'
              }}>
                <GraduationCap size={24} color="#34a853" strokeWidth={3} />
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 900, 
                color: '#34a853',
                letterSpacing: '-0.02em'
              }}>Campus</div>
            </>
          ) : (
            <>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                background: '#fefce8', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.1)'
              }}>
                <Music size={24} color="#eab308" strokeWidth={3} />
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 900, 
                color: '#eab308',
                letterSpacing: '-0.02em'
              }}>GrooveLab</div>
            </>
          )}
        </div>

        <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {user.role?.toLowerCase() === 'student' ? (
            activePlatform === 'campus' ? (() => {
              const campusSettings = user?.schools?.opening_hours?.campus_settings || {};
              const showLeaderboard = campusSettings.show_leaderboard !== false;
              const flamesActive = campusSettings.flames_active !== false;

              const isBoardAllowedForChild = (boardId: string) => {
                if (campusStudentUiLevel === 'pro') return true;

                // Local override if parent configured it
                if (typeof window !== 'undefined') {
                  const override = localStorage.getItem(`campus_board_override_${boardId}`);
                  if (override === 'true') return true;
                  if (override === 'false') return false;
                }

                if (campusStudentUiLevel === 'junior') {
                  const juniorAllowed = ['briefing', 'homework_book', 'practice_board', 'events', 'settings'];
                  return juniorAllowed.includes(boardId);
                }
                return true;
              };

              const toggleBoardForChild = (boardId: string, e?: React.MouseEvent) => {
                if (e) e.stopPropagation();
                const current = isBoardAllowedForChild(boardId);
                const next = !current;
                localStorage.setItem(`campus_board_override_${boardId}`, String(next));
                if (boardId === 'messages') {
                  localStorage.setItem('campus_allow_chat', String(next));
                }
                if (boardId === 'campus_cup') {
                  localStorage.setItem('campus_allow_leaderboard', String(next));
                }
                if (user?.id) {
                  try {
                    supabase.from('users').update({
                      parent_permissions: {
                        ...(user?.parent_permissions || {}),
                        [`board_${boardId}`]: next
                      }
                    }).eq('id', user.id).then(() => {});
                  } catch(err) {}
                }
                window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId, allowed: next } }));
                setParentPermissionsVersion(v => v + 1);
              };

              const renderParentStatusPill = (boardId: string) => {
                if (!parentUnlocked) return null;
                const isAllowed = isBoardAllowedForChild(boardId);
                return (
                  <span
                    onClick={(e) => toggleBoardForChild(boardId, e)}
                    title={isAllowed ? 'Für Kind freigegeben (Klicken zum Sperren)' : 'Für Kind gesperrt (Klicken zum Freigeben)'}
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      minWidth: '22px',
                      borderRadius: '8px',
                      background: isAllowed ? '#dcfce7' : '#f1f5f9',
                      color: isAllowed ? '#16a34a' : '#64748b',
                      border: isAllowed ? '1px solid #86efac' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      boxShadow: isAllowed ? '0 1px 3px rgba(22, 163, 74, 0.12)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    {isAllowed ? <Check size={13} strokeWidth={3} /> : <Lock size={12} strokeWidth={2.5} />}
                  </span>
                );
              };

              return (
                <>
                  <button onClick={() => setActiveStudentTab('briefing')} className={`sidebar-item ${['briefing', 'profile'].includes(activeStudentTab) ? `active ${activePlatform}` : ''}`}>
                    <Monitor size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Briefing</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('homework_book')} className={`sidebar-item ${activeStudentTab === 'homework_book' ? `active ${activePlatform}` : ''}`}>
                    <BookOpen size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Aufgaben</span>
                  </button>
                  {(parentUnlocked || (flamesActive && isBoardAllowedForChild('practice_board'))) && (
                    <button 
                      onClick={() => setActiveStudentTab('practice_board')} 
                      className={`sidebar-item ${activeStudentTab === 'practice_board' ? `active ${activePlatform}` : ''}`}
                      style={{ opacity: parentUnlocked && !isBoardAllowedForChild('practice_board') ? 0.72 : 1 }}
                    >
                      <Zap size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Übe-Pfad</span>
                      {renderParentStatusPill('practice_board')}
                    </button>
                  )}
                  {(parentUnlocked || isBoardAllowedForChild('mediathek')) && (
                    <button 
                      onClick={() => setActiveStudentTab('mediathek')} 
                      className={`sidebar-item ${activeStudentTab === 'mediathek' ? `active ${activePlatform}` : ''}`}
                      style={{ opacity: parentUnlocked && !isBoardAllowedForChild('mediathek') ? 0.72 : 1 }}
                    >
                      <Library size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mediathek</span>
                      {renderParentStatusPill('mediathek')}
                    </button>
                  )}
                  {(parentUnlocked || isBoardAllowedForChild('events')) && (
                    <button 
                      onClick={() => setActiveStudentTab('events')} 
                      className={`sidebar-item ${activeStudentTab === 'events' ? `active ${activePlatform}` : ''}`}
                      style={{ opacity: parentUnlocked && !isBoardAllowedForChild('events') ? 0.72 : 1 }}
                    >
                      <Calendar size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Termine</span>
                      {renderParentStatusPill('events')}
                    </button>
                  )}
                  {(parentUnlocked || (showLeaderboard && isBoardAllowedForChild('campus_cup'))) && (
                    <button 
                      onClick={() => setActiveStudentTab('campus_cup')} 
                      className={`sidebar-item ${activeStudentTab === 'campus_cup' ? `active ${activePlatform}` : ''}`}
                      style={{ opacity: parentUnlocked && !isBoardAllowedForChild('campus_cup') ? 0.72 : 1 }}
                    >
                      <Trophy size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Highlights &amp; Fortschritt</span>
                      {renderParentStatusPill('campus_cup')}
                    </button>
                  )}

                  {(parentUnlocked || isBoardAllowedForChild('messages')) && (
                    <button 
                      onClick={() => setActiveStudentTab('messages')} 
                      className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`} 
                      style={{ opacity: parentUnlocked && !isBoardAllowedForChild('messages') ? 0.72 : 1, position: 'relative' }}
                    >
                      <Mail size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nachrichten</span>
                      {campusUnreadCount > 0 && !parentUnlocked && (
                        <div style={{ 
                          background: '#ef4444', 
                          color: 'white', 
                          borderRadius: '50%', 
                          minWidth: '18px', 
                          height: '18px', 
                          padding: '0 5px', 
                          fontSize: '0.65rem', 
                          fontWeight: 900, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          marginLeft: 'auto', 
                          boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' 
                        }}>{campusUnreadCount}</div>
                      )}
                      {renderParentStatusPill('messages')}
                    </button>
                  )}
                  <button onClick={() => setActiveStudentTab('settings')} className={`sidebar-item ${activeStudentTab === 'settings' ? `active ${activePlatform}` : ''}`}>
                    {(campusStudentUiLevel === 'junior' || campusStudentUiLevel === 'teen') && !parentUnlocked ? (
                      <>
                        <ShieldCheck size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Elternbereich</span>
                      </>
                    ) : (
                      <>
                        <Settings size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Einstellungen</span>
                      </>
                    )}
                  </button>
                </>
              );
            })()
            : activePlatform === 'ensembles' ? (
              <>
                <button onClick={() => setActiveStudentTab('overview')} className={`sidebar-item ${activeStudentTab === 'overview' ? `active ${activePlatform}` : ''}`}>
                  <Users size={20} /> Ensembles & Bands
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? `active ${activePlatform}` : ''}`} style={{ position: 'relative' }}>
                  <Monitor size={20} /> Live Lab
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', marginLeft: 'auto', flexShrink: 0 }} className="animate-pulse"></div>
                </button>

                {/* Only for instrumentalists */}
                {!user.is_external_vocalist && (
                  <>
                    <button onClick={() => setActiveStudentTab('practice')} className={`sidebar-item ${activeStudentTab === 'practice' ? `active ${activePlatform}` : ''}`}>
                      <Play size={20} fill={activeStudentTab === 'practice' ? 'white' : 'none'} /> Üben
                    </button>
                    <button onClick={() => setActiveStudentTab('library')} className={`sidebar-item ${activeStudentTab === 'library' ? `active ${activePlatform}` : ''}`}>
                      <Library size={20} /> Bibliothek
                    </button>
                  </>
                )}

                <button onClick={() => setActiveStudentTab('repertoire')} className={`sidebar-item ${activeStudentTab === 'repertoire' ? `active ${activePlatform}` : ''}`}>
                  <Award size={20} /> Repertoire
                </button>

                {!user.is_external_vocalist && (
                  <button onClick={() => setActiveStudentTab('matching')} className={`sidebar-item ${activeStudentTab === 'matching' ? `active ${activePlatform}` : ''}`}>
                    <Users size={20} /> Band-Matching
                  </button>
                )}

                <button onClick={() => setActiveStudentTab('bands')} className={`sidebar-item ${activeStudentTab === 'bands' ? `active ${activePlatform}` : ''}`}>
                  <Box size={20} /> Bands
                </button>

                <button onClick={() => setActiveStudentTab('messages')} className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`} style={{ position: 'relative' }}>
                  <Megaphone size={20} /> Nachrichten
                  {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length > 0 && (
                    <div style={{ 
                      background: '#ef4444', 
                      color: 'white', 
                      borderRadius: '50%', 
                      minWidth: '18px', 
                      height: '18px', 
                      padding: '0 5px',
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginLeft: 'auto',
                      boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                    }}>{studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}</div>
                  )}
                </button>
              </>
            )
          ) : (
            activePlatform === 'campus' ? (
              <>
                <button onClick={() => setActiveStudentTab('briefing')} className={`sidebar-item ${activeStudentTab === 'briefing' ? `active ${activePlatform}` : ''}`} style={{ position: 'relative' }}>
                  <Monitor size={20} /> Briefing
                </button>
                <button onClick={() => setActiveStudentTab('schedule')} className={`sidebar-item ${activeStudentTab === 'schedule' ? `active ${activePlatform}` : ''}`}>
                  <Calendar size={20} /> Stundenplan
                </button>
                <button onClick={() => setActiveStudentTab('events')} className={`sidebar-item ${activeStudentTab === 'events' ? `active ${activePlatform}` : ''}`}>
                  <Calendar size={20} /> Termine
                </button>
                <button onClick={() => setActiveStudentTab('messages')} className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`} style={{ position: 'relative' }}>
                  <Mail size={20} /> Nachrichten
                  {campusUnreadCount > 0 && (
                    <div style={{ 
                      background: '#ef4444', 
                      color: 'white', 
                      borderRadius: '50%', 
                      minWidth: '18px', 
                      height: '18px', 
                      padding: '0 5px',
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginLeft: 'auto',
                      boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                    }}>{campusUnreadCount}</div>
                  )}
                </button>
                <button onClick={() => setActiveStudentTab('students')} className={`sidebar-item ${activeStudentTab === 'students' ? `active ${activePlatform}` : ''}`}>
                  <Users size={20} /> Schüler
                </button>
                <button onClick={() => setActiveStudentTab('songs')} className={`sidebar-item ${activeStudentTab === 'songs' ? `active ${activePlatform}` : ''}`}>
                  <Library size={20} /> Mediathek
                </button>
                <button onClick={() => setActiveStudentTab('rooms')} className={`sidebar-item ${activeStudentTab === 'rooms' ? `active ${activePlatform}` : ''}`}>
                  <Box size={20} /> Räume
                </button>
                {showMissionsFeature && (
                  <button onClick={() => setActiveStudentTab('missions')} className={`sidebar-item ${activeStudentTab === 'missions' ? `active ${activePlatform}` : ''}`}>
                    <Compass size={20} /> Missions
                  </button>
                )}
                <button onClick={() => setActiveStudentTab('stats')} className={`sidebar-item ${activeStudentTab === 'stats' ? `active ${activePlatform}` : ''}`}>
                  <Trophy size={20} /> Highlights & Fortschritt
                </button>
                <button onClick={() => setActiveStudentTab('setup')} className={`sidebar-item ${activeStudentTab === 'setup' ? `active ${activePlatform}` : ''}`}>
                  <Settings size={20} /> Einstellungen
                </button>
              </>
            ) : activePlatform === 'ensembles' ? (
              <>
                <button onClick={() => setActiveStudentTab('overview')} className={`sidebar-item ${activeStudentTab === 'overview' ? `active ${activePlatform}` : ''}`}>
                  <Users size={20} /> Ensembles & Bands
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? `active ${activePlatform}` : ''}`} style={{ position: 'relative' }}>
                  <Monitor size={20} /> Live Lab
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', marginLeft: 'auto', flexShrink: 0 }} className="animate-pulse"></div>
                </button>
                {school?.has_campus_subscription && (
                  <button onClick={() => setActiveStudentTab('messages')} className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`}>
                    <Mail size={20} /> Nachrichten
                  </button>
                )}
                <button onClick={() => setActiveStudentTab('students')} className={`sidebar-item ${activeStudentTab === 'students' ? `active ${activePlatform}` : ''}`}>
                  <Users size={20} /> Schüler
                </button>
                <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? `active ${activePlatform}` : ''}`}>
                  <Shield size={20} /> Team
                </button>
                {(school?.has_campus_subscription || school?.has_groovelab_subscription) && (
                  <button onClick={() => setActiveStudentTab('rooms')} className={`sidebar-item ${activeStudentTab === 'rooms' ? `active ${activePlatform}` : ''}`}>
                    <Box size={20} /> Räume
                  </button>
                )}
                <button onClick={() => setActiveStudentTab('songs')} className={`sidebar-item ${activeStudentTab === 'songs' ? `active ${activePlatform}` : ''}`}>
                  <Library size={20} /> Songs
                </button>
                <button onClick={() => setActiveStudentTab('bands')} className={`sidebar-item ${activeStudentTab === 'bands' ? `active ${activePlatform}` : ''}`}>
                  <Box size={20} /> Bands
                </button>
                <button onClick={() => setActiveStudentTab('stats')} className={`sidebar-item ${activeStudentTab === 'stats' ? `active ${activePlatform}` : ''}`}>
                  <Music size={20} /> Statistik
                </button>
                <button onClick={() => setActiveStudentTab('gallery')} className={`sidebar-item ${activeStudentTab === 'gallery' ? `active ${activePlatform}` : ''}`}>
                  <QrCode size={20} /> ID Galerie
                </button>
                <button onClick={() => setActiveStudentTab('setup')} className={`sidebar-item ${activeStudentTab === 'setup' ? `active ${activePlatform}` : ''}`}>
                  <Settings size={20} /> Einstellungen
                </button>
              </>
            )
          )}
        </nav>

        <div style={{ 
          marginTop: 'auto', 
          borderTop: '1px solid #f1f5f9', 
          padding: '20px 12px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Profile Card wrapper (clickable to open profile) */}
          <button 
            type="button"
            onClick={() => setActiveStudentTab('profile')} 
            style={{ 
              width: '100%',
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: '8px', 
              padding: '14px 12px', 
              borderRadius: '16px', 
              border: activeStudentTab === 'profile'
                ? (activePlatform === 'campus' ? '2.5px solid #34a853' : '2.5px solid #eab308')
                : '1px solid #e2e8f0', 
              background: activeStudentTab === 'profile'
                ? (activePlatform === 'campus' ? '#e6f4ea' : '#fefce8')
                : '#f8fafc',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '58px', 
                height: '58px', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '2.5px solid white', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
              }}>
                <StudioAvatar 
                  src={user.photo_url} 
                  user={{
                    ...user,
                    resolved_instrument: user.resolved_instrument || user.instrument || (teachers.find(t => t.id === user.teacher_id)?.instrument) || (teachers[0]?.instrument) || 'Gitarre'
                  }} 
                  activePlatform={activePlatform} 
                  onClick={() => setActiveStudentTab('profile')} 
                />
              </div>
              {session && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: -2, 
                  right: -2, 
                  width: '12px', 
                  height: '12px', 
                  background: activePlatform === 'campus' ? '#34a853' : '#eab308', 
                  borderRadius: '50%', 
                  border: '2px solid white' 
                }} />
              )}
            </div>

            {/* Name & Role centered underneath (Complete readable name, no truncate) */}
            <div style={{ minWidth: 0, width: '100%' }}>
              <div style={{ 
                fontWeight: 800, 
                fontSize: '0.88rem', 
                lineHeight: 1.25,
                color: '#0f172a', 
                whiteSpace: 'normal', 
                wordBreak: 'break-word',
                textAlign: 'center',
                marginBottom: '3px'
              }}>
                {user.role === 'student' ? 'Mein Profil' : formatTeacherFullName(user.first_name, user.last_name)}
              </div>
              <div style={{ 
                fontSize: '0.66rem', 
                fontWeight: 800, 
                color: '#64748b', 
                textTransform: 'uppercase', 
                letterSpacing: '0.04em',
                textAlign: 'center'
              }}>
                {activePlatform === 'campus'
                  ? (user.role === 'admin' ? 'Campus Admin' : user.role === 'teacher' ? 'Campus Lehrkraft' : user.role === 'secretary' ? 'Campus Verwaltung' : 'Campus Schüler')
                  : (user.role === 'admin' ? 'Groovelab Admin' : user.role === 'teacher' ? 'Groovelab Lehrer' : user.role === 'secretary' ? 'Groovelab Verwaltung' : (user.role === 'student' ? 'groovelab' : 'Groovelab Schüler'))}
              </div>
            </div>
          </button>

          {/* Leitfäden & Akademie Button */}
          <button 
            type="button"
            onClick={() => setIsGlobalHelpCenterOpen(true)}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              padding: '11px 14px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              background: '#f8fafc', 
              color: '#334155', 
              fontWeight: 800, 
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale"
            title="Leitfäden & Akademie öffnen"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <BookOpen size={16} color="#64748b" strokeWidth={2} /> Leitfäden &amp; Akademie
          </button>

          {/* Ausweis button (Hero CTA) */}
          {(user?.qr_token || user?.teacher_qr_token) && (() => {
            const isPureAdminOrSec = (user?.role === 'admin' || user?.role === 'secretary') && (!user?.roles || !user.roles.includes('teacher'));
            const themeGreen = activePlatform === 'campus' || (!isPureAdminOrSec && activePlatform !== 'ensembles' && activePlatform !== 'groovelab');
            const buttonBorder = isPureAdminOrSec 
              ? '1.2px solid rgba(234, 67, 53, 0.25)'
              : themeGreen
                ? '1.2px solid #bbf7d0' 
                : activePlatform === 'ensembles' 
                  ? '1.2px solid #bfdbfe' 
                  : '1.2px solid #fef08a';

            const buttonBg = isPureAdminOrSec 
              ? '#fef2f2'
              : themeGreen 
                ? '#f0fdf4' 
                : activePlatform === 'ensembles' 
                  ? '#eff6ff' 
                  : '#fefce8';

            const buttonColor = isPureAdminOrSec 
              ? '#b91c1c'
              : themeGreen 
                ? '#166534' 
                : activePlatform === 'ensembles' 
                  ? '#1d4ed8' 
                  : '#854d0e';

            return (
              <button 
                type="button"
                onClick={() => setShowQR(true)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px', 
                  padding: '11px 14px', 
                  borderRadius: '12px', 
                  border: buttonBorder, 
                  background: buttonBg, 
                  color: buttonColor, 
                  fontWeight: 800, 
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale"
                title="Digitalen Ausweis öffnen"
              >
                <QrCode size={16} color={buttonColor} strokeWidth={2.2} /> Ausweis zeigen
              </button>
            );
          })()}

          {/* Abmelden button (De-escalated Clean Ghost Button) */}
          <button 
            type="button"
            onClick={() => handleLogout(true, true)}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '7px', 
              padding: '9px 12px', 
              borderRadius: '10px', 
              border: '1px solid transparent', 
              background: 'transparent', 
              color: '#94a3b8', 
              fontWeight: 700, 
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            title="Sicher von Campus-Groovelab abmelden"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = '#fecdd3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <LogOut size={14} strokeWidth={2} /> Abmelden
          </button>
          
          {/* Legal Links under logout (Single clean balanced row) */}
          <div style={{ 
            marginTop: '2px', 
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px', 
            fontSize: '10px', 
            fontWeight: 700, 
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            width: '100%',
            userSelect: 'none'
          }}>
            <span 
              onClick={() => setShowPrivacy(true)} 
              style={{ cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              Datenschutz
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span 
              onClick={() => setShowAgb(true)} 
              style={{ cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              AGB
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span 
              onClick={() => setShowImpressum(true)} 
              style={{ cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              Impressum
            </span>
          </div>
        </div>
      </aside>

      <div className={`main-wrapper ${activeStudentTab === 'live' ? 'live-tab-active' : ''}`} style={{ paddingTop: '0' }}>
        <MobileTopHeader
          user={user}
          activePlatform={activePlatform as 'campus' | 'groovelab' | 'admin'}
          setActivePlatform={(p) => setActivePlatform(p)}
          unreadCount={campusUnreadCount}
        />
        <header className="header desktop-only-header" style={{ display: windowWidth <= 768 ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', height: '56px', background: 'transparent' }}>
          {/* App Switcher Tabs */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            gap: windowWidth <= 640 ? '2px' : (windowWidth <= 1024 ? '4px' : '6px'), 
            height: '100%',
            paddingTop: '10px',
            boxSizing: 'border-box'
          }}>
            {/* Campus Tab */}
            {school && (school.has_campus_subscription || !school.is_billing_booked) && user?.is_campus_active && (
              <div 
                onClick={() => {
                  const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                  const isStudent = user?.role === 'student';
                  if (isStudent && locationMode === 'lab' && isKioskMode && !isCampusUnlocked) {
                    setShowCampusPinPrompt(true);
                    return;
                  }
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('campus');
                  const startTab = user?.role === 'teacher' 
                    ? (sessionStorage.getItem('campus_active_tab') || 'briefing') 
                    : (isStaff ? 'live' : 'briefing');
                  setActiveStudentTab(startTab);
                  sessionStorage.setItem('campus_active_tab', startTab);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: windowWidth <= 640 ? '6px 10px 4px' : (windowWidth <= 1024 ? '10px 14px 8px' : '12px 22px 10px'),
                  borderRadius: '12px 12px 0 0',
                  background: activePlatform === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.05)',
                  color: activePlatform === 'campus' ? '#ffffff' : '#34a853',
                  border: activePlatform === 'campus' ? '1px solid #34a853' : '1px solid rgba(52, 168, 83, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: windowWidth <= 768 ? '0.75rem' : '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activePlatform === 'campus' ? 2 : 1,
                  transform: activePlatform === 'campus' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activePlatform === 'campus' ? '0 -4px 16px rgba(52, 168, 83, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: windowWidth <= 768 ? '36px' : '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <GraduationCap size={15} color={activePlatform === 'campus' ? '#ffffff' : '#34a853'} />
                {windowWidth > 640 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {locationMode === 'lab' && user?.role === 'student' && activePlatform !== 'campus' && (
                      <Lock size={12} style={{ color: 'inherit' }} />
                    )}
                    Campus
                  </span>
                )}
              </div>
            )}

            {school && (school.has_groovelab_subscription || !school.is_billing_booked) && user?.is_groovelab_active && (
              <div 
                onClick={() => {
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('groovelab');
                  const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                  if (isStaff) {
                    setLocationMode('lab');
                    sessionStorage.setItem('groovelab_location_mode', 'lab');
                  }
                  const startTab = sessionStorage.getItem('groovelab_active_tab') || 'live';
                  setActiveStudentTab(startTab);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: windowWidth <= 640 ? '6px 10px 4px' : (windowWidth <= 1024 ? '10px 14px 8px' : '12px 22px 10px'),
                  borderRadius: '12px 12px 0 0',
                  background: activePlatform === 'groovelab' ? '#facc15' : 'rgba(250, 204, 21, 0.05)',
                  color: activePlatform === 'groovelab' ? '#09090b' : '#eab308',
                  border: activePlatform === 'groovelab' ? '1px solid #facc15' : '1px solid rgba(250, 204, 21, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: windowWidth <= 768 ? '0.75rem' : '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activePlatform === 'groovelab' ? 2 : 1,
                  transform: activePlatform === 'groovelab' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activePlatform === 'groovelab' ? '0 -4px 16px rgba(250, 204, 21, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: windowWidth <= 768 ? '36px' : '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <Music size={15} color={activePlatform === 'groovelab' ? '#09090b' : '#eab308'} />
                {windowWidth > 640 && <span>GrooveLab</span>}
              </div>
            )}

            {/* Ensemble & Bands Tab */}
            {showEnsemblesFeature && (
              <div 
                onClick={() => {
                  setActivePlatform('ensembles');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: windowWidth <= 640 ? '6px 10px 4px' : (windowWidth <= 1024 ? '10px 14px 8px' : '12px 22px 10px'),
                  borderRadius: '12px 12px 0 0',
                  background: activePlatform === 'ensembles' ? '#3b82f6' : 'rgba(59, 130, 246, 0.05)',
                  color: activePlatform === 'ensembles' ? '#ffffff' : '#3b82f6',
                  border: activePlatform === 'ensembles' ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: windowWidth <= 768 ? '0.75rem' : '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activePlatform === 'ensembles' ? 2 : 1,
                  transform: activePlatform === 'ensembles' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activePlatform === 'ensembles' ? '0 -4px 16px rgba(59, 130, 246, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: windowWidth <= 768 ? '36px' : '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <Users size={15} color={activePlatform === 'ensembles' ? '#ffffff' : '#3b82f6'} />
                {windowWidth > 640 && <span>Ensembles & Bands</span>}
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: windowWidth <= 1024 ? '16px' : '28px',
            marginLeft: windowWidth <= 1024 ? '24px' : '48px'
          }}>
            {/* Status Pills */}
            {windowWidth <= 640 ? (
              <button
                onClick={() => setShowMobileInfo(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.08)' : (activePlatform === 'ensembles' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(250, 204, 21, 0.08)'),
                  border: `1px solid ${activePlatform === 'campus' ? '#34a853' : (activePlatform === 'ensembles' ? '#3b82f6' : '#facc15')}30`,
                  color: activePlatform === 'campus' ? '#34a853' : (activePlatform === 'ensembles' ? '#3b82f6' : '#eab308'),
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  borderWidth: '1px',
                  padding: 0,
                  outline: 'none'
                }}
              >
                <Info size={18} />
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth <= 768 ? '4px' : '8px' }}>
                {isOfflineMode && (
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                    padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                    color: 'white'
                  }}>
                    <AlertCircle size={14} color="white" />
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Offline Modus
                    </span>
                  </div>
                )}
                  {/* Interactive 30-Tage Trial Pill */}
                  {(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && (
                    <button
                      type="button"
                      onClick={() => setShowTrialInfoModal(true)}
                      title="Klicken für Details zur 30-Tage Probezeit"
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                        padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                      }}
                    >
                      <AlertCircle size={14} color="white" />
                      <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {trialDaysLeft > 0 
                          ? `Probezeit: ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag' : 'Tage'}`
                          : 'Probezeit abgelaufen'}
                      </span>
                    </button>
                  )}


                  {/* Unified School, Teacher, Student, Admin & Secretary Pill */}
                  {(() => {
                    const badgeBaseStyle: React.CSSProperties = {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(59, 130, 246, 0.04)',
                      height: windowWidth <= 768 ? '36px' : '40px',
                      padding: windowWidth <= 768 ? '0 12px' : '0 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(59, 130, 246, 0.12)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    };
                    const textStyle: React.CSSProperties = {
                      fontWeight: 750,
                      fontSize: '0.76rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    };

                    if (activePlatform === 'groovelab') {
                      return (
                        <div style={badgeBaseStyle}>
                          <span style={textStyle}>
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <School size={14} color="#ef4444" />
                              <span>
                                {school?.name || 'Meine Musikschule'}
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    } else if (user?.role === 'student') {
                      return (
                        <div style={badgeBaseStyle}>
                          <span style={textStyle}>
                            {windowWidth > 768 && (
                              <>
                                <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <School size={14} color="#ef4444" />
                                  <span>
                                    {school?.name || 'Meine Musikschule'}
                                  </span>
                                </span>
                                <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                                <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={14} color="#3b82f6" />
                                  <span>
                                    {(() => {
                                      const matchedTeacher = teachers.find(t => t.id === user.teacher_id) || (teachers.length > 0 ? teachers[0] : null);
                                      return formatTeacherFullName(matchedTeacher, matchedTeacher?.last_name);
                                    })()}
                                  </span>
                                </span>
                                <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                              </>
                            )}
                            <span style={{ color: '#34a853', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>
                                {user?.first_name ? user.first_name.toUpperCase() : 'CAMPUS SCHÜLER'}
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    } else if (user?.role === 'teacher') {
                      return (
                        <div style={badgeBaseStyle}>
                          <span style={textStyle}>
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <School size={14} color="#ef4444" />
                              <span>
                                {windowWidth <= 768 
                                  ? getInitials(school?.name === 'Testlauf' ? 'Testlauf' : (school?.name || 'Meine Musikschule')) 
                                  : (school?.name === 'Testlauf' ? 'Testlauf' : (school?.name || 'Meine Musikschule'))}
                              </span>
                            </span>
                            <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                            <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={14} color="#3b82f6" />
                              <span>
                                {windowWidth <= 768 
                                  ? getInitials(`${user.first_name} ${user.last_name}`) 
                                  : `${user.first_name} ${user.last_name}`}
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div style={badgeBaseStyle}>
                          <span style={textStyle}>
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <School size={14} color="#ef4444" />
                              <span>
                                {windowWidth <= 768 
                                  ? getInitials(school?.name || 'Meine Musikschule') 
                                  : (school?.name || 'Meine Musikschule')}
                              </span>
                            </span>
                            <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                            <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={14} color="#3b82f6" />
                              <span>
                                {windowWidth <= 768 
                                  ? `${getInitials(`${user.first_name} ${user.last_name}`)} • ${user?.role === 'admin' ? 'AD' : 'VW'}`
                                  : `${user.first_name} ${user.last_name} • ${user?.role === 'admin' ? 'CAMPUS ADMIN' : 'CAMPUS VERWALTUNG'}`}
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {/* Location Pill */}
                  {activePlatform === 'groovelab' && (() => {
                    const getContrastColor = (hex: string) => {
                      if (!hex || !hex.startsWith('#')) return '#ffffff';
                      const cleanHex = hex.replace('#', '');
                      if (cleanHex.length !== 6) return '#ffffff';
                      const r = parseInt(cleanHex.substring(0, 2), 16);
                      const g = parseInt(cleanHex.substring(2, 4), 16);
                      const b = parseInt(cleanHex.substring(4, 6), 16);
                      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                      return (yiq >= 170) ? '#0f172a' : '#ffffff';
                    };

                    const stationName = locationMode === 'lab' 
                      ? (session?.stations?.name || ((user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') ? 'Lehrer iPad' : 'Labor iPad'))
                      : 'Home';
                    
                    const isTeacherStation = stationName.toLowerCase().includes('lehrer');
                    const stationColor = locationMode === 'lab' ? (session?.stations?.color || '#10b981') : '#64748b';
                    const stationNumber = stationName.replace(/[^0-9]/g, '');
                    const hasNumber = stationNumber.length > 0;
                    
                    const isHome = locationMode !== 'lab';
                    const badgeColor = isTeacherStation ? '#34a853' : stationColor;
                    const displayBg = isHome 
                      ? 'rgba(100, 116, 139, 0.06)' 
                      : `${badgeColor}12`;
                    const displayBorder = isHome
                      ? '1px solid rgba(100, 116, 139, 0.12)'
                      : `1px solid ${badgeColor}25`;
                    const displayColor = isHome
                      ? '#64748b'
                      : badgeColor;

                    return (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: displayBg, 
                        border: displayBorder,
                        padding: '6px 12px', 
                        borderRadius: '10px', 
                        color: displayColor,
                        height: '36px',
                        boxSizing: 'border-box',
                        boxShadow: 'none',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}>
                        {isHome ? (
                          <MapPin size={14} style={{ opacity: 0.8 }} />
                        ) : (
                          <Tablet size={14} style={{ color: displayColor }} />
                        )}
                        
                        <span style={{ 
                          fontWeight: 750, 
                          fontSize: '0.75rem', 
                          letterSpacing: '-0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {isHome ? (
                            'Home'
                          ) : isTeacherStation ? (
                            'Lehrer'
                          ) : (
                            <>
                              <span style={{ color: displayColor, fontWeight: 750 }}>iPad</span>
                              {hasNumber ? (
                                <span style={{ 
                                  background: `${displayColor}20`, 
                                  color: displayColor, 
                                  borderRadius: '6px', 
                                  padding: '2px 6px', 
                                  fontSize: '0.7rem', 
                                  fontWeight: 800,
                                  lineHeight: 1,
                                  minWidth: '16px',
                                  textAlign: 'center'
                                }}>
                                  {stationNumber}
                                </span>
                              ) : (
                                <span style={{ color: displayColor }}>{stationName}</span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Lab Count Pill */}
                  {activePlatform === 'groovelab' && (() => {
                    const getContrastColor = (hex: string) => {
                      if (!hex || !hex.startsWith('#')) return '#ffffff';
                      const cleanHex = hex.replace('#', '');
                      if (cleanHex.length !== 6) return '#ffffff';
                      const r = parseInt(cleanHex.substring(0, 2), 16);
                      const g = parseInt(cleanHex.substring(2, 4), 16);
                      const b = parseInt(cleanHex.substring(4, 6), 16);
                      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                      return (yiq >= 170) ? '#0f172a' : '#ffffff';
                    };

                    const themeColor = (activePlatform as string) === 'campus' ? '#34a853' : '#eab308';
                    const displayBg = `${themeColor}12`;
                    const displayBorder = `1px solid ${themeColor}25`;
                    const displayColor = themeColor;
                    
                    return (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: displayBg, 
                        border: displayBorder, 
                        padding: '6px 12px', 
                        borderRadius: '10px', 
                        height: '36px',
                        boxSizing: 'border-box',
                        boxShadow: 'none',
                        transition: 'all 0.2s ease',
                        color: displayColor,
                        flexShrink: 0
                      }}>
                        <Users size={14} style={{ color: displayColor }} />
                        <span style={{ 
                          fontWeight: 750, 
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ 
                            background: `${displayColor}20`,
                            color: displayColor,
                            borderRadius: '6px',
                            padding: '2px 5px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            lineHeight: 1
                          }}>
                            {activeStudentsCount}
                          </span>
                          {windowWidth > 576 ? 'im Lab' : 'Lab'}
                        </span>
                      </div>
                    );
                  })()}
              </div>
            )}

            {/* Removed header Ausweis button (moved to sidebar) */}

            {/* User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth <= 1024 ? '8px' : '16px', paddingLeft: windowWidth <= 1024 ? '8px' : '16px', borderLeft: '1px solid #f1f5f9' }}>
              {windowWidth > 1024 && activePlatform !== 'campus' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>Hallo {user.first_name}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {user.role === 'admin' ? 'Groovelab Admin' : user.role === 'teacher' ? 'Groovelab Lehrer' : user.role === 'secretary' ? 'Groovelab Verwaltung' : 'Groovelab Schüler'}
                  </div>
                </div>
              )}

              {/* Must-Have 2b: Sibling / Family Quick-Switch Capsule in Header (Only when Parent Session is Active) */}
              {user?.role?.toLowerCase() === 'student' && activePlatform === 'campus' && (() => {
                // Check if parent area / session is actively unlocked
                const isParentSessionActive = (() => {
                  if (typeof window === 'undefined') return false;
                  const globalUnlocked = sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
                  const userUnlocked = user?.id ? sessionStorage.getItem(`groovelab_parent_unlocked_${user.id}`) === 'true' : false;
                  const parentSessionExpiry = user?.id ? Number(sessionStorage.getItem(`groovelab_parent_session_${user.id}`) || '0') : 0;
                  const sessionValid = parentSessionExpiry > Date.now();
                  return globalUnlocked || userUnlocked || sessionValid;
                })();

                if (!isParentSessionActive) return null;

                const familyProfiles: any[] = (() => {
                  if (typeof window === 'undefined') return [];
                  try {
                    return JSON.parse(localStorage.getItem('campus_family_profiles') || '[]');
                  } catch {
                    return [];
                  }
                })();

                const siblings = familyProfiles.filter((p: any) => p.id !== user.id);
                if (siblings.length === 0) return null;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {siblings.map((sibling: any) => {
                      const siblingInst = sibling.instrument || 'Gitarre';
                      const defaultAvatar = getInstrumentAvatarUrl(siblingInst);
                      let avatarUrl = defaultAvatar;
                      const rawPhoto = sibling.photo_url;
                      if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() && rawPhoto !== '/campus_login_hero.png') {
                        const p = rawPhoto.trim();
                        if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:image/') || p.startsWith('/avatars/') || p.startsWith('/')) {
                          avatarUrl = p;
                        } else if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg')) {
                          avatarUrl = `/avatars/${p}`;
                        }
                      }

                      return (
                        <button
                          key={sibling.id}
                          type="button"
                          onClick={() => {
                            // Keep parent session active across family quick-switch
                            sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
                            sessionStorage.setItem(`groovelab_parent_session_${sibling.id}`, String(Date.now() + 60 * 60 * 1000));
                            localStorage.setItem('campus_active_student_id', sibling.id);
                            localStorage.setItem('groovelab_current_student_id', sibling.id);
                            sessionStorage.setItem('groovelab_user_id', sibling.id);
                            window.location.search = `?student=${sibling.id}`;
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: '#ffffff',
                            border: '1.5px solid #0284c7',
                            borderRadius: '12px',
                            height: windowWidth <= 768 ? '36px' : '40px',
                            padding: windowWidth <= 480 ? '0 8px' : '0 12px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.12)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                          title={`Zu ${sibling.first_name} wechseln`}
                        >
                          <img
                            src={avatarUrl}
                            alt={sibling.first_name}
                            onError={(e) => {
                              const img = e.currentTarget;
                              const fallback = getInstrumentAvatarUrl(siblingInst);
                              if (img.src !== fallback && !img.src.endsWith(fallback)) {
                                img.src = fallback;
                              } else {
                                img.src = '/avatars/gitarre_avatar_new.png';
                              }
                            }}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', background: '#f1f5f9' }}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1' }}>
                            {windowWidth > 480 ? `Zu ${sibling.first_name}` : sibling.first_name}
                          </span>
                          <ArrowRight size={13} color="#0284c7" />
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Elegant Refresh / Reload Button */}
              <button 
                onClick={() => window.location.reload()}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: windowWidth <= 768 ? '36px' : '40px', 
                  height: windowWidth <= 768 ? '36px' : '40px', 
                  borderRadius: '12px', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  color: '#64748b', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                className="hover-scale"
                title="Seite neu laden"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <RefreshCw size={16} />
              </button>

              {activePlatform !== 'campus' && (
                <div 
                  onClick={() => setActiveStudentTab('profile')}
                  style={{ width: windowWidth <= 768 ? '36px' : '40px', height: windowWidth <= 768 ? '36px' : '40px', borderRadius: '12px', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
                >
                  <StudioAvatar 
                    src={user.photo_url} 
                    user={{
                      ...user,
                      resolved_instrument: user.resolved_instrument || user.instrument || (teachers.find(t => t.id === user.teacher_id)?.instrument) || (teachers[0]?.instrument) || 'Gitarre'
                    }} 
                    activePlatform={activePlatform} 
                    onClick={() => setActiveStudentTab('profile')} 
                  />
                </div>
              )}
              {/* Datum Simulation Control (Dev Mode Only) */}
              {isDevEnvironment() && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: simulatedDate ? '#fefce8' : '#f8fafc',
                  border: simulatedDate ? '1.5px solid #eab308' : '1.5px solid #cbd5e1',
                  height: windowWidth <= 768 ? '36px' : '40px',
                  padding: '0 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  boxShadow: simulatedDate ? '0 2px 8px rgba(234, 179, 8, 0.2)' : 'none',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }} title="Datum-Simulation für alle Dashboards">
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: simulatedDate ? '#854d0e' : '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    📅 Simu:
                  </span>
                  <input 
                    type="date"
                    value={simulatedDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSimulatedDate(val || null);
                      if (val) {
                        localStorage.setItem('groovelab_simulated_date', val);
                        localStorage.setItem('groovelab_simulated_start_timestamp', String(Date.now()));
                        if (school?.id) {
                          localStorage.setItem(`simulatedToday_${school.id}`, val);
                        }
                      } else {
                        localStorage.removeItem('groovelab_simulated_date');
                        localStorage.removeItem('groovelab_simulated_start_timestamp');
                        if (school?.id) {
                          localStorage.removeItem(`simulatedToday_${school.id}`);
                        }
                      }
                      window.dispatchEvent(new Event('storage'));
                      window.dispatchEvent(new CustomEvent('groovelab_simulated_date_changed'));
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      color: simulatedDate ? '#ca8a04' : '#0f172a',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  {simulatedDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatedDate(null);
                        localStorage.removeItem('groovelab_simulated_date');
                        localStorage.removeItem('groovelab_simulated_start_timestamp');
                        if (school?.id) {
                          localStorage.removeItem(`simulatedToday_${school.id}`);
                        }
                        window.dispatchEvent(new Event('storage'));
                        window.dispatchEvent(new CustomEvent('groovelab_simulated_date_changed'));
                      }}
                      style={{
                        border: 'none',
                        background: '#fef08a',
                        color: '#854d0e',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      title="Auf heutiges Datum zurücksetzen"
                    >
                      Heute
                    </button>
                  )}
                </div>
              )}

              {/* Elegant Switch to Admin/Verwaltung Button (Only for users with admin or secretary privileges) */}
              {user && ((user.roles && (user.roles.includes('admin') || user.roles.includes('secretary'))) || user.role === 'admin' || user.role === 'secretary') && (
                <button 
                  onClick={() => {
                    const targetRole = (user.roles && user.roles.includes('admin')) ? 'admin' : (user.role === 'admin' ? 'admin' : 'secretary');
                    handleSwitchActiveRole(targetRole);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px', 
                    background: '#fce8e6', 
                    border: '1.5px solid #ea4335', 
                    height: windowWidth <= 768 ? '36px' : '40px',
                    padding: windowWidth <= 480 ? '0 10px' : '0 14px', 
                    borderRadius: '12px', 
                    color: '#ea4335', 
                    fontWeight: 800, 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 12px rgba(234, 67, 53, 0.12)',
                    flexShrink: 0
                  }}
                  className="hover-scale"
                  title="Zur Schulverwaltung wechseln"
                >
                  <School size={15} color="#ea4335" />
                  <span>Verwaltung</span>
                </button>
              )}
              {/* Elegant Logout Button next to avatar (mobile-only to avoid duplicate on desktop) */}
              {windowWidth <= 1024 && (
                <button 
                  onClick={() => handleLogout(true, true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px', 
                    background: '#ffe4e6', 
                    border: '1px solid #fecdd3', 
                    height: windowWidth <= 768 ? '36px' : '40px',
                    padding: windowWidth <= 480 ? '0 10px' : '0 14px', 
                    borderRadius: '12px', 
                    color: '#e11d48', 
                    fontWeight: 800, 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 10px rgba(225, 29, 72, 0.08)',
                    flexShrink: 0
                  }}
                  className="hover-scale"
                  title="Abmelden"
                >
                  <LogOut size={14} color="#e11d48" />
                  {windowWidth > 480 && <span>Abmelden</span>}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Thin colored accent line matching active platform — consistent across all boards */}
        <div style={{
          height: '3px',
          width: '100%',
          background: activePlatform === 'campus'
            ? '#34a853'
            : activePlatform === 'groovelab'
              ? '#fbbc05'
              : '#0b57d0',
          flexShrink: 0,
          marginBottom: '0px'
        }} />


      <main className="main-content" style={{ 
        overflow: activeStudentTab === 'live' ? 'hidden' : 'auto', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: activeStudentTab === 'live' ? '100%' : 'auto',
        padding: windowWidth <= 768 ? '10px 10px 90px 10px' : '10px',
        boxSizing: 'border-box',
        minWidth: 0
      }}>
        {/* 🛡️ Persistent Sticky Safety Banner when Parent Mode is active */}
        {parentUnlocked && user?.role?.toLowerCase() === 'student' && (
          <div style={{
            position: 'sticky',
            top: windowWidth <= 768 ? 'calc(54px + env(safe-area-inset-top, 0px))' : 0,
            zIndex: 890,
            background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            fontWeight: 700,
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#ffffff" />
                <span>Eltern-Vorschau aktiv</span>
              </div>

              {/* If active tab is a togglable board, show quick release toggle in the header */}
              {['practice_board', 'mediathek', 'events', 'campus_cup', 'messages'].includes(activeStudentTab) && (() => {
                const boardNames: Record<string, string> = {
                  practice_board: 'Übe-Pfad',
                  mediathek: 'Mediathek',
                  events: 'Termine',
                  campus_cup: 'Klassen-Highlights & Team-Power',
                  messages: 'Nachrichten'
                };
                let allowed = true;
                if (campusStudentUiLevel === 'junior') {
                  const juniorAllowed = ['briefing', 'homework_book', 'practice_board', 'events', 'settings'];
                  allowed = juniorAllowed.includes(activeStudentTab);
                }
                const override = typeof window !== 'undefined' ? localStorage.getItem(`campus_board_override_${activeStudentTab}`) : null;
                if (override === 'true') allowed = true;
                if (override === 'false') allowed = false;

                const toggleActiveBoard = () => {
                  const next = !allowed;
                  localStorage.setItem(`campus_board_override_${activeStudentTab}`, String(next));
                  if (activeStudentTab === 'messages') {
                    localStorage.setItem('campus_allow_chat', String(next));
                  }
                  if (activeStudentTab === 'campus_cup') {
                    localStorage.setItem('campus_allow_leaderboard', String(next));
                  }
                  if (user?.id) {
                    try {
                      supabase.from('users').update({
                        parent_permissions: {
                          ...(user?.parent_permissions || {}),
                          [`board_${activeStudentTab}`]: next
                        }
                      }).eq('id', user.id).then(() => {});
                    } catch(err) {}
                  }
                  window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: activeStudentTab, allowed: next } }));
                  setParentPermissionsVersion(v => v + 1);
                };

                return (
                  <button
                    type="button"
                    onClick={toggleActiveBoard}
                    style={{
                      background: allowed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                      border: allowed ? '1px solid #86efac' : '1px solid #fca5a5',
                      color: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: '100px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Klicken, um dieses Board für dein Kind freizugeben oder zu sperren"
                    className="hover-scale-subtle"
                  >
                    <span>Board {boardNames[activeStudentTab]}:</span>
                    <span style={{ fontWeight: 900, textDecoration: 'underline' }}>
                      {allowed ? '✓ Für Kind freigegeben' : '🔒 Für Kind gesperrt'}
                    </span>
                  </button>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('groovelab_parent_unlocked_global');
                if (user?.id) {
                  sessionStorage.removeItem(`groovelab_parent_unlocked_${user.id}`);
                  sessionStorage.removeItem(`groovelab_parent_session_${user.id}`);
                }
                setParentUnlocked(false);
                window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
                setActiveStudentTab('briefing');
              }}
              style={{
                background: '#ffffff',
                color: '#0369a1',
                border: 'none',
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap'
              }}
              title="Eltern-Modus beenden und zur geschützten Schüleransicht wechseln"
            >
              <User size={12} color="#0369a1" />
              <span>Schüleransicht aktivieren</span>
            </button>
          </div>
        )}
        {/* Ensemble & Bands Platform View */}
        {activePlatform === 'ensembles' && (
          <ErrorBoundary>
            <Suspense fallback={<DashboardLoader />}>
              <EnsembleDashboard 
                user={user}
                schoolId={user.school_id}
                supabase={supabase}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Live Lab Tab for Students (Kept mounted for instant platform switching) */}
        {user.role?.toLowerCase() === 'student' && (
          <div style={{ 
            display: (activePlatform !== 'ensembles' && activeStudentTab === 'live') ? 'flex' : 'none', 
            flexDirection: 'column', 
            flex: 1, 
            minHeight: 0,
            width: '100%' 
          }}>
            <ErrorBoundary>
              <div className="animation-slide-up" style={{ width: '100%', padding: '24px 16px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                <Suspense fallback={<DashboardLoader />}>
                  <TeacherDashboard 
                    key="student-live-dashboard"
                    userId={user.id} 
                    hideHeader={true} 
                    viewMode="student" 
                    onTabChange={setActiveStudentTab}
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    onSidebarNotificationsChange={setSidebarNotificationsCount}
                    activePlatform="groovelab"
                    session={session}
                    onSessionChange={setSession}
                    locationMode={locationMode}
                    onLocationModeChange={(mode) => {
                      setLocationMode(mode);
                      sessionStorage.setItem('groovelab_location_mode', mode);
                    }}
                    onSwitchPlatform={(newPlatform) => {
                      setActivePlatform(newPlatform);
                    }}
                    onFoundBand={(form, mySlot) => {
                      console.log('[DEBUG-Groovelab] setSuggestingSkill (manual click) in TeacherDashboard onFoundBand');
                      setSuggestingSkill({
                        ...mySlot,
                        isLeader: true,
                        leaderName: 'Du',
                        song_id: form.song?.id || form.song_id,
                        songs: { id: form.song?.id || form.song_id, title: form.song?.title },
                        formation_group: form.groupKey || form.id,
                        members: form.members
                      });
                      setFoundingName(generateRandomBandName(foundingLanguage));
                    }}
                  />
                </Suspense>
              </div>
            </ErrorBoundary>
          </div>
        )}

        {/* Student Campus Dashboard Tabs (Kept mounted for instant platform switching) */}
        {user.role?.toLowerCase() === 'student' && (
          <div style={{ 
            display: ((activePlatform === 'campus' || (activePlatform === 'groovelab' && activeStudentTab !== 'profile')) && ['briefing', 'homework_book', 'mediathek', 'practice_board', 'campus_cup', 'events', 'profile', 'all_appointments', 'settings'].includes(activeStudentTab)) ? 'block' : 'none',
            width: '100%'
          }}>
            <ErrorBoundary>
              <Suspense fallback={<DashboardLoader />}>
                <StudentAvatarDashboard 
                  studentId={user.id} 
                  initialUser={user}
                  parentActiveTab={activeStudentTab}
                  onTabChange={(tab) => setActiveStudentTab(tab)}
                  onProfileUpdate={(updatedFields: any) => {
                    setUser((prev: any) => prev ? { ...prev, ...updatedFields } : null);
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Profile Tab */}
        {activeStudentTab === 'profile' && !(user.role?.toLowerCase() === 'student' && activePlatform === 'campus') && (
          <ErrorBoundary>
            {(user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') && activePlatform === 'campus' ? (
              /* --- WORLD-CLASS CAMPUS TEACHER PROFILE DESIGN --- */
              <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '100%', margin: '0 auto', width: '100%', paddingTop: '24px' }}>
                {/* Hero Header Card — Briefing-style: image left panel, content right */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.72)',
                  backdropFilter: 'blur(24px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                  border: '1px solid rgba(52, 168, 83, 0.2)',
                  borderRadius: '32px',
                  display: 'flex',
                  alignItems: 'stretch',
                  boxShadow: '0 8px 32px rgba(52, 168, 83, 0.08)',
                  overflow: 'hidden',
                  minHeight: '222px',
                  boxSizing: 'border-box' as const,
                  position: 'relative',
                }}>


                  {/* LEFT: Instrument image — full height, flush edges */}
                  <div style={{
                    width: '200px',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRight: '1px solid rgba(52, 168, 83, 0.15)',
                  }}>
                    <StudioAvatar
                      src={user.photo_url}
                      user={user}
                      activePlatform={activePlatform}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  </div>

                  {/* RIGHT: Identity content */}
                  <div style={{
                    flex: 1,
                    padding: '28px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minWidth: 0,
                  }}>
                    {/* Badges row */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #34a853, #34a853)',
                        color: 'white',
                        padding: '4px 14px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.1em',
                        boxShadow: '0 4px 10px rgba(52, 168, 83,0.25)',
                      }}>
                        Campus Lehrkraft
                      </span>
                      <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building size={14} color="#475569" /> {user.schools?.name || 'Campus-Groovelab'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 500 }}>
                        • Mitglied seit {user.created_at && !isNaN(new Date(user.created_at).getTime()) ? new Date(user.created_at).toLocaleDateString() : 'unbekannt'}
                      </span>
                    </div>

                    {/* Name */}
                    <h1 style={{
                      fontSize: '2.6rem',
                      fontWeight: 950,
                      color: '#0f172a',
                      margin: '0 0 14px 0',
                      letterSpacing: '-0.03em',
                      fontFamily: "'Urbanist', sans-serif",
                      lineHeight: 1.1,
                    }}>
                      {user.first_name} {user.last_name}
                    </h1>

                    {/* Instrument pills */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {(user.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                        <div key={inst} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(52, 168, 83, 0.07)',
                          border: '1px solid rgba(52, 168, 83, 0.18)',
                          color: '#34a853',
                          padding: '5px 14px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                        }}>
                          <span>🎵</span>
                          <span>{inst}</span>
                        </div>
                      ))}

                      {/* Campus-Ausweis Button */}
                      {(user?.qr_token || user?.teacher_qr_token) && (
                        <button 
                          onClick={() => setShowQR(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #34a853, #34a853)',
                            color: 'white',
                            padding: '6px 14px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(52, 168, 83,0.15)',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <QrCode size={15} />
                          <span>Campus-Ausweis</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Teaching Metrics Grid (4 columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  {/* Metric 1: Schüler gesamt */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                    <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(0, 122, 255, 0.08)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Schüler gesamt</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                        {campusTeacherStats ? `${campusTeacherStats.studentCount} Schüler` : '0 Schüler'}
                      </div>
                    </div>
                  </div>

                  {/* Metric 2: Unterrichtszeit */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                    <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.08)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Wochen-Unterricht</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                        {campusTeacherStats ? `${(campusTeacherStats.totalMinutes / 60).toFixed(1)} Std.` : '0.0 Std.'}
                      </div>
                    </div>
                  </div>

                  {/* Metric 3: Unterrichtstage */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                    <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Präsenztage</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                        {campusTeacherStats && campusTeacherStats.teachingDays.length > 0 
                          ? `${campusTeacherStats.teachingDays.length} ${campusTeacherStats.teachingDays.length === 1 ? 'Tag' : 'Tage'}` 
                          : '0 Tage'}
                      </div>
                    </div>
                  </div>

                  {/* Metric 4: Haupt-Raum */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                    <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Stamm-Raum</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                        {campusTeacherStats ? campusTeacherStats.primaryRoom : 'Kein Raum'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teaching Days Calendar Overview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
                  
                  {/* Day Availability Calendar Planner */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={20} style={{ color: '#007aff' }} />
                      Unterrichtstage & Startzeiten
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(() => {
                        const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                        
                        const timeToMinutes = (timeStr: string) => {
                          const [h, m] = timeStr.split(':').map(Number);
                          return h * 60 + m;
                        };
                        const minutesToTime = (mins: number) => {
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        };

                        const schedulesByDay = (campusTeacherStats?.schedules || []).reduce((acc: Record<number, any[]>, curr: any) => {
                          if (curr.day_of_week !== undefined && curr.day_of_week !== null) {
                            if (!acc[curr.day_of_week]) {
                              acc[curr.day_of_week] = [];
                            }
                            acc[curr.day_of_week].push(curr);
                          }
                          return acc;
                        }, {});

                        const activeDays = Object.keys(schedulesByDay)
                          .map(Number)
                          .sort((a, b) => a - b);

                        return activeDays.length > 0 ? (
                          activeDays.map((dayOfWeek) => {
                            const daySchedules = schedulesByDay[dayOfWeek] || [];
                            let minStart = Infinity;
                            let maxEnd = -Infinity;
                            
                            daySchedules.forEach(s => {
                              if (s.time_slot) {
                                const startMins = timeToMinutes(s.time_slot);
                                const endMins = startMins + (s.duration || 30);
                                if (startMins < minStart) minStart = startMins;
                                if (endMins > maxEnd) maxEnd = endMins;
                              }
                            });

                            const startStr = minStart !== Infinity ? minutesToTime(minStart) : '--:--';
                            const endStr = maxEnd !== -Infinity ? minutesToTime(maxEnd) : '--:--';

                            return (
                              <div key={dayOfWeek} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '16px 20px', 
                                background: '#f8fafc', 
                                borderRadius: '16px', 
                                border: '1px solid #f1f5f9' 
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ height: '36px', width: '36px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.04)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900 }}>
                                    🗓️
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                                      {DAYS_DE[dayOfWeek]}s
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                      Geplanter Unterricht: {startStr} bis {endStr} Uhr
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ background: 'rgba(0, 122, 255, 0.08)', color: '#007aff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
                                    Aktiv
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2.5px dashed #cbd5e1', borderRadius: '20px' }}>
                            Bisher keine Unterrichtstage im Stundenplaner angelegt.
                          </div>
                        );
                      })()}
                    </div>
                  </div>


                </div>

                {/* Mobile / Profile Page Legal Footer */}
                <div style={{
                  padding: '24px 0',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span onClick={() => setShowPrivacy(true)} style={{ cursor: 'pointer' }}>Datenschutz</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span onClick={() => setShowAgb(true)} style={{ cursor: 'pointer' }}>AGB</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span onClick={() => setShowImpressum(true)} style={{ cursor: 'pointer' }}>Impressum</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Campus-Groovelab © {new Date().getFullYear()}</span>
                </div>
              </div>
            ) : (
              /* --- GROOVELAB PROFILE LOOK (ORIGINAL) --- */
              <>
                <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', margin: '0 auto', width: '100%', marginTop: '14px' }}>
              {/* Top: Massive Hero Card */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', display: 'flex', overflow: 'hidden', minHeight: '440px' }}>
                <div style={{ flex: '0 0 40%', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  <StudioAvatar src={user.photo_url || '/avatar_ghost.jpg'} user={user} style={{ position: 'absolute', inset: 0 }} />
                  {/* Edit Button Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'all 0.3s' }} className="photo-overlay">
                    <button 
                      onClick={() => {
                        setAvatarPickerType('teacher');
                        setShowAvatarPicker(true);
                      }}
                      style={{ 
                        position: 'absolute', bottom: '24px', right: '24px',
                        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', 
                        color: 'white', padding: '12px 20px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', 
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' 
                      }}
                    >
                      <User size={16} /> PROFILBILD ÄNDERN
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: '1', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {/* Badge row */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{
                      background: (user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') ? 'linear-gradient(135deg, #eab308, #ca8a04)' : '#f59e0b',
                      color: 'white', padding: '4px 12px', borderRadius: '8px',
                      fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                      boxShadow: '0 4px 10px rgba(234, 179, 8, 0.25)'
                    }}>
                      {(user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') ? 'GrooveLab Coach' : 'Pro Artist'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 700 }}>{user.schools?.name || 'Campus-Groovelab'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>• Mitglied seit {user.created_at && !isNaN(new Date(user.created_at).getTime()) ? new Date(user.created_at).toLocaleDateString() : 'unbekannt'}</span>

                    {/* XP only for students */}
                    {user.role === 'student' && (
                      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                        <Star size={12} fill="white" /> {userSongs.filter(s => s.progress === 100).length * 100} XP
                      </div>
                    )}

                    {/* Campus-Ausweis Button */}
                    {(user?.qr_token || user?.teacher_qr_token) && (
                      <button 
                        onClick={() => setShowQR(true)}
                        style={{
                          background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 950,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                        }}
                      >
                        <QrCode size={12} />
                        <span>CAMPUS-GROOVELAB AUSWEIS</span>
                      </button>
                    )}
                  </div>

                  <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
                    {user.role === 'student' ? (activePlatform === 'groovelab' ? user.first_name : 'Hausaufgabenheft') : formatTeacherFullName(user.first_name, user.last_name)}
                  </h1>

                  {/* GrooveLab Instrument Selection Buttons for Coach */}
                  {(user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') ? (
                    (() => {
                      const groovelabInstDefs = [
                        { key: 'Gitarre', altKey: 'E-Gitarre', label: 'E-Gitarre', instName: 'E-Gitarre' },
                        { key: 'Piano / Keys', altKey: 'E-Piano', label: 'E-Piano', instName: 'E-Piano' },
                        { key: 'Drums', altKey: 'E-Drum', label: 'E-Drum', instName: 'Drums' },
                        { key: 'Bass', altKey: 'E-Bass', label: 'E-Bass', instName: 'E-Bass' },
                        { key: 'Vocals', altKey: 'Gesang', label: 'Gesang', instName: 'Vocals' }
                      ];

                      const currentRaw = (user.groovelab_instrument || '');
                      const currentInstList = currentRaw.split(',').map((s: string) => s.trim()).filter(Boolean);

                      const toggleGrooveLabInstrument = async (instDef: typeof groovelabInstDefs[0]) => {
                        const isCurrentlySelected = currentInstList.some((s: string) => 
                          s === instDef.key || s === instDef.altKey || s === instDef.label
                        );

                        let nextList: string[];
                        if (isCurrentlySelected) {
                          nextList = currentInstList.filter((s: string) => 
                            s !== instDef.key && s !== instDef.altKey && s !== instDef.label
                          );
                        } else {
                          nextList = [...currentInstList, instDef.key];
                        }

                        const newStr = nextList.join(', ');

                        // Instant local state update
                        setUser((prev: any) => prev ? { ...prev, groovelab_instrument: newStr } : prev);

                        // Persist to Supabase
                        try {
                          await supabase.from('users').update({ groovelab_instrument: newStr }).eq('id', user.id);
                        } catch (err) {
                          console.error('[GrooveLab] Error saving groovelab_instrument:', err);
                        }
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            GrooveLab-Instrumente (Klicke zum Aktivieren):
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {groovelabInstDefs.map((instDef) => {
                              const isActive = currentInstList.some((s: string) => 
                                s === instDef.key || s === instDef.altKey || s === instDef.label
                              );

                              return (
                                <button
                                  key={instDef.label}
                                  type="button"
                                  onClick={() => toggleGrooveLabInstrument(instDef)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '14px',
                                    fontSize: '0.82rem',
                                    fontWeight: isActive ? 900 : 700,
                                    border: isActive ? 'none' : '1.5px dashed #cbd5e1',
                                    background: isActive ? 'linear-gradient(135deg, #eab308, #ca8a04)' : '#f8fafc',
                                    color: isActive ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 4px 14px rgba(234, 179, 8, 0.35)' : 'none',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => {
                                    if (!isActive) {
                                      e.currentTarget.style.borderColor = '#eab308';
                                      e.currentTarget.style.color = '#ca8a04';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (!isActive) {
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                      e.currentTarget.style.color = '#64748b';
                                    }
                                  }}
                                >
                                  {renderInstrumentIcon(instDef.instName, isActive ? '#ffffff' : undefined, 18)}
                                  <span>{instDef.label}</span>
                                  {isActive && <span style={{ fontSize: '0.75rem', marginLeft: '2px' }}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // STUDENT: show instrument challenge counters
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                      {['Guitar', 'Drums', 'Keys', 'Bass', 'Vocals'].map(inst => {
                        const count = userSongs.filter(s => {
                          const sInst = s.instrument?.toLowerCase();
                          const target = inst.toLowerCase();
                          let match = false;
                          if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre';
                          else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';
                          else if (target === 'drums') match = sInst === 'drums' || sInst === 'e-drums';
                          else if (target === 'keys') match = sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano';
                          else if (target === 'vocals') match = sInst === 'vocals' || sInst === 'gesang';
                          else match = sInst === target;
                          return match && s.progress === 100;
                        }).length;
                        return (
                          <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '1.25rem' }}>{APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS] || (inst === 'Vocals' ? '🎤' : '🎵')}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 900, color: count > 0 ? brandColor : '#94a3b8' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* COACH: Profile info cards */}
                  {(user.role === 'teacher' || user.role === 'admin') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {user.bio && (
                        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px 16px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Werdegang</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569', lineHeight: 1.5 }}>{user.bio}</div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {user.expertise && (
                          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '10px 14px', border: '1px solid #f1f5f9', flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Expertise & Stile</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{user.expertise}</div>
                          </div>
                        )}
                        {user.bands && activePlatform === 'campus' && (
                          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '10px 14px', border: '1px solid #f1f5f9', flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Bands & Projekte</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{user.bands}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}


                </div>
              </div>
              {user.role === 'student' && (
                <>
                  {/* Bottom: Radar & Planner */}
                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Skill Radar */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#f59e0b' }}><Music size={24} /></div>
                        Skill Radar
                      </h3>
                      <Suspense fallback={<div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Lade Radar...</div>}>
                        <StudentRadarChart studentRadarData={studentRadarData} />
                      </Suspense>
                    </div>

                    {/* Wochen-Planner */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: '#f59e0b' }}><Clock size={24} /></div>
                            Wochen-Planner
                            {((user as any)?.role?.toLowerCase() === 'admin' || (user as any)?.role?.toLowerCase() === 'teacher') && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm('VORSICHT: Möchtest du wirklich ALLE Wochenplan-Einträge für diese Schule löschen?')) {
                                    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                                    if (!schoolData?.id) return;
                                    const { error } = await supabase.from('lab_planning').delete().eq('school_id', schoolData.id);
                                    if (error) alert('Fehler: ' + error.message);
                                    else {
                                      alert('Wochenplan wurde auf 0 zurückgesetzt! ✅');
                                      fetchPlanningData(schoolData.id);
                                    }
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                title="Wochenplan komplett leeren (Admin)"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Plane deine Sessions & vermeide Stoßzeiten.</p>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '3px', 
                              border: '1px solid #cbd5e1', 
                              background: '#f8fafc', 
                              position: 'relative', 
                              overflow: 'hidden' 
                            }}>
                              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', background: '#f59e0b' }}></div>
                            </div> Deine Zeit
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(79, 70, 229, 0.4)' }}></div> Lab voll
                          </div>
                          
                        </div>
                      </div>

                       {(() => {
                          const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                          const hours = schoolData?.opening_hours || {};
                          
                          const dayConfigs = [
                            { id: 'Mo', key: 'monday' },
                            { id: 'Di', key: 'tuesday' },
                            { id: 'Mi', key: 'wednesday' },
                            { id: 'Do', key: 'thursday' },
                            { id: 'Fr', key: 'friday' },
                            { id: 'Sa', key: 'saturday' },
                            { id: 'So', key: 'sunday' }
                          ];

                          const activeDays = dayConfigs.filter(d => hours[d.key]?.active !== false);
                          
                          if (activeDays.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>Keine Öffnungszeiten im Setup hinterlegt.</div>;
                          }

                          let minH = 22;
                          let maxH = 0;
                          activeDays.forEach(d => {
                            const h = hours[d.key];
                            if (h?.start) minH = Math.min(minH, parseInt(h.start.split(':')[0]));
                            if (h?.end) maxH = Math.max(maxH, parseInt(h.end.split(':')[0]));
                          });

                          if (minH > 21) minH = 8;
                          if (maxH < 1) maxH = 20;

                          return (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${activeDays.length}, 1fr)`, gap: '6px', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '12px', borderRadius: '24px' }}>
                                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}></div>
                                {activeDays.map(d => (
                                  <div key={d.id} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{d.id}</div>
                                ))}

                                {(() => {
                                  let minTime = "23:59";
                                  let maxTime = "00:00";
                                  activeDays.forEach(d => {
                                    const h = hours[d.key];
                                    if (h?.active !== false && h?.start && h.start < minTime) minTime = h.start;
                                    if (h?.active !== false && h?.end && h.end > maxTime) maxTime = h.end;
                                  });

                                  if (minTime === "23:59") minTime = "16:00";
                                  if (maxTime === "00:00") maxTime = "20:00";

                                  const timeRows = [];
                                  let current = minTime;

                                  // Helper to add 15 minutes to HH:mm string
                                  const add15 = (t: string) => {
                                    let [h, m] = t.split(':').map(Number);
                                    m += 15;
                                    if (m >= 60) { h += 1; m = 0; }
                                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                  };

                                  while (current < maxTime) {
                                    const time = current;
                                    timeRows.push(
                                      <React.Fragment key={time}>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontWeight: 600 }}>{time}</div>
                                        {activeDays.map(day => {
                                          const key = `${day.id}-${time}`;
                                          const isPlanned = plannedSlots.includes(key);
                                          
                                          // Exclude teachers from student count
                                          const totalCount = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            s.profiles?.role?.toLowerCase() !== 'teacher' && 
                                            s.profiles?.role?.toLowerCase() !== 'admin'
                                          ).length;

                                          const teachersInSlot = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            (s.profiles?.role?.toLowerCase() === 'teacher' || s.profiles?.role?.toLowerCase() === 'admin')
                                          );
                                          const hasTeacher = teachersInSlot.length > 0;

                                          const dayHours = hours[day.key];
                                          const isOpen = (dayHours?.active !== false) && time >= (dayHours?.start || '08:00') && time < (dayHours?.end || '20:00');

                                          let bgColor = 'white';
                                          let textColor = '#64748b';
                                          let border = '1px solid #f1f5f9';
                                          let cursor = 'pointer';
                                          let content: any = '';

                                          if (!isOpen) {
                                            bgColor = '#f1f5f9';
                                            textColor = '#cbd5e1';
                                            cursor = 'not-allowed';
                                            content = <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>✕</span>;
                                          } else {
                                            // 1. Determine Background, Border, and Text Color based strictly on heatmap density and coach presence
                                            if (isPlanned) {
                                              // Solid brand gold-amber für eigene geplante Zeiten — durchgehend kräftig, leuchtend und einheitlich!
                                              bgColor = '#f59e0b';
                                              textColor = 'white';
                                              border = '1px solid #d97706';
                                            } else {
                                              // Soft transparent purple/blue heatmap for other slots — linear progressive up to 8 stations!
                                              if (totalCount > 0) {
                                                const maxCapacity = 8;
                                                const minOpacity = 0.08;
                                                const maxOpacity = 0.68;
                                                const count = Math.min(totalCount, maxCapacity);
                                                const opacity = count <= 1 ? minOpacity : minOpacity + (count - 1) * ((maxOpacity - minOpacity) / (maxCapacity - 1));
                                                bgColor = `rgba(79, 70, 229, ${opacity})`;
                                                textColor = opacity >= 0.35 ? 'white' : '#4f46e5';
                                                border = `1px solid rgba(79, 70, 229, ${opacity + 0.1})`;
                                              }
                                              
                                              // Teacher slots are not highlighted in student planner as requested
                                            }
                                            
                                            

                                            // 2. Determine Inner Content (Student Count + Coach Badge)
                                            

                                            if (totalCount > 0) {
                                              content = (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                                                  {totalCount}
                                                </span>
                                              );
                                            }
                                          }

                                          return (
                                            <button 
                                              key={`${day.id}-${time}`}
                                              onClick={() => {
                                                if (isOpen) toggleSlot(day.id, time);
                                              }}
                                              style={{ 
                                                cursor: cursor, 
                                                height: '24px', 
                                                background: bgColor,
                                                borderRadius: '5px', 
                                                border: border,
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                color: textColor,
                                                fontSize: '0.65rem', 
                                                fontWeight: 900, 
                                                transition: 'all 0.1s',
                                                boxShadow: isPlanned ? `0 2px 8px ${bgColor}50` : 'none',
                                                opacity: isOpen ? 1 : 0.6,
                                                padding: 0,
                                                width: '100%',
                                                position: 'relative',
                                                zIndex: 10,
                                                pointerEvents: 'auto'
                                              }}>
                                              {content}
                                            </button>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                    current = add15(current);
                                  }
                                  return timeRows;
                                })()}
                              </div>

                              {/* Teachers presence list under the grid */}
                              {(() => {
                                const teacherPresences = getTeacherPresenceList();
                                if (teacherPresences.length === 0) return null;
                                
                                const groupedPresences: { [teacherName: string]: typeof teacherPresences } = {};
                                teacherPresences.forEach(pres => {
                                  if (!groupedPresences[pres.teacherName]) {
                                    groupedPresences[pres.teacherName] = [];
                                  }
                                  groupedPresences[pres.teacherName].push(pres);
                                });

                                return (
                                  <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                                      Anwesende Coaches diese Woche:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      {Object.entries(groupedPresences).map(([teacherName, presList]) => {
                                        const theme = getTeacherTheme(teacherName, '');
                                        const dotColor = theme.solidBg;
                                        return (
                                          <div key={teacherName} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            background: '#f8fafc', 
                                            border: '1px solid #f1f5f9', 
                                            padding: '7px 12px', 
                                            borderRadius: '12px' 
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor }}></div>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>{teacherName}</span>
                                            </div>
                                            <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>·</span>
                                            {(presList as any[]).map((pres: any, idx: number) => (
                                              <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                {idx > 0 && <span style={{ color: '#cbd5e1', marginRight: '4px' }}>·</span>}
                                                <span style={{ fontWeight: 800, color: '#1e293b' }}>{pres.day}.</span> {pres.rangeStr}
                                              </span>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                    </div>
                  </div>

                  {/* Third Row: Repertoire & Bands */}
                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1fr 1fr', gap: '24px', paddingBottom: '32px' }}>
                    {/* Übesongs */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: brandColor }}><Music size={24} /></div>
                        Aktuelle Songs
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(() => {
                          const grouped = userSongs.reduce((acc: any, skill: any) => {
                            const level = skill.difficulty_level || 'original';
                            const key = `${skill.song_id}_${level}`;
                            if (!acc[key]) {
                              acc[key] = {
                                song_id: skill.song_id,
                                title: skill.title,
                                artist: skill.artist,
                                level: level,
                                media_link: skill.media_link,
                                tomplay_url: skill.tomplay_url,
                                instrumentation: skill.instrumentation,
                                skills: []
                              };
                            }
                            acc[key].skills.push(skill);
                            return acc;
                          }, {});

                          const activeGroups = Object.values(grouped).filter((group: any) => 
                            group.skills.some((s: any) => s.progress > 0)
                          );

                          if (activeGroups.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1', fontSize: '0.9rem' }}>Noch keine aktiven Songs im Repertoire (&gt;0%).</div>;
                          }

                          return activeGroups.map((group: any) => (
                            <div key={`${group.song_id}_${group.level}`} style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', position: 'relative' }}>
                              <div style={{ 
                                position: 'absolute', 
                                top: '24px', 
                                right: '24px', 
                                background: group.level === 'original' ? '#eff6ff' : '#fff7ed', 
                                color: group.level === 'original' ? '#3b82f6' : '#f59e0b',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Zap size={10} fill="currentColor" /> {group.level === 'original' ? 'PRO' : 'STARTER'}
                              </div>

                              <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{group.artist}</div>
                                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b', marginTop: '2px' }}>{group.title}</div>
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {group.skills
                                  .filter((s: any) => s.instrument !== 'Vocals')
                                  .map((s: any) => (
                                    <div 
                                      key={s.id} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        padding: '6px 12px', 
                                        background: s.progress > 0 ? `${APP_INSTRUMENT_COLORS[s.instrument]}15` : '#f8fafc',
                                        borderRadius: '12px',
                                        border: `1px solid ${s.progress > 0 ? `${APP_INSTRUMENT_COLORS[s.instrument]}20` : '#f1f5f9'}`,
                                        opacity: s.progress > 0 ? 1 : 0.3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                    >
                                      <span style={{ fontSize: '1.1rem' }}>{APP_INSTRUMENT_ICONS[s.instrument] || '🎸'}</span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: s.progress > 0 ? APP_INSTRUMENT_COLORS[s.instrument] : '#94a3b8' }}>
                                        {s.progress}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Bands */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#ec4899' }}><Users size={24} /></div>
                        Meine Bands
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {myBands.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>Du bist noch in keiner Band. Übe fleißig für dein erstes Stage Ready!</div>
                        ) : (
                          myBands.map((b: any) => (
                            <button 
                              key={b.id} 
                              className="hover-card" 
                              onClick={() => {
                                setSelectedBandForProfile(b);
                                setShowBandProfile(true);
                              }}
                              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center', transition: 'all 0.2s' }}>
                              {renderBandAvatar(b.name, b.photo_url, '64px', '18px')}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{b.name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                  {b.songs?.title || b.band_songs?.[0]?.songs?.title || b.genre || 'Jam Session'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                  <div style={{ display: 'flex', gap: '0' }}>
                                    {b.band_members?.slice(0, 5).map((m: any, idx: number) => {
                                      const u = Array.isArray(m.users) ? m.users[0] : m.users;
                                      return (
                                        <div key={idx} style={{ 
                                          width: '28px', 
                                          height: '28px', 
                                          borderRadius: '50%', 
                                          border: '2px solid white', 
                                          marginLeft: idx === 0 ? 0 : '-10px', 
                                          overflow: 'hidden', 
                                          background: m.user_id ? '#f1f5f9' : '#000000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 5 - idx
                                        }}>
                                          {m.user_id ? (
                                            <StudioAvatar src={u?.photo_url} user={u} />
                                          ) : (
                                            <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {user.role !== 'student' && (
                <>
                  {/* Professional GrooveLab Coach Metrics Grid (3 columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    {/* Metric 1: Betreute Bands */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.04)' }}>
                      <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Betreute Bands</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                          {(() => {
                            const coached = (allBands || []).filter((b: any) => {
                              const isReal = b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_');
                              if (!isReal) return false;
                              const isCoach = b.coach_id === user.id || (b.coach && b.coach.id === user.id);
                              const isMember = (b.band_members || []).some((m: any) => m.user_id === user.id);
                              const hasMyStudent = (b.band_members || []).some((m: any) => {
                                const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                                return u && u.teacher_id === user.id;
                              });
                              return isCoach || isMember || hasMyStudent;
                            });
                            const map = new Map();
                            coached.forEach((b: any) => map.set(b.id, b));
                            (userBands || []).filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_')).forEach((b: any) => map.set(b.id, b));
                            const count = map.size;
                            return `${count} ${count === 1 ? 'Band' : 'Bands'}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Metric 2: Präsenztage */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.04)' }}>
                      <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Calendar size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Präsenztage</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                          {(() => {
                            const mySlots = (globalPlannedSlots || []).filter((s: any) => s.user_id === user.id);
                            const uniqueDays = new Set(mySlots.map((s: any) => s.day)).size;
                            return `${uniqueDays} ${uniqueDays === 1 ? 'Tag' : 'Tage'}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Metric 3: GrooveLab-Instrumente */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.04)' }}>
                      <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(202, 138, 4, 0.12)', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Music size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>GrooveLab-Instrumente</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                          {(user.groovelab_instrument || user.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean).length} Instrumente
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teaching Days & Coached Bands Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1fr 1fr', gap: '24px' }}>
                    {/* Day Availability Calendar Planner */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(234, 179, 8, 0.03)' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} style={{ color: '#eab308' }} />
                        Anwesenheitszeiten & Startzeiten
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                          const dayNames: { [key: string]: string } = {
                            'Mo': 'Montag',
                            'Di': 'Dienstag',
                            'Mi': 'Mittwoch',
                            'Do': 'Donnerstag',
                            'Fr': 'Freitag',
                            'Sa': 'Samstag',
                            'So': 'Sonntag'
                          };

                          const mySlots = (globalPlannedSlots || []).filter((s: any) => s.user_id === user.id);
                          
                          const slotsByDay: { [day: string]: string[] } = {};
                          mySlots.forEach((s: any) => {
                            if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
                            slotsByDay[s.day].push(s.time);
                          });

                          const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };
                          
                          const add15 = (t: string) => {
                            let [h, m] = t.split(':').map(Number);
                            m += 15;
                            if (m >= 60) { h += 1; m = 0; }
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                          };

                          const toMin = (t: string) => {
                            const [h, m] = t.split(':').map(Number);
                            return h * 60 + m;
                          };

                          const presences: { dayCode: string; dayName: string; rangeStr: string }[] = [];

                          Object.entries(slotsByDay)
                            .sort(([a], [b]) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
                            .forEach(([day, times]) => {
                              times.sort();
                              const ranges: { start: string; end: string }[] = [];
                              let currentRange: { start: string; end: string } | null = null;

                              times.forEach(t => {
                                if (!currentRange) {
                                  currentRange = { start: t, end: add15(t) };
                                } else {
                                  if (toMin(t) === toMin(currentRange.end)) {
                                    currentRange.end = add15(t);
                                  } else {
                                    ranges.push(currentRange);
                                    currentRange = { start: t, end: add15(t) };
                                  }
                                }
                              });
                              if (currentRange) ranges.push(currentRange);

                              const rangeStr = ranges.map(r => `${r.start} bis ${r.end} Uhr`).join(', ');
                              presences.push({
                                dayCode: day,
                                dayName: dayNames[day] || day,
                                rangeStr
                              });
                            });

                          return presences.length > 0 ? (
                            presences.map((p) => (
                              <div key={p.dayCode} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '14px 18px', 
                                background: '#f8fafc', 
                                borderRadius: '16px', 
                                border: '1px solid #f1f5f9' 
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ height: '36px', width: '36px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(234, 179, 8, 0.15)', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Calendar size={18} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                      {p.dayName}s
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                      Präsenzzeit: {p.rangeStr}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
                                    Aktiv
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2.5px dashed #cbd5e1', borderRadius: '20px' }}>
                              Bisher keine Präsenzzeiten im Wochen-Planner eingetragen.
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Coached Bands Overview */}
                    {(() => {
                      const coached = (allBands || []).filter((b: any) => {
                        const isReal = b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_');
                        if (!isReal) return false;
                        const isCoach = b.coach_id === user.id || (b.coach && b.coach.id === user.id);
                        const isMember = (b.band_members || []).some((m: any) => m.user_id === user.id);
                        const hasMyStudent = (b.band_members || []).some((m: any) => {
                          const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                          return u && u.teacher_id === user.id;
                        });
                        return isCoach || isMember || hasMyStudent;
                      });
                      const map = new Map();
                      coached.forEach((b: any) => map.set(b.id, b));
                      (userBands || []).filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_')).forEach((b: any) => map.set(b.id, b));
                      const teacherBandsList = Array.from(map.values());

                      return (
                        <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(234, 179, 8, 0.03)' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={20} style={{ color: '#eab308' }} />
                            Betreute Band-Projekte ({teacherBandsList.length})
                          </h3>
                          {teacherBandsList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {teacherBandsList.map((band: any) => {
                                const songTitle = band.song?.title || (band.songs ? (Array.isArray(band.songs) ? band.songs[0]?.title : band.songs.title) : null) || 'Noch kein Song zugewiesen';
                                const memberCount = Array.isArray(band.band_members) ? band.band_members.length : (Array.isArray(band.members) ? band.members.length : 0);
                                return (
                                  <div key={band.id || band.name} style={{
                                    background: '#f8fafc',
                                    border: '1px solid #f1f5f9',
                                    borderRadius: '18px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.98rem', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={16} style={{ color: '#ca8a04' }} />
                                        <span>{band.name || band.band_name || 'Unbenannte Band'}</span>
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Music size={12} style={{ color: '#eab308' }} /> {songTitle}
                                      </div>
                                    </div>
                                    <span style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                                      {memberCount} {memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2.5px dashed #cbd5e1', borderRadius: '20px' }}>
                              Bisher keine betreuten Bands in GrooveLab.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1.5fr 1fr', gap: '24px', paddingBottom: '32px' }}>
                    {/* Wochen-Planner */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: '#f59e0b' }}><Clock size={24} /></div>
                            Wochen-Planner
                            {((user as any)?.role?.toLowerCase() === 'admin' || (user as any)?.role?.toLowerCase() === 'teacher') && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm('VORSICHT: Möchtest du wirklich ALLE Wochenplan-Einträge für diese Schule löschen?')) {
                                    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                                    if (!schoolData?.id) return;
                                    const { error } = await supabase.from('lab_planning').delete().eq('school_id', schoolData.id);
                                    if (error) alert('Fehler: ' + error.message);
                                    else {
                                      alert('Wochenplan wurde auf 0 zurückgesetzt! ✅');
                                      fetchPlanningData(schoolData.id);
                                    }
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                title="Wochenplan komplett leeren (Admin)"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Trage deine Präsenzzeiten ein, damit Schüler dich im Lab antreffen.</p>
                        </div>
                        {/* Legend */}
                        {(() => {
                          const activeTeachers = teachers.filter(t => {
                            const isActiveOnPlatform = activePlatform === 'campus' ? t.is_campus_active : t.is_groovelab_active;
                            return isActiveOnPlatform && t.is_observer !== true;
                          });
                          return (
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                              {activeTeachers.map(t => {
                                const isMe = t.id === user?.id;
                                const name = t.first_name || '';
                                const theme = getTeacherTheme(name, t.id);
                                return (
                                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                    <div style={{ 
                                      width: '12px', 
                                      height: '12px', 
                                      borderRadius: '3px', 
                                      background: isMe ? theme.solidBg : theme.lightBg, 
                                      border: isMe ? `1px solid ${theme.solidBorder}` : `1px dashed ${theme.lightBorder}`
                                    }}></div> {name} {isMe ? '(Du)' : ''}
                                  </div>
                                );
                              })}
                              {activeTeachers.length > 1 && (() => {
                                const sortedActive = [...activeTeachers].sort((a, b) => {
                                  const nameA = a.first_name || '';
                                  const nameB = b.first_name || '';
                                  return nameA.localeCompare(nameB, 'de-DE');
                                });
                                const theme1 = getTeacherTheme(sortedActive[0].first_name || '', sortedActive[0].id);
                                const theme2 = getTeacherTheme(sortedActive[1].first_name || '', sortedActive[1].id);
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                    <div style={{ 
                                      width: '12px', 
                                      height: '12px', 
                                      borderRadius: '3px', 
                                      background: `linear-gradient(135deg, ${theme1.solidBg} 0%, ${theme2.solidBg} 100%)`, 
                                      border: '1px solid #cbd5e1'
                                    }}></div> {activeTeachers.length === 2 ? 'Beide' : 'Mehrere'}
                                  </div>
                                );
                              })()}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(79, 70, 229, 0.4)' }}></div> Lab voll
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                       {(() => {
                          const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                          const hours = schoolData?.opening_hours || {};
                          
                          const dayConfigs = [
                            { id: 'Mo', key: 'monday' },
                            { id: 'Di', key: 'tuesday' },
                            { id: 'Mi', key: 'wednesday' },
                            { id: 'Do', key: 'thursday' },
                            { id: 'Fr', key: 'friday' },
                            { id: 'Sa', key: 'saturday' },
                            { id: 'So', key: 'sunday' }
                          ];

                          const activeDays = dayConfigs.filter(d => hours[d.key]?.active !== false);
                          
                          if (activeDays.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>Keine Öffnungszeiten im Setup hinterlegt.</div>;
                          }

                          let minH = 22;
                          let maxH = 0;
                          activeDays.forEach(d => {
                            const h = hours[d.key];
                            if (h?.start) minH = Math.min(minH, parseInt(h.start.split(':')[0]));
                            if (h?.end) maxH = Math.max(maxH, parseInt(h.end.split(':')[0]));
                          });

                          if (minH > 21) minH = 8;
                          if (maxH < 1) maxH = 20;

                          return (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${activeDays.length}, 1fr)`, gap: '6px', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '12px', borderRadius: '24px' }}>
                                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}></div>
                                {activeDays.map(d => (
                                  <div key={d.id} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{d.id}</div>
                                ))}

                                {(() => {
                                  let minTime = "23:59";
                                  let maxTime = "00:00";
                                  activeDays.forEach(d => {
                                    const h = hours[d.key];
                                    if (h?.active !== false && h?.start && h.start < minTime) minTime = h.start;
                                    if (h?.active !== false && h?.end && h.end > maxTime) maxTime = h.end;
                                  });

                                  if (minTime === "23:59") minTime = "16:00";
                                  if (maxTime === "00:00") maxTime = "20:00";

                                  const timeRows = [];
                                  let current = minTime;

                                  // Helper to add 15 minutes to HH:mm string
                                  const add15 = (t: string) => {
                                    let [h, m] = t.split(':').map(Number);
                                    m += 15;
                                    if (m >= 60) { h += 1; m = 0; }
                                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                  };

                                  while (current < maxTime) {
                                    const time = current;
                                    timeRows.push(
                                      <React.Fragment key={time}>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontWeight: 600 }}>{time}</div>
                                        {activeDays.map(day => {
                                          const key = `${day.id}-${time}`;
                                          const isPlanned = plannedSlots.includes(key);
                                          
                                          // Exclude teachers from student count
                                          const totalCount = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            s.profiles?.role?.toLowerCase() !== 'teacher' && 
                                            s.profiles?.role?.toLowerCase() !== 'admin'
                                          ).length;

                                          const teachersInSlot = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            (s.profiles?.role?.toLowerCase() === 'teacher' || s.profiles?.role?.toLowerCase() === 'admin')
                                          );
                                          const hasMySlot = isPlanned;
                                          const hasOtherTeacher = teachersInSlot.some(t => t.user_id !== loggedInUserId);

                                          const dayHours = hours[day.key];
                                          const isOpen = dayHours?.active && time >= dayHours.start && time < dayHours.end;

                                          let bgColor = 'white';
                                          let textColor = '#64748b';
                                          let border = '1px solid #f1f5f9';
                                          let cursor = 'pointer';
                                          let content: any = '';

                                          if (!isOpen) {
                                            bgColor = '#f1f5f9';
                                            textColor = '#cbd5e1';
                                            cursor = 'not-allowed';
                                            content = <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>✕</span>;
                                          } else {
                                            // 1. Determine Background, Border, and Text Color based strictly on heatmap density and coach presence
                                            if (teachersInSlot.length > 0) {
                                              const styleDetails = getTeacherColorStyle(teachersInSlot, loggedInUserId || undefined);
                                              bgColor = styleDetails.bgColor;
                                              textColor = styleDetails.textColor;
                                              border = styleDetails.border;
                                            }

                                            // 2. Determine Inner Content (Teachers' initials)
                                            if (teachersInSlot.length > 0) {
                                              const sortedTeachers = [...teachersInSlot].sort((a, b) => {
                                                const nameA = a.profiles?.first_name || '';
                                                const nameB = b.profiles?.first_name || '';
                                                return nameA.localeCompare(nameB, 'de-DE');
                                              });
                                              const initials = sortedTeachers
                                                .map(t => t.profiles?.first_name?.[0] || 'L')
                                                .join('+');
                                              content = (
                                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: textColor }} title={sortedTeachers.map(t => t.profiles?.first_name).join(', ')}>
                                                  {initials}
                                                </span>
                                              );
                                            }
                                          }

                                          return (
                                            <button 
                                              key={`${day.id}-${time}`}
                                              onClick={() => {
                                                if (isOpen) toggleSlot(day.id, time);
                                              }}
                                              style={{ 
                                                cursor: cursor, 
                                                height: '24px', 
                                                background: bgColor,
                                                borderRadius: '5px', 
                                                border: border,
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                color: textColor,
                                                fontSize: '0.65rem', 
                                                fontWeight: 900, 
                                                transition: 'all 0.1s',
                                                boxShadow: isPlanned ? `0 2px 8px ${bgColor}50` : 'none',
                                                opacity: isOpen ? 1 : 0.6,
                                                padding: 0,
                                                width: '100%',
                                                position: 'relative',
                                                zIndex: 10,
                                                pointerEvents: 'auto'
                                              }}>
                                              {content}
                                            </button>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                    current = add15(current);
                                  }
                                  return timeRows;
                                })()}
                              </div>

                              {/* Teachers presence list under the grid */}
                              {(() => {
                                const teacherPresences = getTeacherPresenceList();
                                if (teacherPresences.length === 0) return null;
                                
                                const groupedPresences: { [teacherName: string]: typeof teacherPresences } = {};
                                teacherPresences.forEach(pres => {
                                  if (!groupedPresences[pres.teacherName]) {
                                    groupedPresences[pres.teacherName] = [];
                                  }
                                  groupedPresences[pres.teacherName].push(pres);
                                });

                                return (
                                  <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                                      Anwesende Coaches diese Woche:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      {Object.entries(groupedPresences).map(([teacherName, presList]) => {
                                        const theme = getTeacherTheme(teacherName, '');
                                        const dotColor = theme.solidBg;
                                        return (
                                          <div key={teacherName} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            background: '#f8fafc', 
                                            border: '1px solid #f1f5f9', 
                                            padding: '7px 12px', 
                                            borderRadius: '12px' 
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor }}></div>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>{teacherName}</span>
                                            </div>
                                            <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>·</span>
                                            {(presList as any[]).map((pres: any, idx: number) => (
                                              <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                {idx > 0 && <span style={{ color: '#cbd5e1', marginRight: '4px' }}>·</span>}
                                                <span style={{ fontWeight: 800, color: '#1e293b' }}>{pres.day}.</span> {pres.rangeStr}
                                              </span>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                    </div>

                    {/* Coached Bands */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#ec4899' }}><Users size={24} /></div>
                        Meine betreuten Bands
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(() => {
                          const coachedBands = (allBands || []).filter((b: any) => b.coach_id === user.id);
                          if (coachedBands.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>Du betreust aktuell keine Bands.</div>;
                          }
                          return coachedBands.map((b: any) => (
                            <button 
                              key={b.id} 
                              className="hover-card" 
                              onClick={() => {
                                setSelectedBandForProfile(b);
                                setShowBandProfile(true);
                              }}
                              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center', transition: 'all 0.2s' }}>
                              {renderBandAvatar(b.name, b.photo_url, '64px', '18px')}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{b.name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                  {b.songs?.title || b.band_songs?.[0]?.songs?.title || b.genre || 'Jam Session'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                  <div style={{ display: 'flex', gap: '0' }}>
                                    {b.band_members?.slice(0, 5).map((m: any, idx: number) => {
                                      const u = Array.isArray(m.users) ? m.users[0] : m.users;
                                      return (
                                        <div key={idx} style={{ 
                                          width: '28px', 
                                          height: '28px', 
                                          borderRadius: '50%', 
                                          border: '2px solid white', 
                                          marginLeft: idx === 0 ? 0 : '-10px', 
                                          overflow: 'hidden', 
                                          background: m.user_id ? '#f1f5f9' : '#000000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 5 - idx
                                        }}>
                                          {m.user_id ? (
                                            <StudioAvatar src={u?.photo_url} user={u} />
                                          ) : (
                                            <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                    {/* Legal Footer for Mobile / Profile Page */}
                    <div style={{
                      marginTop: '24px',
                      padding: '24px 0',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span onClick={() => setShowPrivacy(true)} style={{ cursor: 'pointer' }}>Datenschutz</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span onClick={() => setShowAgb(true)} style={{ cursor: 'pointer' }}>AGB</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span onClick={() => setShowImpressum(true)} style={{ cursor: 'pointer' }}>Impressum</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Campus-Groovelab © {new Date().getFullYear()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>)}
        </ErrorBoundary>
      )}

        {/* Admin/Teacher Section Tabs (Unified) */}
        {((user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'secretary')) && activePlatform !== 'ensembles' && activeStudentTab !== 'profile' && activeStudentTab !== 'messages' && (
          <ErrorBoundary key={`admin-teacher-suite-${activePlatform}`}>
            <AdminDashboard 
              key={`admin-dashboard-${activePlatform}`}
              userId={user.id} 
              onLogout={handleLogout} 
              forceTab={['schedule', 'students', 'team', 'rooms', 'songs', 'stats', 'gallery', 'setup', 'bands', 'events', 'briefing', showMissionsFeature ? 'missions' : ''].includes(activeStudentTab) ? activeStudentTab : undefined}
              activePlatform={activePlatform as any}
              onTabChange={(tabId: any) => setActiveStudentTab(tabId)}
              onSwitchPlatform={(platform) => setActivePlatform(platform)}
              onOpenBandProfile={(band: any) => {
                setSelectedBandForProfile(band);
                setShowBandProfile(true);
              }}
              session={session}
              onSessionChange={setSession}
              locationMode={locationMode}
              onLocationModeChange={(mode) => {
                setLocationMode(mode);
                sessionStorage.setItem('groovelab_location_mode', mode);
              }}
            />
          </ErrorBoundary>
        )}

        {/* Messages Tab */}
        {activeStudentTab === 'messages' && (
          activePlatform === 'campus' ? (
            <ErrorBoundary>
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Chats...</div>}>
                <CampusDirectMessages
                  user={user}
                  schoolUsers={schoolUsers}
                  campusMessages={campusMessages}
                  onSendMessage={handleSendCampusMessage}
                  onMarkAsRead={handleMarkCampusMessagesAsRead}
                  selectedRecipient={selectedCampusRecipient}
                  setSelectedRecipient={setSelectedCampusRecipient}
                  studentToTeacherChat={user?.schools?.opening_hours?.campus_settings?.student_to_teacher_chat !== false}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary>
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Pinnwand...</div>}>
                <GrooveLabMessagesBoard
                  user={user}
                  schoolUsers={schoolUsers}
                  announcements={announcements}
                  studentMessages={studentMessages}
                  onPostAnnouncement={async (title, message, targetType, targetUserIds) => {
                    setAnnouncementTitle(title);
                    setAnnouncementMessage(message);
                    setAnnouncementTarget(targetType as any);
                    setSelectedTargetUserIds(targetUserIds);
                    await handlePostAnnouncement({ preventDefault: () => {} } as any);
                  }}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onAcknowledgeMessage={handleAcknowledgeStudentMessage}
                />
              </Suspense>
            </ErrorBoundary>
          )
        )}

        {/* Practice Tab */}
        {activeStudentTab === 'practice' && (
          <ErrorBoundary>
            <section className="exercises-section animation-slide-up" style={{ padding: '24px' }}>
              {/* Progress Summary Bar */}
              <div className="glass-panel" style={{ 
                background: 'white', 
                padding: '24px 40px', 
                borderRadius: '24px', 
                marginBottom: '32px', 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '40px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                flexWrap: 'wrap'
              }}>
                {['Guitar', 'Drums', 'Keys', 'Bass'].map(inst => {
                  const skills = userSongs.filter(s => {
                    const sInst = (s.instrument || '').toLowerCase().trim();
                    const target = inst.toLowerCase();
                    return sInst === target || 
                           (target === 'guitar' && (sInst === 'e-gitarre' || sInst === 'gitarre')) ||
                           (target === 'keys' && (sInst === 'e-piano' || sInst === 'piano' || sInst === 'keys')) ||
                           (target === 'drums' && (sInst === 'e-drums' || sInst === 'schlagzeug')) ||
                           (target === 'bass' && (sInst === 'e-bass' || sInst === 'bass'));
                  });
                  const avgProgress = skills.length > 0 
                    ? Math.round(skills.reduce((acc, s) => acc + s.progress, 0) / skills.length) 
                    : 0;

                  return (
                    <div key={inst} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                        {inst === 'Guitar' ? 'E-GITARRE' : inst === 'Drums' ? 'E-DRUMS' : inst === 'Keys' ? 'E-PIANO' : 'E-BASS'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: APP_INSTRUMENT_COLORS[inst] || brandColor }}>
                          {avgProgress}%
                        </div>
                      </div>
                      <div style={{ width: '80px', height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '8px', margin: '8px auto 0 auto', overflow: 'hidden' }}>
                        <div style={{ width: `${avgProgress}%`, height: '100%', background: APP_INSTRUMENT_COLORS[inst] || brandColor }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Search and Alpha Filter Navigation */}
              <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Text Search */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text"
                      placeholder={`Suche nach ${practiceSearchType === 'title' ? 'Songtitel' : 'Interpret'}...`}
                      value={practiceSearchQuery}
                      onChange={(e) => setPracticeSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}
                    />
                  </div>

                  {/* Toggle Search Type */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px' }}>
                    <button 
                      onClick={() => setPracticeSearchType('title')}
                      style={{ 
                        padding: '10px 20px', borderRadius: '10px', border: 'none', 
                        background: practiceSearchType === 'title' ? 'white' : 'transparent', 
                        color: practiceSearchType === 'title' ? brandColor : '#64748b', 
                        fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                        boxShadow: practiceSearchType === 'title' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Song
                    </button>
                    <button 
                      onClick={() => setPracticeSearchType('artist')}
                      style={{ 
                        padding: '10px 20px', borderRadius: '10px', border: 'none', 
                        background: practiceSearchType === 'artist' ? 'white' : 'transparent', 
                        color: practiceSearchType === 'artist' ? brandColor : '#64748b', 
                        fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                        boxShadow: practiceSearchType === 'artist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Interpret
                    </button>
                  </div>
                </div>

                {/* Alphabet Bar */}
                <div 
                  className="hide-scrollbar"
                  style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    background: 'white', 
                    padding: '10px', 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    minWidth: 0
                  }}
                >
                  <button
                    onClick={() => setPracticeAlphaFilter(null)}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !practiceAlphaFilter ? brandColor : '#f8fafc', color: !practiceAlphaFilter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', minWidth: '50px', flexShrink: 0 }}
                  >
                    ALLE
                  </button>
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                    <button
                      key={letter}
                      onClick={() => setPracticeAlphaFilter(letter)}
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '8px', border: 'none', 
                        background: practiceAlphaFilter === letter ? brandColor : 'transparent', 
                        color: practiceAlphaFilter === letter ? 'white' : '#94a3b8', 
                        fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {(practiceSongs || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎸</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Dein Üben Board ist leer</h3>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>Tippe auf <strong>Bibliothek</strong>, um neue Songs hinzuzufügen und deine Skills zu verbessern!</p>
                </div>
              ) : groupedPracticeSongs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', border: '2px dashed #f1f5f9' }}>
                   <Search size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                   <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Keine Treffer</h3>
                   <p style={{ fontSize: '0.9rem' }}>Versuche es mit einem anderen Suchbegriff oder Filter.</p>
                </div>
              ) : null}
              <div className="exercises-grid">
                {groupedPracticeSongs.map((group: any) => (
                  <div key={group.song_id} style={{ position: 'relative' }}>
                    <GroupedSongCard 
                      songGroup={group} 
                      isBandReady={group.isBandReady} 
                      isExpanded={expandedSongId === group.song_id}
                      onToggle={() => setExpandedSongId(expandedSongId === group.song_id ? null : group.song_id)}
                      onUpdateProgress={updateProgress} 
                      onSubmitForApproval={handleSubmitForApproval} 
                      onDelete={handleDeleteSong}
                      userBands={userBands}
                      userId={user?.id}
                      onOpenPdfViewer={(song: any, folderUrl: string) => {
                        setActivePdfSong(song);
                        setActivePdfFolderUrl(folderUrl);
                      }}
                    />

                  </div>
                ))}
              </div>
            </section>
          </ErrorBoundary>
        )}

        {/* Repertoire Tab (Hall of Fame) */}
        {activeStudentTab === 'repertoire' && (
          <ErrorBoundary>
            <section className="exercises-section animation-slide-up" style={{ padding: isMobile ? '12px' : '24px' }}>
              <div className="glass-panel" style={{ padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
                  <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <div style={{ color: '#34a853' }}><Award size={isMobile ? 22 : 32} /></div>
                    Dein Repertoire
                  </h2>
                  {!isMobile && <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Hier sind deine Meisterleistungen. Du hast diese Songs zu 100% gemeistert!</p>}
                </div>

                <div className="exercises-grid">
                {groupedRepertoireSongs.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '32px', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>🏆</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Noch keine Meilensteine</h3>
                    <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>Übe weiter! Sobald ein Song auf 100% ist, landet er hier in deiner Hall of Fame.</p>
                  </div>
                ) : (
                  groupedRepertoireSongs.map((group: any) => (
                    <div key={group.song_id} className="glass-panel" style={{ padding: isMobile ? '10px 14px' : '14px 18px', background: 'white', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                          <div style={{ fontSize: isMobile ? '0.6rem' : '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', lineHeight: 1 }}>{group.artist}</div>
                          <div style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.title}</div>
                        </div>
                        <div style={{ background: '#e6f4ea', color: '#34a853', padding: isMobile ? '3px 8px' : '4px 10px', borderRadius: '10px', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          <Award size={isMobile ? 10 : 12} /> 100%
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {group.skills.map((s: any) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                            {APP_INSTRUMENT_ICONS[s.instrument as keyof typeof APP_INSTRUMENT_ICONS]} {s.instrument}
                          </div>
                        ))}
                      </div>

                      <div style={{ background: '#34a853', height: '3px', borderRadius: '2px', width: '100%', marginBottom: isMobile ? '4px' : '6px' }}></div>
                      <div style={{ color: '#34a853', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Du bist bereit für eine Band
                      </div>
                      
                      {group.skills.some((s: any) => s.verified_by) && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Expertise-Check</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {group.skills.filter((s: any) => s.verified_by).map((s: any) => (
                                <div key={s.id} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} color="#34a853" strokeWidth={3} />
                                  {s.instrument}: {s.verified_by.first_name} {s.verified_by.last_name?.[0]}.
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              </div>
            </section>
          </ErrorBoundary>
        )}


        {/* Band Matching Tab (The Wall) */}
        {activeStudentTab === 'matching' && (
          <ErrorBoundary>
            <section className="exercises-section glass-panel animation-slide-up" style={{ margin: isMobile ? '12px' : '24px', padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '16px' : '32px', flexWrap: 'wrap', gap: isMobile ? '12px' : '20px' }}>
                  <div>
                    <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <div style={{ color: '#f59e0b' }}><Users size={isMobile ? 22 : 32} /></div>
                      Band Matching
                    </h2>
                    {!isMobile && <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Finde deine Mitmusiker für deine 100% Songs!</p>}
                  </div>

                  {/* Level Switch */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '16px', padding: '4px' }}>
                    {[
                      { id: 'all', label: 'Alle' },
                      { id: 'starter', label: '🚀 Starter' },
                      { id: 'pro', label: '⚡ Pro' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setMatchingLevelFilter(btn.id as any)}
                        style={{ 
                          padding: isMobile ? '7px 12px' : '10px 20px', borderRadius: '12px', border: 'none', 
                          background: matchingLevelFilter === btn.id ? 'white' : 'transparent', 
                          color: matchingLevelFilter === btn.id ? '#1e293b' : '#64748b', 
                          fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.78rem' : '0.85rem',
                          boxShadow: matchingLevelFilter === btn.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

              {(() => {
                const filteredWall = (wallSongs || []).filter((ws: any) => {
                  const hasFormations = ws?.formations && Array.isArray(ws.formations) && ws.formations.length > 0;
                  if (!hasFormations) return false;
                  if (matchingLevelFilter === 'all') return true;
                  const level = ws.level?.toLowerCase() || 'pro'; // Default to pro if level is missing
                  const isPro = level === 'original' || level === 'pro';
                  const isStarter = level === 'starter';
                  
                  if (matchingLevelFilter === 'starter') return isStarter;
                  if (matchingLevelFilter === 'pro') return isPro;
                  return true;
                });

                if (filteredWall.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>⏳</div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Keine passenden Formationen</h3>
                      <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>Ändere deinen Filter oder bringe neue Songs auf 100%!</p>
                    </div>
                  );
                }


                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredWall.map((song: any) => {
                    const isExpanded = expandedMatchingSong === song.id;
                    const totalRequired = Object.entries(song.instrumentation || {}).reduce((acc, [inst, count]) => {
                      const low = inst.toLowerCase();
                      if (low.includes('vocals') || low.includes('gesang')) return acc;
                      return acc + (count as number);
                    }, 0);

                    const openSlots = Math.max(0, song.formations.reduce((acc: number, form: any) => {
                      const instrumentalists = form.members?.filter((m: any) => m.instrument !== 'Vocals').length || 0;
                      return acc + Math.max(0, totalRequired - instrumentalists);
                    }, 0));

                    return (
                    <div key={song.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="glass-panel" 
                        onClick={() => setExpandedMatchingSong(isExpanded ? null : song.id)}
                        style={{ 
                          background: 'white', 
                          borderRadius: isExpanded ? '24px 24px 0 0' : '24px', 
                          padding: isMobile ? '14px 16px' : '24px 32px', 
                          border: '1px solid #f1f5f9',
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          boxShadow: isExpanded ? '0 10px 30px rgba(0,0,0,0.03)' : '0 4px 15px rgba(0,0,0,0.01)', 
                          cursor: 'pointer', transition: 'all 0.2s', zIndex: 1
                        }}>
                        {isMobile ? (
                          /* Mobile: vertical layout */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ 
                                padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900,
                                background: song.level === 'starter' ? '#fffbeb' : '#eff6ff',
                                color: song.level === 'starter' ? '#b45309' : '#2563eb',
                                border: `1px solid ${song.level === 'starter' ? '#fef3c7' : '#dbeafe'}`,
                                textTransform: 'uppercase', flexShrink: 0
                              }}>
                                {song.level === 'starter' ? '🚀 Starter' : '⚡ Pro'}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{song.artist}</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                {openSlots} offene Slots
                              </div>
                              <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Desktop: horizontal layout */
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                              <div style={{ 
                                padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900,
                                background: song.level === 'starter' ? '#fffbeb' : '#eff6ff',
                                color: song.level === 'starter' ? '#b45309' : '#2563eb',
                                border: `1px solid ${song.level === 'starter' ? '#fef3c7' : '#dbeafe'}`,
                                textTransform: 'uppercase'
                              }}>
                                {song.level === 'starter' ? '🚀 Starter' : '⚡ Pro'}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{song.artist}</div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2, margin: 0 }}>{song.title}</h3>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                {openSlots} offene Slots
                              </div>
                              <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                                {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          padding: isMobile ? '16px' : '32px', 
                          background: '#f8fafc', 
                          borderRadius: '0 0 24px 24px', 
                          border: '1px solid #f1f5f9', 
                          borderTop: 'none',
                          boxShadow: 'inset 0 10px 10px -10px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
                            {(() => {
                              const activeBandForSong = (userBands || []).find((b: any) => {
                                const hasActiveSong = (b.band_songs || []).some((bs: any) => 
                                  bs.song_id === song.song_id && bs.status === 'active'
                                );
                                const isMember = (b.band_members || []).some((m: any) => m.user_id === user?.id);
                                return hasActiveSong && isMember;
                              });

                              const myMember = activeBandForSong 
                                ? (activeBandForSong.band_members || []).find((m: any) => m.user_id === user?.id) 
                                : null;
                              const myInstrument = myMember ? myMember.instrument : '';

                              const finalFormations = [...song.formations].sort((a, b) => {
                                const aMine = (a.members || []).some((m: any) => m.user_id === user?.id);
                                const bMine = (b.members || []).some((m: any) => m.user_id === user?.id);
                                if (aMine && !bMine) return -1;
                                if (!aMine && bMine) return 1;
                                return 0;
                              });
                              
                              return (
                                <>
                                  {activeBandForSong && (
                                    <div style={{
                                      background: 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)',
                                      border: '1px solid #e6f4ea',
                                      padding: '20px 24px',
                                      borderRadius: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      boxShadow: '0 4px 20px rgba(52, 168, 83, 0.08)',
                                      gap: '16px',
                                      marginBottom: '20px',
                                      animation: 'slideUp 0.3s ease-out'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ background: '#34a853', color: 'white', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(52, 168, 83, 0.2)' }}>
                                          <CheckCircle size={24} />
                                        </div>
                                        <div>
                                           <div style={{ fontSize: '1rem', fontWeight: 900, color: '#34a853', marginBottom: '2px' }}>
                                             Du spielst bereits {myInstrument} in der Band "{activeBandForSong.name}" für diesen Song! 🚀
                                           </div>
                                           <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34a853', opacity: 0.85 }}>
                                             Dein Repertoire-Beitrag ist aktiv und verifiziert.
                                           </div>
                                         </div>
                                      </div>
                                      <span style={{ fontSize: '1.75rem', display: 'inline-flex', alignItems: 'center' }}>
                                        {renderInstrumentIcon(myInstrument || 'Guitar', undefined, 24)}
                                      </span>
                                    </div>
                                  )}
                                  {finalFormations.map((form: any, fIndex: number) => {
                                    const mySlot = (form?.members || []).find((m: any) => m?.user_id === user?.id);
                                    const isMySlot = !!mySlot;
                                    
                                    // Skip complete formation cards for the user if they are already in an active band for this song on the same instrument
                                    if (activeBandForSong && isMySlot) {
                                      const isSameInstrument = normalizeInstrument(mySlot.instrument) === normalizeInstrument(myInstrument);
                                      if (isSameInstrument) return null;
                                    }

                                    // Skip complete formation cards if the current user is not a member of it (since it has no open slots for them to join)
                                    if (form.isComplete && !isMySlot) return null;

                                    const isGuestSearch = !!form.originBand;
                                    const isProposal = form.status === 'proposal';
                                    const mySkill = userSongs.find(us => us.song_id === song.song_id && (us.difficulty_level || 'original') === song.level);
                                    const canJoin = mySkill && !isMySlot && !form.memberMap[mySkill.instrument] && !form.isComplete;

                                return (
                                  <div key={form.id} style={{ 
                                    background: isProposal ? 'linear-gradient(135deg, #1e1b4b, #0f0728)' : (isGuestSearch ? '#0f172a' : (isMySlot ? 'linear-gradient(135deg, rgba(254, 252, 232, 0.95), rgba(255, 251, 235, 0.95))' : '#f8fafc')), 
                                    border: isProposal ? '2px dashed #a855f7' : (isGuestSearch ? '1px solid rgba(255,255,255,0.1)' : (isMySlot ? '2px solid #eab308' : '1px solid #e2e8f0')),
                                    borderRadius: '28px', padding: '24px',
                                    boxShadow: isGuestSearch ? '0 10px 25px -5px rgba(0,0,0,0.3)' : (isMySlot ? '0 20px 40px rgba(234, 179, 8, 0.12)' : 'none'),
                                    backdropFilter: isMySlot ? 'blur(10px)' : 'none',
                                    WebkitBackdropFilter: isMySlot ? 'blur(10px)' : 'none'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                          fontSize: '0.75rem', 
                                          fontWeight: 950, 
                                          color: isProposal ? '#a855f7' : (isGuestSearch ? '#a855f7' : (isMySlot ? '#ca8a04' : (form.isInitial ? '#ca8a04' : '#64748b'))), 
                                          textTransform: 'uppercase', 
                                          letterSpacing: '0.05em',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '2px'
                                        }}>
                                          <span>
                                            {isProposal 
                                              ? `📢 BAND-PROJEKT (ABSTIMMUNG LÄUFT)` 
                                              : (isGuestSearch 
                                                  ? `🎸 GASTMUSIKER-SUCHE ${isMySlot ? '(DEINE BAND)' : ''}` 
                                                  : (isMySlot ? '✨ Deine Formation' : (form.isInitial ? '📢 Offenes Recruiting' : `Band-Slot #${fIndex + 1}`)))
                                            }
                                          </span>
                                        </div>
                                      </div>
                                {canJoin && (
                                  <button 
                                    onClick={async () => {
                                      if (form.originBand) {
                                        const choice = window.confirm(`BAND-PROJEKT: ${form.originBand.name}\n\nOption A (OK): Als GASTMUSIKER beitreten (Du unterstützt diese Band).\n\nOption B (Abbrechen): NEUE BAND gründen (Du startest ein eigenes Projekt für diesen Song).`);
                                        if (choice) {
                                          const { error } = await supabase.from('band_song_slots').insert({
                                            band_song_id: form.bandSongId,
                                            user_id: user.id,
                                            instrument: mySkill.instrument,
                                            status: 'joined'
                                          });
                                          if (error) alert('Fehler beim Beitreten: ' + error.message);
                                          else {
                                            alert(`Du bist nun Gastmusiker für "${form.originBand.name}"!`);
                                            fetchDashboardData(user.id);
                                          }
                                        } else {
                                          // Create a new formation instead
                                          const newFormId = crypto.randomUUID();
                                          await supabase.from('user_song_skills').update({ formation_group: newFormId }).eq('id', mySkill.id);
                                          fetchDashboardData(user.id);
                                        }
                                      } else {
                                        await supabase.from('user_song_skills').update({ formation_group: form.id }).eq('id', mySkill.id);
                                        fetchDashboardData(user.id);
                                      }
                                    }}
                                    style={{ background: form.originBand ? '#8b5cf6' : '#eab308', color: form.originBand ? 'white' : '#1e293b', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    BEITRETEN
                                  </button>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {isGuestSearch && (
                                  <div 
                                    onClick={() => {
                                      setSelectedBandForProfile(form.originBand);
                                      setShowBandProfile(true);
                                    }}
                                    style={{ 
                                      display: 'flex', alignItems: 'center', gap: '16px', 
                                      paddingRight: '24px', borderRight: '1px solid rgba(255,255,255,0.1)',
                                      cursor: 'pointer', transition: 'all 0.2s ease',
                                      flexShrink: 0
                                    }}
                                    
                                    
                                  >
                                    {renderBandAvatar(form.originBand.name, form.originBand.photo_url, '64px', '18px')}
                                    <div>
                                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Band Projekt</div>
                                      <div style={{ fontSize: '1rem', fontWeight: 950, color: 'white', lineHeight: 1.2 }}>{form.originBand.name}</div>
                                      <div style={{ fontSize: '0.6rem', color: '#a855f7', fontWeight: 700, marginTop: '2px' }}>Profil ansehen →</div>
                                    </div>
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flex: 1 }}>
                                  {(() => {
                                    const req = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1 };
                                    const requiredSlots: any[] = [];
                                    Object.entries(req).forEach(([inst, count]) => {
                                      if (inst.toLowerCase().includes('vocals') || inst.toLowerCase().includes('gesang')) return;
                                      for (let i = 1; i <= (count as number); i++) {
                                        requiredSlots.push({ inst, part: i });
                                      }
                                    });

                                    // Sort slots: Guitar, Drums, Piano, Bass
                                    requiredSlots.sort((a, b) => {
                                      const orderMap: Record<string, number> = { 'e-gitarre': 1, 'e-drums': 2, 'e-piano': 3, 'e-bass': 4 };
                                      const idxA = orderMap[a.inst.toLowerCase()] || 99;
                                      const idxB = orderMap[b.inst.toLowerCase()] || 99;
                                      if (idxA !== idxB) return idxA - idxB;
                                      return a.part - b.part;
                                    });

                                    return requiredSlots.map(({ inst, part }) => {
                                      const key = `${inst}_${part}`;
                                      const member = form.memberMap[key] || form.memberMap[`${normalizeInstrument(inst)}_${part}`];
                                      const isMe = member?.user_id === user?.id;
                                      const instLabel = (req[inst] || 0) > 1 ? `${inst} ${part}` : inst;
                                      
                                      return (
                                        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '88px', position: 'relative' }}>
                                          <div style={{ 
                                            width: '72px', height: '72px', borderRadius: '50%', 
                                            background: member ? (isGuestSearch ? 'rgba(255,255,255,0.05)' : 'white') : (isGuestSearch ? 'rgba(255,255,255,0.03)' : 'rgba(234, 179, 8, 0.03)'), 
                                            border: (isMe || member?.isMastered) ? `3.5px solid #eab308` : (member ? (isGuestSearch ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0') : '2px dashed rgba(234, 179, 8, 0.25)'),
                                            boxShadow: (isMe || member?.isMastered) ? '0 0 16px rgba(234, 179, 8, 0.4)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                            opacity: member && !member.isMastered ? 0.75 : 1
                                          }}>
                                            {member ? (
                                              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                <img 
                                                  src={member.photo_url || '/avatar_ghost.jpg'} 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudentForPreview(member);
                                                  }}
                                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
                                                  alt="" 
                                                />
                                                {member.isMastered && (
                                                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#34a853', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10 }}>
                                                    <CheckCircle size={12} strokeWidth={4} />
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: '1.75rem', opacity: 0.35 }}>{APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS] || '❓'}</div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%' }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 950, color: member ? (isGuestSearch ? 'white' : '#1e293b') : (isGuestSearch ? 'rgba(255,255,255,0.3)' : '#94a3b8'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                              {member ? member.first_name : instLabel}
                                            </div>
                                            {member && (
                                              <div style={{ fontSize: '0.48rem', fontWeight: 800, color: isGuestSearch ? 'rgba(255,255,255,0.3)' : '#94a3b8', textTransform: 'uppercase' }}>
                                                {instLabel}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>

                               {form.isComplete && isMySlot && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                                  <div className="animation-pulse-subtle" style={{ 
                                    width: '100%', padding: '18px', 
                                    background: 'linear-gradient(135deg, #fef08a, #fde047)', 
                                    color: '#854d0e', borderRadius: '20px', fontWeight: 900, textAlign: 'center',
                                    border: '1px solid #eab308',
                                    boxShadow: '0 8px 25px rgba(234,179,8,0.2)',
                                    fontSize: '1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                  }}>
                                    <span>✨</span> Formation vollständig! 🎸 <span>✨</span>
                                  </div>
                                  {!form.originBand && (
                                    <button 
                                      onClick={() => {
                                        // Check for multi-band conflict first if the user already plays in another band
                                        if (userBands.length > 0) {
                                          const proceed = window.confirm('Deine Formation ist vollständig! 🎸\n\nDu spielst bereits in einer Band. Möchtest du wirklich eine zusätzliche Band gründen? Falls nicht, gibst du deinen Slot für andere frei.');
                                          if (!proceed) {
                                            (async () => {
                                               await supabase.from('user_song_skills').update({ formation_group: null }).eq('id', mySlot.skill_id);
                                               fetchDashboardData(user.id);
                                            })();
                                            return;
                                          }
                                        }

                                        // Open naming modal - whoever clicks the button becomes the leader/founder
                                        console.log('[DEBUG-Groovelab] setSuggestingSkill (Matching Board click) in App.tsx');
                                        setSuggestingSkill({
                                          ...mySlot,
                                          isLeader: true,
                                          leaderName: 'Du',
                                          song_id: song.song_id,
                                          songs: { id: song.song_id, title: song.title },
                                          formation_group: form.id,
                                          members: form.members
                                        });
                                        if (!foundingName) setFoundingName(generateRandomBandName(foundingLanguage));
                                      }}
                                      className="hero-cta-artistic"
                                      style={{ 
                                        padding: '20px', 
                                        borderRadius: '20px', 
                                        fontSize: '1.1rem', 
                                        width: '100%', 
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                                        color: 'white',
                                        border: 'none',
                                        boxShadow: '0 12px 28px rgba(234, 179, 8, 0.35)'
                                      }}
                                    >
                                      JETZT BAND GRÜNDEN
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                        
                        {!(song?.formations || []).some((f: any) => (f?.members || []).some((m: any) => m?.user_id === user?.id)) && (
                          <button 
                            onClick={async () => {
                              const mySkill = userSongs.find(us => us.song_id === song.song_id);
                              if (mySkill) {
                                const newId = `form_${Math.random().toString(36).substr(2, 9)}`;
                                await supabase.from('user_song_skills').update({ formation_group: newId }).eq('id', mySkill.id);
                                fetchDashboardData(user.id);
                              }
                            }}
                            style={{ padding: '16px', background: 'white', border: '2px dashed #cbd5e1', borderRadius: '24px', color: '#64748b', fontWeight: 800, cursor: 'pointer', width: '100%', marginTop: '20px' }}
                          >
                            + NEUE BAND-FORMATION STARTEN
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
          </section>
        </ErrorBoundary>
      )}

        {/* Bands Tab (Only for Students) */}
        {activeStudentTab === 'bands' && user.role === 'student' && (
          <ErrorBoundary>
            <section className="exercises-section glass-panel animation-slide-up" style={{ margin: isMobile ? '12px' : '24px', padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
                <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <div style={{ color: '#3b82f6' }}><Box size={isMobile ? 22 : 32} /></div>
                  Bands
                </h2>
              </div>

              {/* Band-Finder Sidebar */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (width < 1200 ? '1fr' : '1fr 380px'), gap: isMobile ? '24px' : '32px' }}>
                  {/* Left Column: Band Management */}
                  <div style={{ minWidth: 0 }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '6px', borderRadius: '20px', width: 'fit-content', marginBottom: isMobile ? '16px' : '24px' }}>
                      <button 
                        onClick={() => setActiveBandSubTab('meine')}
                        style={{ padding: isMobile ? '8px 16px' : '12px 24px', borderRadius: '16px', border: 'none', background: activeBandSubTab === 'meine' ? 'white' : 'transparent', color: activeBandSubTab === 'meine' ? '#1e293b' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '1rem', boxShadow: activeBandSubTab === 'meine' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                      >
                        Meine Bands
                      </button>
                      <button 
                        onClick={() => setActiveBandSubTab('alle')}
                        style={{ padding: isMobile ? '8px 16px' : '12px 24px', borderRadius: '16px', border: 'none', background: activeBandSubTab === 'alle' ? 'white' : 'transparent', color: activeBandSubTab === 'alle' ? '#1e293b' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '1rem', boxShadow: activeBandSubTab === 'alle' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                      >
                        Alle Bands
                      </button>
                    </div>

                    {activeBandSubTab === 'alle' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '20px', marginBottom: isMobile ? '16px' : '32px' }}>
                        <div style={{ position: 'relative' }}>
                          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input 
                            type="text"
                            placeholder="Nach Bands suchen..."
                            value={bandSearchText}
                            onChange={(e) => setBandSearchText(e.target.value)}
                            style={{ width: '100%', padding: isMobile ? '12px 16px 12px 44px' : '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: isMobile ? '0.95rem' : '1rem', fontWeight: 600, background: 'white', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div 
                          className="hide-scrollbar"
                          style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: '6px', overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                          <button
                            onClick={() => setBandSearchLetter(null)}
                            style={{ padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: '12px', border: 'none', background: !bandSearchLetter ? brandColor : '#f1f5f9', color: !bandSearchLetter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}
                          >
                            Alle
                          </button>
                          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                            <button
                              key={letter}
                              onClick={() => setBandSearchLetter(letter)}
                              style={{ padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: '12px', border: 'none', background: bandSearchLetter === letter ? brandColor : '#f1f5f9', color: bandSearchLetter === letter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {(() => {
                        const displayedBands = activeBandSubTab === 'meine' 
                          ? userBands 
                          : allBands.filter(band => {
                              const matchText = band.name?.toLowerCase().includes(bandSearchText.toLowerCase());
                              const matchLetter = bandSearchLetter ? band.name?.toUpperCase().startsWith(bandSearchLetter) : true;
                              return matchText && matchLetter;
                            });

                        if (displayedBands.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎸</div>
                              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                                {activeBandSubTab === 'meine' ? 'Noch kein Projekt aktiv' : 'Keine Bands gefunden'}
                              </h3>
                              <p style={{ color: '#64748b' }}>
                                {activeBandSubTab === 'meine' ? 'Tritt einer Formation bei oder gründe eine neue Band!' : 'Versuche eine andere Suche.'}
                              </p>
                            </div>
                          );
                        }

                        return displayedBands.map((band: any) => {
                          const uniqueMembersList = (() => {
                            const grouped: Record<string, any> = {};
                            (band.band_members || []).forEach((m: any) => {
                              const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                              const uid = u?.id || m.external_name || m.user_id || m.student_id;
                              if (uid) {
                                grouped[uid] = { ...m, user: u };
                              }
                            });
                            return Object.values(grouped);
                          })();

                          return (
                            <div 
                              key={band.id} 
                              onClick={() => { 
                                setSelectedBandForProfile(band); 
                                setShowBandProfile(true); 
                              }}
                              className="glass-panel hover-card" 
                              style={{ 
                                background: 'white', padding: isMobile ? '14px 16px' : '24px', borderRadius: isMobile ? '20px' : '32px', border: '1px solid #f1f5f9',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            >
                              <div style={{ display: 'flex', gap: isMobile ? '14px' : '24px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                {renderBandAvatar(band.name, band.photo_url, isMobile ? '52px' : '80px', isMobile ? '16px' : '24px')}
                                <div style={{ minWidth: 0 }}>
                                    <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{band.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 800, color: brandColor }}>{band.genre || 'Bandprojekt'}</span>
                                      <span style={{ color: '#cbd5e1' }}>•</span>
                                      <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 700, color: '#94a3b8' }}>{uniqueMembersList.length} Mitglieder</span>
                                    </div>
                                  </div>
                                </div>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskSize: '100% 100%' }}>
                                    {uniqueMembersList.map((m: any, idx: number) => {
                                      const u = m.user;
                                      return (
                                        <div key={idx} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: idx === 0 ? 0 : '-12px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`${u?.first_name || m.external_name || 'Mitglied'} (${m.instrument})`}>
                                            {m.user_id ? (
                                              <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            ) : (
                                              <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                            )}
                                        </div>
                                      );
                                    })}
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                    <ChevronRight size={24} />
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Vocal Sidebar */}
                  <div style={{ background: '#f8fafc', borderRadius: '32px', padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Mic size={20} />
                    </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Vocal-Finder</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Sänger gesucht für diese Sessions</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {(() => {
                        const vocalOpportunities: Array<{
                          band: any;
                          bandSong: any;
                          song: any;
                          vocalists: any[];
                          isFull: boolean;
                          isMeIn: boolean;
                        }> = [];

                        allBands.forEach(band => {
                          const members = band.band_members || [];
                          const bandSongs = band.band_songs || [];
                          
                          bandSongs.forEach((bs: any) => {
                            if (bs.status !== 'active') return;
                            
                            const song = bs.songs ? (Array.isArray(bs.songs) ? bs.songs[0] : bs.songs) : null;
                            if (!song) return;

                            const vocalists = (bs.band_song_slots || []).filter((s: any) => {
                              const inst = (s.instrument || '').toLowerCase();
                              return (inst.includes('vocal') || inst.includes('gesang')) && s.status !== 'declined';
                            });

                            const isFull = vocalists.length >= 2;
                            const isMeIn = vocalists.some((m: any) => m.user_id === user.id);

                            if (vocalists.length < 2) {
                              vocalOpportunities.push({
                                band,
                                bandSong: bs,
                                song,
                                vocalists,
                                isFull,
                                isMeIn
                              });
                            }
                          });
                        });

                        const activeVocalOpportunities = vocalOpportunities;

                        if (activeVocalOpportunities.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔇</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>Aktuell keine Gesangsslots frei</div>
                            </div>
                          );
                        }

                        return activeVocalOpportunities.map(opp => {
                          const { band, bandSong, song, vocalists, isFull, isMeIn } = opp;

                          return (
                            <div key={bandSong.id} className="glass-panel" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>
                                  {(song.artist) || 'Unbekannter Interpret'}
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                                  {(song.title) || 'Kein Titel'}
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Band: <span style={{ color: '#1e293b' }}>{band.name}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[0, 1].map(i => {
                                    const v = vocalists[i];
                                    return (
                                      <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #f8fafc', background: '#f1f5f9', overflow: 'hidden', willChange: 'transform' }}>
                                        {v ? (() => {
                                          const u = v.profiles || (Array.isArray(v.users) ? v.users[0] : v.users);
                                          return <StudioAvatar src={u?.photo_url} user={u} />;
                                        })() : (
                                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Plus size={12} /></div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                                  {vocalists.length}/2 Vocal-Slots besetzt
                                </span>
                              </div>

                              {isMeIn ? (
                                <div style={{ textAlign: 'center', padding: '10px', background: '#e6f4ea', borderRadius: '12px', color: '#34a853', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <CheckCircle size={16} /> Du bist dabei!
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <button 
                                    disabled={isFull || isJoiningVocal === bandSong.id}
                                    onClick={async () => {
                                      setIsJoiningVocal(bandSong.id);
                                      try {
                                        // 1. Join the band
                                        const { error: memErr } = await supabase.from('band_members').insert({
                                          band_id: band.id,
                                          user_id: user.id,
                                          instrument: 'Vocals'
                                        });
                                        if (memErr && !memErr.message.includes('duplicate key')) {
                                          console.error('Error joining band as vocalist:', memErr);
                                          setIsJoiningVocal(null);
                                          return;
                                        }

                                        // 2. Also join the active song project slots if it exists
                                        const hasSlot1 = vocalists.some((v: any) => v.part_number === 1);
                                        const nextPartNumber = hasSlot1 ? 2 : 1;

                                        await supabase.from('band_song_slots').insert({
                                          band_song_id: bandSong.id,
                                          user_id: user.id,
                                          instrument: 'Vocals',
                                          part_number: nextPartNumber,
                                          status: 'accepted'
                                        });
                                        
                                        await fetchDashboardData(user.id);
                                      } finally {
                                        setIsJoiningVocal(null);
                                      }
                                    }}
                                    style={{ 
                                      width: '100%', padding: '12px', borderRadius: '16px', border: 'none', 
                                      background: isFull ? '#f1f5f9' : '#34a853', 
                                      color: isFull ? '#94a3b8' : 'white', fontWeight: 900, cursor: (isFull || isJoiningVocal === bandSong.id) ? 'default' : 'pointer',
                                      fontSize: '0.85rem', transition: 'all 0.2s',
                                      opacity: isJoiningVocal === bandSong.id ? 0.7 : 1
                                    }}
                                  >
                                    {isFull ? 'Vocal-Slots voll' : (isJoiningVocal === bandSong.id ? 'Beitritt läuft...' : 'Jetzt als Sänger beitreten')}
                                  </button>

                                  {/* Teacher Manual Add */}
                                  {(user.role === 'teacher' || user.role === 'admin') && !isFull && (
                                    <div style={{ position: 'relative' }}>
                                      <button 
                                        onClick={async () => {
                                          if (showTeacherVocalPicker === bandSong.id) {
                                            setShowTeacherVocalPicker(null);
                                          } else {
                                            const { data } = await supabase.from('users').select('id, first_name, last_name, avatar_url, photo_url').eq('is_external_vocalist', true).eq('school_id', user.school_id);
                                            setExternalVocalists(data || []);
                                            setShowTeacherVocalPicker(bandSong.id);
                                          }
                                        }}
                                        style={{ width: '100%', padding: '10px', borderRadius: '14px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                      >
                                        <Plus size={14} /> Externen Sänger hinzufügen
                                      </button>

                                      {showTeacherVocalPicker === bandSong.id && (
                                        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', padding: '12px', zIndex: 100, marginBottom: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px' }}>Verfügbare Externe</div>
                                          {externalVocalists.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>Keine externen Sänger angelegt</div>
                                          ) : (
                                            externalVocalists.map(ev => (
                                              <button 
                                                key={ev.id}
                                                onClick={async () => {
                                                  const hasSlot1 = vocalists.some((v: any) => v.part_number === 1);
                                                  const nextPartNumber = hasSlot1 ? 2 : 1;
                                                  await supabase.from('band_members').insert({ band_id: band.id, user_id: ev.id, instrument: 'Vocals' });
                                                  await supabase.from('band_song_slots').insert({ band_song_id: bandSong.id, user_id: ev.id, instrument: 'Vocals', part_number: nextPartNumber, status: 'accepted' });
                                                  setShowTeacherVocalPicker(null);
                                                  fetchDashboardData(user.id);
                                                }}
                                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
                                                className="hover-bg"
                                              >
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden' }}>
                                                  <StudioAvatar src={ev.photo_url} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{ev.first_name} {ev.last_name}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>


                  </div>
                </div>
            </section>
          </ErrorBoundary>
        )}
        {activeStudentTab === 'library' && (
          <ErrorBoundary>
            <section className="exercises-section animation-slide-up" style={{ padding: isMobile ? '12px' : '24px' }}>
              <div className="glass-panel" style={{ padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
                  <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <Library size={isMobile ? 22 : 32} color={brandColor} />
                    Songbibliothek
                  </h2>
                  {!isMobile && <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Entdecke neue Songs und füge sie deinem Üben-Board hinzu.</p>}
                </div>

              {/* Search and Alpha Filter Navigation */}
              <div style={{ marginBottom: isMobile ? '16px' : '32px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', alignItems: isMobile ? 'stretch' : 'center' }}>
                  {/* Text Search */}
                  <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? 'unset' : '300px' }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text"
                      placeholder={`Suche nach ${librarySearchType === 'title' ? 'Songtitel' : 'Interpret'}...`}
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      style={{ width: '100%', padding: isMobile ? '13px 16px 13px 44px' : '16px 20px 16px 54px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: isMobile ? '0.95rem' : '1rem', fontWeight: 600, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Toggle Search Type */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px', alignSelf: isMobile ? 'flex-start' : 'center' }}>
                    <button 
                      onClick={() => setLibrarySearchType('title')}
                      style={{ 
                        padding: isMobile ? '8px 16px' : '10px 20px', borderRadius: '10px', border: 'none', 
                        background: librarySearchType === 'title' ? 'white' : 'transparent', 
                        color: librarySearchType === 'title' ? brandColor : '#64748b', 
                        fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '0.85rem',
                        boxShadow: librarySearchType === 'title' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Song
                    </button>
                    <button 
                      onClick={() => setLibrarySearchType('artist')}
                      style={{ 
                        padding: isMobile ? '8px 16px' : '10px 20px', borderRadius: '10px', border: 'none', 
                        background: librarySearchType === 'artist' ? 'white' : 'transparent', 
                        color: librarySearchType === 'artist' ? brandColor : '#64748b', 
                        fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '0.85rem',
                        boxShadow: librarySearchType === 'artist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Interpret
                    </button>
                  </div>
                </div>

                {/* Alphabet Bar */}
                <div 
                  className="hide-scrollbar"
                  style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    background: 'white', 
                    padding: '10px', 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    minWidth: 0
                  }}
                >
                  <button
                    onClick={() => setLibraryAlphaFilter(null)}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !libraryAlphaFilter ? brandColor : '#f8fafc', color: !libraryAlphaFilter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', minWidth: '50px', flexShrink: 0 }}
                  >
                    ALLE
                  </button>
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                    <button 
                      key={letter}
                      onClick={() => setLibraryAlphaFilter(letter)}
                      style={{ 
                        width: '34px', height: '34px', borderRadius: '10px', border: 'none', 
                        background: libraryAlphaFilter === letter ? brandColor : 'transparent', 
                        color: libraryAlphaFilter === letter ? 'white' : '#94a3b8', 
                        fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredLibrary.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', border: '2px dashed #f1f5f9' }}>
                    <Search size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Keine Songs gefunden</h3>
                    <p style={{ fontSize: '0.9rem' }}>Probiere einen anderen Suchbegriff oder Filter.</p>
                  </div>
                ) : (
                  filteredLibrary.map((song: any) => {
                    const LEVEL_COLORS: Record<string | number, string> = {
                      '1': '#ef4444', // Red
                      '2': '#3b82f6', // Blue
                      '3': '#34a853', // Emerald
                      '4': '#8b5cf6', // Violet
                      '5': '#ec4899', // Pink
                      'starter': '#ef4444',
                      'pro': '#8b5cf6'
                    };
                    const levelColor = LEVEL_COLORS[String(song.level).toLowerCase()] || '#f59e0b';
                    
                    // Dynamic HSL coloring based on song title (A-Z)
                    const firstLetter = (song.title || 'A').trim().toUpperCase().charAt(0);
                    const code = firstLetter.charCodeAt(0);
                    let pct = 0;
                    if (code >= 65 && code <= 90) {
                      pct = (code - 65) / (90 - 65);
                    } else {
                      pct = (code % 26) / 25;
                    }
                    const songHue = Math.floor(pct * 360);
                    const iconBg = `hsl(${songHue}, 90%, 96%)`;
                    const iconBorder = `hsl(${songHue}, 45%, 88%)`;
                    const iconColor = `hsl(${songHue}, 65%, 45%)`;

                    return (
                      <div 
                        key={song.id} 
                        className="glass-panel" 
                        style={{ 
                          padding: isMobile ? '16px' : '24px', 
                          background: 'white', 
                          border: '1px solid #f1f5f9',
                          borderLeft: `${isMobile ? '5px' : '8px'} solid ${levelColor}`, 
                          borderRadius: '24px',
                          display: 'flex', 
                          flexDirection: isMobile ? 'column' : 'row',
                          justifyContent: 'space-between', 
                          alignItems: isMobile ? 'stretch' : 'center', 
                          gap: isMobile ? '16px' : '24px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', flex: 1, width: '100%' }}>
                          {/* Music Icon Rounded Box */}
                          <div style={{ 
                            width: isMobile ? '48px' : '64px', 
                            height: isMobile ? '48px' : '64px', 
                            borderRadius: isMobile ? '12px' : '18px', 
                            background: iconBg, 
                            border: `1px solid ${iconBorder}`, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Music size={isMobile ? 22 : 28} color={iconColor} />
                          </div>

                          {/* Text Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 900, 
                              color: '#64748b', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.08em',
                              lineHeight: 1.2
                            }}>
                              {song.artist}
                            </div>
                            <div style={{ 
                              fontSize: isMobile ? '1.15rem' : '1.4rem', 
                              fontWeight: 950, 
                              color: '#0f172a', 
                              marginTop: '4px',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {song.title}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ 
                                background: '#fef3c7', 
                                color: '#b45309', 
                                padding: '4px 10px', 
                                borderRadius: '8px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700 
                              }}>
                                Level {song.level}
                              </span>
                              {song.media_link && (
                                <a 
                                  href={song.media_link} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ 
                                    color: '#2563eb', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    textDecoration: 'none', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    marginLeft: '8px' 
                                  }}
                                >
                                  <ExternalLink size={12} /> Noten / Media
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
                          {userSongs.some(us => us.song_id === song.id) ? (
                            <div style={{ 
                              background: '#e6f4ea', 
                              border: '1px solid #e6f4ea', 
                              padding: '12px 24px', 
                              borderRadius: '16px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: isMobile ? 'center' : 'flex-start',
                              gap: '8px', 
                              color: '#34a853', 
                              fontWeight: 900, 
                              fontSize: '0.85rem',
                              width: isMobile ? '100%' : 'auto'
                            }}>
                              <Check size={18} strokeWidth={3} /> Hinzugefügt
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddSongToRepertoire(song)}
                              style={{ 
                                background: '#ffffff', 
                                border: '1px solid #e2e8f0', 
                                padding: '12px 24px', 
                                borderRadius: '16px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: isMobile ? 'center' : 'flex-start',
                                gap: '8px', 
                                boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s ease' 
                              }}
                              
                              
                            >
                              <Plus size={18} color="#f59e0b" strokeWidth={3} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Üben</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
             )}
            </div>
            </div>
            </section>
          </ErrorBoundary>
        )}



        {/* Team Tab */}
        {user.role?.toLowerCase() === 'student' && activeStudentTab === 'team' && (
          <ErrorBoundary>
            <section className="exercises-section animation-slide-up" style={{ padding: '24px' }}>
              <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Unser Team</h3>
                    <p style={{ color: '#64748b', margin: 0, fontWeight: 600 }}>Die Köpfe hinter der GrooveLab Academy.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {teachers.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTeacher(t)} 
                      className="glass-panel"
                      style={{ 
                        padding: '32px', 
                        textAlign: 'center', 
                        background: 'white', 
                        borderRadius: '32px', 
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid #f1f5f9',
                        position: 'relative',
                        overflow: 'hidden',
                        willChange: 'transform',
                        backfaceVisibility: 'hidden'
                      }}
                      
                      
                    >
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100px', 
                        background: `linear-gradient(180deg, ${brandColor}10 0%, transparent 100%)`,
                        zIndex: 0
                      }}></div>

                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '110px', height: '110px', borderRadius: '40px', margin: '0 auto 20px auto', border: '5px solid white', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                          <StudioAvatar src={t.photo_url} user={t} />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {(t.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string, idx: number) => (
                              <span key={idx} style={{ fontSize: '1.25rem' }}>{APP_INSTRUMENT_ICONS[inst] || '🎸'}</span>
                            ))}
                          </div>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{t.first_name} {t.last_name}</h4>
                        </div>
                        
                        <div style={{ 
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '100px',
                          background: t.role === 'admin' ? '#fef3c7' : '#f1f5f9',
                          color: t.role === 'admin' ? '#b45309' : '#64748b',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '16px'
                        }}>
                          {t.role === 'admin' ? 'Lehrer' : 'Lehrer'}
                        </div>

                        <div style={{ 
                          padding: '16px',
                          background: '#f8fafc',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          color: '#64748b',
                          fontWeight: 600,
                          lineHeight: 1.4
                        }}>
                          {t.instrument} Expert & Coach
                        </div>
                      </div>
                    </div>
                  ))}

                  {teachers.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', background: 'white', borderRadius: '32px', border: '2px dashed #f1f5f9' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>👥</div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Noch keine Lehrer hinterlegt</h3>
                      <p style={{ color: '#64748b' }}>Dein Admin wird bald die Lehrer-Profile vervollständigen.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </ErrorBoundary>
        )}
      </main>

      {/* Mobile Native Bottom Navigation Bar (Controlled via CSS for Mobile & Simulator) */}
      {user && (
        <MobileBottomNav
          activeTab={activeStudentTab}
          setActiveTab={setActiveStudentTab}
          activePlatform={activePlatform as 'campus' | 'groovelab' | 'admin'}
          setActivePlatform={(p) => setActivePlatform(p)}
          userRole={user?.role?.toLowerCase() || 'student'}
          unreadCount={campusUnreadCount}
        />
      )}




      {/* Confetti Modal */}
      {showConfetti && (
        <Suspense fallback={null}>
          <ConfettiModal 
            showConfetti={showConfetti} 
            width={width} 
            height={height} 
            brandColor={brandColor} 
            clearConfetti={clearConfetti} 
          />
        </Suspense>
      )}

      {/* Help FAB (Only for logged-in students in Lab Mode with active station on the Groovelab platform) */}
      {user && activePlatform === 'groovelab' && user.role === 'student' && locationMode === 'lab' && session?.station_id && (
        <div className="fab-container">
          <button 
            className="fab-button" 
            onClick={handleHelpRequest}
            title="Hilfe rufen"
          >
            <AlertCircle size={28} />
          </button>
        </div>
      )}
      {/* Skill Suggestion & Band Founding Modals */}
      {suggestingSkill && suggestingSkill.formation_group && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(16px)' }}>
          <div className="animation-pop-in" style={{ 
            background: 'white', 
            padding: '50px', 
            borderRadius: '40px', 
            maxWidth: '550px', 
            width: '100%', 
            textAlign: 'center',
            boxShadow: '0 40px 120px rgba(0,0,0,0.6)'
          }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '35px', background: '#fefce8', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 10px 30px rgba(234, 179, 8, 0.2)' }}>
              <Users size={50} />
            </div>
            
            <h2 className="animation-glow-text" style={{ fontSize: '2.3rem', fontWeight: 1000, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.04em' }}>BAND GRÜNDEN 🎸</h2>
            <p style={{ fontSize: '1.15rem', color: '#64748b', lineHeight: 1.5, marginBottom: '32px', fontWeight: 600 }}>
              Eure Formation für <strong>{suggestingSkill.songs?.title || suggestingSkill.title}</strong> ist vollständig!
            </p>

            {suggestingSkill.isLeader ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Band Name Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Wie soll eure Band heißen?
                      </label>
                      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFoundingLanguage('de');
                            setFoundingName(generateRandomBandName('de'));
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: foundingLanguage === 'de' ? '#eab308' : 'transparent',
                            color: foundingLanguage === 'de' ? 'white' : '#64748b',
                            transition: 'all 0.15s'
                          }}
                        >
                          DE
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFoundingLanguage('en');
                            setFoundingName(generateRandomBandName('en'));
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: foundingLanguage === 'en' ? '#eab308' : 'transparent',
                            color: foundingLanguage === 'en' ? 'white' : '#64748b',
                            transition: 'all 0.15s'
                          }}
                        >
                          EN
                        </button>
                      </div>
                    </div>
                    <div style={{ width: '100%', position: 'relative' }}>
                      <input 
                        type="text"
                        value={foundingName}
                        onChange={(e) => setFoundingName(e.target.value)}
                        placeholder="Z.B. Die wilden Töne"
                        style={{ 
                          width: '100%', 
                          padding: '16px 50px 16px 16px', 
                          background: 'white', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '16px', 
                          color: '#1e293b', 
                          fontSize: '1rem', 
                          fontWeight: 700,
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = '#eab308'}
                        onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                      />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFoundingName(generateRandomBandName(foundingLanguage)); }}
                        style={{ 
                          position: 'absolute', 
                          right: '8px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          background: '#f8fafc', 
                          border: '1px solid #cbd5e1', 
                          color: '#eab308', 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '10px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Neuen Namen würfeln"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Coach Selection Section – Apple-style card picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Wähle euren Bandcoach (Lehrer): *
                    </label>
                    {teachers.length === 0 ? (
                      <div style={{ background: '#f1f5f9', borderRadius: '16px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Keine Lehrer gefunden
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {teachers.filter(t => !t.is_observer).map(t => {
                          const isSelected = selectedCoachId === t.id;
                          const initials = `${(t.first_name || '')[0] || ''}${(t.last_name || '')[0] || ''}`.toUpperCase();
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedCoachId(t.id)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '16px 10px',
                                background: isSelected ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(234, 179, 8, 0.04))' : 'white',
                                border: isSelected ? '2.5px solid #eab308' : '2px solid #e2e8f0',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                                boxShadow: isSelected ? '0 8px 24px rgba(234, 179, 8, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                position: 'relative',
                                minWidth: 0
                              }}
                            >
                              {isSelected && (
                                <div style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  width: '18px',
                                  height: '18px',
                                  background: '#eab308',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  color: 'white',
                                  fontWeight: 900
                                }}>✓</div>
                              )}
                              {t.photo_url ? (
                                <img
                                  src={t.photo_url}
                                  alt={t.first_name}
                                  onError={(e) => { e.currentTarget.style.display='none'; }}
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: isSelected ? '3px solid #eab308' : '3px solid #e2e8f0',
                                    transition: 'border 0.2s'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '52px',
                                  height: '52px',
                                  borderRadius: '50%',
                                  background: isSelected ? 'linear-gradient(135deg, #eab308, #ca8a04)' : 'linear-gradient(135deg, #94a3b8, #64748b)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.1rem',
                                  fontWeight: 900,
                                  color: 'white',
                                  letterSpacing: '-0.02em',
                                  transition: 'background 0.2s'
                                }}>
                                  {initials || '?'}
                                </div>
                              )}
                              <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? '#eab308' : '#1e293b', transition: 'color 0.2s' }}>
                                  {t.first_name}
                                </div>
                                {t.last_name && (
                                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: isSelected ? 'rgba(234, 179, 8, 0.8)' : '#64748b', transition: 'color 0.2s' }}>
                                    {t.last_name}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0', lineHeight: 1.4 }}>
                      💡 <em>Lehrer können den Bandcoach nachträglich jederzeit ändern.</em>
                    </p>
                  </div>

                </div>

                {/* Confirm Button */}
                <button 
                  onClick={() => {
                    if (!selectedCoachId) {
                      alert('Bitte wähle euren Bandcoach aus, um die Band zu gründen!');
                      return;
                    }
                    handleFoundBand(suggestingSkill);
                  }}
                  className="hero-cta-artistic"
                  style={{ 
                    width: '100%', 
                    background: 'linear-gradient(135deg, #ca8a04, #eab308)', 
                    border: 'none', 
                    padding: '20px', 
                    borderRadius: '18px', 
                    fontSize: '1.1rem', 
                    fontWeight: 900, 
                    color: 'white', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    boxShadow: '0 10px 25px rgba(234, 179, 8, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Zap size={20} fill="white" /> EIGENE BAND GRÜNDEN 🚀
                </button>
              </div>
            ) : (
              <div style={{ 
                background: '#f8fafc', 
                padding: '30px', 
                borderRadius: '24px', 
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎸</div>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem', marginBottom: '8px' }}>Eure Formation ist vollständig!</div>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Dein Teamkollege <span style={{ color: brandColor, fontWeight: 900 }}>{suggestingSkill.leaderName}</span> wurde als Bandleader ausgewählt und gründet gerade eure neue Band mit einem Coach.
                </p>
                <div style={{ marginTop: '20px', fontSize: '0.75rem', color: brandColor, fontWeight: 800, letterSpacing: '0.05em' }} className="animate-pulse">
                  BITTE KURZ WARTEN...
                </div>

                <button 
                  onClick={() => dismissSuggestion(suggestingSkill.id || suggestingSkill.skill_id)}
                  style={{ 
                    marginTop: '24px',
                    width: '100%', 
                    background: brandColor, 
                    border: 'none', 
                    padding: '16px 24px', 
                    borderRadius: '16px', 
                    fontSize: '1rem', 
                    fontWeight: 900, 
                    color: 'white', 
                    cursor: 'pointer',
                    boxShadow: `0 8px 20px ${brandColor}20`,
                    transition: 'all 0.2s'
                  }}
                  
                  
                >
                  ZURÜCK ZUM DASHBOARD
                </button>
              </div>
            )}

            {/* Cancel Button */}
            <button 
              onClick={() => dismissSuggestion(suggestingSkill.id || suggestingSkill.skill_id)}
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer', marginTop: '16px' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {suggestingSkill && !suggestingSkill.formation_group && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)' }}>
          <div className="animation-pop-in" style={{ 
            background: 'white', 
            padding: '60px', 
            borderRadius: '40px', 
            maxWidth: '550px', 
            width: '100%', 
            textAlign: 'center',
            boxShadow: '0 40px 120px rgba(0,0,0,0.5)'
          }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '35px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px auto', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.2)' }}>
              <Zap size={50} fill="currentColor" />
            </div>
            <h2 className="animation-glow-text" style={{ fontSize: '2.5rem', fontWeight: 1000, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.04em' }}>GLÜCKWUNSCH! 🏆</h2>
            <p style={{ fontSize: '1.25rem', color: '#64748b', lineHeight: 1.6, marginBottom: '40px', fontWeight: 600 }}>
              Du hast <strong>{suggestingSkill.songs?.title || suggestingSkill.title}</strong> gemeistert.<br/>
              Bist du bereit für den nächsten Schritt?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
              
              {/* Option 1 Panel */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: brandColor, color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>1</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Song einer deiner Bands vorschlagen</div>
                </div>
                
                {userBands.length > 0 ? (
                  (() => {
                    const filteredBands = userBands.filter(band => {
                      const myMember = (band.band_members || []).find((m: any) => m.user_id === user?.id);
                      if (!myMember) return false;
                      
                      const bandSong = (band.band_songs || []).find((bs: any) => (bs.songs?.id || bs.song_id) === suggestingSkill.song_id);
                      if (!bandSong) return true;
                      
                      const song = globalSongs.find(s => s.id === suggestingSkill.song_id);
                      if (!song || !song.instrumentation) return true;
                      
                      const req = song.instrumentation;
                      const slots = bandSong.band_song_slots || [];
                      const isComplete = Object.keys(req).every(inst => {
                        const needed = req[inst] || 0;
                        if (needed === 0) return true;
                        const filled = slots.filter((sl: any) => sl.instrument === inst).length;
                        return filled >= needed;
                      });
                      
                      return !isComplete;
                    });

                    if (filteredBands.length === 0) {
                      return (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '8px 0' }}>
                          Dieser Song wurde bereits komplett besetzt oder deine Bands haben keine passenden Slots.
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredBands.map(band => (
                          <button 
                            key={band.id}
                            onClick={() => handleSuggestToBand(band.id, suggestingSkill)}
                            style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            
                            
                          >
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: brandColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{band.name?.[0]}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, color: '#1e293b' }}>{band.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mitglieder benachrichtigen</div>
                            </div>
                            <Plus size={20} color={brandColor} />
                          </button>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '8px 0' }}>Du bist derzeit noch in keiner Band registriert.</div>
                )}
              </div>

              {/* Option 2 Panel */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: brandColor, color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>2</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neue Formation suchen oder gründen</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    onClick={async () => {
                      try {
                        const newId = `form_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // 1. Close modal instantly and mark as ignored to prevent auto-retriggering!
                        if (user) {
                          const sId = suggestingSkill.song_id || suggestingSkill.songs?.id;
                          if (sId) {
                            const inst = (suggestingSkill.instrument || '').toLowerCase();
                            localStorage.setItem(`groovelab_founding_ignored_${user.id}_${sId}_${inst}`, 'true');
                          }
                          const skillRecordId = suggestingSkill.id || suggestingSkill.skill_id;
                          if (skillRecordId) {
                            const storageKey = `groovelab_prompted_${user.id}`;
                            const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
                            if (!promptedIds.includes(skillRecordId)) {
                              promptedIds.push(skillRecordId);
                              localStorage.setItem(storageKey, JSON.stringify(promptedIds));
                            }
                          }
                        }
                        console.log('[DEBUG-Groovelab] setSuggestingSkill(null) in handleSuggestToBand');
                        setSuggestingSkill(null);
                        
                        // 2. Resolve skill record ID with database fallback
                        let skillRecordId = suggestingSkill.id || suggestingSkill.skill_id;
                        const songId = suggestingSkill.song_id || suggestingSkill.songs?.id;
                        
                        if (!skillRecordId && user && songId) {
                          const { data } = await supabase
                            .from('user_song_skills')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('song_id', songId)
                            .maybeSingle();
                          
                          if (data) {
                            skillRecordId = data.id;
                          } else {
                            const { data: newRecord } = await supabase
                              .from('user_song_skills')
                              .insert({
                                user_id: user.id,
                                song_id: songId,
                                instrument: suggestingSkill.instrument || 'Gitarre',
                                difficulty_level: suggestingSkill.difficulty_level || 'starter',
                                progress_percent: 100,
                                is_stage_ready: true
                              })
                              .select('id')
                              .maybeSingle();
                            if (newRecord) {
                              skillRecordId = newRecord.id;
                            }
                          }
                        }
                        
                        if (skillRecordId) {
                          // 3. Open public formation slot
                          const { error } = await supabase
                            .from('user_song_skills')
                            .update({ formation_group: newId })
                            .eq('id', skillRecordId);
                          
                          if (error) {
                            console.error('[Option 2] Error opening slot:', error);
                            alert('Fehler beim Öffnen des Matching-Slots: ' + error.message);
                          } else {
                            // 4. Background sync and navigate
                            if (user) await fetchDashboardData(user.id, false);
                            
                            // 5. Show beautiful visual success alert
                            alert(`Erfolg! 🎉\n\nEin neuer, öffentlicher Matching-Slot für „${suggestingSkill.songs?.title || suggestingSkill.title || 'deinen Song'}“ wurde für dich geöffnet!\n\nDeine Teamkollegen können sich nun im Matching-Board eintragen.`);
                            
                            setActiveStudentTab('matching');
                          }
                        } else {
                          console.error('[Option 2] Could not resolve skill record ID');
                          alert('Konnte keinen passenden Skill-Datensatz finden oder erstellen.');
                        }
                      } catch (err: any) {
                        console.error('[Option 2] Error in new formation search:', err);
                        alert('Ein Fehler ist aufgetreten: ' + err.message);
                      }
                    }}
                    style={{ 
                      width: '100%', 
                      background: 'white', 
                      border: '1px solid #cbd5e1', 
                      color: '#1e293b', 
                      padding: '16px', 
                      borderRadius: '16px', 
                      fontWeight: 800, 
                      fontSize: '0.95rem', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    
                    
                  >
                    <Users size={18} /> NEUE FORMATION SUCHEN
                  </button>
                </div>
              </div>

              {/* Maybe later button */}
              <button 
                onClick={() => dismissSuggestion(suggestingSkill.id)}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer', marginTop: '-8px' }}
              >
                Vielleicht später
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: QR Code anzeigen */}
      {showQR && (user?.qr_token || user?.teacher_qr_token) && (
        <Suspense fallback={null}>
          <QRCodeModal user={user} activePlatform={activePlatform} onClose={() => setShowQR(false)} />
        </Suspense>
      )}

      {showCampusPinPrompt && (
        <Suspense fallback={null}>
          <CampusPinUnlockModal 
            user={user}
            supabase={supabase}
            schoolData={school}
            onUnlock={() => {
              setIsCampusUnlocked(true);
              setShowCampusPinPrompt(false);
              setActivePlatform('campus');
              const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
              const startTab = isStaff ? 'live' : 'briefing';
              setActiveStudentTab(startTab);
              localStorage.setItem('campus_active_tab', startTab);
            }}
            onClose={() => {
              setShowCampusPinPrompt(false);
            }}
          />
        </Suspense>
      )}

      {/* Pilot Phase Onboarding Agreement Modal */}
      {showPilotAgreementModal && user?.school_id && user?.id && (
        <Suspense fallback={null}>
          <PilotOnboardingModal
            schoolId={user.school_id}
            userId={user.id}
            onComplete={() => setShowPilotAgreementModal(false)}
            onShowPrivacy={() => setShowPrivacy(true)}
            onShowAgb={() => setShowAgb(true)}
          />
        </Suspense>
      )}

      {/* Global Leitfäden & Akademie Modal */}
      {isGlobalHelpCenterOpen && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={isGlobalHelpCenterOpen}
            onClose={() => setIsGlobalHelpCenterOpen(false)}
            userRole={(() => {
              // 1. If currently authenticated user is a student, ALWAYS return 'student'
              if (user?.role?.toLowerCase() === 'student') return 'student';
              
              const activeWs = typeof window !== 'undefined'
                ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace'))
                : null;
              
              // 2. Active workspace overrides for dual-role users (teachers/admins)
              if (activeWs === 'student') return 'student';
              if (activeWs === 'teacher') return 'teacher';
              if (activeWs === 'secretary') return 'secretary';
              
              // 3. User role fallbacks
              if (user?.role?.toLowerCase() === 'teacher') return 'teacher';
              if (user?.role?.toLowerCase() === 'secretary') return 'secretary';
              return (user?.role as any) || 'admin';
            })()}
            activePlatform={activePlatform as any}
            schoolName={school?.name || 'Meine Musikschule'}
          />
        </Suspense>
      )}

      {/* 30-Tage Probezeit Status & Upgrade Modal */}
      {showTrialInfoModal && (
        <Suspense fallback={null}>
          <TrialInfoModal
            isOpen={showTrialInfoModal}
            onClose={() => setShowTrialInfoModal(false)}
            school={school}
            userRole={user?.role}
            trialDaysLeft={trialDaysLeft}
            onNavigateToBilling={() => {
              setShowTrialInfoModal(false);
              if (user?.role === 'admin' || user?.role === 'secretary') {
                sessionStorage.setItem('groovelab_active_workspace', 'secretary');
                handleSwitchActiveRole('admin');
              }
            }}
          />
        </Suspense>
      )}

      {/* Render Legal Modals Helper Call */}
      {renderLegalModals()}


      {/* Mobile Info Overlay Modal for Consolidated Status Pills */}
      {showMobileInfo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 9, 11, 0.40)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Status & Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Musikschule:</span>
                <span style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 800 }}>{school?.name || 'Meine Musikschule'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Benutzer:</span>
                <span style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 800 }}>{user?.first_name} {user?.last_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Rolle:</span>
                <span style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 800, textTransform: 'uppercase' }}>
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'teacher' ? 'Lehrer' : user?.role === 'secretary' ? 'Sekretariat' : 'Schüler'}
                </span>
              </div>
              {school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Probezeit:</span>
                  <span style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 800 }}>
                    {trialDaysLeft > 0 ? `${trialDaysLeft} Tage verbleibend` : 'Abgelaufen'}
                  </span>
                </div>
              )}
              {locationMode === 'lab' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Station:</span>
                  <span style={{ fontSize: '0.85rem', color: '#34a853', fontWeight: 800 }}>
                    {session?.stations?.name || 'Labor iPad'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowMobileInfo(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: activePlatform === 'campus' ? '#34a853' : (activePlatform === 'ensembles' ? '#3b82f6' : '#eab308'),
                color: activePlatform === 'groovelab' ? '#09090b' : 'white',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      {(() => {
        const getMobileButtonStyle = (tabName: string, activeClass: string = '') => {
          let isActive = false;
          if (tabName === 'briefing' && user?.role === 'student' && activePlatform === 'campus') {
            isActive = ['briefing', 'profile'].includes(activeStudentTab);
          } else {
            isActive = activeStudentTab === tabName;
          }

          let activeBg = '#fef3c7';
          let activeTextColor = '#b45309';

          if (activeClass === 'campus') {
            activeBg = '#34a853';
            activeTextColor = '#ffffff';
          } else if (activeClass === 'briefing') {
            activeBg = '#ea4335';
            activeTextColor = '#ffffff';
          } else if (activeClass === 'groovelab') {
            activeBg = '#eab308';
            activeTextColor = '#1e293b';
          }

          return {
            display: 'inline-flex',
            flexDirection: 'row' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: isActive ? 'none' : '1px solid #e2e8f0',
            background: isActive ? activeBg : '#ffffff',
            color: isActive ? activeTextColor : '#475569',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
            boxShadow: isActive 
              ? (activeClass === 'campus' ? '0 4px 12px rgba(52, 168, 83, 0.25)' : '0 4px 12px rgba(234, 179, 8, 0.25)') 
              : '0 2px 5px rgba(0,0,0,0.02)',
            height: '38px',
            boxSizing: 'border-box' as const
          };
        };

        return (
          <nav 
            className="mobile-nav" 
            style={{ 
              display: windowWidth <= 1024 ? 'flex' : 'none',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px calc(14px + env(safe-area-inset-bottom)) 14px',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {user?.role?.toLowerCase() === 'student' ? (
              activePlatform === 'campus' ? (() => {
                const campusSettings = user?.schools?.opening_hours?.campus_settings || {};
                const showLeaderboard = campusSettings.show_leaderboard !== false;
                const showDetailedStats = campusSettings.show_detailed_stats !== false;
                const flamesActive = campusSettings.flames_active !== false;

                return (
                  <>
                    <button onClick={() => setActiveStudentTab('briefing')} style={getMobileButtonStyle('briefing', 'campus')} className="hover-scale" title="Briefing">
                      <Monitor size={18} /> <span>Briefing</span>
                    </button>
                    <button onClick={() => setActiveStudentTab('homework_book')} style={getMobileButtonStyle('homework_book', 'campus')} className="hover-scale" title="Aufgaben">
                      <BookOpen size={18} /> <span>Aufgaben</span>
                    </button>
                    {flamesActive && (
                      <button onClick={() => setActiveStudentTab('practice_board')} style={getMobileButtonStyle('practice_board', 'campus')} className="hover-scale" title="Übe-Pfad">
                        <Zap size={18} /> <span>Übe-Pfad</span>
                      </button>
                    )}
                    <button onClick={() => setActiveStudentTab('mediathek')} style={getMobileButtonStyle('mediathek', 'campus')} className="hover-scale" title="Mediathek">
                      <Library size={18} /> <span>Mediathek</span>
                    </button>
                    <button onClick={() => setActiveStudentTab('events')} style={getMobileButtonStyle('events', 'campus')} className="hover-scale" title="Termine">
                      <Calendar size={18} /> <span>Termine</span>
                    </button>
                    {showLeaderboard && (
                      <button onClick={() => setActiveStudentTab('campus_cup')} style={getMobileButtonStyle('campus_cup', 'campus')} className="hover-scale" title="Highlights & Fortschritt">
                        <Trophy size={18} /> <span>Highlights & Fortschritt</span>
                      </button>
                    )}
                    <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'campus')} className="hover-scale" title="Profil">
                      <User size={18} /> <span>Profil</span>
                    </button>
                    <button onClick={() => setActiveStudentTab('settings')} style={getMobileButtonStyle('settings', 'campus')} className="hover-scale" title="Einstellungen">
                      <Settings size={18} /> <span>Einstellungen</span>
                    </button>
                  </>
                );
              })()
              : (
                <>
                  <button onClick={() => setActiveStudentTab('live')} style={{ ...getMobileButtonStyle('live', 'groovelab'), position: 'relative' }} className="hover-scale" title="Live Lab">
                    <Monitor size={18} /> <span>Live Lab</span>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', position: 'absolute', top: '4px', right: '4px' }} className="animate-pulse"></div>
                  </button>
                  {!user.is_external_vocalist && (
                    <>
                      <button onClick={() => setActiveStudentTab('practice')} style={getMobileButtonStyle('practice', 'groovelab')} className="hover-scale" title="Üben">
                        <Play size={18} fill={activeStudentTab === 'practice' ? '#1e293b' : 'none'} /> <span>Üben</span>
                      </button>
                      <button onClick={() => setActiveStudentTab('library')} style={getMobileButtonStyle('library', 'groovelab')} className="hover-scale" title="Bibliothek">
                        <Library size={18} /> <span>Bibliothek</span>
                      </button>
                    </>
                  )}
                  <button onClick={() => setActiveStudentTab('repertoire')} style={getMobileButtonStyle('repertoire', 'groovelab')} className="hover-scale" title="Repertoire">
                    <Award size={18} /> <span>Repertoire</span>
                  </button>
                  {!user.is_external_vocalist && (
                    <button onClick={() => setActiveStudentTab('matching')} style={getMobileButtonStyle('matching', 'groovelab')} className="hover-scale" title="Band-Matching">
                      <Users size={18} /> <span>Band-Matching</span>
                    </button>
                  )}
                  <button onClick={() => setActiveStudentTab('bands')} style={getMobileButtonStyle('bands', 'groovelab')} className="hover-scale" title="Bands">
                    <Box size={18} /> <span>Bands</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('messages')} style={{ ...getMobileButtonStyle('messages', 'groovelab'), position: 'relative' }} className="hover-scale" title="Nachrichten">
                    <Megaphone size={18} /> <span>Nachrichten</span>
                    {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length > 0 && (
                      <div style={{ 
                        background: '#ef4444', 
                        color: 'white', 
                        borderRadius: '50%', 
                        minWidth: '16px', 
                        height: '16px', 
                        padding: '0 4px',
                        fontSize: '0.6rem', 
                        fontWeight: 900, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        position: 'absolute',
                        top: '2px',
                        right: '4px'
                      }}>{studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}</div>
                    )}
                  </button>
                  <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'groovelab')} className="hover-scale" title="Profil">
                    <User size={18} /> <span>Profil</span>
                  </button>
                </>
              )
            ) : (
              activePlatform === 'campus' ? (
                <>
                  <button onClick={() => setActiveStudentTab('briefing')} style={getMobileButtonStyle('briefing', 'campus')} className="hover-scale" title="Briefing">
                    <Monitor size={18} /> <span>Briefing</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('schedule')} style={getMobileButtonStyle('schedule', 'campus')} className="hover-scale" title="Stundenplan">
                    <Calendar size={18} /> <span>Stundenplan</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('students')} style={getMobileButtonStyle('students', 'campus')} className="hover-scale" title="Schüler">
                    <Users size={18} /> <span>Schüler</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('songs')} style={getMobileButtonStyle('songs', 'campus')} className="hover-scale" title="Mediathek">
                    <Library size={18} /> <span>Mediathek</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('rooms')} style={getMobileButtonStyle('rooms', 'campus')} className="hover-scale" title="Räume">
                    <Box size={18} /> <span>Räume</span>
                  </button>
                  {showMissionsFeature && (
                    <button onClick={() => setActiveStudentTab('missions')} style={getMobileButtonStyle('missions', 'campus')} className="hover-scale" title="Missions">
                      <Compass size={18} /> <span>Missions</span>
                    </button>
                  )}
                  <button onClick={() => setActiveStudentTab('stats')} style={getMobileButtonStyle('stats', 'campus')} className="hover-scale" title="Highlights & Fortschritt">
                    <Trophy size={18} /> <span>Highlights & Fortschritt</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('setup')} style={getMobileButtonStyle('setup', 'campus')} className="hover-scale" title="Einstellungen">
                    <Settings size={18} /> <span>Einstellungen</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'campus')} className="hover-scale" title="Profil">
                    <User size={18} /> <span>Profil</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveStudentTab('live')} style={{ ...getMobileButtonStyle('live', 'groovelab'), position: 'relative' }} className="hover-scale" title="Live Lab">
                    <Monitor size={18} /> <span>Live Lab</span>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', position: 'absolute', top: '4px', right: '4px' }} className="animate-pulse"></div>
                  </button>
                  <button onClick={() => setActiveStudentTab('messages')} style={getMobileButtonStyle('messages', 'groovelab')} className="hover-scale" title="Nachrichten">
                    <Mail size={18} /> <span>Nachrichten</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('students')} style={getMobileButtonStyle('students', 'groovelab')} className="hover-scale" title="Schüler">
                    <Users size={18} /> <span>Schüler</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('team')} style={getMobileButtonStyle('team', 'groovelab')} className="hover-scale" title="Team">
                    <Shield size={18} /> <span>Team</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('rooms')} style={getMobileButtonStyle('rooms', 'groovelab')} className="hover-scale" title="Räume">
                    <Box size={18} /> <span>Räume</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('songs')} style={getMobileButtonStyle('songs', 'groovelab')} className="hover-scale" title="Songs">
                    <Library size={18} /> <span>Songs</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('bands')} style={getMobileButtonStyle('bands', 'groovelab')} className="hover-scale" title="Bands">
                    <Box size={18} /> <span>Bands</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('stats')} style={getMobileButtonStyle('stats', 'groovelab')} className="hover-scale" title="Statistik">
                    <Music size={18} /> <span>Statistik</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('gallery')} style={getMobileButtonStyle('gallery', 'groovelab')} className="hover-scale" title="ID Galerie">
                    <QrCode size={18} /> <span>ID Galerie</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('setup')} style={getMobileButtonStyle('setup', 'groovelab')} className="hover-scale" title="Einstellungen">
                    <Settings size={18} /> <span>Einstellungen</span>
                  </button>
                  <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'groovelab')} className="hover-scale" title="Profil">
                    <User size={18} /> <span>Profil</span>
                  </button>
                </>
              )
            )}
          </nav>
        );
      })()}
      {/* Announcement Notification Modal */}
      {activeAnnouncement && (() => {
        let parsed;
        try {
          parsed = JSON.parse(activeAnnouncement.content);
        } catch (e) {
          parsed = {
            title: 'Wichtige Mitteilung',
            target_type: 'all',
            target_user_ids: [],
            message: activeAnnouncement.content
          };
        }
        const senderName = activeAnnouncement.users ? `${activeAnnouncement.users.first_name || ''} ${activeAnnouncement.users.last_name || ''}`.trim() : 'GrooveLab';
        const senderPhoto = activeAnnouncement.users?.photo_url;
        
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}>
            <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', maxWidth: '600px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilung</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>{parsed.title}</h2>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {senderPhoto ? <StudioAvatar src={senderPhoto} user={activeAnnouncement.users} /> : <User size={20} style={{ color: '#94a3b8' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{senderName}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    {new Date(activeAnnouncement.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr
                  </div>
                </div>
              </div>
              
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: 650, 
                color: '#475569', 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap', 
                maxHeight: '40vh', 
                overflowY: 'auto', 
                paddingRight: '8px' 
              }}>
                {parsed.message}
              </div>
              
              <button 
                type="button" 
                onClick={() => handleAcknowledgeAnnouncement(activeAnnouncement)} 
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '18px 24px', 
                  borderRadius: '20px', 
                  fontSize: '1rem', 
                  fontWeight: 850, 
                  cursor: 'pointer', 
                  boxShadow: '0 8px 20px rgba(59,130,246,0.3)', 
                  transition: 'all 0.2s', 
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                className="hover-scale"
              >
                <CheckCircle size={20} />
                Gelesen & Schließen
              </button>
              
            </div>
          </div>
        );
      })()}

      {selectedTeacher && (
        <Suspense fallback={null}>
          <TeacherDetailModal 
            teacher={selectedTeacher} 
            onClose={() => setSelectedTeacher(null)} 
          />
        </Suspense>
      )}

      {selectedStudentProfile && (
        <Suspense fallback={null}>
          <StudentDetailModal 
            student={selectedStudentProfile} 
            onClose={() => setSelectedStudentProfile(null)} 
            onOpenBandProfile={(band) => {
              setSelectedBandForProfile(band);
              setBandProfileView('public');
              setShowBandProfile(true);
              setSelectedStudentProfile(null);
            }}
            onOpenTageskompass={(student) => {
              if ((window as any).openTageskompass) {
                (window as any).openTageskompass(student);
              }
              setSelectedStudentProfile(null);
            }}
            activePlatform={activePlatform as any}
            callerDashboard={user?.role === 'teacher' ? 'teacher' : user?.role === 'secretary' ? 'secretary' : user?.role === 'admin' ? 'admin' : undefined}
            onSwitchPlatform={(newPlatform) => {
              setActivePlatform(newPlatform);
            }}
          />
        </Suspense>
      )}

      {/* Auto-Lock Inactivity Warning Modal */}
      {showAutoLockWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div className="glass-panel animation-slide-up" style={{
            background: '#ffffff',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '36px',
            borderRadius: '28px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
            }}>
              <Clock size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
                Bist du noch da?
              </h2>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', lineHeight: 1.5, fontWeight: 550 }}>
                Aufgrund von Inaktivität wirst du in <span style={{ color: '#ef4444', fontWeight: 800 }}>{autoLockCountdown} Sekunden</span> automatisch abgemeldet.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAutoLockWarning(false);
                }}
                style={{
                  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(52,168,83,0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%'
                }}
                className="hover-scale"
              >
                <Check size={20} />
                Ja, weiterüben!
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAutoLockWarning(false);
                  handleLogout(true, false);
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
                className="hover-scale"
              >
                Jetzt abmelden
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Profile Modal */}
      {showEditProfile && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)' }}>
          <form onSubmit={handleUpdateProfile} className="glass-panel animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255, 255, 255, 0.5)', padding: '36px', borderRadius: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1c1c1e', margin: 0, letterSpacing: '-0.02em' }}>Profil bearbeiten</h2>
              <button type="button" onClick={() => setShowEditProfile(false)} style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#48484a', cursor: 'pointer', transition: 'background 0.2s' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {user.role === 'student' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vorname</label>
                      <input required value={editingProfile.first_name || ''} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anfangsbuchstabe Nachname</label>
                      <input required maxLength={1} value={editingProfile.last_name || ''} onChange={e => {
                        const val = e.target.value.trim().substring(0, 1).toUpperCase();
                        setEditingProfile({...editingProfile, last_name: val});
                      }} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none' }} />
                    </div>
                  </div>

                  {user.instrument && (user.instrument.toLowerCase().includes('guitar') || user.instrument.toLowerCase().includes('gitarre')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profilbild (Avatar)</label>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {[
                          { id: 'gitarre', label: 'Akustische Gitarre (Standard)', url: '/avatars/gitarre_avatar_new.png' },
                          { id: 'egitarre', label: 'E-Gitarre', url: '/avatars/egitarre_avatar.png' }
                        ].map((avatar) => {
                          const isSelected = editingProfile.photo_url === avatar.url || (!editingProfile.photo_url && avatar.id === 'gitarre');
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setEditingProfile({ ...editingProfile, photo_url: avatar.url })}
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '16px',
                                borderRadius: '16px',
                                border: `2px solid ${isSelected ? brandColor : 'rgba(0, 0, 0, 0.08)'}`,
                                background: isSelected ? `${brandColor}08` : 'rgba(255, 255, 255, 0.65)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                boxShadow: isSelected ? `0 8px 20px ${brandColor}15` : 'none'
                              }}
                            >
                              <div style={{ width: '80px', height: '80px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <img src={avatar.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={avatar.label} />
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#1c1c1e' : '#48484a' }}>{avatar.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vorname</label>
                      <input required value={editingProfile.first_name || ''} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nachname</label>
                      <input required value={editingProfile.last_name || ''} onChange={e => setEditingProfile({...editingProfile, last_name: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'block' }}>Instrumente (Icons anklicken):</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                      {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                        const isSelected = (editingProfile.groovelab_instrument || '').includes(inst);
                        return (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => {
                              const current = (editingProfile.groovelab_instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                              const next = current.includes(inst) ? current.filter((s: string) => s !== inst) : [...current, inst];
                              setEditingProfile({...editingProfile, groovelab_instrument: next.join(', ')});
                            }}
                            style={{
                              flex: 1,
                              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 8px', borderRadius: '12px', 
                              border: `1px solid ${isSelected ? brandColor : 'rgba(0, 0, 0, 0.08)'}`,
                              background: isSelected ? `${brandColor}10` : 'rgba(255, 255, 255, 0.65)',
                              color: isSelected ? '#1c1c1e' : '#48484a',
                              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                              boxShadow: isSelected ? `0 4px 12px ${brandColor}15` : 'none',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>{APP_INSTRUMENT_ICONS[inst]}</span> {inst === "Piano / Keys" ? "Piano" : inst}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Musikalischer Werdegang (Bio)</label>
                    <textarea placeholder="Erzähle etwas über deinen Werdegang..." value={editingProfile.bio || ''} onChange={e => setEditingProfile({...editingProfile, bio: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.5, transition: 'all 0.2s', outline: 'none', resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expertise & Stile</label>
                      <input placeholder="z.B. Jazz, Rock, Metal..." value={editingProfile.expertise || ''} onChange={e => setEditingProfile({...editingProfile, expertise: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bands & Projekte</label>
                      <input placeholder="Aktuelle Bands..." value={editingProfile.bands || ''} onChange={e => setEditingProfile({...editingProfile, bands: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none' }} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: `0 8px 24px ${brandColor}25`, transition: 'all 0.2s' }}>Speichern</button>
                <button type="button" onClick={() => setShowEditProfile(false)} style={{ flex: 1, background: 'rgba(0, 0, 0, 0.05)', color: '#48484a', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>Abbrechen</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {selectedStudentForPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '360px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-24px', position: 'relative', zIndex: 1 }}>
              <button onClick={() => setSelectedStudentForPreview(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '32px', margin: '0 auto 20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '4px solid white' }}>
                <StudioAvatar src={selectedStudentForPreview.photo_url} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>{selectedStudentForPreview.first_name}</h3>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {APP_INSTRUMENT_ICONS[selectedStudentForPreview.instrument as keyof typeof APP_INSTRUMENT_ICONS]} {selectedStudentForPreview.instrument}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Level</div>
                  <div style={{ fontWeight: 900, color: '#1e293b' }}>Pro</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontWeight: 900, color: '#34a853' }}>Ready</div>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedStudentForPreview(null)}
              style={{ width: '100%', padding: '16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, cursor: 'pointer' }}
            >
              COOL!
            </button>
          </div>
        </div>
      )}

      {showBandProfile && selectedBandForProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#09090b', overflowY: "auto", WebkitOverflowScrolling: "touch", WebkitTransform: 'translate3d(0,0,0)', transform: 'translate3d(0,0,0)' }}>
            <BandProfileContent 
              selectedBandForProfile={selectedBandForProfile} 
              user={user} 
              bandProfileView={bandProfileView} 
              setBandProfileView={setBandProfileView} 
              brandColor={brandColor} 
              width={width} 
              APP_INSTRUMENT_COLORS={APP_INSTRUMENT_COLORS} 
              APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS} 
              setShowBandProfile={setShowBandProfile} 
              setEditingBand={setEditingBand} 
              setShowEditBand={setShowEditBand} 
              setShowAvatarPicker={setShowAvatarPicker}
              setAvatarPickerType={setAvatarPickerType}
              isSharedView={isSharedView}
              onRefresh={() => fetchDashboardData(user.id)}
            />
        </div>
      )}

      {showEditBand && editingBand && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <form onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from('bands').update({
              name: editingBand.name,
              bio: editingBand.bio,
              genre: editingBand.genre,
              photo_url: editingBand.photo_url,
              soundcloud_links: editingBand.soundcloud_links || [],
              youtube_links: editingBand.youtube_links || [],
              appointments: editingBand.appointments || [],
              coach_id: editingBand.coach_id
            }).eq('id', editingBand.id);
            if (error) alert(error.message);
            else {
              setShowEditBand(false);
              // Update selectedBandForProfile to reflect changes in modal
              setSelectedBandForProfile({
                ...selectedBandForProfile,
                ...editingBand
              });
              if (user) fetchDashboardData(user.id);
            }
          }} className="animation-slide-up" style={{ background: 'rgba(30, 30, 30, 0.95)', backdropFilter: 'blur(30px) saturate(150%)', WebkitBackdropFilter: 'blur(30px) saturate(150%)', border: '1px solid rgba(255,255,255,0.08)', padding: '40px', borderRadius: '32px', maxWidth: '640px', width: '100%', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 40px 100px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Bandprofil bearbeiten</h2>
              <button type="button" onClick={() => setShowEditBand(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bandname</label>
                <input required value={editingBand.name} onChange={e => setEditingBand({...editingBand, name: e.target.value})} style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }} />
              </div>

              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bandcoach (Lehrer)</label>
                  <select 
                    value={editingBand.coach_id || ''} 
                    onChange={e => setEditingBand({...editingBand, coach_id: e.target.value || null})} 
                    style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }}
                  >
                    <option value="">-- Kein Coach --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musikrichtung / Genre</label>
                <input value={editingBand.genre || ''} onChange={e => setEditingBand({...editingBand, genre: e.target.value})} style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }} placeholder="z.B. Rock, Jazz, Pop..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Über uns</label>
                <textarea rows={4} value={editingBand.bio || ''} onChange={e => setEditingBand({...editingBand, bio: e.target.value})} style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', resize: 'none' }} placeholder="Erzählt eure Story..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Termine & Gigs</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {(editingBand.appointments || []).map((app: any, idx: number) => (
                     <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ flex: 1 }}>
                           <input 
                             placeholder="Titel" 
                             value={app.title} 
                             onChange={e => {
                               const newApps = [...editingBand.appointments];
                               newApps[idx].title = e.target.value;
                               setEditingBand({...editingBand, appointments: newApps});
                             }} 
                             style={{ color: 'white', background: 'transparent', border: 'none', fontWeight: 800, fontSize: '1.1rem', width: '100%', outline: 'none' }} 
                           />
                           <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                              <input 
                                type="date" 
                                value={app.date} 
                                onChange={e => {
                                  const newApps = [...editingBand.appointments];
                                  newApps[idx].date = e.target.value;
                                  setEditingBand({...editingBand, appointments: newApps});
                                }} 
                                style={{ color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }} 
                              />
                              <input 
                                placeholder="Ort" 
                                value={app.location} 
                                onChange={e => {
                                  const newApps = [...editingBand.appointments];
                                  newApps[idx].location = e.target.value;
                                  setEditingBand({...editingBand, appointments: newApps});
                                }} 
                                style={{ color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 600, outline: 'none', flex: 1 }} 
                              />
                           </div>
                        </div>
                        <button type="button" onClick={() => {
                          const newApps = editingBand.appointments.filter((_: any, i: number) => i !== idx);
                          setEditingBand({...editingBand, appointments: newApps});
                        }} style={{ background: 'rgba(239,68,68,0.15)', padding: '12px', borderRadius: '12px', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={20} /></button>
                     </div>
                   ))}
                   <button type="button" onClick={() => {
                     const newApps = [...(editingBand.appointments || []), { title: '', date: new Date().toISOString().split('T')[0], location: '' }];
                     setEditingBand({...editingBand, appointments: newApps});
                   }} style={{ padding: '16px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                   >+ Termin hinzufügen</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musik (MP3 Links)</label>
                {(editingBand.soundcloud_links || []).map((track: any, idx: number) => {
                  const trackData = typeof track === 'string' ? { title: '', url: track } : track;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        placeholder="Titel (z.B. Song Name)" 
                        value={trackData.title}
                        onChange={e => {
                          const newList = [...editingBand.soundcloud_links];
                          newList[idx] = { ...trackData, title: e.target.value };
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }}
                        style={{ color: 'white', flex: 1, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }}
                      />
                      <input 
                        placeholder="MP3 Link (Cloud URL)" 
                        value={trackData.url}
                        onChange={e => {
                          const newList = [...editingBand.soundcloud_links];
                          newList[idx] = { ...trackData, url: e.target.value };
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }}
                        style={{ color: 'white', flex: 2, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }}
                      />
                      <button type="button" onClick={() => {
                        const newList = editingBand.soundcloud_links.filter((_: any, i: number) => i !== idx);
                        setEditingBand({...editingBand, soundcloud_links: newList});
                      }} style={{ background: 'rgba(239,68,68,0.15)', padding: '14px', borderRadius: '14px', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={20} /></button>
                    </div>
                  );
                })}
                <button type="button" onClick={() => {
                  const newList = [...(editingBand.soundcloud_links || []), { title: '', url: '' }];
                  setEditingBand({...editingBand, soundcloud_links: newList});
                }} style={{ padding: '14px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.9rem' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >+ Song hinzufügen</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Videos (YouTube Links)</label>
                {(editingBand.youtube_links || []).map((video: any, idx: number) => {
                  const videoData = typeof video === 'string' ? { title: '', url: video } : video;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        placeholder="Videotitel" 
                        value={videoData.title}
                        onChange={e => {
                          const newList = [...editingBand.youtube_links];
                          newList[idx] = { ...videoData, title: e.target.value };
                          setEditingBand({...editingBand, youtube_links: newList});
                        }}
                        style={{ color: 'white', flex: 1, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }}
                      />
                      <input 
                        placeholder="YouTube URL" 
                        value={videoData.url}
                        onChange={e => {
                          const newList = [...editingBand.youtube_links];
                          newList[idx] = { ...videoData, url: e.target.value };
                          setEditingBand({...editingBand, youtube_links: newList});
                        }}
                        style={{ color: 'white', flex: 2, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none' }}
                      />
                      <button type="button" onClick={() => {
                        const newList = editingBand.youtube_links.filter((_: any, i: number) => i !== idx);
                        setEditingBand({...editingBand, youtube_links: newList});
                      }} style={{ background: 'rgba(239,68,68,0.15)', padding: '14px', borderRadius: '14px', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={20} /></button>
                    </div>
                  );
                })}
                <button type="button" onClick={() => {
                  const newList = [...(editingBand.youtube_links || []), { title: '', url: '' }];
                  setEditingBand({...editingBand, youtube_links: newList});
                }} style={{ padding: '14px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.9rem' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >+ Video hinzufügen</button>
              </div>



              <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'black', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', boxShadow: `0 10px 30px ${brandColor}40`, transition: 'transform 0.2s', letterSpacing: '0.02em' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >Profil aktualisieren</button>
                <button type="button" onClick={() => setShowEditBand(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '18px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >Abbrechen</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* Fullscreen Avatar Selection Gallery */}
      {showAvatarPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(30px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
           <div className="animation-scale-up" style={{ width: '100%', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'white', margin: 0 }}>
                      {avatarPickerType === 'band' ? 'Wähle euer Band-Artwork' : 
                       (user?.role === 'teacher' || user?.role === 'admin' ? 'Wähle deinen Lehrer-Avatar' : 'Wähle deinen Avatar')}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginTop: '8px', fontWeight: 700 }}>
                      {avatarPickerType === 'band' ? 'Klicke auf ein Bild, um es als euer neues Bandprofilbild zu setzen.' : 'Personalisiere dein Profil mit einem neuen Bild.'}
                    </p>
                 </div>
                 <button onClick={() => setShowAvatarPicker(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={32} />
                 </button>
              </div>

              {avatarPickerType === 'band' && (
                 <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '62px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                       {(['Alle', '3', '4', '5'] as const).map(size => {
                          const isSelected = bandAvatarSizeFilter === size;
                          return (
                             <button
                                key={size}
                                type="button"
                                onClick={() => setBandAvatarSizeFilter(size)}
                                style={{
                                   padding: '10px 20px',
                                   borderRadius: '14px',
                                   border: 'none',
                                   background: isSelected ? brandColor : 'transparent',
                                   color: isSelected ? 'white' : 'rgba(255,255,255,0.7)',
                                   fontWeight: 800,
                                   fontSize: '0.95rem',
                                   cursor: 'pointer',
                                   transition: 'all 0.2s ease',
                                   boxShadow: isSelected ? `0 0 15px ${brandColor}88` : 'none',
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '6px'
                                }}
                             >
                                {size === 'Alle' ? '🌐 Alle Artworks' : `👥 ${size} Musiker`}
                             </button>
                          );
                       })}
                    </div>
                 </div>
              )}

              {avatarPickerType !== 'band' && !(user?.role === 'teacher' || user?.role === 'admin') && (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '62px' }}>
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                        {(['Alle', 'E-Gitarre', 'E-Piano', 'E-Drum', 'E-Bass', 'Gesang'] as const).map(inst => {
                           const isSelected = avatarInstrumentFilter === inst;
                           return (
                              <button
                                 key={inst}
                                 type="button"
                                 onClick={() => setAvatarInstrumentFilter(inst)}
                                 style={{
                                    padding: '10px 20px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: isSelected ? brandColor : 'transparent',
                                    color: isSelected ? 'white' : 'rgba(255,255,255,0.7)',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isSelected ? `0 0 15px ${brandColor}88` : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                 }}
                              >
                                 {inst === 'Alle' && '🌐'}
                                 {inst === 'E-Gitarre' && '🎸'}
                                 {inst === 'E-Piano' && '🎹'}
                                 {inst === 'E-Drum' && '🥁'}
                                 {inst === 'E-Bass' && '🎸'}
                                 {inst === 'Gesang' && '🎤'}
                                 {inst}
                              </button>
                           );
                        })}
                     </div>
                  </div>
               )}

              <div style={{ 
                 display: 'flex', 
                 flexWrap: 'wrap',
                 gap: '32px', 
                 justifyContent: 'center',
                 overflowY: 'auto',
                 padding: '24px',
                 margin: '0 -24px',
                 flex: 1
              }}>
                {(() => {
                  if (avatarPickerType === 'band') {
                    let list = BAND_AVATARS;
                    if (bandAvatarSizeFilter !== 'Alle') {
                      const numSize = parseInt(bandAvatarSizeFilter, 10);
                      list = list.filter((av: any) => av.size === numSize);
                    }
                    return list.filter((av: any) => !failedAvatarUrls.includes(av.url));
                  }
                  
                  const role = (user?.role || '').toLowerCase();
                  let list: any[] = STUDENT_AVATARS;
                  if (activePlatform === 'campus') {
                    if (role !== 'student') list = CAMPUS_AVATARS;
                  } else if (role === 'teacher' || role === 'admin' || role === 'secretary' || avatarPickerType === 'teacher') {
                    list = TEACHER_AVATARS;
                  }
                  if (avatarInstrumentFilter !== 'Alle' && !(role === 'teacher' || role === 'admin' || role === 'secretary' || avatarPickerType === 'teacher')) {
                    list = list.filter((av: any) => av.category === avatarInstrumentFilter);
                  }

                  // Filter out broken images dynamically
                  list = list.filter((av: any) => !failedAvatarUrls.includes(av.url));
                  
                  // Sort alternatingly by girl, boy, girl, boy...
                  const getAvatarGender = (av: any) => {
                    const id = (av.id || '').toLowerCase();
                    const url = (av.url || '').toLowerCase();
                    if (id.includes('girl') || id.includes('female') || url.includes('girl') || url.includes('female')) return 'girl';
                    if (id.includes('boy') || id.includes('male') || url.includes('boy') || url.includes('male')) return 'boy';
                    if (id.includes('guitar_alt') || id.includes('eguitar_alt') || id.includes('drums_alt') || id.includes('bass_alt') || id.includes('vocals_alt')) return 'boy';
                    if (id.includes('piano_alt') || id.includes('tech_alt') || id.includes('producer')) return 'girl';
                    return 'neutral';
                  };

                  // Separate Sonstige/general avatars to place them at the very end
                  const sonstige = list.filter((av: any) => av.category === 'Sonstige' || av.id.includes('general'));
                  const others = list.filter((av: any) => av.category !== 'Sonstige' && !av.id.includes('general'));

                  const girls = others.filter(av => getAvatarGender(av) === 'girl');
                  const boys = others.filter(av => getAvatarGender(av) === 'boy');
                  const neutral = others.filter(av => getAvatarGender(av) === 'neutral');
                  
                  const alternated: any[] = [];
                  const maxLen = Math.max(girls.length, boys.length);
                  for (let i = 0; i < maxLen; i++) {
                    if (i < girls.length) alternated.push(girls[i]);
                    if (i < boys.length) alternated.push(boys[i]);
                  }
                  alternated.push(...neutral);
                  alternated.push(...sonstige);
                  list = alternated;
                  
                  return list;
                })().map(av => {
                   const isSelected = avatarPickerType === 'band' 
                     ? selectedBandForProfile?.photo_url === av.url 
                     : user?.photo_url === av.url;
                     
                   return (
                     <div 
                       key={av.id} 
                       onClick={async () => {
                          if (avatarPickerType === 'band') {
                            const { error } = await supabase.from('bands').update({ photo_url: av.url }).eq('id', selectedBandForProfile.id);
                            if (error) {
                              alert("Fehler beim Auswählen des Band-Profilbilds: " + error.message);
                            } else {
                              setSelectedBandForProfile({...selectedBandForProfile, photo_url: av.url});
                              if (editingBand && editingBand.id === selectedBandForProfile.id) {
                                setEditingBand({...editingBand, photo_url: av.url});
                              }
                              setShowAvatarPicker(false);
                              fetchDashboardData(user.id);
                            }
                          } else {
                            const { error } = await supabase.from('users').update({ photo_url: av.url, avatar_url: av.url }).eq('id', user.id);
                            if (!error) {
                              await supabase.from('avatars').update({ asset_path: av.url }).eq('user_id', user.id);
                              setUser({...user, photo_url: av.url, avatar_url: av.url});
                              setShowAvatarPicker(false);
                              fetchDashboardData(user.id);
                            }
                          }
                       }}
                       style={{ 
                         width: '220px',
                         height: '220px',
                         borderRadius: '32px', 
                         overflow: 'hidden', 
                         border: isSelected ? `6px solid ${brandColor}` : '4px solid rgba(255,255,255,0.1)', 
                         cursor: 'pointer', 
                         transition: 'all 0.3s',
                         boxShadow: isSelected ? `0 0 40px ${brandColor}66` : '0 10px 30px rgba(0,0,0,0.4)',
                         position: 'relative',
                         flexShrink: 0
                       }}
                       className="hover-scale"
                     >
                       <img 
                        src={av.url} 
                        loading="lazy"
                        decoding="async"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          display: 'block' 
                        }} 
                        alt=""
                       />
                     </div>
                   );
                 })}
               </div>
           </div>
        </div>
      )}
      {/* Artist Gateway Modal */}
      <Suspense fallback={null}>
        <ArtistGateway 
          show={!!selectedBandForGateway || !!pendingFounding} 
          onClose={() => {
  gatewayJustClosed.current = true;
            setSelectedBandForGateway(null);
            setPendingFounding(null);
            clearConfetti();
            if (user) {
              fetchDashboardData(user.id, false);
            }
            setTimeout(() => {
              gatewayJustClosed.current = false;
            }, 3000);
          }}
          user={user}
          pendingFounding={pendingFounding}
          selectedBandForGateway={selectedBandForGateway}
          APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS}
        />
      </Suspense>
      {showSchoolOnboardingModal && (
        <SchoolSelfOnboardingModal
          onClose={() => setShowSchoolOnboardingModal(false)}
          onSuccess={(schoolData, userData) => {
            setShowSchoolOnboardingModal(false);
            if (typeof window !== 'undefined' && window.history) {
              safeReplaceState({}, document.title, window.location.pathname);
            }
            window.location.reload();
          }}
        />
      )}

      {showAdminSecuritySuiteModal && (school?.id || user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id)) && (
        <Suspense fallback={null}>
          <AdminSecuritySuiteModal
            schoolId={school?.id || user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id)}
            onClose={() => setShowAdminSecuritySuiteModal(false)}
          />
        </Suspense>
      )}



    </div>
  </div>
</DeviceSimulator>
);
}

export default App;
