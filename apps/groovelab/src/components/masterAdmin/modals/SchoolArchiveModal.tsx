import React, { useState, useEffect, useRef } from 'react';
import { Trash2, PauseCircle, Archive, AlertTriangle, X } from 'lucide-react';
import type { School } from '../MasterAdminTypes';
import { supabase } from '../../../lib/supabase';

interface SchoolArchiveModalProps {
  archiveModalSchool: School | null;
  onClose: () => void;
  onPauseSchool: (school: School) => void;
  onDeleteSchool: (id: string, name: string, hasInvoices?: boolean) => void;
}

export const SchoolArchiveModal: React.FC<SchoolArchiveModalProps> = ({
  archiveModalSchool,
  onClose,
  onPauseSchool,
  onDeleteSchool
}) => {
  const [confirmMode, setConfirmMode] = useState<'none' | 'delete' | 'archive'>('none');
  const [confirmInput, setConfirmInput] = useState('');
  const [hasInvoices, setHasInvoices] = useState<boolean | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  // Check invoice presence whenever target school changes
  useEffect(() => {
    setConfirmMode('none');
    setConfirmInput('');

    if (!archiveModalSchool) {
      setHasInvoices(null);
      setLoadingInvoices(false);
      return;
    }

    const targetSchoolId = archiveModalSchool.id;
    let isMounted = true;
    setLoadingInvoices(true);

    async function checkInvoices() {
      try {
        const { count, error } = await supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', targetSchoolId);

        if (isMounted) {
          setHasInvoices(!error && (count ?? 0) > 0);
          setLoadingInvoices(false);
        }
      } catch {
        if (isMounted) {
          setHasInvoices(false);
          setLoadingInvoices(false);
        }
      }
    }

    void checkInvoices();

    return () => {
      isMounted = false;
    };
  }, [archiveModalSchool]);

  // Global Escape key handler for BFSG / WCAG 2.2 AA compliance
  useEffect(() => {
    if (!archiveModalSchool) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [archiveModalSchool, onClose]);

  // Auto-focus confirmation input when switching mode
  useEffect(() => {
    if (confirmMode !== 'none') {
      setTimeout(() => confirmInputRef.current?.focus(), 80);
    }
  }, [confirmMode]);

  if (!archiveModalSchool) return null;

  const isConfirmed = confirmInput.trim() === archiveModalSchool.name.trim();

  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
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
          fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingRight: '36px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: confirmMode !== 'none' ? '#fee2e2' : '#fef2f2',
            color: '#dc2626',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {confirmMode === 'archive' ? (
              <Archive size={24} />
            ) : confirmMode === 'delete' ? (
              <AlertTriangle size={24} />
            ) : (
              <Trash2 size={24} />
            )}
          </div>
          <div>
            <h3 id="archive-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              {confirmMode === 'archive'
                ? 'DSGVO-Purge & GoBD-Archivierung'
                : confirmMode === 'delete'
                ? 'Endgültige Löschung bestätigen'
                : 'Schule verwalten / archivieren'}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Aktion für „{archiveModalSchool.name}“ ({archiveModalSchool.city || 'Standort hinterlegt'})
            </p>
          </div>
        </div>

        {/* VIEW 1: Standard Action Selection */}
        {confirmMode === 'none' && (
          <>
            {/* Regulatory Notice Box */}
            <div style={{
              background: '#fffbeb',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '0.82rem',
              color: '#92400e',
              lineHeight: '1.5'
            }}>
              {loadingInvoices ? (
                <span>Prüfe GoBD-Rechnungsstatus...</span>
              ) : hasInvoices ? (
                <>
                  <strong>GoBD-Schutz aktiv (AO 147):</strong> Für diese Schule existieren steuerliche Rechnungsbelege. Ein physisches Löschen der Rechnungsbelege ist gesetzlich untersagt. Sie können die Schule vorübergehend <strong>pausieren</strong> oder nach <strong>DSGVO Art. 17 bereinigen &amp; GoBD-archivieren</strong> (alle Schüler, Lehrer und Audio-Assets werden vernichtet; Rechnungen bleiben 10 Jahre gesetzlich versiegelt).
                </>
              ) : (
                <>
                  <strong>Hinweis zur Datenintegrität:</strong> Für diese Testschule existieren keine Rechnungsbelege. Sie können die Schule entweder vorübergehend <strong>pausieren</strong> (Zugriff gesperrt, Daten bleiben erhalten) oder <strong>vollständig löschen</strong> (alle Räume, Schüler und Datensätze werden unwiderruflich entfernt).
                </>
              )}
            </div>

            {/* Action Buttons */}
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <PauseCircle size={16} /> Schule pausieren / archivieren
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Zugang sperren</span>
              </button>

              {/* Action 2: Purge & Archive OR Hard Delete */}
              {hasInvoices ? (
                <button
                  type="button"
                  onClick={() => setConfirmMode('archive')}
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
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Archive size={16} /> DSGVO-Daten löschen &amp; GoBD-Archivieren
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    color: '#ffffff',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.22)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    10 Jahre Schutz
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmMode('delete')}
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
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={16} /> Testschule &amp; alle Daten endgültig löschen
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    color: '#ffffff',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.22)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Unwiderruflich
                  </span>
                </button>
              )}
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
          </>
        )}

        {/* VIEW 2: Typed Name Confirmation Stage */}
        {confirmMode !== 'none' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isConfirmed) {
                onDeleteSchool(archiveModalSchool.id, archiveModalSchool.name, hasInvoices === true);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Warning Box */}
            <div style={{
              background: '#fef2f2',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '0.82rem',
              color: '#991b1b',
              lineHeight: '1.5'
            }}>
              <strong>
                {confirmMode === 'archive'
                  ? 'Rechtlicher Warnhinweis (DSGVO Art. 17 & GoBD / AO 147):'
                  : 'Unwiderruflicher Vorgang:'}
              </strong>{' '}
              {confirmMode === 'archive'
                ? 'Alle Schüler-Accounts, didaktische Audio-Aufnahmen, Loopstation-Takes, Stundenpläne und Lehrer-Zuordnungen werden sofort und endgültig physisch vernichtet. Die Rechnungsbelege verbleiben für 10 Jahre im revisionssicheren GoBD-Archiv.'
                : 'Alle Räume, Pads, Schüler, Stundenpläne und der Datensatz der Schule selbst werden unwiderruflich aus der Datenbank gelöscht. Es können keine Daten wiederhergestellt werden.'}
            </div>

            {/* Typed confirmation input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="confirm-school-name" style={{ fontSize: '0.80rem', fontWeight: 750, color: '#1e293b' }}>
                Tippen Sie zur Bestätigung den Schulnamen <strong>„{archiveModalSchool.name}“</strong> ein:
              </label>
              <input
                id="confirm-school-name"
                ref={confirmInputRef}
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={archiveModalSchool.name}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: isConfirmed ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setConfirmMode('none');
                  setConfirmInput('');
                }}
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
                Zurück
              </button>

              <button
                type="submit"
                disabled={!isConfirmed}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: isConfirmed ? '#dc2626' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 850,
                  fontSize: '0.82rem',
                  cursor: isConfirmed ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s ease'
                }}
              >
                {confirmMode === 'archive'
                  ? 'DSGVO-Purge & Archivierung ausführen'
                  : 'Schule jetzt endgültig löschen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
