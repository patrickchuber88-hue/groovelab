import React from 'react';
import { Activity, Search, RefreshCw, AlertTriangle, CheckCircle, Cpu, Users, Layers, ShieldCheck, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { School, SchoolStat, PendingUser } from '../MasterAdminTypes';
import { MasterPricingRates } from '../../../domain/pricingEngine';

interface ExecutiveTabProps {
  schools: School[];
  schoolStats: Record<string, SchoolStat>;
  loading: boolean;
  serverMetrics: any[];
  pendingUsers: PendingUser[];
  masterPricing: MasterPricingRates;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
  onNavigateTab: (tab: 'executive' | 'schools' | 'briefing' | 'billing' | 'telemetry' | 'pricing') => void;
  onSelectSchool: (school: School) => void;
}

export const ExecutiveTab: React.FC<ExecutiveTabProps> = ({
  schools,
  schoolStats,
  loading,
  serverMetrics,
  pendingUsers,
  masterPricing,
  onRefresh,
  onOpenCommandPalette,
  onNavigateTab,
  onSelectSchool
}) => {
  const validSchools = schools.filter(s => !s.name?.toLowerCase().includes('groove academy'));

  // B2B MRR: Only active, non-trial, NON-BYPASS schools generate B2B software license fees
  const b2bMrr = validSchools.reduce((acc, s) => {
    const isBypass = s.subscription_bypass;
    const isTrial = s.is_trial || s.status === 'trial';
    const isPaused = s.is_paused || s.status === 'suspended';

    if (isBypass || isTrial || isPaused) return acc;

    const priceCampus = s.custom_price_campus ?? s.grandfathered_campus_price ?? masterPricing.priceCampus;
    const priceGroovelab = s.custom_price_groovelab ?? s.grandfathered_groovelab_price ?? masterPricing.priceGroovelab;
    const priceKombi = s.custom_price_kombi ?? s.grandfathered_kombi_price ?? masterPricing.priceKombi;
    const priceTeacher = s.custom_price_teacher ?? s.grandfathered_teacher_price ?? masterPricing.priceTeacher;
    const priceStudent = s.custom_price_student ?? s.grandfathered_student_price ?? masterPricing.priceStudent;

    let baseFlat = 0;
    if (s.has_campus_subscription && s.has_groovelab_subscription) baseFlat = priceKombi;
    else if (s.has_campus_subscription) baseFlat = priceCampus;
    else if (s.has_groovelab_subscription) baseFlat = priceGroovelab;

    const stats: any = schoolStats[s.id] || {};
    const teachers = stats.teachers ?? stats.totalTeachers ?? s.teachers_count ?? 0;
    const students = stats.activeStudents ?? stats.students ?? s.active_students_count ?? 0;

    const teacherFee = teachers * priceTeacher;
    const studentFee = students * priceStudent;

    return acc + baseFlat + teacherFee + studentFee;
  }, 0);

  // B2C MRR: Only active paid self-payers in non-bypassed schools generate B2C student revenue
  const b2cMrr = pendingUsers.reduce((acc, u) => {
    const school = validSchools.find(s => s.id === u.school_id);
    if (!school) return acc;
    const isBypass = school.subscription_bypass;
    const isTrial = school.is_trial || school.status === 'trial';
    if (isBypass || isTrial) return acc;

    if ((u as any).student_billing_payment_method && (u as any).student_billing_cash_paid && !(u as any).exempt_from_direct_billing) {
      return acc + Number(masterPricing.priceStudent);
    }
    return acc;
  }, 0);

  const totalMrr = b2bMrr + b2cMrr;
  const totalArr = totalMrr * 12;
  const bypassedSchools = validSchools.filter(s => s.subscription_bypass);
  const bypassedCount = bypassedSchools.length;
  const currentYear = new Date().getFullYear();

  const latestMetric = serverMetrics[0] || { cpu_load: 0.12, mem_used_mb: 1420, mem_total_mb: 4096, active_connections: 4 };
  const cpuPercent = Math.round((latestMetric.cpu_load || 0) * 100);
  const ramPercent = Math.round(((latestMetric.mem_used_mb || 0) / (latestMetric.mem_total_mb || 4096)) * 100);
  const isHighLoad = cpuPercent > 80 || ramPercent > 85 || (latestMetric.active_connections || 0) > 35;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
            Master Cockpit
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#64748b', fontWeight: 550 }}>
            Echtzeit-Finanzkennzahlen, Server-Leistung und Plattform-Status auf einen Blick.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onOpenCommandPalette}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
            }}
          >
            <Search size={14} /> ⌘K Schnellzugriff
          </button>

          <button
            onClick={onRefresh}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              color: '#475569',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>

          <button
            onClick={() => onNavigateTab('telemetry')}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: isHighLoad ? '#fee2e2' : '#e6f4ea',
              border: isHighLoad ? '1px solid #fca5a5' : '1px solid #a7f3d0',
              color: isHighLoad ? '#991b1b' : '#065f46',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="Klicken für detaillierte Server-Telemetrie & Diagnose"
          >
            {isHighLoad ? <AlertTriangle size={14} color="#dc2626" /> : <CheckCircle size={14} color="#047857" />}
            <span>{isHighLoad ? `Server Warnung (${cpuPercent}% CPU)` : `System OK (${cpuPercent}% CPU)`}</span>
          </button>
        </div>
      </div>

      {/* Pending Storage Addon Activations Alert Banner */}
      {(() => {
        const pendingStorageSchools = validSchools.filter((s: any) => s.storage_addon_status === 'pending_activation' || (s.storage_addon_pending_gb && s.storage_addon_pending_gb > 0));
        if (pendingStorageSchools.length === 0) return null;
        return (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px' }}>📦</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#78350f', letterSpacing: '-0.02em' }}>
                    {pendingStorageSchools.length} Ausstehende Speicher-Aktivierung{pendingStorageSchools.length > 1 ? 'en' : ''} (Hetzner Server)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                    Schulen haben Zusatz-Speicher für den Audio-Tresor angefordert. Bitte auf Hetzner freischalten &amp; bestätigen.
                  </p>
                </div>
              </div>
              <span style={{
                background: '#78350f',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                Manuelle Freischaltung erforderlich
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {pendingStorageSchools.map((school: any) => {
                const requestedGb = school.storage_addon_pending_gb || 10;
                const monthlyPrice = requestedGb === 5 ? 1.49 : requestedGb === 10 ? 2.99 : requestedGb === 20 ? 5.49 : 9.99;
                return (
                  <div key={school.id} style={{
                    background: '#ffffff',
                    border: '1px solid rgba(217, 119, 6, 0.2)',
                    borderRadius: '14px',
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>{school.name}</strong>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                        Angefordert: <strong style={{ color: '#d97706', fontWeight: 800 }}>+{requestedGb} GB Tresor-Speicher</strong> ({monthlyPrice.toFixed(2).replace('.', ',')} € / Mo.)
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const newTotalGb = Number(school.storage_addon_gb || 0) + requestedGb;
                            const { error } = await (supabase as any)
                              .from('schools')
                              .update({
                                storage_addon_gb: newTotalGb,
                                storage_addon_monthly_fee: monthlyPrice,
                                storage_addon_pending_gb: 0,
                                storage_addon_status: 'active'
                              })
                              .eq('id', school.id);
                            if (error) throw error;
                            alert(`✅ Speicher (+${requestedGb} GB) für ${school.name} erfolgreich freigeschaltet!`);
                            onRefresh();
                          } catch (err: any) {
                            alert(`Fehler beim Freischalten: ${err.message}`);
                          }
                        }}
                        style={{
                          background: '#34a853',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(52, 168, 83, 0.25)'
                        }}
                      >
                        🚀 Auf Hetzner bereitgestellt &amp; Freischalten
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Möchtest du die Anforderung über +${requestedGb} GB für ${school.name} wirklich stornieren?`)) return;
                          try {
                            const { error } = await (supabase as any)
                              .from('schools')
                              .update({
                                storage_addon_pending_gb: 0,
                                storage_addon_status: 'cancelled'
                              })
                              .eq('id', school.id);
                            if (error) throw error;
                            alert(`Anforderung für ${school.name} wurde storniert.`);
                            onRefresh();
                          } catch (err: any) {
                            alert(`Fehler beim Stornieren: ${err.message}`);
                          }
                        }}
                        style={{
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Ablehnen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Revenue Financial Counters (MRR / ARR / Abo-Bypass Card) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {/* MRR Card */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '20px',
          padding: '20px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9 }}>
            Monatlicher Umsatz (MRR)
          </span>
          <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '6px 0 0 0', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
            {totalMrr.toFixed(2)} €
          </h3>
          <span style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: '4px', display: 'block', fontWeight: 600 }}>
            B2B: {b2bMrr.toFixed(2)} € • B2C: {b2cMrr.toFixed(2)} €
          </span>
        </div>

        {/* ARR Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Jährliche Run-Rate (ARR)
          </span>
          <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '6px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
            {totalArr.toFixed(2)} €
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'block' }}>
            Dynamischer MRR × 12 Faktor
          </span>
        </div>

        {/* Bypassed Free Partner Schools Scorecard */}
        <div style={{
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e9d5ff',
          boxShadow: '0 10px 30px rgba(126, 34, 206, 0.04)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7e22ce', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Abo-Bypass (Freigestellt)
          </span>
          <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '6px 0 0 0', color: '#6b21a8', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
            {bypassedCount} <span style={{ fontSize: '0.9rem', color: '#7e22ce', fontWeight: 700 }}>Schulen</span>
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#7e22ce', fontWeight: 700, marginTop: '4px', display: 'block' }}>
            0,00 € Sponsoring / Partner
          </span>
        </div>

        {/* Total Active Schools */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Aktive Musikschulen
          </span>
          <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '6px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
            {validSchools.length}
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '4px', display: 'block' }}>
            {validSchools.length - bypassedCount} zahlend • {bypassedCount} Bypass
          </span>
        </div>

        {/* Pending Activations */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Offene Freischaltungen
          </span>
          <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '6px 0 0 0', color: pendingUsers.length > 0 ? '#ef4444' : '#10b981', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
            {pendingUsers.length}
          </h3>
          <button
            onClick={() => onNavigateTab('briefing')}
            style={{ fontSize: '0.72rem', color: '#0284c7', background: 'transparent', border: 'none', padding: 0, fontWeight: 800, cursor: 'pointer', marginTop: '4px', textDecoration: 'underline' }}
          >
            Prüfen →
          </button>
        </div>
      </div>

      {/* Hardware & Shortcuts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={18} color="#4f46e5" /> Server Telemetrie Übersicht
            </h3>
            <button
              onClick={() => onNavigateTab('telemetry')}
              style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 800, background: 'rgba(79, 70, 229, 0.08)', border: 'none', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer' }}
            >
              Deep Telemetrie Board →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CPU Auslastung</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{cpuPercent}%</div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${cpuPercent}%`, height: '100%', background: cpuPercent > 80 ? '#ef4444' : '#10b981' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>RAM Speicher</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{ramPercent}%</div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${ramPercent}%`, height: '100%', background: ramPercent > 85 ? '#ef4444' : '#0284c7' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Verbindungen</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{latestMetric.active_connections || 4}</div>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Pool Stabil</span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#059669" /> Schnellauswahl
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => onNavigateTab('schools')}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🏢 Schulen-Verwaltung öffnen</span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('pricing')}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🏷️ Preismatrix & Bestandsschutz</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
