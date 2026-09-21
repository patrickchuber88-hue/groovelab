import React from 'react';
import { UploadCloud } from 'lucide-react';

interface CamtUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDraggingBankFile: boolean;
  setIsDraggingBankFile: (isDragging: boolean) => void;
  bankFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleBankFileDrop: (e: React.DragEvent) => void;
  camtRawInput: string;
  setCamtRawInput: (val: string) => void;
  handleProcessBankStatement: (rawContent: string) => void;
  setActiveFinanceSubTab: (tab: any) => void;
}

export const CamtUploadModal: React.FC<CamtUploadModalProps> = ({
  isOpen,
  onClose,
  isDraggingBankFile,
  setIsDraggingBankFile,
  bankFileInputRef,
  handleBankFileDrop,
  camtRawInput,
  setCamtRawInput,
  handleProcessBankStatement,
  setActiveFinanceSubTab
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }} className="animate-fade-in">
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UploadCloud size={24} color="#ea4335" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              Bankkontoauszug (CAMT.053) importieren
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Quick File Drop or Paste */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingBankFile(true); }}
          onDragLeave={() => setIsDraggingBankFile(false)}
          onDrop={(e) => {
            handleBankFileDrop(e);
            onClose();
            setActiveFinanceSubTab('banking');
          }}
          onClick={() => bankFileInputRef.current?.click()}
          style={{
            border: isDraggingBankFile ? '2px dashed #ea4335' : '1.5px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '20px',
            background: isDraggingBankFile ? '#fff5f5' : '#f8fafc',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <UploadCloud size={28} color="#64748b" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
            CAMT.053 XML / CSV Datei hier hineinziehen oder klicken
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
            Unterstützt .xml, .camt, .csv und .mt940
          </div>
        </div>

        <textarea
          rows={5}
          value={camtRawInput}
          onChange={(e) => setCamtRawInput(e.target.value)}
          placeholder="Oder CAMT.053 XML-Code / CSV-Kontoauszug direkt hier einfügen..."
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!camtRawInput.trim()}
            onClick={() => {
              handleProcessBankStatement(camtRawInput);
              onClose();
              setActiveFinanceSubTab('banking');
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: camtRawInput.trim() ? '#ea4335' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              cursor: camtRawInput.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Analysieren &amp; zum Abgleich
          </button>
        </div>
      </div>
    </div>
  );
};
