import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Building, Undo2 } from 'lucide-react';
import { useMasterPricing } from '../context/MasterPricingContext';

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
  const masterPricing = useMasterPricing();
  const [activeTab, setActiveTab] = useState<'impressum' | 'privacy' | 'terms' | 'cancellation'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

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
                <strong style={{ color: '#0f172a' }}>Kontakt &amp; Schnelle elektronische Kontaktaufnahme (§ 5 Abs. 1 Nr. 2 DDG):</strong><br />
                E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> / <a href="mailto:patrick.huber@musaek.de" style={{ color: '#34a853', fontWeight: 700 }}>patrick.huber@musaek.de</a><br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '3px' }}>
                  <strong>⚡ Elektronische Schnellkontakt-Garantie (BGH I ZR 238/14 / EuGH C-298/07):</strong> Anfragen über unsere E-Mail- &amp; Support-Kanäle werden an Werktagen (Mo–Fr 08:00–18:00 Uhr) garantiert <strong>innerhalb von maximal 60 Minuten</strong> beantwortet. Ein digitales Support- &amp; Feedback-System steht allen registrierten Nutzern und Schulen direkt im App-Dashboard zur Verfügung.
                </span>
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                  Website: <a href="https://campus-groovelab.de" target="_blank" rel="noopener noreferrer" style={{ color: '#34a853', fontWeight: 700 }}>campus-groovelab.de</a>
                </span>
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
                <strong style={{ color: '#0f172a' }}>3. Einsatz von technisch notwendigen Speichermedien &amp; AES-256-GCM Vault (§ 25 Abs. 2 Nr. 2 TDDDG)</strong><br />
                Es werden ausschließlich technisch zwingend erforderliche LocalStorage- und SessionStorage-Einträge zur Aufrechterhaltung der Session und zur sicheren Kiosk-Kopplung verwendet. Lokale Profil- und PIN-Caches werden auf dem Endgerät mit <strong>AES-256-GCM (Web Crypto API)</strong> hardware-gebunden verschlüsselt abgelegt. <strong>Es werden keine Tracking-Cookies, Werbe-Cookies oder Drittanbieter-Analyse-Tools eingesetzt.</strong>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>4. Eltern-Einwilligung bei Minderjährigen (Art. 8 DSGVO / Art. 6 CH-nDSG)</strong><br />
                Für Schüler unter 16 Jahren (DE/AT) bzw. 13 Jahren (CH) ist die Zustimmung der Erziehungsberechtigten erforderlich. Diese wird im digitalen Onboarding-Flow abgefragt und serverseitig in einem revisionssicheren, manipulationsgeschützten <strong>SHA-256 Merkle-Chain Audit-Ledger</strong> mit Zeitstempel, Einwilligungsversion und Eltern-E-Mail protokolliert.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>5. Zero-Trust Session-Leasing, Audio-Tresor &amp; Hardware-Sicherheit</strong><br />
                Audiodaten aus der In-App Loopstation und dem Meisterwerk-Protokoll werden verschlüsselt im EU-Cloud-Speicher abgelegt und sind durch mandanten- und schülerspezifische Storage-RLS-Policies geschützt. Nach dem Löschen einer Aufnahme wird die Datei physisch und vollständig aus dem Cloud-Speicher entfernt. PINs werden mit <strong>OWASP-konformem PBKDF2 Zero-Knowledge Hashing (100.000 Runden)</strong> verarbeitet. Das integrierte <strong>Zero-Trust Session-Leasing</strong> ermöglicht Schulleitung und Lehrkräften jederzeit den 1-Click Remote-Logout aktiver Geräte. Bei Verlassen des Moduls oder Tab-Wechsel schaltet ein automatischer Guard alle Mikrofon-Tracks (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MediaStreamTrack.stop()</code>) ab.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>6. Hosting in ISO 27001-zertifizierten Rechenzentren (Art. 28 DSGVO)</strong><br />
                Das Hosting von App und Datenbank erfolgt zu 100% in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/DE &amp; Supabase EU, Frankfurt am Main) mit Auftragsverarbeitungsverträgen (AVV) nach Art. 28 DSGVO.
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

              {/* ── TEIL A: B2B FÜR MUSIKSCHULEN ── */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TEIL A: Bestimmungen für Musikschulen &amp; Bildungsträger (B2B / § 14 BGB)
                </span>

                <div>
                  <strong style={{ color: '#0f172a' }}>1. Vertragsgegenstand &amp; Rechtsnatur (SaaS-Mietvertrag)</strong><br />
                  Diese Bestimmungen regeln die Bereitstellung der cloudbasierten Schulmanagement- und Übeplattform <strong>Campus-Groovelab</strong> durch den Betreiber Patrick Huber (Einzelunternehmer). Der Vertrag qualifiziert sich rechtlich als <strong>Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB</strong> über die Bereitstellung der Cloud-Infrastruktur, Datenbank-Hosting, Datensicherung und Wartung.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Bereitstellungsmodell &amp; Hosting-Pauschalen (§ 19 UStG)</strong><br />
                  - <strong>Software-Bereitstellung:</strong> Die Software wird im Rahmen des gebuchten Cloud-Infrastruktur-Pakets ohne gesonderte Lizenzkaufgebühren bereitgestellt (0,00 €).<br />
                  - <strong>Campus-Modul Hosting:</strong> {masterPricing.priceCampus.toFixed(2).replace('.', ',')} € / Mo. (Server-Hosting, Datenbank &amp; Webspace-Flatrate per Musikschule).<br />
                  - <strong>GrooveLab-Modul Hosting:</strong> {masterPricing.priceGroovelab.toFixed(2).replace('.', ',')} € / Mo. (Server-Hosting, Datenbank &amp; Webspace-Flatrate per Musikschule).<br />
                  - <strong>Kombi-Vorteil Hosting:</strong> {masterPricing.priceKombi.toFixed(2).replace('.', ',')} € / Mo. (Infrastruktur-Bündel für beide Module, Ersparnis von {masterPricing.kombiSavings.toFixed(2).replace('.', ',')} € / Mo.).<br />
                  - <strong>Infrastruktur-Service-Fee:</strong> {masterPricing.priceTeacher.toFixed(2).replace('.', ',')} € / Mo. je aktivem Lehrer-Profil. Verwaltungs- und Sekretariats-User (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>admin</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>secretary</code>) sind inklusive.<br />
                  - <strong>Schüler-Infrastruktur-Fee:</strong> {masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. je aktiver Schülerin / aktivem Schüler.<br />
                  - <strong>Sammelzahler vs. Direktabrechnung:</strong> GrooveLab-Aktivierungen werden immer zu 100 % von der Musikschule getragen. Für das Campus-Modul kann wahlweise Direktabrechnung mit Eltern vereinbart werden.<br />
                  - <strong>Steuerlicher Hinweis (§ 19 UStG):</strong> <em>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</em>
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Urheberrecht &amp; Verbot geschützter Notenvervielfältigung (§ 60a UrhG, Art. 6 DSA)</strong><br />
                  Die Musikschule und ihre Lehrkräfte verpflichten sich, keine urheberrechtlich geschützten Notensätze, Leadsheets oder Play-Along-Aufnahmen Dritter ohne Lizenz hochzuladen (§ 60a Abs. 3 Nr. 2 UrhG Notenvervielfältigungsverbot). Der Betreiber haftet als technischer Host-Provider nach Art. 6 DSA erst ab Kenntnis (Notice-and-Takedown).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Raum-Engine &amp; Namensdarstellung</strong><br />
                  Lehrkraft-Raumbuchungen werden im System initial im Status unbestätigt (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>pending</code>) geführt und bedürfen der Freigabe durch das Sekretariat. Schülernamen werden auf Lehrer-Dashboards datenschutzkonform gekürzt (Vorname + Anfangsbuchstabe); Lehrkräfte werden zur eindeutigen Wiedererkennung mit vollständigem Namen geführt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. B2B-Gewährleistung &amp; Haftungsausschluss (§ 536a BGB)</strong><br />
                  Gegenüber Unternehmern (§ 14 BGB) wird die verschuldensunabhängige Schadensersatzhaftung des Betreibers für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB) ausdrücklich ausgeschlossen. Bei einfacher Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) begrenzt auf den vertragstypisch vorhersehbaren Schaden.
                </div>
              </div>

              {/* ── TEIL B: B2C FÜR ELTERN & SCHÜLER ── */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TEIL B: Bestimmungen für Eltern &amp; Schüler (B2C / § 13 BGB)
                </span>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Kostenfreier Schnuppermonat &amp; Schuljahres-Bereitstellung</strong><br />
                  Eltern, die das interaktive Campus-Modul für ihr Kind aktivieren, erhalten den laufenden Anmeldemonat zu 100% kostenfrei zum Kennenlernen. Für die verbleibenden Monate bis zum Schuljahresende (31. August) fällt der dynamisch errechnete Betrag von 0,49 € / Monat an.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. Gesetzliche Verbraucherrechte &amp; Keine Abofalle</strong><br />
                  Die gesetzlichen Mängelgewährleistungsrechte für Verbraucher bleiben uneingeschränkt bestehen. Es findet <strong>keine automatische Vertragsverlängerung</strong> über das Schuljahresende hinaus statt (Zero-Abofalle).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>8. Elektronischer Kündigungsbutton &amp; Sofort-Widerruf (§ 312k BGB)</strong><br />
                  Während des kostenfreien Schnuppermonats können Eltern den Zugang mit 1 Klick im Elternbereich sofort und ohne Kosten widerrufen. Nach Durchführung der Kündigung wird unverzüglich eine elektronische Kündigungsbestätigung mit Datum und Zeitstempel bereitgestellt.
                </div>
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
                Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden, E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#2563eb', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> / <a href="mailto:patrick.huber@musaek.de" style={{ color: '#2563eb', fontWeight: 700 }}>patrick.huber@musaek.de</a>) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Muster-Widerrufsformular:</strong><br />
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '6px' }}>
                  An: Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden, E-Mail: kontakt@campus-groovelab.de / patrick.huber@musaek.de<br /><br />
                  Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Bereitstellung des Zugangs Campus-Groovelab.<br />
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
