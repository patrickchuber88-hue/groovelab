import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  X, Check, Copy, ShieldAlert, Clock, 
  AlertTriangle, CheckCircle2, ChevronRight, Zap 
} from 'lucide-react';
import { generateEpcGiroCodePayload, formatIbanWithSpaces } from '../../utils/epcGiroCode';
import { SchoolDunningStatus, getDunningVisualConfig } from '../../domain/schoolDunningEngine';

export interface SchoolDunningPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dunningStatus: SchoolDunningStatus;
  schoolName: string;
  operatorCompany?: string;
  operatorIban?: string;
  operatorBic?: string;
  onGoToLicenses?: () => void;
  onActivateTrustExtension?: () => void;
}

export const SchoolDunningPayModal: React.FC<SchoolDunningPayModalProps> = ({
  isOpen,
  onClose,
  dunningStatus,
  schoolName,
  operatorCompany = 'Campus-Groovelab Plattformbetrieb',
  operatorIban = 'DE89 3704 0044 0532 9482 11',
  operatorBic = 'GENODEFFXXX',
  onGoToLicenses,
  onActivateTrustExtension
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [localTrustActive, setLocalTrustActive] = useState<boolean>(() => {
    const invId = dunningStatus.oldestOverdueInvoice?.id || 'default';
    return Boolean(localStorage.getItem(`groovelab_trust_token_${invId}`));
  });

  if (!isOpen) return null;

  const visual = getDunningVisualConfig(dunningStatus.level);
  const oldestInv = dunningStatus.oldestOverdueInvoice;
  const isTrustActive = dunningStatus.isTrustExtended || localTrustActive;
  
  // Total includes module dunning fee if level >= level_3_admin_readonly
  const baseAmount = dunningStatus.totalOverdueAmount;
  const fee = dunningStatus.isDunningFeeApplied ? dunningStatus.dunningFee : 0;
  const amountToPay = Math.round((baseAmount + fee) * 100) / 100;
  const referenceCode = oldestInv ? oldestInv.id : `RE-${schoolName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;

  const handleTriggerTrustPass = () => {
    const invId = oldestInv?.id || 'default';
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(`groovelab_trust_token_${invId}`, expiresAt);
    setLocalTrustActive(true);
    if (onActivateTrustExtension) {
      onActivateTrustExtension();
    }
  };

  const epcPayload = generateEpcGiroCodePayload({
    iban: operatorIban,
    bic: operatorBic,
    recipientName: operatorCompany,
    amount: amountToPay,
    referenceCode
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: visual.badgeBg,
              border: `1px solid ${visual.badgeBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: visual.badgeColor,
              flexShrink: 0
            }}>
              {dunningStatus.isSecretaryReadOnly ? <ShieldAlert size={26} /> : <Clock size={26} />}
            </div>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '100px',
                background: visual.badgeBg,
                color: visual.badgeColor,
                fontSize: '0.74rem',
                fontWeight: 900,
                letterSpacing: '0.02em',
                marginBottom: '4px'
              }}>
                {visual.title}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.28rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' }}>
                B2B-Sofortausgleich via EPC-QR
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Status Message */}
          <div style={{
            background: visual.badgeBg,
            border: `1px solid ${visual.badgeBorder}`,
            borderRadius: '18px',
            padding: '16px 18px',
            color: '#1e293b',
            fontSize: '0.88rem',
            lineHeight: 1.55
          }}>
            {dunningStatus.isSecretaryReadOnly ? (
              <>
                <strong>Administrativer Schreibschutz aktiv:</strong> Für <strong>{schoolName}</strong> liegt ein Zahlungsrückstand von <strong>{amountToPay.toFixed(2)} €</strong> seit {dunningStatus.overdueDays} Tagen vor. Nach erfolgter Überweisung wird der Schreibzugriff für Schüler-, Lehrer- und Raumverwaltung sofort wieder entsperrt.
              </>
            ) : (
              <>
                <strong>Dringende Zahlungserinnerung:</strong> In <strong>{dunningStatus.adminCountdownDays} Tagen</strong> wechselt das System automatisch in den administrativen Schreibschutz. Bitte begleiche den Betrag von <strong>{amountToPay.toFixed(2)} €</strong> zeitnah.
              </>
            )}
          </div>

          {/* QR Code & Transfer Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '170px 1fr',
            gap: '20px',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '22px',
            padding: '20px'
          }}>
            {/* QR Code Card */}
            <div style={{
              background: '#ffffff',
              padding: '14px',
              borderRadius: '16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <QRCode 
                value={epcPayload}
                size={142}
                level="M"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textAlign: 'center' }}>
                GiroCode (Banking-App)
              </span>
            </div>

            {/* Transfer Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gesamtbetrag
                </span>
                <div style={{ fontSize: '1.45rem', fontWeight: 950, color: '#0f172a' }}>
                  {amountToPay.toFixed(2)} €
                </div>
                {dunningStatus.isDunningFeeApplied && (
                  <div style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 750, marginTop: '2px' }}>
                    Inkl. {dunningStatus.dunningFee.toFixed(2)} € Verzugspauschale (Kulanzsatz statt 40,00 €)
                  </div>
                )}
                {dunningStatus.level === 'level_2_warning' && (
                  <div style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 750, marginTop: '2px' }}>
                    ⚡ Bei Zahlung in {dunningStatus.adminCountdownDays} Tagen wird Ihnen die Verzugspauschale ({dunningStatus.dunningFee.toFixed(2)} €) erlassen.
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Empfänger
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b' }}>
                  {operatorCompany}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    IBAN
                  </span>
                  <button
                    onClick={() => handleCopy(operatorIban, 'iban')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedField === 'iban' ? '#10b981' : '#3b82f6',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    {copiedField === 'iban' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'iban' ? 'Kopiert' : 'Kopieren'}
                  </button>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatIbanWithSpaces(operatorIban)}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Verwendungszweck
                  </span>
                  <button
                    onClick={() => handleCopy(referenceCode, 'ref')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedField === 'ref' ? '#10b981' : '#3b82f6',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    {copiedField === 'ref' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'ref' ? 'Kopiert' : 'Kopieren'}
                  </button>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {referenceCode}
                </div>
              </div>
            </div>
          </div>

          {/* 48h Trust Card */}
          <div style={{
            background: isTrustActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.06)',
            border: isTrustActive ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
            borderRadius: '18px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color={isTrustActive ? '#10b981' : '#2563eb'} />
                <span style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a' }}>
                  {isTrustActive 
                    ? '48h-Sofort-Freigabe aktiv ⚡' 
                    : 'Bereits überwiesen? 48h-Sofort-Freigabe aktivieren'}
                </span>
              </div>
              {isTrustActive && (
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '100px', border: '1px solid #a7f3d0' }}>
                  Aktiv ({dunningStatus.trustRemainingHours || 48} Std. verbleibend)
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
              {isTrustActive 
                ? 'Die administrativen Schreibrechte und der Audio-Tresor sind für 48 Stunden temporär entsperrt, während die Banküberweisung verbucht wird.'
                : 'Haben Sie die Überweisung soeben veranlasst? Mit einem Klick auf diesen Button schalten wir alle Schreibrechte Ihrer Schule sofort für 48 Stunden frei – ganz ohne Medienbruch oder Beleg-Upload.'}
            </p>
            {!isTrustActive && (
              <button
                onClick={handleTriggerTrustPass}
                style={{
                  alignSelf: 'flex-start',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '9px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s'
                }}
              >
                <Zap size={14} />
                <span>⚡ Ich habe soeben überwiesen (48h Sofort-Freigabe)</span>
              </button>
            )}
          </div>

          {/* Guarantee Notices */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: '16px',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#16a34a', fontWeight: 700 }}>
              <CheckCircle2 size={16} />
              <span><strong>Axiom der didaktischen Immunität:</strong> Schüler & Lehrkräfte haben weiterhin vollen Zugriff auf Stundenpläne und Repertoire.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#16a34a', fontWeight: 700 }}>
              <CheckCircle2 size={16} />
              <span><strong>Zero-Deletion-Garantie:</strong> Bestehende Audio-Tresor-Aufnahmen bleiben dauerhaft erhalten und abspielbar.</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 28px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          {onGoToLicenses && (
            <button
              onClick={() => {
                onClose();
                onGoToLicenses();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 0'
              }}
            >
              <span>Zur Abrechnungsübersicht</span>
              <ChevronRight size={16} />
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: 'auto',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s'
            }}
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
