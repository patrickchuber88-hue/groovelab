import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Music, AlertCircle, Play, Pause, ArrowDown, Library, Shield, LogOut, Award, Users, User, Monitor, X, Camera, Clock, QrCode, Plus, ExternalLink, BarChart, Star, Box, Settings, Lock, Pencil, Trash2, Zap, RotateCcw, Check, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Mic, Calendar, PlayCircle, Youtube, Megaphone, Mail, School } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell
} from 'recharts';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import BandProfileContent from './components/BandProfileContent';
import { ArtistGateway } from './components/ArtistGateway';
import { supabase, supabaseUrl, supabaseAnonKey } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { QRCodeModal } from './components/QRCodeModal';
import { DeviceSetupScreen } from './components/DeviceSetupScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MasterAdminDashboard } from './components/MasterAdminDashboard';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import { StudentDetailModal } from './components/StudentDetailModal';
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
const StudioAvatar = React.memo(({ src, style, className, user, userId, onClick }: { src: string | null | undefined, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
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
        src={src || '/avatar_ghost.jpg'} 
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
}, (prev, next) => prev.src === next.src && prev.user?.id === next.user?.id && prev.userId === next.userId);

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
  if (r === 'teacher' || r === 'admin') return '#22c55e'; // Green
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
            onClick={() => window.location.reload()}
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
                  onMouseEnter={() => setIsChallengeHovered(true)}
                  onMouseLeave={() => setIsChallengeHovered(false)}
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
const params = new URLSearchParams(window.location.search);
const kioskStationId = params.get('kiosk_station_id');
if (kioskStationId) {
  localStorage.setItem('groovelab_station_id', kioskStationId);
  sessionStorage.removeItem('groovelab_user_id');
  // Strip parameter and redirect to clean up URL
  params.delete('kiosk_station_id');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  window.location.replace(newUrl);
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
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .apple-alert-close-btn:hover {
          background-color: rgba(255, 255, 255, 0.06) !important;
        }
        .apple-alert-close-btn:active {
          background-color: rgba(255, 255, 255, 0.1) !important;
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
    overlay.style.background = 'rgba(0, 0, 0, 0.45)';
    overlay.style.backdropFilter = 'blur(12px)';
    overlay.style.setProperty('-webkit-backdrop-filter', 'blur(12px)');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    // Determine type
    const msgLower = String(message).toLowerCase();
    const isError = msgLower.includes('fehler') || msgLower.includes('error') || msgLower.includes('fehlgeschlagen') || msgLower.includes('konnte nicht') || msgLower.includes('deaktiviert') || msgLower.includes('gesperrt');
    const isSuccess = msgLower.includes('erfolg') || msgLower.includes('erfolgreich') || msgLower.includes('glückwunsch') || msgLower.includes('kopiert') || msgLower.includes('bereit') || msgLower.includes('gespeichert') || msgLower.includes('zurückgesetzt') || msgLower.includes('gelöscht') || msgLower.includes('gesendet') || msgLower.includes('eingereicht') || msgLower.includes('akzeptiert') || msgLower.includes('✅') || msgLower.includes('🎉') || msgLower.includes('🤘') || msgLower.includes('🚀');

    let iconHtml = '';
    let titleText = 'GrooveLab';
    if (isError) {
      titleText = 'Hinweis';
      iconHtml = `
        <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(255, 69, 58, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(255, 69, 58, 0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
      `;
    } else if (isSuccess) {
      iconHtml = `
        <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(48, 209, 88, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(48, 209, 88, 0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
      `;
    } else {
      iconHtml = `
        <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(10, 132, 255, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(10, 132, 255, 0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
      `;
    }

    // Create alert box
    const alertBox = document.createElement('div');
    alertBox.style.background = 'rgba(28, 28, 30, 0.85)';
    alertBox.style.backdropFilter = 'blur(25px) saturate(180%)';
    alertBox.style.setProperty('-webkit-backdrop-filter', 'blur(25px) saturate(180%)');
    alertBox.style.borderRadius = '16px';
    alertBox.style.width = '300px';
    alertBox.style.maxWidth = '85%';
    alertBox.style.display = 'flex';
    alertBox.style.flexDirection = 'column';
    alertBox.style.alignItems = 'center';
    alertBox.style.overflow = 'hidden';
    alertBox.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.55)';
    alertBox.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    alertBox.style.color = 'white';
    alertBox.style.textAlign = 'center';
    alertBox.style.transform = 'scale(0.92) translateY(10px)';
    alertBox.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out';
    alertBox.style.boxSizing = 'border-box';

    // Safe innerHTML
    const escapedMessage = String(message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");

    alertBox.innerHTML = `
      <div style="padding: 24px 20px 22px; display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;">
        ${iconHtml}
        <div style="font-size: 18px; font-weight: 600; letter-spacing: -0.4px; color: white; margin-bottom: 6px;">
          ${titleText}
        </div>
        <div style="font-size: 13.5px; font-weight: 400; color: #e5e5ea; line-height: 1.45; white-space: normal; word-break: break-word;">
          ${escapedMessage}
        </div>
      </div>
      <button class="apple-alert-close-btn" style="
        width: 100%;
        padding: 14px;
        border-top: 0.5px solid rgba(255, 255, 255, 0.12);
        background: transparent;
        border-left: none;
        border-right: none;
        border-bottom: none;
        color: #0a84ff;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
        transition: background-color 0.2s;
        -webkit-tap-highlight-color: transparent;
        font-family: inherit;
      ">OK</button>
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
      alertBox.style.transform = 'scale(0.92) translateY(10px)';
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

function App() {
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => sessionStorage.getItem('groovelab_user_id'));
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loading, setLoading] = useState(false);
  const [isSchoolPaused, setIsSchoolPaused] = useState(false);
  const [user, setUser] = useState<any>(null);
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
      updateData.instrument = editingProfile.instrument;
      updateData.bio = editingProfile.bio;
      updateData.expertise = editingProfile.expertise;
      updateData.bands = editingProfile.bands;
      updateData.gear = editingProfile.gear;
      updateData.listening = editingProfile.listening;
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
  const [activeStudentTab, setActiveStudentTab] = useState<string>(() => {
    return localStorage.getItem('groovelab_active_tab') || 'profile';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1200;
    }
    return false;
  });
  const [sidebarNotificationsCount, setSidebarNotificationsCount] = useState<number>(0);
  const [selectedMatchingInsts, setSelectedMatchingInsts] = useState<Record<string, string>>({});
  const [activeBandSubTab, setActiveBandSubTab] = useState<'meine' | 'alle'>('meine');
  const [selectedBandForProfile, setSelectedBandForProfile] = useState<any>(null);
  const [selectedBandForGateway, setSelectedBandForGateway] = useState<any>(null);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [showBandProfile, setShowBandProfile] = useState(() => localStorage.getItem('groovelab_show_band_profile') === 'true');
  const [bandProfileView, setBandProfileView] = useState<'public' | 'backstage'>(() => {
    const saved = localStorage.getItem('groovelab_band_profile_view');
    return (saved === 'public' || saved === 'backstage') ? saved : 'public';
  });


  const [bandSearchText, setBandSearchText] = useState('');
  const [bandSearchLetter, setBandSearchLetter] = useState<string | null>(null);
  const [expandedMatchingSong, setExpandedMatchingSong] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
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
  const [locationMode, setLocationMode] = useState<'lab' | 'home'>(() => (sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home');
  const [personalRejections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [studentMessagesLoading, setStudentMessagesLoading] = useState(false);
  const [selectedStudentMessage, setSelectedStudentMessage] = useState<any>(null);
  const [studentMessagesFilter, setStudentMessagesFilter] = useState<'all' | 'school' | 'band'>('all');
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);

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
       localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.song_id}`, 'true');
    }
    if (suggestingSkill?.songs?.id) {
       localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.songs.id}`, 'true');
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
        const isIgnored = localStorage.getItem(`groovelab_founding_ignored_${user.id}_${skill.song_id}`);
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

    // 2. Auto-trigger Band Founding Modal when formation is complete (public matching)
    for (const song of wallSongs) {
      for (const form of (song.formations || [])) {
        if (form.isComplete && form.id !== lastAutoTriggeredFormId) {
          console.log('[AutoTrigger] Checking formation:', form.id, 'Last:', lastAutoTriggeredFormId);
          
          const mySlot = (form.members || []).find((m: any) => m.user_id === user.id);
          if (mySlot) {
            // Leader Logic: Assign leader stably across all clients by sorting members alphabetically by user_id
            const sortedMembers = [...(form.members || [])].sort((a: any, b: any) => (a.user_id || '').localeCompare(b.user_id || ''));
            const leader = sortedMembers[0] || mySlot;
            const isLeader = leader.user_id === user.id;

            // 1. Check if we already have a band for this song/group locally to avoid re-triggering
            const alreadyHaveBand = userBands.some((b: any) => 
              b.formation_group === form.id || 
              b.song_id === song.id ||
              b.song_id === song.song_id ||
              (b.band_songs || []).some((bs: any) => bs.song_id === song.id || bs.song_id === song.song_id || bs.songs?.id === song.id)
            );
            
            const isDone = localStorage.getItem(`groovelab_founding_done_${user.id}_${song.id}`) || 
                           localStorage.getItem(`groovelab_founding_done_${user.id}_${song.song_id}`) ||
                           localStorage.getItem(`groovelab_form_done_${user.id}_${form.id}`) ||
                           localStorage.getItem(`groovelab_founding_ignored_${user.id}_${song.id}`) ||
                           localStorage.getItem(`groovelab_founding_ignored_${user.id}_${song.song_id}`);
            
            if (alreadyHaveBand || isDone || ignoredFoundingIds.current.includes(form.id)) {
              console.log('[AutoTrigger] Already have band, formation processed, or ignored. Skipping.');
              continue;
            }

            // Auto-trigger founding flow
            updateAutoTriggerId(form.id);
            
            // Check for multi-band conflict first (mimic button logic) - Only for the leader!
            if (isLeader && userBands.length > 0) {
              const proceed = window.confirm('Deine Formation ist vollständig! 🎸\n\nDu spielst bereits in einer Band. Möchtest du wirklich eine zusätzliche Band gründen? Falls nicht, gibst du deinen Slot für andere frei.');
              if (!proceed) {
                (async () => {
                   await supabase.from('user_song_skills').update({ formation_group: null }).eq('id', mySlot.skill_id);
                   fetchDashboardData(user.id);
                })();
                return;
              }
            }

            // Open naming modal
            console.log('[DEBUG-Groovelab] setSuggestingSkill (band founding) in auto-trigger complete matching:', song.title);
            setSuggestingSkill({
              ...mySlot,
              isLeader,
              leaderName: isLeader ? 'Du' : leader?.first_name || 'Dein Teamkollege',
              song_id: song.song_id,
              songs: { id: song.song_id, title: song.title },
              formation_group: form.id,
              members: form.members
            });
            if (isLeader) {
              setFoundingName(generateRandomBandName());
            }
            
            // Modal should now be open
            console.log('[AutoTrigger] Triggering modal for:', song.title);
          }
        }
      }
    }
  }, [wallSongs, activeStudentTab, user, userBands, suggestingSkill, selectedBandForGateway, pendingFounding, showBandProfile, loading]);

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

  const STUDENT_AVATARS = [
    // NEW AVATARS (Alternating Girl, Boy)
    { id: 'student_girl_blonde_guitar', url: '/avatars/student_girl_blonde_guitar.png' },
    { id: 'student_boy_blonde_guitar', url: '/avatars/student_boy_blonde_guitar.png' },
    { id: 'student_girl_black_drums', url: '/avatars/student_girl_black_drums.png' },
    { id: 'student_boy_black_drums', url: '/avatars/student_boy_black_drums.png' },
    { id: 'student_girl_lightbrown_piano', url: '/avatars/student_girl_lightbrown_piano.png' },
    { id: 'student_boy_lightbrown_piano', url: '/avatars/student_boy_lightbrown_piano.png' },
    { id: 'student_girl_black_bass', url: '/avatars/student_girl_black_bass.png' },
    { id: 'student_boy_black_bass', url: '/avatars/student_boy_black_bass.png' },
    { id: 'student_girl_red_vocals', url: '/avatars/student_girl_red_vocals.png' },
    { id: 'student_boy_red_vocals', url: '/avatars/student_boy_red_vocals.png' },
    { id: 'student_girl_black_guitar', url: '/avatars/student_girl_black_guitar.png' },
    { id: 'student_boy_black_guitar', url: '/avatars/student_boy_black_guitar.png' },
    { id: 'student_girl_blonde_drums', url: '/avatars/student_girl_blonde_drums.png' },
    { id: 'student_boy_blonde_drums', url: '/avatars/student_boy_blonde_drums.png' },
    { id: 'student_girl_black_piano', url: '/avatars/student_girl_black_piano.png' },
    { id: 'student_boy_black_piano', url: '/avatars/student_boy_black_piano.png' },

    // EXISTING AVATARS (Alternating Girl, Boy)
    { id: 'avatar_girl_guitar', url: '/avatar_girl_guitar.jpg' },
    { id: 'avatar_boy_guitar', url: '/avatar_boy_guitar.jpg' },
    { id: 'avatar_girl_piano', url: '/avatar_girl_piano.jpg' },
    { id: 'avatar_boy_piano', url: '/avatar_boy_piano.jpg' },
    { id: 'avatar_girl_drums', url: '/avatar_girl_drums.jpg' },
    { id: 'avatar_boy_drums', url: '/avatar_boy_drums.jpg' },
    { id: 'avatar_girl_bass', url: '/avatar_girl_bass.jpg' },
    { id: 'avatar_boy_bass', url: '/avatar_boy_bass.jpg' },

    { id: 'teen_girl_eguitar_focused', url: '/avatars/teen_girl_eguitar_focused.png' },
    { id: 'student_teen_boy_guitar_1', url: '/avatars/student_teen_boy_guitar_1.png' },
    { id: 'student_girl_eguitar_3', url: '/avatars/student_girl_eguitar_3.png' },
    { id: 'teen_boy_eguitar_17', url: '/avatars/teen_boy_eguitar_17.png' },
    { id: 'student_girl_piano_2', url: '/avatars/student_girl_piano_2.png' },
    { id: 'student_boy_vocals_1', url: '/avatars/student_boy_vocals_1.png' },
    { id: 'student_girl_eguitar_2', url: '/avatars/student_girl_eguitar_2.png' },
    { id: 'student_boy_piano_2', url: '/avatars/student_boy_piano_2.png' },
    { id: 'student_girl_ebass_1', url: '/avatars/student_girl_ebass_1.png' },
    { id: 'student_boy_keyboard_1', url: '/avatars/student_boy_keyboard_1.png' },
    { id: 'student_girl_drums_2', url: '/avatars/student_girl_drums_2.png' },
    { id: 'student_boy_eguitar_2', url: '/avatars/student_boy_eguitar_2.png' },
    { id: 'student_girl_drums_3', url: '/avatars/student_girl_drums_3.png' },
    { id: 'student_boy_ebass_1', url: '/avatars/student_boy_ebass_1.png' },
    { id: 'student_girl_vocals_1', url: '/avatars/student_girl_vocals_1.png' },
    { id: 'student_boy_drums_2', url: '/avatars/student_boy_drums_2.png' },
    { id: 'vocalist_female', url: '/vocalist_female.png' },
    { id: 'student_boy_drums_3', url: '/avatars/student_boy_drums_3.png' },

    { id: 'bandstyle_girl_eguitar', url: '/avatars/bandstyle_girl_eguitar.png' },
    { id: 'student_boy_producer_1', url: '/avatars/student_boy_producer_1.png' },
    { id: 'bandstyle_girl_ebass', url: '/avatars/bandstyle_girl_ebass.png' },
    { id: 'vocalist_male', url: '/vocalist_male.png' },
    { id: 'bandstyle_girl_edrums', url: '/avatars/bandstyle_girl_edrums.png' },
    { id: 'student_bass_1', url: '/avatars/student_bass_1.png' },
    { id: 'bandstyle_girl_epiano', url: '/avatars/bandstyle_girl_epiano.png' },
    { id: 'student_drums_1', url: '/avatars/student_drums_1.png' },

    // Remaining Neutral/Male Avatars
    { id: 'student_eguitar_1', url: '/avatars/student_eguitar_1.png' },
    { id: 'student_piano_1', url: '/avatars/student_piano_1.png' },
    { id: 'student_vocals_1', url: '/avatars/student_vocals_1.png' },
    { id: 'student_tech_1', url: '/avatars/student_tech_1.png' },
    { id: 'bandstyle_boy_eguitar', url: '/avatars/bandstyle_boy_eguitar.png' },
    { id: 'bandstyle_boy_ebass', url: '/avatars/bandstyle_boy_ebass.png' },
    { id: 'bandstyle_boy_edrums', url: '/avatars/bandstyle_boy_edrums.png' },
    { id: 'bandstyle_boy_epiano', url: '/avatars/bandstyle_boy_epiano.png' },
    { id: 'teen_girl_acoustic_guitar', url: '/avatars/teen_girl_acoustic_guitar.png' },
    { id: 'teen_boy_acoustic_guitar', url: '/avatars/teen_boy_acoustic_guitar.png' },
    { id: 'avatar_girl_new', url: '/avatar_girl_1777237237899.png' },
    { id: 'avatar_boy', url: '/avatar_boy.jpg' }
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
    
    if (urlBandId) {
      if (isShared) setIsSharedView(true);
      console.log(`[PublicView] Detected band ID in URL: ${urlBandId} (Shared: ${isShared})`);
      const fetchPublicBand = async () => {
        try {
          const { data, error } = await supabase
            .from('bands')
            .select('*, songs(*), band_members(*, users!user_id(*)), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))), coach:users!bands_coach_id_fkey(first_name, last_name, photo_url)')
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
  }, []);

  useEffect(() => {
    localStorage.setItem('groovelab_active_tab', activeStudentTab);
  }, [activeStudentTab]);
  const { width, height } = useWindowSize();

  const [liveSessionMins, setLiveSessionMins] = useState(0);
  
  // Synchronous read to avoid flicker
  const [stationIdFromStorage] = useState(() => localStorage.getItem('groovelab_station_id'));

  useEffect(() => {
    console.log('--- Groovelab Diagnostics ---');
    console.log('Base Origin:', window.location.origin);
    console.log('User Agent:', navigator.userAgent);

    // Realtime subscription for sessions (Live Lab updates)
    const sessionChannel = supabase
      .channel('live-lab-sync')
      .on('postgres_changes', { schema: 'public', event: '*', table: 'sessions' }, () => {
        if (user?.id) fetchDashboardData(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [user]);

  const isKioskMode = stationIdFromStorage && stationIdFromStorage !== 'skip';

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
        if (payload.new.check_out_time && !payload.new.metadata?.is_tab_close) {
          handleLogout(false); // Logout but do not try to update DB again
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, user?.role]);

  const fetchDashboardData = async (userId: string, isInitial: boolean = false) => {
    try {
      if (isInitial) setLoading(true);
      console.log(`[Dashboard] Fetching data for user: ${userId}`);
      
      // Stage 1: Fetch user record, current session, and initial memberships (containing user's bands) in parallel
      const [userRes, sessionRes, allSessionsRes, membershipsRes] = await Promise.all([
        supabase.from('users').select('*, schools(*)').eq('id', userId).maybeSingle(),
        supabase.from('sessions').select('*, stations(name)').eq('user_id', userId).is('check_out_time', null).order('check_in_time', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('sessions').select('check_in_time, check_out_time').eq('user_id', userId),
        supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))))').eq('user_id', userId)
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
      // We immediately force logout and wipe their tab state.
      const isStudent = userData.role?.toLowerCase() === 'student';
      if (isStudent && locationMode === 'lab' && !sessionRes.data) {
        console.warn('[Dashboard] Student in Lab mode has no active database session! Force logout.');
        setLoading(false);
        handleLogout(false);
        return;
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

      const bandIds = (membershipsRes?.data || []).map((m: any) => m.bands?.id).filter(Boolean);

      // Stage 2: Fetch all detailed boards, library, school bands, teachers, active session metrics in a single parallel block
      const [skillsRes, wallRes, membersRes, formingBandsRes, songsRes, userBandsRes, bandsRes, teachersRes, activeSessionsRes] = await Promise.all([
        supabase.from('user_song_skills').select(`
          id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
          songs (*)
        `).eq('user_id', userId),
        supabase.from('songs').select(`
          id, artist, title, media_link, instrumentation,
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
        `).eq('school_id', schoolId),
        supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId),
        supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, photo_url)), band_songs(*, band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', schoolId).in('status', ['forming', 'active']),
        supabase.from('songs').select('*').eq('school_id', schoolId).order('level').order('artist'),
        bandIds.length > 0
          ? supabase.from('bands').select(`
              *,
              songs (*),
              band_members (*, users(*)),
              band_songs (*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))),
              coach:users!coach_id (first_name, last_name, photo_url)
            `).in('id', bandIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('bands').select('*, songs(title, artist, instrumentation), band_members(*, users!user_id(*)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
        supabase.from('users').select('*').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
        supabase.from('sessions').select('user_id, station_id, users!inner(role, school_id, last_seen)').is('check_out_time', null).eq('users.school_id', schoolId)
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Stage 2:', err);
        return [ {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err} ] as any;
      });

      if (skillsRes.error) console.error('[Dashboard] Skills Fetch Error:', skillsRes.error);
      if (wallRes.error) console.error('[Dashboard] Songs query error:', wallRes.error);

      setUser(userData);
      setSession(sessionRes.data);
      if (sessionRes.error) console.error('[Dashboard] Error fetching session:', sessionRes.error);

      // Parse active sessions in parallel
      if (activeSessionsRes.data) {
        const count = activeSessionsRes.data.filter((s: any) => {
          const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
          if (!u) return false;
          return u.role?.toLowerCase() === 'student' && s.station_id;
        }).length;
        setActiveStudentsCount(count);
      }

      // Populate global library songs in parallel
      if (songsRes.data) {
        setGlobalSongs(songsRes.data);
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
      const instrumentalSongs = safeSkills.map((p: any) => {
          const song = Array.isArray(p.songs) ? p.songs[0] : p.songs;
          if (!song) return null;
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
        if (!(mi.includes('vocal') || mi.includes('gesang'))) return [];
        
        const band = m.bands;
        if (!band) return [];

        const songs: any[] = [];
        const addedSongIds = new Set<string>();

        // 1. Process from band_songs where user is assigned to Vocals slot
        (band.band_songs || []).forEach((bs: any) => {
          const s = Array.isArray(bs.songs) ? bs.songs[0] : bs.songs;
          if (!s) return;
          
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

        // 2. Fallback for the main band song if it wasn't added yet (to be safe)
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

      // Build a map of all school skills for easy lookup
      const schoolSkillsMap: Record<string, any[]> = {};
      (wallRes.data || []).forEach((song: any) => {
        (song.user_song_skills || []).forEach((skill: any) => {
          if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
          schoolSkillsMap[skill.user_id].push(skill);
        });
      });

      const wallData = wallRes.data || [];
      console.log('[Dashboard] Wall data fetched. Count:', wallData.length);
      const allMembers = membersRes.data || [];

      // --- FOUNDING DETECTION (Manual Trigger Only) ---
      // We no longer auto-set pendingFounding here to prevent unexpected popups.
      // Students trigger founding manually via the "JETZT BAND GRÜNDEN" button on the board.

      // --- BAND PROJECT AUTO-FILLING (Optimized: ONLY runs on initial full load to save heavy redundant DB operations!) ---
      const formingBands = formingBandsRes.data || [];
      if (isInitial && formingBands.length > 0) {
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
                  const countRequired = requiredInsts[instName] || 0;
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
                const userAlreadyIn = f.members.some((m: any) => m.user_id === skill.user_id);
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
      const songsData = songsRes?.data || [];
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
      const bandsData = bandsRes?.data;
      if (bandsRes?.error) console.error('[Dashboard] Error fetching all school bands:', bandsRes.error);
      if (bandsData) {
        // Enrich all members with skills
        bandsData.forEach((band: any) => {
          (band.band_members || []).forEach((m: any) => {
            const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
            if (u) u.user_song_skills = schoolSkillsMap[u.id] || [];
          });
        });

        // We show all bands that have at least one song assigned, even if incomplete,
        // so that the Vocal-Finder and other joining tools can find them.
        const validBands = bandsData.filter((band: any) => {
          const song = band?.songs ? (Array.isArray(band.songs) ? band.songs[0] : band.songs) : null;
          return !!song;
        });
        setAllBands(validBands);
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


      // --- ANNOUNCEMENT & SHOUTBOX INITIALIZATION ---
      checkAnnouncements(schoolId, userData);
      if (userData.role !== 'student') {
        fetchAnnouncements(schoolId);
        
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name, role, photo_url')
          .eq('school_id', schoolId)
          .order('first_name');
        if (allUsers) {
          setSchoolUsers(allUsers);
        }
      } else {
        fetchStudentMessagesBackground(schoolId, userId, bandIds);
      }

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
        const { data: newBand } = await supabase
          .from('bands')
          .insert({
            name: '__SYSTEM_ANNOUNCEMENTS__',
            status: 'active',
            school_id: schoolId,
            genre: 'System',
            photo_url: '/logo.png'
          })
          .select();
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
          const { data: newBand } = await supabase
            .from('bands')
            .insert({
              name: '__SYSTEM_ANNOUNCEMENTS__',
              status: 'active',
              school_id: user.school_id,
              genre: 'System',
              photo_url: '/logo.png'
            })
            .select();
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

  const handleLogout = async (updateDb = true) => {
    try {
      if (loggedInUserId) {
        // Mark user as offline IMMEDIATELY for dashboard
        const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
        await supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId);
      }

      if (updateDb && session?.id) {
        // Session beenden in DB
        await supabase
          .from('sessions')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', session.id);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    setLoggedInUserId(null);
    setUser(null);
    setSession(null);
    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
    localStorage.removeItem('groovelab_active_tab');
  };

  const hasInviteSchoolId = new URLSearchParams(window.location.search).has('invite_school_id');

  const handleLogin = async (userId: string, isHome?: boolean) => {
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

    // Always start with the Live Lab after login!
    setActiveStudentTab('live');
    localStorage.setItem('groovelab_active_tab', 'live');

    // Immediate Heartbeat on Login (non-blocking for instantaneous login transition!)
    supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
      
    // Force a hard reload to absolutely guarantee that any lingering camera 
    // media streams from the browser are destroyed.
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  useEffect(() => {
    if (user && !localStorage.getItem('groovelab_active_tab')) {
      setActiveStudentTab('live');
      localStorage.setItem('groovelab_active_tab', 'live');
    }
    // Realtime subscription for sessions (Active Student Count)
    const sessionsChannel = supabase
      .channel('public:sessions_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        if (user?.school_id) {
          fetchActiveStudentCount(user.school_id);
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
      if (session?.id) {
        await supabase
          .from('sessions')
          .update({ last_seen: now })
          .eq('id', session.id);
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

    // Immediate "Offline" signal when closing tab
    // We set last_seen to a past date so the dashboard catches it immediately.
    // Other open tabs will overwrite this with their own heartbeat within 30s.
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
      .select('user_id, station_id, users!inner(role, school_id, last_seen)')
      .is('check_out_time', null)
      .eq('users.school_id', schoolId);
    
    // Only count students who have an active session at a station
    const count = (activeSessions || []).filter(s => {
      const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
      if (!u) return false;
      return u.role?.toLowerCase() === 'student' && s.station_id;
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

  // 1.8 KIOSK ROOM SETUP BYPASS
  const kioskRoomId = new URLSearchParams(window.location.search).get('kiosk_room_id');
  if (kioskRoomId) {
    return <DeviceSetupScreen />;
  }

  // 2. AUTHENTICATION CHECK
  if (!loggedInUserId) {
    return <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />;
  }

  if (loading || !user) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         {/* Minimal loading indicator instead of full splash */}
         <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
         
         {import.meta.env.DEV && (
            <button
              onClick={async () => {
                const { data } = await supabase.from('users').select('*').eq('role', 'admin').limit(1).single();
                if (data) {
                  await handleLogin(data.id, true);
                  setUser(data);
                  setLoading(false);
                }
              }}
              style={{ position: 'absolute', bottom: '20px', opacity: 0.3, fontSize: '10px' }}
            >
              🔓 BYPASS
            </button>
          )}
      </div>
    );
  }

  // 2.5 MASTER ADMIN PORTAL BYPASS
  if (user.is_master_admin) {
    return <MasterAdminDashboard onLogout={handleLogout} />;
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
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
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
  });

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
      <style>{`
        .sidebar-nav .hover-scale { transition: all 0.2s ease !important; }
        .sidebar-nav .hover-scale:hover { 
          transform: translateX(4px); 
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
      `}</style>
      {/* Sidebar Navigation (iPad/Desktop) */}
      <aside className="sidebar-nav" style={{ display: windowWidth > 1024 ? 'flex' : 'none' }}>
        <div className="sidebar-logo" style={{ padding: '8px 0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        </div>

        <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {user.role?.toLowerCase() === 'student' ? (
            <>
              <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <Monitor size={20} /> Live Lab
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', marginLeft: 'auto', flexShrink: 0 }} className="animate-pulse"></div>
              </button>

              {/* Only for instrumentalists */}
              {!user.is_external_vocalist && (
                <>
                  <button onClick={() => setActiveStudentTab('practice')} className={`sidebar-item ${activeStudentTab === 'practice' ? 'active' : ''}`}>
                    <Play size={20} fill={activeStudentTab === 'practice' ? 'white' : 'none'} /> Üben
                  </button>
                  <button onClick={() => setActiveStudentTab('library')} className={`sidebar-item ${activeStudentTab === 'library' ? 'active' : ''}`}>
                    <Library size={20} /> Bibliothek
                  </button>
                </>
              )}

              <button onClick={() => setActiveStudentTab('repertoire')} className={`sidebar-item ${activeStudentTab === 'repertoire' ? 'active' : ''}`}>
                <Award size={20} /> Repertoire
              </button>

              {!user.is_external_vocalist && (
                <button onClick={() => setActiveStudentTab('matching')} className={`sidebar-item ${activeStudentTab === 'matching' ? 'active' : ''}`}>
                  <Users size={20} /> Band-Matching
                </button>
              )}

              <button onClick={() => setActiveStudentTab('bands')} className={`sidebar-item ${activeStudentTab === 'bands' ? 'active' : ''}`}>
                <Box size={20} /> Bands
              </button>

              {user?.show_messages_menu !== false && (
                <button onClick={() => setActiveStudentTab('messages')} className={`sidebar-item ${activeStudentTab === 'messages' ? 'active' : ''}`} style={{ position: 'relative' }}>
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
              )}

              <button onClick={() => setActiveStudentTab('profile')} className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}>
                <Shield size={20} /> Profil
              </button>

              <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? 'active' : ''}`}>
                <Users size={20} /> Team
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <Monitor size={20} /> Live Lab
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', marginLeft: 'auto', flexShrink: 0 }} className="animate-pulse"></div>
              </button>
              <button onClick={() => setActiveStudentTab('messages')} className={`sidebar-item ${activeStudentTab === 'messages' ? 'active' : ''}`}>
                <Mail size={20} /> Nachrichten
              </button>
              <button onClick={() => setActiveStudentTab('students')} className={`sidebar-item ${activeStudentTab === 'students' ? 'active' : ''}`}>
                <Users size={20} /> Schüler
              </button>
              <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? 'active' : ''}`}>
                <Shield size={20} /> Team
              </button>
              <button onClick={() => setActiveStudentTab('rooms')} className={`sidebar-item ${activeStudentTab === 'rooms' ? 'active' : ''}`}>
                <Box size={20} /> Räume
              </button>
              <button onClick={() => setActiveStudentTab('songs')} className={`sidebar-item ${activeStudentTab === 'songs' ? 'active' : ''}`}>
                <Library size={20} /> Songs
              </button>
              <button onClick={() => setActiveStudentTab('bands')} className={`sidebar-item ${activeStudentTab === 'bands' ? 'active' : ''}`}>
                <Box size={20} /> Bands
              </button>
              <button onClick={() => setActiveStudentTab('stats')} className={`sidebar-item ${activeStudentTab === 'stats' ? 'active' : ''}`}>
                <Music size={20} /> Statistik
              </button>
              <button onClick={() => setActiveStudentTab('gallery')} className={`sidebar-item ${activeStudentTab === 'gallery' ? 'active' : ''}`}>
                <QrCode size={20} /> ID Galerie
              </button>
              <button onClick={() => setActiveStudentTab('setup')} className={`sidebar-item ${activeStudentTab === 'setup' ? 'active' : ''}`}>
                <Shield size={20} /> Setup
              </button>
            </>
          )}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '16px', paddingBottom: '16px' }}>
          <div style={{ padding: '0 8px', marginBottom: '12px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <StudioAvatar src={user.photo_url} user={user} />
                  </div>
                  {session && <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{user.first_name}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {(user.role === 'teacher' || user.role === 'admin') ? 'GrooveLab Lehrer' : 'GrooveLab Schüler'}
                  </div>
                </div>
             </div>
          </div>
          <button 
            onClick={() => setActiveStudentTab('profile')} 
            className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}
            style={{ marginBottom: '4px' }}
          >
            <User size={18} /> Mein Profil
          </button>
          <button 
            onClick={() => handleLogout()}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}
          >
            <LogOut size={18} color="#ef4444" /> Abmelden
          </button>
        </div>
      </aside>

      <div className="main-wrapper" style={{ paddingTop: '0' }}>
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', height: '80px', background: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Common Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               {/* Location Pill */}
               <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: getRoleColor(user?.role, session?.stations?.name), 
                padding: '8px 16px', borderRadius: '12px', 
                boxShadow: `0 4px 12px ${getRoleColor(user?.role, session?.stations?.name)}30`
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') ? (session?.stations?.name || 'Coach Modus') : (locationMode === 'lab' ? `Labor (${session?.stations?.name || 'iPad'})` : 'Home')}
                </span>
              </div>

              {/* Lab Count Pill */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: '#22c55e', padding: '8px 16px', borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeStudentsCount} im Lab</span>
              </div>
            </div>

            {/* Ausweis Button (Only Student) */}
            {user.role === 'student' && (
              <button onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                <span style={{ color: '#eab308', fontWeight: 800, fontSize: '0.85rem' }}>Ausweis</span>
                <QrCode size={18} color="#eab308" />
              </button>
            )}

            {/* User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '16px', borderLeft: '1px solid #f1f5f9' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>Hallo {user.first_name}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  {(user.role === 'teacher' || user.role === 'admin') ? 'GrooveLab Lehrer' : 'GrooveLab Schüler'}
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', border: '3px solid white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              </div>
              {/* Elegant Logout Button next to avatar */}
              <button 
                onClick={() => handleLogout()}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: '#fff1f2', 
                  border: '1px solid #ffe4e6', 
                  padding: '8px 14px', 
                  borderRadius: '12px', 
                  color: '#f43f5e', 
                  fontWeight: 800, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.08)'
                }}
                className="hover-scale"
                title="Abmelden"
              >
                <LogOut size={14} color="#f43f5e" />
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </header>


      <main className="main-content" style={{ overflow: 'auto' }}>
        {/* Live Lab Tab for Students */}
        {user.role === 'student' && activeStudentTab === 'live' && (
          <ErrorBoundary>
            <div className="animation-slide-up" style={{ width: '100%', padding: '0px 48px 48px 48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', marginTop: '16px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', margin: 0 }}>Live Lab</h1>
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  style={{
                    background: 'white',
                    border: '1.5px solid #e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale"
                >
                  {isSidebarCollapsed ? (
                    <>
                      <ChevronLeft size={16} /> Sidebar einblenden
                      {sidebarNotificationsCount > 0 && (
                        <span style={{
                          background: '#ef4444',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          borderRadius: '10px',
                          padding: '2px 6px',
                          minWidth: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                          animation: 'pulse 1.5s infinite',
                          marginLeft: '4px'
                        }}>
                          {sidebarNotificationsCount}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Sidebar ausblenden <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
              <TeacherDashboard 
                userId={user.id} 
                hideHeader={true} 
                viewMode="student" 
                onTabChange={setActiveStudentTab}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                onSidebarNotificationsChange={setSidebarNotificationsCount}
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
        )}

        {/* Profile Tab */}
        {activeStudentTab === 'profile' && (
          <ErrorBoundary>
            <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
              {/* Top: Massive Hero Card */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', display: 'flex', overflow: 'hidden', minHeight: '340px' }}>
                <div style={{ flex: '0 0 40%', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  <StudioAvatar src={user.photo_url} user={user} style={{ display: user.photo_url || !user.first_name ? 'block' : 'none' }} />
                  {!user.photo_url && user.first_name && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', color: 'white', background: brandColor, fontWeight: 800 }}>
                      {user.first_name?.[0]}
                    </div>
                  )}
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
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro Artist</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 700 }}>{user.schools?.name || 'Groovelab Academy'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>• Mitglied seit {new Date(user.created_at).toLocaleDateString()}</span>

                    <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                      <Star size={12} fill="white" /> {userSongs.filter(s => s.progress === 100).length * 100} XP
                    </div>
                  </div>
                  <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
                    {user.first_name} {user.last_name?.[0]}.
                  </h1>

                  {/* Instrument Master Counters */}
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
                  <div style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Skill Radar */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#f59e0b' }}><Music size={24} /></div>
                        Skill Radar
                      </h3>
                      <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={studentRadarData}>
                            <PolarGrid stroke="#f1f5f9" />
                            <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}>
                                {payload.value}
                              </text>
                            )} />
                            <Radar name="XP" dataKey="xp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
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

                          const activeDays = dayConfigs.filter(d => hours[d.key]?.active);
                          
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
                                    if (h?.active && h.start && h.start < minTime) minTime = h.start;
                                    if (h?.active && h.end && h.end > maxTime) maxTime = h.end;
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
                                return (
                                  <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                                      Anwesende Coaches diese Woche:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'nowrap' }}>
                                      {teacherPresences.map((pres, idx) => (
                                        <div key={idx} style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '8px', 
                                          background: '#f8fafc', 
                                          border: '1px solid #f1f5f9', 
                                          padding: '8px 12px', 
                                          borderRadius: '12px',
                                          flex: '1 1 0px',
                                          minWidth: '0'
                                        }}>
                                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}></div>
                                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${pres.teacherName} — ${pres.day}. ${pres.rangeStr}`}>
                                            <span style={{ color: '#1e293b', fontWeight: 900 }}>{pres.teacherName}</span> — {pres.day}. {pres.rangeStr}
                                          </div>
                                        </div>
                                      ))}
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
                  <div style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', gap: '24px', paddingBottom: '32px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1.5fr 1fr', gap: '24px', paddingBottom: '32px' }}>
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

                          const activeDays = dayConfigs.filter(d => hours[d.key]?.active);
                          
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
                                    if (h?.active && h.start && h.start < minTime) minTime = h.start;
                                    if (h?.active && h.end && h.end > maxTime) maxTime = h.end;
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
                                            if (isPlanned || hasTeacher) {
                                              // Solid brand gold-amber für eigene geplante Zeiten und andere Coaches (eine Farbe uni)
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
                                            }

                                            // 2. Determine Inner Content (Student Count)
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
                                return (
                                  <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                                      Anwesende Coaches diese Woche:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'nowrap' }}>
                                      {teacherPresences.map((pres, idx) => (
                                        <div key={idx} style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '8px', 
                                          background: '#f8fafc', 
                                          border: '1px solid #f1f5f9', 
                                          padding: '8px 12px', 
                                          borderRadius: '12px',
                                          flex: '1 1 0px',
                                          minWidth: '0'
                                        }}>
                                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}></div>
                                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${pres.teacherName} — ${pres.day}. ${pres.rangeStr}`}>
                                            <span style={{ color: '#1e293b', fontWeight: 900 }}>{pres.teacherName}</span> — {pres.day}. {pres.rangeStr}
                                          </div>
                                        </div>
                                      ))}
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
                  </div>
                </>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* Admin/Teacher Section Tabs (Unified) */}
        {((user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'teacher')) && ['live', 'students', 'team', 'rooms', 'songs', 'stats', 'gallery', 'setup', 'bands'].includes(activeStudentTab) && (
          <ErrorBoundary key={activeStudentTab}>
            <AdminDashboard 
              userId={user.id} 
              onLogout={handleLogout} 
              forceTab={activeStudentTab}
              onTabChange={(tabId) => setActiveStudentTab(tabId)}
              onOpenBandProfile={(band) => {
                setSelectedBandForProfile(band);
                setShowBandProfile(true);
              }}
            />
          </ErrorBoundary>
        )}

        {/* Messages Tab (Apple Mail style) */}
        {activeStudentTab === 'messages' && user?.show_messages_menu !== false && (
          user?.role?.toLowerCase() === 'student' ? (
            <ErrorBoundary>
              <div className="animation-slide-up" style={{ 
                padding: '32px', 
                display: 'flex', 
                gap: '24px', 
                height: 'calc(100vh - 140px)', 
                minHeight: '700px' 
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0' }}>Nachrichten</h3>
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
                        <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
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
                              background: isSelected ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'transparent',
                              border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
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
                                background: '#3b82f6',
                                boxShadow: '0 0 8px #3b82f6'
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
                              color: isSelected ? '#1e3a8a' : '#1e293b',
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
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#475569' }}>
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#fca5a5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#fee2e2';
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
              padding: '32px', 
              display: 'flex', 
              gap: '24px', 
              height: 'calc(100vh - 140px)', 
              minHeight: '700px' 
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0' }}>Nachrichten</h3>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>{announcements.length} Mitteilungen</div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMailComposing(true);
                      setSelectedMailMessage(null);
                    }}
                    style={{ 
                      background: '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(59,130,246,0.2)'
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
                            background: isSelected ? 'linear-gradient(135deg, #3b82f615 0%, #1d4ed808 100%)' : '#f8fafc',
                            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                            borderRadius: '16px',
                            padding: '16px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.05)' : 'none',
                            position: 'relative',
                            width: '100%'
                          }}
                          className="hover-scale"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {parsed.title}
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
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
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              background: parsed.target_type === 'all' ? '#e0f2fe' : parsed.target_type === 'students' ? '#dbeafe' : parsed.target_type === 'teachers' ? '#dcfce7' : '#f3e8ff',
                              color: parsed.target_type === 'all' ? '#0369a1' : parsed.target_type === 'students' ? '#1d4ed8' : parsed.target_type === 'teachers' ? '#15803d' : '#7e22ce'
                            }}>
                              {parsed.target_type === 'all' ? 'Alle' : parsed.target_type === 'students' ? 'Schüler' : parsed.target_type === 'teachers' ? 'Lehrer' : 'Auswahl'}
                            </span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0' }}>Neue Mitteilung verfassen</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>Sende eine Benachrichtigung an deine Groovelab Community</div>
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
                            background: '#f1f5f9', 
                            color: '#475569', 
                            border: 'none', 
                            padding: '10px 20px', 
                            borderRadius: '12px', 
                            fontWeight: 800, 
                            cursor: 'pointer' 
                          }}
                          className="hover-scale"
                        >
                          Verwerfen
                        </button>
                        <button 
                          type="submit" 
                          style={{ 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                            color: 'white', 
                            border: 'none', 
                            padding: '10px 24px', 
                            borderRadius: '12px', 
                            fontWeight: 800, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(59,130,246,0.2)'
                          }}
                          className="hover-scale"
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
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>An (Empfänger)</label>
                        <select 
                          value={announcementTarget} 
                          onChange={e => {
                            setAnnouncementTarget(e.target.value as any);
                            setSelectedTargetUserIds([]);
                          }}
                          style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 850, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
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
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Betreff</label>
                        <input 
                          required 
                          placeholder="Betreffzeile eintragen..." 
                          value={announcementTitle} 
                          onChange={e => setAnnouncementTitle(e.target.value)} 
                          style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: '0.95rem', outline: 'none' }} 
                        />
                      </div>

                      {/* Message Body Field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inhalt</label>
                        <textarea 
                          required 
                          placeholder="Schreibe deine Nachricht hier..." 
                          value={announcementMessage} 
                          onChange={e => setAnnouncementMessage(e.target.value)} 
                          style={{ 
                            padding: '18px', 
                            borderRadius: '14px', 
                            border: '1px solid #e2e8f0', 
                            background: '#f8fafc', 
                            fontWeight: 600, 
                            fontSize: '0.95rem', 
                            resize: 'none',
                            flex: 1,
                            outline: 'none',
                            lineHeight: 1.6
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
                                {user.first_name} {user.last_name || ''}
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
                      <Mail size={36} style={{ strokeWidth: 1.5, color: '#3b82f6' }} />
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Willkommen im Postfach</h3>
                    <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '360px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                      Wähle eine Mitteilung aus der Liste aus, um die Lesedetails anzuzeigen, oder schreibe eine neue Nachricht an deine Community.
                    </p>
                    <button
                      onClick={() => setIsMailComposing(true)}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.2)'
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
          )
        )}

        {/* Practice Tab */}
        {activeStudentTab === 'practice' && (
          <ErrorBoundary>
            <section className="exercises-section animation-slide-up" style={{ padding: '20px' }}>
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
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#10b981' }}><Award size={32} /></div>
                  Dein Repertoire
                </h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>Hier sind deine Meisterleistungen. Du hast diese Songs zu 100% gemeistert!</p>
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
            </section>
          </ErrorBoundary>
        )}


        {/* Band Matching Tab (The Wall) */}
        {activeStudentTab === 'matching' && (
          <ErrorBoundary>
            <section className="exercises-section animation-slide-up" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: '#f59e0b' }}><Users size={32} /></div>
                      Band Matching
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Finde deine Mitmusiker für deine 100% Songs!</p>
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
                                
                                const sortedMembers = [...(form?.members || [])].sort((a, b) => 
                                  new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
                                );
                                const leader = sortedMembers[0];
                                const isLeader = (form?.members || []).some((m: any) => m?.user_id === user?.id);

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
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
                                  <button 
                                    onClick={() => {
                                      // Open naming modal
                                      console.log('[DEBUG-Groovelab] setSuggestingSkill (Matching Board click) in App.tsx');
                                      setSuggestingSkill({
                                        ...mySlot,
                                        isLeader,
                                        leaderName: isLeader ? 'Du' : leader?.first_name || 'Dein Teamkollege',
                                        song_id: song.song_id,
                                        songs: { id: song.song_id, title: song.title },
                                        formation_group: form.id,
                                        members: form.members
                                      });
                                      if (isLeader && !foundingName) setFoundingName(generateRandomBandName());
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
            <section className="exercises-section animation-slide-up" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ color: '#3b82f6' }}><Box size={32} /></div>
                  Band Projekte
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
                            if (bs.status !== 'active' && bs.status !== 'proposal') return;
                            
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
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Library size={32} color={brandColor} />
                  Songbibliothek
                </h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>Entdecke neue Songs und füge sie deinem Üben-Board hinzu.</p>
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
                      onMouseEnter={e => { if (libraryAlphaFilter !== letter) e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={e => { if (libraryAlphaFilter !== letter) e.currentTarget.style.background = 'transparent'; }}
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
                  filteredLibrary.map((song: any) => (
                <div key={song.id} className="glass-panel" style={{ padding: '24px', background: 'white', borderLeft: `4px solid ${brandColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{song.artist}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{song.title}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Level {song.level}</span>
                      {song.media_link && (
                        <a href={song.media_link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={12} /> Noten / Media
                        </a>
                      )}
                    </div>
                  </div>
                  {userSongs.some(us => us.song_id === song.id) ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.8rem' }}>
                      <Check size={20} /> Hinzugefügt
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAddSongToRepertoire(song)}
                      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
                    >
                      <Plus size={20} color={brandColor} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)' }}>Üben</span>
                    </button>
                  )}
                </div>
              ))
             )}
            </div>
            </section>
          </ErrorBoundary>
        )}



        {/* Team Tab */}
        {user.role?.toLowerCase() === 'student' && activeStudentTab === 'team' && (
          <ErrorBoundary>
            <div className="tab-content animation-slide-up" style={{ padding: '20px 0' }}>
              <div className="stats-panel-premium" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
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
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.06)';
                        e.currentTarget.style.borderColor = `${brandColor}30`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#f1f5f9';
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
            </div>
          </ErrorBoundary>
        )}
      </main>




      {/* Confetti Modal */}
      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
          <Confetti width={width} height={height} />
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--text-main)' }}>🎉 Glückwunsch!</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Du hast eine vollständige Band für den Song<br/>
              <strong>{showConfetti.bands?.band_songs?.[0]?.songs?.title || 'deinen neuen Song'}</strong><br/>
              gefunden!
            </p>
            <button onClick={clearConfetti} style={{ background: brandColor, color: 'white', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Help FAB (Only for students in Lab Mode with active station) */}
      {user && user.role === 'student' && locationMode === 'lab' && session?.station_id && (
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
                        {teachers.map(t => {
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
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
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
                      
                      const skillInst = normalizeInstrument(suggestingSkill.instrument);
                      const memberInst = normalizeInstrument(myMember.instrument);
                      if (skillInst !== memberInst) return false;

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
                          Keine deiner Bands sucht derzeit dieses Instrument oder du spielst in der Band ein anderes Instrument.
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
                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = brandColor; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
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
                            localStorage.setItem(`groovelab_founding_ignored_${user.id}_${sId}`, 'true');
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
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
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
        <QRCodeModal user={user} onClose={() => setShowQR(false)} />
      )}
      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" style={{ display: windowWidth <= 1024 ? 'flex' : 'none' }}>
        {user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher' ? (
          <>
            {/* Live Lab (special highlighted button) */}
            <button 
              onClick={() => setActiveStudentTab('live')} 
              style={{ 
                background: activeStudentTab === 'live' ? '#fef3c7' : '#ffffff', 
                border: activeStudentTab === 'live' ? 'none' : '1px solid #e2e8f0', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '2px', 
                color: activeStudentTab === 'live' ? '#b45309' : '#64748b', 
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '16px',
                boxShadow: activeStudentTab === 'live' ? '0 4px 12px rgba(234, 179, 8, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                flex: '0 0 auto',
                minWidth: '72px',
                height: '52px',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              className="hover-scale"
            >
              <span style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '4px', 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#ef4444', 
                boxShadow: '0 0 8px #ef4444' 
              }} className="animate-pulse"></span>
              <Monitor size={20} color={activeStudentTab === 'live' ? '#b45309' : '#64748b'} />
              <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.01em' }}>Live Lab</span>
            </button>

            {/* Nachrichten */}
            <button onClick={() => setActiveStudentTab('messages')} className={activeStudentTab === 'messages' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'messages' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Mail size={20} />
                {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '-4px', 
                    right: '-8px', 
                    background: '#ef4444', 
                    color: 'white', 
                    fontSize: '0.55rem', 
                    fontWeight: 900, 
                    padding: '1px 4px', 
                    borderRadius: '10px',
                    minWidth: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}>
                    {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Nachrichten</span>
            </button>

            {/* Schüler */}
            <button onClick={() => setActiveStudentTab('students')} className={activeStudentTab === 'students' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'students' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Users size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Schüler</span>
            </button>

            {/* Team */}
            <button onClick={() => setActiveStudentTab('team')} className={activeStudentTab === 'team' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'team' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Shield size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Team</span>
            </button>

            {/* Räume */}
            <button onClick={() => setActiveStudentTab('rooms')} className={activeStudentTab === 'rooms' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'rooms' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Box size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Räume</span>
            </button>

            {/* Songs */}
            <button onClick={() => setActiveStudentTab('songs')} className={activeStudentTab === 'songs' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'songs' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Library size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Songs</span>
            </button>

            {/* Bands */}
            <button onClick={() => setActiveStudentTab('bands')} className={activeStudentTab === 'bands' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'bands' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Box size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bands</span>
            </button>

            {/* Statistik */}
            <button onClick={() => setActiveStudentTab('stats')} className={activeStudentTab === 'stats' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'stats' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Music size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Statistik</span>
            </button>

            {/* ID Galerie */}
            <button onClick={() => setActiveStudentTab('gallery')} className={activeStudentTab === 'gallery' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'gallery' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <QrCode size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>ID Galerie</span>
            </button>

            {/* Setup */}
            <button onClick={() => setActiveStudentTab('setup')} className={activeStudentTab === 'setup' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'setup' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Settings size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Setup</span>
            </button>
          </>
        ) : (
          <>
            {/* Student Bottom Navigation (Original) */}
            <button 
              onClick={() => setActiveStudentTab('live')} 
              style={{ 
                background: activeStudentTab === 'live' ? '#fef3c7' : '#ffffff', 
                border: activeStudentTab === 'live' ? 'none' : '1px solid #e2e8f0', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '2px', 
                color: activeStudentTab === 'live' ? '#b45309' : '#64748b', 
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '16px',
                boxShadow: activeStudentTab === 'live' ? '0 4px 12px rgba(234, 179, 8, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                flex: '0 0 auto',
                minWidth: '72px',
                height: '52px',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              className="hover-scale"
            >
              <span style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '4px', 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#ef4444', 
                boxShadow: '0 0 8px #ef4444' 
              }} className="animate-pulse"></span>
              <Monitor size={20} color={activeStudentTab === 'live' ? '#b45309' : '#64748b'} />
              <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.01em' }}>Live Lab</span>
            </button>

            <button onClick={() => setActiveStudentTab('practice')} className={activeStudentTab === 'practice' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'practice' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Play size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Üben</span>
            </button>

            <button onClick={() => setActiveStudentTab('library')} className={activeStudentTab === 'library' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'library' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Library size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bibliothek</span>
            </button>

            <button onClick={() => setActiveStudentTab('repertoire')} className={activeStudentTab === 'repertoire' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'repertoire' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Award size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Repertoire</span>
            </button>

            <button onClick={() => setActiveStudentTab('matching')} className={activeStudentTab === 'matching' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'matching' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Users size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Band-Matching</span>
            </button>

            <button onClick={() => setActiveStudentTab('bands')} className={activeStudentTab === 'bands' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'bands' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Box size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bands</span>
            </button>

            {user?.show_messages_menu !== false && (
              <button 
                onClick={() => setActiveStudentTab('messages')} 
                className={activeStudentTab === 'messages' ? 'active' : ''} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px', 
                  color: activeStudentTab === 'messages' ? brandColor : '#94a3b8', 
                  cursor: 'pointer'
                }}
              >
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Megaphone size={20} />
                  {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length > 0 && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '-4px', 
                      right: '-8px', 
                      background: '#ef4444', 
                      color: 'white', 
                      fontSize: '0.55rem', 
                      fontWeight: 900, 
                      padding: '1px 4px', 
                      borderRadius: '10px',
                      minWidth: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                    }}>
                      {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Nachrichten</span>
              </button>
            )}

            <button onClick={() => setActiveStudentTab('profile')} className={activeStudentTab === 'profile' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'profile' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Shield size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Profil</span>
            </button>

            <button onClick={() => setActiveStudentTab('team')} className={activeStudentTab === 'team' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: activeStudentTab === 'team' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
              <Music size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Team</span>
            </button>
          </>
        )}
      </nav>
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
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <form onSubmit={handleUpdateProfile} className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h2>
              <button type="button" onClick={() => setShowEditProfile(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {user.role === 'student' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                      <input required value={editingProfile.first_name || ''} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Anfangsbuchstabe Nachname</label>
                      <input required maxLength={1} value={editingProfile.last_name || ''} onChange={e => {
                        const val = e.target.value.trim().substring(0, 1).toUpperCase();
                        setEditingProfile({...editingProfile, last_name: val});
                      }} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                  </div>


                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                      <input required value={editingProfile.first_name || ''} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                      <input required value={editingProfile.last_name || ''} onChange={e => setEditingProfile({...editingProfile, last_name: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Instrumente (Icons anklicken):</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                        const isSelected = (editingProfile.instrument || '').includes(inst);
                        return (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => {
                              const current = (editingProfile.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                              const next = current.includes(inst) ? current.filter((s: string) => s !== inst) : [...current, inst];
                              setEditingProfile({...editingProfile, instrument: next.join(', ')});
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '14px', 
                              border: `2px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                              background: isSelected ? `${brandColor}10` : 'white',
                              color: isSelected ? '#1e293b' : '#64748b',
                              fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ fontSize: '1.2rem' }}>{APP_INSTRUMENT_ICONS[inst]}</span> {inst}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musikalischer Werdegang (Bio)</label>
                    <textarea placeholder="Erzähle etwas über deinen Werdegang..." value={editingProfile.bio || ''} onChange={e => setEditingProfile({...editingProfile, bio: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 500, minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.5 }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Expertise & Stile</label>
                      <input placeholder="z.B. Jazz, Rock, Metal..." value={editingProfile.expertise || ''} onChange={e => setEditingProfile({...editingProfile, expertise: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bands & Projekte</label>
                      <input placeholder="Aktuelle Bands..." value={editingProfile.bands || ''} onChange={e => setEditingProfile({...editingProfile, bands: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Equipment / Gear</label>
                      <input placeholder="Dein Setup..." value={editingProfile.gear || ''} onChange={e => setEditingProfile({...editingProfile, gear: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Aktuell im Ohr</label>
                      <input placeholder="Was hörst du gerade?" value={editingProfile.listening || ''} onChange={e => setEditingProfile({...editingProfile, listening: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '18px', borderRadius: '20px', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', boxShadow: `0 10px 30px ${brandColor}30` }}>Speichern</button>
                <button type="button" onClick={() => setShowEditProfile(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '18px', borderRadius: '20px', fontWeight: 800, cursor: 'pointer' }}>Abbrechen</button>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#09090b', overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
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
           <div className="animation-scale-up" style={{ width: '100%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '40px' }}>
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
                            const { error } = await supabase.from('users').update({ photo_url: av.url }).eq('id', user.id);
                            if (!error) {
                              setUser({...user, photo_url: av.url});
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
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: brandColor,
                    WebkitAppearance: 'none'
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
