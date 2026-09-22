import React from 'react';
import { Landmark, Download } from 'lucide-react';

interface SepaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sepaCreditorId: string;
  setSepaCreditorId: (id: string) => void;
  sepaCollectionDate: string;
  setSepaCollectionDate: (date: string) => void;
  onExportSepaXml: () => void;
}

export const SepaExportModal: React.FC<SepaExportModalProps> = ({
  isOpen,
  onClose,
  sepaCreditorId,
  setSepaCreditorId,
  sepaCollectionDate,
  setSepaCollectionDate,
  onExportSepaXml
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
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark size={24} color="#ea4335" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              SEPA Direct Debit (pain.008.001.08)
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Gläubiger-ID (Creditor Identifier)
            </label>
            <input
              type="text"
              value={sepaCreditorId}
              onChange={(e) => setSepaCreditorId(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 800 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Gewünschtes Fälligkeitsdatum (min. 2 Tage Vorlauf)
            </label>
            <input
              type="date"
              value={sepaCollectionDate}
              onChange={(e) => setSepaCollectionDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onExportSepaXml}
            style={{ padding: '10px 20px', borderRadius: '10px', background: '#ea4335', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={16} /> SEPA XML herunterladen
          </button>
        </div>
      </div>
    </div>
  );
};
