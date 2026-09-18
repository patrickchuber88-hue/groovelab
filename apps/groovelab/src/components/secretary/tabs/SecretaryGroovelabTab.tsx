/**
 * ==============================================================================
 * CAMPUS-GROOVELAB SECRETARY GROOVELAB TAB
 * Monolith Goldstandard: Clean component isolation (< 3.000 LOC per tab)
 * Bounded Context: GrooveLab Integration & Stations (Module Color: Yellow #facc15)
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Music, AlertCircle, Users, Settings, ShieldCheck, Clock, Radio, Sparkles,
  Disc3, Smile, LayoutGrid, Mic, Sliders, Activity, Award, RotateCw,
  Shield, Info, Check, X, Plus, Search, ZoomIn, ZoomOut, Smartphone,
  QrCode, RefreshCw, CheckCircle, CheckCircle2, Edit2, Edit3, Trash2,
  UserPlus, Cpu, Database, Wrench, Palette, TrendingDown, Download,
  Printer, DoorOpen, GraduationCap, Lightbulb
} from 'lucide-react';
import { AvatarImage } from '../../common/AvatarImage';
import { AppleStyleTokenField } from '../../common/AppleStyleTokenField';
import { CampusGroovelabLogo } from '../../CampusGroovelabBrand';
import { maskLastName } from '../../../utils/nameHelper';
import { getAlphabeticalHue } from '../../../utils/adminColorHelpers';

const getAlphabeticalColor = (name: string) => {
  const trimmed = (name || '').trim();
  if (trimmed.toLowerCase() === 'ohne zuweisung') {
    return {
      avatarBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      avatarColor: '#475569'
    };
  }
  const hue = getAlphabeticalHue(trimmed);
  const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};
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
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#34a853'; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return '#64748b';
  const num = parseInt(matches[matches.length - 1]);
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

const StationNode = React.memo(({ num, color, inst, sess, isMe, viewMode, onProfileSelect, onLogout, hasHelpRequest, customName, activePlatform }: { 
  num: number, color: string, inst: string, sess: any, isMe: boolean, viewMode: string, onProfileSelect: (u: any) => void, onLogout: (id: string) => void, hasHelpRequest?: boolean, customName?: string, activePlatform?: string
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
              <AvatarImage src={sess.users?.photo_url} user={sess.users} activePlatform={activePlatform} />
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

const getUniqueCoaches = (list: any[]) => {
  const filtered = (list || []).filter(Boolean);
  const sorted = [...filtered].sort((a, b) => {
    const aUser = a.users || a;
    const bUser = b.users || b;
    const aHasRole = aUser?.role === 'teacher' || aUser?.role === 'student';
    const bHasRole = bUser?.role === 'teacher' || bUser?.role === 'student';
    if (aHasRole && !bHasRole) return -1;
    if (!aHasRole && bHasRole) return 1;
    return 0;
  });

  const seenNames = new Set();
  const result = [];
  for (const item of sorted) {
    const userObj = item.users || item;
    if (userObj) {
      const fullName = `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim().toLowerCase();
      if (!seenNames.has(fullName)) {
        seenNames.add(fullName);
        result.push(item);
      }
    }
  }
  return result;
};

const CoachesNode = React.memo(({ coaches, onProfileSelect, activePlatform }: { coaches: any[], onProfileSelect: (u: any) => void, activePlatform?: string }) => {
  const uniqueList = getUniqueCoaches(coaches);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34a853', boxShadow: '0 0 12px #34a853' }}></span>
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
        {uniqueList.map((c, idx) => {
          const total = uniqueList.length;
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
                <AvatarImage src={c.users?.photo_url || c.photo_url} user={{ ...(c.users || c), isTeacherContext: true, isTeacher: true }} activePlatform={activePlatform} />
              </div>
              <div style={{ background: 'white', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', minWidth: '90px' }}>
                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.8rem' }}>{c.users?.first_name || c.first_name} {activePlatform === 'groovelab' ? (c.users?.last_name || c.last_name || '') : `${c.users?.last_name?.[0] || c.last_name?.[0] || ''}.`}</div>
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


export interface SecretaryGroovelabTabProps {
  groovelabSubTab: 'live' | 'students' | 'coaches' | 'kiosk' | 'settings';
  activePlatform?: string;
  schoolId: string;
  userId?: string;
  showRealNames?: boolean;
  windowWidth: number;
  windowHeight: number;
  containerWidth: number;
  containerRef: (node: HTMLDivElement | null) => void;
  zoomFactor: number;
  handleZoomChange: (delta: number) => void;

  // Rooms & Stations (Live Blueprint)
  rooms: any[];
  stations: any[];
  selectedRoomId: string;
  setSelectedRoomId: (id: string) => void;
  activeSessions: any[];
  helpRequests: any[];
  holidayXpActive: boolean;
  handleToggleHolidayXp: (checked: boolean) => Promise<void> | void;
  handleLogoutStudent: (stationId: string) => void;

  // Students & Bands
  students: any[];
  bands: any[];
  teachersManageStudents: boolean;
  setTeachersManageStudents: React.Dispatch<React.SetStateAction<boolean>>;
  groovelabStudentSearchQuery: string;
  setGroovelabStudentSearchQuery: (query: string) => void;
  groovelabStudentFilterInstrument: string;
  setGroovelabStudentFilterInstrument: (inst: string) => void;
  handleToggleStudentModule: (student: any, module: 'campus' | 'groovelab') => Promise<void> | void;
  setSelectedStudentForDetail: (student: any) => void;
  setShowAddStudentModal: (show: boolean) => void;
  setNewStudentIsGroovelabActive: (active: boolean) => void;
  showAddGroovelabStudentModal: boolean;
  setShowAddGroovelabStudentModal: (show: boolean) => void;
  groovelabStudentModalSearchQuery: string;
  setGroovelabStudentModalSearchQuery: (query: string) => void;
  showManualCreateGroovelabStudent: boolean;
  setShowManualCreateGroovelabStudent: (show: boolean) => void;
  newStudentFirstName: string;
  setNewStudentFirstName: (name: string) => void;
  newStudentLastName: string;
  setNewStudentLastName: (name: string) => void;
  handleCreateStudentGroovelab: (e: React.FormEvent) => void;

  // Coaches (Teachers)
  coaches: any[];
  campusTeachers: any[];
  allTeachers: any[];
  bypassTeachers: any[];
  teachersManageTeachers: boolean;
  setTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;
  coachSearchQuery: string;
  setCoachSearchQuery: (query: string) => void;
  coachFilterInstrument: string;
  setCoachFilterInstrument: (inst: string) => void;
  handleToggleTeacherModule: (teacher: any, module: 'campus' | 'groovelab') => Promise<void> | void;
  setManageTeacher: (teacher: any) => void;
  setSelectedCoachProfile: (coach: any) => void;
  showAddCoachModal: boolean;
  setShowAddCoachModal: (show: boolean) => void;
  coachModalSearchQuery: string;
  setCoachModalSearchQuery: (query: string) => void;
  showManualCreateCoach: boolean;
  setShowManualCreateCoach: (show: boolean) => void;
  setShowAddTeacherModal: (show: boolean) => void;
  newTeacherFirstName: string;
  setNewTeacherFirstName: (name: string) => void;
  newTeacherLastName: string;
  setNewTeacherLastName: (name: string) => void;
  newTeacherEmail: string;
  setNewTeacherEmail: (email: string) => void;
  newTeacherInstrument: string;
  setNewTeacherInstrument: (inst: string) => void;
  newTeacherContractEndsAt: string;
  setNewTeacherContractEndsAt: (date: string) => void;
  handleCreateCoachForGroovelab: (e: React.FormEvent) => void;
  activeSubjectsList: string[];

  // Settings & Toggles
  activeGroovelabSettingsModal: string | null;
  setActiveGroovelabSettingsModal: React.Dispatch<React.SetStateAction<any>> | ((modal: any) => void);
  glMaxBandMembers: number;
  setGlMaxBandMembers: React.Dispatch<React.SetStateAction<number>>;
  glAllowStudentBandCreation: boolean;
  setGlAllowStudentBandCreation: React.Dispatch<React.SetStateAction<boolean>>;
  glSongLevelStarterEnabled: boolean;
  setGlSongLevelStarterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSongLevelProEnabled: boolean;
  setGlSongLevelProEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSongLevelMasterEnabled: boolean;
  setGlSongLevelMasterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSongProposalWorkflow: boolean;
  setGlSongProposalWorkflow: React.Dispatch<React.SetStateAction<boolean>>;
  glLiveDefaultBpm: number;
  setGlLiveDefaultBpm: React.Dispatch<React.SetStateAction<number>>;
  glLiveCountInBars: number;
  setGlLiveCountInBars: React.Dispatch<React.SetStateAction<number>>;
  glLiveStageDisplayEnabled: boolean;
  setGlLiveStageDisplayEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarTiming: boolean;
  setGlSkillRadarTiming: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarTechnique: boolean;
  setGlSkillRadarTechnique: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarSound: boolean;
  setGlSkillRadarSound: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarRepertoire: boolean;
  setGlSkillRadarRepertoire: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarTeamplay: boolean;
  setGlSkillRadarTeamplay: React.Dispatch<React.SetStateAction<boolean>>;
  glMusicianAvatarsEnabled: boolean;
  setGlMusicianAvatarsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glBandCoatOfArmsEnabled: boolean;
  setGlBandCoatOfArmsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glBandChatEnabled: boolean;
  setGlBandChatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glJamRecordingCompression: boolean;
  setGlJamRecordingCompression: React.Dispatch<React.SetStateAction<boolean>>;
  allowMessagesGlobal: boolean;
  handleToggleMessagesGlobal: (checked: boolean) => Promise<void> | void;
  handleSaveSettingValue: (key: string, val: any, setter?: any) => Promise<void>;
  handleToggleSetting: (key: string, currentVal: boolean, setter: (v: boolean) => void) => Promise<void>;
  handleRegenerateTokens: () => void;
  setIsFeedbackModalOpen: (open: boolean) => void;
}

export const SecretaryGroovelabTab: React.FC<SecretaryGroovelabTabProps> = ({
  groovelabSubTab,
  activePlatform,
  schoolId,
  userId,
  showRealNames = true,
  windowWidth,
  windowHeight,
  containerWidth,
  containerRef,
  zoomFactor,
  handleZoomChange,
  rooms,
  stations,
  selectedRoomId,
  setSelectedRoomId,
  activeSessions,
  helpRequests,
  holidayXpActive,
  handleToggleHolidayXp,
  handleLogoutStudent,
  students,
  bands,
  teachersManageStudents,
  setTeachersManageStudents,
  groovelabStudentSearchQuery,
  setGroovelabStudentSearchQuery,
  groovelabStudentFilterInstrument,
  setGroovelabStudentFilterInstrument,
  handleToggleStudentModule,
  setSelectedStudentForDetail,
  setShowAddStudentModal,
  setNewStudentIsGroovelabActive,
  showAddGroovelabStudentModal,
  setShowAddGroovelabStudentModal,
  groovelabStudentModalSearchQuery,
  setGroovelabStudentModalSearchQuery,
  showManualCreateGroovelabStudent,
  setShowManualCreateGroovelabStudent,
  newStudentFirstName,
  setNewStudentFirstName,
  newStudentLastName,
  setNewStudentLastName,
  handleCreateStudentGroovelab,
  coaches,
  campusTeachers,
  allTeachers,
  bypassTeachers,
  teachersManageTeachers,
  setTeachersManageTeachers,
  coachSearchQuery,
  setCoachSearchQuery,
  coachFilterInstrument,
  setCoachFilterInstrument,
  handleToggleTeacherModule,
  setManageTeacher,
  setSelectedCoachProfile,
  showAddCoachModal,
  setShowAddCoachModal,
  coachModalSearchQuery,
  setCoachModalSearchQuery,
  showManualCreateCoach,
  setShowManualCreateCoach,
  setShowAddTeacherModal,
  newTeacherFirstName,
  setNewTeacherFirstName,
  newTeacherLastName,
  setNewTeacherLastName,
  newTeacherEmail,
  setNewTeacherEmail,
  newTeacherInstrument,
  setNewTeacherInstrument,
  newTeacherContractEndsAt,
  setNewTeacherContractEndsAt,
  handleCreateCoachForGroovelab,
  activeSubjectsList,
  activeGroovelabSettingsModal,
  setActiveGroovelabSettingsModal,
  glMaxBandMembers,
  setGlMaxBandMembers,
  glAllowStudentBandCreation,
  setGlAllowStudentBandCreation,
  glSongLevelStarterEnabled,
  setGlSongLevelStarterEnabled,
  glSongLevelProEnabled,
  setGlSongLevelProEnabled,
  glSongLevelMasterEnabled,
  setGlSongLevelMasterEnabled,
  glSongProposalWorkflow,
  setGlSongProposalWorkflow,
  glLiveDefaultBpm,
  setGlLiveDefaultBpm,
  glLiveCountInBars,
  setGlLiveCountInBars,
  glLiveStageDisplayEnabled,
  setGlLiveStageDisplayEnabled,
  glSkillRadarTiming,
  setGlSkillRadarTiming,
  glSkillRadarTechnique,
  setGlSkillRadarTechnique,
  glSkillRadarSound,
  setGlSkillRadarSound,
  glSkillRadarRepertoire,
  setGlSkillRadarRepertoire,
  glSkillRadarTeamplay,
  setGlSkillRadarTeamplay,
  glMusicianAvatarsEnabled,
  setGlMusicianAvatarsEnabled,
  glBandCoatOfArmsEnabled,
  setGlBandCoatOfArmsEnabled,
  glBandChatEnabled,
  setGlBandChatEnabled,
  glJamRecordingCompression,
  setGlJamRecordingCompression,
  allowMessagesGlobal,
  handleToggleMessagesGlobal,
  handleSaveSettingValue,
  handleToggleSetting,
  handleRegenerateTokens,
  setIsFeedbackModalOpen,
}) => {
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Subtab: Startseite (Briefing) removed */}

            {/* Subtab: Live Lab Blueprint Board (1:1 replicated from TeacherDashboard) */}
            {groovelabSubTab === 'live' && (() => {
              const isMobileView = windowWidth < 768 || containerWidth < 768 || windowHeight < 500;
              const groovelabRooms = rooms.filter(r => r.is_groovelab_active || r.isGroovelabActive);
              const activeRoom = groovelabRooms.find(r => r.id === selectedRoomId) || groovelabRooms[0];
              const roomStations = stations.filter(s => s.room_id === (activeRoom?.id || selectedRoomId));

              const rawCoaches = activeSessions
                .filter(s => s && s.users && (s.users.role === 'teacher' || s.users.role === 'admin' || s.users.role === 'secretary'))
                .map(s => ({
                  id: s.user_id,
                  users: s.users,
                  session: s
                }));

              const sortedRawCoaches = [...rawCoaches].sort((a, b) => {
                const aHasRole = a.users?.role === 'teacher' || a.users?.role === 'student';
                const bHasRole = b.users?.role === 'teacher' || b.users?.role === 'student';
                if (aHasRole && !bHasRole) return -1;
                if (!aHasRole && bHasRole) return 1;
                return 0;
              });

              const seenNames = new Set();
              const activeCoachesForLayout: any[] = [];
              for (const c of sortedRawCoaches) {
                if (c && c.users) {
                  const fullName = `${c.users.first_name || ''} ${c.users.last_name || ''}`.trim().toLowerCase();
                  if (!seenNames.has(fullName)) {
                    seenNames.add(fullName);
                    activeCoachesForLayout.push(c);
                  }
                }
              }

              if (isMobileView) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
                    {/* Mobile Room Switcher Row */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <CampusGroovelabLogo size={20} fontSize="1.25rem" /> Board
                        </h2>
                      </div>
                      {groovelabRooms.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                          {groovelabRooms.map((room, idx) => {
                            const isSelected = room.id === (activeRoom?.id || selectedRoomId);
                            return (
                              <button
                                key={room.id}
                                onClick={() => {
                                  setSelectedRoomId(room.id);
                                  localStorage.setItem('groovelab_teacher_selected_room_id', room.id);
                                }}
                                style={{
                                  border: 'none',
                                  background: isSelected ? '#eab308' : '#f1f5f9',
                                  color: isSelected ? '#0f172a' : '#64748b',
                                  padding: '8px 14px',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.2s',
                                  boxShadow: isSelected ? '0 4px 10px rgba(234,179,8,0.2)' : 'none'
                                }}
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
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      {/* Coaches section */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: '1.5px dashed rgba(52, 168, 83, 0.25)',
                        borderRadius: '24px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853' }}></span>
                          Coaches vor Ort
                        </div>
                        {activeCoachesForLayout.filter(Boolean).length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, fontStyle: 'italic', paddingLeft: '4px' }}>
                            Keine Coaches vor Ort eingeloggt
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {activeCoachesForLayout.filter(Boolean).map((c, idx) => {
                              const coachName = c.users ? `${c.users.first_name} ${maskLastName(c.users.last_name, showRealNames)}` : 'Coach';
                              return (
                                <div
                                  key={c.id || idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'white',
                                    padding: '6px 12px 6px 8px',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                                  }}
                                  onClick={() => c.users && setSelectedCoachProfile(c.users)}
                                >
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                    <AvatarImage src={c.users?.photo_url} user={{ ...c.users, isTeacherContext: true, isTeacher: true }} activePlatform={activePlatform} />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem', lineHeight: 1.1 }}>{coachName}</span>
                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>{c.session?.stations?.name || 'Lehrer iPad'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Stations section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {roomStations.filter(s => {
                          const sName = s.name || '';
                          return !(sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher'));
                        }).map(station => {
                          const sess = activeSessions.find(se => se.station_id === station.id);
                          const isActive = !!sess;
                          const sName = station.name || '';
                          const instColor = getStationColor(sName, station.color);
                          const activeMins = sess?.check_in_time ? Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000) : 0;
                          const hasHelp = helpRequests.some(r => r.station_id === station.id);
                          const studentName = sess?.users ? `${sess.users.first_name} ${maskLastName(sess.users.last_name, showRealNames)}` : '';

                          return (
                            <div
                              key={station.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'white',
                                borderRadius: '20px',
                                border: isActive ? `2px solid ${instColor}` : `1px solid ${instColor}40`,
                                padding: '12px 16px',
                                position: 'relative',
                                gap: '12px',
                                boxShadow: isActive ? `0 6px 16px ${instColor}08` : 'none',
                                cursor: isActive ? 'pointer' : 'default',
                                minWidth: 0
                              }}
                              onClick={() => {
                                if (isActive && sess.users) {
                                  setSelectedStudentForDetail(sess.users);
                                }
                              }}
                            >
                              {/* Color Left Accent Line */}
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '6px',
                                borderTopLeftRadius: '20px',
                                borderBottomLeftRadius: '20px',
                                background: instColor
                              }} />

                              {/* Station Instrument Icon & Name info */}
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, paddingLeft: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  <Music size={12} style={{ color: instColor }} />
                                  <span>{station.instrument || 'Tablet'}</span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span>{sName}</span>
                                </div>
                                
                                {isActive ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', minWidth: 0 }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${instColor}`, flexShrink: 0 }}>
                                      <AvatarImage src={sess.users?.photo_url} user={sess.users} activePlatform={activePlatform} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {studentName}
                                      </span>
                                      <span style={{ fontSize: '0.7rem', color: instColor, fontWeight: 700 }}>
                                        Aktiv seit {activeMins}m
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.05em' }}>
                                      BEREIT
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Help Request badge */}
                              {hasHelp && (
                                <div style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.6rem',
                                  fontWeight: 900,
                                  animation: 'pulse-red 1s infinite',
                                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  marginRight: '4px'
                                }}>
                                  <AlertCircle size={10} fill="white" /> HILFE
                                </div>
                              )}

                              {/* Checkout Button */}
                              {isActive && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLogoutStudent(sess.id);
                                  }}
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: 0,
                                    flexShrink: 0
                                  }}
                                  title="Auschecken"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              const hasCustomLayout = activeRoom && 
                activeRoom.room_width && 
                activeRoom.room_height && 
                roomStations.some(s => s.pos_x !== null && s.pos_y !== null);

              // activeCoachesForLayout already declared above

              const renderLiveHeader = () => (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Music size={20} style={{ color: '#eab308' }} /> Live Lab Board
                    </h3>
                    {groovelabRooms.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px' }}>
                        {groovelabRooms.map((room, idx) => {
                          const isSelected = room.id === (activeRoom?.id || selectedRoomId);
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
                const customLayoutScales = groovelabRooms.map(r => {
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
                                    <CoachesNode coaches={activeCoachesForLayout} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} />
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
                                    activePlatform={activePlatform}
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
                      <CoachesNode coaches={activeCoachesForLayout} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} />
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
                            activePlatform={activePlatform}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Subtab: Students (Schüler) */}
            {groovelabSubTab === 'students' && (() => {
              // Get all school students who have GrooveLab active
              const activeGroovelabStudents = students.filter(s => s.is_groovelab_active || s.isGroovelabActive);

              // Filter active GrooveLab students for the list
              const filteredStudents = activeGroovelabStudents.filter((s: any) => {
                const firstName = (s.first_name || '').toLowerCase();
                const lastName = (s.last_name || '').toLowerCase();
                const nick = (s.nickname || '').toLowerCase();
                const query = groovelabStudentSearchQuery.toLowerCase().trim();
                
                const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || nick.includes(query);
                
                const instrument = (s.instrument || 'Nicht festgelegt').toLowerCase();
                const filterInst = groovelabStudentFilterInstrument.toLowerCase();
                const matchesInstrument = groovelabStudentFilterInstrument === 'All' || instrument === filterInst;
                
                return matchesSearch && matchesInstrument;
              });

              // Intelligent search: find school students who do NOT have GrooveLab active yet
              const nonGroovelabStudents = students.filter(s => 
                !(s.is_groovelab_active || s.isGroovelabActive) &&
                (
                  (s.first_name || '').toLowerCase().includes(groovelabStudentSearchQuery.toLowerCase().trim()) ||
                  (s.last_name || '').toLowerCase().includes(groovelabStudentSearchQuery.toLowerCase().trim()) ||
                  (s.nickname || '').toLowerCase().includes(groovelabStudentSearchQuery.toLowerCase().trim())
                )
              );

              const uniqueInstruments = Array.from(new Set(activeGroovelabStudents.map(s => s.instrument || 'Nicht festgelegt')));

              // We need teachers list for the dropdown select in row
              const allUniqueTeachers = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].reduce((acc: any[], t: any) => {
                if (!acc.some(existing => existing.id === t.id)) {
                  acc.push(t);
                }
                return acc;
              }, []);

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
                        GrooveLab Schüler ({activeGroovelabStudents.length})
                      </h3>
                    </div>
                    
                    <button
                      onClick={() => {
                        setGroovelabStudentModalSearchQuery('');
                        setShowManualCreateGroovelabStudent(false);
                        setShowAddGroovelabStudentModal(true);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        borderRadius: '12px', 
                        padding: '8px 16px', 
                        fontSize: '0.8rem', 
                        fontWeight: 800,
                        background: '#fbbc05',
                        color: '#0f172a',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Urbanist',
                        boxShadow: '0 4px 10px rgba(251,188,5,0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Plus size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Schüler hinzufügen
                    </button>
                  </div>

                  {/* FILTERS ROW WITH INTELLIGENT SEARCH */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
                    <div style={{ position: 'relative', flex: 1.5, minWidth: '240px' }}>
                      <input
                        type="text"
                        value={groovelabStudentSearchQuery}
                        onChange={(e) => setGroovelabStudentSearchQuery(e.target.value)}
                        placeholder="Schüler suchen oder aus Schule hinzufügen..."
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
                      <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />

                      {/* Intelligent Auto-suggest / Add Dropdown */}
                      {groovelabStudentSearchQuery.trim() !== '' && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '16px',
                          boxShadow: '0 12px 30px rgba(15,23,42,0.1)',
                          zIndex: 100,
                          marginTop: '6px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '6px 10px', letterSpacing: '0.04em', fontFamily: 'Urbanist' }}>
                            Intelligente Zuweisung &amp; Suche
                          </div>
                          
                          {/* List matching school students not yet in GrooveLab */}
                          {nonGroovelabStudents.map(s => {
                            const name = `${s.first_name || ''} ${s.last_name || ''}`.trim();
                            return (
                              <div key={s.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.15s'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong style={{ fontSize: '0.8rem', color: '#0f172a', fontFamily: 'Urbanist' }}>{name}</strong>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>{s.instrument || 'Kein Instrument'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleToggleStudentModule(s, 'groovelab');
                                    setGroovelabStudentSearchQuery('');
                                  }}
                                  style={{
                                    background: '#fbbc05',
                                    border: 'none',
                                    color: '#0f172a',
                                    borderRadius: '8px',
                                    padding: '5px 10px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    fontFamily: 'Urbanist',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  + Zu GrooveLab hinzufügen
                                </button>
                              </div>
                            );
                          })}

                          {nonGroovelabStudents.length === 0 && (
                            <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#64748b', fontFamily: 'Inter' }}>
                              Keine passenden Schul-Schüler gefunden.
                            </div>
                          )}

                          {/* Quick Create Option */}
                          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const names = groovelabStudentSearchQuery.split(' ');
                                setNewStudentFirstName(names[0] || '');
                                setNewStudentLastName(names.slice(1).join(' ') || '');
                                setNewStudentIsGroovelabActive(true);
                                setShowAddStudentModal(true);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#b45309',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'Urbanist',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Plus size={14} /> "+ Als neuen Schüler erstellen"
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <select
                      value={groovelabStudentFilterInstrument}
                      onChange={(e) => setGroovelabStudentFilterInstrument(e.target.value)}
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
                      <option value="All">Alle Instrumente</option>
                      {uniqueInstruments.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>

                  {/* DYNAMIC STUDENTS LIST (HORIZONTAL ROWS - ORIENTED TO CAMPUS DESIGN) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', width: '100%' }}>
                    <style>{`
                      .status-toggle-btn.groove-active-yellow {
                        background: #fef3c7;
                        color: #b45309;
                        box-shadow: 0 2px 8px rgba(245,158,11,0.12);
                      }
                      .status-toggle-btn.groove-active-yellow:hover {
                        background: #fde68a !important;
                      }
                    `}</style>
                    {filteredStudents.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Keine GrooveLab Schüler gefunden. Nutze das Suchfeld oben, um Schüler hinzuzufügen.
                      </div>
                    ) : (
                      filteredStudents.map((student: any) => {
                        const isCampus = student.is_campus_active || student.isCampusActive;
                        const isGroove = student.is_groovelab_active || student.isGroovelabActive;
                        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
                        const { avatarBg, avatarColor } = getAlphabeticalColor(studentName);

                        return (
                          <div
                            key={student.id}
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
                            <div 
                              onClick={() => setSelectedStudentForDetail(student)}
                              style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1.6', minWidth: '180px', cursor: 'pointer' }}
                            >
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
                                {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {student.first_name} {maskLastName(student.last_name, showRealNames)}
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
                                {student.instrument || 'Nicht festgelegt'}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div style={{ flex: '1.25', minWidth: '130px', display: 'flex', justifyContent: 'center' }}>
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '10px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontSize: '0.78rem',
                                fontWeight: 700
                              }}>
                                GrooveLab aktiv
                              </span>
                            </div>

                            {/* PIN Activation status */}
                            <div style={{ flex: '0.4', minWidth: '50px', display: 'flex', justifyContent: 'center' }}>
                              {student.is_pin_activated ? (
                                <span title="Aktiviert"><CheckCircle size={18} style={{ color: '#34a853' }} /></span>
                              ) : (
                                <span title="Ausstehend"><Clock size={18} style={{ color: '#fbbc04' }} /></span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ flex: '1.5', minWidth: '150px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudentForDetail(student);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#b45309',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontFamily: 'Urbanist'
                                }}
                              >
                                Pass teilen
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Möchtest du den GrooveLab-Zugang für ${studentName} wirklich beenden?`)) {
                                    await handleToggleStudentModule(student, 'groovelab');
                                  }
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

                  {/* Schüler hinzufügen Modal */}
                  {showAddGroovelabStudentModal && (
                    <div 
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="add-gl-student-title"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setShowAddGroovelabStudentModal(false);
                      }}
                      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    >
                      <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', maxHeight: '85vh', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 id="add-gl-student-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            <Plus style={{ color: '#eab308', marginRight: '6px' }} size={18} /> Schüler hinzufügen
                          </h3>
                          <button 
                            type="button"
                            aria-label="Dialog schließen"
                            onClick={() => setShowAddGroovelabStudentModal(false)}
                            style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                          {!showManualCreateGroovelabStudent ? (
                            <>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  aria-label="Schüler aus der Musikschule suchen"
                                  value={groovelabStudentModalSearchQuery}
                                  onChange={(e) => setGroovelabStudentModalSearchQuery(e.target.value)}
                                  placeholder="Schüler aus der Musikschule suchen..."
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    padding: '10px 16px 10px 38px',
                                    borderRadius: '12px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.85rem',
                                    outline: 'none'
                                  }}
                                />
                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '180px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                {(() => {
                                  // Find school students not in GrooveLab — strictly filtered by this school's ID
                                  const nonActiveStudents = students.filter(s =>
                                    s.school_id === schoolId &&
                                    !(s.is_groovelab_active || s.isGroovelabActive) &&
                                    (
                                      !groovelabStudentModalSearchQuery.trim() ||
                                      (s.first_name || '').toLowerCase().includes(groovelabStudentModalSearchQuery.toLowerCase().trim()) ||
                                      (s.last_name || '').toLowerCase().includes(groovelabStudentModalSearchQuery.toLowerCase().trim()) ||
                                      (s.nickname || '').toLowerCase().includes(groovelabStudentModalSearchQuery.toLowerCase().trim())
                                    )
                                  );

                                  if (nonActiveStudents.length === 0) {
                                    return (
                                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.85rem' }}>
                                        Keine Schüler gefunden, die nicht bereits in GrooveLab sind.
                                      </div>
                                    );
                                  }

                                  return nonActiveStudents.map((s: any) => {
                                    const sName = s.nickname ? `${s.first_name} "${s.nickname}" ${s.last_name}` : `${s.first_name} ${s.last_name}`;
                                    return (
                                      <div 
                                        key={s.id} 
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          padding: '12px 16px', 
                                          borderRadius: '16px', 
                                          background: '#f8fafc', 
                                          border: '1px solid #e2e8f0' 
                                        }}
                                      >
                                        <div>
                                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>
                                            {sName}
                                          </strong>
                                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            {s.instrument || 'Kein Fach'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            await handleToggleStudentModule(s, 'groovelab');
                                            setShowAddGroovelabStudentModal(false);
                                          }}
                                          className="google-btn-primary"
                                          style={{
                                            background: '#fbbc05',
                                            color: '#0f172a',
                                            border: 'none',
                                            borderRadius: '10px',
                                            padding: '6px 12px',
                                            fontSize: '0.78rem',
                                            fontWeight: 800
                                          }}
                                        >
                                          + Hinzufügen
                                        </button>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                  Schüler nicht in der Liste?{' '}
                                  <button
                                    onClick={() => setShowManualCreateGroovelabStudent(true)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#b45309',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    Komplett neu erstellen
                                  </button>
                                </span>
                              </div>
                            </>
                          ) : (
                            <form onSubmit={handleCreateStudentGroovelab}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                    <input
                                      type="text"
                                      required
                                      value={newStudentFirstName}
                                      onChange={(e) => setNewStudentFirstName(e.target.value)}
                                      placeholder="z.B. Amadeus"
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
                                      placeholder="z.B. Mozart"
                                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                    />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowManualCreateGroovelabStudent(false)}
                                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                                  >
                                    Zurück zur Suche
                                  </button>
                                  <button
                                    type="submit"
                                    className="google-btn-primary"
                                    style={{ background: '#fbbc05', color: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 800 }}
                                  >
                                    Schüler erstellen & freischalten
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

            {/* Subtab: Coaches (Lehrer) */}
            {groovelabSubTab === 'coaches' && (() => {
              // Get all school teachers who are in GrooveLab
              const activeCoaches = allTeachers.filter(t => t.isGroovelabActive || t.isGroovelabActive === true);
              
              // Filter active GrooveLab coaches for the list
              const filteredCoaches = activeCoaches.filter((t: any) => {
                const firstName = (t.firstName || '').toLowerCase();
                const lastName = (t.lastName || '').toLowerCase();
                const email = (t.email || '').toLowerCase();
                const query = coachSearchQuery.toLowerCase().trim();
                
                const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || email.includes(query);
                
                const instrument = (t.instrument || 'Nicht festgelegt').toLowerCase();
                const filterInst = coachFilterInstrument.toLowerCase();
                const matchesInstrument = coachFilterInstrument === 'All' || instrument === filterInst;
                
                return matchesSearch && matchesInstrument;
              });

              // Intelligent search: find school teachers who are NOT in GrooveLab yet
              const nonGroovelabTeachers = allTeachers.filter(t => 
                !(t.isGroovelabActive || t.isGroovelabActive === true) &&
                (
                  (t.firstName || '').toLowerCase().includes(coachSearchQuery.toLowerCase().trim()) ||
                  (t.lastName || '').toLowerCase().includes(coachSearchQuery.toLowerCase().trim()) ||
                  (t.email || '').toLowerCase().includes(coachSearchQuery.toLowerCase().trim())
                )
              );

              const uniqueInstruments = Array.from(new Set(activeCoaches.map(t => t.instrument || 'Nicht festgelegt')));

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
                      <GraduationCap size={22} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        GrooveLab Coaches ({activeCoaches.length})
                      </h3>
                    </div>
                    
                    <button
                      onClick={() => {
                        setCoachModalSearchQuery('');
                        setShowManualCreateCoach(false);
                        setShowAddCoachModal(true);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        borderRadius: '12px', 
                        padding: '8px 16px', 
                        fontSize: '0.8rem', 
                        fontWeight: 800,
                        background: '#fbbc05',
                        color: '#0f172a',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Urbanist',
                        boxShadow: '0 4px 10px rgba(251,188,5,0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Plus size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Lehrkraft hinzufügen
                    </button>
                  </div>

                  {/* FILTERS ROW WITH INTELLIGENT SEARCH */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
                    <div style={{ position: 'relative', flex: 1.5, minWidth: '240px' }}>
                      <input
                        type="text"
                        value={coachSearchQuery}
                        onChange={(e) => setCoachSearchQuery(e.target.value)}
                        placeholder="Coach suchen oder aus Schule hinzufügen..."
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
                      <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />

                      {/* Intelligent Auto-suggest / Add Dropdown */}
                      {coachSearchQuery.trim() !== '' && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '16px',
                          boxShadow: '0 12px 30px rgba(15,23,42,0.1)',
                          zIndex: 100,
                          marginTop: '6px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '6px 10px', letterSpacing: '0.04em', fontFamily: 'Urbanist' }}>
                            Intelligente Zuweisung &amp; Suche
                          </div>
                          
                          {/* List matching school teachers not yet in GrooveLab */}
                          {nonGroovelabTeachers.map(t => {
                            const name = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                            return (
                              <div key={t.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.15s'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong style={{ fontSize: '0.8rem', color: '#0f172a', fontFamily: 'Urbanist' }}>{name}</strong>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>{t.email ? `${t.email} • ` : ''}{t.instrument || 'Kein Instrument'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleToggleTeacherModule(t, 'groovelab');
                                    setCoachSearchQuery('');
                                  }}
                                  style={{
                                    background: '#fbbc05',
                                    border: 'none',
                                    color: '#0f172a',
                                    borderRadius: '8px',
                                    padding: '5px 10px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    fontFamily: 'Urbanist',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  + Zu GrooveLab hinzufügen
                                </button>
                              </div>
                            );
                          })}

                          {nonGroovelabTeachers.length === 0 && (
                            <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#64748b', fontFamily: 'Inter' }}>
                              Keine passenden Schul-Lehrkräfte gefunden.
                            </div>
                          )}

                          {/* Quick Create Option */}
                          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const names = coachSearchQuery.split(' ');
                                setNewTeacherFirstName(names[0] || '');
                                setNewTeacherLastName(names.slice(1).join(' ') || '');
                                setShowAddTeacherModal(true);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#b45309',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'Urbanist',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Plus size={14} /> "+ Als neue Lehrkraft erstellen"
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <select
                      value={coachFilterInstrument}
                      onChange={(e) => setCoachFilterInstrument(e.target.value)}
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
                      <option value="All">Alle Instrumente</option>
                      {uniqueInstruments.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>

                  {/* DYNAMIC TEACHER LIST (HORIZONTAL ROWS) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', width: '100%' }}>
                    <style>{`
                      .status-toggle-btn.groove-active-yellow {
                        background: #fef3c7;
                        color: #b45309;
                        box-shadow: 0 2px 8px rgba(245,158,11,0.12);
                      }
                      .status-toggle-btn.groove-active-yellow:hover {
                        background: #fde68a !important;
                      }
                    `}</style>
                    {filteredCoaches.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Keine GrooveLab Coaches gefunden. Nutze das Suchfeld oben, um Lehrer hinzuzufügen.
                      </div>
                    ) : (
                      filteredCoaches.map((t: any) => {
                        const isCampus = t.isCampusActive || t.is_campus_active;
                        const isGroove = t.isGroovelabActive || t.is_groovelab_active;
                        const teacherName = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                        const { avatarBg, avatarColor } = getAlphabeticalColor(teacherName);

                        return (
                          <div
                            key={t.id}
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
                                {(t.firstName?.[0] || 'L')}{(t.lastName?.[0] || 'L')}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {teacherName}
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
                                {t.instrument || 'Nicht festgelegt'}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div style={{ flex: '1.25', minWidth: '130px', display: 'flex', justifyContent: 'center' }}>
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '10px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontSize: '0.78rem',
                                fontWeight: 700
                              }}>
                                GrooveLab Coach
                              </span>
                            </div>

                            {/* PIN Activation status */}
                            <div style={{ flex: '0.4', minWidth: '50px', display: 'flex', justifyContent: 'center' }}>
                              {t.isPinActivated ? (
                                <span title="Aktiviert"><CheckCircle size={18} style={{ color: '#34a853' }} /></span>
                              ) : (
                                <span title="Ausstehend"><Clock size={18} style={{ color: '#fbbc04' }} /></span>
                              )}
                            </div>

                            {/* Coached Bands Count */}
                            {(() => {
                              const coachBandsCount = bands.filter((b: any) => 
                                b.coach_id === t.id && 
                                b.name !== '__SYSTEM_ANNOUNCEMENTS__' && 
                                b.genre !== 'System'
                              ).length;
                              const isZero = coachBandsCount === 0;
                              return (
                                <div style={{ flex: '1', minWidth: '100px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: isZero ? '#94a3b8' : '#3a3a3c' }}>
                                  <Disc3 size={16} style={{ color: isZero ? '#94a3b8' : '#b45309' }} />
                                  <span>{coachBandsCount === 1 ? '1 Band' : `${coachBandsCount} Bands`}</span>
                                </div>
                              );
                            })()}

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
                                  color: '#b45309',
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
                                  handleToggleTeacherModule(t, 'groovelab');
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

                  {/* Lehrkraft hinzufügen Modal */}
                  {showAddCoachModal && (
                    <div 
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="add-coach-modal-title"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setShowAddCoachModal(false);
                      }}
                      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                      <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', maxHeight: '85vh', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 id="add-coach-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            <Plus size={18} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#eab308' }} /> Lehrkraft hinzufügen
                          </h3>
                          <button 
                            type="button"
                            aria-label="Dialog schließen"
                            onClick={() => setShowAddCoachModal(false)}
                            style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                          {!showManualCreateCoach ? (
                            <>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  aria-label="Lehrkraft aus der Schule suchen"
                                  value={coachModalSearchQuery}
                                  onChange={(e) => setCoachModalSearchQuery(e.target.value)}
                                  placeholder="Lehrkraft aus der Schule suchen..."
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    padding: '10px 16px 10px 38px',
                                    borderRadius: '12px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.85rem',
                                    outline: 'none'
                                  }}
                                />
                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '180px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                {(() => {
                                  // Find school teachers not in GrooveLab
                                  const nonActiveCoaches = allTeachers.filter(t => 
                                    !(t.isGroovelabActive || t.is_groovelab_active) &&
                                    (
                                      (t.firstName || '').toLowerCase().includes(coachModalSearchQuery.toLowerCase().trim()) ||
                                      (t.lastName || '').toLowerCase().includes(coachModalSearchQuery.toLowerCase().trim()) ||
                                      (t.nickname || '').toLowerCase().includes(coachModalSearchQuery.toLowerCase().trim())
                                    )
                                  );

                                  if (nonActiveCoaches.length === 0) {
                                    return (
                                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.85rem' }}>
                                        Keine Lehrkräfte gefunden, die nicht bereits in GrooveLab sind.
                                      </div>
                                    );
                                  }

                                  return nonActiveCoaches.map((t: any) => {
                                    return (
                                      <div 
                                        key={t.id} 
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          padding: '12px 16px', 
                                          borderRadius: '16px', 
                                          background: '#f8fafc', 
                                          border: '1px solid #e2e8f0' 
                                        }}
                                      >
                                        <div>
                                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>
                                            {t.firstName} {t.lastName}
                                          </strong>
                                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            {t.instrument || 'Kein Fach'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            await handleToggleTeacherModule(t, 'groovelab');
                                            setShowAddCoachModal(false);
                                          }}
                                          className="google-btn-primary"
                                          style={{
                                            background: '#fbbc05',
                                            color: '#0f172a',
                                            border: 'none',
                                            borderRadius: '10px',
                                            padding: '6px 12px',
                                            fontSize: '0.78rem',
                                            fontWeight: 800
                                          }}
                                        >
                                          + Hinzufügen
                                        </button>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                  Lehrkraft nicht in der Liste?{' '}
                                  <button
                                    onClick={() => setShowManualCreateCoach(true)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#b45309',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    Komplett neu erstellen
                                  </button>
                                </span>
                              </div>
                            </>
                          ) : (
                            <form onSubmit={handleCreateCoachForGroovelab}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                                        setNewTeacherLastName(e.target.value);
                                      }}
                                      placeholder="z.B. Bach"
                                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                    />
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>E-Mail-Adresse</label>
                                  <input
                                    type="email"
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
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Endzeit / Vertragsende</label>
                                  <input
                                    type="date"
                                    value={newTeacherContractEndsAt}
                                    onChange={(e) => setNewTeacherContractEndsAt(e.target.value)}
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowManualCreateCoach(false)}
                                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                                  >
                                    Zurück zur Suche
                                  </button>
                                  <button
                                    type="submit"
                                    className="google-btn-primary"
                                    style={{ background: '#fbbc05', color: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 800 }}
                                  >
                                    Lehrkraft erstellen &amp; freischalten
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}
            {/* Subtab: Support & Inventar (Tickets Inbox) removed */}

            {/* Subtab: Setup & Kiosk */}
            {groovelabSubTab === 'kiosk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="google-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>🔌 Tablets &amp; Kiosk-Integration</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <button onClick={handleRegenerateTokens} className="google-btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.78rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                      Kiosk Token regenerieren
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '10px' }}>
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

            {groovelabSubTab === 'settings' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
                    ⚙️ Einstellungen
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                    Wähle ein Modul aus, um Band-Gründung, Song-Library, Live Lab, Skill-Radar und Musiker-Avatare für deine Schule zu konfigurieren.
                  </p>
                </div>

                {/* MODULAR COVER CARDS GRID (GROOVELAB YELLOW #eab308) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: windowWidth < 640 ? 'repeat(2, 1fr)' : windowWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '18px',
                  width: '100%'
                }}>
                  {[
                    {
                      id: 'bands',
                      title: 'Band-Engine & Besetzung',
                      subtitle: `Max. ${glMaxBandMembers} Musiker • Gründungsworkflow`,
                      badge: `Max. ${glMaxBandMembers} Musiker`,
                      gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                      shadowColor: 'rgba(234, 179, 8, 0.40)',
                      icon: Users
                    },
                    {
                      id: 'songs',
                      title: 'Song-Library & Level',
                      subtitle: 'Starter, Pro, Master & Repertoire',
                      badge: `${[glSongLevelStarterEnabled, glSongLevelProEnabled, glSongLevelMasterEnabled].filter(Boolean).length} Level Aktiv`,
                      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      shadowColor: 'rgba(245, 158, 11, 0.40)',
                      icon: Music
                    },
                    {
                      id: 'live',
                      title: 'Live Lab & Band-Performance',
                      subtitle: `${glLiveDefaultBpm} BPM Standard • ${glLiveCountInBars === 2 ? '2 Takte' : '1 Takt'} Vorzähler`,
                      badge: `${glLiveDefaultBpm} BPM • Stage-View`,
                      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      shadowColor: 'rgba(217, 119, 6, 0.40)',
                      icon: Mic
                    },
                    {
                      id: 'radar',
                      title: 'Skill-Radar & XP',
                      subtitle: '5-Achsen-Radar • Song-Mastery XP',
                      badge: `${[glSkillRadarTiming, glSkillRadarTechnique, glSkillRadarSound, glSkillRadarRepertoire, glSkillRadarTeamplay].filter(Boolean).length} Achsen Aktiv`,
                      gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
                      shadowColor: 'rgba(234, 179, 8, 0.40)',
                      icon: Award
                    },
                    {
                      id: 'avatars',
                      title: 'Musiker- & Band-Avatare',
                      subtitle: 'Geist-Avatare & Band-Wappen',
                      badge: glMusicianAvatarsEnabled ? 'Geist-Avatar Aktiv' : 'Deaktiviert',
                      gradient: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
                      shadowColor: 'rgba(250, 204, 21, 0.40)',
                      icon: Smile
                    },
                    {
                      id: 'rooms',
                      title: 'Band-Rooms & Chat',
                      subtitle: 'Band-Chat, Shouts & Moderation',
                      badge: glBandChatEnabled ? 'Band-Chat Aktiv' : 'Deaktiviert',
                      gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                      shadowColor: 'rgba(245, 158, 11, 0.40)',
                      icon: Radio
                    },
                    {
                      id: 'permissions',
                      title: 'Coach-Rechte',
                      subtitle: 'Schüler & Lehrer im GrooveLab',
                      badge: teachersManageStudents ? 'Erweitert' : 'Standard',
                      gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                      shadowColor: 'rgba(234, 179, 8, 0.40)',
                      icon: ShieldCheck
                    },
                    {
                      id: 'feedback',
                      title: 'Ideenschmiede GrooveLab',
                      subtitle: 'Wünsche & Feedback für Bands',
                      badge: 'Mitgestalten',
                      gradient: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
                      shadowColor: 'rgba(202, 138, 4, 0.40)',
                      icon: Lightbulb
                    }
                  ].map((module) => {
                    const IconComp = module.icon;
                    return (
                      <div
                        key={module.id}
                        onClick={() => {
                          if (module.id === 'feedback') {
                            setIsFeedbackModalOpen(true);
                            return;
                          }
                          setActiveGroovelabSettingsModal(module.id as any);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '24px 16px 20px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 14px 28px -6px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)';
                          e.currentTarget.style.borderColor = '#eab308';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        {/* Accent Top Line */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '3.5px',
                          background: module.gradient
                        }} />

                        {/* App Squircle Icon */}
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '16px',
                          background: module.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          boxShadow: `0 8px 18px -4px ${module.shadowColor}`,
                          marginBottom: '14px',
                          flexShrink: 0
                        }}>
                          <IconComp size={28} color="#ffffff" strokeWidth={2.2} />
                        </div>

                        {/* Title */}
                        <h4 style={{
                          margin: '0 0 6px 0',
                          fontSize: '1.02rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          fontFamily: 'Urbanist, sans-serif',
                          lineHeight: 1.2
                        }}>
                          {module.title}
                        </h4>

                        {/* Subtitle */}
                        <p style={{
                          margin: '0 0 14px 0',
                          fontSize: '0.78rem',
                          color: '#64748b',
                          lineHeight: 1.35,
                          minHeight: '28px'
                        }}>
                          {module.subtitle}
                        </p>

                        {/* Status Badge */}
                        <span style={{
                          marginTop: 'auto',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#854d0e',
                          background: '#fefce8',
                          border: '1px solid #fef08a',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          letterSpacing: '0.02em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {module.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* FOCUS MODAL FOR GROOVELAB SETTINGS */}
                {activeGroovelabSettingsModal && (
                  <div 
                    role="dialog"
                    aria-modal="true"
                    aria-label="GrooveLab Einstellungen"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(15, 23, 42, 0.55)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      zIndex: 10000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      boxSizing: 'border-box'
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setActiveGroovelabSettingsModal(null);
                    }}
                  >
                    <div 
                      style={{
                        width: '100%',
                        maxWidth: '680px',
                        maxHeight: '90vh',
                        background: '#ffffff',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}
                      className="animate-scale-in"
                    >
                      {/* Modal Header */}
                      <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f8fafc'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.35)'
                          }}>
                            {activeGroovelabSettingsModal === 'bands' && <Users size={22} color="#ffffff" />}
                            {activeGroovelabSettingsModal === 'songs' && <Music size={22} color="#ffffff" />}
                            {activeGroovelabSettingsModal === 'live' && <Mic size={22} color="#ffffff" />}
                            {activeGroovelabSettingsModal === 'radar' && <Award size={22} color="#ffffff" />}
                            {activeGroovelabSettingsModal === 'avatars' && <Smile size={22} color="#ffffff" />}
                            {activeGroovelabSettingsModal === 'rooms' && <Radio size={22} color="#ffffff" />}
                            {activeGroovelabSettingsModal === 'permissions' && <ShieldCheck size={22} color="#ffffff" />}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              {activeGroovelabSettingsModal === 'bands' && 'Band-Engine & Besetzung'}
                              {activeGroovelabSettingsModal === 'songs' && 'Song-Library & Level-Matrix'}
                              {activeGroovelabSettingsModal === 'live' && 'Live Lab & Band-Performance'}
                              {activeGroovelabSettingsModal === 'radar' && 'Skill-Radar & XP-Belohnungen'}
                              {activeGroovelabSettingsModal === 'avatars' && 'Musiker- & Band-Avatare'}
                              {activeGroovelabSettingsModal === 'rooms' && 'Band-Rooms & Kommunikation'}
                              {activeGroovelabSettingsModal === 'permissions' && 'Coach-Berechtigungen'}
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                              {activeGroovelabSettingsModal === 'bands' && 'Konfiguriere maximale Bandgröße und Schüler-Gründungsrechte.'}
                              {activeGroovelabSettingsModal === 'songs' && 'Verwalte Song-Schwierigkeitsgrade und Repertoire-Regeln.'}
                              {activeGroovelabSettingsModal === 'live' && 'Konfiguriere Standard-Tempo, Vorzähler und Bühnen-Display für Bandproben.'}
                              {activeGroovelabSettingsModal === 'radar' && 'Gewichtung der 5 Radar-Achsen und Punktevergabe.'}
                              {activeGroovelabSettingsModal === 'avatars' && 'Schüler-Avatare und Band-Wappen-Generator steuern.'}
                              {activeGroovelabSettingsModal === 'rooms' && 'Band-Chat, Shoutbox und Moderationspflicht festlegen.'}
                              {activeGroovelabSettingsModal === 'permissions' && 'Rechte für Coaches zur Verwaltung von Profilen einstellen.'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveGroovelabSettingsModal(null)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(90vh - 140px)' }}>
                        
                        {/* 1. BANDS */}
                        {activeGroovelabSettingsModal === 'bands' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Maximale Bandmitglieder pro Ensemble</div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Begrenzung für aktive Band-Slots in der GrooveLab Band-Verwaltung.</div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                {[4, 6, 8, 10].map((num) => (
                                  <button
                                    key={num}
                                    onClick={() => handleSaveSettingValue('gl_max_band_members', num, setGlMaxBandMembers)}
                                    style={{
                                      flex: 1,
                                      padding: '8px',
                                      borderRadius: '10px',
                                      border: '1.5px solid',
                                      borderColor: glMaxBandMembers === num ? '#eab308' : '#e2e8f0',
                                      background: glMaxBandMembers === num ? '#fefce8' : '#ffffff',
                                      color: glMaxBandMembers === num ? '#854d0e' : '#64748b',
                                      fontWeight: 800,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {num} Musiker
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Eigenständige Bandgründung durch Schüler</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt Schülern, im GrooveLab-Modul neue Bands und Jam-Sessions zu initiieren.</div>
                              </div>
                              <button
                                onClick={() => handleSaveSettingValue('gl_allow_student_band_creation', !glAllowStudentBandCreation, setGlAllowStudentBandCreation)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: glAllowStudentBandCreation ? '#eab308' : '#e2e8f0',
                                  color: glAllowStudentBandCreation ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {glAllowStudentBandCreation ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 2. SONGS */}
                        {activeGroovelabSettingsModal === 'songs' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                              { key: 'gl_song_level_starter', label: 'Starter-Level freischalten', desc: 'Grundlegende Akkorde und vereinfachte Arrangements für Einsteiger.', val: glSongLevelStarterEnabled, set: setGlSongLevelStarterEnabled },
                              { key: 'gl_song_level_pro', label: 'Pro-Level freischalten', desc: 'Vollständige Songs mit Soli und mehrstimmigem Arrangement.', val: glSongLevelProEnabled, set: setGlSongLevelProEnabled },
                              { key: 'gl_song_level_master', label: 'Master-Level freischalten', desc: 'Bühnenreife Masterclass-Versionen mit Live-Performance-Check.', val: glSongLevelMasterEnabled, set: setGlSongLevelMasterEnabled },
                              { key: 'gl_song_proposal_workflow', label: 'Song-Vorschläge durch Schüler', desc: 'Schüler können neue Songs zur Aufnahme in das Schul-Repertoire vorschlagen.', val: glSongProposalWorkflow, set: setGlSongProposalWorkflow }
                            ].map((item) => (
                              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div style={{ maxWidth: '75%' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{item.label}</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue(item.key, !item.val, item.set)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: item.val ? '#eab308' : '#e2e8f0',
                                    color: item.val ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {item.val ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 3. LIVE LAB & BAND PERFORMANCE */}
                        {activeGroovelabSettingsModal === 'live' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Standard Band-Tempo (BPM)</div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Ausgangs-Geschwindigkeit für neue Proben und Songs im Live-Lab.</div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                {[80, 100, 120, 140].map((bpm) => (
                                  <button
                                    key={bpm}
                                    onClick={() => handleSaveSettingValue('gl_live_default_bpm', bpm, setGlLiveDefaultBpm)}
                                    style={{
                                      flex: 1,
                                      padding: '8px',
                                      borderRadius: '10px',
                                      border: '1.5px solid',
                                      borderColor: glLiveDefaultBpm === bpm ? '#eab308' : '#e2e8f0',
                                      background: glLiveDefaultBpm === bpm ? '#fefce8' : '#ffffff',
                                      color: glLiveDefaultBpm === bpm ? '#854d0e' : '#64748b',
                                      fontWeight: 800,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {bpm} BPM
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Vorzähler / Count-In zum Band-Start</div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Anzahl der Vorzähler-Takte vor dem gemeinsamen Einsetzen der Band.</div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                {[1, 2].map((bars) => (
                                  <button
                                    key={bars}
                                    onClick={() => handleSaveSettingValue('gl_live_count_in_bars', bars, setGlLiveCountInBars)}
                                    style={{
                                      flex: 1,
                                      padding: '8px',
                                      borderRadius: '10px',
                                      border: '1.5px solid',
                                      borderColor: glLiveCountInBars === bars ? '#eab308' : '#e2e8f0',
                                      background: glLiveCountInBars === bars ? '#fefce8' : '#ffffff',
                                      color: glLiveCountInBars === bars ? '#854d0e' : '#64748b',
                                      fontWeight: 800,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {bars} {bars === 1 ? 'Takt Vorzähler' : 'Takte Vorzähler'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Stage-Display &amp; Teleprompter (Vollbild-Akkorde)</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Aktiviert die vergrößerte Bühnenansicht für Proberaum-Bildschirme und Tablets.</div>
                              </div>
                              <button
                                onClick={() => handleSaveSettingValue('gl_live_stage_display_enabled', !glLiveStageDisplayEnabled, setGlLiveStageDisplayEnabled)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: glLiveStageDisplayEnabled ? '#eab308' : '#e2e8f0',
                                  color: glLiveStageDisplayEnabled ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {glLiveStageDisplayEnabled ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 4. RADAR */}
                        {activeGroovelabSettingsModal === 'radar' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                              { key: 'gl_skill_radar_timing', label: 'Timing & Rhythmusgefühl', desc: 'Bewertet Taktgenauigkeit, Metronomtreue und Timekeeping.', val: glSkillRadarTiming, set: setGlSkillRadarTiming },
                              { key: 'gl_skill_radar_technique', label: 'Spieltechnik & Fingerfertigkeit', desc: 'Bewertet Griff- und Anschlagssicherheit auf dem Instrument.', val: glSkillRadarTechnique, set: setGlSkillRadarTechnique },
                              { key: 'gl_skill_radar_sound', label: 'Sound & Dynamik', desc: 'Bewertet Tonformung, Sound-Settings und Ausdruckskraft.', val: glSkillRadarSound, set: setGlSkillRadarSound },
                              { key: 'gl_skill_radar_repertoire', label: 'Repertoire & Song-Mastery', desc: 'Bewertet die Anzahl der auswendig beherrschten Band-Songs.', val: glSkillRadarRepertoire, set: setGlSkillRadarRepertoire },
                              { key: 'gl_skill_radar_teamplay', label: 'Teamplay & Zusammenspiel', desc: 'Bewertet Band-Dynamik, Interaktion und Zuverlässigkeit.', val: glSkillRadarTeamplay, set: setGlSkillRadarTeamplay }
                            ].map((item) => (
                              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div style={{ maxWidth: '75%' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{item.label}</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue(item.key, !item.val, item.set)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: item.val ? '#eab308' : '#e2e8f0',
                                    color: item.val ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {item.val ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 5. AVATARS */}
                        {activeGroovelabSettingsModal === 'avatars' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Musiker-Geist-Avatare im GrooveLab</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt Schülern und Lehrkräften die Nutzung von Band- und Musiker-Avataren.</div>
                              </div>
                              <button
                                onClick={() => handleSaveSettingValue('gl_musician_avatars_enabled', !glMusicianAvatarsEnabled, setGlMusicianAvatarsEnabled)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: glMusicianAvatarsEnabled ? '#eab308' : '#e2e8f0',
                                  color: glMusicianAvatarsEnabled ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {glMusicianAvatarsEnabled ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Band-Wappen &amp; Logo-Generator</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Aktiviert den interaktiven Ensemble-Visual-Generator für Schüler-Bands.</div>
                              </div>
                              <button
                                onClick={() => handleSaveSettingValue('gl_band_coat_of_arms_enabled', !glBandCoatOfArmsEnabled, setGlBandCoatOfArmsEnabled)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: glBandCoatOfArmsEnabled ? '#eab308' : '#e2e8f0',
                                  color: glBandCoatOfArmsEnabled ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {glBandCoatOfArmsEnabled ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 6. ROOMS */}
                        {activeGroovelabSettingsModal === 'rooms' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Band-Chat &amp; Band-Room Kommunikation</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt geschützte Direktkommunikation innerhalb der Ensembles.</div>
                              </div>
                              <button
                                onClick={() => handleSaveSettingValue('gl_band_chat_enabled', !glBandChatEnabled, setGlBandChatEnabled)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: glBandChatEnabled ? '#eab308' : '#e2e8f0',
                                  color: glBandChatEnabled ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {glBandChatEnabled ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Audio-Kompression für Probenmitschnitte</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Komprimiert Bandraum-Audioaufnahmen automatisch für schnellen Cloud-Sync.</div>
                              </div>
                              <button
                                onClick={() => handleSaveSettingValue('gl_jam_recording_compression', !glJamRecordingCompression, setGlJamRecordingCompression)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: glJamRecordingCompression ? '#eab308' : '#e2e8f0',
                                  color: glJamRecordingCompression ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {glJamRecordingCompression ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 7. PERMISSIONS */}
                        {activeGroovelabSettingsModal === 'permissions' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Schüler hinzufügen &amp; verwalten</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt es Coaches, neue Schüler-Profile im GrooveLab-Modul anzulegen oder zu bearbeiten.</div>
                              </div>
                              <button
                                onClick={() => handleToggleSetting('gl_setting_groovelab_teachers_manage_students', !teachersManageStudents, setTeachersManageStudents)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: teachersManageStudents ? '#eab308' : '#e2e8f0',
                                  color: teachersManageStudents ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {teachersManageStudents ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Lehrkräfte (Coaches) hinzufügen &amp; verwalten</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt Coaches, Profile anderer Lehrer im GrooveLab-Modul anzulegen oder zu bearbeiten.</div>
                              </div>
                              <button
                                onClick={() => handleToggleSetting('gl_setting_groovelab_teachers_manage_teachers', !teachersManageTeachers, setTeachersManageTeachers)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  border: 'none',
                                  background: teachersManageTeachers ? '#eab308' : '#e2e8f0',
                                  color: teachersManageTeachers ? '#ffffff' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {teachersManageTeachers ? 'Aktiv' : 'Deaktiviert'}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Modal Footer */}
                      <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        background: '#f8fafc'
                      }}>
                        <button
                          onClick={() => setActiveGroovelabSettingsModal(null)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#eab308',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)'
                          }}
                        >
                          Fertig
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

  );
};

export default SecretaryGroovelabTab;
