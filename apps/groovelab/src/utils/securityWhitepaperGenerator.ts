/**
 * Campus-Groovelab Enterprise Security & Compliance Whitepaper Generator
 * 
 * Generates an official, print-ready BSI A+ / ISO 27001 / DSGVO Art. 32 
 * Compliance PDF for music school boards, municipal IT departments, and DPOs.
 */

export async function generateEnterpriseSecurityWhitepaperPDF(): Promise<void> {
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
    doc.text(`Dokument-Version: 2026.8-LTS | Datum: ${new Date().toLocaleDateString('de-DE')} | Gültig für alle Schulträger`, margin, 35);

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
    const summaryText = 'Campus-Groovelab erfüllt die höchsten europäischen Standards für Kinderschutz und Datensicherheit (BSI IT-Grundschutz, ISO/IEC 27001, DSGVO Art. 25/32 und COPPA). Durch die konsequente Zero-Knowledge- und Zero-Mail-Architektur werden auf der Plattform keine Schüler-E-Mails, Passwörter oder Zahlungsdaten gespeichert.';
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
        title: 'A. Zero-Mail IAM & Phishing-Immunität',
        desc: 'Vollständiger Verzicht auf E-Mail-Server. Logins erfolgen über biometrische FIDO2/WebAuthn Passkeys, unvorhersehbare QR-Tokens (2^122 Entropie) und Argon2id-Hashes. Schüler- und Lehrerkonten können nicht durch E-Mail-Phishing kompromittiert werden.'
      },
      {
        title: 'B. PGP-Kernel-Verschlüsselung (Zero-Knowledge)',
        desc: 'Schülervornamen sind hardwarenah im PostgreSQL-Datenbank-Kernel mittels PGP verschlüsselt. Die Entschlüsselungsfunktion get_encryption_key() ist hermetisch gegen Client-Zugriffe gesperrt (REVOKE ALL FROM PUBLIC, anon, authenticated).'
      },
      {
        title: 'C. 100% PostgreSQL FORCE Row-Level Security (RLS)',
        desc: 'Alle 97 Datenbanktabellen erzwingen zwingende Mandantenisolation auf Kernel-Ebene (school_id = get_current_user_school_id()). Unautorisierte Anfragen liefern serverseitig 0 Zeilen (HTTP 401).'
      },
      {
        title: 'D. Subresource Integrity (SRI SHA-384) & NIST SBOM',
        desc: 'Alle JavaScript- und CSS-Bundles sind in dist/index.html mit kryptografischen SHA-384 Hashes versiegelt. Vollständige Software Bill of Materials (SBOM nach NIST SP 800-161) auditiert alle Open-Source-Abhängigkeiten.'
      },
      {
        title: 'E. FinTech Client-Shield & Anti-Tampering',
        desc: 'Produktions-Builds sind gegen DevTools-Inspektion geschützt (Stummschaltung aller Konsolenausgaben, F12-Blockade auf Kiosken, automatischer PrivacyBlur-Schutz bei Tab-Wechsel und vollständige RAM-Zeroization beim Logout).'
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
        cat: '1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)',
        items: [
          '• Physische Zutrittskontrolle: ISO 27001 zertifiziertes Rechenzentrum (Hetzner Online GmbH, Falkenstein/Nürnberg, Deutschland).',
          '• Transportverschlüsselung: TLS 1.3 mit HSTS Preload (2 Jahre), Perfect Forward Secrecy (PFS) und HTTP/3 QUIC.',
          '• Zugriffskontrolle: Strikte rollenbasierte Autorisierung (RBAC) für Schulleitung, Sekretariat, Lehrkräfte und Schüler.'
        ]
      },
      {
        cat: '2. Integrität (Art. 32 Abs. 1 lit. b DSGVO)',
        items: [
          '• Hash-Validierung: Subresource Integrity (SRI) SHA-384 verhindert Supply-Chain-Angriffe.',
          '• Revisionssicherheit: Immutable Activation Event Ledger (WORM-Prinzip) für alle Schüleraktivierungen.',
          '• Input-Sanitization: Vollständige Parametrisierung aller SQL-Queries, Schutz vor XSS und Injection.'
        ]
      },
      {
        cat: '3. Verfügbarkeit & Belastbarkeit (Art. 32 Abs. 1 lit. b DSGVO)',
        items: [
          '• Datensicherungskonzept: Tägliche GFS-Backups mit SHA-256 Prüfsummen und automatisierter Integritätsprüfung.',
          '• Wiederherstellungszeit (RTO): < 15 Minuten im Katastrophenfall (Desaster Recovery).',
          '• Ausfallsicherheit: Nginx Circuit-Breaker mit lokalem Offline-Cache-Failover (4.5s).'
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

    // Hosting & Legal Confirmation Box
    curY += 4;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, curY, contentWidth, 36, 3, 3, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, curY, contentWidth, 36, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('4. Server-Standort & Auftragsverarbeitungsvertrag (AVV)', margin + 6, curY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const hostText = 'Alle Server, Datenbanken und Backups werden ausschließlich in Deutschland betrieben (Hetzner Rechenzentrum Falkenstein/Vogtland). Mit jeder Musikschule wird ein digitaler Auftragsverarbeitungsvertrag (AVV nach DSGVO Art. 28) mit standardisierten EU-Schutzklauseln geschlossen.';
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
