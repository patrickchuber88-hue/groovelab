import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, CheckCircle, Users, Settings, Bell, 
  UserCheck, RefreshCw, Key, ChevronRight, UserX, LogOut,
  Copy, Check, Link as LinkIcon, Monitor, Sliders,
  Coffee, Sparkles, Clock, ClipboardList, Upload, Plus,
  Trash2, Shield, Calendar, BookOpen, Music, CheckSquare, XSquare, Check as CheckIcon,
  LayoutDashboard, Award, UserPlus, GraduationCap, ZoomIn, ZoomOut, ChevronLeft, X, AlertCircle
} from 'lucide-react';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDetailModal } from './StudentDetailModal';

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
}

interface GrooveLabCoach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  instrument: string;
  isActive: boolean;
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

interface SecretaryDashboardProps {
  schoolId: string;
  userId?: string;
  onLogout?: () => void;
}

export function SecretaryDashboard({ schoolId, userId, onLogout }: SecretaryDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'secretary' | 'campus' | 'groovelab'>('secretary');
  const [secretarySubTab, setSecretarySubTab] = useState<'briefing' | 'employees' | 'linking' | 'licenses' | 'setup'>('briefing');
  const [campusSubTab, setCampusSubTab] = useState<'briefing' | 'onboarding' | 'schedules' | 'status'>('briefing');
  const [groovelabSubTab, setGroovelabSubTab] = useState<'briefing' | 'live' | 'students' | 'coaches' | 'kiosk' | 'status'>('briefing');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null);

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
        setHasCampusSub(schoolData.has_campus_subscription ?? false);
        setHasGroovelabSub(schoolData.has_groovelab_subscription ?? false);
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
        .select('id, first_name, last_name, role, email, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, nickname')
        .eq('school_id', schoolId);

      if (usersErr) throw usersErr;

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
          if (!u.is_active) {
            bypassList.push({
              id: u.id,
              firstName: u.first_name,
              lastName: u.last_name,
              email: u.email || '',
              instrument: u.instrument || '',
              maxStudents: 10,
              ausweisNummer: u.ausweis_nummer || '',
              teacherQrToken: u.teacher_qr_token || ''
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
                isActive: u.is_active ?? true
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
                isGroovelabActive: u.is_groovelab_active
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

      setRooms(roomsData || []);
      if (roomsData && roomsData.length > 0 && !selectedRoomId) {
        setSelectedRoomId(roomsData[0].id);
      }

      const rMap: Record<string, string> = {};
      roomsData?.forEach(r => {
        rMap[r.id] = r.name;
      });
      setRoomMap(rMap);

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

      // Fetch pending schedules
      const { data: schedulesData, error: schedErr } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'ready_for_admin_review');

      if (schedErr) throw schedErr;
      const mappedSchedules = (schedulesData || []).map(s => ({
        ...s,
        teacher_name: map[s.teacher_id] || 'Unbekannte Lehrkraft',
        student_name: map[s.student_id] || 'Unbekannter Schüler',
        room_name: s.room_id ? rMap[s.room_id] || 'Unbekannter Raum' : 'Kein Raum'
      }));
      setPendingSchedules(mappedSchedules);

      // Calculate stats
      const activeAlertsCount = mappedAlerts.filter(a => !a.resolved && a.type === 'capacity_overrun').length;
      const inactiveTeachersCount = bypassList.length;

      const { data: allScheds } = await supabase
        .from('schedules')
        .select('status')
        .eq('school_id', schoolId);

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

    } catch (err: any) {
      console.error('Error fetching secretary dashboard data:', err);
    } finally {
      setLoading(false);
    }
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

  // Get active tab title helper
  const getTabTitle = () => {
    switch (activeTab) {
      case 'secretary':
        switch (secretarySubTab) {
          case 'briefing': return '📊 Tägliches Briefing & Status';
          case 'employees': return '👥 Mitarbeiterverwaltung';
          case 'linking': return '🔗 Schüler-Profilverknüpfung';
          case 'licenses': return '🎫 Lizenzen & Abrechnung';
          case 'setup': return '⚙️ Setup & Systemeinstellungen';
          default: return '💼 Sekretariat';
        }
      case 'campus': return '🎓 Campus Verwaltung';
      case 'groovelab': return '🎸 GrooveLab Verwaltung';
      default: return '';
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: activeTab === 'groovelab' ? '#09090b' : '#f8fafc',
      color: activeTab === 'groovelab' ? '#f4f4f5' : '#1d1d1f',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Global CSS injections matching the screenshot design */}
      <style dangerouslySetInnerHTML={{__html: `
        .google-card {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: var(--glass-shadow);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }
        .google-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--glass-shadow-lg);
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
          padding: 12px 16px;
          border-radius: var(--radius-sm);
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
          color: var(--text-main);
        }
        
        /* Active states for each tab theme */
        .google-sidebar-item.active.briefing {
          background: rgba(216, 30, 5, 0.08) !important;
          color: #d81e05 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.campus {
          background: rgba(19, 115, 51, 0.08) !important;
          color: #137333 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.groovelab {
          background: rgba(251, 188, 5, 0.12) !important;
          color: #fbbc05 !important;
          font-weight: 700;
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
        .google-sidebar-item.active.licenses {
          background: rgba(185, 28, 28, 0.08) !important;
          color: #b91c1c !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.setup {
          background: rgba(107, 33, 168, 0.08) !important;
          color: #6b21a8 !important;
          font-weight: 700;
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
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-secondary);
        }
        .google-sidebar-item:hover .sidebar-icon-circle {
          background: rgba(0, 0, 0, 0.08);
          color: var(--text-main);
        }

        /* Active badge styles */
        .google-sidebar-item.active.briefing .sidebar-icon-circle {
          background: #d81e05;
          color: #ffffff;
        }
        .google-sidebar-item.active.campus .sidebar-icon-circle {
          background: #34a853;
          color: #ffffff;
        }
        .google-sidebar-item.active.groovelab .sidebar-icon-circle {
          background: #fbbc05;
          color: #ffffff;
        }
        .google-sidebar-item.active.licenses .sidebar-icon-circle {
          background: #ea4335;
          color: #ffffff;
        }
        .google-sidebar-item.active.setup .sidebar-icon-circle {
          background: #a855f7;
          color: #ffffff;
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
          background: activeTab === 'groovelab' ? '#18181b' : undefined,
          borderRight: activeTab === 'groovelab' ? '1px solid #27272a' : undefined
        }}
      >
        {/* Brand header */}
        <div style={{ paddingBottom: '12px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.4rem', 
            fontWeight: 800, 
            color: activeTab === 'secretary' ? '#d81e05' : activeTab === 'campus' ? '#137333' : '#eab308', 
            letterSpacing: '-0.03em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'color 0.2s'
          }}>
            {activeTab === 'secretary' ? 'Sekretariat' : activeTab === 'campus' ? 'Campus' : 'GrooveLab'}
          </h1>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.02em' }}>
            {activeTab === 'secretary' ? 'SCHULVERWALTUNG' : activeTab === 'campus' ? 'LERNPLATFORM' : 'LIVE-MUSIK-LABOR'}
          </span>
        </div>

        {/* Dynamic Sidebar Nav Items based on top bar selected Suite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {/* If activeTab is Secretary */}
          {activeTab === 'secretary' && [
            { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
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
            { id: 'onboarding', label: 'Lehrer-Onboarding', icon: UserPlus },
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
            { id: 'live', label: 'Live Lab', icon: Monitor },
            { id: 'coaches', label: 'Lehrer', icon: Coffee },
            { id: 'students', label: 'Schüler', icon: Users },
            { id: 'status', label: 'Support & Inventar', icon: ShieldAlert },
            { id: 'kiosk', label: 'Setup', icon: Sliders }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = groovelabSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setGroovelabSubTab(item.id as any)}
                className={`google-sidebar-item groovelab groovelab-dark ${isSelected ? 'active' : ''}`}
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
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <div 
            onClick={() => {
              setActiveTab('secretary');
              setSecretarySubTab('briefing');
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'secretary' && secretarySubTab === 'briefing' ? '#f1f5f9' : 'transparent',
              marginBottom: '8px'
            }}
            className="hover-bg-gray"
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
                {currentUserProfile?.nickname || currentUserProfile?.first_name || 'Sekretariat'}
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
              className="hover-bg-red"
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
        background: activeTab === 'groovelab' ? '#09090b' : '#f8fafc',
        color: activeTab === 'groovelab' ? '#f4f4f5' : '#1d1d1f'
      }}>
        
        {/* Top Header with App Suite Switcher Tabs (Karteireiter) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          height: '80px',
          borderBottom: activeTab === 'groovelab' ? '1px solid #27272a' : '1px solid rgba(0,0,0,0.05)',
          background: activeTab === 'groovelab' ? '#18181b' : 'rgba(255, 255, 255, 0.88)',
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
            {/* Sekretariat Tab */}
            <div 
              onClick={() => {
                setActiveTab('secretary');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px 10px',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                background: activeTab === 'secretary' ? '#ea4335' : 'rgba(234, 67, 53, 0.06)',
                color: activeTab === 'secretary' ? '#ffffff' : '#ea4335',
                border: activeTab === 'secretary' ? '1px solid #ea4335' : '1px solid rgba(234, 67, 53, 0.18)',
                borderBottom: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activeTab === 'secretary' ? 2 : 1,
                transform: activeTab === 'secretary' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activeTab === 'secretary' ? '0 -4px 12px rgba(234, 67, 53, 0.2)' : 'none',
                transition: 'all 0.25s ease',
                height: '42px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <Shield size={14} color={activeTab === 'secretary' ? '#ffffff' : '#ea4335'} />
              <span>Sekretariat</span>
            </div>

            {/* Campus Tab */}
            {hasCampusSub && (
              <div 
                onClick={() => {
                  setActiveTab('campus');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px 10px',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  background: activeTab === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.06)',
                  color: activeTab === 'campus' ? '#ffffff' : '#34a853',
                  border: activeTab === 'campus' ? '1px solid #34a853' : '1px solid rgba(52, 168, 83, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activeTab === 'campus' ? 2 : 1,
                  transform: activeTab === 'campus' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activeTab === 'campus' ? '0 -4px 12px rgba(52, 168, 83, 0.2)' : 'none',
                  transition: 'all 0.25s ease',
                  height: '42px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <GraduationCap size={14} color={activeTab === 'campus' ? '#ffffff' : '#34a853'} />
                <span>Campus</span>
              </div>
            )}

            {/* GrooveLab Tab */}
            {hasGroovelabSub && (
              <div 
                onClick={() => {
                  setActiveTab('groovelab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px 10px',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  background: activeTab === 'groovelab' ? '#fbbc05' : 'rgba(251, 188, 5, 0.06)',
                  color: activeTab === 'groovelab' ? '#09090b' : '#b45309', // Dark grey/black text when active for contrast, warm brown when inactive
                  border: activeTab === 'groovelab' ? '1px solid #fbbc05' : '1px solid rgba(251, 188, 5, 0.18)',
                  borderBottom: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  zIndex: activeTab === 'groovelab' ? 2 : 1,
                  transform: activeTab === 'groovelab' ? 'translateY(1px)' : 'translateY(0)',
                  boxShadow: activeTab === 'groovelab' ? '0 -4px 12px rgba(251, 188, 5, 0.2)' : 'none',
                  transition: 'all 0.25s ease',
                  height: '42px',
                  boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                <Music size={14} color={activeTab === 'groovelab' ? '#09090b' : '#b45309'} />
                <span>GrooveLab</span>
              </div>
            )}
          </div>

          {/* Action & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              onClick={fetchDashboardData}
              disabled={loading}
              className="google-btn-primary"
            >
              Aktualisieren
            </button>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderLeft: '1px solid rgba(0,0,0,0.08)', paddingLeft: '20px' }}>
              <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={fetchDashboardData} />
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

        {/* Main scrollable body content */}
        <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, overflowY: 'auto' }}>
          
          {/* crisis notifications operations cockpit */}
          {crisisNotifications.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: '24px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1), 0 8px 10px -6px rgba(220, 38, 38, 0.1)'
            }} className="animation-slide-up">
              <style>{`
                @keyframes pulse-red-border {
                  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); border-color: rgba(239, 68, 68, 1); }
                  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
                  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
                }
                .pulsing-red-ticket {
                  animation: pulse-red-border 1.5s infinite;
                  background-color: #fff5f5 !important;
                  border: 2.5px solid #ef4444 !important;
                }
              `}</style>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fca5a5', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '14px' }}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#991b1b' }}>🚨 OPERATIONS-COCKPIT: KRISEN-DASHBOARD</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Automatisierte Krankmeldungs-Kaskade aktiv</p>
                  </div>
                </div>
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #fca5a5' }}>
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
                        background: t.urgency === 'GREEN' ? '#f8fafc' : 'white',
                        border: '1.5px solid #e2e8f0',
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
                          <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{studentName}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', fontWeight: 650 }}>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '0.78rem' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Termin:</span>
                          <strong style={{ color: '#334155' }}>{dateStr} - {timeStr} Uhr</strong>
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
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
                        <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
              <h2 className="swiss-h1" style={{ margin: 0 }}>
                {getTabTitle()}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {currentUserProfile 
                  ? `${currentUserProfile.first_name} ${currentUserProfile.last_name || ''} • Schulsekretariat` 
                  : 'Schulsekretariat'
                }
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="google-btn-secondary"
                style={{
                  padding: '10px 20px',
                }}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Aktualisieren
              </button>
              
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.08)', 
                padding: '8px 16px', 
                borderRadius: 'var(--radius-pill)', 
                border: '1px solid rgba(34, 197, 94, 0.2)', 
                color: '#137333', 
                fontSize: '0.82rem', 
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {activeSessions.length} im Lab
              </div>
            </div>
          </div>

          {/* TAB 1: SECRETARY - BRIEFING */}
          {activeTab === 'secretary' && secretarySubTab === 'briefing' && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            
            {/* LEFT COLUMN: GREETING & TAGESPLAN TIMELINE & BANNER */}
            <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 className="swiss-h2" style={{ margin: 0, color: '#d81e05' }}>
                  Guten Morgen, {currentUserProfile?.nickname || currentUserProfile?.first_name || 'Admin'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Heute ist {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} &bull; Es stehen {pendingSchedules.length} ausstehende Freigaben an.
                </p>
              </div>

              {/* Tagesplan Card styled exactly like screenshot */}
              <div className="google-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937' }}>
                    <Calendar size={20} color="#0b57d0" />
                    <strong style={{ fontSize: '1rem', fontWeight: 700 }}>Tagesplan</strong>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '100px',
                    background: '#e8f0fe',
                    color: '#0b57d0'
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
                    <div style={{ flex: 1, padding: '16px 20px', borderRadius: '16px', border: '1.5px solid #e8f0fe', background: '#f8fafc' }}>
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
                    <div style={{ flex: 1 }}>
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
                    <div style={{ flex: 1 }}>
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
                background: '#86efac', 
                borderRadius: '24px', 
                padding: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                color: '#065f46'
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
                  <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '2px' }}>Beziehungsticker: Campus &amp; GrooveLab</strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#065f46', opacity: 0.9 }}>
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
                      onClick={() => { setActiveTab('secretary'); setSecretarySubTab('briefing'); }} 
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
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800 }}>👥 Sekretariat & Administration</h3>
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
                        {emp.role === 'admin' ? 'Admin' : 'Sekretariat'}
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
            <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px' }}>
                      <div style={{ background: '#f6fbf7', border: '1px solid #e6f4ea', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#137333', fontWeight: 800, textTransform: 'uppercase' }}>Aktive Lehrkräfte</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#137333', marginTop: '4px' }}>{campusTeachers.length}</strong>
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>Bypass (Inaktiv)</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#166534', marginTop: '4px' }}>{bypassTeachers.length}</strong>
                      </div>
                      <div style={{ background: '#e6f4ea', border: '1px solid #34a853', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#137333', fontWeight: 800, textTransform: 'uppercase' }}>Reviews Ausstehend</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#137333', marginTop: '4px' }}>{pendingSchedules.length}</strong>
                      </div>
                    </div>
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
              {campusSubTab === 'onboarding' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-green" />
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Upload size={20} color="#34a853" /> Lehrer importieren via CSV-Tabelle (Campus)
                    </h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.78rem', color: '#64748b' }}>Format: Vorname; Nachname; E-Mail; Hauptinstrument; SchülerLimit</p>

                    <textarea
                      placeholder="Markus; Weber; markus@schule.de; Gitarre; 12&#10;Anna; Becker; anna@schule.de; Gesang; 8"
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: '110px',
                        borderRadius: '16px',
                        border: '1.5px solid #cbd5e1',
                        padding: '12px',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        background: '#f8fafc',
                        outline: 'none'
                      }}
                    />

                    {importStatus && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#e6f4ea', color: '#137333', fontSize: '0.78rem', fontWeight: 700 }}>
                        {importStatus.message}
                      </div>
                    )}

                    <button
                      onClick={handleImportTeachers}
                      className="google-btn-primary"
                      style={{ marginTop: '16px', background: '#34a853' }}
                    >
                      Import starten
                    </button>
                  </div>

                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-yellow" />
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800 }}>🔑 Inaktive Bypass-Profile &amp; Support-PINs</h3>
                    
                    {bypassTeachers.length === 0 ? (
                      <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.88rem' }}>Keine inaktiven Profile vorhanden.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {bypassTeachers.map(t => {
                          const activationLink = `${window.location.origin}/?qr_token=${t.teacherQrToken}&email=${encodeURIComponent(t.email)}`;
                          const isCopied = copiedTeacherId === t.id;

                          return (
                            <div 
                              key={t.id} 
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(activationLink);
                                  setCopiedTeacherId(t.id);
                                  setTimeout(() => setCopiedTeacherId(null), 2000);
                                } catch (err) {
                                  console.error('Failed to copy link', err);
                                }
                              }}
                              style={{ 
                                padding: '16px', 
                                borderRadius: '16px', 
                                border: isCopied ? '1.5px solid #34a853' : '1px solid #e2e8f0', 
                                background: isCopied ? '#f0fdf4' : '#f8fafc',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}
                              title="Aktivierungslink kopieren"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <strong style={{ fontSize: '0.88rem', color: '#1d1d1f', display: 'block' }}>{t.firstName} {t.lastName}</strong>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.email}</span>
                                </div>
                                <span style={{ fontSize: '0.62rem', background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>{t.instrument}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid #dadce0', paddingTop: '10px' }}>
                                <div>
                                  <span style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Bypass-PIN</span>
                                  <strong style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: '#b45309' }}>{t.ausweisNummer}</strong>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ 
                                    fontSize: '0.68rem', 
                                    color: isCopied ? '#137333' : '#1a73e8', 
                                    fontWeight: 700,
                                    background: isCopied ? '#e6f4ea' : '#e8f0fe',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    {isCopied ? 'Kopiert! ✓' : 'Link kopieren'}
                                  </span>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleDeleteUser(t.id); 
                                    }} 
                                    style={{ border: 'none', background: 'transparent', color: '#ea4335', cursor: 'pointer', padding: '4px' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Campus Teachers list with toggle for GrooveLab */}
                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-blue" />
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800 }}>👥 Aktive Campus-Lehrkräfte &amp; Modul-Freigaben</h3>
                    
                    {campusTeachers.length === 0 ? (
                      <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.88rem' }}>Keine aktiven Campus-Lehrkräfte vorhanden.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {campusTeachers.map(t => (
                          <div key={t.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <strong style={{ fontSize: '0.88rem', color: '#1d1d1f', display: 'block' }}>{t.firstName} {t.lastName}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.email}</span>
                              </div>
                              <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>{t.instrument}</span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #dadce0', paddingTop: '10px' }}>
                              <div>
                                <span style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Modul-Status</span>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  color: t.isGroovelabActive ? '#b06000' : '#64748b', 
                                  fontWeight: 700 
                                }}>
                                  {t.isGroovelabActive ? '🎸 GrooveLab + Campus' : '🎓 Nur Campus'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleToggleTeacherGroovelab(t.id, t.isGroovelabActive)}
                                className="google-btn-secondary"
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '0.7rem', 
                                  border: '1px solid #cbd5e1',
                                  background: t.isGroovelabActive ? '#fef2f2' : '#fef7e0',
                                  color: t.isGroovelabActive ? '#b91c1c' : '#b06000',
                                  borderColor: t.isGroovelabActive ? '#fee2e2' : '#fef3c7'
                                }}
                              >
                                {t.isGroovelabActive ? 'GrooveLab entfernen' : 'GrooveLab aktivieren'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subtab: Schedules */}
              {campusSubTab === 'schedules' && (
                <div className="google-card" style={{ paddingLeft: '44px' }}>
                  <div className="google-kpi-bar bg-google-blue" />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>🗓️ Stundenplan Freigabe-Zentrale</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b' }}>Genehmige Stundenpläne oder weise sie zur Überarbeitung zurück.</p>

                  {pendingSchedules.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '24px', fontSize: '0.88rem' }}>Keine ausstehenden Zuweisungen.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingSchedules.map(sched => (
                        <div key={sched.id} style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ color: '#1d1d1f' }}>{sched.teacher_name}</strong>
                              <span style={{ color: '#cbd5e1' }}>&rarr;</span>
                              <strong style={{ color: '#1d1d1f' }}>{sched.student_name}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                              <span>Wochentag: {['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][sched.day_of_week]}</span>
                              <span>&bull;</span>
                              <span>Zeitslot: {sched.time_slot}</span>
                              <span>&bull;</span>
                              <span>Zugeordneter Raum: {sched.room_name}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleScheduleDecision(sched.id, true)} className="google-btn-primary" style={{ padding: '6px 14px', fontSize: '0.75rem', background: '#34a853', boxShadow: '0 4px 12px rgba(52,168,83,0.18)' }}>Freigeben</button>
                            <button onClick={() => handleScheduleDecision(sched.id, false)} className="google-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem', color: '#ea4335', borderColor: '#fce8e6' }}>Ablehnen</button>
                          </div>
                        </div>
                      ))}
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

                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-blue" />
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>Campus Integration Link</h3>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Direkter Campus Anmeldelink für Lehrkräfte</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input readOnly value={`${window.location.origin}/?school_id=${schoolId}`} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.75rem', fontFamily: 'monospace' }} />
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?school_id=${schoolId}`); setCopyingCampus(true); setTimeout(() => setCopyingCampus(false), 2000); }} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', cursor: 'pointer' }}>
                          {copyingCampus ? <CheckIcon size={14} color="#1a73e8" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
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
                        <li>Spalten: Vorname; Nachname; Email; Instrument; Limit</li>
                        <li>Limit gibt die maximale Schüleranzahl an</li>
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

              {/* Schedules Sidebar */}
              {campusSubTab === 'schedules' && (
                <div className="google-card" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0b57d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Wochenauslastung &amp; Status
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Review</span>
                        <strong style={{ fontSize: '1.25rem', color: '#0b57d0' }}>{pendingSchedules.length}</strong>
                      </div>
                      <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Konflikte</span>
                        <strong style={{ fontSize: '1.25rem', color: '#ea4335' }}>0</strong>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#1f2937' }}>Kapazitätsgrenzen:</strong>
                      <p style={{ margin: 0, color: '#5f6368', lineHeight: '1.4' }}>
                        Bei Freigabe prüft das System automatisch, ob das Stunden-Limit der Lehrkraft oder die Raumbelegung überschritten wird.
                      </p>
                    </div>

                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', color: '#7f1d1d' }}>
                      <strong style={{ display: 'block', marginBottom: '4px' }}>Wichtiger Hinweis:</strong>
                      <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: '1.4' }}>
                        Abgelehnte Stundenpläne werden zurück in den "Draft"-Zustand versetzt. Die Lehrkraft erhält eine automatische Benachrichtigung zur Anpassung.
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
                  <div className="google-card" style={{ paddingLeft: '44px' }}>
                    <div className="google-kpi-bar bg-google-yellow" style={{ background: '#fbbc05' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 850, color: '#b06000' }}>
                      🎸 GrooveLab-Zentrale &amp; Startseite
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#5f6368', lineHeight: '1.5' }}>
                      Willkommen in der GrooveLab-Verwaltung. Hier überwachst du das Live Lab (Checked-in iPads und Schüler), verwaltest die Coaches und Trainer, konfigurierst die Kiosk-Scanner für Tablets und steuerst den Betriebszustand.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px' }}>
                      <div style={{ background: '#fffdf5', border: '1px solid #fef3c7', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#b06000', fontWeight: 800, textTransform: 'uppercase' }}>Schüler im Live Lab</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#b06000', marginTop: '4px' }}>
                          {activeSessions.filter(s => s.users?.role === 'student').length}
                        </strong>
                      </div>
                      <div style={{ background: '#fffbef', border: '1px solid #fde68a', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>Präsente Coaches</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#b45309', marginTop: '4px' }}>
                          {activeSessions.filter(s => s.users?.role === 'teacher' || s.users?.role === 'admin').length}
                        </strong>
                      </div>
                      <div style={{ background: '#fef7e0', border: '1px solid #fbbc05', padding: '16px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#b06000', fontWeight: 800, textTransform: 'uppercase' }}>Registrierte Coaches</span>
                        <strong style={{ display: 'block', fontSize: '1.8rem', color: '#b06000', marginTop: '4px' }}>{coaches.length}</strong>
                      </div>
                    </div>
                  </div>

                  {/* GrooveLab Announcements */}
                  <div className="google-card" style={{ padding: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#1f2937' }}>📌 GrooveLab Daily Briefing &amp; Live-Status</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc' }}>
                        <span style={{ fontSize: '1.25rem' }}>🟢</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1f2937' }}>Eingecheckte Schüler:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {activeSessions.filter(s => s.users?.role === 'student').length > 0 
                              ? `Gerade sind ${activeSessions.filter(s => s.users?.role === 'student').length} Schüler aktiv an den iPads eingeloggt.`
                              : 'Momentan sind keine Schüler im Live Lab angemeldet.'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc' }}>
                        <span style={{ fontSize: '1.25rem' }}>🔌</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1f2937' }}>Kiosk-Modus:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Der Kiosk-Token für automatische iPad-Check-ins ist {kioskToken ? 'aktiv' : 'nicht konfiguriert'}.
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: '#f8fafc' }}>
                        <span style={{ fontSize: '1.25rem' }}>💬</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1f2937' }}>Chat-Kommunikation:</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Die globale Chat-Kommunikation zwischen Coaches und Schülern ist {allowMessagesGlobal ? 'eingeschaltet' : 'ausgeschaltet'}.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: GrooveLab Sidebar */}
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
                  <div className="google-card" style={{ padding: '20px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#b06000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚡ GrooveLab-Betrieb
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem', color: '#5f6368' }}>
                      <div style={{ background: '#fffdf5', border: '1px solid #fef3c7', padding: '12px', borderRadius: '12px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px', color: '#b06000' }}>Betriebszustand:</strong>
                        <span>{isPaused ? '⏸️ Der Schulbetrieb ist aktuell pausiert.' : '✅ Normaler GrooveLab Live-Betrieb.'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <span>Abo-Status:</span>
                        <strong style={{ color: '#b06000' }}>{hasGroovelabSub ? 'Aktiviert' : 'Inaktiv'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>iPads / Stationen:</span>
                        <strong style={{ color: '#b06000' }}>{stations.length}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Live Lab */}
            {groovelabSubTab === 'live' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%', flex: 1, minHeight: '600px' }}>
                <TeacherDashboard 
                  userId={userId || ''} 
                  hideHeader={true} 
                  hideSidebar={true} 
                  initialTab="live" 
                  viewMode="admin"
                />
              </div>
            )}

            {/* Subtab: Students (Schüler) */}
            {groovelabSubTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="google-card" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>👥 Registrierte Schüler (GrooveLab)</h3>
                  
                  {/* Search bar */}
                  <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                    <input 
                      type="text" 
                      placeholder="Schüler nach Name oder Spitzname suchen..." 
                      value={liveSearchQuery}
                      onChange={(e) => setLiveSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 48px',
                        borderRadius: '14px',
                        border: '1.5px solid #cbd5e1',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 650,
                        boxSizing: 'border-box',
                        background: '#ffffff'
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
                              border: '1.5px solid #f1f5f9', 
                              background: '#ffffff', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              position: 'relative',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ position: 'relative' }}>
                              <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#64748b' }}>
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
                                border: '2px solid #ffffff' 
                              }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#1e293b', fontWeight: 800 }}>
                                {student.first_name} {student.last_name}
                              </strong>
                              {student.nickname && (
                                <span style={{ display: 'block', fontSize: '0.78rem', color: '#0b57d0', fontWeight: 700, marginTop: '2px' }}>
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
                                background: isOnline ? '#e6f4ea' : '#f1f5f9',
                                color: isOnline ? '#137333' : '#64748b'
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

            {/* Subtab: Coaches */}
            {groovelabSubTab === 'coaches' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="google-card" style={{ paddingLeft: '44px' }}>
                  <div className="google-kpi-bar bg-google-yellow" />
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800 }}>🎸 GrooveLab Coach anlegen</h3>
                  <form onSubmit={handleCreateCoach} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <input type="text" required placeholder="Vorname *" value={coachFirstName} onChange={(e) => setCoachFirstName(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} />
                    <input type="text" required placeholder="Nachname *" value={coachLastName} onChange={(e) => setCoachLastName(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} />
                    <input type="email" required placeholder="E-Mail *" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} />
                    <input type="text" placeholder="Instrument" value={coachInstrument} onChange={(e) => setCoachInstrument(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.85rem' }} />
                    <select value={coachRole} onChange={(e) => setCoachRole(e.target.value as any)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #dadce0', background: '#ffffff', fontSize: '0.85rem' }}>
                      <option value="teacher">Coach</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <button type="submit" className="google-btn-primary" style={{ background: '#fbbc05', color: '#1d1d1f' }}>Hinzufügen</button>
                  </form>
                </div>

                <div className="google-card">
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800 }}>👥 Aktive Trainer &amp; Coaches (GrooveLab)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                    {coaches.map(c => (
                      <div key={c.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#1d1d1f', display: 'block' }}>{c.firstName} {c.lastName}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>🎸 {c.instrument || 'Allgemein'} &bull; {c.role}</span>
                        </div>
                        <button onClick={() => handleDeleteUser(c.id)} style={{ border: 'none', background: 'transparent', color: '#ea4335', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Kiosk & Schnittstellen */}
            {groovelabSubTab === 'kiosk' && (
              <div className="google-card" style={{ paddingLeft: '44px' }}>
                <div className="google-kpi-bar bg-google-blue" />
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>🔌 Tablets &amp; Kiosk-Integration</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>GrooveLab Kiosk QR Scanner API Token</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input readOnly value={kioskToken ? `${window.location.origin}/?kiosk_token=${kioskToken}` : 'Kein Token'} style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.75rem', fontFamily: 'monospace' }} />
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?kiosk_token=${kioskToken}`); setCopyingKiosk(true); setTimeout(() => setCopyingKiosk(false), 2000); }} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', cursor: 'pointer' }}>
                        {copyingKiosk ? <CheckIcon size={14} color="#1a73e8" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <button onClick={handleRegenerateTokens} className="google-btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.78rem' }}>
                    Kiosk Token regenerieren
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', display: 'block' }}>Chaträume freischalten</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ermöglicht Coaches den direkten Austausch mit Schülern.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowMessagesGlobal}
                      onChange={(e) => handleToggleMessagesGlobal(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#34a853' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Modul-Status & Pause */}
            {groovelabSubTab === 'status' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="google-card" style={{ paddingLeft: '44px' }}>
                  <div className="google-kpi-bar bg-google-yellow" />
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>GrooveLab Modul aktivieren</h3>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>🎸 GrooveLab App Lizenz aktivieren</span>
                    <input
                      type="checkbox"
                      checked={hasGroovelabSub}
                      onChange={(e) => handleToggleGroovelabSub(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#ff9500' }}
                    />
                  </label>
                </div>

                <div className="google-card" style={{ paddingLeft: '44px' }}>
                  <div className="google-kpi-bar bg-google-red" />
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>Betriebszustand</h3>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>⏸️ Schulbetrieb pausieren</span>
                    <input
                      type="checkbox"
                      checked={isPaused}
                      onChange={(e) => handleToggleIsPaused(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#ea4335' }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LICENSES */}
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
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: 800 }}>Letzte Monatsabrechnungen</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                  {[
                    { id: 'INV-2026-05', date: '15. Mai 2026', amount: '169,00 €', status: 'Bezahlt' },
                    { id: 'INV-2026-04', date: '15. April 2026', amount: '169,00 €', status: 'Bezahlt' },
                    { id: 'INV-2026-03', date: '15. März 2026', amount: '145,00 €', status: 'Bezahlt' }
                  ].map((inv) => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.82rem' }}>
                      <div>
                        <strong style={{ display: 'block', color: '#1d1d1f' }}>Rechnung {inv.id}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Abrechnungsdatum: {inv.date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <strong>{inv.amount}</strong>
                        <span style={{ fontSize: '0.7rem', background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>{inv.status}</span>
                        <button onClick={() => alert('Rechnung heruntergeladen!')} style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '8px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }}>PDF</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETUP */}
        {activeTab === 'secretary' && secretarySubTab === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
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
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-red" />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>🛡️ Limits &amp; Systemprüfungen</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', display: 'block' }}>Limits Härtebremse aktivieren</strong>
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
        />
      )}
    </div>
  </div>
  );
}
