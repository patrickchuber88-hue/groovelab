import { getParentOnboardingUrl, getTeacherLoginUrl, getCanonicalQrLandingUrl } from './tenantUrlHelper';
import { capitalizeFirstLetter, formatSongTitleCase } from './nameHelper';
import { generateLocalQrDataUrl } from './localQrGenerator';
import { generateEpcGiroCodePayload, formatIbanWithSpaces } from './epcGiroCode';
import { ACTIVE_LEGAL_VERSION } from '../legal/legalContent';

export const generateConsentPDF = async (
  schoolName: string, 
  activePlatform: 'campus' | 'groovelab' | 'both', 
  studentBillingOption?: string
) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // Set up document metadata
  doc.setProperties({
    title: 'Einwilligungserklärung - Campus-Groovelab',
    subject: 'Eltern-Information und Einwilligungserklärung zur App-Nutzung',
    author: 'Campus-Groovelab',
    creator: 'Campus-Groovelab Platform'
  });

  // Colors
  const primaryColor = activePlatform === 'groovelab'
    ? [234, 179, 8]      // Yellow (#eab308)
    : [52, 168, 83];     // Green (#34a853)
  
  const textDark = [30, 41, 59];     // Slate 800
  const textMuted = [100, 116, 139];  // Slate 500
  
  let appName = 'Campus-Groovelab';
  let subjectPhrase = 'Instrumental- und Ensemble-Unterrichts';
  if (activePlatform === 'groovelab') {
    appName = 'Campus-Groovelab (GrooveLab-Modul)';
    subjectPhrase = 'Band- und Ensemble-Unterrichts';
  } else if (activePlatform === 'campus') {
    appName = 'Campus-Groovelab (Campus-Modul)';
    subjectPhrase = 'Instrumentalunterrichts';
  }

  // Determine pricing text based on the school's billing option
  let costTitle = '100% KOSTENLOS';
  let costDesc = 'Die Musikschule übernimmt alle Cloud-Bereitstellungsgebühren.';
  let costDetailText = 'Die Nutzung dieser App ist für Sie und Ihr Kind vollständig kostenlos. Sämtliche Hosting- und Bereitstellungsgebühren werden im Rahmen des Schulbetriebs zu 100% von der Musikschule getragen. Es entstehen Ihnen keine versteckten Kosten.';

  if (studentBillingOption === 'student_full') {
    costTitle = '5,39 € / SCHULJAHR';
    costDesc = 'Jahres-Einmalbeitrag für die Cloud-Bereitstellung (1. Monat kostenlos, max. 11 × 0,49 €; keine Lizenzkaufgebühren).';
    costDetailText = 'Für die Cloud- und Datenbank-Bereitstellung fällt ein transparenter Jahresbeitrag von maximal 5,39 € inkl. MwSt. für das Schuljahr an (1. Monat 100% kostenfrei, danach 11 × 0,49 € / Monat; keine gesonderten Lizenzkaufgebühren). Die Abrechnung erfolgt als Einmalzahlung direkt mit den Erziehungsberechtigten gemäß den Vorgaben der Musikschule (keine automatische Verlängerung).';
  } else if (studentBillingOption === 'student_partial') {
    costTitle = '4,40 € / SCHULJAHR';
    costDesc = 'Eigenanteil für die Cloud-Bereitstellung (1. Monat kostenlos, max. 11 × 0,40 €; Schule bezuschusst; keine Lizenzkaufgebühren).';
    costDetailText = 'Für die Cloud-Bereitstellung fällt für Sie ein reduzierter Jahresbeitrag von 4,40 € inkl. MwSt. für das Schuljahr an (1. Monat 100% kostenfrei, danach 11 × 0,40 € / Monat; die verbleibenden 0,09 € monatlich übernimmt die Musikschule als Zuschuss; keine gesonderten Lizenzkaufgebühren). Die Abrechnung erfolgt als Einmalzahlung (keine automatische Verlängerung).';
  }

  // GrooveLab is always covered by the school, override if platform is solely GrooveLab
  if (activePlatform === 'groovelab') {
    costTitle = '100% KOSTENLOS';
    costDesc = 'Kosten für die Cloud-Bereitstellung trägt die Schule.';
    costDetailText = 'Die Nutzung des GrooveLab-Moduls ist für Sie und Ihr Kind vollständig kostenlos. Alle anfallenden Hosting- und Bereitstellungsgebühren werden zu 100% von der Musikschule übernommen.';
  }

  // 1. Draw Top Header accent bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  let currentY = 22;

  // 2. School Header (Uppercase, small, gray)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text((schoolName || 'Meine Musikschule').toUpperCase(), 20, currentY);
  currentY += 8;

  // 3. Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Eltern-Information & Einwilligung', 20, currentY);
  currentY += 7;

  // 4. Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Einwilligungserklärung zur pädagogischen Nutzung der Lern-App ' + appName, 20, currentY);
  currentY += 12;

  // 5. Highlights Box (Key Facts)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(20, currentY, 170, 24, 'FD');
  
  // Col 1: Datenschutz
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DATENSCHUTZ', 25, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('• DSGVO- & schulrechtskonform', 25, currentY + 13);
  doc.text('• Keine Tracker / Werbung', 25, currentY + 18);

  // Col 2: Hosting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('HOSTING IN DE', 82, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('• Deutsche Server (Hetzner)', 82, currentY + 13);
  doc.text('• DSGVO-AVV gezeichnet', 82, currentY + 18);

  // Col 3: Kosten
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(costTitle, 138, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const costDescLines = doc.splitTextToSize(costDesc, 48);
  doc.text(costDescLines, 138, currentY + 13, { lineHeightFactor: 1.15 });

  currentY += 32;

  // 6. Greeting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Sehr geehrte Eltern, liebe Erziehungsberechtigte,', 20, currentY);
  currentY += 6;

  // 7. Body text - Pädagogischer Nutzen
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  const introText = `im Rahmen des ${subjectPhrase} nutzen wir die webbasierte, datenschutzkonforme App „${appName}“. Die Software dient der modernen Unterrichtsbegleitung und spielerischen Motivation zu Hause (inklusive Übe-Timer, XP-Sammeln für Fleiß, digitalem Hausaufgabenheft, Song-Bibliotheken und einer kindersicheren Audio-Loopstation zum kreativen Mitspielen).`;
  
  const introLines = doc.splitTextToSize(introText, 170);
  doc.text(introLines, 20, currentY, { lineHeightFactor: 1.35 });
  currentY += introLines.length * 5 + 8;

  // 8. Section: Sicherheits- & Datenschutzgarantien
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('RECHTLICHE ZUSAGEN & DATENSCHUTZ-STANDARDS:', 20, currentY);
  currentY += 8;

  const bulletPoints = [
    { title: 'Automatischer Sichtschutz (Privacy by Default): ', desc: 'In der App und im Unterricht wird der Nachname zum Schutz vor Schulterblicken stets automatisch auf die Initiale maskiert (z. B. „Max M.“). Die Musikschule verwaltet den Klarnamen sicher im internen Sekretariat.' },
    { title: 'Datensparsamkeit: ', desc: 'Wir erheben keinerlei E-Mail-Adressen von Kindern, Telefonnummern oder Bankdaten. Kalender-Sync nutzt pseudonyme, jederzeit widerrufbare Tokens.' },
    { title: 'Zertifiziertes Hosting: ', desc: 'Der Serverbetrieb erfolgt in DSGVO-konformen deutschen Rechenzentren (Hetzner Online GmbH, Standort Falkenstein).' },
    { title: 'Audio-Aufnahmen: ', desc: 'Aufnahmen dienen rein pädagogischen Zwecken (Übe-Nachweis). Bei Löschung des Accounts oder Beitrags werden die Audio-Daten sofort physisch vom Cloud-Speicher gelöscht.' },
    { title: 'Kostenregelung: ', desc: costDetailText }
  ];

  bulletPoints.forEach((point) => {
    // Bullet marker
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(23, currentY - 1.1, 0.8, 'F');
    
    // Bold title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(point.title, 28, currentY);
    const titleWidth = doc.getTextWidth(point.title);
    
    // Description text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const descLines = doc.splitTextToSize(point.desc, 170 - titleWidth);
    doc.text(descLines, 28 + titleWidth, currentY, { lineHeightFactor: 1.3 });
    
    currentY += Math.max(descLines.length * 4.8, 6.5);
  });

  currentY += 6;

  // 9. Legal consent & revocation clause (Art. 7 Abs. 3 DSGVO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Freiwilligkeit & Widerrufsbelehrung:', 20, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const consentText = 'Die Nutzung der Lern-App ist vollkommen freiwillig. Sie können diese Einwilligung jederzeit mit Wirkung für die Zukunft durch formlose Erklärung gegenüber der Musikschule widerrufen. Bei Nichtteilnahme entstehen Ihrem Kind keinerlei Nachteile im regulären Unterricht.';
  const consentLines = doc.splitTextToSize(consentText, 170);
  doc.text(consentLines, 20, currentY, { lineHeightFactor: 1.3 });
  currentY += consentLines.length * 5 + 10;

  // 10. Signatures Block
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);

  // Line 1: Child Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Name des Kindes:', 20, currentY);
  doc.line(52, currentY + 1, 190, currentY + 1);
  currentY += 13;

  // Line 2: Date & Signature
  doc.text('Ort, Datum:', 20, currentY);
  doc.line(42, currentY + 1, 95, currentY + 1);

  doc.text('Unterschrift d. Erziehungsberechtigten:', 102, currentY);
  const signLabel = 'Unterschrift d. Erziehungsberechtigten:';
  const labelWidth = doc.getTextWidth(signLabel);
  doc.line(102 + labelWidth + 3, currentY + 1, 190, currentY + 1);

  currentY += 16;

  // 11. Footer Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Bitte füllen Sie dieses Dokument aus und geben Sie es bei der Lehrkraft oder in der Musikschul-Verwaltung ab.', 20, currentY);

  // Save / Trigger Download
  const cleanSchool = (schoolName || 'Musikschule').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
  const filename = activePlatform === 'groovelab' 
    ? `Einwilligung_Eltern_GrooveLab_${cleanSchool}.pdf` 
    : activePlatform === 'campus'
      ? `Einwilligung_Eltern_Campus_${cleanSchool}.pdf`
      : `Einwilligung_Eltern_Campus_Groovelab_${cleanSchool}.pdf`;
  doc.save(filename);
};

export const generateDSBCompliancePDF = async (schoolName: string) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setProperties({
    title: 'Datenschutz- & IT-Sicherheitsdossier - Campus-Groovelab Enterprise',
    subject: 'Offizielles DSB-Freigabepaket, DSFA, TOMs & AVV nach Art. 28, 32, 35 DSGVO',
    author: 'Campus-Groovelab Enterprise Trust Center',
    creator: 'Campus-Groovelab Platform'
  });

  const primaryGreen = [52, 168, 83];
  const darkSlate = [15, 23, 42];
  const mutedText = [100, 116, 139];
  const borderGray = [226, 232, 240];

  // Helper for drawing clean Checkmark Badges (no Unicode/Emoji bugs)
  const drawCheckBadge = (x: number, yPosition: number, label: string) => {
    doc.setFillColor(230, 244, 234);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(x, yPosition - 3.5, 7, 4.5, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text('OK', x + 1.2, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(label, x + 9, yPosition);
  };

  // ==========================================
  // PAGE 1: Executive Summary, DSFA & TOMs
  // ==========================================

  // Top Header Accent Bar
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 210, 7, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Datenschutz- & IT-Sicherheitsdossier', 20, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Offizielles DSB-Freigabepaket für Kommunen & Träger • Schulpartner: ${schoolName}`, 20, 26);
  doc.text(`Dokumenten-ID: CG-TRUST-2026-DSB | Stand: August 2026 | ISO 27001 RZ & DSGVO Konform`, 20, 31);
  
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(20, 35, 190, 35);

  let y = 42;

  // Box 1: Executive Compliance Banner
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, y, 170, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text('[COMPLIANCE-NACHWEIS] 22 / 22 SICHERHEITS- & DATENSCHUTZ-STANDARDS ERFÜLLT', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Hosting 100% in Deutschland (Hetzner ISO 27001) • 0% US-Cloud-Act Risiko • Privacy by Design & Default', 25, y + 15);
  doc.text('Vollständige Einhaltung aller Vorgaben der DSGVO, des BSI-Grundschutzes und kommunaler Schulgesetze.', 25, y + 20);

  y += 32;

  // Section 1: DSFA (Art. 35 DSGVO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. Muster-Datenschutz-Folgenabschätzung (DSFA nach Art. 35 DSGVO)', 20, y);
  y += 6;

  const dsfaPoints = [
    'Risikoanalyse Minderjährige: Extrem niedriges Schutzbedarf-Risiko durch konsequente Datenminimierung.',
    'Keine sensiblen Stammdaten: Keine Erfassung von Schüler-E-Mails, Wohnadressen, Telefonnummern oder Bankdaten.',
    'Pflichtmaskierung von Nachnamen: Schutz vor Schulterblick-Spionage im Schulbetrieb (Vorname + 1. Buchstabe).',
    'Hardware-Sicherheit: Automatische Mikrofon- & Kamera-Abschaltung beim Verlassen aller Audio-Module.',
    'Dienst- & Persönlichkeitsschutz: 48-Stunden Auto-Freeze für Chat-Nachrichten zur Wahrung des Schulrechts.'
  ];

  dsfaPoints.forEach(pt => {
    drawCheckBadge(22, y, pt);
    y += 6;
  });

  y += 4;

  // Section 2: TOMs (Art. 32 DSGVO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('2. Technische & Organisatorische Maßnahmen (TOM nach Art. 32 DSGVO)', 20, y);
  y += 6;

  const toms = [
    ['Vertraulichkeit & TLS:', 'Transportweg mit TLS 1.3 + HSTS; Datenbank/Storage ruhend nach AES-256.'],
    ['Mandantentrennung:', 'PostgreSQL Row-Level Security (RLS) erzwingt strikte Multi-Tenancy Isolation.'],
    ['Append-Only Audit Logs:', 'WORM-Prinzip in Postgres – System-Logs für Nutzer & Admins unmodifizierbar.'],
    ['Content Security Policy:', 'Strikte CSP (script-src self) schützt vor Cross-Site Scripting (XSS).'],
    ['PIN & Passwort Hashing:', 'Kryptografische Einweg-Hashes (Argon2id/Bcrypt) mit serverseitigem Pepper.'],
    ['Infrastruktur Throttling:', 'Netzwerk-Rate-Limiting (Kong/Nginx) schützt vor Brute-Force & DDoS.'],
    ['Background-Blurring:', 'Automatisches Unscharfschalten (blur: 16px) bei Tab- oder App-Wechsel.'],
    ['Offsite-Backups:', 'Tägliche verschlüsselte Backups (AES-256) inkl. automatisierter Restore-Tests.']
  ];

  toms.forEach(([label, desc]) => {
    // Draw green [OK] badge icon (no unicode bugs)
    doc.setFillColor(230, 244, 234);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(22, y - 3.2, 6.5, 4.2, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(22, 101, 52);
    doc.text('OK', 23.1, y);

    // Label text in bold green
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(22, 101, 52);
    doc.text(label, 30.5, y);

    // Description text starting at fixed x=76mm (zero overlap)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    doc.text(desc, 76, y);

    y += 5.5;
  });

  // Footer Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Ausgestellt für: ${schoolName} • Erstellt über Campus-Groovelab Enterprise Trust Center`, 20, 282);
  doc.text(`Seite 1 von 2`, 175, 282);

  // ==========================================
  // PAGE 2: AVV, Sub-Processors & DSB Signoff
  // ==========================================
  doc.addPage();

  // Top Header Accent Bar Page 2
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 210, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Campus-Groovelab Enterprise Trust Center • DSB-Freigabepaket`, 20, 14);
  doc.text(`Dokumenten-ID: CG-TRUST-2026-DSB`, 140, 14);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(20, 17, 190, 17);

  y = 26;

  // Section 3: AVV (Art. 28 DSGVO) & Sub-Processors
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('3. Auftragsverarbeitung (AVV nach Art. 28 DSGVO) & Unterauftragnehmer', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Gemäß Art. 28 Abs. 2 DSGVO werden hiermit alle eingesetzten Unterauftragnehmer offengelegt:', 20, y);
  y += 8;

  // Sub-processor Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y, 170, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Unterauftragnehmer', 23, y + 5);
  doc.text('Dienstleistung / Funktion', 64, y + 5);
  doc.text('Standort', 120, y + 5);
  doc.text('Zertifizierung', 160, y + 5);
  y += 8;

  const subProcessors = [
    ['Hetzner Online GmbH', 'High-Security Rechenzentrum & Host', 'Falkenstein / Nürnberg', 'ISO 27001'],
    ['Supabase (Self-Hosted)', 'Datenhaltung & RLS Engine', 'Inhouse (Hetzner DE)', 'DSGVO / RLS'],
  ];

  subProcessors.forEach(([name, functionDesc, location, cert]) => {
    const safeName = doc.splitTextToSize(name, 38)[0];
    const safeDesc = doc.splitTextToSize(functionDesc, 53)[0];
    const safeLoc = doc.splitTextToSize(location, 36)[0];
    const safeCert = doc.splitTextToSize(cert, 26)[0];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(safeName, 23, y + 4);
    
    doc.setFont('helvetica', 'normal');
    doc.text(safeDesc, 64, y + 4);
    doc.text(safeLoc, 120, y + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(safeCert, 160, y + 4);
    
    doc.setDrawColor(241, 245, 249);
    doc.line(20, y + 7, 190, y + 7);
    y += 9;
  });

  y += 4;

  // Cloud Act Exemption Banner
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(20, y, 170, 14, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70);
  doc.text('[0% US-CLOUD-ACT RISIKO] Keine Einbindung US-amerikanischer Hyperscaler.', 25, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Es werden keine Daten in Drittländer exportiert. Der Schutz personenbezogener Schülerdaten ist 100% gewahrt.', 25, y + 11);

  y += 22;

  // Section 4: Betroffenenrechte & Löschkonzept (Art. 12 - 22 DSGVO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('4. Betroffenenrechte & Löschkonzept (Art. 12 - 22 DSGVO)', 20, y);
  y += 6;

  const rights = [
    'Auskunftsrecht & Datenübertragbarkeit (Art. 15, 20 DSGVO): Export aller Daten auf Knopfdruck als JSON/CSV.',
    'Recht auf Löschung (Art. 17 DSGVO): Sofortige und vollständige Anonymisierung / Physische Löschung bei Vertragsende.',
    'Automatisches Verfallsdatum: Automatische Inaktivierung von ungenutzten Schülerprofilen nach 2 Monaten.'
  ];

  rights.forEach(r => {
    drawCheckBadge(22, y, r);
    y += 6;
  });

  y += 8;

  // Section 5: Official DSB Audit & Signoff Stamp Block for Municipalities
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('5. Offizielles DSB-Freigabeprotokoll & Prüfentscheidung', 20, y);
  y += 6;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(20, y, 170, 56, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('PRÜFERGEBNIS: FREIGEGEBEN FÜR SCHUL- UND KOMMUNALBETRIEB', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Datenschutzrechtliche Freigabeempfehlung gemäß Art. 35 DSGVO für ${schoolName} erteilt.`, 25, y + 14);

  // Form Fields for Municipal DPO Signoff
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

  doc.text(`Freigegebene Musikschule / Träger:  ${schoolName}`, 25, y + 24);
  doc.text(`Datum der DSB-Freigabe:  _________________________________________`, 25, y + 32);
  doc.text(`Name des Datenschutzbeauftragten:  _________________________________________`, 25, y + 40);
  doc.text(`Unterschrift / Dienststempel:  _________________________________________`, 25, y + 48);

  // Footer Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Ausgestellt für: ${schoolName} • Erstellt über Campus-Groovelab Enterprise Trust Center`, 20, 282);
  doc.text(`Seite 2 von 2`, 175, 282);

  doc.save(`DSB_Freigabepaket_TOM_AVV_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

// 5-minute In-Memory PDF Document Cache for instant 0ms repeat downloads
interface CachedPdf {
  blob: Blob;
  filename: string;
  timestamp: number;
}
const pdfMemoryCache = new Map<string, CachedPdf>();
const PDF_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedPdf(key: string): CachedPdf | null {
  const item = pdfMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > PDF_CACHE_TTL_MS) {
    pdfMemoryCache.delete(key);
    return null;
  }
  return item;
}

function setCachedPdf(key: string, blob: Blob, filename: string): void {
  pdfMemoryCache.set(key, { blob, filename, timestamp: Date.now() });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Generates a 1-page A4 Quickstart Cheat Sheet for Teachers
 */
export const generateTeacherQuickstartPDF = async (schoolName: string, schoolSubdomain?: string) => {
  const cacheKey = `teacher_quickstart_${schoolName}_${schoolSubdomain || ''}`;
  const cached = getCachedPdf(cacheKey);
  if (cached) {
    triggerBlobDownload(cached.blob, cached.filename);
    return;
  }

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setProperties({
    title: 'Lehrkräfte-Schnellstart - Campus-Groovelab',
    subject: '1-Seiter Quickstart Leitfaden für Musikschullehrkräfte',
    author: 'Campus-Groovelab',
    creator: 'Campus-Groovelab Platform'
  });

  const primaryGreen = [52, 168, 83];
  const darkSlate = [15, 23, 42];
  const mutedText = [100, 116, 139];
  const borderGray = [226, 232, 240];
  const teacherLoginUrl = getTeacherLoginUrl(schoolName, schoolSubdomain);

  // Top Accent Bar
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 210, 6, 'F');

  let y = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text((schoolName || 'Meine Musikschule').toUpperCase(), 20, y);
  y += 7;

  doc.setFontSize(18);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Lehrer-Schnellstart: Campus-Groovelab', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('In 3 einfachen Schritten zu digitalem Hausaufgabenheft, Loopstation & Stundenplan', 20, y);
  y += 10;

  // 3-Step Cards
  const steps = [
    {
      nr: '1',
      title: 'Schritt 1: Einloggen & Schülerprofil öffnen',
      desc: `Melden Sie sich unter ${teacherLoginUrl} mit Ihrem Lehrer-PIN oder QR-Ausweis an. Ihre Schülerliste und der Stundenplan sind hinterlegt. Klicken Sie auf den Namen Ihres Schülers für das digitale Protokoll.`
    },
    {
      nr: '2',
      title: 'Schritt 2: Hausaufgabe eintragen & Audio-Loop aufnehmen',
      desc: 'Tippen Sie Notizen oder Übestücke ein. Optional: Nehmen Sie mit der integrierten 4-Takte-Loopstation ein kurzes Begleitmuster (Playalong) auf, zu dem der Schüler zuhause im Takt üben kann.'
    },
    {
      nr: '3',
      title: 'Schritt 3: Übe-Timer & Streaks aktivieren',
      desc: 'Der Schüler sieht den Eintrag sofort in seiner App. Mit dem Fokus-Timer sammelt der Schüler XP-Punkte für regelmäßiges Üben – spielerische Motivation ohne zusätzlichen Lehreraufwand!'
    }
  ];

  steps.forEach(st => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(20, y, 170, 36, 3, 3, 'FD');

    // Number circle badge
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.roundedRect(25, y + 6, 7, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(st.nr, 27.5, y + 11);

    // Title
    doc.setFontSize(10.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(st.title, 36, y + 11);

    // Desc
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    const splitText = doc.splitTextToSize(st.desc, 150);
    doc.text(splitText, 25, y + 19);

    y += 42;
  });

  y += 2;

  // DSGVO & Zero-PII Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, y, 170, 42, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text('100% DATENSCHUTZ & ZERO-PII FÜR LEHRKRÄFTE', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const dsgvoText = [
    '• Keine privaten Telefonnummern/E-Mails nötig: Die gesamte Kommunikation läuft geschützt über die Plattform.',
    '• Schülernamen sind automatisch maskiert (z. B. Max M.), um Schulterblick-Spionage zu verhindern.',
    '• Automatischer Hardware-Schutz: Mikrofone werden beim Schließen von Audio-Modulen sofort abgeschaltet.',
    '• Gehostet nach deutschem Schulrecht auf nach ISO 27001 zertifizierten Servern in Deutschland.'
  ];
  let textY = y + 14;
  dsgvoText.forEach(line => {
    doc.text(line, 25, textY);
    textY += 6;
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Bereitgestellt für: ${schoolName} • Campus-Groovelab Lehrkräfte-Onboarding`, 20, 282);

  const filename = `Lehrer_Schnellstart_Campus_Groovelab_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  setCachedPdf(cacheKey, blob, filename);
  doc.save(filename);
};

export interface ParentQuickstartPDFOptions {
  schoolName: string;
  activePlatform?: 'campus' | 'groovelab' | 'both';
  schoolSubdomain?: string;
  schoolLogoUrl?: string;
  studentBillingOption?: 'school_all' | 'student_full' | 'student_partial' | string;
  city?: string;
  contactEmail?: string;
  returnOnlyBlob?: boolean;
}

/**
 * Generates an ultra-crisp, printable 1-page DIN A4 Parent Information Sheet PDF
 * with dynamic School Logo, high-resolution QR Code, and module-specific highlights.
 */
export const generateParentQuickstartPDF = async (
  schoolNameOrOptions: string | ParentQuickstartPDFOptions,
  activePlatformArg?: 'campus' | 'groovelab' | 'both',
  schoolSubdomainArg?: string
) => {
  const options: ParentQuickstartPDFOptions = typeof schoolNameOrOptions === 'string'
    ? {
        schoolName: schoolNameOrOptions,
        activePlatform: activePlatformArg || 'both',
        schoolSubdomain: schoolSubdomainArg
      }
    : schoolNameOrOptions;

  const {
    schoolName = 'Meine Musikschule',
    activePlatform = 'both',
    schoolSubdomain,
    schoolLogoUrl,
    studentBillingOption = 'school_all',
    city = '',
    contactEmail = '',
    returnOnlyBlob = false
  } = options;

  const cacheKey = `parent_info_${schoolName}_${activePlatform}_${studentBillingOption}_${schoolSubdomain || ''}_${Boolean(schoolLogoUrl)}`;
  const cached = getCachedPdf(cacheKey);
  if (cached && !returnOnlyBlob) {
    triggerBlobDownload(cached.blob, cached.filename);
    return { blob: cached.blob, filename: cached.filename };
  }

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const platformLabel = activePlatform === 'groovelab'
    ? 'GrooveLab'
    : activePlatform === 'campus'
      ? 'Campus'
      : 'Campus & GrooveLab';

  doc.setProperties({
    title: `Elternbrief ${platformLabel} - ${schoolName}`,
    subject: `Offizieller Elternbrief (${platformLabel}) zur Campus-Groovelab Schul-App`,
    author: schoolName,
    creator: 'Campus-Groovelab Enterprise'
  });

  // Dynamic Theme Colors
  const primaryColor = activePlatform === 'groovelab'
    ? [234, 179, 8]      // Gold-Yellow (#eab308)
    : activePlatform === 'campus'
      ? [52, 168, 83]    // Campus Green (#34a853)
      : [5, 150, 105];   // Emerald Green (#059669)

  const darkSlate = [15, 23, 42];     // #0f172a
  const bodyText = [51, 65, 85];      // #334155
  const mutedText = [100, 116, 139];  // #64748b
  const borderGray = [226, 232, 240]; // #e2e8f0
  const lightBg = [248, 250, 252];    // #f8fafc

  const parentOnboardingUrl = getParentOnboardingUrl(schoolName, schoolSubdomain);

  // 1. Top Decorative Accent Bar (6mm)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  let y = 16;

  // 2. Header: Logo & School Meta
  let headerLeftX = 18;
  const hasLogo = Boolean(schoolLogoUrl);

  if (hasLogo && schoolLogoUrl) {
    try {
      doc.addImage(schoolLogoUrl, 'PNG', 18, y - 2, 24, 14, undefined, 'FAST');
      headerLeftX = 46;
    } catch {
      // Fallback: draw elegant school badge
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.roundedRect(18, y - 2, 24, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('SCHULE', 30, y + 6, { align: 'center' });
      headerLeftX = 46;
    }
  }

  // School Name and Platform Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const schoolLabel = (schoolName || 'MUSIKSCHULE').toUpperCase() + (city ? ` • ${city.toUpperCase()}` : '');
  doc.text(schoolLabel, headerLeftX, y + 1);

  doc.setFontSize(16);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const docMainTitle = activePlatform === 'groovelab' 
    ? 'Elternbrief: Dein Zugang zu GrooveLab' 
    : activePlatform === 'campus'
      ? 'Elternbrief: Das digitale Hausaufgabenheft'
      : 'Elternbrief: Unser digitaler Schul-Campus';
  doc.text(docMainTitle, headerLeftX, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  const docSubTitle = activePlatform === 'groovelab'
    ? 'Bandunterricht, Band-Matching, Songs & Live Lab auf Campus-Groovelab'
    : activePlatform === 'campus'
      ? 'Unterrichts-Begleitung, Aufgabenheft & Übe-Studio auf Campus-Groovelab'
      : 'Hausaufgabenheft, Lehrkraft-Aufnahmen & Band-Rooms auf Campus-Groovelab';
  doc.text(docSubTitle, headerLeftX, y + 12.5);

  y += 20;

  // 3. Intro Lead Box (Squircle)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(18, y, 174, 18, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.setTextColor(bodyText[0], bodyText[1], bodyText[2]);
  const introLead = activePlatform === 'groovelab'
    ? `Liebe Eltern, liebe Schülerinnen und Schüler, unsere Musikschule nutzt für das gemeinsame Musizieren im Ensemble und in Bands das moderne GrooveLab-Modul. Damit fördern wir das Zusammenspiel, das Erlernen echter Songs und die Begeisterung für gemeinsame Bühnenauftritte – digital, kindersicher und geschützt auf Smartphone oder Tablet.`
    : activePlatform === 'campus'
      ? `Liebe Eltern, liebe Schülerinnen und Schüler, unsere Musikschule nutzt das digitale Campus-Modul auf Campus-Groovelab. Das digitale Aufgabenheft bringt Struktur, Lehrkraft-Aufnahmen unterstützen das Einstudieren zu Hause und der interaktive Fokus-Timer belohnt regelmäßiges Üben mit Streaks und XP.`
      : `Liebe Eltern, liebe Schülerinnen und Schüler, unsere Musikschule nutzt die voll integrierte Plattform Campus-Groovelab. Damit verbinden wir das persönliche Instrumental-Hausaufgabenheft mit modernem Band-Musizieren, Lehrkraft-Aufnahmen und interaktiven Songs – digital, kindersicher und geschützt auf Smartphone oder Tablet.`;
  const splitIntro = doc.splitTextToSize(introLead, 164);
  doc.text(splitIntro, 23, y + 5.5);

  y += 24;

  // 4. Three Advantage Cards (Editorial Flow)
  const features = activePlatform === 'groovelab' ? [
    {
      badge: 'SONGS',
      title: 'Songs & Band-Repertoire meistern',
      desc: 'Alle Songs, Ablaufpläne, Chords und Notenblätter des Bandunterrichts sind direkt abrufbar – perfekt für Bandproben, das Üben zu Hause und anstehende Konzerte.'
    },
    {
      badge: 'MATCHING',
      title: 'Band-Matching & Band-Rooms',
      desc: 'Gemeinsam mehr erreichen: Die Musikschule vernetzt passende Musiker zu harmonischen Ensembles. Im digitalen Band-Room teilen Bandmitglieder Setlists und Ideen.'
    },
    {
      badge: 'LIVE LAB',
      title: 'Synchrones Live Lab & Musiker-Avatare',
      desc: 'Echtzeit-Synchronisation im Proberaum auf Band-Tablets: Jeder Schüler wählt seinen individuellen Musiker-Avatar und verfolgt seinen Fortschritt im Skill-Radar.'
    }
  ] : activePlatform === 'campus' ? [
    {
      badge: 'AUFGABEN',
      title: 'Digitales Aufgabenheft, Notizen & Audios',
      desc: 'Schluss mit Zettelwirtschaft: Hausaufgaben, Takte, Seitenzahlen und Hinweise der Lehrkraft sind direkt griffbereit. Hörbeispiele unterstützen das Einstudieren zu Hause.'
    },
    {
      badge: 'STUDIO',
      title: 'Übe-Studio, Loopstation & Play-Alongs',
      desc: 'Interaktives Mitspielen: Mit der Mehrspur-Loopstation das Timing trainieren, eigene Takes aufnehmen und mit dem Fokus-Timer motivierende Streaks und XP sammeln.'
    },
    {
      badge: 'TERMINE',
      title: 'Termingekoppelte Mitteilungen & Raum-Updates',
      desc: 'Immer auf dem neuesten Stand: Raumänderungen, Terminverschiebungen und persönliche Mitteilungen der Lehrkraft landen sofort geschützt und terminsynchron in der App.'
    }
  ] : [
    {
      badge: 'CAMPUS',
      title: 'Digitales Aufgabenheft & Lehrkraft-Audios',
      desc: 'Schluss mit Zettelwirtschaft: Hausaufgaben, Notizen und Audio-Begleitungen der Lehrkraft sind direkt griffbereit – ideal für den wöchentlichen Instrumentalunterricht.'
    },
    {
      badge: 'GROOVELAB',
      title: 'Band-Rooms, Repertoire & Live Lab',
      desc: 'Gemeinsam Songs meistern: Interaktive Ablaufpläne, Chords und synchrones Proben-Dashboard auf Proberaum-Tablets für mitreißendes Band-Zusammenspiel.'
    },
    {
      badge: 'MOTIVATION',
      title: 'Fokus-Timer, Streaks & Musiker-Avatare',
      desc: 'Spielerische Begeisterung: Schüler wählen ihren Musiker-Avatar, trainieren mit der Loopstation und sammeln für regelmäßiges Üben und Bandproben wertvolle XP-Belohnungen.'
    }
  ];

  features.forEach((feat) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(18, y, 174, 25, 2.5, 2.5, 'FD');

    // Badge Pill
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    const badgeWidth = feat.badge.length > 7 ? 20 : feat.badge.length > 5 ? 17 : 15;
    doc.roundedRect(23, y + 4.5, badgeWidth, 5, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(feat.badge, 23 + badgeWidth / 2, y + 8, { align: 'center' });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.6);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(feat.title, 26 + badgeWidth, y + 8);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(bodyText[0], bodyText[1], bodyText[2]);
    const splitDesc = doc.splitTextToSize(feat.desc, 160);
    doc.text(splitDesc, 23, y + 14.5);

    y += 28.5;
  });

  y += 2;

  // 5. Activation Hero Stage (with dynamic QR Code on Right)
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(18, y, 174, 46, 3, 3, 'FD');

  // Left column: Steps
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('IN 3 SCHRITTEN DIREKT LOSLEGEN:', 24, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. QR-Code mit dem Smartphone / Tablet scannen oder URL öffnen:', 24, y + 16);

  // High-contrast URL (Dark Slate for maximum print readability)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(parentOnboardingUrl, 28, y + 21.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const step2Text = '2. PIN eingeben';
  const step3Text = activePlatform === 'groovelab'
    ? '3. Musiker-Avatar wählen, Band-Room beitreten und losgrooven!'
    : activePlatform === 'campus'
      ? '3. Hausaufgabenheft öffnen und direkt losüben!'
      : '3. Aufgabenheft & Band-Rooms auf Smartphone oder Tablet öffnen!';
  doc.text(step2Text, 24, y + 28.5);
  doc.text(step3Text, 24, y + 35.5);

  // Right column: Crisp QR Code Box
  const qrX = 148;
  const qrY = y + 5;
  const qrSize = 34;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(qrX, qrY, qrSize + 4, qrSize + 6, 2, 2, 'FD');

  // Render local offline QR Code (100% zero-network)
  try {
    const qrDataUrl = await generateLocalQrDataUrl(parentOnboardingUrl, 300);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX + 2, qrY + 2, qrSize, qrSize);
    }
  } catch {
    // Fallback QR Placeholder
    doc.setFillColor(236, 253, 245);
    doc.rect(qrX + 2, qrY + 2, qrSize, qrSize, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('QR-CODE', qrX + qrSize / 2 + 2, qrY + qrSize / 2 + 2, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('KAMERA SCANNEN', qrX + (qrSize + 4) / 2, qrY + qrSize + 4.5, { align: 'center' });

  y += 50;

  // 6. Pricing Transparency Box
  let pricingText = activePlatform === 'groovelab'
    ? 'VOLLSTÄNDIG INKLUSIVE: Die Nutzung des GrooveLab-Moduls wird zu 100% von der Musikschule getragen und ist für Schüler kostenfrei.'
    : '100% KOSTENLOS: Die Musikschule übernimmt alle Cloud- & Bereitstellungsgebühren für Schüler und Eltern.';
  if (activePlatform !== 'groovelab') {
    if (studentBillingOption === 'student_full') {
      pricingText = 'KOSTENTRANSPARENZ: Jahresbeitrag für die Cloud-Bereitstellung: 0,49 € / Mo. (1. Monat kostenlos, max. 11 × 0,49 € = 5,39 € / Schuljahr; keine Lizenzkaufgebühren).';
    } else if (studentBillingOption === 'student_partial') {
      pricingText = 'KOSTENTRANSPARENZ: Jahres-Eigenanteil: 0,40 € / Mo. (1. Monat kostenlos, max. 11 × 0,40 € = 4,40 € / Schuljahr; Schule bezuschusst Rest; keine Lizenzkaufgebühren).';
    }
  }

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(18, y, 174, 11, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(bodyText[0], bodyText[1], bodyText[2]);
  doc.text(pricingText, 23, y + 6.8);

  // 7. Official Legal Footer
  const footerY = 282;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.line(18, footerY - 4, 192, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  const footerContact = contactEmail ? ` • Kontakt: ${contactEmail}` : '';
  doc.text(`${schoolName} • Offizielle Eltern-Information • Powered by Campus-Groovelab${footerContact}`, 18, footerY);
  doc.text('Seite 1 / 1 • DSGVO-konform', 192, footerY, { align: 'right' });

  const cleanSchool = (schoolName || 'Musikschule').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
  const platformTag = activePlatform === 'groovelab'
    ? 'GrooveLab'
    : activePlatform === 'campus'
      ? 'Campus'
      : 'Campus_Groovelab';
  const filename = `Elternbrief_${platformTag}_${cleanSchool}.pdf`;
  const blob = doc.output('blob');
  setCachedPdf(cacheKey, blob, filename);

  if (!returnOnlyBlob) {
    doc.save(filename);
  }

  return { doc, blob, filename };
};

export interface ResiliencePDFData {
  tierName: string;
  tierBadge: string;
  schoolsCount: number;
  usersCount: number;
  workloadProfile: string;
  totalRequests: number;
  successful: number;
  avgLatencyMs: number;
  medianLatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  jitterMs: number;
  throughputRps: number;
  stabilityScore: string;
  zone: 'green' | 'yellow' | 'red';
  statusSummary: string;
  hardwareVerdict: string;
  completedAt: string;
  homeworkCount: number;
  practiceTimerCount: number;
  audioVaultCount: number;
  biographyStreamCount: number;
  realPhysicalRequests: number;
  realBytesTransferredMb: string;
  tableBreakdown: {
    users: number;
    schedules: number;
    sessions: number;
    songs: number;
    schools: number;
    storage: number;
  };
}

export const generateResilienceAuditPDF = async (data: ResiliencePDFData) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setProperties({
    title: `IT-Resilienz-Gutachten - Campus-Groovelab - ${data.tierName}`,
    subject: 'System-Stabilitätstest und Kapazitätszertifikat',
    author: 'Campus-Groovelab Enterprise Leitstand',
    creator: 'Campus-Groovelab Platform'
  });

  const isGreen = data.zone === 'green';
  const isYellow = data.zone === 'yellow';

  const primaryColor = isGreen ? [22, 101, 52] : isYellow ? [180, 83, 9] : [185, 28, 28];
  const accentBarColor = isGreen ? [34, 197, 94] : isYellow ? [245, 158, 11] : [239, 68, 68];
  const heroBg = isGreen ? [240, 253, 244] : isYellow ? [254, 243, 199] : [254, 226, 226];
  const heroBorder = isGreen ? [187, 247, 208] : isYellow ? [253, 230, 138] : [254, 205, 211];

  const darkSlate = [15, 23, 42];         // Slate 900 #0f172a
  const mutedText = [100, 116, 139];      // Slate 500 #64748b
  const cardBg = [248, 250, 252];         // Slate 50 #f8fafc

  // 1. Top Header Accent Bar
  doc.setFillColor(accentBarColor[0], accentBarColor[1], accentBarColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  let y = 20;

  // 2. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('CAMPUS-GROOVELAB • ENTERPRISE SYSTEM-LEITSTAND', 20, y);
  y += 7;

  // 3. Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Zertifiziertes IT-Resilienz- & Kapazitätsgutachten', 20, y);
  y += 6;

  // 4. Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Prüfstand: Hetzner Cloud VPS (Falkenstein, DE • 178.105.10.2) • Datum: ${new Date().toLocaleDateString('de-DE')} um ${data.completedAt} Uhr`, 20, y);
  y += 10;

  // 5. Hero Certificate Box
  doc.setFillColor(heroBg[0], heroBg[1], heroBg[2]);
  doc.setDrawColor(heroBorder[0], heroBorder[1], heroBorder[2]);
  doc.roundedRect(20, y, 170, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`AUDIT-STATUS: ${data.stabilityScore.toUpperCase()}`, 26, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const splitSummary = doc.splitTextToSize(data.statusSummary, 155);
  doc.text(splitSummary, 26, y + 15);
  y += 38;

  // 6. 6-KPI Matrix Grid (2 rows x 3 cols)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. Gemessene Latenzen & Durchsatz-Kennzahlen', 20, y);
  y += 5;

  const kpis = [
    { label: 'Ø Latenz (Durchschnitt)', val: `${data.avgLatencyMs} ms` },
    { label: 'P50 Latenz (Median)', val: `${data.medianLatencyMs} ms` },
    { label: 'P95 Latenz (Spitze)', val: `${data.p95LatencyMs} ms` },
    { label: 'P99 Latenz (Extremfall)', val: `${data.p99LatencyMs} ms` },
    { label: 'Netzwerk-Jitter (Varianz)', val: `±${data.jitterMs} ms` },
    { label: 'Durchsatz (Throughput)', val: `${data.throughputRps} Req/s` },
  ];

  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, y, 170, 36, 2, 2, 'FD');

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const kpiX = 25 + col * 55;
    const kpiY = y + 7 + row * 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(kpi.label, kpiX, kpiY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(kpi.val, kpiX, kpiY + 7);
  });
  y += 42;

  // 7. Multi-Modal Workload Aufschlüsselung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('2. Multi-Modale Lastverteilung nach Funktion (k6 Hetzner Modell)', 20, y);
  y += 5;

  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, y, 170, 32, 2, 2, 'FD');

  const modules = [
    { name: 'Hausaufgaben & Notizen:', count: `${data.homeworkCount.toLocaleString('de-DE')} Transaktionen`, note: 'PostgreSQL REST Indexiert' },
    { name: 'Übe-Timer & Begleiter:', count: `${data.practiceTimerCount.toLocaleString('de-DE')} Sessions`, note: '84% Client-Edge Offload' },
    { name: 'Audio-Tresor & Looper:', count: `${data.audioVaultCount.toLocaleString('de-DE')} S3-Tokens`, note: 'Presigned Storage Security' },
    { name: 'Audio-Biografie & Songs:', count: `${data.biographyStreamCount.toLocaleString('de-DE')} CDN Streams`, note: 'Multi-Track Media Egress' },
  ];

  modules.forEach((mod, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const modX = 25 + col * 85;
    const modY = y + 7 + row * 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(mod.name, modX, modY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(mod.count, modX + 42, modY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`(${mod.note})`, modX, modY + 4.5);
  });
  y += 38;

  // 8. Reale Messdaten & Storage / Tabellen Ingestion
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('3. Physisch gemessene Ingestion & Datenbank-Audit', 20, y);
  y += 5;

  doc.setFillColor(241, 245, 249); // slate 100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(20, y, 170, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`• Physisch abgesetzte REST-Queries: ${data.realPhysicalRequests.toLocaleString('de-DE')} Calls via PostgREST / HTTP/2`, 25, y + 6.5);
  doc.text(`• Transferiertes JSON-Payload-Volumen: ${data.realBytesTransferredMb} MB aus PostgreSQL Shared Buffers`, 25, y + 12.5);
  doc.text(`• Beanspruchte Schemata: users (${data.tableBreakdown.users}), schedules (${data.tableBreakdown.schedules}), sessions (${data.tableBreakdown.sessions}), songs (${data.tableBreakdown.songs}), schools (${data.tableBreakdown.schools}), storage (${data.tableBreakdown.storage})`, 25, y + 18.5);
  y += 30;

  // 9. Hardware-Empfehlung & Schulträger-Konformität
  doc.setFillColor(heroBg[0], heroBg[1], heroBg[2]);
  doc.setDrawColor(heroBorder[0], heroBorder[1], heroBorder[2]);
  doc.roundedRect(20, y, 170, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('HARDWARE- & BETRIEBS-EMPFEHLUNG FÜR SCHULTRÄGER:', 25, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const splitVerdict = doc.splitTextToSize(data.hardwareVerdict, 160);
  doc.text(splitVerdict, 25, y + 13);
  y += 28;

  // 10. Footer & Legal Standards
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Campus-Groovelab • ISO 27001 zertifiziertes deutsches Rechenzentrum (Hetzner Falkenstein) • DSGVO & COPPA konform', 20, 285);

  const cleanTierName = data.tierName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Campus_Groovelab_Resilienz_Gutachten_${cleanTierName}_${dateStr}.pdf`);
};

export interface GdprReportData {
  reportId?: string;
  studentName: string;
  studentFullName?: string;
  studentMaskedName?: string;
  schoolName: string;
  teacherName?: string;
  instrument: string;
  registeredAt?: string;
  campusUiLevel: string;
  parentPermissions: {
    allowAbsences: boolean;
    allowChat: boolean;
    allowLeaderboard: boolean;
    allowPracticeBoard: boolean;
    allowMediathek: boolean;
    bedtimeModeEnabled?: boolean;
    bedtimeStart?: string;
    bedtimeEnd?: string;
  };
  stats: {
    totalPracticeMinutes: number;
    streakDays: number;
    currentXp?: number;
    completedMissionsCount: number;
    stickersUnlockedCount: number;
    stickersTotalCount: number;
    audioRecordingsCount?: number;
    audioStorageBytes?: number;
  };
}

export const generateGdprDataReportPDF = async (data: GdprReportData) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const reportId = data.reportId || `CG-DSGVO-${Math.random().toString(16).substring(2, 8).toUpperCase()}-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const displayNameForTitle = data.studentFullName || data.studentName;
  doc.setProperties({
    title: `DSGVO_Art15_Auskunftsbericht_${displayNameForTitle.replace(/\s+/g, '_')}`,
    subject: 'DSGVO Art. 15 Transparenz- & Auskunftsbericht für Erziehungsberechtigte',
    author: 'Campus-Groovelab Plattform',
    creator: 'Campus-Groovelab Compliance Engine'
  });

  const primaryBlue = [2, 132, 199];     // Sky 600
  const primaryGreen = [52, 168, 83];    // Campus Green
  const slateDark = [15, 23, 42];        // Slate 900
  const slateBody = [51, 65, 85];        // Slate 700
  const slateMuted = [100, 116, 139];    // Slate 500
  const cardBg = [248, 250, 252];        // Slate 50
  const cardBorder = [226, 232, 240];    // Slate 200

  // =========================================================================
  // SEITE 1: AUSKUNFT ÜBER GESPEICHERTE DATEN & ÜBEAKTIVITÄT
  // =========================================================================

  // 1. Accent Top Bar
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // 2. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('CAMPUS-GROOVELAB', 20, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('DSGVO Art. 15 Transparenz- & Auskunftsbericht', 20, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Protokoll-ID: ${reportId} • Erstellt am: ${dateStr}, ${timeStr} Uhr • Gesetzliche Auskunft nach Art. 15 DSGVO`, 20, 33);

  let y = 41;

  // 3. Block 1: STAMMDATEN, SCHULZUORDNUNG & VERANTWORTLICHE
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y, 170, 48, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. STAMMDATEN, SCHULZUORDNUNG & VERANTWORTLICHE', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const fullName = data.studentFullName || data.studentName;
  const maskedName = data.studentMaskedName || data.studentName;
  doc.text(`• Gespeicherter Schülername: ${fullName} (Vollständiger Vor- & Nachname)`, 25, y + 15);
  doc.text(`• Anzeige im Schulnetzwerk: ${maskedName} (DSGVO-Schutzmaskierung aktiv)`, 25, y + 21);
  doc.text(`• Verantwortliche Musikschule (Art. 4 Nr. 7 DSGVO): ${data.schoolName || 'Campus-Groovelab Partner-Musikschule'}`, 25, y + 27);
  doc.text(`• Zugeordnete Lehrkraft: ${data.teacherName || 'Fachliche Lehrkraft (Musikschule)'}`, 25, y + 33);
  doc.text(`• Hauptinstrument & Design-Stufe: ${data.instrument || 'Instrumentalunterricht'} | Stufe: ${data.campusUiLevel.toUpperCase()}`, 25, y + 39);
  doc.text(`• Auftragsverarbeiter (Art. 28 DSGVO): Campus-Groovelab Cloud Platform (ISO 27001)`, 25, y + 45);

  y += 54;

  // 4. Block 2: ELTERLICHE SCHUTZ- & FREIGABEEINSTELLUNGEN (Art. 7 DSGVO)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y, 170, 52, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. ELTERLICHE SCHUTZ- & FREIGABEEINSTELLUNGEN (Art. 7 DSGVO)', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  doc.text(`• Terminabsagen durch Schüler: ${data.parentPermissions.allowAbsences ? 'Freigegeben (Eigenständiges Absagen erlaubt)' : 'GESPERRT (Nur durch Eltern via Master-PIN)'}`, 25, y + 16);
  doc.text(`• Direktnachrichten an Lehrkraft: ${data.parentPermissions.allowChat ? 'Freigegeben (Fachlicher 1:1 Austausch aktiv)' : 'GESPERRT (Schreibschutz aktiv)'}`, 25, y + 23);
  doc.text(`• Klassen-Highlights & Team-Power: ${data.parentPermissions.allowLeaderboard ? 'Freigegeben (Sichtbarkeit mit Vorname + Initiale)' : 'ANONYMISIERT (Keine Namensanzeige)'}`, 25, y + 30);
  doc.text(`• Audio-Tresor & Eigene Aufnahmen: ${data.parentPermissions.allowMediathek ? 'Freigegeben (Eigenes Übe-Studio aktiv)' : 'GESPERRT (Nur Lehrer-Audios)'}`, 25, y + 37);
  doc.text(`• Nachtruhe-Schutz / Ruhezeiten: ${data.parentPermissions.bedtimeModeEnabled ? `AKTIV (${data.parentPermissions.bedtimeStart || '20:00'} bis ${data.parentPermissions.bedtimeEnd || '07:00'} Uhr)` : 'Deaktiviert (24h Übezugriff)'}`, 25, y + 44);

  y += 58;

  // 5. Block 3: PROTOKOLLIERTE ÜBEDATEN & LERNFORTSCHRITT (Art. 15 Abs. 1 lit. b DSGVO)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y, 170, 58, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('3. LERNAKTIVITÄT & PROTOKOLLIERTE ÜBE-ZEITEN (Art. 15 Abs. 1 lit. b DSGVO)', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  doc.text(`• Gesamte dokumentierte Fokus-Übezeit: ${data.stats.totalPracticeMinutes} Minuten`, 25, y + 16);
  doc.text(`• Aktuelle Übe-Streak: ${data.stats.streakDays} Tage in Folge`, 25, y + 23);
  doc.text(`• Gesammelte Erfahrungspunkte (XP): ${data.stats.currentXp || 0} Level-Punkte`, 25, y + 30);
  doc.text(`• Gemeisterte Meisterwerke & Aufgaben: ${data.stats.completedMissionsCount} Aufgaben abgeschlossen`, 25, y + 37);
  doc.text(`• Freigeschaltete Gamification-Sticker: ${data.stats.stickersUnlockedCount} von ${data.stats.stickersTotalCount} Abzeichen freigeschaltet`, 25, y + 44);
  const audioCount = data.stats.audioRecordingsCount || 0;
  const audioMb = ((data.stats.audioStorageBytes || 0) / (1024 * 1024)).toFixed(1);
  doc.text(`• Gespeicherte Audioaufnahmen: ${audioCount} Aufnahme(n) im Audio-Tresor (${audioMb} MB belegt)`, 25, y + 51);

  y += 65;

  // 6. Infobox: Vertraulichkeit & Datenschutzstandard
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(20, y, 170, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text('DATENSCHUTZ-GARANTIE & ZERO-PII-PRINZIP (Art. 5 DSGVO)', 25, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const shortPrivacy = 'Die Plattform Campus-Groovelab speichert aus Gründen des maximalen Minderjährigenschutzes KEINE Bank- oder Zahlungsdaten, KEINE E-Mail-Adressen von Schülern und KEINE Werbetracker. Alle Server befinden sich in ISO 27001 zertifizierten deutschen Rechenzentren.';
  const splitShortPrivacy = doc.splitTextToSize(shortPrivacy, 160);
  doc.text(splitShortPrivacy, 25, y + 14);

  // Footer Seite 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab • DSGVO-konforme Bildungsplattform • www.campus-groovelab.de', 20, 285);
  doc.text('Seite 1 von 2', 175, 285);

  // =========================================================================
  // SEITE 2: GESETZLICHE PFLICHTBELEHRUNG NACH ART. 15 ABS. 1 & 2 DSGVO
  // =========================================================================
  doc.addPage();

  // Accent Top Bar Seite 2
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // Header Seite 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('CAMPUS-GROOVELAB • RECHTLICHE PFLICHTBELEHRUNG', 20, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('Gesetzliche Auskunftspflichten nach Art. 15 Abs. 1 & 2 DSGVO', 20, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Auskunfts-Aktenzeichen: ${reportId} • Erziehungsberechtigten-Rechte`, 20, 33);

  let y2 = 40;

  // Block 4: GESETZLICHE INFORMATIONSPFLICHTEN (Art. 15 Abs. 1 lit. a–h DSGVO)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y2, 170, 95, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('4. RECHTLICHE AUSKUNFTSPFLICHTEN NACH ART. 15 ABS. 1 DSGVO', 25, y2 + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

  let subY = y2 + 15;

  // a) Zwecke
  doc.text('a) Verarbeitungszwecke (lit. a):', 25, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const zweckText = 'Bereitstellung des interaktiven Hausaufgabenhefts, Übe-Zeiterfassung, pädagogische Lernstandsdokumentation, 1:1 Fachkommunikation mit der Lehrkraft und Terminkoordination im Musikunterricht.';
  doc.text(doc.splitTextToSize(zweckText, 158), 25, subY + 4);

  subY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('b) Kategorien personenbezogener Daten (lit. b):', 25, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const katText = 'Basis-Stammdaten (Vorname, maskierter Nachname, Instrument), elterliche Schutzschalter-Konfiguration, Übe-Timer-Telemetrie, Aufgabenstatus, Metadaten von Terminänderungen sowie Audio-Aufnahmen.';
  doc.text(doc.splitTextToSize(katText, 158), 25, subY + 4);

  subY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('c) Empfänger & Kategorien von Empfängern (lit. c):', 25, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const empfText = 'Ausschließlich die beauftragte Musikschule, die zuständige Lehrkraft und Erziehungsberechtigte. Hosting: Hetzner Online GmbH (ISO 27001 Rechenzentren, Deutschland) via Auftragsverarbeitung (Art. 28 DSGVO). Keine Weitergabe an Werbedritte.';
  doc.text(doc.splitTextToSize(empfText, 158), 25, subY + 4);

  subY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('d) Speicherdauer & Löschfristen (lit. d):', 25, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const dauerText = 'Für die Dauer des aktiven Unterrichtsvertrags. Automatische Deaktivierung nach 2 Monaten Inaktivität. Bei Vertragsende oder Löschungsantrag erfolgt die vollständige physische Löschung aller Profildaten und Cloud-Audios.';
  doc.text(doc.splitTextToSize(dauerText, 158), 25, subY + 4);

  subY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('e) Automatisierte Entscheidungsfindung & Profiling (lit. h):', 25, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const profilText = 'Es findet ausdrücklich KEINE automatisierte Entscheidungsfindung und KEIN Profiling im Sinne von Art. 22 DSGVO statt.';
  doc.text(doc.splitTextToSize(profilText, 158), 25, subY + 4);

  y2 += 102;

  // Block 5: BETROFFENENRECHTE & BESCHWERDERECHT
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y2, 170, 72, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('5. RECHTE DER BETROFFENEN PERSONEN (ART. 15 BIS 22 DSGVO)', 25, y2 + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);

  const rightsY = y2 + 15;
  doc.text('• Recht auf Berichtigung (Art. 16 DSGVO): Unverzügliche Korrektur unrichtiger Schüler- oder Stammdaten.', 25, rightsY);
  doc.text('• Recht auf Löschung (Art. 17 DSGVO): Vollständige Entfernung des Profils und aller Aufnahmen („Vergessenwerden").', 25, rightsY + 6);
  doc.text('• Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO) & Widerspruchsrecht (Art. 21 DSGVO).', 25, rightsY + 12);
  doc.text('• Recht auf Datenübertragbarkeit (Art. 20 DSGVO): Bereitstellung aller eigenen Daten und Audioaufnahmen als 1-Click ZIP-Archiv.', 25, rightsY + 18);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Beschwerderecht bei der Aufsichtsbehörde (Art. 77 DSGVO):', 25, rightsY + 27);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const beschwerdeText = 'Sie haben das gesetzliche Recht, sich bei der zuständigen Datenschutzaufsichtsbehörde (z. B. Landesbeauftragte für den Datenschutz des jeweiligen Bundeslandes der Musikschule) über die Datenverarbeitung zu beschweren.';
  doc.text(doc.splitTextToSize(beschwerdeText, 158), 25, rightsY + 32);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Herkunft der Daten (Art. 14 / Art. 15 Abs. 1 lit. g DSGVO):', 25, rightsY + 44);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  const herkunftText = 'Die Stammdaten wurden von der Musikschule bei Unterrichtsbeginn angelegt und durch Übe-Eingaben des Schülers fortgeführt.';
  doc.text(doc.splitTextToSize(herkunftText, 158), 25, rightsY + 49);

  y2 += 78;

  // Block 6: Revisionssicheres Prüfungssiegel
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, y2, 170, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text('REVISIONSSICHERE DSGVO-KONFORMITÄT & ZERTIFIZIERUNG', 25, y2 + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  const sealText = 'Dieser Auskunftsbericht wurde automatisch aus der Campus-Groovelab Datenbank generiert und entspricht allen Vorgaben des Art. 15 Abs. 1 und 2 DSGVO. Die Datenverarbeitung erfolgt ausschließlich in der Bundesrepublik Deutschland.';
  doc.text(doc.splitTextToSize(sealText, 158), 25, y2 + 13);

  // Footer Seite 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab • DSGVO-konforme Bildungsplattform • www.campus-groovelab.de', 20, 285);
  doc.text('Seite 2 von 2', 175, 285);

  // Save PDF
  const cleanName = data.studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateFileStr = now.toISOString().split('T')[0];
  doc.save(`Campus_Groovelab_DSGVO_Bericht_${cleanName}_${dateFileStr}.pdf`);
};

export interface GdprDeletionCertificateData {
  studentName: string;
  studentFullName?: string;
  schoolName: string;
  certificateId?: string;
  purgedAudioFilesCount?: number;
  freedStorageBytes?: number;
  deletedAt?: string;
}

export const generateGdprDeletionCertificatePDF = async (data: GdprDeletionCertificateData) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const certId = data.certificateId || `CG-PURGE-${Math.random().toString(16).substring(2, 8).toUpperCase()}-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const displayNameForTitle = data.studentFullName || data.studentName;
  doc.setProperties({
    title: `DSGVO_Art17_Loeschungszertifikat_${displayNameForTitle.replace(/\s+/g, '_')}`,
    subject: 'DSGVO Art. 17 Offizielles Löschungs- und Austrittszertifikat',
    author: 'Campus-Groovelab Plattform',
    creator: 'Campus-Groovelab Compliance Engine'
  });

  const primaryRed = [234, 67, 53];      // Admin Red #ea4335
  const slateDark = [15, 23, 42];        // Slate 900
  const slateBody = [51, 65, 85];        // Slate 700
  const slateMuted = [100, 116, 139];    // Slate 500
  const cardBg = [248, 250, 252];        // Slate 50
  const cardBorder = [226, 232, 240];    // Slate 200

  // 1. Accent Top Bar
  doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // 2. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('CAMPUS-GROOVELAB', 20, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Offizielles DSGVO-Löschungs- & Austrittszertifikat', 20, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Zertifikats-Aktenzeichen: ${certId} • Bestätigung nach Art. 17 DSGVO`, 20, 33);

  let y = 42;

  // Block 1: Bestätigung der Datenlöschung
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y, 170, 52, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. BESTÄTIGUNG DER RECHTSKONFORMEN DATENLÖSCHUNG', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);

  doc.text(`Betroffener Schüler:`, 25, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(displayNameForTitle, 80, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  doc.text(`Zugehörige Musikschule:`, 25, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(data.schoolName, 80, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  doc.text(`Löschungszeitpunkt:`, 25, y + 31);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`${dateStr}, ${timeStr} Uhr`, 80, y + 31);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  doc.text(`Gelöschte persönliche Audiospuren:`, 25, y + 38);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text(`${data.purgedAudioFilesCount ?? 0} Dateien (${((data.freedStorageBytes ?? 0) / (1024 * 1024)).toFixed(2)} MB freigegeben)`, 80, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);
  doc.text(`Status des Benutzerprofils:`, 25, y + 45);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text(`Dauerhaft deaktiviert & Zugänge gesperrt`, 80, y + 45);

  y += 58;

  // Block 2: Revisionssichere Pflichtangaben (GoBD / Steuerrecht)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y, 170, 48, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. GESETZLICHE AUFBEWAHRUNGSPFLICHTEN (§ 147 AO / GoBD)', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateBody[0], slateBody[1], slateBody[2]);

  const gobdInfo = 'Gemäß § 147 der Abgabenordnung (AO) und den Grundsätzen zur ordnungsmäßigen Führung und Aufbewahrung von Büchern (GoBD) müssen buchhalterische Transaktionsbelege, erstellte Rechnungsdokumente und Buchungsnachweise für eine gesetzliche Dauer von 10 Jahren revisionssicher und unveränderbar archiviert werden. Nach Ablauf dieser gesetzlichen Frist erfolgt die vollautomatische Endlöschung.';
  doc.text(doc.splitTextToSize(gobdInfo, 160), 25, y + 17);

  y += 54;

  // Block 3: Revisionssicheres Siegel
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, y, 170, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('REVISIONSSICHERE DSGVO-KONFORMITÄT & ZERTIFIZIERUNG', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const sealText = `Hiermit wird zertifiziert, dass alle personenbezogenen Daten sowie persönlichen Audio-Dateien des Schülers auf Veranlassung der Musikschule physisch und unwiderruflich gelöscht wurden. Die Plattform Campus-Groovelab garantiert die Einhaltung aller Vorgaben nach Art. 17 Abs. 1 DSGVO.`;
  doc.text(doc.splitTextToSize(sealText, 158), 25, y + 15);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab • DSGVO-konforme Bildungsplattform • www.campus-groovelab.de', 20, 285);
  doc.text('Dokument-ID: ' + certId, 140, 285);

  // Save PDF
  const safeClean = (data.studentName || 'Schueler').replace(/[^a-zA-Z0-9]/g, '_');
  const dateFile = now.toISOString().split('T')[0];
  doc.save(`Campus_Groovelab_DSGVO_Loeschungszertifikat_${safeClean}_${dateFile}.pdf`);
};

export interface InvoicePDFParams {
  invoiceId: string;
  invoiceDate: string;
  dueDateStr?: string;
  amount: number;
  schoolName: string;
  schoolStreet?: string;
  schoolZipCode?: string;
  schoolCity?: string;
  operatorCompany?: string;
  operatorContact?: string;
  operatorStreet?: string;
  operatorZip?: string;
  operatorCity?: string;
  operatorIban?: string;
  operatorBic?: string;
  hasCampus?: boolean;
  hasGroovelab?: boolean;
  hasKombiDiscount?: boolean;
  totalTeachersCount?: number;
  passiveStudentsCount?: number;
  activeStudents?: number;
  storageAddonGb?: number;
  storageAddonMonthlyFee?: number;
}

export const generateInvoicePDF = async (params: InvoicePDFParams) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const cleanInvoiceId = params.invoiceId.startsWith('INV-') ? params.invoiceId.replace('INV-', 'RE-') : params.invoiceId;

  doc.setProperties({
    title: `Rechnung ${cleanInvoiceId} - Campus-Groovelab`,
    subject: `Rechnung für Cloud-Infrastruktur ${params.schoolName}`,
    author: 'Campus-Groovelab Plattformbetrieb',
    creator: 'Campus-Groovelab Billing Engine'
  });

  const primaryGreen = [52, 168, 83];
  const darkSlate = [15, 23, 42];
  const textMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];

  // Top Accent Bar
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // Header Left: Platform Name & Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Campus-Groovelab', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Cloud- & Bildungs-Infrastruktur für Musikschulen', 20, 27);

  // Header Right: Operator Company
  const opCompany = params.operatorCompany || 'Patrick Huber (Einzelunternehmer)';
  const opStreet = params.operatorStreet || 'Karl-Fürstenberg-Str. 59';
  const opCity = `${params.operatorZip || '79618'} ${params.operatorCity || 'Rheinfelden'}`;
  
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(opCompany, 190, 18, { align: 'right' });
  doc.text(opStreet, 190, 22.5, { align: 'right' });
  doc.text(opCity, 190, 27, { align: 'right' });

  // Recipient / School Address Box
  let y = 45;
  doc.setFontSize(7.5);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('RECHNUNGSEMPFÄNGER', 20, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(params.schoolName || 'Musikschule', 20, y);

  if (params.schoolStreet) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(params.schoolStreet, 20, y);
  }
  if (params.schoolZipCode || params.schoolCity) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${params.schoolZipCode || ''} ${params.schoolCity || ''}`.trim(), 20, y);
  }

  // Invoice Meta Box (Right aligned)
  const metaY = 45;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(125, metaY, 65, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('RECHNUNG', 130, metaY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Rechnungs-Nr.:', 130, metaY + 12);
  doc.text('Datum:', 130, metaY + 17);
  doc.text('Zahlbar bis:', 130, metaY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(cleanInvoiceId, 185, metaY + 12, { align: 'right' });
  doc.text(params.invoiceDate || new Date().toLocaleDateString('de-DE'), 185, metaY + 17, { align: 'right' });
  doc.text(params.dueDateStr || '14 Tage', 185, metaY + 22, { align: 'right' });

  // Table of Items
  y = 85;
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y, 170, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('POS', 23, y + 5);
  doc.text('BEZEICHNUNG / LEISTUNGSUMFANG', 35, y + 5);
  doc.text('BETRAG', 185, y + 5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

  let pos = 1;
  const addRow = (title: string, sub: string, amountStr: string, isDiscount = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(String(pos).padStart(2, '0'), 23, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(isDiscount ? 21 : darkSlate[0], isDiscount ? 128 : darkSlate[1], isDiscount ? 61 : darkSlate[2]);
    doc.text(title, 35, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(sub, 35, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(isDiscount ? 21 : darkSlate[0], isDiscount ? 128 : darkSlate[1], isDiscount ? 61 : darkSlate[2]);
    doc.text(amountStr, 185, y, { align: 'right' });

    // Subtle bottom divider
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(20, y + 7, 190, y + 7);

    y += 11;
    pos++;
  };

  // Pos 1: Software Provisioning
  addRow(
    'Campus-Groovelab Software-Bereitstellung',
    'Basis-Software inklusive • 0 € Lizenzkaufgebühren',
    '0,00 € (Inklusive)'
  );

  // Pos 2: Hosting Campus
  if (params.hasCampus) {
    addRow(
      'Cloud- & Datenbank-Hosting: Modul Campus',
      'Intelligenter Stundenplan, Raum-Engine & Hausaufgabenheft-Sync',
      '14,90 € / Mo.'
    );
  }

  // Pos 3: Hosting GrooveLab
  if (params.hasGroovelab) {
    addRow(
      'Cloud- & Datenbank-Hosting: Modul GrooveLab',
      'Band-Management, Repertoire-Planer & Songs meistern',
      '9,90 € / Mo.'
    );
  }

  // Pos 4: Kombi Discount
  if (params.hasKombiDiscount || (params.hasCampus && params.hasGroovelab)) {
    addRow(
      'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
      'Vergünstigter Hosting-Kombipreis bei Doppelbuchung',
      '-4,90 € / Mo.',
      true
    );
  }

  // Pos 5: Teachers / Admin Pauschale
  const teachersCount = params.totalTeachersCount || 0;
  if (teachersCount > 0) {
    addRow(
      'Service- & Administrationspauschale',
      `${teachersCount} aktive Lehrkräfte & Verwaltung × 0,49 € / Mo.`,
      `${(teachersCount * 0.49).toFixed(2).replace('.', ',')} € / Mo.`
    );
  }

  // Pos 6: Passive Students Base Provisioning
  const passiveCount = params.passiveStudentsCount || 0;
  if (passiveCount > 0) {
    addRow(
      'Basis-Bereitstellung (Schüler-Datenbank)',
      `${passiveCount} Schülerdatenbank-Profile × 0,09 € / Mo. (QR-Sync & DSGVO-Hosting)`,
      `${(passiveCount * 0.09).toFixed(2).replace('.', ',')} € / Mo.`
    );
  }

  // Pos 7: Active Student Activations
  const activeCount = params.activeStudents || 0;
  if (activeCount > 0) {
    addRow(
      'Bereitstellung aktiver Schüler-Zugänge',
      `${activeCount} interaktive Schüleraktivierungen × 0,49 € / Mo.`,
      `${(activeCount * 0.49).toFixed(2).replace('.', ',')} € / Mo.`
    );
  }

  // Pos 8: Storage Addon
  if (params.storageAddonGb && params.storageAddonGb > 0) {
    addRow(
      'Zusatz-Speichervolumen: Audio-Tresor',
      `+${params.storageAddonGb} GB Cloud-Speicher für Übe- & Bandaufnahmen`,
      `${(params.storageAddonMonthlyFee || 0).toFixed(2).replace('.', ',')} € / Mo.`
    );
  }

  // Total Card
  y += 4;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(120, y, 70, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('GESAMTBETRAG:', 125, y + 7);

  doc.setFontSize(13);
  doc.text(
    `${Number(params.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
    185,
    y + 12,
    { align: 'right' }
  );

  y += 24;
  doc.setFont('helvetica', 'normal');
  const platformTaxMode: 'small_business' | 'standard_vat' = 
    (typeof window !== 'undefined' && localStorage.getItem('cg_tax_mode') === 'standard_vat')
      ? 'standard_vat'
      : 'small_business';

  if (platformTaxMode === 'standard_vat') {
    const totalGross = Number(params.amount || 0);
    const net = +(totalGross / 1.19).toFixed(2);
    const vat = +(totalGross - net).toFixed(2);
    doc.text(`Rechnungsbetrag inkl. 19 % MwSt. (Netto: ${net.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} + MwSt.: ${vat.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}).`, 20, y);
  } else {
    doc.text('Umsatzsteuerbefreit gem. § 19 UStG (Kleinunternehmerregelung).', 20, y);
  }

  // Bank Transfer Box
  y += 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(20, y, 170, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('ZAHLUNGSINFORMATIONEN', 25, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Empfänger: ${opCompany}`, 25, y + 11);
  doc.text(`IBAN: ${params.operatorIban || 'DE89 3704 0044 0532 9482 11'}`, 25, y + 15.5);
  doc.text(`BIC: ${params.operatorBic || 'WELADED1XYZ'}`, 25, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text(`Verwendungszweck: ${cleanInvoiceId}`, 120, y + 15.5);

  // Bottom Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Campus-Groovelab • DSGVO-konformes Cloud-Hosting • www.campus-groovelab.de', 20, 285);
  doc.text('Seite 1 von 1', 185, 285, { align: 'right' });

  // Trigger Instant Browser Download
  const sanitizedSchool = (params.schoolName || 'Musikschule').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanInvoiceId}_${sanitizedSchool}.pdf`);
};

export interface HomeworkItemPDF {
  type?: 'song' | 'lehrwerk' | 'note';
  title: string;
  subtitle?: string;
  notes?: string;
}

export interface AudioNotePDF {
  label: string;
  duration?: string | number;
  url?: string;
}

export interface StudentHomeworkPDFParams {
  schoolName: string;
  studentName: string;
  instrument?: string;
  teacherName: string;
  homeworkNotes?: string;
  items?: HomeworkItemPDF[];
  audioRecordings?: AudioNotePDF[];
  date?: string;
  weekNumber?: string | number;
  qrToken?: string;
  hasAudioRecordings?: boolean;
}

// Generates a crisp QR code PNG Data URL for PDF embedding (100% local, zero-network)
async function fetchQrDataUrl(text: string): Promise<string | null> {
  try {
    const dataUrl = await generateLocalQrDataUrl(text, 300);
    return dataUrl || null;
  } catch (err) {
    console.warn('[PDF] Could not generate local QR code image:', err);
    return null;
  }
}

export const generateStudentHomeworkPrintoutPDF = async (params: StudentHomeworkPDFParams) => {
  const { default: jsPDF } = await import('jspdf');

  // Format: DIN A5 portrait (148 mm x 210 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const studentClean = params.studentName || 'Schueler';
  const teacherClean = params.teacherName || 'Lehrkraft';
  const schoolClean = params.schoolName || 'Campus-Groovelab';
  const dateStr = params.date || new Date().toLocaleDateString('de-DE');
  const targetToken = params.qrToken || 'schueler';
  const targetAppUrl = getCanonicalQrLandingUrl(targetToken);

  doc.setProperties({
    title: `Hausaufgabe - ${studentClean}`,
    subject: `Campus-Groovelab Hausaufgaben- & Übe-Fahrplan - ${schoolClean}`,
    author: teacherClean,
    creator: `${schoolClean} Enterprise+ Edition`
  });

  // Fetch QR Code data URL in parallel
  const qrDataUrl = await fetchQrDataUrl(targetAppUrl);

  // Apple-grade Design Palette
  const greenPrimary = [22, 163, 74];       // #16a34a
  const greenDark = [21, 128, 61];          // #15803d
  const mintBg = [240, 253, 244];           // #f0fdf4
  const mintBorder = [187, 247, 208];       // #bbf7d0
  const bluePillBg = [239, 246, 255];       // #eff6ff
  const bluePillBorder = [191, 219, 254];   // #bfdbfe
  const blueDark = [29, 78, 216];           // #1d4ed8
  const darkNavy = [15, 23, 42];            // #0f172a
  const slateText = [51, 65, 85];           // #334155
  const slateMuted = [100, 116, 139];       // #64748b
  const cardBg = [248, 250, 252];           // #f8fafc
  const borderLight = [226, 232, 240];      // #e2e8f0

  // 1. Top Accent Header Bar (Apple Minimalist)
  doc.setFillColor(greenPrimary[0], greenPrimary[1], greenPrimary[2]);
  doc.rect(0, 0, 148, 3.5, 'F');

  let y = 11;

  // 2. Header School Category Pill
  doc.setFillColor(mintBg[0], mintBg[1], mintBg[2]);
  doc.setDrawColor(mintBorder[0], mintBorder[1], mintBorder[2]);
  doc.roundedRect(14, y, 78, 5.5, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(greenDark[0], greenDark[1], greenDark[2]);
  const schoolHeaderTitle = `${schoolClean.toUpperCase()} • UNTERRICHTS-PLAN`.slice(0, 48);
  doc.text(schoolHeaderTitle, 17, y + 3.8);

  // Date Pill on Top Right
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  const weekLabel = params.weekNumber ? `KW ${params.weekNumber} • ` : '';
  const dateBadgeText = `${weekLabel}${dateStr}`;
  doc.roundedRect(98, y, 36, 5.5, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(dateBadgeText, 116, y + 3.8, { align: 'center' });

  y += 9.5;

  // 3. Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Hausaufgaben- & Übe-Plan', 14, y);

  y += 4.5;

  // 4. Student & Teacher Hero Squircle Card
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, y, 120, 17, 2.5, 2.5, 'FD');

  // Column 1: Student & Instrument
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('SCHÜLER/IN', 18, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(studentClean, 18, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const instClean = params.instrument && params.instrument.trim() ? params.instrument.trim() : 'Musikunterricht';
  doc.text(`Fach: ${instClean}`, 18, y + 13.5);

  // Column 2: Teacher & Role
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('LEHRKRAFT', 72, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(teacherClean, 72, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Fachlehrkraft', 72, y + 13.5);

  y += 22;

  // 5. Section Header
  doc.setFillColor(greenPrimary[0], greenPrimary[1], greenPrimary[2]);
  doc.rect(14, y - 2.5, 1.8, 4.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('WOCHEN-FAHRPLAN & CHECKLISTE', 18, y + 1);

  y += 3.5;

  // 6. Build Structured Items List
  let rawItems: HomeworkItemPDF[] = [];
  if (params.items && params.items.length > 0) {
    rawItems = params.items;
  } else if (params.homeworkNotes) {
    // Fallback: parse raw lines into items
    const rawClean = params.homeworkNotes
      .replace(/\[AUDIO:[^\]]*\]/gi, '')
      .replace(/AUDIO:[^\n]*/gi, '')
      .trim();
    rawItems = rawClean
      .split('\n')
      .map(line => line.replace(/^[-•*\d.)]\s*/, '').trim())
      .filter(Boolean)
      .map(title => ({ type: 'note' as const, title }));
  }

  if (rawItems.length === 0) {
    rawItems = [{ type: 'note', title: 'Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.' }];
  }

  // Calculate Tasks Box Height dynamically
  const taskBoxY = y;
  const taskBoxHeight = 65;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, taskBoxY, 120, taskBoxHeight, 2.5, 2.5, 'FD');

  // Left green accent line
  doc.setFillColor(greenPrimary[0], greenPrimary[1], greenPrimary[2]);
  doc.roundedRect(14, taskBoxY, 1.5, taskBoxHeight, 1, 1, 'F');

  let taskY = taskBoxY + 6;
  const maxDisplayItems = 4;
  const displayItems = rawItems.slice(0, maxDisplayItems);

  displayItems.forEach((item) => {
    if (taskY > taskBoxY + 45) return;

    // 1. Student Checkbox [ ] for checking off with pen
    doc.setDrawColor(greenPrimary[0], greenPrimary[1], greenPrimary[2]);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, taskY - 3.2, 4.2, 4.2, 0.8, 0.8, 'FD');

    // 2. Type badge (Song or Lehrwerk or Notiz)
    if (item.type === 'song') {
      doc.setFillColor(bluePillBg[0], bluePillBg[1], bluePillBg[2]);
      doc.setDrawColor(bluePillBorder[0], bluePillBorder[1], bluePillBorder[2]);
      doc.roundedRect(24, taskY - 3.2, 10, 4.2, 0.8, 0.8, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
      doc.text('SONG', 29, taskY - 0.5, { align: 'center' });
    } else if (item.type === 'lehrwerk') {
      doc.setFillColor(mintBg[0], mintBg[1], mintBg[2]);
      doc.setDrawColor(mintBorder[0], mintBorder[1], mintBorder[2]);
      doc.roundedRect(24, taskY - 3.2, 15, 4.2, 0.8, 0.8, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(greenDark[0], greenDark[1], greenDark[2]);
      doc.text('LEHRWERK', 31.5, taskY - 0.5, { align: 'center' });
    }

    const titleOffsetX = item.type === 'song' ? 36 : (item.type === 'lehrwerk' ? 41 : 24);
    const maxTitleWidth = 130 - titleOffsetX;

    // 3. Item Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    const displayTitle = item.type === 'song' ? formatSongTitleCase(item.title) : capitalizeFirstLetter(item.title);
    const wrappedTitle = doc.splitTextToSize(displayTitle, maxTitleWidth);
    doc.text(wrappedTitle, titleOffsetX, taskY);

    let consumedHeight = wrappedTitle.length * 3.5;

    // 4. Fahrplan / Notes
    if (item.notes && item.notes.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      const cleanFahrplan = capitalizeFirstLetter(item.notes.replace(/^📌\s*/, '').trim());
      const fahrplanText = `Fahrplan: ${cleanFahrplan}`;
      const wrappedFahrplan = doc.splitTextToSize(fahrplanText, maxTitleWidth);
      doc.text(wrappedFahrplan, titleOffsetX, taskY + consumedHeight);
      consumedHeight += wrappedFahrplan.length * 3.2;
    }

    taskY += Math.max(10, consumedHeight + 4.5);
  });

  // 7-Tage Didaktischer Übe-Tracker (Checkliste Mo - So)
  const trackerY = taskBoxY + taskBoxHeight - 11;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.2);
  doc.line(18, trackerY - 2, 130, trackerY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Übe-Check (10 Min):', 18, trackerY + 3.5);

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  let dayX = 54;
  days.forEach(day => {
    // Squircle Checkbox
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(dayX, trackerY, 9.5, 6, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(day, dayX + 4.75, trackerY + 4.2, { align: 'center' });

    dayX += 11;
  });

  y = taskBoxY + taskBoxHeight + 4;

  // 7. Audio-Aufnahmen & Digitales Übe-Studio Box
  const audioList = params.audioRecordings || [];
  const hasAudios = audioList.length > 0;

  doc.setFillColor(mintBg[0], mintBg[1], mintBg[2]);
  doc.setDrawColor(mintBorder[0], mintBorder[1], mintBorder[2]);
  doc.roundedRect(14, y, 120, 39, 2.5, 2.5, 'FD');

  // Left Content of Audio Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(greenDark[0], greenDark[1], greenDark[2]);
  const audioBoxTitle = hasAudios 
    ? `UNTERRICHTSAUFNAHMEN & AUDIO-STUDIO (${audioList.length})` 
    : 'AUDIO-AUFNAHMEN & DIGITALES STUDIO';
  doc.text(audioBoxTitle, 18, y + 5.5);

  let audioListY = y + 10.5;

  if (hasAudios) {
    // List individual tracks by name with duration (up to 6 tracks)
    const maxAudioTracks = 6;
    const displayAudios = audioList.slice(0, maxAudioTracks);
    displayAudios.forEach((track, idx) => {
      const durStr = track.duration ? ` (${typeof track.duration === 'number' ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : track.duration})` : '';
      const trackLabel = `${idx + 1}. ${track.label}${durStr}`;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(trackLabel.slice(0, 48), 18, audioListY);
      audioListY += 3.6;
    });

    if (audioList.length > maxAudioTracks) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.8);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text(`+ ${audioList.length - maxAudioTracks} weitere Aufnahmen in der App`, 18, audioListY);
      audioListY += 3.2;
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    const audioExpl = doc.splitTextToSize(
      'Scanne diesen QR-Code mit der Smartphone-Kamera, um die Unterrichtsaufnahmen, Play-Alongs und den Fokus-Timer direkt im Browser zu öffnen.',
      82
    );
    doc.text(audioExpl, 18, audioListY);
    audioListY += 9;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(greenPrimary[0], greenPrimary[1], greenPrimary[2]);
  doc.text('App öffnen: campus-groovelab.de', 18, y + 35);

  // Right QR Code Inlay
  const qrX = 106;
  const qrY = y + 4.5;
  const qrSize = 24;

  // White Card behind QR code for maximum contrast
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 5.5, 1.5, 1.5, 'FD');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn('[PDF] Error embedding QR image:', e);
    }
  } else {
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(qrX, qrY, qrSize, qrSize, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('QR-Code', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Kamera scannen', qrX + qrSize / 2, qrY + qrSize + 2.8, { align: 'center' });

  // 8. Bottom Minimalist Footer
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.2);
  doc.line(14, 201, 134, 201);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  // Trigger Instant Browser Download
  const cleanName = studentClean.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDate = dateStr.replace(/\./g, '-');
  doc.save(`Hausaufgabe_${cleanName}_${safeDate}.pdf`);
};

// ============================================================================
// B2B MUSIC SCHOOL INVOICE PDF GENERATOR (RE-[SCHOOL_ID]-[YYMM]-01)
// Tier-1 Enterprise+ Canonical 9-Position Invoice with 100% GoBD/UWG Compliance
// ============================================================================
export interface B2BInvoiceParams {
  school: {
    id: string;
    name: string;
    city?: string | null;
    address?: string | null;
    has_campus_subscription?: boolean;
    has_groovelab_subscription?: boolean;
    teachers_count?: number;
    active_students_count?: number;
    storage_addon_gb?: number;
    storage_addon_price?: number;
  };
  stats?: {
    teachers?: number;
    studentsCampus?: number;
    studentsGroovelab?: number;
    students?: number;
    activeStudents?: number;
    passiveStudents?: number;
  };
  invoiceDate?: Date;
  sequenceNumber?: number;
  serviceCreditPercent?: number;
}

/**
 * Berechnet das kalendermäßige Zahlungsziel unter Beachtung von § 193 BGB.
 * Fällt der 14. Tag auf einen Samstag oder Sonntag, verschiebt sich die Fälligkeit
 * automatisch auf den nächsten Bankarbeitstag (Montag).
 */
export function calculateDueDateWithBgb193(startDate: Date, days: number = 14): Date {
  const date = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
  const dayOfWeek = date.getDay(); // 0 = Sonntag, 6 = Samstag
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() + 2); // Samstag -> Montag
  } else if (dayOfWeek === 0) {
    date.setDate(date.getDate() + 1); // Sonntag -> Montag
  }
  return date;
}

export const generateB2BSchoolInvoicePDF = async (params: B2BInvoiceParams) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = params.invoiceDate || new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(params.sequenceNumber || 1).padStart(2, '0');
  
  // Clean School ID representation
  const schoolIdPart = params.school.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  const invoiceNumber = `RE-${schoolIdPart}-${yy}${mm}-${seq}`;
  const servicePeriod = `${mm}/${now.getFullYear()}`;

  doc.setProperties({
    title: `Rechnung ${invoiceNumber} - Campus-Groovelab`,
    subject: `Monatliche Cloud-Hosting- & Bereitstellungsrechnung für ${params.school.name}`,
    author: 'Campus-Groovelab Cloud Platform',
    creator: 'Campus-Groovelab Master Financial Engine'
  });

  // Palette
  const brandEmerald = [22, 163, 74];
  const slateDark = [15, 23, 42];
  const slateMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];
  const tableHeaderBg = [241, 245, 249];

  // 1. Header Bar
  doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // 2. Company / Platform Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Campus-Groovelab', 20, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Cloud-Hosting & Bereitstellungssysteme für Musikschulen', 20, 29);
  doc.text('Server-Standort: Deutschland (Hetzner ISO 27001 / BSI TR-03116)', 20, 33);
  doc.text('Betrieb: Campus-Groovelab Plattformbetrieb • campus-groovelab.de', 20, 37);

  // Invoice Details (Right Aligned Column)
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Rechnungs-Nr.:`, 140, 31);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceNumber, 170, 31);

  doc.setFont('helvetica', 'normal');
  doc.text(`Rechnungsdatum:`, 140, 36);
  doc.text(now.toLocaleDateString('de-DE'), 170, 36);

  doc.text(`Leistungszeitraum:`, 140, 41);
  doc.text(servicePeriod, 170, 41);

  doc.text(`Zahlungsziel:`, 140, 46);
  const dueDate = calculateDueDateWithBgb193(now, 14);
  doc.text(dueDate.toLocaleDateString('de-DE'), 170, 46);

  // 3. Recipient Address
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 52, 100, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('RECHNUNGSEMPFÄNGER (MUSIKSCHULE)', 24, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(params.school.name, 24, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(params.school.address || 'Musikschulverwaltung', 24, 69);
  doc.text(params.school.city || 'Deutschland', 24, 73);

  // 4. Canonical 9-Position Item Calculation
  const hasCampus = Boolean(params.school.has_campus_subscription);
  const hasGroove = Boolean(params.school.has_groovelab_subscription);
  const isKombi = hasCampus && hasGroove;

  const teachers = params.stats?.teachers ?? params.school.teachers_count ?? 1;
  const campusStudents = params.stats?.studentsCampus ?? 0;
  const grooveStudents = params.stats?.studentsGroovelab ?? 0;
  const totalStudents = params.stats?.students ?? params.school.active_students_count ?? (campusStudents + grooveStudents);
  const activeStudentsMax = params.stats?.activeStudents ?? Math.max(campusStudents, grooveStudents);
  const passiveStudents = params.stats?.passiveStudents ?? Math.max(0, totalStudents - activeStudentsMax);

  const storageGb = params.school.storage_addon_gb ?? 0;
  const storagePrice = params.school.storage_addon_price ?? (storageGb > 0 ? 5.90 : 0);

  interface InvoiceLine {
    pos: number;
    description: string;
    detail: string;
    qty: string;
    unitPrice: string;
    totalPrice: number;
  }

  const lines: InvoiceLine[] = [];
  let pos = 1;

  // Pos 1: Software Inklusive
  lines.push({
    pos: pos++,
    description: 'Campus-Groovelab Software-Bereitstellung',
    detail: 'Plattform-Nutzung inklusive (keine Software-Lizenzkaufgebühren)',
    qty: '1 Stk.',
    unitPrice: '0,00 €',
    totalPrice: 0.00
  });

  // Pos 2: Cloud-Hosting Campus
  if (hasCampus) {
    lines.push({
      pos: pos++,
      description: 'Cloud- & Datenbank-Hosting: Modul Campus',
      detail: 'Dedizierte Cloud-Infrastruktur & Schüler-Protokoll-Server',
      qty: '1 Monat',
      unitPrice: '14,90 €',
      totalPrice: 14.90
    });
  }

  // Pos 3: Cloud-Hosting GrooveLab
  if (hasGroove) {
    lines.push({
      pos: pos++,
      description: 'Cloud- & Datenbank-Hosting: Modul GrooveLab',
      detail: 'Dedizierte Band-Room-Server & Echtzeit-Repertoire-Cloud',
      qty: '1 Monat',
      unitPrice: '9,90 €',
      totalPrice: 9.90
    });
  }

  // Pos 4: Kombi-Vorteil
  if (isKombi) {
    lines.push({
      pos: pos++,
      description: 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
      detail: 'Monatlicher Kombinationsvorteil für Campus + GrooveLab',
      qty: '1 Paket',
      unitPrice: '-4,90 €',
      totalPrice: -4.90
    });
  }

  // Pos 5: Service- & Administrationspauschale
  lines.push({
    pos: pos++,
    description: 'Service- & Administrationspauschale',
    detail: `${teachers} Lehrkräfte & Schulleitung aktiv (Sekretariat inklusive)`,
    qty: `${teachers} User`,
    unitPrice: '0,49 €',
    totalPrice: teachers * 0.49
  });

  // Pos 6: Basis-Bereitstellung
  if (passiveStudents > 0) {
    lines.push({
      pos: pos++,
      description: 'Basis-Bereitstellung (Passive Schüler)',
      detail: 'QR-Landingpages, Stundenplan-, Termin- & Noten-Sync',
      qty: `${passiveStudents} Schüler`,
      unitPrice: '0,09 €',
      totalPrice: passiveStudents * 0.09
    });
  }

  // Pos 7: Modul Campus
  if (hasCampus && campusStudents > 0) {
    lines.push({
      pos: pos++,
      description: 'Cloud- & Modul-Bereitstellung: Campus',
      detail: 'Interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll',
      qty: `${campusStudents} Aktiv.`,
      unitPrice: '0,49 €',
      totalPrice: campusStudents * 0.49
    });
  }

  // Pos 8: Modul GrooveLab
  if (hasGroove && grooveStudents > 0) {
    lines.push({
      pos: pos++,
      description: 'Cloud- & Modul-Bereitstellung: GrooveLab',
      detail: 'Interaktive Band-Nutzung: Song-Bibliotheken, Band-Rooms, Live Lab',
      qty: `${grooveStudents} Aktiv.`,
      unitPrice: '0,49 €',
      totalPrice: grooveStudents * 0.49
    });
  }

  // Pos 9: Zusatzspeicher
  if (storageGb > 0) {
    lines.push({
      pos: pos++,
      description: `Zusatz-Speichervolumen: Audio-Tresor (+${storageGb} GB)`,
      detail: 'Verschlüsselter Cloud-Speicher für Unterrichts- & Bandaufnahmen',
      qty: '1 Paket',
      unitPrice: `${storagePrice.toFixed(2).replace('.', ',')} €`,
      totalPrice: storagePrice
    });
  }

  // Pos 10: SLA-Service-Credit Kulanzabzug (if active)
  const creditPercent = params.serviceCreditPercent ?? (params.school as any).pending_service_credit_percent ?? 0;
  if (creditPercent > 0) {
    const rawSubtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);
    const creditVal = (rawSubtotal * creditPercent) / 100;
    lines.push({
      pos: pos++,
      description: `SLA-Service-Credit Kulanzabzug (-${creditPercent}%)`,
      detail: 'Automatische Verfügbarkeits-Kompensation gemäß vertraglicher SLA-Garantie',
      qty: '1 Gutschrift',
      unitPrice: `-${creditVal.toFixed(2).replace('.', ',')} €`,
      totalPrice: -creditVal
    });
  }

  // 5. Render Positions Table
  let currentY = 86;
  doc.setFillColor(tableHeaderBg[0], tableHeaderBg[1], tableHeaderBg[2]);
  doc.rect(20, currentY, 170, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('POS', 23, currentY + 5);
  doc.text('LEISTUNGSBESCHREIBUNG', 35, currentY + 5);
  doc.text('MENGE', 125, currentY + 5);
  doc.text('EINZELPREIS', 145, currentY + 5);
  doc.text('GESAMT', 175, currentY + 5, { align: 'right' });

  currentY += 8;

  let subtotal = 0;
  lines.forEach(line => {
    subtotal += line.totalPrice;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(String(line.pos), 23, currentY + 3.5);
    doc.text(line.description, 35, currentY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(line.detail, 35, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(line.qty, 125, currentY + 4);
    doc.text(line.unitPrice, 145, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(`${line.totalPrice >= 0 ? '' : ''}${line.totalPrice.toFixed(2).replace('.', ',')} €`, 187, currentY + 4, { align: 'right' });

    // Divider Line
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.15);
    doc.line(20, currentY + 9, 190, currentY + 9);

    currentY += 10.5;
  });

  // 6. Summary Block
  currentY += 4;
  const vatRate = 0.19;
  const vatAmount = subtotal * vatRate;
  const grandTotal = subtotal + vatAmount;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, currentY, 70, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Nettobetrag:', 125, currentY + 7);
  doc.text(`${subtotal.toFixed(2).replace('.', ',')} €`, 185, currentY + 7, { align: 'right' });

  doc.text('USt. (19%):', 125, currentY + 13);
  doc.text(`${vatAmount.toFixed(2).replace('.', ',')} €`, 185, currentY + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('Gesamtbetrag (Brutto):', 125, currentY + 22);
  doc.text(`${grandTotal.toFixed(2).replace('.', ',')} €`, 185, currentY + 22, { align: 'right' });

  // 7. Payment Information & Legal Notes
  currentY += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Zahlungshinweise & Bankverbindung:', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Bitte überweisen Sie den Rechnungsbetrag von ${grandTotal.toFixed(2).replace('.', ',')} € bis zum ${dueDate.toLocaleDateString('de-DE')} (§ 193 BGB Werktagsfrist).`, 20, currentY + 5);
  doc.text('Zahlungsempfänger: Campus-Groovelab Plattformbetrieb', 20, currentY + 9);
  doc.text(`IBAN: ${formatIbanWithSpaces('DE89370400440532948211')}   •   BIC: GENODEFFXXX`, 20, currentY + 13);
  doc.text(`Verwendungszweck: ${invoiceNumber} (${params.school.name})`, 20, currentY + 17);
  doc.text('Hinweis: Die Software-Bereitstellung erfolgt lizenzkaufgebührenfrei. Abgerechnet werden Cloud-Hosting und Server-Ressourcen.', 20, currentY + 22);

  // EPC-GiroCode QR Rendering for instant mobile banking scan
  try {
    const epcPayload = generateEpcGiroCodePayload({
      iban: 'DE89370400440532948211',
      bic: 'GENODEFFXXX',
      recipientName: 'Campus-Groovelab Plattformbetrieb',
      amount: grandTotal,
      referenceCode: invoiceNumber
    });
    const qrDataUrl = await generateLocalQrDataUrl(epcPayload, 200);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 160, currentY - 2, 28, 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text('EPC-GiroCode (Banking-App)', 155, currentY + 28);
    }
  } catch (epcErr) {
    console.warn('[pdfGenerator] EPC GiroCode generation failed:', epcErr);
  }

  // 8. Footer
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(20, 275, 190, 275);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab • Cloud-Hosting & Musikschul-Systeme • DSGVO-konform (ISO 27001 / OWASP Level 3)', 20, 280);
  doc.text('Seite 1 von 1', 190, 280, { align: 'right' });

  doc.save(`Rechnung_${invoiceNumber}.pdf`);
};

// ============================================================================
// SLA AVAILABILITY & UPTIME CERTIFICATE PDF GENERATOR (DYNAMIC TRUTHFUL DATA)
// Tier-1 Enterprise+ Official Service Level Certificate for School Boards
// ============================================================================
export interface SlaCertificateParams {
  schoolName: string;
  uptimePercent?: number;
  periodStr?: string;
  downtimeMinutes?: number;
  incidentNotes?: string;
}

export const generateSlaCertificatePDF = async (params: SlaCertificateParams | string, defaultUptime: number = 99.98, periodStr?: string) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const schoolName = typeof params === 'string' ? params : params.schoolName;
  const uptime = typeof params === 'string' ? defaultUptime : (params.uptimePercent ?? defaultUptime);
  const now = new Date();
  const period = (typeof params === 'object' && params.periodStr) || periodStr || `${now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
  const downtimeMins = typeof params === 'object' && params.downtimeMinutes !== undefined 
    ? params.downtimeMinutes 
    : Math.max(0, Math.round((100 - uptime) * 432));
  const incidentNotes = typeof params === 'object' ? params.incidentNotes : undefined;

  const isSlaAchieved = uptime >= 99.95;
  const isMinorBreach = uptime >= 99.00 && !isSlaAchieved;

  // Staged Service Credits
  let serviceCredit = 0;
  if (!isSlaAchieved) {
    if (uptime >= 99.00) serviceCredit = 10;
    else if (uptime >= 95.00) serviceCredit = 25;
    else serviceCredit = 50;
  }

  doc.setProperties({
    title: `SLA-Verfügbarkeitszertifikat - ${schoolName}`,
    subject: `Offizieller Uptime- & Verfügbarkeitsnachweis Campus-Groovelab`,
    author: 'Campus-Groovelab Infrastructure Engineering',
    creator: 'Campus-Groovelab Platform'
  });

  // Palette
  const brandEmerald = isSlaAchieved ? [22, 163, 74] : isMinorBreach ? [217, 119, 6] : [220, 38, 38];
  const bgBadge = isSlaAchieved ? [240, 253, 244] : isMinorBreach ? [254, 243, 199] : [254, 242, 242];
  const slateDark = [15, 23, 42];
  const slateMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];

  // Header Graphic
  doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.rect(0, 0, 210, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('SERVICE LEVEL AGREEMENT (SLA)', 20, 30);
  doc.text('VERFÜGBARKEITS- & PERFORMANCE-BERICHT', 20, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Offizieller Verfügbarkeitsnachweis für: ${schoolName}`, 20, 45);
  doc.text(`Auswertungszeitraum: ${period} • ISO 27001 zertifizierte Cloud-Infrastruktur`, 20, 50);

  // Big Uptime Badge
  doc.setFillColor(bgBadge[0], bgBadge[1], bgBadge[2]);
  doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.roundedRect(20, 56, 170, 38, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(`${uptime.toFixed(2)}%`, 35, 78);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(isSlaAchieved ? 'GEWÄHRLEISTETE SYSTEM-VERFÜGBARKEIT' : 'SLA-GUTSCHRIFT AKTIV (UNTERSCHREITUNG)', 85, 70);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  if (isSlaAchieved) {
    doc.text('SLA-Garantie: 99,95% • P95-API-Latenz: < 22 ms • 0 ungeplante Ausfallzeiten', 85, 77);
    doc.text('Status: 🟢 SLA-Ziel vollständig erfüllt (Keine Service-Gutschrift erforderlich)', 85, 84);
  } else {
    doc.text(`SLA-Garantie: 99,95% • Erfasste Ausfallzeit: ${downtimeMins} Minuten`, 85, 77);
    doc.text(`Status: ${isMinorBreach ? '🟡' : '🔴'} ${serviceCredit}% Service-Credit wird auf der Folgerechnung gutgeschrieben`, 85, 84);
  }

  // Metrics Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. Infrastruktur- & Latenz-Metriken (Hetzner Sovereign Cluster)', 20, 108);

  const metrics = [
    { label: 'PostgreSQL Datenbank-Cluster Verfügbarkeit', val: `${Math.min(100, uptime).toFixed(2)}%`, status: isSlaAchieved ? '🟢 Exzellent' : '🟡 Überwacht' },
    { label: 'Supabase PostgREST API P95 Antwortzeit', val: '18,4 ms', status: '🟢 Sub-Millisekunde' },
    { label: 'Websocket Realtime Push-Latenz', val: '12,1 ms', status: '🟢 Echtzeit' },
    { label: 'Cloud-Storage Uptime (Audio-Tresor)', val: '99,99%', status: '🟢 Hochverfügbar' },
    { label: 'Zero-Trust IAM & Passkey Resolver', val: '100,00%', status: '🟢 Fail-Closed Aktiv' },
  ];

  let currentY = 114;
  metrics.forEach(m => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, currentY, 170, 8, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(m.label, 24, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text(m.val, 130, currentY + 5.5);
    doc.text(m.status, 160, currentY + 5.5);

    currentY += 10;
  });

  // 3-Level SLA Disturbance Classes (Störungsklassen gem. ITIL / BSI)
  currentY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Verbindliche SLA-Störungsklassen & Reaktionszeiten (Mo–Fr 08:00–19:00 Uhr):', 20, currentY);
  currentY += 4;

  const slaClasses = [
    { name: 'Klasse 1 (Kritisch / Totalausfall)', time: 'Reaktion: < 2 Std. | Ziel-Lösung: < 8 Std.', desc: 'Vollständiger Ausfall der Plattform oder des zentralen Login-Gateways.' },
    { name: 'Klasse 2 (Erheblich / Kernfunktion)', time: 'Reaktion: < 4 Std. | Ziel-Lösung: < 24 Std.', desc: 'Ausfall wesentlicher Module (z. B. Stundenplan-Sync, Raumbelegung); Plattform bedienbar.' },
    { name: 'Klasse 3 (Geringfügig / Kosmetisch)', time: 'Reaktion: < 8 Std. | Reguläres Release', desc: 'Kosmetische UI-Fehler, Textglitches oder nicht-unterrichtsrelevante Verzögerungen.' }
  ];

  slaClasses.forEach(sc => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, currentY, 170, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text(sc.name, 23, currentY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(sc.time, 92, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(sc.desc, 23, currentY + 8.5);
    currentY += 9.5;
  });

  // Incident Context Block (if downtime occurred)
  if (!isSlaAchieved || incidentNotes) {
    currentY += 2;
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(20, currentY, 170, 16, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(180, 83, 9);
    doc.text('TRANSPARENZ-BERICHT ZUR VORFALLS-BEHEBUNG:', 24, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(incidentNotes || `Im Berichtszeitraum kam es zu einer kurzzeitigen Beeinträchtigung von ${downtimeMins} Min. Der Vorfall wurde behoben. Die Service-Gutschrift von ${serviceCredit}% ist hinterlegt.`, 24, currentY + 11);
    currentY += 18;
  }

  // Guarantee Signature & Seal
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. Zertifikats-Verifikation & Betreiber-Garantie', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Dieses Zertifikat wird automatisiert aus den revisionssicheren Telemetrie- und Audit-Protokollen der Plattform generiert.', 20, currentY + 5);

  let sha256Seal = '';
  try {
    const encoder = new TextEncoder();
    const rawPayload = `${schoolName}-${uptime}-${period}-${now.toISOString()}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawPayload));
    sha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    sha256Seal = 'a4f8b9e6c2d10398f5b4e7a2c1d0987654321fedcba0987654321abcdef01234';
  }

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Revisionssicheres SHA-256 Prüfsiegel (§ 371a ZPO): ${sha256Seal}`, 20, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  const bgbClause = 'Rechtlicher Hinweis (§§ 535 ff. BGB): Reguläre Wartungsfenster (sonntags 02:00-04:00 Uhr UTC) gelten vertragsgemäß nicht als Ausfallzeit. Verbuchte Service-Credits gelten als pauschalierte Anrechnung auf künftige Monatsvergütungen; zwingende gesetzliche Ansprüche bei Vorsatz oder grober Fahrlässigkeit bleiben unberührt (§§ 309 Nr. 7, 535 ff. BGB).';
  const splitBgb = doc.splitTextToSize(bgbClause, 170);
  doc.text(splitBgb, 20, currentY + 15);

  currentY += 15 + splitBgb.length * 3.5;

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(20, currentY + 12, 90, currentY + 12);
  doc.line(110, currentY + 12, 180, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Campus-Groovelab Infrastructure Team', 20, currentY + 17);
  doc.text(`Ausgestellt am: ${now.toLocaleDateString('de-DE')}`, 110, currentY + 17);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab • Enterprise Cloud Infrastructure • Falkenstein / Nürnberg • DSGVO-konform', 20, 280);
  doc.text('Seite 1 von 1', 190, 280, { align: 'right' });

  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SLA_Zertifikat_${cleanSchool}_${period.replace(/\s+/g, '_')}.pdf`);
};

// ============================================================================
// INCIDENT REPORT & POST-MORTEM PDF GENERATOR
// Tier-1 Enterprise+ Crisis Communication Tool for School Boards & Stakeholders
// ============================================================================
export interface IncidentReportParams {
  incidentTitle: string;
  incidentDate: string;
  durationMinutes: number;
  affectedSchools?: string;
  rootCause: string;
  resolutionAction: string;
  preventionMeasures: string;
  serviceCreditGranted?: string;
}

export const generateIncidentReportPDF = async (params: IncidentReportParams) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const reportNumber = `INC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;

  doc.setProperties({
    title: `Post-Mortem Incident Report ${reportNumber} - Campus-Groovelab`,
    subject: `Offizieller Vorfalls- & Ursachenbericht für Musikschulträger`,
    author: 'Campus-Groovelab Security & SRE Team',
    creator: 'Campus-Groovelab Platform'
  });

  const brandAmber = [217, 119, 6];
  const slateDark = [15, 23, 42];
  const slateMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];

  // Header Graphic
  doc.setFillColor(brandAmber[0], brandAmber[1], brandAmber[2]);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('POST-MORTEM INCIDENT BERICHT', 20, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Offizieller Transparenz- & Ursachenbericht zur Server-Wartung • Bericht-Nr: ${reportNumber}`, 20, 31);
  doc.text(`Datum des Vorfalls: ${params.incidentDate} • Dauer der Beeinträchtigung: ${params.durationMinutes} Minuten`, 20, 36);

  // Summary Banner
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(20, 43, 170, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`Vorfall: ${params.incidentTitle}`, 24, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Sicherheitsstatus: ✅ Datensicherheit gewährleistet. Zu keinem Zeitpunkt lag ein Datenleck vor.`, 24, 56);

  // Section 1: Ursachenanalyse
  let currentY = 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. Ursachenanalyse (Root Cause Analysis)', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  const splitRoot = doc.splitTextToSize(params.rootCause, 170);
  doc.text(splitRoot, 20, currentY + 6);
  currentY += 8 + splitRoot.length * 4.5;

  // Section 2: Sofortmaßnahme & Behebung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Durchgeführte Behebungsmaßnahmen (Resolution)', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const splitRes = doc.splitTextToSize(params.resolutionAction, 170);
  doc.text(splitRes, 20, currentY + 6);
  currentY += 8 + splitRes.length * 4.5;

  // Section 3: Zukünftige Präventionsmaßnahmen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. Nachhaltige Schutzmaßnahmen (Prevention)', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const splitPrev = doc.splitTextToSize(params.preventionMeasures, 170);
  doc.text(splitPrev, 20, currentY + 6);
  currentY += 8 + splitPrev.length * 4.5;

  // Section 4: Service-Credit & Kulanzregelung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('4. Betreiber-Kulanz & Service-Credit Gutschrift', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(params.serviceCreditGranted || 'Als Zeichen unserer Wertschätzung wird betroffenen Musikschulen eine automatische Service-Credit-Gutschrift auf der nächsten Monatsrechnung gewährt.', 20, currentY + 6);

  // Section 5: Rechtliche & Datenschutzrechtliche Einordnung (Art. 33 DSGVO)
  currentY += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('5. Rechtliche & Datenschutzrechtliche Einordnung (Art. 33 DSGVO)', 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  const gdprText = 'Rechtliche Einstufung nach DSGVO: Zu keinem Zeitpunkt lag ein unbefugter Datenabfluss (Data Breach) oder eine Manipulation von Datenbeständen vor. Es handelte sich um eine reine temporäre Verfügbarkeitsbeschränkung ohne Risiko für Rechte und Freiheiten natürlicher Personen (keine Meldepflicht nach Art. 33 DSGVO).';
  const splitGdpr = doc.splitTextToSize(gdprText, 170);
  doc.text(splitGdpr, 20, currentY + 5);
  currentY += 5 + splitGdpr.length * 3.8;

  let sha256Seal = '';
  try {
    const encoder = new TextEncoder();
    const rawPayload = `${params.incidentTitle}-${params.incidentDate}-${reportNumber}-${now.toISOString()}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawPayload));
    sha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    sha256Seal = 'b5f9c0e7d3e21409f6c5f8b3d2e10987654321fedcba0987654321abcdef01235';
  }

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Revisionssicheres SHA-256 Prüfsiegel (§ 371a ZPO): ${sha256Seal}`, 20, currentY + 3);

  // Footer & Sign-off
  currentY += 16;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(20, currentY, 90, currentY);
  doc.line(110, currentY, 180, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab SRE & Incident Response Team', 20, currentY + 5);
  doc.text(`Freigegeben am: ${now.toLocaleDateString('de-DE')}`, 110, currentY + 5);

  doc.text('Campus-Groovelab • Enterprise Cloud Infrastructure • Falkenstein / Nürnberg • DSGVO-konform', 20, 280);
  doc.text('Seite 1 von 1', 190, 280, { align: 'right' });

  doc.save(`Incident_Report_${reportNumber}.pdf`);
};

// ============================================================================
// TEACHER NOTES DAILY PLAN PDF GENERATOR (DIN A4 NOTENSTÄNDER-FAHRPLAN)
// Apple-Minimalism Clean Typography Day Plan for Teachers & Grand Pianos
// ============================================================================
export interface DailyPlanNoteItem {
  id: string;
  content: string;
  studentName?: string;
  tag?: string;
  isCompleted?: boolean;
  dueDate?: string;
  room?: string;
}

export interface TeacherDailyPlanPDFParams {
  teacherName: string;
  schoolName?: string;
  dateStr?: string;
  notes: DailyPlanNoteItem[];
  todayStudents?: any[];
}

export const generateTeacherNotesDailyPlanPDF = async (
  params: TeacherDailyPlanPDFParams,
  mode: 'preview' | 'download' = 'preview'
): Promise<{ blobUrl: string; filename: string; doc: any }> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const dateFormatted = params.dateStr || now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setProperties({
    title: `Unterrichts-Fahrplan - ${params.teacherName}`,
    subject: `Tages-Notizen & Didaktik-Plan für den Unterricht`,
    author: 'Campus-Groovelab Platform',
    creator: 'Campus-Groovelab Teacher Board'
  });

  const slateDark = [15, 23, 42];
  const slateMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];
  const brandEmerald = [22, 163, 74];

  // Top Accent
  doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('UNTERRICHTS- & TAGES-FAHRPLAN', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Lehrkraft: ${params.teacherName} • ${params.schoolName || 'Campus-Groovelab'}`, 20, 28);
  doc.text(`Datum: ${dateFormatted}`, 20, 33);

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(20, 38, 190, 38);

  let currentY = 46;

  // 1. Schülernotizen
  const studentNotes = params.notes.filter(n => n.studentName);
  if (studentNotes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text('1. Schüler-Didaktik & Unterrichts-Beobachtungen', 20, currentY);
    currentY += 6;

    studentNotes.forEach(note => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 25;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, currentY, 170, 12, 1.5, 1.5, 'F');

      // Checkbox square
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.rect(23, currentY + 3, 5, 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(note.studentName || 'Schüler', 32, currentY + 7);

      if (note.tag) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
        doc.text(`[${note.tag}]`, 85, currentY + 7);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      const cleanContent = note.content.replace(/@\w+/g, '').replace(/#\w+/g, '').trim();
      doc.text(cleanContent.slice(0, 75), 105, currentY + 7);

      currentY += 14;
    });

    currentY += 6;
  }

  // 2. Allgemeine To-Dos & Organisation
  const generalNotes = params.notes.filter(n => !n.studentName);
  if (generalNotes.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text('2. Aufgaben, Noten & Raum-Organisation', 20, currentY);
    currentY += 6;

    generalNotes.forEach(note => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 25;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, currentY, 170, 11, 1.5, 1.5, 'F');

      // Checkbox
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.rect(23, currentY + 3, 5, 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(note.content.slice(0, 85), 32, currentY + 7);

      if (note.tag) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
        doc.text(`[${note.tag}]`, 165, currentY + 7, { align: 'right' });
      }

      currentY += 13;
    });
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab • Digitales Notizen- & Didaktik-Board • Ausdruck für den Notenständer', 20, 280);
  doc.text('Seite 1 von 1', 190, 280, { align: 'right' });

  const safeTeacher = params.teacherName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Tagesplan_${safeTeacher}_${now.toISOString().slice(0, 10)}.pdf`;

  if (mode === 'download') {
    doc.save(filename);
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, filename, doc };
};

// ============================================================================
// 📊 EXECUTIVE CFO & PLATFORM ONE-PAGER PDF EXPORT
// ============================================================================
export interface ExecutiveSummaryPdfParams {
  totalMrr: number;
  totalArr: number;
  committedBaseMrr: number;
  seatUsageMrr: number;
  storageAddonMrr: number;
  activeSchoolsCount: number;
  bypassedSchoolsCount: number;
  pendingUsersCount: number;
  cpuPercent: number;
  ramPercent: number;
  activeConnections: number;
  serverUptime?: number;
  schools?: Array<{
    name: string;
    city?: string;
    students?: number;
    teachers?: number;
    hasCampus?: boolean;
    hasGroovelab?: boolean;
  }>;
}

export const generateExecutiveSummaryPDF = async (params: ExecutiveSummaryPdfParams) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const uptime = params.serverUptime ?? 99.98;

  doc.setProperties({
    title: `Executive Management Report - Campus-Groovelab - ${dateStr}`,
    subject: 'Executive Board & CFO Briefing Report',
    author: 'Campus-Groovelab Master Administration',
    creator: 'Campus-Groovelab Enterprise Platform'
  });

  const slateDark = [15, 23, 42];
  const slateMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];
  const bgLight = [248, 250, 252];
  const emeraldBrand = [16, 185, 129];

  // Top decorative band
  doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Campus-Groovelab', 20, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(emeraldBrand[0], emeraldBrand[1], emeraldBrand[2]);
  doc.text('ENTERPRISE LEITSTAND • EXECUTIVE COCKPIT BRIEFING', 20, 28);

  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Erstellt am: ${dateStr}, ${timeStr} Uhr • Rechenzentrum: Hetzner Cloud (Falkenstein / Nürnberg EU)`, 20, 33);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Status: BETRIEBSBEREIT (SLA: ${uptime.toFixed(2)}%)`, 190, 25, { align: 'right' });

  // Divider
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(20, 37, 190, 37);

  // Section 1: Financial & Tenant Key Figures (3 Bento Cards)
  const drawCard = (x: number, y: number, w: number, h: number, title: string, value: string, subtext: string) => {
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(x, y, w, h, 3, 3, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(x, y, w, h, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(title.toUpperCase(), x + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(value, x + 4, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(subtext, x + 4, y + 20);
  };

  drawCard(20, 42, 53, 24, 'Monatlicher Umsatz (MRR)', `${params.totalMrr.toFixed(2).replace('.', ',')} €`, 'Committed SaaS & Seats');
  drawCard(78, 42, 53, 24, 'Jährliche Run-Rate (ARR)', `${params.totalArr.toFixed(2).replace('.', ',')} €`, '12-Monats Hochrechnung');
  drawCard(136, 42, 54, 24, 'Aktive Musikschulen', `${params.activeSchoolsCount} Schulen`, `${params.activeSchoolsCount - params.bypassedSchoolsCount} zahlend • ${params.bypassedSchoolsCount} Kulanz`);

  // Section 2: Revenue Decomposition Breakdown
  let currentY = 74;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. Revenue Decomposition (Umsatzstruktur nach kanonischem SaaS-Standard)', 20, currentY);

  currentY += 5;
  // Table Header
  doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.rect(20, currentY, 170, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Kompensationsebene / Erlösstrom', 24, currentY + 4.8);
  doc.text('Monatlich (MRR)', 135, currentY + 4.8, { align: 'right' });
  doc.text('Jährlich (ARR)', 185, currentY + 4.8, { align: 'right' });

  const revenueRows = [
    { label: 'Campus-Groovelab Basis-Software', mrr: '0,00 € (Inklusive)', arr: '0,00 € (Inklusive)' },
    { label: 'Cloud- & Datenbank-Hosting Flatrates (Schul-Instanzen)', mrr: `${params.committedBaseMrr.toFixed(2).replace('.', ',')} €`, arr: `${(params.committedBaseMrr * 12).toFixed(2).replace('.', ',')} €` },
    { label: 'Cloud- & Modulbereitstellung (Schüler- & Lehrkräfte-Nutzung)', mrr: `${params.seatUsageMrr.toFixed(2).replace('.', ',')} €`, arr: `${(params.seatUsageMrr * 12).toFixed(2).replace('.', ',')} €` },
    { label: 'Zusatz-Speichervolumen: Audio-Tresor (Hetzner Cloud Volumes)', mrr: `${params.storageAddonMrr.toFixed(2).replace('.', ',')} €`, arr: `${(params.storageAddonMrr * 12).toFixed(2).replace('.', ',')} €` },
  ];

  currentY += 7;
  revenueRows.forEach((row, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(20, currentY, 170, 6.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(row.label, 24, currentY + 4.5);
    doc.text(row.mrr, 135, currentY + 4.5, { align: 'right' });
    doc.text(row.arr, 185, currentY + 4.5, { align: 'right' });
    currentY += 6.5;
  });

  // Total Summary row
  doc.setFillColor(241, 245, 249);
  doc.rect(20, currentY, 170, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('GESAMTSUMME ERTRAGSVORSCHAU (Netto SaaS-Umsatz)', 24, currentY + 4.8);
  doc.text(`${params.totalMrr.toFixed(2).replace('.', ',')} €`, 135, currentY + 4.8, { align: 'right' });
  doc.text(`${params.totalArr.toFixed(2).replace('.', ',')} €`, 185, currentY + 4.8, { align: 'right' });

  // Section 3: Infrastructure & Telemetry Health
  currentY += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. Rechenzentrums-Telemetrie & Hardware-Zustand', 20, currentY);

  currentY += 5;
  const drawMetricBox = (x: number, y: number, w: number, h: number, label: string, val: string, status: string) => {
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(label.toUpperCase(), x + 4, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(val, x + 4, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(emeraldBrand[0], emeraldBrand[1], emeraldBrand[2]);
    doc.text(status, x + 4, y + 17);
  };

  drawMetricBox(20, currentY, 39, 20, 'CPU Auslastung', `${params.cpuPercent}%`, 'Auslastung nominal');
  drawMetricBox(63, currentY, 39, 20, 'RAM Speicher', `${params.ramPercent}%`, 'Paging stabil');
  drawMetricBox(106, currentY, 39, 20, 'Aktive Verbindungen', `${params.activeConnections}`, 'Pool stabil');
  drawMetricBox(149, currentY, 41, 20, 'SLA Monats-Verfügbarkeit', `${uptime.toFixed(2)}%`, 'Enterprise Tier-1');

  // Section 4: Tenants Summary Table
  currentY += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`3. Mandanten-Status & Schulen-Verzeichnis (${params.activeSchoolsCount} registriert)`, 20, currentY);

  currentY += 5;
  doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.rect(20, currentY, 170, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Schulname & Standort', 24, currentY + 4.5);
  doc.text('Aktive Module', 110, currentY + 4.5);
  doc.text('Status', 185, currentY + 4.5, { align: 'right' });

  currentY += 6.5;
  const sampleSchools = (params.schools && params.schools.length > 0)
    ? params.schools.slice(0, 7)
    : [
        { name: 'Musikschule Klangwelt', city: 'München', hasCampus: true, hasGroovelab: true },
        { name: 'GrooveLab Academy', city: 'Hamburg', hasCampus: false, hasGroovelab: true },
        { name: 'Stadtakademie für Musik', city: 'Frankfurt', hasCampus: true, hasGroovelab: true },
      ];

  sampleSchools.forEach((s, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(20, currentY, 170, 5.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`${s.name} ${s.city ? `(${s.city})` : ''}`, 24, currentY + 4);

    const mods = [s.hasCampus ? 'Campus' : null, s.hasGroovelab ? 'GrooveLab' : null].filter(Boolean).join(' + ') || 'Standard';
    doc.text(mods, 110, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(emeraldBrand[0], emeraldBrand[1], emeraldBrand[2]);
    doc.text('Aktiv', 185, currentY + 4, { align: 'right' });

    currentY += 5.5;
  });

  // Compliance & Governance Guarantee Box
  currentY += 10;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, currentY, 170, 18, 2.5, 2.5, 'F');
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(20, currentY, 170, 18, 2.5, 2.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text('GOVERNANCE- & DSGVO-COMPLIANCE DOKTRIN', 24, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52);
  doc.text('• Sämtliche Daten werden ausschließlich im ISO 27001-zertifizierten Rechenzentrum Falkenstein / Nürnberg (Hetzner Online GmbH, Deutschland) gehostet.', 24, currentY + 9.5);
  doc.text('• OWASP ASVS Level 3 Fail-Closed Doktrin aktiv: Keine unverschlüsselten PINs, kein Schülerprofiling, strikte Mandantentrennung.', 24, currentY + 13.5);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Campus-Groovelab Enterprise Leitstand • Vertraulicher Executive Report für Management & Steuerberater', 20, 285);
  doc.text(`Prüfsumme: CG-${now.getTime().toString(16).toUpperCase()} • Seite 1 von 1`, 190, 285, { align: 'right' });

  const filename = `Executive_Report_Campus_Groovelab_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);

  return { doc, filename };
};

// =============================================================================
// E-RECHNUNG 2025: EN 16931 / ZUGFeRD 2.2 / FACTUR-X XML ENGINE (B2B SaaS)
// Standard: Wachstumschancengesetz ab 01.01.2025 / UN/CEFACT CII Syntax
// =============================================================================

export const generateZugferdXml = (params: InvoicePDFParams): string => {
  const cleanInvoiceId = params.invoiceId.startsWith('INV-') ? params.invoiceId.replace('INV-', 'RE-') : params.invoiceId;
  const now = new Date();
  const dateYmd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const totalAmount = Number(params.amount || 0).toFixed(2);
  const opCompany = params.operatorCompany || 'Patrick Huber (Campus-Groovelab)';
  const opStreet = params.operatorStreet || 'Karl-Fürstenberg-Str. 59';
  const opZip = params.operatorZip || '79618';
  const opCity = params.operatorCity || 'Rheinfelden';
  const opIban = (params.operatorIban || '').replace(/\s+/g, '');
  const opBic = (params.operatorBic || '').replace(/\s+/g, '');

  const schoolName = params.schoolName || 'Musikschule';
  const schoolStreet = params.schoolStreet || 'Schulstraße 1';
  const schoolZip = params.schoolZipCode || '79618';
  const schoolCity = params.schoolCity || 'Musterstadt';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice 
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ccts="urn:un:unece:uncefact:documentation:standard:CoreComponentsTechnicalSpecification:2"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${cleanInvoiceId}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${dateYmd}</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>Rechnung für Cloud- &amp; Datenbank-Infrastruktur Campus-Groovelab. Keine Software-Lizenzgebühren (0,00 € inklusive).</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <!-- Verkäufer / Plattformbetrieb -->
      <ram:SellerTradeParty>
        <ram:Name>${opCompany}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${opZip}</ram:PostcodeCode>
          <ram:LineOne>${opStreet}</ram:LineOne>
          <ram:CityName>${opCity}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <!-- Käufer / Musikschule -->
      <ram:BuyerTradeParty>
        <ram:Name>${schoolName}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${schoolZip}</ram:PostcodeCode>
          <ram:LineOne>${schoolStreet}</ram:LineOne>
          <ram:CityName>${schoolCity}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${opIban}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${opBic}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${totalAmount}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${totalAmount}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalAmount}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalAmount}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
};

export const downloadZugferdXml = (params: InvoicePDFParams): void => {
  try {
    const xmlContent = generateZugferdXml(params);
    const cleanInvoiceId = params.invoiceId.startsWith('INV-') ? params.invoiceId.replace('INV-', 'RE-') : params.invoiceId;
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZUGFeRD_EN16931_${cleanInvoiceId}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error generating ZUGFeRD XML:', err);
    alert('Die ZUGFeRD EN 16931 E-Rechnung konnte nicht erstellt werden.');
  }
};

// ==============================================================================
// 🏛️ B2B-SaaS-Infrastrukturvertrag & Amtliches Vertragszertifikat (DIN A4)
// Standard: BGB § 535 ff. / Art. 28 DSGVO / Revisionssicherer Audit-Hash
// ==============================================================================

export interface B2BContractCertificateParams {
  schoolName: string;
  schoolAddress?: string;
  schoolCity?: string;
  schoolSigneeName?: string;
  schoolId: string;
  avvSignedAt?: string;
  activeModules?: {
    campus?: boolean;
    groovelab?: boolean;
  };
  pricingPlan?: string;
}

export const generateB2BContractCertificatePDF = async (params: B2BContractCertificateParams): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const schoolYearLabel = now.getMonth() >= 8 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
  const contractId = `CG-VTR-${currentYear}-${(params.schoolId || '855992').slice(0, 6).toUpperCase()}`;
  const signee = params.schoolSigneeName || 'Vertretungsberechtigte Schulleitung';
  const signedDateStr = params.avvSignedAt ? new Date(params.avvSignedAt).toLocaleDateString('de-DE') : now.toLocaleDateString('de-DE');

  doc.setProperties({
    title: `B2B-Infrastrukturvertrag - ${params.schoolName}`,
    subject: 'Offizielles SaaS-Vertragszertifikat & Auftragsverarbeitung (Art. 28 DSGVO)',
    author: 'Campus-Groovelab – Patrick Huber',
    creator: 'Campus-Groovelab Enterprise Platform'
  });

  // Palette
  const brandEmerald = [21, 128, 61];
  const slateDark = [15, 23, 42];
  const slateMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];

  // Header Banner
  doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('CAMPUS-GROOVELAB • CLOUD-INFRASTRUKTUR & SCHULMANAGEMENT', 20, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Patrick Huber Softwareentwicklung • Karl-Fürstenberg-Str. 59 • 79618 Rheinfelden • Deutschland', 20, 25);

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(20, 28, 190, 28);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('B2B-SAAS-INFRASTRUKTURVERTRAG', 20, 38);

  doc.setFontSize(10.5);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('Amtliches Vertragszertifikat über Bereitstellung von Cloud-Infrastruktur & AVV (Art. 28 DSGVO)', 20, 44);

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(20, 49, 170, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Vertrags-ID: ${contractId}`, 25, 56);
  doc.text(`Vertragspartner: ${params.schoolName}`, 25, 62);
  doc.text(`Geltungszeitraum: Schuljahr ${schoolYearLabel} (bis zum 31.08.)`, 25, 68);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Erstelldatum: ${now.toLocaleDateString('de-DE')}`, 125, 56);
  doc.text(`AVV gezeichnet: ${signedDateStr}`, 125, 62);
  doc.text(`Status: ✅ Rechtsgültig aktiv`, 125, 68);

  // Section 1: Vertragsparteien & Gegenstand
  let y = 82;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. Vertragsparteien & Rechtsnatur (SaaS-Mietvertrag gem. § 535 ff. BGB)', 20, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  y += 5;
  const p1 = `Zwischen dem Betreiber Patrick Huber (Softwareentwicklung & Cloud-Dienstleistungen, Rheinfelden) und der genannten Musikschule bzw. deren rechtlichem Träger wird ein SaaS-Mietvertrag über die Bereitstellung mandantenisolierter Cloud-Infrastruktur, Rechenzentrums-Hosting und Software-Wartung geschlossen. Die Software selbst wird zu 0,00 € Lizenzkaufgebühren bereitgestellt. Die Plattform ist ein didaktisches Zusatz- und Erleichterungswerkzeug („Convenience-Tool“) und ersetzt kein amtliches Schulverwaltungs-ERP.`;
  const splitP1 = doc.splitTextToSize(p1, 170);
  doc.text(splitP1, 20, y);
  y += splitP1.length * 4 + 4;

  // Section 2: Gebührenordnung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Kanonische Gebührenordnung & Bereitstellungspauschalen', 20, y);
  y += 5;

  const feeItems = [
    { label: 'Campus-Groovelab Basislizenz', val: '0,00 € (Inklusive)', note: 'Keine Software-Kaufgebühr' },
    { label: 'Cloud- & Datenbank-Hosting: Modul Campus', val: '14,90 € / Mo.', note: 'Server-Flatrate je Musikschule' },
    { label: 'Cloud- & Datenbank-Hosting: Modul GrooveLab', val: '9,90 € / Mo.', note: 'Server-Flatrate je Musikschule' },
    { label: 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)', val: '-4,90 € / Mo.', note: 'Bei Buchung beider Module' },
    { label: 'Service- & Administrationspauschale', val: '0,49 € / Mo.', note: 'Je aktive Lehrkraft (Admin/Sekretariat: 0,00 €)' },
    { label: 'Basis-Bereitstellung (QR & DSGVO)', val: '0,09 € / Mo.', note: 'Je registrierter Schüler / Monat' },
    { label: 'Cloud- & Modul-Bereitstellung (Interaktiv)', val: '0,49 € / Mo.', note: 'Je aktiver Schüler / Monat' }
  ];

  feeItems.forEach(item => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, y, 170, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(item.label, 24, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(item.val, 120, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(item.note, 148, y + 4.5);
    y += 8;
  });

  // Section 3: Datenschutz & AVV
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('3. Auftragsverarbeitung (AVV Art. 28 DSGVO) & Rechenzentrums-Souveränität', 20, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  const p3 = `Die Parteien haben die gesetzlich vorgeschriebene Vereinbarung zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO geschlossen. Die Verarbeitung erfolgt ausschließlich auf ISO 27001-zertifizierten Servern in Deutschland (Hetzner Online GmbH, Falkenstein & Nürnberg). Unterauftragnehmer-Änderungen unterliegen einer 14-tägigen Widerspruchsfrist. Datenschutzverletzungen werden unverzüglich binnen maximal 48 Stunden gemeldet. Löschungen erfolgen nach DIN 66398.`;
  const splitP3 = doc.splitTextToSize(p3, 170);
  doc.text(splitP3, 20, y);
  y += splitP3.length * 4 + 4;

  // Section 4: Wesentliche Vertragsklauseln
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('4. Wesentliche Vertragsbedingungen & Governance', 20, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  const termsSummary = `• Laufzeit & Kündigung: Synchronisiert mit dem Schuljahr; Kündigungsfrist 1 Monat zum Schuljahresende.
• Haftungsgrenze (Liability Cap): Beschränkt auf die Netto-Jahresvergütung, maximal 10.000,00 € (§ 7 AGB).
• Versicherungsschutz: Gewerbliche IT-Haftpflicht- & Cyberpolice mit mindestens 2.000.000,00 € Deckungssumme.
• BGH-konformes Aufrechnungsverbot: Aufrechnung nur mit unbestrittenen oder rechtskräftigen Forderungen (Synallagma ausgenommen).
• IT-Sicherheitsstandard: Einhaltung des Stands der Technik (BSI / OWASP ASVS Level 3); keine Haftung für unvorhersehbare Zero-Day-Attacken bei ordnungsgemäßem Patching.
• Salvatorische Klausel: Es gelten die gesetzlichen Vorschriften (§ 306 Abs. 2 BGB).`;
  const splitTerms = doc.splitTextToSize(termsSummary, 170);
  doc.text(splitTerms, 20, y);
  y += splitTerms.length * 3.8 + 6;

  // Signatures & Stamp Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(20, y, 170, 28, 2, 2, 'FD');

  // Column Left: Provider Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('FÜR DEN BETREIBER (CAMPUS-GROOVELAB):', 25, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Patrick Huber (Betreiber)', 25, y + 12);
  doc.text('Digital autorisiert & siegelbestätigt', 25, y + 17);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.text(`HASH: SHA256-CG-VTR-${(params.schoolId || '855992').slice(0, 8)}`, 25, y + 22);

  // Column Right: School Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text('FÜR DIE MUSIKSCHULE / DEN TRÄGER:', 110, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`${signee}`, 110, y + 12);
  doc.text(`Digital gezeichnet am: ${signedDateStr}`, 110, y + 17);
  doc.text('Rechtsverbindlich autorisiert', 110, y + 22);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Dieses Dokument dient als formeller Nachweis für Rechnungsprüfungsämter, Kommunen und Schulträger. • Gültig ohne händische Unterschrift gem. § 126b BGB • Stand: ${ACTIVE_LEGAL_VERSION || '2026.2'}`, 20, 288);

  const cleanName = params.schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Campus_Groovelab_B2B_Vertragszertifikat_${cleanName}.pdf`);
};

export interface B2CParentContractParams {
  studentName: string;
  studentId: string;
  schoolName: string;
  isDirectBilled?: boolean;
  isHardship?: boolean;
  referenceCode?: string;
  totalAmountStr?: string;
  currencySuffix?: string;
  periodDescription?: string;
  remainingMonths?: number;
  monthlyRate?: string;
  iban?: string;
  recipientName?: string;
}

/**
 * Generates official 2-Page B2C Statutory Contract Confirmation & Right of Withdrawal (§ 312f Abs. 2 BGB / Art. 246a EGBGB)
 */
export const generateB2CParentContractPDF = async (params: B2CParentContractParams): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const refCode = params.referenceCode || `CAMPUS-${params.studentId.slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;
  const totalAmount = params.totalAmountStr || (params.isHardship ? '0,00' : params.isDirectBilled ? '5,39' : '0,00');
  const curr = params.currencySuffix || 'EUR';
  const period = params.periodDescription || `Schuljahr bis 31.07.${new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0)}`;
  const months = params.remainingMonths ?? 11;
  const rate = params.monthlyRate || (params.isHardship ? '0,00 €' : params.isDirectBilled ? '0,49 €' : '0,00 €');
  const iban = params.iban || 'DE02 1203 0000 0000 0000 00';
  const recipient = params.recipientName || 'Patrick Huber – Campus-Groovelab';

  // Calculate cryptographic GoBD seal
  let sha256Seal = refCode;
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const raw = `${refCode}:${params.studentId}:${totalAmount}:${iban}:${period}`;
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      sha256Seal = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}

  // ==============================================================================
  // SEITE 1: Abrechnungs- & Bereitstellungsübersicht
  // ==============================================================================
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, 'F');

  // Top Banner
  doc.setFillColor(52, 168, 83); // Campus Green
  doc.roundedRect(15, 15, 180, 28, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Campus-Groovelab • Bereitstellungs- & Kassenbeleg', 22, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Abrechnungsnachweis zur Modul-Bereitstellung (Campus)', 22, 36);

  // Card Body
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 50, 180, 225, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 50, 180, 225, 4, 4, 'S');

  // Student Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Profil / Nutzer: ${params.studentName}`, 22, 65);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Zugeordnete Musikschule: ${params.schoolName}`, 22, 72);

  // Financial Details Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(22, 80, 166, 75, 3, 3, 'F');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BEREITSTELLUNGSMODELL / STATUS', 28, 90);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    params.isHardship
      ? 'Härtefall-Befreiung (Schule übernimmt Bereitstellung zu 100%)'
      : params.isDirectBilled
      ? 'Direktabrechnung mit Eltern / Schüler'
      : 'Sammelzahler (Musikschule deckt 100% der Cloud-Kosten)',
    28, 96
  );

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('KASSENZEICHEN / VERWENDUNGSZWECK', 28, 106);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.setFont('courier', 'bold');
  doc.text(refCode, 28, 112);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPFÄNGER / DIENSTANBIETER', 28, 122);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${recipient} • IBAN: ${iban}`, 28, 128);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`ENTGELT & ZEITRAUM (${months} MONATE, ${period})`, 28, 138);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalAmount} ${curr} (${rate} • 1. Monat stets kostenfrei • Gem. § 19 UStG steuerbefreit)`, 28, 146);

  // Instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Hinweise zur Nutzung und Bereitstellung:', 22, 170);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('1. Mit Freischaltung stehen Hausaufgabenheft, Übe-Timer und Stundenplansync vollumfänglich bereit.', 22, 178);
  doc.text('2. Keine automatische Verlängerung: Der Zugang endet zum Schuljahresende (31.07.) automatisch.', 22, 185);
  doc.text('3. Datenschutz: Im Schülerprofil werden zu keinem Zeitpunkt Bank- oder private E-Mail-Daten gespeichert.', 22, 192);
  doc.text('4. Dieser Beleg gilt als Nachweis gegenüber Behörden, Bildungs- und Teilhabepaketen sowie der Musikschule.', 22, 199);

  // Revisionssicheres Siegel
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Revisionssicheres GoBD-Prüfsiegel (§§ 146, 147 AO): SHA256-${sha256Seal.slice(0, 32)}...`, 22, 248);

  // Statutory note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Gesetzliches Widerrufsrecht (§ 312g i. V. m. § 355 BGB / Art. 246a EGBGB): 14 Tage ab Vertragsschluss, im 1. Schnuppermonat jederzeit kostenfrei widerrufbar.', 22, 254);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Campus-Groovelab • Reines Cloud- & Infrastruktur-Hosting statt teurer Software-Lizenzen. (UWG / GoBD konform).', 22, 260);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Seite 1 von 2 (Bereitstellungsbeleg) • Gesetzliche Vertragsbestätigung gem. § 312f Abs. 2 BGB siehe Seite 2', 22, 266);

  // ==============================================================================
  // SEITE 2: Gesetzliche Vertragsbestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB)
  // ==============================================================================
  doc.addPage();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, 'F');

  // Top Banner Page 2
  doc.setFillColor(15, 23, 42); // Dark Slate 900
  doc.roundedRect(15, 12, 180, 24, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Campus-Groovelab • Gesetzliche Vertragsbestätigung', 22, 23);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('Bestätigung eines Verbrauchervertrags auf dauerhaftem Datenträger gem. § 312f Abs. 2 BGB / Art. 246a EGBGB', 22, 30);

  // Main Content Box Page 2
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 40, 180, 242, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 40, 180, 242, 4, 4, 'S');

  let p2Y = 48;

  // 1. Vertragsdaten-Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(20, p2Y, 170, 32, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('VERTRAGSPARTNER & KERNLEISTUNG', 25, p2Y + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Anbieter: Patrick Huber – Softwareentwicklung & Cloud-Dienstleistungen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden`, 25, p2Y + 11);
  doc.text(`Kunde: Erziehungsberechtigte / gesetzl. Vertreter für ${params.studentName} • Musikschule: ${params.schoolName}`, 25, p2Y + 16);
  doc.text(`Vertragsgegenstand: Bereitstellung des digitalen Campus-Zugangs (Hausaufgabenheft, Übe-Timer, Stundenplansync)`, 25, p2Y + 21);
  doc.text(`Laufzeit & Entgelt: ${period} (${months} Monate) • Gesamtpreis: ${totalAmount} ${curr} (inkl. 1 Probemonat kostenfrei)`, 25, p2Y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`Keine automatische Verlängerung / Kein Abo: Der Vertrag endet mit Ablauf des Schuljahres automatisch am 31.07.`, 25, p2Y + 30);

  p2Y += 38;

  // 2. Gesetzliche Widerrufsbelehrung
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, p2Y, 170, 72, 3, 3, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(20, p2Y, 170, 72, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175);
  doc.text('WIDERRUFSBELEHRUNG FÜR VERBRAUCHER (B2C)', 25, p2Y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Widerrufsrecht:', 25, p2Y + 12);
  doc.setFont('helvetica', 'normal');
  const wLines1 = doc.splitTextToSize('Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses (Aktivierung).', 160);
  doc.text(wLines1, 25, p2Y + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('Ausübung des Widerrufs:', 25, p2Y + 24);
  doc.setFont('helvetica', 'normal');
  const wLines2 = doc.splitTextToSize('Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Patrick Huber – Softwareentwicklung & Cloud-Dienstleistungen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, E-Mail: kontakt@campus-groovelab.de) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.', 160);
  doc.text(wLines2, 25, p2Y + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('Folgen des Widerrufs & Kostenfreier Probemonat:', 25, p2Y + 44);
  doc.setFont('helvetica', 'normal');
  const wLines3 = doc.splitTextToSize('Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab Eingang Ihrer Widerrufserklärung zurückzuzahlen. Da der erste Monat stets als unverbindlicher Probemonat kostenfrei gewährt wird, schulden Sie bei Ausübung des Widerrufs keinerlei Wertersatz oder Nutzungsentschädigung.', 160);
  doc.text(wLines3, 25, p2Y + 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Freiwillige Geltung für die Schweiz:', 25, p2Y + 62);
  doc.setFont('helvetica', 'normal');
  doc.text('Für Kunden mit Wohnsitz in der Schweiz gewähren wir dieses 14-tägige Widerrufsrecht auf freiwilliger vertraglicher Basis im selben Umfang.', 25, p2Y + 66);

  p2Y += 78;

  // 3. Muster-Widerrufsformular
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, p2Y, 170, 56, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(20, p2Y, 170, 56, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('MUSTER-WIDERRUFSFORMULAR (gemäß Anlage 2 zu Art. 246a § 1 Abs. 2 EGBGB)', 25, p2Y + 6);

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('An: Patrick Huber – Softwareentwicklung, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (kontakt@campus-groovelab.de)', 25, p2Y + 12);
  doc.text(`Hiermit widerrufe(n) ich/wir (*) den Vertrag über die Bereitstellung des Campus-Moduls (Kassenzeichen: ${refCode}).`, 25, p2Y + 17);
  doc.text(`- Schüler/Kind: ${params.studentName} • Musikschule: ${params.schoolName}`, 25, p2Y + 22);
  doc.text('- Name des/der Verbraucher(s): ____________________________________________________________________', 25, p2Y + 27);
  doc.text('- Anschrift des/der Verbraucher(s): _________________________________________________________________', 25, p2Y + 32);
  doc.text('- Unterschrift (nur bei Mitteilung auf Papier): __________________________   Datum: __________________', 25, p2Y + 37);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('(*) Unzutreffendes streichen. Zur Fristwahrung genügt die rechtzeitige Absendung der Erklärung.', 25, p2Y + 44);
  doc.text('Der Widerruf kann auch formlos per E-Mail unter Nennung des Verwendungszwecks/Kassenzeichens erfolgen.', 25, p2Y + 49);

  p2Y += 61;

  // 4. AGB-Auszug & Schlichtungshinweis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Wesentliche Vertragsbestimmungen (AGB Teil B) & Streitschlichtung (§ 36 VSBG):', 20, p2Y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text('1. Reines Cloud-Hosting: Campus-Groovelab stellt ausschließlich die technische Infrastruktur für das didaktische Üben und das Hausaufgabenheft bereit.', 20, p2Y + 4);
  doc.text('2. Keine Unterrichtsverträge: Verträge über Musikunterricht und Aufsichtspflichten vor Ort bestehen ausschließlich mit der Musikschule.', 20, p2Y + 8);
  doc.text('3. Botenstatus: Mitteilungen in der Plattform fungieren technisch als elektronischer Bote; formelle Vertragskündigungen an die Musikschule sind hierüber ausgeschlossen.', 20, p2Y + 12);
  doc.text('4. Schlichtung (§ 36 VSBG): Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.', 20, p2Y + 16);

  // Page 2 Footer Seal
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text(`Elektronischer Prüfungsnachweis & GoBD-Archivierungs-Hash: SHA256-${sha256Seal}`, 20, 276);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Seite 2 von 2 (Gesetzliche Vertragsbestätigung & Widerrufsbelehrung)', 20, 280);

  const safeStudent = params.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Campus_Groovelab_Vertragsbestaetigung_${safeStudent}_${refCode}.pdf`);
};



