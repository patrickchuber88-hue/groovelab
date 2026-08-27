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
