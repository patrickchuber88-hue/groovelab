import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, Plus, Copy, Check, Trash2, Users, Monitor, 
  MapPin, LogOut, RefreshCw, Layers, Award, Clock, Music, GraduationCap,
  Edit2, Settings, Sliders, Search
} from 'lucide-react';

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
  const parts = host.split('.');

  if (parts.includes('localhost') || host.includes('localhost') || host.includes('127.0.0.1')) {
    const port = host.split(':')[1] || '5173';
    return `${protocol}//${subdomain}.localhost:${port}`;
  } else {
    let domainParts = [...parts];
    if (domainParts.length >= 3 && (domainParts[0] === 'admin' || domainParts[0] === 'campus-groovelab' || domainParts[0] === 'www')) {
      domainParts.shift();
    }
    return `${protocol}//${subdomain}.${domainParts.join('.')}`;
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
  const [activePortalTab, setActivePortalTab] = useState<'schools' | 'billing'>('schools');
  
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

  useEffect(() => {
    fetchSchoolsAndStats();
    fetchAdminUser();
  }, []);

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
      
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .order('name');
        
      if (schoolErr) throw schoolErr;
      setSchools(schoolData || []);

      const [
        { data: users },
        { data: songs },
        { data: bands },
        { count: sessionCount }
      ] = await Promise.all([
        supabase.from('users').select('role, school_id, is_campus_active, is_groovelab_active'),
        supabase.from('songs').select('school_id'),
        supabase.from('bands').select('school_id, name'),
        supabase.from('sessions').select('*', { count: 'exact', head: true })
      ]);

      const teachersCount = users?.filter(u => u.role === 'teacher' || u.role === 'admin').length || 0;
      const studentsCount = users?.filter(u => u.role === 'student').length || 0;

      setStats({
        totalSchools: schoolData?.length || 0,
        totalTeachers: teachersCount,
        totalStudents: studentsCount,
        totalSessions: sessionCount || 0
      });

      const sStats: Record<string, any> = {};
      schoolData?.forEach(school => {
        const schoolUsers = users?.filter(u => u.school_id === school.id) || [];
        sStats[school.id] = {
          teachers: schoolUsers.filter(u => u.role === 'teacher' || u.role === 'admin').length,
          students: schoolUsers.filter(u => u.role === 'student').length,
          teachersCampus: schoolUsers.filter(u => (u.role === 'teacher' || u.role === 'admin') && u.is_campus_active).length,
          teachersGroovelab: schoolUsers.filter(u => (u.role === 'teacher' || u.role === 'admin') && u.is_groovelab_active).length,
          studentsCampus: schoolUsers.filter(u => u.role === 'student' && u.is_campus_active).length,
          studentsGroovelab: schoolUsers.filter(u => u.role === 'student' && u.is_groovelab_active).length,
          songs: songs?.filter(s => s.school_id === school.id).length || 0,
          bands: bands?.filter(b => b.school_id === school.id && b.name !== '__SYSTEM_ANNOUNCEMENTS__').length || 0
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
    const inviteUrl = `${getSubdomainOrigin(schoolName)}/?invite_school_id=${schoolId}&role=secretary&token=${token || ''}`;
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
      background: 'radial-gradient(circle at 50% 0%, #fcfdfe 0%, #f4f6fa 100%)',
      color: '#1d1d1f',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      padding: '40px 24px',
      transition: 'all 0.3s ease'
    }}>
      {/* Premium Apple-Style Header Card */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 40px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '24px 32px',
        borderRadius: '24px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.015)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            padding: '14px',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(234, 179, 8, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
              GrooveLab Master Portal
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#8e8e93', margin: '4px 0 0 0', fontWeight: 600 }}>
              Globale Multi-Tenant Verwaltung & Provisionierung
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: '#f5f5f7', padding: '4px', borderRadius: '14px' }}>
          <button
            onClick={() => setActivePortalTab('schools')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activePortalTab === 'schools' ? '#ffffff' : 'transparent',
              color: activePortalTab === 'schools' ? '#1d1d1f' : '#8e8e93',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activePortalTab === 'schools' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            🏫 Schulen
          </button>
          <button
            onClick={() => setActivePortalTab('billing')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activePortalTab === 'billing' ? '#ffffff' : 'transparent',
              color: activePortalTab === 'billing' ? '#1d1d1f' : '#8e8e93',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activePortalTab === 'billing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            💳 Abrechnung
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchSchoolsAndStats}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              color: '#8e8e93',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
            }}
            className="hover-scale-mini"
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)';
              e.currentTarget.style.color = '#1d1d1f';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.color = '#8e8e93';
            }}
          >
            <RefreshCw size={18} />
          </button>
          
          <button
            onClick={onLogout}
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              background: '#ff3b30', // iOS Red
              border: 'none',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(255, 59, 48, 0.15)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale-mini"
          >
            <LogOut size={16} /> Abmelden
          </button>
        </div>
      </div>

      {activePortalTab === 'billing' ? (
        <BillingDashboard />
      ) : (
        <>
          {/* KPI Stats Grid */}
          <div style={{
        maxWidth: '1200px',
        margin: '0 auto 40px auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        {[
          { title: 'Registrierte Schulen', value: stats.totalSchools, icon: <Layers size={20} />, color: '#eab308' },
          { title: 'Verknüpfte Lehrer', value: stats.totalTeachers, icon: <Users size={20} />, color: '#3b82f6' },
          { title: 'Aktive Schüler', value: stats.totalStudents, icon: <Award size={20} />, color: '#22c55e' },
          { title: 'Sitzungen im Labor', value: stats.totalSessions, icon: <Clock size={20} />, color: '#a855f7' }
        ].map((kpi, idx) => (
          <div key={idx} style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px 28px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.015)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            cursor: 'default'
          }}
          className="hover-scale-mini"
          >
            <div>
              <p style={{ color: '#8e8e93', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
                {kpi.title}
              </p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '6px 0 0 0', color: '#1d1d1f', letterSpacing: '-0.04em' }}>
                {kpi.value}
              </h3>
            </div>
            <div style={{
              background: `${kpi.color}0c`,
              color: kpi.color,
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${kpi.color}15`,
            }}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '7fr 5fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        
        {/* Left Side: Schools flex card list */}
        <div style={{
          background: '#ffffff',
          borderRadius: '28px',
          padding: '32px',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.015)',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            <Layers size={22} color="#eab308" /> Schulen & Tenants
          </h2>

          {/* School Search Input */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={18} color="#8e8e93" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Schulen nach Name, PLZ oder Ort durchsuchen..."
              value={schoolSearchQuery}
              onChange={(e) => setSchoolSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 16px 12px 48px',
                borderRadius: '14px',
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#eab308';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '80px 0', gap: '16px' }}>
              <div className="loader" style={{
                border: '4px solid rgba(0,0,0,0.05)',
                borderLeftColor: '#eab308',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ color: '#8e8e93', fontSize: '0.95rem', fontWeight: 600 }}>Lade Schulregister...</p>
            </div>
          ) : schools.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#8e8e93', fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Keine Schulen im System registriert. Lege rechts deine erste Schule an!
            </div>
          ) : filteredSchools.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#8e8e93', fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Keine Schulen gefunden, die deiner Suche entsprechen.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSchools.map((school) => {
                const teachers = schoolStats[school.id]?.teachers || 0;
                const students = schoolStats[school.id]?.students || 0;
                const songs = schoolStats[school.id]?.songs || 0;
                const bands = schoolStats[school.id]?.bands || 0;

                return (
                  <div 
                    key={school.id} 
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('input') || target.closest('a')) {
                        return;
                      }
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
                      borderRadius: '18px',
                      padding: '16px 20px',
                      border: '1.5px solid #f1f5f9',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      gap: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                    }}
                    className="hover-scale-mini"
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = school.primary_color || '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.03)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#f1f5f9';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.01)';
                    }}
                  >
                    {/* Brand Icon / Logo & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: `linear-gradient(135deg, ${school.primary_color || '#3b82f6'} 0%, ${school.primary_color ? school.primary_color + 'dd' : '#1d4ed8'} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        color: '#ffffff',
                        fontSize: '1.1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {school.logo_url ? (
                          <img src={school.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          school.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {school.name}
                        </div>
                        {(school.zip_code || school.city) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                            <MapPin size={12} color="#94a3b8" />
                            <span>{school.zip_code || ''} {school.city || ''}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#8e8e93', fontFamily: 'monospace' }}>
                            {school.id.substring(0, 8)}...
                          </span>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#d1d1d6' }}></span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8e8e93' }}>
                            {teachers} L • {students} S • {bands} B{school.limits_enabled && ' • ⚖️ Limits'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {school.has_campus_subscription && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0071e3', background: '#0071e310', padding: '2px 8px', borderRadius: '100px' }}>
                              🎓 Campus
                            </span>
                          )}
                          {school.has_groovelab_subscription && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ff9500', background: '#ff950010', padding: '2px 8px', borderRadius: '100px' }}>
                              🎸 GrooveLab
                            </span>
                          )}
                          {school.subscription_bypass && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ff3b30', background: '#ff3b3010', padding: '2px 8px', borderRadius: '100px', border: '1px dashed #ff3b3030' }}>
                              ⚙️ Bypass
                            </span>
                          )}
                          {!school.has_campus_subscription && !school.has_groovelab_subscription && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8e8e93', background: '#8e8e9310', padding: '2px 8px', borderRadius: '100px' }}>
                              Kein Abo
                            </span>
                          )}
                        </div>
                        {school.limits_enabled && (
                          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {[
                              { label: 'Lehrer', cur: teachers, max: school.max_teachers ?? 2, color: '#3b82f6' },
                              { label: 'Schüler', cur: students, max: school.max_students ?? 6, color: '#22c55e' },
                              { label: 'Songs', cur: songs, max: school.max_songs ?? 5, color: '#eab308' }
                            ].map((item, i) => {
                              const pct = Math.min(100, (item.cur / item.max) * 100);
                              const isClose = pct >= 90;
                              const barColor = isClose ? '#ef4444' : item.color;
                              return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '90px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: isClose ? '#ef4444' : '#8e8e93' }}>
                                    <span>{item.label}</span>
                                    <span>{item.cur}/{item.max}</span>
                                  </div>
                                  <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions & Toggles */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {/* iOS Style Toggle Pause */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSchoolPause(school.id, school.is_paused);
                        }}
                        style={{
                          position: 'relative',
                          width: '42px',
                          height: '24px',
                          borderRadius: '12px',
                          background: school.is_paused ? '#e5e5ea' : '#34c759', // iOS Gray vs iOS Green
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0',
                          transition: 'background-color 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        title={school.is_paused ? 'Aktivieren' : 'Pausieren'}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                          transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          transform: school.is_paused ? 'translateX(2px)' : 'translateX(20px)'
                        }} />
                      </button>

                      {/* Pill Invite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyInviteLink(school.id, school.name, school.secretary_onboarding_token);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '100px',
                          background: copiedId === school.id ? '#34c75915' : '#f2f2f7',
                          border: 'none',
                          color: copiedId === school.id ? '#34c759' : '#0071e3', // iOS Green vs iOS Blue
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                        className="hover-scale-mini"
                      >
                        {copiedId === school.id ? (
                          <>
                            <Check size={13} /> Kopiert
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Einladung
                          </>
                        )}
                      </button>

                      {/* Trash Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSchool(school.id, school.name);
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '50%',
                          background: '#f2f2f7',
                          border: 'none',
                          color: '#ff3b30',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          width: '32px',
                          height: '32px'
                        }}
                        className="hover-scale-mini"
                        title="Schule löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Wrapper for Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Create School Form Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.015)'
          }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1d1d1f', letterSpacing: '-0.02em' }}>
              <Plus size={22} color="#eab308" /> Schule anlegen
            </h2>

            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Name der Schule *
                </label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="Musterschule"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#f5f5f7',
                    border: '1px solid transparent',
                    color: '#1d1d1f',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = '#f5f5f7';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: '#f5f5f7',
                      border: '1px solid transparent',
                      color: '#1d1d1f',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#eab308';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = '#f5f5f7';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: '#f5f5f7',
                      border: '1px solid transparent',
                      color: '#1d1d1f',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#eab308';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = '#f5f5f7';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Primäre Branding-Farbe
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newSchoolColor}
                    onChange={(e) => setNewSchoolColor(e.target.value)}
                    style={{
                      border: '1px solid rgba(0,0,0,0.08)',
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      padding: '4px'
                    }}
                  />
                  <input
                    type="text"
                    value={newSchoolColor}
                    onChange={(e) => setNewSchoolColor(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#f5f5f7',
                      border: '1px solid transparent',
                      color: '#1d1d1f',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#eab308';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = '#f5f5f7';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Logo URL (Optional)
                </label>
                <input
                  type="text"
                  value={newSchoolLogo}
                  onChange={(e) => setNewSchoolLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#f5f5f7',
                    border: '1px solid transparent',
                    color: '#1d1d1f',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = '#f5f5f7';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                style={{
                  marginTop: '10px',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(234, 179, 8, 0.2)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                className="hover-scale-mini"
              >
                {creating ? 'Wird angelegt...' : (
                  <>
                    <Plus size={18} /> Neue Schule provisionieren
                  </>
                )}
              </button>
            </form>

            {/* Guide Card (iOS Style Tip) */}
            <div style={{
              marginTop: '32px',
              padding: '20px',
              background: '#fdfaf2', // Soft warm yellow
              border: '1px solid rgba(234, 179, 8, 0.12)',
              borderRadius: '18px',
              fontSize: '0.85rem',
              color: '#92400e',
              lineHeight: '1.6'
            }}>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#b45309', fontWeight: 800 }}>
                💡 Wie erstelle ich einen Lehrer?
              </strong>
              1. Trage den Schulnamen ein und klicke auf "Provisionieren".
              <br />
              2. Kopiere den <strong>Einladungs-Link</strong> für die neu erstellte Schule.
              <br />
              3. Sende diesen Link an den Lehrer der Schule.
              <br />
              4. Der Lehrer klickt darauf, registriert sich selbst und die App verknüpft sein Profil automatisch als Admin/Lehrer dieser Schule!
            </div>
          </div>

          {/* Master Admin Credentials Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.015)'
          }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1d1d1f', letterSpacing: '-0.02em' }}>
              <Shield size={22} color="#eab308" /> Master-Admin Zugang
            </h2>

            <form onSubmit={handleUpdateAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Benutzername
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
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#f5f5f7',
                    border: '1px solid transparent',
                    color: '#1d1d1f',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                    setUsernameFocused(true);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = '#f5f5f7';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                    setUsernameFocused(false);
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Passwort
                </label>
                <input
                  type={passwordFocused ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="groovelab2026"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#f5f5f7',
                    border: '1px solid transparent',
                    color: '#1d1d1f',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234, 179, 8, 0.12)';
                    setPasswordFocused(true);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = '#f5f5f7';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                    setPasswordFocused(false);
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={updatingAdmin}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '14px',
                  background: '#1d1d1f', // iOS Solid Dark
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s'
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
                background: '#f5f5f7',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                border: '1px solid rgba(0,0,0,0.02)'
              }}>
                <strong style={{ fontSize: '0.8rem', color: '#8e8e93', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Master-Admin QR-Code
                </strong>
                <div style={{
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${adminUser.qr_token}`}
                    alt="Master Admin QR Badge"
                    style={{ width: '150px', height: '150px', display: 'block' }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#8e8e93', textAlign: 'center', lineHeight: '1.4', fontWeight: 600 }}>
                  Scanne diesen Code am Kiosk-Eingang für den sofortigen Zugang.
                </p>
                <div style={{ fontSize: '0.72rem', color: '#c7c7cc', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {adminUser.qr_token}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )}
      {/* School Edit Modal (Full-Screen Workspace - Light Mode) */}
      {selectedSchool && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#f8fafc',
            color: '#0f172a',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
            animation: 'fadeIn 0.25s ease-out forwards'
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(1.02); }
              to { opacity: 1; transform: scale(1); }
            }
          `}} />
          
          {/* Subtle colored background glows */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '20%',
            width: '600px',
            height: '600px',
            background: `radial-gradient(circle, ${editColor}08 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 1
          }} />

          {/* Premium Glass Header - Light Mode */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '20px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${editColor || '#3b82f6'} 0%, ${editColor ? editColor + 'cc' : '#1d4ed8'} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#ffffff',
                fontSize: '1.25rem',
                boxShadow: `0 8px 24px ${editColor ? editColor + '20' : 'rgba(59, 130, 246, 0.15)'}`,
                overflow: 'hidden'
              }}>
                {editLogo ? (
                  <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  editName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    {editName || selectedSchool.name}
                  </h2>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    background: editStatus === 'active' ? '#d1fae5' : '#fee2e2',
                    color: editStatus === 'active' ? '#065f46' : '#991b1b',
                    border: `1px solid ${editStatus === 'active' ? '#a7f3d0' : '#fecaca'}`
                  }}>
                    {editStatus === 'active' ? 'Aktiv' : 'Gesperrt'}
                  </span>
                  {editIsTrial && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a'
                    }}>
                      Probezeit
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Tenant ID: <span style={{ fontFamily: 'monospace', color: '#334155' }}>{selectedSchool.id}</span>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSelectedSchool(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveSchoolDetails}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  background: editColor || '#eab308',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: `0 8px 24px ${editColor ? editColor + '30' : 'rgba(234, 179, 8, 0.25)'}`,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
              >
                Änderungen speichern
              </button>
            </div>
          </div>

          {/* Workspace Layout */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 2
          }}>
            
            {/* Sidebar Control Panel - Light Mode */}
            <div style={{
              background: '#f1f5f9',
              borderRight: '1px solid #e2e8f0',
              padding: '40px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              overflowY: 'auto'
            }}>
              {/* Logo Brand Preview */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '24px',
                  background: '#f8fafc',
                  border: `3px solid ${editColor || '#3b82f6'}`,
                  boxShadow: `0 8px 30px ${editColor ? editColor + '15' : 'rgba(0,0,0,0.05)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  overflow: 'hidden'
                }}>
                  {editLogo ? (
                    <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '🏫'
                  )}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Branding Vorschau</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Wird in Apps & Portalen verwendet</p>
                </div>
              </div>

              {/* Statistics Overview */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Statistiken (Aktuell)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Lehrer (Campus)', value: schoolStats[selectedSchool.id]?.teachersCampus || 0, color: '#22c55e', icon: <GraduationCap size={14} /> },
                    { label: 'Lehrer (GrooveLab)', value: schoolStats[selectedSchool.id]?.teachersGroovelab || 0, color: '#eab308', icon: <Music size={14} /> },
                    { label: 'Schüler (Campus)', value: schoolStats[selectedSchool.id]?.studentsCampus || 0, color: '#22c55e', icon: <GraduationCap size={14} /> },
                    { label: 'Schüler (GrooveLab)', value: schoolStats[selectedSchool.id]?.studentsGroovelab || 0, color: '#eab308', icon: <Music size={14} /> }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderLeft: `4px solid ${stat.color}`,
                      borderRadius: '14px',
                      padding: '12px 16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: stat.color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          {stat.icon}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>{stat.label}</span>
                      </div>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '4px', display: 'block' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* School Status Settings */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  System-Status
                </h4>
                
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <button 
                    type="button"
                    onClick={() => setEditStatus('active')}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: 'none', 
                      fontSize: '0.85rem', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      transition: 'all 0.2s', 
                      background: editStatus === 'active' ? '#ffffff' : 'transparent', 
                      color: editStatus === 'active' ? '#10b981' : '#64748b',
                      boxShadow: editStatus === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Aktiviert
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditStatus('suspended')}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: 'none', 
                      fontSize: '0.85rem', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      transition: 'all 0.2s', 
                      background: editStatus === 'suspended' ? '#ffffff' : 'transparent', 
                      color: editStatus === 'suspended' ? '#ef4444' : '#64748b',
                      boxShadow: editStatus === 'suspended' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Gesperrt
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Probezeit Modus</span>
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
                      width: '42px',
                      height: '24px',
                      borderRadius: '12px',
                      background: editIsTrial ? '#eab308' : '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      transition: 'transform 0.2s',
                      transform: editIsTrial ? 'translateX(22px)' : 'translateX(2px)'
                    }} />
                  </button>
                </div>
              </div>

            </div>

            {/* Main Form Fields Grid Area */}
            <div style={{
              padding: '40px 48px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              background: '#f8fafc'
            }}>
              
              {/* Form Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                gap: '28px',
                alignItems: 'start'
              }}>

                {/* Box 1: Stammdaten & Brand */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Settings size={20} color={editColor || '#3b82f6'} /> Identität & Marke
                  </h3>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Schulname
                    </label>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = editColor || '#3b82f6';
                        e.currentTarget.style.boxShadow = `0 0 0 4px ${editColor}15`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        PLZ
                      </label>
                      <input 
                        type="text" 
                        value={editZipCode} 
                        onChange={(e) => setEditZipCode(e.target.value)} 
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = editColor || '#3b82f6';
                          e.currentTarget.style.boxShadow = `0 0 0 4px ${editColor}15`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ort
                      </label>
                      <input 
                        type="text" 
                        value={editCity} 
                        onChange={(e) => setEditCity(e.target.value)} 
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = editColor || '#3b82f6';
                          e.currentTarget.style.boxShadow = `0 0 0 4px ${editColor}15`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Branding Farbe
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={editColor} 
                        onChange={(e) => setEditColor(e.target.value)} 
                        style={{ width: '48px', height: '48px', padding: '2px', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', background: 'transparent' }} 
                      />
                      <input 
                        type="text" 
                        value={editColor} 
                        onChange={(e) => setEditColor(e.target.value)} 
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          color: '#0f172a',
                          fontWeight: 700,
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = editColor || '#3b82f6';
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Logo URL
                    </label>
                    <input 
                      type="text" 
                      value={editLogo} 
                      onChange={(e) => setEditLogo(e.target.value)} 
                      placeholder="https://..." 
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = editColor || '#3b82f6';
                      }}
                    />
                  </div>
                </div>

                {/* Box 2: Abonnements & Lizenzen */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={20} color="#eab308" /> Abonnements & Lizenzen
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Campus Abo */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: editHasCampus ? '#f0f9ff' : '#ffffff',
                      border: `1.5px solid ${editHasCampus ? '#bae6fd' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: editHasCampus ? '#0369a1' : '#0f172a' }}>🎓 Campus-Abonnement</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Zugang zur Campus-Plattform (Lehrer, Schüler, Klassen)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editHasCampus}
                        onChange={(e) => setEditHasCampus(e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#0071e3', cursor: 'pointer' }}
                      />
                    </label>

                    {/* GrooveLab Abo */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: editHasGroovelab ? '#fff7ed' : '#ffffff',
                      border: `1.5px solid ${editHasGroovelab ? '#ffedd5' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: editHasGroovelab ? '#c2410c' : '#0f172a' }}>🎸 GrooveLab-Abonnement</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Zugang zur Kiosk-Hardware & Proberaumsteuerung</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editHasGroovelab}
                        onChange={(e) => setEditHasGroovelab(e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#ff9500', cursor: 'pointer' }}
                      />
                    </label>

                    {/* Bypass Switch */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: editSubscriptionBypass ? '#fef2f2' : '#ffffff',
                      border: `1.5px solid ${editSubscriptionBypass ? '#fecaca' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: editSubscriptionBypass ? '#dc2626' : '#ef4444' }}>⚙️ Abo-Bypass aktivieren</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Schaltet alle Features bedingungslos für Testläufe frei</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editSubscriptionBypass}
                        onChange={(e) => setEditSubscriptionBypass(e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                </div>

                {/* Box 3: Zugang & Fristen */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={20} color="#10b981" /> Zugang & Fristen
                  </h3>

                  {editIsTrial ? (
                    <div style={{
                      background: '#fffdf5',
                      padding: '24px',
                      borderRadius: '16px',
                      border: '1px solid #fef3c7',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', fontWeight: 800, marginBottom: '8px' }}>
                          ⏳ Probezeit Laufzeit
                        </label>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
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
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: editTrialOption === opt.value ? '#ffffff' : 'transparent',
                                color: editTrialOption === opt.value ? '#d97706' : '#64748b',
                                boxShadow: editTrialOption === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', fontWeight: 800, marginBottom: '8px' }}>
                          Enddatum Probezeit
                        </label>
                        {editTrialOption === 'custom' ? (
                          <input
                            type="text"
                            placeholder="TT.MM.JJJJ oder YYYY-MM-DD"
                            value={editTrialEndsAt}
                            onChange={(e) => setEditTrialEndsAt(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '12px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid #fcd34d',
                              outline: 'none',
                              background: '#ffffff',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: '#0f172a'
                            }}
                          />
                        ) : (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#fdfbf7',
                            border: '1px solid #fef3c7',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#b45309'
                          }}>
                            {formatDateDisplay(editTrialEndsAt) || 'Kein Datum berechnet'}
                          </div>
                        )}
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#b45309', opacity: 0.8 }}>
                          Der Systemzugang erlischt nach diesem Tag automatisch.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Vertragslaufzeit bis (Optional)
                      </label>
                      <input 
                        type="text" 
                        placeholder="TT.MM.JJJJ oder YYYY-MM-DD" 
                        value={editContractEndsAt} 
                        onChange={(e) => setEditContractEndsAt(e.target.value)} 
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.95rem',
                          color: '#0f172a',
                          outline: 'none'
                        }} 
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* QR Code & Share Links */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🔗 Schule einbinden & Direkt-Login
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                   {/* Link 1: Secretary Invitation Link */}
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                       1. Einladungslink für Schule/Verwaltung
                     </label>
                     <div style={{ display: 'flex', gap: '10px' }}>
                       <input
                         readOnly
                         value={`${getSubdomainOrigin(selectedSchool.name)}/?invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || ''}`}
                         style={{
                           flex: 1,
                           padding: '12px 14px',
                           borderRadius: '10px',
                           border: '1px solid #cbd5e1',
                           background: '#f8fafc',
                           fontSize: '0.8rem',
                           fontFamily: 'monospace',
                           color: '#334155',
                           outline: 'none'
                         }}
                         onClick={(e) => (e.target as HTMLInputElement).select()}
                       />
                       <button
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(`${getSubdomainOrigin(selectedSchool.name)}/?invite_school_id=${selectedSchool.id}&role=secretary&token=${selectedSchool.secretary_onboarding_token || ''}`);
                           alert('Einladungslink kopiert!');
                         }}
                         style={{
                           background: '#f1f5f9',
                           color: '#334155',
                           border: '1px solid #cbd5e1',
                           borderRadius: '10px',
                           padding: '12px 16px',
                           fontSize: '0.82rem',
                           fontWeight: 800,
                           cursor: 'pointer',
                           transition: 'all 0.2s'
                         }}
                         onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                         onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                       >
                         Kopieren
                       </button>
                     </div>
                     <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                       Ermöglicht der Schule, das erste Administrator-Konto für die Verwaltung selbstständig zu registrieren.
                     </p>
                   </div>

                   {/* Link 2: Combined Subdomain QR Scanner Link */}
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                       2. Campus & GrooveLab Direkt-Link (QR-Scanner & Direkt-Login)
                     </label>
                     <div style={{ display: 'flex', gap: '10px' }}>
                       <input
                         readOnly
                         value={getSubdomainOrigin(selectedSchool.name)}
                         style={{
                           flex: 1,
                           padding: '12px 14px',
                           borderRadius: '10px',
                           border: '1px solid #cbd5e1',
                           background: '#f8fafc',
                           fontSize: '0.8rem',
                           fontFamily: 'monospace',
                           color: '#334155',
                           outline: 'none'
                         }}
                         onClick={(e) => (e.target as HTMLInputElement).select()}
                       />
                       <button
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(getSubdomainOrigin(selectedSchool.name));
                           alert('Direkt-Login Link kopiert!');
                         }}
                         style={{
                           background: '#f1f5f9',
                           color: '#334155',
                           border: '1px solid #cbd5e1',
                           borderRadius: '10px',
                           padding: '12px 16px',
                           fontSize: '0.82rem',
                           fontWeight: 800,
                           cursor: 'pointer',
                           transition: 'all 0.2s'
                         }}
                         onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                         onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                       >
                         Kopieren
                       </button>
                     </div>
                     <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                       Öffnet den Login-Scanner direkt über die individuelle Subdomain der Schule (sowohl für reguläre Geräte als auch für Kiosk-Terminals).
                     </p>
                   </div>
                 </div>
               </div>

              </div>
            </div>
          </div>
        )}

      {/* Global CSS injection for loading spinner */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
