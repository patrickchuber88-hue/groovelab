/**
 * Campus-Groovelab Official Staff Council & Employee Data Protection Declaration Generator
 * Standards: § 87 Abs. 1 Nr. 6 BetrVG, LPVG, BPersVG, BDSG § 26, DSGVO Art. 5, 28, 32, BSG B 12 R 3/20 R
 * 
 * Generates an official, print-ready, 2-page legal compliance certificate for school boards,
 * school directors, staff councils (Personalrat / Betriebsrat / Lehrerrat), and trade unions.
 */

export interface StaffCouncilDeclarationOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolSigneeName?: string;
  schoolId?: string;
}

export async function generateStaffCouncilDeclarationPDF(options: StaffCouncilDeclarationOptions = {}): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    // --- COLOR PALETTE (Enterprise Deep Emerald & Slate) ---
    const darkSlate = [15, 23, 42];
    const textGray = [71, 85, 105];
    const lightBg = [248, 250, 252];
    const borderGray = [226, 232, 240];
    const accentRed = [234, 67, 53];

    const cleanSchoolName = options.schoolName || 'Städtische Musikschule / Bildungsträger';
    const currentDateStr = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // ==========================================
    // PAGE 1: MITBESTIMMUNG & BETRVG § 87 COMPLIANCE
    // ==========================================

    // Top Brand Accent Bar
    doc.setFillColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Running Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('CAMPUS-GROOVELAB • MITBESTIMMUNGS- & ARBEITNEHMERSCHUTZ-ATTEST', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.text(`${cleanSchoolName} | Stand: ${currentDateStr}`, pageWidth - margin, 12, { align: 'right' });

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, 15, pageWidth - margin, 15);

    // Main Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Personalrats- & Mitbestimmungs-Attest', margin, 24);

    doc.setFontSize(9.5);
    doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.text('RECHTSVERBINDLICHE BESTÄTIGUNG NACH § 87 ABS. 1 NR. 6 BETRVG & LPVG', margin, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Geltungsbereich: Musikschulen, Personalräte, Betriebsräte & Lehrerräte | Version 2.4-LTS | Aussteller: Patrick Huber`, margin, 35);

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, 38, pageWidth - margin, 38);

    // Executive Summary Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, 42, contentWidth, 34, 3, 3, 'F');
    doc.setDrawColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, 42, contentWidth, 34, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('1. Verbindliche Zusicherung an Schulleitung, Personalrat & Betriebsrat', margin + 5, 49);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const summaryText = 'Die Schulmanagement- und Übe-Plattform Campus-Groovelab wurde nach der Subsidiaritäts-Doktrin und dem Grundsatz der „digitalen Kreidetafel“ konzipiert: Sie dient als rein freiwilliges, unterstützendes Convenience-Werkzeug („Fast-Track“) zur Unterrichtsbegleitung und ersetzt weder städtische ERP-Systeme noch offizielle Dienstwege. Die Plattform enthält keinerlei Überwachungsfunktionen für Lehrkräfte und schützt Honorarkräfte durch volle Übermittlungsfreiheit vor Scheinselbstständigkeitsrisiken.';
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 10);
    doc.text(splitSummary, margin + 5, 55);

    // Section 1: Ausschluss von Verhaltens- und Leistungskontrolle
    let curY = 82;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('2. Ausschluss von Verhaltens- & Leistungskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / LPVG)', margin, curY);

    const section1Points = [
      {
        title: 'A. Keine automatisierte Überwachung oder Verhaltensbewertung',
        desc: 'Die Plattform enthält keinerlei Algorithmen, künstliche Intelligenz oder automatisierte Auswertungsroutinen, die dazu bestimmt oder objektiv geeignet sind, das Arbeits- oder Unterrichtsverhalten, die didaktische Güte oder die quantitative Leistung von angestellten Lehrkräften oder Honorarkräften zu überwachen, auszuwerten oder einem vergleichenden Ranking zu unterziehen.'
      },
      {
        title: 'B. Keine Aktivitäts-, Verweildauer- oder Klick-Reports für die Schulleitung',
        desc: 'Im Schulleitungs- und Administrationsbereich existieren keine Statistiken über Login-Häufigkeiten, Online-Zeiten, Klickpfade, Antwortzeiten bei Schüler-Chats oder Frequenzen von Hausaufgabeneinträgen. Eine Leistungsmessung durch die Schulleitung über die Plattform ist architektonisch unmöglich.'
      },
      {
        title: 'C. Strikte didaktische Zweckbindung & Schutz des pädagogischen Raums',
        desc: 'Sämtliche im System geführten didaktischen Notizen, Hausaufgaben und Übe-Protokolle dienen ausschließlich dem vertrauensvollen bilateralen Verhältnis zwischen Lehrkraft und Schüler. Sie sind kein Gegenstand dienstlicher Weisung oder aufsichtsrechtlicher Überprüfung.'
      }
    ];

    curY += 6;
    section1Points.forEach((p) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
      doc.text(p.title, margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitP = doc.splitTextToSize(p.desc, contentWidth - 8);
      doc.text(splitP, margin + 4, curY + 11.5);

      curY += 27;
    });

    // Section 2: Herrenberg-Compliance
    curY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('3. Schutz von Honorarlehrkräften (Herrenberg-Compliance / BSG B 12 R 3/20 R)', margin, curY);

    const section2Points = [
      {
        title: 'A. Reine Dispositionsvorschläge, Übermittlungsfreiheit & Weisungsfreiheit',
        desc: 'Stundenplan-, Raum- und Terminbelegungsfunktionen stellen rechtlich unverbindliche didaktische Dispositionsvorschläge dar. Lehrkräften (insbesondere freien Honorarkräften) steht es vollkommen frei, Termine und Raumwünsche digital über Campus-Groovelab oder herkömmlich (per E-Mail, Telefon oder Zettel) an die Verwaltung zu übermitteln. Es besteht kein Nutzungszwang und keine arbeitsteilige Einbindung in den städtischen Weisungsapparat.'
      },
      {
        title: 'B. Subsidiaritäts-Doktrin, Nichterreichbarkeit & Zeiteinteilung (§ 5 ArbSchG)',
        desc: 'Campus-Groovelab fungiert als rein unterstützendes Beschleunigungs- und Convenience-Werkzeug. Amtliche Arbeitsanweisungen verbleiben auf den städtischen Primärkanälen (E-Mail, MS Teams, Post). Lehrkräfte können Mitteilungen und Chats jederzeit deaktivieren; es besteht keine Pflicht zur Nutzung außerhalb vereinbarter Unterrichtsstunden.'
      }
    ];

    curY += 6;
    section2Points.forEach((p) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(p.title, margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitP = doc.splitTextToSize(p.desc, contentWidth - 8);
      doc.text(splitP, margin + 4, curY + 11.5);

      curY += 27;
    });

    // Page 1 Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Campus-Groovelab • Personalrats-Attest (§ 87 BetrVG) | Seite 1 von 2', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // ==========================================
    // PAGE 2: DATENSCHUTZ, HOSTING & SIEGEL
    // ==========================================
    doc.addPage();

    // Top Accent Bar
    doc.setFillColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Running Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('CAMPUS-GROOVELAB • MITBESTIMMUNGS- & ARBEITNEHMERSCHUTZ-ATTEST', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.text(`${cleanSchoolName} | Stand: ${currentDateStr}`, pageWidth - margin, 12, { align: 'right' });

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, 15, pageWidth - margin, 15);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('4. Datensouveränität & 100% Deutsches Cloud-Hosting (Hetzner)', margin, curY);

    const section3Points = [
      {
        title: 'A. Ausschluss von US-Cloudservern & US-Behördenzugriff (Schrems II)',
        desc: 'Der gesamte Plattformbetrieb (Datenbanken, Programmcode, Audio-Memos, Backups) erfolgt ausschließlich in ISO 27001 zertifizierten deutschen Rechenzentren der Hetzner Online GmbH (Falkenstein/Vogtland und Nürnberg). Ein Datentransfer in Drittländer (USA) oder die Unterwerfung unter den US CLOUD Act / FISA 702 ist vollständig ausgeschlossen.'
      },
      {
        title: 'B. Schutz der Privatsphäre von Lehrkräften & Zero-Mail IAM',
        desc: 'Private E-Mail-Adressen, private Telefonnummern oder Wohnanschriften von Lehrkräften werden auf der Plattform zu keinem Zeitpunkt erhoben oder gespeichert (Zero-Mail-Architektur). Die Authentifizierung erfolgt über kryptografische Hardware-Passkeys oder PINs. Der vollständige Name wird ausschließlich den betreuten Schülern und deren Eltern zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) angezeigt.'
      },
      {
        title: 'C. Revisionssichere PostgreSQL Row-Level-Security (RLS)',
        desc: 'Mittels strikter Kernel-Policies auf Datenbank-Ebene (RLS) wird sichergestellt, dass Schulleitungen oder Administratoren keine privaten Vermerke oder bilateralen Audio-Aufnahmen von Lehrkräften einsehen können. Sicherheits-Logs im WORM-Audit-Ledger dokumentieren ausschließlich technische Schutzvorgänge, keine Arbeitnehmerprofile.'
      }
    ];

    curY += 7;
    section3Points.forEach((p) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(p.title, margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitP = doc.splitTextToSize(p.desc, contentWidth - 8);
      doc.text(splitP, margin + 4, curY + 11.5);

      curY += 28;
    });

    // Official Seal & Sign-Off Box
    curY += 4;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, curY, contentWidth, 54, 3, 3, 'F');
    doc.setDrawColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, curY, contentWidth, 54, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.text('5. Rechtsverbindliche Konformitätserklärung & Betreiber-Garantie', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const sealText = 'Der Betreiber bestätigt hiermit ausdrücklich, dass der Einsatz von Campus-Groovelab den Erfordernissen des Personalvertretungsrechts (§ 87 Abs. 1 Nr. 6 BetrVG, LPVG der Länder, BPersVG) sowie den Anforderungen der DSGVO (Art. 5, 28, 32) und des § 26 BDSG vollumfänglich entspricht. Als rein unterstützendes, weisungsfreies Beschleunigungswerkzeug wahrt die Plattform die Autonomie von Honorarkräften (BSG B 12 R 3/20 R). Das vorliegende Attest kann von der Schulleitung direkt der Personalvertretung (Personalrat, Betriebsrat, Lehrerrat) zur Genehmigung bzw. Kenntnisnahme vorgelegt werden.';
    const splitSeal = doc.splitTextToSize(sealText, contentWidth - 12);
    doc.text(splitSeal, margin + 6, curY + 15);

    // Signature line
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin + 6, curY + 36, margin + 90, curY + 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Patrick Huber', margin + 6, curY + 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Campus-Groovelab SaaS Operator • Sicherheits- & Betriebsleitung', margin + 6, curY + 45);
    doc.text(`Rheinfelden (Baden) • Gültig ab Schuljahr 2026/2027 • Prüfsumme: SHA256-BETRVG-87-CG`, margin + 6, curY + 49);

    // Page 2 Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Campus-Groovelab • Personalrats-Attest (§ 87 BetrVG) | Seite 2 von 2', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Download PDF
    const filename = `Campus_Groovelab_Personalrats_Attest_BetrVG87_${new Date().getFullYear()}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Fehler beim Generieren des Personalrats-Attests:', error);
    alert('Das Personalrats-Attest konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
  }
}
