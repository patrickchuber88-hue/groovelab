import React from 'react';
import QRCode from 'react-qr-code';
import { FileCode, Download, Lock } from 'lucide-react';
import { useMasterPricing } from '../context/MasterPricingContext';
import { downloadXRechnungXML, EInvoiceLineItem } from '../utils/eInvoiceGenerator';
import { OPERATOR_BANKING_CONFIG } from '../config/operatorBanking';
import { computeCanonicalDueDate, resolveEffectiveBillingDate } from '../domain/schoolDunningEngine';

export interface InvoiceData {
  id: string;
  date: string;
  dueDateStr?: string;
  amount: number;
  status: string;
  paid?: boolean;
  type?: 'INF' | 'AKT' | 'ALL' | string;
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
  leitwegId?: string;
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
  leitwegId?: string;
  onClose: () => void;
}

interface ParsedInvoiceDate {
  day: number;
  month: number;
  year: number;
  displayDate: string;
  monthName: string;
  billingPeriodStr: string;
  canonicalDue: ReturnType<typeof computeCanonicalDueDate>;
}

const deMonthsList = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function parseAnyInvoiceDate(rawDate?: string): ParsedInvoiceDate {
  const deMonthsMap: Record<string, number> = {
    'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
    'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
  };

  const now = resolveEffectiveBillingDate();
  let day = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  if (rawDate && typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    const textMatch = trimmed.match(/^(\d{1,2})\.\s+([A-Za-zÄÖÜäöüß]+)\s+(\d{4})/);
    if (textMatch) {
      day = parseInt(textMatch[1], 10);
      const mName = textMatch[2].toLowerCase();
      month = deMonthsMap[mName] || month;
      year = parseInt(textMatch[3], 10);
    } else if (trimmed.match(/^\d{1,2}\.\d{1,2}\.\d{4}/)) {
      const dotParts = trimmed.split('.');
      day = parseInt(dotParts[0], 10);
      month = parseInt(dotParts[1], 10);
      year = parseInt(dotParts[2], 10);
    } else if (trimmed.includes('-')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        day = d.getDate();
        month = d.getMonth() + 1;
        year = d.getFullYear();
      }
    }
  }

  const monthName = deMonthsList[month - 1] || 'Monat';
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const displayDate = `${pad(day)}.${pad(month)}.${year}`;
  const billingPeriodStr = `01.${pad(month)}.${year} – ${pad(lastDay)}.${pad(month)}.${year} (${monthName} ${year})`;
  const canonicalDue = computeCanonicalDueDate(year, month);

  return {
    day,
    month,
    year,
    displayDate,
    monthName,
    billingPeriodStr,
    canonicalDue
  };
}

interface RenderLineItem {
  id: number;
  title: string;
  subtitle: string;
  quantityStr: string;
  quantityNumber: number;
  unitPrice: number;
  totalPrice: number;
  isDiscount?: boolean;
  section: 'A' | 'B';
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
  leitwegId,
  onClose
}) => {
  const masterPricing = useMasterPricing();
  const isChf = masterPricing.currency === 'CHF';
  const effectiveLeitwegId = (leitwegId || invoice.leitwegId || '').trim();
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

  const isSammelzahler = billingPayer === 'school' || invoice.isSammelzahler === true || invoice.type === 'ALL';
  const shouldRenderSectionBCharge = invoice.type === 'ALL' || invoice.type === 'AKT' || (isSammelzahler && invoice.type !== 'INF');

  const dateInfo = parseAnyInvoiceDate(invoice.date);
  const finalDueDateStr = invoice.dueDateStr || dateInfo.canonicalDue.dueDateDisplay;
  const lpStr = dateInfo.billingPeriodStr;

  // Counts & Metriken
  const teacherCount = invoice.totalTeachersCount || 0;
  const passiveCount = invoice.passiveStudentsCount || 0;
  const studentCount = invoice.activeCampusCount !== undefined ? invoice.activeCampusCount : (invoice.activationsCount || 0);
  const glCount = invoice.activeGroovelabCount || 0;
  const storageGb = invoice.storageAddonGb || 0;
  const storageFee = invoice.storageAddonMonthlyFee || 0;

  // Dynamische Generierung aller Positionen
  const renderItems: RenderLineItem[] = [];

  // Pos 1: Software-Bereitstellung (0 € gem. SaaS-Axiom)
  renderItems.push({
    id: 1,
    title: 'Campus-Groovelab Software-Bereitstellung',
    subtitle: 'Pädagogische Schulplattform & Web-App (Im Cloud-Paket inklusive / 0,00 €)',
    quantityStr: '1 Monat',
    quantityNumber: 1,
    unitPrice: 0,
    totalPrice: 0,
    section: 'A'
  });

  // Abschnitt A: Infrastruktur- & Team-Hosting (wenn nicht reine separate AKT-Rechnung)
  if (invoice.type !== 'AKT') {
    if (invoice.hasCampus) {
      const uPrice = isFree ? 0 : masterPricing.priceCampus;
      renderItems.push({
        id: 2,
        title: 'Cloud- & Datenbank-Hosting: Modul Campus',
        subtitle: `Dedizierte Schul-Instanz, Server-Bereitstellung & Hosting (Campus)${freeLabel}`,
        quantityStr: '1 Monat',
        quantityNumber: 1,
        unitPrice: uPrice,
        totalPrice: uPrice,
        section: 'A'
      });
    }

    if (invoice.hasGroovelab) {
      const uPrice = isFree ? 0 : masterPricing.priceGroovelab;
      renderItems.push({
        id: 3,
        title: 'Cloud- & Datenbank-Hosting: Modul GrooveLab',
        subtitle: `Echtzeit-Bandmodul, Server-Infrastruktur & Audio-Routing (GrooveLab)${freeLabel}`,
        quantityStr: '1 Monat',
        quantityNumber: 1,
        unitPrice: uPrice,
        totalPrice: uPrice,
        section: 'A'
      });
    }

    if (invoice.hasCampus && invoice.hasGroovelab && !isFree) {
      renderItems.push({
        id: 4,
        title: 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
        subtitle: `Preisvorteil bei paralleler Bereitstellung von Campus + GrooveLab (${(masterPricing.priceCampus + masterPricing.priceGroovelab - masterPricing.kombiSavings).toFixed(2).replace('.', ',')} € statt ${(masterPricing.priceCampus + masterPricing.priceGroovelab).toFixed(2).replace('.', ',')} €)`,
        quantityStr: '1 Monat',
        quantityNumber: 1,
        unitPrice: -masterPricing.kombiSavings,
        totalPrice: -masterPricing.kombiSavings,
        isDiscount: true,
        section: 'A'
      });
    }

    if (teacherCount > 0) {
      const uPrice = isFree ? 0 : masterPricing.priceTeacher;
      const totalT = parseFloat((teacherCount * uPrice).toFixed(2));
      renderItems.push({
        id: 5,
        title: 'Service- & Administrationspauschale (Lehrkräfte)',
        subtitle: `${teacherCount} aktive Lehrkraft-Profile (${masterPricing.priceTeacher.toFixed(2).replace('.', ',')} € / Mo. pro Lehrkraft; Schulleitung & Sekretariat 0,00 € inkl.)${freeLabel}`,
        quantityStr: `${teacherCount} ${teacherCount === 1 ? 'Lehrkraft' : 'Lehrkräfte'}`,
        quantityNumber: teacherCount,
        unitPrice: uPrice,
        totalPrice: totalT,
        section: 'A'
      });
    }

    if (passiveCount > 0) {
      const passiveRate = masterPricing.pricePassiveStudent ?? 0.09;
      const uPrice = isFree ? 0 : passiveRate;
      const totalP = parseFloat((passiveCount * uPrice).toFixed(2));
      renderItems.push({
        id: 6,
        title: 'Basis-Bereitstellung (Schüler-Datenbank)',
        subtitle: `${passiveCount} Schüler-Accounts (${passiveRate.toFixed(2).replace('.', ',')} € / Mo. pro Schüler). DSGVO-Datensätze, Stundenplan-, Raum- & Termin-Sync, QR-Landingpages.${freeLabel}`,
        quantityStr: `${passiveCount} Schüler`,
        quantityNumber: passiveCount,
        unitPrice: uPrice,
        totalPrice: totalP,
        section: 'A'
      });
    }

    if (storageGb > 0) {
      const uPrice = isFree ? 0 : storageFee;
      renderItems.push({
        id: 7,
        title: `Zusatz-Speichervolumen: Audio-Tresor (+${storageGb} GB)`,
        subtitle: `Dedizierter Cloud-Speicher für hochauflösende Audio-Aufnahmen & Masterpieces (${storageFee.toFixed(2).replace('.', ',')} € / Mo.)${freeLabel}`,
        quantityStr: '1 Monat',
        quantityNumber: 1,
        unitPrice: uPrice,
        totalPrice: uPrice,
        section: 'A'
      });
    }

    if (glCount > 0) {
      const uPrice = isFree ? 0 : masterPricing.priceStudent;
      const totalGL = parseFloat((glCount * uPrice).toFixed(2));
      renderItems.push({
        id: 8,
        title: 'Cloud- & Modul-Bereitstellung: GrooveLab',
        subtitle: `${glCount} freigeschaltete GrooveLab-Schüler (${masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. pro Profil). Interaktive Band-Nutzung; Kosten trägt Musikschule.${freeLabel}`,
        quantityStr: `${glCount} Schüler`,
        quantityNumber: glCount,
        unitPrice: uPrice,
        totalPrice: totalGL,
        section: 'A'
      });
    }
  }

  // Abschnitt B: Schüler-Aktivierungen (Campus App)
  if (shouldRenderSectionBCharge) {
    if (studentCount > 0) {
      const uPrice = isFree ? 0 : masterPricing.priceStudent;
      const totalS = parseFloat((studentCount * uPrice).toFixed(2));
      renderItems.push({
        id: 9,
        title: 'Cloud- & Modul-Bereitstellung: Campus (Schüleraktivierungen)',
        subtitle: `${studentCount} freigeschaltete Campus-Schüler (${masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. pro Profil). Interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll.${freeLabel}`,
        quantityStr: `${studentCount} ${studentCount === 1 ? 'Schüler' : 'Schüler'}`,
        quantityNumber: studentCount,
        unitPrice: uPrice,
        totalPrice: totalS,
        section: 'B'
      });
    }
  } else if (studentCount > 0) {
    // Direktabrechnung durch Eltern: Informativer durchlaufender Posten
    renderItems.push({
      id: 9,
      title: 'Campus-Schüleraktivierungen (Durchlaufender Posten)',
      subtitle: `${studentCount} aktive Schüler-Zugänge (${masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. pro Profil). Direktabrechnung über Erziehungsberechtigte — 0,00 € Trägeranteil.`,
      quantityStr: `${studentCount} Schüler`,
      quantityNumber: studentCount,
      unitPrice: 0,
      totalPrice: 0,
      section: 'B'
    });
  }

  // Exakte mathematische Konsistenz
  const sectionATotal = parseFloat(
    renderItems.filter(it => it.section === 'A').reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2)
  );
  const sectionBTotal = parseFloat(
    renderItems.filter(it => it.section === 'B').reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2)
  );
  const computedTableTotal = parseFloat((sectionATotal + sectionBTotal).toFixed(2));
  const finalDisplayAmount = isFree ? 0.00 : (isGutschrift ? Math.abs(invoice.amount) : computedTableTotal);

  // Bankdaten & EPC-GiroCode Integrität
  const cleanIban = (operatorIban || OPERATOR_BANKING_CONFIG.iban || '').replace(/\s+/g, '').toUpperCase();
  const isIbanConfigured = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleanIban) && !cleanIban.includes('EINRICHTUNG');
  const displayIban = isIbanConfigured
    ? cleanIban.replace(/(.{4})/g, '$1 ').trim()
    : 'Wird vor Rechnungsversand hinterlegt (Betreiber-Konfiguration ausstehend)';

  const formatDisplayIban = (rawIban?: string) => {
    const trimmed = (rawIban || OPERATOR_BANKING_CONFIG.iban || '').trim();
    const clean = trimmed.replace(/\s+/g, '').toUpperCase();
    if (/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(clean)) {
      return clean.replace(/(.{4})/g, '$1 ').trim();
    }
    return trimmed;
  };

  const handleDownloadXRechnung = () => {
    const lineItems: EInvoiceLineItem[] = renderItems.map(item => ({
      id: item.id,
      name: item.title,
      description: item.subtitle,
      quantity: item.quantityNumber,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      vatPercent: 0
    }));

    const cleanSellerIban = (operatorIban || '').replace(/\s+/g, '').toUpperCase();
    const isValidSellerIban = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleanSellerIban) && !cleanSellerIban.includes('EINRICHTUNG');

    downloadXRechnungXML({
      invoiceNumber: displayInvoiceId,
      issueDate: `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}-${String(dateInfo.day).padStart(2, '0')}`,
      dueDate: dateInfo.canonicalDue.dueDateIso,
      billingPeriodStart: `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}-01`,
      billingPeriodEnd: `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}-${String(new Date(dateInfo.year, dateInfo.month, 0).getDate()).padStart(2, '0')}`,
      seller: {
        name: operatorCompany || 'Campus-Groovelab',
        street: operatorStreet || 'Karl-Fürstenberg-Str. 59',
        zipCode: operatorZip || '79618',
        city: operatorCity || 'Rheinfelden',
        iban: isValidSellerIban ? cleanSellerIban : undefined,
        bic: (isValidSellerIban && operatorBic && !operatorBic.includes('XXX') && !operatorBic.includes('Einrichtung')) ? operatorBic : undefined,
        vatId: OPERATOR_BANKING_CONFIG.ustIdNr || undefined,
        taxNumber: OPERATOR_BANKING_CONFIG.taxNumber || undefined
      },
      buyer: {
        name: schoolName || 'Musikschule',
        street: schoolStreet || 'Schuladresse',
        zipCode: schoolZipCode || '70000',
        city: schoolCity || 'Schulort',
        countryCode: isChf ? 'CH' : 'DE'
      },
      buyerReference: effectiveLeitwegId || undefined,
      lineItems,
      paymentReference: displayInvoiceId,
      notes: isChf
        ? 'Campus-Groovelab Cloud- und Schul-Infrastruktur. Nicht steuerbare Leistung gem. § 3a Abs. 2 UStG (Leistungsort Schweiz gem. Art. 8 Abs. 1 MWSTG — Bezugsteuerpflicht durch Leistungsempfänger).'
        : 'Campus-Groovelab Cloud- und Schul-Infrastruktur. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
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
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Rechnungsvorschau"
        style={{
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
                boxShadow: 'none'
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
                boxShadow: 'none'
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
              border: 'none',
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
                    ? (invoice.type === 'ALL' || (isSammelzahler && invoice.type !== 'INF' && invoice.type !== 'AKT') 
                        ? 'VORSCHAU: KONSOLIDIERTE MONATSRECHNUNG' 
                        : (isInf ? (isTrial ? 'VORSCHAU: PROBEMONAT' : 'VORSCHAU: INFRASTRUKTUR- & SERVICEGEBÜHREN') : 'VORSCHAU: SCHÜLERAKTIVIERUNGEN'))
                    : (invoice.type === 'ALL' || (isSammelzahler && invoice.type !== 'INF' && invoice.type !== 'AKT') 
                        ? 'KONSOLIDIERTE MONATSRECHNUNG' 
                        : (isInf ? (isTrial ? 'PROBEMONAT' : 'INFRASTRUKTUR- & SERVICEGEBÜHREN') : 'SCHÜLERAKTIVIERUNGEN')))}
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
              {effectiveLeitwegId && (
                <span style={{ display: 'block', marginTop: '3px', fontSize: '0.66rem', color: '#334155' }}>
                  <strong style={{ color: '#0f172a' }}>Leitweg-ID:</strong> <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>{effectiveLeitwegId}</span>
                </span>
              )}
            </div>
            <div>
              <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 800, display: 'block', marginBottom: '6px' }}>Dienstleister</span>
              <strong style={{ color: '#16a34a', display: 'block', fontSize: '0.85rem' }}>Campus-Groovelab</strong>
              <strong style={{ color: '#0f172a', display: 'block', fontWeight: 600 }}>{operatorCompany}</strong>
              {operatorContact && operatorContact !== operatorCompany && <span style={{ display: 'block' }}>{operatorContact}</span>}
              <span style={{ display: 'block' }}>{operatorStreet || OPERATOR_BANKING_CONFIG.street}</span>
              <span style={{ display: 'block' }}>{operatorZip || OPERATOR_BANKING_CONFIG.zipCode} {operatorCity || OPERATOR_BANKING_CONFIG.city}</span>
              <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
                {OPERATOR_BANKING_CONFIG.ustIdNr
                  ? `USt-IdNr.: ${OPERATOR_BANKING_CONFIG.ustIdNr}`
                  : OPERATOR_BANKING_CONFIG.taxNumber
                    ? `Steuernummer: ${OPERATOR_BANKING_CONFIG.taxNumber}`
                    : 'Kleinunternehmer gem. § 19 UStG (Steuernummer in Zuteilung)'}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr', gap: '8px', fontSize: '0.7rem', marginBottom: '16px', border: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Rechnungsdatum</span>
              <strong style={{ color: '#0f172a' }}>{dateInfo.displayDate}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Fälligkeit</span>
              <strong style={{ color: '#0f172a' }}>{finalDueDateStr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Leistungszeitraum</span>
              <strong style={{ color: '#0f172a' }}>{dateInfo.billingPeriodStr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Zahlungsart</span>
              <strong style={{ color: '#0f172a' }}>Rechnung (30 Tage Zahlungsziel)</strong>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', marginBottom: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '8px 0', whiteSpace: 'nowrap' }}>Position</th>
                <th style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>Menge</th>
                <th style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>Einzelpreis</th>
                <th style={{ padding: '8px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>Gesamtpreis</th>
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
                renderItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', color: item.isDiscount ? '#137333' : '#1e293b' }}>
                    <td style={{ padding: '8px 0' }}>
                      <strong style={{ display: 'block', color: item.isDiscount ? '#137333' : '#0f172a' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.68rem', color: item.isDiscount ? '#137333' : '#64748b', fontWeight: item.isDiscount ? 600 : 500 }}>
                        {item.subtitle}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: item.isDiscount ? '#137333' : '#64748b', whiteSpace: 'nowrap' }}>
                      {item.quantityStr}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: item.isDiscount ? '#137333' : '#64748b', whiteSpace: 'nowrap' }}>
                      {item.isDiscount ? `-${Math.abs(item.unitPrice).toFixed(2).replace('.', ',')} €` : `${item.unitPrice.toFixed(2).replace('.', ',')} €`}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: item.isDiscount || item.totalPrice > 0 ? 700 : 600, color: item.isDiscount ? '#137333' : '#0f172a', whiteSpace: 'nowrap' }}>
                      {item.isDiscount ? `-${Math.abs(item.totalPrice).toFixed(2).replace('.', ',')} €` : `${item.totalPrice.toFixed(2).replace('.', ',')} €`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Total Calculation */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.78rem', borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ width: '340px' }}>
                {isSammelzahler && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                      <span>• Abschnitt A (Infrastruktur &amp; Team):</span>
                      <span style={{ fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {isFree ? '0,00 €' : `${sectionATotal.toFixed(2).replace('.', ',')} €`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                      <span>• Abschnitt B (Schüler-Aktivierungen):</span>
                      <span style={{ fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {isFree ? '0,00 €' : `${sectionBTotal.toFixed(2).replace('.', ',')} €`}
                      </span>
                    </div>
                  </>
                )}
                {!isSammelzahler && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                      <span>• Träger Musikschule (Betrieb &amp; Hosting):</span>
                      <span style={{ fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {isFree ? '0,00 €' : `${sectionATotal.toFixed(2).replace('.', ',')} €`}
                      </span>
                    </div>
                    {studentCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#16a34a', marginBottom: '4px' }}>
                        <span>• Durchlaufender Posten (Eltern-Direktzahlung):</span>
                        <span style={{ fontWeight: 650, whiteSpace: 'nowrap' }}>
                          0,00 € Trägeranteil
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#0f172a' }}>
                  <span style={{ fontWeight: 800 }}>
                    {isGutschrift ? 'Gesamtbetrag dieser Gutschrift:' : 'Gesamtbetrag dieser Rechnung:'}
                  </span>
                  <strong style={{ fontWeight: 900, color: isGutschrift ? '#34a853' : '#0369a1', whiteSpace: 'nowrap' }}>
                    {finalDisplayAmount.toFixed(2).replace('.', ',')} €
                  </strong>
                </div>
              </div>
              
              {isAkt && billingPayer === 'student' && (
                <div style={{ fontSize: '0.64rem', color: '#34a853', background: '#e6f4ea', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: 700, width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  <strong>Durchlaufender Posten:</strong> Dieses Guthaben gleicht sich zu 100% durch die Bereitstellungsgebühren der Eltern/Schüler aus. Keine effektiven Kosten für die Musikschule.
                </div>
              )}
              {isSammelzahler && sectionBTotal > 0 && (
                <div style={{ fontSize: '0.64rem', color: '#ea580c', background: '#ffedd5', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: 700, width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  <strong>Sammelabrechnung:</strong> Schüler-Aktivierungen werden direkt von der Musikschule getragen und über die konsolidierte Monatsrechnung abgerechnet.
                </div>
              )}
              
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '12px', textAlign: 'right', fontStyle: 'italic', fontWeight: 600 }}>
                {isChf
                  ? 'Die Software-Bereitstellung ist im Cloud-Infrastruktur-Paket inklusive (0,00 CHF). Das Entgelt wird ausschließlich für die Miete, Bereitstellung und Wartung der Cloud-, Server- und Datenbank-Infrastruktur erhoben. Nicht steuerbare Leistung gem. § 3a Abs. 2 UStG (Leistungsort Schweiz gem. Art. 8 Abs. 1 MWSTG — Bezugsteuerpflicht durch Leistungsempfänger).'
                  : 'Die Software-Bereitstellung ist im Cloud-Infrastruktur-Paket inklusive (0,00 €). Das Entgelt wird ausschließlich für die Miete, Bereitstellung und Wartung der Cloud-, Server- und Datenbank-Infrastruktur erhoben. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).'}
              </div>
              
              {/* Payment or Payout notice */}
              {isGutschrift ? (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '16px', 
                  background: '#e6f4ea', 
                  borderRadius: '16px', 
                  border: 'none', 
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
                  border: 'none', 
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
                      <strong>Zahlungsempfänger:</strong> <span>{operatorCompany || OPERATOR_BANKING_CONFIG.companyName}</span>
                      <strong>IBAN:</strong> <span style={{ fontFamily: 'monospace', letterSpacing: '0.04em', color: isIbanConfigured ? '#0f172a' : '#b45309', fontWeight: isIbanConfigured ? 600 : 700 }}>{displayIban}</span>
                      {isIbanConfigured && operatorBic && !operatorBic.includes('XXX') ? (
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
                    flexShrink: 0,
                    minWidth: '120px',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}>
                    {isIbanConfigured ? (
                      <>
                        <QRCode 
                          value={`BCD\n002\n1\nSCT\n${operatorBic && !operatorBic.includes('XXX') && !operatorBic.includes('Einrichtung') ? operatorBic.replace(/\s+/g, '') : ''}\n${operatorCompany || OPERATOR_BANKING_CONFIG.companyName}\n${cleanIban}\nEUR${finalDisplayAmount.toFixed(2)}\n\n\n${displayInvoiceId}\n`} 
                          size={96} 
                        />
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Girocode scannen
                        </span>
                      </>
                    ) : (
                      <div style={{ width: '96px', height: '96px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', padding: '8px', boxSizing: 'border-box' }}>
                        <Lock size={18} color="#94a3b8" style={{ marginBottom: '4px' }} />
                        <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#475569', lineHeight: 1.3 }}>
                          EPC-GiroCode aktiv ab IBAN-Hinterlegung
                        </span>
                      </div>
                    )}
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
