import React, { useState, useMemo } from 'react';
import { DoorOpen, School, Package, Sparkles, X, ChevronRight } from 'lucide-react';
import { EquipmentInstance, getInstrumentVisualMeta } from './SecretaryEquipmentCard';

export interface SecretaryEquipmentRoomCanvasProps {
  rooms: any[];
  selectedEquipmentRoomId: string | null;
  setSelectedEquipmentRoomId: (id: string | null) => void;
  dragOverRoomId: string | null;
  setDragOverRoomId: (id: string | null) => void;
  handleDropInstrumentOnRoom: (instName: string, roomId: string) => Promise<void>;
  handleReturnToPool: (instName: string) => Promise<void>;
  allInstances: EquipmentInstance[];
  freeCount: number;
  parseRoomName: (name: string) => { prefix: string; number: number | null };
}

export const SecretaryEquipmentRoomCanvas: React.FC<SecretaryEquipmentRoomCanvasProps> = ({
  rooms,
  selectedEquipmentRoomId,
  setSelectedEquipmentRoomId,
  dragOverRoomId,
  setDragOverRoomId,
  handleDropInstrumentOnRoom,
  handleReturnToPool,
  allInstances,
  freeCount,
  parseRoomName,
}) => {
  const [dragOverPool, setDragOverPool] = useState(false);
  const [floorFilter, setFloorFilter] = useState<string>('Alle');

  // Sorted rooms list
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const parsedA = parseRoomName(a.name || '');
      const parsedB = parseRoomName(b.name || '');
      const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, 'de', { sensitivity: 'base' });
      if (prefixCompare !== 0) return prefixCompare;
      
      const numA = parsedA.number !== null ? parsedA.number : -1;
      const numB = parsedB.number !== null ? parsedB.number : -1;
      return numA - numB;
    });
  }, [rooms, parseRoomName]);

  // Extract distinct floors
  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach(r => {
      if (r.floor && r.floor.trim()) {
        set.add(r.floor.trim());
      }
    });
    return ['Alle', ...Array.from(set).sort()];
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (floorFilter === 'Alle') return sortedRooms;
    return sortedRooms.filter(r => (r.floor || '').trim() === floorFilter);
  }, [sortedRooms, floorFilter]);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '24px',
      border: '1px solid rgba(15, 23, 42, 0.07)',
      padding: '22px',
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
            Räume & Zuweisung
          </h4>
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
            Instrumente per Drag & Drop zuweisen
          </span>
        </div>
        {selectedEquipmentRoomId && (
          <button
            type="button"
            onClick={() => setSelectedEquipmentRoomId(null)}
            style={{ 
              background: '#f1f5f9', 
              border: 'none', 
              padding: '4px 10px', 
              borderRadius: '8px', 
              fontSize: '0.68rem', 
              fontWeight: 800, 
              color: '#475569', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Filter lösen <X size={12} />
          </button>
        )}
      </div>

      {/* MAGNETISCHE DROP-ZONE: FREIER POOL (Zuweisung aufheben) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverPool(true);
        }}
        onDragLeave={() => setDragOverPool(false)}
        onDrop={async (e) => {
          e.preventDefault();
          const instName = e.dataTransfer.getData("text/plain");
          setDragOverPool(false);
          if (instName) {
            await handleReturnToPool(instName);
          }
        }}
        style={{
          padding: '12px 16px',
          borderRadius: '16px',
          background: dragOverPool ? '#fffbeb' : '#f8fafc',
          border: dragOverPool ? '2px dashed #f59e0b' : '1.5px dashed #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: dragOverPool ? 'scale(1.02)' : 'none',
          boxShadow: dragOverPool ? '0 0 16px rgba(245, 158, 11, 0.18)' : 'none',
          cursor: 'default'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '10px', 
            background: dragOverPool ? '#fde68a' : '#e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: dragOverPool ? '#b45309' : '#64748b'
          }}>
            <Package size={16} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: dragOverPool ? '#92400e' : '#1e293b', display: 'block' }}>
              Freier Pool
            </span>
            <span style={{ fontSize: '0.66rem', color: dragOverPool ? '#b45309' : '#64748b' }}>
              Hier ablegen zum Freigeben
            </span>
          </div>
        </div>
        <span style={{ 
          fontSize: '0.76rem', 
          fontWeight: 800, 
          color: '#15803d', 
          background: '#f0fdf4', 
          padding: '3px 10px', 
          borderRadius: '9999px',
          border: '1px solid rgba(22, 163, 74, 0.15)'
        }}>
          {freeCount} frei
        </span>
      </div>

      {/* OVERVIEW FILTER BUTTON (Beseitigung des grellen roten Farb-Clashs) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelectedEquipmentRoomId(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedEquipmentRoomId(null);
          }
        }}
        style={{
          padding: '10px 14px',
          borderRadius: '14px',
          cursor: 'pointer',
          background: !selectedEquipmentRoomId ? '#f1f5f9' : '#ffffff',
          border: !selectedEquipmentRoomId ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
          <School size={15} color={!selectedEquipmentRoomId ? '#ea4335' : '#64748b'} /> 
          Alle Räume
        </span>
        <span style={{ 
          fontSize: '0.68rem', 
          fontWeight: 700, 
          color: '#64748b',
          background: '#ffffff',
          padding: '2px 8px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          {allInstances.length} Einheiten
        </span>
      </div>

      {/* FLOOR TABS (Schnellnavigation bei vielen Räumen) */}
      {availableFloors.length > 2 && (
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {availableFloors.map(floor => (
            <button
              key={floor}
              type="button"
              onClick={() => setFloorFilter(floor)}
              style={{
                border: 'none',
                background: floorFilter === floor ? '#0f172a' : '#f1f5f9',
                color: floorFilter === floor ? '#ffffff' : '#64748b',
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {floor}
            </button>
          ))}
        </div>
      )}

      {/* SPATIAL ROOMS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '540px', overflowY: 'auto', paddingRight: '2px' }}>
        {filteredRooms.map(rm => {
          const isSelected = selectedEquipmentRoomId === rm.id;
          const isDragOver = dragOverRoomId === rm.id;
          const instCount = Array.isArray(rm.room_instruments) ? rm.room_instruments.length : 0;
          
          return (
            <div 
              key={rm.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedEquipmentRoomId(rm.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedEquipmentRoomId(rm.id);
                }
              }}
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
                borderRadius: '16px', 
                cursor: 'pointer', 
                background: isDragOver ? '#ecfdf5' : isSelected ? '#f8fafc' : '#ffffff',
                border: isDragOver 
                  ? '2px dashed #10b981' 
                  : isSelected 
                    ? '1.5px solid #0f172a' 
                    : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isDragOver ? 'scale(1.02)' : 'none',
                boxShadow: isDragOver 
                  ? '0 0 16px rgba(16, 185, 129, 0.18)' 
                  : isSelected 
                    ? '0 2px 8px rgba(15, 23, 42, 0.05)' 
                    : '0 1px 3px rgba(15, 23, 42, 0.02)'
              }}
            >
              {/* Room Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  <DoorOpen size={15} color={isSelected ? '#0f172a' : '#64748b'} /> 
                  {rm.name}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {rm.floor && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '5px' }}>
                      {rm.floor}
                    </span>
                  )}
                  <span style={{ 
                    fontSize: '0.66rem', 
                    fontWeight: 800, 
                    color: instCount > 0 ? '#0f172a' : '#94a3b8' 
                  }}>
                    {instCount > 0 ? `${instCount} Inst.` : 'Leer'}
                  </span>
                </div>
              </div>
              
              {/* Room Instruments Chips */}
              {rm.room_instruments && rm.room_instruments.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                  {rm.room_instruments.map((inst: any, idx: number) => {
                    const meta = getInstrumentVisualMeta(inst.name);
                    return (
                      <span 
                        key={idx} 
                        style={{ 
                          fontSize: '0.62rem', 
                          color: '#334155', 
                          fontWeight: 700, 
                          background: '#f8fafc', 
                          padding: '2px 7px', 
                          borderRadius: '6px', 
                          border: '1px solid #e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: meta.accentColor }} />
                        {inst.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Bereit für Zuweisung — hier ablegen
                </span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
