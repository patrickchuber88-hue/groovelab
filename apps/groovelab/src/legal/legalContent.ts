// ==============================================================================
// 🏛️ Campus-Groovelab Enterprise Legal Content & Cryptographic Hashes
// Standards: OWASP ASVS Level 3 / Art. 7, 8, 28 DSGVO / § 307 BGB / § 1631 BGB
// ==============================================================================

export interface LegalChangelog {
  version: string;
  title: string;
  date: string;
  highlights: string[];
}

export interface LegalReleaseConfig {
  activeVersion: string;
  minimumEnforcedVersion: string;
  changelogs: Record<string, LegalChangelog>;
}

export const LEGAL_RELEASE_CONFIG: LegalReleaseConfig = {
  activeVersion: '2026.4',
  minimumEnforcedVersion: '2026.1', // 🛡️ Bestandsschutz: 2026.1 bleibt rechtswirksam; kein Zwangsaussperren für Bestandskunden
  changelogs: {
    '2026.4': {
      version: '2026.4',
      title: 'Rollout-Readiness & BGH Insurance Hardening',
      date: '18.09.2026',
      highlights: [
        'Volljuristische Entkoppelung des B2B-Haftungsdeckels (max. 10.000 €) von Regulierungsentscheidungen des Versicherers (§ 307 BGB)',
        'SLA-Wartungsfenster: Zulässiges tägliches Regelfenster von Montag bis Sonntag 00:00–06:00 Uhr (Berlin) mit 24h-Vorankündigung',
        'Lückenlose Verankerung der unbedingten Bruttopreisgarantie für Bestandskunden bei Übergang zur Regelbesteuerung',
        'Herrenberg-Präzisierung: Raumbelegungsanfrage durch Lehrkraft und Verfügbarkeitsbestätigung durch das Schulsekretariat',
        'Ausschluss der verschuldensunabhängigen Garantiehaftung für anfängliche Mängel gem. § 536a Abs. 1 Alt. 1 BGB'
      ]
    },
    '2026.3': {
      version: '2026.3',
      title: 'Zero-Liability & Stand-Alone AVV Release',
      date: '17.09.2026',
      highlights: [
        'Volljuristische Härtung der B2B-Haftungshöchstgrenze mit Koppelung an die 2.000.000 € IT- und Cyber-Haftpflichtpolice',
        'Subsidiaritäts- & Redundanz-Doktrin zur Enthaftung bei Unterrichtsausfällen (§ 254 BGB Schadenminderungspflicht)',
        'BGH-feste Hold-Harmless-Freistellungsklauseln ohne unverhältnismäßiges „erstes Anfordern“',
        'Herrenberg-Compliance & Enthaftungsschild gegenüber Sozialversicherungsträgern (§ 7a SGB IV / BSG B 12 R 3/20 R)',
        'Stand-Alone B2B Auftragsverarbeitungsvertrag (Art. 28 DSGVO) inklusive Anlage 1 und Anlage 2 (Art. 32 TOM-Katalog)',
        'B2B Service Level Agreement (SLA & 99,5 % Verfügbarkeitsgarantie mit klaren Störungsklassen)',
        'Muster-Datenschutzinformation nach Art. 13 DSGVO für Musikschulen zur Schüler- und Eltern-Weitergabe',
        'Institutionelle Kinderschutz-Charta & Grenzachtungs-Kodex gem. § 8a SGB VIII / BKiSchG',
        'Zwingende aktive Opt-In-Checkbox für B2B-AGB und AVV beim Schul-Onboarding',
        'Rechtssichere Button-Lösung gem. § 312j Abs. 3 BGB bei entgeltlichen Elternaktivierungen'
      ]
    },
    '2026.2': {
      version: '2026.2',
      title: 'Präzisierung Didaktik & Urheberschutz',
      date: '13.09.2026',
      highlights: [
        'Präzisierung des didaktischen Audio-Tresors für Instrumental-, Gesangs- und Sprachaufnahmen bis Schuljahresende',
        'Transparente Subdienstleister-Information gem. Art. 28 Abs. 2 DSGVO und 48h-Vorfallsmeldung',
        'Ausschluss von Gesundheitsdaten & Verankerung der radikalen Datenminimierung für Schüler',
        'Ausdrücklicher Urheberschutz an eigenen Audio-Loops und Notizen (§ 3 Abs. 2 Didaktik-Kodex)',
        'Stärkung der pädagogischen Autonomie & des didaktischen Assistenz-Prinzips (§ 1)',
        'Klarstellung des Botenstatus in der Terminkommunikation (§ 4)'
      ]
    },
    '2026.1': {
      version: '2026.1',
      title: 'Initiales Enterprise Legal Framework',
      date: '07.09.2026',
      highlights: [
        'B2B Auftragsverarbeitungsvertrag gem. Art. 28 DSGVO (ISO 27001 RZ Hetzner Falkenstein/Nürnberg)',
        'Dienstliche Nutzungsvereinbarung & Didaktik-Kodex für Lehrkräfte gem. § 1631 BGB',
        'DSGVO-Minderjährigenschutz und Botenmodell im Schülerbereich'
      ]
    }
  }
};

export const ACTIVE_LEGAL_VERSION = LEGAL_RELEASE_CONFIG.activeVersion;
export const MINIMUM_ENFORCED_VERSION = LEGAL_RELEASE_CONFIG.minimumEnforcedVersion;

/**
 * Compares two version strings (e.g. '2026.2' vs '2026.1').
 * Returns true if vCandidate is at least vTarget (>=).
 */
export function isVersionAtLeast(vCandidate: string, vTarget: string): boolean {
  if (!vCandidate || !vTarget) return false;
  if (vCandidate === vTarget) return true;
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
  const [cMaj, cMin = 0] = parse(vCandidate);
  const [tMaj, tMin = 0] = parse(vTarget);
  if (cMaj !== tMaj) return cMaj > tMaj;
  return cMin >= tMin;
}

export function getLegalChangelog(version: string): LegalChangelog | null {
  return LEGAL_RELEASE_CONFIG.changelogs[version] || null;
}

export interface LegalDocumentDefinition {
  type: string;
  title: string;
  subtitle: string;
  badge: string;
  isMandatory: boolean;
  version: string;
  summaryPoints: string[];
  fullTextMarkdown: string;
  checkboxLabel: string;
}

/**
 * Calculates or formats a SHA-256 checksum of a given text.
 */
export async function computeSha256(text: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text.trim());
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('[LegalContent] SubtleCrypto failed, using deterministic hash fallback:', e);
  }
  // Deterministic fallback hash if Web Crypto is unavailable
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sha256_fallback_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export const LEGAL_DOCUMENTS: Record<string, LegalDocumentDefinition> = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. B2B INFRASTRUKTURVERTRAG & AGB TEIL A (FÜR MUSIKSCHULEN & TRÄGER)
  // ──────────────────────────────────────────────────────────────────────────
  terms_b2b_avv: {
    type: 'terms_b2b_avv',
    title: 'B2B-Infrastrukturvertrag & Auftragsverarbeitung (AVV)',
    subtitle: 'Für Schulleitung, Verwaltung und autorisierte Trägervertreter',
    badge: 'Verwaltung / B2B',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      '0,00 € Lizenzgebühren für die Software: Bereitstellung als reiner, flexibler Cloud-Service gem. § 535 BGB (keine teure Kaufsoftware, keine Investitionskosten)',
      'Didaktisches Ergänzungs-Werkzeug: Bereichert den Musikschulalltag, ersetzt aber bewusst kein bestehendes Schulverwaltungssystem (wie iMikel, MSVplus oder Musikschul-Manager; § 254 BGB)',
      'Volle Datenhoheit bei der Musikschule (Art. 4 Nr. 7 DSGVO): Weisungsgebundene Auftragsverarbeitung (AVV nach Art. 28 DSGVO) inklusive vollständiger TOMs',
      '100 % Datenschutz-Souveränität (Standort Deutschland): Ausschließliches Hosting in ISO 27001-zertifizierten Rechenzentren (Hetzner, Nürnberg/Falkenstein) • 0 % US-Cloud-Abhängigkeit',
      '24-Stunden-Sicherheitspuffer für die Schulleitung: Vorfallsmeldung des Betreibers binnen 48 Stunden zur stressfreien Wahrung der 72h-Behördenfrist (Art. 33 DSGVO)',
      'Pädagogische Freiheit & Herrenberg-Schutzschild: Freiheit der Unterrichtsgestaltung für Lehrkräfte; Ausschluss von Weisungsbefugnis und Leistungsüberwachung (BSG Herrenberg-Urteil)',
      'Verlässlicher 2.000.000 € Versicherungsschutz: Haftung für einfache Fahrlässigkeit auf den vertragstypischen Schaden begrenzt, maximal gedeckelt durch eine gewerbliche 2-Mio.-€ IT- & Cyber-Police',
      'Moderne Cloud-Wartung statt Mängelhaftung alter Prägung: Kontinuierliche Fehlerbehebung; Ausschluss verschuldensunabhängiger Garantiehaftung (§ 536a BGB) & 12 Monate Verjährung'
    ],
    checkboxLabel: 'Ich bestätige als vertretungsberechtigte Person der Musikschule den B2B-Infrastrukturvertrag (AGB Teil A) sowie die Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO) inklusive der Technisch-Organisatorischen Maßnahmen (TOMs).',
    fullTextMarkdown: `
### 1. Vertragsgegenstand, Rechtsnatur, Pädagogischer Add-On-Status & Subsidiaritäts-Grundsatz (SaaS-Mietvertrag)
(1) Diese Bestimmungen regeln die Bereitstellung der cloudbasierten Schulmanagement- und Übeplattform **Campus-Groovelab** durch den Betreiber Patrick Huber (Einzelunternehmen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland; nachfolgend „Betreiber“). Der Vertrag qualifiziert sich rechtlich als **Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH)** über die Bereitstellung von schlüsselfertiger Cloud-Infrastruktur, Datenbank-Hosting, Datensicherung und Systemwartung.
(2) **Software-Bereitstellung & Lizenzgebühren-Freiheit:** Die Basis-Software wird im Rahmen des gebuchten Cloud-Infrastruktur-Pakets ohne gesonderte Software-Lizenzkaufgebühren bereitgestellt (0,00 € / CHF 0.00 inklusive). Die Vergütung bemisst sich ausschließlich nach den vertraglich vereinbarten monatlichen Server-Hosting-, Bereitstellungs- und Infrastrukturpauschalen.
(3) **Pädagogischer Add-On-Charakter & Subsidiaritäts-Grundsatz (Fast-Track / Convenience-Doktrin):** Campus-Groovelab ist ein didaktisches Zusatz-, Erleichterungs- und Übermittlungswerkzeug („Convenience-Tool / Fast-Track-Option“) zur Beschleunigung und didaktischen Bereicherung des Musikschulalltags. Die Plattform ersetzt ausdrücklich kein amtliches Schulverwaltungssystem (ERP-Software wie iMikel, MSVplus oder Musikschul-Manager) und stellt zu keinem Zeitpunkt den ausschließlichen oder verbindlich vorgeschriebenen Dienst-, Weisungs- oder Kommunikationskanal der Musikschule dar.
(4) **Primärwege & Weisungsautonomie der Schule:** Die offizielle dienstrechtliche Kommunikation, verbindliche Arbeitsanweisungen der Schulleitung sowie die hoheitliche Verwaltung von Schüler- und Honorarstammdaten verbleiben vollumfänglich auf den herkömmlichen Primärkanälen der Musikschule (behördliche E-Mail, interne Kommunikationssysteme wie MS Teams, Telefon, behördliche ERP-Software oder Aushang). Lehrkräfte und Mitarbeiter sind zu jedem Zeitpunkt berechtigt, Stundenpläne, Raumwünsche und Terminänderungen alternativ auf dem herkömmlichen Weg (per E-Mail, telefonisch oder schriftlich) an das Schulsekretariat zu übermitteln.
(5) **Raumbuchungen & Terminabstimmungen unter Vorbehalt (Technisches Botenmodell):** Raumbuchungsanfragen, Stundenplanübermittlungen und Terminabstimmungen in der Plattform stellen unverbindliche Voranfragen („unter Vorbehalt“) bzw. technische Botenübermittlungen im Auftrag des Nutzers dar; sie begründen zu keinem Zeitpunkt eine automatische Buchungsgarantie oder rechtsgeschäftliche Bindungswirkung für das Raum- und Stundenkontingent der Musikschule. Die verbindliche Zuteilung und Einpflege in das amtliche Schul-ERP obliegt allein der Schulleitung bzw. dem Schulsekretariat.
(6) **Notfall-, Nachrangigkeits- & Schadenminderungsklausel (§ 254 BGB):** Die Musikschule verpflichtet sich im Rahmen ihrer vertraglichen Schadensminderungspflicht (§ 254 BGB), den regulären Schulbetrieb und die primäre Notfallkommunikation (Telefon, E-Mail, herkömmliche Vertretungspläne) unabhängig von der Plattform redundant vorzuhalten. Bei kurzzeitigen Serverstörungen, Netzausfällen oder Wartungsfenstern findet der Schulunterricht regulär statt; Raum- und Terminabstimmungen sind über die Primärkanäle abzuwickeln. Eine Haftung des Betreibers für ausgefallene Unterrichtsstunden, verpasste Bandproben oder Honorarausfälle ist ausgeschlossen, es sei denn, der Ausfall beruht auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Betreibers.
(7) **Vertragsschluss & Annahmevorbehalt:** Die Darstellung der Plattform im Internet stellt kein bindendes Angebot, sondern eine Aufforderung zur Abgabe einer Bestellung dar (invitatio ad offerendum). Ein Rechtsanspruch auf Abschluss eines Nutzungsvertrages oder die Bereitstellung eines Schul-Tenants besteht nicht. Der Betreiber behält sich vor, Registrierungsanfragen von Einrichtungen nach pflichtgemäßem Ermessen – insbesondere bei Kapazitätsengpässen oder berechtigten Sicherheitsbedenken – abzulehnen.

### 2. Auftragsverarbeitungsvertrag gem. Art. 28 DSGVO & Datensouveränität
(1) **Verantwortlichkeit & Weisungsgebundenheit:** Die Musikschule ist und bleibt datenschutzrechtlich die alleinige „Verantwortliche“ (Art. 4 Nr. 7 DSGVO) für alle von ihr verarbeiteten Schüler-, Lehrkräfte- und Verwaltungsdaten. Der Betreiber verarbeitet personenbezogene Daten ausschließlich als weisungsgebundener Auftragsverarbeiter (Art. 28 DSGVO) zur Erfüllung dieses Vertrages. Ergänzend gilt die gesonderte Vereinbarung zur Auftragsverarbeitung (AVV) als integraler Vertragsbestandteil.
(2) **Ausschließlicher Serverstandort Deutschland:** Sämtliche Verarbeitungen von personenbezogenen Daten und Cloud-Speicherungen erfolgen ausnahmslos auf ISO/IEC 27001-zertifizierten Servern innerhalb der Bundesrepublik Deutschland (Standort Hetzner Online GmbH, Falkenstein/Vogtland & Nürnberg, Deutschland).
(3) **Zero-US-Cloud & Schrems II Compliance:** Der Betreiber setzt für die Speicherung und Bereitstellung personenbezogener Daten keine US-Cloud-Hyperscaler ein. Das System ist vollständig immun gegen Zugriffe nach dem US CLOUD Act und FISA 702.
(4) **Subdienstleister & Vorab-Information (Art. 28 Abs. 2 DSGVO):** Als Infrastruktur-Subdienstleister wird Hetzner Online GmbH eingesetzt. Bei beabsichtigten Änderungen an Unterauftragnehmern wird die Schule mindestens vierzehn (14) Tage vorab in Textform informiert; der Schule steht ein Widerspruchsrecht aus wichtigem, nachgewiesenem datenschutzrechtlichem Grund zu. Bei unaufschiebbaren Notfall-Migrationen zur Abwehr akuter Sicherheitsstörungen informiert der Betreiber die Schulleitung unverzüglich nach Durchführung.
(5) **Vorfallsmeldung binnen 48 Stunden:** Der Betreiber meldet Verletzungen des Schutzes personenbezogener Daten (Art. 33 Abs. 2 DSGVO) unverzüglich, spätestens binnen 48 Stunden nach Bekanntwerden, an die Schulleitung, sodass der Schule ein ausreichender Puffer zur Erfüllung der gesetzlichen 72-Stunden-Meldepflicht nach Art. 33 DSGVO verbleibt.
(6) **Zero-AI- & Zero-Model-Training-Garantie:** Sämtliche im Auftrag verarbeiteten Daten (insbesondere Schüler-, Lehrkräfte-, Stundenplan-, Text- und didaktische Audioaufnahmen) werden zu 0 % für das Training von Machine-Learning-Algorithmen, Large Language Models (LLMs) oder generativer künstlicher Intelligenz verwendet. Eine Weitergabe an externe KI-Modellanbieter ist ausgeschlossen.
(7) **Kommunales Löschkonzept nach DIN 66398 & Vertragsbeendigung:** Bei Vertragsbeendigung werden alle Mandantendaten nach Ablauf einer 30-tägigen Karenzfrist zur Datenextraktion unwiederbringlich und revisionssicher physisch gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten (z. B. § 147 AO für steuerliche Rechnungsbelege) entgegenstehen.

### 3. Kanonische Gebührenstruktur, Fair-Play-Entlastung & Zahlungsbedingungen
(1) **Gebührenübersicht (Legal SaaS-Nomenklatur):**
- **Campus-Groovelab Software-Bereitstellung:** 0,00 € / CHF 0.00 (Inklusive).
- **Cloud- & Datenbank-Hosting Modul Campus:** 14,90 € / Mo. (DE/AT) bzw. CHF 19.90 / Mo. (CH) feste Server-Flatrate je Musikschule.
- **Cloud- & Datenbank-Hosting Modul GrooveLab:** 9,90 € / Mo. (DE/AT) bzw. CHF 14.90 / Mo. (CH) feste Server-Flatrate je Musikschule.
- **Kombi-Vorteilsrabatt (Infrastruktur-Bündel):** -4,90 € / Mo. (DE/AT) bzw. -4.90 CHF / Mo. (CH) bei gemeinsamer Buchung beider Module (Flatrate: 19,90 € / Mo. bzw. CHF 29.90 / Mo.).
- **Service- & Administrationspauschale:** 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktive Lehrkraft. Verwaltungs- und Sekretariats-Profile (Rollen admin und secretary) sind dauerhaft 100 % inklusive (0,00 €).
- **Basis-Bereitstellung:** 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je registrierter Schüler (QR-Landingpages, Stundenplan-, Termin-Sync & DSGVO-Hosting).
- **Cloud- & Modul-Bereitstellung Campus:** 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive App: Übe-Timer, Loopstation, Hausaufgaben).
- **Cloud- & Modul-Bereitstellung GrooveLab:** 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (Bands, Songs; wird ausnahmslos zu 100 % von der Musikschule getragen).
(2) **Sammelzahler vs. Schüler-Direktabrechnung:** GrooveLab-Aktivierungen werden verbindlich immer zu 100 % von der Musikschule übernommen. Für das Campus-Modul kann die Musikschule Schüler-Direktabrechnung vereinbaren. Schüler-Direktabrechnungen mit Eltern erfolgen ausnahmslos als einmaliger Schuljahres-Jahresbeitrag (max. 11 × 0,49 € = 5,39 € in DE/AT bzw. 11 × CHF 1.00 = CHF 11.00 in CH pro Schuljahr; 1. Monat 100 % kostenfrei) – niemals als monatliche Einzelabbuchung.
(3) **Fair-Play Inaktivitäts-Entlastung:** Loggt sich ein Schüler über einen Zeitraum von mehr als sechzig (60) aufeinanderfolgenden Tagen nicht aktiv ein, wird das Profil automatisch auf passive Basis-Bereitstellung (0,09 € / CHF 0.20 / Mo.) umgestellt, um die Schule vor unnötigen Kosten zu schützen.
(4) **Steuerliche Behandlung & Bruttopreisgarantie:** Soweit der Betreiber die Kleinunternehmerregelung in Anspruch nimmt, erfolgt die Abrechnung gem. § 19 UStG (DE) bzw. § 6 Abs. 1 Z 27 UStG (AT) ohne gesonderten Umsatzsteuerausweis. Bei Übergang zur Regelbesteuerung gilt für Bestandskunden die unbedingte **Bruttopreisgarantie**: Der zu zahlende Rechnungsbetrag bleibt centgenau identisch; die Mehrwertsteuer wird aus dem vereinbarten Betrag herausgerechnet (§ 14 UStG). In der Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).
(5) **BGH-konformes Aufrechnungsverbot:** Die Musikschule kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen. Dieser Ausschluss gilt ausdrücklich *nicht* für Gegenforderungen aus demselben Vertragsverhältnis, die auf Leistungsverweigerungsrechten, Minderung oder mangelbedingten Schadensersatzansprüchen beruhen (Synallagma).

### 4. Reine Metadaten-Architektur für Noten, Cover-Aufnahmen (§§ 53, 60a UrhG) & Notice-and-Takedown (Art. 6 & 16 DSA)
(1) **Ausschluss von Verlagsnoten & Masteraufnahmen:** Die Plattform speichert und hostet zu 0 % urheberrechtlich geschützte Notensätze, Leadsheets, Tabulaturen oder Verlags-Partituren als PDF sowie keine kommerziellen Original-Masteraufnahmen. Verarbeitet werden ausschließlich freie bibliografische Metadaten sowie Verlinkungen zu lizenzierten Fremddiensten (Spotify, YouTube, Tomplay).
(2) **Didaktische Schüleraufnahmen & Privatkopie:** Im Rahmen des Unterrichts gehostete Schüler-Übungsaufnahmen (didaktische Cover-Versionen) dienen rein dem pädagogischen Feedback mit der Lehrkraft (§ 60a UrhG) sowie dem geschlossenen privaten Kreis der Familie (§ 53 Abs. 1 UrhG). Es existiert keine öffentliche Mediathek und kein unberechtigter Fremdzugriff.
(3) **GEMA / AKM / SUISA Klarstellung:** Durch die bloße Bereitstellung der Plattform entstehen keine gesonderten Melde- oder Vergütungspflichten der Plattform gegenüber Verwertungsgesellschaften. Die Lizenzierung des Präsenzunterrichts und von Aufführungen obliegt der Musikschule über die Rahmenverträge ihrer Verbände.
(4) **Notice-and-Takedown Engine (Art. 6 & 16 DSA / § 10 DDG):** Als Host-Provider haftet der Betreiber gemäß Art. 6 DSA erst ab tatsächlicher Kenntnis rechtswidriger Inhalte. Beanstandungen können an copyright@campus-groovelab.de übermittelt werden. Berechtigt beanstandete Inhalte werden serverseitig unverzüglich, spätestens binnen 24 Stunden, global deaktiviert (HTTP 410 Resource Suspended).
(5) **BGH-fester Freistellungsanspruch:** Die Musikschule trägt die organisatorische Verantwortung dafür, dass ihre Lehrkräfte und Schüler keine rechtswidrigen Inhalte einstellen. Sollte der Betreiber von Urhebern, Verlagen oder Verwertungsgesellschaften wegen Inhalten der Nutzer der Musikschule in Anspruch genommen werden, stellt die Musikschule den Betreiber von allen berechtigten Ansprüchen Dritter einschließlich der erforderlichen angemessenen Kosten der Rechtsverteidigung frei, es sei denn, die Musikschule hat die Rechtsverletzung nachweislich nicht zu vertreten.

### 5. Arbeitszeit-Compliance, Herrenberg-Schutzschild (BSG B 12 R 3/20 R) & Kinderschutz (§ 8a SGB VIII)
(1) **Arbeitgeber-Alleinverantwortung nach dem Arbeitszeitgesetz (ArbZG):** Campus-Groovelab ist ein asynchrones pädagogisches Arbeits- und Lernmittel. Die Musikschule ist als Arbeitgeberin allein verantwortlich für die Einhaltung der Vorschriften des ArbZG, der Höchstarbeitszeiten sowie der 11-stündigen Ruhezeit (§ 5 ArbZG). Dem Personal steht das Recht auf Nichterreichbarkeit uneingeschränkt zu.
(2) **Herrenberg-Compliance & Freistellung bei Honorarkräften (§ 7a SGB IV / BSG B 12 R 3/20 R):** Campus-Groovelab dient den Lehrkräften zur didaktischen Unterstützung und begründet zu keinem Zeitpunkt eine Weisungs- oder Direktionsgewalt. Der Stundenplan- und Raumbelegungsprozess folgt dem zweiseitigen Ressourcenmodell: Lehrkräfte stimmen Termine autonom mit Schülern ab und übermitteln unverbindliche Raumreservierungsanfragen; das Schulsekretariat prüft lediglich Kollisionen und bestätigt die Raumverfügbarkeit (keine hoheitliche Terminzuteilung). Lehrkräften steht die Übermittlungsfreiheit auf herkömmlichen Wegen vollumfänglich offen. Bindet die Musikschule freie Mitarbeiter ein, stellt sie in eigener Verantwortung sicher, dass keine weisungsgebundene Eingliederung im Sinne der BSG-Rechtsprechung (Herrenberg-Urteil) vorliegt. Die Schule stellt den Betreiber von jeglichen Nachforderungen von Sozialversicherungsbeiträgen oder Säumniszuschlägen durch Sozialkassen (§ 7a SGB IV) im Innenverhältnis frei, sofern diese auf der internen Beauftragungspraxis der Schule beruhen.
(3) **Institutioneller Kinderschutz & Vier-Augen-Prinzip (§ 8a SGB VIII):** Chatverläufe zwischen Lehrkräften und minderjährigen Schülern sind für Erziehungsberechtigte über das Eltern-Portal transparent einsehbar (Vier-Augen-Prinzip). Ein unüberwachter Privatchat zwischen Minderjährigen untereinander ist serverseitig ausgeschlossen. Verdachtsmeldungen können an kinderschutz@campus-groovelab.de gerichtet werden.
(4) **Ausschluss von Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG):** Die Plattform verzichtet vollständig auf Funktionen zur Verhaltens- oder Leistungskontrolle von Lehrkräften.

### 6. B2B-Gewährleistung, Haftungsbegrenzung & Versicherungsschutz
(1) **Ausschluss anfänglicher Mängel (§ 536a Abs. 1 Alt. 1 BGB):** Die verschuldensunabhängige Haftung des Betreibers für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB [DE] / § 1096 ABGB [AT] / Art. 259a OR [CH]) wird ausdrücklich und vollumfänglich ausgeschlossen.
(2) **Haftungsmaßstab:** Bei einfacher Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) begrenzt auf den vertragstypisch vorhersehbaren Schaden. Die Haftung für entgangenen Gewinn, mittelbare Schäden, Mangelfolgeschäden oder ausgefallene Unterrichtsstunden ist ausgeschlossen.
(3) **BGH-konformer B2B Liability Cap & Versicherungsschutz (§ 307 BGB):**
(a) Der Betreiber unterhält zur Absicherung von Großschäden und Cyberrisiken eine gewerbliche IT-Vermögensschaden- sowie eine Cyber-Risiko-Versicherung mit einer Deckungssumme von mindestens 2.000.000,00 € je Versicherungsfall.
(b) Für Schäden, die durch einfache Fahrlässigkeit bei Verletzung von wesentlichen Vertragspflichten (Kardinalpflichten) verursacht werden, ist die Haftung des Betreibers der Höhe nach auf den vertragstypisch vorhersehbaren Schaden begrenzt, maximal jedoch auf die Summe der vom Kunden in den vorangegangenen zwölf (12) Monaten tatsächlich an den Betreiber gezahlten Netto-Vergütung (höchstens 10.000,00 € bzw. CHF 10'000.00 je Kalenderjahr).
(c) Die Haftungsgrenze nach Buchstabe (b) gilt als eigenständige, unbedingte Höchstbegrenzung im Sinne von § 307 BGB und besteht unabhängig davon, ob oder in welcher Höhe der Versicherer im konkreten Schadensfall leistet.
(d) Die vorstehenden Haftungsbegrenzungen gelten nicht bei Vorsatz, grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie bei gesetzlich zwingender Haftung (Produkthaftungsgesetz).
(4) **Mitverschuldensklausel bei Datenverlust (§ 254 BGB):** Für Datenverlust haftet der Betreiber der Höhe nach nur insoweit, als der Schaden auch bei ordnungsgemäßer und täglicher Datensicherung durch den Kunden bzw. über die integrierten Exportwerkzeuge entstanden wäre (beschränkt auf den typischen Wiederherstellungsaufwand).
(5) **12-monatige Verjährungsverkürzung:** Gewährleistungs- und Schadensersatzansprüche des Kunden verjähren innerhalb von zwölf (12) Monaten ab gesetzlichem Verjährungsbeginn (ausgenommen Ansprüche wegen Vorsatz, grober Fahrlässigkeit sowie Personenschäden).
(6) **Rechtswahl & Gerichtsstand:** Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Ausschließlicher Gerichtsstand für alle Streitigkeiten mit Kaufleuten oder juristischen Personen des öffentlichen Rechts ist der Sitz des Betreibers (Lörrach / Rheinfelden).
(7) **Salvatorische Erhaltungsklausel (§ 306 Abs. 2 BGB):** Sollten Bestimmungen unwirksam sein, treten an deren Stelle die gesetzlichen Vorschriften.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. AGB TEIL B: B2C FÜR ELTERN & SCHÜLER
  // ──────────────────────────────────────────────────────────────────────────
  terms_student_platform: {
    type: 'terms_student_platform',
    title: 'Plattform-Nutzungsbedingungen (Campus-Groovelab)',
    subtitle: 'Für Schülerinnen, Schüler und Erziehungsberechtigte',
    badge: 'Schüler & Eltern / Basis',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Kostenfreie Nutzung der didaktischen Lern-App im Rahmen des Musikschulunterrichts',
      'Zivilrechtliche Vertragspartnerschaft bis 18 Jahre (§ 2 BGB): Vertragspartner sind ausnahmslos die Erziehungsberechtigten',
      'Datenschutzrechtliche Mündigkeit ab 16 Jahren (Art. 8 DSGVO): Eigenständige Audio-Einwilligung für Übe-Aufnahmen',
      'Zero-Abofalle (§ 9): Keine automatische Vertragsverlängerung; Zugang endet automatisch zum Schuljahresende',
      'Kostenfreier Schnuppermonat bei Campus-Aktivierung mit 1-Klick-Sofortwiderruf im Elternportal',
      'Button-Lösung nach § 312j BGB: Gesetzliche Pflichtinformationen und klare Beschriftung vor Zahlungsfreigabe',
      'Pädagogischer Enthaftungsschild: Kein geschuldeter Lernerfolg; rein unterstützende Übe-Werkzeuge',
      'Botenmodell bei Unterrichtsabsagen: Formelle Kündigungen des Musikschulvertrags sind über die App ausgeschlossen'
    ],
    checkboxLabel: 'Ich akzeptiere die Plattform-Nutzungsbedingungen für Campus-Groovelab (bei Minderjährigen unter 18 Jahren durch die Erziehungsberechtigten bzw. mit deren ausdrücklicher Einwilligung).',
    fullTextMarkdown: `
### 1. Leistungsbeschreibung, Kostenfreiheit & Zivilrechtliche Vertragspartnerschaft (§ 2 & §§ 106 ff. BGB)
(1) Campus-Groovelab bietet Schülerinnen, Schülern und Eltern eine geschützte digitale Begleitung für den Instrumental-, Gesangs- und Ensembleunterricht an Musikschulen.
(2) **Zivilrechtliche Vertragspartnerschaft bis zur Volljährigkeit:** Bei minderjährigen Schülerinnen und Schülern bis zur Vollendung des 18. Lebensjahres (gesetzliche Volljährigkeit gem. § 2 BGB) sind und bleiben ausnahmslos die Erziehungsberechtigten Vertragspartner für die Plattformnutzung sowie für etwaige entgeltliche Zusatzmodule (wie Schüler-Jahresbeiträge bei Direktabrechnung). Minderjährige können ohne ausdrückliche Einwilligung ihrer gesetzlichen Vertreter keine vertraglichen Zahlungsverpflichtungen begründen (§§ 106 ff. BGB).
(3) **Gemeinsames Sorgerecht & Vertretungsvermutung (§ 1629 Abs. 1 Satz 2 BGB):** Meldet ein Elternteil ein minderjähriges Kind an oder schaltet Module frei, versichert dieser Elternteil an Eides statt, zur gesetzlichen Vertretung allein berechtigt zu sein oder im ausdrücklichen Einvernehmen und mit Vollmacht des weiteren sorgeberechtigten Elternteils zu handeln. Der handelnde Elternteil stellt den Plattformbetreiber sowie die Musikschule im Innenverhältnis von allen Ansprüchen oder Einwendungen des anderen Elternteils frei.
(4) Für Schülerinnen und Schüler entstehen durch die reine Basisnutzung keine gesonderten Lizenzkaufgebühren (0,00 € inklusive).

### 2. Jugendschutz, Datenschutz-Mündigkeit (Art. 8 DSGVO) & Zero-AI-Garantie
(1) **Datenschutzrechtliche Mündigkeit:**
- Bis zum vollendeten 16. Lebensjahr bedürfen datenschutzrechtliche Einwilligungen (insbesondere in didaktische Audioaufnahmen im Übe-Studio gem. Art. 8 Abs. 1 DSGVO und § 22 KUG) der zwingenden Autorisierung durch die Erziehungsberechtigten (über die PIN-geschützte Elternfreigabe).
- Jugendliche zwischen dem vollendeten 16. und dem 18. Lebensjahr besitzen die gesetzliche Mündigkeit, ihre datenschutzrechtliche Einwilligung in didaktische Audioaufnahmen selbstständig zu erteilen oder zu widerrufen. Die zivilrechtliche Vertragspartnerschaft für das Benutzerkonto verbleibt hiervon unberührt bis zum 18. Lebensjahr bei den Erziehungsberechtigten.
(2) **Radikale Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO):** Im Schülerprofil werden keine Bankdaten, keine E-Mail-Adressen, keine Telefonnummern und keine sensiblen Vertragsdaten gespeichert. Zur Wahrung des Prinzips der Datenminimierung wird bei Schülern ausschließlich der Tag des Geburtstags (Tag 1..31) für didaktische Kalenderfunktionen erhoben (kein Monat, kein Jahr). Reale Porträtfotos sind im Schülerbereich untersagt; es kommen stilisierte Musiker-Avatare zum Einsatz.
(3) Schülernamen werden im Lehrerbereich datensparsam pseudonymisiert dargestellt („Vorname + N.“).
(4) **Zero-AI-Garantie:** Die Plattform ist zu 100 % werbefrei. Didaktische Audioaufnahmen, Notizen und Nutzungsdaten werden zu 0 % für das Training von Machine-Learning-Algorithmen oder generativer künstlicher Intelligenz verwendet.
(5) **Kinderschutz-Clearing:** Bei Hinweisen auf Grenzverletzungen steht die Clearing-Adresse kinderschutz@campus-groovelab.de zur Verfügung.

### 3. Keine automatische Verlängerung (Zero-Abofalle), Schnuppermonat & Button-Lösung (§ 312j BGB)
(1) **Keine automatische Verlängerung:** Es findet keine automatische Vertragsverlängerung über das Schuljahresende hinaus statt. Der Zugang endet automatisch zum konfigurierten Schuljahresende der Schule, sofern er nicht aktiv für das Folgeschuljahr bestätigt wird.
(2) **Kostenfreier Schnuppermonat:** Eltern, die das Campus-Modul im Wege der Direktabrechnung aktivieren, erhalten den laufenden Anmeldemonat zu 100 % kostenfrei zum Kennenlernen. Für die verbleibenden Monate bis zum individuellen Schuljahresende wird die Bereitstellung als einmaliger Jahresbeitrag (max. 5,39 € / CHF 11.00 pro Schuljahr) abgerechnet.
(3) **Button-Lösung nach § 312j Abs. 3 BGB:** Soweit eine entgeltliche Buchung ausgelöst wird, erfolgt die Bestätigung über eine eindeutig mit „Zahlungspflichtig bestellen“ beschriftete Schaltfläche. Unmittelbar darüber werden Gesamtpreis, Laufzeit und Leistungsumfang transparent zusammengefasst.
(4) **Sofort-Widerruf im Schnuppermonat:** Während des Schnuppermonats können Eltern den Zugang mit 1 Klick im PIN-geschützten Elternbereich sofort und kostenfrei beenden.

### 4. Pädagogischer Enthaftungsschild (Keine Erfolgsgarantie) & Sensorik
(1) **Kein geschuldeter Lernerfolg:** Der Betreiber stellt rein technische Hilfsmittel (Übe-Timer, Metronom, Loopstation, Gamification) bereit. Die didaktische Unterrichtsgestaltung, der persönliche Lernerfolg, Schulnoten, Prüfungsergebnisse und die tatsächliche musikalische Beherrschung des Instruments verbleiben in der ausschließlichen pädagogischen Verantwortung von Musikschule, Lehrkraft und Schüler. Ein bestimmter Lernerfolg wird nicht geschuldet und ist ausgeschlossen.
(2) **Endgeräte- & Sensorik-Ausschluss:** Die Funktion gerätespezifischer Features (z. B. Display-Down-Sensorik beim Übe-Timer) hängt von der Hardware des Endgeräts ab. Für Messungenauigkeiten oder Betriebssystemeinschränkungen des Endgeräts übernimmt der Betreiber keine Haftung.

### 5. Technischer Botenstatus bei Unterrichtsabsagen & Ausschluss von Hauptvertragskündigungen
(1) **Elektronische Botenfunktion:** Soweit Schüler oder Erziehungsberechtigte über die Plattform (Terminkalender, Shoutbox) Termine absagen oder Mitteilungen senden, agiert die Plattform als reiner technischer Übermittlungsbote im Auftrag des Absenders.
(2) **Verhältnis zum Musikschulunterrichtsvertrag:** Mitteilungen über die App berühren die zwischen den Erziehungsberechtigten und der Musikschule vereinbarten Unterrichts-, Honorar- und Nachholregelungen nicht.
(3) **Ausschluss formbedürftiger Erklärungen:** Rechtserhebliche Willenserklärungen, die den Bestand des Unterrichtsvertrags mit der Musikschule betreffen (insbesondere formelle Kündigungen des Musikschulvertrags), können über Campus-Groovelab **nicht** wirksam erklärt werden. Sie sind zwingend auf den herkömmlichen Primärwegen der Musikschule (schriftlich oder per E-Mail an das Sekretariat) einzureichen.
(4) **Ausschluss von Gesundheitsdaten (Art. 9 DSGVO):** Mitteilungen über Abwesenheiten beschränken sich auf die Angabe „verhindert“. Die Eingabe von Diagnosen, Symptomen oder Attesten ist strengstens untersagt.

### 6. Verbraucherstreitbeilegung (§ 36 VSBG) & Salvatorische Klausel
(1) Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Die OS-Plattform der EU ist erreichbar unter: https://ec.europa.eu/consumers/odr.
(2) Sollten Bestimmungen unwirksam sein, gelten die gesetzlichen Vorschriften (§ 306 Abs. 2 BGB).
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DIENSTLICHE NUTZUNGSVEREINBARUNG & DIDAKTIK-KODEX FÜR LEHRKRÄFTE
  // ──────────────────────────────────────────────────────────────────────────
  terms_teacher_conduct: {
    type: 'terms_teacher_conduct',
    title: 'Dienstliche Nutzungsvereinbarung & Didaktik-Kodex',
    subtitle: 'Für Lehrkräfte und musikpädagogische Dozenten',
    badge: 'Lehrkräfte / Didaktik',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Didaktische Assistenz-Technologie zur Unterstützung des individuellen Unterrichtsalltags',
      'Freiwillige Nutzung („Fast-Track-Option“) ohne arbeitgeberseitige Weisungs- oder Direktionswirkung',
      'Gesetzliche Aufsichtspflicht (§ 1631 BGB / § 832 BGB): Verbleibt personell und räumlich vollumfänglich bei der Lehrkraft vor Ort',
      'Herrenberg-Compliance: Übermittlungsfreiheit für Stundenpläne; Entwürfe als pädagogisches Vorschlagsrecht unter Genehmigungsvorbehalt',
      'Vollständiger Verbleib der Urheberrechte an eigenen Übe-Loops, Notizen und didaktischen Beiträgen bei der Lehrkraft',
      'Strikter Ausschluss von automatisierter Leistungs- oder Verhaltenskontrolle gem. § 87 Abs. 1 Nr. 6 BetrVG / LPVG'
    ],
    checkboxLabel: 'Ich erkenne die dienstlichen Nutzungsbedingungen sowie den Didaktik-Kodex an und nehme ausdrücklich zur Kenntnis, dass die gesetzliche Aufsichtspflicht (§ 1631 BGB) personell bei der Lehrkraft vor Ort verbleibt.',
    fullTextMarkdown: `
### 1. Präambel, didaktische Autonomie & Assistenz-Prinzip
(1) Campus-Groovelab versteht sich als didaktische und organisatorische Assistenz-Technologie, die den Lehrkräften zur optimalen Gestaltung ihres individuellen Unterrichtsalltags dient. Sie dient ausdrücklich nicht dazu, Lehrkräfte in vorgegebene Schulleitungsabläufe einzugliedern oder ihr pädagogisches Wirken fremdzubestimmen. Die didaktische und methodische Freiheit der Lehrkraft bleibt in vollem Umfang gewahrt.
(2) Die Nutzung von Campus-Groovelab ist für die Lehrkraft freiwillig („Convenience-Tool / Fast-Track-Option“) und stellt keinen verpflichtenden Dienst- oder Weisungskanal dar. Der Lehrkraft steht es frei, Unterrichtsinhalte, Hausaufgaben und Terminabsprachen über andere Kanäle (z. B. analoges Hausaufgabenheft, Telefon, E-Mail) zu organisieren.
(3) Der Zugang wird der Lehrkraft von ihrer Musikschule zur Vorbereitung, Durchführung und didaktischen Nachbereitung des Instrumental- und Ensembleunterrichts bereitgestellt. Die Plattform darf nicht für unterrichtsfremde, rein private oder gewerbliche Zwecke außerhalb des Musikschulbetriebs genutzt werden.

### 2. Gesetzliche Aufsichtspflicht (§ 1631 BGB / § 832 BGB)
(1) Campus-Groovelab ist ein didaktisches und organisatorisches Übungsbegleitungs- und Kommunikationswerkzeug.
(2) Die Plattform entfaltet zu keinem Zeitpunkt eine personelle Aufsichts- oder Überwachungswirkung. Die gesetzliche und vertragliche Aufsichtspflicht über minderjährige Schülerinnen und Schüler verbleibt vollumfänglich und persönlich bei der Lehrkraft im Rahmen des Präsenz- oder Online-Unterrichts vor Ort.
(3) Für das Erscheinen, den Aufenthalt im Schulgebäude sowie die ordnungsgemäße Beaufsichtigung von Minderjährigen gelten die herkömmlichen gesetzlichen, tariflichen und schulordnungsrechtlichen Bestimmungen der Musikschule.

### 3. Didaktische Audioaufnahmen, Urheberrechte & Loopstation
(1) Über die Plattform angefertigte oder übermittelte Audioaufnahmen (Hausaufgaben-Audios, Loopstation-Spuren) dienen ausschließlich dem individuellen Lernfortschritt des jeweiligen Schülers.
(2) Sämtliche Urheber- und Nutzungsrechte an von der Lehrkraft selbst erstellten Übungsmaterialien und Audio-Loops verbleiben uneingeschränkt bei der Lehrkraft.
(3) Eine Veröffentlichung oder Weitergabe von Schüleraufnahmen an Dritte außerhalb des geschützten Unterrichtskontexts ist der Lehrkraft streng untersagt.

### 4. Datengeheimnis, Vertraulichkeit & Ausschluss von Gesundheitsdaten (Art. 9 DSGVO)
(1) Die Lehrkraft verpflichtet sich, alle Schüler- und Kollegendaten vertraulich zu behandeln und Zugangsdaten vor dem Zugriff unbefugter Dritter zu schützen.
(2) Das Anfordern oder Speichern von Diagnosen, Attesten oder sensiblen Gesundheitsdaten Minderjähriger (Art. 9 DSGVO) ist untersagt. Bei Unterrichtsausfällen genügt die Angabe „verhindert“.

### 5. Stundenplan-Planung & Genehmigungsvorbehalt (§ 106 GewO)
(1) Im Stundenplan-Designer erstellte Entwürfe stellen ein pädagogisches Vorschlagsrecht der Lehrkraft dar und entfalten vor ihrer formalen Prüfung und Freigabe durch das Schulsekretariat bzw. die Schulleitung keinerlei Rechtsverbindlichkeit nach außen.
(2) Bis zur rechtswirksamen Genehmigung eines neuen Stundenplans durch das Sekretariat verbleibt der bestehende, genehmigte Stundenplan unverändert in Kraft.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. FREIWILLIGE EINWILLIGUNG IN DIDAKTISCHE AUDIO-AUFNAHMEN
  // ──────────────────────────────────────────────────────────────────────────
  consent_media_audio: {
    type: 'consent_media_audio',
    title: 'Freiwillige Einwilligung in didaktische Audio-Aufnahmen',
    subtitle: 'Gemäß Art. 8 DSGVO und § 22 Kunsturhebergesetz (KUG)',
    badge: 'Medienfreigabe / Freiwillig',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Freiwillige Freigabe für instrumentale und stimmliche Übe-Audios (Instrument, Gesang, Loopstation, Übe-Studio)',
      'Audio-Feedback der Lehrkraft (Play-Alongs, Vorspielen, Einsprechen) direkt im Hausaufgabenheft anhören',
      'Geschützter Audio-Tresor: Gespeichert im privaten, isolierten Speicher mit 60-Sekunden-Zugriffstoken (keine öffentliche Abrufbarkeit)',
      'Meisterwerke & Bildungsbiografie: Aufnahmen bleiben für die Dauer des Schuljahres (bis 31. August) bzw. während der aktiven Unterrichtszeit erhalten',
      '100 % freiwillig & jederzeit im Profil widerrufbar (ohne Nachteile für den regulären Unterricht)'
    ],
    checkboxLabel: 'Ich willige freiwillig ein, dass im Rahmen des Musikunterrichts didaktische Audioaufnahmen (Instrumental-, Gesangs-, Stimm- und Übe-Aufnahmen sowie Loopstation-Spuren) zwischen Schüler und Lehrkraft über den geschützten Audio-Tresor ausgetauscht werden dürfen (Widerruf jederzeit mit Wirkung für die Zukunft möglich).',
    fullTextMarkdown: `
### 1. Zweck der didaktischen Audioverarbeitung
(1) Im Rahmen des Musikunterrichts (Instrumental-, Gesangs- und Ensembleunterricht) können Schülerinnen, Schüler und Lehrkräfte didaktische Audioaufnahmen anfertigen (z. B. Play-Alongs der Lehrkraft, Einspielen eigener Instrumental- und Gesangsspuren, Loopstation-Spuren sowie didaktisches Feedback).
(2) Diese Aufnahmen dienen ausschließlich der pädagogischen Unterstützung des Übens zu Hause, der musikalischen Gehörbildung und der didaktischen Erfolgskontrolle.

### 2. Geschützter Audio-Tresor, Zugriffstoken & Speicherdauer
(1) Alle Audios werden in einem isolierten, privaten Cloud-Speicher (Audio-Tresor) verschlüsselt gehalten. Der Zugriff erfolgt ausschließlich über ephemere, kryptografisch signierte HMAC-Sicherheits-Tokens mit einer Gültigkeitsdauer von maximal 60 Sekunden.
(2) Aufnahmen sind ausschließlich für die zugeordnete Lehrkraft sowie die Schülerin bzw. den Schüler und deren Erziehungsberechtigte abrufbar. Es erfolgt keinerlei öffentliche Bereitstellung, kein Suchmaschinen-Indexing und keine Weitergabe an Dritte.
(3) **Meisterwerke & Schuljahres-Aufbewahrung:** Didaktische Audioaufnahmen dokumentieren die musikalische Lernbiografie. Sie verbleiben für die Dauer des jeweiligen Schuljahres (bis zum 31. August) bzw. während der aktiven Unterrichtszeit im Tresor und werden zum Schuljahresende im Rahmen der standardisierten Jahresabschluss-Wartung gelöscht, sofern sie nicht zuvor manuell durch den Nutzer entfernt wurden.
(4) **Zweckbindung:** Der Audio-Tresor dient ausschließlich musikalisch-didaktischen Zwecken. Reine Privataufnahmen außerhalb des Musikunterrichts sind unzulässig.

### 3. Freiwilligkeit & Widerrufsrecht (Art. 7 Abs. 3 DSGVO)
(1) Die Erteilung dieser Einwilligung ist vollkommen freiwillig. Aus einer Nichteinwilligung entstehen keinerlei Nachteile für die reguläre Unterrichtsteilnahme; das digitale Hausaufgabenheft bleibt uneingeschränkt nutzbar.
(2) Diese Einwilligung kann jederzeit mit Wirkung für die Zukunft im Schüler- bzw. Elternprofil widerrufen werden. Im Falle des Widerrufs werden vorhandene Audioaufnahmen unverzüglich und unwiederbringlich aus dem Tresor gelöscht.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. STAND-ALONE B2B AUFTRAGSVERARBEITUNGSVERTRAG (ART. 28 DSGVO) MIT TOMS
  // ──────────────────────────────────────────────────────────────────────────
  avv_standalone: {
    type: 'avv_standalone',
    title: 'Vereinbarung zur Auftragsverarbeitung (AVV)',
    subtitle: 'Gemäß Art. 28 DSGVO und Art. 9 Schweizer nDSG inkl. Technisch-Organisatorischer Maßnahmen (TOMs)',
    badge: 'Art. 28 DSGVO / Behördenstandard',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Behördentauglicher Stand-Alone Vertrag nach Art. 28 Abs. 3 DSGVO für Schulträger und Datenschutzbeauftragte',
      'Gegenstand & Dauer: Auftragsverarbeitung zur Bereitstellung der Bildungs- und Schul-Cloud Campus-Groovelab',
      'Ausschließlicher Verarbeitungsort: Bundesrepublik Deutschland (Hetzner Online GmbH Falkenstein & Nürnberg)',
      'Vorfallsmeldung des Auftragnehmers binnen 48 Stunden zur Wahrung der 72h-Meldepflicht nach Art. 33 DSGVO',
      'Anlage 1: Detaillierter Katalog der Datenarten und Kategorien betroffener Personen',
      'Anlage 2: Vollständiger Katalog der Technisch-Organisatorischen Maßnahmen (TOMs gem. Art. 32 DSGVO)',
      'Revisionssicheres Audit-Recht (Art. 28 Abs. 3 lit. h DSGVO) & DPO-Compliance-Dossier'
    ],
    checkboxLabel: 'Ich bestätige als vertretungsberechtigte Person den Auftragsverarbeitungsvertrag nach Art. 28 DSGVO inklusive der Anlagen 1 und 2.',
    fullTextMarkdown: `
### 1. Präambel, Gegenstand & Dauer der Auftragsverarbeitung
(1) Dieser Vertrag konkretisiert die datenschutzrechtlichen Rechte und Pflichten der Parteien im Rahmen der Nutzung der cloudbasierten Schulmanagement- und Übeplattform **Campus-Groovelab**.
(2) Die Musikschule ist und bleibt datenschutzrechtlich die alleinige **Verantwortliche** (Art. 4 Nr. 7 DSGVO). Der Betreiber Patrick Huber handelt ausschließlich als weisungsgebundener **Auftragsverarbeiter** (Art. 28 DSGVO).
(3) Die Laufzeit dieser Vereinbarung entspricht der Laufzeit des Hauptvertrages über die Plattformbereitstellung.

### 2. Weisungsbefugnis des Auftraggebers (Art. 28 Abs. 3 lit. a DSGVO)
(1) Der Auftragnehmer verarbeitet personenbezogene Daten ausschließlich auf dokumentierte Weisung des Auftraggebers. Die Weisungen werden anfänglich durch den Hauptvertrag festgelegt und können vom Auftraggeber nachträglich in Textform geändert oder ergänzt werden.
(2) Ist der Auftragnehmer der Ansicht, dass eine Weisung des Auftraggebers gegen die DSGVO oder andere Datenschutzvorschriften der Union oder der Mitgliedstaaten verstößt, weist er den Auftraggeber unverzüglich darauf hin.

### 3. Verpflichtung auf das Datengeheimnis (Art. 28 Abs. 3 lit. b DSGVO)
Der Auftragnehmer gewährleistet, dass sich die zur Verarbeitung der personenbezogenen Daten befugten Personen zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen.

### 4. Technisch-Organisatorische Maßnahmen (Art. 28 Abs. 3 lit. c & Art. 32 DSGVO)
(1) Der Auftragnehmer trifft alle nach Art. 32 DSGVO erforderlichen technischen und organisatorischen Maßnahmen, um ein dem Risiko für die Rechte und Freiheiten der betroffenen Personen angemessenes Schutzniveau zu gewährleisten.
(2) Die konkret vereinbarten Maßnahmen ergeben sich aus **Anlage 2** zu diesem Vertrag. Der Auftragnehmer behält sich vor, getroffene Sicherheitsmaßnahmen an den technischen Fortschritt anzupassen, sofern das vertraglich vereinbarte Schutzniveau nicht unterschritten wird.

### 5. Unterauftragsverhältnisse (Art. 28 Abs. 3 lit. d & Art. 28 Abs. 2 DSGVO)
(1) Der Auftraggeber erteilt seine allgemeine Genehmigung zur Hinzuziehung von Unterauftragsverarbeitern. Genehmigt ist der Einsatz der **Hetzner Online GmbH**, Industriestr. 25, 91710 Gunzenhausen, Deutschland (Serverstandorte: Falkenstein/Vogtland und Nürnberg, Deutschland; ISO/IEC 27001 zertifiziert).
(2) Der Auftragnehmer informiert den Auftraggeber mindestens vierzehn (14) Tage im Voraus über jede beabsichtigte Änderung in Bezug auf die Hinzuziehung oder Ersetzung von Unterauftragsverarbeitern. Dem Auftraggeber steht ein Widerspruchsrecht aus wichtigem datenschutzrechtlichem Grund zu.

### 6. Unterstützungspflichten des Auftragnehmers (Art. 28 Abs. 3 lit. e & f DSGVO)
(1) **Betroffenenrechte:** Der Auftragnehmer unterstützt den Auftraggeber nach Möglichkeit mit geeigneten technischen und organisatorischen Maßnahmen bei der Erfüllung von Betroffenenrechten (Art. 12–22 DSGVO).
(2) **Meldung von Datenschutzverletzungen:** Der Auftragnehmer meldet dem Auftraggeber Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens binnen **48 Stunden** nach Bekanntwerden.
(3) **Datenschutz-Folgenabschätzungen:** Der Auftragnehmer unterstützt den Auftraggeber bei der Einhaltung der in den Art. 32 bis 36 DSGVO genannten Pflichten (einschließlich Bereitstellung des behördlichen DPO-Compliance-Dossiers).

### 7. Löschung & Rückgabe von Daten (Art. 28 Abs. 3 lit. g DSGVO)
Nach Beendigung der Erbringung der Verarbeitungsleistungen löscht der Auftragnehmer alle personenbezogenen Daten nach Ablauf einer 30-tägigen Karenzfrist für den Datenexport unwiederbringlich und nach den Vorgaben der DIN 66398, sofern nicht nach dem Recht der Union oder der Mitgliedstaaten eine Verpflichtung zur Speicherung besteht.

### 8. Nachweis- & Überprüfungsrechte (Art. 28 Abs. 3 lit. h DSGVO)
Der Auftragnehmer stellt dem Auftraggeber alle erforderlichen Informationen zum Nachweis der Einhaltung der in Art. 28 DSGVO niedergelegten Pflichten zur Verfügung und ermöglicht Überprüfungen (einschließlich Inspektionen), die vom Auftraggeber oder einem von diesem beauftragten Prüfer durchgeführt werden.

---

### ANLAGE 1: Gegenstand, Art & Zweck der Verarbeitung, Datenarten & Betroffene

1. **Gegenstand & Zweck:** Bereitstellung einer mandantenisolierten Cloud-Plattform zur digitalen Unterrichtsorganisation, Stundenplanung, Raumverwaltung, didaktischen Übebegleitung (Loopstation, Meisterwerk-Protokoll) und Schulkommunikation.
2. **Kategorien betroffener Personen:**
- Schülerinnen und Schüler der Musikschule
- Erziehungsberechtigte von minderjährigen Schülerinnen und Schülern
- Lehrkräfte und Dozenten der Musikschule
- Verwaltungsmitarbeiter und Schulleitungen
3. **Kategorien personenbezogener Daten:**
- Lehrkräfte & Verwaltung: Vorname, Nachname, dienstliche E-Mail-Adresse, Kürzel, Fächer-/Instrumentenzuordnung, Raum- und Stundenplanzuweisungen.
- Schüler: Vorname, abgekürzter Nachname (z. B. „Max M.“), Geburtstag (Tag 1..31 zur Altersstufenberechnung; kein Geburtsmonat, kein Geburtsjahr), Instrumentenfach, Unterrichtszeit, Raum, stilisierter Musiker-Avatar.
- Erziehungsberechtigte: Identifikator der Elternfreigabe, verschlüsselter Hash der Eltern-PIN, Quittierungszeitstempel für häusliches Üben.
- Didaktische Daten: Übe-Zeiten, Gamification-XP, Level, Hausaufgaben-Notizen, temporäre didaktische Audioaufnahmen (Hausaufgaben- und Loopstation-Spuren im privaten Audio-Tresor).
- Metadaten & Logfiles: IP-Adresse (gehasht/anonymisiert), User-Agent, Sitzungs-Lease-ID, Audit-Logs für Sicherheitsereignisse.
4. **Ausdrücklich ausgeschlossene Datenkategorien:** Besondere Kategorien personenbezogener Daten gem. Art. 9 DSGVO (insbesondere Gesundheitsdaten, Atteste, Diagnosen oder biometrische Erkennungsdaten) sowie Bank-, SEPA- oder Kreditkartendaten von Schülern und Eltern.

---

### ANLAGE 2: Technisch-Organisatorische Maßnahmen (TOMs gem. Art. 32 DSGVO)

1. **Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO):**
- *Zutrittskontrolle:* Zutritt zu den Servern wird durch das zertifizierte Sicherheitskonzept der Hetzner Online GmbH (biometrische Zutrittskontrollen, 24/7-Kameraüberwachung, Vereinzelungsschleusen) gesichert.
- *Zugangskontrolle:* Authentifizierung über passwortlose FIDO2-Hardware-Passkeys (WebAuthn), kryptografische Schulausweis-Tokens und PBKDF2-gehashte PINs (100.000 Runden SHA-512). Progressive Rate-Limiter (3-Strike-Sperre) gegen Brute-Force.
- *Zugriffskontrolle:* Strikte PostgreSQL Row Level Security (RLS) mit Mandantentrennung auf Datenbankebene (\`school_id = get_current_user_school_id()\`). View-Maskierung sensibler Felder (\`users_view\` liefert niemals Klartext-Geheimnisse).
- *Trennungskontrolle:* Mandantenisolierte Datenspeicherung; rollenbasierte Autorisierungs-Gates (Admin, Teacher, Student).
- *Pseudonymisierung & Verschlüsselung:* Durchgehende TLS 1.3 Transportverschlüsselung; Ruhedatenverschlüsselung (AES-256); Ephemere signierte HMAC-Zugriffstokens (60s Gültigkeit) für didaktische Audios.
2. **Integrität (Art. 32 Abs. 1 lit. b DSGVO):**
- *Weitergabekontrolle:* Kein unverschlüsselter Datentransport; Übertragungen erfolgen ausschließlich über HTTPS/WSS.
- *Eingabekontrolle:* Revisionssichere, manipulationsgeschützte Audit-Logs (\`public.audit_logs\`) mit SHA-256 Hash-Chaining nach GoBD- und OWASP ASVS Level 3-Standard.
3. **Verfügbarkeit & Belastbarkeit (Art. 32 Abs. 1 lit. b & c DSGVO):**
- Tägliche automatisierte Backups mit georedundanter Speicherung in deutschen Rechenzentren.
- Unterbrechungsfreie Stromversorgung (USV) und redundante Glasfaseranbindungen im Hetzner-Rechenzentrum.
- Schnelle Wiederherstellbarkeit (RTO < 4 Stunden, RPO < 1 Stunde).
4. **Verfahren zur regelmäßigen Überprüfung & Bewertung (Art. 32 Abs. 1 lit. d DSGVO):**
- Kontinuierliches Vulnerability-Scanning, automatisierte Architektur-Invarianten-Prüfungen und statische Code-Analysen.
- Datenschutzmanagement- und Vorfallsreaktions-Plan mit Benachrichtigungsfristen von maximal 48 Stunden.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. B2B SERVICE LEVEL AGREEMENT (SLA) & VERFÜGBARKEITSGARANTIE
  // ──────────────────────────────────────────────────────────────────────────
  sla_b2b: {
    type: 'sla_b2b',
    title: 'Service Level Agreement (SLA)',
    subtitle: 'Verfügbarkeits- und Supportstandards für Schulträger und Bildungseinrichtungen',
    badge: 'SLA / B2B Standard',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Verfügbarkeitsgarantie von 99,5 % im Jahresmittel für die Cloud-Infrastruktur',
      'Geplante Wartungsfenster außerhalb der Kernunterrichtszeiten (Montag bis Sonntag 00:00–06:00 Uhr deutscher Zeit)',
      'Vier definierte Störungsklassen von P1 (Kritisch < 4h Reaktionszeit) bis P4 (Trivial < 72h)',
      'Subsidiaritätsklausel: Schadenminderungspflicht der Schule zur Vorhaltung herkömmlicher Ersatzwege',
      'Haftungsausschluss bei Ausfällen durch höhere Gewalt, Dritte oder unzureichende Endgeräte'
    ],
    checkboxLabel: 'Ich nehme die Service-Level-Vereinbarung (SLA) zur Kenntnis.',
    fullTextMarkdown: `
### 1. Geltungsbereich & Verfügbarkeitsziel
(1) Dieses Service Level Agreement (SLA) regelt die Verfügbarkeit und die Supportreaktionszeiten der Cloud-Infrastruktur von **Campus-Groovelab** für Musikschulen und Bildungsträger.
(2) Der Betreiber strebt eine Gesamtverfügbarkeit der Kernsysteme von **99,5 % im Jahresmittel** an.

### 2. Berechnung der Verfügbarkeit & Wartungsfenster
(1) Die Verfügbarkeit bemisst sich an der Erreichbarkeit der zentralen API-Endpunkte und der Webanwendung am Übergabepunkt des Rechenzentrums an das Internet.
(2) **Geplante Wartungsfenster:** Zur Durchführung notwendiger Sicherheits-Patches, Betriebssystem-Updates und Datenbankoptimierungen sind reguläre Wartungsfenster vorgesehen. Diese finden standardmäßig **täglich von Montag bis Sonntag zwischen 00:00 Uhr und 06:00 Uhr deutscher Zeit (Berlin)** statt und gelten nicht als Ausfallzeit im Sinne der Verfügbarkeitsberechnung (SLA 99,5 %), sofern sie dem Kunden mindestens 24 Stunden zuvor per E-Mail oder Systemhinweis angekündigt wurden. Dringende Sicherheits-Patches zur unverzüglichen Abwehr akuter Cyber-Angriffe können ohne Vorankündigungsfrist eingespielt werden.
(3) **Nicht anrechenbare Ausfallzeiten:** Von der Verfügbarkeitsberechnung ausgenommen sind Ausfälle, die verursacht werden durch: (a) Höhere Gewalt, Streik, Naturkatastrophen; (b) Angriffe auf die Infrastruktur Dritter (DDoS-Attacken), sofern branchenübliche Schutzmaßnahmen aktiv waren; (c) Fehlfunktionen der Hard- oder Software auf Seiten der Musikschule oder der Endnutzer; (d) Störungen der Internetverbindung zwischen Endgerät und Rechenzentrum.

### 3. Störungsklassen & Reaktionszeiten
Störungsmeldungen können über das integrierte Support-Ticketsystem oder per E-Mail an support@campus-groovelab.de eingereicht werden.

| Störungsklasse | Definition & Schweregrad | Reaktionszeit (Werktage Mo–Fr) | Ziel-Wiederherstellung |
|---|---|---|---|
| **P1 – Kritisch** | Vollständiger Ausfall der Plattform; kein Login möglich; Schulbetrieb lahmgelegt. | **< 4 Stunden** | < 8 Stunden |
| **P2 – Schwer** | Wesentliche Kernfunktionen (z. B. Stundenplan oder Audio-Playback) sind gravierend gestört; kein Workaround. | **< 12 Stunden** | < 24 Stunden |
| **P3 – Normal** | Teilfunktionen beeinträchtigt (z. B. Export verzögert, Anzeige-Bug), regulärer Betrieb über Workaround möglich. | **< 24 Stunden** | Nächster Release-Zyklus |
| **P4 – Gering** | Kosmetische Fehler, Tippfehler, allgemeine Supportfragen oder Verbesserungswünsche. | **< 72 Stunden** | Nach Priorisierung |

### 4. Subsidiaritäts- & Redundanzpflicht der Musikschule
Die Musikschule nimmt zur Kenntnis, dass Campus-Groovelab als didaktisches Erleichterungs- und Übermittlungswerkzeug konzipiert ist. Die Schule ist verpflichtet, Notfallkontaktwege (Telefon, behördliche E-Mail) redundant vorzuhalten. Bei vorübergehenden Systemausfällen läuft der Musikschulunterricht regulär weiter. Schadensersatzansprüche für ausgefallene Unterrichtsstunden sind ausgeschlossen.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. MUSTER-DATENSCHUTZINFORMATION ART. 13 DSGVO FÜR MUSIKSCHULEN
  // ──────────────────────────────────────────────────────────────────────────
  school_parent_privacy_notice: {
    type: 'school_parent_privacy_notice',
    title: 'Muster-Datenschutzinformation nach Art. 13 DSGVO',
    subtitle: 'Vorlage für Musikschulen zur Information von Eltern, Schülerinnen und Schülern',
    badge: 'Muster Art. 13 DSGVO / Für Schulen',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Schlüsselfertiger Muster-Elternbrief zur Erfüllung der Informationspflichten gem. Art. 13 & 14 DSGVO',
      'Klarstellung: Musikschule ist Verantwortliche; Campus-Groovelab ist geprüfter Auftragsverarbeiter in Deutschland',
      'Rechtsgrundlagen: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) & freiwillige Audio-Einwilligung (Art. 8 DSGVO)',
      'Radikale Datenminimierung: Keine Bankdaten, keine E-Mail-Adressen Minderjähriger, nur Geburtstagstag (1..31)',
      'Transparentes Löschkonzept nach DIN 66398 & Rechte der Betroffenen auf Auskunft und Löschung'
    ],
    checkboxLabel: 'Ich nehme die Muster-Datenschutzinformation zur Kenntnis.',
    fullTextMarkdown: `
# Datenschutz-Information zur Nutzung von Campus-Groovelab
*(Muster-Vorlage der Musikschule zur Aushändigung an Schülerinnen, Schüler und Erziehungsberechtigte)*

Liebe Eltern, liebe Schülerinnen und Schüler,

unsere Musikschule nutzt zur didaktischen Unterrichtsbegleitung, Stundenplanung und zum häuslichen Üben die Bildungs-App **Campus-Groovelab**. Der Schutz Ihrer persönlichen Daten ist uns ein zentrales Anliegen. Nachfolgend informieren wir Sie gemäß Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) über die Verarbeitung Ihrer Daten:

### 1. Wer ist für die Datenverarbeitung verantwortlich?
Verantwortlich für die Datenverarbeitung ist Ihre **Musikschule vor Ort** (Schulträger bzw. Schulleitung). Die Kontaktdaten der Schulleitung und des schulischen Datenschutzbeauftragten entnehmen Sie bitte der Schulordnung bzw. den offiziellen Schulunterlagen.

### 2. Auftragsverarbeitung & Serverstandort
Zur Bereitstellung der Software bedient sich die Musikschule des Dienstleisters **Patrick Huber – Campus-Groovelab Plattformbetrieb** (Rheinfelden, Deutschland) als weisungsgebundenem Auftragsverarbeiter gemäß Art. 28 DSGVO. Sämtliche Daten werden ausschließlich in ISO/IEC 27001-zertifizierten Rechenzentren in **Deutschland** (Hetzner Online GmbH) verarbeitet. Es findet keinerlei Datenübermittlung in Drittstaaten (insbesondere keine US-Cloudserver) statt.

### 3. Welche Daten werden verarbeitet und zu welchem Zweck?
- **Schülerdaten:** Vorname, abgekürzter Nachname (z. B. „Lukas M.“), Unterrichtsfach, Termin, Raum und didaktische Übefortschritte. Zum Schutz der Privatsphäre wird für Kalenderfunktionen ausschließlich der Tag des Geburtstags (Tag 1..31) erhoben (kein Monat, kein Jahr). Es werden keine Porträtfotos, sondern stilisierte Musiker-Avatare verwendet.
- **Keine Bank- oder Abrechnungsdaten:** Im Schülerprofil werden niemals Bank-, SEPA- oder Kreditkartendaten gespeichert.
- **Keine E-Mail-Adressen von Kindern:** Der Zugang erfolgt passwortlos über den Schulausweis-QR-Code und eine persönliche PIN.
- **Didaktische Audioaufnahmen (Freiwillig):** Übe-Aufnahmen und Play-Alongs werden in einem isolierten Audio-Tresor gehalten und verbleiben bis zum Ende des jeweiligen Schuljahres (31. August) im System.

### 4. Rechtsgrundlagen der Verarbeitung
- Die Verarbeitung von Stamm- und Unterrichtsdaten erfolgt zur Erfüllung des Musikschulunterrichtsvertrages gemäß **Art. 6 Abs. 1 lit. b DSGVO**.
- Die Anfertigung didaktischer Audioaufnahmen im häuslichen Übestudio basiert auf der freiwilligen Einwilligung gemäß **Art. 6 Abs. 1 lit. a i. V. m. Art. 8 DSGVO** (bei Jugendlichen unter 16 Jahren durch die Eltern; ab 16 Jahren durch die Schüler selbst).

### 5. Ihre Rechte
Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO) sowie das Recht auf Beschwerde bei der zuständigen Datenschutzaufsichtsbehörde Ihres Bundeslandes.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. VERHALTENSKODEX INSTITUTIONELLER KINDERSCHUTZ GEMÄSS § 8A SGB VIII
  // ──────────────────────────────────────────────────────────────────────────
  child_protection_code: {
    type: 'child_protection_code',
    title: 'Kinderschutz-Charta & Grenzachtungs-Kodex',
    subtitle: 'Institutionelles Schutzkonzept zur Prävention von Grenzverletzungen gem. § 8a SGB VIII / BKiSchG',
    badge: 'Kinderschutz / § 8a SGB VIII',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Verbindlicher Verhaltenskodex für alle Lehrkräfte, Honorardozenten und Mitarbeiter',
      'Vier-Augen-Prinzip: Schulinterner Chat zwischen Lehrkraft und Kind ist für Erziehungsberechtigte transparent einsehbar',
      'Strikter Ausschluss von unüberwachtem Schüler-zu-Schüler Privatchat auf der Plattform',
      'Verbot privater Kontaktaufnahmen über Messenger-Dienste außerhalb des dokumentierten Schulkontexts',
      'Vertrauliche Clearingstelle kinderschutz@campus-groovelab.de zur unverzüglichen Meldung von Verdachtsfällen'
    ],
    checkboxLabel: 'Ich erkenne die Kinderschutz-Charta und den Grenzachtungs-Kodex an.',
    fullTextMarkdown: `
### 1. Leitbild & Verpflichtung zum Kindeswohl
(1) Campus-Groovelab bekennt sich uneingeschränkt zum Schutz von Kindern und Jugendlichen vor physischer, psychischer und digitaler Gewalt, Grenzverletzungen und Missbrauch im Sinne des § 8a SGB VIII und des Bundeskinderschutzgesetzes (BKiSchG).
(2) Alle Lehrkräfte, Dozenten und administrativen Nutzer verpflichten sich, das Vertrauensverhältnis zu den anvertrauten Schülerinnen und Schülern zu schützen und deren persönliche Integrität uneingeschränkt zu achten.

### 2. Digitales Vier-Augen-Prinzip & Transparenzgebot
(1) **Transparenz für Erziehungsberechtigte:** Die plattforminterne Kommunikation zwischen Lehrkräften und minderjährigen Schülern dient ausschließlich didaktischen Unterrichtszwecken. Sämtliche Chatnachrichten, Hausaufgabenkommentare und Audio-Feedbacks sind über das Eltern-Portal für Erziehungsberechtigte jederzeit transparent einsehbar (digitales Vier-Augen-Prinzip).
(2) **Ausschluss privater Peer-to-Peer Chats:** Auf Campus-Groovelab existiert keine Funktion für private, unüberwachte 1:1-Direktnachrichten zwischen minderjährigen Schülern untereinander. Gruppenbezogene Interaktionen (z. B. Band-Shoutboxen) sind auf den Ensemblekontext beschränkt und für betreuende Coaches sowie Eltern einsehbar.

### 3. Kommunikationsdisziplin & Distanzgebot
(1) **Dienstliche Kanalbindung:** Lehrkräften ist es untersagt, Schülerinnen und Schüler über private Kommunikationskanäle (wie WhatsApp, Telegram, Instagram, TikTok oder private Mobilfunknummern) zu kontaktieren. Die didaktische Begleitung ist auf die dokumentierten Schulkanäle zu beschränken.
(2) **Grenzachtung bei Medienaufnahmen:** Didaktische Audioaufnahmen dürfen ausschließlich zur musikalischen Gehörbildung und Lernkontrolle erstellt werden. Aufnahmen mit intimem oder herabwürdigendem Charakter sind strengstens untersagt. Reale Porträtfotos von Schülerinnen und Schülern werden im System nicht zugelassen (Verwendung von Avataren).

### 4. Clearingstelle & Meldekette bei Verdachtsfällen
(1) Bei begründetem Verdacht auf Grenzverletzungen, Cyber-Mobbing oder Gefährdungen des Kindeswohls steht allen Nutzern die vertrauliche Clearing-Adresse **kinderschutz@campus-groovelab.de** zur Verfügung.
(2) Eingehende Meldungen werden unverzüglich unter Hinzuziehung der Schulleitung und unter Beachtung der gesetzlichen Meldeketten nach § 8a SGB VIII bearbeitet.
    `.trim()
  }
};

