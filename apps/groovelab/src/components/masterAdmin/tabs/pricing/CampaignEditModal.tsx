import React from 'react';

interface CampaignEditModalProps {
  editingOffer: any;
  onClose: () => void;
  onSave: (offer: any) => void;
  onChange: (offer: any) => void;
}

export const CampaignEditModal: React.FC<CampaignEditModalProps> = ({
  editingOffer,
  onClose,
  onSave,
  onChange
}) => {
  if (!editingOffer) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        padding: '28px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
            ✏️ Kampagne bearbeiten
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Aktionsname
            </label>
            <input
              type="text"
              value={editingOffer.name}
              onChange={(e) => onChange({ ...editingOffer, name: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.90rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Gutschein-Code
              </label>
              <input
                type="text"
                value={editingOffer.code || ''}
                onChange={(e) => onChange({ ...editingOffer, code: e.target.value.toUpperCase() })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.90rem', fontWeight: 800, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Rabatt (%)
              </label>
              <input
                type="number"
                value={editingOffer.discount_percent}
                onChange={(e) => onChange({ ...editingOffer, discount_percent: Number(e.target.value) })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.90rem', fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Laufzeit (Monate)
              </label>
              <select
                value={editingOffer.duration_months || 0}
                onChange={(e) => onChange({ ...editingOffer, duration_months: Number(e.target.value) })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <option value={3}>3 Monate</option>
                <option value={6}>6 Monate</option>
                <option value={12}>12 Monate</option>
                <option value={0}>Dauerhaft (Permanent)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Max. Einlösungen
              </label>
              <input
                type="number"
                placeholder="0 = Unbegrenzt"
                value={editingOffer.max_redemptions || ''}
                onChange={(e) => onChange({ ...editingOffer, max_redemptions: Number(e.target.value) })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Geltungsbereich
            </label>
            <select
              value={editingOffer.discount_scope || 'hosting_only'}
              onChange={(e) => onChange({ ...editingOffer, discount_scope: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <option value="hosting_only">🏢 Nur Server-Hosting Flatrates</option>
              <option value="total_invoice">🌐 Gesamtrechnung (inkl. Schüler/Lehrer)</option>
            </select>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.76rem', color: '#166534', lineHeight: 1.35 }}>
            🛡️ <strong>Bestandsschutz:</strong> Änderungen greifen für künftige Neuregistrierungen. Bereits eingelöste Schulen behalten ihre Konditionen.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onSave(editingOffer)}
            style={{ padding: '10px 20px', borderRadius: '10px', background: '#10b981', border: 'none', color: '#ffffff', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer' }}
          >
            Änderungen speichern
          </button>
        </div>
      </div>
    </div>
  );
};
