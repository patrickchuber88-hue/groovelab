/**
 * Campus-Groovelab Shared Pricing Engine
 * Autoritatives Regelwerk gemäß BILLING_CANONICAL_LOGIC.md
 */

export type CurrencyCode = 'EUR' | 'CHF';

export interface CurrencyPricingRates {
  currency: CurrencyCode;
  symbol: string;
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
  pricePassiveStudent: number;
  priceStorageAddon: number;
  kombiSavings: number;
}

export const MASTER_CURRENCY_RATES: Record<CurrencyCode, CurrencyPricingRates> = {
  EUR: {
    currency: 'EUR',
    symbol: '€',
    priceCampus: 14.90,
    priceGroovelab: 9.90,
    priceKombi: 19.90,
    priceTeacher: 0.49,
    priceStudent: 0.49,
    pricePassiveStudent: 0.09,
    priceStorageAddon: 2.90,
    kombiSavings: 4.90,
  },
  CHF: {
    currency: 'CHF',
    symbol: 'CHF',
    priceCampus: 19.90,
    priceGroovelab: 14.90,
    priceKombi: 29.90,
    priceTeacher: 1.00,
    priceStudent: 1.00,
    pricePassiveStudent: 0.20,
    priceStorageAddon: 3.80,
    kombiSavings: 4.90,
  },
};

export interface StorageTier {
  gb: number;
  price: number;
  label: string;
  sublabel: string;
  desc?: string;
  recommendedFor?: string;
  popular?: boolean;
}

export const DEFAULT_STORAGE_TIERS_EUR: StorageTier[] = [
  { gb: 0, price: 0, label: '10 GB Basis', sublabel: 'Inklusive (Hard Cap)', desc: '0,00 € / Mo.', recommendedFor: 'Zentraler Audio- & Noten-Tresor dauerhaft inklusive', popular: false },
  { gb: 10, price: 2.90, label: '+10 GB', sublabel: 'Gesamt 20 GB (Verdoppler)', desc: '2,90 € / Mo.', recommendedFor: 'Schneller Einstieg auf 20 GB Gesamtkapazität', popular: true },
  { gb: 25, price: 4.90, label: '+25 GB', sublabel: 'Gesamt 35 GB (Bis 250 Sch.)', desc: '4,90 € / Mo.', recommendedFor: 'Zusatz-Speicher für Ensembles & Klassen (bis 250 Schüler)', popular: false },
  { gb: 50, price: 8.90, label: '+50 GB', sublabel: 'Gesamt 60 GB (Beliebt)', desc: '8,90 € / Mo.', recommendedFor: 'Beliebteste Stufe für mittelgroße Schulen (bis 500 Schüler)', popular: false },
  { gb: 100, price: 14.90, label: '+100 GB', sublabel: 'Gesamt 110 GB', desc: '14,90 € / Mo.', recommendedFor: 'Großschulen (500 – 1.000 Schüler)', popular: false },
  { gb: 250, price: 19.90, label: '+250 GB', sublabel: 'Gesamt 260 GB (Archiv)', desc: '19,90 € / Mo.', recommendedFor: 'Konservatorien & Landesmusikschulen (bis 2.500+ Schüler)', popular: false },
];

export const DEFAULT_STORAGE_TIERS_CHF: StorageTier[] = [
  { gb: 0, price: 0, label: '10 GB Basis', sublabel: 'Inklusive (Hard Cap)', desc: 'CHF 0.00 / Mo.', recommendedFor: 'Zentraler Audio- & Noten-Tresor dauerhaft inklusive', popular: false },
  { gb: 10, price: 3.80, label: '+10 GB', sublabel: 'Gesamt 20 GB (Verdoppler)', desc: 'CHF 3.80 / Mo.', recommendedFor: 'Schneller Einstieg auf 20 GB Gesamtkapazität', popular: true },
  { gb: 25, price: 6.40, label: '+25 GB', sublabel: 'Gesamt 35 GB (Bis 250 Sch.)', desc: 'CHF 6.40 / Mo.', recommendedFor: 'Zusatz-Speicher für Ensembles & Klassen (bis 250 Schüler)', popular: false },
  { gb: 50, price: 11.60, label: '+50 GB', sublabel: 'Gesamt 60 GB (Beliebt)', desc: 'CHF 11.60 / Mo.', recommendedFor: 'Beliebteste Stufe für mittelgroße Schulen (bis 500 Schüler)', popular: false },
  { gb: 100, price: 19.40, label: '+100 GB', sublabel: 'Gesamt 110 GB', desc: 'CHF 19.40 / Mo.', recommendedFor: 'Großschulen (500 – 1.000 Schüler)', popular: false },
  { gb: 250, price: 25.90, label: '+250 GB', sublabel: 'Gesamt 260 GB (Archiv)', desc: 'CHF 25.90 / Mo.', recommendedFor: 'Konservatorien & Landesmusikschulen (bis 2.500+ Schüler)', popular: false },
];

export const DEFAULT_STORAGE_TIERS = DEFAULT_STORAGE_TIERS_EUR;

export function formatCurrency(amount: number, currency: CurrencyCode = 'EUR'): string {
  if (currency === 'CHF') {
    return `CHF ${amount.toFixed(2)}`;
  }
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

export function roundToFiveRappen(amount: number): number {
  return Math.round(amount * 20) / 20;
}

export const getStorageTierByGb = (gb: number, customTiers?: StorageTier[], currency: CurrencyCode = 'EUR'): StorageTier => {
  const tiers = customTiers && customTiers.length > 0
    ? customTiers
    : (currency === 'CHF' ? DEFAULT_STORAGE_TIERS_CHF : DEFAULT_STORAGE_TIERS_EUR);
  const match = tiers.find(t => t.gb === gb);
  if (match) {
    return {
      ...match,
      desc: `${formatCurrency(match.price, currency)} / Mo.`
    };
  }
  const fallbackPrice = gb === 0 ? 0 : Number((gb * (currency === 'CHF' ? 0.35 : 0.25)).toFixed(2));
  return {
    gb,
    price: fallbackPrice,
    label: `+${gb} GB`,
    sublabel: 'Individuell',
    desc: `${formatCurrency(fallbackPrice, currency)} / Mo.`
  };
};
