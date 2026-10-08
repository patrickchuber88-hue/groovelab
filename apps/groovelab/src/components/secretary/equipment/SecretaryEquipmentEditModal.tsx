import React from 'react';
import { X, Trash2, Link as LinkIcon, Check, Plus, Minus } from 'lucide-react';
import { EquipmentGroup, EquipmentInstance } from './SecretaryEquipmentCard';

export interface SecretaryEquipmentEditModalProps {
  editingEquipmentGroup: EquipmentGroup;
  setEditingEquipmentGroup: (group: EquipmentGroup | null) => void;
  editGroupName: string;
  setEditGroupName: (name: string) => void;
  editGroupModel: string;
  setEditGroupModel: (model: string) => void;
  editGroupLink: string;
  setEditGroupLink: (link: string) => void;
  editGroupQty: number;
  setEditGroupQty: (qty: number) => void;
  editGroupInstancesData: EquipmentInstance[];
  setEditGroupInstancesData: React.Dispatch<React.SetStateAction<EquipmentInstance[]>>;
  rooms: any[];
  handleSaveGroupEdit: () => Promise<void>;
  handleDeleteEquipmentGroup: () => Promise<void>;
}

export const SecretaryEquipmentEditModal: React.FC<SecretaryEquipmentEditModalProps> = ({
  editingEquipmentGroup,
  setEditingEquipmentGroup,
  editGroupName,
  setEditGroupName,
  editGroupModel,
  setEditGroupModel,
  editGroupLink,
  setEditGroupLink,
  editGroupQty,
  setEditGroupQty,
  editGroupInstancesData,
  setEditGroupInstancesData,
  rooms,
  handleSaveGroupEdit,
  handleDeleteEquipmentGroup,
}) => {
  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="equipment-group-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setEditingEquipmentGroup(null);
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 id="equipment-group-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Instrument bearbeiten
            </h4>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              {editingEquipmentGroup.baseName} ({editingEquipmentGroup.instances.length} Einheiten)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingEquipmentGroup(null)}
            style={{ 
              border: 'none', 
              background: '#f1f5f9', 
              color: '#64748b', 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Name & Model */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Name / Bezeichnung</label>
              <input
                value={editGroupName}
                onChange={e => setEditGroupName(e.target.value)}
                style={{ 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  border: '1.5px solid #cbd5e1', 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Modell</label>
              <input
                value={editGroupModel}
                onChange={e => setEditGroupModel(e.target.value)}
                placeholder="z.B. Yamaha U1, Roland FP-30X"
                style={{ 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  border: '1.5px solid #cbd5e1', 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Link / URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Handbuch / Hersteller-Link</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
              <LinkIcon size={15} color="#94a3b8" />
              <input
                value={editGroupLink}
                onChange={e => setEditGroupLink(e.target.value)}
                placeholder="https://..."
                style={{ border: 'none', background: 'transparent', outline: 'none', padding: '9px 0', fontSize: '0.80rem', fontWeight: 600, width: '100%', color: '#0f172a' }}
              />
            </div>
          </div>

          {/* Quantity Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'block' }}>Bestand / Menge</span>
              <span style={{ fontSize: '0.70rem', color: '#64748b' }}>Erhöhen oder reduzieren</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditGroupQty(Math.max(1, editGroupQty - 1))}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  background: '#ffffff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#0f172a'
                }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontSize: '0.95rem', fontWeight: 900, minWidth: '28px', textAlign: 'center', color: '#0f172a' }}>
                {editGroupQty}
              </span>
              <button
                type="button"
                onClick={() => setEditGroupQty(editGroupQty + 1)}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  background: '#ffffff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#0f172a'
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Individual Instances List with Room Selectors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Exemplare & Raumzuweisung
            </span>
            {editGroupInstancesData.map((inst, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '10px', 
                  background: '#f8fafc', 
                  padding: '10px 14px', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0' 
                }}
              >
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e293b' }}>
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
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.76rem', 
                    fontWeight: 700, 
                    outline: 'none', 
                    background: '#ffffff',
                    color: inst.roomId ? '#0f172a' : '#15803d',
                    cursor: 'pointer'
                  }}
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

        {/* MODAL FOOTER */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
          <button
            type="button"
            onClick={handleDeleteEquipmentGroup}
            style={{ 
              background: '#fee2e2', 
              border: 'none', 
              color: '#ef4444', 
              padding: '9px 16px', 
              borderRadius: '10px', 
              fontSize: '0.76rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              transition: 'background 0.15s'
            }}
          >
            <Trash2 size={14} /> Löschen
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setEditingEquipmentGroup(null)}
              style={{ 
                background: '#ffffff', 
                border: '1px solid #cbd5e1', 
                color: '#64748b', 
                padding: '9px 18px', 
                borderRadius: '10px', 
                fontSize: '0.76rem', 
                fontWeight: 700, 
                cursor: 'pointer' 
              }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSaveGroupEdit}
              style={{ 
                background: '#d81e05', 
                border: 'none', 
                color: '#ffffff', 
                padding: '9px 22px', 
                borderRadius: '10px', 
                fontSize: '0.76rem', 
                fontWeight: 800, 
                cursor: 'pointer', 
                boxShadow: '0 2px 8px rgba(216,30,5,0.25)',
                transition: 'background 0.15s'
              }}
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
