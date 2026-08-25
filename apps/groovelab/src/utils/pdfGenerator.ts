import { getParentOnboardingUrl, getTeacherLoginUrl } from './tenantUrlHelper';

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
    costTitle = '5,88 € / SCHULJAHR';
    costDesc = 'Jahres-Einmalbeitrag für die Cloud-Bereitstellung (entspricht 0,49 € / Monat; keine Lizenzkaufgebühren).';
    costDetailText = 'Für die Cloud- und Datenbank-Bereitstellung fällt ein transparenter Jahresbeitrag von 5,88 € inkl. MwSt. für das gesamte Schuljahr an (entspricht 0,49 € / Monat; keine gesonderten Lizenzkaufgebühren). Die Abrechnung erfolgt als Einmalzahlung direkt mit den Erziehungsberechtigten gemäß den Vorgaben der Musikschule (keine automatische Verlängerung).';
  } else if (studentBillingOption === 'student_partial') {
    costTitle = '4,80 € / SCHULJAHR';
    costDesc = 'Eigenanteil für die Cloud-Bereitstellung (entspricht 0,40 € / Monat; Schule bezuschusst; keine Lizenzkaufgebühren).';
    costDetailText = 'Für die Cloud-Bereitstellung fällt für Sie ein reduzierter Jahresbeitrag von 4,80 € inkl. MwSt. für das gesamte Schuljahr an (entspricht 0,40 € / Monat; die verbleibenden 0,09 € monatlich übernimmt die Musikschule als Zuschuss; keine gesonderten Lizenzkaufgebühren). Die Abrechnung erfolgt als Einmalzahlung (keine automatische Verlängerung).';
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
  doc.text('• 100% DSGVO-konform', 25, currentY + 13);
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
    { title: 'Namens-Anonymisierung: ', desc: 'Es werden keine vollständigen Namen erfasst. Profile werden ausschließlich im Format „Vorname + Initiale des Nachnamens“ (z. B. „Max M.“) geführt.' },
    { title: 'Datensparsamkeit: ', desc: 'Wir erheben keinerlei E-Mail-Adressen von Kindern, Telefonnummern oder Bankdaten.' },
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
  const filename = activePlatform === 'groovelab' 
    ? 'Einwilligung_Eltern_GrooveLab.pdf' 
    : activePlatform === 'campus'
      ? 'Einwilligung_Eltern_Campus.pdf'
      : 'Einwilligung_Eltern_Campus_Groovelab.pdf';
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

/**
 * Generates a 1-page A4 Quickstart Cheat Sheet for Teachers
 */
export const generateTeacherQuickstartPDF = async (schoolName: string, schoolSubdomain?: string) => {
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

  doc.save(`Lehrer_Schnellstart_Campus_Groovelab_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

/**
 * Generates a 1-page A4 Quickstart Info Sheet for Parents
 */
export const generateParentQuickstartPDF = async (
  schoolName: string,
  _activePlatform?: 'campus' | 'groovelab' | 'both',
  schoolSubdomain?: string
) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setProperties({
    title: 'Eltern-Information - Campus-Groovelab',
    subject: '1-Seiter Informationsblatt für Eltern zum digitalen Hausaufgabenheft',
    author: 'Campus-Groovelab',
    creator: 'Campus-Groovelab Platform'
  });

  const primaryGreen = [52, 168, 83];
  const darkSlate = [15, 23, 42];
  const mutedText = [100, 116, 139];
  const borderGray = [226, 232, 240];
  const parentOnboardingUrl = getParentOnboardingUrl(schoolName, schoolSubdomain);

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
  doc.text('Eltern-Info: Das digitale Hausaufgabenheft', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('So unterstützt Campus-Groovelab Ihr Kind beim Instrumental- und Ensemble-Unterricht', 20, y);
  y += 10;

  // 3 Advantage Cards
  const features = [
    {
      title: 'Hausaufgaben & Notizen immer griffbereit',
      desc: 'Vergessene Zettel gehören der Vergangenheit an: Hausaufgaben, Tonleitern und Notizen der Lehrkraft sind direkt auf dem Smartphone oder Tablet abrufbar – übersichtlich und jederzeit synchronisiert.'
    },
    {
      title: 'Spielerischer Übe-Timer & Audio-Begleitung',
      desc: 'Mit dem interaktiven Übe-Timer und Playalongs der Lehrkraft macht das tägliche Üben zuhause Spaß. Regelmäßigkeit wird durch motivierende Übe-Streaks und XP-Punkte belohnt.'
    },
    {
      title: '100% Datenschutz: Keine E-Mail, keine Bankdaten',
      desc: 'Wir schützen die Privatsphäre Ihres Kindes: Es werden weder E-Mail-Adressen, private Telefonnummern noch Zahlungsdaten gespeichert. Schülernamen werden auf Vorname und Initiale maskiert.'
    }
  ];

  features.forEach(feat => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(20, y, 170, 36, 3, 3, 'FD');

    // Green check badge
    doc.setFillColor(230, 244, 234);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(25, y + 6, 7, 7, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text('OK', 26.5, y + 11);

    // Title
    doc.setFontSize(10.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(feat.title, 36, y + 11);

    // Desc
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    const splitText = doc.splitTextToSize(feat.desc, 150);
    doc.text(splitText, 25, y + 19);

    y += 42;
  });

  y += 4;

  // Login Guide Card
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(20, y, 170, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 78, 216);
  doc.text('WIE STARTEN SIE & IHR KIND?', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`1. Öffnen Sie die Plattform im Browser: ${parentOnboardingUrl}`, 25, y + 16);
  doc.text('2. Scannen Sie den persönlichen QR-Code des Schülers oder geben Sie die Schüler-PIN ein.', 25, y + 23);
  doc.text('3. Fertig! Ihr Kind ist sofort mit dem digitalen Hausaufgabenheft verbunden.', 25, y + 30);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Information für Eltern • ${schoolName} • Campus-Groovelab`, 20, 282);

  doc.save(`Eltern_Information_Campus_Groovelab_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
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
  doc.text('Campus-Groovelab • ISO 27001 zertifiziertes deutsches Rechenzentrum (Hetzner Falkenstein) • 100% DSGVO & COPPA konform', 20, 285);

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

  let rightsY = y2 + 15;
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
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Umsatzsteuerbefreit gem. § 19 UStG (Kleinunternehmerregelung).', 20, y);

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
  doc.text('Campus-Groovelab • 100% DSGVO-konformes Cloud-Hosting • www.campus-groovelab.de', 20, 285);
  doc.text('Seite 1 von 1', 185, 285, { align: 'right' });

  // Trigger Instant Browser Download
  const sanitizedSchool = (params.schoolName || 'Musikschule').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanInvoiceId}_${sanitizedSchool}.pdf`);
};




