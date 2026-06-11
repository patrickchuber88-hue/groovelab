import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, CheckCircle, Users, Settings, Bell, 
  UserCheck, RefreshCw, Key, ChevronRight, UserX, LogOut,
  Copy, Check, Link as LinkIcon, Monitor, Sliders,
  Coffee, Sparkles, Clock, ClipboardList, Upload, Plus,
  Trash2, Shield, Calendar, BookOpen, Music, CheckSquare, XSquare, Check as CheckIcon,
  LayoutDashboard, Award, UserPlus, GraduationCap, ZoomIn, ZoomOut, ChevronLeft, X, AlertCircle, MoreVertical,
  School, User, DoorOpen, Tag, Wrench, BarChart2, Edit3, Search, Ruler, Eye, EyeOff
} from 'lucide-react';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDetailModal } from './StudentDetailModal';
import { TeacherDetailModal } from './TeacherDetailModal';
import { CampusEventsBoard } from './CampusEventsBoard';
import QRCode from 'react-qr-code';
function generateStarterPin(role: string, isCampus: boolean, isGroovelab: boolean): string {
  let prefix = 'C';
  if (role === 'admin' || role === 'secretary') {
    prefix = 'V';
  } else if (isCampus && isGroovelab) {
    prefix = 'CG';
  } else if (isCampus) {
    prefix = 'C';
  } else if (isGroovelab) {
    prefix = 'G';
  } else {
    prefix = 'C';
  }
  const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${randomNum}`;
}

function generateSecureQrToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 't_';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}


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
  isPinActivated?: boolean;
  sick_until?: string | null;
  preferred_room_ids?: string[];
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
  isPinActivated?: boolean;
  studentCount?: number;
  contractEndsAt?: string | null;
  sick_until?: string | null;
  preferred_room_ids?: string[];
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

const getStationColor = (name: string | null | undefined, dbColor?: string | null) => {
  if (!name) return '#64748b';
  
  const isStandardIpad = /^ipad\s*\d+/i.test(name);
  if (dbColor && dbColor !== '#e5e7eb' && dbColor !== '#e2e8f0' && dbColor !== '#cbd5e1') {
    if (isStandardIpad && dbColor === '#64748b') {
      // Fall through to number-based standard color
    } else {
      return dbColor;
    }
  }

  const lowerName = name.toLowerCase();
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return '#64748b';
  const num = parseInt(matches[matches.length - 1]);
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

const getAlphabeticalColor = (name: string) => {
  const trimmed = (name || '').trim();
  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

const getAlphabeticalUniColor = (name: string) => {
  const trimmed = (name || '').trim();
  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  const avatarBg = `hsl(${hue}, 80%, 93%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

const getFloorColor = (name: string) => {
  const trimmed = (name || '').trim();
  const normalized = trimmed.toLowerCase();
  
  // Check if it has a number or is EG/UG
  const hasNumber = /\d+/.test(normalized);
  const isEg = normalized.includes('eg') || normalized.includes('erdgeschoss');
  const isUg = normalized.includes('ug') || normalized.includes('untergeschoss') || normalized.includes('keller') || normalized.includes('-');
  
  if (hasNumber || isEg || isUg) {
    // Parse floor number N
    let N = 0;
    if (isEg) {
      N = 0;
    } else {
      const isNegative = isUg;
      const match = normalized.match(/\d+/);
      if (match) {
        const val = parseInt(match[0]);
        N = isNegative ? -val : val;
      } else {
        N = isNegative ? -1 : 0;
      }
    }
    
    // Clamp N to [-3, 8]
    const clampedN = Math.max(-3, Math.min(8, N));
    // Map [-3, 8] to index [0, 11]
    const mappedIndex = clampedN + 3;
    // Map [0, 11] to [65, 90] (A-Z)
    const clampedCode = 65 + Math.round((mappedIndex / 11) * 25);
    const hue = Math.round(((clampedCode - 65) / 25) * 360);
    const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
    const avatarColor = `hsl(${hue}, 90%, 25%)`;
    return { avatarBg, avatarColor };
  }
  
  return getAlphabeticalColor(name);
};

interface AppleStyleTokenFieldProps {
  label: string;
  selectedString: string;
  onChange: (newValue: string) => void;
  suggestions: string[];
  placeholder?: string;
}

const AppleStyleTokenField: React.FC<AppleStyleTokenFieldProps> = ({
  label,
  selectedString,
  onChange,
  suggestions,
  placeholder = 'Fach hinzufügen...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTokens = selectedString
    ? selectedString.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const availableSuggestions = suggestions.filter(
    (s) => !selectedTokens.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectToken = (token: string) => {
    const next = [...selectedTokens, token];
    onChange(next.join(', '));
    setInputValue('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleRemoveToken = (token: string) => {
    const next = selectedTokens.filter((t) => t !== token);
    onChange(next.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputValue && selectedTokens.length > 0) {
      handleRemoveToken(selectedTokens[selectedTokens.length - 1]);
    } else if (e.key === 'ArrowDown' && availableSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % availableSuggestions.length);
    } else if (e.key === 'ArrowUp' && availableSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + availableSuggestions.length) % availableSuggestions.length);
    } else if (e.key === 'Enter' && availableSuggestions.length > 0) {
      e.preventDefault();
      handleSelectToken(availableSuggestions[activeIndex]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '4px',
        width: '100%' 
      }}
    >
      <div 
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '12px',
          border: isFocused ? '1.5px solid #007aff' : '1.5px solid #cbd5e1',
          background: '#ffffff',
          boxShadow: isFocused ? '0 0 0 3px rgba(0, 122, 255, 0.15)' : 'none',
          minHeight: '44px',
          cursor: 'text',
          transition: 'all 0.15s ease-in-out',
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {label && (
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            color: '#8e8e93', 
            marginRight: '4px',
            userSelect: 'none'
          }}>
            {label}
          </span>
        )}

        {selectedTokens.map((token) => (
          <div
            key={token}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#e5e5ea',
              color: '#1c1c1e',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 650,
              userSelect: 'none',
              transition: 'background 0.2s'
            }}
          >
            <span>{token}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveToken(token);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8e8e93',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '14px',
                height: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d1d1d6';
                e.currentTarget.style.color = '#555';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#8e8e93';
              }}
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setActiveIndex(0);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTokens.length === 0 ? placeholder : ''}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: '80px',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '2px 0',
            color: '#1c1c1e',
            background: 'transparent'
          }}
        />
      </div>

      {isFocused && availableSuggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '6px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            zIndex: 9999,
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '4px'
          }}
        >
          {availableSuggestions.map((suggestion, index) => {
            const isSelected = index === activeIndex;
            return (
              <div
                key={suggestion}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectToken(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isSelected ? '#007aff' : 'transparent',
                  color: isSelected ? '#ffffff' : '#1c1c1e',
                  transition: 'background 0.05s ease, color 0.05s ease'
                }}
              >
                {suggestion}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const parseRoomName = (name: string) => {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.*?)\s*(\d+)$/);
  if (match) {
    return {
      prefix: match[1].trim(),
      number: parseInt(match[2], 10)
    };
  }
  return {
    prefix: trimmed,
    number: null
  };
};

export function SecretaryDashboard({ schoolId, userId, onLogout }: SecretaryDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'secretary' | 'campus' | 'groovelab'>(() => {
    const saved = localStorage.getItem('groovelab_active_workspace');
    if (saved === 'campus' || saved === 'groovelab' || saved === 'secretary') return saved as any;
    return 'secretary';
  });
  const [secretarySubTab, setSecretarySubTab] = useState<'briefing' | 'employees' | 'licenses' | 'setup' | 'rooms' | 'equipment' | 'crisis' | 'audit'>('briefing');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('All');
  const [campusSubTab, setCampusSubTab] = useState<'briefing' | 'subjects' | 'onboarding' | 'students' | 'cooperations' | 'events' | 'schedules' | 'status'>('briefing');
  const [schedulesRoomsViewMode, setSchedulesRoomsViewMode] = useState<'designer' | 'live'>('designer');
  const [liveViewDay, setLiveViewDay] = useState<number>(1);
  const [showAdHocBooking, setShowAdHocBooking] = useState<boolean>(false);
  const [adHocRoomId, setAdHocRoomId] = useState<string | null>(null);
  const [adHocTeacherId, setAdHocTeacherId] = useState<string>('');
  const [adHocStudentName, setAdHocStudentName] = useState<string>('');
  const [adHocStartTime, setAdHocStartTime] = useState<string>('14:00');
  const [adHocDuration, setAdHocDuration] = useState<number>(45);
  const [groovelabSubTab, setGroovelabSubTab] = useState<'briefing' | 'live' | 'students' | 'coaches' | 'kiosk' | 'status'>('briefing');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<any[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDesc, setNewEventDesc] = useState<string>('');
  const [newEventTarget, setNewEventTarget] = useState<'all' | 'students' | 'teachers'>('all');
  const [manageTeacher, setManageTeacher] = useState<any | null>(null);
  const [selectedCrisisTeacherId, setSelectedCrisisTeacherId] = useState<string | null>(null);
  const [crisisTabMode, setCrisisTabMode] = useState<'live' | 'history'>('live');
  const [selectedArchiveLog, setSelectedArchiveLog] = useState<any | null>(null);
  const [expandedLiveDayStr, setExpandedLiveDayStr] = useState<string | null>(null);
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [copiedSchoolLink, setCopiedSchoolLink] = useState<boolean>(false);

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

  // Sofortiges Laden des eigenen Profils – unabhängig vom langen fetchDashboardData
  useEffect(() => {
    if (!userId) return;
    const loadOwnProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, nickname, photo_url, role, email, instrument')
        .eq('id', userId)
        .single();
      if (data) setCurrentUserProfile(data);
    };
    loadOwnProfile();
  }, [userId]);

  useEffect(() => {
    const migrateLocalStorageToSupabase = async () => {
      try {
        const migratedKey = `groovelab_db_migration_done_${schoolId}`;
        if (localStorage.getItem(migratedKey)) return;
        
        const { data: dbRooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
        if (!dbRooms || dbRooms.length === 0) return;
        
        const floorMap = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
        const instrumentsMap = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
        const unsuitableMap = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
        const sonstigesMap = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
        
        let migrationCount = 0;
        for (const rm of dbRooms) {
          const localFloor = floorMap[rm.id];
          const localInstruments = instrumentsMap[rm.id];
          const localUnsuitable = unsuitableMap[rm.id];
          const localSonstiges = sonstigesMap[rm.id];
          
          if (localFloor || localInstruments || localUnsuitable || localSonstiges) {
            const updatePayload: any = {};
            if (localFloor) updatePayload.floor = localFloor;
            if (localInstruments && localInstruments.length > 0) updatePayload.room_instruments = localInstruments;
            if (localUnsuitable && localUnsuitable.length > 0) updatePayload.unsuitable_instruments = localUnsuitable;
            if (localSonstiges) updatePayload.sonstiges = localSonstiges;
            
            if (Object.keys(updatePayload).length > 0) {
              const { error } = await supabase.from('rooms').update(updatePayload).eq('id', rm.id);
              if (!error) migrationCount++;
            }
          }
        }
        
        if (migrationCount > 0) {
          console.log(`Successfully migrated ${migrationCount} rooms from localStorage to Supabase.`);
        }
        localStorage.setItem(migratedKey, 'true');
      } catch (err) {
        console.error("Local storage to Supabase migration error:", err);
      }
    };
    
    if (schoolId) {
      migrateLocalStorageToSupabase();
    }
  }, [schoolId]);

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
        .update({ 
          ausweis_nummer: newPin,
          is_pin_activated: false,
          personal_pin: null
        })
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
  const [overrideFavRoom1, setOverrideFavRoom1] = useState<string>('');
  const [overrideFavRoom2, setOverrideFavRoom2] = useState<string>('');

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
  const [isAnonymizedImport, setIsAnonymizedImport] = useState<boolean>(true);
  const [studentCurrentPage, setStudentCurrentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(50);

  // Overhauled Room Board States
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [roomFilterFloor, setRoomFilterFloor] = useState<string>('All');
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'campus' | 'groovelab' | 'inactive'>('all');
  const [addedFloors, setAddedFloors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`groovelab_added_floors_${schoolId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [dragHoveredFloor, setDragHoveredFloor] = useState<string | null>(null);
  const [isRoomCsvExpanded, setIsRoomCsvExpanded] = useState<boolean>(false);
  const [roomCsvText, setRoomCsvText] = useState<string>('');
  const [roomCsvSaving, setRoomCsvSaving] = useState<boolean>(false);


  // Manual Student Creation Form States
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentFirstName, setNewStudentFirstName] = useState<string>('');
  const [newStudentLastName, setNewStudentLastName] = useState<string>('');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState<string>('');
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
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [employeeStatusTab, setEmployeeStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [employeeFilterRole, setEmployeeFilterRole] = useState<string>('All');
  const [isEmployeeCsvExpanded, setIsEmployeeCsvExpanded] = useState<boolean>(false);
  const [employeeCsvText, setEmployeeCsvText] = useState<string>('');
  const [employeeImportStatus, setEmployeeImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState<boolean>(false);
  const [dragHoveredEmployeeRole, setDragHoveredEmployeeRole] = useState<string | null>(null);

  const [userQuota, setUserQuota] = useState<number>(150);
  const [activeUserQuota, setActiveUserQuota] = useState<number>(150);
  const [pendingUserQuota, setPendingUserQuota] = useState<number | null>(null);

  // School Data & Subscription
  const [schoolName, setSchoolName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('#1a73e8'); // Google Blue
  const [hasCampusSub, setHasCampusSub] = useState<boolean>(false);
  const [hasGroovelabSub, setHasGroovelabSub] = useState<boolean>(false);
  const [campusActivatedThisMonth, setCampusActivatedThisMonth] = useState<boolean>(false);
  const [groovelabActivatedThisMonth, setGroovelabActivatedThisMonth] = useState<boolean>(false);
  const [studentBillingOption, setStudentBillingOption] = useState<string>('option1');
  const [isBillingBooked, setIsBillingBooked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('isBillingBooked') === 'true';
  });
  const [bookedExtraUsers, setBookedExtraUsers] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const val = localStorage.getItem('bookedExtraUsers');
    return val ? parseInt(val, 10) : 0;
  });
  const [extraUsersSliderVal, setExtraUsersSliderVal] = useState<number>(0);
  const [extraBillingOption, setExtraBillingOption] = useState<string>('option1');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [limitsEnabled, setLimitsEnabled] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [calendarUrl, setCalendarUrl] = useState<string>('');
  
  // Tokens & Settings
  const [kioskToken, setKioskToken] = useState<string>('');
  const [campusToken, setCampusToken] = useState<string>('');
  const [allowMessagesGlobal, setAllowMessagesGlobal] = useState<boolean>(true);
  
  // Lists
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [bypassTeachers, setBypassTeachers] = useState<BypassTeacher[]>([]);
  const [coaches, setCoaches] = useState<GrooveLabCoach[]>([]);
  const [campusTeachers, setCampusTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  
  // Room Planner Matrix states
  const [matrixAllocations, setMatrixAllocations] = useState<any[]>([]);
  const [selectedDayPlan, setSelectedDayPlan] = useState<any | null>(null);
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);
  const [draggedPlanDay, setDraggedPlanDay] = useState<number | null>(null);
  const [hoveredUnassignedDayNum, setHoveredUnassignedDayNum] = useState<number | null>(null);
  const [clickedUnassignedDayNum, setClickedUnassignedDayNum] = useState<number | null>(null);
  const [schedulesSidebarTab, setSchedulesSidebarTab] = useState<'submissions' | 'stats'>('submissions');
  const [sidebarTeacherSearch, setSidebarTeacherSearch] = useState<string>('');
  const [expandedSidebarTeacherId, setExpandedSidebarTeacherId] = useState<string | null>(null);
  const [selectedFilterTeacherId, setSelectedFilterTeacherId] = useState<string | null>(null);

  // Räume-Verwaltung State
  const [roomsSubView, setRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [roomFormName, setRoomFormName] = useState('');
  const [roomFormEquipment, setRoomFormEquipment] = useState<string[]>([]);
  const [roomFormMaxTeachers, setRoomFormMaxTeachers] = useState(1);
  const [roomFormMaxStudents, setRoomFormMaxStudents] = useState(1);
  const [roomFormQm, setRoomFormQm] = useState(0);
  const [roomFormIsCampusActive, setRoomFormIsCampusActive] = useState(true);
  const [roomFormIsGroovelabActive, setRoomFormIsGroovelabActive] = useState(false);
  const [roomFormFloor, setRoomFormFloor] = useState('Allgemein');
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomFormUnsuitableInstruments, setRoomFormUnsuitableInstruments] = useState<string[]>([]);
  const [roomFormRoomInstruments, setRoomFormRoomInstruments] = useState<Array<{ name: string, model: string }>>([]);
  const [roomFormSonstiges, setRoomFormSonstiges] = useState('');
  const [newInstrumentName, setNewInstrumentName] = useState('');
  const [newInstrumentModel, setNewInstrumentModel] = useState('');
  const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];

  // Equipment State
  const [schoolEquipment, setSchoolEquipment] = useState<any[]>([]);
  const [equipmentFormName, setEquipmentFormName] = useState('');
  const [equipmentFormQty, setEquipmentFormQty] = useState<number>(1);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);
  const [equipmentSaving, setEquipmentSaving] = useState(false);
  const [selectedEquipmentRoomId, setSelectedEquipmentRoomId] = useState<string>('All');
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState<string>('');
  const [equipmentSortFreeFirst, setEquipmentSortFreeFirst] = useState<boolean>(false);
  const equipmentNameInputRef = useRef<HTMLInputElement>(null);
  const equipmentQtyInputRef = useRef<HTMLInputElement>(null);
  const [editingRoomInstrument, setEditingRoomInstrument] = useState<{ roomId: string, index: number, name: string, model: string } | null>(null);
  const [editRoomInstFormName, setEditRoomInstFormName] = useState<string>('');
  const [editRoomInstFormModel, setEditRoomInstFormModel] = useState<string>('');
  const [editingEquipmentGroup, setEditingEquipmentGroup] = useState<any | null>(null);
  const [editGroupName, setEditGroupName] = useState<string>('');
  const [editGroupModel, setEditGroupModel] = useState<string>('');
  const [editGroupLink, setEditGroupLink] = useState<string>('');
  const [editGroupCoupled, setEditGroupCoupled] = useState<boolean>(true);
  const [editGroupQty, setEditGroupQty] = useState<number>(1);
  const [editGroupInstancesData, setEditGroupInstancesData] = useState<any[]>([]);
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
  const [teacherFilterInstrument, setTeacherFilterInstrument] = useState<string>('All');
  
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

  // Subjects (Unterrichtsfächer) states
  const [subjects, setSubjects] = useState<any[]>([]);
  const activeSubjectsList = useMemo(() => {
    const activeSubs = subjects.filter((s: any) => s.is_active).map((s: any) => s.name);
    return activeSubs.length > 0 ? activeSubs : INSTRUMENT_TAGS;
  }, [subjects]);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');
  const [subjectFilterCategory, setSubjectFilterCategory] = useState<string>('All');
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectDescription, setNewSubjectDescription] = useState<string>('');
  const [newSubjectCategory, setNewSubjectCategory] = useState<string>('Allgemein');
  const [isSubjectCsvExpanded, setIsSubjectCsvExpanded] = useState<boolean>(false);
  const [subjectCsvText, setSubjectCsvText] = useState<string>('');

  // Cooperations states
  const [cooperations, setCooperations] = useState<any[]>([]);
  const [cooperationSearchQuery, setCooperationSearchQuery] = useState<string>('');
  const [cooperationFilterStatus, setCooperationFilterStatus] = useState<string>('All');
  const [cooperationFilterSubject, setCooperationFilterSubject] = useState<string>('All');
  const [cooperationFilterTeacher, setCooperationFilterTeacher] = useState<string>('All');
  const [showAddCooperationModal, setShowAddCooperationModal] = useState<boolean>(false);
  const [newCooperationName, setNewCooperationName] = useState<string>('');
  const [newCooperationContactPerson, setNewCooperationContactPerson] = useState<string>('');
  const [newCooperationEmail, setNewCooperationEmail] = useState<string>('');
  const [newCooperationPhone, setNewCooperationPhone] = useState<string>('');
  const [newCooperationStatus, setNewCooperationStatus] = useState<string>('active');
  const [newCooperationSubject, setNewCooperationSubject] = useState<string>('');
  const [newCooperationTeacherId, setNewCooperationTeacherId] = useState<string>('');
  const [cooperationPageSize, setCooperationPageSize] = useState<number>(10);
  const [cooperationCurrentPage, setCooperationCurrentPage] = useState<number>(1);
  const [isCooperationCsvExpanded, setIsCooperationCsvExpanded] = useState<boolean>(false);
  const [cooperationCsvText, setCooperationCsvText] = useState<string>('');

  // Drag and drop hovered states
  const [dragHoveredInstrument, setDragHoveredInstrument] = useState<string | null>(null);
  const [dragHoveredTeacher, setDragHoveredTeacher] = useState<string | null>(null);
  const [dragHoveredCoopStatus, setDragHoveredCoopStatus] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [updatingTeacherId, setUpdatingTeacherId] = useState<string | null>(null);
  const [briefingData, setBriefingData] = useState<SecretaryBriefingData | null>(null);
  const [crisisNotifications, setCrisisNotifications] = useState<any[]>([]);

  // Realtime subscription for crisis updates, system alerts, and user profiles with 500ms settling debounce
  useEffect(() => {
    if (!schoolId) return;
    
    fetchCrisisNotifications();

    let crisisTimeout: any = null;
    let dashboardTimeout: any = null;

    const debouncedFetchCrisisNotifications = () => {
      if (crisisTimeout) clearTimeout(crisisTimeout);
      crisisTimeout = setTimeout(() => {
        fetchCrisisNotifications();
      }, 500);
    };

    const debouncedFetchDashboardData = () => {
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      dashboardTimeout = setTimeout(() => {
        fetchDashboardData();
      }, 500);
    };

    const channel = supabase
      .channel('public:crisis_notifications')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crisis_notifications' }, (payload) => {
        const updatedRow = payload.new as any;
        if (updatedRow) {
          setCrisisNotifications(prev =>
            prev.map(n => n.id === updatedRow.id ? { ...n, status: updatedRow.status, notified_at: updatedRow.notified_at } : n)
          );
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crisis_notifications' }, () => {
        debouncedFetchCrisisNotifications();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'crisis_notifications' }, () => {
        debouncedFetchCrisisNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, () => {
        debouncedFetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        debouncedFetchDashboardData();
        debouncedFetchCrisisNotifications();
      })
      .subscribe();

    return () => {
      if (crisisTimeout) clearTimeout(crisisTimeout);
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
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
          teacher:users!crisis_notifications_teacher_id_fkey (id, first_name, last_name, sick_until)
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

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          changed_by,
          table_name,
          action,
          record_id,
          old_data,
          new_data,
          created_at,
          users (
            first_name,
            last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'secretary' && secretarySubTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, secretarySubTab]);

  useEffect(() => {
    if (schoolId && matrixAllocations.length > 0) {
      const draftMap: Record<string, string | null> = {};
      matrixAllocations.forEach(p => {
        draftMap[p.id] = p.roomId;
      });
      localStorage.setItem(`groovelab_matrix_allocations_draft_${schoolId}`, JSON.stringify(draftMap));
    }
  }, [matrixAllocations, schoolId]);

  // Click-away listener to close iPad unassigned popovers when tapping outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setClickedUnassignedDayNum(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const exportAuditLogsToCsv = () => {
    if (auditLogs.length === 0) return;
    const headers = ['Zeitpunkt', 'Aktion', 'Tabelle', 'Betroffener Nutzer', 'Record-ID', 'Geändert von', 'Details'];
    const rows = auditLogs.map(log => {
      const changer = log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System';
      const targetName = log.table_name === 'users' ? (userMap[log.record_id] || 'Unbekannt') : log.table_name;
      let details = '';
      if (log.action === 'UPDATE') {
        details = Object.entries(log.new_data || {}).map(([k, v]) => `${k}: ${JSON.stringify(log.old_data?.[k])} -> ${JSON.stringify(v)}`).join(' | ');
      } else if (log.action === 'INSERT') {
        details = Object.entries(log.new_data || {}).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' | ');
      } else {
        details = Object.entries(log.old_data || {}).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' | ');
      }
      return [
        new Date(log.created_at).toLocaleString('de-DE'),
        log.action,
        log.table_name,
        targetName,
        log.record_id,
        changer,
        details
      ];
    });
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Aenderungsprotokoll_GrooveLab_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDiffContent = (log: any) => {
    if (log.action === 'INSERT') {
      if (!log.new_data) return '-';
      return Object.entries(log.new_data).map(([key, val]) => (
        <div key={key} style={{ fontSize: '0.72rem', color: '#374151' }}>
          <strong>{key}</strong>: {JSON.stringify(val)}
        </div>
      ));
    }
    if (log.action === 'DELETE') {
      if (!log.old_data) return '-';
      return Object.entries(log.old_data).map(([key, val]) => (
        <div key={key} style={{ fontSize: '0.72rem', color: '#6b7280' }}>
          <strong>{key}</strong>: {JSON.stringify(val)}
        </div>
      ));
    }
    if (log.action === 'UPDATE') {
      if (!log.new_data || !log.old_data) return '-';
      return Object.entries(log.new_data).map(([key, newVal]: [string, any]) => {
        const oldVal = log.old_data[key];
        return (
          <div key={key} style={{ fontSize: '0.72rem', color: '#1f2937', marginBottom: '2px' }}>
            <span style={{ fontWeight: 650, color: '#4b5563' }}>{key}</span>:{' '}
            <span style={{ textDecoration: 'line-through', color: '#c5221f', backgroundColor: '#fce8e6', padding: '1px 3px', borderRadius: '4px' }}>
              {oldVal !== undefined ? JSON.stringify(oldVal) : 'leer'}
            </span>{' '}
            ➔{' '}
            <span style={{ color: '#137333', backgroundColor: '#e6f4ea', padding: '1px 3px', borderRadius: '4px', fontWeight: 600 }}>
              {JSON.stringify(newVal)}
            </span>
          </div>
        );
      });
    }
    return '-';
  };

  const fetchLiveStatusData = async () => {
    try {
      // Fetch active sessions for Live Lab
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

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
        .select('name, logo_url, primary_color, calendar_url, groovelab_kiosk_token, campus_login_token, allow_messages_global, has_campus_subscription, has_groovelab_subscription, is_paused, limits_enabled, user_quota, pending_user_quota, campus_activated_this_month, groovelab_activated_this_month, student_billing_option')
        .eq('id', schoolId)
        .single();

      if (schoolErr) throw schoolErr;
      if (schoolData) {
        setSchoolName(schoolData.name);
        setEditColor(schoolData.primary_color || '#1a73e8');
        setLogoUrl(schoolData.logo_url || '');
        setCalendarUrl(schoolData.calendar_url || '');
        setKioskToken(schoolData.groovelab_kiosk_token || '');
        setCampusToken(schoolData.campus_login_token || '');
        setAllowMessagesGlobal(schoolData.allow_messages_global ?? true);
        const hasCampus = schoolData.has_campus_subscription ?? false;
        const hasGroove = schoolData.has_groovelab_subscription ?? false;
        setHasCampusSub(hasCampus);
        setHasGroovelabSub(hasGroove);
        setCampusActivatedThisMonth(schoolData.campus_activated_this_month ?? false);
        setGroovelabActivatedThisMonth(schoolData.groovelab_activated_this_month ?? false);
        setStudentBillingOption(schoolData.student_billing_option || 'option1');
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
        .select('id, first_name, last_name, role, email, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, nickname, is_premium_user, contract_ends_at, teacher_id, lesson_duration, qr_token, is_pin_activated, sick_until, personal_pin, created_at, preferred_room_ids')
        .eq('school_id', schoolId);

      if (usersErr) throw usersErr;

      // Fetch pending students (only in anonymized tables)
      const { data: pendingStudents } = await supabase
        .from('pending_students_decrypted')
        .select('id, school_id, teacher_id, instrument, status, created_at, first_name, last_name, day_of_birth')
        .eq('school_id', schoolId);

      // Fetch activation days for student onboarding verification
      const { data: actDays } = await supabase
        .from('activation_days')
        .select('student_id, day_of_birth');

      const activationDaysMap: Record<string, number> = {};
      if (actDays) {
        actDays.forEach(ad => {
          if (ad.student_id) {
            activationDaysMap[ad.student_id] = ad.day_of_birth;
          }
        });
      }

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
      const userInstrumentMap: Record<string, string> = {};
      const coachesList: GrooveLabCoach[] = [];
      const campusTeachersList: any[] = [];
      const bypassList: BypassTeacher[] = [];
      const employeesList: any[] = [];
      const studentsList: any[] = [];

      allUsers?.forEach(u => {
        const fullName = `${u.first_name} ${u.last_name}`;
        map[u.id] = fullName;
        userInstrumentMap[u.id] = u.instrument || '';

        if (u.role === 'admin' || u.role === 'secretary') {
          employeesList.push(u);
        }

        if (u.role === 'student') {
          studentsList.push({
            ...u,
            day_of_birth: activationDaysMap[u.id] || null
          });
        }

        if (u.role === 'teacher' || u.role === 'admin') {
          const currentStudentCount = allUsers?.filter(usr => usr.role === 'student' && usr.teacher_id === u.id).length || 0;
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
              role: u.role,
              isPinActivated: u.is_pin_activated,
              sick_until: u.sick_until,
              preferred_room_ids: u.preferred_room_ids || []
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
                contractEndsAt: u.contract_ends_at || null,
                sick_until: u.sick_until,
                preferred_room_ids: u.preferred_room_ids || []
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
                contractEndsAt: u.contract_ends_at || null,
                sick_until: u.sick_until,
                preferred_room_ids: u.preferred_room_ids || []
              });
            }
          }
        }
      });

      // Merge pending students into student list
      if (pendingStudents) {
        pendingStudents.forEach(ps => {
          const fName = ps.first_name || 'Ausstehendes';
          const lName = ps.last_name || 'Onboarding';
          const fullName = `${fName} ${lName}`;
          
          map[ps.id] = fullName;
          userInstrumentMap[ps.id] = ps.instrument || '';

          studentsList.push({
            id: ps.id,
            school_id: ps.school_id,
            teacher_id: ps.teacher_id,
            role: 'student',
            first_name: fName,
            last_name: lName,
            email: '',
            instrument: ps.instrument || 'Allgemein',
            is_active: false,
            is_campus_active: false,
            is_groovelab_active: false,
            status: 'inactive',
            isPendingOnboarding: true,
            day_of_birth: ps.day_of_birth || null,
            ausweis_nummer: 'Ausstehend (Onboarding)',
            created_at: ps.created_at || new Date().toISOString()
          });
        });
      }

      setUserMap(map);
      setCoaches(coachesList);
      setCampusTeachers(campusTeachersList);
      setAllTeachers(allUsers?.filter(u => u.role === 'teacher').map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email || '',
        role: u.role,
        instrument: u.instrument || '',
        isActive: u.is_active ?? true,
        isCampusActive: u.is_campus_active,
        isGroovelabActive: u.is_groovelab_active
      })) || []);
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

      const mappedRooms = (roomsData || []).map(r => {
        const localUnsuitable = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            return map[r.id] || [];
          } catch { return []; }
        })();
        const localInstruments = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[r.id] || [];
          } catch { return []; }
        })();
        const localSonstiges = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
            return map[r.id] || '';
          } catch { return ''; }
        })();

        return {
          ...r,
          equipment: r.allowed_instruments || [],
          unsuitable_instruments: r.unsuitable_instruments || localUnsuitable,
          room_instruments: r.room_instruments || localInstruments,
          sonstiges: r.sonstiges || localSonstiges
        };
      });
      mappedRooms.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de-DE', { numeric: true, sensitivity: 'base' }));
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
      let allSchedulesData: any[] = [];
      try {
        const { data, error: schedErr } = await supabase
          .from('schedules')
          .select('*')
          .eq('school_id', schoolId);
        if (schedErr) throw schedErr;
        allSchedulesData = data || [];
        localStorage.setItem(`groovelab_schedules_cache_${schoolId}`, JSON.stringify(allSchedulesData));
      } catch (err) {
        console.warn('Supabase schedules fetch failed, falling back to local cache:', err);
        const cached = localStorage.getItem(`groovelab_schedules_cache_${schoolId}`);
        if (cached) {
          allSchedulesData = JSON.parse(cached);
        }
      }

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

      const draftMap = (() => {
        try {
          return JSON.parse(localStorage.getItem(`groovelab_matrix_allocations_draft_${schoolId}`) || '{}');
        } catch { return {}; }
      })();

      const initialAllocations = Object.entries(teacherDays).map(([key, slots]) => {
        const [teacherId, dayOfWeekStr] = key.split('_');
        const dayOfWeek = parseInt(dayOfWeekStr);

        const sortedSlots = [...slots]
          .map(s => ({
            ...s,
            student_name: s.student_id ? map[s.student_id] || 'Unbekannter Schüler' : 'Pause',
            student_instrument: s.student_id ? userInstrumentMap[s.student_id] || '' : ''
          }))
          .sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
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
        const dbRoomId = sortedSlots.find(s => s.room_id)?.room_id || null;
        const roomId = draftMap[key] !== undefined ? draftMap[key] : dbRoomId;

        const teacherProfile = campusTeachersList.find(t => t.id === teacherId);
        const teacherName = map[teacherId] || 'Unbekannte Lehrkraft';
        const instrument = userInstrumentMap[teacherId] || teacherProfile?.instrument || 'Gitarre';

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

      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

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

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      setSubjects(subjectsData || []);

      // Fetch cooperations
      const { data: cooperationsData } = await supabase
        .from('cooperations')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      setCooperations(cooperationsData || []);

      // Fetch campus announcements (school events)
      const { data: annData, error: annErr } = await supabase
        .from('campus_announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!annErr && annData) {
        setSchoolEvents(annData);
      } else {
        setSchoolEvents([]);
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

  const handleMarkAsNotified = async (notificationId: string) => {
    // Optimistic UI update
    setCrisisNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, status: 'READ', notified_at: new Date().toISOString() } : n)
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'READ' })
        .eq('id', notificationId);
    } catch (err: any) {
      console.error('Error marking notification as notified:', err);
    }
  };

  const handleArchiveCrisisTicket = async (notificationId: string) => {
    // Optimistic UI update
    setCrisisNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, status: 'ARCHIVED' } : n)
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'ARCHIVED' })
        .eq('id', notificationId);
    } catch (err: any) {
      console.error('Error archiving crisis ticket:', err);
    }
  };

  const handleEndSickOnBehalf = async (teacherId: string, teacherName: string) => {
    try {
      const confirmOk = window.confirm(`Möchten Sie ${teacherName} wirklich gesund melden? Alle betroffenen zukünftigen Stunden werden reaktiviert.`);
      if (!confirmOk) return;

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', teacherId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Lehrerprofil nicht gefunden.');
      }

      // 1. Clear user sick columns
      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          sick_until: null,
          sick_start: null
        })
        .eq('id', teacherId);

      if (userErr) throw userErr;

      // 2. Fetch weekly schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', teacherId);

      if (schedError) throw schedError;

      // 3. Fetch occurrences
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('*')
        .eq('teacher_id', teacherId);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + 30); // 30 days window

      const currentDate = new Date(todayStart);
      const scheduleIdsToRestore = new Set<string>();
      const datesToDeleteNotifs: string[] = [];

      while (currentDate <= maxDate) {
        const rawDay = currentDate.getDay();
        const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
        const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

        daySchedules.forEach(sched => {
          const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
          const startDateTime = new Date(currentDate);
          startDateTime.setHours(hours, minutes, 0, 0);

          if (startDateTime >= now) {
            scheduleIdsToRestore.add(sched.id);
            datesToDeleteNotifs.push(startDateTime.toISOString());
          }
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const occurrenceIdsToRestore = new Set<string>();
      (occurrences || []).forEach(occ => {
        const startDateTime = new Date(`${occ.date}T${occ.start_time}`);
        if (startDateTime >= now) {
          occurrenceIdsToRestore.add(occ.id);
          datesToDeleteNotifs.push(startDateTime.toISOString());
        }
      });

      // Restore schedules
      if (scheduleIdsToRestore.size > 0) {
        await supabase
          .from('schedules')
          .update({ status: 'approved' })
          .in('id', Array.from(scheduleIdsToRestore))
          .eq('status', 'canceled_by_teacher_sick');
      }

      // Restore occurrences
      if (occurrenceIdsToRestore.size > 0) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed' })
          .in('id', Array.from(occurrenceIdsToRestore))
          .eq('status', 'canceled_by_teacher_sick');
      }

      // Delete future notifications
      if (datesToDeleteNotifs.length > 0) {
        await supabase
          .from('crisis_notifications')
          .delete()
          .eq('teacher_id', teacherId)
          .in('slot_start_datetime', datesToDeleteNotifs);
      }

      // Add healthy alert
      const alertMessage = `🍏 LEHRKRAFT GESUND (Verwaltung): Lehrkraft ${teacherName} wurde durch die Verwaltung wieder gesund gemeldet.`;
      await supabase
        .from('system_alerts')
        .insert({
          school_id: profile.school_id,
          teacher_id: teacherId,
          type: 'Teacher Healthy Alert',
          message: alertMessage,
          resolved: false
        });

      alert('Erfolgreich gesundgemeldet! Zukünftige Stundenplandaten wurden wieder aktiviert.');
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      alert('Fehler bei der Gesundmeldung: ' + err.message);
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
        const pin = generateStarterPin(roleText === 'admin' ? 'admin' : 'teacher', true, true);
        const qrToken = generateSecureQrToken();
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
      const newFavs: string[] = [];
      if (overrideFavRoom1) newFavs.push(overrideFavRoom1);
      if (overrideFavRoom2) newFavs.push(overrideFavRoom2);

      const updates: any = {
        preferred_room_ids: newFavs
      };
      if (newRoleOverride) {
        updates.role = newRoleOverride;
      }
      if (newPasswordOverride) {
        updates.personal_pin = newPasswordOverride;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', selectedTeacherForOverride.id);
        
      if (error) throw error;
      
      alert('Lehrkraft-Details und Favoriten-Räume erfolgreich überschrieben.');
      setSelectedTeacherForOverride(null);
      setNewPasswordOverride('');
      setNewRoleOverride('');
      setOverrideFavRoom1('');
      setOverrideFavRoom2('');
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
      const updateData: any = { has_campus_subscription: newValue };
      if (newValue) {
        updateData.campus_activated_this_month = true;
        setCampusActivatedThisMonth(true);
      }
      const { error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setHasCampusSub(!newValue);
    }
  };

  const handleToggleGroovelabSub = async (newValue: boolean) => {
    try {
      setHasGroovelabSub(newValue);
      const updateData: any = { has_groovelab_subscription: newValue };
      if (newValue) {
        updateData.groovelab_activated_this_month = true;
        setGroovelabActivatedThisMonth(true);
      }
      const { error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setHasGroovelabSub(!newValue);
    }
  };

  const handleUpdateStudentBillingOption = async (option: string) => {
    try {
      setStudentBillingOption(option);
      const { error } = await supabase
        .from('schools')
        .update({ student_billing_option: option })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating student billing option:', err);
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

  const handleSaveBrandingAndCalendar = async () => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          name: schoolName,
          primary_color: editColor,
          logo_url: logoUrl || null,
          calendar_url: calendarUrl || null
        })
        .eq('id', schoolId);

      if (error) throw error;
      alert('Branding- und Kalendereinstellungen erfolgreich gespeichert! 🎨🔗');
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
        const instrument = parts[3]?.trim() || (teacherFilterInstrument !== 'All' ? teacherFilterInstrument : 'Allgemein');
        const maxStudents = parseInt(parts[4]?.trim()) || 10;
        const pin = generateStarterPin('teacher', false, false);
        const qrToken = generateSecureQrToken();

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
      const pin = generateStarterPin('teacher', false, false);
      const qrToken = generateSecureQrToken();

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: 'teacher',
          first_name: newTeacherFirstName.trim(),
          last_name: newTeacherLastName.trim(),
          email: newTeacherEmail.trim(),
          instrument: newTeacherInstrument.trim() || activeSubjectsList[0] || 'Allgemein',
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
      const pin = generateStarterPin(coachRole, false, true);
      const qrToken = generateSecureQrToken();

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
      const selectedRole = (e.currentTarget as any).elements.employeeRoleSelect?.value || 'admin';
      const pin = generateStarterPin(selectedRole, false, false);
      const qrToken = generateSecureQrToken();

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: selectedRole,
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
      setShowAddEmployeeModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleImportEmployees = async () => {
    if (!employeeCsvText.trim()) return;
    try {
      setEmployeeImportStatus(null);
      const lines = employeeCsvText.split('\n');
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
        const nickname = parts[3]?.trim() || null;
        const role = parts[4]?.trim()?.toLowerCase() === 'admin' ? 'admin' : 'secretary';
        const pin = generateStarterPin(role, false, false);
        const qrToken = generateSecureQrToken();

        const { error } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            role: role,
            first_name: firstName,
            last_name: lastName,
            email: email,
            nickname: nickname,
            ausweis_nummer: pin,
            teacher_qr_token: qrToken,
            is_active: true,
            is_app_user: true,
            is_campus_active: false,
            is_groovelab_active: false
          });

        if (error) {
          console.error("Error inserting employee during import:", error);
          skippedCount++;
        } else {
          successCount++;
        }
      }

      setEmployeeImportStatus({
        success: true,
        message: `Import abgeschlossen: ${successCount} Mitarbeiterprofile angelegt. PINs bereit zur Verteilung.`
      });
      setEmployeeCsvText('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleUpdateEmployeeRole = async (employeeId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', employeeId);
      if (error) throw error;
      alert(`Mitarbeiter-Rolle erfolgreich auf "${newRole === 'admin' ? 'Admin' : 'Verwaltung'}" aktualisiert.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Rolle: ' + err.message);
    }
  };

  const handleCreateStudentCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentFirstName || !newStudentLastName || !newStudentBirthDate) {
      alert('Bitte Vorname, Nachname und Geburtsdatum ausfüllen.');
      return;
    }

    try {
      const teacherId = newStudentTeacherId || null;

      // 1. Call import_student RPC (5-Tabellen anonymisiertes Onboarding)
      const { data: newStudentId, error: insertError } = await supabase.rpc('import_student', {
        first_name: newStudentFirstName,
        last_name: newStudentLastName,
        birth_date: newStudentBirthDate.trim(),
        instrument: newStudentInstrument || 'Allgemein',
        school_id: schoolId,
        teacher_id: teacherId
      });

      if (insertError) throw insertError;

      alert(`Schüler ${newStudentFirstName} ${newStudentLastName} wurde erfolgreich angelegt (Onboarding ausstehend).`);
      
      // Reset form
      setNewStudentFirstName('');
      setNewStudentLastName('');
      setNewStudentBirthDate('');
      setNewStudentNickname('');
      setNewStudentInstrument('');
      setNewStudentDuration(30);
      setNewStudentTeacherId('');
      setShowAddStudentModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Erstellen des Schülers: ' + err.message);
    }
  };

  const handleDeleteStudentCampus = async (studentId: string, name: string) => {
    if (!window.confirm(`Möchtest du den Schüler "${name}" wirklich unwiderruflich löschen?`)) return;
    try {
      // 1. Delete from users table (if the student has completed onboarding)
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId);
      if (userError) throw userError;

      // 2. Delete from students table (cascades to names, activation_days, prefixes, suffixes)
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);
      if (studentError) throw studentError;

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

    if (isAnonymizedImport) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        let parts = trimmed.split(';');
        if (parts.length < 2) {
          parts = trimmed.split(',');
        }

        if (parts.length < 3) {
          failCount++;
          errors.push(`Zeile "${line}": Benötigt mindestens Vorname; Nachname; Geburtsdatum (DD.MM.YYYY).`);
          continue;
        }

        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const birthDate = parts[2]?.trim(); // DD.MM.YYYY
        let instrument = parts[3]?.trim() || 'Allgemein';
        const teacherNamePart = parts[4]?.trim()?.toLowerCase() || '';

        if (!firstName || !lastName || !birthDate) {
          failCount++;
          errors.push(`Zeile "${line}": Fehlende Pflichtfelder (Vorname, Nachname, Geburtsdatum).`);
          continue;
        }

        // Match teacher
        let teacherId: string | null = null;
        if (studentFilterTeacher && studentFilterTeacher !== 'All') {
          const foundSelected = allUniqueTeachers.find(t => t.id === studentFilterTeacher);
          if (foundSelected) {
            teacherId = foundSelected.id;
            if (!parts[3]?.trim()) {
              instrument = foundSelected.instrument || 'Allgemein';
            }
          }
        }

        if (!teacherId && teacherNamePart) {
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
          const { data, error: rpcError } = await supabase.rpc('import_student', {
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate,
            instrument: instrument,
            school_id: schoolId,
            teacher_id: teacherId || null
          });

          if (rpcError) throw rpcError;
          successCount++;
        } catch (err: any) {
          console.error('Import error for line:', line, err);
          errors.push(`Zeile "${line}": ${err.message || err}`);
          failCount++;
        }
      }

      if (errors.length > 0) {
        alert(`Anonymisierter Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt, ${failCount} Fehler.\n\nFehlerdetails:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...weitere Fehler in der Browser-Konsole.' : ''}`);
      } else {
        alert(`Anonymisierter Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt.`);
      }

      setStudentCsvText('');
      setIsStudentCsvExpanded(false);
      setIsAnonymizedImport(true);
      fetchDashboardData();
      return;
    }



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
      let finalInstrument = instrument;

      // If a specific teacher is selected on the sidebar, auto-fill teacher and instrument
      if (studentFilterTeacher && studentFilterTeacher !== 'All') {
        const foundSelected = allUniqueTeachers.find(t => t.id === studentFilterTeacher);
        if (foundSelected) {
          teacherId = foundSelected.id;
          // Auto-inject instrument if not explicitly typed or is default/placeholder
          if (!parts[1]?.trim()) {
            finalInstrument = foundSelected.instrument || 'Allgemein';
          }
        }
      }

      if (!teacherId && teacherNamePart) {
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
            instrument: finalInstrument || 'Allgemein',
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

  const renderSubjectsBoard = () => {
    const filtered = subjects.filter(s => {
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      const query = subjectSearchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || desc.includes(query) || cat.includes(query);
      const matchesCategory = subjectFilterCategory === 'All' || s.category === subjectFilterCategory;

      return matchesSearch && matchesCategory;
    });

    const uniqueCategories = Array.from(new Set(subjects.map(s => s.category || 'Allgemein'))).sort((a, b) => a.localeCompare(b));

    return (
      <div style={{ width: '100%' }}>
        <div className="google-card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px', 
          padding: '24px',
          borderRadius: '24px',
          border: '1.5px solid #cbd5e1',
          background: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={22} style={{ color: '#0f172a' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                Unterrichtsfächer
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsSubjectCsvExpanded(!isSubjectCsvExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: isSubjectCsvExpanded ? '#f1f5f9' : '#ffffff',
                  color: '#475569',
                  border: '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                  fontFamily: 'Urbanist',
                  transition: 'all 0.2s'
                }}
              >
                📄 Sammel-Onboarding (CSV) {isSubjectCsvExpanded ? '▲' : '▼'}
              </button>

              <button
                onClick={() => {
                  setShowAddSubjectModal(true);
                  if (subjectFilterCategory && subjectFilterCategory !== 'All') {
                    setNewSubjectCategory(subjectFilterCategory);
                  }
                }}
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
                ➕ Fach anlegen
              </button>
            </div>
          </div>

          {/* Collapsible CSV Box */}
          {isSubjectCsvExpanded && (
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 800 }}>📄 Sammel-Onboarding (CSV)</h4>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: '1.4' }}>
                Gib eine Liste von Fächern ein (ein Fachname pro Zeile). Bereits vorhandene Fächer werden automatisch übersprungen.
              </p>
              <textarea
                value={subjectCsvText}
                onChange={(e) => setSubjectCsvText(e.target.value)}
                placeholder="z.B.&#10;Gitarre&#10;Klavier&#10;Gesang&#10;Querflöte"
                rows={5}
                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none' }}
              />
              <button
                onClick={handleImportSubjects}
                style={{ background: '#475569', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                📥 Fächer importieren
              </button>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                placeholder="Fach nach Name oder Beschreibung suchen..."
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontFamily: 'Urbanist',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={subjectFilterCategory}
              onChange={(e) => setSubjectFilterCategory(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontFamily: 'Urbanist',
                fontWeight: 600,
                outline: 'none',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="All">Alle Kategorien ({subjects.length})</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat} ({subjects.filter(s => s.category === cat).length})</option>
              ))}
            </select>
          </div>

          {/* Subjects List Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowX: 'auto', width: '100%' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📖</span>
                Keine Fächer gefunden. Lege ein neues Fach an oder ändere die Suchkriterien.
              </div>
            ) : (
              filtered.map(s => {
                const { avatarBg, avatarColor } = getAlphabeticalColor(s.name);

                return (
                  <div 
                    key={s.id} 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                      background: '#ffffff',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                      transition: 'all 0.25s ease',
                      minWidth: '850px'
                    }}
                    className="hover-scale"
                  >
                    {/* Icon & Title / Description */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '2', minWidth: '220px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: avatarBg,
                        color: avatarColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 900,
                        fontFamily: 'Urbanist',
                        flexShrink: 0
                      }}>
                        {s.name.trim().charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.name}
                        </span>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <div style={{ flex: '0.5', minWidth: '60px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDeleteSubject(s.id, s.name)}
                        style={{
                          padding: '6px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>



        {/* Modal: Add Subject */}
        {showAddSubjectModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
              {/* Modal Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  ➕ Neues Unterrichtsfach anlegen
                </h3>
                <button 
                  onClick={() => setShowAddSubjectModal(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateSubject} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Name des Fachs *</label>
                  <input 
                    type="text" 
                    required
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="z.B. Blockflöte"
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Beschreibung (optional)</label>
                  <textarea 
                    value={newSubjectDescription}
                    onChange={(e) => setNewSubjectDescription(e.target.value)}
                    placeholder="Optionale Beschreibung des Unterrichtsfachs..."
                    rows={3}
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Kategorie *</label>
                  <select
                    value={newSubjectCategory}
                    onChange={(e) => setNewSubjectCategory(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                  >
                    <option value="Allgemein">Allgemein</option>
                    <option value="Saiteninstrumente">Saiteninstrumente</option>
                    <option value="Tasteninstrumente">Tasteninstrumente</option>
                    <option value="Schlagwerk">Schlagwerk</option>
                    <option value="Blasinstrumente">Blasinstrumente</option>
                    <option value="Gesang">Gesang</option>
                    <option value="Theorie & Ensemble">Theorie & Ensemble</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 10px rgba(52,168,83,0.15)' }}
                >
                  Fach anlegen
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCooperationsBoard = () => {
    const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    const filtered = cooperations.filter(c => {
      const name = (c.name || '').toLowerCase();
      const contact = (c.contact_person || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const query = cooperationSearchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || contact.includes(query) || email.includes(query);
      const matchesStatus = cooperationFilterStatus === 'All' || c.status === cooperationFilterStatus;
      const matchesSubject = cooperationFilterSubject === 'All' || (c.subject || 'Allgemein') === cooperationFilterSubject;
      const matchesTeacher = cooperationFilterTeacher === 'All' || 
        (cooperationFilterTeacher === 'none' ? !c.teacher_id : c.teacher_id === cooperationFilterTeacher);

      return matchesSearch && matchesStatus && matchesSubject && matchesTeacher;
    }).sort((a: any, b: any) => {
      const nameA = (a.name || '').toLowerCase().trim();
      const nameB = (b.name || '').toLowerCase().trim();
      return nameA.localeCompare(nameB, 'de');
    });

    // Pagination calculation
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / cooperationPageSize) || 1;
    const safeCurrentPage = Math.min(cooperationCurrentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * cooperationPageSize;
    const paginatedCooperations = filtered.slice(startIndex, startIndex + cooperationPageSize);

    const totalCoops = cooperations.length;
    const activeCoopsCount = cooperations.filter(c => c.status === 'active').length;
    const pendingCoopsCount = cooperations.filter(c => c.status === 'pending').length;

    const uniqueCoopSubjects = Array.from(new Set(cooperations.map(c => c.subject || 'Allgemein'))).sort((a, b) => a.localeCompare(b));

    const getAvatarGradient = (name: string) => getAlphabeticalColor(name).avatarBg;
    const getAvatarTextColor = (name: string) => getAlphabeticalColor(name).avatarColor;

    return (
      <div style={{ width: '100%' }}>
        <div className="google-card" style={{ 
          width: '100%',
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
                Kooperationen
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setIsCooperationCsvExpanded(!isCooperationCsvExpanded)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  borderRadius: '12px', 
                  padding: '8px 16px', 
                  fontSize: '0.8rem', 
                  fontWeight: 800,
                  background: isCooperationCsvExpanded ? '#f1f5f9' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontFamily: 'Urbanist',
                  transition: 'all 0.2s'
                }}
              >
                📄 Sammel-Onboarding (CSV) {isCooperationCsvExpanded ? '▲' : '▼'}
              </button>

              <button
                onClick={() => setShowAddCooperationModal(true)}
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
                ➕ Kooperation anlegen
              </button>
            </div>
          </div>

          {/* CSV BOX */}
          {isCooperationCsvExpanded && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                  Sammel-Onboarding (Kooperationen)
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                  Format pro Zeile: <code>Kooperationsname; Ansprechpartner; E-Mail (optional); Telefon (optional); Fach (optional); Status (optional)</code>
                </span>
              </div>

              {cooperationFilterTeacher && cooperationFilterTeacher !== 'All' && (() => {
                const selectedT = allUniqueTeachers.find(t => t.id === cooperationFilterTeacher);
                if (!selectedT) return null;
                const teacherName = `${selectedT.firstName || selectedT.first_name || ''} ${selectedT.lastName || selectedT.last_name || ''}`.trim();
                const tInitials = `${selectedT.firstName?.[0] || selectedT.first_name?.[0] || ''}${selectedT.lastName?.[0] || selectedT.last_name?.[0] || ''}`.toUpperCase() || 'D';
                const tAvatarBg = getAvatarGradient(teacherName);
                const tAvatarColor = getAvatarTextColor(teacherName);

                return (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.03)',
                    border: '1.5px solid rgba(34, 197, 94, 0.12)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '2px',
                    marginBottom: '2px',
                    flexWrap: 'wrap',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                      <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                        ⚡ Smart Auto-Zuweisung:
                      </span>
                      
                      {/* Teacher Pill */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        padding: '4px 10px 4px 6px',
                        borderRadius: '100px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: tAvatarBg,
                          color: tAvatarColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          fontFamily: 'Urbanist'
                        }}>
                          {tInitials}
                        </div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          {teacherName}
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Kooperationslehrer
                        </span>
                      </div>
                    </div>
                    
                    <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 900, background: '#d1fae5', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                      Lehrer wird automatisch zugewiesen!
                    </span>
                  </div>
                );
              })()}

              <textarea
                value={cooperationCsvText}
                onChange={(e) => setCooperationCsvText(e.target.value)}
                placeholder={
                  cooperationFilterTeacher && cooperationFilterTeacher !== 'All'
                    ? "Schubert-Gymnasium; Herr Weber; weber@schubert.de; 0172-12345; Bläserklasse"
                    : "Schubert-Gymnasium; Herr Weber; weber@schubert.de; 0172-12345; Bläserklasse; active\nMozart-Grundschule; Frau Becker; info@mozart.de; ; Cajon-Klasse; pending"
                }
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
                onClick={handleImportCooperations}
                className="google-btn-primary"
                style={{ background: '#34a853', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start', cursor: 'pointer' }}
              >
                Kooperationen importieren
              </button>
            </div>
          )}

          {/* KPI ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.62rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Kooperationen Gesamt</span>
              <strong style={{ fontSize: '1.4rem', color: '#1e3a8a', fontWeight: 900, fontFamily: 'Urbanist' }}>{totalCoops}</strong>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.62rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Aktiv</span>
              <strong style={{ fontSize: '1.4rem', color: '#14532d', fontWeight: 900, fontFamily: 'Urbanist' }}>{activeCoopsCount}</strong>
            </div>
            <div style={{ background: '#feefe3', border: '1px solid #fed7aa', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.62rem', color: '#854d0e', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Ausstehend</span>
              <strong style={{ fontSize: '1.4rem', color: '#713f12', fontWeight: 900, fontFamily: 'Urbanist' }}>{pendingCoopsCount}</strong>
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
                placeholder="Kooperation suchen..." 
                value={cooperationSearchQuery}
                onChange={(e) => {
                  setCooperationSearchQuery(e.target.value);
                  setCooperationCurrentPage(1);
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
                value={cooperationFilterSubject}
                onChange={(e) => {
                  setCooperationFilterSubject(e.target.value);
                  setCooperationCurrentPage(1);
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
              >
                <option value="All">🎺 Alle Unterrichtsfächer</option>
                {uniqueCoopSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '130px' }}>
              <select 
                value={cooperationFilterTeacher}
                onChange={(e) => {
                  setCooperationFilterTeacher(e.target.value);
                  setCooperationCurrentPage(1);
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
              >
                <option value="All">👥 Alle Lehrer</option>
                <option value="none">⬜ Allgemein (kein Lehrer)</option>
                {allUniqueTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.lastName || t.last_name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '130px' }}>
              <select
                value={cooperationFilterStatus}
                onChange={(e) => {
                  setCooperationFilterStatus(e.target.value);
                  setCooperationCurrentPage(1);
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
              >
                <option value="All">⚡ Alle Statuspartner</option>
                <option value="active">🟢 Aktiv</option>
                <option value="pending">🟡 Ausstehend</option>
                <option value="inactive">⚪ Inaktiv</option>
              </select>
            </div>
          </div>

          {/* LIST ROW VIEW CONTAINER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto', overflowY: 'scroll', maxHeight: '550px', paddingRight: '6px', width: '100%' }}>
            {paginatedCooperations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.88rem', fontWeight: 700, minWidth: '850px' }}>
                Keine Kooperationen mit diesen Filtereinstellungen gefunden.
              </div>
            ) : (
              paginatedCooperations.map((c: any) => {
                return (
                  <div 
                    key={c.id} 
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("cooperationId", c.id);
                    }}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '10px 16px',
                      borderRadius: '16px',
                      background: '#ffffff',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                      minWidth: '850px',
                      transition: 'all 0.25s ease',
                      cursor: 'grab'
                    }}
                    className="hover-scale"
                  >
                    {/* Avatar & Name */}
                    <div 
                      style={{ 
                        flex: '1.6', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '14px', 
                        minWidth: '180px'
                      }}
                    >
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: getAvatarGradient(c.name || 'Kooperation'),
                        color: getAvatarTextColor(c.name || 'Kooperation'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {c.name ? c.name.trim().substring(0, 2).toUpperCase() : 'KO'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span 
                          style={{ 
                            fontSize: '0.92rem', 
                            fontWeight: 800, 
                            color: '#1d1d1f', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis'
                          }}
                        >
                          🏫 {c.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#86868b', marginTop: '2px' }}>
                          {c.contact_person && (
                            <span>👤 {c.contact_person}</span>
                          )}
                          {c.phone && (
                            <span>📞 {c.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subject Select */}
                    <div style={{ flex: '1.2', minWidth: '130px' }}>
                      <select
                        value={c.subject || ''}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('cooperations')
                            .update({ subject: e.target.value || null })
                            .eq('id', c.id);
                          if (error) alert(error.message);
                          else fetchDashboardData();
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '7px 12px', 
                          borderRadius: '10px', 
                          fontSize: '0.78rem', 
                          fontWeight: 700, 
                          color: '#1d1d1f',
                          background: '#f5f5f7',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">📯 Unterrichtsfach wählen</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Teacher Select */}
                    <div style={{ flex: '1.25', minWidth: '120px' }}>
                      <select
                        value={c.teacher_id || ''}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('cooperations')
                            .update({ teacher_id: e.target.value || null })
                            .eq('id', c.id);
                          if (error) alert(error.message);
                          else fetchDashboardData();
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '7px 12px', 
                          borderRadius: '10px', 
                          fontSize: '0.78rem', 
                          fontWeight: 700, 
                          color: '#1d1d1f',
                          background: '#f5f5f7',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">👥 Zuweisen...</option>
                        {allUniqueTeachers.map(t => (
                          <option key={t.id} value={t.id}>{t.firstName || t.first_name} {t.lastName || t.last_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Badge Select */}
                    <div style={{ flex: '0.8', minWidth: '80px' }}>
                      <select
                        value={c.status || 'active'}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const { error } = await supabase
                            .from('cooperations')
                            .update({ 
                              status: newStatus,
                              is_active: newStatus === 'active'
                            })
                            .eq('id', c.id);
                          if (error) alert(error.message);
                          else fetchDashboardData();
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '6px 8px', 
                          borderRadius: '10px', 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          color: c.status === 'active' ? '#137333' : c.status === 'pending' ? '#b45309' : '#86868b',
                          background: c.status === 'active' ? '#e2f6ea' : c.status === 'pending' ? '#fffbeb' : '#f5f5f7',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <option value="active">🟢 Aktiv</option>
                        <option value="pending">🟡 Ausstehend</option>
                        <option value="inactive">⚪ Inaktiv</option>
                      </select>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0.5', minWidth: '90px', justifyContent: 'flex-end' }}>
                      {c.email && (
                        <a 
                          href={`mailto:${c.email}`} 
                          style={{
                            padding: '6px',
                            borderRadius: '10px',
                            background: '#f5f5f7',
                            color: '#1d1d1f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none'
                          }}
                          title="E-Mail senden"
                        >
                          ✉️
                        </a>
                      )}
                      
                      <button
                        onClick={() => handleDeleteCooperation(c.id, c.name)}
                        style={{
                          padding: '6px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Kooperation löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION FOOTER */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650 }}>
              Zeige {startIndex + 1} bis {Math.min(startIndex + cooperationPageSize, totalCount)} von {totalCount} Partnern
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={safeCurrentPage === 1}
                onClick={() => setCooperationCurrentPage(safeCurrentPage - 1)}
                style={{
                  border: '1.5px solid #cbd5e1',
                  background: 'white',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage === 1 ? 0.5 : 1,
                  fontFamily: 'Urbanist'
                }}
              >
                &larr; Zurück
              </button>

              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  const isCurrent = pNum === safeCurrentPage;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCooperationCurrentPage(pNum)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        background: isCurrent ? '#34a853' : 'transparent',
                        color: isCurrent ? '#ffffff' : '#64748b',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontFamily: 'Urbanist'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCooperationCurrentPage(safeCurrentPage + 1)}
                style={{
                  border: '1.5px solid #cbd5e1',
                  background: 'white',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                  fontFamily: 'Urbanist'
                }}
              >
                Weiter &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Add Cooperation */}
        {showAddCooperationModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
              {/* Modal Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  ➕ Neue Kooperation anlegen
                </h3>
                <button 
                  onClick={() => setShowAddCooperationModal(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateCooperation} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Name des Kooperationspartners *</label>
                  <input 
                    type="text" 
                    required
                    value={newCooperationName}
                    onChange={(e) => setNewCooperationName(e.target.value)}
                    placeholder="z.B. Grundschule Bad Säckingen"
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Ansprechpartner (optional)</label>
                  <input 
                    type="text" 
                    value={newCooperationContactPerson}
                    onChange={(e) => setNewCooperationContactPerson(e.target.value)}
                    placeholder="z.B. Frau Müller"
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>E-Mail (optional)</label>
                    <input 
                      type="email" 
                      value={newCooperationEmail}
                      onChange={(e) => setNewCooperationEmail(e.target.value)}
                      placeholder="kontakt@schule.de"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Telefon (optional)</label>
                    <input 
                      type="text" 
                      value={newCooperationPhone}
                      onChange={(e) => setNewCooperationPhone(e.target.value)}
                      placeholder="07761 / 12345"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Unterrichtsfach</label>
                    <select
                      value={newCooperationSubject}
                      onChange={(e) => setNewCooperationSubject(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    >
                      <option value="">📯 Fach wählen...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Lehrkraft</label>
                    <select
                      value={newCooperationTeacherId}
                      onChange={(e) => setNewCooperationTeacherId(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    >
                      <option value="">👥 Lehrkraft zuweisen...</option>
                      {allUniqueTeachers.map(t => (
                        <option key={t.id} value={t.id}>{t.firstName || t.first_name} {t.lastName || t.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Status *</label>
                  <select
                    value={newCooperationStatus}
                    onChange={(e) => setNewCooperationStatus(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                  >
                    <option value="active">Aktiv</option>
                    <option value="pending">Ausstehend</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 10px rgba(52,168,83,0.15)' }}
                >
                  Kooperation anlegen
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCompactStudentBoard = () => {
    const isBadSaeckingen = schoolName.toLowerCase().includes('bad säckingen') || 
                            schoolName.toLowerCase().includes('bad saeckingen') || 
                            schoolName.toLowerCase().includes('bad sackingen') || 
                            schoolName.toLowerCase().includes('musäk');

    // Show all students belonging to the school
    const campusStudentsOnly = students.filter((s: any) => {
      return isBadSaeckingen;
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
      const matchesTeacher = studentFilterTeacher === 'All' || 
        (studentFilterTeacher === 'none' ? !s.teacher_id : s.teacher_id === studentFilterTeacher);
      
      let matchesStatus = true;
      if (studentFilterStatus === 'campus') matchesStatus = s.is_campus_active;
      else if (studentFilterStatus === 'groovelab') matchesStatus = s.is_groovelab_active;
      else if (studentFilterStatus === 'inactive') matchesStatus = !s.is_campus_active && !s.is_groovelab_active;

      return matchesSearch && matchesInstrument && matchesTeacher && matchesStatus;
    }).sort((a: any, b: any) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase().trim();
      return nameA.localeCompare(nameB, 'de');
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

    // Helper for beautiful pastel background based on student name (A-Z alphabetical color)
    const getAvatarGradient = (name: string) => getAlphabeticalColor(name).avatarBg;
    const getAvatarTextColor = (name: string) => getAlphabeticalColor(name).avatarColor;

    return (
      <>
        <div className="google-card" style={{ 
          width: '100%',
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                    Sammel-Onboarding (Schüler)
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                    Format pro Zeile: <code>Vorname Nachname; Instrument; E-Mail (optional)</code>
                  </span>
                </div>

                {studentFilterTeacher && studentFilterTeacher !== 'All' && (() => {
                  const selectedT = allUniqueTeachers.find(t => t.id === studentFilterTeacher);
                  if (!selectedT) return null;
                  const teacherName = `${selectedT.firstName || selectedT.first_name || ''} ${selectedT.lastName || selectedT.last_name || ''}`.trim();
                  const instName = selectedT.instrument || 'Gitarre';
                  const tInitials = `${selectedT.firstName?.[0] || selectedT.first_name?.[0] || ''}${selectedT.lastName?.[0] || selectedT.last_name?.[0] || ''}`.toUpperCase() || 'D';
                  const tAvatarBg = getAvatarGradient(teacherName);
                  const tAvatarColor = getAvatarTextColor(teacherName);
                  
                  // Seed HSL color for the instrument avatar
                  const hash = instName.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
                  const hue = (hash * 43) % 360;
                  const instAvatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 86%) 100%)`;
                  const instAvatarColor = `hsl(${hue}, 90%, 25%)`;

                  return (
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.03)',
                      border: '1.5px solid rgba(34, 197, 94, 0.12)',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginTop: '2px',
                      marginBottom: '2px',
                      flexWrap: 'wrap',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                        <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                          ⚡ Smart Auto-Zuweisung:
                        </span>
                        
                        {/* Teacher Pill */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          padding: '4px 10px 4px 6px',
                          borderRadius: '100px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: tAvatarBg,
                            color: tAvatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            fontFamily: 'Urbanist'
                          }}>
                            {tInitials}
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            {teacherName}
                          </span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Lehrer
                          </span>
                        </div>

                        {/* Arrow */}
                        <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 900 }}>&rarr;</span>

                        {/* Instrument Pill */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          padding: '4px 10px 4px 6px',
                          borderRadius: '100px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: instAvatarBg,
                            color: instAvatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            fontFamily: 'Urbanist'
                          }}>
                            {instName[0]?.toUpperCase() || 'I'}
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            {instName}
                          </span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Instrument
                          </span>
                        </div>
                      </div>
                      
                      <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 900, background: '#d1fae5', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                        Nur Name nötig!
                      </span>
                    </div>
                  );
                })()}
                <textarea
                  value={studentCsvText}
                  onChange={(e) => setStudentCsvText(e.target.value)}
                  placeholder="Vorname; Nachname; Geburtsdatum (DD.MM.YYYY); Instrument; [Optional Lehrkraft Name]&#10;Max; Mustermann; 15.08.2012; E-Gitarre; Becker"
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
              <div 
                onClick={() => {
                  const onboardingUrl = `${window.location.origin}/?onboarding=parent`;
                  navigator.clipboard.writeText(onboardingUrl);
                  setCopiedStudentId('general-onboarding');
                  setTimeout(() => setCopiedStudentId(null), 2000);
                }}
                style={{ 
                  background: copiedStudentId === 'general-onboarding' ? '#e2f6ea' : '#f8fafc', 
                  border: copiedStudentId === 'general-onboarding' ? '1px solid #a7f3d0' : '1px solid #cbd5e1', 
                  padding: '10px 14px', 
                  borderRadius: '14px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '2px',
                  cursor: 'pointer',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale-mini"
                title="Klicke, um den allgemeinen Eltern-Onboarding Link zu kopieren"
              >
                <span style={{ fontSize: '0.62rem', color: copiedStudentId === 'general-onboarding' ? '#137333' : '#475569', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {copiedStudentId === 'general-onboarding' ? <Check size={10} /> : <LinkIcon size={10} />}
                  Onboarding Link
                </span>
                <span style={{ fontSize: '0.8rem', color: copiedStudentId === 'general-onboarding' ? '#137333' : '#0f172a', fontWeight: 800, fontFamily: 'Urbanist' }}>
                  {copiedStudentId === 'general-onboarding' ? '✓ Kopiert' : 'Link kopieren'}
                </span>
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
                  <option value="All">♫ Alle Instrumente</option>
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
                  <option value="All">👥 Alle Lehrer</option>
                  <option value="none">⬜ Allgemein (kein Lehrer)</option>
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
                  <option value="all">☇ Alle Tarife</option>
                  <option value="campus">🎓 Campus Aktiv</option>
                  <option value="groovelab">🎸 GrooveLab Aktiv</option>
                  <option value="inactive">⚪ Inaktiv</option>
                </select>
              </div>
            </div>

            {/* LIST ROW VIEW CONTAINER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto', overflowY: 'scroll', maxHeight: '550px', paddingRight: '6px', width: '100%' }}>
              {paginatedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.88rem', fontWeight: 700, minWidth: '850px' }}>
                  Keine Schüler mit diesen Filtereinstellungen gefunden.
                </div>
              ) : (
                paginatedStudents.map((student: any) => {
                  return (
                    <div 
                      key={student.id} 
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("studentId", student.id);
                      }}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '10px 16px',
                        borderRadius: '16px',
                        background: '#ffffff',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                        minWidth: '850px',
                        transition: 'all 0.25s ease',
                        cursor: 'grab'
                      }}
                      className="hover-scale"
                    >
                      {/* Avatar & Name */}
                      <div 
                        onClick={() => setSelectedStudentForDetail(student)}
                        style={{ 
                          flex: '1.6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '14px', 
                          minWidth: '180px',
                          cursor: 'pointer'
                        }}
                        className="student-name-hover"
                      >
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: getAvatarGradient(`${student.first_name || ''} ${student.last_name || ''}`),
                          color: getAvatarTextColor(`${student.first_name || ''} ${student.last_name || ''}`),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span 
                            style={{ 
                              fontSize: '0.92rem', 
                              fontWeight: 800, 
                              color: '#1d1d1f', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              transition: 'color 0.15s ease'
                            }}
                            className="student-title-text"
                          >
                            {student.first_name} {student.last_name}
                          </span>
                          {student.nickname && (
                            <span style={{ fontSize: '0.72rem', color: '#86868b', fontStyle: 'italic', marginTop: '1px' }}>
                              „{student.nickname}“
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Instrument Badge */}
                      <div style={{ flex: '1', minWidth: '100px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '6px 12px', 
                          borderRadius: '10px', 
                          background: '#f5f5f7', 
                          color: '#3a3a3c', 
                          fontSize: '0.78rem', 
                          fontWeight: 700,
                          textAlign: 'center',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          {student.instrument || 'Allgemein'}
                        </span>
                      </div>

                      {/* Teacher Select */}
                      <div style={{ flex: '1.25', minWidth: '120px' }}>
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
                            padding: '7px 12px', 
                            borderRadius: '10px', 
                            fontSize: '0.78rem', 
                            fontWeight: 700, 
                            color: '#1d1d1f',
                            background: '#f5f5f7',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none'
                          }}
                        >
                          <option value="">Allgemein</option>
                          {allUniqueTeachers.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.lastName || t.last_name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration Select */}
                      <div style={{ flex: '0.75', minWidth: '70px' }}>
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
                            padding: '7px 12px', 
                            borderRadius: '10px', 
                            fontSize: '0.78rem', 
                            fontWeight: 700, 
                            color: '#1d1d1f',
                            background: '#f5f5f7',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none'
                          }}
                        >
                          <option value={30}>30 Min</option>
                          <option value={45}>45 Min</option>
                          <option value={60}>60 Min</option>
                          <option value={90}>90 Min</option>
                        </select>
                      </div>

                      {/* Micro status toggles */}
                      <div style={{ flex: '1.5', display: 'flex', gap: '6px', minWidth: '150px' }}>
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
                            padding: '7px 10px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: student.is_campus_active ? '#e2f6ea' : '#f5f5f7',
                            color: student.is_campus_active ? '#137333' : '#86868b',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                          className="hover-scale-mini"
                        >
                          Campus
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
                            padding: '7px 10px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: student.is_groovelab_active ? '#fef3c7' : '#f5f5f7',
                            color: student.is_groovelab_active ? '#b45309' : '#86868b',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                          className="hover-scale-mini"
                        >
                          Groovelab
                        </button>
                      </div>

                      {/* Access / Copy Shareable Campus Pass Link */}
                      <div style={{ flex: '1.2', minWidth: '130px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        {student.is_app_user && (
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 700, 
                            color: '#515154',
                            background: '#f5f5f7',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontFamily: 'monospace'
                          }}>
                            PIN: {student.ausweis_nummer || 'Keine'}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: (student.is_campus_active || student.is_groovelab_active) ? '#166534' : '#64748b',
                          background: (student.is_campus_active || student.is_groovelab_active) ? '#dcfce7' : '#f1f5f9',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: `1px solid ${(student.is_campus_active || student.is_groovelab_active) ? '#bbf7d0' : '#cbd5e1'}`
                        }}>
                          {(student.is_campus_active || student.is_groovelab_active) ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          background: '#e2e8f0',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1'
                        }}>
                          Tag: {student.day_of_birth || '1'}
                        </span>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteStudentCampus(student.id, `${student.first_name} ${student.last_name}`)}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#ea4335', 
                            fontSize: '0.9rem', 
                            fontWeight: 800, 
                            cursor: 'pointer', 
                            padding: '2px 6px',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            transition: 'transform 0.15s' 
                          }}
                          className="hover-scale-mini"
                          title="Schüler unwiderruflich löschen"
                        >
                          <Trash2 size={16} />
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Geburtsdatum * (Format: DD.MM.YYYY)</label>
                  <input 
                    type="text" 
                    required
                    value={newStudentBirthDate}
                    onChange={(e) => setNewStudentBirthDate(e.target.value)}
                    placeholder="z.B. 15.08.2012"
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
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
                      <option value="">Allgemein</option>
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

  // Drag and Drop Helpers
  const handleUpdateTeacherInstrument = async (teacherId: string, newInstrument: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ instrument: newInstrument })
        .eq('id', teacherId);
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Zuweisen des Unterrichtsfachs: " + err.message);
    }
  };

  const handleUpdateStudentTeacher = async (studentId: string, teacherId: string | null) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ teacher_id: teacherId })
        .eq('id', studentId);
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Zuweisen der Lehrkraft: " + err.message);
    }
  };

  const handleUpdateCooperationStatus = async (cooperationId: string, newStatus: string) => {
    try {
      const isActive = newStatus === 'active';
      const { error } = await supabase
        .from('cooperations')
        .update({ status: newStatus, is_active: isActive })
        .eq('id', cooperationId);
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Zuweisen des Kooperationsstatus: " + err.message);
    }
  };

  // Subjects Board Handlers
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      // Case-insensitive duplicate check
      const dup = subjects.find(s => s.name.toLowerCase().trim() === newSubjectName.toLowerCase().trim());
      if (dup) {
        alert(`Das Fach "${newSubjectName}" existiert bereits.`);
        return;
      }

      const { error } = await supabase
        .from('subjects')
        .insert({
          school_id: schoolId,
          name: newSubjectName.trim(),
          description: newSubjectDescription.trim() || null,
          category: newSubjectCategory || 'Allgemein'
        });

      if (error) throw error;

      alert(`Fach "${newSubjectName}" wurde erfolgreich angelegt.`);
      setNewSubjectName('');
      setNewSubjectDescription('');
      setNewSubjectCategory('Allgemein');
      setShowAddSubjectModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Anlegen des Fachs: ' + err.message);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`Möchtest du das Fach "${name}" wirklich unwiderruflich löschen?`)) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert(`Fach "${name}" wurde gelöscht.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Löschen des Fachs: ' + err.message);
    }
  };

  const handleToggleSubjectActive = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: !currentVal })
        .eq('id', id);
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleImportSubjects = async () => {
    if (!subjectCsvText.trim()) {
      alert("Bitte gib CSV-Daten ein.");
      return;
    }

    const lines = subjectCsvText.split('\n');
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Case-insensitive duplicate check against currently loaded subjects
      const isDuplicate = subjects.some(s => s.name.toLowerCase().trim() === trimmed.toLowerCase());
      if (isDuplicate) {
        errors.push(`Fach "${trimmed}" existiert bereits (Übersprungen).`);
        failCount++;
        continue;
      }

      try {
        const { error } = await supabase
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: trimmed,
            description: null,
            category: 'Allgemein'
          });

        if (error) throw error;
        successCount++;
      } catch (err: any) {
        console.error('Import error for line:', line, err);
        errors.push(`Zeile "${line}": ${err.message || err}`);
        failCount++;
      }
    }

    if (errors.length > 0) {
      alert(`Import abgeschlossen: ${successCount} Fächer erfolgreich angelegt, ${failCount} Übersprungen/Fehler.\n\nDetails:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...weitere Details in der Konsole.' : ''}`);
    } else {
      alert(`Import abgeschlossen: ${successCount} Fächer erfolgreich angelegt.`);
    }

    setSubjectCsvText('');
    setIsSubjectCsvExpanded(false);
    fetchDashboardData();
  };

  // Cooperations Board Handlers
  const handleCreateCooperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCooperationName.trim()) return;

    try {
      const { error } = await supabase
        .from('cooperations')
        .insert({
          school_id: schoolId,
          name: newCooperationName.trim(),
          contact_person: newCooperationContactPerson.trim() || null,
          email: newCooperationEmail.trim() || null,
          phone: newCooperationPhone.trim() || null,
          status: newCooperationStatus || 'active',
          is_active: newCooperationStatus === 'active',
          subject: newCooperationSubject.trim() || null,
          teacher_id: newCooperationTeacherId || null
        });

      if (error) throw error;

      alert(`Kooperation "${newCooperationName}" wurde erfolgreich angelegt.`);
      setNewCooperationName('');
      setNewCooperationContactPerson('');
      setNewCooperationEmail('');
      setNewCooperationPhone('');
      setNewCooperationStatus('active');
      setNewCooperationSubject('');
      setNewCooperationTeacherId('');
      setShowAddCooperationModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Kooperation: ' + err.message);
    }
  };

  const handleImportCooperations = async () => {
    if (!cooperationCsvText.trim()) return;
    try {
      const lines = cooperationCsvText.split('\n');
      let successCount = 0;
      let skippedCount = 0;

      for (let line of lines) {
        line = line.trim();
        if (!line || line.toLowerCase().includes('name')) continue;

        const parts = line.split(/[;,]/);
        if (parts.length < 1) {
          skippedCount++;
          continue;
        }

        const name = parts[0]?.trim();
        if (!name) {
          skippedCount++;
          continue;
        }
        
        const contactPerson = parts[1]?.trim() || null;
        const email = parts[2]?.trim() || null;
        const phone = parts[3]?.trim() || null;
        const status = parts[4]?.trim() || (cooperationFilterStatus !== 'All' ? cooperationFilterStatus : 'active');

        const { error } = await supabase
          .from('cooperations')
          .insert({
            school_id: schoolId,
            name: name,
            contact_person: contactPerson,
            email: email,
            phone: phone,
            status: status,
            is_active: status === 'active'
          });

        if (error) {
          console.error("Error inserting cooperation during import:", error);
          skippedCount++;
        } else {
          successCount++;
        }
      }

      alert(`Import abgeschlossen: ${successCount} Kooperationen angelegt.`);
      setCooperationCsvText('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Import: ' + err.message);
    }
  };

  const handleDeleteCooperation = async (id: string, name: string) => {
    if (!window.confirm(`Möchtest du die Kooperation "${name}" wirklich unwiderruflich löschen?`)) return;
    try {
      const { error } = await supabase
        .from('cooperations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert(`Kooperation "${name}" wurde gelöscht.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Löschen der Kooperation: ' + err.message);
    }
  };

  const handleToggleCooperationActive = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('cooperations')
        .update({ is_active: !currentVal })
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

    const isRoomUnsuitable = (r: any, instrumentName: string) => {
      if (!r || !instrumentName) return false;
      const unsuitable = r.unsuitable_instruments || (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
          return map[r.id] || [];
        } catch { return []; }
      })();
      return unsuitable.some((inst: string) => inst.toLowerCase() === instrumentName.toLowerCase());
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

      // Prioritize Teacher's favorite rooms (Lieblingsräume)
      const allTeachersList = [...campusTeachers, ...bypassTeachers, ...coaches];
      const teacherProfile = allTeachersList.find(t => t.id === plan.teacherId);
      const preferredRooms = teacherProfile?.preferred_room_ids || [];
      if (preferredRooms.length > 0) {
        for (const prId of preferredRooms) {
          const prRoom = rooms.find(r => r.id === prId);
          if (prRoom && !isRoomUnsuitable(prRoom, plan.instrument)) {
            const hasConflict = sortedPlans.some(p => {
              const allocatedRoom = assigned[p.id] || p.roomId;
              return allocatedRoom === prId && p.dayOfWeek === plan.dayOfWeek && isOverlap(p, plan);
            });
            if (!hasConflict) {
              bestRoomId = prId;
              break;
            }
          }
        }
      }

      // Soft Constraint check: prioritize historically assigned rooms for this teacher (must be suitable)
      if (!bestRoomId) {
        const historicalRoomId = teacherHistory[plan.teacherId];
        if (historicalRoomId) {
          const histRoom = rooms.find(r => r.id === historicalRoomId);
          if (histRoom && !isRoomUnsuitable(histRoom, plan.instrument)) {
            const hasConflict = sortedPlans.some(p => {
              const allocatedRoom = assigned[p.id] || p.roomId;
              return allocatedRoom === historicalRoomId && p.dayOfWeek === plan.dayOfWeek && isOverlap(p, plan);
            });
            if (!hasConflict) {
              bestRoomId = historicalRoomId;
            }
          }
        }
      }

      // If no historical match, search candidate rooms first
      if (!bestRoomId) {
        for (const room of candidates) {
          if (isRoomUnsuitable(room, plan.instrument)) continue;
          
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
          if (isRoomUnsuitable(room, plan.instrument)) continue;

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
      localStorage.removeItem(`groovelab_matrix_allocations_draft_${schoolId}`);
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

  // Split points search: scan for pause slots >= 15 mins
  const getSplitPoints = (plan: any) => {
    if (!plan || !plan.slots || plan.slots.length <= 1) return [];
    const points: Array<{ index: number; time: string; duration: number }> = [];
    plan.slots.forEach((slot: any, idx: number) => {
      if (idx > 0 && idx < plan.slots.length - 1) {
        const isBreak = !slot.student_id && !plan.id.startsWith('adhoc_');
        if (isBreak && (slot.duration || 0) >= 15) {
          points.push({ index: idx, time: slot.time_slot, duration: slot.duration });
        }
      }
    });
    return points;
  };

  const handleSplitPlan = (plan: any, splitIdx: number) => {
    const slotsBefore = plan.slots.slice(0, splitIdx);
    const slotsAfter = plan.slots.slice(splitIdx);

    if (slotsBefore.length === 0 || slotsAfter.length === 0) return;

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

    const lastSlot1 = slotsBefore[slotsBefore.length - 1];
    const endTime1 = lastSlot1 ? addMins(lastSlot1.time_slot, lastSlot1.duration || 45) : plan.endTime;
    const firstSlot2 = slotsAfter[0];
    const startTime2 = firstSlot2 ? firstSlot2.time_slot : plan.startTime;

    const plan1 = {
      ...plan,
      id: `${plan.id}_split1`,
      endTime: endTime1,
      slots: slotsBefore
    };

    const plan2 = {
      ...plan,
      id: `${plan.id}_split2`,
      startTime: startTime2,
      slots: slotsAfter
    };

    setMatrixAllocations(prev => {
      const next = [];
      for (const p of prev) {
        if (p.id === plan.id) {
          next.push(plan1, plan2);
        } else {
          next.push(p);
        }
      }
      return next;
    });

    setSelectedDayPlan(null);
    alert(`Unterrichtsblock erfolgreich in 2 Teile aufgeteilt!`);
  };

  const handleMergePlans = (splitPlan: any) => {
    const baseId = splitPlan.id.split('_split')[0];
    const relatedSplits = matrixAllocations.filter(p => p.id.startsWith(baseId + '_split') || p.id === baseId);
    if (relatedSplits.length <= 1) return;

    const sortedSplits = [...relatedSplits].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const mergedSlots: any[] = [];
    const slotIdsSeen = new Set();
    for (const p of sortedSplits) {
      for (const s of p.slots) {
        if (!slotIdsSeen.has(s.id)) {
          slotIdsSeen.add(s.id);
          mergedSlots.push(s);
        }
      }
    }
    mergedSlots.sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));

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

    const startTime = mergedSlots[0]?.time_slot || splitPlan.startTime;
    const lastSlot = mergedSlots[mergedSlots.length - 1];
    const endTime = lastSlot ? addMins(lastSlot.time_slot, lastSlot.duration || 45) : splitPlan.endTime;

    const mergedPlan = {
      ...sortedSplits[0],
      id: baseId,
      startTime,
      endTime,
      slots: mergedSlots,
      roomId: sortedSplits[0].roomId || null
    };

    setMatrixAllocations(prev => {
      const next = [];
      let inserted = false;
      for (const p of prev) {
        if (p.id.startsWith(baseId + '_split') || p.id === baseId) {
          if (!inserted) {
            next.push(mergedPlan);
            inserted = true;
          }
        } else {
          next.push(p);
        }
      }
      return next;
    });

    setSelectedDayPlan(null);
    alert(`Unterrichtsblöcke wieder erfolgreich zusammengefügt!`);
  };

  const getPlanDisplayName = (plan: any) => {
    if (!plan) return '';
    if (plan.id.includes('_split1')) {
      return `${plan.teacherName} (Teil 1)`;
    }
    if (plan.id.includes('_split2')) {
      return `${plan.teacherName} (Teil 2)`;
    }
    return plan.teacherName;
  };

  const handleApproveSingleSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'approved' })
        .eq('id', scheduleId);

      if (error) throw error;
      alert('Stundenplan-Eintrag erfolgreich genehmigt.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error approving schedule slot:', err);
      alert('Fehler: ' + err.message);
    }
  };

  const handleRejectSingleSchedule = async (scheduleId: string) => {
    if (!window.confirm('Möchtest du diesen Stundenplan-Eintrag zur Überarbeitung zurückweisen?')) return;
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'draft' })
        .eq('id', scheduleId);

      if (error) throw error;
      alert('Stundenplan-Eintrag zur Überarbeitung zurückgewiesen.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error rejecting schedule slot:', err);
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

    if (targetRoomId) {
      const room = rooms.find(r => r.id === targetRoomId);
      const plan = matrixAllocations.find(p => p.id === draggedPlanId);
      if (room && plan) {
        const unsuitable = room.unsuitable_instruments || (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            return map[room.id] || [];
          } catch { return []; }
        })();
        if (unsuitable.some((inst: string) => inst.toLowerCase() === plan.instrument?.toLowerCase())) {
          alert(`Zuteilung verweigert: Raum "${room.name}" ist akustisch ungeeignet für das Instrument "${plan.instrument}".`);
          setDraggedPlanId(null);
          setDraggedPlanDay(null);
          return;
        }
      }
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
        // Update local mapping fallback first
        try {
          const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
          mappings[editingRoom.id] = roomFormFloor;
          localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));

          const unsuitable = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
          unsuitable[editingRoom.id] = roomFormUnsuitableInstruments;
          localStorage.setItem(`groovelab_room_unsuitable_mappings_${schoolId}`, JSON.stringify(unsuitable));

          const instruments = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
          instruments[editingRoom.id] = roomFormRoomInstruments;
          localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(instruments));

          const sonstiges = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
          sonstiges[editingRoom.id] = roomFormSonstiges;
          localStorage.setItem(`groovelab_room_sonstiges_mappings_${schoolId}`, JSON.stringify(sonstiges));
        } catch (err) {
          console.error(err);
        }

        // Try updating including floor and new fields
        let { error } = await supabase.from('rooms').update({
          name: roomFormName.trim(),
          allowed_instruments: roomFormEquipment,
          max_teachers: roomFormMaxTeachers,
          max_students: roomFormMaxStudents,
          qm: roomFormQm,
          is_campus_active: roomFormIsCampusActive,
          is_groovelab_active: roomFormIsGroovelabActive,
          floor: roomFormFloor,
          unsuitable_instruments: roomFormUnsuitableInstruments,
          room_instruments: roomFormRoomInstruments,
          sonstiges: roomFormSonstiges
        }).eq('id', editingRoom.id);
        
        // Fallback: If floor column or new properties columns are missing
        if (error && (error.message.includes("floor") || error.message.includes("column") || error.message.includes("unsuitable_instruments") || error.message.includes("room_instruments") || error.message.includes("sonstiges"))) {
          console.warn("Supabase floor/new columns missing, retrying edit save without them...");
          const { error: retryError } = await supabase.from('rooms').update({
            name: roomFormName.trim(),
            allowed_instruments: roomFormEquipment,
            max_teachers: roomFormMaxTeachers,
            max_students: roomFormMaxStudents,
            qm: roomFormQm,
            is_campus_active: roomFormIsCampusActive,
            is_groovelab_active: roomFormIsGroovelabActive
          }).eq('id', editingRoom.id);
          error = retryError;
        }

        if (error) throw error;
 
        setRooms(prev => prev.map(r => r.id === editingRoom.id
          ? { 
              ...r, 
              name: roomFormName.trim(), 
              allowed_instruments: roomFormEquipment, 
              equipment: roomFormEquipment, 
              max_teachers: roomFormMaxTeachers,
              max_students: roomFormMaxStudents,
              qm: roomFormQm,
              is_campus_active: roomFormIsCampusActive,
              is_groovelab_active: roomFormIsGroovelabActive,
              floor: roomFormFloor,
              unsuitable_instruments: roomFormUnsuitableInstruments,
              room_instruments: roomFormRoomInstruments,
              sonstiges: roomFormSonstiges
            }
          : r));
      } else {
        const insertPayload: any = {
          school_id: schoolId,
          name: roomFormName.trim(),
          allowed_instruments: roomFormEquipment,
          max_teachers: roomFormMaxTeachers,
          max_students: roomFormMaxStudents,
          qm: roomFormQm,
          sort_order: rooms.length,
          is_campus_active: roomFormIsCampusActive,
          is_groovelab_active: roomFormIsGroovelabActive,
          floor: roomFormFloor,
          unsuitable_instruments: roomFormUnsuitableInstruments,
          room_instruments: roomFormRoomInstruments,
          sonstiges: roomFormSonstiges
        };

        let { data, error } = await supabase.from('rooms').insert(insertPayload).select().single();
        
        // Fallback: If floor column or new columns are missing
        if (error && (error.message.includes("floor") || error.message.includes("column") || error.message.includes("unsuitable_instruments") || error.message.includes("room_instruments") || error.message.includes("sonstiges"))) {
          console.warn("Supabase floor/new columns missing, retrying insert save without them...");
          const insertPayloadWithoutNewFields = {
            school_id: schoolId,
            name: roomFormName.trim(),
            allowed_instruments: roomFormEquipment,
            max_teachers: roomFormMaxTeachers,
            max_students: roomFormMaxStudents,
            qm: roomFormQm,
            sort_order: rooms.length,
            is_campus_active: roomFormIsCampusActive,
            is_groovelab_active: roomFormIsGroovelabActive
          };
          const { data: retryData, error: retryError } = await supabase.from('rooms').insert(insertPayloadWithoutNewFields).select().single();
          data = retryData;
          error = retryError;
        }

        if (error) throw error;
        if (data) {
          // Update local mapping fallback for the new room ID
          try {
            const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
            mappings[data.id] = roomFormFloor;
            localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));

            const unsuitable = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            unsuitable[data.id] = roomFormUnsuitableInstruments;
            localStorage.setItem(`groovelab_room_unsuitable_mappings_${schoolId}`, JSON.stringify(unsuitable));

            const instruments = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            instruments[data.id] = roomFormRoomInstruments;
            localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(instruments));

            const sonstiges = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
            sonstiges[data.id] = roomFormSonstiges;
            localStorage.setItem(`groovelab_room_sonstiges_mappings_${schoolId}`, JSON.stringify(sonstiges));
          } catch (err) {
            console.error(err);
          }

          setRooms(prev => [...prev, {
            ...data,
            equipment: data.allowed_instruments || [],
            floor: data.floor || roomFormFloor,
            unsuitable_instruments: data.unsuitable_instruments || roomFormUnsuitableInstruments || [],
            room_instruments: data.room_instruments || roomFormRoomInstruments || [],
            sonstiges: data.sonstiges || roomFormSonstiges || ''
          }]);
        }
      }
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormEquipment([]);
      setRoomFormMaxTeachers(1);
      setRoomFormMaxStudents(1);
      setRoomFormQm(0);
      setRoomFormFloor('Allgemein');
      setRoomFormUnsuitableInstruments([]);
      setRoomFormRoomInstruments([]);
      setRoomFormSonstiges('');
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

  const handleBulkRoomImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCsvText.trim() || !schoolId) {
      alert('Bitte geben Sie Raumdaten ein.');
      return;
    }

    setRoomCsvSaving(true);
    const lines = roomCsvText.split('\n');
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Smarte-Auto-Zuweisung: If a floor is active/selected, assign that floor. Otherwise default to 'Allgemein'
    const assignedFloor = roomFilterFloor !== 'All' ? roomFilterFloor : 'Allgemein';
    const insertedRooms: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let parts = trimmed.split(';');
      if (parts.length < 2) {
        parts = trimmed.split(',');
      }

      const roomName = parts[0]?.trim();
      if (!roomName) {
        failCount++;
        errors.push(`Fehlerhafte Zeile: "${trimmed}" (Kein Raumname angegeben)`);
        continue;
      }

      const maxStudents = parseInt(parts[1]?.trim()) || 1;
      const qmSize = parseFloat(parts[2]?.trim()) || 0;

      try {
        const insertPayload: any = {
          school_id: schoolId,
          name: roomName,
          max_students: maxStudents,
          max_teachers: 1,
          allowed_instruments: [],
          qm: qmSize,
          sort_order: rooms.length + successCount,
          is_campus_active: true, // Default to active for Campus
          is_groovelab_active: false, // Default to inactive for GrooveLab
          floor: assignedFloor
        };

        let { data, error } = await supabase.from('rooms').insert(insertPayload).select().single();

        // Fallback: If floor column not found in schema cache, retry without it
        if (error && (error.message.includes("floor") || error.message.includes("column"))) {
          const insertPayloadWithoutFloor = { ...insertPayload };
          delete insertPayloadWithoutFloor.floor;
          const { data: retryData, error: retryError } = await supabase.from('rooms').insert(insertPayloadWithoutFloor).select().single();
          data = retryData;
          error = retryError;
        }

        if (error) throw error;
        if (data) {
          // Update local mapping fallback for the new room ID
          try {
            const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
            mappings[data.id] = assignedFloor;
            localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));
          } catch (err) {
            console.error(err);
          }

          insertedRooms.push({
            ...data,
            equipment: data.allowed_instruments || []
          });
          successCount++;
        }
      } catch (err: any) {
        failCount++;
        errors.push(`Fehler bei "${roomName}": ${err.message}`);
      }
    }

    if (insertedRooms.length > 0) {
      setRooms(prev => [...prev, ...insertedRooms]);
    }

    setRoomCsvText('');
    setIsRoomCsvExpanded(false);
    setRoomCsvSaving(false);

    if (errors.length > 0) {
      alert(`Onboarding abgeschlossen:\n- ${successCount} Räume erfolgreich angelegt\n- ${failCount} Fehler\n\nFehlerdetails:\n${errors.join('\n')}`);
    } else {
      alert(`${successCount} Räume erfolgreich angelegt (Smarte-Auto-Zuweisung an Stockwerk: „${assignedFloor}“).`);
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
      setRoomFormIsCampusActive(room.is_campus_active !== false);
      setRoomFormIsGroovelabActive(!!room.is_groovelab_active);
      setRoomFormFloor(room.floor || 'Allgemein');

      const localUnsuitable = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
          return map[room.id] || [];
        } catch { return []; }
      })();
      const localInstruments = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
          return map[room.id] || [];
        } catch { return []; }
      })();
      const localSonstiges = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
          return map[room.id] || '';
        } catch { return ''; }
      })();

      setRoomFormUnsuitableInstruments(Array.isArray(room.unsuitable_instruments) ? room.unsuitable_instruments : localUnsuitable);
      setRoomFormRoomInstruments(Array.isArray(room.room_instruments) ? room.room_instruments : localInstruments);
      setRoomFormSonstiges(room.sonstiges || localSonstiges || '');
      setNewInstrumentName('');
      setNewInstrumentModel('');
    } else {
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormEquipment([]);
      setRoomFormMaxTeachers(1);
      setRoomFormMaxStudents(1);
      setRoomFormQm(0);
      setRoomFormIsCampusActive(true);
      setRoomFormIsGroovelabActive(false);
      setRoomFormFloor('Allgemein');
      setRoomFormUnsuitableInstruments([]);
      setRoomFormRoomInstruments([]);
      setRoomFormSonstiges('');
      setNewInstrumentName('');
      setNewInstrumentModel('');
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
        const qty = Math.max(1, Math.min(50, equipmentFormQty));
        const inserts = [];
        if (qty === 1) {
          inserts.push({ school_id: schoolId, name: equipmentFormName.trim() });
        } else {
          for (let i = 1; i <= qty; i++) {
            inserts.push({ school_id: schoolId, name: `${equipmentFormName.trim()} #${i}` });
          }
        }

        const { data, error } = await supabase.from('school_equipment').insert(inserts).select();
        if (error) throw error;
        if (data) setSchoolEquipment(prev => [...prev, ...data]);
      }
      setEditingEquipment(null);
      setEquipmentFormName('');
      setEquipmentFormQty(1);
      setTimeout(() => equipmentNameInputRef.current?.focus(), 50);
    } catch (e: any) {
      console.error('Equipment save error:', e);
      alert('Fehler beim Speichern der Ausstattung: ' + e.message);
    } finally {
      setEquipmentSaving(false);
    }
  };

  const handleQtyChange = (newQty: number) => {
    if (newQty < 1) return;
    setEditGroupQty(newQty);
    
    // Adjust editGroupInstancesData
    setEditGroupInstancesData(prev => {
      if (newQty > prev.length) {
        const added = [];
        const base = editGroupName.trim() || 'Instrument';
        const model = editGroupModel.trim() || 'Standard';
        for (let i = prev.length; i < newQty; i++) {
          added.push({
            id: `temp_${Date.now()}_${i}`,
            fullName: `${base} #${i + 1}`,
            baseName: base,
            model,
            linkUrl: editGroupLink.trim(),
            roomId: null,
            roomName: null,
            roomInstIdx: -1
          });
        }
        return [...prev, ...added];
      } else if (newQty < prev.length) {
        return prev.slice(0, newQty);
      }
      return prev;
    });
  };

  const handleSaveEquipmentGroup = async () => {
    if (!schoolId) return;
    setEquipmentSaving(true);
    try {
      // Load global model mapping
      let localModelMap: Record<string, string> = {};
      let localLinkMap: Record<string, string> = {};
      try {
        localModelMap = JSON.parse(localStorage.getItem(`groovelab_instrument_models_${schoolId}`) || '{}');
      } catch {}
      try {
        localLinkMap = JSON.parse(localStorage.getItem(`groovelab_instrument_links_${schoolId}`) || '{}');
      } catch {}

      // 1. Determine deletions
      const originalIds = editingEquipmentGroup.instances.map((i: any) => i.id);
      let idsToDelete: string[] = [];
      if (editGroupCoupled) {
        idsToDelete = originalIds.slice(editGroupQty);
      } else {
        const idsToKeep = editGroupInstancesData.filter(i => !i.id.startsWith('temp_')).map(i => i.id);
        idsToDelete = originalIds.filter((id: string) => !idsToKeep.includes(id));
      }

      // Perform Deletions from DB & State/Rooms
      if (idsToDelete.length > 0) {
        await supabase.from('school_equipment').delete().in('id', idsToDelete);
        for (const delId of idsToDelete) {
          const inst = editingEquipmentGroup.instances.find((i: any) => i.id === delId);
          if (inst && inst.roomId) {
            const targetRoom = rooms.find(r => r.id === inst.roomId);
            if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
              const updatedRoomInsts = targetRoom.room_instruments.filter((_: any, idx: number) => idx !== inst.roomInstIdx);
              setRooms(prev => prev.map(r => r.id === inst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r));
              await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', inst.roomId);
            }
          }
        }
      }

      if (editGroupCoupled) {
        // SCENARIO A: Coupled (all exemplars have the same name and model)
        const newBaseName = editGroupName.trim();
        const newModel = editGroupModel.trim();
        const newLink = editGroupLink.trim();

        for (let idx = 0; idx < editGroupQty; idx++) {
          const newName = editGroupQty > 1 ? `${newBaseName} #${idx + 1}` : newBaseName;

          if (idx < originalIds.length) {
            // Update existing row
            const originalId = originalIds[idx];
            await supabase.from('school_equipment').update({ name: newName }).eq('id', originalId);
            localModelMap[newName] = newModel;
            if (newLink) {
              localLinkMap[newName] = newLink;
            } else {
              delete localLinkMap[newName];
            }

            // Sync with assigned room
            const inst = editingEquipmentGroup.instances.find((i: any) => i.id === originalId);
            if (inst && inst.roomId) {
              const targetRoom = rooms.find(r => r.id === inst.roomId);
              if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
                const updatedRoomInsts = [...targetRoom.room_instruments];
                if (updatedRoomInsts[inst.roomInstIdx]) {
                  updatedRoomInsts[inst.roomInstIdx] = {
                    name: newName,
                    model: newModel
                  };
                }
                setRooms(prev => prev.map(r => r.id === inst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r));
                await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', inst.roomId);
              }
            }
          } else {
            // Insert new row
            await supabase.from('school_equipment').insert({
              school_id: schoolId,
              name: newName
            });
            localModelMap[newName] = newModel;
            if (newLink) {
              localLinkMap[newName] = newLink;
            } else {
              delete localLinkMap[newName];
            }
          }
        }
      } else {
        // SCENARIO B: Decoupled (each exemplar can have a custom name and model)
        for (let idx = 0; idx < editGroupInstancesData.length; idx++) {
          const inst = editGroupInstancesData[idx];
          const name = inst.fullName.trim();
          const model = inst.model.trim();
          const link = inst.linkUrl?.trim() || '';

          if (inst.id.startsWith('temp_')) {
            // Insert new row
            await supabase.from('school_equipment').insert({
              school_id: schoolId,
              name: name
            });
            localModelMap[name] = model;
            if (link) {
              localLinkMap[name] = link;
            } else {
              delete localLinkMap[name];
            }
          } else {
            // Update existing row
            await supabase.from('school_equipment').update({ name: name }).eq('id', inst.id);
            localModelMap[name] = model;
            if (link) {
              localLinkMap[name] = link;
            } else {
              delete localLinkMap[name];
            }

            // Sync with assigned room
            const originalInst = editingEquipmentGroup.instances.find((i: any) => i.id === inst.id);
            if (originalInst && originalInst.roomId) {
              const targetRoom = rooms.find(r => r.id === originalInst.roomId);
              if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
                const updatedRoomInsts = [...targetRoom.room_instruments];
                if (updatedRoomInsts[originalInst.roomInstIdx]) {
                  updatedRoomInsts[originalInst.roomInstIdx] = {
                    name: name,
                    model: model
                  };
                }
                setRooms(prev => prev.map(r => r.id === originalInst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r));
                await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', originalInst.roomId);
              }
            }
          }
        }
      }

      // Save model mapping and links to localStorage
      localStorage.setItem(`groovelab_instrument_models_${schoolId}`, JSON.stringify(localModelMap));
      localStorage.setItem(`groovelab_instrument_links_${schoolId}`, JSON.stringify(localLinkMap));

      // Reload list from Supabase
      const { data: eqData } = await supabase.from('school_equipment').select('*').eq('school_id', schoolId);
      if (eqData) {
        setSchoolEquipment(eqData);
      }

      setEditingEquipmentGroup(null);
    } catch (e: any) {
      console.error('Equipment group save error:', e);
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

  const handleDropInstrumentOnRoom = async (instrumentName: string, roomId: string) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? targetRoom.room_instruments 
      : (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[roomId] || [];
          } catch { return []; }
        })();

    const updatedInsts = [...currentInsts, { name: instrumentName, model: 'Standard' }];

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_instruments: updatedInsts } : r));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: updatedInsts
      }).eq('id', roomId);

      if (error && error.message.includes("room_instruments")) {
        console.warn("Supabase room_instruments column missing, using local storage fallback.");
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error("Error saving room instruments:", err);
    }
  };

  const handleRemoveRoomInstrument = async (roomId: string, idxToRemove: number) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? targetRoom.room_instruments 
      : (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[roomId] || [];
          } catch { return []; }
        })();

    const updatedInsts = currentInsts.filter((_: any, idx: number) => idx !== idxToRemove);

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_instruments: updatedInsts } : r));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: updatedInsts
      }).eq('id', roomId);

      if (error && error.message.includes("room_instruments")) {
        console.warn("Supabase room_instruments column missing, using local storage fallback.");
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error("Error removing room instrument:", err);
    }
  };

  const handleSaveRoomInstrumentEdit = async (name: string, model: string) => {
    if (!editingRoomInstrument) return;
    const { roomId, index } = editingRoomInstrument;

    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? [...targetRoom.room_instruments]
      : [];

    if (currentInsts[index]) {
      currentInsts[index] = { name: name.trim(), model: model.trim() };
    }

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = currentInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_instruments: currentInsts } : r));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: currentInsts
      }).eq('id', roomId);

      if (error && error.message.includes("room_instruments")) {
        console.warn("Supabase room_instruments column missing, using local storage fallback.");
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error("Error saving room instrument edit:", err);
    }

    setEditingRoomInstrument(null);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'secretary':
        switch (secretarySubTab) {
          case 'briefing': return '📊 Tägliches Briefing & Status';
          case 'crisis': return '🚨 Operations-Cockpit: Krisen-Dashboard';
          case 'equipment': return '🎸 Instrumente & Ausstattung';
          case 'employees': return '👥 Mitarbeiterverwaltung';
          case 'licenses': return '💳 Abrechnung & Infrastruktur';
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
    
    // Ensure XMLNS attribute is present for proper standalone SVG rendering in Safari
    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const base64Data = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = `data:image/svg+xml;charset=utf-8;base64,${base64Data}`;
      
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `QR_Code_${manageTeacher.firstName || 'User'}_${manageTeacher.lastName || ''}.svg`;
      downloadLink.target = '_blank'; // Fallback for Safari blocking direct programmatic downloads
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error('Fallback download using Blob due to Base64 failure:', e);
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `QR_Code_${manageTeacher.firstName || 'User'}_${manageTeacher.lastName || ''}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
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
        .student-name-hover:hover .student-title-text {
          color: #34a853 !important;
          text-decoration: underline;
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
            { 
              id: 'crisis', 
              label: 'Krisen-Dashboard', 
              icon: ShieldAlert, 
              count: (() => {
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                return crisisNotifications.filter(n => {
                  if (n.status !== 'UNREAD') return false;
                  if (!n.teacher || !n.teacher.sick_until) return false;
                  const sickUntilTime = new Date(n.teacher.sick_until).getTime();
                  if (sickUntilTime < todayStart.getTime()) return false;
                  const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
                  return !isPast;
                }).length;
              })()
            },
            { id: 'rooms', label: 'Räume', icon: DoorOpen },
            { id: 'equipment', label: 'Instrumente & Ausstattung', icon: Settings },
            { id: 'employees', label: 'Mitarbeiter', icon: Users },
            { id: 'licenses', label: 'Abrechnung & Infrastruktur', icon: Award },
            { id: 'audit', label: 'Änderungsverlauf', icon: Clock },
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
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    background: isSelected ? '#ea4335' : '#fce8e6',
                    color: isSelected ? '#ffffff' : '#c5221f',
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

          {/* If activeTab is Campus */}
          {activeTab === 'campus' && [
            { id: 'briefing', label: 'Startseite', icon: LayoutDashboard },
            { id: 'subjects', label: 'Unterrichtsfächer', icon: BookOpen },
            { id: 'onboarding', label: 'Lehrer', icon: UserPlus },
            { id: 'students', label: 'Schüler', icon: Users },
            { id: 'cooperations', label: 'Kooperationen', icon: Users },
            { id: 'events', label: 'Termine', icon: Calendar },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Integrated School & User Pill */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(59, 130, 246, 0.04)', 
              padding: '8px 16px', 
              borderRadius: '12px', 
              border: '1px solid rgba(59, 130, 246, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <School size={12} color="#ef4444" />
                  <span>{schoolName || 'Meine Musikschule'}</span>
                </span>
                <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={14} color="#ef4444" />
                  <span>
                    {currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : 'Verwaltung'}
                  </span>
                </span>
              </span>
            </div>

            {/* Elegant Logout Button */}
            {onLogout && (
              <button 
                onClick={onLogout}
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
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.08)',
                  flexShrink: 0
                }}
                className="hover-scale"
                title="Abmelden"
              >
                <LogOut size={14} color="#f43f5e" />
                <span>Abmelden</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Thin accent line matching the active tab label color */}
        <div style={{
          height: '3px',
          background: activeTab === 'secretary' ? '#ea4335' : activeTab === 'campus' ? '#34a853' : '#fbbc05',
          width: '100%',
          flexShrink: 0
        }} />

        {!hasCampusSub && !hasGroovelabSub && (
          <div style={{
            background: '#e8f0fe',
            borderBottom: '1px solid #d2e3fc',
            padding: '10px 40px',
            fontSize: '0.82rem',
            color: '#1967d2',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0
          }}>
            <span>🛠️</span>
            <span><strong>Setup-Modus aktiv:</strong> Die {schoolName || 'Musikschule'} befindet sich in der Konfigurationsphase. Aktuell entstehen für Ihre Schule keine Infrastruktur- oder Nutzungsgebühren.</span>
          </div>
        )}

        {/* Main scrollable body content */}
        <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, overflowY: 'scroll', scrollbarGutter: 'stable' }}>

          {/* Active Tab Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {!((activeTab as any) === 'campus') && !((activeTab as any) === 'campus' && (campusSubTab === 'onboarding' || campusSubTab === 'schedules')) && !(activeTab === 'secretary' && (secretarySubTab === 'crisis' || secretarySubTab === 'rooms' || secretarySubTab === 'briefing' || secretarySubTab === 'audit' || secretarySubTab === 'equipment' || secretarySubTab === 'employees' || secretarySubTab === 'licenses')) && (
                <>
                  <h2 className="swiss-h1" style={{ margin: 0, color: (activeTab as any) === 'campus' ? '#10b981' : '#f59e0b' }}>
                    {getTabTitle()}
                  </h2>
                  <p style={{ color: (activeTab as any) === 'campus' ? '#64748b' : '#a1a1aa', fontWeight: 500, fontSize: '0.85rem', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
          {/* TAB 1: SECRETARY - BRIEFING */}
          {activeTab === 'secretary' && secretarySubTab === 'briefing' && (() => {
            const todayDayNum = new Date().getDay() === 0 ? 7 : new Date().getDay();
            const todayDateStr = new Date().toISOString().split('T')[0];

            // 1. Raumauslastung Heute
            const todayAllocations = matrixAllocations.filter(p => p.dayOfWeek === todayDayNum && p.roomId);
            const totalSlotsCount = rooms.length * 8; // standard 8 slots per room per day
            const roomOccupancyRate = totalSlotsCount > 0 ? Math.round((todayAllocations.length / totalSlotsCount) * 100) : 0;

            // 2. Heutige Krankmeldungen
            const activeSickTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].filter(t => {
              if (!t.sick_until) return false;
              return t.sick_until.substring(0, 10) >= todayDateStr;
            }).reduce((acc: any[], current) => {
              if (!acc.some(item => item.id === current.id)) {
                acc.push(current);
              }
              return acc;
            }, []);

            // 3. Schüler-Aktivierungsquote
            const totalStudentsCount = students.length;
            const activeStudentsCount = students.filter(s => s.is_pin_activated).length;
            const activationRate = totalStudentsCount > 0 ? Math.round((activeStudentsCount / totalStudentsCount) * 100) : 0;

            // 4. Systemische Termin-Konflikte (Overlap checkers)
            const scheduleConflicts = (() => {
              const list: { type: 'room' | 'teacher'; key: string; message: string }[] = [];
              
              // Room conflicts
              const byRoomDay: Record<string, any[]> = {};
              matrixAllocations.filter(p => p.roomId).forEach(p => {
                const k = `${p.roomId}_${p.dayOfWeek}`;
                if (!byRoomDay[k]) byRoomDay[k] = [];
                byRoomDay[k].push(p);
              });
              Object.entries(byRoomDay).forEach(([k, group]) => {
                if (group.length > 1) {
                  group.forEach((p, i) => {
                    group.forEach((q, j) => {
                      if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                        const roomName = roomMap[p.roomId] || 'Unbekannter Raum';
                        const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                        const dayLabel = days[p.dayOfWeek - 1] || 'Wochentag';
                        list.push({
                          type: 'room',
                          key: `${p.id}_${q.id}`,
                          message: `Raum-Kollision in "${roomName}" (${dayLabel}): ${userMap[p.teacherId] || 'Lehrer'} / ${userMap[p.studentId] || 'Schüler'} (${p.startTime}-${p.endTime}) überlappt mit ${userMap[q.teacherId] || 'Lehrer'} / ${userMap[q.studentId] || 'Schüler'} (${q.startTime}-${q.endTime}).`
                        });
                      }
                    });
                  });
                }
              });

              // Teacher conflicts
              const byTeacherDay: Record<string, any[]> = {};
              matrixAllocations.forEach(p => {
                if (p.teacherId) {
                  const k = `${p.teacherId}_${p.dayOfWeek}`;
                  if (!byTeacherDay[k]) byTeacherDay[k] = [];
                  byTeacherDay[k].push(p);
                }
              });
              Object.entries(byTeacherDay).forEach(([k, group]) => {
                if (group.length > 1) {
                  group.forEach((p, i) => {
                    group.forEach((q, j) => {
                      if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                        const teacherName = userMap[p.teacherId] || 'Lehrkraft';
                        const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                        const dayLabel = days[p.dayOfWeek - 1] || 'Wochentag';
                        list.push({
                          type: 'teacher',
                          key: `${p.id}_${q.id}`,
                          message: `Lehrer-Kollision für ${teacherName} (${dayLabel}): ${userMap[p.studentId] || 'Schüler'} (${p.startTime}-${p.endTime}) überlappt mit ${userMap[q.studentId] || 'Schüler'} (${q.startTime}-${q.endTime}).`
                        });
                      }
                    });
                  });
                }
              });
              
              return list;
            })();

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>
                
                {/* LEFT COLUMN: MAIN CONTENT AREA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* 4 GAMIFIED CARD METRICS ROW (KPIs) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    
                    {/* Card 1: Raumauslastung (Blue Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Raumauslastung Heute</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <DoorOpen size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{roomOccupancyRate}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>% ({todayAllocations.length} Slots)</span>
                      </div>
                    </div>

                    {/* Card 2: Aktivierungsquote (Emerald Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schüler-Aktivierung</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <UserCheck size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{activationRate}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>% ({activeStudentsCount} / {totalStudentsCount})</span>
                      </div>
                    </div>

                    {/* Card 3: Konflikte (Amber/Orange Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Terminkonflikte</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <ShieldAlert size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                          {scheduleConflicts.length}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>
                          {scheduleConflicts.length === 0 ? 'System-Prüfung stabil' : 'Konflikte gefunden'}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Krankmeldungen (Red Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Krankmeldungen</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <UserX size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                          {activeSickTeachers.length}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>
                          {activeSickTeachers.length === 1 ? 'Lehrkraft krank' : 'Lehrkräfte krank'}
                        </span>
                      </div>
                    </div>

                  </div>
                    
                    {/* GLASS DASHBOARD GREETING HEADER */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                      backdropFilter: 'blur(24px) saturate(1.8)',
                      WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      borderRadius: '24px',
                      display: 'flex',
                      alignItems: 'stretch',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      width: '100%',
                      minHeight: '130px',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {/* Full Height Graphic on the left */}
                      <div style={{
                        width: '116px',
                        height: '100%',
                        flexShrink: 0,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRight: '1px solid rgba(0, 0, 0, 0.05)'
                      }}>
                        <img 
                          src="/campus_login_hero.png" 
                          alt="" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover'
                          }} 
                        />
                      </div>
                      
                      <div style={{ 
                        padding: '12px 20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        minWidth: 0,
                        flex: 1 
                      }}>
                        {/* Live Clock Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '100px',
                          padding: '4px 10px',
                          alignSelf: 'flex-start',
                          marginBottom: '6px',
                          flexShrink: 0
                        }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                            {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
                          </span>
                        </div>

                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '30px', 
                          fontWeight: 950, 
                          color: '#0f172a', 
                          fontFamily: "'Plus Jakarta Sans', sans-serif", 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          lineHeight: 1.15
                        }}>
                          Hallo, <span style={{ 
                            color: '#ef4444', 
                            fontWeight: 900,
                            letterSpacing: '-0.01em',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}>{currentUserProfile?.first_name || 'Zentrale'}</span>! 
                          <span className="inline-block animate-bounce" style={{ marginLeft: '4px' }}>
                            👋
                          </span>
                        </h3>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: 1.25 }}>
                          Heute ist {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &bull; Systemstatus stabil &bull; {pendingSchedules.length} ausstehende Stundenpläne.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET: Systemische Terminkonflikte */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ background: '#fef3c7', color: '#d97706', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          System-Kollisionsprüfer
                        </h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Prüfung auf Überschneidungen
                        </span>
                      </div>
                    </div>

                    {scheduleConflicts.length === 0 ? (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.04)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        color: '#065f46',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <CheckCircle size={20} color="#10b981" />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800 }}>Konfliktfreier Stundenplan</strong>
                          <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>Alle aktiven Stundenpläne sind sauber strukturiert. Keine Raum- oder Lehrerdoppelbelegungen gefunden.</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {scheduleConflicts.map((conflict, idx) => (
                          <div key={idx} style={{
                            background: 'rgba(245, 158, 11, 0.04)',
                            border: '1px solid rgba(245, 158, 11, 0.1)',
                            color: '#92400e',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}>
                            <ShieldAlert size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.4 }}>
                              {conflict.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WIDGET: Stundenplaneinreichungen */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#eff6ff', color: '#2563eb', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ClipboardList size={16} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Stundenplaneinreichungen
                          </h3>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Zu prüfende Stundenpläne ({pendingSchedules.length})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingSchedules.length === 0 ? (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.04)',
                          border: '1px solid rgba(16, 185, 129, 0.1)',
                          color: '#065f46',
                          borderRadius: '16px',
                          padding: '16px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>👍</div>
                          <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800 }}>Alles freigegeben</strong>
                          <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>Es liegen aktuell keine ausstehenden Stundenplaneinreichungen vor.</span>
                        </div>
                      ) : (
                        (() => {
                          // Group pending schedules by teacher
                          const groupedPending: Record<string, { teacherName: string, instrument: string, days: number[], slotsCount: number }> = {};
                          pendingSchedules.forEach(sched => {
                            const tId = sched.teacher_id;
                            if (!groupedPending[tId]) {
                              groupedPending[tId] = {
                                teacherName: sched.teacher_name || 'Unbekannte Lehrkraft',
                                instrument: '',
                                days: [],
                                slotsCount: 0
                              };
                            }
                            groupedPending[tId].days.push(sched.day_of_week);
                            groupedPending[tId].slotsCount++;
                          });

                          return Object.entries(groupedPending).map(([tId, data]) => {
                            const daysOfWeek = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                            const uniqueDays = Array.from(new Set(data.days)).sort((a, b) => a - b);
                            let daysLabel = '';
                            
                            // Form contiguous range if possible
                            let isContiguous = true;
                            for (let i = 1; i < uniqueDays.length; i++) {
                              if (uniqueDays[i] !== uniqueDays[i-1] + 1) {
                                isContiguous = false;
                                break;
                              }
                            }
                            if (isContiguous && uniqueDays.length > 2) {
                              daysLabel = `${daysOfWeek[uniqueDays[0] - 1]} – ${daysOfWeek[uniqueDays[uniqueDays.length - 1] - 1]}`;
                            } else {
                              daysLabel = uniqueDays.map(d => daysOfWeek[d - 1]).join(', ');
                            }

                            return (
                              <div key={tId} style={{
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                background: 'rgba(0, 0, 0, 0.01)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <strong style={{ fontSize: '0.84rem', color: '#1c1c1e', fontWeight: 700 }}>
                                    {data.teacherName}
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: '#8e8e93', fontWeight: 500 }}>
                                    📅 {daysLabel} ({data.slotsCount} {data.slotsCount === 1 ? 'Termin' : 'Termine'})
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    setCampusSubTab('schedules');
                                    setSchedulesRoomsViewMode('designer');
                                    setSelectedFilterTeacherId(tId);
                                    setExpandedSidebarTeacherId(tId);
                                  }}
                                  style={{
                                    background: '#007aff',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '6px 14px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.15)',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  Zuteilen
                                </button>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* WIDGET: Heutige Krankmeldungen / Lehrer-Präsenz & Status */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ background: '#fee2e2', color: '#b91c1c', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        <UserX size={16} color="#ef4444" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Lehrer-Präsenz &amp; Status
                        </h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Aktuelle Krankmeldungen
                        </span>
                      </div>
                    </div>

                    {activeSickTeachers.length === 0 ? (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.04)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        color: '#065f46',
                        borderRadius: '16px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🎉</div>
                        <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800 }}>Volle Präsenz</strong>
                        <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>Alle Lehrkräfte sind einsatzbereit. Es liegen keine Krankmeldungen vor.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeSickTeachers.map(teacher => {
                          const sickUntilStr = teacher.sick_until ? new Date(teacher.sick_until).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'unbefristet';
                          return (
                            <div key={teacher.id} style={{
                              padding: '12px',
                              borderRadius: '16px',
                              border: '1px solid rgba(239, 68, 68, 0.1)',
                              background: 'rgba(239, 68, 68, 0.04)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                              <div style={{ flex: 1 }}>
                                <strong style={{ display: 'block', fontSize: '0.82rem', color: '#991b1b', fontWeight: 700 }}>
                                  {teacher.firstName || teacher.first_name} {teacher.lastName || teacher.last_name}
                                </strong>
                                <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600 }}>
                                  Ausfall gemeldet: bis {sickUntilStr}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* WIDGET: Schultermine */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#fef3c7', color: '#d97706', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Calendar size={16} color="#fbbf24" />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Schultermine
                          </h3>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Wichtige Termine der Musikschule
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowAddEventModal(!showAddEventModal)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#d97706',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {showAddEventModal ? 'Schließen' : '＋ Neu'}
                      </button>
                    </div>

                    {showAddEventModal && (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newEventTitle.trim() || !newEventDesc.trim()) return;
                        try {
                          const { error } = await supabase
                            .from('campus_announcements')
                            .insert({
                              school_id: schoolId,
                              user_id: userId,
                              title: newEventTitle,
                              message: newEventDesc,
                              target_type: newEventTarget
                            });
                          if (!error) {
                            setNewEventTitle('');
                            setNewEventDesc('');
                            setShowAddEventModal(false);
                            fetchDashboardData();
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }} style={{
                        background: 'rgba(245, 158, 11, 0.02)',
                        border: '1px dashed rgba(245, 158, 11, 0.2)',
                        padding: '12px',
                        borderRadius: '16px',
                        marginBottom: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <input 
                          placeholder="Termin Titel..." 
                          value={newEventTitle} 
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          required
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: '0.8rem',
                            fontFamily: 'inherit'
                          }}
                        />
                        <textarea 
                          placeholder="Beschreibung (z.B. Uhrzeit, Ort)..." 
                          value={newEventDesc} 
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          required
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: '0.8rem',
                            minHeight: '60px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <select 
                            value={newEventTarget} 
                            onChange={(e: any) => setNewEventTarget(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0,0,0,0.08)',
                              fontSize: '0.7rem',
                              background: '#fff'
                            }}
                          >
                            <option value="all">Sichtbar für alle</option>
                            <option value="teachers">Nur Lehrkräfte</option>
                            <option value="students">Nur Schüler</option>
                          </select>
                          <button type="submit" style={{
                            background: '#d97706',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}>Speichern</button>
                        </div>
                      </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {schoolEvents.length === 0 ? (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.04)',
                          border: '1px solid rgba(245, 158, 11, 0.1)',
                          color: '#d97706',
                          borderRadius: '16px',
                          padding: '16px',
                          textAlign: 'center'
                        }}>
                          <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800 }}>Keine Schultermine erfasst</strong>
                          <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                            Erstelle eine Campus-Mitteilung, um hier Termine oder Ankündigungen anzuzeigen.
                          </span>
                        </div>
                      ) : (
                        schoolEvents.slice(0, 6).map((evt) => {
                          const dateObj = new Date(evt.created_at);
                          const formattedDate = dateObj.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <div key={evt.id} style={{
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: '1px solid rgba(245, 158, 11, 0.1)',
                              background: 'rgba(245, 158, 11, 0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 750 }}>
                                  {evt.title}
                                </strong>
                                <span style={{ fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, flexShrink: 0 }}>
                                  {formattedDate}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.3 }}>
                                {evt.message}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

        {/* TAB 1.1: SECRETARY - CRISIS */}
        {activeTab === 'secretary' && secretarySubTab === 'crisis' && (() => {
          const now = new Date();
          const todayStart = new Date();
          todayStart.setHours(0,0,0,0);

          // ── Derived data ──
          const sickTeachersMap = new Map<string, any>();
          crisisNotifications.forEach(n => {
            if (n.teacher && n.teacher.sick_until) {
              const sickUntilTime = new Date(n.teacher.sick_until).getTime();
              if (sickUntilTime >= todayStart.getTime()) {
                sickTeachersMap.set(n.teacher.id, n.teacher);
              }
            }
          });
          const sickTeachers = Array.from(sickTeachersMap.values());

          const liveTickets   = crisisNotifications.filter(n => {
            const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
            if (n.status === 'ARCHIVED' || isPast) return false;
            if (!n.teacher || !n.teacher.sick_until) return false;
            const sickUntilTime = new Date(n.teacher.sick_until).getTime();
            return sickUntilTime >= todayStart.getTime();
          });
          const todayEnd = new Date(todayStart);
          todayEnd.setHours(23, 59, 59, 999);
          const todayTickets = liveTickets.filter(n => {
            const time = new Date(n.slot_start_datetime).getTime();
            return time >= todayStart.getTime() && time <= todayEnd.getTime();
          });
          const archiveTickets = crisisNotifications.filter(n => {
            const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
            const isHealthy = !n.teacher || !n.teacher.sick_until || new Date(n.teacher.sick_until).getTime() < todayStart.getTime();
            return n.status === 'ARCHIVED' || isPast || isHealthy;
          });
          const poolTickets    = crisisTabMode === 'live' ? liveTickets : archiveTickets;
          const visibleTickets = selectedCrisisTeacherId
            ? poolTickets.filter(t => t.teacher?.id === selectedCrisisTeacherId)
            : poolTickets;

          const unreadCount   = liveTickets.filter(n => n.status === 'UNREAD').length;
          const readCount     = liveTickets.filter(n => n.status === 'READ').length;
          const archivedCount = archiveTickets.length;

          // ── Helper: urgency classification ──
          const getUrgency = (n: any): 'RED' | 'YELLOW' | 'GREEN' => {
            if (n.status === 'READ') return 'GREEN';
            const minsUntil = (new Date(n.slot_start_datetime).getTime() - now.getTime()) / 60000;
            return minsUntil < 120 ? 'RED' : 'YELLOW';
          };

          // ── Helper: sick duration string ──
          const sickDurStr = (v: string | null) => {
            if (!v) return 'Dauer offen';
            try { return `bis ${new Date(v).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}`; }
            catch { return 'Dauer unbekannt'; }
          };

          // ── Grouped tickets for Live mode ──
          const redTickets    = visibleTickets.filter(t => getUrgency(t) === 'RED');
          const yellowTickets = visibleTickets.filter(t => getUrgency(t) === 'YELLOW');
          const greenTickets  = visibleTickets.filter(t => getUrgency(t) === 'GREEN');

          // ── Grouped archive logbook data ──
          const archiveGroups = (() => {
            const groups: { [key: string]: { date: string, teacher: any, tickets: any[] } } = {};
            archiveTickets.forEach(t => {
              const dVal = new Date(t.slot_start_datetime);
              const dateStr = dVal.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const key = `${dateStr}_${t.teacher_id}`;
              if (!groups[key]) {
                groups[key] = {
                  date: dateStr,
                  teacher: t.teacher,
                  tickets: []
                };
              }
              groups[key].tickets.push(t);
            });
            return Object.values(groups).sort((a, b) => {
              const [aDay, aMonth, aYear] = a.date.split('.').map(Number);
              const [bDay, bMonth, bYear] = b.date.split('.').map(Number);
              return new Date(bYear, bMonth - 1, bDay).getTime() - new Date(aYear, aMonth - 1, aDay).getTime();
            });
          })();

          // ── Ticket Card Component ──
          const TicketCard = ({ t }: { t: any }) => {
            const urgency = crisisTabMode === 'history' ? 'GREEN' : getUrgency(t);
            const studentName = t.student ? `${t.student.first_name} ${t.student.last_name}` : 'Unbekannter Schüler';
            const teacherName = t.teacher ? `${t.teacher.first_name} ${t.teacher.last_name}` : 'Lehrkraft';
            const subject = t.student?.instrument || 'Musikunterricht';
            const timeStr = new Date(t.slot_start_datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(t.slot_start_datetime).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

            const urgencyMeta = {
              RED:    { leftBar: '#ef4444', bg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.75) 0%, rgba(254, 226, 226, 0.45) 100%)', border: 'rgba(239, 68, 68, 0.25)', badge: '#ef4444', badgeText: 'white', badgeLabel: '🚨 Akuter Ausfall', dot: '#ef4444' },
              YELLOW: { leftBar: '#f59e0b', bg: 'linear-gradient(135deg, rgba(255, 251, 235, 0.75) 0%, rgba(254, 243, 199, 0.45) 100%)', border: 'rgba(245, 158, 11, 0.25)', badge: '#f59e0b', badgeText: 'white', badgeLabel: '⏳ Ausstehend', dot: '#f59e0b' },
              GREEN:  { leftBar: '#10b981', bg: 'linear-gradient(135deg, rgba(240, 253, 244, 0.75) 0%, rgba(220, 252, 231, 0.45) 100%)', border: 'rgba(16, 185, 129, 0.25)', badge: '#10b981', badgeText: 'white', badgeLabel: '✓ Informiert', dot: '#10b981' },
            };
            const m = urgencyMeta[urgency] || urgencyMeta['GREEN'];

            return (
              <div key={t.id} style={{
                background: m.bg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${m.border}`,
                borderLeft: `5px solid ${m.leftBar}`,
                borderRadius: '20px',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 32px rgba(15, 23, 42, 0.03)',
              }} className="hover-scale">
                {/* Status dot with pulsing effect for acute issues */}
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: m.dot, flexShrink: 0,
                  position: 'relative',
                  boxShadow: urgency === 'RED' ? '0 0 10px rgba(239,68,68,0.6)' : 'none',
                }}>
                  {urgency === 'RED' && (
                    <div style={{
                      position: 'absolute', inset: -4, borderRadius: '50%',
                      border: '2px solid #ef4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }} />
                  )}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {studentName}
                    </span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 800, background: 'rgba(15, 23, 42, 0.06)',
                      color: '#475569', padding: '3px 10px', borderRadius: '100px',
                      backdropFilter: 'blur(4px)'
                    }}>{subject}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                      <Calendar size={13} style={{ color: '#475569' }} /> {dateStr}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                      <Clock size={13} style={{ color: '#475569' }} /> {timeStr} Uhr
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Lehrkraft: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{teacherName}</strong>
                    </span>
                  </div>
                  {urgency === 'RED' && (
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content' }}>
                      ⚠️ Ausfall in unter 2h - telefonischer Sofort-Kontakt empfohlen!
                    </div>
                  )}
                </div>

                {/* Badge */}
                <span style={{
                  padding: '6px 14px', borderRadius: '100px', flexShrink: 0,
                  fontSize: '0.72rem', fontWeight: 900, whiteSpace: 'nowrap',
                  background: m.badge, color: m.badgeText,
                  boxShadow: `0 4px 14px ${m.badge}35`,
                }}>{m.badgeLabel}</span>

                {/* Action buttons – only in live mode */}
                {crisisTabMode === 'live' && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {urgency !== 'GREEN' && (
                      <button
                        onClick={() => handleMarkAsNotified(t.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: 'white', borderRadius: '12px', padding: '8px 14px',
                          fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                          transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.2)'; }}
                      >
                        <CheckCircle size={14} /> Manuell grün melden
                      </button>
                    )}
                    {urgency === 'GREEN' && (
                      <button
                        onClick={() => handleArchiveCrisisTicket(t.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'white', border: '1.5px solid #e2e8f0',
                          color: '#64748b', borderRadius: '12px', padding: '8px 14px',
                          fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; }}
                      >
                        <X size={14} /> Archivieren
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* ── TOP: KPI HEADER BAR ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="animation-slide-up">
                {/* KPI 1: Kranke Lehrkräfte - Red */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
                  color: 'white', borderRadius: '24px', padding: '22px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  boxShadow: '0 12px 30px -5px rgba(239, 68, 68, 0.35)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
                      Kranke Lehrkräfte
                    </span>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
                      <UserX size={15} color="white" />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {sickTeachers.length}
                  </div>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
                    {sickTeachers.length === 1 ? '1 Lehrkraft abwesend' : `${sickTeachers.length} Lehrkräfte abwesend`}
                  </span>
                </div>

                {/* KPI 2: Offene Ausfälle - Yellow */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
                  color: 'white', borderRadius: '24px', padding: '22px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  boxShadow: '0 12px 30px -5px rgba(245, 158, 11, 0.35)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
                      Offene Ausfälle
                    </span>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
                      <ShieldAlert size={15} color="white" />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {unreadCount}
                  </div>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
                    {unreadCount === 0 ? 'Exzellent — Alles im Plan' : 'Benachrichtigung ausstehend'}
                  </span>
                </div>

                {/* KPI 3: Erfolgreich informiert - Green */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
                  color: 'white', borderRadius: '24px', padding: '22px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  boxShadow: '0 12px 30px -5px rgba(16, 185, 129, 0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
                      Erfolgreich Informiert
                    </span>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
                      <CheckCircle size={15} color="white" />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {readCount}
                  </div>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>Terminänderung zugestellt</span>
                </div>

                {/* KPI 4: Archiviert */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.95) 0%, rgba(71, 85, 105, 0.95) 100%)',
                  color: 'white', borderRadius: '24px', padding: '22px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  boxShadow: '0 12px 30px -5px rgba(100,116,139,0.25)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
                      Archivierte Fälle
                    </span>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
                      <Clock size={15} color="white" />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {archivedCount}
                  </div>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>Protokollierte Historie</span>
                </div>
              </div>

              {/* ── MAIN CONTENT ROW ── */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

                {/* LEFT: Ticket feed */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

                  {/* Section header + tab toggle */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '24px',
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        borderRadius: '14px', padding: '10px',
                        boxShadow: '0 6px 20px rgba(239,68,68,0.25)',
                        display: 'flex', alignItems: 'center', justifyItems: 'center'
                      }}>
                        <ShieldAlert size={20} color="white" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Operations-Cockpit
                          {selectedCrisisTeacherId && <span style={{ color: '#ef4444', fontSize: '0.78rem', marginLeft: '10px', background: '#fee2e2', padding: '2px 10px', borderRadius: '100px', fontWeight: 800 }}>Gefiltert</span>}
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          Lehrerausfall-Kaskade &bull; Live-Abgleich mit Schülerbenachrichtigungen
                        </p>
                      </div>
                    </div>

                    {/* Live / Archiv toggle */}
                    <div style={{
                      display: 'flex', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '14px',
                      padding: '4px', gap: '4px', border: '1px solid rgba(0, 0, 0, 0.03)',
                      backdropFilter: 'blur(8px)'
                    }}>
                      {([['live', 'Aktive Fälle'], ['history', 'Historie & Archiv']] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          onClick={() => setCrisisTabMode(mode)}
                          style={{
                            padding: '8px 18px', borderRadius: '10px', border: 'none',
                            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                            fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: crisisTabMode === mode ? 'white' : 'transparent',
                            color: crisisTabMode === mode ? '#0f172a' : '#64748b',
                            boxShadow: crisisTabMode === mode ? '0 4px 12px rgba(15, 23, 42, 0.08)' : 'none',
                          }}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Live mode view with conditions */}
                  {crisisTabMode === 'live' && (() => {
                    if (sickTeachers.length === 0) {
                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          borderRadius: '24px',
                          padding: '80px 40px', textAlign: 'center',
                          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <CheckCircle size={56} color="#10b981" strokeWidth={1.5} />
                          </div>
                          <strong style={{ display: 'block', fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
                            Keine akuten Krankmeldungen
                          </strong>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '460px', marginInline: 'auto', lineHeight: 1.4 }}>
                            Derzeit sind alle Lehrkräfte aktiv im Dienst. Es liegen keine akuten Ausfälle vor.
                          </p>
                        </div>
                      );
                    }

                    if (liveTickets.length === 0) {
                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          borderRadius: '24px',
                          padding: '80px 40px', textAlign: 'center',
                          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <Sparkles size={56} color="#f59e0b" strokeWidth={1.5} />
                          </div>
                          <strong style={{ display: 'block', fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
                            Keine kommenden Ausfälle
                          </strong>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '460px', marginInline: 'auto', lineHeight: 1.4 }}>
                            Es stehen derzeit keine zukünftigen Unterrichtsausfälle zur Absage an.
                          </p>
                        </div>
                      );
                    }

                    const todayDateStr = new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                    
                    const liveGroupsMap = new Map<string, any[]>();
                    liveTickets.forEach(t => {
                      const dVal = new Date(t.slot_start_datetime);
                      const dateStr = dVal.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                      if (!liveGroupsMap.has(dateStr)) {
                        liveGroupsMap.set(dateStr, []);
                      }
                      liveGroupsMap.get(dateStr)!.push(t);
                    });

                    const liveGroups = Array.from(liveGroupsMap.entries()).map(([dateStr, tickets]) => {
                      const firstTime = new Date(tickets[0].slot_start_datetime).getTime();
                      return { dateStr, tickets, firstTime };
                    }).sort((a, b) => a.firstTime - b.firstTime);

                    const activeExpandedDay = expandedLiveDayStr || (liveGroups.some(g => g.dateStr === todayDateStr) ? todayDateStr : liveGroups[0]?.dateStr);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {liveGroups.map(group => {
                          const isToday = group.dateStr === todayDateStr;
                          const isExpanded = activeExpandedDay === group.dateStr;
                          const total = group.tickets.length;
                          const pendingCount = group.tickets.filter(t => t.status === 'UNREAD').length;
                          const doneCount = total - pendingCount;

                          const headerBg = isToday
                            ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                            : '#ffffff';
                          const headerBorder = isToday ? '1.5px solid #fde047' : '1.5px solid #cbd5e1';
                          const headerColor = isToday ? '#78350f' : '#0f172a';
                          
                          return (
                            <div key={group.dateStr} style={{ display: 'flex', flexDirection: 'column' }}>
                              <div
                                onClick={() => setExpandedLiveDayStr(isExpanded ? 'NONE' : group.dateStr)}
                                style={{
                                  background: headerBg,
                                  border: headerBorder,
                                  borderBottom: isExpanded ? 'none' : headerBorder,
                                  borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  position: 'relative',
                                  zIndex: 2,
                                }}
                                onMouseEnter={e => {
                                  if (!isToday) {
                                    e.currentTarget.style.borderColor = '#ea4335';
                                  }
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.04)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = isToday ? '#fcd34d' : '#cbd5e1';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                  <div style={{
                                    background: isToday ? '#fef3c7' : '#f1f5f9',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Calendar size={20} color={isToday ? '#d97706' : '#64748b'} />
                                  </div>
                                  <div>
                                    <strong style={{ display: 'block', fontSize: '1rem', color: headerColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      {group.dateStr} {isToday && '• Heute'}
                                    </strong>
                                    <span style={{ fontSize: '0.75rem', color: isToday ? '#92400e' : '#64748b', fontWeight: 600 }}>
                                      {total} Ausfälle geplant
                                    </span>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.78rem', background: pendingCount > 0 ? (isToday ? '#fee2e2' : '#f1f5f9') : '#e6f4ea', color: pendingCount > 0 ? '#dc2626' : '#137333', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                                    {pendingCount > 0 ? `${pendingCount} Ausstehend` : 'Alle informiert'}
                                  </span>
                                  {doneCount > 0 && (
                                    <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                                      {doneCount} Erledigt
                                    </span>
                                  )}
                                  <ChevronRight 
                                    size={18} 
                                    color={isToday ? '#92400e' : '#64748b'}
                                    style={{ 
                                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                      marginLeft: '8px'
                                    }} 
                                  />
                                </div>
                              </div>

                              {isExpanded && (
                                <div style={{
                                  background: '#f8fafc',
                                  border: headerBorder,
                                  borderTop: 'none',
                                  borderRadius: '0 0 16px 16px',
                                  padding: '20px',
                                  zIndex: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)'
                                }}>
                                  {group.tickets.map(t => (
                                    <TicketCard key={t.id} t={t} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Ticket list – ARCHIVE mode (Collapsible Accordion Layout) */}
                  {crisisTabMode === 'history' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {archiveGroups.length === 0 ? (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                          backdropFilter: 'blur(24px)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          borderRadius: '24px',
                          padding: '60px 40px', textAlign: 'center',
                          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <ClipboardList size={56} color="#94a3b8" strokeWidth={1.5} />
                          </div>
                          <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px' }}>
                            Keine archivierten Einträge
                          </strong>
                        </div>
                      ) : (
                        archiveGroups.map(group => {
                          const total = group.tickets.length;
                          const successCount = group.tickets.filter(t => t.status === 'READ' || t.notified_at).length;
                          const failedCount = total - successCount;
                          const teacherName = group.teacher ? `${group.teacher.first_name} ${group.teacher.last_name}` : 'Lehrkraft';
                          const isExpanded = selectedArchiveLog?.date === group.date && selectedArchiveLog?.teacher?.id === group.teacher?.id;

                          return (
                            <div key={`${group.date}_${group.teacher?.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
                              <div 
                                onClick={() => setSelectedArchiveLog(isExpanded ? null : group)}
                                style={{
                                  background: 'white',
                                  border: '1.5px solid #cbd5e1',
                                  borderBottom: isExpanded ? 'none' : '1.5px solid #cbd5e1',
                                  borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  position: 'relative',
                                  zIndex: 2,
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = '#ea4335';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.04)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                  <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={20} color="#ea4335" />
                                  </div>
                                  <div>
                                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      {group.date} &bull; {teacherName}
                                    </strong>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                      Krankmeldung: {sickDurStr(group.teacher?.sick_until)}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.78rem', background: '#e6f4ea', color: '#137333', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                    ✓ {successCount} Schüler erreicht
                                  </span>
                                  <span style={{ fontSize: '0.78rem', background: failedCount > 0 ? '#fce8e6' : '#f1f5f9', color: failedCount > 0 ? '#c5221f' : '#64748b', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                    {failedCount > 0 ? `❌ ${failedCount} nicht erreicht` : 'Alle erreicht'}
                                  </span>
                                  {(() => {
                                    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
                                    const rateBg = successRate >= 80 ? '#d1fae5' : successRate >= 50 ? '#fef3c7' : '#fee2e2';
                                    const rateColor = successRate >= 80 ? '#065f46' : successRate >= 50 ? '#92400e' : '#991b1b';
                                    return (
                                      <span style={{ fontSize: '0.78rem', background: rateBg, color: rateColor, padding: '4px 10px', borderRadius: '100px', fontWeight: 900 }}>
                                        {successRate}% Erfolgsquote
                                      </span>
                                    );
                                  })()}
                                  <ChevronRight 
                                    size={18} 
                                    color="#64748b" 
                                    style={{ 
                                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                      marginLeft: '8px'
                                    }} 
                                  />
                                </div>
                              </div>

                              {/* Collapsible inline details panel */}
                              {isExpanded && (
                                <div style={{
                                  background: '#f8fafc',
                                  border: '1.5px solid #cbd5e1',
                                  borderTop: 'none',
                                  borderRadius: '0 0 16px 16px',
                                  padding: '16px 20px',
                                  zIndex: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)'
                                }}>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                                    Betroffene Unterrichtsstunden und Benachrichtigungsstatus:
                                  </div>
                                  {group.tickets.map((t: any) => {
                                    const isSuccess = t.status === 'READ' || t.notified_at;
                                    const sName = t.student ? `${t.student.first_name} ${t.student.last_name}` : 'Unbekannter Schüler';
                                    const tStr = new Date(t.slot_start_datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                                    
                                    return (
                                      <div 
                                        key={t.id} 
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          background: isSuccess ? '#f0fdf4' : '#fef2f2',
                                          border: `1px solid ${isSuccess ? '#bbf7d0' : '#fca5a5'}`,
                                          borderRadius: '12px',
                                          padding: '10px 14px'
                                        }}
                                      >
                                        <div>
                                          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {sName}
                                          </strong>
                                          <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                            {t.student?.instrument || 'Musikunterricht'} &bull; {tStr} Uhr
                                          </span>
                                        </div>
                                        <span style={{
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          color: isSuccess ? '#16a34a' : '#dc2626',
                                          background: isSuccess ? '#dcfce7' : '#fee2e2',
                                          padding: '4px 10px',
                                          borderRadius: '100px'
                                        }}>
                                          {isSuccess ? '✓ Erfolgreich informiert' : '❌ Nicht rechtzeitig informiert'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                </div>

                {/* RIGHT SIDEBAR */}
                <div style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Sick teacher list (Red Widget style when sick, neutral white when all active) */}
                  <div style={{
                    background: sickTeachers.length === 0
                      ? '#ffffff'
                      : 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.95) 100%)',
                    border: sickTeachers.length === 0
                      ? '1.5px solid #e2e8f0'
                      : '1.5px solid #fca5a5',
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: sickTeachers.length === 0
                      ? '0 8px 32px rgba(15, 23, 42, 0.03)'
                      : '0 8px 32px rgba(239, 68, 68, 0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: sickTeachers.length === 0 ? '1px solid #e2e8f0' : '1px solid rgba(239, 68, 68, 0.15)' }}>
                      <div style={{
                        background: sickTeachers.length === 0 ? '#e6f4ea' : '#fee2e2',
                        borderRadius: '12px', padding: '8px',
                        border: sickTeachers.length === 0 ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {sickTeachers.length === 0 ? (
                          <UserCheck size={16} color="#16a34a" />
                        ) : (
                          <UserX size={16} color="#ef4444" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '0.9rem', fontWeight: 950, color: sickTeachers.length === 0 ? '#1e293b' : '#7f1d1d', display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Krankmeldungen
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: sickTeachers.length === 0 ? '#64748b' : '#b91c1c', fontWeight: 600 }}>
                          {sickTeachers.length === 0 ? 'Alle im Dienst' : 'Wählen zum Filtern'}
                        </span>
                      </div>
                    </div>

                    {sickTeachers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                          <CheckCircle size={32} color="#16a34a" />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#7f1d1d', fontWeight: 700 }}>Alle Lehrkräfte aktiv im Dienst</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {sickTeachers.map((teacher: any) => {
                          const count = crisisNotifications.filter(n => n.teacher?.id === teacher.id).length;
                          const isSelected = selectedCrisisTeacherId === teacher.id;
                          return (
                            <div
                              key={teacher.id}
                              onClick={() => setSelectedCrisisTeacherId(isSelected ? null : teacher.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                background: isSelected ? '#fff5f5' : 'white',
                                border: `1.5px solid ${isSelected ? '#ef4444' : '#fca5a5'}`,
                                borderRadius: '16px', padding: '12px 14px',
                                cursor: 'pointer', transition: 'all 0.2s ease',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: isSelected ? '0 8px 20px rgba(239,68,68,0.08)' : '0 2px 4px rgba(239, 68, 68, 0.02)',
                              }}
                            >
                              <div style={{
                                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                border: '2px solid #fecaca',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.9rem', fontWeight: 900,
                                color: '#ef4444',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}>
                                {teacher.first_name?.[0]?.toUpperCase() || 'L'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#7f1d1d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {teacher.first_name} {teacher.last_name}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444' }}>
                                    {count} {count === 1 ? 'Fall' : 'Fälle'}
                                  </span>
                                  <span style={{ color: '#fca5a5', fontSize: '0.6rem' }}>&bull;</span>
                                  <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>{sickDurStr(teacher.sick_until)}</span>
                                </div>
                              </div>
                              {/* Re-activate / Gesundmelden button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEndSickOnBehalf(teacher.id, `${teacher.first_name} ${teacher.last_name}`);
                                }}
                                title="Lehrkraft als gesund melden (Stunden reaktivieren)"
                                style={{
                                  background: '#ef4444', border: 'none',
                                  borderRadius: '10px', width: '28px', height: '28px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', color: 'white', transition: 'all 0.15s',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; }}
                              >
                                <UserCheck size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedCrisisTeacherId && (
                      <button
                        onClick={() => setSelectedCrisisTeacherId(null)}
                        style={{
                          background: 'white', border: '1.5px solid #fca5a5',
                          color: '#7f1d1d', fontSize: '0.78rem', cursor: 'pointer',
                          padding: '8px 12px', borderRadius: '12px', fontWeight: 800,
                          width: '100%', transition: 'all 0.15s',
                          fontFamily: "'Plus Jakarta Sans', sans-serif"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                      >Filter aufheben ✕</button>
                    )}
                  </div>

                  {/* Wie funktioniert das? Info box (Krisen-Operationscockpit) */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '24px', 
                    padding: '24px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: '#dbeafe', borderRadius: '10px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={16} color="#2563eb" />
                      </div>
                      <strong style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Anleitung: Operationscockpit
                      </strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { icon: <AlertCircle size={14} color="#ef4444" />, title: 'Rot (Akut)', text: 'Ausfall in unter 2 Std. — Telefonischer Sofort-Kontakt dringend empfohlen!', bg: '#fee2e2' },
                        { icon: <Clock size={14} color="#f59e0b" />, title: 'Gelb (Offen)', text: 'Schüler wurde digital benachrichtigt. Rückmeldung steht noch aus.', bg: '#fef3c7' },
                        { icon: <CheckCircle size={14} color="#10b981" />, title: 'Grün (Erledigt)', text: 'Schüler wurde erfolgreich informiert (Kenntnisnahme bestätigt oder manuell gemeldet).', bg: '#dcfce7' },
                      ].map((item) => (
                        <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ background: item.bg, borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                            {item.icon}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '2px' }}>{item.title}</span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550, lineHeight: 1.35, display: 'block' }}>{item.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4, fontWeight: 550 }}>
                        Das Operationscockpit unterstützt Sie bei Lehrerausfällen. Sobald Sie einen Schüler telefonisch kontaktiert haben, können Sie den Fall per Klick manuell auf <strong>Grün</strong> setzen. Nach Ablauf eines Tages werden erledigte Fälle automatisch ins Archiv übertragen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 1.5: SECRETARY - EMPLOYEES */}
        {activeTab === 'secretary' && secretarySubTab === 'employees' && (() => {
          const filteredEmployees = employees.filter(emp => {
            const firstName = (emp.first_name || '').toLowerCase();
            const lastName = (emp.last_name || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const query = employeeSearchQuery.toLowerCase().trim();
            
            const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || email.includes(query);
            const matchesRole = employeeFilterRole === 'All' || emp.role === employeeFilterRole;
            
            const isActive = emp.is_active ?? true;
            const matchesStatus = employeeStatusTab === 'all' ||
              (employeeStatusTab === 'active' && isActive) ||
              (employeeStatusTab === 'inactive' && !isActive);
              
            return matchesSearch && matchesRole && matchesStatus;
          });

          const adminCount = employees.filter(e => e.role === 'admin').length;
          const secretaryCount = employees.filter(e => e.role === 'secretary').length;

          return (
            <div className="campus-grid">
              
              {/* Left Content Pane (Main Board Content) */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>
                
                {/* 1. EMPLOYEE BOARD HEADER CARD */}
                <div className="google-card" style={{
                  width: '100%',
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
                  {/* TITLE BLOCK & ACTIONS */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={22} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Mitarbeiterverwaltung ({employees.length})
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setIsEmployeeCsvExpanded(!isEmployeeCsvExpanded)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          borderRadius: '12px', 
                          padding: '8px 16px', 
                          fontSize: '0.8rem', 
                          fontWeight: 800,
                          background: isEmployeeCsvExpanded ? '#f1f5f9' : '#ffffff',
                          color: '#475569',
                          border: '1.5px solid #cbd5e1',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s'
                        }}
                      >
                        📄 Sammel-Onboarding (CSV) {isEmployeeCsvExpanded ? '▲' : '▼'}
                      </button>

                      <button
                        onClick={() => setShowAddEmployeeModal(true)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          borderRadius: '12px', 
                          padding: '8px 16px', 
                          fontSize: '0.8rem', 
                          fontWeight: 800,
                          background: '#0b57d0',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          boxShadow: '0 4px 10px rgba(11,87,208,0.15)',
                          transition: 'all 0.2s'
                        }}
                      >
                        ➕ Mitarbeiter anlegen
                      </button>
                    </div>
                  </div>

                  {/* Collapsible CSV Box */}
                  {isEmployeeCsvExpanded && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                          Sammel-Onboarding (Mitarbeiter)
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                          Format pro Zeile: <code>Vorname; Nachname; E-Mail; Spitzname (optional); Rolle (admin/secretary)</code>
                        </span>
                      </div>

                      {employeeFilterRole && employeeFilterRole !== 'All' && (() => {
                        const roleName = employeeFilterRole === 'admin' ? 'Admin' : 'Verwaltung';
                        const { avatarBg: instAvatarBg, avatarColor: instAvatarColor } = getAlphabeticalColor(roleName);

                        return (
                          <div style={{
                            background: 'rgba(11, 87, 208, 0.03)',
                            border: '1.5px solid rgba(11, 87, 208, 0.12)',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginTop: '2px',
                            marginBottom: '2px',
                            flexWrap: 'wrap',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                              <span style={{ fontSize: '0.68rem', color: '#0b57d0', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                                ⚡ Smart Auto-Zuweisung:
                              </span>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                padding: '4px 10px 4px 6px',
                                borderRadius: '100px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                              }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: instAvatarBg,
                                  color: instAvatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  fontFamily: 'Urbanist'
                                }}>
                                  {roleName[0]?.toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  {roleName}
                                </span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Rolle
                                </span>
                              </div>
                            </div>
                            
                            <span style={{ fontSize: '0.65rem', color: '#0b57d0', fontWeight: 900, background: '#e8f0fe', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                              Rolle wird automatisch verknüpft!
                            </span>
                          </div>
                        );
                      })()}

                      <textarea
                        value={employeeCsvText}
                        onChange={(e) => setEmployeeCsvText(e.target.value)}
                        placeholder={
                          employeeFilterRole && employeeFilterRole !== 'All'
                            ? "Markus; Weber; markus@schule.de; Webbi\nAnna; Becker; anna@schule.de"
                            : "Markus; Weber; markus@schule.de; Webbi; admin\nAnna; Becker; anna@schule.de; ; secretary"
                        }
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
                        onClick={handleImportEmployees}
                        className="google-btn-primary"
                        style={{ background: '#0b57d0', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start', cursor: 'pointer' }}
                      >
                        Mitarbeiter importieren
                      </button>
                    </div>
                  )}

                  {/* FILTERS ROW */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1.5, minWidth: '240px' }}>
                      <input
                        type="text"
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        placeholder="Mitarbeiter nach Name oder E-Mail suchen..."
                        style={{
                          width: '100%',
                          padding: '10px 16px 10px 38px',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}>🔍</span>
                    </div>

                    <select
                      value={employeeFilterRole}
                      onChange={(e) => setEmployeeFilterRole(e.target.value)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '14px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontFamily: 'Urbanist',
                        fontWeight: 600,
                        outline: 'none',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="All">👥 Alle Rollen</option>
                      <option value="admin">Administrator</option>
                      <option value="secretary">Verwaltung</option>
                    </select>

                    <select
                      value={employeeStatusTab}
                      onChange={(e) => setEmployeeStatusTab(e.target.value as any)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '14px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontFamily: 'Urbanist',
                        fontWeight: 600,
                        outline: 'none',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">⚡ Alle</option>
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </div>

                  {/* DYNAMIC EMPLOYEE LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', width: '100%' }}>
                    {filteredEmployees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Keine Mitarbeiter gefunden. Lege ein neues Profil an oder passe deine Filter an.
                      </div>
                    ) : (
                      filteredEmployees.map((emp: any) => {
                        const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                        const { avatarBg, avatarColor } = getAlphabeticalColor(empName);
                        const roleLabel = emp.role === 'admin' ? 'Admin' : 'Verwaltung';
                        const isActive = emp.is_active ?? true;

                        return (
                          <div
                            key={emp.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("employeeId", emp.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px',
                              borderRadius: '16px',
                              border: '1px solid #f1f5f9',
                              background: '#ffffff',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                              transition: 'all 0.25s ease',
                              minWidth: '850px'
                            }}
                            className="hover-scale"
                          >
                            {/* Avatar & Name Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1.6', minWidth: '180px' }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: avatarBg,
                                color: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                {(emp.first_name?.[0] || 'M')}{(emp.last_name?.[0] || 'W')}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {empName}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: '#86868b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {emp.email || 'Keine E-Mail'}
                                </span>
                              </div>
                            </div>

                            {/* Nickname/Spitzname Badge */}
                            <div style={{ flex: '1', minWidth: '100px' }}>
                              {emp.nickname ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  background: '#f5f5f7',
                                  color: '#0b57d0',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}>
                                  "{emp.nickname}"
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', textAlign: 'center' }}>-</span>
                              )}
                            </div>

                            {/* Role Badge */}
                            <div style={{ flex: '1', minWidth: '100px', display: 'flex', justifyContent: 'center' }}>
                              <span style={{
                                padding: '5px 12px',
                                borderRadius: '10px',
                                background: emp.role === 'admin' ? '#e8f0fe' : '#e2f6ea',
                                color: emp.role === 'admin' ? '#0b57d0' : '#137333',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                minWidth: '75px',
                                textAlign: 'center'
                              }}>
                                {roleLabel}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div style={{ flex: '1', minWidth: '100px', display: 'flex', justifyContent: 'center' }}>
                              <span style={{
                                padding: '5px 12px',
                                borderRadius: '10px',
                                background: isActive ? '#e2f6ea' : '#f5f5f7',
                                color: isActive ? '#137333' : '#86868b',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                minWidth: '55px',
                                textAlign: 'center'
                              }}>
                                {isActive ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </div>

                            {/* Monospace PIN */}
                            <div style={{ flex: '1', minWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.58rem', color: '#86868b', textTransform: 'uppercase', fontWeight: 800 }}>Mitarbeiter-PIN</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <strong style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: '#4b5563' }}>
                                  {emp.ausweis_nummer 
                                    ? (revealedPins[emp.id] ? emp.ausweis_nummer : '••••') 
                                    : 'Keine'}
                                </strong>
                                {emp.ausweis_nummer && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRevealedPins(prev => ({ ...prev, [emp.id]: !prev[emp.id] }));
                                    }}
                                    style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8' }}
                                    title={revealedPins[emp.id] ? 'PIN verbergen' : 'PIN anzeigen'}
                                  >
                                    {revealedPins[emp.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ flex: '1.2', minWidth: '120px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (emp.ausweis_nummer) {
                                    // Copy to clipboard as backup
                                    navigator.clipboard.writeText(emp.ausweis_nummer);
                                    
                                    // Construct mail components
                                    const emailRecipient = emp.email || '';
                                    const subject = encodeURIComponent('Dein Campus-Mitarbeiterzugang 🎓');
                                    const body = encodeURIComponent(
                                      `Hallo ${emp.first_name || 'Mitarbeiter(in)'},\n\n` +
                                      `willkommen im Campus-Team!\n\n` +
                                      `Dein persönlicher Mitarbeiter-PIN für die Anmeldung und Profilverknüpfung lautet:\n` +
                                      `👉 ${emp.ausweis_nummer}\n\n` +
                                      `(Die PIN wurde soeben auch in deine Zwischenablage kopiert)\n\n` +
                                      `Damit kannst du dich auf dem Campus-Portal anmelden oder dein Profil verknüpfen.\n\n` +
                                      `Viele Grüße,\n` +
                                      `Musikschule Bad Säckingen`
                                    );
                                    
                                    window.location.href = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;
                                  } else {
                                    alert('Keine PIN vorhanden.');
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#1a73e8',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontFamily: 'Urbanist'
                                }}
                              >
                                Pass teilen
                              </button>
                              {emp.id !== userId && (currentUserProfile?.role === 'admin' || emp.role !== 'admin') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(emp.id);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ea4335',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: '2px 6px'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Manual Add Employee Modal */}
                  {showAddEmployeeModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                      <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            ➕ Neuen Mitarbeiter hinzufügen
                          </h3>
                          <button 
                            onClick={() => setShowAddEmployeeModal(false)}
                            style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreateEmployee}>
                          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                <input
                                  type="text"
                                  required
                                  value={employeeFirstName}
                                  onChange={(e) => setEmployeeFirstName(e.target.value)}
                                  placeholder="z.B. Clara"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                                <input
                                  type="text"
                                  required
                                  value={employeeLastName}
                                  onChange={(e) => {
                                    setEmployeeLastName(e.target.value);
                                  }}
                                  placeholder="z.B. Schumann"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Spitzname</label>
                              <input
                                type="text"
                                value={employeeNickname}
                                onChange={(e) => setEmployeeNickname(e.target.value)}
                                placeholder="z.B. Clärchen"
                                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                              />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>E-Mail-Adresse *</label>
                              <input
                                type="email"
                                required
                                value={employeeEmail}
                                onChange={(e) => setEmployeeEmail(e.target.value)}
                                placeholder="z.B. clara@musaek.de"
                                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Rolle *</label>
                              <select
                                name="employeeRoleSelect"
                                defaultValue="secretary"
                                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                              >
                                <option value="secretary">Verwaltung</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </div>
                          </div>

                          {/* Modal Footer */}
                          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => setShowAddEmployeeModal(false)}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                            >
                              Abbrechen
                            </button>
                            <button
                              type="submit"
                              className="google-btn-primary"
                              style={{ background: '#0b57d0', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 700 }}
                            >
                              Mitarbeiter anlegen
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar Pane */}
              <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
                
                <div className="google-card" style={{ 
                  padding: '24px', 
                  borderRadius: '24px', 
                  border: '1.5px solid #cbd5e1', 
                  background: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={20} style={{ color: '#0f172a' }} />
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Rollen &amp; Berechtigungen
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: '1.45', fontFamily: 'Inter' }}>
                      Klicke auf eine Rolle, um die Ansicht zu filtern, oder ziehe einen Mitarbeiter hierher, um seine Rolle direkt anzupassen.
                    </p>
                  </div>

                  {/* Role List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* "Alle Rollen anzeigen" Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'All';
                      const isHovered = dragHoveredEmployeeRole === 'All';
                      return (
                        <div
                          onClick={() => setEmployeeFilterRole('All')}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('All');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            // Dropping on "All" doesn't change role, or default to secretary
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #0b57d0' 
                              : isActive 
                                ? '1.5px solid #0b57d0' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#e8f0fe' 
                              : isActive 
                                ? '#e8f0fe' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(11,87,208,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#f1f5f9',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Users size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Alle Rollen anzeigen
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Gesamtübersicht
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#d2e3fc' : '#f1f5f9',
                            color: isActive ? '#1a73e8' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {employees.length} Mitarbeiter
                          </span>
                        </div>
                      );
                    })()}

                    {/* Admin Role Drop Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'admin';
                      const isHovered = dragHoveredEmployeeRole === 'admin';
                      return (
                        <div
                          onClick={() => setEmployeeFilterRole('admin')}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('admin');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            if (empId) {
                              handleUpdateEmployeeRole(empId, 'admin');
                            }
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #0b57d0' 
                              : isActive 
                                ? '1.5px solid #0b57d0' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#e8f0fe' 
                              : isActive 
                                ? '#e8f0fe' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(11,87,208,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#e8f0fe',
                              color: '#0b57d0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <UserCheck size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Administratoren
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Volle Systemrechte
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#d2e3fc' : '#f1f5f9',
                            color: isActive ? '#1a73e8' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {adminCount} Admin
                          </span>
                        </div>
                      );
                    })()}

                    {/* Secretary/Verwaltung Role Drop Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'secretary';
                      const isHovered = dragHoveredEmployeeRole === 'secretary';
                      return (
                        <div
                          onClick={() => setEmployeeFilterRole('secretary')}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('secretary');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            if (empId) {
                              handleUpdateEmployeeRole(empId, 'secretary');
                            }
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #0b57d0' 
                              : isActive 
                                ? '1.5px solid #0b57d0' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#e8f0fe' 
                              : isActive 
                                ? '#e8f0fe' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(11,87,208,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#e2f6ea',
                              color: '#137333',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <UserCheck size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Verwaltung
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Schulsekretariat
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#d2e3fc' : '#f1f5f9',
                            color: isActive ? '#1a73e8' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {secretaryCount} Verwaltung
                          </span>
                        </div>
                      );
                    })()}

                  </div>
                </div>

              </div>

            </div>
          );
        })()}



        {/* TAB 2: CAMPUS */}
        {activeTab === 'campus' && (
          <div className="campus-grid" style={campusSubTab === 'events' ? { gridTemplateColumns: '1fr', gap: 0 } : {}}>
            
            {/* Left Content Pane (Main Board Content) */}
            <div style={{ flex: (campusSubTab === 'onboarding' || campusSubTab === 'students' || campusSubTab === 'cooperations' || campusSubTab === 'events') ? '1' : '1.6', display: 'flex', flexDirection: 'column', gap: '24px', width: (campusSubTab === 'onboarding' || campusSubTab === 'students' || campusSubTab === 'cooperations' || campusSubTab === 'events') ? '100%' : 'auto', minWidth: 0 }}>
              
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

                const uniqueInstruments = Array.from(new Set(allUniqueTeachers.map(t => t.instrument || 'Allgemein')));

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

                  const instrument = (t.instrument || 'Allgemein').toLowerCase();
                  const filterInst = teacherFilterInstrument.toLowerCase();
                  const matchesInstrument = teacherFilterInstrument === 'All' || instrument === filterInst;
                    
                  return matchesSearch && matchesStatus && matchesInstrument;
                });

                return (
                  <div className="google-card" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '24px', 
                    width: '100%',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                  }}>
                    {/* TITLE BLOCK & ACTIONS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={22} style={{ color: '#0f172a' }} />
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          Lehrerverwaltung ({allUniqueTeachers.length})
                        </h3>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setIsCsvExpanded(!isCsvExpanded)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            borderRadius: '12px', 
                            padding: '8px 16px', 
                            fontSize: '0.8rem', 
                            fontWeight: 800,
                            background: isCsvExpanded ? '#f1f5f9' : '#ffffff',
                            color: '#475569',
                            border: '1.5px solid #cbd5e1',
                            cursor: 'pointer',
                            fontFamily: 'Urbanist',
                            transition: 'all 0.2s'
                          }}
                        >
                          📄 Sammel-Onboarding (CSV) ▼
                        </button>

                        <button
                          onClick={() => setShowAddTeacherModal(true)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            borderRadius: '12px', 
                            padding: '8px 16px', 
                            fontSize: '0.8rem', 
                            fontWeight: 800,
                            background: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'Urbanist',
                            boxShadow: '0 4px 10px rgba(34,197,94,0.15)',
                            transition: 'all 0.2s'
                          }}
                        >
                          ➕ Lehrkraft anlegen
                        </button>
                      </div>
                    </div>

                    {/* Collapsible CSV Box */}
                    {isCsvExpanded && (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                            Sammel-Onboarding (Lehrer)
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                            Format pro Zeile: <code>Vorname; Nachname; E-Mail; Hauptinstrument (optional)</code>
                          </span>
                        </div>

                        {teacherFilterInstrument && teacherFilterInstrument !== 'All' && (() => {
                          const instName = teacherFilterInstrument;
                          const { avatarBg: instAvatarBg, avatarColor: instAvatarColor } = getAlphabeticalColor(instName);

                          return (
                            <div style={{
                              background: 'rgba(34, 197, 94, 0.03)',
                              border: '1.5px solid rgba(34, 197, 94, 0.12)',
                              borderRadius: '16px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              marginTop: '2px',
                              marginBottom: '2px',
                              flexWrap: 'wrap',
                              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                                <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                                  ⚡ Smart Auto-Zuweisung:
                                </span>

                                {/* Instrument Pill */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: '#ffffff',
                                  border: '1.5px solid #cbd5e1',
                                  padding: '4px 10px 4px 6px',
                                  borderRadius: '100px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: instAvatarBg,
                                    color: instAvatarColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    fontFamily: 'Urbanist'
                                  }}>
                                    {instName[0]?.toUpperCase() || 'I'}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                    {instName}
                                  </span>
                                  <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Instrument
                                  </span>
                                </div>
                              </div>
                              
                              <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 900, background: '#d1fae5', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                                Hauptinstrument wird automatisch verknüpft!
                              </span>
                            </div>
                          );
                        })()}

                        <textarea
                          value={csvText}
                          onChange={(e) => setCsvText(e.target.value)}
                          placeholder={
                            teacherFilterInstrument && teacherFilterInstrument !== 'All'
                              ? "Markus; Weber; markus@schule.de\nAnna; Becker; anna@schule.de"
                              : "Markus; Weber; markus@schule.de; Gitarre\nAnna; Becker; anna@schule.de; Gesang"
                          }
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
                          onClick={handleImportTeachers}
                          className="google-btn-primary"
                          style={{ background: '#34a853', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start', cursor: 'pointer' }}
                        >
                          Lehrer importieren
                        </button>
                      </div>
                    )}

                    {/* FILTERS ROW */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1.5, minWidth: '240px' }}>
                        <input
                          type="text"
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          placeholder="Lehrkraft nach Name oder E-Mail suchen..."
                          style={{
                            width: '100%',
                            padding: '10px 16px 10px 38px',
                            borderRadius: '14px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontFamily: 'Urbanist',
                            fontWeight: 600,
                            outline: 'none',
                            background: '#ffffff'
                          }}
                        />
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}>🔍</span>
                      </div>

                      <select
                        value={teacherFilterInstrument}
                        onChange={(e) => setTeacherFilterInstrument(e.target.value)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="All">♫ Alle Instrumente</option>
                        {uniqueInstruments.map(inst => (
                          <option key={inst} value={inst}>{inst}</option>
                        ))}
                      </select>

                      <select
                        value={teacherStatusTab}
                        onChange={(e) => setTeacherStatusTab(e.target.value as any)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="all">☇ Alle</option>
                        <option value="active">Aktiv (Campus)</option>
                        <option value="inactive">Inaktiv (Bypass)</option>
                      </select>
                    </div>

                    {/* DYNAMIC TEACHER LIST (HORIZONTAL ROWS) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', width: '100%' }}>
                      {filteredTeachers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          Keine Lehrkräfte gefunden. Lege ein neues Profil an oder passe deine Filter an.
                        </div>
                      ) : (
                        filteredTeachers.map((t: any) => {
                          const isCampus = t.isCampusActive || t.is_campus_active;
                          const isGroove = t.isGroovelabActive || t.is_groovelab_active;
                          const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
                          const { avatarBg, avatarColor } = getAlphabeticalColor(teacherName);

                          return (
                            <div
                              key={t.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("teacherId", t.id);
                              }}
                              onClick={() => setManageTeacher(t)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                borderRadius: '16px',
                                border: '1px solid #f1f5f9',
                                background: '#ffffff',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                                transition: 'all 0.25s ease',
                                minWidth: '850px',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              {/* Avatar & Name Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1.6', minWidth: '180px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '50%',
                                  background: avatarBg,
                                  color: avatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.88rem',
                                  fontFamily: 'Urbanist',
                                  flexShrink: 0
                                }}>
                                  {(t.firstName?.[0] || t.first_name?.[0] || 'L')}{(t.lastName?.[0] || t.last_name?.[0] || 'L')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {teacherName}
                                  </span>
                                  <span style={{ fontSize: '0.74rem', color: '#86868b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {t.email || 'Keine E-Mail'}
                                  </span>
                                </div>
                              </div>

                              {/* Instrument Badge */}
                              <div style={{ flex: '1', minWidth: '100px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  background: '#f5f5f7',
                                  color: '#3a3a3c',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}>
                                  {t.instrument || 'Allgemein'}
                                </span>
                              </div>

                              {/* Status Badges (Campus & Groove) */}
                              <div style={{ flex: '1.25', minWidth: '130px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <span style={{
                                  padding: '5px 12px',
                                  borderRadius: '10px',
                                  background: isCampus ? '#e2f6ea' : '#f5f5f7',
                                  color: isCampus ? '#137333' : '#86868b',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  minWidth: '55px',
                                  textAlign: 'center'
                                }}>
                                  Campus
                                </span>
                                <span style={{
                                  padding: '5px 12px',
                                  borderRadius: '10px',
                                  background: isGroove ? '#fef3c7' : '#f5f5f7',
                                  color: isGroove ? '#b45309' : '#86868b',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  minWidth: '55px',
                                  textAlign: 'center'
                                }}>
                                  Groovelab
                                </span>
                              </div>

                              {/* Pupil Count */}
                              <div style={{ flex: '1', minWidth: '100px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#3a3a3c' }}>
                                <Users size={16} style={{ color: '#86868b' }} />
                                <span>{t.studentCount || 0} Schüler</span>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ flex: '1.2', minWidth: '120px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManageTeacher(t);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#1a73e8',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'Urbanist'
                                  }}
                                >
                                  Pass teilen
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(t.id);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ea4335',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: '2px 6px'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Manual Add Teacher Modal */}
                    {showAddTeacherModal && (
                      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                          {/* Modal Header */}
                          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              ➕ Neue Lehrkraft hinzufügen
                            </h3>
                            <button 
                              onClick={() => setShowAddTeacherModal(false)}
                              style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                            >
                              ✕
                            </button>
                          </div>

                          {/* Modal Body */}
                          <form onSubmit={handleCreateTeacher}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherFirstName}
                                    onChange={(e) => setNewTeacherFirstName(e.target.value)}
                                    placeholder="z.B. Johann"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherLastName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewTeacherLastName(val);
                                      // Suggest email
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
                                  placeholder="z.B. bach@musaek.de"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Instrumente/Fächer *</label>
                                <AppleStyleTokenField
                                  label=""
                                  selectedString={newTeacherInstrument}
                                  onChange={setNewTeacherInstrument}
                                  suggestions={activeSubjectsList}
                                  placeholder="Unterrichtsfächer auswählen..."
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
                                style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
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

              {/* Subtab: Unterrichtsfächer */}
              {campusSubTab === 'subjects' && renderSubjectsBoard()}
              
              {/* Subtab: Schülerboard (Campus-Schülerverwaltung) */}
              {campusSubTab === 'students' && renderCompactStudentBoard()}

              {/* Subtab: Kooperationen */}
              {campusSubTab === 'cooperations' && renderCooperationsBoard()}

              {/* Subtab: Termine Board */}
              {campusSubTab === 'events' && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CampusEventsBoard
                    userId={userId || ''}
                    role="secretary"
                    schoolId={schoolId}
                    supabase={supabase}
                    brandColor="#34a853"
                  />
                </div>
              )}

              {/* Subtab: Schedules – Hybride Raumplanungs-Zentrale */}
              {campusSubTab === 'schedules' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>

                  {/* Action Toolbar */}
                  <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎓 Campus Raum-Koordinationsboard
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                        {schedulesRoomsViewMode === 'live' 
                          ? 'Operativer Tages-Belegungsplan mit Belegungskurven & Ad-hoc-Spontanbuchung' 
                          : 'Wochen-Matrix zur Semesterplanung: Weise Lehrkräfte per Drag & Drop Räumen zu'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px', width: '100%' }}>
                      {/* Segmented Switch for Modes */}
                      <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '9px', border: '1px solid #cbd5e1', width: '300px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setSchedulesRoomsViewMode('designer')}
                          style={{
                            flex: 1,
                            background: schedulesRoomsViewMode === 'designer' ? '#34a853' : 'transparent',
                            color: schedulesRoomsViewMode === 'designer' ? 'white' : '#475569',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          Raumplan-Designer
                        </button>
                        <button
                          type="button"
                          onClick={() => setSchedulesRoomsViewMode('live')}
                          style={{
                            flex: 1,
                            background: schedulesRoomsViewMode === 'live' ? '#34a853' : 'transparent',
                            color: schedulesRoomsViewMode === 'live' ? 'white' : '#475569',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          Raumplan (Live)
                        </button>
                      </div>

                      {schedulesRoomsViewMode === 'designer' && (
                        <>
                          <button
                            type="button"
                            onClick={runAutoRoomAllocation}
                            disabled={matrixAllocations.filter(p => !p.roomId).length === 0}
                            style={{ flex: 1, background: 'white', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, padding: '7px 12px', borderRadius: '10px', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', opacity: matrixAllocations.filter(p => !p.roomId).length === 0 ? 0.5 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          >
                            ⚡ Auto
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Möchtest du wirklich alle Zuteilungen zurücksetzen? Alle Termine werden wieder in die Liste der offenen Zuteilungen verschoben.')) {
                                setMatrixAllocations(prev => prev.map(p => ({ ...p, roomId: null })));
                              }
                            }}
                            style={{ flex: 1, background: 'white', border: '1.5px solid #fca5a5', color: '#b91c1c', fontWeight: 800, padding: '7px 12px', borderRadius: '10px', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          >
                            🔄 Zurücksetzen
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveAndApproveAll}
                            style={{ flex: 1.5, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', fontWeight: 800, padding: '7.5px 14px', borderRadius: '10px', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(16,185,129,0.15)', whiteSpace: 'nowrap' }}
                          >
                            💾 Speichern & Freigeben
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* VIEW MODE 1: DYNAMISCHER LIVE-RAUMPLAN (TIMELINE VIEW) */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {schedulesRoomsViewMode === 'live' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Weekday Switcher (Apple-style Segmented Control) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8e8e93', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>Tag auswählen</span>
                          <span style={{ fontSize: '0.7rem', color: '#8e8e93', fontWeight: 600 }}>Semester-Belegungen</span>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(7, 1fr)', 
                          gap: '2px', 
                          background: '#f1f5f9', 
                          padding: '3px', 
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.02)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          {[1,2,3,4,5,6,7].map(d => {
                            const isSelected = liveViewDay === d;
                            const dayName = ['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][d];
                            const allocationCount = matrixAllocations.filter(p => p.dayOfWeek === d && p.roomId).length;
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setLiveViewDay(d)}
                                style={{
                                  background: isSelected ? '#ffffff' : 'transparent',
                                  border: 'none',
                                  color: isSelected ? '#1c1c1e' : '#636366',
                                  padding: '10px 8px',
                                  borderRadius: '11px',
                                  fontSize: '0.78rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                              >
                                <span>{dayName}</span>
                                <span style={{ 
                                  background: isSelected ? '#34a853' : 'rgba(0, 0, 0, 0.05)', 
                                  color: isSelected ? 'white' : '#636366', 
                                  fontSize: '0.65rem', 
                                  fontWeight: 700, 
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}>
                                  {allocationCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline Board */}
                      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', overflowX: 'auto' }}>
                        {rooms.length === 0 ? (
                          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏫</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Keine Räume gefunden. Bitte zuerst Räume im System anlegen.</span>
                          </div>
                        ) : (
                          <div style={{ minWidth: '800px', position: 'relative' }}>
                            
                            {/* Hour Header Bar */}
                            <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                              <div style={{ width: '180px', flexShrink: 0, fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Raum</div>
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingLeft: '20px', position: 'relative' }}>
                                {['13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'].map((hr, idx) => (
                                  <div key={idx} style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textAlign: 'center', width: '40px', flexShrink: 0, position: 'relative' }}>
                                    {hr}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Room Timeline Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              {rooms.filter(room => room.is_campus_active !== false).map(room => {
                                const roomAllocations = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === liveViewDay);
                                
                                // Conflict checker inside the timeline
                                const hasConflicts = roomAllocations.some(p1 => 
                                  roomAllocations.some(p2 => p1.id !== p2.id && p1.startTime < p2.endTime && p2.startTime < p1.endTime)
                                );

                                return (
                                  <div key={room.id} style={{ display: 'flex', alignItems: 'center', minHeight: '64px', paddingBottom: '8px', borderBottom: '1px solid #f8fafc' }}>
                                    
                                    {/* Left info box */}
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 800 }}>{room.name}</strong>
                                        {hasConflicts && (
                                          <span style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', fontSize: '0.58rem', fontWeight: 900, padding: '1px 5px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Zeitliche Überschneidung!">
                                            ⚠️ KOLLISION
                                          </span>
                                        )}
                                      </div>

                                      
                                    </div>

                                    {/* Right timeline grid area */}
                                    <div style={{ flex: 1, height: '52px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                      
                                      {/* Visual Hour Grid lines */}
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', paddingLeft: '20px', paddingRight: '20px' }}>
                                        {[1,2,3,4,5,6,7,8,9].map(i => (
                                          <div key={i} style={{ borderLeft: '1.5px dashed rgba(226, 232, 240, 0.7)', height: '100%' }} />
                                        ))}
                                      </div>

                                      {/* Absolute Positioned Allocations */}
                                      {roomAllocations.map(plan => {
                                        // Conversion helper
                                        const timeToMins = (t: string) => {
                                          if (!t || !t.includes(':')) return 840; // Default 14:00
                                          const [h, m] = t.split(':').map(Number);
                                          return h * 60 + m;
                                        };

                                        const startMin = timeToMins(plan.startTime);
                                        const endMin = timeToMins(plan.endTime);
                                        
                                        // Timeline starts 13:00 (780 mins), ends 21:00 (1260 mins). Duration 480 mins.
                                        const leftPercent = Math.max(0, Math.min(100, ((startMin - 780) / 480) * 100));
                                        const widthPercent = Math.max(8, Math.min(100 - leftPercent, ((endMin - startMin) / 480) * 100));

                                        const isConflict = roomAllocations.some(p => 
                                          p.id !== plan.id && p.startTime < plan.endTime && plan.startTime < p.endTime
                                        );

                                        // Beautiful pastel coloring depending on instrument
                                        let themeBg = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
                                        let themeBorder = '#10b981';
                                        let themeText = '#065f46';
                                        
                                        if (isConflict) {
                                          themeBg = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
                                          themeBorder = '#ef4444';
                                          themeText = '#991b1b';
                                        } else if (plan.instrument?.toLowerCase().includes('schlagzeug') || plan.instrument?.toLowerCase().includes('drums')) {
                                          themeBg = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
                                          themeBorder = '#3b82f6';
                                          themeText = '#1e3a8a';
                                        } else if (plan.instrument?.toLowerCase().includes('piano') || plan.instrument?.toLowerCase().includes('klavier') || plan.instrument?.toLowerCase().includes('keys')) {
                                          themeBg = 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)';
                                          themeBorder = '#a855f7';
                                          themeText = '#581c87';
                                        } else if (plan.id.startsWith('adhoc_')) {
                                          themeBg = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                                          themeBorder = '#f59e0b';
                                          themeText = '#78350f';
                                        }

                                        return (
                                          <div
                                            key={plan.id}
                                            onClick={() => setSelectedDayPlan(plan)}
                                            style={{
                                              position: 'absolute',
                                              left: `${leftPercent}%`,
                                              width: `${widthPercent}%`,
                                              height: '38px',
                                              background: themeBg,
                                              border: `1.5px solid ${themeBorder}`,
                                              borderLeft: `4.5px solid ${themeBorder}`,
                                              borderRadius: '10px',
                                              padding: '2px 8px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'center',
                                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                              zIndex: isConflict ? 10 : 2,
                                              transition: 'all 0.2s',
                                              overflow: 'hidden'
                                            }}
                                            className="hover-scale-mini"
                                            title={`${getPlanDisplayName(plan)} (${plan.instrument}) : ${plan.startTime} - ${plan.endTime}`}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                              <span style={{ fontSize: '0.67rem', fontWeight: 900, color: themeText, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {getPlanDisplayName(plan)}
                                              </span>
                                              <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', color: themeText, opacity: 0.85 }}>
                                                {plan.startTime} - {plan.endTime}
                                              </span>
                                            </div>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: themeText, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {plan.id.startsWith('adhoc_') ? '⚡ Spontan' : plan.instrument}
                                            </span>
                                          </div>
                                        );
                                      })}

                                      {roomAllocations.length === 0 && (
                                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.67rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.02em' }}>
                                          ☕ Frei · Keine Zuweisungen
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* VIEW MODE 2: UPGRADED RAUMPLAN-DESIGNER (MATRIX GRID)    */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {schedulesRoomsViewMode === 'designer' && (
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
                            {[1,2,3,4,5,6,7].map(d => <col key={d} />)}
                          </colgroup>

                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                              <th style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Raum</th>
                              {[1,2,3,4,5,6,7].map(d => (
                                <th key={d} style={{ padding: '10px 10px', fontSize: '0.75rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                                  {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][d]}
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
                              {[1,2,3,4,5,6,7].map(dayNum => {
                                const unassigned = matrixAllocations.filter(p => {
                                  if (p.roomId) return false;
                                  if (p.dayOfWeek !== dayNum) return false;
                                  if (selectedFilterTeacherId && p.teacherId !== selectedFilterTeacherId) return false;
                                  return true;
                                });
                                return (
                                  <td
                                    key={dayNum}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDropOnMatrix(null, dayNum)}
                                    style={{ padding: '8px', verticalAlign: 'top', minHeight: '72px', position: 'relative' }}
                                  >
                                    {unassigned.length === 0 ? (
                                      <div style={{
                                        height: '56px',
                                        borderRadius: '10px',
                                        border: '2px dashed rgba(245, 158, 11, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(245, 158, 11, 0.35)',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        background: 'rgba(254, 243, 199, 0.05)'
                                      }}>
                                        Leer
                                      </div>
                                    ) : (
                                      <div style={{ position: 'relative', width: '100%', minHeight: '64px', marginBottom: unassigned.length > 1 ? '8px' : '0' }}>
                                        {/* Stapel-Effekt (Hintergrundkarten) */}
                                        {unassigned.length >= 3 && (
                                          <div style={{ position: 'absolute', bottom: '-8px', left: '8px', right: '8px', height: '52px', background: '#fefbeb', border: '1px solid #fef3c7', borderRadius: '10px', zIndex: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }} />
                                        )}
                                        {unassigned.length >= 2 && (
                                          <div style={{ position: 'absolute', bottom: '-4px', left: '4px', right: '4px', height: '52px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', zIndex: 1, boxShadow: '0 2px 4px rgba(245,158,11,0.03)' }} />
                                        )}
                                        
                                        {/* Hauptkarte (Vordergrund) */}
                                        {(() => {
                                          const topPlan = unassigned[0];
                                          return (
                                            <div
                                              draggable
                                              onDragStart={() => handleDragStartMatrix(topPlan.id)}
                                              onDragEnd={() => {
                                                setDraggedPlanId(null);
                                                setDraggedPlanDay(null);
                                              }}
                                              onClick={(e) => {
                                                setSelectedDayPlan(topPlan);
                                                e.stopPropagation();
                                              }}
                                              style={{
                                                position: 'relative',
                                                zIndex: 2,
                                                background: '#fffbeb',
                                                border: '1px solid #fde68a',
                                                borderLeft: '4px solid #f59e0b',
                                                borderRadius: '10px',
                                                padding: '7px 9px',
                                                cursor: 'grab',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px',
                                                boxShadow: '0 4px 8px rgba(245,158,11,0.06)'
                                              }}
                                            >
                                              <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getPlanDisplayName(topPlan)}</span>
                                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#b45309' }}>{topPlan.instrument}</span>
                                              <span style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: '#d97706' }}>⏱ {topPlan.startTime}–{topPlan.endTime}</span>
                                              
                                              {/* Anzahl-Badge */}
                                              {unassigned.length > 1 && (
                                                <span style={{
                                                  position: 'absolute',
                                                  top: '-6px',
                                                  right: '-6px',
                                                  background: '#f59e0b',
                                                  color: 'white',
                                                  fontSize: '0.58rem',
                                                  fontWeight: 900,
                                                  padding: '2px 5px',
                                                  borderRadius: '6px',
                                                  boxShadow: '0 2px 4px rgba(245,158,11,0.25)',
                                                  zIndex: 10
                                                }}>
                                                  +{unassigned.length - 1}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* ── Room rows ── */}
                            {rooms.filter(room => room.is_campus_active !== false).map((room, rIdx) => {
                              // Smart instrument compatibility check for visual highlighting
                              const draggedPlan = draggedPlanId ? matrixAllocations.find(p => p.id === draggedPlanId) : null;
                              
                              let isCompatible = true;
                              if (draggedPlan && draggedPlan.instrument) {
                                const unsuitable = room.unsuitable_instruments || (() => {
                                  try {
                                    const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                                    return map[room.id] || [];
                                  } catch { return []; }
                                })();
                                isCompatible = !unsuitable.some((inst: string) => inst.toLowerCase() === draggedPlan.instrument.toLowerCase());
                              }

                              return (
                                <tr key={room.id} style={{ borderBottom: rIdx < rooms.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                  <td style={{ padding: '12px', verticalAlign: 'top', background: draggedPlanId && !isCompatible ? '#fef2f2' : 'transparent', transition: 'background 0.25s' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <strong style={{ fontSize: '0.78rem', color: draggedPlanId && !isCompatible ? '#991b1b' : '#0f172a', fontWeight: 800 }}>
                                        {room.name}
                                      </strong>
                                      {draggedPlanId && !isCompatible && (
                                        <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 600 }}>
                                          ⚠️ Nicht geeignet
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {[1,2,3,4,5,6,7].map(dayNum => {
                                    const cellPlans = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === dayNum);
                                    
                                    // Visual highlight styling based on compatibility
                                    let borderStyle = '2px dashed transparent';
                                    let cellBg = 'transparent';
                                    if (draggedPlanId && draggedPlanDay === dayNum) {
                                      if (isCompatible) {
                                        borderStyle = '2px dashed #34a853';
                                        cellBg = 'rgba(52, 168, 83, 0.03)';
                                      } else {
                                        borderStyle = '2px dashed #f59e0b';
                                        cellBg = 'rgba(245, 158, 11, 0.03)';
                                      }
                                    }

                                    return (
                                      <td
                                        key={dayNum}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDropOnMatrix(room.id, dayNum)}
                                        style={{ padding: '8px', verticalAlign: 'top' }}
                                      >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: '64px', borderRadius: '10px', border: borderStyle, background: cellBg, opacity: draggedPlanId && draggedPlanDay !== dayNum ? 0.35 : 1, padding: draggedPlanId && draggedPlanDay === dayNum ? '4px' : '0', transition: 'all 0.2s', cursor: draggedPlanId && draggedPlanDay !== dayNum ? 'not-allowed' : 'default' }}>
                                          {cellPlans.map(plan => {
                                            const hasOverlap = cellPlans.some(p => p.id !== plan.id && p.startTime < plan.endTime && plan.startTime < p.endTime);
                                            return (
                                              <div
                                                key={plan.id}
                                                draggable
                                                onDragStart={() => handleDragStartMatrix(plan.id)}
                                                onClick={() => setSelectedDayPlan(plan)}
                                                style={{ background: hasOverlap ? 'rgba(254, 226, 226, 0.45)' : 'rgba(220, 252, 231, 0.45)', border: hasOverlap ? '2px dashed #ef4444' : '1px solid #e2e8f0', borderLeft: hasOverlap ? '4px solid #ef4444' : '4px solid #10b981', borderRadius: '10px', padding: '7px 9px', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'all 0.15s' }}
                                              >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: hasOverlap ? '#991b1b' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {getPlanDisplayName(plan)}
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
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* DIALOG POPUP: SPONTANE AD-HOC BELEGUNG BUCHEN            */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {showAdHocBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!adHocTeacherId) {
                            alert('Bitte wähle eine Lehrkraft.');
                            return;
                          }
                          const chosenTeacher = campusTeachers.find(t => t.id === adHocTeacherId);
                          const name = chosenTeacher ? `${chosenTeacher.firstName} ${chosenTeacher.lastName}` : 'Lehrkraft';
                          const instrument = chosenTeacher ? chosenTeacher.instrument : 'Instrument';

                          // Compute end time: startTime (e.g. "14:15") + duration (minutes)
                          const [h, m] = adHocStartTime.split(':').map(Number);
                          let totalMins = h * 60 + m + adHocDuration;
                          const endH = Math.floor(totalMins / 60) % 24;
                          const endM = totalMins % 60;
                          const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                          const newPlanId = `adhoc_${Date.now()}`;
                          const newPlanEntry = {
                            id: newPlanId,
                            teacherId: adHocTeacherId,
                            teacherName: name,
                            instrument: instrument,
                            dayOfWeek: liveViewDay,
                            startTime: adHocStartTime,
                            endTime: endTimeStr,
                            roomId: adHocRoomId,
                            status: 'approved',
                            slots: [
                              {
                                student_name: adHocStudentName.trim() || 'Spontane Buchung (Freies Üben)',
                                time_slot: adHocStartTime,
                                duration: adHocDuration,
                                student_id: null
                              }
                            ]
                          };

                          setMatrixAllocations(prev => [...prev, newPlanEntry]);
                          setShowAdHocBooking(false);
                          setAdHocStudentName('');
                          alert('Spontanbelegung erfolgreich eingebucht! ⚡');
                        }}
                        style={{ background: 'white', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.5)', width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 24px 64px rgba(15,23,42,0.18)', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}
                      >
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>⚡ Spontanbelegung buchen</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 550 }}>
                            Buche ad-hoc freie Zeitkapazitäten für {rooms.find(r => r.id === adHocRoomId)?.name || 'diesen Raum'}.
                          </p>
                        </div>

                        {/* Teacher Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lehrkraft auswählen</label>
                          <select
                            required
                            value={adHocTeacherId}
                            onChange={(e) => setAdHocTeacherId(e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#475569', cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="">— Bitte Lehrkraft wählen —</option>
                            {campusTeachers.map(t => (
                              <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.instrument})</option>
                            ))}
                          </select>
                        </div>

                        {/* Student Name input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schüler / Zweck (Optional)</label>
                          <input
                            type="text"
                            placeholder="z.B. Nachholstunde Max Muster, oder Freies Üben"
                            value={adHocStudentName}
                            onChange={(e) => setAdHocStudentName(e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          {/* Start time */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Startzeit</label>
                            <input
                              type="time"
                              required
                              value={adHocStartTime}
                              onChange={(e) => setAdHocStartTime(e.target.value)}
                              style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                            />
                          </div>

                          {/* Duration selector */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dauer</label>
                            <select
                              value={adHocDuration}
                              onChange={(e) => setAdHocDuration(Number(e.target.value))}
                              style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#475569', cursor: 'pointer', outline: 'none' }}
                            >
                              <option value={30}>30 Minuten</option>
                              <option value={45}>45 Minuten</option>
                              <option value={60}>60 Minuten</option>
                              <option value={90}>90 Minuten</option>
                            </select>
                          </div>
                        </div>

                        {/* Submit / Cancel Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                          <button
                            type="submit"
                            style={{ flex: 2, background: '#34a853', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(52,168,83,0.2)' }}
                          >
                            Einbuchen & Reservieren
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdHocBooking(false);
                              setAdHocStudentName('');
                            }}
                            style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* DETAIL DRAWER PANEL (CLICK ON ANY PLAN BLOCK TO INSPECT) */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {selectedDayPlan && (
                    <div style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', background: 'white', boxShadow: '-12px 0 48px rgba(15,23,42,0.14)', borderLeft: '1px solid #e2e8f0', zIndex: 1050, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                            {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][selectedDayPlan.dayOfWeek]} Plan
                          </span>
                          <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>{getPlanDisplayName(selectedDayPlan)}</h3>
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
                          {rooms.filter(r => r.is_campus_active !== false).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        
                        {!selectedDayPlan.id.startsWith('adhoc_') && (
                          <button
                            onClick={() => handleRejectTeacherDayPlan(selectedDayPlan)}
                            style={{ background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                          >
                            ↩ Zur Überarbeitung zurückweisen
                          </button>
                        )}

                        {/* Split / Merge Block Controls */}
                        {(() => {
                          const splits = getSplitPoints(selectedDayPlan);
                          const isAlreadySplit = selectedDayPlan.id.includes('_split');
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                              {isAlreadySplit && (
                                <button
                                  onClick={() => handleMergePlans(selectedDayPlan)}
                                  style={{ background: 'rgba(16,185,129,0.05)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  🔗 Aufteilung aufheben (Zusammenfügen)
                                </button>
                              )}
                              
                              {!isAlreadySplit && splits.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Block aufteilen (Pause gefunden)</span>
                                  {splits.map((pt, pIdx) => (
                                    <button
                                      key={pIdx}
                                      onClick={() => handleSplitPlan(selectedDayPlan, pt.index)}
                                      style={{ background: 'rgba(245,158,11,0.05)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                                    >
                                      ✂️ Block teilen an Pause um {pt.time} ({pt.duration} Min.)
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Slot list */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Stundenliste</h4>
                        {selectedDayPlan.slots.map((slot: any, idx: number) => {
                          const isBreak = !slot.student_id && !selectedDayPlan.id.startsWith('adhoc_');
                          return (
                            <div key={idx} style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: isBreak ? '#fffbeb' : '#f8fafc', borderLeft: isBreak ? '4px solid #f59e0b' : '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f' }}>
                                  {isBreak ? '☕ Pause' : slot.student_name}
                                </span>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                                  {isBreak ? 'Pause' : `Instrument: ${slot.student_instrument || selectedDayPlan.instrument || 'Instrument'}`}
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
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>🎓 Campus System aktivieren</span>
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
            {campusSubTab !== 'events' && (
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
              {campusSubTab === 'onboarding' && (() => {
                const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const instrumentCounts = allUniqueTeachers.reduce((acc: Record<string, number>, t: any) => {
                  const inst = t.instrument || 'Allgemein';
                  acc[inst] = (acc[inst] || 0) + 1;
                  return acc;
                }, {});

                const sortedInstruments = [...activeSubjectsList].sort((a, b) => a.localeCompare(b, 'de'));

                return (
                  <div className="google-card" style={{ 
                    padding: '24px', 
                    borderRadius: '24px', 
                    border: '1.5px solid #cbd5e1', 
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Music size={20} style={{ color: '#0f172a' }} />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          Instrumente
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: '1.45', fontFamily: 'Inter' }}>
                        Klicke auf ein Instrument, um das Sammel-Onboarding zu filtern und Lehrer direkt dafür anzulegen.
                      </p>
                    </div>

                    {/* Instrument List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      {/* "Alle Instrumente anzeigen" Row */}
                      {(() => {
                        const isActive = teacherFilterInstrument === 'All';
                        const isHovered = dragHoveredInstrument === 'All';
                        return (
                          <div
                            onClick={() => setTeacherFilterInstrument('All')}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoveredInstrument('All');
                            }}
                            onDragLeave={() => setDragHoveredInstrument(null)}
                            onDrop={(e) => {
                              const teacherId = e.dataTransfer.getData("teacherId");
                              if (teacherId) {
                                handleUpdateTeacherInstrument(teacherId, 'Allgemein');
                              }
                              setDragHoveredInstrument(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered 
                                ? '2px dashed #22c55e' 
                                : isActive 
                                  ? '1.5px solid #22c55e' 
                                  : '1.5px solid #cbd5e1',
                              background: isHovered 
                                ? '#f0fdf4' 
                                : isActive 
                                  ? '#f0fdf4' 
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px rgba(34,197,150,0.06)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Circle Icon */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Music size={18} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  Alle Instrumente anzeigen
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Gesamtübersicht
                                </span>
                              </div>
                            </div>
                            
                            {/* Badge */}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#d1fae5' : '#f1f5f9',
                              color: isActive ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {allUniqueTeachers.length} Lehrer
                            </span>
                          </div>
                        );
                      })()}

                      {/* Individual Instrument Rows */}
                      {sortedInstruments.map((instName) => {
                        const isActive = teacherFilterInstrument === instName;
                        const isHovered = dragHoveredInstrument === instName;
                        const count = instrumentCounts[instName] || 0;
                        
                        const { avatarBg, avatarColor } = getAlphabeticalColor(instName);

                        return (
                          <div
                            key={instName}
                            onClick={() => setTeacherFilterInstrument(isActive ? 'All' : instName)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoveredInstrument(instName);
                            }}
                            onDragLeave={() => setDragHoveredInstrument(null)}
                            onDrop={(e) => {
                              const teacherId = e.dataTransfer.getData("teacherId");
                              if (teacherId) {
                                handleUpdateTeacherInstrument(teacherId, instName);
                              }
                              setDragHoveredInstrument(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered 
                                ? '2px dashed #22c55e' 
                                : isActive 
                                  ? '1.5px solid #22c55e' 
                                  : '1.5px solid #f1f5f9',
                              background: isHovered 
                                ? '#f0fdf4' 
                                : isActive 
                                  ? '#f0fdf4' 
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Circle Icon with first letter */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: avatarBg,
                                color: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 900,
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                {instName[0]?.toUpperCase() || 'I'}
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                {instName}
                              </span>
                            </div>
                            
                            {/* Badge */}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#d1fae5' : '#f1f5f9',
                              color: isActive ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {count} Lehrer
                            </span>
                          </div>
                        );
                      })}

                    </div>
                  </div>
                );
              })()}

              {/* Student Board Sidebar */}
              {campusSubTab === 'students' && (() => {
                const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const getAvatarGradient = (name: string) => getAlphabeticalColor(name).avatarBg;
                const getAvatarTextColor = (name: string) => getAlphabeticalColor(name).avatarColor;

                return (
                  <div className="google-card" style={{
                    width: '340px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Lehrer
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.45, fontFamily: 'Inter' }}>
                      Klicke auf einen Lehrer, um das Sammel-Onboarding zu filtern und direkt Schüler für ihn zu erfassen.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                      
                      {/* Option / Slot für Alle Lehrer */}
                      {(() => {
                        const isActive = studentFilterTeacher === 'All';
                        return (
                          <div
                            onClick={() => {
                              setStudentFilterTeacher('All');
                              setStudentCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isActive 
                                ? '1.5px solid #22c55e' 
                                : '1.5px solid #f1f5f9',
                              background: isActive 
                                ? '#f0fdf4' 
                                : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px rgba(34,197,150,0.06)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#e2f6ea',
                                color: '#137333',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                flexShrink: 0
                              }}>
                                👥
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  Alle Lehrer anzeigen
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Gesamtübersicht
                                </span>
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#d1fae5' : '#f1f5f9',
                              color: isActive ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {students.length} Schüler
                            </span>
                          </div>
                        );
                      })()}

                      {/* Fixed "Allgemein" entry for students without a teacher */}
                      {(() => {
                        const unassignedCount = students.filter(s => !s.teacher_id).length;
                        const isSelected = studentFilterTeacher === 'none';
                        const isHovered = dragHoveredTeacher === 'none';
                        return (
                          <div
                            key="allgemein"
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoveredTeacher('none');
                            }}
                            onDragLeave={() => setDragHoveredTeacher(null)}
                            onDrop={(e) => {
                              const studentId = e.dataTransfer.getData("studentId");
                              if (studentId) {
                                handleUpdateStudentTeacher(studentId, null);
                              }
                              setDragHoveredTeacher(null);
                            }}
                            onClick={() => {
                              setStudentFilterTeacher('none');
                              setStudentCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered
                                ? '2px dashed #94a3b8'
                                : isSelected
                                  ? '1.5px solid #cbd5e1'
                                  : '1.5px solid #f1f5f9',
                              background: isHovered
                                ? '#f8fafc'
                                : isSelected
                                  ? '#f1f5f9'
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 900,
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                AL
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  Allgemein
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Ohne Lehrerzuweisung
                                </span>
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isSelected ? '#e2e8f0' : '#f1f5f9',
                              color: isSelected ? '#334155' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {unassignedCount} Schüler
                            </span>
                          </div>
                        );
                      })()}

                      {allUniqueTeachers.map((t: any) => {
                        const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
                        const assignedCount = students.filter(s => s.teacher_id === t.id).length;
                        const initials = `${t.firstName?.[0] || t.first_name?.[0] || ''}${t.lastName?.[0] || t.last_name?.[0] || ''}`.toUpperCase() || 'D';
                        const isSelected = studentFilterTeacher === t.id;
                        const isHovered = dragHoveredTeacher === t.id;

                        const avatarBg = getAvatarGradient(teacherName);
                        const avatarColor = getAvatarTextColor(teacherName);

                        return (
                          <div
                            key={t.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoveredTeacher(t.id);
                            }}
                            onDragLeave={() => setDragHoveredTeacher(null)}
                            onDrop={(e) => {
                              const studentId = e.dataTransfer.getData("studentId");
                              if (studentId) {
                                handleUpdateStudentTeacher(studentId, t.id);
                              }
                              setDragHoveredTeacher(null);
                            }}
                            onClick={() => {
                              setStudentFilterTeacher(t.id);
                              setStudentCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered 
                                ? '2px dashed #22c55e' 
                                : isSelected 
                                  ? '1.5px solid #22c55e' 
                                  : '1.5px solid #f1f5f9',
                              background: isHovered 
                                ? '#f0fdf4' 
                                : isSelected 
                                  ? '#f0fdf4' 
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: avatarBg,
                                color: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 900,
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                {initials}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {teacherName}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.instrument || 'Lehrer'}
                                </span>
                              </div>
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isSelected ? '#d1fae5' : '#f1f5f9',
                              color: isSelected ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {assignedCount} Schüler
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Cooperations Sidebar */}
              {campusSubTab === 'cooperations' && (() => {
                const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                // Filter teachers to only show those who have "kooperation" in their instrument/subjects
                const coopTeachersList = allUniqueTeachers.filter(t => 
                  (t.instrument || '').toLowerCase().includes('kooperation')
                );

                const getAvatarGradient = (name: string) => getAlphabeticalColor(name).avatarBg;
                const getAvatarTextColor = (name: string) => getAlphabeticalColor(name).avatarColor;

                return (
                  <div className="google-card" style={{
                    width: '340px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Kooperationslehrer
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 550, lineHeight: 1.45, fontFamily: 'Inter' }}>
                      Klicke auf eine Lehrkraft, um das Kooperationen-Board nach ihr zu filtern.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                      
                      {/* Option: Alle Lehrer anzeigen */}
                      {(() => {
                        const isActive = cooperationFilterTeacher === 'All';
                        return (
                          <div
                            onClick={() => {
                              setCooperationFilterTeacher('All');
                              setCooperationCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isActive 
                                ? '1.5px solid #22c55e' 
                                : '1.5px solid #f1f5f9',
                              background: isActive 
                                ? '#f0fdf4' 
                                : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px rgba(34,197,150,0.06)' : 'none'
                            }}
                            className="hover-scale-mini"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 800
                              }}>
                                👥
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', fontFamily: 'Urbanist' }}>
                                  Alle Lehrer anzeigen
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Gesamtübersicht
                                </span>
                              </div>
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#d1fae5' : '#f1f5f9',
                              color: isActive ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist'
                            }}>
                              {cooperations.length} Koop.
                            </span>
                          </div>
                        );
                      })()}

                      {/* Option: Allgemein (Kein Lehrer zugewiesen) */}
                      {(() => {
                        const isActive = cooperationFilterTeacher === 'none';
                        const unassignedCount = cooperations.filter(c => !c.teacher_id).length;
                        return (
                          <div
                            onClick={() => {
                              setCooperationFilterTeacher('none');
                              setCooperationCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isActive 
                                ? '1.5px solid #22c55e' 
                                : '1.5px solid #f1f5f9',
                              background: isActive 
                                ? '#f0fdf4' 
                                : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px rgba(34,197,150,0.06)' : 'none'
                            }}
                            className="hover-scale-mini"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#f5f5f7',
                                color: '#86868b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 800
                              }}>
                                ⬜
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', fontFamily: 'Urbanist' }}>
                                  Allgemein
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Ohne Lehrerzuweisung
                                </span>
                              </div>
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#d1fae5' : '#f1f5f9',
                              color: isActive ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist'
                            }}>
                              {unassignedCount} Koop.
                            </span>
                          </div>
                        );
                      })()}

                      {/* List each teacher who has Kooperationen as subject */}
                      {coopTeachersList.map((t: any) => {
                        const isSelected = cooperationFilterTeacher === t.id;
                        const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
                        const tInitials = `${t.firstName?.[0] || t.first_name?.[0] || ''}${t.lastName?.[0] || t.last_name?.[0] || ''}`.toUpperCase() || 'D';
                        const tAvatarBg = getAvatarGradient(teacherName);
                        const tAvatarColor = getAvatarTextColor(teacherName);
                        const assignedCount = cooperations.filter(c => c.teacher_id === t.id).length;

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setCooperationFilterTeacher(isSelected ? 'All' : t.id);
                              setCooperationCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isSelected 
                                ? '1.5px solid #22c55e' 
                                : '1.5px solid #f1f5f9',
                              background: isSelected 
                                ? '#f0fdf4' 
                                : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isSelected ? '0 4px 12px rgba(34,197,150,0.06)' : 'none'
                            }}
                            className="hover-scale-mini"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: tAvatarBg,
                                color: tAvatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                flexShrink: 0
                              }}>
                                {tInitials}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ 
                                  fontSize: '0.82rem', 
                                  fontWeight: 800, 
                                  color: '#1e293b', 
                                  fontFamily: 'Urbanist',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {teacherName}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.instrument || 'Lehrer'}
                                </span>
                              </div>
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isSelected ? '#d1fae5' : '#f1f5f9',
                              color: isSelected ? '#065f46' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {assignedCount} Koop.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Schedules Sidebar – Live Stats & Submissions */}
              {campusSubTab === 'schedules' && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  minWidth: '320px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif'
                }}>
                  
                  {/* Segmented Control for Switchable Tabs */}
                  <div style={{
                    display: 'flex',
                    background: 'rgba(120, 120, 128, 0.08)',
                    padding: '2px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.02)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setSchedulesSidebarTab('submissions')}
                      style={{
                        flex: 1,
                        background: schedulesSidebarTab === 'submissions' ? '#ffffff' : 'transparent',
                        color: schedulesSidebarTab === 'submissions' ? '#1c1c1e' : '#8e8e93',
                        border: 'none',
                        boxShadow: schedulesSidebarTab === 'submissions' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)' : 'none',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ClipboardList size={13} style={{ color: schedulesSidebarTab === 'submissions' ? '#007aff' : '#8e8e93' }} />
                      Einreichungen
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulesSidebarTab('stats')}
                      style={{
                        flex: 1,
                        background: schedulesSidebarTab === 'stats' ? '#ffffff' : 'transparent',
                        color: schedulesSidebarTab === 'stats' ? '#1c1c1e' : '#8e8e93',
                        border: 'none',
                        boxShadow: schedulesSidebarTab === 'stats' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)' : 'none',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <BarChart2 size={13} style={{ color: schedulesSidebarTab === 'stats' ? '#007aff' : '#8e8e93' }} />
                      Wochenauslastung
                    </button>
                  </div>

                  {schedulesSidebarTab === 'submissions' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Submissions header */}
                      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#1c1c1e' }}>
                        Offene Zuteilungen ({matrixAllocations.filter(p => !p.roomId).length} Tage offen)
                      </h4>

                      {/* Compact Search Filter for 50+ Teachers */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={13} style={{ position: 'absolute', left: '10px', color: '#8e8e93', pointerEvents: 'none' }} />
                        <input
                          type="text"
                          placeholder="Lehrkraft filtern..."
                          value={sidebarTeacherSearch}
                          onChange={(e) => setSidebarTeacherSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px 7px 28px',
                            fontSize: '0.74rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            background: 'rgba(120, 120, 128, 0.04)',
                            color: '#1c1c1e',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      {/* Group and render submissions */}
                      {(() => {
                        const unassigned = matrixAllocations.filter(p => !p.roomId);
                        
                        // Group by teacher
                        const grouped: Record<string, { teacherName: string, instrument: string, blocks: any[] }> = {};
                        unassigned.forEach(p => {
                          if (!grouped[p.teacherId]) {
                            grouped[p.teacherId] = {
                              teacherName: p.teacherName,
                              instrument: p.instrument,
                              blocks: []
                            };
                          }
                          grouped[p.teacherId].blocks.push(p);
                        });

                        // Filter by search query
                        const filteredTeachers = Object.entries(grouped).filter(([_, data]) => 
                          data.teacherName.toLowerCase().includes(sidebarTeacherSearch.toLowerCase().trim())
                        );

                        if (filteredTeachers.length === 0) {
                          return (
                            <div style={{
                              padding: '24px 16px',
                              textAlign: 'center',
                              background: 'rgba(52, 199, 89, 0.05)',
                              borderRadius: '12px',
                              border: '1px dashed rgba(52, 199, 89, 0.3)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(52, 199, 89, 0.1)',
                                color: '#34c759'
                              }}>
                                <CheckCircle size={16} />
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                                Alle Stundenpläne erfolgreich zugeteilt!
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* "Alle Lehrer" Button */}
                            <button
                              onClick={() => {
                                setSelectedFilterTeacherId(null);
                                setExpandedSidebarTeacherId(null);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: selectedFilterTeacherId === null ? '#007aff' : 'rgba(120, 120, 128, 0.08)',
                                color: selectedFilterTeacherId === null ? '#ffffff' : '#1c1c1e',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.15s ease',
                                boxShadow: selectedFilterTeacherId === null ? '0 1px 3px rgba(0, 122, 255, 0.2)' : 'none'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={13} style={{ color: selectedFilterTeacherId === null ? '#ffffff' : '#8e8e93' }} />
                                Alle Lehrer anzeigen
                              </span>
                              <span style={{ 
                                fontSize: '0.66rem', 
                                background: selectedFilterTeacherId === null ? 'rgba(255,255,255,0.25)' : 'rgba(120, 120, 128, 0.12)', 
                                padding: '1px 5px', 
                                borderRadius: '6px', 
                                color: selectedFilterTeacherId === null ? '#ffffff' : '#8e8e93',
                                fontWeight: 700 
                              }}>
                                {unassigned.length}
                              </span>
                            </button>

                            {filteredTeachers.map(([tId, data]) => {
                              const isSelected = selectedFilterTeacherId === tId;
                              const isExpanded = expandedSidebarTeacherId === tId;
                              return (
                                <div 
                                  key={tId} 
                                  style={{ 
                                    background: '#ffffff', 
                                    border: isSelected ? '1px solid rgba(0, 122, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.06)', 
                                    borderRadius: '10px', 
                                    overflow: 'hidden',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 2px 8px rgba(0, 122, 255, 0.06)' : '0 1px 2px rgba(0,0,0,0.01)',
                                    borderLeft: isSelected ? '3px solid #007aff' : '1px solid rgba(0, 0, 0, 0.06)'
                                  }}
                                >
                                  {/* Accordion Header */}
                                  <div 
                                    onClick={() => {
                                      setSelectedFilterTeacherId(isSelected ? null : tId);
                                      setExpandedSidebarTeacherId(isExpanded ? null : tId);
                                    }}
                                    style={{ 
                                      padding: '9px 12px', 
                                      cursor: 'pointer', 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      background: isSelected ? 'rgba(0, 122, 255, 0.03)' : '#ffffff',
                                      borderBottom: isExpanded ? '1px solid rgba(0, 0, 0, 0.04)' : 'none'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <ChevronRight size={10} style={{ 
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                        transition: 'transform 0.15s ease-out', 
                                        marginRight: '6px', 
                                        color: isSelected ? '#007aff' : '#8e8e93' 
                                      }} />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: isSelected ? '#007aff' : '#1c1c1e' }}>{data.teacherName}</span>
                                        <span style={{ fontSize: '0.62rem', color: '#8e8e93', fontWeight: 500 }}>{data.instrument}</span>
                                      </div>
                                    </div>
                                    <span style={{ 
                                      fontSize: '0.66rem', 
                                      background: isSelected ? 'rgba(0,122,255,0.1)' : 'rgba(120, 120, 128, 0.08)', 
                                      color: isSelected ? '#007aff' : '#8e8e93', 
                                      fontWeight: 700, 
                                      padding: '1px 5px', 
                                      borderRadius: '6px' 
                                    }}>
                                      {data.blocks.length} {data.blocks.length === 1 ? 'Tag' : 'Tage'}
                                    </span>
                                  </div>

                                  {/* Collapsible content (Accordion Details) */}
                                  {isExpanded && (
                                    <div style={{ padding: '6px 8px 8px 8px', background: 'rgba(120, 120, 128, 0.04)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                                        {[...data.blocks]
                                          .sort((a, b) => {
                                            if (a.dayOfWeek !== b.dayOfWeek) {
                                              return a.dayOfWeek - b.dayOfWeek;
                                            }
                                            return (a.startTime || '').localeCompare(b.startTime || '');
                                          })
                                          .map((block, idx, sortedArr) => (
                                          <div 
                                            key={block.id}
                                            draggable
                                            onDragStart={() => handleDragStartMatrix(block.id)}
                                            style={{
                                              background: '#ffffff',
                                              borderBottom: idx < sortedArr.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                                              padding: '8px 10px',
                                              cursor: 'grab',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '6px'
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={11} style={{ color: '#007aff' }} />
                                                {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][block.dayOfWeek]}
                                              </span>
                                              <span style={{ fontSize: '0.66rem', fontWeight: 500, color: '#8e8e93' }}>
                                                {block.startTime}–{block.endTime}
                                              </span>
                                            </div>
                                            
                                            {/* Room quick selection dropdown (Apple Select style) */}
                                            <select
                                              defaultValue=""
                                              onChange={(e) => {
                                                const rId = e.target.value;
                                                if (rId) {
                                                  const room = rooms.find(r => r.id === rId);
                                                  if (room) {
                                                    const unsuitable = room.unsuitable_instruments || (() => {
                                                      try {
                                                        const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                                                        return map[room.id] || [];
                                                      } catch { return []; }
                                                    })();
                                                    if (unsuitable.some((inst: string) => inst.toLowerCase() === block.instrument?.toLowerCase())) {
                                                      alert(`Zuteilung verweigert: Raum "${room.name}" ist akustisch ungeeignet für das Instrument "${block.instrument}".`);
                                                      e.target.value = "";
                                                      return;
                                                    }
                                                  }
                                                  setMatrixAllocations(prev => prev.map(p => p.id === block.id ? { ...p, roomId: rId } : p));
                                                }
                                              }}
                                              style={{
                                                width: '100%',
                                                fontSize: '0.68rem',
                                                padding: '5px 24px 5px 8px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                outline: 'none',
                                                background: 'rgba(120, 120, 128, 0.08)',
                                                color: '#1c1c1e',
                                                fontWeight: 500,
                                                appearance: 'none',
                                                WebkitAppearance: 'none',
                                                backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%238e8e93\' height=\'14\' viewBox=\'0 0 24 24\' width=\'14\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>")',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPositionX: '97%',
                                                backgroundPositionY: '50%',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <option value="" disabled>Raum zuweisen...</option>
                                              {rooms.filter(rm => rm.is_campus_active !== false).map(rm => (
                                                <option key={rm.id} value={rm.id}>{rm.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        
                        {/* REVIEW CARD */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '14px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                          transition: 'transform 0.15s ease',
                          cursor: 'default'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(0, 122, 255, 0.1)',
                              color: '#007aff'
                            }}>
                              <Clock size={13} />
                            </div>
                            <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Review</span>
                          </div>
                          <strong style={{ fontSize: '1.6rem', color: '#1c1c1e', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                            {pendingSchedules.length}
                          </strong>
                        </div>

                        {/* OFFEN CARD */}
                        {(() => {
                          const hasUnassigned = matrixAllocations.some(p => !p.roomId);
                          const unassignedCount = matrixAllocations.filter(p => !p.roomId).length;
                          return (
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                              borderRadius: '14px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                              transition: 'transform 0.15s ease',
                              cursor: 'default'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: hasUnassigned ? 'rgba(255, 149, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                                  color: hasUnassigned ? '#ff9500' : '#34c759'
                                }}>
                                  <Calendar size={13} />
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Offen</span>
                              </div>
                              <strong style={{ fontSize: '1.6rem', color: hasUnassigned ? '#ff9500' : '#34c759', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                                {unassignedCount}
                              </strong>
                            </div>
                          );
                        })()}

                        {/* VERTEILT CARD */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '14px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                          transition: 'transform 0.15s ease',
                          cursor: 'default'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(52, 199, 89, 0.1)',
                              color: '#34c759'
                            }}>
                              <CheckCircle size={13} />
                            </div>
                            <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Verteilt</span>
                          </div>
                          <strong style={{ fontSize: '1.6rem', color: '#34c759', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                            {matrixAllocations.filter(p => p.roomId).length}
                          </strong>
                        </div>

                        {/* KONFLIKTE CARD */}
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
                          const hasConflicts = conflicts > 0;
                          return (
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                              borderRadius: '14px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                              transition: 'transform 0.15s ease',
                              cursor: 'default'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: hasConflicts ? 'rgba(255, 59, 48, 0.1)' : 'rgba(142, 142, 147, 0.1)',
                                  color: hasConflicts ? '#ff3b30' : '#8e8e93'
                                }}>
                                  <AlertCircle size={13} />
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Konflikte</span>
                              </div>
                              <strong style={{ fontSize: '1.6rem', color: hasConflicts ? '#ff3b30' : '#1c1c1e', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                                {conflicts}
                              </strong>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Conflict details log logger if there are conflicts */}
                      {(() => {
                        const conflictDetails: string[] = [];
                        const byRoomDay: Record<string, any[]> = {};
                        matrixAllocations.filter(p => p.roomId).forEach(p => {
                          const k = `${p.roomId}_${p.dayOfWeek}`;
                          if (!byRoomDay[k]) byRoomDay[k] = [];
                          byRoomDay[k].push(p);
                        });
                        Object.entries(byRoomDay).forEach(([roomDayKey, group]) => {
                          if (group.length > 1) {
                            group.forEach((p, i) => {
                              group.forEach((q, j) => {
                                if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                                  const dayName = ['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][p.dayOfWeek];
                                  const rName = rooms.find(rm => rm.id === p.roomId)?.name || 'Raum';
                                  conflictDetails.push(`${dayName}, ${rName}: ${p.teacherName} und ${q.teacherName} überschneiden sich (${p.startTime}–${p.endTime} vs. ${q.startTime}–${q.endTime})`);
                                }
                              });
                            });
                          }
                        });

                        if (conflictDetails.length > 0) {
                          return (
                            <div style={{
                              background: 'rgba(255, 59, 48, 0.05)',
                              border: '1px solid rgba(255, 59, 48, 0.15)',
                              padding: '12px',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={14} style={{ color: '#ff3b30' }} />
                                <strong style={{ color: '#ff3b30', fontSize: '0.74rem', fontWeight: 700 }}>Konflikte gefunden:</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                                {conflictDetails.map((det, idx) => (
                                  <div key={idx} style={{ fontSize: '0.68rem', color: '#ff3b30', lineHeight: '1.3', fontWeight: 500 }}>
                                    • {det}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div style={{
                        background: 'rgba(120, 120, 128, 0.06)',
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(120, 120, 128, 0.08)',
                          color: '#8e8e93',
                          flexShrink: 0
                        }}>
                          <DoorOpen size={15} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <strong style={{ display: 'block', color: '#1c1c1e', fontSize: '0.78rem', fontWeight: 600 }}>Räume verfügbar:</strong>
                          <p style={{ margin: 0, color: '#8e8e93', lineHeight: '1.3', fontSize: '0.72rem', fontWeight: 500 }}>
                            {rooms.length} Räume · {rooms.length * 5} mögliche Tageszuteilungen pro Woche
                          </p>
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(255, 59, 48, 0.05)',
                        border: '1px solid rgba(255, 59, 48, 0.12)',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(255, 59, 48, 0.08)',
                          color: '#ff3b30',
                          flexShrink: 0
                        }}>
                          <AlertCircle size={15} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#ff3b30' }}>Hinweis:</strong>
                          <p style={{ margin: 0, fontSize: '0.72rem', lineHeight: '1.4', color: '#8e2d2d', fontWeight: 500 }}>
                            Abgelehnte Stundenpläne gehen zurück in den Draft-Zustand. Lehrkräfte können erneut einreichen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
            )}

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
                                return `${idx + 1} - ${cleanName}`;
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
                              const instColor = getStationColor(sName, station.rawStation.color);

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
                      const instColor = getStationColor(sName, station.color);

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
                          if (selected) {
                            const favs = selected.preferred_room_ids || [];
                            setOverrideFavRoom1(favs[0] || '');
                            setOverrideFavRoom2(favs[1] || '');
                          } else {
                            setOverrideFavRoom1('');
                            setOverrideFavRoom2('');
                          }
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

                      {/* Favorite rooms */}
                      {selectedTeacherForOverride && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>⭐ Lieblingsräume (max. 2)</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <select
                              value={overrideFavRoom1}
                              onChange={(e) => setOverrideFavRoom1(e.target.value)}
                              style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '0.8rem' }}
                            >
                              <option value="">-- Favorit 1 --</option>
                              {rooms.filter(r => r.is_campus_active !== false).map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                            <select
                              value={overrideFavRoom2}
                              onChange={(e) => setOverrideFavRoom2(e.target.value)}
                              style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '0.8rem' }}
                            >
                              <option value="">-- Favorit 2 --</option>
                              {rooms.filter(r => r.is_campus_active !== false).map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

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
                    <button type="submit" className="google-btn-primary" style={{ background: '#fbbc05', color: '#09090b', fontWeight: 900, alignSelf: 'flex-start' }}>Lehrer importieren</button>
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
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800 }}>🎫 Abrechnung &amp; Infrastruktur</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b' }}>
                Verwalte deine lizenzierten Module und buche zusätzliche Benutzerkontingente.
              </p>

              {(() => {
                const billedCampus = hasCampusSub || campusActivatedThisMonth;
                const billedGroovelab = hasGroovelabSub || groovelabActivatedThisMonth;
                const activeModulesCount = (billedCampus ? 1 : 0) + (billedGroovelab ? 1 : 0);
                const moduleCost = activeModulesCount * 4.99;
                return (
                  <>


                    {/* Side-by-Side: Schüler Abrechnungsmodell und Vorschau */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', alignItems: 'stretch' }}>
                      
                      {/* Left Column: 🏫 Bereich Musikschule (B2B) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏫</span> Bereich Musikschule (B2B)
                          </h4>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Grundgebühren &amp; Infrastruktur für Mitarbeiter</span>
                        </div>

                        {/* Widgets: Verwaltung & Lehrer */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                            <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>💼 Verwaltung</span>
                            <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a', marginTop: '2px' }}>{employees.length} User</strong>
                          </div>
                          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                            <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>🧑‍🏫 Lehrer</span>
                            <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a', marginTop: '2px' }}>{allTeachers.length} User</strong>
                          </div>
                        </div>

                        {/* Card 1: Gebuchte Module */}
                        <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lizenzierte Module</span>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {/* Campus */}
                            <label style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              padding: '12px',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              background: hasCampusSub ? '#f0fdf4' : '#ffffff',
                              borderColor: hasCampusSub ? '#10b981' : '#cbd5e1',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              minHeight: '140px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <strong style={{ fontSize: '0.78rem', color: '#1e293b', display: 'block' }}>🎓 Campus</strong>
                                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Verwaltung</span>
                                </div>
                                <input 
                                  type="checkbox"
                                  checked={hasCampusSub}
                                  onChange={(e) => handleToggleCampusSub(e.target.checked)}
                                  style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '0.68rem' }}>
                                <span style={{ fontWeight: 700 }}>4,99 € <span style={{ fontWeight: 400, color: '#64748b' }}>/ Mo.</span></span>
                                <span style={{ color: hasCampusSub ? '#047857' : '#64748b', fontWeight: 700 }}>{hasCampusSub ? 'Aktiv' : 'Bereit'}</span>
                              </div>
                            </label>

                            {/* GrooveLab */}
                            <label style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              padding: '12px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              background: hasGroovelabSub ? '#fffbeb' : '#ffffff',
                              borderColor: hasGroovelabSub ? '#f59e0b' : '#cbd5e1',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              minHeight: '140px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <strong style={{ fontSize: '0.78rem', color: '#1e293b', display: 'block' }}>🎸 GrooveLab</strong>
                                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Übe-App</span>
                                </div>
                                <input 
                                  type="checkbox"
                                  checked={hasGroovelabSub}
                                  onChange={(e) => handleToggleGroovelabSub(e.target.checked)}
                                  style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '0.68rem' }}>
                                <span style={{ fontWeight: 700 }}>4,99 € <span style={{ fontWeight: 400, color: '#64748b' }}>/ Mo.</span></span>
                                <span style={{ color: hasGroovelabSub ? '#b45309' : '#64748b', fontWeight: 700 }}>{hasGroovelabSub ? 'Aktiv' : 'Bereit'}</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Card 2: B2B Bankeinzug Schule */}
                        {(() => {
                          const schoolShareBookedExtra = (extraBillingOption === 'option3_1' || extraBillingOption === 'option3_2') ? bookedExtraUsers * 0.25 : 0;
                          const totalB2B = moduleCost + (allTeachers.length + employees.length) * 0.49 + ((studentBillingOption === 'option3_1' || studentBillingOption === 'option3_2') ? students.length * 0.25 : 0) + schoolShareBookedExtra;
                          return (
                            <div style={{
                              background: '#f0f9ff',
                              padding: '16px',
                              borderRadius: '16px',
                              border: '1.5px solid #bae6fd',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: '190px',
                              marginTop: 'auto',
                              boxShadow: '0 2px 8px rgba(3, 105, 161, 0.02)'
                            }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Monatlicher Bankeinzug B2B</span>
                                <strong style={{ display: 'block', fontSize: '1.6rem', color: '#0369a1', margin: '6px 0', fontWeight: 800 }}>
                                  {totalB2B.toFixed(2)} € <span style={{ fontSize: '0.78rem', fontWeight: 400 }}>/ Mo.</span>
                                </strong>
                              </div>

                              <div style={{ fontSize: '0.7rem', color: '#0284c7', borderTop: '1px solid #bae6fd', paddingTop: '8px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>• Modul-Grundgebühr:</span>
                                  <strong>{moduleCost.toFixed(2)} €</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>• User-Infrastruktur ({allTeachers.length + employees.length} User):</span>
                                  <strong>{((allTeachers.length + employees.length) * 0.49).toFixed(2)} €</strong>
                                </div>
                                {(studentBillingOption === 'option3_1' || studentBillingOption === 'option3_2') && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>• Kofinanzierungs-Schulanteil (25¢):</span>
                                    <strong>{(students.length * 0.25).toFixed(2)} €</strong>
                                  </div>
                                )}
                                {schoolShareBookedExtra > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                    <span>• Extra-User Kofinanzierungsanteil ({bookedExtraUsers} Schüler):</span>
                                    <strong>{schoolShareBookedExtra.toFixed(2)} €</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right Column: 👥 Bereich Schüler (B2C) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>👥</span> Bereich Schüler (B2C)
                          </h4>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Umlage &amp; Finanzierung durch Schüler</span>
                        </div>

                        {/* Widget: Schüler */}
                        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>👥 Schüler</span>
                          <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a', marginTop: '2px' }}>{students.length} Schüler</strong>
                        </div>

                        {/* Card 1: Schüler-Abrechnungsmodell selector */}
                        <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            {
                              id: 'option1',
                              emoji: '📅',
                              title: 'Option 1: Jahrespauschale',
                              badge: '10% Rabatt',
                              desc: 'Schüler: 5,29 € / Jahr | Schule: 0,00 €'
                            },
                            {
                              id: 'option2',
                              emoji: '💸',
                              title: 'Option 2: Monatsumlage',
                              badge: 'Monatlich',
                              desc: 'Schüler: 0,49 € / Mo. | Schule: 0,00 €'
                            },
                            {
                              id: 'option3_1',
                              emoji: '⚖️',
                              title: 'Option 3.1: Kofinanzierung (Monatlich)',
                              badge: 'Split Mo.',
                              desc: 'Schüler: 0,24 € / Mo. | Schule: 0,25 € / Mo.'
                            },
                            {
                              id: 'option3_2',
                              emoji: '🎓',
                              title: 'Option 3.2: Kofinanzierung (Jahresbeitrag)',
                              badge: 'Split + 10% Rabatt',
                              desc: 'Schüler: 2,59 € / Jahr | Schule: 0,25 € / Mo.'
                            }
                          ].map((opt) => (
                            <label key={opt.id} style={{
                              display: 'flex',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: studentBillingOption === opt.id ? '#faf5ff' : '#ffffff',
                              cursor: isBillingBooked ? 'not-allowed' : 'pointer',
                              opacity: isBillingBooked && studentBillingOption !== opt.id ? 0.6 : 1,
                              transition: 'all 0.15s',
                              ...(studentBillingOption === opt.id ? { borderColor: '#6b21a8', boxShadow: '0 1px 4px rgba(107, 33, 168, 0.03)' } : {})
                            }}>
                              <input 
                                type="radio" 
                                name="studentBillingOption"
                                checked={studentBillingOption === opt.id}
                                disabled={isBillingBooked}
                                onChange={() => handleUpdateStudentBillingOption(opt.id)}
                                style={{ accentColor: '#6b21a8', cursor: isBillingBooked ? 'not-allowed' : 'pointer', width: '13px', height: '13px', marginTop: '2px' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '0.72rem', color: '#1e293b' }}>{opt.emoji} {opt.title}</strong>
                                  <span style={{
                                    fontSize: '0.52rem',
                                    padding: '1px 5px',
                                    borderRadius: '100px',
                                    background: studentBillingOption === opt.id ? '#e9d5ff' : '#f1f5f9',
                                    color: '#334155',
                                    fontWeight: 700
                                  }}>{opt.badge}</span>
                                </div>
                                <p style={{ fontSize: '0.62rem', color: '#64748b', margin: '1px 0 0 0', fontWeight: 600 }}>{opt.desc}</p>
                              </div>
                            </label>
                          ))}

                          {!isBillingBooked ? (
                            <button
                              onClick={() => {
                                setIsBillingBooked(true);
                                localStorage.setItem('isBillingBooked', 'true');
                              }}
                              className="hover-scale font-bold"
                              style={{
                                background: '#6b21a8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                marginTop: '6px',
                                width: '100%',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 6px rgba(107, 33, 168, 0.2)'
                              }}
                            >
                              🔒 Abrechnungssystem einbuchen (für Schuljahr sperren)
                            </button>
                          ) : (
                            <div style={{
                              background: '#f5f3ff',
                              border: '1.5px solid #ddd6fe',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              fontSize: '0.74rem',
                              color: '#5b21b6',
                              fontWeight: 700,
                              marginTop: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🔒 System für dieses Schuljahr eingebucht</span>
                                <button 
                                  onClick={() => {
                                    setIsBillingBooked(false);
                                    localStorage.removeItem('isBillingBooked');
                                  }} 
                                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '0.68rem', textDecoration: 'underline', fontWeight: 600 }}
                                >
                                  (Ändern)
                                </button>
                              </div>
                              <span style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 500 }}>
                                Tarifänderungen sind gesperrt. Du kannst unten zusätzliche Schüler buchen.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card 1.5: Zusätzliche Schüler (Extra-User) Slider */}
                        {isBillingBooked && (
                          <div style={{
                            padding: '16px',
                            borderRadius: '16px',
                            border: '1.5px solid #ddd6fe',
                            background: '#faf5ff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 2px 8px rgba(107, 33, 168, 0.01)'
                          }}>
                            <div>
                              <span style={{ fontSize: '0.62rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Zusätzliche User hinzubuchen</span>
                              <strong style={{ display: 'block', fontSize: '0.86rem', color: '#1e293b', marginTop: '2px' }}>
                                Aktuell gebucht: <span style={{ color: '#6b21a8' }}>{bookedExtraUsers} Extra-Schüler</span>
                              </strong>
                            </div>

                            {/* Slider */}
                            <div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={extraUsersSliderVal} 
                                onChange={(e) => setExtraUsersSliderVal(parseInt(e.target.value, 10))} 
                                style={{ width: '100%', accentColor: '#6b21a8', cursor: 'pointer', height: '6px', borderRadius: '4px' }} 
                              />
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
                                <span>0</span>
                                <span style={{ color: '#6b21a8', fontSize: '0.78rem' }}>+{extraUsersSliderVal} User</span>
                                <span>100</span>
                              </div>
                            </div>

                            {/* Variant selector for extra users */}
                            <div>
                              <label style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                Abrechnungsvariante für Extra-User:
                              </label>
                              <select 
                                value={extraBillingOption} 
                                onChange={(e) => setExtraBillingOption(e.target.value)} 
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.74rem', background: '#ffffff', color: '#1e293b', fontWeight: 650, cursor: 'pointer' }}
                              >
                                <option value="option1">Option 1: Jahrespauschale (5,29 € / Jahr)</option>
                                <option value="option2">Option 2: Monatsumlage (0,49 € / Mo.)</option>
                                <option value="option3_1">Option 3.1: Kofinanzierung Mo. (Schüler 0,24 € / Schule 0,25 €)</option>
                                <option value="option3_2">Option 3.2: Kofinanzierung Jahr (Schüler 2,59 € / Schule 0,25 €)</option>
                              </select>
                            </div>

                            {/* Live preview cost of this booking */}
                            {extraUsersSliderVal > 0 && (() => {
                              let unitCost = "";
                              let schoolShare = "";
                              if (extraBillingOption === 'option1') { unitCost = "5,29 € / Jahr"; }
                              else if (extraBillingOption === 'option2') { unitCost = "0,49 € / Monat"; }
                              else if (extraBillingOption === 'option3_1') { unitCost = "0,24 € / Monat"; schoolShare = " + Schule: " + (extraUsersSliderVal * 0.25).toFixed(2) + " € / Mo."; }
                              else if (extraBillingOption === 'option3_2') { unitCost = "2,59 € / Jahr"; schoolShare = " + Schule: " + (extraUsersSliderVal * 0.25).toFixed(2) + " € / Mo."; }

                              return (
                                <div style={{ fontSize: '0.68rem', color: '#6b21a8', borderTop: '1px dashed #ddd6fe', paddingTop: '8px', background: '#faf5ff', lineHeight: '1.4' }}>
                                  <strong>Zusätzliche Belastung:</strong><br />
                                  • Schüler-Umlage: {extraUsersSliderVal} × {unitCost.split(' ')[0]} € = <strong>{
                                    (extraUsersSliderVal * (extraBillingOption === 'option1' ? 5.29 : extraBillingOption === 'option2' ? 0.49 : extraBillingOption === 'option3_1' ? 0.24 : 2.59)).toFixed(2)
                                  } € / {extraBillingOption === 'option1' || extraBillingOption === 'option3_2' ? 'Jahr' : 'Monat'}</strong>
                                  {schoolShare && <><br />• Schulanteil B2B: <strong>{schoolShare.split(': ')[1]}</strong></>}
                                </div>
                              );
                            })()}

                            {/* Book button */}
                            <button
                              onClick={() => {
                                const newVal = bookedExtraUsers + extraUsersSliderVal;
                                setBookedExtraUsers(newVal);
                                localStorage.setItem('bookedExtraUsers', newVal.toString());
                                alert(`${extraUsersSliderVal} zusätzliche User wurden erfolgreich für das Schuljahr gebucht!`);
                                setExtraUsersSliderVal(0);
                              }}
                              disabled={extraUsersSliderVal === 0}
                              className="hover-scale font-bold"
                              style={{
                                background: extraUsersSliderVal === 0 ? '#cbd5e1' : '#6b21a8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: extraUsersSliderVal === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                width: '100%',
                                transition: 'all 0.2s',
                                boxShadow: extraUsersSliderVal === 0 ? 'none' : '0 2px 6px rgba(107, 33, 168, 0.15)'
                              }}
                            >
                              ➕ {extraUsersSliderVal} User zahlungspflichtig einbuchen
                            </button>
                          </div>
                        )}

                        {/* Card 2: Umlage pro Schüler */}
                        <div style={{
                          background: '#faf5ff',
                          padding: '16px',
                          borderRadius: '16px',
                          border: '1.5px solid #e9d5ff',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '190px',
                          marginTop: 'auto',
                          boxShadow: '0 2px 8px rgba(107, 33, 168, 0.02)'
                        }}>
                          <span style={{ fontSize: '0.62rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Umlage pro Schüler B2C</span>
                          
                          {studentBillingOption === 'option1' && (() => {
                            const singlePrice = "5,29 €";
                            const period = "Jahr";
                            const totalVal = (students.length * 5.29).toFixed(2);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', flex: 1, marginTop: '8px', alignItems: 'stretch' }}>
                                {/* Left Side: Einzelpreis */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Einzelpreis</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {singlePrice} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ {period}</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechenweg:</strong><br />
                                    0,49 € × 12 Mo. = 5,88 €<br />
                                    5,88 € − 10% Rabatt = 5,29 €
                                  </span>
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', background: '#e9d5ff', alignSelf: 'stretch' }} />

                                {/* Right Side: Gesamtkosten */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Kosten alle Schüler</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {totalVal} € <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ {period}</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechnung:</strong><br />
                                    {students.length} Schüler × {singlePrice}<br />
                                    = {totalVal} € / {period}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {studentBillingOption === 'option2' && (() => {
                            const singlePrice = "0,49 €";
                            const period = "Mo.";
                            const totalVal = (students.length * 0.49).toFixed(2);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', flex: 1, marginTop: '8px', alignItems: 'stretch' }}>
                                {/* Left Side: Einzelpreis */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Einzelpreis</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {singlePrice} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ {period}</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechenweg:</strong><br />
                                    Infrastrukturkosten:<br />
                                    <strong>0,49 € / Monat</strong>
                                  </span>
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', background: '#e9d5ff', alignSelf: 'stretch' }} />

                                {/* Right Side: Gesamtkosten */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Kosten alle Schüler</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {totalVal} € <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ Mo.</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechnung:</strong><br />
                                    {students.length} Schüler × {singlePrice}<br />
                                    = {totalVal} € / Monat
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {studentBillingOption === 'option3_1' && (() => {
                            const singlePrice = "0,24 €";
                            const period = "Mo.";
                            const totalVal = (students.length * 0.24).toFixed(2);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', flex: 1, marginTop: '8px', alignItems: 'stretch' }}>
                                {/* Left Side: Einzelpreis */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Einzelpreis</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {singlePrice} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ {period}</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechenweg:</strong><br />
                                    50% Kofinanzierung:<br />
                                    0,49 € / 2 = 0,245 € (abger.)
                                  </span>
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', background: '#e9d5ff', alignSelf: 'stretch' }} />

                                {/* Right Side: Gesamtkosten */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Kosten alle Schüler</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {totalVal} € <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ Mo.</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechnung:</strong><br />
                                    {students.length} Schüler × {singlePrice}<br />
                                    = {totalVal} € / Monat
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {studentBillingOption === 'option3_2' && (() => {
                            const singlePrice = "2,59 €";
                            const period = "Jahr";
                            const totalVal = (students.length * 2.59).toFixed(2);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', flex: 1, marginTop: '8px', alignItems: 'stretch' }}>
                                {/* Left Side: Einzelpreis */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Einzelpreis</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {singlePrice} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ {period}</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechenweg:</strong><br />
                                    Split: 0,24 € × 12 = 2,88 €<br />
                                    2,88 € − 10% Rabatt = 2,59 €
                                  </span>
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', background: '#e9d5ff', alignSelf: 'stretch' }} />

                                {/* Right Side: Gesamtkosten */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b21a8', textTransform: 'uppercase', fontWeight: 700 }}>Kosten alle Schüler</span>
                                    <strong style={{ display: 'block', fontSize: '1.4rem', color: '#6b21a8', margin: '4px 0', fontWeight: 800 }}>
                                      {totalVal} € <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/ {period}</span>
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#6b21a8', lineHeight: '1.3' }}>
                                    <strong>Rechnung:</strong><br />
                                    {students.length} Schüler × {singlePrice}<br />
                                    = {totalVal} € / {period}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>


                  </>
                );
              })()}

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

          // Local floor mappings fallback if schema cache is missing the floor column
          const localFloorMappings = (() => {
            try {
              return JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
            } catch {
              return {};
            }
          })();

          // Unique rooms by Name to guarantee absolutely zero duplicate room names are rendered
          const uniqueRooms = rooms.reduce((acc: any[], current: any) => {
            if (current && current.name) {
              const nameKey = (current.name || '').toLowerCase().trim();
              if (!acc.some(item => (item.name || '').toLowerCase().trim() === nameKey)) {
                acc.push(current);
              }
            }
            return acc;
          }, []);



          // Filter logic for rooms matching search and selected floor & status
          const filteredRooms = uniqueRooms.filter((r: any) => {
            const name = (r.name || '').toLowerCase();
            const query = roomSearchQuery.toLowerCase().trim();
            const matchesSearch = !query || name.includes(query);
            
            const floorName = r.floor || localFloorMappings[r.id] || 'Allgemein';
            const matchesFloor = roomFilterFloor === 'All' || floorName === roomFilterFloor;
            
            let matchesStatus = true;
            if (roomFilterStatus === 'campus') matchesStatus = r.is_campus_active !== false;
            else if (roomFilterStatus === 'groovelab') matchesStatus = r.is_groovelab_active;
            else if (roomFilterStatus === 'inactive') matchesStatus = (r.is_campus_active === false) && !r.is_groovelab_active;
            
            return matchesSearch && matchesFloor && matchesStatus;
          }).sort((a, b) => {
            const parsedA = parseRoomName(a.name || '');
            const parsedB = parseRoomName(b.name || '');
            const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, 'de', { sensitivity: 'base' });
            if (prefixCompare !== 0) return prefixCompare;
            
            const numA = parsedA.number !== null ? parsedA.number : -1;
            const numB = parsedB.number !== null ? parsedB.number : -1;
            return numA - numB;
          });

          // Sort helper for floors: Allgemein is top (9999), EG is 0, OGs are positive, UGs are negative
          const getFloorWeight = (f: string) => {
            if (f === 'Allgemein') return 9999;
            if (f === 'EG') return 0;
            const ogMatch = f.match(/^(\d+)\.\s*OG$/i);
            if (ogMatch) return parseInt(ogMatch[1]);
            const ugMatch = f.match(/^(\d+)\.\s*UG$/i);
            if (ugMatch) return -parseInt(ugMatch[1]);
            return -9999;
          };

          // Unique floors computed from all unique rooms plus addedFloors, always including 'Allgemein' and 'EG'
          const allFloorsList = Array.from(new Set([
            'Allgemein', 
            'EG',
            ...uniqueRooms.map(r => r.floor || localFloorMappings[r.id] || 'Allgemein'), 
            ...addedFloors
          ])).sort((a, b) => getFloorWeight(b) - getFloorWeight(a));

          return (
            <>
              <div className="campus-grid">
              
              {/* LEFT CONTENT PANE: ROOMS LIST BOARD (mirrors Schülerboard) */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>
                {/* 1. ROOM BOARD HEADER CARD */}
                <div className="google-card" style={{
                  width: '100%',
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
                      <DoorOpen size={22} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Raumboard ({uniqueRooms.length})
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Segmented Control for Views */}
                      <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '3px', display: 'flex', gap: '2px', border: '1px solid rgba(0,0,0,0.02)' }}>
                        {(['overview', 'plan'] as const).map(v => {
                          const isActive = roomsSubView === v || (v === 'overview' && roomsSubView === 'settings');
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => { setRoomsSubView(v); setEditingRoom(null); }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '9px',
                                border: 'none',
                                background: isActive ? '#ffffff' : 'transparent',
                                color: isActive ? '#0f172a' : '#64748b',
                                fontWeight: isActive ? 800 : 600,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isActive ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {v === 'overview' ? <Sliders size={13} /> : <Calendar size={13} />}
                              {v === 'overview' ? 'Übersicht' : 'Belegungsplan'}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setIsRoomCsvExpanded(!isRoomCsvExpanded)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          borderRadius: '12px', 
                          padding: '8px 16px', 
                          fontSize: '0.8rem', 
                          fontWeight: 800,
                          background: isRoomCsvExpanded ? '#f1f5f9' : '#ffffff',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s'
                        }}
                      >
                        📄 Sammel-Onboarding (CSV) {isRoomCsvExpanded ? '▲' : '▼'}
                      </button>

                      <button
                        onClick={() => openRoomEditor()}
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
                        ➕ Raum anlegen
                      </button>
                    </div>
                  </div>

                  {/* CSV BOX FOR ROOMS */}
                  {isRoomCsvExpanded && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                          Sammel-Onboarding (Räume)
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                          Format pro Zeile: <code>Raumname; Max Schüler (optional); Größe in m² (optional)</code>
                        </span>
                      </div>

                      {/* smarte-auto-zuweisung indicator */}
                      {roomFilterFloor && roomFilterFloor !== 'All' && (
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.03)',
                          border: '1.5px solid rgba(34, 197, 94, 0.12)',
                          borderRadius: '16px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          marginTop: '2px',
                          marginBottom: '2px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                            ⚡ smarte-auto-zuweisung:
                          </span>
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              🏢 {roomFilterFloor}
                            </span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Stockwerk
                            </span>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleBulkRoomImport} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                          value={roomCsvText}
                          onChange={e => setRoomCsvText(e.target.value)}
                          placeholder="z.B.&#10;Klavierzimmer;2;12&#10;Schlagzeugstudio;1;18&#10;Theorieraum;15;30"
                          rows={5}
                          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none', background: '#ffffff', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setIsRoomCsvExpanded(false)}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            disabled={roomCsvSaving || !roomCsvText.trim()}
                            style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)', color: '#ffffff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', opacity: roomCsvSaving || !roomCsvText.trim() ? 0.6 : 1 }}
                          >
                            {roomCsvSaving ? 'Wird importiert...' : 'Importieren'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* KPI ROW */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Räume Gesamt</span>
                      <strong style={{ fontSize: '1.4rem', color: '#1e3a8a', fontWeight: 900, fontFamily: 'Urbanist' }}>{rooms.length}</strong>
                    </div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>Campus Aktiv</span>
                      <strong style={{ fontSize: '1.4rem', color: '#14532d', fontWeight: 900, fontFamily: 'Urbanist' }}>{rooms.filter(r => r.is_campus_active !== false).length}</strong>
                    </div>
                    <div style={{ background: '#feefe3', border: '1px solid #fed7aa', padding: '10px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#854d0e', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Urbanist' }}>GrooveLab Aktiv</span>
                      <strong style={{ fontSize: '1.4rem', color: '#713f12', fontWeight: 900, fontFamily: 'Urbanist' }}>{rooms.filter(r => r.is_groovelab_active).length}</strong>
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
                        placeholder="Raum suchen..." 
                        value={roomSearchQuery}
                        onChange={(e) => setRoomSearchQuery(e.target.value)}
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
                        value={roomFilterFloor}
                        onChange={(e) => setRoomFilterFloor(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                      >
                        <option value="All">🏢 Alle Stockwerke</option>
                        {allFloorsList.map(fl => (
                          <option key={fl} value={fl}>{fl}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '130px' }}>
                      <select
                        value={roomFilterStatus}
                        onChange={(e) => setRoomFilterStatus(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                      >
                        <option value="all">Alle Räume</option>
                        <option value="campus">Campus</option>
                        <option value="groovelab">Groovelab</option>
                        <option value="inactive">inaktiv</option>
                      </select>
                    </div>
                  </div>

                  {/* ROOM LIST CONTAINER */}
                  {roomsSubView === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto', overflowY: 'scroll', maxHeight: '550px', paddingRight: '6px', width: '100%' }}>
                      {filteredRooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.88rem', fontWeight: 700 }}>
                          Keine Räume mit diesen Filtereinstellungen gefunden.
                        </div>
                      ) : (
                        filteredRooms.map((room: any) => {
                          const initials = (room.name || 'RM').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                          const rColor = getAlphabeticalColor(room.name || 'R');
                          const equipment: string[] = Array.isArray(room.equipment) ? room.equipment : [];
                          const unsuitableInsts: string[] = Array.isArray(room.unsuitable_instruments) 
                            ? room.unsuitable_instruments 
                            : (() => {
                                try {
                                  const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                                  return map[room.id] || [];
                                } catch { return []; }
                              })();

                          return (
                            <div 
                              key={room.id} 
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("roomId", room.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '10px 16px',
                                borderRadius: '16px',
                                background: '#ffffff',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                                minWidth: '850px',
                                transition: 'all 0.25s ease',
                                cursor: 'grab'
                              }}
                              className="hover-scale"
                            >
                              {/* Circular initials avatar */}
                              <div 
                                onClick={() => openRoomEditor(room)}
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '16px', 
                                  minWidth: '220px',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '50%',
                                  background: rColor.avatarBg,
                                  color: rColor.avatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.95rem',
                                  fontWeight: 900,
                                  flexShrink: 0,
                                  fontFamily: 'Urbanist'
                                }}>
                                  {initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                    {room.name}
                                  </span>
                                  
                                  {/* Stats row: 2 columns (Max. Students, qm size) matching mockup */}
                                  <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
                                    {/* Column 1: Max. Schüler */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '32px' }}>
                                      <Users size={16} style={{ color: '#64748b' }} />
                                      <span style={{ fontSize: '0.62rem', color: '#86868b', marginTop: '2px', fontWeight: 550, fontFamily: 'Inter' }}>Max.</span>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1d1d1f', fontFamily: 'Inter' }}>{room.max_students || 1}</span>
                                    </div>
                                    {/* Column 2: QM Größe */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '32px' }}>
                                      <Ruler size={16} style={{ color: '#64748b' }} />
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1d1d1f', marginTop: '2px', fontFamily: 'Inter' }}>{room.qm || 0}</span>
                                      <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 550, fontFamily: 'Inter' }}>qm</span>
                                    </div>
                                  </div>

                                </div>
                              </div>

                              {/* Floor Badge pill */}
                              <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
                                <span style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px', 
                                  borderRadius: '10px', 
                                  background: '#f1f5f9', 
                                  color: '#334155', 
                                  fontSize: '0.78rem', 
                                  fontWeight: 800,
                                  fontFamily: 'Urbanist'
                                }}>
                                  🏢 {room.floor || localFloorMappings[room.id] || 'Allgemein'}
                                </span>
                              </div>

                              {/* Micro Status Toggles */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={async () => {
                                    const newVal = room.is_campus_active === false ? true : false;
                                    const { error } = await supabase.from('rooms').update({ is_campus_active: newVal }).eq('id', room.id);
                                    if (error) alert(error.message);
                                    else {
                                      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_campus_active: newVal } : r));
                                    }
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: room.is_campus_active !== false ? '#e2f6ea' : '#f1f5f9',
                                    color: room.is_campus_active !== false ? '#137333' : '#86868b',
                                    transition: 'all 0.15s ease',
                                    fontFamily: 'Urbanist'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  Campus
                                </button>

                                <button
                                  onClick={async () => {
                                    const newVal = !room.is_groovelab_active;
                                    const { error } = await supabase.from('rooms').update({ is_groovelab_active: newVal }).eq('id', room.id);
                                    if (error) alert(error.message);
                                    else {
                                      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_groovelab_active: newVal } : r));
                                    }
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: room.is_groovelab_active ? '#fff3e0' : '#f1f5f9',
                                    color: room.is_groovelab_active ? '#e65100' : '#64748b',
                                    transition: 'all 0.15s ease',
                                    fontFamily: 'Urbanist'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  Groovelab
                                </button>

                                {/* Unsuitable instruments display to the right of Groovelab */}
                                {unsuitableInsts.length > 0 && (
                                  <div style={{ display: 'flex', gap: '4px', marginLeft: '12px', alignItems: 'center' }}>
                                    {unsuitableInsts.map((inst: string) => (
                                      <span
                                        key={inst}
                                        style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 800,
                                          padding: '4px 10px',
                                          borderRadius: '8px',
                                          background: '#fef2f2',
                                          color: '#ef4444',
                                          border: '1px solid #fee2e2',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontFamily: 'Urbanist',
                                          whiteSpace: 'nowrap'
                                        }}
                                        title={`Akustisch ungeeignet für ${inst}`}
                                      >
                                        <AlertCircle size={10} color="#ef4444" />
                                        {inst}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Actions: Only red X to delete */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexShrink: 0 }}>
                                <button
                                  onClick={() => handleDeleteRoom(room.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0 4px' }}
                                  className="hover-scale-mini"
                                  title="Löschen"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ── VIEW 2: Belegungsplan (read-only matrix grid inside left panel) ── */}
                  {roomsSubView === 'plan' && (
                    <div style={{ background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '20px', overflowX: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={15} style={{ color: '#0f172a' }} />
                            Wöchentlicher Belegungsplan
                          </h4>
                          <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Lese-Ansicht · Zum Bearbeiten → Campus › Stundenpläne</p>
                        </div>
                      </div>
                      {filteredRooms.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px', fontWeight: 700 }}>Keine Räume gefunden.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '600px' }}>
                          <colgroup>
                            <col style={{ width: '130px' }} />
                            {[1,2,3,4,5].map(d => <col key={d} />)}
                          </colgroup>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                              <th style={{ padding: '8px 10px', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>Raum</th>
                              {[1,2,3,4,5].map(d => (
                                <th key={d} style={{ padding: '8px 10px', fontSize: '0.73rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', textAlign: 'left' }}>
                                  {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag'][d]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRooms.map((room, rIdx) => {
                              return (
                                <tr key={room.id} style={{ borderBottom: rIdx < filteredRooms.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                  <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                                    <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>{room.name}</strong>
                                  </td>
                                  {[1,2,3,4,5].map(dayNum => {
                                    const cellPlans = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === dayNum);
                                    return (
                                      <td key={dayNum} style={{ padding: '6px', verticalAlign: 'top' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: '50px' }}>
                                          {cellPlans.map(plan => {
                                            const { avatarBg: bg, avatarColor: color } = getAlphabeticalUniColor(plan.instrument);
                                            return (
                                              <div
                                                key={plan.id}
                                                onClick={() => setSelectedDayPlan(plan)}
                                                style={{ background: bg, border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, borderRadius: '9px', padding: '6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                                              >
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a' }}>{getPlanDisplayName(plan)}</span>
                                                <span style={{ fontSize: '0.58rem', fontWeight: 700, color }}>{plan.instrument}</span>
                                                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                  <Clock size={10} />
                                                  {plan.startTime}–{plan.endTime}
                                                </span>
                                              </div>
                                            );
                                          })}
                                          {cellPlans.length === 0 && (
                                            <div style={{ height: '40px', borderRadius: '8px', background: '#ffffff', border: '1px dashed #e2e8f0' }} />
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
                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT SIDEBAR PANEL: STOCKWERKE (mirrors Lehrer-Sidebar) */}
              <div className="google-card" style={{
                width: '340px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                padding: '24px',
                borderRadius: '24px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <School size={20} style={{ color: '#0f172a' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                    Stockwerke
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.45, fontFamily: 'Inter' }}>
                  Klicke auf ein Stockwerk, um die Ansicht zu filtern, oder ziehe einen Raum per Drag & Drop hierhin.
                </p>

                <button
                  onClick={() => {
                    // Calculate next OG and next UG numbers based on current list
                    let maxOG = 0;
                    let maxUG = 0;
                    allFloorsList.forEach(f => {
                      const ogMatch = f.match(/^(\d+)\.\s*OG$/i);
                      if (ogMatch) {
                        const num = parseInt(ogMatch[1]);
                        if (num > maxOG) maxOG = num;
                      }
                      const ugMatch = f.match(/^(\d+)\.\s*UG$/i);
                      if (ugMatch) {
                        const num = parseInt(ugMatch[1]);
                        if (num > maxUG) maxUG = num;
                      }
                    });
                    const nextOG = maxOG + 1;
                    const nextUG = maxUG + 1;

                    const input = prompt(
                      `Neues Stockwerk anlegen:\n\n` +
                      `• Schreibe „OG“ für das nächste Obergeschoss: ${nextOG}. OG (+${nextOG})\n` +
                      `• Schreibe „UG“ für das nächste Untergeschoss: ${nextUG}. UG (-${nextUG})\n` +
                      `• Oder gib einen individuellen Namen ein:`
                    );

                    if (input && input.trim()) {
                      const val = input.trim().toLowerCase();
                      let finalName = input.trim();
                      if (val === 'og' || val === 'o') {
                        finalName = `${nextOG}. OG`;
                      } else if (val === 'ug' || val === 'u') {
                        finalName = `${nextUG}. UG`;
                      }

                      if (allFloorsList.includes(finalName)) {
                        alert(`Das Stockwerk „${finalName}“ existiert bereits.`);
                        return;
                      }

                      const updated = [...addedFloors, finalName];
                      setAddedFloors(updated);
                      localStorage.setItem(`groovelab_added_floors_${schoolId}`, JSON.stringify(updated));
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    background: '#eff6ff',
                    color: '#0b57d0',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale"
                >
                  ➕ Stockwerk anlegen
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                  {/* "Alle Stockwerke anzeigen" */}
                  {(() => {
                    const isActive = roomFilterFloor === 'All';
                    return (
                      <div
                        onClick={() => setRoomFilterFloor('All')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          border: isActive ? '1.5px solid #22c55e' : '1.5px solid #f1f5f9',
                          background: isActive ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 4px 12px rgba(34,197,150,0.06)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#e2f6ea',
                            color: '#137333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            flexShrink: 0
                          }}>
                            🏢
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              Alle Stockwerke
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                              Gesamtübersicht
                            </span>
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          background: isActive ? '#d1fae5' : '#f1f5f9',
                          color: isActive ? '#065f46' : '#64748b',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          fontFamily: 'Urbanist',
                          whiteSpace: 'nowrap'
                        }}>
                          {uniqueRooms.length} Räume
                        </span>
                      </div>
                    );
                  })()}

                  {/* Floor Cards list */}
                  {allFloorsList.map((flName: string) => {
                    const isActive = roomFilterFloor === flName;
                    const isHovered = dragHoveredFloor === flName;
                    const floorRoomCount = uniqueRooms.filter(r => (r.floor || localFloorMappings[r.id] || 'Allgemein') === flName).length;
                    const avatarInitials = flName.substring(0, 2).toUpperCase();
                    const colorSet = getFloorColor(flName);

                    return (
                      <div
                        key={flName}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragHoveredFloor(flName);
                        }}
                        onDragLeave={() => setDragHoveredFloor(null)}
                        onDrop={async (e) => {
                          const roomId = e.dataTransfer.getData("roomId");
                          if (roomId) {
                            // Update local floor mapping immediately as robust fallback
                            try {
                              const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
                              mappings[roomId] = flName;
                              localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));
                            } catch (err) {
                              console.error(err);
                            }

                            // Update local state instantly so UI responds immediately
                            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, floor: flName } : r));

                            // Update in database as primary storage
                            const { error } = await supabase.from('rooms').update({ floor: flName }).eq('id', roomId);
                            if (error) {
                              console.warn("Supabase floor save failed, fell back to local storage cache:", error.message);
                            }
                          }
                          setDragHoveredFloor(null);
                        }}
                        onClick={() => setRoomFilterFloor(flName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          border: isHovered
                            ? '2px dashed #3b82f6'
                            : isActive
                              ? '1.5px solid #3b82f6'
                              : '1.5px solid #f1f5f9',
                          background: isHovered
                            ? '#eff6ff'
                            : isActive
                              ? '#f0f9ff'
                              : '#ffffff',
                          cursor: 'pointer',
                          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.06)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: colorSet.avatarBg,
                            color: colorSet.avatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 900,
                            fontFamily: 'Urbanist',
                            flexShrink: 0
                          }}>
                            {avatarInitials}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {flName}
                              {flName !== 'Allgemein' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Stockwerk „${flName}“ löschen? Zugeordnete Räume werden zurück auf „Allgemein“ gesetzt.`)) {
                                      // Reset rooms on this floor to Allgemein
                                      supabase.from('rooms').update({ floor: 'Allgemein' }).eq('floor', flName).then(() => {
                                        setRooms(prev => prev.map(r => (r.floor || 'Allgemein') === flName ? { ...r, floor: 'Allgemein' } : r));
                                        const updated = addedFloors.filter(f => f !== flName);
                                        setAddedFloors(updated);
                                        localStorage.setItem(`groovelab_added_floors_${schoolId}`, JSON.stringify(updated));
                                        if (roomFilterFloor === flName) setRoomFilterFloor('All');
                                      });
                                    }
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                                  title="Stockwerk löschen"
                                >
                                  🗑️
                                </button>
                              )}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                              {flName === 'Allgemein' ? 'Standard-Zuweisung' : 'Stockwerk'}
                            </span>
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          background: isActive ? '#bae6fd' : '#f1f5f9',
                          color: isActive ? '#0369a1' : '#64748b',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          fontFamily: 'Urbanist',
                          whiteSpace: 'nowrap'
                        }}>
                          {floorRoomCount} {floorRoomCount === 1 ? 'Raum' : 'Räume'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

              {/* ── VIEW 3: Einstellungen / Editor ── */}
              {roomsSubView === 'settings' && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.3)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    width: '540px',
                    maxHeight: '90vh',
                    boxShadow: '0 24px 60px -15px rgba(15,23,42,0.25)',
                    border: '1px solid rgba(15,23,42,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden'
                  }}>
                    {/* Modal Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DoorOpen size={18} color="#0b57d0" /> {editingRoom ? `„${editingRoom.name}“ bearbeiten` : 'Neuen Raum anlegen'}
                      </h4>
                      <button
                        onClick={() => { setRoomsSubView('overview'); setEditingRoom(null); }}
                        style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Modal Body / Scrollable Content */}
                    <div style={{
                      padding: '28px 18px 40px 28px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '10px' }}>
                        {/* Name */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Raumname *</label>
                          <input
                            value={roomFormName}
                            onChange={e => setRoomFormName(e.target.value)}
                            placeholder='z.B. „Raum 1 – Schlagzeug“ oder „Studio Nord“'
                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                          />
                        </div>

                        {/* Max students & QM */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Max. Schüler</label>
                            <input
                              type="number"
                              value={roomFormMaxStudents}
                              onChange={e => setRoomFormMaxStudents(parseInt(e.target.value) || 1)}
                              min="1"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Größe in m²</label>
                            <input
                              type="number"
                              value={roomFormQm}
                              onChange={e => setRoomFormQm(parseFloat(e.target.value) || 0)}
                              min="0"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                            />
                          </div>
                        </div>

                        {/* Modul */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Modul</label>
                          <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={roomFormIsCampusActive}
                                onChange={e => setRoomFormIsCampusActive(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: '#0b57d0', cursor: 'pointer' }}
                              />
                              Campus
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={roomFormIsGroovelabActive}
                                onChange={e => setRoomFormIsGroovelabActive(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: '#0b57d0', cursor: 'pointer' }}
                              />
                              Groovelab
                            </label>
                          </div>
                        </div>

                        {/* Akustisch ungeeignete Instrumente */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Akustisch ungeeignet für</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {['Schlagzeug', 'Klavier', 'E-Piano', 'Gitarre', 'Bass', 'Gesang', 'Bläser', 'Keyboard'].map(inst => {
                              const isUnsuitable = roomFormUnsuitableInstruments.includes(inst);
                              return (
                                <button
                                  key={inst}
                                  type="button"
                                  onClick={() => {
                                    if (isUnsuitable) {
                                      setRoomFormUnsuitableInstruments(prev => prev.filter(i => i !== inst));
                                    } else {
                                      setRoomFormUnsuitableInstruments(prev => [...prev, inst]);
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: isUnsuitable ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                                    background: isUnsuitable ? '#fef2f2' : 'white',
                                    color: isUnsuitable ? '#ef4444' : '#475569',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {inst}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Vorhandene Instrumente */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Vorhandene Instrumente (mit Modell)</label>
                          
                          {/* List of existing */}
                          {roomFormRoomInstruments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                              {roomFormRoomInstruments.map((inst, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                    {inst.name} <span style={{ color: '#64748b', fontWeight: 550 }}>({inst.model || 'Standard'})</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRoomFormRoomInstruments(prev => prev.filter((_, i) => i !== idx))}
                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', padding: '2px' }}
                                  >
                                    Löschen
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Instrument Form Inline */}
                          <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '10px', alignItems: 'center' }}>
                            <input
                              placeholder="z.B. Klavier"
                              value={newInstrumentName}
                              onChange={e => setNewInstrumentName(e.target.value)}
                              style={{ flex: 1, height: '36px', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: 'white' }}
                            />
                            <input
                              placeholder="Typ: z.B. Yamaha U1"
                              value={newInstrumentModel}
                              onChange={e => setNewInstrumentModel(e.target.value)}
                              style={{ flex: 1, height: '36px', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: 'white' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newInstrumentName.trim()) return;
                                setRoomFormRoomInstruments(prev => [...prev, { name: newInstrumentName.trim(), model: newInstrumentModel.trim() }]);
                                setNewInstrumentName('');
                                setNewInstrumentModel('');
                              }}
                              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: '#0b57d0', color: 'white', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Sonstiges */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Sonstiges (z.B. Bluetooth Box)</label>
                          <input
                            value={roomFormSonstiges}
                            onChange={e => setRoomFormSonstiges(e.target.value)}
                            placeholder='z.B. Bluetooth Box, Belüftung, Whiteboard...'
                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{ padding: '20px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', background: '#f8fafc' }}>
                      <button
                        onClick={handleSaveRoom}
                        disabled={roomSaving || !roomFormName.trim()}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          opacity: roomSaving || !roomFormName.trim() ? 0.6 : 1,
                          boxShadow: '0 4px 12px rgba(11,87,208,0.15)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {roomSaving ? 'Speichert…' : editingRoom ? 'Änderungen speichern' : 'Raum anlegen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRoomsSubView('overview'); setEditingRoom(null); }}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: 'white',
                          color: '#64748b',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Re-use the same selectedDayPlan detail drawer */}
              {selectedDayPlan && roomsSubView === 'plan' && (
                <div style={{ position: 'fixed', top: 0, right: 0, width: '380px', height: '100vh', background: 'white', boxShadow: '-12px 0 48px rgba(15,23,42,0.14)', borderLeft: '1px solid #e2e8f0', zIndex: 1050, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                        {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][selectedDayPlan.dayOfWeek]} · Lese-Ansicht
                      </span>
                      <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>{getPlanDisplayName(selectedDayPlan)}</h3>
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
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f', display: 'block' }}>{isBreak ? '☕ Pause' : slot.student_name}</span>
                            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                              {isBreak ? 'Pause' : `Instrument: ${slot.student_instrument || selectedDayPlan.instrument || 'Instrument'}`}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: isBreak ? '#b45309' : '#0f172a' }}>{slot.time_slot}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </>
          );
        })()}

        {/* TAB 1.7.5: SECRETARY - EQUIPMENT */}

        {activeTab === 'secretary' && secretarySubTab === 'equipment' && (() => {
          const selectedRoom = rooms.find(r => r.id === selectedEquipmentRoomId);
          
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', fontFamily: 'Inter, sans-serif', alignItems: 'start' }}>
              
              {/* LEFT COLUMN: WIDGET */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Selected Room Header or Title */}
                <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedRoom ? `🏢 Instrumente in „${selectedRoom.name}“` : 'Alle Instrumente & Ausstattungen'}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                    {selectedRoom 
                      ? `Es werden nur Instrumente angezeigt, die dem Raum „${selectedRoom.name}“ zugeordnet sind. Klicke auf ein Instrument, um es zu bearbeiten.`
                      : 'Hier werden alle Instrumente der Musikschule aufgelistet. Ziehe freie Instrumente auf die Räume rechts, um sie zuzuweisen.'
                    }
                  </p>
                </div>

                {/* Unified Instruments List Widget */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Unified Search, Filter & Creation Row Widget */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    
                    {/* Creation Form inline (Left) */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveEquipment();
                      }}
                      style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: 0, flex: 2, minWidth: '320px' }}
                    >
                      <input
                        ref={equipmentNameInputRef}
                        value={equipmentFormName}
                        onChange={e => setEquipmentFormName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && equipmentFormName.trim()) {
                            e.preventDefault();
                            equipmentQtyInputRef.current?.focus();
                            equipmentQtyInputRef.current?.select();
                          }
                        }}
                        placeholder='Neues Instrument anlegen...'
                        style={{ width: '280px', height: '38px', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, outline: 'none', background: 'white' }}
                      />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', height: '38px', boxSizing: 'border-box', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>Menge:</span>
                        <input
                          ref={equipmentQtyInputRef}
                          type="number"
                          min="1"
                          max="50"
                          value={equipmentFormQty}
                          onChange={e => setEquipmentFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: '30px', border: 'none', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center', outline: 'none', background: 'transparent' }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={equipmentSaving || !equipmentFormName.trim()}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          opacity: equipmentSaving || !equipmentFormName.trim() ? 0.6 : 1,
                          boxShadow: '0 2px 6px rgba(11,87,208,0.15)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {equipmentSaving ? 'Wird angelegt...' : 'Anlegen'}
                      </button>
                    </form>

                    {/* Vertical separator */}
                    <div style={{ width: '1.5px', height: '24px', background: '#cbd5e1', margin: '0 4px', flexShrink: 0 }} />

                    {/* Search & Filter (Right) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '180px', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', height: '38px', boxSizing: 'border-box', flexShrink: 0 }}>
                      <Search size={16} color="#94a3b8" />
                      <input
                        value={equipmentSearchQuery}
                        onChange={e => setEquipmentSearchQuery(e.target.value)}
                        placeholder="Instrumente durchsuchen..."
                        style={{ border: 'none', outline: 'none', fontSize: '0.78rem', fontWeight: 700, width: '100%', color: '#0f172a', background: 'transparent' }}
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setEquipmentSortFreeFirst(prev => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: equipmentSortFreeFirst ? '#eff6ff' : 'white',
                        border: equipmentSortFreeFirst ? '1.5px solid #0b57d0' : '1.5px solid #cbd5e1',
                        color: equipmentSortFreeFirst ? '#0b57d0' : '#475569',
                        padding: '0 14px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'Urbanist',
                        height: '38px',
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}
                    >
                      <span>Freie Instrumente</span>
                    </button>
                  </div>

                  {/* Unified List items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                      // 1. Gather all equipment instances with assignment info
                      const allInstances = schoolEquipment.map((eq: any) => {
                        const assignedRm = rooms.find(rm => 
                          Array.isArray(rm.room_instruments) && 
                          rm.room_instruments.some((inst: any) => inst.name === eq.name)
                        );
                        const roomInst = assignedRm?.room_instruments?.find((inst: any) => inst.name === eq.name);
                        let model = 'Standard';
                        try {
                          const localModelMap = JSON.parse(localStorage.getItem(`groovelab_instrument_models_${schoolId}`) || '{}');
                          if (localModelMap[eq.name]) {
                            model = localModelMap[eq.name];
                          } else if (roomInst?.model) {
                            model = roomInst?.model;
                          }
                        } catch {
                          if (roomInst?.model) {
                            model = roomInst?.model;
                          }
                        }
                        let linkUrl = '';
                        try {
                          const localLinkMap = JSON.parse(localStorage.getItem(`groovelab_instrument_links_${schoolId}`) || '{}');
                          if (localLinkMap[eq.name]) {
                            linkUrl = localLinkMap[eq.name];
                          }
                        } catch {}
                        const baseName = eq.name.replace(/\s+#\d+$/, '');

                        return {
                          id: eq.id,
                          fullName: eq.name,
                          baseName,
                          model,
                          linkUrl,
                          roomId: assignedRm?.id || null,
                          roomName: assignedRm?.name || null,
                          roomInstIdx: assignedRm ? assignedRm.room_instruments.findIndex((inst: any) => inst.name === eq.name) : -1
                        };
                      });

                      // 2. Group by baseName + model
                      const groupsMap: Record<string, { baseName: string, model: string, instances: typeof allInstances }> = {};
                      allInstances.forEach(inst => {
                        const key = `${inst.baseName}:::${inst.model}`;
                        if (!groupsMap[key]) {
                          groupsMap[key] = {
                            baseName: inst.baseName,
                            model: inst.model,
                            instances: []
                          };
                        }
                        groupsMap[key].instances.push(inst);
                      });

                      let filteredGroups = Object.values(groupsMap);

                      // Apply search filter
                      if (equipmentSearchQuery.trim()) {
                        const query = equipmentSearchQuery.toLowerCase();
                        filteredGroups = filteredGroups.filter(g => 
                          g.baseName.toLowerCase().includes(query) || 
                          g.model.toLowerCase().includes(query)
                        );
                      }

                      // Apply filter: only free
                      if (equipmentSortFreeFirst) {
                        filteredGroups = filteredGroups
                          .map(g => ({
                            ...g,
                            instances: g.instances.filter(inst => !inst.roomId)
                          }))
                          .filter(g => g.instances.length > 0);
                      }

                      // 3. Filter groups based on selected room
                      if (selectedRoom) {
                        filteredGroups = filteredGroups
                          .map(g => ({
                            ...g,
                            instances: g.instances.filter(inst => inst.roomId === selectedRoom.id)
                          }))
                          .filter(g => g.instances.length > 0);
                      }

                      if (filteredGroups.length === 0) {
                        return (
                          <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700, padding: '24px 0', margin: 0 }}>
                            {selectedRoom ? 'Keine Instrumente in diesem Raum' : 'Keine Instrumente im Pool'}
                          </p>
                        );
                      }

                      return filteredGroups.map((group) => {
                        // Find first free instance in this group for dragging
                        const firstFreeInstance = group.instances.find(inst => !inst.roomId);
                        const hasFree = !!firstFreeInstance;

                        return (
                          <div 
                            key={`${group.baseName}:::${group.model}`}
                            draggable={hasFree && !selectedRoom}
                            onDragStart={(e) => {
                              if (!firstFreeInstance) return;
                              e.dataTransfer.setData("text/plain", firstFreeInstance.fullName);
                              e.dataTransfer.effectAllowed = "copyMove";
                            }}
                            onClick={() => {
                              setEditingEquipmentGroup(group);
                              setEditGroupName(group.baseName);
                              setEditGroupModel(group.model);
                              setEditGroupLink(group.instances[0]?.linkUrl || '');
                              setEditGroupCoupled(true);
                              setEditGroupQty(group.instances.length);
                              setEditGroupInstancesData(group.instances.map(inst => ({ ...inst })));
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              background: 'white',
                              border: '1px solid #f1f5f9',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                              gap: '16px'
                            }}
                            className="hover-scale-mini"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                              
                              {/* Horizontal wrapper for name/model and locations */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {group.baseName}
                                    {group.instances[0]?.linkUrl && (
                                      <a 
                                        href={group.instances[0].linkUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ display: 'inline-flex', alignItems: 'center', color: '#0b57d0' }}
                                        title="Instrument online ansehen"
                                      >
                                        <LinkIcon size={12} />
                                      </a>
                                    )}
                                  </span>
                                  <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 800 }}>
                                    Modell: {group.model} ({group.instances.length})
                                  </span>
                                </div>

                                {/* Locations row inline behind name/model */}
                                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, paddingBottom: '2px' }} className="no-scrollbar">
                                  {group.instances.map((inst) => {
                                    const isInstAssigned = !!inst.roomId;
                                    
                                    return (
                                      <div 
                                        key={inst.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isInstAssigned) {
                                            setEditingRoomInstrument({ 
                                              roomId: inst.roomId!, 
                                              index: inst.roomInstIdx, 
                                              name: inst.fullName, 
                                              model: inst.model || '' 
                                            });
                                            setEditRoomInstFormName(inst.fullName);
                                            setEditRoomInstFormModel(inst.model || '');
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          background: isInstAssigned ? '#eff6ff' : '#f8fafc',
                                          border: isInstAssigned ? '1.5px solid #dbeafe' : '1.5px solid #e2e8f0',
                                          cursor: isInstAssigned ? 'pointer' : 'grab',
                                          fontSize: '0.65rem',
                                          fontWeight: 800,
                                          color: isInstAssigned ? '#0b57d0' : '#475569',
                                          fontFamily: 'Urbanist',
                                          transition: 'all 0.15s',
                                          flexShrink: 0,
                                          whiteSpace: 'nowrap'
                                        }}
                                        className="hover-scale-mini"
                                        title={isInstAssigned ? "Klicken zum Bearbeiten des Modells in diesem Raum" : "Ziehe dieses freie Instrument auf einen Raum"}
                                      >
                                        {isInstAssigned ? (
                                          <>
                                            <span>🚪 {inst.roomName}</span>
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleRemoveRoomInstrument(inst.roomId!, inst.roomInstIdx);
                                              }}
                                              style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ef4444',
                                                fontWeight: 900,
                                                marginLeft: '3px',
                                                cursor: 'pointer',
                                                padding: 0
                                              }}
                                              title="Freigeben (zurück in den Pool)"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <span>📦 Pool / Frei</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Delete group action if completely unassigned */}
                            {!selectedRoom && group.instances.every(inst => !inst.roomId) && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Möchtest du alle ${group.instances.length} Exemplare von „${group.baseName}“ löschen?`)) {
                                    for (const inst of group.instances) {
                                      await supabase.from('school_equipment').delete().eq('id', inst.id);
                                    }
                                    setSchoolEquipment(prev => prev.filter(eq => !group.instances.some(inst => inst.id === eq.id)));
                                  }
                                }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', flexShrink: 0 }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* EDIT ROOM INSTRUMENT MODAL */}
                {editingRoomInstrument && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(15, 23, 42, 0.3)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}>
                    <div style={{
                      background: 'white',
                      borderRadius: '24px',
                      border: '1px solid rgba(0,0,0,0.05)',
                      padding: '28px',
                      width: '400px',
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          🔧 Instrument bearbeiten
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 550 }}>
                          Passe den Anzeigenamen und die genaue Modellbezeichnung für diesen Raum an.
                        </p>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Anzeigename</label>
                        <input
                          value={editRoomInstFormName}
                          onChange={e => setEditRoomInstFormName(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Modellbezeichnung</label>
                        <input
                          value={editRoomInstFormModel}
                          onChange={e => setEditRoomInstFormModel(e.target.value)}
                          placeholder="z.B. Yamaha U1, Roland FP-30..."
                          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleSaveRoomInstrumentEdit(editRoomInstFormName, editRoomInstFormModel)}
                          disabled={!editRoomInstFormName.trim()}
                          style={{ flex: 1, background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => setEditingRoomInstrument(null)}
                          style={{ padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT EQUIPMENT GROUP MODAL */}
                {editingEquipmentGroup && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(15, 23, 42, 0.3)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999
                  }}>
                    <div style={{
                      background: 'white',
                      borderRadius: '24px',
                      padding: '24px',
                      width: (!editGroupCoupled && editGroupInstancesData.length > 1) ? '680px' : '420px',
                      maxWidth: '95%',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      transition: 'width 0.25s ease-in-out'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Ausstattung bearbeiten</h3>
                        <button 
                          onClick={() => setEditingEquipmentGroup(null)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <X size={18} color="#64748b" />
                        </button>
                      </div>

                      {/* Coupled Checkbox */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={editGroupCoupled}
                          onChange={(e) => setEditGroupCoupled(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', fontFamily: 'Urbanist' }}>Koppeln (Alle Exemplare zusammengruppieren)</span>
                      </label>

                      {/* Quantity Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Anzahl Exemplare</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(Math.max(1, editGroupQty - 1))}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: '1.5px solid #e2e8f0',
                              background: 'white',
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b'
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={editGroupQty}
                            onChange={e => handleQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{
                              width: '70px',
                              height: '36px',
                              textAlign: 'center',
                              borderRadius: '10px',
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem',
                              fontWeight: 900,
                              color: '#0f172a',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(editGroupQty + 1)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: '1.5px solid #e2e8f0',
                              background: 'white',
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b'
                            }}
                          >
                            +
                          </button>

                          {editGroupQty < editingEquipmentGroup.instances.length && (
                            <span style={{ fontSize: '0.64rem', color: '#ef4444', fontWeight: 800, flex: 1 }}>
                              ⚠️ {editingEquipmentGroup.instances.length - editGroupQty} Exemplar(e) werden gelöscht
                            </span>
                          )}
                        </div>
                      </div>

                      {editGroupCoupled ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Anzeigename</span>
                            <input
                              value={editGroupName}
                              onChange={e => setEditGroupName(e.target.value)}
                              placeholder="z.B. Schlagzeug"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Modell</span>
                            <input
                              value={editGroupModel}
                              onChange={e => setEditGroupModel(e.target.value)}
                              placeholder="z.B. Yamaha Stage Custom"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Link / Webseite (optional)</span>
                            <input
                              value={editGroupLink}
                              onChange={e => setEditGroupLink(e.target.value)}
                              placeholder="https://example.com/instrument-info"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                            />
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Exemplare einzeln bearbeiten</span>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: editGroupInstancesData.length > 1 ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', 
                            gap: '12px', 
                            maxHeight: '380px', 
                            overflowY: 'auto', 
                            paddingRight: '4px' 
                          }}>
                            {editGroupInstancesData.map((inst, idx) => (
                              <div key={inst.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0b57d0' }}>{inst.fullName || `Exemplar #${idx + 1}`}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b' }}>Name</span>
                                  <input
                                    value={inst.fullName}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setEditGroupInstancesData(prev => prev.map(p => p.id === inst.id ? { ...p, fullName: val } : p));
                                    }}
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700 }}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b' }}>Modell</span>
                                  <input
                                    value={inst.model}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setEditGroupInstancesData(prev => prev.map(p => p.id === inst.id ? { ...p, model: val } : p));
                                    }}
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700 }}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b' }}>Link / Webseite (optional)</span>
                                  <input
                                    value={inst.linkUrl || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setEditGroupInstancesData(prev => prev.map(p => p.id === inst.id ? { ...p, linkUrl: val } : p));
                                    }}
                                    placeholder="https://example.com/..."
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button
                          onClick={handleSaveEquipmentGroup}
                          disabled={editGroupCoupled ? !editGroupName.trim() : editGroupInstancesData.some(inst => !inst.fullName.trim())}
                          style={{ flex: 1, background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => setEditingEquipmentGroup(null)}
                          style={{ padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: SIDEBAR */}
              <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Räume der Musikschule</h4>
                
                {/* Alle Räume Sidebar Row */}
                <div 
                  onClick={() => setSelectedEquipmentRoomId('All')}
                  style={{ 
                    padding: '12px 14px', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    background: selectedEquipmentRoomId === 'All' ? '#eff6ff' : '#f8fafc',
                    border: selectedEquipmentRoomId === 'All' ? '1.5px solid #0b57d0' : '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedEquipmentRoomId === 'All' ? '#0b57d0' : '#1e293b' }}>
                    🏢 Alle Räume
                  </span>
                </div>

                {/* Rooms List */}
                {[...rooms].sort((a, b) => {
                  const parsedA = parseRoomName(a.name || '');
                  const parsedB = parseRoomName(b.name || '');
                  const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, 'de', { sensitivity: 'base' });
                  if (prefixCompare !== 0) return prefixCompare;
                  
                  const numA = parsedA.number !== null ? parsedA.number : -1;
                  const numB = parsedB.number !== null ? parsedB.number : -1;
                  return numA - numB;
                }).map(rm => {
                  const isSelected = selectedEquipmentRoomId === rm.id;
                  const isDragOver = dragOverRoomId === rm.id;
                  
                  return (
                    <div 
                      key={rm.id}
                      onClick={() => setSelectedEquipmentRoomId(rm.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverRoomId(rm.id);
                      }}
                      onDragLeave={() => setDragOverRoomId(null)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const instName = e.dataTransfer.getData("text/plain");
                        setDragOverRoomId(null);
                        if (instName) {
                          await handleDropInstrumentOnRoom(instName, rm.id);
                        }
                      }}
                      style={{ 
                        padding: '12px 14px', 
                        borderRadius: '12px', 
                        cursor: 'pointer', 
                        background: isSelected ? '#eff6ff' : isDragOver ? '#f0fdf4' : '#f8fafc',
                        border: isSelected ? '1.5px solid #0b57d0' : isDragOver ? '2px dashed #22c55e' : '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? '#0b57d0' : '#1e293b' }}>
                          🚪 {rm.name}
                        </span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#86868b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                          {rm.floor || 'Allgemein'}
                        </span>
                      </div>
                      
                      {/* Short summary of configured instruments */}
                      {rm.room_instruments && rm.room_instruments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                          {rm.room_instruments.map((inst: any, idx: number) => (
                            <span key={idx} style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 650, background: 'white', padding: '1px 4px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                              {inst.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })()}

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
                      setCopiedSchoolLink(true);
                      setTimeout(() => setCopiedSchoolLink(false), 2000);
                    }} 
                    className="google-btn-primary" 
                    style={{ 
                      padding: '10px 18px', 
                      fontSize: '0.8rem', 
                      background: copiedSchoolLink ? '#34a853' : undefined,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {copiedSchoolLink ? '✓ Kopiert!' : 'Link kopieren'}
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Logo URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Abonnierter iCal Kalender-Link (ICS Feed)</label>
                <input
                  type="url"
                  placeholder="https://example.com/calendar.ics"
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                  Gibt die URL eines externen Kalenders (.ics Format) an, um Schultermine in den Campus-Events zu synchronisieren.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button 
                  onClick={handleSaveBrandingAndCalendar}
                  className="google-btn-primary" 
                  style={{ padding: '10px 24px', fontSize: '0.85rem' }}
                >
                  Einstellungen speichern
                </button>
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

        {activeTab === 'secretary' && secretarySubTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
              @media print {
                .no-print { display: none !important; }
                body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
                .google-card, table { box-shadow: none !important; border: none !important; }
                th, td { border-bottom: 1px solid #ddd !important; padding: 8px !important; }
                tr { page-break-inside: avoid !important; }
              }
            `}</style>
            
            {/* Header */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} color="#ea4335" /> Änderungsprotokoll (Audit Trail)
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                  Protokolliert alle administrativen und systemischen Änderungen an den Benutzerprofilen dieser Musikschule.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={exportAuditLogsToCsv}
                  className="google-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px 14px', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                  disabled={auditLogs.length === 0}
                >
                  📥 Excel/CSV Export
                </button>
                <button
                  onClick={() => window.print()}
                  className="google-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px 14px', borderRadius: '10px', background: '#ea4335', color: 'white', border: 'none', cursor: 'pointer' }}
                  disabled={auditLogs.length === 0}
                >
                  🖨️ PDF / Drucken
                </button>
              </div>
            </div>

            {/* Filter-Bar */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '16px 20px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '12px', alignItems: 'center' }} className="no-print">
              <div style={{ flex: 1, display: 'flex', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', alignItems: 'center', gap: '8px' }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  placeholder="Nach Name oder ID filtern..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Aktion:</span>
                <select
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.8rem', fontWeight: 700, outline: 'none', color: '#1e293b' }}
                >
                  <option value="All">Alle Aktionen</option>
                  <option value="INSERT">Erstellung (INSERT)</option>
                  <option value="UPDATE">Aktualisierung (UPDATE)</option>
                  <option value="DELETE">Löschung (DELETE)</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 650, fontSize: '0.85rem' }}>
                  Lade Logs...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Zeitpunkt</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Aktion</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Geändert von</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Details der Änderung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs
                      .filter(log => {
                        const changer = log.users ? `${log.users.first_name} ${log.users.last_name}`.toLowerCase() : 'system';
                        const matchesSearch = !auditSearchQuery.trim() || 
                          changer.includes(auditSearchQuery.toLowerCase().trim()) || 
                          log.record_id.toLowerCase().includes(auditSearchQuery.toLowerCase().trim());
                        
                        const matchesAction = auditActionFilter === 'All' || log.action === auditActionFilter;
                        
                        return matchesSearch && matchesAction;
                      })
                      .map((log) => {
                        const dateFormatted = new Date(log.created_at).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });

                        let badgeBg = '#e6f4ea';
                        let badgeColor = '#137333';
                        if (log.action === 'UPDATE') {
                          badgeBg = '#fef7e0';
                          badgeColor = '#b06000';
                        } else if (log.action === 'DELETE') {
                          badgeBg = '#fce8e6';
                          badgeColor = '#c5221f';
                        }

                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {dateFormatted}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                background: badgeBg,
                                color: badgeColor,
                                textTransform: 'uppercase'
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                              {log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System'}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '0.75rem', color: '#1e293b', maxWidth: '450px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px' }}>
                                  {log.table_name === 'users' ? 'Betroffener Nutzer' : 'Datensatz'}:{' '}
                                  <strong style={{ color: '#475569' }}>
                                    {log.table_name === 'users' ? (userMap[log.record_id] || 'Unbekannt') : log.table_name}
                                  </strong>{' '}
                                  (#{log.record_id.substring(0, 8)})
                                </div>
                                {renderDiffContent(log)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                          Keine Protokolleinträge gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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
              
              {/* GENERAL INFO CARD */}
              <div>
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
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Instrumente/Fächer</label>
                <AppleStyleTokenField
                  label=""
                  selectedString={manageTeacher.instrument}
                  onChange={(val) => setManageTeacher({ ...manageTeacher, instrument: val })}
                  suggestions={activeSubjectsList}
                  placeholder="Unterrichtsfächer auswählen..."
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
                    const newPin = generateStarterPin(manageTeacher.role || 'teacher', manageTeacher.isCampusActive ?? false, manageTeacher.isGroovelabActive ?? false);
                    try {
                      const { error } = await supabase
                        .from('users')
                        .update({ 
                          ausweis_nummer: newPin, 
                          is_pin_activated: false,
                          personal_pin: null
                        })
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
                const isActive = manageTeacher.isActive || manageTeacher.is_active;
                const link = token;
                const label = isActive ? 'Login-QR-Code (Ausweis)' : 'Aktivierungs-QR-Code';
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
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', alignSelf: 'flex-start', textTransform: 'uppercase' }}>{label}</span>
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginTop: '-4px', marginBottom: '2px', textAlign: 'center' }}>
                      {manageTeacher.firstName || ''} {manageTeacher.lastName || ''}
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
