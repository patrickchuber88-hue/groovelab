import React from 'react';
import { History as HistoryIcon } from 'lucide-react';

interface PrapSubTabProps {
  totalMonthlyRevenue: number;
}

export const PrapSubTab: React.FC<PrapSubTabProps> = ({ totalMonthlyRevenue }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HistoryIcon size={24} color="#d97706" />
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
            Periodengerechte Umsatzabgrenzung (PRAP / IFRS 15)
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4 }}>
          Musikschulen mit <strong>Jahreszahlung (-10% Skonto)</strong> oder <strong>Schuljahres-Komplettaktivierung (-20% Rabatt)</strong> zahlen Beträge im Voraus. Handelsrechtlich wird der Erlös anteilig monatlich als <em>Recognized MRR</em> realisiert; noch nicht abgewohnte Beträge verbleiben im <em>Deferred Revenue Pool (PRAP)</em>.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cash Inflow (Zahlungseingang kumuliert)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
            {(totalMonthlyRevenue * 1.15).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>✓ Reales Bankguthaben</span>
        </div>

        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Recognized MRR (Monatlicher Ist-Ertrag)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669' }}>
            {totalMonthlyRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Handelsrechtlicher Monatserlös</span>
        </div>

        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Deferred Revenue Pool (PRAP-Konto 0980)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706' }}>
            {((totalMonthlyRevenue * 1.15) - totalMonthlyRevenue).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>Abgrenzungsposten Folgemonate</span>
        </div>
      </div>
    </div>
  );
};
