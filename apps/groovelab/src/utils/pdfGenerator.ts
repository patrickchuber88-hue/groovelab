import jsPDF from 'jspdf';

export const generateConsentPDF = (
  schoolName: string, 
  activePlatform: 'campus' | 'groovelab' | 'both', 
  studentBillingOption?: string
) => {
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
  let costDesc = 'Die Musikschule übernimmt alle Aktivierungsgebühren.';
  let costDetailText = 'Die Nutzung dieser App ist für Sie und Ihr Kind vollständig kostenlos. Sämtliche Lizenz-, Hosting- und Bereitstellungsgebühren werden im Rahmen des Schulbetriebs zu 100% von der Musikschule getragen. Es entstehen Ihnen keine versteckten Kosten.';

  if (studentBillingOption === 'student_full') {
    costTitle = '0,49 € / MONAT';
    costDesc = 'Monatsbeitrag für den App-Zugang (Direktabrechnung).';
    costDetailText = 'Für die Nutzung der App fällt ein geringer Betrag von 0,49 € inkl. MwSt. pro Monat an (bzw. 5,88 € als Jahresbeitrag). Die Abrechnung erfolgt direkt mit den Erziehungsberechtigten gemäß den Vorgaben der Musikschule.';
  } else if (studentBillingOption === 'student_partial') {
    costTitle = '0,40 € / MONAT';
    costDesc = 'Eigenanteil der Eltern (Musikschule bezuschusst 0,09 €).';
    costDetailText = 'Für die Nutzung der App fällt für Sie ein Eigenanteil von 0,40 € inkl. MwSt. pro Monat an (bzw. 4,80 € als Jahresbeitrag). Die verbleibenden 0,09 € monatlich übernimmt die Musikschule als Zuschuss für das Profil.';
  }

  // GrooveLab is always covered by the school, override if platform is solely GrooveLab
  if (activePlatform === 'groovelab') {
    costTitle = '100% KOSTENLOS';
    costDesc = 'Kosten für die Band-Aktivierung trägt die Schule.';
    costDetailText = 'Die Nutzung des GrooveLab-Moduls ist für Sie und Ihr Kind vollständig kostenlos. Alle anfallenden Lizenz- und Hosting-Gebühren werden zu 100% von der Musikschule übernommen.';
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
  doc.text('RECHTLICHE GARANTIEN & DATENSCHUTZ-STANDARDS:', 20, currentY);
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

export const generateDSBCompliancePDF = (schoolName: string) => {
  const doc = new jsPDF();

  doc.setProperties({
    title: 'DSB-Freigabepaket & TOM-Datenblatt - Campus-Groovelab',
    subject: 'Datenschutz-Folgenabschätzung (DSFA), TOMs & AVV-Freigabedossier',
    author: 'Campus-Groovelab Enterprise Security',
    creator: 'Campus-Groovelab Platform'
  });

  const primaryGreen = [52, 168, 83];
  const darkSlate = [15, 23, 42];
  const mutedText = [100, 116, 139];

  // Header Bar
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Datenschutz- & IT-Sicherheitsdossier', 20, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Offizielles DSB-Freigabepaket für Kommunen & Träger • Schulpartner: ${schoolName}`, 20, 28);
  doc.line(20, 32, 190, 32);

  let y = 40;

  // Box: Executive Audit Summary
  doc.setFillColor(230, 244, 234);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(20, y, 170, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('🛡️ Compliance-Garantie: 22 / 22 Sicherheits- & Datenschutz-Standards Aktiv', 25, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Hosting 100% in Deutschland (Hetzner ISO 27001) • 0% US-Cloud-Act Risiko • Privacy by Design', 25, y + 15);

  y += 30;

  // Section 1: DSFA (Art. 35 DSGVO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. Muster-Datenschutz-Folgenabschätzung (DSFA nach Art. 35 DSGVO)', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const dsfaText = [
    '• Risikoanalyse Minderjährige: Extrem niedriges Schutzbedarf-Risiko durch konsequente Datenminimierung.',
    '• Keine Erfassung von Schüler-E-Mails, Wohnadressen oder SEPA-/Bankverbindungen.',
    '• Pflichtmaskierung von Nachnamen im Betrieb (Vorname + N.) zur Verhinderung von Schulterblick-Spionage.',
    '• Automatische Hardware-Mikrofon-Abschaltung beim Verlassen aller Audio-Module.',
    '• 48-Stunden Auto-Freeze für Chat-Nachrichten zur Wahrung des Dienst- & Persönlichkeitsrechts.'
  ];
  dsfaText.forEach(line => {
    doc.text(line, 22, y);
    y += 5;
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
    ['Append-Only Audit Logs:', 'WORM-Prinzip in Postgres – Logs für Admins & Nutzer unmodifizierbar.'],
    ['Content Security Policy:', 'Strikte CSP (script-src self) schützt vor Cross-Site Scripting (XSS).'],
    ['PIN & Passwort Hashing:', 'Kryptografische Einweg-Hashes mit serverseitigem Pepper (außerhalb DB).'],
    ['Infrastruktur Throttling:', 'Netzwerk-Rate-Limiting (Kong/Nginx) schützt vor Brute-Force & DDoS.'],
    ['Background-Blurring:', 'Automatisches Unscharfschalten (blur: 16px) bei Tab- oder App-Wechsel.'],
    ['Offsite-Backups:', 'Tägliche verschlüsselte Backups (AES-256) inkl. automatisierter Restore-Tests.']
  ];

  toms.forEach(([label, desc]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(`• ${label}`, 22, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(desc, 68, y);
    y += 5;
  });

  y += 6;

  // Section 3: AVV & Host Status (Art. 28 DSGVO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('3. Auftragsverarbeitungs-Vereinbarung (AVV nach Art. 28 DSGVO)', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('• Hosting-Infrastruktur: High-Security Rechenzentren der Hetzner Online GmbH (Falkenstein/Sachsen).', 22, y); y += 5;
  doc.text('• Zertifizierung: ISO 27001 zertifizierter Serverstandort Deutschland.', 22, y); y += 5;
  doc.text('• Cloud-Act Befreiung: Keine Einbindung US-amerikanischer Cloud-Unternehmen als Unterauftragnehmer.', 22, y); y += 10;

  // Footer Signoff
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Ausgestellt für: ${schoolName} • Erstellt über Campus-Groovelab Enterprise Trust Center`, 20, 280);

  doc.save(`DSB_Freigabepaket_TOM_AVV_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

