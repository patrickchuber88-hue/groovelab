/**
 * Campus-Groovelab Enterprise Security & Compliance Whitepaper Generator
 * 
 * Generates an official, print-ready BSI A+ / ISO 27001 / DSGVO Art. 32 
 * Compliance PDF for music school boards, municipal IT departments, and DPOs.
 */

export async function generateEnterpriseSecurityWhitepaperPDF(options?: { schoolName?: string }): Promise<void> {
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

    // ==========================================
    // PAGE 1: MANAGEMENT SUMMARY & ARCHITECTURE
    // ==========================================
    
    // Header Accent Bar
    doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Brand & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Campus-Groovelab', margin, 24);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.text('OFFIZIELLES ENTERPRISE SICHERHEITS- & DATENSCHUTZ-WHITEPAPER', margin, 30);

    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.setFontSize(8);
    const schoolSub = options?.schoolName ? `Schule: ${options.schoolName}` : 'Gültig für alle Schulträger';
    doc.text(`Dokument-Version: 2026.8-LTS | Datum: ${new Date().toLocaleDateString('de-DE')} | ${schoolSub}`, margin, 35);

    // Decorative Header Divider
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, pageWidth - margin, 38);

    // Executive Summary Badge Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, 43, contentWidth, 38, 3, 3, 'F');
    doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, 43, contentWidth, 38, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('1. Management Summary für Schulleitungen & Datenschutzbeauftragte', margin + 6, 51);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const summaryText = 'Campus-Groovelab erfüllt die höchsten europäischen Standards für Kinderschutz und Datensicherheit (BSI IT-Grundschutz, ISO/IEC 27001, DSGVO Art. 25/32 und COPPA). Als unterstützendes Convenience-Werkzeug („Fast-Track“) zur didaktischen Unterrichtsbegleitung schützt die Plattform durch Zero-Knowledge- und Zero-Mail-Architektur vor Datenlecks: Keine Speicherung von Schüler-E-Mails, Passwörtern oder Bankdaten.';
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 12);
    doc.text(splitSummary, margin + 6, 58);

    // 5 Core Security Axioms Table
    let curY = 90;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('2. Die 5 Säulen der Zero-Trust Sicherheitsarchitektur', margin, curY);

    const pillars = [
      {
        title: 'A. BFF Gateway & JWE A256GCM Token-Isolation',
        desc: 'Vollständige Entkopplung von Browser und Datenbank-Tokens. Sessions werden rein serverseitig mit AES-256-GCM verschlüsselt in __Host-session Cookies geführt (Zero-Token-Leakage in LocalStorage / SessionStorage) inklusive proaktivem Silent Refresh.'
      },
      {
        title: 'B. Zero-Mail IAM & Biometrische Passkeys',
        desc: 'Vollständiger Verzicht auf anfällige E-Mail-Server. Authentifizierung über FIDO2/WebAuthn Passkeys, unvorhersehbare QR-Tokens und PBKDF2/Argon2id-Hashes. Konten sind 100% phishing-immun.'
      },
      {
        title: 'C. 100% PostgreSQL FORCE Row-Level Security (RLS)',
        desc: 'Alle 97 Datenbanktabellen erzwingen zwingende Mandantenisolation auf Kernel-Ebene mit isoliertem Transaktions-Kontext (is_local = true). Unautorisierte Cross-Tenant Zugriffe werden serverseitig abgewiesen.'
      },
      {
        title: 'D. Fail-Closed Anti-CSRF & Origin-Guard',
        desc: 'Schutz aller schreibenden Operationen durch browser-native Fetch Metadata (Sec-Fetch-Site), Origin- und Host-Header-Validierung sowie dynamisches IP-Rate-Limiting (3-Strike-Sperre).'
      },
      {
        title: 'E. Subresource Integrity (SRI) & Deutsche ISO 27001 Cloud',
        desc: 'Alle Bundles sind mit SHA-384 Hashes versiegelt. 100% Hosting in Deutschland (Hetzner Falkenstein/Nürnberg) mit stündlich automatisierten, verschlüsselten Backups.'
      }
    ];

    curY += 8;
    pillars.forEach((p) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
      doc.text(p.title, margin + 4, curY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      const splitP = doc.splitTextToSize(p.desc, contentWidth - 8);
      doc.text(splitP, margin + 4, curY + 12);

      curY += 28;
    });

    // Footer Page 1
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Campus-Groovelab • Enterprise Security Whitepaper | Seite 1 von 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ==========================================
    // PAGE 2: TOMs, HOSTING & ZERTIFIZIERUNG
    // ==========================================
    doc.addPage();

    // Header Accent Bar
    doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.rect(0, 0, pageWidth, 6, 'F');

    curY = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('3. Technische & Organisatorische Maßnahmen (TOMs nach DSGVO Art. 32)', margin, curY);

    curY += 8;
    const toms = [
      {
        cat: '1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO & BSI IT-Grundschutz)',
        items: [
          '• Physische Zutrittskontrolle: ISO 27001 zertifiziertes Rechenzentrum (Hetzner Online GmbH, Falkenstein/Nürnberg, Deutschland).',
          '• BFF Token-Isolation: Sessions verschlüsselt in __Host-session JWE HttpOnly-Cookies (AES-256-GCM); 0% Tokens im Browser-Speicher.',
          '• Mandantentrennung: PostgreSQL FORCE Row-Level Security auf allen 97 Tabellen (school_id Isolation auf Kernel-Ebene).'
        ]
      },
      {
        cat: '2. Integrität & Anti-CSRF (Art. 32 Abs. 1 lit. b DSGVO)',
        items: [
          '• Anti-CSRF Origin-Guard: Fail-Closed Prüfung mit browser-nativem Sec-Fetch-Site Filtering & Host-Poisoning-Schutz.',
          '• Revisionssicherheit: Manipulationssicheres WORM Audit-Ledger & SHA-384 Subresource Integrity (SRI).',
          '• Hash-Standards: PBKDF2 Zero-Knowledge Hashing mit 100.000 Runden (SHA-512 / SHA-256) für PINs und Kiosk-Tokens.'
        ]
      },
      {
        cat: '3. Verfügbarkeit & Löschkonzept (Art. 32 & Art. 17 DSGVO / DIN 66398)',
        items: [
          '• Datensicherung: Stündlich automatisierte, verschlüsselte Datenbank-Backups (RTO < 15 Min, RPO < 1 Std.).',
          '• DIN 66398 Löschkonzept (5 Klassen): 60-Tage Sparmodus-Wechsel auf Basis-Bereitstellung (0,09 €); physische Profillöschung erst 30 Tage nach Exmatrikulation; Meisterwerke kumulativ über Ausbildungsdauer.',
          '• Offline-Resilienz: IndexedDB Audio-Tresor (groovelab_audio_vault) für unterbrechungsfreie Musikproben.'
        ]
      }
    ];

    toms.forEach(t => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(t.cat, margin, curY);
      curY += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      t.items.forEach(item => {
        const splitItem = doc.splitTextToSize(item, contentWidth);
        doc.text(splitItem, margin + 2, curY);
        curY += (splitItem.length * 4) + 1;
      });
      curY += 4;
    });

    // Hosting & Municipal Legal Confirmation Box
    curY += 4;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, 36, 3, 3, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, curY, contentWidth, 36, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('4. Kommunale Träger-Compliance (VVT Art. 30, DSFA Art. 35 & BYOD)', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const hostText = 'Vollständige Konformität für Städte, Gemeinden und Schulämter: Subsidiaritäts-Doktrin (Fast-Track-Werkzeug, offizielle Dienstwege bleiben beim Träger), VVT-Muster nach Art. 30 DSGVO, formelle DSFA-Schwellwertprüfung nach Art. 35 DSGVO (kein hohes Risiko), BYOD-Schutz für Lehrkräfte sowie 100% deutsches ISO 27001 Cloud-Hosting (Hetzner Falkenstein/Nürnberg).';
    const splitHost = doc.splitTextToSize(hostText, contentWidth - 12);
    doc.text(splitHost, margin + 6, curY + 15);

    // Official Seal / Signature Area
    curY += 44;
    doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.setLineWidth(1);
    doc.line(margin, curY, margin + 60, curY);
    doc.line(pageWidth - margin - 60, curY, pageWidth - margin, curY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Technisches Sicherheits-Board', margin, curY + 5);
    doc.text('Campus-Groovelab IT-Security', pageWidth - margin - 60, curY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('BSI A+ / ISO 27001 Konformitätsprüfung', margin, curY + 9);
    doc.text('https://campus-groovelab.de', pageWidth - margin - 60, curY + 9);

    // Footer Page 2
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Campus-Groovelab • Enterprise Security Whitepaper | Seite 2 von 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save and Trigger Download
    doc.save('Campus-Groovelab-Enterprise-Security-Whitepaper.pdf');
  } catch (error) {
    console.error('[Whitepaper PDF] Failed to generate Security Whitepaper PDF:', error);
    alert('Fehler beim Erstellen des Sicherheits-Whitepapers: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
  }
}
