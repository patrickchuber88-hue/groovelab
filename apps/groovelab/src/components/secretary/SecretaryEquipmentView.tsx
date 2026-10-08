import React, { useMemo, useState, useCallback } from 'react';
import { 
  Search, Plus, X, Layers, Package, Sparkles, 
  DoorOpen, ShieldCheck, Info, CheckCircle2, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  EquipmentInstance, 
  EquipmentGroup, 
  SecretaryEquipmentCard, 
  getInstrumentVisualMeta 
} from './equipment/SecretaryEquipmentCard';
import { SecretaryEquipmentRoomCanvas } from './equipment/SecretaryEquipmentRoomCanvas';
import { SecretaryEquipmentEditModal } from './equipment/SecretaryEquipmentEditModal';

// Re-export core types for backwards compatibility with tabs & hooks
export type { EquipmentInstance, EquipmentGroup };
export { getInstrumentVisualMeta };

export interface SecretaryEquipmentViewProps {
  schoolId: string;
  schoolEquipment: any[];
  rooms: any[];
  selectedEquipmentRoomId: string | null;
  setSelectedEquipmentRoomId: (id: string | null) => void;
  equipmentFormName: string;
  setEquipmentFormName: (val: string) => void;
  equipmentFormQty: number;
  setEquipmentFormQty: (qty: number) => void;
  equipmentSaving: boolean;
  handleSaveEquipment: () => Promise<void>;
  equipmentSearchQuery: string;
  setEquipmentSearchQuery: (query: string) => void;
  equipmentSortFreeFirst: boolean;
  setEquipmentSortFreeFirst: React.Dispatch<React.SetStateAction<boolean>>;
  dragOverRoomId: string | null;
  setDragOverRoomId: (id: string | null) => void;
  handleDropInstrumentOnRoom: (instName: string, roomId: string) => Promise<void>;
  editingEquipmentGroup: EquipmentGroup | null;
  setEditingEquipmentGroup: (group: EquipmentGroup | null) => void;
  editGroupName: string;
  setEditGroupName: (name: string) => void;
  editGroupModel: string;
  setEditGroupModel: (model: string) => void;
  editGroupLink: string;
  setEditGroupLink: (link: string) => void;
  editGroupCoupled: boolean;
  setEditGroupCoupled: (coupled: boolean) => void;
  editGroupQty: number;
  setEditGroupQty: (qty: number) => void;
  editGroupInstancesData: EquipmentInstance[];
  setEditGroupInstancesData: React.Dispatch<React.SetStateAction<EquipmentInstance[]>>;
  handleSaveGroupEdit: () => Promise<void>;
  handleDeleteEquipmentGroup: () => Promise<void>;
  equipmentNameInputRef?: React.RefObject<HTMLInputElement>;
  equipmentQtyInputRef?: React.RefObject<HTMLInputElement>;
  parseRoomName: (name: string) => { prefix: string; number: number | null };
}

export const SecretaryEquipmentView: React.FC<SecretaryEquipmentViewProps> = ({
  schoolId,
  schoolEquipment,
  rooms,
  selectedEquipmentRoomId,
  setSelectedEquipmentRoomId,
  equipmentFormName,
  setEquipmentFormName,
  equipmentFormQty,
  setEquipmentFormQty,
  equipmentSaving,
  handleSaveEquipment,
  equipmentSearchQuery,
  setEquipmentSearchQuery,
  equipmentSortFreeFirst,
  setEquipmentSortFreeFirst,
  dragOverRoomId,
  setDragOverRoomId,
  handleDropInstrumentOnRoom,
  editingEquipmentGroup,
  setEditingEquipmentGroup,
  editGroupName,
  setEditGroupName,
  editGroupModel,
  setEditGroupModel,
  editGroupLink,
  setEditGroupLink,
  editGroupCoupled,
  setEditGroupCoupled,
  editGroupQty,
  setEditGroupQty,
  editGroupInstancesData,
  setEditGroupInstancesData,
  handleSaveGroupEdit,
  handleDeleteEquipmentGroup,
  equipmentNameInputRef,
  equipmentQtyInputRef,
  parseRoomName,
}) => {
  const [localRefreshTick, setLocalRefreshTick] = useState(0);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'free' | 'assigned'>('all');
  const [showBotenstatusInfo, setShowBotenstatusInfo] = useState(false);

  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedEquipmentRoomId);
  }, [rooms, selectedEquipmentRoomId]);

  // 1. Gather all equipment instances with assignment info from schoolEquipment
  const allInstances = useMemo(() => {
    const list: EquipmentInstance[] = [];
    const coveredRoomInsts = new Set<string>();

    schoolEquipment.forEach((eq: any) => {
      const assignedRm = rooms.find(rm => 
        Array.isArray(rm.room_instruments) && 
        rm.room_instruments.some((inst: any, idx: number) => {
          const key = `${rm.id}:::${idx}`;
          if (inst.name === eq.name && !coveredRoomInsts.has(key)) {
            coveredRoomInsts.add(key);
            return true;
          }
          return false;
        })
      );
      
      const roomInstIdx = assignedRm 
        ? assignedRm.room_instruments.findIndex((inst: any) => inst.name === eq.name) 
        : -1;
      const roomInst = assignedRm?.room_instruments?.[roomInstIdx];
      
      let model = 'Standard';
      try {
        const localModelMap = JSON.parse(localStorage.getItem(`groovelab_instrument_models_${schoolId}`) || '{}');
        if (localModelMap[eq.name]) {
          model = localModelMap[eq.name];
        } else if (roomInst?.model) {
          model = roomInst?.model;
        }
      } catch {
        if (roomInst?.model) {
          model = roomInst?.model;
        }
      }
      let linkUrl = '';
      try {
        const localLinkMap = JSON.parse(localStorage.getItem(`groovelab_instrument_links_${schoolId}`) || '{}');
        if (localLinkMap[eq.name]) {
          linkUrl = localLinkMap[eq.name];
        }
      } catch {}

      const baseName = eq.name.replace(/\s+#\d+$/, '');

      list.push({
        id: eq.id,
        fullName: eq.name,
        baseName,
        model,
        linkUrl,
        roomId: assignedRm?.id || null,
        roomName: assignedRm?.name || null,
        roomInstIdx
      });
    });

    // Room instruments that were added directly
    rooms.forEach(rm => {
      if (Array.isArray(rm.room_instruments)) {
        rm.room_instruments.forEach((inst: any, idx: number) => {
          const key = `${rm.id}:::${idx}`;
          if (!coveredRoomInsts.has(key)) {
            const baseName = inst.name.replace(/\s+#\d+$/, '');
            list.push({
              id: `room-direct-${rm.id}-${idx}`,
              fullName: inst.name,
              baseName,
              model: inst.model || 'Standard',
              linkUrl: '',
              roomId: rm.id,
              roomName: rm.name,
              roomInstIdx: idx
            });
          }
        });
      }
    });

    return list;
  }, [schoolEquipment, rooms, schoolId, localRefreshTick]);

  // Executive Top-Level KPI Calculations
  const kpis = useMemo(() => {
    const total = allInstances.length;
    const free = allInstances.filter(i => !i.roomId).length;
    const assigned = allInstances.filter(i => !!i.roomId).length;
    const equippedRooms = rooms.filter(r => Array.isArray(r.room_instruments) && r.room_instruments.length > 0).length;
    const coverage = rooms.length > 0 ? Math.round((equippedRooms / rooms.length) * 100) : 0;
    return {
      total,
      free,
      assigned,
      equippedRooms,
      totalRooms: rooms.length,
      coverage
    };
  }, [allInstances, rooms]);

  // Reversible unassignment / return to pool handler
  const handleReturnToPool = useCallback(async (instrumentFullName: string) => {
    const targetRoom = rooms.find(rm => 
      Array.isArray(rm.room_instruments) && 
      rm.room_instruments.some((inst: any) => inst.name === instrumentFullName)
    );
    if (!targetRoom || !Array.isArray(targetRoom.room_instruments)) return;

    const idxToRemove = targetRoom.room_instruments.findIndex((inst: any) => inst.name === instrumentFullName);
    if (idxToRemove === -1) return;

    const updatedInsts = targetRoom.room_instruments.filter((_: any, idx: number) => idx !== idxToRemove);

    // 1. LocalStorage cache update
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[targetRoom.id] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // 2. Immediate in-memory mutation for zero-latency UI reaction
    targetRoom.room_instruments = updatedInsts;
    setLocalRefreshTick(t => t + 1);

    // 3. Supabase persistence
    try {
      await supabase.from('rooms').update({ room_instruments: updatedInsts }).eq('id', targetRoom.id);
    } catch (err) {
      console.error('Error returning instrument to pool:', err);
    }
  }, [rooms, schoolId]);

  // Direct assignment to room helper
  const handleAssignToRoom = useCallback(async (instrumentFullName: string, targetRoomId: string) => {
    await handleDropInstrumentOnRoom(instrumentFullName, targetRoomId);
    setLocalRefreshTick(t => t + 1);
  }, [handleDropInstrumentOnRoom]);

  // 2. Group by baseName + model
  const groups = useMemo(() => {
    const groupsMap: Record<string, EquipmentGroup> = {};
    allInstances.forEach(inst => {
      const key = `${inst.baseName}:::${inst.model}`;
      if (!groupsMap[key]) {
        groupsMap[key] = {
          baseName: inst.baseName,
          model: inst.model,
          instances: []
        };
      }
      groupsMap[key].instances.push(inst);
    });

    let filteredGroups = Object.values(groupsMap);

    // Search filter
    if (equipmentSearchQuery.trim()) {
      const query = equipmentSearchQuery.toLowerCase();
      filteredGroups = filteredGroups.filter(g => 
        g.baseName.toLowerCase().includes(query) || 
        g.model.toLowerCase().includes(query)
      );
    }

    // Quick filter
    if (quickFilter === 'free' || equipmentSortFreeFirst) {
      filteredGroups = filteredGroups
        .map(g => ({
          ...g,
          instances: g.instances.filter(inst => !inst.roomId)
        }))
        .filter(g => g.instances.length > 0);
    } else if (quickFilter === 'assigned') {
      filteredGroups = filteredGroups
        .map(g => ({
          ...g,
          instances: g.instances.filter(inst => !!inst.roomId)
        }))
        .filter(g => g.instances.length > 0);
    }

    // Filter by selected room
    if (selectedRoom) {
      filteredGroups = filteredGroups
        .map(g => ({
          ...g,
          instances: g.instances.filter(inst => inst.roomId === selectedRoom.id)
        }))
        .filter(g => g.instances.length > 0);
    }

    return filteredGroups;
  }, [allInstances, equipmentSearchQuery, equipmentSortFreeFirst, quickFilter, selectedRoom]);

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 1024 ? '1fr' : '1fr 340px', 
      gap: '24px', 
      fontFamily: "'Plus Jakarta Sans', sans-serif", 
      alignItems: 'start' 
    }}>
      
      {/* LEFT COLUMN: MAIN COCKPIT & INSTRUMENTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* EXECUTIVE HEADER & TOP-LEVEL METRICS */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '24px', 
          border: '1px solid rgba(15, 23, 42, 0.06)', 
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ea4335 0%, #b71904 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(216, 30, 5, 0.25)'
                }}>
                  <Layers size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {selectedRoom ? `Instrumente in „${selectedRoom.name}“` : 'Alle Instrumente & Ausstattungen'}
                  </h3>
                </div>
                {selectedRoom && (
                  <button
                    type="button"
                    onClick={() => setSelectedEquipmentRoomId(null)}
                    style={{ 
                      background: '#f1f5f9', 
                      border: 'none', 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '0.70rem', 
                      fontWeight: 700, 
                      color: '#475569', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Raum-Filter aufheben <X size={12} />
                  </button>
                )}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 550, maxWidth: '640px' }}>
                {selectedRoom 
                  ? `Anzeige beschränkt auf den Raum „${selectedRoom.name}“. Ziehe Instrumente auf den freien Pool, um sie zu entkoppeln.`
                  : 'Didaktische Raum- und Ausstattungsplanung vor Ort. Freie Einheiten lassen sich per Drag & Drop oder Klick Räumen zuweisen.'
                }
              </p>
            </div>

            {/* Ambient ERP Trust Badge (BGB § 130 Botenstatus) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowBotenstatusInfo(prev => !prev)}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(248, 250, 252, 0.95)',
                  border: '1px solid #e2e8f0',
                  padding: '7px 12px',
                  borderRadius: '12px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s'
                }}
              >
                <ShieldCheck size={14} color="#059669" />
                <span>Rechtssicherer Botenstatus</span>
                <Info size={12} color="#94a3b8" />
              </button>

              {showBotenstatusInfo && (
                <div style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: '115%', 
                  width: '320px', 
                  background: '#ffffff', 
                  borderRadius: '18px', 
                  padding: '16px', 
                  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)', 
                  border: '1px solid #e2e8f0', 
                  zIndex: 20 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>Rechtlicher ERP-Botenstatus</span>
                    <button 
                      type="button"
                      onClick={() => setShowBotenstatusInfo(false)} 
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.70rem', color: '#64748b', lineHeight: 1.5 }}>
                    Diese Übersicht dient der internen Raum- und Stundenplanung vor Ort. Die rechtsverbindliche Vermögens-, Inventur- und Leihverwaltung verbleibt zu 100 % im Primär-ERP der Musikschule (WinMusik, MBS etc.). Kein Verleih, keine Vermietung, kein Verkauf.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4 Apple Squircle KPI Cards (Makellose visuelle Symmetrie) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '22px' }}>
            
            {/* KPI 1: Gesamtbestand */}
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '18px', 
              padding: '16px', 
              border: '1px solid rgba(15, 23, 42, 0.06)', 
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: '#fef2f2', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}>
                <Package size={18} color="#ea4335" />
              </div>
              <div>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gesamtbestand
                </span>
                <div style={{ fontSize: '1.30rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Urbanist', sans-serif", lineHeight: 1.1 }}>
                  {kpis.total} <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>Stück</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                  in {groups.length} Typen
                </span>
              </div>
            </div>

            {/* KPI 2: Sofort frei */}
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '18px', 
              padding: '16px', 
              border: '1px solid rgba(15, 23, 42, 0.06)', 
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: '#ecfdf5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}>
                <Sparkles size={18} color="#059669" />
              </div>
              <div>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Sofort frei
                </span>
                <div style={{ fontSize: '1.30rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Urbanist', sans-serif", lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {kpis.free}
                  {kpis.free > 0 && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  )}
                </div>
                <span style={{ fontSize: '0.68rem', color: kpis.free > 0 ? '#15803d' : '#94a3b8', fontWeight: 600 }}>
                  {kpis.free > 0 ? 'Bereit zur Zuweisung' : 'Alle Einheiten belegt'}
                </span>
              </div>
            </div>

            {/* KPI 3: In Räumen aktiv */}
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '18px', 
              padding: '16px', 
              border: '1px solid rgba(15, 23, 42, 0.06)', 
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: '#eff6ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}>
                <Layers size={18} color="#2563eb" />
              </div>
              <div>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  In Räumen
                </span>
                <div style={{ fontSize: '1.30rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Urbanist', sans-serif", lineHeight: 1.1 }}>
                  {kpis.assigned} <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>aktiv</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                  {kpis.total > 0 ? `${Math.round((kpis.assigned / kpis.total) * 100)}% der Flotte` : '0%'}
                </span>
              </div>
            </div>

            {/* KPI 4: Raumabdeckung */}
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '18px', 
              padding: '16px', 
              border: '1px solid rgba(15, 23, 42, 0.06)', 
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: '#f1f5f9', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}>
                <DoorOpen size={18} color="#475569" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Raumabdeckung
                </span>
                <div style={{ fontSize: '1.30rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Urbanist', sans-serif", lineHeight: 1.1 }}>
                  {kpis.equippedRooms} <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>/ {kpis.totalRooms}</span>
                </div>
                <div style={{ marginTop: '5px', width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${kpis.coverage}%`, height: '100%', background: '#475569', borderRadius: '9999px' }} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* COMMAND BAR: SEARCH, SEGMENTED CONTROLS & PRIMARY ACTION */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Left: Search & Segmented Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            
            {/* Search Input */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#ffffff', 
              padding: '0 14px', 
              borderRadius: '14px', 
              border: '1px solid #e2e8f0', 
              height: '44px', 
              boxSizing: 'border-box',
              minWidth: '220px',
              maxWidth: '340px',
              flex: 1,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)'
            }}>
              <Search size={16} color="#94a3b8" />
              <input
                value={equipmentSearchQuery}
                onChange={e => setEquipmentSearchQuery(e.target.value)}
                placeholder="Instrumente oder Modelle filtern..."
                style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontWeight: 650, width: '100%', color: '#0f172a', background: 'transparent' }}
              />
              {equipmentSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setEquipmentSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 5px', fontSize: '0.64rem', color: '#64748b', fontWeight: 700 }}>
                  /
                </kbd>
              )}
            </div>

            {/* Apple-Grade Segmented Control */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '12px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('all');
                  setEquipmentSortFreeFirst(false);
                }}
                style={{
                  border: 'none',
                  background: quickFilter === 'all' && !equipmentSortFreeFirst ? '#ffffff' : 'transparent',
                  color: quickFilter === 'all' && !equipmentSortFreeFirst ? '#0f172a' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  padding: '7px 14px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  boxShadow: quickFilter === 'all' && !equipmentSortFreeFirst ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                Alle ({allInstances.length})
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('free');
                  setEquipmentSortFreeFirst(true);
                }}
                style={{
                  border: 'none',
                  background: quickFilter === 'free' || equipmentSortFreeFirst ? '#ffffff' : 'transparent',
                  color: quickFilter === 'free' || equipmentSortFreeFirst ? '#15803d' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  padding: '7px 14px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  boxShadow: quickFilter === 'free' || equipmentSortFreeFirst ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s'
                }}
              >
                <Sparkles size={13} color={quickFilter === 'free' || equipmentSortFreeFirst ? '#16a34a' : '#94a3b8'} />
                Frei ({kpis.free})
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickFilter('assigned');
                  setEquipmentSortFreeFirst(false);
                }}
                style={{
                  border: 'none',
                  background: quickFilter === 'assigned' ? '#ffffff' : 'transparent',
                  color: quickFilter === 'assigned' ? '#0f172a' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  padding: '7px 14px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  boxShadow: quickFilter === 'assigned' ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                Im Raum ({kpis.assigned})
              </button>
            </div>
          </div>

          {/* Right: + Instrument anlegen CTA */}
          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(prev => !prev);
              setTimeout(() => equipmentNameInputRef?.current?.focus(), 80);
            }}
            style={{
              height: '44px',
              padding: '0 20px',
              background: isQuickAddOpen ? '#334155' : '#d81e05',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: isQuickAddOpen ? 'none' : '0 4px 14px rgba(216, 30, 5, 0.22)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}
          >
            {isQuickAddOpen ? (
              <>
                <X size={16} /> Schließen
              </>
            ) : (
              <>
                <Plus size={16} /> Instrument anlegen
              </>
            )}
          </button>
        </div>

        {/* EXPANDABLE QUICK-ADD DRAWER */}
        {isQuickAddOpen && (
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '20px', 
            padding: '20px', 
            border: '1.5px solid #cbd5e1', 
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} color="#d81e05" /> Neues Instrument / Ausstattung registrieren
              </span>
              <span style={{ fontSize: '0.70rem', color: '#64748b' }}>Wird dem freien Pool hinzugefügt</span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSaveEquipment();
                setIsQuickAddOpen(false);
                setLocalRefreshTick(t => t + 1);
              }}
              style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}
            >
              <input
                ref={equipmentNameInputRef}
                value={equipmentFormName}
                onChange={e => setEquipmentFormName(e.target.value)}
                placeholder="Bezeichnung (z.B. Roland FP-30X, Yamaha U1, Cajon)..."
                style={{ 
                  flex: 2, 
                  minWidth: '260px', 
                  height: '42px', 
                  padding: '0 14px', 
                  borderRadius: '10px', 
                  border: '1.5px solid #cbd5e1', 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  outline: 'none', 
                  background: '#ffffff' 
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', height: '42px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>Menge:</span>
                <input
                  ref={equipmentQtyInputRef}
                  type="number"
                  min="1"
                  max="50"
                  value={equipmentFormQty}
                  onChange={e => setEquipmentFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '38px', border: 'none', fontSize: '0.88rem', fontWeight: 900, textAlign: 'center', outline: 'none', background: 'transparent', color: '#0f172a' }}
                />
              </div>

              <button
                type="submit"
                disabled={equipmentSaving || !equipmentFormName.trim()}
                style={{
                  height: '42px',
                  padding: '0 22px',
                  background: '#d81e05',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  opacity: equipmentSaving || !equipmentFormName.trim() ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(216,30,5,0.2)'
                }}
              >
                {equipmentSaving ? 'Wird registriert...' : 'Im Pool anlegen'}
              </button>

              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                style={{
                  height: '42px',
                  padding: '0 14px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.80rem',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </form>
          </div>
        )}

        {/* INSTRUMENT GROUPS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {groups.length === 0 ? (
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '24px', 
              padding: '48px 24px', 
              textAlign: 'center', 
              border: '1px solid rgba(15, 23, 42, 0.06)', 
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)' 
            }}>
              <Package size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedRoom ? 'Keine Instrumente in diesem Raum' : 'Keine Instrumente gefunden'}
              </h4>
              <p style={{ margin: '6px 0 16px 0', fontSize: '0.78rem', color: '#64748b' }}>
                {selectedRoom 
                  ? `Ziehe freie Instrumente aus dem Pool auf „${selectedRoom.name}“, um sie zuzuweisen.`
                  : 'Passe die Suchfilter an oder registriere ein neues Instrument.'}
              </p>
              {!selectedRoom && (
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  style={{ 
                    background: '#d81e05', 
                    color: '#ffffff', 
                    border: 'none', 
                    padding: '9px 18px', 
                    borderRadius: '10px', 
                    fontSize: '0.78rem', 
                    fontWeight: 800, 
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(216,30,5,0.2)'
                  }}
                >
                  + Erstes Instrument anlegen
                </button>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <SecretaryEquipmentCard
                key={`${group.baseName}:::${group.model}`}
                group={group}
                selectedRoom={selectedRoom}
                rooms={rooms}
                onEdit={(grp) => {
                  setEditingEquipmentGroup(grp);
                  setEditGroupName(grp.baseName);
                  setEditGroupModel(grp.model);
                  setEditGroupLink(grp.instances[0]?.linkUrl || '');
                  setEditGroupCoupled(true);
                  setEditGroupQty(grp.instances.length);
                  setEditGroupInstancesData(grp.instances.map(inst => ({ ...inst })));
                }}
                onReturnToPool={handleReturnToPool}
                onAssignToRoom={handleAssignToRoom}
              />
            ))
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: SPATIAL ROOMS CANVAS & DROP HUBS */}
      <SecretaryEquipmentRoomCanvas
        rooms={rooms}
        selectedEquipmentRoomId={selectedEquipmentRoomId}
        setSelectedEquipmentRoomId={setSelectedEquipmentRoomId}
        dragOverRoomId={dragOverRoomId}
        setDragOverRoomId={setDragOverRoomId}
        handleDropInstrumentOnRoom={async (instName, roomId) => {
          await handleDropInstrumentOnRoom(instName, roomId);
          setLocalRefreshTick(t => t + 1);
        }}
        handleReturnToPool={handleReturnToPool}
        allInstances={allInstances}
        freeCount={kpis.free}
        parseRoomName={parseRoomName}
      />

      {/* EDIT MODAL FOR EQUIPMENT GROUP */}
      {editingEquipmentGroup && (
        <SecretaryEquipmentEditModal
          editingEquipmentGroup={editingEquipmentGroup}
          setEditingEquipmentGroup={setEditingEquipmentGroup}
          editGroupName={editGroupName}
          setEditGroupName={setEditGroupName}
          editGroupModel={editGroupModel}
          setEditGroupModel={setEditGroupModel}
          editGroupLink={editGroupLink}
          setEditGroupLink={setEditGroupLink}
          editGroupQty={editGroupQty}
          setEditGroupQty={setEditGroupQty}
          editGroupInstancesData={editGroupInstancesData}
          setEditGroupInstancesData={setEditGroupInstancesData}
          rooms={rooms}
          handleSaveGroupEdit={async () => {
            await handleSaveGroupEdit();
            setLocalRefreshTick(t => t + 1);
          }}
          handleDeleteEquipmentGroup={handleDeleteEquipmentGroup}
        />
      )}

    </div>
  );
};
