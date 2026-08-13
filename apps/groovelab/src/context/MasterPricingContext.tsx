import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateEffectiveSchoolRates, EffectiveSchoolRates, SchoolPricingProfile } from '../domain/pricingEngine';

export interface MasterPricingData {
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
  pricePassiveStudent: number;
  priceStorageAddon: number;
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
}

const defaultPricing: MasterPricingData = {
  priceCampus: 7.99,
  priceGroovelab: 4.99,
  priceKombi: 9.99,
  priceTeacher: 0.49,
  priceStudent: 0.49,
  pricePassiveStudent: 0.09,
  priceStorageAddon: 2.99,
  campus: 7.99,
  groovelab: 4.99,
  kombi: 9.99,
  teacher: 0.49,
  student: 0.49,
  passiveStudent: 0.09,
  storageAddon: 2.99,
  freeMonthsPerYear: 0,
  billingMonthsPerYear: 12,
  singleModulesTotal: 12.98,
  kombiSavings: 2.99,
  kombiSavingsPercent: 23,
  priceChangeScope: 'new_only',
  priceChangeAnnouncedAt: null,
  specialOffers: [],
  isLoading: true,
  refetchPricing: async () => {},
  getSchoolRates: (school) => calculateEffectiveSchoolRates(school, {
    priceCampus: 7.99,
    priceGroovelab: 4.99,
    priceKombi: 9.99,
    priceTeacher: 0.49,
    priceStudent: 0.49,
    pricePassiveStudent: 0.09,
    priceStorageAddon: 2.99,
    priceChangeScope: 'new_only',
  }),
};

const MasterPricingContext = createContext<MasterPricingData>(defaultPricing);

export const MasterPricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pricing, setPricing] = useState<MasterPricingData>(defaultPricing);

  const fetchMasterPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        const c = (data.price_module_campus !== null && data.price_module_campus !== undefined) ? Number(data.price_module_campus) : 7.99;
        const g = (data.price_module_groovelab !== null && data.price_module_groovelab !== undefined) ? Number(data.price_module_groovelab) : 4.99;
        const k = (data.price_module_kombi !== null && data.price_module_kombi !== undefined) ? Number(data.price_module_kombi) : 9.99;
        const t = (data.price_user_teacher !== null && data.price_user_teacher !== undefined) ? Number(data.price_user_teacher) : 0.49;
        const s = (data.price_user_student !== null && data.price_user_student !== undefined) ? Number(data.price_user_student) : 0.49;
        const ps = (data.price_user_passive_student !== null && data.price_user_passive_student !== undefined) ? Number(data.price_user_passive_student) : 0.09;
        const sa = (data.price_storage_addon !== null && data.price_storage_addon !== undefined) ? Number(data.price_storage_addon) : 2.99;
        const freeMonths = (data.free_months_per_year !== null && data.free_months_per_year !== undefined) ? Number(data.free_months_per_year) : 0;
        const billingMonths = Math.max(1, 12 - freeMonths);
        const scope = (data.price_change_scope as 'new_only' | 'school_year_start' | 'immediate') || 'new_only';
        const announcedAt = data.price_change_announced_at || null;

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
          priceChangeScope: scope,
          priceChangeAnnouncedAt: announcedAt,
        };

        setPricing({
          priceCampus: c,
          priceGroovelab: g,
          priceKombi: k,
          priceTeacher: t,
          priceStudent: s,
          pricePassiveStudent: ps,
          priceStorageAddon: sa,
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
          getSchoolRates: (schoolProfile) => calculateEffectiveSchoolRates(schoolProfile, masterSettings),
        });
      } else {
        setPricing(prev => ({ ...prev, isLoading: false, refetchPricing: fetchMasterPricing }));
      }
    } catch (err) {
      console.warn('MasterPricingProvider fetch error:', err);
      setPricing(prev => ({ ...prev, isLoading: false, refetchPricing: fetchMasterPricing }));
    }
  };

  useEffect(() => {
    fetchMasterPricing();

    // Subscribe to realtime changes on master_billing_settings
    const channel = supabase
      .channel('public:master_billing_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_billing_settings' },
        () => {
          fetchMasterPricing();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MasterPricingContext.Provider value={pricing}>
      {children}
    </MasterPricingContext.Provider>
  );
};

export const useMasterPricing = () => useContext(MasterPricingContext);
