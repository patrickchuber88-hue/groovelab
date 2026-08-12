import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Building, Undo2 } from 'lucide-react';

interface LegalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'impressum' | 'privacy' | 'terms' | 'cancellation';
}

export const LegalTextModal: React.FC<LegalTextModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'impressum'
}) => {
  const [activeTab, setActiveTab] = useState<'impressum' | 'privacy' | 'terms' | 'cancellation'>(initialTab);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        borderRadius: '28px',
        boxShadow: '0 30px 70px rgba(15, 23, 42, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1.5px solid #cbd5e1'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              Rechtliche Hinweise – Campus-Groovelab
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
              Offizielle Dokumente & Compliance für Deutschland, Österreich und die Schweiz
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Rechtliche Hinweise schließen"
            style={{
              border: 'none',
              background: '#e2e8f0',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155',
              transition: 'all 0.15s ease'
            }}
            className="focus-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4-Tab Enterprise Navigation */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '6px',
          gap: '6px',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('impressum')}
            aria-label="Impressum anzeigen"
            style={{
              flex: 1,
              padding: '10px 14px',
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
              boxShadow: activeTab === 'impressum' ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
              whiteSpace: 'nowrap'
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
              padding: '10px 14px',
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
              boxShadow: activeTab === 'privacy' ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
              whiteSpace: 'nowrap'
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
              padding: '10px 14px',
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
              boxShadow: activeTab === 'terms' ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
              whiteSpace: 'nowrap'
            }}
            className="focus-ring"
          >
            <FileText size={16} color={activeTab === 'terms' ? '#eab308' : '#64748b'} /> AGB
          </button>

          <button
            onClick={() => setActiveTab('cancellation')}
            aria-label="Widerrufsbelehrung anzeigen"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'cancellation' ? '#ffffff' : 'transparent',
              color: activeTab === 'cancellation' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'cancellation' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'cancellation' ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
              whiteSpace: 'nowrap'
            }}
            className="focus-ring"
          >
            <Undo2 size={16} color={activeTab === 'cancellation' ? '#2563eb' : '#64748b'} /> Widerruf (B2C)
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '28px 32px',
          overflowY: 'auto',
          flex: 1,
          fontSize: '0.84rem',
          lineHeight: 1.65,
          color: '#334155',
          background: '#ffffff'
        }}>
          {activeTab === 'impressum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz) & § 18 MStV
              </h4>

              <div style={{ background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#0f172a' }}>Diensteanbieter & Betreiber der Plattform Campus-Groovelab:</strong><br />
                Patrick Huber<br />
                Karl-Fürstenberg Str. 59<br />
                79618 Rheinfelden<br />
                Deutschland
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Kontakt & Schnelle elektronische Kontaktaufnahme (§ 5 Abs. 1 Nr. 2 DDG):</strong><br />
                Telefon: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>Auf Anfrage via E-Mail</a><br />
                E-Mail: <a href="mailto:patrick.huber@musaek.de" style={{ color: '#34a853', fontWeight: 700 }}>patrick.huber@musaek.de</a> / <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>kontakt@campus-groovelab.de</a><br />
                Website: <a href="https://campus-groovelab.de" target="_blank" rel="noopener noreferrer" style={{ color: '#34a853', fontWeight: 700 }}>campus-groovelab.de</a>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Umsatzsteuer-Identifikation (§ 5 Abs. 1 Nr. 6 DDG / § 19 UStG):</strong><br />
                Umsatzsteuerbefreit gemäß <strong>§ 19 UStG (Kleinunternehmerregelung)</strong>. Es wird keine Umsatzsteuer ausgewiesen.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong><br />
                Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>EU-Streitschlichtung & Verbraucherstreitbeilegung:</strong><br />
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>https://ec.europa.eu/consumers/odr/</a>.<br />
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Datenschutzerklärung (DSGVO / nDSG / TDDDG)
              </h4>

              <div>
                <strong style={{ color: '#0f172a' }}>1. Allgemeine Hinweise & Verantwortlicher</strong><br />
                Der Schutz Ihrer Daten hat für <strong>Campus-Groovelab</strong> höchste Priorität. Verantwortlich im Sinne der DSGVO, des Schweizer nDSG und des österreichischen DSG ist Patrick Huber (Kontaktdaten siehe Impressum).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>2. Grundsatz der Datenminimierung & Kinderschutz (Art. 5 DSGVO)</strong><br />
                Auf Campus-Groovelab werden keinerlei Bank-, SEPA-, Vertragsdaten oder E-Mail-Adressen von Schülern gespeichert. Schülernamen werden im Lehrer-Dashboard stets anonymisiert im Format "Vorname + N." (z. B. "Max M.") dargestellt. Im Schüler-Dashboard werden ausschließlich generische Bezeichnungen (z. B. "Mein Hausaufgabenheft") verwendet.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>3. Einsatz von technisch notwendigen Speichermedien (§ 25 Abs. 2 Nr. 2 TDDDG)</strong><br />
                Es werden ausschließlich technisch zwingend erforderliche LocalStorage- und SessionStorage-Einträge zur Aufrechterhaltung der Session und zur sicheren Kiosk-Kopplung (z. B. <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>groovelab_kiosk_token</code>) verwendet. <strong>Es werden keine Tracking-Cookies, Werbe-Cookies oder Drittanbieter-Analyse-Tools eingesetzt.</strong>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>4. Eltern-Einwilligung bei Minderjährigen (Art. 8 DSGVO / Art. 6 CH-nDSG)</strong><br />
                Für Schüler unter 16 Jahren (DE/AT) bzw. 13 Jahren (CH) ist die Zustimmung der Erziehungsberechtigten erforderlich. Diese wird im digitalen Onboarding-Flow abgefragt und serverseitig mit Zeitstempel, Einwilligungsversion und Eltern-E-Mail protokolliert.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>5. Audio-Loopstation, Aufnahmen & Hardware-Sicherheit</strong><br />
                Audiodaten aus der In-App Loopstation werden lokal verarbeitet und verschlüsselt im EU-Cloud-Speicher abgelegt. Nach dem Löschen einer Aufnahme wird die Datei physisch aus dem Storage entfernt. Bei Verlassen des Moduls oder Tab-Wechsel schaltet ein automatischer Guard alle Mikrofon-Tracks (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MediaStreamTrack.stop()</code>) ab.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>6. Hosting in ISO 27001-zertifizierten Rechenzentren (§ 28 DSGVO)</strong><br />
                Das Hosting von App und Datenbank erfolgt zu 100% in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein, DE & Supabase EU, Frankfurt) mit Auftragsverarbeitungsverträgen (AVV) nach Art. 28 DSGVO.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>7. Betroffenenrechte (Art. 15 bis 22 DSGVO)</strong><br />
                Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18) sowie Beschwerde bei der zuständigen Datenschutzaufsichtsbehörde (BfDI / DSB / EDÖB).
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Allgemeine Geschäftsbedingungen (AGB) – Campus-Groovelab
              </h4>

              <div>
                <strong style={{ color: '#0f172a' }}>1. Vertragsgegenstand & Rechtsnatur</strong><br />
                Diese AGB regeln die Bereitstellung von <strong>Campus-Groovelab</strong>. Der Vertragsgegenstand gliedert sich in:
                <br />
                a) Die <strong>unentgeltliche Überlassung der Anwendungssoftware (Leihvertrag gemäß § 598 BGB)</strong>.
                <br />
                b) Die <strong>entgeltliche Bereitstellung und Vermietung von Server-Speicherplatz und Datenhosting-Infrastruktur (Mietvertrag gemäß § 535 BGB)</strong>.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>2. Software-Lizenz & Hosting-Gebühren (§ 19 UStG Kleinunternehmer)</strong><br />
                - <strong>Software-Lizenz:</strong> Die Überlassung der Anwendungssoftware ist <strong>100% kostenlos</strong>.<br />
                - <strong>Campus-Modul Hosting:</strong> 7,99 € / Mo. (Server-Hosting & Webspace-Flatrate per Musikschule).<br />
                - <strong>GrooveLab-Modul Hosting:</strong> 4,99 € / Mo. (Server-Hosting & Webspace-Flatrate per Musikschule).<br />
                - <strong>Kombi-Vorteil Hosting:</strong> 9,99 € / Mo. (Server-Hosting & Webspace-Flatrate für beide Module).<br />
                - <strong>Infrastruktur-Service-Fee:</strong> 0,49 € / Mo. je aktivem Lehrer-Profil. Verwaltungs- und Sekretariats-User (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>admin</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>secretary</code>) sind kostenfrei inklusive.<br />
                - <strong>Schüler-Infrastruktur-Fee:</strong> 0,49 € / Mo. je aktivierter Schülerin/Schüler. Bei mehr als 2 Monaten Inaktivität wird das Profil automatisch passiviert.<br />
                - <strong>Steuerlicher Hinweis (§ 19 UStG):</strong> <em>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</em>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>3. Host-Provider-Privileg & Urheberrecht an Daten (§ 535 BGB, Art. 6 DSA)</strong><br />
                Der Betreiber stellt lediglich den vermieteten Server-Speicherplatz bereit (Webhosting). Die Kunden/Nutzer sind allein verantwortlich für die Rechtmäßigkeit der von ihnen hochgeladenen Inhalte (Noten, Dokumente, Audios). Der Betreiber haftet als Host-Provider gemäß Art. 6 DSA (§ 10 TDDDG) erst ab Kenntnisnahme von konkreten Rechtsverletzungen (Notice-and-Takedown). Die Urheberrechte an in der Audio-Loopstation erstellten Aufnahmen verbleiben zu 100% beim Ersteller/Schüler.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>4. Haftungsbeschränkung (§ 599 BGB & Mietrecht)</strong><br />
                - <strong>Kostenlose Software (§ 599 BGB):</strong> Für Sach- und Rechtsmängel der unentgeltlich überlassenen Software haftet der Betreiber gemäß § 599 BGB nur bei Vorsatz und grober Fahrlässigkeit.<br />
                - <strong>Server-Hosting:</strong> Für die entgeltliche Webspace-Bereitstellung haftet der Betreiber uneingeschränkt bei Vorsatz, grober Fahrlässigkeit sowie Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.
              </div>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Widerrufsbelehrung & Muster-Widerrufsformular (für Verbraucher/Eltern nach § 312g BGB)
              </h4>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#1e40af' }}>Widerrufsrecht für Verbraucher:</strong><br />
                Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Ausübung des Widerrufs:</strong><br />
                Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden, E-Mail: patrick.huber@musaek.de) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Muster-Widerrufsformular:</strong><br />
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '6px' }}>
                  An: Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden, E-Mail: patrick.huber@musaek.de<br /><br />
                  Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Buchung des Zugangs Campus-Groovelab.<br />
                  - Bestellt am (*)/erhalten am (*)<br />
                  - Name des/der Verbraucher(s)<br />
                  - Anschrift des/der Verbraucher(s)<br />
                  - Datum & Unterschrift (nur bei Mitteilung auf Papier)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div style={{
          padding: '16px 28px',
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
              padding: '10px 22px',
              fontSize: '0.84rem',
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
