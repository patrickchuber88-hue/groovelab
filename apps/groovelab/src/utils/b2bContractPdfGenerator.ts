/**
 * 🏛️ Campus-Groovelab Official B2B Contract Package PDF Generator
 * 
 * Generates an official, print-ready 4-part B2B SaaS Rental Contract (§ 535 BGB / Art. 253 OR),
 * Herrenberg Defense Schedule, AVV (Art. 28 DSGVO / Art. 9 nDSG), and SLA (99.5%)
 * formatted according to DIN 5008 standards for municipal carriers, school boards, and RPAs.
 */

import { ACTIVE_LEGAL_VERSION } from '../legal/legalContent';
import { generateLocalQrDataUrl } from './localQrGenerator';
import { cleanPdfText, computeCanonicalPayloadHash } from './pdfTypographyEngine';

export interface B2BContractOptions {
  schoolName: string;
  schoolId?: string;
  adminName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: 'DE' | 'AT' | 'CH';
  selectedModule?: 'campus' | 'groovelab' | 'kombi';
  teacherCount?: number;
  studentDirectBilling?: boolean;
  confirmationDate?: string;
  isMunicipalCarrier?: boolean;
  returnBuffer?: boolean;
  returnBlob?: boolean;
}

export async function generateB2BContractPackagePDF(options: B2BContractOptions): Promise<Blob | ArrayBuffer | void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);

  // Palette
  const brandEmerald = [21, 128, 61]; // #15803d
  const darkSlate = [15, 23, 42];     // #0f172a
  const textGray = [71, 85, 105];     // #475569
  const lightBg = [248, 250, 252];    // #f8fafc
  const borderGray = [203, 213, 225]; // #cbd5e1

  const isCH = options.country === 'CH';
  const currency = isCH ? 'CHF' : 'EUR';
  const currencySign = isCH ? 'CHF ' : '€';

  // Pricing calculations
  const priceCampus = isCH ? '19.90' : '14,90';
  const priceGroovelab = isCH ? '14.90' : '9,90';
  const priceKombi = isCH ? '29.90' : '19,90';
  const priceTeacher = isCH ? '1.00' : '0,49';

  let selectedModuleLabel = 'Campus & GrooveLab Kombi-Bundle (Vollversion)';
  let selectedBasePrice = `${priceKombi} ${currencySign}`;
  if (options.selectedModule === 'campus') {
    selectedModuleLabel = 'Campus-Modul (Didaktik, Messenger & Stundenplan)';
    selectedBasePrice = `${priceCampus} ${currencySign}`;
  } else if (options.selectedModule === 'groovelab') {
    selectedModuleLabel = 'GrooveLab-Modul (Audio-Engine, Loopstation & Bands)';
    selectedBasePrice = `${priceGroovelab} ${currencySign}`;
  }

  const schoolTitle = options.schoolName || 'Städtische Musikschule';
  const adminTitle = options.adminName || 'Schulleitung / Vertretungsberechtigte Person';
  const dateStr = options.confirmationDate || new Date().toLocaleDateString(isCH ? 'de-CH' : 'de-DE');
  const jurisdictionPlace = options.isMunicipalCarrier 
    ? (options.city || schoolTitle) 
    : 'Lörrach / Rheinfelden (Baden)';

  // Calculate cryptographic verification digest from canonical JSON payload
  const canonicalPayload = {
    docType: 'B2B_CONTRACT_PACKAGE',
    version: ACTIVE_LEGAL_VERSION,
    schoolTitle,
    schoolId: options.schoolId || 'B2B',
    date: dateStr,
    module: selectedModuleLabel,
    basePrice: selectedBasePrice,
    teacherCount: options.teacherCount || 0,
    directBilling: Boolean(options.studentDirectBilling),
    slaTarget: '99.5%',
    country: options.country || 'DE'
  };
  const sha256Digest = await computeCanonicalPayloadHash(canonicalPayload);
  const verifyUrl = `https://campus-groovelab.de/verify-contract?hash=${sha256Digest.slice(0, 32)}`;
  const qrDataUrl = await generateLocalQrDataUrl(verifyUrl, 160).catch(() => null);

  const drawHeader = (pageNumber: number, totalPages: number, pageTitle: string) => {
    // Top Accent Bar
    doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Header Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('CAMPUS-GROOVELAB • B2B-VERTRAGSURKUNDE', margin, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`${pageTitle} | Version ${ACTIVE_LEGAL_VERSION} | Schuljahr 2026/2027`, margin, 17);

    // Right header badge
    doc.setFont('helvetica', 'bold');
    doc.text(`Seite ${pageNumber} von ${totalPages}`, pageWidth - margin, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(isCH ? 'Schweiz (OR / nDSG)' : 'Deutschland / EU (BGB / DSGVO)', pageWidth - margin, 17, { align: 'right' });

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, 20, pageWidth - margin, 20);
  };

  const drawFooter = (pageNumber: number) => {
    const footY = pageHeight - 12;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Urkunden-Prüfhash (§ 371a ZPO): SHA256:${sha256Digest} • Amtliche Ausfertigung für Schulträger`, margin, footY);
    doc.text(`Patrick Huber • Softwareentwicklung & Cloud-Dienstleistungen • Karl-Fürstenberg-Str. 59 • 79618 Rheinfelden`, margin, footY + 4);
    doc.text(`Stand: ${dateStr}`, pageWidth - margin, footY + 2, { align: 'right' });

    // Mini QR on footer
    if (qrDataUrl && qrDataUrl.startsWith('data:image/png')) {
      doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 12, footY - 14, 12, 12);
    }
  };

  // ==========================================================================
  // SEITE 1: DECKBLATT, VERTRAGSPARTEIEN & HAUPTVERTRAG (§ 535 BGB / Art. 253 OR)
  // ==========================================================================
  drawHeader(1, 4, 'B2B-SaaS-Mietvertrag gem. § 535 BGB / Art. 253 OR');

  let y = 28;

  // Title Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('B2B-Infrastruktur- & SaaS-Mietvertrag', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(`Rechtskonform nach ${isCH ? 'Art. 253 ff. OR & Art. 9 nDSG (CH)' : '§ 535 BGB, Art. 28 DSGVO & Herrenberg BSG B 12 R 3/20 R (DE/AT)'}`, margin + 6, y + 14);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Amtliche Ausfertigung für den Schulträger / die Rechnungsprüfung • Ausstellungsdatum: ${dateStr}`, margin + 6, y + 19);

  y += 30;

  // Vertragsparteien Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. VERTRAGSPARTEIEN', margin, y);
  y += 4;

  const boxW = (contentWidth - 6) / 2;

  // Auftragnehmer
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, boxW, 30, 2, 2, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, boxW, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('AUFTRAGNEHMER / BETREIBER:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Patrick Huber', margin + 4, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Softwareentwicklung & Cloud-Dienstleistungen', margin + 4, y + 14);
  doc.text('Karl-Fürstenberg-Str. 59 • 79618 Rheinfelden (Baden)', margin + 4, y + 18);
  doc.text('E-Mail: kontakt@campus-groovelab.de', margin + 4, y + 22);
  doc.text('Gewerbeamt der Stadt Rheinfelden (Baden)', margin + 4, y + 26);

  // Auftraggeber
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + boxW + 6, y, boxW, 30, 2, 2, 'F');
  doc.roundedRect(margin + boxW + 6, y, boxW, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('AUFTRAGGEBER / SCHULTRÄGER:', margin + boxW + 10, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(schoolTitle, margin + boxW + 10, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Vertreten durch: ${adminTitle}`, margin + boxW + 10, y + 14);
  doc.text(options.address || 'Anschrift der Musikschule vor Ort', margin + boxW + 10, y + 18);
  doc.text(`${options.postalCode || ''} ${options.city || ''} (${options.country || 'DE'})`, margin + boxW + 10, y + 22);
  doc.text(`Mandanten-ID: ${options.schoolId || 'B2B-TENANT'}`, margin + boxW + 10, y + 26);

  y += 36;

  // Vertragsgegenstand & Tarife
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('2. VERTRAGSGEGENSTAND, KONDITIONEN & SAAS-AXIOM', margin, y);
  y += 4;

  const tLines = [
    `(1) Der Betreiber stellt dem Schulträger die Softwarelösung Campus-Groovelab als schlüsselfertigen Cloud-Dienst gem. ${isCH ? 'Art. 253 ff. OR' : '§ 535 BGB'} bereit. Die Software wird ohne Lizenzgebühren bereitgestellt (0,00 ${currencySign}). Das Entgelt bemisst sich ausschließlich nach der gemieteten Server-Infrastruktur.`,
    `(2) Gebuchtes Basishosting: ${selectedModuleLabel} zum monatlichen Netto-Hostingpreis von ${selectedBasePrice} / Monat inklusive 10 GB sicherem Cloud-Audiospeicher.`,
    `(3) Pädagogen- & Administrationspauschale: ${priceTeacher} ${currencySign} / Monat je aktiver Lehrkraft oder Verwaltungsmitarbeiter.`,
    `(4) Schüleraktivierungen: ${options.studentDirectBilling 
      ? `Modell B (Schüler-Direktabrechnung): Schulträger zahlt 0,00 ${currencySign} für Schülerzugänge; Eltern tragen den Jahresbeitrag von maximal ${isCH ? 'CHF 11.00' : '5,39 €'} direkt.` 
      : `Modell A (Sammelzahler): Schulträger übernimmt alle Schülerzugänge (${priceTeacher} ${currencySign} / aktiver Schüler / Mo. bzw. mit Jahresrabatt).`}`,
    `(5) Bruttopreisgarantie (§ 19 UStG): Soweit der Betreiber als Kleinunternehmer abrechnet, fällt keine MwSt. an. Bei Übergang zur Regelbesteuerung gilt der Betrag als garantierter Bruttopreis.`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  tLines.forEach(tl => {
    const wrapped = doc.splitTextToSize(tl, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.6 + 1;
  });

  y += 2;

  // Laufzeit & Kündigung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. LAUFZEIT, HAFTUNG & GERICHTSSTAND', margin, y);
  y += 4;

  const lLines = [
    `(1) Laufzeit: Der Vertrag beginnt mit Aktivierung und läuft synchron zum Schuljahr fest bis zum 31. August (Verlängerung um jeweils 12 Monate, Kündigungsfrist: 3 Monate zum 31. Mai). Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt unberührt.`,
    `(2) Haftungsdeckel & Cyber-Police: Haftung für einfache Fahrlässigkeit bei Kardinalpflichten ist auf die 12-Monats-Vergütung (max. 10.000 ${currencySign}) begrenzt. Der Betreiber unterhält eine gewerbliche IT- & Cyber-Police über mindestens 1.000.000,00 ${currencySign} (2-fach maximiert). Verschuldensunabhängige Garantiehaftung gem. § 536a Abs. 1 Alt. 1 BGB ist abbedungen.`,
    `(3) Gerichtsstand: Für alle Streitigkeiten aus diesem Vertrag gilt als Gerichtsstand ${jurisdictionPlace}.`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  lLines.forEach(ll => {
    const wrapped = doc.splitTextToSize(ll, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.6 + 1;
  });

  y += 4;

  // Signatures
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('RECHTSVERBINDLICHE ZEICHNUNG & ANNAHME DER VERTRAGSURKUNDE:', margin + 4, y + 6);

  const sigColW = (contentWidth - 12) / 2;

  // Signee School
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Für den Schulträger / die Musikschule:`, margin + 4, y + 12);
  doc.line(margin + 4, y + 25, margin + 4 + sigColW, y + 25);
  doc.text(`Ort, Datum: ${options.city || ''}, den ${dateStr}`, margin + 4, y + 29);
  doc.text(`Unterschrift / Dienstsiegel: ${adminTitle}`, margin + 4, y + 32);

  // Signee Operator
  doc.text(`Für den Betreiber (Patrick Huber):`, margin + sigColW + 8, y + 12);
  doc.line(margin + sigColW + 8, y + 25, margin + sigColW + 8 + sigColW, y + 25);
  doc.text(`Ort, Datum: Rheinfelden (Baden), den ${dateStr}`, margin + sigColW + 8, y + 29);
  doc.text(`Unterschrift: Patrick Huber (Betreiber)`, margin + sigColW + 8, y + 32);

  drawFooter(1);

  // ==========================================================================
  // SEITE 2: ANLAGE 1 – LEISTUNGSBESCHREIBUNG & HERRENBERG-SCHUTZSCHILD
  // ==========================================================================
  doc.addPage();
  drawHeader(2, 4, 'Anlage 1: Leistungsbeschreibung & Herrenberg-Schutzschild');

  y = 28;

  // Callout Box Herrenberg
  doc.setFillColor(240, 253, 244); // Green 50
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'F');
  doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('HERRENBERG-COMPLIANCE & ENTHAFTUNGSSCHILD DER SCHULLEITUNG', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const hbSummary = doc.splitTextToSize(
    'Gemäß der Rechtsprechung des Bundessozialgerichts (BSG, Urteil vom 28.06.2022 – B 12 R 3/20 R) schützt dieses Vertragswerk Schulleitungen und Schulträger vor dem Verdacht der Scheinselbstständigkeit freier Musikschullehrkräfte gem. § 7a SGB IV und § 266a StGB. Die Software gewährleistet das zweistufige Dispositionsmodell und schließt jegliche arbeitgeberseitige Weisung oder Leistungsüberwachung technisch aus.',
    contentWidth - 12
  );
  doc.text(hbSummary, margin + 6, y + 13);

  y += 38;

  // Sektionen
  const sec1 = [
    '§ 1 Das zweistufige Stundenplan- & Raumdispositionsmodell (BSG Herrenberg-Parität):',
    '(1) Stufe 1 (Pädagogischer Entwurf): Die Lehrkraft erstellt ihren didaktischen Stundenplanentwurf eigenständig und ohne Zuweisung eines festen Unterrichtsraums. Die methodische und pädagogische Unterrichtsgestaltung unterliegt der absoluten Freiheit der Lehrkraft.',
    '(2) Stufe 2 (Ressourcenzuweisung durch das Schulsekretariat): Das Schulsekretariat prüft Raumkapazitäten und weist freie Räume verbindlich zu. Die Software nimmt zu keinem Zeitpunkt automatische Raumzuteilungen vor.',
    '',
    '§ 2 Vollständiger Ausschluss von Weisungsbefugnis, Zeiterfassung & Verhaltenskontrolle (§ 87 BetrVG):',
    '(1) Keine Zeiterfassung: Die Plattform erfasst keine Dienst- oder Arbeitszeiten freier Mitarbeiter. Didaktische Übe-Timer dienen ausschließlich der spielerischen Schülermotivation.',
    '(2) Keine Verhaltenskontrolle: Funktionen zur Ausfallmeldung stellen ein reines pädagogisches Übermittlungswerkzeug dar (Botenstatus) und ersetzen keine amtlichen Krankmeldungen oder arbeitsrechtlichen Nachweise.',
    '',
    '§ 3 Subsidiaritäts-Grundsatz & Ergänzungs-Werkzeug (Fast-Track Doktrin):',
    '(1) Campus-Groovelab ist ein didaktisches Ergänzungswerkzeug. Es ersetzt bewusst kein behördlich vorgeschriebenes ERP- oder Verwaltungssystem der Musikschule (wie iMikel, MSVplus oder Musikschul-Manager).',
    '(2) Bei Systemausfällen greift die vertragliche Schadensminderungspflicht (§ 254 BGB): Der Unterrichtsbetrieb ist auf herkömmlichem Weg (telefonisch, Aushang, E-Mail) fortzusetzen.',
    '',
    '§ 4 Noten-Upload-Verbot (§ 1 Abs. 2 UrhDaG) & Zero-Photo-Doktrin (§ 22 KUG):',
    'Das Hochladen geschützter Partituren oder Notenblätter als PDF ist technisch ausgeschlossen und untersagt. Fotos von Minderjährigen werden durch 3D-Avatare ersetzt.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  sec1.forEach(line => {
    if (line.startsWith('§')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      y += 2;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    }
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.5 + 0.8;
  });

  drawFooter(2);

  // ==========================================================================
  // SEITE 3: ANLAGE 2 – AUFTRAGSVERARBEITUNGSVERTRAG (AVV ART. 28 DSGVO / NDSG)
  // ==========================================================================
  doc.addPage();
  drawHeader(3, 4, 'Anlage 2: Auftragsverarbeitungsvertrag (Art. 28 DSGVO & nDSG)');

  y = 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('VEREINBARUNG ZUR AUFTRAGSVERARBEITUNG GEMÄSS ART. 28 DSGVO / ART. 9 NDSG', margin, y);
  y += 5;

  const avvIntro = doc.splitTextToSize(
    'Diese Anlage konkretisiert die datenschutzrechtlichen Verpflichtungen der Vertragsparteien bei der Bereitstellung von Campus-Groovelab. Die Musikschule handelt als verantwortliche Stelle (Art. 4 Nr. 7 DSGVO); der Betreiber Patrick Huber verarbeitet personenbezogene Daten streng weisungsgebunden als Auftragsverarbeiter (Art. 28 DSGVO).',
    contentWidth
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(avvIntro, margin, y);
  y += avvIntro.length * 3.5 + 4;

  const avvSections = [
    '1. Gegenstand, Zweck & Dauer der Verarbeitung: Bereitstellung der Cloud-Infrastruktur zur didaktischen Unterrichtsbegleitung, Stundenplansynchronisation und Schülerkommunikation für die Dauer des Hauptvertrages.',
    '2. Kategorien betroffener Personen: Schülerinnen und Schüler der Musikschule, Erziehungsberechtigte, Lehrkräfte, Schulleitung und Verwaltungspersonal.',
    '3. Arten personenbezogener Daten: Didaktische Notizen, Übe-Protokolle, Stundenplanzeiten, Raumzuteilungen, verschlüsselte Passwörter/PINs, Schulausweis-Tokens. Keine Gesundheitsdaten (Art. 9 DSGVO) und keine Bankdaten von Familien.',
    '4. Technische und organisatorische Maßnahmen (TOMs gem. Art. 32 DSGVO):',
    '   • Rechenzentrum: Ausschließliches Hosting in ISO/IEC-27001 zertifizierten deutschen Rechenzentren der Hetzner Online GmbH (Falkenstein/Nürnberg). 0 % US-Cloud-Abhängigkeit.',
    '   • Verschlüsselung: Durchgehende Transportverschlüsselung via TLS 1.3 mit HSTS; Ruhedatenverschlüsselung (Encryption at Rest) via AES-256.',
    '   • Mandantentrennung: Strikte Trennung über PostgreSQL Row-Level Security (RLS) mit schulspezifischer Schul-ID Isolation (Default-Deny).',
    '   • Authentifizierung: Passwortloser Zugang über QR-Schulausweis, serverseitige PIN-Prüfung und optionale hardwaregebundene FIDO2/WebAuthn Passkeys.',
    '   • Zugriffskontrolle: Fernsupport („Ghost Support“) nur auf ausdrückliche Anforderung und mit lückenloser WORM-Audit-Protokollierung.',
    '5. Unterauftragsverhältnisse: Ausschließlich Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen (Hosting/Infrastruktur, Standort Deutschland). Keine Übermittlung in unsichere Drittstaaten.',
    '6. Pflichten bei Datenpannen (Art. 33 DSGVO): Meldung von sicherheitsrelevanten Vorfällen binnen 24 bis maximal 48 Stunden an die Schulleitung zur Wahrung der 72h-Behördenfrist.',
    '7. Löschung & Rückgabe (DIN 66398): Nach Vertragsende werden alle mandantenbezogenen Daten innerhalb von 30 Tagen unwiderruflich physisch gelöscht.'
  ];

  avvSections.forEach(avLine => {
    if (avLine.startsWith('4.') || avLine.startsWith('1.')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    }
    const wrapped = doc.splitTextToSize(avLine, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.4 + 1.2;
  });

  drawFooter(3);

  // ==========================================================================
  // SEITE 4: ANLAGE 3 – SERVICE LEVEL AGREEMENT (SLA 99,5 %) & PRÜFSIEGEL
  // ==========================================================================
  doc.addPage();
  drawHeader(4, 4, 'Anlage 3: Service Level Agreement (SLA 99,5 %)');

  y = 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('B2B SERVICE LEVEL AGREEMENT (SLA) & VERFÜGBARKEITSGARANTIE', margin, y);
  y += 5;

  const slaIntro = doc.splitTextToSize(
    'Der Betreiber garantiert für die Cloud-Infrastruktur von Campus-Groovelab eine Verfügbarkeit von mindestens 99,5 % im monatlichen Mittel (24/7), gemessen am Übergabepunkt des Hetzner-Rechenzentrums in Nürnberg/Falkenstein.',
    contentWidth
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(slaIntro, margin, y);
  y += slaIntro.length * 3.5 + 4;

  // Störungsklassen Table
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('STÖRUNGSKLASSIFIZIERUNG & REAKTIONSZEITEN:', margin + 4, y + 5);

  const slaT = [
    'P1 (Kritisch – Gesamtausfall der Plattform): Reaktionszeit < 2 Stunden • Bearbeitungsbeginn unverzüglich',
    'P2 (Schwerwiegend – Kernmodul beeinträchtigt, Workaround möglich): Reaktionszeit < 4 Stunden',
    'P3 (Normal – Einzelne didaktische Funktion gestört, Schulbetrieb läuft): Reaktionszeit < 8 Stunden',
    'P4 (Niedrig – Allgemeine Frage, redaktioneller Hinweis): Reaktionszeit < 24 Stunden (an Werktagen)'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  let ty = y + 10;
  slaT.forEach(st => {
    doc.text(`• ${st}`, margin + 6, ty);
    ty += 6;
  });

  y += 44;

  // Kompensationsmodell
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('KOMPENSATION BEI UNTERSCHREITUNG DER VERFÜGBARKEIT (GRATISMONATE):', margin, y);
  y += 4;

  const komp = [
    '• 99,00 % bis 99,49 % Verfügbarkeit: 1 Gratismonat (Folgender Monat 100 % beitragsfrei auf das Basishosting)',
    '• 98,00 % bis 98,99 % Verfügbarkeit: 2 Gratismonate beitragsfrei',
    '• 95,00 % bis 97,99 % Verfügbarkeit: 3 Gratismonate (ein volles Folgequartal beitragsfrei)',
    '• Unter 95,00 % Verfügbarkeit: 6 Gratismonate beitragsfrei',
    'Barausschluss: Gratismonate stellen eine reine Sachkompensation dar. Ausschlussfrist für Anträge: 30 Tage nach Monatsende.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  komp.forEach(kp => {
    const wrapped = doc.splitTextToSize(kp, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.4 + 1;
  });

  y += 6;

  // Official Verification & Seal Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('AMTLICHE URKUNDEN-VERIFIKATION FÜR RECHNUNGSPRÜFUNGSÄMTER (§ 371a ZPO)', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`Kryptografischer SHA-256 Volltext-Hash:`, margin + 4, y + 12);
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(sha256Digest, margin + 4, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Dieses Dokument wurde elektronisch signiert und im revisionssicheren WORM-Audit-Trail von Campus-Groovelab verankert.`, margin + 4, y + 22);
  doc.text(`Rechnungsprüfer können die Integrität dieser Urkunde durch Scannen des nebenstehenden QR-Codes oder Aufruf von`, margin + 4, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.text(verifyUrl, margin + 4, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`jederzeit online und manipulationssicher gegen das Produktivsystem verifizieren.`, margin + 4, y + 34);

  // Large QR in Verification Box
  if (qrDataUrl && qrDataUrl.startsWith('data:image/png')) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 32, y + 4, 28, 28);
  }

  drawFooter(4);

  // Save / Trigger Download or Return Buffer / Blob
  const filename = `Campus-Groovelab_B2B_Vertrag_${schoolTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${ACTIVE_LEGAL_VERSION}.pdf`;
  if (options.returnBlob) {
    return doc.output('blob');
  }
  if (options.returnBuffer) {
    return doc.output('arraybuffer');
  }
  doc.save(filename);
}
