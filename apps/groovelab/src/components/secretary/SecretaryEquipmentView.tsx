import React, { useMemo } from 'react';
import { 
  Search, Plus, QrCode, Trash2, Edit2, Link as LinkIcon, 
  Check, X, ChevronRight, Sliders, ExternalLink, RefreshCw,
  DoorOpen, School, Sparkles
} from 'lucide-react';
import QRCode from 'react-qr-code';

export interface EquipmentInstance {
  id: string;
  fullName: string;
  baseName: string;
  model: string;
  linkUrl: string;
  roomId: string | null;
  roomName: string | null;
  roomInstIdx: number;
}

export interface EquipmentGroup {
  baseName: string;
  model: string;
  instances: EquipmentInstance[];
}

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

    // Gather any room instruments that were added directly in the room editor modal and are not in schoolEquipment
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
  }, [schoolEquipment, rooms, schoolId]);

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

    // Apply search filter
    if (equipmentSearchQuery.trim()) {
      const query = equipmentSearchQuery.toLowerCase();
      filteredGroups = filteredGroups.filter(g => 
        g.baseName.toLowerCase().includes(query) || 
        g.model.toLowerCase().includes(query)
      );
    }

    // Apply filter: only free
    if (equipmentSortFreeFirst) {
      filteredGroups = filteredGroups
        .map(g => ({
          ...g,
          instances: g.instances.filter(inst => !inst.roomId)
        }))
        .filter(g => g.instances.length > 0);
    }

    // 3. Filter groups based on selected room
    if (selectedRoom) {
      filteredGroups = filteredGroups
        .map(g => ({
          ...g,
          instances: g.instances.filter(inst => inst.roomId === selectedRoom.id)
        }))
        .filter(g => g.instances.length > 0);
    }

    return filteredGroups;
  }, [allInstances, equipmentSearchQuery, equipmentSortFreeFirst, selectedRoom]);

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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 1024 ? '1fr' : '1fr 300px', gap: '24px', fontFamily: 'Inter, sans-serif', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: WIDGET */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Selected Room Header or Title */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <School size={20} color="#ea4335" />
            {selectedRoom ? `Instrumente in „${selectedRoom.name}“` : 'Alle Instrumente & Ausstattungen'}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
            {selectedRoom 
              ? `Es werden nur Instrumente angezeigt, die dem Raum „${selectedRoom.name}“ zugeordnet sind. Klicke auf ein Instrument, um es zu bearbeiten.`
              : 'Hier werden alle Instrumente der Musikschule aufgelistet. Ziehe freie Instrumente auf die Räume rechts, um sie zuzuweisen.'
            }
          </p>
        </div>

        {/* Unified Instruments List Widget */}
        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Unified Search, Filter & Creation Row Widget */}
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Creation Form inline (Left) */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEquipment();
              }}
              style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: 0, flex: 2, minWidth: '320px' }}
            >
              <input
                ref={equipmentNameInputRef}
                value={equipmentFormName}
                onChange={e => setEquipmentFormName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && equipmentFormName.trim()) {
                    e.preventDefault();
                    equipmentQtyInputRef?.current?.focus();
                    equipmentQtyInputRef?.current?.select();
                  }
                }}
                placeholder='Neues Instrument anlegen...'
                style={{ width: '280px', height: '38px', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, outline: 'none', background: 'white' }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', height: '38px', boxSizing: 'border-box', flexShrink: 0 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>Menge:</span>
                <input
                  ref={equipmentQtyInputRef}
                  type="number"
                  min="1"
                  max="50"
                  value={equipmentFormQty}
                  onChange={e => setEquipmentFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '30px', border: 'none', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center', outline: 'none', background: 'transparent' }}
                />
              </div>

              <button
                type="submit"
                disabled={equipmentSaving || !equipmentFormName.trim()}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  background: 'linear-gradient(135deg, #ea4335 0%, #d63031 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  opacity: equipmentSaving || !equipmentFormName.trim() ? 0.6 : 1,
                  boxShadow: '0 2px 6px rgba(234,67,53,0.15)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {equipmentSaving ? 'Wird angelegt...' : 'Anlegen'}
              </button>
            </form>

            {/* Vertical separator */}
            <div style={{ width: '1.5px', height: '24px', background: '#cbd5e1', margin: '0 4px', flexShrink: 0 }} />

            {/* Search & Filter (Right) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '180px', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', height: '38px', boxSizing: 'border-box', flexShrink: 0 }}>
              <Search size={16} color="#94a3b8" />
              <input
                value={equipmentSearchQuery}
                onChange={e => setEquipmentSearchQuery(e.target.value)}
                placeholder="Instrumente durchsuchen..."
                style={{ border: 'none', outline: 'none', fontSize: '0.78rem', fontWeight: 700, width: '100%', color: '#0f172a', background: 'transparent' }}
              />
            </div>
            
            <button
              type="button"
              onClick={() => setEquipmentSortFreeFirst(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: equipmentSortFreeFirst ? '#fce8e6' : 'white',
                border: equipmentSortFreeFirst ? '1.5px solid #ea4335' : '1.5px solid #cbd5e1',
                color: equipmentSortFreeFirst ? '#ea4335' : '#475569',
                padding: '0 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Urbanist',
                height: '38px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            >
              <span>Freie Instrumente</span>
            </button>
          </div>

          {/* Unified List items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groups.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700, padding: '24px 0', margin: 0 }}>
                {selectedRoom ? 'Keine Instrumente in diesem Raum' : 'Keine Instrumente im Pool'}
              </p>
            ) : (
              groups.map((group) => {
                // Find first free instance in this group for dragging
                const firstFreeInstance = group.instances.find(inst => !inst.roomId);
                const hasFree = !!firstFreeInstance;

                return (
                  <div 
                    key={`${group.baseName}:::${group.model}`}
                    draggable={hasFree && !selectedRoom}
                    onDragStart={(e) => {
                      if (!firstFreeInstance) return;
                      e.dataTransfer.setData("text/plain", firstFreeInstance.fullName);
                      e.dataTransfer.effectAllowed = "copyMove";
                    }}
                    onClick={() => {
                      setEditingEquipmentGroup(group);
                      setEditGroupName(group.baseName);
                      setEditGroupModel(group.model);
                      setEditGroupLink(group.instances[0]?.linkUrl || '');
                      setEditGroupCoupled(true);
                      setEditGroupQty(group.instances.length);
                      setEditGroupInstancesData(group.instances.map(inst => ({ ...inst })));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #f1f5f9',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                      gap: '16px'
                    }}
                    className="hover-scale-mini"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      
                      {/* Horizontal wrapper for name/model and locations */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {group.baseName}
                            {group.instances[0]?.linkUrl && (group.instances[0].linkUrl.startsWith('http://') || group.instances[0].linkUrl.startsWith('https://')) && (
                              <a 
                                href={group.instances[0].linkUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#ea4335', display: 'inline-flex' }}
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650 }}>
                            Modell: {group.model}
                          </span>
                        </div>

                        {/* Location Pills Row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                          {group.instances.map((inst, iIdx) => (
                            <span 
                              key={iIdx} 
                              style={{ 
                                fontSize: '0.64rem', 
                                fontWeight: 800, 
                                padding: '2px 8px', 
                                borderRadius: '6px',
                                background: inst.roomId ? '#e2e8f0' : '#dcfce7',
                                color: inst.roomId ? '#475569' : '#15803d',
                                border: inst.roomId ? '1px solid #cbd5e1' : '1px solid #86efac'
                              }}
                            >
                              {inst.roomName ? inst.roomName : 'Frei'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0f172a', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        Menge: {group.instances.length}
                      </span>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <Edit2 size={13} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: ROOMS / LOCATIONS PANEL */}
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
              Räume & Zuweisung
            </h4>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
              Ziehe freie Instrumente hierher
            </span>
          </div>
          {selectedEquipmentRoomId && (
            <button
              onClick={() => setSelectedEquipmentRoomId(null)}
              style={{ background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
            >
              Filter lösen ✕
            </button>
          )}
        </div>

        {/* All Rooms Filter Button */}
        <div
          onClick={() => setSelectedEquipmentRoomId(null)}
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            background: !selectedEquipmentRoomId ? '#fce8e6' : '#f8fafc',
            border: !selectedEquipmentRoomId ? '1.5px solid #ea4335' : '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: !selectedEquipmentRoomId ? '#ea4335' : '#1e293b' }}>
            <School size={14} color={!selectedEquipmentRoomId ? '#ea4335' : '#64748b'} /> Alle Räume
          </span>
          <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b' }}>
            {allInstances.length}
          </span>
        </div>

        {/* Rooms List */}
        {sortedRooms.map(rm => {
          const isSelected = selectedEquipmentRoomId === rm.id;
          const isDragOver = dragOverRoomId === rm.id;
          
          return (
            <div 
              key={rm.id}
              onClick={() => setSelectedEquipmentRoomId(rm.id)}
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
                borderRadius: '12px', 
                cursor: 'pointer', 
                background: isSelected ? '#fce8e6' : isDragOver ? '#e6f4ea' : '#f8fafc',
                border: isSelected ? '1.5px solid #ea4335' : isDragOver ? '2px dashed #34a853' : '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: isSelected ? '#ea4335' : '#1e293b' }}>
                  <DoorOpen size={14} color={isSelected ? '#ea4335' : '#64748b'} /> {rm.name}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#86868b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                  {rm.floor || 'Allgemein'}
                </span>
              </div>
              
              {/* Short summary of configured instruments */}
              {rm.room_instruments && rm.room_instruments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                  {rm.room_instruments.map((inst: any, idx: number) => (
                    <span key={idx} style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 650, background: 'white', padding: '1px 4px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                      {inst.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL FOR EQUIPMENT GROUP */}
      {editingEquipmentGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Instrument bearbeiten
                </h4>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  {editingEquipmentGroup.baseName} ({editingEquipmentGroup.instances.length} Stück)
                </span>
              </div>
              <button
                onClick={() => setEditingEquipmentGroup(null)}
                style={{ border: 'none', background: '#f1f5f9', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Name & Model */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Name / Bezeichnung</label>
                  <input
                    value={editGroupName}
                    onChange={e => setEditGroupName(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.80rem', fontWeight: 700, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Modell</label>
                  <input
                    value={editGroupModel}
                    onChange={e => setEditGroupModel(e.target.value)}
                    placeholder="z.B. Yamaha U1, Roland FP-30X"
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.80rem', fontWeight: 700, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Link / URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Handbuch / Hersteller-Link</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <LinkIcon size={14} color="#94a3b8" />
                  <input
                    value={editGroupLink}
                    onChange={e => setEditGroupLink(e.target.value)}
                    placeholder="https://..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', fontSize: '0.80rem', fontWeight: 600, width: '100%', color: '#0f172a' }}
                  />
                </div>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e293b', display: 'block' }}>Bestand / Menge</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Erhöhen oder reduzieren</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditGroupQty(Math.max(1, editGroupQty - 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 900 }}
                  >-</button>
                  <span style={{ fontSize: '0.90rem', fontWeight: 900, minWidth: '24px', textAlign: 'center' }}>{editGroupQty}</span>
                  <button
                    type="button"
                    onClick={() => setEditGroupQty(editGroupQty + 1)}
                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 900 }}
                  >+</button>
                </div>
              </div>

              {/* Individual Instances List with Room Selectors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Exemplare & Raumzuweisung</span>
                {editGroupInstancesData.map((inst, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                      #{idx + 1} {inst.fullName}
                    </span>
                    <select
                      value={inst.roomId || ''}
                      onChange={(e) => {
                        const newRoomId = e.target.value || null;
                        const next = [...editGroupInstancesData];
                        next[idx].roomId = newRoomId;
                        next[idx].roomName = rooms.find(r => r.id === newRoomId)?.name || null;
                        setEditGroupInstancesData(next);
                      }}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, outline: 'none', background: 'white' }}
                    >
                      <option value="">Freier Pool (Kein Raum)</option>
                      {rooms.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={handleDeleteEquipmentGroup}
                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={13} /> Löschen
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingEquipmentGroup(null)}
                  style={{ background: 'white', border: '1px solid #cbd5e1', color: '#64748b', padding: '8px 16px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveGroupEdit}
                  style={{ background: '#ea4335', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(234,67,53,0.25)' }}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
