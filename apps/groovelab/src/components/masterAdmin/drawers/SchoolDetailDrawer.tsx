import React, { useState } from 'react';
import { 
  X, Check, RefreshCw, Eye, HardDrive, Building, 
  Sliders, ShieldCheck, Trash2, ArrowLeft, Disc3, Mic, Music, Sparkles, ShieldAlert, BookOpen
} from 'lucide-react';
import { DpoAuditPortal } from '../../DpoAuditPortal';
import { supabase } from '../../../lib/supabase';
import { StorageTier, DEFAULT_STORAGE_TIERS, getStorageTierByGb } from '../../../domain/pricingEngine';

interface SchoolDetailDrawerProps {
  school: any;
  schoolStats: any;
  masterPricing: any;
  onClose: () => void;
  onUpdateSchool: (updatedData: any) => Promise<void>;
  onStartGhostMode: (school: any) => void;
  onDeleteSchool: (school: any) => void;
  onTogglePause?: (school: any) => void;
}

export const SchoolDetailDrawer: React.FC<SchoolDetailDrawerProps> = ({
  school,
  schoolStats,
  masterPricing,
  onClose,
  onUpdateSchool,
  onStartGhostMode,
  onDeleteSchool,
  onTogglePause
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'licenses' | 'quotas' | 'avv'>('overview');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDpoPortal, setShowDpoPortal] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  const handleRevokeAllSessions = async () => {
    if (!window.confirm(`Möchtest du wirklich alle aktiven Anmeldungen (Lehrkräfte, Schüler, Kioske) für "${school?.name || 'diese Schule'}" mit sofortiger Wirkung beenden?`)) {
      return;
    }
    try {
      setRevokingSessions(true);
      const { data, error } = await supabase.rpc('revoke_school_sessions', { p_school_id: school.id });
      if (error) throw error;
      alert(`Erfolg: ${data || 0} aktive Benutzer-Sitzungen der Schule "${school?.name || ''}" wurden mit sofortiger Wirkung beendet.`);
    } catch (err: any) {
      alert('Fehler beim Widerrufen der Sitzungen: ' + err.message);
    } finally {
      setRevokingSessions(false);
    }
  };

  // Form states
  const [name, setName] = useState(school?.name || '');
  const [zipCode, setZipCode] = useState(school?.zip_code || '');
  const [city, setCity] = useState(school?.city || '');
  const [street, setStreet] = useState(school?.street || '');
  const [houseNumber, setHouseNumber] = useState(school?.house_number || '');
  const [billingEmail, setBillingEmail] = useState(school?.billing_email || '');
  const [billingContact, setBillingContact] = useState(school?.billing_contact_person || '');
  const [status, setStatus] = useState(school?.status || 'active');
  const [isTrial, setIsTrial] = useState<boolean>(school?.is_trial ?? false);
  const [trialEndsAt, setTrialEndsAt] = useState<string>(
    school?.trial_ends_at ? new Date(school.trial_ends_at).toISOString().split('T')[0] : ''
  );
  const [hasCampus, setHasCampus] = useState<boolean>(school?.has_campus_subscription ?? true);
  const [hasGroovelab, setHasGroovelab] = useState<boolean>(school?.has_groovelab_subscription ?? true);
  const [subscriptionBypass, setSubscriptionBypass] = useState<boolean>(school?.subscription_bypass ?? false);

  // Audio-Tresor Storage State (Synchronized with Financial Control & SecretaryDashboard)
  const [extraStorageGb, setExtraStorageGb] = useState<number>(() => {
    if (school?.extra_storage_gb !== undefined && school?.extra_storage_gb !== null) return Number(school.extra_storage_gb);
    if (school?.storage_addon_gb !== undefined && school?.storage_addon_gb !== null) return Number(school.storage_addon_gb);
    if (school?.extra_billing_option === 'option1') return 20; // 20 GB (5,49 €) legacy option
    return 0;
  });

  if (!school) return null;

  const teachers = schoolStats?.teachers || 0;
  const totalStudents = schoolStats?.students || 0;
  const campusActive = schoolStats?.studentsCampus || 0;
  const groovelabActive = schoolStats?.studentsGroovelab || 0;
  const activeStudents = Math.max(campusActive, groovelabActive);
  const passiveStudents = Math.max(0, totalStudents - activeStudents);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎙️ CANONICAL AUDIO-TRESOR QUOTA CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════
  const STORAGE_PACKAGES = masterPricing?.storageTiers || DEFAULT_STORAGE_TIERS;

  const baseStorageGb = 1.0;
  const totalStorageGb = baseStorageGb + extraStorageGb;
  const storageUsedBytes = Number(school?.storage_used_bytes || 0);
  const usedStorageGb = storageUsedBytes / (1024 * 1024 * 1024);
  const usedStorageMb = storageUsedBytes / (1024 * 1024);
  const freeStorageGb = Math.max(0, totalStorageGb - usedStorageGb);
  const storagePercentage = Math.min(100, Math.round((usedStorageGb / totalStorageGb) * 100));

  const formattedUsedStorage = (storageUsedBytes > 0 && usedStorageGb < 0.10)
    ? `${usedStorageMb.toFixed(1).replace('.', ',')} MB`
    : `${usedStorageGb.toFixed(2).replace('.', ',')} GB`;
  const formattedStoragePct = storageUsedBytes > 0 && storagePercentage < 1 ? '< 1%' : `${storagePercentage}%`;

  const currentAddonPackage = STORAGE_PACKAGES.find((p: StorageTier) => p.gb === extraStorageGb) || {
    gb: extraStorageGb,
    price: extraStorageGb === 20 ? 5.49 : extraStorageGb === 10 ? 2.99 : extraStorageGb === 5 ? 1.49 : Number((extraStorageGb * 0.25).toFixed(2)),
    label: `+${extraStorageGb} GB`,
    desc: `${(extraStorageGb === 20 ? 5.49 : extraStorageGb === 10 ? 2.99 : extraStorageGb === 5 ? 1.49 : extraStorageGb * 0.25).toFixed(2).replace('.', ',')} € / Mo.`
  };

  // Quick Extend Trial
  const handleExtendTrial = (days: number) => {
    const currentEnd = trialEndsAt ? new Date(trialEndsAt).getTime() : Date.now();
    const newEnd = new Date(Math.max(Date.now(), currentEnd) + days * 24 * 60 * 60 * 1000);
    setTrialEndsAt(newEnd.toISOString().split('T')[0]);
    setIsTrial(true);
  };

  // Submit Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const addonFee = currentAddonPackage.price;
      await onUpdateSchool({
        name,
        zip_code: zipCode,
        city,
        street,
        house_number: houseNumber,
        billing_email: billingEmail,
        billing_contact_person: billingContact,
        status,
        is_trial: isTrial,
        trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        has_campus_subscription: hasCampus,
        has_groovelab_subscription: hasGroovelab,
        subscription_bypass: subscriptionBypass,
        extra_storage_gb: extraStorageGb,
        storage_addon_gb: extraStorageGb,
        storage_addon_monthly_fee: addonFee
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving school details:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open Ghost Session in New Tab
  const handleTriggerGhostTab = async () => {
    if (onStartGhostMode) {
      onStartGhostMode(school);
    } else {
      let targetUserId = '';
      try {
        const { data: adminUser } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', school.id)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();
        if (adminUser?.id) targetUserId = adminUser.id;
      } catch (e) {}

      const userParam = targetUserId ? `&ghost_user_id=${targetUserId}` : '';
      window.open(`${window.location.origin}/?support_ghost=true&school_id=${school.id}&role=admin${userParam}`, '_blank');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      animation: 'appleFullscreenZoomIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes appleFullscreenZoomIn {
          from { opacity: 0; transform: scale(0.985); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🍎 APPLE macOS / iPadOS PRO HEADER TOOLBAR                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header style={{
        height: '72px',
        background: 'rgba(255, 255, 255, 0.90)',
        backdropFilter: 'blur(20px) saturate(190%)',
        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Left: Back Action & School Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: '100px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <ArrowLeft size={15} />
            <span>Zurück zum Register</span>
          </button>

          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

          {/* School Avatar & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}>
              {school.name ? school.name.charAt(0).toUpperCase() : 'M'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {school.name}
                </h2>
                <span style={{
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: isTrial ? '#fef3c7' : status === 'active' ? '#ecfdf5' : '#f1f5f9',
                  color: isTrial ? '#d97706' : status === 'active' ? '#059669' : '#64748b',
                  border: `1px solid ${isTrial ? '#fde68a' : status === 'active' ? '#a7f3d0' : '#cbd5e1'}`
                }}>
                  {isTrial ? 'Testphase' : status === 'active' ? '● Aktiv' : 'Pausiert'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', marginTop: '1px' }}>
                Mandanten-ID: {school.id}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Apple HIG Segmented Track (4 Tabs) */}
        <div style={{
          display: 'inline-flex',
          background: '#f8fafc',
          padding: '4px',
          borderRadius: '14px',
          gap: '2px',
          border: '1px solid #e2e8f0'
        }}>
          {[
            { id: 'overview', label: 'Stammdaten', icon: Building },
            { id: 'licenses', label: 'Module & Tarife', icon: Sliders },
            { id: 'quotas', label: `Audio-Tresor (${totalStorageGb} GB)`, icon: HardDrive },
            { id: 'avv', label: 'DSGVO & AVV', icon: ShieldCheck }
          ].map((tab) => {
            const isSel = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  border: isSel ? '1px solid #a7f3d0' : '1px solid transparent',
                  background: isSel ? '#ffffff' : 'transparent',
                  color: isSel ? '#047857' : '#64748b',
                  fontWeight: isSel ? 850 : 600,
                  fontSize: '0.80rem',
                  fontFamily: '"Outfit", sans-serif',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSel ? '0 2px 8px rgba(5, 150, 105, 0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} color={isSel ? '#047857' : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick-Ghost & Close Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleTriggerGhostTab}
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Schul-Umgebung in neuem Browser-Tab als Ghost öffnen"
          >
            <Eye size={14} />
            <span>Ghost-Modus</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🌟 FULLSCREEN CANVAS WORKSPACE BODY                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 36px 100px 36px',
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>

        {/* 🏢 TAB 1: STAMMDATEN & ANSCHRIFT */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '28px' }} className="animate-fade-in">
            {/* Left Card: School Address Form */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <Building size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Stammdaten &amp; Postanschrift
                </h3>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Name der Musikschule *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.90rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Straße
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Friedrichstraße"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Hausnummer
                  </label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="33"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="79713"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Ort
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bad Säckingen"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Schulleiter / Ansprechpartner
                  </label>
                  <input
                    type="text"
                    value={billingContact}
                    onChange={(e) => setBillingContact(e.target.value)}
                    placeholder="Vorname Nachname"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Rechnungs- / Kontakt-E-Mail
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="leitung@musikschule.de"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Quick Tenant Metrics & Access Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  Mandanten-Überblick &amp; Status
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Lehrkräfte</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{teachers}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Gesamtschüler</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{totalStudents}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Aktivierte Profile</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#065f46' }}>
                      {activeStudents} Schüler aktiv
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.70rem', color: '#059669', fontWeight: 700 }}>Passiv im Register</div>
                    <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#065f46' }}>{passiveStudents} Schüler (0,00 €)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📜 TAB 2: MODULE & TARIFE */}
        {activeTab === 'licenses' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '28px' }} className="animate-fade-in">
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Abonnierte Module &amp; Infrastruktur
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Steuern Sie die Modul-Freischaltung für diese Musikschule.
                </p>
              </div>

              {/* Module Switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: hasCampus ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: hasCampus ? '#ecfdf5' : '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <div>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                      Modul Campus ({(masterPricing?.priceCampus ?? 14.90).toFixed(2).replace('.', ',')} € / Mo.)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      Stundenplan-Designer, Raumplaner, Schüler-Protokoll, Übe-Timer &amp; Loopstation.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasCampus}
                    onChange={(e) => setHasCampus(e.target.checked)}
                    style={{ accentColor: '#059669', width: '20px', height: '20px' }}
                  />
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: hasGroovelab ? '2px solid #eab308' : '1px solid #cbd5e1',
                  background: hasGroovelab ? '#fefce8' : '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <div>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                      Modul GrooveLab ({(masterPricing?.priceGroovelab ?? 9.90).toFixed(2).replace('.', ',')} € / Mo.)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      Band-Verwaltung, Song-Bibliotheken, Repertoire-Planer &amp; Musiker-Avatare.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasGroovelab}
                    onChange={(e) => setHasGroovelab(e.target.checked)}
                    style={{ accentColor: '#eab308', width: '20px', height: '20px' }}
                  />
                </label>
              </div>

              {/* Kombi-Vorteil Badge */}
              {hasCampus && hasGroovelab && (
                <div style={{
                  padding: '12px 18px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #fefce8 100%)',
                  border: '1px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#065f46' }}>
                    Kombi-Vorteilsrabatt aktiv (Infrastruktur-Bündel: 19,90 € statt 24,80 €)
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#059669' }}>-4,90 € / Mo.</span>
                </div>
              )}
            </div>

            {/* Trial & Special Bypass Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Testphase &amp; Sonderkonditionen
              </h4>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={isTrial}
                    onChange={(e) => setIsTrial(e.target.checked)}
                    style={{ accentColor: '#d97706', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                    Kostenlose Testphase aktiv
                  </span>
                </label>

                {isTrial && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: '#fffbeb', borderRadius: '14px', border: '1px solid #fde68a' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', color: '#92400e', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                        Testphase läuft bis
                      </label>
                      <input
                        type="date"
                        value={trialEndsAt}
                        onChange={(e) => setTrialEndsAt(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.84rem'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleExtendTrial(14)}
                        style={{ padding: '4px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #fde68a', fontSize: '0.72rem', fontWeight: 800, color: '#b45309', cursor: 'pointer' }}
                      >
                        +14 Tage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendTrial(30)}
                        style={{ padding: '4px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #fde68a', fontSize: '0.72rem', fontWeight: 800, color: '#b45309', cursor: 'pointer' }}
                      >
                        +30 Tage
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={subscriptionBypass}
                    onChange={(e) => setSubscriptionBypass(e.target.checked)}
                    style={{ accentColor: '#059669', width: '18px', height: '18px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                      VIP / Partner-Bypass (Dauerhaft 0,00 €)
                    </span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                      Befreit diesen Mandanten vollständig von Rechnungen &amp; Gebühren.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 🎙️ TAB 3: QUOTAS & AUDIO-TRESOR (Synchronized with Financial Control) */}
        {activeTab === 'quotas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '28px' }} className="animate-fade-in">
            {/* Left Card: Storage Cockpit & Addon Selector */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <HardDrive size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      Audio-Tresor &amp; Cloud-Speicher Kontingent
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      1 GB Basis-Inklusivvolumen {extraStorageGb > 0 ? `+ ${extraStorageGb} GB gebuchtes Zusatz-Volumen` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {formattedUsedStorage} / {totalStorageGb} GB
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 800 }}>
                    {freeStorageGb.toFixed(2).replace('.', ',')} GB frei ({100 - storagePercentage} %)
                  </span>
                </div>
              </div>

              {/* Dynamic Storage Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.76rem', fontWeight: 700 }}>
                  <span style={{ color: '#64748b' }}>Aktuelle Auslastung</span>
                  <span style={{ color: storagePercentage > 80 ? '#dc2626' : '#059669', fontWeight: 800 }}>{formattedStoragePct} belegt</span>
                </div>
                <div style={{ height: '12px', borderRadius: '100px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{
                    width: `${storagePercentage}%`,
                    height: '100%',
                    background: storagePercentage > 85 ? '#ef4444' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    borderRadius: '100px',
                    transition: 'width 0.4s ease-in-out'
                  }} />
                </div>
              </div>

              {/* Storage Tier Packages Selector */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    Zusatz-Speicherpaket wählen (Hetzner Dedicated Storage)
                  </label>
                  {extraStorageGb > 0 && (
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                      + {extraStorageGb} GB aktiv ({currentAddonPackage.desc})
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {STORAGE_PACKAGES.map((pkg: StorageTier) => {
                    const isSel = extraStorageGb === pkg.gb;
                    return (
                      <button
                        key={pkg.gb}
                        type="button"
                        onClick={() => setExtraStorageGb(pkg.gb)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '14px',
                          border: isSel ? '2px solid #059669' : '1px solid #e2e8f0',
                          background: isSel ? '#ecfdf5' : '#f8fafc',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: isSel ? '0 4px 12px rgba(5, 150, 105, 0.12)' : 'none'
                        }}
                        className="hover-scale-mini"
                      >
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: isSel ? '#047857' : '#0f172a' }}>
                          {pkg.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isSel ? '#059669' : '#64748b', marginTop: '2px', fontWeight: 600 }}>
                          {pkg.sublabel}
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 850, color: isSel ? '#047857' : '#334155', marginTop: '6px' }}>
                          {pkg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Card: Storage Breakdown & Retention Policies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    Audio-Tresor Speicherverteilung (Campus-Modul)
                  </h4>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#166534' }}>
                    100% Campus-Exklusiv
                  </span>
                </div>

                {/* Apple-Style Stacked Segmented Bar */}
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px', background: '#f1f5f9' }}>
                  <div style={{ width: '48%', background: '#10b981', transition: 'width 0.3s ease' }} title="Audio-Biografie (48%)" />
                  <div style={{ width: '32%', background: '#3b82f6', transition: 'width 0.3s ease' }} title="Loopstation (32%)" />
                  <div style={{ width: '14%', background: '#f59e0b', transition: 'width 0.3s ease' }} title="Hausaufgaben (14%)" />
                  <div style={{ width: '6%', background: '#8b5cf6', transition: 'width 0.3s ease' }} title="Meisterwerke (6%)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* 1. Platz: Audio-Biografie & Schüler-Protokoll (48%) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      <BookOpen size={16} color="#059669" />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#1e293b' }}>Audio-Biografie &amp; Schüler-Protokoll</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>Wöchentliches Unterrichts- &amp; Meilenstein-Archiv</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                      {usedStorageGb < 1.0 
                        ? `${(usedStorageGb * 1024 * 0.48).toFixed(1).replace('.', ',')} MB (48 %)` 
                        : `${(usedStorageGb * 0.48).toFixed(2).replace('.', ',')} GB (48 %)`}
                    </span>
                  </div>

                  {/* 2. Platz: Loopstation & Übe-Studio (32%) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                      <Disc3 size={16} color="#2563eb" />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#1e293b' }}>Loopstation &amp; Übe-Studio Aufnahmen</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>Mehrspurige Loops &amp; selbstständige Übe-Sessions</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                      {usedStorageGb < 1.0 
                        ? `${(usedStorageGb * 1024 * 0.32).toFixed(1).replace('.', ',')} MB (32 %)` 
                        : `${(usedStorageGb * 0.32).toFixed(2).replace('.', ',')} GB (32 %)`}
                    </span>
                  </div>

                  {/* 3. Platz: Hausaufgaben- & Unterrichtsaufnahmen (14%) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      <Mic size={16} color="#d97706" />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#1e293b' }}>Hausaufgaben- &amp; Unterrichtsaufnahmen</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>Sprachmemos der Lehrkräfte &amp; Übe-Vorgaben</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                      {usedStorageGb < 1.0 
                        ? `${(usedStorageGb * 1024 * 0.14).toFixed(1).replace('.', ',')} MB (14 %)` 
                        : `${(usedStorageGb * 0.14).toFixed(2).replace('.', ',')} GB (14 %)`}
                    </span>
                  </div>

                  {/* 4. Platz: Meisterwerk-Dokumentation (6%) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                      <Sparkles size={16} color="#7c3aed" />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#1e293b' }}>Meisterwerk-Dokumentation (Master-Audios)</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>Kuratiertes Jahresvorspiel-Portfolio &amp; Master-Tracks</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                      {usedStorageGb < 1.0 
                        ? `${(usedStorageGb * 1024 * 0.06).toFixed(1).replace('.', ',')} MB (6 %)` 
                        : `${(usedStorageGb * 0.06).toFixed(2).replace('.', ',')} GB (6 %)`}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '8px', padding: '12px 14px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.74rem', color: '#065f46', lineHeight: '1.5' }}>
                  <strong>DSGVO Art. 17 Physische Löschung:</strong> Alle gelöschten Audio-Einträge werden sofort physisch aus dem Hetzner-Tresor entfernt. Inaktive Demo-Files unterliegen einer 90-Tage-Retention.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DSGVO & AVV */}
        {activeTab === 'avv' && (
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Auftragsverarbeitungs-Vertrag (AVV nach Art. 28 DSGVO)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Rechtssicherer digitaler Abschluss für Schul- und Schülerdaten.
                </p>
              </div>

              <div style={{
                padding: '6px 14px',
                borderRadius: '100px',
                background: school?.avv_signed_at ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${school?.avv_signed_at ? '#a7f3d0' : '#fde68a'}`,
                color: school?.avv_signed_at ? '#059669' : '#b45309',
                fontSize: '0.76rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={14} />
                <span>{school?.avv_signed_at ? 'Rechtsgültig digital gezeichnet' : 'Ausstehend'}</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', fontSize: '0.84rem', color: '#475569', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Vertragspartner:</strong> {school.name}, {street || school.street} {houseNumber || school.house_number}, {zipCode || school.zip_code} {city || school.city}</div>
              <div><strong>Auftragnehmer:</strong> Campus-Groovelab Cloud Solutions GmbH</div>
              <div><strong>Geltungsbereich:</strong> Hosting, Bereitstellung von Schüler-Protokollen, Terminen, Loopstation &amp; Band-Portalen nach EU-DSGVO.</div>
              {school?.avv_signed_at && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', color: '#0f172a' }}>
                  <strong>Digital gezeichnet am:</strong> {new Date(school.avv_signed_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} MESZ<br />
                  <strong>Unterzeichner:</strong> {school.avv_signee_name || 'Schulleitung / Vertretungsberechtigt'}
                </div>
              )}
            </div>

            {/* DSB & Audit Portal Launcher Button */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div>
                <span style={{ background: '#e6f4ea', color: '#047857', padding: '3px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 900 }}>
                  ART. 38 ABS. 2 DSGVO • MASTER-ADMIN AUDIT
                </span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                  DSB- &amp; Audit-Portal (Behörden- und Trägercockpit)
                </h4>
                <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.5 }}>
                  Öffne das vollständige Audit-Cockpit für diese Schule: WORM-Fahrtenbuch (SHA-256 Hashes), Art. 32 TOM-Nachweise, Art. 15 Datenauskunft und AVV-PDF.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDpoPortal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px 20px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.18)';
                }}
              >
                <ShieldCheck size={18} color="#34a853" />
                <span>DSB- &amp; Audit-Portal für diese Schule öffnen</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🍎 APPLE FOOTER BAR                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        height: '68px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(190%)',
        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        borderTop: '1px solid rgba(15, 23, 42, 0.08)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Left: Destructive / Security Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleRevokeAllSessions}
            disabled={revokingSessions}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Beendet sofort alle aktiven Logins und Kiosk-Verbindungen dieser Schule"
          >
            {revokingSessions ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
            <span>{revokingSessions ? 'Beende Sitzungen...' : 'Notfall-Logout (Alle Sitzungen widerrufen)'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteSchool(school)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <Trash2 size={14} />
            <span>Musikschule löschen</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 24px',
              borderRadius: '12px',
              background: saveSuccess ? '#059669' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : null}
            <span>{saving ? 'Speichert...' : saveSuccess ? 'Gespeichert!' : 'Änderungen speichern'}</span>
          </button>
        </div>
      </footer>

      {/* 🛡️ FULLSCREEN OVERLAY: DSB- & AUDIT-PORTAL FÜR DEN BETREIBER */}
      {showDpoPortal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: '#ffffff',
          overflowY: 'auto'
        }}>
          <DpoAuditPortal
            onClose={() => setShowDpoPortal(false)}
            schoolName={name || school?.name || 'Stadtmusikschule'}
            schoolAddress={`${street || school?.street || ''} ${houseNumber || school?.house_number || ''}, ${zipCode || school?.zip_code || ''} ${city || school?.city || ''}`.trim()}
            schoolSigneeName={school?.avv_signee_name}
            school={school}
          />
        </div>
      )}
    </div>
  );
};
