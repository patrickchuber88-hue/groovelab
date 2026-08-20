import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useMasterPricing } from '../context/MasterPricingContext';

interface PricingTransparencyWidgetProps {
  school?: any;
  activePlatform?: 'campus' | 'groovelab' | 'kombi';
}

export const PricingTransparencyWidget: React.FC<PricingTransparencyWidgetProps> = () => {
  const pricing = useMasterPricing();

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#fce8e6',
            color: '#ea4335',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              Transparente Cloud- &amp; Hostingkonditionen
            </h4>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              Campus-Groovelab Fair-Use Tarifübersicht für Musikschulen
            </p>
          </div>
        </div>
        <span style={{
          background: '#fce8e6',
          color: '#c5221f',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          Software-Nutzung 100% kostenlos
        </span>
      </div>

      {/* Pricing Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* Module Flatrates */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Server-Hosting Flatrate
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {pricing.priceKombi.toFixed(2).replace('.', ',')} € <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>/ Mo. Kombi</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
            Campus ({pricing.priceCampus.toFixed(2).replace('.', ',')} €) + GrooveLab ({pricing.priceGroovelab.toFixed(2).replace('.', ',')} €) im Kombi-Vorteil. Sparen Sie {pricing.kombiSavings.toFixed(2).replace('.', ',')} € / Mo.
          </div>
        </div>

        {/* Teachers & Admin */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Lehrer &amp; Verwaltung
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {pricing.priceTeacher.toFixed(2).replace('.', ',')} € <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>/ Lehrer / Mo.</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
            Verwaltungs- &amp; Sekretariatskonten sind zu 100% inklusive (0,00 € Gebühr).
          </div>
        </div>

        {/* Pupil Activations & Auto-Deactivation */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Schüler-Aktivierungen
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {pricing.priceStudent.toFixed(2).replace('.', ',')} € <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>/ aktiv. Schüler / Mo.</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
            Nur tatsächlich eingeloggte Schüler werden berechnet. Auto-Passivierung nach 2 Monaten Inaktivität.
          </div>
        </div>
      </div>

      {/* Protection & Legal Note */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          background: '#fce8e6',
          border: '1px solid #f87171',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.75rem',
          color: '#991b1b'
        }}>
          <Info size={16} color="#ea4335" style={{ flexShrink: 0 }} />
          <span>
            Volle Kostenkontrolle: Schülerinaktivierungen verursachen keine unerwarteten Kosten für schlafende Konten in der Datenbank.
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', fontStyle: 'italic', fontWeight: 600 }}>
          Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
        </div>
      </div>
    </div>
  );
};
