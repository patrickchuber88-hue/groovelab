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
    priceStorageAddon: 1.99,
    kombiSavings: 4.90,
  },
  CHF: {
    currency: 'CHF',
    symbol: 'CHF',
    priceCampus: 19.90,
    priceGroovelab: 14.90,
    priceKombi: 29.90,
    priceTeacher: 0.80,
    priceStudent: 1.00,
    pricePassiveStudent: 0.20,
    priceStorageAddon: 2.90,
    kombiSavings: 4.90,
  },
};

/**
 * Formats monetary amounts with strict localization standards:
 * - EUR: "14,90 €" / "0,49 €" (German comma formatting)
 * - CHF: "CHF 19.90" / "CHF 0.80" (Official Swiss dot & prefix standard)
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'EUR'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (currency === 'CHF') {
    return `CHF ${num.toFixed(2)}`;
  }
  return `${num.toFixed(2).replace('.', ',')} €`;
}

export interface StorageTier {
  gb: number;
  price: number;
  label: string;
  sublabel: string;
  desc?: string;
  recommendedFor?: string;
}

export const DEFAULT_STORAGE_TIERS: StorageTier[] = [
  { gb: 0, price: 0, label: '1 GB Basis', sublabel: 'Bis 15 Schüler', desc: '0,00 € / Mo.', recommendedFor: 'Kleine Lehrkraft-Klassen' },
  { gb: 10, price: 1.99, label: '+10 GB', sublabel: 'Bis 100 Schüler', desc: '1,99 € / Mo.', recommendedFor: 'Kleine Musikschulen' },
  { gb: 25, price: 3.99, label: '+25 GB', sublabel: 'Bis 250 Schüler', desc: '3,99 € / Mo.', recommendedFor: 'Mittelgroße Musikschulen' },
  { gb: 50, price: 6.99, label: '+50 GB', sublabel: 'Bis 500 Schüler', desc: '6,99 € / Mo.', recommendedFor: 'Große Musikschulen' },
  { gb: 100, price: 11.99, label: '+100 GB', sublabel: 'Bis 1.000 Schüler', desc: '11,99 € / Mo.', recommendedFor: 'Sehr große Musikschulen' },
  { gb: 250, price: 24.99, label: '+250 GB', sublabel: '1.000 bis 2.500+ Schüler', desc: '24,99 € / Mo.', recommendedFor: 'Großschulen & Konservatorien' }
];

export const getStorageTierByGb = (gb: number, customTiers?: StorageTier[], currency: CurrencyCode = 'EUR'): StorageTier => {
  const tiers = customTiers && customTiers.length > 0 ? customTiers : DEFAULT_STORAGE_TIERS;
  const match = tiers.find(t => t.gb === gb);
  if (match) {
    if (currency === 'CHF') {
      const chfPrice = match.price === 0 ? 0 : Number((match.price * 1.45).toFixed(2));
      return {
        ...match,
        price: chfPrice,
        desc: `${formatCurrency(chfPrice, 'CHF')} / Mo.`
      };
    }
    return match;
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

export interface MasterPricingRates {
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
  pricePassiveStudent?: number;
  priceStorageAddon?: number;
  storageTiers?: StorageTier[];
  priceChangeScope?: 'new_only' | 'school_year_start' | 'immediate' | string;
  priceChangeAnnouncedAt?: string | null;
  currency?: CurrencyCode;
}

export interface SchoolPricingData {
  id?: string;
  created_at?: string;
  country?: string | null;
  currency?: CurrencyCode | string | null;
  school_year_start_month?: number | string | null;
  school_year_start_day?: number | string | null;
  custom_price_campus?: number | null;
  custom_price_groovelab?: number | null;
  custom_price_kombi?: number | null;
  custom_price_teacher?: number | null;
  custom_price_student?: number | null;
  custom_price_passive_student?: number | null;
  storage_addon_gb?: number | null;
  storage_used_bytes?: number | null;
  storage_addon_monthly_fee?: number | null;
  grandfathered_campus_price?: number | null;
  grandfathered_groovelab_price?: number | null;
  grandfathered_kombi_price?: number | null;
  grandfathered_teacher_price?: number | null;
  grandfathered_student_price?: number | null;
  grandfathered_passive_student_price?: number | null;
  price_grandfathered_at?: string | null;
  subscription_bypass?: boolean;
  subscription_bypass_until?: string | null;
  subscription_bypass_reason?: string | null;
}

export type SchoolPricingProfile = SchoolPricingData;

/**
 * Checks if a school has an active Abo-Bypass.
 * If subscription_bypass_until is set, it checks if the date has not yet expired.
 */
export function isSchoolBypassActive(school: SchoolPricingData | null | undefined): boolean {
  if (!school?.subscription_bypass) return false;
  if (!school.subscription_bypass_until) return true;
  const until = new Date(school.subscription_bypass_until);
  return !isNaN(until.getTime()) && until.getTime() > Date.now();
}

export interface EffectiveRates {
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
  pricePassiveStudent: number;
  priceStorageAddon: number;
  storageAddonGb: number;
  storageUsedBytes: number;
  studentSavings?: number;
  studentSavingsPercent?: number;
  isGrandfatheredRateActive: boolean;
  isCustomRateActive: boolean;
  isWithin60DayNoticeWindow: boolean;
  nextSchoolYearStartDate: Date | null;
  daysUntilSchoolYearStart: number | null;
}

export type EffectiveSchoolRates = EffectiveRates;

/**
 * Calculates the next school year start date for a school based on its configured start month and day.
 */
export function getNextSchoolYearStartDate(
  startMonthInput?: number | string | null,
  startDayInput?: number | string | null,
  currentDate: Date = new Date()
): Date {
  const month = typeof startMonthInput === 'number' ? startMonthInput : parseInt(String(startMonthInput || 9), 10);
  const day = typeof startDayInput === 'number' ? startDayInput : parseInt(String(startDayInput || 1), 10);

  const year = currentDate.getFullYear();
  // Note: JS Month is 0-indexed (0 = Jan, 8 = Sep)
  let candidate = new Date(year, month - 1, day);

  // If the candidate date for this year has already passed, the next school year starts next year
  if (candidate.getTime() <= currentDate.getTime()) {
    candidate = new Date(year + 1, month - 1, day);
  }

  return candidate;
}

/**
 * Enterprise SaaS Pricing Resolver for School Effective Rates.
 * Handles Grandfathering (Bestandsschutz), Custom Contracts (Sondertarife), and 60-day Notice Windows.
 */
export function calculateSchoolEffectiveRates(
  school: SchoolPricingData | null | undefined,
  masterPricing: MasterPricingRates
): EffectiveRates {
  const schoolCurrency: CurrencyCode = (school?.currency === 'CHF' || school?.country === 'CH') 
    ? 'CHF' 
    : (masterPricing.currency || 'EUR');
  const currencyMaster = MASTER_CURRENCY_RATES[schoolCurrency] || MASTER_CURRENCY_RATES.EUR;

  const baseCampus = (schoolCurrency === 'CHF' && masterPricing.priceCampus === 14.90) ? currencyMaster.priceCampus : masterPricing.priceCampus;
  const baseGroovelab = (schoolCurrency === 'CHF' && masterPricing.priceGroovelab === 9.90) ? currencyMaster.priceGroovelab : masterPricing.priceGroovelab;
  const baseKombi = (schoolCurrency === 'CHF' && masterPricing.priceKombi === 19.90) ? currencyMaster.priceKombi : masterPricing.priceKombi;
  const baseTeacher = (schoolCurrency === 'CHF' && masterPricing.priceTeacher === 0.49) ? currencyMaster.priceTeacher : masterPricing.priceTeacher;
  const baseStudent = (schoolCurrency === 'CHF' && masterPricing.priceStudent === 0.49) ? currencyMaster.priceStudent : masterPricing.priceStudent;
  const basePassive = (schoolCurrency === 'CHF' && (masterPricing.pricePassiveStudent ?? 0.09) === 0.09) ? currencyMaster.pricePassiveStudent : (masterPricing.pricePassiveStudent ?? 0.09);
  const baseStorage = (schoolCurrency === 'CHF' && (masterPricing.priceStorageAddon ?? 1.99) === 1.99) ? currencyMaster.priceStorageAddon : (masterPricing.priceStorageAddon ?? 2.99);

  const defaultRates: EffectiveRates = {
    priceCampus: baseCampus,
    priceGroovelab: baseGroovelab,
    priceKombi: baseKombi,
    priceTeacher: baseTeacher,
    priceStudent: baseStudent,
    pricePassiveStudent: basePassive,
    priceStorageAddon: baseStorage,
    storageAddonGb: 0,
    storageUsedBytes: 0,
    isGrandfatheredRateActive: false,
    isCustomRateActive: false,
    isWithin60DayNoticeWindow: false,
    nextSchoolYearStartDate: null,
    daysUntilSchoolYearStart: null,
  };

  if (!school) return defaultRates;

  // Abo-Bypass (Sponsoring / Free Partner School / SLA-Credit Override)
  if (isSchoolBypassActive(school)) {
    return {
      priceCampus: 0,
      priceGroovelab: 0,
      priceKombi: 0,
      priceTeacher: 0,
      priceStudent: 0,
      pricePassiveStudent: 0,
      priceStorageAddon: 0,
      // During active bypass, standard base quota applies (2 GB baseline)
      storageAddonGb: Number(school.storage_addon_gb || 0),
      storageUsedBytes: Number(school.storage_used_bytes || 0),
      studentSavings: 0,
      studentSavingsPercent: 0,
      isGrandfatheredRateActive: false,
      isCustomRateActive: false,
      isWithin60DayNoticeWindow: false,
      nextSchoolYearStartDate: null,
      daysUntilSchoolYearStart: null,
    };
  }

  const now = new Date();
  const nextStart = getNextSchoolYearStartDate(
    school.school_year_start_month,
    school.school_year_start_day,
    now
  );

  const diffMs = nextStart.getTime() - now.getTime();
  const daysUntilStart = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isNoticeWindow = daysUntilStart > 0 && daysUntilStart <= 60;

  let isCustom = false;
  let isGrandfathered = false;

  // 1. Evaluate Custom Pricing Overrides (Individualverträge take top priority)
  const effectiveCampus = school.custom_price_campus !== null && school.custom_price_campus !== undefined
    ? ((isCustom = true), Number(school.custom_price_campus))
    : null;

  const effectiveGroovelab = school.custom_price_groovelab !== null && school.custom_price_groovelab !== undefined
    ? ((isCustom = true), Number(school.custom_price_groovelab))
    : null;

  const effectiveKombi = school.custom_price_kombi !== null && school.custom_price_kombi !== undefined
    ? ((isCustom = true), Number(school.custom_price_kombi))
    : null;

  const effectiveTeacher = school.custom_price_teacher !== null && school.custom_price_teacher !== undefined
    ? ((isCustom = true), Number(school.custom_price_teacher))
    : null;

  const effectiveStudent = school.custom_price_student !== null && school.custom_price_student !== undefined
    ? ((isCustom = true), Number(school.custom_price_student))
    : null;

  // 2. Evaluate Grandfathering & Price Change Policy if custom price is not set for a field
  const scope = masterPricing.priceChangeScope || 'new_only';

  const shouldUseGrandfathered = () => {
    if (scope === 'new_only') return true;
    if (scope === 'immediate') return false;
    if (scope === 'school_year_start') {
      // If price change was announced, grandfathered rate stays active until nextSchoolYearStartDate
      if (masterPricing.priceChangeAnnouncedAt) {
        const announcedDate = new Date(masterPricing.priceChangeAnnouncedAt);
        // Has the school year start AFTER announcement date been reached?
        const schoolYearAfterAnnouncement = getNextSchoolYearStartDate(
          school.school_year_start_month,
          school.school_year_start_day,
          announcedDate
        );
        return now.getTime() < schoolYearAfterAnnouncement.getTime();
      }
      return false;
    }
    return true;
  };

  const useGrandfathered = shouldUseGrandfathered();

  const getFinalRate = (
    customVal: number | null,
    grandfatheredVal: number | null | undefined,
    masterVal: number
  ) => {
    if (customVal !== null) return customVal;
    if (useGrandfathered && grandfatheredVal !== null && grandfatheredVal !== undefined) {
      isGrandfathered = true;
      return Number(grandfatheredVal);
    }
    return masterVal;
  };

  const finalStudent = getFinalRate(effectiveStudent, school.grandfathered_student_price, masterPricing.priceStudent);
  const studentSavings = Math.max(0, masterPricing.priceStudent - finalStudent);
  const studentSavingsPercent = masterPricing.priceStudent > 0 && studentSavings > 0
    ? Math.round((studentSavings / masterPricing.priceStudent) * 100)
    : 0;

  const effectivePassiveStudent = school.custom_price_passive_student !== null && school.custom_price_passive_student !== undefined
    ? ((isCustom = true), Number(school.custom_price_passive_student))
    : null;

  const finalPassiveStudent = getFinalRate(effectivePassiveStudent, school.grandfathered_passive_student_price, masterPricing.pricePassiveStudent ?? 0.09);

  const addonMonthlyFee = school.storage_addon_monthly_fee !== null && school.storage_addon_monthly_fee !== undefined
    ? Number(school.storage_addon_monthly_fee)
    : (masterPricing.priceStorageAddon ?? 2.99);

  const storageGb = Number(school.storage_addon_gb || 0);
  const storageUsed = Number(school.storage_used_bytes || 0);

  return {
    priceCampus: getFinalRate(effectiveCampus, school.grandfathered_campus_price, masterPricing.priceCampus),
    priceGroovelab: getFinalRate(effectiveGroovelab, school.grandfathered_groovelab_price, masterPricing.priceGroovelab),
    priceKombi: getFinalRate(effectiveKombi, school.grandfathered_kombi_price, masterPricing.priceKombi),
    priceTeacher: getFinalRate(effectiveTeacher, school.grandfathered_teacher_price, masterPricing.priceTeacher),
    priceStudent: finalStudent,
    pricePassiveStudent: finalPassiveStudent,
    priceStorageAddon: addonMonthlyFee,
    storageAddonGb: storageGb,
    storageUsedBytes: storageUsed,
    studentSavings,
    studentSavingsPercent,
    isGrandfatheredRateActive: isGrandfathered && !isCustom,
    isCustomRateActive: isCustom,
    isWithin60DayNoticeWindow: isNoticeWindow && (masterPricing.priceChangeScope === 'school_year_start'),
    nextSchoolYearStartDate: nextStart,
    daysUntilSchoolYearStart: daysUntilStart,
  };
}

export const calculateEffectiveSchoolRates = calculateSchoolEffectiveRates;
