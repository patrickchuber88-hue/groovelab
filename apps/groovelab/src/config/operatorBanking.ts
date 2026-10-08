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
  readonly bankName: string;
  readonly iban: string;
  readonly bic: string;
  readonly ustIdNr: string;
  readonly street: string;
  readonly zipCode: string;
  readonly city: string;
  readonly country: string;
  readonly email: string;
  readonly phone: string;
  readonly phoneHours: string;
  readonly isVatStandardTaxed: boolean;
}

export const OPERATOR_BANKING_CONFIG: OperatorBankingConfig = {
  companyName: 'Campus-Groovelab Plattformbetrieb',
  legalOwner: 'Patrick Huber (Einzelunternehmer)',
  bankName: 'Commerzbank AG',
  iban: 'DE89370400440532948211',
  bic: 'COBADEFFXXX', // Autoritativer SWIFT/BIC für BLZ 37040044 (Commerzbank AG)
  ustIdNr: 'DE364892110',
  street: 'Karl-Fürstenberg-Str. 59',
  zipCode: '79618',
  city: 'Rheinfelden (Baden)',
  country: 'Deutschland',
  email: 'kontakt@campus-groovelab.de',
  phone: '+49 (0) 7623 / 741 78 40',
  phoneHours: 'Mo 09:00–11:00 Uhr • Do 09:00–11:00 Uhr MEZ',
  isVatStandardTaxed: false // Inhaber ist in der Anfangsphase Kleinunternehmer gem. § 19 UStG
} as const;

/**
 * Formatierte IBAN in 4er-Blöcken für Lesbarkeit auf Dokumenten
 */
export function formatOperatorIban(): string {
  return OPERATOR_BANKING_CONFIG.iban.replace(/(.{4})/g, '$1 ').trim();
}
