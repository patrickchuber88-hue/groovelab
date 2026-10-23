import React, { useState, useEffect, useRef } from 'react';
import { Building, Music, AlertCircle, Wrench, Clock, Trash2, ChevronDown, Check, Edit2, Users, Maximize2 } from 'lucide-react';

export interface SecretaryRoomCardItemProps {
  room: any;
  buildingMap: Record<string, any>;
  allFloorsList: string[];
  roomIssues: any[];
  pendingBookings: any[];
  showBuildingTag?: boolean;
  onOpenEditor: (room: any) => void;
  onDeleteRoom: (id: string) => void;
  onChangeRoomFloor: (roomId: string, newFloor: string) => void;
  onToggleCampus: (roomId: string, current: boolean) => void;
  onToggleGroovelab: (roomId: string, current: boolean) => void;
  onOpenFacilityLogModal?: () => void;
  onInspectPendingBookings?: (roomName: string) => void;
  formatInstrumentName: (name: string) => string;
  getAlphabeticalColor: (name: string) => { avatarBg: string; avatarColor: string };
}

export function SecretaryRoomCardItem({
  room,
  buildingMap = {},
  allFloorsList = [],
  roomIssues = [],
  pendingBookings = [],
  showBuildingTag = false,
  onOpenEditor,
  onDeleteRoom,
  onChangeRoomFloor,
  onToggleCampus,
  onToggleGroovelab,
  onOpenFacilityLogModal,
  onInspectPendingBookings,
  formatInstrumentName,
  getAlphabeticalColor
}: SecretaryRoomCardItemProps) {
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [isHoveringDetails, setIsHoveringDetails] = useState(false);
  const floorDropdownRef = useRef<HTMLDivElement>(null);

  // 0.1% Goldstandard: Interaction Hygiene & Dismissibility (Click-Outside & Escape-Key)
  useEffect(() => {
    if (!showFloorDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (floorDropdownRef.current && !floorDropdownRef.current.contains(e.target as Node)) {
        setShowFloorDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFloorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFloorDropdown]);

  const initials = (room.name || 'RM')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const rColor = getAlphabeticalColor(room.name || 'R');
  const equipment: string[] = Array.isArray(room.equipment) ? room.equipment : [];
  const unsuitableInsts: string[] = Array.isArray(room.unsuitable_instruments) 
    ? room.unsuitable_instruments 
    : [];

  const roomOpenIssues = roomIssues.filter(
    (i: any) =>
      !i.is_completed &&
      !i.is_acknowledged &&
      (i.room_id === room.id || i.room_id === room.name || (room.name && i.room_id && room.name.toLowerCase().includes(i.room_id.toLowerCase())))
  );

  const roomPending = (pendingBookings || []).filter(
    (b: any) => b.room_id === room.id || (b.rooms && b.rooms.name === room.name)
  );

  const currentFloor = room.floor || 'EG';

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('roomId', room.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '18px',
        padding: '14px 20px',
        borderRadius: '18px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        transition: 'all 0.15s ease',
        cursor: 'grab',
        width: '100%',
        minHeight: '66px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: showFloorDropdown ? 50 : 1
      }}
      className="hover-scale"
    >
      {/* ── SPALTE 1: AVATAR, RAUMNAME & STANDORT (260px) ── */}
      <div
        onClick={() => onOpenEditor(room)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          width: '260px',
          minWidth: '220px',
          flexShrink: 0
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: rColor.avatarBg,
          color: rColor.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.92rem',
          fontWeight: 900,
          fontFamily: 'Urbanist',
          flexShrink: 0
        }}>
          {initials}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
            <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {room.name}
            </span>

            {/* Mängel-Badge */}
            {roomOpenIssues.length > 0 && (
              <span
                role={onOpenFacilityLogModal ? 'button' : undefined}
                tabIndex={onOpenFacilityLogModal ? 0 : undefined}
                onClick={onOpenFacilityLogModal ? (e) => { e.stopPropagation(); onOpenFacilityLogModal(); } : undefined}
                style={{
                  fontSize: '0.62rem',
                  color: '#b91c1c',
                  background: 'rgba(239, 68, 68, 0.09)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: onOpenFacilityLogModal ? 'pointer' : 'default',
                  flexShrink: 0
                }}
              >
                <Wrench size={9} />
                {roomOpenIssues.length}
              </span>
            )}

            {/* Vorläufige Buchung */}
            {roomPending.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onInspectPendingBookings) onInspectPendingBookings(room.name);
                }}
                style={{
                  fontSize: '0.62rem',
                  color: '#92400e',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Clock size={9} />
                {roomPending.length}
              </span>
            )}
          </div>

          {/* Subline: Floor Quick-Select & Building */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            {/* Interactive Floor Pill */}
            <div ref={floorDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={showFloorDropdown}
                aria-label={`Stockwerk ändern (aktuell ${currentFloor})`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFloorDropdown(!showFloorDropdown);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '7px',
                  background: showFloorDropdown ? '#e2e8f0' : '#f1f5f9',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#334155',
                  cursor: 'pointer',
                  fontFamily: 'Urbanist'
                }}
                className="hover-scale-mini"
              >
                <span>{currentFloor}</span>
                <ChevronDown
                  size={11}
                  style={{
                    color: '#64748b',
                    transform: showFloorDropdown ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>

              {showFloorDropdown && (
                <div
                  role="listbox"
                  aria-label={`Stockwerk für Raum ${room.name} auswählen`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    zIndex: 100,
                    minWidth: '120px'
                  }}
                >
                  {allFloorsList.map((fl) => (
                    <button
                      key={fl}
                      role="option"
                      aria-selected={currentFloor === fl}
                      type="button"
                      onClick={() => {
                        onChangeRoomFloor(room.id, fl);
                        setShowFloorDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentFloor === fl ? 'rgba(234, 67, 53, 0.08)' : 'transparent',
                        color: currentFloor === fl ? '#ea4335' : '#0f172a',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (currentFloor !== fl) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (currentFloor !== fl) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{fl}</span>
                      {currentFloor === fl && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Building Tag - nur anzeigen wenn nötig / ohne Redundanz */}
            {showBuildingTag && room.building_id && (
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Building size={11} style={{ color: '#94a3b8' }} />
                {buildingMap[room.building_id]?.name || 'Gebäude'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── SPALTE 2: KENNZAHLEN (KAPAZITÄT & FLÄCHE) (135px) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '135px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={15} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: room.max_students ? '#0f172a' : '#94a3b8', fontFamily: 'monospace' }}>
            {room.max_students ? room.max_students : '—'}
          </span>
          {room.max_students ? <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>Sch.</span> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Maximize2 size={15} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: (room.qm && room.qm > 0) ? '#0f172a' : '#94a3b8', fontFamily: 'monospace' }}>
            {(room.qm && room.qm > 0) ? room.qm : '—'}
          </span>
          {(room.qm && room.qm > 0) ? <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>m²</span> : null}
        </div>
      </div>

      {/* ── SPALTE 3: MODUL-TOGGLES (165px) ── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '165px', flexShrink: 0 }}>
        {/* Campus Toggle */}
        <button
          type="button"
          aria-label={`Campus für ${room.name} ${room.is_campus_active !== false ? 'deaktivieren' : 'aktivieren'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCampus(room.id, room.is_campus_active !== false);
          }}
          style={{
            padding: '6px 13px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            background: room.is_campus_active !== false ? 'rgba(52, 168, 83, 0.10)' : '#f1f5f9',
            color: room.is_campus_active !== false ? '#15803d' : '#94a3b8',
            transition: 'all 0.15s ease',
            fontFamily: 'Urbanist'
          }}
          className="hover-scale-mini"
        >
          Campus
        </button>

        {/* GrooveLab Toggle */}
        <button
          type="button"
          aria-label={`GrooveLab für ${room.name} ${room.is_groovelab_active ? 'deaktivieren' : 'aktivieren'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGroovelab(room.id, !!room.is_groovelab_active);
          }}
          style={{
            padding: '6px 13px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            background: room.is_groovelab_active ? 'rgba(234, 179, 8, 0.14)' : '#f1f5f9',
            color: room.is_groovelab_active ? '#854d0e' : '#94a3b8',
            transition: 'all 0.15s ease',
            fontFamily: 'Urbanist'
          }}
          className="hover-scale-mini"
        >
          Groovelab
        </button>
      </div>

      {/* ── SPALTE 4: AUSSTATTUNG & AKUSTISCHE WARNUNGEN (HOVER-INSPECTOR & VERTIKALER RHYTHMUS) ── */}
      <div
        onMouseEnter={() => setIsHoveringDetails(true)}
        onMouseLeave={() => setIsHoveringDetails(false)}
        title={
          (equipment.length > 0 || unsuitableInsts.length > 0)
            ? `Ausstattung: ${equipment.map(formatInstrumentName).join(', ') || 'Keine'}\nAkustisch ungeeignet: ${unsuitableInsts.map(i => 'Kein ' + formatInstrumentName(i)).join(', ') || 'Keine'}`
            : 'Keine besondere Ausstattung oder Akustik-Einschränkungen'
        }
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: '6px',
          alignItems: 'center',
          flex: 1,
          minWidth: '160px',
          position: 'relative',
          cursor: (equipment.length > 2 || unsuitableInsts.length > 2) ? 'pointer' : 'default'
        }}
      >
        {/* Ausstattung (max. 2 Chips + Überlauf-Zähler) */}
        {equipment.slice(0, 2).map((inst, idx) => (
          <span
            key={`eq-${idx}`}
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: '#f1f5f9',
              color: '#334155',
              padding: '4px 9px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'Urbanist',
              whiteSpace: 'nowrap'
            }}
          >
            <Music size={12} style={{ color: '#64748b' }} />
            <span>{formatInstrumentName(inst)}</span>
          </span>
        ))}
        {equipment.length > 2 && (
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              background: '#f1f5f9',
              color: '#64748b',
              padding: '4px 8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: 'Urbanist',
              whiteSpace: 'nowrap'
            }}
          >
            +{equipment.length - 2}
          </span>
        )}

        {/* Akustisch ungeeignet (max. 2 Chips + Überlauf-Zähler zur Wahrung der einheitlichen Zeilenhöhe) */}
        {unsuitableInsts.slice(0, 2).map((inst: string, idx: number) => (
          <span
            key={`unsuitable-${idx}`}
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#b91c1c',
              border: 'none',
              padding: '4px 9px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'Urbanist',
              whiteSpace: 'nowrap'
            }}
            title={`Akustisch ungeeignet für ${formatInstrumentName(inst)}`}
          >
            <AlertCircle size={11} style={{ color: '#dc2626' }} />
            <span>Kein {formatInstrumentName(inst)}</span>
          </span>
        ))}
        {unsuitableInsts.length > 2 && (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#b91c1c',
              border: 'none',
              padding: '4px 9px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontFamily: 'Urbanist',
              whiteSpace: 'nowrap'
            }}
          >
            +{unsuitableInsts.length - 2} weitere
          </span>
        )}

        {/* ── FLOATING DETAIL-POPOVER AUF HOVER (100% TRANSPARENZ ALLER INFORMATIONEN) ── */}
        {isHoveringDetails && (equipment.length > 2 || unsuitableInsts.length > 2) && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '0',
            background: '#0f172a',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: '12px',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.35)',
            zIndex: 100,
            pointerEvents: 'none',
            minWidth: '220px',
            maxWidth: '360px',
            fontSize: '0.72rem',
            fontFamily: 'Urbanist',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {equipment.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                  Vorhandene Ausstattung ({equipment.length})
                </span>
                <span style={{ color: '#38bdf8', fontWeight: 700, lineHeight: 1.3 }}>
                  {equipment.map(formatInstrumentName).join(', ')}
                </span>
              </div>
            )}
            {unsuitableInsts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fca5a5' }}>
                  Akustisch ungeeignet ({unsuitableInsts.length})
                </span>
                <span style={{ color: '#f87171', fontWeight: 700, lineHeight: 1.3 }}>
                  {unsuitableInsts.map(i => `Kein ${formatInstrumentName(i)}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SPALTE 5: AKTIONEN (BEARBEITEN & DISKRETES LÖSCHEN) (70px) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, justifyContent: 'flex-end', width: '70px' }}>
        <button
          type="button"
          aria-label={`Raum ${room.name} bearbeiten`}
          onClick={() => onOpenEditor(room)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '7px',
            borderRadius: '8px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          title="Bearbeiten"
        >
          <Edit2 size={16} />
        </button>

        <button
          type="button"
          aria-label={`Raum ${room.name} löschen`}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRoom(room.id);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '7px',
            borderRadius: '8px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
          title="Raum löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
