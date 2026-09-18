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
}) => {
  if (!isOpen) return null;

  const effectiveDateFormatted = new Date(priceEffectiveDate || Date.now()).toLocaleDateString('de-DE');

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(
      `Betreff: Informationen zu den Abonnementkonditionen von Campus-Groovelab ab ${effectiveDateFormatted}\n\n` +
      `Sehr geehrte Damen und Herren der Schulleitung,\n` +
      `wir danken Ihnen herzlich für das Vertrauen in Campus-Groovelab. Um den stetig wachsenden Anforderungen an IT-Sicherheit, Rechenzentrumsinfrastruktur in Deutschland sowie der kontinuierlichen Weiterentwicklung unserer Software gerecht zu werden, passen wir die Tarife zum ${effectiveDateFormatted} an.\n\n` +
      `Campus-Modul: ${Number(priceCampus).toFixed(2)} € / Mo.\n` +
      `GrooveLab-Modul: ${Number(priceGroovelab).toFixed(2)} € / Mo.\n` +
      `Kombi-Vorteil Bundle: ${Number(priceKombi).toFixed(2)} € / Mo.\n` +
      `Lehrer- & Verwaltungsprofil: ${Number(priceTeacher).toFixed(2)} € / Mo.\n` +
      `Schüleraktivierung: ${Number(priceStudent).toFixed(2)} € / Mo.\n\n` +
      `Gesetzliche Belehrung (§ 308 BGB):\n` +
      `Sie haben das Recht, dieser Vertragsanpassung innerhalb von vier (4) Wochen ab Zugang dieser Mitteilung in Textform zu widersprechen. Im Falle eines Widerspruchs steht Ihnen das Recht zu, das Abonnement zum Stichtag des Inkrafttretens kostenfrei außerordentlich zu kündigen.`
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
            📄 Rechtssichere Mitteilungsvorlage (B2B SaaS / BGB)
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
          <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a' }}>
            Betreff: Informationen zu den Abonnementkonditionen von Campus-Groovelab ab {effectiveDateFormatted}
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            Sehr geehrte Damen und Herren der Schulleitung und Geschäftsführung,
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            wir danken Ihnen herzlich für das Vertrauen in <strong>Campus-Groovelab</strong>. Um den stetig wachsenden Anforderungen an IT-Sicherheit, Rechenzentrumsinfrastruktur in Deutschland sowie der kontinuierlichen Weiterentwicklung unserer Software gerecht zu werden, passen wir die Tarife zum <strong>{effectiveDateFormatted}</strong> an.
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
              <li>Campus-Modul: {Number(priceCampus).toFixed(2)} € / Mo.</li>
              <li>GrooveLab-Modul: {Number(priceGroovelab).toFixed(2)} € / Mo.</li>
              <li>Kombi-Vorteil Bundle: {Number(priceKombi).toFixed(2)} € / Mo.</li>
              <li>Lehrer- & Verwaltungsprofil: {Number(priceTeacher).toFixed(2)} € / Mo.</li>
              <li>Schüleraktivierung: {Number(priceStudent).toFixed(2)} € / Mo.</li>
            </ul>
          </div>

          <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a' }}>
            ⚖️ Gesetzliche Belehrung zum Sonderkündigungsrecht (§ 308 BGB):
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.80rem', color: '#334155' }}>
            Sie haben das Recht, dieser Vertragsanpassung innerhalb von vier (4) Wochen ab Zugang dieser Mitteilung in Textform zu widersprechen. Im Falle eines form- und fristgerechten Widerspruchs steht Ihnen das Recht zu, das Abonnement zum Stichtag des Inkrafttretens ({effectiveDateFormatted}) kostenfrei außerordentlich zu kündigen. Wenn Sie nicht widersprechen, gilt die Vertragsanpassung als von Ihnen genehmigt.
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
