import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  calculateEffectiveSchoolRates, 
  EffectiveSchoolRates, 
  SchoolPricingProfile, 
  StorageTier, 
  DEFAULT_STORAGE_TIERS, 
  getStorageTierByGb,
  CurrencyCode,
  CurrencyPricingRates,
  MASTER_CURRENCY_RATES,
  formatCurrency
} from '../domain/pricingEngine';

export interface MasterPricingData {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amount: number, currencyOverride?: CurrencyCode) => string;
  ratesEUR: CurrencyPricingRates;
  ratesCHF: CurrencyPricingRates;
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
  pricePassiveStudent: number;
  priceStorageAddon: number;
  storageTiers: StorageTier[];
  campus: number;
  groovelab: number;
  kombi: number;
  teacher: number;
  student: number;
  passiveStudent: number;
  storageAddon: number;
  freeMonthsPerYear: number;
  billingMonthsPerYear: number;
  singleModulesTotal: number;
  kombiSavings: number;
  kombiSavingsPercent: number;
  priceChangeScope: 'new_only' | 'school_year_start' | 'immediate';
  priceChangeAnnouncedAt?: string | null;
  specialOffers: any[];
  isLoading: boolean;
  refetchPricing: () => Promise<void>;
  getSchoolRates: (school: SchoolPricingProfile | null | undefined) => EffectiveSchoolRates;
  getStorageTier: (gb: number, customCurrency?: CurrencyCode) => StorageTier;
}

const defaultPricing: MasterPricingData = {
  currency: 'EUR',
  setCurrency: () => {},
  formatPrice: (amount, curr) => formatCurrency(amount, curr || 'EUR'),
  ratesEUR: MASTER_CURRENCY_RATES.EUR,
  ratesCHF: MASTER_CURRENCY_RATES.CHF,
  priceCampus: 14.90,
  priceGroovelab: 9.90,
  priceKombi: 19.90,
  priceTeacher: 0.49,
  priceStudent: 0.49,
  pricePassiveStudent: 0.09,
  priceStorageAddon: 1.99,
  storageTiers: DEFAULT_STORAGE_TIERS,
  campus: 14.90,
  groovelab: 9.90,
  kombi: 19.90,
  teacher: 0.49,
  student: 0.49,
  passiveStudent: 0.09,
  storageAddon: 1.99,
  freeMonthsPerYear: 0,
  billingMonthsPerYear: 12,
  singleModulesTotal: 24.80,
  kombiSavings: 4.90,
  kombiSavingsPercent: 20,
  priceChangeScope: 'new_only',
  priceChangeAnnouncedAt: null,
  specialOffers: [],
  isLoading: true,
  refetchPricing: async () => {},
  getSchoolRates: (school) => calculateEffectiveSchoolRates(school, {
    priceCampus: 14.90,
    priceGroovelab: 9.90,
    priceKombi: 19.90,
    priceTeacher: 0.49,
    priceStudent: 0.49,
    pricePassiveStudent: 0.09,
    priceStorageAddon: 1.99,
    priceChangeScope: 'new_only',
    currency: 'EUR'
  }),
  getStorageTier: (gb, curr) => getStorageTierByGb(gb, DEFAULT_STORAGE_TIERS, curr || 'EUR'),
};

const MasterPricingContext = createContext<MasterPricingData>(defaultPricing);

export const MasterPricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('groovelab_currency') as CurrencyCode;
      if (stored === 'CHF' || stored === 'EUR') return stored;

      // Smart Zero-Click Geo & Locale Detection for Switzerland
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone && (timeZone === 'Europe/Zurich' || timeZone.includes('Zurich'))) {
          return 'CHF';
        }
        const lang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
        if (lang.includes('-ch') || lang === 'de-ch' || lang === 'fr-ch' || lang === 'it-ch') {
          return 'CHF';
        }
      } catch (e) {}
    }
    return 'EUR';
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('groovelab_currency', c);
        window.dispatchEvent(new Event('groovelab_currency_updated'));
      }
    } catch (e) {}
  };

  const formatPrice = (amount: number, currencyOverride?: CurrencyCode) => {
    return formatCurrency(amount, currencyOverride || currency);
  };

  const [pricing, setPricing] = useState<MasterPricingData>({
    ...defaultPricing,
    currency,
    setCurrency,
    formatPrice
  });

  const fetchMasterPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const activeRates = MASTER_CURRENCY_RATES[currency] || MASTER_CURRENCY_RATES.EUR;

      if (data) {
        const overrides = Array.isArray(data.special_offers)
          ? data.special_offers.find((o: any) => o?.id === '__cg_master_pricing_overrides__')
          : null;

        let c = activeRates.priceCampus;
        let g = activeRates.priceGroovelab;
        let k = activeRates.priceKombi;
        let t = activeRates.priceTeacher;
        let s = activeRates.priceStudent;
        let ps = activeRates.pricePassiveStudent;
        let sa = activeRates.priceStorageAddon;

        if (currency === 'EUR') {
          const rawC = data.price_module_campus ?? overrides?.price_module_campus;
          const rawG = data.price_module_groovelab ?? overrides?.price_module_groovelab;
          const rawK = data.price_module_kombi ?? overrides?.price_module_kombi;
          if (rawC !== null && rawC !== undefined) c = Number(rawC);
          if (rawG !== null && rawG !== undefined) g = Number(rawG);
          if (rawK !== null && rawK !== undefined) k = Number(rawK);
          if (Math.abs(c - 7.99) < 0.01 || Math.abs(c - 14.99) < 0.01) c = 14.90;
          if (Math.abs(g - 4.99) < 0.01 || Math.abs(g - 9.99) < 0.01) g = 9.90;
          if (Math.abs(k - 9.99) < 0.01 || Math.abs(k - 19.99) < 0.01) k = 19.90;
          if (data.price_user_teacher !== null && data.price_user_teacher !== undefined) t = Number(data.price_user_teacher);
          if (data.price_user_student !== null && data.price_user_student !== undefined) s = Number(data.price_user_student);
          if (data.price_user_passive_student !== null && data.price_user_passive_student !== undefined) ps = Number(data.price_user_passive_student);
          if (data.price_storage_addon !== null && data.price_storage_addon !== undefined) sa = Number(data.price_storage_addon);
        }

        const freeMonths = (data.free_months_per_year !== null && data.free_months_per_year !== undefined) ? Number(data.free_months_per_year) : 0;
        const billingMonths = Math.max(1, 12 - freeMonths);
        const scope = (data.price_change_scope as 'new_only' | 'school_year_start' | 'immediate') || 'new_only';
        const announcedAt = data.price_change_announced_at || null;

        // Read custom storage tiers from JSONB or database column
        const storageTiersOverride = Array.isArray(data.special_offers)
          ? data.special_offers.find((o: any) => o?.id === '__cg_storage_tiers__')?.tiers
          : null;
        const tiers: StorageTier[] = (Array.isArray(storageTiersOverride) && storageTiersOverride.length > 0 && storageTiersOverride.some((t: any) => t.gb === 25))
          ? storageTiersOverride
          : (data.storage_tiers && Array.isArray(data.storage_tiers) && data.storage_tiers.some((t: any) => t.gb === 25) ? data.storage_tiers : DEFAULT_STORAGE_TIERS);

        const singleTotal = c + g;
        const savings = Math.max(0, singleTotal - k);
        const savingsPct = singleTotal > 0 ? Math.round((savings / singleTotal) * 100) : 0;

        const masterSettings = {
          priceCampus: c,
          priceGroovelab: g,
          priceKombi: k,
          priceTeacher: t,
          priceStudent: s,
          pricePassiveStudent: ps,
          priceStorageAddon: sa,
          storageTiers: tiers,
          priceChangeScope: scope,
          priceChangeAnnouncedAt: announcedAt,
          currency,
        };

        setPricing({
          currency,
          setCurrency,
          formatPrice,
          ratesEUR: MASTER_CURRENCY_RATES.EUR,
          ratesCHF: MASTER_CURRENCY_RATES.CHF,
          priceCampus: c,
          priceGroovelab: g,
          priceKombi: k,
          priceTeacher: t,
          priceStudent: s,
          pricePassiveStudent: ps,
          priceStorageAddon: sa,
          storageTiers: tiers,
          campus: c,
          groovelab: g,
          kombi: k,
          teacher: t,
          student: s,
          passiveStudent: ps,
          storageAddon: sa,
          freeMonthsPerYear: freeMonths,
          billingMonthsPerYear: billingMonths,
          singleModulesTotal: Number(singleTotal.toFixed(2)),
          kombiSavings: Number(savings.toFixed(2)),
          kombiSavingsPercent: savingsPct,
          priceChangeScope: scope,
          priceChangeAnnouncedAt: announcedAt,
          specialOffers: data.special_offers || [],
          isLoading: false,
          refetchPricing: fetchMasterPricing,
          getSchoolRates: (schoolProfile: SchoolPricingProfile | null | undefined) => calculateEffectiveSchoolRates(schoolProfile, masterSettings),
          getStorageTier: (gb: number, customCurrency?: CurrencyCode) => getStorageTierByGb(gb, tiers, customCurrency || currency),
        });
      } else {
        setPricing((prev: MasterPricingData) => ({ 
          ...prev, 
          currency,
          setCurrency,
          formatPrice,
          ratesEUR: MASTER_CURRENCY_RATES.EUR,
          ratesCHF: MASTER_CURRENCY_RATES.CHF,
          isLoading: false, 
          refetchPricing: fetchMasterPricing 
        }));
      }
    } catch (err) {
      console.warn('MasterPricingProvider fetch error:', err);
      setPricing((prev: MasterPricingData) => ({ 
        ...prev, 
        currency,
        setCurrency,
        formatPrice,
        ratesEUR: MASTER_CURRENCY_RATES.EUR,
        ratesCHF: MASTER_CURRENCY_RATES.CHF,
        isLoading: false, 
        refetchPricing: fetchMasterPricing 
      }));
    }
  };

  useEffect(() => {
    fetchMasterPricing();

    // Tier-1 Goldstandard: Zero-WebSocket Stammdaten-Architektur
    // Horizontale Invalidation per window-Event oder cross-tab Storage-Event, falls im Master Cockpit Tarife gespeichert werden
    const handlePricingUpdate = () => {
      fetchMasterPricing();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cg_master_pricing_updated', handlePricingUpdate);
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'cg_master_pricing_version') {
          fetchMasterPricing();
        }
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        window.removeEventListener('cg_master_pricing_updated', handlePricingUpdate);
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [currency]);

  return (
    <MasterPricingContext.Provider value={pricing}>
      {children}
    </MasterPricingContext.Provider>
  );
};

export const useMasterPricing = () => useContext(MasterPricingContext);
