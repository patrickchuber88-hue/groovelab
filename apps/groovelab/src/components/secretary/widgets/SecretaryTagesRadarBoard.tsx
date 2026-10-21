/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Secretary Tages-Radar Board
 * SecretaryTagesRadarBoard.tsx
 * 
 * Zentrales operatives Leitstand-Board für das Schulsekretariat.
 * Zeigt die Belegung aller Räume im ergonomischen 3x5-Raster (bis zu 15 Räume)
 * mit Belegungs-Pillen, Zeitkontext und visueller Mini-Tages-Timeline (08–20 Uhr).
 * 
 * Barrierefreiheit & Design-Tokens:
 * - WCAG 2.2 AA Parität mit scharfem Kontrast & Tastaturnavigation
 * - Apple Squircle Radien & Unifarben-Kontur-Axiom
 */

import React from 'react';
import { Calendar, DoorOpen, BookOpen } from 'lucide-react';

export interface SecretaryTagesRadarBoardProps {
  rooms: any[];
  buildings?: any[];
  todayAllocations: any[];
  todayTeachersCount: number;
  todayDayNum: number;
  simulatedToday?: string;
  userMap?: Record<string, string>;
  setRoomsSubView?: (view: 'overview' | 'settings' | 'plan') => void;
  setRoomSearchQuery?: (query: string) => void;
  setActiveTab: (tab: string) => void;
  setSecretarySubTab: (subTab: string) => void;
  fetchLogbookBookings: () => void;
  setShowLogbookModal: (show: boolean) => void;
}

export const SecretaryTagesRadarBoard: React.FC<SecretaryTagesRadarBoardProps> = ({
  rooms,
  buildings = [],
  todayAllocations,
  todayTeachersCount,
  todayDayNum,
  simulatedToday,
  userMap = {},
  setRoomsSubView,
  setRoomSearchQuery,
  setActiveTab,
  setSecretarySubTab,
  fetchLogbookBookings,
  setShowLogbookModal
}) => {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = days[todayDayNum === 7 ? 0 : todayDayNum] || 'Heute';

  // Aktiver Gebäude-Filter ('all' | buildingId | 'unassigned')
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<string>('all');

  // Reale Gebäude (Zero-Dummy: nur echte DB-Einträge mit id und name)
  const validBuildings = React.useMemo(() => {
    return (buildings || []).filter((b: any) => b && b.id && b.name && typeof b.name === 'string' && b.name.trim().length > 0);
  }, [buildings]);

  // Prüfen, ob es unzugeordnete Räume gibt
  const hasUnassignedRooms = React.useMemo(() => {
    return (rooms || []).some((r: any) => !r.building_id);
  }, [rooms]);

  // Raum-Filterung anhand des gewählten echten Gebäudes
  const filteredRooms = React.useMemo(() => {
    if (validBuildings.length === 0 || selectedBuildingId === 'all') {
      return rooms || [];
    }
    if (selectedBuildingId === 'unassigned') {
      return (rooms || []).filter((r: any) => !r.building_id);
    }
    return (rooms || []).filter((r: any) => r.building_id === selectedBuildingId);
  }, [rooms, validBuildings, selectedBuildingId]);

  // Aktuelle Referenzzeit (unter Berücksichtigung von simuliertem Datum)
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDayIndex = now.getDay() === 0 ? 7 : now.getDay();
  const isViewingCurrentDay = todayDayNum === todayDayIndex;

  // Bis zu 15 Räume anzeigen (3 Zeilen à 5 Spalten bei Desktop)
  const displayRooms = filteredRooms.slice(0, 15);

  // Gebäude mit aktivem Live-Betrieb ermitteln (für den pulsierenden Beacon im Tab-Header)
  const isBuildingActiveLive = React.useCallback((buildingId: string) => {
    if (!isViewingCurrentDay) return false;
    const bRooms = buildingId === 'all' 
      ? (rooms || []) 
      : buildingId === 'unassigned' 
        ? (rooms || []).filter((r: any) => !r.building_id)
        : (rooms || []).filter((r: any) => r.building_id === buildingId);

    const bRoomIds = new Set(bRooms.map((r: any) => r.id));
    return todayAllocations.some((alloc: any) => {
      if (!bRoomIds.has(alloc.roomId)) return false;
      const [sh, sm] = (alloc.startTime || '08:00').split(':').map(Number);
      const [eh, em] = (alloc.endTime || '08:45').split(':').map(Number);
      const sMin = (sh || 0) * 60 + (sm || 0);
      const eMin = (eh || 0) * 60 + (em || 0);
      return currentMinutes >= sMin && currentMinutes < eMin;
    });
  }, [rooms, todayAllocations, isViewingCurrentDay, currentMinutes]);

  const handleRoomClick = (roomName: string) => {
    if (setRoomSearchQuery) setRoomSearchQuery(roomName);
    if (setRoomsSubView) setRoomsSubView('plan');
    setActiveTab('secretary');
    setSecretarySubTab('rooms');
  };

  return (
    <div 
      id="tour-secretary-radar-board"
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* HEADER: Titel, Zähler & Schnellaktionen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#e6f4ea',
            color: '#137333',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            flexShrink: 0
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                Tages-Radar • Musikschulbetrieb heute
              </h3>
              <span style={{
                background: '#f1f5f9',
                color: '#334155',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}>
                {dayName}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '3px', display: 'block' }}>
              {todayAllocations.length} Unterrichtsstunden geplant &bull; {todayTeachersCount} Lehrkräfte im Haus &bull; {rooms.length} Räume aktiv
            </span>
          </div>
        </div>

        {/* Action Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            aria-label="Direkt zum Räume-Board wechseln"
            onClick={() => {
              if (setRoomsSubView) setRoomsSubView('plan');
              if (setRoomSearchQuery) setRoomSearchQuery('');
              setActiveTab('secretary');
              setSecretarySubTab('rooms');
            }}
            style={{
              background: '#0f172a',
              border: 'none',
              color: '#ffffff',
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              letterSpacing: '-0.01em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
          >
            <DoorOpen size={14} style={{ color: '#ffffff' }} />
            <span>Räume-Board</span>
          </button>
          <button
            type="button"
            aria-label="Logbuch der Raumbuchungen öffnen"
            onClick={() => {
              fetchLogbookBookings();
              setShowLogbookModal(true);
            }}
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#1c1c1e',
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              letterSpacing: '-0.01em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            <BookOpen size={14} style={{ color: '#1c1c1e' }} />
            <span>Logbuch öffnen</span>
          </button>
        </div>
      </div>

      {/* GEBÄUDE-FILTER (Apple Squircle Segmented Control - strikt Zero-Dummy: nur bei angelegten Gebäuden) */}
      {validBuildings.length > 0 && (
        <div 
          role="tablist" 
          aria-label="Räume nach Gebäude filtern"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            width: 'fit-content',
            border: 'none',
            flexWrap: 'wrap'
          }}
        >
          {/* Tab: Alle */}
          {(() => {
            const isSelected = selectedBuildingId === 'all';
            const count = (rooms || []).length;
            const hasLive = isBuildingActiveLive('all');
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedBuildingId('all')}
                style={{
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span>Alle</span>
                <span style={{
                  background: isSelected ? '#f1f5f9' : '#e2e8f0',
                  color: isSelected ? '#0f172a' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.66rem',
                  fontWeight: 750
                }}>
                  {count}
                </span>
                {hasLive && (
                  <span 
                    title="Aktiver Live-Unterricht"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      display: 'inline-block',
                      animation: 'pulse 1.8s infinite'
                    }} 
                  />
                )}
              </button>
            );
          })()}

          {/* Tabs für jedes real angelegte Gebäude */}
          {validBuildings.map((b: any) => {
            const isSelected = selectedBuildingId === b.id;
            const count = (rooms || []).filter((r: any) => r.building_id === b.id).length;
            const hasLive = isBuildingActiveLive(b.id);
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedBuildingId(b.id)}
                style={{
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span>{b.name}</span>
                <span style={{
                  background: isSelected ? '#f1f5f9' : '#e2e8f0',
                  color: isSelected ? '#0f172a' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.66rem',
                  fontWeight: 750
                }}>
                  {count}
                </span>
                {hasLive && (
                  <span 
                    title={`Aktiver Live-Unterricht in ${b.name}`}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      display: 'inline-block',
                      animation: 'pulse 1.8s infinite'
                    }} 
                  />
                )}
              </button>
            );
          })}

          {/* Tab: Ohne Zuordnung (nur wenn unzugeordnete Räume existieren) */}
          {hasUnassignedRooms && (() => {
            const isSelected = selectedBuildingId === 'unassigned';
            const count = (rooms || []).filter((r: any) => !r.building_id).length;
            const hasLive = isBuildingActiveLive('unassigned');
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedBuildingId('unassigned')}
                style={{
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span>Ohne Zuordnung</span>
                <span style={{
                  background: isSelected ? '#f1f5f9' : '#e2e8f0',
                  color: isSelected ? '#0f172a' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.66rem',
                  fontWeight: 750
                }}>
                  {count}
                </span>
                {hasLive && (
                  <span 
                    title="Aktiver Live-Unterricht"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      display: 'inline-block',
                      animation: 'pulse 1.8s infinite'
                    }} 
                  />
                )}
              </button>
            );
          })()}
        </div>
      )}

      {/* RAUM-RASTER (3x5 Raster für bis zu 15 Räume) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(205px, 1fr))', 
          gap: '12px' 
        }}
      >
        {displayRooms.length === 0 ? (
          <div style={{ padding: '32px 24px', color: '#64748b', fontSize: '0.82rem', textAlign: 'center', gridColumn: '1 / -1', background: '#f8fafc', borderRadius: '16px', border: 'none' }}>
            {selectedBuildingId !== 'all' 
              ? 'Keine Räume für das ausgewählte Gebäude zugeordnet.' 
              : 'Keine Räume für diese Schule hinterlegt.'}
          </div>
        ) : (
          displayRooms.map((room: any) => {
            const roomAllocs = todayAllocations
              .filter((a: any) => a.roomId === room.id)
              .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
            const isOccupied = roomAllocs.length > 0;
            const roomTeachers = Array.from(new Set(roomAllocs.map((a: any) => a.teacherName || (a.teacherId ? (userMap[a.teacherId] || '') : '')).filter(Boolean)));
            
            // Live-Betrieb und didaktischen Zeitkontext ermitteln
            let isLiveNow = false;
            let activeLiveAlloc: any = null;
            let remainingMinutes = 0;
            let nextUpcomingAlloc: any = null;

            if (isOccupied && isViewingCurrentDay) {
              for (const alloc of roomAllocs) {
                const [sh, sm] = (alloc.startTime || '08:00').split(':').map(Number);
                const [eh, em] = (alloc.endTime || '08:45').split(':').map(Number);
                const sMin = (sh || 0) * 60 + (sm || 0);
                const eMin = (eh || 0) * 60 + (em || 0);

                if (currentMinutes >= sMin && currentMinutes < eMin) {
                  isLiveNow = true;
                  activeLiveAlloc = alloc;
                  remainingMinutes = Math.max(1, eMin - currentMinutes);
                  break;
                } else if (sMin > currentMinutes && !nextUpcomingAlloc) {
                  nextUpcomingAlloc = alloc;
                }
              }
            }

            // Zeit-Kontext berechnen (Zero Mental Math)
            let timeSpanText = 'Frei für Spontan-Üben';
            if (isOccupied) {
              if (isLiveNow && activeLiveAlloc) {
                const teacherStr = activeLiveAlloc.teacherName || (activeLiveAlloc.teacherId ? (userMap[activeLiveAlloc.teacherId] || '') : '') || roomTeachers[0] || 'Unterricht';
                const remFormatted = remainingMinutes >= 60 
                  ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m` 
                  : `${remainingMinutes} Min.`;
                timeSpanText = `🔴 Jetzt: ${teacherStr} • noch ${remFormatted}`;
              } else if (nextUpcomingAlloc) {
                const nextTeacher = nextUpcomingAlloc.teacherName || (nextUpcomingAlloc.teacherId ? (userMap[nextUpcomingAlloc.teacherId] || '') : '') || roomTeachers[0] || 'Unterricht';
                timeSpanText = `🟢 Frei bis ${nextUpcomingAlloc.startTime || '14:00'} • danach ${nextTeacher}`;
              } else if (isViewingCurrentDay) {
                timeSpanText = '✓ Heute beendet • Jetzt frei';
              } else {
                const firstSlot = roomAllocs[0];
                const lastSlot = roomAllocs[roomAllocs.length - 1];
                const teacherStr = roomTeachers.length > 0 ? roomTeachers[0] : 'Unterricht belegt';
                timeSpanText = `${firstSlot.startTime || '14:00'}–${lastSlot.endTime || '18:00'} • ${teacherStr}`;
              }
            }

            return (
              <div
                key={room.id}
                role="button"
                tabIndex={0}
                aria-label={`Raum ${room.name}: ${isLiveNow ? `Gerade live im Unterricht (${timeSpanText})` : (isOccupied ? `${roomAllocs.length} Termine heute, ${timeSpanText}` : 'Heute frei für Spontan-Üben')}`}
                onClick={() => handleRoomClick(room.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRoomClick(room.name);
                  }
                }}
                style={{
                  background: isLiveNow ? '#fef3c7' : (isOccupied ? '#f8fafc' : '#f1f5f9'),
                  border: 'none',
                  borderLeft: isLiveNow ? '4px solid #f59e0b' : 'none',
                  borderRadius: '16px',
                  padding: isLiveNow ? '12px 14px 12px 12px' : '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '102px',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: 'none'
                }}
                className="hover-scale"
              >
                {/* Obere Zeile: Name & Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span 
                    title={room.name}
                    style={{ 
                      fontSize: '0.84rem', 
                      fontWeight: 800, 
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: isLiveNow ? '110px' : '125px'
                    }}
                  >
                    {room.name}
                  </span>
                  {isOccupied ? (
                    isLiveNow ? (
                      <span style={{
                        background: '#ffffff',
                        color: '#b45309',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        border: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0
                      }}>
                        <span 
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#f59e0b',
                            display: 'inline-block',
                            animation: 'pulse 1.8s infinite'
                          }} 
                        />
                        LIVE
                      </span>
                    ) : (
                      <span style={{
                        background: '#fef3c7',
                        color: '#b45309',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        fontWeight: 750,
                        border: 'none',
                        flexShrink: 0
                      }}>
                        {roomAllocs.length} {roomAllocs.length === 1 ? 'Slot' : 'Slots'}
                      </span>
                    )
                  ) : (
                    <span style={{
                      background: '#e6f4ea',
                      color: '#137333',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontWeight: 750,
                      border: 'none',
                      flexShrink: 0
                    }}>
                      Frei
                    </span>
                  )}
                </div>

                {/* Mittlere Zeile: Zeithorizont & Lehrkraft */}
                <div 
                  title={timeSpanText}
                  style={{ 
                    fontSize: '0.70rem', 
                    color: isLiveNow ? '#0f172a' : (isOccupied ? '#334155' : '#64748b'), 
                    fontWeight: isLiveNow ? 700 : (isOccupied ? 600 : 500),
                    margin: '6px 0', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}
                >
                  {timeSpanText}
                </div>

                {/* Untere Zeile: Visuelle Mini-Occupancy-Leiste (08:00 - 20:00 Uhr) */}
                <div>
                  <div 
                    style={{ 
                      position: 'relative', 
                      width: '100%', 
                      height: '4px', 
                      background: '#e2e8f0', 
                      borderRadius: '4px', 
                      overflow: 'hidden' 
                    }}
                  >
                    {isOccupied && roomAllocs.map((alloc: any, idx: number) => {
                      const [sh, sm] = (alloc.startTime || '08:00').split(':').map(Number);
                      const [eh, em] = (alloc.endTime || '08:45').split(':').map(Number);
                      const sMin = (sh || 0) * 60 + (sm || 0);
                      const eMin = (eh || 0) * 60 + (em || 0);
                      const startMins = Math.max(0, sMin - 480);
                      const endMins = Math.min(720, eMin - 480);
                      const leftPct = Math.max(0, Math.min(100, (startMins / 720) * 100));
                      const widthPct = Math.max(3, Math.min(100 - leftPct, ((endMins - startMins) / 720) * 100));
                      const isThisSlotLive = isLiveNow && (alloc.id ? alloc.id === activeLiveAlloc?.id : (currentMinutes >= sMin && currentMinutes < eMin));

                      return (
                        <div
                          key={alloc.id || idx}
                          title={`${alloc.startTime || '14:00'}–${alloc.endTime || '18:00'} Uhr${isThisSlotLive ? ' • JETZT LIVE' : ''}`}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: 0,
                            bottom: 0,
                            background: '#f59e0b',
                            borderRadius: '2px',
                            boxShadow: 'none'
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600 }}>
                    <span>08:00</span>
                    <span>20:00</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
