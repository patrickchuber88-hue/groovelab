import React from 'react';
import { Award, Sparkles } from 'lucide-react';
import { resolveEffectiveBillingDate } from '../../../domain/schoolDunningEngine';
import type { School } from '../MasterAdminTypes';

interface SchoolDunningExtensionControlProps {
  school: School | null;
  dunningKulanzUntil: string;
  setDunningKulanzUntil: (until: string) => void;
}

export const SchoolDunningExtensionControl: React.FC<SchoolDunningExtensionControlProps> = ({
  school,
  dunningKulanzUntil,
  setDunningKulanzUntil
}) => {
  const effectiveNowMs = resolveEffectiveBillingDate().getTime();
  const isKulanzCurrentlyActive = Boolean(dunningKulanzUntil && new Date(dunningKulanzUntil).getTime() > effectiveNowMs);
  const rawTrustUntil = (school as any)?.dunning_trust_extension_until
    || (typeof window !== 'undefined' && school?.id ? localStorage.getItem(`groovelab_trust_token_school_${school.id}`) : null);
  const isTrustCurrentlyActive = Boolean(rawTrustUntil && new Date(rawTrustUntil).getTime() > effectiveNowMs);

  return (
    <>
      <div style={{
        padding: '14px 16px',
        borderRadius: '14px',
        background: isKulanzCurrentlyActive ? '#ecfdf5' : '#f8fafc',
        border: isKulanzCurrentlyActive ? 'none' : '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="#0f172a" />
            <span style={{ fontWeight: 850, fontSize: '0.86rem', color: '#0f172a' }}>
              Kulanzjoker (+30 Tage Stundung &amp; Erlass Verzugspauschale)
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
            {isKulanzCurrentlyActive
              ? `Aktiv bis ${new Date(dunningKulanzUntil).toLocaleDateString('de-DE')} – Verzugspauschale auf 0,00 € erlassen, Schreibsperren suspendiert.`
              : 'Gewährt der Schule per 1-Click sofort 30 zusätzliche Tage Zahlungsziel und erlässt etwaige Mahngebühren.'}
          </p>
        </div>

        {isKulanzCurrentlyActive ? (
          <button
            type="button"
            onClick={() => setDunningKulanzUntil('')}
            style={{ padding: '6px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Widerrufen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              const until = new Date(effectiveNowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
              setDunningKulanzUntil(until);
            }}
            style={{ padding: '6px 14px', borderRadius: '10px', background: '#0f172a', border: 'none', color: '#ffffff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={13} />
            <span>Joker ziehen (+30 T)</span>
          </button>
        )}
      </div>

      {rawTrustUntil && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '12px',
          background: isTrustCurrentlyActive ? '#f0fdf4' : '#f8fafc',
          border: 'none',
          fontSize: '0.74rem',
          color: isTrustCurrentlyActive ? '#15803d' : '#64748b',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>
            ⚡ 48h-Sofort-Freigabe (Sekretariat Self-Service): {isTrustCurrentlyActive ? 'AKTIV' : 'Ausgeschöpft'}
          </span>
          <span>
            bis {new Date(rawTrustUntil).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      )}
    </>
  );
};
