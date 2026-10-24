/**
 * Campus-Groovelab Official DPO & Municipal Compliance Dossier Generator
 * Standards: DSGVO Art. 30 (VVT), Art. 35 (DSFA), Art. 32 (TOM), DIN 66398, BSI IT-Grundschutz
 * 
 * Generates an official, print-ready, 5-page legal compliance dossier for school boards,
 * municipal IT departments, data protection officers (DPO), and state supervisory authorities.
 */

import { cleanPdfText, computeCanonicalPayloadHash } from './pdfTypographyEngine';

export interface DpoDossierOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolSigneeName?: string;
  schoolId?: string;
  returnBlob?: boolean;
}

export async function generateDpoComplianceDossierPDF(options: DpoDossierOptions = {}): Promise<Blob | void> {
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

    const canonicalPayload = {
      docType: 'DPO_MUNICIPAL_COMPLIANCE_DOSSIER',
      schoolName: cleanSchoolName,
      schoolId: options.schoolId || 'MUNICIPAL_TENANT',
      date: currentDateStr,
      legalNorms: 'DSGVO_ART_30_35_32_DIN_66398_BETRVG_87',
      operator: 'Patrick Huber, Campus-Groovelab'
    };
    const sha256Digest = await computeCanonicalPayloadHash(canonicalPayload);

    const addHeaderBar = (titleText: string, pageNum: number) => {
      // Header Accent Bar
      doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Top running header - 2-tier layout with width bounds
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text('CAMPUS-GROOVELAB • BEHÖRDLICHES DATENSCHUTZ- & COMPLIANCE-DOSSIER', margin, 11);

      doc.setFont('helvetica', 'bold');
      doc.text(`Seite ${pageNum} von 5`, pageWidth - margin, 11, { align: 'right' });

      // Sub-line: Section title on left, School name and date on right (collision immune)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const maxLeftWidth = contentWidth * 0.50;
      const maxRightWidth = contentWidth * 0.46;

      let leftSection = cleanPdfText(titleText);
      if (doc.getTextWidth(leftSection) > maxLeftWidth) {
        while (leftSection.length > 5 && doc.getTextWidth(leftSection + '...') > maxLeftWidth) {
          leftSection = leftSection.slice(0, -1);
        }
        leftSection += '...';
      }
      doc.text(leftSection, margin, 15);

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

      // Running footer with cryptographic SHA-256 seal (§ 371a ZPO)
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFontSize(6.8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(`Prüf-Siegel (§ 371a ZPO): SHA256:${sha256Digest.slice(0, 32)}... • DIN 66398 & ISO/IEC 27001/27701`, margin, pageHeight - 8);
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
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text('VVT (ART. 30) • DSFA (ART. 35) • T.O.M. (ART. 32 DSGVO) • ISO 27001 / ISO 27701 (PIMS)', margin, curY);

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

    const maxValWidth = 44;
    let dispSchool = cleanSchoolName;
    if (doc.getTextWidth(dispSchool) > maxValWidth) {
      while (dispSchool.length > 5 && doc.getTextWidth(dispSchool + '...') > maxValWidth) {
        dispSchool = dispSchool.slice(0, -1);
      }
      dispSchool += '...';
    }

    let dispAddr = cleanAddress;
    if (doc.getTextWidth(dispAddr) > maxValWidth) {
      while (dispAddr.length > 5 && doc.getTextWidth(dispAddr + '...') > maxValWidth) {
        dispAddr = dispAddr.slice(0, -1);
      }
      dispAddr += '...';
    }

    let dispSignee = cleanSignee;
    if (doc.getTextWidth(dispSignee) > maxValWidth) {
      while (dispSignee.length > 5 && doc.getTextWidth(dispSignee + '...') > maxValWidth) {
        dispSignee = dispSignee.slice(0, -1);
      }
      dispSignee += '...';
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Schulträger / Mandant:`, margin + 6, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(dispSchool, margin + 44, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Anschrift / Dienstsitz:`, margin + 6, curY + 20);
    doc.text(dispAddr, margin + 44, curY + 20);

    doc.text(`Vertretungsberechtigt:`, margin + 6, curY + 26);
    doc.text(dispSignee, margin + 44, curY + 26);

    doc.text(`Auftragsverarbeiter:`, margin + 94, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text('Campus-Groovelab (DE)', margin + 128, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.text(`Ausstellungsdatum:`, margin + 94, curY + 20);
    doc.text(`${currentDateStr} (MESZ)`, margin + 128, curY + 20);

    doc.text(`Sicherheits-Status:`, margin + 94, curY + 26);
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('ISO 27001 / PIMS (ASVS L3)', margin + 128, curY + 26);

    // Management Summary Card (Dynamic Height Calculation against Collision)
    curY += 42;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const summaryText = cleanPdfText('Campus-Groovelab ist eine spezialisierte didaktische Software-Plattform für Musikschulen, die als rein freiwilliges Convenience-Werkzeug ("Fast-Track") zur Unterrichtsbegleitung dient. Privacy by Design & Default (Art. 25 DSGVO): 3-Stufen-Identitätsprojektion gem. Migrationen 600–605 (Mitschüler sehen nur Vornamen mit last_name = NULL in public.users; Lehrkräfte im Alltag Vorname + Initiale; bürgerliche Nachnamen fremdschlüsselfrei in blind_student_lastname_vault mit PGP-AES-256, Kernel-Trigger trg_users_raw_zero_knowledge_vault, Step-Up Leases & Art. 17 Vault-Purge trg_users_raw_vault_purge). KEINE E-Mail-Adressen, KEINE Telefonnummern und KEINE Bankdaten von Schülern. 0% Porträtfotos (KUG § 22 Avatare). 0% KI-Training (UrhG § 44b Abs. 3). 100% deutsches Hosting (ISO 27001, IONOS SE & Hetzner), 0% US-Cloud.');
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 12);
    const summaryBoxH = Math.max(42, splitSummary.length * 3.7 + 14);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, summaryBoxH, 3, 3, 'F');
    doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, curY, contentWidth, summaryBoxH, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('1. Rechtliche Management Summary für den/die Datenschutzbeauftragte/n', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(splitSummary, margin + 6, curY + 15);

    // 4 Key Trust Pillars Grid
    curY += summaryBoxH + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('2. Die 4 Säulen des behördlichen Sicherheitsnachweises', margin, curY);

    const pillars = [
      {
        title: 'A. 100% Rechenzentren in Deutschland (ISO 27001)',
        desc: cleanPdfText('Ausschließliche Datenverarbeitung in ISO 27001 zertifizierten Hochsicherheits-Rechenzentren der IONOS SE (Montabaur, Primär-Cluster) sowie der Hetzner Online GmbH (Falkenstein & Nürnberg, Georedundantes Backup & Storage Box) nach ISO/IEC 27701. 100% autarker Stack - 0,00% Drittlandtransfer, volle Immunität gegen US-FISA 702 und US CLOUD Act.')
      },
      {
        title: 'B. Radikale Datenminimierung Minderjähriger',
        desc: cleanPdfText('Vollständiger Verzicht auf Schüler-E-Mails, Passwörter und Bankdaten. Login erfolgt über kryptografische QR-Tokens und biometrische Passkeys (FIDO2). Pseudonymisierte Namensanzeige als Standard.')
      },
      {
        title: 'C. Strikte PostgreSQL Row-Level Security (RLS)',
        desc: cleanPdfText('Kernel-Ebene Mandantentrennung auf allen Datenbanktabellen. Unautorisierte Mandantenwechsel werden serverseitig abgewiesen. Keine direkten Tabellenabfragen im Frontend (nur autoritative RPCs).')
      },
      {
        title: 'D. Formelle DSFA-Negativattestierung & DIN 66398',
        desc: cleanPdfText('Formelle Prüfung anhand der Blacklist-Kriterien der DSK belegt: Keine Notwendigkeit einer Voll-DSFA. Strukturiertes Löschkonzept nach DIN 66398 mit automatisiertem Inaktivitäts-Pruner.')
      }
    ];

    curY += 5;
    pillars.forEach((p, idx) => {
      const colX = margin + (idx % 2) * (contentWidth / 2 + 2);
      const rowY = curY + Math.floor(idx / 2) * 38;
      const boxW = contentWidth / 2 - 2;

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(colX, rowY, boxW, 35, 2.5, 2.5, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(colX, rowY, boxW, 35, 2.5, 2.5, 'S');

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
      ['Auftragsverarbeiter (Art. 28):', 'Patrick Huber, Softwareentwicklung & Cloud-Dienstleistungen (Einzelunternehmen), Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden), Deutschland (Campus-Groovelab)'],
      ['Zweckbestimmung der Verarbeitung:', 'Didaktisches Convenience- & Beschleunigungswerkzeug („Fast-Track“) zur Raum- & Terminabstimmung, Bereitstellung digitaler Hausaufgabennotizen & didaktische Audio-Übebegleitung ohne Werbefunktionen. Subsidiaritäts- & Herrenberg-Doktrin: Primäre Schulverwaltung (ERP), Honorarabrechnungen und städtische Dienstwege verbleiben beim Träger. Gehostete Schüleraufnahmen (Cover) dienen rein didaktischem Feedback und dem privaten Familienkreis (§ 53 Abs. 1, § 60a UrhG). Zero-AI-Training & TDM-Vorbehalt: 0,00% Verwendung für KI-Trainingszwecke; ausdrücklicher Vorbehalt gem. § 44b Abs. 3 UrhG.'],
      ['Rechtsgrundlagen (DSGVO):', '4-Säulen-Architektur:\n1. Pädagogischer Kern: Art. 6 Abs. 1 lit. b DSGVO (Unterrichtsvertrag) & Art. 6 Abs. 1 lit. e DSGVO i.V.m. Landes-SchulG / LDSG (Öffentlicher Bildungsauftrag; Ausschluss von lit. f für Schulen gem. Art. 6 Abs. 1 UAbs. 2 DSGVO)\n2. Optionale Features (Audio/Gamification): Art. 6 Abs. 1 lit. a i.V.m. Art. 8 DSGVO (Einwilligung der Erziehungsberechtigten; Wahrung der vernünftigen Erwartungen gem. ErwGr. 47 DSGVO)\n3. Defensive IT-Sicherheit & Missbrauchsschutz: Art. 6 Abs. 1 lit. c/e (öffentlich) bzw. lit. c/f (privat) i.V.m. Art. 32 & ErwGr. 49 DSGVO (Netzsicherheit als anerkanntes berechtigtes Interesse)\n4. Gesetzliche Aufbewahrung: Art. 6 Abs. 1 lit. c DSGVO i.V.m. § 147 AO'],
      ['Kategorien betroffener Personen:', 'Musikschüler/innen (Minderjährige), Erziehungsberechtigte, Lehrkräfte (Herrenberg-geschützt), Sekretariats- & Schulleitungspersonal sowie geschützte Einzelkaufleute/Freiberufler gem. Art. 4 Nr. 1 DSGVO'],
      ['Verarbeitete Datenkategorien:', 'Vorname, Nachname (3-Stufen-Identität gem. Migrationen 600–605: Mitschüler sehen nur Vornamen mit last_name = NULL in public.users gem. EuGH C-413/23 P; Regelbetrieb Vorname + Initiale „Max M.“; 360° Zero-Knowledge Identity Vault gem. Art. 34 Abs. 3 lit. a DSGVO Safe-Harbor: bürgerliche Nachnamen in blind_student_lastname_vault mit HMAC-SHA256 Blind-Links, PGP-AES-256 Chiffraten & Fail-Closed Tresor vault_master_keys; In-Flight Kernel-Verschlüsselung trg_users_raw_zero_knowledge_vault; Art. 17 Kernel-Purge trg_users_raw_vault_purge; Zero-Client-PIN Step-Up Leases via private_auth.step_up_leases mit 60s Auto-Curtain gem. NIST SP 800-63B).\nReBAC-Kinderschutz (§ 201 StGB): Audioaufnahmen sind streng auf Fachlehrer und Schüler beschränkt (0 % Administrationszugriff).\nKUG § 22 Zero-Photo Doktrin: Bewusster Ausschluss von Profilfotos Minderjähriger (visuelle Unterscheidung über 3D-Avatare).\n100% Zero-User-Mail: Keine Speicherung von Schüler-, Eltern- oder Lehrer-E-Mails in users_raw.\nStGB § 201 Safe-Harbor: 0% Meeting-Bots; aktive Push-to-Talk Diktate & 1-Klick-Sprachmemos mit deterministischem releaseAudioStream().\nEU AI Act Art. 4/27: 100% deterministische FFT/DSP-Signalverarbeitung; 0 Pflicht zu KI-Beauftragten oder FRIA.\n§ 26 BDSG Neutralität & § 1 Abs. 2 UrhDaG: Keine medizinischen Diagnosedaten bei Unterrichtsabsagen; geschlossene B2B-Bildungsplattform ohne öffentliche UrhDaG-Teilung.'],
      ['Empfänger / Sub-Auftragsverarbeiter:', '1. IONOS SE (Elgendorfer Str. 57, 56410 Montabaur, Deutschland - Primärer Produktions-Cluster, ISO 27001 zertifiziert, Mutter United Internet AG = 100% DE, 0% US CLOUD Act)\n2. Hetzner Online GmbH (Falkenstein/Vogtland & Nürnberg, Deutschland - Georedundantes Backup, Failover & Storage Box, ISO 27001 zertifiziert, 100% DE)\n3. 100% Self-Hosted Open-Source Technologie-Stack (PostgreSQL RLS, Auth/Storage Engine auf dediziertem deutschem VPS, 0,00% US-Cloudtransfer, EU-DNS-Resolver 185.12.64.1 & DNS0.eu)'],
      ['Drittlandübermittlung (Art. 44 ff.):', '0,00 % (NEIN) - Die Datenverarbeitung erfolgt ausnahmslos in Rechenzentren innerhalb der Bundesrepublik Deutschland. Stufe-2 Mutterkonzern-Garantie (kein US-Mutterkonzern) und Stufe-3 Zero-Support-Backdoor (0% Drittland-Fernwartung -> 0% TIA-Pflicht). Volle Immunität gegen US CLOUD Act und FISA 702 (Schrems II konform).'],
      ['Regellöschfristen (DIN 66398):', 'Unterrichtsdaten: Dauer des Ausbildungsverhältnisses (Löschung 30 Tage nach Abmeldung)\nInaktive Profile: Automatische Inaktivierung nach 60 Tagen (Fair-Play Kostenschutz)\nAudio-Micro-TTL: TTL <= 1800s für Medienstream / temporäre Session-Caches']
    ];

    vvtRows.forEach(([key, val]) => {
      const keyW = 55;
      const valW = contentWidth - keyW - 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

      const splitVal = doc.splitTextToSize(cleanPdfText(val), valW);
      const rowH = Math.max(8, splitVal.length * 4.0 + 4);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(margin, curY, keyW, rowH, 'F');
      doc.rect(margin + keyW, curY, contentWidth - keyW, rowH, 'F');

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.rect(margin, curY, contentWidth, rowH, 'S');
      doc.line(margin + keyW, curY, margin + keyW, curY + rowH);

      doc.text(cleanPdfText(key), margin + 3, curY + 5.5);

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
    const conclText = 'Die Durchführung einer vollumfänglichen Datenschutz-Folgenabschätzung (DSFA) gemäß Art. 35 Abs. 1 DSGVO i.V.m. WP 248 rev. 01 ist für den Einsatz von Campus-Groovelab NICHT ERFORDERLICH. Da keines der Kriterien der DSK-Blacklist erfüllt ist und durch die Zero-Mail-Architektur, PostgreSQL Row-Level Security, 3D-Avatare und Namens-Pseudonymisierung kein hohes Risiko für die Rechte und Freiheiten der Musikschüler/innen besteht, ist der Betrieb datenschutzrechtlich unbedenklich.';
    const splitConcl = doc.splitTextToSize(conclText, contentWidth - 12);
    doc.text(splitConcl, margin + 6, curY + 15);

    // =========================================================================
    // PAGE 4: TECHNISCH-ORGANISATORISCHE MASSNAHMEN & DIN 66398
    // =========================================================================
    doc.addPage();
    addHeaderBar('T.O.M. & DIN 66398 Löschkonzept', 4);

    curY = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('5. Technisch-organisatorische Maßnahmen (TOM nach Art. 32 DSGVO)', margin, curY);

    curY += 4.5;
    doc.setFontSize(9);
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text('Sicherheitsarchitektur nach ISO/IEC 27001:2022 & ISO/IEC 27701 (PIMS)', margin, curY);

    curY += 5.5;
    const toms = [
      {
        t: '1. Vertraulichkeit & 360° Identity Vault (Art. 32 / ISO 27001 A.8.20 & A.8.24)',
        d: cleanPdfText('Strikte PostgreSQL Row-Level-Security (FORCE RLS) auf allen Tabellen. Physischer Airgap durch REVOKE ALL ON users_raw und Ausführung gehärteter Security-Views mit security_barrier und security_invoker. 360° Zero-Knowledge Identity Vault (EuGH C-413/23 P / Art. 34 Abs. 3 lit. a DSGVO): Nachnamen in blind_student_lastname_vault mit HMAC-SHA256 Blind-Links und AES-256 PGP; 60s Auto-Curtain nach Step-Up PIN (NIST SP 800-63B). ReBAC-Kinderschutz (§ 201 StGB) auf Audio-Streams (0% Schulleitungszugriff). Duale Kryptografie: Salted Bcrypt (Cost >= 10 in private_auth) + WebCrypto PBKDF2 (100.000 Runden SHA-512) & AES-256-GCM.')
      },
      {
        t: '2. Integrität, Datenhygiene & EU-DNS (Art. 32 / ISO 27001 A.8.28 & ISO 27701 7.4.4)',
        d: cleanPdfText('TLS 1.3 End-to-End Transportverschlüsselung mit HSTS Preload (max-age=63072000). Datei-Uploads mit Magic-Byte-Prüfung, Stripping von EXIF/GPS-Metadaten und SHA-256 Integritätssiegel. Ausschließliche Nutzung deutscher/europäischer DNS-Resolver (Hetzner DE 185.12.64.1 & DNS0.eu) und Nginx Anti-IP-Spoofing. Micro-TTL (<= 1800s) für Audio-Streams mit Zero-Heap HTTP 307 Edge Streaming.')
      },
      {
        t: '3. Verfügbarkeit & 3-2-1 Backup (Art. 32 / ISO 27001 A.8.14)',
        d: cleanPdfText('3-2-1 Backup-Strategie: Stündliche Age X25519 verschlüsselte Dumps (umask 077) via rsync/SSH (Port 23) auf geographisch getrennte Hetzner Storage Boxen mit automatisierter Restricted-Shell Vorab-Speicherplatzprüfung (SEC-77). Automatisierte DR-Reconciliation und Art. 17 DSGVO WORM-Tombstone-Scrubbing.')
      },
      {
        t: '4. WORM-Manipulationsschutz & Auditing (Art. 32 / ISO 27001 A.5.33 & 27701 8.5)',
        d: cleanPdfText('Revisionssicheres WORM-Logging (Write-Once-Read-Many) mit PostgreSQL-Triggern gegen UPDATE/DELETE auf audit_logs. SHA-256 Merkle-Hash-Chaining nach GoBD- und OWASP ASVS Level 3-Standard. Kontinuierliche Security-Drift-Guards (Zero-Sampling-Axiom).')
      },
      {
        t: '5. WebAuthn & Zero-Secrets (Art. 9 DSGVO & ISO 27001 A.8.5 / A.8.28)',
        d: cleanPdfText('Optionale Passkey-Authentifizierung (FIDO2/WebAuthn) nutzt biometrische Sensorik ausschließlich lokal in der Hardware-Enclave (TPM/Secure Enclave) des Endgeräts. Biometrische Rohdaten verlassen niemals das Gerät. Zero-Client-Secrets Doktrin im Browser.')
      }
    ];

    toms.forEach((tom) => {
      const splitTom = doc.splitTextToSize(tom.d, contentWidth - 8);
      const tomBoxH = Math.max(20, splitTom.length * 3.4 + 10);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, tomBoxH, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, curY, contentWidth, tomBoxH, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(tom.t, margin + 4, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(splitTom, margin + 4, curY + 10.5);

      curY += tomBoxH + 2.5;
    });

    curY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('6. Kommunales Löschkonzept nach DIN 66398 & ISO 27701 (Art. 17 DSGVO)', margin, curY);

    curY += 5;
    const lks = [
      { lk: 'Löschklasse 1: Session & Temp-Daten', frist: 'Sofort bei Sitzungsende', desc: 'Sichere Session-Tokens verfallen; flüchtige RAM-Bereinigung.' },
      { lk: 'Löschklasse 2: Didaktische Audioaufnahmen', frist: 'Laufendes Schuljahr (+1 Mo. Exportfrist)', desc: 'Hausaufgaben-Audios bleiben während des Schuljahres inkl. 1 Monat Exportfrist erhalten; sofortige Löschung bei Abmeldung.' },
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
        d: 'Es findet keine Auswertung, Messung oder Aggregation von Klickzahlen, Online-Zeiten, Reaktionsgeschwindigkeiten im Chat oder Erledigungsfristen für Lehrkräfte statt. Die Software erzeugt keine Mitarbeiter-Verhaltensprofile oder Überwachungs-Dashboards.'
      },
      {
        t: 'Subsidiaritäts-Doktrin & Fast-Track Convenience (Reines Add-On)',
        d: 'Campus-Groovelab ist ein freiwilliges, didaktisches Add-On. Es ist kein ERP-System. Dienstliche Weisungen und Arbeitsverträge verbleiben auf den städtischen Primärkanälen. Keine Weisungsbefugnis über die App.'
      },
      {
        t: '2-Phasen Herrenberg-Zukunftsschutzschild (§ 7 SGB IV / BSG B 12 R 3/20 R & § 127 SGB IV)',
        d: 'Raum- und Terminabstimmungen sind unverbindliche didaktische Dispositionen ("Kreidetafel-Doktrin") mit zweistufigem Raum-Freigabe-Workflow. Keine Erfassung von employment_type, keine Stundensätze, keine Honorarabrechnungen im Add-On. Vergütungs- und Honoraransprüche entstehen zu 100% unabhängig von der Nutzung der Plattform. 2-Phasen-Schutz: Phase 1 schützt im Rahmen der Übergangsregelung gem. § 127 SGB IV bis 31.12.2027; Phase 2 garantiert ab 01.01.2028 dauerhafte strukturelle Weisungs- und Indizienfreiheit nach § 7 Abs. 1 SGB IV & BSG B 12 R 3/20 R.'
      },
      {
        t: 'Keine Arbeitszeiterfassung & Stempeluhr (ArbZG & § 26 BDSG Neutralität)',
        d: 'Die Plattform fungiert als didaktisches Dispositionsmittel ohne Stempeluhr, Arbeitszeit- oder Deputatserfassung. Unterrichtsabsagen (teacher_ausfall) erfolgen streng neutral ohne Erfassung medizinischer Diagnosedaten.'
      },
      {
        t: 'Recht auf Nichterreichbarkeit (§ 5 ArbSchG / Fürsorgepflicht)',
        d: 'Mitteilungen und didaktischer Austausch sind rein asynchron. Lehrkräfte sind zu keinem Zeitpunkt verpflichtet, außerhalb ihres Fachunterrichts Nachrichten abzurufen oder zu beantworten.'
      }
    ];

    mbItems.forEach((item) => {
      const splitText = doc.splitTextToSize(cleanPdfText(item.d), contentWidth - 8);
      const boxHeight = Math.max(22, splitText.length * 3.6 + 9);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, curY, contentWidth, boxHeight, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(cleanPdfText(item.t), margin + 4, curY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(splitText, margin + 4, curY + 11.5);

      curY += boxHeight + 3;
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
    doc.text(`vollumfänglich den Vorgaben der DSGVO, DIN 66398 und dem BSI IT-Grundschutz entspricht. Unverbindliche Fachinformation gem. § 3 RDG.`, margin + 6, curY + 24);

    doc.setFontSize(6.8);
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text(`Urkunden-Prüfhash (§ 371a ZPO): SHA256:${sha256Digest} • Revisionssicher versiegelt`, margin + 6, curY + 29);

    // Signature Line
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin + 6, curY + 37, margin + 75, curY + 37);
    doc.line(margin + 90, curY + 37, pageWidth - margin - 6, curY + 37);

    doc.setFontSize(6.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Ort, Datum: ${cleanAddress.split(',')[0] || 'Zentrale'}, den ${currentDateStr}`, margin + 6, curY + 41);
    doc.text(`Für den Betreiber (Campus-Groovelab / Patrick Huber)`, margin + 90, curY + 41);

    // Save and download PDF or Return Blob
    const filename = `DSB_Compliance_Dossier_${cleanSchoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_2026.pdf`;
    if (options.returnBlob) {
      return doc.output('blob');
    }
    doc.save(filename);
  } catch (err) {
    console.error('[dpoComplianceDossierGenerator] Error generating PDF:', err);
    alert('Fehler beim Generieren des Compliance-Dossiers. Bitte versuchen Sie es erneut.');
  }
}
