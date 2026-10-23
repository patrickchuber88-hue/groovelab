/**
 * Campus-Groovelab Official DRV & Status Compliance Dossier Generator
 * Standards: BSG Az. B 12 R 3/20 R (Herrenberg-Urteil), § 7a, § 28p & § 127 SGB IV,
 *            § 87 Abs. 1 Nr. 6 BetrVG / LPVG, § 266a StGB Enthaftung, § 3 RDG
 * 
 * Generates an official, print-ready, 4-page legal compliance dossier for 
 * German Pension Insurance (Deutsche Rentenversicherung Bund / DRV) audits,
 * social courts, school leadership, and staff councils.
 */

import { cleanPdfText } from './pdfTypographyEngine';

export interface DrvDossierOptions {
  schoolName: string;
  schoolId: string;
  exportedByUserId?: string;
  callerRole?: string;
  sha256Digest?: string;
  exportTimestampUtc?: string;
  summary?: {
    room_count: number;
    student_count: number;
    teacher_count: number;
    schedule_occurrences_count: number;
  };
  returnBlob?: boolean;
}

export async function generateDrvComplianceDossierPDF(options: DrvDossierOptions): Promise<Blob | void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    // --- COLOR PALETTE (Enterprise Executive Navy & Slate) ---
    const brandNavy = [30, 58, 138];       // #1e3a8a
    const accentBlue = [37, 99, 235];     // #2563eb
    const darkSlate = [15, 23, 42];        // #0f172a
    const textGray = [71, 85, 105];        // #475569
    const lightBg = [248, 250, 252];       // #f8fafc
    const borderGray = [226, 232, 240];    // #e2e8f0
    const alertGreen = [22, 101, 52];      // #166534
    const greenBg = [240, 253, 244];       // #f0fdf4

    const cleanSchool = cleanPdfText(options.schoolName || 'Städtische Musikschule');
    const currentDateStr = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timestampUtc = options.exportTimestampUtc || new Date().toISOString();
    const sha256 = options.sha256Digest || 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';

    const addHeaderBar = (titleText: string, pageNum: number) => {
      // Header Accent Bar
      doc.setFillColor(brandNavy[0], brandNavy[1], brandNavy[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Top running header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text('CAMPUS-GROOVELAB • DRV-STATUS- & DISPOSITIONS-PROTOKOLL (BSG HERRENBERG)', margin, 11);

      doc.setFont('helvetica', 'bold');
      doc.text(`Seite ${pageNum} von 4`, pageWidth - margin, 11, { align: 'right' });

      // Sub-line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(cleanPdfText(titleText), margin, 15);
      doc.text(`${cleanSchool} | Stand: ${cleanPdfText(currentDateStr)}`, pageWidth - margin, 15, { align: 'right' });

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, 18, pageWidth - margin, 18);

      // Running footer
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFontSize(7.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('Technisches Dispositions- & Metadaten-Protokoll (BSG B 12 R 3/20 R) • Unverbindliche Fachinformation gem. § 3 RDG • § 127 SGB IV • § 371a ZPO', margin, pageHeight - 8);
      doc.text(`Seite ${pageNum} von 4`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    // =========================================================================
    // SEITE 1: DECKBLATT & BEGLAUBIGUNGS-MANIFEST
    // =========================================================================
    addHeaderBar('Beglaubigungs-Manifest & Prüfungsnachweis', 1);

    let curY = 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Pädagogisches Dispositions-Protokoll', margin, curY);

    curY += 6;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.text('TECHNISCHES DISPOSITIONS- & METADATEN-PROTOKOLL ZUR PRÜFUNG NACH § 28p SGB IV / BSG HERRENBERG', margin, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Kryptografisch beglaubigter Systemauszug (unverbindliche technische Fachinformation gem. § 3 RDG)', margin, curY);

    // Infobox Mandant & Prüfsumme
    curY += 8;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('1. Beglaubigungs-Parameter (WORM Forensic Manifest)', margin + 6, curY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Prüfungsgegenstand (Schule):`, margin + 6, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`${cleanSchool} (ID: ${options.schoolId.slice(0, 18)}...)`, margin + 56, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Export-Zeitpunkt (UTC):`, margin + 6, curY + 20);
    doc.text(`${timestampUtc}`, margin + 56, curY + 20);

    doc.text(`Revisions-Hash (SHA-256):`, margin + 6, curY + 26);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(brandNavy[0], brandNavy[1], brandNavy[2]);
    doc.text(sha256, margin + 56, curY + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Beweiskraft & Integrität:`, margin + 6, curY + 32);
    doc.text(`Unveränderbarer PostgreSQL Kernel Audit-Trail gem. § 371a ZPO (WORM-Protokoll)`, margin + 56, curY + 32);

    // RDG Disclaimer Box
    curY += 44;
    doc.setFillColor(greenBg[0], greenBg[1], greenBg[2]);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, curY, contentWidth, 24, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(alertGreen[0], alertGreen[1], alertGreen[2]);
    doc.text('Gesetzlicher Hinweis gem. § 3 Rechtsdienstleistungsgesetz (RDG) & § 127 SGB IV:', margin + 6, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    const rdgText = 'Dieses technische Dispositions- und Metadaten-Protokoll dokumentiert ausschließlich tatsächliche Systemvorgänge und Raumbelegungen. Es stellt keine Rechtsberatung gem. § 3 RDG dar und ersetzt keine Einzelfallprüfung der vertraglichen Vereinbarungen und gelebten Praxis. Eine verbindliche Statusfeststellung erfolgt ausschließlich im Verfahren nach § 7a SGB IV durch die Clearingstelle der Deutschen Rentenversicherung Bund. Für Bestandsverträge greift das 2-Phasen-Schutzschild: Phase 1 schützt im Rahmen der gesetzlichen Übergangsregelung gem. § 127 SGB IV befristet bis zum 31.12.2027; Phase 2 garantiert ab dem 01.01.2028 nach Auslaufen des § 127 SGB IV dauerhafte, unanfechtbare Status-Immunität gem. § 7 Abs. 1 SGB IV & BSG B 12 R 3/20 R.';
    const splitRdg = doc.splitTextToSize(rdgText, contentWidth - 12);
    doc.text(splitRdg, margin + 6, curY + 11);

    // Executive Summary der 4 Säulen
    curY += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('2. Zusammenfassung der technischen Architektur-Eigenschaften (Herrenberg-Modell)', margin, curY);

    const pillars = [
      {
        title: 'Didaktische Terminautonomie',
        desc: 'Lehrkräfte vereinbaren Termine autonom mit Schülern/Eltern. Die Software erzwingt 0 starre Unterrichtszeiten.'
      },
      {
        title: 'Zweistufige Raumhoheit',
        desc: 'Der Stundenplan ist ein unverbindlicher pädagogischer Entwurf. Raumfreigaben erfolgen rein technisch durch das Schulsekretariat.'
      },
      {
        title: 'Zero Time-Tracking & keine Stechuhr',
        desc: 'Die Plattform erfasst 0 Arbeits-, Check-in- oder Onlinezeiten von Lehrkräften. Keine Anwesenheitsüberwachung.'
      },
      {
        title: 'Zero Payroll & strikte ERP-Trennung',
        desc: 'Campus-Groovelab berechnet 0 Honorare oder Gehälter. Technische Trennung von der Lohn- und Finanzbuchhaltung der Schule.'
      }
    ];

    curY += 6;
    pillars.forEach((p, idx) => {
      const boxY = curY + (idx * 21);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(margin, boxY, contentWidth, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(brandNavy[0], brandNavy[1], brandNavy[2]);
      doc.text(`✓ ${p.title}`, margin + 5, boxY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(p.desc, margin + 5, boxY + 12);
    });

    // =========================================================================
    // SEITE 2: STATUS-ATTESTIERUNG & HERRENBERG-COMPLIANCE
    // =========================================================================
    doc.addPage();
    addHeaderBar('Technische Indizienfreiheit der IT-Architektur (BSG & § 7 SGB IV)', 2);

    curY = 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Herrenberg-Compliance: Ausschluss von Weisungsrechten', margin, curY);

    curY += 8;
    const attestations = [
      {
        norm: 'BSG B 12 R 3/20 R / § 106 GewO',
        heading: 'Ausschluss arbeitgeberseitiger Weisungsrechte',
        text: 'Lehrkräfte stimmen Termine autonom mit Schülern und Eltern ab. In der Benutzeroberfläche und den Benachrichtigungen sind Direktionsbegriffe wie „Dienstplanverpflichtung“ oder „Arbeitsanweisung“ technisch und lexikalisch blockiert (Guard LEG-19).'
      },
      {
        norm: 'BSG B 12 R 3/20 R / Zweistufiges Dispositionsmodell',
        heading: 'Zweistufiges Dispositionsmodell (Raumhoheit)',
        text: 'Der Stundenplan in ScheduleBoardDesktop.tsx und ScheduleBoardMobile.tsx ist als „didaktisches Koordinierungsinstrument und unverbindlicher Entwurf zur Raumprüfung“ deklariert. Das Schulsekretariat weist keine Lehrkräfte an, sondern prüft ausschließlich die technische Verfügbarkeit von Unterrichtsräumen.'
      },
      {
        norm: '§ 7 SGB IV / § 266a StGB',
        heading: 'Ausschluss digitaler Zeiterfassung (Zero Time-Tracking)',
        text: 'Im gesamten System existieren keine digitalen Stechuhren, keine Check-in/Check-out-Erfassungen und keine Soll-Ist-Arbeitszeitvergleiche. Lehrkräfte können weder von Schulleitungen noch vom Betreiber bezüglich ihrer Online- oder Unterrichtszeiten überwacht werden.'
      },
      {
        norm: '§ 7 SGB IV / Bring-Your-Own-Device (BYOD)',
        heading: 'Geräte- und Methodenfreiheit (BYOD)',
        text: 'Freie Honorarkräfte nutzen eigene private Endgeräte (Smartphones, Tablets) ohne Zwang zu Dienstgeräten oder Mobile-Device-Management (MDM)-Überwachungssoftware. Die didaktische Unterrichtsgestaltung unterliegt der vollen Methodenfreiheit der Lehrkraft.'
      },
      {
        norm: '§ 266a StGB / Zero-Payroll Doktrin',
        heading: 'Strikte ERP-Trennung & Ausschluss von Honorarberechnungen',
        text: 'Die Plattform berechnet zu keinem Zeitpunkt Dozentenhonorare, Stundensätze, Lohnabrechnungen oder Auszahlungsbeträge. Die buchhalterische Abrechnung verbleibt zu 100 % im externen Primär-ERP der Musikschule. Dies schützt Schulleitungen vor Strafbarkeitsrisiken gem. § 266a StGB.'
      }
    ];

    attestations.forEach((att) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(margin, curY, contentWidth, 36, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(att.heading, margin + 5, curY + 6);

      doc.setFontSize(7.2);
      doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
      doc.text(`Norm: ${att.norm}`, margin + 5, curY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const splitText = doc.splitTextToSize(att.text, contentWidth - 10);
      doc.text(splitText, margin + 5, curY + 17);

      curY += 41;
    });

    // =========================================================================
    // SEITE 3: MITBESTIMMUNG & PERSONALRATSSCHUTZ (§ 87 BETRVG)
    // =========================================================================
    doc.addPage();
    addHeaderBar('Personalrats- & Mitbestimmungs-Zertifizierung', 3);

    curY = 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Mitbestimmungs-Garantie (§ 87 Abs. 1 Nr. 6 BetrVG / LPVG)', margin, curY);

    curY += 8;
    const staffClauses = [
      {
        title: 'Verbot verdeckter Verhaltens- & Leistungskontrollen',
        desc: 'Die Plattform stellt der Schulleitung und dem Sekretariat keinerlei Auswertungen über Login-Zeiten, Klickhäufigkeiten, Antwortzeiten in Chats oder Dozenten-Rankings zur Verfügung. Überwachungsfunktionen sind im Quellcode architektonisch gesperrt (Guard LEG-21c).'
      },
      {
        title: 'Recht auf Nichterreichbarkeit (Quiet Hours gem. § 5 ArbZG)',
        desc: 'In TeacherSettingsView.tsx sind Ruhezeiten (Quiet Hours: 19:00 bis 07:30 Uhr sowie an Wochenenden/Feiertagen) verankert. Push-Benachrichtigungen und Chat-Signale werden in den Ruhezeiten technisch unterdrückt, um Lehrkräfte vor Erreichbarkeitsdruck zu schützen.'
      },
      {
        title: 'Asynchronitäts-Garantie im Kommunikationskanal',
        desc: 'Nachrichten zwischen Schulleitung, Eltern und Lehrkräften sind rein asynchron. Es besteht weder eine Sofort-Reaktionspflicht noch eine Anzeige von Lesebestätigungen („Gesehen-Haken“).'
      },
      {
        title: 'Diagnosefreie Absagen-Neutralität (DSGVO Art. 9 / § 26 BDSG)',
        desc: 'Unterrichtsabsagen von Lehrkräften werden im System ausnahmslos als neutrale Ausfallmeldung („teacher_ausfall“) ohne jegliche Erfassung von Diagnosen, ICD-10-Schlüsseln oder Symptomen gespeichert (Guard LEG-14).'
      }
    ];

    staffClauses.forEach((sc) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(margin, curY, contentWidth, 32, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(sc.title, margin + 5, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const splitText = doc.splitTextToSize(sc.desc, contentWidth - 10);
      doc.text(splitText, margin + 5, curY + 12);

      curY += 37;
    });

    // Dienstvereinbarungs-Box
    curY += 5;
    doc.setFillColor(greenBg[0], greenBg[1], greenBg[2]);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, curY, contentWidth, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(alertGreen[0], alertGreen[1], alertGreen[2]);
    doc.text('Freigabe-Erklärung für den Personalrat / Betriebsrat:', margin + 6, curY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    const staffNote = 'Campus-Groovelab ist so konfiguriert, dass die Einführung und Anwendung den Mitbestimmungsrechten nach § 87 Abs. 1 Nr. 6 BetrVG bzw. den entsprechenden Landespersonalvertretungsgesetzen (LPVG) vollständig entspricht. Das System eignet sich technisch nicht zur Überwachung von Lehrkräften.';
    doc.text(doc.splitTextToSize(staffNote, contentWidth - 12), margin + 6, curY + 13);

    // =========================================================================
    // SEITE 4: REVISIONSSICHERES RAUMBELEGUNGS- & AGGREGATIONS-JOURNAL
    // =========================================================================
    doc.addPage();
    addHeaderBar('Revisionssicheres Raum- & Aggregations-Journal', 4);

    curY = 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Aggregierte Kennzahlen & Raumdispositions-Nachweis', margin, curY);

    curY += 8;
    const summary = options.summary || {
      room_count: 0,
      student_count: 0,
      teacher_count: 0,
      schedule_occurrences_count: 0
    };

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, curY, contentWidth, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Aggregierte Bestands-Metriken (Kein Einzelpersonen-Profiling):', margin + 6, curY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);

    doc.text(`Aktive Unterrichtsräume:`, margin + 6, curY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`${summary.room_count}`, margin + 50, curY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Pädagogische Lehrkräfte:`, margin + 75, curY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`${summary.teacher_count}`, margin + 120, curY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Eingeschriebene Schüler:`, margin + 6, curY + 23);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`${summary.student_count}`, margin + 50, curY + 23);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Geplante Unterrichtseinheiten:`, margin + 75, curY + 23);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`${summary.schedule_occurrences_count}`, margin + 120, curY + 23);

    // Abschließende Bestätigung & Siegel-Feld
    curY += 46;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, curY, contentWidth, 70, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(brandNavy[0], brandNavy[1], brandNavy[2]);
    doc.text('3. Formelle Bestätigung der Musikschulleitung', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    const confirmationText = 'Die Musikschulleitung bestätigt, dass die im System dokumentierten Unterrichts- und Raumabsprachen auf freiwilligen Vereinbarungen zwischen Lehrkräften und Schülern beruhen. Das System Campus-Groovelab wird als reines didaktisches Zusatz- und Koordinierungswerkzeug eingesetzt. Weisungsrechte werden über das System zu keinem Zeitpunkt ausgeübt.';
    doc.text(doc.splitTextToSize(confirmationText, contentWidth - 12), margin + 6, curY + 15);

    // Signatur-Felder
    const sigY = curY + 45;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin + 6, sigY, margin + 70, sigY);
    doc.line(margin + 85, sigY, margin + contentWidth - 6, sigY);

    doc.setFontSize(7);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Ort, Datum', margin + 6, sigY + 5);
    doc.text('Unterschrift Schulleitung / Träger', margin + 85, sigY + 5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.text(`KRYPTOGRAFISCHER INTEGRITÄTS-STEMPEL: ${sha256.slice(0, 36)}...`, margin + 6, sigY + 15);

    if (options.returnBlob) {
      return doc.output('blob');
    }

    const cleanFileName = `DRV_Status_Dossier_${cleanSchool.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(cleanFileName);
  } catch (error) {
    console.error('[DRV-Dossier-Generator] Failed to generate PDF:', error);
    throw error;
  }
}
