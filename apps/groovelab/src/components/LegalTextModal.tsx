import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Building, CheckCircle2 } from 'lucide-react';

interface LegalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'impressum' | 'privacy' | 'terms';
}

export const LegalTextModal: React.FC<LegalTextModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'impressum'
}) => {
  const [activeTab, setActiveTab] = useState<'impressum' | 'privacy' | 'terms'>(initialTab);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        borderRadius: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              Rechtliche Hinweise – Campus-Groovelab
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Offizielle Dokumente & Compliance für Deutschland 🇩🇪, Österreich 🇦🇹 und die Schweiz 🇨🇭
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Rechtliche Hinweise schließen"
            style={{
              border: 'none',
              background: '#e2e8f0',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155'
            }}
            className="focus-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '6px',
          gap: '6px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setActiveTab('impressum')}
            aria-label="Impressum anzeigen"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'impressum' ? '#ffffff' : 'transparent',
              color: activeTab === 'impressum' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'impressum' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'impressum' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
            className="focus-ring"
          >
            <Building size={16} color={activeTab === 'impressum' ? '#ea4335' : '#64748b'} /> Impressum
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            aria-label="Datenschutzerklärung anzeigen"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'privacy' ? '#ffffff' : 'transparent',
              color: activeTab === 'privacy' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'privacy' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'privacy' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
            className="focus-ring"
          >
            <ShieldCheck size={16} color={activeTab === 'privacy' ? '#34a853' : '#64748b'} /> Datenschutz
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            aria-label="Allgemeine Geschäftsbedingungen anzeigen"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'terms' ? '#ffffff' : 'transparent',
              color: activeTab === 'terms' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'terms' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'terms' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
            className="focus-ring"
          >
            <FileText size={16} color={activeTab === 'terms' ? '#eab308' : '#64748b'} /> AGB
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          fontSize: '0.84rem',
          lineHeight: 1.65,
          color: '#334155',
          background: '#ffffff'
        }}>
          {activeTab === 'impressum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                Angaben gemäß § 5 DDG / TMG & § 18 MStV
              </h4>

              <div>
                <strong>Diensteanbieter & Betreiber der Plattform Campus-Groovelab:</strong><br />
                Patrick Huber<br />
                Karl-Fürstenberg Str. 59<br />
                79618 Rheinfelden<br />
                Deutschland
              </div>

              <div>
                <strong>Kontakt:</strong><br />
                E-Mail: <a href="mailto:patrick.huber@musaek.de" style={{ color: '#34a853', fontWeight: 700 }}>patrick.huber@musaek.de</a><br />
                Website: <a href="https://campus-groovelab.de" target="_blank" rel="noopener noreferrer" style={{ color: '#34a853', fontWeight: 700 }}>campus-groovelab.de</a>
              </div>

              <div>
                <strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong><br />
                Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden
              </div>

              <div>
                <strong>EU-Streitschlichtung & Verbraucherstreitbeilegung:</strong><br />
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                Datenschutzerklärung (DSGVO / nDSG / DSG)
              </h4>

              <div>
                <strong>1. Allgemeine Hinweise & Verantwortlicher</strong><br />
                Der Schutz Ihrer Daten hat für <strong>Campus-Groovelab</strong> höchste Priorität. Verantwortlich im Sinne der DSGVO und des Schweizer nDSG ist Patrick Huber (Kontaktdaten siehe Impressum).
              </div>

              <div>
                <strong>2. Grundsatz der Datenminimierung & Kinderschutz</strong><br />
                Auf Campus-Groovelab werden keinerlei Bank-, SEPA-, Vertragsdaten oder E-Mail-Adressen von Schülern gespeichert. Schülernamen werden im Lehrer-Dashboard stets anonymisiert im Format "Vorname + N." (z. B. "Max M.") dargestellt. Im Schüler-Dashboard werden ausschließlich generische Bezeichnungen (z. B. "Mein Hausaufgabenheft") verwendet.
              </div>

              <div>
                <strong>3. Eltern-Einwilligung bei Minderjährigen (Art. 8 DSGVO / Art. 6 CH-nDSG)</strong><br />
                Für Schüler unter 16 Jahren (DE/AT) bzw. 13 Jahren (CH) ist die Zustimmung der Erziehungsberechtigten erforderlich. Diese wird im digitalen Onboarding-Flow abgefragt und serverseitig mit Zeitstempel, Einwilligungsversion und Eltern-E-Mail protokolliert.
              </div>

              <div>
                <strong>4. Audio-Loopstation, Aufnahmen & Hardware-Sicherheit</strong><br />
                Audiodaten aus der In-App Loopstation werden lokal verarbeitet und verschlüsselt im EU-Cloud-Speicher abgelegt. Nach dem Löschen einer Aufnahme wird die Datei physisch aus dem Storage entfernt. Bei Verlassen des Moduls oder Tab-Wechsel schaltet ein automatischer Guard alle Mikrofon-Tracks (`MediaStreamTrack.stop()`) ab.
              </div>

              <div>
                <strong>5. Kamera-Nutzerberechtigung (QR-Scanner)</strong><br />
                Der Zugriff auf die Kamera erfolgt ausschließlich lokal im Browser zur Ausweis-Einlesung. Es finden keine Übertragungen oder Speicherungen von Videobildern statt.
              </div>

              <div>
                <strong>6. Hosting & Auftragsverarbeiter</strong><br />
                Das Hosting von App und Datenbank erfolgt zu 100% bei europäischen Auftragsverarbeitern (Hetzner Online GmbH, Falkenstein, DE & Supabase EU, Frankfurt) mit Auftragsverarbeitungsverträgen (AVV) nach Art. 28 DSGVO.
              </div>

              <div>
                <strong>7. Betroffenenrechte</strong><br />
                Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18) sowie Beschwerde bei der zuständigen Datenschutzaufsichtsbehörde (BfDI / DSB / EDÖB).
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                Allgemeine Geschäftsbedingungen (AGB) – Campus-Groovelab
              </h4>

              <div>
                <strong>1. Geltungsbereich</strong><br />
                Diese AGB regeln die Bereitstellung und Nutzung der SaaS-Software <strong>Campus-Groovelab</strong> für Musikschulen, Lehrkräfte, Eltern und Schüler.
              </div>

              <div>
                <strong>2. Software-Lizenz & Preisstruktur</strong><br />
                - Die Basis-Software-Lizenz für Campus-Groovelab ist **100% kostenlos**.<br />
                - **Campus-Modul**: 7,99 € / Mo. (Server-Hosting Flatrate per Musikschule).<br />
                - **GrooveLab-Modul**: 4,99 € / Mo. (Server-Hosting Flatrate per Musikschule).<br />
                - **Kombi-Vorteil**: 9,99 € / Mo. (Server-Hosting Flatrate für beide Module).<br />
                - **Lehrer & Verwaltung**: 0,49 € / Mo. je aktivem Lehrer-Profil. Verwaltungs- und Sekretariats-User (`admin` und `secretary`) sind kostenfrei inklusive.<br />
                - **Schüler-Aktivierungen**: 0,49 € / Mo. je aktivierter Schülerin/Schüler. Bei mehr als 2 Monaten Inaktivität wird das Profil automatisch passiviert, um unnötige Gebühren zu vermeiden.
              </div>

              <div>
                <strong>3. Urheberrecht an Audio-Aufnahmen (§ 31 UrhG / URG)</strong><br />
                Die Urheberrechte an in der Audio-Loopstation erstellten Aufnahmen verbleiben zu 100% beim Ersteller/Schüler. Der Betreiber erhält lediglich das unentgeltliche, einfache Recht zur Speicherung und Bereitstellung der Aufnahmen für unterrichtliche Zwecke im Rahmen der Plattform.
              </div>

              <div>
                <strong>4. Gewährleistung & Haftungsbeschränkung</strong><br />
                Der Betreiber haftet für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für vorsätzlich oder grob fahrlässig verursachte Schäden uneingeschränkt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.
              </div>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            className="focus-ring"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
