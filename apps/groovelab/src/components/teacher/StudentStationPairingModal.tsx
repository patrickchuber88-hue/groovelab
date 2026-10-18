import React, { useEffect, useRef } from 'react';
import { QrCode, Tablet, Camera, Music, X, ArrowRight, ShieldCheck } from 'lucide-react';

export interface StudentStationPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowBadge: () => void;
  onScanScreen?: () => void;
  onNavigateRepertoire?: () => void;
}

/**
 * 0,1% Enterprise Goldstandard: Didaktisches Vor-Ort-Pairing für Schüler
 * Verhindert Remote-Spoofing und leitet Schüler kinderleicht zum optischen Handshake
 * an die iPad-Station im Proberaum.
 */
export const StudentStationPairingModal: React.FC<StudentStationPairingModalProps> = ({
  isOpen,
  onClose,
  onShowBadge,
  onScanScreen,
  onNavigateRepertoire
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Esc-Key Listener für Barrierefreiheit (WCAG 2.2 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Am Band-Platz einchecken"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '480px',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dialog schließen"
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
            cursor: 'pointer',
            transition: 'background 0.2s',
            touchAction: 'manipulation'
          }}
        >
          <X size={18} />
        </button>

        {/* Soft-Tinted Apple Icon (Zero Color-Clash, border: none) */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(251, 188, 5, 0.14)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d97706',
            marginBottom: '16px'
          }}
        >
          <Tablet size={30} />
        </div>

        {/* Header & Subtitle */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#d97706',
            marginBottom: '6px'
          }}
        >
          Vor-Ort-Check-in
        </span>
        <h3
          style={{
            fontSize: '22px',
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 10px 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.25
          }}
        >
          Bist du im Proberaum vor Ort?
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: '#475569',
            lineHeight: 1.5,
            margin: '0 0 24px 0',
            fontWeight: 500
          }}
        >
          Die iPads an den Instrumenten (Schlagzeug, E-Gitarre, Bass, Keys) sind fest mit deiner Musikschule verbunden. 
          So schaltest du deinen Platz sekundenschnell frei:
        </p>

        {/* Action 1: Ausweis vor Kamera halten (Apple Filled, border: none) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onShowBadge();
            }}
            aria-label="Meinen Ausweis-QR-Code auf dem Smartphone anzeigen"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              borderRadius: '16px',
              background: '#fbbc05',
              border: 'none',
              color: '#0f172a',
              fontSize: '15px',
              fontWeight: 850,
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'transform 0.15s ease',
              touchAction: 'manipulation',
              width: '100%'
            }}
          >
            <QrCode size={19} style={{ flexShrink: 0 }} />
            <span>Meinen Ausweis-QR-Code anzeigen</span>
          </button>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            Halte den angezeigten QR-Code einfach vor die Kamera deines iPad-Platzes.
          </span>

          {/* Action 2: Sekundär - Bildschirm scannen (optional) */}
          {onScanScreen && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onScanScreen();
              }}
              aria-label="iPad-Bildschirm mit Handykamera scannen"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderRadius: '14px',
                background: '#f8fafc',
                border: 'none',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '4px',
                touchAction: 'manipulation'
              }}
            >
              <Camera size={16} style={{ flexShrink: 0 }} />
              <span>iPad-Bildschirm mit Handykamera scannen</span>
            </button>
          )}

          {/* Trennlinie */}
          <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />

          {/* Action 3: Zuhause Songs üben */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigateRepertoire) {
                onNavigateRepertoire();
              } else if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('campus_navigate_tab', { detail: { tab: 'repertoire' } }));
              }
            }}
            aria-label="Ich bin zuhause: Zum Song-Repertoire wechseln"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              touchAction: 'manipulation'
            }}
          >
            <Music size={15} style={{ flexShrink: 0 }} />
            <span>Ich bin zuhause: Songs üben</span>
            <ArrowRight size={14} style={{ flexShrink: 0 }} />
          </button>
        </div>

        {/* Security / Privacy Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '20px',
            fontSize: '11px',
            color: '#94a3b8',
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} color="#10b981" />
          <span>Geschützter Proberaum • Zero Remote-Spoofing</span>
        </div>
      </div>
    </div>
  );
};

export default StudentStationPairingModal;
