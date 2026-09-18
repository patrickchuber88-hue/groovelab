import React from 'react';
import { Sparkles, Check, Rocket } from 'lucide-react';
import { CampusGroovelabText } from '../../../CampusGroovelabBrand';

interface CampusComingSoonColumnProps {
  isForStudent: boolean;
  brandColor: string;
}

export const CampusComingSoonColumn: React.FC<CampusComingSoonColumnProps> = ({
  isForStudent,
  brandColor
}) => {
  return (
    <div id="tour-student-events" style={{
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: '24px',
      padding: '24px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      height: 'calc(100vh - 120px)',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color={brandColor} /> Meine Events &amp; Mitwirkungen
          </h3>
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: '#f1f5f9',
            color: '#475569',
            padding: '3px 8px',
            borderRadius: '100px'
          }}>
            In Vorbereitung
          </span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
          Bühnenauftritte, Soundchecks &amp; Mitwirkenden-Abläufe
        </p>
      </div>

      {/* Hero Card */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        border: '1.5px dashed #cbd5e1',
        borderRadius: '20px',
        gap: '16px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
        }}>
          <Sparkles size={26} color="#64748b" />
        </div>

        <div style={{ maxWidth: '340px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
            Hier entsteht eine neue Funktion
          </h4>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.55, fontWeight: 550 }}>
            {isForStudent 
              ? 'Wir entwickeln deine zentrale Mitwirkungs- & Event-Zentrale. Sobald dich deine Lehrkraft für Konzerte, Schülervorspiele oder Ensemble-Projekte einteilt, findest du deine Soundcheck-Zeiten und deinen Ablaufplan direkt hier.'
              : 'Wir entwickeln das zentrale Mitwirkungs- & Programmbegleit-Board. Zukünftig planst du hier Schülervorspiele, Konzertbeiträge und Bühnenabläufe nahtlos im Team mit dem Sekretariat.'}
          </p>
        </div>

        {/* Feature Preview Checklist */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'left',
          background: '#ffffff',
          border: '1px solid #f1f5f9',
          borderRadius: '14px',
          padding: '14px 16px',
          width: '100%',
          maxWidth: '310px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          {[
            'Automatische Benachrichtigung bei Mitwirkungen',
            'Soundcheck- & Ablaufzeiten auf die Minute genau',
            'Digitales Programmheft & Raum-Übersicht'
          ].map((text, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
              <Check size={13} color={brandColor} style={{ flexShrink: 0 }} />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Rocket size={13} color="#94a3b8" /> <CampusGroovelabText /> Roadmap
        </div>
      </div>
    </div>
  );
};
