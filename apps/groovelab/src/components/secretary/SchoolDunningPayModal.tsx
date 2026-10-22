import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  X, Check, Copy, ShieldAlert, Clock, 
  CheckCircle2, ChevronRight, ChevronDown, Zap, FileText, Layers 
} from 'lucide-react';
import { generateEpcGiroCodePayload, formatIbanWithSpaces } from '../../utils/epcGiroCode';
import { SchoolDunningStatus, getDunningVisualConfig, OverdueInvoiceSummary } from '../../domain/schoolDunningEngine';
import { OPERATOR_BANKING_CONFIG, formatOperatorIban } from '../../config/operatorBanking';

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
  operatorCompany = OPERATOR_BANKING_CONFIG.companyName,
  operatorIban = formatOperatorIban(),
  operatorBic = OPERATOR_BANKING_CONFIG.bic,
  onGoToLicenses,
  onActivateTrustExtension
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedInvoiceFilter, setSelectedInvoiceFilter] = useState<'all' | string>('all');
  const [showInvoiceDetails, setShowInvoiceDetails] = useState<boolean>(false);
  const [localTrustActive, setLocalTrustActive] = useState<boolean>(() => {
    const invId = dunningStatus.oldestOverdueInvoice?.id || 'default';
    return Boolean(localStorage.getItem(`groovelab_trust_token_${invId}`));
  });

  if (!isOpen) return null;

  const visual = getDunningVisualConfig(dunningStatus.level);
  const oldestInv = dunningStatus.oldestOverdueInvoice;
  const overdueList: OverdueInvoiceSummary[] = Array.isArray(dunningStatus.overdueInvoicesList)
    ? dunningStatus.overdueInvoicesList
    : (oldestInv ? [oldestInv] : []);
  const isTrustActive = dunningStatus.isTrustExtended || localTrustActive;

  // Selected single invoice vs all
  const activeSingleInv = selectedInvoiceFilter !== 'all'
    ? overdueList.find(inv => inv.id === selectedInvoiceFilter) || null
    : null;

  const baseAmount = activeSingleInv
    ? activeSingleInv.amount
    : dunningStatus.totalOverdueAmount;

  const shouldIncludeFee = dunningStatus.isDunningFeeApplied && (!activeSingleInv || activeSingleInv.id === oldestInv?.id);
  const fee = shouldIncludeFee ? dunningStatus.dunningFee : 0;
  const amountToPay = Math.round((baseAmount + fee) * 100) / 100;
  const hasOpenBalance = amountToPay > 0 && overdueList.length > 0;

  // Clean, concise reference code (EPC069-12 max 140 chars)
  const referenceCode = (() => {
    if (activeSingleInv) {
      return activeSingleInv.id.slice(0, 140);
    }
    if (overdueList.length > 1) {
      const cleanSchoolCode = schoolName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
      // Concatenate invoice IDs concisely
      const ids = overdueList.map(inv => inv.id).join(' ');
      const rawCode = `SAMMEL ${cleanSchoolCode}: ${ids}`;
      return rawCode.length <= 140 ? rawCode : `SAMMEL ${cleanSchoolCode} (${overdueList.length} BELEGE)`;
    }
    if (oldestInv) {
      return oldestInv.id.slice(0, 140);
    }
    return `RE-${schoolName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase()}`;
  })();

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
    amount: amountToPay > 0 ? amountToPay : 0.01,
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
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}>
        
        {/* 1. Header (Ruhig & Schlicht) */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: visual.badgeBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: visual.badgeColor,
              flexShrink: 0
            }}>
              {dunningStatus.isSecretaryReadOnly ? <ShieldAlert size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                B2B-Sofortausgleich
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {schoolName} • SEPA EPC-QR GiroCode
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f8fafc',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s',
              flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Content Body (Kompakt & Strukturiert) */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Status-Hinweis (Ruhig & auf den Punkt) */}
          <div style={{
            background: !hasOpenBalance ? '#ecfdf5' : (dunningStatus.isSecretaryReadOnly ? '#fef2f2' : '#f8fafc'),
            border: !hasOpenBalance ? '1px solid #a7f3d0' : (dunningStatus.isSecretaryReadOnly ? '1px solid #fecaca' : '1px solid #e2e8f0'),
            borderRadius: '14px',
            padding: '12px 16px',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            color: !hasOpenBalance ? '#065f46' : (dunningStatus.isSecretaryReadOnly ? '#991b1b' : '#334155')
          }}>
            {!hasOpenBalance ? (
              <strong>Konto ausgeglichen ✓ Keine offenen Rechnungen für diese Musikschule.</strong>
            ) : dunningStatus.isSecretaryReadOnly ? (
              <>
                <strong>Administrativer Schreibschutz aktiv:</strong> Offener Gesamtrückstand von <strong>{amountToPay.toFixed(2)} €</strong> ({overdueList.length} {overdueList.length === 1 ? 'Beleg' : 'Belege'}). Nach Überweisung sofort wieder freigeschaltet.
              </>
            ) : dunningStatus.adminCountdownDays > 0 ? (
              <>
                <strong>Zahlungserinnerung:</strong> In <strong>{dunningStatus.adminCountdownDays} Tagen</strong> wechselt die Verwaltung in den Schreibschutz. Betrag von <strong>{amountToPay.toFixed(2)} €</strong> bitte zeitnah begleichen.
              </>
            ) : (
              <>
                <strong>Offener Betrag:</strong> Für die Musikschule {overdueList.length === 1 ? 'ist 1 Beleg' : `sind ${overdueList.length} Belege`} über insgesamt <strong>{amountToPay.toFixed(2)} €</strong> fällig.
              </>
            )}
          </div>

          {/* Hero: GiroCode + Zahlungsdaten (Kompakte 2-Spalten-Karte) */}
          {hasOpenBalance && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '150px 1fr',
              gap: '18px',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '16px'
            }}>
              {/* QR Code */}
              <div style={{
                background: '#ffffff',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <QRCode 
                  value={epcPayload}
                  size={130}
                  level="M"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>
                  Banking-App Scan
                </span>
              </div>

              {/* Überweisungs-Attribute */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {activeSingleInv ? 'Einzelbetrag' : (overdueList.length > 1 ? `Sammelbetrag (${overdueList.length} Belege)` : 'Gesamtbetrag')}
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {amountToPay.toFixed(2)} €
                  </div>
                  {shouldIncludeFee && fee > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600 }}>
                      Inkl. {fee.toFixed(2)} € Kulanz-Pauschale
                    </span>
                  )}
                </div>

                <div>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Empfänger
                  </span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                    {operatorCompany}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      IBAN
                    </span>
                    <button
                      onClick={() => handleCopy(operatorIban, 'iban')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedField === 'iban' ? '#10b981' : '#2563eb',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: 0
                      }}
                    >
                      {copiedField === 'iban' ? <Check size={11} /> : <Copy size={11} />}
                      {copiedField === 'iban' ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {formatIbanWithSpaces(operatorIban)}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Verwendungszweck
                    </span>
                    <button
                      onClick={() => handleCopy(referenceCode, 'ref')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedField === 'ref' ? '#10b981' : '#2563eb',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: 0
                      }}
                    >
                      {copiedField === 'ref' ? <Check size={11} /> : <Copy size={11} />}
                      {copiedField === 'ref' ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: '#0f172a', 
                    fontFamily: 'monospace', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    maxWidth: '280px'
                  }} title={referenceCode}>
                    {referenceCode}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Belegspiegel & Kämmerei-Filter (Ruhige Quittungs-Zusammenfassung) */}
          {hasOpenBalance && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {/* Quittungs-Summenzeile */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>
                  {activeSingleInv ? `Einzelbeleg (${activeSingleInv.id})` : `${overdueList.length} offene Belege`}
                </span>
                <span style={{ color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {baseAmount.toFixed(2)} €
                </span>
              </div>

              {fee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#b91c1c' }}>
                  <span>Verzugspauschale (Kulanzsatz)</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>+ {fee.toFixed(2)} €</span>
                </div>
              )}

              <div style={{ height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowInvoiceDetails(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#2563eb',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {showInvoiceDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{showInvoiceDetails ? 'Belegdetails ausblenden' : `Details zu ${overdueList.length} Belegen (für Kämmerei)`}</span>
                </button>

                {overdueList.length > 1 && showInvoiceDetails && (
                  <select
                    value={selectedInvoiceFilter}
                    onChange={(e) => setSelectedInvoiceFilter(e.target.value)}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#1e293b',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Alle Belege (Sammelausgleich)</option>
                    {overdueList.map(inv => (
                      <option key={inv.id} value={inv.id}>Nur {inv.id} ({inv.amount.toFixed(2)} €)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Detail-Liste nur bei Bedarf eingeblendet */}
              {showInvoiceDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {overdueList.map((inv) => {
                    const isSelected = selectedInvoiceFilter === 'all' || selectedInvoiceFilter === inv.id;
                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoiceFilter(prev => prev === inv.id ? 'all' : inv.id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: isSelected ? '#ffffff' : 'transparent',
                          border: isSelected ? '1px solid #e2e8f0' : '1px solid transparent',
                          opacity: isSelected ? 1 : 0.45,
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={12} color="#64748b" />
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{inv.id}</span>
                          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                            ({inv.type === 'AKT' ? 'Schüler' : 'Infrastruktur'})
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {inv.amount.toFixed(2)} €
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. 48h-Sofortfreigabe & Garantien (Schlank & beruhigend) */}
          <div style={{
            background: isTrustActive ? '#f0fdf4' : '#eff6ff',
            border: isTrustActive ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color={isTrustActive ? '#16a34a' : '#2563eb'} />
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                  {isTrustActive ? '48h-Sofort-Freigabe aktiv ⚡' : 'Bereits überwiesen?'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                  {isTrustActive 
                    ? `Schreibrechte für ${dunningStatus.trustRemainingHours || 48} Std. entsperrt.` 
                    : 'Mit 1 Klick alle Schreibrechte während der Banklaufzeit freischalten.'}
                </span>
              </div>
            </div>

            {!isTrustActive && (
              <button
                type="button"
                onClick={handleTriggerTrustPass}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                ⚡ 48h Sofort-Freigabe
              </button>
            )}
          </div>

          {/* Garantien-Hinweiszeile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            <span><strong>Didaktische Immunität:</strong> Schüler &amp; Lehrkräfte haben uneingeschränkten Unterrichtszugriff.</span>
          </div>

        </div>

        {/* 5. Footer (Minimalistisch) */}
        <div style={{
          padding: '14px 24px 20px',
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
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0
              }}
            >
              <span>Zur Abrechnungshistorie</span>
              <ChevronRight size={14} />
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
