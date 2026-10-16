/**
 * 🏛️ Campus-Groovelab Plattformbetrieb: Autoritativer Banking- & Steuer-SSOT
 * 
 * Zentrale, typisierte Konfiguration aller Betreiber-Bankdaten und steuerrechtlichen
 * Identifikatoren. Dient als Single Source of Truth (SSOT) für alle Kunden-Modale,
 * Rechnungs- und Beleg-Generatoren sowie SEPA-Clearing-Prozesse.
 * 
 * Revisionssicherheit & Compliance:
 * - § 14 Abs. 4 Satz 1 Nr. 2 UStG (Rechtsgültige USt-IdNr., keine Phantasie-Steuernummern)
 * - Deutsche Bundesbank / SEPA Clearing (Verifizierte Commerzbank-BIC COBADEFFXXX)
 */

export interface OperatorBankingConfig {
  readonly companyName: string;
  readonly legalOwner: string;
  readonly ownerName: string;
  readonly bankName: string;
  readonly iban: string;
  readonly ibanFormatted: string;
  readonly bic: string;
  readonly ustIdNr: string;
  readonly taxNumber?: string;
  readonly street: string;
  readonly zipCode: string;
  readonly city: string;
  readonly country: string;
  readonly email: string;
  readonly phone: string;
  readonly phoneHours: string;
  readonly isVatStandardTaxed: boolean;
}

const envUstId = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OPERATOR_UST_ID) || '';
const envTaxNumber = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OPERATOR_TAX_NUMBER) || '';
const envPhone = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OPERATOR_PHONE) || '';
const envBankName = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OPERATOR_BANK_NAME) || '';
const envIban = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OPERATOR_IBAN) || '';
const envBic = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OPERATOR_BIC) || '';

const rawIban = envIban.trim() || 'IBAN in Einrichtung (wird vor Rechnungsstellung hinterlegt)';
const cleanIban = rawIban.replace(/\s+/g, '').toUpperCase();
const formattedIban = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleanIban) 
  ? cleanIban.replace(/(.{4})/g, '$1 ').trim() 
  : rawIban;

export const OPERATOR_BANKING_CONFIG: OperatorBankingConfig = {
  companyName: 'Campus-Groovelab Plattformbetrieb',
  legalOwner: 'Patrick Huber (Einzelunternehmer)',
  ownerName: 'Patrick Huber (Einzelunternehmer)',
  bankName: envBankName.trim() || 'Geschäftskonto in Einrichtung (Bankverbindung folgt auf Rechnung)',
  iban: rawIban,
  ibanFormatted: formattedIban,
  bic: envBic.trim() || 'BIC in Einrichtung',
  ustIdNr: envUstId.trim(),
  taxNumber: envTaxNumber.trim(),
  street: 'Karl-Fürstenberg-Str. 59',
  zipCode: '79618',
  city: 'Rheinfelden (Baden)',
  country: 'Deutschland',
  email: 'kontakt@campus-groovelab.de',
  phone: envPhone.trim() || 'Telefonischer Rückruf-Service via kontakt@campus-groovelab.de & In-App-Schnellkontakt (Direktrufnummer in Schaltung)',
  phoneHours: 'Mo: 08:00–10:00 Uhr, Do: 08:30–11:00 Uhr, Fr: 08:30–11:00 Uhr (MEZ)',
  isVatStandardTaxed: false // Inhaber ist in der Anfangsphase Kleinunternehmer gem. § 19 UStG
} as const;

/**
 * Formatierte IBAN in 4er-Blöcken für Lesbarkeit auf Dokumenten (schützt neutrale Text-Platzhalter vor Zerstückelung)
 */
export function formatOperatorIban(): string {
  const raw = OPERATOR_BANKING_CONFIG.iban.trim();
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(clean)) {
    return raw;
  }
  return clean.replace(/(.{4})/g, '$1 ').trim();
}
