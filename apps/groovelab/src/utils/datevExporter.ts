/**
 * DATEV-Format V700 Buchungsstapel Generator (GoBD-konform)
 * Standardisierte Schnittstelle für Steuerberater und Finanzbuchhaltung
 * Unterstützt SKR03 und SKR04
 * Compliance: GoBD, § 14/14a/19 UStG, DATEV-Format V700
 */

export type ChartOfAccounts = 'SKR03' | 'SKR04';

export interface DatevBookingRecord {
  amount: number;                     // Netto- oder Bruttobetrag je nach Steuermodus
  isCredit: boolean;                  // true = Haben (Erlös), false = Soll (Storno/Forderung)
  accountNumber: string;              // Erlöskonto oder Sachkonto
  contraAccountNumber: string;        // Debitorenkonto oder Bankkonto
  bookingDate: Date;                  // Belegdatum
  documentNumber: string;             // Rechnungsnummer (z. B. RE-104-2607-01)
  bookingText: string;                // Buchungstext (max 60 Zeichen)
  taxRate?: number;                   // 19 oder 0 (§ 19 UStG)
  isFixed?: boolean;                  // Festschreibung (GoBD: 1)
  dueDate?: Date;                     // Fälligkeit
}

export interface DatevExportOptions {
  chartOfAccounts: ChartOfAccounts;
  taxMode: 'standard_vat' | 'small_business';
  companyName: string;
  consultantNumber?: string;          // Beraternummer (DATEV Standard: 1001)
  clientNumber?: string;              // Mandantennummer (DATEV Standard: 1)
  fiscalYearStart?: Date;
  periodStart: Date;
  periodEnd: Date;
}

// Standardkonten nach SKR03 und SKR04
export const DATEV_ACCOUNT_MAPPINGS: Record<ChartOfAccounts, {
  revenue19: string;                  // Erlöse 19% USt
  revenueExempt: string;              // Erlöse § 19 UStG / Steuerfrei
  reverseCharge: string;              // Erlöse § 13b UStG
  debtorsCollective: string;          // Sammelkonto Debitoren
  bankAccount: string;                // Bank / Geschäftskonto
  prapDeferredRevenue: string;        // Passive Rechnungsabgrenzung
}> = {
  SKR03: {
    revenue19: '8400',
    revenueExempt: '8195',
    reverseCharge: '8337',
    debtorsCollective: '1400',
    bankAccount: '1200',
    prapDeferredRevenue: '0980'
  },
  SKR04: {
    revenue19: '4400',
    revenueExempt: '4185',
    reverseCharge: '4337',
    debtorsCollective: '1200',
    bankAccount: '1800',
    prapDeferredRevenue: '3900'
  }
};

/**
 * Erstellt die standardisierten DATEV V700 Buchungsstapel-Kopfzeilen (EXTF)
 */
export function generateDatevHeaderLines(options: DatevExportOptions): string[] {
  const now = new Date();
  const formatTimestamp = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}000`;
  };

  const formatDateYmd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

  const consultantNo = options.consultantNumber || '1001';
  const clientNo = options.clientNumber || '10001';
  const fiscalStart = formatDateYmd(options.fiscalYearStart || new Date(options.periodStart.getFullYear(), 0, 1));
  const dateFrom = formatDateYmd(options.periodStart);
  const dateTo = formatDateYmd(options.periodEnd);
  const skrCode = options.chartOfAccounts === 'SKR03' ? '03' : '04';

  // DATEV EXTF Zeile 1: Metadaten
  const line1 = `"EXTF";700;21;"Buchungsstapel";1;${formatTimestamp(now)};"";"CG";"Campus-Groovelab";"";${consultantNo};${clientNo};${fiscalStart};4;${dateFrom};${dateTo};"Campus-Groovelab SaaS Erloese";"";1;1;0;"EUR";"";"";"";"";"";"";"${skrCode}";""`;

  // DATEV Spaltenbezeichner (Zeile 2)
  const line2 = [
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext',
    'Postensperre',
    'Diverse Adressnummer',
    'Geschäftspartnerbank',
    'Sachverhalt',
    'Zinssperre',
    'Beleglink',
    'Festschreibung'
  ].map(col => `"${col}"`).join(';');

  return [line1, line2];
}

/**
 * Wandelt ein Buchungssatz-Objekt in eine DATEV-Zeile um
 */
export function formatBookingRecordToDatevRow(
  record: DatevBookingRecord,
  _options: DatevExportOptions
): string {
  const amountStr = Math.abs(record.amount).toFixed(2).replace('.', ',');
  const shFlag = record.isCredit ? 'H' : 'S';
  
  // Format Belegdatum TTMM (4-stellig)
  const dd = String(record.bookingDate.getDate()).padStart(2, '0');
  const mm = String(record.bookingDate.getMonth() + 1).padStart(2, '0');
  const docDateStr = `${dd}${mm}`;

  // Bereinigung Belegfeld 1 (max. 36 Zeichen, keine Sonderzeichen)
  const docNumberClean = (record.documentNumber || '').substring(0, 36).replace(/["\r\n]/g, '');

  // Bereinigung Buchungstext (max. 60 Zeichen)
  const bookingTextClean = (record.bookingText || 'Campus-Groovelab Cloud-Hosting')
    .substring(0, 60)
    .replace(/["\r\n]/g, '');

  // GoBD Festschreibungskennzeichen (1 = Festgeschrieben, 0 = Vorläufig)
  const isFixedStr = record.isFixed !== false ? '1' : '0';

  const cells = [
    `"${amountStr}"`,
    `"${shFlag}"`,
    `"EUR"`,
    `""`,
    `""`,
    `""`,
    `"${record.accountNumber}"`,
    `"${record.contraAccountNumber}"`,
    `""`,                           // BU-Schlüssel (automatische Zuordnung)
    `"${docDateStr}"`,
    `"${docNumberClean}"`,
    `""`,                           // Belegfeld 2
    `""`,                           // Skonto
    `"${bookingTextClean}"`,
    `""`,
    `""`,
    `""`,
    `""`,
    `""`,
    `""`,
    `"${isFixedStr}"`
  ];

  return cells.join(';');
}

/**
 * Erzeugt die vollständige DATEV-Export-CSV als Blob
 */
export function generateDatevExportBlob(
  records: DatevBookingRecord[],
  options: DatevExportOptions
): Blob {
  const headerLines = generateDatevHeaderLines(options);
  const rowLines = records.map(r => formatBookingRecordToDatevRow(r, options));
  const fullContent = [...headerLines, ...rowLines].join('\r\n');

  // DATEV erwartet Windows-1252 oder UTF-8 mit BOM
  return new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), fullContent], {
    type: 'text/csv;charset=utf-8;'
  });
}

/**
 * 1-Klick Download für DATEV Buchungsstapel
 */
export function downloadDatevExportFile(
  records: DatevBookingRecord[],
  options: DatevExportOptions
): void {
  if (typeof document === 'undefined') return;

  const yyyy = options.periodStart.getFullYear();
  const mm = String(options.periodStart.getMonth() + 1).padStart(2, '0');
  const filename = `EXTF_DATEV_${options.chartOfAccounts}_${yyyy}${mm}_CampusGroovelab.csv`;

  const blob = generateDatevExportBlob(records, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
