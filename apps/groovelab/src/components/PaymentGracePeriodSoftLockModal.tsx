import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { 
  X, Check, Copy, ShieldCheck, BookOpen, 
  ExternalLink, Music, CheckCircle2, ChevronRight
} from 'lucide-react';
import { 
  generateEpcGiroCodePayload, 
  formatIbanWithSpaces, 
  generateStudentGoBdCode,
  calculateSchoolYearDirectBilling
} from '../utils/epcGiroCode';

export interface PaymentGracePeriodSoftLockModalProps {
  student: {
    id: string;
    first_name?: string;
    last_name?: string;
    school_id?: string | null;
    [key: string]: any;
  };
  schoolData?: {
    name?: string;
    city?: string;
    currency?: string;
    country?: string;
    billing_iban?: string;
    billing_bic?: string;
    billing_company?: string;
    [key: string]: any;
  };
  masterBillingIban?: string;
  masterBillingBic?: string;
  masterBillingCompany?: string;
  onClose: () => void;
  onOpenActivationModal?: () => void;
}

export const PaymentGracePeriodSoftLockModal: React.FC<PaymentGracePeriodSoftLockModalProps> = ({
  student,
  schoolData,
  masterBillingIban = 'DE89 3704 0044 0532 9482 11',
  masterBillingBic = 'GENODEFFXXX',
  masterBillingCompany = 'Campus-Groovelab Plattformbetrieb',
  onClose,
  onOpenActivationModal
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAlreadyPaidNotice, setShowAlreadyPaidNotice] = useState(false);

  const isChf = schoolData?.currency === 'CHF' || 
    schoolData?.country === 'CH' || 
    schoolData?.country === 'Schweiz' || 
    String(schoolData?.country || '').toLowerCase().includes('schweiz');

  const activeCurrency: 'EUR' | 'CHF' = isChf ? 'CHF' : 'EUR';
  const schoolStartMonth = Number(schoolData?.school_year_start_month || 9);
  const schoolStartDay = Number(schoolData?.school_year_start_day || 1);
  const schoolYearCalc = calculateSchoolYearDirectBilling(
    undefined, 
    activeCurrency, 
    undefined, 
    schoolStartMonth, 
    schoolStartDay
  );

  const totalAmountStr = schoolYearCalc.totalAmountStr;
  const effectiveAnnualFee = schoolYearCalc.totalAmount;
  const referenceCode = generateStudentGoBdCode(student.id || 'TEMP-ID');
  const recipientName = schoolData?.billing_company || masterBillingCompany;
  const effectiveIban = schoolData?.billing_iban || masterBillingIban;
  const effectiveBic = schoolData?.billing_bic || masterBillingBic;

  const epcPayload = generateEpcGiroCodePayload({
    iban: effectiveIban,
    bic: effectiveBic,
    recipientName: recipientName,
    amount: effectiveAnnualFee,
    referenceCode: referenceCode
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const studentName = student.first_name || 'Schüler';

  // ♿ WAI-ARIA & WCAG 2.1.1: Keyboard Escape-Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderBottom: '1px solid #fcd34d',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.2)'
            }}>
              <Music size={22} color="#d97706" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#92400e',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: '100px'
                }}>
                  Pausen-Modus
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#047857',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={11} />
                  Hausaufgaben 100% aktiv
                </span>
              </div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#78350f', letterSpacing: '-0.02em' }}>
                Campus-Übestudio in Pause
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(217, 119, 6, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#78350f',
              transition: 'all 0.15s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Reassuring Educational Guarantee Box */}
          <div style={{
            background: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <BookOpen size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.80rem', color: '#065f46', lineHeight: 1.45 }}>
              <strong style={{ display: 'block', color: '#047857', fontWeight: 850 }}>
                🛡️ Bildungsschutz-Garantie: Keine Unterrichtsunterbrechung
              </strong>
              Der Stundenplan, Raumänderungen und alle Einträge im digitalen Hausaufgabenheft für <strong>{studentName}</strong> bleiben zu 100 % geöffnet und aktuell.
            </div>
          </div>

          {/* Explanation for Parents */}
          <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
            Liebe Eltern, der kostenfreie Schnuppermonat sowie die 14-tägige Vertrauensfrist für dieses Schuljahr sind abgelaufen. Zur Freischaltung der interaktiven didaktischen Audio-Tools (<strong>Audio-Loopstation, Übe-Timer, XP-Streaks & Meisterwerk-Studio</strong>) bitten wir Sie, den Schuljahres-Beitrag per Banküberweisung anzuweisen:
          </div>

          {/* Interactive SEPA Payment Card with EPC-QR Code */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Schuljahres-Beitrag ({schoolYearCalc.periodDescription})
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a' }}>
                  {isChf ? `CHF ${totalAmountStr}` : `${totalAmountStr} €`} <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>einmalig / Schuljahr</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#10b981',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '3px 10px',
                borderRadius: '100px'
              }}>
                Kein Abo • Endet automatisch
              </span>
            </div>

            {/* QR Code & Transfer Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '14px',
              alignItems: 'center',
              background: '#ffffff',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              {/* QR Box */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  padding: '6px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1'
                }}>
                  <QRCode value={epcPayload} size={106} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Banking-App Scan
                </span>
              </div>

              {/* Data fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Reference */}
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Verwendungszweck (Wichtig!)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#047857', fontSize: '0.84rem' }}>
                      {referenceCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(referenceCode, 'reference')}
                      style={{
                        background: copiedField === 'reference' ? '#059669' : '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        color: copiedField === 'reference' ? '#ffffff' : '#334155',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedField === 'reference' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedField === 'reference' ? 'Kopiert' : 'Kopieren'}</span>
                    </button>
                  </div>
                </div>

                {/* IBAN */}
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    IBAN ({recipientName})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '0.78rem' }}>
                      {formatIbanWithSpaces(effectiveIban)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(effectiveIban.replace(/\s+/g, ''), 'iban')}
                      style={{
                        background: copiedField === 'iban' ? '#0f172a' : '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        color: copiedField === 'iban' ? '#ffffff' : '#334155',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedField === 'iban' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedField === 'iban' ? 'Kopiert' : 'Kopieren'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Already transferred notice */}
          {showAlreadyPaidNotice && (
            <div style={{
              background: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: '14px',
              padding: '12px 14px',
              fontSize: '0.78rem',
              color: '#1e40af',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Vielen Dank!</strong> SEPA-Banküberweisungen benötigen in der Regel 1–2 Bankarbeitstage. Sobald die Buchung automatisiert abgeglichen wird, entriegelt sich das Campus-Übestudio sofort. Das Schulsekretariat kann bei Bedarf auch eine sofortige manuelle Freischaltung durchführen.
              </div>
            </div>
          )}

          {/* Info toggle if already paid */}
          {!showAlreadyPaidNotice && (
            <button
              type="button"
              onClick={() => setShowAlreadyPaidNotice(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#2563eb',
                fontSize: '0.76rem',
                fontWeight: 750,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Sie haben die Überweisung bereits getätigt? Hier klicken</span>
              <ChevronRight size={14} />
            </button>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {onOpenActivationModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenActivationModal();
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                <span>Vollständige Zahlungsanweisung & PDF-Beleg öffnen</span>
                <ExternalLink size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '11px',
                fontSize: '0.84rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <BookOpen size={16} />
              <span>Verstanden • Zurück zum Hausaufgabenheft</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
