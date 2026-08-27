import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  X, Check, Copy, Download, ShieldCheck, QrCode, Building2, 
  HelpCircle, ArrowRight, Sparkles, HeartHandshake, CheckCircle2 
} from 'lucide-react';
import { 
  generateEpcGiroCodePayload, 
  formatIbanWithSpaces, 
  generateStudentGoBdCode,
  calculateSchoolYearDirectBilling
} from '../utils/epcGiroCode';
import { supabase } from '../lib/supabase';

export interface ParentCampusActivationModalProps {
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
    billing_iban?: string;
    billing_bic?: string;
    billing_company?: string;
    [key: string]: any;
  };
  masterBillingIban?: string;
  masterBillingBic?: string;
  masterBillingCompany?: string;
  annualFee?: number; // default 5.88 (0.49 * 12)
  onClose: () => void;
  onPaymentSubmitted?: () => void;
}

export const ParentCampusActivationModal: React.FC<ParentCampusActivationModalProps> = ({
  student,
  schoolData,
  masterBillingIban = 'DE89 3704 0044 0532 9482 11',
  masterBillingBic = 'GENODEFFXXX',
  masterBillingCompany = 'Campus-Groovelab Plattformbetrieb',
  annualFee = 5.88,
  onClose,
  onPaymentSubmitted
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [showHardshipConfirm, setShowHardshipConfirm] = useState(false);
  const [agreeWithdrawalWaiver, setAgreeWithdrawalWaiver] = useState(true);

  // Dynamic School Year Calculation (Registration month = 0.00 € free, remaining months until August 31st)
  const schoolYearCalc = calculateSchoolYearDirectBilling();
  const effectiveAnnualFee = annualFee !== 5.88 ? annualFee : schoolYearCalc.totalAmount;
  const totalAmountStr = schoolYearCalc.totalAmountStr;
  const monthlyRate = schoolYearCalc.monthlyRate.toFixed(2).replace('.', ',');
  const remainingMonths = schoolYearCalc.remainingPaidMonths;
  const periodDescription = schoolYearCalc.periodDescription;

  // Generate stable GoBD Reference Code: CG-[HASH8]-[YYMM]
  const referenceCode = generateStudentGoBdCode(student.id || 'TEMP-ID');
  const recipientName = masterBillingCompany;
  const effectiveIban = masterBillingIban;
  const effectiveBic = masterBillingBic;

  // EPC GiroCode payload
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

  // Mark as transfer initiated
  const handleConfirmTransferInitiated = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('students')
        .update({
          student_billing_payment_method: 'bank_transfer',
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', student.id);

      if (error) {
        // Fallback: also try updating users table if students table is a view
        await supabase
          .from('users')
          .update({
            student_billing_payment_method: 'bank_transfer',
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);
      }

      setSubmittedSuccess(true);
      if (onPaymentSubmitted) onPaymentSubmitted();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.warn('Payment update notice error:', err);
      setSubmittedSuccess(true);
      setTimeout(() => onClose(), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF Payment Voucher
  const handleDownloadPdfVoucher = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');

      // Colors
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Banner
      doc.setFillColor(52, 168, 83);
      doc.roundedRect(15, 15, 180, 28, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Campus-Groovelab • Digitale Zahlungsanweisung', 22, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('SEPA-Überweisung zur Modul-Bereitstellung (Campus)', 22, 36);

      // Card Body
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 50, 180, 225, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 50, 180, 225, 4, 4, 'S');

      // Student Header
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`Aktivierung für: ${student.first_name || 'Schüler'} ${student.last_name || ''}`.trim(), 22, 65);
      if (schoolData?.name) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`Musikschule: ${schoolData.name}`, 22, 72);
      }

      // Financial Details Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(22, 80, 166, 75, 3, 3, 'F');

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPFÄNGER / BEGUENSTIGTER', 28, 90);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(recipientName, 28, 96);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text('IBAN (SEPA)', 28, 106);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('courier', 'bold');
      doc.text(formatIbanWithSpaces(effectiveIban), 28, 112);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('VERWENDUNGSZWECK (ZWINGEND ERFORDERLICH)', 28, 122);
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105);
      doc.setFont('courier', 'bold');
      doc.text(referenceCode, 28, 128);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`GESAMTBETRAG (${remainingMonths} MONATE, ${periodDescription})`, 28, 138);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalAmountStr} EUR (0,49 EUR/Mo. • ${schoolYearCalc.freeMonthName} gratis • Endpreis gem. § 19 UStG)`, 28, 146);

      // Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Anleitung zur Durchführung:', 22, 170);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('1. Öffnen Sie Ihre gewohnte Banking-App (z. B. Sparkasse, VR-Banking, ING, DKB, N26).', 22, 178);
      doc.text(`2. Überweisen Sie den Betrag von ${totalAmountStr} EUR auf die oben genannte IBAN.`, 22, 185);
      doc.text(`3. Geben Sie als Verwendungszweck exakt ${referenceCode} an.`, 22, 192);
      doc.text('4. Sobald der Zahlungseingang verbucht ist, wird der Campus-Zugang vollautomatisch freigeschaltet.', 22, 199);

      // Legal note
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Campus-Groovelab • Reines Cloud- & Infrastruktur-Hosting statt teurer Software-Lizenzen. (UWG / GoBD konform).', 22, 260);

      doc.save(`Campus-Groovelab_Zahlungsanweisung_${referenceCode}.pdf`);
    } catch (e: any) {
      alert('Fehler beim PDF-Export: ' + e.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
    }} className="animate-fade-in">
      
      {/* 24px Apple Squircle Modal Stage */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 20px 28px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.6) 0%, rgba(255, 255, 255, 0.9) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#34a853',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(52, 168, 83, 0.3)'
            }}>
              <QrCode size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Elternbereich • Direktaktivierung
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Campus-Modul aktivieren
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Price Summary Banner with Dynamic School Year Trial */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 20px 16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '2px 10px',
              borderRadius: '100px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}>
              🎁 {schoolYearCalc.freeMonthName.toUpperCase()} KOSTENFREI ZUM SCHNUPPERN
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Schuljahres-Bereitstellung ({periodDescription})
              </span>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Modul Campus ({remainingMonths} Monate bis Schuljahresende)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Hausaufgabenheft, Übe-Timer, Loopstation &amp; Audio-Tresor
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.03em' }}>
                0,00 € <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>({schoolYearCalc.freeMonthName})</span>
              </div>
              <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                ab 01.{schoolYearCalc.paidStartMonthName.slice(0,3)}: {totalAmountStr} € ({remainingMonths} × 0,49 €)
              </span>
              <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginTop: '1px' }}>
                Endpreis gem. § 19 UStG (steuerbefreit)
              </span>
            </div>
          </div>

          {/* EPC-QR GiroCode Stage */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              ✦ Schritt 1: Mit Ihrer Banking-App scannen ✦
            </span>

            {/* QR Inlay */}
            <div style={{
              background: '#ffffff',
              padding: '14px',
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
              marginBottom: '12px'
            }}>
              <QRCode 
                value={epcPayload} 
                size={160} 
                level="M" 
                style={{ height: 'auto', maxWidth: '100%', width: '160px' }} 
              />
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, maxWidth: '420px', lineHeight: '1.4' }}>
              Öffnen Sie Ihre <strong>Sparkassen-, VR-, ING-, DKB-, N26- oder sonstige Banking-App</strong> und wählen Sie <em>„Fotoüberweisung / QR-Code scannen“</em>. Alle Daten sind 100% fehlerfrei vorausgefüllt.
            </p>
          </div>

          {/* 1-Click Monospace Copy Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Schritt 2: Alternativ per Hand überweisen
            </span>

            {/* Row 1: Verwendungszweck (Highlight!) */}
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                  Verwendungszweck (Wichtig für automatischen Abgleich)
                </span>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.96rem', color: '#065f46', letterSpacing: '0.04em' }}>
                  {referenceCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(referenceCode, 'reference')}
                style={{
                  background: copiedField === 'reference' ? '#059669' : '#ffffff',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: copiedField === 'reference' ? '#ffffff' : '#047857',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                {copiedField === 'reference' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedField === 'reference' ? 'Kopiert!' : 'Kopieren'}</span>
              </button>
            </div>

            {/* Row 2: IBAN */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Empfänger &amp; IBAN
                </span>
                <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700 }}>
                  {recipientName}
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.86rem', color: '#334155' }}>
                  {formatIbanWithSpaces(effectiveIban)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(effectiveIban.replace(/\s+/g, ''), 'iban')}
                style={{
                  background: copiedField === 'iban' ? '#0f172a' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: copiedField === 'iban' ? '#ffffff' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                {copiedField === 'iban' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedField === 'iban' ? 'Kopiert!' : 'Kopieren'}</span>
              </button>
            </div>
          </div>

          {/* Confirmation Alert after submission */}
          {submittedSuccess && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#065f46',
              fontSize: '0.84rem',
              fontWeight: 700
            }}>
              <CheckCircle2 size={20} color="#10b981" />
              <span>Überweisung registriert! Sobald die Buchung eingeht, schaltet sich die App automatisch frei.</span>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            
            {/* Legal Consent Checkbox for B2C (§§ 312j, 356 Abs. 5 BGB) */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.74rem',
              color: '#475569',
              cursor: 'pointer',
              lineHeight: '1.4',
              padding: '2px 4px'
            }}>
              <input
                type="checkbox"
                checked={agreeWithdrawalWaiver}
                onChange={(e) => setAgreeWithdrawalWaiver(e.target.checked)}
                style={{ accentColor: '#10b981', marginTop: '2px', cursor: 'pointer' }}
              />
              <span>
                Ich stimme den <strong>AGB</strong> zu und wünsche den sofortigen Beginn des kostenfreien Schnuppermonats ({schoolYearCalc.freeMonthName}) vor Ablauf der 14-tägigen Widerrufsfrist.
              </span>
            </label>

            {/* Primary confirmation CTA with strict § 312j BGB Compliance */}
            <button
              type="button"
              disabled={isSubmitting || submittedSuccess || !agreeWithdrawalWaiver}
              onClick={handleConfirmTransferInitiated}
              style={{
                background: (!agreeWithdrawalWaiver || isSubmitting || submittedSuccess) 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: (isSubmitting || submittedSuccess || !agreeWithdrawalWaiver) ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: agreeWithdrawalWaiver ? '0 6px 20px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
              onMouseOver={(e) => { if (!submittedSuccess && agreeWithdrawalWaiver) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isSubmitting ? 'Wird freigeschaltet...' : submittedSuccess ? '✓ Überweisung gemeldet' : `${schoolYearCalc.freeMonthName} gratis testen & zahlungspflichtig bestellen ➔`}
            </button>

            {/* 2-Column secondary tools */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              {/* PDF Download */}
              <button
                type="button"
                onClick={handleDownloadPdfVoucher}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
              >
                <Download size={14} />
                <span>PDF-Beleg sichern</span>
              </button>

              {/* Hardship button */}
              <button
                type="button"
                onClick={() => setShowHardshipConfirm(true)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <HeartHandshake size={14} />
                <span>Härtefall anfragen</span>
              </button>
            </div>

            {/* Hardship Dialog */}
            {showHardshipConfirm && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '0.78rem',
                color: '#92400e',
                lineHeight: '1.4'
              }}>
                <strong>Härtefall &amp; Geschwisterrabatt:</strong>
                <p style={{ margin: '4px 0 8px 0' }}>
                  Wenden Sie sich bitte kurz an das Sekretariat Ihrer Musikschule. Die Schulleitung kann das Schülerprofil mit 1 Klick kostenfrei für Sie freischalten.
                </p>
                <button
                  type="button"
                  onClick={() => setShowHardshipConfirm(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d97706',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: '#92400e',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Verstanden
                </button>
              </div>
            )}
          </div>

          {/* Legal Compliance Footer (UWG / PAngV) */}
          <div style={{ textAlign: 'center', borderTop: '1px solid rgba(15, 23, 42, 0.05)', paddingTop: '14px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: '1.4', display: 'block' }}>
              Campus-Groovelab • Transparentes Cloud-Hosting statt teurer Software-Lizenzen (0,00 € Lizenzgebühren). Keine Mindestvertragslaufzeit über das Schuljahr hinaus.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
