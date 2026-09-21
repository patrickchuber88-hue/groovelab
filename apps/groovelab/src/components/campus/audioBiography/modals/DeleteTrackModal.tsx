import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteModalTarget {
  type: 'track' | 'playlist';
  id: string;
  title: string;
  playlistId?: string;
}

interface DeleteTrackModalProps {
  target: DeleteModalTarget;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLight: boolean;
}

export const DeleteTrackModal: React.FC<DeleteTrackModalProps> = ({
  target,
  onClose,
  onConfirm,
  isLight
}) => {
  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Löschung bestätigen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
    >
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: `1px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.3)'}`,
        borderRadius: '24px',
        padding: '26px',
        maxWidth: '440px',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
            border: '1.5px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            flexShrink: 0
          }}>
            <Trash2 size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: colors.textPrimary }}>
              {target.type === 'track' ? 'Song wirklich löschen?' : 'Playlist wirklich löschen?'}
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 700 }}>
              "{target.title}"
            </span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.84rem', color: colors.textSecondary, lineHeight: 1.45 }}>
          {target.type === 'track'
            ? 'Möchtest du diesen Song wirklich aus deiner Playlist und dem Speicher entfernen? Diese Aktion kann nicht rückgängig gemacht werden.'
            : 'Möchtest du diese Playlist wirklich löschen? (Die Meilensteine deiner Audio-Biografie bleiben davon 100% erhalten)'}
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '100px',
              border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1.2,
              padding: '12px',
              borderRadius: '100px',
              border: 'none',
              background: '#ef4444',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
            }}
            className="hover-scale"
          >
            <Trash2 size={15} />
            <span>Löschen bestätigen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
