/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Teacher Room Collision Decision Modal
 * TeacherRoomCollisionDecisionModal.tsx
 * 
 * Informiert Kollege B respektvoll über die Reaktivierung der Stammlehrkraft
 * und bietet 2 faire Optionen:
 * 1. Automatisch vorgeschlagenen Ausweichraum annehmen.
 * 2. Selbst einen anderen freien Raum aus dem Pool wählen.
 * 
 * Barrierefreiheit & Design:
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Navigation mit Enter/Space)
 * - Apple Squircle Radien & Plus Jakarta Sans Typografie
 */

import React, { useState } from 'react';
import { X, Check, RefreshCw, DoorOpen, Music, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { RoomCollisionRecord } from '../../../services/room/smartRoomSwappingService';

export interface TeacherRoomCollisionDecisionModalProps {
  isOpen: boolean;
  collision: RoomCollisionRecord | null;
  availableRooms: any[];
  onAcceptSuggestedRoom: (collisionId: string) => void;
  onSelectAlternativeRoom: (collisionId: string, newRoomId: string, newRoomName: string) => void;
  onClose: () => void;
}

export const TeacherRoomCollisionDecisionModal: React.FC<TeacherRoomCollisionDecisionModalProps> = ({
  isOpen,
  collision,
  availableRooms = [],
  onAcceptSuggestedRoom,
  onSelectAlternativeRoom,
  onClose
}) => {
  const [isPickingCustom, setIsPickingCustom] = useState(false);
  const [selectedCustomRoomId, setSelectedCustomRoomId] = useState<string>('');

  if (!isOpen || !collision) return null;

  const validAlternatives = availableRooms.filter(
    r => String(r.id) !== String(collision.originalRoomId) && String(r.id) !== String(collision.suggestedRoomId)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collision-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.70)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid #0f172a',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#f59e0b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2
                id="collision-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.02rem',
                  fontWeight: 900,
                  color: '#92400e',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                Raumkollision durch Reaktivierung
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                {collision.timeSlotFormatted} • Stammlehrkraft zurück
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            style={{
              background: '#ffffff',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.45 }}>
            Stammlehrkraft <strong>{collision.teacherA.name}</strong> ist heute überraschend wieder im Dienst und übernimmt ihren regulären Raum <strong>{collision.originalRoomName}</strong>.
          </p>

          {/* Current Auto-Shifted Room Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Automatisch zugewiesener Ausweichraum (unter Vorbehalt)
              </span>
              <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                Empfehlung
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <DoorOpen size={22} color="#0284c7" />
              <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 900 }}>
                {collision.suggestedRoomName}
              </strong>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Das Sekretariat wurde informiert und prüft parallel die Eignung der Instrumentenausstattung.
            </span>
          </div>

          {/* Custom Room Picker Expandable */}
          {isPickingCustom && (
            <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Verfügbare Alternativen für diesen Zeitraum:
              </label>
              {validAlternatives.length === 0 ? (
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic' }}>
                  Keine weiteren freien Räume zu dieser Zeit verfügbar.
                </span>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {validAlternatives.map(alt => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => setSelectedCustomRoomId(String(alt.id))}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: selectedCustomRoomId === String(alt.id) ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: selectedCustomRoomId === String(alt.id) ? '#eff6ff' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <strong style={{ fontSize: '0.80rem', color: '#0f172a' }}>{alt.name || `Raum ${alt.room_number}`}</strong>
                      <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{alt.floor || 'EG'} • Max. {alt.max_students || 1} Sch.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Decision Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {!isPickingCustom ? (
              <>
                <button
                  type="button"
                  onClick={() => onAcceptSuggestedRoom(collision.id)}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px 16px',
                    borderRadius: '14px',
                    fontWeight: 850,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>{collision.suggestedRoomName} annehmen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPickingCustom(true)}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid #cbd5e1',
                    padding: '10px 16px',
                    borderRadius: '14px',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} color="#64748b" />
                  <span>Anderen freien Raum wählen...</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={!selectedCustomRoomId}
                  onClick={() => {
                    const picked = validAlternatives.find(r => String(r.id) === selectedCustomRoomId);
                    if (picked) {
                      onSelectAlternativeRoom(collision.id, String(picked.id), picked.name || `Raum ${picked.room_number}`);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: selectedCustomRoomId ? '#0284c7' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontWeight: 850,
                    fontSize: '0.82rem',
                    cursor: selectedCustomRoomId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={15} />
                  <span>Gewählten Raum bestätigen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPickingCustom(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontWeight: 750,
                    fontSize: '0.80rem',
                    cursor: 'pointer'
                  }}
                >
                  Zurück
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
