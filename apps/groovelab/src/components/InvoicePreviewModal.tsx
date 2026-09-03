import React from 'react';
import QRCode from 'react-qr-code';
import { FileCode, Download } from 'lucide-react';
import { useMasterPricing } from '../context/MasterPricingContext';
import { downloadXRechnungXML, EInvoiceLineItem } from '../utils/eInvoiceGenerator';

export interface InvoiceData {
  id: string;
  date: string;
  dueDateStr?: string;
  amount: number;
  status: string;
  paid?: boolean;
  type?: 'INF' | 'AKT' | string;
  isCurrentMonth?: boolean;
  
  hasCampus: boolean;
  hasGroovelab: boolean;
  totalTeachersCount: number;
  totalAdminsCount?: number;
  activeCampusCount?: number;
  activeGroovelabCount?: number;
  passiveStudentsCount: number;
  isSammelzahler?: boolean;
  activeStudentFee: number;
  
  storageAddonGb?: number;
  storageAddonMonthlyFee?: number;
  
  activationsCount?: number;
  studentFee?: number;
  restmonate?: number;
  subscriptionBypass?: boolean;
  isTrialMonth?: boolean;
  auditHash?: string;
  activatedStudentsList?: any[];
}

interface InvoicePreviewModalProps {
  invoice: InvoiceData;
  schoolName: string;
  schoolStreet: string;
  schoolZipCode: string;
  schoolCity: string;
  operatorCompany: string;
  operatorContact: string;
  operatorStreet: string;
  operatorZip: string;
  operatorCity: string;
  operatorIban: string;
  operatorBic: string;
  billingPayer?: 'student' | 'school';
  studentBillingOption?: string;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  schoolName,
  schoolStreet,
  schoolZipCode,
  schoolCity,
  operatorCompany,
  operatorContact,
  operatorStreet,
  operatorZip,
  operatorCity,
  operatorIban,
  operatorBic,
  billingPayer = 'school',
  studentBillingOption = 'option1',
  onClose
}) => {
  const masterPricing = useMasterPricing();
  const isInf = invoice.type === 'INF' || !invoice.type;
  const isAkt = invoice.type === 'AKT';
  const isTrial = invoice.isTrialMonth || invoice.status === 'Probemonat' || invoice.status === 'trial';
  const isBypass = invoice.subscriptionBypass || invoice.status === 'bypass';
  const isFree = isBypass || isTrial;
  const freeLabel = isBypass ? ' (Bypass aktiv)' : (isTrial ? ' (Probemonat)' : '');
  const isPreview = invoice.status === 'Vorschau' || invoice.status === 'preview' || invoice.id.startsWith('VS-');
  const isPaid = invoice.status === 'Bezahlt' || invoice.status === 'paid' || invoice.paid === true;
  const isGutschrift = invoice.amount < 0;
  const displayInvoiceId = isPreview
    ? invoice.id
    : (isGutschrift ? invoice.id.replace('INV-', 'GS-') : invoice.id.replace('INV-', 'RE-'));

  const deMonthsList = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const getDueDate = (dateStr: string) => {
    if (!dateStr) return '';
    const months: Record<string, number> = {
      'Januar': 0, 'Februar': 1, 'März': 2, 'April': 3, 'Mai': 4, 'Juni': 5,
      'Juli': 6, 'August': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Dezember': 11
    };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthIndex = months[parts[1]] || 0;
      const year = parseInt(parts[2]);
      const d = new Date(year, monthIndex, day);
      d.setDate(d.getDate() + 14);
      return `${d.getDate()}. ${deMonthsList[d.getMonth()]} ${d.getFullYear()}`;
    }
    return dateStr;
  };

  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return '';
    if (dStr.includes('T') || (dStr.includes('-') && !dStr.includes('. '))) {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()}. ${deMonthsList[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    return dStr;
  };

  const formattedDate = formatDisplayDate(invoice.date);
  const finalDueDateStr = invoice.dueDateStr || getDueDate(formattedDate || invoice.date);
  const lpStr = (formattedDate || invoice.date).split(' ').slice(1).join(' ');

  const campusCost = invoice.hasCampus ? masterPricing.priceCampus : 0;
  const groovelabCost = invoice.hasGroovelab ? masterPricing.priceGroovelab : 0;
  const schoolShareTotal = isInf ? invoice.amount : 0;
  const studentShareTotal = isAkt ? invoice.amount : 0;

  const handleDownloadXRechnung = () => {
    const lineItems: EInvoiceLineItem[] = [];

    // Canonical Item 1: Software Provisioning (Free)
    lineItems.push({
      id: 1,
      name: 'Campus-Groovelab Software-Bereitstellung',
      description: 'Pädagogische Schulplattform & Web-App (Im Cloud-Paket inklusive)',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      vatPercent: 0
    });

    if (isInf) {
      if (invoice.hasCampus) {
        lineItems.push({
          id: 2,
          name: 'Cloud- & Datenbank-Hosting: Modul Campus',
          description: 'Hosting, Schüler-Protokolle, Stundenplan, Raumplaner',
          quantity: 1,
          unitPrice: isFree ? 0 : masterPricing.priceCampus,
          totalPrice: isFree ? 0 : masterPricing.priceCampus,
          vatPercent: 0
        });
      }
      if (invoice.hasGroovelab) {
        lineItems.push({
          id: 3,
          name: 'Cloud- & Datenbank-Hosting: Modul GrooveLab',
          description: 'Echtzeit-Bandmodul, Server-Infrastruktur & Audio-Routing',
          quantity: 1,
          unitPrice: isFree ? 0 : masterPricing.priceGroovelab,
          totalPrice: isFree ? 0 : masterPricing.priceGroovelab,
          vatPercent: 0
        });
      }
      if (invoice.hasCampus && invoice.hasGroovelab && !isFree) {
        lineItems.push({
          id: 4,
          name: 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
          description: 'Preisvorteil bei paralleler Bereitstellung von Campus + GrooveLab',
          quantity: 1,
          unitPrice: -masterPricing.kombiSavings,
          totalPrice: -masterPricing.kombiSavings,
          vatPercent: 0
        });
      }
      if (invoice.totalTeachersCount > 0) {
        lineItems.push({
          id: 5,
          name: 'Service- & Administrationspauschale',
          description: `${invoice.totalTeachersCount} aktive Profile (Lehrkräfte & Verwaltung)`,
          quantity: invoice.totalTeachersCount,
          unitPrice: isFree ? 0 : masterPricing.priceTeacher,
          totalPrice: isFree ? 0 : (invoice.totalTeachersCount * masterPricing.priceTeacher),
          vatPercent: 0
        });
      }
      if ((invoice.passiveStudentsCount ?? 0) > 0) {
        lineItems.push({
          id: 6,
          name: 'Basis-Bereitstellung',
          description: `${invoice.passiveStudentsCount} Schülerdatenbank-Datensätze & DSGVO-Hosting`,
          quantity: invoice.passiveStudentsCount || 1,
          unitPrice: isFree ? 0 : 0.09,
          totalPrice: isFree ? 0 : ((invoice.passiveStudentsCount || 0) * 0.09),
          vatPercent: 0
        });
      }
      if ((invoice.storageAddonGb ?? 0) > 0) {
        lineItems.push({
          id: 7,
          name: `Zusatz-Speichervolumen: Audio-Tresor (+${invoice.storageAddonGb} GB)`,
          description: 'Dedizierter Cloud-Speicher für hochauflösende Audio-Aufnahmen & Masterpieces',
          quantity: 1,
          unitPrice: isFree ? 0 : (invoice.storageAddonMonthlyFee || 0),
          totalPrice: isFree ? 0 : (invoice.storageAddonMonthlyFee || 0),
          vatPercent: 0
        });
      }
      if ((invoice.activeGroovelabCount ?? 0) > 0) {
        lineItems.push({
          id: 8,
          name: 'Cloud- & Modul-Bereitstellung: GrooveLab',
          description: `${invoice.activeGroovelabCount} freigeschaltete GrooveLab-Schüler (Interaktive Band-Nutzung; Kosten trägt Musikschule)`,
          quantity: invoice.activeGroovelabCount || 1,
          unitPrice: isFree ? 0 : masterPricing.priceStudent,
          totalPrice: isFree ? 0 : ((invoice.activeGroovelabCount || 0) * masterPricing.priceStudent),
          vatPercent: 0
        });
      }
    } else {
      // AKT Invoice (Contains strictly Campus student activations)
      if (studentBillingOption === 'option2' || !['option3_2', 'option3_3'].includes(studentBillingOption || '')) {
        const campusCnt = invoice.activeCampusCount !== undefined ? invoice.activeCampusCount : (invoice.activationsCount || 0);
        if (campusCnt > 0) {
          lineItems.push({
            id: 1,
            name: 'Cloud- & Modul-Bereitstellung: Campus',
            description: `${campusCnt} freigeschaltete Campus-Schüler (Interaktive App-Nutzung: Übe-Timer, Loopstation)`,
            quantity: campusCnt || 1,
            unitPrice: isFree ? 0 : masterPricing.priceStudent,
            totalPrice: isFree ? 0 : (campusCnt * masterPricing.priceStudent),
            vatPercent: 0
          });
        }
      } else {
        lineItems.push({
          id: 1,
          name: 'Cloud- & Modul-Bereitstellung: Schüleraktivierungen',
          description: `${invoice.activationsCount || 1} freigeschaltete Schüler-Zugänge`,
          quantity: invoice.activationsCount || 1,
          unitPrice: isFree ? 0 : (invoice.studentFee || 0.49),
          totalPrice: isFree ? 0 : invoice.amount,
          vatPercent: 0
        });
      }
    }

    downloadXRechnungXML({
      invoiceNumber: displayInvoiceId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      seller: {
        name: operatorCompany || 'Campus-Groovelab',
        street: operatorStreet || 'Karl-Fürstenberg-Str. 59',
        zipCode: operatorZip || '79618',
        city: operatorCity || 'Rheinfelden',
        iban: operatorIban,
        bic: (operatorBic && !operatorBic.includes('XXX')) ? operatorBic : undefined,
        vatId: 'DE364892110'
      },
      buyer: {
        name: schoolName || 'Musikschule',
        street: schoolStreet || 'Schuladresse',
        zipCode: schoolZipCode || '70000',
        city: schoolCity || 'Schulort'
      },
      lineItems,
      paymentReference: displayInvoiceId,
      notes: 'Campus-Groovelab Cloud- und Schul-Infrastruktur. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
    });
  };

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
    }} onClick={onClose}>
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
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header / Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>Rechnungs-Vorschau</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDownloadXRechnung}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)'
              }}
              title="ZUGFeRD 2.2 / XRechnung (EN16931) für ERP & Kämmereien"
            >
              <FileCode size={13} color="#38bdf8" />
              <span>XRechnung XML</span>
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              style={{
                background: '#ea4335',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(234, 67, 53, 0.15)'
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
        <div id="printable-invoice" style={{ padding: '24px 30px', overflowY: 'auto', flex: 1, color: '#1e293b', lineHeight: '1.35' }}>
          {/* Unverbindliche Vorschau Banner */}
          {isPreview && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '10px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#0369a1',
              fontSize: '0.74rem',
              fontWeight: 700
            }}>
              <span><strong>UNVERBINDLICHE ABRECHNUNGS-VORSCHAU:</strong> Laufender Zeitraum ({lpStr}). Dieses Dokument dient der transparenten Hochrechnung und ist noch KEINE finale Rechnung.</span>
              <span style={{ background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vorschau</span>
            </div>
          )}

          {/* Invoice Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontFamily: 'Urbanist', fontSize: '1.3rem', fontWeight: 900 }}>Campus-Groovelab</h2>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Campus-Groovelab • Finanz- &amp; Rechnungswesen</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a' }}>
                {isGutschrift
                  ? (invoice.status === 'Vorschau' ? 'VORSCHAU: GUTSCHRIFT' : 'GUTSCHRIFT')
                  : (invoice.status === 'Vorschau'
                    ? (isInf ? (isTrial ? 'VORSCHAU: PROBEMONAT' : 'VORSCHAU: INFRASTRUKTUR- & SERVICEGEBÜHREN') : (billingPayer === 'student' ? 'VORSCHAU: DIREKTABRECHNUNG SCHÜLERAKTIVIERUNGEN' : 'VORSCHAU: SAMMELRECHNUNG SCHÜLERAKTIVIERUNGEN'))
                    : (isInf ? (isTrial ? 'PROBEMONAT' : 'INFRASTRUKTUR- & SERVICEGEBÜHREN') : (billingPayer === 'student' ? 'DIREKTABRECHNUNG SCHÜLERAKTIVIERUNGEN' : 'SAMMELRECHNUNG SCHÜLERAKTIVIERUNGEN')))}
              </strong>
              <span style={{ color: '#64748b', fontWeight: 700 }}>
                {isGutschrift ? 'Gutschrift-Nr.' : 'Nr.'} {displayInvoiceId}
              </span>
            </div>
          </div>

          {/* Addresses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '0.72rem' }}>
            <div>
              <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Rechnungsempfänger</span>
              <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.85rem' }}>{schoolName}</strong>
              {schoolStreet ? (
                <span style={{ display: 'block' }}>{schoolStreet}</span>
              ) : (
                <span style={{ display: 'block', color: '#b45309', fontStyle: 'italic' }}>[Straße &amp; Hausnr. in Stammdaten hinterlegen]</span>
              )}
              {schoolZipCode || schoolCity ? (
                <span style={{ display: 'block' }}>{schoolZipCode} {schoolCity}</span>
              ) : (
                <span style={{ display: 'block', color: '#b45309', fontStyle: 'italic' }}>[PLZ &amp; Ort in Stammdaten hinterlegen]</span>
              )}
            </div>
            <div>
              <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Dienstleister</span>
              <strong style={{ color: '#16a34a', display: 'block', fontSize: '0.85rem' }}>Campus-Groovelab</strong>
              <strong style={{ color: '#0f172a', display: 'block', fontWeight: 600 }}>{operatorCompany}</strong>
              {operatorContact && operatorContact !== operatorCompany && <span style={{ display: 'block' }}>{operatorContact}</span>}
              <span style={{ display: 'block' }}>{operatorStreet}</span>
              <span style={{ display: 'block' }}>{operatorZip} {operatorCity}</span>
              <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginTop: '3px' }}>USt-IdNr.: DE364892110 • Steuernummer: 04123/45678</span>
            </div>
          </div>

          {/* Dates */}
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr', gap: '8px', fontSize: '0.7rem', marginBottom: '16px', border: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Rechnungsdatum</span>
              <strong style={{ color: '#0f172a' }}>{(formattedDate || invoice.date).split(' ').slice(0, 3).join(' ')}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Fälligkeit</span>
              <strong style={{ color: '#0f172a' }}>{finalDueDateStr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Leistungszeitraum</span>
              <strong style={{ color: '#0f172a' }}>{lpStr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Zahlungsart</span>
              <strong style={{ color: '#0f172a' }}>Rechnung (14 Tage Zahlungsziel)</strong>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', marginBottom: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '8px 0' }}>Position</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Menge</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Einzelpreis</th>
                <th style={{ padding: '8px 0', textAlign: 'right' }}>Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              {isGutschrift ? (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 0' }}>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Gutschrift</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Erstattung / Gutschrift für Infrastruktur- &amp; Servicegebühren</span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{Math.abs(invoice.amount).toFixed(2).replace('.', ',')} €</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', color: '#34a853', fontWeight: 700 }}>{Math.abs(invoice.amount).toFixed(2).replace('.', ',')} €</td>
                </tr>
              ) : (
                <>
                  {isInf && (
                    <>
                      {/* Position 1: Software-Bereitstellung (Inklusive) */}
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Campus-Groovelab Software-Bereitstellung</strong>
                          <span style={{ fontSize: '0.68rem', color: '#137333', fontWeight: 700 }}>Pädagogische Schulplattform &amp; Web-App (Im Cloud-Paket inklusive / 0,00 €)</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>1 Monat</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>0,00 €</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#137333', fontWeight: 700 }}>0,00 €</td>
                      </tr>

                      {/* Position 2: Campus platform access */}
                      {campusCost > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Cloud- &amp; Datenbank-Hosting: Modul Campus</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              Dedizierte Schul-Instanz, Server-Bereitstellung &amp; Hosting (Campus){freeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>1 Monat</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : `${campusCost.toFixed(2).replace('.', ',')} €`}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${campusCost.toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}

                      {/* Position 2.5: Groovelab platform access */}
                      {groovelabCost > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              Echtzeit-Bandmodul, Server-Infrastruktur &amp; Audio-Routing (GrooveLab){freeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>1 Monat</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : `${groovelabCost.toFixed(2).replace('.', ',')} €`}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${groovelabCost.toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}

                      {/* Position 2.6: Kombi-Vorteil Rabatt */}
                      {invoice.hasCampus && invoice.hasGroovelab && !isFree && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#137333' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block' }}>Kombi-Vorteilsrabatt (Infrastruktur-Bündel)</strong>
                            <span style={{ fontSize: '0.68rem', color: '#137333' }}>Preisvorteil bei paralleler Bereitstellung von Campus + GrooveLab</span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>1 Monat</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>-{masterPricing.kombiSavings.toFixed(2).replace('.', ',')} €</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>-{masterPricing.kombiSavings.toFixed(2).replace('.', ',')} €</td>
                        </tr>
                      )}

                      {/* Position 3: Team-Members / Teachers */}
                      {invoice.totalTeachersCount > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Service- &amp; Administrationspauschale: Lehrkräfte &amp; Verwaltung</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              {invoice.totalTeachersCount} aktive Profile ({masterPricing.priceTeacher.toFixed(2).replace('.', ',')} € / Mo. pro Profil)
                              {freeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {invoice.totalTeachersCount} {invoice.totalTeachersCount === 1 ? 'Lehrkraft' : 'Lehrkräfte'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : `${masterPricing.priceTeacher.toFixed(2).replace('.', ',')} €`}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${(invoice.totalTeachersCount * masterPricing.priceTeacher).toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}

                      {/* Position 3.5: Basis-Bereitstellung (0,09 €) */}
                      {(invoice.passiveStudentsCount ?? 0) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Basis-Bereitstellung</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              {invoice.passiveStudentsCount} Schüler-Accounts (0,09 € / Mo. pro Schüler). DSGVO-Datensätze, Stundenplan-, Raum- &amp; Termin-Sync, QR-Landingpages.{freeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {invoice.passiveStudentsCount} {invoice.passiveStudentsCount === 1 ? 'Schüler' : 'Schüler'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : '0,09 €'}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${((invoice.passiveStudentsCount || 0) * 0.09).toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}

                      {/* Position 4: Audio-Tresor Cloud-Speicher Add-on */}
                      {(invoice.storageAddonGb ?? 0) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Zusatz-Speichervolumen: Audio-Tresor (+{invoice.storageAddonGb} GB)</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              Dedizierter Cloud-Speicher für hochauflösende Audio-Aufnahmen &amp; Masterpieces ({(invoice.storageAddonMonthlyFee || 0).toFixed(2).replace('.', ',')} € / Mo.){freeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>1 Monat</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : `${(invoice.storageAddonMonthlyFee || 0).toFixed(2).replace('.', ',')} €`}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${(invoice.storageAddonMonthlyFee || 0).toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}

                      {/* Position 5: GrooveLab Student Activations (Always covered by School) */}
                      {(invoice.activeGroovelabCount ?? 0) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Cloud- &amp; Modul-Bereitstellung: GrooveLab</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              {invoice.activeGroovelabCount} freigeschaltete GrooveLab-Schüler ({masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. pro Profil). Interaktive Band-Nutzung: Song-Bibliotheken, Band-Rooms, Repertoire.{freeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {invoice.activeGroovelabCount} {invoice.activeGroovelabCount === 1 ? 'Schüler' : 'Schüler'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : `${masterPricing.priceStudent.toFixed(2).replace('.', ',')} €`}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${((invoice.activeGroovelabCount || 0) * masterPricing.priceStudent).toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}
                    </>
                  )}

                  {isAkt && (
                    <>
                      {studentBillingOption === 'option2' || !['option3_2', 'option3_3'].includes(studentBillingOption || '') ? (
                        <>
                          {/* Position 1: Campus Student Activations */}
                          {(() => {
                            const campusCnt = invoice.activeCampusCount !== undefined ? invoice.activeCampusCount : (invoice.activationsCount || 0);
                            if (campusCnt <= 0) return null;
                            return (
                              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 0' }}>
                                  <strong style={{ display: 'block', color: '#0f172a' }}>Cloud- &amp; Modul-Bereitstellung: Campus</strong>
                                  <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                                    {campusCnt} freigeschaltete Campus-Schüler ({masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. pro Profil). Interaktive App-Nutzung: Übe-Timer, Loopstation, Schüler-Protokoll.{freeLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                  {campusCnt} {campusCnt === 1 ? 'Schüler' : 'Schüler'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                  {isFree ? '0,00 €' : `${masterPricing.priceStudent.toFixed(2).replace('.', ',')} €`}
                                </td>
                                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                                  {isFree ? '0,00 €' : `${(campusCnt * masterPricing.priceStudent).toFixed(2).replace('.', ',')} €`}
                                </td>
                              </tr>
                            );
                          })()}
                        </>
                      ) : (
                        /* Position for annual package */
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ display: 'block', color: '#0f172a' }}>Cloud- &amp; Modul-Bereitstellung: Campus</strong>
                            <span style={{ fontSize: '0.68rem', color: isFree ? '#ea4335' : '#64748b', fontWeight: isFree ? 700 : 500 }}>
                              {studentBillingOption === 'option3_3'
                                ? `Einmalige Komplett-Jahrespauschale für alle Schüler-Profile zum Schuljahresstart (inkl. 20% Rabatt). Im Cloud-Paket inklusive.`
                                : `Jahrespauschale für die Cloud-Bereitstellung aktiver Schüler-Profile (inkl. 10% Rabatt für ${invoice.restmonate || 12} Restmonate). Im Cloud-Paket inklusive.`
                              }
                              {isFree && <strong style={{ color: '#ea4335', marginLeft: '6px' }}>{freeLabel}</strong>}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {invoice.activationsCount || 0} Schüler
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                            {isFree ? '0,00 €' : `${(invoice.studentFee || 0.49).toFixed(2).replace('.', ',')} €`}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                            {isFree ? '0,00 €' : `${invoice.amount.toFixed(2).replace('.', ',')} €`}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </>
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
                    <span style={{ fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {isFree ? '0,00 €' : schoolShareTotal.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                )}
                {isAkt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                    <span>{billingPayer === 'student' ? '• Durchlaufender Posten (Umlage an Schüler):' : '• Sammelabrechnung Schüler-Bereitstellung (Träger):'}</span>
                    <span style={{ fontWeight: 650, color: billingPayer === 'student' ? '#34a853' : '#ea580c', whiteSpace: 'nowrap' }}>
                      {studentShareTotal.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                )}
                <div style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#0f172a' }}>
                  <span style={{ fontWeight: 800 }}>
                    {isGutschrift ? 'Gesamtbetrag dieser Gutschrift:' : 'Gesamtbetrag dieser Rechnung:'}
                  </span>
                  <strong style={{ fontWeight: 900, color: isGutschrift ? '#34a853' : (isInf ? '#0369a1' : '#34a853'), whiteSpace: 'nowrap' }}>
                    {isFree ? '0,00 €' : (isGutschrift ? `${Math.abs(invoice.amount).toFixed(2).replace('.', ',')} €` : `${invoice.amount.toFixed(2).replace('.', ',')} €`)}
                  </strong>
                </div>
              </div>
              
              {isAkt && billingPayer === 'student' && (
                <div style={{ fontSize: '0.64rem', color: '#34a853', background: '#e6f4ea', border: '1px solid #e6f4ea', padding: '6px 10px', borderRadius: '8px', fontWeight: 700, width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  <strong>Durchlaufender Posten:</strong> Dieses Guthaben gleicht sich zu 100% durch die Bereitstellungsgebühren der Eltern/Schüler aus. Keine effektiven Kosten für die Musikschule.
                </div>
              )}
              {isAkt && billingPayer === 'school' && (
                <div style={{ fontSize: '0.64rem', color: '#ea580c', background: '#ffedd5', border: '1px solid #fed7aa', padding: '6px 10px', borderRadius: '8px', fontWeight: 700, width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  <strong>Sammelabrechnung:</strong> Diese Cloud-Bereitstellungen werden direkt von der Musikschule getragen und über das Sammelzahlungs-Modell abgerechnet.
                </div>
              )}
              
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '12px', textAlign: 'right', fontStyle: 'italic', fontWeight: 600 }}>
                Die Software-Bereitstellung ist im Cloud-Infrastruktur-Paket inklusive (0,00 €). Das Entgelt wird ausschließlich für die Miete, Bereitstellung und Wartung der Cloud-, Server- und Datenbank-Infrastruktur erhoben. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
              </div>
              
              {/* Payment or Payout notice */}
              {isGutschrift ? (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '16px', 
                  background: '#e6f4ea', 
                  borderRadius: '16px', 
                  border: '1px solid #e6f4ea', 
                  fontSize: '0.74rem', 
                  color: '#34a853', 
                  width: '100%',
                  textAlign: 'left'
                }}>
                  <strong style={{ display: 'block', color: '#34a853', marginBottom: '4px', fontSize: '0.8rem' }}>
                    Auszahlungs- &amp; Verrechnungshinweis:
                  </strong>
                  Dieser Betrag wird Ihrem Kundenkonto gutgeschrieben und mit zukünftigen Forderungen verrechnet oder auf Ihr hinterlegtes Bankkonto erstattet. Sie müssen keine Zahlung veranlassen.
                </div>
              ) : isPaid ? (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '14px 18px', 
                  background: '#f0fdf4', 
                  borderRadius: '16px', 
                  border: '1px solid #bbf7d0', 
                  fontSize: '0.74rem', 
                  color: '#166534', 
                  width: '100%', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left'
                }}>
                  <div>
                    <strong style={{ display: 'block', color: '#166534', marginBottom: '3px', fontSize: '0.84rem' }}>
                      ✓ Rechnungsbetrag vollständig beglichen
                    </strong>
                    <span>Status: <strong>Bezahlt</strong> • Zahlung dankend erhalten. Es ist keine weitere Überweisung erforderlich.</span>
                  </div>
                  <div style={{
                    border: '2px solid #16a34a',
                    color: '#16a34a',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    transform: 'rotate(-3deg)',
                    background: 'rgba(255,255,255,0.85)'
                  }}>
                    BEZAHLT
                  </div>
                </div>
              ) : (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.8rem' }}>Zahlungshinweis &amp; Girocode:</strong>
                      <span style={{ 
                        fontSize: '0.62rem', 
                        fontWeight: 800, 
                        color: isPreview ? '#0284c7' : '#b45309', 
                        background: isPreview ? '#e0f2fe' : '#fef3c7', 
                        border: `1px solid ${isPreview ? '#bae6fd' : '#fde68a'}`, 
                        padding: '1px 8px', 
                        borderRadius: '4px',
                        letterSpacing: '0.02em'
                      }}>
                        {isPreview ? 'Vorschau' : 'Status: Offen (Zahlung ausstehend)'}
                      </span>
                    </div>
                    <span>Bitte überweisen Sie den fälligen Betrag bis zum <strong>{finalDueDateStr}</strong> ohne Abzug auf folgendes Bankkonto. Scannen Sie alternativ den QR-Code mit Ihrer Banking-App für eine fehlerfreie Überweisung:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', marginTop: '8px', gap: '6px' }}>
                      <strong>Zahlungsempfänger:</strong> <span>{operatorCompany}</span>
                      <strong>IBAN:</strong> <span>{operatorIban}</span>
                      {operatorBic && !operatorBic.includes('XXX') ? (
                        <><strong>BIC:</strong> <span>{operatorBic}</span></>
                      ) : (
                        <><strong>BIC:</strong> <span style={{ color: '#64748b' }}>Nicht erforderlich (SEPA IBAN-Only)</span></>
                      )}
                      <strong>Verwendungszweck:</strong> <strong style={{ color: '#0f172a' }}>{displayInvoiceId}</strong>
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
                      value={`BCD\n002\n1\nSCT\n${operatorBic && !operatorBic.includes('XXX') ? operatorBic.replace(/\s+/g, '') : ''}\n${operatorCompany}\n${operatorIban.replace(/\s+/g, '')}\nEUR${invoice.amount.toFixed(2)}\n\n\n${displayInvoiceId}\n`} 
                      size={96} 
                    />
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Girocode scannen
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
