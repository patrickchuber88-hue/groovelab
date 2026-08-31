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
 * Calculates dynamic remaining school year months and total fee based on the school's configured school year.
 * - Registration month is 100% free (0.00 € / CHF 0.00 trial/introductory period).
 * - Paid period starts on the 1st of the next month and runs until the school's customized school year end.
 */
export interface SchoolYearCalculation {
  freeMonthName: string;
  freePeriodDescription: string;
  paidStartMonthName: string;
  paidStartYear: number;
  paidEndMonthName: string;
  paidEndYear: number;
  remainingPaidMonths: number;
  monthlyRate: number; // 0.49 EUR or 1.00 CHF
  totalAmount: number; // e.g. 5.39 for 11 months, 4.90 for 10 months
  totalAmountStr: string; // "5,39" or "8.80"
  periodDescription: string; // e.g. "01.10.2026 – 31.08.2027" or "01.09.2026 – 31.07.2027"
  isFirstYearDiscount: boolean;
  currency: 'EUR' | 'CHF';
}

export function calculateSchoolYearDirectBilling(
  nowDate?: Date,
  currency: 'EUR' | 'CHF' = 'EUR',
  customMonthlyRate?: number,
  startMonthInput: number = 9,
  startDayInput: number = 1
): SchoolYearCalculation {
  const date = nowDate || new Date();
  const currentDay = date.getDate();
  const currentMonth = date.getMonth() + 1; // 1 = Jan, 9 = Sept, 12 = Dec
  const currentYear = date.getFullYear();

  const startMonth = Math.min(Math.max(Number(startMonthInput) || 9, 1), 12);
  const startDay = Math.min(Math.max(Number(startDayInput) || 1, 1), 31);

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const freeMonthName = monthNames[currentMonth - 1];

  // Calculate actual remaining days in the current calendar month
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysRemainingInMonth = lastDayOfCurrentMonth - currentDay;

  // If at least 14 days remain in the current month, the statutory 14-day right of withdrawal (§ 355 BGB)
  // expires completely within the free trial month.
  // If fewer than 14 days remain (e.g. registration on 28th October or 16th February), the statutory withdrawal
  // period extends into the next month. In this case, the remaining days + entire next month are 100% free!
  const hasFull14Days = daysRemainingInMonth >= 14;

  let paidStartMonth: number;
  let paidStartYear: number;
  let freePeriodDescription: string;

  if (hasFull14Days) {
    paidStartMonth = currentMonth + 1;
    paidStartYear = currentYear;
    if (paidStartMonth > 12) {
      paidStartMonth = 1;
      paidStartYear = currentYear + 1;
    }
    freePeriodDescription = `Kostenfreier Schnuppermonat (${monthNames[currentMonth - 1]})`;
  } else {
    let nextMonth = currentMonth + 1;
    let nextMonthYear = currentYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextMonthYear = currentYear + 1;
    }
    paidStartMonth = nextMonth + 1;
    paidStartYear = nextMonthYear;
    if (paidStartMonth > 12) {
      paidStartMonth = 1;
      paidStartYear = nextMonthYear + 1;
    }
    freePeriodDescription = `Kostenfreie Kennenlernphase (${monthNames[currentMonth - 1]} & ${monthNames[nextMonth - 1]})`;
  }

  const paidStartMonthName = monthNames[paidStartMonth - 1];

  // Next school year start date
  let nextStartYear = currentYear;
  let nextStartDate = new Date(nextStartYear, startMonth - 1, startDay);
  if (nextStartDate.getTime() <= date.getTime()) {
    nextStartYear = currentYear + 1;
    nextStartDate = new Date(nextStartYear, startMonth - 1, startDay);
  }

  // Current school year ends 1 day before the next school year start
  const currentYearEndDate = new Date(nextStartDate.getTime() - 24 * 60 * 60 * 1000);
  const endMonth = currentYearEndDate.getMonth() + 1;
  const endDay = currentYearEndDate.getDate();
  const endYear = currentYearEndDate.getFullYear();
  const paidEndMonthName = monthNames[endMonth - 1];

  // Calculate number of months between (paidStartMonth, paidStartYear) and (endMonth, endYear)
  let remainingPaidMonths = (endYear - paidStartYear) * 12 + (endMonth - paidStartMonth) + 1;

  let finalEndDay = endDay;
  let finalEndMonth = endMonth;
  let finalEndYear = endYear;
  let finalEndMonthName = paidEndMonthName;

  // If registration is in the final month of the current school year,
  // the paid period starts with the new school year and runs for a full 12 months.
  if (remainingPaidMonths <= 0) {
    remainingPaidMonths = 12;
    const followingStartDate = new Date(nextStartYear + 1, startMonth - 1, startDay);
    const followingEndDate = new Date(followingStartDate.getTime() - 24 * 60 * 60 * 1000);
    finalEndDay = followingEndDate.getDate();
    finalEndMonth = followingEndDate.getMonth() + 1;
    finalEndYear = followingEndDate.getFullYear();
    finalEndMonthName = monthNames[finalEndMonth - 1];
  }

  const isChf = currency === 'CHF';
  const defaultRate = isChf ? 1.00 : 0.49;
  const monthlyRate = typeof customMonthlyRate === 'number' ? customMonthlyRate : defaultRate;
  const totalAmount = Math.round(remainingPaidMonths * monthlyRate * 100) / 100;
  const totalAmountStr = isChf ? totalAmount.toFixed(2) : totalAmount.toFixed(2).replace('.', ',');

  const startFormatted = `01.${String(paidStartMonth).padStart(2, '0')}.${paidStartYear}`;
  const endFormatted = `${String(finalEndDay).padStart(2, '0')}.${String(finalEndMonth).padStart(2, '0')}.${finalEndYear}`;
  const periodDescription = `${startFormatted} – ${endFormatted}`;
  const isFirstYearDiscount = remainingPaidMonths <= 11;

  return {
    freeMonthName,
    freePeriodDescription,
    paidStartMonthName,
    paidStartYear,
    paidEndMonthName: finalEndMonthName,
    paidEndYear: finalEndYear,
    remainingPaidMonths,
    monthlyRate,
    totalAmount,
    totalAmountStr,
    periodDescription,
    isFirstYearDiscount,
    currency
  };
}
