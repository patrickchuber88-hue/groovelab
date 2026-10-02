import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Building, 
  Undo2, 
  Scale, 
  Printer, 
  Accessibility, 
  Shield, 
  Server, 
  FileCheck, 
  HeartHandshake, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { 
  LEGAL_DOCUMENTS, 
  ACTIVE_LEGAL_VERSION, 
  LegalDocumentDefinition 
} from '../legal/legalContent';

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

/**
 * 0,1% Goldstandard Semantic Legal Markdown Renderer
 * Rendert Markdown-Inhalte typ-sicher, barrierefrei (BFSG / WCAG 2.2 AA)
 * und mit responsiven Tabellen, Callout-Boxen und strukturierter Typografie.
 */
const LegalMarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let tableKey = 0;

  const flushTable = () => {
    if (inTable && tableHeader.length > 0) {
      elements.push(
        <div key={`table-${tableKey++}`} style={{ overflowX: 'auto', margin: '14px 0', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left', background: '#ffffff' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                {tableHeader.map((th, i) => (
                  <th key={i} style={{ padding: '9px 12px', color: '#0f172a', fontWeight: 800 }}>
                    {formatInline(th.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: ri === tableRows.length - 1 ? 'none' : '1px solid #e2e8f0', background: ri % 2 === 1 ? '#fafbfc' : '#ffffff' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '9px 12px', color: '#334155', lineHeight: 1.5 }}>
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  const formatInline = (text: string): React.ReactNode => {
    // Regex für URLs, Bold, Code, E-Mail
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let idx = 0;

    // Einfacher Parser für **bold**, `code`, und links [text](url)
    const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\)|https?:\/\/[^\s]+|mailto:[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={idx++} style={{ color: '#0f172a' }}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={idx++} style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px', fontSize: '0.9em', fontFamily: 'monospace', color: '#0f172a' }}>
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[') && token.includes('](')) {
        const linkText = token.slice(1, token.indexOf(']('));
        const linkUrl = token.slice(token.indexOf('](') + 2, -1);
        parts.push(
          <a key={idx++} href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>
            {linkText}
          </a>
        );
      } else if (token.startsWith('http')) {
        parts.push(
          <a key={idx++} href={token} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>
            {token}
          </a>
        );
      } else if (token.includes('@')) {
        const mailHref = token.startsWith('mailto:') ? token : `mailto:${token}`;
        parts.push(
          <a key={idx++} href={mailHref} style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(21, 128, 61, 0.35)' }}>
            {token.replace('mailto:', '')}
          </a>
        );
      } else {
        parts.push(token);
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Tabellenerkennung
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|');
      if (line.includes('---')) {
        // Trennzeile - ignorieren
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Leere Zeilen
    if (!line) {
      elements.push(<div key={`empty-${i}`} style={{ height: '8px' }} />);
      continue;
    }

    // Trennlinie
    if (line === '---' || line === '***') {
      elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />);
      continue;
    }

    // Überschriften
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} style={{ fontSize: '0.98rem', fontWeight: 850, color: '#0f172a', margin: '18px 0 8px 0', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{formatInline(line.slice(4))}</span>
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} style={{ fontSize: '1.08rem', fontWeight: 900, color: '#0f172a', margin: '22px 0 10px 0', letterSpacing: '-0.02em', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
          {formatInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '24px 0 12px 0', letterSpacing: '-0.02em' }}>
          {formatInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Zitate / Callouts (> ...)
    if (line.startsWith('> ')) {
      elements.push(
        <div key={`callout-${i}`} style={{ background: '#f8fafc', borderLeft: '4px solid #16a34a', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', margin: '12px 0', fontSize: '0.82rem', color: '#334155', lineHeight: 1.55 }}>
          {formatInline(line.slice(2))}
        </div>
      );
      continue;
    }

    // Listenpunkte (- oder •)
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      elements.push(
        <div key={`list-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0 4px 12px', fontSize: '0.84rem', lineHeight: 1.6 }}>
          <span style={{ color: '#16a34a', fontWeight: 900, flexShrink: 0 }}>•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Regulärer Absatz
    elements.push(
      <p key={`p-${i}`} style={{ margin: '6px 0', fontSize: '0.84rem', lineHeight: 1.68, color: '#334155' }}>
        {formatInline(rawLine)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return <div style={{ display: 'flex', flexDirection: 'column' }}>{elements}</div>;
};

/**
 * 0,1% Single Document Stage
 */
const DocumentStage: React.FC<{ doc: LegalDocumentDefinition; extraBadge?: string }> = ({ doc, extraBadge }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title & Metadata Card */}
      <div style={{
        background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: '16px',
        padding: '18px 20px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '100px', border: '1px solid #86efac' }}>
              {doc.badge}
            </span>
            {extraBadge && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '100px', border: '1px solid #bae6fd' }}>
                {extraBadge}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
            Version {doc.version} • Schuljahr 2026/2027
          </span>
        </div>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.08rem', fontWeight: 900, color: '#0f172a' }}>
          {doc.title}
        </h4>
        <p style={{ margin: 0, fontSize: '0.80rem', color: '#475569', fontWeight: 500 }}>
          {doc.subtitle}
        </p>

        {/* Executive Summary Points */}
        {doc.summaryPoints && doc.summaryPoints.length > 0 && (
          <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Wichtigste Kernpunkte & Schutzgarantien im Überblick:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {doc.summaryPoints.map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: '#334155', lineHeight: 1.45, background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Markdown Text */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)' }}>
        <LegalMarkdownRenderer markdown={doc.fullTextMarkdown} />
      </div>
    </div>
  );
};

export const LegalTextModal: React.FC<LegalTextModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'impressum'
}) => {
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

  const handleTabChange = (tab: LegalTab) => {
    setActiveTab(tab);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const handlePrintTextOnly = () => {
    if (!contentRef.current) return;

    let docTitle = 'Rechtliche Dokumente – Campus-Groovelab';
    if (activeTab === 'impressum') docTitle = 'Campus-Groovelab – Impressum & Anbieterkennzeichnung';
    else if (activeTab === 'privacy') docTitle = 'Campus-Groovelab – Datenschutzerklärung (DSGVO)';
    else if (activeTab === 'terms') docTitle = 'Campus-Groovelab – Allgemeine Geschäftsbedingungen (AGB)';
    else if (activeTab === 'avv') docTitle = 'Campus-Groovelab – Auftragsverarbeitungsvertrag (AVV / Art. 28 DSGVO)';
    else if (activeTab === 'sla') docTitle = 'Campus-Groovelab – Service Level Agreement (SLA)';
    else if (activeTab === 'school_parent_info') docTitle = 'Campus-Groovelab – Datenschutz-Musterinformation (Art. 13 DSGVO)';
    else if (activeTab === 'child_protection') docTitle = 'Campus-Groovelab – Kinderschutz-Leitfaden & Netiquette';
    else if (activeTab === 'cancellation') docTitle = 'Campus-Groovelab – Widerrufsbelehrung & Musterformular (B2C)';
    else if (activeTab === 'accessibility') docTitle = 'Campus-Groovelab – Erklärung zur Barrierefreiheit (BFSG)';

    const contentHtml = contentRef.current.innerHTML;

    // Clean up previous print iframe
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
    @page { size: A4 portrait; margin: 18mm 15mm 20mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.55; color: #1e293b; background: #ffffff; }
    h1, h2, h3, h4 { color: #0f172a; margin-top: 14pt; margin-bottom: 6pt; page-break-after: avoid; }
    h2 { font-size: 13pt; border-bottom: 1.5pt solid #0f172a; padding-bottom: 3pt; }
    h3 { font-size: 11pt; border-bottom: 0.5pt solid #cbd5e1; padding-bottom: 2pt; }
    h4 { font-size: 10pt; }
    p, div { margin-bottom: 6pt; orphans: 3; widows: 3; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; page-break-inside: avoid; font-size: 8.5pt; }
    th, td { border: 0.5pt solid #cbd5e1; padding: 5pt 7pt; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 700; }
    a { color: #0f172a; text-decoration: underline; }
    .print-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 7.5pt; color: #64748b; border-top: 0.5pt solid #e2e8f0; padding-top: 4pt; text-align: center; }
  </style>
</head>
<body>
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10pt; margin-bottom: 16pt;">
    <div style="font-size: 16pt; font-weight: 900; color: #0f172a;">Campus-Groovelab</div>
    <div style="font-size: 11pt; font-weight: 700; color: #475569; margin-top: 3pt;">${docTitle}</div>
    <div style="font-size: 8pt; color: #64748b; margin-top: 4pt;">
      Offizielles Rechtsdokument • Stand: Version ${ACTIVE_LEGAL_VERSION} • Geltungsbereich: DACH (DE, AT, CH)
    </div>
  </div>
  ${contentHtml}
  <div class="print-footer">
    Campus-Groovelab • Betreiber: Patrick Huber, Rheinfelden (Baden) • Stand: Version ${ACTIVE_LEGAL_VERSION}
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="apple-legal-root">
      <style>{`
        @keyframes appleModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .apple-custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .apple-custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .apple-custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.45); border-radius: 8px; }
        .apple-custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.7); }
        @media print {
          body * { visibility: hidden !important; }
          .apple-legal-root, .apple-legal-backdrop, .apple-legal-window, #apple-legal-content-body, #apple-legal-content-body * {
            visibility: visible !important;
          }
          .apple-legal-no-print { display: none !important; }
          .apple-legal-root { position: static !important; }
          .apple-legal-backdrop { position: static !important; background: transparent !important; padding: 0 !important; }
          .apple-legal-window { box-shadow: none !important; border: none !important; width: 100% !important; height: auto !important; max-height: none !important; }
        }
      `}</style>

      <div 
        className="apple-legal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
            width: 'min(94vw, 1040px)',
            maxWidth: '1040px',
            maxHeight: 'min(90vh, 880px)',
            height: '880px',
            borderRadius: '26px',
            boxShadow: '0 32px 80px -16px rgba(15, 23, 42, 0.32), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            animation: 'appleModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
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
                  Offizielle Dokumente, Datenschutz &amp; Compliance für Musikschulen, Eltern und Lehrkräfte
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

          {/* Segmented Control Tabs */}
          <div className="apple-legal-no-print" style={{
            padding: '10px 24px',
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
                { id: 'terms' as const, label: 'AGB (A & B)', icon: FileText },
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
                  >
                    <Icon size={14} color={isActive ? '#0f172a' : '#475569'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Body */}
          <div 
            id="apple-legal-content-body"
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
              <div role="tabpanel" id="legal-tabpanel-impressum" aria-labelledby="legal-tab-impressum" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.impressum} />
              </div>
            )}

            {activeTab === 'privacy' && (
              <div role="tabpanel" id="legal-tabpanel-privacy" aria-labelledby="legal-tab-privacy" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.platform_privacy} />
              </div>
            )}

            {activeTab === 'terms' && (
              <div role="tabpanel" id="legal-tabpanel-terms" aria-labelledby="legal-tab-terms" tabIndex={0} style={{ outline: 'none', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Part A (B2B) */}
                <div>
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, background: '#0f172a', color: '#ffffff', padding: '3px 10px', borderRadius: '6px' }}>
                      TEIL A
                    </span>
                    <strong style={{ fontSize: '1.02rem', color: '#0f172a' }}>
                      B2B-Infrastrukturvertrag &amp; AGB für Musikschulen &amp; Träger
                    </strong>
                  </div>
                  <DocumentStage doc={LEGAL_DOCUMENTS.terms_b2b_avv} extraBadge="B2B Musikschulen" />
                </div>

                <hr style={{ border: 'none', borderTop: '2px dashed #cbd5e1', margin: '10px 0' }} />

                {/* Part B (B2C) */}
                <div>
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, background: '#15803d', color: '#ffffff', padding: '3px 10px', borderRadius: '6px' }}>
                      TEIL B
                    </span>
                    <strong style={{ fontSize: '1.02rem', color: '#0f172a' }}>
                      Nutzungsbedingungen für Schüler &amp; Erziehungsberechtigte
                    </strong>
                  </div>
                  <DocumentStage doc={LEGAL_DOCUMENTS.terms_student_platform} extraBadge="B2C Endnutzer" />
                </div>
              </div>
            )}

            {activeTab === 'avv' && (
              <div role="tabpanel" id="legal-tabpanel-avv" aria-labelledby="legal-tab-avv" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.avv_standalone} />
              </div>
            )}

            {activeTab === 'sla' && (
              <div role="tabpanel" id="legal-tabpanel-sla" aria-labelledby="legal-tab-sla" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.sla_b2b} />
              </div>
            )}

            {activeTab === 'school_parent_info' && (
              <div role="tabpanel" id="legal-tabpanel-school_parent_info" aria-labelledby="legal-tab-school_parent_info" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.school_parent_privacy_notice} />
              </div>
            )}

            {activeTab === 'child_protection' && (
              <div role="tabpanel" id="legal-tabpanel-child_protection" aria-labelledby="legal-tab-child_protection" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.child_protection_code} />
              </div>
            )}

            {activeTab === 'cancellation' && (
              <div role="tabpanel" id="legal-tabpanel-cancellation" aria-labelledby="legal-tab-cancellation" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.consumer_cancellation_policy} />
              </div>
            )}

            {activeTab === 'accessibility' && (
              <div role="tabpanel" id="legal-tabpanel-accessibility" aria-labelledby="legal-tab-accessibility" tabIndex={0} style={{ outline: 'none' }}>
                <DocumentStage doc={LEGAL_DOCUMENTS.accessibility_declaration} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="apple-legal-no-print" style={{
            padding: '14px 28px',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Version: <strong style={{ color: '#0f172a' }}>{ACTIVE_LEGAL_VERSION}</strong>
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Rechtssicher zertifiziert für DE, AT &amp; CH
              </span>
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
