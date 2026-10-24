/**
 * Campus-Groovelab Official Parent Information Sheet Generator (PDF)
 * Standards: Art. 6 Abs. 1 lit. b/e, Art. 13 & 14 DSGVO, KUG § 22, DIN 66398
 * 
 * 0,1% Senior IT-Volljurist Goldstandard:
 * Amtliches Datenschutz- & Transparenzmerkblatt für Erziehungsberechtigte.
 * 
 * Bürokratiefreies Prinzip (Zero Paper Return):
 * Reines Informationsblatt für die Elternunterlagen.
 * Keine Unterschrift und kein Rücklauf an das Schulsekretariat erforderlich,
 * da die pädagogische Grundverarbeitung unmittelbar durch die Schüleranmeldung /
 * den Unterrichtsvertrag legitimiert ist (Art. 6 Abs. 1 lit. b & e DSGVO).
 * Optionale Zusatzfunktionen (Audio gem. § 73 UrhG, Messenger) werden papierlos
 * direkt in der App über die persönliche Eltern-PIN gesteuert (Art. 8 DSGVO).
 */

import { cleanPdfText, computeCanonicalPayloadHash } from './pdfTypographyEngine';

export interface ParentConsentPdfOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolId?: string;
  hasCampusSub?: boolean;
  hasGroovelabSub?: boolean;
  studentBillingOption?: string;
  returnBlob?: boolean;
}

export async function generateParentConsentPDF(
  options: ParentConsentPdfOptions = {}
): Promise<Blob | void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    // --- Enterprise Color Palette ---
    const primarySlate = [15, 23, 42];  // #0f172a
    const brandEmerald = [16, 185, 129]; // #10b981
    const darkEmerald = [5, 150, 105];   // #059669
    const deepForest = [22, 101, 52];    // #166534
    const textGray = [71, 85, 105];      // #475569
    const lightBg = [248, 250, 252];     // #f8fafc
    const lightEmeraldBg = [240, 253, 244]; // #f0fdf4
    const borderGray = [226, 232, 240];  // #e2e8f0
    const borderEmerald = [187, 247, 208]; // #bbf7d0

    const cleanSchoolName = options.schoolName || 'Städtische Musikschule';
    const currentDateStr = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const isGrooveOnly = !options.hasCampusSub && options.hasGroovelabSub;
    const isCampusOnly = options.hasCampusSub && !options.hasGroovelabSub;
    let appTitle = 'Campus & GrooveLab';
    let subjectTitle = 'Instrumental-, Band- & Ensembleunterrichts';
    if (isGrooveOnly) {
      appTitle = 'GrooveLab';
      subjectTitle = 'Groovelab- & Bandunterrichts';
    } else if (isCampusOnly) {
      appTitle = 'Campus';
      subjectTitle = 'Instrumental- & Vokalunterrichts';
    }

    const docId = `CG-ELTERN-INFO-${(options.schoolId || 'TENANT').slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;

    // Cryptographic hash for canonical authenticity (§ 371a ZPO)
    const canonicalPayload = {
      docId,
      docType: 'PARENTAL_GDPR_TRANSPARENCY_SHEET_ART_13',
      schoolName: cleanSchoolName,
      schoolId: options.schoolId || 'TENANT',
      date: currentDateStr,
      legalNorms: 'DSGVO_ART_6_1_B_E_ART_13_14_KUG_22_DIN_66398',
      appTitle
    };
    const sha256Digest = await computeCanonicalPayloadHash(canonicalPayload);

    // 1. Top Brand Accent Bar (Emerald)
    doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // 2. Running Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('OFFIZIELLES SCHUL-MERKBLATT • DATENSCHUTZINFORMATION NACH ART. 13 & 14 DSGVO', margin, 11);

    const schoolHeaderRight = `${cleanPdfText(cleanSchoolName)} • Stand: ${currentDateStr}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(schoolHeaderRight, pageWidth - margin, 11, { align: 'right' });

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, 14, pageWidth - margin, 14);

    // 3. Main Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primarySlate[0], primarySlate[1], primarySlate[2]);
    doc.text('Datenschutz- & Transparenzmerkblatt für Eltern', margin, 24);

    doc.setFontSize(9);
    doc.setTextColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
    doc.text(`ZUR PÄDAGOGISCHEN FACHANWENDUNG „${appTitle.toUpperCase()}“ (REINES INFORMATIONSBLATT)`, margin, 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Dokument-ID: ${docId} • Rechtsgrundlage: Art. 6 Abs. 1 lit. b/e, Art. 13, 14 DSGVO & KUG § 22`, margin, 34);

    // 4. Bürokratiefreie Entlastungs- & Präambel-Box (Green Border & Background)
    doc.setFillColor(lightEmeraldBg[0], lightEmeraldBg[1], lightEmeraldBg[2]);
    doc.setDrawColor(borderEmerald[0], borderEmerald[1], borderEmerald[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, 38, contentWidth, 27, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(deepForest[0], deepForest[1], deepForest[2]);
    doc.text('FÜR IHRE UNTERLAGEN • KEINE UNTERSCHRIFT & KEIN RÜCKLAUF AN DAS SEKRETARIAT ERFORDERLICH', margin + 4, 43.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(primarySlate[0], primarySlate[1], primarySlate[2]);
    const introText =
      `Sehr geehrte Eltern, liebe Erziehungsberechtigte, mit der Schüleranmeldung zum ${subjectTitle} haben Sie die vertragliche ` +
      `Basis für die Ausbildung gelegt. Zur Unterstützung des modernen Unterrichts setzt unsere Musikschule die digitale ` +
      `Fachanwendung „${appTitle}“ ein. Die Verarbeitung der pädagogischen Grunddaten stützt sich unmittelbar auf den bestehenden ` +
      `Unterrichtsvertrag (Art. 6 Abs. 1 lit. b & e DSGVO). Eine gesonderte Unterschrift auf diesem Bogen ist daher gesetzlich ` +
      `nicht erforderlich; das Blatt dient vollständig Ihrer Information nach Art. 13 & 14 DSGVO.`;
    const splitIntro = doc.splitTextToSize(cleanPdfText(introText), contentWidth - 8);
    doc.text(splitIntro, margin + 4, 48);

    // 5. Die 4 Informations- & Transparenzsäulen (Art. 13 & 14 DSGVO)
    let yPos = 69;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primarySlate[0], primarySlate[1], primarySlate[2]);
    doc.text('Garantierte Standards & gesetzliche Pflichtinformationen gem. Art. 13 DSGVO:', margin, yPos);

    yPos += 4.5;
    const pillars = [
      {
        num: '1',
        title: 'Gesetzliche Legitimation durch Schüleranmeldung (Art. 6 Abs. 1 lit. b & e DSGVO)',
        desc: 'Die Anlage des geschützten Schülerprofils, die Raum- und Stundenplandisposition sowie didaktische Hausaufgabennotizen dienen unmittelbar der Erfüllung des Ausbildungsvertrags bzw. des öffentlichen Bildungsauftrags. Es bedarf für den regulären Unterrichtsbetrieb keiner zusätzlichen Papier-Einwilligung (DSK-Kurzpapier Nr. 20).'
      },
      {
        num: '2',
        title: 'Zero US-Cloud & 3-Stufen Zero-Knowledge Identity Vault (Art. 25, 32 & 34 DSGVO / KUG § 22)',
        desc: '100% Hosting in zertifizierten deutschen Rechenzentren (IONOS SE & Hetzner, ISO 27001). 3-Stufen-Identität: Mitschüler sehen nur Vornamen (0% Nachname); Lehrkräfte im Alltag „Jonas M.“; bürgerliche Nachnamen fremdschlüsselfrei im Zero-Knowledge Vault (PGP-AES-256) mit 60s Auto-Curtain. 3D-Avatare statt Fotos (KUG § 22).'
      },
      {
        num: '3',
        title: 'Papierlose Eltern-PIN Steuerung direkt in der App (Art. 8 DSGVO & § 73 UrhG)',
        desc: 'Freiwillige Zusatzfunktionen – insbesondere didaktische Audio-Kurzaufnahmen gem. § 73 UrhG zur Lehrkraft-Rückmeldung (automatische Löschung nach max. 30 Minuten), der schulinterne Messenger sowie Ruhezeiten – steuern Sie als Erziehungsberechtigte papierlos, transparent und jederzeit widerrufbar direkt in der App über Ihre persönliche Eltern-PIN. Revisionssicher im WORM-Audit-Log protokolliert.'
      },
      {
        num: '4',
        title: 'Ihre Betroffenenrechte & Regellöschung nach DIN 66398 (Art. 13 Abs. 2, 15–21 DSGVO)',
        desc: 'Sie haben jederzeit das Recht auf unentgeltliche Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17) & Datenübertragbarkeit (Art. 20) via 1-Klick-Export. Bei Kontolöschung vernichtet der Kernel-Trigger trg_users_raw_vault_purge das Vault-Chiffrat deterministisch; Regellöschung nach DIN 66398.'
      }
    ];

    pillars.forEach((p) => {
      const descLines = doc.splitTextToSize(cleanPdfText(p.desc), contentWidth - 14);
      const boxHeight = Math.max(19, 9 + descLines.length * 3.4 + 2);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, contentWidth, boxHeight, 1.5, 1.5, 'FD');

      // Badge
      doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
      doc.roundedRect(margin + 3, yPos + 3, 5.5, 5.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(p.num, margin + 5.75, yPos + 7, { align: 'center' });

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(primarySlate[0], primarySlate[1], primarySlate[2]);
      doc.text(cleanPdfText(p.title), margin + 11, yPos + 7);

      // Desc
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(descLines, margin + 11, yPos + 11.5);

      yPos += boxHeight + 2.5;
    });

    // 6. Amtlicher Nachweis- & Kontakt-Kasten (Art. 13 Abs. 1 lit. a/b DSGVO)
    yPos += 2;
    const contactBoxHeight = 34;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, contentWidth, contactBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(primarySlate[0], primarySlate[1], primarySlate[2]);
    doc.text('KONTAKTDATEN DES VERANTWORTLICHEN & DATENSCHUTZBEAUFTRAGTEN (ART. 13 ABS. 1 DSGVO):', margin + 4, yPos + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(
      `Verantwortliche Stelle: ${cleanPdfText(cleanSchoolName)} (vertreten durch die Schulleitung / den Schulträger). ` +
      `Für Auskünfte zu Ihren Betroffenenrechten oder zur Ausübung Ihres Auskunftsrechts wenden Sie sich bitte direkt an die Schulleitung ` +
      `oder nutzen Sie die digitale 1-Klick-Datenauskunft direkt im gesicherten Eltern-Cockpit der Fachanwendung.`,
      margin + 4,
      yPos + 10,
      { maxWidth: contentWidth - 8 }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
    doc.text('Auftragsverarbeiter gem. Art. 28 DSGVO:', margin + 4, yPos + 22);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Campus-Groovelab / Patrick Huber Softwareentwicklung • 100% Deutsche Rechenzentren (IONOS & Hetzner ISO 27001)', margin + 56, yPos + 22);

    doc.text('Beschwerderecht:', margin + 4, yPos + 28);
    doc.text('Ihnen steht das Recht auf Beschwerde bei der zuständigen Landesbeauftragten für den Datenschutz (LfDI) zu.', margin + 28, yPos + 28);

    // 7. Footer mit kryptografischem Prüfsiegel (§ 371a ZPO)
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFontSize(6.4);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(
      `Urkunden-Prüfhash (§ 371a ZPO): SHA256:${sha256Digest} • Reines Transparenz-Informationsblatt gem. Art. 13 DSGVO`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Ausgestellt durch: ${cleanPdfText(cleanSchoolName)}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );

    // Save or Return Blob
    const filename = `Eltern_Datenschutzmerkblatt_Art13_DSGVO_${appTitle.replace(/\s+/g, '_')}_${(options.schoolName || 'Musikschule').replace(/\s+/g, '_')}.pdf`;
    if (options.returnBlob) {
      return doc.output('blob');
    }
    doc.save(filename);
  } catch (err) {
    console.error('[ParentConsentPdfGenerator] Error generating PDF:', err);
    throw err;
  }
}
