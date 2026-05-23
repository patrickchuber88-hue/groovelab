import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, Plus, Copy, Check, Trash2, Users, Monitor, 
  MapPin, LogOut, RefreshCw, Layers, Award, Clock, Music,
  Edit2, Settings, Sliders, Search
} from 'lucide-react';

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
  const [schoolStats, setSchoolStats] = useState<Record<string, { teachers: number, students: number, songs: number, bands: number }>>({});
  
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
        city: editCity.trim() || null
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
        supabase.from('users').select('role, school_id'),
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

      const sStats: Record<string, { teachers: number, students: number, songs: number, bands: number }> = {};
      schoolData?.forEach(school => {
        sStats[school.id] = {
          teachers: users?.filter(u => u.school_id === school.id && (u.role === 'teacher' || u.role === 'admin')).length || 0,
          students: users?.filter(u => u.school_id === school.id && u.role === 'student').length || 0,
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


  const copyInviteLink = (schoolId: string) => {
    const inviteUrl = `${window.location.origin}?invite_school_id=${schoolId}&role=teacher`;
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
                        onClick={() => handleToggleSchoolPause(school.id, school.is_paused)}
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
                        onClick={() => copyInviteLink(school.id)}
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
                        onClick={() => handleDeleteSchool(school.id, school.name)}
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
      
      {/* School Edit Modal (iOS Slide-in Sheet style) */}
      {selectedSchool && (
        <>
          <div 
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9998,
              transition: 'all 0.3s ease'
            }}
            onClick={() => setSelectedSchool(null)}
          />
          <div 
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: '45vw', minWidth: '550px',
              background: '#f5f5f7', // iOS background
              zIndex: 9999,
              boxShadow: '-10px 0 40px rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              borderRadius: '24px 0 0 24px',
              overflow: 'hidden'
            }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}} />
            
            {/* Hero Header */}
            <div style={{
              position: 'relative',
              background: editColor || '#3b82f6',
              padding: '48px 36px 64px',
              color: '#ffffff'
            }}>
              <button 
                onClick={() => setSelectedSchool(null)}
                style={{ 
                  position: 'absolute', top: '20px', right: '20px', 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', cursor: 'pointer', 
                  color: '#ffffff', width: '36px', height: '36px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                  fontSize: '1.25rem',
                  fontWeight: 600
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
              
              <h2 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                {selectedSchool.name}
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.95, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {editStatus === 'active' ? '🟢 Aktiv' : '🔴 Gesperrt (Bypass)'} {editIsTrial ? ' • ⏳ Probezeit' : ''}
              </p>
            </div>

            {/* Logo Avatar overlapping */}
            <div style={{ padding: '0 36px', marginTop: '-40px', position: 'relative', zIndex: 10 }}>
              <div style={{
                width: '80px', height: '80px', 
                background: '#ffffff', borderRadius: '22px', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px', border: '3px solid #f5f5f7',
                overflow: 'hidden'
              }}>
                {editLogo ? (
                  <img src={editLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '2.25rem' }}>🏫</span>
                )}
              </div>
            </div>

            {/* Scrollable Content (Grouped Settings) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px 36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Stats Grid Container (Grouped) */}
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {[
                  { label: 'Lehrer', value: schoolStats[selectedSchool.id]?.teachers || 0 },
                  { label: 'Schüler', value: schoolStats[selectedSchool.id]?.students || 0 },
                  { label: 'Bands', value: schoolStats[selectedSchool.id]?.bands || 0 },
                  { label: 'Songs', value: schoolStats[selectedSchool.id]?.songs || 0 }
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '10px 4px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d1d1f', marginTop: '4px', letterSpacing: '-0.02em' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Group 1: General Info */}
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
                  <Settings size={18} color={editColor || '#3b82f6'} /> Identität & Marke
                </h3>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name der Schule</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f', outline: 'none' }} 
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PLZ</label>
                    <input 
                      type="text" 
                      value={editZipCode} 
                      onChange={(e) => setEditZipCode(e.target.value)} 
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f', outline: 'none' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ort</label>
                    <input 
                      type="text" 
                      value={editCity} 
                      onChange={(e) => setEditCity(e.target.value)} 
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f', outline: 'none' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hauptfarbe</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: '42px', height: '42px', padding: 0, border: 'none', borderRadius: '10px', cursor: 'pointer' }} />
                      <input type="text" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo URL</label>
                    <input type="text" value={editLogo} onChange={(e) => setEditLogo(e.target.value)} placeholder="https://..." style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Group 2: Status & Contracts */}
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
                    <Shield size={18} color={editColor || '#3b82f6'} /> Zugang & Verträge
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', color: '#48484a', background: '#f2f2f7', padding: '6px 12px', borderRadius: '100px' }}>
                    <input 
                      type="checkbox" 
                      checked={editIsTrial} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditIsTrial(checked);
                        if (checked && !editTrialEndsAt) {
                          setEditTrialOption('14');
                          setEditTrialEndsAt(getFutureDate(14));
                        }
                      }} 
                      style={{ width: '15px', height: '15px', accentColor: editColor || '#3b82f6' }} 
                    />
                    Probezeit aktiv
                  </label>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schul-Zugang (Login)</label>
                  {/* Segmented Control */}
                  <div style={{ display: 'flex', background: '#f2f2f7', padding: '4px', borderRadius: '10px' }}>
                    <button 
                      type="button"
                      onClick={() => setEditStatus('active')}
                      style={{ 
                        flex: 1, 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        fontSize: '0.85rem', 
                        fontWeight: 800, 
                        cursor: 'pointer', 
                        transition: 'all 0.15s ease', 
                        background: editStatus === 'active' ? '#ffffff' : 'transparent', 
                        color: editStatus === 'active' ? '#34c759' : '#8e8e93', 
                        boxShadow: editStatus === 'active' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' 
                      }}
                    >
                      Aktiviert
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditStatus('suspended')}
                      style={{ 
                        flex: 1, 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        fontSize: '0.85rem', 
                        fontWeight: 800, 
                        cursor: 'pointer', 
                        transition: 'all 0.15s ease', 
                        background: editStatus === 'suspended' ? '#ffffff' : 'transparent', 
                        color: editStatus === 'suspended' ? '#ff3b30' : '#8e8e93', 
                        boxShadow: editStatus === 'suspended' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' 
                      }}
                    >
                      Gesperrt
                    </button>
                  </div>
                </div>

                {editIsTrial ? (
                  <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#b45309', fontWeight: 800, marginBottom: '8px' }}>⏳ Probezeit Dauer</label>
                      <div style={{ display: 'flex', background: '#fef3c7', padding: '3px', borderRadius: '8px' }}>
                        {[
                          { label: '14 Tage', value: '14' },
                          { label: '30 Tage', value: '30' },
                          { label: 'Benutzerdefiniert', value: 'custom' }
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
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              background: editTrialOption === opt.value ? '#ffffff' : 'transparent',
                              color: editTrialOption === opt.value ? '#b45309' : '#d97706',
                              boxShadow: editTrialOption === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#b45309', fontWeight: 800, marginBottom: '6px' }}>
                        {editTrialOption === 'custom' ? 'Probezeit Enddatum' : 'Berechnetes Enddatum'}
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
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #fcd34d',
                            outline: 'none',
                            background: '#fff',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#1d1d1f'
                          }}
                        />
                      ) : (
                        <div style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.5)',
                          border: '1.5px solid rgba(252, 211, 77, 0.5)',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#b45309'
                        }}>
                          {formatDateDisplay(editTrialEndsAt) || 'Kein Datum berechnet'}
                        </div>
                      )}
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                        Logins werden nach diesem Tag automatisch verweigert.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vertragslaufzeit bis (Optional)</label>
                    <input type="text" placeholder="TT.MM.JJJJ oder YYYY-MM-DD" value={editContractEndsAt} onChange={(e) => setEditContractEndsAt(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                )}
              </div>

              {/* Group 3: Limits */}
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                opacity: editLimitsEnabled ? 1 : 0.8,
                transition: 'opacity 0.25s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
                    <Sliders size={18} color={editColor || '#3b82f6'} /> Kontingente (Limits)
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', color: '#48484a', background: '#f2f2f7', padding: '6px 12px', borderRadius: '100px' }}>
                    <input type="checkbox" checked={editLimitsEnabled} onChange={(e) => setEditLimitsEnabled(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: editColor || '#3b82f6' }} />
                    Limits aktivieren
                  </label>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px',
                  opacity: editLimitsEnabled ? 1 : 0.45,
                  pointerEvents: editLimitsEnabled ? 'auto' : 'none',
                  transition: 'all 0.25s ease'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Max Lehrer</label>
                    <input type="number" min="0" disabled={!editLimitsEnabled} value={editMaxTeachers} onChange={(e) => setEditMaxTeachers(parseInt(e.target.value) || 0)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', background: editLimitsEnabled ? '#ffffff' : '#f5f5f7' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Max Schüler</label>
                    <input type="number" min="0" disabled={!editLimitsEnabled} value={editMaxStudents} onChange={(e) => setEditMaxStudents(parseInt(e.target.value) || 0)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', background: editLimitsEnabled ? '#ffffff' : '#f5f5f7' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#8e8e93', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Max Songs</label>
                    <input type="number" min="0" disabled={!editLimitsEnabled} value={editMaxSongs} onChange={(e) => setEditMaxSongs(parseInt(e.target.value) || 0)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', background: editLimitsEnabled ? '#ffffff' : '#f5f5f7' }} />
                  </div>
                </div>
              </div>

            </div>

            {/* Actions (Sticky Footer) */}
            <div style={{ padding: '20px 36px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#ffffff', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedSchool(null)}
                style={{
                  padding: '12px 24px', borderRadius: '12px', background: '#e5e5ea', color: '#48484a', border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d1d1d6'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e5e5ea'}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveSchoolDetails}
                style={{
                  padding: '12px 32px', borderRadius: '12px', background: editColor || '#0071e3', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 8px 20px ${editColor ? editColor+'30' : 'rgba(0,113,227,0.25)'}`, transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                Sichern
              </button>
            </div>
          </div>
        </>
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
