import React from 'react';
import { UploadCloud, Landmark, Download, CheckCircle, Check } from 'lucide-react';
import { BankStatementParseResult } from '../../../utils/camtParser';

interface BankingSubTabProps {
  bankFileInputRef: React.RefObject<HTMLInputElement | null>;
  isDraggingBankFile: boolean;
  setIsDraggingBankFile: (val: boolean) => void;
  bankFileDetails: { name: string; size: string } | null;
  setBankFileDetails: (val: { name: string; size: string } | null) => void;
  showManualPaste: boolean;
  setShowManualPaste: (val: boolean) => void;
  camtRawInput: string;
  setCamtRawInput: (val: string) => void;
  camtParsedResult: BankStatementParseResult | null;
  setCamtParsedResult: (val: BankStatementParseResult | null) => void;
  camtApplying: boolean;
  sepaCreditorId: string;
  sepaCollectionDate: string;
  totalUnpaid: number;
  handleBankFileUpload: (file: File) => void;
  handleBankFileDrop: (e: React.DragEvent) => void;
  handleProcessBankStatement: (raw: string) => void;
  handleApplyCamtBookings: () => void;
  onExportSepaXml: () => void;
}

export const BankingSubTab: React.FC<BankingSubTabProps> = ({
  bankFileInputRef,
  isDraggingBankFile,
  setIsDraggingBankFile,
  bankFileDetails,
  setBankFileDetails,
  showManualPaste,
  setShowManualPaste,
  camtRawInput,
  setCamtRawInput,
  camtParsedResult,
  setCamtParsedResult,
  camtApplying,
  sepaCreditorId,
  sepaCollectionDate,
  totalUnpaid,
  handleBankFileUpload,
  handleBankFileDrop,
  handleProcessBankStatement,
  handleApplyCamtBookings,
  onExportSepaXml
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Ingestion & SEPA Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Box 1: CAMT.053 & MT940 Dropzone (Apple HIG) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UploadCloud size={22} color="#ea4335" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              Kontoauszug einlesen (CAMT.053 XML / MT940 / CSV)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Ziehen Sie Ihren Bankauszug direkt hinein oder fügen Sie den XML-/CSV-Inhalt ein für automatischen 2-Wege-Abgleich.
          </p>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={bankFileInputRef as any}
            onChange={(e) => {
              if (e.target.files?.[0]) handleBankFileUpload(e.target.files[0]);
            }}
            accept=".xml,.camt,.csv,.mt940,.txt"
            style={{ display: 'none' }}
          />

          {/* Native Apple HIG Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingBankFile(true); }}
            onDragLeave={() => setIsDraggingBankFile(false)}
            onDrop={handleBankFileDrop}
            onClick={() => bankFileInputRef.current?.click()}
            style={{
              border: isDraggingBankFile ? '2px dashed #ea4335' : '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '24px',
              background: isDraggingBankFile ? '#fff5f5' : '#f8fafc',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
            className="hover-scale-mini"
          >
            <UploadCloud size={32} color={isDraggingBankFile ? '#ea4335' : '#64748b'} />
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              {bankFileDetails ? `Geladene Datei: ${bankFileDetails.name}` : 'Kontoauszug hier hineinziehen oder klicken'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {bankFileDetails ? `Dateigröße: ${bankFileDetails.size} • Klick zum Austauschen` : 'Unterstützt CAMT.053 XML, MT940, CSV (ISO 20022)'}
            </div>
          </div>

          {/* Collapsible Manual Textarea */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowManualPaste(!showManualPaste)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {showManualPaste ? '▲ Text-Eingabefeld ausblenden' : '▼ Text / XML manuell einfügen'}
            </button>
            {bankFileDetails && (
              <button
                type="button"
                onClick={() => {
                  setBankFileDetails(null);
                  setCamtRawInput('');
                  setCamtParsedResult(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ✕ Datei zurücksetzen
              </button>
            )}
          </div>

          {showManualPaste && (
            <textarea
              rows={4}
              value={camtRawInput}
              onChange={(e) => setCamtRawInput(e.target.value)}
              placeholder="CAMT.053 XML-Code oder CSV-Kontoauszug hier einfügen..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.80rem',
                fontFamily: 'monospace',
                color: '#0f172a',
                outline: 'none'
              }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => {
                const sample = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <Stmt>
      <Id>STMT-2026-08</Id>
      <Ntry>
        <Amt Ccy="EUR">19.90</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-08-27</Dt></BookgDt>
        <NtryDtls><TxDtls><RmtInf><Ustrd>Campus-Groovelab RE-104-2608-01</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">5.39</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-08-27</Dt></BookgDt>
        <NtryDtls><TxDtls><RmtInf><Ustrd>Aktivierung CG-F63B8EDE-2608</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;
                setCamtRawInput(sample);
                setBankFileDetails({ name: 'demo-kontoauszug-camt053.xml', size: '0.9 KB' });
                handleProcessBankStatement(sample);
              }}
              style={{ background: 'transparent', border: 'none', color: '#ea4335', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
            >
              ⚡ Demo-Kontoauszug laden
            </button>

            <button
              type="button"
              disabled={!camtRawInput.trim()}
              onClick={() => handleProcessBankStatement(camtRawInput)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: camtRawInput.trim() ? '#ea4335' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: camtRawInput.trim() ? 'pointer' : 'not-allowed',
                boxShadow: camtRawInput.trim() ? '0 4px 12px rgba(234, 67, 53, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}
              className={camtRawInput.trim() ? 'hover-scale-mini' : ''}
            >
              Analysieren &amp; Abgleichen
            </button>
          </div>
        </div>

        {/* Box 2: SEPA Lastschrift XML Generator */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark size={22} color="#ea4335" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              SEPA-Lastschriften Batch (pain.008)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Generieren Sie eine ISO 20022 XML Datei für den automatisierten Lastschrifteinzug aller offenen Mandate bei Ihrer Hausbank.
          </p>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Gläubiger-ID (Creditor ID):</span>
              <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{sepaCreditorId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Einzugs-Ausführung:</span>
              <span style={{ fontWeight: 800, color: '#059669' }}>{sepaCollectionDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Offenes Lastschrift-Volumen:</span>
              <span style={{ fontWeight: 900, color: '#0f172a' }}>{totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onExportSepaXml}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ea4335 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(234, 67, 53, 0.22)'
            }}
            className="hover-scale-mini"
          >
            <Download size={16} /> SEPA XML (pain.008) erstellen &amp; herunterladen
          </button>
        </div>
      </div>

      {/* Statement Match Results */}
      {camtParsedResult && (
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 28px',
          border: '1.5px solid #0284c7',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={22} color="#059669" />
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                Ergebnis 2-Wege-Zahlungsabgleich ({camtParsedResult.statementId})
              </h4>
            </div>

            <button
              type="button"
              disabled={camtApplying}
              onClick={handleApplyCamtBookings}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: camtApplying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} /> {camtApplying ? 'Wird verbucht...' : 'Alle erkannten Zahlungen jetzt verbuchen'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>B2B Schulrechnungen</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#14532d', marginTop: '2px' }}>{camtParsedResult.b2bMatches.length} Treffer</strong>
            </div>
            <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>B2C Schüler-Aktivierungen</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#1e3a8a', marginTop: '2px' }}>{camtParsedResult.b2cMatches.length} Treffer</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gesamt-Gutschriften</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#0f172a', marginTop: '2px' }}>{camtParsedResult.totalCreditAmount.toFixed(2).replace('.', ',')} €</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
