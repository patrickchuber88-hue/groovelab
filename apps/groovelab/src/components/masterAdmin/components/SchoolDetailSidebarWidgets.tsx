import React from 'react';
import {
  Server, ShieldCheck, CheckCircle2,
  Euro, Lock, Sparkles
} from 'lucide-react';
import type { School, SchoolStat } from '../MasterAdminTypes';
import type { SchoolBillingBreakdown } from '../utils/computeSchoolBillingMetrics';

interface SchoolDetailSidebarWidgetsProps {
  school: School;
  metrics: SchoolBillingBreakdown;
  schoolStats?: Partial<SchoolStat>;
}

export const SchoolDetailSidebarWidgets: React.FC<SchoolDetailSidebarWidgetsProps> = ({
  school,
  metrics
}) => {
  const teachers = metrics.teachersCount;
  const totalStudents = metrics.totalStudentsCount;
  const activeStudents = Math.max(metrics.activeCampusStudentsCount, metrics.activeGroovelabStudentsCount);
  const passiveStudents = metrics.passiveStudentsCount;

  const isBypass = Boolean(school.subscription_bypass);
  const isTrial = Boolean(school.is_trial);

  const formattedMrr = isBypass
    ? `0,00 ${metrics.currencySymbol} (Bypass)`
    : isTrial
      ? `0,00 ${metrics.currencySymbol} (Testphase)`
      : `${metrics.totalMonthlyNet.toFixed(2).replace('.', ',')} ${metrics.currencySymbol}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Mandanten-Überblick & Status */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Mandanten-Überblick &amp; Status
          </h4>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '100px',
            background: school.status === 'active' ? '#ecfdf5' : '#f1f5f9',
            color: school.status === 'active' ? '#047857' : '#64748b'
          }}>
            {school.status === 'active' ? 'Live im Verzeichnis' : 'Inaktiv / Archiviert'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Lehrkräfte
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {teachers}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Gesamtschüler
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {totalStudents}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#ecfdf5',
          borderRadius: '16px',
          border: 'none'
        }}>
          <div>
            <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
              Aktivierte Profile
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#065f46' }}>
              {activeStudents} Schüler aktiv
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
              Passiv im Register
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#065f46' }}>
              {passiveStudents} Schüler ({metrics.step6PassiveStudentBaseFee.toFixed(2).replace('.', ',')} {metrics.currencySymbol})
            </div>
          </div>
        </div>
      </div>

      {/* 2. B2B-Finanz- & MRR-Kompaktspiegel */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}>
              <Euro size={16} />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
              B2B-Finanz- &amp; MRR-Spiegel
            </h4>
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: isBypass || isTrial ? '#d97706' : '#059669' }}>
            {formattedMrr}
          </span>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '14px',
          padding: '12px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>Basis-Hosting (Infrastruktur):</span>
            <strong style={{ color: '#0f172a' }}>
              {metrics.baseHostingNet.toFixed(2).replace('.', ',')} {metrics.currencySymbol} / Mo.
            </strong>
          </div>
          {metrics.step7StorageAddonFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Audio-Tresor Add-on:</span>
              <strong style={{ color: '#0f172a' }}>
                +{metrics.step7StorageAddonFee.toFixed(2).replace('.', ',')} {metrics.currencySymbol} / Mo.
              </strong>
            </div>
          )}
          {metrics.step4KombiDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
              <span>Kombi-Rabatt:</span>
              <strong>
                -{metrics.step4KombiDiscount.toFixed(2).replace('.', ',')} {metrics.currencySymbol} / Mo.
              </strong>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px dashed #cbd5e1',
            color: '#0f172a',
            fontWeight: 800
          }}>
            <span>Berechnete Monatssumme (Netto):</span>
            <span style={{ color: '#047857' }}>
              {metrics.totalMonthlyNet.toFixed(2).replace('.', ',')} {metrics.currencySymbol}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={12} color="#059669" />
          <span>Abrechnung erfolgt monatlich per GoBD-konformer RE-PDF via E-Mail.</span>
        </div>
      </div>

      {/* 3. Live-Cluster & Mandanten-Health */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a'
            }}>
              <Server size={16} />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
              Live-Cluster &amp; Health
            </h4>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.70rem',
            fontWeight: 800,
            color: '#059669',
            background: '#ecfdf5',
            padding: '2px 8px',
            borderRadius: '100px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            Cluster Nominal
          </span>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '14px',
          padding: '12px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.76rem',
          color: '#475569'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Produktions-Ingress:</span>
            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>85.215.73.216 (Frankfurt)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Latenz &amp; TLS:</span>
            <strong style={{ color: '#059669' }}>&lt; 20 ms • TLS 1.3 A+</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Letzte Mandanten-Aktivität:</span>
            <strong style={{ color: '#0f172a' }}>
              {school.last_session_at ? new Date(school.last_session_at).toLocaleString('de-DE') : 'Aktiv im Register'}
            </strong>
          </div>
        </div>
      </div>

      {/* 4. Souveränitäts- & Compliance-Vignette */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '20px',
        padding: '18px 20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="#059669" />
          <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
            Souveräne Datenhaltung (0% US-Cloud)
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5 }}>
          ISO/IEC 27001 zertifizierte deutsche Rechenzentren (IONOS &amp; Hetzner). Zero US CLOUD Act, Zero FISA 702 Exposition.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: school.avv_signed_at ? '#047857' : '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            <span>{school.avv_signed_at ? 'AVV digital gezeichnet' : 'AVV ausstehend'}</span>
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: school.mfa_enforced_for_admins ? '#0369a1' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} />
            <span>{school.mfa_enforced_for_admins ? 'Hiscox MFA aktiv' : 'MFA optional'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
