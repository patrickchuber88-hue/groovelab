import React from 'react';
import { TrendingUp, Check } from 'lucide-react';

interface PricingImpactSimulationModalProps {
  isOpen: boolean;
  pricingImpactData: any;
  priceChangeScope: string;
  priceEffectiveDate?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const PricingImpactSimulationModal: React.FC<PricingImpactSimulationModalProps> = ({
  isOpen,
  pricingImpactData,
  priceChangeScope,
  priceEffectiveDate,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !pricingImpactData) return null;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: '#e0e7ff',
            color: '#4338ca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              Preisanpassungs-Simulation
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
              Überprüfen Sie die finanziellen Auswirkungen vor der Aktivierung.
            </p>
          </div>
        </div>

        {/* Impact Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.2fr',
          gap: '12px',
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>Aktueller MRR</span>
            <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{pricingImpactData.currentMrr.toFixed(2).replace('.', ',')} €</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>Prognostizierter MRR</span>
            <strong style={{ fontSize: '1.1rem', color: '#4338ca' }}>{pricingImpactData.projectedMrr.toFixed(2).replace('.', ',')} €</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>MRR-Veränderung</span>
            <strong style={{
              fontSize: '1.1rem',
              color: pricingImpactData.deltaMrr >= 0 ? '#16a34a' : '#dc2626'
            }}>
              {pricingImpactData.deltaMrr >= 0 ? `+${pricingImpactData.deltaMrr.toFixed(2).replace('.', ',')}` : `${pricingImpactData.deltaMrr.toFixed(2).replace('.', ',')}`} € / Mo.
            </strong>
          </div>
        </div>

        {/* Policy Info */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: priceChangeScope === 'new_only' ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${priceChangeScope === 'new_only' ? '#86efac' : '#fde68a'}`,
          fontSize: '0.80rem',
          color: priceChangeScope === 'new_only' ? '#166534' : '#92400e',
          lineHeight: 1.4
        }}>
          {priceChangeScope === 'new_only' ? (
            <span>
              🛡️ <strong>Bestandsschutz aktiv:</strong> Die neuen Tarife gelten ausschließlich für Neuregistrierungen. Bestehende Mandanten behalten dauerhaft ihren Altpreis.
            </span>
          ) : (
            <span>
              ⚠️ <strong>{pricingImpactData.affectedSchoolsCount} Bestands-Schulen betroffen:</strong> Die Tarife greifen für alle Schulen zum gewählten Stichtag ({priceEffectiveDate ? new Date(priceEffectiveDate).toLocaleDateString('de-DE') : 'sofort'}).
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#f1f5f9',
              border: 'none',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={16} /> Bestätigen &amp; Tarife speichern
          </button>
        </div>
      </div>
    </div>
  );
};
