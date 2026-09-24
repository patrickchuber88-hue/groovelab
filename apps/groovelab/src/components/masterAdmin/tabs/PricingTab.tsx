import React, { useState } from 'react';
import { 
  Tag, Percent, Plus, Copy, Check, Trash2, Edit2, RotateCcw, 
  ArrowRight, ShieldCheck, Building2, Rocket, Calendar, GraduationCap, Download, FileText,
  HardDrive, Users, DollarSign, Sparkles, AlertCircle, Clock
} from 'lucide-react';
import { CampaignEditModal } from './pricing/CampaignEditModal';
import { SchoolRedemptionDetailModal } from './pricing/SchoolRedemptionDetailModal';
import { PricingImpactSimulationModal } from './pricing/PricingImpactSimulationModal';
import type { School, SchoolStat, SpecialOffer, PricingAuditLog } from '../MasterAdminTypes';
import type { StorageTier } from '../hooks/useMasterAdminPricing';

interface PricingTabProps {
  activeCurrency?: 'EUR' | 'CHF';
  setActiveCurrency?: (curr: 'EUR' | 'CHF') => void;
  liveKpiStats?: {
    eurMrr: number;
    chfMrr: number;
    totalProtectedSchools: number;
    totalActiveStudents: number;
    totalPassiveStudents: number;
  };
  priceCampus: number | string;
  setPriceCampus: (val: any) => void;
  priceGroovelab: number | string;
  setPriceGroovelab: (val: any) => void;
  priceKombi: number | string;
  setPriceKombi: (val: any) => void;
  priceTeacher: number | string;
  setPriceTeacher: (val: any) => void;
  priceStudent: number | string;
  setPriceStudent: (val: any) => void;
  pricePassiveStudent: number | string;
  setPricePassiveStudent: (val: any) => void;
  priceStorageAddon: number | string;
  setPriceStorageAddon: (val: any) => void;
  defaultTrialDays: number;
  setDefaultTrialDays: (val: number) => void;
  priceChangeScope: 'all' | 'new_only';
  setPriceChangeScope: (val: 'all' | 'new_only') => void;
  priceEffectiveDate: string;
  setPriceEffectiveDate: (val: string) => void;
  priceChangeReason: string;
  setPriceChangeReason: (val: string) => void;
  storageTiersList: StorageTier[];
  setStorageTiersList: (tiers: StorageTier[]) => void;
  specialOffers: SpecialOffer[];
  setSpecialOffers: (offers: any) => void;
  pricingAuditLogs: PricingAuditLog[];
  pricingSaving: boolean;
  onSavePricing: (newRates: any) => Promise<void>;
  onSaveCampaigns: (campaigns: SpecialOffer[]) => Promise<void>;
  onRollbackPricing?: (logEntry: any) => Promise<void>;
  onOpenLegalNoticeModal: () => void;
  schools: School[];
  schoolStats: Record<string, SchoolStat>;
}

export const PricingTab: React.FC<PricingTabProps> = ({
  activeCurrency = 'EUR',
  setActiveCurrency,
  liveKpiStats,
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
  onSavePricing,
  onSaveCampaigns,
  onRollbackPricing,
  onOpenLegalNoticeModal,
  schools,
  schoolStats
}) => {
  const [localCurrency, setLocalCurrency] = useState<'EUR' | 'CHF'>('EUR');
  const currentCurrency = setActiveCurrency ? activeCurrency : localCurrency;
  const handleCurrencyChange = (curr: 'EUR' | 'CHF') => {
    if (setActiveCurrency) setActiveCurrency(curr);
    else setLocalCurrency(curr);
  };

  const isChf = currentCurrency === 'CHF';
  const currencySymbol = isChf ? 'CHF' : '€';
  const currencyUnit = isChf ? 'CHF/Mo' : '€/Mo';

  // Campaign Form State
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState<number>(10);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferDuration, setNewOfferDuration] = useState<number>(0);
  const [newOfferMaxRedemptions, setNewOfferMaxRedemptions] = useState<number | ''>('');
  const [newOfferType, setNewOfferType] = useState<'promocode' | 'founder' | 'annual' | 'free_quota'>('promocode');
  const [newOfferScope, setNewOfferScope] = useState<'hosting_only' | 'total_invoice'>('hosting_only');
  const [newOfferCurrency, setNewOfferCurrency] = useState<'ALL' | 'EUR' | 'CHF'>('ALL');
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Sub-modal states
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [selectedOfferForSchools, setSelectedOfferForSchools] = useState<any | null>(null);
  const [showPricingImpactModal, setShowPricingImpactModal] = useState(false);
  const [pricingImpactData, setPricingImpactData] = useState<any>(null);

  const handlePreSavePricingCheck = (e: React.FormEvent) => {
    e.preventDefault();
    let currentTotalMrr = 0;
    let projectedTotalMrr = 0;
    const affectedList: { name: string; oldCost: number; newCost: number }[] = [];

    schools.forEach(school => {
      const isSchoolChf = school.country === 'CH' || school.currency === 'CHF';
      // Only count schools matching target currency for simulation delta
      if ((isChf && !isSchoolChf) || (!isChf && isSchoolChf)) return;

      const stats = schoolStats[school.id] || { totalStudents: 0, activeStudents: 0, totalTeachers: 0, totalSongs: 0, hasGroovelab: false, hasCampus: false };
      const teachers = stats.totalTeachers || school.teachers_count || 0;
      const activeStudents = stats.activeStudents || school.active_students_count || 0;
      const passiveStudents = Math.max(0, (stats.totalStudents || 0) - activeStudents);

      const curCampus = school.grandfathered_campus_price ?? (Number(priceCampus) || (isChf ? 25.90 : 19.90));
      const curGroove = school.grandfathered_groovelab_price ?? (Number(priceGroovelab) || (isChf ? 16.80 : 12.90));
      const curKombi = school.grandfathered_kombi_price ?? (Number(priceKombi) || (isChf ? 32.50 : 24.90));
      const curTeacher = school.grandfathered_teacher_price ?? (Number(priceTeacher) || (isChf ? 0.65 : 0.49));
      const curStudent = school.grandfathered_student_price ?? (Number(priceStudent) || (isChf ? 0.65 : 0.49));
      const curPassive = isChf ? 0.15 : 0.09;
      const curStorage = Number(school.storage_addon_monthly_fee || 0);

      let curBase = 0;
      if (school.has_campus_subscription && school.has_groovelab_subscription) curBase = curKombi;
      else if (school.has_campus_subscription) curBase = curCampus;
      else if (school.has_groovelab_subscription) curBase = curGroove;
      const curCost = curBase + (teachers * curTeacher) + (activeStudents * curStudent) + (passiveStudents * curPassive) + curStorage;
      currentTotalMrr += curCost;

      let projCost = curCost;
      if (priceChangeScope === 'all') {
        let projBase = 0;
        const newCamp = Number(priceCampus) || (isChf ? 25.90 : 19.90);
        const newGroove = Number(priceGroovelab) || (isChf ? 16.80 : 12.90);
        const newKombi = Number(priceKombi) || (isChf ? 32.50 : 24.90);
        const newTeach = Number(priceTeacher) || (isChf ? 0.65 : 0.49);
        const newStud = Number(priceStudent) || (isChf ? 0.65 : 0.49);
        const newPass = Number(pricePassiveStudent) || (isChf ? 0.15 : 0.09);

        if (school.has_campus_subscription && school.has_groovelab_subscription) projBase = newKombi;
        else if (school.has_campus_subscription) projBase = newCamp;
        else if (school.has_groovelab_subscription) projBase = newGroove;
        projCost = projBase + (teachers * newTeach) + (activeStudents * newStud) + (passiveStudents * newPass) + curStorage;
      }

      projectedTotalMrr += projCost;
      if (Math.abs(projCost - curCost) > 0.01) {
        affectedList.push({
          name: school.name,
          oldCost: Math.round(curCost * 100) / 100,
          newCost: Math.round(projCost * 100) / 100
        });
      }
    });

    const delta = priceChangeScope === 'new_only' ? 0 : Math.round((projectedTotalMrr - currentTotalMrr) * 100) / 100;
    setPricingImpactData({
      currentMrr: Math.round(currentTotalMrr * 100) / 100,
      projectedMrr: priceChangeScope === 'new_only' ? Math.round(currentTotalMrr * 100) / 100 : Math.round(projectedTotalMrr * 100) / 100,
      deltaMrr: delta,
      affectedSchoolsCount: priceChangeScope === 'new_only' ? 0 : affectedList.length,
      affectedSchools: affectedList
    });

    setShowPricingImpactModal(true);
  };

  const handleConfirmSavePricing = async () => {
    setShowPricingImpactModal(false);
    await onSavePricing({
      campus: Number(priceCampus),
      groovelab: Number(priceGroovelab),
      kombi: Number(priceKombi),
      teacher: Number(priceTeacher),
      student: Number(priceStudent),
      passiveStudent: Number(pricePassiveStudent),
      storageAddon: Number(priceStorageAddon),
      trialDays: defaultTrialDays,
      scope: priceChangeScope,
      currency: currentCurrency,
      effectiveDate: priceEffectiveDate,
      reason: priceChangeReason
    });
  };

  const handleAddSpecialOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferName.trim()) return;

    const newOffer: SpecialOffer = {
      id: `cg_offer_${Date.now()}`,
      name: newOfferName.trim(),
      discount_percent: Number(newOfferDiscount),
      code: newOfferCode.trim().toUpperCase() || `PROMO${newOfferDiscount}`,
      is_active: true,
      currency: newOfferCurrency,
      duration_months: Number(newOfferDuration) || 0,
      max_redemptions: newOfferMaxRedemptions === '' ? 0 : Number(newOfferMaxRedemptions),
      offer_type: newOfferType,
      discount_scope: newOfferScope,
      redeemed_school_ids: [],
      created_at: new Date().toISOString()
    };

    const updated = [...specialOffers, newOffer];
    await onSaveCampaigns(updated);

    setNewOfferName('');
    setNewOfferDiscount(10);
    setNewOfferCode('');
    setNewOfferMaxRedemptions('');
  };

  const handleToggleOfferActive = async (id: string, current: boolean) => {
    const updated = specialOffers.map(o => o.id === id ? { ...o, is_active: !current } : o);
    await onSaveCampaigns(updated);
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Kampagne wirklich endgültig löschen?')) return;
    const updated = specialOffers.filter(o => o.id !== id);
    await onSaveCampaigns(updated);
  };

  const handleSaveEditedOffer = async (updatedOffer: any) => {
    const updated = specialOffers.map(o => o.id === updatedOffer.id ? updatedOffer : o);
    await onSaveCampaigns(updated);
    setEditingOffer(null);
  };

  const handleAssignSchoolToOffer = async (offerId: string, schoolId: string) => {
    const target = specialOffers.find(o => o.id === offerId) as any;
    if (!target) return;
    const redeemed = target.redeemed_school_ids || [];
    if (redeemed.includes(schoolId)) return;
    const updated = specialOffers.map(o => o.id === offerId ? { ...o, redeemed_school_ids: [...redeemed, schoolId] } : o);
    await onSaveCampaigns(updated);
    setSelectedOfferForSchools(updated.find(o => o.id === offerId));
  };

  const handleRemoveSchoolFromOffer = async (offerId: string, schoolId: string) => {
    const target = specialOffers.find(o => o.id === offerId) as any;
    if (!target) return;
    const redeemed = (target.redeemed_school_ids || []).filter((id: string) => id !== schoolId);
    const updated = specialOffers.map(o => o.id === offerId ? { ...o, redeemed_school_ids: redeemed } : o);
    await onSaveCampaigns(updated);
    setSelectedOfferForSchools(updated.find(o => o.id === offerId));
  };

  const handleStorageTierPriceChange = (gb: number, newPrice: number) => {
    const updated = storageTiersList.map(t => t.gb === gb ? { ...t, price: newPrice } : t);
    setStorageTiersList(updated);
  };

  const filteredOffers = specialOffers.filter(o => {
    if (campaignFilter === 'active') return o.is_active && !o.is_archived;
    if (campaignFilter === 'archived') return o.is_archived;
    return !o.is_archived;
  });

  return (
    <div
      role="tabpanel"
      id="master-panel-pricing"
      aria-labelledby="master-tab-pricing"
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
      className="animate-fade-in"
    >
      {/* Header Panel with Currency Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tag size={20} color="#0f172a" />
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
              Preise &amp; Kampagnen
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.90rem', color: '#64748b', fontWeight: 500 }}>
            Katalogpreise für Neuanmeldungen, BGB- &amp; nDSG-konforme Preispolitik und 100% Lifetime-Bestandsschutz.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Dual Currency Switcher */}
          <div
            role="tablist"
            aria-label="Währungsauswahl"
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              gap: '4px'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={currentCurrency === 'EUR'}
              onClick={() => handleCurrencyChange('EUR')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: currentCurrency === 'EUR' ? '#ffffff' : 'transparent',
                color: currentCurrency === 'EUR' ? '#0f172a' : '#64748b',
                fontWeight: currentCurrency === 'EUR' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: currentCurrency === 'EUR' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🇪🇺</span> EUR (€)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={currentCurrency === 'CHF'}
              onClick={() => handleCurrencyChange('CHF')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: currentCurrency === 'CHF' ? '#ffffff' : 'transparent',
                color: currentCurrency === 'CHF' ? '#991b1b' : '#64748b',
                fontWeight: currentCurrency === 'CHF' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: currentCurrency === 'CHF' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🇨🇭</span> CHF (Schweiz)
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenLegalNoticeModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 15px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
          >
            <FileText size={15} color="#475569" /> Vorlage Sonderkündigung (AGB Ziffer 4)
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '100px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '0.80rem',
            fontWeight: 800
          }}>
            <ShieldCheck size={14} color="#16a34a" />
            100% Lifetime-Schutz aktiv
          </div>
        </div>
      </div>

      {/* Live Financial Cockpit KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* KPI 1: EUR MRR */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1.1rem'
          }}>
            €
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Live EUR-MRR (DE/AT)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              {(liveKpiStats?.eurMrr || 0).toFixed(2).replace('.', ',')} € <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>/ Mo</span>
            </div>
          </div>
        </div>

        {/* KPI 2: CHF MRR */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '0.95rem'
          }}>
            CHF
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Live CHF-MRR (Schweiz)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              CHF {(liveKpiStats?.chfMrr || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>/ Mo</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Lifetime Protection Counter */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lifetime-Bestandsschutz
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              {liveKpiStats?.totalProtectedSchools ?? schools.length} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Schulen geschützt</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pupil Base */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#faf5ff',
            color: '#9333ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Schüler-Bereitstellungen
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              {liveKpiStats?.totalActiveStudents || 0} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Aktiv • {liveKpiStats?.totalPassiveStudents || 0} Passiv</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Row Grid: Standardpreise Form & Audit-Logbuch */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.95fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Card 1: Standard-Abonnementpreise Form */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '30px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>{isChf ? '🇨🇭' : '🇪🇺'}</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                Katalogpreise für {isChf ? 'Schweizer Franken (CHF)' : 'Euro-Zone (EUR)'}
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', background: isChf ? '#fee2e2' : '#eff6ff', color: isChf ? '#991b1b' : '#1d4ed8', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>
              Gilt für Neuanmeldungen
            </span>
          </div>

          <form onSubmit={handlePreSavePricingCheck} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. Server Hosting Flatrates */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                1. Server-Hosting Flatrates (pro Musikschule)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.15fr', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.70rem', color: '#16a34a', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Campus Modul
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceCampus}
                      onChange={(e) => setPriceCampus(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#64748b' }}>{currencyUnit}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.70rem', color: '#ca8a04', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    GrooveLab Modul
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceGroovelab}
                      onChange={(e) => setPriceGroovelab(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#64748b' }}>{currencyUnit}</span>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '14px', border: '1.5px solid #16a34a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'block', fontSize: '0.70rem', color: '#15803d', fontWeight: 900, textTransform: 'uppercase' }}>
                      Kombi-Bundle
                    </label>
                    <span style={{ fontSize: '0.62rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                      Vorteil
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceKombi}
                      onChange={(e) => setPriceKombi(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#14532d', fontSize: '1.1rem', fontWeight: 900, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#15803d' }}>{currencyUnit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Profil-Tarife */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                2. Nutzer- &amp; Profil-Tarife
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.35fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Lehrkraft</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceTeacher}
                      onChange={(e) => setPriceTeacher(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{currencySymbol}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.66rem', color: '#16a34a', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Aktiv-Schüler</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceStudent}
                      onChange={(e) => setPriceStudent(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{currencySymbol}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.66rem', color: '#0284c7', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Passiv-Schüler</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricePassiveStudent}
                      onChange={(e) => setPricePassiveStudent(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{currencySymbol}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Pilot-Testphase</label>
                  <select
                    value={defaultTrialDays}
                    onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                    style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.82rem', fontWeight: 800, outline: 'none' }}
                  >
                    <option value={14}>14 Tage</option>
                    <option value={30}>30 Tage (Standard)</option>
                    <option value={60}>60 Tage</option>
                    <option value={90}>90 Tage (Quartal)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Scope & Lifetime Protection Guarantee */}
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '16px', border: '1.5px solid #86efac' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={18} color="#16a34a" />
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  3. Geltungsbereich &amp; 100% Lifetime-Bestandsschutz
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#166534', lineHeight: 1.45 }}>
                <strong>Bestandskunden-Garantie:</strong> Bestehende Sammelzahler-Schulen behalten ihren gebuchten Grundtarif sowie aktive Profile dauerhaft (0,00 {currencySymbol} Mehrkosten). Tarifanpassungen gelten ausschließlich für künftige Neuregistrierungen sowie für Schüler-Neuanmeldungen im neuen Schuljahr. Bei Eltern-Direktabrechnung greift der Treuetarif bei Verlängerung bis 31. Oktober.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: priceChangeScope === 'new_only' ? '#ffffff' : 'transparent',
                  border: `1.5px solid ${priceChangeScope === 'new_only' ? '#10b981' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: '#0f172a'
                }}>
                  <input
                    type="radio"
                    name="price_scope"
                    checked={priceChangeScope === 'new_only'}
                    onChange={() => setPriceChangeScope('new_only')}
                  />
                  <span>🛡️ Nur Neuregistrierungen (Garantie)</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: priceChangeScope === 'all' ? '#ffffff' : 'transparent',
                  border: `1.5px solid ${priceChangeScope === 'all' ? '#d97706' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: '#0f172a'
                }}>
                  <input
                    type="radio"
                    name="price_scope"
                    checked={priceChangeScope === 'all'}
                    onChange={() => setPriceChangeScope('all')}
                  />
                  <span>⚠️ Alle Mandanten (60-Tage Frist)</span>
                </label>
              </div>
            </div>

            {/* 4. Cloud Storage Tiers (Audio & Media) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  4. Cloud-Speicher-Hosting (Audio-Playalongs &amp; Noten)
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                  Preise in {currencySymbol} / Monat
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {storageTiersList.map((tier) => (
                  <div key={tier.gb} style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                      {tier.label}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: '6px' }}>
                      {tier.sublabel || (tier.gb === 0 ? 'Inklusive' : `+${tier.gb} GB`)}
                    </div>
                    {tier.gb === 0 ? (
                      <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#16a34a' }}>
                        {isChf ? 'CHF 0.00' : '0,00 €'}
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <input
                          type="number"
                          step={isChf ? "0.05" : "0.10"}
                          min="0"
                          value={tier.price}
                          onChange={(e) => handleStorageTierPriceChange(tier.gb, Number(e.target.value.replace(',', '.')))}
                          style={{ width: '48px', textAlign: 'center', border: 'none', background: '#ffffff', borderRadius: '6px', padding: '2px 4px', fontSize: '0.82rem', fontWeight: 800, outline: 'none' }}
                        />
                        <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b' }}>{currencySymbol}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={pricingSaving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: pricingSaving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Check size={18} /> {pricingSaving ? 'Wird gespeichert...' : `${currentCurrency}-Tarife prüfen & speichern`}
            </button>
          </form>
        </div>

        {/* Card 2: Revisionssicheres Audit-Logbuch */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '30px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
              📜 Tarifänderungs-Logbuch
            </h3>
            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>
              {pricingAuditLogs.length} Einträge
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {pricingAuditLogs.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                Bisher keine Tarifänderungen protokolliert.
              </div>
            ) : (
              pricingAuditLogs.map((log: any, idx) => {
                const logCurrency = log.currency || (log.new_rates?.currency || 'EUR');
                const logSym = logCurrency === 'CHF' ? 'CHF' : '€';
                return (
                  <div key={log.id || idx} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{logCurrency === 'CHF' ? '🇨🇭' : '🇪🇺'}</span>
                        {log.changed_by_name || log.changed_by || 'Master Admin'}
                      </span>
                      <span style={{ color: '#64748b' }}>{new Date(log.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div style={{ color: '#475569', margin: '4px 0' }}>
                      Campus: {Number(log.new_rates?.campus || log.new_price_campus || 0).toFixed(2)} {logSym} • GrooveLab: {Number(log.new_rates?.groovelab || log.new_price_groovelab || 0).toFixed(2)} {logSym} • Kombi: {Number(log.new_rates?.kombi || log.new_price_kombi || 0).toFixed(2)} {logSym}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 700 }}>
                      🛡️ {log.scope || 'new_only (Lifetime-Bestandsschutz)'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Rabatt-Kampagnen & Sonderangebote */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1.15fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Form: Rabatt-Kampagne erstellen */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '30px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 16px 0', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
            🏷️ Kampagne anlegen
          </h3>

          <form onSubmit={handleAddSpecialOffer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Aktionsname</label>
              <input
                type="text"
                required
                placeholder="z. B. Frühbucher 2026 / Schweiz-Pilot"
                value={newOfferName}
                onChange={(e) => setNewOfferName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Gutschein-Code</label>
                <input
                  type="text"
                  placeholder="z. B. CHPROMO20"
                  value={newOfferCode}
                  onChange={(e) => setNewOfferCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 800, fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Rabatt (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newOfferDiscount}
                  onChange={(e) => setNewOfferDiscount(Number(e.target.value))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Währung</label>
                <select
                  value={newOfferCurrency}
                  onChange={(e) => setNewOfferCurrency(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <option value="ALL">🌐 Alle Währungen</option>
                  <option value="EUR">🇪🇺 Nur Euro (EUR)</option>
                  <option value="CHF">🇨🇭 Nur Franken (CHF)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Geltungsbereich</label>
                <select
                  value={newOfferScope}
                  onChange={(e) => setNewOfferScope(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <option value="hosting_only">🏢 Nur Server-Hosting Flatrates</option>
                  <option value="total_invoice">🌐 Gesamtrechnung (inkl. Schüler)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Kampagnentyp</label>
                <select
                  value={newOfferType}
                  onChange={(e) => setNewOfferType(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <option value="promocode">Gutschein-Code (Standard)</option>
                  <option value="founder">Gründer-Aktion (Dauerhaft)</option>
                  <option value="annual">Jahreszahler-Aktion</option>
                  <option value="free_quota">Freiplatz-Staffel</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Max. Einlösungen</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 = Unbegrenzt"
                  value={newOfferMaxRedemptions}
                  onChange={(e) => setNewOfferMaxRedemptions(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px'
              }}
            >
              <Plus size={16} /> Kampagne jetzt aktivieren
            </button>
          </form>
        </div>

        {/* List: Laufende Aktionen */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '30px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              Aktive Aktionen ({filteredOffers.length})
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', 'active', 'archived'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCampaignFilter(f)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: campaignFilter === f ? '#0f172a' : '#f1f5f9',
                    color: campaignFilter === f ? '#ffffff' : '#64748b',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Archiv'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredOffers.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                Keine Kampagnen gefunden.
              </div>
            ) : (
              filteredOffers.map((offer: any) => (
                <div
                  key={offer.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {offer.name} <span style={{ color: '#16a34a' }}>-{offer.discount_percent}%</span>
                      {offer.currency && offer.currency !== 'ALL' && (
                        <span style={{ fontSize: '0.66rem', background: offer.currency === 'CHF' ? '#fee2e2' : '#eff6ff', color: offer.currency === 'CHF' ? '#991b1b' : '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          {offer.currency}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                      Code: <strong>{offer.code || 'KEIN CODE'}</strong> • {offer.discount_scope === 'total_invoice' ? 'Gesamtrechnung' : 'Hosting-Only'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingOffer(offer)}
                      style={{ padding: '6px', borderRadius: '8px', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#475569' }}
                      title="Bearbeiten"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOfferForSchools(offer)}
                      style={{ padding: '6px 10px', borderRadius: '8px', background: '#e0e7ff', border: 'none', cursor: 'pointer', color: '#4338ca', fontSize: '0.72rem', fontWeight: 800 }}
                    >
                      Mandanten ({(offer.redeemed_school_ids || []).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOffer(offer.id)}
                      style={{ padding: '6px', borderRadius: '8px', background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sub-Modals */}
      <CampaignEditModal
        editingOffer={editingOffer}
        onClose={() => setEditingOffer(null)}
        onSave={handleSaveEditedOffer}
        onChange={setEditingOffer}
      />

      <SchoolRedemptionDetailModal
        selectedOfferForSchools={selectedOfferForSchools}
        schools={schools}
        onClose={() => setSelectedOfferForSchools(null)}
        onAssignSchool={handleAssignSchoolToOffer}
        onRemoveSchool={handleRemoveSchoolFromOffer}
      />

      <PricingImpactSimulationModal
        isOpen={showPricingImpactModal}
        pricingImpactData={pricingImpactData}
        priceChangeScope={priceChangeScope}
        priceEffectiveDate={priceEffectiveDate}
        currency={currentCurrency}
        onClose={() => setShowPricingImpactModal(false)}
        onConfirm={handleConfirmSavePricing}
      />
    </div>
  );
};
