import React from 'react';
import { Box, GripVertical, MapPin, Plus, Tablet, Trash2 } from 'lucide-react';
import { getStationColor } from '../../utils/adminColorHelpers';

export interface AdminGroovelabRoomsViewProps {
  rooms: any[];
  stations: any[];
  draggedRoomId: string | null;
  dragOverRoomId: string | null;
  handleRoomDragStart: (e: React.DragEvent, id: string) => void;
  handleRoomDragOver: (e: React.DragEvent) => void;
  handleRoomDragEnter: (e: React.DragEvent, id: string) => void;
  handleRoomDragLeave: (e: React.DragEvent) => void;
  handleRoomDrop: (e: React.DragEvent, id: string) => void;
  handleRoomDragEnd: () => void;
  setCustomizingRoom: (room: any) => void;
  triggerBatchAddStations: (roomId: string) => void;
  handleDeleteRoom: (roomId: string) => void;
  handleDeleteStation: (stationId: string) => void;
  brandColor?: string;
}

export const AdminGroovelabRoomsView: React.FC<AdminGroovelabRoomsViewProps> = ({
  rooms,
  stations,
  draggedRoomId,
  dragOverRoomId,
  handleRoomDragStart,
  handleRoomDragOver,
  handleRoomDragEnter,
  handleRoomDragLeave,
  handleRoomDrop,
  handleRoomDragEnd,
  setCustomizingRoom,
  triggerBatchAddStations,
  handleDeleteRoom,
  handleDeleteStation,
  brandColor = '#eab308'
}) => {
  const groovelabRooms = React.useMemo(() => {
    return (rooms || []).filter(r => Boolean(r.is_groovelab_active));
  }, [rooms]);

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ 
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '10px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '8px',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px -6px ${brandColor}30` }}>
              <Box size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Räume & Übeplätze
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Verwalte deine Räume und ordne Kiosk-Stationen zu
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{groovelabRooms.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Räume</div>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                {stations.filter(s => groovelabRooms.some(r => r.id === s.room_id) && s.name.toLowerCase() !== 'lehrer ipad').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>iPads Gesamt</div>
            </div>
          </div>
        </div>

        {groovelabRooms.length === 0 ? (
          <div className="glass-panel" style={{ 
            textAlign: 'center', 
            padding: '48px 24px', 
            borderRadius: '24px', 
            background: '#ffffff', 
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${brandColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={24} color={brandColor} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Keine Räume für GrooveLab aktiviert
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '440px', lineHeight: 1.5 }}>
              In der Verwaltung unter „Räume“ kannst du festlegen, welche Räume deiner Musikschule für das GrooveLab-Modul freigeschaltet sind.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
            {groovelabRooms.map((room, index) => (
            <div 
              key={room.id} 
              className="glass-panel" 
              draggable
              onDragStart={e => handleRoomDragStart(e, room.id)}
              onDragOver={handleRoomDragOver}
              onDragEnter={e => handleRoomDragEnter(e, room.id)}
              onDragLeave={handleRoomDragLeave}
              onDrop={e => handleRoomDrop(e, room.id)}
              onDragEnd={handleRoomDragEnd}
              style={{ 
                padding: '24px', 
                background: 'white', 
                borderRadius: '24px', 
                border: dragOverRoomId === room.id ? `2px dashed ${brandColor}` : '1px solid #f1f5f9',
                opacity: draggedRoomId === room.id ? 0.4 : 1,
                cursor: 'grab',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Kopfzeile: Hauptinformationen & Aktionen */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GripVertical size={18} color="#cbd5e1" style={{ cursor: 'grab' }} />
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${brandColor}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box size={20} color={brandColor} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    {index + 1}. {room.name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      try {
                        setCustomizingRoom(room);
                      } catch (err) {
                        console.error('[RoomsView] Error opening room layout:', err);
                      }
                    }} 
                    aria-label={`Raum-Layout für ${room.name} gestalten`}
                    title="Raum-Layout gestalten"
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      color: '#475569', 
                      cursor: 'pointer', 
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = brandColor;
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    <MapPin size={14} color={brandColor} /> Layout
                  </button>
                  <button onClick={() => triggerBatchAddStations(room.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: brandColor, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> iPad
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room.id);
                    }} 
                    aria-label={`Raum ${room.name} löschen`}
                    style={{ 
                      padding: '8px', 
                      borderRadius: '10px', 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      color: '#94a3b8', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fecaca';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                    title="Raum löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0 16px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stations
                  .filter(s => s.room_id === room.id)
                  .sort((a, b) => {
                    const aIsLehrer = a.name.toLowerCase() === 'lehrer ipad';
                    const bIsLehrer = b.name.toLowerCase() === 'lehrer ipad';
                    if (aIsLehrer && !bIsLehrer) return -1;
                    if (!aIsLehrer && bIsLehrer) return 1;
                    return 0;
                  })
                  .map(station => (
                    <div key={station.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#475569' }}>
                        <Tablet size={16} color={getStationColor(station.name, station.color)} /> {station.name}
                      </div>
                      {station.name.toLowerCase() !== 'lehrer ipad' && (
                        <button 
                          onClick={() => handleDeleteStation(station.id)} 
                          aria-label={`Übeplatz ${station.name} löschen`}
                          title={`Übeplatz ${station.name} löschen`}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} 
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} 
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                {stations.filter(s => s.room_id === room.id).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8125rem', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>Keine Übeplätze definiert.</div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};
