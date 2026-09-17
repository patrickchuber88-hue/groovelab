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
  activeVersion: '2026.2',
  minimumEnforcedVersion: '2026.1', // 🛡️ 2026.1 remains legally valid and compliant; no forced lockout for existing teachers
  changelogs: {
    '2026.2': {
      version: '2026.2',
      title: 'Präzisierung Didaktik & Urheberschutz',
      date: '13.09.2026',
      highlights: [
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
  type: 'terms_b2b_avv' | 'terms_teacher_conduct' | 'terms_student_platform' | 'consent_media_audio';
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
  terms_b2b_avv: {
    type: 'terms_b2b_avv',
    title: 'B2B-Infrastrukturvertrag & Auftragsverarbeitung (AVV)',
    subtitle: 'Für Schulleitung, Verwaltung und autorisierte Trägervertreter',
    badge: 'Verwaltung / B2B',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      '0,00 € Software-Lizenzkaufgebühren (Bereitstellung & Miete reiner Cloud-Infrastruktur)',
      'Schule ist die datenschutzrechtlich „Verantwortliche“ (Art. 4 Nr. 7 DSGVO)',
      'Campus-Groovelab fungiert als geprüfter, weisungsgebundener Auftragsverarbeiter (Art. 28 DSGVO)',
      'ISO 27001 Rechenzentren in Deutschland (Hetzner Falkenstein & Nürnberg) • 14 Tage Widerspruchsfrist bei Subdienstleistern',
      '48-Stunden-Meldepflicht bei Datenschutzverletzungen (Art. 33 DSGVO)',
      'Reine Didaktik & Kommunikation: Keine Übernahme behördlicher Dokumentation (iMikel) oder physischer Aufsicht',
      'Raumanfragen & Terminabsagen als Voranfrage unter Vorbehalt / Botenmodell ohne ERP-Automatik',
      'BGH-konformes Aufrechnungsverbot, 2 Mio. € IT-Haftpflichtdeckung & Salvatorische Klausel (§ 306 Abs. 2 BGB)'
    ],
    checkboxLabel: 'Ich bestätige als vertretungsberechtigte Person der Musikschule den B2B-Infrastrukturvertrag sowie den Auftragsverarbeitungsvertrag (Art. 28 DSGVO) inklusive der Technisch-Organisatorischen Maßnahmen (TOMs).',
    fullTextMarkdown: `
### 1. Vertragsgegenstand & Bereitstellungsmodell
(1) Campus-Groovelab stellt der Musikschule eine hochverfügbare, mandantenisolierte Cloud-Infrastruktur für Schulverwaltung, Stundenplanung, Raumorganisation und didaktische Begleitung zur Verfügung.
(2) Das Basissystem wird ohne gesonderte Software-Lizenzkaufgebühren bereitgestellt (0,00 € inklusive). Die Vergütung bemisst sich ausschließlich nach den vereinbarten Server-Hosting-, Bereitstellungs- und Infrastrukturpauschalen.
(3) Ein Rechtsanspruch auf Abschluss eines Nutzungsvertrages besteht nicht; der Betreiber behält sich vor, Registrierungen bei Kapazitätsengpässen oder Sicherheitsbedenken abzulehnen.

### 2. Auftragsverarbeitungsvertrag gem. Art. 28 DSGVO
(1) Die Musikschule ist und bleibt datenschutzrechtlich die alleinige „Verantwortliche“ (Art. 4 Nr. 7 DSGVO) für alle von ihr verarbeiteten Schüler-, Lehrer- und Verwaltungsdaten.
(2) Campus-Groovelab verarbeitet personenbezogene Daten ausschließlich im Auftrag und auf dokumentierte Weisung der Musikschule.
(3) Sämtliche Datenverarbeitungen erfolgen ausnahmslos auf ISO-27001-zertifizierten Servern innerhalb der Bundesrepublik Deutschland (Standort Hetzner Online GmbH, Falkenstein/Vogtland & Nürnberg, Deutschland).
(4) Die Einhaltung strenger Technisch-Organisatorischer Maßnahmen (TOMs gem. Art. 32 DSGVO) – einschließlich AES-256-Verschlüsselung, Pseudonymisierung von Minderjährigendaten und automatischer Kündigungs-Purge-Routinen nach DIN 66398 – wird garantiert.
(5) Unterauftragsverarbeiter & Widerspruchsfrist: Der Betreiber setzt Hetzner Online GmbH als Hosting-Provider ein. Bei beabsichtigten Änderungen an Unterauftragnehmern wird die Schule mindestens 14 Tage vorab informiert; der Schule steht ein Widerspruchsrecht aus wichtigem datenschutzrechtlichem Grund zu.
(6) Vorfallsmeldung binnen 48 Stunden: Der Betreiber meldet Verletzungen des Schutzes personenbezogener Daten (Art. 33 Abs. 2 DSGVO) unverzüglich, spätestens binnen 48 Stunden nach Bekanntwerden, an die Schule.

### 3. Pflichten der Musikschule, Haftungsbegrenzung & Aufrechnung
(1) Die Musikschule versichert, dass die Erhebung und Übermittlung der Schülerdaten an die Plattform auf einer rechtmäßigen Grundlage beruht, und stellt den Betreiber von Ansprüchen Dritter bei unbefugter Datenübermittlung frei.
(2) Aufrechnungsverbot (BGH-konform): Die Musikschule kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen. Dies gilt nicht für synallagmatische Gegenforderungen aus Leistungsverweigerung oder Mängeln desselben Vertrags.
(3) Cyber-Security & Zero-Day-Exploits: Der Betreiber haftet nicht für Sicherheitsvorfälle durch zuvor unbekannte Schwachstellen, sofern er den aktuellen Stand der Technik (Art. 32 DSGVO / BSI / OWASP ASVS Level 3) nachweislich eingehalten hat.
(4) Versicherungsschutz: Der Betreiber unterhält eine IT- und Cyber-Haftpflichtversicherung mit mindestens 2.000.000,00 € Deckungssumme je Versicherungsfall.

### 4. Zweckbestimmung & Abgrenzung zu behördlichen Schul-ERPs (iMikel)
(1) Campus-Groovelab ist ein didaktisches Begleit-, Motivations- und Kommunikationswerkzeug zur Unterstützung des zeitgemäßen Musikunterrichts.
(2) Die Plattform ersetzt nicht die primären Verwaltungs-, Buchhaltungs- und Dokumentationssysteme der Musikschule (wie z. B. iMikel, Win-Musikschule o. ä.). Amtliche Dokumentations- und Nachweispflichten obliegen weiterhin vollumfänglich den herkömmlichen Systemen der Schule.
(3) Die physische Aufsichtspflicht (§ 832 BGB i.V.m. § 1631 BGB) verbleibt personell und räumlich ausnahmslos beim Personal der Musikschule vor Ort.
(4) Raumbuchungsanfragen und Terminabstimmungen stellen unverbindliche Voranfragen („unter Vorbehalt“) dar.
(5) Didaktisches Assistenz-Prinzip & Subsidiarität (Herrenberg-Compliance): Campus-Groovelab dient den Lehrkräften für einen optimalen Unterrichtsalltag und nicht die Lehrkräfte dem Schulalltag. Die Plattform begründet zu keinem Zeitpunkt eine Weisungs- oder Direktionsgewalt gegenüber Honorardozenten.
(6) Salvatorische Erhaltungsklausel: Sollten Bestimmungen unwirksam sein, gelten die gesetzlichen Vorschriften (§ 306 Abs. 2 BGB).
    `.trim()
  },

  terms_teacher_conduct: {
    type: 'terms_teacher_conduct',
    title: 'Dienstliche Nutzungsvereinbarung & Didaktik-Kodex',
    subtitle: 'Für Lehrkräfte und musikpädagogische Dozenten',
    badge: 'Lehrkräfte / Didaktik',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Didaktische Assistenz-Technologie für den optimalen Unterrichtsalltag der Lehrkraft',
      'Freiwillige Nutzung („Fast-Track-Option“) ohne Weisungs- oder Direktionswirkung',
      'Gesetzliche Aufsichtspflicht (§ 1631 BGB / § 832 BGB): Verbleibt personell bei der Lehrkraft vor Ort',
      'Stundenplan-Entwürfe als didaktisches Vorschlagsrecht unter Genehmigungsvorbehalt (§ 106 GewO)',
      'Vollständiger Verbleib der Urheberrechte an eigenen Übe-Loops und Notizen bei der Lehrkraft'
    ],
    checkboxLabel: 'Ich erkenne die dienstlichen Nutzungsbedingungen sowie den Didaktik-Kodex an und nehme ausdrücklich zur Kenntnis, dass die gesetzliche Aufsichtspflicht (§ 1631 BGB) personell bei der Lehrkraft verbleibt.',
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

### 4. Datengeheimnis & Vertraulichkeit
Die Lehrkraft verpflichtet sich, alle Schüler- und Kollegendaten vertraulich zu behandeln und Zugangsdaten vor dem Zugriff unbefugter Dritter zu schützen.

### 5. Stundenplan-Planung & Genehmigungsvorbehalt (§ 106 GewO)
(1) Im Stundenplan-Designer erstellte Entwürfe stellen ein pädagogisches Vorschlagsrecht der Lehrkraft dar und entfalten vor ihrer formalen Prüfung und Freigabe durch das Schulsekretariat bzw. die Schulleitung keinerlei Rechtsverbindlichkeit nach außen.
(2) Bis zur rechtswirksamen Genehmigung eines neuen Stundenplans durch das Sekretariat verbleibt der bestehende, genehmigte Stundenplan unverändert in Kraft.
    `.trim()
  },

  terms_student_platform: {
    type: 'terms_student_platform',
    title: 'Plattform-Nutzungsbedingungen (Campus-Groovelab)',
    subtitle: 'Für Schülerinnen, Schüler und Erziehungsberechtigte',
    badge: 'Schüler & Eltern / Basis',
    isMandatory: true,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Kostenfreie Nutzung der didaktischen Lern-App für Musikschüler',
      'Hausaufgabenheft, digitaler Übe-Timer und persönlicher Stundenplan-Sync',
      'DSGVO-Datenminimierung: Keine Speicherung von Bank-, Vertrags- oder E-Mail-Daten im Schülerprofil',
      'Didaktische Terminübersicht & Botenmodell: Unterrichtsverträge & Aufsicht verbleiben bei der Schule',
      'Vollständiges geistiges Eigentum an eigenen Audioaufnahmen und Notizen',
      'Ausschluss von Art. 9 DSGVO Gesundheitsdaten: Angabe „verhindert“ genügt vollkommen',
      'Verbraucherschlichtungshinweis (§ 36 VSBG) & Jederzeitige Kündbarkeit'
    ],
    checkboxLabel: 'Ich akzeptiere die kostenfreien Plattform-Nutzungsbedingungen für Campus-Groovelab (bei Minderjährigen durch die Erziehungsberechtigten).',
    fullTextMarkdown: `
### 1. Leistungsbeschreibung & Kostenfreiheit
(1) Campus-Groovelab bietet Schülerinnen und Schülern sowie deren Eltern eine geschützte digitale Begleitung für den Musikunterricht.
(2) Für Schülerinnen und Schüler entstehen durch die reine Nutzung der Plattform keine gesonderten Lizenzkaufgebühren.
(3) Die Plattform umfasst das digitale Hausaufgabenheft, die Meisterwerk-Dokumentation, den Übe-Timer und die Terminübersicht.

### 2. Kinder- und Jugendschutz (DSGVO & Datenminimierung)
(1) Der Schutz von Minderjährigen hat höchste Priorität. Im Schülerprofil werden aus Datenschutzgründen keine Bankdaten, keine E-Mail-Adressen und keine sensiblen Vertragsdaten gespeichert.
(2) Schülernamen werden im Lehrerbereich datensparsam pseudonymisiert dargestellt.
(3) Die Plattform ist zu 100 % werbefrei. Es findet keinerlei Tracking für kommerzielle Zwecke statt.
(4) Verdachtsmeldungen & Kinderschutz: Bei Hinweisen auf Grenzverletzungen steht die Clearing-Adresse kinderschutz@campus-groovelab.de zur Verfügung.

### 3. Geistiges Eigentum an eigenen Beiträgen
Schülerinnen, Schüler und Eltern behalten das uneingeschränkte Urheberrecht an allen selbst eingespielten Audio-Aufnahmen, Loopstation-Spuren und Notizen.

### 4. Didaktischer Charakter der Stunden- und Terminübersichten
(1) Die in Campus-Groovelab dargestellten Termine, Stundenpläne und Hausaufgaben dienen der pädagogischen Orientierung und der didaktischen Kommunikation zwischen Lehrkraft und Schüler.
(2) Verbindliche Unterrichtsverträge, offizielle Schulbescheinigungen sowie rechtlich bindende Unterrichtsvereinbarungen richten sich nach den Bestimmungen des Vertrags mit der Musikschule.
(3) Die Aufsichtspflicht der Musikschule und ihrer Lehrkräfte vor Ort beginnt und endet ausschließlich mit dem tatsächlichen Antritt und Verlassen des Präsenzunterrichts gemäß der Haus- und Schulordnung der Musikschule, nicht durch die digitale Zeitanzeige in der App.
(4) Botenstatus & Ausschluss von Hauptvertragskündigungen: Mitteilungen über Absagen oder Terminabstimmungen in der termingekoppelten Shoutbox fungieren technisch rein als elektronischer Bote. Formelle Kündigungen des Unterrichtsvertrags mit der Musikschule können über die App nicht erklärt werden.
(5) Ausschluss von Gesundheitsdaten (Art. 9 DSGVO): Bei Verhinderung genügt die neutrale Angabe „verhindert“; die Angabe von Diagnosen oder Attestdetails ist unzulässig.

### 5. Verbraucherstreitbeilegung (§ 36 VSBG) & Salvatorische Klausel
(1) Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Die OS-Plattform der EU ist erreichbar unter: https://ec.europa.eu/consumers/odr.
(2) Sollten Bestimmungen unwirksam sein, gelten die gesetzlichen Vorschriften.
    `.trim()
  },

  consent_media_audio: {
    type: 'consent_media_audio',
    title: 'Freiwillige Einwilligung in didaktische Audio-Aufnahmen',
    subtitle: 'Gemäß Art. 8 DSGVO und § 22 Kunsturhebergesetz (KUG)',
    badge: 'Medienfreigabe / Freiwillig',
    isMandatory: false,
    version: ACTIVE_LEGAL_VERSION,
    summaryPoints: [
      'Freiwillige Freigabe für das Aufnehmen eigener Übe-Audios (Loopstation, Übe-Studio)',
      'Audio-Feedback der Lehrkraft direkt im Hausaufgabenheft anhören',
      'Keine Weitergabe an die Öffentlichkeit – strikt geschützter Klassenraum-Tresor',
      'Freiwillig: Das Hausaufgabenheft funktioniert auch ohne Audioaufnahmen',
      'Jederzeit mit Wirkung für die Zukunft widerruflich'
    ],
    checkboxLabel: 'Ich willige freiwillig ein, dass im Rahmen des Musikunterrichts didaktische Audioaufnahmen (Übe-Audios, Loopstation-Spuren) zwischen Schüler und Lehrkraft über den geschützten Audio-Tresor ausgetauscht werden dürfen (Widerruf jederzeit möglich).',
    fullTextMarkdown: `
### 1. Zweck der didaktischen Audioverarbeitung
(1) Im Rahmen des Musikunterrichts können Schüler und Lehrkräfte kurze Audioaufnahmen anfertigen (z. B. Play-Along-Aufnahmen der Lehrkraft, Einspielen eigener Übe-Loops durch den Schüler).
(2) Diese Aufnahmen dienen ausschließlich der pädagogischen Unterstützung des Übens zu Hause und der didaktischen Erfolgskontrolle.

### 2. Geschützter Audio-Tresor & Keine Veröffentlichung
(1) Alle Audios werden in einem isolierten, verschlüsselten Cloud-Speicher gehalten und sind ausschließlich für die zugeordnete Lehrkraft und den Schüler hörbar.
(2) Es erfolgt keinerlei öffentliche Bereitstellung oder Weitergabe an Dritte.

### 3. Freiwilligkeit & Widerrufsrecht (Art. 7 Abs. 3 DSGVO)
(1) Die Erteilung dieser Einwilligung ist vollkommen freiwillig. Aus einer Nichteinwilligung entstehen keine Nachteile für die reguläre Unterrichtsteilnahme.
(2) Diese Einwilligung kann jederzeit mit Wirkung für die Zukunft im Schüler- bzw. Elternprofil widerrufen werden. Im Falle des Widerrufs werden vorhandene Schüleraufnahmen gelöscht.
    `.trim()
  }
};

