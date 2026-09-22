import React from 'react';
import { X, Printer, Award, Sparkles, CheckCircle } from 'lucide-react';
import { ContinentDefinition } from '../../../../types/worldTour';

interface WorldTourDiplomaModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  instrumentName?: string | null;
  continent?: ContinentDefinition | null;
  unlockedCount: number;
  totalCountries: number;
}

export const WorldTourDiplomaModal: React.FC<WorldTourDiplomaModalProps> = ({
  isOpen,
  onClose,
  studentName,
  instrumentName,
  continent,
  unlockedCount,
  totalCountries
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Campus Weltmusiker Diplom"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '680px',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1.5px solid #e2e8f0',
        animation: 'scaleUp 0.2s ease-out'
      }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} color="#eab308" />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              Offizielles Campus-Weltmusiker-Diplom
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>Drucken (A4)</span>
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Certificate Body (A4 Styled Page) */}
        <div style={{
          padding: '36px 32px',
          background: '#fdfbf7',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          border: '12px solid #fef3c7',
          margin: '16px',
          borderRadius: '16px'
        }}>
          {/* Watermark Emblem */}
          <div style={{
            fontSize: '3rem',
            marginBottom: '10px'
          }}>
            {continent?.emoji || '🌍'}
          </div>

          <span style={{
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#b45309',
            marginBottom: '4px'
          }}>
            Campus-Groovelab Musikschule
          </span>

          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: 850,
            color: '#0f172a',
            margin: '0 0 16px 0',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          }}>
            WELTMUSIKER-DIPLOM
          </h1>

          <p style={{ fontSize: '0.95rem', color: '#475569', margin: '0 0 18px 0' }}>
            Hiermit wird feierlich beurkundet, dass
          </p>

          <div style={{
            fontSize: '1.5rem',
            fontWeight: 850,
            color: '#0f172a',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '4px',
            minWidth: '240px',
            marginBottom: '14px'
          }}>
            {studentName}
          </div>

          <p style={{ fontSize: '0.92rem', color: '#475569', maxWidth: '440px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
            am Instrument <strong>{instrumentName || 'Musikschul-Instrument'}</strong> die Nationalhymnen und das musikalische Kulturerbe von <strong>{continent?.label || 'der Welt'}</strong> erfolgreich erlernt und mit Bravour gemeistert hat!
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#0f172a',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #fde68a',
            borderRadius: '100px',
            padding: '8px 24px',
            marginBottom: '28px'
          }}>
            <span>🌍 Erforschte Länder: {unlockedCount} / {totalCountries}</span>
            <span>•</span>
            <span>⭐ Status: Meisterstufe</span>
          </div>

          {/* Signature Line */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '460px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px dashed #cbd5e1',
            fontSize: '0.8rem',
            color: '#64748b'
          }}>
            <div>
              <span>Datum: {new Date().toLocaleDateString('de-DE')}</span>
            </div>
            <div>
              <span>Gez. Musikschulleitung & Fachlehrkraft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
