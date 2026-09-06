import React, { useState, useEffect, useRef } from 'react';
import { Check, ExternalLink, Tablet, X } from 'lucide-react';

export const getStationColor = (name: string | null | undefined, dbColor?: string | null) => {
  if (!name) return "#64748b";
  
  const isStandardIpad = /^ipad\s*\d+/i.test(name);
  if (dbColor && dbColor !== "#e5e7eb" && dbColor !== "#e2e8f0" && dbColor !== "#cbd5e1") {
    if (isStandardIpad && dbColor === "#64748b") {
      // Fall through to number-based standard color
    } else {
      return dbColor;
    }
  }

  if (name.toLowerCase().includes("lehrer")) return "#34a853"; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return "#64748b";
  const num = parseInt(matches[matches.length - 1]);
  if (num === 1 || num === 2) return "#eab308"; // Yellow
  if (num === 3 || num === 4) return "#a855f7"; // Purple
  if (num === 5 || num === 6) return "#3b82f6"; // Blue
  if (num === 7 || num === 8) return "#eab308"; // Yellow
  return "#64748b";
};

export interface AdminRoomLayoutModalProps {
  room: any;
  onClose: () => void;
  stations: any[];
  setStations: React.Dispatch<React.SetStateAction<any[]>>;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  kiosks?: any[] | null;
  supabase: any;
  activePlatform?: string;
  brandColor?: string;
}

export const AdminRoomLayoutModal: React.FC<AdminRoomLayoutModalProps> = ({
  room,
  onClose,
  stations,
  setStations,
  rooms,
  setRooms,
  kiosks = [],
  supabase,
  activePlatform = 'both',
  brandColor = '#e11d48'
}) => {
  const [customizingRoom, setCustomizingRoom] = useState<any>(room);
  const [roomWidth, setRoomWidth] = useState<number>(10.0);
  const [roomHeight, setRoomHeight] = useState<number>(8.0);
  const [roomWidthInput, setRoomWidthInput] = useState<string>('10');
  const [roomHeightInput, setRoomHeightInput] = useState<string>('8');
  const [activeEditStationId, setActiveEditStationId] = useState<string | null>(null);
  const [editingStationName, setEditingStationName] = useState<string>('');
  const [editingStationInstrument, setEditingStationInstrument] = useState<string>('');
  const [editingStationColor, setEditingStationColor] = useState<string>('#e5e7eb');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [copiedStationKioskId, setCopiedStationKioskId] = useState<string | null>(null);
  const [copiedRoomKiosk, setCopiedRoomKiosk] = useState(false);
  const [gridAppliedFeedback, setGridAppliedFeedback] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomizingRoom(room);
  }, [room]);

  if (!customizingRoom) return null;

  useEffect(() => {
    if (customizingRoom) {
      const w = customizingRoom.room_width || 10.0;
      const h = customizingRoom.room_height || 8.0;
      setRoomWidth(w);
      setRoomHeight(h);
      setRoomWidthInput(String(w));
      setRoomHeightInput(String(h));
      setActiveEditStationId(null);
    }
  }, [customizingRoom?.id]);

  useEffect(() => {
    if (customizingRoom) {
      // Check if Lehrer iPad exists for this room
      const roomStations = stations.filter(s => s.room_id === customizingRoom.id);
      const hasLehrer = roomStations.some(s => {
        const name = (s.name || '').toLowerCase();
        return name.includes('lehrer') || name.includes('teacher');
      });

      if (!hasLehrer) {
        const createMissingLehrer = async () => {
          const { data, error } = await supabase.from('stations').insert({
            room_id: customizingRoom.id,
            name: 'Lehrer iPad',
            color: '#34a853',
            instrument: 'Tablet',
            pos_x: 50,
            pos_y: 50
          }).select().single();
          
          if (!error && data) {
            setStations(prev => {
              if (prev.some(s => s.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        };
        createMissingLehrer();
      }
    }
  }, [customizingRoom?.id, stations]);

  useEffect(() => {
    if (activeEditStationId) {
      const station = stations.find(s => s.id === activeEditStationId);
      if (station) {
        setEditingStationName(station.name || '');
        setEditingStationInstrument(station.instrument || '');
        setEditingStationColor(station.color || '#e5e7eb');
      }
    } else {
      setEditingStationName('');
      setEditingStationInstrument('');
      setEditingStationColor('#e5e7eb');
    }
  }, [activeEditStationId, stations]);

  const handleAutoSaveRoomSize = async (w: number, h: number) => {
    if (!customizingRoom) return;
    setRooms(rooms.map(r => r.id === customizingRoom.id ? { ...r, room_width: w, room_height: h } : r));
    setCustomizingRoom((prev: any) => prev ? { ...prev, room_width: w, room_height: h } : null);
    await supabase
      .from('rooms')
      .update({ room_width: w, room_height: h })
      .eq('id', customizingRoom.id);
  };

  const handleSaveRoomSize = async () => {
    if (!customizingRoom) return;
    const { error } = await supabase
      .from('rooms')
      .update({ room_width: roomWidth, room_height: roomHeight })
      .eq('id', customizingRoom.id);

    if (error) {
      alert('Fehler beim Speichern der Raumgröße: ' + error.message);
    } else {
      setRooms(rooms.map(r => r.id === customizingRoom.id ? { ...r, room_width: roomWidth, room_height: roomHeight } : r));
      setCustomizingRoom({ ...customizingRoom, room_width: roomWidth, room_height: roomHeight });
      alert('Raumgröße erfolgreich gespeichert!');
    }
  };

  const handleUpdateInstrument = async (val: string) => {
    if (!activeEditStationId) return;
    setEditingStationInstrument(val);
    setStations(prev => prev.map(s => s.id === activeEditStationId ? { ...s, instrument: val } : s));
    await supabase.from('stations').update({ instrument: val }).eq('id', activeEditStationId);
  };

  const handleUpdateColor = async (val: string) => {
    if (!activeEditStationId) return;
    setEditingStationColor(val);
    setStations(prev => prev.map(s => s.id === activeEditStationId ? { ...s, color: val } : s));
    await supabase.from('stations').update({ color: val }).eq('id', activeEditStationId);
  };

  const handleSaveStationName = async () => {
    if (!activeEditStationId) return;
    setStations(prev => prev.map(s => s.id === activeEditStationId ? { ...s, name: editingStationName } : s));
    const { error } = await supabase.from('stations').update({ name: editingStationName }).eq('id', activeEditStationId);
    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleApplyDefaultGrid = async () => {
    if (!customizingRoom) return;
    const roomStations = stations.filter(s => s.room_id === customizingRoom.id);
    const updatedStations = roomStations.map(s => {
      const sName = s.name || '';
      const lowName = sName.toLowerCase();
      let pos_x = 50;
      let pos_y = 50;
      
      if (lowName.includes('lehrer') || lowName.includes('teacher')) {
        pos_x = 50;
        pos_y = 50;
      } else {
        const match = sName.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num === 1) { pos_x = 39; pos_y = 75; }
          else if (num === 2) { pos_x = 29; pos_y = 50; }
          else if (num === 3) { pos_x = 18; pos_y = 25; }
          else if (num === 4) { pos_x = 39; pos_y = 25; }
          else if (num === 5) { pos_x = 61; pos_y = 25; }
          else if (num === 6) { pos_x = 82; pos_y = 25; }
          else if (num === 7) { pos_x = 71; pos_y = 50; }
          else if (num === 8) { pos_x = 61; pos_y = 75; }
        }
      }
      return { ...s, pos_x, pos_y };
    });
    
    // Update local state
    setStations(prev => prev.map(s => {
      const updated = updatedStations.find(us => us.id === s.id);
      return updated ? updated : s;
    }));
    
    // Update Database
    for (const us of updatedStations) {
      await supabase.from('stations').update({ pos_x: us.pos_x, pos_y: us.pos_y }).eq('id', us.id);
    }
    
    setGridAppliedFeedback(true);
    setTimeout(() => setGridAppliedFeedback(false), 2500);
  };


    const roomStations = stations.filter(s => s.room_id === customizingRoom.id);
    const activeStation = stations.find(s => s.id === activeEditStationId);
    
    // Generate Kiosk URLs
    const getStationKioskUrl = (id: string) => {
      const kiosk = (kiosks || []).find(k => k.station_id === id);
      return kiosk ? `${window.location.origin}/?kiosk_token=${kiosk.secret_token}` : `${window.location.origin}/?kiosk_station_id=${id}`;
    };
    const getRoomKioskUrl = (id: string) => {
      const kiosk = (kiosks || []).find(k => k.room_id === id && !k.station_id);
      return kiosk ? `${window.location.origin}/?kiosk_token=${kiosk.secret_token}` : `${window.location.origin}/?kiosk_room_id=${id}`;
    };

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-orange {
            0%, 100% { border-color: #f97316; box-shadow: 0 0 0 0px rgba(249, 115, 22, 0.4); }
            50% { border-color: #ffedd5; box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
          }
        `}} />
        <div style={{ background: '#ffffff', width: '100%', maxWidth: '100%', borderRadius: '32px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Raum-Layout gestalten: {customizingRoom.name}</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>Bewege die iPads an ihre Plätze und konfiguriere die Instrumente.</p>
            </div>
            <button 
              onClick={() => onClose()} 
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 380px', flex: 1, overflow: 'hidden', height: '100%' }}>
            
            {/* Left: Designer Canvas */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRight: '1px solid #e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
              <div 
                ref={canvasRef}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: (roomHeight && roomHeight > 0) ? `min(100%, calc(55vh * (${roomWidth} / ${roomHeight})))` : '100%',
                  backgroundColor: '#0f172a', // Sleek architectural layout background
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                  border: '3px solid #334155',
                  borderRadius: '24px',
                  boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6), 0 10px 30px rgba(15, 23, 42, 0.1)',
                  aspectRatio: `${roomWidth} / ${roomHeight}`,
                  maxHeight: '55vh',
                  minHeight: '320px',
                  overflow: 'hidden'
                }}
              >
                {/* Center helper line */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

                {/* Station Nodes */}
                {roomStations.map(station => {
                  const isSelected = activeEditStationId === station.id;
                  const sName = station.name || '';
                  const isTeacher = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
                  
                  // Color codes: custom station color with name-based fallback
                  const instColor = getStationColor(sName, station.color);

                  const posLeft = station.pos_x !== null && station.pos_x !== undefined ? station.pos_x : 50;
                  const posTop = station.pos_y !== null && station.pos_y !== undefined ? station.pos_y : 50;
                  const isUnplaced = station.pos_x === null || station.pos_y === null;

                  return (
                    <div
                      key={station.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setActiveEditStationId(station.id);
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const rect = canvas.getBoundingClientRect();

                        let latestX = posLeft;
                        let latestY = posTop;

                        const handlePointerMove = (moveEvent: PointerEvent) => {
                          const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                          const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
                          let clampedX = Math.max(4, Math.min(96, x));
                          let clampedY = Math.max(5, Math.min(95, y));
                          
                          if (snapToGrid) {
                            clampedX = Math.round(clampedX / 5) * 5;
                            clampedY = Math.round(clampedY / 5) * 5;
                            clampedX = Math.max(5, Math.min(95, clampedX));
                            clampedY = Math.max(5, Math.min(95, clampedY));
                          }
                          
                          latestX = clampedX;
                          latestY = clampedY;
                          
                          setStations(prev => prev.map(s => s.id === station.id ? { ...s, pos_x: clampedX, pos_y: clampedY } : s));
                        };

                        const handlePointerUp = async () => {
                          window.removeEventListener('pointermove', handlePointerMove);
                          window.removeEventListener('pointerup', handlePointerUp);
                          
                          // Save final coords
                          try {
                            const finalX = Math.round(latestX * 10) / 10;
                            const finalY = Math.round(latestY * 10) / 10;
                            await supabase.from('stations').update({ pos_x: finalX, pos_y: finalY }).eq('id', station.id);
                          } catch (err) {
                            console.warn('[Station Drag] Failed to save pos:', err);
                          }
                        };

                        window.addEventListener('pointermove', handlePointerMove);
                        window.addEventListener('pointerup', handlePointerUp);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${posLeft}%`,
                        top: `${posTop}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'grab',
                        zIndex: isSelected ? 100 : 10,
                        touchAction: 'none',
                        userSelect: 'none',
                        width: 'clamp(76px, 16%, 115px)',
                        aspectRatio: '180 / 210'
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: isSelected ? `${instColor}25` : 'rgba(30, 41, 59, 0.85)',
                        backdropFilter: 'blur(4px)',
                        border: isSelected ? `2.5px solid ${instColor}` : `1.5px solid ${isUnplaced ? '#f97316' : '#475569'}`,
                        borderRadius: '20px',
                        padding: '8px',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        textAlign: 'center',
                        boxShadow: isSelected ? `0 10px 25px -5px ${instColor}50` : '0 4px 10px rgba(0,0,0,0.3)',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        animation: isUnplaced ? 'pulse-orange 2s infinite' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%', overflow: 'hidden' }}>
                          <Tablet size={12} color={instColor} style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</span>
                        </div>
                        {station.instrument && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '3px', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {station.instrument === 'E-Piano' && '🎹'}
                            {station.instrument === 'E-Drums' && '🥁'}
                            {station.instrument === 'E-Gitarre' && '🎸'}
                            {station.instrument === 'E-Bass' && '🎸'}
                            {station.instrument === 'Vocals' && '🎤'}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{station.instrument}</span>
                          </span>
                        )}
                        {isUnplaced && (
                          <span style={{ fontSize: '0.55rem', color: '#fb923c', fontWeight: 800 }}>Unplatziert</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Customization & QR Tools */}
            <div style={{ padding: '24px 32px 48px 32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
              
              {/* Section 1: Room Dimensions */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Raumgröße (Seitenverhältnis)</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Breite (Meter)</label>
                    <input 
                      type="text" 
                      value={roomWidthInput} 
                      onChange={e => {
                        const val = e.target.value;
                        setRoomWidthInput(val);
                        const parsed = parseFloat(val.replace(',', '.'));
                        if (!isNaN(parsed) && parsed >= 3 && parsed <= 30) {
                          setRoomWidth(parsed);
                          handleAutoSaveRoomSize(parsed, roomHeight);
                        }
                      }} 
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.875rem', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Höhe (Meter)</label>
                    <input 
                      type="text" 
                      value={roomHeightInput} 
                      onChange={e => {
                        const val = e.target.value;
                        setRoomHeightInput(val);
                        const parsed = parseFloat(val.replace(',', '.'));
                        if (!isNaN(parsed) && parsed >= 2 && parsed <= 30) {
                          setRoomHeight(parsed);
                          handleAutoSaveRoomSize(roomWidth, parsed);
                        }
                      }} 
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.875rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                  Änderungen werden live gespeichert
                </div>
              </div>

              {/* Section 1.5: Grid & Alignment Tools */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Raster & Symmetrie</h3>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                  <input 
                    type="checkbox" 
                    checked={snapToGrid} 
                    onChange={e => setSnapToGrid(e.target.checked)} 
                    style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: brandColor }}
                  />
                  Am Raster ausrichten (5%-Schritte)
                </label>

                <button 
                  onClick={handleApplyDefaultGrid}
                  style={{ 
                    width: '100%', 
                    background: gridAppliedFeedback ? '#f0fdf4' : '#ffffff', 
                    color: gridAppliedFeedback ? '#16a34a' : '#1e293b', 
                    border: gridAppliedFeedback ? '1.5px solid #86efac' : '1.5px solid #cbd5e1', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    fontWeight: 800, 
                    fontSize: '0.8rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px', 
                    transition: 'all 0.2s' 
                  }}
                >
                  {gridAppliedFeedback ? (
                    <>
                      <Check size={14} color="#16a34a" /> Symmetrisches Raster angewendet!
                    </>
                  ) : (
                    '✨ Symmetrisches Standard-Raster anwenden'
                  )}
                </button>
              </div>

              {/* Section 2: Selected Station Configuration */}
              {activeStation ? (
                <div style={{ background: '#ffffff', padding: '24px 20px', borderRadius: '20px', border: `1.5px solid ${brandColor}30`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: '#0f172a' }}>Konfiguration: {activeStation.name}</h3>
                    <button 
                      onClick={() => setActiveEditStationId(null)}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Station Name</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input 
                        value={editingStationName}
                        onChange={e => setEditingStationName(e.target.value)}
                        onBlur={handleSaveStationName}
                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 700 }}
                      />
                      <button onClick={handleSaveStationName} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', color: '#475569' }}>
                        Set
                      </button>
                    </div>
                  </div>

                  {/* Instrument Select */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Musikinstrument</label>
                    <select 
                      value={editingStationInstrument} 
                      onChange={e => handleUpdateInstrument(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.875rem', fontWeight: 700, background: 'white' }}
                    >
                      <option value="">-- Instrument wählen --</option>
                      <option value="E-Piano">🎹 E-Piano</option>
                      <option value="E-Drums">🥁 E-Drums</option>
                      <option value="E-Gitarre">🎸 E-Gitarre</option>
                      <option value="E-Bass">🎸 E-Bass</option>
                      <option value="Vocals">🎤 Mikrofon (Gesang)</option>
                      <option value="Tablet">📱 Tablet (Standard/Anderes)</option>
                    </select>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>iPad Rahmenfarbe</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {[
                        { hex: '#3b82f6', label: 'Blau' },
                        { hex: '#eab308', label: 'Gelb' },
                        { hex: '#64748b', label: 'Grau' },
                        { hex: '#34a853', label: 'Grün' },
                        { hex: '#a855f7', label: 'Lila' },
                        { hex: '#ef4444', label: 'Rot' }
                      ].map(colorOpt => {
                        const isColorSelected = editingStationColor === colorOpt.hex;
                        return (
                          <button
                            key={colorOpt.hex}
                            onClick={() => handleUpdateColor(colorOpt.hex)}
                            title={colorOpt.label}
                            type="button"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: colorOpt.hex,
                              border: isColorSelected ? '3px solid #0f172a' : '2px solid transparent',
                              cursor: 'pointer',
                              transform: isColorSelected ? 'scale(1.15)' : 'scale(1)',
                              boxShadow: isColorSelected 
                                ? `0 6px 12px ${colorOpt.hex}60` 
                                : '0 2px 4px rgba(0,0,0,0.06)',
                              transition: 'all 0.2s',
                              padding: 0,
                              outline: 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

                  {/* QR Code and link setup */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', alignSelf: 'flex-start' }}>iPad Kiosk Setup</span>
                    
                    <div style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '16px', background: 'white' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getStationKioskUrl(activeStation.id))}`}
                        alt="Kiosk Setup QR Code"
                        style={{ width: '180px', height: '180px', display: 'block' }}
                      />
                    </div>
                    
                    <p style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', margin: 0 }}>
                      Scanne diesen QR-Code mit der Kamera des iPads an dieser Station, um es sofort als Kiosk-Gerät zu sperren.
                    </p>

                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(getStationKioskUrl(activeStation.id));
                        setCopiedStationKioskId(activeStation.id);
                        setTimeout(() => setCopiedStationKioskId(null), 2500);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        borderRadius: '10px', 
                        border: copiedStationKioskId === activeStation.id ? '1px solid #86efac' : '1px solid #e2e8f0', 
                        background: copiedStationKioskId === activeStation.id ? '#f0fdf4' : '#f8fafc', 
                        color: copiedStationKioskId === activeStation.id ? '#16a34a' : '#475569', 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {copiedStationKioskId === activeStation.id ? (
                        <>
                          <Check size={14} color="#16a34a" /> Setup-Link kopiert!
                        </>
                      ) : (
                        <>
                          <ExternalLink size={12} /> Setup-Link kopieren
                        </>
                      )}
                    </button>
                  </div>

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #cbd5e1', borderRadius: '20px', color: '#94a3b8', textAlign: 'center' }}>
                  <Tablet size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Kein iPad ausgewählt</span>
                  <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Tippe auf ein iPad auf der Karte links, um es zu konfigurieren oder den Kiosk-QR-Code anzuzeigen.</span>
                </div>
              )}

              {/* Room Kiosk Link */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Allgemeiner Raum-Kiosk Link</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
                  Nutze diesen Link auf einem Kiosk-iPad, wenn du den Raum-Plan aufrufen möchtest, um die Station manuell auszuwählen.
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(getRoomKioskUrl(customizingRoom.id));
                    setCopiedRoomKiosk(true);
                    setTimeout(() => setCopiedRoomKiosk(false), 2500);
                  }}
                  style={{ 
                    background: copiedRoomKiosk ? '#f0fdf4' : '#ffffff', 
                    border: copiedRoomKiosk ? '1px solid #86efac' : '1px solid #e2e8f0', 
                    padding: '10px', 
                    borderRadius: '10px', 
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    color: copiedRoomKiosk ? '#16a34a' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {copiedRoomKiosk ? (
                    <>
                      <Check size={14} color="#16a34a" /> Raum-Kiosk Link kopiert!
                    </>
                  ) : (
                    'Raum-Kiosk Link kopieren'
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button 
              onClick={() => onClose()}
              style={{ 
                background: brandColor, 
                color: activePlatform === 'groovelab' ? '#1e293b' : 'white', 
                border: 'none', 
                padding: '12px 32px', 
                borderRadius: '16px', 
                fontWeight: 800, 
                fontSize: '0.9rem', 
                cursor: 'pointer', 
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)', 
                transition: 'all 0.2s' 
              }}
            >
              Speichern & Schließen
            </button>
          </div>

        </div>
      </div>
    );
};

export default AdminRoomLayoutModal;
