import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, FileText, Building, Undo2, Scale, Printer, Accessibility, Shield, Server, FileCheck, HeartHandshake } from 'lucide-react';
import { useMasterPricing } from '../context/MasterPricingContext';

export type LegalTab = 
  | 'impressum' 
  | 'privacy' 
  | 'terms' 
  | 'avv' 
  | 'sla' 
  | 'school_parent_info' 
  | 'child_protection' 
  | 'cancellation' 
  | 'accessibility';

interface LegalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalTextModal: React.FC<LegalTextModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'impressum'
}) => {
  const masterPricing = useMasterPricing();
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
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
    } else if (activeTab === 'avv') {
      docTitle = 'Campus-Groovelab – Auftragsverarbeitungsvertrag (AVV / Art. 28 DSGVO)';
      tabHeading = 'Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO & nDSG) inkl. TOM';
    } else if (activeTab === 'sla') {
      docTitle = 'Campus-Groovelab – Service Level Agreement (SLA)';
      tabHeading = 'Service Level Agreement (SLA) & Verfügbarkeitsgarantie (B2B)';
    } else if (activeTab === 'school_parent_info') {
      docTitle = 'Campus-Groovelab – Datenschutz-Musterinformation nach Art. 13 DSGVO';
      tabHeading = 'Muster-Datenschutzinformation (Art. 13 DSGVO) für Erziehungsberechtigte & Schüler';
    } else if (activeTab === 'child_protection') {
      docTitle = 'Campus-Groovelab – Kinderschutz-Leitfaden & Netiquette';
      tabHeading = 'Kinderschutz-Leitfaden, Vier-Augen-Prinzip & Digitale Netiquette';
    } else if (activeTab === 'cancellation') {
      docTitle = 'Campus-Groovelab – Widerrufsbelehrung & Muster-Widerrufsformular';
      tabHeading = 'Widerrufsbelehrung & Muster-Widerrufsformular (B2C)';
    } else if (activeTab === 'accessibility') {
      docTitle = 'Campus-Groovelab – Erklärung zur Barrierefreiheit (BITV 2.0 / BFSG)';
      tabHeading = 'Erklärung zur Barrierefreiheit (BITV 2.0 / EN 301 549 / BFSG)';
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

  const handleTabChange = (tab: LegalTab) => {
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
          role="dialog"
          aria-modal="true"
          aria-label="Rechtliche Dokumente & Erklärung zur Barrierefreiheit"
          className="apple-legal-window"
          style={{
            background: '#ffffff',
            width: 'min(94vw, 1020px)',
            maxWidth: '1020px',
            maxHeight: 'min(90vh, 860px)',
            height: '860px',
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
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                flexShrink: 0
              }}>
                <Scale size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Rechtliche Hinweise &amp; Governance
                  </h3>
                  <span style={{
                    background: '#e2e8f0',
                    color: '#334155',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    fontSize: '0.66rem',
                    fontWeight: 750,
                    letterSpacing: '0.02em'
                  }}>
                    DACH • B2B &amp; B2C
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                  Offizielle Dokumente &amp; Compliance für Deutschland, Österreich und die Schweiz
                </p>
              </div>
            </div>
            <button
              type="button"
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
                flexShrink: 0,
                outline: 'none'
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
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
            <div 
              role="tablist"
              aria-label="Rechtliche Bereiche"
              style={{
                display: 'flex',
                background: '#e2e8f0',
                padding: '3px',
                borderRadius: '12px',
                gap: '2px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
              }}
            >
              {[
                { id: 'impressum' as const, label: 'Impressum', icon: Building },
                { id: 'privacy' as const, label: 'Datenschutz', icon: ShieldCheck },
                { id: 'terms' as const, label: 'AGB', icon: FileText },
                { id: 'avv' as const, label: 'AVV', icon: FileCheck },
                { id: 'sla' as const, label: 'SLA', icon: Server },
                { id: 'school_parent_info' as const, label: 'Eltern-Info', icon: Shield },
                { id: 'child_protection' as const, label: 'Kinderschutz', icon: HeartHandshake },
                { id: 'cancellation' as const, label: 'Widerruf', icon: Undo2 },
                { id: 'accessibility' as const, label: 'Barrierefreiheit', icon: Accessibility }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`legal-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`legal-tabpanel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleTabChange(tab.id)}
                    style={{
                      flex: '0 0 auto',
                      padding: '7px 13px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#0f172a' : '#475569',
                      fontWeight: isActive ? 750 : 600,
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      whiteSpace: 'nowrap',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6, 0 2px 6px rgba(0, 0, 0, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = isActive ? '0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none';
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#475569';
                    }}
                  >
                    <Icon size={14} color={isActive ? '#0f172a' : '#475569'} />
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
              {activeTab === 'avv' && 'Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO & nDSG) inkl. TOM'}
              {activeTab === 'sla' && 'Service Level Agreement (SLA) & Verfügbarkeitsgarantie (B2B)'}
              {activeTab === 'school_parent_info' && 'Muster-Datenschutzinformation (Art. 13 DSGVO) für Erziehungsberechtigte & Schüler'}
              {activeTab === 'child_protection' && 'Kinderschutz-Leitfaden, Vier-Augen-Prinzip & Digitale Netiquette'}
              {activeTab === 'cancellation' && 'Widerrufsbelehrung & Muster-Widerrufsformular (B2C)'}
              {activeTab === 'accessibility' && 'Erklärung zur Barrierefreiheit (BITV 2.0 / EN 301 549 / BFSG)'}
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
              padding: '28px 32px 48px 32px',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              fontSize: '0.85rem',
              lineHeight: 1.68,
              color: '#334155',
              background: '#ffffff',
              scrollPaddingBottom: '48px'
            }}
          >
            {activeTab === 'impressum' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-impressum" 
              aria-labelledby="legal-tab-impressum" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Angaben gemäß § 5 DDG (DE), § 5 ECG / § 25 MedienG (AT) &amp; Art. 3 Abs. 1 lit. s UWG (CH)
              </h4>

              <div style={{ background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#0f172a' }}>Diensteanbieter &amp; Betreiber der Plattform Campus-Groovelab:</strong><br />
                Patrick Huber<br />
                <span style={{ fontSize: '0.86rem', color: '#475569' }}>Softwareentwicklung &amp; Cloud-Dienstleistungen (Einzelunternehmen)</span><br />
                Karl-Fürstenberg-Str. 59<br />
                79618 Rheinfelden (Baden)<br />
                Deutschland<br />
                <span style={{ fontSize: '0.80rem', color: '#334155', display: 'block', marginTop: '6px', fontWeight: 500 }}>
                  Zuständige Gewerbebehörde: Gewerbeamt der Stadt Rheinfelden (Baden), Kirchplatz 2, 79618 Rheinfelden (Baden)
                </span>
              </div>

              {/* ⚖️ Rechtlicher Abgrenzungs- & Kompatibilitäts-Hinweis gem. § 23 Abs. 1 Nr. 3 MarkenG / § 4 Nr. 3 & § 5 UWG */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px 18px', fontSize: '0.82rem', lineHeight: 1.55, color: '#334155' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚖️</span>
                  <span>Hinweis zur didaktischen Ausrichtung, Markenkennzeichnung &amp; Unabhängigkeit:</span>
                </div>
                Das didaktische Konzept und Unterrichtsfach <strong>„GrooveLAB“</strong> (offenes Gruppen- und Bandunterrichtsmodell) wurde maßgeblich an der Städtischen Musikschule Lahr entwickelt. Das Modul <strong>„GrooveLab“</strong> innerhalb der Plattform Campus-Groovelab knüpft als unabhängige digitale Begleit- und Visualisierungs-Software an die methodischen Anforderungen moderner Gruppen- und Bandunterrichtskonzepte an und macht Übefortschritte, Repertoires und Gruppeninteraktionen digital sichtbar.<br /><br />
                Campus-Groovelab ist eine eigenständige Softwareentwicklung von Patrick Huber. Es besteht <strong>keinerlei rechtliche, gesellschaftsrechtliche, organisatorische oder behördliche Trägerschaft</strong> der Städtischen Musikschule Lahr oder des Freundeskreises der Städtischen Musikschule Lahr e.V.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Elektronische Kontaktaufnahme &amp; Unmittelbare Erreichbarkeit (§ 5 Abs. 1 Nr. 2 DDG / EuGH C-298/07 / Art. 3 UWG CH):</strong><br />
                E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>kontakt@campus-groovelab.de</a><br />
                Support &amp; Schulbetreuung: <a href="mailto:support@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>support@campus-groovelab.de</a><br />
                In-App-Support &amp; Ticketsystem: Direkt über das integrierte Hilfe-Zentrum (2-Wege-Schnellkontakt mit protokollierter Ticketnummer)<br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>⚡ Effizienter elektronischer 2-Wege-Schnellkontakt (EuGH C-298/07 / BGH I ZR 238/14):</strong> Gemäß der Rechtsprechung des Europäischen Gerichtshofs (EuGH, Urteil vom 16.10.2008 – C-298/07) sowie des Bundesgerichtshofs (BGH, Urteil vom 25.02.2010 – I ZR 238/14) erfolgt die unmittelbare und effiziente Kommunikation über zwei vollwertige elektronische Schnellkontaktwege (E-Mail &amp; In-App-Supportsystem mit protokollierter Ticketnummer). Dies gewährleistet eine lückenlose Dokumentation, prioritäre Bearbeitung und eine Antwortzeit an Werktagen <strong>in der Regel innerhalb von 60 Minuten</strong> (Kernzeiten: Mo 09:00–12:00 Uhr • Do 08:00–10:00 Uhr MEZ).
                </span>
                <span style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginTop: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', lineHeight: 1.45 }}>
                  <strong style={{ color: '#0f172a' }}>🛡️ Hinweis zur Zuständigkeit:</strong> Für Auskünfte zu Unterrichtszeiten, Stundenplänen, Raumzuteilungen, Lehrkraft-Vertretungen, Abwesenheitsmeldungen oder Musikschulverträgen wenden Sie sich bitte direkt an das <strong>Sekretariat Ihrer Musikschule vor Ort</strong>. Der Plattform-Support betreut als technischer Infrastrukturdienstleister ausschließlich Software-, Login- und Systemfragen.
                </span>
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  Website: <a href="https://campus-groovelab.de" target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>campus-groovelab.de</a>
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Zentrale Kontaktstelle &amp; Meldeverfahren gemäß Art. 11, 12 &amp; 16 Digital Services Act (DSA):</strong><br />
                E-Mail für behördliche Anfragen: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>kontakt@campus-groovelab.de</a><br />
                Meldekanal für rechtswidrige Inhalte &amp; Urheberrechtsverletzungen (Notice-and-Action gem. Art. 16 DSA):{' '}
                <a 
                  href={`mailto:copyright@campus-groovelab.de?subject=${encodeURIComponent('DSA-Meldung gem. Art. 16 DSA: Urheberrechtsverletzung / Rechtswidriger Inhalt')}&body=${encodeURIComponent(
`MELDUNG RECHTSWIDRIGER INHALTE GEMÄSS ART. 16 DIGITAL SERVICES ACT (DSA)
An die zentrale Kontaktstelle von Campus-Groovelab (copyright@campus-groovelab.de)

1. Genaue URL, Raum-, Datei- oder Song-ID des beanstandeten Inhalts:
[Bitte hier den genauen Link oder die ID der Datei/des Eintrags angeben]

2. Bezeichnung des geschützten Werkes / der verletzten Rechte:
[z. B. Werktitel, Komponist, Notenausgabe, Verlag, ISMN/ISBN oder Art der Rechtsverletzung]

3. Hinreichend begründete Erläuterung der Rechtswidrigkeit (Art. 16 Abs. 2 lit. a DSA):
[Bitte erläutern, warum der Inhalt rechtswidrig ist – z. B. fehlende Lizenzierung, unzulässiger Noten-Scan etc.]

4. Angaben zum Rechteinhaber / Beschwerdeführer (Art. 16 Abs. 2 lit. c DSA):
Name / Vorname: 
Organisation / Verlag / Kanzlei: 
E-Mail-Adresse: 
(Hinweis: Bei Hinweisen auf schwere Straftaten oder Kindeswohlgefährdungen ist die Nennung des Namens freiwillig)

5. Bestätigung und Erklärung in gutem Glauben (Statement of Good Faith gem. Art. 16 Abs. 2 lit. d DSA):
Hiermit bestätige und versichere ich in gutem Glauben, dass ich der Inhaber der verletzten Rechte oder von diesem zur Einreichung dieser Meldung bevollmächtigt bin und dass die in dieser Meldung enthaltenen Angaben und Behauptungen richtig und vollständig sind.

─────────────────────────────────────────────────────────────────────────────
Hinweis: Wissentlich unbegründete, falsche oder missbräuchliche Meldungen können rechtliche Konsequenzen und Schadensersatzansprüche nach sich ziehen (Art. 23 DSA).`
                  )}`}
                  style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}
                  title="Strukturierten DSA-Meldebogen per E-Mail öffnen"
                >
                  copyright@campus-groovelab.de (Strukturiertes Meldeformular öffnen ➔)
                </a><br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '3px' }}>
                  Eingehende Meldungen über Urheberrechtsverletzungen oder rechtswidrige Inhalte werden nach den Vorgaben des Art. 16 DSA unverzüglich, spätestens jedoch innerhalb von 24 Stunden gesichtet und bearbeitet.
                </span>
                <span style={{ fontSize: '0.80rem', color: '#475569' }}>Amtssprachen für behördliche und nutzerseitige Anfragen: Deutsch, Englisch.</span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Umsatzsteuer &amp; Steuerliche Einstufung (§ 5 Abs. 1 Nr. 6 DDG / § 27a UStG / § 6 UStG AT / Art. 8 MWSTG CH):</strong><br />
                - <strong>Deutschland:</strong> Umsatzsteuerbefreit gemäß <strong>§ 19 UStG (Kleinunternehmerregelung)</strong>. Es wird keine Umsatzsteuer erhoben oder gesondert ausgewiesen. Eine Umsatzsteuer-Identifikationsnummer (USt-IdNr.) gemäß § 27a UStG wird für den rein inländischen Geschäftsbetrieb nicht benötigt; für den grenzüberschreitenden innergemeinschaftlichen B2B-Dienstleistungsverkehr (Reverse-Charge) sowie nach § 139c AO wird die Wirtschafts-Identifikationsnummer (W-IdNr.) geführt bzw. auf gesonderte behördliche Zuteilung vorgehalten.<br />
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
            <div 
              role="tabpanel" 
              id="legal-tabpanel-privacy" 
              aria-labelledby="legal-tab-privacy" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Datenschutzerklärung (DSGVO / nDSG / TDDDG)
              </h4>

              {/* 0,1% Executive Summary Card: Datenschutz auf einen Blick */}
              <div style={{
                background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span>
                  <span>Datenschutz- &amp; Vertrauensgarantien (Auf einen Blick)</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '100px' }}>Art. 5 &amp; 8 DSGVO</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span>
                      <span>100 % Zero-User-Mail-Axiom</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Zu 100 % keine Erhebung persönlicher oder dienstlicher E-Mail-Adressen von Schülern, Eltern, Lehrkräften oder Schulleitungen. Passwortloser Login via QR-Schulausweis, Server-PIN &amp; FIDO2-Passkey.
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💳</span>
                      <span>Zero-Payment-Storage</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Keine Speicherung von Bank-, SEPA- oder Kreditkartendaten der Familien auf der Plattform. Voller Schutz vor Datendiebstahl.
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🇩🇪</span>
                      <span>100 % Europäische Cloud</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Hosting ausschließlich in ISO/IEC-27001 zertifizierten deutschen Rechenzentren (Hetzner Nürnberg/Falkenstein). Kein US-Cloud-Transfer.
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🍪</span>
                      <span>Zero-Tracking (§ 25 TDDDG)</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Keine Werbe- oder Marketing-Cookies, kein Google Analytics, kein Profiling. Technisch unbedingt erforderlich – kein Cookie-Banner nötig.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Jump Navigation (Datenschutz) */}
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                padding: '4px 0'
              }}>
                <a
                  href="#ds-rollen"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(21, 128, 61, 0.08)'
                  }}
                >
                  <span>🏛️</span>
                  <span>1. Rollen-Dualität &amp; AVV</span>
                </a>
                <a
                  href="#ds-datenminimierung"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <span>🔒</span>
                  <span>2. Zero-Mail &amp; Schutz</span>
                </a>
                <a
                  href="#ds-tdddg"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <span>🍪</span>
                  <span>3. TDDDG-Matrix</span>
                </a>
                <a
                  href="#ds-loeschkonzept"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <span>🗑️</span>
                  <span>9. DIN 66398 Löschen</span>
                </a>
                <a
                  href="#ds-rechte"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <span>⚖️</span>
                  <span>10. Betroffenenrechte</span>
                </a>
              </div>

              {/* § 1 Modular Card-Clause: Rollen-Dualität */}
              <div id="ds-rollen" style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 1
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    1. Rollen-Differenzierung, Verantwortliche Stellen &amp; Auftragsverarbeitung (Art. 4 Nr. 7 vs. Art. 28 DSGVO)
                  </strong>
                </div>

                {/* 0,1% Callout: Rollen-Dualität für bDSB und Schulträger */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderLeft: '4px solid #16a34a',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.80rem', color: '#15803d', marginBottom: '4px' }}>
                    <span>💡</span>
                    <span>Wichtiger Hinweis für behördliche Datenschutzbeauftragte (bDSB) &amp; Schulträger: Rollen-Dualität</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                    Im regulären Musikschulbetrieb ist die <strong>jeweilige Musikschule bzw. ihr Schulträger die alleinige Verantwortliche (Controller gem. Art. 4 Nr. 7 DSGVO)</strong> für Schüler-, Lehrkräfte- und Unterrichtsdaten. Campus-Groovelab verarbeitet diese Daten streng weisungsgebunden als <strong>Auftragsverarbeiter (Processor gem. Art. 28 DSGVO)</strong> nach Maßgabe der im Tab „AVV“ verbindlich bereitgestellten Vereinbarung.
                  </p>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>(1) Duale Zuständigkeitsarchitektur:</strong><br />
                    • <strong>Säule A – Schulbetrieb (B2B):</strong> Soweit Campus-Groovelab von Musikschulen, Akademien oder Trägern zur Stundenplanung, didaktischen Unterrichtsbegleitung und Schülerverwaltung genutzt wird, ist die <em>jeweilige Musikschule die verantwortliche Stelle</em> im Sinne von Art. 4 Nr. 7 DSGVO. Die Schule entscheidet über Zwecke und Mittel der Verarbeitung. Der Plattformbetreiber handelt als Auftragsverarbeiter gemäß Art. 28 DSGVO.<br />
                    • <strong>Säule B – Website, System-Infrastruktur &amp; Direktabrechnung (B2C):</strong> Für den technischen Betrieb dieser Website, serverseitige Sicherheits-Logfiles, Direktverträge mit Volljährigen oder Eltern sowie den Plattform-Support ist <em>Patrick Huber der originäre Verantwortliche</em> im Sinne der DSGVO, des Schweizer nDSG und des österreichischen DSG:<br />
                    <strong>Patrick Huber</strong>, Softwareentwicklung &amp; Cloud-Dienstleistungen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden), Deutschland.<br />
                    Zentrale E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none' }}>kontakt@campus-groovelab.de</a> • Technischer Support: <a href="mailto:support@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none' }}>support@campus-groovelab.de</a>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(2) Offizielle Datenschutz-Kontaktstelle &amp; DPO-Verbindung:</strong> Für behördliche Datenschutzbeauftragte, Schulleitungen und betroffene Personen unterhalten wir eine dedizierte Ansprechstelle für Datenschutzfragen und Betroffenenrechte: E-Mail: <a href="mailto:datenschutz@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>datenschutz@campus-groovelab.de</a>. Behördliche Datenschutzprüfer können zudem über das integrierte DPO-Audit-Portal direkt auf standardisierte Verzeichnisse von Verarbeitungstätigkeiten (VVT gem. Art. 30 DSGVO) und Schwellwertanalysen (DSFA gem. Art. 35 DSGVO) zugreifen.
                  </p>
                </div>
              </div>

              {/* § 2 Modular Card-Clause: Zero-Mail & Datenminimierung */}
              <div id="ds-datenminimierung" style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 2
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    2. Grundsatz der Datenminimierung, 100 % Zero-User-Mail-Axiom &amp; Bildschirmfreies Üben (Art. 5 &amp; 8 DSGVO / Art. 6 nDSG)
                  </strong>
                </div>

                {/* 0,1% Callout: Eltern-Sicherheit & Kinderschutz */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.80rem', color: '#047857', marginBottom: '4px' }}>
                    <span>🛡️</span>
                    <span>Pädagogischer Kinderschutz &amp; Personalratsschutz: 100 % Zero-User-Mail-Doktrin</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                    Weder Minderjährige, Eltern noch Lehrkräfte oder Mitarbeiter müssen oder können auf Campus-Groovelab persönliche E-Mail-Adressen hinterlegen. Der Zugang erfolgt passwortlos via physischem Schulausweis (QR-Token), geheimer Server-PIN oder FIDO2-Passkey.
                  </p>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>(1) Keine Zahlungs- oder Bankdaten von Familien:</strong> Auf Campus-Groovelab werden keinerlei Bank-, SEPA-, Kreditkarten- oder Abrechnungsvertragsdaten von Schülern oder Eltern gespeichert.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(2) 100 % Zero-User-Mail-Axiom &amp; Entfall personenbezogener E-Mail-Adressen:</strong> Auf den Servern und Datenbanken von Campus-Groovelab werden zu keinem Zeitpunkt personenbezogene E-Mail-Adressen natürlicher Personen (weder von Schülerinnen und Schülern, Erziehungsberechtigten, Lehrkräften noch von Mitgliedern der Schulleitung oder Verwaltung) erhoben, gespeichert oder verarbeitet. Die Authentifizierung erfolgt passwortlos über physische Schulausweise (QR-Code / Ausweisnummer) in Kombination mit einer serverseitig gehashten PIN oder Passkeys (WebAuthn FIDO2). Als einzige institutionelle Ausnahme wird die zentrale Kontakt- und Abrechnungs-E-Mail der Musikschule als juristischer Person (Träger) für buchhalterische Pflichtbelege (§ 14 UStG) und SLA-Mitteilungen verarbeitet. Plattformfunktionen zum Teilen von Zugängen rufen rein clientseitig das lokale Mailprogramm des Endgeräts auf (mailto:?subject=...&amp;body=...); Empfänger-E-Mail-Adressen werden zu 0 % über unsere Server übertragen oder gespeichert.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(3) Namensdarstellung &amp; Schutz von Minderjährigen:</strong> Schülernamen werden in Lehrer-Übersichten datenschutzkonform auf „Vorname + N.“ (z. B. „Max M.“) gekürzt. Lehrkräftenamen werden für Schüler und Eltern mit vollem Namen angezeigt, um Verwechslungsfreiheit im Schulbetrieb zu gewährleisten.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(4) Mindestalter &amp; Bildschirmfreies Üben („Screenless Practice“):</strong> Das Mindestalter beträgt 6 Jahre. Um Bildschirmzeiten bei jüngeren Kindern (6–9 Jahre) zu minimieren, können Übeeinheiten am akustischen Instrument von den Eltern im Elternmodus mit einem Klick quittiert werden (begrenzt auf max. 60 Min./Tag zur Vermeidung von Missbrauch).
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(5) Ausschluss von Gesundheits- und Diagnosedaten (Art. 9 DSGVO / Art. 5 lit. c nDSG):</strong> Die plattforminterne Kommunikations- und Shoutbox-Funktion dient ausschließlich der organisatorischen Unterrichtsabstimmung und Terminabsprache. Die Erfassung, Speicherung oder Übermittlung von sensiblen Gesundheitsdaten, ärztlichen Attesten oder konkreten medizinischen Diagnosen ist untersagt und nicht Gegenstand der Plattformfunktion. Bei Abwesenheiten genügt die allgemeine Angabe „verhindert“.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(6) 0,1 % Duales Notfall-Zugangs- &amp; Wiederherstellungsmodell (Entfall unsicherer E-Mail-Reset-Links):</strong> Da im Gesamtsystem keine Nutzer-E-Mail-Adressen verarbeitet werden, entfallen klassische, durch Phishing und Man-in-the-Middle angreifbare E-Mail-Passwort-Reset-Links vollständig. Bei Verlust von PIN oder Passkey greift das revisionssichere Zwei-Säulen-Modell: (a) <em>Dezentraler kryptografischer Recovery-Key</em> (Self-Sovereign Identity, offline bei Ersteinrichtung ausgedruckt / verwahrt; der Server speichert ausschließlich einen irreversiblen kryptografischen Hash); oder (b) <em>Vor-Ort Schulleitungs-Reset (PostIdent-Standard)</em> durch persönliche Identitätsprüfung im Schulsekretariat mit autoritativer Vergabe eines neuen Ausweis-Tokens bzw. einer Einmal-PIN via <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>reset_user_credentials_by_admin</code>, sofortiger atomarer Session-Invalidierung (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>sessions_revoked_at</code>) und lückenloser Protokollierung im manipulationssicheren WORM-Audit-Trail.
                  </p>
                </div>
              </div>

              {/* § 3 Modular Card-Clause: TDDDG Speichermatrix */}
              <div id="ds-tdddg" style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 3
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    3. Client-seitige Speicherung, TDDDG-Transparenzmatrix &amp; Zero-Consent-Doktrin (§ 25 Abs. 2 Nr. 2 TDDDG / § 165 TKG / Art. 6 revDSG)
                  </strong>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>(1) Technisch zwingend erforderliche Speicherungen:</strong> Unsere Webanwendung verwendet lokale Speichertechnologien des Browsers (LocalStorage, SessionStorage, IndexedDB), um Kernfunktionen wie den sicheren Sitzungserhalt, Navigationseinstellungen und den Offline-Übebetrieb in Proberäumen bereitzustellen.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(2) Keine Tracking- oder Werbe-Cookies (Banner-Immunität):</strong> Es werden zu keinem Zeitpunkt Marketing-, Profiling- oder Drittanbieter-Tracking-Cookies gesetzt. Sämtliche client-seitigen Speicherungen sind gemäß <strong>§ 25 Abs. 2 Nr. 2 TDDDG</strong> (DE) sowie <strong>§ 165 Abs. 3 TKG 2021</strong> (AT) technisch unbedingt erforderlich. Ein Cookie-Banner ist daher gesetzlich entbehrlich.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(3) Transparenzmatrix der lokalen Speicher-Schlüssel (TDDDG § 25 Abs. 2 Nr. 2):</strong>
                  </p>
                  <div style={{ overflowX: 'auto', marginTop: '4px', marginBottom: '4px', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '8px 10px', color: '#0f172a' }}>Schlüssel / Kennung</th>
                          <th style={{ padding: '8px 10px', color: '#0f172a' }}>Typ</th>
                          <th style={{ padding: '8px 10px', color: '#0f172a' }}>Zweck &amp; Funktion</th>
                          <th style={{ padding: '8px 10px', color: '#0f172a' }}>Dauer</th>
                          <th style={{ padding: '8px 10px', color: '#0f172a' }}>Rechtsgrundlage</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>gl_active_session_lease_id</td>
                          <td style={{ padding: '8px 10px' }}>LocalStorage</td>
                          <td style={{ padding: '8px 10px' }}>Kryptografischer Session-Lease-Token zum Schutz vor Session-Hijacking</td>
                          <td style={{ padding: '8px 10px' }}>Bis Abmeldung / max. 30 Tage</td>
                          <td style={{ padding: '8px 10px' }}>§ 25 Abs. 2 Nr. 2 TDDDG</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>groovelab_active_platform</td>
                          <td style={{ padding: '8px 10px' }}>LocalStorage</td>
                          <td style={{ padding: '8px 10px' }}>Beibehaltung des ausgewählten Moduls (Campus vs. GrooveLab)</td>
                          <td style={{ padding: '8px 10px' }}>Dauerhaft bis Cache-Leerung</td>
                          <td style={{ padding: '8px 10px' }}>§ 25 Abs. 2 Nr. 2 TDDDG</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>campus_family_profiles</td>
                          <td style={{ padding: '8px 10px' }}>LocalStorage</td>
                          <td style={{ padding: '8px 10px' }}>Verschlüsselte Schnellumschaltung zwischen Geschwistern auf Familien-Geräten</td>
                          <td style={{ padding: '8px 10px' }}>Bis Abmeldung</td>
                          <td style={{ padding: '8px 10px' }}>§ 25 Abs. 2 Nr. 2 TDDDG</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>groovelab_kiosk_token</td>
                          <td style={{ padding: '8px 10px' }}>LocalStorage</td>
                          <td style={{ padding: '8px 10px' }}>Hardware-Kopplung der Proberaum-Terminals im Kiosk-Betrieb der Musikschule</td>
                          <td style={{ padding: '8px 10px' }}>Bis Terminal-Reset</td>
                          <td style={{ padding: '8px 10px' }}>§ 25 Abs. 2 Nr. 2 TDDDG</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>cg_tax_mode</td>
                          <td style={{ padding: '8px 10px' }}>LocalStorage</td>
                          <td style={{ padding: '8px 10px' }}>Steuer-Konfiguration (Regelbesteuerung vs. Kleinunternehmer)</td>
                          <td style={{ padding: '8px 10px' }}>Dauerhaft</td>
                          <td style={{ padding: '8px 10px' }}>§ 25 Abs. 2 Nr. 2 TDDDG</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p style={{ margin: 0 }}>
                    <strong>(4) Schutz lokaler Daten:</strong> Es werden keine Klartext-Passwörter im Browser gespeichert. Flüchtige Sitzungs-Identifikatoren verfallen automatisch. Sensible lokale Zwischenspeicher werden auf dem Endgerät über die browser-eigene Web Crypto API kryptografisch geschützt (PBKDF2 mit 100.000 Runden SHA-512 und AES-256-GCM).
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(5) Lokaler Audio-Tresor (IndexedDB):</strong> Zur Gewährleistung eines unterbrechungsfreien Probenbetriebs in schallisolierten Räumen ohne Internetverbindung werden temporäre Übe- und Playback-Audios lokal in geschützten IndexedDB-Datenspeichern des Browsers vorgehalten und bei aktiver Verbindung synchronisiert.
                  </p>
                </div>
              </div>

              {/* § 4 Hardware-Zugriffe & Passkeys */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 4
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    4. Hardware-Zugriffe (Kamera &amp; Mikrofon), Passkeys &amp; Ausschluss von Biometrie-Verarbeitung (Art. 9 DSGVO)
                  </strong>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>(1) Kamera:</strong> Der Zugriff auf die Kamera erfolgt ausschließlich lokal im Browser des Nutzers, um den Schulausweis-QR-Code zu erfassen. Es werden zu keinem Zeitpunkt Videobilder an Server übertragen.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(2) Mikrofon &amp; Didaktische Aufnahmen:</strong> Die In-App Loopstation und das Meisterwerk-Protokoll ermöglichen Schülern und Lehrkräften die didaktische Tonaufnahme am Instrument. Ein automatischer Sicherheits-Guard schaltet das Mikrofon bei Modulwechsel, Tab-Inaktivität oder Schließen des Fensters sofort physisch ab (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MediaStreamTrack.stop()</code>).
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(3) ⚡ Strikter Ausschluss von Stimmbiometrie (Art. 9 DSGVO):</strong> Die Audiodaten dienen rein dem musikalischen Playback und der Hausaufgabenkontrolle. Es finden zu keinem Zeitpunkt biometrische Stimm-, Sprecher- oder Verhaltensmusteranalysen statt.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(4) 🔐 Passkeys &amp; WebAuthn (FIDO2 Standard / Keine Biometrie):</strong> Die optionale passwortlose Anmeldung via Passkey nutzt Face ID, Touch ID oder Windows Hello ausschließlich lokal in der isolierten Hardware-Enclave (Secure Enclave / TPM) des Nutzerendgeräts. Biometrische Rohmerkmale verlassen zu keinem Zeitpunkt das Endgerät und werden niemals an Campus-Groovelab übertragen oder auf unseren Servern verarbeitet (Art. 9 DSGVO). Unser Server empfängt und prüft ausschließlich die kryptografische Public-Key-Signatur.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(5) Physische Löschung:</strong> Wird eine Tonaufnahme oder ein Schülerprofil gelöscht, wird die zugehörige Audiodatei vollständig und unwiderruflich aus dem Cloud-Speicher gelöscht.
                  </p>
                </div>
              </div>

              {/* § 5 Vertragspartnerschaft & Kinderschutz */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 5
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    5. Zivilrechtliche Vertragspartnerschaft bis 18 Jahre (§§ 106 ff. BGB), Datenschutz-Mündigkeit ab 16 Jahren (Art. 8 DSGVO) &amp; Gemeinsames Sorgerecht (§ 1629 BGB)
                  </strong>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>(1) Zivilrechtliche Vertrags- &amp; Kostenträgerschaft bis zur Volljährigkeit (§ 2 &amp; §§ 106 ff. BGB):</strong> Vertragspartner für die Plattformnutzung sowie für etwaige entgeltliche Leistungen (insbesondere Schüler-Jahresbeiträge bei Direktabrechnung) sind bei Minderjährigen bis zur Vollendung des 18. Lebensjahres (gesetzliche Volljährigkeit gem. § 2 BGB) ausnahmslos die Erziehungsberechtigten. Minderjährige können ohne ausdrückliche Genehmigung der gesetzlichen Vertreter keine kostenpflichtigen Verträge eingehen.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(2) Gemeinsames Sorgerecht &amp; Gesetzliche Vertretungsvermutung (§ 1629 Abs. 1 Satz 2 BGB):</strong> Nimmt ein Elternteil die Registrierung, Freischaltung oder PIN-Verwaltung für ein minderjähriges Kind vor, versichert dieser an Eides statt, zur alleinigen Vertretung berechtigt zu sein oder im ausdrücklichen Einvernehmen mit dem weiteren sorgeberechtigten Elternteil zu handeln. Der anmeldende Elternteil stellt den Betreiber sowie die Musikschule im Innenverhältnis von etwaigen Einwendungen oder Streitigkeiten des anderen Elternteils frei.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(3) Datenschutzrechtliche Mündigkeit (Art. 8 DSGVO i. V. m. § 16 TDDDG):</strong> Für Schüler bis zum vollendeten 16. Lebensjahr ist für didaktische Audio-Aufnahmen und die Profilnutzung die aktive Freigabe der Erziehungsberechtigten erforderlich. Jugendliche zwischen dem vollendeten 16. und 18. Lebensjahr besitzen die gesetzliche Mündigkeit, ihre datenschutzrechtliche Einwilligung in didaktische Audioaufnahmen selbstständig zu erteilen oder zu widerrufen (die zivilrechtliche Vertragspartnerschaft für das Benutzerkonto verbleibt hiervon unberührt bis zum 18. Lebensjahr bei den Erziehungsberechtigten).
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(4) Kinderschutz &amp; Vier-Augen-Transparenz (§ 8a SGB VIII):</strong> Die Verifikation erfolgt über die physische Ausgabe des Schulausweises durch die Musikschule und die Festlegung einer geheimen Eltern-PIN. Gemäß § 8a SGB VIII und dem institutionellen Kinderschutzkonzept der Schule ist die didaktische Kommunikation zwischen Lehrkräften und Schülern für Erziehungsberechtigte über das Eltern-Portal jederzeit transparent einsehbar (Vier-Augen-Prinzip). Ein unkontrollierter Chatverkehr zwischen Minderjährigen untereinander ist serverseitig ausgeschlossen. Die Einwilligung in didaktische Tonaufnahmen ist freiwillig und kann jederzeit unabhängig vom Unterrichtsvertrag widerrufen werden.
                  </p>
                </div>
              </div>

              {/* § 6 ISO 27001 Hosting */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 6
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    6. Hosting in ISO 27001-zertifizierten deutschen Rechenzentren (Art. 28 &amp; 32 DSGVO)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62 }}>
                  Sämtliche Kernsysteme (Webanwendung, API-Gateway, PostgreSQL-Datenbank und Cloud-Audiospeicher) werden in nach ISO/IEC 27001 zertifizierten deutschen Rechenzentren der Hetzner Online GmbH (Falkenstein/Nürnberg, Deutschland) betrieben. Mit dem Hosting-Provider besteht ein DSGVO-konformer Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO. Die Datenübertragung erfolgt durchgehend TLS 1.3 verschlüsselt.
                </div>
              </div>

              {/* § 7 Zero US Cloud Governance */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 7
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    7. Keine Einbindung externer Drittanbieter- oder US-Cloud-Dienste (Zero US Cloud Governance)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}>
                    Zur strikten Einhaltung europäischer Datenschutzstandards (Schrems II / DSGVO) verzichtet Campus-Groovelab vollständig auf US-Cloud-Dienste, Tracking-Netzwerke oder externe Hilfsdienste:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Sämtliche QR-Codes für physische Ausweise, Stundenpläne und Kiosk-Stationen werden zu 100 % lokal und offline im Webbrowser des Endgeräts gerendert (Zero-Data-Transmission). Es werden zu keinem Zeitpunkt Daten an externe QR-Dienste übertragen.</li>
                    <li>Die Protokollierung von Administrator-IPs beim B2B-Onboarding erfolgt ausnahmslos serverintern im ISO 27001-zertifizierten Hetzner-Rechenzentrum in Deutschland. Es werden keine externen IP-Dienste oder US-Abfrage-APIs genutzt.</li>
                    <li><strong>Missbrauchsschutz &amp; Abwehr automatisierter Angriffe (Proof-of-Work):</strong> Zur Abwehr von Brute-Force-Angriffen und automatisierten Bot-Attacken beim Anmeldevorgang setzen wir ein vollständig serverseitiges, datensparsames kryptografisches Nachweisverfahren (Proof-of-Work) ein. Hierbei werden weder Cookies gesetzt noch gerätespezifische Merkmale ausgelesen (kein Device-Fingerprinting) und keine Daten an Dritte oder US-Server übertragen (Art. 6 Abs. 1 lit. f DSGVO i. V. m. Art. 32 DSGVO).</li>
                    <li>Kalendersynchronisationen und Ferienabfragen erfolgen direkt und ohne Zwischenschaltung ungesicherter Drittanbieter-Proxies.</li>
                  </ul>
                </div>
              </div>

              {/* § 8 Urheberrechtsfreie Metadaten */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 8
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    8. Urheberrechtsfreie Metadaten-Architektur (UrhG &amp; DSA)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62 }}>
                  Campus-Groovelab speichert und hostet keine geschützten Notenblätter oder Partituren als PDF. Es werden ausschließlich bibliografische Metadaten (Songtitel, Komponist, Lehrbuchseite) sowie externe Verlinkungen (z. B. Streaming-Dienste) verarbeitet.
                </div>
              </div>

              {/* § 9 Modular Card-Clause: DIN 66398 Löschkonzept */}
              <div id="ds-loeschkonzept" style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 9
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    9. Kommunales Löschkonzept nach DIN 66398 (5 definierte Löschklassen)
                  </strong>
                </div>

                <p style={{ margin: 0, fontSize: '0.80rem', color: '#475569', lineHeight: 1.55 }}>
                  Zur Einhaltung des Grundsatzes der Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO) implementiert Campus-Groovelab ein behördliches Löschkonzept gemäß <strong>DIN 66398</strong> mit fünf standardisierten Löschklassen:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a', marginBottom: '4px' }}>
                      ⚡ LK 1 – Flüchtige Sitzungsdaten
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Sofortiger Verfall flüchtiger Token bei Benutzerabmeldung oder Schließen des Browsers.
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a', marginBottom: '4px' }}>
                      🎵 LK 2 – Didaktische Schüler-Audioaufnahmen
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Speicherung auf das laufende Schuljahr befristet (automatischer Stichtag 31.08. mit Vorab-Exportfunktion); sofortige physische Löschung bei manuellem Löschen durch Schüler/Eltern.
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a', marginBottom: '4px' }}>
                      💤 LK 3 – Inaktivitätsstatus (Fair-Play)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Nach 60 aufeinanderfolgenden Tagen ohne Schüler-Login automatische Überführung in den passiven Basis-Status zur Kostenentlastung der Musikschule.
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a', marginBottom: '4px' }}>
                      🎓 LK 4 – Bildungsbiografie &amp; Meisterwerke
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Fortlaufende Bereitstellung während der aktiven Unterrichtszeit an der Musikschule; endgültige physische Löschung 30 Tage nach Vertragsbeendigung des Schülers.
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a', marginBottom: '4px' }}>
                      📑 LK 5 – B2B-Abrechnungsbelege der Musikschule
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      10 Jahre gesetzliche Aufbewahrungsfrist gem. § 147 AO / § 257 HGB (reine Sammelrechnungen an die Schule ohne Klarnamen Minderjähriger).
                    </div>
                  </div>
                </div>
              </div>

              {/* § 10 Modular Card-Clause: Betroffenenrechte */}
              <div id="ds-rechte" style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 10
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    10. Betroffenenrechte &amp; Aufsichtsbehörden (Art. 15 bis 22 DSGVO / Art. 25 ff. revDSG)
                  </strong>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>(1) Umfassende Betroffenenrechte:</strong> Sie haben jederzeit das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(2) Zuständigkeit für Anfragen:</strong><br />
                    • Bei Fragen zu konkreten Unterrichtsdaten, Noten, Stundenplänen oder Schulverträgen wenden Sie sich bitte direkt an die <strong>Leitung bzw. das Sekretariat Ihrer Musikschule vor Ort</strong> (als verantwortliche Stelle).<br />
                    • Für systemische Plattformanfragen, Auskünfte zu Webseiten-Logs oder die Geltendmachung von Rechten gegenüber dem Plattformbetreiber richten Sie Ihre Anfrage bitte direkt an: <a href="mailto:datenschutz@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>datenschutz@campus-groovelab.de</a>.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>(3) Beschwerderecht bei den Aufsichtsbehörden:</strong> Sie haben das Recht auf Beschwerde bei einer zuständigen Datenschutz-Aufsichtsbehörde:<br />
                    • <strong>Deutschland:</strong> Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW), Lautenschlagerstraße 20, 70173 Stuttgart (<a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>www.baden-wuerttemberg.datenschutz.de</a>) sowie die Aufsichtsbehörde Ihres gewöhnlichen Aufenthaltsortes.<br />
                    • <strong>Österreich:</strong> Österreichische Datenschutzbehörde (DSB), Barichgasse 40–42, 1030 Wien (<a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>www.dsb.gv.at</a>).<br />
                    • <strong>Schweiz:</strong> Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB), Feldeggweg 1, CH-3003 Bern (<a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>www.edoeb.admin.ch</a>).
                  </p>
                  <span style={{ fontSize: '0.78rem', color: '#475569', display: 'block', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Hinweis für Nutzer in der Schweiz:</strong> Deutschland verfügt gemäß Beschluss des Schweizer Bundesrats vom 25. August 2023 über ein angemessenes Schutzniveau (Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 VDSG).
                  </span>
                </div>
              </div>

              {/* § 11 Schweiz-Bestimmungen */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 11
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    11. Besondere Bestimmungen für Nutzer in der Schweiz (Art. 16, 19, 60–66 revDSG)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}>
                    (1) <strong>Grenzüberschreitende Datenbekanntgabe:</strong> Die Datenverarbeitung erfolgt in Rechenzentren in Deutschland (Europäische Union). Deutschland verfügt gemäß Beschluss des Schweizer Bundesrats über ein angemessenes Datenschutzniveau (Art. 16 Abs. 1 revDSG i. V. m. Anhang 1 VDSG).
                  </p>
                  <p style={{ margin: 0 }}>
                    (2) <strong>Rechte nach dem Schweizer revDSG:</strong> Betroffene Personen in der Schweiz haben das Recht auf Auskunft (Art. 25 revDSG), Datenherausgabe und -übertragung in einem gängigen elektronischen Format (Art. 28 revDSG) sowie Berichtigung und Löschung unrichtiger Daten (Art. 32 revDSG).
                  </p>
                  <p style={{ margin: 0 }}>
                    (3) <strong>Schweizer Aufsichtsbehörde:</strong> Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB), Feldeggweg 1, CH-3003 Bern, Schweiz (<a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>www.edoeb.admin.ch</a>).
                  </p>
                </div>
              </div>

              {/* § 12 AI Act Ausschluss */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 12
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    12. Deterministische Algorithmen &amp; Ausschluss von KI-Systemen (VO (EU) 2024/1689 ErwGr. 12 &amp; Art. 22 DSGVO)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}>
                    (1) <strong>Kein KI-System im Sinne des EU AI Act:</strong> Die didaktischen Audio-Werkzeuge (CampusTuner Stimmgerät, Metronom, Loopstation) und die Stundenplan-Optimierung (15-Stufen-Solver) basieren auf rein deterministischen mathematischen Algorithmen der digitalen Signalverarbeitung (Fast-Fourier-Transformation, Autokorrelation) sowie klassischer Constraint-Satisfaction-Heuristik. Sie stellen gemäß Erwägungsgrund 12 der Verordnung (EU) 2024/1689 (EU AI Act) ausdrücklich keine Systeme der künstlichen Intelligenz dar (kein maschinelles Lernen, keine heuristische Profilbildung).
                  </p>
                  <p style={{ margin: 0 }}>
                    (2) <strong>Ausschluss automatisierter Einzelentscheidungen (Art. 22 DSGVO / Human-in-the-Loop):</strong> Die automatische Stundenplan-Zuteilung erzeugt ausschließlich unverbindliche Entwurfsvorschläge für die Lehrkraft. Jeder Stundenplan muss aktiv von der Lehrkraft geprüft, bei Bedarf manuell angepasst und durch das Schulsekretariat freigegeben werden. Eine vollautomatisierte Entscheidung mit Rechtswirkung findet zu 100 % nicht statt.
                  </p>
                </div>
              </div>

              {/* § 13 Push-Kanäle */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 13
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    13. Benachrichtigungen &amp; Push-Kanäle (Trennung Transaktions- vs. Werbe-Push gem. § 7 UWG)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}>
                    (1) <strong>Transaktionale Benachrichtigungen:</strong> Eilmeldungen zu Unterrichtsausfällen, Raumverlegungen, Vertretungsstunden und Hausaufgabenheft-Einträgen erfolgen im Rahmen der Unterrichts- und Vertragsabwicklung (Art. 6 Abs. 1 lit. b DSGVO) und stellen keine elektronische Werbung dar.
                  </p>
                  <p style={{ margin: 0 }}>
                    (2) <strong>Werbliche Ankündigungen:</strong> Allgemeine Schulnachrichten, Konzertankündigungen oder Zusatzworkshops werden über separate Informationskanäle geführt und erfordern ein gesondertes, freiwilliges Einverständnis (Art. 6 Abs. 1 lit. a DSGVO / § 7 Abs. 2 UWG), das jederzeit in den Profileinstellungen mit 1 Klick widerrufen werden kann.
                  </p>
                </div>
              </div>

              {/* § 14 WORM & Archivierung */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    § 14
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    14. Revisionssichere Archivierung, WORM-Doktrin &amp; Produkthaftung (PLD 2024 &amp; GoBD)
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.62, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}>
                    (1) <strong>Append-Only &amp; WORM-Schutz:</strong> Rechnungsdaten und steuerlich relevante Belege werden nach GoBD unveränderbar persistiert (Write Once, Read Many). Buchungsbelege werden mit einem kryptografischen SHA-256 Siegel versehen, um jede nachträgliche Manipulation forensisch auszuschließen.
                  </p>
                  <p style={{ margin: 0 }}>
                    (2) <strong>Produkthaftungs-Zweckbestimmung:</strong> Campus-Groovelab ist ein pädagogisches Begleit- und Organisationswerkzeug für den Musikunterricht. Die originäre Pflicht zur Aufbewahrung von Personal- und Schülerstammdaten im Rahmen amtlicher Schulgesetze verbleibt bei den amtlichen Registern der Musikschule.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-terms" 
              aria-labelledby="legal-tab-terms" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Allgemeine Geschäftsbedingungen (AGB) – Campus-Groovelab
              </h4>

              {/* 0,1% Executive Summary Card: AGB auf einen Blick */}
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span>
                  <span>AGB-Kompaktübersicht (Auf einen Blick)</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '100px' }}>DACH-Standard</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0369a1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🏛️</span>
                      <span>Teil A: Für Musikschulen &amp; Träger (B2B)</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                      <li><strong>Pädagogisches Add-On:</strong> Kein starres ERP-System, sondern didaktische Ergänzung mit Subsidiaritäts-Garantie.</li>
                      <li><strong>99,5 % Verfügbarkeit:</strong> Rechtlich verbindliches SLA &amp; vollständiger Art. 28 DSGVO AVV.</li>
                      <li><strong>Volle Schul-Autonomie:</strong> Weisungsautonomie der Schule &amp; monatlich kündbare Bereitstellung.</li>
                    </ul>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#047857', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🛡️</span>
                      <span>Teil B: Für Eltern &amp; Schüler (B2C)</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                      <li><strong>14 Tage Widerrufsrecht:</strong> Gesetzlicher B2C-Widerruf &amp; 100 % kostenloser Schnuppermonat.</li>
                      <li><strong>Zero-Abofalle:</strong> Keine automatische Verlängerung über das Schuljahr hinaus.</li>
                      <li><strong>100 % Zero-User-Mail:</strong> Weder Schüler-, Eltern- noch Lehrkräfte-E-Mails auf Servern &amp; Schutz vor unüberwachten Chats.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Quick Jump Navigation (Teil A / Teil B) */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                padding: '4px 0'
              }}>
                <a
                  href="#agb-teil-a"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '100px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(3, 105, 161, 0.08)'
                  }}
                >
                  <span>🏛️</span>
                  <span>Direkt zu Teil A: Musikschulen &amp; Träger (B2B)</span>
                </a>
                <a
                  href="#agb-teil-b"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '100px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(4, 120, 87, 0.08)'
                  }}
                >
                  <span>🛡️</span>
                  <span>Direkt zu Teil B: Eltern &amp; Schüler (B2C)</span>
                </a>
              </div>

              {/* ── TEIL A: B2B FÜR MUSIKSCHULEN & KOMMUNALE TRÄGER ── */}
              <div id="agb-teil-a" style={{
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

                {/* § 1 Modular Card-Clause */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      § 1
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.90rem' }}>
                      Vertragsgegenstand, Rechtsnatur, Pädagogischer Add-On-Status, Subsidiaritäts-Grundsatz &amp; Notfall-Klausel (SaaS-Mietvertrag)
                    </strong>
                  </div>

                  {/* 0,1% Callout: Subsidiaritäts-Garantie & Schulleitungs-Sicherheit */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderLeft: '4px solid #0284c7',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.80rem', color: '#0369a1', marginBottom: '4px' }}>
                      <span>💡</span>
                      <span>Wichtiger Hinweis für Schulleitungen &amp; Träger: Pädagogische Subsidiaritäts-Garantie</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                      Campus-Groovelab ist ein didaktisches Zusatz- und Convenience-Werkzeug. Es ersetzt ausdrücklich kein behördliches Schulverwaltungs-ERP (wie iMikel, MSVplus). Die Weisungsautonomie der Schule, herkömmliche Dienstwege und das Recht auf alternative Terminübermittlung bleiben 100 % unangetastet.
                    </p>
                  </div>

                  <div style={{ fontSize: '0.80rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0 }}>
                      <strong>(1) SaaS-Mietvertrag:</strong> Diese Bestimmungen regeln die Bereitstellung der cloudbasierten Schulmanagement- und Übeplattform <strong>Campus-Groovelab</strong> durch den Betreiber Patrick Huber (Einzelunternehmen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland). Der Vertrag qualifiziert sich rechtlich als <strong>Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH)</strong> über die Bereitstellung von Cloud-Infrastruktur, Datenbank-Hosting, Datensicherung und Systemwartung.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(2) Pädagogischer Add-On-Charakter &amp; Subsidiaritäts-Grundsatz:</strong> Campus-Groovelab ist ein didaktisches Zusatz-, Erleichterungs- und Übermittlungswerkzeug („Convenience-Tool / Fast-Track-Option“) zur Beschleunigung und Erleichterung des Musikschulalltags. Die Plattform ersetzt ausdrücklich kein behördliches oder amtliches Schulverwaltungssystem (ERP-Software wie iMikel, MSVplus oder Musikschul-Manager) und stellt zu keinem Zeitpunkt den ausschließlichen oder verbindlich vorgeschriebenen Dienst-, Weisungs- oder Kommunikationskanal der Musikschule dar.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(3) Primärwege, Weisungsautonomie der Schule, Vorbehalt &amp; Wahlfreiheit:</strong> Die offizielle dienstrechtliche Kommunikation, verbindliche Arbeitsanweisungen der Schulleitung sowie die hoheitliche Verwaltung von Schüler- und Honorarstammdaten verbleiben vollumfänglich auf den herkömmlichen Primärkanälen der Musikschule (behördliche E-Mail, interne Kommunikationssysteme wie MS Teams, Telefon, behördliche ERP-Software oder Aushang). Lehrkräfte und Mitarbeiter sind zu jedem Zeitpunkt berechtigt, Stundenpläne, Raumwünsche und Terminänderungen alternativ auf dem herkömmlichen Weg (per E-Mail oder telefonisch) an das Sekretariat zu übermitteln. Raumbuchungsanfragen, Stundenplanübermittlungen und Terminabstimmungen in der Plattform stellen unverbindliche Voranfragen („unter Vorbehalt“) bzw. technische Botenübermittlungen dar; sie begründen zu keinem Zeitpunkt eine automatische Buchungsgarantie oder rechtsgeschäftliche Bindungswirkung für das Raum- und Stundenkontingent der Musikschule. Die verbindliche Zuteilung und Einpflege in das amtliche Schul-ERP obliegt allein der Schulleitung bzw. dem Schulsekretariat. Die Datenüberführung in das amtliche Verwaltungssystem der Schule obliegt der Musikschule.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(4) Notfall-, Nachrangigkeits- &amp; Schadenminderungsklausel (§ 254 BGB):</strong> Die Musikschule stellt sicher, dass der reguläre Schulbetrieb und die primäre Notfallkommunikation (Telefon, E-Mail, herkömmliche Vertretungspläne) unabhängig von der Plattform gewährleistet bleiben. Bei kurzzeitigen Serverstörungen, Netzausfällen oder Wartungsfenstern findet der Schulunterricht regulär statt; die Musikschule ist im Rahmen ihrer gesetzlichen Schadenminderungspflicht (§ 254 BGB) gehalten, Raum- und Terminabstimmungen über ihre Primärkanäle abzuwickeln. Eine Haftung des Betreibers für ausgefallene Unterrichtsstunden, verpasste Bandproben oder Honorarausfälle ist ausgeschlossen, es sei denn, der Ausfall beruht auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Betreibers oder der schuldhaften Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht). Die Haftungsregelungen gemäß § 7 dieser AGB gelten vollumfänglich.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(5) Auftragsverarbeitung (Art. 28 DSGVO) &amp; Kalender-Einbindung:</strong> Soweit im Rahmen der Bereitstellung personenbezogene Daten verarbeitet werden, gilt ergänzend die Vereinbarung zur Auftragsverarbeitung (AVV gemäß Art. 28 DSGVO bzw. Art. 9 nDSG) als integraler Vertragsbestandteil. Die Einbindung externer Kalender- und Datenquellen (insbesondere via iCal/ICS über Google Calendar, Apple iCloud oder Schulserver) sowie externer Medien- und Notenverlinkungen erfolgt auf alleinige Veranlassung und rechtliche Verantwortung der Musikschule als Verantwortliche (Art. 4 Nr. 7 DSGVO). Der Betreiber verarbeitet diese Daten im Auftrag der Schule (Art. 28 DSGVO) ausschließlich durch passiven Abruf im ISO 27001-zertifizierten deutschen Rechenzentrum. Die Musikschule gewährleistet, dass in den von ihr bereitgestellten externen Kalender-Feeds keine unzulässigen personenbezogenen Klarnamen oder Gesundheitsdaten ohne wirksame Rechtsgrundlage enthalten sind.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(6) Verfügbarkeit (99,5 % SaaS-SLA) &amp; Web Application Firewall:</strong> Der Betreiber strebt eine Verfügbarkeit der Cloud-Infrastruktur von 99,5 % im Jahresmittel an (ausgenommen angekündigte Wartungsarbeiten außerhalb der Kernunterrichtszeiten). Zur Abwehr von Cyber-Angriffen und zur Sicherung des störungsfreien Schulbetriebs behält sich der Betreiber vor, automatisierte Angriffsnetzwerke oder schädliche Datenverbindungen an der Web Application Firewall technisch abzuweisen. Der reguläre weltweite Zugriff für Schüler und Lehrkräfte im Rahmen privater Reisen (z. B. Urlaubsaufenthalte) bleibt hiervon unberührt.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(7) Vertragsschluss &amp; Annahmevorbehalt:</strong> Die Darstellung der Plattform im Internet stellt kein bindendes Angebot, sondern eine Aufforderung zur Abgabe einer Bestellung dar (invitatio ad offerendum). Ein Rechtsanspruch auf Abschluss eines Nutzungsvertrages oder die Bereitstellung eines Schul-Tenants besteht nicht. Der Betreiber behält sich vor, Registrierungsanfragen von Einrichtungen nach pflichtgemäßem Ermessen – insbesondere bei Kapazitätsengpässen oder berechtigten Sicherheitsbedenken – abzulehnen.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(8) Technische Systemvoraussetzungen &amp; Mitwirkungspflicht:</strong> Die geschuldete Leistung setzt auf Seiten der Nutzer Endgeräte und Internetverbindungen voraus, die dem aktuellen Stand der Technik entsprechen. Erforderlich sind: (a) Ein moderner HTML5- und WebAudio-fähiger Browser (Apple Safari ab v15, Google Chrome ab v100, Mozilla Firefox ab v100, Microsoft Edge ab v100) mit aktiviertem JavaScript; (b) eine stabile Internetverbindung mit einer Mindestbandbreite von 2 Mbit/s Download und 1 Mbit/s Upload pro aktiver Arbeitsstation. Fehlfunktionen, die auf veralteter oder unzureichender Hard- oder Software der Musikschule beruhen, stellen keinen Mangel der Plattform dar.
                    </p>
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Bereitstellungsmodell, Kanonische Gebührenstruktur, Fair-Play-Entlastung, Indexierung &amp; Zahlungsbedingungen (DACH-Region)</strong><br />
                  (1) <strong>Kanonische Gebührenaufstellung (Legal SaaS-Nomenklatur):</strong><br />
                  - <strong>Campus-Groovelab Software-Bereitstellung:</strong> 0,00 € / CHF 0.00 (Inklusive). Die Software wird im Rahmen des gebuchten Cloud-Infrastruktur-Pakets ohne gesonderte Lizenzkaufgebühren bereitgestellt.<br />
                  - <strong>Cloud- &amp; Datenbank-Hosting: Modul Campus:</strong> 14,90 € / Mo. (DE/AT) bzw. CHF 19.90 / Mo. (CH) (feste Server-Hosting-, Datenbank- und Webspace-Flatrate je Musikschule).<br />
                  - <strong>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab:</strong> 9,90 € / Mo. (DE/AT) bzw. CHF 14.90 / Mo. (CH) (feste Server-Hosting-, Datenbank- und Webspace-Flatrate je Musikschule).<br />
                  - <strong>Kombi-Vorteilsrabatt (Infrastruktur-Bündel):</strong> -4,90 € / Mo. (DE/AT) bzw. -4.90 CHF / Mo. (CH) bei gemeinsamer Buchung beider Module (Bündel-Flatrate: 19,90 € / Mo. bzw. CHF 29.90 / Mo.).<br />
                  - <strong>Service- &amp; Administrationspauschale:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktive Lehrkraft. Verwaltungs- und Sekretariats-Benutzer (Rollen <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>admin</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>secretary</code>) sind dauerhaft inklusive (0,00 € / CHF 0.00).<br />
                  - <strong>Basis-Bereitstellung:</strong> 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je registrierter Schüler (QR-Landingpages, Stundenplan-, Termin-, Raumänderungs-Sync sowie DSGVO/nDSG-Datensatz-Hosting).<br />
                  - <strong>Cloud- &amp; Modul-Bereitstellung Campus:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll).<br />
                  - <strong>Cloud- &amp; Modul-Bereitstellung GrooveLab:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive Band-Nutzung: Song-Bibliotheken, Band-Rooms, Repertoire; wird verbindlich zu 100 % von der Musikschule übernommen).<br />
                  (2) <strong>Sammelzahler vs. Direktabrechnung:</strong> GrooveLab-Aktivierungen werden immer zu 100 % von der Musikschule getragen (Sammelzahler). Für das Campus-Modul kann die Musikschule wahlweise Direktabrechnung mit den Eltern vereinbaren. Schüler-Direktabrechnungen werden ausnahmslos als einmaliger Jahresbeitrag (max. 11 × 0,49 € = 5,39 € in DE/AT bzw. 11 × CHF 1.00 = CHF 11.00 in CH pro Schuljahr; 1. Monat 100 % kostenfrei) abgerechnet – niemals monatlich (zur Vermeidung unverhältnismäßiger Banktransaktions- und Buchungsgebühren).<br />
                  (3) <strong>Fair-Play Inaktivitäts-Entlastung:</strong> Loggt sich ein Schüler über einen Zeitraum von mehr als sechzig (60) aufeinanderfolgenden Tagen nicht aktiv in die interaktive Plattform ein, wird das Profil zur Vermeidung unnötiger Kosten für die Musikschule automatisch in den passiven Basis-Bereitstellungsstatus (0,09 € / CHF 0.20 pro Monat) überführt. QR-Landingpages, Stundenpläne und Notizen bleiben vollständig aktiv.<br />
                  (4) <strong>Bestandsschutz-Zusage (Price-Lock) &amp; Symmetrische Indexierungsklausel (§ 1 PrKG):</strong> Der Betreiber sagt der Musikschule für die Dauer des ununterbrochenen Vertragsverhältnisses die Beibehaltung der vereinbarten monatlichen Basis-Hosting- und Bereitstellungspauschalen für mindestens zwölf (12) Monate zu. Ändert sich der vom Statistischen Bundesamt ermittelte Verbraucherpreisindex für Deutschland (Basis 2020 = 100) um mehr als fünf (5) Prozentpunkte gegenüber dem Basisjahr des Vertragsschlusses, ist jede Partei berechtigt, eine entsprechende proportionale Anpassung der monatlichen Basispauschalen zum Beginn des Folgeschuljahres mit einer Frist von mindestens zwei Monaten in Textform zu verlangen (sowohl nach oben als auch nach unten). Im Falle einer Preiserhöhung steht der Musikschule ein Sonderkündigungsrecht zum Wirksamkeitszeitpunkt zu.<br />
                  (5) <strong>Steuerliche Hinweise &amp; Bruttopreisgarantie für Bestandskunden:</strong> Soweit der Betreiber die Kleinunternehmerregelung in Anspruch nimmt, erfolgt die Abrechnung gem. § 19 UStG (DE) bzw. § 6 Abs. 1 Z 27 UStG (AT) ohne gesonderten Umsatzsteuerausweis. Bei Wechsel zur Regelbesteuerung (19 % MwSt.) gilt für alle bestehenden Verträge die unbedingte <strong>Bruttopreisgarantie</strong>: Der vereinbarte Rechnungs- und Zahlbetrag bleibt auf den Cent genau identisch; die anfallende gesetzliche Mehrwertsteuer wird vollständig aus dem vereinbarten Entgelt herausgerechnet und gesondert auf der Rechnung ausgewiesen (§ 14 UStG). Vorsteuerabzugsberechtigte Kunden können die ausgewiesene Steuer steuermindernd geltend machen. Für die Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).<br />
                  (6) <strong>Zahlungsverzug &amp; Gesetzliche Verzugspauschale (§ 288 Abs. 5 BGB):</strong> Gerät die Musikschule mit fälligen Zahlungen in Verzug, schuldet sie Verzugszinsen in gesetzlicher Höhe (§ 288 Abs. 2 BGB: 9 Prozentpunkte über dem jeweiligen Basiszinssatz). Der Betreiber ist berechtigt, eine Verzugspauschale in Höhe von 40,00 € (§ 288 Abs. 5 BGB) zu verlangen; diese wird auf einen etwaigen Schadensersatzanspruch für Kosten der Rechtsverfolgung angerechnet.<br />
                  (7) <strong>Gestuftes Zurückbehaltungsrecht &amp; Sperrung (Fair-Warning-Workflow):</strong> Bei Zahlungsverzug von mehr als dreißig (30) Kalendertagen und einem Rückstand von mindestens zwei Monatsbeiträgen ist der Betreiber nach vorheriger schriftlicher Mahnung unter Setzung einer Nachfrist von mindestens vierzehn (14) Kalendertagen und gleichzeitiger Androhung der Sperrung berechtigt, den administrativen Schreibzugang zum Schultenant vorübergehend zu sperren. Gespeicherte Schülernachweise, Stundenpläne und Noten bleiben während der Sperre passiv exportierbar.<br />
                  (8) <strong>Aufrechnung &amp; Zurückbehaltungsrecht (BGH-konform):</strong> Die Musikschule ist zur Aufrechnung nur berechtigt, wenn ihre Gegenansprüche rechtskräftig festgestellt, unbestritten oder vom Betreiber anerkannt sind. Dieser Ausschluss gilt ausdrücklich <em>nicht</em> für Gegenforderungen der Musikschule aus demselben Vertragsverhältnis, die auf einer Leistungsverweigerung, Minderung oder mangelbedingten Schadensersatzansprüchen beruhen (Synallagma).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Vertragslaufzeit, Unterjähriger Einstieg, Kündigung &amp; Wichtiger Grund (§ 314 BGB)</strong><br />
                  (1) Der Vertragsbeginn und die Bereitstellung der Cloud-Infrastruktur können zu jedem beliebigen Kalendertag erfolgen. Die Vertragslaufzeit richtet sich nach dem von der Musikschule im System konfigurierten Schuljahreszeitraum (standardmäßig 01. September bis 31. August bzw. der individuelle Schuljahresstichtag). Bei unterjährigem Einstieg läuft die initiale Vertragslaufzeit ab dem Bereitstellungsdatum bis zum individuellen Ende des laufenden Schuljahres.<br />
                  (2) Für die Folgezeit verlängert sich der Vertrag jeweils um ein weiteres volles Schuljahr (12 Monate bis zum jeweiligen Schuljahresstichtag), sofern er nicht mit einer Frist von einem (1) Monat zum Ende des Schuljahres in Textform (z. B. per E-Mail oder über das Dashboard) gekündigt wird.<br />
                  (3) Bei unterjährigem Einstieg werden anfallende Bereitstellungs- und Infrastrukturpauschalen zeitanteilig (pro rata temporis) ab dem Monat der Freischaltung bis zum individuellen Schuljahresende berechnet.<br />
                  (4) Neuanmeldungen, Modul-Aktivierungen sowie Abmeldungen einzelner Schüler- oder Lehrkräfte-Profile können während des laufenden Schuljahres jederzeit flexibel und tagesgenau im Administrations-Dashboard vorgenommen werden.<br />
                  (5) <strong>Außerordentliche Kündigung aus wichtigem Grund (§ 314 BGB):</strong> Das Recht beider Parteien zur fristlosen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt für den Betreiber insbesondere vor, wenn: (a) die Musikschule mit der Entrichtung der Vergütung für zwei aufeinanderfolgende Monate in Verzug ist; (b) trotz Abmahnung schwerwiegend gegen urheberrechtliche Schutzbestimmungen verstoßen wird; (c) über das Vermögen der Musikschule ein Insolvenzverfahren eröffnet oder mangels Masse abgewiesen wird. Ein wichtiger Grund liegt für die Musikschule insbesondere vor, wenn die Plattform schuldhaft über mehr als vierzehn (14) aufeinanderfolgende Schultage vollständig nicht erreichbar ist.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Reine Metadaten-Architektur für Noten, Didaktische Cover-Aufnahmen (§ 53, § 60a UrhG), Urheberrechte der Lehrkräfte &amp; Notice-and-Takedown (Art. 6 &amp; 16 DSA)</strong><br />
                  (1) <strong>Reine Metadaten-Architektur für Noten &amp; Ausschluss von Original-Masteraufnahmen:</strong> Die Plattform Campus-Groovelab speichert, hostet und vervielfältigt zu 0 % urheberrechtlich geschützte Notensätze, Leadsheets, Tabulaturen oder geschützte Verlags-Partituren als PDF sowie keine kommerziellen Original-Masteraufnahmen von Musiklabels. Die Mediathek verarbeitet für Lehrwerke ausschließlich freie bibliografische Metadaten (Interpret, Titel, Tonart, Besetzung, Lehrwerkstitel und Seitenzahlen) sowie Verlinkungen zu lizenzierten externen Mediendiensten (z. B. Spotify, YouTube) oder autorisierten Noten-Plattformen (z. B. Tomplay).<br />
                  (2) <strong>Didaktische Schüler-Audioaufnahmen (Cover-Versionen im privaten Kreis gem. § 53, § 60a UrhG):</strong> Gehostet werden ausschließlich von den Schülern selbst im Rahmen des Instrumentalunterrichts oder beim häuslichen Üben eingespielte Tonaufnahmen (didaktische Cover-Versionen von Übestücken). Diese dienen rein dem pädagogischen Feedback mit der Lehrkraft (§ 60a UrhG) sowie dem Anhören im engsten privaten Familienkreis (§ 53 Abs. 1 UrhG / gesetzliche Privatkopie). Es existiert keine öffentliche Mediathek, kein offenes Streaming und keine freie Auffindbarkeit im Internet.<br />
                  (3) <strong>Verwertungsgesellschaften-Klarstellung (GEMA, AKM, SUISA):</strong> Der Betreiber betreibt keine öffentliche Streaming-Mediathek geschützter Musikwerke. Aus diesem Grund entstehen durch die bloße Plattformbereitstellung keine gesonderten Melde- oder Vergütungspflichten der Plattform gegenüber Verwertungsgesellschaften (GEMA in Deutschland, AKM/Austro-Mechana in Österreich, SUISA in der Schweiz). Die Lizenzierung des eigentlichen Präsenzunterrichts und von Schulaufführungen obliegt der Musikschule über die jeweils bestehenden Gesamtverträge ihrer Landes- oder Bundesverbände.<br />
                  (4) <strong>Verbot des Uploads / Verlinkens unlizenzierter Notensätze:</strong> Lehrkräften und Nutzern ist es streng untersagt, urheberrechtlich geschützte Noten-PDFs, Leadsheets, Verlags-Scans oder Verweise auf offensichtlich rechtswidrige Quellen in der Plattform abzulegen (§ 60a Abs. 3 Nr. 2 UrhG [DE], § 42f UrhG [AT], Art. 19 URG [CH]).<br />
                  (5) <strong>Urheberrechte an didaktischen Inhalten &amp; Lizenzierung:</strong> Sämtliche Urheber-, Leistungs- und Nutzungsrechte an von Lehrkräften oder Schülern erstellten Notizen, Audioaufnahmen, Übe-Loops und didaktischen Beiträgen verbleiben vollumfänglich beim jeweiligen Urheber. Der Betreiber erhält lediglich ein einfaches, räumlich auf den Tenant der Musikschule beschränktes, unentgeltliches Recht, diese Inhalte zur Erfüllung der Plattformfunktionen im Auftrag der Schule zu speichern und dem berechtigten Nutzerkreis anzuzeigen.<br />
                  (6) <strong>Haftungsprivileg &amp; Automatisierte Server-Side Notice-and-Takedown Engine (Art. 6 &amp; 16 DSA / § 10 DDG):</strong> Der Betreiber stellt lediglich die technische Vermittlungsinfrastruktur bereit und haftet als Host-Provider gemäß Art. 6 Digital Services Act (DSA) i. V. m. § 10 DDG erst ab tatsächlicher Kenntnis rechtswidriger Inhalte. Zur Gewährleistung eines unverzüglichen Schutzes verfügt die Plattform über eine autoritative, serverseitige Takedown-Engine. Urheberrechtsinhaber und Verlage können Beanstandungen an <a href="mailto:copyright@campus-groovelab.de" style={{ color: '#2563eb', textDecoration: 'underline' }}>copyright@campus-groovelab.de</a> übermitteln. Berechtigt beanstandete Freigabelinks werden serverseitig mit sofortiger Wirkung für sämtliche Endgeräte global deaktiviert (HTTP 410 Resource Suspended).<br />
                  (7) <strong>Freistellungsverpflichtung bei Urheberrechtsverletzungen durch Nutzer:</strong> Die Musikschule trägt die alleinige rechtliche Verantwortung dafür, dass ihre Lehrkräfte, Mitarbeiter und Schüler keine urheberrechtsverletzenden Medien, Noten-PDFs oder rechtswidrigen Inhalte in die Plattform einstellen. Sollte der Betreiber von Urhebern, Verlagen, Verwertungsgesellschaften (GEMA, AKM, SUISA) oder sonstigen Dritten wegen Schutzrechtsverletzungen durch von Nutzern der Musikschule eingestellte Inhalte in Anspruch genommen werden, stellt die Musikschule den Betreiber von allen berechtigten Ansprüchen, Gerichts- und angemessenen Rechtsverteidigungskosten auf erstes Anfordern frei, es sei denn, die Musikschule hat die Rechtsverletzung nachweislich nicht zu vertreten.<br />
                  (8) <strong>Enthaftung für externe Schnittstellen &amp; Drittanbieter-URLs:</strong> Soweit in der Plattform Links oder Schnittstellen zu externen Drittplattformen (z. B. YouTube, Spotify, Tomplay) bereitgestellt werden, übernimmt der Betreiber keine Gewähr für die ständige Verfügbarkeit, Virenfreiheit oder inhaltliche Gültigkeit dieser Fremddienste.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. Arbeitszeit-Compliance (ArbZG), Arbeitgeber-Alleinverantwortung (Microsoft-Teams-Prinzip), Herrenberg-Freistellung (BSG B 12 R 3/20 R) &amp; Kinderschutz (§ 8a SGB VIII)</strong><br />
                  (1) <strong>Asynchrones Lehrmittel &amp; Arbeitgeber-Alleinverantwortung nach dem Arbeitszeitgesetz (ArbZG):</strong> Campus-Groovelab qualifiziert sich als asynchrones pädagogisches Arbeits- und Lernmittel (vergleichbar mit Standardsoftware wie Microsoft Teams, Google Classroom oder Schul-Clouds). Die Musikschule ist als Arbeitgeberin allein und uneingeschränkt verantwortlich für die Einhaltung sämtlicher arbeitsschutzrechtlicher Vorschriften, insbesondere des Arbeitszeitgesetzes (ArbZG), der täglichen Höchstarbeitszeiten sowie der gesetzlichen ununterbrochenen Ruhezeit von elf (11) Stunden gem. § 5 ArbZG. Die Bereitstellung des Zugangs begründet zu keinem Zeitpunkt eine arbeitgeberseitige Verpflichtung der Lehrkräfte zur Erreichbarkeit oder Leistungserbringung außerhalb der regulären Dienst- und Unterrichtszeiten.<br />
                  (2) <strong>Didaktische Vorbereitung auf freiwilliger pädagogischer Basis:</strong> Die Nutzung der Plattform durch Lehrkräfte außerhalb des planmäßigen Präsenzunterrichts (z. B. didaktische Erstellung von Hausaufgaben, Einspielen von Übe-Loops, Eintragung von Schüler-Feedbacks) erfolgt auf rein freiwilliger pädagogischer Basis und stellt keine angeordnete Arbeitszeit oder vergütungspflichtige Mehrarbeit dar. Dem Lehrpersonal steht das Recht auf Nichterreichbarkeit („Right to Disconnect“) uneingeschränkt zu.<br />
                  (3) <strong>Herrenberg-Compliance, didaktisches Assistenz-Prinzip &amp; B2B-Freistellung bei Honorarkräften (§ 7a SGB IV / BSG B 12 R 3/20 R):</strong> Campus-Groovelab dient den Lehrkräften für einen optimalen Unterrichtsalltag und nicht die Lehrkräfte dem Schulalltag (Didaktisches Assistenz-Prinzip). Die Plattform ist ein didaktisches Zusatz-, Erleichterungs- und Übermittlungswerkzeug („Convenience-Tool / Fast-Track-Option“) zur Beschleunigung und Erleichterung des Musikunterrichts. Sie ersetzt ausdrücklich kein behördliches oder amtliches Schulverwaltungssystem (ERP wie iMikel, MSVplus oder Musikschul-Manager) und stellt zu keinem Zeitpunkt den ausschließlichen oder verbindlich vorgeschriebenen Dienst-, Weisungs- oder Kommunikationskanal der Musikschule dar. Jede Lehrkraft entscheidet selbstständig über die Nutzung und den didaktischen Umfang. Bindet die Musikschule freie Dozenten oder Honorarkräfte in die Plattform ein, stellt die Musikschule in eigener organisationsrechtlicher Verantwortung sicher, dass keine weisungsgebundene Eingliederung im Sinne der Rechtsprechung des Bundessozialgerichts (Herrenberg-Urteil) vorliegt. Die Plattform übt zu keinem Zeitpunkt eine Weisungs- oder Direktionsgewalt aus; Stundenplanentwürfe stellen rein unverbindliche Dispositionsvorschläge dar. Die Musikschule stellt den Betreiber von jeglicher Haftung, Nachforderungen von Sozialversicherungsbeiträgen oder Säumniszuschlägen durch Sozialversicherungsträger gem. § 7a SGB IV vollumfänglich und auf erstes Anfordern frei.<br />
                  (4) <strong>Institutioneller Kinderschutz &amp; Vier-Augen-Prinzip (§ 8a SGB VIII / BKiSchG):</strong> Die interne Chat- und Benachrichtigungsfunktion ist strikt an das institutionelle Kinderschutzkonzept gebunden. Zur Prävention von Grenzverletzungen und unüberwachter digitaler 1:1-Kommunikation zwischen erwachsenen Lehrkräften und Minderjährigen ist der Chatverlauf für Erziehungsberechtigte transparent einsehbar (Vier-Augen-Prinzip). Ein privater, unüberwachter Chat zwischen Schülern untereinander ist serverseitig ausgeschlossen.<br />
                  (5) <strong>Ausschluss von Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG):</strong> Die Plattform verzichtet auf jegliche Funktionen zur automatisierten Leistungs- oder Verhaltenskontrolle des Lehrpersonals. Es werden keine Kennzahlen zu Reaktionszeiten, Aktivitätsdauer oder Quoten zur Mitarbeiterbewertung ermittelt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Raum-Engine &amp; Namensdarstellung (Schutz von Minderjährigen)</strong><br />
                  Lehrkraft-Raumbuchungen werden im System initial im Status unbestätigt (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>pending</code>) geführt und bedürfen der Freigabe durch das Sekretariat. Schülernamen werden auf Lehrer-Dashboards datenschutzkonform gekürzt (Vorname + Anfangsbuchstabe); Lehrkräfte werden zur eindeutigen Wiedererkennung mit vollständigem Namen geführt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. B2B-Gewährleistung, Haftungsbegrenzung, Cyber-Security-Standard, Rechtswahl, Gerichtsstand &amp; Salvatorische Klausel</strong><br />
                  (1) Gegenüber Unternehmern und juristischen Personen des öffentlichen Rechts wird die verschuldensunabhängige Haftung des Betreibers für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB [DE] / § 1096 ABGB [AT] / Art. 259a OR [CH]) ausdrücklich und vollumfänglich ausgeschlossen. Bei einfacher Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) begrenzt auf den vertragstypisch vorhersehbaren Schaden. Eine Haftung für entgangenen Gewinn, mittelbare Schäden, Mangelfolgeschäden oder ausgefallene Unterrichtsstunden ist ausgeschlossen.<br />
                  (2) <strong>Dynamische Haftungshöchstgrenze (Liability Cap) &amp; Koppelung an Cyber-Deckung:</strong> Die Gesamthaftung des Betreibers für alle Schadensfälle innerhalb eines Kalenderjahres aus oder im Zusammenhang mit diesem Vertrag – gleich aus welchem Rechtsgrund – ist auf die Summe der vom Kunden in den letzten zwölf (12) Monaten vor Eintritt des schädigenden Ereignisses tatsächlich an den Betreiber entrichteten Netto-Vergütung (mindestens jedoch 2.500,00 € und maximal 10.000,00 € bzw. CHF 10.000,00), beschränkt. Soweit ein Schaden durch die vom Betreiber nach Ziffer (6) unterhaltene gewerbliche Cyber- und IT-Haftpflichtversicherung gedeckt ist, beschränkt sich die Haftung der Höhe nach auf die von der Versicherung im konkreten Schadensfall tatsächlich erbrachte Versicherungsleistung (Deckungssumme 2.000.000,00 €). Vorstehende Begrenzungen gelten nicht bei Vorsatz, grober Fahrlässigkeit, bei Personenschäden (Verletzung von Leben, Körper oder Gesundheit) sowie bei gesetzlich zwingender Haftung (z. B. Produkthaftungsgesetz).<br />
                  (3) <strong>Datenverlust &amp; Mitverschuldensklausel (§ 254 BGB):</strong> Für den Verlust von Daten haftet der Betreiber der Höhe nach nur insoweit, als der Schaden auch bei ordnungsgemäßer und regelmäßiger Datensicherung durch den Kunden bzw. über das integrierte Schulausweis- und Datenexportmodul entstanden wäre. Die Haftung ist auf den typischen Wiederherstellungsaufwand beschränkt.<br />
                  (4) <strong>Mängelanzeigeobliegenheit (§ 536c BGB analog):</strong> Mängel der Plattform hat die Musikschule dem Betreiber unverzüglich nach deren Entdeckung in Textform (z. B. per E-Mail an <a href="mailto:support@campus-groovelab.de" style={{ color: '#2563eb' }}>support@campus-groovelab.de</a>) unter genauer Angabe der Fehlersymptome, des Auftretenszeitpunkts sowie Screenshots/Fehlerprotokollen anzuzeigen. Unterlässt die Musikschule die fristgerechte Anzeige schuldhaft, ist sie nicht berechtigt, Mietminderung geltend zu machen oder Schadensersatz wegen des Mangels zu verlangen, es sei denn, der Mangel war dem Betreiber bereits bekannt.<br />
                  (5) <strong>IT-Sicherheitsstandard &amp; Zero-Day-Vorfälle:</strong> Der Betreiber schuldet im Hinblick auf IT-Sicherheit die Einhaltung des anerkannten Stands der Technik (State of the Art nach Art. 32 DSGVO und BSI-Empfehlungen / OWASP ASVS Level 3). Für Sicherheitsvorfälle, die auf zuvor weltweit unbekannten Sicherheitslücken in Basissoftware-Komponenten (Zero-Day-Exploits) oder auf gezielten Cyber-Angriffen Dritter beruhen, haftet der Betreiber nicht, sofern er die branchenüblichen Schutzmaßnahmen nachweislich implementiert und verfügbare Sicherheitspatches unverzüglich eingespielt hat.<br />
                  (6) <strong>Gewerblicher Versicherungsschutz:</strong> Der Betreiber unterhält zur Absicherung von Personen-, Sach- und echten Vermögensschäden eine gewerbliche IT-Haftpflicht- sowie eine Cyber-Risiko-Versicherung bei einem in der EU zugelassenen Versicherungsunternehmen mit einer Deckungssumme von mindestens 2.000.000,00 € je Versicherungsfall.<br />
                  (7) <strong>12-monatige Verjährungsverkürzung:</strong> Sämtliche Ansprüche des Kunden wegen Mängeln oder Pflichtverletzungen verjähren innerhalb von zwölf (12) Monaten ab dem gesetzlichen Verjährungsbeginn. Hiervon unberührt bleibt die gesetzliche Verjährungsfrist für Schadensersatzansprüche wegen Vorsatz, grober Fahrlässigkeit sowie Verletzung von Leben, Körper oder Gesundheit.<br />
                  (8) <strong>Rechtswahl &amp; Gerichtsstand:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Ist die Musikschule bzw. der Vertragspartner Kaufmann, eine juristische Person des öffentlichen Rechts oder ein öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Sitz des Betreibers (Lörrach / Rheinfelden).<br />
                  (9) <strong>Salvatorische Erhaltungsklausel (§ 306 Abs. 2 BGB):</strong> Sollten einzelne Bestimmungen dieses Vertrages ganz oder teilweise unwirksam oder undurchführbar sein oder werden, so bleibt die Gültigkeit der übrigen Bestimmungen hiervon unberührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung gelten die gesetzlichen Vorschriften (§ 306 Abs. 2 BGB).
                </div>
              </div>

              {/* ── TEIL B: B2C FÜR ELTERN & SCHÜLER ── */}
              <div id="agb-teil-b" style={{
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

                {/* § 8 Modular Card-Clause */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#d1fae5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      § 8
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.90rem' }}>
                      Kostenfreier Schnuppermonat, Schuljahres-Bereitstellung, Schüler-Bestandsschutz &amp; Zivilrechtliche Vertragspartnerschaft bis 18 Jahre (§ 2 &amp; §§ 106 ff. BGB)
                    </strong>
                  </div>

                  {/* 0,1% Callout: Eltern-Sicherheit & Zero-Abofalle */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.80rem', color: '#047857', marginBottom: '4px' }}>
                      <span>🛡️</span>
                      <span>Eltern-Sicherheit: Schnuppermonat &amp; Zero-Abofalle Garantie</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                      Der 1. Anmeldemonat ist 100 % kostenfrei zum Kennenlernen. Keine automatische Verlängerung über das Schuljahresende hinaus, keine Abofallen und 1-Klick-Widerruf im Eltern-Dashboard.
                    </p>
                  </div>

                  <div style={{ fontSize: '0.80rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0 }}>
                      <strong>(1) Vertragspartnerschaft der Erziehungsberechtigten bis zur Volljährigkeit:</strong> Vertragspartner für das Schülerprofil und die Entrichtung des Jahresbeitrags sind bei Minderjährigen bis zur Vollendung des 18. Lebensjahres (§ 2 BGB) ausnahmslos die Erziehungsberechtigten. Eltern, die das interaktive Campus-Modul für ihr Kind aktivieren, erhalten den laufenden Anmeldemonat zu 100 % kostenfrei zum Kennenlernen. Für die verbleibenden Monate bis zum individuellen Schuljahresende der Schule wird die Bereitstellung als einmaliger Jahresbeitrag (errechnet aus 0,49 € in DE/AT bzw. CHF 1.00 in CH pro bezahltem Monat) abgerechnet. Eine monatliche Einzelabrechnung ist zur Vermeidung unverhältnismäßiger Transaktionsgebühren ausgeschlossen.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(2) Gemeinsames Sorgerecht &amp; Vertretungsvermutung (§ 1629 Abs. 1 Satz 2 BGB):</strong> Der die Freischaltung oder PIN-Verwaltung durchführende Elternteil versichert an Eides statt, zur Alleinvertretung des Kindes befugt zu sein oder im Einvernehmen mit dem weiteren sorgeberechtigten Elternteil zu handeln. Er stellt den Betreiber im Innenverhältnis von allen Ersatz- oder Erstattungsansprüchen des anderen Elternteils frei.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(3) Schuljahresübergang &amp; Schüler-Bestandsschutz:</strong> Bei einer Aktivierung im letzten Monat des Schuljahres ist der Zugang für diesen verbleibenden Restmonat vollständig kostenfrei zum Kennenlernen. Für das Folgeschuljahr gilt für Schüler und Eltern der Bestandsschutz der jeweiligen Musikschule: Solange der Vertrag zwischen der Musikschule und dem Betreiber ununterbrochen fortbesteht, bleibt der Jahresbeitrag für die Schüler dieser Musikschule preisstabil. Eine Erhöhung der Schülerbeiträge für Bestandskunden ist ausgeschlossen.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(4) Mindestalter &amp; Bildschirmfreies Üben (Screenless Practice):</strong> Das Mindestalter für Schüler beträgt 6 Jahre. Zur Vermeidung unnötiger Bildschirmzeit bei Grundschulkindern unterstützt die Plattform das didaktische Prinzip des bildschirmfreien Übens („Screenless Practice“): Im Modus „Von Eltern geführt“ verbleibt das Endgerät bei den Eltern; Übezeiten am echten Instrument werden per 1-Klick-Quittierung verbucht.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(5) Sorgfaltspflichten bei Zugangsdaten &amp; PINs:</strong> Eltern und Schüler sind verpflichtet, persönliche Zugangsdaten (QR-Ausweise, Eltern-PIN, persönliche Schüler-PIN) vor dem Zugriff unbefugter Dritter zu schützen. Bei Verlust des Schulausweises oder dem Verdacht einer missbräuchlichen Nutzung ist unverzüglich das Sekretariat der Musikschule zur Neugenerierung des Ausweis-Tokens zu informieren.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(6) Pädagogischer Haftungsausschluss (Kein geschuldeter Lernerfolg):</strong> Der Betreiber stellt mit Campus-Groovelab rein didaktische Hilfsmittel (z. B. Übe-Timer, Metronom, Loopstation, Gamification-Elemente) zur Verfügung. Die pädagogische Unterrichtsgestaltung, der persönliche Lernerfolg, Noten, Prüfungsergebnisse sowie die tatsächliche musikalische Beherrschung des Instruments verbleiben in der ausschließlichen pädagogischen Verantwortung der Musikschule, der jeweiligen Lehrkraft und des Schülers. Ein bestimmter Lernerfolg oder eine Haftung für das Erreichen didaktischer Lernziele wird nicht geschuldet und ist ausgeschlossen.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(7) Endgeräte- &amp; Sensorik-Klausel:</strong> Die ordnungsgemäße Funktion gerätespezifischer Features (z. B. Display-Down-Sensorik beim Übe-Timer via DeviceOrientation-Sensor) hängt von der Hard- und Softwarekonfiguration des verwendeten Endgeräts ab. Für sensorische Messungenauigkeiten oder Betriebssystemeinschränkungen des Endgeräts übernimmt der Betreiber keine Haftung.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>(8) Urheberrechte an eigenen Beiträgen &amp; Aufnahmen:</strong> Schülerinnen, Schüler und Eltern behalten das uneingeschränkte geistige Eigentum an allen von ihnen selbst erstellten Notizen, Zeichnungen und eingespielten Audio-Loops. Dem Betreiber wird lediglich die technisch notwendige Berechtigung eingeräumt, diese Daten im geschützten Audio-Tresor für die zugeordnete Lehrkraft und Familie abspielbar zu halten.
                    </p>
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>9. Gesetzliche Verbraucherrechte &amp; Keine automatische Verlängerung (Zero-Abofalle)</strong><br />
                  Die gesetzlichen Mängelgewährleistungsrechte für Verbraucher bleiben uneingeschränkt bestehen. Es findet <strong>keine automatische Vertragsverlängerung</strong> über das Schuljahresende hinaus statt. Der Zugang endet automatisch zum konfigurierten Schuljahresende, sofern er nicht für das Folgeschuljahr aktiv bestätigt wird.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>10. Sofort-Widerruf im Schnuppermonat &amp; Vertragsbeendigung im Eltern-Dashboard</strong><br />
                  Während des kostenfreien Schnuppermonats können Eltern den Zugang mit 1 Klick im PIN-geschützten Elternbereich sofort und ohne Kosten widerrufen. Nach Durchführung der Kündigung bzw. des Widerrufs wird unverzüglich eine elektronische Kündigungsbestätigung (PDF) mit Zeitstempel und Aktenzeichen direkt zum Herunterladen und Ausdrucken bereitgestellt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>11. Digitale Netiquette, Jugendschutz &amp; Kindeswohl-Eskalation (§ 8a SGB VIII)</strong><br />
                  (1) Die plattforminterne Kommunikation (Direktnachrichten, Ensemble-Shouts) dient ausschließlich dem didaktischen Informationsaustausch rund um Fachunterricht, Üben und Proben. Beleidigende, diskriminierende, jugendgefährdende oder schulordnungswidrige Inhalte sind streng untersagt. Bei schwerwiegenden Verstößen kann die Schulleitung den internen Nachrichtenversand für das betreffende Profil temporär deaktivieren.<br />
                  (2) <strong>Kinderschutz &amp; Verdachtsmeldungen:</strong> Bei Anhaltspunkten für Grenzverletzungen, Missbrauch oder Kindeswohlgefährdung können Hinweise vertraulich an <a href="mailto:kinderschutz@campus-groovelab.de" style={{ color: '#2563eb' }}>kinderschutz@campus-groovelab.de</a> gerichtet werden. Der Betreiber behält sich vor, im Benehmen mit der Schulleitung und den gesetzlichen Vertretern unverzüglich Schutzmaßnahmen zu ergreifen.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>12. Technischer Botenstatus, Unterrichtsabsagen &amp; Ausschluss formbedürftiger Erklärungen</strong><br />
                  (1) <strong>Elektronische Botenfunktion:</strong> Soweit Schüler oder Erziehungsberechtigte über Campus-Groovelab (insbesondere via Shoutbox, Terminkalender oder Direktnachricht) Unterrichtstermine absagen, alternative Terminvorschläge der Lehrkraft annehmen oder organisatorische Mitteilungen versenden, agiert die Plattform als reiner technischer Übermittlungsbote im Auftrag des Absenders.<br />
                  (2) <strong>Verhältnis zum Musikschul-Unterrichtsvertrag &amp; Fristen:</strong> Die über die Plattform übermittelten Absagen und Terminabstimmungen berühren die zwischen den Erziehungsberechtigten und der jeweiligen Musikschule vereinbarten Unterrichts-, Honorar- und Nachholregelungen nicht. Ob eine versäumte Stunde nachgeholt wird oder honorarpflichtig bleibt, richtet sich ausschließlich nach den Schul- und Entgeltordnungen der Musikschule. Das Absenden einer Nachricht in Campus-Groovelab begründet keine Befreiung von vertraglichen Zahlungs- oder Fristpflichten.<br />
                  (3) <strong>Ausschluss rechtsgeschäftlicher Hauptvertrags-Erklärungen:</strong> Rechtserhebliche Willenserklärungen, die den Bestand des Unterrichtsvertrags mit der Musikschule betreffen (insbesondere Kündigungen, Widerrufe des Unterrichtsvertrags oder formelle Mahnungen), können über Campus-Groovelab <strong>nicht</strong> wirksam erklärt werden. Derartige Erklärungen sind zwingend auf den von der Musikschule vorgegebenen Primärwegen (schriftlich oder per behördlicher E-Mail an das Sekretariat) zu übermitteln.<br />
                  (4) <strong>Datenschutzsensibilität bei Abwesenheitsgründen (Art. 9 DSGVO):</strong> Zur Wahrung des Schutzes sensibler Gesundheitsdaten Minderjähriger werden Nutzer gebeten, bei Absagen keine detaillierten medizinischen Diagnosen oder ärztlichen Attestinhalte in Freitextfelder einzugeben. Die Angabe der allgemeinen Kategorie („verhindert“) ist vollumfänglich ausreichend.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>13. Information zur Verbraucherstreitbeilegung (§ 36 VSBG)</strong><br />
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie unter <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>https://ec.europa.eu/consumers/odr</a> finden. Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>14. Salvatorische Erhaltungsklausel (§ 306 Abs. 2 BGB)</strong><br />
                  Sollten einzelne Bestimmungen dieser Plattform-Nutzungsbedingungen unwirksam oder undurchführbar sein, so bleibt die Gültigkeit der übrigen Bestimmungen hiervon unberührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung gelten die gesetzlichen Vorschriften.
                </div>
              </div>
            </div>
          )}

          {/* ── AUFTRAGSVERARBEITUNGSVERTRAG (AVV / ART. 28 DSGVO) ── */}
          {activeTab === 'avv' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-avv" 
              aria-labelledby="legal-tab-avv" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '3px 12px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Art. 28 DSGVO &amp; Schweizer nDSG • Behördenstandard
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Vereinbarung zur Auftragsverarbeitung (AVV)
              </h4>
              <p style={{ margin: '-10px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                Behördentauglicher Stand-Alone Vertrag nach Art. 28 Abs. 3 DSGVO für Musikschulen, kommunale Träger und Datenschutzbeauftragte inklusive vollständiger Technisch-Organisatorischer Maßnahmen (TOMs).
              </p>

              {/* 0,1% Executive Summary Card: AVV auf einen Blick */}
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📑</span>
                  <span>B2B-Auftragsverarbeitung &amp; Compliance-Garantie (Auf einen Blick)</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '100px' }}>Art. 28 DSGVO</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🏛️</span>
                      <span>Behördentauglicher Vertrag</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Vollständiger Stand-Alone AVV gem. Art. 28 Abs. 3 DSGVO und Schweizer nDSG für kommunale Schulträger und behördliche DSBs.
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔐</span>
                      <span>Kryptografische TOMs</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Vollständige Dokumentation der technischen &amp; organisatorischen Maßnahmen: AES-256, Row-Level Security, FIDO2/WebAuthn Passkeys.
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚖️</span>
                      <span>Strikte Weisungsbindung</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5 }}>
                      Die Musikschule bleibt alleinige Herrin der Daten. Keine unbefugte Weitergabe, keine Drittlands-Übermittlung, Zero Vendor Lock-in.
                    </p>
                  </div>
                </div>
              </div>

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
                <div>
                  <strong style={{ color: '#0f172a' }}>1. Präambel, Gegenstand, Subsidiarität &amp; Herrenberg-Immunität</strong><br />
                  (1) Dieser Vertrag konkretisiert die datenschutzrechtlichen Rechte und Pflichten der Parteien im Rahmen der Nutzung der cloudbasierten Schulmanagement- und didaktischen Übeplattform <strong>Campus-Groovelab</strong>.<br />
                  (2) <strong>Rollenverteilung &amp; Schweizer nDSG-Parität:</strong> Die Musikschule bzw. der Schulträger ist und bleibt datenschutzrechtlich die alleinige <strong>Verantwortliche</strong> (Art. 4 Nr. 7 DSGVO / Art. 5 lit. j nDSG). Der Betreiber Patrick Huber (Einzelunternehmen) handelt ausschließlich als weisungsgebundener <strong>Auftragsverarbeiter</strong> bzw. <strong>Auftragsbearbeiter</strong> (Art. 28 DSGVO / Art. 9 nDSG). Die Parteien vereinbaren für den Geltungsbereich der Schweiz, dass der Begriff „personenbezogene Daten“ als „Personendaten“ (Art. 5 lit. a nDSG) und „Auftragsverarbeiter“ als „Auftragsbearbeiter“ (Art. 9 nDSG) zu verstehen ist.<br />
                  (3) <strong>Didaktische Subsidiaritäts-Doktrin („Fast-Track“):</strong> Campus-Groovelab fungiert als didaktisches Begleit- und Beschleunigungswerkzeug. Die Plattform ersetzt weder das amtliche kommunale Schulverwaltungssystem (ERP wie iMikel, MSVplus oder Musikschul-Manager) noch die primären städtischen Kommunikationswege. Sämtliche Termin- und Raumdispositionen erfolgen technisch rein im Botenauftrag der Beteiligten und entfalten keine rechtsgestaltende Bindungswirkung für den Schulbetrieb.<br />
                  (4) <strong>Herrenberg-Immunität (BSG B 12 R 3/20 R) &amp; Dozentenautonomie:</strong> Stundenplan-, Raum- und Terminbelegungsfunktionen stellen unverbindliche didaktische Dispositionsvorschläge dar. Lehrkräften (insbesondere freien Honorarkräften) steht es vollkommen frei, Stundenpläne oder Terminverschiebungen digital über Campus-Groovelab zu disponieren oder auf herkömmlichem Weg (per E-Mail, Telefon oder Zettel) an die Schulverwaltung zu übermitteln. Die Plattform begründet kein Weisungsverhältnis, keine Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / LPVG) und keinen Eingriff in die organisatorische Selbstständigkeit freier Mitarbeiter.<br />
                  (5) Die Laufzeit dieser Vereinbarung entspricht der Laufzeit des Hauptvertrages über die Plattformbereitstellung.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Weisungsbefugnis des Auftraggebers (Art. 28 Abs. 3 lit. a DSGVO / Art. 9 nDSG)</strong><br />
                  (1) Der Auftragnehmer verarbeitet Personendaten ausschließlich auf dokumentierte Weisung des Auftraggebers. Die Weisungen werden anfänglich durch den Hauptvertrag festgelegt und können vom Auftraggeber nachträglich in Textform geändert oder ergänzt werden.<br />
                  (2) Ist der Auftragnehmer der Ansicht, dass eine Weisung gegen die DSGVO, das Schweizer nDSG oder andere einschlägige Datenschutzvorschriften verstößt, weist er den Auftraggeber unverzüglich darauf hin.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Verpflichtung auf das Datengeheimnis, Serverstandort &amp; Schweizer Angemessenheit</strong><br />
                  (1) Der Auftragnehmer gewährleistet, dass sich die zur Verarbeitung der Daten befugten Personen schriftlich zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen.<br />
                  (2) Sämtliche Daten werden zu 100 % auf Servern in ISO/IEC 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein &amp; Nürnberg) verarbeitet. Ein Transfer in unsichere Drittstaaten (insbesondere USA) findet nicht statt (0 % US-Cloud-Doktrin / Immunität gegen US CLOUD Act und FISA 702). Für Auftraggeber aus der Schweizerischen Eidgenossenschaft erfolgt die grenzüberschreitende Bekanntgabe der Personendaten nach Deutschland auf Grundlage des verbindlichen Angemessenheitsbeschlusses des Bundesrates gemäss Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 der Datenschutzverordnung (DSV).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO / Art. 8 nDSG &amp; BSI IT-Grundschutz)</strong><br />
                  (1) Der Auftragnehmer trifft alle nach Art. 32 DSGVO und Art. 8 nDSG erforderlichen technischen und organisatorischen Maßnahmen (TOMs), um ein dem Risiko für die Rechte und Freiheiten der betroffenen Personen angemessenes Schutzniveau zu gewährleisten.<br />
                  (2) Die konkret vereinbarten Maßnahmen ergeben sich aus <strong>Anlage 2</strong> zu diesem Vertrag. Der Auftragnehmer behält sich vor, Sicherheitsmaßnahmen an den Stand der Technik anzupassen, sofern das vereinbarte Schutzniveau nicht unterschritten wird.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. Unterauftragsverhältnisse &amp; Zero-User-Mail Benachrichtigungsweg (Art. 28 Abs. 3 lit. d DSGVO)</strong><br />
                  (1) Der Auftraggeber erteilt seine allgemeine Genehmigung zur Hinzuziehung von Unterauftragsverarbeitern. Genehmigt ist der Einsatz der <strong>Hetzner Online GmbH</strong>, Industriestr. 25, 91710 Gunzenhausen, Deutschland (Serverstandorte: Falkenstein/Vogtland und Nürnberg; ISO/IEC 27001 zertifiziert).<br />
                  (2) Der Auftragnehmer informiert den Auftraggeber mindestens vierzehn (14) Tage im Voraus über jede beabsichtigte Hinzuziehung oder Ersetzung von Unterauftragsverarbeitern. In Übereinstimmung mit dem 100 % Zero-User-Mail-Axiom erfolgt diese Benachrichtigung per Textform an die offizielle institutionelle Schul-E-Mail (<code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>schools.email</code> / <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>schools.billing_email</code>) bzw. über das autoritative Broadcast-Center im Schulleitungs-Cockpit. Dem Auftraggeber steht ein Widerspruchsrecht aus wichtigem datenschutzrechtlichem Grund zu.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Unterstützungspflichten, Vorfallsmeldung &amp; DPO-Behördenkoffer (Art. 28 Abs. 3 lit. e &amp; f DSGVO)</strong><br />
                  (1) <strong>Betroffenenrechte:</strong> Der Auftragnehmer unterstützt den Auftraggeber mit geeigneten technischen und organisatorischen Maßnahmen (u. a. über das integrierte DPO- &amp; Audit-Portal sowie DSGVO-Dossier-Exporte mit SHA-256 Siegel) bei der Erfüllung der Betroffenenrechte (Art. 12–22 DSGVO / Art. 25–29 nDSG).<br />
                  (2) <strong>Meldung von Datenschutzverletzungen:</strong> Der Auftragnehmer meldet dem Auftraggeber Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens binnen <strong>24 bis maximal 48 Stunden</strong> nach Bekanntwerden, sodass dem Auftraggeber ausreichender Puffer zur Erfüllung der gesetzlichen Meldepflichten (72h gem. Art. 33 DSGVO bzw. „so rasch als möglich“ an den EDÖB gem. Art. 24 nDSG) verbleibt.<br />
                  (3) <strong>Datenschutz-Folgenabschätzungen &amp; Behördenkoffer:</strong> Der Auftragnehmer unterstützt den Auftraggeber bei der Einhaltung der Art. 32–36 DSGVO durch schlüsselfertige Bereitstellung des kommunalen DPO-Compliance-Dossiers (VVT gem. Art. 30 DSGVO, DSFA-Schwellwertprüfung gem. Art. 35 DSGVO, Personalrats-Attest gem. § 87 BetrVG).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. Löschung, DIN 66398 &amp; Dynamischer Schuljahres-Purge (Art. 17 &amp; 28 Abs. 3 lit. g DSGVO)</strong><br />
                  (1) Nach Beendigung der Verarbeitungsleistungen löscht der Auftragnehmer alle Daten nach Ablauf einer 30-tägigen Karenzfrist für den Datenexport unwiederbringlich nach DIN 66398.<br />
                  (2) <strong>Didaktische Audio-Retention &amp; Schuljahres-Purge (Migration 454):</strong> Temporäre Übe- und Hausaufgabenaufnahmen verbleiben für die Dauer des laufenden Schuljahres und werden am Monatsletzten des ersten Monats des individuellen Schuljahres der Musikschule automatisiert bereinigt, nachdem Erziehungsberechtigten eine einmonatige Exportfrist gem. Art. 20 DSGVO gewährt wurde.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>8. Nachweis-, Inspektions- &amp; Schulträgerrechte (Art. 28 Abs. 3 lit. h DSGVO)</strong><br />
                  Der Auftragnehmer stellt dem Auftraggeber sowie den zuständigen behördlichen Datenschutzbeauftragten (bDSB) kreisfreier Städte, Landkreise oder Schulverbände alle erforderlichen Nachweise zur Verfügung. Vor-Ort-Inspektionen werden nach angemessener Vorankündigung (in der Regel mindestens 14 Werktage) während der üblichen Betriebszeiten unter Wahrung von Betriebs- und Geschäftsgeheimnissen ermöglicht.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>9. Technischer Support-Fernzugriff („Ghost Support“) &amp; WORM-Revisionssicherheit</strong><br />
                  (1) Ein administrativer Support-Zugriff auf den Mandanten des Auftraggebers („Ghost Support / Session Leasing“) erfolgt ausschließlich weisungsgebunden auf Veranlassung der Schulleitung zur Störungsbehebung.<br />
                  (2) Der Zugriff ist zeitlich auf einen rollenden 15-Minuten-Lease begrenzt. Das Auslesen persönlicher Schüler-Chats oder vertraulicher Notizen außerhalb des Diagnosekontexts ist technisch und organisatorisch untersagt.<br />
                  (3) Jeder administrative Fernzugriff wird kryptografisch versiegelt im WORM-Audit-Trail (<code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>master_audit_trail</code>) protokolliert und für mindestens zwölf (12) Monate zur Einsichtnahme durch den Datenschutzbeauftragten der Schule vorgehalten.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>10. Haftung, Freistellung im Innenverhältnis (Hold-Harmless) &amp; Beweislast (Art. 82 DSGVO / Art. 54 nDSG)</strong><br />
                  (1) Die Parteien haften gegenüber betroffenen Personen nach den gesetzlichen Bestimmungen des Art. 82 DSGVO bzw. Art. 54 nDSG.<br />
                  (2) Im Innenverhältnis haftet der Auftragnehmer gegenüber dem Auftraggeber ausschließlich für Schäden, die auf einer schuldhaften Pflichtverletzung gegen die ihm nach Art. 28 DSGVO spezifisch auferlegten Pflichten oder der Nichtbeachtung rechtmäßiger Weisungen beruhen.<br />
                  (3) <strong>Vollständige Freistellung bei Rechtsgrundlagen-Fehlern (Hold-Harmless):</strong> Der Auftraggeber stellt den Auftragnehmer im Innenverhältnis vollumfänglich von sämtlichen Ansprüchen Dritter (insbesondere von Schülern oder Erziehungsberechtigten) sowie von behördlichen Geldbußen, Verfahrens- und Rechtsverteidigungskosten frei, die daraus resultieren, dass der Auftraggeber Personendaten ohne wirksame Rechtsgrundlage (insbesondere ohne die gem. Art. 8 DSGVO / Art. 6 nDSG erforderliche elterliche Zustimmung) in das System eingepflegt oder unzulässige Weisungen erteilt hat.
                </div>

                {/* ANLAGE 1 */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '20px' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.90rem' }}>ANLAGE 1: Gegenstand, Art &amp; Zweck der Verarbeitung, Datenarten &amp; Betroffene</strong><br /><br />
                  <strong>1. Gegenstand &amp; Zweck:</strong> Bereitstellung einer mandantenisolierten Cloud-Plattform zur digitalen Unterrichtsorganisation, Stundenplanung, Raumverwaltung, didaktischen Übebegleitung (Loopstation, Meisterwerk-Protokoll) und Schulkommunikation.<br /><br />
                  <strong>2. Kategorien betroffener Personen:</strong><br />
                  • Schülerinnen und Schüler der Musikschule (Mindestalter 6 Jahre)<br />
                  • Erziehungsberechtigte von minderjährigen Schülerinnen und Schülern<br />
                  • Lehrkräfte und Dozenten (Festangestellte und freie Honorarkräfte)<br />
                  • Verwaltungsmitarbeiter und Schulleitungen<br /><br />
                  <strong>3. Kategorien von Personendaten:</strong><br />
                  • Lehrkräfte &amp; Verwaltung: Vorname, Nachname, Kürzel, Fächer-/Instrumentenzuordnung, Raum- und Stundenplanzuweisungen (strikt 100 % Zero-User-Mail; es werden ausnahmslos 0 personenbezogene E-Mail-Adressen natürlicher Personen auf dem Server gespeichert).<br />
                  • Schüler: Vorname, abgekürzter Nachname (z. B. „Max M.“), Geburtstag (Tag 1..31 zur Altersstufenberechnung; kein Geburtsmonat, kein Geburtsjahr), Instrumentenfach, Unterrichtszeit, Raum, stilisierter Musiker-Avatar.<br />
                  • Erziehungsberechtigte: Identifikator der Elternfreigabe, verschlüsselter Hash der Eltern-PIN, Quittierungszeitstempel für häusliches Üben.<br />
                  • Didaktische Daten: Übe-Zeiten, Gamification-XP, Level, Hausaufgaben-Notizen, temporäre didaktische Audioaufnahmen (Hausaufgaben- und Loopstation-Spuren im privaten Audio-Tresor).<br />
                  • Metadaten &amp; Logfiles: IP-Adresse (anonymisiert/gehasht), User-Agent, Sitzungs-Lease-ID, Audit-Logs für Sicherheitsereignisse.<br /><br />
                  <strong>4. Ausdrücklich ausgeschlossene Datenkategorien:</strong> Besondere Kategorien personenbezogener Daten gem. Art. 9 DSGVO / Art. 5 lit. c nDSG (insbesondere Gesundheitsdaten, Atteste, Diagnosen oder biometrische Erkennungsdaten), Bank-, SEPA- oder Kreditkartendaten von Schülern und Eltern sowie urheberrechtlich geschützte digitale Notenblätter (PDFs) und reale Porträtfotos von Schülern (strikte Zero-Photo-Doktrin mit 3D-Avataren).
                </div>

                {/* ANLAGE 2 */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '20px' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.90rem' }}>ANLAGE 2: Technisch-Organisatorische Maßnahmen (TOMs gem. Art. 32 DSGVO &amp; BSI IT-Grundschutz)</strong><br /><br />
                  <strong>1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO / Art. 8 nDSG):</strong><br />
                  • <em>Zutrittskontrolle:</em> Zertifiziertes Sicherheitskonzept der Hetzner Online GmbH (biometrische Vereinzelungsschleusen, 24/7-Kameraüberwachung, ISO/IEC 27001).<br />
                  • <em>Zugangskontrolle:</em> Authentifizierung über passwortlose FIDO2-Hardware-Passkeys (WebAuthn), kryptografische Schulausweis-Tokens und <strong>Bcrypt-gehashte PINs (10 Runden Blowfish gem. BSI TR-02102 / Migration 510)</strong> im isolierten Datenbankschema <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>private_auth.user_secrets</code>. Progressive Rate-Limiter (Dual-Key Lockout) gegen Brute-Force.<br />
                  • <em>Zugriffskontrolle:</em> Kernel-erzwungene PostgreSQL Row Level Security (RLS) mit Mandantentrennung auf Datenbankebene (<code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>school_id = get_current_user_school_id()</code>). Zero-Trust View-Maskierung sensibler Felder (<code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>public.users_view</code> liefert niemals Klartext-Geheimnisse).<br />
                  • <em>Trennungskontrolle:</em> Mandantenisolierte Datenspeicherung; rollenbasierte Autorisierungs-Gates (Admin, Teacher, Student).<br />
                  • <em>Pseudonymisierung &amp; Verschlüsselung:</em> Durchgehende TLS 1.3 Transportverschlüsselung mit Mozilla Observatory A+ Konformität; Ruhedatenverschlüsselung (AES-256); Ephemere signierte HMAC-Zugriffstokens (60s Gültigkeit) für Audio-Streams mit <strong>Zero-Heap-Buffering (HTTP 307 Redirects direkt zum Storage-Edge)</strong>.<br /><br />
                  <strong>2. Integrität (Art. 32 Abs. 1 lit. b DSGVO):</strong><br />
                  • <em>Weitergabekontrolle:</em> Kein unverschlüsselter Datentransport; Übertragungen erfolgen ausschließlich über HTTPS/WSS mit HSTS Preload.<br />
                  • <em>Eingabekontrolle:</em> Revisionssichere, manipulationsgeschützte Audit-Logs (<code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>public.audit_logs</code>) mit SHA-256 Merkle-Hash-Chaining nach GoBD- und OWASP ASVS Level 3-Standard.<br /><br />
                  <strong>3. Verfügbarkeit &amp; Belastbarkeit (Art. 32 Abs. 1 lit. b &amp; c DSGVO / BSI OPS.1.1.4 &amp; DER.4):</strong><br />
                  • <strong>Stündliche automatisierte Backups (0 * * * *) mit asymmetrischer Age X25519 Zero-Knowledge-Verschlüsselung</strong> und kryptografischem SHA-256 Siegel.<br />
                  • <strong>Georedundante Offsite-Replikation auf Hetzner Storage Box (Port 23)</strong> mit kontinuierlicher Restricted-Shell Vorab-Speicherplatzprüfung (Fail-Closed bei &gt;= 95 % Auslastung gem. SEC-77).<br />
                  • <strong>DSGVO Art. 17 WORM-Tombstone Reconciliation:</strong> Automatischer Abgleich gelöschter Datensätze bei Notfall-Restores gegen Zombie-Zustände.<br />
                  • Redundante Stromversorgung (USV/Diesel) und mehrfach redundante Netzanbindungen im Hetzner-Rechenzentrum Falkenstein &amp; Nürnberg.<br />
                  • Lokaler IndexedDB Audio-Tresor auf Endgeräten für 0ms Offline-Pufferung und Ausfallsicherheit.<br />
                  • RPO &lt;= 60 Minuten, RTO &lt;= 45 Minuten im Notfall-Runbook.<br /><br />
                  <strong>4. Verfahren zur regelmäßigen Überprüfung &amp; Bewertung (Art. 32 Abs. 1 lit. d DSGVO):</strong><br />
                  • Tägliche automatisierte Security Drift Guards, Secret-Leak-Scanner und Legal Compliance Guards in der CI/CD-Pipeline.<br />
                  • Wöchentliche B2B-Resilienz-Engine mit automatisiertem kryptografisch gesiegeltem Compliance-Dossier.<br />
                  • Dokumentierter Notfallwiederherstellungsplan (Disaster Recovery Plan) mit dokumentierten Wiederherstellungstests.
                </div>
              </div>
            </div>
          )}

          {/* ── SERVICE LEVEL AGREEMENT (SLA / B2B) ── */}
          {activeTab === 'sla' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-sla" 
              aria-labelledby="legal-tab-sla" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '3px 12px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  B2B Service Level Agreement • 99,5 % Verfügbarkeit
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Service Level Agreement (SLA) &amp; Verfügbarkeitsgarantie
              </h4>
              <p style={{ margin: '-10px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                Verbindliche Qualitätsstandards, Störungsklassen P1–P4, garantierte Reaktionszeiten und beitragsfreies Gratismonate-Kompensationsmodell für Musikschulen.
              </p>

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
                <div>
                  <strong style={{ color: '#0f172a' }}>1. Geltungsbereich &amp; Ausschluss von Rechten Dritter (§ 328 BGB)</strong><br />
                  (1) Dieses Service Level Agreement (nachfolgend „SLA“) regelt die technische Verfügbarkeit und den Support der Cloud-Infrastruktur von <strong>Campus-Groovelab</strong> im B2B-Verhältnis zwischen dem Betreiber Patrick Huber (Einzelunternehmen) und der vertragschließenden Musikschule bzw. dem Träger (nachfolgend „Kunde“).<br />
                  (2) <strong>Ausschluss der Drittbegünstigung:</strong> Dieses SLA entfaltet rechtliche Schutz- und Erfüllungswirkung ausschließlich zugunsten des vertragsschließenden Kunden. Die Einbeziehung Dritter in den Schutzbereich ist ausdrücklich abbedungen (§ 328 BGB). Endnutzer – insbesondere Lehrkräfte, Honorardozenten, Schülerinnen und Schüler sowie Erziehungsberechtigte – erwerben aus diesem SLA keine eigenen Primär-, Erfüllungs-, Minderungs- oder Schadensersatzansprüche gegen den Betreiber.<br />
                  (3) <strong>Subsidiaritäts- &amp; Redundanzdoktrin:</strong> Campus-Groovelab ist ein didaktisches Add-On. Der primäre Unterrichtsbetrieb der Musikschule sowie das Bereithalten von Unterrichtsräumen und Instrumenten sind vom Betrieb der Cloud-Plattform unabhängig. Ein Ausfall des Systems begründet keinen Anspruch auf Erstattung von Lehrkräftehonoraren, Unterrichtsausfallentschädigungen oder Schülerkursgebühren (§ 254 BGB).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Verfügbarkeitszusage &amp; Messmethode</strong><br />
                  (1) Der Betreiber gewährleistet eine <strong>Verfügbarkeit der Cloud-Plattform am Übergabepunkt der Server- und Datenbankinfrastruktur des Rechenzentrums an das öffentliche Internet von mindestens 99,5 % im jeweiligen Kalendermonat</strong>.<br />
                  (2) <strong>Berechnungsformel:</strong> Die Verfügbarkeitsquote berechnet sich nach folgender Formel auf Basis von 24 Stunden an allen Tagen des Kalendermonats:<br />
                  <code style={{ display: 'block', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '0.80rem', margin: '6px 0', border: '1px solid #e2e8f0' }}>
                    Verfügbarkeit (%) = [(Gesamtzeit - Wartungszeiten - Ausfallzeit) / (Gesamtzeit - Wartungszeiten)] × 100
                  </code>
                  (3) Die Plattform gilt als verfügbar, wenn autorisierte Nutzer auf die Kernfunktionen (Authentifizierung, Datenbank-RPCs und Hauptnavigation) über das Internet zugreifen können. Reine Latenzerhöhungen im Millisekundenbereich stellen keine Nichtverfügbarkeit dar.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Wartungsfenster &amp; Notfall-Sicherheits-Patches</strong><br />
                  (1) <strong>Planmäßige Wartung:</strong> Erforderliche Wartungsarbeiten (Infrastruktur-Upgrades, Betriebssystem-Patches, Datenbankoptimierungen) finden vorzugsweise außerhalb der Kernunterrichtszeiten statt (werktags zwischen 22:00 Uhr und 06:00 Uhr MEZ sowie an Sonn- und bundeseinheitlichen Feiertagen). Sie werden mindestens 48 Stunden im Voraus über das System-Banner im Schul-Dashboard oder an die offizielle Kontaktadresse der Schule (<code>schools.email</code>) angekündigt und dürfen ein Gesamtkontingent von 12 Stunden im Kalendermonat nicht überschreiten.<br />
                  (2) <strong>Dringende Notfall-Wartung:</strong> Unaufschiebbare Notfallmaßnahmen zur Abwehr akuter Cyber-Angriffe, zur Schließung kritischer Sicherheitslücken (Zero-Day-Exploits) oder zur Abwendung schwerer Datenverluste können ohne Einhaltung einer Vorankündigungsfrist durchgeführt werden. Der Betreiber informiert den Kunden hierüber unverzüglich.<br />
                  (3) Zeiten ordnungsgemäßer planmäßiger oder unaufschiebbarer Notfall-Wartungsfenster gelten nicht als Ausfallzeiten und bleiben bei der Berechnung der Verfügbarkeitsquote unberücksichtigt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Störungsklassen &amp; Support-Reaktionszeiten</strong><br />
                  Meldungen über technische Beeinträchtigungen werden während der regulären Supportzeiten (Werktage Mo–Fr 08:30–17:30 Uhr MEZ) nach folgendem Schema priorisiert:<br /><br />
                  • <strong>Priorität 1 (Kritisch – Gesamtausfall):</strong> Kernsysteme (Login, Datenbank) sind für alle oder die Mehrheit der Nutzer unbenutzbar.<br />
                  &nbsp;&nbsp;➔ <em>Ziel-Reaktionszeit (Beginn der Entstörung):</em> <strong>&lt; 2 Stunden</strong> (außerhalb der Supportzeit max. 4 Stunden).<br />
                  &nbsp;&nbsp;➔ <em>Angestrebter Workaround / Wiederherstellung:</em> <strong>&lt; 8 Stunden</strong>.<br /><br />
                  • <strong>Priorität 2 (Hoch – Wesentliche Teilsysteme beeinträchtigt):</strong> Wichtige Module (z. B. Stundenplaner, Audio-Engine oder Raumverwaltung) weisen erhebliche Störungen auf; Basisbetrieb bleibt möglich.<br />
                  &nbsp;&nbsp;➔ <em>Ziel-Reaktionszeit:</em> <strong>&lt; 4 Stunden</strong>.<br />
                  &nbsp;&nbsp;➔ <em>Angestrebte Fehlerbehebung:</em> <strong>&lt; 24 Stunden</strong>.<br /><br />
                  • <strong>Priorität 3 (Mittel – Isolierte Komfortfunktionen):</strong> Einzelne didaktische Komfortfunktionen (z. B. Gamification-XP, Avatar-Upload, Sticker-Animationen) sind gestört; Unterrichts- und Verwaltungsbetrieb gesichert.<br />
                  &nbsp;&nbsp;➔ <em>Ziel-Reaktionszeit:</em> <strong>&lt; 8 Stunden</strong>.<br />
                  &nbsp;&nbsp;➔ <em>Behebung:</em> Im regulären Releasezyklus.<br /><br />
                  • <strong>Priorität 4 (Niedrig – Allgemeine Anfragen):</strong> Allgemeine Support-, Bedien- oder Konfigurationsfragen.<br />
                  &nbsp;&nbsp;➔ <em>Ziel-Reaktionszeit:</em> <strong>&lt; 24 Stunden</strong>.<br /><br />
                  <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                    <em>Hinweis: Bei den angegebenen Reaktions- und Behebungszeiten handelt es sich um qualifizierte Serviceziele (Best-Effort), nicht um verschuldensunabhängige Fristgarantien.</em>
                  </span>
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. Kompensation: Das beitragsfreie Gratismonate-Modell</strong><br />
                  (1) Unterschreitet der Betreiber die garantierte Mindestverfügbarkeit von 99,5 % in einem Kalendermonat aus von ihm zu vertretenden Gründen, erhält der Kunde als pauschalierte Entschädigung und Minderung beitragsfreie Verlängerungsmonate (<strong>„Gratismonate“</strong>) auf die monatliche Hosting-Basispauschale:<br /><br />
                  • <strong>99,00 % bis 99,49 % Verfügbarkeit</strong> (Ausfall &gt; 3,6 Std.): <strong>1 Gratismonat</strong> (folgender Monat 100 % beitragsfrei)<br />
                  • <strong>98,00 % bis 98,99 % Verfügbarkeit</strong> (Ausfall &gt; 7,2 Std.): <strong>2 Gratismonate</strong> (die nächsten 2 Monate beitragsfrei)<br />
                  • <strong>95,00 % bis 97,99 % Verfügbarkeit</strong> (Ausfall &gt; 14,4 Std.): <strong>3 Gratismonate</strong> (Folgequartal beitragsfrei)<br />
                  • <strong>Unter 95,00 % Verfügbarkeit</strong> (Ausfall &gt; 36,0 Std.): <strong>6 Gratismonate</strong> (Folgehalbjahr beitragsfrei)<br /><br />
                  (2) <strong>Strikte Bemessungsgrundlage:</strong> Die Gratismonate beziehen sich ausschließlich auf die monatliche Netto-Hosting-Basispauschale der Musikschule (Campus 14,90 €, GrooveLab 9,90 € bzw. Kombi 19,90 €). Schüleraktivierungsgebühren, Pädagogenlizenzen und Entgelte Dritter sind von der Bemessungsgrundlage ausdrücklich ausgeschlossen.<br />
                  (3) <strong>Erfüllung &amp; Anrechnung:</strong> Bei monatlicher Zahlweise wird die Hosting-Basispauschale für die Folgemonate auf 0,00 € gesetzt. Bei jährlicher Vorauszahlung (mit Rabatt) werden die Gratismonate beitragsfrei an das vereinbarte Ende der bezahlten Schuljahresperiode angehängt, sodass sich der nächste Rechnungsstichtag entsprechend nach hinten verschiebt.<br />
                  (4) <strong>Barausschluss &amp; Verfall (No Cash Value):</strong> Gratismonate stellen eine reine Sachkompensation dar. Ein Anspruch auf Barauszahlung, Überweisung, Verrechnung mit Drittforderungen oder Konvertierung in Geld ist unwiderruflich ausgeschlossen. Bei Beendigung des Vertragsverhältnisses durch ordentliche Kündigung des Kunden verfallen noch nicht verbrauchte Gratismonate ersatzlos.<br />
                  (5) <strong>Antrags- und Nachweispflicht (Ausschlussfrist):</strong> Gratismonate werden nicht automatisch gewährt. Der Kunde hat die Unterschreitung innerhalb einer <strong>harten Ausschlussfrist von 30 Kalendertagen</strong> nach Ablauf des betroffenen Monats in Textform (über das Support-Ticket-System oder an die offizielle Support-Adresse) unter nachvollziehbarer Angabe der festgestellten Ausfallzeiten geltend zu machen. Nach Ablauf dieser Frist ist die Geltendmachung endgültig ausgeschlossen (DSGVO-konforme Log-Rotationsparität nach DIN 66398).<br />
                  (6) <strong>Abschließendes Rechtsmittel (Sole and Exclusive Remedy):</strong> Die Gewährung von Gratismonaten nach dieser Ziffer 5 füllt die Minderungsansprüche des Kunden wegen Verfügbarkeitsunterbrechungen nach § 536 BGB abschließend pauschalierend aus. Verschuldensunabhängige Schadensersatzansprüche sind insoweit abbedungen. Gesetzliche Ansprüche wegen Vorsatzes oder grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) sowie das Kündigungsrecht aus wichtigem Grund (§ 314 / § 543 BGB) bleiben unberührt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Ausschlüsse (Haftungsbefreiung)</strong><br />
                  Als Ausfallzeit gelten nicht Störungen, die zurückzuführen sind auf:  
                  (a) Höhere Gewalt, kriegerische Ereignisse, Arbeitskämpfe, Naturkatastrophen oder behördliche Anordnungen;  
                  (b) flächendeckende Störungen überregionaler Internet-Backbones, von Tier-1-Telekommunikationsprovidern oder DNS-Routing außerhalb des Hetzner-Rechenzentrums;  
                  (c) DDoS-Angriffe oder Cyber-Attacken, die trotz angemessener und dem Stand der Technik entsprechender Schutzmaßnahmen (wie Rate-Limiting und Fail2Ban) nicht abgewehrt werden konnten;  
                  (d) Ausfälle, die auf Fehlbedienungen, unzureichenden lokalen Bandbreiten, restriktiven Schul-Firewalls (z. B. Port-Sperren für WebSockets) oder veralteter Endgeräte-Hard-/Software auf Seiten des Kunden oder der Endnutzer beruhen.
                </div>
              </div>
            </div>
          )}

          {/* ── MUSTER-DATENSCHUTZINFORMATION NACH ART. 13 DSGVO FÜR MUSIKSCHULEN ── */}
          {activeTab === 'school_parent_info' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-school_parent_info" 
              aria-labelledby="legal-tab-school_parent_info" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '3px 12px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Muster für Musikschulen • Art. 13 DSGVO / Art. 19 nDSG
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Muster-Datenschutzinformation für Eltern &amp; Schüler
              </h4>
              <p style={{ margin: '-10px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                Ready-to-Use Vorlage zur Aushändigung durch die Musikschule an Erziehungsberechtigte und Schülerinnen/Schüler gemäß Art. 13 und 14 DSGVO.
              </p>

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
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '14px', fontSize: '0.82rem', color: '#475569' }}>
                  <strong>Hinweis für die Musikschulleitung / Datenschutzbeauftragte:</strong><br />
                  Dieses Musterdokument können Sie mit Ihren Einrichtungsdaten ergänzen und Ihren Schülerinnen, Schülern und Erziehungsberechtigten bei der Anmeldung oder beim ersten Login in gedruckter oder digitaler Form aushändigen. Es erfüllt vollumfänglich die Informationspflichten nach Art. 13 und 14 DSGVO (Deutschland/Österreich) sowie Art. 19 des Schweizer Datenschutzgesetzes (nDSG).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>1. Name und Kontaktdaten des Verantwortlichen</strong><br />
                  Verantwortliche Stelle im Sinne der DSGVO und des Schweizer nDSG ist:<br />
                  <strong>[Name Ihrer Musikschule / Trägerschaft]</strong><br />
                  [Straße, Hausnummer, PLZ, Ort]<br />
                  Telefon: [Telefonnummer] • E-Mail: [Offizielle E-Mail-Adresse der Musikschule]<br />
                  Vertreten durch die Schulleitung: [Name der Schulleitung]
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Kontaktdaten des Datenschutzbeauftragten</strong><br />
                  Unseren behördlichen/betrieblichen Datenschutzbeauftragten (DPO) erreichen Sie unter:<br />
                  <strong>[Name des Datenschutzbeauftragten / zuständige Stelle]</strong>, E-Mail: [datenschutz@musikschule-musterstadt.de]
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Zwecke und Rechtsgrundlagen der Datenverarbeitung</strong><br />
                  Wir nutzen die Schul-Cloud <strong>Campus-Groovelab</strong> ausschließlich zur didaktischen Begleitung und organisatorischen Abwicklung des Musikschulunterrichts:<br /><br />
                  • <strong>Unterrichtsorganisation &amp; Stundenplan:</strong> Bereitstellung von Raumbelegungsplänen, Unterrichtszeiten und Dozentenzuweisungen. Rechtsgrundlage ist <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> bzw. <strong>Art. 31 Abs. 2 lit. a nDSG</strong> (Erfüllung des Musikschul-Unterrichtsvertrags) bzw. das jeweilige Landes-Schulgesetz / die Musikschulsatzung für kommunale Träger.<br />
                  • <strong>Didaktisches Üben &amp; Hausaufgaben:</strong> Führung des digitalen Hausaufgabenhefts, Übe-Timer und Meisterwerk-Protokoll. Rechtsgrundlage ist <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> bzw. <strong>Art. 31 nDSG</strong>.<br />
                  • <strong>Didaktische Audioaufnahmen (Hausaufgaben/Loops):</strong> Freiwillige Tonaufnahmen im häuslichen Übestudio zur pädagogischen Rückmeldung mit der Lehrkraft. Rechtsgrundlage ist die freiwillige Einwilligung gemäß <strong>Art. 6 Abs. 1 lit. a i. V. m. Art. 8 DSGVO</strong> bzw. <strong>Art. 6 Abs. 6 nDSG</strong> (erteilt durch die Erziehungsberechtigten bei Minderjährigen unter 16 Jahren; ab 16 Jahren durch die Schüler selbst).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Strikte Datenminimierung, Zero-User-Mail &amp; Kryptografischer Identity Vault</strong><br />
                  Die Plattform arbeitet nach dem Grundsatz „Privacy by Design &amp; by Default“ (Art. 25 DSGVO / Art. 7 nDSG) und setzt strengste Schutzstandards für Minderjährige um:<br /><br />
                  • <strong>100 % Zero-User-Mail-Axiom:</strong> Weder Schüler noch Eltern besitzen eine E-Mail-Adresse auf dem Server. Das System speichert ausnahmslos <strong>0 personenbezogene E-Mail-Adressen natürlicher Personen</strong>. Die Anmeldung erfolgt passwortlos über einen kryptografischen Schulausweis-QR-Code und eine persönliche PIN.<br />
                  • <strong>Kryptografischer Identity Vault:</strong> Schülernamen werden im Ruhezustand (At-Rest) mit <strong>AES-256</strong> verschlüsselt gespeichert (Migration 514). In Übersichten und Lehransichten werden Namen standardmäßig pseudonymisiert als Vorname + Initiale (z. B. „Lukas M.“) dargestellt.<br />
                  • <strong>Strikte Zero-Photo-Doktrin:</strong> Reale Porträtfotos von Schülerinnen und Schülern werden im System weder zugelassen noch gespeichert. Stattdessen kommen stilisierte 3D-Musiker-Avatare zum Einsatz (KUG § 22).<br />
                  • <strong>Geburtstags-Maskierung:</strong> Für didaktische Altersstufen und Kalenderfunktionen wird ausschließlich der Tag des Monats (Tag 1..31) verarbeitet – es wird weder der Geburtsmonat noch das Geburtsjahr gespeichert.<br />
                  • <strong>Keine Zahlungs- oder Bankdaten:</strong> In der Schüler- und Elternplattform werden niemals Bank-, SEPA- oder Kreditkartendaten erhoben.<br />
                  • <strong>Ausschluss von Gesundheitsdaten:</strong> Es werden keine medizinischen Daten, Atteste oder Diagnosen gem. Art. 9 DSGVO / Art. 5 lit. c nDSG verarbeitet; bei Krankheit oder Verhinderung genügt die neutrale Angabe „verhindert“.<br />
                  • <strong>Screenless Practice für Grundschulkinder:</strong> Für Kinder von 6 bis 9 Jahren (Junior-Level) verbleibt das Endgerät bei den Eltern (Üben am realen Instrument mit 1-Klick-Quittierung).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. Auftragsverarbeitung &amp; 100 % Rechenzentren in Deutschland (0 % US-Cloud)</strong><br />
                  Zur Bereitstellung der Software bedient sich die Musikschule des technischen Dienstleisters <strong>Patrick Huber – Campus-Groovelab Plattformbetrieb</strong> (Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland) als weisungsgebundenem Auftragsverarbeiter gemäß <strong>Art. 28 DSGVO</strong> bzw. <strong>Art. 9 nDSG</strong>.<br /><br />
                  • Sämtliche Daten werden ausschließlich in ISO/IEC 27001-zertifizierten deutschen Hochsicherheits-Rechenzentren der <strong>Hetzner Online GmbH</strong> (Falkenstein/Vogtland und Nürnberg) verarbeitet.<br />
                  • Es findet <strong>keinerlei Datenübermittlung in Drittstaaten</strong> außerhalb des EWR und insbesondere keine Übertragung an US-Cloud-Hyperscaler statt (vollständige Immunität gegen FISA 702 und US CLOUD Act).<br />
                  • Für Schweizer Musikschulen: Die Datenübermittlung von der Schweiz nach Deutschland ist durch den <strong>Angemessenheitsbeschluss des Schweizer Bundesrates</strong> (Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 DSV) vollumfänglich genehmigt und rechtlich gesichert.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Speicherdauer, DIN 66398 &amp; Autonomer Eltern-Lösch-Tresor</strong><br />
                  • <strong>Unterrichtsdaten:</strong> Personenbezogene Stamm- und Fortschrittsdaten bleiben für die Dauer des aktiven Unterrichtsverhältnisses an der Musikschule gespeichert.<br />
                  • <strong>Autonomer Eltern-Lösch-Tresor:</strong> Erziehungsberechtigte können im Einstellungsbereich des Elternportals alle didaktischen Sprach- und Audioaufnahmen ihres Kindes mit <strong>einem Klick sofort, unwiderruflich und ohne Genehmigung der Schule physisch vernichten</strong> (Migration 453).<br />
                  • <strong>Schuljahres-Purge &amp; DIN 66398 Löschkonzept:</strong> Didaktische Medienaufnahmen verfallen standardmäßig mit Ablauf des jeweiligen Schuljahres (31. August). Nach Beendigung des Musikschulvertrags werden alle verbleibenden Daten nach einer 30-tägigen Karenzfrist für den Datenexport endgültig und unwiederbringlich gelöscht.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. Ihre Rechte als betroffene Person (Art. 15–21 DSGVO &amp; Art. 25–29 nDSG)</strong><br />
                  Sie haben gegenüber der Musikschule jederzeit folgende gesetzliche Rechte:<br />
                  • <strong>Auskunftsrecht</strong> (Art. 15 DSGVO / Art. 25 nDSG) über die zu Ihrer Person bzw. Ihrem Kind verarbeiteten Daten.<br />
                  • <strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO / Art. 32 nDSG) unrichtiger oder unvollständiger Daten.<br />
                  • <strong>Recht auf Löschung</strong> (Art. 17 DSGVO / Art. 32 nDSG) („Recht auf Vergessenwerden“).<br />
                  • <strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO).<br />
                  • <strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO / Art. 28 nDSG) in einem strukturierten, maschinenlesbaren Format.<br />
                  • <strong>Widerspruchsrecht</strong> (Art. 21 DSGVO) gegen Verarbeitungen auf Basis berechtigter Interessen.<br />
                  • <strong>Widerrufsrecht bei Einwilligungen (Art. 7 Abs. 3 DSGVO):</strong> Freiwillig erteilte Einwilligungen (insbesondere in die Erstellung didaktischer Audioaufnahmen) können jederzeit mit Wirkung für die Zukunft formlos widerrufen oder direkt über den Eltern-Löschtresor gelöscht werden.<br />
                  • <strong>Beschwerderecht bei einer Aufsichtsbehörde:</strong> Sie haben das Recht auf Beschwerde bei der für den Sitz der Musikschule zuständigen Landesdatenschutzaufsichtsbehörde (in Deutschland) bzw. beim <strong>Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)</strong>, Feldeggweg 1, CH-3003 Bern (in der Schweiz) bzw. der <strong>Österreichischen Datenschutzbehörde (DSB)</strong> in Wien.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>8. Institutioneller Kinderschutz &amp; Digitales Vier-Augen-Prinzip (§ 8a SGB VIII)</strong><br />
                  Zum Schutz des Kindeswohls und zur Prävention digitaler Grenzverletzungen verpflichtet sich die Plattform folgenden Grundsätzen:<br /><br />
                  • <strong>Digitales Vier-Augen-Prinzip:</strong> Schulinterner Austausch zwischen Lehrkraft und Kind (Hausaufgabennotizen, didaktische Kommentare) ist für Erziehungsberechtigte im Elternbereich jederzeit transparent einsehbar.<br />
                  • <strong>Ausschluss privater Peer-to-Peer Chats:</strong> Auf Campus-Groovelab gibt es keine unüberwachten privaten 1:1-Chats zwischen minderjährigen Schülerinnen und Schülern untereinander.<br />
                  • <strong>Verbot privater Messenger-Dienste:</strong> Lehrkräfte sind angehalten, keine privaten Netzwerke (wie WhatsApp, Telegram oder Instagram) für den Musikunterricht einzusetzen, sondern ausschließlich die geschützte Schul-Cloud zu nutzen.
                </div>
              </div>
            </div>
          )}

          {/* ── KINDERSCHUTZ-LEITFADEN & NETIQUETTE (§ 8a SGB VIII) ── */}
          {activeTab === 'child_protection' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-child_protection" 
              aria-labelledby="legal-tab-child_protection" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#fdf2f8',
                  color: '#be185d',
                  border: '1px solid #fbcfe8',
                  padding: '3px 12px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Kinderschutz &amp; BKiSchG • § 8a SGB VIII / CH / AT
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Kinderschutz-Leitfaden, Vier-Augen-Prinzip &amp; Digitale Netiquette
              </h4>
              <p style={{ margin: '-10px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                Institutionelles Schutzkonzept zur Prävention digitaler Grenzverletzungen, Dozentenschutz und Wahrung des Kindeswohls im Musikschulalltag nach DACH-Standard.
              </p>

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
                <div>
                  <strong style={{ color: '#0f172a' }}>1. Präambel, Institutioneller Schutzauftrag &amp; DACH-Verfassungsrang</strong><br />
                  (1) Musikschulen und kulturelle Bildungseinrichtungen sind geschützte Bildungs- und Entfaltungsräume, an denen das seelische, geistige und körperliche Wohl von Kindern und Jugendlichen oberste Priorität besitzt. Die Plattform Campus-Groovelab wurde unter strikter Beachtung des Bundeskinderschutzgesetzes (BKiSchG), des § 8a SGB VIII (Schutzauftrag bei Kindeswohlgefährdung) sowie der verfassungsrechtlichen Kindesschutzgarantien in der Schweiz (Art. 11 Bundesverfassung / Art. 301 ZGB) und Österreich (§ 138 ABGB) konzipiert.<br />
                  (2) Digitale Lehr- und Lernwerkzeuge dürfen zu keinem Zeitpunkt zur Anbahnung unüberwachter, distanzloser oder grenzverletzender Kontakte missbraucht werden. Dieser Leitfaden ist verbindliche Geschäftsgrundlage für alle vertragsschließenden Musikschulen, Lehrkräfte, Honorardozenten und Administratoren.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Digitales Vier-Augen-Prinzip &amp; Dozentenschutz</strong><br />
                  (1) <strong>Schutz vor verdeckter Kommunikation:</strong> Um unüberwachte digitale Einzelkontakte zwischen erwachsenen Lehrkräften und minderjährigen Schülerinnen und Schülern auszuschließen, gilt in allen internen Kommunikationsmodulen (Campus Direct Messages, Hausaufgaben-Notizen) das digitale <strong>Vier-Augen-Prinzip</strong>.<br />
                  (2) <strong>Revisionssichere Eltern-Transparenz:</strong> Erziehungsberechtigte haben über den PIN-geschützten Elternbereich jederzeit vollen Einblick in den gesamten digitalen Nachrichten-, Aufgaben- und Feedbackverlauf ihres Kindes. Es existieren systemweit keine verdeckten, verschlüsselten Schüler-Lehrer-Sonderkanäle oder selbstlöschenden Nachrichten.<br />
                  (3) <strong>Dozentenschutz vor unberechtigten Verdachtsmomenten:</strong> Die lückenlose Nachvollziehbarkeit schützt Lehrkräfte vor falschen Verdächtigungen oder böswilligen Anschuldigungen. Lehrkräfte kommunizieren ausschließlich im sachlichen Kontext von Unterrichtsinhalten, Notenmaterial, Terminabsprachen und didaktischem Feedback.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Architektonische Kontaktsperre für private Peer-to-Peer Schüler-Chats</strong><br />
                  (1) <strong>Prävention von Cybermobbing und Belästigung:</strong> Zur wirksamen Vorbeugung von Cybermobbing, Ausgrenzung, Belästigung und unkontrollierten Gruppendynamiken unter Minderjährigen ist ein privater, unüberwachter Direkt-Chat zwischen Schülern untereinander serverseitig <strong>vollständig deaktiviert</strong>.<br />
                  (2) <strong>Moderierte Ensembleräume:</strong> Schülern steht Kommunikation mit Gleichaltrigen ausschließlich im Rahmen moderierter Band- und Kammermusik-Räume (Ensemble-Shoutbox) unter direkter pädagogischer Aufsicht der betreuenden Lehrkraft zur Verfügung.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Automatischer ChatRespectGuard &amp; Musikpädagogik-Whitelist</strong><br />
                  (1) <strong>Echtzeit-Prävention (Code-as-Policy):</strong> Interne Textnachrichten werden vor der Auslieferung durch den automatischen <code>chatRespectGuard</code> analysiert. Nachrichten mit beleidigenden, herabwürdigenden, bedrohenden oder diskriminierenden Inhalten werden blockiert und dem Verfasser mit einem didaktischen Reflexionshinweis zurückgewiesen.<br />
                  (2) <strong>Instrumentenpädagogische Fachbegriffs-Whitelist:</strong> Um Fehlblockaden im Musikunterricht auszuschließen, verfügt das Filtersystem über eine linguistische Whitelist für instrumentenspezifische Fachbegriffe (u. a. <em>„Fagott“</em>, <em>„Mundstück“</em>, <em>„Notenständer“</em>, <em>„Dämpfer“</em>, <em>„Blasen“</em>, <em>„Zupfen“</em>). Fachliche Korrespondenz bleibt vollumfänglich gewährleistet.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. KUG § 22 Zero-Photo-Doktrin &amp; UrhG § 73 Audio-TTL</strong><br />
                  (1) <strong>Zero-Photo-Doktrin (§ 22 KUG):</strong> Zum Schutz der visuellen Identität Minderjähriger und zur Vorbeugung von Bildnismissbrauch, Deepfakes oder Pädokriminalität werden auf der Plattform keine realen Porträtfotos von Schülerinnen und Schülern hochgeladen oder gespeichert. Die Schüler-Identität wird im System ausnahmslos durch stilisierte 3D-Canvas-Avatare visualisiert.<br />
                  (2) <strong>Audio-Speichergrenzen (UrhG § 73):</strong> Freiwillig erstellte Audioaufnahmen im Rahmen des häuslichen Übens dienen ausschließlich der pädagogischen Gehörbildung und Lernkontrolle. Sie unterliegen einer strikten Time-to-Live (TTL &le; 1800s bei Übe-Loops bzw. automatischem Verfall zum Schuljahresende) und können von Erziehungsberechtigten im Elternbereich jederzeit autonom gelöscht werden (DSGVO Art. 17).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Screenless Practice &amp; Didaktische Altersstufen-Governance</strong><br />
                  (1) <strong>Bildschirmfreies Üben für jüngere Kinder:</strong> Für Schülerinnen und Schüler im Grundschulalter (insbesondere 6 bis 9 Jahre, Junior-Modus) empfiehlt und unterstützt Campus-Groovelab das didaktische Konzept des <em>Screenless Practice</em>. Das Smartphone oder Tablet verbleibt bei den Erziehungsberechtigten; Übezeiten am echten Instrument werden über eine 1-Klick-Quittierung verbucht, ohne dass Kinder während des Musizierens auf Bildschirme schauen müssen.<br />
                  (2) <strong>Altersgerechte Stufen-Steuerung:</strong> Die Benutzeroberfläche passt sich der Entwicklungsstufe an (Junior, Teen, Pro) und kann von den Erziehungsberechtigten jederzeit im Elternbereich gesteuert und revisionssicher angepasst werden.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. Digitale Netiquette, DSA-Meldeverfahren &amp; DACH-Notrufketten</strong><br />
                  (1) <strong>Verhaltenskodex &amp; Dienstliche Kanalbindung:</strong> Lehrkräfte kontaktieren Schülerinnen und Schüler niemals über private Messengerdienste (WhatsApp, Signal, Telegram) oder private Social-Media-Accounts (TikTok, Instagram). Die Kommunikation beschränkt sich strikt auf die dokumentierten Schul-Tools.<br />
                  (2) <strong>Recht auf Nichterreichbarkeit (Quiet Hours):</strong> Zum Schutz der Dozierenden und Schüler gelten technische Ruhezeiten (werktags nach 20:00 Uhr sowie an Wochenenden). In diesen Zeiten werden Benachrichtigungen pausiert.<br />
                  (3) <strong>Elektronisches DSA-Meldeverfahren (Art. 16 DSA):</strong> Jeder Schüler und Erziehungsberechtigte kann auffällige Nachrichten oder Grenzverletzungen über einen integrierten Meldebutton mit 1 Klick vertraulich an die Schulleitung melden (<em>Notice and Action</em>).<br />
                  (4) <strong>Zentrale DACH-Krisen- und Notrufketten:</strong> Bei akuten Notlagen oder Verdacht auf Kindeswohlgefährdung stehen folgende offizielle Anlaufstellen kostenfrei und anonym zur Verfügung:<br /><br />
                  • <strong>Deutschland:</strong><br />
                  &nbsp;&nbsp;– Nummer gegen Kummer (Kinder- &amp; Jugendtelefon): <strong>116 111</strong> (kostenfrei &amp; anonym)<br />
                  &nbsp;&nbsp;– Elterntelefon: <strong>0800 111 0550</strong> (kostenfrei &amp; anonym)<br />
                  &nbsp;&nbsp;– Hilfeportal Sexueller Missbrauch: <strong>0800 22 55 530</strong><br />
                  • <strong>Schweiz:</strong><br />
                  &nbsp;&nbsp;– Pro Juventute (Notruf für Kinder &amp; Jugendliche): <strong>147</strong> (24/7 kostenfrei &amp; vertraulich)<br />
                  &nbsp;&nbsp;– Elternnotruf Schweiz: <strong>0848 35 45 55</strong> (24/7 Festnetztarif)<br />
                  &nbsp;&nbsp;– Kinderschutz Schweiz: <strong>058 822 99 20</strong><br />
                  • <strong>Österreich:</strong><br />
                  &nbsp;&nbsp;– Rat auf Draht (Notruf für Kinder &amp; Jugendliche): <strong>147</strong> (24/7 kostenfrei ohne Vorwahl)<br />
                  &nbsp;&nbsp;– Österreichische Kinderschutzzentren: <strong>0800 567 567</strong><br />
                  • <strong>Plattform-Meldekanal:</strong> Verdachtsmeldungen können jederzeit vertraulich an den Betreiber gerichtet werden:<br />
                  &nbsp;&nbsp;E-Mail: <a href="mailto:kinderschutz@campus-groovelab.de" style={{ color: '#be185d', fontWeight: 700 }}>kinderschutz@campus-groovelab.de</a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-cancellation" 
              aria-labelledby="legal-tab-cancellation" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '18px', outline: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '3px 12px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Verbraucherschutz • § 312g BGB / FAGG / OR
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Widerrufsbelehrung &amp; Muster-Widerrufsformular (DACH-Standard)
              </h4>
              <p style={{ margin: '-10px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                Gesetzliche Verbraucherinformationen für Deutschland, Österreich und die Schweiz bei Schüler-Direktabrechnung (Modell B).
              </p>

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
                {/* 1. Geltungsbereich */}
                <div>
                  <strong style={{ color: '#0f172a' }}>1. Geltungsbereich &amp; Ausschluss im B2B-Verhältnis</strong><br />
                  (1) <strong>Ausschließlicher Verbraucher-Geltungsbereich:</strong> Dieses Widerrufsrecht gilt ausnahmslos für natürliche Personen, die als Erziehungsberechtigte oder volljährige Schülerinnen und Schüler ein Rechtsgeschäft zu Zwecken abschließen, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB / § 1 österr. KSchG; Modell B: Schüler-Direktabrechnung).<br />
                  (2) <strong>B2B-Ausschluss:</strong> Für Schulträger, Musikschulen, Vereine, Gebietskörperschaften und sonstige Unternehmer (§ 14 BGB), die Plattform-Infrastrukturverträge (Modell A: Träger-Sammelabrechnung) abschließen, ist ein gesetzliches Widerrufsrecht ausgeschlossen.
                </div>

                {/* 2. Widerrufsbelehrung */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                  <strong style={{ color: '#1e40af', fontSize: '0.92rem' }}>2. Gesetzliche Widerrufsbelehrung (Deutschland &amp; Österreich)</strong><br />
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', lineHeight: 1.6, color: '#334155' }}>
                    <strong>Widerrufsrecht:</strong> Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen (in Österreich: vom Vertrag zurückzutreten).<br />
                    <strong>Widerrufsfrist:</strong> Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses (Freischaltung des erweiterten Campus-Profils).
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', lineHeight: 1.6, color: '#334155' }}>
                    <strong>Ausübung des Widerrufs:</strong> Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:<br />
                    <span style={{ display: 'block', margin: '6px 0', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a' }}>
                      <strong>Patrick Huber – Campus-Groovelab Plattformbetrieb</strong><br />
                      Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland<br />
                      E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700 }}>kontakt@campus-groovelab.de</a>
                    </span>
                    mittels einer eindeutigen Erklärung über Ihren Entschluss informieren. Die Ausübung kann wahlweise erfolgen:
                  </p>
                  <ul style={{ margin: '6px 0', paddingLeft: '20px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.6 }}>
                    <li><strong>Elektronische 1-Klick-Widerrufsfunktion:</strong> Direkt über den PIN-geschützten Elternbereich in den Kontoeinstellungen der Web-App (schnellster und papierloser Weg).</li>
                    <li><strong>In Textform:</strong> Per E-Mail oder Brief unter Verwendung des untenstehenden Muster-Widerrufsformulars (unter zwingender Angabe der Musikschule sowie der Schülernummer / Campus-ID).</li>
                  </ul>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                    <strong>Fristwahrung:</strong> Zur Wahrung der Frist reicht es aus, dass Sie die Mitteilung vor Ablauf der 14-tägigen Frist absenden.
                  </p>
                </div>

                {/* 3. Folgen des Widerrufs */}
                <div>
                  <strong style={{ color: '#0f172a' }}>3. Folgen des Widerrufs, Kostenfreier Probemonat &amp; Sanfter Fallback</strong><br />
                  (1) <strong>Rückzahlung empfangener Zahlungen:</strong> Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab Eingang der Widerrufserklärung zurückzuzahlen. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen Entgelte berechnet.<br />
                  (2) <strong>Vollständiger Wertersatz-Ausschluss (0,00 €):</strong> Da die Bereitstellung des Dienstes im ersten Monat (September bzw. 30-tägige Kennenlernphase) vollständig kostenfrei erfolgt und der Betreiber vor Ablauf der Widerrufsfrist keine vorzeitigen Zahlungen einzieht, schulden Sie im Falle eines Widerrufs während der Probezeit <strong>keinerlei Wertersatz oder Nutzungsentschädigung (§ 357a Abs. 2 BGB / § 16 FAGG)</strong>.<br />
                  (3) <strong>Pädagogische Kontinuität &amp; Sanfter Fallback:</strong> Mit Wirksamwerden des Widerrufs erlischt lediglich der Zugang zu den kostenpflichtigen Zusatzfunktionen des Campus-Moduls (interaktiver Übe-Timer, Loopstation, Audio-Aufnahme-Tresor). Das Schülerprofil wird <strong>nicht gelöscht</strong>, sondern fällt nahtlos und dauerhaft auf die von der Musikschule getragene <strong>Basis-Bereitstellung</strong> (0,09 € Basistarif; digitaler Schulausweis, Stundenplan- &amp; Kalendereinsicht) zurück.
                </div>

                {/* 4. DACH Regelungen */}
                <div>
                  <strong style={{ color: '#0f172a' }}>4. Besondere Regelungen für die Schweiz &amp; Österreich</strong><br />
                  (1) <strong>Freiwillige Widerrufsgarantie Schweiz (OR):</strong> Da das Schweizer Recht (Obligationenrecht) kein gesetzliches Widerrufsrecht für im Fernabsatz geschlossene digitale Dienstleistungsverträge vorsieht, gewährt der Betreiber Nutzerinnen und Nutzern mit Wohnsitz in der Schweiz dieses 14-tägige Widerrufsrecht auf <strong>freiwilliger vertraglicher Basis im identischen Umfang</strong>.<br />
                  (2) <strong>Österreichisches Rücktrittsrecht (FAGG):</strong> Für Verbraucher in Österreich gilt diese Belehrung zugleich als rechtswirksame Rücktrittsbelehrung gemäß § 11 i. V. m. § 4 Abs. 1 Z 8 Fern- und Auswärtsgeschäfte-Gesetz (FAGG).
                </div>

                {/* 5. Befristungsgarantie */}
                <div>
                  <strong style={{ color: '#0f172a' }}>5. Befristungsgarantie: Keine automatische Verlängerung (Ausschluss von Dauerschuld-Abofallen)</strong><br />
                  Zur Klarstellung wird vereinbart: Bei der Schüler-Direktabrechnung handelt es sich um einen <strong>befristeten Einmal-Jahresbeitrag für das jeweilige Schuljahr</strong> (maximal 5,39 € in DE/AT bzw. CHF 11.00 in CH), der mit Ablauf des jeweiligen Schuljahres (31. August) <strong>automatisch und ohne Kündigungserfordernis endet</strong>. Es findet zu keinem Zeitpunkt eine automatische Verlängerung oder Umwandlung in ein monatliches Abonnement im Sinne des § 309 Nr. 9 BGB oder des Gesetzes für faire Verbraucherverträge statt.
                </div>

                {/* 6. Muster-Widerrufsformular */}
                <div>
                  <strong style={{ color: '#0f172a' }}>6. Muster-Widerrufsformular</strong><br />
                  <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 8px 0' }}>
                    (Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück – oder nutzen Sie die bequeme 1-Klick-Funktion im Elternportal.)
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    lineHeight: 1.8,
                    color: '#1e293b'
                  }}>
                    An:<br />
                    <strong>Patrick Huber – Campus-Groovelab Plattformbetrieb</strong><br />
                    Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland<br />
                    E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#15803d', fontWeight: 700 }}>kontakt@campus-groovelab.de</a><br /><br />
                    Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Bereitstellung des kostenpflichtigen Zugangs Campus-Groovelab (Modul Campus):<br /><br />
                    • <strong>Name der Musikschule / Träger:</strong> __________________________________________________<br />
                    • <strong>Campus-ID des Schülers (z. B. 001-S-0042, auf Schulausweis/QR):</strong> ___________________<br />
                    • <strong>Name des Schülers / Kindes:</strong> ____________________________________________________<br />
                    • <strong>Name des/der Erziehungsberechtigten:</strong> ___________________________________________<br />
                    • <strong>Anschrift des/der Erziehungsberechtigten:</strong> ________________________________________<br />
                    • <strong>Freigeschaltet am (*):</strong> ___________________________________________________________<br />
                    • <strong>Datum des Widerrufs:</strong> ___________________________________________________________<br /><br />
                    _________________________________________________________________________________<br />
                    <em>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</em><br /><br />
                    (*) Unzutreffendes streichen.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div 
              role="tabpanel" 
              id="legal-tabpanel-accessibility" 
              aria-labelledby="legal-tab-accessibility" 
              tabIndex={0} 
              style={{ display: 'flex', flexDirection: 'column', gap: '20px', outline: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800 }}>
                    BITV 2.0 • DIN EN 301 549 V3.2.1 • BFSG 2025
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700 }}>
                    WCAG 2.2 Stufe AA
                  </span>
                  <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700 }}>
                    Inklusion &amp; Multi-Sensorik
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.10rem', fontWeight: 900, color: '#0f172a' }}>
                  Erklärung zur digitalen Barrierefreiheit
                </h4>
                <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.5 }}>
                  Konformität nach BITV 2.0, DIN EN 301 549 V3.2.1, BFSG 2025 und WCAG 2.2 Stufe AA gemäß Richtlinien (EU) 2016/2102 und (EU) 2019/882
                </p>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <strong style={{ color: '#0f172a' }}>1. Unser Inklusions-Leitbild &amp; Geltungsbereich:</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                  (1) <strong>Campus-Groovelab</strong> (Diensteanbieter: Patrick Huber) verpflichtet sich zu digitaler Barrierefreiheit und gelebter Inklusion im Musikschulwesen. Ziel ist es, allen Schülerinnen, Schülern, Eltern und Lehrkräften unabhängig von sensorischen, motorischen oder kognitiven Beeinträchtigungen einen gleichberechtigten und intuitiven Zugang zu zeitgemäßer Musikbildung und Schulorganisation zu ermöglichen.<br />
                  (2) <strong>Geltungsbereich &amp; Freiwillige Enterprise-Garantie:</strong> Diese Erklärung gilt für die gesamte Web- und PWA-Plattform Campus-Groovelab. Für den B2C-Eltern-Checkout (Schüler-Direktabrechnung) gilt das <strong>Barrierefreiheitsstärkungsgesetz (BFSG 2025 zur Umsetzung der Richtlinie (EU) 2019/882 / European Accessibility Act)</strong> uneingeschränkt. Die Plattform <strong>verzichtet ausdrücklich auf die Inanspruchnahme von Kleinstunternehmer-Ausnahmen (§ 3 Abs. 2 BFSG)</strong>, um Schulträgern und öffentlichen Auftraggebern maximale Rechtssicherheit bei Vergaben nach § 12d BGG und den Landes-Behindertengleichstellungsgesetzen (L-BGG) zu garantieren.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>2. Stand der Vereinbarkeit mit den Anforderungen:</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                  (1) Diese Webanwendung ist wegen der nachfolgend aufgeführten fachlich-didaktischen Ausnahmen <strong>teilweise vereinbar</strong> mit den Anforderungen der harmonisierten europäischen Norm <strong>EN 301 549 V3.2.1</strong> sowie den <strong>Web Content Accessibility Guidelines (WCAG) 2.2 auf Konformitätsstufe AA</strong> gem. Durchführungsbeschluss (EU) 2018/1523.<br />
                  (2) <strong>Prüfmethodik &amp; Nachweis:</strong> Die Bewertung basiert auf kontinuierlichen automatisierten AST- und Kontrast-Audits (<code>scripts/legal_compliance_guard.mjs</code>, <code>scripts/zero_overlap_guard.mjs</code>, 0 Drift-Violations gem. WCAG 1.4.3), statischer Code-Analyse der WAI-ARIA DOM-Hierarchien sowie regelmäßigen manuellen Bedienprüfungen mit assistiven Technologien (Apple VoiceOver, NVDA, Tastaturnavigation).
                </p>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                  3. Umgesetzte Barrierefreiheits-Maßnahmen im System:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  <li>
                    <strong>Tastatur-Vollbedienbarkeit &amp; 2-Klick-Parität (WCAG 2.1.1):</strong> Sämtliche Interaktionen (Login, QR-Ausweise, Aufgabenverwaltung, Loopstation, Navigation) sind vollständig ohne Maus steuerbar. Im Stundenplan-Designer ermöglicht die 2-Klick-Zuweisung die motorisch barrierefreie Planung per Tastatur (WCAG 2.5.7).
                  </li>
                  <li>
                    <strong>Sichtbare Apple HIG Tastatur-Fokusringe (WCAG 2.4.7):</strong> Fokussierte Elemente erhalten systemweit einen sichtbaren, modul-farblich abgestimmten Fokusring mit starkem Kontrastabstand.
                  </li>
                  <li>
                    <strong>Focus Not Obscured (WCAG 2.4.11 / 2.4.12):</strong> Feste Leisten (Header, Bottom-Tab-Bar) verdecken niemals den Tastaturfokus; alle Scroll-Container garantieren dynamische Clearance.
                  </li>
                  <li>
                    <strong>Standardisierte Farbkontraste &amp; KPI-Schutz (WCAG 1.4.3):</strong> Alle Texte erfüllen mindestens das Kontrastverhältnis von 4,5 : 1 auf hellem Hintergrund (WCAG AA). Modul- und KPI-Hintergründe (GrooveLab-Gelb, Campus-Grün, Admin-Rot) bleiben unberührt; Kontraste werden über dunkle Schriften (Slate 900, &gt; 12:1 Kontrast) gesichert.
                  </li>
                  <li>
                    <strong>Screenreader Live-Announcements (WCAG 4.1.3):</strong> Zeitkritische Statusänderungen (Speichern, PIN-Verifikation, Tauschvorgänge, Fehler) werden über ARIA-Live-Regionen transparent angesagt.
                  </li>
                  <li>
                    <strong>WAI-ARIA Dialog- &amp; Tab-Architektur (WCAG 1.3.1 / 4.1.2):</strong> Lückenlose Trias aus <code>role="tablist"</code>, <code>role="tab"</code> und <code>role="tabpanel"</code>; Modale besitzen <code>role="dialog"</code>, <code>aria-modal="true"</code> und Escape-Listener.
                  </li>
                  <li>
                    <strong>Sprungmarken (Skip-Links, WCAG 2.4.1):</strong> Tastaturnutzer können über den initialen Skip-Link (<em>„Zum Hauptinhalt springen“</em>) Navigationsleisten direkt überspringen.
                  </li>
                </ul>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                  4. Multi-Sensorische Musik-Inklusion (Inklusive Fachdidaktik):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Für hörbeeinträchtigte Schülerinnen und Schüler:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                      <li><strong>Optisches Metronom:</strong> Dynamischer Farbumschlag mit Smaragd-Impuls auf Takt 1 unterstützt das visuelle Timing beim Musizieren.</li>
                      <li><strong>Haptische Rhythmus-Vibration:</strong> Unterstützte Mobilgeräte übertragen den rhythmischen Beat über die Web Vibration API (<code>navigator.vibrate</code>), wodurch Taktschläge taktil spürbar werden.</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Für sehbeeinträchtigte Schülerinnen und Schüler:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                      <li><strong>WAI-ARIA Audio-Slider:</strong> Audio-Wellenformen sind mit Slider-Semantik ausgestattet (<code>role="slider"</code>, <code>aria-valuetext</code> in Takten und Minuten) und können per Pfeiltasten schrittweise (±5s oder taktweise) navigiert werden.</li>
                      <li><strong>Akustischer Einzähler (Count-In):</strong> Ein 4-Klick-Vorzähler kündigt den Wiedergabe- und Aufnahmestart verlässlich auditiv an.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>5. Nicht barrierefreie Inhalte &amp; gesetzliche Ausnahmen (§ 16 BFSG / § 12a Abs. 6 BGG):</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                  Trotz unseres hohen Inklusionsanspruchs bestehen bei einer musikalischen Kreativ-, Recording- und Gehörbildungsplattform fachlich und technisch begründete Ausnahmen:
                </p>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  <li>
                    <strong>Auditive Echtzeit-Inhalte &amp; Gehörbildung:</strong> Musikpädagogische Mehrspur-Aufnahmen (Loopstation, Band-Arrangements, Tonhöhenerkennung) basieren naturgemäß auf akustischen Schwingungen. Eine vollständige textuelle Echtzeit-Ersatzdarstellung musikalischer Klangereignisse würde die Wesensart des Dienstes grundlegend verändern und stellt eine <strong>unverhältnismäßige Belastung nach § 16 Abs. 1 Nr. 1 BFSG bzw. § 12a Abs. 6 BGG</strong> dar. Visuelle Taktzähler und optische Frequenz-Pegel bieten bestmögliche sensorische Unterstützung.
                  </li>
                  <li>
                    <strong>Nutzergenerierte Fremddokumente:</strong> Von Lehrkräften oder Schülern eigenverantwortlich erstellte Notizen, handschriftliche Skizzen oder historische Notenscans verfügen unter Umständen nicht über vollständige OCR-Textebenen (§ 12a Abs. 6 BGG).
                  </li>
                  <li>
                    <strong>Komplexe Gestensteuerungen:</strong> Für dynamische Fader- und Potentiometer-Gesten in der virtuellen Audiomischung existieren vereinfachte numerische Tastatur-Modi; eine vollständige Äquivalenz wird kontinuierlich weiter ausgebaut.
                  </li>
                </ul>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '20px' }}>
                <strong style={{ color: '#0f172a' }}>6. Feedback-Mechanismus &amp; Barrieren melden:</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                  Sind Ihnen Barrieren beim barrierefreien Zugang zu Inhalten von Campus-Groovelab aufgefallen oder haben Sie Hinweise zur digitalen Barrierefreiheit? Wir freuen uns über Ihre Rückmeldung:
                </p>
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.7 }}>
                  <strong>Ansprechpartner:</strong> Patrick Huber – Campus-Groovelab Plattformbetrieb<br />
                  <strong>E-Mail für Barrierefreiheits-Rückmeldungen:</strong> <a href="mailto:barrierefreiheit@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>barrierefreiheit@campus-groovelab.de</a> oder <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>kontakt@campus-groovelab.de</a><br />
                  <strong>Postanschrift:</strong> Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland<br />
                  <strong>Reaktionszeit:</strong> Wir bestätigen den Eingang Ihrer Meldung und beantworten Ihr Anliegen an Werktagen in der Regel <strong>innerhalb von 48 Stunden</strong>.
                </div>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>7. Durchsetzungsverfahren, Schlichtungsstellen &amp; Marktüberwachung:</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                  Sollten Sie auf Ihre Kontaktaufnahme über den Feedback-Mechanismus innerhalb von vier Wochen keine zufriedenstellende Antwort erhalten, stehen Ihnen je nach Trägerschaft und Land folgende gesetzliche Stellen zur Verfügung:
                </p>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                  <div>
                    <strong>A. Kommunale &amp; öffentliche Musikschulen (Deutschland – BGG / L-BGG):</strong><br />
                    Für öffentliche bzw. kommunale Musikschulen ist die Schlichtungsstelle nach dem jeweiligen Landes-Behindertengleichstellungsgesetz (L-BGG) zuständig (z. B. in Baden-Württemberg: <em>Schlichtungsstelle L-BGG beim Landes-Behindertenbeauftragten</em>, Else-Josenhans-Straße 6, 70173 Stuttgart, E-Mail: poststelle@bmb.bwl.de; in weiteren Bundesländern die jeweilige Landes-Schlichtungsstelle). Das Verfahren ist kostenfrei; ein Rechtsbeistand ist nicht erforderlich.
                  </div>
                  <div>
                    <strong>B. Privatwirtschaftliche Musikschulen &amp; Endverbraucher (Deutschland – BFSG 2025):</strong><br />
                    Im Anwendungsbereich des Barrierefreiheitsstärkungsgesetzes für privatwirtschaftliche Verträge (Schüler-Direktabrechnung) ist die für den Sitz des Betreibers zuständige <strong>Marktüberwachungsbehörde für Barrierefreiheit</strong> des jeweiligen Bundeslandes für die Durchsetzung zuständig.
                  </div>
                  <div>
                    <strong>C. Österreich (BGStG / Web-Zugänglichkeits-Gesetz WZG):</strong><br />
                    Für Beschwerden in Österreich ist die Ombudsstelle für Barrierefreiheit beim <strong>Sozialministeriumservice</strong> (Babenbergerstraße 5, 1010 Wien, post@sozialministeriumservice.at) zuständig.
                  </div>
                  <div>
                    <strong>D. Schweiz (BehiG &amp; eCH-0059 Standard):</strong><br />
                    In der Schweiz erfolgt die Durchsetzung über das <strong>Eidgenössische Büro für die Gleichstellung von Menschen mit Behinderungen (EBGB)</strong>, Inselgasse 1, CH-3003 Bern.
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                Diese Erklärung wurde am <strong>07. September 2026</strong> erstellt, am <strong>08. September 2026</strong> gutachterlich verifiziert und wird im Rahmen unseres Continuous-Compliance-Zyklus regelmäßig aktualisiert (Schuljahr 2026/2027).
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#475569' }}>
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
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
            >
              <Printer size={14} color="#475569" />
              Drucken / PDF
            </button>
            <button
              type="button"
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
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6, 0 2px 6px rgba(15, 23, 42, 0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.2)'; }}
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
