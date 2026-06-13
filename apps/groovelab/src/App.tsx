import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Music, AlertCircle, Play, Pause, ArrowDown, Library, Shield, ShieldCheck, FileText, LogOut, Award, Users, User, Monitor, X, Camera, Clock, QrCode, Plus, ExternalLink, BarChart, Star, Box, Settings, Lock, Pencil, Trash2, Zap, RotateCcw, Check, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Mic, Calendar, PlayCircle, Youtube, Megaphone, Mail, School, GraduationCap, Trophy, Compass, MapPin } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { supabase, supabaseUrl, supabaseAnonKey } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { QRCodeModal } from './components/QRCodeModal';
import { QRLandingPage } from './components/QRLandingPage';
import { DeviceSetupScreen } from './components/DeviceSetupScreen';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { subscribeUserToPush } from './utils/webPush';

import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MasterAdminDashboard } from './components/MasterAdminDashboard';
import { SecretaryDashboard } from './components/SecretaryDashboard';
import { StudentAvatarDashboard } from './components/StudentAvatarDashboard';
import { EnsembleDashboard } from './components/EnsembleDashboard';
import BandProfileContent from './components/BandProfileContent';
import { ArtistGateway } from './components/ArtistGateway';
import StudentRadarChart from './components/StudentRadarChart';
import ConfettiModal from './components/ConfettiModal';
import CampusDirectMessages from './components/CampusDirectMessages';
import { normalizeInstrument, renderInstrumentIcon } from './utils/instruments';
import { getDistanceFromLatLonInM } from './utils/geo';
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
  "Vocals": "#22c55e", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};
const brandColor = "#f59e0b"; // Orange (matched with legend)

// --- ANTI-FLICKER AVATAR SYSTEM ---
const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

// --- ANTI-FLICKER AVATAR SYSTEM ---
const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
  const isTeacher = (role || '').toLowerCase() === 'teacher' || (role || '').toLowerCase() === 'admin';
  if (isTeacher) return '/avatar_teacher_male.jpg';
  
  if (!instrument) return '/avatars/student_eguitar_1.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/student_boy_black_guitar.png';
  if (inst.includes('bass')) return '/avatars/student_boy_black_bass.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/student_boy_black_drums.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/student_boy_black_piano.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/student_boy_red_vocals.png';
  return '/avatars/student_eguitar_1.png';
};

const StudioAvatar = React.memo(({ src, style, className, user, userId, onClick, activePlatform }: { src: string | null | undefined, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void, activePlatform?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [resolvedInstrument, setResolvedInstrument] = useState<string | null>(user?.instrument || null);
  
  const activePlat = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab');
  
  useEffect(() => {
    if (user && user.role === 'student' && (!user.instrument || user.instrument === 'Allgemein') && user.teacher_id) {
      supabase
        .from('users')
        .select('instrument')
        .eq('id', user.teacher_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.instrument) {
            setResolvedInstrument(data.instrument);
          }
        });
    } else {
      setResolvedInstrument(user?.instrument || null);
    }
  }, [user]);

  let displaySrc = src;
  const targetUser = user;
  
  if (activePlat === 'campus') {
    if (targetUser) {
      const role = (targetUser.role || '').toLowerCase();
      if (role === 'student') {
        if (targetUser.photo_url && targetUser.photo_url.includes('_avatar')) {
          displaySrc = targetUser.photo_url;
        } else {
          displaySrc = getInstrumentAvatarUrl(resolvedInstrument || targetUser.instrument);
        }
      } else if (role === 'teacher' || role === 'admin') {
        displaySrc = getInstrumentAvatarUrl(targetUser.instrument);
      }
    } else {
      if (src && src.includes('_avatar')) {
        displaySrc = src;
      } else {
        displaySrc = '/avatars/gitarre_avatar_new.png';
      }
    }
  } else {
    // GrooveLab platform: strictly block instrument avatars and fall back to musician avatars
    const isInstrumentAvatar = src && (
      src.includes('avatar.png') || 
      src.includes('avatar_new') ||
      src.includes('_avatar') ||
      src.includes('guitar_avatar') || 
      src.includes('gitarre_avatar') || 
      src.includes('ebass_avatar') || 
      src.includes('egitarre_avatar') || 
      src.includes('kontrabass_avatar') || 
      src.includes('bass_avatar') || 
      src.includes('drums_avatar') || 
      src.includes('schlagzeug_avatar') || 
      src.includes('piano_avatar') || 
      src.includes('klavier_avatar') || 
      src.includes('vocals_avatar') || 
      src.includes('gesang_avatar') || 
      src.includes('trumpet_avatar') || 
      src.includes('trompete_avatar') || 
      src.includes('trombone_avatar') || 
      src.includes('posaune_avatar') || 
      src.includes('horn_avatar') || 
      src.includes('cello_avatar') || 
      src.includes('violin_avatar') || 
      src.includes('violine_avatar') || 
      src.includes('clarinet_avatar') || 
      src.includes('klarinette_avatar') || 
      src.includes('flute_avatar') || 
      src.includes('querfloete_avatar') || 
      src.includes('saxophone_avatar') || 
      src.includes('saxophon_avatar') || 
      src.includes('blockfloete_avatar') || 
      src.includes('bariton_avatar') || 
      src.includes('oboe_avatar') ||
      src.includes('realistic') ||
      src.includes('acoustic') ||
      src.includes('focused') ||
      src.includes('eguitar_17')
    );
    if (!src || isInstrumentAvatar || src === '/avatar_ghost.jpg') {
      displaySrc = '/avatar_ghost.jpg';
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    const target = user || userId;
    if (target && (window as any).openUserProfile) {
      (window as any).openUserProfile(target);
    }
  };

  const hasAction = !!(onClick || user || userId);

  return (
    <div 
      onClick={hasAction ? handleClick : undefined}
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#f1f5f9', 
        position: 'relative', 
        overflow: 'hidden', 
        cursor: hasAction ? 'pointer' : 'default',
        ...style 
      }} 
      className={`studio-avatar-wrapper ${hasAction ? 'hover-scale-mini' : ''} ${className || ''}`}
    >
      <img 
        src={displaySrc || '/avatar_ghost.jpg'} 
        onLoad={() => setIsLoaded(true)}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }} 
        alt=""
        onError={(e) => { (e.target as HTMLImageElement).src = '/avatar_ghost.jpg'; }}
      />
    </div>
  );
}, (prev, next) => prev.src === next.src && prev.user?.id === next.user?.id && prev.userId === next.userId && prev.user?.instrument === next.user?.instrument && prev.activePlatform === next.activePlatform);

const renderBandAvatar = (name: string, photoUrl?: string | null, size: string = '64px', borderRadius: string = '18px') => {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
      </div>
    );
  }
  
  // Hash the name to pick a beautiful premium gradient
  const gradients = [
    'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo to Purple
    'linear-gradient(135deg, #ec4899, #f43f5e)', // Pink to Rose
    'linear-gradient(135deg, #3b82f6, #06b6d4)', // Blue to Cyan
    'linear-gradient(135deg, #10b981, #3b82f6)', // Emerald to Blue
    'linear-gradient(135deg, #f59e0b, #e11d48)'  // Amber to Rose
  ];
  
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradient = gradients[Math.abs(hash) % gradients.length];
  const firstLetter = (name || 'B').substring(0, 1).toUpperCase();
  
  return (
    <div style={{ 
      width: size, height: size, borderRadius, 
      background: gradient, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      color: 'white', fontWeight: 950, fontSize: `calc(${size} * 0.4)`,
      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      {firstLetter}
    </div>
  );
};



const showMissionsFeature = false;
const showEnsemblesFeature = false;

// --- Band Name Generator Words ---
const BAND_ADJECTIVES = [
  // English – Energy & Sound
  "Electric", "Sonic", "Neon", "Atomic", "Static", "Magnetic", "Pulse", "Kinetic", "Turbo", "Hyper",
  // English – Nature & Cosmos
  "Cosmic", "Lunar", "Solar", "Stellar", "Midnight", "Aurora", "Thunder", "Storm", "Crystal", "Frozen",
  // English – Mood & Style
  "Golden", "Velvet", "Silver", "Wild", "Mystic", "Royal", "Infinite", "Eternal", "Fearless", "Savage",
  // English – Music-themed
  "Groovy", "Funky", "Echo", "Reverb", "Loud", "Deep", "Raw", "Broken", "Blazing", "Drifting",
  // German-inspired
  "Laut", "Stark", "Frei", "Wilde", "Coole", "Echte", "Neue", "Große", "Junge", "Heiße"
];
const BAND_NOUNS = [
  // Classic band words
  "Rhythm", "Sound", "Vibe", "Beat", "Pulse", "Wave", "Groove", "Theory", "Symphony", "Chord",
  // Collective nouns
  "Collective", "Crew", "Squad", "Gang", "Tribe", "Pack", "Union", "Alliance", "Force", "League",
  // Places & spaces
  "Studio", "Lab", "Stage", "Arena", "Chamber", "Vault", "Signal", "Circuit", "Grid", "Portal",
  // Abstract
  "Flow", "Soul", "Vision", "Quest", "Echo", "Dream", "Mission", "Code", "Spark", "Surge",
  // German-inspired
  "Klang", "Band", "Weg", "Kraft", "Geist", "Welle", "Feuer", "Licht", "Raum", "Traum"
];

const generateRandomBandName = () => {
  const adj = BAND_ADJECTIVES[Math.floor(Math.random() * BAND_ADJECTIVES.length)];
  const noun = BAND_NOUNS[Math.floor(Math.random() * BAND_NOUNS.length)];
  return `${adj} ${noun}`;
};

const getRoleColor = (role: string, stationName?: string) => {
  const r = role?.toLowerCase();
  if (r === 'teacher' || r === 'admin') {
    if (!stationName) return '#64748b'; // Gray for teachers in Home/no station mode
    return '#22c55e'; // Green when checked in at a station
  }
  if (!stationName) return '#64748b'; // Default gray
  
  const match = stationName.match(/\d+/);
  if (!match) return '#64748b';
  
  const num = parseInt(match[0]);
  if (num === 1 || num === 2) return '#ef4444'; // Red
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
    // 1. Priority: If there's a pending skill and current one isn't pending, switch to it
    const pending = displaySkills.find((s: any) => s?.is_pending_approval);
    if (pending && pending.id !== activeSlotId) {
      setActiveSlotId(pending.id);
      return;
    }

    // 2. If current activeSlotId is not in the new displaySkills (common on difficulty switch)
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '16px', position: 'relative' }}>
      <div 
        onClick={onToggle}

        className={`glass-panel animation-slide-up ${isBandReady ? 'band-ready' : ''} ${activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? 'challenge-glow' : ''}`} 
        style={{ 
          padding: isExpanded ? '32px' : '20px 24px', 
          position: 'relative', 
          overflow: 'visible', 
          borderRadius: '28px', 
          display: 'flex', 
          flexDirection: 'column',
          flex: 1,
          background: 'white', 
          borderLeft: `8px solid ${isBandReady ? '#f59e0b' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || '#cbd5e1')}`,
          boxShadow: activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? `0 0 30px ${brandColor}22` : '0 10px 30px rgba(0,0,0,0.02)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          cursor: 'pointer'
        }}
      >
        {songGroup.isBandSong && (
          <div style={{ 
            position: 'absolute', 
            top: '-10px', 
            right: '60px', 
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '320px', flexShrink: 0 }}>
            <div 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (songGroup.tomplay_url || songGroup.media_link) window.open(songGroup.tomplay_url || songGroup.media_link, '_blank'); 
              }}
              style={{ 
                width: '52px', height: '52px', borderRadius: '16px', 
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
              <Music size={24} />
            </div>
            
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                {songGroup.artist}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                {songGroup.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

              {/* Premium Noten-Link - Placed behind instruments */}
              {(songGroup.tomplay_url || songGroup.media_link) && (
                <div 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    window.open(songGroup.tomplay_url || songGroup.media_link, '_blank'); 
                  }}
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '10px', 
                    background: `${brandColor}15`, 
                    color: brandColor, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: `1px solid ${brandColor}30`,
                    marginLeft: '4px'
                  }}
                  title="Noten & Material öffnen"
                  className="hover-scale"
                >
                  <ExternalLink size={16} />
                </div>
              )}
            </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexShrink: 0, paddingLeft: '20px', borderLeft: width > 1000 ? '1px solid #f1f5f9' : 'none', marginLeft: 'auto' }}>
            <div style={{ textAlign: 'right', minWidth: '100px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Gesamt</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 950, color: localProgress >= 100 ? '#10b981' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor), lineHeight: 1 }}>
                {localProgress}%
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(); }} 
              style={{ 
                width: '44px', height: '44px', borderRadius: '14px', 
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
              <ChevronDown size={24} />
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
          <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ flex: 2, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>Schwierigkeitsgrad:</div>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '5px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDifficulty('starter'); }} 
                      style={{ 
                        background: activeDifficulty === 'starter' ? 'white' : 'transparent', 
                        color: activeDifficulty === 'starter' ? '#10b981' : '#64748b', 
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
                  {(songGroup.pdf_folder_url || songGroup.pdf_guitar_url || songGroup.pdf_bass_url || songGroup.pdf_drums_url || songGroup.pdf_keys_url || songGroup.pdf_vocals_url) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPdfViewer?.(songGroup, songGroup.pdf_folder_url);
                      }}
                      className="cloud-link-btn noten-btn"
                    >
                      <Library size={15} className="icon-main" style={{ strokeWidth: 2.5 }} />
                      Noten
                      <Lock size={11} style={{ opacity: 0.6, marginLeft: '2px' }} />
                    </button>
                  )}

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
                  <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', color: '#16a34a', padding: '24px', borderRadius: '24px', flex: 1, display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #bbf7d0' }}>
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

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '200px', paddingTop: '40px' }}>
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

// Auto-setup kiosk mode from URL parameters
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const kioskTokenParam = params.get('kiosk_token');
if (kioskTokenParam) {
  localStorage.setItem('groovelab_kiosk_token', kioskTokenParam);
  localStorage.removeItem('groovelab_station_id');
  localStorage.removeItem('groovelab_kiosk_room_id');
  sessionStorage.removeItem('groovelab_user_id');
  localStorage.removeItem('groovelab_user_id');
  localStorage.removeItem('groovelab_location_mode');
  // Strip parameter and redirect to clean up URL
  params.delete('kiosk_token');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  window.location.replace(newUrl);
}

const kioskStationId = params.get('kiosk_station_id');
if (kioskStationId) {
  localStorage.setItem('groovelab_station_id', kioskStationId);
  sessionStorage.removeItem('groovelab_user_id');
  localStorage.removeItem('groovelab_user_id');
  localStorage.removeItem('groovelab_location_mode');
  // Strip parameter and redirect to clean up URL
  params.delete('kiosk_station_id');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  window.location.replace(newUrl);
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
    let titleText = isCampus ? 'Campus' : 'GrooveLab';
    let btnBackground = 'linear-gradient(135deg, #10b981, #059669)';
    let btnShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
    
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
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(16, 185, 129, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
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

function App() {
  // 0. QR LANDING PAGE — Weg 2: Nativer Kamera-Scan (Sofort abfangen vor allen States!)
  const qrPathMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/qr\/([^/?#]+)/) : null;
  if (qrPathMatch) {
    return <QRLandingPage token={qrPathMatch[1]} />;
  }

  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [showDeletionPrompt, setShowDeletionPrompt] = useState(false);
  const [deletionPromptUserId, setDeletionPromptUserId] = useState<string | null>(null);
  const [deletionPromptIsHome, setDeletionPromptIsHome] = useState<boolean | undefined>(undefined);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker immediately to ensure PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => console.log('Service Worker registered successfully on load:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed on load:', err));
    }

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

    // Auto-subscribe or sync web push notifications in the background
    if ('Notification' in window && (Notification.permission === 'granted' || Notification.permission === 'default')) {
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
  const [stationIdFromStorage, setStationIdFromStorage] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('groovelab_station_id') : null);

  // Effect to resolve the kiosk token on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
  const urlParamsForKiosk = new URLSearchParams(window.location.search);
  const kioskRoomIdParam = urlParamsForKiosk.get('kiosk_room_id');
  const kioskSetupParam = urlParamsForKiosk.get('kiosk_setup');

  const [kioskBootstrapping, setKioskBootstrapping] = useState<boolean>(() => {
    // Only auto-bootstrap if kiosk_room_id is present AND kiosk_setup is NOT set
    return !!kioskRoomIdParam && kioskSetupParam !== '1';
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const kioskRoomId = searchParams.get('kiosk_room_id');
    const isSetupMode = searchParams.get('kiosk_setup') === '1';
    // Skip auto-bootstrap when setup mode is requested
    if (!kioskRoomId || isSetupMode) return;

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

  const [loading, setLoading] = useState(false);
  const [isSchoolPaused, setIsSchoolPaused] = useState(false);
  const [user, setUserRaw] = useState<any>(null);
  const setUser = React.useCallback((val: any) => {
    React.startTransition(() => {
      setUserRaw(val);
    });
  }, []);
  const [session, setSession] = useState<any>(null);
  const [totalPresenceMins, setTotalPresenceMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !user) return;
    
    const updateData: any = {
      first_name: editingProfile.first_name,
      last_name: editingProfile.last_name,
      photo_url: editingProfile.photo_url
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
  const [activePlatform, setActivePlatformRaw] = useState<'campus' | 'groovelab' | 'ensembles'>(() => {
    const isCampusDomain = typeof window !== 'undefined' && window.location.hostname.includes('campus');
    const defaultPlat = isCampusDomain ? 'campus' : 'groovelab';
    const saved = localStorage.getItem('groovelab_active_platform');
    if (!showEnsemblesFeature && saved === 'ensembles') {
      return defaultPlat;
    }
    return (saved as 'campus' | 'groovelab' | 'ensembles') || defaultPlat;
  });
  const setActivePlatform = React.useCallback((val: any) => {
    React.startTransition(() => {
      setActivePlatformRaw(val);
      localStorage.setItem('groovelab_active_platform', val);
    });
  }, []);

  const [activeStudentTab, setActiveStudentTabRaw] = useState<string>(() => {
    const platform = (localStorage.getItem('groovelab_active_platform') as any) || 'groovelab';
    if (platform === 'campus') {
      return localStorage.getItem('campus_active_tab') || 'profile';
    }
    if (platform === 'ensembles') {
      return localStorage.getItem('ensembles_active_tab') || 'overview';
    }
    return localStorage.getItem('groovelab_active_tab') || 'live';
  });
  const setActiveStudentTab = React.useCallback((val: any) => {
    React.startTransition(() => {
      setActiveStudentTabRaw(val);
    });
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
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
  const [locationMode, setLocationMode] = useState<'lab' | 'home'>(() => (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home' : null) || 'home');
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
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [lastAutoTriggeredFormId, setLastAutoTriggeredFormId] = useState<string | null>(sessionStorage.getItem('groovelab_last_form_id'));
  
  const updateAutoTriggerId = (id: string | null) => {
    setLastAutoTriggeredFormId(id);
    if (id) sessionStorage.setItem('groovelab_last_form_id', id);
    else sessionStorage.removeItem('groovelab_last_form_id');
  };
  
  useEffect(() => {
    if (showFoundingModal && !foundingName) {
      setFoundingName(generateRandomBandName());
    } else if (!showFoundingModal) {
      setFoundingName('');
    }
  }, [showFoundingModal]);

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
    // E-Gitarre
    { id: 'student_boy_guitar_1', url: '/avatars/student_boy_black_guitar.png' },
    { id: 'student_girl_guitar_1', url: '/avatars/student_girl_blonde_guitar.png' },
    { id: 'student_boy_blonde_guitar', url: '/avatars/student_boy_blonde_guitar.png' },
    { id: 'student_girl_black_guitar', url: '/avatars/student_girl_black_guitar.png' },
    { id: 'student_eguitar_alt', url: '/avatars/student_eguitar_1.png' },
    { id: 'student_teen_boy_guitar_1', url: '/avatars/student_teen_boy_guitar_1.png' },
    { id: 'student_teen_boy_guitar_2', url: '/avatars/student_teen_boy_guitar_2.png' },
    { id: 'bandstyle_boy_eguitar', url: '/avatars/bandstyle_boy_eguitar.png' },
    { id: 'bandstyle_girl_eguitar', url: '/avatars/bandstyle_girl_eguitar.png' },
    { id: 'teen_boy_eguitar_realistic', url: '/avatars/teen_boy_eguitar_realistic.png' },
    { id: 'teen_girl_eguitar_focused', url: '/avatars/teen_girl_eguitar_focused.png' },
    { id: 'teen_boy_eguitar_17', url: '/avatars/teen_boy_eguitar_17.png' },
    { id: 'teen_boy_acoustic_guitar', url: '/avatars/teen_boy_acoustic_guitar.png' },
    { id: 'teen_girl_acoustic_guitar', url: '/avatars/teen_girl_acoustic_guitar.png' },
    { id: 'avatar_boy_guitar', url: '/avatar_boy_guitar.jpg' },
    { id: 'avatar_girl_guitar', url: '/avatar_girl_guitar.jpg' },
    { id: 'avatar_gitarre', url: '/avatars/gitarre_avatar_new.png' },
    { id: 'avatar_egitarre', url: '/avatars/egitarre_avatar.png' },

    // E-Piano / Keyboard
    { id: 'student_boy_piano_1', url: '/avatars/student_boy_black_piano.png' },
    { id: 'student_girl_piano_1', url: '/avatars/student_girl_black_piano.png' },
    { id: 'student_piano_alt', url: '/avatars/student_piano_1.png' },
    { id: 'student_boy_piano_2', url: '/avatars/student_boy_piano_2.png' },
    { id: 'student_girl_piano_2', url: '/avatars/student_girl_piano_2.png' },
    { id: 'student_girl_lightbrown_piano', url: '/avatars/student_girl_lightbrown_piano.png' },
    { id: 'student_boy_lightbrown_piano', url: '/avatars/student_boy_lightbrown_piano.png' },
    { id: 'student_boy_keyboard_1', url: '/avatars/student_boy_keyboard_1.png' },
    { id: 'student_boy_producer_1', url: '/avatars/student_boy_producer_1.png' },
    { id: 'student_tech_1', url: '/avatars/student_tech_1.png' },
    { id: 'bandstyle_boy_epiano', url: '/avatars/bandstyle_boy_epiano.png' },
    { id: 'bandstyle_girl_epiano', url: '/avatars/bandstyle_girl_epiano.png' },
    { id: 'avatar_boy_piano', url: '/avatar_boy_piano.jpg' },
    { id: 'avatar_girl_piano', url: '/avatar_girl_piano.jpg' },
    { id: 'avatar_piano', url: '/avatars/klavier_avatar_new.png' },

    // E-Drums
    { id: 'student_boy_drums_1', url: '/avatars/student_boy_black_drums.png' },
    { id: 'student_girl_drums_1', url: '/avatars/student_girl_blonde_drums.png' },
    { id: 'student_boy_blonde_drums', url: '/avatars/student_boy_blonde_drums.png' },
    { id: 'student_girl_black_drums', url: '/avatars/student_girl_black_drums.png' },
    { id: 'student_drums_alt', url: '/avatars/student_drums_1.png' },
    { id: 'student_teen_boy_drums_1', url: '/avatars/student_teen_boy_drums_1.png' },
    { id: 'student_boy_drums_2', url: '/avatars/student_boy_drums_2.png' },
    { id: 'student_girl_drums_2', url: '/avatars/student_girl_drums_2.png' },
    { id: 'student_boy_drums_3', url: '/avatars/student_boy_drums_3.png' },
    { id: 'student_girl_drums_3', url: '/avatars/student_girl_drums_3.png' },
    { id: 'bandstyle_boy_edrums', url: '/avatars/bandstyle_boy_edrums.png' },
    { id: 'bandstyle_girl_edrums', url: '/avatars/bandstyle_girl_edrums.png' },
    { id: 'teen_boy_edrums_realistic', url: '/avatars/teen_boy_edrums_realistic.png' },
    { id: 'avatar_boy_drums', url: '/avatar_boy_drums.jpg' },
    { id: 'avatar_girl_drums', url: '/avatar_girl_drums.jpg' },
    { id: 'avatar_drums', url: '/avatars/schlagzeug_avatar.png' },

    // E-Bass
    { id: 'student_boy_bass_1', url: '/avatars/student_boy_black_bass.png' },
    { id: 'student_girl_bass_1', url: '/avatars/student_girl_black_bass.png' },
    { id: 'student_bass_alt', url: '/avatars/student_bass_1.png' },
    { id: 'student_teen_boy_bass_1', url: '/avatars/student_teen_boy_bass_1.png' },
    { id: 'student_boy_ebass_1', url: '/avatars/student_boy_ebass_1.png' },
    { id: 'student_girl_ebass_1', url: '/avatars/student_girl_ebass_1.png' },
    { id: 'bandstyle_boy_ebass', url: '/avatars/bandstyle_boy_ebass.png' },
    { id: 'bandstyle_girl_ebass', url: '/avatars/bandstyle_girl_ebass.png' },
    { id: 'teen_boy_ebass_realistic', url: '/avatars/teen_boy_ebass_realistic.png' },
    { id: 'avatar_boy_bass', url: '/avatar_boy_bass.jpg' },
    { id: 'avatar_girl_bass', url: '/avatar_girl_bass.jpg' },
    { id: 'avatar_ebass', url: '/avatars/ebass_avatar.png' },

    // Gesang
    { id: 'student_boy_vocals_1', url: '/avatars/student_boy_red_vocals.png' },
    { id: 'student_girl_vocals_1', url: '/avatars/student_girl_red_vocals.png' },
    { id: 'student_boy_vocals_new', url: '/avatars/student_boy_vocals_1.png' },
    { id: 'student_girl_vocals_new', url: '/avatars/student_girl_vocals_1.png' },
    { id: 'student_vocals_alt', url: '/avatars/student_vocals_1.png' },
    { id: 'avatar_vocals', url: '/avatars/gesang_avatar.png' },

    // Allgemein / Sonstige
    { id: 'avatar_boy_general', url: '/avatar_boy.jpg' },
    { id: 'avatar_girl_general', url: '/avatar_girl.jpg' },
    { id: 'avatar_boy_comic_general', url: '/avatar_boy_1777237224310.png' },
    { id: 'avatar_girl_comic_general', url: '/avatar_girl_1777237237899.png' }
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
  const [avatarPickerType, setAvatarPickerType] = useState<'band' | 'student'>('band');

  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlBandId = urlParams.get('band');
    const isShared = urlParams.get('view') === 'shared';
    const urlCampusPassToken = urlParams.get('campus_pass');
    
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
          const { data, error } = await supabase
            .from('users')
            .select('id, first_name, last_name, role, email, instrument, qr_token, photo_url, school_id, ausweis_id, ausweis_nummer')
            .eq('qr_token', urlCampusPassToken)
            .single();
            
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
    if (activePlatform === 'campus') {
      // localStorage.setItem('campus_active_tab', activeStudentTab);
    } else if (activePlatform === 'ensembles') {
      localStorage.setItem('ensembles_active_tab', activeStudentTab);
    } else {
      localStorage.setItem('groovelab_active_tab', activeStudentTab);
    }
  }, [activeStudentTab, activePlatform]);

  const previousPlatform = React.useRef(activePlatform);
  useEffect(() => {
    localStorage.setItem('groovelab_active_platform', activePlatform);
    if (previousPlatform.current === activePlatform) {
      return;
    }
    previousPlatform.current = activePlatform;
    
    // Always load the first menu tab when actively switching platforms (Karteikarten)
    let firstMenuTab = 'live';
    if (activePlatform === 'campus') {
      firstMenuTab = user?.role?.toLowerCase() === 'student' ? 'briefing' : 'live';
    } else if (activePlatform === 'ensembles') {
      firstMenuTab = 'overview';
    }
    setActiveStudentTab(firstMenuTab);
    const storageKey = activePlatform === 'campus' ? 'campus_active_tab' : (activePlatform === 'ensembles' ? 'ensembles_active_tab' : 'groovelab_active_tab');
    localStorage.setItem(storageKey, firstMenuTab);
  }, [activePlatform, user?.role]);

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
        
        const allowedTabs = ['briefing', 'mediathek', 'events', 'profile', 'all_appointments', 'messages', 'settings'];
        if (flamesActive) allowedTabs.push('practice_board');
        if (showLeaderboard) allowedTabs.push('campus_cup');
        if (showDetailedStats) allowedTabs.push('flashback');

        if (!allowedTabs.includes(activeStudentTab)) {
          console.log('[Safety Hook] Enforcing student Campus Briefing Board redirect from invalid tab:', activeStudentTab);
          setActiveStudentTab('briefing');
          localStorage.setItem('campus_active_tab', 'briefing');
        }
      }
  }, [user, activePlatform, activeStudentTab]);
  const { width, height } = useWindowSize();

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
        { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${user.id}` },
        () => {
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

  useEffect(() => {
    if (loggedInUserId) {
      if (typeof (window as any).stopAllCameras === 'function') {
        (window as any).stopAllCameras();
      }
      fetchDashboardData(loggedInUserId, true);
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
      }, 15000);

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
      
      // Stage 1: Fetch user record, current session, and initial memberships (containing user's bands) in parallel
      const [userRes, sessionRes, allSessionsRes, membershipsRes] = await Promise.all([
        supabase.from('users').select('*, schools(*)').eq('id', userId).maybeSingle(),
        supabase.from('sessions').select('*, stations(name)').eq('user_id', userId).is('check_out_time', null).order('check_in_time', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('sessions').select('check_in_time, check_out_time').eq('user_id', userId),
        supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))))').eq('user_id', userId)
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Stage 1:', err);
        return [ {error: err}, {error: err}, {error: err}, {error: err} ] as any;
      });

      if (userRes.error) console.error('[Dashboard] User Fetch Error:', userRes.error);
      if (membershipsRes.error) console.error('[Dashboard] Memberships Fetch Error:', membershipsRes.error);

      const userData = userRes.data;
      if (!userData) {
        console.warn('[Dashboard] No user data found for ID:', userId);
        setLoading(false);
        return;
      }

      // STRICT DB SESSION VERIFICATION (Closing the backdoor):
      // If a student is in GrooveLab (Lab) mode, they MUST have an active checked-in session in the database.
      // If there is no active session (sessionRes.data is null), they have bypassed the scanner or were checked out.
      // If this is a Kiosk device, we immediately force logout and wipe their tab state.
      // Additionally, if the active session's station_id in the database does not match the kiosk's current station_id,
      // it means the student has checked in at a different iPad station, so this station must log them out.
      // On personal devices, we remain logged in so the check-in frosted glass overlay can be shown.
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
      let allowedPlatform: 'campus' | 'groovelab' = 'campus';
      if (userData.is_campus_active && !userData.is_groovelab_active) {
        allowedPlatform = 'campus';
      } else if (!userData.is_campus_active && userData.is_groovelab_active) {
        allowedPlatform = 'groovelab';
      } else {
        // Both active or both inactive, respect the stored platform, otherwise default to campus
        const storedPlat = localStorage.getItem('groovelab_active_platform') as 'campus' | 'groovelab' | null;
        allowedPlatform = storedPlat || 'campus';
      }

      if (isInitial) {
        setActivePlatform(allowedPlatform);
        localStorage.setItem('groovelab_active_platform', allowedPlatform);

        if (allowedPlatform === 'campus') {
          const defaultTab = isStudent ? 'briefing' : 'live';
          setActiveStudentTab(defaultTab);
          localStorage.setItem('campus_active_tab', defaultTab);
        } else {
          const defaultTab = 'live';
          setActiveStudentTab(defaultTab);
          localStorage.setItem('groovelab_active_tab', defaultTab);
        }
      }

      const schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
      if (!schoolId) {
        console.warn('[Dashboard] No school_id found. Board will be empty.');
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

      // Bypass heavy Stage 2 queries for staff (teacher/admin/secretary) since they use AdminDashboard/SecretaryDashboard
      // which fetch their own data, so these queries are duplicate and completely wasted.
      const isStaff = userData.role?.toLowerCase() === 'teacher' || 
                      userData.role?.toLowerCase() === 'admin' || 
                      userData.role?.toLowerCase() === 'secretary';

      if (isStaff) {
        console.log('[Dashboard] Staff user detected. Bypassing heavy Stage 2 student queries for instant load.');
        setUser(userData);
        setSession(sessionRes.data);
        
        // Align locationMode for teachers
        if (sessionRes.data) {
          setLocationMode('lab');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
        } else {
          setLocationMode('home');
          sessionStorage.setItem('groovelab_location_mode', 'home');
        }
        
        // Fetch active student count in background (non-blocking)
        if (schoolId) {
          fetchActiveStudentCount(schoolId).catch(err => console.error('Error fetching student count:', err));
        }
        
        setLoading(false);
        return;
      }

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
        supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId),
        bandIds.length > 0
          ? supabase.from('bands').select(`
              *,
              songs (*),
              band_members (*, users(*)),
              band_songs (*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))),
              coach:users!coach_id (first_name, last_name, photo_url)
            `).in('id', bandIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('bands').select('*, songs(title, artist, instrumentation), band_members(*, users!user_id(*)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
        supabase.from('users').select('*').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
        supabase.from('sessions').select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen)').is('check_out_time', null).eq('users.school_id', schoolId).eq('users.role', 'student')
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
          return u.role?.toLowerCase() === 'student' && s.station_id && s.gps_verified;
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
          let currentMemberships = await supabase.from('band_members').select('user_id, bands(id, song_id)').then(r => r.data || []);
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
              let instCount: Record<string, number> = {};
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

        // We show all bands that have at least one song assigned, even if incomplete,
        // so that the Vocal-Finder and other joining tools can find them.
        const validBands = bandsData.filter((band: any) => {
          const song = band?.songs ? (Array.isArray(band.songs) ? band.songs[0] : band.songs) : null;
          return !!song;
        });
        setAllBands(validBands);

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


      // Fetch school users for both student and teacher to support direct messaging
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, photo_url, teacher_id, instrument')
        .eq('school_id', schoolId)
        .order('first_name');
      if (allUsers) {
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
      await supabase.from('band_members').delete().eq('band_id', bandId).eq('user_id', user.id);

      // 2. Remove from band_song_slots for all songs in this band
      const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (bandSongs && bandSongs.length > 0) {
        const songIds = bandSongs.map(s => s.id);
        await supabase.from('band_song_slots').delete().in('band_song_id', songIds).eq('user_id', user.id);
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
    const currentUserId = userIdArg || loggedInUserId || sessionStorage.getItem('groovelab_user_id');
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
            coach_id: user?.id,
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
    const uid = sessionStorage.getItem('groovelab_user_id') || (user?.id);
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
    const uid = sessionStorage.getItem('groovelab_user_id') || (user?.id);
    if (!uid) return;
    try {
      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: uid,
        recipient_id: recipientId,
        content
      });
      if (error) throw error;
      fetchCampusMessages();
    } catch (err) {
      console.error('Error sending campus message:', err);
    }
  };

  const handleMarkCampusMessagesAsRead = async (senderId: string) => {
    const uid = sessionStorage.getItem('groovelab_user_id') || (user?.id);
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

  const handleAcknowledgeStudentMessage = async (msg: any) => {
    if (!user) return;
    const currentReadBy = msg.read_by || [];
    if (currentReadBy.includes(user.id)) return;
    
    const newReadBy = [...currentReadBy, user.id];
    
    // Optimistic update of local states
    setStudentMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read_by: newReadBy } : m));
    setSelectedStudentMessage((prev: any) => prev && prev.id === msg.id ? { ...prev, read_by: newReadBy } : prev);
    
    try {
      await supabase
        .from('band_shoutbox')
        .update({ read_by: newReadBy })
        .eq('id', msg.id);
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
    e.preventDefault();
    if (!user || !user.school_id) return;
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert('Bitte Betreff und Nachricht ausfüllen.');
      return;
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
              coach_id: user.id,
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
          setAnnBandId(bandId);
        }
      }
      
      if (!bandId) {
        alert('Fehler beim Erstellen der System-Band.');
        setLoading(false);
        return;
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
        alert('Fehler beim Senden: ' + error.message);
      } else {
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setAnnouncementTarget('all');
        setSelectedTargetUserIds([]);
        setRecipientSearchText('');
        
        await fetchAnnouncements(user.school_id);
        alert('Nachricht wurde erfolgreich gesendet!');
      }
    } catch (err: any) {
      console.error('[Announcements] Error posting:', err);
      alert('Unerwarteter Fehler: ' + err.message);
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
    
    const { error } = await supabase
      .from('help_requests')
      .insert({
        user_id: loggedInUserId,
        station_id: session.station_id,
        school_id: sId,
        status: 'pending'
      });
      
    if (error) {
      setToastMessage({ text: 'Fehler beim Senden: ' + error.message, type: 'error' });
    } else {
      setToastMessage({ text: 'Hilfe wurde angefordert. Der Lehrer sieht deinen Tisch im Dashboard.', type: 'success' });
    }
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
      await supabase.from('band_songs').update({ band_id: band.id, status: 'active' }).eq('id', pendingFounding.id);
      
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

    try {
      if (loggedInUserId) {
        // Mark user as offline IMMEDIATELY for dashboard
        const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
        await supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId);
      }

      if (updateDb && currentSession?.id) {
        // Session beenden in DB
        await supabase
          .from('sessions')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', currentSession.id);
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
      const schoolId = currentUser?.school_id || (currentUser?.schools ? (Array.isArray(currentUser.schools) ? currentUser.schools[0]?.id : currentUser.schools?.id) : null);
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

    if (isDeviceKiosk && roomId) {
      console.log('[Logout] Redirecting Kiosk device to school room:', roomId);
      localStorage.removeItem('groovelab_station_id');
      localStorage.setItem('groovelab_kiosk_room_id', roomId);

      // Clear local credentials/states
      setLoggedInUserId(null);
      setUser(null);
      setSession(null);
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_location_mode');
      localStorage.removeItem('groovelab_user_id');
      localStorage.removeItem('groovelab_location_mode');
      localStorage.removeItem('groovelab_active_tab');

      // Redirect
      window.location.replace(`${window.location.origin}${window.location.pathname}?kiosk_room_id=${roomId}`);
      return;
    }

    console.log('[Logout] Logging out personal device.');
    localStorage.removeItem('groovelab_station_id');
    localStorage.removeItem('groovelab_kiosk_room_id');
    localStorage.removeItem('groovelab_active_platform');
    setLoggedInUserId(null);
    setUser(null);
    setSession(null);
    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
    localStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_location_mode');
    localStorage.removeItem('groovelab_active_tab');
  };

  const hasInviteSchoolId = new URLSearchParams(window.location.search).has('invite_school_id');

  const handleLogin = async (userId: string, isHome?: boolean) => {
    const { data: userToLogin } = await supabase.from('users').select('role, contract_ends_at, contract_decision_made, is_external_vocalist').eq('id', userId).single();
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

    const mode = isHome ? 'home' : 'lab';
    
    // If we are switching profiles, mark the OLD one as offline first
    if (loggedInUserId && loggedInUserId !== userId) {
      const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
      await supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId);
    }

    setLoggedInUserId(userId);
    setLocationMode(mode);
    sessionStorage.setItem('groovelab_user_id', userId);
    sessionStorage.setItem('groovelab_location_mode', mode);

    // Default start tab
    const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
    const startTab = activePlatform === 'campus' 
      ? (userToLogin?.role === 'student' ? 'briefing' : 'live')
      : 'live';
      
    setActiveStudentTab(startTab);
    localStorage.setItem(activePlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab', startTab);

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
    if (user) {
      const storageKey = activePlatform === 'campus' ? 'campus_active_tab' : (activePlatform === 'ensembles' ? 'ensembles_active_tab' : 'groovelab_active_tab');
      const storedTab = localStorage.getItem(storageKey);
      if (!storedTab) {
        const startTab = user.role === 'student' 
          ? (activePlatform === 'campus' ? 'briefing' : 'live') 
          : 'live';
        console.log('[Tab Sync] No tab stored in localStorage. Fallback to start tab:', startTab);
        setActiveStudentTab(startTab);
        localStorage.setItem(storageKey, startTab);
      } else {
        // Auto-correct if teacher/admin somehow has a student-only tab active
        const isTeacherOrAdmin = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
        if (isTeacherOrAdmin) {
          const studentTabs = ['briefing', 'practice_board', 'mediathek', 'practice', 'library', 'repertoire', 'matching'];
          if (studentTabs.includes(activeStudentTab)) {
            const fallbackTab = 'live';
            console.log('[Tab Sync] Auto-correcting student-only tab for teacher/admin to fallback:', fallbackTab);
            setActiveStudentTab(fallbackTab);
            localStorage.setItem(storageKey, fallbackTab);
          }
        }
        // Auto-correct if a student on groovelab has an invalid campus-only tab saved (e.g. 'briefing' from old Safety Hook bug)
        const isStudent = user.role?.toLowerCase() === 'student';
        if (isStudent && activePlatform === 'groovelab') {
          const validGroovelabStudentTabs = ['live', 'practice', 'library', 'repertoire', 'matching', 'bands', 'messages', 'profile', 'settings'];
          if (!validGroovelabStudentTabs.includes(activeStudentTab)) {
            console.log('[Tab Sync] Auto-correcting invalid groovelab student tab to live:', activeStudentTab);
            setActiveStudentTab('live');
            localStorage.setItem('groovelab_active_tab', 'live');
          }
        }
      }
    }
  }, [user?.role, activePlatform, activeStudentTab]);

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

    // Heartbeat: Update last_seen every 30 seconds
    const updateHeartbeat = async () => {
      const now = new Date().toISOString();
      if (user?.id) {
        await supabase
          .from('users')
          .update({ last_seen: now })
          .eq('id', user.id);
      }
    };

    updateHeartbeat(); // Immediate heartbeat on load/mount
    const heartbeat = setInterval(updateHeartbeat, 30000);

    // Immediate heartbeat when returning to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      .select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen)')
      .is('check_out_time', null)
      .eq('users.school_id', schoolId)
      .eq('users.role', 'student');
    
    // Only count students who have an active session at a station and are gps_verified
    const count = (activeSessions || []).filter(s => {
      const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
      if (!u) return false;
      return u.role?.toLowerCase() === 'student' && s.station_id && s.gps_verified;
    }).length;
    
    setActiveStudentsCount(count);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const urlBandId = urlParams.get('band');

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
  const urlCampusPassToken = urlParams.get('campus_pass');
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
            <div style={{ width: '32px', height: '32px', background: '#e8f5e9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#2e7d32', fontWeight: 900, fontSize: '1.2rem' }}>C</span>
            </div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>CAMPUS PASS</div>
          </div>
          
          {/* Standing credit-card style layout */}
          <div style={{ maxWidth: '380px', width: '100%' }}>
            <QRCodeModal 
              user={publicPassUser} 
              activePlatform="campus" 
              onClose={() => {
                window.close();
              }} 
            />
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
    return <DeviceSetupScreen />;
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

  // 2. AUTHENTICATION CHECK
  if (!loggedInUserId && !showDeletionPrompt) {
    return <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />;
  }

  if (showDeletionPrompt && deletionPromptUserId) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '24px' }}>
        <div style={{ background: '#ffffff', borderRadius: '32px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '16px', color: '#1e293b' }}>Vertragsende bald erreicht</h2>
          <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.5' }}>
            Wir haben die Information erhalten, dass dein Vertrag bald endet. Bitte teile uns mit, was nach Ablauf mit deinem Account und deinen Daten passieren soll.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={async () => {
                await supabase.from('users').update({ delete_after_contract: true, contract_decision_made: true }).eq('id', deletionPromptUserId);
                setShowDeletionPrompt(false);
                setDeletionPromptUserId(null);
                handleLogin(deletionPromptUserId, deletionPromptIsHome);
              }}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}
            >
              Account nach Vertragsende löschen
            </button>
            <button 
              onClick={async () => {
                await supabase.from('users').update({ delete_after_contract: false, contract_decision_made: true }).eq('id', deletionPromptUserId);
                setShowDeletionPrompt(false);
                setDeletionPromptUserId(null);
                handleLogin(deletionPromptUserId, deletionPromptIsHome);
              }}
              style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}
            >
              Account inaktiv behalten (Archiv)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#09090b', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column', 
        gap: '16px' 
      }}>
        <div className="animate-spin" style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(255, 255, 255, 0.05)', 
          borderTopColor: '#facc15', 
          borderRadius: '50%' 
        }}></div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>
          Sitzung wird wiederhergestellt...
        </div>
      </div>
    );
  }

  // 2.5 MASTER ADMIN PORTAL BYPASS
  if (user.is_master_admin) {
    return <MasterAdminDashboard onLogout={handleLogout} />;
  }

  // 2.5b SECRETARY DASHBOARD BYPASS
  if (user.role?.toLowerCase() === 'secretary' || user.role?.toLowerCase() === 'admin') {
    return (
      <ErrorBoundary>
        <SecretaryDashboard 
          schoolId={user.school_id} 
          userId={user.id} 
          onLogout={handleLogout} 
        />
      </ErrorBoundary>
    );
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
    if (nameLower.includes('boris')) {
      return {
        solidBg: '#10b981', solidBorder: '#059669',
        lightBg: 'rgba(16, 185, 129, 0.12)', lightBorder: 'rgba(16, 185, 129, 0.5)', lightText: '#059669'
      };
    }
    
    const palettes = [
      { solidBg: '#3b82f6', solidBorder: '#2563eb', lightBg: 'rgba(59, 130, 246, 0.12)', lightBorder: 'rgba(59, 130, 246, 0.5)', lightText: '#2563eb' }, // Blue
      { solidBg: '#8b5cf6', solidBorder: '#7c3aed', lightBg: 'rgba(139, 92, 246, 0.12)', lightBorder: 'rgba(139, 92, 246, 0.5)', lightText: '#7c3aed' }, // Violet
      { solidBg: '#ec4899', solidBorder: '#db2777', lightBg: 'rgba(236, 72, 153, 0.12)', lightBorder: 'rgba(236, 72, 153, 0.5)', lightText: '#db2777' }, // Pink
      { solidBg: '#14b8a6', solidBorder: '#0d9488', lightBg: 'rgba(20, 184, 166, 0.12)', lightBorder: 'rgba(20, 184, 166, 0.5)', lightText: '#0d9488' }, // Teal
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
      if (containsMe) {
        return {
          bgColor: 'linear-gradient(135deg, #f59e0b 0%, #10b981 100%)',
          border: '1px solid #cbd5e1',
          textColor: 'white'
        };
      } else {
        return {
          bgColor: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
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
    const teacherSlots = globalPlannedSlots.filter((s: any) => 
      s.profiles?.role?.toLowerCase() === 'teacher' || 
      s.profiles?.role?.toLowerCase() === 'admin'
    );
    
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
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} color="#22c55e" />}
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
                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
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
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#16a34a',
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
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#16a34a',
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
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#16a34a',
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
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#16a34a',
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
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#16a34a',
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
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#16a34a',
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
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.2)',
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
      <aside className="sidebar-nav" style={{ display: windowWidth > 800 ? 'flex' : 'none' }}>
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
              const showDetailedStats = campusSettings.show_detailed_stats !== false;
              const flamesActive = campusSettings.flames_active !== false;
              return (
                <>
                  <button onClick={() => setActiveStudentTab('briefing')} className={`sidebar-item ${['briefing', 'profile'].includes(activeStudentTab) ? `active ${activePlatform}` : ''}`}>
                    <Monitor size={20} /> Briefing
                  </button>
                  {flamesActive && (
                    <button onClick={() => setActiveStudentTab('practice_board')} className={`sidebar-item ${activeStudentTab === 'practice_board' ? `active ${activePlatform}` : ''}`}>
                      <Zap size={20} /> Übe-Pfad
                    </button>
                  )}
                  <button onClick={() => setActiveStudentTab('mediathek')} className={`sidebar-item ${activeStudentTab === 'mediathek' ? `active ${activePlatform}` : ''}`}>
                    <Library size={20} /> Mediathek
                  </button>
                  <button onClick={() => setActiveStudentTab('events')} className={`sidebar-item ${activeStudentTab === 'events' ? `active ${activePlatform}` : ''}`}>
                    <Calendar size={20} /> Termine
                  </button>
                  {showLeaderboard && (
                    <button onClick={() => setActiveStudentTab('campus_cup')} className={`sidebar-item ${activeStudentTab === 'campus_cup' ? `active ${activePlatform}` : ''}`}>
                      <Trophy size={20} /> Performance & Highlights
                    </button>
                  )}
                  {showDetailedStats && (
                    <button onClick={() => setActiveStudentTab('flashback')} className={`sidebar-item ${activeStudentTab === 'flashback' ? `active ${activePlatform}` : ''}`}>
                      <Clock size={20} /> Flashback
                    </button>
                  )}
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
                  <button onClick={() => setActiveStudentTab('settings')} className={`sidebar-item ${activeStudentTab === 'settings' ? `active ${activePlatform}` : ''}`}>
                    <Settings size={20} /> Einstellungen
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
                <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? `active ${activePlatform}` : ''}`} style={{ position: 'relative' }}>
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
                  <Trophy size={20} /> Performance & Highlights
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
                <button onClick={() => setActiveStudentTab('messages')} className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`}>
                  <Mail size={20} /> Nachrichten
                </button>
                <button onClick={() => setActiveStudentTab('students')} className={`sidebar-item ${activeStudentTab === 'students' ? `active ${activePlatform}` : ''}`}>
                  <Users size={20} /> Schüler
                </button>
                <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? `active ${activePlatform}` : ''}`}>
                  <Shield size={20} /> Team
                </button>
                <button onClick={() => setActiveStudentTab('rooms')} className={`sidebar-item ${activeStudentTab === 'rooms' ? `active ${activePlatform}` : ''}`}>
                  <Box size={20} /> Räume
                </button>
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
                  <Shield size={20} /> Setup
                </button>
              </>
            )
          )}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '16px', paddingBottom: '16px', paddingLeft: '8px', paddingRight: '8px' }}>
          <button 
            onClick={() => setActiveStudentTab('profile')} 
            className={`sidebar-item ${activeStudentTab === 'profile' ? `active ${activePlatform}` : ''}`}
            style={{ 
              width: '100%',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '8px 12px', 
              borderRadius: '16px', 
              border: 'none', 
              background: 'transparent',
              cursor: 'pointer',
              marginBottom: '8px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <StudioAvatar src={user.photo_url} user={user} activePlatform={activePlatform} />
              </div>
              {session && <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.first_name}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activePlatform === 'campus'
                  ? (user.role === 'admin' ? 'Campus Admin' : user.role === 'teacher' ? 'Campus Lehrkraft' : user.role === 'secretary' ? 'Campus Verwaltung' : 'Campus Schüler')
                  : (user.role === 'admin' ? 'GrooveLab Admin' : user.role === 'teacher' ? 'GrooveLab Lehrer' : user.role === 'secretary' ? 'GrooveLab Verwaltung' : 'GrooveLab Schüler')}
              </div>
            </div>
            <ChevronRight size={16} color="#94a3b8" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </button>
          <button 
            onClick={() => handleLogout(true, true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}
          >
            <LogOut size={18} color="#ef4444" /> Abmelden
          </button>
          
          {/* Legal Links under logout */}
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex', 
            justifyContent: 'center',
            gap: '12px', 
            fontSize: '10px', 
            fontWeight: 800, 
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span 
              onClick={() => setShowPrivacy(true)} 
              style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            >
              Datenschutz
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span 
              onClick={() => setShowAgb(true)} 
              style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            >
              AGB
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span 
              onClick={() => setShowImpressum(true)} 
              style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            >
              Impressum
            </span>
          </div>
        </div>
      </aside>

      <div className={`main-wrapper ${activeStudentTab === 'live' ? 'live-tab-active' : ''}`} style={{ paddingTop: '0' }}>
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: windowWidth <= 800 ? '0 16px' : '0 32px', height: '80px', background: 'transparent' }}>
          {/* App Switcher Tabs */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            gap: windowWidth <= 800 ? '4px' : '6px', 
            height: '100%',
            paddingTop: '20px',
            boxSizing: 'border-box'
          }}>
            {/* Campus Tab */}
            {school?.has_campus_subscription && user?.is_campus_active && (
              <div 
                onClick={() => {
                  setActivePlatform('campus');
                  const firstTab = user?.role?.toLowerCase() === 'student' ? 'briefing' : 'live';
                  setActiveStudentTab(firstTab);
                  localStorage.setItem('campus_active_tab', firstTab);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: windowWidth <= 800 ? '10px 14px 8px' : '12px 22px 10px',
                  borderRadius: '12px 12px 0 0',
                  background: activePlatform === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.05)',
                  color: activePlatform === 'campus' ? '#ffffff' : '#34a853',
                  border: activePlatform === 'campus' ? '1px solid #34a853' : '1px solid rgba(52, 168, 83, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activePlatform === 'campus' ? 2 : 1,
                  transform: activePlatform === 'campus' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activePlatform === 'campus' ? '0 -4px 16px rgba(52, 168, 83, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <GraduationCap size={15} color={activePlatform === 'campus' ? '#ffffff' : '#34a853'} />
                <span>Campus</span>
              </div>
            )}

            {/* GrooveLab Tab */}
            {school?.has_groovelab_subscription && user?.is_groovelab_active && (
              <div 
                onClick={() => {
                  setActivePlatform('groovelab');
                  setActiveStudentTab('live');
                  localStorage.setItem('groovelab_active_tab', 'live');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: windowWidth <= 800 ? '10px 14px 8px' : '12px 22px 10px',
                  borderRadius: '12px 12px 0 0',
                  background: activePlatform === 'groovelab' ? '#facc15' : 'rgba(250, 204, 21, 0.05)',
                  color: activePlatform === 'groovelab' ? '#09090b' : '#eab308',
                  border: activePlatform === 'groovelab' ? '1px solid #facc15' : '1px solid rgba(250, 204, 21, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activePlatform === 'groovelab' ? 2 : 1,
                  transform: activePlatform === 'groovelab' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activePlatform === 'groovelab' ? '0 -4px 16px rgba(250, 204, 21, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <Music size={15} color={activePlatform === 'groovelab' ? '#09090b' : '#eab308'} />
                <span>GrooveLab</span>
              </div>
            )}

            {/* Ensemble & Bands Tab */}
            {showEnsemblesFeature && (
              <div 
                onClick={() => {
                  setActivePlatform('ensembles');
                  setActiveStudentTab('overview');
                  localStorage.setItem('ensembles_active_tab', 'overview');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: windowWidth <= 800 ? '10px 14px 8px' : '12px 22px 10px',
                  borderRadius: '12px 12px 0 0',
                  background: activePlatform === 'ensembles' ? '#3b82f6' : 'rgba(59, 130, 246, 0.05)',
                  color: activePlatform === 'ensembles' ? '#ffffff' : '#3b82f6',
                  border: activePlatform === 'ensembles' ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activePlatform === 'ensembles' ? 2 : 1,
                  transform: activePlatform === 'ensembles' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activePlatform === 'ensembles' ? '0 -4px 16px rgba(59, 130, 246, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <Users size={15} color={activePlatform === 'ensembles' ? '#ffffff' : '#3b82f6'} />
                <span>Ensembles & Bands</span>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: windowWidth <= 800 ? '16px' : '28px',
            marginLeft: windowWidth <= 800 ? '24px' : '48px'
          }}>
            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth <= 768 ? '4px' : '8px' }}>
              {activePlatform === 'campus' ? (
                <>
                  {/* Trial Pill */}
                  {(user?.role === 'teacher' || user?.role === 'admin') && school?.is_trial && trialDaysLeft !== null && (
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                      padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
                      color: 'white'
                    }}>
                      <AlertCircle size={14} color="white" />
                      <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {trialDaysLeft > 0 
                          ? `Probezeit: ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag' : 'Tage'}`
                          : 'Probezeit abgelaufen'}
                      </span>
                    </div>
                  )}

                  {/* Unified School, Teacher, Student, Admin & Secretary Pill */}
                  {(() => {
                    if (user?.role === 'student') {
                      return (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'rgba(59, 130, 246, 0.04)', 
                          padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(59, 130, 246, 0.12)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          <span style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {windowWidth > 768 && (
                              <>
                                <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <School size={12} color="#ef4444" />
                                  <span>
                                    {school?.name || 'Meine Musikschule'}
                                  </span>
                                </span>
                                <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                                <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={14} color="#3b82f6" />
                                  <span>
                                    {(() => {
                                      const teacherName = teachers.find(t => t.id === user.teacher_id) 
                                        ? `${teachers.find(t => t.id === user.teacher_id).first_name} ${teachers.find(t => t.id === user.teacher_id).last_name}` 
                                        : (teachers.length > 0 
                                          ? `${teachers[0].first_name} ${teachers[0].last_name}` 
                                          : 'Patrick Huber');
                                      return teacherName;
                                    })()}
                                  </span>
                                </span>
                                <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                              </>
                            )}
                            <span style={{ color: '#34a853', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={14} color="#34a853" />
                              <span>
                                {user.first_name || 'Schüler'}
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    } else if (user?.role === 'teacher') {
                      return (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'rgba(59, 130, 246, 0.04)', 
                          padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(59, 130, 246, 0.12)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          <span style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <School size={12} color="#ef4444" />
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
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'rgba(59, 130, 246, 0.04)', 
                          padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(59, 130, 246, 0.12)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          <span style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <School size={12} color="#ef4444" />
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
                </>
              ) : (
                <>
                  {/* Trial Pill */}
                  {(user?.role === 'teacher' || user?.role === 'admin') && school?.is_trial && trialDaysLeft !== null && (
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                      padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                      color: 'white'
                    }}>
                      <AlertCircle size={14} color="white" />
                      <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {trialDaysLeft > 0 
                          ? `Probezeit: ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag' : 'Tage'}`
                          : 'Probezeit abgelaufen'}
                      </span>
                    </div>
                  )}

                  {/* Location Pill */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: getRoleColor(user?.role, locationMode === 'lab' ? (session?.stations?.name || ((user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') ? 'Lehrer iPad' : 'Labor iPad')) : undefined), 
                    padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                    boxShadow: `0 4px 12px ${getRoleColor(user?.role, locationMode === 'lab' ? (session?.stations?.name || ((user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') ? 'Lehrer iPad' : 'Labor iPad')) : undefined)}30`
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') 
                        ? (locationMode === 'lab' ? 'Lehrer iPad' : 'Home') 
                        : (locationMode === 'lab' ? `Labor (${session?.stations?.name || 'iPad'})` : 'Home')}
                    </span>
                  </div>

                  {/* Lab Count Pill */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: '#22c55e', padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeStudentsCount} im Lab</span>
                  </div>
                </>
              )}
            </div>

            {/* Ausweis Button (Only Student, Desktop only) */}
            {user.role?.toLowerCase() === 'student' && windowWidth > 800 && (
              <button onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                <span style={{ color: activePlatform === 'campus' ? '#34a853' : '#eab308', fontWeight: 800, fontSize: '0.85rem' }}>Ausweis</span>
                <QrCode size={18} color={activePlatform === 'campus' ? '#34a853' : '#eab308'} />
              </button>
            )}

            {/* User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth <= 800 ? '8px' : '16px', paddingLeft: windowWidth <= 800 ? '8px' : '16px', borderLeft: '1px solid #f1f5f9' }}>
              {windowWidth > 800 && activePlatform !== 'campus' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>Hallo {user.first_name}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {user.role === 'admin' ? 'GrooveLab Admin' : user.role === 'teacher' ? 'GrooveLab Lehrer' : user.role === 'secretary' ? 'GrooveLab Verwaltung' : 'GrooveLab Schüler'}
                  </div>
                </div>
              )}
              {activePlatform !== 'campus' && (
                <div style={{ width: windowWidth <= 768 ? '40px' : '52px', height: windowWidth <= 768 ? '40px' : '52px', borderRadius: '16px', border: '3px solid white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                  <StudioAvatar src={user.photo_url} user={user} activePlatform={activePlatform} />
                </div>
              )}
              {/* Elegant Logout Button next to avatar */}
              <button 
                onClick={() => handleLogout(true, true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: '#fff1f2', 
                  border: '1px solid #ffe4e6', 
                  padding: windowWidth <= 768 ? '8px' : '8px 14px', 
                  borderRadius: '12px', 
                  color: '#f43f5e', 
                  fontWeight: 800, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.08)',
                  flexShrink: 0
                }}
                className="hover-scale"
                title="Abmelden"
              >
                <LogOut size={14} color="#f43f5e" />
                {windowWidth > 768 && <span>Abmelden</span>}
              </button>
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
          marginBottom: activePlatform === 'campus' ? '0px' : '10px'
        }} />


      <main className="main-content" style={{ 
        overflow: activeStudentTab === 'live' ? 'hidden' : 'auto', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: activeStudentTab === 'live' ? '100%' : 'auto',
        paddingLeft: (activePlatform === 'campus' && windowWidth <= 768) ? '0px' : '20px',
        paddingRight: (activePlatform === 'campus' && windowWidth <= 768) ? '0px' : '20px',
        minWidth: 0
      }}>
        {/* Ensemble & Bands Platform View */}
        {activePlatform === 'ensembles' && (
          <ErrorBoundary>
            <EnsembleDashboard 
              user={user}
              schoolId={user.school_id}
              supabase={supabase}
            />
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
                    setActiveStudentTab(newPlatform === 'campus' ? 'briefing' : 'live');
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
                    setFoundingName(generateRandomBandName());
                  }}
                />
              </div>
            </ErrorBoundary>
          </div>
        )}

        {/* Student Campus Dashboard Tabs (Kept mounted for instant platform switching) */}
        {user.role?.toLowerCase() === 'student' && (
          <div style={{ 
            display: ((activePlatform === 'campus' || (activePlatform === 'groovelab' && activeStudentTab !== 'profile')) && ['briefing', 'mediathek', 'practice_board', 'campus_cup', 'flashback', 'events', 'profile', 'all_appointments', 'settings'].includes(activeStudentTab)) ? 'block' : 'none',
            width: '100%'
          }}>
            <ErrorBoundary>
              <StudentAvatarDashboard 
                studentId={user.id} 
                parentActiveTab={activeStudentTab}
                onTabChange={(tab) => setActiveStudentTab(tab)}
                onProfileUpdate={(updatedFields: any) => {
                  setUser((prev: any) => prev ? { ...prev, ...updatedFields } : null);
                }}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Profile Tab */}
        {activeStudentTab === 'profile' && !(user.role?.toLowerCase() === 'student' && activePlatform === 'campus') && (
          <ErrorBoundary>
            {activePlatform === 'campus' && (user.role === 'teacher' || user.role === 'admin') ? (
              /* --- WORLD-CLASS CAMPUS TEACHER PROFILE DESIGN --- */
              <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
                {/* Hero Header Card with Premium Glassmorphism & Overlapping Elements */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 100%)',
                  backdropFilter: 'blur(24px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '32px',
                  boxShadow: '0 12px 40px rgba(15, 23, 42, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  display: 'flex',
                  overflow: 'visible',
                  position: 'relative',
                  minHeight: '240px',
                  alignItems: 'center',
                  padding: '32px 48px',
                  gap: '32px',
                  flexWrap: 'wrap'
                }}>
                  {/* Floating Shielded Avatar Frame */}
                  <div style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '50%',
                    border: '5px solid #ffffff',
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
                    background: '#ffffff',
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 2,
                    transform: 'translateY(-10px)'
                  }}>
                    <img 
                      src={getInstrumentAvatarUrl(user.instrument)} 
                      alt="" 
                      style={{ width: '95%', height: '95%', objectFit: 'contain' }} 
                    />
                  </div>

                  {/* Profile Identity Details */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #007aff 0%, #0056b3 100%)',
                        color: 'white', 
                        padding: '4px 14px', 
                        borderRadius: '10px',
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.08em',
                        boxShadow: '0 4px 10px rgba(0, 122, 255, 0.2)'
                      }}>
                        Campus Lehrkraft
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 750 }}>
                        🏢 {user.schools?.name || 'Groovelab Campus'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
                        • Mitglied seit {user.created_at && !isNaN(new Date(user.created_at).getTime()) ? new Date(user.created_at).toLocaleDateString() : 'unbekannt'}
                      </span>
                    </div>

                    <h1 style={{ fontSize: '2.8rem', fontWeight: 950, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.03em', fontFamily: "'Urbanist', sans-serif" }}>
                      {user.first_name} {user.last_name}
                    </h1>

                    {/* Instruments List */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(user.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                        <div key={inst} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(0, 122, 255, 0.05)',
                          border: '1px solid rgba(0, 122, 255, 0.12)',
                          color: '#007aff',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 800
                        }}>
                          <span>🎸</span>
                          <span>{inst}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profile Edit Action Button */}
                  <button 
                    onClick={() => {
                      setEditingProfile({ ...user });
                      setShowEditProfile(true);
                    }} 
                    style={{ 
                      background: '#ffffff', 
                      border: '1px solid rgba(0,0,0,0.06)', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      color: '#0f172a', 
                      fontSize: '0.85rem', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px 20px',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      marginLeft: 'auto'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <span>Profil bearbeiten</span>
                    <Pencil size={15} />
                  </button>
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
                    <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

                {/* Split layout: Biography & Teaching Days Calendar Overview */}
                <div style={{ display: 'grid', gridTemplateColumns: width < 900 ? '1fr' : '1.2fr 0.8fr', gap: '24px', alignItems: 'start' }}>
                  
                  {/* Day Availability Calendar Planner */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={20} style={{ color: '#007aff' }} />
                      Unterrichtstage & Startzeiten
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(() => {
                        const boardsToDisplay = activePlatform === 'campus' 
                          ? (user.campus_räume || []) 
                          : (user.groovelab_räume || []);
                        return boardsToDisplay.length > 0 ? (
                          (boardsToDisplay as any[]).map((board) => {
                            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                            return (
                              <div key={board.id} style={{ 
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
                                      {DAYS_DE[board.dayOfWeek]}s
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                      {(() => {
                                      const timeToMinutes = (timeStr: string) => {
                                        const [h, m] = timeStr.split(':').map(Number);
                                        return h * 60 + m;
                                      };
                                      const minutesToTime = (mins: number) => {
                                        const h = Math.floor(mins / 60);
                                        const m = mins % 60;
                                        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                      };
                                      
                                      const daySchedules = (campusTeacherStats?.schedules || []).filter(s => s.day_of_week === board.dayOfWeek);
                                      let startStr = board.startAnchor || '14:00';
                                      let endStr = '';

                                      if (daySchedules.length > 0) {
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
                                        if (minStart !== Infinity) startStr = minutesToTime(minStart);
                                        if (maxEnd !== -Infinity) endStr = minutesToTime(maxEnd);
                                      } else {
                                        const startMins = timeToMinutes(startStr);
                                        endStr = minutesToTime(startMins + 180);
                                      }

                                      return <>Geplanter Unterricht: {startStr} bis {endStr} Uhr</>;
                                    })()}
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

                  {/* Professional Biography / Werdegang */}
                  <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 12px 0', fontFamily: "'Urbanist', sans-serif" }}>
                        Werdegang
                      </h3>
                      <div style={{ fontSize: '0.85rem', fontWeight: 550, color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                        {user.bio || 'Trage deinen Werdegang ein, um Schülern und Kollegen mehr über dich zu erzählen.'}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Zusatz-Qualifikationen
                      </h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {user.expertise ? (
                          user.expertise.split(',').map((e: string) => e.trim()).filter(Boolean).map((exp: string) => (
                            <span key={exp} style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                              {exp}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Keine Expertise eingetragen</span>
                        )}
                      </div>
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
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Campus App © {new Date().getFullYear()}</span>
                </div>
              </div>
            ) : (
              /* --- GROOVELAB PROFILE LOOK (ORIGINAL) --- */
              <>
                <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', margin: '0 auto', width: '100%', marginTop: '14px' }}>
              {/* Top: Massive Hero Card */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', display: 'flex', overflow: 'hidden', minHeight: '340px' }}>
                <div style={{ flex: '0 0 40%', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  <StudioAvatar src={user.photo_url || '/avatar_ghost.jpg'} user={user} style={{ position: 'absolute', inset: 0 }} />
                  {/* Edit Button Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'all 0.3s' }} className="photo-overlay">
                    <button 
                      onClick={() => {
                        setAvatarPickerType('student');
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
                      background: (user.role === 'teacher' || user.role === 'admin') ? '#6366f1' : '#f59e0b',
                      color: 'white', padding: '4px 12px', borderRadius: '8px',
                      fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {(user.role === 'teacher' || user.role === 'admin') ? 'Coach' : 'Pro Artist'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 700 }}>{user.schools?.name || 'Groovelab Academy'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>• Mitglied seit {user.created_at && !isNaN(new Date(user.created_at).getTime()) ? new Date(user.created_at).toLocaleDateString() : 'unbekannt'}</span>

                    {/* XP only for students */}
                    {user.role === 'student' && (
                      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                        <Star size={12} fill="white" /> {userSongs.filter(s => s.progress === 100).length * 100} XP
                      </div>
                    )}
                  </div>

                  <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
                    {user.role === 'student' ? user.first_name : `${user.first_name} ${user.last_name?.[0]}.`}
                  </h1>

                  {/* Instrument Icons */}
                  {(user.role === 'teacher' || user.role === 'admin') ? (
                    // COACH: show only selected instruments, no count
                    (() => {
                      const teacherInstruments = (user.groovelab_instrument || '')
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                      // Map German names to icon keys
                      const iconKeyMap: Record<string, string> = {
                        'Gitarre': 'Guitar', 'Bass': 'Bass', 'Drums': 'Drums',
                        'Vocals': 'Vocals', 'Piano / Keys': 'Keys'
                      };
                      return teacherInstruments.length > 0 ? (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                          {teacherInstruments.map((inst: string) => (
                            <div key={inst} style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              background: '#f8fafc', padding: '8px 16px', borderRadius: '14px',
                              border: '1px solid #f1f5f9'
                            }}>
                              <span style={{ fontSize: '1.25rem' }}>
                                {APP_INSTRUMENT_ICONS[iconKeyMap[inst] as keyof typeof APP_INSTRUMENT_ICONS] ||
                                 APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS] || '🎵'}
                              </span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{inst}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
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
                        {user.bands && (
                          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '10px 14px', border: '1px solid #f1f5f9', flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Bands & Projekte</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{user.bands}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button onClick={() => {
                    setEditingProfile({ ...user });
                    setShowEditProfile(true);
                  }} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                    Profil bearbeiten <Pencil size={18} />
                  </button>
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
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '3px', 
                              background: (user?.first_name || '').toLowerCase().includes('patrick') ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)', 
                              border: (user?.first_name || '').toLowerCase().includes('patrick') ? '1px solid #d97706' : '1px dashed rgba(245, 158, 11, 0.5)'
                            }}></div> Patrick {(user?.first_name || '').toLowerCase().includes('patrick') ? '(Du)' : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '3px', 
                              background: (user?.first_name || '').toLowerCase().includes('boris') ? '#10b981' : 'rgba(16, 185, 129, 0.12)', 
                              border: (user?.first_name || '').toLowerCase().includes('boris') ? '1px solid #059669' : '1px dashed rgba(16, 185, 129, 0.5)'
                            }}></div> Boris {(user?.first_name || '').toLowerCase().includes('boris') ? '(Du)' : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '3px', 
                              background: 'linear-gradient(135deg, #f59e0b 0%, #10b981 100%)', 
                              border: '1px solid #cbd5e1'
                            }}></div> Beide
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(79, 70, 229, 0.4)' }}></div> Lab voll
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
                                            }

                                            // 2. Determine Inner Content (Student Count or Teachers' initials)
                                            if (totalCount > 0) {
                                              content = (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                                                  {totalCount}
                                                </span>
                                              );
                                            } else if (teachersInSlot.length > 0) {
                                              const initials = teachersInSlot
                                                .map(t => t.profiles?.first_name?.[0] || 'L')
                                                .join('+');
                                              content = (
                                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: textColor }} title={teachersInSlot.map(t => t.profiles?.first_name).join(', ')}>
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
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{activePlatform === 'campus' ? 'Campus App' : 'GrooveLab App'} © {new Date().getFullYear()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>)}
        </ErrorBoundary>
      )}

        {/* Admin/Teacher Section Tabs (Unified) */}
        {((user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'teacher')) && activePlatform !== 'ensembles' && ['live', 'schedule', 'students', 'team', 'rooms', 'songs', 'stats', 'gallery', 'setup', 'bands', 'events', showMissionsFeature ? 'missions' : ''].includes(activeStudentTab) && (
          <ErrorBoundary key={`${activePlatform}-${activeStudentTab}`}>
            <AdminDashboard 
              key={activePlatform}
              userId={user.id} 
              onLogout={handleLogout} 
              forceTab={activeStudentTab}
              activePlatform={activePlatform as any}
              onTabChange={(tabId: any) => setActiveStudentTab(tabId)}
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
            user?.role?.toLowerCase() === 'student' ? (
              <ErrorBoundary>
              <div className="animation-slide-up" style={{ 
                padding: '0 32px 32px 32px', 
                display: 'flex', 
                gap: '24px', 
                height: 'calc(100vh - 140px)', 
                minHeight: '700px',
                marginTop: '14px'
              }}>
                {/* Left Column: Inbox Message List (1/3rd width) */}
                <div className="glass-panel" style={{ 
                  background: 'white', 
                  borderRadius: '24px', 
                  width: '380px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden', 
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                  flexShrink: 0
                }}>
                  {/* Header of Mailbox */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: '0' }}>Nachrichten</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
                          {studentMessages.filter(m => !deletedMessageIds.includes(m.id)).length} Mitteilungen
                        </div>
                      </div>
                    </div>
                    
                    {/* Filter Segmented Controls */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '3px', gap: '2px' }}>
                      <button 
                        onClick={() => {
                          setStudentMessagesFilter('all');
                          const filtered = studentMessages.filter(m => !deletedMessageIds.includes(m.id));
                          setSelectedStudentMessage(filtered.length > 0 ? filtered[0] : null);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: 'none',
                          background: studentMessagesFilter === 'all' ? 'white' : 'transparent',
                          color: studentMessagesFilter === 'all' ? '#1e293b' : '#64748b',
                          borderRadius: '9px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: studentMessagesFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Megaphone size={14} /> Alle
                      </button>
                      <button 
                        onClick={() => {
                          setStudentMessagesFilter('school');
                          const filtered = studentMessages.filter(m => m.type === 'school' && !deletedMessageIds.includes(m.id));
                          setSelectedStudentMessage(filtered.length > 0 ? filtered[0] : null);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: 'none',
                          background: studentMessagesFilter === 'school' ? 'white' : 'transparent',
                          color: studentMessagesFilter === 'school' ? '#1e293b' : '#64748b',
                          borderRadius: '9px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: studentMessagesFilter === 'school' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <School size={14} /> Schule
                      </button>
                      <button 
                        onClick={() => {
                          setStudentMessagesFilter('band');
                          const filtered = studentMessages.filter(m => m.type === 'band' && !deletedMessageIds.includes(m.id));
                          setSelectedStudentMessage(filtered.length > 0 ? filtered[0] : null);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: 'none',
                          background: studentMessagesFilter === 'band' ? 'white' : 'transparent',
                          color: studentMessagesFilter === 'band' ? '#1e293b' : '#64748b',
                          borderRadius: '9px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: studentMessagesFilter === 'band' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Music size={14} /> Bands
                      </button>
                    </div>
                  </div>

                  {/* List Area */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
                    {studentMessagesLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: '#94a3b8' }}>
                        <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#fbbc05', borderRadius: '50%' }}></div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Lade Nachrichten...</div>
                      </div>
                    ) : (() => {
                      const filtered = studentMessages.filter(m => {
                        if (deletedMessageIds.includes(m.id)) return false;
                        if (studentMessagesFilter === 'school') return m.type === 'school';
                        if (studentMessagesFilter === 'band') return m.type === 'band';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
                            <Mail size={40} style={{ strokeWidth: 1.5, color: '#cbd5e1', marginBottom: '12px' }} />
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b' }}>Posteingang leer</div>
                            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                              {studentMessagesFilter === 'school' ? 'Keine Ankündigungen der Musikschule.' : studentMessagesFilter === 'band' ? 'Keine Nachrichten aus deinen Bands.' : 'Du bist auf dem neuesten Stand!'}
                            </div>
                          </div>
                        );
                      }

                      return filtered.map((msg: any) => {
                        const isRead = msg.read_by?.includes(user?.id);
                        const isSelected = selectedStudentMessage?.id === msg.id;
                        
                        return (
                          <div 
                            key={msg.id}
                            onClick={() => {
                              setSelectedStudentMessage(msg);
                              if (!isRead) {
                                handleAcknowledgeStudentMessage(msg);
                              }
                            }}
                            className="hover-scale"
                            style={{
                              padding: '16px',
                              borderRadius: '16px',
                              background: isSelected ? 'linear-gradient(135deg, #fefce8, #fef3c7)' : 'transparent',
                              border: isSelected ? '1px solid #fde047' : '1px solid transparent',
                              cursor: 'pointer',
                              marginBottom: '8px',
                              transition: 'all 0.2s',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            {!isRead && (
                              <div style={{
                                position: 'absolute',
                                top: '18px',
                                right: '18px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#fbbc05',
                                boxShadow: '0 0 8px #fbbc05'
                              }} />
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px' }}>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: msg.type === 'school' ? '#fee2e2' : '#dcfce7',
                                color: msg.type === 'school' ? '#ef4444' : '#22c55e',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                {msg.type === 'school' ? 'Schule' : 'Band'}
                              </span>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginLeft: 'auto' }}>
                                {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>

                            <h4 style={{
                              fontSize: '0.9rem',
                              fontWeight: isRead ? 700 : 900,
                              color: isSelected ? '#b45309' : '#1e293b',
                              margin: '0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              paddingRight: '16px'
                            }}>
                              {msg.title}
                            </h4>

                            <p style={{
                              fontSize: '0.75rem',
                              color: isSelected ? '#1e40af' : '#64748b',
                              margin: '0',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: '1.4',
                              fontWeight: isRead ? 500 : 700
                            }}>
                              {msg.content}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <img 
                                src={msg.sender?.photo_url || '/avatar_ghost.jpg'} 
                                alt=""
                                style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isSelected ? '#b45309' : '#475569' }}>
                                {msg.sender?.first_name} {msg.sender?.last_name || ''}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Right Column: Message Details (2/3rds width) */}
                <div className="glass-panel" style={{ 
                  flex: 1, 
                  background: 'white', 
                  borderRadius: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden', 
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
                }}>
                  {selectedStudentMessage ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      
                      {/* Message Header */}
                      <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img 
                          src={selectedStudentMessage.sender?.photo_url || '/avatar_ghost.jpg'} 
                          alt=""
                          style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0' }}>
                              {selectedStudentMessage.sender?.first_name} {selectedStudentMessage.sender?.last_name || ''}
                            </h4>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              background: selectedStudentMessage.type === 'school' ? '#fee2e2' : '#dcfce7',
                              color: selectedStudentMessage.type === 'school' ? '#ef4444' : '#22c55e',
                              padding: '2px 6px',
                              borderRadius: '5px'
                            }}>
                              {selectedStudentMessage.type === 'school' ? 'Coach' : 'Bandmitglied'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>
                            Gesendet am {new Date(selectedStudentMessage.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(selectedStudentMessage.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                          </div>
                        </div>
                      </div>

                      {/* Message Content Area */}
                      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }} className="custom-scrollbar">
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: '0', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                          {selectedStudentMessage.title}
                        </h2>
                        
                        <div style={{ 
                          fontSize: '1rem', 
                          color: '#334155', 
                          lineHeight: '1.6', 
                          fontWeight: 500,
                          whiteSpace: 'pre-wrap',
                          background: '#f8fafc',
                          padding: '24px',
                          borderRadius: '16px',
                          border: '1px solid #f1f5f9'
                        }}>
                          {selectedStudentMessage.content}
                        </div>
                      </div>

                      {/* Message Footer / Acknowledge Action */}
                      <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          onClick={() => handleDeleteMessageForSelf(selectedStudentMessage.id)}
                          className="hover-scale"
                          style={{
                            background: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #fee2e2',
                            padding: '12px 20px',
                            borderRadius: '14px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginRight: 'auto',
                            transition: 'all 0.2s'
                          }}
                          
                          
                        >
                          <Trash2 size={16} /> Für mich löschen
                        </button>

                        {selectedStudentMessage.read_by?.includes(user?.id) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '0.85rem', fontWeight: 700, padding: '10px 16px', background: '#dcfce7', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <Check size={16} strokeWidth={3} /> Nachricht gelesen & verstanden
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAcknowledgeStudentMessage(selectedStudentMessage)}
                            className="hover-scale"
                            style={{
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: 'white',
                              border: 'none',
                              padding: '12px 24px',
                              borderRadius: '14px',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.2)'
                            }}
                          >
                            <CheckCircle size={18} /> Als gelesen markieren
                          </button>
                        )}
                      </div>
                      
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', textAlign: 'center', background: '#f8fafc' }}>
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        background: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
                        marginBottom: '24px'
                      }}>
                        <Mail size={36} style={{ strokeWidth: 1.5, color: '#3b82f6' }} />
                      </div>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Willkommen im Postfach</h3>
                      <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '360px', lineHeight: 1.6, margin: '0' }}>
                        Wähle eine Mitteilung aus der Liste aus, um die Lesedetails anzuzeigen.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary>
              <div className="animation-slide-up" style={{  
              padding: '0 32px 32px 32px', 
              display: 'flex', 
              gap: '24px', 
              height: 'calc(100vh - 140px)', 
              minHeight: '700px',
              marginTop: '14px' 
            }}>
              
              {/* Left Column: Inbox Message List (1/3rd width) */}
              <div className="glass-panel" style={{ 
                background: 'white', 
                borderRadius: '24px', 
                width: '380px', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                border: '1px solid #f1f5f9',
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                flexShrink: 0
              }}>
                {/* Header of Mailbox */}
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: '0' }}>Nachrichten</h3>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>{announcements.length} Mitteilungen</div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMailComposing(true);
                      setSelectedMailMessage(null);
                    }}
                    style={{ 
                      background: '#fbbc05', 
                      color: '#1e293b', 
                      border: 'none', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(251, 188, 5, 0.2)'
                    }}
                    className="hover-scale"
                    title="Neue Mitteilung schreiben"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                {/* Scrollable list of mails */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {announcements.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
                      <Mail size={40} style={{ strokeWidth: 1.5, color: '#cbd5e1', marginBottom: '12px' }} />
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b' }}>Posteingang leer</div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>Erstelle deine erste Mitteilung mit dem Plus-Button!</div>
                    </div>
                  ) : (
                    announcements.map((ann: any) => {
                      let parsed;
                      try {
                        parsed = JSON.parse(ann.content);
                      } catch (e) {
                        parsed = {
                          title: 'Mitteilung',
                          message: ann.content,
                          target_type: 'all',
                          target_user_ids: []
                        };
                      }

                      let totalTarget = 0;
                      if (parsed.target_type === 'all') totalTarget = schoolUsers.length;
                      else if (parsed.target_type === 'students') totalTarget = schoolUsers.filter(u => u.role === 'student').length;
                      else if (parsed.target_type === 'teachers') totalTarget = schoolUsers.filter(u => u.role === 'teacher' || u.role === 'admin').length;
                      else if (parsed.target_type === 'specific') totalTarget = parsed.target_user_ids?.length || 0;

                      const readCount = ann.read_by?.length || 0;
                      const isSelected = selectedMailMessage?.id === ann.id;

                      return (
                        <button
                          key={ann.id}
                          onClick={() => {
                            setSelectedMailMessage(ann);
                            setIsMailComposing(false);
                          }}
                          style={{
                            background: isSelected ? '#fefbeb' : '#ffffff',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '18px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            boxShadow: isSelected ? '0 4px 20px rgba(0, 113, 227, 0.15)' : '0 2px 12px rgba(0,0,0,0.04)',
                            position: 'relative',
                            width: '100%'
                          }}
                          className="hover-scale-mini"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? '#b45309' : '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {parsed.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#86868b', flexShrink: 0 }}>
                              {new Date(ann.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </div>
                          </div>
                          
                          <div style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            color: '#64748b', 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical', 
                            overflow: 'hidden',
                            lineHeight: 1.4
                          }}>
                            {parsed.message}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', width: '100%' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 600, 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              background: '#f5f5f7',
                              color: '#86868b'
                            }}>
                              {parsed.target_type === 'all' ? 'Alle' : parsed.target_type === 'students' ? 'Schüler' : parsed.target_type === 'teachers' ? 'Lehrer' : 'Auswahl'}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              👁️ {readCount}{totalTarget > 0 ? `/${totalTarget}` : ''}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Mail Details / Composer (2/3rds width) */}
              <div className="glass-panel" style={{ 
                background: 'white', 
                borderRadius: '24px', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                border: '1px solid #f1f5f9',
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
              }}>
                {isMailComposing ? (
                  /* COMPOSE MODE */
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await handlePostAnnouncement(e);
                      setIsMailComposing(false);
                      setSelectedMailMessage(null);
                    }} 
                    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                  >
                    {/* Compose Header */}
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f', margin: '0' }}>Neue Mitteilung verfassen</h3>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#86868b', marginTop: '2px' }}>Sende eine Benachrichtigung an deine Groovelab Community</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsMailComposing(false);
                            setAnnouncementTitle('');
                            setAnnouncementMessage('');
                            setAnnouncementTarget('all');
                            setSelectedTargetUserIds([]);
                          }}
                          style={{ 
                            background: 'transparent', 
                            color: '#64748b', 
                            border: 'none', 
                            padding: '10px 20px', 
                            borderRadius: '20px', 
                            fontWeight: 600, 
                            cursor: 'pointer' 
                          }}
                          className="hover-scale-mini"
                        >
                          Verwerfen
                        </button>
                        <button 
                          type="submit" 
                          style={{ 
                            background: '#fbbc05', 
                            color: '#1e293b', 
                            border: 'none', 
                            padding: '10px 24px', 
                            borderRadius: '20px', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(251, 188, 5, 0.2)'
                          }}
                          className="hover-scale-mini"
                        >
                          <Zap size={16} />
                          Absenden
                        </button>
                      </div>
                    </div>
                    
                    {/* Compose Fields Container */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Recipient Field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>An (Empfänger)</label>
                        <select 
                          value={announcementTarget} 
                          onChange={e => {
                            setAnnouncementTarget(e.target.value as any);
                            setSelectedTargetUserIds([]);
                          }}
                          style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#f5f5f7', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', outline: 'none', color: '#1d1d1f' }}
                        >
                          <option value="all">Alle Schüler & Lehrer</option>
                          <option value="students">Nur Schüler</option>
                          <option value="teachers">Nur Lehrer</option>
                          <option value="specific">Einzelne Profile auswählen...</option>
                        </select>
                      </div>

                      {/* Specific target profiles */}
                      {announcementTarget === 'specific' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                              placeholder="Empfänger suchen..." 
                              value={recipientSearchText} 
                              onChange={e => setRecipientSearchText(e.target.value)}
                              style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                            />
                          </div>
                          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                            {schoolUsers
                              .filter(u => {
                                const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                                return fullName.includes(recipientSearchText.toLowerCase()) && u.id !== user.id;
                              })
                              .map(u => {
                                const isChecked = selectedTargetUserIds.includes(u.id);
                                return (
                                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px', borderRadius: '10px', background: isChecked ? '#3b82f608' : 'transparent', border: isChecked ? '1px solid #3b82f620' : '1px solid transparent', transition: 'all 0.2s' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedTargetUserIds(selectedTargetUserIds.filter(id => id !== u.id));
                                        } else {
                                          setSelectedTargetUserIds([...selectedTargetUserIds, u.id]);
                                        }
                                      }}
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                                      {u.photo_url ? <StudioAvatar src={u.photo_url} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>{u.first_name?.[0] || 'U'}</div>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{u.first_name} {u.last_name || ''}</div>
                                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: u.role === 'student' ? '#3b82f6' : '#10b981', textTransform: 'uppercase' }}>
                                        {u.role === 'student' ? 'Schüler' : 'Lehrer'}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textAlign: 'right' }}>
                            {selectedTargetUserIds.length} ausgewählt
                          </div>
                        </div>
                      )}

                      {/* Subject Field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Betreff</label>
                        <input 
                          required 
                          placeholder="Betreffzeile eintragen..." 
                          value={announcementTitle} 
                          onChange={e => setAnnouncementTitle(e.target.value)} 
                          style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#f5f5f7', fontWeight: 600, fontSize: '0.95rem', outline: 'none', color: '#1d1d1f' }} 
                        />
                      </div>

                      {/* Message Body Field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inhalt</label>
                        <textarea 
                          required 
                          placeholder="Schreibe deine Nachricht hier..." 
                          value={announcementMessage} 
                          onChange={e => setAnnouncementMessage(e.target.value)} 
                          style={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: 'none', 
                            background: '#f5f5f7', 
                            fontWeight: 500, 
                            fontSize: '0.95rem', 
                            resize: 'none',
                            flex: 1,
                            outline: 'none',
                            lineHeight: 1.6,
                            color: '#1d1d1f'
                          }} 
                        />
                      </div>
                    </div>
                  </form>
                ) : selectedMailMessage ? (
                  /* MAIL VIEW MODE */
                  (() => {
                    let parsed;
                    try {
                      parsed = JSON.parse(selectedMailMessage.content);
                    } catch (e) {
                      parsed = {
                        title: 'Mitteilung',
                        message: selectedMailMessage.content,
                        target_type: 'all',
                        target_user_ids: []
                      };
                    }

                    let totalTarget = 0;
                    if (parsed.target_type === 'all') totalTarget = schoolUsers.length;
                    else if (parsed.target_type === 'students') totalTarget = schoolUsers.filter(u => u.role === 'student').length;
                    else if (parsed.target_type === 'teachers') totalTarget = schoolUsers.filter(u => u.role === 'teacher' || u.role === 'admin').length;
                    else if (parsed.target_type === 'specific') totalTarget = parsed.target_user_ids?.length || 0;

                    const readCount = selectedMailMessage.read_by?.length || 0;
                    const dateFormatted = new Date(selectedMailMessage.created_at).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Mail View Header */}
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 900, 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              background: parsed.target_type === 'all' ? '#e0f2fe' : parsed.target_type === 'students' ? '#dbeafe' : parsed.target_type === 'teachers' ? '#dcfce7' : '#f3e8ff',
                              color: parsed.target_type === 'all' ? '#0369a1' : parsed.target_type === 'students' ? '#1d4ed8' : parsed.target_type === 'teachers' ? '#15803d' : '#7e22ce'
                            }}>
                              {parsed.target_type === 'all' ? 'ALLE' : parsed.target_type === 'students' ? 'SCHÜLER' : parsed.target_type === 'teachers' ? 'LEHRER' : 'EINZELNE'}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              👁️ Gelesen von {readCount} von {totalTarget}
                            </span>
                          </div>
                          
                          <button
                            onClick={async () => {
                              if (window.confirm('Möchtest du diese Mitteilung wirklich unwiderruflich löschen?')) {
                                await handleDeleteAnnouncement(selectedMailMessage.id);
                                setSelectedMailMessage(null);
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '8px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 800,
                              fontSize: '0.85rem'
                            }}
                            className="hover-scale"
                          >
                            <Trash2 size={16} /> Mitteilung löschen
                          </button>
                        </div>
                        
                        {/* Mail View Content Card */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', margin: '0 0 24px 0', lineHeight: 1.2 }}>
                            {parsed.title}
                          </h1>
                          
                          {/* Sender Row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '32px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                              <StudioAvatar src={user?.photo_url} user={user} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>
                                {user.role === 'student' ? user.first_name : `${user.first_name} ${user.last_name || ''}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
                                {dateFormatted}
                              </div>
                            </div>
                          </div>
                          
                          {/* Mail Text Body */}
                          <div style={{ 
                            fontSize: '1.05rem', 
                            lineHeight: 1.8, 
                            color: '#334155', 
                            whiteSpace: 'pre-wrap', 
                            fontWeight: 500,
                            letterSpacing: '-0.01em'
                          }}>
                            {parsed.message}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* EMPTY PLACEHOLDER STATE */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', textAlign: 'center', background: '#f8fafc' }}>
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      background: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
                      marginBottom: '24px'
                    }}>
                      <Mail size={36} style={{ strokeWidth: 1.5, color: '#fbbc05' }} />
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Willkommen im Postfach</h3>
                    <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '360px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                      Wähle eine Mitteilung aus der Liste aus, um die Lesedetails anzuzeigen, oder schreibe eine neue Nachricht an deine Community.
                    </p>
                    <button
                      onClick={() => setIsMailComposing(true)}
                      style={{
                        background: '#fbbc05',
                        color: '#1e293b',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(251, 188, 5, 0.2)'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={16} /> Neue Mitteilung verfassen
                    </button>
                  </div>
                )}
              </div>
            </div>
            </ErrorBoundary>
          ))
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'white', padding: '10px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <button
                    onClick={() => setPracticeAlphaFilter(null)}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !practiceAlphaFilter ? brandColor : '#f8fafc', color: !practiceAlphaFilter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', minWidth: '50px' }}
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
                        transition: 'all 0.2s'
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
            <section className="exercises-section animation-slide-up" style={{ padding: '24px' }}>
              <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                    <div style={{ color: '#10b981' }}><Award size={32} /></div>
                    Dein Repertoire
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Hier sind deine Meisterleistungen. Du hast diese Songs zu 100% gemeistert!</p>
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
                    <div key={group.song_id} className="glass-panel" style={{ padding: '14px 18px', background: 'white', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', lineHeight: 1 }}>{group.artist}</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>{group.title}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', color: '#10b981', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          <Award size={12} /> 100%
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {group.skills.map((s: any) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                            {APP_INSTRUMENT_ICONS[s.instrument as keyof typeof APP_INSTRUMENT_ICONS]} {s.instrument}
                          </div>
                        ))}
                      </div>

                      <div style={{ background: '#10b981', height: '4px', borderRadius: '2px', width: '100%', marginBottom: '6px' }}></div>
                      <div style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Du bist bereit für eine Band
                      </div>
                      
                      {group.skills.some((s: any) => s.verified_by) && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Expertise-Check</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {group.skills.filter((s: any) => s.verified_by).map((s: any) => (
                                <div key={s.id} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} color="#10b981" strokeWidth={3} />
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
            <section className="exercises-section glass-panel animation-slide-up" style={{ margin: '24px', padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                      <div style={{ color: '#f59e0b' }}><Users size={32} /></div>
                      Band Matching
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Finde deine Mitmusiker für deine 100% Songs!</p>
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
                          padding: '10px 20px', borderRadius: '12px', border: 'none', 
                          background: matchingLevelFilter === btn.id ? 'white' : 'transparent', 
                          color: matchingLevelFilter === btn.id ? '#1e293b' : '#64748b', 
                          fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
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
                          padding: '24px 32px', 
                          border: '1px solid #f1f5f9',
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          boxShadow: isExpanded ? '0 10px 30px rgba(0,0,0,0.03)' : '0 4px 15px rgba(0,0,0,0.01)', 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          cursor: 'pointer', transition: 'all 0.2s', zIndex: 1
                        }}>
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

                      {isExpanded && (
                        <div style={{ 
                          padding: '32px', 
                          background: '#f8fafc', 
                          borderRadius: '0 0 24px 24px', 
                          border: '1px solid #f1f5f9', 
                          borderTop: 'none',
                          boxShadow: 'inset 0 10px 10px -10px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                                      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                      border: '1px solid #a7f3d0',
                                      padding: '20px 24px',
                                      borderRadius: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
                                      gap: '16px',
                                      marginBottom: '20px',
                                      animation: 'slideUp 0.3s ease-out'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ background: '#10b981', color: 'white', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
                                          <CheckCircle size={24} />
                                        </div>
                                        <div>
                                           <div style={{ fontSize: '1rem', fontWeight: 900, color: '#065f46', marginBottom: '2px' }}>
                                             Du spielst bereits {myInstrument} in der Band "{activeBandForSong.name}" für diesen Song! 🚀
                                           </div>
                                           <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', opacity: 0.85 }}>
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
                                    background: isProposal ? 'linear-gradient(135deg, #1e1b4b, #0f0728)' : (isGuestSearch ? '#0f172a' : (isMySlot ? '#f0f9ff' : '#f8fafc')), 
                                    border: isProposal ? '2px dashed #a855f7' : (isGuestSearch ? '1px solid rgba(255,255,255,0.1)' : (isMySlot ? '2px solid #3b82f6' : '1px solid #e2e8f0')),
                                    borderRadius: '24px', padding: '24px',
                                    boxShadow: isGuestSearch ? '0 10px 25px -5px rgba(0,0,0,0.3)' : 'none'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                          fontSize: '0.75rem', 
                                          fontWeight: 950, 
                                          color: isProposal ? '#a855f7' : (isGuestSearch ? '#a855f7' : (isMySlot ? '#3b82f6' : (form.isInitial ? '#ca8a04' : '#64748b'))), 
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
                                    style={{ background: form.originBand ? '#8b5cf6' : '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
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

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', flex: 1 }}>
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
                                        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px', position: 'relative' }}>
                                          <div style={{ 
                                            width: '64px', height: '64px', borderRadius: '18px', 
                                            background: member ? (isGuestSearch ? 'rgba(255,255,255,0.05)' : 'white') : (isGuestSearch ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), 
                                            border: (isMe || member?.isMastered) ? `3px solid #ef4444` : (member ? (isGuestSearch ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0') : '2px dashed #cbd5e1'),
                                            boxShadow: isMe ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                            filter: member && !member.isMastered ? 'grayscale(100%)' : 'none',
                                            opacity: member && !member.isMastered ? 0.6 : 1
                                          }}>
                                            {member ? (
                                              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                <img 
                                                  src={member.photo_url || '/avatar_ghost.jpg'} 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudentForPreview(member);
                                                  }}
                                                  style={{ width: '100%', height: '100%', borderRadius: '15px', objectFit: 'cover', cursor: 'pointer' }} 
                                                  alt="" 
                                                />
                                                {member.isMastered && (
                                                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#22c55e', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10 }}>
                                                    <CheckCircle size={12} strokeWidth={4} />
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: '1.5rem', opacity: 0.2 }}>{APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS] || '❓'}</div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: member ? (isGuestSearch ? 'white' : '#1e293b') : (isGuestSearch ? 'rgba(255,255,255,0.3)' : '#94a3b8'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                              {member ? member.first_name : instLabel}
                                            </div>
                                            {member && (
                                              <div style={{ fontSize: '0.45rem', fontWeight: 800, color: isGuestSearch ? 'rgba(255,255,255,0.3)' : '#94a3b8', textTransform: 'uppercase' }}>
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
                                    background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', 
                                    color: '#b45309', borderRadius: '20px', fontWeight: 900, textAlign: 'center',
                                    border: '1px solid #fde68a',
                                    boxShadow: '0 8px 20px rgba(245,158,11,0.1)',
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
                                        if (!foundingName) setFoundingName(generateRandomBandName());
                                      }}
                                      className="hero-cta-artistic"
                                      style={{ 
                                        padding: '20px', 
                                        borderRadius: '20px', 
                                        fontSize: '1.1rem', 
                                        width: '100%', 
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                        color: 'white',
                                        border: 'none',
                                        boxShadow: '0 15px 30px rgba(15,23,42,0.2)'
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
            <section className="exercises-section glass-panel animation-slide-up" style={{ margin: '24px', padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                  <div style={{ color: '#3b82f6' }}><Box size={32} /></div>
                  Bands
                </h2>
              </div>

              {/* Band-Finder Sidebar */}
              <div style={{ display: 'grid', gridTemplateColumns: width < 1200 ? '1fr' : '1fr 380px', gap: '32px' }}>
                  {/* Left Column: Band Management */}
                  <div style={{ minWidth: 0 }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '6px', borderRadius: '20px', width: 'fit-content', marginBottom: '24px' }}>
                      <button 
                        onClick={() => setActiveBandSubTab('meine')}
                        style={{ padding: '12px 24px', borderRadius: '16px', border: 'none', background: activeBandSubTab === 'meine' ? 'white' : 'transparent', color: activeBandSubTab === 'meine' ? '#1e293b' : '#64748b', fontWeight: 800, cursor: 'pointer', boxShadow: activeBandSubTab === 'meine' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                      >
                        Meine Bands
                      </button>
                      <button 
                        onClick={() => setActiveBandSubTab('alle')}
                        style={{ padding: '12px 24px', borderRadius: '16px', border: 'none', background: activeBandSubTab === 'alle' ? 'white' : 'transparent', color: activeBandSubTab === 'alle' ? '#1e293b' : '#64748b', fontWeight: 800, cursor: 'pointer', boxShadow: activeBandSubTab === 'alle' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                      >
                        Alle Bands
                      </button>
                    </div>

                    {activeBandSubTab === 'alle' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                        <div style={{ position: 'relative', maxWidth: '600px' }}>
                          <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input 
                            type="text"
                            placeholder="Nach Bands suchen..."
                            value={bandSearchText}
                            onChange={(e) => setBandSearchText(e.target.value)}
                            style={{ width: '100%', padding: '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, background: 'white' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <button
                            onClick={() => setBandSearchLetter(null)}
                            style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: !bandSearchLetter ? brandColor : '#f1f5f9', color: !bandSearchLetter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Alle
                          </button>
                          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                            <button
                              key={letter}
                              onClick={() => setBandSearchLetter(letter)}
                              style={{ padding: '8px 12px', borderRadius: '12px', border: 'none', background: bandSearchLetter === letter ? brandColor : '#f1f5f9', color: bandSearchLetter === letter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
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
                                background: 'white', padding: '24px', borderRadius: '32px', border: '1px solid #f1f5f9',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                {renderBandAvatar(band.name, band.photo_url, '80px', '24px')}
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{band.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: brandColor }}>{band.genre || 'Bandprojekt'}</span>
                                      <span style={{ color: '#cbd5e1' }}>•</span>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>{uniqueMembersList.length} Mitglieder</span>
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
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
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
                                <div style={{ textAlign: 'center', padding: '10px', background: '#f0fdf4', borderRadius: '12px', color: '#10b981', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
                                      background: isFull ? '#f1f5f9' : '#10b981', 
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
                                            const { data } = await supabase.from('users').select('*').eq('is_external_vocalist', true).eq('school_id', user.school_id);
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
            <section className="exercises-section animation-slide-up" style={{ padding: '24px' }}>
              <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                    <Library size={32} color={brandColor} />
                    Songbibliothek
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Entdecke neue Songs und füge sie deinem Üben-Board hinzu.</p>
                </div>

              {/* Search and Alpha Filter Navigation */}
              <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Text Search */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text"
                      placeholder={`Suche nach ${librarySearchType === 'title' ? 'Songtitel' : 'Interpret'}...`}
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}
                    />
                  </div>

                  {/* Toggle Search Type */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px' }}>
                    <button 
                      onClick={() => setLibrarySearchType('title')}
                      style={{ 
                        padding: '10px 20px', borderRadius: '10px', border: 'none', 
                        background: librarySearchType === 'title' ? 'white' : 'transparent', 
                        color: librarySearchType === 'title' ? brandColor : '#64748b', 
                        fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                        boxShadow: librarySearchType === 'title' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Song
                    </button>
                    <button 
                      onClick={() => setLibrarySearchType('artist')}
                      style={{ 
                        padding: '10px 20px', borderRadius: '10px', border: 'none', 
                        background: librarySearchType === 'artist' ? 'white' : 'transparent', 
                        color: librarySearchType === 'artist' ? brandColor : '#64748b', 
                        fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                        boxShadow: librarySearchType === 'artist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Interpret
                    </button>
                  </div>
                </div>

                {/* Alphabet Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'white', padding: '10px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <button
                    onClick={() => setLibraryAlphaFilter(null)}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !libraryAlphaFilter ? brandColor : '#f8fafc', color: !libraryAlphaFilter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', minWidth: '50px' }}
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
                        transition: 'all 0.2s'
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
                      '3': '#10b981', // Emerald
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
                          padding: '24px', 
                          background: 'white', 
                          border: '1px solid #f1f5f9',
                          borderLeft: `8px solid ${levelColor}`, 
                          borderRadius: '24px',
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          gap: '24px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                          {/* Music Icon Rounded Box */}
                          <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            borderRadius: '18px', 
                            background: iconBg, 
                            border: `1px solid ${iconBorder}`, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Music size={28} color={iconColor} />
                          </div>

                          {/* Text Info */}
                          <div style={{ flex: 1 }}>
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
                              fontSize: '1.4rem', 
                              fontWeight: 950, 
                              color: '#0f172a', 
                              marginTop: '4px',
                              lineHeight: 1.2
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
                        <div style={{ flexShrink: 0 }}>
                          {userSongs.some(us => us.song_id === song.id) ? (
                            <div style={{ 
                              background: '#f0fdf4', 
                              border: '1px solid #bbf7d0', 
                              padding: '12px 24px', 
                              borderRadius: '16px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              color: '#166534', 
                              fontWeight: 900, 
                              fontSize: '0.85rem' 
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
            <div style={{ width: '100px', height: '100px', borderRadius: '35px', background: '#dcfce7', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 10px 30px rgba(34, 197, 94, 0.2)' }}>
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Wie soll eure Band heißen?
                    </label>
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
                        onFocus={e => e.currentTarget.style.borderColor = brandColor}
                        onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                      />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFoundingName(generateRandomBandName()); }}
                        style={{ 
                          position: 'absolute', 
                          right: '8px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          background: '#f8fafc', 
                          border: '1px solid #cbd5e1', 
                          color: brandColor, 
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
                                background: isSelected ? `linear-gradient(135deg, ${brandColor}18, ${brandColor}08)` : 'white',
                                border: isSelected ? `2.5px solid ${brandColor}` : '2px solid #e2e8f0',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                                boxShadow: isSelected ? `0 8px 24px ${brandColor}30` : '0 2px 8px rgba(0,0,0,0.06)',
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
                                  background: brandColor,
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
                                    border: isSelected ? `3px solid ${brandColor}` : '3px solid #e2e8f0',
                                    transition: 'border 0.2s'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '52px',
                                  height: '52px',
                                  borderRadius: '50%',
                                  background: isSelected ? `linear-gradient(135deg, ${brandColor}, #d97706)` : 'linear-gradient(135deg, #94a3b8, #64748b)',
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
                                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? brandColor : '#1e293b', transition: 'color 0.2s' }}>
                                  {t.first_name}
                                </div>
                                {t.last_name && (
                                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: isSelected ? `${brandColor}cc` : '#64748b', transition: 'color 0.2s' }}>
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
                    background: `linear-gradient(135deg, ${brandColor}, #d97706)`, 
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
                    boxShadow: `0 10px 20px ${brandColor}25`,
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


      {/* Modal: Sicherer PDF-Viewer */}
      {activePdfFolderUrl && activePdfSong && (
        <SecurePdfViewerModal 
          song={activePdfSong} 
          folderUrl={activePdfFolderUrl} 
          onClose={() => {
            setActivePdfFolderUrl(null);
            setActivePdfSong(null);
          }} 
        />
      )}

      {/* Modal: QR Code anzeigen */}
      {showQR && user?.qr_token && (
        <QRCodeModal user={user} activePlatform={activePlatform} onClose={() => setShowQR(false)} />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowPrivacy(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Datenschutzerklärung</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GrooveLab DSGVO Compliance</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>1. Allgemeine Hinweise und Pflichtinformationen</h4>
                <p style={{ margin: 0 }}>Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. GrooveLab speichert Daten zur Bereitstellung der Übungs- und Klassenzimmerplattform nach den Vorgaben der DSGVO. Zur Einhaltung der Datenminimierung werden Nachnamen von Schülern standardmäßig anonymisiert (nur die Initiale wird gespeichert, z.B. Max M.).</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>2. Kamera & QR-Scanner</h4>
                <p style={{ margin: 0 }}>Die Kamera deines Endgeräts wird ausschließlich lokal im Browser verwendet, um deinen GrooveLab-QR-Ausweis zu scannen. Es werden zu keinem Zeitpunkt Videostreams oder Bilder an Server übertragen oder dort gespeichert.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>3. Standortermittlung (Geofencing)</h4>
                <p style={{ margin: 0 }}>GrooveLab prüft beim Einloggen kurz deinen Gerätestandort (GPS), um sicherzustellen, dass du dich im GrooveLab-Raum der Musikschule befindest. Diese Standortdaten werden rein lokal in deinem Browser berechnet und nicht an Server übertragen. In der Datenbank wird lediglich ein Bestätigungswert (Erfolgreich/Fehlgeschlagen) für deine aktive Session hinterlegt. Ein kontinuierliches Bewegungsprofil wird nicht erstellt.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>4. Rechte der Betroffenen</h4>
                <p style={{ margin: 0 }}>Sie haben das Recht auf Auskunft, Berichtigung, Sperrung oder Löschung Ihrer Daten. Wenden Sie sich hierzu bitte an die Schulleitung Ihrer Musikakademie.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>5. Hosting & Datenbank-Infrastruktur</h4>
                <p style={{ margin: 0 }}>Unsere Anwendung wird auf Servern in Deutschland gehostet, um einen sicheren, performanten und datenschutzkonformen Betrieb zu gewährleisten. Sowohl das Web-Frontend als auch die Datenbankinfrastruktur werden über die <strong>Hetzner Online GmbH</strong> (Hetzner.com) betrieben. Mit diesem Dienstleister wurde ein gesetzeskonformer Vertrag zur Auftragsverarbeitung (AV-Vertrag nach Art. 28 DSGVO) geschlossen, um den Schutz Ihrer Daten zu jeder Zeit im Einklang mit der DSGVO zu gewährleisten.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AGB Modal */}
      {showAgb && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowAgb(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <FileText size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Allgemeine Geschäftsbedingungen</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutzungsbedingungen SaaS-Plattform „Campus-Groovelab“</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Vertragspartner und Anbieter:</p>
                <p style={{ margin: '4px 0 0 0' }}>Simplified Work GbR, Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, nachfolgend „Anbieter“</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  <strong>Geltungsbereich:</strong> Ausschließlich für den unternehmerischen Geschäftsverkehr (B2B)<br/>
                  <strong>Stand und Gültigkeit:</strong> August 2026
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>📋 PRÄAMBEL</h4>
                <p style={{ margin: 0 }}>Der Anbieter betreibt und vertreibt die mandantenfähige, cloudbasierte Software-as-a-Service (SaaS)-Plattform „Campus-Groovelab“ (bestehend aus den Modulen „Campus“ und „GrooveLab“, nachfolgend einheitlich „Software“). Die Software dient als integriertes, digitales, jedoch rein komplementäres Zusatz- und Kommunikationssystem (Add-On) für Musikschulen zur Optimierung des Lehrbetriebs, der organisatorischen Infrastruktur sowie zur pädagogischen Lernbegleitung mittels Gamification-Elementen.</p>
                <p style={{ margin: '8px 0 0 0' }}>Die Software-Lizenz selbst wird dem Kunden dauerhaft zu 100 % kostenlos und lizenzgebührenfrei zur Verfügung gestellt. Der Kunde entrichtet das vertraglich vereinbarte Entgelt ausschließlich für den Server-Betrieb, die Service-Bereitstellung, das Hosting, die Härtung der Datenbank-Infrastruktur sowie für die administrativen Service-, Support- und Betriebsleistungen (nachfolgend „Server- & Servicegebühren“) durch den Anbieter.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>Souveränitäts-Versprechen (100 % Made & Hosted in Germany):</strong> Die technische Bereitstellung dieser Infrastruktur erfolgt über gehärtete Systeme auf in Deutschland befindlichen, ISO-27001-zertifizierten Servern. Der Anbieter garantiert, dass zu keinem Zeitpunkt US-amerikanische oder sonstige außereuropäische Cloud-Infrastrukturen (wie z. B. AWS, Microsoft Azure oder Google Cloud) für die Kern-Datenhaltung verwendet werden.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 1 VERTRAGSGEGENSTAND, LEISTUNGSUMFANG & ÜBERGABEPUNKT</h4>
                <p style={{ margin: 0 }}><strong>1. Vertragsgegenstand:</strong> Gegenstand dieses Vertrages ist die dauerhaft kostenlose (lizenzgebührenfreie) Bereitstellung der Software zur Nutzung über das Internet im Wege des Software-as-a-Service (SaaS)-Modells sowie die Einräumung der entsprechenden Nutzungsrechte nach Maßgabe dieses Vertrages. Die vom Kunden zu entrichtende Vergütung versteht sich ausdrücklich und ausschließlich als Entgelt für den Server-Betrieb und die Service-Bereitstellung (Infrastruktur-Leistung) sowie für die vereinbarten laufenden Service-, Betriebs- und Wartungsleistungen des Anbieters. Das Vertragsverhältnis über die Server- und Servicebereitstellung qualifiziert sich rechtlich als gemischter Miet- und Dienstleistungsvertrag gemäß §§ 535 ff., 611 BGB.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Leistungsumfang:</strong> Der genaue Funktionsumfang der Software sowie die Spezifikationen der Server-Infrastruktur und Serviceleistungen ergeben sich aus der zum Zeitpunkt des Vertragsabschlusses gültigen Produkt- und Leistungsbeschreibung. Schulungen, individueller Support vor Ort, Datenmigrationen oder kundenspezifische Programmierungen sind nicht geschuldet, es sei denn, sie wurden ausdrücklich als kostenpflichtige Zusatzleistung vereinbart.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Übergabepunkt:</strong> Der Anbieter stellt dem Kunden die Software am Ausgang des vom Anbieter genutzten Rechenzentrums (Schnittstelle zum öffentlichen Internet, nachfolgend „Übergabepunkt“) zur Nutzung auf den bereitgestellten Servern bereit. Für die Netzanbindung des Kunden, die Bereitstellung geeigneter Endgeräte sowie die Beschaffung kompatibler Browser-Software ist ausschließlich der Kunde verantwortlich.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Add-On-Status & Führendes System:</strong> Die Software versteht sich ausdrücklich als komplementäres Zusatz- und Kommunikationswerkzeug (Add-On) und ersetzt nicht das primäre Verwaltungs- und ERP-System des Kunden (wie z. B. iMikel, nachfolgend „führendes System“). Der Kunde bleibt uneingeschränkt verpflichtet, alle grundlegenden und rechtsverbindlichen Verwaltungsakte, die vertragliche Abrechnung, die Stammdatenpflege sowie die finale Stundenplan- und Raumbelegung eigenständig in seinem führenden System zu pflegen und zu verwalten. Die Software dient lediglich der operativen Erleichterung und Visualisierung im Alltag von Verwaltung, Lehrkräften und Endnutzern.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 2 SPEZIFISCHE SCHNITTSTELLEN- & LEISTUNGSPATHEN</h4>
                <p style={{ margin: 0 }}><strong>1. iMikel-CSV-Schnittstelle & Import-Spezifikationen:</strong> Der Anbieter stellt dem Kunden im Rahmen seiner Serviceleistungen ein Import-Modul zur Einlesung von CSV-Stammdaten aus Altsystemen (z. B. iMikel) zur Verfügung. Die Datenerfassung erfolgt über ein dafür vorgesehenes Textfeld innerhalb der Benutzeroberfläche der Software, in welches der Kunde die Rohdaten mittels Kopieren und Einfügen (Copy-and-Paste) überträgt. Der Kunde ist verpflichtet, die Textdaten vorab auf Formatkompatibilität zu prüfen. Der Kunde trägt die alleinige Verantwortung dafür, dass die eingefügten Textdaten dem geforderten CSV-Format entsprechen sowie frei von manipulativen Inhalten oder schädlichen Skripten sind.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>Transaktionales Rollback-Verfahren:</strong> Das System arbeitet mit einer transaktionalen Absicherung. Tritt während der Verarbeitung des eingefügten CSV-Textes ein Daten- oder Formatfehler auf, wird die gesamte Import-Transaktion automatisch abgebrochen und der vorherige, konsistente Datenbankzustand wiederhergestellt (Rollback). Eine Haftung des Anbieters für Mehraufwände durch fehlerhaft formatierte Importdaten ist ausgeschlossen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Kalender-Kopplung & iCal-Schnittstelle:</strong> Die Software ermöglicht es Endnutzern, personalisierte, abonnierbare Kalender-Feeds (.ics) in externen Kalender-Anwendungen (z. B. Apple Calendar, Google Calendar) einzubinden. Um die Privatsphäre minderjähriger Schüler bei der Übertragung von iCal-Links über unverschlüsselte Kalender-Protokolle zu sichern, werden Schülernamen im exportierten Kalendertext automatisch pseudonymisiert (z. B. „J. M. Musikschule“ statt „Jonas Müller“). Der Kunde wird darauf hingewiesen, dass iCal-Feeds auf dem Pull-Prinzip basieren. Die Synchronisations- und Aktualisierungsfrequenz wird ausschließlich durch das Endgerät bzw. den Kalender-Provider des Endnutzers bestimmt. Der Anbieter haftet nicht für verspätete oder fehlerhafte Darstellungen von Terminänderungen im Kalender des Endnutzers.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 3 AUTHENTIFIZIERUNG, DIEBSTAHLSCHUTZ & COMPLIANCE</h4>
                <p style={{ margin: 0 }}><strong>1. Passwortlose QR-Code-Authentifizierung:</strong> Der Zugang für Endnutzer erfolgt passwortlos über eine eindeutige URL, die als scanbarer QR-Code verschlüsselt ist. Der Kunde verpflichtet sich, seine Lehrkräfte und Mitarbeiter im sorgsamen Umgang mit den QR-Codes zu schulen. Die QR-Codes dürfen ausschließlich den jeweils berechtigten Endnutzern persönlich oder durch Aufkleben auf das physische Noten-/Hausaufgabenheft zur Verfügung gestellt werden.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Zweistufige Verifikations-Schranke (Anti-Theft Device-Pairing):</strong> Um unbefugten Zugriff auf personenbezogene Logistik- und Schülerdaten bei physischem Verlust des QR-Codes auszuschließen, erzwingt die Software beim Aufruf auf einem neuen, nicht registrierten Endgerät die Eingabe eines dem Endnutzer bekannten, schülerbezogenen Sicherheitsmerkmals (PIN) als einmaligen Freischalt-Code. Nach erfolgreicher Eingabe wird auf dem Endgerät ein kryptografischer Schlüssel zur permanenten Autorisierung hinterlegt (Device-Pairing), wodurch nachfolgende Scans ohne erneute Code-Eingabe ermöglicht werden. Der Kunde ist verpflichtet, seine Endnutzer darüber zu informieren, dass bei Verlust des physischen QR-Codes oder des registrierten Endgeräts unverzüglich eine Sperrung des Tokens über das Lehrer-Cockpit oder die Verwaltung zu veranlassen ist. Der Anbieter sperrt den betroffenen Token in Echtzeit nach Eingang der Sperraufforderung im System.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 4 DATENSCHUTZ UND GEHEIMHALTUNG (DSGVO)</h4>
                <p style={{ margin: 0 }}><strong>1. Rollenverteilung:</strong> Die Parteien stimmen überein, dass der Kunde im Sinne des Art. 4 Nr. 7 DSGVO „Verantwortlicher“ für die Verarbeitung personenbezogener Daten der Endnutzer ist. Der Anbieter verarbeitet diese Daten ausschließlich im Auftrag und auf Weisung des Kunden als „Auftragsverarbeiter“ im Sinne des Art. 4 Nr. 8 DSGVO.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. AV-Vertrag:</strong> Die Einzelheiten der Datenverarbeitung werden in einer gesonderten Vereinbarung über die Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO geregelt, die bei Vertragsabschluss zwingend zu unterzeichnen ist.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Schülerdaten-Fragment-Prinzip (Privacy by Design):</strong> Der Anbieter betreibt die Softwarearchitektur so, dass identifizierende Klarnamen der Schüler physisch isoliert auf dem deutschen Host-System verarbeitet werden. Systembenachrichtigungen (z. B. Push-Mitteilungen) werden verschlüsselt und fragmentiert übertragen, sodass Dritte zu keinem Zeitpunkt Einblick in vollständige Klarnamen oder Unterrichtsinhalte erhalten.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Lokaler Kommunikations-Workflow (Zero-Mail-Infrastruktur):</strong> Da der Anbieter zum Schutz personenbezogener Daten auf die Einbindung externer E-Mail-Versanddienstleister verzichtet, erfolgt der Versand administrativer Korrespondenzen (z. B. Benachrichtigungen an Eltern) lokal über das E-Mail-Programm des Kunden via mailto:-Protokoll, wodurch der Anbieter vollständig von der datenschutzrechtlichen Haftung für den Mail-Transport befreit ist.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>5. Anti-CLOUD-Act-Garantie:</strong> Der Anbieter garantiert dem Kunden vertraglich, dass sämtliche personenbezogenen Daten ausschließlich in zertifizierten Rechenzentren auf dem Staatsgebiet der Bundesrepublik Deutschland gespeichert und verarbeitet werden. Da der Anbieter ein rein deutsches Unternehmen ohne außereuropäische Muttergesellschaften ist, unterliegt die Infrastruktur weder direkt noch indirekt den Zugriffsbefugnissen von Drittstaaten-Behörden (z. B. über den US-amerikanischen CLOUD Act).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>6. Ausschluss von Drittlandübermittlungen:</strong> Eine Übermittlung personenbezogener Daten in ein Drittland außerhalb der Europäischen Union (EU) bzw. des Europäischen Wirtschaftsraums (EWR) findet nicht statt. Der Einsatz von Subunternehmern mit Kooperationssitz oder Datenverarbeitung in einem Drittland ist für den Bereich der personenbezogenen Datenhaltung ausgeschlossen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 5 GEWÄHRLEISTUNG (MÄNGELHAFTUNG) & HAFTUNGSBEGRENZUNG</h4>
                <p style={{ margin: 0 }}><strong>1. Display-Down-Zwangstimer & Gerätesensorik:</strong> Der integrierte Übe-Timer nutzt die Lagesensoren der Endgeräte (DeviceOrientation API). Zur Vermeidung von Frustration und Drucksituationen für Kinder gewährt das System eine 15-sekündige Toleranzzeit (Grace Period) bei Lageveränderungen. Eine Gewährleistung für die korrekte Funktion des Timers auf Endgeräten, deren physikalische Sensoren fehlerhaft kalibriert sind oder deren Betriebssystem die Sensorabfrage blockiert, ist ausgeschlossen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Gesetzliche Haftungsschranken:</strong> Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer vorsätzlichen oder fahrlässigen Pflichtverletzung des Anbieters oder seiner Erfüllungsgehilfen beruhen. Für sonstige Schäden haftet der Anbieter nur bei Vorsatz oder grober Fahrlässigkeit. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht). Die Haftung bei Verletzung einer Kardinalpflicht ist auf den vertragstypischen, bei Vertragsabschluss vorhersehbaren Schaden begrenzt. Die Haftung für entgangenen Gewinn, Betriebsunterbrechungsschäden oder sonstige mittelbare Schäden des Kunden ist ausgeschlossen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 6 VERFÜGBARKEIT & AUTOMATISIERTE SICHERHEITSSPERREN</h4>
                <p style={{ margin: 0 }}><strong>1. Systemverfügbarkeit:</strong> Der Anbieter garantiert eine Verfügbarkeit der Software und Server-Infrastruktur von 99,0 % im Jahresmittel am Übergabepunkt.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Berechnungsgrundlage:</strong> Bei der Berechnung der Verfügbarkeit bleiben Zeiten außer Betracht, in denen die Software aufgrund von (a) angekündigten Wartungsarbeiten, (b) notwendigen unangekündigten Sicherheits-Updates zur Gefahrenabwehr, (c) höherer Gewalt oder (d) Störungen in der Netz-Infrastruktur des Kunden oder dessen Endnutzer nicht erreichbar ist.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Automatisierte IP-Sperren (Rate-Limiting):</strong> Zur Abwehr von Cyber-Angriffen verfügt das System über ein automatisiertes Rate-Limiting. Bei mehr als 5 fehlgeschlagenen Authentifizierungsversuchen innerhalb einer Minute auf der /qr/:token-Route wird die anfragende IP-Adresse vollautomatisch für 1 Stunde gesperrt. Derartige Sperren dienen der Datensicherheit, stellen keinen Mangel dar und begründen keinen Anspruch des Kunden auf Minderung oder Schadensersatz.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Ausfall-Fallback & Aufrechterhaltung des Kernbetriebs:</strong> Da es sich bei der Software um ein rein komplementäres Zusatzsystem (Add-On) handelt, führt ein temporärer Ausfall der Software oder der Server-Infrastruktur zu keinerlei Stilllegung der betrieblichen Kernprozesse des Kunden. Für den Fall einer temporären Nichtverfügbarkeit ist der Kunde verpflichtet, seine bewährten, klassischen Kommunikations- und Organisationskanäle (z. B. telefonische Absprachen, manuelle Stundenplanerstellung, direkter E-Mail-Versand) eigenverantwortlich als Ausweichlösung fortzuführen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 7 GAMIFICATION-ELEMENTE & PÄDAGOGISCHE RECHTE</h4>
                <p style={{ margin: 0 }}><strong>1. Pädagogische Motivationselemente:</strong> Die Software enthält spielerische Motivationselemente (XP-Punkte, Aktivitäts-Ringe, Streak-Flammen und Reaktivierungs-Quests).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Keine Gewährleistung auf Spielstände:</strong> Der Kunde und die Endnutzer haben keinen rechtlichen Anspruch auf die ununterbrochene Speicherung oder fehlerfreie Wiederherstellung von Spielständen, virtuellen Auszeichnungen, historischen Übe-Streaks oder statistischen Scores.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Anpassungsrecht:</strong> Der Anbieter behält sich das Recht vor, die spielerischen Mechanismen, mathematischen Berechnungsformeln und grafischen Darstellungen der Gamification-Infrastruktur jederzeit zwecks pädagogischer Optimierung anzupassen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 8 NUTZUNGSRECHTE & LIZENZGEBÜHRENFREIHEIT</h4>
                <p style={{ margin: 0 }}><strong>1. Nutzungsrechte:</strong> Der Anbieter räumt dem Kunden für die Laufzeit dieses Vertrages ein einfaches, nicht übertragbares, nicht unterlizensierbares und auf die Anzahl der gebuchten Schüler limitiertes Nutzungsrecht an der Software ein.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Lizenzgebührenfreiheit:</strong> Diese Einräumung des Nutzungsrechts erfolgt dauerhaft zu 100 % kostenlos und lizenzgebührenfrei. Das vom Kunden entrichtete Entgelt stellt zu keinem Zeitpunkt eine Lizenzgebühr für den Programmcode dar.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Modifikationsverbot:</strong> Dem Kunden ist es untersagt, die Software zu kopieren, zu dekompilieren, zurückzuentwickeln (Reverse Engineering) oder den Programmcode in irgendeiner Weise zu modifizieren. Sämtliche Urheber- und Leistungsschutzrechte an der Software verbleiben beim Anbieter.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 9 VERTRAGSLAUFZEIT, PREISE, ZAHLUNGSBEDINGUNGEN & KÜNDIGUNG</h4>
                <p style={{ margin: 0 }}><strong>1. Laufzeit gekoppelt an das Schuljahr:</strong> Das Vertragsverhältnis über die Server- & Servicebereitstellung ist fest an den Zyklus des Schuljahres (September bis August des Folgejahres) gebunden. Die Mindestlaufzeit beträgt ein volles Schuljahr (bzw. bei unterjährigem Einstieg die verbleibende Laufzeit bis zum nächsten 31. August).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Automatische Verlängerung:</strong> Der Vertrag verlängert sich automatisch um ein weiteres Schuljahr (12 Monate bis zum 31. August des Folgejahres), sofern er nicht mit einer Frist von 1 Monat zum Schuljahresende (d. h. spätestens bis zum 31. Juli) gekündigt wird.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Preise & Kleinunternehmerregelung:</strong> Alle angegebenen Server- & Servicegebühren sind Endpreise. Da der Anbieter als Kleinunternehmer agiert, wird gemäß § 19 UStG keine Umsatzsteuer berechnet oder ausgewiesen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Rechnungsstellung & Zahlungsfrist:</strong> Die Abrechnung der Server- & Servicegebühren erfolgt monatlich zum Monatsende. Rechnungen werden in elektronischer Form per E-Mail an die vom Kunden hinterlegte E-Mail-Adresse zugestellt. Der Rechnungsbetrag ist innerhalb von 14 Tagen nach Rechnungserhalt per manueller Banküberweisung auf das Geschäftskonto des Anbieters zu zahlen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>5. Außerordentliche Kündigung:</strong> Das Recht zur außerordentlichen Kündigung aus wichtigem Grund (§ 543 BGB) bleibt unberührt. Ein wichtiger Grund für den Anbieter liegt insbesondere vor, wenn der Kunde mit der Zahlung der Server- & Servicegebühren für zwei aufeinanderfolgende Monate in Verzug gerät.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 10 GERICHTSSTAND & SCHLUSSBESTIMMUNGEN</h4>
                <p style={{ margin: 0 }}><strong>1. Rechtswahl:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Gerichtsstand:</strong> Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist der Geschäftssitz des Anbieters (Rheinfelden).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. Die Parteien verpflichten sich, die unwirksame Bestimmung durch eine wirksame Regelung zu ersetzen, die dem wirtschaftlichen und rechtlichen Zweck der unwirksamen Bestimmung am nächsten kommt.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impressum Modal */}
      {showImpressum && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowImpressum(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <FileText size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Impressum</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesetzliche Anbieterkennzeichnung</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              {school?.opening_hours?.impressum ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {school.opening_hours.impressum}
                </div>
              ) : (
                <>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Angaben gemäß § 5 TMG / DDG</h4>
                    <p style={{ margin: 0 }}>
                      Manuel Wagner<br/>
                      Friedrichstr. 33<br/>
                      79713 Bad Säckingen
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Kontakt</h4>
                    <p style={{ margin: 0 }}>
                      Mo-Fr: 08-15 Uhr<br/>
                      Telefon: 07761 – 2416<br/>
                      E-Mail: info@musaek.de
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>EU-Streitschlichtung</h4>
                    <p style={{ margin: 0 }}>
                      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#eab308', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr/</a>.<br/>
                      Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h4>
                    <p style={{ margin: 0 }}>
                      Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Hinweis: Für die konkreten Lehrinhalte, Stundenplanungen und personenbezogenen Daten der Schüler innerhalb der einzelnen Schul-Mandanten ist die jeweilige Musikschule als Vertragspartner der Schüler verantwortlich.
                  </div>
                </>
              )}
            </div>
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

          let activeBg = 'rgba(251, 188, 5, 0.12)';
          let activeTextColor = '#b45309';

          if (activeClass === 'campus') {
            activeBg = 'rgba(52, 168, 83, 0.08)';
            activeTextColor = '#137333';
          } else if (activeClass === 'briefing') {
            activeBg = 'rgba(234, 67, 53, 0.08)';
            activeTextColor = '#ea4335';
          }

          const isCompact = windowWidth <= 600;

          return {
            display: 'flex',
            flexDirection: 'row' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCompact ? '0' : '8px',
            padding: isCompact ? '10px' : '10px 18px',
            borderRadius: '9999px',
            border: 'none',
            background: isActive ? activeBg : 'transparent',
            color: isActive ? activeTextColor : '#64748b',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
            boxShadow: 'none',
            width: isCompact ? '46px' : 'auto',
            height: isCompact ? '46px' : 'auto',
            boxSizing: 'border-box' as const
          };
        };

        const isCompact = windowWidth <= 600;

        return (
          <nav 
            className="mobile-nav" 
            style={{ 
              display: windowWidth <= 800 ? 'flex' : 'none',
              justifyContent: isCompact ? 'space-around' : 'flex-start',
              gap: isCompact ? '4px' : '12px',
              padding: isCompact ? '8px 12px 24px 12px' : '12px 16px 28px 16px'
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
                      <Monitor size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Briefing</span>}
                    </button>
                    {flamesActive && (
                      <button onClick={() => setActiveStudentTab('practice_board')} style={getMobileButtonStyle('practice_board', 'campus')} className="hover-scale" title="Übe-Pfad">
                        <Zap size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Übe-Pfad</span>}
                      </button>
                    )}
                    <button onClick={() => setActiveStudentTab('mediathek')} style={getMobileButtonStyle('mediathek', 'campus')} className="hover-scale" title="Mediathek">
                      <Library size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Mediathek</span>}
                    </button>
                    <button onClick={() => setActiveStudentTab('events')} style={getMobileButtonStyle('events', 'campus')} className="hover-scale" title="Termine">
                      <Calendar size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Termine</span>}
                    </button>
                    {showLeaderboard && (
                      <button onClick={() => setActiveStudentTab('campus_cup')} style={getMobileButtonStyle('campus_cup', 'campus')} className="hover-scale" title="Performance & Highlights">
                        <Trophy size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Performance & Highlights</span>}
                      </button>
                    )}
                    {showDetailedStats && (
                      <button onClick={() => setActiveStudentTab('flashback')} style={getMobileButtonStyle('flashback', 'campus')} className="hover-scale" title="Flashback">
                        <Clock size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Flashback</span>}
                      </button>
                    )}
                    <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'campus')} className="hover-scale" title="Profil">
                      <User size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Profil</span>}
                    </button>
                    <button onClick={() => setActiveStudentTab('settings')} style={getMobileButtonStyle('settings', 'campus')} className="hover-scale" title="Einstellungen">
                      <Settings size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Einstellungen</span>}
                    </button>
                  </>
                );
              })()
              : (
                <>
                  <button onClick={() => setActiveStudentTab('live')} style={{ ...getMobileButtonStyle('live', 'groovelab'), position: 'relative' }} className="hover-scale" title="Live Lab">
                    <Monitor size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Live Lab</span>}
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', position: 'absolute', top: isCompact ? '4px' : '6px', right: isCompact ? '4px' : '6px' }} className="animate-pulse"></div>
                  </button>
                  {!user.is_external_vocalist && (
                    <>
                      <button onClick={() => setActiveStudentTab('practice')} style={getMobileButtonStyle('practice', 'groovelab')} className="hover-scale" title="Üben">
                        <Play size={isCompact ? 20 : 18} fill={activeStudentTab === 'practice' ? 'white' : 'none'} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Üben</span>}
                      </button>
                      <button onClick={() => setActiveStudentTab('library')} style={getMobileButtonStyle('library', 'groovelab')} className="hover-scale" title="Bibliothek">
                        <Library size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Bibliothek</span>}
                      </button>
                    </>
                  )}
                  <button onClick={() => setActiveStudentTab('repertoire')} style={getMobileButtonStyle('repertoire', 'groovelab')} className="hover-scale" title="Repertoire">
                    <Award size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Repertoire</span>}
                  </button>
                  {!user.is_external_vocalist && (
                    <button onClick={() => setActiveStudentTab('matching')} style={getMobileButtonStyle('matching', 'groovelab')} className="hover-scale" title="Band-Matching">
                      <Users size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Band-Matching</span>}
                    </button>
                  )}
                  <button onClick={() => setActiveStudentTab('bands')} style={getMobileButtonStyle('bands', 'groovelab')} className="hover-scale" title="Bands">
                    <Box size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Bands</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('messages')} style={{ ...getMobileButtonStyle('messages', 'groovelab'), position: 'relative' }} className="hover-scale" title="Nachrichten">
                    <Megaphone size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Nachrichten</span>}
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
                        top: isCompact ? '2px' : '4px',
                        right: isCompact ? '0px' : '4px'
                      }}>{studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}</div>
                    )}
                  </button>
                  <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'groovelab')} className="hover-scale" title="Profil">
                    <User size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Profil</span>}
                  </button>
                </>
              )
            ) : (
              activePlatform === 'campus' ? (
                <>
                  <button onClick={() => setActiveStudentTab('live')} style={getMobileButtonStyle('live', 'campus')} className="hover-scale" title="Briefing">
                    <Monitor size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Briefing</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('schedule')} style={getMobileButtonStyle('schedule', 'campus')} className="hover-scale" title="Stundenplan">
                    <Calendar size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Stundenplan</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('students')} style={getMobileButtonStyle('students', 'campus')} className="hover-scale" title="Schüler">
                    <Users size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Schüler</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('songs')} style={getMobileButtonStyle('songs', 'campus')} className="hover-scale" title="Mediathek">
                    <Library size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Mediathek</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('rooms')} style={getMobileButtonStyle('rooms', 'campus')} className="hover-scale" title="Räume">
                    <Box size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Räume</span>}
                  </button>
                  {showMissionsFeature && (
                    <button onClick={() => setActiveStudentTab('missions')} style={getMobileButtonStyle('missions', 'campus')} className="hover-scale" title="Missions">
                      <Compass size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Missions</span>}
                    </button>
                  )}
                  <button onClick={() => setActiveStudentTab('stats')} style={getMobileButtonStyle('stats', 'campus')} className="hover-scale" title="Performance & Highlights">
                    <Trophy size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Performance & Highlights</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('setup')} style={getMobileButtonStyle('setup', 'campus')} className="hover-scale" title="Setup">
                    <Settings size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Setup</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'campus')} className="hover-scale" title="Profil">
                    <User size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Profil</span>}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveStudentTab('live')} style={{ ...getMobileButtonStyle('live', 'groovelab'), position: 'relative' }} className="hover-scale" title="Live Lab">
                    <Monitor size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Live Lab</span>}
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', position: 'absolute', top: isCompact ? '4px' : '4px', right: isCompact ? '4px' : '4px' }} className="animate-pulse"></div>
                  </button>
                  <button onClick={() => setActiveStudentTab('messages')} style={getMobileButtonStyle('messages', 'groovelab')} className="hover-scale" title="Nachrichten">
                    <Mail size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Nachrichten</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('students')} style={getMobileButtonStyle('students', 'groovelab')} className="hover-scale" title="Schüler">
                    <Users size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Schüler</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('team')} style={getMobileButtonStyle('team', 'groovelab')} className="hover-scale" title="Team">
                    <Shield size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Team</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('rooms')} style={getMobileButtonStyle('rooms', 'groovelab')} className="hover-scale" title="Räume">
                    <Box size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Räume</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('songs')} style={getMobileButtonStyle('songs', 'groovelab')} className="hover-scale" title="Songs">
                    <Library size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Songs</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('bands')} style={getMobileButtonStyle('bands', 'groovelab')} className="hover-scale" title="Bands">
                    <Box size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Bands</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('stats')} style={getMobileButtonStyle('stats', 'groovelab')} className="hover-scale" title="Statistik">
                    <Music size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Statistik</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('gallery')} style={getMobileButtonStyle('gallery', 'groovelab')} className="hover-scale" title="ID Galerie">
                    <QrCode size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>ID Galerie</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('setup')} style={getMobileButtonStyle('setup', 'groovelab')} className="hover-scale" title="Setup">
                    <Shield size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Setup</span>}
                  </button>
                  <button onClick={() => setActiveStudentTab('profile')} style={getMobileButtonStyle('profile', 'groovelab')} className="hover-scale" title="Profil">
                    <User size={isCompact ? 20 : 18} /> {!isCompact && <span style={{ marginLeft: '4px' }}>Profil</span>}
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
        <TeacherDetailModal 
          teacher={selectedTeacher} 
          onClose={() => setSelectedTeacher(null)} 
        />
      )}

      {selectedStudentProfile && (
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
          onSwitchPlatform={(newPlatform) => {
            setActivePlatform(newPlatform);
            setActiveStudentTab(newPlatform === 'campus' ? (user?.role?.toLowerCase() === 'student' ? 'briefing' : 'live') : 'live');
          }}
        />
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
                  <div style={{ fontWeight: 900, color: '#10b981' }}>Ready</div>
                </div>
              </div>
            </div>

            <button 
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
          }} className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Bandprofil bearbeiten</h2>
              <button type="button" onClick={() => setShowEditBand(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bandname</label>
                <input required value={editingBand.name} onChange={e => setEditingBand({...editingBand, name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
              </div>

              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bandcoach (Lehrer)</label>
                  <select 
                    value={editingBand.coach_id || ''} 
                    onChange={e => setEditingBand({...editingBand, coach_id: e.target.value || null})} 
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
                  >
                    <option value="">-- Kein Coach --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musikrichtung / Genre</label>
                <input value={editingBand.genre || ''} onChange={e => setEditingBand({...editingBand, genre: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} placeholder="z.B. Rock, Jazz, Pop..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Über uns</label>
                <textarea rows={3} value={editingBand.bio || ''} onChange={e => setEditingBand({...editingBand, bio: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, resize: 'none' }} placeholder="Erzählt eure Story..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Termine & Gigs</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {(editingBand.appointments || []).map((app: any, idx: number) => (
                     <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1 }}>
                           <input 
                             placeholder="Titel" 
                             value={app.title} 
                             onChange={e => {
                               const newApps = [...editingBand.appointments];
                               newApps[idx].title = e.target.value;
                               setEditingBand({...editingBand, appointments: newApps});
                             }} 
                             style={{ background: 'transparent', border: 'none', fontWeight: 700, width: '100%', outline: 'none' }} 
                           />
                           <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <input 
                                type="date" 
                                value={app.date} 
                                onChange={e => {
                                  const newApps = [...editingBand.appointments];
                                  newApps[idx].date = e.target.value;
                                  setEditingBand({...editingBand, appointments: newApps});
                                }} 
                                style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', color: '#64748b', outline: 'none' }} 
                              />
                              <input 
                                placeholder="Ort" 
                                value={app.location} 
                                onChange={e => {
                                  const newApps = [...editingBand.appointments];
                                  newApps[idx].location = e.target.value;
                                  setEditingBand({...editingBand, appointments: newApps});
                                }} 
                                style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', color: '#64748b', outline: 'none', flex: 1 }} 
                              />
                           </div>
                        </div>
                        <button type="button" onClick={() => {
                          const newApps = editingBand.appointments.filter((_: any, i: number) => i !== idx);
                          setEditingBand({...editingBand, appointments: newApps});
                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                     </div>
                   ))}
                   <button type="button" onClick={() => {
                     const newApps = [...(editingBand.appointments || []), { title: '', date: new Date().toISOString().split('T')[0], location: '' }];
                     setEditingBand({...editingBand, appointments: newApps});
                   }} style={{ padding: '12px', borderRadius: '12px', border: '2px dashed #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>+ Termin hinzufügen</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musik (MP3 Links)</label>
                {(editingBand.soundcloud_links || []).map((track: any, idx: number) => {
                  const trackData = typeof track === 'string' ? { title: '', url: track } : track;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        placeholder="Titel (z.B. Song Name)" 
                        value={trackData.title}
                        onChange={e => {
                          const newList = [...editingBand.soundcloud_links];
                          newList[idx] = { ...trackData, title: e.target.value };
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
                      />
                      <input 
                        placeholder="MP3 Link (Cloud URL)" 
                        value={trackData.url}
                        onChange={e => {
                          const newList = [...editingBand.soundcloud_links];
                          newList[idx] = { ...trackData, url: e.target.value };
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }}
                        style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
                      />
                      <button type="button" onClick={() => {
                        const newList = editingBand.soundcloud_links.filter((_: any, i: number) => i !== idx);
                        setEditingBand({...editingBand, soundcloud_links: newList});
                      }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  );
                })}
                <button type="button" onClick={() => {
                  const newList = [...(editingBand.soundcloud_links || []), { title: '', url: '' }];
                  setEditingBand({...editingBand, soundcloud_links: newList});
                }} style={{ padding: '10px', borderRadius: '10px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>+ Song hinzufügen</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Videos (YouTube Links)</label>
                {(editingBand.youtube_links || []).map((video: any, idx: number) => {
                  const videoData = typeof video === 'string' ? { title: '', url: video } : video;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        placeholder="Videotitel" 
                        value={videoData.title}
                        onChange={e => {
                          const newList = [...editingBand.youtube_links];
                          newList[idx] = { ...videoData, title: e.target.value };
                          setEditingBand({...editingBand, youtube_links: newList});
                        }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
                      />
                      <input 
                        placeholder="YouTube URL" 
                        value={videoData.url}
                        onChange={e => {
                          const newList = [...editingBand.youtube_links];
                          newList[idx] = { ...videoData, url: e.target.value };
                          setEditingBand({...editingBand, youtube_links: newList});
                        }}
                        style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
                      />
                      <button type="button" onClick={() => {
                        const newList = editingBand.youtube_links.filter((_: any, i: number) => i !== idx);
                        setEditingBand({...editingBand, youtube_links: newList});
                      }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  );
                })}
                <button type="button" onClick={() => {
                  const newList = [...(editingBand.youtube_links || []), { title: '', url: '' }];
                  setEditingBand({...editingBand, youtube_links: newList});
                }} style={{ padding: '10px', borderRadius: '10px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>+ Video hinzufügen</button>
              </div>



              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>Speichern</button>
                <button type="button" onClick={() => setShowEditBand(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>Abbrechen</button>
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
                  if (avatarPickerType === 'band') return BAND_AVATARS;
                  const role = (user?.role || '').toLowerCase();
                  if (activePlatform === 'campus') {
                    if (role === 'student') return STUDENT_AVATARS;
                    return CAMPUS_AVATARS;
                  }
                  if (role === 'teacher' || role === 'admin') return TEACHER_AVATARS;
                  return STUDENT_AVATARS;
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
                            if (!error) {
                              setSelectedBandForProfile({...selectedBandForProfile, photo_url: av.url});
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
    </div>
  </div>
);
}

export default App;

interface SecurePdfViewerModalProps {
  song: any;
  folderUrl: string;
  onClose: () => void;
}

// Reusable PDF Page renderer component using HTML5 Canvas and PDF.js
const PdfPage: React.FC<{ pdf: any; pageNum: number; width: number }> = ({ pdf, pageNum, width }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let renderTask: any = null;

    const renderPage = async () => {
      try {
        setLoading(true);
        setRenderError(false);
        const page = await pdf.getPage(pageNum);
        if (!isMounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = width > 0 ? width : 1000;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error rendering PDF page ${pageNum}:`, err);
        if (isMounted) {
          setRenderError(true);
          setLoading(false);
        }
      }
    };

    renderPage();
    return () => {
      isMounted = false;
      if (renderTask && renderTask.cancel) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNum, width]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      background: 'white', 
      borderBottom: '16px solid #e2e8f0',
      minHeight: width > 0 ? `${width * 1.414}px` : '600px'
    }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: '12px', zIndex: 1 }}>
          <div className="custom-animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(59, 130, 246, 0.1)', borderTop: '3px solid #3b82f6' }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Lade Seite {pageNum}...</span>
        </div>
      )}
      {renderError ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e53e3e', padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚠️</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Seite {pageNum} konnte nicht gerendert werden.</span>
        </div>
      ) : (
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
      )}
    </div>
  );
};

const SecurePdfViewerModal: React.FC<SecurePdfViewerModalProps> = ({ song, folderUrl, onClose }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCopyAlert, setShowCopyAlert] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'starter' | 'pro'>('starter');
  const [pageCount, setPageCount] = useState<number>(3);
  const [isPageCountFallback, setIsPageCountFallback] = useState(true);
  const [containerWidth, setContainerWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pdfError, setPdfError] = useState<boolean>(false);

  // Audio Playback & Auto-scroll states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showScrollPausedToast, setShowScrollPausedToast] = useState(false);
  const [extractedBpm, setExtractedBpm] = useState<number | null>(null);
  const [testAudioUrl, setTestAudioUrl] = useState<string>('');
  const lastProgrammaticScroll = useRef<number>(0);

  const brandColor = "#eab308"; // Standard brand color

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const pageHeight = containerWidth * 1.414 + 16;
  const sheetHeight = pageCount * pageHeight;

  const getPdfSlides = () => {
    const slides: { id: string; label: string; icon: string; desc: string }[] = [];
    const insts = song.instrumentation || {};
    const isWebspace = folderUrl && !folderUrl.includes('dropbox.com') && !folderUrl.includes('drive.google.com') && !folderUrl.includes('onedrive.live.com') && !folderUrl.includes('1drv.ms');
    const hasAnyDirectPdf = !!(song.pdf_guitar_url || song.pdf_bass_url || song.pdf_drums_url || song.pdf_keys_url || song.pdf_vocals_url);
    
    if (insts['E-Gitarre'] > 0) { if (!hasAnyDirectPdf || !!song.pdf_guitar_url || isWebspace) slides.push({ id: 'guitar', label: 'E-Gitarre', icon: '🎸', desc: 'Stimme für E-Gitarre (Starter & Pro)' }); }
    if (insts['E-Bass'] > 0) { if (!hasAnyDirectPdf || !!song.pdf_bass_url || isWebspace) slides.push({ id: 'bass', label: 'E-Bass', icon: '🎸', desc: 'Stimme für E-Bass (Starter & Pro)' }); }
    if (insts['E-Drums'] > 0) { if (!hasAnyDirectPdf || !!song.pdf_drums_url || isWebspace) slides.push({ id: 'drums', label: 'E-Drums', icon: '🥁', desc: 'Stimme für E-Drums / Schlagzeug' }); }
    if (insts['E-Piano'] > 0) { if (!hasAnyDirectPdf || !!song.pdf_keys_url || isWebspace) slides.push({ id: 'keys', label: 'E-Piano', icon: '🎹', desc: 'Stimme für Keyboard & E-Piano' }); }
    if (!hasAnyDirectPdf || !!song.pdf_vocals_url || isWebspace) slides.push({ id: 'vocals', label: 'Gesang / Lyrics', icon: '🎤', desc: 'Songtext, Gesangspart und Vocal-Harmonien' });
    return slides;
  };

  const slides = getPdfSlides();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if ((isCmdOrCtrl && e.key.toLowerCase() === 'p') || (isCmdOrCtrl && e.key.toLowerCase() === 's') || (isCmdOrCtrl && e.key.toLowerCase() === 'c') || e.key === 'PrintScreen') {
        e.preventDefault();
        setShowCopyAlert(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showCopyAlert) {
      const timer = setTimeout(() => setShowCopyAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showCopyAlert]);

  const getActiveUrl = () => {
    const activeSlideId = slides[activeSlide]?.id;
    let url = '';
    if (activeSlideId === 'guitar') url = song.pdf_guitar_url;
    else if (activeSlideId === 'bass') url = song.pdf_bass_url;
    else if (activeSlideId === 'drums') url = song.pdf_drums_url;
    else if (activeSlideId === 'keys') url = song.pdf_keys_url;
    else if (activeSlideId === 'vocals') url = song.pdf_vocals_url;
    if (url) return url;
    if (folderUrl && !folderUrl.includes('dropbox.com') && !folderUrl.includes('drive.google.com') && !folderUrl.includes('onedrive.live.com') && !folderUrl.includes('1drv.ms')) {
      let base = folderUrl;
      if (!base.endsWith('/')) base += '/';
      const suffix = selectedLevel === 'pro' ? '_pro' : '_starter';
      if (activeSlideId === 'guitar') return base + `gitarre${suffix}.pdf`;
      if (activeSlideId === 'bass') return base + `bass${suffix}.pdf`;
      if (activeSlideId === 'drums') return base + `drums${suffix}.pdf`;
      if (activeSlideId === 'keys') return base + `piano${suffix}.pdf`;
      if (activeSlideId === 'vocals') return base + 'gesang.pdf';
    }
    return folderUrl;
  };

  const activeUrl = getActiveUrl();
  const isDropbox = activeUrl && activeUrl.includes('dropbox.com');
  const isDropboxFolder = isDropbox && (activeUrl.includes('/scl/fo/') || activeUrl.includes('/sh/') || !(activeUrl.includes('.pdf') || activeUrl.includes('/scl/fi/') || activeUrl.includes('/s/')));

  // Extract BPM from PDF pages using regex
  const extractBpmFromPdf = async (pdfDoc: any) => {
    try {
      const page = await pdfDoc.getPage(1);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item: any) => item.str);
      const fullText = strings.join(' ');
      console.log('[SecurePdfViewerModal] Extracted page 1 text:', fullText);

      const bpmRegexes = [
        /[♩\u2669\u266a\u266b\u2705q]\s*=\s*(\d+)/i,
        /(?:bpm|tempo)\s*[:=]?\s*(\d+)/i,
        /(\d+)\s*(?:bpm|BPM)/i,
        /(?:^|\s)=\s*(\d+)/
      ];

      for (const regex of bpmRegexes) {
        const match = fullText.match(regex);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val >= 40 && val <= 300) return val;
        }
      }

      for (const str of strings) {
        for (const regex of bpmRegexes) {
          const match = str.match(regex);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val >= 40 && val <= 300) return val;
          }
        }
      }
    } catch (err) {
      console.error('Error extracting BPM from PDF:', err);
    }
    return null;
  };

  // Helper for resolving Media / Audio Link
  const resolveMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('dropbox.com')) {
      let directUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
      directUrl = directUrl.replace(/[?&]dl=[01]/, '').replace(/[?&]raw=[01]/, '');
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'raw=1';
      return directUrl;
    }
    return url;
  };

  const resolvedAudioUrl = useMemo(() => {
    if (testAudioUrl) return resolveMediaUrl(testAudioUrl);
    
    const rawUrl = song?.playalong_url || song?.media_link;
    if (!rawUrl) return '';
    
    // Only fallback to media_link if it's a Dropbox link or a direct audio file link
    if (!song?.playalong_url && song?.media_link) {
      const isDropbox = song.media_link.includes('dropbox.com');
      const isAudioFile = song.media_link.match(/\.(mp3|wav|m4a|aac|ogg)(\?|$)/i);
      if (!isDropbox && !isAudioFile) return '';
    }
    
    return resolveMediaUrl(rawUrl);
  }, [song?.playalong_url, song?.media_link, testAudioUrl]);

  // Load PDF and try to detect BPM
  useEffect(() => {
    if (!activeUrl) return;
    if (isDropboxFolder) {
      setPdfLoading(false);
      setPdfDocument(null);
      setPdfError(false);
      return;
    }
    let isMounted = true;
    setPdfLoading(true);
    setPdfDocument(null);
    setPdfError(false);
    setExtractedBpm(null); // Reset extracted BPM for the new slide
    
    const countPages = async () => {
      try {
        let pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; });
          pdfjsLib = (window as any).pdfjsLib;
        }
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          let fetchUrl = activeUrl;
          if (fetchUrl && fetchUrl.includes('dropbox.com')) {
            fetchUrl = fetchUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
            fetchUrl = fetchUrl.replace(/[?&]dl=[01]/, '').replace(/[?&]raw=[01]/, '') + (fetchUrl.includes('?') ? '&' : '?') + 'raw=1';
          }
          const loadingTask = pdfjsLib.getDocument(fetchUrl);
          const pdf = await loadingTask.promise;
          if (isMounted) {
            setPdfDocument(pdf);
            setPageCount(pdf.numPages);
            setIsPageCountFallback(false);
            setPdfLoading(false);

            // Auto-detect BPM
            const bpm = await extractBpmFromPdf(pdf);
            if (bpm && isMounted) {
              setExtractedBpm(bpm);
            }
          }
        }
      } catch (e) {
        console.error('[SecurePdfViewerModal] Error getting PDF page count:', e);
        if (isMounted) {
          setPdfDocument(null);
          setPdfError(true);
          setPageCount(3);
          setIsPageCountFallback(true);
          setPdfLoading(false);
        }
      }
    };
    countPages();
    return () => { isMounted = false; };
  }, [activeUrl, isDropboxFolder]);

  // Sync playback speed rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isPlaying]); // Update rate on state change and play start

  // Auto-scroll animation logic via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !isAutoScrollEnabled || !containerRef.current || !audioRef.current) return;

    let active = true;
    const scrollContainer = containerRef.current;
    const audio = audioRef.current;

    const updateScroll = () => {
      if (!active) return;
      const durationVal = audio.duration;
      if (durationVal && durationVal > 0) {
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (maxScroll > 0) {
          let targetScroll = 0;
          // Apply a 7-second delay hold before auto-scrolling starts
          if (audio.currentTime > 7 && durationVal > 7) {
            const percent = (audio.currentTime - 7) / (durationVal - 7);
            targetScroll = percent * maxScroll;
          } else if (durationVal <= 7) {
            const percent = audio.currentTime / durationVal;
            targetScroll = percent * maxScroll;
          }
          lastProgrammaticScroll.current = targetScroll;
          scrollContainer.scrollTop = targetScroll;
        }
      }
      requestAnimationFrame(updateScroll);
    };

    requestAnimationFrame(updateScroll);
    return () => {
      active = false;
    };
  }, [isPlaying, isAutoScrollEnabled]);

  // Handle manual scrolling to pause auto-scroll
  useEffect(() => {
    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (!isPlaying || !isAutoScrollEnabled) return;
      const currentScroll = scrollContainer.scrollTop;
      const diff = Math.abs(currentScroll - lastProgrammaticScroll.current);
      // User manually scrolled more than 15px away from target scroll position
      if (diff > 15) {
        setIsAutoScrollEnabled(false);
        setShowScrollPausedToast(true);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isPlaying, isAutoScrollEnabled]);

  // Automatically fade out the scroll-paused toast
  useEffect(() => {
    if (showScrollPausedToast) {
      const timer = setTimeout(() => setShowScrollPausedToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showScrollPausedToast]);

  const getSecureEmbedUrl = () => {
    let url = activeUrl;
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch && fileIdMatch[1]) return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    if (url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
      return url.includes('1drv.ms') ? url.replace('/f/', '/embed/') : url.replace('redir?', 'embed?').replace('view.aspx', 'embed.aspx');
    }
    if (isDropbox && (url.includes('.pdf') || url.includes('/scl/fi/') || url.includes('/s/'))) {
      return url.replace(/[?&]dl=[01]/, '').replace(/[?&]raw=[01]/, '') + '?raw=1#toolbar=0&navpanes=0&scrollbar=0&view=FitH,0';
    }
    return url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?') ? url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH,0' : url;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Audio playback error:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    
    if (duration > 0 && containerRef.current) {
      const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      if (maxScroll > 0) {
        const percent = time / duration;
        const targetScroll = percent * maxScroll;
        lastProgrammaticScroll.current = targetScroll;
        containerRef.current.scrollTop = targetScroll;
      }
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }} onContextMenu={(e) => { e.preventDefault(); setShowCopyAlert(true); }}>
      {showCopyAlert && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', padding: '16px 28px', borderRadius: '16px', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)', zIndex: 6000, display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Lock size={18} />
          Sicherer GrooveLab-Modus: Kopieren, Speichern und Drucken ist deaktiviert! 🔒
        </div>
      )}
      
      {/* Hidden audio element */}
      {resolvedAudioUrl && (
        <audio
          ref={audioRef}
          src={resolvedAudioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Floating Auto-Scroll manual override toast */}
      {showScrollPausedToast && (
        <div style={{
          position: 'fixed',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#f8fafc',
          padding: '10px 18px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 700,
          zIndex: 5500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        }}>
          <span>⚠️ Auto-Scroll pausiert (Manuelles Scrollen)</span>
          <button 
            onClick={() => {
              setIsAutoScrollEnabled(true);
              setShowScrollPausedToast(false);
              if (audioRef.current && duration > 0 && containerRef.current) {
                const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
                let targetScroll = 0;
                // Apply the same 7-second delay hold on reactivation
                if (audioRef.current.currentTime > 7 && duration > 7) {
                  const percent = (audioRef.current.currentTime - 7) / (duration - 7);
                  targetScroll = percent * maxScroll;
                } else if (duration <= 7) {
                  const percent = audioRef.current.currentTime / duration;
                  targetScroll = percent * maxScroll;
                }
                lastProgrammaticScroll.current = targetScroll;
                containerRef.current.scrollTop = targetScroll;
              }
            }}
            style={{
              background: brandColor,
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: '6px'
            }}
          >
            Reaktivieren
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.9)', height: '56px', minHeight: '56px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flexShrink: 1 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Library size={16} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {song.title} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>({song.artist})</span>
            </h2>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto', maxWidth: '400px' }}>
            {slides.map((slide, index) => (
              <button key={slide.id} onClick={() => { setActiveSlide(index); setIsAutoScrollEnabled(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: index === activeSlide ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent', color: index === activeSlide ? 'white' : '#94a3b8', border: 'none', padding: '6px 14px', borderRadius: '9px', fontSize: '0.8rem', fontWeight: index === activeSlide ? 900 : 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
                <span>{slide.icon}</span>
                <span>{slide.label}</span>
              </button>
            ))}
          </div>
          {slides[activeSlide]?.id !== 'vocals' && (
            <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.9)', borderRadius: '10px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <button onClick={() => setSelectedLevel('starter')} style={{ background: selectedLevel === 'starter' ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'transparent', color: selectedLevel === 'starter' ? '#1e293b' : '#94a3b8', border: 'none', padding: '5px 12px', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s ease' }}>Starter 🚀</button>
              <button onClick={() => setSelectedLevel('pro')} style={{ background: selectedLevel === 'pro' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'transparent', color: selectedLevel === 'pro' ? 'white' : '#94a3b8', border: 'none', padding: '5px 12px', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s ease' }}>Pro 🔥</button>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, position: 'relative', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: isDropboxFolder ? '#1e293b' : '#0f172a', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {isDropboxFolder ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', maxWidth: '600px', color: 'white' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '12px', color: 'white' }}>Sicherer Dropbox-Notenständer 🔒</h3>
              <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '32px' }}>Dropbox blockiert das direkte Einbetten von Ordnern. Öffne den Ordner in einem neuen Tab.</p>
              <button onClick={() => window.open(activeUrl, '_blank')} style={{ background: 'linear-gradient(135deg, #0061ff, #0045b5)', color: 'white', border: 'none', padding: '16px 36px', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Ordner öffnen</span> <ExternalLink size={18} />
              </button>
            </div>
          ) : (
            <div ref={containerRef} style={{ width: '100%', maxWidth: '1000px', height: '100%', overflowY: 'auto', background: 'white', position: 'relative', margin: '0 auto', paddingBottom: resolvedAudioUrl ? '120px' : '0' }}>
              {pdfDocument ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <div onContextMenu={(e) => { e.preventDefault(); setShowCopyAlert(true); }} style={{ position: 'absolute', inset: 0, background: 'transparent', zIndex: 99, pointerEvents: 'auto' }} />
                  {Array.from({ length: pageCount }).map((_, idx) => (
                    <PdfPage key={idx} pdf={pdfDocument} pageNum={idx + 1} width={containerWidth} />
                  ))}
                </div>
              ) : (
                <div style={{ position: 'relative', width: '100%', height: `${sheetHeight}px`, background: 'white', overflow: 'hidden' }}>
                  <div onContextMenu={(e) => { e.preventDefault(); setShowCopyAlert(true); }} style={{ position: 'absolute', inset: 0, background: 'transparent', zIndex: 99, pointerEvents: 'auto' }} />
                  <iframe src={getSecureEmbedUrl()} onLoad={() => setPdfLoading(false)} scrolling="no" style={{ width: '1px', minWidth: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />
                </div>
              )}
              {pdfLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                  <div className="custom-animate-spin" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid rgba(255, 255, 255, 0.1)', borderTop: '4px solid #3b82f6' }} />
                </div>
              )}
            </div>
          )}

          {/* Floating Glassmorphic Audio Player & Scroll Controller */}
          {resolvedAudioUrl && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '560px',
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              color: 'white',
              zIndex: 1000,
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              {/* Playback Controls & Info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    onClick={handlePlayPause}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: isPlaying ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      border: 'none',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" style={{ marginLeft: '2px' }} />}
                  </button>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Playback Track 🎵
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* BPM badge */}
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '5px 10px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>♩ =</span>
                    <span>{extractedBpm || '...'}</span>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>BPM</span>
                  </div>

                  {/* Auto-scroll Switch */}
                  <button
                    onClick={() => {
                      const nextState = !isAutoScrollEnabled;
                      setIsAutoScrollEnabled(nextState);
                      if (nextState && audioRef.current && duration > 0 && containerRef.current) {
                        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
                        const percent = audioRef.current.currentTime / duration;
                        const targetScroll = percent * maxScroll;
                        lastProgrammaticScroll.current = targetScroll;
                        containerRef.current.scrollTop = targetScroll;
                      }
                    }}
                    style={{
                      background: isAutoScrollEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: isAutoScrollEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                      color: isAutoScrollEnabled ? '#4ade80' : '#94a3b8',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ArrowDown size={12} />
                    <span>Auto-Scroll</span>
                  </button>

                  {/* Speed Selector */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[0.75, 1.0, 1.25].map(rate => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        style={{
                          background: playbackRate === rate ? 'rgba(255,255,255,0.12)' : 'transparent',
                          color: playbackRate === rate ? 'white' : '#94a3b8',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Slider */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="player-seek-slider"
                  style={{
                    flex: 1,
                    outline: 'none',
                    accentColor: brandColor
                  }}
                />
              </div>
            </div>
          )}

          {!resolvedAudioUrl && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
              color: 'white',
              fontSize: '0.85rem',
              zIndex: 4900,
              whiteSpace: 'nowrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={16} color="#fbbf24" />
                Kein Playalong-Track für diesen Song hinterlegt.
              </span>
              <button
                onClick={() => setTestAudioUrl('https://dl.espressif.com/dl/audio/ff-16b-2c-44100hz.mp3')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Demo-Playback laden 🎶
              </button>
            </div>
          )}

          {isPageCountFallback && !isDropboxFolder && (
            <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 101, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>
              <span style={{ color: '#94a3b8' }}>📄 Seiten:</span>
              <button onClick={() => setPageCount(p => Math.max(1, p - 1))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
              <span style={{ minWidth: '16px', textAlign: 'center', color: '#60a5fa', fontWeight: 950 }}>{pageCount}</span>
              <button onClick={() => setPageCount(p => Math.min(15, p + 1))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
