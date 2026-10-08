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
  todayAllocations: any[];
  todayTeachersCount: number;
  todayDayNum: number;
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
  todayAllocations,
  todayTeachersCount,
  todayDayNum,
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

  // Bis zu 15 Räume anzeigen (3 Zeilen à 5 Spalten bei Desktop)
  const displayRooms = (rooms || []).slice(0, 15);

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
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* HEADER: Titel, Zähler & Schnellaktionen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#f0fdf4',
            color: '#16a34a',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #dcfce7',
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
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
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
              background: '#f2f2f7',
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
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e5ea'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f2f2f7'; }}
          >
            <BookOpen size={14} style={{ color: '#1c1c1e' }} />
            <span>Logbuch öffnen</span>
          </button>
        </div>
      </div>

      {/* RAUM-RASTER (3x5 Raster für bis zu 15 Räume) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(205px, 1fr))', 
          gap: '12px' 
        }}
      >
        {displayRooms.length === 0 ? (
          <div style={{ padding: '24px', color: '#64748b', fontSize: '0.82rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            Keine Räume für diese Schule hinterlegt.
          </div>
        ) : (
          displayRooms.map((room: any) => {
            const roomAllocs = todayAllocations
              .filter((a: any) => a.roomId === room.id)
              .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
            const isOccupied = roomAllocs.length > 0;
            const roomTeachers = Array.from(new Set(roomAllocs.map((a: any) => a.teacherName || (a.teacherId ? (userMap[a.teacherId] || '') : '')).filter(Boolean)));
            
            // Zeit-Kontext berechnen
            let timeSpanText = 'Frei für Spontan-Üben';
            if (isOccupied) {
              const firstSlot = roomAllocs[0];
              const lastSlot = roomAllocs[roomAllocs.length - 1];
              const teacherStr = roomTeachers.length > 0 ? roomTeachers[0] : 'Unterricht belegt';
              timeSpanText = `${firstSlot.startTime || '14:00'}–${lastSlot.endTime || '18:00'} • ${teacherStr}`;
            }

            return (
              <div
                key={room.id}
                role="button"
                tabIndex={0}
                aria-label={`Raum ${room.name}: ${isOccupied ? `${roomAllocs.length} Termine heute, ${timeSpanText}` : 'Heute frei für Spontan-Üben'}`}
                onClick={() => handleRoomClick(room.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRoomClick(room.name);
                  }
                }}
                style={{
                  background: isOccupied ? '#ffffff' : '#f8fafc',
                  border: isOccupied ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '102px',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isOccupied ? '0 2px 6px rgba(15, 23, 42, 0.02)' : 'none'
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
                      maxWidth: '125px'
                    }}
                  >
                    {room.name}
                  </span>
                  <span style={{
                    background: isOccupied ? '#eff6ff' : '#f0fdf4',
                    color: isOccupied ? '#1d4ed8' : '#15803d',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.66rem',
                    fontWeight: 750,
                    border: isOccupied ? '1px solid #dbeafe' : '1px solid #dcfce7',
                    flexShrink: 0
                  }}>
                    {isOccupied ? `${roomAllocs.length} ${roomAllocs.length === 1 ? 'Slot' : 'Slots'}` : 'Frei'}
                  </span>
                </div>

                {/* Mittlere Zeile: Zeithorizont & Lehrkraft */}
                <div 
                  title={timeSpanText}
                  style={{ 
                    fontSize: '0.70rem', 
                    color: isOccupied ? '#334155' : '#64748b', 
                    fontWeight: isOccupied ? 600 : 500,
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
                      background: '#f1f5f9', 
                      borderRadius: '4px', 
                      overflow: 'hidden' 
                    }}
                  >
                    {isOccupied && roomAllocs.map((alloc: any, idx: number) => {
                      const [sh, sm] = (alloc.startTime || '08:00').split(':').map(Number);
                      const [eh, em] = (alloc.endTime || '08:45').split(':').map(Number);
                      const startMins = Math.max(0, (sh - 8) * 60 + (sm || 0));
                      const endMins = Math.min(720, (eh - 8) * 60 + (em || 0));
                      const leftPct = Math.max(0, Math.min(100, (startMins / 720) * 100));
                      const widthPct = Math.max(3, Math.min(100 - leftPct, ((endMins - startMins) / 720) * 100));

                      return (
                        <div
                          key={alloc.id || idx}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: 0,
                            bottom: 0,
                            background: '#3b82f6',
                            borderRadius: '2px'
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
