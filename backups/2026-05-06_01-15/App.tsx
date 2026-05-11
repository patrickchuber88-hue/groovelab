import React, { useState, useEffect } from 'react';
import { Music, AlertCircle, Play, Library, Shield, LogOut, Award, Users, User, Monitor, X, Camera, Clock, QrCode, Plus, ExternalLink, BarChart, Star, Box, Settings, Lock, Pencil, Trash2, Zap, RotateCcw, Check, CheckCircle, ChevronRight, ChevronDown, ChevronUp, Search, Mic, Calendar, PlayCircle, Youtube } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell
} from 'recharts';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import BandProfileContent from './components/BandProfileContent';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { QRCodeModal } from './components/QRCodeModal';
import { DeviceSetupScreen } from './components/DeviceSetupScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import './App.css';

const APP_INSTRUMENT_ICONS: Record<string, string> = { 
  "Guitar": "🎸", "E-Gitarre": "🎸",
  "Bass": "🎸", "E-Bass": "🎸", 
  "Drums": "🥁", "E-Drums": "🥁", 
  "Vocals": "🎤", 
  "Piano": "🎹", "E-Piano": "🎹", "Keys": "🎹",
  "Musik": "🎼"
};
const APP_INSTRUMENT_COLORS: Record<string, string> = { 
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#f59e0b", "E-Bass": "#f59e0b", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#22c55e", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};
const brandColor = "#eab308";

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
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: any) {
    return { hasError: true };
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
          <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '32px' }}>
            Beim Laden dieses Bereichs ist ein Fehler aufgetreten. Keine Sorge, deine Daten sind sicher!
          </p>
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

function GroupedSongCard({ songGroup, onUpdateProgress, onSubmitForApproval, isBandReady, onDelete }: any) {
  const [activeDifficulty, setActiveDifficulty] = useState('original'); // 'starter' | 'original'
  
  const currentLevelSkills = songGroup.skills.filter((s: any) => s.difficulty_level === activeDifficulty);
  const otherLevelSkills = songGroup.skills.filter((s: any) => s.difficulty_level !== activeDifficulty);

  // Generate all required slots based on song instrumentation
  const instrumentation = songGroup.instrumentation || {};
  const slots: any[] = [];
  
  Object.entries(instrumentation).forEach(([inst, count]) => {
    // Rule 1: Exclude Vocals
    if (inst.toLowerCase().includes('vocals') || inst.toLowerCase().includes('gesang')) return;
    
    for (let i = 1; i <= (count as number); i++) {
      slots.push({ instrument: inst, partNumber: i });
    }
  });

  // If instrumentation is empty (legacy), fallback to existing skills
  if (slots.length === 0) {
    const uniqueInsts = Array.from(new Set(songGroup.skills.map((s: any) => s.instrument)));
    uniqueInsts.forEach(inst => {
       if (!inst.toLowerCase().includes('vocals')) {
         slots.push({ instrument: inst, partNumber: 1 });
       }
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

  // Rule 2: Enforce Order (Gitarre, Drums, Piano, Bass)
  slots.sort((a, b) => {
    const baseA = getBaseInst(a.instrument);
    const baseB = getBaseInst(b.instrument);
    
    const orderMap: Record<string, number> = { 'Guitar': 1, 'Drums': 2, 'Piano': 3, 'Bass': 4 };
    const idxA = orderMap[baseA] || 99;
    const idxB = orderMap[baseB] || 99;
    
    if (idxA !== idxB) return idxA - idxB;
    return a.partNumber - b.partNumber;
  });

  // Map slots to existing skills or mocks
  const displaySkills = slots.map(slot => {
    const existing = currentLevelSkills.find((s: any) => 
      s.instrument === slot.instrument && (s.part_number || 1) === slot.partNumber
    );
    if (existing) return existing;
    return {
      id: `mock-${songGroup.song_id}-${slot.instrument}-${slot.partNumber}-${activeDifficulty}`,
      song_id: songGroup.song_id,
      instrument: slot.instrument,
      part_number: slot.partNumber,
      difficulty_level: activeDifficulty,
      progress: 0,
      is_stage_ready: false,
      is_pending_approval: false,
      isMock: true
    };
  });

  const [activeSlotId, setActiveSlotId] = useState(() => {
    const pending = displaySkills.find((s: any) => s?.is_pending_approval);
    if (pending) return pending.id;
    return displaySkills[0]?.id || '';
  });

  // Update active slot if it disappears
  useEffect(() => {
    if (displaySkills.length > 0 && !displaySkills.find((s: any) => s?.id === activeSlotId)) {
      setActiveSlotId(displaySkills[0]?.id || '');
    }
  }, [activeDifficulty, displaySkills, activeSlotId]);

  const activeSkill = displaySkills.find((s: any) => s?.id === activeSlotId) || displaySkills[0] || { progress: 0 };

  return (
    <div className={`glass-panel animation-slide-up ${isBandReady ? 'band-ready' : ''} ${activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? 'challenge-glow' : ''}`} style={{ 
      padding: '24px', 
      position: 'relative', 
      overflow: 'hidden', 
      borderRadius: '24px', 
      display: 'flex', 
      alignItems: 'center', 
      marginBottom: '16px', 
      background: 'white', 
      borderLeft: `6px solid ${isBandReady ? '#f59e0b' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || '#cbd5e1')}`,
      boxShadow: activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? `0 0 20px ${brandColor}33` : '0 4px 20px rgba(0,0,0,0.03)'
    }}>
      {activeSkill.progress >= 90 && !activeSkill.is_stage_ready && (
        <style>{`
          .challenge-glow {
            animation: border-pulse 2s infinite ease-in-out;
          }
          @keyframes border-pulse {
            0% { box-shadow: 0 0 10px ${brandColor}22; }
            50% { box-shadow: 0 0 25px ${brandColor}55; }
            100% { box-shadow: 0 0 10px ${brandColor}22; }
          }
        `}</style>
      )}
      
      {/* Band Song Stamp */}
      {songGroup.isBandSong && (
        <div style={{ 
          position: 'absolute', 
          top: '12px', 
          right: '12px', 
          background: '#f59e0b', 
          color: 'white', 
          fontSize: '0.65rem', 
          fontWeight: 900, 
          padding: '4px 10px', 
          borderRadius: '100px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          zIndex: 10
        }}>
          <Users size={10} fill="white" /> Band Song
        </div>
      )}
      
      {/* Left: Song Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '260px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          {songGroup.tomplay_url || songGroup.media_link ? (
            <a 
              href={songGroup.tomplay_url || songGroup.media_link} 
              target="_blank" 
              rel="noreferrer" 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: '#1e293b', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title="Noten öffnen"
            >
              <Library size={24} />
            </a>
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b' }}>
              <Music size={24} />
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{songGroup.artist}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px', marginBottom: '8px' }}>{songGroup.title}</div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Difficulty Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
              <button 
                onClick={() => setActiveDifficulty('starter')}
                style={{ 
                  background: activeDifficulty === 'starter' ? 'white' : 'transparent',
                  color: activeDifficulty === 'starter' ? '#10b981' : '#64748b',
                  border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: activeDifficulty === 'starter' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}>
                Starter
              </button>
              <button 
                onClick={() => setActiveDifficulty('original')}
                style={{ 
                  background: activeDifficulty === 'original' ? 'white' : 'transparent',
                  color: activeDifficulty === 'original' ? '#f59e0b' : '#64748b',
                  border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: activeDifficulty === 'original' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}>
                Pro
              </button>
            </div>
            
            {/* Sheet Link if available */}
            {songGroup.tomplay_url && (
              <a 
                href={songGroup.tomplay_url} 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  padding: '6px', 
                  borderRadius: '10px', 
                  background: '#f8fafc', 
                  color: '#1e293b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none'
                }}
                className="hover-scale"
                title="Noten-Direktlink"
              >
                <Music size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Compact Instrument Icons */}
      <div style={{ display: 'flex', gap: '12px', padding: '0 32px', borderRight: '1px solid #f1f5f9', flexShrink: 0, flexWrap: 'wrap', maxWidth: '240px' }}>
        {displaySkills.map(skill => {
          const isAct = skill.id === activeSlotId;
          let instColor = APP_INSTRUMENT_COLORS[skill.instrument] || brandColor;
          
          return (
            <div key={skill.id} onClick={() => setActiveSlotId(skill.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ 
                position: 'relative',
                width: '40px', height: '40px', borderRadius: '12px', 
                background: isAct ? instColor : '#f1f5f9', 
                color: isAct ? 'white' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isAct ? `0 4px 12px ${instColor}44` : 'none',
                transform: isAct ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{APP_INSTRUMENT_ICONS[skill.instrument] || APP_INSTRUMENT_ICONS[getBaseInst(skill.instrument)] || '🎵'}</span>
                
                {/* Part Number Badge - ALWAYS SHOW if more than 1 of same base type */}
                {(slots.filter(s => getBaseInst(s.instrument) === getBaseInst(skill.instrument)).length > 1) && (
                  <div style={{ 
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: isAct ? 'white' : (APP_INSTRUMENT_COLORS[skill.instrument] || brandColor),
                    color: isAct ? (APP_INSTRUMENT_COLORS[skill.instrument] || brandColor) : 'white',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    fontSize: '0.7rem',
                    fontWeight: 950,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    border: '1.5px solid white',
                    zIndex: 10
                  }}>
                    {skill.part_number || 1}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: isAct ? instColor : '#94a3b8' }}>
                {skill.progress}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Interaction Area */}
      <div style={{ flex: 1, paddingLeft: '40px', display: 'flex', alignItems: 'center', gap: '20px', paddingRight: '20px', position: 'relative' }}>
        <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
          {activeSkill.is_pending_approval ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #a855f7, #8b5cf6)', padding: '16px 24px', borderRadius: '20px', color: 'white', fontWeight: 900, fontSize: '1rem', width: '100%', boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.4)' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}><Clock size={24} /></div>
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>Challenge eingereicht.</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 700 }}>Mach dich bereit für die Abnahme!</div>
              </div>
            </div>
          ) : activeSkill.is_stage_ready ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '16px 24px', borderRadius: '20px', color: 'white', fontWeight: 900, fontSize: '1rem', width: '100%', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}><Award size={24} /></div>
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>100 % erreicht - Starke Leistung!</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 700 }}>Du bist bereit für eine Band.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%' }}>
              {/* Slider Area */}
              <div style={{ flex: 1, position: 'relative', height: '48px', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', top: -15, left: `${activeSkill.progress}%`, transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 900, color: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, whiteSpace: 'nowrap', transition: 'left 0.1s linear' }}>
                  {activeSkill.progress >= 90 ? 'Ready for Challenge!' : `${activeSkill.progress}% Fortschritt`}
                </div>
                
                <div style={{ position: 'relative', width: '100%', height: '48px', display: 'flex', alignItems: 'center' }}>
                  {/* Markers */}
                  {[0, 30, 60, 90, 100].map(mark => (
                    <div key={mark} style={{ position: 'absolute', left: `${mark}%`, top: '50%', transform: 'translate(-50%, -50%)', height: '14px', width: '2px', background: '#cbd5e1', zIndex: 1 }}>
                      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>
                        {mark}%
                      </div>
                    </div>
                  ))}
                  
                  {/* Visual Track */}
                  <div style={{ position: 'absolute', left: 0, right: 0, height: '8px', background: '#f1f5f9', borderRadius: '4px', zIndex: 2 }}>
                    <div style={{ width: `${activeSkill.progress}%`, height: '100%', background: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, borderRadius: '4px', transition: 'width 0.1s linear' }}></div>
                  </div>

                  {/* Handle (Circle) */}
                  <div style={{ 
                    position: 'absolute', 
                    left: `${activeSkill.progress}%`, 
                    width: '20px', 
                    height: '20px', 
                    background: 'white', 
                    border: `4px solid ${APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor}`, 
                    borderRadius: '50%', 
                    transform: 'translateX(-50%)', 
                    zIndex: 4, 
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    transition: 'left 0.1s linear',
                    pointerEvents: 'none'
                  }} />

                  {/* Real Range Input */}
                  <input 
                    type="range" 
                    min="0" 
                    max="90" 
                    step="5"
                    value={activeSkill.progress >= 90 ? 90 : activeSkill.progress} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onUpdateProgress(activeSkill.id, val, activeSkill.isMock ? { 
                        songId: activeSkill.song_id, 
                        instrument: activeSkill.instrument, 
                        difficulty: activeSkill.difficulty_level,
                        partNumber: activeSkill.part_number
                      } : undefined);
                    }}
                    style={{ 
                      position: 'absolute', left: 0, right: 0, width: '100%', height: '40px', 
                      opacity: 0, zIndex: 5, cursor: activeSkill.progress >= 90 ? 'default' : 'pointer',
                      pointerEvents: activeSkill.progress >= 90 ? 'none' : 'auto'
                    }} 
                  />
                </div>
              </div>

              {/* Challenge Button */}
              {activeSkill.progress >= 90 && (
                <button 
                  onClick={() => onSubmitForApproval({ ...activeSkill, part_number: activeSkill.part_number })}
                  className="pulse"
                  style={{ 
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px -5px rgba(245, 158, 11, 0.5)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Zap size={16} fill="white" /> CHALLENGE STARTEN
                </button>
              )}
              
              {/* Custom Thumb Style */}
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  appearance: none;
                  height: 24px;
                  width: 24px;
                  border-radius: 50%;
                  background: white;
                  border: 4px solid #f1f5f9;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  cursor: pointer;
                  margin-top: -9px;
                }
                input[type=range]::-moz-range-thumb {
                  height: 24px;
                  width: 24px;
                  border-radius: 50%;
                  background: white;
                  border: 4px solid #f1f5f9;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  cursor: pointer;
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons & Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(songGroup.song_id);
          }}
          style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', transition: 'all 0.2s' }} 
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} 
          onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
        >
          <Trash2 size={24} />
        </button>
      </div>

    </div>
  );
}


function App() {
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => sessionStorage.getItem('groovelab_user_id'));
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [totalPresenceMins, setTotalPresenceMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !user) return;
    
    const { error } = await supabase.from('users').update({
      first_name: editingProfile.first_name,
      last_name: editingProfile.last_name,
      photo_url: editingProfile.photo_url,
      instrument: editingProfile.instrument
    }).eq('id', user.id);
    
    if (error) alert('Fehler beim Aktualisieren: ' + error.message);
    else {
      setShowEditProfile(false);
      // Refresh local user state
      const { data: updatedUser } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
      if (updatedUser) setUser(updatedUser);
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
  const [selectedMatchingInsts, setSelectedMatchingInsts] = useState<Record<string, string>>({});
  const [activeBandSubTab, setActiveBandSubTab] = useState<'meine' | 'alle'>('meine');
  const [bandSearchText, setBandSearchText] = useState('');
  const [bandSearchLetter, setBandSearchLetter] = useState<string | null>(null);
  const [expandedMatchingSong, setExpandedMatchingSong] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [locationMode, setLocationMode] = useState<'lab' | 'home'>(() => (sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home');
  const [personalRejections] = useState<any[]>([]);
  const [teachers] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [showBandNaming, setShowBandNaming] = useState(false);
  const [namingTarget, setNamingTarget] = useState<{song: any, form: any} | null>(null);
  const [showBandConsent, setShowBandConsent] = useState(false);
  const [consentTarget, setConsentTarget] = useState<{song: any, form: any} | null>(null);
  const [showEditBand, setShowEditBand] = useState(false);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showBandProfile, setShowBandProfile] = useState(() => localStorage.getItem('groovelab_show_band_profile') === 'true');
  const [bandProfileView, setBandProfileView] = useState<'public' | 'backstage'>(() => (localStorage.getItem('groovelab_band_profile_view') as any) || 'public');
  const [selectedBandForProfile, setSelectedBandForProfile] = useState<any>(null);
  const [restoredBandId] = useState(() => localStorage.getItem('groovelab_selected_band_id'));
  const [suggestingSkill, setSuggestingSkill] = useState<any>(null);
  
  // AUTO-PROMPT LOGIC: Detect when a song was newly approved (is_stage_ready becomes true)
  useEffect(() => {
    if (user?.id && userSongs.length > 0 && !suggestingSkill) {
      // Find songs that are stage_ready but haven't been prompted yet
      const readySongs = userSongs.filter(s => s.is_stage_ready);
      const storageKey = `groovelab_prompted_${user.id}`;
      const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const newReady = readySongs.find(s => !promptedIds.includes(s.id));
      
      if (newReady) {
        console.log('[AUTO-PROMPT] Newly approved song detected:', newReady.title);
        // Find the full song data for the modal
        const fullSkill = userSongs.find(s => s.id === newReady.id);
        if (fullSkill) {
          // Add songs property for the modal (which expects s.songs.title)
          const modalSkill = { ...fullSkill, songs: { title: fullSkill.title || fullSkill.songs?.title } };
          setSuggestingSkill(modalSkill);
        }
      }
    }
  }, [userSongs, user?.id, suggestingSkill]);

  const dismissSuggestion = (songSkillId: string) => {
    if (!user?.id) return;
    const storageKey = `groovelab_prompted_${user.id}`;
    const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!promptedIds.includes(songSkillId)) {
      promptedIds.push(songSkillId);
      localStorage.setItem(storageKey, JSON.stringify(promptedIds));
    }
    setSuggestingSkill(null);
  };
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
    { id: '3_1', url: '/band_avatar_3_musicians_1_1777469162449.png', size: 3 },
    { id: '3_2', url: '/band_avatar_3_musicians_2_1777469216449.png', size: 3 },
    { id: '3_3', url: '/band_avatar_3_musicians_3_1777469286463.png', size: 3 },
    { id: '4_1', url: '/band_avatar_4_musicians_1_1777469178768.png', size: 4 },
    { id: '4_2', url: '/band_avatar_4_musicians_2_1777469299351.png', size: 4 },
    { id: '4_3', url: '/band_avatar_4_musicians_3_1777469315500.png', size: 4 },
    { id: '5_1', url: '/band_avatar_5_musicians_1_1777469193682.png', size: 5 },
    { id: '5_2', url: '/band_avatar_5_musicians_2_1777469330208.png', size: 5 },
    { id: '5_3', url: '/band_avatar_5_musicians_3_1777469343103.png', size: 5 },
    { id: 'band_pop_1', url: '/avatars/band_pop_1.png', size: 3 },
    { id: 'band_rock_1', url: '/avatars/band_rock_1.png', size: 4 },
    { id: 'band_trio_1', url: '/avatars/band_trio_1.png', size: 3 },
    { id: 'band_duo_1', url: '/avatars/band_duo_1.png', size: 2 },
    { id: 'band_quartet_1', url: '/avatars/band_quartet_1.png', size: 4 },
    { id: 'band_quintet_1', url: '/avatars/band_quintet_1.png', size: 5 },
  ];

  const STUDENT_AVATARS = [
    { id: 'avatar_boy', url: '/avatar_boy.jpg' },
    { id: 'avatar_girl', url: '/avatar_girl.jpg' },
    { id: 'avatar_boy_bass', url: '/avatar_boy_bass.jpg' },
    { id: 'avatar_girl_bass', url: '/avatar_girl_bass.jpg' },
    { id: 'avatar_boy_drums', url: '/avatar_boy_drums.jpg' },
    { id: 'avatar_girl_drums', url: '/avatar_girl_drums.jpg' },
    { id: 'avatar_boy_guitar', url: '/avatar_boy_guitar.jpg' },
    { id: 'avatar_girl_guitar', url: '/avatar_girl_guitar.jpg' },
    { id: 'avatar_boy_piano', url: '/avatar_boy_piano.jpg' },
    { id: 'avatar_girl_piano', url: '/avatar_girl_piano.jpg' },
    { id: 'student_eguitar_1', url: '/avatars/student_eguitar_1.png' },
    { id: 'student_vocals_1', url: '/avatars/student_vocals_1.png' },
    { id: 'student_drums_1', url: '/avatars/student_drums_1.png' },
    { id: 'student_piano_1', url: '/avatars/student_piano_1.png' },
    { id: 'student_bass_1', url: '/avatars/student_bass_1.png' },
    { id: 'student_tech_1', url: '/avatars/student_tech_1.png' },
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
            .select('*, songs(*), band_members(*, users!user_id(*)), band_songs(songs(*)), coach:users!bands_coach_id_fkey(first_name, last_name, photo_url)')
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
      fetchDashboardData(loggedInUserId);
    }
  }, [loggedInUserId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
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

  // Realtime Session Monitor (Single Login Rule)
  useEffect(() => {
    if (!session?.id) return;

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
  }, [session?.id]);

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      console.log(`[Dashboard] Fetching data for user: ${userId}`);
      
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
        
      if (userErr) {
        console.error('[Dashboard] Error fetching user profile:', userErr);
      } else {
        setUser(userData);
      }
      
      if (!userData) {
        console.warn('[Dashboard] No user data found, aborting further fetches.');
        setLoading(false);
        return;
      }

      // Fetch latest active session
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*, stations(name)')
        .eq('user_id', userId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (sessionErr) console.error('[Dashboard] Error fetching active session:', sessionErr);
      setSession(sessionData);

      // Lade alle vergangenen Sessions für die Gesamt-Minuten
      const { data: allSessions, error: sessionsErr } = await supabase
        .from('sessions')
        .select('check_in_time, check_out_time')
        .eq('user_id', userId);
      
      if (sessionsErr) console.error('[Dashboard] Error fetching all sessions:', sessionsErr);
      if (allSessions) {
        const totalMins = allSessions.reduce((acc, s) => {
          const start = new Date(s.check_in_time);
          const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
          const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
          return acc + Math.max(0, diff);
        }, 0);
        setTotalPresenceMins(totalMins);
      }

      // Lade persönliche Song-Skills
      const { data: skillsData, error: skillsErr } = await supabase
        .from('user_song_skills')
        .select(`
          id,
          progress_percent,
          is_stage_ready,
          is_pending_approval,
          instrument,
          part_number,
          difficulty_level,
          is_favorite,
          verified_by_id,
          verified_by:users!user_song_skills_verified_by_id_fkey (
            first_name,
            last_name
          ),
          songs (
            id,
            title,
            artist,
            media_link,
            tomplay_url,
            instrumentation
          )
        `)
        .eq('user_id', userId);

      if (skillsErr) {
        console.error('Error fetching skills:', skillsErr);
      }

      const safeSkills = skillsData || [];

      if (safeSkills) {
        const formattedSongs = safeSkills.map((p: any) => {
          const song = Array.isArray(p.songs) ? p.songs[0] : p.songs;
          if (!song) return null;
          return {
            id: p.id,
            song_id: song.id,
            user_id: userId,
            title: song.title || 'Unbekannter Titel',
            artist: song.artist || 'Unbekannter Künstler',
            progress: p.is_stage_ready ? 100 : (p.progress_percent || 0),
            instrument: p.instrument,
            difficulty_level: p.difficulty_level || 'original',
            is_stage_ready: !!p.is_stage_ready,
            is_favorite: !!p.is_favorite,
            locked: !p.is_stage_ready,
            is_pending_approval: !!p.is_pending_approval,
            media_link: song.media_link,
            tomplay_url: song.tomplay_url,
            instrumentation: song.instrumentation
          };
        }).filter(Boolean);
        setUserSongs(formattedSongs);
      }

      // Lade globale Stage Ready Wall Daten (Band Matching mit Slots)
      const { data: wallData, error: wallErr } = await supabase
        .from('songs')
        .select(`
          id,
          artist,
          title,
          media_link,
          instrumentation,
          user_song_skills (
            id,
            instrument,
            difficulty_level,
            is_stage_ready,
            user_id,
            created_at,
            formation_group,
            profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
          )
        `)
        .eq('school_id', userData.school_id);

      if (wallErr) console.error('[Dashboard] Error fetching wall data:', wallErr);
      console.log('[Dashboard] Wall Data received:', wallData?.length, 'songs', 'for school:', userData.school_id);
      
      if (wallData) {
        // Get ALL founded band members to filter out taken musicians
        const { data: allMembers, error: membersErr } = await supabase
          .from('band_members')
          .select('user_id, bands(id, status, song_id, band_songs(song_id, status))');

        if (membersErr) console.error('[Dashboard] Error fetching all band members:', membersErr);
        const processedWall: any[] = [];
        
        wallData.forEach((song: any) => {
          const requiredInsts = song?.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
          
          // Filter to only STAGE READY skills from the same school
          const readySkills = (song?.user_song_skills || []).filter((s: any) => {
            const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            const isMatch = s?.is_stage_ready && prof?.school_id === userData.school_id;
            return isMatch;
          });

          if (readySkills.length > 0) {
            console.log(`[Matching] Song: ${song.title}, Ready Musicians: ${readySkills.length}`);
          }

          // Split by level
          ['starter', 'original'].forEach(level => {
            const levelSkills = readySkills.filter((s: any) => (s?.difficulty_level || 'original') === level);
            if (levelSkills.length === 0) return;

            // Filter out musicians who are already in a founded (Active) band for THIS song
            const availableMusicians = levelSkills.filter((skill: any) => {
              const isTaken = (allMembers || []).some((m: any) => {
                if (m.user_id !== skill.user_id) return false;
                const bandData = Array.isArray(m.bands) ? m.bands[0] : m.bands;
                if (!bandData) return false;
                
                // Only consider it 'Taken' if the song is ACTIVE repertoire (not just a proposal)
                const hasActiveSong = (bandData.song_id === song.id && bandData.status === 'active') || 
                                     bandData.band_songs?.some((bs: any) => bs.song_id === song.id && bs.status === 'active');
                
                return hasActiveSong;
              });
              return !isTaken;
            }).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            console.log(`[Matching] Song: ${song.title}, Level: ${level}, Total Ready: ${levelSkills.length}, Available: ${availableMusicians.length}`);

            const formationsList: any[] = [];
            
            // 1. Explicit groups
            availableMusicians.filter((s: any) => s.formation_group).forEach((skill: any) => {
              let form = formationsList.find(f => f.id === skill.formation_group);
              if (!form) {
                form = { id: skill.formation_group, members: [], memberMap: {}, level };
                formationsList.push(form);
              }
              const prof = Array.isArray(skill.profiles) ? skill.profiles[0] : skill.profiles;
              const memberObj = {
                user_id: skill.user_id,
                skill_id: skill.id,
                first_name: prof?.first_name || 'Musiker',
                photo_url: prof?.photo_url,
                instrument: skill.instrument,
                created_at: skill.created_at
              };
              form.members.push(memberObj);
              form.memberMap[skill.instrument] = memberObj;
            });

            // 2. Automatic groups
            availableMusicians.filter((s: any) => !s.formation_group).forEach((skill: any) => {
              let form = formationsList.find(f => !f.memberMap[skill.instrument] && !f.members.some((m: any) => m.user_id === skill.user_id));
              if (!form) {
                form = { id: `auto_${song.id}_${level}_${formationsList.length}`, members: [], memberMap: {}, level };
                formationsList.push(form);
              }
              const prof = Array.isArray(skill.profiles) ? skill.profiles[0] : skill.profiles;
              const memberObj = {
                user_id: skill.user_id,
                skill_id: skill.id,
                first_name: prof?.first_name || 'Musiker',
                photo_url: prof?.photo_url,
                instrument: skill.instrument,
                created_at: skill.created_at
              };
              form.members.push(memberObj);
              form.memberMap[skill.instrument] = memberObj;
            });

            // 3. Fallback: If NO formations exist for this level but there are skills
            if (formationsList.length === 0 && availableMusicians.length > 0) {
              formationsList.push({ id: `first_slot_${song.id}_${level}`, members: [], memberMap: {}, isInitial: true, level });
            }

            const levelFormations = formationsList.map(form => {
              const isComplete = Object.keys(requiredInsts).every(inst => {
                return requiredInsts[inst] === 0 || form.memberMap[inst];
              });
              return {
                ...form,
                isComplete
              };
            });

            if (levelFormations.length > 0) {
              processedWall.push({
                id: `${song.id}_${level}`,
                song_id: song.id,
                artist: song.artist || 'Unbekannter Künstler',
                title: song.title || 'Unbekannter Titel',
                media_link: song.media_link,
                instrumentation: requiredInsts,
                formations: levelFormations,
                level: level
              });
            }
          });
        });
        console.log('[Dashboard] Final wall songs:', processedWall.length);
        setWallSongs(processedWall);
      }

      // Lade alle Songs der Schule für die Bibliothek
      const { data: songsData, error: songsErr } = await supabase
        .from('songs')
        .select('*')
        .eq('school_id', userData.school_id)
        .order('level')
        .order('artist');
      
      if (songsErr) console.error('[Dashboard] Error fetching library songs:', songsErr);
      if (songsData) {
        setGlobalSongs(songsData);
      }

      // 1. Finde alle Band-IDs, in denen der Nutzer Mitglied ist
      const { data: myMembershipIds } = await supabase
        .from('band_members')
        .select('band_id')
        .eq('user_id', userId);
        
      const bandIds = (myMembershipIds || []).map(m => m.band_id);
      
      // 2. Lade diese Bands mit VOLLSTÄNDIGEN Daten (allen Mitgliedern)
      const { data: userBandsData, error: userBandsErr } = await supabase
        .from('bands')
        .select(`
          *,
          songs (*),
          band_members (*, users(*)),
          band_songs (*, songs(*), band_song_slots(*)),
          coach:users!bands_coach_id_fkey (first_name, last_name, photo_url)
        `)
        .in('id', bandIds);
        
      if (userBandsErr) console.error('[Dashboard] Error fetching user bands:', userBandsErr);
      if (userBandsData) {
        const uniqueBands = userBandsData.map((band: any) => {
          const myMembership = (band.band_members || []).find((m: any) => m.user_id === userId);
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
          const updatedSelected = uniqueBands.find(b => b.id === selectedBandForProfile.id);
          if (updatedSelected) {
            setSelectedBandForProfile(updatedSelected);
          }
        } else if (restoredBandId && showBandProfile) {
          // Restore from localStorage on initial load
          const restored = uniqueBands.find(b => b.id === restoredBandId);
          if (restored) {
            setSelectedBandForProfile(restored);
          }
        }
        
        const unseen = userBandsData.find(b => {
          const m = (b.band_members || []).find((m: any) => m.user_id === userId);
          return m && !m.confetti_seen;
        });
        if (unseen) {
          const m = (unseen.band_members || []).find((m: any) => m.user_id === userId);
          setShowConfetti({ id: m.id, bands: unseen });
        }
      }

      // Lade aktive Schüler für Statusleiste (gefiltert nach Schule)
      // Lade aktive Schüler für Statusleiste (gefiltert nach Schule & Aktivität)
      await fetchActiveStudentCount(userData.school_id);

      // Lade ALLE Bands der Schule
      const { data: bandsData, error: allBandsErr } = await supabase
        .from('bands')
        .select('*, songs(title, artist, instrumentation), band_members(*, users!user_id(*)), coach:users!bands_coach_id_fkey (first_name, last_name, photo_url)')
        .eq('school_id', userData.school_id)
        .order('name', { ascending: true });
      
      if (allBandsErr) console.error('[Dashboard] Error fetching all school bands:', allBandsErr);
      if (bandsData) {
        const completeBands = bandsData.filter((band: any) => {
          const song = band?.songs ? (Array.isArray(band.songs) ? band.songs[0] : band.songs) : null;
          if (!song || !song.instrumentation) return false;
          
          const req = song.instrumentation;
          const requiredInsts = Object.keys(req).filter(k => req[k] > 0);
          
          const currentInsts = [...new Set((band.band_members || []).map((m: any) => m.instrument))];
          return requiredInsts.every(inst => currentInsts.includes(inst));
        });
        setAllBands(completeBands);
      }

      // Lade die Wochenplan-Daten
      fetchPlanningData(userData.school_id);

      // Activity Chart Data (Letzte 7 Tage)
      const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = days[d.getDay()];
        const mins = (allSessions || [])
          .filter(s => new Date(s.check_in_time).toDateString() === d.toDateString())
          .reduce((acc, s) => {
            const start = new Date(s.check_in_time);
            const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
            return acc + Math.floor((end.getTime() - start.getTime()) / 60000);
          }, 0);
        last7.push({ day: dayStr, mins });
      }
      setStudentActivity(last7);

    } catch (error: any) {
      console.error('[Dashboard] UNCAUGHT ERROR in fetchDashboardData:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanningData = async (schoolId: string) => {
    if (!loggedInUserId || !schoolId) return;
    const { data, error } = await supabase.from('lab_planning').select('*').eq('school_id', schoolId);
    if (error) {
      console.error('[Planning] Fetch Error:', error);
      return;
    }
    if (data) {
      setGlobalPlannedSlots(data);
      const mySlots = data.filter(s => s.user_id === loggedInUserId).map(s => `${s.day}-${s.time}`);
      setPlannedSlots(mySlots);
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
    
    if (!schoolId) {
      console.warn('[Planning] Keine School ID gefunden, breche ab.');
      return;
    }

    const key = `${day}-${time}`;
    const isPlanned = plannedSlots.includes(key);

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
        console.error('[Planning] Datenbank-Fehler:', result.error.message);
        // Zurücksetzen
        await fetchPlanningData(schoolId);
      } else {
        await fetchPlanningData(schoolId);
      }
    } catch (err) {
      console.error('[Planning] Kritischer Fehler beim Toggeln:', err);
      await fetchPlanningData(schoolId);
    }
  };

  const handleHelpRequest = async () => {
    if (!session?.station_id || !loggedInUserId) return;
    
    const { error } = await supabase
      .from('help_requests')
      .insert({
        user_id: loggedInUserId,
        station_id: session.station_id,
        status: 'pending'
      });
      
    if (error) {
      alert('Fehler beim Senden: ' + error.message);
    } else {
      alert(`Hilfe wurde angefordert. Der Lehrer sieht deinen Tisch im Dashboard.`);
    }
  };

  const updateProgress = async (skillId: string, newProgress: number, meta?: { songId: string, instrument: string, difficulty: string, partNumber?: number }) => {
    // If it is a simulated row that does not exist yet, insert it to DB
    if (skillId.startsWith('mock-') && meta && user) {
      const { error } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: user.id,
          song_id: meta.songId,
          instrument: meta.instrument,
          difficulty_level: meta.difficulty,
          part_number: meta.partNumber || 1,
          progress_percent: newProgress,
          is_stage_ready: false
        });
        
      if (!error) {
        fetchDashboardData(user.id); // Reload to get real skill ID
      }
      return;
    }

    // Normal update for existing rows
    setUserSongs(userSongs.map(song => {
      if (song.id === skillId) {
        const clampedProgress = song.locked ? Math.min(newProgress, 90) : newProgress;
        return { ...song, progress: clampedProgress };
      }
      return song;
    }));

    const song = userSongs.find(s => s.id === skillId);
    const clampedProgress = song?.locked ? Math.min(newProgress, 90) : newProgress;
    
    await supabase
      .from('user_song_skills')
      .update({ 
        progress_percent: clampedProgress
      })
      .eq('id', skillId);
  };

  const handleCreateBand = async (song: any, formation: any) => {
    if (!song || !formation || !user) {
      console.error('Missing data for band creation');
      return;
    }
    if (!user) return;
    
    // If we do not have a name yet, show naming modal
    if (!customBandName) {
      setNamingTarget({ song, form: formation });
      const suggestions = ['The Groove Masters', 'Sonic Rebels', 'Backstage Legends', 'Pulse Unit', 'The Beat Brigade', 'Neon Harmony', 'Static Flow', 'Vibe Collective', 'Midnight Jam', 'Echo Theory'];
      const randomName = suggestions[Math.floor(Math.random() * suggestions.length)];
      setCustomBandName(randomName);
      setShowBandNaming(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Check if a band for this song and these members already exists
      const memberIds = formation.members.map((m: any) => m.user_id);
      const { data: existingBands } = await supabase
        .from('band_members')
        .select('band_id, bands!inner(id, song_id)')
        .eq('bands.song_id', song.song_id || song.id)
        .in('user_id', memberIds);

      // Check if any of these band_ids have all these members
      // (This is a bit complex, but for simplicity: if ANY band for this song 
      // already contains one of these members, we consider it a duplicate match)
      if (existingBands && existingBands.length > 0) {
        throw new Error('Eine Band für diese Formation wurde bereits gegründet.');
      }

      // Select an avatar based on member count
      const count = formation.members.length;
      const sizeKey = count <= 3 ? '3' : (count === 4 ? '4' : '5');
      const randomIdx = Math.floor(Math.random() * 3) + 1;
      // Map to the generated artifact filenames
      const avatarMap: Record<string, string[]> = {
        '3': ['band_avatar_3_musicians_1_1777469162449.png', 'band_avatar_3_musicians_2_1777469216449.png', 'band_avatar_3_musicians_3_1777469286463.png'],
        '4': ['band_avatar_4_musicians_1_1777469178768.png', 'band_avatar_4_musicians_2_1777469299351.png', 'band_avatar_4_musicians_3_1777469315500.png'],
        '5': ['band_avatar_5_musicians_1_1777469193682.png', 'band_avatar_5_musicians_2_1777469330208.png', 'band_avatar_5_musicians_3_1777469343103.png']
      };
      const avatarFile = avatarMap[sizeKey][randomIdx - 1];

      // 2. Create the band
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .insert({
          song_id: song.song_id || song.id,
          school_id: user.school_id,
          name: customBandName,
          status: 'active',
          photo_url: `/brain/2c435655-1542-47aa-a374-93257d55c94c/${avatarFile}`
        })
        .select()
        .single();

      if (bandError) throw bandError;

      // 2. Add members from the specific formation (DEDUPLICATED)
      const uniqueUserIds = new Set();
      const memberInserts: any[] = [];
      
      formation.members.forEach((m: any) => {
        if (!uniqueUserIds.has(m.user_id)) {
          uniqueUserIds.add(m.user_id);
          memberInserts.push({
            band_id: band.id,
            user_id: m.user_id,
            instrument: m.instrument,
            confetti_seen: false
          });
        }
      });

      const { error: memberError } = await supabase
        .from('band_members')
        .insert(memberInserts);

      if (memberError) throw memberError;

      // 3. Clear formation_group for these members (to free them up)
      const memberUserIds = formation.members.map((m: any) => m.user_id);
      await supabase
        .from('user_song_skills')
        .update({ formation_group: null })
        .in('user_id', memberUserIds)
        .eq('song_id', song.song_id || song.id);

      // 4. Also add the song to the band's repertoire
      await supabase
        .from('band_songs')
        .insert({
          band_id: band.id,
          song_id: song.song_id || song.id
        });

      // 5. Refresh dashboard
      setShowBandNaming(false);
      setNamingTarget(null);
      setCustomBandName('');
      await fetchDashboardData(user.id);
      setActiveStudentTab('bands');
      
    } catch (err: any) {
      console.error('Error creating band:', err);
      alert(`Fehler beim Gründen der Band: ${err.message || 'Unbekannter Fehler'}.`);
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
          instrument: skill.instrument
        });

      if (findErr) throw new Error('Find-Error: ' + findErr.message);
      const existing = data && data.length > 0 ? data[0] : null;


      let updateResult;
      if (existing) {
        console.log('[CHALLENGE] Updating existing record:', existing.id);
        updateResult = await supabase.from('user_song_skills').update({ is_pending_approval: true }).eq('id', existing.id).select();
      } else {
        console.log('[CHALLENGE] No record found, inserting new one.');
        updateResult = await supabase.from('user_song_skills').insert({
          user_id: loggedInUserId,
          song_id: skill.song_id,
          instrument: skill.instrument,
          difficulty_level: skill.difficulty_level || 'original',
          progress_percent: skill.progress || 90,
          is_pending_approval: true,
          is_stage_ready: false
        }).select();
      }
      
      if (updateResult.error) throw new Error('Update-Error: ' + updateResult.error.message);
      
      // 2. Add a signal to the shoutbox so the teacher sees a "New Message" even if polling is slow
      // Find a band the user belongs to
      const { data: userBand } = await supabase.from('band_members').select('band_id').eq('user_id', loggedInUserId).limit(1).maybeSingle();
      
      await supabase.from('band_shoutbox').insert({
        user_id: loggedInUserId,
        band_id: userBand?.band_id || null,
        content: `Ich habe soeben die Challenge für "${skill.title}" eingereicht! 🚀`,
        created_at: new Date().toISOString()
      });

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
          part_number: 1
        });

      if (slotErr) throw slotErr;

      // 3. Send a Shoutbox notification
      await supabase.from('band_shoutbox').insert({
        band_id: bandId,
        user_id: user.id,
        content: `Ich habe den Song "${skill.songs?.title || skill.title}" für unsere Band vorgeschlagen! Wer ist dabei?`
      });

      alert('Song erfolgreich vorgeschlagen! Deine Bandmitglieder wurden benachrichtigt.');
      dismissSuggestion(skill.id);
      fetchDashboardData(user.id);
    } catch (err: any) {
      console.error('[SuggestToBand] Error:', err);
      alert('Fehler beim Vorschlagen des Songs: ' + (err.message || 'Unbekannter Fehler'));
    }
  };

  const clearConfetti = async () => {
    if (!showConfetti) return;
    await supabase.from('band_members').update({ confetti_seen: true }).eq('id', showConfetti.id);
    setShowConfetti(null);
  };


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      alert('Kamera konnte nicht gestartet werden.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setUser({ ...user, photo_url: dataUrl });
      await supabase.from('users').update({ photo_url: dataUrl }).eq('id', user.id);
      stopCamera();
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

  if (!stationIdFromStorage) {
    return <DeviceSetupScreen />;
  }

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

    // Immediate Heartbeat on Login
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
  };

  useEffect(() => {
    if (user && !localStorage.getItem('groovelab_active_tab')) {
      const r = user.role?.toLowerCase();
      if (r === 'admin' || r === 'teacher') {
        setActiveStudentTab('live');
      } else {
        setActiveStudentTab('profile');
      }
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
    // Show a premium loading state for public visitors
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
        <div className="pulse" style={{ width: '80px', height: '80px', background: '#fefce8', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Music size={40} color="#eab308" />
        </div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.1em' }}>GROOVELAB PROFILE</div>
      </div>
    );
  }

  // 2. AUTHENTICATION CHECK
  if (!loggedInUserId) {
    return <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />;
  }

  if (loading || !user) {
    return <div className="app-container flex-center">Lade Daten aus Supabase...</div>;
  }



  const calculateSkillXP = (skill: any) => {
    const prog = skill.progress || 0;
    if (skill.is_stage_ready || prog === 100) return 500;
    return prog * 2;
  };
 
  const myBands = userBands;

  const studentRadarData = (() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0 };
    userSongs.forEach((s: any) => {
      if (radarBase[s.instrument] !== undefined) {
        radarBase[s.instrument] += calculateSkillXP(s);
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
  const repertoireSongs = userSongs.filter((s: any) => s.progress === 100 && s.is_stage_ready && !s.is_pending_approval);

  const groupSongs = (songs: any[]) => Object.values((songs || []).reduce((acc: any, skill: any) => {
    if (!skill || !skill.song_id) return acc;
    if (!acc[skill.song_id]) {
      const wallMatch = (wallSongs || []).find(ws => ws?.song_id === skill.song_id && ws?.level === skill.difficulty_level);
      
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

  const groupedPracticeSongs = groupSongs(practiceSongs);
  const groupedRepertoireSongs = groupSongs(repertoireSongs);

  return (
    <div className="app-layout">
      <style>{`
        .hover-scale { transition: all 0.2s ease !important; }
        .hover-scale:hover { 
          transform: translateX(4px); 
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
      `}</style>
      {/* Sidebar Navigation (iPad/Desktop) */}
      <aside className="sidebar-nav">
        <div className="sidebar-logo" style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <button onClick={() => setActiveStudentTab('profile')} className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}>
                <Shield size={20} /> Profil
              </button>
              <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? 'active' : ''}`}>
                <Monitor size={20} /> Live Lab
              </button>
              <button onClick={() => setActiveStudentTab('practice')} className={`sidebar-item ${activeStudentTab === 'practice' ? 'active' : ''}`}>
                <Play size={20} fill={activeStudentTab === 'practice' ? 'white' : 'none'} /> Üben
              </button>
              <button onClick={() => setActiveStudentTab('matching')} className={`sidebar-item ${activeStudentTab === 'matching' ? 'active' : ''}`}>
                <Users size={20} /> Band Matching
              </button>
              <button onClick={() => setActiveStudentTab('bands')} className={`sidebar-item ${activeStudentTab === 'bands' ? 'active' : ''}`}>
                <Box size={20} /> Deine Bands
              </button>
              <button onClick={() => setActiveStudentTab('repertoire')} className={`sidebar-item ${activeStudentTab === 'repertoire' ? 'active' : ''}`}>
                <Award size={20} /> Repertoire
              </button>
              <button onClick={() => setActiveStudentTab('library')} className={`sidebar-item ${activeStudentTab === 'library' ? 'active' : ''}`}>
                <Library size={20} /> Bibliothek
              </button>
              {/* Band-Finder hidden as Vocals are temporarily disabled */}
              <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? 'active' : ''}`}>
                <Users size={20} /> Lehrer
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? 'active' : ''}`} style={{
                background: activeStudentTab === 'live' ? '#fffbeb' : 'transparent',
                color: activeStudentTab === 'live' ? '#eab308' : '#64748b',
                borderRadius: '16px',
                padding: '14px 16px',
                marginBottom: '8px'
              }}>
                <Monitor size={20} color={activeStudentTab === 'live' ? '#eab308' : '#64748b'} /> Live Lab
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

        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '24px', paddingBottom: '32px' }}>
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                  {session && <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{user.first_name}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{user.instrument || 'Musiker'}</div>
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
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '14px', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}
          >
            <LogOut size={18} color="#ef4444" /> Abmelden
          </button>
        </div>
      </aside>

      <div className="main-wrapper" style={{ paddingTop: '0' }}>
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', height: '80px', background: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Common Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               {/* Location Pill */}
               <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: `${getRoleColor(user?.role, session?.stations?.name)}15`, 
                padding: '10px 20px', borderRadius: '100px', 
                border: `1px solid ${getRoleColor(user?.role, session?.stations?.name)}30`,
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRoleColor(user?.role, session?.stations?.name) }}></div>
                <span style={{ color: getRoleColor(user?.role, session?.stations?.name), fontWeight: 800, fontSize: '0.85rem' }}>
                  {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') ? (session?.stations?.name || 'Coach Modus') : (locationMode === 'lab' ? `Labor (${session?.stations?.name || 'iPad'})` : 'Home')}
                </span>
              </div>

              {/* Lab Count Pill */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: '#f0fdf4', padding: '10px 20px', borderRadius: '100px', 
                border: '1px solid #dcfce7', boxShadow: '0 2px 10px rgba(34, 197, 94, 0.05)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                <span style={{ color: '#166534', fontWeight: 800, fontSize: '0.85rem' }}>{activeStudentsCount} im Lab</span>
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
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{user.instrument || 'Groovelab Academy'}</div>
              </div>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', border: '3px solid white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              </div>
            </div>
          </div>
        </header>


      <main className="main-content" style={{ overflow: 'auto' }}>
        {/* Live Lab Tab for Students */}
        {user.role === 'student' && activeStudentTab === 'live' && (
          <ErrorBoundary>
            <div className="animation-slide-up" style={{ width: '100%', padding: '0px 48px 48px 48px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', marginBottom: '8px', marginTop: '16px' }}>Live Lab</h1>
              <TeacherDashboard userId={user.id} hideHeader={true} viewMode="student" />
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
                  <img 
                    src={user.photo_url || '/avatar_ghost.jpg'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: user.photo_url || !user.first_name ? 'block' : 'none' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    alt=""
                  />
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
                      <Camera size={16} /> PROFILBILD ÄNDERN
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: '1', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro Artist</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 700 }}>{user.schools?.name || 'Groovelab Academy'}</span>
                  </div>
                  
                  <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
                    {user.first_name} {user.last_name?.[0]}.
                  </h1>
                  
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
                          </h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Plane deine Sessions & vermeide Stoßzeiten.</p>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b' }}></div> Deine Zeit
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(79, 70, 229, 0.3)' }}></div> Lab voll
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
                                        const totalCount = globalPlannedSlots.filter(s => s.day === day.id && s.time === time).length;
                                        const dayHours = hours[day.key];
                                        
                                        const isOpen = dayHours?.active && time >= dayHours.start && time < dayHours.end;

                                        let bgColor = 'white';
                                        let textColor = '#64748b';
                                        let border = '1px solid #f1f5f9';
                                        let cursor = 'pointer';
                                        let content: any = isOpen && totalCount > 0 ? totalCount : '';

                                        if (!isOpen) {
                                          bgColor = '#f1f5f9';
                                          textColor = '#cbd5e1';
                                          cursor = 'not-allowed';
                                          content = <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>✕</span>;
                                        } else if (isPlanned) {
                                          bgColor = brandColor;
                                          textColor = 'white';
                                          border = 'none';
                                        } else if (totalCount > 0) {
                                          if (totalCount >= 5) bgColor = 'rgba(79, 70, 229, 0.6)';
                                          else if (totalCount >= 3) bgColor = 'rgba(79, 70, 229, 0.3)';
                                          else bgColor = 'rgba(79, 70, 229, 0.1)';
                                          textColor = '#4f46e5';
                                          border = '1px solid rgba(79, 70, 229, 0.2)';
                                        }

                                        return (
                                          <button 
                                            key={day.id}
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
                                              boxShadow: isPlanned ? `0 4px 10px ${brandColor}40` : 'none',
                                              opacity: isOpen ? 1 : 0.6,
                                              padding: 0,
                                              width: '100%',
                                              position: 'relative'
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
                                    <div key={s.id} style={{ 
                                      background: 'white', 
                                      padding: '6px 14px', 
                                      borderRadius: '12px', 
                                      border: '1px solid #f1f5f9', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                    }}>
                                      <span style={{ fontSize: '1.1rem' }}>{APP_INSTRUMENT_ICONS[s.instrument]}</span>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{s.instrument}:</span>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: s.progress >= 100 ? '#10b981' : '#1e293b' }}>
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
                            <div key={b.id} className="hover-card" style={{ padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center', transition: 'all 0.2s' }}>
                              <div style={{ width: '64px', height: '64px', borderRadius: '18px', overflow: 'hidden', background: '#f8fafc', border: '2px solid #f1f5f9' }}>
                                <img src={b.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{b.name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                  {b.songs?.title || b.band_songs?.[0]?.songs?.title || b.genre || 'Jam Session'}
                                </div>
                              </div>
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
                                            <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                          ) : (
                                            <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                <div style={{ background: '#f0fdf4', color: '#10b981', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Aktiv
                                </div>
                              </div>
                            </div>
                          ))
                        )}
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
          <ErrorBoundary>
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
                {['Guitar', 'Keys', 'Drums', 'Bass'].map(inst => {
                  const skills = userSongs.filter(s => s.instrument === inst);
                  const avgProgress = skills.length > 0 
                    ? Math.round(skills.reduce((acc, s) => acc + s.progress, 0) / skills.length) 
                    : 0;

                  return (
                    <div key={inst} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                        {inst === 'Guitar' ? 'E-GITARRE' : inst === 'Keys' ? 'E-PIANO' : inst === 'Drums' ? 'E-DRUMS' : 'E-BASS'}
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

              {practiceSongs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎸</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Dein Üben Board ist leer</h3>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>Tippe auf <strong>Bibliothek</strong>, um neue Songs hinzuzufügen und deine Skills zu verbessern!</p>
                </div>
              )}
              <div className="exercises-grid">
                {groupedPracticeSongs.map((group: any) => (
                  <div key={group.song_id} style={{ position: 'relative' }}>
                    <GroupedSongCard 
                      songGroup={group} 
                      isBandReady={group.isBandReady} 
                      onUpdateProgress={updateProgress} 
                      onSubmitForApproval={handleSubmitForApproval} 
                      onDelete={handleDeleteSong}
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
                    <div key={group.song_id} className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{group.artist}</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{group.title}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', color: '#10b981', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} /> 100%
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {group.skills.map((s: any) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                            {APP_INSTRUMENT_ICONS[s.instrument as keyof typeof APP_INSTRUMENT_ICONS]} {s.instrument}
                          </div>
                        ))}
                      </div>

                      <div style={{ background: '#10b981', height: '8px', borderRadius: '4px', width: '100%', marginBottom: '12px' }}></div>
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Du bist bereit für eine Band
                      </div>
                      
                      {group.skills.some((s: any) => s.verified_by) && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Expertise-Check</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {group.skills.filter((s: any) => s.verified_by).map((s: any) => (
                                <div key={s.id} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={12} color="#10b981" strokeWidth={3} />
                                  {s.instrument}: {s.verified_by.first_name} {s.verified_by.last_name?.[0]}.
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {group.skills.some((s: any) => s.is_stage_ready) && (
                            <button 
                              onClick={() => setSuggestingSkill(group.skills.find((s: any) => s.is_stage_ready))}
                              style={{ width: '100%', background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: `0 8px 20px ${brandColor}33` }}
                            >
                              <Zap size={16} fill="currentColor" /> SONG FÜR EINE BAND VORSCHLAGEN
                            </button>
                          )}
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
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#f59e0b' }}><Users size={32} /></div>
                  Band Matching
                </h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>Finde deine Mitmusiker für deine 100% Songs!</p>
              </div>

              {(wallSongs || []).filter(ws => ws?.formations && Array.isArray(ws.formations) && ws.formations.length > 0).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>⏳</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Warteliste leer</h3>
                  <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>Bring einen Song auf 100%, um dich hier für eine Band zu qualifizieren.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(wallSongs || []).filter(ws => ws?.formations && Array.isArray(ws.formations) && ws.formations.length > 0).map((song: any) => {
                    const isExpanded = expandedMatchingSong === song.id;
                    const openSlots = song.formations.length;

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
                        {song.formations.map((form: any, fIndex: number) => {
                          const isMySlot = (form?.members || []).some((m: any) => m?.user_id === user?.id);
                          const mySkill = userSongs.find(us => us.song_id === song.song_id && us.is_stage_ready && (us.difficulty_level || 'original') === song.level);
                          const canJoin = mySkill && !isMySlot && !form.memberMap[mySkill.instrument] && !form.isComplete;

                          return (
                            <div key={form.id} style={{ 
                              background: isMySlot ? '#f0f9ff' : '#f8fafc', 
                              border: isMySlot ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                              borderRadius: '24px', padding: '24px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: isMySlot ? '#3b82f6' : (form.isInitial ? '#ca8a04' : '#64748b'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {isMySlot ? '✨ DEINE FORMATION' : (form.isInitial ? '📢 OFFENES RECRUITING' : `BAND-SLOT #${fIndex + 1}`)}
                                  </div>
                                  {isMySlot && (() => {
                                    const myMember = form.members.find((m: any) => m.user_id === user.id);
                                    const mySkill = userSongs.find(us => us.id === myMember?.skill_id);
                                    return (
                                      <button 
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('[Matching] Favorite click for skill:', mySkill?.id);
                                          if (mySkill) {
                                            try {
                                              await supabase.from('user_song_skills').update({ is_favorite: false }).eq('user_id', user.id).eq('song_id', song.song_id);
                                              await supabase.from('user_song_skills').update({ is_favorite: !mySkill.is_favorite }).eq('id', mySkill.id);
                                              fetchDashboardData(user.id);
                                            } catch (err) {
                                              console.error('[Matching] Error setting favorite:', err);
                                            }
                                          }
                                        }}
                                        style={{ 
                                          background: mySkill?.is_favorite ? '#fef3c7' : '#f1f5f9', 
                                          border: 'none', borderRadius: '10px', padding: '6px 12px',
                                          display: 'flex', alignItems: 'center', gap: '6px',
                                          fontSize: '0.65rem', fontWeight: 800, color: mySkill?.is_favorite ? '#d97706' : '#94a3b8',
                                          cursor: 'pointer', transition: 'all 0.2s',
                                          position: 'relative', zIndex: 50, // Ensure it is on top
                                          pointerEvents: 'auto'
                                        }}
                                      >
                                        <Star size={12} fill={mySkill?.is_favorite ? '#d97706' : 'none'} />
                                        {mySkill?.is_favorite ? 'FAVORIT' : 'ALS FAVORIT MARKIERN'}
                                      </button>
                                    );
                                  })()}
                                </div>
                                {canJoin && (
                                  <button 
                                    onClick={async () => {
                                      await supabase.from('user_song_skills').update({ formation_group: form.id }).eq('id', mySkill.id);
                                      fetchDashboardData(user.id);
                                    }}
                                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    BEITRETEN
                                  </button>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {Object.keys(song?.instrumentation || {}).filter(k => (song?.instrumentation?.[k] || 0) > 0).map(inst => {
                                  const member = form.memberMap[inst];
                                  const isMe = member?.user_id === user?.id;
                                  
                                  return (
                                    <div key={inst} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '75px', position: 'relative' }}>
                                      <div style={{ 
                                        width: '64px', height: '64px', borderRadius: '18px', 
                                        background: member ? 'white' : 'rgba(0,0,0,0.03)', 
                                        border: isMe ? `3px solid #ef4444` : (member ? '1px solid #e2e8f0' : '2px dashed #cbd5e1'),
                                        boxShadow: isMe ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                                      }}>
                                        {member ? (
                                          <img 
                                            src={member.photo_url || '/avatar_ghost.jpg'} 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedStudentForPreview(member);
                                            }}
                                            style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover', cursor: 'pointer' }} 
                                            alt="" 
                                          />
                                        ) : (
                                          <Plus size={20} color="#cbd5e1" />
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.6rem', fontWeight: 900, color: member ? '#1e293b' : '#94a3b8', textAlign: 'center' }}>
                                        {APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS]} {inst}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {form.isComplete && isMySlot && (() => {
                                const myMember = form.members.find((m: any) => m.user_id === user.id);
                                const mySkill = userSongs.find(us => us.id === myMember?.skill_id);
                                const isFavorite = mySkill?.is_favorite;

                                return (
                                  <button 
                                    onClick={() => {
                                      if (isFavorite) {
                                        handleCreateBand(song, form);
                                      } else {
                                        setConsentTarget({ song, form });
                                        setShowBandConsent(true);
                                      }
                                    }}
                                    className="pulse"
                                    style={{ 
                                      width: '100%', marginTop: '20px', padding: '14px', 
                                      background: isFavorite ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#64748b', 
                                      color: 'white', border: 'none', borderRadius: '14px', fontWeight: 900, cursor: 'pointer',
                                      boxShadow: isFavorite ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
                                    }}
                                  >
                                    {isFavorite ? '✨ DEINE FAVORITEN-BAND GRÜNDEN' : 'ZUSTIMMUNG ERFORDERLICH: BAND BEITRETEN?'}
                                  </button>
                                );
                              })()}
                            </div>
                          );
                        })}
                        
                        {!(song?.formations || []).some((f: any) => (f?.members || []).some((m: any) => m?.user_id === user?.id)) && (
                          <button 
                            onClick={async () => {
                              const mySkill = userSongs.find(us => us.song_id === song.song_id && us.is_stage_ready);
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
      )}
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

                        return displayedBands.map((band: any) => (
                          <div 
                            key={band.id} 
                            onClick={() => { setSelectedBandForProfile(band); setShowBandProfile(true); }}
                            className="glass-panel hover-card" 
                            style={{ 
                              background: 'white', padding: '24px', borderRadius: '32px', border: '1px solid #f1f5f9',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                              <div style={{ width: '80px', height: '80px', borderRadius: '24px', overflow: 'hidden', border: '3px solid #f8fafc', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
                                  <img src={band.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              </div>
                              <div>
                                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{band.name}</h3>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: brandColor }}>{band.genre || 'Bandprojekt'}</span>
                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>{band.band_members?.length} Mitglieder</span>
                                  </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ display: 'flex', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskSize: '100% 100%' }}>
                                  {band.band_members?.map((m: any, idx: number) => (
                                    <div key={idx} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: idx === 0 ? 0 : '-12px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {m.user_id ? (
                                          <img src={m.users?.[0]?.photo_url || m.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        ) : (
                                          <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                        )}
                                    </div>
                                  ))}
                              </div>
                              <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                  <ChevronRight size={24} />
                              </div>
                            </div>
                          </div>
                        ));
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
                        const vocalOpportunities = allBands.filter(band => {
                          const song = band.songs?.[0] || band.songs;
                          if (!song || !song.instrumentation) return false;
                          const req = song.instrumentation;
                          const members = band.band_members || [];
                          
                          // Instrumental Check
                          const isInstrumentalComplete = Object.keys(req).every(inst => {
                            if (inst === 'Vocals') return true;
                            const filled = members.filter(m => m.instrument === inst).length;
                            return filled >= (req[inst] || 0);
                          });
                          return isInstrumentalComplete;
                        });

                        // Only show bands where less than 2 vocalists are present
                        const activeVocalOpportunities = vocalOpportunities.filter(band => {
                          const vocalists = (band.band_members || []).filter(m => m.instrument === 'Vocals');
                          return vocalists.length < 2;
                        });

                        if (activeVocalOpportunities.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔇</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>Aktuell keine Gesangsslots frei</div>
                            </div>
                          );
                        }

                        return activeVocalOpportunities.map(band => {
                          const vocalists = (band.band_members || []).filter(m => m.instrument === 'Vocals');
                          const isFull = vocalists.length >= 2;
                          const isMeIn = vocalists.some(m => m.user_id === user.id);

                          return (
                            <div key={band.id} className="glass-panel" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>
                                  {(band.songs?.[0]?.artist || band.songs?.artist) || 'Unbekannter Interpret'}
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                                  {(band.songs?.[0]?.title || band.songs?.title) || 'Kein Titel'}
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
                                      <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #f8fafc', background: '#f1f5f9', overflow: 'hidden' }}>
                                        {v ? (() => {
                                          const u = Array.isArray(v.users) ? v.users[0] : v.users;
                                          return <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />;
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
                                <button 
                                  disabled={isFull}
                                  onClick={async () => {
                                    const { error } = await supabase.from('band_members').insert({
                                      band_id: band.id,
                                      user_id: user.id,
                                      instrument: 'Vocals'
                                    });
                                    if (!error) fetchDashboardData(user.id);
                                  }}
                                  style={{ 
                                    width: '100%', padding: '12px', borderRadius: '16px', border: 'none', 
                                    background: isFull ? '#f1f5f9' : '#10b981', 
                                    color: isFull ? '#94a3b8' : 'white', fontWeight: 900, cursor: isFull ? 'default' : 'pointer',
                                    fontSize: '0.85rem', transition: 'all 0.2s'
                                  }}
                                >
                                  {isFull ? 'Vocal-Slots voll' : 'Jetzt als Sänger beitreten'}
                                </button>
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
            <section className="exercises-section animation-slide-up">
              {globalSongs.map(song => (
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
              ))}
            </section>
          </ErrorBoundary>
        )}



        {/* Team Tab */}
        {activeStudentTab === 'team' && (
          <ErrorBoundary>
            <div className="tab-content animation-slide-up">
              <div className="stats-panel-premium">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 800 }}>Unser Team</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
                  {teachers.map(t => (
                    <div key={t.id} onClick={() => setSelectedTeacher(t)} style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', cursor: 'pointer' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 12px auto', border: '4px solid white', overflow: 'hidden' }}>
                        <img src={t.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                      <div style={{ fontWeight: 800 }}>{t.first_name} {t.last_name}</div>
                      <div style={{ fontSize: '0.7rem', color: brandColor, fontWeight: 700 }}>{t.role === 'admin' ? 'Schulleitung' : 'Lehrkraft'}</div>
                    </div>
                  ))}
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

      {/* Band Members Modal - DEPRECATED/REMOVED */}


      {/* Help FAB */}
      <div className="fab-container">
        <button 
          className="fab-button" 
          onClick={handleHelpRequest}
          style={{ background: brandColor }}
        >
          <AlertCircle size={28} />
        </button>
      </div>

      {/* Suggestion Modal */}
      {suggestingSkill && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <Zap size={40} fill="currentColor" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '12px' }}>Glückwunsch! 🏆</h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              Du hast <strong>{suggestingSkill.songs?.title}</strong> gemeistert. Was möchtest du als Nächstes tun?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {userBands.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', marginBottom: '4px' }}>Meinen Bands vorschlagen</div>
                  {userBands.map(band => (
                    <button 
                      key={band.id}
                      onClick={() => handleSuggestToBand(band.id, suggestingSkill)}
                      style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
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
              )}
              
              <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }}></div>
              
              <button 
                onClick={() => {
                  dismissSuggestion(suggestingSkill.id);
                  setActiveStudentTab('matching');
                }}
                style={{ width: '100%', background: 'white', border: '2px solid #e2e8f0', padding: '16px', borderRadius: '16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <Users size={20} /> NEUE BAND GRÜNDEN
              </button>
              
              <button 
                onClick={() => dismissSuggestion(suggestingSkill.id)}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}
              >
                Vielleicht später
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: QR Code anzeigen */}
      {showQR && user?.qr_token && (
        <QRCodeModal user={user} onClose={() => setShowQR(false)} />
      )}
      {/* Camera Modal */}
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            id="camera-video"
            autoPlay 
            playsInline 
            ref={v => { if (v) v.srcObject = cameraStream; }} 
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px' }}>
            <button 
              onClick={stopCamera}
              style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={30} />
            </button>
            <button 
              onClick={capturePhoto}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 20px rgba(255,255,255,0.5)' }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid black' }}></div>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <button onClick={() => setActiveStudentTab('practice')} className={activeStudentTab === 'practice' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'practice' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Play size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Üben</span>
        </button>
        <button onClick={() => setActiveStudentTab('repertoire')} className={activeStudentTab === 'repertoire' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'repertoire' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Award size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Repertoire</span>
        </button>
        <button onClick={() => setActiveStudentTab('library')} className={activeStudentTab === 'library' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'library' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Library size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bib</span>
        </button>
        <button onClick={() => setActiveStudentTab('matching')} className={activeStudentTab === 'matching' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'matching' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Users size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Matching</span>
        </button>
        <button onClick={() => setActiveStudentTab('bands')} className={activeStudentTab === 'bands' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'bands' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Box size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bands</span>
        </button>
        <button onClick={() => setActiveStudentTab('profile')} className={activeStudentTab === 'profile' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'profile' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Shield size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Profil</span>
        </button>
        <button onClick={() => setActiveStudentTab('team')} className={activeStudentTab === 'team' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'team' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Music size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Team</span>
        </button>
      </nav>
      {selectedTeacher && (
        <TeacherDetailModal 
          teacher={selectedTeacher} 
          onClose={() => setSelectedTeacher(null)} 
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <form onSubmit={handleUpdateProfile} className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h2>
              <button type="button" onClick={() => setShowEditProfile(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                  <input required value={editingProfile.first_name} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                  <input required value={editingProfile.last_name} onChange={e => setEditingProfile({...editingProfile, last_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
              </div>


              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>Speichern</button>
                <button type="button" onClick={() => setShowEditProfile(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>Abbrechen</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {showBandNaming && namingTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', borderRadius: '40px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Band gründen! 🎸</h2>
              <button onClick={() => setShowBandNaming(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '32px', lineHeight: 1.6 }}>
              Herzlichen Glückwunsch! Ihr seid bereit für die Bühne. Wie soll eure Band heißen?
            </p>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Bandname</label>
                <button 
                  onClick={() => {
                    const suggestions = ['The Groove Masters', 'Sonic Rebels', 'Backstage Legends', 'Pulse Unit', 'The Beat Brigade', 'Neon Harmony', 'Static Flow', 'Vibe Collective', 'Midnight Jam', 'Echo Theory'];
                    let next;
                    do { next = suggestions[Math.floor(Math.random() * suggestions.length)]; } while (next === customBandName);
                    setCustomBandName(next);
                  }}
                  style={{ background: 'none', border: 'none', color: brandColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 800 }}
                >
                  <RotateCcw size={14} /> SHUFFLE
                </button>
              </div>
              <input 
                type="text" 
                value={customBandName}
                onChange={(e) => setCustomBandName(e.target.value)}
                placeholder="z.B. The Groove Masters"
                style={{ width: '100%', padding: '18px 24px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.currentTarget.style.borderColor = brandColor}
                onBlur={(e) => e.currentTarget.style.borderColor = '#f1f5f9'}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => handleCreateBand(namingTarget.song, namingTarget.form)}
                disabled={!customBandName.trim()}
                style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)' }}
              >
                BAND JETZT GRÜNDEN
              </button>
            </div>
          </div>
        </div>
      )}

      {showBandConsent && consentTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', borderRadius: '40px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎸</div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '16px' }}>Band beitreten?</h2>
              <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>
                Diese Formation für <strong>{consentTarget.song.title}</strong> ist vollständig! 
                Du spielst hier <strong>{consentTarget.form.members.find((m: any) => m.user_id === user?.id)?.instrument}</strong>.
              </p>
              <div style={{ marginTop: '20px', padding: '16px', background: '#fef3c7', borderRadius: '16px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Star size={20} color="#d97706" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase' }}>Hinweis</div>
                  <div style={{ fontSize: '0.85rem', color: '#92400e' }}>Dein Favorit ist eigentlich <strong>{userSongs.find(us => us.song_id === consentTarget.song.song_id && us.is_favorite)?.instrument || 'ein anderes Instrument'}</strong>.</div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowBandConsent(false);
                  handleCreateBand(consentTarget.song, consentTarget.form);
                }}
                style={{ width: '100%', padding: '18px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 900, cursor: 'pointer', fontSize: '1rem' }}
              >
                JA, TROTZDEM BEITRETEN
              </button>
              <button 
                onClick={() => setShowBandConsent(false)}
                style={{ width: '100%', padding: '18px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '18px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}
              >
                NEIN, ICH WARTE AUF MEINEN FAVORITEN
              </button>
            </div>
          </div>
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
                <img src={selectedStudentForPreview.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
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
              onRefresh={fetchDashboardData}
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
              appointments: editingBand.appointments || []
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
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'white', margin: 0 }}>Wähle euer Artwork</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginTop: '8px', fontWeight: 700 }}>Klicke auf ein Bild, um es als euer neues Profilbild zu setzen.</p>
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
                 {(avatarPickerType === 'band' ? BAND_AVATARS : STUDENT_AVATARS).map(av => {
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
    </div>
  </div>
);
}

export default App;
