import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, CheckCircle, Users, Settings, Bell, 
  UserCheck, RefreshCw, Key, ChevronRight, UserX, LogOut,
  Copy, Check, Link as LinkIcon, Monitor, Sliders,
  Coffee, Sparkles, Clock, ClipboardList, Upload, Plus,
  Trash2, Shield, Calendar, BookOpen, Music, CheckSquare, XSquare, Check as CheckIcon,
  LayoutDashboard, Award, UserPlus, GraduationCap, ZoomIn, ZoomOut, ChevronLeft, X, AlertCircle, MoreVertical,
  School, User, DoorOpen, Tag, Wrench, BarChart2, Edit3
} from 'lucide-react';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDetailModal } from './StudentDetailModal';
import { TeacherDetailModal } from './TeacherDetailModal';
import QRCode from 'react-qr-code';

interface SystemAlert {
  id: string;
  schoolId: string;
  teacherId: string;
  type: string;
  message: string;
  createdAt: string;
  resolved: boolean;
  teacherName?: string;
}

interface BypassTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  instrument: string;
  maxStudents: number;
  ausweisNummer: string;
  teacherQrToken: string;
  studentCount?: number;
  contractEndsAt?: string | null;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  isActive?: boolean;
  role?: string;
}

interface GrooveLabCoach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  instrument: string;
  isActive: boolean;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  ausweisNummer?: string;
  teacherQrToken?: string;
  studentCount?: number;
  contractEndsAt?: string | null;
}

interface SecretaryBriefingData {
  openCapacityAlerts: number;
  inactiveTeachers: number;
  schedules: {
    draft: number;
    readyForReview: number;
    approved: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    created_at: string;
  }>;
}

interface PendingSchedule {
  id: string;
  teacher_id: string;
  student_id: string;
  day_of_week: number;
  time_slot: string;
  status: string;
  room_id: string | null;
  teacher_name?: string;
  student_name?: string;
  room_name?: string;
}

// Replicated Helpers and Components from TeacherDashboard for 1:1 Live Lab Layout
const AvatarImage = React.memo(({ src, style, className, user, userId, onClick }: { src: string | null, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const displaySrc = React.useMemo(() => {
    if (hasError || !src) return '/avatar_ghost.jpg';
    return src;
  }, [src, hasError]);

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
        position: 'relative', 
        background: '#f1f5f9', 
        overflow: 'hidden', 
        cursor: hasAction ? 'pointer' : 'default',
        ...style 
      }} 
      className={`avatar-image-wrapper ${hasAction ? 'hover-scale-mini' : ''} ${className || ''}`}
    >
      <img 
        src={displaySrc}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          willChange: 'opacity',
          backfaceVisibility: 'hidden'
        }} 
        alt=""
      />
    </div>
  );
});

const getStationColor = (name: string | null | undefined) => {
  if (!name) return '#64748b';
  const lowerName = name.toLowerCase();
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'; // Green
  const match = name.match(/\d+/);
  if (!match) return '#64748b';
  const num = parseInt(match[0]);
  if (num === 1 || num === 2) return '#ef4444'; // Red
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  return '#64748b';
};

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

interface CompressedCoordsResult {
  stations: Array<{
    id: string;
    x: number;
    y: number;
    cx: number;
    cy: number;
    rawStation: any;
  }>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  F: number;
}

const getCompressedRoomCoordinates = (rStations: any[], aspect: number): CompressedCoordsResult => {
  if (rStations.length === 0) {
    return { stations: [], minX: 0, maxX: 0, minY: 0, maxY: 0, F: 1.0 };
  }

  const rawCoords = rStations.map(s => {
    const x = (s.pos_x !== null ? s.pos_x : 50) * 10;
    const y = (s.pos_y !== null ? s.pos_y : 50) * (1000 / aspect) / 100;
    return { id: s.id, x, y, rawStation: s };
  });

  if (rawCoords.length <= 1) {
    const x = rawCoords[0]?.x || 500;
    const y = rawCoords[0]?.y || (500 / aspect);
    return {
      stations: rawCoords.map(c => ({ ...c, cx: c.x, cy: c.y })),
      minX: x - 90,
      maxX: x + 90,
      minY: y - 110,
      maxY: y + 110,
      F: 1.0
    };
  }

  const xs = rawCoords.map(c => c.x);
  const ys = rawCoords.map(c => c.y);
  const minRawX = Math.min(...xs);
  const maxRawX = Math.max(...xs);
  const minRawY = Math.min(...ys);
  const maxRawY = Math.max(...ys);

  const centerX = (minRawX + maxRawX) / 2;
  const centerY = (minRawY + maxRawY) / 2;

  let F_min = 0.0;
  for (let i = 0; i < rawCoords.length; i++) {
    for (let j = i + 1; j < rawCoords.length; j++) {
      const dx = Math.abs(rawCoords[i].x - rawCoords[j].x);
      const dy = Math.abs(rawCoords[i].y - rawCoords[j].y);

      let pairF = 1.0;
      if (dx === 0 && dy === 0) {
        pairF = 1.0;
      } else if (dx === 0) {
        pairF = 205 / dy;
      } else if (dy === 0) {
        pairF = 185 / dx;
      } else {
        pairF = Math.min(185 / dx, 205 / dy);
      }

      if (pairF > F_min) {
        F_min = pairF;
      }
    }
  }

  const F = Math.max(0.68, Math.min(1.5, F_min));

  const compressedStations = rawCoords.map(c => {
    const cx = centerX + (c.x - centerX) * F;
    const cy = centerY + (c.y - centerY) * F;
    return { ...c, cx, cy };
  });

  const minX = Math.min(...compressedStations.map(c => c.cx - 90));
  const maxX = Math.max(...compressedStations.map(c => c.cx + 90));
  const minY = Math.min(...compressedStations.map(c => c.cy - 110));
  const maxY = Math.max(...compressedStations.map(c => c.cy + 110));

  return { stations: compressedStations, minX, maxX, minY, maxY, F };
};

const StationNode = React.memo(({ num, color, inst, sess, isMe, viewMode, onProfileSelect, onLogout, hasHelpRequest, customName }: { 
  num: number, color: string, inst: string, sess: any, isMe: boolean, viewMode: string, onProfileSelect: (u: any) => void, onLogout: (id: string) => void, hasHelpRequest?: boolean, customName?: string
}) => {
  const stationName = customName || sess?.stations?.name || `iPad ${num}`;
  const isActive = !!sess;
  
  const activeMins = React.useMemo(() => {
    if (!sess?.check_in_time) return 0;
    const mins = Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000);
    return Math.max(0, mins);
  }, [sess?.check_in_time]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', width: '100%', paddingTop: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Music size={14} /> {inst}
      </div>
      
      <div 
        className="glass-panel" 
        onClick={() => {
          if (isActive) {
            onProfileSelect(sess.users);
          }
        }}
        style={{ 
          width: '100%',
          background: 'white', 
          padding: '10px 12px', 
          minHeight: '150px', 
          aspectRatio: '1',
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative', 
          border: isActive ? `2.5px solid ${color}` : `1.5px solid ${color}40`,
          boxShadow: isActive ? `0 12px 30px rgba(0,0,0,0.03), 0 2px 8px ${color}10` : `0 4px 12px ${color}08`,
          borderRadius: '24px',
          cursor: isActive ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', width: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stationName}</span>
            {sess && <span style={{ color: color, fontWeight: 900, textTransform: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>• {activeMins}m</span>}
          </div>
          {hasHelpRequest && (
            <div style={{ 
              position: 'absolute', 
              top: '40px', 
              right: '12px', 
              background: '#ef4444', 
              color: 'white', 
              padding: '4px 10px', 
              borderRadius: '10px', 
              fontSize: '0.65rem', 
              fontWeight: 900, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
              zIndex: 10
            }}>
              <AlertCircle size={10} fill="white" /> HELP
            </div>
          )}
          {isActive && viewMode === 'admin' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLogout(sess.id); }}
              style={{ 
                background: '#fef2f2', 
                border: '1px solid #fee2e2', 
                padding: '2px 6px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                color: '#ef4444', 
                fontSize: '0.6rem', 
                fontWeight: 900, 
                textTransform: 'uppercase',
                transition: 'all 0.2s',
                flexShrink: 0,
                marginLeft: '4px'
              }}
            >
              Logout
            </button>
          )}
        </div>

        {sess ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '2px' }}>
            <div style={{ 
              width: '104px', 
              height: '104px', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              border: `2px solid ${color}`, 
              boxShadow: `0 10px 28px ${color}25`, 
              flexShrink: 0, 
              marginBottom: '4px',
              transition: 'all 0.3s ease'
            }}>
              <AvatarImage src={sess.users?.photo_url} user={sess.users} />
            </div>
            <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '0.85rem', 
                color: '#1e293b', 
                lineHeight: 1.1, 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {sess.users?.first_name}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ margin: 'auto', color: '#e2e8f0', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.15em' }}>BEREIT</div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.sess?.id === next.sess?.id &&
    prev.sess?.users?.photo_url === next.sess?.users?.photo_url &&
    prev.sess?.songs?.title === next.sess?.songs?.title &&
    !!prev.sess === !!next.sess &&
    prev.isMe === next.isMe
  );
});

const CoachesNode = React.memo(({ coaches, onProfileSelect }: { coaches: any[], onProfileSelect: (u: any) => void }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 12px #22c55e' }}></span>
        Coaches vor Ort
      </div>
      <div style={{ 
        position: 'relative', 
        width: '180px', 
        height: '180px', 
        borderRadius: '50%', 
        background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(10px)',
        border: '2px dashed #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
      }}>
        {coaches.map((c, idx) => {
          const total = coaches.length;
          const offset = total > 1 ? (idx - (total - 1) / 2) * 54 : 0;
          const verticalOffset = total > 1 ? (idx % 2 === 0 ? -12 : 12) : 0;
          const labelAbove = total > 1 && idx % 2 === 0;
          return (
            <div 
              key={c.id} 
              onClick={() => onProfileSelect(c.users || c)}
              style={{ 
                position: 'absolute',
                transform: `translate(${offset}px, ${verticalOffset}px)`,
                display: 'flex',
                flexDirection: labelAbove ? 'column-reverse' : 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10 - idx,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', border: '4px solid white', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', overflow: 'hidden', flexShrink: 0 }}>
                <AvatarImage src={c.users?.photo_url || c.photo_url} user={c.users || c} />
              </div>
              <div style={{ background: 'white', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', minWidth: '90px' }}>
                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.8rem' }}>{c.users?.first_name || c.first_name} {c.users?.last_name?.[0] || c.last_name?.[0]}.</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{c.session?.stations?.name || 'Lehrer'}</div>
              </div>
            </div>
          );
        })}
        {coaches.length === 0 && <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700 }}>Bereit</div>}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.coaches.length !== next.coaches.length) return false;
  return prev.coaches.every((c, i) => c.id === next.coaches[i].id && (c.users?.photo_url || c.photo_url) === (next.coaches[i].users?.photo_url || next.coaches[i].photo_url));
});

function TeacherCard({ 
  teacher, 
  onEdit, 
  copiedTeacherId, 
  onCopyLink,
  isDark = false
}: { 
  teacher: any; 
  onEdit: (t: any) => void; 
  copiedTeacherId?: string | null;
  onCopyLink?: (t: any) => void;
  isDark?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  const name = `${teacher.firstName || teacher.first_name || ''} ${teacher.lastName || teacher.last_name || ''}`.trim();
  const email = teacher.email || '';
  const instrument = teacher.instrument || 'Allgemein';
  const pin = teacher.ausweisNummer || teacher.ausweis_nummer || '';
  const isCampus = teacher.isCampusActive || teacher.is_campus_active;
  const isGroovelab = teacher.isGroovelabActive || teacher.is_groovelab_active;
  const isActive = teacher.isActive ?? teacher.is_active;
  const contractEndsAt = teacher.contractEndsAt || teacher.contract_ends_at || '';

  const isCopied = copiedTeacherId === teacher.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(teacher)}
      style={{
        padding: '24px',
        borderRadius: '24px',
        border: isDark 
          ? '1px solid #27272a' 
          : '1px solid #e2e8f0',
        background: isDark 
          ? (hovered ? '#27272a' : '#18181b') 
          : (hovered ? '#f1f5f9' : '#f8fafc'),
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered 
          ? (isDark ? '0 12px 24px -10px rgba(0, 0, 0, 0.5)' : '0 12px 24px -10px rgba(15, 23, 42, 0.08)') 
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Brand & Copy link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h4 style={{
            margin: 0,
            fontFamily: 'Urbanist, sans-serif',
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: isDark ? '#ffffff' : '#0f172a'
          }}>
            {name}
          </h4>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: isDark ? '#a1a1aa' : '#64748b',
            wordBreak: 'break-all'
          }}>
            {email}
          </span>
        </div>
        
        {onCopyLink && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink(teacher);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '12px',
              background: isDark ? '#27272a' : '#ffffff',
              border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
              color: isDark ? '#f4f4f5' : '#0f172a',
              cursor: 'pointer',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 650,
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <Copy size={12} /> {isCopied ? 'Kopiert!' : 'Link kopieren'}
          </button>
        )}
      </div>

      {/* Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        borderTop: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
        paddingTop: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#71717a' : '#64748b' }}>Fach/Instrument</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>{instrument}</span>
        </div>
        
        {pin && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#71717a' : '#64748b' }}>Support-PIN</span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#b45309' }}>{pin}</span>
          </div>
        )}
      </div>

      {/* Module Badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {isCampus && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🎓 Campus
          </span>
        )}
        {isGroovelab && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🎸 GrooveLab
          </span>
        )}
        {!isActive && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            background: 'rgba(100, 116, 139, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center'
          }}>
            ⏳ Inaktiv
          </span>
        )}
        {contractEndsAt && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            📅 Bis {new Date(contractEndsAt).toLocaleDateString('de-DE')}
          </span>
        )}
      </div>
    </div>
  );
}

interface SecretaryDashboardProps {
  schoolId: string;
  userId?: string;
  onLogout?: () => void;
}

export function SecretaryDashboard({ schoolId, userId, onLogout }: SecretaryDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'secretary' | 'campus' | 'groovelab'>(() => {
    const saved = localStorage.getItem('groovelab_active_workspace');
    if (saved === 'campus' || saved === 'groovelab' || saved === 'secretary') return saved as any;
    return 'secretary';
  });
  const [secretarySubTab, setSecretarySubTab] = useState<'briefing' | 'employees' | 'linking' | 'licenses' | 'setup' | 'rooms' | 'equipment'>('briefing');
  const [campusSubTab, setCampusSubTab] = useState<'briefing' | 'onboarding' | 'students' | 'schedules' | 'status'>('briefing');
  const [groovelabSubTab, setGroovelabSubTab] = useState<'briefing' | 'live' | 'students' | 'coaches' | 'kiosk' | 'status'>('briefing');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [manageTeacher, setManageTeacher] = useState<any | null>(null);
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);

  // Visual Live Lab states & refs
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const observerRef = React.useRef<ResizeObserver | null>(null);
  const containerRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width || 1000);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const handleResetTeacherPin = async (teacherId: string) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!confirm(`Soll der PIN für diese Lehrkraft wirklich neu generiert werden? (Neuer PIN: ${newPin})`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ ausweis_nummer: newPin })
        .eq('id', teacherId);

      if (error) throw error;
      alert(`PIN wurde erfolgreich auf ${newPin} geändert.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleUpdateTeacher = async (updatedData: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: updatedData.firstName,
          last_name: updatedData.lastName,
          email: updatedData.email,
          instrument: updatedData.instrument,
          required_equipment: updatedData.requiredEquipment || [],
          ausweis_nummer: updatedData.ausweisNummer,
          is_campus_active: updatedData.isCampusActive,
          is_groovelab_active: updatedData.isGroovelabActive,
          is_active: updatedData.isActive,
          role: updatedData.role,
          contract_ends_at: updatedData.contractEndsAt || null
        })
        .eq('id', updatedData.id);

      if (error) throw error;
      alert('Lehrkraft erfolgreich aktualisiert.');
      setManageTeacher(null);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  };
  const [holidayXpActive, setHolidayXpActive] = useState<boolean>(() => {
    return localStorage.getItem('groovelab_holiday_xp_active') === 'true';
  });
  const [bulkTxtInput, setBulkTxtInput] = useState<string>('');
  const [selectedTeacherForOverride, setSelectedTeacherForOverride] = useState<any>(null);
  const [newPasswordOverride, setNewPasswordOverride] = useState<string>('');
  const [newRoleOverride, setNewRoleOverride] = useState<string>('');

  // Rooms and Stations States for Live Lab
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);

  // Zoom logic matching TeacherDashboard
  useEffect(() => {
    if (selectedRoomId && userId) {
      const savedZoom = localStorage.getItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`);
      if (savedZoom) {
        const parsed = parseFloat(savedZoom);
        if (!isNaN(parsed)) {
          setZoomFactor(parsed);
          return;
        }
      }
    }
    setZoomFactor(1.0);
  }, [selectedRoomId, userId]);

  const handleZoomChange = (value: number) => {
    setZoomFactor(value);
    if (selectedRoomId && userId) {
      localStorage.setItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`, value.toString());
    }
  };

  // Students and Link States
  const [students, setStudents] = useState<any[]>([]);
  const [selectedCampusStudentId, setSelectedCampusStudentId] = useState<string>('');
  const [selectedGroovelabStudentId, setSelectedGroovelabStudentId] = useState<string>('');
  const [linkingInProgress, setLinkingInProgress] = useState<boolean>(false);

  // Compact Schülerboard States
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentFilterInstrument, setStudentFilterInstrument] = useState<string>('All');
  const [studentFilterTeacher, setStudentFilterTeacher] = useState<string>('All');
  const [studentFilterStatus, setStudentFilterStatus] = useState<'all' | 'campus' | 'groovelab' | 'inactive'>('all');
  const [isStudentCsvExpanded, setIsStudentCsvExpanded] = useState<boolean>(false);
  const [studentCsvText, setStudentCsvText] = useState<string>('');
  const [studentCurrentPage, setStudentCurrentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(50);

  // Manual Student Creation Form States
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentFirstName, setNewStudentFirstName] = useState<string>('');
  const [newStudentLastName, setNewStudentLastName] = useState<string>('');
  const [newStudentNickname, setNewStudentNickname] = useState<string>('');
  const [newStudentInstrument, setNewStudentInstrument] = useState<string>('');
  const [newStudentDuration, setNewStudentDuration] = useState<number>(30); // 30m by default
  const [newStudentTeacherId, setNewStudentTeacherId] = useState<string>('');
  const [newStudentIsAppUser, setNewStudentIsAppUser] = useState<boolean>(false);
  const [newStudentIsCampusActive, setNewStudentIsCampusActive] = useState<boolean>(true);
  const [newStudentIsGroovelabActive, setNewStudentIsGroovelabActive] = useState<boolean>(false);

  // Administrative employees list
  const [employees, setEmployees] = useState<any[]>([]);

  // Employee Form States
  const [employeeFirstName, setEmployeeFirstName] = useState<string>('');
  const [employeeLastName, setEmployeeLastName] = useState<string>('');
  const [employeeNickname, setEmployeeNickname] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');

  const [userQuota, setUserQuota] = useState<number>(150);
  const [activeUserQuota, setActiveUserQuota] = useState<number>(150);
  const [pendingUserQuota, setPendingUserQuota] = useState<number | null>(null);

  // School Data & Subscription
  const [schoolName, setSchoolName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('#1a73e8'); // Google Blue
  const [hasCampusSub, setHasCampusSub] = useState<boolean>(false);
  const [hasGroovelabSub, setHasGroovelabSub] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [limitsEnabled, setLimitsEnabled] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  
  // Tokens & Settings
  const [kioskToken, setKioskToken] = useState<string>('');
  const [campusToken, setCampusToken] = useState<string>('');
  const [allowMessagesGlobal, setAllowMessagesGlobal] = useState<boolean>(true);
  
  // Lists
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [bypassTeachers, setBypassTeachers] = useState<BypassTeacher[]>([]);
  const [coaches, setCoaches] = useState<GrooveLabCoach[]>([]);
  const [campusTeachers, setCampusTeachers] = useState<any[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  
  // Room Planner Matrix states
  const [matrixAllocations, setMatrixAllocations] = useState<any[]>([]);
  const [selectedDayPlan, setSelectedDayPlan] = useState<any | null>(null);
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);
  const [draggedPlanDay, setDraggedPlanDay] = useState<number | null>(null);

  // Räume-Verwaltung State
  const [roomsSubView, setRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [roomFormName, setRoomFormName] = useState('');
  const [roomFormEquipment, setRoomFormEquipment] = useState<string[]>([]);
  const [roomFormMaxTeachers, setRoomFormMaxTeachers] = useState(1);
  const [roomFormMaxStudents, setRoomFormMaxStudents] = useState(1);
  const [roomFormQm, setRoomFormQm] = useState(0);
  const [roomSaving, setRoomSaving] = useState(false);
  const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];

  // Equipment State
  const [schoolEquipment, setSchoolEquipment] = useState<any[]>([]);
  const [equipmentFormName, setEquipmentFormName] = useState('');
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);
  const [equipmentSaving, setEquipmentSaving] = useState(false);
  // Helpers
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});
  
  // Form States
  const [csvText, setCsvText] = useState<string>('');
  const [coachFirstName, setCoachFirstName] = useState<string>('');
  const [coachLastName, setCoachLastName] = useState<string>('');
  const [coachEmail, setCoachEmail] = useState<string>('');
  const [coachInstrument, setCoachInstrument] = useState<string>('');
  const [coachRole, setCoachRole] = useState<'teacher' | 'admin'>('teacher');

  // Copy States
  const [copyingKiosk, setCopyingKiosk] = useState(false);
  const [copyingCampus, setCopyingCampus] = useState(false);
  const [copiedTeacherId, setCopiedTeacherId] = useState<string | null>(null);
  const [regeneratingTokens, setRegeneratingTokens] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  // Redesigned Teacher Onboarding & Search states
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
  const [teacherStatusTab, setTeacherStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Manual Teacher Creation Form States
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [newTeacherFirstName, setNewTeacherFirstName] = useState<string>('');
  const [newTeacherLastName, setNewTeacherLastName] = useState<string>('');
  const [newTeacherEmail, setNewTeacherEmail] = useState<string>('');
  const [newTeacherInstrument, setNewTeacherInstrument] = useState<string>('');
  const [newTeacherLimit, setNewTeacherLimit] = useState<number>(10);
  const [newTeacherContractEndsAt, setNewTeacherContractEndsAt] = useState<string>('');
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);
  const [isCsvExpanded, setIsCsvExpanded] = useState<boolean>(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [updatingTeacherId, setUpdatingTeacherId] = useState<string | null>(null);
  const [briefingData, setBriefingData] = useState<SecretaryBriefingData | null>(null);
  const [crisisNotifications, setCrisisNotifications] = useState<any[]>([]);

  // Realtime subscription for crisis updates
  useEffect(() => {
    if (!schoolId) return;
    
    fetchCrisisNotifications();

    const channel = supabase
      .channel('public:crisis_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_notifications' }, () => {
        fetchCrisisNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId]);

  const fetchCrisisNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('crisis_notifications')
        .select(`
          id,
          teacher_id,
          student_id,
          slot_start_datetime,
          status,
          notified_at,
          student:users!crisis_notifications_student_id_fkey (first_name, last_name, personal_pin, ausweis_id, instrument),
          teacher:users!crisis_notifications_teacher_id_fkey (first_name, last_name)
        `)
        .order('slot_start_datetime', { ascending: true });

      if (data) {
        setCrisisNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching crisis notifications:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchLiveStatusData();
    }, 5000);
    return () => clearInterval(interval);
  }, [schoolId]);

  const fetchLiveStatusData = async () => {
    try {
      // Fetch active sessions for Live Lab
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null);

      if (!sessErr && sessData) {
        const schoolSess = sessData
          .filter((s: any) => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            return u?.school_id === schoolId;
          })
          .map((s: any) => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));
        setActiveSessions(schoolSess);
      }

      // Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('*, users(*)')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setHelpRequests(helpData || []);

      // Fetch groovelab tickets
      const { data: ticketsData } = await supabase
        .from('groovelab_tickets')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (ticketsData) setTickets(ticketsData);

    } catch (err) {
      console.error("Error fetching live status data:", err);
    }
  };

  const handleLogoutStudent = React.useCallback(async (sessionId: string) => {
    if (!window.confirm('Ausloggen?')) return;
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    fetchLiveStatusData();
  }, [schoolId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch school settings
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('name, logo_url, primary_color, groovelab_kiosk_token, campus_login_token, allow_messages_global, has_campus_subscription, has_groovelab_subscription, is_paused, limits_enabled, user_quota, pending_user_quota')
        .eq('id', schoolId)
        .single();

      if (schoolErr) throw schoolErr;
      if (schoolData) {
        setSchoolName(schoolData.name);
        setEditColor(schoolData.primary_color || '#1a73e8');
        setLogoUrl(schoolData.logo_url || '');
        setKioskToken(schoolData.groovelab_kiosk_token || '');
        setCampusToken(schoolData.campus_login_token || '');
        setAllowMessagesGlobal(schoolData.allow_messages_global ?? true);
        const hasCampus = schoolData.has_campus_subscription ?? false;
        const hasGroove = schoolData.has_groovelab_subscription ?? false;
        setHasCampusSub(hasCampus);
        setHasGroovelabSub(hasGroove);
        if (!hasCampus && hasGroove) {
          setActiveTab('groovelab');
        } else if (hasCampus && !hasGroove) {
          setActiveTab('campus');
        }
        setIsPaused(schoolData.is_paused ?? false);
        setLimitsEnabled(schoolData.limits_enabled ?? false);
        const uq = schoolData.user_quota || 150;
        setUserQuota(uq);
        setActiveUserQuota(uq);
        setPendingUserQuota(schoolData.pending_user_quota);
      }

      // Fetch all users
      const { data: allUsers, error: usersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, email, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, nickname, is_premium_user, contract_ends_at')
        .eq('school_id', schoolId);

      if (usersErr) throw usersErr;

      // Fetch all schedules for dynamic student counting
      const { data: allScheds } = await supabase
        .from('schedules')
        .select('status, teacher_id, student_id')
        .eq('school_id', schoolId);

      const teacherStudentMap: Record<string, Set<string>> = {};
      if (allScheds) {
        allScheds.forEach(s => {
          if (s.status === 'approved' && s.teacher_id && s.student_id) {
            if (!teacherStudentMap[s.teacher_id]) {
              teacherStudentMap[s.teacher_id] = new Set();
            }
            teacherStudentMap[s.teacher_id].add(s.student_id);
          }
        });
      }

      const map: Record<string, string> = {};
      const coachesList: GrooveLabCoach[] = [];
      const campusTeachersList: any[] = [];
      const bypassList: BypassTeacher[] = [];
      const employeesList: any[] = [];
      const studentsList: any[] = [];

      allUsers?.forEach(u => {
        const fullName = `${u.first_name} ${u.last_name}`;
        map[u.id] = fullName;

        if (u.role === 'admin' || u.role === 'secretary') {
          employeesList.push(u);
        }

        if (u.role === 'student') {
          studentsList.push(u);
        }

        if (u.role === 'teacher' || u.role === 'admin') {
          const currentStudentCount = teacherStudentMap[u.id]?.size || 0;
          if (!u.is_active) {
            bypassList.push({
              id: u.id,
              firstName: u.first_name,
              lastName: u.last_name,
              email: u.email || '',
              instrument: u.instrument || '',
              maxStudents: 10,
              ausweisNummer: u.ausweis_nummer || '',
              teacherQrToken: u.teacher_qr_token || '',
              studentCount: currentStudentCount,
              contractEndsAt: u.contract_ends_at || null,
              isCampusActive: u.is_campus_active,
              isGroovelabActive: u.is_groovelab_active,
              isActive: u.is_active ?? false,
              role: u.role
            });
          } else {
            if (u.is_groovelab_active) {
              coachesList.push({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email || '',
                role: u.role,
                instrument: u.instrument || '',
                isActive: u.is_active ?? true,
                isCampusActive: u.is_campus_active,
                isGroovelabActive: u.is_groovelab_active,
                ausweisNummer: u.ausweis_nummer || '',
                teacherQrToken: u.teacher_qr_token || '',
                studentCount: currentStudentCount,
                contractEndsAt: u.contract_ends_at || null
              });
            }
            if (u.is_campus_active) {
              campusTeachersList.push({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email || '',
                role: u.role,
                instrument: u.instrument || '',
                isCampusActive: u.is_campus_active,
                isGroovelabActive: u.is_groovelab_active,
                isActive: u.is_active ?? true,
                ausweisNummer: u.ausweis_nummer || '',
                teacherQrToken: u.teacher_qr_token || '',
                studentCount: currentStudentCount,
                contractEndsAt: u.contract_ends_at || null
              });
            }
          }
        }
      });

      setUserMap(map);
      setCoaches(coachesList);
      setCampusTeachers(campusTeachersList);
      setBypassTeachers(bypassList);
      setEmployees(employeesList);
      setStudents(studentsList);

      // Fetch logged in user profile details
      if (userId) {
        const { data: currUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (currUser) {
          setCurrentUserProfile(currUser);
        }
      }

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('school_id', schoolId);

      const mappedRooms = (roomsData || []).map(r => ({
        ...r,
        equipment: r.allowed_instruments || []
      }));
      setRooms(mappedRooms);
      if (mappedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(mappedRooms[0].id);
      }

      const rMap: Record<string, string> = {};
      mappedRooms.forEach(r => {
        rMap[r.id] = r.name;
      });
      setRoomMap(rMap);

      // Fetch school equipment
      const { data: equipmentData } = await supabase
        .from('school_equipment')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      setSchoolEquipment(equipmentData || []);

      // Fetch stations
      const { data: stationsData } = await supabase
        .from('stations')
        .select('*')
        .eq('school_id', schoolId);
      setStations(stationsData || []);

      // Fetch system alerts
      const { data: alertsData, error: alertsErr } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (alertsErr) throw alertsErr;

      const mappedAlerts: SystemAlert[] = (alertsData || []).map(alert => ({
        id: alert.id,
        schoolId: alert.school_id,
        teacherId: alert.teacher_id,
        type: alert.type,
        message: alert.message,
        createdAt: alert.created_at,
        resolved: alert.resolved || false,
        teacherName: map[alert.teacher_id] || 'Unbekannte Lehrkraft'
      }));
      setAlerts(mappedAlerts);

      // Fetch all schedules for this school to build the Room Planner Matrix
      const { data: allSchedulesData, error: schedErr } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', schoolId);

      if (schedErr) throw schedErr;
      const mappedSchedules = (allSchedulesData || [])
        .filter(s => s.status === 'ready_for_admin_review')
        .map(s => ({
          ...s,
          teacher_name: map[s.teacher_id] || 'Unbekannte Lehrkraft',
          student_name: map[s.student_id] || 'Unbekannter Schüler',
          room_name: s.room_id ? rMap[s.room_id] || 'Unbekannter Raum' : 'Kein Raum'
        }));
      setPendingSchedules(mappedSchedules);

      // Group schedules by teacher_id and day_of_week to build matrixAllocations
      const teacherDays: Record<string, any[]> = {};
      (allSchedulesData || []).forEach(s => {
        if (s.status !== 'approved' && s.status !== 'ready_for_admin_review') return;
        const key = `${s.teacher_id}_${s.day_of_week}`;
        if (!teacherDays[key]) teacherDays[key] = [];
        teacherDays[key].push(s);
      });

      const initialAllocations = Object.entries(teacherDays).map(([key, slots]) => {
        const [teacherId, dayOfWeekStr] = key.split('_');
        const dayOfWeek = parseInt(dayOfWeekStr);

        const sortedSlots = [...slots].sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
        const startTime = sortedSlots[0]?.time_slot || '14:00';
        
        const addMins = (t: string, m: number) => {
          const [hStr, mStr] = t.split(':');
          let h = parseInt(hStr) || 0;
          let mVal = parseInt(mStr) || 0;
          mVal += m;
          h += Math.floor(mVal / 60);
          mVal = mVal % 60;
          h = h % 24;
          return `${String(h).padStart(2, '0')}:${String(mVal).padStart(2, '0')}`;
        };

        const lastSlot = sortedSlots[sortedSlots.length - 1];
        const endTime = lastSlot ? addMins(lastSlot.time_slot, lastSlot.duration || 45) : '15:00';

        const isPending = sortedSlots.some(s => s.status === 'ready_for_admin_review');
        const roomId = sortedSlots.find(s => s.room_id)?.room_id || null;

        const teacherProfile = campusTeachersList.find(t => t.id === teacherId);
        const teacherName = map[teacherId] || 'Unbekannte Lehrkraft';
        const instrument = teacherProfile?.instrument || 'Instrument';

        return {
          id: key,
          teacherId,
          teacherName,
          instrument,
          dayOfWeek,
          startTime,
          endTime,
          roomId,
          status: isPending ? 'pending' : 'approved',
          slots: sortedSlots
        };
      });

      setMatrixAllocations(initialAllocations);

      // Calculate stats
      const activeAlertsCount = mappedAlerts.filter(a => !a.resolved && a.type === 'capacity_overrun').length;
      const inactiveTeachersCount = bypassList.length;


      let draft = 0;
      let readyForReview = mappedSchedules.length;
      let approved = 0;
      if (allScheds) {
        allScheds.forEach(s => {
          if (s.status === 'draft') draft++;
          else if (s.status === 'approved') approved++;
        });
      }

      setBriefingData({
        openCapacityAlerts: activeAlertsCount,
        inactiveTeachers: inactiveTeachersCount,
        schedules: { draft, readyForReview, approved },
        alerts: mappedAlerts.filter(a => !a.resolved).map(a => ({
          id: a.id,
          type: a.type,
          message: schoolData?.allow_messages_global ? a.message : '[SYSTEM: Nachrichten global stummgeschaltet]',
          created_at: a.createdAt
        }))
      });

      // Fetch active sessions for Live Lab
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null);

      if (!sessErr && sessData) {
        const schoolSess = sessData
          .filter((s: any) => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            return u?.school_id === schoolId;
          })
          .map((s: any) => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));
        setActiveSessions(schoolSess);
      }

      // Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('*, users(*)')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setHelpRequests(helpData || []);

      // Fetch groovelab tickets
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('groovelab_tickets')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!ticketsErr && ticketsData) {
        setTickets(ticketsData);
      }

    } catch (err: any) {
      console.error('Error fetching secretary dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const response = await fetch('/api/groovelab/tickets/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ticketId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve ticket');
      }
      alert('Schaden erfolgreich behoben.');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Beheben des Schadens: ' + err.message);
    }
  };

  const handleBulkTeacherImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTxtInput.trim()) {
      alert('Bitte geben Sie Lehrerdaten ein.');
      return;
    }
    
    const lines = bulkTxtInput.split('\n');
    let successCount = 0;
    let failCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.split(',');
      if (parts.length < 2) {
        failCount++;
        continue;
      }
      
      const namePart = parts[0].trim();
      const email = parts[1].trim();
      const instrument = parts[2]?.trim() || 'Allgemein';
      const roleText = parts[3]?.trim()?.toLowerCase() || 'teacher';
      
      const nameParts = namePart.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      if (!firstName || !email) {
        failCount++;
        continue;
      }
      
      try {
        const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
        const qrToken = 't_' + Math.random().toString(36).substring(2, 12);
        const { error } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            first_name: firstName,
            last_name: lastName,
            email,
            instrument,
            role: roleText === 'admin' ? 'admin' : 'teacher',
            is_active: true,
            is_groovelab_active: true,
            is_campus_active: true,
            ausweis_nummer: pin,
            teacher_qr_token: qrToken
          });
          
        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error('Bulk import error for line: ' + trimmed, err);
        failCount++;
      }
    }
    
    alert(`Import abgeschlossen. Erfolgreich: ${successCount}, Fehlerhaft: ${failCount}`);
    setBulkTxtInput('');
    fetchDashboardData();
  };

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForOverride) return;
    
    try {
      const updates: any = {};
      if (newRoleOverride) {
        updates.role = newRoleOverride;
      }
      if (newPasswordOverride) {
        updates.personal_pin = newPasswordOverride;
      }
      
      if (Object.keys(updates).length === 0) {
        alert('Keine Änderungen ausgewählt.');
        return;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', selectedTeacherForOverride.id);
        
      if (error) throw error;
      
      alert('Lehrkraft-Details erfolgreich überschrieben.');
      setSelectedTeacherForOverride(null);
      setNewPasswordOverride('');
      setNewRoleOverride('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Überschreiben: ' + err.message);
    }
  };

  const handleToggleHolidayXp = (newValue: boolean) => {
    setHolidayXpActive(newValue);
    localStorage.setItem('groovelab_holiday_xp_active', newValue ? 'true' : 'false');
    alert(`Ferien Bonus XP erfolgreich ${newValue ? 'aktiviert' : 'deaktiviert'}.`);
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      setUpdatingAlertId(alertId);
      const { error } = await supabase
        .from('system_alerts')
        .update({ resolved: true })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    } finally {
      setUpdatingAlertId(null);
    }
  };

  const handleIncreaseLimit = async (teacherId: string, alertId?: string) => {
    try {
      setUpdatingTeacherId(teacherId);
      const { data: userData } = await supabase
        .from('users')
        .select('max_students')
        .eq('id', teacherId)
        .single();

      const currentLimit = userData?.max_students || 10;
      const newLimit = currentLimit + 5;

      const { error: userErr } = await supabase
        .from('users')
        .update({ max_students: newLimit })
        .eq('id', teacherId);

      if (userErr) throw userErr;
      if (alertId) await handleResolveAlert(alertId);

      alert(`Kapazität erfolgreich erweitert. Neues Schüler-Limit: ${newLimit}`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setUpdatingTeacherId(null);
    }
  };

  const handleRegenerateTokens = async () => {
    try {
      setRegeneratingTokens(true);
      const newKioskToken = 'kiosk_' + Math.random().toString(36).substring(2, 15);
      const newCampusToken = 'campus_' + Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('schools')
        .update({
          groovelab_kiosk_token: newKioskToken,
          campus_login_token: newCampusToken
        })
        .eq('id', schoolId);

      if (error) throw error;
      setKioskToken(newKioskToken);
      setCampusToken(newCampusToken);
      alert('Tokens wurden neu ausgestellt.');
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setRegeneratingTokens(false);
    }
  };

  const handleToggleMessagesGlobal = async (newValue: boolean) => {
    try {
      setAllowMessagesGlobal(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ allow_messages_global: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setAllowMessagesGlobal(!newValue);
    }
  };

  const handleToggleCampusSub = async (newValue: boolean) => {
    try {
      setHasCampusSub(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ has_campus_subscription: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setHasCampusSub(!newValue);
    }
  };

  const handleToggleGroovelabSub = async (newValue: boolean) => {
    try {
      setHasGroovelabSub(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ has_groovelab_subscription: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setHasGroovelabSub(!newValue);
    }
  };

  const handleToggleIsPaused = async (newValue: boolean) => {
    try {
      setIsPaused(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ is_paused: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setIsPaused(!newValue);
    }
  };

  const handleToggleLimitsEnabled = async (newValue: boolean) => {
    try {
      setLimitsEnabled(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ limits_enabled: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setLimitsEnabled(!newValue);
    }
  };

  const handleSaveQuota = async () => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          pending_user_quota: userQuota,
          quota_updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) throw error;
      setPendingUserQuota(userQuota);
      alert(`Erfolgreich! Dein gewünschtes Kontingent von ${userQuota} Usern wurde für den nächsten Monat vorgemerkt und kann bis zum Monatsende geändert werden.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleImportTeachers = async () => {
    if (!csvText.trim()) return;
    try {
      setImportStatus(null);
      const lines = csvText.split('\n');
      let successCount = 0;
      let skippedCount = 0;

      for (let line of lines) {
        line = line.trim();
        if (!line || line.toLowerCase().includes('vorname')) continue;

        const parts = line.split(/[;,]/);
        if (parts.length < 3) {
          skippedCount++;
          continue;
        }

        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const email = parts[2]?.trim();
        const instrument = parts[3]?.trim() || 'Allgemein';
        const maxStudents = parseInt(parts[4]?.trim()) || 10;
        const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
        const qrToken = 't_' + Math.random().toString(36).substring(2, 12);

        const { error } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            role: 'teacher',
            first_name: firstName,
            last_name: lastName,
            email: email,
            instrument: instrument,
            max_students: maxStudents,
            ausweis_nummer: pin,
            teacher_qr_token: qrToken,
            is_active: false,
            is_app_user: false,
            is_campus_active: false,
            is_groovelab_active: false
          });

        if (error) {
          console.error("Error inserting user during import:", error);
          skippedCount++;
        } else {
          successCount++;
        }
      }

      setImportStatus({
        success: true,
        message: `Import abgeschlossen: ${successCount} Lehrerprofile angelegt (inaktiv). PINs bereit zur Verteilung.`
      });
      setCsvText('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherFirstName.trim() || !newTeacherLastName.trim() || !newTeacherEmail.trim()) return;

    try {
      const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
      const qrToken = 't_' + Math.random().toString(36).substring(2, 12);

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: 'teacher',
          first_name: newTeacherFirstName.trim(),
          last_name: newTeacherLastName.trim(),
          email: newTeacherEmail.trim(),
          instrument: newTeacherInstrument.trim() || 'Allgemein',
          max_students: newTeacherLimit,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_active: false,
          is_app_user: false,
          is_campus_active: false,
          is_groovelab_active: false,
          contract_ends_at: newTeacherContractEndsAt || null
        });

      if (error) throw error;

      alert(`Lehrkraft ${newTeacherFirstName} ${newTeacherLastName} wurde erfolgreich angelegt.`);
      setNewTeacherFirstName('');
      setNewTeacherLastName('');
      setNewTeacherEmail('');
      setNewTeacherInstrument('');
      setNewTeacherLimit(10);
      setNewTeacherContractEndsAt('');
      setShowAddTeacherModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Lehrkraft: ' + err.message);
    }
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachFirstName || !coachLastName || !coachEmail) return;

    try {
      const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
      const qrToken = 't_' + Math.random().toString(36).substring(2, 12);

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: coachRole,
          first_name: coachFirstName,
          last_name: coachLastName,
          email: coachEmail,
          instrument: coachInstrument || 'Allgemein',
          is_active: true,
          is_app_user: true,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_campus_active: false,
          is_groovelab_active: true
        });

      if (error) throw error;

      alert(`Coach ${coachFirstName} ${coachLastName} wurde erfolgreich angelegt.`);
      setCoachFirstName('');
      setCoachLastName('');
      setCoachEmail('');
      setCoachInstrument('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFirstName || !employeeLastName || !employeeEmail) return;

    try {
      const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
      const qrToken = 't_' + Math.random().toString(36).substring(2, 12);

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: 'admin',
          first_name: employeeFirstName,
          last_name: employeeLastName,
          nickname: employeeNickname || null,
          email: employeeEmail,
          is_active: true,
          is_app_user: true,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_campus_active: false,
          is_groovelab_active: false
        });

      if (error) throw error;

      alert(`Mitarbeiter ${employeeFirstName} ${employeeLastName} wurde erfolgreich angelegt.`);
      setEmployeeFirstName('');
      setEmployeeLastName('');
      setEmployeeNickname('');
      setEmployeeEmail('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleCreateStudentCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentFirstName || !newStudentLastName) {
      alert('Bitte Vor- und Nachname ausfüllen.');
      return;
    }

    try {
      const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
      const qrToken = crypto.randomUUID();
      const defaultAvatarUrl = '/avatars/student_eguitar_1.png';

      // Generate a highly unique email using initials or timestamps to avoid duplicates
      const uniqueSuffix = Math.floor(100 + Math.random() * 900);
      const finalEmail = `${newStudentFirstName.toLowerCase().trim().replace(/\s+/g, '')}.${newStudentLastName.toLowerCase().trim().replace(/\s+/g, '')}${uniqueSuffix}@campus.groovelab.de`;

      const teacherId = newStudentTeacherId || null;

      // 1. Insert student user
      const { data: insertedStudent, error: insertError } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          teacher_id: teacherId,
          role: 'student',
          first_name: newStudentFirstName,
          last_name: newStudentLastName,
          nickname: newStudentNickname || null,
          email: finalEmail,
          instrument: newStudentInstrument || 'Allgemein',
          avatar_url: defaultAvatarUrl,
          is_active: true,
          is_campus_active: newStudentIsCampusActive,
          is_groovelab_active: newStudentIsGroovelabActive,
          status: 'active',
          ausweis_nummer: pin,
          qr_token: qrToken,
          lesson_duration: newStudentDuration // 30 by default
        })
        .select('id, first_name, last_name')
        .single();

      if (insertError) throw insertError;

      // 2. Initialize student avatar style
      await supabase.from('avatars').insert({
        user_id: insertedStudent.id,
        avatar_style: 'Standard_Silhouette',
        instrument_type: newStudentInstrument || 'Allgemein',
        evolution_level: 1
      });

      alert(`Schüler ${newStudentFirstName} ${newStudentLastName} wurde erfolgreich angelegt.`);
      
      // Reset form
      setNewStudentFirstName('');
      setNewStudentLastName('');
      setNewStudentNickname('');
      setNewStudentInstrument('');
      setNewStudentDuration(30);
      setNewStudentTeacherId('');
      setNewStudentIsAppUser(false);
      setNewStudentIsCampusActive(true);
      setNewStudentIsGroovelabActive(false);
      setShowAddStudentModal(false);
      
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Anlegen des Schülers: ' + err.message);
    }
  };

  const handleDeleteStudentCampus = async (studentId: string, name: string) => {
    if (!window.confirm(`Möchtest du den Schüler "${name}" wirklich unwiderruflich löschen?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId);
      if (error) throw error;
      alert(`Schüler "${name}" wurde gelöscht.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Löschen des Schülers: ' + err.message);
    }
  };

  const handleBulkStudentImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCsvText.trim()) {
      alert('Bitte geben Sie Schülerdaten ein.');
      return;
    }

    const lines = studentCsvText.split('\n');
    let successCount = 0;
    let failCount = 0;

    // Load unique teachers list for naming check
    const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    const errors: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Robust Delimiter Parsing
      let parts = trimmed.split(';');
      if (parts.length < 2) {
        parts = trimmed.split(',');
      }

      let namePart = '';
      let instrument = 'Allgemein';
      let email = '';
      let teacherNamePart = '';

      if (parts.length >= 2) {
        namePart = parts[0].trim();
        instrument = parts[1].trim() || 'Allgemein';
        email = parts[2]?.trim() || '';
        teacherNamePart = parts[3]?.trim()?.toLowerCase() || '';
      } else {
        namePart = trimmed;
      }

      const nameParts = namePart.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (!firstName) {
        failCount++;
        errors.push(`Zeile "${line}": Kein Vorname gefunden.`);
        continue;
      }

      // Try matching associated teacher name
      let teacherId: string | null = null;
      if (teacherNamePart) {
        const found = allUniqueTeachers.find(t => {
          const fName = (t.firstName || t.first_name || '').toLowerCase();
          const lName = (t.lastName || t.last_name || '').toLowerCase();
          return `${fName} ${lName}`.includes(teacherNamePart) || lName.includes(teacherNamePart);
        });
        if (found) {
          teacherId = found.id;
        }
      }

      try {
        const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
        const qrToken = crypto.randomUUID();
        const defaultAvatarUrl = '/avatars/student_eguitar_1.png';
        
        const uniqueSuffix = Math.floor(100 + Math.random() * 900);
        const finalEmail = email || `${firstName.toLowerCase().trim().replace(/\s+/g, '')}.${lastName.toLowerCase().trim().replace(/\s+/g, '')}${uniqueSuffix}@campus.groovelab.de`;

        const { data: insertedStudent, error: insertError } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            teacher_id: teacherId,
            role: 'student',
            first_name: firstName,
            last_name: lastName,
            email: finalEmail,
            instrument: instrument || 'Allgemein',
            avatar_url: defaultAvatarUrl,
            is_active: true,
            is_campus_active: true,
            is_groovelab_active: false,
            status: 'active',
            ausweis_nummer: pin,
            qr_token: qrToken,
            lesson_duration: 30 // 30 Min by default
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!insertedStudent) throw new Error("Keine ID vom Server zurückgegeben.");

        await supabase.from('avatars').insert({
          user_id: insertedStudent.id,
          avatar_style: 'Standard_Silhouette',
          instrument_type: instrument || 'Allgemein',
          evolution_level: 1
        });

        successCount++;
      } catch (err: any) {
        console.error('Import error for line:', line, err);
        errors.push(`Zeile "${line}": ${err.message || err}`);
        failCount++;
      }
    }

    if (errors.length > 0) {
      alert(`Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt, ${failCount} Fehler.\n\nFehlerdetails:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...weitere Fehler in der Browser-Konsole.' : ''}`);
    } else {
      alert(`Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt.`);
    }

    setStudentCsvText('');
    setIsStudentCsvExpanded(false);
    fetchDashboardData();
  };

  const renderCompactStudentBoard = () => {
    const isBadSaeckingen = schoolName.toLowerCase().includes('bad säckingen') || 
                            schoolName.toLowerCase().includes('bad saeckingen') || 
                            schoolName.toLowerCase().includes('bad sackingen') || 
                            schoolName.toLowerCase().includes('musäk');

    // Only show students who are active on Campus AND belong to Bad Säckingen
    const campusStudentsOnly = students.filter((s: any) => {
      return s.is_campus_active && isBadSaeckingen;
    });

    const uniqueInstruments = Array.from(new Set(campusStudentsOnly.map(s => s.instrument || 'Allgemein')));
    const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    const filteredStudents = campusStudentsOnly.filter((s: any) => {
      const firstName = (s.first_name || '').toLowerCase();
      const lastName = (s.last_name || '').toLowerCase();
      const nickname = (s.nickname || '').toLowerCase();
      const query = studentSearchQuery.toLowerCase().trim();
      
      const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || nickname.includes(query);
      const matchesInstrument = studentFilterInstrument === 'All' || (s.instrument || 'Allgemein') === studentFilterInstrument;
      const matchesTeacher = studentFilterTeacher === 'All' || s.teacher_id === studentFilterTeacher;
      
      let matchesStatus = true;
      if (studentFilterStatus === 'campus') matchesStatus = s.is_campus_active;
      else if (studentFilterStatus === 'groovelab') matchesStatus = s.is_groovelab_active;
      else if (studentFilterStatus === 'inactive') matchesStatus = !s.is_campus_active && !s.is_groovelab_active;

      return matchesSearch && matchesInstrument && matchesTeacher && matchesStatus;
    });

    // Pagination calculation
    const totalCount = filteredStudents.length;
    const totalPages = Math.ceil(totalCount / studentPageSize) || 1;
    const safeCurrentPage = Math.min(studentCurrentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * studentPageSize;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + studentPageSize);

    const totalStudents = campusStudentsOnly.length;
    const activeCampusCount = campusStudentsOnly.filter(s => s.is_campus_active).length;
    const activeGroovelabCount = campusStudentsOnly.filter(s => s.is_groovelab_active).length;

    // Helper for beautiful pastel background based on student name
    const getAvatarGradient = (name: string) => {
      const charCode = name.charCodeAt(0) || 65;
      const hue = (charCode * 23) % 360;
      return `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
    };
    const getAvatarTextColor = (name: string) => {
      const charCode = name.charCodeAt(0) || 65;
      const hue = (charCode * 23) % 360;
      return `hsl(${hue}, 90%, 25%)`;
    };

    return (
      <>
        <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'flex-start' }}>
          <div className="google-card" style={{ 
            flex: 1.8,
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px', 
            padding: '24px',
            borderRadius: '24px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
            minWidth: 0
          }}>
            {/* TITLE BLOCK */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={22} style={{ color: '#0f172a' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Schülerboard
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setIsStudentCsvExpanded(!isStudentCsvExpanded)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    borderRadius: '12px', 
                    padding: '8px 16px', 
                    fontSize: '0.8rem', 
                    fontWeight: 800,
                    background: isStudentCsvExpanded ? '#f1f5f9' : '#ffffff',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    transition: 'all 0.2s'
                  }}
                >
                  📄 Sammel-Onboarding (CSV) {isStudentCsvExpanded ? '▲' : '▼'}
                </button>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    borderRadius: '12px', 
                    padding: '8px 16px', 
                    fontSize: '0.8rem', 
                    fontWeight: 800,
                    background: '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    boxShadow: '0 4px 10px rgba(52,168,83,0.15)',
                    transition: 'all 0.2s'
                  }}
                >
                  ➕ Schüler anlegen
                </button>
              </div>
            </div>

            {/* CSV BOX */}
            {isStudentCsvExpanded && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Sammel-Onboarding via CSV (Schüler)</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Geben Sie eine Schülerliste ein. Format pro Zeile: <code>Vorname Nachname; Instrument; E-Mail (optional); Dozent-Name (optional)</code></span>
                <textarea
                  value={studentCsvText}
                  onChange={(e) => setStudentCsvText(e.target.value)}
                  placeholder={"Max Mustermann; Klavier; max@familie.de; Weber\nLisa Schmidt; E-Gitarre; ; Becker"}
                  style={{
                    width: '100%',
                    height: '100px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={handleBulkStudentImport}
                  className="google-btn-primary"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start', cursor: 'pointer' }}
                >
                  Schüler importieren
                </button>
              </div>
            )}

            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.62rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Schüler Gesamt</span>
                <strong style={{ fontSize: '1.4rem', color: '#1e3a8a', fontWeight: 900, fontFamily: 'Urbanist' }}>{totalStudents}</strong>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.62rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Campus Aktiv</span>
                <strong style={{ fontSize: '1.4rem', color: '#14532d', fontWeight: 900, fontFamily: 'Urbanist' }}>{activeCampusCount}</strong>
              </div>
              <div style={{ background: '#feefe3', border: '1px solid #fed7aa', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.62rem', color: '#854d0e', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>GrooveLab Aktiv</span>
                <strong style={{ fontSize: '1.4rem', color: '#713f12', fontWeight: 900, fontFamily: 'Urbanist' }}>{activeGroovelabCount}</strong>
              </div>
            </div>

            {/* FILTER & SEARCH */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              background: '#f8fafc', 
              padding: '12px', 
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1.5, minWidth: '200px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Schüler suchen..." 
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setStudentCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    outline: 'none',
                    background: 'white',
                    fontWeight: 700
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '130px' }}>
                <select 
                  value={studentFilterInstrument}
                  onChange={(e) => {
                    setStudentFilterInstrument(e.target.value);
                    setStudentCurrentPage(1);
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                >
                  <option value="All">🎸 Alle Instrumente</option>
                  {uniqueInstruments.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '130px' }}>
                <select 
                  value={studentFilterTeacher}
                  onChange={(e) => {
                    setStudentFilterTeacher(e.target.value);
                    setStudentCurrentPage(1);
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                >
                  <option value="All">👥 Alle Dozenten</option>
                  {allUniqueTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.lastName || t.last_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '130px' }}>
                <select
                  value={studentFilterStatus}
                  onChange={(e) => {
                    setStudentFilterStatus(e.target.value as any);
                    setStudentCurrentPage(1);
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                >
                  <option value="all">⚡ Alle Tarife</option>
                  <option value="campus">🎓 Campus Aktiv</option>
                  <option value="groovelab">🎸 GrooveLab Aktiv</option>
                  <option value="inactive">⚪ Inaktiv</option>
                </select>
              </div>
            </div>

            {/* LIST ROW VIEW CONTAINER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto', width: '100%' }}>
              {paginatedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.88rem', fontWeight: 700 }}>
                  Keine Schüler mit diesen Filtereinstellungen gefunden.
                </div>
              ) : (
                paginatedStudents.map((student: any) => {
                  return (
                    <div 
                      key={student.id} 
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        minWidth: '850px'
                      }}
                    >
                      {/* Avatar & Name */}
                      <div style={{ flex: '1.5', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: getAvatarGradient(`${student.first_name || ''} ${student.last_name || ''}`),
                          color: getAvatarTextColor(`${student.first_name || ''} ${student.last_name || ''}`),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.82rem',
                          fontWeight: 800
                        }}>
                          {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                            {student.first_name} {student.last_name}
                          </span>
                          {student.nickname && (
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic' }}>
                              „{student.nickname}“
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Instrument Badge */}
                      <div style={{ flex: '1', minWidth: '100px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          background: '#ffffff', 
                          color: '#475569', 
                          fontSize: '0.7rem', 
                          fontWeight: 800,
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          🎸 {student.instrument || 'Allgemein'}
                        </span>
                      </div>

                      {/* Teacher Select */}
                      <div style={{ flex: '1.2', minWidth: '120px' }}>
                        <select
                          value={student.teacher_id || ''}
                          onChange={async (e) => {
                            const { error } = await supabase
                              .from('users')
                              .update({ teacher_id: e.target.value || null })
                              .eq('id', student.id);
                            if (error) alert(error.message);
                            else fetchDashboardData();
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '4px 6px', 
                            borderRadius: '6px', 
                            border: '1px solid #cbd5e1', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            color: '#334155',
                            background: '#ffffff',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">Kein Dozent</option>
                          {allUniqueTeachers.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.lastName || t.last_name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration Select */}
                      <div style={{ flex: '0.7', minWidth: '70px' }}>
                        <select
                          value={student.lesson_duration || 30} // Default to 30 Min
                          onChange={async (e) => {
                            const { error } = await supabase
                              .from('users')
                              .update({ lesson_duration: parseInt(e.target.value) })
                              .eq('id', student.id);
                            if (error) alert(error.message);
                            else fetchDashboardData();
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '4px 6px', 
                            borderRadius: '6px', 
                            border: '1px solid #cbd5e1', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            color: '#334155',
                            background: '#ffffff',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={30}>30 Min</option>
                          <option value={45}>45 Min</option>
                          <option value={60}>60 Min</option>
                          <option value={90}>90 Min</option>
                        </select>
                      </div>

                      {/* Micro status toggles */}
                      <div style={{ flex: '1.4', display: 'flex', gap: '4px', minWidth: '140px' }}>
                        {/* Campus Toggle */}
                        <button
                          onClick={async () => {
                            const newVal = !student.is_campus_active;
                            const { error } = await supabase
                              .from('users')
                              .update({ is_campus_active: newVal })
                              .eq('id', student.id);
                            if (error) alert(error.message);
                            else fetchDashboardData();
                          }}
                          style={{
                            flex: 1,
                            padding: '3px 4px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: student.is_campus_active ? '#34a853' : '#e2e8f0',
                            color: student.is_campus_active ? '#ffffff' : '#475569',
                            transition: 'all 0.1s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🎓 Campus
                        </button>

                        {/* Groove Toggle */}
                        <button
                          onClick={async () => {
                            const newVal = !student.is_groovelab_active;
                            const { error } = await supabase
                              .from('users')
                              .update({ is_groovelab_active: newVal })
                              .eq('id', student.id);
                            if (error) alert(error.message);
                            else fetchDashboardData();
                          }}
                          style={{
                            flex: 1,
                            padding: '3px 4px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: student.is_groovelab_active ? '#ea4335' : '#e2e8f0',
                            color: student.is_groovelab_active ? '#ffffff' : '#475569',
                            transition: 'all 0.1s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🎸 Groove
                        </button>
                      </div>

                      {/* Access / Copy Parent Link */}
                      <div style={{ flex: '1', minWidth: '120px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        {student.is_app_user ? (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            color: '#475569',
                            background: '#f1f5f9',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontFamily: 'monospace'
                          }}>
                            📱 PIN: {student.ausweis_nummer || 'Keine'}
                          </span>
                        ) : (() => {
                          const parentLink = `${window.location.origin}/register-student?token=${student.qr_token || 'no-token'}`;
                          return (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(parentLink);
                                alert('Registrierungslink für Eltern wurde kopiert!');
                              }}
                              style={{
                                background: '#fff7ed',
                                color: '#ea580c',
                                border: '1px solid #ffedd5',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.1s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#ffedd5'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#fff7ed'}
                            >
                              🔗 Link
                            </button>
                          );
                        })()}

                        {/* Detail Profile Button */}
                        <button
                          onClick={() => setSelectedStudentForDetail(student)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Profil & Details"
                        >
                          🔍
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteStudentCampus(student.id, `${student.first_name} ${student.last_name}`)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Schüler unwiderruflich löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  Zeige {startIndex + 1} bis {Math.min(startIndex + studentPageSize, totalCount)} von {totalCount} gefilterten Schülern (Seite {safeCurrentPage} von {totalPages})
                </span>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button 
                    onClick={() => setStudentCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === 1 ? 0.5 : 1
                    }}
                  >
                    ⏪
                  </button>
                  <button 
                    onClick={() => setStudentCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === 1 ? 0.5 : 1
                    }}
                  >
                    ◀ Zurück
                  </button>

                  <span style={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 800, padding: '0 8px' }}>
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button 
                    onClick={() => setStudentCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={safeCurrentPage === totalPages}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Vor ▶
                  </button>

                  <button 
                    onClick={() => setStudentCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    ⏩
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Einträge pro Seite:</span>
                  <select
                    value={studentPageSize}
                    onChange={(e) => {
                      setStudentPageSize(parseInt(e.target.value));
                      setStudentCurrentPage(1);
                    }}
                    style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 800 }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Dozenten Sidebar */}
          <div className="google-card" style={{
            width: '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '24px',
            borderRadius: '24px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
            position: 'sticky',
            top: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} style={{ color: '#0f172a' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                Dozenten
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
              Klicke auf einen Dozenten, um das Sammel-Onboarding zu öffnen und direkt Schüler für ihn zu erfassen.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {allUniqueTeachers.map((t: any) => {
                const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
                const teacherLastName = t.lastName || t.last_name || '';
                const assignedCount = students.filter(s => s.teacher_id === t.id && s.is_campus_active).length;
                const initials = `${t.firstName?.[0] || t.first_name?.[0] || ''}${t.lastName?.[0] || t.last_name?.[0] || ''}`.toUpperCase() || 'D';

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setIsStudentCsvExpanded(true);
                      // Prompt for student name
                      const studentNamePrompt = prompt(`Name des Schülers für Dozent ${teacherLastName} eingeben:\n(Abbrechen für Musterzeile)`, "");
                      if (studentNamePrompt !== null) {
                        const finalName = studentNamePrompt.trim() || "Max Mustermann";
                        const instrumentPrompt = prompt(`Instrument für ${finalName}:`, t.instrument || "Klavier");
                        const finalInstrument = (instrumentPrompt || t.instrument || "Klavier").trim();
                        const customLine = `${finalName}; ${finalInstrument}; ; ${teacherLastName}`;
                        if (studentCsvText.trim()) {
                          setStudentCsvText(prev => prev.trim() + `\n${customLine}`);
                        } else {
                          setStudentCsvText(customLine);
                        }
                      } else {
                        // Template line fallback if cancelled
                        const presetLine = `Max Mustermann; ${t.instrument || 'Klavier'}; ; ${teacherLastName}`;
                        if (studentCsvText.trim()) {
                          setStudentCsvText(prev => prev.trim() + `\n${presetLine}`);
                        } else {
                          setStudentCsvText(presetLine);
                        }
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#bbf7d0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: getAvatarGradient(teacherName),
                        color: getAvatarTextColor(teacherName),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {initials}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {teacherName}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650 }}>
                          {t.instrument || 'Dozent'}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '0.65rem',
                      fontWeight: 850,
                      padding: '3px 8px',
                      borderRadius: '20px',
                      flexShrink: 0
                    }}>
                      {assignedCount} Schüler
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MANAGE STUDENT MODAL */}
        {showAddStudentModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Modal Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  ➕ Neuen Schüler anlegen
                </h3>
                <button 
                  onClick={() => setShowAddStudentModal(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateStudentCampus} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '75vh' }}>
                
                {/* Form fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudentFirstName}
                      onChange={(e) => setNewStudentFirstName(e.target.value)}
                      placeholder="z.B. Max"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudentLastName}
                      onChange={(e) => setNewStudentLastName(e.target.value)}
                      placeholder="z.B. Mustermann"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Spitzname / Rufname (optional)</label>
                  <input 
                    type="text" 
                    value={newStudentNickname}
                    onChange={(e) => setNewStudentNickname(e.target.value)}
                    placeholder="z.B. Mäxi"
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Hauptinstrument</label>
                    <input 
                      type="text" 
                      value={newStudentInstrument}
                      onChange={(e) => setNewStudentInstrument(e.target.value)}
                      placeholder="z.B. E-Gitarre"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Unterrichtsdauer</label>
                    <select
                      value={newStudentDuration}
                      onChange={(e) => setNewStudentDuration(parseInt(e.target.value))}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    >
                      <option value={30}>30 Min (Standard)</option>
                      <option value={45}>45 Min</option>
                      <option value={60}>60 Min</option>
                      <option value={90}>90 Min</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Zugeordneter Hauptlehrer</label>
                    <select
                      value={newStudentTeacherId}
                      onChange={(e) => setNewStudentTeacherId(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    >
                      <option value="">Keine Zuweisung</option>
                      {allUniqueTeachers.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.firstName || t.first_name} {t.lastName || t.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Toggles */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1e293b' }}>Campus Modul aktiv</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Aktiviert die Teilnahme an den Campus-Stundenplänen.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={newStudentIsCampusActive}
                      onChange={(e) => setNewStudentIsCampusActive(e.target.checked)}
                      style={{ accentColor: '#34a853', width: '18px', height: '18px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1e293b' }}>GrooveLab Modul aktiv</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Erlaubt dem Schüler die Nutzung der GrooveLab-App.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={newStudentIsGroovelabActive}
                      onChange={(e) => setNewStudentIsGroovelabActive(e.target.checked)}
                      style={{ accentColor: '#ea4335', width: '18px', height: '18px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1e293b' }}>Direkter App-Nutzer (Tablet PIN)</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Erstellt direkt einen App-PIN. Sonst wird ein Eltern-Link generiert.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={newStudentIsAppUser}
                      onChange={(e) => setNewStudentIsAppUser(e.target.checked)}
                      style={{ accentColor: '#2563eb', width: '18px', height: '18px' }}
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="google-btn-primary"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', marginTop: '8px' }}
                >
                  Schüler anlegen
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  };

  const handleLinkProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampusStudentId || !selectedGroovelabStudentId) {
      alert('Bitte wähle beide Profile aus.');
      return;
    }
    if (selectedCampusStudentId === selectedGroovelabStudentId) {
      alert('Du kannst nicht dasselbe Profil mit sich selbst verknüpfen.');
      return;
    }

    try {
      setLinkingInProgress(true);

      // 1. Update target Campus profile: set is_groovelab_active to true
      const { error: updateTargetErr } = await supabase
        .from('users')
        .update({ is_groovelab_active: true })
        .eq('id', selectedCampusStudentId);
      if (updateTargetErr) throw updateTargetErr;

      // 2. Re-link sessions
      await supabase
        .from('sessions')
        .update({ user_id: selectedCampusStudentId })
        .eq('user_id', selectedGroovelabStudentId);

      // 3. Re-link band members (if not already member)
      const { data: existingMembers } = await supabase
        .from('band_members')
        .select('band_id')
        .eq('user_id', selectedCampusStudentId);
      const targetBands = new Set(existingMembers?.map(m => m.band_id) || []);

      const { data: oldMemberships } = await supabase
        .from('band_members')
        .select('*')
        .eq('user_id', selectedGroovelabStudentId);

      if (oldMemberships) {
        for (const membership of oldMemberships) {
          if (!targetBands.has(membership.band_id)) {
            // Re-link
            await supabase
              .from('band_members')
              .update({ user_id: selectedCampusStudentId })
              .eq('id', membership.id);
          } else {
            // Already member, delete old membership to avoid duplicates
            await supabase
              .from('band_members')
              .delete()
              .eq('id', membership.id);
          }
        }
      }

      // 4. Re-link band song slots
      await supabase
        .from('band_song_slots')
        .update({ user_id: selectedCampusStudentId })
        .eq('user_id', selectedGroovelabStudentId);

      // 5. Re-link user song skills
      await supabase
        .from('user_song_skills')
        .update({ user_id: selectedCampusStudentId })
        .eq('user_id', selectedGroovelabStudentId);

      // 6. Delete old GrooveLab profile
      const { error: deleteOldErr } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedGroovelabStudentId);
      if (deleteOldErr) throw deleteOldErr;

      alert('Die Profile wurden erfolgreich verknüpft! Die GrooveLab-Daten wurden auf das Campus-Profil übertragen.');
      setSelectedCampusStudentId('');
      setSelectedGroovelabStudentId('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler bei der Verknüpfung: ' + err.message);
    } finally {
      setLinkingInProgress(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Diesen Account wirklich entfernen?')) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleToggleTeacherGroovelab = async (teacherId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_groovelab_active: !currentVal })
        .eq('id', teacherId);

      if (error) throw error;
      alert(`GrooveLab-Zugang erfolgreich ${!currentVal ? 'aktiviert' : 'deaktiviert'}.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleScheduleDecision = async (id: string, approve: boolean) => {
    try {
      const nextStatus = approve ? 'approved' : 'draft';
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  // CSP Solver for Room Allocation
  const runAutoRoomAllocation = () => {
    // 1. Sort plans: variable ordering (drums/schlagzeug first since they are the most constrained)
    const sortedPlans = [...matrixAllocations].sort((a, b) => {
      const aIsDrums = a.instrument?.toLowerCase().includes('schlagzeug') || a.instrument?.toLowerCase().includes('drums');
      const bIsDrums = b.instrument?.toLowerCase().includes('schlagzeug') || b.instrument?.toLowerCase().includes('drums');
      if (aIsDrums && !bIsDrums) return -1;
      if (!aIsDrums && bIsDrums) return 1;
      return 0;
    });

    const isOverlap = (p1: any, p2: any) => {
      return p1.startTime < p2.endTime && p2.startTime < p1.endTime;
    };

    // Tracks current allocations during solver execution
    const assigned: Record<string, string> = {};

    // Keep already manually assigned rooms
    matrixAllocations.forEach(p => {
      if (p.roomId) {
        assigned[p.id] = p.roomId;
      }
    });

    // Find historical room assignments for teachers to fulfill the soft constraint
    const teacherHistory: Record<string, string> = {};
    matrixAllocations.forEach(p => {
      if (p.roomId) {
        teacherHistory[p.teacherId] = p.roomId;
      }
    });

    for (const plan of sortedPlans) {
      if (plan.roomId) continue;

      let bestRoomId: string | null = null;
      let candidates = [...rooms];
      const instr = plan.instrument?.toLowerCase() || '';

      // Instrument matching using name and r.equipment
      if (instr.includes('schlagzeug') || instr.includes('drums')) {
        candidates = rooms.filter(r => {
          const eq = r.equipment;
          const hasEquip = Array.isArray(eq) && (eq.includes('drums') || eq.includes('schlagzeug') || eq.includes('drum'));
          return hasEquip || r.name.toLowerCase().includes('schlagzeug') || r.name.toLowerCase().includes('drums') || r.name.toLowerCase().includes('band') || r.name.toLowerCase().includes('drum');
        });
        if (candidates.length === 0) candidates = [...rooms];
      } else if (instr.includes('klavier') || instr.includes('piano')) {
        candidates = rooms.filter(r => {
          const eq = r.equipment;
          const hasEquip = Array.isArray(eq) && (eq.includes('piano') || eq.includes('klavier') || eq.includes('keys'));
          return hasEquip || r.name.toLowerCase().includes('klavier') || r.name.toLowerCase().includes('piano') || r.name.toLowerCase().includes('flügel');
        });
        if (candidates.length === 0) candidates = [...rooms];
      }

      // Soft Constraint check: prioritize historically assigned rooms for this teacher
      const historicalRoomId = teacherHistory[plan.teacherId];
      if (historicalRoomId) {
        const hasConflict = sortedPlans.some(p => {
          const allocatedRoom = assigned[p.id] || p.roomId;
          return allocatedRoom === historicalRoomId && p.dayOfWeek === plan.dayOfWeek && isOverlap(p, plan);
        });
        if (!hasConflict) {
          bestRoomId = historicalRoomId;
        }
      }

      // If no historical match, search candidate rooms first
      if (!bestRoomId) {
        for (const room of candidates) {
          const hasConflict = sortedPlans.some(p => {
            const allocatedRoom = assigned[p.id] || p.roomId;
            return allocatedRoom === room.id && p.dayOfWeek === plan.dayOfWeek && isOverlap(p, plan);
          });

          if (!hasConflict) {
            bestRoomId = room.id;
            break;
          }
        }
      }

      // Fallback: search all rooms if candidate rooms are exhausted or full
      if (!bestRoomId) {
        for (const room of rooms) {
          const hasConflict = sortedPlans.some(p => {
            const allocatedRoom = assigned[p.id] || p.roomId;
            return allocatedRoom === room.id && p.dayOfWeek === plan.dayOfWeek && isOverlap(p, plan);
          });

          if (!hasConflict) {
            bestRoomId = room.id;
            break;
          }
        }
      }

      if (bestRoomId) {
        assigned[plan.id] = bestRoomId;
      }
    }

    setMatrixAllocations(prev => prev.map(p => ({
      ...p,
      roomId: assigned[p.id] || p.roomId
    })));
  };

  // Bulk save and approve to database
  const handleSaveAndApproveAll = async () => {
    try {
      const promises = [];
      for (const plan of matrixAllocations) {
        const slotIds = plan.slots.map((s: any) => s.id);
        if (slotIds.length === 0) continue;

        const promise = supabase
          .from('schedules')
          .update({
            room_id: plan.roomId || null,
            status: 'approved'
          })
          .in('id', slotIds);

        promises.push(promise);
      }

      await Promise.all(promises);
      alert('Raumzuteilung erfolgreich gespeichert und alle Stundenpläne freigegeben!');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error saving allocations:', err);
      alert('Fehler: ' + err.message);
    }
  };

  // Reject an entire teacher's day plan back to draft
  const handleRejectTeacherDayPlan = async (plan: any) => {
    if (!window.confirm(`Möchtest du den Stundenplan von ${plan.teacherName} für diesen Tag wirklich zur Überarbeitung zurückweisen?`)) return;
    try {
      const slotIds = plan.slots.map((s: any) => s.id);
      if (slotIds.length === 0) return;

      const { error } = await supabase
        .from('schedules')
        .update({ status: 'draft' })
        .in('id', slotIds);

      if (error) throw error;
      setSelectedDayPlan(null);
      alert('Stundenplan erfolgreich zur Überarbeitung zurückgewiesen.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error rejecting plan:', err);
      alert('Fehler: ' + err.message);
    }
  };

  // Drag and drop matrix logic
  const handleDragStartMatrix = (planId: string) => {
    setDraggedPlanId(planId);
    const plan = matrixAllocations.find(p => p.id === planId);
    setDraggedPlanDay(plan?.dayOfWeek ?? null);
  };

  const handleDropOnMatrix = (targetRoomId: string | null, targetDay: number) => {
    if (!draggedPlanId || draggedPlanDay === null) return;
    // ── Day-lock: only allow drops within the same weekday column ──
    if (targetDay !== draggedPlanDay) {
      setDraggedPlanId(null);
      setDraggedPlanDay(null);
      return;
    }
    setMatrixAllocations(prev => prev.map(p => {
      if (p.id === draggedPlanId) {
        return { ...p, roomId: targetRoomId };
      }
      return p;
    }));
    setDraggedPlanId(null);
    setDraggedPlanDay(null);
  };

  // ── Räume CRUD ──────────────────────────────────────────────────────────
  const handleSaveRoom = async () => {
    if (!roomFormName.trim() || !schoolId) return;
    setRoomSaving(true);
    try {
      if (editingRoom) {
        const { error } = await supabase.from('rooms').update({
          name: roomFormName.trim(),
          allowed_instruments: roomFormEquipment,
          max_teachers: roomFormMaxTeachers,
          max_students: roomFormMaxStudents,
          qm: roomFormQm
        }).eq('id', editingRoom.id);
        
        if (error) throw error;

        setRooms(prev => prev.map(r => r.id === editingRoom.id
          ? { 
              ...r, 
              name: roomFormName.trim(), 
              allowed_instruments: roomFormEquipment, 
              equipment: roomFormEquipment, 
              max_teachers: roomFormMaxTeachers,
              max_students: roomFormMaxStudents,
              qm: roomFormQm
            }
          : r));
      } else {
        const { data, error } = await supabase.from('rooms').insert({
          school_id: schoolId,
          name: roomFormName.trim(),
          allowed_instruments: roomFormEquipment,
          max_teachers: roomFormMaxTeachers,
          max_students: roomFormMaxStudents,
          qm: roomFormQm,
          sort_order: rooms.length,
        }).select().single();
        
        if (error) throw error;
        if (data) {
          setRooms(prev => [...prev, {
            ...data,
            equipment: data.allowed_instruments || []
          }]);
        }
      }
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormEquipment([]);
      setRoomFormMaxTeachers(1);
      setRoomFormMaxStudents(1);
      setRoomFormQm(0);
      setRoomsSubView('overview');
    } catch (e: any) {
      console.error('Room save error:', e);
      alert('Fehler beim Speichern des Raumes: ' + e.message);
    } finally {
      setRoomSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const hasSchedules = matrixAllocations.some(p => p.roomId === roomId);
    if (hasSchedules) {
      alert('Dieser Raum ist noch aktiven Stundenplänen zugewiesen. Bitte zuerst im Stundenplan-Board die Zuweisung entfernen.');
      return;
    }
    if (!window.confirm('Raum wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (err: any) {
      console.error('Error deleting room:', err);
      alert('Fehler beim Löschen des Raumes: ' + err.message);
    }
  };

  const openRoomEditor = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setRoomFormName(room.name || '');
      setRoomFormEquipment(Array.isArray(room.equipment) ? room.equipment : []);
      setRoomFormMaxTeachers(room.max_teachers || 1);
      setRoomFormMaxStudents(room.max_students || 1);
      setRoomFormQm(room.qm || 0);
    } else {
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormEquipment([]);
      setRoomFormMaxTeachers(1);
      setRoomFormMaxStudents(1);
      setRoomFormQm(0);
    }
    setRoomsSubView('settings');
  };


  const handleSaveEquipment = async () => {
    if (!equipmentFormName.trim() || !schoolId) return;
    setEquipmentSaving(true);
    try {
      if (editingEquipment) {
        const { error } = await supabase.from('school_equipment').update({
          name: equipmentFormName.trim()
        }).eq('id', editingEquipment.id);
        if (error) throw error;
        setSchoolEquipment(prev => prev.map(e => e.id === editingEquipment.id ? { ...e, name: equipmentFormName.trim() } : e));
      } else {
        const { data, error } = await supabase.from('school_equipment').insert({
          school_id: schoolId,
          name: equipmentFormName.trim()
        }).select().single();
        if (error) throw error;
        if (data) setSchoolEquipment(prev => [...prev, data]);
      }
      setEditingEquipment(null);
      setEquipmentFormName('');
    } catch (e: any) {
      console.error('Equipment save error:', e);
      alert('Fehler beim Speichern der Ausstattung: ' + e.message);
    } finally {
      setEquipmentSaving(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Ausstattung wirklich löschen? Dieser Eintrag wird auch aus Räumen entfernt, in denen er verwendet wird.')) return;
    try {
      const { error } = await supabase.from('school_equipment').delete().eq('id', id);
      if (error) throw error;
      setSchoolEquipment(prev => prev.filter(e => e.id !== id));
      // Optionally re-fetch rooms or manually pull it out from rooms locally
      const { data: roomsData } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
      setRooms((roomsData || []).map(r => ({ ...r, equipment: r.allowed_instruments || [] })));
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const openEquipmentEditor = (eq?: any) => {
    if (eq) {
      setEditingEquipment(eq);
      setEquipmentFormName(eq.name);
    } else {
      setEditingEquipment(null);
      setEquipmentFormName('');
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'secretary':
        switch (secretarySubTab) {
          case 'briefing': return '📊 Tägliches Briefing & Status';
          case 'equipment': return '🎸 Instrumente & Ausstattung';
          case 'employees': return '👥 Mitarbeiterverwaltung';
          case 'linking': return '🔗 Schüler-Profilverknüpfung';
          case 'licenses': return '🎫 Lizenzen & Abrechnung';
          case 'setup': return '⚙️ Setup & Systemeinstellungen';
          default: return '💼 Verwaltung';
        }
      case 'campus':
        switch (campusSubTab) {
          case 'briefing': return '🎓 Campus-Zentrale';
          case 'onboarding': return 'Lehrer-Onboarding';
          case 'schedules': return 'Stundenpläne';
          case 'status': return 'Status & API';
          default: return '🎓 Campus Verwaltung';
        }
      case 'groovelab':
        switch (groovelabSubTab) {
          case 'briefing': return '🎸 GrooveLab Dashboard';
          case 'live': return 'Live Lab';
          case 'coaches': return 'Lehrer';
          case 'students': return 'Schüler';
          case 'status': return 'Support & Inventar';
          case 'kiosk': return 'Setup';
          default: return '🎸 GrooveLab Verwaltung';
        }
      default: return '';
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg || !manageTeacher) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `QR_Code_${manageTeacher.firstName || 'User'}_${manageTeacher.lastName || ''}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1d1d1f',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Global CSS injections matching the screenshot design */}
      <style dangerouslySetInnerHTML={{__html: `
        .google-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%) !important;
          backdrop-filter: blur(24px) saturate(1.8) !important;
          -webkit-backdrop-filter: blur(24px) saturate(1.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          position: relative;
        }
        .google-card:hover {
          transform: translateY(-2px) scale(1.01) !important;
          box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
        }
        .google-btn-primary {
          background: #d81e05; /* Swiss Red */
          color: #ffffff;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: -0.01em;
        }
        .google-btn-primary:hover {
          background: #b71904;
          box-shadow: 0 4px 12px rgba(216, 30, 5, 0.25);
        }
        .google-btn-secondary {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: var(--glass-blur);
          color: #12141a;
          border: 1px solid rgba(0, 0, 0, 0.1);
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .google-btn-secondary:hover {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.2);
        }
        .google-sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 20px;
          border-radius: 9999px;
          border: none;
          font-size: 0.88rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-secondary);
          text-align: left;
          box-sizing: border-box;
          margin-bottom: 4px;
          position: relative;
        }
        .google-sidebar-item:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        /* Active states for each tab theme */
        .google-sidebar-item.active.briefing {
          background: rgba(234, 67, 53, 0.08) !important;
          color: #ea4335 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.briefing .sidebar-icon-circle {
          background: #ea4335 !important;
          color: #ffffff;
        }
        .google-sidebar-item.active.campus {
          background: rgba(52, 168, 83, 0.08) !important;
          color: #34a853 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.campus .sidebar-icon-circle {
          background: #34a853 !important;
          color: #ffffff;
        }
        .google-sidebar-item.active.groovelab {
          background: rgba(251, 188, 5, 0.12) !important;
          color: #fbbc05 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.groovelab .sidebar-icon-circle {
          background: #fbbc05 !important;
          color: #ffffff;
        }
        .google-sidebar-item.groovelab-dark {
          color: #a1a1aa !important;
        }
        .google-sidebar-item.groovelab-dark:hover {
          background: rgba(251, 188, 5, 0.08) !important;
          color: #fbbc05 !important;
        }
        .google-sidebar-item.groovelab-dark.active {
          background: rgba(251, 188, 5, 0.15) !important;
          color: #fbbc05 !important;
        }
        .google-sidebar-item.groovelab-dark.active .sidebar-icon-circle {
          background: #fbbc05 !important;
          color: #09090b !important;
        }

        /* Inactive badge style */
        .sidebar-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--text-secondary);
        }
        .google-sidebar-item:hover .sidebar-icon-circle {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
        }

        .ticket-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.2s;
        }
      `}} />

      {/* LEFT SIDEBAR PANEL - GLASS WITH BLUR */}
      <div 
        className="glass-sidebar"
        style={{
          width: '280px',
          padding: '36px 20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          height: '100vh',
          boxSizing: 'border-box',
          overflowY: 'auto',
          flexShrink: 0,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0'
        }}
      >
        {/* Brand header / Logo */}
        <div style={{ paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            {activeTab === 'secretary' ? (
              <Shield size={28} color="#ea4335" strokeWidth={3} />
            ) : activeTab === 'campus' ? (
              <GraduationCap size={28} color="#34a853" strokeWidth={3} />
            ) : (
              <Music size={28} color="#eab308" strokeWidth={3} />
            )}
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 900, 
            color: activeTab === 'secretary' ? '#ea4335' : activeTab === 'campus' ? '#34a853' : '#eab308',
            letterSpacing: '-0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            {activeTab === 'secretary' ? 'Verwaltung' : activeTab === 'campus' ? 'Campus' : 'GrooveLab'}
          </div>
        </div>

        {/* Dynamic Sidebar Nav Items based on active workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          
          {/* If activeTab is Secretary */}
          {activeTab === 'secretary' && [
            { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
            { id: 'rooms', label: 'Räume', icon: DoorOpen },
            { id: 'equipment', label: 'Instrumente & Ausstattung', icon: Settings },
            { id: 'employees', label: 'Mitarbeiter', icon: Users },
            { id: 'linking', label: 'Profil-Verknüpfung', icon: LinkIcon },
            { id: 'licenses', label: 'Lizenzen', icon: Award },
            { id: 'setup', label: 'Setup & Design', icon: Settings }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = secretarySubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSecretarySubTab(item.id as any)}
                className={`google-sidebar-item briefing ${isSelected ? 'active briefing' : ''}`}
              >
                <div className="sidebar-icon-circle briefing">
                  <Icon size={16} />
                </div>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}

          {/* If activeTab is Campus */}
          {activeTab === 'campus' && [
            { id: 'briefing', label: 'Startseite', icon: LayoutDashboard },
            { id: 'onboarding', label: 'Lehrer', icon: UserPlus },
            { id: 'students', label: 'Schüler', icon: Users },
            { id: 'schedules', label: `Stundenpläne`, count: pendingSchedules.length, icon: Calendar },
            { id: 'status', label: 'Status & API', icon: Sliders }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = campusSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCampusSubTab(item.id as any)}
                className={`google-sidebar-item campus ${isSelected ? 'active campus' : ''}`}
              >
                <div className="sidebar-icon-circle campus">
                  <Icon size={16} />
                </div>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    background: isSelected ? '#34a853' : '#e6f4ea',
                    color: isSelected ? '#ffffff' : '#34a853',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '100px'
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* If activeTab is GrooveLab */}
          {activeTab === 'groovelab' && [
            { id: 'briefing', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'coaches', label: 'Lehrer', icon: Coffee },
            { id: 'students', label: 'Schüler', icon: Users },
            { id: 'status', label: 'Support & Inventar', icon: ShieldAlert },
            { id: 'kiosk', label: 'Setup', icon: Sliders }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = groovelabSubTab === item.id;
            const itemClass = 'google-sidebar-item groovelab-dark';
            return (
              <button
                key={item.id}
                onClick={() => setGroovelabSubTab(item.id as any)}
                className={`${itemClass} ${isSelected ? 'active' : ''}`}
              >
                <div className="sidebar-icon-circle groovelab">
                  <Icon size={16} />
                </div>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Profile Info at bottom of sidebar */}
        <div style={{ borderTop: activeTab === 'campus' ? '1px solid #d1fae5' : '1px solid #fef3c7', paddingTop: '20px' }}>
          <div 
            onClick={() => {
              if (activeTab === 'secretary') setSecretarySubTab('briefing');
              else if (activeTab === 'campus') setCampusSubTab('briefing');
              else setGroovelabSubTab('briefing');
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: secretarySubTab === 'briefing' ? (activeTab === 'campus' ? '#ecfdf5' : '#fffbeb') : 'transparent',
              marginBottom: '8px'
            }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                {currentUserProfile?.photo_url ? (
                  <img src={currentUserProfile.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#e8f0fe', color: '#0b57d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                    {currentUserProfile?.first_name?.[0] || 'S'}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUserProfile?.nickname || currentUserProfile?.first_name || 'Verwaltung'}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Schulsekretariat
              </div>
            </div>
          </div>
          
          {onLogout && (
            <button 
              onClick={onLogout}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px 12px', 
                borderRadius: '12px', 
                border: 'none', 
                background: 'transparent', 
                color: '#ef4444', 
                fontWeight: 800, 
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <LogOut size={16} color="#ef4444" /> Abmelden
            </button>
          )}
        </div>
      </div>

      {/* RIGHT CONTENT PANE */}
      <div style={{
        flex: 1,
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        color: '#1d1d1f',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Top Header with App Suite Switcher Tabs (Karteireiter) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          height: '80px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          {/* App Switcher Tabs */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            gap: '6px', 
            height: '100%',
            paddingTop: '20px',
            boxSizing: 'border-box'
          }}>
            {/* Sekretariat Tab Button */}
            <div 
              onClick={() => {
                setActiveTab('secretary');
                localStorage.setItem('groovelab_active_workspace', 'secretary');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px 10px',
                borderRadius: '12px 12px 0 0',
                background: activeTab === 'secretary' ? '#ea4335' : 'rgba(234, 67, 53, 0.05)',
                color: activeTab === 'secretary' ? '#ffffff' : '#ea4335',
                border: activeTab === 'secretary' ? '1px solid #ea4335' : '1px solid rgba(234, 67, 53, 0.18)',
                borderBottom: 'none',
                fontWeight: 750,
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activeTab === 'secretary' ? 2 : 1,
                transform: activeTab === 'secretary' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activeTab === 'secretary' ? '0 -4px 16px rgba(234, 67, 53, 0.18)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: '44px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <Shield size={15} color={activeTab === 'secretary' ? '#ffffff' : '#ea4335'} />
              <span>Verwaltung</span>
            </div>

            {hasCampusSub && (
              /* Campus Tab Button */
              <div 
                onClick={() => {
                  setActiveTab('campus');
                  localStorage.setItem('groovelab_active_workspace', 'campus');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px 10px',
                  borderRadius: '12px 12px 0 0',
                  background: activeTab === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.05)',
                  color: activeTab === 'campus' ? '#ffffff' : '#34a853',
                  border: activeTab === 'campus' ? '1px solid #34a853' : '1px solid rgba(52, 168, 83, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activeTab === 'campus' ? 2 : 1,
                  transform: activeTab === 'campus' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activeTab === 'campus' ? '0 -4px 16px rgba(52, 168, 83, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <GraduationCap size={15} color={activeTab === 'campus' ? '#ffffff' : '#34a853'} />
                <span>Campus</span>
              </div>
            )}

            {hasGroovelabSub && (
              /* GrooveLab Tab Button */
              <div 
                onClick={() => {
                  setActiveTab('groovelab');
                  localStorage.setItem('groovelab_active_workspace', 'groovelab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px 10px',
                  borderRadius: '12px 12px 0 0',
                  background: activeTab === 'groovelab' ? '#fbbc05' : 'rgba(251, 188, 5, 0.05)',
                  color: activeTab === 'groovelab' ? '#09090b' : '#b45309',
                  border: activeTab === 'groovelab' ? '1px solid #fbbc05' : '1px solid rgba(251, 188, 5, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activeTab === 'groovelab' ? 2 : 1,
                  transform: activeTab === 'groovelab' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activeTab === 'groovelab' ? '0 -4px 16px rgba(251, 188, 5, 0.18)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: '44px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <Music size={15} color={activeTab === 'groovelab' ? '#09090b' : '#b45309'} />
                <span>GrooveLab</span>
              </div>
            )}
          </div>

          {/* Action & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* School Pill */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(239, 68, 68, 0.06)', 
              padding: '8px 16px', 
              borderRadius: '12px', 
              border: '1px solid rgba(239, 68, 68, 0.18)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <School size={14} color="#ef4444" />
              <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {schoolName || 'Meine Musikschule'}
              </span>
            </div>

            {/* Role Pill */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(139, 92, 246, 0.06)', 
              padding: '8px 16px', 
              borderRadius: '12px', 
              border: '1px solid rgba(139, 92, 246, 0.18)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <Shield size={14} color="#8b5cf6" />
              <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verwaltung
              </span>
            </div>

            <button 
              onClick={fetchDashboardData}
              disabled={loading}
              className="google-btn-primary"
              style={{ background: activeTab === 'secretary' ? '#ea4335' : activeTab === 'campus' ? '#34a853' : '#fbbc05', color: activeTab === 'groovelab' ? '#09090b' : '#ffffff' }}
            >
              Aktualisieren
            </button>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderLeft: '1px solid rgba(0,0,0,0.08)', paddingLeft: '20px' }}>
              <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={fetchDashboardData} />
              
              {/* User Name */}
              {currentUserProfile && (
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {currentUserProfile.first_name} {currentUserProfile.last_name}
                </span>
              )}

              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8f0fe', color: '#0b57d0', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', overflow: 'hidden' }}>
                {currentUserProfile?.photo_url ? (
                  <img src={currentUserProfile.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                  currentUserProfile?.first_name?.[0] || 'A'
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Thin accent line matching the active tab label color */}
        <div style={{
          height: '3px',
          background: activeTab === 'secretary' ? '#ea4335' : activeTab === 'campus' ? '#34a853' : '#fbbc05',
          width: '100%',
          flexShrink: 0
        }} />

        {/* Main scrollable body content */}
        <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, overflowY: 'auto' }}>
          
          {/* crisis notifications operations cockpit */}
          {crisisNotifications.length > 0 && (
            <div style={{
              background: activeTab === 'campus' ? '#fff5f5' : '#2d1a1a',
              border: activeTab === 'campus' ? '1px solid #fecaca' : '1px solid #7f1d1d',
              borderRadius: '24px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.03)'
            }} className="animation-slide-up">
              <style>{`
                @keyframes pulse-red-border {
                  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 1); }
                  70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
                  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
                }
                .pulsing-red-ticket {
                  animation: pulse-red-border 1.5s infinite;
                  background-color: #ffffff !important;
                  border: 2px solid #ef4444 !important;
                }
              `}</style>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: activeTab === 'campus' ? '1px solid #fee2e2' : '1px solid #7f1d1d', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '14px' }}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: activeTab === 'campus' ? '#991b1b' : '#fecaca', fontFamily: 'Urbanist' }}>🚨 OPERATIONS-COCKPIT: KRISEN-DASHBOARD</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: activeTab === 'campus' ? '#b91c1c' : '#fca5a5', fontWeight: 600, fontFamily: 'Inter' }}>Automatisierte Krankmeldungs-Kaskade aktiv</p>
                  </div>
                </div>
                <div style={{ background: activeTab === 'campus' ? '#fee2e2' : '#7f1d1d', color: activeTab === 'campus' ? '#991b1b' : '#fecaca', padding: '6px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid ' + (activeTab === 'campus' ? '#fee2e2' : '#7f1d1d'), fontFamily: 'Inter' }}>
                  {crisisNotifications.filter(n => n.status === 'UNREAD').length} Offene Fälle
                </div>
              </div>

              {/* CRISIS TICKETS RENDER */}
              {(() => {
                const now = new Date();
                
                // Helper to classify tickets
                const classifiedTickets = crisisNotifications.map(t => {
                  const urgency = t.status === 'READ' ? 'GREEN' : ( (new Date(t.slot_start_datetime).getTime() - now.getTime()) / (1000 * 60) < 120 ? 'RED' : 'YELLOW' );
                  return { ...t, urgency };
                });

                // RED Tickets pushed to absolute top of the entire dashboard
                const redTickets = classifiedTickets.filter(t => t.urgency === 'RED');

                // Date categorisation for yellow/green tickets
                const getDayDiff = (d1: Date, d2: Date) => {
                  const t1 = new Date(d1).setHours(0,0,0,0);
                  const t2 = new Date(d2).setHours(0,0,0,0);
                  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
                };

                const todayTickets = classifiedTickets.filter(t => t.urgency !== 'RED' && getDayDiff(new Date(t.slot_start_datetime), now) === 0);
                const tomorrowTickets = classifiedTickets.filter(t => t.urgency !== 'RED' && getDayDiff(new Date(t.slot_start_datetime), now) === 1);
                const futureTickets = classifiedTickets.filter(t => t.urgency !== 'RED' && getDayDiff(new Date(t.slot_start_datetime), now) > 1);

                const renderTicketCard = (t: any) => {
                  const studentName = t.student ? `${t.student.first_name} ${t.student.last_name}` : 'Unbekannter Schüler';
                  const teacherName = t.teacher ? `${t.teacher.first_name} ${t.teacher.last_name}` : 'Lehrkraft';
                  const supportPin = t.student?.personal_pin || t.student?.ausweis_id || '999999';
                  const subject = t.student?.instrument || 'Musikunterricht';
                  const timeStr = new Date(t.slot_start_datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  const dateStr = new Date(t.slot_start_datetime).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

                  let cardClass = '';
                  let urgencyBadge = '';
                  let urgencyStyle = {};

                  if (t.urgency === 'RED') {
                    cardClass = 'pulsing-red-ticket';
                    urgencyBadge = '🔴 Sofort anrufen!';
                    urgencyStyle = { background: '#ef4444', color: 'white' };
                  } else if (t.urgency === 'YELLOW') {
                    cardClass = '';
                    urgencyBadge = '🟡 Ungelesen (Puffer)';
                    urgencyStyle = { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' };
                  } else {
                    cardClass = '';
                    urgencyBadge = '🟢 Informiert (Gelesen)';
                    urgencyStyle = { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
                  }

                  return (
                    <div
                      key={t.id}
                      className={cardClass}
                      style={{
                        background: t.urgency === 'GREEN' ? (activeTab === 'campus' ? '#f8fafc' : '#18181b') : (activeTab === 'campus' ? 'white' : '#27272a'),
                        border: activeTab === 'campus' ? '1.5px solid #e2e8f0' : '1.5px solid #3f3f46',
                        borderRadius: '20px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        opacity: t.urgency === 'GREEN' ? 0.65 : 1,
                        transition: 'opacity 0.2s',
                        position: 'relative',
                        boxShadow: t.urgency === 'RED' ? '0 10px 15px -3px rgba(239, 68, 68, 0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: activeTab === 'campus' ? '#1e293b' : '#ffffff' }}>{studentName}</strong>
                          <div style={{ fontSize: '0.72rem', color: activeTab === 'campus' ? '#64748b' : '#a1a1aa', marginTop: '4px', fontWeight: 650 }}>
                            Lehrer: {teacherName} • Fach: {subject}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          ...urgencyStyle
                        }}>
                          {urgencyBadge}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: activeTab === 'campus' ? '1px solid #f1f5f9' : '1px solid #3f3f46', paddingTop: '10px', fontSize: '0.78rem' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Termin:</span>
                          <strong style={{ color: activeTab === 'campus' ? '#334155' : '#cbd5e1' }}>{dateStr} - {timeStr} Uhr</strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Support-PIN (Telefon):</span>
                          <strong style={{ color: '#ef4444', letterSpacing: '0.05em', fontSize: '0.85rem' }}>{supportPin}</strong>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* 1. RED PRIORITY SECTION */}
                    {redTickets.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚠️ AKUTE ESKALATION (UNTERRICHTS-BEGINN IN UNTER 2 STUNDEN)
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          {redTickets.map(renderTicketCard)}
                        </div>
                      </div>
                    )}

                    {/* 2. TODAY */}
                    {todayTickets.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: activeTab === 'campus' ? '#475569' : '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Heute betroffene Schüler
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          {todayTickets.map(renderTicketCard)}
                        </div>
                      </div>
                    )}

                    {/* 3. TOMORROW */}
                    {tomorrowTickets.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: activeTab === 'campus' ? '#475569' : '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Morgen betroffene Schüler
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          {tomorrowTickets.map(renderTicketCard)}
                        </div>
                      </div>
                    )}

                    {/* 4. FUTURE */}
                    {futureTickets.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: activeTab === 'campus' ? '#475569' : '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Zukünftige Ausfälle
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          {futureTickets.map(renderTicketCard)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Active Tab Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {!(activeTab === 'campus' && campusSubTab === 'onboarding') && (
                <>
                  <h2 className="swiss-h1" style={{ margin: 0, color: activeTab === 'campus' ? '#10b981' : '#f59e0b' }}>
                    {getTabTitle()}
                  </h2>
                  <p style={{ color: activeTab === 'campus' ? '#64748b' : '#a1a1aa', fontWeight: 500, fontSize: '0.85rem', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {currentUserProfile 
                      ? `${currentUserProfile.first_name} ${currentUserProfile.last_name || ''} • Schulsekretariat` 
                      : 'Schulsekretariat'
                    }
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            </div>
          </div>

          {/* TAB 1: SECRETARY - BRIEFING */}
          {activeTab === 'secretary' && secretarySubTab === 'briefing' && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            
            {/* LEFT COLUMN: GREETING & WIDGET KPI GRID & TAGESPLAN */}
            <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 className="swiss-h2" style={{ margin: 0, color: '#ea4335', fontFamily: 'Urbanist', fontWeight: 900 }}>
                  Systemauslastung stabil, {students.filter(s => s.is_active).length} Lizenzen aktiv erfasst.
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, fontFamily: 'Inter' }}>
                  Heute ist {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} &bull; Ausfall-Kaskaden aktiv &bull; {pendingSchedules.length} Freigaben ausstehend.
                </p>
              </div>

              {/* AdminLTE style KPI Cards row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '8px' }}>
                {/* Card 1: Blue */}
                <div style={{ background: '#007bff', color: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                  <div style={{ padding: '20px 20px 10px 20px', position: 'relative', zIndex: 2 }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{students.filter((s: any) => s.is_active).length + coaches.length}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', opacity: 0.9 }}>Aktive Lizenzen</div>
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '4.5rem', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }}>👥</div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.1)', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Mehr Infos ➜
                  </div>
                </div>

                {/* Card 2: Green */}
                <div style={{ background: '#28a745', color: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                  <div style={{ padding: '20px 20px 10px 20px', position: 'relative', zIndex: 2 }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{((students.filter((s: any) => s.is_active).length * 0.49) + 4.99 + (students.filter((s: any) => s.is_premium_user).length * 9.99)).toFixed(2)} €</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', opacity: 0.9 }}>Umsatz-Tacho</div>
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '4.5rem', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }}>📈</div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.1)', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Mehr Infos ➜
                  </div>
                </div>

                {/* Card 3: Yellow */}
                <div style={{ background: '#fbbc05', color: '#1f2937', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                  <div style={{ padding: '20px 20px 10px 20px', position: 'relative', zIndex: 2 }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{pendingSchedules.length}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', opacity: 0.9 }}>Reviews Ausstehend</div>
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '4.5rem', opacity: 0.25, pointerEvents: 'none', zIndex: 1 }}>📅</div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.1)', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Mehr Infos ➜
                  </div>
                </div>

                {/* Card 4: Red */}
                <div style={{ background: '#dc3545', color: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                  <div style={{ padding: '20px 20px 10px 20px', position: 'relative', zIndex: 2 }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{tickets.filter((t: any) => t.status === 'OPEN').length}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', opacity: 0.9 }}>Offene Tickets</div>
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '4.5rem', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }}>🎫</div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.1)', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Mehr Infos ➜
                  </div>
                </div>
              </div>

              {/* Tagesplan Card styled exactly like screenshot */}
              <div className="google-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937' }}>
                    <Calendar size={20} color="#0b57d0" />
                    <strong style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Urbanist' }}>Tagesplan</strong>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '100px',
                    background: '#e8f0fe',
                    color: '#0b57d0',
                    fontFamily: 'Inter'
                  }}>
                    LIVE
                  </span>
                </div>

                {/* Timeline content mimicking screenshot layout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '11px', width: '2px', background: '#e2e8f0' }} />
                  
                  {/* Current Slot */}
                  <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0b57d0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #ffffff' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
                    </div>
                    <div style={{ flex: 1, padding: '16px 20px', borderRadius: '16px', border: '1.5px solid #e8f0fe', background: '#f8fafc', fontFamily: 'Inter' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="swiss-label">Aktuelle System-Prüfung</span>
                          <h4 style={{ margin: '2px 0 0 0', fontSize: '0.92rem', fontWeight: 700, color: '#1f2937' }}>Infrastruktur &amp; Auslastung</h4>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 600 }}>100% stabil</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                        GrooveLab Kiosk API &bull; Campus DB-Sync aktiv.
                      </p>
                    </div>
                  </div>

                  {/* Pending Schedules Slot */}
                  <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #ffffff' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                    </div>
                    <div style={{ flex: 1, fontFamily: 'Inter' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="swiss-label">Stundenplan-Reviews</span>
                          <h5 style={{ margin: '2px 0 0 0', fontSize: '0.88rem', fontWeight: 700, color: '#4b5563' }}>
                            {briefingData?.schedules.readyForReview || 0} Ausstehende Freigaben
                          </h5>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Review-Modus</span>
                      </div>
                    </div>
                  </div>

                  {/* Bypass Lehrer Slot */}
                  <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #ffffff' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                    </div>
                    <div style={{ flex: 1, fontFamily: 'Inter' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="swiss-label">Campus Onboarding</span>
                          <h5 style={{ margin: '2px 0 0 0', fontSize: '0.88rem', fontWeight: 700, color: '#4b5563' }}>
                            {briefingData?.inactiveTeachers || 0} Inaktive Profile (Bypass)
                          </h5>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Warten auf Aktivierung</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Relationship Banner styled exactly like green card in screenshot */}
              <div style={{
                background: '#e6f4ea', 
                borderRadius: '24px', 
                padding: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                color: '#137333',
                border: '1px solid rgba(52, 168, 83, 0.1)',
                fontFamily: 'Inter'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                }}>
                  🎂
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '2px', fontFamily: 'Urbanist', fontWeight: 800 }}>Beziehungsticker: Campus &amp; GrooveLab</strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#137333', opacity: 0.9 }}>
                    Alle Plattform-Schnittstellen laufen synchron. Keine Kommunikations-Ausfälle erfasst.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE-AUSFALLTICKER & ADMIN TICKETS */}
            <div style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
              
              {/* Live warning ticker styled exactly like red card in screenshot */}
              <div style={{
                background: '#fee2e2',
                borderRadius: '24px',
                padding: '24px',
                border: '1.5px solid #fecaca',
                color: '#7f1d1d'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} color="#991b1b" />
                    <strong style={{ fontSize: '0.92rem', fontWeight: 800 }}>Auslastungs-Ticker</strong>
                  </div>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#991b1b',
                    color: '#ffffff'
                  }}>
                    JETZT
                  </span>
                </div>

                {alerts.filter(a => !a.resolved).length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#991b1b' }}>
                    Optimaler Zustand. Es liegen keine aktiven Limit-Überschreitungen vor.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.filter(a => !a.resolved).slice(0, 2).map(alert => (
                      <div key={alert.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{alert.teacherName}</span>
                          <span style={{ fontSize: '0.65rem', background: '#991b1b', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>LIMIT EXCEEDED</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.9 }}>
                          {alert.message}
                        </p>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        setActiveTab('campus');
                        setCampusSubTab('status');
                      }} 
                      className="google-btn-secondary" 
                      style={{ background: 'transparent', color: '#991b1b', borderColor: '#fca5a5', width: '100%', fontSize: '0.75rem', padding: '8px' }}
                    >
                      Zum Störungsprotokoll
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Tickets Card styled exactly like screenshot */}
              <div className="google-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1f2937' }}>
                  <ClipboardList size={20} color="#0b57d0" />
                  <strong style={{ fontSize: '0.98rem', fontWeight: 700 }}>Ausstehende Aufgaben</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {pendingSchedules.slice(0, 3).map(sched => (
                    <div 
                      key={sched.id} 
                      className="ticket-item"
                      onClick={() => { setActiveTab('campus'); setCampusSubTab('schedules'); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={16} color="#64748b" />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1f2937', fontWeight: 700 }}>Stundenplan-Freigabe</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{sched.teacher_name} &bull; {sched.student_name}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#9ca3af" />
                    </div>
                  ))}

                  {bypassTeachers.slice(0, 2).map(teacher => (
                    <div 
                      key={teacher.id} 
                      className="ticket-item"
                      onClick={() => { setActiveTab('campus'); setCampusSubTab('onboarding'); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Key size={16} color="#64748b" />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1f2937', fontWeight: 700 }}>Bypass-Aktivierung</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{teacher.firstName} {teacher.lastName} &bull; {teacher.ausweisNummer}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#9ca3af" />
                    </div>
                  ))}

                  {pendingSchedules.length === 0 && bypassTeachers.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px' }}>
                      Keine ausstehenden Freigaben oder Aktivierungen vorhanden.
                    </p>
                  )}
                </div>

                {(pendingSchedules.length > 0 || bypassTeachers.length > 0) && (
                  <button 
                    onClick={() => { setActiveTab('campus'); setCampusSubTab('schedules'); }} 
                    className="google-btn-secondary" 
                    style={{ width: '100%', marginTop: '16px', fontSize: '0.8rem', padding: '10px' }}
                  >
                    Alle Tickets anzeigen
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 1.5: SECRETARY - EMPLOYEES */}
        {activeTab === 'secretary' && secretarySubTab === 'employees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Form to add an employee */}
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-blue" style={{ background: '#0b57d0' }} />
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800 }}>👤 Neuen Mitarbeiter anlegen</h3>
              <form onSubmit={handleCreateEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <input 
                  type="text" 
                  required 
                  placeholder="Vorname *" 
                  value={employeeFirstName} 
                  onChange={(e) => setEmployeeFirstName(e.target.value)} 
                  style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} 
                />
                <input 
                  type="text" 
                  required 
                  placeholder="Nachname *" 
                  value={employeeLastName} 
                  onChange={(e) => setEmployeeLastName(e.target.value)} 
                  style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} 
                />
                <input 
                  type="text" 
                  placeholder="Spitzname (für Briefing)" 
                  value={employeeNickname} 
                  onChange={(e) => setEmployeeNickname(e.target.value)} 
                  style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} 
                />
                <input 
                  type="email" 
                  required 
                  placeholder="E-Mail *" 
                  value={employeeEmail} 
                  onChange={(e) => setEmployeeEmail(e.target.value)} 
                  style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} 
                />
                <button type="submit" className="google-btn-primary" style={{ background: '#0b57d0', color: '#ffffff' }}>Mitarbeiter anlegen</button>
              </form>
            </div>

            {/* List of employees */}
            <div className="google-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800 }}>👥 Verwaltung &amp; Administration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {employees.map(emp => (
                  <div key={emp.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#1d1d1f', display: 'block' }}>
                          {emp.first_name} {emp.last_name}
                        </strong>
                        {emp.nickname && (
                          <span style={{ fontSize: '0.75rem', color: '#0b57d0', fontWeight: 600 }}>
                            Spitzname: "{emp.nickname}"
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          {emp.email}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.62rem', background: '#e8f0fe', color: '#0b57d0', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                        {emp.role === 'admin' ? 'Admin' : 'Verwaltung'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #dadce0', paddingTop: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Mitarbeiter-PIN</span>
                        <strong style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: '#4b5563' }}>{emp.ausweis_nummer || 'Keine'}</strong>
                      </div>
                      {emp.id !== userId && (
                        <button 
                          onClick={() => handleDeleteUser(emp.id)} 
                          style={{ border: 'none', background: 'transparent', color: '#ea4335', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.6: SECRETARY - LINKING */}
        {activeTab === 'secretary' && secretarySubTab === 'linking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Explanation & Form */}
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-blue" style={{ background: '#0b57d0' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800 }}>🔗 Profile manuell verknüpfen</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: '1.4' }}>
                Führe ein reines Campus-Profil und ein reines GrooveLab-Profil desselben Schülers zusammen. 
                Nach der Verknüpfung nutzt der Schüler ein einziges Profil für beide Plattformen. 
                Sämtliche Aktivitäten und Stundenpläne bleiben erhalten und werden unter dem Campus-Profil zusammengeführt.
              </p>

              <form onSubmit={handleLinkProfiles} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4b5563', marginBottom: '6px' }}>
                    1. Campus-Profil auswählen (Verbleibendes Hauptprofil)
                  </label>
                  <select 
                    value={selectedCampusStudentId} 
                    onChange={(e) => setSelectedCampusStudentId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Campus-Schüler auswählen (Nur Campus aktiv) --</option>
                    {students
                      .filter(s => s.is_campus_active && !s.is_groovelab_active)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name || ''} ({s.email || 'Keine E-Mail'})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', fontWeight: 800 }}>
                  <span>➕</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4b5563', marginBottom: '6px' }}>
                    2. GrooveLab-Profil auswählen (Wird in Campus-Profil gemerged & gelöscht)
                  </label>
                  <select 
                    value={selectedGroovelabStudentId} 
                    onChange={(e) => setSelectedGroovelabStudentId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.85rem' }}
                  >
                    <option value="">-- GrooveLab-Schüler auswählen (Nur GrooveLab aktiv) --</option>
                    {students
                      .filter(s => s.is_groovelab_active && !s.is_campus_active)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name || ''} ({s.email || 'Keine E-Mail'})
                        </option>
                      ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={linkingInProgress}
                  className="google-btn-primary" 
                  style={{ alignSelf: 'flex-start', background: '#0b57d0' }}
                >
                  {linkingInProgress ? 'Verknüpfung läuft...' : 'Profile jetzt zusammenführen'}
                </button>
              </form>
            </div>

            {/* Quick Overview of already unified profiles */}
            <div className="google-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>✅ Bereits verknüpfte Schüler (Aktiv auf Campus & GrooveLab)</h3>
              
              {students.filter(s => s.is_campus_active && s.is_groovelab_active).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Bisher keine Schüler auf beiden Plattformen aktiv.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {students
                    .filter(s => s.is_campus_active && s.is_groovelab_active)
                    .map(s => (
                      <div key={s.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {s.first_name?.[0] || 'S'}
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem' }}>{s.first_name} {s.last_name || ''}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: 700 }}>
                            🎓 Campus & 🎸 GrooveLab Aktiv
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: CAMPUS */}
        {activeTab === 'campus' && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            
            {/* Left Content Pane (Main Board Content) */}
            <div style={{ flex: campusSubTab === 'onboarding' ? '1' : '1.6', display: 'flex', flexDirection: 'column', gap: '24px', width: campusSubTab === 'onboarding' ? '100%' : 'auto' }}>
              
              {/* Subtab: Startseite (Briefing) */}
              {campusSubTab === 'briefing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-green" style={{ background: '#34a853' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 850, color: '#137333' }}>
                      🎓 Campus-Zentrale &amp; Startseite
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#5f6368', lineHeight: '1.5' }}>
                      Willkommen in der Campus-Verwaltung. Hier koordinierst du die Lehrkräfte, das Onboarding neuer Kolleginnen und Kollegen sowie die Stundenplan-Freigaben für deine Musikschule.
                    </p>

                    {(() => {
                      const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
                        if (!acc.some(existing => existing.id === t.id)) {
                          acc.push(t);
                        }
                        return acc;
                      }, []);
                      const totalStudentsSum = allUniqueTeachers.reduce((sum, t) => sum + (t.studentCount || 0), 0);
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '16px' }}>
                          <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesamt Lehrkräfte</span>
                            <strong style={{ display: 'block', fontSize: '2.2rem', color: '#1e3a8a', marginTop: '6px', fontWeight: 900, fontFamily: 'Urbanist' }}>{allUniqueTeachers.length}</strong>
                          </div>
                          <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktive Campus-Lehrer</span>
                            <strong style={{ display: 'block', fontSize: '2.2rem', color: '#14532d', marginTop: '6px', fontWeight: 900, fontFamily: 'Urbanist' }}>{campusTeachers.length}</strong>
                          </div>
                          <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <span style={{ fontSize: '0.75rem', color: '#854d0e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inaktive Profile (Bypass)</span>
                            <strong style={{ display: 'block', fontSize: '2.2rem', color: '#713f12', marginTop: '6px', fontWeight: 900, fontFamily: 'Urbanist' }}>{bypassTeachers.length}</strong>
                          </div>
                          <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fca5a5', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler-Belegungen</span>
                            <strong style={{ display: 'block', fontSize: '2.2rem', color: '#991b1b', marginTop: '6px', fontWeight: 900, fontFamily: 'Urbanist' }}>{totalStudentsSum}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Campus Announcements */}
                  <div className="google-card" style={{ padding: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#1f2937' }}>📌 Wichtige Hinweise &amp; tägliche Aufgaben</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc' }}>
                        <span style={{ fontSize: '1.25rem' }}>📢</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1f2937' }}>Stundenplan-Reviews:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Es stehen aktuell {pendingSchedules.length} Stundenpläne zur Review bereit. Bitte prüfe die Belegung, um Konflikte zu vermeiden.</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc' }}>
                        <span style={{ fontSize: '1.25rem' }}>🔑</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1f2937' }}>Lehrer-Bypass:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Es warten noch {bypassTeachers.length} Lehrkräfte auf ihre finale Aktivierung via Support-PIN.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab: Onboarding */}
              {campusSubTab === 'onboarding' && (() => {
                // Deduplicate teachers
                const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const filteredTeachers = allUniqueTeachers.filter((t: any) => {
                  const firstName = (t.firstName || t.first_name || '').toLowerCase();
                  const lastName = (t.lastName || t.last_name || '').toLowerCase();
                  const email = (t.email || '').toLowerCase();
                  const query = teacherSearchQuery.toLowerCase().trim();
                  
                  const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || email.includes(query);
                  
                  const isCampus = t.isCampusActive || t.is_campus_active;
                  const isActive = t.isActive ?? t.is_active;
                  const matchesStatus = teacherStatusTab === 'all' ||
                    (teacherStatusTab === 'active' && isCampus && isActive) ||
                    (teacherStatusTab === 'inactive' && !isActive);
                    
                  return matchesSearch && matchesStatus;
                });

                const totalStudentsSum = allUniqueTeachers.reduce((sum, t) => sum + (t.studentCount || 0), 0);

                return (
                  <div className="google-card" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '28px', 
                    width: '100%',
                    padding: '32px',
                    borderRadius: '24px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02)'
                  }}>
                    {/* TITLE BLOCK */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={22} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Lehrerverwaltung
                      </h3>
                    </div>

                    {/* ONBOARDING ACTION BAR */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      alignItems: 'center', 
                      marginTop: '24px', 
                      marginBottom: isCsvExpanded ? '8px' : '24px',
                      flexWrap: 'wrap',
                      width: '100%'
                    }}>
                      <button
                        onClick={() => setIsCsvExpanded(!isCsvExpanded)}
                        className="google-btn-secondary"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          borderRadius: '16px', 
                          padding: '12px 24px', 
                          fontSize: '0.88rem', 
                          fontWeight: 800,
                          background: isCsvExpanded ? '#f1f5f9' : '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s',
                          flex: 3,
                          justifyContent: 'center',
                          minWidth: '320px'
                        }}
                      >
                        📄 Sammel-Onboarding via CSV {isCsvExpanded ? '▲' : '▼'}
                      </button>

                      <button
                        onClick={() => setShowAddTeacherModal(true)}
                        className="google-btn-primary"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          borderRadius: '16px', 
                          padding: '12px 24px', 
                          fontSize: '0.88rem', 
                          fontWeight: 800,
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                          flex: 1,
                          justifyContent: 'center',
                          minWidth: '180px'
                        }}
                      >
                        ➕ Lehrkraft hinzufügen
                      </button>
                    </div>

                    {/* Collapsible CSV Onboarding Card */}
                    {isCsvExpanded && (
                      <div className="google-card" style={{ 
                        padding: '28px', 
                        borderRadius: '24px', 
                        border: '1px solid #e2e8f0', 
                        background: '#ffffff',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
                        marginTop: '16px',
                        marginBottom: '24px',
                        width: '100%',
                        animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Urbanist' }}>
                          📄 Sammel-Onboarding via CSV
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>
                            Formatvorlage kopieren oder Lehrkräfte eintragen:
                          </p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#000000', fontFamily: 'monospace', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                            Vorname; Nachname; E-Mail; Hauptinstrument
                          </p>
                          <textarea
                            placeholder="Markus; Weber; markus@schule.de; Gitarre&#10;Anna; Becker; anna@schule.de; Gesang"
                            value={csvText}
                            onChange={(e) => setCsvText(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              height: '144px',
                              borderRadius: '12px',
                              border: '1.5px solid #cbd5e1',
                              padding: '12px',
                              fontSize: '0.82rem',
                              fontFamily: 'monospace',
                              background: '#f8fafc',
                              outline: 'none',
                              color: '#334155',
                              transition: 'border-color 0.2s',
                              resize: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0b57d0'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                          />
                          {importStatus && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#e8f0fe', border: '1px solid #bfdbfe', color: '#0b57d0', fontSize: '0.78rem', fontWeight: 650 }}>
                              {importStatus.message}
                            </div>
                          )}

                          <div style={{ display: 'flex', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleImportTeachers}
                              className="google-btn-primary"
                              style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '0.82rem', fontWeight: 700, width: '100%', cursor: 'pointer' }}
                            >
                              Import starten
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REDESIGNED CONTROLS PANEL */}
                    <div className="google-card" style={{ 
                      padding: '24px', 
                      borderRadius: '24px', 
                      border: '1px solid #e2e8f0', 
                      background: '#ffffff',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        {/* Search field */}
                        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                          <input
                            type="text"
                            placeholder="Lehrkraft nach Name oder E-Mail suchen..."
                            value={teacherSearchQuery}
                            onChange={(e) => setTeacherSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 16px 12px 42px',
                              borderRadius: '16px',
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.88rem',
                              outline: 'none',
                              background: '#f8fafc',
                              color: '#334155',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0b57d0';
                              e.target.style.background = '#ffffff';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e2e8f0';
                              e.target.style.background = '#f8fafc';
                            }}
                          />
                          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        </div>

                        {/* Category Status Filters */}
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '16px', gap: '4px' }}>
                          <button
                            onClick={() => setTeacherStatusTab('all')}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '12px',
                              border: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: teacherStatusTab === 'all' ? '#ffffff' : 'transparent',
                              color: teacherStatusTab === 'all' ? '#0f172a' : '#64748b',
                              boxShadow: teacherStatusTab === 'all' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Alle
                          </button>
                          <button
                            onClick={() => setTeacherStatusTab('active')}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '12px',
                              border: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: teacherStatusTab === 'active' ? '#ffffff' : 'transparent',
                              color: teacherStatusTab === 'active' ? '#166534' : '#64748b',
                              boxShadow: teacherStatusTab === 'active' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Aktiv (Campus)
                          </button>
                          <button
                            onClick={() => setTeacherStatusTab('inactive')}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '12px',
                              border: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: teacherStatusTab === 'inactive' ? '#ffffff' : 'transparent',
                              color: teacherStatusTab === 'inactive' ? '#854d0e' : '#64748b',
                              boxShadow: teacherStatusTab === 'inactive' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Inaktiv (Bypass)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC TEACHER GRID */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                          Suchtreffer: {filteredTeachers.length} {filteredTeachers.length === 1 ? 'Lehrkraft' : 'Lehrkräfte'}
                        </span>
                        {(teacherSearchQuery || teacherStatusTab !== 'all') && (
                          <button
                            onClick={() => {
                              setTeacherSearchQuery('');
                              setTeacherStatusTab('all');
                            }}
                            style={{ border: 'none', background: 'transparent', color: '#0b57d0', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                          >
                            Filter zurücksetzen
                          </button>
                        )}
                      </div>

                      {filteredTeachers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>👥</span>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#475569' }}>Keine Lehrkräfte gefunden</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Passe deine Filterkriterien an oder lege eine neue Lehrkraft an.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                          {filteredTeachers.map((t: any) => {
                            const isCampus = t.isCampusActive || t.is_campus_active;
                            const isActive = t.isActive ?? t.is_active;
                            
                            // Visual HSL avatar color seed
                            const hash = (t.lastName || t.last_name || '').charCodeAt(0) || 65;
                            const hue = (hash * 13) % 360;
                            const avatarBg = `hsl(${hue}, 70%, 92%)`;
                            const avatarColor = `hsl(${hue}, 80%, 25%)`;

                            return (
                              <div
                                key={t.id}
                                onClick={() => setManageTeacher({
                                  id: t.id,
                                  firstName: t.firstName || t.first_name || '',
                                  lastName: t.lastName || t.last_name || '',
                                  email: t.email || '',
                                  instrument: t.instrument || '',
                                  ausweisNummer: t.ausweisNummer || t.ausweis_nummer || '',
                                  isCampusActive: t.isCampusActive ?? t.is_campus_active ?? false,
                                  isGroovelabActive: t.isGroovelabActive ?? t.is_groovelab_active ?? false,
                                  isActive: t.isActive ?? t.is_active ?? false,
                                  role: t.role || 'teacher',
                                  teacherQrToken: t.teacherQrToken || t.teacher_qr_token || '',
                                  studentCount: t.studentCount || 0,
                                  contractEndsAt: t.contractEndsAt || t.contract_ends_at || null
                                })}
                                style={{
                                  padding: '24px',
                                  borderRadius: '24px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '16px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-3px)';
                                  e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(15, 23, 42, 0.08)';
                                  e.currentTarget.style.borderColor = '#10b981';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.01)';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                              >
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                  {/* Avatar with dynamic initials */}
                                  <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '16px',
                                    background: avatarBg,
                                    color: avatarColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900,
                                    fontSize: '1.05rem',
                                    fontFamily: 'Urbanist'
                                  }}>
                                    {(t.firstName || t.first_name || 'S')?.[0]}{(t.lastName || t.last_name || 'L')?.[0]}
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {(t.firstName || t.first_name || '')} {(t.lastName || t.last_name || '')}
                                    </h4>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                                      {t.email || 'Keine E-Mail'}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  <span style={{ fontSize: '0.66rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                    🎸 {t.instrument || 'Allgemein'}
                                  </span>
                                  {isCampus && isActive ? (
                                    <span style={{ fontSize: '0.66rem', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                      🎓 Campus Aktiv
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.66rem', background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                      🔑 Bypass (Bereit)
                                    </span>
                                  )}
                                  {(t.contractEndsAt || t.contract_ends_at) && (
                                    <span style={{ fontSize: '0.66rem', background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                      📅 Bis {new Date(t.contractEndsAt || t.contract_ends_at).toLocaleDateString('de-DE')}
                                    </span>
                                  )}
                                </div>


                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* NEW MANUAL TEACHER CREATION MODAL */}
                    {showAddTeacherModal && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '24px',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          width: '500px',
                          maxHeight: '90vh',
                          overflowY: 'auto',
                          border: '1px solid #e2e8f0',
                          animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          {/* Modal Header */}
                          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>➕ Neue Lehrkraft anlegen</h3>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Erstellt ein inaktives Bypass-Profil. Bereit zur Aktivierung.</p>
                            </div>
                            <button
                              onClick={() => setShowAddTeacherModal(false)}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
                            >
                              <X size={20} />
                            </button>
                          </div>

                          {/* Modal Form */}
                          <form onSubmit={handleCreateTeacher}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherFirstName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewTeacherFirstName(val);
                                      setNewTeacherEmail(`${val.toLowerCase().trim().replace(/\s+/g, '')}.${newTeacherLastName.toLowerCase().trim().replace(/\s+/g, '')}@musaek.de`);
                                    }}
                                    placeholder="z.B. Sebastian"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherLastName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewTeacherLastName(val);
                                      setNewTeacherEmail(`${newTeacherFirstName.toLowerCase().trim().replace(/\s+/g, '')}.${val.toLowerCase().trim().replace(/\s+/g, '')}@musaek.de`);
                                    }}
                                    placeholder="z.B. Bach"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>E-Mail-Adresse *</label>
                                <input
                                  type="email"
                                  required
                                  value={newTeacherEmail}
                                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                                  placeholder="z.B. bach@musikschule.de"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Hauptinstrument / Fach</label>
                                <input
                                  type="text"
                                  value={newTeacherInstrument}
                                  onChange={(e) => setNewTeacherInstrument(e.target.value)}
                                  placeholder="z.B. Klavier, Gitarre, Violine"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>


                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Endzeit / Vertragsende (Zugriff erlischt automatisch)</label>
                                <input
                                  type="date"
                                  value={newTeacherContractEndsAt}
                                  onChange={(e) => setNewTeacherContractEndsAt(e.target.value)}
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                              <button
                                type="button"
                                onClick={() => setShowAddTeacherModal(false)}
                                className="google-btn-secondary"
                                style={{ borderRadius: '12px', fontSize: '0.82rem' }}
                              >
                                Abbrechen
                              </button>
                              <button
                                type="submit"
                                className="google-btn-primary"
                                style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 700 }}
                              >
                                Lehrkraft anlegen
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Subtab: Schülerboard (Campus-Schülerverwaltung) */}
              {campusSubTab === 'students' && renderCompactStudentBoard()}

              {/* Subtab: Schedules – Hybride Raumplanungs-Zentrale */}
              {campusSubTab === 'schedules' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>

                  {/* Action Toolbar */}
                  <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>🗓️ Raumplanungs- & Freigabe-Zentrale</h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>Weise Lehrkräfte direkt den Unterrichtstagen zu · Erkenne Konflikte · 1-Klick-Automatik</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={runAutoRoomAllocation}
                        disabled={matrixAllocations.filter(p => !p.roomId).length === 0}
                        style={{ background: 'white', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, padding: '10px 18px', borderRadius: '12px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: matrixAllocations.filter(p => !p.roomId).length === 0 ? 0.5 : 1, transition: 'all 0.2s' }}
                      >
                        ⚡ Räume automatisch zuteilen
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndApproveAll}
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', fontWeight: 800, padding: '11px 20px', borderRadius: '12px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                      >
                        💾 Zuteilung speichern & freigeben
                      </button>
                    </div>
                  </div>

                  {/* Full-width Matrix: Nicht-zugewiesen row + Rooms rows */}
                  <div style={{ overflowX: 'auto', background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    {rooms.length === 0 ? (
                      <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏫</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Keine Räume gefunden. Bitte zuerst Räume im System anlegen.</span>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '700px' }}>
                        <colgroup>
                          <col style={{ width: '130px' }} />
                          {[1,2,3,4,5].map(d => <col key={d} />)}
                        </colgroup>

                        {/* Header */}
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                            <th style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Raum</th>
                            {[1,2,3,4,5].map(d => (
                              <th key={d} style={{ padding: '10px 10px', fontSize: '0.75rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                                {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag'][d]}
                                {matrixAllocations.filter(p => !p.roomId && p.dayOfWeek === d).length > 0 && (
                                  <span style={{ marginLeft: '6px', background: '#fef3c7', color: '#b45309', fontSize: '0.6rem', fontWeight: 900, padding: '1px 6px', borderRadius: '6px' }}>
                                    {matrixAllocations.filter(p => !p.roomId && p.dayOfWeek === d).length} offen
                                  </span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {/* ── Nicht zugewiesen row ── */}
                          <tr style={{ borderBottom: '2px solid #fef3c7', background: '#fffbeb' }}>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <strong style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Kein Raum</strong>
                              <span style={{ fontSize: '0.6rem', color: '#d97706', fontWeight: 700 }}>↓ in Raum ziehen</span>
                            </td>
                            {[1,2,3,4,5].map(dayNum => {
                              const unassigned = matrixAllocations.filter(p => !p.roomId && p.dayOfWeek === dayNum);
                              return (
                                <td
                                  key={dayNum}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleDropOnMatrix(null, dayNum)}
                                  style={{ padding: '8px', verticalAlign: 'top', minHeight: '72px' }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: '64px', borderRadius: '10px', border: draggedPlanDay === dayNum ? '2px dashed #fcd34d' : '2px dashed transparent', background: draggedPlanDay === dayNum ? 'rgba(253,211,77,0.06)' : draggedPlanId ? 'rgba(0,0,0,0.02)' : 'transparent', padding: draggedPlanDay === dayNum ? '4px' : '0', opacity: draggedPlanId && draggedPlanDay !== dayNum ? 0.4 : 1, transition: 'all 0.2s' }}>
                                    {unassigned.map(plan => (
                                      <div
                                        key={plan.id}
                                        draggable
                                        onDragStart={() => handleDragStartMatrix(plan.id)}
                                        onClick={() => setSelectedDayPlan(plan)}
                                        style={{ background: 'white', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '10px', padding: '7px 9px', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 1px 4px rgba(245,158,11,0.08)', transition: 'all 0.15s' }}
                                      >
                                        <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.teacherName}</span>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#b45309' }}>{plan.instrument}</span>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: '#d97706' }}>⏱ {plan.startTime}–{plan.endTime}</span>
                                      </div>
                                    ))}
                                    {unassigned.length === 0 && (
                                      <div style={{ height: '40px' }} />
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>

                          {/* ── Room rows ── */}
                          {rooms.map((room, rIdx) => (
                            <tr key={room.id} style={{ borderBottom: rIdx < rooms.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                              <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>{room.name}</strong>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>{room.equipment?.join(' · ') || '—'}</span>
                              </td>
                              {[1,2,3,4,5].map(dayNum => {
                                const cellPlans = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === dayNum);
                                const isDragOver = !!draggedPlanId;
                                return (
                                  <td
                                    key={dayNum}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDropOnMatrix(room.id, dayNum)}
                                    style={{ padding: '8px', verticalAlign: 'top' }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: '64px', borderRadius: '10px', border: draggedPlanDay === dayNum ? '2px dashed #a7f3d0' : '2px dashed transparent', background: draggedPlanDay === dayNum ? 'rgba(16,185,129,0.04)' : 'transparent', opacity: draggedPlanId && draggedPlanDay !== dayNum ? 0.35 : 1, padding: draggedPlanDay === dayNum ? '4px' : '0', transition: 'all 0.2s', cursor: draggedPlanId && draggedPlanDay !== dayNum ? 'not-allowed' : 'default' }}>
                                      {cellPlans.map(plan => {
                                        const hasOverlap = cellPlans.some(p => p.id !== plan.id && p.startTime < plan.endTime && plan.startTime < p.endTime);
                                        return (
                                          <div
                                            key={plan.id}
                                            draggable
                                            onDragStart={() => handleDragStartMatrix(plan.id)}
                                            onClick={() => setSelectedDayPlan(plan)}
                                            style={{ background: hasOverlap ? '#fef2f2' : 'white', border: hasOverlap ? '2px dashed #ef4444' : '1px solid #e2e8f0', borderLeft: hasOverlap ? '4px solid #ef4444' : '4px solid #10b981', borderRadius: '10px', padding: '7px 9px', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'all 0.15s' }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ fontSize: '0.73rem', fontWeight: 800, color: hasOverlap ? '#991b1b' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {plan.teacherName}
                                              </span>
                                              {hasOverlap && <span style={{ fontSize: '0.6rem', flexShrink: 0 }} title="Zeitkonflikt!">⚠️</span>}
                                            </div>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>{plan.instrument}</span>
                                            <span style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: hasOverlap ? '#ef4444' : '#059669' }}>
                                              ⏱ {plan.startTime}–{plan.endTime}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {cellPlans.length === 0 && <div style={{ height: '40px' }} />}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Detail Drawer Panel */}
                  {selectedDayPlan && (
                    <div style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', background: 'white', boxShadow: '-12px 0 48px rgba(15,23,42,0.14)', borderLeft: '1px solid #e2e8f0', zIndex: 1050, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                            {['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][selectedDayPlan.dayOfWeek]} Plan
                          </span>
                          <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>{selectedDayPlan.teacherName}</h3>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>🎸 {selectedDayPlan.instrument}</span>
                        </div>
                        <button onClick={() => setSelectedDayPlan(null)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '7px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={16} />
                        </button>
                      </div>

                      {/* Room selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.67rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Unterrichtsraum zuweisen</label>
                        <select
                          value={selectedDayPlan.roomId || ''}
                          onChange={(e) => {
                            const targetRoomId = e.target.value || null;
                            setMatrixAllocations(prev => prev.map(p => {
                              if (p.id === selectedDayPlan.id) {
                                const updated = { ...p, roomId: targetRoomId };
                                setTimeout(() => setSelectedDayPlan(updated), 0);
                                return updated;
                              }
                              return p;
                            }));
                          }}
                          style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '9px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">— Kein Raum (zurücksetzen) —</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button
                          onClick={() => handleRejectTeacherDayPlan(selectedDayPlan)}
                          style={{ background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                        >
                          ↩ Zur Überarbeitung zurückweisen
                        </button>
                      </div>

                      {/* Slot list */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Stundenliste</h4>
                        {selectedDayPlan.slots.map((slot: any, idx: number) => {
                          const isBreak = !slot.student_id;
                          return (
                            <div key={idx} style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: isBreak ? '#fffbeb' : '#f8fafc', borderLeft: isBreak ? '4px solid #f59e0b' : '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f' }}>
                                  {isBreak ? '☕ Pause' : slot.student_name}
                                </span>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                                  {isBreak ? 'Pause' : `Instrument: ${selectedDayPlan.instrument}`}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: isBreak ? '#b45309' : '#0f172a' }}>{slot.time_slot}</span>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginTop: '1px' }}>{slot.duration} Min</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Subtab: Status & API */}
              {campusSubTab === 'status' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-green" />
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>Campus Modul aktivieren</h3>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>🎓 Campus System Lizenz aktivieren</span>
                      <input
                        type="checkbox"
                        checked={hasCampusSub}
                        onChange={(e) => handleToggleCampusSub(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#34a853' }}
                      />
                    </label>
                  </div>
                </div>
              )}

            </div>

            {/* Right Sidebar Pane */}
            <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
              
              {/* Briefing/Startseite Sidebar */}
              {campusSubTab === 'briefing' && (
                <div className="google-card" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#137333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📅 Campus Kalender
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem', color: '#5f6368' }}>
                    <div style={{ background: '#f6fbf7', border: '1px solid #e6f4ea', padding: '12px', borderRadius: '12px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#137333' }}>Heutiger Betrieb:</strong>
                      <span>Normaler Stundenplanbetrieb. Keine Störungen gemeldet. Sync-Frequenz auf "Täglich" eingestellt.</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <span>Datenbank-Sync:</span>
                      <strong style={{ color: '#137333' }}>Aktiv (02:00 Uhr)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>System-Status:</span>
                      <strong style={{ color: '#137333' }}>Bereit</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Onboarding Sidebar */}
              {campusSubTab === 'onboarding' && (
                <div className="google-card" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#137333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📈 Onboarding-Hilfe
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
                    <div style={{ background: '#f6fbf7', border: '1px solid #e6f4ea', padding: '12px', borderRadius: '12px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#137333' }}>Bypass-Aktivierung:</strong>
                      <p style={{ margin: 0, color: '#5f6368', lineHeight: '1.4' }}>
                        Inaktive Profile (Bypass) erlauben es dir, Lehrer vorab anzulegen. Kopiere den Aktivierungslink oder gib ihnen die 6-stellige PIN zur Freischaltung.
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#475569' }}>CSV-Vorgaben:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, color: '#5f6368', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Trennzeichen: Semikolon (;)</li>
                        <li>Spalten: Vorname; Nachname; Email; Instrument</li>
                      </ul>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '0.78rem' }}>
                      <span style={{ color: '#64748b' }}>Inaktive Lehrer:</span>
                      <strong style={{ color: '#b45309' }}>{bypassTeachers.length} Profile</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: '#64748b' }}>Aktive Lehrer:</span>
                      <strong style={{ color: '#137333' }}>{campusTeachers.length} Profile</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedules Sidebar – Live Stats */}
              {campusSubTab === 'schedules' && (
                <div className="google-card" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0b57d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Wochenauslastung
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 8px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#2563eb', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Review</span>
                        <strong style={{ fontSize: '1.4rem', color: '#1d4ed8', lineHeight: 1 }}>{pendingSchedules.length}</strong>
                      </div>
                      <div style={{ background: matrixAllocations.some(p => !p.roomId) ? '#fffbeb' : '#f0fdf4', border: `1px solid ${matrixAllocations.some(p => !p.roomId) ? '#fde68a' : '#bbf7d0'}`, padding: '12px 8px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: matrixAllocations.some(p => !p.roomId) ? '#b45309' : '#16a34a', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Offen</span>
                        <strong style={{ fontSize: '1.4rem', color: matrixAllocations.some(p => !p.roomId) ? '#b45309' : '#16a34a', lineHeight: 1 }}>{matrixAllocations.filter(p => !p.roomId).length}</strong>
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 8px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#16a34a', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Verteilt</span>
                        <strong style={{ fontSize: '1.4rem', color: '#15803d', lineHeight: 1 }}>{matrixAllocations.filter(p => p.roomId).length}</strong>
                      </div>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 8px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#ef4444', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Konflikte</span>
                        <strong style={{ fontSize: '1.4rem', color: '#ef4444', lineHeight: 1 }}>
                          {(() => {
                            let conflicts = 0;
                            const byRoomDay: Record<string, any[]> = {};
                            matrixAllocations.filter(p => p.roomId).forEach(p => {
                              const k = `${p.roomId}_${p.dayOfWeek}`;
                              if (!byRoomDay[k]) byRoomDay[k] = [];
                              byRoomDay[k].push(p);
                            });
                            Object.values(byRoomDay).forEach(group => {
                              if (group.length > 1) {
                                group.forEach((p, i) => {
                                  group.forEach((q, j) => {
                                    if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) conflicts++;
                                  });
                                });
                              }
                            });
                            return conflicts;
                          })()}
                        </strong>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#1f2937', fontSize: '0.78rem' }}>Räume verfügbar:</strong>
                      <p style={{ margin: 0, color: '#5f6368', lineHeight: '1.4', fontSize: '0.76rem' }}>
                        {rooms.length} Räume · {rooms.length * 5} mögliche Tageszuteilungen pro Woche
                      </p>
                    </div>

                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', color: '#7f1d1d' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem' }}>Hinweis:</strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: '1.4' }}>
                        Abgelehnte Stundenpläne gehen zurück in den Draft-Zustand. Lehrkräfte können erneut einreichen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status & API Sidebar */}
              {campusSubTab === 'status' && (
                <div className="google-card" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#34a853', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚡ Schnittstellen-Status
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontWeight: 650, color: '#166534' }}>Supabase Datenbank Connection</span>
                      <span style={{ color: '#137333', fontWeight: 900 }}>OK ✓</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontWeight: 650, color: '#166534' }}>Campus Sync Engine (Cron)</span>
                      <span style={{ color: '#137333', fontWeight: 900 }}>OK ✓</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontWeight: 650, color: '#166534' }}>GrooveLab Kiosk Sync API</span>
                      <span style={{ color: '#137333', fontWeight: 900 }}>OK ✓</span>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', marginTop: '4px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#475569' }}>Sicherheits-Tipp:</strong>
                      <p style={{ margin: 0, color: '#5f6368', lineHeight: '1.4', fontSize: '0.78rem' }}>
                        Regeneriere den Campus-Token bei personellen Änderungen im Kollegium, um unbefugten Zugriff auf Stundenpläne zu verhindern.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 3: GROOVELAB */}
        {activeTab === 'groovelab' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Subtab: Startseite (Briefing) */}
            {groovelabSubTab === 'briefing' && (
              <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                {/* Left Column: GrooveLab Startseite */}
                <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <div className="google-kpi-bar" style={{ background: '#fbbc05' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 850, color: '#b45309' }}>
                      🎸 GrooveLab-Zentrale
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5' }}>
                      Willkommen in der GrooveLab-Verwaltung. Hier überwachst du das Live Lab datenschutzkonform, verwaltest Coaches, prüfst Support-Tickets und konfigurierst System-Einstellungen.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>Schüler im Live Lab</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#1e293b', marginTop: '4px' }}>
                          {activeSessions.filter(s => s.users?.role === 'student').length}
                        </strong>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>Hardware Online-Quote</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#1e293b', marginTop: '4px' }}>
                          {stations.length ? Math.round((new Set(activeSessions.map(s => s.station_id)).size / stations.length) * 100) : 0}%
                        </strong>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>Tages-Scans (Simuliert)</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#1e293b', marginTop: '4px' }}>
                          {activeSessions.length * 3 + 12} Scans
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* GrooveLab Announcements */}
                  <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>📌 Daily Briefing &amp; Live-Status</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '1.25rem' }}>🟢</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>Eingecheckte Schüler:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {activeSessions.filter(s => s.users?.role === 'student').length > 0 
                              ? `Gerade sind ${activeSessions.filter(s => s.users?.role === 'student').length} Schüler aktiv an den iPads eingeloggt.`
                              : 'Momentan sind keine Schüler im Live Lab angemeldet.'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '1.25rem' }}>🔌</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>Kiosk-Modus:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Der Kiosk-Token für automatische iPad-Check-ins ist {kioskToken ? 'aktiv' : 'nicht konfiguriert'}.
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '1.25rem' }}>🔥 Holiday-Boost:</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>Ferien-XP:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Der Ferien Bonus XP Multiplikator ist {holidayXpActive ? 'aktiviert' : 'deaktiviert'}.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: GrooveLab Sidebar */}
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
                  <div className="google-card" style={{ padding: '20px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚡ GrooveLab-Betrieb
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem', color: '#64748b' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px', color: '#b45309' }}>Betriebszustand:</strong>
                        <span>{isPaused ? '⏸️ Der Schulbetrieb ist aktuell pausiert.' : '✅ Normaler GrooveLab Live-Betrieb.'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <span>Abo-Status:</span>
                        <strong style={{ color: '#b45309' }}>{hasGroovelabSub ? 'Aktiviert' : 'Inaktiv'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>iPads / Stationen:</span>
                        <strong style={{ color: '#b45309' }}>{stations.length}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Live Lab Blueprint Board (1:1 replicated from TeacherDashboard) */}
            {groovelabSubTab === 'live' && (() => {
              const activeRoom = rooms.find(r => r.id === selectedRoomId);
              const roomStations = stations.filter(s => s.room_id === selectedRoomId);
              const hasCustomLayout = activeRoom && 
                activeRoom.room_width && 
                activeRoom.room_height && 
                roomStations.some(s => s.pos_x !== null && s.pos_y !== null);

              const activeCoachesForLayout = activeSessions
                .filter(s => s.users?.role === 'teacher' || s.users?.role === 'admin')
                .map(s => ({
                  id: s.user_id,
                  users: s.users,
                  session: s
                }));

              const renderLiveHeader = () => (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📺 Live Lab Board
                    </h3>
                    {rooms.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px' }}>
                        {rooms.map((room, idx) => {
                          const isSelected = room.id === selectedRoomId;
                          return (
                            <button
                              key={room.id}
                              onClick={() => {
                                setSelectedRoomId(room.id);
                                localStorage.setItem('groovelab_teacher_selected_room_id', room.id);
                              }}
                              style={{
                                border: 'none',
                                background: isSelected ? 'white' : 'transparent',
                                color: isSelected ? '#1e293b' : '#64748b',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                              }}
                              className="hover-scale-mini"
                            >
                              {(() => {
                                const cleanName = cleanRoomName(room.name);
                                return idx === 0
                                  ? (cleanName.toLowerCase() === 'hauptraum' ? '👑 Hauptraum' : `👑 Hauptraum - ${cleanName}`)
                                  : cleanName;
                              })()}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Magnifier Zoom Panel */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f1f5f9',
                      padding: '5px',
                      borderRadius: '14px'
                    }}>
                      <button 
                        onClick={() => handleZoomChange(Math.max(0.4, zoomFactor - 0.1))}
                        style={{
                          background: 'white',
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          borderRadius: '10px',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s'
                        }}
                        className="hover-scale-mini"
                        title="Verkleinern"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', padding: '0 6px', minWidth: '40px', textAlign: 'center' }}>
                        {Math.round(zoomFactor * 100)}%
                      </span>
                      <button 
                        onClick={() => handleZoomChange(Math.min(2.5, zoomFactor + 0.1))}
                        style={{
                          background: 'white',
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          borderRadius: '10px',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s'
                        }}
                        className="hover-scale-mini"
                        title="Vergrößern"
                      >
                        <ZoomIn size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );

              if (hasCustomLayout) {
                // Account for parent workspace header offset
                const maxH = Math.max(300, windowHeight - 280);

                let unifiedScale = 1.0;
                const customLayoutScales = rooms.map(r => {
                  const rStations = stations.filter(s => s.room_id === r.id);
                  const rHasLayout = r.room_width && r.room_height && rStations.some(s => s.pos_x !== null && s.pos_y !== null);
                  if (!rHasLayout) return null;

                  const aspect = r.room_width / r.room_height;
                  const { minX, maxX, minY, maxY } = getCompressedRoomCoordinates(rStations, aspect);

                  const bW = Math.max(100, maxX - minX);
                  const bH = Math.max(100, maxY - minY);
                  return Math.min(containerWidth / bW, maxH / bH);
                }).filter((s): s is number => s !== null);

                if (customLayoutScales.length > 0) {
                  unifiedScale = Math.min(1.0, ...customLayoutScales);
                }

                const rawRoomAspectRatio = (activeRoom && activeRoom.room_width && activeRoom.room_height)
                  ? activeRoom.room_width / activeRoom.room_height
                  : 1.0;

                const compressedActiveLayout = getCompressedRoomCoordinates(roomStations, rawRoomAspectRatio);
                const minBoundX = compressedActiveLayout.minX;
                const maxBoundX = compressedActiveLayout.maxX;
                const minBoundY = compressedActiveLayout.minY;
                const maxBoundY = compressedActiveLayout.maxY;

                const boundWidth = Math.max(100, maxBoundX - minBoundX);
                const boundHeight = Math.max(100, maxBoundY - minBoundY);

                const scale = unifiedScale * zoomFactor;

                return (
                  <div 
                    ref={containerRef}
                    className="google-card"
                    style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b', display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}
                  >
                    {renderLiveHeader()}

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px', justifyContent: 'center', width: '100%', position: 'relative' }}>
                      <div 
                        className="blueprint-viewport"
                        style={{ 
                          flex: 1, 
                          minWidth: 0,
                          maxWidth: '100%', 
                          height: `${maxH}px`, 
                          overflow: 'auto', 
                          background: 'transparent', 
                          border: '1.5px dashed rgba(99, 102, 241, 0.15)', 
                          borderRadius: '24px', 
                          display: 'block', 
                          boxSizing: 'border-box', 
                          padding: '16px' 
                        }}
                      >
                        <div 
                          style={{ 
                            width: `${boundWidth * scale}px`,
                            height: `${boundHeight * scale}px`,
                            position: 'relative', 
                            overflow: 'hidden',
                            margin: '0 auto'
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: `${boundWidth}px`,
                            height: `${boundHeight}px`,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0px',
                            boxShadow: 'none',
                            overflow: 'visible'
                          }}>
                            {compressedActiveLayout.stations.map(station => {
                              const sName = station.rawStation.name || '';
                              const isTeacherNode = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
                              const instColor = station.rawStation.color && station.rawStation.color !== '#e5e7eb' && station.rawStation.color !== '#e2e8f0'
                                ? station.rawStation.color
                                : getStationColor(sName);

                              const alignedX = station.cx - minBoundX;
                              const alignedY = station.cy - minBoundY;

                              if (isTeacherNode) {
                                return (
                                  <div 
                                    key={station.id} 
                                    style={{
                                      position: 'absolute',
                                      left: `${alignedX}px`,
                                      top: `${alignedY}px`,
                                      transform: 'translate(-50%, -50%)',
                                      zIndex: 100
                                    }}
                                  >
                                    <CoachesNode coaches={activeCoachesForLayout} onProfileSelect={setSelectedCoachProfile} />
                                  </div>
                                );
                              }

                              const sess = activeSessions.find(se => se.station_id === station.id);
                              const num = parseInt(sName.match(/\d+/)?.[0] || '1');

                              return (
                                <div 
                                  key={station.id} 
                                  style={{
                                    position: 'absolute',
                                    left: `${alignedX}px`,
                                    top: `${alignedY}px`,
                                    transform: 'translate(-50%, -50%)',
                                    width: '180px',
                                    zIndex: 10
                                  }}
                                >
                                  <StationNode
                                    num={num}
                                    customName={station.rawStation.name}
                                    color={instColor}
                                    inst={station.rawStation.instrument || 'Tablet'}
                                    sess={sess}
                                    isMe={sess?.user_id === userId}
                                    viewMode="admin"
                                    onProfileSelect={setSelectedStudentForDetail}
                                    onLogout={handleLogoutStudent}
                                    hasHelpRequest={helpRequests.some(r => r.station_id === station.id)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Fallback Grid Layout
              return (
                <div 
                  ref={containerRef}
                  className="google-card"
                  style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}
                >
                  {renderLiveHeader()}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px', background: '#ffffff', padding: '24px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <CoachesNode coaches={activeCoachesForLayout} onProfileSelect={setSelectedCoachProfile} />
                    </div>
                    {roomStations.filter(s => {
                      const sName = s.name || '';
                      return !(sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher'));
                    }).map(station => {
                      const sess = activeSessions.find(se => se.station_id === station.id);
                      const sName = station.name || '';
                      const num = parseInt(sName.match(/\d+/)?.[0] || '1');
                      const instColor = station.color && station.color !== '#e5e7eb' && station.color !== '#e2e8f0'
                        ? station.color
                        : getStationColor(sName);

                      return (
                        <div key={station.id}>
                          <StationNode
                            num={num}
                            customName={station.name}
                            color={instColor}
                            inst={station.instrument || 'Tablet'}
                            sess={sess}
                            isMe={sess?.user_id === userId}
                            viewMode="admin"
                            onProfileSelect={setSelectedStudentForDetail}
                            onLogout={handleLogoutStudent}
                            hasHelpRequest={helpRequests.some(r => r.station_id === station.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Subtab: Students (Schüler) */}
            {groovelabSubTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>👥 Registrierte Schüler (GrooveLab)</h3>
                  
                  {/* Search bar */}
                  <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                    <input 
                      type="text" 
                      placeholder="Schüler nach Name oder Spitzname suchen..." 
                      value={liveSearchQuery}
                      onChange={(e) => setLiveSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 48px',
                        borderRadius: '14px',
                        border: '1.5px solid #dadce0',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 650,
                        boxSizing: 'border-box',
                        background: '#f8fafc',
                        color: '#1e293b'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {students
                      .filter(s => {
                        const q = liveSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                        const nick = (s.nickname || '').toLowerCase();
                        return name.includes(q) || nick.includes(q);
                      })
                      .map(student => {
                        const isOnline = activeSessions.some(sess => sess.user_id === student.id);
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => setSelectedStudentForDetail(student)}
                            style={{ 
                              padding: '20px', 
                              borderRadius: '20px', 
                              border: '1.5px solid #dadce0', 
                              background: '#f8fafc', 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              position: 'relative',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ position: 'relative' }}>
                              <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#64748b' }}>
                                {student.photo_url ? (
                                  <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                ) : (
                                  student.first_name?.[0] || 'S'
                                )}
                              </div>
                              <div style={{ 
                                position: 'absolute', 
                                bottom: -3, 
                                right: -3, 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                background: isOnline ? '#22c55e' : '#cbd5e1', 
                                border: '2px solid #e2e8f0' 
                              }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#1e293b', fontWeight: 800 }}>
                                {student.first_name} {student.last_name}
                              </strong>
                              {student.nickname && (
                                <span style={{ display: 'block', fontSize: '0.78rem', color: '#b45309', fontWeight: 700, marginTop: '2px' }}>
                                  "{student.nickname}"
                                </span>
                              )}
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                                🎸 {student.instrument || 'Kein Hauptinstrument'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <span style={{ 
                                fontSize: '0.68rem', 
                                fontWeight: 800, 
                                padding: '3px 8px', 
                                borderRadius: '8px', 
                                background: isOnline ? '#e6f4ea' : '#18181b',
                                color: isOnline ? '#137333' : '#a1a1aa'
                              }}>
                                {isOnline ? 'Im Lab' : 'Offline'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Coaches (Lehrer) */}
            {groovelabSubTab === 'coaches' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Create Coach Form */}
                  <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>🎸 GrooveLab Coach anlegen</h3>
                    <form onSubmit={handleCreateCoach} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <input type="text" required placeholder="Vorname *" value={coachFirstName} onChange={(e) => setCoachFirstName(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }} />
                      <input type="text" required placeholder="Nachname *" value={coachLastName} onChange={(e) => setCoachLastName(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }} />
                      <input type="email" required placeholder="E-Mail *" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }} />
                      <input type="text" placeholder="Instrument" value={coachInstrument} onChange={(e) => setCoachInstrument(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }} />
                      <select value={coachRole} onChange={(e) => setCoachRole(e.target.value as any)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '0.85rem' }}>
                        <option value="teacher">Coach</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <button type="submit" className="google-btn-primary" style={{ background: '#eab308', color: '#ffffff' }}>Coach Hinzufügen</button>
                    </form>
                  </div>

                  {/* Admin Override Settings */}
                  <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>⚙️ Admin-Overrides (Rechte &amp; Passwort)</h3>
                    <form onSubmit={handleAdminOverride} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <select 
                        required
                        value={selectedTeacherForOverride?.id || ''}
                        onChange={(e) => {
                          const selected = coaches.find(c => c.id === e.target.value) || campusTeachers.find(c => c.id === e.target.value);
                          setSelectedTeacherForOverride(selected || null);
                        }}
                        style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Lehrkraft auswählen --</option>
                        {coaches.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} (Coach)</option>)}
                        {campusTeachers.filter(t => !coaches.some(c => c.id === t.id)).map(t => (
                          <option key={t.id} value={t.id}>{t.firstName} {t.lastName} (Campus Lehrkraft)</option>
                        ))}
                      </select>

                      <input 
                        type="password" 
                        placeholder="Neuen persönlichen PIN vergeben (Zahl)" 
                        value={newPasswordOverride} 
                        onChange={(e) => setNewPasswordOverride(e.target.value)} 
                        style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: '0.85rem' }} 
                      />

                      <select 
                        value={newRoleOverride} 
                        onChange={(e) => setNewRoleOverride(e.target.value)} 
                        style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Neue Rolle zuweisen (Optional) --</option>
                        <option value="teacher">Lehrkraft / Coach</option>
                        <option value="admin">Administrator / Verwaltung</option>
                      </select>

                      <button type="submit" className="google-btn-primary" style={{ background: '#eab308', color: '#ffffff' }}>Überschreiben speichern</button>
                    </form>
                  </div>
                </div>

                {/* Bulk Import Section */}
                <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>📄 Bulk-Import via TXT</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Fügen Sie eine Liste von Lehrern ein. Format pro Zeile: <code>Vorname Nachname, Email, Instrument, Rolle (teacher/admin)</code>
                  </p>
                  <form onSubmit={handleBulkTeacherImport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <textarea 
                      placeholder="Max Mustermann, max@schule.de, Gitarre, teacher&#10;Sabine Admin, sabine@schule.de, Klavier, admin" 
                      rows={5}
                      value={bulkTxtInput}
                      onChange={(e) => setBulkTxtInput(e.target.value)}
                      style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <button type="submit" className="google-btn-primary" style={{ background: '#fbbc05', color: '#09090b', fontWeight: 900, alignSelf: 'flex-start' }}>Dozenten importieren</button>
                  </form>
                </div>

                <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>👥 Aktive Trainer &amp; Coaches (GrooveLab)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                    {coaches.map(c => (
                      <div key={c.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'block' }}>{c.firstName} {c.lastName}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>🎸 {c.instrument || 'Allgemein'} &bull; {c.role}</span>
                        </div>
                        <button onClick={() => handleDeleteUser(c.id)} style={{ border: 'none', background: 'transparent', color: '#ea4335', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Support & Inventar (Tickets Inbox) */}
            {groovelabSubTab === 'status' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
                  {/* Warning Cards Inbox */}
                  <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>🚨 Offene Support-Tickets &amp; Defekt-Meldungen</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {tickets.filter(t => t.status === 'OPEN').map(ticket => (
                        <div 
                          key={ticket.ticket_id} 
                          style={{ 
                            padding: '16px', 
                            borderRadius: '16px', 
                            background: '#f8fafc', 
                            borderLeft: '4px solid #ea4335', 
                            border: '1px solid #e2e8f0',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}
                        >
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b' }}>Station #{ticket.station_number} - {ticket.component_type}</strong>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{ticket.description || 'Keine Fehlerbeschreibung hinterlegt.'}</span>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                              Gemeldet am: {new Date(ticket.created_at).toLocaleString('de-DE')}
                            </span>
                          </div>
                          
                          <button 
                            onClick={() => handleResolveTicket(ticket.ticket_id)}
                            style={{ 
                              background: '#34a853', 
                              color: 'white', 
                              border: 'none', 
                              padding: '8px 16px', 
                              borderRadius: '10px', 
                              fontSize: '0.8rem', 
                              fontWeight: 900,
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)'
                            }}
                          >
                            ✓ Schaden behoben
                          </button>
                        </div>
                      ))}

                      {tickets.filter(t => t.status === 'OPEN').length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                          🎉 Keine offenen Support-Tickets vorhanden. Alle Stationen laufen einwandfrei!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ticket Reporting Form */}
                  <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>➕ Hardware-Defekt melden</h3>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const stationNumber = formData.get('stationNumber');
                        const componentType = formData.get('componentType');
                        const description = formData.get('description');
                        
                        try {
                          const response = await fetch('/api/groovelab/tickets/report', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              schoolId,
                              stationNumber: Number(stationNumber),
                              componentType,
                              description
                            })
                          });
                          const data = await response.json();
                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to report ticket');
                          }
                          alert('Schadensmeldung erfolgreich übermittelt.');
                          e.currentTarget.reset();
                          fetchDashboardData();
                        } catch (err: any) {
                          alert('Fehler beim Melden: ' + err.message);
                        }
                      }} 
                      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                    >
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Stations-Nummer</label>
                        <input type="number" required name="stationNumber" min="1" max="100" style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Defekte Komponente</label>
                        <select required name="componentType" style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
                          <option value="HEADPHONES">Kopfhörer</option>
                          <option value="CABLES">Kabel / Adapter</option>
                          <option value="IPADS">iPad / Tablet</option>
                          <option value="OTHERS">Sonstiges</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Fehlerbeschreibung</label>
                        <textarea required name="description" placeholder="Bitte beschreiben Sie den Defekt möglichst präzise..." rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }} />
                      </div>

                      <button type="submit" className="google-btn-primary" style={{ background: '#eab308', color: '#ffffff' }}>Schaden melden</button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Setup & Kiosk */}
            {groovelabSubTab === 'kiosk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>🔌 Tablets &amp; Kiosk-Integration</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <button onClick={handleRegenerateTokens} className="google-btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.78rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                      Kiosk Token regenerieren
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '0.88rem', display: 'block', color: '#1e293b' }}>Chaträume freischalten</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ermöglicht Coaches den direkten Austausch mit Schülern.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowMessagesGlobal}
                        onChange={(e) => handleToggleMessagesGlobal(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#fbbc05' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>☀️ Ferien &amp; Feiertage</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', display: 'block', color: '#1e293b' }}>Ferien Bonus XP Multiplikator</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Aktiviert extra XP für Fleiß während der Schulferien.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={holidayXpActive}
                      onChange={(e) => handleToggleHolidayXp(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#fbbc05' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1.7: SECRETARY - LICENSES */}
        {activeTab === 'secretary' && secretarySubTab === 'licenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-red" />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800 }}>🎫 Aktive Module &amp; Abrechnung</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b' }}>
                Verwalte deine lizenzierten Module und buche zusätzliche Benutzerkontingente.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Module overview */}
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Lizensierte Module</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e6f4ea' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>🎓 Campus System</span>
                      <span style={{ fontSize: '0.72rem', background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                        {hasCampusSub ? 'AKTIV' : 'INAKTIV'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e6f4ea' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>🎸 GrooveLab App</span>
                      <span style={{ fontSize: '0.72rem', background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                        {hasGroovelabSub ? 'AKTIV' : 'INAKTIV'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Quota Calculator */}
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Zusätzliches Benutzerkontingent</span>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Kontingent-Limit (Aktiv):</span>
                      <strong style={{ fontSize: '0.9rem', color: '#0b57d0' }}>{activeUserQuota} Lizenzen</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Gewünscht (Regler):</span>
                      <strong style={{ fontSize: '0.9rem', color: '#e11d48' }}>{userQuota} Lizenzen</strong>
                    </div>
                    
                    <input 
                      type="range" 
                      min="50" 
                      max="500" 
                      step="10" 
                      value={userQuota} 
                      onChange={(e) => setUserQuota(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#ea4335', cursor: 'pointer' }}
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                      <span>50 (Standard)</span>
                      <span>500 (Maximum)</span>
                    </div>

                    {pendingUserQuota !== null ? (
                      <div style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', color: '#6b21a8', marginTop: '10px', fontWeight: 700 }}>
                        ⏳ Vormerkung für nächsten Monat: {pendingUserQuota} Lizenzen (kann bis zum 31. geändert werden)
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', color: '#64748b', marginTop: '10px', fontWeight: 650 }}>
                        ℹ️ Keine ausstehenden Quoten-Änderungen für den nächsten Monat.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Calculation Card */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#991b1b' }}>Monatliche Gesamtkosten (Kalkulation)</strong>
                  <span style={{ fontSize: '0.78rem', color: '#7f1d1d' }}>
                    Basisgebühr: 49,00 € (inkl. 50 User) + {(userQuota - 50)} zusätzliche User ({((userQuota - 50) * 1.20).toFixed(2)} €)
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.4rem', color: '#b91c1c', display: 'block' }}>
                    {(49.00 + (userQuota - 50) * 1.20).toFixed(2)} € <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>/ Mo.</span>
                  </strong>
                  <button 
                    onClick={handleSaveQuota} 
                    className="google-btn-primary" 
                    style={{ background: '#ea4335', padding: '6px 14px', fontSize: '0.72rem', marginTop: '8px' }}
                  >
                    Kontingent speichern
                  </button>
                </div>
              </div>

              {/* Invoice list */}
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: 800, fontFamily: 'Urbanist' }}>Letzte Monatsabrechnungen</h4>
                <div style={{ border: '1px solid #f1f5f9', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
                  {[
                    { id: 'INV-2026-05', date: '15. Mai 2026', amount: '169,00 €', status: 'Bezahlt' },
                    { id: 'INV-2026-04', date: '15. April 2026', amount: '169,00 €', status: 'Bezahlt' },
                    { id: 'INV-2026-03', date: '15. März 2026', amount: '145,00 €', status: 'Bezahlt' }
                  ].map((inv) => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', fontSize: '0.82rem', fontFamily: 'Inter' }}>
                      <div>
                        <strong style={{ display: 'block', color: '#0f172a', fontWeight: 650, fontSize: '0.88rem' }}>Rechnung {inv.id}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Abrechnungsdatum: {inv.date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{inv.amount}</strong>
                        <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: '100px', fontWeight: 800 }}>{inv.status}</span>
                        <button 
                          onClick={() => alert('Rechnung heruntergeladen!')} 
                          className="hover-scale font-bold"
                          style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '10px', padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SECRETARY - RÄUME */}
        {activeTab === 'secretary' && secretarySubTab === 'rooms' && (() => {
          // Compute per-room utilization from approved/pending allocations
          const getOccupiedDays = (roomId: string) =>
            [1,2,3,4,5].filter(d => matrixAllocations.some(p => p.roomId === roomId && p.dayOfWeek === d));
          const INSTRUMENT_COLOR: Record<string, string> = {
            Schlagzeug: '#ef4444', Piano: '#3b82f6', Gitarre: '#10b981',
            Gesang: '#8b5cf6', Geige: '#f59e0b', Querflöte: '#06b6d4',
            Saxophon: '#f97316', Bass: '#64748b', Keyboard: '#ec4899', Trompete: '#eab308',
          };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>

              {/* Header + Sub-nav */}
              <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DoorOpen size={20} color="#0b57d0" /> Raumverwaltung
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>{rooms.length} Räume · Ausstattung & Belegung im Blick</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['overview', 'plan', 'settings'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => { setRoomsSubView(v); if (v !== 'settings') setEditingRoom(null); }}
                      style={{ padding: '8px 16px', borderRadius: '10px', border: '1.5px solid', borderColor: roomsSubView === v ? '#0b57d0' : '#e2e8f0', background: roomsSubView === v ? '#eff6ff' : 'white', color: roomsSubView === v ? '#0b57d0' : '#475569', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {v === 'overview' ? '🏫 Übersicht' : v === 'plan' ? '📅 Belegungsplan' : '⚙️ Raum anlegen / bearbeiten'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── VIEW 1: Übersicht ── */}
              {roomsSubView === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {rooms.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: '20px', padding: '48px 24px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                      <DoorOpen size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Noch keine Räume angelegt.</p>
                      <button onClick={() => openRoomEditor()} style={{ marginTop: '16px', background: '#0b57d0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                        + Ersten Raum anlegen
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {rooms.map(room => {
                        const occupied = getOccupiedDays(room.id);
                        const pct = Math.round((occupied.length / 5) * 100);
                        const status = pct === 0 ? { label: 'Frei', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
                          : pct < 80 ? { label: 'Teilbelegt', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
                          : { label: 'Voll', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
                        const equipment: string[] = Array.isArray(room.equipment) ? room.equipment : [];
                        return (
                          <div key={room.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Room header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{room.name}</h4>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>
                                  <span>👤 Max. {room.max_teachers || 1} Lehrkraft</span>
                                  <span>👥 Max. {room.max_students || 1} Schüler</span>
                                  <span>📏 {room.qm || 0} qm</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '3px 9px', borderRadius: '8px', background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                                {status.label}
                              </span>
                            </div>
                            {/* Equipment tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {equipment.length > 0 ? equipment.map(tag => (
                                <span key={tag} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: `${INSTRUMENT_COLOR[tag] || '#94a3b8'}15`, color: INSTRUMENT_COLOR[tag] || '#64748b', border: `1px solid ${INSTRUMENT_COLOR[tag] || '#94a3b8'}30` }}>
                                  {tag}
                                </span>
                              )) : (
                                <span style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 600 }}>Keine Ausstattung hinterlegt</span>
                              )}
                            </div>
                            {/* Weekly utilization bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}>
                                <span>Wochenauslastung</span>
                                <span style={{ color: status.color }}>{occupied.length}/5 Tage</span>
                              </div>
                              <div style={{ display: 'flex', gap: '3px' }}>
                                {[1,2,3,4,5].map(d => (
                                  <div key={d} style={{ flex: 1, height: '6px', borderRadius: '3px', background: occupied.includes(d) ? status.color : '#e2e8f0', transition: 'background 0.2s' }} title={['','Mo','Di','Mi','Do','Fr'][d]} />
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                                {[1,2,3,4,5].map(d => (
                                  <div key={d} style={{ flex: 1, fontSize: '0.5rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                    {['','Mo','Di','Mi','Do','Fr'][d]}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Assigned teachers for this room */}
                            {matrixAllocations.filter(p => p.roomId === room.id).length > 0 && (
                              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {matrixAllocations.filter(p => p.roomId === room.id).map(plan => (
                                  <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', background: '#f8fafc', borderRadius: '7px', padding: '5px 8px' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{plan.teacherName}</span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ color: '#94a3b8', fontWeight: 700 }}>{['','Mo','Di','Mi','Do','Fr'][plan.dayOfWeek]}</span>
                                      <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#059669', fontSize: '0.65rem' }}>{plan.startTime}–{plan.endTime}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                              <button onClick={() => { setRoomsSubView('plan'); }} style={{ flex: 1, padding: '7px', borderRadius: '9px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                                📅 Belegung
                              </button>
                              <button onClick={() => openRoomEditor(room)} style={{ flex: 1, padding: '7px', borderRadius: '9px', border: '1px solid #e2e8f0', background: 'white', color: '#0b57d0', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                                ✏️ Bearbeiten
                              </button>
                              <button onClick={() => handleDeleteRoom(room.id)} style={{ padding: '7px 10px', borderRadius: '9px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Add room card */}
                      <button onClick={() => openRoomEditor()} style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: '#94a3b8', minHeight: '180px', transition: 'all 0.2s' }}>
                        <Plus size={24} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>Raum hinzufügen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── VIEW 2: Belegungsplan (read-only matrix) ── */}
              {roomsSubView === 'plan' && (
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', overflowX: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>📅 Wöchentlicher Belegungsplan</h4>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Lese-Ansicht · Zum Bearbeiten → Campus › Stundenpläne</p>
                    </div>
                    <button
                      onClick={() => { /* switch to campus schedules */ }}
                      style={{ background: '#eff6ff', color: '#0b57d0', border: '1px solid #bfdbfe', padding: '8px 14px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      🗓️ Im Stundenplan bearbeiten
                    </button>
                  </div>
                  {rooms.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px', fontWeight: 700 }}>Noch keine Räume vorhanden.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '600px' }}>
                      <colgroup>
                        <col style={{ width: '130px' }} />
                        {[1,2,3,4,5].map(d => <col key={d} />)}
                      </colgroup>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          <th style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Raum</th>
                          {[1,2,3,4,5].map(d => (
                            <th key={d} style={{ padding: '10px 10px', fontSize: '0.73rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', textAlign: 'left' }}>
                              {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag'][d]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map((room, rIdx) => {
                          const equipment: string[] = Array.isArray(room.equipment) ? room.equipment : [];
                          return (
                            <tr key={room.id} style={{ borderBottom: rIdx < rooms.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                              <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>{room.name}</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                                  {equipment.map(tag => (
                                    <span key={tag} style={{ fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '5px', background: `${INSTRUMENT_COLOR[tag] || '#94a3b8'}18`, color: INSTRUMENT_COLOR[tag] || '#64748b' }}>{tag}</span>
                                  ))}
                                </div>
                              </td>
                              {[1,2,3,4,5].map(dayNum => {
                                const cellPlans = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === dayNum);
                                return (
                                  <td key={dayNum} style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: '56px' }}>
                                      {cellPlans.map(plan => {
                                        const color = INSTRUMENT_COLOR[plan.instrument] || '#64748b';
                                        return (
                                          <div
                                            key={plan.id}
                                            onClick={() => setSelectedDayPlan(plan)}
                                            style={{ background: `${color}10`, border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, borderRadius: '9px', padding: '7px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'all 0.15s' }}
                                          >
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>{plan.teacherName}</span>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color }}>{plan.instrument}</span>
                                            <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, color: '#475569' }}>⏱ {plan.startTime}–{plan.endTime}</span>
                                          </div>
                                        );
                                      })}
                                      {cellPlans.length === 0 && (
                                        <div style={{ height: '44px', borderRadius: '8px', background: '#f8fafc', border: '1px dashed #e2e8f0' }} />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {/* Drawer for clicked plan details — reuse same selectedDayPlan drawer rendered below */}
                </div>
              )}

              {/* ── VIEW 3: Einstellungen / Editor ── */}
              {roomsSubView === 'settings' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
                  {/* Form */}
                  <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '28px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Edit3 size={16} color="#0b57d0" /> {editingRoom ? `„${editingRoom.name}" bearbeiten` : 'Neuen Raum anlegen'}
                    </h4>

                    {/* Name */}
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Raumname *</label>
                      <input
                        value={roomFormName}
                        onChange={e => setRoomFormName(e.target.value)}
                        placeholder='z.B. „Raum 1 – Schlagzeug" oder „Studio Nord"'
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                      />
                    </div>

                    {/* Max students & QM */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Max. Anzahl Schüler</label>
                        <input
                          type="number"
                          value={roomFormMaxStudents}
                          onChange={e => setRoomFormMaxStudents(parseInt(e.target.value) || 1)}
                          min="1"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Größe in qm</label>
                        <input
                          type="number"
                          value={roomFormQm}
                          onChange={e => setRoomFormQm(parseFloat(e.target.value) || 0)}
                          min="0"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                        />
                      </div>
                    </div>

                    {/* Max teachers */}
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Max. Lehrkräfte gleichzeitig</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[1,2,3].map(n => (
                          <button key={n} onClick={() => setRoomFormMaxTeachers(n)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid', borderColor: roomFormMaxTeachers === n ? '#0b57d0' : '#e2e8f0', background: roomFormMaxTeachers === n ? '#eff6ff' : 'white', color: roomFormMaxTeachers === n ? '#0b57d0' : '#475569', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Instrument tags */}
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Ausstattung / Instrumente</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                        {(() => {
                          const availableEquipment = schoolEquipment.length > 0 ? schoolEquipment.map(e => e.name) : INSTRUMENT_TAGS;
                          return availableEquipment.map(tag => {
                            const active = roomFormEquipment.includes(tag);
                            const color = INSTRUMENT_COLOR[tag] || '#64748b';
                            return (
                              <button
                                key={tag}
                                onClick={() => setRoomFormEquipment(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                                style={{ padding: '6px 13px', borderRadius: '20px', border: `1.5px solid ${active ? color : '#e2e8f0'}`, background: active ? `${color}15` : 'white', color: active ? color : '#64748b', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }}
                              >
                                {tag}
                              </button>
                            );
                          });
                        })()}
                      </div>
                      {roomFormEquipment.length > 0 && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                          ✓ {roomFormEquipment.join(' · ')} ausgewählt — der CSP-Solver kann Lehrkräfte instrument-konform zuweisen.
                        </p>
                      )}
                    </div>

                    {/* Save / Cancel */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        onClick={handleSaveRoom}
                        disabled={roomSaving || !roomFormName.trim()}
                        style={{ flex: 1, background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', opacity: roomSaving || !roomFormName.trim() ? 0.6 : 1, transition: 'all 0.2s' }}
                      >
                        {roomSaving ? 'Speichert…' : editingRoom ? '💾 Änderungen speichern' : '+ Raum anlegen'}
                      </button>
                      <button onClick={() => { setRoomsSubView('overview'); setEditingRoom(null); }} style={{ padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                        Abbrechen
                      </button>
                    </div>
                  </div>

                  {/* Existing rooms list (quick edit) */}
                  <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h5 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Alle Räume ({rooms.length})</h5>
                      <button onClick={() => openRoomEditor()} style={{ background: '#0b57d0', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}>
                        + Neu
                      </button>
                    </div>
                    {rooms.map(room => {
                      const occupied = getOccupiedDays(room.id);
                      return (
                        <div key={room.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', border: editingRoom?.id === room.id ? '1.5px solid #0b57d0' : '1px solid #f1f5f9', background: editingRoom?.id === room.id ? '#eff6ff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => openRoomEditor(room)}>
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{room.name}</span>
                            <span style={{ display: 'block', fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>{occupied.length}/5 Tage belegt</span>
                          </div>
                          <Edit3 size={13} color="#94a3b8" />
                        </div>
                      );
                    })}
                    {rooms.length === 0 && <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, padding: '16px 0' }}>Noch keine Räume</p>}
                  </div>
                </div>
              )}

              {/* Re-use the same selectedDayPlan detail drawer */}
              {selectedDayPlan && roomsSubView === 'plan' && (
                <div style={{ position: 'fixed', top: 0, right: 0, width: '380px', height: '100vh', background: 'white', boxShadow: '-12px 0 48px rgba(15,23,42,0.14)', borderLeft: '1px solid #e2e8f0', zIndex: 1050, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                        {['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][selectedDayPlan.dayOfWeek]} · Lese-Ansicht
                      </span>
                      <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>{selectedDayPlan.teacherName}</h3>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>🎸 {selectedDayPlan.instrument}</span>
                    </div>
                    <button onClick={() => setSelectedDayPlan(null)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '7px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Stundenliste</h4>
                    {selectedDayPlan.slots.map((slot: any, idx: number) => {
                      const isBreak = !slot.student_id;
                      return (
                        <div key={idx} style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: isBreak ? '#fffbeb' : '#f8fafc', borderLeft: isBreak ? '4px solid #f59e0b' : '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f' }}>{isBreak ? '☕ Pause' : slot.student_name}</span>
                          <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: isBreak ? '#b45309' : '#0f172a' }}>{slot.time_slot}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* TAB 1.7.5: SECRETARY - EQUIPMENT */}

        {activeTab === 'secretary' && secretarySubTab === 'equipment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={20} color="#0b57d0" /> Instrumente & Ausstattung
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                  Definiere die Ausstattungsmerkmale (Instrumente, Equipment), die Räumen und Lehrern zugewiesen werden können.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
              {/* Form */}
              <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '28px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={16} color="#0b57d0" /> {editingEquipment ? `„${editingEquipment.name}" bearbeiten` : 'Neue Ausstattung anlegen'}
                </h4>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Name der Ausstattung *</label>
                  <input
                    value={equipmentFormName}
                    onChange={e => setEquipmentFormName(e.target.value)}
                    placeholder='z.B. „Schlagzeug" oder „Beamer"'
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={handleSaveEquipment}
                    disabled={equipmentSaving || !equipmentFormName.trim()}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', opacity: equipmentSaving || !equipmentFormName.trim() ? 0.6 : 1, transition: 'all 0.2s' }}
                  >
                    {equipmentSaving ? 'Speichert…' : editingEquipment ? '💾 Änderungen speichern' : '+ Ausstattung anlegen'}
                  </button>
                  {editingEquipment && (
                    <button onClick={() => openEquipmentEditor(null)} style={{ padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                      Abbrechen
                    </button>
                  )}
                </div>
              </div>

              {/* Existing Equipment list */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h5 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Alle Ausstattungen ({schoolEquipment.length})</h5>
                  <button onClick={() => openEquipmentEditor(null)} style={{ background: '#0b57d0', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}>
                    + Neu
                  </button>
                </div>
                {schoolEquipment.map(eq => (
                  <div key={eq.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', border: editingEquipment?.id === eq.id ? '1.5px solid #0b57d0' : '1px solid #f1f5f9', background: editingEquipment?.id === eq.id ? '#eff6ff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => openEquipmentEditor(eq)}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{eq.name}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={(e) => { e.stopPropagation(); openEquipmentEditor(eq); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0b57d0' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEquipment(eq.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {schoolEquipment.length === 0 && <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, padding: '16px 0' }}>Noch keine Ausstattung</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.8: SECRETARY - SETUP */}

        {activeTab === 'secretary' && secretarySubTab === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Schul-ID & Integration Link (Campus & GrooveLab) */}
            <div className="google-card" style={{ paddingLeft: '44px', borderRadius: '24px', border: '1px solid #f1f5f9', background: 'white' }}>
              <div className="google-kpi-bar bg-google-blue" />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>🏫 Schul-ID &amp; Integration Link (Campus &amp; GrooveLab)</h3>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                  Dies ist der einheitliche Anmeldelink für deine Musikschule. Er gilt sowohl für den Campus als auch für GrooveLab.
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    readOnly 
                    value={`${window.location.origin}/?school_id=${schoolId}`} 
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', fontFamily: 'monospace', background: '#f8fafc', color: '#1e293b' }} 
                  />
                  <button 
                    onClick={() => { 
                      navigator.clipboard.writeText(`${window.location.origin}/?school_id=${schoolId}`); 
                      alert('Schul-Integrationslink kopiert!'); 
                    }} 
                    className="google-btn-primary" 
                    style={{ padding: '10px 18px', fontSize: '0.8rem' }}
                  >
                    Link kopieren
                  </button>
                </div>
              </div>
            </div>
            
            {/* Branding settings */}
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-yellow" style={{ background: '#a855f7' }} />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>🎨 Schul-Branding &amp; Identität</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Schulname</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Primärfarbe (Hex)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Logo URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  />
                  <button onClick={() => alert('Logo erfolgreich aktualisiert!')} className="google-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.78rem' }}>Hochladen</button>
                </div>
              </div>
            </div>

            {/* General Operation Flags */}
            <div className="google-card" style={{ paddingLeft: '44px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
              <div className="google-kpi-bar bg-google-red" />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Urbanist' }}>🛡️ Limits &amp; Systemprüfungen</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', display: 'block', color: '#0f172a' }}>Limits Härtebremse aktivieren</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prüft Stundenpläne automatisch gegen die Auslastungs-Limits.</span>
                </div>
                <input
                  type="checkbox"
                  checked={limitsEnabled}
                  onChange={(e) => handleToggleLimitsEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#a855f7' }}
                />
              </div>
            </div>

            {/* Payment Bypass setting inside Setup subtab */}
            <div className="google-card" style={{ paddingLeft: '44px', borderRadius: '24px', border: '1px solid #f1f5f9', background: 'white' }}>
              <div className="google-kpi-bar bg-google-yellow" style={{ background: '#d97706' }} />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Urbanist' }}>💳 Abrechnungs-Bypass (Pilotphase)</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', display: 'block', color: '#0f172a' }}>Stripe-Zahlungen umgehen (Bypass)</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Zahlungen werden für diese Musikschule in der Pilotphase temporär deaktiviert.</span>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#065f46', background: '#d1fae5', padding: '6px 14px', borderRadius: '100px' }}>
                  SYSTEM-BYPASS AKTIV
                </div>
              </div>
            </div>

            {/* Sync Settings */}
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-green" />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>⚡ Synchronisation (Campus &amp; GrooveLab)</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#1d1d1f', display: 'block' }}>Automatische Synchronisation</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Frequenz, mit der Stundenpläne und Profile abgeglichen werden.</span>
                </div>
                <select style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.8rem', fontWeight: 700 }}>
                  <option>Echtzeit / Live</option>
                  <option>Jede Stunde</option>
                  <option>Alle 6 Stunden</option>
                  <option selected>Täglich um 02:00 Uhr</option>
                </select>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', display: 'block' }}>Manueller Sync-Abgleich</strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Stößt die Zusammenführung der Datenbanken sofort an.</span>
                </div>
                <button 
                  onClick={() => alert('Die manuelle Synchronisation wurde erfolgreich durchgeführt!')}
                  className="google-btn-primary" 
                  style={{ background: '#34a853', fontSize: '0.78rem', padding: '8px 16px' }}
                >
                  Datenbanken jetzt abgleichen
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
      {selectedStudentForDetail && (
        <StudentDetailModal 
          student={selectedStudentForDetail} 
          onClose={() => {
            setSelectedStudentForDetail(null);
            fetchDashboardData();
          }} 
          activePlatform={activeTab}
          onSwitchPlatform={(newPlatform) => {
            setActiveTab(newPlatform);
            if (newPlatform === 'campus') {
              setCampusSubTab('briefing');
            } else if (newPlatform === 'groovelab') {
              setGroovelabSubTab('live');
            }
          }}
        />
      )}
      {selectedCoachProfile && (
        <TeacherDetailModal
          teacher={selectedCoachProfile}
          onClose={() => setSelectedCoachProfile(null)}
        />
      )}
      {manageTeacher && (() => {
        const isCampus = manageTeacher.isCampusActive || manageTeacher.is_campus_active;
        const isActive = manageTeacher.isActive ?? manageTeacher.is_active;
        const avatarBgColor = activeTab === 'campus' ? '#e6f4ea' : '#fef3c7';
        const avatarTextColor = activeTab === 'campus' ? '#137333' : '#b45309';

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '460px',
            height: '100vh',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '-12px 0 40px rgba(15, 23, 42, 0.12)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            borderLeft: '1px solid #e2e8f0',
            fontFamily: 'Inter, sans-serif'
          }}>
            {/* Header with gradient and large dynamic initials avatar */}
            <div style={{
              padding: '28px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '18px',
                  background: avatarBgColor,
                  color: avatarTextColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  fontFamily: 'Urbanist',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                }}>
                  {(manageTeacher.firstName || 'S')?.[0]}{(manageTeacher.lastName || 'L')?.[0]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                    Lehrkräfte-Kartei
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Verwaltung &bull; ID: #{manageTeacher.id.substring(0, 8)}</p>
                </div>
              </div>
              <button 
                onClick={() => setManageTeacher(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* TWO COLUMN GENERAL INFO CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Students KPI Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #e6f4ea 100%)',
                  border: '1px solid #bbf7d0',
                  padding: '16px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüleranzahl</span>
                  <strong style={{ display: 'block', fontSize: '1.45rem', color: '#14532d', marginTop: '4px', fontWeight: 900 }}>{manageTeacher.studentCount || 0}</strong>
                </div>

                {/* Limit KPI Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid #cbd5e1',
                  padding: '16px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schülerlimit</span>
                  <strong style={{ display: 'block', fontSize: '1.45rem', color: '#334155', marginTop: '4px', fontWeight: 900 }}>{manageTeacher.maxStudents || 10}</strong>
                </div>
              </div>

              {/* INPUT FIELDS */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Vorname</label>
                  <input 
                    type="text" 
                    value={manageTeacher.firstName} 
                    onChange={(e) => setManageTeacher({ ...manageTeacher, firstName: e.target.value })}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Nachname</label>
                  <input 
                    type="text" 
                    value={manageTeacher.lastName} 
                    onChange={(e) => setManageTeacher({ ...manageTeacher, lastName: e.target.value })}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>E-Mail-Adresse</label>
                <input 
                  type="email" 
                  value={manageTeacher.email} 
                  onChange={(e) => setManageTeacher({ ...manageTeacher, email: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Hauptinstrument / Fach</label>
                <input 
                  type="text" 
                  value={manageTeacher.instrument} 
                  onChange={(e) => setManageTeacher({ ...manageTeacher, instrument: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Benötigte Ausstattung (Für Räume)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(() => {
                    const availableEquipment = schoolEquipment.length > 0 ? schoolEquipment.map(e => e.name) : INSTRUMENT_TAGS;
                    const requiredEquipment = Array.isArray(manageTeacher.requiredEquipment) ? manageTeacher.requiredEquipment : (Array.isArray(manageTeacher.required_equipment) ? manageTeacher.required_equipment : []);
                    return availableEquipment.map((tag: string) => {
                      const active = requiredEquipment.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            const newEq = active ? requiredEquipment.filter((t: string) => t !== tag) : [...requiredEquipment, tag];
                            setManageTeacher({ ...manageTeacher, requiredEquipment: newEq });
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: `1px solid ${active ? '#0b57d0' : '#e2e8f0'}`,
                            background: active ? '#eff6ff' : 'white',
                            color: active ? '#0b57d0' : '#64748b',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {tag}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Endzeit / Vertragsende (Zugriff erlischt automatisch)</label>
                <input 
                  type="date" 
                  value={manageTeacher.contractEndsAt ? new Date(manageTeacher.contractEndsAt).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setManageTeacher({ ...manageTeacher, contractEndsAt: e.target.value || null })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Support PIN Section */}
              <div style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e', display: 'block', textTransform: 'uppercase' }}>Support-PIN (Ausweis ID)</span>
                  <strong style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: '#b45309', letterSpacing: '0.05em' }}>{manageTeacher.ausweisNummer || 'Keine'}</strong>
                </div>
                <button 
                  onClick={async () => {
                    const newPin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
                    try {
                      const { error } = await supabase
                        .from('users')
                        .update({ ausweis_nummer: newPin })
                        .eq('id', manageTeacher.id);
                      if (error) throw error;
                      setManageTeacher({ ...manageTeacher, ausweisNummer: newPin });
                      fetchDashboardData();
                    } catch (err: any) {
                      alert('Fehler beim Zurücksetzen: ' + err.message);
                    }
                  }}
                  className="google-btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '10px', background: '#ffffff', color: '#b45309', borderColor: '#fcd34d' }}
                >
                  Neu generieren
                </button>
              </div>

              {/* QR Code Activation Link Section */}
              {(() => {
                const token = manageTeacher.teacherQrToken || '';
                const link = token ? `${window.location.origin}/?qr_token=${token}&email=${encodeURIComponent(manageTeacher.email)}` : '';
                return link ? (
                  <div style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', alignSelf: 'flex-start', textTransform: 'uppercase' }}>Aktivierungs-QR-Code</span>
                    <div style={{ 
                      background: '#ffffff', 
                      padding: '16px', 
                      borderRadius: '16px', 
                      display: 'inline-flex',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                      border: '1px solid #e2e8f0'
                    }}>
                      <QRCode id="qr-code-svg" value={link} size={130} />
                    </div>
                    <button
                      onClick={downloadQRCode}
                      className="google-btn-secondary"
                      style={{ width: '100%', padding: '10px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px' }}
                    >
                      📥 QR-Code speichern (SVG)
                    </button>
                  </div>
                ) : null;
              })()}

              {/* Permissions Switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Modulberechtigungen &amp; Status</label>
                
                {/* Campus Toggle */}
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>🎓 Campus Freigabe</span>
                  <input 
                    type="checkbox" 
                    checked={manageTeacher.isCampusActive} 
                    onChange={(e) => setManageTeacher({ ...manageTeacher, isCampusActive: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#10b981',
                      cursor: 'pointer'
                    }}
                  />
                </label>

                {/* GrooveLab Toggle */}
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>🎸 GrooveLab Freigabe</span>
                  <input 
                    type="checkbox" 
                    checked={manageTeacher.isGroovelabActive} 
                    onChange={(e) => setManageTeacher({ ...manageTeacher, isGroovelabActive: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#f59e0b',
                      cursor: 'pointer'
                    }}
                  />
                </label>

                {/* Account Active Toggle */}
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>⏳ Account Aktiviert</span>
                  <input 
                    type="checkbox" 
                    checked={manageTeacher.isActive} 
                    onChange={(e) => setManageTeacher({ ...manageTeacher, isActive: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#3b82f6',
                      cursor: 'pointer'
                    }}
                  />
                </label>
              </div>

              {/* Danger Zone */}
              <div style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#dc2626', display: 'block' }}>Gefahrenzone</span>
                  <span style={{ fontSize: '0.7rem', color: '#991b1b' }}>Diesen Lehrer permanent aus der Schule entfernen.</span>
                </div>
                <button 
                  onClick={async () => {
                    if (confirm('Diesen Mitarbeiter wirklich unwiderruflich löschen?')) {
                      await handleDeleteUser(manageTeacher.id);
                      setManageTeacher(null);
                    }
                  }}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.15)'
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#f8fafc'
            }}>
              <button 
                onClick={() => setManageTeacher(null)} 
                className="google-btn-secondary"
                style={{ borderRadius: '12px', fontSize: '0.82rem' }}
              >
                Abbrechen
              </button>
              <button 
                onClick={() => handleUpdateTeacher(manageTeacher)}
                className="google-btn-primary"
                style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Speichern
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  </div>
  );
}
