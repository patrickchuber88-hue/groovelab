import React from 'react';
import { AlertTriangle, ShieldCheck, Sparkles, Phone } from 'lucide-react';
import { ChatRespectValidationResult } from '../../utils/chatRespectGuard';

export interface CampusChatRespectWarningBannerProps {
  respectWarning: ChatRespectValidationResult;
  onApplyNeutralText: (text: string) => void;
  onDismiss?: () => void;
}

/**
 * 🛡️ CampusChatRespectWarningBanner (0,1% Goldstandard)
 * Zeigt DSGVO Art. 9 Schutzschild-Hinweise, Poka-Yoke Ein-Klick-Übernahmen
 * sowie Kriseninterventions-Notfallnummern barrierefrei an.
 * Revisionssicher & 100% frei von juristischem Paragraphenballast (§) gem. LEG-15.
 */
export const CampusChatRespectWarningBanner: React.FC<CampusChatRespectWarningBannerProps> = ({
  respectWarning,
  onApplyNeutralText,
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: respectWarning.isCrisis
          ? '#fee2e2'
          : respectWarning.category === 'health_data'
          ? '#ecfdf5'
          : '#fef9c3',
        border: respectWarning.category === 'health_data' ? '1px solid #a7f3d0' : 'none',
        borderRadius: '14px',
        padding: '10px 14px',
        marginBottom: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: respectWarning.isCrisis
            ? '#991b1b'
            : respectWarning.category === 'health_data'
            ? '#065f46'
            : '#92400e',
          fontWeight: 800,
          fontSize: '0.80rem'
        }}
      >
        {respectWarning.category === 'health_data' ? (
          <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
        ) : (
          <AlertTriangle
            size={16}
            color={respectWarning.isCrisis ? '#dc2626' : '#d97706'}
            style={{ flexShrink: 0 }}
          />
        )}
        <span>
          {respectWarning.isCrisis
            ? 'Wichtiger Hinweis & Hilfeangebot'
            : respectWarning.category === 'health_data'
            ? 'Datenschutz-Schutzschild (Art. 9 DSGVO / BDSG)'
            : 'Respektvoller Umgang im Schul-Chat'}
        </span>
      </div>

      <div
        style={{
          fontSize: '0.74rem',
          color: respectWarning.isCrisis
            ? '#7f1d1d'
            : respectWarning.category === 'health_data'
            ? '#064e3b'
            : '#78350f',
          lineHeight: 1.4,
          fontWeight: 550
        }}
      >
        {respectWarning.reason}
      </div>

      {/* 🛡️ Ein-Klick-Übernahme für neutrale Ausfall-Formulierung */}
      {respectWarning.category === 'health_data' && respectWarning.suggestedNeutralText && (
        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onApplyNeutralText(respectWarning.suggestedNeutralText!)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background 0.15s ease'
            }}
          >
            <Sparkles size={13} color="#ffffff" style={{ flexShrink: 0 }} />
            <span>Vorschlag übernehmen: „{respectWarning.suggestedNeutralText}“</span>
          </button>
        </div>
      )}

      {respectWarning.isCrisis && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '4px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.72rem',
              color: '#991b1b',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            <span>Nummer gegen Kummer (Kinder/Jugend):</span>
            <a
              href="tel:116111"
              style={{
                color: '#b91c1c',
                textDecoration: 'underline',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Phone size={12} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>116 111</span>
            </a>
          </div>
          <div
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.72rem',
              color: '#991b1b',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            <span>Telefonseelsorge & Notfall:</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <a
                href="tel:08001110111"
                style={{
                  color: '#b91c1c',
                  textDecoration: 'underline',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Phone size={12} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>0800 111 0 111</span>
              </a>
              <span style={{ color: '#fca5a5' }}>•</span>
              <a
                href="tel:112"
                style={{
                  color: '#991b1b',
                  background: '#fee2e2',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span>Notruf 112</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
