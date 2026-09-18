import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { PricingAuditLog, SpecialOffer } from '../MasterAdminTypes';

export interface StorageTier {
  gb: number;
  price: number;
  label: string;
  popular?: boolean;
}

export const DEFAULT_STORAGE_TIERS: StorageTier[] = [
  { gb: 10, price: 0, label: '10 GB (Standard inkl.)', popular: false },
  { gb: 25, price: 3.99, label: '25 GB (+15 GB)', popular: true },
  { gb: 50, price: 7.99, label: '50 GB (+40 GB)', popular: false },
  { gb: 100, price: 14.99, label: '100 GB (+90 GB)', popular: false },
  { gb: 250, price: 29.99, label: '250 GB (+240 GB)', popular: false }
];

interface UseMasterAdminPricingOptions {
  onNotify?: (msg: string) => void;
}

export function useMasterAdminPricing({ onNotify }: UseMasterAdminPricingOptions = {}) {
  const [priceCampus, setPriceCampus] = useState<number | string>(14.90);
  const [priceGroovelab, setPriceGroovelab] = useState<number | string>(9.90);
  const [priceKombi, setPriceKombi] = useState<number | string>(19.90);
  const [priceTeacher, setPriceTeacher] = useState<number | string>(0.49);
  const [priceStudent, setPriceStudent] = useState<number | string>(0.49);
  const [pricePassiveStudent, setPricePassiveStudent] = useState<number | string>(0.09);
  const [priceStorageAddon, setPriceStorageAddon] = useState<number | string>(2.99);
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(30);
  const [priceChangeScope, setPriceChangeScope] = useState<'all' | 'new_only'>('new_only');
  const [priceEffectiveDate, setPriceEffectiveDate] = useState<string>('');
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');
  const [storageTiersList, setStorageTiersList] = useState<StorageTier[]>(DEFAULT_STORAGE_TIERS);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [pricingAuditLogs, setPricingAuditLogs] = useState<PricingAuditLog[]>([]);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [showPricingImpactModal, setShowPricingImpactModal] = useState(false);
  const [pricingImpactData, setPricingImpactData] = useState<any>(null);

  const notify = useCallback((msg: string) => {
    if (onNotify) onNotify(msg);
  }, [onNotify]);

  const fetchPricingAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('master_pricing_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setPricingAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching pricing audit logs:', err);
    }
  }, []);

  const fetchBillingSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        const overrides = Array.isArray(data.special_offers)
          ? data.special_offers.find((o: any) => o?.id === '__cg_master_pricing_overrides__')
          : null;

        let rawC = data.price_module_campus ?? overrides?.price_module_campus ?? localStorage.getItem('cg_price_module_campus');
        let rawG = data.price_module_groovelab ?? overrides?.price_module_groovelab ?? localStorage.getItem('cg_price_module_groovelab');
        let rawK = data.price_module_kombi ?? overrides?.price_module_kombi ?? localStorage.getItem('cg_price_module_kombi');

        let c = rawC !== null && rawC !== undefined ? Number(rawC) : 14.90;
        let g = rawG !== null && rawG !== undefined ? Number(rawG) : 9.90;
        let k = rawK !== null && rawK !== undefined ? Number(rawK) : 19.90;

        if (Math.abs(c - 7.99) < 0.01 || Math.abs(c - 14.99) < 0.01) c = 14.90;
        if (Math.abs(g - 4.99) < 0.01 || Math.abs(g - 9.99) < 0.01) g = 9.90;
        if (Math.abs(k - 9.99) < 0.01 || Math.abs(k - 19.99) < 0.01) k = 19.90;

        const t = data.price_user_teacher ?? overrides?.price_user_teacher ?? (localStorage.getItem('cg_price_user_teacher') ? Number(localStorage.getItem('cg_price_user_teacher')) : 0.49);
        const s = data.price_user_student ?? overrides?.price_user_student ?? (localStorage.getItem('cg_price_user_student') ? Number(localStorage.getItem('cg_price_user_student')) : 0.49);
        const ps = data.price_user_passive_student ?? overrides?.price_user_passive_student ?? (localStorage.getItem('cg_price_user_passive_student') ? Number(localStorage.getItem('cg_price_user_passive_student')) : 0.09);
        const sa = data.price_storage_addon ?? overrides?.price_storage_addon ?? (localStorage.getItem('cg_price_storage_addon') ? Number(localStorage.getItem('cg_price_storage_addon')) : 2.99);
        const td = data.default_trial_days ?? overrides?.default_trial_days ?? (localStorage.getItem('cg_default_trial_days') ? Number(localStorage.getItem('cg_default_trial_days')) : 30);
        const scope = data.price_change_scope || overrides?.price_change_scope || localStorage.getItem('cg_price_change_scope') || 'new_only';

        setPriceCampus(Number(c).toFixed(2));
        setPriceGroovelab(Number(g).toFixed(2));
        setPriceKombi(Number(k).toFixed(2));
        setPriceTeacher(Number(t).toFixed(2));
        setPriceStudent(Number(s).toFixed(2));
        setPricePassiveStudent(Number(ps).toFixed(2));
        setPriceStorageAddon(Number(sa).toFixed(2));
        setDefaultTrialDays(td);
        setPriceChangeScope(scope as any);

        const storageTiersOverride = Array.isArray(data.special_offers)
          ? data.special_offers.find((o: any) => o?.id === '__cg_storage_tiers__')?.tiers
          : null;
        const tiers: StorageTier[] = (Array.isArray(storageTiersOverride) && storageTiersOverride.length > 0 && storageTiersOverride.some((t: any) => t.gb === 25))
          ? storageTiersOverride
          : (data.storage_tiers && Array.isArray(data.storage_tiers) && data.storage_tiers.some((t: any) => t.gb === 25) ? data.storage_tiers : DEFAULT_STORAGE_TIERS);
        setStorageTiersList(tiers);

        const dbOffers = Array.isArray(data.special_offers) ? data.special_offers : [];
        const cleanCampaigns = dbOffers.filter((o: any) => o && !String(o.id || '').startsWith('__cg_'));

        if (cleanCampaigns.length > 0) {
          setSpecialOffers(cleanCampaigns);
          localStorage.setItem('cg_special_offers', JSON.stringify(cleanCampaigns));
        } else {
          try {
            const localSaved = localStorage.getItem('cg_special_offers');
            if (localSaved) {
              const parsedLocal = JSON.parse(localSaved);
              if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                const validLocal = parsedLocal.filter((o: any) => o && !String(o.id || '').startsWith('__cg_'));
                if (validLocal.length > 0) {
                  setSpecialOffers(validLocal);
                }
              }
            }
          } catch (e) {}
        }
      }
      fetchPricingAuditLogs();
    } catch (err) {
      console.error('Error fetching billing settings:', err);
    }
  }, [fetchPricingAuditLogs]);

  const handleSavePricing = useCallback(async (newRates: {
    campus: number;
    groovelab: number;
    kombi: number;
    teacher: number;
    student: number;
    passiveStudent: number;
    storageAddon: number;
    trialDays: number;
    scope: string;
    effectiveDate?: string;
    reason?: string;
  }) => {
    setPricingSaving(true);
    try {
      const overridesPayload = {
        id: '__cg_master_pricing_overrides__',
        price_module_campus: newRates.campus,
        price_module_groovelab: newRates.groovelab,
        price_module_kombi: newRates.kombi,
        price_user_teacher: newRates.teacher,
        price_user_student: newRates.student,
        price_user_passive_student: newRates.passiveStudent,
        price_storage_addon: newRates.storageAddon,
        default_trial_days: newRates.trialDays,
        price_change_scope: newRates.scope,
        effective_date: newRates.effectiveDate,
        reason: newRates.reason,
        updated_at: new Date().toISOString()
      };

      const updatedSpecialOffers = [
        ...specialOffers.filter(o => o && !String(o.id || '').startsWith('__cg_')),
        overridesPayload,
        { id: '__cg_storage_tiers__', tiers: storageTiersList }
      ];

      await supabase
        .from('master_billing_settings')
        .update({
          price_module_campus: newRates.campus,
          price_module_groovelab: newRates.groovelab,
          price_module_kombi: newRates.kombi,
          price_user_teacher: newRates.teacher,
          price_user_student: newRates.student,
          price_user_passive_student: newRates.passiveStudent,
          price_storage_addon: newRates.storageAddon,
          default_trial_days: newRates.trialDays,
          price_change_scope: newRates.scope,
          special_offers: updatedSpecialOffers
        })
        .eq('id', 1);

      // Audit Log Entry
      try {
        await supabase.from('master_pricing_audit_log').insert({
          changed_by: 'Patrick Huber (MasterAdmin)',
          old_rates: {
            campus: priceCampus,
            groovelab: priceGroovelab,
            kombi: priceKombi,
            teacher: priceTeacher,
            student: priceStudent
          },
          new_rates: newRates,
          created_at: new Date().toISOString()
        });
      } catch (e) {}

      localStorage.setItem('cg_price_module_campus', String(newRates.campus));
      localStorage.setItem('cg_price_module_groovelab', String(newRates.groovelab));
      localStorage.setItem('cg_price_module_kombi', String(newRates.kombi));
      localStorage.setItem('cg_price_user_teacher', String(newRates.teacher));
      localStorage.setItem('cg_price_user_student', String(newRates.student));

      setPriceCampus(newRates.campus.toFixed(2));
      setPriceGroovelab(newRates.groovelab.toFixed(2));
      setPriceKombi(newRates.kombi.toFixed(2));
      setPriceTeacher(newRates.teacher.toFixed(2));
      setPriceStudent(newRates.student.toFixed(2));
      setPricePassiveStudent(newRates.passiveStudent.toFixed(2));
      setPriceStorageAddon(newRates.storageAddon.toFixed(2));
      setDefaultTrialDays(newRates.trialDays);
      setPriceChangeScope(newRates.scope as any);

      notify('Preise & Konditionen erfolgreich aktualisiert.');
      await fetchPricingAuditLogs();
    } catch (err: any) {
      alert('Fehler beim Speichern der Preise: ' + (err?.message || String(err)));
    } finally {
      setPricingSaving(false);
    }
  }, [specialOffers, storageTiersList, priceCampus, priceGroovelab, priceKombi, priceTeacher, priceStudent, notify, fetchPricingAuditLogs]);

  const handleSaveCampaigns = useCallback(async (campaigns: SpecialOffer[]) => {
    try {
      const overrides = {
        id: '__cg_master_pricing_overrides__',
        price_module_campus: Number(priceCampus),
        price_module_groovelab: Number(priceGroovelab),
        price_module_kombi: Number(priceKombi),
        price_user_teacher: Number(priceTeacher),
        price_user_student: Number(priceStudent),
        price_user_passive_student: Number(pricePassiveStudent),
        price_storage_addon: Number(priceStorageAddon),
        default_trial_days: defaultTrialDays,
        price_change_scope: priceChangeScope
      };

      const payload = [
        ...campaigns,
        overrides,
        { id: '__cg_storage_tiers__', tiers: storageTiersList }
      ];

      await supabase
        .from('master_billing_settings')
        .update({ special_offers: payload })
        .eq('id', 1);

      setSpecialOffers(campaigns);
      localStorage.setItem('cg_special_offers', JSON.stringify(campaigns));
      notify('Kampagnen erfolgreich gespeichert.');
    } catch (err: any) {
      alert('Fehler beim Speichern der Kampagnen: ' + (err?.message || String(err)));
    }
  }, [priceCampus, priceGroovelab, priceKombi, priceTeacher, priceStudent, pricePassiveStudent, priceStorageAddon, defaultTrialDays, priceChangeScope, storageTiersList, notify]);

  return {
    priceCampus,
    setPriceCampus,
    priceGroovelab,
    setPriceGroovelab,
    priceKombi,
    setPriceKombi,
    priceTeacher,
    setPriceTeacher,
    priceStudent,
    setPriceStudent,
    pricePassiveStudent,
    setPricePassiveStudent,
    priceStorageAddon,
    setPriceStorageAddon,
    defaultTrialDays,
    setDefaultTrialDays,
    priceChangeScope,
    setPriceChangeScope,
    priceEffectiveDate,
    setPriceEffectiveDate,
    priceChangeReason,
    setPriceChangeReason,
    storageTiersList,
    setStorageTiersList,
    specialOffers,
    setSpecialOffers,
    pricingAuditLogs,
    pricingSaving,
    showPricingImpactModal,
    setShowPricingImpactModal,
    pricingImpactData,
    setPricingImpactData,
    fetchBillingSettings,
    fetchPricingAuditLogs,
    handleSavePricing,
    handleSaveCampaigns
  };
}
