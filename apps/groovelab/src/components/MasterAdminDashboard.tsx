import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, Plus, Copy, Check, Trash2, Users, Monitor, 
  MapPin, LogOut, RefreshCw, Layers, Award, Clock, Music, GraduationCap,
  Edit2, Settings, Sliders, Search, Tag, Percent,
  Activity, Cpu, Database, AlertTriangle
} from 'lucide-react';

interface ServerMetric {
  id: string;
  created_at: string;
  cpu_load: number;
  mem_used_mb: number;
  mem_total_mb: number;
  swap_used_mb: number;
  active_connections: number;
}

import { BillingDashboard } from './BillingDashboard';

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
  has_groovelab_subscription?: boolean;
  has_campus_subscription?: boolean;
  subscription_bypass?: boolean;
  groovelab_kiosk_token?: string | null;
  campus_login_token?: string | null;
  secretary_onboarding_token?: string | null;
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
}

export function MasterAdminDashboard({ onLogout }: MasterAdminDashboardProps) {
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
  const [billingCompany, setBillingCompany] = useState('Simplified Work GbR');
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
  const [editHasGroovelab, setEditHasGroovelab] = useState(false);
  const [editHasCampus, setEditHasCampus] = useState(false);
  const [editSubscriptionBypass, setEditSubscriptionBypass] = useState(false);

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
    fetchAdminUser();
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
        setAdminPassword(data.master_admin_password || 'groovelab2026');
      }
    } catch (err) {
      console.error('Error fetching admin:', err);
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
    if (!adminUsername.trim() || !adminPassword.trim()) return;
    try {
      setUpdatingAdmin(true);
      const { error } = await supabase
        .from('users')
        .update({
          master_admin_username: adminUsername.trim(),
          master_admin_password: adminPassword.trim()
        })
        .eq('is_master_admin', true);
      if (error) throw error;
      alert('Zugangsdaten erfolgreich aktualisiert!');
      fetchAdminUser();
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
        { count: sessionCount }
      ] = await Promise.all([
        supabase.from('school_user_statistics').select('*'),
        supabase.from('users').select('id, first_name, last_name, role, school_id, is_campus_active, is_groovelab_active, ausweis_nummer, teacher_qr_token, is_pin_activated').or('role.eq.secretary,role.eq.admin,role.eq.teacher'),
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
          adminUsers: schoolStaff.filter(u => u.role === 'secretary' || u.role === 'admin')
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
          city: newSchoolCity.trim() || null
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
    const inviteUrl = `${getSubdomainOrigin(schoolName)}&invite_school_id=${schoolId}&role=secretary&token=${token || ''}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(schoolId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSchools = schools.filter(school => {
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = school.name?.toLowerCase().includes(q);
    const cityMatch = school.city?.toLowerCase().includes(q);
    const zipMatch = school.zip_code?.toLowerCase().includes(q);
    return nameMatch || cityMatch || zipMatch;
  });

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
              {[
                { id: 'schools', label: 'Schulen & Tenants', icon: <Layers size={18} />, color: '#059669', bg: 'rgba(16, 185, 129, 0.1)' },
                { id: 'briefing', label: 'Briefing Board', icon: <Clock size={18} />, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
                { id: 'billing', label: 'Abrechnung & Abonnements', icon: <GraduationCap size={18} />, color: '#ca8a04', bg: 'rgba(234, 179, 8, 0.1)' },
                { id: 'banking', label: 'Adresse & Banking', icon: <Settings size={18} />, color: '#059669', bg: 'rgba(16, 185, 129, 0.1)' },
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
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.8rem',
                boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)'
              }}>
                MA
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {adminUsername || 'Master Admin'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
          boxSizing: 'border-box'
        }}>
          {activePortalTab === 'briefing' ? (

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
              {/* Header Panel - Greeting */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
                    Guten Morgen, Patrick.
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
                    Hier ist dein System-Briefing für heute.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={fetchPendingUsers}
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
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px'
              }}>
                {/* Total Schools */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{stats.totalSchools}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schulen</span>
                  </div>
                </div>

                {/* Total Teachers */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{stats.totalTeachers}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lehrkräfte</span>
                  </div>
                </div>

                {/* Total Students */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{stats.totalStudents}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler</span>
                  </div>
                </div>

                {/* Pending Activations (Red Highlight) */}
                <div style={{
                  background: pendingUsers.length > 0 ? 'rgba(234, 67, 53, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: pendingUsers.length > 0 ? '1px solid rgba(234, 67, 53, 0.2)' : '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: pendingUsers.length > 0 ? '0 10px 30px rgba(234, 67, 53, 0.1)' : '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: pendingUsers.length > 0 ? 'rgba(234, 67, 53, 0.15)' : 'rgba(100, 116, 139, 0.1)', color: pendingUsers.length > 0 ? '#ea4335' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: pendingUsers.length > 0 ? '#ea4335' : '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{pendingUsers.length}</strong>
                    <span style={{ fontSize: '0.85rem', color: pendingUsers.length > 0 ? '#ea4335' : '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ausstehende Aktivierungen</span>
                  </div>
                </div>
              </div>

              {/* Action Required: Aktivierungs-Center */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Aktionsbedarf</h3>
                  {pendingUsers.length > 0 && (
                    <span style={{ background: '#ea4335', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {pendingUsers.length} offen
                    </span>
                  )}
                </div>

                {pendingUsers.length === 0 ? (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    border: '1px dashed rgba(15, 23, 42, 0.15)',
                    padding: '60px 40px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={32} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Alles erledigt!</h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Es liegen aktuell keine offenen Aktivierungen vor. Genieß den Tag.</p>
                    </div>
                  </div>
                ) : (
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
                            checked={pendingUsers.length > 0 && selectedUserIds.length === pendingUsers.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds(pendingUsers.map(u => u.id));
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                            style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer', accentColor: '#ea4335' }}
                          />
                          <span>Alle {pendingUsers.length} auswählen</span>
                        </label>
                      </div>

                      {/* Scrollable list */}
                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px', padding: '12px' }}>
                        {loadingPending ? (
                          <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '28px', height: '28px', border: '3px solid rgba(234, 67, 53, 0.1)', borderTopColor: '#ea4335', borderRadius: '50%' }} className="animate-spin" />
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Lade Schüler...</span>
                          </div>
                        ) : (
                          (() => {
                            const filtered = pendingUsers.filter(u => {
                              const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                              const schoolName = (schools.find(s => s.id === u.school_id)?.name || '').toLowerCase();
                              const refCode = `CG-${u.ausweis_nummer || ''}`.toLowerCase();
                              const query = pendingSearchQuery.toLowerCase();
                              return name.includes(query) || schoolName.includes(query) || refCode.includes(query);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Keine Treffer</div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Die Suche ergab keine Ergebnisse.</div>
                                </div>
                              );
                            }

                            return filtered.map(u => {
                              const school = schools.find(s => s.id === u.school_id);
                              const isSelected = selectedUserIds.includes(u.id);
                              const isFocused = selectedUser?.id === u.id;
                              
                              // Format creation date
                              const ageStr = u.created_at ? (() => {
                                const diff = Date.now() - new Date(u.created_at).getTime();
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                if (days === 0) return 'Heute';
                                if (days === 1) return 'Gestern';
                                return `Vor ${days} Tagen`;
                              })() : '';

                              return (
                                <div
                                  key={u.id}
                                  onClick={() => setSelectedUser(u)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    background: isFocused ? 'rgba(234, 67, 53, 0.06)' : 'transparent',
                                    border: isFocused ? '1px solid rgba(234, 67, 53, 0.15)' : '1px solid transparent',
                                    marginBottom: '8px'
                                  }}
                                  className="activation-list-item"
                                  onMouseOver={(e) => { if (!isFocused) e.currentTarget.style.background = '#f8fafc'; }}
                                  onMouseOut={(e) => { if (!isFocused) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {/* Selection Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUserIds(prev => [...prev, u.id]);
                                      } else {
                                        setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                      }
                                    }}
                                    style={{ width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, accentColor: '#ea4335' }}
                                  />

                                  {/* Student Initials Avatar */}
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: school?.primary_color ? `${school.primary_color}15` : 'rgba(15, 23, 42, 0.05)',
                                    color: school?.primary_color || '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                                  </div>

                                  {/* User Info details */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                      <strong style={{ fontSize: '0.95rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                                        {u.first_name} {u.last_name}
                                      </strong>
                                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{ageStr}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                      <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 750,
                                        color: school?.primary_color || '#64748b',
                                        background: school?.primary_color ? `${school.primary_color}0d` : '#f1f5f9',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '140px'
                                      }}>
                                        {school?.name || 'Unbekannte Schule'}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#334155', background: '#e2e8f0', padding: '4px 8px', borderRadius: '8px' }}>
                                        CG-{u.ausweis_nummer || 'OHNE'}
                                      </span>
                                      {!u.is_campus_active ? (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ea4335', background: 'rgba(234, 67, 53, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                                          Neu
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: '8px' }}>
                                          Zahlung offen
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Detailed View and Actions */}
                    <div style={{
                      flex: '0 0 55%',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(16px)',
                      borderRadius: '24px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.03)',
                      padding: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: selectedUser ? 'flex-start' : 'center',
                      alignItems: selectedUser ? 'stretch' : 'center',
                      textAlign: selectedUser ? 'left' : 'center'
                    }}>
                      {selectedUser ? (
                        (() => {
                          const u = selectedUser;
                          const school = schools.find(s => s.id === u.school_id);
                          const refCode = `CG-${u.ausweis_nummer || 'OHNE'}`;
                          const isActivating = activatingUserId === u.id;
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }} className="animate-fade-in">
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
                                    <><Check size={20} /> Zahlung erhalten & Account freischalten</>
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
                )}
              

              {/* Server-Systemstatus & Auslastung */}
              {(() => {
                const latestMetric = serverMetrics[0] || null;
                const cpuVal = latestMetric ? latestMetric.cpu_load : 0;
                const ramUsed = latestMetric ? latestMetric.mem_used_mb : 0;
                const ramTotal = latestMetric ? latestMetric.mem_total_mb : 8000;
                const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0;
                const dbConns = latestMetric ? latestMetric.active_connections : 0;
                
                let healthStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
                if (cpuVal >= 4.0 || ramPct >= 90 || dbConns >= 80) {
                  healthStatus = 'critical';
                } else if (cpuVal >= 2.0 || ramPct >= 75 || dbConns >= 50) {
                  healthStatus = 'warning';
                }

                // Format timestamp
                const formattedTime = latestMetric 
                  ? new Date(latestMetric.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : '--:--:--';

                return (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
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
                          background: healthStatus === 'critical' ? 'rgba(239, 68, 68, 0.1)' : healthStatus === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: healthStatus === 'critical' ? '#ef4444' : healthStatus === 'warning' ? '#f59e0b' : '#10b981',
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
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '24px'
                    }}>
                      {/* CPU Metric Card */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(15, 23, 42, 0.04)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <Cpu size={14} /> CPU Auslastung
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: cpuVal >= 4.0 ? '#ef4444' : cpuVal >= 2.0 ? '#d97706' : '#10b981' }}>
                            {cpuVal.toFixed(2)} / 2.0 Cores
                          </span>
                        </div>
                        {/* Custom progress bar */}
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min((cpuVal / 2.0) * 100, 100)}%`,
                            background: cpuVal >= 4.0 ? '#ef4444' : cpuVal >= 2.0 ? '#f59e0b' : '#10b981',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease-in-out'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Auslastung: {Math.round((cpuVal / 2.0) * 100)}%</span>
                          <span>{cpuVal >= 4.0 ? 'Kritisch' : cpuVal >= 2.0 ? 'Warnung' : 'Stabil'}</span>
                        </div>
                      </div>

                      {/* RAM Metric Card */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(15, 23, 42, 0.04)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <Sliders size={14} /> Arbeitsspeicher (RAM)
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: ramPct >= 90 ? '#ef4444' : ramPct >= 75 ? '#d97706' : '#10b981' }}>
                            {(ramUsed / 1024).toFixed(2)} GB / {(ramTotal / 1024).toFixed(2)} GB
                          </span>
                        </div>
                        {/* Custom progress bar */}
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(ramPct, 100)}%`,
                            background: ramPct >= 90 ? '#ef4444' : ramPct >= 75 ? '#f59e0b' : '#10b981',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease-in-out'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Belegt: {Math.round(ramPct)}%</span>
                          <span>{ramPct >= 90 ? 'Kritisch' : ramPct >= 75 ? 'Warnung' : 'Stabil'}</span>
                        </div>
                      </div>

                      {/* DB Connections Metric Card */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(15, 23, 42, 0.04)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <Database size={14} /> DB Pool Connections
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: dbConns >= 80 ? '#ef4444' : dbConns >= 50 ? '#d97706' : '#10b981' }}>
                            {dbConns} / 100
                          </span>
                        </div>
                        {/* Custom progress bar */}
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(dbConns, 100)}%`,
                            background: dbConns >= 80 ? '#ef4444' : dbConns >= 50 ? '#f59e0b' : '#10b981',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease-in-out'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Auslastung: {dbConns}%</span>
                          <span>{dbConns >= 80 ? 'Kritisch' : dbConns >= 50 ? 'Warnung' : 'Stabil'}</span>
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
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.00"/>
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
                                <polyline fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(cpuPoints)} />
                                <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(ramPoints)} />
                                <polyline fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsToString(dbPoints)} />

                                {/* Interactive dots on latest point */}
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

                        {/* Chart Legend */}
                        <div style={{
                          display: 'flex',
                          gap: '24px',
                          justifyContent: 'center',
                          marginTop: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            <span style={{ width: '12px', height: '3px', background: '#10b981', borderRadius: '2px' }} />
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
                );
              })()}

              
            </div>
            </div>

          ) : activePortalTab === 'billing' ? (
            <div className="animate-fade-in">
              <BillingDashboard />
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
                      <Percent size={20} color="#059669" /> Rabatt-Kampagne erstellen
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
                              background: newOfferActive ? '#10b981' : 'rgba(15, 23, 42, 0.08)',
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
                              <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ background: 'rgba(5, 150, 105, 0.08)', padding: '2px 8px', borderRadius: '100px' }}>
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
                                  background: offer.is_active ? '#10b981' : 'rgba(15, 23, 42, 0.08)',
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
                  Adresse &amp; Banking
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 550 }}>
                  Verwalte die globalen Zugangsdaten und die hinterlegte Rechnungsadresse für den Betreiber Simplified Work.
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
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 28px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                    <Shield size={20} color="#d97706" /> Master-Admin Zugang
                  </h3>

                  <form onSubmit={handleUpdateAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          color: '#0f172a',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                        onFocus={() => setUsernameFocused(true)}
                        onBlur={() => setUsernameFocused(false)}
                        className="premium-input"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Passwort
                      </label>
                      <input
                        type={passwordFocused ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Passwort"
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
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        className="premium-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingAdmin}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                      }}
                      className="hover-scale-mini"
                    >
                      {updatingAdmin ? 'Wird gespeichert...' : 'Zugangsdaten speichern'}
                    </button>
                  </form>

                  {adminUser && (
                    <div style={{
                      marginTop: '28px',
                      padding: '24px',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: '16px',
                      border: '1px solid rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      <strong style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Kiosk Master QR-Badge
                      </strong>
                      <div style={{
                        background: '#ffffff',
                        padding: '12px',
                        borderRadius: '16px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.02)'
                      }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${adminUser.qr_token}`}
                          alt="Master Admin QR Badge"
                          style={{ width: '120px', height: '120px', display: 'block' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textAlign: 'center', lineHeight: '1.5', fontWeight: 550 }}>
                        Scanne diesen QR-Code am Kiosk-Tablet für schnellen Master-Admin-Zugang.
                      </p>
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
                    <Settings size={20} color="#059669" /> Betreiber Rechnungsdaten
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
                        placeholder="z.B. Simplified Work GbR"
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
                        background: 'rgba(5, 150, 105, 0.1)',
                        border: '1px solid rgba(5, 150, 105, 0.25)',
                        color: '#059669',
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
                        e.currentTarget.style.background = '#059669';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(5, 150, 105, 0.1)';
                        e.currentTarget.style.color = '#059669';
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
                gridTemplateColumns: '7fr 4.8fr',
                gap: '32px',
                alignItems: 'start'
              }}>
                {/* Left Side: Schools list */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '36px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
                  minHeight: '450px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                    <Layers size={20} color="#d97706" /> Registrierte Schul-Tenants
                  </h3>

                  {/* Search Input */}
                  <div style={{ position: 'relative', marginBottom: '24px' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {filteredSchools.map((school) => {
                        const teachers = schoolStats[school.id]?.teachers || 0;
                        const students = schoolStats[school.id]?.students || 0;
                        const bands = schoolStats[school.id]?.bands || 0;

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
                              setEditHasGroovelab(school.has_groovelab_subscription ?? false);
                              setEditHasCampus(school.has_campus_subscription ?? false);
                              setEditSubscriptionBypass(school.subscription_bypass ?? false);
                            }}
                            style={{ 
                              borderRadius: '16px',
                              padding: '16px 20px',
                              border: '1px solid rgba(15, 23, 42, 0.05)',
                              background: '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.25s ease',
                              gap: '16px'
                            }}
                            className="school-list-card"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                              {/* Icon / Logo Badge */}
                              <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '12px',
                                background: `linear-gradient(135deg, ${school.primary_color || '#3b82f6'} 0%, ${school.primary_color ? school.primary_color + 'cc' : '#1d4ed8'} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                color: '#ffffff',
                                fontSize: '1rem',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}>
                                {school.logo_url ? (
                                  <img src={school.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                ) : (
                                  school.name.substring(0, 2).toUpperCase()
                                )}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {school.name}
                                </div>
                                
                                {(school.zip_code || school.city) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                                    <MapPin size={11} color="#64748b" />
                                    <span>{school.zip_code || ''} {school.city || ''}</span>
                                  </div>
                                )}

                                {/* Limits Micro progress indicators */}
                                {school.limits_enabled ? (
                                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '90px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                        <span>Lehrer</span>
                                        <span>{teachers}/{school.max_teachers ?? 2}</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', background: 'rgba(15,23,42,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${Math.min(100, (teachers / (school.max_teachers ?? 2)) * 100)}%`, 
                                          height: '100%', 
                                          background: school.primary_color || '#3b82f6', 
                                          borderRadius: '10px' 
                                        }} />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '90px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                        <span>Schüler</span>
                                        <span>{students}/{school.max_students ?? 6}</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', background: 'rgba(15,23,42,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${Math.min(100, (students / (school.max_students ?? 6)) * 100)}%`, 
                                          height: '100%', 
                                          background: '#10b981', 
                                          borderRadius: '10px' 
                                        }} />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginTop: '6px' }}>
                                    {teachers} Lehrer • {students} Schüler • {bands} Ensembles
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                  {school.has_campus_subscription && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0284c7', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '100px' }}>
                                      🎓 Campus
                                    </span>
                                  )}
                                  {school.has_groovelab_subscription && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ea580c', background: 'rgba(251, 146, 60, 0.12)', padding: '2px 8px', borderRadius: '100px' }}>
                                      🎸 GrooveLab
                                    </span>
                                  )}
                                  {school.subscription_bypass && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', background: 'rgba(248, 113, 113, 0.12)', padding: '2px 8px', borderRadius: '100px', border: '1px dashed rgba(248, 113, 113, 0.3)' }}>
                                      ⚠️ Bypass
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Row Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSchoolPause(school.id, school.is_paused);
                                }}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  background: school.is_paused ? 'rgba(15, 23, 42, 0.08)' : '#10b981',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0',
                                  transition: 'background-color 0.25s',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title={school.is_paused ? 'Aktivieren' : 'Pausieren'}
                              >
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                  transform: school.is_paused ? 'translateX(3px)' : 'translateX(19px)'
                                }} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyInviteLink(school.id, school.name, school.secretary_onboarding_token);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '100px',
                                  background: copiedId === school.id ? 'rgba(16, 185, 129, 0.1)' : '#ffffff',
                                  border: '1px solid rgba(15, 23, 42, 0.06)',
                                  color: copiedId === school.id ? '#10b981' : '#4f46e5',
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

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSchool(school.id, school.name);
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
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
                                title="Löschen"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Side: Create School */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '36px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
                  }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 26px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                      <Plus size={20} color="#d97706" /> Schule provisionieren
                    </h3>

                    <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
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

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                          Primäre Branding-Farbe
                        </label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={newSchoolColor}
                            onChange={(e) => setNewSchoolColor(e.target.value)}
                            style={{
                              border: 'none',
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: 'transparent',
                              padding: 0
                            }}
                          />
                          <input
                            type="text"
                            value={newSchoolColor}
                            onChange={(e) => setNewSchoolColor(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '11px 12px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid rgba(15, 23, 42, 0.08)',
                              color: '#0f172a',
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
                        disabled={creating}
                        style={{
                          marginTop: '8px',
                          padding: '14px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(217, 119, 6, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        className="hover-scale-mini"
                      >
                        {creating ? 'Wird provisioniert...' : (
                          <>
                            <Plus size={16} /> Schule anlegen
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

          {/* Frosted Details Modal Frame */}
          <div style={{
            width: '100%',
            maxWidth: '1150px',
            height: '86vh',
            background: '#ffffff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '28px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '22px 36px',
              borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${editColor || '#3b82f6'} 0%, ${editColor ? editColor + 'cc' : '#1d4ed8'} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  color: '#ffffff',
                  fontSize: '1rem',
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                }}>
                  {editLogo ? (
                    <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    editName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      {editName || selectedSchool.name}
                    </h3>
                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      background: editStatus === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: editStatus === 'active' ? '#10b981' : '#dc2626',
                      border: `1px solid ${editStatus === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      {editStatus === 'active' ? 'Aktiv' : 'Inaktiv/Gesperrt'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>
                    ID: {selectedSchool.id}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedSchool(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid rgba(15, 23, 42, 0.1)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale-mini"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveSchoolDetails}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    background: editColor || '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: `0 4px 15px ${editColor}30`,
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale-mini"
                >
                  Speichern
                </button>
              </div>
            </div>

            {/* Inner Content split */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              overflow: 'hidden'
            }}>
              {/* Left Column Preview */}
              <div style={{
                background: '#f8fafc',
                borderRight: '1px solid rgba(15, 23, 42, 0.06)',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                overflowY: 'auto'
              }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${editColor || '#3b82f6'} 0%, ${editColor ? editColor + 'cc' : '#1d4ed8'} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    overflow: 'hidden',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                  }}>
                    {editLogo ? (
                      <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      editName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Live-Vorschau</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Subdomain Origin</label>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#0284c7', wordBreak: 'break-all', fontWeight: 600 }}>
                    {getSubdomainOrigin(editName)}
                  </span>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>System-Status</h4>
                  
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
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
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s',
                        transform: editIsTrial ? 'translateX(19px)' : 'translateX(3px)'
                      }} />
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
                      <Settings size={16} color="#d97706" /> Stammdaten &amp; Design
                    </h4>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Schulname</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>PLZ</label>
                        <input 
                          type="text" 
                          value={editZipCode} 
                          onChange={(e) => setEditZipCode(e.target.value)} 
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
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Ort</label>
                        <input 
                          type="text" 
                          value={editCity} 
                          onChange={(e) => setEditCity(e.target.value)} 
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

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Branding-Farbe</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="color" 
                          value={editColor} 
                          onChange={(e) => setEditColor(e.target.value)} 
                          style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: 0 }} 
                        />
                        <input 
                          type="text" 
                          value={editColor} 
                          onChange={(e) => setEditColor(e.target.value)} 
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(15,23,42,0.08)',
                            background: '#f8fafc',
                            fontSize: '0.88rem',
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            fontWeight: 700,
                            outline: 'none'
                          }}
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
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(15,23,42,0.08)',
                          background: '#f8fafc',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          outline: 'none'
                        }}
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
                      <Layers size={16} color="#4f46e5" /> Modul-Abonnements
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: editHasCampus ? 'rgba(56, 189, 248, 0.08)' : '#f8fafc',
                        border: `1px solid ${editHasCampus ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15,23,42,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: editHasCampus ? '#0284c7' : '#475569' }}>🎓 Campus Modul</span>
                        <input
                          type="checkbox"
                          checked={editHasCampus}
                          onChange={(e) => setEditHasCampus(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: editHasGroovelab ? 'rgba(251, 146, 60, 0.08)' : '#f8fafc',
                        border: `1px solid ${editHasGroovelab ? 'rgba(251, 146, 60, 0.2)' : 'rgba(15,23,42,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: editHasGroovelab ? '#ea580c' : '#475569' }}>🎸 GrooveLab Modul</span>
                        <input
                          type="checkbox"
                          checked={editHasGroovelab}
                          onChange={(e) => setEditHasGroovelab(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: editSubscriptionBypass ? 'rgba(239, 68, 68, 0.08)' : '#f8fafc',
                        border: `1px solid ${editSubscriptionBypass ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15,23,42,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: editSubscriptionBypass ? '#dc2626' : '#475569' }}>⚙️ Freie Aktivierung (Abo-Bypass)</span>
                        <input
                          type="checkbox"
                          checked={editSubscriptionBypass}
                          onChange={(e) => setEditSubscriptionBypass(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>
                  </div>
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
                    <Clock size={16} color="#d97706" /> Kapazitäten &amp; Limits
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
                    🔗 Direkt-Links &amp; Integration
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>Einladungslink (Sekretariat)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          readOnly
                          value={`${getSubdomainOrigin(selectedSchool.name)}&invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || ''}`}
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
                            navigator.clipboard.writeText(`${getSubdomainOrigin(selectedSchool.name)}&invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || ''}`);
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
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                    💼 Hauptbenutzer / School Admins
                  </h4>

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
                    <div style={{ padding: '24px', background: '#f8fafc', border: '1px dashed rgba(15,23,42,0.1)', borderRadius: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                      Noch kein Administrator auf dieser Schule registriert.
                    </div>
                  )}
                </div>
              </div>
            </div>
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
    </div>
  );
}



