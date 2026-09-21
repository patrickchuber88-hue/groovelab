import React, { useState } from 'react';
import { 
  Tag, Percent, Plus, Copy, Check, Trash2, Edit2, RotateCcw, 
  ArrowRight, ShieldCheck, Building2, Rocket, Calendar, GraduationCap, Download, FileText
} from 'lucide-react';
import { CampaignEditModal } from './pricing/CampaignEditModal';
import { SchoolRedemptionDetailModal } from './pricing/SchoolRedemptionDetailModal';
import { PricingImpactSimulationModal } from './pricing/PricingImpactSimulationModal';
import type { School, SchoolStat, SpecialOffer, PricingAuditLog } from '../MasterAdminTypes';
import type { StorageTier } from '../hooks/useMasterAdminPricing';

interface PricingTabProps {
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
  // Campaign Form State
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState<number>(10);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferDuration, setNewOfferDuration] = useState<number>(0);
  const [newOfferMaxRedemptions, setNewOfferMaxRedemptions] = useState<number | ''>('');
  const [newOfferType, setNewOfferType] = useState<'promocode' | 'founder' | 'annual' | 'free_quota'>('promocode');
  const [newOfferScope, setNewOfferScope] = useState<'hosting_only' | 'total_invoice'>('hosting_only');
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
      const stats = schoolStats[school.id] || { totalStudents: 0, activeStudents: 0, totalTeachers: 0, totalSongs: 0, hasGroovelab: false, hasCampus: false };
      const teachers = stats.totalTeachers || 0;
      const activeStudents = stats.activeStudents || 0;
      const passiveStudents = Math.max(0, (stats.totalStudents || 0) - activeStudents);

      const curCampus = school.grandfathered_campus_price ?? (Number(priceCampus) || 14.90);
      const curGroove = school.grandfathered_groovelab_price ?? (Number(priceGroovelab) || 9.90);
      const curKombi = school.grandfathered_kombi_price ?? (Number(priceKombi) || 19.90);
      const curTeacher = school.grandfathered_teacher_price ?? (Number(priceTeacher) || 0.49);
      const curStudent = school.grandfathered_student_price ?? (Number(priceStudent) || 0.49);
      const curPassive = 0.09;
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
        const newCamp = Number(priceCampus) || 14.90;
        const newGroove = Number(priceGroovelab) || 9.90;
        const newKombi = Number(priceKombi) || 19.90;
        const newTeach = Number(priceTeacher) || 0.49;
        const newStud = Number(priceStudent) || 0.49;
        const newPass = Number(pricePassiveStudent) || 0.09;

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

    const delta = Math.round((projectedTotalMrr - currentTotalMrr) * 100) / 100;
    setPricingImpactData({
      currentMrr: Math.round(currentTotalMrr * 100) / 100,
      projectedMrr: Math.round(projectedTotalMrr * 100) / 100,
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
      duration_months: Number(newOfferDuration) || 0,
      max_redemptions: newOfferMaxRedemptions === '' ? 0 : Number(newOfferMaxRedemptions),
      offer_type: newOfferType,
      discount_scope: newOfferScope,
      redeemed_school_ids: [],
      created_at: new Date().toISOString()
    } as any;

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

  const handleArchiveOffer = async (id: string) => {
    const updated = specialOffers.map(o => o.id === id ? { ...o, is_archived: true, archived_at: new Date().toISOString() } : o);
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

  return (
    <div
      role="tabpanel"
      id="master-panel-pricing"
      aria-labelledby="master-tab-pricing"
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
      className="animate-fade-in"
    >
      {/* Header Panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
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
            Standard-Abonnementpreise, BGB-konforme Preisanpassungs-Politik und Sonderaktionen für Musikschulen.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onOpenLegalNoticeModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
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
            <FileText size={15} color="#475569" /> Klausel-Vorlage Sonderkündigung
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '0.80rem',
            fontWeight: 700
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 8px rgba(22, 163, 74, 0.6)' }} />
            Master-Pricing Live
          </div>
        </div>
      </div>

      {/* Top Row Grid: Standardpreise & Audit-Logbuch */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Card 1: Standard-Abonnementpreise Form */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <form onSubmit={handlePreSavePricingCheck} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. Server Hosting Flatrates */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                1. Server-Hosting Flatrates (pro Musikschule)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: '12px' }}>
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
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>€/Mo</span>
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
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>€/Mo</span>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '14px', border: '1.5px solid #16a34a' }}>
                  <label style={{ display: 'block', fontSize: '0.70rem', color: '#15803d', fontWeight: 900, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Kombi-Bundle
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceKombi}
                      onChange={(e) => setPriceKombi(e.target.value.replace(',', '.'))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#14532d', fontSize: '1.1rem', fontWeight: 900, outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d' }}>€/Mo</span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>€</span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>€</span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>€</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Pilot-Testphase</label>
                  <select
                    value={defaultTrialDays}
                    onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                    style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, outline: 'none' }}
                  >
                    <option value={14}>14 Tage</option>
                    <option value={30}>30 Tage (Standard)</option>
                    <option value={60}>60 Tage</option>
                    <option value={90}>90 Tage (Quartal)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scope / Bestandsschutz Selector */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                3. Geltungsbereich &amp; Bestandsschutz
              </label>
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
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}>
                  <input
                    type="radio"
                    name="price_scope"
                    checked={priceChangeScope === 'new_only'}
                    onChange={() => setPriceChangeScope('new_only')}
                  />
                  <span>🛡️ Nur Neuregistrierungen</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: priceChangeScope === 'all' ? '#ffffff' : 'transparent',
                  border: `1.5px solid ${priceChangeScope === 'all' ? '#10b981' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}>
                  <input
                    type="radio"
                    name="price_scope"
                    checked={priceChangeScope === 'all'}
                    onChange={() => setPriceChangeScope('all')}
                  />
                  <span>🌐 Alle Mandanten</span>
                </label>
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
              <Check size={18} /> {pricingSaving ? 'Wird gespeichert...' : 'Tarife prüfen & speichern'}
            </button>
          </form>
        </div>

        {/* Card 2: Revisionssicheres Audit-Logbuch */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
              📜 Tarifänderungs-Logbuch
            </h3>
            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>
              {pricingAuditLogs.length} Einträge
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {pricingAuditLogs.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                Bisher keine Tarifänderungen protokolliert.
              </div>
            ) : (
              pricingAuditLogs.map((log: any, idx) => (
                <div key={log.id || idx} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{log.changed_by_name || log.changed_by || 'Master Admin'}</span>
                    <span style={{ color: '#64748b' }}>{new Date(log.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div style={{ color: '#475569' }}>
                    Campus: {Number(log.new_rates?.campus || log.new_price_campus || 0).toFixed(2)} € • GrooveLab: {Number(log.new_rates?.groovelab || log.new_price_groovelab || 0).toFixed(2)} € • Kombi: {Number(log.new_rates?.kombi || log.new_price_kombi || 0).toFixed(2)} €
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Rabatt-Kampagnen & Sonderangebote */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.1fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Form: Rabatt-Kampagne erstellen */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 16px 0', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
            🏷️ Kampagne anlegen
          </h3>

          <form onSubmit={handleAddSpecialOffer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Aktionsname</label>
              <input
                type="text"
                required
                placeholder="z. B. Frühbucher 2026"
                value={newOfferName}
                onChange={(e) => setNewOfferName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Gutschein-Code</label>
                <input
                  type="text"
                  placeholder="z. B. SAVE10"
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
                marginTop: '6px'
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
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 16px 0', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
            Aktive Rabatt-Aktionen ({specialOffers.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
            {specialOffers.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                Keine Kampagnen aktiv.
              </div>
            ) : (
              specialOffers.map((offer: any) => (
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
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                      {offer.name} <span style={{ color: '#16a34a', marginLeft: '6px' }}>-{offer.discount_percent}%</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                      Code: {offer.code || 'KEIN CODE'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      Mandanten
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
        onClose={() => setShowPricingImpactModal(false)}
        onConfirm={handleConfirmSavePricing}
      />
    </div>
  );
};
