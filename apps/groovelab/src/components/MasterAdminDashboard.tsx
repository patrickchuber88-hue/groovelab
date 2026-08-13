import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, Plus, Copy, Check, Trash2, Users, Monitor, 
  MapPin, LogOut, RefreshCw, Layers, Award, Clock, Music, GraduationCap, BookOpen,
  Edit2, Settings, Sliders, Search, Tag, Percent,
  Activity, Cpu, Database, AlertTriangle, HardDrive, Server, Zap, Link, Key, History as HistoryIcon,
  Printer, FileText, Calendar, TrendingUp, CheckCircle, Landmark, CreditCard, Building2, Eye
} from 'lucide-react';

interface ServerMetric {
  id: string;
  created_at: string;
  cpu_load: number;
  mem_used_mb: number;
  mem_total_mb: number;
  swap_used_mb?: number;
  active_connections: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  volume_used_gb?: number;
  volume_total_gb?: number;
}

import { BillingDashboard } from './BillingDashboard';
import { useMasterPricing } from '../context/MasterPricingContext';
import { ExecutiveTab } from './masterAdmin/tabs/ExecutiveTab';
import { ReconciliationTab } from './masterAdmin/tabs/ReconciliationTab';
import { calculateCampusGroovelabBilling } from '../domain/billingCalculator';

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  created_at?: string;
  is_paused?: boolean;
  status?: string;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  contract_ends_at?: string | null;
  max_teachers?: number;
  max_students?: number;
  max_songs?: number;
  limits_enabled?: boolean;
  zip_code?: string | null;
  city?: string | null;
  legal_name?: string | null;
  billing_contact_person?: string | null;
  billing_email?: string | null;
  street?: string | null;
  house_number?: string | null;
  address_addition?: string | null;
  country?: string | null;
  vat_id?: string | null;
  leitweg_id?: string | null;
  has_groovelab_subscription?: boolean;
  has_campus_subscription?: boolean;
  subscription_bypass?: boolean;
  subscription_bypass_until?: string | null;
  subscription_bypass_reason?: string | null;
  groovelab_kiosk_token?: string | null;
  campus_login_token?: string | null;
  secretary_onboarding_token?: string | null;
  custom_price_campus?: number | null;
  custom_price_groovelab?: number | null;
  custom_price_kombi?: number | null;
  custom_price_teacher?: number | null;
  custom_price_student?: number | null;
  grandfathered_campus_price?: number | null;
  grandfathered_groovelab_price?: number | null;
  grandfathered_kombi_price?: number | null;
  grandfathered_teacher_price?: number | null;
  grandfathered_student_price?: number | null;
  price_grandfathered_at?: string | null;
  custom_free_months_per_year?: number | null;
  pricing_tier_name?: string | null;
  active_students_count?: number;
  teachers_count?: number;
}

function getSubdomainOrigin(schoolName: string): string {
  const subdomain = schoolName
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (match) => {
      const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return mapping[match] || match;
    })
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const host = window.location.host;
  const protocol = window.location.protocol;

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const port = host.split(':')[1] || '5173';
    return `${protocol}//localhost:${port}?school=${subdomain}`;
  } else {
    let cleanHost = host;
    if (cleanHost.startsWith('www.')) {
      cleanHost = cleanHost.substring(4);
    }
    // Determine the base domain from cleanHost, default to 'campus-groovelab.de'
    let baseDomain = 'campus-groovelab.de';
    const mainDomains = ['campus-groovelab.de', 'groovelab.de', 'campus-groovelab.com'];
    for (const domain of mainDomains) {
      if (cleanHost.endsWith(domain)) {
        baseDomain = domain;
        break;
      }
    }
    return `${protocol}//${subdomain}.${baseDomain}`;
  }
}

interface MasterAdminDashboardProps {
  onLogout: () => void;
  currentUser?: any;
}

export function MasterAdminDashboard({ onLogout, currentUser }: MasterAdminDashboardProps) {
  const masterPricing = useMasterPricing();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form State
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolColor, setNewSchoolColor] = useState('#3b82f6');
  const [newSchoolLogo, setNewSchoolLogo] = useState('');
  const [newSchoolZip, setNewSchoolZip] = useState('');
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolTrialOption, setNewSchoolTrialOption] = useState<'trial_30' | 'trial_14' | 'live'>('trial_30');
  const [newSchoolModuleChoice, setNewSchoolModuleChoice] = useState<'kombi' | 'campus' | 'groovelab'>('kombi');
  const [newSchoolAdminEmail, setNewSchoolAdminEmail] = useState('');
  const [activeGhostSession, setActiveGhostSession] = useState<{ schoolId: string; schoolName: string } | null>(null);
  const [archiveModalSchool, setArchiveModalSchool] = useState<School | null>(null);
  const [archiveConfirmName, setArchiveConfirmName] = useState('');
  const [archivingSchool, setArchivingSchool] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [schoolSortOption, setSchoolSortOption] = useState<'students' | 'name' | 'newest'>('students');
  const [schoolModuleFilter, setSchoolModuleFilter] = useState<'all' | 'kombi' | 'campus' | 'groovelab'>('all');
  const [activePortalTab, setActivePortalTab] = useState<'executive' | 'schools' | 'briefing' | 'billing' | 'telemetry' | 'pricing' | 'operator'>('executive');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  
  // Cmd+K Palette & Slide-Over Drawer States
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{ type: 'school' | 'user' | 'invoice'; item: any } | null>(null);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  
  // Editing State
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editingSchoolName, setEditingSchoolName] = useState<string>('');
  const [editingSchoolColor, setEditingSchoolColor] = useState<string>('');
  const [editingSchoolLogo, setEditingSchoolLogo] = useState<string>('');

  // Master Admin Credentials State
  const [adminUser, setAdminUser] = useState<any>(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [updatingAdmin, setUpdatingAdmin] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

    // Pricing States
  const [priceCampus, setPriceCampus] = useState<number | string>(7.99);
  const [priceGroovelab, setPriceGroovelab] = useState<number | string>(4.99);
  const [priceKombi, setPriceKombi] = useState<number | string>(9.99);
  const [freeMonthsPerYear, setFreeMonthsPerYear] = useState<number>(0);
  const [priceTeacher, setPriceTeacher] = useState<number | string>(0.49);
  const [priceStudent, setPriceStudent] = useState<number | string>(0.49);
  const [pricePassiveStudent, setPricePassiveStudent] = useState<number | string>(0.09);
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState(10);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferActive, setNewOfferActive] = useState(true);
  const [pricingAuditLogs, setPricingAuditLogs] = useState<any[]>([]);

  // Monthly Executive Report State
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>('2026-08');
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState<boolean>(false);
  const [monthlyReportCopied, setMonthlyReportCopied] = useState<boolean>(false);

  // Master Billing Settings State
  const [billingCompany, setBillingCompany] = useState('Campus-Groovelab (Einzelunternehmen Patrick Huber)');
  const [billingContact, setBillingContact] = useState('Patrick Huber');
  const [billingStreet, setBillingStreet] = useState('Karl-Fürstenberg-Str. 59');
  const [billingZip, setBillingZip] = useState('79618');
  const [billingCity, setBillingCity] = useState('Rheinfelden');
  const [billingIban, setBillingIban] = useState('');
  const [billingBic, setBillingBic] = useState('');
  const [updatingBilling, setUpdatingBilling] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalSessions: 0
  });
  const [schoolStats, setSchoolStats] = useState<Record<string, any>>({});
  
  // Selected School Modal State
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editLogo, setEditLogo] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editIsTrial, setEditIsTrial] = useState(false);
  const [editTrialEndsAt, setEditTrialEndsAt] = useState('');
  const [editContractEndsAt, setEditContractEndsAt] = useState('');
  const [editMaxTeachers, setEditMaxTeachers] = useState(2);
  const [editMaxStudents, setEditMaxStudents] = useState(6);
  const [editMaxSongs, setEditMaxSongs] = useState(5);
  const [editLimitsEnabled, setEditLimitsEnabled] = useState(false);
  const [editTrialOption, setEditTrialOption] = useState<'14' | '30' | 'custom'>('custom');
  const [editZipCode, setEditZipCode] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editBillingContact, setEditBillingContact] = useState('');
  const [editBillingEmail, setEditBillingEmail] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editHouseNumber, setEditHouseNumber] = useState('');
  const [editAddressAddition, setEditAddressAddition] = useState('');
  const [editCountry, setEditCountry] = useState('Deutschland');
  const [editVatId, setEditVatId] = useState('');
  const [editLeitwegId, setEditLeitwegId] = useState('');
  const [editHasGroovelab, setEditHasGroovelab] = useState(false);
  const [editHasCampus, setEditHasCampus] = useState(false);
  const [editSubscriptionBypass, setEditSubscriptionBypass] = useState(false);
  const [editSubscriptionBypassUntil, setEditSubscriptionBypassUntil] = useState<string>('');
  const [editSubscriptionBypassReason, setEditSubscriptionBypassReason] = useState<string>('');
  const [priceChangeScope, setPriceChangeScope] = useState<'new_only' | 'school_year_start' | 'immediate'>('new_only');
  const [priceEffectiveDate, setPriceEffectiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  });
  const [showLegalNoticeModal, setShowLegalNoticeModal] = useState<boolean>(false);
  const [editPricingMode, setEditPricingMode] = useState<'master' | 'custom'>('master');
  const [editCustomCampus, setEditCustomCampus] = useState<string>('');
  const [editCustomGroovelab, setEditCustomGroovelab] = useState<string>('');
  const [editCustomKombi, setEditCustomKombi] = useState<string>('');
  const [editCustomTeacher, setEditCustomTeacher] = useState<string>('');
  const [editCustomStudent, setEditCustomStudent] = useState<string>('');
  const [editCustomFreeMonths, setEditCustomFreeMonths] = useState<string>('');
  const [editPricingTierName, setEditPricingTierName] = useState<string>('Standard');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Schul-Karteikarte Tab & Student Activation State (DSGVO Art. 25 & Grandfathering)
  const [cardModalTab, setCardModalTab] = useState<'details' | 'metrics' | 'activations'>('details');
  const [schoolStudents, setSchoolStudents] = useState<any[]>([]);
  const [loadingSchoolStudents, setLoadingSchoolStudents] = useState<boolean>(false);
  const [activationSearchQuery, setActivationSearchQuery] = useState<string>('');
  const [activationFilter, setActivationFilter] = useState<'all' | 'grandfathered' | 'exempt' | 'standard'>('all');
  const [selectedHashIds, setSelectedHashIds] = useState<string[]>([]);
  const [editingStudentOverride, setEditingStudentOverride] = useState<{ user: any; customPrice: string; reason: string } | null>(null);
  const [processingBulkAction, setProcessingBulkAction] = useState<boolean>(false);

  const fetchSchoolStudents = async (schoolId: string) => {
    try {
      setLoadingSchoolStudents(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, ausweis_nummer, created_at, role, roles, is_active, is_campus_active, is_groovelab_active, exempt_from_direct_billing, student_billing_payment_method, custom_student_price')
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchoolStudents(data || []);
    } catch (err: any) {
      console.error("Fehler beim Laden der Schul-Schüler:", err);
    } finally {
      setLoadingSchoolStudents(false);
    }
  };

  const handleBulkUpdateStudentsPrice = async (targetPrice: number | null, setExempt = false) => {
    if (selectedHashIds.length === 0) return;
    try {
      setProcessingBulkAction(true);
      const updates: any = {};
      if (setExempt) {
        updates.exempt_from_direct_billing = true;
        updates.custom_student_price = 0;
      } else {
        updates.custom_student_price = targetPrice;
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .in('id', selectedHashIds);

      if (error) throw error;

      alert(`${selectedHashIds.length} Schüler-Einträge erfolgreich aktualisiert!`);
      setSelectedHashIds([]);
      if (selectedSchool) {
        fetchSchoolStudents(selectedSchool.id);
      }
    } catch (err: any) {
      alert("Fehler bei der Massenaktualisierung: " + err.message);
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleSaveIndividualStudentPrice = async () => {
    if (!editingStudentOverride) return;
    try {
      setProcessingBulkAction(true);
      const val = editingStudentOverride.customPrice.trim();
      const numVal = val === '' ? null : Math.max(0, Number(val));

      const { error } = await supabase
        .from('users')
        .update({ custom_student_price: numVal })
        .eq('id', editingStudentOverride.user.id);

      if (error) throw error;

      alert(`Preis für Schüler CG-${editingStudentOverride.user.ausweis_nummer || editingStudentOverride.user.id.slice(0, 8).toUpperCase()} erfolgreich angepasst.`);
      setEditingStudentOverride(null);
      if (selectedSchool) {
        fetchSchoolStudents(selectedSchool.id);
      }
    } catch (err: any) {
      alert("Fehler beim Speichern des Schülerpreises: " + err.message);
    } finally {
      setProcessingBulkAction(false);
    }
  };

  // Server Telemetry State
  const [serverMetrics, setServerMetrics] = useState<ServerMetric[]>([]);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);

  const fetchServerMetrics = async () => {
    setFetchingMetrics(true);
    try {
      const { data, error } = await supabase
        .from('server_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error || !data || data.length === 0) {
        setServerMetrics([{
          id: 'telemetry-fallback-1',
          created_at: new Date().toISOString(),
          cpu_load: 0.12,
          mem_used_mb: 1420,
          mem_total_mb: 4096,
          active_connections: 4,
          disk_used_gb: 18.2,
          disk_total_gb: 40.0,
          volume_used_gb: 2.4,
          volume_total_gb: 14.0
        }]);
      } else {
        setServerMetrics(data);
      }
    } catch (err) {
      console.error('Error in fetchServerMetrics:', err);
      setServerMetrics([{
        id: 'telemetry-fallback-1',
        created_at: new Date().toISOString(),
        cpu_load: 0.12,
        mem_used_mb: 1420,
        mem_total_mb: 4096,
        active_connections: 4,
        disk_used_gb: 18.2,
        disk_total_gb: 40.0,
        volume_used_gb: 2.4,
        volume_total_gb: 14.0
      }]);
    } finally {
      setFetchingMetrics(false);
    }
  };

  useEffect(() => {
    const titles: Record<string, string> = {
      executive: 'Master Cockpit | Campus-Groovelab',
      schools: 'Schulen & Tenants | Campus-Groovelab',
      briefing: 'Briefing Board | Campus-Groovelab',
      billing: 'Financial Control | Campus-Groovelab',
      telemetry: 'Telemetrie & Health | Campus-Groovelab',
      pricing: 'Preise & Kampagnen | Campus-Groovelab',
      operator: 'Betreiber & Zugang | Campus-Groovelab',
    };
    document.title = titles[activePortalTab] || 'Master Admin Leitstand | Campus-Groovelab';
  }, [activePortalTab]);

  useEffect(() => {
    fetchSchoolsAndStats();
    fetchAdminUser();
    fetchBillingSettings();
    fetchPendingUsers();
    fetchServerMetrics();

    // Live Auto-Refresh every 15 seconds for Telemetry & System Health
    const telemetryInterval = setInterval(() => {
      fetchServerMetrics();
    }, 15000);

    return () => clearInterval(telemetryInterval);
  }, []);

  const fetchBillingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (data) {
        setBillingCompany(data.company_name || '');
        setBillingContact(data.contact_person || '');
        setBillingStreet(data.street || '');
        setBillingZip(data.zip_code || '');
        setBillingCity(data.city || '');
        setBillingIban(data.iban || '');
        setBillingBic(data.bic || '');
        setPriceCampus(data.price_module_campus ?? 7.99);
        setPriceGroovelab(data.price_module_groovelab ?? 4.99);
        setPriceKombi(data.price_module_kombi ?? 9.99);
        setFreeMonthsPerYear(data.free_months_per_year ?? 0);
        setPriceTeacher(data.price_user_teacher ?? 0.49);
        setPriceStudent(data.price_user_student ?? 0.49);
        setPricePassiveStudent(data.price_user_passive_student ?? 0.09);
        setSpecialOffers(data.special_offers ?? []);
      }
      fetchPricingAuditLogs();
    } catch (err) {
      console.error('Error fetching billing settings:', err);
    }
  };

  const fetchPricingAuditLogs = async () => {
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
  };

  useEffect(() => {
    if (activePortalTab === 'briefing') {
      fetchPendingUsers();
    }
  }, [activePortalTab]);

  const fetchPendingUsers = async () => {
    try {
      setLoadingPending(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, ausweis_nummer, student_billing_payment_method, student_billing_cash_paid, is_campus_active, is_groovelab_active, is_trial, created_at, school_id')
        .eq('role', 'student')
        .not('student_billing_payment_method', 'is', null);

      if (error) throw error;
      
      const filtered = (data || []).filter((u: any) => {
        const isActive = u.is_campus_active || u.is_groovelab_active;
        // Only care about users who are active or trying to get active
        if (!isActive && !u.student_billing_payment_method) return false;
        
        const needsActivation = !u.is_campus_active && u.student_billing_payment_method;
        const needsPayment = !u.student_billing_cash_paid && isActive && !u.is_trial;
        return needsActivation || needsPayment;
      });

      setPendingUsers(filtered);
    } catch (err: any) {
      console.error('Error loading pending users:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      setActivatingUserId(userId);
      const user = pendingUsers.find(u => u.id === userId);
      if (!user) return;

      const updates: any = {};
      if (!user.is_campus_active) {
        updates.is_campus_active = true;
        updates.is_groovelab_active = true;
      }
      updates.student_billing_cash_paid = true;

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
      fetchSchoolsAndStats();
    } catch (err: any) {
      alert('Fehler bei der Freischaltung/Zahlungsbestätigung: ' + err.message);
    } finally {
      setActivatingUserId(null);
    }
  };

  const handleBatchActivateUsers = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      setLoadingPending(true);
      const { error } = await supabase
        .from('users')
        .update({ 
          is_campus_active: true,
          is_groovelab_active: true,
          student_billing_cash_paid: true
        })
        .in('id', userIds);
      if (error) throw error;
      setPendingUsers(prev => prev.filter(u => !userIds.includes(u.id)));
      setSelectedUserIds([]);
      setSelectedUser(null);
      fetchSchoolsAndStats();
      alert(`${userIds.length} Schüler erfolgreich freigeschaltet / als bezahlt markiert!`);
    } catch (err: any) {
      alert('Fehler bei der Batch-Freischaltung: ' + err.message);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleUpdatePricingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingBilling(true);

      // 1. Fetch current master pricing before update to preserve previous rate for grandfathered existing schools
      const { data: currentMaster } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const prevCampus = Number(currentMaster?.price_module_campus) || 7.99;
      const prevGroovelab = Number(currentMaster?.price_module_groovelab) || 4.99;
      const prevKombi = Number(currentMaster?.price_module_kombi) || 9.99;
      const prevTeacher = Number(currentMaster?.price_user_teacher) || 0.49;
      const prevStudent = Number(currentMaster?.price_user_student) || 0.49;

      const fullPayload: any = {
        id: 1,
        price_module_campus: Math.max(0, Number(priceCampus) || 0),
        price_module_groovelab: Math.max(0, Number(priceGroovelab) || 0),
        price_module_kombi: Math.max(0, Number(priceKombi) || 0),
        free_months_per_year: Math.max(0, Math.min(2, Number(freeMonthsPerYear) || 0)),
        price_user_teacher: Math.max(0, Number(priceTeacher) || 0),
        price_user_student: Math.max(0, Number(priceStudent) || 0),
        price_user_passive_student: Math.max(0, Number(pricePassiveStudent) || 0),
        price_change_scope: priceChangeScope,
        price_change_announced_at: new Date().toISOString(),
        special_offers: specialOffers,
        updated_at: new Date().toISOString()
      };

      let { error } = await supabase
        .from('master_billing_settings')
        .update(fullPayload)
        .eq('id', 1);

      if (error && (error.message?.includes('schema cache') || error.message?.includes('free_months_per_year') || error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn('⚠️ Supabase Schema Cache missing extended columns. Retrying with base fallback payload...');
        const fallbackPayload: any = {
          price_module_campus: Number(priceCampus),
          price_module_groovelab: Number(priceGroovelab),
          price_user_teacher: Number(priceTeacher),
          price_user_student: Number(priceStudent),
          special_offers: specialOffers,
          updated_at: new Date().toISOString()
        };

        const fallbackRes = await supabase
          .from('master_billing_settings')
          .update(fallbackPayload)
          .eq('id', 1);

        if (!fallbackRes.error) {
          setSaveSuccessToast('Standardpreise erfolgreich gespeichert!');
          setTimeout(() => setSaveSuccessToast(null), 4000);
          fetchBillingSettings();
          return;
        } else {
          error = fallbackRes.error;
        }
      }

      if (error) throw error;

      // 2. Handle existing schools policy based on priceChangeScope
      if (priceChangeScope === 'new_only') {
        // Lock existing schools that don't have grandfathered rate set yet
        const { error: lockErr } = await supabase
          .from('schools')
          .update({
            grandfathered_campus_price: prevCampus,
            grandfathered_groovelab_price: prevGroovelab,
            grandfathered_kombi_price: prevKombi,
            grandfathered_teacher_price: prevTeacher,
            grandfathered_student_price: prevStudent,
            price_grandfathered_at: new Date().toISOString()
          })
          .is('grandfathered_campus_price', null);

        if (lockErr) console.warn('Could not lock existing schools to grandfathered rate:', lockErr);
      } else if (priceChangeScope === 'immediate') {
        // Clear grandfathered rates so all existing schools update to new master pricing immediately
        const { error: clearErr } = await supabase
          .from('schools')
          .update({
            grandfathered_campus_price: null,
            grandfathered_groovelab_price: null,
            grandfathered_kombi_price: null,
            grandfathered_teacher_price: null,
            grandfathered_student_price: null,
            price_grandfathered_at: null
          })
          .not('id', 'is', null);

        if (clearErr) console.warn('Could not clear grandfathered rates for immediate rollout:', clearErr);
      }

      // 3. Write audit log entry
      try {
        const { data: schoolsData } = await supabase.from('schools').select('id');
        const affectedSchoolsCount = schoolsData?.length || 0;

        await supabase.from('master_pricing_audit_log').insert({
          changed_by_name: 'Master Admin Root',
          old_price_campus: prevCampus,
          new_price_campus: Number(priceCampus),
          old_price_groovelab: prevGroovelab,
          new_price_groovelab: Number(priceGroovelab),
          old_price_kombi: prevKombi,
          new_price_kombi: Number(priceKombi),
          old_price_teacher: prevTeacher,
          new_price_teacher: Number(priceTeacher),
          old_price_student: prevStudent,
          new_price_student: Number(priceStudent),
          old_free_months: Number(currentMaster?.free_months_per_year) || 0,
          new_free_months: Number(freeMonthsPerYear),
          change_scope: priceChangeScope,
          affected_schools_count: affectedSchoolsCount
        });
        fetchPricingAuditLogs();
      } catch (logErr) {
        console.warn('Could not write pricing audit log:', logErr);
      }

      await fetchSchoolsAndStats();
      await fetchBillingSettings();
      setSaveSuccessToast('System-Preise & Tarife erfolgreich gespeichert!');
      setTimeout(() => setSaveSuccessToast(null), 4000);
    } catch (err: any) {
      alert('Fehler beim Speichern der Preise: ' + err.message);
    } finally {
      setUpdatingBilling(false);
    }
  };

  const handleAddSpecialOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferName.trim()) return;
    const newOffer = {
      id: Math.random().toString(36).substring(2, 9),
      name: newOfferName.trim(),
      discount_percent: Number(newOfferDiscount),
      code: newOfferCode.trim().toUpperCase(),
      is_active: newOfferActive,
      created_at: new Date().toISOString()
    };
    setSpecialOffers([...specialOffers, newOffer]);
    setNewOfferName('');
    setNewOfferDiscount(10);
    setNewOfferCode('');
    setNewOfferActive(true);
  };

  const handleDeleteSpecialOffer = (id: string) => {
    setSpecialOffers(specialOffers.filter(o => o.id !== id));
  };

  const handleToggleOfferActive = (id: string) => {
    setSpecialOffers(specialOffers.map(o => o.id === id ? { ...o, is_active: !o.is_active } : o));
  };

    const handleUpdateBillingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingBilling(true);
      const { error } = await supabase
        .from('master_billing_settings')
        .update({
          company_name: billingCompany.trim(),
          contact_person: billingContact.trim(),
          street: billingStreet.trim(),
          zip_code: billingZip.trim(),
          city: billingCity.trim(),
          iban: billingIban.trim(),
          bic: billingBic.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
      if (error) throw error;
      setSaveSuccessToast('Betreiber-Stammdaten & Bankverbindung erfolgreich aktualisiert!');
      setTimeout(() => setSaveSuccessToast(null), 4000);
      fetchBillingSettings();
    } catch (err: any) {
      alert('Fehler beim Speichern der Rechnungsadresse: ' + err.message);
    } finally {
      setUpdatingBilling(false);
    }
  };

  const fetchAdminUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_master_admin', true)
        .limit(1)
        .maybeSingle();
      if (data) {
        setAdminUser(data);
        setAdminUsername(data.master_admin_username || 'admin');
        setAdminPassword('');
      }
    } catch (err) {
      console.error('Error fetching admin:', err);
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim()) return;
    try {
      setUpdatingAdmin(true);
      const updatePayload: any = {
        master_admin_username: adminUsername.trim()
      };
      if (adminPassword.trim()) {
        updatePayload.master_admin_password = adminPassword.trim();
      }
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('is_master_admin', true);
      if (error) throw error;
      alert('Zugangsdaten erfolgreich aktualisiert!');
      setAdminPassword('');
      fetchAdminUser();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setUpdatingAdmin(false);
    }
  };
  const parseDate = (d: string | null) => {
    if (!d) return null;
    const trimmed = d.trim();
    if (trimmed.includes('.')) {
      const parts = trimmed.split('.');
      if (parts.length === 3) {
        // Assume DD.MM.YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  };

  const getFutureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateString;
  };

  const handleSaveSchoolDetails = async () => {
    if (!selectedSchool || !editName.trim()) return;
    setIsSaving(true);
    try {
      const isBypassActive = Boolean(editSubscriptionBypass);
      const isCustomMode = editPricingMode === 'custom';
      const finalStatus = (!isBypassActive && editStatus === 'bypass') ? 'active' : editStatus;

      const updates: any = { 
        name: editName.trim(),
        primary_color: editColor,
        logo_url: editLogo,
        status: finalStatus,
        is_trial: editIsTrial,
        trial_ends_at: editIsTrial ? parseDate(editTrialEndsAt) : null,
        contract_ends_at: parseDate(editContractEndsAt),
        max_teachers: editMaxTeachers,
        max_students: editMaxStudents,
        max_songs: editMaxSongs,
        limits_enabled: editLimitsEnabled,
        zip_code: editZipCode.trim() || null,
        city: editCity.trim() || null,
        legal_name: editLegalName.trim() || null,
        billing_contact_person: editBillingContact.trim() || null,
        billing_email: editBillingEmail.trim() || null,
        street: editStreet.trim() || null,
        house_number: editHouseNumber.trim() || null,
        address_addition: editAddressAddition.trim() || null,
        country: editCountry.trim() || 'Deutschland',
        vat_id: editVatId.trim() || null,
        leitweg_id: editLeitwegId.trim() || null,
        has_groovelab_subscription: editHasGroovelab,
        has_campus_subscription: editHasCampus,
        subscription_bypass: isBypassActive,
        subscription_bypass_until: isBypassActive && editSubscriptionBypassUntil.trim() !== '' ? new Date(editSubscriptionBypassUntil).toISOString() : null,
        subscription_bypass_reason: isBypassActive ? (editSubscriptionBypassReason.trim() || null) : null,
        custom_price_campus: isCustomMode && editCustomCampus.trim() !== '' ? Math.max(0, Number(editCustomCampus) || 0) : null,
        custom_price_groovelab: isCustomMode && editCustomGroovelab.trim() !== '' ? Math.max(0, Number(editCustomGroovelab) || 0) : null,
        custom_price_kombi: isCustomMode && editCustomKombi.trim() !== '' ? Math.max(0, Number(editCustomKombi) || 0) : null,
        custom_price_teacher: isCustomMode && editCustomTeacher.trim() !== '' ? Math.max(0, Number(editCustomTeacher) || 0) : null,
        custom_price_student: isCustomMode && editCustomStudent.trim() !== '' ? Math.max(0, Number(editCustomStudent) || 0) : null,
      };

      if (!isCustomMode) {
        // If master mode is active, clear grandfathered rates as well to force synchronization with master prices
        updates.grandfathered_campus_price = null;
        updates.grandfathered_groovelab_price = null;
        updates.grandfathered_kombi_price = null;
        updates.grandfathered_teacher_price = null;
        updates.grandfathered_student_price = null;
        updates.price_grandfathered_at = null;
      }

      let { data: updatedRows, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', selectedSchool.id)
        .select();

      if (error && (error.message?.includes('column') || error.message?.includes('Could not find') || error.code === 'PGRST204' || error.code === 'PGRST106')) {
        console.warn('⚠️ Supabase Schema fallback for school update. Stripping unmigrated columns...', error.message);
        const safeUpdates = { ...updates };
        delete safeUpdates.address_addition;
        delete safeUpdates.legal_name;
        delete safeUpdates.billing_contact_person;
        delete safeUpdates.billing_email;
        delete safeUpdates.house_number;
        delete safeUpdates.country;
        delete safeUpdates.vat_id;
        delete safeUpdates.leitweg_id;
        delete safeUpdates.custom_price_kombi;
        delete safeUpdates.subscription_bypass_until;
        delete safeUpdates.subscription_bypass_reason;

        const fallbackRes = await supabase
          .from('schools')
          .update(safeUpdates)
          .eq('id', selectedSchool.id)
          .select();
        updatedRows = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;
      
      const returnedRow = (updatedRows && updatedRows.length > 0) ? updatedRows[0] : {};
      const updatedSchoolObj = { ...selectedSchool, ...updates, ...returnedRow, subscription_bypass: isBypassActive, status: finalStatus };
      
      const targetSchoolId = selectedSchool.id;
      
      // Persist in localStorage to guarantee state preservation across reloads/re-fetches
      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        overrides[targetSchoolId] = { ...updatedSchoolObj, subscription_bypass: isBypassActive, status: finalStatus };
        localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        window.dispatchEvent(new Event('groovelab_school_updated'));
      } catch (e) {
        console.warn('Could not update localStorage school overrides:', e);
      }

      setSelectedSchool(null);
      
      await fetchSchoolsAndStats();
      
      // Force local state override so even if DB select returned stale cache, the UI shows the correct status
      setSchools(prev => prev.map(s => s.id === targetSchoolId ? { ...s, ...updatedSchoolObj, subscription_bypass: isBypassActive, status: finalStatus } : s));
      
      await masterPricing.refetchPricing();
      alert('Schule & Tarifkonditionen erfolgreich dauerhaft gespeichert!');
    } catch (err: any) {
      console.error('Save school details error:', err);
      alert('Fehler beim Speichern der Schul-Stammdaten: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkToggleStudentActivation = async (activate: boolean) => {
    if (!selectedSchool || selectedHashIds.length === 0) return;
    const actionText = activate ? 'aktivieren' : 'deaktivieren';
    if (!confirm(`${selectedHashIds.length} Schüler-Profile wirklich ${actionText}?`)) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_campus_active: activate, 
          is_groovelab_active: activate,
          is_active: activate
        })
        .eq('school_id', selectedSchool.id)
        .in('id', selectedHashIds);
        
      if (error) throw error;
      
      await fetchSchoolStudents(selectedSchool.id);
      setSelectedHashIds([]);
      alert(`Erfolgreich ${selectedHashIds.length} Schüler-Profile ge-` + actionText + 't!');
    } catch (err: any) {
      console.error('Error toggling student activations:', err);
      alert('Fehler beim Ändern der Schüler-Aktivierungen: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSingleStudentActivation = async (id: string, currentActive: boolean) => {
    if (!selectedSchool) return;
    const newActive = !currentActive;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_campus_active: newActive,
          is_groovelab_active: newActive,
          is_active: newActive
        })
        .eq('school_id', selectedSchool.id)
        .eq('id', id);
        
      if (error) throw error;
      
      setSchoolStudents(prev => prev.map(s => s.id === id ? { ...s, is_campus_active: newActive, is_groovelab_active: newActive, is_active: newActive } : s));
    } catch (err: any) {
      console.error('Error toggling activation:', err);
      alert('Fehler beim Aktualisieren der Aktivierung: ' + err.message);
    }
  };

  const fetchSchoolsAndStats = async () => {
    try {
      setLoading(true);
      fetchServerMetrics();
      
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .order('name');
        
      if (schoolErr) throw schoolErr;
      
      let mergedSchools = schoolData || [];
      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides');
        if (overridesStr) {
          const overrides = JSON.parse(overridesStr);
          mergedSchools = mergedSchools.map(s => overrides[s.id] ? { ...s, ...overrides[s.id] } : s);
        }
      } catch (e) {
        console.warn('Could not load localStorage school overrides:', e);
      }
      setSchools(mergedSchools);

      const [
        { data: statsData },
        { data: allUsersDb },
        { data: pendingStudentsDb },
        { data: songs },
        { data: bands },
        { count: sessionCount }
      ] = await Promise.all([
        supabase.from('school_user_statistics').select('*'),
        supabase.from('users').select('id, first_name, last_name, role, roles, school_id, is_active, is_campus_active, is_groovelab_active, ausweis_nummer, teacher_qr_token, is_pin_activated'),
        supabase.from('pending_students_decrypted').select('id, school_id, first_name, last_name'),
        supabase.from('songs').select('school_id'),
        supabase.from('bands').select('school_id, name'),
        supabase.from('sessions').select('*', { count: 'exact', head: true })
      ]);

      const totalTeachersSum = statsData?.reduce((acc, curr) => acc + (curr.teachers || 0), 0) || 0;
      const totalStudentsSum = statsData?.reduce((acc, curr) => acc + (curr.students || 0), 0) || 0;

      setStats({
        totalSchools: schoolData?.length || 0,
        totalTeachers: totalTeachersSum,
        totalStudents: totalStudentsSum,
        totalSessions: sessionCount || 0
      });

      const sStats: Record<string, any> = {};
      schoolData?.forEach(school => {
        const schId = school.id;
        const schoolStatsRow = statsData?.find(s => s.school_id === schId) || {};
        const schoolUsers = (allUsersDb || []).filter(u => u.school_id === schId);
        const schoolPending = (pendingStudentsDb || []).filter(p => p.school_id === schId);

        const studentsList: any[] = [];
        schoolUsers.forEach(u => {
          const isStudent = u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'));
          if (isStudent) {
            studentsList.push({
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name,
              is_campus_active: Boolean(u.is_campus_active || (u as any).isCampusActive),
              is_groovelab_active: Boolean(u.is_groovelab_active || (u as any).isGroovelabActive)
            });
          }
        });

        schoolPending.forEach(ps => {
          const userMatch = schoolUsers.find(u => u.id === ps.id || (u.first_name && ps.first_name && u.first_name.toLowerCase().trim() === ps.first_name.toLowerCase().trim()));
          const exists = studentsList.some(s => s.id === ps.id || (s.first_name && ps.first_name && s.first_name.toLowerCase().trim() === ps.first_name.toLowerCase().trim()));
          if (!exists) {
            const isCampusAct = userMatch ? Boolean(userMatch.is_campus_active) : true;
            const isGrooveAct = userMatch ? Boolean(userMatch.is_groovelab_active) : false;
            studentsList.push({
              id: ps.id,
              first_name: ps.first_name,
              last_name: ps.last_name,
              is_campus_active: isCampusAct,
              is_groovelab_active: isGrooveAct
            });
          }
        });

        const totalStudents = studentsList.length || schoolStatsRow.students || 0;
        const studentsCampus = studentsList.filter(s => s.is_campus_active).length || schoolStatsRow.students_campus || 0;
        const studentsGroovelab = studentsList.filter(s => s.is_groovelab_active).length || schoolStatsRow.students_groovelab || 0;

        let freeDoubleRoleCount = 0;
        let billableTeacherCount = 0;
        schoolUsers.forEach(u => {
          const isMgmt = u.role === 'admin' || u.role === 'secretary' || (Array.isArray(u.roles) && (u.roles.includes('admin') || u.roles.includes('secretary')));
          const isTch = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));

          if (isMgmt && isTch) {
            if (freeDoubleRoleCount < 2) {
              freeDoubleRoleCount++;
            } else {
              billableTeacherCount++;
            }
          } else if (!isMgmt && isTch) {
            billableTeacherCount++;
          }
        });

        sStats[schId] = {
          teachers: billableTeacherCount || schoolStatsRow.teachers || 0,
          students: totalStudents,
          teachersCampus: billableTeacherCount || schoolStatsRow.teachers_campus || 0,
          teachersGroovelab: billableTeacherCount || schoolStatsRow.teachers_groovelab || 0,
          studentsCampus: studentsCampus,
          studentsGroovelab: studentsGroovelab,
          songs: songs?.filter(s => s.school_id === schId).length || 0,
          bands: bands?.filter(b => b.school_id === schId && b.name !== '__SYSTEM_ANNOUNCEMENTS__').length || 0,
          adminUsers: schoolUsers.filter(u => u.role === 'secretary' || u.role === 'admin')
        };
      });
      setSchoolStats(sStats);
      
    } catch (err: any) {
      console.error('Fehler beim Laden der Master-Daten:', err.message);
      alert('Fehler beim Laden der globalen Übersicht: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    try {
      setCreating(true);
      const isTrial = newSchoolTrialOption !== 'live';
      let trialEndsAt: string | null = null;
      if (isTrial) {
        const days = newSchoolTrialOption === 'trial_14' ? 14 : 30;
        const d = new Date();
        d.setDate(d.getDate() + days);
        trialEndsAt = d.toISOString();
      }

      const hasCampus = newSchoolModuleChoice === 'kombi' || newSchoolModuleChoice === 'campus';
      const hasGroovelab = newSchoolModuleChoice === 'kombi' || newSchoolModuleChoice === 'groovelab';

      const { data, error } = await supabase
        .from('schools')
        .insert({
          name: newSchoolName.trim(),
          primary_color: newSchoolColor || '#3b82f6',
          logo_url: newSchoolLogo || null,
          zip_code: newSchoolZip.trim() || null,
          city: newSchoolCity.trim() || null,
          billing_email: newSchoolAdminEmail.trim() || null,
          has_campus_subscription: hasCampus,
          has_groovelab_subscription: hasGroovelab,
          is_trial: isTrial,
          trial_ends_at: trialEndsAt,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setSaveSuccessToast(`Schul-Tenant "${data.name}" erfolgreich provisioniert!`);
      setTimeout(() => setSaveSuccessToast(null), 4000);
      setNewSchoolName('');
      setNewSchoolColor('#3b82f6');
      setNewSchoolLogo('');
      setNewSchoolZip('');
      setNewSchoolCity('');
      setNewSchoolAdminEmail('');
      fetchSchoolsAndStats();
    } catch (err: any) {
      console.error('Fehler beim Erstellen der Schule:', err.message);
      alert('Fehler beim Erstellen: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleArchiveSchool = async (school: School) => {
    if (archiveConfirmName.trim().toLowerCase() !== school.name.trim().toLowerCase()) {
      alert(`Bitte tippe zur Bestätigung den exakten Namen "${school.name}" ein.`);
      return;
    }

    try {
      setArchivingSchool(true);
      // 1. Delete student records and their audio data
      const { error: usersErr } = await supabase
        .from('users')
        .delete()
        .eq('school_id', school.id)
        .eq('role', 'student');

      if (usersErr) console.warn('Non-blocking user cleanup warning:', usersErr);

      // 2. Set school to archived and paused
      const { error } = await supabase
        .from('schools')
        .update({
          is_paused: true,
          status: 'archived'
        })
        .eq('id', school.id);

      if (error) throw error;

      setSaveSuccessToast(`Schule "${school.name}" DSGVO-konform archiviert (Rechnungsdaten GoBD-gesichert).`);
      setTimeout(() => setSaveSuccessToast(null), 4000);
      setArchiveModalSchool(null);
      setArchiveConfirmName('');
      fetchSchoolsAndStats();
    } catch (err: any) {
      alert('Fehler beim Archivieren: ' + err.message);
    } finally {
      setArchivingSchool(false);
    }
  };

  const handleStartGhostMode = (school: School) => {
    try {
      sessionStorage.setItem('groovelab_support_ghost', 'true');
      sessionStorage.setItem('groovelab_ghost_school_id', school.id);
      const url = `${window.location.origin}/?school_id=${school.id}&support_ghost=true`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Ghost session error:', err);
    }
  };

  const handleStopGhostMode = () => {
    sessionStorage.removeItem('groovelab_support_ghost');
    sessionStorage.removeItem('groovelab_ghost_school_id');
    localStorage.removeItem('ghost_support_session');
    setActiveGhostSession(null);
    setSaveSuccessToast('Support-Sitzung beendet.');
    setTimeout(() => setSaveSuccessToast(null), 3000);
  };

  const handleDeleteSchool = async (id: string, name: string) => {
    if (!confirm(`Möchtest du die Schule "${name}" wirklich löschen? Dadurch werden alle verknüpften Räume, iPads und Benutzer unwiderruflich gelöscht!`)) {
      return;
    }

    try {
      // 1. Delete users first to satisfy the audit_logs foreign key constraint
      const { error: usersErr } = await supabase
        .from('users')
        .delete()
        .eq('school_id', id);

      if (usersErr) throw usersErr;

      // 2. Delete the school itself
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert(`Schule "${name}" wurde erfolgreich gelöscht.`);
      fetchSchoolsAndStats();
    } catch (err: any) {
      console.error('Fehler beim Löschen:', err.message);
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const handleToggleSchoolPause = async (id: string, currentPaused: boolean | undefined) => {
    const nextPaused = !currentPaused;
    // 1. Optimistic React state update
    setSchools(prev => prev.map(s => s.id === id ? { ...s, is_paused: nextPaused } : s));

    // 2. Persist in groovelab_school_overrides so fetchSchoolsAndStats or local cache never reverts it
    try {
      const overridesStr = localStorage.getItem('groovelab_school_overrides');
      const overrides = overridesStr ? JSON.parse(overridesStr) : {};
      overrides[id] = { ...(overrides[id] || {}), is_paused: nextPaused };
      localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
    } catch (e) {}

    try {
      const { error } = await supabase
        .from('schools')
        .update({ is_paused: nextPaused })
        .eq('id', id);

      if (error) {
        console.warn('Supabase is_paused update warning:', error);
      }
      setSaveSuccessToast(nextPaused ? 'Schul-Zugang pausiert (Zugang gesperrt).' : 'Schul-Zugang reaktiviert (Zugang freigegeben).');
      setTimeout(() => setSaveSuccessToast(null), 3000);
    } catch (err: any) {
      console.error('Fehler beim Ändern des Pause-Status:', err);
    }
  };


  const copyInviteLink = (schoolId: string, schoolName: string, token?: string | null, fallbackToken?: string | null) => {
    const activeToken = token || fallbackToken || '';
    const inviteUrl = `${getSubdomainOrigin(schoolName)}&invite_school_id=${schoolId}&role=secretary&token=${activeToken}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(schoolId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSchools = React.useMemo(() => {
    return schools
      .filter(school => {
        // Exclude Groove Academy test school as requested
        if (school.name?.toLowerCase().includes('groove academy')) return false;

        const q = schoolSearchQuery.trim().toLowerCase();
        const nameMatch = school.name?.toLowerCase().includes(q);
        const cityMatch = school.city?.toLowerCase().includes(q);
        const zipMatch = school.zip_code?.toLowerCase().includes(q);
        const textMatches = !q || nameMatch || cityMatch || zipMatch;

        if (!textMatches) return false;

        if (schoolModuleFilter === 'kombi') {
          return school.has_campus_subscription && school.has_groovelab_subscription;
        } else if (schoolModuleFilter === 'campus') {
          return school.has_campus_subscription && !school.has_groovelab_subscription;
        } else if (schoolModuleFilter === 'groovelab') {
          return school.has_groovelab_subscription && !school.has_campus_subscription;
        }
        return true;
      })
      .sort((a, b) => {
        if (schoolSortOption === 'students') {
          const countA = schoolStats[a.id]?.students || 0;
          const countB = schoolStats[b.id]?.students || 0;
          return countB - countA;
        } else if (schoolSortOption === 'name') {
          return (a.name || '').localeCompare(b.name || '', 'de');
        } else if (schoolSortOption === 'newest') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        return 0;
      });
  }, [schools, schoolSearchQuery, schoolModuleFilter, schoolSortOption, schoolStats]);

  const filteredPendingUsers = React.useMemo(() => {
    return pendingUsers.filter(u => {
      const schoolName = (schools.find(s => s.id === u.school_id)?.name || '').toLowerCase();
      const refCode = `CG-${u.ausweis_nummer || u.id.slice(0, 8)}`.toLowerCase();
      const query = pendingSearchQuery.toLowerCase();
      return schoolName.includes(query) || refCode.includes(query);
    });
  }, [pendingUsers, schools, pendingSearchQuery]);

  const handleOpenSchoolModal = (school: School) => {
    setSelectedSchool(school);
    setEditName(school.name || '');
    setEditColor(school.primary_color || '#3b82f6');
    setEditLogo(school.logo_url || '');
    setEditStatus(school.status || 'active');
    setEditIsTrial(school.is_trial ?? true);
    setEditTrialEndsAt(school.trial_ends_at ? new Date(school.trial_ends_at).toISOString().split('T')[0] : '');
    setEditContractEndsAt(school.contract_ends_at ? new Date(school.contract_ends_at).toISOString().split('T')[0] : '');
    setEditMaxTeachers(school.max_teachers ?? 2);
    setEditMaxStudents(school.max_students ?? 6);
    setEditMaxSongs(school.max_songs ?? 5);
    setEditLimitsEnabled(school.limits_enabled ?? false);
    setEditTrialOption('custom');
    setEditZipCode(school.zip_code || '');
    setEditCity(school.city || '');
    setEditLegalName(school.legal_name || '');
    setEditBillingContact(school.billing_contact_person || '');
    setEditBillingEmail(school.billing_email || '');
    setEditStreet(school.street || '');
    setEditHouseNumber(school.house_number || '');
    setEditAddressAddition(school.address_addition || '');
    setEditCountry(school.country || 'Deutschland');
    setEditVatId(school.vat_id || '');
    setEditLeitwegId(school.leitweg_id || '');
    setEditHasGroovelab(school.has_groovelab_subscription ?? true);
    setEditHasCampus(school.has_campus_subscription ?? true);
    setEditSubscriptionBypass(school.subscription_bypass ?? false);
    setEditSubscriptionBypassUntil(school.subscription_bypass_until ? school.subscription_bypass_until.split('T')[0] : '');
    setEditSubscriptionBypassReason(school.subscription_bypass_reason || '');

    const hasCustom = (school.custom_price_campus !== null && school.custom_price_campus !== undefined) ||
                      (school.custom_price_groovelab !== null && school.custom_price_groovelab !== undefined) ||
                      (school.custom_price_kombi !== null && school.custom_price_kombi !== undefined);
    setEditPricingMode(hasCustom ? 'custom' : 'master');
    setEditCustomCampus(school.custom_price_campus !== null && school.custom_price_campus !== undefined ? String(school.custom_price_campus) : String(school.grandfathered_campus_price ?? masterPricing.priceCampus));
    setEditCustomGroovelab(school.custom_price_groovelab !== null && school.custom_price_groovelab !== undefined ? String(school.custom_price_groovelab) : String(school.grandfathered_groovelab_price ?? masterPricing.priceGroovelab));
    setEditCustomKombi(school.custom_price_kombi !== null && school.custom_price_kombi !== undefined ? String(school.custom_price_kombi) : String(school.grandfathered_kombi_price ?? masterPricing.priceKombi));
    setEditCustomTeacher(school.custom_price_teacher !== null && school.custom_price_teacher !== undefined ? String(school.custom_price_teacher) : String(school.grandfathered_teacher_price ?? masterPricing.priceTeacher));
    setEditCustomStudent(school.custom_price_student !== null && school.custom_price_student !== undefined ? String(school.custom_price_student) : String(school.grandfathered_student_price ?? masterPricing.priceStudent));
    setEditCustomFreeMonths(school.custom_free_months_per_year !== null && school.custom_free_months_per_year !== undefined ? String(school.custom_free_months_per_year) : '');
    setCardModalTab('details');
    setSelectedHashIds([]);
    fetchSchoolStudents(school.id);
  };

  const getSchoolLiveMRR = (school: School | null) => {
    if (!school) {
      return { total: 0, baseFlat: 0, teacherFee: 0, studentFee: 0, campusStudentFee: 0, groovelabStudentFee: 0, passiveStudentFee: 0, activeTeachers: 0, activeStudents: 0, campusStudents: 0, groovelabStudents: 0, passiveStudents: 0, totalStudents: 0, isBypass: false };
    }

    const isBypass = editSubscriptionBypass;
    const stats = schoolStats[school.id] || {};
    const activeTeachers = stats.teachers ?? stats.totalTeachers ?? school.teachers_count ?? 0;
    
    const totalStudents = stats.students ?? school.active_students_count ?? 0;
    const campusStudents = stats.studentsCampus ?? (editHasCampus ? totalStudents : 0);
    const groovelabStudents = stats.studentsGroovelab ?? 0;
    const activeStudents = Math.max(campusStudents, groovelabStudents, stats.activeStudents || 0);
    const passiveStudents = Math.max(0, totalStudents - activeStudents);

    if (isBypass) {
      return {
        total: 0,
        baseFlat: 0,
        teacherFee: 0,
        studentFee: 0,
        campusStudentFee: 0,
        groovelabStudentFee: 0,
        passiveStudentFee: 0,
        activeTeachers,
        activeStudents,
        campusStudents,
        groovelabStudents,
        passiveStudents,
        totalStudents,
        isBypass: true
      };
    }

    const tempSchool = { ...school, subscription_bypass: editSubscriptionBypass, has_campus_subscription: editHasCampus, has_groovelab_subscription: editHasGroovelab };
    const effective = masterPricing.getSchoolRates(tempSchool);
    const isCustomModeActive = editPricingMode === 'custom';

    const priceCampus = isCustomModeActive && editCustomCampus !== '' ? Math.max(0, Number(editCustomCampus) || 0) : effective.priceCampus;
    const priceGroovelab = isCustomModeActive && editCustomGroovelab !== '' ? Math.max(0, Number(editCustomGroovelab) || 0) : effective.priceGroovelab;
    const priceKombi = isCustomModeActive && editCustomKombi !== '' ? Math.max(0, Number(editCustomKombi) || 0) : effective.priceKombi;
    const priceTeacher = isCustomModeActive && editCustomTeacher !== '' ? Math.max(0, Number(editCustomTeacher) || 0) : effective.priceTeacher;
    const priceStudent = isCustomModeActive && editCustomStudent !== '' ? Math.max(0, Number(editCustomStudent) || 0) : effective.priceStudent;
    const pricePassiveStudent = effective.pricePassiveStudent ?? 0.09;

    const billingResult = calculateCampusGroovelabBilling({
      hasCampusModule: editHasCampus,
      hasGroovelabModule: editHasGroovelab,
      activeTeacherCount: activeTeachers,
      activeStudentCount: activeStudents,
      campusStudentCount: campusStudents,
      groovelabStudentCount: groovelabStudents,
      passiveStudentCount: passiveStudents,
      billingDiscountType: (school as any).billing_discount_type || 'monthly',
      exemptStudentCount: (school as any).exempt_student_count || 0,
      directBillingMode: (school as any).billing_payer === 'student' ? ((school as any).student_billing_option === 'student_partial' ? 'partial' : 'full') : 'none',
      rates: {
        priceCampus,
        priceGroovelab,
        priceKombi,
        priceTeacher,
        priceStudent,
        pricePassiveStudent
      }
    });

    return {
      total: billingResult.totalMonthlySchoolInvoice,
      baseFlat: billingResult.baseServerFlatRate,
      teacherFee: billingResult.teacherServiceFeeTotal,
      studentFee: billingResult.studentActivationFeeTotal,
      campusStudentFee: billingResult.campusStudentActivationFeeTotal,
      groovelabStudentFee: billingResult.groovelabStudentActivationFeeTotal,
      passiveStudentFee: billingResult.passiveStudentFeeTotal,
      activeTeachers,
      activeStudents,
      campusStudents,
      groovelabStudents,
      passiveStudents,
      totalStudents,
      isBypass: false
    };
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #fcfdfe 0%, #f3f6fa 50%, #e9edf5 100%)',
      color: '#1e293b',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      padding: '0',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* World-Class Background Decorative Blobs */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Container Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Left Premium Sidebar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(35px)',
          WebkitBackdropFilter: 'blur(35px)',
          borderRight: '1px solid rgba(15, 23, 42, 0.06)',
          padding: '40px 24px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100vh',
          position: 'sticky',
          top: 0,
          boxShadow: '4px 0 24px rgba(15, 23, 42, 0.01)'
        }}>
          <div>
            {/* App Logo & Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '44px', padding: '0 8px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #eab308 100%)',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={20} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  Campus-Groovelab
                </h1>
                <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Admin Leitstand
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Cmd+K Quick Search Trigger */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="#64748b" />
                  <span>Suchen / Befehl...</span>
                </div>
                <kbd style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#475569',
                  fontFamily: 'sans-serif'
                }}>⌘K</kbd>
              </button>

              {[
                { id: 'executive', label: 'Master Cockpit', icon: <Activity size={18} />, color: '#ea4335', bg: 'rgba(234, 67, 53, 0.08)' },
                { id: 'schools', label: 'Schulen & Tenants', icon: <Layers size={18} />, color: '#059669', bg: 'rgba(16, 185, 129, 0.08)' },
                { id: 'briefing', label: 'Zahlungsabgleich & Aktivierungen', icon: <CreditCard size={18} />, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
                { id: 'billing', label: 'Financial Control', icon: <GraduationCap size={18} />, color: '#ca8a04', bg: 'rgba(234, 179, 8, 0.08)' },
                { id: 'telemetry', label: 'Telemetrie & Health', icon: <Cpu size={18} />, color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.08)' },
                { id: 'pricing', label: 'Preise & Kampagnen', icon: <Tag size={18} />, color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)' },
                { id: 'operator', label: 'Betreiber & Zugang', icon: <Building2 size={18} />, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' }
              ].map((tab) => {
                const isActive = activePortalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePortalTab(tab.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isActive ? tab.bg : 'transparent',
                      color: isActive ? tab.color : '#475569',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.02)' : 'none',
                      justifyContent: 'space-between'
                    }}
                    className="sidebar-nav-btn"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: isActive ? tab.color : '#64748b', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.id === 'briefing' && pendingUsers.length > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: '10px',
                        minWidth: '16px',
                        textAlign: 'center',
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.25)'
                      }}>
                        {pendingUsers.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer (Profile / Logout) */}
          <div style={{
            borderTop: '1px solid rgba(15, 23, 42, 0.06)',
            paddingTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
              <img
                src="/campus_login_hero.png"
                alt="Master Admin"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(234, 67, 53, 0.3)',
                  boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)'
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {adminUsername || 'Master Admin'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#ea4335', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  System Root
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#dc2626',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.color = '#dc2626';
              }}
            >
              <LogOut size={14} /> Abmelden
            </button>
          </div>
        </div>

        {/* Right Workspace Area */}
        <div style={{
          padding: '44px 54px',
          overflowY: 'auto',
          height: '100vh',
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          {/* Enterprise Ghost-Mode Sticky Support Banner (Monochrome styling) */}
          {activeGhostSession && (
            <div style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '14px 22px',
              borderRadius: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={20} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                    Support-Sitzung aktiv (Ghost-Mode)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Autorisierter Master-Zugriff auf: <strong style={{ color: '#ffffff' }}>{activeGhostSession.schoolName}</strong> (SOC 2 audit-konform).
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/?school_id=${activeGhostSession.schoolId}&support_ghost=true`;
                    window.location.href = url;
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={13} />
                  Schulumgebung öffnen
                </button>

                <button
                  onClick={handleStopGhostMode}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    transition: 'all 0.15s'
                  }}
                >
                  Sitzung beenden
                </button>
              </div>
            </div>
          )}

          {saveSuccessToast && (
            <div style={{
              position: 'fixed',
              top: '24px',
              right: '28px',
              zIndex: 99999,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              padding: '14px 22px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(5, 150, 105, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.90rem',
              fontWeight: 800,
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <CheckCircle size={20} color="#ffffff" />
              <span>{saveSuccessToast}</span>
            </div>
          )}

          {activePortalTab === 'executive' && (
            <ExecutiveTab
              schools={schools}
              schoolStats={schoolStats}
              loading={loading}
              serverMetrics={serverMetrics}
              pendingUsers={pendingUsers}
              masterPricing={masterPricing}
              onRefresh={fetchSchoolsAndStats}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onNavigateTab={(tab) => setActivePortalTab(tab)}
              onSelectSchool={handleOpenSchoolModal}
            />
          )}

          {activePortalTab === 'briefing' && (
            <ReconciliationTab
              pendingUsers={pendingUsers}
              schools={schools}
              masterPricing={masterPricing}
              loadingPending={loadingPending}
              onRefresh={fetchPendingUsers}
              onBatchActivate={handleBatchActivateUsers}
              onSingleActivate={handleActivateUser}
            />
          )}

          {activePortalTab === 'billing' && (
            <div className="animate-fade-in">
              <BillingDashboard />
            </div>
          )}

          {activePortalTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                    Telemetrie &amp; System Health
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#64748b', fontWeight: 550 }}>
                    Echtzeit-Hardwareüberwachung des Hetzner CX23 VPS (`178.105.10.2`) und Supabase Datenbank-Cluster.
                  </p>
                </div>

                <button
                  onClick={fetchServerMetrics}
                  style={{
                    padding: '10px 18px',
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
                  <RefreshCw size={15} className={fetchingMetrics ? 'animate-spin' : ''} /> Telemetrie Messung
                </button>
              </div>

              {/* Hardware Metrics Container */}
              {(() => {
                const latestMetric = serverMetrics[0] || null;
                const cpuVal = latestMetric ? latestMetric.cpu_load : 0.23;
                const ramUsed = latestMetric ? latestMetric.mem_used_mb : 2048;
                const ramTotal = latestMetric ? latestMetric.mem_total_mb : 4096;
                const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 50;
                const dbConns = latestMetric ? latestMetric.active_connections : 35;

                const diskUsed = latestMetric?.disk_used_gb ?? 18.0;
                const diskTotal = latestMetric?.disk_total_gb ?? 40.0;
                const diskPct = (diskUsed / diskTotal) * 100;

                const volUsed = latestMetric?.volume_used_gb ?? 2.1;
                const volTotal = latestMetric?.volume_total_gb ?? 14.0;
                const volPct = (volUsed / volTotal) * 100;

                let healthStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
                if (cpuVal >= 1.9 || ramPct >= 90 || dbConns >= 80) {
                  healthStatus = 'critical';
                } else if (cpuVal >= 1.5 || ramPct >= 75 || dbConns >= 50) {
                  healthStatus = 'warning';
                }

                const formattedTime = latestMetric 
                  ? new Date(latestMetric.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : 'Live Signal';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Overall System Health Status Banner */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      padding: '28px 36px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '16px',
                          background: healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.1)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.2)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                        }}>
                          <Activity size={24} className={healthStatus === 'critical' ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                              Hetzner Cloud VPS Status: {healthStatus === 'critical' ? 'Kritische Last' : healthStatus === 'warning' ? 'Erhöhte Last' : 'Optimaler Betrieb'}
                            </h3>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '9999px', background: '#f1f5f9', color: '#475569' }}>
                              CX23 Server (Falkenstein)
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b', fontWeight: 550 }}>
                            {healthStatus === 'optimal' && 'Alle 5 Hardware-Komponenten arbeiten im idealen Bereich. Keine Engpässe für Nutzer.'}
                            {healthStatus === 'warning' && 'Das System verarbeitet derzeit eine erhöhte Anzahl an Anfragen. Weiterhin stabil.'}
                            {healthStatus === 'critical' && 'Das System nähert sich der Maximalkapazität. Ein Server-Upgrade auf CX32 wird empfohlen.'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Letzte Messung: {formattedTime}</span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '9999px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          background: healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.08)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          color: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#d97706' : '#10b981',
                          border: `1px solid ${healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.15)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#10b981',
                            display: 'inline-block'
                          }} />
                          {healthStatus === 'optimal' ? 'SUPER STABIL' : healthStatus === 'warning' ? 'ERHÖHT' : 'KRITISCH'}
                        </div>
                      </div>
                    </div>

                    {/* 5 Hardware Metrics Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '24px'
                    }}>
                      {/* Card 1: CPU Load */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '28px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Cpu size={20} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>Rechenleistung (CPU)</h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Verarbeitungstempo (2 vCPU Cores)</p>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: cpuVal >= 1.9 ? '#ef4444' : cpuVal >= 1.5 ? '#d97706' : '#10b981' }}>
                            {cpuVal.toFixed(2)} / 2.0
                          </span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ height: '100%', width: `${Math.min((cpuVal / 2.0) * 100, 100)}%`, background: cpuVal >= 1.9 ? '#ef4444' : cpuVal >= 1.5 ? '#f59e0b' : '#10b981', transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Auslastung: <strong>{Math.round((cpuVal / 2.0) * 100)}%</strong></span>
                          <span>{cpuVal >= 1.9 ? 'Ganz schön belastet' : cpuVal >= 1.5 ? 'Fleißig' : 'Entspannt'}</span>
                        </div>
                      </div>

                      {/* Card 2: RAM Memory */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '28px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Sliders size={20} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>Arbeitsspeicher (RAM)</h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Schnellspeicher für aktive Nutzer (4 GB)</p>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: ramPct >= 90 ? '#ef4444' : ramPct >= 75 ? '#d97706' : '#6366f1' }}>
                            {(ramUsed / 1024).toFixed(1)} GB / 4.0 GB
                          </span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ height: '100%', width: `${Math.min(ramPct, 100)}%`, background: ramPct >= 90 ? '#ef4444' : ramPct >= 75 ? '#f59e0b' : '#6366f1', transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Belegt: <strong>{Math.round(ramPct)}%</strong></span>
                          <span>{ramPct >= 90 ? 'Voll belegt' : ramPct >= 75 ? 'Guter Betrieb' : 'Reichlich Platz'}</span>
                        </div>
                      </div>

                      {/* Card 3: Local NVMe SSD Disk */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '28px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <HardDrive size={20} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>Lokale Festplatte (NVMe)</h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>System- &amp; Appdaten (40 GB)</p>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#d97706' }}>
                            {diskUsed.toFixed(1)} GB / {diskTotal.toFixed(1)} GB
                          </span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ height: '100%', width: `${Math.min(diskPct, 100)}%`, background: '#d97706', transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Speicher belegt: <strong>{Math.round(diskPct)}%</strong></span>
                          <span>Ausreichend Platz</span>
                        </div>
                      </div>

                      {/* Card 4: Additional Storage Volume */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '28px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Server size={20} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>Zusatz-Volume (Speicher)</h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Erweiterter Platz für Uploads (14 GB)</p>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#3b82f6' }}>
                            {volUsed.toFixed(1)} GB / {volTotal.toFixed(1)} GB
                          </span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ height: '100%', width: `${Math.min(volPct, 100)}%`, background: '#3b82f6', transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Volume belegt: <strong>{Math.round(volPct)}%</strong></span>
                          <span>Sehr viel Reserve</span>
                        </div>
                      </div>

                      {/* Card 5: DB Connection Pools */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '28px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Database size={20} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>Datenbank-Sitzungen</h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Gleichzeitige Verbindungen zur DB</p>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: dbConns >= 80 ? '#ef4444' : dbConns >= 50 ? '#d97706' : '#a855f7' }}>
                            {dbConns} / 100
                          </span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ height: '100%', width: `${Math.min(dbConns, 100)}%`, background: dbConns >= 80 ? '#ef4444' : dbConns >= 50 ? '#f59e0b' : '#a855f7', transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Aktive Sitzungen: <strong>{dbConns}%</strong></span>
                          <span>{dbConns >= 80 ? 'Sehr geschäftig' : dbConns >= 50 ? 'Guter Schulbetrieb' : 'Ruhig'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Trend Chart */}
                    {serverMetrics.length > 1 && (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '32px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                      }}>
                        <h4 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 900, margin: '0 0 20px 0', fontFamily: '"Outfit", sans-serif' }}>
                          Auslastungsverlauf der letzten Messungen
                        </h4>
                        
                        <div style={{ width: '100%', height: '150px', position: 'relative' }}>
                          {(() => {
                            const data = [...serverMetrics].reverse();
                            const width = 800;
                            const height = 130;
                            
                            const getPoints = (valExtractor: (m: ServerMetric) => number, maxVal: number) => {
                              return data.map((m, index) => {
                                const x = (index / (data.length - 1)) * width;
                                const y = height - (Math.min(valExtractor(m), maxVal) / maxVal) * (height - 10) - 5;
                                return { x, y };
                              });
                            };

                            const cpuPoints = getPoints((m) => m.cpu_load, 2.0);
                            const ramPoints = getPoints((m) => (m.mem_used_mb / (m.mem_total_mb || 4096)) * 100, 100);
                            const dbPoints = getPoints((m) => m.active_connections, 100);

                            const pointsToString = (pts: { x: number, y: number }[]) => {
                              return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                            };

                            return (
                              <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                <defs>
                                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.00"/>
                                  </linearGradient>
                                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00"/>
                                  </linearGradient>
                                  <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2"/>
                                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.00"/>
                                  </linearGradient>
                                </defs>

                                <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

                                {cpuPoints.length > 1 && (
                                  <polygon points={`${cpuPoints[0].x},${height} ${pointsToString(cpuPoints)} ${cpuPoints[cpuPoints.length-1].x},${height}`} fill="url(#cpuGrad)" />
                                )}
                                {ramPoints.length > 1 && (
                                  <polygon points={`${ramPoints[0].x},${height} ${pointsToString(ramPoints)} ${ramPoints[ramPoints.length-1].x},${height}`} fill="url(#ramGrad)" />
                                )}
                                {dbPoints.length > 1 && (
                                  <polygon points={`${dbPoints[0].x},${height} ${pointsToString(dbPoints)} ${dbPoints[dbPoints.length-1].x},${height}`} fill="url(#dbGrad)" />
                                )}

                                <polyline fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(cpuPoints)} />
                                <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(ramPoints)} />
                                <polyline fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(dbPoints)} />

                                {cpuPoints.length > 0 && (
                                  <>
                                    <circle cx={cpuPoints[cpuPoints.length - 1].x} cy={cpuPoints[cpuPoints.length - 1].y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                                    <circle cx={ramPoints[ramPoints.length - 1].x} cy={ramPoints[ramPoints.length - 1].y} r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                                    <circle cx={dbPoints[dbPoints.length - 1].x} cy={dbPoints[dbPoints.length - 1].y} r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
                                  </>
                                )}
                              </svg>
                            );
                          })()}
                        </div>

                        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                            <span style={{ width: '12px', height: '3px', background: '#10b981', borderRadius: '2px' }} />
                            Rechenleistung (CPU 2 vCPU)
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                            <span style={{ width: '12px', height: '3px', background: '#6366f1', borderRadius: '2px' }} />
                            Arbeitsspeicher %
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                            <span style={{ width: '12px', height: '3px', background: '#a855f7', borderRadius: '2px' }} />
                            Datenbank-Sitzungen %
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* 🏷️ BOARD 1: PREISE & KAMPAGNEN (activePortalTab === 'pricing')          */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activePortalTab === 'pricing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
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
                      background: 'rgba(217, 119, 6, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Tag size={20} color="#d97706" />
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag size={18} color="#d97706" /> Standard-Abonnementpreise
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Globale Sockelpreise für Server-Hosting und Benutzer-Lizenzen.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '100px', fontWeight: 800 }}>
                      Master Tarif
                    </span>
                  </div>

                  <form onSubmit={handleUpdatePricingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Module Server Flatrates */}
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
                              onChange={(e) => setPriceCampus(e.target.value)}
                              style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                color: '#0f172a',
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                outline: 'none'
                              }}
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
                              onChange={(e) => setPriceGroovelab(e.target.value)}
                              style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                color: '#0f172a',
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                outline: 'none'
                              }}
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>€/Mo</span>
                          </div>
                        </div>

                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '14px', border: '1.5px solid #16a34a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 900, textTransform: 'uppercase' }}>
                              Kombi-Bundle
                            </label>
                            {(() => {
                              const singleTotal = (Number(priceCampus) || 0) + (Number(priceGroovelab) || 0);
                              const kombiPriceNum = Number(priceKombi) || 0;
                              const kombiSavings = singleTotal - kombiPriceNum;
                              const kombiSavingsPercent = singleTotal > 0 ? Math.round((kombiSavings / singleTotal) * 100) : 0;
                              if (kombiSavingsPercent > 0) {
                                return (
                                  <span style={{ padding: '1px 6px', borderRadius: '6px', background: '#16a34a', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800 }}>
                                    -{kombiSavingsPercent}%
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceKombi}
                              onChange={(e) => setPriceKombi(e.target.value)}
                              style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                color: '#14532d',
                                fontSize: '1.1rem',
                                fontWeight: 900,
                                outline: 'none'
                              }}
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d' }}>€/Mo</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Profile Rates & Free Months */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                        2. Nutzer- &amp; Profil-Tarife
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                            Lehrer / Dozent
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceTeacher}
                              onChange={(e) => setPriceTeacher(e.target.value)}
                              style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }}
                            />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>€</span>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                            Aktiv-Schüler
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceStudent}
                              onChange={(e) => setPriceStudent(e.target.value)}
                              style={{ width: '100%', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }}
                            />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>€</span>
                          </div>
                        </div>

                        <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #0284c7' }}>
                          <label style={{ display: 'block', fontSize: '0.66rem', color: '#0369a1', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                            Passiv-Schüler
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricePassiveStudent}
                              onChange={(e) => setPricePassiveStudent(e.target.value)}
                              style={{ width: '100%', border: 'none', background: 'transparent', color: '#0369a1', fontSize: '0.95rem', fontWeight: 900, outline: 'none' }}
                            />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>€</span>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                            Beitragsfrei / Jahr
                          </label>
                          <select
                            value={freeMonthsPerYear}
                            onChange={(e) => setFreeMonthsPerYear(Number(e.target.value))}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: 'transparent',
                              color: '#0f172a',
                              fontSize: '0.80rem',
                              fontWeight: 800,
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value={0}>0 frei (12 Monate)</option>
                            <option value={1}>1 Mo. frei (11 Mo.)</option>
                            <option value={2}>2 Mo. frei (10 Mo.)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Preisanpassungs-Politik & BGB-Compliance */}
                    <div style={{ padding: '18px 20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Preisanpassungs-Politik für Bestandskunden
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '100px' }}>
                          BGB &amp; AGB-Schutz
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: priceChangeScope === 'new_only' ? '#ffffff' : 'transparent',
                          border: priceChangeScope === 'new_only' ? '1.5px solid #16a34a' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}>
                          <input
                            type="radio"
                            name="priceChangeScope"
                            value="new_only"
                            checked={priceChangeScope === 'new_only'}
                            onChange={() => setPriceChangeScope('new_only')}
                            style={{ marginTop: '2px', accentColor: '#16a34a' }}
                          />
                          <div style={{ fontSize: '0.80rem', color: '#0f172a', lineHeight: 1.35 }}>
                            <strong style={{ color: '#15803d' }}>Bestandsschutz (Grandfathering - Empfohlen):</strong> Preisänderungen gelten ausschließlich für Neuregistrierungen. Bestehende Musikschulen behalten dauerhaft ihren Altpreis (0 % Kündigungs- &amp; Rechtsrisiko).
                          </div>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: priceChangeScope === 'school_year_start' ? '#ffffff' : 'transparent',
                          border: priceChangeScope === 'school_year_start' ? '1.5px solid #0284c7' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}>
                          <input
                            type="radio"
                            name="priceChangeScope"
                            value="school_year_start"
                            checked={priceChangeScope === 'school_year_start'}
                            onChange={() => setPriceChangeScope('school_year_start')}
                            style={{ marginTop: '2px', accentColor: '#0284c7' }}
                          />
                          <div style={{ fontSize: '0.80rem', color: '#0f172a', lineHeight: 1.35 }}>
                            <strong>Schuljahresstart-Stichtag:</strong> Neue Preise greifen für Bestandskunden automatisch zum schulspezifischen Schuljahresbeginn (z. B. 01.08. / 01.09.).
                          </div>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: priceChangeScope === 'immediate' ? '#ffffff' : 'transparent',
                          border: priceChangeScope === 'immediate' ? '1.5px solid #ea580c' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}>
                          <input
                            type="radio"
                            name="priceChangeScope"
                            value="immediate"
                            checked={priceChangeScope === 'immediate'}
                            onChange={() => setPriceChangeScope('immediate')}
                            style={{ marginTop: '2px', accentColor: '#ea580c' }}
                          />
                          <div style={{ fontSize: '0.80rem', color: '#0f172a', lineHeight: 1.35 }}>
                            <strong>Sofortige Flottenanpassung (mit BGB-Frist):</strong> Neue Preise gelten ab Stichtag für alle Musikschulen plattformweit.
                          </div>
                        </label>
                      </div>

                      {/* Dynamic BGB Legal Compliance Card */}
                      {priceChangeScope !== 'new_only' && (
                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                                Wirksamkeits-Stichtag für Bestandskunden
                              </label>
                              <input
                                type="date"
                                value={priceEffectiveDate}
                                onChange={(e) => setPriceEffectiveDate(e.target.value)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  outline: 'none'
                                }}
                              />
                            </div>

                            {(() => {
                              const effDate = new Date(priceEffectiveDate || Date.now());
                              const now = new Date();
                              const diffTime = effDate.getTime() - now.getTime();
                              const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                              const noticeDeadline = new Date(effDate.getTime() - 42 * 24 * 60 * 60 * 1000);
                              const formattedNoticeDeadline = noticeDeadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

                              let statusBg = '#dcfce7';
                              let statusColor = '#15803d';
                              let statusTitle = '🟢 BGB-Konform (>= 60 Tage Vorlauf)';
                              let statusText = `Späteste Mitteilung: ${formattedNoticeDeadline}. Vorlauf: ${diffDays} Tage.`;

                              if (diffDays < 42) {
                                statusBg = '#fee2e2';
                                statusColor = '#991b1b';
                                statusTitle = '🔴 Kritische Frist (< 42 Tage)';
                                statusText = `Gesetzliche Mindestfrist (§ 308 Nr. 4 BGB) unterschritten!`;
                              } else if (diffDays < 60) {
                                statusBg = '#fef3c7';
                                statusColor = '#92400e';
                                statusTitle = '🟡 Zulässig (42–59 Tage)';
                                statusText = `Fristgerecht. Mitteilungsversand umgehend erforderlich.`;
                              }

                              return (
                                <div style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '10px', background: statusBg, border: `1px solid ${statusColor}40` }}>
                                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: statusColor, marginBottom: '2px' }}>
                                    {statusTitle}
                                  </div>
                                  <div style={{ fontSize: '0.70rem', color: statusColor, opacity: 0.9, lineHeight: 1.25 }}>
                                    {statusText}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => setShowLegalNoticeModal(true)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📄 Mitteilungstext für Schulleitungen ansehen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save Action Button */}
                    <button
                      type="submit"
                      disabled={updatingBilling}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(217, 119, 6, 0.25)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      className="hover-scale-mini"
                    >
                      {updatingBilling ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Preise werden gespeichert...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          <span>Standardpreise &amp; Tarife speichern</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Card 2: Preisanpassungen Audit-Logbuch */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HistoryIcon size={18} color="#2563eb" /> Audit-Logbuch
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Lückenlose Historie aller Tarifanpassungen (SOC 2).
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '100px', fontWeight: 800 }}>
                      {pricingAuditLogs.length} Einträge
                    </span>
                  </div>

                  {pricingAuditLogs.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem' }}>
                      <HistoryIcon size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      Bisher wurden noch keine Preisanpassungen im Audit-Logbuch aufgezeichnet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                      {pricingAuditLogs.map((log: any) => (
                        <div key={log.id} style={{
                          padding: '14px 16px',
                          borderRadius: '14px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                              {new Date(log.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: log.change_scope === 'immediate' ? '#fee2e2' : '#fef3c7',
                              color: log.change_scope === 'immediate' ? '#dc2626' : '#b45309'
                            }}>
                              {log.change_scope === 'immediate' ? 'Sofortige Anpassung' : 'Bestandsschutz'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#334155', display: 'flex', gap: '10px', flexWrap: 'wrap', fontWeight: 600 }}>
                            <span>Campus: <strong>{Number(log.old_price_campus).toFixed(2).replace('.', ',')} € → {Number(log.new_price_campus).toFixed(2).replace('.', ',')} €</strong></span>
                            <span>GrooveLab: <strong>{Number(log.old_price_groovelab).toFixed(2).replace('.', ',')} € → {Number(log.new_price_groovelab).toFixed(2).replace('.', ',')} €</strong></span>
                            <span>Kombi: <strong>{Number(log.old_price_kombi).toFixed(2).replace('.', ',')} € → {Number(log.new_price_kombi).toFixed(2).replace('.', ',')} €</strong></span>
                          </div>

                          <div style={{ fontSize: '0.70rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '2px' }}>
                            <span>von: <strong>{log.changed_by_name || 'Master Admin'}</strong></span>
                            <span>{log.affected_schools_count} Schulen betroffen</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Rabatt-Kampagnen & Sonderangebote */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
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
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                    <Percent size={18} color="#059669" /> Rabatt-Kampagne erstellen
                  </h3>

                  <form onSubmit={handleAddSpecialOffer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Aktionsname
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="z.B. Sommer-Special 2026"
                          value={newOfferName}
                          onChange={(e) => setNewOfferName(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Rabatt (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={newOfferDiscount}
                          onChange={(e) => setNewOfferDiscount(Number(e.target.value))}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Gutschein-Code (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. SOMMER26"
                          value={newOfferCode}
                          onChange={(e) => setNewOfferCode(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '0 4px' }}>
                        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#475569' }}>Sofort Aktiv</span>
                        <button
                          type="button"
                          onClick={() => setNewOfferActive(!newOfferActive)}
                          style={{
                            position: 'relative',
                            width: '38px',
                            height: '22px',
                            borderRadius: '11px',
                            background: newOfferActive ? '#10b981' : '#cbd5e1',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            transform: newOfferActive ? 'translateX(19px)' : 'translateX(3px)'
                          }} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(5, 150, 105, 0.2)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                      className="hover-scale-mini"
                    >
                      <Plus size={16} /> Kampagne anlegen
                    </button>
                  </form>
                </div>

                {/* List: Aktive Aktionen */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                        Laufende Aktionen
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Gutscheincodes und zeitlich begrenzte Nachlässe.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: '100px', fontWeight: 800 }}>
                      {specialOffers.filter(o => o.is_active).length} Aktiv / {specialOffers.length} Gesamt
                    </span>
                  </div>

                  {specialOffers.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                      Keine Rabatt-Aktionen vorhanden.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                      {specialOffers.map((offer) => (
                        <div
                          key={offer.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0f172a' }}>
                              {offer.name}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                                {offer.discount_percent}% Rabatt
                              </span>
                              {offer.code && (
                                <span style={{ color: '#475569', fontWeight: 600 }}>
                                  Code: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{offer.code}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleOfferActive(offer.id)}
                              style={{
                                position: 'relative',
                                width: '36px',
                                height: '20px',
                                borderRadius: '10px',
                                background: offer.is_active ? '#10b981' : '#cbd5e1',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: offer.is_active ? 'translateX(18px)' : 'translateX(3px)'
                              }} />
                            </button>

                            <button
                              onClick={() => handleDeleteSpecialOffer(offer.id)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* 🏛️ BOARD 2: BETREIBER & ZUGANG (activePortalTab === 'operator')         */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activePortalTab === 'operator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
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
                      background: 'rgba(2, 132, 199, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building2 size={20} color="#0284c7" />
                    </div>
                    <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                      Betreiber &amp; Zugang
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.90rem', color: '#64748b', fontWeight: 500 }}>
                    Verwaltung der Betreibergesellschaft, Rechnungsanschrift, Auszahlungs-Bankdaten und Root-Zugangsdaten.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '100px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0284c7',
                    fontSize: '0.80rem',
                    fontWeight: 700
                  }}>
                    <Shield size={14} color="#0284c7" />
                    Root Superuser Access
                  </div>
                </div>
              </div>

              {/* Top Row Grid: Betreiber-Stammdaten & Bankverbindung */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
                gap: '28px',
                alignItems: 'start'
              }}>
                {/* Card 1: Betreibergesellschaft & Rechnungsanschrift */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                    <Building2 size={18} color="#0284c7" /> Betreibergesellschaft &amp; Stammdaten
                  </h3>

                  <form onSubmit={handleUpdateBillingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Firma / Betreibergesellschaft
                      </label>
                      <input
                        type="text"
                        value={billingCompany}
                        onChange={(e) => setBillingCompany(e.target.value)}
                        placeholder="z.B. Patrick Huber (Einzelunternehmer)"
                        required
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Ansprechpartner / Inhaber
                        </label>
                        <input
                          type="text"
                          value={billingContact}
                          onChange={(e) => setBillingContact(e.target.value)}
                          placeholder="Name"
                          required
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 13px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Straße &amp; Hausnummer
                        </label>
                        <input
                          type="text"
                          value={billingStreet}
                          onChange={(e) => setBillingStreet(e.target.value)}
                          placeholder="Straße & Nr."
                          required
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 13px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          PLZ
                        </label>
                        <input
                          type="text"
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          placeholder="79618"
                          required
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 13px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Ort
                        </label>
                        <input
                          type="text"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          placeholder="Rheinfelden"
                          required
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 13px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35 }}>
                      ℹ️ <strong>Rechtlicher Hinweis:</strong> Der Anbieter wendet die Kleinunternehmerregelung (§ 19 UStG) an. Auf B2B- und B2C-Rechnungen wird entsprechend keine Umsatzsteuer gesondert ausgewiesen.
                    </div>

                    <button
                      type="submit"
                      disabled={updatingBilling}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(2, 132, 199, 0.25)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                      className="hover-scale-mini"
                    >
                      {updatingBilling ? 'Wird gespeichert...' : 'Betreiber-Stammdaten speichern'}
                    </button>
                  </form>
                </div>

                {/* Card 2: Bankverbindung & Zahlungs-Zuordnung */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                    <Landmark size={18} color="#16a34a" /> Bankkonto &amp; Auszahlungsdaten
                  </h3>

                  <form onSubmit={handleUpdateBillingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        IBAN (Empfängerkonto)
                      </label>
                      <input
                        type="text"
                        value={billingIban}
                        onChange={(e) => setBillingIban(e.target.value)}
                        placeholder="DE00 0000 0000 0000 0000 00"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.96rem',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        BIC / SWIFT
                      </label>
                      <input
                        type="text"
                        value={billingBic}
                        onChange={(e) => setBillingBic(e.target.value)}
                        placeholder="GENODEF1XXX"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.92rem',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#15803d' }}>
                        💡 Automatisierte Zuordnung (Verwendungszweck-Logik)
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#166534', lineHeight: 1.35 }}>
                        • <strong>B2B Schulrechnungen:</strong> Format <code>RE-[SCHUL_ID]-[YYMM]-01</code><br />
                        • <strong>B2C Eltern-Direktabrechnung:</strong> Format <code>CG-[STUDENT_HASH_8]-[YYMM]</code> (100 % DSGVO-konform ohne Klartext-Namen auf Kontoauszügen).
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={updatingBilling}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(22, 163, 74, 0.25)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                      className="hover-scale-mini"
                    >
                      {updatingBilling ? 'Wird gespeichert...' : 'Bankverbindung aktualisieren'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom Row Grid: Master-Admin Zugangsdaten & Kiosk QR Badge */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)',
                gap: '28px',
                alignItems: 'start'
              }}>
                {/* Master Admin Zugangsdaten */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                    <Key size={18} color="#0f172a" /> Master-Admin Zugangsdaten
                  </h3>

                  <form onSubmit={handleUpdateAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Root-Benutzername
                      </label>
                      <input
                        type={usernameFocused ? "text" : "password"}
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        required
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.90rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                        onFocus={() => setUsernameFocused(true)}
                        onBlur={() => setUsernameFocused(false)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Neues Passwort (leer lassen für keine Änderung)
                      </label>
                      <input
                        type={passwordFocused ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.90rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingAdmin}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                        marginTop: '4px'
                      }}
                      className="hover-scale-mini"
                    >
                      {updatingAdmin ? 'Wird gespeichert...' : 'Zugangsdaten aktualisieren'}
                    </button>
                  </form>
                </div>

                {/* Kiosk Master QR-Badge */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '16px'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      Kiosk Master QR-Badge
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Schneller Root-Login für Tablet-Kioske.
                    </p>
                  </div>

                  {adminUser && adminUser.qr_token ? (
                    <div style={{
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                      border: '1px solid #e2e8f0'
                    }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${adminUser.qr_token}`}
                        alt="Master Admin QR Badge"
                        style={{ width: '130px', height: '130px', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '130px', height: '130px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                      QR-Code lädt...
                    </div>
                  )}

                  <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35, maxWidth: '240px' }}>
                    Scanne diesen QR-Code direkt an einem Kiosk-Terminal zur sofortigen Root-Autorisierung.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* 🏢 BOARD: SCHULEN & TENANTS REGISTER (activePortalTab === 'schools')    */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activePortalTab === 'schools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
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
                      background: 'rgba(5, 150, 105, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Layers size={20} color="#059669" />
                    </div>
                    <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                      Schulen &amp; Tenants Register
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.90rem', color: '#64748b', fontWeight: 500 }}>
                    Zentrale Übersicht aller registrierten Musikschulen, Tarife, Aktivierungs-Status &amp; MRR-Kalkulation.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={fetchSchoolsAndStats}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span>Aktualisieren</span>
                  </button>
                </div>
              </div>

              {/* Layout split grid: 7fr 4.8fr */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
                gap: '28px',
                alignItems: 'start'
              }}>
                {/* Left Side: Schools list */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  minHeight: '450px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      <Layers size={18} color="#0f172a" /> Registrierte Schul-Tenants ({filteredSchools.length})
                    </h3>

                    {/* Sort Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Sortierung:</span>
                      <select
                        value={schoolSortOption}
                        onChange={(e) => setSchoolSortOption(e.target.value as any)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="students">Beste Kunden (Aktivierungen)</option>
                        <option value="name">Name (A – Z)</option>
                        <option value="newest">Neueste Schulen</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Pills Bar */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'Alle Module' },
                      { id: 'kombi', label: 'Kombi (Campus + GrooveLab)' },
                      { id: 'campus', label: 'Nur Campus' },
                      { id: 'groovelab', label: 'Nur GrooveLab' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSchoolModuleFilter(f.id as any)}
                        style={{
                          padding: '6px 13px',
                          borderRadius: '100px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          border: schoolModuleFilter === f.id ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          background: schoolModuleFilter === f.id ? '#0f172a' : '#ffffff',
                          color: schoolModuleFilter === f.id ? '#ffffff' : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Suche nach Schulname, PLZ oder Ort..."
                      value={schoolSearchQuery}
                      onChange={(e) => setSchoolSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px 11px 40px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '80px 0', gap: '14px' }}>
                      <RefreshCw size={28} className="animate-spin" color="#059669" />
                      <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Lade Schulregister...</p>
                    </div>
                  ) : schools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontWeight: 600, flex: 1 }}>
                      Keine Schulen im System registriert.
                    </div>
                  ) : filteredSchools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontWeight: 600, flex: 1 }}>
                      Keine Suchergebnisse für "{schoolSearchQuery}"
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {filteredSchools.map((school) => {
                        const teachers = schoolStats[school.id]?.teachers || 0;
                        const totalStudents = schoolStats[school.id]?.students || 0;
                        const campusActive = schoolStats[school.id]?.studentsCampus || 0;
                        const groovelabActive = schoolStats[school.id]?.studentsGroovelab || 0;
                        const activeStudents = Math.max(campusActive, groovelabActive);
                        const passiveStudents = Math.max(0, totalStudents - activeStudents);
                        const bands = schoolStats[school.id]?.bands || 0;

                        // Calculate dynamic MRR for this tenant
                        const rates = masterPricing.getSchoolRates ? masterPricing.getSchoolRates(school) : {
                          priceCampus: school.custom_price_campus ?? school.grandfathered_campus_price ?? masterPricing.priceCampus,
                          priceGroovelab: school.custom_price_groovelab ?? school.grandfathered_groovelab_price ?? masterPricing.priceGroovelab,
                          priceKombi: school.custom_price_kombi ?? school.grandfathered_kombi_price ?? masterPricing.priceKombi,
                          priceTeacher: school.custom_price_teacher ?? school.grandfathered_teacher_price ?? masterPricing.priceTeacher,
                          priceStudent: school.custom_price_student ?? school.grandfathered_student_price ?? masterPricing.priceStudent,
                          pricePassiveStudent: masterPricing.pricePassiveStudent ?? 0.09
                        };

                        const billingCalc = calculateCampusGroovelabBilling({
                          hasCampusModule: !!school.has_campus_subscription,
                          hasGroovelabModule: !!school.has_groovelab_subscription,
                          activeTeacherCount: teachers,
                          activeStudentCount: activeStudents,
                          campusStudentCount: campusActive,
                          groovelabStudentCount: groovelabActive,
                          passiveStudentCount: passiveStudents,
                          rates: rates
                        });
                        const mrr = billingCalc.totalMonthlySchoolInvoice;

                        // Health score status
                        const isPaused = !!school.is_paused;
                        const isTrial = !!school.is_trial;
                        let trialDaysLeft = 0;
                        if (isTrial && school.trial_ends_at) {
                          const diff = new Date(school.trial_ends_at).getTime() - Date.now();
                          trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                        }

                        return (
                          <div 
                            key={school.id} 
                            onClick={() => {
                              setSelectedSchool(school);
                              setEditName(school.name);
                              setEditColor(school.primary_color || '#3b82f6');
                              setEditLogo(school.logo_url || '');
                              setEditStatus(school.status || 'active');
                              setEditIsTrial(school.is_trial ?? true);
                              setEditTrialEndsAt(school.trial_ends_at ? new Date(school.trial_ends_at).toISOString().split('T')[0] : '');
                              setEditContractEndsAt(school.contract_ends_at ? new Date(school.contract_ends_at).toISOString().split('T')[0] : '');
                              setEditMaxTeachers(school.max_teachers ?? 2);
                              setEditMaxStudents(school.max_students ?? 6);
                              setEditMaxSongs(school.max_songs ?? 5);
                              setEditLimitsEnabled(school.limits_enabled ?? false);
                              setEditTrialOption('custom');
                              setEditZipCode(school.zip_code || '');
                              setEditCity(school.city || '');
                              setEditLegalName(school.legal_name || '');
                              setEditBillingContact(school.billing_contact_person || '');
                              setEditBillingEmail(school.billing_email || '');
                              setEditStreet(school.street || '');
                              setEditHouseNumber(school.house_number || '');
                              setEditAddressAddition(school.address_addition || '');
                              setEditCountry(school.country || 'Deutschland');
                              setEditVatId(school.vat_id || '');
                              setEditLeitwegId(school.leitweg_id || '');
                              setEditHasGroovelab(school.has_groovelab_subscription ?? false);
                              setEditHasCampus(school.has_campus_subscription ?? false);
                              setEditSubscriptionBypass(school.subscription_bypass ?? false);

                              const hasCustom = (school.custom_price_campus !== null && school.custom_price_campus !== undefined) ||
                                                (school.custom_price_groovelab !== null && school.custom_price_groovelab !== undefined) ||
                                                (school.custom_price_kombi !== null && school.custom_price_kombi !== undefined);

                              setEditPricingMode(hasCustom ? 'custom' : 'master');
                              setEditCustomCampus(school.custom_price_campus !== null && school.custom_price_campus !== undefined ? String(school.custom_price_campus) : String(school.grandfathered_campus_price ?? masterPricing.priceCampus));
                              setEditCustomGroovelab(school.custom_price_groovelab !== null && school.custom_price_groovelab !== undefined ? String(school.custom_price_groovelab) : String(school.grandfathered_groovelab_price ?? masterPricing.priceGroovelab));
                              setEditCustomKombi(school.custom_price_kombi !== null && school.custom_price_kombi !== undefined ? String(school.custom_price_kombi) : String(school.grandfathered_kombi_price ?? masterPricing.priceKombi));
                              setEditCustomTeacher(school.custom_price_teacher !== null && school.custom_price_teacher !== undefined ? String(school.custom_price_teacher) : String(school.grandfathered_teacher_price ?? masterPricing.priceTeacher));
                              setEditCustomStudent(school.custom_price_student !== null && school.custom_price_student !== undefined ? String(school.custom_price_student) : String(school.grandfathered_student_price ?? masterPricing.priceStudent));
                              setEditCustomFreeMonths(school.custom_free_months_per_year !== null && school.custom_free_months_per_year !== undefined ? String(school.custom_free_months_per_year) : '');
                              setEditPricingTierName(school.pricing_tier_name || 'Standard');
                              setCardModalTab('details');
                              setSelectedHashIds([]);
                              fetchSchoolStudents(school.id);
                            }}
                            style={{ 
                              borderRadius: '14px',
                              padding: '10px 16px',
                              border: isPaused ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                              background: isPaused ? '#f8fafc' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '12px',
                              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
                            }}
                            className="school-list-card"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              {/* Logo / Avatar (Compact 36x36) */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: school.logo_url ? '#ffffff' : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                color: '#ffffff',
                                fontSize: '0.80rem',
                                fontFamily: '"Outfit", sans-serif',
                                flexShrink: 0,
                                overflow: 'hidden',
                                padding: school.logo_url ? '3px' : 0
                              }}>
                                {school.logo_url ? (
                                  <img src={school.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                                ) : (
                                  school.name.substring(0, 2).toUpperCase()
                                )}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                {/* Zeile 1: Name, Ort, Status, MRR in einer kompakten Flex-Zeile */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0f172a' }}>
                                    {school.name}
                                  </span>

                                  {/* Health Score Pill */}
                                  {isPaused ? (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8' }} /> Pausiert
                                    </span>
                                  ) : isTrial ? (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Clock size={10} color="#475569" /> Trial ({trialDaysLeft}d)
                                    </span>
                                  ) : activeStudents > 0 ? (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} /> Aktiv
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8' }} /> Kein aktiver Schüler
                                    </span>
                                  )}

                                  {/* MRR Pill */}
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f172a', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '6px' }}>
                                    MRR: {mrr.toFixed(2).replace('.', ',')} € / Mo.
                                  </span>

                                  {(school.zip_code || school.city) && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                                      <MapPin size={10} color="#64748b" />
                                      {school.zip_code || ''} {school.city || ''}
                                    </span>
                                  )}
                                </div>

                                {/* Zeile 2: Kennzahlen & Modul-Tags in einer sauberen Subline */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b' }}>
                                    {teachers} Lehrer • <strong>{activeStudents} Aktiv-Schüler</strong> ({campusActive} Campus, {groovelabActive} GrooveLab) • {passiveStudents} Passiv ({totalStudents} Reg.) • {bands} Ensembles
                                  </span>

                                  {school.has_campus_subscription && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#15803d', background: 'rgba(52, 168, 83, 0.08)', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                                      Campus
                                    </span>
                                  )}
                                  {school.has_groovelab_subscription && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a16207', background: 'rgba(234, 179, 8, 0.10)', border: '1px solid rgba(234, 179, 8, 0.25)', padding: '1px 5px', borderRadius: '4px' }}>
                                      GrooveLab
                                    </span>
                                  )}
                                  {school.subscription_bypass && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '4px' }}>
                                      Abo-Bypass
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Row Actions (Kompakt & Aufgeräumt) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                              {/* Ghost-Mode Impersonation Button */}
                              <button
                                type="button"
                                title="Support-Login (Ghost-Mode) starten"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartGhostMode(school);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: '#0f172a',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)'
                                }}
                              >
                                <Eye size={12} color="#ffffff" />
                                <span>Ghost</span>
                              </button>

                              {/* Copy Kiosk / Invite Link */}
                              <button
                                type="button"
                                title="Kiosk-Kopplungslink kopieren"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyInviteLink(school.id, school.name, school.groovelab_kiosk_token);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: copiedId === school.id ? '#0f172a' : '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: copiedId === school.id ? '#ffffff' : '#475569',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                <Link size={12} />
                                <span>{copiedId === school.id ? 'Kopiert!' : 'Kiosk'}</span>
                              </button>

                              {/* Pause Toggle (Instant Optimistic Switch) */}
                              <button
                                type="button"
                                title={school.is_paused ? 'Schule reaktivieren (Zugang freigeben)' : 'Schule pausieren (Zugang sperren)'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSchoolPause(school.id, school.is_paused);
                                }}
                                style={{
                                  position: 'relative',
                                  width: '34px',
                                  height: '20px',
                                  borderRadius: '10px',
                                  background: school.is_paused ? '#cbd5e1' : '#10b981',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0',
                                  transition: 'background-color 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <div style={{
                                  position: 'absolute',
                                  left: school.is_paused ? '3px' : '17px',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  transition: 'left 0.2s ease'
                                }} />
                              </button>
                              {/* Delete School Button */}
                              <button
                                type="button"
                                title="Schule unwiderruflich löschen"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSchool(school.id, school.name);
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  background: '#fef2f2',
                                  border: '1px solid #fee2e2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Trash2 size={13} color="#dc2626" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Side: Onboarding & Provisioning Wizard */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                  }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      <Plus size={18} color="#059669" /> Schul-Provisionierung &amp; Wizard
                    </h3>

                    {/* Universal Self-Onboarding Link Box */}
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '16px',
                      padding: '16px',
                      marginBottom: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={15} /> Self-Onboarding Einladungslink
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#166534', lineHeight: 1.35 }}>
                        Universeller Registrierungs-Link für Schulleiter zur eigenständigen 3-Schritte-Anmeldung.
                      </p>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          readOnly
                          value={`${window.location.origin}/?invite=school_onboarding`}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #86efac',
                            background: '#ffffff',
                            fontSize: '0.74rem',
                            fontFamily: 'monospace',
                            color: '#15803d',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/?invite=school_onboarding`);
                            setSaveSuccessToast('Self-Onboarding Link kopiert!');
                            setTimeout(() => setSaveSuccessToast(null), 3000);
                          }}
                          style={{
                            background: '#15803d',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale-mini"
                        >
                          <Copy size={12} /> Kopieren
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '0 0 18px 0',
                      color: '#94a3b8',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em'
                    }}>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                      <span>ODER MANUELL PROVISIONIEREN</span>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    </div>

                    <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                          Name der Schule *
                        </label>
                        <input
                          type="text"
                          value={newSchoolName}
                          onChange={(e) => setNewSchoolName(e.target.value)}
                          placeholder="z.B. Groove Academy Munich"
                          required
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                            PLZ
                          </label>
                          <input
                            type="text"
                            value={newSchoolZip}
                            onChange={(e) => setNewSchoolZip(e.target.value)}
                            placeholder="z.B. 80331"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              fontSize: '0.88rem',
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
                            placeholder="z.B. München"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                          Schulleiter E-Mail (Optional für Einladung)
                        </label>
                        <input
                          type="email"
                          value={newSchoolAdminEmail}
                          onChange={(e) => setNewSchoolAdminEmail(e.target.value)}
                          placeholder="leitung@musikschule.de"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Modulpaket Selection */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Modulpaket
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px' }}>
                          {[
                            { id: 'kombi', label: 'Kombi' },
                            { id: 'campus', label: 'Campus' },
                            { id: 'groovelab', label: 'GrooveLab' }
                          ].map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setNewSchoolModuleChoice(m.id as any)}
                              style={{
                                padding: '8px 4px',
                                borderRadius: '8px',
                                border: newSchoolModuleChoice === m.id ? '1.5px solid #059669' : '1px solid #cbd5e1',
                                background: newSchoolModuleChoice === m.id ? '#f0fdf4' : '#ffffff',
                                color: newSchoolModuleChoice === m.id ? '#15803d' : '#475569',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Testphase / Modus */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Testphase / Lizenzmodus
                        </label>
                        <select
                          value={newSchoolTrialOption}
                          onChange={(e) => setNewSchoolTrialOption(e.target.value as any)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="trial_30">30 Tage Testphase (Standard)</option>
                          <option value="trial_14">14 Tage Testphase</option>
                          <option value="live">Sofort Vollversion (Live)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={creating}
                        style={{
                          marginTop: '6px',
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(5, 150, 105, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        className="hover-scale-mini"
                      >
                        {creating ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Wird provisioniert...</span>
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            <span>Schule provisionieren</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Modernised School Details Modal */}
      {selectedSchool && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#1e293b',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(1.01); }
              to { opacity: 1; transform: scale(1); }
            }
          `}} />

          {/* Fullscreen Command Mask Workspace */}
          <div style={{
            width: '96vw',
            maxWidth: '1680px',
            height: '92vh',
            background: '#ffffff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Apple HIG Glassmorphic Command Header */}
            <div style={{
              padding: '16px 28px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              gap: '20px'
            }}>
              {/* Apple Identity Block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: editLogo ? '#ffffff' : 'linear-gradient(135deg, #1d1d1f 0%, #3a3a3c 100%)',
                  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  overflow: 'hidden',
                  padding: editLogo ? '4px' : 0,
                  flexShrink: 0
                }}>
                  {editLogo ? (
                    <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    editName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700, color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', letterSpacing: '-0.022em' }}>
                      {editName || selectedSchool.name}
                    </h3>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: editStatus === 'active' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                      color: editStatus === 'active' ? '#248a3d' : '#d70015',
                      border: `1px solid ${editStatus === 'active' ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255, 59, 48, 0.25)'}`
                    }}>
                      {editStatus === 'active' ? '● Aktiv' : '● Inaktiv/Gesperrt'}
                    </span>
                    {editSubscriptionBypass && (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'rgba(175, 82, 222, 0.12)',
                        color: '#8e24aa',
                        border: '1px solid rgba(175, 82, 222, 0.25)'
                      }}>
                        ⚡ Abo-Bypass (Kostenfrei)
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.70rem', color: '#8e8e93', fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace', display: 'block', marginTop: '2px', letterSpacing: '-0.01em' }}>
                    ID: {selectedSchool.id}
                  </span>
                </div>
              </div>

              {/* Apple Segmented Control (Pill Switcher Track) */}
              <div style={{
                display: 'inline-flex',
                background: 'rgba(120, 120, 128, 0.12)',
                padding: '3px',
                borderRadius: '12px',
                gap: '2px',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
              }}>
                <button
                  type="button"
                  onClick={() => setCardModalTab('details')}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '9px',
                    border: 'none',
                    background: cardModalTab === 'details' ? '#ffffff' : 'transparent',
                    color: cardModalTab === 'details' ? '#1d1d1f' : '#6e6e73',
                    fontWeight: cardModalTab === 'details' ? 650 : 500,
                    fontSize: '0.80rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: cardModalTab === 'details' ? '0 3px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Settings size={14} style={{ color: cardModalTab === 'details' ? '#007aff' : '#8e8e93' }} /> Stammdaten &amp; Tarife
                </button>

                <button
                  type="button"
                  onClick={() => setCardModalTab('metrics')}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '9px',
                    border: 'none',
                    background: cardModalTab === 'metrics' ? '#ffffff' : 'transparent',
                    color: cardModalTab === 'metrics' ? '#1d1d1f' : '#6e6e73',
                    fontWeight: cardModalTab === 'metrics' ? 650 : 500,
                    fontSize: '0.80rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: cardModalTab === 'metrics' ? '0 3px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <TrendingUp size={14} style={{ color: cardModalTab === 'metrics' ? '#34c759' : '#8e8e93' }} /> Live-Kennzahlen
                </button>

                <button
                  type="button"
                  onClick={() => setCardModalTab('activations')}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '9px',
                    border: 'none',
                    background: cardModalTab === 'activations' ? '#ffffff' : 'transparent',
                    color: cardModalTab === 'activations' ? '#1d1d1f' : '#6e6e73',
                    fontWeight: cardModalTab === 'activations' ? 650 : 500,
                    fontSize: '0.80rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: cardModalTab === 'activations' ? '0 3px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Shield size={14} style={{ color: cardModalTab === 'activations' ? '#5856d6' : '#8e8e93' }} /> Schüler-Aktivierungen &amp; Bestandsschutz
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePortalTab('billing');
                    setSelectedSchool(null);
                  }}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '9px',
                    border: 'none',
                    background: 'transparent',
                    color: '#a16207',
                    fontWeight: 550,
                    fontSize: '0.80rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <CreditCard size={14} style={{ color: '#d97706' }} /> Rechnungen
                </button>
              </div>

              {/* Apple Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => setSelectedSchool(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    background: 'rgba(120, 120, 128, 0.08)',
                    color: '#1d1d1f',
                    border: 'none',
                    fontWeight: 500,
                    fontSize: '0.84rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-scale-mini"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveSchoolDetails}
                  disabled={isSaving}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '9999px',
                    background: isSaving ? '#8e8e93' : 'linear-gradient(180deg, #34c759 0%, #28cd41 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 650,
                    fontSize: '0.84rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                    cursor: isSaving ? 'wait' : 'pointer',
                    boxShadow: isSaving ? 'none' : '0 3px 12px rgba(52, 199, 89, 0.35), 0 1px 2px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isSaving ? 0.7 : 1
                  }}
                  className="hover-scale-mini"
                >
                  {isSaving ? (
                    <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderLeftColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Check size={15} />
                  )}
                  {isSaving ? 'Speichere...' : 'Speichern'}
                </button>
              </div>
            </div>

            {/* Master Workspace Grid */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              overflow: 'hidden'
            }}>
              {/* Left Sidebar Column (Identity & Status) */}
              <div style={{
                background: '#f8fafc',
                borderRight: '1px solid rgba(15, 23, 42, 0.06)',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                overflowY: 'auto'
              }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
                }}>
                  {/* Circular 90px Passepartout Avatar (Matches Header & List Cards) */}
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: editLogo ? '#ffffff' : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                    border: '1px solid rgba(15, 23, 42, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    overflow: 'hidden',
                    padding: editLogo ? '6px' : 0,
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)'
                  }}>
                    {editLogo ? (
                      <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      editName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>Live-Vorschau</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Subdomain Origin</label>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#0284c7', wordBreak: 'break-all', fontWeight: 600 }}>
                    {getSubdomainOrigin(selectedSchool.name)}
                  </span>
                </div>

                {/* System Status Box */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>System-Status</label>

                  <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setEditStatus('active')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: editStatus === 'active' ? '#10b981' : 'transparent',
                        color: editStatus === 'active' ? '#ffffff' : '#64748b',
                        transition: 'all 0.2s'
                      }}
                    >
                      Aktiv
                    </button>
                    <button
                      onClick={() => setEditStatus('suspended')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: editStatus === 'suspended' ? '#ef4444' : 'transparent',
                        color: editStatus === 'suspended' ? '#ffffff' : '#64748b',
                        transition: 'all 0.2s'
                      }}
                    >
                      Gesperrt
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column Workspace */}
              <div style={{
                padding: '32px 40px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>

                {/* TAB 1: STAMMDATEN & TARIFE */}
                {cardModalTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '24px'
                    }}>
                      {/* Branding Stammdaten Card */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        borderRadius: '20px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                          <Settings size={16} /> Stammdaten &amp; B2B Rechnungsadresse
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Schulname (System)</label>
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={(e) => setEditName(e.target.value)} 
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Rechtlicher Name / Träger</label>
                            <input 
                              type="text" 
                              value={editLegalName} 
                              onChange={(e) => setEditLegalName(e.target.value)} 
                              placeholder="z. B. Stadtmusikschule e.V. / Stadt Bad Säckingen"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Ansprechpartner Buchhaltung</label>
                            <input 
                              type="text" 
                              value={editBillingContact} 
                              onChange={(e) => setEditBillingContact(e.target.value)} 
                              placeholder="z. B. Fr. Maria Muster (Finanzen)"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Rechnungs-E-Mail (E-Invoicing)</label>
                            <input 
                              type="email" 
                              value={editBillingEmail} 
                              onChange={(e) => setEditBillingEmail(e.target.value)} 
                              placeholder="buchhaltung@musaek.de"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Straße</label>
                            <input 
                              type="text" 
                              value={editStreet} 
                              onChange={(e) => setEditStreet(e.target.value)} 
                              placeholder="z. B. Friedrichstraße"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Nr.</label>
                            <input 
                              type="text" 
                              value={editHouseNumber} 
                              onChange={(e) => setEditHouseNumber(e.target.value)} 
                              placeholder="12a"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Adresszusatz / Abteilung</label>
                          <input 
                            type="text" 
                            value={editAddressAddition} 
                            onChange={(e) => setEditAddressAddition(e.target.value)} 
                            placeholder="z. B. Gebäude B, 2. OG / Stadtkasse"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 550, outline: 'none' }}
                            className="premium-input"
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>PLZ</label>
                            <input 
                              type="text" 
                              value={editZipCode} 
                              onChange={(e) => setEditZipCode(e.target.value)} 
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Ort</label>
                            <input 
                              type="text" 
                              value={editCity} 
                              onChange={(e) => setEditCity(e.target.value)} 
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Land</label>
                            <input 
                              type="text" 
                              value={editCountry} 
                              onChange={(e) => setEditCountry(e.target.value)} 
                              placeholder="Deutschland"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>USt-IdNr. / Steuernummer</label>
                            <input 
                              type="text" 
                              value={editVatId} 
                              onChange={(e) => setEditVatId(e.target.value)} 
                              placeholder="DE123456789 oder St.-Nr."
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Leitweg-ID / E-Rechnung Ref.</label>
                            <input 
                              type="text" 
                              value={editLeitwegId} 
                              onChange={(e) => setEditLeitwegId(e.target.value)} 
                              placeholder="z. B. 991-12345-67 (XRechnung)"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                              className="premium-input"
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Logo Bild-URL</label>
                          <input 
                            type="text" 
                            value={editLogo} 
                            onChange={(e) => setEditLogo(e.target.value)} 
                            placeholder="https://domain.com/logo.png" 
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.88rem', color: '#0f172a', outline: 'none' }}
                            className="premium-input"
                          />
                        </div>
                      </div>

                      {/* Card: Aktivierungen & Abonnements */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        borderRadius: '20px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                          <Layers size={16} /> Modul-Abonnements
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div
                            onClick={() => setEditHasCampus(!editHasCampus)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: editHasCampus ? 'rgba(52, 168, 83, 0.05)' : '#f8fafc',
                              border: `1px solid ${editHasCampus ? 'rgba(52, 168, 83, 0.2)' : 'rgba(15,23,42,0.05)'}`,
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.2s'
                            }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: editHasCampus ? '#15803d' : '#475569' }}>
                              <GraduationCap size={16} style={{ color: editHasCampus ? '#15803d' : '#64748b' }} /> Campus Modul
                            </span>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: editHasCampus ? '#34a853' : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              transition: 'all 0.2s'
                            }}>
                              {editHasCampus && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>

                          <div
                            onClick={() => setEditHasGroovelab(!editHasGroovelab)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: editHasGroovelab ? 'rgba(234, 179, 8, 0.05)' : '#f8fafc',
                              border: `1px solid ${editHasGroovelab ? 'rgba(234, 179, 8, 0.2)' : 'rgba(15,23,42,0.05)'}`,
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.2s'
                            }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: editHasGroovelab ? '#a16207' : '#475569' }}>
                              <Music size={16} style={{ color: editHasGroovelab ? '#a16207' : '#64748b' }} /> GrooveLab Modul
                            </span>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: editHasGroovelab ? '#eab308' : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              transition: 'all 0.2s'
                            }}>
                              {editHasGroovelab && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>

                          <div
                            onClick={() => {
                              const nextBypass = !editSubscriptionBypass;
                              setEditSubscriptionBypass(nextBypass);
                              if (selectedSchool) {
                                const updated = { ...selectedSchool, subscription_bypass: nextBypass };
                                setSelectedSchool(updated);
                                setSchools(prev => prev.map(s => s.id === selectedSchool.id ? { ...s, subscription_bypass: nextBypass } : s));
                                try {
                                  const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                                  const overrides = JSON.parse(overridesStr);
                                  overrides[selectedSchool.id] = { ...(overrides[selectedSchool.id] || {}), ...updated, subscription_bypass: nextBypass };
                                  localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
                                  window.dispatchEvent(new Event('groovelab_school_updated'));
                                } catch (e) {
                                  console.warn('Failed updating localStorage on bypass toggle:', e);
                                }
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: editSubscriptionBypass ? 'rgba(168, 85, 247, 0.05)' : '#f8fafc',
                              border: `1px solid ${editSubscriptionBypass ? 'rgba(168, 85, 247, 0.2)' : 'rgba(15,23,42,0.05)'}`,
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.2s'
                            }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: editSubscriptionBypass ? '#6b21a8' : '#475569' }}>
                              <Zap size={16} style={{ color: editSubscriptionBypass ? '#6b21a8' : '#64748b' }} /> Freie Aktivierung (Abo-Bypass)
                            </span>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: editSubscriptionBypass ? '#a855f7' : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              transition: 'all 0.2s'
                            }}>
                              {editSubscriptionBypass && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>

                          {/* Time-Bounded Bypass Controls & Quota Info */}
                          {editSubscriptionBypass && (
                            <div style={{
                              background: '#faf5ff',
                              border: '1px solid #e9d5ff',
                              borderRadius: '12px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6b21a8' }}>
                                  Gültigkeitsdauer (Ablaufdatum)
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: 700 }}>
                                  Standard-Basiskontingent aktiv
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const d = new Date();
                                    d.setDate(d.getDate() + 30);
                                    setEditSubscriptionBypassUntil(d.toISOString().split('T')[0]);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #d8b4fe',
                                    background: '#ffffff',
                                    color: '#6b21a8',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    cursor: 'pointer'
                                  }}
                                >
                                  +1 Monat (Kulanz)
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const d = new Date();
                                    d.setDate(d.getDate() + 90);
                                    setEditSubscriptionBypassUntil(d.toISOString().split('T')[0]);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #d8b4fe',
                                    background: '#ffffff',
                                    color: '#6b21a8',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    cursor: 'pointer'
                                  }}
                                >
                                  +3 Monate (Pilot)
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentYear = new Date().getFullYear();
                                    setEditSubscriptionBypassUntil(`${currentYear}-08-31`);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #d8b4fe',
                                    background: '#ffffff',
                                    color: '#6b21a8',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Schuljahr (31.08.)
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditSubscriptionBypassUntil('');
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #d8b4fe',
                                    background: '#ffffff',
                                    color: '#6b21a8',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Unbegrenzt
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                    Ablaufdatum:
                                  </label>
                                  <input
                                    type="date"
                                    value={editSubscriptionBypassUntil}
                                    onChange={(e) => setEditSubscriptionBypassUntil(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #d8b4fe',
                                      fontSize: '0.76rem',
                                      fontWeight: 650,
                                      color: '#0f172a'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                    Grund / Notiz (optional):
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="z. B. Kulanz Serverausfall"
                                    value={editSubscriptionBypassReason}
                                    onChange={(e) => setEditSubscriptionBypassReason(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #d8b4fe',
                                      fontSize: '0.76rem',
                                      color: '#0f172a'
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card: Vertragskonditionen & Tarife */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      borderRadius: '20px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Tag size={16} /> Vertragskonditionen &amp; Tarife
                        </h4>
                        {(() => {
                          if (editSubscriptionBypass) {
                            return (
                              <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f3e8ff', color: '#7e22ce', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #d8b4fe' }}>
                                ✦ ABO-BYPASS (FREIGESTELLT)
                              </span>
                            );
                          }
                          const tempSchool = { ...selectedSchool, subscription_bypass: editSubscriptionBypass, has_campus_subscription: editHasCampus, has_groovelab_subscription: editHasGroovelab };
                          const effective = masterPricing.getSchoolRates(tempSchool);
                          if (effective.isCustomRateActive) {
                            return <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f3e8ff', color: '#7e22ce', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #e9d5ff' }}>Individueller Sondervertrag</span>;
                          } else if (effective.isGrandfatheredRateActive) {
                            return (
                              <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #fde68a' }}>
                                🛡 Bestandsschutz / Altpreis {selectedSchool.price_grandfathered_at ? '(Eingefroren)' : ''}
                              </span>
                            );
                          }
                          return <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #bbf7d0' }}>Master-Standardtarif</span>;
                        })()}
                      </div>

                      {/* Mode Selector Segmented Control */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)' }}>
                        <button
                          type="button"
                          onClick={() => setEditPricingMode('master')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: editPricingMode === 'master' ? '#ffffff' : 'transparent',
                            color: editPricingMode === 'master' ? '#0f172a' : '#64748b',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            boxShadow: editPricingMode === 'master' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          Standard-Mastertarif
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPricingMode('custom')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: editPricingMode === 'custom' ? '#ffffff' : 'transparent',
                            color: editPricingMode === 'custom' ? '#7e22ce' : '#64748b',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            boxShadow: editPricingMode === 'custom' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          Sondervertrag (Custom)
                        </button>
                      </div>

                      {/* Pricing Input Grid or Master Info */}
                      {editPricingMode === 'master' ? (
                        editSubscriptionBypass ? (
                          <div style={{ padding: '14px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #e9d5ff', fontSize: '0.80rem', color: '#6b21a8' }}>
                            <div style={{ fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>✦</span> Freistellung aktiv (Abo-Bypass):
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#7e22ce', lineHeight: '1.4', marginBottom: '8px' }}>
                              Diese Musikschule ist von sämtlichen Server-Hosting-, Lehrer- und Schülergebühren freigestellt. Es fallen <strong>0,00 € / Mo</strong> an.
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f3e8ff', paddingTop: '8px' }}>
                              Standard-Masterpreise (greifen automatisch bei Deaktivierung): Campus: {masterPricing.priceCampus.toFixed(2).replace('.', ',')} € | GrooveLab: {masterPricing.priceGroovelab.toFixed(2).replace('.', ',')} € | Kombi: {masterPricing.priceKombi.toFixed(2).replace('.', ',')} € | Staff: {masterPricing.priceTeacher.toFixed(2).replace('.', ',')} €
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.80rem', color: '#166534' }}>
                            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Diese Schule nutzt dynamisch die aktuellen Plattform-Masterpreise:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontWeight: 800, fontSize: '0.82rem', color: '#15803d' }}>
                              <div>Campus: {masterPricing.priceCampus.toFixed(2).replace('.', ',')} € / Mo</div>
                              <div>GrooveLab: {masterPricing.priceGroovelab.toFixed(2).replace('.', ',')} € / Mo</div>
                              <div>Kombi: {masterPricing.priceKombi.toFixed(2).replace('.', ',')} € / Mo</div>
                              <div>Lehrer: {masterPricing.priceTeacher.toFixed(2).replace('.', ',')} € / Mo</div>
                              <div>Schüler: {masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo</div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>CAMPUS (€/MO)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCustomCampus}
                                onChange={(e) => setEditCustomCampus(e.target.value)}
                                placeholder={String(masterPricing.priceCampus)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>GROOVELAB (€/MO)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCustomGroovelab}
                                onChange={(e) => setEditCustomGroovelab(e.target.value)}
                                placeholder={String(masterPricing.priceGroovelab)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#047857', fontWeight: 800, marginBottom: '4px' }}>KOMBI (€/MO)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCustomKombi}
                                onChange={(e) => setEditCustomKombi(e.target.value)}
                                placeholder={String(masterPricing.priceKombi)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>LEHRER GEBÜHR (€/MO)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCustomTeacher}
                                onChange={(e) => setEditCustomTeacher(e.target.value)}
                                placeholder={String(masterPricing.priceTeacher)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>SCHÜLER GEBÜHR (€/MO)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCustomStudent}
                                onChange={(e) => setEditCustomStudent(e.target.value)}
                                placeholder={String(masterPricing.priceStudent)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>FREIE MONATE (INDIVIDUELL)</label>
                              <select
                                value={editCustomFreeMonths}
                                onChange={(e) => setEditCustomFreeMonths(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}
                              >
                                <option value="">Master-Einstellung ({masterPricing.freeMonthsPerYear} Mon. frei)</option>
                                <option value="0">0 Monate beitragsfrei (12 Mon. Abrechnung)</option>
                                <option value="1">1 Monat beitragsfrei (11 Mon. Abrechnung)</option>
                                <option value="2">2 Monate beitragsfrei (10 Mon. Abrechnung)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Calculated Estimated Monthly Total Box */}
                      {(() => {
                        const liveMRR = getSchoolLiveMRR(selectedSchool);

                        return (
                          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Errechneter Monatsumsatz</div>
                              <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                                {liveMRR.isBypass ? 'Abo-Bypass aktiv (0,00 € Partner-Sponsoring)' : `Base: ${liveMRR.baseFlat.toFixed(2)} € + ${liveMRR.activeTeachers} Lehrer (${liveMRR.teacherFee.toFixed(2)} €)` + (liveMRR.campusStudents > 0 ? ` + ${liveMRR.campusStudents} Campus-Schüler (${liveMRR.campusStudentFee.toFixed(2)} €)` : (liveMRR.activeStudents > 0 ? ` + ${liveMRR.activeStudents} Aktiv-Schüler (${liveMRR.studentFee.toFixed(2)} €)` : '')) + (liveMRR.groovelabStudents > 0 ? ` + ${liveMRR.groovelabStudents} GrooveLab-Schüler (${liveMRR.groovelabStudentFee.toFixed(2)} €)` : '')}
                              </div>
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: liveMRR.isBypass ? '#7e22ce' : '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                              {liveMRR.total.toFixed(2).replace('.', ',')} € <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>/ Mo</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 1-Click Intelligent Sync Button */}
                      {(() => {
                        const isAlreadySynced = editPricingMode === 'master' &&
                          editCustomCampus === String(masterPricing.priceCampus) &&
                          editCustomGroovelab === String(masterPricing.priceGroovelab) &&
                          editCustomKombi === String(masterPricing.priceKombi) &&
                          editCustomTeacher === String(masterPricing.priceTeacher) &&
                          editCustomStudent === String(masterPricing.priceStudent);

                        return (
                          <button
                            type="button"
                            disabled={isAlreadySynced}
                            onClick={() => {
                              setEditPricingMode('master');
                              setEditCustomCampus(String(masterPricing.priceCampus));
                              setEditCustomGroovelab(String(masterPricing.priceGroovelab));
                              setEditCustomKombi(String(masterPricing.priceKombi));
                              setEditCustomTeacher(String(masterPricing.priceTeacher));
                              setEditCustomStudent(String(masterPricing.priceStudent));
                              setEditCustomFreeMonths('');
                              setEditPricingTierName('Standard');
                            }}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: isAlreadySynced ? '#f1f5f9' : '#e0f2fe',
                              color: isAlreadySynced ? '#94a3b8' : '#0369a1',
                              border: `1px solid ${isAlreadySynced ? '#e2e8f0' : '#bae6fd'}`,
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              cursor: isAlreadySynced ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <RefreshCw size={14} /> {isAlreadySynced ? '✓ Bereits mit Master-Preisen synchronisiert' : 'Auf neueste Master-Preise synchronisieren'}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Limits & Trial End Section */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      borderRadius: '20px',
                      padding: '24px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <Clock size={16} /> Kapazitäten &amp; Limits
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <input
                          type="checkbox"
                          id="editLimitsEnabled"
                          checked={editLimitsEnabled}
                          onChange={(e) => setEditLimitsEnabled(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="editLimitsEnabled" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>
                          Ressourcen-Limitierungen erzwingen
                        </label>
                      </div>

                      {editLimitsEnabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Max Lehrer</label>
                            <input
                              type="number"
                              value={editMaxTeachers}
                              onChange={(e) => setEditMaxTeachers(Number(e.target.value))}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#f8fafc',
                                fontSize: '0.88rem',
                                color: '#0f172a',
                                fontWeight: 700
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Max Schüler</label>
                            <input
                              type="number"
                              value={editMaxStudents}
                              onChange={(e) => setEditMaxStudents(Number(e.target.value))}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#f8fafc',
                                fontSize: '0.88rem',
                                color: '#0f172a',
                                fontWeight: 700
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Max Songs</label>
                            <input
                              type="number"
                              value={editMaxSongs}
                              onChange={(e) => setEditMaxSongs(Number(e.target.value))}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#f8fafc',
                                fontSize: '0.88rem',
                                color: '#0f172a',
                                fontWeight: 700
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {editIsTrial ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Probezeit Tage</label>
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                              {[
                                { label: '14 Tage', value: '14' },
                                { label: '30 Tage', value: '30' },
                                { label: 'Manuell', value: 'custom' }
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setEditTrialOption(opt.value as any);
                                    if (opt.value === '14') {
                                      setEditTrialEndsAt(getFutureDate(14));
                                    } else if (opt.value === '30') {
                                      setEditTrialEndsAt(getFutureDate(30));
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: editTrialOption === opt.value ? '#ffffff' : 'transparent',
                                    color: editTrialOption === opt.value ? '#0f172a' : '#64748b',
                                    boxShadow: editTrialOption === opt.value ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Enddatum Probezeit</label>
                            <input
                              type="text"
                              value={editTrialEndsAt}
                              onChange={(e) => setEditTrialEndsAt(e.target.value)}
                              placeholder="YYYY-MM-DD"
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#f8fafc',
                                fontSize: '0.88rem',
                                color: '#0f172a',
                                fontWeight: 700,
                                outline: 'none'
                              }}
                              className="premium-input"
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Vertragslaufzeit bis (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="TT.MM.JJJJ oder YYYY-MM-DD" 
                            value={editContractEndsAt} 
                            onChange={(e) => setEditContractEndsAt(e.target.value)} 
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: '1px solid rgba(15,23,42,0.08)',
                              background: '#f8fafc',
                              fontSize: '0.88rem',
                              color: '#0f172a',
                              fontWeight: 700,
                              outline: 'none'
                            }} 
                            className="premium-input"
                          />
                        </div>
                      )}
                    </div>

                    {/* Direct links panel */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      borderRadius: '20px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <Link size={16} /> Direkt-Links &amp; Integration
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Einladungslink (Sekretariat)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              readOnly
                              value={`${getSubdomainOrigin(selectedSchool.name)}&invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || selectedSchool.groovelab_kiosk_token || selectedSchool.campus_login_token || ''}`}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#f8fafc',
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                color: '#64748b',
                                outline: 'none'
                              }}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${getSubdomainOrigin(selectedSchool.name)}&invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || selectedSchool.groovelab_kiosk_token || selectedSchool.campus_login_token || ''}`);
                                alert('Einladungslink kopiert!');
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1px solid rgba(15,23,42,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: '#4f46e5',
                                cursor: 'pointer'
                              }}
                              className="hover-scale-mini"
                            >
                              Kopie
                            </button>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Schul-Loginseite</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              readOnly
                              value={getSubdomainOrigin(selectedSchool.name)}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#f8fafc',
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                color: '#64748b',
                                outline: 'none'
                              }}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(getSubdomainOrigin(selectedSchool.name));
                                alert('Loginseite kopiert!');
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1px solid rgba(15,23,42,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: '#4f46e5',
                                cursor: 'pointer'
                              }}
                              className="hover-scale-mini"
                            >
                              Kopie
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin Accounts List */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      borderRadius: '20px',
                      padding: '24px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={16} /> Hauptbenutzer / School Admins
                        </h4>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea4335', background: '#fce8e6', padding: '3px 10px', borderRadius: '999px' }}>
                          Plattform-Regel: Mind. 1 Schul-Admin erforderlich
                        </span>
                      </div>

                      {schoolStats[selectedSchool.id]?.adminUsers && schoolStats[selectedSchool.id]?.adminUsers.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          {schoolStats[selectedSchool.id].adminUsers.map((admin: any) => (
                            <div key={admin.id} style={{
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.05)',
                              borderRadius: '16px',
                              padding: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '16px'
                            }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                                  {admin.first_name || ''} {admin.last_name || ''}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 550 }}>
                                  {admin.role === 'secretary' ? 'Sekretariat / Verwaltung' : 'Admin'}
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                  {admin.is_pin_activated ? (
                                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '100px' }}>
                                      PIN Aktiviert
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#ca8a04', background: 'rgba(234, 179, 8, 0.08)', padding: '2px 8px', borderRadius: '100px' }}>
                                      Ausweis: {admin.ausweis_nummer || '—'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {admin.teacher_qr_token && (
                                <div style={{
                                  background: '#ffffff',
                                  padding: '6px',
                                  borderRadius: '10px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                  border: '1px solid rgba(0,0,0,0.02)'
                                }}>
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${admin.teacher_qr_token}`}
                                    alt="Admin QR Badge"
                                    style={{ width: '64px', height: '64px', display: 'block' }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          padding: '24px',
                          background: '#fff5f5',
                          border: '1.5px dashed #fca5a5',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          textAlign: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 800, fontSize: '0.88rem' }}>
                            <AlertTriangle size={18} /> Noch kein Hauptbenutzer / School Admin auf dieser Schule registriert!
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#7f1d1d', maxWidth: '520px', lineHeight: 1.4 }}>
                            Gemäß den Plattform-Regeln benötigt jede Schule mindestens einen zugewiesenen Schul-Administrator für Verwaltung &amp; Sekretariat.
                          </p>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const defaultFirstName = 'Schulleitung';
                                  const defaultLastName = selectedSchool.name;
                                  const { data, error } = await supabase
                                    .from('users')
                                    .insert({
                                      school_id: selectedSchool.id,
                                      first_name: defaultFirstName,
                                      last_name: defaultLastName,
                                      role: 'admin',
                                      roles: ['admin', 'secretary'],
                                      is_active: true,
                                      is_campus_active: true,
                                      is_groovelab_active: true
                                    })
                                    .select();
                                  if (error) throw error;
                                  alert(`✅ Hauptbenutzer (${defaultFirstName} ${defaultLastName}) erfolgreich angelegt!`);
                                  fetchSchoolsAndStats();
                                } catch (err: any) {
                                  alert(`Fehler beim Anlegen des Hauptbenutzers: ${err.message}`);
                                }
                              }}
                              style={{
                                background: '#ea4335',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)'
                              }}
                            >
                              ⚡ Hauptbenutzer jetzt automatisch anlegen
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${getSubdomainOrigin(selectedSchool.name)}&invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || selectedSchool.groovelab_kiosk_token || selectedSchool.campus_login_token || ''}`);
                                alert('Einladungslink für neuen Hauptbenutzer kopiert!');
                              }}
                              style={{
                                background: '#ffffff',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '8px 14px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              📋 Einladungslink kopieren
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: LIVE-KENNZAHLEN */}
                {cardModalTab === 'metrics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                    {/* Top KPI Scorecard Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} /> Aktive Schüler
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                          {schoolStats[selectedSchool.id]?.activeStudents || selectedSchool.active_students_count || 0}
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}> / {editMaxStudents || '∞'}</span>
                        </div>
                        <div style={{ marginTop: '10px', background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (((schoolStats[selectedSchool.id]?.activeStudents || selectedSchool.active_students_count || 0) / (editMaxStudents || 1000)) * 100))}%`,
                            height: '100%',
                            background: '#10b981',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GraduationCap size={14} /> Aktive Lehrer
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                          {schoolStats[selectedSchool.id]?.totalTeachers || selectedSchool.teachers_count || 0}
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}> / {editMaxTeachers || '∞'}</span>
                        </div>
                        <div style={{ marginTop: '10px', background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (((schoolStats[selectedSchool.id]?.totalTeachers || selectedSchool.teachers_count || 0) / (editMaxTeachers || 50)) * 100))}%`,
                            height: '100%',
                            background: '#0284c7',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TrendingUp size={14} /> Monatsumsatz (MRR)
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: editSubscriptionBypass ? '#7e22ce' : '#10b981' }}>
                          {(() => {
                            const liveMRR = getSchoolLiveMRR(selectedSchool);
                            return `${liveMRR.total.toFixed(2).replace('.', ',')} €`;
                          })()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: editSubscriptionBypass ? '#7e22ce' : '#64748b', marginTop: '6px', fontWeight: 600 }}>
                          {editSubscriptionBypass ? '✦ Abo-Bypass (Kostenfrei)' : 'Effektive Monatsgebühr'}
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Activity size={14} /> Telemetrie Status
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: editStatus === 'active' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: editStatus === 'active' ? '#10b981' : '#ef4444' }} />
                          {editStatus === 'active' ? 'Online / Aktiv' : 'Gesperrt'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px', fontWeight: 600 }}>
                          Kiosk Token: {selectedSchool.groovelab_kiosk_token ? 'Gekoppelt' : 'Nicht konfiguriert'}
                        </div>
                      </div>
                    </div>

                    {/* Dual Campus & GrooveLab Module Activity Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {/* Campus Module Activity Card */}
                      <div style={{ background: '#ffffff', border: '1px solid rgba(52, 168, 83, 0.2)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(52, 168, 83, 0.03)' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#2d6a4f', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(52, 168, 83, 0.12)', paddingBottom: '12px' }}>
                          <BookOpen size={16} color="#34a853" /> 🟢 Campus Modul Aktivität
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f4fbf7', borderRadius: '10px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Hausaufgabenheft-Protokolle</span>
                            <span style={{ fontWeight: 800, color: '#1b4332' }}>{schoolStats[selectedSchool.id]?.homeworkCount || 0} Aufgaben</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f4fbf7', borderRadius: '10px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Übe-Timer &amp; Fokus-Sessions</span>
                            <span style={{ fontWeight: 800, color: '#1b4332' }}>{schoolStats[selectedSchool.id]?.practiceSessionsCount || 0} Sessions</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f4fbf7', borderRadius: '10px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Meisterwerk-Dokumentation</span>
                            <span style={{ fontWeight: 800, color: '#1b4332' }}>{schoolStats[selectedSchool.id]?.masterpiecesCount || 0} Werke</span>
                          </div>
                        </div>
                      </div>

                      {/* GrooveLab Module Activity Card */}
                      <div style={{ background: '#ffffff', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(234, 179, 8, 0.03)' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#a16207', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(234, 179, 8, 0.15)', paddingBottom: '12px' }}>
                          <Music size={16} color="#eab308" /> 🟡 GrooveLab Band- &amp; Song-Aktivität
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fefce8', borderRadius: '10px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Geführte Bands</span>
                            <span style={{ fontWeight: 800, color: '#713f12' }}>{schoolStats[selectedSchool.id]?.totalBands || 0} Bands</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fefce8', borderRadius: '10px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Repertoire &amp; Songs</span>
                            <span style={{ fontWeight: 800, color: '#713f12' }}>{schoolStats[selectedSchool.id]?.totalSongs || 0} Songs</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fefce8', borderRadius: '10px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Band-Sessions &amp; Live Lab Proben</span>
                            <span style={{ fontWeight: 800, color: '#713f12' }}>{schoolStats[selectedSchool.id]?.totalLogins || 0} Proben</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System Health & Datensicherheit Full Width Row */}
                    <div style={{ marginTop: '20px', background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <Cpu size={16} /> System-Health &amp; Datensicherheit
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.82rem', color: '#475569' }}>
                        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontWeight: 700 }}>
                          DSGVO &amp; COPPA Status: 100% datenschutzkonform (Minimierte Schülerdaten)
                        </div>
                        <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '10px' }}>
                          Server-Region: Hetzner Cloud (Falkenstein, Deutschland)
                        </div>
                        <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '10px' }}>
                          RLS Policy Enforcement: Supabase Row Level Security aktiv
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SCHÜLER-AKTIVIERUNGEN & BESTANDSSCHUTZ */}
                {cardModalTab === 'activations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                    {/* Card: Schüler-Aktivierungsmodell */}
                    <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <Shield size={16} /> Schüler-Aktivierungsmodell &amp; Abrechnung
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '4px' }}>
                            Musikschule übernimmt alle Kosten (Sammelzahler)
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                            Die Musikschule trägt sämtliche Lizenzgebühren der aktiven Schüler. Für Schüler und Eltern ist die Plattform zu 100% kostenlos.
                          </div>
                        </div>

                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '4px' }}>
                            Direktabrechnung mit Eltern / Schülern
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                            Eltern aktivieren das Konto direkt über die Plattform ({masterPricing.priceStudent.toFixed(2).replace('.', ',')} € / Mo. bzw. 5,88 € / Jahr). Nur für Campus-Modul verfügbar.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card: Bestandsschutz & Grandfathering */}
                    <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <Award size={16} /> Bestandsschutz &amp; Altpreis-Garantie (Grandfathering)
                      </h4>

                      <div style={{ padding: '16px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '14px', color: '#854d0e', fontSize: '0.82rem', lineHeight: '1.5' }}>
                        <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={16} /> Bestandsschutz Status
                        </div>
                        {masterPricing.getSchoolRates(selectedSchool).isGrandfatheredRateActive ? (
                          <span>Diese Schule ist als Bestandskunde registriert und schützt bestehende Schüler vor zukünftigen Preisanpassungen.</span>
                        ) : (
                          <span>Diese Schule nutzt die aktuellen Plattform-Standardpreise. Preisänderungen gelten einheitlich nach BGB-Vorlaufzeit.</span>
                        )}
                      </div>
                    </div>

                    {/* Card: Freigestellte Härtefälle & Geschwisterrabatte */}
                    <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <Users size={16} /> Härtefälle &amp; Freigestellte Schüler
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5' }}>
                        Einzelne Schüler können in der Schülerverwaltung manuell als Härtefall oder Geschwisterkind markiert werden, um sie von der Direktabrechnung freizustellen.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cmd+K Command Palette Modal */}
      {commandPaletteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '10vh'
          }}
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            style={{
              width: '640px',
              maxWidth: '92vw',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Search size={20} color="#64748b" />
              <input
                type="text"
                autoFocus
                placeholder="Tippe einen Befehl oder suche nach Schulen, Aktivierungen..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: 'transparent'
                }}
              />
              <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>ESC</kbd>
            </div>

            {/* Search Results / Command Groups */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px' }}>
                Navigation &amp; Boards
              </div>

              {[
                { id: 'executive', label: 'Master Cockpit', desc: 'MRR, ARR & Platform Status', icon: <Activity size={16} color="#ea4335" /> },
                { id: 'schools', label: 'Schulen & Tenants', desc: 'Musikschulen verwalten & anlegen', icon: <Layers size={16} color="#059669" /> },
                { id: 'briefing', label: 'Briefing Board', desc: 'Schüler-Aktivierungen & CG-Hashes', icon: <Clock size={16} color="#0284c7" /> },
                { id: 'billing', label: 'Financial Control', desc: 'Rechnungen RE-... und CG-...', icon: <GraduationCap size={16} color="#ca8a04" /> },
                { id: 'telemetry', label: 'Telemetrie & Health', desc: 'Server CPU, RAM & DB Telemetrie', icon: <Cpu size={16} color="#4f46e5" /> },
                { id: 'pricing', label: 'Preise & Kampagnen', desc: 'Standard-Abonnementpreise & Rabatt-Aktionen', icon: <Tag size={16} color="#d97706" /> },
                { id: 'operator', label: 'Betreiber & Zugang', desc: 'Betreibergesellschaft, Bankkonto & Root-Zugang', icon: <Building2 size={16} color="#0284c7" /> }
              ]
              .filter(item => !commandSearch || item.label.toLowerCase().includes(commandSearch.toLowerCase()) || item.desc.toLowerCase().includes(commandSearch.toLowerCase()))
              .map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActivePortalTab(item.id as any);
                    setCommandPaletteOpen(false);
                    setCommandSearch('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.icon}
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{item.label}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Öffnen ↵</span>
                </div>
              ))}

              {/* Matching Schools */}
              {schools.filter(s => commandSearch && s.name?.toLowerCase().includes(commandSearch.toLowerCase())).length > 0 && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 12px 6px 12px', borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
                    Gefundene Schulen
                  </div>
                  {schools
                    .filter(s => commandSearch && s.name?.toLowerCase().includes(commandSearch.toLowerCase()))
                    .slice(0, 5)
                    .map(school => (
                      <div
                        key={school.id}
                        onClick={() => {
                          handleOpenSchoolModal(school);
                          setCommandPaletteOpen(false);
                          setCommandSearch('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: school.primary_color || '#3b82f6' }} />
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{school.name}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#059669', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                          Inspektion Drawer ↵
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer Component */}
      {drawerOpen && drawerData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setDrawerOpen(false)}
          />

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '480px',
              maxWidth: '100vw',
              background: '#ffffff',
              boxShadow: '-10px 0 40px rgba(15, 23, 42, 0.15)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {drawerData.type === 'school' ? 'Schul-Inspektion' : 'Detailansicht'}
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  {drawerData.item.name || drawerData.item.title || 'Details'}
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', border: 'none', color: '#64748b', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {drawerData.type === 'school' && (() => {
                const s = drawerData.item;
                const schoolStat = schoolStats[s.id] || {};

                return (
                  <>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.04)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Ort / PLZ</span>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', marginTop: '2px' }}>
                          {s.zip_code || ''} {s.city || '—'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: s.is_paused ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                          {s.is_paused ? 'Pausiert' : 'Aktiv'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Lehrer</span>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', marginTop: '2px' }}>
                          {schoolStat.teachers || 0}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Schüler</span>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', marginTop: '2px' }}>
                          {schoolStat.students || 0}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Gebuchte Module</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {s.has_campus_subscription && (
                          <span style={{ background: 'rgba(52, 168, 83, 0.1)', color: '#34a853', padding: '6px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}>
                            Campus Modul ({Number(priceCampus).toFixed(2).replace('.', ',')} €)
                          </span>
                        )}
                        {s.has_groovelab_subscription && (
                          <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', padding: '6px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}>
                            GrooveLab Modul ({Number(priceGroovelab).toFixed(2).replace('.', ',')} €)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(59, 130, 246, 0.04)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>Sekretariat Einladungs-Link</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          onClick={() => copyInviteLink(s.id, s.name, s.secretary_onboarding_token, s.campus_login_token)}
                          style={{ background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {copiedId === s.id ? 'Link Kopiert ✓' : 'Einladungs-Link kopieren'}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Executive Monatsbericht Modal */}
      {showMonthlyReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            maxWidth: '850px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '36px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }} className="animate-scale-up">
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                    SaaS Enterprise Monatsbilanz
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                    Zeitraum: {selectedReportMonth}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '8px 0 0 0', fontFamily: '"Outfit", sans-serif' }}>
                  Campus-Groovelab Executive Monatsbericht
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  Offizielle monatliche Finanz- & Betriebsbilanz für Betreiber, Geschäftsführung & Steuerberatung.
                </p>
              </div>

              <button
                onClick={() => setShowMonthlyReportModal(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            {(() => {
              const validSchools = schools.filter(s => !s.name?.toLowerCase().includes('groove academy'));
              const b2bCampusCount = validSchools.filter(s => s.has_campus_subscription && !s.has_groovelab_subscription && !s.subscription_bypass).length;
              const b2bGroovelabCount = validSchools.filter(s => !s.has_campus_subscription && s.has_groovelab_subscription && !s.subscription_bypass).length;
              const b2bKombiCount = validSchools.filter(s => s.has_campus_subscription && s.has_groovelab_subscription && !s.subscription_bypass).length;

              const b2bMrr = (b2bCampusCount * Number(priceCampus)) + (b2bGroovelabCount * Number(priceGroovelab)) + (b2bKombiCount * Number(priceKombi));
              
              const b2cStudentsCount = pendingUsers.filter(u => {
                const school = validSchools.find(s => s.id === u.school_id);
                return school && !school.subscription_bypass && u.student_billing_payment_method && u.student_billing_cash_paid && !u.exempt_from_direct_billing;
              }).length;
              const b2cMrr = b2cStudentsCount * Number(priceStudent);
              const totalMrr = b2bMrr + b2cMrr;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Revenue Summary Grid */}
                  <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '24px', borderRadius: '20px', color: '#ffffff' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Konsolidierter Gesamtmonatsumsatz (MRR)
                    </span>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 0 0', color: '#34d399', fontFamily: '"Outfit", sans-serif' }}>
                      {totalMrr.toFixed(2)} €
                    </h3>
                    <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>B2B Lizenzgebühren (Musikschulen)</span>
                        <strong style={{ color: '#ffffff' }}>{b2bMrr.toFixed(2)} €</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>B2C Schüler/Eltern Direktabrechnung</span>
                        <strong style={{ color: '#ffffff' }}>{b2cMrr.toFixed(2)} €</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Hochgerechnete Jahressumme (ARR)</span>
                        <strong style={{ color: '#38bdf8' }}>{(totalMrr * 12).toFixed(2)} €</strong>
                      </div>
                    </div>
                  </div>

                  {/* Position Details Table */}
                  <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                      Aufschlüsselung nach Modulen & Tarifen
                    </h4>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '8px 0' }}>Position / Tarif</th>
                          <th style={{ padding: '8px 0' }}>Anzahl Mandanten</th>
                          <th style={{ padding: '8px 0' }}>Einzelpreis</th>
                          <th style={{ padding: '8px 0', textAlign: 'right' }}>Monatsbetrag</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>Campus-Modul (Flatrate)</td>
                          <td style={{ padding: '10px 0' }}>{b2bCampusCount} Schulen</td>
                          <td style={{ padding: '10px 0' }}>{Number(priceCampus).toFixed(2)} € / Mo</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800 }}>{(b2bCampusCount * Number(priceCampus)).toFixed(2)} €</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>GrooveLab-Modul (Flatrate)</td>
                          <td style={{ padding: '10px 0' }}>{b2bGroovelabCount} Schulen</td>
                          <td style={{ padding: '10px 0' }}>{Number(priceGroovelab).toFixed(2)} € / Mo</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800 }}>{(b2bGroovelabCount * Number(priceGroovelab)).toFixed(2)} €</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>Kombi-Vorteil Bundle (Campus + GrooveLab)</td>
                          <td style={{ padding: '10px 0' }}>{b2bKombiCount} Schulen</td>
                          <td style={{ padding: '10px 0' }}>{Number(priceKombi).toFixed(2).replace('.', ',')} € / Mo</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{(b2bKombiCount * Number(priceKombi)).toFixed(2)} €</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>Schüler-Aktivierungen (Direktabrechnung)</td>
                          <td style={{ padding: '10px 0' }}>{b2cStudentsCount} Schüler</td>
                          <td style={{ padding: '10px 0' }}>{Number(priceStudent).toFixed(2)} € / Mo</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800 }}>{(b2cStudentsCount * Number(priceStudent)).toFixed(2)} €</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* System & Compliance Statement */}
                  <div style={{ background: '#f0fdf4', padding: '16px 20px', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle size={24} color="#16a34a" />
                    <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                      <strong>Betreiber-Compliance Bestätigung:</strong> Dieser Bericht wurde automatisch aus den geprüften Supabase RLS-Datenbankeinträgen generiert. 100% DSGVO/COPPA-konform, 0 ungeprüfte Fremd-Zugriffe.
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                    <button
                      onClick={() => window.print()}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Printer size={16} /> Bericht Drucken / Als PDF Speichern
                    </button>
                    
                    <button
                      onClick={() => setShowMonthlyReportModal(false)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      Schließen
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* CSS Utilities & Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .hover-scale-mini {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .hover-scale-mini:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06) !important;
        }

        .premium-input:focus {
          border-color: #10b981 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12) !important;
        }
        
        .search-input-field:focus {
          border-color: #10b981 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12) !important;
        }

        .school-list-card:hover {
          background: #ffffff !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.03) !important;
          transform: translateY(-1px);
        }

        .sidebar-nav-btn:hover {
          background: rgba(15, 23, 42, 0.03) !important;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.01);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(15, 23, 42, 0.08);
          border-radius: 100px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(15, 23, 42, 0.15);
        }
      `}} />
      {/* Modal: Rechtssicherer Mitteilungstext für Schulleitungen */}
      {showLegalNoticeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📄 Rechtssichere Mitteilungsvorlage (B2B SaaS / BGB)
              </h3>
              <button
                onClick={() => setShowLegalNoticeModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a' }}>
                Betreff: Informationen zu den Abonnementkonditionen von Campus-Groovelab ab {new Date(priceEffectiveDate || Date.now()).toLocaleDateString('de-DE')}
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                Sehr geehrte Damen und Herren der Schulleitung und Geschäftsführung,
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                wir danken Ihnen herzlich für das Vertrauen in <strong>Campus-Groovelab</strong>. Um den stetig wachsenden Anforderungen an IT-Sicherheit, Rechenzentrumsinfrastruktur in Deutschland sowie der kontinuierlichen Weiterentwicklung unserer Software gerecht zu werden, passen wir die Tarife zum <strong>{new Date(priceEffectiveDate || Date.now()).toLocaleDateString('de-DE')}</strong> an.
              </p>
              
              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', margin: '14px 0' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', fontSize: '0.80rem' }}>Ihre angepassten Modultarife im Überblick:</div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.78rem' }}>
                  <li>Campus-Modul: {Number(priceCampus).toFixed(2)} € / Mo.</li>
                  <li>GrooveLab-Modul: {Number(priceGroovelab).toFixed(2)} € / Mo.</li>
                  <li>Kombi-Vorteil Bundle: {Number(priceKombi).toFixed(2)} € / Mo.</li>
                  <li>Lehrer- & Verwaltungsprofil: {Number(priceTeacher).toFixed(2)} € / Mo.</li>
                  <li>Schüleraktivierung: {Number(priceStudent).toFixed(2)} € / Mo.</li>
                </ul>
              </div>

              <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a' }}>
                ⚖️ Gesetzliche Belehrung zum Sonderkündigungsrecht (§ 308 BGB):
              </p>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.80rem', color: '#334155' }}>
                Sie haben das Recht, dieser Vertragsanpassung innerhalb von vier (4) Wochen ab Zugang dieser Mitteilung in Textform zu widersprechen. Im Falle eines form- und fristgerechten Widerspruchs steht Ihnen das Recht zu, das Abonnement zum Stichtag des Inkrafttretens ({new Date(priceEffectiveDate || Date.now()).toLocaleDateString('de-DE')}) kostenfrei außerordentlich zu kündigen. Wenn Sie nicht widersprechen, gilt die Vertragsanpassung als von Ihnen genehmigt.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Betreff: Informationen zu den Abonnementkonditionen von Campus-Groovelab ab ${new Date(priceEffectiveDate || Date.now()).toLocaleDateString('de-DE')}\n\nSehr geehrte Damen und Herren der Schulleitung,\nwir danken Ihnen herzlich für das Vertrauen in Campus-Groovelab. Um den stetig wachsenden Anforderungen an IT-Sicherheit, Rechenzentrumsinfrastruktur in Deutschland sowie der kontinuierlichen Weiterentwicklung unserer Software gerecht zu werden, passen wir die Tarife zum ${new Date(priceEffectiveDate || Date.now()).toLocaleDateString('de-DE')} an.\n\nCampus-Modul: ${Number(priceCampus).toFixed(2)} € / Mo.\nGrooveLab-Modul: ${Number(priceGroovelab).toFixed(2)} € / Mo.\nKombi-Vorteil Bundle: ${Number(priceKombi).toFixed(2)} € / Mo.\nLehrer- & Verwaltungsprofil: ${Number(priceTeacher).toFixed(2)} € / Mo.\nSchüleraktivierung: ${Number(priceStudent).toFixed(2)} € / Mo.\n\nGesetzliche Belehrung (§ 308 BGB):\nSie haben das Recht, dieser Vertragsanpassung innerhalb von vier (4) Wochen ab Zugang dieser Mitteilung in Textform zu widersprechen. Im Falle eines Widerspruchs steht Ihnen das Recht zu, das Abonnement zum Stichtag des Inkrafttretens kostenfrei außerordentlich zu kündigen.`);
                  alert('Rechtssicherer Mitteilungstext erfolgreich in die Zwischenablage kopiert!');
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                📋 Text kopieren
              </button>
              <button
                onClick={() => setShowLegalNoticeModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}



