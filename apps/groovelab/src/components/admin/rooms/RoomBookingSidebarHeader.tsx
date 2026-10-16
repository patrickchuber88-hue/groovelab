import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';

export interface RoomBookingSidebarHeaderProps {
  brandColor: string;
  isEditing: boolean;
  selectedCampusRoomId: string;
  rooms: Array<{ id: string; name: string }>;
  onSelectRoom: (roomId: string) => void;
  hasActiveDraftOrEdit: boolean;
  onCancel: () => void;
}

/**
 * 🏛️ RoomBookingSidebarHeader (0,1% Enterprise Goldstandard)
 * Schlanker Header für das Raumbuchungs-Sidebar-Formular.
 * Kapselt Titel, Raum-Schnellauswahl und den Notausgang (✕-Dismiss-Button)
 * nach Nielsen-Norman Heuristik #3.
 */
export const RoomBookingSidebarHeader: React.FC<RoomBookingSidebarHeaderProps> = ({
  brandColor,
  isEditing,
  selectedCampusRoomId,
  rooms,
  onSelectRoom,
  hasActiveDraftOrEdit,
  onCancel
}) => {
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: 0,
        gap: '10px'
      }}
    >
      <h3
        style={{
          fontSize: '0.95rem',
          fontWeight: 900,
          color: '#1c1c1e',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}
      >
        <div
          style={{
            background: `${brandColor}15`,
            color: brandColor,
            padding: '4px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Zap size={13} strokeWidth={2.5} />
        </div>
        <span>{isEditing ? 'Buchung bearbeiten' : 'Raumanfrage'}</span>
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <select
          value={selectedCampusRoomId || ''}
          onChange={(e) => onSelectRoom(e.target.value)}
          className="premium-input"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            background: '#f2f2f7',
            color: '#1c1c1e',
            height: '28px',
            padding: '2px 24px 2px 10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            width: 'auto',
            minWidth: '100px',
            flexShrink: 1,
            border: '1px solid rgba(0, 0, 0, 0.04)',
            borderRadius: '8px',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            backgroundSize: '10px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s ease'
          }}
          aria-label="Raum auswählen"
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* ✕ Notausgang Button (Header-Level Dismiss) */}
        {hasActiveDraftOrEdit && (
          <button
            type="button"
            data-abort-action="true"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
            style={{
              border: isCloseHovered ? '1px solid #fca5a5' : '1px solid #cbd5e1',
              background: isCloseHovered ? '#fee2e2' : '#ffffff',
              color: isCloseHovered ? '#dc2626' : '#64748b',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            title="Entwurf verwerfen und Kalendervorschau schließen (Esc)"
            aria-label="Buchungsentwurf verwerfen"
          >
            <X size={13} strokeWidth={2.4} style={{ color: isCloseHovered ? '#dc2626' : '#64748b' }} />
          </button>
        )}
      </div>
    </div>
  );
};
