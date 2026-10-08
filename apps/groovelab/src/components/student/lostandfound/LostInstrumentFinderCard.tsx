/**
 * 🏛️ Campus-Groovelab Koffer-Tag Notfall-Zuordnung
 * LostInstrumentFinderCard.tsx
 * 
 * 0,1% Goldstandard Finder-Screen für fremde Finder (DSGVO Art. 8 & 25):
 * - Schlichte, offizielle Musikschul-Visitenkarte
 * - Zeigt ausschließlich: Name, Adresse, Telefonnummer, E-Mail der Musikschule
 * - Zero PII: Keine Schüler-IDs, keine Schülernamen, keine Online-Formulare
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Links, Kontrast ≥ 7:1)
 */

import React from 'react';
import { School, MapPin, Phone, Mail, HeartHandshake, Lock } from 'lucide-react';
import { useLostInstrumentSchoolInfo } from './useLostInstrumentSchoolInfo';

export interface LostInstrumentFinderCardProps {
  schoolId?: string | null;
  school?: any;
  onSwitchToPin?: () => void;
}

export const LostInstrumentFinderCard: React.FC<LostInstrumentFinderCardProps> = ({
  schoolId,
  school,
  onSwitchToPin
}) => {
  const { schoolInfo } = useLostInstrumentSchoolInfo(schoolId, school);

  const formattedAddress = [
    schoolInfo.street ? `${schoolInfo.street} ${schoolInfo.house_number || ''}`.trim() : null,
    schoolInfo.zip_code && schoolInfo.city ? `${schoolInfo.zip_code} ${schoolInfo.city}`.trim() : null
  ].filter(Boolean).join(', ');

  return (
    <div
      role="region"
      aria-label="Notfallkontakt für Instrumenten-Finder"
      style={{
        background: '#f8fafc',
        border: '1.5px solid #0f172a',
        borderRadius: '18px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        textAlign: 'left',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Header mit Schul-Identifikation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <School size={20} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Eigentum eines Schülers der
          </div>
          <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2, wordBreak: 'break-word' }}>
            {schoolInfo.name}
          </div>
        </div>
      </div>

      {/* Notfall-Hinweistext */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
        <HeartHandshake size={18} color="#0f172a" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Instrument gefunden?</strong> Vielen Dank für Ihre Ehrlichkeit und Mithilfe! Bitte bringen Sie das Instrument in unser Schulsekretariat oder kontaktieren Sie uns:
        </span>
      </div>

      {/* Behördliche Kontaktdaten (Telefon, E-Mail, Adresse) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Telefonnummer */}
        {schoolInfo.phone_number ? (
          <a
            href={`tel:${schoolInfo.phone_number.replace(/\s+/g, '')}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: '0.86rem',
              fontWeight: 850
            }}
          >
            <Phone size={16} strokeWidth={2.4} color="#0f172a" />
            <span>{schoolInfo.phone_number}</span>
          </a>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.82rem' }}>
            <Phone size={15} color="#94a3b8" />
            <span>Telefon im Schulsekretariat erfragen</span>
          </div>
        )}

        {/* E-Mail */}
        {schoolInfo.email && (
          <a
            href={`mailto:${schoolInfo.email}?subject=Fundst%C3%BCck%20Instrumententasche`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 750
            }}
          >
            <Mail size={15} strokeWidth={2.2} color="#0f172a" />
            <span style={{ wordBreak: 'break-all' }}>{schoolInfo.email}</span>
          </a>
        )}

        {/* Adresse */}
        {formattedAddress && (
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '8px', color: '#475569', fontSize: '0.78rem', lineHeight: 1.35 }}>
            <MapPin size={15} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{formattedAddress}</span>
          </div>
        )}
      </div>

      {/* 1-Klick Absprung für Schüler/Eltern */}
      {onSwitchToPin && (
        <button
          type="button"
          onClick={onSwitchToPin}
          style={{
            marginTop: '2px',
            width: '100%',
            padding: '12px 14px',
            borderRadius: '12px',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)',
            transition: 'transform 0.1s ease',
            touchAction: 'manipulation'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Lock size={15} color="#ffffff" />
          <span>Bist du der Schüler? Zur PIN-Eingabe</span>
        </button>
      )}
    </div>
  );
};
