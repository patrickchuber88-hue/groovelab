import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, X, Printer, Lock } from 'lucide-react';

interface RecoveryCodesModalProps {
  isOpen: boolean;
  codes: string[];
  onClose: () => void;
}

export const RecoveryCodesModal: React.FC<RecoveryCodesModalProps> = ({
  isOpen,
  codes,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    const text = `CAMPUS-GROOVELAB MASTER-ADMIN RECOVERY CODES\nErstellt am: ${new Date().toLocaleString('de-DE')}\n\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nHINWEIS: Jeder Code ist ein Einmal-Code und verbrennt nach der ersten Nutzung (Single-Use Burn).';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.70)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '480px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '18px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer'
          }}
          aria-label="Schließen"
        >
          <X size={18} />
        </button>

        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldAlert size={30} />
        </div>

        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
            Break-Glass Notfall-Codes
          </h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
            Einmalige Notfall-Schlüssel für den Zugang ohne Passkey oder Authenticator-App.
          </p>
        </div>

        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '14px',
          padding: '14px',
          fontSize: '0.78rem',
          color: '#991b1b',
          textAlign: 'left',
          lineHeight: 1.4,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          ⚠️ <strong>Wichtig:</strong> Diese Codes werden nur jetzt einmalig im Klartext angezeigt. Speichern Sie sie sicher im Passwort-Manager oder drucken Sie sie aus. Jeder Code verbrennt nach einmaliger Nutzung.
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%'
        }}>
          {codes.map((code, idx) => (
            <div key={idx} style={{
              background: '#0f172a',
              color: '#facc15',
              padding: '14px',
              borderRadius: '12px',
              fontFamily: 'monospace',
              fontSize: '1.15rem',
              fontWeight: 900,
              letterSpacing: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{code}</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: 'normal' }}>
                Code #{idx + 1}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleCopyAll}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: copied ? '#16a34a' : '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Kopiert!' : 'Alle kopieren'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Verstanden &amp; Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
