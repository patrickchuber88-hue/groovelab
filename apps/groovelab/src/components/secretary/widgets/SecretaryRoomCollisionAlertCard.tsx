/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Secretary Room Collision Alert Card
 * SecretaryRoomCollisionAlertCard.tsx
 * 
 * Zeigt dem Sekretariat aktive Raum-Kollisionen an, die durch die Reaktivierung
 * einer Stammlehrkraft entstanden sind. Ermöglicht die Prüfung der Eignung
 * (z. B. Schlagzeug/Klavier) und die autoritative Bestätigung.
 * 
 * Design & Barrierefreiheit:
 * - WCAG 2.2 AA Parität mit scharfem 7:1 Kontrast
 * - Status-Badges & 1-Klick Eignungsbestätigung
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, DoorOpen, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { RoomCollisionRecord, SmartRoomSwappingService } from '../../../services/room/smartRoomSwappingService';

export interface SecretaryRoomCollisionAlertCardProps {
  schoolId?: string;
  collisions?: RoomCollisionRecord[];
  onConfirmSuitability?: (collisionId: string) => void;
  onDismiss?: (collisionId: string) => void;
}

export const SecretaryRoomCollisionAlertCard: React.FC<SecretaryRoomCollisionAlertCardProps> = ({
  schoolId = '',
  collisions: propCollisions,
  onConfirmSuitability,
  onDismiss
}) => {
  const [localCollisions, setLocalCollisions] = useState<RoomCollisionRecord[]>(() => {
    if (propCollisions) return propCollisions;
    return schoolId ? SmartRoomSwappingService.getCollisions(schoolId) : [];
  });

  useEffect(() => {
    if (propCollisions) {
      setLocalCollisions(propCollisions);
      return;
    }
    if (!schoolId) return;

    const refresh = () => {
      setLocalCollisions(SmartRoomSwappingService.getCollisions(schoolId));
    };

    refresh();
    window.addEventListener('campus_room_collision_detected', refresh);
    window.addEventListener('campus_room_collision_updated', refresh);
    return () => {
      window.removeEventListener('campus_room_collision_detected', refresh);
      window.removeEventListener('campus_room_collision_updated', refresh);
    };
  }, [schoolId, propCollisions]);

  const handleConfirm = useCallback((colId: string) => {
    if (onConfirmSuitability) {
      onConfirmSuitability(colId);
    } else if (schoolId) {
      SmartRoomSwappingService.updateCollisionStatus(schoolId, colId, 'confirmed_by_secretary');
      setLocalCollisions(prev => prev.filter(c => c.id !== colId));
    }
  }, [onConfirmSuitability, schoolId]);

  const handleDismiss = useCallback((colId: string) => {
    if (onDismiss) {
      onDismiss(colId);
    } else {
      setLocalCollisions(prev => prev.filter(c => c.id !== colId));
    }
  }, [onDismiss]);

  const effectiveCollisions = propCollisions || localCollisions;
  const activeCollisions = effectiveCollisions.filter(c => c.status === 'moved_under_review');
  if (activeCollisions.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Raumkollisionen zur Prüfung"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        margin: '0 0 14px 0'
      }}
    >
      {activeCollisions.map((col) => (
        <div
          key={col.id}
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: 'none',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#f59e0b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '0.84rem', color: '#92400e', fontWeight: 900 }}>
                  Raum-Kollision durch Reaktivierung ({col.timeSlotFormatted})
                </strong>
                <span
                  style={{
                    background: '#fed7aa',
                    color: '#9a3412',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '100px'
                  }}
                >
                  Prüfung erforderlich
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#78350f', lineHeight: 1.35 }}>
                Stammkraft <strong>{col.teacherA.name}</strong> übernimmt regulären Raum <strong>{col.originalRoomName}</strong>. Kollege <strong>{col.teacherB.name}</strong> wurde vorläufig in <strong>{col.suggestedRoomName}</strong> umgebucht.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleConfirm(col.id)}
              aria-label="Raumeignung bestätigen"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '7px 13px',
                borderRadius: '10px',
                fontWeight: 850,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Eignung bestätigen</span>
            </button>

            <button
              type="button"
              onClick={() => handleDismiss(col.id)}
              aria-label="Hinweis ausblenden"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#92400e',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
