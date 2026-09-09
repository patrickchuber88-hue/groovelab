import React, { useMemo, useState } from "react";
import {
  AlertCircle, Bell, Check, ChevronLeft, ChevronRight, Clock,
  Hourglass, Key, Lock, Monitor, Music, TrendingUp, User, X,
  Zap, ZoomIn, ZoomOut
} from "lucide-react";
import { CampusGroovelabLogo } from "../CampusGroovelabBrand";
import { supabase } from "../../lib/supabase";
import { formatTeacherFullName, maskLastName } from "../../utils/nameHelper";
import { renderInstrumentIcon } from "../../utils/instruments";
import { AvatarImage } from "../common/AvatarImage";

const TEACHER_INSTRUMENT_ICONS: Record<string, any> = { 
  Guitar: renderInstrumentIcon("Guitar"), 
  Bass: renderInstrumentIcon("Bass"), 
  Drums: renderInstrumentIcon("Drums"), 
  Keys: renderInstrumentIcon("Keys"), 
  Vocals: renderInstrumentIcon("Vocals") 
};
const INSTRUMENT_COLORS: Record<string, string> = { 
  Guitar: "#ef4444", 
  Bass: "#eab308", 
  Drums: "#3b82f6", 
  Keys: "#a855f7",
  Vocals: "#34a853"
};

const normalizeInstrument = (name: string) => {
  const n = (name || "").toLowerCase().trim();
  if (n.includes("gitarre") || n.includes("guitar")) return "Guitar";
  if (n.includes("bass")) return "Bass";
  if (n.includes("drums") || n.includes("schlagzeug")) return "Drums";
  if (n.includes("piano") || n.includes("keys") || n.includes("klavier")) return "Keys";
  if (n.includes("vocals") || n.includes("gesang")) return "Vocals";
  return name;
};

const adjustPositions = (stations: any[], containerWidth: number = 364) => {
  const items = stations.map(s => ({
    ...s,
    x: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    y: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50,
    origX: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    origY: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50
  }));

  const containerHeight = containerWidth / 1.4;
  const safeMarginPx = 45;
  const safeMinX = Math.min(45, (safeMarginPx / containerWidth) * 100);
  const safeMaxX = Math.max(55, 100 - safeMinX);
  const safeMinY = Math.min(45, (safeMarginPx / containerHeight) * 100);
  const safeMaxY = Math.max(55, 100 - safeMinY);
  const minXDistPx = 76;
  const minYDistPx = 76;
  const iterations = 50;
  const minXDist = (minXDistPx / containerWidth) * 100;
  const minYDist = (minYDistPx / containerHeight) * 100;

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].x - items[j].x;
        const dy = items[i].y - items[j].y;
        if (Math.abs(dx) < minXDist && Math.abs(dy) < minYDist) {
          moved = true;
          const isVerticallyAligned = Math.abs(items[i].origX - items[j].origX) < 6;
          const isHorizontallyAligned = Math.abs(items[i].origY - items[j].origY) < 6;
          if (isVerticallyAligned && !isHorizontallyAligned) {
            const overlapY = minYDist - Math.abs(dy);
            const forceY = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
            const pushY = forceY * (overlapY / 2);
            items[i].y += pushY;
            items[j].y -= pushY;
            items[i].x = items[i].origX;
            items[j].x = items[j].origX;
          } else if (isHorizontallyAligned && !isVerticallyAligned) {
            const overlapX = minXDist - Math.abs(dx);
            const forceX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
            const pushX = forceX * (overlapX / 2);
            items[i].x += pushX;
            items[j].x -= pushX;
            items[i].y = items[i].origY;
            items[j].y = items[j].origY;
          } else {
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const overlapX = minXDist - Math.abs(dx);
            const overlapY = minYDist - Math.abs(dy);
            const forceX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : dx / dist;
            const forceY = dy === 0 ? (i % 2 === 0 ? -1 : 1) : dy / dist;
            items[i].x += forceX * (overlapX / 2);
            items[i].y += forceY * (overlapY / 2);
            items[j].x -= forceX * (overlapX / 2);
            items[j].y -= forceY * (overlapY / 2);
          }
          items[i].x = Math.max(safeMinX, Math.min(safeMaxX, items[i].x));
          items[i].y = Math.max(safeMinY, Math.min(safeMaxY, items[i].y));
          items[j].x = Math.max(safeMinX, Math.min(safeMaxX, items[j].x));
          items[j].y = Math.max(safeMinY, Math.min(safeMaxY, items[j].y));
        }
      }
    }
    if (!moved) break;
  }
  return items;
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
  if (num === 1 || num === 2) return '#eab308'; // Yellow
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
    return {
      stations: [],
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      F: 1.0
    };
  }

  // 1. Calculate raw coordinates in reference space (width reference 1000px)
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

  // 2. Find center of the bounding box of raw station centers
  const xs = rawCoords.map(c => c.x);
  const ys = rawCoords.map(c => c.y);
  const minRawX = Math.min(...xs);
  const maxRawX = Math.max(...xs);
  const minRawY = Math.min(...ys);
  const maxRawY = Math.max(...ys);

  const centerX = (minRawX + maxRawX) / 2;
  const centerY = (minRawY + maxRawY) / 2;

  // 3. Compute F_min to prevent overlaps
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

  // Limit compression factor to be between 0.68 and 1.5
  const F = Math.max(0.68, Math.min(1.5, F_min));

  // 4. Calculate compressed coordinates
  const compressedStations = rawCoords.map(c => {
    const cx = centerX + (c.x - centerX) * F;
    const cy = centerY + (c.y - centerY) * F;
    return {
      ...c,
      cx,
      cy
    };
  });

  // 5. Calculate new bounding box limits based on compressed coordinates
  const minX = Math.min(...compressedStations.map(c => c.cx - 90));
  const maxX = Math.max(...compressedStations.map(c => c.cx + 90));
  const minY = Math.min(...compressedStations.map(c => c.cy - 110));
  const maxY = Math.max(...compressedStations.map(c => c.cy + 110));

  return {
    stations: compressedStations,
    minX,
    maxX,
    minY,
    maxY,
    F
  };
};


const StationNode = React.memo(({ num, color, inst, sess, isMe, viewMode, onProfileSelect, onLogout, hasHelpRequest, customName, activePlatform }: { 
  num: number, color: string, inst: string, sess: any, isMe: boolean, viewMode: string, onProfileSelect: (u: any) => void, onLogout: (id: string) => void, hasHelpRequest?: boolean, customName?: string, activePlatform?: string
}) => {
  const stationName = customName || sess?.stations?.name || `iPad ${num}`;
  const isActive = !!sess;
  
  const activeMins = useMemo(() => {
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
        role={isActive ? "button" : undefined}
        tabIndex={isActive ? 0 : -1}
        aria-label={isActive ? `Station ${stationName} öffnen: ${sess?.users?.first_name || ''} ${sess?.users?.last_name || ''} (${inst})` : `Station ${stationName} (${inst}, nicht belegt)`}
        onKeyDown={(e) => {
          if (isActive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onProfileSelect(sess.users);
          }
        }}
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
              animation: 'pulse-red 1s infinite',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
              zIndex: 10
            }}>
              <AlertCircle size={10} fill="white" /> HELP
            </div>
          )}
          {isActive && (viewMode === 'admin' || isMe) && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLogout(sess.id); }}
              style={{ 
                background: '#fef2f2', 
                border: '1px solid #fee2e2', 
                width: '20px',
                height: '20px',
                borderRadius: '50%', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer', 
                color: '#ef4444', 
                fontSize: '10px', 
                fontWeight: 'bold', 
                transition: 'all 0.2s ease',
                flexShrink: 0,
                marginLeft: '4px',
                padding: 0
              }}
              title="Auschecken"
            >
              ✕
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
                fontWeight: isMe ? 800 : 600, 
                fontSize: '0.85rem', 
                color: isMe ? color : '#1e293b', 
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
    prev.sess?.users?.first_name === next.sess?.users?.first_name &&
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

const CoachesNode = React.memo(({ coaches, onProfileSelect, activePlatform, currentUserId, onSelfCheckout, onCoachCheckout, viewMode }: { coaches: any[], onProfileSelect: (u: any) => void, activePlatform?: string, currentUserId?: string, onSelfCheckout?: () => void, onCoachCheckout?: (coach: any) => void, viewMode?: string }) => {
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
          const isSelf = currentUserId && c.id === currentUserId;
          return (
            <div 
              key={c.id || idx} 
              style={{ 
                position: 'absolute',
                transform: `translate(${offset}px, ${verticalOffset}px)`,
                display: 'flex',
                flexDirection: labelAbove ? 'column-reverse' : 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10 - idx,
              }}
            >
              <div 
                onClick={() => c.users && onProfileSelect(c.users)}
                style={{ width: '84px', height: '84px', borderRadius: '50%', border: isSelf ? '2px solid #34a853' : '2px solid white', boxShadow: isSelf ? '0 8px 20px rgba(52,168,83,0.25)' : '0 8px 20px rgba(0,0,0,0.15)', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                <AvatarImage src={c.users?.photo_url} user={c.users} activePlatform={activePlatform} />
              </div>
              <div style={{ background: 'white', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', minWidth: '90px', position: 'relative' }}>
                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.8rem' }}>{c.users?.first_name} {c.users?.last_name || ''}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{c.session?.stations?.name || 'Lehrer iPad'}</div>
                {viewMode === 'admin' && isSelf && onSelfCheckout ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelfCheckout(); }}
                    title="Vom Lehrer iPad abmelden"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 900,
                      boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                      flexShrink: 0,
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                ) : (viewMode === 'admin' && !isSelf && onCoachCheckout) ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCoachCheckout(c); }}
                    title="Lehrer abmelden"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 900,
                      boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                      flexShrink: 0,
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {coaches.filter(Boolean).length === 0 && <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700 }}>Bereit</div>}
      </div>
    </div>
  );
}, (prev, next) => {
  const prevCoaches = (prev.coaches || []).filter(Boolean);
  const nextCoaches = (next.coaches || []).filter(Boolean);
  if (prevCoaches.length !== nextCoaches.length) return false;
  if (prev.currentUserId !== next.currentUserId) return false;
  return prevCoaches.every((c, i) => {
    const nextCoach = nextCoaches[i];
    if (!nextCoach) return false;
    return c.id === nextCoach.id && 
           c.users?.photo_url === nextCoach.users?.photo_url &&
           c.session?.id === nextCoach.session?.id;
  });
});


export interface TeacherLiveViewProps {
  teacher: any;
  userId?: string;
  viewMode?: string;
  activePlatform?: string;
  hideHeader?: boolean;
  windowWidth: number;
  windowHeight: number;
  containerWidth: number;
  containerRef: (node: HTMLDivElement | null) => void;
  showRealNames: boolean;
  rooms: any[];
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string) => void;
  stations: any[];
  activeSessions: any[];
  setActiveSessions: React.Dispatch<React.SetStateAction<any[]>>;
  coaches: any[];
  setSelectedCoachProfile: (c: any) => void;
  setSelectedStudentProfile: (s: any) => void;
  helpRequests: any[];
  unreadShouts: any[];
  submissions: any[];
  allSubmissions: any[];
  setShowAllSubmissions: (val: boolean) => void;
  wallSongs: any[];
  rehearsalSuggestions: any[];
  openProposals: any[];
  zoomFactor: number;
  handleZoomChange: (delta: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed?: (val: boolean) => void;
  sidebarNotificationsCount: number;
  setActiveTab: (tab: any) => void;
  onTabChange?: (tab: string) => void;
  onFoundBand?: (band: any, slot?: any) => void;
  showKioskView: boolean;
  setShowKioskView: (val: boolean) => void;
  showKioskPinSetup: boolean;
  setShowKioskPinSetup: (val: boolean) => void;
  kioskPinInput: string;
  setKioskPinInput: React.Dispatch<React.SetStateAction<string>>;
  targetKioskStation: any;
  setTargetKioskStation: (st: any) => void;
  checkingInStatus: 'idle' | 'locating' | 'verifying' | 'success' | 'error';
  setCheckingInStatus: React.Dispatch<React.SetStateAction<'idle' | 'locating' | 'verifying' | 'success' | 'error'>>;
  geoErrorMsg: string | null;
  shakeLock: boolean;
  isUserCheckedIn: boolean;
  handleGeofenceCheck: () => void;
  handleKioskStationSelect: (st: any) => void;
  handleTeacherSelfCheckout: () => void;
  handleTeacherCheckout: (coach: any) => void;
  handleLogoutStudent: (student: any) => void;
  handleResolveHelp: (id: string) => void;
  handleMarkAsRead: (id: string) => void;
  handleMarkAllAsRead: () => void;
  handleApproveSubmission: (sub: any) => void;
  handleRejectSubmission: (sub: any) => void;
  fetchData: () => void;
  cleanRoomName: (name: string | null | undefined) => string;
  setToastMessage: (msg: string | null) => void;
}

export const TeacherLiveView: React.FC<TeacherLiveViewProps> = ({
  teacher,
  userId,
  viewMode = "admin",
  activePlatform = "campus",
  hideHeader = false,
  windowWidth,
  windowHeight,
  containerWidth,
  containerRef,
  showRealNames,
  rooms,
  selectedRoomId,
  setSelectedRoomId,
  stations,
  activeSessions,
  setActiveSessions,
  coaches,
  setSelectedCoachProfile,
  setSelectedStudentProfile,
  helpRequests,
  unreadShouts,
  submissions,
  allSubmissions,
  setShowAllSubmissions,
  wallSongs,
  rehearsalSuggestions,
  openProposals,
  zoomFactor,
  handleZoomChange,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  sidebarNotificationsCount,
  setActiveTab,
  onTabChange,
  onFoundBand,
  showKioskView,
  setShowKioskView,
  showKioskPinSetup,
  setShowKioskPinSetup,
  kioskPinInput,
  setKioskPinInput,
  targetKioskStation,
  setTargetKioskStation,
  checkingInStatus,
  setCheckingInStatus,
  geoErrorMsg,
  shakeLock,
  isUserCheckedIn,
  handleGeofenceCheck,
  handleKioskStationSelect,
  handleTeacherSelfCheckout,
  handleTeacherCheckout,
  handleLogoutStudent,
  handleResolveHelp,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleApproveSubmission,
  handleRejectSubmission,
  fetchData,
  cleanRoomName,
  setToastMessage,
}) => {
  return (
        <div id="tour-teacher-livelab" className={`live-lab-grid ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {(() => {
            const isMobileView = windowWidth < 768 || containerWidth < 768 || windowHeight < 500;
            const activeRoom = rooms.find(r => r.id === selectedRoomId);
            const roomStations = stations.filter(s => s.room_id === selectedRoomId);

            if (isMobileView) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
                  {/* Mobile Room Switcher Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center' }}>
                        <CampusGroovelabLogo size={24} fontSize="1.5rem" />
                      </h2>
                      {setIsSidebarCollapsed && (
                        <button
                          onClick={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
                          style={{
                            background: 'white',
                            border: '1.5px solid #e2e8f0',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                        >
                          Info {sidebarNotificationsCount > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '6px', height: '6px', display: 'inline-block' }}></span>}
                        </button>
                      )}
                    </div>
                    {rooms.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
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

                  {/* Geofence Overlay if not checked in */}
                  {!isUserCheckedIn && (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1.5px dashed rgba(234, 179, 8, 0.3)',
                      borderRadius: '24px',
                      padding: '24px',
                      textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                      overflow: 'hidden'
                    }}>
                      {/* Light diagonal stripes overlay (5% opacity) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(15, 23, 42, 0.05) 10px, rgba(15, 23, 42, 0.05) 11px)',
                        pointerEvents: 'none',
                        borderRadius: 'inherit',
                        zIndex: 0
                      }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'rgba(251, 188, 5, 0.08)',
                          border: '1px solid rgba(251, 188, 5, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#eab308',
                          margin: '0 auto 12px auto'
                        }}>
                          <Lock size={20} />
                        </div>
                        <h4 style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <CampusGroovelabLogo size={18} fontSize="18px" /> Live
                        </h4>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                          Bitte logge dich vor Ort in der Musikschule ein, um deine iPad-Station zu aktivieren und das Live Lab Board freizuschalten.
                        </p>
                        {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div className="spin-checkin" style={{ width: '20px', height: '20px', border: '3px solid #fbbc05', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#eab308' }}>
                              {checkingInStatus === 'locating' ? 'Bestimme Standort...' : 'Verifiziere Geodaten...'}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGeofenceCheck}
                            className="pulse-btn-checkin"
                            aria-label="Am Live Lab Board einloggen"
                            style={{
                              padding: '12px 24px',
                              borderRadius: '12px',
                              background: '#fbbc05',
                              border: 'none',
                              color: '#0f172a',
                              fontSize: '14px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(251, 188, 5, 0.2)'
                            }}
                          >
                            Einloggen
                          </button>
                        )}
                        {checkingInStatus === 'error' && geoErrorMsg && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#ef4444', fontSize: '12px' }}>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, textAlign: 'left' }}>{geoErrorMsg}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Checked In Content */}
                  {isUserCheckedIn && (
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
                        {coaches.filter(Boolean).length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, fontStyle: 'italic', paddingLeft: '4px' }}>
                            Keine Coaches vor Ort eingeloggt
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {coaches.filter(Boolean).map((c, idx) => {
                              const isSelf = userId && c.id === userId;
                              const coachName = c.users ? formatTeacherFullName(c.users) : 'Coach';
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
                                    border: isSelf ? '1.5px solid #34a853' : '1px solid #e2e8f0',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                                  }}
                                  onClick={() => c.users && setSelectedCoachProfile(c.users)}
                                >
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                    <AvatarImage src={c.users?.photo_url} user={c.users} activePlatform={activePlatform} />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem', lineHeight: 1.1 }}>{coachName}</span>
                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>{c.session?.stations?.name || 'Lehrer iPad'}</span>
                                  </div>
                                  {viewMode === 'admin' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSelf && handleTeacherSelfCheckout) handleTeacherSelfCheckout();
                                        else if (!isSelf && handleTeacherCheckout) handleTeacherCheckout(c);
                                      }}
                                      title={isSelf ? 'Vom Lehrer iPad abmelden' : 'Coach abmelden'}
                                      aria-label={isSelf ? 'Vom Lehrer iPad abmelden' : 'Coach abmelden'}
                                      style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fee2e2',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#ef4444',
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        padding: 0,
                                        marginLeft: '6px',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
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
                          const isMe = sess?.user_id === userId;
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
                                  setSelectedStudentProfile(sess.users);
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
                                  marginRight: (viewMode === 'admin' || isMe) ? '4px' : '0px'
                                }}>
                                  <AlertCircle size={10} fill="white" /> HILFE
                                </div>
                              )}

                              {/* Checkout Button */}
                              {isActive && (viewMode === 'admin' || isMe) && (
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
                  )}
                </div>
              );
            }

            const hasCustomLayout = activeRoom && 
              activeRoom.room_width && 
              activeRoom.room_height && 
              roomStations.some(s => s.pos_x !== null && s.pos_y !== null);

            if (hasCustomLayout) {
              // Account for the parent dashboard header height
              const parentHeaderHeight = viewMode === 'student' ? 80 : 90;
              const verticalOffset = parentHeaderHeight + (!hideHeader && rooms.length > 1 ? 54 : 0);
              const maxH = Math.max(300, windowHeight - verticalOffset - 24);

              // 1. Calculate fitting scale for all custom rooms to find the minimum scale (largest layout space required)
              // This ensures that the scale (and thus iPad card size) is completely uniform across all custom layout rooms,
              // while guaranteeing that even the largest room fits completely within the screen boundaries without overflow.
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

              // Calculate bounding box and compressed coordinates of all nodes for active room
              const compressedActiveLayout = getCompressedRoomCoordinates(roomStations, rawRoomAspectRatio);
              const minBoundX = compressedActiveLayout.minX;
              const maxBoundX = compressedActiveLayout.maxX;
              const minBoundY = compressedActiveLayout.minY;
              const maxBoundY = compressedActiveLayout.maxY;

              const boundWidth = Math.max(100, maxBoundX - minBoundX);
              const boundHeight = Math.max(100, maxBoundY - minBoundY);

              // Use the original size scaled by manual zoomFactor
              const scale = 1.0 * zoomFactor;

              return (
                <div 
                  ref={containerRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: rooms.length > 1 ? '16px' : '0px', maxWidth: 'none', width: '100%', alignItems: 'center' }}
                >
                  {/* Unified Header Row / Toolbar Row */}
                  {hideHeader ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      marginBottom: '16px',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', margin: 0 }}>
                          Live Lab
                        </h1>
                        
                        {/* Room Switcher inline next to title */}
                        {rooms.length > 1 && (
                          <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px' }}>
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

                        {/* Magnifier Zoom Panel inline */}
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

                      {/* Sidebar toggle button on the far right */}
                      {setIsSidebarCollapsed && (
                        <button
                          onClick={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
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
                              {viewMode === 'student' && sidebarNotificationsCount > 0 && (
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
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '16px', flexWrap: 'wrap' }}>
                      {rooms.length > 1 ? (
                        <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px' }}>
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
                                  padding: '8px 16px',
                                  borderRadius: '12px',
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
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
                      ) : (
                        <div />
                      )}

                      {/* Magnifier Zoom Panel */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f1f5f9',
                        padding: '6px',
                        borderRadius: '16px'
                      }}>
                        <button 
                          onClick={() => handleZoomChange(Math.max(0.4, zoomFactor - 0.1))}
                          style={{
                            background: 'white',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale-mini"
                          title="Verkleinern"
                        >
                          <ZoomOut size={18} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b', padding: '0 8px', minWidth: '48px', textAlign: 'center' }}>
                          {Math.round(zoomFactor * 100)}%
                        </span>
                        <button 
                          onClick={() => handleZoomChange(Math.min(2.5, zoomFactor + 0.1))}
                          style={{
                            background: 'white',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale-mini"
                          title="Vergrößern"
                        >
                          <ZoomIn size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Horizontal Flex Wrapper for Blueprint Layout and Slider */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px', justifyContent: 'center', width: '100%', position: 'relative' }}>
                    {/* Glass Overlay if user is not checked in */}
                    {!isUserCheckedIn && (
                      <>
                        <style dangerouslySetInnerHTML={{__html: `
                          @keyframes softPulseCheckin {
                            0% {
                              box-shadow: 0 0 0 0 rgba(251, 188, 5, 0.45);
                              transform: scale(1);
                            }
                            50% {
                              box-shadow: 0 0 25px 8px rgba(251, 188, 5, 0.25);
                              transform: scale(1.03);
                            }
                            100% {
                              box-shadow: 0 0 0 0 rgba(251, 188, 5, 0.45);
                              transform: scale(1);
                            }
                          }
                          @keyframes spinCheckin {
                            to { transform: rotate(360deg); }
                          }
                          @keyframes shakeLock {
                            0%, 100% { transform: translateX(0); }
                            20%, 60% { transform: translateX(-6px); }
                            40%, 80% { transform: translateX(6px); }
                          }
                          .pulse-btn-checkin {
                            animation: softPulseCheckin 2.5s infinite ease-in-out;
                          }
                          .spin-checkin {
                            animation: spinCheckin 1s linear infinite;
                          }
                          .shake-lock-active {
                            animation: shakeLock 0.4s ease-in-out;
                          }
                        `}} />
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: '24px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(0.2px)',
                          WebkitBackdropFilter: 'blur(0.2px)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1000,
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                          padding: '24px',
                          textAlign: 'center'
                        }}>
                          {/* Light diagonal stripes overlay (5% opacity) */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(15, 23, 42, 0.05) 10px, rgba(15, 23, 42, 0.05) 11px)',
                            pointerEvents: 'none',
                            borderRadius: 'inherit',
                            zIndex: -1
                          }} />
                          <div 
                            className={shakeLock ? 'shake-lock-active' : ''}
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              background: 'rgba(251, 188, 5, 0.08)',
                              border: '1px solid rgba(251, 188, 5, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#eab308',
                              marginBottom: '16px'
                            }}
                          >
                            <Lock size={28} />
                          </div>
                          
                          <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                            GrooveLab Live-Plattform
                          </h4>
                          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '300px', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                            Bitte logge dich vor Ort in der Musikschule ein, um deine iPad-Station zu aktivieren und das Live Lab Board freizuschalten.
                          </p>

                          {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <div className="spin-checkin" style={{ width: '24px', height: '24px', border: '3px solid #fbbc05', borderTopColor: 'transparent', borderRadius: '50%' }} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#eab308' }}>
                                {checkingInStatus === 'locating' ? 'Bestimme Standort...' : 'Verifiziere Geodaten...'}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleGeofenceCheck}
                              className="pulse-btn-checkin"
                              aria-label="Am Live Lab Board einloggen"
                              style={{
                                padding: '14px 28px',
                                borderRadius: '16px',
                                background: '#fbbc05',
                                border: 'none',
                                color: '#0f172a',
                                fontSize: '15px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(251, 188, 5, 0.3)'
                              }}
                            >
                              Einloggen
                            </button>
                          )}

                          {checkingInStatus === 'error' && geoErrorMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '10px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '13px', maxWidth: '340px' }}>
                              <AlertCircle size={16} style={{ flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, textAlign: 'left' }}>{geoErrorMsg}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {/* Scaled room blueprint to fit parent width and height without scrolling or overlaps */}
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
                        padding: '16px',
                        filter: 'none',
                        pointerEvents: !isUserCheckedIn ? 'none' : 'auto'
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
                        {/* Visual Blueprint Canvas */}
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
                          const isTeacher = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
                          const instColor = getStationColor(sName, station.rawStation.color);

                          // Align center coordinates relative to the bounding box
                          const alignedX = station.cx - minBoundX;
                          const alignedY = station.cy - minBoundY;

                          if (isTeacher) {
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
                                <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} currentUserId={userId} onSelfCheckout={handleTeacherSelfCheckout} onCoachCheckout={handleTeacherCheckout} viewMode={viewMode} />
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
                                viewMode={viewMode}
                                onProfileSelect={setSelectedStudentProfile}
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

            // Fallback grid layout if no custom layout coordinates set
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: rooms.length > 1 ? '16px' : '0px', flex: 1 }}>
                {/* Room Switcher */}
                {rooms.length > 1 && (
                  <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start', marginBottom: '8px' }}>
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
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
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
                {/* Grid */}
                <div style={{ position: 'relative', width: '100%' }}>
                  {!isUserCheckedIn && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '32px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(0.2px)',
                      WebkitBackdropFilter: 'blur(0.2px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                      padding: '24px',
                      textAlign: 'center'
                    }}>
                      {/* Light diagonal stripes overlay (5% opacity) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(15, 23, 42, 0.05) 10px, rgba(15, 23, 42, 0.05) 11px)',
                        pointerEvents: 'none',
                        borderRadius: 'inherit',
                        zIndex: -1
                      }} />
                      <div 
                        className={shakeLock ? 'shake-lock-active' : ''}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'rgba(251, 188, 5, 0.08)',
                          border: '1px solid rgba(251, 188, 5, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#eab308',
                          marginBottom: '16px'
                        }}
                      >
                        <Lock size={28} />
                      </div>
                      
                      <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        GrooveLab Live-Plattform
                      </h4>
                      <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '300px', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                        Bitte logge dich vor Ort in der Musikschule ein, um deine iPad-Station zu aktivieren und das Live Lab Board freizuschalten.
                      </p>

                      {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div className="spin-checkin" style={{ width: '24px', height: '24px', border: '3px solid #fbbc05', borderTopColor: 'transparent', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#eab308' }}>
                            {checkingInStatus === 'locating' ? 'Bestimme Standort...' : 'Verifiziere Geodaten...'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGeofenceCheck}
                          className="pulse-btn-checkin"
                          aria-label="Am Live Lab Board einloggen"
                          style={{
                            padding: '14px 28px',
                            borderRadius: '16px',
                            background: '#fbbc05',
                            border: 'none',
                            color: '#0f172a',
                            fontSize: '15px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 14px rgba(251, 188, 5, 0.3)'
                          }}
                        >
                          Einloggen
                        </button>
                      )}

                      {checkingInStatus === 'error' && geoErrorMsg && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '10px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '13px', maxWidth: '340px' }}>
                          <AlertCircle size={16} style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, textAlign: 'left' }}>{geoErrorMsg}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                    gap: '24px', 
                    background: '#ffffff', 
                    padding: '24px', 
                    borderRadius: '32px', 
                    border: '1px solid #e2e8f0',
                    filter: 'none',
                    pointerEvents: !isUserCheckedIn ? 'none' : 'auto'
                  }}>
                    {/* Coaches Node */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} currentUserId={userId} onSelfCheckout={handleTeacherSelfCheckout} onCoachCheckout={handleTeacherCheckout} viewMode={viewMode} />
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
                            viewMode={viewMode}
                            onProfileSelect={setSelectedStudentProfile}
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
            );
          })()}

          {/* Backdrop for mobile overlay sidebar */}
          {!isSidebarCollapsed && (
            <div 
              className="sidebar-backdrop"
              onClick={() => setIsSidebarCollapsed?.(true)}
            />
          )}

          {/* Floating Right-Edge Toggle Button when Collapsed */}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed?.(false)}
              style={{
                position: 'fixed',
                right: '0px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 99,
                background: 'linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)',
                border: '1.5px solid #fef3c7',
                borderRight: 'none',
                borderRadius: '16px 0 0 16px',
                padding: '12px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '-4px 0 20px rgba(234, 179, 8, 0.25)',
                color: '#854d0e',
                fontWeight: 900,
                fontSize: '0.7rem',
                transition: 'all 0.2s ease-in-out'
              }}
              className="hover-scale"
              title="Band-Matching & Zusatz-Infos ausklappen"
            >
              <ChevronLeft size={18} color="#eab308" />
              <Zap size={16} fill="#eab308" color="#eab308" />
              <span style={{ writingMode: 'vertical-rl', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>Matching & Infos</span>
            </button>
          )}

          <aside style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px',
            width: isSidebarCollapsed ? '0px' : '340px',
            opacity: isSidebarCollapsed ? 0 : 1,
            transform: isSidebarCollapsed ? 'translateX(20px)' : 'translateX(0)',
            pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
            overflowY: isSidebarCollapsed ? 'hidden' : 'auto',
            overflowX: 'hidden',
            maxHeight: `${windowHeight - 160}px`,
            paddingRight: '6px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Sidebar Header (Universal Close Button for Desktop & Mobile) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#eab308" fill="#eab308" />
                <span style={{ fontWeight: 950, fontSize: '0.9rem', color: '#1e293b', letterSpacing: '-0.02em' }}>Matching & Infos</span>
              </div>
              <button 
                onClick={() => setIsSidebarCollapsed?.(true)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  transition: 'all 0.15s'
                }}
                className="hover-scale"
                title="Slider einklappen"
              >
                <span>Einklappen</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Help Requests Section */}
            {viewMode !== 'student' && helpRequests.length > 0 && (
              <div className="glass-panel" style={{ 
                background: '#fff1f2', 
                padding: '24px', 
                borderRadius: '32px',
                border: '1px solid #fecdd3',
                boxShadow: '0 10px 30px rgba(225, 29, 72, 0.05)',
                animation: 'pulse-red 2s infinite'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#e11d48', color: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}>
                    <AlertCircle size={18} />
                  </div>
                  <h3 style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 950, 
                    color: '#9f1239', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em', 
                    margin: 0 
                  }}>
                    Hilfe benötigt!
                  </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {helpRequests.map(req => {
                    const reqUser = Array.isArray(req.users) ? req.users[0] : req.users;
                    return (
                      <div key={req.id} style={{ 
                        background: 'white', 
                        padding: '16px', 
                        borderRadius: '24px', 
                        border: '1px solid #fecdd3',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #fff1f2' }}>
                          <AvatarImage src={reqUser?.photo_url} user={reqUser} activePlatform={activePlatform} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#1e293b' }}>{reqUser?.first_name}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#e11d48' }}>Station {(stations.find(s => s.id === req.station_id)?.name || '').replace('iPad ', '')}</div>
                        </div>
                        <button 
                          onClick={() => handleResolveHelp(req.id)}
                          style={{ 
                            background: '#f1f5f9', color: '#64748b', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bandprobe Vorschläge Widget */}
            {rehearsalSuggestions.length > 0 && (
              <div className="card" style={{ 
                padding: '24px', 
                background: 'linear-gradient(135deg, #e6f4ea 0%, #f0fdfa 100%)', 
                border: '1px solid #e6f4ea',
                borderRadius: '32px',
                boxShadow: '0 10px 30px rgba(52, 168, 83, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#34a853', color: 'white', padding: '8px', borderRadius: '10px' }}>
                    <Clock size={18} />
                  </div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 1000, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Bandprobe Vorschläge</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rehearsalSuggestions.map((s, idx) => (
                    <div key={idx} style={{ 
                      background: 'rgba(255,255,255,0.6)', 
                      padding: '8px 12px', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(52, 168, 83, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#34a853', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{s.bandName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 950, 
                          color: s.count === (s.totalMembers || s.count) ? '#34a853' : '#a16207',
                          background: s.count === (s.totalMembers || s.count) ? '#e6f4ea' : '#fef9c3',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          {s.count === (s.totalMembers || s.count) ? '🔥 100%' : `👥 ${s.count}/${s.totalMembers || s.count}`}
                        </span>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {s.day.slice(0, 2)} {s.start}-{s.end}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Band-Matching Section */}
            <div className="card" style={{ 
               padding: '24px', 
               background: 'linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)', 
               border: '1px solid #fef3c7',
               borderRadius: '32px',
               boxShadow: '0 10px 30px rgba(234, 179, 8, 0.05)'
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#eab308', color: '#0f172a', padding: '8px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)' }}>
                    <Zap size={18} color="#0f172a" fill="#0f172a" />
                  </div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 1000, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Band-Matching</h3>
                </div>
               
                {wallSongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                     {wallSongs.map((form: any, fIdx: number) => {
                       const instReq = form.song?.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
                       
                       const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
                       const colors: Record<string, string> = {
                         'E-Gitarre': '#ef4444',
                         'E-Drums': '#3b82f6',
                         'E-Piano': '#a855f7',
                         'E-Bass': '#f59e0b'
                       };

                       const allRequired: { instrument: string; part: number }[] = [];
                       order.forEach(instName => {
                         const count = instReq[instName] || 0;
                         for(let i=0; i < count; i++) {
                           allRequired.push({ instrument: instName, part: i + 1 });
                         }
                       });

                       const getIcon = (inst: string) => {
                         return renderInstrumentIcon(inst);
                       };

                       return (
                          <div key={form.id} 
                            onClick={() => {
                              if (viewMode === 'student' && onTabChange) {
                                onTabChange('matching');
                              }
                            }}
                            style={{ 
                              background: 'white', 
                              padding: '20px', 
                              borderRadius: '24px', 
                              boxShadow: '0 4px 15px rgba(180, 83, 9, 0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                              position: 'relative',
                              border: '1px solid rgba(254, 243, 199, 0.4)',
                              cursor: viewMode === 'student' ? 'pointer' : 'default',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            
                            
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ 
                                  fontWeight: 1000, 
                                  fontSize: '1.1rem', 
                                  color: '#0f172a', 
                                  lineHeight: 1.1,
                                  margin: '0 0 4px 0',
                                  letterSpacing: '-0.02em'
                                }}>
                                  {form.song?.title}
                                </h4>
                                <div style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 800, 
                                  color: '#94a3b8', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.05em'
                                }}>
                                  {form.song?.artist}
                                </div>
                              </div>
                              <div style={{ 
                                background: '#fefce8', 
                                color: '#854d0e', 
                                padding: '4px 8px', 
                                borderRadius: '8px', 
                                fontSize: '0.6rem', 
                                fontWeight: 1000,
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                lineHeight: 1.1
                              }}>
                                BAND<br/>#{fIdx + 1}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
                              {allRequired.map((item, idx) => {
                                const inst = item.instrument;
                                const part = item.part;
                                
                                // Accurate instrument-based and part-based fill check
                                const isFilled = form.members.some((m: any) => {
                                  const normM = normalizeInstrument(m.instrument);
                                  const normTarget = normalizeInstrument(inst);
                                  const mPart = m.part_number || 1;
                                  return normM === normTarget && mPart === part;
                                });
                                
                                const color = colors[inst] || '#34a853';
                                
                                return (
                                  <div key={idx} style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    borderRadius: '12px', 
                                    border: isFilled ? `2px solid ${color}` : '2px dashed #e2e8f0',
                                    background: isFilled ? `${color}08` : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    position: 'relative'
                                  }}>
                                    <span style={{ opacity: isFilled ? 1 : 0.2 }}>{getIcon(inst)}</span>
                                    {!isFilled && (
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '14px', height: '1.5px', background: '#cbd5e1', transform: 'rotate(45deg)', position: 'absolute' }} />
                                        <div style={{ width: '14px', height: '1.5px', background: '#cbd5e1', transform: 'rotate(-45deg)', position: 'absolute' }} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {form.missingInstruments.length > 0 ? (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 1000, 
                                color: '#eab308', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em'
                              }}>
                                GESUCHT: {form.missingInstruments.join(', ').toUpperCase()}
                              </div>
                            ) : (
                             (() => {
                               const mySlot = viewMode === 'student' && form.members?.find((m: any) => m.user_id === userId);
                               if (mySlot) {
                                 return (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (onFoundBand) {
                                         onFoundBand(form, mySlot);
                                       }
                                     }}
                                     className="hero-cta-artistic"
                                     style={{
                                       width: '100%',
                                       background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                                       border: 'none',
                                       padding: '8px 16px',
                                       borderRadius: '12px',
                                       fontSize: '0.8rem',
                                       fontWeight: 900,
                                       color: 'white',
                                       cursor: 'pointer',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       gap: '6px',
                                       boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)',
                                       transition: 'all 0.2s',
                                       marginTop: '8px'
                                     }}
                                   >
                                     <Zap size={14} fill="white" /> JETZT BAND GRÜNDEN 🚀
                                   </button>
                                 );
                               }
                               return (
                                 <div style={{ 
                                   fontSize: '0.75rem', 
                                   fontWeight: 1000, 
                                   color: '#34a853', 
                                   textTransform: 'uppercase',
                                   letterSpacing: '0.08em',
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '6px'
                                 }}>
                                   <span>✨</span> BEREIT FÜR BAND-GRÜNDUNG! 🎸
                                 </div>
                               );
                             })()
                            )}
                          </div>
                       );
                     })}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    background: 'white', 
                    borderRadius: '24px',
                    border: '1px solid rgba(254, 243, 199, 0.4)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
                      <Hourglass size={32} />
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Keine passenden<br/>Formationen
                    </div>
                  </div>
                )}
              </div>



            {/* Band News */}
            {unreadShouts.length > 0 && (
              <div className="glass-panel" style={{ 
                background: '#f1f5f9', // Clean app-surface background
                padding: '24px', 
                borderRadius: '32px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)', flexShrink: 0 }}>
                      <Bell size={18} />
                    </div>
                    <h3 style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 950, 
                      color: '#1e293b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em', 
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Band News
                    </h3>
                  </div>
                  {unreadShouts.length > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      style={{ 
                        background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '12px', 
                        fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)', transition: 'all 0.2s'
                      }}
                      
                      
                    >
                      Alle lesen
                    </button>
                  )}
                </div>
                {unreadShouts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {unreadShouts.slice(0, 5).map(shout => (
                      <div key={shout.id} className="animation-slide-up" style={{ 
                        background: 'white', 
                        padding: '20px', 
                        borderRadius: '24px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                            <img src={shout.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: 950, 
                              fontSize: '0.9rem', 
                              color: '#1e293b', 
                              lineHeight: 1.1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {shout.users?.first_name}
                            </div>
                            <div style={{ 
                              fontSize: '0.6rem', 
                              fontWeight: 800, 
                              color: '#3b82f6', 
                              textTransform: 'uppercase', 
                              marginTop: '2px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap' 
                            }}>
                              {shout.bands?.name}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleMarkAsRead(shout.id)}
                            style={{ 
                              background: '#f0f9ff', color: '#3b82f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}
                            title="Gelesen"
                          >
                            <Check size={18} />
                          </button>
                        </div>
                        
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: '#334155', 
                          fontWeight: 500, 
                          lineHeight: 1.5,
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          border: '1px solid #f1f5f9',
                          position: 'relative'
                        }}>
                          {shout.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
                     Keine neuen Nachrichten
                  </div>
                )}
              </div>
            )}

            {/* Challenge Pipeline Section (Only for Admins) */}
            {viewMode === 'admin' && (
              <div className="glass-panel" style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '32px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '20px', minWidth: 0, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ background: '#f59e0b', color: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)', flexShrink: 0 }}>
                      <TrendingUp size={16} />
                    </div>
                    <h3 style={{ 
                      fontSize: '0.82rem', 
                      fontWeight: 950, 
                      color: '#1e293b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.06em', 
                      margin: 0,
                      whiteSpace: 'nowrap'
                    }}>
                      Challenge Pipeline
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowAllSubmissions(true)}
                    style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      color: '#64748b', 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                    className="hover-scale-mini"
                  >
                    Alle anzeigen <span style={{ background: '#f59e0b', color: 'white', padding: '1px 5px', borderRadius: '4px', fontSize: '0.6rem' }}>{allSubmissions.length}</span>
                  </button>
                </div>
                
                {submissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {submissions.slice(0, 5).map(sub => {
                      const studentSession = activeSessions.find(s => s.user_id === sub.user_id);
                      return (
                        <div key={sub.id} style={{ 
                          background: '#f8fafc', 
                          padding: '16px', 
                          borderRadius: '24px', 
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                              <AvatarImage src={sub.users?.photo_url} user={sub.users} activePlatform={activePlatform} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', minWidth: 0 }}>
                                <div style={{ 
                                  fontWeight: 950, 
                                  fontSize: '0.9rem', 
                                  color: '#1e293b', 
                                  lineHeight: 1.1,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {sub.users?.first_name}
                                </div>
                                {(() => {
                                  const norm = normalizeInstrument(sub.instrument);
                                  return (
                                    <div style={{ 
                                      width: '18px', height: '18px', borderRadius: '5px', 
                                      background: INSTRUMENT_COLORS[norm] || '#cbd5e1', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                      fontSize: '0.65rem', flexShrink: 0,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                      {TEACHER_INSTRUMENT_ICONS[norm] || '🎸'}
                                    </div>
                                  );
                                })()}
                                {studentSession && (
                                  <span style={{ 
                                    color: studentSession.stations?.color || '#3b82f6', 
                                    fontWeight: 900, 
                                    fontSize: '0.75rem',
                                    marginLeft: '2px',
                                    flexShrink: 0
                                  }}>
                                    • {studentSession.stations?.name}
                                  </span>
                                )}
                                <div style={{ 
                                  background: '#e2e8f0', 
                                  padding: '1px 5px', 
                                  borderRadius: '4px', 
                                  fontSize: '0.55rem', 
                                  fontWeight: 950, 
                                  color: '#475569', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '2px', 
                                  marginLeft: '4px',
                                  flexShrink: 0 
                                }}>
                                  {(sub.difficulty_level === 'original' || sub.difficulty_level === 'pro') ? '⚡ PRO' : '🚀 STARTER'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '0.65rem', 
                                  fontWeight: 800, 
                                  color: '#64748b', 
                                  textTransform: 'uppercase', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  minWidth: 0
                                }}>
                                  {sub.songs?.artist}: {sub.songs?.title}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleRejectSubmission(sub.id)}
                              style={{ 
                                flex: 1,
                                background: '#f1f5f9', 
                                color: '#64748b', 
                                border: 'none', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                fontSize: '0.7rem', 
                                fontWeight: 950, 
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Üben
                            </button>
                            <button 
                              onClick={() => handleApproveSubmission(sub.id)}
                              style={{ 
                                flex: 1,
                                background: '#34a853', 
                                color: 'white', 
                                border: 'none', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                fontSize: '0.7rem', 
                                fontWeight: 950, 
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)',
                                transition: 'all 0.2s'
                              }}
                            >
                              GO!
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#fcd34d' }}><Zap size={32} fill="#fcd34d" /></div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, lineHeight: 1.4 }}>Keine offenen Challenges. Alles unter Kontrolle!</div>
                  </div>
                )}
              </div>
            )}

            {/* Band-Repertoire Planer Widget (Dark-themed purple to match the song card!) - Reordered and hover effect removed */}
            {openProposals.length > 0 && (
              <div 
                className="glass-panel card" 
                onClick={() => setActiveTab('proposals')}
                style={{ 
                  padding: '24px', 
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0728 100%)', 
                  border: '1px solid rgba(165, 180, 252, 0.15)',
                  borderRadius: '32px',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    background: 'rgba(165, 180, 252, 0.05)', 
                    color: '#a5b4fc', 
                    padding: '12px', 
                    borderRadius: '16px',
                    border: '1px solid rgba(165, 180, 252, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Music size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                      Band-Repertoire Planer
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                        {openProposals.length > 0 ? (
                          `${openProposals.length} ${openProposals.length === 1 ? 'offener Song' : 'offene Songs'}`
                        ) : (
                          'Keine offenen Songs (Alles aktuell!)'
                        )}
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    color: '#a5b4fc', 
                    fontWeight: 900, 
                    fontSize: '0.7rem', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    background: 'rgba(165, 180, 252, 0.1)', 
                    padding: '8px 16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(165, 180, 252, 0.15)',
                    transition: 'all 0.2s'
                  }}>
                    Ansehen →
                  </div>
                </div>
              </div>
            )}

            {/* Alle Ausloggen Button (Only for Admins) */}
            {viewMode === 'admin' && (
              <button 
                onClick={async () => {
                  const studentSessions = activeSessions.filter(s => s?.users?.role !== 'teacher' && s?.users?.role !== 'admin');
                  if (studentSessions.length === 0) {
                    setToastMessage('Keine aktiven Schüler im aktuellen Raum eingeloggt.');
                    return;
                  }
                  if (window.confirm(`Möchtest du alle ${studentSessions.length} Schüler im aktuellen Raum auschecken?`)) {
                    const now = new Date().toISOString();
                    const sessionIds = studentSessions.map(s => s.id);
                    
                    const { error } = await supabase
                      .from('sessions')
                      .update({ check_out_time: now })
                      .in('id', sessionIds);
                    
                    if (error) {
                      setToastMessage('Fehler beim Ausloggen: ' + error.message);
                    } else {
                      setActiveSessions(prev => prev.filter(s => !sessionIds.includes(s.id)));
                      setToastMessage(`${sessionIds.length} Schüler erfolgreich ausgecheckt.`);
                      fetchData();
                    }
                  }
                }}
                style={{ 
                  marginTop: 'auto',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '12px', 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '24px', 
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="hover-scale"
              >
                <User size={20} color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alle Ausloggen</span>
              </button>
            )}
          </aside>

          {showKioskView && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '32px',
                width: '100%',
                maxWidth: '650px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative'
              }}>
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowKioskView(false);
                    setCheckingInStatus('idle');
                  }}
                  style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>

                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', marginBottom: '8px' }}>
                    <Monitor size={20} />
                    <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Einchecken</span>
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Wähle deine iPad-Station</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Wähle das iPad aus, an dem du dich anmelden möchtest, um dem Live-Lab beizutreten.
                  </p>
                </div>

                {/* Room Selector inside Kiosk */}
                {rooms.length > 0 && (
                  <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {rooms.map((room, idx) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: selectedRoomId === room.id ? '#6366f1' : 'rgba(0,0,0,0.1)',
                          background: selectedRoomId === room.id ? '#6366f1' : 'transparent',
                          color: selectedRoomId === room.id ? '#ffffff' : '#1e293b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s'
                        }}
                      >
                        {`${idx + 1} - ${cleanRoomName(room.name)}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Kiosk stations map */}
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1.4',
                    background: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '24px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    overflow: 'hidden',
                    padding: '16px'
                  }}
                >
                  {(() => {
                    const kioskStations = stations.filter(s => s.room_id === selectedRoomId && !s.name.toLowerCase().includes('lehrer') && !s.name.toLowerCase().includes('teacher'));
                    // Active sessions station IDs
                    const activeSessionStationIds = activeSessions.map(se => se.station_id);

                    return adjustPositions(kioskStations, 586).map((station) => {
                      const isOccupied = activeSessionStationIds.includes(station.id);
                      const posX = station.x;
                      const posY = station.y;
                      const stationColor = getStationColor(station.name, station.color);

                      return (
                        <button
                          key={station.id}
                          type="button"
                          onClick={async () => {
                            if (isOccupied) {
                              const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
                              if (!confirm) return;
                            }
                            await handleKioskStationSelect(station);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${posX}%`,
                            top: `${posY}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '72px',
                            height: '72px',
                            borderRadius: '16px',
                            border: `2px solid ${stationColor}`,
                            background: `${stationColor}15`,
                            color: '#1e293b',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
                            outline: 'none',
                            zIndex: 1,
                            opacity: isOccupied ? 0.7 : 1
                          }}
                          title={`${station.name} (${isOccupied ? 'Besetzt' : 'Frei'})`}
                        >
                          {station.instrument && (
                            <span style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
                              {station.instrument}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px', lineHeight: 1.1 }}>
                            {station.name}
                          </span>
                          {isOccupied ? (
                            <Lock size={10} style={{ color: '#ef4444', marginTop: '2px' }} />
                          ) : (
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: '#34a853',
                              border: '1px solid rgba(255,255,255,0.2)',
                              marginTop: '3px'
                            }} />
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {showKioskPinSetup && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '32px',
                width: '100%',
                maxWidth: '360px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative'
              }}>
                <button 
                  onClick={() => {
                    setShowKioskPinSetup(false);
                    setTargetKioskStation(null);
                    setCheckingInStatus('idle');
                  }}
                  style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>

                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '16px' }}>
                  <Key size={28} />
                </div>
                
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Geburtstag PIN einrichten</h3>
                <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
                  Bitte gib deinen Geburtstag (nur den Tag, z.B. 20) als PIN ein, um dich einzuloggen.
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  {[0, 1].map((idx) => (
                    <div key={idx} style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2px solid #cbd5e1',
                      background: kioskPinInput.length > idx ? '#cbd5e1' : 'transparent',
                      transition: 'all 0.15s ease'
                    }} />
                  ))}
                </div>

                {/* Keypad */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '280px',
                  margin: '20px auto 0 auto'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === 'C') {
                          setKioskPinInput('');
                        } else if (k === '⌫') {
                          setKioskPinInput(prev => prev.slice(0, -1));
                        } else {
                          if (kioskPinInput.length < 2) {
                            setKioskPinInput(prev => prev + k);
                          }
                        }
                      }}
                      style={{
                        height: '56px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    if (kioskPinInput.length !== 2) return;
                    const day = parseInt(kioskPinInput, 10);
                    if (isNaN(day) || day < 1 || day > 31) {
                      alert("Bitte gib einen gültigen Tag (01-31) ein.");
                      return;
                    }
                    
                    try {
                      setCheckingInStatus('verifying');
                      const { error: adErr } = await supabase
                        .from('activation_days')
                        .insert({ student_id: userId, day_of_birth: day });
                      if (adErr) throw adErr;

                      const { error: userErr } = await supabase
                        .from('users')
                        .update({ is_pin_activated: true })
                        .eq('id', userId);
                      if (userErr) throw userErr;

                      if (teacher) {
                        teacher.day_of_birth = day;
                        teacher.is_pin_activated = true;
                      }

                      setShowKioskPinSetup(false);
                      
                      if (targetKioskStation) {
                        await handleKioskStationSelect(targetKioskStation);
                      }
                    } catch (err: any) {
                      alert("Fehler beim Speichern: " + err.message);
                      setCheckingInStatus('error');
                    }
                  }}
                  disabled={kioskPinInput.length !== 2}
                  style={{
                    marginTop: '24px',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: kioskPinInput.length === 2 ? '#6366f1' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: kioskPinInput.length === 2 ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                >
                  Bestätigen
                </button>
              </div>
            </div>
          )}
        </div>
  );
};

export default TeacherLiveView;
