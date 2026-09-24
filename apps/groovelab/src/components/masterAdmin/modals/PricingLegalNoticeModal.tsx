import React from 'react';

interface PricingLegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
  priceEffectiveDate: string;
  currency?: 'EUR' | 'CHF';
}

export const PricingLegalNoticeModal: React.FC<PricingLegalNoticeModalProps> = ({
  isOpen,
  onClose,
  priceCampus,
  priceGroovelab,
  priceKombi,
  priceTeacher,
  priceStudent,
  priceEffectiveDate,
  currency = 'EUR'
}) => {
  if (!isOpen) return null;

  const isChf = currency === 'CHF';
  const sym = isChf ? 'CHF' : '€';
  const fmt = (n: number | string) => isChf ? `CHF ${Number(n).toFixed(2)}` : `${Number(n).toFixed(2).replace('.', ',')} €`;

  const effectiveDateFormatted = new Date(priceEffectiveDate || Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE');

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(
      `Betreff: Wichtige Information zu den Abonnementkonditionen von Campus-Groovelab ab ${effectiveDateFormatted}\n\n` +
      `Sehr geehrte Damen und Herren der Schulleitung und Geschäftsführung,\n\n` +
      `wir danken Ihnen herzlich für die partnerschaftliche Zusammenarbeit mit Campus-Groovelab. Um den kontinuierlich steigenden Anforderungen an IT-Sicherheit (OWASP ASVS Level 3), modernste Rechenzentrumsinfrastruktur in Europa sowie der didaktischen Weiterentwicklung unserer Software gerecht zu werden, passen wir die Tarife zum Schuljahresbeginn am ${effectiveDateFormatted} an.\n\n` +
      `Ihre neuen Modultarife im Überblick:\n` +
      `- Campus-Modul: ${fmt(priceCampus)} / Mo.\n` +
      `- GrooveLab-Modul: ${fmt(priceGroovelab)} / Mo.\n` +
      `- Kombi-Vorteil Bundle: ${fmt(priceKombi)} / Mo.\n` +
      `- Pädagogen- & Verwaltungslizenz: ${fmt(priceTeacher)} / Mo.\n` +
      `- Schüleraktivierung: ${fmt(priceStudent)} / Mo.\n\n` +
      `Gesetzliche Belehrung zum Sonderkündigungsrecht (AGB Ziffer 4 & BGB 315):\n` +
      `Gemäß unserer vertraglichen Preisanpassungsklausel kündigen wir diese Änderung mit einer Frist von mindestens zwei (2) Monaten in Textform an. Sie haben das Recht, dieser Vertragsanpassung vor dem Wirksamkeitszeitpunkt in Textform zu widersprechen. Im Falle eines form- und fristgerechten Widerspruchs steht Ihnen das Recht zu, das Abonnement zum Stichtag des Inkrafttretens (${effectiveDateFormatted}) kostenfrei außerordentlich zu kündigen.`
    );
    alert('Rechtssicherer Mitteilungstext erfolgreich in die Zwischenablage kopiert!');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rechtssichere Mitteilungsvorlage"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(15, 23, 42, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📄 Rechtssichere Mitteilungsvorlage (B2B SaaS / AGB Ziffer 4)
          </h3>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 900,
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            fontSize: '0.84rem',
            color: '#475569',
            lineHeight: '1.6',
            background: '#f8fafc',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{
              background: isChf ? '#fee2e2' : '#dbeafe',
              color: isChf ? '#991b1b' : '#1e40af',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.72rem'
            }}>
              {isChf ? '🇨🇭 Währung: Schweizer Franken (CHF)' : '🇪🇺 Währung: Euro (EUR)'}
            </span>
          </div>

          <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a' }}>
            Betreff: Informationen zu den Abonnementkonditionen von Campus-Groovelab ab {effectiveDateFormatted}
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            Sehr geehrte Damen und Herren der Schulleitung und Geschäftsführung,
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            wir danken Ihnen herzlich für die partnerschaftliche Zusammenarbeit mit <strong>Campus-Groovelab</strong>. Um den kontinuierlich steigenden Anforderungen an IT-Sicherheit, Serverinfrastruktur in Europa sowie der didaktischen Weiterentwicklung unserer Software gerecht zu werden, passen wir die Tarife zum Schuljahresbeginn am <strong>{effectiveDateFormatted}</strong> an.
          </p>

          <div
            style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              margin: '14px 0',
            }}
          >
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', fontSize: '0.80rem' }}>
              Ihre angepassten Modultarife im Überblick:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.78rem' }}>
              <li>Campus-Modul: {fmt(priceCampus)} / Mo.</li>
              <li>GrooveLab-Modul: {fmt(priceGroovelab)} / Mo.</li>
              <li>Kombi-Vorteil Bundle: {fmt(priceKombi)} / Mo.</li>
              <li>Pädagogen- & Verwaltungslizenz: {fmt(priceTeacher)} / Mo.</li>
              <li>Schüleraktivierung: {fmt(priceStudent)} / Mo.</li>
            </ul>
          </div>

          <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a' }}>
            ⚖️ Gesetzliche Belehrung zum Sonderkündigungsrecht (AGB Ziffer 4):
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.80rem', color: '#334155' }}>
            Gemäß unserer AGB kündigen wir diese Preisanpassung mit einer Frist von mindestens zwei (2) Monaten vor dem neuen Schuljahr in Textform an. Sie haben das Recht, dieser Vertragsanpassung vor dem Stichtag in Textform zu widersprechen. Im Falle eines fristgerechten Widerspruchs steht Ihnen das Recht zu, das Abonnement zum Stichtag ({effectiveDateFormatted}) kostenfrei außerordentlich zu kündigen.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={handleCopyNotice}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            📋 Text kopieren
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
