import React, { useState, useMemo } from 'react';
import { 
  Building2, Search, Plus, RefreshCw, Eye, QrCode, Lock, Key, 
  Trash2, Download, Check, Copy, ExternalLink, ShieldCheck, 
  AlertTriangle, Clock, Sliders, Smartphone, CheckCircle, Info, Zap,
  MapPin, Mail, Sparkles, Filter, ChevronDown, CheckCircle2,
  Calendar, Award, UserCheck, Power, ShieldAlert, Users, HardDrive,
  Activity, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { calculateCampusGroovelabBilling } from '../../../domain/billingCalculator';

import type { School } from '../MasterAdminTypes';

interface SchoolsTabProps {
  schools: School[];
  schoolStats: Record<string, any>;
  loading: boolean;
  masterPricing: any;
  onRefresh: () => void;
  onSelectSchool: (school: School) => void;
  onStartGhostMode: (school: School) => void;
  onDeleteSchool: (school: School) => void;
  onToggleSchoolStatus: (school: School, newStatus: string) => Promise<void>;
  onProvisionSchool: (data: any) => Promise<any>;
}

export const SchoolsTab: React.FC<SchoolsTabProps> = ({
  schools,
  schoolStats,
  loading,
  masterPricing,
  onRefresh,
  onSelectSchool,
  onStartGhostMode,
  onDeleteSchool,
  onToggleSchoolStatus,
  onProvisionSchool
}) => {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'kombi' | 'campus' | 'groovelab'>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'trial' | 'pending' | 'archived'>('all');
  const [sortOption, setSortOption] = useState<'students' | 'name' | 'newest' | 'mrr'>('students');

  // Provisioning form states
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolZip, setNewSchoolZip] = useState('');
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolModule, setNewSchoolModule] = useState<'kombi' | 'campus' | 'groovelab'>('kombi');
  const [newSchoolTrialMode, setNewSchoolTrialMode] = useState<'trial_30' | 'trial_14' | 'trial_60' | 'bypass' | 'paid'>('trial_30');
  const [provisioning, setProvisioning] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Magic Invite Modal State
  const [magicInviteData, setMagicInviteData] = useState<{
    schoolName: string;
    loginUrl: string;
    email: string;
  } | null>(null);

  // Active MRR Tooltip
  const [activeMrrTooltipSchoolId, setActiveMrrTooltipSchoolId] = useState<string | null>(null);

  // Filter out unwanted test schools (e.g. Groove Academy) 100% across the board
  const sanitizedSchools = useMemo(() => {
    return (schools || []).filter(s => {
      const name = (s.name || '').toLowerCase();
      return !name.includes('groove academy');
    });
  }, [schools]);

  // Aggregate Metrics for Header Scorecards
  const totalPayingSchools = sanitizedSchools.filter(s => s.status === 'active' && !s.is_trial && !s.subscription_bypass && !s.is_paused).length;
  const totalTrialSchools = sanitizedSchools.filter(s => s.is_trial && s.is_approved !== false).length;
  const totalBypassedSchools = sanitizedSchools.filter(s => s.subscription_bypass).length;
  const totalPendingSchools = sanitizedSchools.filter(s => s.is_approved === false || s.status === 'pending').length;

  let totalCombinedMrr = 0;
  let totalActiveStudentsCount = 0;
  let totalPassiveStudentsCount = 0;

  sanitizedSchools.forEach(s => {
    const stats = schoolStats[s.id] || {};
    const teachers = stats.teachers || 0;
    const totalStudents = stats.students || 0;
    const campusActive = stats.studentsCampus || 0;
    const groovelabActive = stats.studentsGroovelab || 0;
    const activeStudents = Math.max(campusActive, groovelabActive);
    const passiveStudents = Math.max(0, totalStudents - activeStudents);

    totalActiveStudentsCount += activeStudents;
    totalPassiveStudentsCount += passiveStudents;

    if (!s.is_trial && !s.subscription_bypass && !s.is_paused && s.status === 'active') {
      const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(s) : {
        priceCampus: s.custom_price_campus ?? masterPricing?.priceCampus ?? 7.99,
        priceGroovelab: s.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 4.99,
        priceKombi: s.custom_price_kombi ?? masterPricing?.priceKombi ?? 9.99,
        priceTeacher: s.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
        priceStudent: s.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
        pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
      };

      const billing = calculateCampusGroovelabBilling({
        hasCampusModule: !!s.has_campus_subscription,
        hasGroovelabModule: !!s.has_groovelab_subscription,
        activeTeacherCount: teachers,
        activeStudentCount: activeStudents,
        campusStudentCount: campusActive,
        groovelabStudentCount: groovelabActive,
        passiveStudentCount: passiveStudents,
        rates: {
          priceCampus: rates.priceCampus,
          priceGroovelab: rates.priceGroovelab,
          priceKombi: rates.priceKombi,
          priceTeacher: rates.priceTeacher,
          priceStudent: rates.priceStudent,
          pricePassiveStudent: rates.pricePassiveStudent
        }
      });
      totalCombinedMrr += billing.totalMonthlySchoolInvoice;
    }
  });

  // Filter and Sort Logic
  const filteredSchools = useMemo(() => {
    return sanitizedSchools.filter(s => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        const matchesZip = (s.zip_code || '').toLowerCase().includes(q);
        const matchesEmail = (s.billing_email || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesZip && !matchesEmail) return false;
      }

      // 2. Status Tab Filter
      if (statusTab === 'active') {
        if (s.status !== 'active' || s.is_trial || s.is_approved === false || s.is_paused) return false;
      } else if (statusTab === 'trial') {
        if (!s.is_trial || s.is_approved === false) return false;
      } else if (statusTab === 'pending') {
        if (s.is_approved !== false && s.status !== 'pending') return false;
      } else if (statusTab === 'archived') {
        if (s.status !== 'archived' && !s.is_paused && s.status !== 'suspended') return false;
      }

      // 3. Module Filter
      if (moduleFilter === 'kombi') {
        if (!s.has_campus_subscription || !s.has_groovelab_subscription) return false;
      } else if (moduleFilter === 'campus') {
        if (!s.has_campus_subscription || s.has_groovelab_subscription) return false;
      } else if (moduleFilter === 'groovelab') {
        if (!s.has_groovelab_subscription || s.has_campus_subscription) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortOption === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      } else if (sortOption === 'mrr') {
        const statsA = schoolStats[a.id];
        const statsB = schoolStats[b.id];
        const actA = Math.max(statsA?.studentsCampus || 0, statsA?.studentsGroovelab || 0);
        const actB = Math.max(statsB?.studentsCampus || 0, statsB?.studentsGroovelab || 0);
        return actB - actA;
      } else {
        // default: students
        const actA = Math.max(schoolStats[a.id]?.studentsCampus || 0, schoolStats[a.id]?.studentsGroovelab || 0);
        const actB = Math.max(schoolStats[b.id]?.studentsCampus || 0, schoolStats[b.id]?.studentsGroovelab || 0);
        return actB - actA;
      }
    });
  }, [sanitizedSchools, searchQuery, moduleFilter, statusTab, sortOption, schoolStats]);

  // Counts for status tabs
  const pendingCount = sanitizedSchools.filter(s => s.is_approved === false || s.status === 'pending').length;
  const trialCount = sanitizedSchools.filter(s => s.is_trial && s.is_approved !== false).length;
  const activeCount = sanitizedSchools.filter(s => s.status === 'active' && !s.is_trial && s.is_approved !== false && !s.is_paused).length;
  const archivedCount = sanitizedSchools.filter(s => s.status === 'archived' || s.is_paused || s.status === 'suspended').length;

  // 1-Click CSV Export
  const handleExportCsv = () => {
    const headers = ['Schul-ID', 'Name', 'PLZ', 'Ort', 'E-Mail', 'Status', 'Testphase', 'Modul Campus', 'Modul GrooveLab', 'Lehrer', 'Aktive Schüler', 'Passive Schüler', 'MRR (EUR)'];
    const rows = sanitizedSchools.map(s => {
      const stats = schoolStats[s.id] || {};
      const teachers = stats.teachers || 0;
      const totalStudents = stats.students || 0;
      const campusActive = stats.studentsCampus || 0;
      const groovelabActive = stats.studentsGroovelab || 0;
      const activeStudents = Math.max(campusActive, groovelabActive);
      const passiveStudents = Math.max(0, totalStudents - activeStudents);

      const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(s) : {
        priceCampus: s.custom_price_campus ?? masterPricing?.priceCampus ?? 7.99,
        priceGroovelab: s.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 4.99,
        priceKombi: s.custom_price_kombi ?? masterPricing?.priceKombi ?? 9.99,
        priceTeacher: s.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
        priceStudent: s.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
        pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
      };

      const billingCalc = calculateCampusGroovelabBilling({
        hasCampusModule: !!s.has_campus_subscription,
        hasGroovelabModule: !!s.has_groovelab_subscription,
        activeTeacherCount: teachers,
        activeStudentCount: activeStudents,
        campusStudentCount: campusActive,
        groovelabStudentCount: groovelabActive,
        passiveStudentCount: passiveStudents,
        rates: {
          priceCampus: rates.priceCampus,
          priceGroovelab: rates.priceGroovelab,
          priceKombi: rates.priceKombi,
          priceTeacher: rates.priceTeacher,
          priceStudent: rates.priceStudent,
          pricePassiveStudent: rates.pricePassiveStudent
        }
      });

      const mrr = (s.is_trial || s.subscription_bypass) ? 0 : billingCalc.totalMonthlySchoolInvoice;

      return [
        `"${s.id}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${s.zip_code || ''}"`,
        `"${s.city || ''}"`,
        `"${s.billing_email || ''}"`,
        `"${s.status || 'active'}"`,
        `"${s.is_trial ? 'Ja' : 'Nein'}"`,
        `"${s.has_campus_subscription ? 'Aktiv' : 'Inaktiv'}"`,
        `"${s.has_groovelab_subscription ? 'Aktiv' : 'Inaktiv'}"`,
        teachers,
        activeStudents,
        passiveStudents,
        mrr.toFixed(2)
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campus-Groovelab_Mandanten_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Form Submit: Provision School
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    try {
      setProvisioning(true);
      const isTrialMode = newSchoolTrialMode.startsWith('trial_');
      let trialDays = 30;
      if (newSchoolTrialMode === 'trial_14') trialDays = 14;
      if (newSchoolTrialMode === 'trial_60') trialDays = 60;

      const trialUntil = isTrialMode 
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const schoolPayload = {
        name: newSchoolName.trim(),
        zip_code: newSchoolZip.trim() || null,
        city: newSchoolCity.trim() || null,
        billing_email: newSchoolEmail.trim() || null,
        has_campus_subscription: newSchoolModule === 'campus' || newSchoolModule === 'kombi',
        has_groovelab_subscription: newSchoolModule === 'groovelab' || newSchoolModule === 'kombi',
        is_trial: isTrialMode,
        trial_until: trialUntil,
        subscription_bypass: newSchoolTrialMode === 'bypass',
        status: 'active',
        is_approved: true,
        created_at: new Date().toISOString()
      };

      const createdSchool = await onProvisionSchool(schoolPayload);

      // Generate Magic Invite link
      const inviteUrl = `${window.location.origin}/?school_id=${createdSchool.id}&invite=school_onboarding`;
      setMagicInviteData({
        schoolName: createdSchool.name,
        loginUrl: inviteUrl,
        email: newSchoolEmail.trim()
      });

      // Reset form
      setNewSchoolName('');
      setNewSchoolZip('');
      setNewSchoolCity('');
      setNewSchoolEmail('');
    } catch (err: any) {
      console.error('Fehler bei der Schul-Provisionierung:', err);
      alert('Fehler beim Anlegen: ' + (err.message || err));
    } finally {
      setProvisioning(false);
    }
  };

  const handleCopyOnboardingLink = () => {
    const onboardingUrl = `${window.location.origin}/?invite=school_onboarding`;
    navigator.clipboard.writeText(onboardingUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
    }} className="animate-fade-in">

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 1. MASTER COCKPIT STYLE HEADER BAR                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
            Schulen &amp; Tenants Register
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#64748b', fontWeight: 550 }}>
            Zentrale Multi-Tenant Übersicht aller Musikschulen, DSGVO-AVVs, Aktivierungsquoten &amp; MRR.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 800,
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
            className="hover-scale-mini"
          >
            <Download size={14} color="#059669" /> CSV Export
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
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
            className="hover-scale-mini"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>

          <div
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#e6f4ea',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.88rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Building2 size={15} color="#047857" />
            <span>{sanitizedSchools.length} Mandanten Aktiv</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 2. MASTER COCKPIT STYLE KPI SCORECARDS                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* MRR Card */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '20px',
          padding: '22px 20px',
          color: '#ffffff',
          boxShadow: '0 12px 28px rgba(16, 185, 129, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)' }}>
              Mandanten-MRR Gesamt
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif', color: '#ffffff' }}>
              {totalCombinedMrr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.70rem', color: '#ffffff', fontWeight: 700, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.18)', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              <Building2 size={11} color="#ffffff" /> {totalPayingSchools} Zahlende Schulen
            </span>
          </div>
        </div>

        {/* Aktive Schulen Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Registrierte Schulen
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {sanitizedSchools.length}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.70rem', color: '#475569', fontWeight: 700, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '8px' }}>
              🟢 {activeCount} Aktiv
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '8px' }}>
              ⏱️ {trialCount} Test
            </span>
          </div>
        </div>

        {/* Schüler Profile Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Schüler-Aktivierungen
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {totalActiveStudentsCount}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.70rem', color: '#475569', fontWeight: 700, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', padding: '2px 7px', borderRadius: '8px' }}>
              ⚡ {totalActiveStudentsCount} Aktiv App
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '8px' }}>
              {totalPassiveStudentsCount} Basis
            </span>
          </div>
        </div>

        {/* Partner & Abo-Bypass Card */}
        <div style={{
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid #e9d5ff',
          boxShadow: '0 8px 24px rgba(126, 34, 206, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7e22ce', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Sonderkonditionen &amp; Partner
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: '#7e22ce', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {totalBypassedSchools + totalPendingSchools}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.70rem', color: '#7e22ce', fontWeight: 700, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(126, 34, 206, 0.12)', padding: '2px 7px', borderRadius: '8px' }}>
              {totalBypassedSchools} Bypass
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(126, 34, 206, 0.12)', padding: '2px 7px', borderRadius: '8px' }}>
              {totalPendingSchools} Freigaben
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. 2-COLUMN MAIN CONTENT: SCHOOLS LIST (LEFT) & PROVISIONING (RIGHT)   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.9fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: FILTER CONTROLS & SCHOOL CARDS                           */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
              Laufende Mandanten &amp; Schulen
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Multi-Tenant Instanzen, Lizenzstatus, Aktivierungszahlen und Support-Zugänge.
            </p>
          </div>

          {/* Status Tabs Segmented Control */}
          <div style={{
            display: 'inline-flex',
            background: '#f8fafc',
            padding: '4px',
            borderRadius: '16px',
            gap: '4px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {[
              { id: 'all', label: `Alle (${sanitizedSchools.length})` },
              { id: 'active', label: `🟢 Aktiv (${activeCount})` },
              { id: 'trial', label: `⏱️ Testphase (${trialCount})` },
              { id: 'pending', label: `⏳ Freigabe (${pendingCount})` },
              { id: 'archived', label: `⏸️ Archiv (${archivedCount})` }
            ].map(tab => {
              const isSel = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: isSel ? '1px solid #a7f3d0' : '1px solid transparent',
                    background: isSel ? '#ffffff' : 'transparent',
                    color: isSel ? '#059669' : '#64748b',
                    fontWeight: isSel ? 850 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSel ? '0 2px 8px rgba(5, 150, 105, 0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar & Sorting Track */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Schulname, PLZ oder Ort..."
                className="search-input-field"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px 10px 36px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.80rem',
                fontWeight: 700,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="students">Beste Kunden (Aktivierungen)</option>
              <option value="mrr">Höchster MRR-Umsatz</option>
              <option value="name">Alphabetisch (A - Z)</option>
              <option value="newest">Neueste Registrierungen</option>
            </select>
          </div>

          {/* Module Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Alle Module' },
              { id: 'kombi', label: 'Kombi (Campus + GrooveLab)' },
              { id: 'campus', label: 'Nur Campus' },
              { id: 'groovelab', label: 'Nur GrooveLab' }
            ].map(mod => {
              const isSel = moduleFilter === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setModuleFilter(mod.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '100px',
                    border: isSel ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isSel ? '#ecfdf5' : '#f8fafc',
                    color: isSel ? '#047857' : '#64748b',
                    boxShadow: isSel ? '0 2px 6px rgba(5, 150, 105, 0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mod.label}
                </button>
              );
            })}
          </div>

          {/* School Cards List */}
          {filteredSchools.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.88rem',
              border: '1px dashed #cbd5e1',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Building2 size={32} color="#cbd5e1" />
              <strong style={{ color: '#475569' }}>Keine Schulen gefunden</strong>
              <span>Passen Sie Ihre Filter oder Suchbegriffe an.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSchools.map((school) => {
                const stats = schoolStats[school.id] || {};
                const teachers = stats.teachers || 0;
                const totalStudents = stats.students || 0;
                const campusActive = stats.studentsCampus || 0;
                const groovelabActive = stats.studentsGroovelab || 0;
                const activeStudents = Math.max(campusActive, groovelabActive);
                const passiveStudents = Math.max(0, totalStudents - activeStudents);

                const isPending = school.is_approved === false || school.status === 'pending';
                const isPaused = school.is_paused || school.status === 'suspended';
                const isTrial = school.is_trial && !isPending;

                // MRR calculation
                const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(school) : {
                  priceCampus: school.custom_price_campus ?? masterPricing?.priceCampus ?? 7.99,
                  priceGroovelab: school.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 4.99,
                  priceKombi: school.custom_price_kombi ?? masterPricing?.priceKombi ?? 9.99,
                  priceTeacher: school.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
                  priceStudent: school.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
                  pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
                };

                const billingCalc = calculateCampusGroovelabBilling({
                  hasCampusModule: !!school.has_campus_subscription,
                  hasGroovelabModule: !!school.has_groovelab_subscription,
                  activeTeacherCount: teachers,
                  activeStudentCount: activeStudents,
                  campusStudentCount: campusActive,
                  groovelabStudentCount: groovelabActive,
                  passiveStudentCount: passiveStudents,
                  rates: {
                    priceCampus: rates.priceCampus,
                    priceGroovelab: rates.priceGroovelab,
                    priceKombi: rates.priceKombi,
                    priceTeacher: rates.priceTeacher,
                    priceStudent: rates.priceStudent,
                    pricePassiveStudent: rates.pricePassiveStudent
                  }
                });

                const mrr = (school.is_trial || school.subscription_bypass) ? 0 : billingCalc.totalMonthlySchoolInvoice;

                return (
                  <div
                    key={school.id}
                    className="school-list-card"
                    style={{
                      background: isPending ? '#fffbeb' : isPaused ? '#f8fafc' : '#ffffff',
                      border: isPending ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Left Info: Click opens Drawer */}
                    <div 
                      onClick={() => onSelectSchool(school)}
                      style={{ cursor: 'pointer', flex: 1, minWidth: '240px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        <strong style={{ fontSize: '1.02rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                          {school.name}
                        </strong>

                        {/* Status Badges */}
                        {isPending ? (
                          <span style={{ fontSize: '0.68rem', background: '#f59e0b', color: '#ffffff', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                            ⏳ Freigabe ausstehend
                          </span>
                        ) : isPaused ? (
                          <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                            ⏸️ Pausiert
                          </span>
                        ) : isTrial ? (
                          <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                            ⏱️ Testphase
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
                            ● Aktiv
                          </span>
                        )}

                        {/* MRR Pill with Interactive Popover */}
                        <div 
                          style={{ position: 'relative', display: 'inline-block' }}
                          onMouseEnter={() => setActiveMrrTooltipSchoolId(school.id)}
                          onMouseLeave={() => setActiveMrrTooltipSchoolId(null)}
                        >
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            cursor: 'help',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            💰 MRR: {mrr.toFixed(2)} € / Mo.
                          </span>

                          {/* MRR Canonical Breakdown Tooltip */}
                          {activeMrrTooltipSchoolId === school.id && (
                            <div style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 8px)',
                              left: '0',
                              background: '#ffffff',
                              color: '#1e293b',
                              border: '1px solid #e2e8f0',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              fontSize: '0.72rem',
                              width: '260px',
                              zIndex: 9999,
                              boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
                              lineHeight: '1.55'
                            }}>
                              <div style={{ fontWeight: 850, borderBottom: '1px solid #f1f5f9', paddingBottom: '5px', marginBottom: '6px', color: '#0f172a' }}>
                                Kanonische MRR-Kalkulation
                              </div>
                              <div style={{ color: '#64748b' }}>• Software-Lizenz: 0,00 €</div>
                              {school.has_campus_subscription && <div style={{ color: '#475569' }}>• Cloud Campus: {rates.priceCampus.toFixed(2)} €</div>}
                              {school.has_groovelab_subscription && <div style={{ color: '#475569' }}>• Cloud GrooveLab: {rates.priceGroovelab.toFixed(2)} €</div>}
                              <div style={{ color: '#475569' }}>• Service ({teachers} Lehrkräfte): {(teachers * rates.priceTeacher).toFixed(2)} €</div>
                              <div style={{ color: '#475569' }}>• Basis ({totalStudents} Schüler): {(totalStudents * rates.pricePassiveStudent).toFixed(2)} €</div>
                              {campusActive > 0 && <div style={{ color: '#047857' }}>• Aktiv Campus ({campusActive}): {(campusActive * rates.priceStudent).toFixed(2)} €</div>}
                              {groovelabActive > 0 && <div style={{ color: '#ca8a04' }}>• Aktiv GrooveLab ({groovelabActive}): {(groovelabActive * rates.priceStudent).toFixed(2)} €</div>}
                              <div style={{ fontWeight: 900, borderTop: '1px solid #f1f5f9', paddingTop: '5px', marginTop: '6px', color: '#059669' }}>
                                = Gesamt: {mrr.toFixed(2)} € / Mo.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '6px' }}>
                        📍 {school.zip_code || ''} {school.city || 'Standort hinterlegt'} • {teachers} Lehrer • {activeStudents} Aktiv ({campusActive} Campus, {groovelabActive} GrooveLab) • {passiveStudents} Passiv ({totalStudents} Reg.)
                      </div>

                      {/* Module Tags */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {school.has_campus_subscription && (
                          <span style={{ fontSize: '0.64rem', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            Campus
                          </span>
                        )}
                        {school.has_groovelab_subscription && (
                          <span style={{ fontSize: '0.64rem', background: '#fefce8', color: '#ca8a04', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            GrooveLab
                          </span>
                        )}
                        {school.subscription_bypass && (
                          <span style={{ fontSize: '0.64rem', background: '#faf5ff', color: '#8b5cf6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            Abo-Bypass
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Actions Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      
                      {/* Pending Quick Approval */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => {
                            supabase.from('schools').update({ is_approved: true, status: 'active' }).eq('id', school.id).then(() => onRefresh());
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Freischalten
                        </button>
                      )}

                      {/* Ghost Support Button */}
                      <button
                        type="button"
                        onClick={() => onStartGhostMode(school)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)'
                        }}
                        className="hover-scale-mini"
                        title="Ghost-Support im neuen Tab starten"
                      >
                        <Eye size={13} /> Ghost
                      </button>

                      {/* Status Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = school.status === 'active' ? 'suspended' : 'active';
                          onToggleSchoolStatus(school, nextStatus);
                        }}
                        style={{
                          position: 'relative',
                          width: '38px',
                          height: '22px',
                          borderRadius: '11px',
                          background: school.status === 'active' ? '#10b981' : '#cbd5e1',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'background 0.2s ease'
                        }}
                        title={school.status === 'active' ? 'Schule pausieren' : 'Schule aktivieren'}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          transform: school.status === 'active' ? 'translateX(19px)' : 'translateX(3px)',
                          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </button>

                      {/* Delete / Archive Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteSchool(school)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: '8px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale-mini"
                        title="Schule löschen / verwalten"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: PROVISIONING & ONBOARDING LINK                          */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Self-Onboarding Link Card */}
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '24px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)'
              }}>
                <Zap size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#065f46' }}>
                  Self-Onboarding Einladungslink
                </h4>
                <p style={{ margin: '1px 0 0 0', fontSize: '0.78rem', color: '#047857' }}>
                  Universeller Link für Schulleiter zur eigenständigen 3-Schritte-Anmeldung mit AVV-Abschluss.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?invite=school_onboarding`}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #a7f3d0',
                  background: '#ffffff',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  color: '#065f46',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleCopyOnboardingLink}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: inviteCopied ? '#047857' : '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{inviteCopied ? 'Kopiert' : 'Kopieren'}</span>
              </button>
            </div>
          </div>

          {/* Provisioning Form Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
                + Schule manuell provisionieren
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Legt einen neuen Mandanten mit personalisiertem Magic-Invite an.
              </p>
            </div>

            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* School Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
                  Name der Schule *
                </label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="z. B. Musikakademie Freiburg"
                  className="premium-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* ZIP and City in 2 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={newSchoolZip}
                    onChange={(e) => setNewSchoolZip(e.target.value)}
                    placeholder="79098"
                    className="premium-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
                    Ort
                  </label>
                  <input
                    type="text"
                    value={newSchoolCity}
                    onChange={(e) => setNewSchoolCity(e.target.value)}
                    placeholder="Freiburg"
                    className="premium-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* School Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
                  Schulleiter E-Mail (Optional für Einladung)
                </label>
                <input
                  type="email"
                  value={newSchoolEmail}
                  onChange={(e) => setNewSchoolEmail(e.target.value)}
                  placeholder="leitung@musikschule.de"
                  className="premium-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Module Package Segmented */}
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Modulpaket
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'kombi', label: 'Kombi' },
                    { id: 'campus', label: 'Campus' },
                    { id: 'groovelab', label: 'GrooveLab' }
                  ].map(m => {
                    const isSel = newSchoolModule === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNewSchoolModule(m.id as any)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '12px',
                          border: isSel ? '1.5px solid #059669' : '1px solid #cbd5e1',
                          background: isSel ? '#ecfdf5' : '#ffffff',
                          color: isSel ? '#059669' : '#475569',
                          fontSize: '0.80rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trial Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Testphase / Lizenzmodus
                </label>
                <select
                  value={newSchoolTrialMode}
                  onChange={(e) => setNewSchoolTrialMode(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="trial_30">30 Tage Testphase (Standard)</option>
                  <option value="trial_14">14 Tage Schnell-Test</option>
                  <option value="trial_60">60 Tage Intensiv-Test</option>
                  <option value="bypass">Abo-Bypass (Dauerhaft Kostenfrei / Partner)</option>
                  <option value="paid">Sofort kostenpflichtig aktivieren</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={provisioning}
                style={{
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.90rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.15s ease',
                  marginTop: '6px'
                }}
                className="hover-scale-mini"
              >
                <Plus size={16} />
                <span>{provisioning ? 'Wird provisioniert...' : '+ Schule provisionieren'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MAGIC INVITE POPUP MODAL                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {magicInviteData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            maxWidth: '540px',
            width: '100%',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  Schule erfolgreich angelegt!
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Magic-Invite Link für „{magicInviteData.schoolName}“ generiert.
                </p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                Persönlicher Einladungs-Link
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={magicInviteData.loginUrl}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.80rem',
                    fontFamily: 'monospace',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(magicInviteData.loginUrl);
                    alert('Magic-Link kopiert!');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                  }}
                  className="hover-scale-mini"
                >
                  Kopieren
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMagicInviteData(null)}
                style={{
                  padding: '11px 22px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  fontWeight: 850,
                  cursor: 'pointer'
                }}
                className="hover-scale-mini"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
