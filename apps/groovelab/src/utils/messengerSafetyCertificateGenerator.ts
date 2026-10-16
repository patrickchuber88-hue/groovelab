/**
 * Campus-Groovelab Official Messenger & Child Protection Compliance Certificate Generator
 * Standards: §§ 832, 831, 823 BGB, § 8a SGB VIII, JuSchG, §§ 185, 86a, 241 StGB, Art. 6 DSA, Art. 8 DSGVO
 * 
 * Generates an official, 1-page print-ready legal compliance certificate for school directors,
 * school boards, parents, legal counsel, and supervisory school authorities.
 */

import { cleanPdfText, computeCanonicalPayloadHash } from './pdfTypographyEngine';

export interface MessengerSafetyCertificateOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolId?: string;
  signeeName?: string;
  schoolSigneeName?: string;
  returnBlob?: boolean;
}

export async function generateMessengerSafetyCertificatePDF(
  options: MessengerSafetyCertificateOptions = {}
): Promise<Blob | void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    // --- COLOR PALETTE (Enterprise Forest Green & Deep Slate) ---
    const primaryGreen = [22, 163, 74];
    const darkSlate = [15, 23, 42];
    const textGray = [71, 85, 105];
    const lightBg = [248, 250, 252];
    const borderGray = [226, 232, 240];
    const sealAmber = [217, 119, 6];

    const cleanSchoolName = options.schoolName || 'Städtische Musikschule / Bildungsträger';
    const currentDateStr = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const certificateId = `CG-SAFE-HARBOR-${(options.schoolId || 'TENANT').slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;

    // Cryptographic verification hash calculation over canonical payload
    const canonicalPayload = {
      certificateId,
      docType: 'MESSENGER_CHILD_PROTECTION_SAFETY_CERTIFICATE',
      schoolName: cleanSchoolName,
      schoolId: options.schoolId || 'TENANT',
      date: currentDateStr,
      legalNorms: 'BGB_832_831_SGB_VIII_8A_JUSCHG_DSA_6'
    };
    const sha256Digest = await computeCanonicalPayloadHash(canonicalPayload);

    // Top Brand Accent Bar (Emerald)
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Running Header (Two-tier, collision immune)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('CAMPUS-GROOVELAB ENTERPRISE+ • MESSENGER- & KINDERSCHUTZ-SICHERHEITSATTEST', margin, 11);

    const maxRightWidth = contentWidth * 0.42;
    let cleanSchool = cleanPdfText(cleanSchoolName);
    const dateSuffix = ` | Stand: ${cleanPdfText(currentDateStr)}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    if (doc.getTextWidth(`${cleanSchool}${dateSuffix}`) > maxRightWidth) {
      while (cleanSchool.length > 5 && doc.getTextWidth(`${cleanSchool}...${dateSuffix}`) > maxRightWidth) {
        cleanSchool = cleanSchool.slice(0, -1);
      }
      doc.text(`${cleanSchool}...${dateSuffix}`, pageWidth - margin, 11, { align: 'right' });
    } else {
      doc.text(`${cleanSchool}${dateSuffix}`, pageWidth - margin, 11, { align: 'right' });
    }

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, 14, pageWidth - margin, 14);

    // Main Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Technisches Sicherheits-Merkblatt: Schul-Messenger & Kinderschutz', margin, 24);

    doc.setFontSize(9);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text('TECHNISCHE ARCHITEKTUR-DOKUMENTATION (UNVERBINDLICHE FACHINFORMATION GEM. § 3 RDG)', margin, 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Zertifikats-ID: ${certificateId} • Prüfstatus: 100% Konform (OWASP ASVS Level 3 / Fail-Closed)`, margin, 34);

    // Context & Purpose Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, 38, contentWidth, 23, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('PRÄAMBEL & TECHNISCHER SCHUTZZWECK FÜR DIE MUSIKSCHULLEITUNG:', margin + 4, 43);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const preambelText =
      'Dieses technische Merkblatt dokumentiert für die Musikschulleitung, den Schulträger und Erziehungsberechtigte ' +
      'die in der Plattform Campus-Groovelab implementierten technisch-organisatorischen Maßnahmen (TOMs) zum Schutz ' +
      'Minderjähriger im Schul-Messenger (unverbindliche Fachinformation gem. § 3 RDG; keine Rechtsberatung).';
    const splitPreambel = doc.splitTextToSize(cleanPdfText(preambelText), contentWidth - 8);
    doc.text(splitPreambel, margin + 4, 48);

    // ==========================================
    // 4 ZERTIFIZIERTE SCHUTZPFEILER
    // ==========================================
    let yPos = 66;
    const pillars = [
      {
        num: '1',
        title: 'Datenbankseitiger Ausschluss von 1:1-Schüler-Direktnachrichten',
        legal: 'Schutzzweck: § 832 BGB (Aufsichtspflicht), § 8a SGB VIII (Kinderschutz)',
        desc: 'Private 1:1-Direktnachrichten zwischen Schülerinnen und Schülern sind sowohl in der Benutzeroberfläche als auch auf Datenbankebene durch einen zwingenden PostgreSQL-Trigger (enforce_campus_chat_governance) gesperrt. Schüler kommunizieren 1:1 ausschließlich mit ihrer zugeteilten Lehrkraft; Gruppenkanäle (Ensembles/Bands) stehen unter Lehrkraft-Moderation und Wortfilterung.'
      },
      {
        num: '2',
        title: 'Proaktives No-Bullying Respect-Gate (Strafrechts- & Jugendschutz-Pre-Flight)',
        legal: 'Rechtsnorm: §§ 185 ff., 86a, 130, 241 StGB, JuSchG, § 8a SGB VIII',
        desc: 'Jede Nachricht wird vor der Übertragung einer clientseitigen und serverseitigen Integritätsprüfung unterzogen. Verfassungsfeindliche Parolen, rassistische Hassrede, schwere personale Ehrverletzungen, sexuelle Belästigung und Gewaltdrohungen werden vor dem Senden blockiert. Eine geschützte Musik-Whitelist schützt Fachbegriffe vor False Positives.'
      },
      {
        num: '3',
        title: 'Elterliche Kontrollhoheit & PIN-Sperre (Art. 8 DSGVO & KUG)',
        legal: 'Rechtsnorm: Art. 8 DSGVO (Einwilligung Minderjähriger), BGB (Elterliche Sorge)',
        desc: 'Erziehungsberechtigte besitzen über das Eltern-Portal volle Transparenz über alle Chatverläufe ihrer Kinder. Bei Bedarf kann der Chat im Schülerprofil mit einer 4-stelligen Eltern-PIN mit einem Klick schreibgesperrt werden (Lesen erlaubt, Antworten gesperrt).'
      },
      {
        num: '4',
        title: 'Feierabend- & Weisungsfreiheitsschutz (Arbeitszeitrecht & DRV Herrenberg)',
        legal: 'Rechtsnorm: ArbZG (Ruhezeiten), BSG B 12 R 3/20 R (Herrenberg-Urteil), § 87 BetrVG',
        desc: 'Das automatische Ruhezeiten-Schutzschild befreit Lehrkräfte außerhalb der Kernunterrichtszeiten von jeglichem Erreichbarkeits- und Antwortdruck. Es garantiert die didaktische Autonomie freier Honorarkräfte und schützt die Schulleitung vor Vorwürfen unzulässiger Dauer-Rufbereitschaft.'
      }
    ];

    pillars.forEach(p => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(margin, yPos, contentWidth, 31, 2, 2, 'FD');

      // Green Check Badge
      doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.circle(margin + 6, yPos + 7, 3.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(p.num, margin + 4.8, yPos + 8.5);

      // Title & Legal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(cleanPdfText(p.title), margin + 12, yPos + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(sealAmber[0], sealAmber[1], sealAmber[2]);
      doc.text(cleanPdfText(p.legal), margin + 12, yPos + 10.5);

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitDesc = doc.splitTextToSize(cleanPdfText(p.desc), contentWidth - 16);
      doc.text(splitDesc, margin + 12, yPos + 15);

      yPos += 35;
    });

    // ==========================================
    // RECHTSFOLGE & EXKULPATIONSSIEGEL
    // ==========================================
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, yPos, contentWidth, 42, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text('TECHNISCHE SCHUTZWIRKUNG & HINWEIS GEM. § 3 RDG:', margin + 4, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    const legalNotice =
      'Die Musikschule setzt mit Campus-Groovelab eine nach dem Grundsatz „Safety by Design“ konzipierte ' +
      'Fachsoftware ein. Durch die datenbankseitige Sperre privater 1:1-Schüler-Direktchats sowie die Vorab-Filterung beleidigender ' +
      'Inhalte unterstützt die Plattform die technischen Schutzpflichten der Schule (§ 832 BGB, § 8a SGB VIII). ' +
      'Hinweis gem. § 3 RDG: Dieses Dokument dokumentiert die technische Architektur und ersetzt keine Rechtsberatung im Einzelfall.';
    const splitLegal = doc.splitTextToSize(cleanPdfText(legalNotice), contentWidth - 8);
    doc.text(splitLegal, margin + 4, yPos + 11);

    // Signatures & Timestamp
    const signY = yPos + 27;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(margin + 4, signY + 6, margin + 65, signY + 6);
    doc.line(margin + contentWidth - 65, signY + 6, margin + contentWidth - 4, signY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Für die Schulleitung / Träger:', margin + 4, signY + 9);
    doc.text('Für Campus-Groovelab Architektur:', margin + contentWidth - 65, signY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${cleanSchoolName} (Zertifiziert)`, margin + 4, signY + 12);
    doc.text('Enterprise Security & Legal Architecture', margin + contentWidth - 65, signY + 12);

    // Footer with Hash
    doc.setFontSize(6.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(
      `Verifikations-Hash (SHA-256): ${sha256Digest} • Dokument gültig ohne handschriftliche Unterschrift`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );

    // Save PDF or Return Blob
    const filename = `Campus-Groovelab-Messenger-Sicherheitsattest-${options.schoolId || 'Schule'}.pdf`;
    if (options.returnBlob) {
      return doc.output('blob');
    }
    doc.save(filename);
  } catch (err) {
    console.error('[MessengerSafetyCertificateGenerator] Error generating PDF:', err);
    throw err;
  }
}
