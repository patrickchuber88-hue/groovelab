/**
 * 🏛️ Campus-Groovelab Sponsor Pitch PDF Generator
 * 
 * 0.1% Monolith Goldstandard for Professional Sponsoring Handouts
 * Standards: DIN 5008 / BMF Sponsoring-Erlass (§ 4 Abs. 4 EStG) / Swiss Editorial Typography
 * Naming: Förderpartner • Bildungspartner • Haupt-Bildungspartner (Branchenexklusiv in der App)
 * 
 * Generates an authoritative 2-page DIN A4 business exposé for music schools
 * to directly acquire local sponsors (craft businesses, SMEs, regional banks).
 * Guarantees collision immunity, zero outbound ad links, 100% in-app deliverables,
 * 11-month dynamic calculation, and mathematically proportional tier pricing.
 */

import { cleanPdfText } from './pdfTypographyEngine';

export interface SponsorPitchTierPrices {
  bronze?: number;
  silber?: number;
  gold?: number;
}

export interface SponsorPitchPdfData {
  schoolName: string;
  schoolStreet?: string;
  schoolZipCity?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  studentCount?: number;
  schoolYear?: string;
  principalName?: string;
  customTierPrices?: SponsorPitchTierPrices;
  returnBlob?: boolean;
}

export const generateSponsorPitchPDF = async (data: SponsorPitchPdfData): Promise<Blob | void> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  const schoolName = cleanPdfText(data.schoolName || 'Musikschule');
  const schoolStreet = cleanPdfText(data.schoolStreet || '');
  const schoolZipCity = cleanPdfText(data.schoolZipCity || '');
  const schoolContact = cleanPdfText(
    data.schoolEmail && data.schoolEmail !== 'test'
      ? `${data.schoolEmail}${data.schoolPhone && data.schoolPhone !== 'test' ? ' · Tel: ' + data.schoolPhone : ''}`
      : (data.schoolPhone && data.schoolPhone !== 'test' ? data.schoolPhone : 'sekretariat@musikschule.de')
  );
  const studentCount = data.studentCount && data.studentCount > 0 ? data.studentCount : 350;
  const schoolYear = cleanPdfText(data.schoolYear || '2026/2027');
  const principalName = cleanPdfText(data.principalName || 'Die Schulleitung');

  // 11 Monate à 0,49 € = 5,39 € pro Schüler und Schuljahr (1. Monat ist immer 100% kostenlos)
  const studentCostPerYear = 5.39;

  // Voll-proportionale Schüler-Skalierung gem. 0,1% Goldstandard
  const bronzePupils = Math.max(1, Math.round(studentCount * 0.20));
  const silberPupils = Math.max(1, Math.round(studentCount * 0.50));
  const goldPupils = studentCount;

  // Dynamische Preise (gerundet auf volle Euro) oder Schulleitungs-Override
  const bronzePrice = data.customTierPrices?.bronze && data.customTierPrices.bronze > 0
    ? data.customTierPrices.bronze
    : Math.max(25, Math.round(bronzePupils * studentCostPerYear));

  const silberPrice = data.customTierPrices?.silber && data.customTierPrices.silber > 0
    ? data.customTierPrices.silber
    : Math.max(50, Math.round(silberPupils * studentCostPerYear));

  const goldPrice = data.customTierPrices?.gold && data.customTierPrices.gold > 0
    ? data.customTierPrices.gold
    : Math.max(100, Math.round(goldPupils * studentCostPerYear));

  // Palette (Swiss Editorial Typography)
  const primaryGreen = [22, 163, 74];    // #16a34a (Emerald)
  const primaryAmber = [217, 119, 6];    // #d97706 (Warm Gold/Amber)
  const darkSlate = [15, 23, 42];        // #0f172a
  const bodySlate = [51, 65, 85];        // #334155
  const mutedSlate = [100, 116, 139];    // #64748b
  const cardBg = [248, 250, 252];        // #f8fafc
  const cardBorder = [226, 232, 240];    // #e2e8f0

  doc.setProperties({
    title: `Sponsoren-Exposé ${schoolYear} - ${schoolName}`,
    subject: 'Regionale Bildungspartnerschaft für digitale Musikbildung',
    author: schoolName,
    creator: 'Campus-Groovelab Sponsoren-Suite'
  });

  // ==========================================
  // SEITE 1: EMOTIONALER VALUE & SICHTBARKEIT
  // ==========================================

  // Top Accent Banner (Emerald & Amber Dual Stripe)
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 140, 4, 'F');
  doc.setFillColor(primaryAmber[0], primaryAmber[1], primaryAmber[2]);
  doc.rect(140, 0, 70, 4, 'F');

  let y = 18;

  // Header Left: Schulname & Auszeichnung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('OFFIZIELLE BILDUNGSINITIATIVE ' + schoolYear.toUpperCase(), 20, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(schoolName, 20, y);

  // Header Right: Dokumenten-Klassifizierung
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryAmber[0], primaryAmber[1], primaryAmber[2]);
  doc.text('UNTERNEHMER-EXPOSÉ', 190, y - 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('Gültig für das Schuljahr ' + schoolYear, 190, y + 1, { align: 'right' });

  y += 4;
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);

  // Hero Headline
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Werden Sie Bildungspartner unserer Musikschule:', 20, y);

  y += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Regionale Bildungsförderung: Stärken Sie die Jugend vor Ort.', 20, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
  const introText = cleanPdfText(
    `Als regional verwurzeltes Unternehmen tragen Sie maßgeblich zur Zukunft unserer Heimat bei. Mit einer Bildungspartnerschaft werden Sie zum offiziellen Hauptförderer der modernen digitalen Lern- und Übe-App unserer Musikschule. Dank Ihres Engagements erhalten unsere Schülerinnen und Schüler einen motivierenden interaktiven Übe-Begleiter für zu Hause – für die Familien zu 100 % gebührenfrei. Gleichzeitig präsentieren Sie Ihr Unternehmen ein ganzes Schuljahr lang als geschätzter Partner der musikalischen Bildung und erreichen Eltern, Entscheidungsträger und künftige Ausbildungsinteressierte direkt im Alltag.`
  );
  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, 20, y);
  y += splitIntro.length * 4.6 + 6;

  // Section Header: Gegenleistungen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Ihre konkreten Gegenleistungen als Bildungspartner:', 20, y);

  y += 5.5;

  // 3 Schweizer Editorial Benefit Cards (01, 02, 03)
  const drawEditorialCard = (cardY: number, numStr: string, title: string, desc: string) => {
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.roundedRect(20, cardY, 170, 21.5, 2.5, 2.5, 'FD');

    // Schweizer Ziffer 01, 02, 03
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(numStr, 25, cardY + 9.5);

    // Feine vertikale Trennlinie
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.4);
    doc.line(34, cardY + 4, 34, cardY + 17.5);

    // Text Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(cleanPdfText(title), 38, cardY + 7.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
    const splitDesc = doc.splitTextToSize(cleanPdfText(desc), 148);
    doc.text(splitDesc, 38, cardY + 12);
  };

  drawEditorialCard(
    y,
    '01',
    'Repräsentatives Förderer-Badge im geschützten Eltern-Portal',
    'Ihr Unternehmen wird als offizieller Bildungspartner mit Firmen-Badge und Danksagung im geschützten Elternbereich verankert. Sie erreichen Familien und qualifizierte Fachkräfte direkt im privaten Bildungsumfeld.'
  );

  y += 25;
  drawEditorialCard(
    y,
    '02',
    'Ungestörte Markenwirkung beim App-Start (Zero Clutter)',
    'Schüler und Eltern erleben eine geschützte Lernumgebung ohne störende Werbebanner. Die Aufmerksamkeit gehört ganz Ihnen: Bei jedem Start der App erscheint Ihr offizieller Förderhinweis: "Ermöglicht durch [Ihr Betrieb], [Ort]".'
  );

  y += 25;
  drawEditorialCard(
    y,
    '03',
    '100% steuerlich abzugsfähige Betriebsausgabe (BMF-Sponsoringerlass)',
    'Keine Spenden-Bürokratie: Da wir für Sie eine offizielle Gegenleistung erbringen, ist Ihr Beitrag nach dem BMF-Erlass (§ 4 Abs. 4 EStG) zu 100% als reguläre Betriebsausgabe gewinnmindernd absetzbar (auf B2B-Rechnung).'
  );

  y += 29;

  // Schulleitungs-Zitat Box
  doc.setFillColor(240, 253, 244); // Light emerald
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, y, 170, 23, 3, 3, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.8);
  doc.setTextColor(21, 128, 61);
  const quoteText = cleanPdfText(
    `"Mit Ihrer Bildungspartnerschaft stärken Sie die musikalische Ausbildung unserer Kinder und Jugendlichen nachhaltig. Wir danken Ihnen herzlich für Ihr Vertrauen in unsere Nachwuchsarbeit!"`
  );
  const splitQuote = doc.splitTextToSize(quoteText, 160);
  doc.text(splitQuote, 25, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`- ${principalName}, ${schoolName}`, 25, y + 18);

  // Footer Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text(`Seite 1 von 2 - ${schoolName} - Sponsoren-Exposé ${schoolYear}`, 20, 287);
  doc.text('Bitte wenden für Förderpakete & Rückmeldebogen ->', 190, 287, { align: 'right' });

  // ==========================================
  // SEITE 2: PAKETE, STEUER-PROOF & BUCHUNG
  // ==========================================
  doc.addPage();

  // Top Stripe Page 2
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, 210, 4, 'F');

  y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('TRANSPARENTE JAHRESPAUSCHALEN OHNE ABO-FALLE', 20, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Ihre Förderoptionen für das Schuljahr ' + schoolYear, 20, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('Alle Beiträge enden verbindlich mit dem Schuljahresende. Keine stillschweigende Verlängerung.', 20, y);

  y += 7;

  // 3 TIER COLUMNS (REINE IN-APP GEGENLEISTUNGEN OHNE METALL-BEZEICHNUNGEN)
  const colWidth = 52;
  const colGap = 7;
  const colHeight = 78;

  // 1. Förderpartner (Basis)
  let colX = 20;
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(colX, y, colWidth, colHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('NACHWUCHS-FÖRDERUNG', colX + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Förderpartner', colX + 4, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${bronzePrice},- EUR`, colX + 4, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('pro Schuljahr (B2B-Pauschale)', colX + 4, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
  doc.text(`- ca. ${bronzePupils} Schüler ausgestattet`, colX + 4, y + 34);
  doc.text('- Förderer-Nennung im Elternportal', colX + 4, y + 41);
  doc.text('- 100% BMF-Betriebsausgabe', colX + 4, y + 48);
  doc.text('- Feste Jahrespauschale (kein Abo)', colX + 4, y + 55);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('Ideal für lokale Betriebe & Praxen', colX + 4, y + 72);

  // 2. Bildungspartner (Mittelstand - EMPFOHLEN)
  colX += colWidth + colGap;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(colX, y, colWidth, colHeight, 3, 3, 'FD');
  doc.setLineWidth(0.5);

  // Badge "Empfehlung"
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.roundedRect(colX + colWidth - 24, y - 2.5, 22, 5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EMPFOHLEN', colX + colWidth - 13, y + 1, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('BILDUNG & AKADEMIE', colX + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Bildungspartner', colX + 4, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text(`${silberPrice},- EUR`, colX + 4, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('pro Schuljahr (B2B-Pauschale)', colX + 4, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
  doc.text(`- ca. ${silberPupils} Schüler ausgestattet`, colX + 4, y + 34);
  doc.setFont('helvetica', 'bold');
  doc.text('- Bildungspartner-Badge bei Eltern', colX + 4, y + 41);
  doc.setFont('helvetica', 'normal');
  doc.text('- Förderhinweis beim App-Start', colX + 4, y + 48);
  doc.text('- 100% BMF-Betriebsausgabe', colX + 4, y + 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Stärkste Resonanz bei Familien', colX + 4, y + 72);

  // 3. Hauptförderer (BRANCHENEXKLUSIV)
  colX += colWidth + colGap;
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(colX, y, colWidth, colHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryAmber[0], primaryAmber[1], primaryAmber[2]);
  doc.text('BRANCHENEXKLUSIV', colX + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Hauptförderer', colX + 4, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`${goldPrice},- EUR`, colX + 4, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('pro Schuljahr (B2B-Pauschale)', colX + 4, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
  doc.text(`- Alle ${goldPupils} Schüler (Gesamtschule)`, colX + 4, y + 34);
  doc.setFont('helvetica', 'bold');
  doc.text('- Hauptförderer-Badge bei Eltern', colX + 4, y + 41);
  doc.setFont('helvetica', 'normal');
  doc.text('- Dauerpräsenz Pos. 1 beim Start', colX + 4, y + 48);
  doc.setFont('helvetica', 'bold');
  doc.text('- Branchenexklusivität in der App', colX + 4, y + 55);
  doc.setFont('helvetica', 'normal');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('Maximales regionales Prestige', colX + 4, y + 72);

  y += colHeight + 8;

  // DER TEAR-OFF / BUCHUNGS-COUPON (KOLLISIONSFREI NACH DIN 5008)
  doc.setDrawColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(20, y, 190, y);
  doc.setLineDashPattern([], 0); // Reset

  y += 5.5;
  // Zeile 1: Coupon-Headline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Antwort-Coupon: Wir werden Bildungspartner ' + schoolYear, 20, y);

  // Zeile 2: Sub-Instruktion mit Kontakt auf eigener Zeile (Kollisionsschutz!)
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('Einfach ausfüllen und per E-Mail senden an: ' + schoolContact, 20, y);

  y += 4.5;

  // Formular-Felder Box
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
  doc.roundedRect(20, y, 170, 52, 2.5, 2.5, 'FD');

  const drawFormField = (fx: number, fy: number, fw: number, fh: number, label: string) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.roundedRect(fx, fy, fw, fh, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(label.toUpperCase(), fx + 2.5, fy + 4);
  };

  // Row 1
  drawFormField(24, y + 4, 80, 12, 'Firma & Rechtsform:');
  drawFormField(108, y + 4, 78, 12, 'Ansprechpartner/in & Funktion:');

  // Row 2
  drawFormField(24, y + 19, 80, 12, 'Strasse & Hausnummer / PLZ Ort:');
  drawFormField(108, y + 19, 78, 12, 'E-Mail für Rechnungsversand:');

  // Row 3: Checkboxes mit Naming ohne Metall-Begriffe
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Gewähltes Förderpaket:', 25, y + 36);

  doc.roundedRect(25, y + 39, 4, 4, 1, 1, 'S');
  doc.setFont('helvetica', 'normal');
  doc.text(`Förderpartner (${bronzePrice} EUR)`, 32, y + 42.5);

  doc.roundedRect(82, y + 39, 4, 4, 1, 1, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text(`Bildungspartner (${silberPrice} EUR)`, 89, y + 42.5);

  doc.roundedRect(139, y + 39, 4, 4, 1, 1, 'S');
  doc.setFont('helvetica', 'normal');
  doc.text(`Hauptförderer (${goldPrice} EUR)`, 146, y + 42.5);

  // Row 4: Signature Line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text('Ort, Datum:', 25, y + 49);
  doc.line(42, y + 49, 90, y + 49);

  doc.text('Rechtsverbindliche Unterschrift / Firmenstempel:', 108, y + 49);
  doc.line(165, y + 49, 185, y + 49);

  // Footer Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text(`Rechtssicherheit: 100% GoBD- & BMF-konforme Sponsoringrechnung (§ 4 Abs. 4 EStG) - ${schoolName}`, 20, 287);
  doc.text('Seite 2 von 2', 190, 287, { align: 'right' });

  if (data.returnBlob) {
    return doc.output('blob');
  }

  // Automatic download with clean filename
  const cleanFilename = `Sponsoren_Expose_${schoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${schoolYear.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(cleanFilename);
};
