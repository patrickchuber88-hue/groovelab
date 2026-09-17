import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Scale, AlertTriangle, Check, X, Music } from 'lucide-react';

interface CopyrightUploadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assetTitle?: string;
  assetType?: 'audio' | 'sheet_music' | 'exercise';
}

export const CopyrightUploadConfirmModal: React.FC<CopyrightUploadConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  assetTitle = 'Unterrichtsmaterial / Audio-Asset',
  assetType = 'audio'
}) => {
  const [hasConfirmedRights, setHasConfirmedRights] = useState<boolean>(false);
  const [rememberForSession, setRememberForSession] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setHasConfirmedRights(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecuteConfirm = () => {
    if (!hasConfirmedRights) return;
    if (rememberForSession && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cg_copyright_upload_acknowledged', 'true');
    }
    onConfirm();
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="copyright-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '520px',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706'
            }}>
              <Scale size={22} />
            </div>
            <div>
              <h3 id="copyright-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Urheberrechts- &amp; Freistellungs-Check
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                Didaktischer Schutz gem. § 60a UrhG &amp; Art. 6 Digital Services Act (DSA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            style={{
              border: 'none',
              background: 'rgba(15, 23, 42, 0.05)',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Music size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
              Asset: <strong style={{ color: '#0f172a' }}>{assetTitle}</strong> ({assetType === 'audio' ? 'Audio-Playalong' : 'Didaktische Datei'})
            </div>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.55 }}>
            Als Lehrkraft versichern Sie, dass dieses didaktische Material:
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Gemeinfrei ist</strong> (Urheber seit mind. 70 Jahren verstorben), oder
              </li>
              <li>
                <strong>Von Ihnen selbst komponiert/eingespielt</strong> wurde (volles eigenes Urheberrecht), oder
              </li>
              <li>
                Ausschließlich im Rahmen der <strong>gesetzlichen Schranke für Unterricht und Lehre (§ 60a UrhG)</strong> dem eng abgegrenzten Schüler- oder Ensemblekreis zur Verfügung gestellt wird.
              </li>
            </ul>
          </div>

          <div style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.75rem',
            color: '#92400e',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Das Hochladen kommerzieller Original-Masteraufnahmen (z. B. von Streamingdiensten gerippt) oder urheberrechtlich geschützter Verlags-Partituren als PDF ist untersagt.
            </span>
          </div>

          {/* Mandatory Checkbox */}
          <div
            role="button"
            tabIndex={0}
            aria-checked={hasConfirmedRights}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setHasConfirmedRights(!hasConfirmedRights);
              }
            }}
            onClick={() => setHasConfirmedRights(!hasConfirmedRights)}
            style={{
              border: hasConfirmedRights ? '2px solid #34a853' : '1.5px solid #cbd5e1',
              background: hasConfirmedRights ? '#f0fdf4' : '#ffffff',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '5px',
              border: hasConfirmedRights ? '2px solid #34a853' : '2px solid #94a3b8',
              background: hasConfirmedRights ? '#34a853' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              {hasConfirmedRights && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </div>
            <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
              Ich bestätige die urheberrechtliche Konformität und stelle Campus-Groovelab von Ansprüchen Dritter frei.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!hasConfirmedRights}
            onClick={handleExecuteConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: hasConfirmedRights ? '#34a853' : '#cbd5e1',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: hasConfirmedRights ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={16} />
            <span>Bestätigen &amp; Hochladen</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
