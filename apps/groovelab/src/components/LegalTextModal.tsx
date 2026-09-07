import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, FileText, Building, Undo2, Scale, Printer } from 'lucide-react';
import { useMasterPricing } from '../context/MasterPricingContext';

interface LegalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'impressum' | 'privacy' | 'terms' | 'cancellation';
}

export const LegalTextModal: React.FC<LegalTextModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'impressum'
}) => {
  const masterPricing = useMasterPricing();
  const [activeTab, setActiveTab] = useState<'impressum' | 'privacy' | 'terms' | 'cancellation'>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialTab]);

  const handlePrintTextOnly = () => {
    if (!contentRef.current) return;

    let docTitle = 'Rechtliche Dokumente – Campus-Groovelab';
    let tabHeading = 'Rechtliche Hinweise';
    if (activeTab === 'impressum') {
      docTitle = 'Campus-Groovelab – Impressum & Anbieterkennzeichnung';
      tabHeading = 'Impressum & Anbieterkennzeichnung';
    } else if (activeTab === 'privacy') {
      docTitle = 'Campus-Groovelab – Datenschutzerklärung (DSGVO)';
      tabHeading = 'Datenschutzerklärung nach Art. 13, 14 & 21 DSGVO';
    } else if (activeTab === 'terms') {
      docTitle = 'Campus-Groovelab – Allgemeine Geschäftsbedingungen (AGB)';
      tabHeading = 'Allgemeine Geschäftsbedingungen (AGB) – Teil A (B2B) & Teil B (B2C)';
    } else if (activeTab === 'cancellation') {
      docTitle = 'Campus-Groovelab – Widerrufsbelehrung & Muster-Widerrufsformular';
      tabHeading = 'Widerrufsbelehrung & Muster-Widerrufsformular (B2C)';
    }

    const contentHtml = contentRef.current.innerHTML;

    // Clean up any previously created print iframe
    const existingIframe = document.getElementById('apple-legal-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'apple-legal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.style.top = '0';
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 20mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.58;
      color: #0f172a;
      background: #ffffff;
    }
    .print-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12pt;
      margin-bottom: 16pt;
    }
    .print-header-brand {
      font-size: 15pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .print-header-title {
      font-size: 12.5pt;
      font-weight: 800;
      color: #1e293b;
      margin: 4pt 0 5pt 0;
    }
    .print-header-meta {
      font-size: 8.5pt;
      color: #64748b;
      display: flex;
      gap: 14pt;
      flex-wrap: wrap;
    }
    h4 {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 14pt;
      margin-bottom: 5pt;
      page-break-after: avoid;
      break-after: avoid;
    }
    p, li {
      margin-top: 3pt;
      margin-bottom: 5pt;
      color: #334155;
    }
    ul, ol {
      padding-left: 16pt;
      margin-top: 3pt;
      margin-bottom: 6pt;
    }
    div[style*="border"] {
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: none !important;
    }
    .print-footer {
      margin-top: 24pt;
      padding-top: 8pt;
      border-top: 1px solid #cbd5e1;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-header-brand">Campus-Groovelab</div>
    <div class="print-header-title">${tabHeading}</div>
    <div class="print-header-meta">
      <span><strong>Stand:</strong> Schuljahr 2026/2027</span>
      <span><strong>Geltungsbereich:</strong> DACH (DE, AT, CH)</span>
      <span><strong>Rechtskonform:</strong> BGB, DSGVO, UrhG &amp; DSA</span>
    </div>
  </div>

  <div class="print-body">
    ${contentHtml}
  </div>

  <div class="print-footer">
    <span>Campus-Groovelab Schul-Cloud • Offizielles Rechtsdokument</span>
    <span>Druckdatum: ${new Date().toLocaleDateString('de-DE')}</span>
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print error:', err);
        window.print();
      }
    }, 150);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p' && isOpen) {
        e.preventDefault();
        handlePrintTextOnly();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeTab]);

  const handleTabChange = (tab: 'impressum' | 'privacy' | 'terms' | 'cancellation') => {
    setActiveTab(tab);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div id="apple-legal-modal-portal" className="apple-legal-portal-root">
      <style>{`
        @keyframes appleModalIn {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .apple-custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .apple-custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .apple-custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(15, 23, 42, 0.14);
          border-radius: 10px;
        }
        .apple-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(15, 23, 42, 0.25);
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 18mm 15mm 20mm 15mm;
          }
          html, body {
            background: #ffffff !important;
          }
          #root, body > *:not(#apple-legal-modal-portal) {
            display: none !important;
          }
          .apple-legal-no-print {
            display: none !important;
          }
          #apple-legal-modal-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .apple-legal-backdrop {
            position: static !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            z-index: auto !important;
            display: block !important;
          }
          .apple-legal-window {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            animation: none !important;
          }
          .apple-custom-scrollbar {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
          }
          .apple-legal-print-only-header {
            display: block !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 12pt !important;
            margin-bottom: 18pt !important;
          }
        }
      `}</style>
      <div 
        className="apple-legal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          className="apple-legal-window"
          style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '860px',
            maxHeight: 'min(90vh, 840px)',
            height: '840px',
            borderRadius: '26px',
            boxShadow: '0 32px 80px -16px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            animation: 'appleModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Apple HIG Titlebar / Header */}
          <div className="apple-legal-no-print" style={{
            padding: '18px 28px',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                flexShrink: 0
              }}>
                <Scale size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Rechtliche Hinweise – Campus-Groovelab
                  </h3>
                  <span style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    fontSize: '0.66rem',
                    fontWeight: 750,
                    letterSpacing: '0.02em'
                  }}>
                    DACH • B2B &amp; B2C
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                  Offizielle Dokumente &amp; Compliance für Deutschland, Österreich und die Schweiz
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Rechtliche Hinweise schließen"
              style={{
                border: 'none',
                background: 'rgba(15, 23, 42, 0.05)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.1)'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)'; e.currentTarget.style.color = '#475569'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Apple HIG Segmented Control */}
          <div className="apple-legal-no-print" style={{
            padding: '10px 28px',
            background: '#f8fafc',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: '3px',
              borderRadius: '12px',
              gap: '2px'
            }}>
              {[
                { id: 'impressum', label: 'Impressum', icon: Building },
                { id: 'privacy', label: 'Datenschutz', icon: ShieldCheck },
                { id: 'terms', label: 'AGB', icon: FileText },
                { id: 'cancellation', label: 'Widerruf (B2C)', icon: Undo2 }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '9px',
                      border: 'none',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#0f172a' : '#64748b',
                      fontWeight: isActive ? 750 : 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    <Icon size={15} color={isActive ? '#0f172a' : '#64748b'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Print-Only Official Document Header */}
          <div className="apple-legal-print-only-header" style={{ display: 'none' }}>
            <div style={{ fontSize: '15pt', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Campus-Groovelab
            </div>
            <div style={{ fontSize: '12.5pt', fontWeight: 800, color: '#1e293b', margin: '4pt 0 5pt 0' }}>
              {activeTab === 'impressum' && 'Impressum & Anbieterkennzeichnung'}
              {activeTab === 'privacy' && 'Datenschutzerklärung nach Art. 13, 14 & 21 DSGVO'}
              {activeTab === 'terms' && 'Allgemeine Geschäftsbedingungen (AGB) – Teil A (B2B) & Teil B (B2C)'}
              {activeTab === 'cancellation' && 'Widerrufsbelehrung & Muster-Widerrufsformular (B2C)'}
            </div>
            <div style={{ fontSize: '8.5pt', color: '#64748b', display: 'flex', gap: '14pt', flexWrap: 'wrap' }}>
              <span><strong>Stand:</strong> Schuljahr 2026/2027</span>
              <span><strong>Geltungsbereich:</strong> DACH (DE, AT, CH)</span>
              <span><strong>Rechtskonform:</strong> BGB, DSGVO, UrhG &amp; DSA</span>
            </div>
          </div>

          {/* Content Body (Apple Content Stage) */}
          <div 
            ref={contentRef}
            className="apple-custom-scrollbar"
            style={{
              padding: '28px 32px',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              fontSize: '0.85rem',
              lineHeight: 1.68,
              color: '#334155',
              background: '#ffffff'
            }}
          >
            {activeTab === 'impressum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Angaben gemäß § 5 DDG (DE), § 5 ECG / § 25 MedienG (AT) &amp; Art. 3 Abs. 1 lit. s UWG (CH)
              </h4>

              <div style={{ background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#0f172a' }}>Diensteanbieter &amp; Betreiber der Plattform Campus-Groovelab:</strong><br />
                Patrick Huber<br />
                <span style={{ fontSize: '0.86rem', color: '#475569' }}>Softwareentwicklung &amp; Cloud-Dienstleistungen (Einzelunternehmen)</span><br />
                Karl-Fürstenberg-Str. 59<br />
                79618 Rheinfelden (Baden)<br />
                Deutschland
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Kontakt &amp; Schnelle elektronische Kontaktaufnahme (§ 5 Abs. 1 Nr. 2 DDG / Art. 3 UWG CH):</strong><br />
                E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>kontakt@campus-groovelab.de</a><br />
                Support &amp; Schulbetreuung: <a href="mailto:patrick.huber@musaek.de" style={{ color: '#34a853', fontWeight: 700 }}>patrick.huber@musaek.de</a><br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>⚡ Elektronischer Schnellkontakt-Service (EuGH C-298/07 / BGH I ZR 238/14):</strong> Anfragen über unsere elektronischen Support-Kanäle werden an Werktagen (Mo–Fr 08:00–18:00 Uhr) <strong>in der Regel innerhalb von maximal 60 Minuten</strong> beantwortet. Allen registrierten Musikschulen, Lehrkräften und Schülern steht zudem ein direktes In-App-Support- und Ticket-System im persönlichen Dashboard zur Verfügung.
                </span>
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                  Website: <a href="https://campus-groovelab.de" target="_blank" rel="noopener noreferrer" style={{ color: '#34a853', fontWeight: 700 }}>campus-groovelab.de</a>
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Zentrale Kontaktstelle für Behörden und Nutzer gemäß Art. 11, 12 Digital Services Act (DSA):</strong><br />
                E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> / <a href="mailto:copyright@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>copyright@campus-groovelab.de</a><br />
                <span style={{ fontSize: '0.80rem', color: '#475569' }}>Amtssprachen für behördliche und nutzerseitige Anfragen: Deutsch, Englisch.</span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Umsatzsteuer &amp; Steuerliche Einstufung (§ 5 Abs. 1 Nr. 6 DDG / § 6 UStG AT / Art. 8 MWSTG CH):</strong><br />
                - <strong>Deutschland:</strong> Umsatzsteuerbefreit gemäß <strong>§ 19 UStG (Kleinunternehmerregelung)</strong>. Es wird keine Umsatzsteuer erhoben oder ausgewiesen.<br />
                - <strong>Österreich:</strong> Umsatzsteuerbefreit gemäß <strong>§ 6 Abs. 1 Z 27 UStG 1994 (Kleinunternehmerregelung)</strong>.<br />
                - <strong>Schweiz:</strong> Leistungsort Schweiz gemäß <strong>Art. 8 Abs. 1 MWSTG</strong> (nicht im Inland steuerbar).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Verantwortlich für den redaktionellen Inhalt gemäß § 18 Abs. 2 MStV (DE) / Offenlegung gem. § 25 MedienG (AT):</strong><br />
                Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden)<br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>Grundlegende Richtung des Online-Mediums (Blattlinie gem. § 25 Abs. 4 MedienG AT):</strong> Information und Bereitstellung digitaler Werkzeuge zur pädagogischen Organisation und didaktischen Begleitung von Musikschulunterricht, Raum-, Stundenplan- und Terminplanung sowie didaktischem Instrumentalüben.
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>EU-Streitschlichtung &amp; Verbraucherstreitbeilegung (§ 36 VSBG):</strong><br />
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>https://ec.europa.eu/consumers/odr/</a>.<br />
                Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <strong style={{ color: '#0f172a' }}>Haftung für Inhalte &amp; Hosting-Immunität (DSA / DDG / ECG):</strong> Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG / § 16 ECG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für übermittelte oder gespeicherte fremde Informationen sind wir als Host-Provider gemäß Art. 6 Verordnung (EU) 2022/2065 (Digital Services Act – DSA) i. V. m. § 7 Abs. 2 DDG nicht verpflichtet, diese proaktiv zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen ab dem Zeitpunkt der tatsächlichen Kenntnis einer konkreten Rechtsverletzung bleiben hiervon unberührt.
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Datenschutzerklärung (DSGVO / nDSG / TDDDG)
              </h4>

              <div>
                <strong style={{ color: '#0f172a' }}>1. Allgemeine Hinweise &amp; Verantwortlicher</strong><br />
                Der Schutz Ihrer Daten hat für <strong>Campus-Groovelab</strong> höchste Priorität. Verantwortlich im Sinne der DSGVO, des Schweizer nDSG und des österreichischen DSG ist Patrick Huber (Kontaktdaten siehe Impressum).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>2. Grundsatz der Datenminimierung, Zero-Mail-Architektur, Mindestalter &amp; Bildschirmfreies Üben („Screenless Practice“, Art. 5 &amp; 8 DSGVO / Art. 6 nDSG)</strong><br />
                (1) <strong>Keine Zahlungs- oder Bankdaten:</strong> Auf Campus-Groovelab werden keinerlei Bank-, SEPA-, Kreditkarten- oder Abrechnungsvertragsdaten gespeichert.<br />
                (2) <strong>Zero-Mail-Architektur:</strong> Weder von Schülern noch von Eltern, Lehrkräften oder Sekretariatsmitarbeitern werden private E-Mail-Adressen erhoben oder gespeichert. Die gesamte Authentifizierung und Profilzuordnung erfolgt tokenbasiert über physische Schulausweise, Passkeys oder serverseitig gehashte PINs. Einzig für den Schulleitungs-Account (B2B-Vertragspartner) wird eine offizielle Schul- bzw. Organisations-E-Mail-Adresse zur Vertragsabwicklung und Notfall-Authentifizierung hinterlegt.<br />
                (3) <strong>Namensdarstellung &amp; Schutz von Minderjährigen:</strong> Schülernamen werden im Lehrer-Dashboard zum Schutz von Minderjährigen stets datenschutzkonform auf „Vorname + N.“ (z. B. „Max M.“) gekürzt. Lehrkräftenamen werden hingegen auf allen Plattform-Oberflächen für Schüler und Eltern stets mit vollem Namen (Vorname + Nachname) angezeigt, um Transparenz und Verwechslungsfreiheit im Schulbetrieb zu gewährleisten.<br />
                (4) <strong>Mindestalter &amp; Bildschirmfreies Üben:</strong> Das Mindestalter für die Nutzung beträgt 6 Jahre. Zur Vermeidung unnötiger Bildschirmzeit bei jüngeren Kindern (insbesondere 6–9 Jahre) unterstützt die Plattform das didaktische Prinzip des <strong>bildschirmfreien Übens („Screenless Practice“)</strong>: Das Endgerät verbleibt bei den Erziehungsberechtigten; Übeeinheiten am echten akustischen Instrument werden per 1-Klick-Quittierung im Elternmodus verbucht (gedeckelt auf max. 60 Minuten pro Tag zur Missbrauchs- und Inflationsprävention).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>3. Backend-for-Frontend (BFF) Architektur, IndexedDB Audio-Tresor &amp; Entbehrlichkeit eines Cookie-Banners (§ 25 Abs. 2 Nr. 2 TDDDG / § 165 TKG / Art. 6 nDSG)</strong><br />
                Zur Gewährleistung des Banking-Goldstandards setzt Campus-Groovelab eine <strong>Backend-for-Frontend (BFF) Gateway-Architektur</strong> ein. Der Browser speichert zu <strong>0% Zugriffs- oder Refresh-Tokens</strong> im ungeschützten Speicher (LocalStorage / SessionStorage). Stattdessen wird die Authentifizierung über ein rein serverseitig entschlüsselbares, mit <strong>AES-256-GCM (A256GCM)</strong> verschlüsseltes Session-Cookie (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>__Host-session</code>) mit den Schutzattributen <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>HttpOnly</code>, <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Secure</code>, <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>SameSite=Strict</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Path=/</code> verwaltet.<br />
                - <strong>IndexedDB Audio-Tresor (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>groovelab_audio_vault</code>):</strong> Lokaler Puffer auf dem Endgerät zur Gewährleistung eines stabilen Offline-Übe- und Playback-Betriebs in schallisolierten Proberäumen ohne Internetverbindung.<br />
                - <strong>Gesetzliche Ausnahme vom Einwilligungserfordernis:</strong> Sämtliche eingesetzten Technologien sind gemäß <strong>§ 25 Abs. 2 Nr. 2 TDDDG</strong> (DE) sowie <strong>§ 165 Abs. 3 TKG 2021</strong> (AT) technisch unbedingt erforderlich, um die vom Nutzer ausdrücklich aufgerufenen Kernfunktionen der Plattform bereitzustellen. Es werden <strong>keine Tracking-, Werbe- oder Drittanbieter-Analyse-Cookies</strong> eingesetzt. Ein Cookie-Banner ist daher gesetzlich nicht erforderlich.<br />
                - <strong>Proaktiver Silent Refresh &amp; CSRF-Guard:</strong> Tokens werden serverseitig 60 Sekunden vor Ablauf im Hintergrund erneuert; alle Schreibanfragen werden über <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Sec-Fetch-Site</code> vor CSRF geschützt.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>4. Eltern-Einwilligung bei Minderjährigen &amp; Einheitliche Altersgrenze (Art. 8 DSGVO / § 10 BDSG / Art. 6 revDSG)</strong><br />
                (1) <strong>Einheitlicher Schutzstandard für den DACH-Raum (Deutschland, Österreich, Schweiz):</strong> Da Musikschul-Unterrichtsverträge und Bildungsvereinbarungen im DACH-Raum fast ausnahmslos mit den Erziehungsberechtigten geschlossen werden, gilt plattformweit zur Gewährleistung maximalen Schutzes Minderjähriger eine einheitliche Altersgrenze: Jugendliche bis zum vollendeten <strong>16. Lebensjahr</strong> bedürfen zur Nutzung der Plattform der ausdrücklichen Freigabe und Einwilligung der Erziehungsberechtigten (Art. 8 Abs. 1 DSGVO / § 10 BDSG / Art. 6 revDSG).<br />
                (2) <strong>Zwei-Faktor-Elternverifikation ohne E-Mail-Tracking (Zero-Mail):</strong> Zur Gewährleistung maximaler Datenminimierung erfolgt der Nachweis der elterlichen Zustimmung über die physische Aushändigung des Schulausweises durch die Musikschule in Kombination mit der Vergabe einer geheimen, 4-stelligen Eltern-PIN. Dieser Vorgang wird mit Zeitstempel und Hash-Wert revisionssicher im Audit-Ledger protokolliert.<br />
                (3) <strong>Strikte Trennung nach § 73 UrhG (Koppelungsverbot):</strong> Die Einwilligung in die Speicherung didaktischer Audio-Aufnahmen (Loopstation) ist freiwillig und kann jederzeit unabhängig von der Schulnutzung widerrufen werden.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>5. Zero-Trust Session-Leasing, IndexedDB Audio-Tresor, Hardware-Sicherheit &amp; Ausschluss von Stimmbiometrie</strong><br />
                Audiodaten aus der In-App Loopstation und dem Meisterwerk-Protokoll werden verschlüsselt im EU-Cloud-Speicher abgelegt und sind durch mandanten- und schülerspezifische Storage-RLS-Policies geschützt. Nach dem Löschen einer Aufnahme wird die Datei physisch und vollständig aus dem Cloud-Speicher entfernt. Für Offline-Übephasen in Proberäumen steht ein lokaler, hardware-geschützter <strong>IndexedDB Audio-Tresor (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>groovelab_audio_vault</code>)</strong> zur Verfügung. PINs und Zugangsschlüssel werden mit <strong>OWASP- und BSI-konformem PBKDF2 Zero-Knowledge Hashing (100.000 SHA-512 / SHA-256 Runden)</strong> verarbeitet. Das integrierte <strong>Zero-Trust Session-Leasing</strong> ermöglicht Schulleitung und Lehrkräften jederzeit den 1-Click Remote-Logout aktiver Geräte. Bei Verlassen des Moduls oder Tab-Wechsel schaltet ein automatischer Guard alle Mikrofon-Tracks (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MediaStreamTrack.stop()</code>) ab.<br />
                <strong>⚡ Strikter Ausschluss von Stimmbiometrie (Art. 9 DSGVO / Art. 6 nDSG):</strong> Audiodaten dienen ausschließlich dem didaktischen Playback und dem häuslichen Üben (Art. 6 Abs. 1 lit. b DSGVO / Art. 6 nDSG). Es werden zu keinem Zeitpunkt biometrische Stimm-, Sprecher- oder Verhaltensmusteranalysen (Art. 9 DSGVO) durchgeführt.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>6. Reine Metadaten-Architektur &amp; Urheberrechts-Immunität (UrhG &amp; DSA)</strong><br />
                Campus-Groovelab speichert, hostet und vervielfältigt keine urheberrechtlich geschützten Noten-PDFs oder Notensätze. In der Mediathek und Repertoireverwaltung werden ausschließlich nicht-personenbezogene, urheberrechtsfreie bibliografische Werkdaten (Songtitel, Komponist/Interpret, Lehrwerkstitel, Seitenzahl) sowie externe Referenzlinks (Spotify, YouTube, Tomplay) verarbeitet.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>7. Hosting in ISO 27001-zertifizierten Rechenzentren &amp; Stündliche Backups (Art. 28 &amp; 32 DSGVO)</strong><br />
                Das Hosting von App, BFF-Gateway und PostgreSQL-Datenbank erfolgt zu 100% in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/Nürnberg, Deutschland) mit Auftragsverarbeitungsverträgen (AVV) nach Art. 28 DSGVO bzw. Art. 9 nDSG. Sämtliche Datenbankbestände werden durch ein stündlich automatisiertes, verschlüsseltes Backup-System auf dedizierten Volumes vor Datenverlust geschützt.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>8. Betroffenenrechte &amp; Aufsichtsbehörden (Art. 15 bis 22 DSGVO / Art. 25 ff. revDSG)</strong><br />
                Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18) sowie Beschwerde bei der zuständigen Aufsichtsbehörde (Deutschland: Landesbeauftragte für den Datenschutz / BfDI; Österreich: Datenschutzbehörde DSB, Barichgasse 40–42, 1030 Wien; Schweiz: Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter EDÖB, Feldeggweg 1, CH-3003 Bern).<br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>Hinweis für Nutzer in der Schweiz:</strong> Die Datenverarbeitung erfolgt auf ISO 27001-zertifizierten Servern in Deutschland. Der Schweizer Bundesrat hat mit Beschluss vom 25. August 2023 festgestellt, dass Deutschland über ein angemessenes Schutzniveau für personenbezogene Daten verfügt (Art. 16 Abs. 1 revDSG i. V. m. Anhang 1 VDSG).
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>9. Kommunales Löschkonzept nach DIN 66398 &amp; 2-Stufen-Statusarchitektur</strong><br />
                Die Speicherdauer richtet sich nach dem strukturierten Kommunalen Löschkonzept (5 Löschklassen):<br />
                • <strong>LK 1 (Session &amp; Temporärdaten):</strong> Sofortiger Verfall bei Sitzungsbeendigung / RAM-Zeroization.<br />
                • <strong>LK 2 (Didaktische Audio-Aufnahmen):</strong> Erhaltung für die Dauer des laufenden Schuljahres (bis 31.08.) inkl. Vorab-Exportmöglichkeit (ZIP/MP3); sofortige physische Löschung bei manueller Nutzerlöschung.<br />
                • <strong>LK 3 (Abrechnungsstatus / Sparmodus):</strong> Nach 60 Tagen Inaktivität ohne Login wird das Profil fair-play-konform auf Basis-Bereitstellung (0,09 €) umgestellt. Daten, QR-Landingpage und Stundenplan bleiben 100% aktiv.<br />
                • <strong>LK 4 (Bildungsbiografie &amp; Meisterwerke):</strong> Gemeisterte Stücke und Jahres-Badges (reine Metadaten gem. Art. 6 Abs. 1 lit. b DSGVO) verbleiben über Schuljahre hinweg (mehrjährig) im Profil; physische Löschung erfolgt 30 Tage nach formeller Exmatrikulation / Kündigung.<br />
                • <strong>LK 5 (B2B-Abrechnungsbelege):</strong> 10 Jahre Aufbewahrungsfrist gem. § 147 AO (strikte B2B-Sammelrechnung ohne Schüler-Klarnamen).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>10. Sicherheit der Verarbeitung, Angriffsabwehr &amp; Web Application Firewall (Art. 6 Abs. 1 lit. f &amp; Art. 32 DSGVO)</strong><br />
                Zur Gewährleistung der Systemsicherheit, Abwehr unberechtigter Zugriffsversuche, automatisierter Schadprogramme, DDoS-Attacken sowie verdächtiger Proxy- und Anonymisierungsnetzwerke (z. B. Tor-Exit-Nodes oder bekannte Exploit-Knoten) setzen wir an den Zugangspunkten unserer Systeme automatisierte Filter- und Schutzmechanismen (Web Application Firewall) ein. Hierbei werden IP-Adressen und technische Verbindungsparameter zur Gefahrenabwehr automatisiert verarbeitet und potenziell schädliche Anfragen präventiv abgewiesen. Eine Profilbildung oder Weitergabe an Dritte findet nicht statt. Dies dient unserem berechtigten Interesse an der technischen Integrität und dem Schutz der Bildungs- und Übedaten von Minderjährigen gem. Art. 6 Abs. 1 lit. f i. V. m. Art. 32 DSGVO.
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Allgemeine Geschäftsbedingungen (AGB) – Campus-Groovelab
              </h4>

              {/* ── TEIL A: B2B FÜR MUSIKSCHULEN & KOMMUNALE TRÄGER ── */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#f0f9ff',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    padding: '3px 12px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    TEIL A: Bestimmungen für Musikschulen &amp; Träger (B2B)
                  </span>
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>1. Vertragsgegenstand, Rechtsnatur, Pädagogischer Add-On-Status, Convenience-Doktrin &amp; Notfall-Klausel (SaaS-Mietvertrag)</strong><br />
                  (1) Diese Bestimmungen regeln die Bereitstellung der cloudbasierten Schulmanagement- und Übeplattform <strong>Campus-Groovelab</strong> durch den Betreiber Patrick Huber (Einzelunternehmer). Der Vertrag qualifiziert sich rechtlich als <strong>Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH)</strong> über die Bereitstellung von Cloud-Infrastruktur, Datenbank-Hosting, Datensicherung und Systemwartung.<br />
                  (2) <strong>Pädagogischer Add-On-Charakter &amp; Convenience-Doktrin (Subsidiaritäts-Garantie):</strong> Campus-Groovelab ist ein didaktisches Zusatz-, Erleichterungs- und Übermittlungswerkzeug („Convenience-Tool / Fast-Track-Option“) zur Beschleunigung interner Abläufe. Die Plattform ersetzt ausdrücklich kein behördliches oder amtliches Schulverwaltungssystem (ERP wie ASV, WinSchool oder Musikschul-Manager) und stellt zu keinem Zeitpunkt den ausschließlichen oder verbindlich vorgeschriebenen Dienst-, Weisungs- oder Kommunikationskanal der Musikschule dar.<br />
                  (3) <strong>Primärwege, Weisungsautonomie der Schule &amp; Wahlfreiheit:</strong> Die offizielle dienstrechtliche Kommunikation, verbindliche Arbeitsanweisungen der Schulleitung sowie die hoheitliche Verwaltung von Schüler- und Honorarstammdaten verbleiben vollumfänglich auf den herkömmlichen Primärkanälen der Musikschule (behördliche E-Mail, interne Kommunikationssysteme wie MS Teams, Telefon, behördliche ERP-Software oder Aushang). Lehrkräfte und Mitarbeiter sind zu jedem Zeitpunkt berechtigt, Stundenpläne, Raumwünsche und Terminänderungen alternativ auf dem herkömmlichen Weg (per E-Mail oder telefonisch) an das Sekretariat zu übermitteln. Die Datenüberführung in das amtliche Verwaltungssystem der Schule obliegt der Musikschule.<br />
                  (4) <strong>Notfall-, Nachrangigkeits- &amp; Schadenminderungsklausel (§ 254 BGB):</strong> Die Musikschule stellt sicher, dass der reguläre Schulbetrieb und die primäre Notfallkommunikation (Telefon, E-Mail, herkömmliche Vertretungspläne) unabhängig von der Plattform gewährleistet bleiben. Bei kurzzeitigen Serverstörungen, Netzausfällen oder Wartungsfenstern findet der Schulunterricht regulär statt; die Musikschule ist im Rahmen ihrer gesetzlichen Schadenminderungspflicht (§ 254 BGB) gehalten, Raum- und Terminabstimmungen über ihre Primärkanäle abzuwickeln. Eine Haftung des Betreibers für ausgefallene Unterrichtsstunden, verpasste Bandproben oder Honorarausfälle ist ausgeschlossen, es sei denn, der Ausfall beruht auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Betreibers oder der schuldhaften Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht). Die Haftungsregelungen gemäß § 7 dieser AGB gelten vollumfänglich.<br />
                  (5) Soweit im Rahmen der Bereitstellung personenbezogene Daten verarbeitet werden, gilt ergänzend die Vereinbarung zur Auftragsverarbeitung (AVV gemäß Art. 28 DSGVO bzw. Art. 9 nDSG) als integraler Vertragsbestandteil.<br />
                  (6) Der Betreiber gewährleistet eine Verfügbarkeit der Cloud-Infrastruktur von 99,5 % im Jahresmittel (ausgenommen angekündigte Wartungsarbeiten außerhalb der Kernunterrichtszeiten). Zur Abwehr von Cyber-Angriffen und zur Sicherung des störungsfreien Schulbetriebs behält sich der Betreiber vor, automatisierte Angriffsnetzwerke oder schädliche Datenverbindungen an der Firewall technisch abzuweisen. Der reguläre weltweite Zugriff für Schüler und Lehrkräfte im Rahmen privater Reisen (z. B. Urlaubsaufenthalte) bleibt hiervon unberührt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Bereitstellungsmodell &amp; Hosting-Pauschalen (DACH-Region)</strong><br />
                  - <strong>Campus-Groovelab Software-Bereitstellung:</strong> 0,00 € / CHF 0.00 (Inklusive). Die Software wird im Rahmen des gebuchten Cloud-Infrastruktur-Pakets ohne gesonderte Lizenzkaufgebühren bereitgestellt.<br />
                  - <strong>Cloud- &amp; Datenbank-Hosting: Modul Campus:</strong> 14,90 € / Mo. (DE/AT) bzw. CHF 19.90 / Mo. (CH) (Server-Hosting, Datenbank &amp; Webspace-Flatrate per Musikschule).<br />
                  - <strong>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab:</strong> 9,90 € / Mo. (DE/AT) bzw. CHF 14.90 / Mo. (CH) (Server-Hosting, Datenbank &amp; Webspace-Flatrate per Musikschule).<br />
                  - <strong>Kombi-Vorteilsrabatt (Infrastruktur-Bündel):</strong> -4,90 € / Mo. (DE/AT) bzw. -4.90 CHF / Mo. (CH) bei gemeinsamer Buchung beider Module (Bündelpreis: 19,90 € / Mo. bzw. CHF 29.90 / Mo.).<br />
                  - <strong>Service- &amp; Administrationspauschale:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktive Lehrkraft. Verwaltungs- und Sekretariats-User (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>admin</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>secretary</code>) sind dauerhaft inklusive (0,00 € / CHF 0.00).<br />
                  - <strong>Basis-Bereitstellung:</strong> 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je Schüler (QR-Landingpage, Stundenplan-, Termin-, Raumänderungs-Sync sowie DSGVO/nDSG-Hosting).<br />
                  - <strong>Cloud- &amp; Modul-Bereitstellung Campus:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll).<br />
                  - <strong>Cloud- &amp; Modul-Bereitstellung GrooveLab:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive Band-Nutzung: Songs, Repertoire, Live Lab; immer zu 100 % von der Musikschule übernommen).<br />
                  - <strong>Sammelzahler vs. Direktabrechnung:</strong> GrooveLab-Aktivierungen werden immer zu 100 % von der Musikschule getragen. Für das Campus-Modul kann wahlweise Direktabrechnung mit Eltern vereinbart werden. Schüler-Direktabrechnungen werden ausnahmslos als einmaliger Jahresbeitrag (5,88 € in DE/AT bzw. CHF 12.00 in CH pro Schuljahr bzw. 4,80 € / CHF 9.60 bei Schulbezuschussung) abgerechnet – niemals monatlich.<br />
                  - <strong>Bestandsschutz-Garantie (Price-Lock):</strong> Der Betreiber garantiert der Musikschule für die Dauer der ununterbrochenen Vertragslaufzeit absolute Preisstabilität auf die bei Vertragsschluss vereinbarten monatlichen Basis-Hosting- und Bereitstellungspauschalen. Preisanpassungen für Neukunden haben keinerlei Auswirkung auf bestehende Verträge. Bei einer Kündigung und späteren Neuanmeldung gilt der zum Zeitpunkt der Neuanmeldung gültige Neukundentarif.<br />
                  - <strong>Steuerliche Hinweise:</strong> In Deutschland und Österreich gemäß § 19 UStG (DE) bzw. § 6 Abs. 1 Z 27 UStG (AT) umsatzsteuerbefreit (Kleinunternehmerregelung). Für die Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Vertragslaufzeit, Unterjähriger Einstieg &amp; Kündigung der Schul-Infrastruktur</strong><br />
                  (1) Der Vertragsbeginn und die Bereitstellung der Cloud-Infrastruktur können jederzeit zu jedem beliebigen Kalendertag des Jahres erfolgen. Die Vertragslaufzeit richtet sich nach dem von der jeweiligen Musikschule im System konfigurierten Schuljahreszeitraum (standardmäßig 01. September bis 31. August bzw. der landes- und schulartspezifische Stichtag). Bei unterjährigem Einstieg läuft die initiale Vertragslaufzeit ab dem Bereitstellungsdatum bis zum individuellen Ende des laufenden Schuljahres.<br />
                  (2) Für die Folgezeit verlängert sich der Vertrag jeweils um ein weiteres volles Schuljahr (12 Monate bis zum jeweiligen Schuljahresstichtag), sofern er nicht mit einer Frist von einem (1) Monat zum Ende des Schuljahres in Textform (z. B. per E-Mail oder über das Dashboard) gekündigt wird.<br />
                  (3) Bei unterjährigem Einstieg werden anfallende Bereitstellungs- und Infrastrukturpauschalen zeitanteilig (pro rata temporis) ab dem Monat der Freischaltung bis zum individuellen Schuljahresende berechnet.<br />
                  (4) Neuanmeldungen, Modul-Aktivierungen sowie Abmeldungen einzelner Schüler- oder Lehrkräfte-Profile können während des laufenden Schuljahres jederzeit flexibel und tagesgenau im Administrations-Dashboard vorgenommen werden.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Reine Metadaten-Architektur für Noten, Didaktische Cover-Aufnahmen (§ 53, § 60a UrhG), Verwertungsgesellschaften (GEMA / AKM / SUISA) &amp; Notice-and-Takedown (Art. 6 &amp; 16 DSA)</strong><br />
                  (1) <strong>Reine Metadaten-Architektur für Noten &amp; Ausschluss von Original-Masteraufnahmen:</strong> Die Plattform Campus-Groovelab speichert, hostet und vervielfältigt zu 0 % urheberrechtlich geschützte Notensätze, Leadsheets, Tabulaturen oder geschützte Verlags-Partituren sowie keine kommerziellen Original-Masteraufnahmen/Audiodateien von Plattenlabels. Die Mediathek verarbeitet für Lehrwerke ausschließlich freie bibliografische Metadaten (Interpret, Titel, Tonart, Besetzung, Lehrwerkstitel und Seitenzahlen) sowie Verlinkungen zu lizenzierten externen Mediendiensten (z. B. Spotify, YouTube) oder autorisierten Noten-Plattformen (z. B. Tomplay).<br />
                  (2) <strong>Didaktische Schüler-Audioaufnahmen (Cover-Versionen im privaten Kreis gem. § 53, § 60a UrhG):</strong> Gehostet werden ausschließlich von den Schülern selbst im Rahmen des Instrumentalunterrichts oder beim häuslichen Üben eingespielte Audioaufnahmen (didaktische Cover-Versionen von Übestücken). Diese dienen rein dem pädagogischen Feedback mit der Lehrkraft (§ 60a UrhG) sowie dem Anhören im engsten privaten Familienkreis (§ 53 Abs. 1 UrhG / gesetzliche Privatkopie). Es existiert keine öffentliche Mediathek, kein offenes Streaming und keine freie Auffindbarkeit im Internet.<br />
                  (3) <strong>Verwertungsgesellschaften-Klarstellung (GEMA, AKM, SUISA):</strong> Der Betreiber betreibt keine öffentliche Streaming-Mediathek geschützter Musikwerke. Aus diesem Grund entstehen durch die bloße Plattformbereitstellung keine gesonderten Melde- oder Vergütungspflichten der Plattform gegenüber Verwertungsgesellschaften (GEMA in Deutschland, AKM/Austro-Mechana in Österreich, SUISA in der Schweiz). Die Lizenzierung des eigentlichen Präsenzunterrichts und von Schulaufführungen obliegt der Musikschule über die jeweils bestehenden Gesamtverträge ihrer Landes- oder Bundesverbände.<br />
                  (4) <strong>Verbot des Uploads / Verlinkens unlizenzierter Notensätze:</strong> Lehrkräften und Nutzern ist es streng untersagt, urheberrechtlich geschützte Noten-PDFs, Leadsheets, Verlags-Scans oder Verweise auf offensichtlich rechtswidrige Quellen in der Plattform abzulegen (§ 60a Abs. 3 Nr. 2 UrhG [DE], § 42f UrhG [AT], Art. 19 URG [CH]).<br />
                  (5) <strong>Haftungsprivileg &amp; Notice-and-Takedown-Verfahren (Art. 6 &amp; 16 DSA):</strong> Der Betreiber stellt lediglich die technische Vermittlungsinfrastruktur bereit und haftet als Host-Provider gemäß Art. 6 Digital Services Act (DSA) erst ab tatsächlicher Kenntnis rechtswidriger Inhalte. Urheberrechtsinhaber und Verlage können Beanstandungen jederzeit über das elektronische Melde- und Abhilfeverfahren an <a href="mailto:copyright@campus-groovelab.de" style={{ color: '#2563eb', textDecoration: 'underline' }}>copyright@campus-groovelab.de</a> übermitteln. Berechtigt beanstandete Verweise werden unverzüglich gesperrt oder entfernt.<br />
                  (6) <strong>Freistellungsverpflichtung bei Urheberrechtsverletzungen durch Nutzer:</strong> Die Musikschule trägt die alleinige rechtliche Verantwortung dafür, dass ihre Lehrkräfte, Mitarbeiter und Schüler keine urheberrechtsverletzenden Medien, Noten-PDFs oder rechtswidrigen Inhalte in die Plattform einstellen. Sollte der Betreiber von Urhebern, Verlagen, Verwertungsgesellschaften (GEMA, AKM, SUISA) oder sonstigen Dritten wegen angeblicher Schutzrechtsverletzungen durch von Nutzern der Musikschule eingestellte Inhalte in Anspruch genommen werden, stellt die Musikschule den Betreiber von allen berechtigten Ansprüchen, Gerichts- und angemessenen Rechtsverteidigungskosten auf erstes Anfordern frei, es sei denn, die Musikschule hat die Rechtsverletzung nachweislich nicht zu vertreten.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. Autonomie von Honorarlehrkräften (Herrenberg-Compliance nach BSG B 12 R 3/20 R, Übermittlungsfreiheit) &amp; Ausschluss von Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / BPersVG)</strong><br />
                  (1) Die Funktionen zur Raum-, Termin- und Stundenplanung innerhalb von Campus-Groovelab stellen rein didaktisch-organisatorische Hilfsmittel und unverbindliche Dispositionsvorschläge dar. Die Plattform übt zu keinem Zeitpunkt eine automatisierte Weisung, Zuweisung oder arbeitgeberseitige Direktionsgewalt gegenüber selbstständigen Lehrkräften (Honorarkräften) aus. Honorarkräfte sind zu jedem Zeitpunkt frei, ob sie Campus-Groovelab als digitales Hilfsmittel nutzen oder ihre Termin- und Raumabstimmungen auf herkömmlichem Weg (per E-Mail oder Telefon) mit dem Schulsekretariat und den Schülern vornehmen.<br />
                  (2) Die Musikschule stellt in eigener Verantwortung sicher, dass der tatsächliche Einsatz von Honorarkräften den sozialversicherungsrechtlichen Kriterien des Bundessozialgerichts entspricht und keine einseitigen Weisungen über die Plattform erteilt werden. Eine Überwachung von Anwesenheitszeiten oder didaktischen Inhalten durch den Betreiber findet nicht statt.<br />
                  (3) <strong>Ausschluss von Leistungs- und Verhaltenskontrolle:</strong> Die Plattform verzichtet auf jegliche Funktionen zur Mitarbeiterbewertung oder automatisierten Leistungs- und Verhaltenskontrolle. Es werden keine Kennzahlen zu Reaktionszeiten auf Chat-Nachrichten, durchschnittlichen Übezeiten der Schülerklassen oder Anwesenheitsquoten zur Mitarbeiterbewertung aggregiert oder an Schulleitungen übermittelt.<br />
                  (4) <strong>Recht auf Nichterreichbarkeit &amp; asynchrone Kommunikation (§ 5 ArbSchG):</strong> Die interne Chat- und Benachrichtigungsfunktion („Shouts“) ist als rein asynchrones didaktisches Informationsmedium konzipiert. Lehrkräfte sind zu keinem Zeitpunkt verpflichtet, außerhalb ihrer individuellen Unterrichtszeiten oder an unterrichtsfreien Tagen Nachrichten abzurufen oder zu beantworten.<br />
                  (5) <strong>Negative Garantie &amp; Zweckbindungsverbot:</strong> Die Musikschule verpflichtet sich ausdrücklich, die Plattform und deren Zeit-, Raum- oder Kommunikationsdaten zu keinem Zeitpunkt zur Überwachung der Arbeitszeit, zur Leistungskontrolle oder für disziplinarische Maßnahmen gegenüber Beschäftigten oder Honorarkräften einzusetzen.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Raum-Engine &amp; Namensdarstellung (Schutz von Minderjährigen)</strong><br />
                  Lehrkraft-Raumbuchungen werden im System initial im Status unbestätigt (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>pending</code>) geführt und bedürfen der Freigabe durch das Sekretariat. Schülernamen werden auf Lehrer-Dashboards datenschutzkonform gekürzt (Vorname + Anfangsbuchstabe); Lehrkräfte werden zur eindeutigen Wiedererkennung mit vollständigem Namen geführt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. B2B-Gewährleistung, Haftungsbegrenzung, 12-Monats-Verjährung, Rechtswahl &amp; Gerichtsstand (§ 536a BGB DE / § 1096 ABGB AT / Art. 259a OR CH)</strong><br />
                  (1) Gegenüber Unternehmern und juristischen Personen des öffentlichen Rechts wird die verschuldensunabhängige Garantiehaftung des Betreibers für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB [DE] / § 1096 ABGB [AT] / Art. 259a OR [CH]) ausdrücklich und vollumfänglich ausgeschlossen. Bei einfacher Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) begrenzt auf den vertragstypisch vorhersehbaren Schaden. Eine Haftung für entgangenen Gewinn, mittelbare Schäden, Mangelfolgeschäden oder ausgefallene Unterrichtsstunden ist ausgeschlossen.<br />
                  (2) <strong>Haftungshöchstgrenze (Liability Cap):</strong> Die Gesamthaftung des Betreibers für alle Schadensfälle innerhalb eines Kalenderjahres aus oder im Zusammenhang mit diesem Vertrag – gleich aus welchem Rechtsgrund – ist auf die Summe der vom Kunden in den letzten zwölf (12) Monaten vor Eintritt des schädigenden Ereignisses tatsächlich an den Betreiber entrichteten Netto-Vergütung, maximal jedoch auf einen Höchstbetrag von 10.000,00 € (bzw. CHF 10'000.00), beschränkt. Vorstehende Begrenzung gilt nicht bei Vorsatz, grober Fahrlässigkeit, bei Personenschäden (Verletzung von Leben, Körper oder Gesundheit) sowie bei gesetzlich zwingender Haftung (z. B. Produkthaftungsgesetz).<br />
                  (3) <strong>Datenverlust &amp; Mitverschuldensklausel (§ 254 BGB):</strong> Für den Verlust von Daten haftet der Betreiber der Höhe nach nur insoweit, als der Schaden auch bei ordnungsgemäßer und täglicher Datensicherung durch den Kunden bzw. über das integrierte Schulausweis- und Datenexportmodul entstanden wäre. Die Haftung ist auf den typischen Wiederherstellungsaufwand beschränkt.<br />
                  (4) <strong>12-monatige Verjährungsverkürzung:</strong> Sämtliche Ansprüche des Kunden wegen Mängeln oder Pflichtverletzungen verjähren innerhalb von zwölf (12) Monaten ab dem gesetzlichen Verjährungsbeginn. Hiervon unberührt bleibt die gesetzliche Verjährungsfrist für Schadensersatzansprüche wegen Vorsatz, grober Fahrlässigkeit sowie Verletzung von Leben, Körper oder Gesundheit.<br />
                  (5) <strong>Rechtswahl &amp; Gerichtsstand:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Ist die Musikschule bzw. der Vertragspartner Kaufmann, eine juristische Person des öffentlichen Rechts oder ein öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Sitz des Betreibers (Lörrach / Rheinfelden).
                </div>
              </div>

              {/* ── TEIL B: B2C FÜR ELTERN & SCHÜLER ── */}
              <div style={{
                background: 'linear-gradient(180deg, #fbfdfc 0%, #ffffff 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    padding: '3px 12px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    TEIL B: Bestimmungen für Eltern &amp; Schüler (B2C / § 13 BGB)
                  </span>
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>8. Kostenfreier Schnuppermonat, Schuljahres-Bereitstellung, Schüler-Bestandsschutz &amp; Sorgfaltspflichten (Ausschließliche Jahresbeitragszahlung)</strong><br />
                  (1) Eltern, die das interaktive Campus-Modul für ihr Kind aktivieren, erhalten den laufenden Anmeldemonat zu 100 % kostenfrei zum Kennenlernen. Für die verbleibenden Monate bis zum individuellen Schuljahresende der Schule wird die Bereitstellung als einmaliger Jahresbeitrag (errechnet aus 0,49 € in DE/AT bzw. CHF 1.00 in CH pro bezahltem Monat) abgerechnet. Eine monatliche Einzelabrechnung ist zur Vermeidung unverhältnismäßiger Transaktionsgebühren ausgeschlossen.<br />
                  (2) <strong>Schuljahresübergang &amp; Schüler-Bestandsschutz:</strong> Bei einer Aktivierung im letzten Monat des Schuljahres ist der Zugang für diesen verbleibenden Restmonat vollständig kostenfrei zum Kennenlernen. Für das Folgeschuljahr gilt für Schüler und Eltern der Bestandsschutz der jeweiligen Musikschule: Solange der Vertrag zwischen der Musikschule und dem Betreiber ununterbrochen fortbesteht, bleibt der Jahresbeitrag für die Schüler dieser Musikschule preisstabil. Eine Erhöhung der Schülerbeiträge für Bestandskunden ist ausgeschlossen.<br />
                  (3) <strong>Mindestalter &amp; Bildschirmfreies Üben (Screenless Practice):</strong> Das Mindestalter für Schüler beträgt 6 Jahre. Zur Vermeidung unnötiger Bildschirmzeit bei Grundschulkindern unterstützt die Plattform das didaktische Prinzip des bildschirmfreien Übens („Screenless Practice“): Im Modus „Von Eltern geführt“ verbleibt das Endgerät bei den Eltern; Übezeiten am echten Instrument werden per 1-Klick-Quittierung verbucht.<br />
                  (4) <strong>Sorgfaltspflichten bei Zugangsdaten &amp; PINs:</strong> Eltern und Schüler sind verpflichtet, persönliche Zugangsdaten (QR-Ausweise, Eltern-PIN, persönliche Schüler-PIN) vor dem Zugriff unbefugter Dritter zu schützen. Bei Verlust des Schulausweises oder dem Verdacht einer missbräuchlichen Nutzung ist unverzüglich das Sekretariat der Musikschule zur Neugenerierung des Ausweis-Tokens zu informieren.<br />
                  (5) <strong>Pädagogischer Haftungsausschluss (Keine Erfolgsgarantie):</strong> Der Betreiber stellt mit Campus-Groovelab rein didaktische Hilfsmittel (z. B. Übe-Timer, Metronom, Loopstation, Gamification-Elemente) zur Verfügung. Die pädagogische Unterrichtsgestaltung, der persönliche Lernerfolg, Noten, Prüfungsergebnisse sowie die tatsächliche musikalische Beherrschung des Instruments verbleiben in der ausschließlichen pädagogischen Verantwortung der Musikschule, der jeweiligen Lehrkraft und des Schülers. Eine Erfolgsgarantie oder Haftung für das Erreichen didaktischer Lernziele ist ausgeschlossen.<br />
                  (6) <strong>Endgeräte- &amp; Sensorik-Klausel:</strong> Die ordnungsgemäße Funktion gerätespezifischer Features (z. B. Display-Down-Sensorik beim Übe-Timer) hängt von der Hard- und Softwarekonfiguration des verwendeten Endgeräts ab. Für sensorische Messungenauigkeiten oder Betriebssystemeinschränkungen des Endgeräts übernimmt der Betreiber keine Haftung.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>9. Gesetzliche Verbraucherrechte &amp; Keine automatische Verlängerung (Zero-Abofalle)</strong><br />
                  Die gesetzlichen Mängelgewährleistungsrechte für Verbraucher bleiben uneingeschränkt bestehen. Es findet <strong>keine automatische Vertragsverlängerung</strong> über das Schuljahresende hinaus statt. Der Zugang endet automatisch zum konfigurierten Schuljahresende, sofern er nicht für das Folgeschuljahr aktiv bestätigt wird.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>10. Elektronischer Kündigungsbutton &amp; Sofort-Widerruf (§ 312k BGB)</strong><br />
                  Während des kostenfreien Schnuppermonats können Eltern den Zugang mit 1 Klick im Elternbereich sofort und ohne Kosten widerrufen. Nach Durchführung der Kündigung wird unverzüglich eine elektronische Kündigungsbestätigung mit Datum und Zeitstempel bereitgestellt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>11. Digitale Netiquette, Jugendschutz &amp; Ausschluss missbräuchlicher Nutzung</strong><br />
                  Die plattforminterne Kommunikation (Direktnachrichten, Ensemble-Shouts) dient ausschließlich dem didaktischen Informationsaustausch rund um Fachunterricht, Üben und Proben. Beleidigende, diskriminierende, jugendgefährdende oder schulordnungswidrige Inhalte sind streng untersagt. Bei schwerwiegenden Verstößen kann die Schulleitung den internen Nachrichtenversand für das betreffende Profil temporär deaktivieren.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Widerrufsbelehrung &amp; Muster-Widerrufsformular
              </h4>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-12px' }}>
                (Gültig für Verbraucher/Eltern bei Schüler-Direktabrechnung gemäß § 312g BGB i. V. m. Art. 246a EGBGB)
              </div>

              {/* 1. Widerrufsbelehrung */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#1e40af', fontSize: '0.92rem' }}>1. Widerrufsrecht für Verbraucher</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', lineHeight: 1.6, color: '#1e3a8a' }}>
                  Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses (Aktivierung des Profils).
                </p>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Ausübung des Widerrufs:</strong><br />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                  Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', margin: '8px 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#0f172a' }}>
                  <strong>Patrick Huber – Softwareentwicklung &amp; Cloud-Dienstleistungen</strong><br />
                  Karl-Fürstenberg Str. 59, 79618 Rheinfelden, Deutschland<br />
                  E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#2563eb', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> / <a href="mailto:patrick.huber@musaek.de" style={{ color: '#2563eb', fontWeight: 700 }}>patrick.huber@musaek.de</a>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                  mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief, E-Mail oder über die elektronische Widerrufsfunktion im Eltern-Portal) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Fristwahrung:</strong><br />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                  Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
                </p>
              </div>

              {/* 2. Folgen des Widerrufs */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#166534', fontSize: '0.92rem' }}>2. Folgen des Widerrufs</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', lineHeight: 1.6, color: '#14532d' }}>
                  Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
                </p>
                <div style={{ marginTop: '10px', fontSize: '0.80rem', lineHeight: 1.5, color: '#166534', borderTop: '1px solid #86efac', paddingTop: '10px' }}>
                  <strong>Kostenfreier Probemonat &amp; Wertersatz-Ausschluss:</strong><br />
                  Da die Bereitstellung im ersten Monat bzw. der Kennenlernphase vollständig kostenfrei erfolgt, schulden Sie im Falle eines Widerrufs während der Probezeit keinerlei Wertersatz oder Nutzungsentschädigung. Mit Wirksamwerden des Widerrufs erlischt die digitale Zugangsberechtigung zum Campus-Modul.
                </div>
              </div>

              {/* 3. Schweiz-Hinweis */}
              <div style={{ fontSize: '0.80rem', color: '#64748b', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>3. Besondere Hinweise für Nutzer in der Schweiz:</strong><br />
                Für Nutzer mit Wohnsitz in der Schweiz gewährt der Betreiber diese 14-tägige Widerrufsfrist auf freiwilliger vertraglicher Basis im gleichen Umfang.
              </div>

              {/* 4. Muster-Widerrufsformular */}
              <div>
                <strong style={{ color: '#0f172a' }}>4. Muster-Widerrufsformular:</strong><br />
                <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 8px 0' }}>
                  (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.76rem', lineHeight: 1.7, color: '#1e293b' }}>
                  An:<br />
                  Patrick Huber – Softwareentwicklung &amp; Cloud-Dienstleistungen<br />
                  Karl-Fürstenberg Str. 59, 79618 Rheinfelden, Deutschland<br />
                  E-Mail: kontakt@campus-groovelab.de / patrick.huber@musaek.de<br /><br />
                  Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Bereitstellung des Zugangs Campus-Groovelab (Modul Campus).<br /><br />
                  - Bestellt am (*) / freigeschaltet am (*): _______________________________<br />
                  - Name des/der Verbraucher(s): _________________________________________<br />
                  - Name des Schülers / Kindes: _________________________________________<br />
                  - Anschrift des/der Verbraucher(s): ______________________________________<br />
                  - Datum: ________________________<br />
                  - Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ______________________<br /><br />
                  (*) Unzutreffendes streichen.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Apple HIG Footer Bar */}
        <div className="apple-legal-no-print" style={{
          padding: '14px 28px',
          borderTop: '1px solid rgba(226, 232, 240, 0.8)',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#64748b' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontWeight: 600 }}>Rechtssicher nach BGB, DSGVO, UrhG &amp; DSA • Schuljahr 2026/2027</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrintTextOnly}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '11px',
                padding: '8px 16px',
                fontSize: '0.80rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
            >
              <Printer size={14} color="#475569" />
              Drucken / PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '11px',
                padding: '8px 24px',
                fontSize: '0.82rem',
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
};
