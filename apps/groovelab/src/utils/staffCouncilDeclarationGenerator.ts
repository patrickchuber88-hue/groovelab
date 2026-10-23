import { cleanPdfText, computeCanonicalPayloadHash } from './pdfTypographyEngine';

export interface StaffCouncilDeclarationOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolSigneeName?: string;
  schoolId?: string;
  returnBlob?: boolean;
}

export async function generateStaffCouncilDeclarationPDF(options: StaffCouncilDeclarationOptions = {}): Promise<Blob | void> {
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

    // Compute dynamic SHA-256 verification hash over canonical payload
    const canonicalPayload = {
      docType: 'STAFF_COUNCIL_DECLARATION_BETRVG_87',
      schoolName: cleanSchoolName,
      schoolId: options.schoolId || 'BETRVG-87',
      date: currentDateStr,
      legalNorm: 'BETRVG_87_ABS_1_NR_6_LPVG_BPERSVG',
      operator: 'Patrick Huber, Rheinfelden'
    };
    const sha256Digest = await computeCanonicalPayloadHash(canonicalPayload);

    const drawStaffCouncilHeader = (pageNum: number) => {
      // Top Brand Accent Bar
      doc.setFillColor(accentRed[0], accentRed[1], accentRed[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Running Header (Two-tier, collision immune)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('CAMPUS-GROOVELAB • MITBESTIMMUNGS- & ARBEITNEHMERSCHUTZ-ATTEST', margin, 11);

      doc.setFont('helvetica', 'bold');
      doc.text(`Seite ${pageNum} von 2`, pageWidth - margin, 11, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Geltungsbereich: § 87 Abs. 1 Nr. 6 BetrVG / LPVG (Ausschluss Verhaltenskontrolle)', margin, 15);

      const maxRightWidth = contentWidth * 0.42;
      let cleanSchool = cleanPdfText(cleanSchoolName);
      const dateSuffix = ` | Stand: ${cleanPdfText(currentDateStr)}`;
      if (doc.getTextWidth(`${cleanSchool}${dateSuffix}`) > maxRightWidth) {
        while (cleanSchool.length > 5 && doc.getTextWidth(`${cleanSchool}...${dateSuffix}`) > maxRightWidth) {
          cleanSchool = cleanSchool.slice(0, -1);
        }
        doc.text(`${cleanSchool}...${dateSuffix}`, pageWidth - margin, 15, { align: 'right' });
      } else {
        doc.text(`${cleanSchool}${dateSuffix}`, pageWidth - margin, 15, { align: 'right' });
      }

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, 18, pageWidth - margin, 18);
    };

    const drawStaffCouncilFooter = (pageNum: number) => {
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(`Urkunden-Prüfhash (§ 371a ZPO): SHA256:${sha256Digest} • Technisches Hersteller-Konformitätsattest`, margin, pageHeight - 8);
      doc.text(`Seite ${pageNum} von 2`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    // ==========================================
    // PAGE 1: MITBESTIMMUNG & BETRVG § 87 COMPLIANCE
    // ==========================================
    drawStaffCouncilHeader(1);

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
    const summaryText = cleanPdfText('Leitbild & Schutzprinzip: Campus-Groovelab dient den Lehrkräften zur Erleichterung des Unterrichtsalltags (nicht umgekehrt). Die Schulmanagement- und Übe-Plattform wurde nach der Subsidiaritäts-Doktrin und dem Grundsatz der "digitalen Kreidetafel" konzipiert: Sie dient als rein freiwilliges, unterstützendes Convenience-Werkzeug ("Fast-Track") zur Unterrichtsbegleitung und ersetzt weder städtische ERP-Systeme noch offizielle Dienstwege. Die Plattform enthält keinerlei Überwachungsfunktionen für Lehrkräfte und schützt Honorarkräfte durch volle didaktische Freiheit vor Scheinselbstständigkeitsrisiken.');
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
        title: 'A. Keine automatisierte Überwachung, Zero-Meeting-Bots & EU AI Act Freistellung',
        desc: 'Die Plattform enthält keinerlei Algorithmen, KI oder automatisierte Auswertungsroutinen zur Überwachung oder zum Ranking von Lehrkräften. StGB § 201 Safe-Harbor: Es existieren keine verdeckten Meeting-Bots oder automatischen Raum-Transkriptionen; Lehrkräfte und Schüler dürfen aktiv und willentlich die gerätenative Diktierfunktion per Push-to-Talk in sichtbare Textfelder mit voller Editierkontrolle vor dem Absenden sowie 1-Klick-Sprachmemos mit deterministischem releaseAudioStream() nutzen. EU AI Act: 100% deterministische DSP/FFT ohne probabilistische KI (0 Pflicht zu KI-Beauftragten oder FRIA gem. Art. 4 & 27 KI-VO).'
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
      const splitP = doc.splitTextToSize(cleanPdfText(p.desc), contentWidth - 8);
      const boxHeight = Math.max(23, 12 + splitP.length * 3.4);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
      doc.text(cleanPdfText(p.title), margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(splitP, margin + 4, curY + 11.5);

      curY += boxHeight + 3.5;
    });

    // Section 2: Herrenberg-Compliance
    curY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('3. Schutz von Honorarlehrkräften (Herrenberg-Compliance / BSG B 12 R 3/20 R)', margin, curY);

    const section2Points = [
      {
        title: 'A. 2-Phasen Herrenberg-Zukunftsschutz, Übermittlungs- & Weisungsfreiheit',
        desc: 'Campus-Groovelab dient dem Unterrichtsalltag der Lehrkraft, nicht dem Schulalltag der Schulleitung. Stundenplan-, Raum- und Terminbelegungsfunktionen stellen rechtlich unverbindliche didaktische Dispositionsvorschläge dar. Lehrkräften (insbesondere freien Honorarkräften) steht es vollkommen frei, Termine und Raumwünsche digital über Campus-Groovelab oder herkömmlich (per E-Mail, Telefon oder Zettel) an die Verwaltung zu übermitteln. 2-Phasen-Schutzschild: Phase 1 schützt im Rahmen des Moratoriums nach § 127 SGB IV befristet bis zum 31.12.2027; Phase 2 sichert ab 01.01.2028 nach Auslaufen des § 127 SGB IV dauerhafte, unanfechtbare Weisungs- und Indizienfreiheit nach § 7 Abs. 1 SGB IV & BSG B 12 R 3/20 R (0% Payroll, 0% Zeiterfassung).'
      },
      {
        title: 'B. Subsidiaritäts-Doktrin, Nichterreichbarkeit & Zeiteinteilung (§ 5 ArbSchG)',
        desc: 'Campus-Groovelab fungiert als rein unterstützendes Beschleunigungs- und Convenience-Werkzeug. Amtliche Arbeitsanweisungen verbleiben auf den städtischen Primärkanälen (E-Mail, MS Teams, Post). Lehrkräfte können Mitteilungen und Chats jederzeit deaktivieren; es besteht keine Pflicht zur Nutzung außerhalb vereinbarter Unterrichtsstunden.'
      }
    ];

    curY += 6;
    section2Points.forEach((p) => {
      const splitP = doc.splitTextToSize(cleanPdfText(p.desc), contentWidth - 8);
      const boxHeight = Math.max(23, 12 + splitP.length * 3.4);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(cleanPdfText(p.title), margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(splitP, margin + 4, curY + 11.5);

      curY += boxHeight + 3.5;
    });

    // Page 1 Footer
    // Page 1 Footer
    drawStaffCouncilFooter(1);

    // ==========================================
    // PAGE 2: DATENSCHUTZ, HOSTING & SIEGEL
    // ==========================================
    doc.addPage();
    drawStaffCouncilHeader(2);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('4. Datensouveränität & 100% Deutsches Cloud-Hosting (IONOS SE & Hetzner)', margin, curY);

    const section3Points = [
      {
        title: 'A. Ausschluss von US-Cloudservern, Stufe-2/3 Garantien (Schrems II & TIA-Freiheit)',
        desc: 'Der gesamte Plattformbetrieb (Datenbanken, Programmcode, Audio-Memos, Backups) erfolgt ausschließlich in ISO 27001 zertifizierten deutschen Rechenzentren der IONOS SE (Montabaur) sowie der Hetzner Online GmbH (Falkenstein/Vogtland und Nürnberg). Stufe-2 Mutterkonzern-Garantie: Sowohl Auftragsverarbeiter als auch Subprozessoren (United Internet AG / IONOS SE & Hetzner Online GmbH) sind 100% deutsche Gesellschaften ohne US-Mutterkonzern (0% US CLOUD Act / FISA 702). Stufe-3 Zero-Support-Backdoor: Keinerlei Support- oder Fernwartungszugriff aus Drittländern (0% TIA-Pflicht).'
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
      const splitP = doc.splitTextToSize(cleanPdfText(p.desc), contentWidth - 8);
      const boxHeight = Math.max(24, splitP.length * 3.4 + 11);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(cleanPdfText(p.title), margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(splitP, margin + 4, curY + 11.5);

      curY += boxHeight + 3.5;
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
    doc.text('5. Technische Systemerklärung & Betreiber-Zusicherung (Hinweis gem. § 3 RDG)', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const sealText = cleanPdfText('Der Betreiber dokumentiert hiermit verbindlich die technischen Eigenschaften von Campus-Groovelab zur Vorlage bei der Personalvertretung (§ 87 Abs. 1 Nr. 6 BetrVG, LPVG der Länder, BPersVG) sowie zur Einhaltung von DSGVO (Art. 5, 28, 32) und § 26 BDSG. Nach dem Leitbild des didaktischen Assistenz-Prinzips enthält die Plattform keinerlei Funktionen zur Leistungs- oder Verhaltenskontrolle von Lehrkräften und wahrt die technische Dispositionsfreiheit freier Honorarkräfte (BSG B 12 R 3/20 R). Hinweis gem. § 3 RDG: Diese technische Architektur-Dokumentation stellt keine individuelle Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes dar.');
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
    doc.setFontSize(6.8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Campus-Groovelab SaaS Operator • Karl-Fürstenberg-Str. 59 • 79618 Rheinfelden (Baden)', margin + 6, curY + 45);
    doc.text(`Gültig ab Schuljahr 2026/2027 • Prüfsumme: SHA256:${sha256Digest}`, margin + 6, curY + 49);

    // Section 6: Audit Proofs & Invariants for Staff Council (harmonizes page 2 whitespace)
    curY += 57;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, 58, 3, 3, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, curY, contentWidth, 58, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('6. Prüfpfade & Kern-Invarianten für die Personalvertretung (§ 87 BetrVG)', margin + 6, curY + 6.5);

    const auditBoxes = [
      {
        title: 'Technisches Überwachungsverbot & Telemetrie-Ausschluss',
        desc: 'Der Produktiv-Quellcode schließt Telemetrie, Arbeitszeitaufzeichnungen und Auswertungen über Onlinezeiten von Lehrkräften systemisch aus. WORM-Audit-Logs protokollieren nur technische Sicherheitsvorgänge.'
      },
      {
        title: 'Schulische Datenhoheit (Art. 28 DSGVO) & ISO 27001 Hosting',
        desc: 'Ausschließliches Hosting im ISO 27001-zertifizierten deutschen Cluster (IONOS SE & Hetzner Falkenstein/Nürnberg). Keine US-Cloud-Abhängigkeit, kein Drittstaatentransfer (Schrems II konform).'
      },
      {
        title: 'BSG Herrenberg-Schutzschild für Honorarkräfte',
        desc: 'Die Plattform wahrt die didaktische und zeitliche Autonomie freier Honorarkräfte (§ 7a SGB IV). Raumdispositionen erfolgen zweistufig und ohne arbeitgeberseitige Weisungsbindung.'
      }
    ];

    let boxY = curY + 12;
    auditBoxes.forEach(ab => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
      doc.text(cleanPdfText(`• ${ab.title}:`), margin + 6, boxY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitDesc = doc.splitTextToSize(cleanPdfText(ab.desc), contentWidth - 12);
      doc.text(splitDesc, margin + 6, boxY + 3.8);
      boxY += splitDesc.length * 3.2 + 5;
    });

    // Page 2 Footer
    drawStaffCouncilFooter(2);

    // Download PDF or Return Blob
    const filename = `Campus_Groovelab_Personalrats_Attest_BetrVG87_${new Date().getFullYear()}.pdf`;
    if (options.returnBlob) {
      return doc.output('blob');
    }
    doc.save(filename);
  } catch (error) {
    console.error('Fehler beim Generieren des Personalrats-Attests:', error);
    alert('Das Personalrats-Attest konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
  }
}
