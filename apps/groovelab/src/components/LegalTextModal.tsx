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
                Angaben gemäß § 5 DDG (DE), § 5 ECG / § 25 MedienG (AT) &amp; Art. 3 Abs. 1 lit. s UWG (CH)
              </h4>

              <div style={{ background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#0f172a' }}>Diensteanbieter &amp; Betreiber der Plattform Campus-Groovelab:</strong><br />
                Patrick Huber<br />
                <span style={{ fontSize: '0.86rem', color: '#475569' }}>Softwareentwicklung &amp; Cloud-Dienstleistungen (Einzelunternehmen)</span><br />
                Karl-Fürstenberg-Str. 59<br />
                79618 Rheinfelden (Baden)<br />
                Deutschland
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Kontakt &amp; Schnelle elektronische Kontaktaufnahme (§ 5 Abs. 1 Nr. 2 DDG / Art. 3 UWG CH):</strong><br />
                E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#34a853', fontWeight: 700 }}>kontakt@campus-groovelab.de</a><br />
                Support &amp; Schulbetreuung: <a href="mailto:patrick.huber@musaek.de" style={{ color: '#34a853', fontWeight: 700 }}>patrick.huber@musaek.de</a><br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>⚡ Elektronische Schnellkontakt-Garantie (BGH I ZR 238/14 / EuGH C-298/07):</strong> Anfragen über unsere E-Mail- &amp; Support-Kanäle werden an Werktagen (Mo–Fr 08:00–18:00 Uhr) garantiert <strong>innerhalb von maximal 60 Minuten</strong> beantwortet. Allen registrierten Musikschulen, Lehrkräften und Schülern steht zudem ein direktes In-App-Support- und Ticket-System im persönlichen Dashboard zur Verfügung.
                </span>
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                  Website: <a href="https://campus-groovelab.de" target="_blank" rel="noopener noreferrer" style={{ color: '#34a853', fontWeight: 700 }}>campus-groovelab.de</a>
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Umsatzsteuer &amp; Steuerliche Einstufung (§ 5 Abs. 1 Nr. 6 DDG / § 6 UStG AT / Art. 8 MWSTG CH):</strong><br />
                - <strong>Deutschland:</strong> Umsatzsteuerbefreit gemäß <strong>§ 19 UStG (Kleinunternehmerregelung)</strong>. Es wird keine Umsatzsteuer erhoben oder ausgewiesen.<br />
                - <strong>Österreich:</strong> Umsatzsteuerbefreit gemäß <strong>§ 6 Abs. 1 Z 27 UStG 1994 (Kleinunternehmerregelung)</strong>.<br />
                - <strong>Schweiz:</strong> Leistungsort Schweiz gemäß <strong>Art. 8 Abs. 1 MWSTG</strong> (nicht im Inland steuerbar).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Verantwortlich für den redaktionellen Inhalt gemäß § 18 Abs. 2 MStV (DE) / Offenlegung gem. § 25 MedienG (AT):</strong><br />
                Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden)<br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>Grundlegende Richtung des Online-Mediums (Blattlinie gem. § 25 Abs. 4 MedienG AT):</strong> Information und Bereitstellung digitaler Werkzeuge zur pädagogischen Organisation und didaktischen Begleitung von Musikschulunterricht, Raum-, Stundenplan- und Terminplanung sowie didaktischem Instrumentalüben.
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>EU-Streitschlichtung &amp; Verbraucherstreitbeilegung (§ 36 VSBG):</strong><br />
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>https://ec.europa.eu/consumers/odr/</a>.<br />
                Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <strong>Haftung für Inhalte &amp; Links:</strong> Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG / § 16 ECG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Datenschutzerklärung (DSGVO / nDSG / TDDDG)
              </h4>

              <div>
                <strong style={{ color: '#0f172a' }}>1. Allgemeine Hinweise &amp; Verantwortlicher</strong><br />
                Der Schutz Ihrer Daten hat für <strong>Campus-Groovelab</strong> höchste Priorität. Verantwortlich im Sinne der DSGVO, des Schweizer nDSG und des österreichischen DSG ist Patrick Huber (Kontaktdaten siehe Impressum).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>2. Grundsatz der Datenminimierung, Zero-Mail-Architektur, Mindestalter &amp; Bildschirmfreies Üben („Screenless Practice“, Art. 5 &amp; 8 DSGVO / Art. 6 nDSG)</strong><br />
                (1) <strong>Keine Zahlungs- oder Bankdaten:</strong> Auf Campus-Groovelab werden keinerlei Bank-, SEPA-, Kreditkarten- oder Abrechnungsvertragsdaten gespeichert.<br />
                (2) <strong>Zero-Mail-Architektur:</strong> Weder von Schülern noch von Eltern, Lehrkräften oder Sekretariatsmitarbeitern werden private E-Mail-Adressen erhoben oder gespeichert. Die gesamte Authentifizierung und Profilzuordnung erfolgt tokenbasiert über physische Schulausweise, Passkeys oder serverseitig gehashte PINs. Einzig für den Schulleitungs-Account (B2B-Vertragspartner) wird eine offizielle Schul- bzw. Organisations-E-Mail-Adresse zur Vertragsabwicklung und Notfall-Authentifizierung hinterlegt.<br />
                (3) <strong>Namensdarstellung &amp; Schutz von Minderjährigen:</strong> Schülernamen werden im Lehrer-Dashboard zum Schutz von Minderjährigen stets datenschutzkonform auf „Vorname + N.“ (z. B. „Max M.“) gekürzt. Lehrkräftenamen werden hingegen auf allen Plattform-Oberflächen für Schüler und Eltern stets mit vollem Namen (Vorname + Nachname) angezeigt, um Transparenz und Verwechslungsfreiheit im Schulbetrieb zu gewährleisten.<br />
                (4) <strong>Mindestalter &amp; Bildschirmfreies Üben:</strong> Das Mindestalter für die Nutzung beträgt 6 Jahre. Zur Vermeidung unnötiger Bildschirmzeit bei jüngeren Kindern (insbesondere 6–9 Jahre) unterstützt die Plattform das didaktische Prinzip des <strong>bildschirmfreien Übens („Screenless Practice“)</strong>: Das Endgerät verbleibt bei den Erziehungsberechtigten; Übeeinheiten am echten akustischen Instrument werden per 1-Klick-Quittierung im Elternmodus verbucht (gedeckelt auf max. 60 Minuten pro Tag zur Missbrauchs- und Inflationsprävention).
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>3. Backend-for-Frontend (BFF) Architektur, IndexedDB Audio-Tresor &amp; Entbehrlichkeit eines Cookie-Banners (§ 25 Abs. 2 Nr. 2 TDDDG / § 165 TKG / Art. 6 nDSG)</strong><br />
                Zur Gewährleistung des Banking-Goldstandards setzt Campus-Groovelab eine <strong>Backend-for-Frontend (BFF) Gateway-Architektur</strong> ein. Der Browser speichert zu <strong>0% Zugriffs- oder Refresh-Tokens</strong> im ungeschützten Speicher (LocalStorage / SessionStorage). Stattdessen wird die Authentifizierung über ein rein serverseitig entschlüsselbares, mit <strong>AES-256-GCM (A256GCM)</strong> verschlüsseltes Session-Cookie (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>__Host-session</code>) mit den Schutzattributen <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>HttpOnly</code>, <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Secure</code>, <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>SameSite=Strict</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Path=/</code> verwaltet.<br />
                - <strong>IndexedDB Audio-Tresor (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>groovelab_audio_vault</code>):</strong> Lokaler Puffer auf dem Endgerät zur Gewährleistung eines stabilen Offline-Übe- und Playback-Betriebs in schallisolierten Proberäumen ohne Internetverbindung.<br />
                - <strong>Gesetzliche Ausnahme vom Einwilligungserfordernis:</strong> Sämtliche eingesetzten Technologien sind gemäß <strong>§ 25 Abs. 2 Nr. 2 TDDDG</strong> (DE) sowie <strong>§ 165 Abs. 3 TKG 2021</strong> (AT) technisch unbedingt erforderlich, um die vom Nutzer ausdrücklich aufgerufenen Kernfunktionen der Plattform bereitzustellen. Es werden <strong>keine Tracking-, Werbe- oder Drittanbieter-Analyse-Cookies</strong> eingesetzt. Ein Cookie-Banner ist daher gesetzlich nicht erforderlich.<br />
                - <strong>Proaktiver Silent Refresh &amp; CSRF-Guard:</strong> Tokens werden serverseitig 60 Sekunden vor Ablauf im Hintergrund erneuert; alle Schreibanfragen werden über <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Sec-Fetch-Site</code> vor CSRF geschützt.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>4. Eltern-Einwilligung bei Minderjährigen &amp; Einheitliche Altersgrenze (Art. 8 DSGVO / § 10 BDSG / Art. 6 revDSG)</strong><br />
                (1) <strong>Einheitlicher Schutzstandard für den DACH-Raum (Deutschland, Österreich, Schweiz):</strong> Da Musikschul-Unterrichtsverträge und Bildungsvereinbarungen im DACH-Raum fast ausnahmslos mit den Erziehungsberechtigten geschlossen werden, gilt plattformweit zur Gewährleistung maximalen Schutzes Minderjähriger eine einheitliche Altersgrenze: Jugendliche bis zum vollendeten <strong>16. Lebensjahr</strong> bedürfen zur Nutzung der Plattform der ausdrücklichen Freigabe und Einwilligung der Erziehungsberechtigten (Art. 8 Abs. 1 DSGVO / § 10 BDSG / Art. 6 revDSG).<br />
                (2) <strong>Zwei-Faktor-Elternverifikation ohne E-Mail-Tracking (Zero-Mail):</strong> Zur Gewährleistung maximaler Datenminimierung erfolgt der Nachweis der elterlichen Zustimmung über die physische Aushändigung des Schulausweises durch die Musikschule in Kombination mit der Vergabe einer geheimen, 4-stelligen Eltern-PIN. Dieser Vorgang wird mit Zeitstempel und Hash-Wert revisionssicher im Audit-Ledger protokolliert.<br />
                (3) <strong>Strikte Trennung nach § 73 UrhG (Koppelungsverbot):</strong> Die Einwilligung in die Speicherung didaktischer Audio-Aufnahmen (Loopstation) ist freiwillig und kann jederzeit unabhängig von der Schulnutzung widerrufen werden.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>5. Zero-Trust Session-Leasing, IndexedDB Audio-Tresor, Hardware-Sicherheit &amp; Ausschluss von Stimmbiometrie</strong><br />
                Audiodaten aus der In-App Loopstation und dem Meisterwerk-Protokoll werden verschlüsselt im EU-Cloud-Speicher abgelegt und sind durch mandanten- und schülerspezifische Storage-RLS-Policies geschützt. Nach dem Löschen einer Aufnahme wird die Datei physisch und vollständig aus dem Cloud-Speicher entfernt. Für Offline-Übephasen in Proberäumen steht ein lokaler, hardware-geschützter <strong>IndexedDB Audio-Tresor (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>groovelab_audio_vault</code>)</strong> zur Verfügung. PINs und Zugangsschlüssel werden mit <strong>OWASP- und BSI-konformem PBKDF2 Zero-Knowledge Hashing (100.000 SHA-512 / SHA-256 Runden)</strong> verarbeitet. Das integrierte <strong>Zero-Trust Session-Leasing</strong> ermöglicht Schulleitung und Lehrkräften jederzeit den 1-Click Remote-Logout aktiver Geräte. Bei Verlassen des Moduls oder Tab-Wechsel schaltet ein automatischer Guard alle Mikrofon-Tracks (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MediaStreamTrack.stop()</code>) ab.<br />
                <strong>⚡ Strikter Ausschluss von Stimmbiometrie (Art. 9 DSGVO / Art. 6 nDSG):</strong> Audiodaten dienen ausschließlich dem didaktischen Playback und dem häuslichen Üben (Art. 6 Abs. 1 lit. b DSGVO / Art. 6 nDSG). Es werden zu keinem Zeitpunkt biometrische Stimm-, Sprecher- oder Verhaltensmusteranalysen (Art. 9 DSGVO) durchgeführt.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>6. Reine Metadaten-Architektur &amp; Urheberrechts-Immunität (UrhG &amp; DSA)</strong><br />
                Campus-Groovelab speichert, hostet und vervielfältigt keine urheberrechtlich geschützten Noten-PDFs oder Notensätze. In der Mediathek und Repertoireverwaltung werden ausschließlich nicht-personenbezogene, urheberrechtsfreie bibliografische Werkdaten (Songtitel, Komponist/Interpret, Lehrwerkstitel, Seitenzahl) sowie externe Referenzlinks (Spotify, YouTube, Tomplay) verarbeitet.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>7. Hosting in ISO 27001-zertifizierten Rechenzentren &amp; Stündliche Backups (Art. 28 &amp; 32 DSGVO)</strong><br />
                Das Hosting von App, BFF-Gateway und PostgreSQL-Datenbank erfolgt zu 100% in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/Nürnberg, Deutschland) mit Auftragsverarbeitungsverträgen (AVV) nach Art. 28 DSGVO bzw. Art. 9 nDSG. Sämtliche Datenbankbestände werden durch ein stündlich automatisiertes, verschlüsseltes Backup-System auf dedizierten Volumes vor Datenverlust geschützt.
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>8. Betroffenenrechte &amp; Aufsichtsbehörden (Art. 15 bis 22 DSGVO / Art. 25 ff. revDSG)</strong><br />
                Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18) sowie Beschwerde bei der zuständigen Aufsichtsbehörde (Deutschland: Landesbeauftragte für den Datenschutz / BfDI; Österreich: Datenschutzbehörde DSB, Barichgasse 40–42, 1030 Wien; Schweiz: Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter EDÖB, Feldeggweg 1, CH-3003 Bern).<br />
                <span style={{ fontSize: '0.80rem', color: '#475569', display: 'block', marginTop: '4px' }}>
                  <strong>Hinweis für Nutzer in der Schweiz:</strong> Die Datenverarbeitung erfolgt auf ISO 27001-zertifizierten Servern in Deutschland. Der Schweizer Bundesrat hat mit Beschluss vom 25. August 2023 festgestellt, dass Deutschland über ein angemessenes Schutzniveau für personenbezogene Daten verfügt (Art. 16 Abs. 1 revDSG i. V. m. Anhang 1 VDSG).
                </span>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>9. Kommunales Löschkonzept nach DIN 66398 &amp; 2-Stufen-Statusarchitektur</strong><br />
                Die Speicherdauer richtet sich nach dem strukturierten Kommunalen Löschkonzept (5 Löschklassen):<br />
                • <strong>LK 1 (Session &amp; Temporärdaten):</strong> Sofortiger Verfall bei Sitzungsbeendigung / RAM-Zeroization.<br />
                • <strong>LK 2 (Didaktische Audio-Aufnahmen):</strong> Erhaltung für die Dauer des laufenden Schuljahres (bis 31.08.) inkl. Vorab-Exportmöglichkeit (ZIP/MP3); sofortige physische Löschung bei manueller Nutzerlöschung.<br />
                • <strong>LK 3 (Abrechnungsstatus / Sparmodus):</strong> Nach 60 Tagen Inaktivität ohne Login wird das Profil fair-play-konform auf Basis-Bereitstellung (0,09 €) umgestellt. Daten, QR-Landingpage und Stundenplan bleiben 100% aktiv.<br />
                • <strong>LK 4 (Bildungsbiografie &amp; Meisterwerke):</strong> Gemeisterte Stücke und Jahres-Badges (reine Metadaten gem. Art. 6 Abs. 1 lit. b DSGVO) verbleiben über Schuljahre hinweg (mehrjährig) im Profil; physische Löschung erfolgt 30 Tage nach formeller Exmatrikulation / Kündigung.<br />
                • <strong>LK 5 (B2B-Abrechnungsbelege):</strong> 10 Jahre Aufbewahrungsfrist gem. § 147 AO (strikte B2B-Sammelrechnung ohne Schüler-Klarnamen).
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Allgemeine Geschäftsbedingungen (AGB) – Campus-Groovelab
              </h4>

              {/* ── TEIL A: B2B FÜR MUSIKSCHULEN & KOMMUNALE TRÄGER ── */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TEIL A: Bestimmungen für Musikschulen, Kommunale Träger &amp; Bildungsträger (B2B / Juristische Personen des öffentlichen &amp; privaten Rechts)
                </span>

                <div>
                  <strong style={{ color: '#0f172a' }}>1. Vertragsgegenstand, Rechtsnatur, Pädagogischer Add-On-Status &amp; Notfall-Klausel (SaaS-Mietvertrag)</strong><br />
                  (1) Diese Bestimmungen regeln die Bereitstellung der cloudbasierten Schulmanagement- und Übeplattform <strong>Campus-Groovelab</strong> durch den Betreiber Patrick Huber (Einzelunternehmer). Der Vertrag qualifiziert sich rechtlich als <strong>Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH)</strong> über die Bereitstellung von Cloud-Infrastruktur, Datenbank-Hosting, Datensicherung und Systemwartung.<br />
                  (2) <strong>Pädagogischer Add-On-Charakter:</strong> Campus-Groovelab ist ein didaktisches Zusatzwerkzeug zur Unterstützung des Fachunterrichts und des häuslichen Übens. Die Plattform ersetzt kein behördliches oder amtliches Schulverwaltungssystem (wie ASV, WinSchool oder Musikschul-Manager).<br />
                  (3) <strong>Notfall- &amp; Nachrangigkeitsklausel:</strong> Die Musikschule stellt sicher, dass der reguläre Schulbetrieb und die primäre Notfallkommunikation (Telefon, E-Mail, herkömmliche Vertretungspläne) unabhängig von der Plattform gewährleistet bleiben. Bei kurzzeitigen Serverstörungen, Netzausfällen oder Wartungsfenstern findet der Schulunterricht regulär statt. Eine Haftung des Betreibers für ausgefallene Unterrichtsstunden, verpasste Bandproben oder Honorarausfälle ist ausgeschlossen, es sei denn, der Ausfall beruht auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Betreibers oder der schuldhaften Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht). Die Haftungsregelungen gemäß § 6 dieser AGB gelten vollumfänglich.<br />
                  (4) Soweit im Rahmen der Bereitstellung personenbezogene Daten verarbeitet werden, gilt ergänzend die Vereinbarung zur Auftragsverarbeitung (AVV gemäß Art. 28 DSGVO bzw. Art. 9 nDSG) als integraler Vertragsbestandteil.<br />
                  (5) Der Betreiber gewährleistet eine Verfügbarkeit der Cloud-Infrastruktur von 99,5 % im Jahresmittel (ausgenommen angekündigte Wartungsarbeiten außerhalb der Kernunterrichtszeiten).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>2. Bereitstellungsmodell &amp; Hosting-Pauschalen (DACH-Region)</strong><br />
                  - <strong>Campus-Groovelab Software-Bereitstellung:</strong> 0,00 € / CHF 0.00 (Inklusive). Die Software wird im Rahmen des gebuchten Cloud-Infrastruktur-Pakets ohne gesonderte Lizenzkaufgebühren bereitgestellt.<br />
                  - <strong>Cloud- &amp; Datenbank-Hosting: Modul Campus:</strong> 14,90 € / Mo. (DE/AT) bzw. CHF 19.90 / Mo. (CH) (Server-Hosting, Datenbank &amp; Webspace-Flatrate per Musikschule).<br />
                  - <strong>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab:</strong> 9,90 € / Mo. (DE/AT) bzw. CHF 14.90 / Mo. (CH) (Server-Hosting, Datenbank &amp; Webspace-Flatrate per Musikschule).<br />
                  - <strong>Kombi-Vorteilsrabatt (Infrastruktur-Bündel):</strong> -4,90 € / Mo. (DE/AT) bzw. -4.90 CHF / Mo. (CH) bei gemeinsamer Buchung beider Module (Bündelpreis: 19,90 € / Mo. bzw. CHF 29.90 / Mo.).<br />
                  - <strong>Service- &amp; Administrationspauschale:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktive Lehrkraft. Verwaltungs- und Sekretariats-User (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>admin</code> und <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>secretary</code>) sind dauerhaft inklusive (0,00 € / CHF 0.00).<br />
                  - <strong>Basis-Bereitstellung:</strong> 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je Schüler (QR-Landingpage, Stundenplan-, Termin-, Raumänderungs-Sync sowie DSGVO/nDSG-Hosting).<br />
                  - <strong>Cloud- &amp; Modul-Bereitstellung Campus:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll).<br />
                  - <strong>Cloud- &amp; Modul-Bereitstellung GrooveLab:</strong> 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive Band-Nutzung: Songs, Repertoire, Live Lab; immer zu 100 % von der Musikschule übernommen).<br />
                  - <strong>Sammelzahler vs. Direktabrechnung:</strong> GrooveLab-Aktivierungen werden immer zu 100 % von der Musikschule getragen. Für das Campus-Modul kann wahlweise Direktabrechnung mit Eltern vereinbart werden. Schüler-Direktabrechnungen werden ausnahmslos als einmaliger Jahresbeitrag (5,88 € in DE/AT bzw. CHF 12.00 in CH pro Schuljahr bzw. 4,80 € / CHF 9.60 bei Schulbezuschussung) abgerechnet – niemals monatlich.<br />
                  - <strong>Bestandsschutz-Garantie (Price-Lock):</strong> Der Betreiber garantiert der Musikschule für die Dauer der ununterbrochenen Vertragslaufzeit absolute Preisstabilität auf die bei Vertragsschluss vereinbarten monatlichen Basis-Hosting- und Bereitstellungspauschalen. Preisanpassungen für Neukunden haben keinerlei Auswirkung auf bestehende Verträge. Bei einer Kündigung und späteren Neuanmeldung gilt der zum Zeitpunkt der Neuanmeldung gültige Neukundentarif.<br />
                  - <strong>Steuerliche Hinweise:</strong> In Deutschland und Österreich gemäß § 19 UStG (DE) bzw. § 6 Abs. 1 Z 27 UStG (AT) umsatzsteuerbefreit (Kleinunternehmerregelung). Für die Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>3. Vertragslaufzeit, Unterjähriger Einstieg &amp; Kündigung der Schul-Infrastruktur</strong><br />
                  (1) Der Vertragsbeginn und die Bereitstellung der Cloud-Infrastruktur können jederzeit zu jedem beliebigen Kalendertag des Jahres erfolgen. Die Vertragslaufzeit richtet sich nach dem von der jeweiligen Musikschule im System konfigurierten Schuljahreszeitraum (standardmäßig 01. September bis 31. August bzw. der landes- und schulartspezifische Stichtag). Bei unterjährigem Einstieg läuft die initiale Vertragslaufzeit ab dem Bereitstellungsdatum bis zum individuellen Ende des laufenden Schuljahres.<br />
                  (2) Für die Folgezeit verlängert sich der Vertrag jeweils um ein weiteres volles Schuljahr (12 Monate bis zum jeweiligen Schuljahresstichtag), sofern er nicht mit einer Frist von einem (1) Monat zum Ende des Schuljahres in Textform (z. B. per E-Mail oder über das Dashboard) gekündigt wird.<br />
                  (3) Bei unterjährigem Einstieg werden anfallende Bereitstellungs- und Infrastrukturpauschalen zeitanteilig (pro rata temporis) ab dem Monat der Freischaltung bis zum individuellen Schuljahresende berechnet.<br />
                  (4) Neuanmeldungen, Modul-Aktivierungen sowie Abmeldungen einzelner Schüler- oder Lehrkräfte-Profile können während des laufenden Schuljahres jederzeit flexibel und tagesgenau im Administrations-Dashboard vorgenommen werden.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>4. Reine Metadaten-Architektur, Urheberrecht, Verwertungsgesellschaften (GEMA / AKM / SUISA) &amp; Notice-and-Takedown (§ 60a UrhG DE / § 42f UrhG AT / Art. 19 URG CH / Art. 6 &amp; 16 DSA)</strong><br />
                  (1) <strong>Reine Metadaten-Architektur:</strong> Die Plattform Campus-Groovelab speichert, hostet und vervielfältigt keine urheberrechtlich geschützten Notensätze, Tabulaturen oder geschützten Verlags-Partituren. Die Mediathek verarbeitet ausschließlich freie bibliografische Metadaten (Interpret, Titel, Tonart, Besetzung, Lehrwerkstitel und Seitenzahlen) sowie Verlinkungen zu lizenzierten externen Mediendiensten (z. B. Spotify, YouTube) oder autorisierten Noten-Plattformen (z. B. Tomplay).<br />
                  (2) <strong>Verwertungsgesellschaften-Klarstellung (GEMA, AKM, SUISA):</strong> Der Betreiber betreibt keine öffentliche Streaming-Mediathek geschützter Musikwerke. Aus diesem Grund entstehen durch die bloße Plattformbereitstellung keine gesonderten Melde- oder Vergütungspflichten der Plattform gegenüber Verwertungsgesellschaften (GEMA in Deutschland, AKM/Austro-Mechana in Österreich, SUISA in der Schweiz). Die Lizenzierung des eigentlichen Präsenzunterrichts und von Schulaufführungen obliegt der Musikschule über die jeweils bestehenden Gesamtverträge ihrer Landes- oder Bundesverbände.<br />
                  (3) <strong>Verbot des Uploads / Verlinkens unlizenzierter Notensätze:</strong> Lehrkräften und Nutzern ist es streng untersagt, urheberrechtlich geschützte Noten-PDFs, Leadsheets, Verlags-Scans oder Verweise auf offensichtlich rechtswidrige Quellen in der Plattform abzulegen (§ 60a Abs. 3 Nr. 2 UrhG [DE], § 42f UrhG [AT], Art. 19 URG [CH]).<br />
                  (4) <strong>Haftungsprivileg &amp; Notice-and-Takedown-Verfahren (Art. 6 &amp; 16 DSA):</strong> Der Betreiber stellt lediglich die technische Vermittlungsinfrastruktur bereit und haftet als Host-Provider gemäß Art. 6 Digital Services Act (DSA) erst ab tatsächlicher Kenntnis rechtswidriger Inhalte. Urheberrechtsinhaber und Verlage können Beanstandungen jederzeit über das elektronische Melde- und Abhilfeverfahren an <a href="mailto:copyright@campus-groovelab.de" style={{ color: '#2563eb', textDecoration: 'underline' }}>copyright@campus-groovelab.de</a> übermitteln. Berechtigt beanstandete Verweise werden unverzüglich gesperrt oder entfernt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>5. Autonomie von Honorarlehrkräften (Herrenberg-Compliance nach BSG B 12 R 3/20 R) &amp; Ausschluss von Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / BPersVG)</strong><br />
                  (1) Die Funktionen zur Raum-, Termin- und Stundenplanung innerhalb von Campus-Groovelab stellen rein didaktisch-organisatorische Hilfsmittel und unverbindliche Dispositionsvorschläge dar. Die Plattform übt zu keinem Zeitpunkt eine automatisierte Weisung, Zuweisung oder arbeitgeberseitige Direktionsgewalt gegenüber selbstständigen Lehrkräften (Honorarkräften) aus. Soweit selbstständige Lehrkräfte die Plattform nutzen, obliegt diesen die freie und eigenverantwortliche zeitliche und inhaltliche Abstimmung der Unterrichtstermine mit den Schülern.<br />
                  (2) Die Musikschule stellt in eigener Verantwortung sicher, dass der tatsächliche Einsatz von Honorarkräften den sozialversicherungsrechtlichen Kriterien des Bundessozialgerichts entspricht. Eine Überwachung von Anwesenheitszeiten oder didaktischen Inhalten durch den Betreiber findet nicht statt.<br />
                  (3) <strong>Ausschluss von Leistungs- und Verhaltenskontrolle:</strong> Die Plattform verzichtet auf jegliche Funktionen zur Mitarbeiterbewertung oder automatisierten Leistungs- und Verhaltenskontrolle. Es werden keine Kennzahlen zu Reaktionszeiten auf Chat-Nachrichten, durchschnittlichen Übezeiten der Schülerklassen oder Anwesenheitsquoten zur Mitarbeiterbewertung aggregiert oder an Schulleitungen übermittelt.<br />
                  (4) <strong>Recht auf Nichterreichbarkeit &amp; asynchrone Kommunikation (§ 5 ArbSchG):</strong> Die interne Chat- und Benachrichtigungsfunktion („Shouts“) ist als rein asynchrones didaktisches Informationsmedium konzipiert. Lehrkräfte sind zu keinem Zeitpunkt verpflichtet, außerhalb ihrer individuellen Unterrichtszeiten oder an unterrichtsfreien Tagen Nachrichten abzurufen oder zu beantworten.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>6. Raum-Engine &amp; Namensdarstellung (Schutz von Minderjährigen)</strong><br />
                  Lehrkraft-Raumbuchungen werden im System initial im Status unbestätigt (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>pending</code>) geführt und bedürfen der Freigabe durch das Sekretariat. Schülernamen werden auf Lehrer-Dashboards datenschutzkonform gekürzt (Vorname + Anfangsbuchstabe); Lehrkräfte werden zur eindeutigen Wiedererkennung mit vollständigem Namen geführt.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>7. B2B-Gewährleistung, Haftungsbegrenzung, Rechtswahl &amp; Gerichtsstand (§ 536a BGB DE / § 1096 ABGB AT / Art. 259a OR CH)</strong><br />
                  (1) Gegenüber Unternehmern und juristischen Personen des öffentlichen Rechts wird die verschuldensunabhängige Schadensersatzhaftung des Betreibers für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB [DE] / § 1096 ABGB [AT] / Art. 259a OR [CH]) ausdrücklich ausgeschlossen. Bei einfacher Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) begrenzt auf den vertragstypisch vorhersehbaren Schaden.<br />
                  (2) <strong>Rechtswahl &amp; Gerichtsstand:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Ist die Musikschule bzw. der Vertragspartner Kaufmann, eine juristische Person des öffentlichen Rechts oder ein öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Sitz des Betreibers (Lörrach / Rheinfelden).
                </div>
              </div>

              {/* ── TEIL B: B2C FÜR ELTERN & SCHÜLER ── */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TEIL B: Bestimmungen für Eltern &amp; Schüler (B2C / § 13 BGB)
                </span>

                <div>
                  <strong style={{ color: '#0f172a' }}>8. Kostenfreier Schnuppermonat, Schuljahres-Bereitstellung &amp; Schüler-Bestandsschutz (Ausschließliche Jahresbeitragszahlung)</strong><br />
                  (1) Eltern, die das interaktive Campus-Modul für ihr Kind aktivieren, erhalten den laufenden Anmeldemonat zu 100 % kostenfrei zum Kennenlernen. Für die verbleibenden Monate bis zum individuellen Schuljahresende der Schule wird die Bereitstellung als einmaliger Jahresbeitrag (errechnet aus 0,49 € in DE/AT bzw. CHF 1.00 in CH pro bezahltem Monat) abgerechnet. Eine monatliche Einzelabrechnung ist zur Vermeidung unverhältnismäßiger Transaktionsgebühren ausgeschlossen.<br />
                  (2) <strong>Schuljahresübergang &amp; Schüler-Bestandsschutz:</strong> Bei einer Aktivierung im letzten Monat des Schuljahres ist der Zugang für diesen verbleibenden Restmonat vollständig kostenfrei zum Kennenlernen. Für das Folgeschuljahr gilt für Schüler und Eltern der Bestandsschutz der jeweiligen Musikschule: Solange der Vertrag zwischen der Musikschule und dem Betreiber ununterbrochen fortbesteht, bleibt der Jahresbeitrag für die Schüler dieser Musikschule preisstabil. Eine Erhöhung der Schülerbeiträge für Bestandskunden ist ausgeschlossen.<br />
                  (3) <strong>Mindestalter &amp; Bildschirmfreies Üben (Screenless Practice):</strong> Das Mindestalter für Schüler beträgt 6 Jahre. Zur Vermeidung unnötiger Bildschirmzeit bei Grundschulkindern unterstützt die Plattform das didaktische Prinzip des bildschirmfreien Übens („Screenless Practice“): Im Modus „Von Eltern geführt“ verbleibt das Endgerät bei den Eltern; Übezeiten am echten Instrument werden per 1-Klick-Quittierung verbucht.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>9. Gesetzliche Verbraucherrechte &amp; Keine automatische Verlängerung (Zero-Abofalle)</strong><br />
                  Die gesetzlichen Mängelgewährleistungsrechte für Verbraucher bleiben uneingeschränkt bestehen. Es findet <strong>keine automatische Vertragsverlängerung</strong> über das Schuljahresende hinaus statt. Der Zugang endet automatisch zum konfigurierten Schuljahresende, sofern er nicht für das Folgeschuljahr aktiv bestätigt wird.
                </div>

                <div>
                  <strong style={{ color: '#0f172a' }}>10. Elektronischer Kündigungsbutton &amp; Sofort-Widerruf (§ 312k BGB)</strong><br />
                  Während des kostenfreien Schnuppermonats können Eltern den Zugang mit 1 Klick im Elternbereich sofort und ohne Kosten widerrufen. Nach Durchführung der Kündigung wird unverzüglich eine elektronische Kündigungsbestätigung mit Datum und Zeitstempel bereitgestellt.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Widerrufsbelehrung &amp; Muster-Widerrufsformular
              </h4>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-12px' }}>
                (Gültig für Verbraucher/Eltern bei Schüler-Direktabrechnung gemäß § 312g BGB i. V. m. Art. 246a EGBGB)
              </div>

              {/* 1. Widerrufsbelehrung */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#1e40af', fontSize: '0.92rem' }}>1. Widerrufsrecht für Verbraucher</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', lineHeight: 1.6, color: '#1e3a8a' }}>
                  Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses (Aktivierung des Profils).
                </p>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Ausübung des Widerrufs:</strong><br />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                  Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', margin: '8px 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#0f172a' }}>
                  <strong>Patrick Huber – Softwareentwicklung &amp; Cloud-Dienstleistungen</strong><br />
                  Karl-Fürstenberg Str. 59, 79618 Rheinfelden, Deutschland<br />
                  E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#2563eb', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> / <a href="mailto:patrick.huber@musaek.de" style={{ color: '#2563eb', fontWeight: 700 }}>patrick.huber@musaek.de</a>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                  mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief, E-Mail oder über die elektronische Widerrufsfunktion im Eltern-Portal) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>Fristwahrung:</strong><br />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                  Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
                </p>
              </div>

              {/* 2. Folgen des Widerrufs */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '18px' }}>
                <strong style={{ color: '#166534', fontSize: '0.92rem' }}>2. Folgen des Widerrufs</strong><br />
                <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', lineHeight: 1.6, color: '#14532d' }}>
                  Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
                </p>
                <div style={{ marginTop: '10px', fontSize: '0.80rem', lineHeight: 1.5, color: '#166534', borderTop: '1px solid #86efac', paddingTop: '10px' }}>
                  <strong>Kostenfreier Probemonat &amp; Wertersatz-Ausschluss:</strong><br />
                  Da die Bereitstellung im ersten Monat bzw. der Kennenlernphase vollständig kostenfrei erfolgt, schulden Sie im Falle eines Widerrufs während der Probezeit keinerlei Wertersatz oder Nutzungsentschädigung. Mit Wirksamwerden des Widerrufs erlischt die digitale Zugangsberechtigung zum Campus-Modul.
                </div>
              </div>

              {/* 3. Schweiz-Hinweis */}
              <div style={{ fontSize: '0.80rem', color: '#64748b', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>3. Besondere Hinweise für Nutzer in der Schweiz:</strong><br />
                Für Nutzer mit Wohnsitz in der Schweiz gewährt der Betreiber diese 14-tägige Widerrufsfrist auf freiwilliger vertraglicher Basis im gleichen Umfang.
              </div>

              {/* 4. Muster-Widerrufsformular */}
              <div>
                <strong style={{ color: '#0f172a' }}>4. Muster-Widerrufsformular:</strong><br />
                <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 8px 0' }}>
                  (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.76rem', lineHeight: 1.7, color: '#1e293b' }}>
                  An:<br />
                  Patrick Huber – Softwareentwicklung &amp; Cloud-Dienstleistungen<br />
                  Karl-Fürstenberg Str. 59, 79618 Rheinfelden, Deutschland<br />
                  E-Mail: kontakt@campus-groovelab.de / patrick.huber@musaek.de<br /><br />
                  Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Bereitstellung des Zugangs Campus-Groovelab (Modul Campus).<br /><br />
                  - Bestellt am (*) / freigeschaltet am (*): _______________________________<br />
                  - Name des/der Verbraucher(s): _________________________________________<br />
                  - Name des Schülers / Kindes: _________________________________________<br />
                  - Anschrift des/der Verbraucher(s): ______________________________________<br />
                  - Datum: ________________________<br />
                  - Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ______________________<br /><br />
                  (*) Unzutreffendes streichen.
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
