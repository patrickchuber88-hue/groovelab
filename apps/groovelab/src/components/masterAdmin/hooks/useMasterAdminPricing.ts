import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import type { PricingAuditLog, SpecialOffer, School, SchoolStat } from '../MasterAdminTypes';

export interface StorageTier {
  gb: number;
  price: number;
  label: string;
  sublabel?: string;
  popular?: boolean;
}

export const DEFAULT_STORAGE_TIERS_EUR: StorageTier[] = [
  { gb: 0, price: 0, label: '10 GB Basis', sublabel: 'Inklusive (Hard Cap)', popular: false },
  { gb: 10, price: 2.90, label: '+10 GB', sublabel: 'Gesamt 20 GB (Verdoppler)', popular: true },
  { gb: 25, price: 4.90, label: '+25 GB', sublabel: 'Gesamt 35 GB (Bis 250 Sch.)', popular: false },
  { gb: 50, price: 8.90, label: '+50 GB', sublabel: 'Gesamt 60 GB (Beliebt)', popular: false },
  { gb: 100, price: 14.90, label: '+100 GB', sublabel: 'Gesamt 110 GB', popular: false },
  { gb: 250, price: 19.90, label: '+250 GB', sublabel: 'Gesamt 260 GB (Archiv)', popular: false }
];

export const DEFAULT_STORAGE_TIERS_CHF: StorageTier[] = [
  { gb: 0, price: 0, label: '10 GB Basis', sublabel: 'Inklusive (Hard Cap)', popular: false },
  { gb: 10, price: 3.80, label: '+10 GB', sublabel: 'Gesamt 20 GB (Verdoppler)', popular: true },
  { gb: 25, price: 6.40, label: '+25 GB', sublabel: 'Gesamt 35 GB (Bis 250 Sch.)', popular: false },
  { gb: 50, price: 11.60, label: '+50 GB', sublabel: 'Gesamt 60 GB (Beliebt)', popular: false },
  { gb: 100, price: 19.40, label: '+100 GB', sublabel: 'Gesamt 110 GB', popular: false },
  { gb: 250, price: 25.90, label: '+250 GB', sublabel: 'Gesamt 260 GB (Archiv)', popular: false }
];

export const DEFAULT_STORAGE_TIERS = DEFAULT_STORAGE_TIERS_EUR;

interface UseMasterAdminPricingOptions {
  onNotify?: (msg: string) => void;
  schools?: School[];
  schoolStats?: Record<string, SchoolStat>;
}

export function useMasterAdminPricing({ onNotify, schools = [], schoolStats = {} }: UseMasterAdminPricingOptions = {}) {
  // Currency State: Dual-Currency Architecture (EUR vs CHF)
  const [activeCurrency, setActiveCurrency] = useState<'EUR' | 'CHF'>('EUR');

  // Rates EUR (Fair B2B Music School Standard)
  const [priceCampusEur, setPriceCampusEur] = useState<number | string>(19.90);
  const [priceGroovelabEur, setPriceGroovelabEur] = useState<number | string>(12.90);
  const [priceKombiEur, setPriceKombiEur] = useState<number | string>(24.90);
  const [priceTeacherEur, setPriceTeacherEur] = useState<number | string>(0.49);
  const [priceStudentEur, setPriceStudentEur] = useState<number | string>(0.49);
  const [pricePassiveStudentEur, setPricePassiveStudentEur] = useState<number | string>(0.09);
  const [priceStorageAddonEur, setPriceStorageAddonEur] = useState<number | string>(2.90);

  // Rates CHF (Kanonische Schweizer Tarife gem. BILLING_CANONICAL_LOGIC.md)
  const [priceCampusChf, setPriceCampusChf] = useState<number | string>(25.90);
  const [priceGroovelabChf, setPriceGroovelabChf] = useState<number | string>(16.80);
  const [priceKombiChf, setPriceKombiChf] = useState<number | string>(32.50);
  const [priceTeacherChf, setPriceTeacherChf] = useState<number | string>(1.00);
  const [priceStudentChf, setPriceStudentChf] = useState<number | string>(1.00);
  const [pricePassiveStudentChf, setPricePassiveStudentChf] = useState<number | string>(0.20);
  const [priceStorageAddonChf, setPriceStorageAddonChf] = useState<number | string>(3.80);

  // Storage Tiers
  const [storageTiersEur, setStorageTiersEur] = useState<StorageTier[]>(DEFAULT_STORAGE_TIERS_EUR);
  const [storageTiersChf, setStorageTiersChf] = useState<StorageTier[]>(DEFAULT_STORAGE_TIERS_CHF);

  // Shared Policy Fields
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(30);
  const [priceChangeScope, setPriceChangeScope] = useState<'new_only' | 'all'>('new_only');
  const [priceEffectiveDate, setPriceEffectiveDate] = useState<string>('');
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');

  // Campaigns & Logs
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [pricingAuditLogs, setPricingAuditLogs] = useState<PricingAuditLog[]>([]);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [showPricingImpactModal, setShowPricingImpactModal] = useState(false);
  const [pricingImpactData, setPricingImpactData] = useState<any>(null);

  const notify = useCallback((msg: string) => {
    if (onNotify) onNotify(msg);
  }, [onNotify]);

  // Backward-compatible active rate getters & setters
  const priceCampus = activeCurrency === 'EUR' ? priceCampusEur : priceCampusChf;
  const setPriceCampus = activeCurrency === 'EUR' ? setPriceCampusEur : setPriceCampusChf;

  const priceGroovelab = activeCurrency === 'EUR' ? priceGroovelabEur : priceGroovelabChf;
  const setPriceGroovelab = activeCurrency === 'EUR' ? setPriceGroovelabEur : setPriceGroovelabChf;

  const priceKombi = activeCurrency === 'EUR' ? priceKombiEur : priceKombiChf;
  const setPriceKombi = activeCurrency === 'EUR' ? setPriceKombiEur : setPriceKombiChf;

  const priceTeacher = activeCurrency === 'EUR' ? priceTeacherEur : priceTeacherChf;
  const setPriceTeacher = activeCurrency === 'EUR' ? setPriceTeacherEur : setPriceTeacherChf;

  const priceStudent = activeCurrency === 'EUR' ? priceStudentEur : priceStudentChf;
  const setPriceStudent = activeCurrency === 'EUR' ? setPriceStudentEur : setPriceStudentChf;

  const pricePassiveStudent = activeCurrency === 'EUR' ? pricePassiveStudentEur : pricePassiveStudentChf;
  const setPricePassiveStudent = activeCurrency === 'EUR' ? setPricePassiveStudentEur : setPricePassiveStudentChf;

  const priceStorageAddon = activeCurrency === 'EUR' ? priceStorageAddonEur : priceStorageAddonChf;
  const setPriceStorageAddon = activeCurrency === 'EUR' ? setPriceStorageAddonEur : setPriceStorageAddonChf;

  const storageTiersList = activeCurrency === 'EUR' ? storageTiersEur : storageTiersChf;
  const setStorageTiersList = (tiers: StorageTier[]) => {
    if (activeCurrency === 'EUR') setStorageTiersEur(tiers);
    else setStorageTiersChf(tiers);
  };

  // Real-Time KPI Aggregation
  const liveKpiStats = useMemo(() => {
    let eurMrr = 0;
    let chfMrr = 0;
    let totalProtected = 0;
    let totalActive = 0;
    let totalPassive = 0;

    schools.forEach(school => {
      const stats = schoolStats[school.id] || { totalStudents: 0, activeStudents: 0, totalTeachers: 0, totalSongs: 0, hasGroovelab: false, hasCampus: false };
      const teachers = stats.totalTeachers || school.teachers_count || 0;
      const activeStudents = stats.activeStudents || school.active_students_count || 0;
      const passiveStudents = Math.max(0, (stats.totalStudents || 0) - activeStudents);

      totalActive += activeStudents;
      totalPassive += passiveStudents;

      const isCh = school.country === 'CH' || school.currency === 'CHF';
      const curCampus = school.grandfathered_campus_price ?? (isCh ? Number(priceCampusChf) : Number(priceCampusEur));
      const curGroove = school.grandfathered_groovelab_price ?? (isCh ? Number(priceGroovelabChf) : Number(priceGroovelabEur));
      const curKombi = school.grandfathered_kombi_price ?? (isCh ? Number(priceKombiChf) : Number(priceKombiEur));
      const curTeacher = school.grandfathered_teacher_price ?? (isCh ? Number(priceTeacherChf) : Number(priceTeacherEur));
      const curStudent = school.grandfathered_student_price ?? (isCh ? Number(priceStudentChf) : Number(priceStudentEur));
      const curPassive = isCh ? 0.20 : 0.09;
      const curStorage = Number(school.storage_addon_monthly_fee || 0);

      if (school.price_grandfathered_at || school.grandfathered_campus_price !== null || school.grandfathered_kombi_price !== null) {
        totalProtected++;
      }

      let basePrice = 0;
      if (school.has_campus_subscription && school.has_groovelab_subscription) basePrice = curKombi;
      else if (school.has_campus_subscription) basePrice = curCampus;
      else if (school.has_groovelab_subscription) basePrice = curGroove;

      const cost = basePrice + (teachers * curTeacher) + (activeStudents * curStudent) + (passiveStudents * curPassive) + curStorage;
      if (isCh) {
        chfMrr += cost;
      } else {
        eurMrr += cost;
      }
    });

    return {
      eurMrr: Math.round(eurMrr * 100) / 100,
      chfMrr: Math.round(chfMrr * 100) / 100,
      totalProtectedSchools: totalProtected || schools.length, // All existing schools are lifetime-protected by default
      totalActiveStudents: totalActive,
      totalPassiveStudents: totalPassive
    };
  }, [schools, schoolStats, priceCampusEur, priceCampusChf, priceGroovelabEur, priceGroovelabChf, priceKombiEur, priceKombiChf, priceTeacherEur, priceTeacherChf, priceStudentEur, priceStudentChf]);

  const fetchPricingAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('master_pricing_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
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

        // EUR Rates
        let rawC = data.price_module_campus ?? overrides?.price_module_campus ?? localStorage.getItem('cg_price_module_campus');
        let rawG = data.price_module_groovelab ?? overrides?.price_module_groovelab ?? localStorage.getItem('cg_price_module_groovelab');
        let rawK = data.price_module_kombi ?? overrides?.price_module_kombi ?? localStorage.getItem('cg_price_module_kombi');

        let c = rawC !== null && rawC !== undefined ? Number(rawC) : 19.90;
        let g = rawG !== null && rawG !== undefined ? Number(rawG) : 12.90;
        let k = rawK !== null && rawK !== undefined ? Number(rawK) : 24.90;
        if (Math.abs(c - 7.99) < 0.01 || Math.abs(c - 14.90) < 0.01 || Math.abs(c - 14.99) < 0.01) c = 19.90;
        if (Math.abs(g - 4.99) < 0.01 || Math.abs(g - 9.90) < 0.01 || Math.abs(g - 9.99) < 0.01) g = 12.90;
        if (Math.abs(k - 9.99) < 0.01 || Math.abs(k - 19.90) < 0.01 || Math.abs(k - 19.99) < 0.01) k = 24.90;

        const t = data.price_user_teacher ?? overrides?.price_user_teacher ?? 0.49;
        const s = data.price_user_student ?? overrides?.price_user_student ?? 0.49;
        const ps = data.price_user_passive_student ?? overrides?.price_user_passive_student ?? 0.09;
        const rawSa = data.price_storage_addon ?? overrides?.price_storage_addon ?? 2.90;
        const sa = Math.abs(Number(rawSa) - 4.90) < 0.01 ? 2.90 : Number(rawSa);

        setPriceCampusEur(Number(c).toFixed(2));
        setPriceGroovelabEur(Number(g).toFixed(2));
        setPriceKombiEur(Number(k).toFixed(2));
        setPriceTeacherEur(Number(t).toFixed(2));
        setPriceStudentEur(Number(s).toFixed(2));
        setPricePassiveStudentEur(Number(ps).toFixed(2));
        setPriceStorageAddonEur(Number(sa).toFixed(2));

        // CHF Rates (Kanonische Schweizer Tarife: 1.00 CHF aktiv, 0.20 CHF passiv)
        const rawCChf = data.price_module_campus_chf ?? overrides?.price_module_campus_chf ?? 25.90;
        const rawGChf = data.price_module_groovelab_chf ?? overrides?.price_module_groovelab_chf ?? 16.80;
        const rawKChf = data.price_module_kombi_chf ?? overrides?.price_module_kombi_chf ?? 32.50;
        const cChf = Math.abs(Number(rawCChf) - 19.90) < 0.01 ? 25.90 : Number(rawCChf);
        const gChf = Math.abs(Number(rawGChf) - 14.90) < 0.01 ? 16.80 : Number(rawGChf);
        const kChf = Math.abs(Number(rawKChf) - 29.90) < 0.01 ? 32.50 : Number(rawKChf);
        const rawTChf = data.price_user_teacher_chf ?? overrides?.price_user_teacher_chf ?? 1.00;
        const rawSChf = data.price_user_student_chf ?? overrides?.price_user_student_chf ?? 1.00;
        const rawPsChf = data.price_user_passive_student_chf ?? overrides?.price_user_passive_student_chf ?? 0.20;
        const tChf = Math.abs(Number(rawTChf) - 0.65) < 0.01 ? 1.00 : Number(rawTChf);
        const sChf = Math.abs(Number(rawSChf) - 0.65) < 0.01 ? 1.00 : Number(rawSChf);
        const psChf = Math.abs(Number(rawPsChf) - 0.15) < 0.01 ? 0.20 : Number(rawPsChf);
        const saChf = data.price_storage_addon_chf ?? overrides?.price_storage_addon_chf ?? 3.80;

        setPriceCampusChf(Number(cChf).toFixed(2));
        setPriceGroovelabChf(Number(gChf).toFixed(2));
        setPriceKombiChf(Number(kChf).toFixed(2));
        setPriceTeacherChf(Number(tChf).toFixed(2));
        setPriceStudentChf(Number(sChf).toFixed(2));
        setPricePassiveStudentChf(Number(psChf).toFixed(2));
        setPriceStorageAddonChf(Number(saChf).toFixed(2));

        // Storage Tiers
        if (Array.isArray(data.storage_tiers_eur) && data.storage_tiers_eur.length > 0) {
          setStorageTiersEur(data.storage_tiers_eur);
        }
        if (Array.isArray(data.storage_tiers_chf) && data.storage_tiers_chf.length > 0) {
          setStorageTiersChf(data.storage_tiers_chf);
        }

        const td = data.default_trial_days ?? overrides?.default_trial_days ?? 30;
        setDefaultTrialDays(td);
        setPriceChangeScope('new_only');

        // Campaigns
        const dbOffers = Array.isArray(data.special_offers) ? data.special_offers : [];
        const cleanCampaigns = dbOffers.filter((o: any) => o && !String(o.id || '').startsWith('__cg_'));
        if (cleanCampaigns.length > 0) {
          setSpecialOffers(cleanCampaigns);
          localStorage.setItem('cg_special_offers', JSON.stringify(cleanCampaigns));
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
    currency?: 'EUR' | 'CHF';
    effectiveDate?: string;
    reason?: string;
  }) => {
    setPricingSaving(true);
    const targetCurrency = newRates.currency || activeCurrency;
    try {
      const isEur = targetCurrency === 'EUR';
      const overridesPayload: Record<string, unknown> = {
        id: '__cg_master_pricing_overrides__',
        price_module_campus: isEur ? newRates.campus : Number(priceCampusEur),
        price_module_groovelab: isEur ? newRates.groovelab : Number(priceGroovelabEur),
        price_module_kombi: isEur ? newRates.kombi : Number(priceKombiEur),
        price_user_teacher: isEur ? newRates.teacher : Number(priceTeacherEur),
        price_per_teacher: isEur ? newRates.teacher : Number(priceTeacherEur),
        price_user_student: isEur ? newRates.student : Number(priceStudentEur),
        price_per_student: isEur ? newRates.student : Number(priceStudentEur),
        price_user_passive_student: isEur ? newRates.passiveStudent : Number(pricePassiveStudentEur),
        price_per_passive_student: isEur ? newRates.passiveStudent : Number(pricePassiveStudentEur),
        price_storage_addon: isEur ? newRates.storageAddon : Number(priceStorageAddonEur),
        storage_tiers_eur: storageTiersEur,
        price_module_campus_chf: !isEur ? newRates.campus : Number(priceCampusChf),
        price_module_groovelab_chf: !isEur ? newRates.groovelab : Number(priceGroovelabChf),
        price_module_kombi_chf: !isEur ? newRates.kombi : Number(priceKombiChf),
        price_user_teacher_chf: !isEur ? newRates.teacher : Number(priceTeacherChf),
        price_per_teacher_chf: !isEur ? newRates.teacher : Number(priceTeacherChf),
        price_user_student_chf: !isEur ? newRates.student : Number(priceStudentChf),
        price_per_student_chf: !isEur ? newRates.student : Number(priceStudentChf),
        price_user_passive_student_chf: !isEur ? newRates.passiveStudent : Number(pricePassiveStudentChf),
        price_per_passive_student_chf: !isEur ? newRates.passiveStudent : Number(pricePassiveStudentChf),
        price_storage_addon_chf: !isEur ? newRates.storageAddon : Number(priceStorageAddonChf),
        storage_tiers_chf: storageTiersChf,
        default_trial_days: newRates.trialDays,
        price_change_scope: 'new_only', // 100% Lifetime-Bestandsschutz enforced
        effective_date: newRates.effectiveDate,
        reason: newRates.reason,
        updated_at: new Date().toISOString()
      };

      const updateData: Record<string, unknown> = {
        default_trial_days: newRates.trialDays,
        price_change_scope: 'new_only'
      };

      if (isEur) {
        updateData.price_module_campus = newRates.campus;
        updateData.price_module_groovelab = newRates.groovelab;
        updateData.price_module_kombi = newRates.kombi;
        updateData.price_user_teacher = newRates.teacher;
        updateData.price_user_student = newRates.student;
        updateData.price_user_passive_student = newRates.passiveStudent;
        updateData.price_storage_addon = newRates.storageAddon;
        updateData.storage_tiers_eur = storageTiersEur;
      } else {
        updateData.price_module_campus_chf = newRates.campus;
        updateData.price_module_groovelab_chf = newRates.groovelab;
        updateData.price_module_kombi_chf = newRates.kombi;
        updateData.price_user_teacher_chf = newRates.teacher;
        updateData.price_user_student_chf = newRates.student;
        updateData.price_user_passive_student_chf = newRates.passiveStudent;
        updateData.price_storage_addon_chf = newRates.storageAddon;
        updateData.storage_tiers_chf = storageTiersChf;
      }

      const updatedSpecialOffers = [
        ...specialOffers.filter(o => o && !String(o.id || '').startsWith('__cg_')),
        overridesPayload,
        {
          id: '__cg_storage_tiers__',
          tiers: isEur ? storageTiersEur : storageTiersChf,
          storage_tiers_eur: storageTiersEur,
          storage_tiers_chf: storageTiersChf
        }
      ];
      updateData.special_offers = updatedSpecialOffers;

      await supabase
        .from('master_billing_settings')
        .update(updateData)
        .eq('id', 1);

      // Revisionssicheres Audit-Logbuch
      try {
        await supabase.from('master_pricing_audit_log').insert({
          changed_by: 'Patrick Huber (MasterAdmin)',
          currency: targetCurrency,
          scope: 'new_only (Lifetime-Bestandsschutz)',
          reason: newRates.reason || 'Katalogpreis-Aktualisierung für Neukunden',
          old_rates: {
            currency: targetCurrency,
            campus: isEur ? priceCampusEur : priceCampusChf,
            groovelab: isEur ? priceGroovelabEur : priceGroovelabChf,
            kombi: isEur ? priceKombiEur : priceKombiChf,
            teacher: isEur ? priceTeacherEur : priceTeacherChf,
            student: isEur ? priceStudentEur : priceStudentChf
          },
          new_rates: {
            currency: targetCurrency,
            ...newRates
          },
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Audit log write error:', e);
      }

      if (isEur) {
        setPriceCampusEur(newRates.campus.toFixed(2));
        setPriceGroovelabEur(newRates.groovelab.toFixed(2));
        setPriceKombiEur(newRates.kombi.toFixed(2));
        setPriceTeacherEur(newRates.teacher.toFixed(2));
        setPriceStudentEur(newRates.student.toFixed(2));
        setPricePassiveStudentEur(newRates.passiveStudent.toFixed(2));
        setPriceStorageAddonEur(newRates.storageAddon.toFixed(2));
      } else {
        setPriceCampusChf(newRates.campus.toFixed(2));
        setPriceGroovelabChf(newRates.groovelab.toFixed(2));
        setPriceKombiChf(newRates.kombi.toFixed(2));
        setPriceTeacherChf(newRates.teacher.toFixed(2));
        setPriceStudentChf(newRates.student.toFixed(2));
        setPricePassiveStudentChf(newRates.passiveStudent.toFixed(2));
        setPriceStorageAddonChf(newRates.storageAddon.toFixed(2));
      }

      notify(`${isEur ? 'EUR' : 'CHF'} Tarife erfolgreich aktualisiert. Bestandskunden bleiben zu 100% geschützt.`);
      await fetchPricingAuditLogs();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Fehler beim Speichern der Tarife: ' + errMsg);
    } finally {
      setPricingSaving(false);
    }
  }, [
    activeCurrency, specialOffers, storageTiersEur, storageTiersChf,
    priceCampusEur, priceCampusChf, priceGroovelabEur, priceGroovelabChf,
    priceKombiEur, priceKombiChf, priceTeacherEur, priceTeacherChf,
    priceStudentEur, priceStudentChf, pricePassiveStudentEur, pricePassiveStudentChf,
    priceStorageAddonEur, priceStorageAddonChf, notify, fetchPricingAuditLogs
  ]);

  const handleSaveCampaigns = useCallback(async (campaigns: SpecialOffer[]) => {
    try {
      const overrides = {
        id: '__cg_master_pricing_overrides__',
        price_module_campus: Number(priceCampusEur),
        price_module_groovelab: Number(priceGroovelabEur),
        price_module_kombi: Number(priceKombiEur),
        price_user_teacher: Number(priceTeacherEur),
        price_per_teacher: Number(priceTeacherEur),
        price_user_student: Number(priceStudentEur),
        price_per_student: Number(priceStudentEur),
        price_user_passive_student: Number(pricePassiveStudentEur),
        price_per_passive_student: Number(pricePassiveStudentEur),
        price_storage_addon: Number(priceStorageAddonEur),
        storage_tiers_eur: storageTiersEur,
        price_module_campus_chf: Number(priceCampusChf),
        price_module_groovelab_chf: Number(priceGroovelabChf),
        price_module_kombi_chf: Number(priceKombiChf),
        price_user_teacher_chf: Number(priceTeacherChf),
        price_per_teacher_chf: Number(priceTeacherChf),
        price_user_student_chf: Number(priceStudentChf),
        price_per_student_chf: Number(priceStudentChf),
        price_user_passive_student_chf: Number(pricePassiveStudentChf),
        price_per_passive_student_chf: Number(pricePassiveStudentChf),
        price_storage_addon_chf: Number(priceStorageAddonChf),
        storage_tiers_chf: storageTiersChf,
        default_trial_days: defaultTrialDays,
        price_change_scope: 'new_only'
      };

      const payload = [
        ...campaigns,
        overrides,
        {
          id: '__cg_storage_tiers__',
          tiers: storageTiersList,
          storage_tiers_eur: storageTiersEur,
          storage_tiers_chf: storageTiersChf
        }
      ];

      await supabase
        .from('master_billing_settings')
        .update({ special_offers: payload })
        .eq('id', 1);

      setSpecialOffers(campaigns);
      localStorage.setItem('cg_special_offers', JSON.stringify(campaigns));
      notify('Kampagnen erfolgreich gespeichert.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Fehler beim Speichern der Kampagnen: ' + errMsg);
    }
  }, [
    priceCampusEur, priceGroovelabEur, priceKombiEur, priceTeacherEur, priceStudentEur,
    pricePassiveStudentEur, priceStorageAddonEur, priceCampusChf, priceGroovelabChf,
    priceKombiChf, priceTeacherChf, priceStudentChf, pricePassiveStudentChf,
    priceStorageAddonChf, storageTiersEur, storageTiersChf, defaultTrialDays, storageTiersList, notify
  ]);

  return {
    // Currency Multi-Currency Architecture
    activeCurrency,
    setActiveCurrency,

    // Active rates (dynamically reflects EUR / CHF)
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

    // Raw currency rates
    priceCampusEur,
    priceGroovelabEur,
    priceKombiEur,
    priceTeacherEur,
    priceStudentEur,
    pricePassiveStudentEur,
    priceStorageAddonEur,

    priceCampusChf,
    priceGroovelabChf,
    priceKombiChf,
    priceTeacherChf,
    priceStudentChf,
    pricePassiveStudentChf,
    priceStorageAddonChf,

    // Storage Tiers
    storageTiersList,
    setStorageTiersList,
    storageTiersEur,
    setStorageTiersEur,
    storageTiersChf,
    setStorageTiersChf,

    // Lifetime Governance & Policy
    defaultTrialDays,
    setDefaultTrialDays,
    priceChangeScope,
    setPriceChangeScope,
    priceEffectiveDate,
    setPriceEffectiveDate,
    priceChangeReason,
    setPriceChangeReason,

    // Live KPIs
    liveKpiStats,

    // Campaigns & Logs
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
