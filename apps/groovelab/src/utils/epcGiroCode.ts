/**
 * EPC-QR GiroCode Generator (European Payments Council EPC069-12 Standard)
 * Formats data for standard banking app QR code scanning in SEPA countries.
 */

export interface EpcGiroCodeParams {
  iban: string;
  bic?: string;
  recipientName: string;
  amount: number;
  referenceCode: string; // e.g. CG-F63B8EDE-2607
  unstructuredRemittance?: string;
}

/**
 * Formats raw EPC payload string for QR Code generation.
 * Spec: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation-sepa
 */
export function generateEpcGiroCodePayload(params: EpcGiroCodeParams): string {
  const sanitizedIban = (params.iban || '').replace(/\s+/g, '').toUpperCase();
  const sanitizedBic = (params.bic || '').replace(/\s+/g, '').toUpperCase();
  const sanitizedRecipient = (params.recipientName || 'Campus-Groovelab').slice(0, 70);
  const amountStr = params.amount ? Number(params.amount).toFixed(2) : '5.88';
  const remittance = (params.referenceCode || '').slice(0, 140);

  const lines = [
    'BCD',                      // Service Tag
    '002',                      // Version
    '1',                        // Character Set: 1 = UTF-8
    'SCT',                      // Identification: SEPA Credit Transfer
    sanitizedBic,               // BIC (optional in SEPA area, can be empty string)
    sanitizedRecipient,         // Beneficiary Name
    sanitizedIban,              // Beneficiary IBAN
    `EUR${amountStr}`,          // Amount with currency prefix
    '',                         // Purpose Code (4 chars, optional)
    '',                         // Structured Reference (optional)
    remittance,                 // Unstructured Remittance Information (Verwendungszweck)
    ''                          // Beneficiary to originator information (optional)
  ];

  return lines.join('\n');
}

/**
 * Formats a German IBAN with standard 4-digit spacing for clean UI representation.
 */
export function formatIbanWithSpaces(iban: string): string {
  const cleaned = (iban || '').replace(/\s+/g, '').toUpperCase();
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Generates the canonical GoBD student reference code: CG-[HASH8]-[YYMM]
 */
export function generateStudentGoBdCode(studentId: string, customDate?: Date): string {
  const date = customDate || new Date();
  const yearShort = String(date.getFullYear()).slice(-2);
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');

  // Stable 8-char hex hash from student ID
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    const char = studentId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').slice(-8);

  return `CG-${hexHash}-${yearShort}${monthStr}`;
}

/**
 * Calculates dynamic remaining school year months and total fee (ending August 31st).
 * - Registration month is 100% free (0.00 € trial/introductory period).
 * - Paid period starts on the 1st of the next month and runs until August 31st.
 */
export interface SchoolYearCalculation {
  freeMonthName: string;
  paidStartMonthName: string;
  paidStartYear: number;
  paidEndMonthName: string;
  paidEndYear: number;
  remainingPaidMonths: number;
  monthlyRate: number; // 0.49 EUR or 0.80 CHF
  totalAmount: number; // e.g. 5.39 for 11 months, 4.90 for 10 months
  totalAmountStr: string; // "5,39" or "8.80"
  periodDescription: string; // "01.10.2026 – 31.08.2027"
  currency: 'EUR' | 'CHF';
}

export function calculateSchoolYearDirectBilling(nowDate?: Date, currency: 'EUR' | 'CHF' = 'EUR', customMonthlyRate?: number): SchoolYearCalculation {
  const date = nowDate || new Date();
  const currentMonth = date.getMonth() + 1; // 1 = Jan, 9 = Sept, 12 = Dec
  const currentYear = date.getFullYear();

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const freeMonthName = monthNames[currentMonth - 1];

  let nextMonth = currentMonth + 1;
  let nextMonthYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextMonthYear = currentYear + 1;
  }
  const paidStartMonthName = monthNames[nextMonth - 1];

  let endYear = currentYear;
  if (currentMonth >= 9) {
    endYear = currentYear + 1;
  }

  // Calculate remaining paid months until August 31st
  let remainingPaidMonths = 0;
  if (currentMonth >= 9) {
    // Sept(9) -> Oct-Aug = (12 - 9) + 8 = 11 months
    remainingPaidMonths = (12 - currentMonth) + 8;
  } else if (currentMonth < 8) {
    // Jan(1) -> Feb-Aug = 8 - 1 = 7 months
    remainingPaidMonths = 8 - currentMonth;
  } else if (currentMonth === 8) {
    // August registration (ahead of new school year): 12 months for upcoming school year
    remainingPaidMonths = 12;
    endYear = currentYear + 1;
  }

  if (remainingPaidMonths <= 0) {
    remainingPaidMonths = 12;
  }

  const isChf = currency === 'CHF';
  const defaultRate = isChf ? 1.00 : 0.49;
  const monthlyRate = typeof customMonthlyRate === 'number' ? customMonthlyRate : defaultRate;
  const totalAmount = Math.round(remainingPaidMonths * monthlyRate * 100) / 100;
  const totalAmountStr = isChf ? totalAmount.toFixed(2) : totalAmount.toFixed(2).replace('.', ',');

  const startFormatted = `01.${String(nextMonth).padStart(2, '0')}.${nextMonthYear}`;
  const endFormatted = `31.08.${endYear}`;
  const periodDescription = `${startFormatted} – ${endFormatted}`;

  return {
    freeMonthName,
    paidStartMonthName,
    paidStartYear: nextMonthYear,
    paidEndMonthName: 'August',
    paidEndYear: endYear,
    remainingPaidMonths,
    monthlyRate,
    totalAmount,
    totalAmountStr,
    periodDescription,
    currency
  };
}
