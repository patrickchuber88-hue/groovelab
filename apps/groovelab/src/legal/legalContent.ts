// ==============================================================================
// 🏛️ Campus-Groovelab Enterprise Legal Content & Cryptographic Hashes
// Standards: OWASP ASVS Level 3 / Art. 7, 8, 28 DSGVO / § 307 BGB / § 1631 BGB
// ==============================================================================

export const ACTIVE_LEGAL_VERSION = '2026.1';

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
      'Strikte Multi-Tenancy-Mandantentrennung & Rechenzentren in Deutschland (Hetzner Falkenstein/Vogtland & Nürnberg)',
      'Freistellungsklausel für von der Schule eingepflegte Schüler-Stammdaten',
      'Reine Didaktik & Kommunikation: Keine Übernahme behördlicher Dokumentation (iMikel) oder physischer Aufsicht',
      'Raumanfragen & Terminabsagen als Voranfrage unter Vorbehalt / Botenmodell ohne ERP-Automatik'
    ],
    checkboxLabel: 'Ich bestätige als vertretungsberechtigte Person der Musikschule den B2B-Infrastrukturvertrag sowie den Auftragsverarbeitungsvertrag (Art. 28 DSGVO) inklusive der Technisch-Organisatorischen Maßnahmen (TOMs).',
    fullTextMarkdown: `
### 1. Vertragsgegenstand & Bereitstellungsmodell
(1) Campus-Groovelab stellt der Musikschule eine hochverfügbare, mandantenisolierte Cloud-Infrastruktur für Schulverwaltung, Stundenplanung, Raumorganisation und didaktische Begleitung zur Verfügung.
(2) Das Basissystem wird ohne gesonderte Software-Lizenzkaufgebühren bereitgestellt (0,00 € inklusive). Die Vergütung bemisst sich ausschließlich nach den vereinbarten Server-Hosting-, Bereitstellungs- und Infrastrukturpauschalen.

### 2. Auftragsverarbeitungsvertrag gem. Art. 28 DSGVO
(1) Die Musikschule ist und bleibt datenschutzrechtlich die alleinige „Verantwortliche“ (Art. 4 Nr. 7 DSGVO) für alle von ihr verarbeiteten Schüler-, Lehrer- und Verwaltungsdaten.
(2) Campus-Groovelab verarbeitet personenbezogene Daten ausschließlich im Auftrag und auf dokumentierte Weisung der Musikschule.
(3) Sämtliche Datenverarbeitungen erfolgen ausnahmslos auf ISO-27001-zertifizierten Servern innerhalb der Bundesrepublik Deutschland (Standort Hetzner Online GmbH, Falkenstein/Vogtland & Nürnberg, Deutschland).
(4) Die Einhaltung strenger Technisch-Organisatorischer Maßnahmen (TOMs gem. Art. 32 DSGVO) – einschließlich AES-256-Verschlüsselung, Pseudonymisierung von Minderjährigendaten und automatischer Kündigungs-Purge-Routinen – wird garantiert.

### 3. Pflichten der Musikschule & Freistellung
(1) Die Musikschule versichert, dass die Erhebung und Übermittlung der Schülerdaten an die Plattform auf einer rechtmäßigen Grundlage (z. B. Schulunterrichtsvertrag, berechtigtes Interesse, schulgesetzliche Befugnisse) beruht.
(2) Die Musikschule stellt Campus-Groovelab von etwaigen Ansprüchen Dritter frei, die auf einer unbefugten oder fehlerhaften Datenübermittlung durch die Musikschule beruhen.

### 4. Zweckbestimmung & Abgrenzung zu behördlichen Schul-ERPs (iMikel)
(1) Campus-Groovelab ist ein didaktisches Begleit-, Motivations- und Kommunikationswerkzeug zur Unterstützung des zeitgemäßen Musikunterrichts.
(2) Die Plattform ersetzt nicht die primären Verwaltungs-, Buchhaltungs- und Dokumentationssysteme der Musikschule (wie z. B. iMikel, Win-Musikschule o. ä.). Amtliche Dokumentations- und Nachweispflichten (insbesondere für kommunale/staatliche Fördergelder, Verbandsstatistiken, Prüfungsämter sowie arbeitsrechtliche TVöD-Deputatsnachweise) obliegen weiterhin vollumfänglich den herkömmlichen Systemen und Prozessen der Musikschule.
(3) Die physische Aufsichtspflicht (§ 832 BGB i.V.m. § 1631 BGB) verbleibt personell und räumlich ausnahmslos beim Personal der Musikschule vor Ort.
(4) Raumbuchungsanfragen, Terminverschiebungen und Absagen über die Plattform stellen unverbindliche Voranfragen („unter Vorbehalt“) bzw. organisatorische Botennachrichten dar. Sie entfalten erst nach Freigabe und Einpflege in das führende Schulverwaltungssystem (ERP) der Musikschule Verbindlichkeit. Die Plattform übernimmt keine Gewähr für die tatsächliche Verfügbarkeit von Schulräumen vor Ort.
(5) Didaktisches Assistenz-Prinzip & Subsidiarität (Herrenberg-Compliance): Campus-Groovelab dient den Lehrkräften für einen optimalen Unterrichtsalltag und nicht die Lehrkräfte dem Schulalltag. Die Plattform ist ein didaktisches Zusatz-, Erleichterungs- und Übermittlungswerkzeug („Convenience-Tool / Fast-Track-Option“) zur Beschleunigung und Erleichterung des Musikunterrichts. Sie stellt zu keinem Zeitpunkt den ausschließlichen oder verbindlich vorgeschriebenen Dienst-, Weisungs- oder Kommunikationskanal der Musikschule dar. Jede Lehrkraft entscheidet selbstständig und freiwillig über die Nutzung und den didaktischen Umfang.
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
      'Gesetzliche Aufsichtspflicht (§ 1631 BGB / § 832 BGB): Verbleibt personell bei der Lehrkraft',
      'Stundenplan-Entwürfe als didaktisches Vorschlagsrecht unter Genehmigungsvorbehalt (§ 106 GewO)',
      'Audio-Loops & Aufnahmen ausschließlich für geschütztes didaktisches Schüler-Feedback'
    ],
    checkboxLabel: 'Ich erkenne die dienstlichen Nutzungsbedingungen sowie den Didaktik-Kodex an und nehme ausdrücklich zur Kenntnis, dass die gesetzliche Aufsichtspflicht (§ 1631 BGB) personell bei der Lehrkraft verbleibt.',
    fullTextMarkdown: `
### 1. Präambel, didaktische Autonomie & Assistenz-Prinzip
(1) Campus-Groovelab versteht sich als didaktische und organisatorische Assistenz-Technologie, die den Lehrkräften zur optimalen und zeitsparenden Gestaltung ihres individuellen Unterrichtsalltags dient. Sie dient ausdrücklich nicht dazu, Lehrkräfte in vorgegebene Schulleitungsabläufe einzugliedern oder ihr pädagogisches Wirken fremdzubestimmen. Die didaktische und methodische Freiheit der Lehrkraft bleibt in vollem Umfang gewahrt.
(2) Die Nutzung von Campus-Groovelab ist für die Lehrkraft freiwillig („Convenience-Tool / Fast-Track-Option“) und stellt keinen verpflichtenden Dienst- oder Weisungskanal dar. Der Lehrkraft steht es frei, Unterrichtsinhalte, Hausaufgaben und Terminabsprachen über andere Kanäle (z. B. analoges Hausaufgabenheft, Telefon, E-Mail) zu organisieren.
(3) Der Zugang wird der Lehrkraft von ihrer Musikschule zur Vorbereitung, Durchführung und didaktischen Nachbereitung des Instrumental- und Ensembleunterrichts bereitgestellt. Die Plattform darf nicht für unterrichtsfremde, rein private oder gewerbliche Zwecke außerhalb des Musikschulbetriebs genutzt werden.

### 2. Gesetzliche Aufsichtspflicht (§ 1631 BGB / § 832 BGB)
(1) **Wichtiger rechtlicher Hinweis**: Campus-Groovelab ist ein didaktisches und organisatorisches Übungsbegleitungs- und Kommunikationswerkzeug.
(2) Die Plattform entfaltet zu keinem Zeitpunkt eine personelle Aufsichts- oder Überwachungswirkung. Die gesetzliche und vertragliche Aufsichtspflicht über minderjährige Schülerinnen und Schüler verbleibt vollumfänglich und persönlich bei der Lehrkraft im Rahmen des Präsenz- oder Online-Unterrichts vor Ort.
(3) Für das Erscheinen, den Aufenthalt im Schulgebäude sowie die ordnungsgemäße Beaufsichtigung von Minderjährigen gelten die herkömmlichen gesetzlichen, tariflichen und schulordnungsrechtlichen Bestimmungen der Musikschule.

### 3. Didaktische Audioaufnahmen & Loopstation
(1) Über die Plattform angefertigte oder übermittelte Audioaufnahmen (Hausaufgaben-Audios, Loopstation-Spuren) dienen ausschließlich dem individuellen Lernfortschritt des jeweiligen Schülers.
(2) Eine Veröffentlichung oder Weitergabe von Schüleraufnahmen an Dritte außerhalb des geschützten Unterrichtskontexts ist der Lehrkraft streng untersagt.

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
      'DSGVO-Datenminimierung: Keine Speicherung von Bank-, Vertrags- oder E-Mail-Daten',
      'Didaktische Terminübersicht & Botenmodell: Unterrichtsverträge & Aufsicht verbleiben bei der Schule',
      'Ausschluss von Art. 9 DSGVO Gesundheitsdaten: Angabe „verhindert“ genügt vollkommen',
      'Jederzeit kündbar bzw. deaktivierbar'
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

### 3. Pflichten bei der Nutzung
Die Zugangsdaten (QR-Code, Ausweis-PIN) sind sorgfältig aufzubewahren und dürfen nicht an Schulfremde weitergegeben werden.

### 4. Didaktischer Charakter der Stunden- und Terminübersichten
(1) Die in Campus-Groovelab dargestellten Termine, Stundenpläne und Hausaufgaben dienen der pädagogischen Orientierung und der didaktischen Kommunikation zwischen Lehrkraft und Schüler.
(2) Verbindliche Unterrichtsverträge, offizielle Schulbescheinigungen sowie rechtlich bindende Unterrichtsvereinbarungen richten sich nach den Bestimmungen des Vertrags mit der Musikschule.
(3) Die Aufsichtspflicht der Musikschule und ihrer Lehrkräfte vor Ort beginnt und endet ausschließlich mit dem tatsächlichen Antritt und Verlassen des Präsenzunterrichts gemäß der Haus- und Schulordnung der Musikschule, nicht durch die digitale Zeitanzeige in der App.
(4) Botenstatus & Ausschluss von Hauptvertragskündigungen: Mitteilungen über Absagen oder Terminabstimmungen in der termingekoppelten Shoutbox fungieren technisch rein als elektronischer Bote zur zeitgleichen Information von Lehrkraft und Schulsekretariat. Die Plattform begründet keine Genehmigungsfiktion. Formelle Kündigungen des Unterrichtsvertrags mit der Musikschule können über die App nicht erklärt werden und bedürfen der in der Schulordnung festgelegten Form direkt gegenüber der Musikschule.
(5) Ausschluss von Gesundheitsdaten (Art. 9 DSGVO): Die Shoutbox dient rein organisatorischen Zwecken. Die Eingabe von medizinischen Diagnosen, Attesten oder detaillierten Gesundheitsdaten ist untersagt; bei Verhinderung genügt der Vermerk „verhindert“.
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
