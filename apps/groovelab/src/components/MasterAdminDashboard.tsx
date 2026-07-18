import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, ShieldCheck, Plus, Copy, Check, Trash2, Users, Monitor, 
  MapPin, LogOut, RefreshCw, Layers, Award, Clock, Music, GraduationCap,
  Edit2, Settings, Sliders, Search, Tag, Percent,
  Activity, Cpu, Database, AlertTriangle, QrCode, UserPlus, Key, Eye, EyeOff,
  Link, Briefcase, Mail, Phone, Grid, List, ArrowLeft, Palette, CreditCard, HardDrive, Cloud
} from 'lucide-react';

interface ServerMetric {
  id: string;
  created_at: string;
  cpu_load: number;
  mem_used_mb: number;
  mem_total_mb: number;
  swap_used_mb: number;
  active_connections: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  volume_used_gb?: number;
  volume_total_gb?: number;
}

import { BillingDashboard } from './BillingDashboard';

interface School {
  id: string;
  name: string;
  is_active?: boolean;
  logo_url: string | null;
  primary_color: string;
  created_at?: string;
  is_paused?: boolean;
  status?: string;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  contract_ends_at?: string | null;
  contract_start_date?: string | null;
  max_teachers?: number;
  max_students?: number;
  max_songs?: number;
  limits_enabled?: boolean;
  zip_code?: string | null;
  city?: string | null;
  has_groovelab_subscription?: boolean;
  has_campus_subscription?: boolean;
  subscription_bypass?: boolean;
  groovelab_kiosk_token?: string | null;
  campus_login_token?: string | null;
  secretary_onboarding_token?: string | null;
  email?: string | null;
  phone_number?: string | null;
  student_billing_option?: string | null;
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
    return `${protocol}//localhost:${port}?subdomain=${subdomain}`;
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

function getSecretaryInviteUrl(schoolId: string, schoolName: string, token: string | null): string {
  const origin = getSubdomainOrigin(schoolName);
  const separator = origin.includes('?') ? '&' : '?';
  return `${origin}${separator}invite_school_id=${schoolId}&role=secretary&token=${token || ''}`;
}

interface MasterAdminDashboardProps {
  onLogout: () => void;
  currentUser?: any;
}

export function MasterAdminDashboard({ onLogout, currentUser }: MasterAdminDashboardProps) {
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
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [activePortalTab, setActivePortalTab] = useState<'schools' | 'briefing' | 'billing' | 'banking' | 'pricing'>('schools');
  
  // Briefing Board State
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

  // Mehrere Master-Admins verwalten
  const [masterAdmins, setMasterAdmins] = useState<any[]>([]);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [selectedAdminForQr, setSelectedAdminForQr] = useState<any>(null);

    // Pricing States
  const [priceCampus, setPriceCampus] = useState<number | string>(7.99);
  const [priceGroovelab, setPriceGroovelab] = useState<number | string>(4.99);
  const [priceTeacher, setPriceTeacher] = useState<number | string>(0.49);
  const [priceStudent, setPriceStudent] = useState<number | string>(0.49);
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState(10);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferActive, setNewOfferActive] = useState(true);

  // Master Billing Settings State
  const [billingCompany, setBillingCompany] = useState('Patrick Huber (Einzelunternehmer)');
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
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [preselectedSchoolId, setPreselectedSchoolId] = useState<string | null>(null);
  const [businessAnalyticsExpanded, setBusinessAnalyticsExpanded] = useState(false);
  
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
  const [editEmail, setEditEmail] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editHasGroovelab, setEditHasGroovelab] = useState(false);
  const [editHasCampus, setEditHasCampus] = useState(false);
  const [editSubscriptionBypass, setEditSubscriptionBypass] = useState(false);

  // Scalability States (Apple Standard layout toggles for 100-1000 Schools)
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list');
  const [filterSegment, setFilterSegment] = useState<'all' | 'campus' | 'groovelab' | 'bypass' | 'paused'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // School Admin Creation State
  const [showAddSchoolAdminForm, setShowAddSchoolAdminForm] = useState(false);
  const [newSchoolAdminFirstName, setNewSchoolAdminFirstName] = useState('');
  const [newSchoolAdminLastName, setNewSchoolAdminLastName] = useState('');
  const [newSchoolAdminEmail, setNewSchoolAdminEmail] = useState('');

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
      
      if (error) {
        console.error('Error fetching server metrics:', error);
      } else if (data) {
        setServerMetrics(data);
      }
    } catch (err) {
      console.error('Error in fetchServerMetrics:', err);
    } finally {
      setFetchingMetrics(false);
    }
  };

  useEffect(() => {
    fetchSchoolsAndStats();
    fetchMasterAdmins();
    fetchBillingSettings();
    fetchPendingUsers();
    fetchServerMetrics();
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
        setPriceTeacher(data.price_user_teacher ?? 0.49);
        setPriceStudent(data.price_user_student ?? 0.49);
        setSpecialOffers(data.special_offers ?? []);
      }
    } catch (err) {
      console.error('Error fetching billing settings:', err);
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
        .select('id, first_name, last_name, nickname, ausweis_nummer, student_billing_payment_method, student_billing_cash_paid, is_campus_active, is_groovelab_active, is_trial, created_at, school_id')
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
      const { error } = await supabase
        .from('master_billing_settings')
        .update({
          price_module_campus: Number(priceCampus),
          price_module_groovelab: Number(priceGroovelab),
          price_user_teacher: Number(priceTeacher),
          price_user_student: Number(priceStudent),
          special_offers: specialOffers,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
      if (error) throw error;
      alert('System-Preise & Angebote erfolgreich aktualisiert!');
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
      alert('Rechnungsadresse & Bankverbindung erfolgreich aktualisiert!');
    } catch (err: any) {
      alert('Fehler beim Speichern der Rechnungsadresse: ' + err.message);
    } finally {
      setUpdatingBilling(false);
    }
  };

  const fetchMasterAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_master_admin', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMasterAdmins(data || []);
      if (data && data.length > 0) {
        const current = data.find(d => d.id === currentUser?.id) || data[0];
        setAdminUser(current);
        setAdminUsername(current.master_admin_username || 'admin');
        setAdminPassword(current.master_admin_password || 'groovelab2026');
      }
    } catch (err) {
      console.error('Error fetching admin:', err);
    }
  };

  const handleCreateMasterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      alert('Bitte fülle alle Pflichtfelder aus.');
      return;
    }
    try {
      setCreatingAdmin(true);
      const newAdminId = window.crypto?.randomUUID ? window.crypto.randomUUID() : 'admin-' + Math.random().toString(36).substr(2, 9);
      const newQrToken = window.crypto?.randomUUID ? window.crypto.randomUUID() : 'qr-' + Math.random().toString(36).substr(2, 9);
      
      const { error } = await supabase
        .from('users')
        .insert({
          id: newAdminId,
          first_name: newAdminFirstName.trim() || 'Master',
          last_name: newAdminLastName.trim() || 'Admin',
          role: 'admin',
          is_master_admin: true,
          master_admin_username: newAdminUsername.trim(),
          master_admin_password: newAdminPassword.trim(),
          qr_token: newQrToken,
          school_id: null
        });

      if (error) throw error;

      alert('Neuer Master-Admin erfolgreich erstellt!');
      setShowAddAdminForm(false);
      setNewAdminFirstName('');
      setNewAdminLastName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      
      fetchMasterAdmins();
    } catch (err: any) {
      alert('Fehler beim Erstellen des Master-Admins: ' + err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleDeleteMasterAdmin = async (adminId: string, adminName: string) => {
    if (currentUser && adminId === currentUser.id) {
      alert('Du kannst dich nicht selbst löschen!');
      return;
    }
    if (masterAdmins.length <= 1) {
      alert('Es muss mindestens ein Master-Admin im System verbleiben!');
      return;
    }
    if (!confirm(`Möchtest du den Master-Admin "${adminName}" wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      alert('Master-Admin erfolgreich gelöscht!');
      fetchMasterAdmins();
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
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

  const calculateSchoolTotal = (school: any) => {
    const statsRow = schoolStats[school.id] || { teachers: 0, students: 0, teachersCampus: 0, studentsCampus: 0 };
    
    const rateCampus = parseFloat(String(priceCampus || 7.99));
    const rateGroovelab = parseFloat(String(priceGroovelab || 4.99));
    
    let baseFee = 0;
    if (school.has_campus_subscription) baseFee += rateCampus;
    if (school.has_groovelab_subscription) baseFee += rateGroovelab;
    
    const hasKombi = school.has_campus_subscription && school.has_groovelab_subscription;
    const kombiDiscountAmount = hasKombi ? 2.99 : 0.00;
    
    const staffFee = (statsRow.teachers || 0) * 0.49;
    
    const isPartial = school.student_billing_option === 'student_partial';
    const isFullDirect = school.student_billing_option === 'student_full';
    const passiveStudentsCount = isPartial ? (statsRow.students || 0) : (isFullDirect ? 0 : Math.max(0, (statsRow.students || 0) - (statsRow.studentsCampus || 0)));
    const passiveStudentsFee = passiveStudentsCount * 0.09;
    
    const userFee = staffFee + passiveStudentsFee;
    
    const isSchoolPayer = school.student_billing_option === 'option2' || school.student_billing_option === 'option3_2' || school.student_billing_option === 'option3_3';
    const activeStudentFee = (isSchoolPayer && school.student_billing_option === 'option2') ? (statsRow.studentsCampus || 0) * 0.49 : 0.00;
    
    const subtotal = Math.max(0, (baseFee - kombiDiscountAmount) + userFee + activeStudentFee);
    
    const isBypass = school.subscription_bypass || false;
    const isTrial = school.is_trial || false;
    const isSuspended = school.status === 'suspended';
    
    const total = (isBypass || isTrial || isSuspended) ? 0.00 : subtotal;
    return parseFloat(total.toFixed(2));
  };

  const getUnpaidInvoices = () => {
    const list: any[] = [];
    const deMonths = [
      '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    const systemDate = new Date();
    const currentYear = systemDate.getFullYear();
    const currentMonth = systemDate.getMonth() + 1;

    schools.forEach(school => {
      // 1. Get database invoices for this school
      const schoolDbInvs = dbInvoices.filter(i => i.school_id === school.id && (i.status === 'open' || i.status === 'overdue'));
      schoolDbInvs.forEach(i => {
        list.push({
          id: i.id,
          schoolId: school.id,
          schoolName: school.name,
          billing_date: i.billing_date ? i.billing_date.split('T')[0].split('-').reverse().join('.') : '',
          amount: i.amount,
          status: i.status,
          isDb: true
        });
      });

      // 2. Get procedurally generated invoices
      const storedDate = localStorage.getItem(`contractStartDate_${school.id}`) || school.contract_start_date;
      const contractDateObj = storedDate ? new Date(storedDate) : new Date('2026-07-01T12:00:00Z');
      
      const startYear = contractDateObj.getFullYear();
      const startMonth = contractDateObj.getMonth() + 1;
      
      let y = startYear;
      let m = startMonth;

      const schoolTotal = calculateSchoolTotal(school);
      if (schoolTotal > 0) {
        while (y < currentYear || (y === currentYear && m <= currentMonth)) {
          const monthStr = m < 10 ? `0${m}` : `${m}`;
          const invId = `RE-${y}-${monthStr}`;
          
          const lastDay = new Date(y, m, 0).getDate();
          const monthName = deMonths[m];
          const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
          
          const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
          const isCreated = systemDate.getTime() >= creationTime.getTime();
          
          // Check if paid in localStorage
          const paidInvoicesList = JSON.parse(localStorage.getItem(`paid_invoices_${school.id}`) || '[]');
          const isMarkedPaid = paidInvoicesList.includes(invId);

          if (isCreated && !isMarkedPaid) {
            // Also ensure it is not already overridden by a database invoice with same ID
            const isOverridden = dbInvoices.some(dbi => dbi.id === invId && dbi.school_id === school.id);
            if (!isOverridden) {
              list.push({
                id: invId,
                schoolId: school.id,
                schoolName: school.name,
                billing_date: invoiceDateStr,
                amount: schoolTotal,
                status: 'open',
                isDb: false
              });
            }
          }
          
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
        }
      }
    });

    return list;
  };

  const toggleInvoicePaidFromBriefing = async (invoice: any) => {
    if (invoice.isDb) {
      try {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoice.id);
        if (error) throw error;
        // Refresh dbInvoices
        const { data: dbInvs } = await supabase.from('invoices').select('*');
        if (dbInvs) setDbInvoices(dbInvs);
        alert('Rechnung erfolgreich verbucht!');
      } catch (err: any) {
        alert('Fehler beim Verbuchen: ' + err.message);
      }
    } else {
      // Generated invoice: update localStorage
      const paidInvoicesList = JSON.parse(localStorage.getItem(`paid_invoices_${invoice.schoolId}`) || '[]');
      if (!paidInvoicesList.includes(invoice.id)) {
        paidInvoicesList.push(invoice.id);
        localStorage.setItem(`paid_invoices_${invoice.schoolId}`, JSON.stringify(paidInvoicesList));
        // Force refresh state
        fetchSchoolsAndStats();
        alert('Rechnung erfolgreich verbucht!');
      }
    }
  };

  const renderBriefingTab = () => {
    const unpaidInvs = getUnpaidInvoices();
    
    let mrrTotal = 0;
    let baseSubTotal = 0;
    let staffSubTotal = 0;
    let studentActiveSubTotal = 0;
    let studentPassiveSubTotal = 0;

    let campusOnlyCount = 0;
    let groovelabOnlyCount = 0;
    let kombiCount = 0;

    schools.forEach((school) => {
      const isBypass = school.subscription_bypass || false;
      const isTrial = school.is_trial || false;
      const isSuspended = school.status === 'suspended';
      const statsRow = schoolStats[school.id] || { teachers: 0, students: 0, teachersCampus: 0, studentsCampus: 0 };
      
      const rateCampus = parseFloat(String(priceCampus || 7.99));
      const rateGroovelab = parseFloat(String(priceGroovelab || 4.99));
      
      let baseFee = 0;
      if (school.has_campus_subscription) baseFee += rateCampus;
      if (school.has_groovelab_subscription) baseFee += rateGroovelab;
      
      const hasKombi = school.has_campus_subscription && school.has_groovelab_subscription;
      const kombiDiscountAmount = hasKombi ? 2.99 : 0.00;
      const schoolBaseFee = Math.max(0, baseFee - kombiDiscountAmount);

      const staffFee = (statsRow.teachers || 0) * 0.49;
      
      const isPartial = school.student_billing_option === 'student_partial';
      const isFullDirect = school.student_billing_option === 'student_full';
      const passiveStudentsCount = isPartial ? (statsRow.students || 0) : (isFullDirect ? 0 : Math.max(0, (statsRow.students || 0) - (statsRow.studentsCampus || 0)));
      const passiveStudentsFee = passiveStudentsCount * 0.09;
      
      const isSchoolPayer = school.student_billing_option === 'option2' || school.student_billing_option === 'option3_2' || school.student_billing_option === 'option3_3';
      const activeStudentFee = (isSchoolPayer && school.student_billing_option === 'option2') ? (statsRow.studentsCampus || 0) * 0.49 : 0.00;

      if (!isBypass && !isTrial && !isSuspended) {
        mrrTotal += (schoolBaseFee + staffFee + passiveStudentsFee + activeStudentFee);
        baseSubTotal += schoolBaseFee;
        staffSubTotal += staffFee;
        studentActiveSubTotal += activeStudentFee;
        studentPassiveSubTotal += passiveStudentsFee;
      }

      if (school.has_campus_subscription && school.has_groovelab_subscription) {
        kombiCount++;
      } else if (school.has_campus_subscription) {
        campusOnlyCount++;
      } else if (school.has_groovelab_subscription) {
        groovelabOnlyCount++;
      }
    });

    const activePaidCount = schools.filter(s => !s.is_trial && s.status === 'active').length;
    const activeTrialCount = schools.filter(s => s.is_trial && s.status === 'active').length;
    
    const latestMetric = serverMetrics[0] || null;
    const cpuVal = latestMetric ? latestMetric.cpu_load : 0;
    const ramUsed = latestMetric ? latestMetric.mem_used_mb : 0;
    const ramTotal = latestMetric ? latestMetric.mem_total_mb : 8000;
    const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0;
    const dbConns = latestMetric ? latestMetric.active_connections : 0;
    
    const diskUsed = latestMetric?.disk_used_gb ?? 18.0;
    const diskTotal = latestMetric?.disk_total_gb ?? 40.0;
    const diskPct = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;
    
    const volUsed = latestMetric?.volume_used_gb ?? 2.1;
    const volTotal = latestMetric?.volume_total_gb ?? 14.0;
    const volPct = volTotal > 0 ? (volUsed / volTotal) * 100 : 0;

    const serverAlerts: any[] = [];
    if (cpuVal >= 4.0) {
      serverAlerts.push({ metric: 'cpu', level: 'Kritisch', message: `Server-CPU ist kritisch überlastet (${cpuVal.toFixed(2)} Cores)` });
    } else if (cpuVal >= 2.0) {
      serverAlerts.push({ metric: 'cpu', level: 'Warnung', message: `Server-CPU hat erhöhte Last (${cpuVal.toFixed(2)} Cores)` });
    }

    if (ramPct >= 90) {
      serverAlerts.push({ metric: 'ram', level: 'Kritisch', message: `Arbeitsspeicher fast voll (${ramPct.toFixed(0)}%)` });
    } else if (ramPct >= 75) {
      serverAlerts.push({ metric: 'ram', level: 'Warnung', message: `Arbeitsspeicher-Auslastung erhöht (${ramPct.toFixed(0)}%)` });
    }

    if (dbConns >= 80) {
      serverAlerts.push({ metric: 'db', level: 'Kritisch', message: `Datenbank-Pool fast ausgelastet (${dbConns}/100 Connections)` });
    } else if (dbConns >= 50) {
      serverAlerts.push({ metric: 'db', level: 'Warnung', message: `Erhöhte DB-Pool-Auslastung (${dbConns}/100 Connections)` });
    }

    if (diskPct >= 90) {
      serverAlerts.push({ metric: 'ssd', level: 'Kritisch', message: `SSD Festplattenspeicher fast voll (${diskPct.toFixed(0)}%)` });
    } else if (diskPct >= 75) {
      serverAlerts.push({ metric: 'ssd', level: 'Warnung', message: `SSD-Festplatten-Speicherplatz knapp (${diskPct.toFixed(0)}%)` });
    }

    const totalPendingCount = pendingUsers.length + unpaidInvs.length + serverAlerts.length;
    
    const latestSchools = [...schools]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 4);

    let healthStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
    if (cpuVal >= 4.0 || ramPct >= 90 || dbConns >= 80 || diskPct >= 90 || volPct >= 90) {
      healthStatus = 'critical';
    } else if (cpuVal >= 2.0 || ramPct >= 75 || dbConns >= 50 || diskPct >= 75 || volPct >= 75) {
      healthStatus = 'warning';
    }

    const formattedTime = latestMetric 
      ? new Date(latestMetric.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      : '--:--:--';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
        {/* Header Panel - Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
              Guten Morgen, Patrick.
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              Hier ist dein System-Briefing für heute.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => {
                fetchPendingUsers();
                fetchSchoolsAndStats();
                fetchServerMetrics();
              }}
              disabled={loadingPending}
              style={{
                padding: '12px 18px',
                borderRadius: '14px',
                background: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                color: '#475569',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#ea4335';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#ea4335';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
              }}
            >
              <RefreshCw size={14} className={loadingPending ? 'animate-spin' : ''} /> Aktualisieren
            </button>
          </div>
        </div>

        {/* Stats Cards Dashboard (System Overview) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px'
        }}>
          {/* Total Schools */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '14px 18px',
            border: '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block', lineHeight: 1.2 }}>{stats.totalSchools}</strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schulen</span>
            </div>
          </div>

          {/* Total Teachers */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '14px 18px',
            border: '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.1)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block', lineHeight: 1.2 }}>{stats.totalTeachers}</strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lehrkräfte</span>
            </div>
          </div>

          {/* Total Students */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '14px 18px',
            border: '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block', lineHeight: 1.2 }}>{stats.totalStudents}</strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schüler</span>
            </div>
          </div>

          {/* Total Active Users */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '14px 18px',
            border: '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block', lineHeight: 1.2 }}>{stats.totalTeachers + stats.totalStudents}</strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktive Nutzer</span>
            </div>
          </div>

          {/* Pending Activations (Red Highlight) */}
          <div style={{
            background: totalPendingCount > 0 ? 'rgba(234, 67, 53, 0.05)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '14px 18px',
            border: totalPendingCount > 0 ? '1px solid rgba(234, 67, 53, 0.2)' : '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: totalPendingCount > 0 ? '0 4px 12px rgba(234, 67, 53, 0.05)' : '0 4px 12px rgba(15, 23, 42, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: totalPendingCount > 0 ? 'rgba(234, 67, 53, 0.15)' : 'rgba(100, 116, 139, 0.1)', color: totalPendingCount > 0 ? '#ea4335' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: totalPendingCount > 0 ? '#ea4335' : '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block', lineHeight: 1.2 }}>{totalPendingCount}</strong>
              <span style={{ fontSize: '0.7rem', color: totalPendingCount > 0 ? '#ea4335' : '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ausstehend</span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Briefing Layout */}
        <div style={{ display: 'flex', flexDirection: isMobileOrTablet ? 'column' : 'row', gap: '24px', alignItems: 'stretch' }}>
          
          {/* Left Column: Aktionsbedarf (65% width) */}
          <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Aktionsbedarf</h3>
              {totalPendingCount > 0 && (
                <span style={{ background: '#ea4335', color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>
                  {totalPendingCount} offen
                </span>
              )}
            </div>

            {/* Server Alerts Section */}
            {serverAlerts.length > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px dashed rgba(239, 68, 68, 0.15)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <AlertTriangle size={15} /> System- &amp; Server-Alarme
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {serverAlerts.map((alert, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.04)', padding: '12px 16px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#334155' }}>{alert.message}</span>
                      <span style={{ fontSize: '0.74rem', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>{alert.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unpaid Invoices Section */}
            {unpaidInvs.length > 0 && (
              <div style={{
                background: 'rgba(234, 67, 53, 0.02)',
                border: '1px dashed rgba(234, 67, 53, 0.15)',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea4335', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <CreditCard size={15} /> Ausstehende Rechnungen ({unpaidInvs.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {unpaidInvs.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.04)', padding: '12px 16px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{inv.schoolName}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                            {inv.id} • {inv.billing_date}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                          {inv.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => toggleInvoicePaidFromBriefing(inv)}
                          style={{
                            background: 'transparent',
                            color: '#34a853',
                            border: '1px solid rgba(52, 168, 83, 0.2)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={(e: any) => e.currentTarget.style.background = '#e6f4ea'}
                          onMouseOut={(e: any) => e.currentTarget.style.background = 'transparent'}
                        >
                          Direkt verbuchen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreselectedSchoolId(inv.schoolId);
                            setActivePortalTab('billing');
                          }}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid rgba(15, 23, 42, 0.06)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={(e: any) => e.currentTarget.style.background = '#e2e8f0'}
                          onMouseOut={(e: any) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Activations (Aktivierungs-Center) */}
            {pendingUsers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ausstehende Freischaltungen ({pendingUsers.length})
                </div>
                <div style={{ display: 'flex', gap: '24px', minHeight: '520px', alignItems: 'stretch' }}>
                  
                  {/* Left Pane: List of pending users */}
                  <div style={{
                    flex: '0 0 45%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    {/* Batch Action Bar if selected */}
                    {selectedUserIds.length > 0 && (
                      <div style={{ padding: '12px 20px', background: 'rgba(234, 67, 53, 0.05)', borderBottom: '1px solid rgba(234, 67, 53, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea4335' }}>
                          {selectedUserIds.length} ausgewählt
                        </span>
                        <button
                          onClick={() => handleBatchActivateUsers(selectedUserIds)}
                          disabled={loadingPending}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: '#ea4335',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(234, 67, 53, 0.3)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 67, 53, 0.4)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 67, 53, 0.3)'; }}
                        >
                          Ausgewählte freischalten
                        </button>
                      </div>
                    )}

                    {/* Search Bar inside pane */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '32px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        value={pendingSearchQuery}
                        onChange={(e) => setPendingSearchQuery(e.target.value)}
                        placeholder="Suche Name, Schule, Ausweis-Nr..."
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 14px 10px 36px',
                          borderRadius: '12px',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          background: '#f8fafc',
                          color: '#0f172a',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#ea4335'; e.currentTarget.style.background = '#ffffff'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)'; e.currentTarget.style.background = '#f8fafc'; }}
                      />
                    </div>

                    {/* Bulk Select Utility bar */}
                    <div style={{
                      padding: '10px 20px',
                      background: '#f8fafc',
                      borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: '#64748b',
                      fontWeight: 600
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.length === pendingUsers.length && pendingUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(pendingUsers.map(u => u.id));
                            } else {
                              setSelectedUserIds([]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        Alle auswählen ({pendingUsers.length})
                      </label>
                    </div>

                    {/* Scrollable list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                      {pendingUsers
                        .filter(u => {
                          const term = pendingSearchQuery.toLowerCase().trim();
                          if (!term) return true;
                          const school = schools.find(s => s.id === u.school_id);
                          const schoolName = school ? school.name.toLowerCase() : '';
                          return (
                            `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
                            (u.nickname && u.nickname.toLowerCase().includes(term)) ||
                            (u.ausweis_nummer && u.ausweis_nummer.toLowerCase().includes(term)) ||
                            schoolName.includes(term)
                          );
                        })
                        .map((u) => {
                          const isSelected = selectedUser?.id === u.id;
                          const school = schools.find(s => s.id === u.school_id);
                          const isChecked = selectedUserIds.includes(u.id);

                          return (
                            <div
                              key={u.id}
                              onClick={() => setSelectedUser(u)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 14px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(234, 67, 53, 0.05)' : 'transparent',
                                border: isSelected ? '1px solid rgba(234, 67, 53, 0.1)' : '1px solid transparent',
                                transition: 'all 0.2s',
                                marginBottom: '6px'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUserIds(prev => [...prev, u.id]);
                                  } else {
                                    setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: school?.primary_color ? `${school.primary_color}10` : 'rgba(0,0,0,0.03)',
                                color: school?.primary_color || '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem'
                              }}>
                                {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{u.first_name} {u.last_name}</strong>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>{school?.name || 'Keine Schule'}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right Pane: Selected user details */}
                  <div style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.03)',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedUser ? (
                      (() => {
                        const u = selectedUser;
                        const school = schools.find(s => s.id === u.school_id);
                        const refCode = `CG-${u.ausweis_nummer || 'OHNE'}`;
                        const isActivating = activatingUserId === u.id;
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', width: '100%' }} className="animate-fade-in">
                            {/* Profile Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
                              <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: school?.primary_color ? `${school.primary_color}1a` : 'rgba(15, 23, 42, 0.05)',
                                color: school?.primary_color || '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                fontWeight: 900
                              }}>
                                {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                              </div>
                              <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                                  {u.first_name} {u.last_name}
                                </h3>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Rolle: Schüler (Campus-Groovelab)</span>
                              </div>
                            </div>

                            {/* Details List */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musikschule</span>
                                <strong style={{ fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  {school?.name || 'Unbekannte Schule'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zahlungsmethode</span>
                                <strong style={{ fontSize: '0.95rem', color: '#334155', display: 'block', marginTop: '4px' }}>
                                  {u.student_billing_payment_method === 'bank_transfer' ? 'Überweisung (Vorkasse)' : u.student_billing_payment_method}
                                </strong>
                              </div>
                            </div>

                            {/* Reference Code Match Card (Apple-Style Highlight) */}
                            <div style={{
                              background: '#f8fafc',
                              borderRadius: '16px',
                              padding: '20px 24px',
                              border: '1px solid rgba(15, 23, 42, 0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verwendungszweck für Kontomuster</span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                <code style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                  {refCode}
                                </code>
                                
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(refCode);
                                    setCopiedCodeId(u.id);
                                    setTimeout(() => setCopiedCodeId(null), 2000);
                                  }}
                                  style={{
                                    background: copiedCodeId === u.id ? '#ea4335' : '#ffffff',
                                    color: copiedCodeId === u.id ? '#ffffff' : '#475569',
                                    border: copiedCodeId === u.id ? '1px solid #ea4335' : '1px solid rgba(15, 23, 42, 0.08)',
                                    borderRadius: '12px',
                                    padding: '10px 16px',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
                                  }}
                                >
                                  {copiedCodeId === u.id ? (
                                    <>Kopiert ✓</>
                                  ) : (
                                    <>
                                      <Copy size={14} /> Kopieren
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Fee calculation details */}
                            <div style={{
                              background: 'rgba(234, 67, 53, 0.03)',
                              border: '1px solid rgba(234, 67, 53, 0.1)',
                              borderRadius: '16px',
                              padding: '20px 24px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#991b1b' }}>Zu zahlender Gesamtbetrag:</strong>
                                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 650 }}>Monatliche Lizenzgebühr (inkl. MwSt.)</span>
                              </div>
                              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#991b1b' }}>
                                {priceStudent} €
                              </span>
                            </div>

                            {/* Large Action Buttons */}
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <button
                                onClick={() => handleActivateUser(u.id)}
                                disabled={isActivating}
                                style={{
                                  width: '100%',
                                  padding: '18px',
                                  borderRadius: '16px',
                                  background: '#ea4335',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '1rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '10px',
                                  boxShadow: '0 8px 24px rgba(234, 67, 53, 0.3)',
                                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                onMouseOver={(e) => {
                                  if (!isActivating) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(234, 67, 53, 0.4)';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (!isActivating) {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 67, 53, 0.3)';
                                  }
                                }}
                              >
                                {isActivating ? (
                                  <><div className="animate-spin" style={{ width: '18px', height: '18px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Aktiviere...</>
                                ) : (
                                  <><Check size={20} /> Zahlung erhalten &amp; Account freischalten</>
                                )}
                              </button>
                              
                              <button
                                onClick={() => setSelectedUser(null)}
                                style={{
                                  width: '100%',
                                  padding: '16px',
                                  borderRadius: '16px',
                                  background: '#f1f5f9',
                                  border: 'none',
                                  color: '#64748b',
                                  fontSize: '0.95rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={32} style={{ color: '#94a3b8' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <strong style={{ fontSize: '1.2rem', color: '#0f172a', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Kein Schüler ausgewählt</strong>
                          <span style={{ fontSize: '0.95rem', lineHeight: '1.5', display: 'block', maxWidth: '300px', margin: '0 auto' }}>Wähle einen Schüler aus der Liste aus, um Zahlungsdetails einzusehen und den Account freizuschalten.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Alles erledigt block when nothing is pending */}
            {totalPendingCount === 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px dashed rgba(15, 23, 42, 0.12)',
                padding: '36px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(52, 168, 83, 0.1)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>Alles erledigt!</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Es liegen aktuell keine offenen Aktivierungen oder Zahlungsrückstände vor. Genieß den Tag.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Neueste Registrierungen (35% width) */}
          <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Neueste Registrierungen</h3>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(16px)',
              borderRadius: '24px',
              border: '1px solid rgba(15, 23, 42, 0.06)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.03)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {latestSchools.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '16px 0' }}>Keine Schulen registriert.</div>
              ) : (
                latestSchools.map((sch, idx) => {
                  const daysAgo = sch.created_at ? Math.floor((new Date().getTime() - new Date(sch.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const timeStr = daysAgo === 0 ? 'Heute' : daysAgo === 1 ? 'Gestern' : `Vor ${daysAgo} Tagen`;
                  return (
                    <div key={sch.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                      {/* Timeline dot & line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea4335', border: '2px solid #ffffff', boxShadow: '0 0 0 2px rgba(234, 67, 53, 0.15)', zIndex: 2 }} />
                        {idx < latestSchools.length - 1 && (
                          <div style={{ width: '2px', height: '54px', background: 'rgba(15, 23, 42, 0.05)', marginTop: '4px', marginBottom: '-16px' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{sch.name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{timeStr}</span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>{sch.city || 'Keine Ortsangabe'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSchoolId(sch.id);
                            setEditName(sch.name);
                            setEditColor(sch.primary_color || '#3b82f6');
                            setEditLogo(sch.logo_url || '');
                            setEditStatus(sch.status || 'active');
                            setEditIsTrial(sch.is_trial || false);
                            setEditTrialEndsAt(sch.trial_ends_at || '');
                            setEditContractEndsAt(sch.contract_ends_at || '');
                            setEditMaxTeachers(sch.max_teachers ?? 2);
                            setEditMaxStudents(sch.max_students ?? 6);
                            setEditMaxSongs(sch.max_songs ?? 5);
                            setEditLimitsEnabled(sch.limits_enabled || false);
                            setEditZipCode(sch.zip_code || '');
                            setEditCity(sch.city || '');
                            setEditEmail(sch.email || '');
                            setEditPhoneNumber(sch.phone_number || '');
                            setEditHasCampus(sch.has_campus_subscription || false);
                            setEditHasGroovelab(sch.has_groovelab_subscription || false);
                            setEditSubscriptionBypass(sch.subscription_bypass || false);
                            setSelectedSchool(sch);
                            setActivePortalTab('schools');
                          }}
                          style={{
                            alignSelf: 'flex-start',
                            background: 'transparent',
                            border: 'none',
                            color: '#ea4335',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '4px 0 2px 0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'color 0.15s'
                          }}
                          onMouseOver={(e: any) => e.currentTarget.style.color = '#dc2626'}
                          onMouseOut={(e: any) => e.currentTarget.style.color = '#ea4335'}
                        >
                          Details anzeigen →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Server-Systemstatus & Auslastung */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '32px',
          marginTop: '12px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.1)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(52, 168, 83, 0.1)',
                color: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#34a853',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={20} className={healthStatus === 'critical' ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                  Server-Systemstatus &amp; Live-Messung
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Hetzner VPS Telemetrie-Agent • Letztes Signal: {formattedTime}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 800,
                background: healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.08)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(52, 168, 83, 0.08)',
                color: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#d97706' : '#34a853',
                border: `1px solid ${healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.15)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(52, 168, 83, 0.15)'}`
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#34a853',
                  display: 'inline-block'
                }} />
                {healthStatus === 'critical' && 'KRITISCH (Upgrade empfohlen)'}
                {healthStatus === 'warning' && 'WARNUNG (Auslastung erhöht)'}
                {healthStatus === 'optimal' && 'OPTIMAL (Gesund)'}
              </div>
            </div>
          </div>

          {/* Critical Alert Callout */}
          {healthStatus === 'critical' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.03)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '16px',
              padding: '18px 24px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
              <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#991b1b', fontWeight: 800, marginBottom: '4px' }}>
                  Achtung: Der Server erreicht seine Leistungsgrenzen!
                </strong>
                <span style={{ fontSize: '0.82rem', color: '#7f1d1d', fontWeight: 550, lineHeight: 1.5 }}>
                  Aufgrund hoher Auslastung (CPU Load ≥ 4.0, RAM ≥ 90% oder offene DB-Verbindungen ≥ 80) läuft das System am Limit.
                  Ein Umstieg auf einen leistungsstärkeren Hetzner Cloud Server (z. B. Upgrade auf CX32 oder CX42 mit mehr CPU-Kernen und RAM) wird dringend empfohlen, um Server-Ausfälle oder Verzögerungen für die Schulen zu vermeiden.
                </span>
              </div>
            </div>
          )}

          {/* Gauges Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {/* CPU Metric Card */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '16px 20px',
              border: '1px solid rgba(15, 23, 42, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Cpu size={14} /> CPU Auslastung
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: cpuVal >= 4.0 ? '#ef4444' : cpuVal >= 2.0 ? '#d97706' : '#34a853' }}>
                  {cpuVal.toFixed(2)} / 2.0 Cores
                </span>
              </div>
              {/* Custom progress bar */}
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((cpuVal / 2.0) * 100, 100)}%`,
                  background: cpuVal >= 4.0 ? '#ef4444' : cpuVal >= 2.0 ? '#f59e0b' : '#34a853',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                <span>Auslastung: {Math.round((cpuVal / 2.0) * 100)}%</span>
                <span>{cpuVal >= 4.0 ? 'Kritisch' : cpuVal >= 2.0 ? 'Warnung' : 'Stabil'}</span>
              </div>
            </div>

            {/* RAM Metric Card */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '16px 20px',
              border: '1px solid rgba(15, 23, 42, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Sliders size={14} /> Arbeitsspeicher (RAM)
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: ramPct >= 90 ? '#ef4444' : ramPct >= 75 ? '#d97706' : '#34a853' }}>
                  {(ramUsed / 1024).toFixed(2)} / {(ramTotal / 1024).toFixed(0)} GB
                </span>
              </div>
              {/* Custom progress bar */}
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(ramPct, 100)}%`,
                  background: ramPct >= 90 ? '#ef4444' : ramPct >= 75 ? '#f59e0b' : '#34a853',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                <span>Belegt: {Math.round(ramPct)}%</span>
                <span>{ramPct >= 90 ? 'Kritisch' : ramPct >= 75 ? 'Warnung' : 'Stabil'}</span>
              </div>
            </div>

            {/* DB Connections Metric Card */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '16px 20px',
              border: '1px solid rgba(15, 23, 42, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Database size={14} /> DB Pool Connections
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: dbConns >= 80 ? '#ef4444' : dbConns >= 50 ? '#d97706' : '#34a853' }}>
                  {dbConns} / 100
                </span>
              </div>
              {/* Custom progress bar */}
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(dbConns, 100)}%`,
                  background: dbConns >= 80 ? '#ef4444' : dbConns >= 50 ? '#f59e0b' : '#34a853',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                <span>Auslastung: {dbConns}%</span>
                <span>{dbConns >= 80 ? 'Kritisch' : dbConns >= 50 ? 'Warnung' : 'Stabil'}</span>
              </div>
            </div>

            {/* Combined Storage Metric Card (SSD & Cloud Volume) */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '16px 20px',
              border: '1px solid rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                <HardDrive size={14} /> Speicher &amp; Cloud-Volumes
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* SSD Item */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    <span>SSD Festplatte</span>
                    <span style={{ fontWeight: 800, color: diskPct >= 90 ? '#ef4444' : diskPct >= 75 ? '#d97706' : '#34a853' }}>
                      {diskUsed.toFixed(1)} / {diskTotal.toFixed(0)} GB
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(diskPct, 100)}%`,
                      background: diskPct >= 90 ? '#ef4444' : diskPct >= 75 ? '#f59e0b' : '#34a853',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </div>
                </div>

                {/* Cloud Item */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    <span>Cloud Storage</span>
                    <span style={{ fontWeight: 800, color: volPct >= 90 ? '#ef4444' : volPct >= 75 ? '#d97706' : '#34a853' }}>
                      {volUsed.toFixed(1)} / {volTotal.toFixed(0)} GB
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(volPct, 100)}%`,
                      background: volPct >= 90 ? '#ef4444' : volPct >= 75 ? '#f59e0b' : '#34a853',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>
                <span>SSD: {Math.round(diskPct)}% belegt</span>
                <span>Cloud: {Math.round(volPct)}% belegt</span>
              </div>
            </div>
          </div>

          {/* Timeline Trend Chart */}
          {serverMetrics.length > 1 && (
            <div style={{
              borderTop: '1px solid rgba(15, 23, 42, 0.06)',
              paddingTop: '24px'
            }}>
              <h4 style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 800, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Auslastungshistorie (Letzte 30 Messungen)
              </h4>
              
              {/* Interactive SVG Chart */}
              <div style={{ width: '100%', height: '140px', position: 'relative' }}>
                {(() => {
                  const data = [...serverMetrics].reverse();
                  const width = 800; // virtual width for SVG viewbox
                  const height = 120; // virtual height for SVG viewbox
                  
                  // Normalization helper
                  const getPoints = (valExtractor: (m: ServerMetric) => number, maxVal: number) => {
                    return data.map((m, index) => {
                      const x = (index / (data.length - 1)) * width;
                      const y = height - (Math.min(valExtractor(m), maxVal) / maxVal) * (height - 10) - 5;
                      return { x, y };
                    });
                  };

                  const cpuPoints = getPoints((m) => m.cpu_load, 4.0);
                  const ramPoints = getPoints((m) => (m.mem_used_mb / (m.mem_total_mb || 8000)) * 100, 100);
                  const dbPoints = getPoints((m) => m.active_connections, 100);

                  const pointsToString = (pts: { x: number, y: number }[]) => {
                    return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                  };

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {/* Definitions for grid line pattern or gradients */}
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34a853" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#34a853" stopOpacity="0.00"/>
                        </linearGradient>
                        <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00"/>
                        </linearGradient>
                        <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.00"/>
                        </linearGradient>
                      </defs>

                      {/* Y-axis gridlines */}
                      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

                      {/* Area below curves (fill) */}
                      {cpuPoints.length > 1 && (
                        <polygon
                          points={`${cpuPoints[0].x},${height} ${pointsToString(cpuPoints)} ${cpuPoints[cpuPoints.length-1].x},${height}`}
                          fill="url(#cpuGrad)"
                        />
                      )}
                      {ramPoints.length > 1 && (
                        <polygon
                          points={`${ramPoints[0].x},${height} ${pointsToString(ramPoints)} ${ramPoints[ramPoints.length-1].x},${height}`}
                          fill="url(#ramGrad)"
                        />
                      )}
                      {dbPoints.length > 1 && (
                        <polygon
                          points={`${dbPoints[0].x},${height} ${pointsToString(dbPoints)} ${dbPoints[dbPoints.length-1].x},${height}`}
                          fill="url(#dbGrad)"
                        />
                      )}

                      {/* Line curves */}
                      <polyline fill="none" stroke="#34a853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(cpuPoints)} />
                      <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(ramPoints)} />
                      <polyline fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(dbPoints)} />

                      {/* Interactive dots on latest point */}
                      {cpuPoints.length > 0 && (
                        <>
                          <circle cx={cpuPoints[cpuPoints.length - 1].x} cy={cpuPoints[cpuPoints.length - 1].y} r="5" fill="#34a853" stroke="#ffffff" strokeWidth="2" />
                          <circle cx={ramPoints[ramPoints.length - 1].x} cy={ramPoints[ramPoints.length - 1].y} r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                          <circle cx={dbPoints[dbPoints.length - 1].x} cy={dbPoints[dbPoints.length - 1].y} r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
                        </>
                      )}
                    </svg>
                  );
                })()}
              </div>

              {/* Chart Legend */}
              <div style={{
                display: 'flex',
                gap: '24px',
                justifyContent: 'center',
                marginTop: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  <span style={{ width: '12px', height: '3px', background: '#34a853', borderRadius: '2px' }} />
                  CPU-Auslastung (Skaliert auf 4.0 Cores)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  <span style={{ width: '12px', height: '3px', background: '#6366f1', borderRadius: '2px' }} />
                  RAM-Belegung %
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  <span style={{ width: '12px', height: '3px', background: '#a855f7', borderRadius: '2px' }} />
                  Aktive DB-Verbindungen %
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Business KPIs & Umsatz-Analyse (Collapsible) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '32px',
          marginTop: '12px'
        }}>
          {/* Toggle Header */}
          <div 
            onClick={() => setBusinessAnalyticsExpanded(prev => !prev)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(52, 168, 83, 0.1)',
                color: '#34a853',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Tag size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                  Business KPIs &amp; Umsatz-Analyse
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Umsatzverteilung, Modul-Adoption und aktive Abonnements
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#34a853',
                background: 'rgba(52, 168, 83, 0.08)',
                padding: '6px 14px',
                borderRadius: '9999px'
              }}>
                MRR: {mrrTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                {businessAnalyticsExpanded ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Content */}
          {businessAnalyticsExpanded && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileOrTablet ? '1fr' : '1fr 1fr',
              gap: '32px',
              borderTop: '1px solid rgba(15, 23, 42, 0.06)',
              paddingTop: '24px'
            }} className="animate-fade-in">
              
              {/* Left Block: MRR Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Monatlicher Bruttoumsatz (MRR Breakdown)
                </h4>

                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <span>Server-Hosting-Flatrate (Module)</span>
                      <span style={{ fontWeight: 800 }}>{baseSubTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <span>Teammitglieder-Betreuungsgebühr</span>
                      <span style={{ fontWeight: 800 }}>{staffSubTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <span>Schüleraktivierungs-Lizenzen (Sammelzahler)</span>
                      <span style={{ fontWeight: 800 }}>{studentActiveSubTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <span>Schülerdatenbank-Speichergebühr (Passiv)</span>
                      <span style={{ fontWeight: 800 }}>{studentPassiveSubTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)', paddingTop: '10px', fontSize: '0.72rem', color: '#64748b', fontWeight: 650, fontStyle: 'italic' }}>
                    * Die Campus-Groovelab Softwarelizenz ist zu 100% kostenlos. Berechnet werden ausschließlich Server-Hostinggebühren, Team-Betreuungen und Schülerlizenzen.
                  </div>
                </div>
              </div>

              {/* Right Block: Module Share */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Modul-Adoption &amp; Testphasen
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      <span>Abonnements nach Modulen</span>
                      <span style={{ fontWeight: 800 }}>{campusOnlyCount} Campus / {groovelabOnlyCount} GrooveLab / {kombiCount} Kombi</span>
                    </div>
                    {(() => {
                      const totalSubscribed = campusOnlyCount + groovelabOnlyCount + kombiCount;
                      const campusPct = totalSubscribed > 0 ? (campusOnlyCount / totalSubscribed) * 100 : 0;
                      const groovelabPct = totalSubscribed > 0 ? (groovelabOnlyCount / totalSubscribed) * 100 : 0;
                      const kombiPct = totalSubscribed > 0 ? (kombiCount / totalSubscribed) * 100 : 0;
                      return (
                        <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
                          {campusOnlyCount > 0 && <div style={{ width: `${campusPct}%`, background: '#34a853', height: '100%' }} title="Campus-Modul" />}
                          {groovelabOnlyCount > 0 && <div style={{ width: `${groovelabPct}%`, background: '#facc15', height: '100%' }} title="GrooveLab-Modul" />}
                          {kombiCount > 0 && <div style={{ width: `${kombiPct}%`, background: '#3b82f6', height: '100%' }} title="Kombi-Vorteil" />}
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.7rem', fontWeight: 650, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34a853' }} /> Campus Only
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15' }} /> GrooveLab Only
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} /> Kombi-Vorteil
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.03)' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>AKTIVE ZAHLER</span>
                      <strong style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 900 }}>{activePaidCount} Schulen</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.03)' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>TESTPHASEN</span>
                      <strong style={{ fontSize: '1.2rem', color: '#f59e0b', fontWeight: 900 }}>{activeTrialCount} Schulen</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSaveSchoolDetails = async () => {
    if (!selectedSchool || !editName.trim()) return;
    try {
      const updates = { 
        name: editName.trim(),
        primary_color: editColor,
        logo_url: editLogo,
        status: editStatus,
        is_trial: editIsTrial,
        trial_ends_at: editIsTrial ? parseDate(editTrialEndsAt) : null,
        contract_ends_at: parseDate(editContractEndsAt),
        max_teachers: editMaxTeachers,
        max_students: editMaxStudents,
        max_songs: editMaxSongs,
        limits_enabled: editLimitsEnabled,
        zip_code: editZipCode.trim() || null,
        city: editCity.trim() || null,
        email: editEmail.trim() || null,
        phone_number: editPhoneNumber.trim() || null,
        has_groovelab_subscription: editHasGroovelab,
        has_campus_subscription: editHasCampus,
        subscription_bypass: editSubscriptionBypass
      };

      const { error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', selectedSchool.id);
        
      if (error) throw error;
      
      setSchools(prev => prev.map(s => s.id === selectedSchool.id ? { ...s, ...updates } : s));
      setSelectedSchool(null);
      alert('Schule erfolgreich aktualisiert!');
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim() || !adminUser) return;
    try {
      setUpdatingAdmin(true);
      const { error } = await supabase
        .from('users')
        .update({
          master_admin_username: adminUsername.trim(),
          master_admin_password: adminPassword.trim()
        })
        .eq('id', adminUser.id);
      if (error) throw error;
      alert('Zugangsdaten erfolgreich aktualisiert!');
      fetchMasterAdmins();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setUpdatingAdmin(false);
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
      setSchools(schoolData || []);

      const [
        { data: statsData },
        { data: staffUsers },
        { data: songs },
        { data: bands },
        { count: sessionCount },
        { data: invoiceData }
      ] = await Promise.all([
        supabase.from('school_user_statistics').select('*'),
        supabase.from('users').select('id, first_name, last_name, role, roles, school_id, is_campus_active, is_groovelab_active, ausweis_nummer, teacher_qr_token, is_pin_activated').or('role.eq.secretary,role.eq.admin,role.eq.teacher'),
        supabase.from('songs').select('school_id'),
        supabase.from('bands').select('school_id, name'),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*')
      ]);

      if (invoiceData) setDbInvoices(invoiceData);

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
        const schoolStatsRow = statsData?.find(s => s.school_id === school.id) || {};
        const schoolStaff = staffUsers?.filter(u => u.school_id === school.id) || [];
        sStats[school.id] = {
          teachers: schoolStatsRow.teachers || 0,
          students: schoolStatsRow.students || 0,
          teachersCampus: schoolStatsRow.teachers_campus || 0,
          teachersGroovelab: schoolStatsRow.teachers_groovelab || 0,
          studentsCampus: schoolStatsRow.students_campus || 0,
          studentsGroovelab: schoolStatsRow.students_groovelab || 0,
          songs: songs?.filter(s => s.school_id === school.id).length || 0,
          bands: bands?.filter(b => b.school_id === school.id && b.name !== '__SYSTEM_ANNOUNCEMENTS__').length || 0,
          adminUsers: schoolStaff.filter(u => 
            u.role === 'secretary' || 
            u.role === 'admin' ||
            (Array.isArray(u.roles) && (u.roles.includes('secretary') || u.roles.includes('admin')))
          )
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
      const { data, error } = await supabase
        .from('schools')
        .insert({
          name: newSchoolName.trim(),
          primary_color: newSchoolColor,
          logo_url: newSchoolLogo || null,
          zip_code: newSchoolZip.trim() || null,
          city: newSchoolCity.trim() || null,
          is_trial: true,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      alert(`Erfolgreich! Die Schule "${data.name}" wurde angelegt.`);
      setNewSchoolName('');
      setNewSchoolColor('#3b82f6');
      setNewSchoolLogo('');
      setNewSchoolZip('');
      setNewSchoolCity('');
      fetchSchoolsAndStats();
    } catch (err: any) {
      console.error('Fehler beim Erstellen der Schule:', err.message);
      alert('Fehler beim Erstellen: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    if (!newSchoolAdminFirstName.trim() || !newSchoolAdminLastName.trim()) {
      alert('Bitte Vorname und Nachname ausfüllen.');
      return;
    }

    try {
      let generatedAdminPin = '';
      let pinIsUnique = false;
      let attempts = 0;
      while (!pinIsUnique && attempts < 5) {
        const candidatePin = Math.floor(100000 + Math.random() * 900000).toString();
        const { data: duplicateUser, error: checkErr } = await supabase
          .from('users')
          .select('id')
          .eq('ausweis_nummer', candidatePin)
          .maybeSingle();

        if (!checkErr && !duplicateUser) {
          generatedAdminPin = candidatePin;
          pinIsUnique = true;
        }
        attempts++;
      }

      if (!generatedAdminPin) {
        generatedAdminPin = Math.floor(100000 + Math.random() * 900000).toString();
      }

      const adminId = crypto.randomUUID();
      const qrToken = crypto.randomUUID();
      const subdomain = selectedSchool.name
        .toLowerCase()
        .trim()
        .replace(/[äöüß]/g, (match) => {
          const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
          return mapping[match] || match;
        })
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      const defaultEmail = newSchoolAdminEmail.trim() || `${subdomain}@campus-groovelab.de`;

      const { error: userErr } = await supabase
        .from('users')
        .insert({
          id: adminId,
          school_id: selectedSchool.id,
          role: 'admin',
          first_name: newSchoolAdminFirstName.trim(),
          last_name: newSchoolAdminLastName.trim(),
          email: defaultEmail,
          password_hash: generatedAdminPin,
          qr_token: qrToken,
          ausweis_nummer: generatedAdminPin,
          is_campus_active: true,
          is_groovelab_active: true,
          is_active: true,
          roles: ['admin']
        });

      if (userErr) throw userErr;

      // Add activation days for device PIN configuration
      const birthDay = 15;
      await supabase
        .from('activation_days')
        .insert({
          student_id: adminId,
          day_of_birth: birthDay
        });

      alert(`Hauptbenutzer (Admin) erfolgreich angelegt!\nLogin-Ausweis-ID / PIN: ${generatedAdminPin}`);
      
      setNewSchoolAdminFirstName('');
      setNewSchoolAdminLastName('');
      setNewSchoolAdminEmail('');
      setShowAddSchoolAdminForm(false);
      
      fetchSchoolsAndStats();
    } catch (err: any) {
      console.error('Fehler beim Anlegen des Admins:', err.message);
      alert('Fehler beim Anlegen: ' + err.message);
    }
  };

  const handleDeleteSchool = async (id: string, name: string) => {
    if (!confirm(`Möchtest du die Schule "${name}" wirklich löschen? Dadurch werden alle verknüpften Räume, iPads und Benutzer unwiderruflich gelöscht!`)) {
      return;
    }

    try {
      // Call the RPC function that deletes the school and its users/resources in one transaction
      // with statement_timeout = 0 to prevent statement timeout errors on larger schools.
      const { error } = await supabase
        .rpc('delete_school_cascade', { p_school_id: id });

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
    try {
      const { error } = await supabase
        .from('schools')
        .update({ is_paused: nextPaused })
        .eq('id', id);

      if (error) throw error;
      fetchSchoolsAndStats();
    } catch (err: any) {
      console.error('Fehler beim Ändern des Pause-Status:', err.message);
      alert('Fehler beim Umschalten des Status: ' + err.message);
    }
  };


  const copyInviteLink = (schoolId: string, schoolName: string, token?: string | null) => {
    const inviteUrl = getSecretaryInviteUrl(schoolId, schoolName, token || null);
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(schoolId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSchools = schools.filter(school => {
    if (school.is_active === false) return false;
    
    // Status segment filters
    if (filterSegment === 'campus' && !school.has_campus_subscription) return false;
    if (filterSegment === 'groovelab' && !school.has_groovelab_subscription) return false;
    if (filterSegment === 'bypass' && !school.subscription_bypass) return false;
    if (filterSegment === 'paused' && !school.is_paused) return false;
    
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = school.name?.toLowerCase().includes(q);
    const cityMatch = school.city?.toLowerCase().includes(q);
    const zipMatch = school.zip_code?.toLowerCase().includes(q);
    return nameMatch || cityMatch || zipMatch;
  });

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedSchools = filteredSchools.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

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
        background: 'radial-gradient(circle, rgba(52, 168, 83, 0.06) 0%, transparent 70%)',
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
                background: 'linear-gradient(135deg, #34a853 0%, #fbbc05 100%)',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                boxShadow: '0 8px 20px rgba(52, 168, 83, 0.2)',
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
                <span style={{ fontSize: '0.68rem', color: '#34a853', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Admin Leitstand
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { id: 'schools', label: 'Schulen & Tenants', icon: <Layers size={18} />, color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)' },
                { id: 'briefing', label: 'Briefing Board', icon: <Clock size={18} />, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
                { id: 'billing', label: 'Abrechnung & Abonnements', icon: <GraduationCap size={18} />, color: '#ca8a04', bg: 'rgba(234, 179, 8, 0.1)' },
                { id: 'banking', label: 'System & Master-Admins', icon: <Shield size={18} />, color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)' },
                { id: 'pricing', label: 'System-Preise', icon: <Tag size={18} />, color: '#ca8a04', bg: 'rgba(234, 179, 8, 0.1)' }
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
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #34a853 0%, #fbbc05 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.85rem',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)'
              }}>
                {((currentUser?.first_name?.[0] || '') + (currentUser?.last_name?.[0] || '')) || 'MA'}
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.first_name && currentUser?.last_name ? `${currentUser.first_name} ${currentUser.last_name}` : (adminUsername || 'Master Admin')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.master_admin_username ? `@${currentUser.master_admin_username}` : `@${adminUsername || 'admin'}`}
                </div>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(52, 168, 83, 0.08)',
                    color: '#34a853',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    System Root
                  </span>
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
          padding: activePortalTab === 'briefing' ? '24px 32px' : '44px 54px',
          overflowY: 'auto',
          height: '100vh',
          boxSizing: 'border-box'
        }}>
          {activePortalTab === 'briefing' ? (
            renderBriefingTab()
          ) : activePortalTab === 'billing' ? (
            <div className="animate-fade-in">
              <BillingDashboard preselectedSchoolId={preselectedSchoolId || undefined} />
            </div>
          ) : activePortalTab === 'pricing' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
              {/* Header */}
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                  System-Preise &amp; Tarife
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 550 }}>
                  Konfiguriere hier die Standard-Gebühren sowie Sonderangebote und Rabattaktionen für Schulen.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
                alignItems: 'start'
              }}>
                {/* Pricing Grid Inputs */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '36px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 28px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                    <Tag size={20} color="#ca8a04" /> Standard-Abonnementpreise
                  </h3>

                  <form onSubmit={handleUpdatePricingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Campus Modul (€ / Monat)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={priceCampus}
                            onChange={(e) => setPriceCampus(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              outline: 'none',
                              transition: 'border-color 0.2s'
                            }}
                            className="premium-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          groovelab Modul (€ / Monat)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={priceGroovelab}
                          onChange={(e) => setPriceGroovelab(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Lehrer-Aktivierung (€ / Monat)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={priceTeacher}
                          onChange={(e) => setPriceTeacher(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Schüler-Aktivierung (€ / Monat)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={priceStudent}
                          onChange={(e) => setPriceStudent(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={updatingBilling}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(217, 119, 6, 0.2)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '10px'
                      }}
                      className="hover-scale-mini"
                    >
                      {updatingBilling ? 'Speichern...' : 'Preise & Tarife speichern'}
                    </button>
                  </form>
                </div>

                {/* Sonderangebote & Kampagnen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {/* Create offer form */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '36px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)'
                  }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 28px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      <Percent size={20} color="#34a853" /> Rabatt-Kampagne erstellen
                    </h3>

                    <form onSubmit={handleAddSpecialOffer} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
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
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                            className="premium-input"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
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
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                            className="premium-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                            Aktionscode (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="z.B. SUMMER26"
                            value={newOfferCode}
                            onChange={(e) => setNewOfferCode(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                            className="premium-input"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '0 8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Sofort Aktiv</span>
                          <button
                            type="button"
                            onClick={() => setNewOfferActive(!newOfferActive)}
                            style={{
                              position: 'relative',
                              width: '40px',
                              height: '24px',
                              borderRadius: '12px',
                              background: newOfferActive ? '#34a853' : 'rgba(15, 23, 42, 0.08)',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0',
                              transition: 'all 0.25s',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
                          background: '#34a853',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(19, 115, 51, 0.2)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        className="hover-scale-mini"
                      >
                        <Plus size={16} /> Kampagne hinzufügen
                      </button>
                    </form>
                  </div>

                  {/* Active offers list */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '36px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      Aktive Aktionen ({specialOffers.length})
                    </h3>

                    {specialOffers.length === 0 ? (
                      <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed rgba(15, 23, 42, 0.1)', borderRadius: '16px' }}>
                        Keine Sonderangebote vorhanden. Verwende das obige Formular zum Erstellen.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {specialOffers.map((offer) => (
                          <div
                            key={offer.id}
                            style={{
                              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                              border: '1px solid rgba(15, 23, 42, 0.04)',
                              borderRadius: '16px',
                              padding: '16px 20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                                {offer.name}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#34a853', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ background: 'rgba(19, 115, 51, 0.08)', padding: '2px 8px', borderRadius: '100px' }}>
                                  {offer.discount_percent}% Rabatt
                                </span>
                                {offer.code && (
                                  <span style={{ color: '#475569', fontWeight: 600 }}>
                                    Code: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{offer.code}</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleOfferActive(offer.id)}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  background: offer.is_active ? '#34a853' : 'rgba(15, 23, 42, 0.08)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0',
                                  transition: 'all 0.25s',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                  transform: offer.is_active ? 'translateX(19px)' : 'translateX(3px)'
                                }} />
                              </button>

                              <button
                                onClick={() => handleDeleteSpecialOffer(offer.id)}
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                                className="hover-scale-mini"
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
            </div>
          ) : activePortalTab === 'banking' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
              {/* Header */}
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                  System &amp; Master-Admins
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 550 }}>
                  Verwalte die Master-Administratoren mit Kiosk-Zugängen sowie die globalen Rechnungsdaten des Betreibers.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.1fr',
                gap: '32px',
                alignItems: 'start'
              }}>
                {/* Master Admin credentials card */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '36px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '32px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                        <Shield size={20} color="#34a853" /> Master-Admins
                      </h3>
                      <button
                        onClick={() => {
                          setShowAddAdminForm(!showAddAdminForm);
                          setSelectedAdminForQr(null);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          background: showAddAdminForm ? '#f1f5f9' : 'rgba(52, 168, 83, 0.08)',
                          border: 'none',
                          color: showAddAdminForm ? '#475569' : '#34a853',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <UserPlus size={14} /> {showAddAdminForm ? 'Abbrechen' : 'Hinzufügen'}
                      </button>
                    </div>

                    {/* Add Admin Form */}
                    {showAddAdminForm && (
                      <form onSubmit={handleCreateMasterAdmin} style={{
                        background: '#f8fafc',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        marginBottom: '28px'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Neuen Master-Admin erstellen</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Vorname</label>
                            <input
                              type="text"
                              value={newAdminFirstName}
                              onChange={(e) => setNewAdminFirstName(e.target.value)}
                              placeholder="z.B. Patrick"
                              required
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Nachname</label>
                            <input
                              type="text"
                              value={newAdminLastName}
                              onChange={(e) => setNewAdminLastName(e.target.value)}
                              placeholder="z.B. Huber"
                              required
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Benutzername</label>
                          <input
                            type="text"
                            value={newAdminUsername}
                            onChange={(e) => setNewAdminUsername(e.target.value)}
                            placeholder="z.B. patrick.huber88"
                            required
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Passwort</label>
                          <input
                            type="password"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="Passwort festlegen"
                            required
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={creatingAdmin}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            background: '#34a853',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 10px rgba(52, 168, 83, 0.2)'
                          }}
                        >
                          {creatingAdmin ? 'Erstellt...' : 'Admin erstellen'}
                        </button>
                      </form>
                    )}

                    {/* Master Admins List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {masterAdmins.map((adm) => {
                        const isCurrent = currentUser && adm.id === currentUser.id;
                        const isSelectedForEdit = adminUser && adm.id === adminUser.id;
                        const admInitials = `${adm.first_name?.[0] || ''}${adm.last_name?.[0] || ''}`.toUpperCase() || 'MA';
                        return (
                          <div
                            key={adm.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 18px',
                              borderRadius: '16px',
                              background: isSelectedForEdit ? '#f8fafc' : '#ffffff',
                              border: isSelectedForEdit ? '1.5px solid #34a853' : '1px solid rgba(15, 23, 42, 0.06)',
                              boxShadow: isSelectedForEdit ? '0 4px 12px rgba(52, 168, 83, 0.04)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #34a853 0%, #fbbc05 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                flexShrink: 0
                              }}>
                                {admInitials}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {adm.first_name} {adm.last_name}
                                  </span>
                                  {isCurrent && (
                                    <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, flexShrink: 0 }}>
                                      Du
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                  @{adm.master_admin_username}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setSelectedAdminForQr(selectedAdminForQr?.id === adm.id ? null : adm);
                                  setShowAddAdminForm(false);
                                }}
                                title="QR-Badge anzeigen"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: selectedAdminForQr?.id === adm.id ? '#34a853' : '#f1f5f9',
                                  border: 'none',
                                  color: selectedAdminForQr?.id === adm.id ? '#ffffff' : '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <QrCode size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setAdminUser(adm);
                                  setAdminUsername(adm.master_admin_username || '');
                                  setAdminPassword(adm.master_admin_password || '');
                                  setShowAddAdminForm(false);
                                }}
                                title="Zugangsdaten bearbeiten"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: isSelectedForEdit ? 'rgba(52, 168, 83, 0.1)' : '#f1f5f9',
                                  border: 'none',
                                  color: isSelectedForEdit ? '#34a853' : '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMasterAdmin(adm.id, `${adm.first_name} ${adm.last_name}`)}
                                disabled={isCurrent || masterAdmins.length <= 1}
                                title={isCurrent ? "Du kannst dich nicht selbst löschen" : "Löschen"}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: '#fef2f2',
                                  border: 'none',
                                  color: isCurrent || masterAdmins.length <= 1 ? '#fca5a5' : '#ef4444',
                                  cursor: isCurrent || masterAdmins.length <= 1 ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR Badge Display */}
                  {selectedAdminForQr && (
                    <div style={{
                      padding: '24px',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: '16px',
                      border: '1px solid rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          QR-Badge: {selectedAdminForQr.first_name} {selectedAdminForQr.last_name}
                        </strong>
                        <button
                          onClick={() => setSelectedAdminForQr(null)}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}
                        >
                          Schließen
                        </button>
                      </div>
                      <div style={{
                        background: '#ffffff',
                        padding: '12px',
                        borderRadius: '16px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.02)'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${selectedAdminForQr.qr_token}`}
                          alt="Master Admin QR Badge"
                          style={{ width: '120px', height: '120px', display: 'block' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textAlign: 'center', lineHeight: '1.5', fontWeight: 550 }}>
                        Scanne diesen QR-Code am Kiosk-Tablet für schnellen Master-Admin-Zugang.
                      </p>
                    </div>
                  )}

                  {/* Edit Credentials Form */}
                  {adminUser && !showAddAdminForm && (
                    <div style={{
                      borderTop: '1px solid rgba(15, 23, 42, 0.08)',
                      paddingTop: '28px'
                    }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={14} color="#34a853" /> Zugangsdaten für {adminUser.first_name} bearbeiten
                      </h4>
                      <form onSubmit={handleUpdateAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                            Benutzername
                          </label>
                          <input
                            type="text"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            placeholder="admin"
                            required
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              outline: 'none'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                            Passwort
                          </label>
                          <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Neues Passwort"
                            required
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              outline: 'none'
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={updatingAdmin}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          {updatingAdmin ? 'Wird gespeichert...' : 'Zugangsdaten speichern'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Form: Operator Billing Details */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '36px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 28px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                    <Settings size={20} color="#34a853" /> Betreiber Rechnungsdaten
                  </h3>

                  <form onSubmit={handleUpdateBillingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          color: '#0f172a',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                        className="premium-input"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                          Ansprechpartner
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
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                          Straße
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
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
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
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                          Ort
                        </label>
                        <input
                          type="text"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          placeholder="Ort"
                          required
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginTop: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>IBAN</label>
                        <input
                          type="text"
                          value={billingIban}
                          onChange={(e) => setBillingIban(e.target.value)}
                          placeholder="DE00 0000 ..."
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>BIC</label>
                        <input
                          type="text"
                          value={billingBic}
                          onChange={(e) => setBillingBic(e.target.value)}
                          placeholder="BICXXX"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            color: '#0f172a',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                          className="premium-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={updatingBilling}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(19, 115, 51, 0.1)',
                        border: '1px solid rgba(19, 115, 51, 0.25)',
                        color: '#34a853',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '12px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#34a853';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(19, 115, 51, 0.1)';
                        e.currentTarget.style.color = '#34a853';
                      }}
                    >
                      {updatingBilling ? 'Speichern...' : 'Rechnungsdaten aktualisieren'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }} className="animate-fade-in">
              {/* Header Panel */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                    Schulen &amp; Tenants
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 550 }}>
                    Erstelle und verwalte die registrierten Schul-Tenants für Campus-Groovelab.
                  </p>
                </div>

                <button
                  onClick={fetchSchoolsAndStats}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#ea4335';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderColor = '#ea4335';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  }}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              

              {/* Layout split grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobileOrTablet ? '1fr' : '1.1fr 1fr',
                gap: '32px',
                height: isMobileOrTablet ? 'auto' : 'calc(100vh - 180px)',
                alignItems: 'stretch',
                overflow: 'hidden'
              }}>
                {/* Left Side: Schools list */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '36px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: isMobileOrTablet ? 'visible' : 'auto',
                  height: isMobileOrTablet ? 'auto' : '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                      <Layers size={20} color="#d97706" /> Registrierte Schul-Tenants
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchool(null);
                        setEditName('');
                        setEditColor('#3b82f6');
                        setEditLogo('');
                        setEditStatus('active');
                        setEditIsTrial(true);
                        setEditTrialEndsAt('');
                        setEditContractEndsAt('');
                        setEditMaxTeachers(2);
                        setEditMaxStudents(6);
                        setEditMaxSongs(5);
                        setEditLimitsEnabled(false);
                        setEditTrialOption('custom');
                        setEditZipCode('');
                        setEditCity('');
                        setEditEmail('');
                        setEditPhoneNumber('');
                        setEditHasGroovelab(false);
                        setEditHasCampus(false);
                        setEditSubscriptionBypass(false);
                        setShowMobileDetail(true); // Open detail panel for adding on mobile
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        border: '1px solid rgba(15,23,42,0.06)',
                        color: '#0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      className="hover-scale-mini"
                    >
                      <Plus size={14} /> Schule anlegen
                    </button>
                  </div>

                  {/* Search Input & View Toggles Row */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Suche nach Schulname, PLZ oder Ort..."
                        value={schoolSearchQuery}
                        onChange={(e) => setSchoolSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 16px 12px 44px',
                          borderRadius: '12px',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          background: '#f8fafc',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          outline: 'none',
                          transition: 'all 0.25s ease'
                        }}
                        className="search-input-field"
                      />
                    </div>

                    {/* Grid/List Layout Mode buttons */}
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.04)', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setViewLayout('grid')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '9px',
                          border: 'none',
                          background: viewLayout === 'grid' ? '#ffffff' : 'transparent',
                          color: viewLayout === 'grid' ? '#0f172a' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: viewLayout === 'grid' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Grid size={13} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 750 }}>Kacheln</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewLayout('list')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '9px',
                          border: 'none',
                          background: viewLayout === 'list' ? '#ffffff' : 'transparent',
                          color: viewLayout === 'list' ? '#0f172a' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: viewLayout === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <List size={13} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 750 }}>Liste</span>
                      </button>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div style={{ display: 'flex', marginBottom: '24px' }}>
                    {/* Status filter segment group */}
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.04)', width: '100%', justifyContent: 'space-around' }}>
                      {[
                        { id: 'all', label: 'Alle' },
                        { id: 'campus', label: 'Campus' },
                        { id: 'groovelab', label: 'GrooveLab' },
                        { id: 'bypass', label: 'Bypass' },
                        { id: 'paused', label: 'Pausiert' }
                      ].map(seg => {
                        const IconComponent = 
                          seg.id === 'campus' ? GraduationCap :
                          seg.id === 'groovelab' ? Music :
                          seg.id === 'bypass' ? Sliders :
                          seg.id === 'paused' ? Clock : null;

                        return (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => {
                              setFilterSegment(seg.id as any);
                              setCurrentPage(1);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '9px',
                              border: 'none',
                              background: filterSegment === seg.id ? '#ffffff' : 'transparent',
                              color: filterSegment === seg.id ? '#0f172a' : '#64748b',
                              fontSize: '0.78rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              boxShadow: filterSegment === seg.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              flex: 1
                            }}
                          >
                            {IconComponent && (
                              <IconComponent 
                                size={12} 
                                style={{ 
                                  color: filterSegment === seg.id 
                                    ? (seg.id === 'campus' ? '#34a853' : seg.id === 'groovelab' ? '#ca8a04' : seg.id === 'bypass' ? '#dc2626' : '#64748b') 
                                    : '#64748b' 
                                }} 
                              />
                            )}
                            <span>{seg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '80px 0', gap: '16px' }}>
                      <div className="loader" style={{
                        border: '3px solid rgba(15,23,42,0.04)',
                        borderLeftColor: '#d97706',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        animation: 'spin 0.8s linear infinite'
                      }}></div>
                      <p style={{ color: '#64748b', fontSize: '0.88rem', fontWeight: 600 }}>Lade Schulregister...</p>
                    </div>
                  ) : schools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b', fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Keine Schulen im System registriert.
                    </div>
                  ) : filteredSchools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b', fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Keine Suchergebnisse für "{schoolSearchQuery}"
                    </div>
                  ) : (
                    <>
                      {viewLayout === 'grid' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                          {paginatedSchools.map((school) => {
                        const teachers = schoolStats[school.id]?.teachers || 0;
                        const students = schoolStats[school.id]?.students || 0;
                        const bands = schoolStats[school.id]?.bands || 0;

                        return (
                          <div 
                            key={school.id} 
                            onClick={() => {
                              setSelectedSchool(school);
                              setShowMobileDetail(true);
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
                              setEditEmail(school.email || '');
                              setEditPhoneNumber(school.phone_number || '');
                              setEditHasGroovelab(school.has_groovelab_subscription ?? false);
                              setEditHasCampus(school.has_campus_subscription ?? false);
                              setEditSubscriptionBypass(school.subscription_bypass ?? false);
                            }}
                            style={{ 
                              borderRadius: '20px',
                              padding: '24px',
                              border: '1px solid rgba(15, 23, 42, 0.06)',
                              background: '#ffffff',
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: 'pointer',
                              transition: 'all 0.25s ease',
                              gap: '16px',
                              boxShadow: '0 8px 30px rgba(15, 23, 42, 0.02)',
                              boxSizing: 'border-box'
                            }}
                            className="school-list-card"
                          >
                            {/* Top Info Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', minWidth: 0 }}>
                              {/* Icon / Logo Badge */}
                              <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: `linear-gradient(135deg, ${school.primary_color || '#3b82f6'} 0%, ${school.primary_color ? school.primary_color + 'cc' : '#1d4ed8'} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                color: '#ffffff',
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}>
                                {school.logo_url ? (
                                  <img src={school.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ffffff' }} alt="" />
                                ) : (
                                  school.name.substring(0, 2).toUpperCase()
                                )}
                              </div>

                              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {school.name}
                                </div>
                                
                                {(school.zip_code || school.city) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                    <MapPin size={11} color="#64748b" />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {school.zip_code || ''} {school.city || ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Contact Details */}
                            {(school.email || school.phone_number) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid rgba(15,23,42,0.04)', paddingTop: '10px' }}>
                                {school.email && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Mail size={12} color="#94a3b8" />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.email}</span>
                                  </span>
                                )}
                                {school.phone_number && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={12} color="#94a3b8" />
                                    <span>{school.phone_number}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Subscriptions & Bypass Badges */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', width: '100%' }}>
                              {school.has_campus_subscription && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 800, color: '#34a853', background: '#e6f4ea', padding: '4px 8px', borderRadius: '100px', border: '1px solid rgba(52, 168, 83, 0.15)' }}>
                                  <GraduationCap size={11} /> Campus
                                </span>
                              )}
                              {school.has_groovelab_subscription && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 800, color: '#ca8a04', background: '#fef9c3', padding: '4px 8px', borderRadius: '100px', border: '1px solid rgba(202, 138, 4, 0.15)' }}>
                                  <Music size={11} /> GrooveLab
                                </span>
                              )}
                              {school.subscription_bypass && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 800, color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', padding: '4px 8px', borderRadius: '100px', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                                  <Sliders size={11} /> Bypass
                                </span>
                              )}
                            </div>

                            {/* Stats or Limits */}
                            <div style={{ width: '100%' }}>
                              {school.limits_enabled && school.is_trial ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.03)' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>
                                      <span>Lehrkräfte</span>
                                      <span>{teachers}/{school.max_teachers ?? 2}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                      <div style={{ 
                                        width: `${Math.min(100, (teachers / (school.max_teachers ?? 2)) * 100)}%`, 
                                        height: '100%', 
                                        background: school.primary_color || '#3b82f6', 
                                        borderRadius: '10px' 
                                      }} />
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>
                                      <span>Schüler</span>
                                      <span>{students}/{school.max_students ?? 6}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                      <div style={{ 
                                        width: `${Math.min(100, (students / (school.max_students ?? 6)) * 100)}%`, 
                                        height: '100%', 
                                        background: '#34a853', 
                                        borderRadius: '10px' 
                                      }} />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.03)', justifyContent: 'space-around', width: '100%', boxSizing: 'border-box' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{teachers}</span>
                                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: '#94a3b8', marginTop: '2px' }}>Lehrer</span>
                                  </div>
                                  <div style={{ width: '1px', background: 'rgba(15,23,42,0.08)' }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{students}</span>
                                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: '#94a3b8', marginTop: '2px' }}>Schüler</span>
                                  </div>
                                  <div style={{ width: '1px', background: 'rgba(15,23,42,0.08)' }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{bands}</span>
                                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: '#94a3b8', marginTop: '2px' }}>Ensembles</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Card Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(15,23,42,0.05)', justifyContent: 'space-between', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Aktiv</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSchoolPause(school.id, school.is_paused);
                                    }}
                                    style={{
                                      position: 'relative',
                                      width: '38px',
                                      height: '20px',
                                      borderRadius: '10px',
                                      background: school.is_paused ? 'rgba(15, 23, 42, 0.08)' : '#34a853',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'background 0.2s',
                                      padding: 0
                                    }}
                                  >
                                    <div style={{
                                      position: 'absolute',
                                      top: '2px',
                                      left: school.is_paused ? '2px' : '20px',
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      background: '#ffffff',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                      transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
                                    }} />
                                  </button>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyInviteLink(school.id, school.name, school.secretary_onboarding_token);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '100px',
                                    background: copiedId === school.id ? 'rgba(52, 168, 83, 0.1)' : '#ffffff',
                                    border: '1px solid rgba(15, 23, 42, 0.06)',
                                    color: copiedId === school.id ? '#34a853' : '#4f46e5',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  {copiedId === school.id ? <Check size={11} /> : <Copy size={11} />}
                                  <span>{copiedId === school.id ? 'Kopiert' : 'Link'}</span>
                                </button>
                              </div>
                              
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Möchtest du die Schule "${school.name}" wirklich deaktivieren (Soft-Delete)?`)) return;
                                  try {
                                    const { error } = await supabase.from('schools').update({ is_active: false }).eq('id', school.id);
                                    if (error) throw error;
                                    fetchSchoolsAndStats();
                                  } catch (err: any) {
                                    alert("Fehler beim Deaktivieren: " + err.message);
                                  }
                                }}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '8px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#ffffff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                              >
                                <Trash2 size={14} /> Deaktivieren
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List Layout Card Render matching screenshot */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {paginatedSchools.map((school) => {
                        const teachers = schoolStats[school.id]?.teachers || 0;
                        const students = schoolStats[school.id]?.students || 0;
                        
                        return (
                          <div 
                            key={school.id}
                            onClick={() => {
                              setSelectedSchool(school);
                              setShowMobileDetail(true);
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
                              setEditEmail(school.email || '');
                              setEditPhoneNumber(school.phone_number || '');
                              setEditHasGroovelab(school.has_groovelab_subscription ?? false);
                              setEditHasCampus(school.has_campus_subscription ?? false);
                              setEditSubscriptionBypass(school.subscription_bypass ?? false);
                            }}
                            style={{
                              background: '#ffffff',
                              borderRadius: '24px',
                              border: '1px solid rgba(15, 23, 42, 0.05)',
                              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.015)',
                              padding: '16px 24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              gap: '16px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.03)'}
                            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.015)'}
                            className="school-list-card-item"
                          >
                            {/* Left Section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                              {/* Circle Logo */}
                              <div style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '50%',
                                background: school.primary_color ? `${school.primary_color}10` : '#f1f5f9',
                                border: `1px solid ${school.primary_color ? `${school.primary_color}20` : 'rgba(15, 23, 42, 0.05)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                color: school.primary_color || '#475569',
                                fontSize: '1rem',
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}>
                                {school.logo_url ? (
                                  <img src={school.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ffffff' }} alt="" />
                                ) : (
                                  school.name.substring(0, 2).toUpperCase()
                                )}
                              </div>

                              {/* Info Column */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                                    {school.name}
                                  </span>
                                  <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: school.is_paused ? 'rgba(100,116,139,0.08)' : '#e6f4ea',
                                    color: school.is_paused ? '#64748b' : '#34a853',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                  }}>
                                    {school.is_paused ? 'Pausiert' : 'Aktiv'}
                                  </span>

                                  {/* Subscriptions stacked next to the name/status to avoid column collision */}
                                  {school.has_campus_subscription && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', background: '#e6f4ea', padding: '4px 10px', borderRadius: '6px' }}>
                                      Campus
                                    </span>
                                  )}
                                  {school.has_groovelab_subscription && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ca8a04', background: '#fef9c3', padding: '4px 10px', borderRadius: '6px' }}>
                                      GrooveLab
                                    </span>
                                  )}
                                  {school.subscription_bypass && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', border: '1px dashed rgba(220,38,38,0.2)', padding: '3px 8px', borderRadius: '6px' }}>
                                      Bypass
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span>{school.zip_code || school.city ? `${school.zip_code || ''} ${school.city || ''}` : 'Kein Standort'}</span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span>{students} Schüler</span>
                                  <span style={{ color: '#cbd5e1' }}>|</span>
                                  <span>{teachers} Lehrer</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                              {/* Vertical Separator */}
                              <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

                              {/* Action Buttons */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSchoolPause(school.id, school.is_paused)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                  title={school.is_paused ? 'Aktivieren' : 'Pausieren'}
                                >
                                  <Activity size={18} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => copyInviteLink(school.id, school.name, school.secretary_onboarding_token)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#4f46e5',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                  title="Einladungs-Link kopieren"
                                >
                                  {copiedId === school.id ? <Check size={18} color="#34a853" /> : <Link size={18} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm(`Möchtest du die Schule "${school.name}" wirklich deaktivieren?`)) return;
                                    try {
                                      const { error } = await supabase.from('schools').update({ is_active: false }).eq('id', school.id);
                                      if (error) throw error;
                                      fetchSchoolsAndStats();
                                    } catch (err: any) {
                                      alert("Fehler beim Deaktivieren: " + err.message);
                                    }
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                  title="Schule deaktivieren"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '24px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(15, 23, 42, 0.05)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#64748b'
                    }}>
                      <div>
                        Zeige {((activePage - 1) * itemsPerPage) + 1} - {Math.min(activePage * itemsPerPage, filteredSchools.length)} von {filteredSchools.length} Schulen
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          disabled={activePage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            background: activePage === 1 ? '#f8fafc' : '#ffffff',
                            color: activePage === 1 ? '#cbd5e1' : '#0f172a',
                            cursor: activePage === 1 ? 'default' : 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            transition: 'all 0.15s'
                          }}
                          className={activePage === 1 ? '' : 'hover-scale-mini'}
                        >
                          Zurück
                        </button>
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: 'none',
                                background: activePage === page ? '#0f172a' : 'transparent',
                                color: activePage === page ? '#ffffff' : '#64748b',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={activePage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            background: activePage === totalPages ? '#f8fafc' : '#ffffff',
                            color: activePage === totalPages ? '#cbd5e1' : '#0f172a',
                            cursor: activePage === totalPages ? 'default' : 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            transition: 'all 0.15s'
                          }}
                          className={activePage === totalPages ? '' : 'hover-scale-mini'}
                        >
                          Weiter
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

                {/* Right Side Pane: Details / Provisioning (Sleek Apple style Settings column) */}
                {(!isMobileOrTablet || showMobileDetail) && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    height: isMobileOrTablet ? '100vh' : '100%',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    // On mobile/tablet, it renders as a full screen overlay
                    ...(isMobileOrTablet ? {
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      zIndex: 9999,
                      padding: '24px',
                    } : {
                      borderRadius: '24px',
                      padding: '36px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                    })
                  }}>
                    {selectedSchool ? (
                      /* ================= SCHOOL EDIT MODE ================= */
                      <>
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(15,23,42,0.06)', paddingBottom: '16px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isMobileOrTablet && (
                              <button
                                type="button"
                                onClick={() => setShowMobileDetail(false)}
                                style={{
                                  border: 'none',
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <ArrowLeft size={14} /> Zurück
                              </button>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: `linear-gradient(135deg, ${editColor || '#3b82f6'} 0%, ${editColor ? editColor + 'cc' : '#1d4ed8'} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                color: '#ffffff',
                                fontSize: '0.85rem'
                              }}>
                                {editLogo ? (
                                  <img src={editLogo} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ffffff', borderRadius: '8px' }} alt="" />
                                ) : (
                                  editName.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>{editName}</h4>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }}>ID: {selectedSchool.id.substring(0, 8)}...</span>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchool(null);
                                setShowMobileDetail(false);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(15,23,42,0.08)',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: '0.78rem',
                                fontWeight: 750,
                                cursor: 'pointer'
                              }}
                            >
                              Schließen
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveSchoolDetails}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: editColor || '#34a853',
                                color: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Speichern
                            </button>
                          </div>
                        </div>

                        {/* Scrollable Settings Stack */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
                          
                          {/* Sektion 1: Stammdaten & Design */}
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Settings size={14} color="#4f46e5" /> Stammdaten & Design
                            </h5>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Schulname</label>
                              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>PLZ</label>
                                <input type="text" value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Ort</label>
                                <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Telefon</label>
                                <input type="text" value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>E-Mail</label>
                                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                              </div>
                            </div>
                          </div>

                          {/* Sektion 2: Design & Logo */}
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Palette size={14} color="#ec4899" /> Farben & Branding
                            </h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center' }}>
                              <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: 0 }} />
                              <input type="text" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Logo-URL (Optional)</label>
                              <input type="text" value={editLogo} onChange={(e) => setEditLogo(e.target.value)} placeholder="https://domain.com/logo.png" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                            </div>
                          </div>

                          {/* Sektion 3: Modul-Abonnements */}
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CreditCard size={14} color="#2563eb" /> Lizenzen &amp; Abonnements
                            </h5>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editHasCampus} onChange={(e) => setEditHasCampus(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#34a853' }} />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={14} color="#34a853" /> Campus-Modul buchen</span>
                              </label>

                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editHasGroovelab} onChange={(e) => setEditHasGroovelab(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#eab308' }} />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Music size={14} color="#ca8a04" /> GrooveLab-Modul buchen</span>
                              </label>

                              <div style={{ height: '1px', background: 'rgba(15,23,42,0.06)', margin: '4px 0' }} />

                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#dc2626', fontWeight: 800, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editSubscriptionBypass} onChange={(e) => setEditSubscriptionBypass(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#dc2626' }} />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} color="#dc2626" /> Rechnungs-Bypass aktivieren (Kostenlos)</span>
                              </label>
                            </div>
                          </div>

                          {/* Sektion 4: Kapazitäten & Limits */}
                          {(editIsTrial || editSubscriptionBypass) && (
                            <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={14} color="#0d9488" /> Kapazitäten &amp; Limits
                              </h5>
                              
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editLimitsEnabled} onChange={(e) => setEditLimitsEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#0d9488' }} />
                                <span>Ressourcen-Limits erzwingen</span>
                              </label>

                              {editLimitsEnabled && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Max Lehrer</label>
                                    <input type="number" value={editMaxTeachers} onChange={(e) => setEditMaxTeachers(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Max Schüler</label>
                                    <input type="number" value={editMaxStudents} onChange={(e) => setEditMaxStudents(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sektion 5: System-Status */}
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Activity size={14} color="#ea4335" /> System-Status
                            </h5>
                            
                            <div style={{ display: 'flex', background: '#ffffff', padding: '3px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)' }}>
                              <button
                                type="button"
                                onClick={() => setEditStatus('active')}
                                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', background: editStatus === 'active' ? '#34a853' : 'transparent', color: editStatus === 'active' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                              >
                                Aktiv
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditStatus('suspended')}
                                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', background: editStatus === 'suspended' ? '#ef4444' : 'transparent', color: editStatus === 'suspended' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                              >
                                Gesperrt
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Probezeit aktiv</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextTrial = !editIsTrial;
                                  setEditIsTrial(nextTrial);
                                  if (nextTrial && !editTrialEndsAt) {
                                    setEditTrialOption('14');
                                    setEditTrialEndsAt(getFutureDate(14));
                                  }
                                }}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  background: editIsTrial ? '#eab308' : 'rgba(15, 23, 42, 0.08)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'transform 0.2s', transform: editIsTrial ? 'translateX(19px)' : 'translateX(3px)' }} />
                              </button>
                            </div>

                            {editIsTrial && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                                <div style={{ display: 'flex', background: '#ffffff', padding: '3px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)' }}>
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
                                        if (opt.value === '14') setEditTrialEndsAt(getFutureDate(14));
                                        else if (opt.value === '30') setEditTrialEndsAt(getFutureDate(30));
                                      }}
                                      style={{ flex: 1, padding: '4px', borderRadius: '6px', border: 'none', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', background: editTrialOption === opt.value ? '#475569' : 'transparent', color: editTrialOption === opt.value ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Enddatum Probezeit</label>
                                  <input type="date" value={editTrialEndsAt} onChange={(e) => setEditTrialEndsAt(e.target.value)} disabled={editTrialOption !== 'custom'} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: editTrialOption !== 'custom' ? '#f1f5f9' : '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sektion 6: Integration & Direkt-Links */}
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Link size={14} color="#6366f1" /> Integration &amp; Links
                            </h5>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Subdomain Origin</label>
                              <a href={getSubdomainOrigin(editName)} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0284c7', wordBreak: 'break-all', fontWeight: 700, textDecoration: 'underline' }}>
                                {getSubdomainOrigin(editName)}
                              </a>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Sekretariat Onboarding-Link</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" readOnly value={getSecretaryInviteUrl(selectedSchool.id, selectedSchool.name, selectedSchool.secretary_onboarding_token || null)} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#f1f5f9', fontSize: '0.78rem', color: '#64748b', outline: 'none' }} />
                                <button
                                  type="button"
                                  onClick={() => copyInviteLink(selectedSchool.id, selectedSchool.name, selectedSchool.secretary_onboarding_token)}
                                  style={{ padding: '8px', borderRadius: '8px', background: copiedId === selectedSchool.id ? '#34a853' : '#4f46e5', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  {copiedId === selectedSchool.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Sektion 7: Schul-Administratoren */}
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h5 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={14} color="#f97316" /> Administratoren
                              </h5>
                              <button
                                type="button"
                                onClick={() => setShowAddSchoolAdminForm(!showAddSchoolAdminForm)}
                                style={{ padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.06)', color: '#4f46e5', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                              >
                                {showAddSchoolAdminForm ? 'Abbrechen' : '+ Admin anlegen'}
                              </button>
                            </div>

                            {showAddSchoolAdminForm && (
                              <form onSubmit={handleCreateSchoolAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.64rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Vorname *</label>
                                    <input required type="text" value={newSchoolAdminFirstName} onChange={(e) => setNewSchoolAdminFirstName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.64rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Nachname *</label>
                                    <input required type="text" value={newSchoolAdminLastName} onChange={(e) => setNewSchoolAdminLastName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }} />
                                  </div>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.64rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>E-Mail-Adresse *</label>
                                  <input required type="email" value={newSchoolAdminEmail} onChange={(e) => setNewSchoolAdminEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }} />
                                </div>
                                <button type="submit" style={{ marginTop: '4px', width: '100%', padding: '8px', borderRadius: '8px', background: '#4f46e5', border: 'none', color: '#ffffff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>
                                  Admin anlegen & PIN generieren
                                </button>
                              </form>
                            )}

                            {/* Admins List */}
                            {schoolStats[selectedSchool.id]?.adminUsers && schoolStats[selectedSchool.id]?.adminUsers.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {schoolStats[selectedSchool.id].adminUsers.map((admin: any) => (
                                  <div key={admin.id} style={{ background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div>
                                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{admin.first_name || ''} {admin.last_name || ''}</div>
                                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', fontWeight: 550 }}>{admin.role === 'secretary' ? 'Sekretariat / Verwaltung' : 'Admin'}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: admin.is_pin_activated ? '#34a853' : '#ca8a04', background: admin.is_pin_activated ? 'rgba(52, 168, 83, 0.1)' : 'rgba(234, 179, 8, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {admin.is_pin_activated ? 'PIN Aktiv' : `ID: CG-${admin.ausweis_nummer}`}
                                      </span>
                                      {admin.is_pin_activated && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (confirm(`Möchtest du den Zugang für ${admin.first_name || ''} ${admin.last_name || ''} zurücksetzen?`)) {
                                              const { error } = await supabase.from('users').update({ is_pin_activated: false }).eq('id', admin.id);
                                              if (error) alert(error.message);
                                              else fetchSchoolsAndStats();
                                            }
                                          }}
                                          style={{ border: 'none', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                          title="PIN zurücksetzen"
                                        >
                                          <RefreshCw size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ padding: '12px', background: '#ffffff', border: '1px dashed rgba(15,23,42,0.1)', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                                Noch kein Admin registriert.
                              </div>
                            )}
                          </div>

                        </div>
                      </>
                    ) : (
                      /* ================= SCHOOL PROVISION MODE ================= */
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(15,23,42,0.06)', paddingBottom: '16px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isMobileOrTablet && (
                              <button
                                type="button"
                                onClick={() => setShowMobileDetail(false)}
                                style={{ border: 'none', background: '#f1f5f9', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                              >
                                <ArrowLeft size={14} /> Zurück
                              </button>
                            )}
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                              <Plus size={18} color="#d97706" /> Schule provisionieren
                            </h3>
                          </div>
                        </div>

                        <form onSubmit={handleCreateSchool} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Name der Schule *</label>
                              <input type="text" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="z.B. Groove Academy Munich" required style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>PLZ</label>
                                <input type="text" value={newSchoolZip} onChange={(e) => setNewSchoolZip(e.target.value)} placeholder="z.B. 80331" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Ort</label>
                                <input type="text" value={newSchoolCity} onChange={(e) => setNewSchoolCity(e.target.value)} placeholder="z.B. München" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                              </div>
                            </div>
                          </div>

                          <div style={{ border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Branding-Farbe</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center' }}>
                              <input type="color" value={newSchoolColor} onChange={(e) => setNewSchoolColor(e.target.value)} style={{ border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: 0 }} />
                              <input type="text" value={newSchoolColor} onChange={(e) => setNewSchoolColor(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }} />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={creating}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '12px',
                              background: '#d97706',
                              border: 'none',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              marginTop: 'auto',
                              flexShrink: 0
                            }}
                          >
                            {creating ? 'Wird provisioniert...' : (
                              <>
                                <Plus size={16} /> Schule provisionieren
                              </>
                            )}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



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
          border-color: #34a853 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(52, 168, 83, 0.12) !important;
        }
        
        .search-input-field:focus {
          border-color: #34a853 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(52, 168, 83, 0.12) !important;
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
    </div>
  );
}



