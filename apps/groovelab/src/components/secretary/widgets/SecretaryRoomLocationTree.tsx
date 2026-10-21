import React, { useState } from 'react';
import { School, Building2, Plus, Edit2, Trash2, HelpCircle, Layers, ChevronDown, ChevronRight } from 'lucide-react';

export interface SecretaryRoomLocationTreeProps {
  buildings: any[];
  rooms: any[];
  selectedBuildingId: string;
  onSelectBuilding: (id: string) => void;
  selectedFloor: string;
  onSelectFloor: (floor: string) => void;
  onOpenBuildingEditor: (b?: any) => void;
  onDeleteBuilding: (id: string) => void;
  onAddFloor: () => void;
  onDeleteFloor: (floor: string) => void;
  dragHoveredBuildingId: string | null;
  setDragHoveredBuildingId: (id: string | null) => void;
  dragHoveredFloor: string | null;
  setDragHoveredFloor: (floor: string | null) => void;
  onDropRoomToBuilding: (roomId: string, buildingId: string | null) => void;
  onDropRoomToFloor: (roomId: string, floor: string) => void;
  allFloorsList: string[];
  addedFloors: string[];
  getFloorColor: (name: string) => { avatarBg: string; avatarColor: string };
}

export function SecretaryRoomLocationTree({
  buildings = [],
  rooms = [],
  selectedBuildingId,
  onSelectBuilding,
  selectedFloor,
  onSelectFloor,
  onOpenBuildingEditor,
  onDeleteBuilding,
  onAddFloor,
  onDeleteFloor,
  dragHoveredBuildingId,
  setDragHoveredBuildingId,
  dragHoveredFloor,
  setDragHoveredFloor,
  onDropRoomToBuilding,
  onDropRoomToFloor,
  allFloorsList = [],
  addedFloors = [],
  getFloorColor
}: SecretaryRoomLocationTreeProps) {
  const [collapsedBuildings, setCollapsedBuildings] = useState<Record<string, boolean>>({});

  const toggleBuildingCollapse = (bId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedBuildings(prev => ({ ...prev, [bId]: !prev[bId] }));
  };

  const totalRooms = rooms.length;
  const unassignedRooms = rooms.filter(r => !r.building_id);
  const isTabletOrMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;

  return (
    <div style={{
      width: isTabletOrMobile ? '100%' : '330px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '22px 18px',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      background: '#ffffff',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
      boxSizing: 'border-box'
    }}>
      {/* HEADER: Title & Quick Add */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <School size={20} style={{ color: '#0f172a' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
            Standort & Ebenen
          </h3>
        </div>
        <button
          type="button"
          aria-label="Neues Gebäude anlegen"
          onClick={() => onOpenBuildingEditor()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '9px',
            padding: '5px 10px',
            fontSize: '0.72rem',
            fontWeight: 800,
            background: 'rgba(234, 67, 53, 0.08)',
            color: '#ea4335',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Urbanist',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Plus size={13} />
          <span>Gebäude</span>
        </button>
      </div>

      {/* TREE CONTENT LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '680px', overflowY: 'auto', paddingRight: '2px' }}>
        
        {/* TOP ITEM: Alle Gebäude & Räume */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Alle Gebäude und ${totalRooms} Räume anzeigen`}
          onClick={() => {
            onSelectBuilding('All');
            onSelectFloor('All');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectBuilding('All');
              onSelectFloor('All');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: selectedBuildingId === 'All' && selectedFloor === 'All' ? 'rgba(234, 67, 53, 0.09)' : 'transparent',
            color: selectedBuildingId === 'All' && selectedFloor === 'All' ? '#ea4335' : '#0f172a',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Building2 size={16} style={{ color: selectedBuildingId === 'All' && selectedFloor === 'All' ? '#ea4335' : '#64748b' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'Urbanist' }}>
              Gesamtübersicht
            </span>
          </div>
          <span style={{
            padding: '2px 8px',
            borderRadius: '8px',
            background: selectedBuildingId === 'All' && selectedFloor === 'All' ? 'rgba(234, 67, 53, 0.12)' : '#f1f5f9',
            color: selectedBuildingId === 'All' && selectedFloor === 'All' ? '#ea4335' : '#64748b',
            fontSize: '0.70rem',
            fontWeight: 800
          }}>
            {totalRooms}
          </span>
        </div>

        {/* BUILDINGS WITH NESTED FLOORS */}
        {buildings.map((b) => {
          const isBuildingActive = selectedBuildingId === b.id;
          const isBuildingHovered = dragHoveredBuildingId === b.id;
          const isCollapsed = !!collapsedBuildings[b.id];
          const bRooms = rooms.filter(r => r.building_id === b.id);

          return (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              
              {/* BUILDING NODE */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`Gebäude ${b.name} (${bRooms.length} Räume) auswählen`}
                onClick={() => {
                  onSelectBuilding(b.id);
                  onSelectFloor('All');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectBuilding(b.id);
                    onSelectFloor('All');
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragHoveredBuildingId(b.id);
                }}
                onDragLeave={() => setDragHoveredBuildingId(null)}
                onDrop={(e) => {
                  const roomId = e.dataTransfer.getData('roomId');
                  if (roomId) onDropRoomToBuilding(roomId, b.id);
                  setDragHoveredBuildingId(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: isBuildingHovered ? '2px dashed #ea4335' : 'none',
                  background: isBuildingHovered
                    ? '#fce8e6'
                    : isBuildingActive && selectedFloor === 'All'
                      ? 'rgba(234, 67, 53, 0.09)'
                      : '#ffffff',
                  color: isBuildingActive && selectedFloor === 'All' ? '#ea4335' : '#0f172a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                className="hover-scale-mini"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <button
                    type="button"
                    onClick={(e) => toggleBuildingCollapse(b.id, e)}
                    style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                    aria-label={isCollapsed ? "Ebenen aufklappen" : "Ebenen einklappen"}
                  >
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.name}
                    </span>
                    {b.address && (
                      <span style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.address}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '7px',
                    background: isBuildingActive ? 'rgba(234, 67, 53, 0.12)' : '#f1f5f9',
                    color: isBuildingActive ? '#ea4335' : '#64748b',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {bRooms.length}
                  </span>
                  <button
                    type="button"
                    aria-label={`Gebäude ${b.name} bearbeiten`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBuildingEditor(b);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px' }}
                    title="Bearbeiten"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Gebäude ${b.name} löschen`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBuilding(b.id);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px' }}
                    title="Löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* NESTED FLOORS FOR THIS BUILDING (OR OVERALL) */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '22px' }}>
                  {allFloorsList.map((fl) => {
                    const isFloorActive = (selectedBuildingId === b.id || selectedBuildingId === 'All') && selectedFloor === fl;
                    const isFloorHovered = dragHoveredFloor === fl;
                    const floorCount = bRooms.filter(r => (!r.floor || r.floor === 'Allgemein' ? 'EG' : r.floor) === fl).length;
                    const colorSet = getFloorColor(fl);

                    return (
                      <div
                        key={`${b.id}-${fl}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ebene ${fl} (${floorCount} Räume) auswählen`}
                        onClick={() => {
                          onSelectBuilding(b.id);
                          onSelectFloor(fl);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectBuilding(b.id);
                            onSelectFloor(fl);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragHoveredFloor(fl);
                        }}
                        onDragLeave={() => setDragHoveredFloor(null)}
                        onDrop={(e) => {
                          const roomId = e.dataTransfer.getData('roomId');
                          if (roomId) {
                            onDropRoomToBuilding(roomId, b.id);
                            onDropRoomToFloor(roomId, fl);
                          }
                          setDragHoveredFloor(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: '10px',
                          border: isFloorHovered ? '2px dashed #ea4335' : 'none',
                          background: isFloorHovered
                            ? '#fce8e6'
                            : isFloorActive
                              ? 'rgba(234, 67, 53, 0.08)'
                              : 'transparent',
                          color: isFloorActive ? '#ea4335' : '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                        className="hover-scale-mini"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: colorSet.avatarBg,
                            color: colorSet.avatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.62rem',
                            fontWeight: 900
                          }}>
                            {fl.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: isFloorActive ? 800 : 600, fontFamily: 'Urbanist' }}>
                            {fl}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          color: isFloorActive ? '#ea4335' : '#94a3b8',
                          fontWeight: 700
                        }}>
                          {floorCount} {floorCount === 1 ? 'Raum' : 'Räume'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* UNASSIGNED ROOMS (OHNE ZUORDNUNG) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Räume ohne Zuordnung (${unassignedRooms.length}) anzeigen`}
          onClick={() => {
            onSelectBuilding('');
            onSelectFloor('All');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectBuilding('');
              onSelectFloor('All');
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragHoveredBuildingId('None');
          }}
          onDragLeave={() => setDragHoveredBuildingId(null)}
          onDrop={(e) => {
            const roomId = e.dataTransfer.getData('roomId');
            if (roomId) onDropRoomToBuilding(roomId, null);
            setDragHoveredBuildingId(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '12px',
            border: dragHoveredBuildingId === 'None' ? '2px dashed #ea4335' : 'none',
            background: dragHoveredBuildingId === 'None'
              ? '#fce8e6'
              : selectedBuildingId === ''
                ? 'rgba(234, 67, 53, 0.09)'
                : 'transparent',
            color: selectedBuildingId === '' ? '#ea4335' : '#64748b',
            cursor: 'pointer',
            marginTop: '6px',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={15} style={{ color: selectedBuildingId === '' ? '#ea4335' : '#94a3b8' }} />
            <span style={{ fontSize: '0.80rem', fontWeight: 800, fontFamily: 'Urbanist' }}>
              Ohne Zuordnung
            </span>
          </div>
          <span style={{
            padding: '2px 7px',
            borderRadius: '7px',
            background: selectedBuildingId === '' ? 'rgba(234, 67, 53, 0.12)' : '#f1f5f9',
            color: selectedBuildingId === '' ? '#ea4335' : '#94a3b8',
            fontSize: '0.68rem',
            fontWeight: 800
          }}>
            {unassignedRooms.length}
          </span>
        </div>

        {/* QUICK ACTION: EBENE HINZUFÜGEN */}
        <button
          type="button"
          onClick={onAddFloor}
          aria-label="Neue Ebene anlegen"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '8px',
            padding: '7px 12px',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
            background: 'transparent',
            color: '#64748b',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Urbanist',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Layers size={13} />
          <span>+ Stockwerk anlegen</span>
        </button>
      </div>
    </div>
  );
}
