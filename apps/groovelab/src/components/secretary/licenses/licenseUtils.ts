// Pure utility functions for Secretary Licenses & Infrastructure Billing

export const getSchoolYearEndInfo = (simDate?: string | Date | null, existingEndIso?: string | null) => {
  if (existingEndIso) {
    const d = new Date(existingEndIso);
    const day = d.getDate();
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthName = monthNames[d.getMonth()] || 'August';
    const year = d.getFullYear();
    return {
      endDate: d,
      endDateIso: existingEndIso,
      formattedDate: `${day}. ${monthName} ${year}`,
      schoolYearLabel: `${year - 1}/${year}`
    };
  }
  const now = simDate 
    ? (typeof simDate === 'string' && !simDate.includes('T') ? new Date(simDate + 'T14:00:00') : new Date(simDate)) 
    : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  // Standard Schuljahr: 01.09. bis 31.08.
  // Frist 1 Monat zum 31.08. (d.h. 31.07.)
  // Bei Kündigung ab August (Monat 8) oder später gilt Kündigung zum 31.08. des Folgejahres
  const targetEndYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
  const schoolYearStartYear = targetEndYear - 1;
  const endDate = new Date(Date.UTC(targetEndYear, 7, 31, 21, 59, 59, 999));
  return {
    endDate,
    endDateIso: endDate.toISOString(),
    formattedDate: `31. August ${targetEndYear}`,
    schoolYearLabel: `${schoolYearStartYear}/${targetEndYear}`
  };
};

export const downloadCancellationReceiptPdf = async (cancellationInfo: {
  cancellationId?: string;
  cancelledAt?: string | Date;
  effectiveEndDateFormatted: string;
  schoolName?: string;
  schoolNumericId?: number | string;
}) => {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const sName = cancellationInfo.schoolName || 'Musikschule';
    const sNum = cancellationInfo.schoolNumericId || '101';
    const cId = cancellationInfo.cancellationId || `KD-${sNum}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;

    // Header Brand
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Campus-Groovelab', 16, 16);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Rechtssichere Kündigungsbestätigung gem. § 312k Abs. 4 BGB', 16, 23);
    doc.text(`Aktenzeichen: ${cId}`, 16, 29);

    // Status Badge
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(135, 10, 60, 14, 3, 3, 'F');
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('KÜNDIGUNG BESTÄTIGT', 138, 19);

    // Main Card Box
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(16, 44, 178, 100, 4, 4, 'S');

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Kündigung des Cloud-Infrastruktur-Abonnements', 22, 54);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Vertragspartner: ${sName}`, 22, 63);
    doc.text(`Kundennummer / Schul-ID: #${sNum}`, 22, 70);

    const cAt = cancellationInfo.cancelledAt ? new Date(cancellationInfo.cancelledAt) : new Date();
    const cAtStr = cAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Eingangszeitpunkt der Kündigung: ${cAtStr} Uhr`, 22, 77);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Wirksamkeitsdatum der Beendigung: ${cancellationInfo.effectiveEndDateFormatted}, 23:59:59 Uhr`, 22, 88);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Status bis Vertragsende: Vollzugriff aktiv (keine Leistungseinschränkungen)', 22, 96);
    doc.text('Abrechnung: Es erfolgen nach dem Wirksamkeitsdatum keine weiteren Abbuchungen.', 22, 103);
    doc.text('Aufbewahrungsfristen: Rechnungsbelege bleiben 10 Jahre gem. § 147 AO abrufbar.', 22, 110);
    doc.text('Reaktivierung: Der Vertrag kann vor dem Wirksamkeitsdatum jederzeit reaktiviert werden.', 22, 117);

    // Legal compliance footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Dieses Dokument wurde elektronisch erstellt und ist gem. § 312k Abs. 4 BGB i.V.m. § 126b BGB rechtsverbindlich.', 16, 156);
    doc.text('Campus-Groovelab Cloud Services • Hosting & School Management Infrastructure', 16, 161);

    doc.save(`Kuendigungsbestaetigung_Campus_Groovelab_${sName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } catch (e) {
    console.error("Error generating cancellation PDF:", e);
    alert("Kündigungsbeleg konnte nicht als PDF erstellt werden.");
  }
};

export const downloadUpgradeConfirmationPdf = async (upgradeInfo: {
  upgradeId: string;
  targetModule: 'campus' | 'groovelab';
  schoolName?: string;
  schoolNumericId?: number | string;
  effectiveEndDateFormatted: string;
}) => {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const sName = upgradeInfo.schoolName || 'Musikschule';
    const sNum = upgradeInfo.schoolNumericId || '101';
    const modName = upgradeInfo.targetModule === 'campus' ? 'Campus Modul' : 'GrooveLab Modul';

    // Header Brand
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Campus-Groovelab', 16, 16);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Vertragsänderungsbestätigung gem. § 311 Abs. 1 i.V.m. § 312i BGB', 16, 23);
    doc.text(`Aktenzeichen: ${upgradeInfo.upgradeId}`, 16, 29);

    // Status Badge
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(130, 10, 65, 14, 3, 3, 'F');
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('UPGRADE BESTÄTIGT', 133, 19);

    // Main Card Box
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(16, 44, 178, 105, 4, 4, 'S');

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Modul-Upgrade: Hinzubuchung von ${modName} (Kombi-Vorteil)`, 22, 54);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Vertragspartner: ${sName}`, 22, 63);
    doc.text(`Kundennummer / Schul-ID: #${sNum}`, 22, 70);

    const nowStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Abschlusszeitpunkt: ${nowStr} Uhr`, 22, 77);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Neuer Infrastruktur-Hosting-Tarif: 19,90 € / Mo. (Kombi-Paket Campus + GrooveLab)', 22, 88);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Kombi-Vorteilsrabatt: -4,90 € / Mo. dauerhaft auf das Infrastruktur-Bündel.', 22, 96);
    doc.text(`Laufzeit-Synchronisation: Co-Terminus bis Schuljahresende (${upgradeInfo.effectiveEndDateFormatted}).`, 22, 103);
    doc.text('Datenschutz (Art. 28 DSGVO): AVV automatisch um neue Modul-Verarbeitungskategorien erweitert.', 22, 110);
    doc.text('Sofortige Freischaltung: Alle Funktionen ab sofort für Lehrkräfte & Schüler aktiv.', 22, 117);

    // Legal compliance footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Dieses Dokument wurde elektronisch erstellt und ist gem. § 311 Abs. 1 BGB i.V.m. § 126b BGB rechtsverbindlich.', 16, 160);
    doc.text('Campus-Groovelab Cloud Services • Hosting & School Management Infrastructure', 16, 165);

    doc.save(`Vertragsaenderung_Kombi_Paket_${sName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } catch (e) {
    console.error("Error generating upgrade PDF:", e);
  }
};

export const getDynamicAnnualPrice = (
  startDateStr: string | null | undefined,
  discountPercentOrCoFinancing: number | boolean = 0,
  priceStudent: number = 0.49,
  billingMonthsPerYear: number = 11
): number => {
  const contractDateObj = startDateStr ? new Date(startDateStr) : new Date('2026-06-12T19:30:38+02:00');
  const month = contractDateObj.getMonth() + 1; // 1-indexed

  const monthsMap: Record<number, number> = {
    9: 12,  // September
    10: 11, // October
    11: 10, // November
    12: 9,  // December
    1: 8,   // January
    2: 7,   // February
    3: 6,   // March
    4: 5,   // April
    5: 4,   // May
    6: 3,   // June
    7: 2,   // July
    8: 1    // August
  };

  const monthsRemaining = monthsMap[month] !== undefined ? monthsMap[month] : 12;
  const basePrice = priceStudent * (billingMonthsPerYear || 11);
  const fullPrice = (monthsRemaining / 12) * basePrice;
  
  let discountPercent = 0;
  if (typeof discountPercentOrCoFinancing === 'boolean') {
    discountPercent = discountPercentOrCoFinancing ? 10 : 0;
  } else {
    discountPercent = discountPercentOrCoFinancing;
  }

  const finalPrice = fullPrice * (1 - discountPercent / 100);
  return Math.round(finalPrice * 100) / 100;
};
