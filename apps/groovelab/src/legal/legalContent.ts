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
(5) **Benachrichtigungen & Unterrichtsmitteilungen:** Elektronische Benachrichtigungen über Unterrichtsänderungen, Vertretungen, Raumverlegungen oder Unterrichtsausfälle werden im persönlichen Benutzerbereich (Mitteilungen / Stundenplan) unverzüglich bereitgestellt. Wichtige rechtserhebliche Erklärungen bedürfen des tatsächlichen Zugangs (§ 130 BGB).

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
### 1. Präambel, Gegenstand, Subsidiarität & Herrenberg-Immunität
(1) Dieser Vertrag konkretisiert die datenschutzrechtlichen Rechte und Pflichten der Parteien im Rahmen der Nutzung der cloudbasierten Schulmanagement- und didaktischen Übeplattform **Campus-Groovelab**.
(2) **Rollenverteilung & Schweizer nDSG-Parität:** Die Musikschule bzw. der Schulträger ist und bleibt datenschutzrechtlich die alleinige **Verantwortliche** (Art. 4 Nr. 7 DSGVO / Art. 5 lit. j nDSG). Der Betreiber Patrick Huber (Einzelunternehmen) handelt ausschließlich als weisungsgebundener **Auftragsverarbeiter** bzw. **Auftragsbearbeiter** (Art. 28 DSGVO / Art. 9 nDSG). Die Parteien vereinbaren für den Geltungsbereich der Schweiz, dass der Begriff „personenbezogene Daten“ als „Personendaten“ (Art. 5 lit. a nDSG) und „Auftragsverarbeiter“ als „Auftragsbearbeiter“ (Art. 9 nDSG) zu verstehen ist.
(3) **Didaktische Subsidiaritäts-Doktrin („Fast-Track“):** Campus-Groovelab fungiert als didaktisches Begleit- und Beschleunigungswerkzeug. Die Plattform ersetzt weder das amtliche kommunale Schulverwaltungssystem (ERP wie iMikel, MSVplus oder Musikschul-Manager) noch die primären städtischen Kommunikationswege. Sämtliche Termin- und Raumdispositionen erfolgen technisch rein im Botenauftrag der Beteiligten und entfalten keine rechtsgestaltende Bindungswirkung für den Schulbetrieb.
(4) **Herrenberg-Immunität (BSG B 12 R 3/20 R) & Dozentenautonomie:** Stundenplan-, Raum- und Terminbelegungsfunktionen stellen unverbindliche didaktische Dispositionsvorschläge dar. Lehrkräften (insbesondere freien Honorarkräften) steht es vollkommen frei, Stundenpläne oder Terminverschiebungen digital über Campus-Groovelab zu disponieren oder auf herkömmlichem Weg (per E-Mail, Telefon oder Zettel) an die Schulverwaltung zu übermitteln. Die Plattform begründet kein Weisungsverhältnis, keine Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / LPVG) und keinen Eingriff in die organisatorische Selbstständigkeit freier Mitarbeiter.
(5) Die Laufzeit dieser Vereinbarung entspricht der Laufzeit des Hauptvertrages über die Plattformbereitstellung.

### 2. Weisungsbefugnis des Auftraggebers (Art. 28 Abs. 3 lit. a DSGVO / Art. 9 nDSG)
(1) Der Auftragnehmer verarbeitet Personendaten ausschließlich auf dokumentierte Weisung des Auftraggebers. Die Weisungen werden anfänglich durch den Hauptvertrag festgelegt und können vom Auftraggeber nachträglich in Textform geändert oder ergänzt werden.
(2) Ist der Auftragnehmer der Ansicht, dass eine Weisung gegen die DSGVO, das Schweizer nDSG oder andere einschlägige Datenschutzvorschriften verstößt, weist er den Auftraggeber unverzüglich darauf hin.

### 3. Verpflichtung auf das Datengeheimnis, Serverstandort & Schweizer Angemessenheit
(1) Der Auftragnehmer gewährleistet, dass sich die zur Verarbeitung der Daten befugten Personen schriftlich zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen.
(2) Sämtliche Daten werden zu 100 % auf Servern in ISO/IEC 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein & Nürnberg) verarbeitet. Ein Transfer in unsichere Drittstaaten (insbesondere USA) findet nicht statt (0 % US-Cloud-Doktrin / Immunität gegen US CLOUD Act und FISA 702). Für Auftraggeber aus der Schweizerischen Eidgenossenschaft erfolgt die grenzüberschreitende Bekanntgabe der Personendaten nach Deutschland auf Grundlage des verbindlichen Angemessenheitsbeschlusses des Bundesrates gemäss Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 der Datenschutzverordnung (DSV).

### 4. Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO / Art. 8 nDSG & BSI IT-Grundschutz)
(1) Der Auftragnehmer trifft alle nach Art. 32 DSGVO und Art. 8 nDSG erforderlichen technischen und organisatorischen Maßnahmen (TOMs), um ein dem Risiko für die Rechte und Freiheiten der betroffenen Personen angemessenes Schutzniveau zu gewährleisten.
(2) Die konkret vereinbarten Maßnahmen ergeben sich aus **Anlage 2** zu diesem Vertrag. Der Auftragnehmer behält sich vor, Sicherheitsmaßnahmen an den Stand der Technik anzupassen, sofern das vereinbarte Schutzniveau nicht unterschritten wird.

### 5. Unterauftragsverhältnisse & Zero-User-Mail Benachrichtigungsweg (Art. 28 Abs. 3 lit. d DSGVO)
(1) Der Auftraggeber erteilt seine allgemeine Genehmigung zur Hinzuziehung von Unterauftragsverarbeitern. Genehmigt ist der Einsatz der **Hetzner Online GmbH**, Industriestr. 25, 91710 Gunzenhausen, Deutschland (Serverstandorte: Falkenstein/Vogtland und Nürnberg; ISO/IEC 27001 zertifiziert).
(2) Der Auftragnehmer informiert den Auftraggeber mindestens vierzehn (14) Tage im Voraus über jede beabsichtigte Hinzuziehung oder Ersetzung von Unterauftragsverarbeitern. In Übereinstimmung mit dem 100 % Zero-User-Mail-Axiom erfolgt diese Benachrichtigung per Textform an die offizielle institutionelle Schul-E-Mail (\`schools.email\` / \`schools.billing_email\`) bzw. über das autoritative Broadcast-Center im Schulleitungs-Cockpit. Dem Auftraggeber steht ein Widerspruchsrecht aus wichtigem datenschutzrechtlichem Grund zu.

### 6. Unterstützungspflichten, Vorfallsmeldung & DPO-Behördenkoffer (Art. 28 Abs. 3 lit. e & f DSGVO)
(1) **Betroffenenrechte:** Der Auftragnehmer unterstützt den Auftraggeber mit geeigneten technischen und organisatorischen Maßnahmen (u. a. über das integrierte DPO- & Audit-Portal sowie DSGVO-Dossier-Exporte mit SHA-256 Siegel) bei der Erfüllung der Betroffenenrechte (Art. 12–22 DSGVO / Art. 25–29 nDSG).
(2) **Meldung von Datenschutzverletzungen:** Der Auftragnehmer meldet dem Auftraggeber Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens binnen **24 bis maximal 48 Stunden** nach Bekanntwerden, sodass dem Auftraggeber ausreichender Puffer zur Erfüllung der gesetzlichen Meldepflichten (72h gem. Art. 33 DSGVO bzw. „so rasch als möglich“ an den EDÖB gem. Art. 24 nDSG) verbleibt.
(3) **Datenschutz-Folgenabschätzungen & Behördenkoffer:** Der Auftragnehmer unterstützt den Auftraggeber bei der Einhaltung der Art. 32–36 DSGVO durch schlüsselfertige Bereitstellung des kommunalen DPO-Compliance-Dossiers (VVT gem. Art. 30 DSGVO, DSFA-Schwellwertprüfung gem. Art. 35 DSGVO, Personalrats-Attest gem. § 87 BetrVG).

### 7. Löschung, DIN 66398 & Dynamischer Schuljahres-Purge (Art. 17 & 28 Abs. 3 lit. g DSGVO)
(1) Nach Beendigung der Verarbeitungsleistungen löscht der Auftragnehmer alle Daten nach Ablauf einer 30-tägigen Karenzfrist für den Datenexport unwiederbringlich nach DIN 66398.
(2) **Didaktische Audio-Retention & Schuljahres-Purge (Migration 454):** Temporäre Übe- und Hausaufgabenaufnahmen verbleiben für die Dauer des laufenden Schuljahres und werden am Monatsletzten des ersten Monats des individuellen Schuljahres der Musikschule automatisiert bereinigt, nachdem Erziehungsberechtigten eine einmonatige Exportfrist gem. Art. 20 DSGVO gewährt wurde.

### 8. Nachweis-, Inspektions- & Schulträgerrechte (Art. 28 Abs. 3 lit. h DSGVO)
Der Auftragnehmer stellt dem Auftraggeber sowie den zuständigen behördlichen Datenschutzbeauftragten (bDSB) kreisfreier Städte, Landkreise oder Schulverbände alle erforderlichen Nachweise zur Verfügung. Vor-Ort-Inspektionen werden nach angemessener Vorankündigung (in der Regel mindestens 14 Werktage) während der üblichen Betriebszeiten unter Wahrung von Betriebs- und Geschäftsgeheimnissen ermöglicht.

### 9. Technischer Support-Fernzugriff („Ghost Support“) & WORM-Revisionssicherheit
(1) Ein administrativer Support-Zugriff auf den Mandanten des Auftraggebers („Ghost Support / Session Leasing“) erfolgt ausschließlich weisungsgebunden auf Veranlassung der Schulleitung zur Störungsbehebung.
(2) Der Zugriff ist zeitlich auf einen rollenden 15-Minuten-Lease begrenzt. Das Auslesen persönlicher Schüler-Chats oder vertraulicher Notizen außerhalb des Diagnosekontexts ist technisch und organisatorisch untersagt.
(3) Jeder administrative Fernzugriff wird kryptografisch versiegelt im WORM-Audit-Trail (\`master_audit_trail\`) protokolliert und für mindestens zwölf (12) Monate zur Einsichtnahme durch den Datenschutzbeauftragten der Schule vorgehalten.

### 10. Haftung, Freistellung im Innenverhältnis (Hold-Harmless) & Beweislast (Art. 82 DSGVO / Art. 54 nDSG)
(1) Die Parteien haften gegenüber betroffenen Personen nach den gesetzlichen Bestimmungen des Art. 82 DSGVO bzw. Art. 54 nDSG.
(2) Im Innenverhältnis haftet der Auftragnehmer gegenüber dem Auftraggeber ausschließlich für Schäden, die auf einer schuldhaften Pflichtverletzung gegen die ihm nach Art. 28 DSGVO spezifisch auferlegten Pflichten oder der Nichtbeachtung rechtmäßiger Weisungen beruhen.
(3) **Vollständige Freistellung bei Rechtsgrundlagen-Fehlern (Hold-Harmless):** Der Auftraggeber stellt den Auftragnehmer im Innenverhältnis vollumfänglich von sämtlichen Ansprüchen Dritter (insbesondere von Schülern oder Erziehungsberechtigten) sowie von behördlichen Geldbußen, Verfahrens- und Rechtsverteidigungskosten frei, die daraus resultieren, dass der Auftraggeber Personendaten ohne wirksame Rechtsgrundlage (insbesondere ohne die gem. Art. 8 DSGVO / Art. 6 nDSG erforderliche elterliche Zustimmung) in das System eingepflegt oder unzulässige Weisungen erteilt hat.

---

### ANLAGE 1: Gegenstand, Art & Zweck der Verarbeitung, Datenarten & Betroffene

1. **Gegenstand & Zweck:** Bereitstellung einer mandantenisolierten Cloud-Plattform zur digitalen Unterrichtsorganisation, Stundenplanung, Raumverwaltung, didaktischen Übebegleitung (Loopstation, Meisterwerk-Protokoll) und Schulkommunikation.
2. **Kategorien betroffener Personen:**
- Schülerinnen und Schüler der Musikschule (Mindestalter 6 Jahre)
- Erziehungsberechtigte von minderjährigen Schülerinnen und Schülern
- Lehrkräfte und Dozenten (Festangestellte und freie Honorarkräfte)
- Verwaltungsmitarbeiter und Schulleitungen
3. **Kategorien von Personendaten:**
- Lehrkräfte & Verwaltung: Vorname, Nachname, Kürzel, Fächer-/Instrumentenzuordnung, Raum- und Stundenplanzuweisungen (strikt 100 % Zero-User-Mail; es werden ausnahmslos 0 personenbezogene E-Mail-Adressen natürlicher Personen auf dem Server gespeichert).
- Schüler: Vorname, abgekürzter Nachname (z. B. „Max M.“), Geburtstag (Tag 1..31 zur Altersstufenberechnung; kein Geburtsmonat, kein Geburtsjahr), Instrumentenfach, Unterrichtszeit, Raum, stilisierter Musiker-Avatar.
- Erziehungsberechtigte: Identifikator der Elternfreigabe, verschlüsselter Hash der Eltern-PIN, Quittierungszeitstempel für häusliches Üben.
- Didaktische Daten: Übe-Zeiten, Gamification-XP, Level, Hausaufgaben-Notizen, temporäre didaktische Audioaufnahmen (Hausaufgaben- und Loopstation-Spuren im privaten Audio-Tresor).
- Metadaten & Logfiles: IP-Adresse (anonymisiert/gehasht), User-Agent, Sitzungs-Lease-ID, Audit-Logs für Sicherheitsereignisse.
4. **Ausdrücklich ausgeschlossene Datenkategorien:** Besondere Kategorien personenbezogener Daten gem. Art. 9 DSGVO / Art. 5 lit. c nDSG (insbesondere Gesundheitsdaten, Atteste, Diagnosen oder biometrische Erkennungsdaten), Bank-, SEPA- oder Kreditkartendaten von Schülern und Eltern sowie urheberrechtlich geschützte digitale Notenblätter (PDFs) und reale Porträtfotos von Schülern (strikte Zero-Photo-Doktrin mit 3D-Avataren).

---

### ANLAGE 2: Technisch-Organisatorische Maßnahmen (TOMs gem. Art. 32 DSGVO & BSI IT-Grundschutz)

1. **Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO / Art. 8 nDSG):**
- *Zutrittskontrolle:* Zertifiziertes Sicherheitskonzept der Hetzner Online GmbH (biometrische Vereinzelungsschleusen, 24/7-Kameraüberwachung, ISO/IEC 27001).
- *Zugangskontrolle:* Authentifizierung über passwortlose FIDO2-Hardware-Passkeys (WebAuthn), kryptografische Schulausweis-Tokens und **Bcrypt-gehashte PINs (10 Runden Blowfish gem. BSI TR-02102 / Migration 510)** im isolierten Datenbankschema \`private_auth.user_secrets\`. Progressive Rate-Limiter (Dual-Key Lockout) gegen Brute-Force.
- *Zugriffskontrolle:* Kernel-erzwungene PostgreSQL Row Level Security (RLS) mit Mandantentrennung auf Datenbankebene (\`school_id = get_current_user_school_id()\`). Zero-Trust View-Maskierung sensibler Felder (\`public.users_view\` liefert niemals Klartext-Geheimnisse).
- *Trennungskontrolle:* Mandantenisolierte Datenspeicherung; rollenbasierte Autorisierungs-Gates (Admin, Teacher, Student).
- *Pseudonymisierung & Verschlüsselung:* Durchgehende TLS 1.3 Transportverschlüsselung mit Mozilla Observatory A+ Konformität; Ruhedatenverschlüsselung (AES-256); Ephemere signierte HMAC-Zugriffstokens (60s Gültigkeit) für Audio-Streams mit **Zero-Heap-Buffering (HTTP 307 Redirects direkt zum Storage-Edge)**.
2. **Integrität (Art. 32 Abs. 1 lit. b DSGVO):**
- *Weitergabekontrolle:* Kein unverschlüsselter Datentransport; Übertragungen erfolgen ausschließlich über HTTPS/WSS mit HSTS Preload.
- *Eingabekontrolle:* Revisionssichere, manipulationsgeschützte Audit-Logs (\`public.audit_logs\`) mit SHA-256 Merkle-Hash-Chaining nach GoBD- und OWASP ASVS Level 3-Standard.
3. **Verfügbarkeit & Belastbarkeit (Art. 32 Abs. 1 lit. b & c DSGVO / BSI OPS.1.1.4 & DER.4):**
- **Stündliche automatisierte Backups (0 * * * *) mit asymmetrischer Age X25519 Zero-Knowledge-Verschlüsselung** und kryptografischem SHA-256 Siegel.
- **Georedundante Offsite-Replikation auf Hetzner Storage Box (Port 23)** mit kontinuierlicher Restricted-Shell Vorab-Speicherplatzprüfung (Fail-Closed bei >= 95 % Auslastung gem. SEC-77).
- **DSGVO Art. 17 WORM-Tombstone Reconciliation:** Automatischer Abgleich gelöschter Datensätze bei Notfall-Restores gegen Zombie-Zustände.
- Redundante Stromversorgung (USV/Diesel) und mehrfach redundante Netzanbindungen im Hetzner-Rechenzentrum Falkenstein & Nürnberg.
- Lokaler IndexedDB Audio-Tresor auf Endgeräten für 0ms Offline-Pufferung und Ausfallsicherheit.
- RPO <= 60 Minuten, RTO <= 45 Minuten im Notfall-Runbook.
4. **Verfahren zur regelmäßigen Überprüfung & Bewertung (Art. 32 Abs. 1 lit. d DSGVO):**
- Tägliche automatisierte Security Drift Guards, Secret-Leak-Scanner und Legal Compliance Guards in der CI/CD-Pipeline.
- Wöchentliche B2B-Resilienz-Engine mit automatisiertem kryptografisch gesiegeltem Compliance-Dossier.
- Dokumentierter Notfallwiederherstellungsplan (Disaster Recovery Plan) mit dokumentierten Wiederherstellungstests.
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
      'Verfügbarkeitsgarantie von 99,5 % im jeweiligen Kalendermonat am Übergabepunkt an das öffentliche Internet',
      'Strikter Ausschluss der Drittbegünstigung (§ 328 BGB): Gilt ausschließlich im B2B-Verhältnis mit der Schule (0 % Endnutzer-SLA)',
      'Subsidiaritäts- & Redundanzdoktrin (§ 254 BGB): Kein Ersatz von Dozentenhonoraren oder Unterrichtsausfällen',
      'Geplante Wartungsfenster (werktags 22:00–06:00 Uhr) & unaufschiebbare Notfall-Sicherheits-Patches',
      'Beitragsfreies Gratismonate-Kompensationsmodell (1, 2, 3 oder 6 Gratismonate) auf die monatliche Hosting-Basispauschale',
      'Vollständiger Ausschluss von Barauszahlungen (No Cash Value) und 30-tägige Ausschlussfrist (Log-Parität)'
    ],
    checkboxLabel: 'Ich nehme die Service-Level-Vereinbarung (SLA) zur Kenntnis.',
    fullTextMarkdown: `
### 1. Geltungsbereich & Ausschluss von Rechten Dritter (§ 328 BGB)
(1) Dieses Service Level Agreement (nachfolgend „SLA“) regelt die technische Verfügbarkeit und den Support der Cloud-Infrastruktur von **Campus-Groovelab** im B2B-Verhältnis zwischen dem Betreiber Patrick Huber (Einzelunternehmen) und der vertragschließenden Musikschule bzw. dem Träger (nachfolgend „Kunde“).
(2) **Ausschluss der Drittbegünstigung:** Dieses SLA entfaltet rechtliche Schutz- und Erfüllungswirkung ausschließlich zugunsten des vertragsschließenden Kunden. Die Einbeziehung Dritter in den Schutzbereich ist ausdrücklich abbedungen (§ 328 BGB). Endnutzer – insbesondere Lehrkräfte, Honorardozenten, Schülerinnen und Schüler sowie Erziehungsberechtigte – erwerben aus diesem SLA keine eigenen Primär-, Erfüllungs-, Minderungs- oder Schadensersatzansprüche gegen den Betreiber.
(3) **Subsidiaritäts- & Redundanzdoktrin:** Campus-Groovelab ist ein didaktisches Add-On. Der primäre Unterrichtsbetrieb der Musikschule sowie das Bereithalten von Unterrichtsräumen und Instrumenten sind vom Betrieb der Cloud-Plattform unabhängig. Ein Ausfall des Systems begründet keinen Anspruch auf Erstattung von Lehrkräftehonoraren, Unterrichtsausfallentschädigungen oder Schülerkursgebühren (§ 254 BGB).

### 2. Verfügbarkeitszusage & Messmethode
(1) Der Betreiber gewährleistet eine Verfügbarkeit der Cloud-Plattform am Übergabepunkt der Server- und Datenbankinfrastruktur des Rechenzentrums an das öffentliche Internet von mindestens **99,5 % im jeweiligen Kalendermonat**.
(2) **Berechnungsformel:** Die Verfügbarkeitsquote berechnet sich nach folgender Formel auf Basis von 24 Stunden an allen Tagen des Kalendermonats:
$$\\text{Verfügbarkeit} = \\frac{\\text{Gesamtzeit im Monat} - \\text{Wartungszeiten} - \\text{Nicht-ausgeschlossene Ausfallzeit}}{\\text{Gesamtzeit im Monat} - \\text{Wartungszeiten}} \\times 100\\,\\%$$
(3) Die Plattform gilt als verfügbar, wenn autorisierte Nutzer auf die Kernfunktionen (Authentifizierung, Datenbank-RPCs und Hauptnavigation) über das Internet zugreifen können. Reine Latenzerhöhungen im Millisekundenbereich stellen keine Nichtverfügbarkeit dar.

### 3. Wartungsfenster & Notfall-Sicherheits-Patches
(1) **Planmäßige Wartung:** Erforderliche Wartungsarbeiten (Infrastruktur-Upgrades, Betriebssystem-Patches, Datenbankoptimierungen) finden vorzugsweise außerhalb der Kernunterrichtszeiten statt (werktags zwischen 22:00 Uhr und 06:00 Uhr MEZ sowie an Sonn- und bundeseinheitlichen Feiertagen). Sie werden mindestens 48 Stunden im Voraus über das System-Banner im Schul-Dashboard oder an die offizielle Kontaktadresse der Schule (\`schools.email\`) angekündigt und dürfen ein Gesamtkontingent von 12 Stunden im Kalendermonat nicht überschreiten.
(2) **Dringende Notfall-Wartung:** Unaufschiebbare Notfallmaßnahmen zur Abwehr akuter Cyber-Angriffe, zur Schließung kritischer Sicherheitslücken (Zero-Day-Exploits) oder zur Abwendung schwerer Datenverluste können ohne Einhaltung einer Vorankündigungsfrist durchgeführt werden. Der Betreiber informiert den Kunden hierüber unverzüglich.
(3) Zeiten ordnungsgemäßer planmäßiger oder unaufschiebbarer Notfall-Wartungsfenster gelten nicht als Ausfallzeiten und bleiben bei der Berechnung der Verfügbarkeitsquote unberücksichtigt.

### 4. Störungsklassen & Support-Reaktionszeiten
Meldungen über technische Beeinträchtigungen werden während der regulären Supportzeiten (Werktage Mo–Fr 08:30–17:30 Uhr MEZ) nach folgendem Schema priorisiert:

• **Priorität 1 (Kritisch – Gesamtausfall):** Kernsysteme (Login, Datenbank) sind für alle oder die Mehrheit der Nutzer unbenutzbar.  
  ➔ *Ziel-Reaktionszeit (Beginn der Entstörung):* **< 2 Stunden** (außerhalb der Supportzeit max. 4 Stunden).  
  ➔ *Angestrebter Workaround / Wiederherstellung:* **< 8 Stunden**.

• **Priorität 2 (Hoch – Wesentliche Teilsysteme beeinträchtigt):** Wichtige Module (z. B. Stundenplaner, Audio-Engine oder Raumverwaltung) weisen erhebliche Störungen auf; Basisbetrieb bleibt möglich.  
  ➔ *Ziel-Reaktionszeit:* **< 4 Stunden**.  
  ➔ *Angestrebte Fehlerbehebung:* **< 24 Stunden**.

• **Priorität 3 (Mittel – Isolierte Komfortfunktionen):** Einzelne didaktische Komfortfunktionen (z. B. Gamification-XP, Avatar-Upload, Sticker-Animationen) sind gestört; Unterrichts- und Verwaltungsbetrieb gesichert.  
  ➔ *Ziel-Reaktionszeit:* **< 8 Stunden**.  
  ➔ *Behebung:* Im regulären Releasezyklus.

• **Priorität 4 (Niedrig – Allgemeine Anfragen):** Allgemeine Support-, Bedien- oder Konfigurationsfragen.  
  ➔ *Ziel-Reaktionszeit:* **< 24 Stunden**.

*(Hinweis: Bei den angegebenen Reaktions- und Behebungszeiten handelt es sich um qualifizierte Serviceziele [Best-Effort], nicht um verschuldensunabhängige Fristgarantien.)*

### 5. Kompensation: Das beitragsfreie Gratismonate-Modell
(1) Unterschreitet der Betreiber die garantierte Mindestverfügbarkeit von 99,5 % in einem Kalendermonat aus von ihm zu vertretenden Gründen, erhält der Kunde als pauschalierte Entschädigung und Minderung beitragsfreie Verlängerungsmonate (**„Gratismonate“**) auf die monatliche Hosting-Basispauschale:

| Monatliche Verfügbarkeit | Reale Ausfallzeit im Monat | Kompensation (Beitragsfreie Freimonate) |
|:---|:---|:---|
| **99,00 % bis 99,49 %** | mehr als 3,6 Stunden Ausfall | **1 Gratismonat** (folgender Monat 100 % beitragsfrei) |
| **98,00 % bis 98,99 %** | mehr als 7,2 Stunden Ausfall | **2 Gratismonate** (die nächsten 2 Monate beitragsfrei) |
| **95,00 % bis 97,99 %** | mehr als 14,4 Stunden Ausfall | **3 Gratismonate** (ein volles Folgequartal beitragsfrei) |
| **Unter 95,00 %** | mehr als 36,0 Stunden Ausfall | **6 Gratismonate** (ein volles Folgehalbjahr beitragsfrei) |

(2) **Strikte Bemessungsgrundlage:** Die Gratismonate beziehen sich ausschließlich auf die monatliche Netto-Hosting-Basispauschale der Musikschule (Campus 14,90 €, GrooveLab 9,90 € bzw. Kombi 19,90 €). Schüleraktivierungsgebühren, Pädagogen- & Administrationspauschalen und Entgelte Dritter sind von der Bemessungsgrundlage ausdrücklich ausgeschlossen.
(3) **Erfüllung & Anrechnung:** Bei monatlicher Zahlweise wird die Hosting-Basispauschale für die Folgemonate auf 0,00 € gesetzt. Bei jährlicher Vorauszahlung (mit Rabatt) werden die Gratismonate beitragsfrei an das vereinbarte Ende der bezahlten Schuljahresperiode angehängt, sodass sich der nächste Rechnungsstichtag entsprechend nach hinten verschiebt.
(4) **Barausschluss & Verfall (No Cash Value):** Gratismonate stellen eine reine Sachkompensation dar. Ein Anspruch auf Barauszahlung, Überweisung, Verrechnung mit Drittforderungen oder Konvertierung in Geld ist unwiderruflich ausgeschlossen. Bei Beendigung des Vertragsverhältnisses durch ordentliche Kündigung des Kunden verfallen noch nicht verbrauchte Gratismonate ersatzlos.
(5) **Antrags- und Nachweispflicht (Ausschlussfrist):** Gratismonate werden nicht automatisch gewährt. Der Kunde hat die Unterschreitung innerhalb einer **harten Ausschlussfrist von 30 Kalendertagen** nach Ablauf des betroffenen Monats in Textform (über das Support-Ticket-System oder an die offizielle Support-Adresse) unter nachvollziehbarer Angabe der festgestellten Ausfallzeiten geltend zu machen. Nach Ablauf dieser Frist ist die Geltendmachung endgültig ausgeschlossen (DSGVO-konforme Log-Rotationsparität nach DIN 66398).
(6) **Abschließendes Rechtsmittel (Sole and Exclusive Remedy):** Die Gewährung von Gratismonaten nach dieser Ziffer 5 füllt die Minderungsansprüche des Kunden wegen Verfügbarkeitsunterbrechungen nach § 536 BGB abschließend pauschalierend aus. Verschuldensunabhängige Schadensersatzansprüche sind insoweit abbedungen. Gesetzliche Ansprüche wegen Vorsatzes oder grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) sowie das Kündigungsrecht aus wichtigem Grund (§ 314 / § 543 BGB) bleiben unberührt.

### 6. Ausschlüsse (Haftungsbefreiung)
Als Ausfallzeit gelten nicht Störungen, die zurückzuführen sind auf:  
(a) Höhere Gewalt, kriegerische Ereignisse, Arbeitskämpfe, Naturkatastrophen oder behördliche Anordnungen;  
(b) flächendeckende Störungen überregionaler Internet-Backbones, von Tier-1-Telekommunikationsprovidern oder DNS-Routing außerhalb des Hetzner-Rechenzentrums;  
(c) DDoS-Angriffe oder Cyber-Attacken, die trotz angemessener und dem Stand der Technik entsprechender Schutzmaßnahmen (wie Rate-Limiting und Fail2Ban) nicht abgewehrt werden konnten;  
(d) Ausfälle, die auf Fehlbedienungen, unzureichenden lokalen Bandbreiten, restriktiven Schul-Firewalls (z. B. Port-Sperren für WebSockets) oder veralteter Endgeräte-Hard-/Software auf Seiten des Kunden oder der Endnutzer beruhen.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. MUSTER-DATENSCHUTZINFORMATION ART. 13/14 DSGVO & ART. 19 NDSG FÜR MUSIKSCHULEN
  // ──────────────────────────────────────────────────────────────────────────
  school_parent_privacy_notice: {
    type: 'school_parent_privacy_notice',
    title: 'Muster-Datenschutzinformation für Eltern & Schüler (Art. 13 DSGVO / Art. 19 nDSG)',
    subtitle: 'Ready-to-Use Vorlage der Musikschule zur Aushändigung an Erziehungsberechtigte und Schüler',
    badge: 'Muster Art. 13 DSGVO / Art. 19 nDSG',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Schlüsselfertiger Muster-Elternbrief zur Erfüllung der Informationspflichten gem. Art. 13 & 14 DSGVO und Art. 19 Schweizer nDSG',
      'Klarstellung der Verantwortlichkeit: Musikschule ist Verantwortliche; Campus-Groovelab ist geprüfter Auftragsverarbeiter in Deutschland',
      'Rechtsgrundlagen: Unterrichtsvertrag (Art. 6 Abs. 1 lit. b DSGVO / Art. 31 nDSG) & freiwillige Audio-Einwilligung (Art. 8 DSGVO)',
      '100 % Zero-User-Mail-Axiom: 0 gespeicherte E-Mail-Adressen von Kindern oder Eltern auf dem Server; Dual-Encryption Identity Vault',
      'Autonomer Eltern-Lösch-Tresor: Sofortige 1-Klick-Löschung aller Übe-Audioaufnahmen durch Erziehungsberechtigte ohne Schulzustimmung',
      'Digitales Vier-Augen-Prinzip & Kinderschutz (§ 8a SGB VIII): Transparente Eltern-Einsicht und Ausschluss privater Peer-Chats'
    ],
    checkboxLabel: 'Ich nehme die Muster-Datenschutzinformation zur Kenntnis.',
    fullTextMarkdown: `
# Datenschutz-Information zur Nutzung von Campus-Groovelab
*(Muster-Vorlage der Musikschule zur Aushändigung an Schülerinnen, Schüler und Erziehungsberechtigte gemäß Art. 13 und 14 DSGVO sowie Art. 19 Schweizer nDSG)*

Liebe Eltern, liebe Schülerinnen und Schüler,

unsere Musikschule nutzt zur didaktischen Unterrichtsbegleitung, Stundenplanung und zum häuslichen Üben die Bildungs-App **Campus-Groovelab**. Der Schutz Ihrer persönlichen Daten und die Privatsphäre unserer Schülerinnen und Schüler haben für uns höchste Priorität. Nachfolgend informieren wir Sie gemäß Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) sowie Art. 19 des Schweizer Bundesgesetzes über den Datenschutz (nDSG) über die Verarbeitung Ihrer Daten:

### 1. Name und Kontaktdaten des Verantwortlichen
Verantwortliche Stelle im Sinne der DSGVO und des Schweizer nDSG ist:  
**[Name Ihrer Musikschule / Trägerschaft]**  
[Straße, Hausnummer, PLZ, Ort]  
Telefon: [Telefonnummer] • E-Mail: [Offizielle E-Mail-Adresse der Musikschule]  
Vertreten durch die Schulleitung: [Name der Schulleitung]

### 2. Kontaktdaten des Datenschutzbeauftragten
Unseren behördlichen/betrieblichen Datenschutzbeauftragten (DPO) erreichen Sie unter:  
**[Name des Datenschutzbeauftragten / zuständige Stelle]**  
E-Mail: [datenschutz@musikschule-musterstadt.de]

### 3. Zwecke und Rechtsgrundlagen der Datenverarbeitung
Wir nutzen die Schul-Cloud **Campus-Groovelab** ausschließlich zur didaktischen Begleitung und organisatorischen Abwicklung des Musikschulunterrichts:
• **Unterrichtsorganisation & Stundenplan:** Bereitstellung von Raumbelegungsplänen, Unterrichtszeiten und Dozentenzuweisungen. Rechtsgrundlage ist **Art. 6 Abs. 1 lit. b DSGVO** bzw. **Art. 31 Abs. 2 lit. a nDSG** (Erfüllung des Musikschul-Unterrichtsvertrags) bzw. das jeweilige Landes-Schulgesetz / die Musikschulsatzung für kommunale Träger.
• **Didaktisches Üben & Hausaufgaben:** Führung des digitalen Hausaufgabenhefts, Übe-Timer und Meisterwerk-Protokoll. Rechtsgrundlage ist **Art. 6 Abs. 1 lit. b DSGVO** bzw. **Art. 31 nDSG**.
• **Didaktische Audioaufnahmen (Hausaufgaben/Loops):** Freiwillige Tonaufnahmen im häuslichen Übestudio zur pädagogischen Rückmeldung mit der Lehrkraft. Rechtsgrundlage ist die freiwillige Einwilligung gemäß **Art. 6 Abs. 1 lit. a i. V. m. Art. 8 DSGVO** bzw. **Art. 6 Abs. 6 nDSG** (erteilt durch die Erziehungsberechtigten bei Minderjährigen unter 16 Jahren; ab 16 Jahren durch die Schüler selbst).

### 4. Strikte Datenminimierung, Zero-User-Mail & Kryptografischer Identity Vault
Die Plattform arbeitet nach dem Grundsatz „Privacy by Design & by Default“ (Art. 25 DSGVO / Art. 7 nDSG) und setzt strengste Schutzstandards für Minderjährige um:
• **100 % Zero-User-Mail-Axiom:** Weder Schüler noch Eltern besitzen eine E-Mail-Adresse auf dem Server. Das System speichert ausnahmslos **0 personenbezogene E-Mail-Adressen natürlicher Personen**. Die Anmeldung erfolgt passwortlos über einen kryptografischen Schulausweis-QR-Code und eine persönliche PIN.
• **Kryptografischer Identity Vault:** Schülernamen werden im Ruhezustand (At-Rest) mit **AES-256** verschlüsselt gespeichert (Migration 514). In Übersichten und Lehransichten werden Namen standardmäßig pseudonymisiert als Vorname + Initiale (z. B. „Lukas M.“) dargestellt.
• **Strikte Zero-Photo-Doktrin:** Reale Porträtfotos von Schülerinnen und Schülern werden im System weder zugelassen noch gespeichert. Stattdessen kommen stilisierte 3D-Musiker-Avatare zum Einsatz (KUG § 22).
• **Geburtstags-Maskierung:** Für didaktische Altersstufen und Kalenderfunktionen wird ausschließlich der Tag des Monats (Tag 1..31) verarbeitet – es wird weder der Geburtsmonat noch das Geburtsjahr gespeichert.
• **Keine Zahlungs- oder Bankdaten:** In der Schüler- und Elternplattform werden niemals Bank-, SEPA- oder Kreditkartendaten erhoben.
• **Ausschluss von Gesundheitsdaten:** Es werden keine medizinischen Daten, Atteste oder Diagnosen gem. Art. 9 DSGVO / Art. 5 lit. c nDSG verarbeitet; bei Krankheit oder Verhinderung genügt die neutrale Angabe „verhindert“.
• **Screenless Practice für Grundschulkinder:** Für Kinder von 6 bis 9 Jahren (Junior-Level) verbleibt das Endgerät bei den Eltern (Üben am realen Instrument mit 1-Klick-Quittierung).

### 5. Auftragsverarbeitung & 100 % Rechenzentren in Deutschland (0 % US-Cloud)
Zur Bereitstellung der Software bedient sich die Musikschule des technischen Dienstleisters **Patrick Huber – Campus-Groovelab Plattformbetrieb** (Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland) als weisungsgebundenem Auftragsverarbeiter gemäß **Art. 28 DSGVO** bzw. **Art. 9 nDSG**.
• Sämtliche Daten werden ausschließlich in ISO/IEC 27001-zertifizierten deutschen Hochsicherheits-Rechenzentren der **Hetzner Online GmbH** (Falkenstein/Vogtland und Nürnberg) verarbeitet.
• Es findet **keinerlei Datenübermittlung in Drittstaaten** außerhalb des EWR und insbesondere keine Übertragung an US-Cloud-Hyperscaler statt (vollständige Immunität gegen FISA 702 und US CLOUD Act).
• Für Schweizer Musikschulen: Die Datenübermittlung von der Schweiz nach Deutschland ist durch den **Angemessenheitsbeschluss des Schweizer Bundesrates** (Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 DSV) vollumfänglich genehmigt und rechtlich gesichert.

### 6. Speicherdauer, DIN 66398 & Autonomer Eltern-Lösch-Tresor
• **Unterrichtsdaten:** Personenbezogene Stamm- und Fortschrittsdaten bleiben für die Dauer des aktiven Unterrichtsverhältnisses an der Musikschule gespeichert.
• **Autonomer Eltern-Lösch-Tresor:** Erziehungsberechtigte können im Einstellungsbereich des Elternportals alle didaktischen Sprach- und Audioaufnahmen ihres Kindes mit **einem Klick sofort, unwiderruflich und ohne Genehmigung der Schule physisch vernichten** (Migration 453).
• **Schuljahres-Purge & DIN 66398 Löschkonzept:** Didaktische Medienaufnahmen verfallen standardmäßig mit Ablauf des jeweiligen Schuljahres (31. August). Nach Beendigung des Musikschulvertrags werden alle verbleibenden Daten nach einer 30-tägigen Karenzfrist für den Datenexport endgültig und unwiederbringlich gelöscht.

### 7. Ihre Rechte als betroffene Person (Art. 15–21 DSGVO & Art. 25–29 nDSG)
Sie haben gegenüber der Musikschule jederzeit folgende gesetzliche Rechte:
• **Auskunftsrecht** (Art. 15 DSGVO / Art. 25 nDSG) über die zu Ihrer Person bzw. Ihrem Kind verarbeiteten Daten.
• **Recht auf Berichtigung** (Art. 16 DSGVO / Art. 32 nDSG) unrichtiger oder unvollständiger Daten.
• **Recht auf Löschung** (Art. 17 DSGVO / Art. 32 nDSG) („Recht auf Vergessenwerden“).
• **Recht auf Einschränkung der Verarbeitung** (Art. 18 DSGVO).
• **Recht auf Datenübertragbarkeit** (Art. 20 DSGVO / Art. 28 nDSG) in einem strukturierten, maschinenlesbaren Format.
• **Widerspruchsrecht** (Art. 21 DSGVO) gegen Verarbeitungen auf Basis berechtigter Interessen.
• **Widerrufsrecht bei Einwilligungen (Art. 7 Abs. 3 DSGVO):** Freiwillig erteilte Einwilligungen (insbesondere in die Erstellung didaktischer Audioaufnahmen) können jederzeit mit Wirkung für die Zukunft formlos widerrufen oder direkt über den Eltern-Löschtresor gelöscht werden.
• **Beschwerderecht bei einer Aufsichtsbehörde:** Sie haben das Recht auf Beschwerde bei der für den Sitz der Musikschule zuständigen Landesdatenschutzaufsichtsbehörde (in Deutschland) bzw. beim **Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)**, Feldeggweg 1, CH-3003 Bern (in der Schweiz) bzw. der **Österreichischen Datenschutzbehörde (DSB)** in Wien.

### 8. Institutioneller Kinderschutz & Digitales Vier-Augen-Prinzip (§ 8a SGB VIII)
Zum Schutz des Kindeswohls und zur Prävention digitaler Grenzverletzungen verpflichtet sich die Plattform folgenden Grundsätzen:
• **Digitales Vier-Augen-Prinzip:** Schulinterner Austausch zwischen Lehrkraft und Kind (Hausaufgabennotizen, didaktische Kommentare) ist für Erziehungsberechtigte im Elternbereich jederzeit transparent einsehbar.
• **Ausschluss privater Peer-to-Peer Chats:** Auf Campus-Groovelab gibt es keine unüberwachten privaten 1:1-Chats zwischen minderjährigen Schülerinnen und Schülern untereinander.
• **Verbot privater Messenger-Dienste:** Lehrkräfte sind angehalten, keine privaten Netzwerke (wie WhatsApp, Telegram oder Instagram) für den Musikunterricht einzusetzen, sondern ausschließlich die geschützte Schul-Cloud zu nutzen.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. VERHALTENSKODEX INSTITUTIONELLER KINDERSCHUTZ GEMÄSS § 8A SGB VIII
  // ──────────────────────────────────────────────────────────────────────────
  child_protection_code: {
    type: 'child_protection_code',
    title: 'Kinderschutz-Charta & Grenzachtungs-Kodex',
    subtitle: 'Institutionelles Schutzkonzept zur Prävention digitaler Grenzverletzungen, Dozentenschutz und Wahrung des Kindeswohls gem. § 8a SGB VIII / BKiSchG / DACH-Standard',
    badge: 'Kinderschutz & BKiSchG • § 8a SGB VIII / CH / AT',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Institutioneller Schutzauftrag & DACH-Verfassungsrang (§ 8a SGB VIII, BKiSchG, Art. 11 BV, § 138 ABGB)',
      'Digitales Vier-Augen-Prinzip & Dozentenschutz (Transparenz für Erziehungsberechtigte, Schutz vor Falschbeschuldigungen)',
      'Architektonische Kontaktsperre: Keine unüberwachten 1:1 Peer-to-Peer Schüler-Chats auf der Plattform',
      'Automatischer ChatRespectGuard mit instrumentenpädagogischer Whitelist (Fagott, Mundstück, Notenständer etc.)',
      'KUG § 22 Zero-Photo-Doktrin (3D-Avatare statt Schüler-Porträts) & UrhG § 73 Audio-TTL',
      'Screenless Practice & Didaktische Altersstufen-Governance (Junior / Teen / Pro)',
      'DSA Art. 16 Meldeverfahren (Notice & Action) & 24/7 DACH-Notrufketten für Deutschland, Schweiz und Österreich'
    ],
    checkboxLabel: 'Ich erkenne die Kinderschutz-Charta und den institutionellen Grenzachtungs-Kodex an.',
    fullTextMarkdown: `
### 1. Präambel, Institutioneller Schutzauftrag & DACH-Verfassungsrang
(1) Musikschulen und kulturelle Bildungseinrichtungen sind geschützte Bildungs- und Entfaltungsräume, an denen das seelische, geistige und körperliche Wohl von Kindern und Jugendlichen oberste Priorität besitzt. Die Plattform Campus-Groovelab wurde unter strikter Beachtung des Bundeskinderschutzgesetzes (BKiSchG), des § 8a SGB VIII (Schutzauftrag bei Kindeswohlgefährdung) sowie der verfassungsrechtlichen Kindesschutzgarantien in der Schweiz (Art. 11 Bundesverfassung / Art. 301 ZGB) und Österreich (§ 138 ABGB) konzipiert.
(2) Digitale Lehr- und Lernwerkzeuge dürfen zu keinem Zeitpunkt zur Anbahnung unüberwachter, distanzloser oder grenzverletzender Kontakte missbraucht werden. Dieser Leitfaden ist verbindliche Geschäftsgrundlage für alle vertragsschließenden Musikschulen, Lehrkräfte, Honorardozenten und Administratoren.

### 2. Digitales Vier-Augen-Prinzip & Dozentenschutz
(1) **Schutz vor verdeckter Kommunikation:** Um unüberwachte digitale Einzelkontakte zwischen erwachsenen Lehrkräften und minderjährigen Schülerinnen und Schülern auszuschließen, gilt in allen internen Kommunikationsmodulen (Campus Direct Messages, Hausaufgaben-Notizen) das digitale **Vier-Augen-Prinzip**.
(2) **Revisionssichere Eltern-Transparenz:** Erziehungsberechtigte haben über den PIN-geschützten Elternbereich jederzeit vollen Einblick in den gesamten digitalen Nachrichten-, Aufgaben- und Feedbackverlauf ihres Kindes. Es existieren systemweit keine verdeckten, verschlüsselten Schüler-Lehrer-Sonderkanäle oder selbstlöschenden Nachrichten.
(3) **Dozentenschutz vor unberechtigten Verdachtsmomenten:** Die lückenlose Nachvollziehbarkeit schützt Lehrkräfte vor falschen Verdächtigungen oder böswilligen Anschuldigungen. Lehrkräfte kommunizieren ausschließlich im sachlichen Kontext von Unterrichtsinhalten, Notenmaterial, Terminabsprachen und didaktischem Feedback.

### 3. Architektonische Kontaktsperre für private Peer-to-Peer Schüler-Chats
(1) **Prävention von Cybermobbing und Belästigung:** Zur wirksamen Vorbeugung von Cybermobbing, Ausgrenzung, Belästigung und unkontrollierten Gruppendynamiken unter Minderjährigen ist ein privater, unüberwachter Direkt-Chat zwischen Schülern untereinander serverseitig **vollständig deaktiviert**.
(2) **Moderierte Ensembleräume:** Schülern steht Kommunikation mit Gleichaltrigen ausschließlich im Rahmen moderierter Band- und Kammermusik-Räume (Ensemble-Shoutbox) unter direkter pädagogischer Aufsicht der betreuenden Lehrkraft zur Verfügung.

### 4. Automatischer ChatRespectGuard & Musikpädagogik-Whitelist
(1) **Echtzeit-Prävention (Code-as-Policy):** Interne Textnachrichten werden vor der Auslieferung durch den automatischen \`chatRespectGuard\` analysiert. Nachrichten mit beleidigenden, herabwürdigenden, bedrohenden oder diskriminierenden Inhalten werden blockiert und dem Verfasser mit einem didaktischen Reflexionshinweis zurückgewiesen.
(2) **Instrumentenpädagogische Fachbegriffs-Whitelist:** Um Fehlblockaden im Musikunterricht auszuschließen, verfügt das Filtersystem über eine linguistische Whitelist für instrumentenspezifische Fachbegriffe (u. a. *„Fagott“*, *„Mundstück“*, *„Notenständer“*, *„Dämpfer“*, *„Blasen“*, *„Zupfen“*). Fachliche Korrespondenz bleibt vollumfänglich gewährleistet.

### 5. KUG § 22 Zero-Photo-Doktrin & UrhG § 73 Audio-TTL
(1) **Zero-Photo-Doktrin (§ 22 KUG):** Zum Schutz der visuellen Identität Minderjähriger und zur Vorbeugung von Bildnismissbrauch, Deepfakes oder Pädokriminalität werden auf der Plattform keine realen Porträtfotos von Schülerinnen und Schülern hochgeladen oder gespeichert. Die Schüler-Identität wird im System ausnahmslos durch stilisierte 3D-Canvas-Avatare visualisiert.
(2) **Audio-Speichergrenzen (UrhG § 73):** Freiwillig erstellte Audioaufnahmen im Rahmen des häuslichen Übens dienen ausschließlich der pädagogischen Gehörbildung und Lernkontrolle. Sie unterliegen einer strikten Time-to-Live (TTL $\\le$ 1800s bei Übe-Loops bzw. automatischem Verfall zum Schuljahresende) und können von Erziehungsberechtigten im Elternbereich jederzeit autonom gelöscht werden (DSGVO Art. 17).

### 6. Screenless Practice & Didaktische Altersstufen-Governance
(1) **Bildschirmfreies Üben für jüngere Kinder:** Für Schülerinnen und Schüler im Grundschulalter (insbesondere 6 bis 9 Jahre, Junior-Modus) empfiehlt und unterstützt Campus-Groovelab das didaktische Konzept des *Screenless Practice*. Das Smartphone oder Tablet verbleibt bei den Erziehungsberechtigten; Übezeiten am echten Instrument werden über eine 1-Klick-Quittierung verbucht, ohne dass Kinder während des Musizierens auf Bildschirme schauen müssen.
(2) **Altersgerechte Stufen-Steuerung:** Die Benutzeroberfläche passt sich der Entwicklungsstufe an (Junior, Teen, Pro) und kann von den Erziehungsberechtigten jederzeit im Elternbereich gesteuert und revisionssicher angepasst werden.

### 7. Digitale Netiquette, DSA-Meldeverfahren & DACH-Notrufketten
(1) **Verhaltenskodex & Dienstliche Kanalbindung:** Lehrkräfte kontaktieren Schülerinnen und Schüler niemals über private Messengerdienste (WhatsApp, Signal, Telegram) oder private Social-Media-Accounts (TikTok, Instagram). Die Kommunikation beschränkt sich strikt auf die dokumentierten Schul-Tools.
(2) **Recht auf Nichterreichbarkeit (Quiet Hours):** Zum Schutz der Dozierenden und Schüler gelten technische Ruhezeiten (werktags nach 20:00 Uhr sowie an Wochenenden). In diesen Zeiten werden Benachrichtigungen pausiert.
(3) **Elektronisches DSA-Meldeverfahren (Art. 16 DSA):** Jeder Schüler und Erziehungsberechtigte kann auffällige Nachrichten oder Grenzverletzungen über einen integrierten Meldebutton mit 1 Klick vertraulich an die Schulleitung melden (*Notice and Action*).
(4) **Zentrale DACH-Krisen- und Notrufketten:** Bei akuten Notlagen oder Verdacht auf Kindeswohlgefährdung stehen folgende offizielle Anlaufstellen kostenfrei und anonym zur Verfügung:
• **Deutschland:**
  – Nummer gegen Kummer (Kinder- & Jugendtelefon): **116 111**
  – Elterntelefon: **0800 111 0550**
  – Hilfeportal Sexueller Missbrauch: **0800 22 55 530**
• **Schweiz:**
  – Pro Juventute (Notruf für Kinder & Jugendliche): **147**
  – Elternnotruf Schweiz: **0848 35 45 55**
  – Kinderschutz Schweiz: **058 822 99 20**
• **Österreich:**
  – Rat auf Draht (Notruf für Kinder & Jugendliche): **147**
  – Österreichische Kinderschutzzentren: **0800 567 567**
• **Betreiber-Clearingstelle:** Meldungen an den Plattformbetreiber können jederzeit vertraulich an **kinderschutz@campus-groovelab.de** gerichtet werden.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. WIDERRUFSBELEHRUNG & MUSTER-WIDERRUFSFORMULAR FÜR VERBRAUCHER (B2C)
  // ──────────────────────────────────────────────────────────────────────────
  consumer_cancellation_policy: {
    type: 'consumer_cancellation_policy',
    title: 'Widerrufsbelehrung & Muster-Widerrufsformular',
    subtitle: 'Gesetzliche Verbraucherinformationen für den DACH-Raum (Deutschland, Österreich, Schweiz) bei Schüler-Direktabrechnung',
    badge: 'Verbraucherschutz • § 312g BGB / FAGG / OR',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Geltungsbereich: Gilt ausschließlich für Verbraucher (§ 13 BGB / Modell B: Schüler-Direktabrechnung); für B2B-Verträge mit Schulen ausgeschlossen',
      '14-tägige Widerrufsfrist ab Vertragsabschluss / Profilfreischaltung ohne Angabe von Gründen',
      'Duale Ausübung: 1-Klick-Widerrufsfunktion im PIN-Elternbereich oder in Textform mit Kanonischer Campus-ID',
      'Wertersatz-Ausschluss (0,00 €): Vollständig kostenfreier Probemonat garantiert 0 € Wertersatz gem. § 357a Abs. 2 BGB / § 16 FAGG',
      'Pädagogische Kontinuität: Kein Kontoverlust; sanfter Fallback auf die von der Schule getragene Basis-Bereitstellung (0,09 €)',
      'Ausschluss von Abofallen: Befristeter Einmal-Jahresbeitrag (max. 5,39 € / CHF 11.00) endet automatisch zum 31. August ohne Kündigungserfordernis (§ 309 Nr. 9 BGB)',
      'DACH-Parität: Formelles Rücktrittsrecht für Österreich gem. § 11 FAGG & vertragliche Kulanzgarantie für die Schweiz'
    ],
    checkboxLabel: 'Ich nehme die Widerrufsbelehrung und das Muster-Widerrufsformular zur Kenntnis.',
    fullTextMarkdown: `
### 1. Geltungsbereich & Ausschluss im B2B-Verhältnis
(1) **Ausschließlicher Verbraucher-Geltungsbereich:** Dieses Widerrufsrecht gilt ausnahmslos für natürliche Personen, die als Erziehungsberechtigte oder volljährige Schülerinnen und Schüler ein Rechtsgeschäft zu Zwecken abschließen, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB / § 1 österr. KSchG; Modell B: Schüler-Direktabrechnung).
(2) **B2B-Ausschluss:** Für Schulträger, Musikschulen, Vereine, Gebietskörperschaften und sonstige Unternehmer (§ 14 BGB), die Plattform-Infrastrukturverträge (Modell A: Träger-Sammelabrechnung) abschließen, ist ein gesetzliches Widerrufsrecht ausgeschlossen.

### 2. Widerrufsbelehrung (Widerrufsrecht für Deutschland & Österreich)
(1) **Widerrufsrecht:** Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen (in Österreich: vom Vertrag zurückzutreten).
(2) **Widerrufsfrist:** Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses (Freischaltung des erweiterten Campus-Profils).
(3) **Ausübung des Widerrufs:** Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:  
**Patrick Huber – Campus-Groovelab Plattformbetrieb**  
Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland  
E-Mail: kontakt@campus-groovelab.de  
mittels einer eindeutigen Erklärung über Ihren Entschluss informieren. Die Ausübung kann wahlweise erfolgen:
1. **Elektronische 1-Klick-Widerrufsfunktion:** Direkt über den PIN-geschützten Elternbereich in den Kontoeinstellungen der Web-App (schnellster und papierloser Weg).
2. **In Textform:** Per E-Mail oder Brief unter Verwendung des untenstehenden Muster-Widerrufsformulars (unter zwingender Angabe der Musikschule sowie der Schülernummer / Campus-ID).
(4) **Fristwahrung:** Zur Wahrung der Frist reicht es aus, dass Sie die Mitteilung vor Ablauf der 14-tägigen Frist absenden.

### 3. Folgen des Widerrufs, Kostenfreier Probemonat & Sanfter Fallback
(1) **Rückzahlung empfangener Zahlungen:** Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab Eingang der Widerrufserklärung zurückzuzahlen. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen Entgelte berechnet.
(2) **Vollständiger Wertersatz-Ausschluss (0,00 €):** Da die Bereitstellung des Dienstes im ersten Monat (September bzw. 30-tägige Kennenlernphase) vollständig kostenfrei erfolgt und der Betreiber vor Ablauf der Widerrufsfrist keine vorzeitigen Zahlungen einzieht, schulden Sie im Falle eines Widerrufs während der Probezeit **keinerlei Wertersatz oder Nutzungsentschädigung (§ 357a Abs. 2 BGB / § 16 FAGG)**.
(3) **Pädagogische Kontinuität & Sanfter Fallback:** Mit Wirksamwerden des Widerrufs erlischt lediglich der Zugang zu den kostenpflichtigen Zusatzfunktionen des Campus-Moduls (interaktiver Übe-Timer, Loopstation, Audio-Aufnahme-Tresor). Das Schülerprofil wird **nicht gelöscht**, sondern fällt nahtlos und dauerhaft auf die von der Musikschule getragene **Basis-Bereitstellung** (0,09 € Basistarif; digitaler Schulausweis, Stundenplan- & Kalendereinsicht) zurück.

### 4. Besondere Regelungen für die Schweiz & Österreich
(1) **Freiwillige Widerrufsgarantie Schweiz (OR):** Da das Schweizer Recht (Obligationenrecht) kein gesetzliches Widerrufsrecht für im Fernabsatz geschlossene digitale Dienstleistungsverträge vorsieht, gewährt der Betreiber Nutzerinnen und Nutzern mit Wohnsitz in der Schweiz dieses 14-tägige Widerrufsrecht auf **freiwilliger vertraglicher Basis im identischen Umfang**.
(2) **Österreichisches Rücktrittsrecht (FAGG):** Für Verbraucher in Österreich gilt diese Belehrung zugleich als rechtswirksame Rücktrittsbelehrung gemäß § 11 i. V. m. § 4 Abs. 1 Z 8 Fern- und Auswärtsgeschäfte-Gesetz (FAGG).

### 5. Befristungsgarantie: Keine automatische Verlängerung (Ausschluss von Dauerschuld-Abofallen)
Zur Klarstellung wird vereinbart: Bei der Schüler-Direktabrechnung handelt es sich um einen **befristeten Einmal-Jahresbeitrag für das jeweilige Schuljahr** (maximal 5,39 € in DE/AT bzw. CHF 11.00 in CH), der mit Ablauf des jeweiligen Schuljahres (31. August) **automatisch und ohne Kündigungserfordernis endet**. Es findet zu keinem Zeitpunkt eine automatische Verlängerung oder Umwandlung in ein monatliches Abonnement im Sinne des § 309 Nr. 9 BGB oder des Gesetzes für faire Verbraucherverträge statt.

### 6. Muster-Widerrufsformular
*(Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück – oder nutzen Sie die bequeme 1-Klick-Funktion im Elternportal.)*

An:  
**Patrick Huber – Campus-Groovelab Plattformbetrieb**  
Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland  
E-Mail: kontakt@campus-groovelab.de  

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Bereitstellung des kostenpflichtigen Zugangs Campus-Groovelab (Modul Campus):

• **Name der Musikschule / Träger:** __________________________________________________  
• **Campus-ID des Schülers (z. B. 001-S-0042, auf Schulausweis/QR):** ___________________  
• **Name des Schülers / Kindes:** ____________________________________________________  
• **Name des/der Erziehungsberechtigten:** ___________________________________________  
• **Anschrift des/der Erziehungsberechtigten:** ________________________________________  
• **Freigeschaltet am (*):** ___________________________________________________________  
• **Datum des Widerrufs:** ___________________________________________________________  

_________________________________________________________________________________  
*Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)*  

(*) Unzutreffendes streichen.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. ERKLÄRUNG ZUR DIGITALEN BARRIEREFREIHEIT (BITV 2.0 / EN 301 549 / BFSG 2025)
  // ──────────────────────────────────────────────────────────────────────────
  accessibility_declaration: {
    type: 'accessibility_declaration',
    title: 'Erklärung zur digitalen Barrierefreiheit',
    subtitle: 'Konformität nach BITV 2.0, DIN EN 301 549 V3.2.1, BFSG 2025 und WCAG 2.2 Stufe AA',
    badge: 'Inklusion & Barrierefreiheit • BFSG / BITV 2.0',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Inklusions-Leitbild & BFSG-Enterprise-Garantie: Vollgeltung des BFSG 2025 & freiwilliger Verzicht auf Kleinstunternehmer-Ausnahmen (§ 3 Abs. 2 BFSG)',
      'Verbindlicher Status: „Teilweise vereinbar“ mit harmonisierter europäischer Norm EN 301 549 V3.2.1 und WCAG 2.2 AA (Durchführungsbeschluss (EU) 2018/1523)',
      'Tastatur-Vollbedienbarkeit (WCAG 2.1.1), Focus Not Obscured (WCAG 2.4.11/12) & 2-Klick-Zuweisung im Stundenplan (WCAG 2.5.7)',
      'Multi-Sensorische Musikdidaktik: Haptische Web-Vibration für Gehörlose, optisches Metronom & WAI-ARIA Slider-Semantik für Sehbehinderte',
      'Fachliche Ausnahmen (§ 16 BFSG / § 12a Abs. 6 BGG): Auditive Natur des Musizierens & nutzergenerierte handschriftliche Notenscans',
      'Direkter Feedback-Mechanismus (barrierefreiheit@campus-groovelab.de) mit verbindlicher 48h-Werktags-Reaktionsgarantie',
      'Föderale Durchsetzungsverfahren: Landes-Schlichtungsstellen (L-BGG) für Kommunen, BFSG-Marktüberwachung für Verbraucher sowie Österreich (WZG) & Schweiz (EBGB)'
    ],
    checkboxLabel: 'Ich nehme die Erklärung zur digitalen Barrierefreiheit zur Kenntnis.',
    fullTextMarkdown: `
### 1. Unser Inklusions-Leitbild & Geltungsbereich
(1) Campus-Groovelab (Diensteanbieter: Patrick Huber) verpflichtet sich zu digitaler Barrierefreiheit und gelebter Inklusion im Musikschulwesen. Ziel ist es, allen Schülerinnen, Schülern, Eltern und Lehrkräften unabhängig von sensorischen, motorischen oder kognitiven Beeinträchtigungen einen gleichberechtigten und intuitiven Zugang zu zeitgemäßer Musikbildung und Schulorganisation zu ermöglichen.
(2) **Geltungsbereich & Freiwillige Enterprise-Garantie:** Diese Erklärung gilt für die gesamte Web- und PWA-Plattform Campus-Groovelab. Für den B2C-Eltern-Checkout (Schüler-Direktabrechnung) gilt das **Barrierefreiheitsstärkungsgesetz (BFSG 2025 zur Umsetzung der Richtlinie (EU) 2019/882 / European Accessibility Act)** uneingeschränkt. Die Plattform **verzichtet ausdrücklich auf die Inanspruchnahme von Kleinstunternehmer-Ausnahmen (§ 3 Abs. 2 BFSG)**, um Schulträgern und öffentlichen Auftraggebern maximale Rechtssicherheit bei Vergaben nach § 12d BGG und den Landes-Behindertengleichstellungsgesetzen (L-BGG) zu garantieren.

### 2. Stand der Vereinbarkeit mit den Anforderungen
(1) Diese Webanwendung ist wegen der nachfolgend aufgeführten fachlich-didaktischen Ausnahmen **teilweise vereinbar** mit den Anforderungen der europäischen Norm **EN 301 549 V3.2.1** sowie den **Web Content Accessibility Guidelines (WCAG) 2.2 auf Konformitätsstufe AA** gem. Durchführungsbeschluss (EU) 2018/1523.
(2) **Prüfmethodik & Nachweis:** Die Bewertung basiert auf kontinuierlichen automatisierten AST- und Kontrast-Audits (scripts/legal_compliance_guard.mjs, scripts/zero_overlap_guard.mjs, 0 Drift-Violations gem. WCAG 1.4.3), statischer Code-Analyse der WAI-ARIA DOM-Hierarchien sowie regelmäßigen manuellen Bedienprüfungen mit assistiven Technologien (Apple VoiceOver, NVDA, Tastaturnavigation).

### 3. Umgesetzte Barrierefreiheits-Maßnahmen im System
• **Tastatur-Vollbedienbarkeit & 2-Klick-Parität (WCAG 2.1.1):** Sämtliche Interaktionen (Login, QR-Ausweise, Aufgabenverwaltung, Loopstation, Navigation) sind vollständig ohne Maus steuerbar. Im Stundenplan-Designer ermöglicht die 2-Klick-Zuweisung die motorisch barrierefreie Planung per Tastatur (WCAG 2.5.7).  
• **Sichtbare Apple HIG Tastatur-Fokusringe (WCAG 2.4.7):** Fokussierte Elemente erhalten systemweit einen sichtbaren, modul-farblich abgestimmten Fokusring mit starkem Kontrastabstand.  
• **Focus Not Obscured (WCAG 2.4.11 / 2.4.12):** Feste Leisten (Header, Bottom-Tab-Bar) verdecken niemals den Tastaturfokus; alle Scroll-Container garantieren dynamische Clearance.  
• **Standardisierte Farbkontraste & KPI-Schutz (WCAG 1.4.3):** Alle Texte erfüllen mindestens das Kontrastverhältnis von 4,5 : 1 auf hellem Hintergrund (WCAG AA). Modul- und KPI-Hintergründe (GrooveLab-Gelb, Campus-Grün, Admin-Rot) bleiben unberührt; Kontraste werden über dunkle Schriften (Slate 900, > 12:1 Kontrast) gesichert.  
• **Screenreader Live-Announcements (WCAG 4.1.3):** Zeitkritische Statusänderungen (Speichern, PIN-Verifikation, Tauschvorgänge, Fehler) werden über ARIA-Live-Regionen transparent angesagt.  
• **WAI-ARIA Dialog- & Tab-Architektur (WCAG 1.3.1 / 4.1.2):** Lückenlose Trias aus role="tablist", role="tab" und role="tabpanel"; Modale besitzen role="dialog", aria-modal="true" und Escape-Listener.  
• **Sprungmarken (Skip-Links, WCAG 2.4.1):** Tastaturnutzer können über den initialen Skip-Link („Zum Hauptinhalt springen“) Navigationsleisten direkt überspringen.

### 4. Multi-Sensorische Musik-Inklusion (Inklusive Fachdidaktik)
• **Für hörbeeinträchtigte Schülerinnen und Schüler:**  
  – *Optisches Metronom:* Dynamischer Farbumschlag mit Smaragd-Impuls auf Takt 1 unterstützt das visuelle Timing beim Musizieren.  
  – *Haptische Rhythmus-Vibration:* Unterstützte Mobilgeräte übertragen den rhythmischen Beat über die Web Vibration API (navigator.vibrate), wodurch Taktschläge taktil spürbar werden.  
• **Für sehbeeinträchtigte Schülerinnen und Schüler:**  
  – *WAI-ARIA Audio-Slider:* Audio-Wellenformen sind mit Slider-Semantik ausgestattet (role="slider", aria-valuetext in Takten und Minuten) und können per Pfeiltasten schrittweise (±5s oder taktweise) navigiert werden.  
  – *Akustischer Einzähler (Count-In):* Ein 4-Klick-Vorzähler kündigt den Wiedergabe- und Aufnahmestart verlässlich auditiv an.

### 5. Nicht barrierefreie Inhalte & gesetzliche Ausnahmen (§ 16 BFSG / § 12a Abs. 6 BGG)
Trotz unseres hohen Inklusionsanspruchs bestehen bei einer musikalischen Kreativ-, Recording- und Gehörbildungsplattform fachlich und technisch begründete Ausnahmen:  
• **Auditive Echtzeit-Inhalte & Gehörbildung:** Musikpädagogische Mehrspur-Aufnahmen (Loopstation, Band-Arrangements, Tonhöhenerkennung) basieren naturgemäß auf akustischen Schwingungen. Eine vollständige textuelle Echtzeit-Ersatzdarstellung musikalischer Klangereignisse würde die Wesensart des Dienstes grundlegend verändern und stellt eine **unverhältnismäßige Belastung nach § 16 Abs. 1 Nr. 1 BFSG bzw. § 12a Abs. 6 BGG** dar. Visuelle Taktzähler und optische Frequenz-Pegel bieten bestmögliche sensorische Unterstützung.  
• **Nutzergenerierte Fremddokumente:** Von Lehrkräften oder Schülern eigenverantwortlich erstellte Notizen, handschriftliche Skizzen oder historische Notenscans verfügen unter Umständen nicht über vollständige OCR-Textebenen (§ 12a Abs. 6 BGG).  
• **Komplexe Gestensteuerungen:** Für dynamische Fader- und Potentiometer-Gesten in der virtuellen Audiomischung existieren vereinfachte numerische Tastatur-Modi; eine vollständige Äquivalenz wird kontinuierlich weiter ausgebaut.

### 6. Feedback-Mechanismus & Barrieren melden
Sind Ihnen Barrieren beim barrierefreien Zugang zu Inhalten von Campus-Groovelab aufgefallen oder haben Sie Hinweise zur digitalen Barrierefreiheit? Wir freuen uns über Ihre Rückmeldung:  
• **Ansprechpartner:** Patrick Huber – Campus-Groovelab Plattformbetrieb  
• **E-Mail für Barrierefreiheits-Rückmeldungen:** barrierefreiheit@campus-groovelab.de *(alternativ: kontakt@campus-groovelab.de)*  
• **Postanschrift:** Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland  
• **Reaktionszeit:** Wir bestätigen den Eingang Ihrer Meldung und beantworten Ihr Anliegen an Werktagen in der Regel **innerhalb von 48 Stunden**.

### 7. Durchsetzungsverfahren, Schlichtungsstellen & Marktüberwachung
Sollten Sie auf Ihre Kontaktaufnahme über den Feedback-Mechanismus innerhalb von vier Wochen keine zufriedenstellende Antwort erhalten, stehen Ihnen folgende gesetzliche Stellen zur Verfügung:  

• **A. Kommunale & öffentliche Musikschulen (Deutschland – BGG / L-BGG):**  
  Für öffentliche Träger ist die Schlichtungsstelle nach dem jeweiligen Landes-Behindertengleichstellungsgesetz (L-BGG) zuständig (z. B. in Baden-Württemberg: *Schlichtungsstelle L-BGG beim Landes-Behindertenbeauftragten*, Else-Josenhans-Straße 6, 70173 Stuttgart, E-Mail: poststelle@bmb.bwl.de; in weiteren Bundesländern die jeweilige Landes-Schlichtungsstelle). Das Schlichtungsverfahren ist kostenfrei; ein Rechtsbeistand ist nicht erforderlich.  

• **B. Privatwirtschaftliche Musikschulen & Endverbraucher (Deutschland – BFSG 2025):**  
  Im Anwendungsbereich des Barrierefreiheitsstärkungsgesetzes für privatwirtschaftliche Verträge (Schüler-Direktabrechnung) ist die für den Sitz des Betreibers zuständige **Marktüberwachungsbehörde für Barrierefreiheit** des jeweiligen Bundeslandes für die Durchsetzung zuständig.  

• **C. Österreich (BGStG / Web-Zugänglichkeits-Gesetz WZG):**  
  Für Beschwerden in Österreich ist die Ombudsstelle für Barrierefreiheit beim **Sozialministeriumservice** (Babenbergerstraße 5, 1010 Wien, post@sozialministeriumservice.at) zuständig.  

• **D. Schweiz (BehiG & eCH-0059 Standard):**  
  In der Schweiz erfolgt die Durchsetzung über das **Eidgenössische Büro für die Gleichstellung von Menschen mit Behinderungen (EBGB)**, Inselgasse 1, CH-3003 Bern.  

*Stand der Erklärung: 07. September 2026 • Gutachterlich verifiziert am 08. September 2026 • Letzte Überprüfung und Aktualisierung: Schuljahr 2026/2027.*
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 11. IMPRESSUM & ANBIETERKENNZEICHNUNG (§ 5 DDG / ECG / UWG CH / DSA)
  // ──────────────────────────────────────────────────────────────────────────
  impressum: {
    type: 'impressum',
    title: 'Impressum & Anbieterkennzeichnung',
    subtitle: 'Angaben gemäß § 5 DDG (DE), § 5 ECG / § 25 MedienG (AT) & Art. 3 Abs. 1 lit. s UWG (CH)',
    badge: 'Gesetzliche Pflichtangaben',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Diensteanbieter: Patrick Huber, Softwareentwicklung & Cloud-Dienstleistungen (Einzelunternehmen), Rheinfelden (Baden)',
      'Zuständige Gewerbebehörde: Gewerbeamt der Stadt Rheinfelden (Baden), Kirchplatz 2, 79618 Rheinfelden (Baden)',
      'Elektronischer 2-Wege-Schnellkontakt (EuGH C-298/07 / BGH I ZR 238/14): kontakt@campus-groovelab.de & In-App-Support',
      'DSA Art. 11, 12 & 16: Zentrale behördliche Kontaktstelle & strukturiertes Meldeverfahren für Urheberrechtsverletzungen (copyright@campus-groovelab.de)',
      'Umsatzsteuer: Steuerbefreit gem. § 19 UStG (DE) / § 6 Abs. 1 Z 27 UStG 1994 (AT) / Art. 8 MWSTG (CH)',
      'Redaktionell Verantwortlicher gem. § 18 Abs. 2 MStV / § 25 MedienG: Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden)',
      'EU-Streitschlichtung & Verbraucherstreitbeilegung (§ 36 VSBG): Keine Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle'
    ],
    checkboxLabel: 'Ich habe das Impressum und die Anbieterkennzeichnung zur Kenntnis genommen.',
    fullTextMarkdown: `
### 1. Diensteanbieter & Betreiber der Plattform Campus-Groovelab
**Patrick Huber**  
Softwareentwicklung & Cloud-Dienstleistungen (Einzelunternehmen)  
Karl-Fürstenberg-Str. 59  
79618 Rheinfelden (Baden)  
Deutschland  

**Zuständige Gewerbebehörde:**  
Gewerbeamt der Stadt Rheinfelden (Baden), Kirchplatz 2, 79618 Rheinfelden (Baden)

---

### 2. Rechtlicher Abgrenzungs- & Kompatibilitäts-Hinweis (§ 23 Abs. 1 Nr. 3 MarkenG / § 4 Nr. 3 & § 5 UWG)
Das didaktische Konzept und Unterrichtsfach **„GrooveLAB“** (offenes Gruppen- und Bandunterrichtsmodell) wurde maßgeblich an der Städtischen Musikschule Lahr entwickelt. Das Modul **„GrooveLab“** innerhalb der Plattform Campus-Groovelab knüpft als unabhängige digitale Begleit- und Visualisierungs-Software an die methodischen Anforderungen moderner Gruppen- und Bandunterrichtskonzepte an und macht Übefortschritte, Repertoires und Gruppeninteraktionen digital sichtbar.

Campus-Groovelab ist eine eigenständige Softwareentwicklung von Patrick Huber. Es besteht **keinerlei rechtliche, gesellschaftsrechtliche, organisatorische oder behördliche Trägerschaft** der Städtischen Musikschule Lahr oder des Freundeskreises der Städtischen Musikschule Lahr e.V.

---

### 3. Elektronische Kontaktaufnahme & Unmittelbare Erreichbarkeit (§ 5 Abs. 1 Nr. 2 DDG / EuGH C-298/07 / Art. 3 UWG CH)
- **E-Mail:** kontakt@campus-groovelab.de
- **Support & Schulbetreuung:** support@campus-groovelab.de
- **In-App-Support & Ticketsystem:** Direkt über das integrierte Hilfe-Zentrum (2-Wege-Schnellkontakt mit protokollierter Ticketnummer)
- **Website:** https://campus-groovelab.de

**⚡ Effizienter elektronischer 2-Wege-Schnellkontakt (EuGH C-298/07 / BGH I ZR 238/14):**  
Gemäß der Rechtsprechung des Europäischen Gerichtshofs (EuGH, Urteil vom 16.10.2008 – C-298/07) sowie des Bundesgerichtshofs (BGH, Urteil vom 25.02.2010 – I ZR 238/14) erfolgt die unmittelbare und effiziente Kommunikation über zwei vollwertige elektronische Schnellkontaktwege (E-Mail & In-App-Supportsystem mit protokollierter Ticketnummer). Dies gewährleistet eine lückenlose Dokumentation, prioritäre Bearbeitung und eine Antwortzeit an Werktagen **in der Regel innerhalb von 60 Minuten** (Kernzeiten: Mo 09:00–12:00 Uhr • Do 08:00–10:00 Uhr MEZ).

**🛡️ Hinweis zur Zuständigkeit:**  
Für Auskünfte zu Unterrichtszeiten, Stundenplänen, Raumzuteilungen, Lehrkraft-Vertretungen, Abwesenheitsmeldungen oder Musikschulverträgen wenden Sie sich bitte direkt an das **Sekretariat Ihrer Musikschule vor Ort**. Der Plattform-Support betreut als technischer Infrastrukturdienstleister ausschließlich Software-, Login- und Systemfragen.

---

### 4. Zentrale Kontaktstelle & Meldeverfahren gemäß Art. 11, 12 & 16 Digital Services Act (DSA)
- **E-Mail für behördliche Anfragen (Art. 11 DSA):** kontakt@campus-groovelab.de
- **Zentrale Kontaktstelle für Nutzer (Art. 12 DSA):** support@campus-groovelab.de
- **Meldekanal für rechtswidrige Inhalte & Urheberrechtsverletzungen (Notice-and-Action gem. Art. 16 DSA):** copyright@campus-groovelab.de
- **Amtssprachen für Anfragen:** Deutsch, Englisch.
- **Bearbeitungszeit:** Eingehende Meldungen über Urheberrechtsverletzungen oder rechtswidrige Inhalte werden nach den Vorgaben des Art. 16 DSA unverzüglich, spätestens jedoch innerhalb von 24 Stunden gesichtet und bearbeitet.

---

### 5. Umsatzsteuer & Steuerliche Einstufung (§ 5 Abs. 1 Nr. 6 DDG / § 27a UStG / § 6 UStG AT / Art. 8 MWSTG CH)
- **Deutschland:** Umsatzsteuerbefreit gemäß **§ 19 UStG (Kleinunternehmerregelung)**. Es wird keine Umsatzsteuer erhoben oder gesondert ausgewiesen. Eine gesonderte Umsatzsteuer-Identifikationsnummer (USt-IdNr.) gemäß § 27a UStG wird für den rein inländischen Geschäftsbetrieb nicht benötigt; für den grenzüberschreitenden innergemeinschaftlichen B2B-Dienstleistungsverkehr (Reverse-Charge) sowie nach § 139c AO wird die Wirtschafts-Identifikationsnummer (W-IdNr.) geführt bzw. auf gesonderte behördliche Zuteilung vorgehalten.
- **Österreich:** Umsatzsteuerbefreit gemäß **§ 6 Abs. 1 Z 27 UStG 1994 (Kleinunternehmerregelung)**.
- **Schweiz:** Leistungsort Schweiz gemäß **Art. 8 Abs. 1 MWSTG** (nicht im Inland steuerbar).

---

### 6. Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV DE / § 25 MedienG AT)
Patrick Huber  
Karl-Fürstenberg-Str. 59  
79618 Rheinfelden (Baden), Deutschland  

**Grundlegende Richtung des Online-Mediums (Blattlinie gem. § 25 Abs. 4 MedienG AT):**  
Information und Bereitstellung digitaler Werkzeuge zur pädagogischen Organisation und didaktischen Begleitung von Musikschulunterricht, Raum-, Stundenplan- und Terminplanung sowie didaktischem Instrumentalüben.

---

### 7. EU-Streitschlichtung & Verbraucherstreitbeilegung (§ 36 VSBG)
Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/.  
Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

---

### 8. Haftung für Inhalte & Hosting-Immunität (DSA / DDG / ECG)
Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG / § 16 ECG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für übermittelte oder gespeicherte fremde Informationen sind wir als Host-Provider gemäß Art. 6 Verordnung (EU) 2022/2065 (Digital Services Act – DSA) i. V. m. § 7 Abs. 2 DDG nicht verpflichtet, diese proaktiv zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen ab dem Zeitpunkt der tatsächlichen Kenntnis einer konkreten Rechtsverletzung bleiben hiervon unberührt.
    `.trim()
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 12. PLATTFORM-DATENSCHUTZERKLÄRUNG (DSGVO / NDSG / TDDDG)
  // ──────────────────────────────────────────────────────────────────────────
  platform_privacy: {
    type: 'platform_privacy',
    title: 'Plattform-Datenschutzerklärung',
    subtitle: 'Rechtskonforme Information gem. Art. 13 & 14 DSGVO, Schweizer nDSG & § 25 TDDDG',
    badge: 'Datenschutz & Sicherheit',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Rollen-Dualität (Art. 4 Nr. 7 vs. Art. 28 DSGVO): Musikschule ist Verantwortliche für Unterrichtsdaten; Betreiber Patrick Huber ist Auftragsverarbeiter',
      '100 % Zero-User-Mail-Axiom: Keine Speicherung persönlicher E-Mail-Adressen von Schülern, Eltern oder Lehrkräften; passwortloser Login via Schulausweis & PIN',
      'Keine Speicherung von Bank- oder Zahlungsdaten der Familien auf der Plattform (Zero-Payment-Storage)',
      '100 % Europäisches Hosting in ISO/IEC-27001 zertifizierten Rechenzentren (Hetzner Nürnberg/Falkenstein, Deutschland)',
      'Zero-Tracking: Keine Marketing- oder Drittanbieter-Cookies; alle lokalen Speicherungen technisch zwingend gem. § 25 Abs. 2 Nr. 2 TDDDG',
      'Strikter Ausschluss von Stimmbiometrie (Art. 9 DSGVO): Audio-Aufnahmen dienen rein dem didaktischen Üben',
      'Kommunales DIN 66398 Löschkonzept mit 5 definierten Löschklassen',
      'Vollständige Betroffenenrechte gem. Art. 15–21 DSGVO / nDSG (Zuständige Behörde: LfDI Baden-Württemberg / EDÖB Bern)'
    ],
    checkboxLabel: 'Ich habe die Plattform-Datenschutzerklärung zur Kenntnis genommen.',
    fullTextMarkdown: `
### 1. Rollen-Differenzierung, Verantwortliche Stellen & Auftragsverarbeitung (Art. 4 Nr. 7 vs. Art. 28 DSGVO)
Im regulären Musikschulbetrieb ist die **jeweilige Musikschule bzw. ihr Schulträger die alleinige Verantwortliche (Controller gem. Art. 4 Nr. 7 DSGVO)** für Schüler-, Lehrkräfte- und Unterrichtsdaten. Campus-Groovelab verarbeitet diese Daten streng weisungsgebunden als **Auftragsverarbeiter (Processor gem. Art. 28 DSGVO)** nach Maßgabe der im Tab „AVV“ verbindlich bereitgestellten Vereinbarung.

**(1) Duale Zuständigkeitsarchitektur:**  
- **Säule A – Schulbetrieb (B2B):** Soweit Campus-Groovelab von Musikschulen, Akademien oder Trägern zur Stundenplanung, didaktischen Unterrichtsbegleitung und Schülerverwaltung genutzt wird, ist die *jeweilige Musikschule die verantwortliche Stelle* im Sinne von Art. 4 Nr. 7 DSGVO. Die Schule entscheidet über Zwecke und Mittel der Verarbeitung. Der Plattformbetreiber handelt als Auftragsverarbeiter gemäß Art. 28 DSGVO.  
- **Säule B – Website, System-Infrastruktur & Direktabrechnung (B2C):** Für den technischen Betrieb dieser Website, serverseitige Sicherheits-Logfiles, Direktverträge mit Volljährigen oder Eltern sowie den Plattform-Support ist *Patrick Huber der originäre Verantwortliche* im Sinne der DSGVO, des Schweizer nDSG und des österreichischen DSG:  
  **Patrick Huber**, Softwareentwicklung & Cloud-Dienstleistungen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden), Deutschland.  
  Zentrale E-Mail: kontakt@campus-groovelab.de • Technischer Support: support@campus-groovelab.de

**(2) Offizielle Datenschutz-Kontaktstelle & DPO-Verbindung:**  
Für behördliche Datenschutzbeauftragte, Schulleitungen und betroffene Personen unterhalten wir eine dedizierte Ansprechstelle für Datenschutzfragen und Betroffenenrechte: E-Mail: datenschutz@campus-groovelab.de. Behördliche Datenschutzprüfer können zudem über das integrierte DPO-Audit-Portal direkt auf standardisierte Verzeichnisse von Verarbeitungstätigkeiten (VVT gem. Art. 30 DSGVO) und Schwellwertanalysen (DSFA gem. Art. 35 DSGVO) zugreifen.

---

### 2. Grundsatz der Datenminimierung, 100 % Zero-User-Mail-Axiom & Bildschirmfreies Üben (Art. 5 & 8 DSGVO / Art. 6 nDSG)
**(1) Keine Zahlungs- oder Bankdaten von Familien:**  
Auf Campus-Groovelab werden keinerlei Bank-, SEPA-, Kreditkarten- oder Abrechnungsvertragsdaten von Schülern oder Eltern gespeichert.

**(2) 100 % Zero-User-Mail-Axiom & Entfall personenbezogener E-Mail-Adressen:**  
Auf den Servern und Datenbanken von Campus-Groovelab werden zu keinem Zeitpunkt personenbezogene E-Mail-Adressen natürlicher Personen (weder von Schülerinnen und Schülern, Erziehungsberechtigten, Lehrkräften noch von Mitgliedern der Schulleitung oder Verwaltung) erhoben, gespeichert oder verarbeitet. Die Authentifizierung erfolgt passwortlos über physische Schulausweise (QR-Code / Ausweisnummer) in Kombination mit einer serverseitig gehashten PIN oder Passkeys (WebAuthn FIDO2). Als einzige institutionelle Ausnahme wird die zentrale Kontakt- und Abrechnungs-E-Mail der Musikschule als juristischer Person (Träger) für buchhalterische Pflichtbelege (§ 14 UStG) und SLA-Mitteilungen verarbeitet. Plattformfunktionen zum Teilen von Zugängen rufen rein clientseitig das lokale Mailprogramm des Endgeräts auf (mailto:); Empfänger-E-Mail-Adressen werden zu 0 % über unsere Server übertragen oder gespeichert.

**(3) Namensdarstellung & Schutz von Minderjährigen:**  
Schülernamen werden in Lehrer-Übersichten datenschutzkonform auf „Vorname + N.“ (z. B. „Max M.“) gekürzt. Lehrkräftenamen werden für Schüler und Eltern mit vollem Namen angezeigt, um Verwechslungsfreiheit im Schulbetrieb zu gewährleisten.

**(4) Mindestalter & Bildschirmfreies Üben („Screenless Practice“):**  
Das Mindestalter beträgt 6 Jahre. Um Bildschirmzeiten bei jüngeren Kindern (6–9 Jahre) zu minimieren, können Übeeinheiten am akustischen Instrument von den Eltern im Elternmodus mit einem Klick quittiert werden (begrenzt auf max. 60 Min./Tag zur Vermeidung von Missbrauch).

**(5) Ausschluss von Gesundheits- und Diagnosedaten (Art. 9 DSGVO / Art. 5 lit. c nDSG):**  
Die plattforminterne Kommunikations- und Shoutbox-Funktion dient ausschließlich der organisatorischen Unterrichtsabstimmung und Terminabsprache. Die Erfassung, Speicherung oder Übermittlung von sensiblen Gesundheitsdaten, ärztlichen Attesten oder konkreten medizinischen Diagnosen ist untersagt und nicht Gegenstand der Plattformfunktion. Bei Abwesenheiten genügt die allgemeine Angabe „verhindert“.

**(6) Duales Notfall-Zugangs- & Wiederherstellungsmodell:**  
Da im Gesamtsystem keine Nutzer-E-Mail-Adressen verarbeitet werden, entfallen klassische, durch Phishing und Man-in-the-Middle angreifbare E-Mail-Passwort-Reset-Links vollständig. Bei Verlust von PIN oder Passkey greift das revisionssichere Zwei-Säulen-Modell:  
(a) *Dezentraler kryptografischer Recovery-Key* (Self-Sovereign Identity, offline bei Ersteinrichtung ausgedruckt / verwahrt; der Server speichert ausschließlich einen irreversiblen kryptografischen Hash); oder  
(b) *Vor-Ort Schulleitungs-Reset (PostIdent-Standard)* durch persönliche Identitätsprüfung im Schulsekretariat mit autoritativer Vergabe eines neuen Ausweis-Tokens bzw. einer Einmal-PIN via reset_user_credentials_by_admin, sofortiger atomarer Session-Invalidierung und lückenloser Protokollierung im manipulationssicheren WORM-Audit-Trail.

---

### 3. Client-seitige Speicherung, TDDDG-Transparenzmatrix & Zero-Consent-Doktrin (§ 25 Abs. 2 Nr. 2 TDDDG / § 165 TKG / Art. 6 revDSG)
**(1) Technisch zwingend erforderliche Speicherungen:**  
Unsere Webanwendung verwendet lokale Speichertechnologien des Browsers (LocalStorage, SessionStorage, IndexedDB), um Kernfunktionen wie den sicheren Sitzungserhalt, Navigationseinstellungen und den Offline-Übebetrieb in Proberäumen bereitzustellen.

**(2) Keine Tracking- oder Werbe-Cookies (Banner-Immunität):**  
Es werden zu keinem Zeitpunkt Marketing-, Profiling- oder Drittanbieter-Tracking-Cookies gesetzt. Sämtliche client-seitigen Speicherungen sind gemäß **§ 25 Abs. 2 Nr. 2 TDDDG** (DE) sowie **§ 165 Abs. 3 TKG 2021** (AT) technisch unbedingt erforderlich. Ein Cookie-Banner ist daher gesetzlich entbehrlich.

**(3) Transparenzmatrix der lokalen Speicher-Schlüssel:**  
- \`gl_active_session_lease_id\` (LocalStorage): Kryptografischer Session-Lease-Token zum Schutz vor Session-Hijacking (Dauer: bis Abmeldung / max. 30 Tage; Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG)  
- \`groovelab_active_platform\` (LocalStorage): Beibehaltung des ausgewählten Moduls (Campus vs. GrooveLab) (Dauer: dauerhaft bis Cache-Leerung; § 25 Abs. 2 Nr. 2 TDDDG)  
- \`campus_family_profiles\` (LocalStorage): Verschlüsselte Schnellumschaltung zwischen Geschwistern auf Familien-Geräten (Dauer: bis Abmeldung; § 25 Abs. 2 Nr. 2 TDDDG)  
- \`groovelab_kiosk_token\` (LocalStorage): Hardware-Kopplung der Proberaum-Terminals im Kiosk-Betrieb der Musikschule (Dauer: bis Terminal-Reset; § 25 Abs. 2 Nr. 2 TDDDG)  
- \`cg_tax_mode\` (LocalStorage): Steuer-Konfiguration (Regelbesteuerung vs. Kleinunternehmer; § 25 Abs. 2 Nr. 2 TDDDG)  

**(4) Schutz lokaler Daten:**  
Es werden keine Klartext-Passwörter im Browser gespeichert. Flüchtige Sitzungs-Identifikatoren verfallen automatisch. Sensible lokale Zwischenspeicher werden auf dem Endgerät über die browser-eigene Web Crypto API kryptografisch geschützt (PBKDF2 mit 100.000 Runden SHA-512 und AES-256-GCM).

**(5) Lokaler Audio-Tresor (IndexedDB):**  
Zur Gewährleistung eines unterbrechungsfreien Probenbetriebs in schallisolierten Räumen ohne Internetverbindung werden temporäre Übe- und Playback-Audios lokal in geschützten IndexedDB-Datenspeichern des Browsers vorgehalten und bei aktiver Verbindung synchronisiert.

---

### 4. Hardware-Zugriffe (Kamera & Mikrofon), Passkeys & Ausschluss von Biometrie-Verarbeitung (Art. 9 DSGVO)
**(1) Kamera:**  
Der Zugriff auf die Kamera erfolgt ausschließlich lokal im Browser des Nutzers, um den Schulausweis-QR-Code zu erfassen. Es werden zu keinem Zeitpunkt Videobilder an Server übertragen.

**(2) Mikrofon & Didaktische Aufnahmen:**  
Die In-App Loopstation und das Meisterwerk-Protokoll ermöglichen Schülern und Lehrkräften die didaktische Tonaufnahme am Instrument. Ein automatischer Sicherheits-Guard schaltet das Mikrofon bei Modulwechsel, Tab-Inaktivität oder Schließen des Fensters sofort physisch ab (MediaStreamTrack.stop()).

**(3) Strikter Ausschluss von Stimmbiometrie (Art. 9 DSGVO):**  
Die Audiodaten dienen rein dem musikalischen Playback und der Hausaufgabenkontrolle. Es finden zu keinem Zeitpunkt biometrische Stimm-, Sprecher- oder Verhaltensmusteranalysen statt.

**(4) Passkeys & WebAuthn (FIDO2 Standard / Keine Biometrie):**  
Die optionale passwortlose Anmeldung via Passkey nutzt Face ID, Touch ID oder Windows Hello ausschließlich lokal in der isolierten Hardware-Enclave (Secure Enclave / TPM) des Nutzerendgeräts. Biometrische Rohmerkmale verlassen zu keinem Zeitpunkt das Endgerät und werden niemals an Campus-Groovelab übertragen oder auf unseren Servern verarbeitet (Art. 9 DSGVO). Unser Server empfängt und prüft ausschließlich die kryptografische Public-Key-Signatur.

**(5) Physische Löschung:**  
Wird eine Tonaufnahme oder ein Schülerprofil gelöscht, wird die zugehörige Audiodatei vollständig und unwiderruflich aus dem Cloud-Speicher gelöscht.

---

### 5. Zivilrechtliche Vertragspartnerschaft bis 18 Jahre (§§ 106 ff. BGB), Datenschutz-Mündigkeit ab 16 Jahren (Art. 8 DSGVO) & Gemeinsames Sorgerecht (§ 1629 BGB)
**(1) Zivilrechtliche Vertrags- & Kostenträgerschaft bis zur Volljährigkeit (§ 2 & §§ 106 ff. BGB):**  
Vertragspartner für die Plattformnutzung sowie für etwaige entgeltliche Leistungen (insbesondere Schüler-Jahresbeiträge bei Direktabrechnung) sind bei Minderjährigen bis zur Vollendung des 18. Lebensjahres (gesetzliche Volljährigkeit gem. § 2 BGB) ausnahmslos die Erziehungsberechtigten. Minderjährige können ohne ausdrückliche Genehmigung der gesetzlichen Vertreter keine kostenpflichtigen Verträge eingehen.

**(2) Gemeinsames Sorgerecht & Gesetzliche Vertretungsvermutung (§ 1629 Abs. 1 Satz 2 BGB):**  
Nimmt ein Elternteil die Registrierung, Freischaltung oder PIN-Verwaltung für ein minderjähriges Kind vor, versichert dieser an Eides statt, zur alleinigen Vertretung berechtigt zu sein oder im ausdrücklichen Einvernehmen mit dem weiteren sorgeberechtigten Elternteil zu handeln. Der anmeldende Elternteil stellt den Betreiber sowie die Musikschule im Innenverhältnis von etwaigen Einwendungen oder Streitigkeiten des anderen Elternteils frei.

**(3) Datenschutzrechtliche Mündigkeit (Art. 8 DSGVO i. V. m. § 16 TDDDG):**  
Für Schüler bis zum vollendeten 16. Lebensjahr ist für didaktische Audio-Aufnahmen und die Profilnutzung die aktive Freigabe der Erziehungsberechtigten erforderlich. Jugendliche zwischen dem vollendeten 16. und 18. Lebensjahr besitzen die gesetzliche Mündigkeit, ihre datenschutzrechtliche Einwilligung in didaktische Audioaufnahmen selbstständig zu erteilen oder zu widerrufen (die zivilrechtliche Vertragspartnerschaft für das Benutzerkonto verbleibt hiervon unberührt bis zum 18. Lebensjahr bei den Erziehungsberechtigten).

**(4) Kinderschutz & Vier-Augen-Transparenz (§ 8a SGB VIII):**  
Die Verifikation erfolgt über die physische Ausgabe des Schulausweises durch die Musikschule und die Festlegung einer geheimen Eltern-PIN. Gemäß § 8a SGB VIII und dem institutionellen Kinderschutzkonzept der Schule ist die didaktische Kommunikation zwischen Lehrkräften und Schülern für Erziehungsberechtigte über das Eltern-Portal jederzeit transparent einsehbar (Vier-Augen-Prinzip). Ein unkontrollierter Chatverkehr zwischen Minderjährigen untereinander ist serverseitig ausgeschlossen. Die Einwilligung in didaktische Tonaufnahmen ist freiwillig und kann jederzeit unabhängig vom Unterrichtsvertrag widerrufen werden.

---

### 6. Hosting in ISO 27001-zertifizierten deutschen Rechenzentren (Art. 28 & 32 DSGVO)
Sämtliche Kernsysteme (Webanwendung, API-Gateway, PostgreSQL-Datenbank und Cloud-Audiospeicher) werden in nach ISO/IEC 27001 zertifizierten deutschen Rechenzentren der Hetzner Online GmbH (Falkenstein/Nürnberg, Deutschland) betrieben. Mit dem Hosting-Provider besteht ein DSGVO-konformer Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO. Die Datenübertragung erfolgt durchgehend TLS 1.3 verschlüsselt.

---

### 7. Keine Einbindung externer Drittanbieter- oder US-Cloud-Dienste (Zero US Cloud Governance)
Zur strikten Einhaltung europäischer Datenschutzstandards (Schrems II / DSGVO) verzichtet Campus-Groovelab vollständig auf US-Cloud-Dienste, Tracking-Netzwerke oder externe Hilfsdienste:  
- Sämtliche QR-Codes für physische Ausweise, Stundenpläne und Kiosk-Stationen werden zu 100 % lokal und offline im Webbrowser des Endgeräts gerendert (Zero-Data-Transmission). Es werden zu keinem Zeitpunkt Daten an externe QR-Dienste übertragen.  
- Die Protokollierung von Administrator-IPs beim B2B-Onboarding erfolgt ausnahmslos serverintern im ISO 27001-zertifizierten Hetzner-Rechenzentrum in Deutschland. Es werden keine externen IP-Dienste oder US-Abfrage-APIs genutzt.  
- **Missbrauchsschutz & Abwehr automatisierter Angriffe (Proof-of-Work):** Zur Abwehr von Brute-Force-Angriffen und automatisierten Bot-Attacken beim Anmeldevorgang setzen wir ein vollständig serverseitiges, datensparsames kryptografisches Nachweisverfahren (Proof-of-Work) ein. Hierbei werden weder Cookies gesetzt noch gerätespezifische Merkmale ausgelesen (kein Device-Fingerprinting) und keine Daten an Dritte oder US-Server übertragen (Art. 6 Abs. 1 lit. f DSGVO i. V. m. Art. 32 DSGVO).  
- Kalendersynchronisationen und Ferienabfragen erfolgen direkt und ohne Zwischenschaltung ungesicherter Drittanbieter-Proxies.

---

### 8. Urheberrechtsfreie Metadaten-Architektur (UrhG & DSA)
Campus-Groovelab speichert und hostet keine geschützten Notenblätter oder Partituren als PDF. Es werden ausschließlich bibliografische Metadaten (Songtitel, Komponist, Lehrbuchseite) sowie externe Verlinkungen (z. B. Streaming-Dienste) verarbeitet.

---

### 9. Kommunales Löschkonzept nach DIN 66398 (5 definierte Löschklassen)
Zur Einhaltung des Grundsatzes der Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO) implementiert Campus-Groovelab ein behördliches Löschkonzept gemäß **DIN 66398** mit fünf standardisierten Löschklassen:  
- **⚡ LK 1 – Flüchtige Sitzungsdaten:** Sofortiger Verfall flüchtiger Token bei Benutzerabmeldung oder Schließen des Browsers.  
- **🎵 LK 2 – Didaktische Schüler-Audioaufnahmen:** Speicherung auf das laufende Schuljahr befristet (automatischer Stichtag 31.08. mit Vorab-Exportfunktion); sofortige physische Löschung bei manuellem Löschen durch Schüler/Eltern.  
- **💤 LK 3 – Inaktivitätsstatus (Fair-Play):** Nach 60 aufeinanderfolgenden Tagen ohne Schüler-Login automatische Überführung in den passiven Basis-Status zur Kostenentlastung der Musikschule.  
- **🎓 LK 4 – Bildungsbiografie & Meisterwerke:** Fortlaufende Bereitstellung während der aktiven Unterrichtszeit an der Musikschule; endgültige physische Löschung 30 Tage nach Vertragsbeendigung des Schülers.  
- **📑 LK 5 – B2B-Abrechnungsbelege der Musikschule:** 10 Jahre gesetzliche Aufbewahrungsfrist gem. § 147 AO / § 257 HGB (reine Sammelrechnungen an die Schule ohne Klarnamen Minderjähriger).

---

### 10. Betroffenenrechte & Aufsichtsbehörden (Art. 15 bis 22 DSGVO / Art. 25 ff. revDSG)
**(1) Umfassende Betroffenenrechte:**  
Sie haben jederzeit das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).

**(2) Zuständigkeit für Anfragen:**  
- Bei Fragen zu konkreten Unterrichtsdaten, Noten, Stundenplänen oder Schulverträgen wenden Sie sich bitte direkt an die **Leitung bzw. das Sekretariat Ihrer Musikschule vor Ort** (als verantwortliche Stelle).  
- Für systemische Plattformanfragen, Auskünfte zu Webseiten-Logs oder die Geltendmachung von Rechten gegenüber dem Plattformbetreiber richten Sie Ihre Anfrage bitte direkt an: datenschutz@campus-groovelab.de.

**(3) Beschwerderecht bei den Aufsichtsbehörden:**  
Sie haben das Recht auf Beschwerde bei einer zuständigen Datenschutz-Aufsichtsbehörde:  
- **Deutschland:** Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW), Lautenschlagerstraße 20, 70173 Stuttgart (www.baden-wuerttemberg.datenschutz.de) sowie die Aufsichtsbehörde Ihres gewöhnlichen Aufenthaltsortes.  
- **Österreich:** Österreichische Datenschutzbehörde (DSB), Barichgasse 40–42, 1030 Wien (www.dsb.gv.at).  
- **Schweiz:** Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB), Feldeggweg 1, CH-3003 Bern (www.edoeb.admin.ch).

**Hinweis für Nutzer in der Schweiz:** Deutschland verfügt gemäß Beschluss des Schweizer Bundesrats vom 25. August 2023 über ein angemessenes Schutzniveau (Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 VDSG).
    `.trim()
  }
};

