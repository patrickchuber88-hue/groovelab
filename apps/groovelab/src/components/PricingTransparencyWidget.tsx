import React from 'react';
import { ShieldCheck, Info, CheckCircle2, Zap, DollarSign } from 'lucide-react';

interface PricingTransparencyWidgetProps {
  school?: any;
  activePlatform?: 'campus' | 'groovelab' | 'kombi';
}

export const PricingTransparencyWidget: React.FC<PricingTransparencyWidgetProps> = ({
  school,
  activePlatform = 'kombi'
}) => {
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
            background: '#e6f4ea',
            color: '#34a853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              Transparente Lizenz- & Preiskonditionen
            </h4>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              Campus-Groovelab Fair-Use Tarifübersicht für Musikschulen
            </p>
          </div>
        </div>
        <span style={{
          background: '#d1fae5',
          color: '#065f46',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          100% Kostenlose Software-Lizenz
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
            9,99 € <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>/ Mo. Kombi</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
            Campus (7,99 €) + GrooveLab (4,99 €) im Kombi-Vorteil. Sparen Sie 2,99 € / Mo.
          </div>
        </div>

        {/* Teachers & Admin */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Lehrer & Verwaltung
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            0,49 € <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>/ Lehrer / Mo.</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
            Verwaltungs- & Sekretariatskonten sind zu 100% inklusive (0,00 € Gebühr).
          </div>
        </div>

        {/* Pupil Activations & Auto-Deactivation */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Schüler-Aktivierungen
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            0,49 € <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>/ aktiv. Schüler / Mo.</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
            Nur tatsächlich eingeloggte Schüler werden berechnet. Auto-Passivierung nach 2 Monaten Inaktivität.
          </div>
        </div>
      </div>

      {/* Protection Note */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.75rem',
        color: '#1e40af'
      }}>
        <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
        <span>
          Volle Kostenkontrolle: Schülerinaktivierungen verursachen keine unerwarteten Kosten für schlafende Konten in der Datenbank.
        </span>
      </div>
    </div>
  );
};
