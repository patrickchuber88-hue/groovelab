import React from 'react';
import { Trash2 } from 'lucide-react';
import type { School } from '../MasterAdminTypes';

interface SchoolArchiveModalProps {
  archiveModalSchool: School | null;
  onClose: () => void;
  onPauseSchool: (school: School) => void;
  onDeleteSchool: (id: string, name: string) => void;
}

export const SchoolArchiveModal: React.FC<SchoolArchiveModalProps> = ({
  archiveModalSchool,
  onClose,
  onPauseSchool,
  onDeleteSchool
}) => {
  if (!archiveModalSchool) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-modal-title"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Trash2 size={24} />
          </div>
          <div>
            <h3 id="archive-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              Schule verwalten / löschen
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Aktion für „{archiveModalSchool.name}“ ({archiveModalSchool.city || 'Standort hinterlegt'})
            </p>
          </div>
        </div>

        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '14px',
          padding: '14px 16px',
          fontSize: '0.82rem',
          color: '#92400e',
          lineHeight: '1.5'
        }}>
          <strong>Hinweis zur Datenintegrität:</strong> Sie können die Schule entweder vorübergehend <strong>pausieren/archivieren</strong> (Zugriff wird gesperrt, Daten bleiben erhalten) oder <strong>vollständig löschen</strong> (alle Räume, iPads, Schüler und Datensätze werden unwiderruflich entfernt).
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Action 1: Soft Pause */}
          <button
            type="button"
            onClick={() => onPauseSchool(archiveModalSchool)}
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <span>⏸️ Schule pausieren / archivieren</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Zugang sperren</span>
          </button>

          {/* Action 2: Permanent Delete */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Möchten Sie die Schule "${archiveModalSchool.name}" und ALLE zugehörigen Daten wirklich endgültig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden!`)) {
                onDeleteSchool(archiveModalSchool.id, archiveModalSchool.name);
              }
            }}
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              fontWeight: 850,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <span>🗑️ Schule &amp; alle Daten endgültig löschen</span>
            <span style={{ fontSize: '0.74rem', color: '#fecaca', fontWeight: 600 }}>Unwiderruflich</span>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};
