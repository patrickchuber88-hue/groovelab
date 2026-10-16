import React, { useState } from 'react';
import { X, Send, Check } from 'lucide-react';

export interface RoomBookingActionDockProps {
  selectedRoom: { id: string; name: string } | null;
  isRoomOccupied: boolean;
  isEditing: boolean;
  selectedBooking: { isSchedule?: boolean; [key: string]: unknown } | null;
  bookingTargetType: string;
  brandColor: string;
  hasActiveDraftOrEdit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * 🏛️ RoomBookingActionDock (0,1% Enterprise Goldstandard)
 * Kapselt das 2-Button Aktionsdock für Raumanfragen & Termin-Edits.
 * Garantiert Nielsen-Norman Heuristik #3 (Emergency Exit) mit Apple-konformem
 * Abbruch-Button (Ghost-Outline) und primärem Aktions-Button (Solid Campus Green).
 */
export const RoomBookingActionDock: React.FC<RoomBookingActionDockProps> = ({
  selectedRoom,
  isRoomOccupied,
  isEditing,
  selectedBooking,
  bookingTargetType,
  brandColor,
  hasActiveDraftOrEdit,
  onSubmit,
  onCancel
}) => {
  const [isCancelHovered, setIsCancelHovered] = useState(false);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  const isDisabled = !selectedRoom || isRoomOccupied;

  const submitLabel = !selectedRoom
    ? 'Wähle einen Raum'
    : isEditing
      ? (selectedBooking?.isSchedule ? 'Als Einzeltermin übernehmen' : 'Änderung speichern')
      : bookingTargetType === 'external'
        ? 'Externe Blockierung speichern'
        : `${selectedRoom.name} anfragen`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        marginTop: '2px',
        boxSizing: 'border-box'
      }}
    >
      {/* 🔴 Notausgang / Cancel Button (Apple Squircle Ghost) */}
      {hasActiveDraftOrEdit && (
        <button
          type="button"
          data-abort-action="true"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          onMouseEnter={() => setIsCancelHovered(true)}
          onMouseLeave={() => setIsCancelHovered(false)}
          style={{
            flex: '0 0 auto',
            minWidth: '94px',
            height: '38px',
            padding: '0 14px',
            borderRadius: '10px',
            border: 'none',
            background: isCancelHovered ? '#dc2626' : '#ea4335',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isCancelHovered ? '0 4px 12px rgba(234, 67, 53, 0.28)' : '0 1px 2px rgba(0,0,0,0.04)',
            whiteSpace: 'nowrap'
          }}
          title="Entwurf verwerfen und Kalendervorschau ausblenden (Esc)"
          aria-label="Buchung abbrechen und Entwurf verwerfen"
        >
          <X size={13} strokeWidth={2.6} style={{ color: '#ffffff' }} />
          <span>Abbrechen</span>
        </button>
      )}

      {/* 🟢 Primärer Aktions-Button (Solid Campus Green) */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        onMouseEnter={() => {
          if (!isDisabled) setIsSubmitHovered(true);
        }}
        onMouseLeave={() => setIsSubmitHovered(false)}
        style={{
          flex: 1,
          height: '38px',
          padding: '10px 14px',
          borderRadius: '10px',
          border: 'none',
          background: isDisabled ? '#94a3b8' : brandColor,
          color: '#ffffff',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.55 : (isSubmitHovered ? 0.92 : 1),
          transform: (!isDisabled && isSubmitHovered) ? 'translateY(-1px)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: isDisabled ? 'none' : '0 4px 12px rgba(0,0,0,0.06)',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={submitLabel}
        aria-label={submitLabel}
      >
        {isEditing ? (
          <Check size={14} strokeWidth={2.6} style={{ flexShrink: 0 }} />
        ) : (
          <Send size={13} strokeWidth={2.4} style={{ flexShrink: 0 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {submitLabel}
        </span>
      </button>
    </div>
  );
};
