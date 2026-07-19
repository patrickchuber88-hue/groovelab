import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet, X, ShieldCheck, FileText } from 'lucide-react';
import { generateConsentPDF } from '../utils/pdfGenerator';

interface DeviceSetupScreenProps {
  school?: any;
  admin?: any;
  brandColor?: string;
  onUpdate?: () => void;
}

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

export function DeviceSetupScreen({
  school,
  admin,
  brandColor = '#eab308',
  onUpdate
}: DeviceSetupScreenProps = {}) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [setupTab, setSetupTab] = useState<'device' | 'datenschutz'>('device');
  const [stations, setStations] = useState<any[]>([]);
  const [activeStationIds, setActiveStationIds] = useState<string[]>([]);
  const [busySessions, setBusySessions] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secret Master Admin click combo state
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Reset logo clicks after 3 seconds of inactivity
  React.useEffect(() => {
    if (logoClicks > 0) {
      const timer = setTimeout(() => setLogoClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoClicks]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsernameInput.trim() || !adminPasswordInput.trim()) return;
    try {
      setAdminLoginLoading(true);
      setLoginError(null);
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('is_master_admin', true)
        .eq('master_admin_username', adminUsernameInput.trim())
        .eq('master_admin_password', adminPasswordInput.trim())
        .maybeSingle();

      if (userErr || !user) {
        throw new Error('Ungültige Master-Admin Anmeldedaten.');
      }

      console.log('[Setup] Master Admin logged in from Device Setup.');
      
      // Clean inputs
      setAdminUsernameInput('');
      setAdminPasswordInput('');
      setShowAdminModal(false);

      // Finalize login (reload to activate Master Admin Dashboard)
      sessionStorage.setItem('groovelab_user_id', user.id);
      localStorage.setItem('groovelab_location_mode', 'home');
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setAdminLoginLoading(false);
    }
  };


  React.useEffect(() => {
    const controller = new AbortController();
    fetchData(0, controller.signal);
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kioskRoomId = params.get('kiosk_room_id');
    if (kioskRoomId && rooms.some(r => r.id === kioskRoomId)) {
      setSelectedRoomId(kioskRoomId);
    }
  }, [rooms]);

  const [containerWidth, setContainerWidth] = React.useState(600);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const containerRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width || 600);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const fetchData = async (retryCount = 0, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[Setup] Fetching school data and stations in parallel (Attempt ${retryCount + 1})...`);
      
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      // Resolve school_id to filter rooms and stations by school
      const params = new URLSearchParams(window.location.search);
      const kioskRoomId = params.get('kiosk_room_id');
      const urlSchoolId = params.get('school_id') || params.get('invite_school_id');
      let targetSchoolId = urlSchoolId || null;

      if (!targetSchoolId && kioskRoomId) {
        const { data: roomInfo } = await supabase
          .from('rooms')
          .select('school_id')
          .eq('id', kioskRoomId)
          .maybeSingle();
        if (roomInfo) {
          targetSchoolId = roomInfo.school_id;
        }
      }

      if (!targetSchoolId) {
        const storedUserId = sessionStorage.getItem('groovelab_user_id');
        if (storedUserId) {
          const { data: userInfo } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', storedUserId)
            .maybeSingle();
          if (userInfo) {
            targetSchoolId = userInfo.school_id;
          }
        }
      }

      if (!targetSchoolId) {
        targetSchoolId = localStorage.getItem('groovelab_school_id');
      }

      // Default fallback to the primary school ID
      if (!targetSchoolId) {
        targetSchoolId = '11111111-1111-1111-1111-111111111111';
      }

      // Persist the resolved school ID to localStorage for stability
      localStorage.setItem('groovelab_school_id', targetSchoolId);

      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      let roomsQuery = supabase.from('rooms').select('*').order('sort_order', { ascending: true });
      if (activePlatform === 'campus') {
        roomsQuery = roomsQuery.eq('is_campus_active', true);
      } else {
        roomsQuery = roomsQuery.eq('is_groovelab_active', true);
      }
      if (targetSchoolId) {
        roomsQuery = roomsQuery.eq('school_id', targetSchoolId);
      }

      const [roomsRes, stationsRes, sessionsRes] = await Promise.all([
        roomsQuery,
        supabase.from('stations').select('*').order('name'),
        supabase.from('sessions')
          .select('id, station_id, user_id, last_seen, users(first_name, last_name)')
          .is('check_out_time', null)
          .gt('last_seen', tenMinsAgo)
      ]);

      if (signal?.aborted) return;
      
      if (roomsRes.error && retryCount < 1 && roomsRes.error.message?.includes('Lock')) {
        setTimeout(() => fetchData(retryCount + 1, signal), 500);
        return;
      }

      let finalRooms = roomsRes.data || [];
      if (finalRooms.length === 0) {
        console.warn('[Setup] No rooms found in DB. Using stable fallback room.');
        finalRooms = [{
          id: '22222222-2222-2222-2222-222222222222',
          school_id: '11111111-1111-1111-1111-111111111111',
          name: 'Groovelab'
        }];
      }

      setRooms(finalRooms);
      
      const firstRoomId = finalRooms[0]?.id || '22222222-2222-2222-2222-222222222222';
      setSelectedRoomId(prev => prev || firstRoomId);

      const roomIds = finalRooms.map(r => r.id);
      let finalStations = (stationsRes.data || []).filter(s => roomIds.includes(s.room_id));
      if (finalStations.length === 0) {
        console.warn('[Setup] No stations found in DB. Using stable fallback stations.');
        finalStations = [
          { id: '33333333-3333-3333-3333-333333333331', name: 'iPad 1', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333332', name: 'iPad 2', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333333', name: 'iPad 3', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333334', name: 'iPad 4', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333335', name: 'iPad 5', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333336', name: 'iPad 6', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333337', name: 'iPad 7', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333338', name: 'iPad 8', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333339', name: 'Lehrer iPad', room_id: firstRoomId }
        ];
      }
      
      setStations(finalStations);

      if (sessionsRes.error) {
        console.error('Error fetching sessions:', sessionsRes.error);
      } else if (sessionsRes.data) {
        setActiveStationIds(sessionsRes.data.map(s => s.station_id));
        setBusySessions(sessionsRes.data);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Unexpected setup error:', err);
      setError(`Ein unerwarteter Fehler ist aufgetreten: ${err.message}`);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleSelectStation = async (stationId: string) => {
    if (loading) return;
    const busySession = busySessions.find(s => s.station_id === stationId);
    if (busySession) {
      const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
      if (!confirm) return;
      
      // Alte Sitzung beenden
      await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', busySession.id);
    }

    sessionStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_location_mode');
    localStorage.setItem('groovelab_station_id', stationId);
    
    // Clean up URL parameters by redirecting to base path
    const newUrl = window.location.origin + window.location.pathname;
    window.location.replace(newUrl);
  };

  const handleSkip = () => {
    localStorage.setItem('groovelab_station_id', 'skip');
    // Clean up URL parameters by redirecting to base path
    const newUrl = window.location.origin + window.location.pathname;
    window.location.replace(newUrl);
  };

  return (
    <div className="app-container flex-center" style={{ flexDirection: 'column', padding: '40px 20px', textAlign: 'center', background: '#f9fafb' }}>
      <div className="school-logo" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 24, boxShadow: '0 8px 24px rgba(234, 179, 8, 0.2)' }}>
        <Music size={40} />
      </div>
      <h1 
        onClick={() => {
          setLogoClicks(prev => {
            const next = prev + 1;
            if (next >= 5) {
              setShowAdminModal(true);
              return 0;
            }
            return next;
          });
        }}
        style={{ fontSize: '1.5rem', marginBottom: '8px', cursor: 'default', userSelect: 'none' }}
      >
        {setupTab === 'device' ? 'Geräte-Setup' : 'Datenschutz & Rechtliches'}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.875rem', maxWidth: '400px' }}>
        {setupTab === 'device' 
          ? 'Weise diesem Gerät eine feste Nummer zu, um es als Schüler-Terminal zu nutzen.'
          : 'AVV-Status einsehen und Unterlagen zur Schüler-Einwilligung herunterladen.'}
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '32px', background: 'white', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Tab-Bar */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e2e8f0', 
          marginBottom: '8px', 
          gap: '24px',
          paddingBottom: '12px'
        }}>
          {[
            { id: 'device', label: 'Geräte-Setup' },
            { id: 'datenschutz', label: 'Datenschutz & AVV' }
          ].map((tab) => {
            const isSelected = setupTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSetupTab(tab.id as any)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isSelected ? `3px solid ${brandColor}` : '3px solid transparent',
                  color: isSelected ? '#1e293b' : '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  padding: '4px 8px 8px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-13px'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.875rem', padding: '12px', background: '#fef2f2', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>{error}</span>
            <button 
              onClick={() => fetchData()} 
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'center' }}
            >
              Erneut versuchen
            </button>
          </div>
        )}
        
        {setupTab === 'device' ? (
          <>
            <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Raum auswählen</label>
          <div style={{ display: 'inline-flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px', flexWrap: 'wrap' }}>
            {rooms.map((room, idx) => {
              const isSelected = room.id === selectedRoomId;
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  style={{
                    border: 'none',
                    background: isSelected ? 'white' : 'transparent',
                    color: isSelected ? '#1e293b' : '#64748b',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s ease'
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
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>iPad auswählen</label>
          {(() => {
            const activeRoom = rooms.find(r => r.id === selectedRoomId);
            const currentRoomStations = stations.filter(s => s.room_id === (activeRoom ? selectedRoomId : rooms[0]?.id));
            
            if (currentRoomStations.length === 0) {
              return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Keine iPads in diesem Raum gefunden.</div>;
            }

            const hasCustomLayout = activeRoom && 
              activeRoom.room_width && 
              activeRoom.room_height && 
              currentRoomStations.some(s => s.pos_x !== null && s.pos_y !== null);

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
              if (lowerName.includes('lehrer')) return '#34a853'; // Green
              const matches = name.match(/\d+/g);
              if (!matches) return '#64748b';
              const num = parseInt(matches[matches.length - 1]);
              if (num === 1 || num === 2) return '#eab308'; // Yellow
              if (num === 3 || num === 4) return '#a855f7'; // Purple
              if (num === 5 || num === 6) return '#3b82f6'; // Blue
              if (num === 7 || num === 8) return '#eab308'; // Yellow
              return '#64748b';
            };

            if (hasCustomLayout) {
              const placedStations = currentRoomStations.filter(s => s.pos_x !== null && s.pos_y !== null);
              const minX = placedStations.length > 0 ? Math.min(...placedStations.map(s => s.pos_x as number)) : 0;
              const maxX = placedStations.length > 0 ? Math.max(...placedStations.map(s => s.pos_x as number)) : 100;
              const minY = placedStations.length > 0 ? Math.min(...placedStations.map(s => s.pos_y as number)) : 0;
              const maxY = placedStations.length > 0 ? Math.max(...placedStations.map(s => s.pos_y as number)) : 100;

              // 14% horizontal / 14% vertical padding to create standard spacing and edge margins
              const padX = 14;
              const padY = 14;

              const viewportMinX = Math.max(0, minX - padX);
              const viewportMaxX = Math.min(100, maxX + padX);
              const viewportMinY = Math.max(0, minY - padY);
              const viewportMaxY = Math.min(100, maxY + padY);

              const viewportWidth = viewportMaxX - viewportMinX;
              const viewportHeight = viewportMaxY - viewportMinY;

              const safeViewportWidth = Math.max(15, viewportWidth);
              const safeViewportHeight = Math.max(15, viewportHeight);

              const croppedAspectRatio = 1.5;

              // Calculate resolved collision-free coordinates inside the 600px canvas space
              const canvasWidth = 600;
              const canvasHeight = 400;

              // Uniform scaling to preserve room layout's aspect ratio and center it in the 600x400 card
              const scaleX = canvasWidth / safeViewportWidth;
              const scaleY = canvasHeight / safeViewportHeight;
              const scale = Math.min(scaleX, scaleY);
              const offsetX = (canvasWidth - safeViewportWidth * scale) / 2;
              const offsetY = (canvasHeight - safeViewportHeight * scale) / 2;

              // Prepare raw elements
              const rawItems = currentRoomStations.map(s => {
                const sName = s.name || '';
                const isTeacherStation = sName.toLowerCase().includes('lehrer');
                const posLeftOriginal = s.pos_x !== null ? s.pos_x : 50;
                const posTopOriginal = s.pos_y !== null ? s.pos_y : 50;

                const x = offsetX + (posLeftOriginal - viewportMinX) * scale;
                const y = offsetY + (posTopOriginal - viewportMinY) * scale;

                const w = 100;
                const h = 110;

                return {
                  id: s.id,
                  station: s,
                  isTeacherStation,
                  x,
                  y,
                  w,
                  h
                };
              });

              // Helper to clamp a single item to canvas margins
              const clampItem = (item: any) => {
                const marginX = item.w / 2 + 6;
                const marginY = item.h / 2 + 6;
                item.x = Math.max(marginX, Math.min(canvasWidth - marginX, item.x));
                item.y = Math.max(marginY, Math.min(canvasHeight - marginY, item.y));
              };

              // Resolve overlaps using a relaxation loop
              const resolvedItems = [...rawItems];
              // Pre-clamp raw items to bounds before relaxation
              resolvedItems.forEach(clampItem);

              for (let iter = 0; iter < 25; iter++) {
                let moved = false;
                for (let i = 0; i < resolvedItems.length; i++) {
                  for (let j = i + 1; j < resolvedItems.length; j++) {
                    const a = resolvedItems[i];
                    const b = resolvedItems[j];

                    // Gap of 8px to prevent them touching too closely
                    const hWidth = (a.w + b.w) / 2 + 8;
                    const hHeight = (a.h + b.h) / 2 + 8;
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    if (absDx < hWidth && absDy < hHeight) {
                      moved = true;
                      const overlapX = hWidth - absDx;
                      const overlapY = hHeight - absDy;

                      if (overlapX < overlapY) {
                        const pushX = overlapX / 2;
                        const sign = dx >= 0 ? 1 : -1;
                        b.x += pushX * sign;
                        a.x -= pushX * sign;
                      } else {
                        const pushY = overlapY / 2;
                        const sign = dy >= 0 ? 1 : -1;
                        b.y += pushY * sign;
                        a.y -= pushY * sign;
                      }

                      // Clamp immediately inside the loop after pushing
                      clampItem(a);
                      clampItem(b);
                    }
                  }
                }
                if (!moved) break;
              }

              // Constrain back to canvas margins
              const finalPositions = new Map<string, { x: number; y: number }>();
              resolvedItems.forEach(item => {
                finalPositions.set(item.station.id, { x: item.x, y: item.y });
              });

              return (
                <div 
                  ref={containerRef} 
                  style={{ 
                    width: '100%', 
                    position: 'relative', 
                    overflow: 'hidden',
                    borderRadius: '24px',
                    border: '1.5px solid #f1f5f9',
                    backgroundColor: '#ffffff',
                    aspectRatio: `${croppedAspectRatio}`
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '600px',
                    height: `${600 * (1 / croppedAspectRatio)}px`,
                    transform: `scale(${containerWidth / 600})`,
                    transformOrigin: 'top left',
                    overflow: 'hidden'
                  }}>
                    {resolvedItems.map(item => {
                      const { station: s, isTeacherStation } = item;
                      const sName = s.name || '';
                      const isActive = !isTeacherStation && activeStationIds.includes(s.id);
                     const sColor = getStationColor(sName, s.color);

                      const pos = finalPositions.get(s.id) || { x: item.x, y: item.y };

                      return (
                        <button
                          key={s.id}
                          onClick={() => handleSelectStation(s.id)}
                          style={{
                            position: 'absolute',
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                            transform: 'translate(-50%, -50%)',
                            width: '100%',
                            maxWidth: '100px',
                            padding: '12px 4px',
                            borderRadius: '16px',
                            border: '2px solid',
                            borderColor: isActive ? '#ef4444' : (sColor + '40'),
                            background: isActive ? '#fef2f2' : (isTeacherStation ? '#e6f4ea' : 'white'),
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            zIndex: isTeacherStation ? 100 : 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sColor, marginBottom: '4px', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                          <Tablet size={20} color={isActive ? '#ef4444' : sColor} />
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{sName}</div>
                          {isActive && (
                            <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>
                              BESETZT
                            </div>
                          )}
                          {isTeacherStation && !isActive && <div style={{ fontSize: '0.5rem', color: '#34a853', fontWeight: 800 }}>LEHRER</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Fallback to default grid
            const renderStation = (idOrNum: number | 'lehrer', gridCol: string, gridRow: string) => {
              const s = currentRoomStations.find(st => {
                const stName = st.name || '';
                if (idOrNum === 'lehrer') return stName.toLowerCase().includes('lehrer');
                const match = stName.match(/\d+/);
                return match && parseInt(match[0]) === idOrNum;
              });
              
              if (!s) return null;

              const sName = s.name || '';
              const isTeacherStation = sName.toLowerCase().includes('lehrer');
              const isActive = !isTeacherStation && activeStationIds.includes(s.id);
              const sColor = getStationColor(sName, s.color);

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectStation(s.id)}
                  style={{
                    gridColumn: gridCol,
                    gridRow: gridRow,
                    padding: '12px 6px',
                    borderRadius: '16px',
                    border: '2px solid',
                    borderColor: isActive ? '#ef4444' : (sColor + '40'),
                    background: isActive ? '#fef2f2' : (isTeacherStation ? '#e6f4ea' : 'white'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: 1
                  }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sColor, marginBottom: '4px', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                  <Tablet size={20} color={isActive ? '#ef4444' : sColor} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{sName}</div>
                  {isActive && (
                    <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>
                      BESETZT
                    </div>
                  )}
                  {isTeacherStation && !isActive && <div style={{ fontSize: '0.5rem', color: '#34a853', fontWeight: 800 }}>LEHRER</div>}
                </button>
              );
            };

            const extraStations = currentRoomStations.filter(st => {
              const stName = st.name || '';
              const low = stName.toLowerCase();
              if (low.includes('lehrer')) return false;
              const match = stName.match(/\d+/);
              if (match && parseInt(match[0]) >= 1 && parseInt(match[0]) <= 8) return false;
              return true;
            });

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '4px', width: '100%' }}>
                {renderStation(3, '1', '1')}
                {renderStation(4, '2', '1')}
                {renderStation(5, '3', '1')}
                {renderStation(6, '4', '1')}
                
                {renderStation(2, '1', '2')}
                {renderStation('lehrer', '2 / span 2', '2')}
                {renderStation(7, '4', '2')}
                
                {renderStation(1, '1', '3')}
                {renderStation(8, '4', '3')}

                {extraStations.map(s => {
                  const isActive = activeStationIds.includes(s.id);
                  const sColor = '#64748b';
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStation(s.id)}
                      style={{
                        gridColumn: 'span 1',
                        padding: '12px 6px',
                        borderRadius: '16px',
                        border: '2px solid',
                        borderColor: isActive ? '#ef4444' : (sColor + '40'),
                        background: isActive ? '#fef2f2' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sColor, marginBottom: '4px', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                      <Tablet size={20} color={isActive ? '#ef4444' : sColor} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={handleSkip} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Setup überspringen (nur Home-Mode)
          </button>
        </div>
      </>
    ) : (
      <>
        {/* Datenschutz & AVV tab content for GrooveLab settings */}
        <div style={{ 
          color: '#854d0e', 
          background: '#fefce8', 
          padding: '16px', 
          borderRadius: '16px', 
          fontSize: '0.78rem', 
          lineHeight: '1.45', 
          border: '1px solid #fef08a', 
          textAlign: 'left' 
        }}>
          <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>Rechtssicherer Pilotbetrieb</strong>
          <div style={{ marginTop: '4px' }}>
            Um den gesetzlichen Anforderungen an Schulsoftware gerecht zu werden, müssen vor dem Eintragen von Schülernamen (nur Vorname + erster Buchstabe Nachname) die Einverständniserklärungen der Erziehungsberechtigten vorliegen. Nutze dafür unser vorbereitetes Infoblatt.
          </div>
        </div>

        {/* Download Card */}
        <div style={{ 
          background: '#fefce8', 
          border: '1px solid #fef08a', 
          borderRadius: '16px', 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '12px',
          textAlign: 'left'
        }}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '0.84rem', color: '#854d0e', display: 'block', marginBottom: '2px' }}>Eltern-Information &amp; Einwilligung (Vorlage)</strong>
            <span style={{ fontSize: '0.72rem', color: '#a16207', display: 'block' }}>Rechtssichere Vorlage als PDF-Datei zum Ausdrucken und Unterschreiben.</span>
          </div>
          <button 
            onClick={() => {
              const effectiveSchool = Array.isArray(school) ? school[0] : school;
              const schoolName = effectiveSchool?.name || admin?.schoolName || 'Meine Musikschule';
              
              const hasCampus = effectiveSchool?.has_campus_subscription ?? false;
              const hasGroove = effectiveSchool?.has_groovelab_subscription ?? false;
              const activePlat = (!hasCampus && hasGroove) ? 'groovelab' : (hasCampus && !hasGroove) ? 'campus' : 'both';
              
              generateConsentPDF(schoolName, activePlat, effectiveSchool?.student_billing_option);
            }}
            style={{ 
              padding: '8px 16px',
              background: brandColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 2px 4px rgba(234, 179, 8, 0.2)`,
              transition: 'transform 0.15s'
            }}
            className="hover-scale"
          >
            Download
          </button>
        </div>

        {/* AVV Card */}
        <div style={{ 
          background: '#e6f4ea', 
          border: '1px solid #a7f3d0', 
          borderRadius: '16px', 
          padding: '16px', 
          fontSize: '0.76rem',
          color: '#34a853',
          lineHeight: '1.45',
          textAlign: 'left'
        }}>
          <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px', color: '#34a853' }}>Auftragsverarbeitungsvereinbarung (AVV)</strong>
          Der AVV nach Art. 28 DSGVO (inkl. Hetzner Falkenstein Server-Hosting) wurde für deine Schule während der Pilotphasen-Freischaltung digital gezeichnet.
        </div>
      </>
    )}
  </div>

      {/* Hidden Master Admin Credentials Login Modal */}
      {showAdminModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '440px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box'
          }}>
            <button 
              onClick={() => {
                setShowAdminModal(false);
                setAdminUsernameInput('');
                setAdminPasswordInput('');
                setLoginError(null);
              }} 
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
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a', textAlign: 'left' }}>Master-Admin Login</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>GrooveLab Master Administration</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Benutzername
                </label>
                <input
                  type="text"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="z.B. admin"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Passwort
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              {loginError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoginLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px'
                }}
                
                
              >
                {adminLoginLoading ? 'Verifiziere...' : 'Einloggen'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
