import React from 'react';
import QRCode from 'react-qr-code';

interface InvoicePDFTemplateProps {
  invoice: {
    id: string;
    type: string;
    amount: number;
    date: string;
    dueDateStr: string;
    isCurrentMonth: boolean;
    activationsCount?: number;
    restmonate?: number;
    studentFee?: number;
    status?: string;
  };
  school: {
    name: string;
    street: string;
    zipCode: string;
    city: string;
    hasCampus: boolean;
    hasGroovelab: boolean;
    totalTeachers: number;
    totalStudents: number;
    premiumStudents: number;
    activeStudents: number;
    studentBillingOption: string | null;
    billingPayer: 'school' | 'student';
  };
  operator: {
    company: string;
    contact: string;
    street: string;
    zip: string;
    city: string;
    iban: string;
    bic: string;
  };
  onClose: () => void;
}

export const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({
  invoice,
  school,
  operator,
  onClose
}) => {
  const isInf = invoice.type === 'INF' || !invoice.type;
  const isAkt = invoice.type === 'AKT';
  const isManual = !isInf && !isAkt;

  const billedCampus = school.hasCampus;
  const billedGroovelab = school.hasGroovelab;
  const campusCost = billedCampus ? 7.99 : 0;
  const groovelabCost = billedGroovelab ? 4.99 : 0;
  const hasKombi = billedCampus && billedGroovelab;
  const isPartial = school.studentBillingOption === 'student_partial';
  const activeStudentDiscount = isPartial ? 0 : (Number(school.premiumStudents) || 0) * 0.09;

  const schoolShareTotal = isInf ? invoice.amount : 0;
  const studentShareTotal = isAkt ? invoice.amount : 0;

  const lineCount = isInf ? (billedGroovelab ? 5 : 4) : 2;
  const isLongInvoice = lineCount > 5;
  const dynamicPadding = isLongInvoice ? '16px 24px' : '24px 30px';
  const dynamicMargin = isLongInvoice ? '10px' : '16px';
  const dynamicLineHeight = isLongInvoice ? '1.25' : '1.35';
  const dynamicTdPadding = isLongInvoice ? '6px 0' : '8px 0';
  const dynamicTdPaddingRight = isLongInvoice ? '6px' : '8px';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: 270mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          html, body {
            max-height: 270mm !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        fontFamily: 'Inter',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
        animation: 'scaleUp 0.2s ease-out'
      }}>
        {/* Header / Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }} className="no-print">
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>Rechnungs-Vorschau</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const printContent = document.getElementById('printable-invoice')?.innerHTML;
                if (printContent) {
                  window.print();
                }
              }}
              style={{
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(52, 168, 83, 0.15)'
              }}
            >
              Drucken / PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
          </div>
        </div>

        {/* Print Area */}
        <div id="printable-invoice" style={{ padding: dynamicPadding, overflowY: 'auto', flex: 1, color: '#1e293b', lineHeight: dynamicLineHeight }}>
          {/* Invoice Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: dynamicMargin }}>
            <div>
              <h2 style={{ margin: 0, color: '#34a853', fontFamily: 'Urbanist', fontSize: '1.3rem', fontWeight: 900 }}>Campus-Groovelab</h2>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Campus-Groovelab Billing System</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
              <strong style={{ display: 'block', fontSize: '0.92rem', color: invoice.status === 'Vorschau' ? '#d97706' : '#0f172a' }}>
                {invoice.status === 'Vorschau' 
                  ? (isInf ? 'VORSCHAU: DATENBANK- & SERVICEGEBÜHREN' : (school.billingPayer === 'student' ? 'VORSCHAU: DIREKTABRECHNUNG SCHÜLERAKTIVIERUNGEN' : 'VORSCHAU: SAMMELRECHNUNG SCHÜLERAKTIVIERUNGEN')) 
                  : (isInf ? 'DATENBANK- & SERVICEGEBÜHREN' : (school.billingPayer === 'student' ? 'DIREKTABRECHNUNG SCHÜLERAKTIVIERUNGEN' : 'SAMMELRECHNUNG SCHÜLERAKTIVIERUNGEN'))}
              </strong>
              <span style={{ color: '#64748b', fontWeight: 700 }}>Nr. {invoice.id}</span>
            </div>
          </div>

          {/* Addresses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: dynamicMargin, fontSize: '0.72rem' }}>
            <div>
              <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Rechnungsempfänger</span>
              <strong style={{ color: '#0f172a', display: 'block' }}>{school.name}</strong>
              {school.street && <span>{school.street}<br /></span>}
              <span>{school.zipCode} {school.city}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Dienstleister</span>
              <strong style={{ color: '#34a853', display: 'block', fontSize: '0.85rem' }}>Campus-Groovelab</strong>
              <strong style={{ color: '#0f172a', display: 'block', fontWeight: 600 }}>{operator.company}</strong>
              <span>{operator.contact}</span><br />
              <span>{operator.street}</span><br />
              <span>{operator.zip} {operator.city}</span>
            </div>
          </div>

          {/* Dates */}
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr', gap: '8px', fontSize: '0.7rem', marginBottom: dynamicMargin, border: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Rechnungsdatum</span>
              <strong style={{ color: '#0f172a' }}>{invoice.date}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Fälligkeit</span>
              <strong style={{ color: '#0f172a' }}>{invoice.dueDateStr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Leistungszeitraum</span>
              <strong style={{ color: '#0f172a' }}>
                {invoice.date.split(' ').slice(1).join(' ')}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Zahlungsart</span>
              <strong style={{ color: '#0f172a' }}>Rechnung (14 Tage Zahlungsziel)</strong>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', marginBottom: dynamicMargin }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: dynamicTdPadding }}>Position</th>
                <th style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>Menge</th>
                <th style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>Einzelpreis</th>
                <th style={{ padding: dynamicTdPadding, textAlign: 'right' }}>Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              {isInf && (
                <>
                  {/* Position 1: 100% Kostenlose Software Lizenz */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: dynamicTdPadding }}>
                      <strong style={{ display: 'block', color: '#0f172a' }}>Campus-Groovelab Musikschul-Software</strong>
                      <span style={{ fontSize: '0.68rem', color: '#34a853', fontWeight: 700 }}>Software-Infrastruktur 100% kostenlos</span>
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      1 Monat
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>0,00 €</td>
                    <td style={{ padding: dynamicTdPadding, textAlign: 'right', color: '#34a853', fontWeight: 700 }}>0,00 €</td>
                  </tr>

                  {/* Position 2: Campus platform access */}
                  {campusCost > 0 && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: dynamicTdPadding }}>
                        <strong style={{ display: 'block', color: '#0f172a' }}>Datenbank &amp; Servicegebühr Campus</strong>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Bereitstellung, Betrieb &amp; Hosting (Campus)</span>
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                        1 Monat
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                        {campusCost.toFixed(2).replace('.', ',')} €
                      </td>
                      <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 600 }}>
                        {campusCost.toFixed(2).replace('.', ',')} €
                      </td>
                    </tr>
                  )}

                  {/* Position 2.5: Groovelab platform access */}
                  {groovelabCost > 0 && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: dynamicTdPadding }}>
                        <strong style={{ display: 'block', color: '#0f172a' }}>Datenbank &amp; Servicegebühr GrooveLab</strong>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Bereitstellung, Betrieb &amp; Hosting (GrooveLab)</span>
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                        1 Monat
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                        {groovelabCost.toFixed(2).replace('.', ',')} €
                      </td>
                      <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 600 }}>
                        {groovelabCost.toFixed(2).replace('.', ',')} €
                      </td>
                    </tr>
                  )}

                  {/* Position 3: Team-Members */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: dynamicTdPadding }}>
                      <strong style={{ display: 'block', color: '#0f172a' }}>DB &amp; Service Team</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{school.totalTeachers} Team-Mitglieder (Lehrkräfte/Verwaltung) (0,49 € / Mo. pro User)</span>
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      1 Monat
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      {(school.totalTeachers * 0.49).toFixed(2).replace('.', ',')} €
                    </td>
                    <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 600 }}>
                      {(school.totalTeachers * 0.49).toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>

                  {/* Position 4: School Base Fee for DB creation */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: dynamicTdPadding }}>
                      <strong style={{ display: 'block', color: '#0f172a' }}>DB &amp; Service Schüler</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Infrastrukturpauschale für {school.totalStudents} Schüler (0,09 € / Mo. pro User)</span>
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      1 Monat
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      {(school.totalStudents * 0.09).toFixed(2).replace('.', ',')} €
                    </td>
                    <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 600 }}>
                      {(school.totalStudents * 0.09).toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>

                  {/* Kombinations-Rabatt row */}
                  {hasKombi && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#34a853' }}>
                      <td style={{ padding: dynamicTdPadding }}>
                        <strong style={{ display: 'block' }}>Kombinations-Rabatt (Campus &amp; GrooveLab)</strong>
                        <span style={{ fontSize: '0.68rem', color: '#34a853' }}>Sonderkondition für Doppel-Modulnutzung</span>
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>
                        1 Monat
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>-2,99 €</td>
                      <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 700 }}>
                        -2,99 €
                      </td>
                    </tr>
                  )}

                  {/* Direktabrechnungs-Vorteil row */}
                  {activeStudentDiscount > 0 && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#34a853' }}>
                      <td style={{ padding: dynamicTdPadding }}>
                        <strong style={{ display: 'block' }}>Direktabrechnungs-Vorteil</strong>
                        <span style={{ fontSize: '0.68rem', color: '#34a853' }}>Deduction für {school.premiumStudents || 0} aktive Selbstzahler-Schüler (0,09 € / Mo. pro User)</span>
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>
                        1 Monat
                      </td>
                      <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>-0,09 €</td>
                      <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 700 }}>
                        {(-activeStudentDiscount).toFixed(2).replace('.', ',')} €
                      </td>
                    </tr>
                  )}
                </>
              )}

              {isAkt && (
                <>
                  {/* Position 1: Student Activations */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: dynamicTdPadding }}>
                      <strong style={{ display: 'block', color: '#0f172a' }}>Schüler-Account Aktivierungsgebühr (Sammelabrechnung)</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        Jahrespauschale für aktivierte Schüler-Accounts (Umlagesatz = 0,40 € / Mo. für {invoice.restmonate || 12} Restmonate)
                        {school.studentBillingOption === 'option3_2' && <strong style={{ color: '#34a853', marginLeft: '6px' }}>(inkl. 10% Rabatt für Jahrespauschale)</strong>}
                        {school.studentBillingOption === 'option3_3' && <strong style={{ color: '#34a853', marginLeft: '6px' }}>(inkl. 20% Rabatt für Komplett-Jahrespauschale)</strong>}
                      </span>
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      {invoice.activationsCount || 0} Schüler
                    </td>
                    <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right', color: '#64748b' }}>
                      {(invoice.studentFee || 4.80).toFixed(2).replace('.', ',')} €
                    </td>
                    <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 600 }}>
                      {invoice.amount.toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>
                </>
              )}

              {isManual && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: dynamicTdPadding }}>
                    <strong style={{ display: 'block', color: '#0f172a' }}>{invoice.id.startsWith('INV-') ? 'Manuelle Abrechnung / Korrektur' : 'Manuelle Gutschrift'}</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Korrektur- oder Zusatzposten</span>
                  </td>
                  <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>1</td>
                  <td style={{ padding: dynamicTdPaddingRight, textAlign: 'right' }}>{Number(invoice.amount).toFixed(2).replace('.', ',')} €</td>
                  <td style={{ padding: dynamicTdPadding, textAlign: 'right', fontWeight: 700 }}>{Number(invoice.amount).toFixed(2).replace('.', ',')} €</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total Calculation */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.78rem', borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ width: '320px' }}>
                {isInf && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                    <span>• Träger Musikschule (Betrieb &amp; Infrastruktur):</span>
                    <span style={{ fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap' }}>{schoolShareTotal.toFixed(2).replace('.', ',')} €</span>
                  </div>
                )}
                {isAkt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                    <span>{school.billingPayer === 'student' ? '• Durchlaufender Posten (Umlage an Schüler):' : '• Direktabrechnung Schüler-Aktivierungen (Träger):'}</span>
                    <span style={{ fontWeight: 650, color: school.billingPayer === 'student' ? '#34a853' : '#ea580c', whiteSpace: 'nowrap' }}>{studentShareTotal.toFixed(2).replace('.', ',')} €</span>
                  </div>
                )}
                <div style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#0f172a' }}>
                  <span style={{ fontWeight: 800 }}>Gesamtbetrag dieser Rechnung:</span>
                  <strong style={{ fontWeight: 900, color: isInf ? '#0369a1' : '#34a853', whiteSpace: 'nowrap' }}>{invoice.amount.toFixed(2).replace('.', ',')} €</strong>
                </div>
              </div>
              {isAkt && school.billingPayer === 'student' && (
                <div style={{ fontSize: '0.64rem', color: '#34a853', background: '#e6f4ea', border: '1px solid #e6f4ea', padding: '6px 10px', borderRadius: '8px', fontWeight: 700, width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  💡 <strong>Durchlaufender Posten:</strong> Abdeckung der Gebühren direkt durch die aktivierenden Schüler/Eltern. Keine effektiven Kosten für die Musikschule.
                </div>
              )}
              {isAkt && school.billingPayer === 'school' && (
                <div style={{ fontSize: '0.64rem', color: '#ea580c', background: '#ffedd5', border: '1px solid #fed7aa', padding: '6px 10px', borderRadius: '8px', fontWeight: 700, width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  💡 <strong>Sammelabrechnung:</strong> Vertragliche Übernahme der Aktivierungsgebühren durch die Musikschule.
                </div>
              )}
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '12px', textAlign: 'right', fontStyle: 'italic', fontWeight: 600 }}>
                Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
              </div>
              
              {invoice.amount > 0 ? (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '16px', 
                  background: '#f8fafc', 
                  borderRadius: '16px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.74rem', 
                  color: '#475569', 
                  width: '100%', 
                  display: 'flex', 
                  gap: '20px',
                  alignItems: 'center',
                  textAlign: 'left'
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.8rem' }}>Zahlungshinweis &amp; Girocode:</strong>
                    <span>Bitte überweisen Sie den fälligen Betrag innerhalb von 14 Tagen ohne Abzug auf folgendes Bankkonto. Scannen Sie alternativ den QR-Code mit Ihrer Banking-App für eine fehlerfreie Überweisung:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', marginTop: '8px', gap: '6px' }}>
                      <strong>Zahlungsempfänger:</strong> <span>{operator.company}</span>
                      <strong>IBAN:</strong> <span>{operator.iban}</span>
                      <strong>BIC:</strong> <span>{operator.bic}</span>
                      <strong>Verwendungszweck:</strong> <strong style={{ color: '#0f172a' }}>{invoice.id}</strong>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ffffff',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    flexShrink: 0
                  }}>
                    <QRCode 
                      value={`BCD\n002\n1\nSCT\n${operator.bic.replace(/\s+/g, '')}\n${operator.company}\n${operator.iban.replace(/\s+/g, '')}\nEUR${invoice.amount.toFixed(2)}\n\n\n${invoice.id}\n`} 
                      size={96} 
                    />
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Girocode scannen
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '14px 16px', 
                  background: '#e6f4ea', 
                  borderRadius: '16px', 
                  border: '1px solid #e6f4ea', 
                  fontSize: '0.74rem', 
                  color: '#137333', 
                  fontWeight: 700,
                  width: '100%', 
                  textAlign: 'center'
                }}>
                  ✅ Rechnung ausgeglichen bzw. Guthaben vorhanden. Keine Zahlung erforderlich.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
