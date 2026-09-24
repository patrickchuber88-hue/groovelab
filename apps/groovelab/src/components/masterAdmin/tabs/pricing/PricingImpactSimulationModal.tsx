import React from 'react';
import { TrendingUp, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface PricingImpactSimulationModalProps {
  isOpen: boolean;
  pricingImpactData: any;
  priceChangeScope: string;
  priceEffectiveDate?: string;
  currency?: 'EUR' | 'CHF';
  onClose: () => void;
  onConfirm: () => void;
}

export const PricingImpactSimulationModal: React.FC<PricingImpactSimulationModalProps> = ({
  isOpen,
  pricingImpactData,
  priceChangeScope,
  priceEffectiveDate,
  currency = 'EUR',
  onClose,
  onConfirm
}) => {
  if (!isOpen || !pricingImpactData) return null;

  const isChf = currency === 'CHF';
  const sym = isChf ? 'CHF' : '€';
  const fmt = (n: number | string) => isChf ? `CHF ${Number(n).toFixed(2)}` : `${Number(n).toFixed(2).replace('.', ',')} €`;

  const isLifetimeProtected = priceChangeScope === 'new_only';

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
      <div role="dialog" aria-modal="true" aria-labelledby="pricing-simulation-title" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '580px',
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
            background: isLifetimeProtected ? '#f0fdf4' : '#e0e7ff',
            color: isLifetimeProtected ? '#16a34a' : '#4338ca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isLifetimeProtected ? <ShieldCheck size={26} /> : <TrendingUp size={24} />}
          </div>
          <div>
            <h3 id="pricing-simulation-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              Tarifprüfungs- &amp; Bestands-Simulation ({currency})
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
              Überprüfe die Auswirkungen vor der autoritativen Speicherung.
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
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>Aktueller {currency}-MRR</span>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{fmt(pricingImpactData.currentMrr)}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>Prognose (Bestand)</span>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{fmt(isLifetimeProtected ? pricingImpactData.currentMrr : pricingImpactData.projectedMrr)}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>Bestands-Veränderung</span>
            <strong style={{
              fontSize: '1.05rem',
              color: isLifetimeProtected ? '#16a34a' : (pricingImpactData.deltaMrr >= 0 ? '#16a34a' : '#dc2626')
            }}>
              {isLifetimeProtected ? `0,00 ${sym} (Geschützt)` : `${pricingImpactData.deltaMrr >= 0 ? '+' : ''}${fmt(pricingImpactData.deltaMrr)}`}
            </strong>
          </div>
        </div>

        {/* Lifetime Guarantee Banner */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '14px',
          background: isLifetimeProtected ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#fffbeb',
          border: `1.5px solid ${isLifetimeProtected ? '#86efac' : '#fde68a'}`,
          fontSize: '0.82rem',
          color: isLifetimeProtected ? '#14532d' : '#92400e',
          lineHeight: 1.5,
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          {isLifetimeProtected ? (
            <>
              <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>100% Lifetime-Bestandsschutz gewahrt:</strong> Die geänderten Tarife gelten ausschließlich als neuer Katalogpreis für zukünftige Neuregistrierungen. Sämtliche bestehenden Musikschulen behalten ihre vertraglichen Sockelpreise und Profilgebühren dauerhaft bei 0,00 {sym} Mehrkosten.
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Achtung: Mandantenweite Anpassung ({pricingImpactData.affectedSchoolsCount} Schulen betroffen):</strong> Erfordert nach AGB Ziffer 4 eine Frist von mindestens zwei Monaten zum neuen Schuljahr ({priceEffectiveDate ? new Date(priceEffectiveDate).toLocaleDateString('de-DE') : 'Stichtag'}) sowie eine formelle Belehrung über das Sonderkündigungsrecht.
              </div>
            </>
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
