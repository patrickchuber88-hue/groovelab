import React from 'react';
import { QrCode, KeyRound, Fingerprint, ShieldCheck } from 'lucide-react';

export type TriAuthMethod = 'qr' | 'pin' | 'passkey';

export interface TriAuthGatewayBarProps {
  activeMethod: TriAuthMethod;
  onSelectMethod: (method: TriAuthMethod) => void;
  isWebAuthnSupported?: boolean;
  isGroovelabKiosk?: boolean;
  brandColor?: string;
  hasStoredBiometrics?: boolean;
}

/**
 * 🛡️ TriAuthGatewayBar (0,1% Enterprise Goldstandard)
 * Bounded Context: Core Authentication / Identity Gateway (SEC-90)
 * 
 * Bietet Schülern, Eltern und Lehrkräften die intuitive Gleichberechtigung
 * von 3 modernen Anmeldeverfahren im Apple HIG Segmented Control Design:
 * 1. 📷 QR-Code Ausweis
 * 2. 🔢 PIN-Code (Ausweis-Nummer oder persönliche Ziffern-PIN)
 * 3. 🔑 Passkey (Face ID / Touch ID / WebAuthn)
 * 
 * BFSG 2025 & WCAG 2.2 AA konform:
 * - Vollständige Tastaturbedienbarkeit per Pfeiltasten (← / →)
 * - Touch-Targets >= 44x44px
 * - Kontrastverhältnisse >= 4,5:1
 */
export const TriAuthGatewayBar: React.FC<TriAuthGatewayBarProps> = ({
  activeMethod,
  onSelectMethod,
  isWebAuthnSupported = true,
  isGroovelabKiosk = false,
  brandColor,
  hasStoredBiometrics = false
}) => {
  const methods: Array<{
    id: TriAuthMethod;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'qr',
      label: 'QR-Ausweis',
      sublabel: 'Kamera / Foto',
      icon: <QrCode size={16} strokeWidth={2.4} />
    },
    {
      id: 'pin',
      label: 'PIN-Code',
      sublabel: 'Ziffern / Tastatur',
      icon: <KeyRound size={16} strokeWidth={2.4} />
    },
    {
      id: 'passkey',
      label: 'Passkey',
      sublabel: hasStoredBiometrics ? 'Bereit' : 'Face ID / Touch ID',
      icon: <Fingerprint size={16} strokeWidth={2.4} />,
      badge: hasStoredBiometrics ? '✓' : undefined
    }
  ];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % methods.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + methods.length) % methods.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = methods.length - 1;
    }

    if (nextIndex !== index) {
      onSelectMethod(methods[nextIndex].id);
      const nextBtn = document.getElementById(`tri-auth-tab-${methods[nextIndex].id}`);
      nextBtn?.focus();
    }
  };

  const containerBg = isGroovelabKiosk 
    ? 'rgba(254, 240, 138, 0.45)' 
    : 'rgba(0, 0, 0, 0.28)';

  const activePillBg = isGroovelabKiosk 
    ? '#ffffff' 
    : '#ffffff';

  const activeTextColor = '#0f172a';

  const inactiveTextColor = isGroovelabKiosk 
    ? '#78350f' 
    : 'rgba(255, 255, 255, 0.75)';

  return (
    <div
      role="tablist"
      aria-label="Anmeldeverfahren auswählen"
      style={{
        width: '100%',
        maxWidth: '420px',
        background: containerBg,
        borderRadius: '20px',
        padding: '5px',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        marginBottom: '20px',
        border: isGroovelabKiosk 
          ? '1.5px solid rgba(234, 179, 8, 0.35)' 
          : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
    >
      {methods.map((method, idx) => {
        const isSelected = activeMethod === method.id;

        return (
          <button
            key={method.id}
            id={`tri-auth-tab-${method.id}`}
            role="tab"
            type="button"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectMethod(method.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            aria-label={`${method.label}: ${method.sublabel}`}
            style={{
              minHeight: '44px',
              padding: '8px 4px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: isSelected ? activePillBg : 'transparent',
              color: isSelected ? activeTextColor : inactiveTextColor,
              fontWeight: isSelected ? 850 : 700,
              boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.18)' : 'none',
              transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              touchAction: 'manipulation',
              outline: 'none'
            }}
            className="hover-scale"
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              lineHeight: 1
            }}>
              <span style={{ 
                color: isSelected 
                  ? (isGroovelabKiosk ? '#ca8a04' : '#16a34a') 
                  : 'currentColor' 
              }}>
                {method.icon}
              </span>
              <span>{method.label}</span>
              {method.badge && (
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  background: isSelected ? '#16a34a' : 'rgba(34, 197, 94, 0.35)',
                  color: '#ffffff',
                  borderRadius: '100px',
                  padding: '1px 5px',
                  lineHeight: 1
                }}>
                  {method.badge}
                </span>
              )}
            </div>
            <span style={{
              fontSize: '0.66rem',
              opacity: isSelected ? 0.75 : 0.65,
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}>
              {method.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TriAuthGatewayBar;
