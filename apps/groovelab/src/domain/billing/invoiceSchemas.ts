/**
 * Campus-Groovelab GoBD Billing & Invoice Zod Schema Contracts
 * Bounded Context: ADM-04 (GoBD Compliance, Cent-Precision & SEPA ISO 20022 Validation)
 * 
 * Enforces integer cents (no floating-point rounding errors), ISO-7064 Modulo-97
 * IBAN checks, SWIFT-BIC formats, and strict payload stripping (.strict()).
 */

import { z } from 'zod';

/**
 * Validates an International Bank Account Number (IBAN) using the ISO-7064 Modulo-97 algorithm.
 */
export function isValidIban(rawIban: string): boolean {
  const clean = rawIban.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(clean)) {
    return false;
  }

  // Move the first 4 characters to the end
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Convert letters to two-digit numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else {
      numericString += rearranged[i];
    }
  }

  // Modulo 97 calculation on large number string
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const block = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(block, 10) % 97;
  }

  return remainder === 1;
}

/**
 * Validates a SWIFT/BIC code (8 or 11 characters alphanumeric).
 */
export function isValidBic(rawBic: string): boolean {
  const clean = rawBic.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean);
}

// ------------------------------------------------------------------------------
// Zod Custom Validators
// ------------------------------------------------------------------------------

export const IbanSchema = z.string()
  .trim()
  .min(15, 'IBAN ist zu kurz')
  .max(34, 'IBAN ist zu lang')
  .refine(isValidIban, {
    message: 'Ungültige IBAN (Prüfziffer nach ISO 7064 fehlerhaft).'
  });

export const BicSchema = z.string()
  .trim()
  .min(8, 'BIC muss mindestens 8 Zeichen lang sein')
  .max(11, 'BIC darf maximal 11 Zeichen lang sein')
  .refine(isValidBic, {
    message: 'Ungültiges BIC-Format (SWIFT ISO 9362).'
  });

// ------------------------------------------------------------------------------
// GoBD Invoice Item Schema
// ------------------------------------------------------------------------------

export const InvoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Beschreibung ist erforderlich').max(500),
  quantity: z.number().int().positive('Menge muss mindestens 1 sein').default(1),
  unitPriceCents: z.number().int().nonnegative('Einzelpreis darf nicht negativ sein'),
  totalCents: z.number().int().nonnegative('Gesamtbetrag darf nicht negativ sein'),
  vatRatePercent: z.number().min(0).max(100).default(0.00),
  category: z.enum(['CAMPUS_HOSTING', 'GROOVELAB_HOSTING', 'STUDENT_ACTIVATION', 'SERVICE_FEE', 'OTHER']).default('OTHER')
}).strict();

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

// ------------------------------------------------------------------------------
// Create Invoice Input Contract
// ------------------------------------------------------------------------------

export const CreateInvoiceInputSchema = z.object({
  schoolId: z.string().uuid('Ungültige Schul-ID (UUIDv4 erforderlich)'),
  type: z.enum(['INF', 'AKT', 'KOMBI', 'SERVICE', 'STORNO']),
  amountCents: z.number().int().positive('Rechnungsbetrag in Cent muss positiv sein'),
  billingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD erforderlich'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD erforderlich'),
  items: z.array(InvoiceItemSchema).min(1, 'Mindestens eine Rechnungsposition erforderlich'),
  vatExemptNotice: z.string().trim().max(255).default('Steuerbefreit gem. § 4 Nr. 21 UStG (Musikschulunterricht)')
}).strict().refine(data => {
  // Validate that sum of items equals amountCents
  const sum = data.items.reduce((acc, item) => acc + item.totalCents, 0);
  return sum === data.amountCents;
}, {
  message: 'Die Summe der Einzelpositionen stimmt nicht mit dem Rechnungsbetrag überein.',
  path: ['amountCents']
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

// ------------------------------------------------------------------------------
// Cancel Invoice / Credit Note Input Contract
// ------------------------------------------------------------------------------

export const CancelInvoiceInputSchema = z.object({
  invoiceId: z.string().trim().min(1, 'Rechnungs-ID ist erforderlich'),
  reason: z.string().trim().min(5, 'Stornobegründung muss mindestens 5 Zeichen umfassen').max(500)
}).strict();

export type CancelInvoiceInput = z.infer<typeof CancelInvoiceInputSchema>;
