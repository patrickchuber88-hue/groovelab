import React from 'react';
import QRCode from 'react-qr-code';
import { QrCode } from 'lucide-react';

interface EpcGiroCodeModalProps {
  isOpen: boolean;
  billingCompany: string;
  billingIban: string;
  billingBic: string;
  onClose: () => void;
}

export const EpcGiroCodeModal: React.FC<EpcGiroCodeModalProps> = ({
  isOpen,
  billingCompany,
  billingIban,
  billingBic,
  onClose
}) => {
  if (!isOpen) return null;

  const getEpcGiroCodePayload = () => {
    const cleanIban = (billingIban || '').replace(/\s+/g, '').toUpperCase();
    const cleanBic = (billingBic || '').replace(/\s+/g, '').toUpperCase();
    const cleanCompany = (billingCompany || 'Patrick Huber').trim().substring(0, 70);

    return [
      'BCD',
      '002',
      '1',
      'SCT',
      cleanBic,
      cleanCompany,
      cleanIban,
      'EUR19.90',
      '',
      'RE-104-2608-01',
      'Campus-Groovelab Hosting',
      ''
    ].join('\n');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }} className="animate-fade-in">
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '440px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: '#f0fdf4',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <QrCode size={26} />
        </div>

        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
          EPC-GiroCode Rechnungs-Vorschau
        </h3>
        <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.4 }}>
          Dieser standardisierte SEPA-GiroCode wird auf allen B2B-Schulrechnungen und PDFs gedruckt, damit Schulträger sofort per Banking-App überweisen können.
        </p>

        <div style={{ padding: '14px', background: '#ffffff', borderRadius: '16px', border: '2px solid #16a34a' }}>
          <QRCode 
            value={getEpcGiroCodePayload()}
            size={150}
            style={{ width: '150px', height: '150px', display: 'block' }}
          />
        </div>

        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.74rem', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
          <div>Empfänger: <strong>{billingCompany || 'Patrick Huber'}</strong></div>
          <div>IBAN: <strong style={{ fontFamily: 'monospace' }}>{billingIban || 'DE...'}</strong></div>
          <div>BIC: <strong style={{ fontFamily: 'monospace' }}>{billingBic || 'GENO...'}</strong></div>
          <div>Muster-Zweck: <strong style={{ fontFamily: 'monospace' }}>RE-104-2608-01</strong></div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '12px',
            background: '#0f172a',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Schließen
        </button>
      </div>
    </div>
  );
};
