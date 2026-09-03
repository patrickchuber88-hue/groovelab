import React, { useState, useMemo } from 'react';
import { 
  Building2, Search, Plus, RefreshCw, Eye, Trash2, Download, Check, Copy, 
  ExternalLink, ShieldCheck, AlertTriangle, Clock, Sliders, Smartphone, 
  CheckCircle, Info, Zap, MapPin, Mail, Sparkles, Filter, ChevronDown, 
  CheckCircle2, Calendar, Award, UserCheck, Power, ShieldAlert, Users, 
  HardDrive, Activity, ArrowUpRight, Phone, Edit3, X, MessageSquare, 
  AlertCircle, LayoutGrid, LayoutList
} from 'lucide-react';
import { calculateCampusGroovelabBilling } from '../../../domain/billingCalculator';
import { isSchoolBypassActive } from '../../../domain/pricingEngine';
import { isSchoolTrialActive } from '../../../domain/schoolMetricsAggregator';

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
  onTogglePauseSchool?: (school: School) => Promise<void>;
  onProvisionSchool: (data: any) => Promise<any>;
  onUpdateOperatorNotes?: (schoolId: string, notes: string) => Promise<void>;
  onExtendTrial?: (schoolId: string, days: number) => Promise<void>;
  onRegenerateInvite?: (schoolId: string) => Promise<any>;
  onSuspendWithAudit?: (schoolId: string, reason: string) => Promise<void>;
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
  onTogglePauseSchool,
  onProvisionSchool,
  onUpdateOperatorNotes,
  onExtendTrial,
  onRegenerateInvite,
  onSuspendWithAudit
}) => {
  // Apple HIG View Mode: Table (Data-Grid) vs. Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'kombi' | 'campus' | 'groovelab'>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'trial' | 'pending' | 'archived'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'expiring_trial' | 'missing_avv' | 'inactive' | 'high_activity'>('all');
  const [sortOption, setSortOption] = useState<'students' | 'name' | 'newest' | 'mrr' | 'churn'>('students');

  // Slide-Over Provisioning Modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolZip, setNewSchoolZip] = useState('');
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolContact, setNewSchoolContact] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolModule, setNewSchoolModule] = useState<'none' | 'kombi' | 'campus' | 'groovelab'>('none');
  const [newSchoolTrialMode, setNewSchoolTrialMode] = useState<'trial_30' | 'trial_14' | 'trial_60' | 'bypass' | 'paid'>('trial_30');
  const [newSchoolNotes, setNewSchoolNotes] = useState('');
  const [provisioning, setProvisioning] = useState(false);

  // Success Kit Modal after Provisioning
  const [magicInviteData, setMagicInviteData] = useState<{
    schoolName: string;
    loginUrl: string;
    email: string;
    contactPerson: string;
  } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [briefingCopied, setBriefingCopied] = useState(false);

  // Safety Suspend Modal
  const [suspendTargetSchool, setSuspendTargetSchool] = useState<School | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Inline Note Editing State
  const [editingNoteSchoolId, setEditingNoteSchoolId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Quick Action Feedback states
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [extendingTrialId, setExtendingTrialId] = useState<string | null>(null);
  const [activeMrrTooltipSchoolId, setActiveMrrTooltipSchoolId] = useState<string | null>(null);

  // Filter out unwanted test schools
  const sanitizedSchools = useMemo(() => {
    return (schools || []).filter(s => {
      const name = (s.name || '').toLowerCase();
      return !name.includes('groove academy');
    });
  }, [schools]);

  // Aggregate Metrics for Header Scorecards & Operator Action Center
  const totalPayingSchools = sanitizedSchools.filter(s => s.status === 'active' && !isSchoolTrialActive(s) && !isSchoolBypassActive(s) && !s.is_paused).length;
  const totalTrialSchools = sanitizedSchools.filter(s => isSchoolTrialActive(s) && s.is_approved !== false).length;
  const totalBypassedSchools = sanitizedSchools.filter(s => isSchoolBypassActive(s)).length;
  const totalPendingSchools = sanitizedSchools.filter(s => s.is_approved === false || s.status === 'pending').length;

  let totalCombinedMrr = 0;
  let totalActiveStudentsCount = 0;
  let totalPassiveStudentsCount = 0;
  let totalSignedAvvCount = 0;

  // Telemetry helper: Churn & Session Activity
  const getSchoolActivityStatus = (school: School) => {
    // 1. Check if this school is the active development school or operator session
    const isDevActive = Boolean(
      (school.name && school.name.toLowerCase().includes('bad säckingen')) ||
      (school.billing_email && school.billing_email.toLowerCase().includes('musaek'))
    );
    if (isDevActive) {
      return { 
        level: 'active', 
        label: 'Gerade aktiv', 
        color: '#059669', 
        bg: '#ecfdf5', 
        daysAgo: 0 
      };
    }

    const lastSeenStr = school.last_session_at || school.created_at;
    if (!lastSeenStr) return { level: 'unknown', label: 'Unbekannt', color: '#94a3b8', bg: '#f1f5f9', daysAgo: 999 };
    const diffMs = Date.now() - new Date(lastSeenStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 48) {
      return { 
        level: 'active', 
        label: diffHours < 2 ? 'Gerade aktiv' : `Vor ${diffHours}h`, 
        color: '#059669', 
        bg: '#ecfdf5', 
        daysAgo: 0 
      };
    } else if (diffDays <= 14) {
      return { 
        level: 'idle', 
        label: `Vor ${diffDays}d`, 
        color: '#d97706', 
        bg: '#fffbeb', 
        daysAgo: diffDays 
      };
    } else {
      return { 
        level: 'inactive', 
        label: `Inaktiv (${diffDays}d)`, 
        color: '#dc2626', 
        bg: '#fef2f2', 
        daysAgo: diffDays 
      };
    }
  };

  // Helper for Trial Expiry Days
  const getDaysUntilTrialExpires = (school: School) => {
    const expiryDate = school.trial_until || school.trial_ends_at;
    if (!expiryDate) return null;
    const diffMs = new Date(expiryDate).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

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
    if (s.avv_signed_at) totalSignedAvvCount += 1;

    if (!isSchoolTrialActive(s) && !isSchoolBypassActive(s) && !s.is_paused && s.status === 'active') {
      const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(s) : {
        priceCampus: s.custom_price_campus ?? masterPricing?.priceCampus ?? 14.90,
        priceGroovelab: s.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 9.90,
        priceKombi: s.custom_price_kombi ?? masterPricing?.priceKombi ?? 19.90,
        priceTeacher: s.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
        priceStudent: s.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
        pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
      };

      const storageAddonGbVal = Number(s.storage_addon_gb || 0);
      const storageAddonFeeVal = Number(s.storage_addon_monthly_fee || (storageAddonGbVal === 20 ? 5.49 : storageAddonGbVal === 10 ? 2.99 : storageAddonGbVal === 5 ? 1.49 : storageAddonGbVal === 50 ? 9.99 : 0));

      const isBookedSchool = Boolean(s.is_billing_booked) || s.status === 'active';
      const hasCampusMod = (isBookedSchool && !s.has_campus_subscription && !s.has_groovelab_subscription) ? true : !!s.has_campus_subscription;
      const hasGrooveMod = (isBookedSchool && !s.has_campus_subscription && !s.has_groovelab_subscription) ? true : !!s.has_groovelab_subscription;

      const billing = calculateCampusGroovelabBilling({
        hasCampusModule: hasCampusMod,
        hasGroovelabModule: hasGrooveMod,
        activeTeacherCount: teachers,
        activeStudentCount: activeStudents,
        campusStudentCount: campusActive,
        groovelabStudentCount: groovelabActive,
        passiveStudentCount: passiveStudents,
        storageAddonMonthlyFee: storageAddonFeeVal,
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

  // Operator Action Center: Compute urgent task categories
  const expiringTrialSchools = useMemo(() => {
    return sanitizedSchools.filter(s => {
      if (!isSchoolTrialActive(s)) return false;
      const days = getDaysUntilTrialExpires(s);
      return days !== null && days <= 7;
    });
  }, [sanitizedSchools]);

  const missingAvvSchools = useMemo(() => {
    return sanitizedSchools.filter(s => !s.avv_signed_at && s.status !== 'archived');
  }, [sanitizedSchools]);

  const inactiveSchools = useMemo(() => {
    return sanitizedSchools.filter(s => {
      const act = getSchoolActivityStatus(s);
      return act.level === 'inactive' && s.status === 'active';
    });
  }, [sanitizedSchools]);

  // Combined Filter and Sort Logic
  const filteredSchools = useMemo(() => {
    return sanitizedSchools.filter(s => {
      // 1. Search Query (Name, Contact, Phone, Email, City, Zip)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesContact = (s.billing_contact_person || '').toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        const matchesZip = (s.zip_code || '').toLowerCase().includes(q);
        const matchesEmail = (s.billing_email || s.email || '').toLowerCase().includes(q);
        const matchesPhone = (s.phone_number || '').toLowerCase().includes(q);
        const matchesNotes = (s.operator_notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesCity && !matchesZip && !matchesEmail && !matchesPhone && !matchesNotes) {
          return false;
        }
      }

      // 2. Status Tab Filter
      if (statusTab === 'active') {
        if (s.status !== 'active' || isSchoolTrialActive(s) || s.is_approved === false || s.is_paused) return false;
      } else if (statusTab === 'trial') {
        if (!isSchoolTrialActive(s) || s.is_approved === false) return false;
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

      // 4. Operator Action Filter
      if (actionFilter === 'expiring_trial') {
        const days = getDaysUntilTrialExpires(s);
        if (!isSchoolTrialActive(s) || days === null || days > 7) return false;
      } else if (actionFilter === 'missing_avv') {
        if (s.avv_signed_at) return false;
      } else if (actionFilter === 'inactive') {
        if (getSchoolActivityStatus(s).level !== 'inactive') return false;
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
      } else if (sortOption === 'churn') {
        return getSchoolActivityStatus(b).daysAgo - getSchoolActivityStatus(a).daysAgo;
      } else {
        // default: students
        const actA = Math.max(schoolStats[a.id]?.studentsCampus || 0, schoolStats[a.id]?.studentsGroovelab || 0);
        const actB = Math.max(schoolStats[b.id]?.studentsCampus || 0, schoolStats[b.id]?.studentsGroovelab || 0);
        return actB - actA;
      }
    });
  }, [sanitizedSchools, searchQuery, moduleFilter, statusTab, actionFilter, sortOption, schoolStats]);

  // Counts for status tabs
  const pendingCount = sanitizedSchools.filter(s => s.is_approved === false || s.status === 'pending').length;
  const trialCount = sanitizedSchools.filter(s => isSchoolTrialActive(s) && s.is_approved !== false).length;
  const activeCount = sanitizedSchools.filter(s => s.status === 'active' && !isSchoolTrialActive(s) && s.is_approved !== false && !s.is_paused).length;
  const archivedCount = sanitizedSchools.filter(s => s.status === 'archived' || s.is_paused || s.status === 'suspended').length;

  // 1-Click CSV Export of filtered view
  const handleExportFilteredCsv = () => {
    const headers = [
      'Schul-ID', 'Name', 'PLZ', 'Ort', 'Schulleitung', 'Telefon', 'E-Mail', 
      'Status', 'Aktivitaet', 'Testphase', 'AVV_Status', 'Modul_Campus', 
      'Modul_GrooveLab', 'Lehrer', 'Aktive_Schueler', 'Passive_Schueler', 
      'MRR_EUR', 'Betreiber_Notiz'
    ];

    const rows = filteredSchools.map(s => {
      const stats = schoolStats[s.id] || {};
      const teachers = stats.teachers || 0;
      const totalStudents = stats.students || 0;
      const campusActive = stats.studentsCampus || 0;
      const groovelabActive = stats.studentsGroovelab || 0;
      const activeStudents = Math.max(campusActive, groovelabActive);
      const passiveStudents = Math.max(0, totalStudents - activeStudents);

      const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(s) : {
        priceCampus: s.custom_price_campus ?? masterPricing?.priceCampus ?? 14.90,
        priceGroovelab: s.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 9.90,
        priceKombi: s.custom_price_kombi ?? masterPricing?.priceKombi ?? 19.90,
        priceTeacher: s.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
        priceStudent: s.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
        pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
      };

      const storageAddonGbVal = Number(s.storage_addon_gb || 0);
      const storageAddonFeeVal = Number(s.storage_addon_monthly_fee || (storageAddonGbVal === 20 ? 5.49 : storageAddonGbVal === 10 ? 2.99 : storageAddonGbVal === 5 ? 1.49 : storageAddonGbVal === 50 ? 9.99 : 0));

      const isBookedSchool = Boolean(s.is_billing_booked) || s.status === 'active';
      const hasCampusMod = (isBookedSchool && !s.has_campus_subscription && !s.has_groovelab_subscription) ? true : !!s.has_campus_subscription;
      const hasGrooveMod = (isBookedSchool && !s.has_campus_subscription && !s.has_groovelab_subscription) ? true : !!s.has_groovelab_subscription;

      const billingCalc = calculateCampusGroovelabBilling({
        hasCampusModule: hasCampusMod,
        hasGroovelabModule: hasGrooveMod,
        activeTeacherCount: teachers,
        activeStudentCount: activeStudents,
        campusStudentCount: campusActive,
        groovelabStudentCount: groovelabActive,
        passiveStudentCount: passiveStudents,
        storageAddonMonthlyFee: storageAddonFeeVal,
        rates: {
          priceCampus: rates.priceCampus,
          priceGroovelab: rates.priceGroovelab,
          priceKombi: rates.priceKombi,
          priceTeacher: rates.priceTeacher,
          priceStudent: rates.priceStudent,
          pricePassiveStudent: rates.pricePassiveStudent
        }
      });

      const mrr = (isSchoolTrialActive(s) || isSchoolBypassActive(s) || s.is_paused) ? 0 : billingCalc.totalMonthlySchoolInvoice;
      const act = getSchoolActivityStatus(s);

      return [
        `"${s.id}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${s.zip_code || ''}"`,
        `"${s.city || ''}"`,
        `"${(s.billing_contact_person || '').replace(/"/g, '""')}"`,
        `"${s.phone_number || ''}"`,
        `"${s.billing_email || s.email || ''}"`,
        `"${s.status || 'active'}"`,
        `"${act.label}"`,
        `"${isSchoolTrialActive(s) ? 'Ja' : 'Nein'}"`,
        `"${s.avv_signed_at ? 'Gezeichnet' : 'Ausstehend'}"`,
        `"${s.has_campus_subscription ? 'Aktiv' : 'Inaktiv'}"`,
        `"${s.has_groovelab_subscription ? 'Aktiv' : 'Inaktiv'}"`,
        teachers,
        activeStudents,
        passiveStudents,
        mrr.toFixed(2),
        `"${(s.operator_notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campus-Groovelab_Mandanten_Gefiltert_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1-Click Kulanz Extension (+14d / +30d)
  const handleQuickExtendTrial = async (school: School, days: number) => {
    try {
      setExtendingTrialId(school.id);
      if (onExtendTrial) {
        await onExtendTrial(school.id, days);
      }
    } catch (e: any) {
      alert('Fehler bei Kulanz-Verlängerung: ' + (e.message || e));
    } finally {
      setExtendingTrialId(null);
    }
  };

  // 1-Click Magic-Invite Token Regenerate & Briefing Copy
  const handleRegenerateAndCopyInvite = async (school: School) => {
    try {
      setCopiedInviteId(school.id);
      let token = school.invite_token;
      if (onRegenerateInvite) {
        const res = await onRegenerateInvite(school.id);
        if (res?.invite_token) token = res.invite_token;
      }

      const inviteUrl = `${window.location.origin}/?school_id=${school.id}&invite=school_onboarding${token ? `&token=${token}` : ''}`;
      const contactName = school.billing_contact_person || 'Schulleitung';
      const text = `Guten Tag ${contactName},\n\nhier ist Ihr persönlicher Einrichtungs- und Aktivierungszugang für Campus-Groovelab an der Musikschule ${school.name}:\n👉 ${inviteUrl}\n\nDieser gesicherte Einladungslink ist für 14 Tage gültig. Der 3-Schritte-Assistent führt Sie direkt durch das Setup und die DSGVO-AVV-Gegenzeichnung.\n\nBei Fragen unterstützen wir Sie jederzeit gerne!\n\nHerzliche Grüße,\nPatrick Huber | Campus-Groovelab Leitstand`;

      await navigator.clipboard.writeText(text);
      setTimeout(() => setCopiedInviteId(null), 3000);
    } catch (err: any) {
      alert('Fehler beim Kopieren: ' + (err.message || err));
      setCopiedInviteId(null);
    }
  };

  // Inline Note Save
  const handleSaveNote = async (schoolId: string) => {
    try {
      setSavingNote(true);
      if (onUpdateOperatorNotes) {
        await onUpdateOperatorNotes(schoolId, noteDraft.trim());
      }
      setEditingNoteSchoolId(null);
    } catch (e: any) {
      alert('Fehler beim Speichern der Notiz: ' + (e.message || e));
    } finally {
      setSavingNote(false);
    }
  };

  // Safety Suspend Confirmation Submit
  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTargetSchool) return;
    if (!suspendReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Sperrung an.');
      return;
    }

    try {
      setSuspending(true);
      if (onSuspendWithAudit) {
        await onSuspendWithAudit(suspendTargetSchool.id, suspendReason.trim());
      } else {
        await onToggleSchoolStatus(suspendTargetSchool, 'suspended');
      }
      setSuspendTargetSchool(null);
      setSuspendReason('');
    } catch (err: any) {
      alert('Fehler bei der Mandanten-Sperrung: ' + (err.message || err));
    } finally {
      setSuspending(false);
    }
  };

  // Form Submit: Provision School via Slide-Over Modal
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

      const tokenUuid = crypto.randomUUID();
      const tokenExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const schoolPayload = {
        name: newSchoolName.trim(),
        zip_code: newSchoolZip.trim() || null,
        city: newSchoolCity.trim() || null,
        billing_email: newSchoolEmail.trim() || null,
        billing_contact_person: newSchoolContact.trim() || null,
        phone_number: newSchoolPhone.trim() || null,
        operator_notes: newSchoolNotes.trim() || null,
        invite_token: tokenUuid,
        invite_expires_at: tokenExpires,
        has_campus_subscription: newSchoolModule === 'campus' || newSchoolModule === 'kombi',
        has_groovelab_subscription: newSchoolModule === 'groovelab' || newSchoolModule === 'kombi',
        storage_addon_gb: 0,
        storage_addon_monthly_fee: 0.00,
        storage_addon_status: 'none',
        extra_billing_option: null,
        is_billing_booked: false,
        is_trial: isTrialMode,
        trial_until: trialUntil,
        subscription_bypass: newSchoolTrialMode === 'bypass',
        status: 'active',
        is_approved: true,
        created_at: new Date().toISOString()
      };

      const createdSchool = await onProvisionSchool(schoolPayload);

      // Generate Magic Invite link
      const inviteUrl = `${window.location.origin}/?school_id=${createdSchool.id}&invite=school_onboarding&token=${tokenUuid}`;
      setShowProvisionModal(false);
      setMagicInviteData({
        schoolName: createdSchool.name,
        loginUrl: inviteUrl,
        email: newSchoolEmail.trim(),
        contactPerson: newSchoolContact.trim() || 'Schulleitung'
      });

      // Reset form
      setNewSchoolName('');
      setNewSchoolZip('');
      setNewSchoolCity('');
      setNewSchoolEmail('');
      setNewSchoolContact('');
      setNewSchoolPhone('');
      setNewSchoolNotes('');
    } catch (err: any) {
      console.error('Fehler bei der Schul-Provisionierung:', err);
      alert('Fehler beim Anlegen: ' + (err.message || err));
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      width: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Outfit", sans-serif'
    }} className="animate-fade-in">

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 1. APPLE HIG MASTER HEADER BAR                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ 
              fontSize: '2.1rem', 
              fontWeight: 800, 
              color: '#0f172a', 
              margin: 0, 
              letterSpacing: '-0.035em' 
            }}>
              Schulen &amp; Tenants Register
            </h2>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '20px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {sanitizedSchools.length} Mandanten
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.90rem', color: '#64748b', fontWeight: 500 }}>
            Zentrale Multi-Tenant Übersicht aller Musikschulen, DSGVO-AVVs, Aktivierungsquoten &amp; MRR.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* CSV Export Button (Filtered) */}
          <button
            type="button"
            onClick={handleExportFilteredCsv}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            title="Exportiert exakt die derzeit gefilterte Mandantenliste"
          >
            <Download size={14} color="#475569" /> CSV Export ({filteredSchools.length})
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>

          {/* Primary CTA: + Schule provisionieren */}
          <button
            type="button"
            onClick={() => setShowProvisionModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale-mini"
          >
            <Plus size={16} color="#ffffff" /> Schule provisionieren
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 2. APPLE HIG METRIC SCORECARDS                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* MRR Card */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '20px',
          padding: '20px 22px',
          color: '#ffffff',
          boxShadow: '0 10px 24px rgba(16, 185, 129, 0.24)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9 }}>
              Mandanten-MRR Gesamt
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalCombinedMrr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.20)', padding: '2px 8px', borderRadius: '8px' }}>
              {totalPayingSchools} Zahlende Schulen
            </span>
          </div>
        </div>

        {/* Registrierte Schulen Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Registrierte Schulen
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {sanitizedSchools.length}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '8px', color: '#059669' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> {activeCount} Aktiv
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '8px', color: '#64748b' }}>
              <Clock size={11} /> {trialCount} Test
            </span>
          </div>
        </div>

        {/* Schüler-Aktivierungen Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Schüler-Aktivierungen
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalActiveStudentsCount}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a', padding: '2px 8px', borderRadius: '8px' }}>
              {totalActiveStudentsCount} Aktiv App
            </span>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '2px 8px', borderRadius: '8px' }}>
              {totalPassiveStudentsCount} Basis
            </span>
          </div>
        </div>

        {/* DSGVO & Compliance Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              DSGVO-AVV Compliance
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalSignedAvvCount} <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: 600 }}>/ {sanitizedSchools.length}</span>
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: totalSignedAvvCount === sanitizedSchools.length ? '#ecfdf5' : '#fffbeb', 
              color: totalSignedAvvCount === sanitizedSchools.length ? '#059669' : '#d97706',
              padding: '2px 8px', 
              borderRadius: '8px' 
            }}>
              <ShieldCheck size={12} /> {sanitizedSchools.length - totalSignedAvvCount} AVVs offen
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. ⚡ OPERATOR ACTION CENTER (APPLE HIG SMART ALERTS)                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'rgba(248, 250, 252, 0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '16px 20px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: '#ffffff',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0'
          }}>
            <Zap size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
              Operator Action Center
            </strong>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              Tages-Fokus &amp; Handlungsbedarfe. Klick auf einen Alert filtert sofort die Tabelle.
            </p>
          </div>
        </div>

        {/* Smart Alert Pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {expiringTrialSchools.length > 0 && (
            <button
              type="button"
              onClick={() => setActionFilter(actionFilter === 'expiring_trial' ? 'all' : 'expiring_trial')}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                border: actionFilter === 'expiring_trial' ? '1.5px solid #d97706' : '1px solid #fde68a',
                background: actionFilter === 'expiring_trial' ? '#fef3c7' : '#ffffff',
                color: '#b45309',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.10)'
              }}
            >
              <Clock size={12} />
              <span>{expiringTrialSchools.length} Testphasen enden in &lt; 7 Tagen</span>
            </button>
          )}

          {missingAvvSchools.length > 0 && (
            <button
              type="button"
              onClick={() => setActionFilter(actionFilter === 'missing_avv' ? 'all' : 'missing_avv')}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                border: actionFilter === 'missing_avv' ? '1.5px solid #ea580c' : '1px solid #ffedd5',
                background: actionFilter === 'missing_avv' ? '#ffedd5' : '#ffffff',
                color: '#c2410c',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(194, 65, 12, 0.10)'
              }}
            >
              <ShieldAlert size={12} />
              <span>{missingAvvSchools.length} AVVs offen</span>
            </button>
          )}

          {inactiveSchools.length > 0 && (
            <button
              type="button"
              onClick={() => setActionFilter(actionFilter === 'inactive' ? 'all' : 'inactive')}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                border: actionFilter === 'inactive' ? '1.5px solid #dc2626' : '1px solid #fee2e2',
                background: actionFilter === 'inactive' ? '#fee2e2' : '#ffffff',
                color: '#b91c1c',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.10)'
              }}
            >
              <AlertCircle size={12} />
              <span>{inactiveSchools.length} Schulen inaktiv (&gt;14d)</span>
            </button>
          )}

          {expiringTrialSchools.length === 0 && missingAvvSchools.length === 0 && inactiveSchools.length === 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '100px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              fontSize: '0.76rem',
              fontWeight: 800
            }}>
              <CheckCircle2 size={13} />
              <span>Alles im grünen Bereich – 0 offene Betreiber-Aufgaben</span>
            </div>
          )}

          {actionFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActionFilter('all')}
              style={{
                padding: '5px 10px',
                borderRadius: '100px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Filter zurücksetzen ×
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 4. APPLE HIG CONTROL BAR (SEGMENTED TABS, SEARCH, VIEW-SWITCH)         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Top Control Track: Status Tabs & View Switcher */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          {/* Apple Segmented Control: Status Tabs */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '14px',
            gap: '3px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { id: 'all', label: `Alle (${sanitizedSchools.length})` },
              { id: 'active', label: `Aktiv (${activeCount})` },
              { id: 'trial', label: `Testphase (${trialCount})` },
              { id: 'pending', label: `Freigabe (${pendingCount})` },
              { id: 'archived', label: `Archiv (${archivedCount})` }
            ].map(tab => {
              const isSel = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id as any)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '11px',
                    border: isSel ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
                    background: isSel ? '#ffffff' : 'transparent',
                    color: isSel ? '#0f172a' : '#64748b',
                    fontWeight: isSel ? 800 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSel ? '0 2px 6px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: View Switcher (Tabelle vs. Karten) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: viewMode === 'table' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#0f172a' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: viewMode === 'table' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <LayoutList size={13} /> Tabelle
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: viewMode === 'cards' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: viewMode === 'cards' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <LayoutGrid size={13} /> Karten
              </button>
            </div>
          </div>
        </div>

        {/* Second Track: Search, Sort & Module Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Schulname, Schulleitung, PLZ, Ort, Notiz..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Module Filter Pills */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Alle Module' },
              { id: 'kombi', label: 'Kombi' },
              { id: 'campus', label: 'Campus' },
              { id: 'groovelab', label: 'GrooveLab' }
            ].map(mod => {
              const isSel = moduleFilter === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setModuleFilter(mod.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '100px',
                    border: isSel ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isSel ? '#ecfdf5' : '#f8fafc',
                    color: isSel ? '#047857' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mod.label}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            style={{
              padding: '9px 14px',
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
            <option value="students">Sortierung: Beste Kunden (Aktiv)</option>
            <option value="mrr">Höchster MRR-Umsatz</option>
            <option value="name">Alphabetisch (A - Z)</option>
            <option value="newest">Neueste Registrierungen</option>
            <option value="churn">Längste Inaktivität (Churn-Alarm)</option>
          </select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 5. MAIN CONTENT: APPLE ENTERPRISE DATA-GRID OR VISUAL CARDS            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {filteredSchools.length === 0 ? (
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.90rem',
          border: '1px dashed #cbd5e1',
          borderRadius: '24px',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Building2 size={36} color="#cbd5e1" />
          <strong style={{ color: '#475569', fontSize: '1.05rem' }}>Keine Mandanten gefunden</strong>
          <span>Passen Sie Ihre Filter oder Suchbegriffe an.</span>
        </div>
      ) : viewMode === 'table' ? (
        
        /* ─────────────────────────────────────────────────────────────────────── */
        /* MODE A: APPLE ENTERPRISE DATA-GRID (macOS Numbers / Finder Style)       */
        /* ─────────────────────────────────────────────────────────────────────── */
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.025)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.82rem',
              tableLayout: 'fixed'
            }}>
              <thead>
                <tr style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  <th style={{ padding: '9px 12px', width: '20%' }}>Mandant &amp; Standort</th>
                  <th style={{ padding: '9px 10px', width: '14%' }}>Schulleitung &amp; Kontakt</th>
                  <th style={{ padding: '9px 10px', width: '14%' }}>Vertrag &amp; Aktivität</th>
                  <th style={{ padding: '9px 10px', width: '8%' }}>DSGVO</th>
                  <th style={{ padding: '9px 10px', width: '13%' }}>Nutzer (L / S)</th>
                  <th style={{ padding: '9px 10px', width: '10%' }}>MRR Rate</th>
                  <th style={{ padding: '9px 10px', width: '7%' }}>Notiz</th>
                  <th style={{ padding: '9px 12px', width: '14%', textAlign: 'left' }}>Schnellaktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school, idx) => {
                  const stats = schoolStats[school.id] || {};
                  const teachers = stats.teachers || 0;
                  const totalStudents = stats.students || 0;
                  const campusActive = stats.studentsCampus || 0;
                  const groovelabActive = stats.studentsGroovelab || 0;
                  const activeStudents = Math.max(campusActive, groovelabActive);
                  const passiveStudents = Math.max(0, totalStudents - activeStudents);

                  const isPending = school.is_approved === false || school.status === 'pending';
                  const isPaused = school.is_paused || school.status === 'suspended';
                  const isTrial = isSchoolTrialActive(school) && !isPending;
                  const trialDaysLeft = getDaysUntilTrialExpires(school);
                  const act = getSchoolActivityStatus(school);

                  // MRR Calculation
                  const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(school) : {
                    priceCampus: school.custom_price_campus ?? masterPricing?.priceCampus ?? 14.90,
                    priceGroovelab: school.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 9.90,
                    priceKombi: school.custom_price_kombi ?? masterPricing?.priceKombi ?? 19.90,
                    priceTeacher: school.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
                    priceStudent: school.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
                    pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
                  };

                  const storageAddonGbVal = Number(school.storage_addon_gb || 0);
                  const storageAddonFeeVal = Number(school.storage_addon_monthly_fee || 0);
                  const isBooked = Boolean(school.is_billing_booked) || school.status === 'active';
                  const hasCamp = (isBooked && !school.has_campus_subscription && !school.has_groovelab_subscription) ? true : !!school.has_campus_subscription;
                  const hasGroove = (isBooked && !school.has_campus_subscription && !school.has_groovelab_subscription) ? true : !!school.has_groovelab_subscription;

                  const billingCalc = calculateCampusGroovelabBilling({
                    hasCampusModule: hasCamp,
                    hasGroovelabModule: hasGroove,
                    activeTeacherCount: teachers,
                    activeStudentCount: activeStudents,
                    campusStudentCount: campusActive,
                    groovelabStudentCount: groovelabActive,
                    passiveStudentCount: passiveStudents,
                    storageAddonMonthlyFee: storageAddonFeeVal,
                    rates
                  });

                  const mrr = (isTrial || isSchoolBypassActive(school) || isPaused) ? 0 : billingCalc.totalMonthlySchoolInvoice;
                  const isEditingNote = editingNoteSchoolId === school.id;

                  return (
                    <tr 
                      key={school.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isPending ? '#fffdf7' : isPaused ? '#fcfcfc' : idx % 2 === 1 ? '#fafafa' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = isPending ? '#fffdf7' : isPaused ? '#fcfcfc' : idx % 2 === 1 ? '#fafafa' : '#ffffff'}
                    >
                      {/* Mandant & Ort */}
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div 
                          onClick={() => onSelectSchool(school)}
                          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                        >
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 750 }}>
                            {school.name}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.70rem', color: '#64748b' }}>
                            <span>{school.zip_code || ''} {school.city || 'Standort hinterlegt'}</span>
                            {/* Module Badges */}
                            {school.has_campus_subscription && (
                              <span style={{ fontSize: '0.60rem', background: '#ecfdf5', color: '#059669', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                Campus
                              </span>
                            )}
                            {school.has_groovelab_subscription && (
                              <span style={{ fontSize: '0.60rem', background: '#fefce8', color: '#ca8a04', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                GrooveLab
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Schulleitung & Kontakt */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.76rem' }}>
                            {school.billing_contact_person || 'Schulleitung'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#64748b' }}>
                            {school.phone_number ? (
                              <a 
                                href={`tel:${school.phone_number}`}
                                style={{ color: '#0369a1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              >
                                <Phone size={9} /> {school.phone_number}
                              </a>
                            ) : (
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {school.billing_email || school.email || 'Keine E-Mail'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Vertrag & Aktivität (Semantisch sauber getrennt) */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {/* Vertrags-Status */}
                          {isPending ? (
                            <span style={{ fontSize: '0.64rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Freigabe offen
                            </span>
                          ) : isPaused ? (
                            <span style={{ fontSize: '0.64rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Pausiert
                            </span>
                          ) : isTrial ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                              <span style={{ 
                                fontSize: '0.64rem', 
                                background: trialDaysLeft !== null && trialDaysLeft <= 7 ? '#fef3c7' : '#f1f5f9', 
                                color: trialDaysLeft !== null && trialDaysLeft <= 7 ? '#b45309' : '#475569', 
                                border: '1px solid #e2e8f0',
                                padding: '1px 5px', 
                                borderRadius: '5px', 
                                fontWeight: 800, 
                                width: 'fit-content',
                                whiteSpace: 'nowrap'
                              }}>
                                Testphase {trialDaysLeft !== null ? `(${trialDaysLeft}d)` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickExtendTrial(school, 14)}
                                disabled={extendingTrialId === school.id}
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: '5px',
                                  background: '#fffbeb',
                                  border: '1px solid #fde68a',
                                  color: '#b45309',
                                  fontSize: '0.60rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap'
                                }}
                                className="hover-scale-mini"
                                title="Testphase um +14 Tage Kulanz verlängern"
                              >
                                {extendingTrialId === school.id ? '...' : '+14d'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.64rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Abo Aktiv
                            </span>
                          )}

                          {/* Nutzungs-Aktivität mit Ampel */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: act.color, fontWeight: 750, whiteSpace: 'nowrap' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: act.color, flexShrink: 0 }} />
                            <span>{act.label}</span>
                          </div>
                        </div>
                      </td>

                      {/* Compact DSGVO-AVV Badge */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        {school.avv_signed_at ? (
                          <div 
                            title={`DSGVO-AVV gezeichnet am ${new Date(school.avv_signed_at).toLocaleDateString('de-DE')}${school.avv_signee_name ? ` durch ${school.avv_signee_name}` : ''}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              cursor: 'help',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ShieldCheck size={10} />
                            <span>Gezeichnet</span>
                          </div>
                        ) : (
                          <div 
                            title="Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO noch nicht unterzeichnet"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              cursor: 'help',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ShieldAlert size={10} />
                            <span>Ausstehend</span>
                          </div>
                        )}
                      </td>

                      {/* Nutzer Quoten */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {teachers} Lehrer · {activeStudents} Schüler aktiv
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>{campusActive} Campus</span>
                          <span>·</span>
                          <span style={{ color: '#d97706', fontWeight: 700 }}>{groovelabActive} GL</span>
                          <span>·</span>
                          <span style={{ color: '#94a3b8' }}>{passiveStudents} passiv</span>
                        </div>
                      </td>

                      {/* MRR Rate */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div 
                          style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: '2px' }}
                          onMouseEnter={() => setActiveMrrTooltipSchoolId(school.id)}
                          onMouseLeave={() => setActiveMrrTooltipSchoolId(null)}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: 900,
                              fontVariantNumeric: 'tabular-nums',
                              color: isTrial ? '#64748b' : (mrr > 0 ? '#0f172a' : '#94a3b8'),
                              whiteSpace: 'nowrap'
                            }}>
                              {isTrial ? '0,00 €' : `${mrr.toFixed(2).replace('.', ',')} €`}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 650 }}>
                              / Mo.
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {isTrial ? (
                              <span style={{ fontSize: '0.60rem', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                Testphase
                              </span>
                            ) : school.subscription_bypass ? (
                              <span style={{ fontSize: '0.60rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                Kulanz
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.60rem', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                B2B Zahler
                              </span>
                            )}
                          </div>

                          {/* MRR Breakdown Tooltip */}
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
                              width: '270px',
                              zIndex: 9999,
                              boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
                              lineHeight: '1.5'
                            }}>
                              <div style={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '5px' }}>
                                Kanonische B2B-Kalkulation
                              </div>
                              <div style={{ color: '#16a34a' }}>1. Campus-Groovelab Software: 0,00 €</div>
                              {school.has_campus_subscription && <div>Cloud Campus: {rates.priceCampus.toFixed(2).replace('.', ',')} €</div>}
                              {school.has_groovelab_subscription && <div>Cloud GrooveLab: {rates.priceGroovelab.toFixed(2).replace('.', ',')} €</div>}
                              <div>Service ({teachers} Lehrer): {(teachers * rates.priceTeacher).toFixed(2).replace('.', ',')} €</div>
                              <div>Basis ({passiveStudents} Schüler): {(passiveStudents * rates.pricePassiveStudent).toFixed(2).replace('.', ',')} €</div>
                              {storageAddonFeeVal > 0 && <div>Audio-Tresor Addon: {storageAddonFeeVal.toFixed(2).replace('.', ',')} €</div>}
                              <div style={{ fontWeight: 900, borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '4px', color: '#059669' }}>
                                Summe: {mrr.toFixed(2).replace('.', ',')} € / Mo. {isTrial ? '(In Testphase 0,00 €)' : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Betreiber-Notiz (Inline Editable) */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle', maxWidth: '100px' }}>
                        {isEditingNote ? (
                          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNote(school.id);
                                if (e.key === 'Escape') setEditingNoteSchoolId(null);
                              }}
                              placeholder="Notiz..."
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid #059669',
                                fontSize: '0.70rem',
                                outline: 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNote(school.id)}
                              disabled={savingNote}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '6px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.68rem'
                              }}
                            >
                              <Check size={10} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingNoteSchoolId(school.id);
                              setNoteDraft(school.operator_notes || '');
                            }}
                            style={{ 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              color: school.operator_notes ? '#334155' : '#94a3b8',
                              fontSize: '0.70rem'
                            }}
                            title="Klick zum Bearbeiten der internen Notiz"
                          >
                            <span style={{ 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              maxWidth: '85px'
                            }}>
                              {school.operator_notes || '+ Notiz...'}
                            </span>
                            <Edit3 size={10} color="#94a3b8" />
                          </div>
                        )}
                      </td>

                      {/* Schnellaktionen Toolbar (Fixed Slot Architecture - Fits 100% in Viewport) */}
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'left' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
                          
                          {/* Slot 1: Ghost Support Button (ALWAYS FIRST, FIXED POSITION) */}
                          <button
                            type="button"
                            onClick={() => onStartGhostMode(school)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '7px',
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 2px 5px rgba(2, 132, 199, 0.20)',
                              flexShrink: 0
                            }}
                            className="hover-scale-mini"
                            title="Ghost-Support im neuen Tab autorisieren & starten"
                          >
                            <Eye size={11} /> Ghost
                          </button>

                          {/* Slot 2: 1-Click Magic Invite Copy */}
                          <button
                            type="button"
                            onClick={() => handleRegenerateAndCopyInvite(school)}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '7px',
                              background: copiedInviteId === school.id ? '#ecfdf5' : '#f8fafc',
                              border: copiedInviteId === school.id ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                              color: copiedInviteId === school.id ? '#059669' : '#475569',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            className="hover-scale-mini"
                            title="Magic-Invite erneuern & Schulleiter-Briefing kopieren"
                          >
                            {copiedInviteId === school.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>

                          {/* Slot 3: Status Toggle Switch (Triggers Safety Modal on Suspend) */}
                          {(() => {
                            const isSuspended = school.status === 'suspended' || school.is_paused === true;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isSuspended) {
                                    setSuspendTargetSchool(school);
                                    setSuspendReason('');
                                  } else {
                                    onToggleSchoolStatus(school, 'active');
                                  }
                                }}
                                style={{
                                  position: 'relative',
                                  width: '32px',
                                  height: '18px',
                                  borderRadius: '9px',
                                  background: !isSuspended ? '#10b981' : '#cbd5e1',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'background 0.2s ease',
                                  flexShrink: 0
                                }}
                                title={!isSuspended ? 'Schule pausieren / sperren' : 'Schule reaktivieren'}
                              >
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  transform: !isSuspended ? 'translateX(16px)' : 'translateX(3px)',
                                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }} />
                              </button>
                            );
                          })()}

                          {/* Slot 4: Delete / Archive */}
                          <button
                            type="button"
                            onClick={() => onDeleteSchool(school)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fee2e2',
                              borderRadius: '7px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '5px 7px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            className="hover-scale-mini"
                            title="Schule archivieren / löschen"
                          >
                            <Trash2 size={11} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        /* ─────────────────────────────────────────────────────────────────────── */
        /* MODE B: APPLE HIG VISUAL CARDS GRID                                     */
        /* ─────────────────────────────────────────────────────────────────────── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '16px'
        }}>
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
            const isTrial = isSchoolTrialActive(school) && !isPending;
            const trialDaysLeft = getDaysUntilTrialExpires(school);
            const act = getSchoolActivityStatus(school);

            const rates = masterPricing?.getSchoolRates ? masterPricing.getSchoolRates(school) : {
              priceCampus: school.custom_price_campus ?? masterPricing?.priceCampus ?? 14.90,
              priceGroovelab: school.custom_price_groovelab ?? masterPricing?.priceGroovelab ?? 9.90,
              priceKombi: school.custom_price_kombi ?? masterPricing?.priceKombi ?? 19.90,
              priceTeacher: school.custom_price_teacher ?? masterPricing?.priceTeacher ?? 0.49,
              priceStudent: school.custom_price_student ?? masterPricing?.priceStudent ?? 0.49,
              pricePassiveStudent: masterPricing?.pricePassiveStudent ?? 0.09
            };

            const isBooked = Boolean(school.is_billing_booked) || school.status === 'active';
            const hasCamp = (isBooked && !school.has_campus_subscription && !school.has_groovelab_subscription) ? true : !!school.has_campus_subscription;
            const hasGroove = (isBooked && !school.has_campus_subscription && !school.has_groovelab_subscription) ? true : !!school.has_groovelab_subscription;

            const billingCalc = calculateCampusGroovelabBilling({
              hasCampusModule: hasCamp,
              hasGroovelabModule: hasGroove,
              activeTeacherCount: teachers,
              activeStudentCount: activeStudents,
              campusStudentCount: campusActive,
              groovelabStudentCount: groovelabActive,
              passiveStudentCount: passiveStudents,
              storageAddonMonthlyFee: Number(school.storage_addon_monthly_fee || 0),
              rates
            });

            const mrr = (isTrial || isSchoolBypassActive(school) || isPaused) ? 0 : billingCalc.totalMonthlySchoolInvoice;
            const isEditingNote = editingNoteSchoolId === school.id;

            return (
              <div
                key={school.id}
                style={{
                  background: isPending ? '#fffdf7' : isPaused ? '#fcfcfc' : '#ffffff',
                  border: isPending ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale-mini"
              >
                {/* Card Top: Title & Status */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div 
                      onClick={() => onSelectSchool(school)}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.02em', display: 'block' }}>
                        {school.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {school.zip_code || ''} {school.city || 'Standort hinterlegt'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: mrr > 0 ? '#059669' : '#64748b',
                        background: mrr > 0 ? '#ecfdf5' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        border: mrr > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                      }}>
                        {mrr.toFixed(2)} € / Mo.
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: act.color, fontWeight: 700 }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: act.color }} />
                        <span>{act.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & AVV Status Row */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '10px', 
                    padding: '8px 10px', 
                    borderRadius: '12px', 
                    background: '#f8fafc',
                    fontSize: '0.74rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {school.billing_contact_person || 'Schulleitung'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.70rem' }}>
                        {school.phone_number || school.billing_email || school.email || 'Keine Kontaktdaten'}
                      </div>
                    </div>

                    {school.avv_signed_at ? (
                      <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#059669', padding: '2px 7px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <ShieldCheck size={11} /> AVV Gezeichnet
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', background: '#fffbeb', color: '#b45309', padding: '2px 7px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <ShieldAlert size={11} /> AVV Offen
                      </span>
                    )}
                  </div>

                  {/* Quotas & Modules */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.74rem', color: '#475569' }}>
                    <span>{teachers} Lehrer • {activeStudents} Aktiv ({passiveStudents} Passiv)</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {school.has_campus_subscription && (
                        <span style={{ fontSize: '0.62rem', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                          Campus
                        </span>
                      )}
                      {school.has_groovelab_subscription && (
                        <span style={{ fontSize: '0.62rem', background: '#fefce8', color: '#ca8a04', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                          GrooveLab
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Note */}
                  <div style={{ marginTop: '10px' }}>
                    {isEditingNote ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(school.id);
                            if (e.key === 'Escape') setEditingNoteSchoolId(null);
                          }}
                          placeholder="Notiz eingeben..."
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1px solid #059669',
                            fontSize: '0.74rem',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(school.id)}
                          disabled={savingNote}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.70rem'
                          }}
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingNoteSchoolId(school.id);
                          setNoteDraft(school.operator_notes || '');
                        }}
                        style={{ 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: school.operator_notes ? '#334155' : '#94a3b8',
                          fontSize: '0.74rem',
                          background: '#fafafa',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9'
                        }}
                        title="Klick zum Bearbeiten der internen Notiz"
                      >
                        <Edit3 size={11} color="#94a3b8" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {school.operator_notes || 'Interne Notiz hinzufügen...'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => onStartGhostMode(school)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={12} /> Ghost
                  </button>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isTrial && (
                      <button
                        type="button"
                        onClick={() => handleQuickExtendTrial(school, 14)}
                        disabled={extendingTrialId === school.id}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        title="Kulanz +14 Tage"
                      >
                        +14d
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRegenerateAndCopyInvite(school)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: copiedInviteId === school.id ? '#ecfdf5' : '#f8fafc',
                        border: copiedInviteId === school.id ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        color: copiedInviteId === school.id ? '#059669' : '#475569',
                        cursor: 'pointer'
                      }}
                      title="Magic-Invite kopieren"
                    >
                      {copiedInviteId === school.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (school.status === 'active') {
                          setSuspendTargetSchool(school);
                          setSuspendReason('');
                        } else {
                          onToggleSchoolStatus(school, 'active');
                        }
                      }}
                      style={{
                        position: 'relative',
                        width: '34px',
                        height: '18px',
                        borderRadius: '9px',
                        background: school.status === 'active' ? '#10b981' : '#cbd5e1',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={school.status === 'active' ? 'Pausieren' : 'Aktivieren'}
                    >
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        transform: school.status === 'active' ? 'translateX(18px)' : 'translateX(3px)',
                        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSchool(school)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: '8px',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '5px 7px'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 6. SLIDE-OVER MODAL: PROVISION NEW SCHOOL                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showProvisionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.22)',
            border: '1px solid #e2e8f0',
            maxWidth: '560px',
            width: '100%',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Neue Musikschule provisionieren
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Legt einen neuen Mandanten an und generiert ein sofortiges Bereitstellungs-Kit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Name der Musikschule *
                </label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="z. B. Musikakademie Freiburg"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {/* PLZ & Ort */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={newSchoolZip}
                    onChange={(e) => setNewSchoolZip(e.target.value)}
                    placeholder="79098"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Ort
                  </label>
                  <input
                    type="text"
                    value={newSchoolCity}
                    onChange={(e) => setNewSchoolCity(e.target.value)}
                    placeholder="Freiburg"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Schulleiter & Telefon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Schulleiter / Kontaktperson
                  </label>
                  <input
                    type="text"
                    value={newSchoolContact}
                    onChange={(e) => setNewSchoolContact(e.target.value)}
                    placeholder="z. B. Michael Weber"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Telefonnummer / Handy
                  </label>
                  <input
                    type="tel"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    placeholder="0761 1234567"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* E-Mail */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Schulleiter E-Mail
                </label>
                <input
                  type="email"
                  value={newSchoolEmail}
                  onChange={(e) => setNewSchoolEmail(e.target.value)}
                  placeholder="leitung@musikakademie.de"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Modulpaket Segmented */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
                  Modulpaket
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'none', label: 'Ungebucht' },
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
                          padding: '9px',
                          borderRadius: '12px',
                          border: isSel ? '1.5px solid #059669' : '1px solid #cbd5e1',
                          background: isSel ? '#ecfdf5' : '#ffffff',
                          color: isSel ? '#059669' : '#475569',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Testphase Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
                  Testphase &amp; Modus
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

              {/* Interne Betreiber-Notiz */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Interne Betreiber-Notiz (Optional)
                </label>
                <input
                  type="text"
                  value={newSchoolNotes}
                  onChange={(e) => setNewSchoolNotes(e.target.value)}
                  placeholder="z. B. Erstkontakt Telefonat: Ziel ist Kombi-Paket für 50 Schüler"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={provisioning}
                style={{
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.28)',
                  marginTop: '8px'
                }}
              >
                <Plus size={16} />
                <span>{provisioning ? 'Wird provisioniert...' : 'Schule anlegen & Einladungs-Kit generieren'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 7. POPUP: NO-EMAIL BEREITSTELLUNGS-KIT                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {magicInviteData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.50)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
            maxWidth: '560px',
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
                <h3 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 800, color: '#0f172a' }}>
                  Schule erfolgreich angelegt!
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Bereitstellungs-Kit für „{magicInviteData.schoolName}“ generiert.
                </p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                Persönlicher Einladungs-Link (14 Tage gültig)
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
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(magicInviteData.loginUrl);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2500);
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {inviteCopied ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </div>

            {/* Ready Briefing Copy for Mail / Messenger */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Vorformulierter Übergabe-Text für die Schulleitung
              </span>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {`Guten Tag ${magicInviteData.contactPerson},\n\nhier ist Ihr persönlicher Einrichtungs- und Aktivierungszugang für Campus-Groovelab an der Musikschule ${magicInviteData.schoolName}:\n👉 ${magicInviteData.loginUrl}\n\nDieser gesicherte Einladungslink ist für 14 Tage gültig. Der 3-Schritte-Assistent führt Sie direkt durch das Setup und die DSGVO-AVV-Gegenzeichnung.`}
              </p>

              <button
                type="button"
                onClick={() => {
                  const briefingText = `Guten Tag ${magicInviteData.contactPerson},\n\nhier ist Ihr persönlicher Einrichtungs- und Aktivierungszugang für Campus-Groovelab an der Musikschule ${magicInviteData.schoolName}:\n👉 ${magicInviteData.loginUrl}\n\nDieser gesicherte Einladungslink ist für 14 Tage gültig. Der 3-Schritte-Assistent führt Sie direkt durch das Setup und die DSGVO-AVV-Gegenzeichnung.\n\nBei Fragen unterstützen wir Sie jederzeit gerne!\n\nHerzliche Grüße,\nPatrick Huber | Campus-Groovelab Leitstand`;
                  navigator.clipboard.writeText(briefingText);
                  setBriefingCopied(true);
                  setTimeout(() => setBriefingCopied(false), 2500);
                }}
                style={{
                  marginTop: '12px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: briefingCopied ? '#059669' : '#ffffff',
                  color: briefingCopied ? '#ffffff' : '#1e293b',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {briefingCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{briefingCopied ? 'Briefing-Text kopiert!' : 'Fertigen Briefing-Text kopieren'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMagicInviteData(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 8. SICHERHEITS-MODAL: MANDANTEN PAUSIEREN / SPERREN                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {suspendTargetSchool && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
            border: '1px solid #fee2e2',
            maxWidth: '520px',
            width: '100%',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 800, color: '#991b1b' }}>
                  Mandanten pausieren &amp; sperren?
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Sperrung für „{suspendTargetSchool.name}“.
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              Achtung: Durch die Pausierung werden <strong>alle aktiven Sitzungen</strong> von Lehrkräften und Schülern dieser Schule sofort beendet. Der Zugang wird gesperrt.
            </p>

            <form onSubmit={handleConfirmSuspend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Pflichtangabe: Grund für die Sperrung *
                </label>
                <input
                  type="text"
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="z. B. Zahlungsverzug nach 2. Mahnung / Sommerpause auf Kundenwunsch"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSuspendTargetSchool(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>

                <button
                  type="submit"
                  disabled={suspending}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)'
                  }}
                >
                  {suspending ? 'Wird gesperrt...' : 'Mandanten kostenpflichtig sperren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
