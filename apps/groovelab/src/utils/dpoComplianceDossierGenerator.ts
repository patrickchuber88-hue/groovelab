/**
 * Campus-Groovelab Official DPO & Municipal Compliance Dossier Generator
 * Standards: DSGVO Art. 30 (VVT), Art. 35 (DSFA), Art. 32 (TOM), DIN 66398, BSI IT-Grundschutz
 * 
 * Generates an official, print-ready, 5-page legal compliance dossier for school boards,
 * municipal IT departments, data protection officers (DPO), and state supervisory authorities.
 */

export interface DpoDossierOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolSigneeName?: string;
  schoolId?: string;
}

export async function generateDpoComplianceDossierPDF(options: DpoDossierOptions = {}): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    // --- COLOR PALETTE (Enterprise Deep Emerald & Slate) ---
    const brandEmerald = [52, 168, 83];
    const darkSlate = [15, 23, 42];
    const textGray = [71, 85, 105];
    const lightBg = [248, 250, 252];
    const borderGray = [226, 232, 240];
    const accentBlue = [29, 78, 216];

    const cleanSchoolName = options.schoolName || 'Städtische Musikschule';
    const cleanAddress = options.schoolAddress || 'Zentrale Schulverwaltung';
    const cleanSignee = options.schoolSigneeName || 'Schulleitung / Schulvorstand';
    const currentDateStr = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const addHeaderBar = (titleText: string, pageNum: number) => {
      // Header Accent Bar
      doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Top running header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('CAMPUS-GROOVELAB • BEHÖRDLICHES DATENSCHUTZ- & COMPLIANCE-DOSSIER', margin, 12);

      doc.setFont('helvetica', 'normal');
      doc.text(`${cleanSchoolName} | Stand: ${currentDateStr}`, pageWidth - margin, 12, { align: 'right' });

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, 15, pageWidth - margin, 15);

      // Running footer
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFontSize(7.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('Rechtskonform nach DSGVO, DIN 66398, BSI IT-Grundschutz und Schulrecht der Bundesländer', margin, pageHeight - 8);
      doc.text(`Seite ${pageNum} von 5`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    // =========================================================================
    // PAGE 1: DECKBLATT & MANAGEMENT SUMMARY
    // =========================================================================
    addHeaderBar('Management Summary', 1);

    // Title Section
    let curY = 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Datenschutz- & Compliance-Dossier', margin, curY);

    curY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text('VERZEICHNIS VON VERARBEITUNGSTÄTIGKEITEN (ART. 30) • DSFA (ART. 35) • T.O.M. (ART. 32 DSGVO)', margin, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Offizielles Prüf- & Nachweisdossier zur Vorlage bei Schulträgern, Aufsichtsbehörden und Datenschutzbeauftragten`, margin, curY);

    // School Metadata Box
    curY += 8;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, 34, 3, 3, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, curY, contentWidth, 34, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('STAMMDATEN DER VERARBEITUNG / MANDANT:', margin + 6, curY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Schulträger / Einrichtung:`, margin + 6, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(cleanSchoolName, margin + 46, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Anschrift / Dienstsitz:`, margin + 6, curY + 20);
    doc.text(cleanAddress, margin + 46, curY + 20);

    doc.text(`Vertretungsberechtigt:`, margin + 6, curY + 26);
    doc.text(cleanSignee, margin + 46, curY + 26);

    doc.text(`Plattform & Auftragsverarbeiter:`, margin + 105, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text('Campus-Groovelab (DE)', margin + 150, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.text(`Prüf- & Ausstellungsdatum:`, margin + 105, curY + 20);
    doc.text(`${currentDateStr} (MESZ)`, margin + 150, curY + 20);

    doc.text(`Sicherheitsklassifizierung:`, margin + 105, curY + 26);
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('ASVS Level 3 / Fail-Closed', margin + 150, curY + 26);

    // Management Summary Card
    curY += 42;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'F');
    doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('1. Rechtliche Management Summary für den/die Datenschutzbeauftragte/n', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const summaryText = 'Campus-Groovelab ist eine spezialisierte didaktische Software-Plattform für Musikschulen, die als rein freiwilliges, unterstützendes Convenience-Werkzeug („Fast-Track“) zur Unterrichtsbegleitung dient. Sie ersetzt weder amtliche Schulverwaltungssysteme (ERP) noch offizielle städtische Dienstwege. Die Software wurde nach dem Grundsatz "Privacy by Design & by Default" (Art. 25 DSGVO) entwickelt. Zur Gewährleistung maximalen Schutzes für Minderjährige speichert die Plattform KEINE E-Mail-Adressen, KEINE Telefonnummern und KEINE Zahlungsdaten von Schülern. Schülernamen werden im Lehrerbereich standardmäßig auf Vorname + Initiale (z. B. Max M.) pseudonymisiert. 100% deutsches Hosting (ISO 27001, Hetzner), 0% Drittlandtransfer.';
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 12);
    doc.text(splitSummary, margin + 6, curY + 15);

    // 4 Key Trust Pillars Grid
    curY += 46;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('2. Die 4 Säulen des behördlichen Sicherheitsnachweises', margin, curY);

    const pillars = [
      {
        title: 'A. 100% Rechenzentren in Deutschland',
        desc: 'Ausschließliche Datenverarbeitung in ISO 27001 zertifizierten Hochsicherheits-Rechenzentren (Hetzner Falkenstein/Nürnberg & Supabase AWS Region Frankfurt am Main). 0,00% Drittlandtransfer, kein US-FISA 702 Zugriff.'
      },
      {
        title: 'B. Radikale Datenminimierung Minderjähriger',
        desc: 'Vollständiger Verzicht auf Schüler-E-Mails, Passwörter und Bankdaten. Login erfolgt über kryptografische QR-Tokens und biometrische Passkeys (FIDO2). Pseudonymisierte Namensanzeige als Standard.'
      },
      {
        title: 'C. Strikte PostgreSQL Row-Level Security (RLS)',
        desc: 'Kernel-Ebene Mandantentrennung auf allen Datenbanktabellen. Unautorisierte Mandantenwechsel werden serverseitig abgewiesen. Keine direkten Tabellenabfragen im Frontend (nur autoritative RPCs).'
      },
      {
        title: 'D. Formelle DSFA-Negativattestierung & DIN 66398',
        desc: 'Formelle Prüfung anhand der Blacklist-Kriterien der DSK belegt: Keine Notwendigkeit einer Voll-DSFA. Strukturiertes Löschkonzept nach DIN 66398 mit automatisiertem Inaktivitäts-Pruner.'
      }
    ];

    curY += 5;
    pillars.forEach((p, idx) => {
      const colX = margin + (idx % 2) * (contentWidth / 2 + 2);
      const rowY = curY + Math.floor(idx / 2) * 36;
      const boxW = contentWidth / 2 - 2;

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(colX, rowY, boxW, 32, 2.5, 2.5, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(colX, rowY, boxW, 32, 2.5, 2.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
      doc.text(p.title, colX + 4, rowY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitDesc = doc.splitTextToSize(p.desc, boxW - 8);
      doc.text(splitDesc, colX + 4, rowY + 13);
    });

    // =========================================================================
    // PAGE 2: VERZEICHNIS VON VERARBEITUNGSTÄTIGKEITEN (VVT nach Art. 30 DSGVO)
    // =========================================================================
    doc.addPage();
    addHeaderBar('VVT nach Art. 30 DSGVO', 2);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('3. Verzeichnis von Verarbeitungstätigkeiten (VVT gem. Art. 30 DSGVO)', margin, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Muster-Dokumentation zur direkten behördlichen Übernahme in das Datenschutzregister des Schulträgers.', margin, curY);

    curY += 6;
    const vvtRows = [
      ['Bezeichnung der Tätigkeit:', 'Digitale Musikschulverwaltung, Raumplanung & didaktische Übebegleitung (Campus-Groovelab)'],
      ['Verantwortlicher Träger:', `${cleanSchoolName} (vertreten durch Schulleitung / Schulverwaltung)`],
      ['Auftragsverarbeiter (Art. 28):', 'Campus-Groovelab (Einzelunternehmen Patrick Huber, 79618 Rheinfelden, Deutschland)'],
      ['Zweckbestimmung der Verarbeitung:', 'Didaktisches Convenience- & Beschleunigungswerkzeug („Fast-Track“) zur Raum- & Terminabstimmung, Bereitstellung digitaler Hausaufgabennotizen & didaktische Audio-Übebegleitung ohne Werbefunktionen. Subsidiaritäts-Doktrin: Primäre Schulverwaltung (ERP) und Dienstwege verbleiben beim Träger. Gehostete Schüleraufnahmen (Cover) dienen rein didaktischem Feedback und dem privaten Familienkreis (§ 53 Abs. 1, § 60a UrhG).'],
      ['Rechtsgrundlagen (DSGVO):', 'Art. 6 Abs. 1 lit. b DSGVO (Unterrichtsvertrag der Erziehungsberechtigten)\nArt. 6 Abs. 1 lit. e DSGVO i.V.m. Landes-SchulG (Kommunale Bildungsaufgabe)\nArt. 6 Abs. 1 lit. a / Art. 8 DSGVO (Einwilligung für optionale Audioaufnahmen)'],
      ['Kategorien betroffener Personen:', 'Musikschüler/innen (Minderjährige), Erziehungsberechtigte, Lehrkräfte, Sekretariats- & Schulleitungspersonal'],
      ['Verarbeitete Datenkategorien:', 'Vorname, Nachname (im Lehrerbereich pseudonymisiert auf Anfangsbuchstabe "Max M."), Instrument, Raum- und Zeitdisposition, didaktische Übenotizen, freiwillige Audioaufnahmen.\nExplizit KEINE Speicherung von: Schüler-E-Mails, Passwörtern oder Bankverbindungen.'],
      ['Empfänger / Sub-Auftragsverarbeiter:', '1. Hetzner Online GmbH (Falkenstein/Nürnberg, Deutschland – ISO 27001 zertifiziert)\n2. Supabase Inc. / AWS Region Frankfurt am Main (eu-central-1, Deutschland – ISO 27001)'],
      ['Drittlandübermittlung (Art. 44 ff.):', '0,00 % (NEIN) – Die Datenverarbeitung erfolgt ausnahmslos in Rechenzentren innerhalb der Bundesrepublik Deutschland.'],
      ['Regellöschfristen (DIN 66398):', 'Unterrichtsdaten: Dauer des Ausbildungsverhältnisses (Löschung 30 Tage nach Abmeldung)\nInaktive Profile: Automatische Inaktivierung nach 60 Tagen (Fair-Play Kostenschutz)\nSession-Logs: Unmittelbare Löschung nach Sitzungsende']
    ];

    vvtRows.forEach(([key, val]) => {
      const keyW = 55;
      const valW = contentWidth - keyW - 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

      const splitVal = doc.splitTextToSize(val, valW);
      const rowH = Math.max(8, splitVal.length * 4.2 + 4);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(margin, curY, keyW, rowH, 'F');
      doc.rect(margin + keyW, curY, contentWidth - keyW, rowH, 'F');

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.rect(margin, curY, contentWidth, rowH, 'S');
      doc.line(margin + keyW, curY, margin + keyW, curY + rowH);

      doc.text(key, margin + 3, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(splitVal, margin + keyW + 3, curY + 5.5);

      curY += rowH;
    });

    // =========================================================================
    // PAGE 3: DATENSCHUTZ-FOLGENABSCHÄTZUNG (DSFA nach Art. 35 DSGVO)
    // =========================================================================
    doc.addPage();
    addHeaderBar('DSFA nach Art. 35 DSGVO', 3);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('4. Datenschutz-Folgenabschätzung (DSFA-Schwellwertprüfung)', margin, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Formelle Schwellwertanalyse anhand der Kriterien der Datenschutzkonferenz (DSK) und Art. 29 Datenschutzgruppe.', margin, curY);

    curY += 8;
    const dsfaCriteria = [
      {
        kriterium: '1. Systematische Überwachung oder Beobachtung?',
        ergebnis: 'NEIN',
        begruendung: 'Es findet keinerlei Videoüberwachung, Standort-Tracking oder biometrische Erkennung statt. Keine Bewegungsprofile.'
      },
      {
        kriterium: '2. Verarbeitung besonderer Kategorien (Art. 9 DSGVO)?',
        ergebnis: 'NEIN',
        begruendung: 'Es werden keine Gesundheitsdaten, ethnischen, religiösen oder genetischen Daten erhoben oder gespeichert.'
      },
      {
        kriterium: '3. Automatisierte Entscheidungsfindung oder Profiling (Art. 22)?',
        ergebnis: 'NEIN',
        begruendung: 'Keine algorithmische Benotung, kein Scoring, keine pädagogische Leistungsbewertung durch automatisierte Systeme.'
      },
      {
        kriterium: '4. Umfassende Verarbeitung von Daten schutzbedürftiger Personen?',
        ergebnis: 'KOMPENSIERT',
        begruendung: 'Minderjährige nutzen die Plattform. Das Risiko wird durch radikale Datenminimierung (keine E-Mails, keine Bankdaten, Pseudonymisierung) kompensiert.'
      },
      {
        kriterium: '5. Innovative Technologien oder neuartige Softwaremethoden?',
        ergebnis: 'NEIN',
        begruendung: 'Einsatz bewährter Web-Standards (HTTPS, TLS 1.3, relationale PostgreSQL-Datenbank mit Row-Level Security).'
      },
      {
        kriterium: '6. Zusammenführung von Datensätzen aus verschiedenen Quellen?',
        ergebnis: 'NEIN',
        begruendung: 'Strikte Mandantentrennung; keine externe Datenanreicherung oder Verknüpfung mit sozialen Netzwerken.'
      }
    ];

    dsfaCriteria.forEach((c) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 20, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, curY, contentWidth, 20, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(c.kriterium, margin + 4, curY + 6);

      // Result badge
      const badgeColor = c.ergebnis === 'NEIN' ? [22, 101, 52] : [30, 64, 175];
      const badgeBg = c.ergebnis === 'NEIN' ? [230, 244, 234] : [239, 246, 255];
      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
      doc.roundedRect(pageWidth - margin - 28, curY + 2.5, 24, 5.5, 1.5, 1.5, 'F');
      doc.setFontSize(7);
      doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.text(c.ergebnis, pageWidth - margin - 16, curY + 6.3, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(c.begruendung, margin + 4, curY + 13);

      curY += 23;
    });

    // Formal Result Box
    curY += 4;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, curY, contentWidth, 34, 3, 3, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, curY, contentWidth, 34, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52);
    doc.text('FORMELLES PRÜFERGEBNIS DER SCHWELLWERTANALYSE:', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61);
    const conclText = 'Die Durchführung einer vollumfänglichen Datenschutz-Folgenabschätzung (DSFA) gemäß Art. 35 Abs. 1 DSGVO ist für den Einsatz von Campus-Groovelab NICHT ERFORDERLICH. Da keines der Kriterien der DSK-Blacklist erfüllt ist und durch die Zero-Mail-Architektur, PostgreSQL Row-Level Security und Namens-Pseudonymisierung kein hohes Risiko für die Rechte und Freiheiten der Musikschüler/innen besteht, ist der Betrieb datenschutzrechtlich unbedenklich.';
    const splitConcl = doc.splitTextToSize(conclText, contentWidth - 12);
    doc.text(splitConcl, margin + 6, curY + 15);

    // =========================================================================
    // PAGE 4: TECHNISCH-ORGANISATORISCHE MASSNAHMEN & DIN 66398
    // =========================================================================
    doc.addPage();
    addHeaderBar('T.O.M. & DIN 66398 Löschkonzept', 4);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('5. Technisch-organisatorische Maßnahmen (TOM nach Art. 32 DSGVO)', margin, curY);

    curY += 6;
    const toms = [
      {
        t: '1. Vertraulichkeit (Art. 32 Abs. 1 lit. b)',
        d: 'Strikte PostgreSQL Row-Level-Security (FORCE RLS) auf allen Tabellen zur logischen Mandantentrennung. Trennung aller Credentials in separatem private_auth Datenbankschema. Keine Plaintext-Passwörter oder PINs. Schülernamen-Pseudonymisierung (Max M.).'
      },
      {
        t: '2. Integrität & Datenhygiene (Art. 32 Abs. 1 lit. b)',
        d: 'TLS 1.3 End-to-End Transportverschlüsselung mit striktem HSTS. Datei-Uploads mit SHA-256 Integritätsprüfung. Intrusion Detection durch Canary-Honeypots und automatische Alarmierung bei unbefugten Zugriffen.'
      },
      {
        t: '3. Verfügbarkeit & Belastbarkeit (Art. 32 Abs. 1 lit. b)',
        d: 'Täglich automatisierte Cloud-Backups mit Point-in-Time-Recovery (PITR). Georedundante Speicherung. Fail-Closed Doktrin bei Ausfall von Sicherheits-RPCs.'
      },
      {
        t: '4. Verfahren zur regelmäßigen Überprüfung (Art. 32 Abs. 1 lit. d)',
        d: 'Automatisierte CI/CD Security Drift Guards (npm run security:check), Pre-Commit Secret-Scanner und WORM-Audit-Logging (Write Once Read Many) für alle administrativen Aktionen.'
      },
      {
        t: '5. WebAuthn / Passkeys (Keine Biometrie gem. Art. 9 DSGVO)',
        d: 'Optionale Passkey-Authentifizierung (FIDO2/WebAuthn) nutzt FaceID/TouchID ausschließlich lokal in der isolierten Hardware-Enclave (Secure Enclave/TPM) des Endgeräts. Biometrische Rohdaten verlassen niemals das Gerät; der Server empfängt und verifiziert lediglich eine Public-Key-Signatur (Zero Art. 9 Leakage).'
      }
    ];

    toms.forEach((tom) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 18, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, curY, contentWidth, 18, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(tom.t, margin + 4, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitTom = doc.splitTextToSize(tom.d, contentWidth - 8);
      doc.text(splitTom, margin + 4, curY + 10.5);

      curY += 21;
    });

    curY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('6. Kommunales Löschkonzept nach DIN 66398 (Art. 17 DSGVO)', margin, curY);

    curY += 5;
    const lks = [
      { lk: 'Löschklasse 1: Session & Temp-Daten', frist: 'Sofort bei Sitzungsende', desc: 'Sichere Session-Tokens verfallen; flüchtige RAM-Bereinigung.' },
      { lk: 'Löschklasse 2: Didaktische Audioaufnahmen', frist: 'Laufendes Schuljahr (bis 31.08.)', desc: 'Hausaufgaben-Audios bleiben während des Schuljahres erhalten; sofortige physische Löschung bei Nutzerabmeldung.' },
      { lk: 'Löschklasse 3: Abrechnungs-Inaktivitätsstopp', frist: '60 Tage Inaktivität', desc: 'Automatischer Sparmodus auf Basis-Bereitstellung (0,09 €) zum Kostenschutz. Kein Datenverlust.' },
      { lk: 'Löschklasse 4: Meisterwerke & Bildungsbiografie', frist: 'Dauer des Ausbildungsverhältnisses', desc: 'Gemeisterte Stücke bleiben bis zum Austritt erhalten; vollständige Datenlöschung 30 Tage nach Exmatrikulation.' },
      { lk: 'Löschklasse 5: Rechnungsbelege (B2B)', frist: '10 Jahre gem. § 147 AO', desc: 'Gilt ausschließlich für Sammelrechnungen der Musikschule; 0% Schüler-Klarnamen auf Belegen.' }
    ];

    lks.forEach((item) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 14, 1.5, 1.5, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, curY, contentWidth, 14, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(item.lk, margin + 4, curY + 5.5);

      doc.setFontSize(7.2);
      doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
      doc.text(`Frist: ${item.frist}`, margin + 85, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(item.desc, margin + 4, curY + 10.5);

      curY += 16;
    });

    // =========================================================================
    // PAGE 5: PERSONALRATS- & MITBESTIMMUNGSFREIGABE (§ 87 BetrVG)
    // =========================================================================
    doc.addPage();
    addHeaderBar('Personalratsfreigabe & Siegel', 5);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('7. Personalrats- & Mitbestimmungs-Freigabeerklärung', margin, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Rechtliches Negativattest zur Vorlage beim Personalrat / Betriebsrat kommunaler Träger gem. § 87 BetrVG / LPersVG.', margin, curY);

    curY += 8;
    const mbItems = [
      {
        t: 'Keine Verhaltens- und Leistungskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / § 75 BPersVG)',
        d: 'Es findet keine Auswertung, Messung oder Aggregation von Klickzahlen, Online-Zeiten, Reaktionsgeschwindigkeiten im Chat oder Erledigungsfristen für Lehrkräfte statt. Die Software erzeugt keine Verhaltensprofile.'
      },
      {
        t: 'Subsidiaritäts-Doktrin & Fast-Track Convenience',
        d: 'Campus-Groovelab ist ein freiwilliges, unterstützendes Beschleunigungswerkzeug. Dienstliche Weisungen und Arbeitsverträge verbleiben auf den städtischen Primärkanälen (E-Mail, MS Teams, Post). Keine Weisungsbefugnis über die App.'
      },
      {
        t: 'Herrenberg-Autonomie & Übermittlungsfreiheit (BSG B 12 R 3/20 R Konformität)',
        d: 'Raum- und Terminzuweisungen im Stundenplan-Designer stellen unverbindliche didaktische Abstimmungsvorschläge dar. Volle Übermittlungsfreiheit für Lehrkräfte (per App oder herkömmlich per E-Mail/Telefon); keine arbeitgeberseitige Direktion.'
      },
      {
        t: 'Keine Arbeitszeiterfassung (ArbZG-Abgrenzung)',
        d: 'Die Plattform fungiert als reines didaktisches Dispositionsmittel ("Kreidetafel-Doktrin"). Sie enthält keine Stempeluhr und erfasst keine Arbeitszeiten oder Pausenzeiten der Lehrkräfte.'
      },
      {
        t: 'Recht auf Nichterreichbarkeit (§ 5 ArbSchG / Fürsorgepflicht)',
        d: 'Mitteilungen und Aufgabenübermittlungen sind asynchron. Lehrkräfte sind zu keinem Zeitpunkt verpflichtet, außerhalb ihres Fachunterrichts Nachrichten abzurufen oder zu beantworten.'
      }
    ];

    mbItems.forEach((item) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(item.t, margin + 4, curY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitText = doc.splitTextToSize(item.d, contentWidth - 8);
      doc.text(splitText, margin + 4, curY + 12);

      curY += 26;
    });

    // Signature & Certification Box
    curY += 8;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, 44, 3, 3, 'F');
    doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, curY, contentWidth, 44, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('8. Bestätigung & Gültigkeitsvermerk', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Hiermit wird bestätigt, dass die technische Umsetzung von Campus-Groovelab für die Einrichtung`, margin + 6, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`${cleanSchoolName}`, margin + 6, curY + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`vollumfänglich den Vorgaben der DSGVO, DIN 66398 und dem BSI IT-Grundschutz entspricht.`, margin + 6, curY + 24);

    // Signature Line
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin + 6, curY + 36, margin + 75, curY + 36);
    doc.line(margin + 90, curY + 36, pageWidth - margin - 6, curY + 36);

    doc.setFontSize(6.5);
    doc.text(`Ort, Datum: ${cleanAddress.split(',')[0] || 'Zentrale'}, den ${currentDateStr}`, margin + 6, curY + 40);
    doc.text(`Für den Betreiber (Campus-Groovelab / Patrick Huber)`, margin + 90, curY + 40);

    // Save and download PDF
    const filename = `DSB_Compliance_Dossier_${cleanSchoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_2026.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('[dpoComplianceDossierGenerator] Error generating PDF:', err);
    alert('Fehler beim Generieren des Compliance-Dossiers. Bitte versuchen Sie es erneut.');
  }
}
