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
  activeVersion: '2026.5',
  minimumEnforcedVersion: '2026.1', // 🛡️ Bestandsschutz: 2026.1 bleibt rechtswirksam; kein Zwangsaussperren für Bestandskunden
  changelogs: {
    '2026.5': {
      version: '2026.5',
      title: '1% Goldstandard Legal Hardening & Subsidiarity Governance',
      date: '20.09.2026',
      highlights: [
        'Vollständiger Ausschluss von Noten-Uploads & Noten-Sharing (§ 1 Abs. 2 UrhDaG / Urheberrechtsschutz)',
        'Zero-Photo-Doktrin & Ausschluss privater Bild-Uploads für Schüler und Eltern (§ 22 KUG / Art. 25 DSGVO)',
        'Zweistufige Stundenplan- und Raumdisposition: Didaktischer Entwurf durch Lehrkraft ohne Raumwahl; Zuweisung des Unterrichtsraums durch das Sekretariat (Herrenberg-Compliance)',
        'Schüler-Direktabrechnung: Befristeter Jahresbeitrag (max. 5,39 € / CHF 11.00) mit automatischem Auslaufen zum Schuljahresende (keine Abofalle), jährlichem kostenlosen Probemonat-Reset und sanftem Fallback auf 0,09 € Basistarif',
        'Raum- & Sachmängel-Kaskade: Klarstellung des internen Notizcharakters und Ausschluss von Facility-Management- und Verkehrssicherungspflichten',
        'Rechtsnatur der 1-Tap Kontaktdokumentation („Erreicht“): Ausschluss von gesetzlichen Zugangsfiktionen gem. § 130 BGB',
        'PIN-Freigabelinks (Vinyl-/Audio-Biografie): Strikte Beschränkung auf den engsten privaten Familienkreis gem. § 53 Abs. 1 UrhG',
        'Didaktik-Gamification: Ausschluss von Geldwerten oder einklagbaren Ansprüchen für XP-Punkte gem. § 3 GlüStV und DSA Art. 25',
        'Live-Lab Steuerung: Berechtigung des Schulsekretariats zur administrativen Beendigung verwaister Terminal-Sessions',
        'AVV Art. 28 DSGVO: Ausdrückliche Regelung des technischen Support-Fernzugriffs („Ghost Support“) unter lückenlosem Revisions-Audit'
      ]
    },
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
(5) **Zweistufige Stundenplan- und Raumdisposition (Herrenberg-Compliance & kommunale Raumhoheit):** Die Erstellung von Stundenplänen folgt dem Prinzip der strikten Trennung zwischen didaktischer Fachautonomie und behördlicher Raumvergabe:
(a) Lehrkräfte stimmen Unterrichtszeiten didaktisch und fachlich eigenverantwortlich mit ihren Schülern ab und übermitteln den resultierenden Stundenplan als unverbindlichen pädagogischen Entwurf an das Schulsekretariat. Lehrkräfte besitzen im System keine Befugnis zur eigenmächtigen Festlegung oder Belegung von Unterrichtsräumen.
(b) Das Schulsekretariat prüft den eingereichten Stundenplanentwurf auf Vereinbarkeit mit den Raumressourcen der Musikschule und weist der Lehrkraft nach pflichtgemäßem Ermessen einen freien, geeigneten Unterrichtsraum zu.
(c) Erst mit der Zuweisung des Unterrichtsraums und der formalen Freigabe durch das Schulsekretariat im Primärverwaltungssystem erlangt der Stundenplan organisatorische Gültigkeit für den Schulbetrieb. Bis zu dieser Freigabe verbleibt der Entwurf im unverbindlichen Vorbehaltsstatus. Eine Haftung des Betreibers für Raumengpässe oder terminliche Kollisionen ist ausgeschlossen.
(6) **Raum- & Sachmängel-Kaskade (Ausschluss von Facility-Management & Verkehrssicherungspflichten):** Die in der Plattform bereitgestellten Funktionen zur Dokumentation von Raum- oder Sachmängeln (z. B. defektes Unterrichtsinventar, Instrumentenschäden, Raumklimaprobleme) sowie deren Statusquittierung („behoben“) stellen ein rein unverbindliches didaktisch-organisatorisches Notiz- und Convenience-Werkzeug zur internen Unterrichtsvorbereitung dar. Die Plattform ersetzt kein behördliches Gebäudemanagementsystem (CAFM), kein Mängelerfassungssystem des Schulträgers und keine sicherheitstechnischen Prüfprotokolle. Der Betreiber übernimmt zu keinem Zeitpunkt Verkehrssicherungspflichten (§ 823 BGB) der Musikschule, des Schulträgers oder des Gebäudeeigentümers. Akute Sicherheitsrisiken, Gefahrenquellen oder erhebliche Gebäudemängel sind von den Nutzern unverzüglich und vorrangig auf den herkömmlichen städtischen bzw. behördlichen Meldekanälen (Hausmeister, Hausverwaltung, Unfallkasse) anzuzeigen.
(7) **Ausfall- & Vertretungs-Botendienst (Ausschluss von Unterrichtsausfall-Haftung):** Die Übermittlung von Abwesenheiten, Vertretungsanfragen oder Unterrichtsausfällen über die Plattform stellt einen rein technischen Botendienst im Auftrag des jeweiligen Nutzers dar. Die Plattform übernimmt keine Gewähr für das tatsächliche Zustandekommen von Vertretungsunterricht oder die erfolgreiche Benachrichtigung aller Erziehungsberechtigten. Bei Unterrichtsausfällen verbleibt die Organisations- und Informationspflicht vollumfänglich bei der Musikschule und ihren Lehrkräften über die herkömmlichen Primärwege (Telefon, E-Mail). Schadensersatzansprüche gegen den Betreiber wegen ausgefallener Unterrichtsstunden, vergeblicher Anfahrten von Schülern oder entgangener Unterrichtsgebühren sind vollumfänglich ausgeschlossen.
(8) **Notfall-, Nachrangigkeits- & Schadenminderungsklausel (§ 254 BGB):** Die Musikschule verpflichtet sich im Rahmen ihrer vertraglichen Schadensminderungspflicht (§ 254 BGB), den regulären Schulbetrieb und die primäre Notfallkommunikation (Telefon, E-Mail, herkömmliche Vertretungspläne) unabhängig von der Plattform redundant vorzuhalten. Bei kurzzeitigen Serverstörungen, Netzausfällen oder Wartungsfenstern findet der Schulunterricht regulär statt; Raum- und Terminabstimmungen sind über die Primärkanäle abzuwickeln. Eine Haftung des Betreibers für ausgefallene Unterrichtsstunden, verpasste Bandproben oder Honorarausfälle ist ausgeschlossen, es sei denn, der Ausfall beruht auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Betreibers.
(9) **Vertragsschluss & Annahmevorbehalt:** Die Darstellung der Plattform im Internet stellt kein bindendes Angebot, sondern eine Aufforderung zur Abgabe einer Bestellung dar (invitatio ad offerendum). Ein Rechtsanspruch auf Abschluss eines Nutzungsvertrages oder die Bereitstellung eines Schul-Tenants besteht nicht. Der Betreiber behält sich vor, Registrierungsanfragen von Einrichtungen nach pflichtgemäßem Ermessen – insbesondere bei Kapazitätsengpässen oder berechtigten Sicherheitsbedenken – abzulehnen.

### 2. Auftragsverarbeitungsvertrag gem. Art. 28 DSGVO & Datensouveränität
(1) **Verantwortlichkeit & Weisungsgebundenheit:** Die Musikschule ist und bleibt datenschutzrechtlich die alleinige „Verantwortliche“ (Art. 4 Nr. 7 DSGVO) für alle von ihr verarbeiteten Schüler-, Lehrkräfte- und Verwaltungsdaten. Der Betreiber verarbeitet personenbezogene Daten ausschließlich als weisungsgebundener Auftragsverarbeiter (Art. 28 DSGVO) zur Erfüllung dieses Vertrages. Ergänzend gilt die gesonderte Vereinbarung zur Auftragsverarbeitung (AVV) als integraler Vertragsbestandteil.
(2) **Ausschließlicher Serverstandort Deutschland:** Sämtliche Verarbeitungen von personenbezogenen Daten und Cloud-Speicherungen erfolgen ausnahmslos auf ISO/IEC 27001-zertifizierten Servern innerhalb der Bundesrepublik Deutschland (Standort Hetzner Online GmbH, Falkenstein/Vogtland & Nürnberg, Deutschland).
(3) **Zero-US-Cloud & Schrems II Compliance:** Der Betreiber setzt für die Speicherung und Bereitstellung personenbezogener Daten keine US-Cloud-Hyperscaler ein. Das System ist vollständig immun gegen Zugriffe nach dem US CLOUD Act und FISA 702.
(4) **Subdienstleister & Vorab-Information (Art. 28 Abs. 2 DSGVO):** Als Infrastruktur-Subdienstleister wird Hetzner Online GmbH eingesetzt. Bei beabsichtigten Änderungen an Unterauftragnehmern wird die Schule mindestens vierzehn (14) Tage vorab in Textform informiert; der Schule steht ein Widerspruchsrecht aus wichtigem, nachgewiesenem datenschutzrechtlichem Grund zu. Bei unaufschiebbaren Notfall-Migrationen zur Abwehr akuter Sicherheitsstörungen informiert der Betreiber die Schulleitung unverzüglich nach Durchführung.
(5) **Vorfallsmeldung binnen 24 bis 48 Stunden:** Der Betreiber meldet Verletzungen des Schutzes personenbezogener Daten (Art. 33 Abs. 2 DSGVO) unverzüglich, bei schwerwiegenden Datenpannen (P1) mit potentiellem Datenabfluss spätestens binnen vierundzwanzig (24) Stunden, bei sonstigen technischen Störungen spätestens binnen achtundvierzig (48) Stunden nach Bekanntwerden, an die Schulleitung, sodass der Schule ein ausreichender Puffer zur Erfüllung der gesetzlichen 72-Stunden-Meldepflicht nach Art. 33 DSGVO verbleibt.
(6) **Zero-AI- & Zero-Model-Training-Garantie:** Sämtliche im Auftrag verarbeiteten Daten (insbesondere Schüler-, Lehrkräfte-, Stundenplan-, Text- und didaktische Audioaufnahmen) werden zu 0 % für das Training von Machine-Learning-Algorithmen, Large Language Models (LLMs) oder generativer künstlicher Intelligenz verwendet. Eine Weitergabe an externe KI-Modellanbieter ist ausgeschlossen.
(7) **Kommunales Löschkonzept nach DIN 66398, Vertragsbeendigung & Aufbewahrungsfristen (§ 257 HGB, § 147 AO):** Bei Vertragsbeendigung werden alle Mandantendaten nach Ablauf einer 30-tägigen Karenzfrist zur Datenextraktion unwiederbringlich und revisionssicher physisch gelöscht. Der Löschung von Abrechnungs-, Rechnungs- und Buchungsbelegen stehen die zwingenden gesetzlichen Aufbewahrungsfristen von bis zu zehn Jahren nach Handels- und Steuerrecht (§ 257 HGB, § 147 AO) entgegen; diese Belege werden bis zum Ablauf der Aufbewahrungsfrist sperr- und manipulationssicher archiviert.
(8) **Revisionssichere Beweiskraft & Integrität elektronischer Nachweise (§ 371a ZPO):** Sämtliche im Rahmen der Vertragsdurchführung und Administration generierten Audit-Logs, Einverständnis-Protokolle, Zeitstempel und Bereitstellungs-Nachweise werden kryptografisch versiegelt (SHA-256 Hash-Chaining nach GoBD-Standard) und besitzen für etwaige behördliche oder gerichtliche Prüfungen die volle Beweiskraft elektronischer Dokumente (§ 371a ZPO).

### 3. Kanonische Gebührenstruktur, Fair-Play-Entlastung, Laufzeit, Zahlungsbedingungen & Verzug (§§ 286, 288 BGB)
(1) **Gebührenübersicht (Legal SaaS-Nomenklatur):**
- **Campus-Groovelab Software-Bereitstellung:** 0,00 € / CHF 0.00 (Inklusive).
- **Cloud- & Datenbank-Hosting Modul Campus:** 14,90 € / Mo. (DE/AT) bzw. CHF 19.90 / Mo. (CH) feste Server-Flatrate je Musikschule.
- **Cloud- & Datenbank-Hosting Modul GrooveLab:** 9,90 € / Mo. (DE/AT) bzw. CHF 14.90 / Mo. (CH) feste Server-Flatrate je Musikschule.
- **Kombi-Vorteilsrabatt (Infrastruktur-Bündel):** -4,90 € / Mo. (DE/AT) bzw. -4.90 CHF / Mo. (CH) bei gemeinsamer Buchung beider Module (Flatrate: 19,90 € / Mo. bzw. CHF 29.90 / Mo.).
- **Service- & Administrationspauschale:** 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktive Lehrkraft. Verwaltungs- und Sekretariats-Profile (Rollen admin und secretary) sind dauerhaft 100 % inklusive (0,00 €).
- **Basis-Bereitstellung:** 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je registrierter Schüler (QR-Landingpages, Stundenplan-, Termin-Sync & DSGVO-Hosting).
- **Cloud- & Modul-Bereitstellung Campus:** 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (interaktive App: Übe-Timer, Loopstation, Hausaufgaben).
- **Cloud- & Modul-Bereitstellung GrooveLab:** 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (Bands, Songs; wird ausnahmslos zu 100 % von der Musikschule getragen).
(2) **Sammelzahler vs. Schüler-Direktabrechnung:** GrooveLab-Aktivierungen werden verbindlich immer zu 100 % von der Musikschule übernommen. Für das Campus-Modul kann die Musikschule Schüler-Direktabrechnung vereinbaren. Schüler-Direktabrechnungen mit Eltern erfolgen ausnahmslos als einmaliger, befristeter Schuljahres-Jahresbeitrag (max. 11 × 0,49 € = 5,39 € in DE/AT bzw. 11 × CHF 1.00 = CHF 11.00 in CH pro Schuljahr; 1. Monat 100 % kostenfreier Probemonat) – niemals als monatliches Abonnement. Die Bereitstellung endet automatisch mit Schuljahresende ohne Kündigungserfordernis. Erfolgt keine Folgezahlung, greift der automatische sanfte Fallback auf die von der Schule getragene Basis-Bereitstellung (0,09 €).
(3) **Härtefall-Freikontingent & 20er-Staffel (Eltern-Direktabrechnung):** Erreicht eine Musikschule im Modell der Eltern-Direktabrechnung mindestens 20 aktivierte Vollzahler-Profile, stellt Campus-Groovelab für jeweils volle 20 aktivierte Schüler je einen kostenfreien Härtefall-Platz (0,00 €) zur Verfügung. Bruchteile unterhalb von 20 Vollzahlern begründen keinen Anspruch (strikte kaufmännische Abrundung: floor(n / 20)). Der Stichtag zur Feststellung des Kontingents ist der 1. Oktober (nach Ablauf des kostenfreien Probemonats September). Sinkt die Zahl der Vollzahler im Folgejahr, werden überzählige Härtefall-Profile nahtlos über die B2B-Rechnung der Schule zum regulären Schülerbeitrag (0,49 € / Mo. bzw. max. 5,39 € Einmalbeitrag / Schuljahr) als Träger-Überhang weitergeführt, sofern die Schule die Profile nicht vor dem Stichtag aktiv auf den Basistarif (0,09 € / Mo.) zurückstuft. Ein Ausschluss oder eine Stigmatisierung von Schülern findet zu keinem Zeitpunkt statt.
(4) **Fair-Play Inaktivitäts-Entlastung:** Loggt sich ein Schüler über einen Zeitraum von mehr als sechzig (60) aufeinanderfolgenden Tagen nicht aktiv ein, wird das Profil automatisch auf passive Basis-Bereitstellung (0,09 € / CHF 0.20 / Mo.) umgestellt, um die Schule vor unnötigen Kosten zu schützen.
(5) **Steuerliche Behandlung & Bruttopreisgarantie:** Soweit der Betreiber die Kleinunternehmerregelung in Anspruch nimmt, erfolgt die Abrechnung gem. § 19 UStG (DE) bzw. § 6 Abs. 1 Z 27 UStG (AT) ohne gesonderten Umsatzsteuerausweis. Bei Übergang zur Regelbesteuerung gilt für Bestandskunden die unbedingte **Bruttopreisgarantie**: Der zu zahlende Rechnungsbetrag bleibt centgenau identisch; die Mehrwertsteuer wird aus dem vereinbarten Betrag herausgerechnet (§ 14 UStG). In der Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).
(6) **BGH-konformes Aufrechnungsverbot:** Die Musikschule kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen. Dieser Ausschluss gilt ausdrücklich *nicht* für Gegenforderungen aus demselben Vertragsverhältnis, die auf Leistungsverweigerungsrechten, Minderung oder mangelbedingten Schadensersatzansprüchen beruhen (Synallagma).
(7) **Vertragslaufzeit & Kündigungsharmonisierung:** Verträge mit Bildungseinrichtungen laufen grundsätzlich synchron zum Schuljahr (12 Monate bis zum 31. August des jeweiligen Schuljahres) und verlängern sich jeweils um weitere zwölf (12) Monate, sofern sie nicht mit einer Frist von drei (3) Monaten zum Schuljahresende (31. Mai) in Textform gekündigt werden. Bei unterjährigem Vertragsbeginn läuft die Erstlaufzeit bis zum 31. August des Folgejahres (Rumpf-Schuljahr). Das gesetzliche Recht zur außerordentlichen Kündigung aus wichtigem Grund (§ 314 BGB) bleibt unberührt.
(8) **Zahlungsverzug & Verzugsschaden (§§ 286, 288 BGB):** Rechnungen sind innerhalb von vierzehn (14) Tagen ab Rechnungsdatum ohne Abzug zur Zahlung fällig. Gerät die Musikschule mit Zahlungen in Verzug (§ 286 BGB), ist der Betreiber berechtigt, Verzugszinsen in gesetzlicher Höhe (§ 288 Abs. 2 BGB: 9 Prozentpunkte über dem Basiszinssatz) sowie den gesetzlichen Mahnkostenpauschalsatz nach § 288 Abs. 5 BGB (40,00 €) geltend zu machen. Gesetzliche Zurückbehaltungsrechte bei qualifiziertem Zahlungsverzug bleiben unberührt.

### 4. Ausschluss von Noten-Uploads & Noten-Sharing, Cover-Aufnahmen (§§ 53, 60a UrhG) & Notice-and-Takedown (Art. 6 & 16 DSA)
(1) **Vollständiger Ausschluss von Noten-Dateien & Noten-Sharing (Reine Metadaten-Architektur gem. § 1 Abs. 2 UrhDaG):** Die Plattform stellt zu keinem Zeitpunkt Funktionen zum Hochladen, Speichern, Teilen oder Verbreiten von Noten, Notensätzen, Leadsheets, Partituren oder Noten-PDFs bereit. Jegliches Teilen von Noten-Dateien über die Plattform ist technisch ausgeschlossen und untersagt. Hausaufgaben, Aufgabenpläne und Repertoirelisten verweisen ausnahmslos auf freie bibliografische Metadaten (Titel, Lehrwerk, Seitenzahlen) zur Nutzung mit von den Schülern im Fachhandel rechtmäßig erworbenen gedruckten Original-Lehrwerken sowie auf autorisierte externe Partnerdienste (Spotify, YouTube, Tomplay). Campus-Groovelab ist kein Diensteanbieter für das Teilen von Online-Inhalten gem. § 2 UrhDaG.
(2) **Didaktische Schüleraufnahmen & Privatkopie:** Im Rahmen des Unterrichts gehostete Schüler-Übungsaufnahmen (didaktische Cover-Versionen) dienen rein dem pädagogischen Feedback mit der Lehrkraft (§ 60a UrhG) sowie dem geschlossenen privaten Kreis der Familie (§ 53 Abs. 1 UrhG). Es existiert keine öffentliche Mediathek und kein unberechtigter Fremdzugriff.
(3) **GEMA / AKM / SUISA Klarstellung:** Durch die bloße Bereitstellung der Plattform entstehen keine gesonderten Melde- oder Vergütungspflichten der Plattform gegenüber Verwertungsgesellschaften. Die Lizenzierung des Präsenzunterrichts und von Aufführungen obliegt der Musikschule über die Rahmenverträge ihrer Verbände.
(4) **Notice-and-Takedown Engine (Art. 6 & 16 DSA / § 10 DDG):** Als Host-Provider haftet der Betreiber gemäß Art. 6 DSA erst ab tatsächlicher Kenntnis rechtswidriger Inhalte. Beanstandungen können an copyright@campus-groovelab.de übermittelt werden. Berechtigt beanstandete Inhalte werden serverseitig unverzüglich, spätestens binnen 24 Stunden, global deaktiviert (HTTP 410 Resource Suspended).
(5) **BGH-fester Freistellungsanspruch:** Die Musikschule trägt die organisatorische Verantwortung dafür, dass ihre Lehrkräfte und Schüler keine rechtswidrigen Inhalte einstellen. Sollte der Betreiber von Urhebern, Verlagen oder Verwertungsgesellschaften wegen Inhalten der Nutzer der Musikschule in Anspruch genommen werden, stellt die Musikschule den Betreiber von allen berechtigten Ansprüchen Dritter einschließlich der erforderlichen angemessenen Kosten der Rechtsverteidigung frei, es sei denn, die Musikschule hat die Rechtsverletzung nachweislich nicht zu vertreten.

### 5. Arbeitszeit-Compliance, Herrenberg-Schutzschild (BSG B 12 R 3/20 R) & Kinderschutz (§ 8a SGB VIII)
(1) **Arbeitgeber-Alleinverantwortung nach dem Arbeitszeitgesetz (ArbZG):** Campus-Groovelab ist ein asynchrones pädagogisches Arbeits- und Lernmittel. Die Musikschule ist als Arbeitgeberin allein verantwortlich für die Einhaltung der Vorschriften des ArbZG, der Höchstarbeitszeiten sowie der 11-stündigen Ruhezeit (§ 5 ArbZG). Dem Personal steht das Recht auf Nichterreichbarkeit uneingeschränkt zu.
(2) **Herrenberg-Compliance & Freistellung bei Honorarkräften (§ 7a SGB IV / BSG B 12 R 3/20 R):** Campus-Groovelab dient den Lehrkräften zur didaktischen Unterstützung und begründet zu keinem Zeitpunkt eine Weisungs- oder Direktionsgewalt. Der Stundenplan- und Raumbelegungsprozess folgt dem zweiseitigen Ressourcenmodell gem. § 1 Abs. 5: Lehrkräfte stimmen Termine autonom mit Schülern ab und übermitteln unverbindliche Entwürfe; das Schulsekretariat prüft Raumkollisionen und weist nach eigenem Ermessen einen freien Raum zu (keine hoheitliche Terminzuteilung). Lehrkräften steht die Übermittlungsfreiheit auf herkömmlichen Wegen vollumfänglich offen. Bindet die Musikschule freie Mitarbeiter ein, stellt sie in eigener Verantwortung sicher, dass keine weisungsgebundene Eingliederung im Sinne der BSG-Rechtsprechung (Herrenberg-Urteil) vorliegt. Die Schule stellt den Betreiber von jeglichen Nachforderungen von Sozialversicherungsbeiträgen oder Säumniszuschlägen durch Sozialkassen (§ 7a SGB IV) im Innenverhältnis frei, sofern diese auf der internen Beauftragungspraxis der Schule beruhen.
(3) **Rechtsnatur der 1-Tap Kontaktdokumentation („Erreicht“):** Soweit Lehrkräfte im Rahmen des Ausfall- oder Krisenmanagements die telefonische Kontaktaufnahme zu Schülern bzw. Erziehungsberechtigten per 1-Tap als „Erreicht“ quittieren, handelt es sich um eine rein interne pädagogische Dokumentationsnotiz der handelnden Lehrkraft. Dieser Vermerk begründet keine gesetzliche Zugangsfiktion gem. § 130 BGB oder einen rechtssicheren Zugangsnachweis gegenüber den Erziehungsberechtigten.
(4) **Institutioneller Kinderschutz & Vier-Augen-Prinzip (§ 8a SGB VIII):** Chatverläufe zwischen Lehrkräften und minderjährigen Schülern sind für Erziehungsberechtigte über das Eltern-Portal transparent einsehbar (Vier-Augen-Prinzip). Ein unüberwachter Privatchat zwischen Minderjährigen untereinander ist serverseitig ausgeschlossen. Verdachtsmeldungen können an kinderschutz@campus-groovelab.de gerichtet werden.
(5) **Ausschluss von Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG):** Die Plattform verzichtet vollständig auf Funktionen zur Verhaltens- oder Leistungskontrolle von Lehrkräften.

### 6. B2B-Gewährleistung, Haftungsbegrenzung & Versicherungsschutz
(1) **Ausschluss anfänglicher Mängel (§ 536a Abs. 1 Alt. 1 BGB):** Die verschuldensunabhängige Haftung des Betreibers für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB [DE] / § 1096 ABGB [AT] / Art. 259a OR [CH]) wird ausdrücklich und vollumfänglich ausgeschlossen.
(2) **Haftungsmaßstab:** Bei einfacher Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) begrenzt auf den vertragstypisch vorhersehbaren Schaden. Die Haftung für entgangenen Gewinn, mittelbare Schäden, Mangelfolgeschäden oder ausgefallene Unterrichtsstunden ist ausgeschlossen.
(3) **BGH-konformer B2B Liability Cap & Versicherungsschutz (§ 307 BGB):**
(a) Der Betreiber unterhält zur Absicherung von Großschäden und Cyberrisiken eine gewerbliche IT-Vermögensschaden- sowie eine Cyber-Risiko-Versicherung mit einer Deckungssumme von mindestens 2.000.000,00 € je Versicherungsfall.
(b) Für Schäden, die durch einfache Fahrlässigkeit bei Verletzung von wesentlichen Vertragspflichten (Kardinalpflichten) verursacht werden, ist die Haftung des Betreibers der Höhe nach auf den vertragstypisch vorhersehbaren Schaden begrenzt, maximal jedoch auf die Summe der vom Kunden in den vorangegangenen zwölf (12) Monaten tatsächlich an den Betreiber gezahlten Netto-Vergütung (mindestens jedoch 1.000,00 € bzw. CHF 1'000.00, höchstens 10.000,00 € bzw. CHF 10'000.00 je Kalenderjahr).
(c) Die Haftungsgrenze nach Buchstabe (b) gilt als eigenständige, unbedingte Höchstbegrenzung im Sinne von § 307 BGB und besteht unabhängig davon, ob oder in welcher Höhe der Versicherer im konkreten Schadensfall leistet.
(d) Die vorstehenden Haftungsbegrenzungen gelten nicht bei Vorsatz, grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie bei gesetzlich zwingender Haftung (Produkthaftungsgesetz).
(4) **Mitverschuldensklausel & Exportmodul (§ 254 BGB):** Die Plattform stellt Schülern, Eltern und Lehrkräften eine 1-Klick-Funktion „Export“ zur Verfügung, mit der das didaktische Hausaufgabenheft, Notizen und Übe-Protokolle als PDF oder strukturierte Datei lokal gesichert werden können. Die Nutzer sind im Rahmen ihrer gesetzlichen Schadensminderungspflicht (§ 254 BGB) gehalten, wichtige Einträge in regelmäßigen Abständen (mindestens halbjährlich) lokal zu sichern. Für den Verlust von Daten haftet der Betreiber der Höhe nach nur insoweit, als der Schaden auch bei ordnungsgemäßer Datensicherung entstanden wäre (beschränkt auf den typischen Wiederherstellungsaufwand aus den regulären Backups).
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
      'Zero-Abofalle: Feste Schuljahres-Befristung ohne automatische Verlängerung; Folgejahr beginnt erneut mit kostenfreiem Probemonat',
      'Sanfter Basis-Fallback (0,09 €): Bei Nicht-Fortführung dauerhafter Erhalt von Stundenplan und Raum ohne Kosten für die Familie',
      'Button-Lösung nach § 312j BGB & Widerrufserlöschen gem. § 356 Abs. 5 BGB bei sofortiger Bereitstellung',
      'Zero-Photo-Doktrin & Notenverbot: 100 % bild- und notenblattfreier Raum; Avatare und freie Metadaten',
      'PIN-Freigabelinks: Nutzung ausschließlich im engsten privaten Familienkreis gem. § 53 Abs. 1 UrhG',
      'Pädagogischer Enthaftungsschild: Kein geschuldeter Lernerfolg; rein unterstützende Übe-Werkzeuge'
    ],
    checkboxLabel: 'Ich akzeptiere die Plattform-Nutzungsbedingungen für Campus-Groovelab (bei Minderjährigen unter 18 Jahren durch die Erziehungsberechtigten bzw. mit deren ausdrücklicher Einwilligung).',
    fullTextMarkdown: `
### 1. Leistungsbeschreibung, Kostenfreiheit & Zivilrechtliche Vertragspartnerschaft (§ 2 & §§ 106 ff. BGB)
(1) Campus-Groovelab bietet Schülerinnen, Schülern und Eltern eine geschützte digitale Begleitung für den Instrumental-, Gesangs- und Ensembleunterricht an Musikschulen.
(2) **Zivilrechtliche Vertragspartnerschaft bis zur Volljährigkeit:** Bei minderjährigen Schülerinnen und Schülern bis zur Vollendung des 18. Lebensjahres (gesetzliche Volljährigkeit gem. § 2 BGB) sind und bleiben ausnahmslos die Erziehungsberechtigten Vertragspartner für die Plattformnutzung sowie für etwaige entgeltliche Zusatzmodule (wie Schüler-Jahresbeiträge bei Direktabrechnung). Minderjährige können ohne ausdrückliche Einwilligung ihrer gesetzlichen Vertreter keine vertraglichen Zahlungsverpflichtungen begründen (§§ 106 ff. BGB).
(3) **Gemeinsames Sorgerecht & Vertretungsvermutung (§ 1629 Abs. 1 Satz 2 BGB):** Meldet ein Elternteil ein minderjähriges Kind an oder schaltet Module frei, versichert dieser Elternteil an Eides statt, zur gesetzlichen Vertretung allein berechtigt zu sein oder im ausdrücklichen Einvernehmen und mit Vollmacht des weiteren sorgeberechtigten Elternteils zu handeln. Der handelnde Elternteil stellt den Plattformbetreiber sowie die Musikschule im Innenverhältnis von allen Ansprüchen oder Einwendungen des anderen Elternteils frei.
(4) Für Schülerinnen und Schüler entstehen durch die reine Basisnutzung keine gesonderten Lizenzkaufgebühren (0,00 € inklusive).

### 2. Jugendschutz, Datenschutz-Mündigkeit (Art. 8 DSGVO), Zero-Photo-Doktrin & Zero-AI
(1) **Datenschutzrechtliche Mündigkeit:**
- Bis zum vollendeten 16. Lebensjahr bedürfen datenschutzrechtliche Einwilligungen (insbesondere in didaktische Audioaufnahmen im Übe-Studio gem. Art. 8 Abs. 1 DSGVO und § 22 KUG) der zwingenden Autorisierung durch die Erziehungsberechtigten (über die PIN-geschützte Elternfreigabe).
- Jugendliche zwischen dem vollendeten 16. und dem 18. Lebensjahr besitzen die gesetzliche Mündigkeit, ihre datenschutzrechtliche Einwilligung in didaktische Audioaufnahmen selbstständig zu erteilen oder zu widerrufen. Die zivilrechtliche Vertragspartnerschaft für das Benutzerkonto verbleibt hiervon unberührt bis zum 18. Lebensjahr bei den Erziehungsberechtigten.
(2) **Radikale Datenminimierung & Zero-Photo-Doktrin (§ 22 KUG / Art. 25 DSGVO):** Im Schülerprofil werden keine Bankdaten, keine E-Mail-Adressen, keine Telefonnummern und keine sensiblen Vertragsdaten gespeichert. Zur Wahrung des Prinzips der Datenminimierung wird bei Schülern ausschließlich der Tag des Geburtstags (Tag 1..31) für didaktische Kalenderfunktionen erhoben (kein Monat, kein Jahr). Reale Porträtfotos und private Bild-Uploads durch Schüler oder Eltern sind auf der Plattform technisch ausgeschlossen und untersagt (§ 22 KUG); es kommen ausnahmslos stilisierte Musiker-Avatare zum Einsatz.
(3) Schülernamen werden im Lehrerbereich datensparsam pseudonymisiert dargestellt („Vorname + N.“).
(4) **Zero-AI-Garantie:** Die Plattform ist zu 100 % werbefrei. Didaktische Audioaufnahmen, Notizen und Nutzungsdaten werden zu 0 % für das Training von Machine-Learning-Algorithmen oder generativer künstlicher Intelligenz verwendet.
(5) **Kinderschutz-Clearing:** Bei Hinweisen auf Grenzverletzungen steht die Clearing-Adresse kinderschutz@campus-groovelab.de zur Verfügung.

### 3. Bereitstellungsbeitrag, Schuljahres-Befristung & Sanfter Basis-Fallback
(1) **Kostenfreier Schuljahres-Probemonat:** Zu Beginn jedes neuen Schuljahres (September) sowie bei erstmaliger Neuanmeldung steht das didaktische Campus-Modul allen Schülerinnen, Schülern und Erziehungsberechtigten für den ersten Monat zu 100 % kostenfrei zum Kennenlernen zur Verfügung.
(2) **Feste Schuljahres-Befristung (Keine Abofalle):** 
Entscheiden sich die Erziehungsberechtigten für die Weiternutzung der erweiterten didaktischen Funktionen für das laufende Schuljahr, wird hierfür ein einmaliger, pauschaler Bereitstellungsbeitrag von maximal 5,39 € (DE/AT) bzw. CHF 11.00 (CH) für das gesamte verbleibende Schuljahr fällig. Die Bereitstellung endet ausnahmslos und automatisch mit Ablauf des jeweiligen Schuljahres (31. August), ohne dass es einer Kündigung bedarf. Es findet zu keinem Zeitpunkt eine automatische Verlängerung oder wiederkehrende Abbuchung statt.
(3) **Sanfter Basis-Fallback (Kostenschutz & Ausschluss von Zahlungsverzug):**
Leisten die Erziehungsberechtigten für ein Folgeschuljahr keinen erneuten Bereitstellungsbeitrag, entstehen keinerlei Zahlungsverpflichtungen, Mahnungen oder Verzugsschäden. Das Benutzerprofil wird in diesem Fall automatisch und unterbrechungsfrei auf die Basis-Bereitstellung (0,09 € / Mo. DE/AT bzw. CHF 0.20 / Mo. CH) umgestellt, deren Kosten vollumfänglich von der Musikschule getragen werden. Der Zugriff auf den persönlichen Stundenplan, die Raumzuweisung und die schulische Grundkommunikation bleibt dem Schüler dauerhaft und ohne Datenverlust erhalten.
(4) **Gesetzliches Erlöschen des Widerrufsrechts (§ 356 Abs. 5 BGB):**
Da die Bereitstellung des digitalen Zugangs unmittelbar mit der bewussten Freischaltung nach dem kostenfreien Probemonat beginnt, erlischt das gesetzliche 14-tägige Widerrufsrecht des Verbrauchers mit Beginn der Ausführung des Vertrags (§ 356 Abs. 5 BGB), nachdem der Nutzer hierzu seine ausdrückliche Zustimmung erteilt und seine Kenntnis über das Erlöschen bestätigt hat. Das Recht zur kostenfreien Nicht-Fortführung während des Probemonats (Absatz 1) bleibt hiervon unberührt.
(5) **Button-Lösung nach § 312j Abs. 3 BGB:** Soweit eine entgeltliche Buchung ausgelöst wird, erfolgt die Bestätigung über eine eindeutig mit „Zahlungspflichtig bestellen“ beschriftete Schaltfläche. Unmittelbar darüber werden Gesamtpreis, Laufzeit und Leistungsumfang transparent zusammengefasst.
(6) **Härtefall- & Trägerförderung (Kostenfreiheit für Familien):** Wird das Profil eines Schülers durch die Musikschule als gefördertes Profil, Geschwisterbefreiung oder im Rahmen des Härtefall-Kontingents übernommen (§ 267 BGB), entfällt die Pflicht zur Leistung des Bereitstellungsbeitrags für die Erziehungsberechtigten vollständig (0,00 €). Etwaige Zahlungsaufforderungen oder Bezahlschranken im Benutzerkonto werden serverseitig unterdrückt. Es entstehen für die Familie keinerlei Zahlungsverpflichtungen oder Kündigungsobliegenheiten.

### 4. Pädagogischer Enthaftungsschild (Keine Erfolgsgarantie) & Sensorik
(1) **Kein geschuldeter Lernerfolg:** Der Betreiber stellt rein technische Hilfsmittel (Übe-Timer, Metronom, Loopstation, Gamification) bereit. Die didaktische Unterrichtsgestaltung, der persönliche Lernerfolg, Schulnoten, Prüfungsergebnisse und die tatsächliche musikalische Beherrschung des Instruments verbleiben in der ausschließlichen pädagogischen Verantwortung von Musikschule, Lehrkraft und Schüler. Ein bestimmter Lernerfolg wird nicht geschuldet und ist ausgeschlossen.
(2) **Endgeräte- & Sensorik-Ausschluss:** Die Funktion gerätespezifischer Features (z. B. Display-Down-Sensorik beim Übe-Timer) hängt von der Hardware des Endgeräts ab. Für Messungenauigkeiten oder Betriebssystemeinschränkungen des Endgeräts übernimmt der Betreiber keine Haftung.
(3) **Mitwirkung & lokale Sicherung (§ 254 BGB):** Schülern und Erziehungsberechtigten steht im Profilbereich eine 1-Klick-Funktion „Export“ zur Verfügung, mit der das digitale Hausaufgabenheft, didaktische Notizen und Übe-Protokolle jederzeit als PDF oder maschinenlesbare Datei lokal gesichert werden können. Es obliegt den Nutzern, wichtige Übe-Aufzeichnungen in regelmäßigen Abständen (mindestens zum Schulhalbjahr) lokal herunterzuladen. Für den Verlust von Einträgen haftet der Betreiber nicht über den typischen Wiederherstellungsaufwand aus den Standard-Backups hinaus.

### 5. Technischer Botenstatus bei Unterrichtsabsagen & Ausschluss von Hauptvertragskündigungen
(1) **Elektronische Botenfunktion:** Soweit Schüler oder Erziehungsberechtigte über die Plattform (Terminkalender, Shoutbox) Termine absagen oder Mitteilungen senden, agiert die Plattform als reiner technischer Übermittlungsbote im Auftrag des Absenders.
(2) **Verhältnis zum Musikschulunterrichtsvertrag:** Mitteilungen über die App berühren die zwischen den Erziehungsberechtigten und der Musikschule vereinbarten Unterrichts-, Honorar- und Nachholregelungen nicht.
(3) **Ausschluss formbedürftiger Erklärungen:** Rechtserhebliche Willenserklärungen, die den Bestand des Unterrichtsvertrags mit der Musikschule betreffen (insbesondere formelle Kündigungen des Musikschulvertrags), können über Campus-Groovelab **nicht** wirksam erklärt werden. Sie sind zwingend auf den herkömmlichen Primärwegen der Musikschule (schriftlich oder per E-Mail an das Sekretariat) einzureichen.
(4) **Ausschluss von Gesundheitsdaten (Art. 9 DSGVO):** Mitteilungen über Abwesenheiten beschränken sich auf die Angabe „verhindert“. Die Eingabe von Diagnosen, Symptomen oder Attesten ist strengstens untersagt.
(5) **Zugang von Benachrichtigungen & Unterrichtsmitteilungen (§ 130 BGB):** Elektronische Benachrichtigungen über Unterrichtsänderungen, Vertretungen, Raumverlegungen oder Unterrichtsausfälle gelten dem Nutzer bzw. dessen Erziehungsberechtigten als zugegangen (§ 130 BGB), sobald sie im persönlichen Benutzerbereich (Mitteilungen / Stundenplan) abrufbar bereitgestellt sind oder die Kenntnisnahme elektronisch bestätigt wird.

### 6. Vollständiger Ausschluss von Noten-Uploads & Noten-Sharing (§ 1 Abs. 2 UrhDaG)
Die Plattform stellt für Schüler und Erziehungsberechtigte zu keinem Zeitpunkt Funktionen zum Hochladen, Speichern, Teilen oder Verbreiten von Noten, Notenblättern, Partituren oder Noten-PDFs bereit. Jegliches Teilen von Noten-Dateien ist technisch ausgeschlossen und untersagt. Didaktische Hausaufgaben verweisen ausnahmslos auf freie bibliografische Metadaten (Titel, Lehrwerk, Seitenzahlen) zur Nutzung mit im Fachhandel legal erworbenen Druckwerken.

### 7. Mehrjährige didaktische Bildungsbiografie & PIN-Freigabelinks (§ 53 UrhG vs. § 19a UrhG)
(1) Im Rahmen der didaktischen Bildungsbiografie (Vinyl-Plattentasche, Meisterwerk-Protokoll) werden erstellte Übe- und Songaufnahmen des Schülers kumulativ über die gesamte Dauer des bestehenden Musikschulunterrichtsvertrages gespeichert, um die langfristige musikalische Entwicklung zu begleiten. Die physische Löschung erfolgt endgültig dreißig (30) Tage nach formeller Beendigung des Unterrichtsvertrages (Exmatrikulation).
(2) Soweit die Plattform die Erstellung PIN-geschützter Freigabelinks (z. B. 4-stellige PIN für Playlists) oder lokaler Archiv-Exporte (Zip-Dateien) ermöglicht, dürfen diese Freigaben ausnahmslos und ausschließlich im engsten privaten Kreis der Familie und Verwandten (§ 53 Abs. 1 UrhG) genutzt werden. Jede öffentliche Zugänglichmachung (§ 19a UrhG), insbesondere das Teilen von Freigabelinks, Passwörtern oder PINs auf öffentlich zugänglichen Webseiten, sozialen Netzwerken (wie YouTube, TikTok, Instagram, Facebook) oder in öffentlichen Messenger-Gruppen ist urheberrechtlich strengstens untersagt und berechtigt zur sofortigen Sperrung des Freigabelinks.
(3) Bei der Nutzung der lokalen Zip-Exportfunktion obliegt die sichere Verwahrung der heruntergeladenen Dateien allein dem Nutzer. Der Betreiber haftet nicht für Datenverluste auf Endgeräten des Nutzers (§ 254 BGB).

### 8. Didaktik-Gamification & Punkte-Ausschluss (DSA Art. 25 & § 3 GlüStV)
Die in der Plattform integrierten didaktischen Spielfunktionen (Didaktik-Match, Schüler-Lehrer-Blindtipp, XP-Punkte, Streaks, Meister-Ohr Sticker) dienen ausschließlich der musikalischen Gehörbildung, der Förderung der Selbsteinschätzung und der didaktischen Motivation. Sie stellen zu keinem Zeitpunkt ein Glücksspiel gem. § 3 GlüStV dar. XP-Punkte, Sticker und Level besitzen keinerlei monetären Gegenwert, sind nicht übertragbar, begründen keinen Anspruch auf Sach- oder Geldleistungen und verfallen bei Beendigung des Benutzerkontos vollumfänglich und entschädigungslos.

### 9. Live-Lab Steuerung, Kiosk-Stationen & Remote-Session-Beendigung
(1) Zur Sicherstellung eines geordneten Schul- und Übebetriebs an Vor-Ort-Übestationen der Musikschule ist das Schulsekretariat berechtigt, verwaiste, überzogene oder inaktive Übesitzungen administrativ per Fernzugriff zu beenden (Remote-Logout).
(2) Bei der Nutzung von Gemeinschaftsterminals, Schüler-Tablets oder Kiosk-Stationen in den Räumen der Musikschule ist der Nutzer verpflichtet, sich nach Beendigung der Übeeinheit ordnungsgemäß über die Schaltfläche „Abmelden“ auszuloggen. Für den unbefugten Einblick Dritter in Benutzerprofile, die auf ein unterlassenes Ausloggen an geteilten Geräten zurückzuführen sind, übernimmt der Betreiber keine Haftung.

### 10. Verbraucherstreitbeilegung (§ 36 VSBG) & Salvatorische Klausel
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

### 3. Didaktische Audioaufnahmen, Urheberrechte, Notizen & Loopstation
(1) Über die Plattform angefertigte oder übermittelte Audioaufnahmen (Hausaufgaben-Audios, Loopstation-Spuren) dienen ausschließlich dem individuellen Lernfortschritt des jeweiligen Schülers.
(2) Sämtliche Urheber- und Nutzungsrechte an von der Lehrkraft selbst erstellten Übungsmaterialien und Audio-Loops verbleiben uneingeschränkt bei der Lehrkraft.
(3) Eine Veröffentlichung oder Weitergabe von Schüleraufnahmen an Dritte außerhalb des geschützten Unterrichtskontexts ist der Lehrkraft streng untersagt.
(4) **Zweckbindung pädagogischer Notizen & DSGVO-Transparenz (Art. 15 DSGVO):** Notizen und Memos im didaktischen Schüler- und Hausaufgabenprotokoll dienen ausschließlich der didaktischen Unterrichtsgestaltung und musikalischen Lernbegleitung. Lehrkräfte verpflichten sich, Einträge sachlich, professionell und frei von herabwürdigenden oder diskriminierenden Formulierungen zu halten. Den Lehrkräften ist bewusst, dass didaktische Notizen über Schülerinnen und Schüler dem gesetzlichen Auskunfts- und Einsichtsrecht der Erziehungsberechtigten gemäß Art. 15 DSGVO unterliegen können.
(5) **Urheberrechtliche Pflichten im Didaktik-Studio & Noten-Upload-Verbot (§ 1 Abs. 2 UrhDaG / § 60a UrhG):** Lehrkräfte nehmen zur Kenntnis, dass auf der Plattform zu keinem Zeitpunkt Notenblätter, Leadsheets oder Noten-PDFs hochgeladen oder geteilt werden dürfen. Aufgabenstellungen beschränken sich auf die bloße bibliografische Nennung von gedruckten Lehrwerken und Seitenzahlen (§ 60a UrhG). Eigene von der Lehrkraft bereitgestellte Vorführ-Audios müssen frei von Rechten Dritter sein.

### 4. Datengeheimnis, Vertraulichkeit & Ausschluss von Gesundheitsdaten (Art. 9 DSGVO)
(1) Die Lehrkraft verpflichtet sich, alle Schüler- und Kollegendaten vertraulich zu behandeln und Zugangsdaten vor dem Zugriff unbefugter Dritter zu schützen.
(2) Das Anfordern oder Speichern von Diagnosen, Attesten oder sensiblen Gesundheitsdaten Minderjähriger (Art. 9 DSGVO) ist untersagt. Bei Unterrichtsausfällen genügt die Angabe „verhindert“.
(3) **Rechtsnatur der 1-Tap Kontaktdokumentation („Erreicht“):** Soweit Lehrkräfte im Rahmen des Ausfall- oder Krisenmanagements die telefonische Kontaktaufnahme zu Schülern bzw. Erziehungsberechtigten per 1-Tap als „Erreicht“ quittieren, handelt es sich um eine rein interne pädagogische Dokumentationsnotiz der handelnden Lehrkraft zur eigenen Arbeitsorganisation ohne gesetzliche Zugangsfiktion gem. § 130 BGB.

### 5. Zweistufige Stundenplan- und Raumdisposition (Herrenberg-Compliance & kommunale Raumhoheit)
(1) Die Stundenplanerstellung folgt der strikten Trennung zwischen pädagogischer Unterrichtsabstimmung und behördlicher Raumvergabe:
(a) Lehrkräfte stimmen Unterrichtstermine fachlich und methodisch eigenverantwortlich mit ihren Schülern ab und übermitteln den fertigen Stundenplan als **unverbindlichen pädagogischen Vorschlagsentwurf ohne eigenmächtige Raumwahl** an das Schulsekretariat. Lehrkräfte besitzen im System keine Befugnis zur eigenständigen Raumbelegung.
(b) Das Schulsekretariat prüft den eingereichten Stundenplanentwurf auf Vereinbarkeit mit den Raumressourcen der Musikschule und **weist der Lehrkraft nach eigenem pflichtgemäßem Ermessen einen freien Unterrichtsraum zu**.
(c) Erst mit der Raumzuweisung und der formellen Freigabe durch das Schulsekretariat im Primärverwaltungssystem erlangt der Stundenplan organisatorische Gültigkeit für den Schulbetrieb. Bis zu dieser Freigabe verbleibt der Entwurf im unverbindlichen Vorbehaltsstatus.
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

### 4. Schutz des vertraulichen Wortes (§ 201 StGB)
Didaktische Audioaufnahmen erfolgen ausschließlich im gegenseitigen Einvernehmen der Beteiligten im geschützten Lernkontext. Das unbefugte Mitschneiden oder die unberechtigte Weitergabe nichtöffentlich gesprochener Worte außerhalb des autorisierten Teilnehmerkreises ist strafbar (§ 201 StGB) und auf der Plattform strengstens untersagt.
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
(2) **Meldung von Datenschutzverletzungen:** Der Auftragnehmer meldet dem Auftraggeber Verletzungen des Schutzes personenbezogener Daten unverzüglich, bei schwerwiegenden Datenpannen (P1) mit potentiellem Datenabfluss spätestens binnen **vierundzwanzig (24) Stunden**, bei sonstigen technischen Vorfällen spätestens binnen **achtundvierzig (48) Stunden** nach Bekanntwerden, sodass dem Auftraggeber ein ausreichender Puffer zur Erfüllung der gesetzlichen 72-Stunden-Meldepflicht nach Art. 33 DSGVO verbleibt.
(3) **Datenschutz-Folgenabschätzungen:** Der Auftragnehmer unterstützt den Auftraggeber bei der Einhaltung der in den Art. 32 bis 36 DSGVO genannten Pflichten (einschließlich Bereitstellung des behördlichen DPO-Compliance-Dossiers).

### 7. Löschung & Rückgabe von Daten (Art. 28 Abs. 3 lit. g DSGVO)
Nach Beendigung der Erbringung der Verarbeitungsleistungen löscht der Auftragnehmer alle personenbezogenen Daten nach Ablauf einer 30-tägigen Karenzfrist für den Datenexport unwiederbringlich und nach den Vorgaben der DIN 66398, sofern nicht nach dem Recht der Union oder der Mitgliedstaaten eine Verpflichtung zur Speicherung besteht.

### 8. Nachweis- & Überprüfungsrechte (Art. 28 Abs. 3 lit. h DSGVO)
Der Auftragnehmer stellt dem Auftraggeber alle erforderlichen Informationen zum Nachweis der Einhaltung der in Art. 28 DSGVO niedergelegten Pflichten zur Verfügung und ermöglicht Überprüfungen (einschließlich Inspektionen), die vom Auftraggeber oder einem von diesem beauftragten Prüfer durchgeführt werden.

### 9. Technischer Support-Fernzugriff, Diagnosezugriff („Ghost Support“) & Revisionssicherheit
(1) Soweit der Auftragnehmer zur Beseitigung gemeldeter Systemstörungen, zur Wiederherstellung der Datenbankintegrität oder zur Abwehr akuter Cyber-Risiken einen administrativen Fernzugriff auf den Mandanten des Auftraggebers ausüben muss („Ghost Support / Session Leasing“), erfolgt dieser Zugriff ausschließlich weisungsgebunden auf Veranlassung der Schule bzw. zur vertraglichen Störungsbehebung.
(2) Der Auftragnehmer beschränkt den Zugriff zeitlich und inhaltlich auf das für die Diagnose zwingend erforderliche Minimum. Ein Auslesen oder Speichern persönlicher Schülerchats, Notizen oder vertraulicher Schülerbeurteilungen außerhalb des Diagnosekontexts ist untersagt.
(3) Jeder administrative Zugriff wird mit Benutzerkennung, Zeitstempel, IP-Adresse und durchgeführter Aktion kryptografisch versiegelt im revisionssicheren Prüfpfad (\`master_audit_trail\`) protokolliert und für mindestens zwölf (12) Monate zur Einsichtnahme durch den Datenschutzbeauftragten der Schule vorgehalten.

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
4. **Ausdrücklich ausgeschlossene Datenkategorien:** Besondere Kategorien personenbezogener Daten gem. Art. 9 DSGVO (insbesondere Gesundheitsdaten, Atteste, Diagnosen oder biometrische Erkennungsdaten), Bank-, SEPA- oder Kreditkartendaten von Schülern und Eltern sowie urheberrechtlich geschützte digitale Notenblätter (PDFs) und reale Porträtfotos von Schülern (strikte Zero-Photo-Doktrin).

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
      'Verfügbarkeitsgarantie von 99,5 % im jeweiligen Kalendermonat für die Cloud-Infrastruktur',
      'Strikter Ausschluss der Drittbegünstigung (§ 328 BGB): Gilt ausschließlich im B2B-Verhältnis mit der Schule (0 % Endnutzer-SLA)',
      'Geplante Wartungsfenster außerhalb der Kernunterrichtszeiten (werktags 22:00–06:00 Uhr) & unaufschiebbare Notfall-Sicherheits-Patches',
      'Beitragsfreies Gratismonate-Kompensationsmodell (1, 2, 3 oder 6 Gratismonate) auf die monatliche Hosting-Basispauschale',
      'Vollständiger Ausschluss von Barauszahlungen (No Cash Value) und Ausschlussfrist von 30 Kalendertagen'
    ],
    checkboxLabel: 'Ich nehme die Service-Level-Vereinbarung (SLA) zur Kenntnis.',
    fullTextMarkdown: `
### 1. Geltungsbereich & Ausschluss von Rechten Dritter (§ 328 BGB)
(1) Dieses Service Level Agreement (SLA) regelt die technische Verfügbarkeit und den Support der Cloud-Infrastruktur von **Campus-Groovelab** im B2B-Verhältnis zwischen dem Betreiber und der vertragschließenden Musikschule bzw. dem Träger (nachfolgend „Kunde“).
(2) **Ausschluss der Drittbegünstigung:** Dieses SLA entfaltet rechtliche Schutz- und Erfüllungswirkung ausschließlich zugunsten des vertragsschließenden Kunden. Die Einbeziehung Dritter in den Schutzbereich ist ausdrücklich abbedungen (§ 328 BGB). Endnutzer – insbesondere Lehrkräfte, Schülerinnen und Schüler sowie Erziehungsberechtigte – erwerben aus diesem SLA keine eigenen Primär-, Erfüllungs-, Minderungs- oder Schadensersatzansprüche gegen den Betreiber.

### 2. Verfügbarkeitszusage & Messmethode
(1) Der Betreiber gewährleistet eine Verfügbarkeit der Plattform am Übergabepunkt der Server- und Datenbankinfrastruktur an das öffentliche Internet von mindestens **99,5 % im jeweiligen Kalendermonat**.
(2) Das monatliche Zeitbudget errechnet sich aus 24 Stunden an allen Tagen des jeweiligen Kalendermonats abzüglich ordnungsgemäß durchgeführter Wartungsfenster gemäß Ziffer 3.
(3) Die Plattform gilt als verfügbar, wenn autorisierte Nutzer auf die Kernfunktionen (Authentifizierung, Datenbankzugriff und Hauptnavigation) über das Internet zugreifen können.

### 3. Wartungsfenster & Notfall-Sicherheits-Patches
(1) **Planmäßige Wartung:** Erforderliche Wartungsarbeiten finden vorzugsweise außerhalb der Hauptunterrichtszeiten statt (werktags zwischen 22:00 Uhr und 06:00 Uhr MEZ sowie an Sonn- und bundeseinheitlichen Feiertagen). Sie werden mindestens 48 Stunden im Voraus per E-Mail oder System-Banner angekündigt und dürfen 12 Stunden im Kalendermonat nicht überschreiten.
(2) **Dringende Notfall-Wartung:** Unaufschiebbare Notfallmaßnahmen zur Abwehr akuter Cyber-Angriffe, zur Schließung kritischer Sicherheitslücken (Zero-Day-Exploits) oder zur Abwendung schwerer Datenverluste können ohne Einhaltung einer Vorankündigungsfrist durchgeführt werden. Der Betreiber informiert den Kunden hierüber unverzüglich.
(3) Zeiten ordnungsgemäßer planmäßiger oder unaufschiebbarer Notfall-Wartungsfenster gelten nicht als Ausfallzeiten und bleiben bei der Berechnung der Verfügbarkeitsquote unberücksichtigt.

### 4. Störungsklassen & Support-Reaktionszeiten
Meldungen über technische Beeinträchtigungen werden während der regulären Supportzeiten (Werktage Mo–Fr 08:30–17:30 Uhr MEZ) nach folgendem Schema priorisiert:

• **Priorität 1 (Kritisch – Gesamtausfall):** Kernsysteme (Login, Datenbank) sind für alle oder die Mehrheit der Nutzer unbenutzbar.  
  ➔ *Ziel-Reaktionszeit:* **< 2 Stunden** (außerhalb der Supportzeit max. 4 Stunden).  
  ➔ *Angestrebter Workaround / Wiederherstellung:* **< 8 Stunden**.

• **Priorität 2 (Hoch – Wesentliche Teilsysteme beeinträchtigt):** Wichtige Module (z. B. Stundenplaner, Audio-Engine oder Raumverwaltung) weisen erhebliche Störungen auf; Basisbetrieb bleibt möglich.  
  ➔ *Ziel-Reaktionszeit:* **< 4 Stunden**.  
  ➔ *Angestrebte Fehlerbehebung:* **< 24 Stunden**.

• **Priorität 3 (Mittel – Isolierte Komfortfunktionen):** Einzelne Komfortfunktionen (z. B. Gamification-XP, Avatar-Upload) sind gestört; Unterrichts- und Verwaltungsbetrieb gesichert.  
  ➔ *Ziel-Reaktionszeit:* **< 8 Stunden**.  
  ➔ *Behebung:* Im regulären Releasezyklus.

• **Priorität 4 (Niedrig – Allgemeine Anfragen):** Allgemeine Support-, Bedien- oder Konfigurationsfragen.  
  ➔ *Ziel-Reaktionszeit:* **< 24 Stunden**.

*(Hinweis: Bei den angegebenen Reaktions- und Behebungszeiten handelt es sich um qualifizierte Serviceziele [Best-Effort], nicht um verschuldensunabhängige Fristgarantien.)*

### 5. Kompensation: Das beitragsfreie Gratismonate-Modell
(1) Unterschreitet der Betreiber die garantierte Mindestverfügbarkeit von 99,5 % in einem Kalendermonat aus von ihm zu vertretenden Gründen, erhält der Kunde als pauschalierte Entschädigung und Minderung beitragsfreie Verlängerungsmonate (**„Gratismonate“**) auf die monatliche Hosting-Basispauschale:

| Monatliche Verfügbarkeit | Reale Ausfallzeit im Monat | Kompensation (Beitragsfreie Freimonate) |
|---|---|---|
| **99,00 % bis 99,49 %** | mehr als 3,6 Stunden Ausfall | **1 Gratismonat** (folgender Monat 100 % beitragsfrei) |
| **98,00 % bis 98,99 %** | mehr als 7,2 Stunden Ausfall | **2 Gratismonate** (die nächsten 2 Monate beitragsfrei) |
| **95,00 % bis 97,99 %** | mehr als 14,4 Stunden Ausfall | **3 Gratismonate** (ein volles Folgequartal beitragsfrei) |
| **Unter 95,00 %** | mehr als 36,0 Stunden Ausfall | **6 Gratismonate** (ein volles Folgehalbjahr beitragsfrei) |

(2) **Strikte Bemessungsgrundlage:** Die Gratismonate beziehen sich ausschließlich auf die monatliche Netto-Hosting-Basispauschale der Musikschule (Campus 14,90 €, GrooveLab 9,90 € bzw. Kombi 19,90 €). Schüleraktivierungsgebühren, Pädagogenlizenzen und Entgelte Dritter sind ausdrücklich ausgeschlossen.
(3) **Erfüllung & Anrechnung:** Bei monatlicher Zahlweise wird die Hosting-Basispauschale für die Folgemonate auf 0,00 € gesetzt. Bei jährlicher Vorauszahlung werden die Gratismonate beitragsfrei an das vereinbarte Ende der bezahlten Schuljahresperiode angehängt.
(4) **Barausschluss & Verfall (No Cash Value):** Gratismonate stellen eine reine Sachkompensation dar. Ein Anspruch auf Barauszahlung, Überweisung oder Konvertierung in Geld ist ausgeschlossen. Bei Beendigung des Vertragsverhältnisses durch ordentliche Kündigung des Kunden verfallen noch nicht verbrauchte Gratismonate ersatzlos.
(5) **Antrags- und Nachweispflicht (Ausschlussfrist):** Gratismonate werden nicht automatisch gewährt. Der Kunde hat die Unterschreitung innerhalb einer **Ausschlussfrist von 30 Kalendertagen** nach Ablauf des betroffenen Monats in Textform geltend zu machen.
(6) **Abschließendes Rechtsmittel (Sole and Exclusive Remedy):** Die Gewährung von Gratismonaten stellt das alleinige und ausschließliche vertragliche Rechtsmittel des Kunden wegen Verfügbarkeitsunterbrechungen dar. Das gesetzliche Minderungsrecht nach § 536 BGB sowie verschuldensunabhängige Schadensersatzansprüche sind insoweit abbedungen. Gesetzliche Ansprüche wegen Vorsatzes oder grober Fahrlässigkeit sowie das Kündigungsrecht aus wichtigem Grund (§ 314 BGB) bleiben unberührt.

### 6. Ausschlüsse (Haftungsbefreiung)
Als Ausfallzeiten gelten nicht Störungen durch: (a) Höhere Gewalt, kriegerische Ereignisse, Naturkatastrophen oder behördliche Anordnungen; (b) flächendeckende Störungen überregionaler Internet-Backbones, von Tier-1-Carriern oder DNS-Routing außerhalb des Rechenzentrums; (c) DDoS-Angriffe oder Cyber-Attacken, die trotz angemessener und dem Stand der Technik entsprechender Schutzmaßnahmen nicht abgewehrt werden konnten; (d) Ausfälle, die auf Fehlbedienungen, unzureichenden Bandbreiten oder ungeeigneter IT-Infrastruktur auf Seiten des Kunden oder der Endnutzer beruhen.
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

