import React, { useState } from 'react';
import { 
  Music, Disc, Volume2, Mic, Package, GripVertical, 
  DoorOpen, Sparkles, ExternalLink, Edit2, ChevronDown, 
  ChevronUp, X, Check, ArrowRight, Wrench, AlertTriangle
} from 'lucide-react';

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

export interface InstrumentVisualMeta {
  category: 'keys' | 'drums' | 'strings' | 'studio' | 'brass' | 'bowed' | 'misc';
  label: string;
  icon: React.ReactNode;
  bgGradient: string;
  badgeBg: string;
  badgeColor: string;
  accentColor: string;
}

export const getInstrumentVisualMeta = (baseName: string): InstrumentVisualMeta => {
  const lower = (baseName || '').toLowerCase();
  
  if (/piano|klavier|flügel|synth|keyboard|clavinova|cembalo|rhodes|organ|orgel|akkordeon/.test(lower)) {
    return {
      category: 'keys',
      label: 'Tasten',
      icon: <Music size={18} color="#2563eb" />,
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      badgeBg: '#eff6ff',
      badgeColor: '#1e40af',
      accentColor: '#3b82f6'
    };
  }
  if (/drum|schlagzeug|becken|snare|cajon|percussion|pauke|conga|bongo|hihat|hi-hat|tom/.test(lower)) {
    return {
      category: 'drums',
      label: 'Schlagwerk',
      icon: <Disc size={18} color="#d97706" />,
      bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      badgeBg: '#fffbeb',
      badgeColor: '#92400e',
      accentColor: '#f59e0b'
    };
  }
  if (/gitarre|guitar|bass|ukulele|harfe|mandoline|laute|banjo/.test(lower)) {
    return {
      category: 'strings',
      label: 'Saiten',
      icon: <Volume2 size={18} color="#db2777" />,
      bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
      badgeBg: '#fdf2f8',
      badgeColor: '#9d174d',
      accentColor: '#ec4899'
    };
  }
  if (/mikro|mic|voc|audio|mischpult|mixer|box|lautsprecher|monitor|pa|kopfhörer|interface|headphone/.test(lower)) {
    return {
      category: 'studio',
      label: 'Studio & PA',
      icon: <Mic size={18} color="#9333ea" />,
      bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
      badgeBg: '#faf5ff',
      badgeColor: '#6b21a8',
      accentColor: '#a855f7'
    };
  }
  if (/violine|geige|cello|bratsche|kontrabass|viola/.test(lower)) {
    return {
      category: 'bowed',
      label: 'Streicher',
      icon: <Music size={18} color="#059669" />,
      bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      badgeBg: '#ecfdf5',
      badgeColor: '#065f46',
      accentColor: '#10b981'
    };
  }
  if (/flöte|trompete|sax|horn|posaune|klarinette|tuba|oboe|fagott/.test(lower)) {
    return {
      category: 'brass',
      label: 'Bläser',
      icon: <Volume2 size={18} color="#ea580c" />,
      bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
      badgeBg: '#fff7ed',
      badgeColor: '#9a3412',
      accentColor: '#f97316'
    };
  }
  return {
    category: 'misc',
    label: 'Ausstattung',
    icon: <Package size={18} color="#64748b" />,
    bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    badgeBg: '#f8fafc',
    badgeColor: '#334155',
    accentColor: '#64748b'
  };
};

export interface SecretaryEquipmentCardProps {
  group: EquipmentGroup;
  selectedRoom: any;
  rooms: any[];
  onEdit: (group: EquipmentGroup) => void;
  onReturnToPool: (instrumentFullName: string) => Promise<void>;
  onAssignToRoom: (instrumentFullName: string, roomId: string) => Promise<void>;
}

export const SecretaryEquipmentCard: React.FC<SecretaryEquipmentCardProps> = ({
  group,
  selectedRoom,
  rooms,
  onEdit,
  onReturnToPool,
  onAssignToRoom,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'ready' | 'service' | 'defect'>(() => {
    try {
      return (localStorage.getItem(`groovelab_eq_health_${group.baseName}`) as any) || 'ready';
    } catch {
      return 'ready';
    }
  });

  const toggleHealthStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = healthStatus === 'ready' ? 'service' : healthStatus === 'service' ? 'defect' : 'ready';
    setHealthStatus(nextStatus);
    try {
      localStorage.setItem(`groovelab_eq_health_${group.baseName}`, nextStatus);
    } catch {}
  };

  const firstFreeInstance = group.instances.find(inst => !inst.roomId);
  const hasFree = !!firstFreeInstance;
  const freeCount = group.instances.filter(i => !i.roomId).length;
  const visualMeta = getInstrumentVisualMeta(group.baseName);
  const freeInstanceTag = firstFreeInstance 
    ? (firstFreeInstance.fullName.match(/#\d+$/)?.[0] || `#${group.instances.indexOf(firstFreeInstance) + 1}`) 
    : '';

  // Aggregation of assigned rooms with strict deduplication
  const roomAssignmentsMap: Record<string, { roomId: string; roomName: string; count: number; instances: EquipmentInstance[] }> = {};
  group.instances.forEach(inst => {
    if (inst.roomId && inst.roomName) {
      if (!roomAssignmentsMap[inst.roomId]) {
        roomAssignmentsMap[inst.roomId] = {
          roomId: inst.roomId,
          roomName: inst.roomName,
          count: 0,
          instances: []
        };
      }
      roomAssignmentsMap[inst.roomId].count += 1;
      roomAssignmentsMap[inst.roomId].instances.push(inst);
    }
  });
  const roomAssignments = Object.values(roomAssignmentsMap);

  return (
    <div 
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.07)',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}
    >
      {/* CARD MAIN ROW */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          gap: '16px',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(prev => !prev);
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          
          {/* Tactile Drag Grip (Only for free instances) */}
          {hasFree && !selectedRoom && (
            <div 
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                if (!firstFreeInstance) return;
                e.dataTransfer.setData("text/plain", firstFreeInstance.fullName);
                e.dataTransfer.effectAllowed = "copyMove";
              }}
              title="Klicke & ziehe freies Instrument auf einen Raum in der rechten Spalte"
              style={{ 
                color: '#94a3b8', 
                cursor: 'grab', 
                display: 'flex', 
                alignItems: 'center', 
                flexShrink: 0,
                padding: '4px',
                borderRadius: '6px',
                transition: 'color 0.15s'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={18} />
            </div>
          )}

          {/* Instrument Family Squircle Icon */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '13px',
            background: visualMeta.bgGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 6px rgba(0,0,0,0.04)'
          }}>
            {visualMeta.icon}
          </div>

          {/* Core Info & Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {group.baseName}
              </span>

              {/* Apple SF Health Status Pill (Klickbar für Zustands-Ampel) */}
              <button
                type="button"
                onClick={toggleHealthStatus}
                title={`Betriebsstatus: ${healthStatus === 'ready' ? 'Einsatzbereit' : healthStatus === 'service' ? 'Wartung / Stimmung fällig' : 'Defekt gemeldet'} (Klicken zum Umschalten)`}
                style={{
                  border: 'none',
                  background: healthStatus === 'ready' ? '#ecfdf5' : healthStatus === 'service' ? '#fffbeb' : '#fef2f2',
                  color: healthStatus === 'ready' ? '#15803d' : healthStatus === 'service' ? '#b45309' : '#b91c1c',
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: healthStatus === 'ready' ? '#22c55e' : healthStatus === 'service' ? '#f59e0b' : '#ef4444' 
                }} />
                {healthStatus === 'ready' ? 'Bereit' : healthStatus === 'service' ? 'Wartung' : 'Defekt'}
              </button>

              {group.model && group.model !== 'Standard' && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  color: '#475569', 
                  fontWeight: 650, 
                  background: '#f1f5f9', 
                  padding: '2px 8px', 
                  borderRadius: '6px' 
                }}>
                  Modell: {group.model}
                </span>
              )}

              {group.instances[0]?.linkUrl && (group.instances[0].linkUrl.startsWith('http://') || group.instances[0].linkUrl.startsWith('https://')) && (
                <a 
                  href={group.instances[0].linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    color: '#ea4335', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '3px', 
                    fontSize: '0.68rem', 
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={12} /> Handbuch
                </a>
              )}
            </div>

            {/* Aggregated Badges Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              
              {/* Free Pool Pill with Concrete Instance Tag (#3) & 1-Click Apple Quick-Assign */}
              {freeCount > 0 && (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <span 
                    draggable={!selectedRoom}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      if (!firstFreeInstance) return;
                      e.dataTransfer.setData("text/plain", firstFreeInstance.fullName);
                      e.dataTransfer.effectAllowed = "copyMove";
                    }}
                    title="Ziehe diese Einheit auf einen Raum in der rechten Spalte oder klicke für Schnell-Zuweisung"
                    style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      padding: '3px 10px', 
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: selectedRoom ? 'default' : 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickAssign(prev => !prev);
                    }}
                  >
                    <Sparkles size={12} color="#16a34a" />
                    {freeCount > 1 ? `${freeCount}× Frei (z. B. ${freeInstanceTag})` : `Frei: ${freeInstanceTag} (Ziehbar)`}
                    <ChevronDown size={11} style={{ opacity: 0.7 }} />
                  </span>

                  {/* Apple Action Popover for Tablet & 1-Click Desktop */}
                  {showQuickAssign && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 100,
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(15, 23, 42, 0.10)',
                        borderRadius: '14px',
                        padding: '6px',
                        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
                        minWidth: '220px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Zuweisen an Raum:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowQuickAssign(false)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {rooms.map(rm => (
                          <button
                            key={rm.id}
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setShowQuickAssign(false);
                              if (firstFreeInstance) {
                                await onAssignToRoom(firstFreeInstance.fullName, rm.id);
                              }
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              padding: '6px 8px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background 0.12s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <DoorOpen size={13} color="#64748b" />
                              {rm.name}
                            </span>
                            {rm.floor && (
                              <span style={{ fontSize: '0.60rem', color: '#64748b', background: '#f8fafc', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                {rm.floor}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clean Deduplicated Room Location Badges */}
              {roomAssignments.map((ra) => {
                const isHovered = hoveredRoomId === ra.roomId;
                return (
                  <span 
                    key={ra.roomId}
                    onMouseEnter={() => setHoveredRoomId(ra.roomId)}
                    onMouseLeave={() => setHoveredRoomId(null)}
                    style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 700, 
                      padding: '3px 10px', 
                      borderRadius: '8px',
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DoorOpen size={12} color="#64748b" />
                    <span>{ra.roomName} {ra.count > 1 ? `(${ra.count}×)` : ''}</span>
                    
                    {/* Hover Quick-Detach Button */}
                    <button
                      type="button"
                      title={`Aus „${ra.roomName}“ lösen und zurück in den Pool holen`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const instToDetach = ra.instances[0];
                        if (instToDetach) {
                          await onReturnToPool(instToDetach.fullName);
                        }
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: isHovered ? '#ea4335' : '#94a3b8',
                        cursor: 'pointer',
                        padding: '1px 3px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                      }}
                      aria-label={`Aus ${ra.roomName} lösen`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right Action Cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          
          {/* Total Quantity Pill */}
          <span style={{ 
            fontSize: '0.74rem', 
            fontWeight: 800, 
            color: '#0f172a', 
            background: '#f8fafc', 
            padding: '5px 12px', 
            borderRadius: '9999px', 
            border: '1px solid #e2e8f0' 
          }}>
            {group.instances.length} {group.instances.length === 1 ? 'Einheit' : 'Einheiten'}
          </span>

          {/* Edit Modal Trigger */}
          <button
            type="button"
            title="Instrument bearbeiten"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(group);
            }}
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '10px', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Edit2 size={14} />
          </button>

          {/* Expand/Collapse Chevron */}
          <div 
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: isExpanded ? '#f1f5f9' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'all 0.15s'
            }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

        </div>
      </div>

      {/* EXPANDABLE UNIT ACCORDION DRAWER (Der 0,1% Luxus-Faktor) */}
      {isExpanded && (
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Physische Exemplare ({group.instances.length} Einheiten)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Direkte Raumzuweisung ohne Drag & Drop
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {group.instances.map((inst, idx) => {
              const isAssigned = !!inst.roomId;
              return (
                <div 
                  key={inst.id || idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ 
                      fontSize: '0.66rem', 
                      fontWeight: 800, 
                      color: isAssigned ? '#2563eb' : '#16a34a',
                      background: isAssigned ? '#eff6ff' : '#f0fdf4',
                      padding: '2px 6px',
                      borderRadius: '5px'
                    }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inst.fullName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={inst.roomId || ''}
                      onChange={async (e) => {
                        const targetRoomId = e.target.value;
                        if (!targetRoomId) {
                          await onReturnToPool(inst.fullName);
                        } else {
                          await onAssignToRoom(inst.fullName, targetRoomId);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: isAssigned ? '#0f172a' : '#059669',
                        background: '#ffffff',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="">Freier Pool</option>
                      {rooms.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name}</option>
                      ))}
                    </select>

                    {isAssigned && (
                      <button
                        type="button"
                        title="In den freien Pool zurücklegen"
                        onClick={async () => {
                          await onReturnToPool(inst.fullName);
                        }}
                        style={{
                          border: 'none',
                          background: '#f1f5f9',
                          color: '#64748b',
                          cursor: 'pointer',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
