import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, Plus, Copy, Check, Trash2, Users, Monitor, 
  MapPin, LogOut, RefreshCw, Layers, Award, Clock, Music,
  Edit2
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  created_at?: string;
  is_paused?: boolean;
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
  
  // Editing State
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editingSchoolName, setEditingSchoolName] = useState<string>('');

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

  const handleUpdateSchoolName = async (schoolId: string) => {
    if (!editingSchoolName.trim()) return;
    try {
      const { error } = await supabase
        .from('schools')
        .update({ name: editingSchoolName.trim() })
        .eq('id', schoolId);
      if (error) throw error;
      setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, name: editingSchoolName.trim() } : s));
      setEditingSchoolId(null);
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
      
      // 1. Fetch schools
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .order('name');
        
      if (schoolErr) throw schoolErr;
      setSchools(schoolData || []);

      // 2. Fetch all users for global stats
      const { data: users, error: userErr } = await supabase
        .from('users')
        .select('role');
        
      if (userErr) throw userErr;

      // 3. Fetch active sessions count
      const { count: sessionCount, error: sessionErr } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });
        
      if (sessionErr) throw sessionErr;

      const teachersCount = users?.filter(u => u.role === 'teacher' || u.role === 'admin').length || 0;
      const studentsCount = users?.filter(u => u.role === 'student').length || 0;

      setStats({
        totalSchools: schoolData?.length || 0,
        totalTeachers: teachersCount,
        totalStudents: studentsCount,
        totalSessions: sessionCount || 0
      });
      
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
          name: newSchoolName,
          primary_color: newSchoolColor,
          logo_url: newSchoolLogo || null
        })
        .select()
        .single();

      if (error) throw error;

      alert(`Erfolgreich! Die Schule "${data.name}" wurde angelegt.`);
      setNewSchoolName('');
      setNewSchoolColor('#3b82f6');
      setNewSchoolLogo('');
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1e293b',
      fontFamily: '"Outfit", "Inter", sans-serif',
      padding: '40px 20px'
    }}>
      {/* Premium Header Card */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 40px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '24px 32px',
        borderRadius: '24px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            padding: '12px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(234, 179, 8, 0.2)'
          }}>
            <Shield size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: '#1e293b' }}>
              GrooveLab Master Portal
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
              Globale Multi-Tenant Verwaltung & Schul-Provisionierung
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchSchoolsAndStats}
            style={{
              padding: '12px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <RefreshCw size={18} />
          </button>
          
          <button
            onClick={onLogout}
            style={{
              padding: '12px 20px',
              borderRadius: '14px',
              background: '#ef4444',
              border: 'none',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.15)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
          { title: 'Registrierte Schulen', value: stats.totalSchools, icon: <Layers size={22} />, color: '#eab308' },
          { title: 'Verknüpfte Lehrer', value: stats.totalTeachers, icon: <Users size={22} />, color: '#3b82f6' },
          { title: 'Aktive Schüler', value: stats.totalStudents, icon: <Award size={22} />, color: '#22c55e' },
          { title: 'Sitzungen im Labor', value: stats.totalSessions, icon: <Clock size={22} />, color: '#a855f7' }
        ].map((kpi, idx) => (
          <div key={idx} style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
                {kpi.title}
              </p>
              <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '8px 0 0 0', color: '#1e293b', letterSpacing: '-0.03em' }}>
                {kpi.value}
              </h3>
            </div>
            <div style={{
              background: `${kpi.color}10`,
              color: kpi.color,
              padding: '14px',
              borderRadius: '16px',
              border: `1.5px solid ${kpi.color}20`,
              boxShadow: `0 4px 12px ${kpi.color}08`
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
        
        {/* Left Side: Schools Table Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: '0 15px 35px rgba(0,0,0,0.03)',
          minHeight: '400px'
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
            <Layers size={22} color="#eab308" /> Schulen & Tenants
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}>
              <div className="loader" style={{
                border: '4px solid rgba(0,0,0,0.05)',
                borderLeftColor: '#eab308',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Lade Schulregister...</p>
            </div>
          ) : schools.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontWeight: 500 }}>
              Keine Schulen im System registriert. Lege rechts deine erste Schule an!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schule</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Color</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lehrer Einladen</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.2s',
                    }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: school.primary_color || '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '1.1rem',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                          }}>
                            {school.name.substring(0, 2).toUpperCase()}
                          </div>
                          {editingSchoolId === school.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                              <input
                                type="text"
                                value={editingSchoolName}
                                onChange={(e) => setEditingSchoolName(e.target.value)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #eab308',
                                  fontSize: '0.9rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                                autoFocus
                              />
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {school.id}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                                {school.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                                {school.id}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: school.primary_color,
                            border: '1.5px solid rgba(0,0,0,0.05)'
                          }}></div>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{school.primary_color}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSchoolPause(school.id, school.is_paused)}
                            style={{
                              position: 'relative',
                              width: '46px',
                              height: '24px',
                              borderRadius: '12px',
                              background: school.is_paused ? '#cbd5e1' : '#22c55e',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0',
                              transition: 'background-color 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'transform 0.2s ease',
                              transform: school.is_paused ? 'translateX(3px)' : 'translateX(25px)'
                            }} />
                          </button>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: school.is_paused ? '#64748b' : '#22c55e',
                            minWidth: '55px'
                          }}>
                            {school.is_paused ? 'Pausiert' : 'Aktiv'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => copyInviteLink(school.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: copiedId === school.id ? '#22c55e10' : '#ffffff',
                            border: `1.5px solid ${copiedId === school.id ? '#22c55e40' : '#e2e8f0'}`,
                            color: copiedId === school.id ? '#22c55e' : '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.01)',
                            transition: 'all 0.25s'
                          }}
                          onMouseEnter={(e) => {
                            if (copiedId !== school.id) {
                              e.currentTarget.style.background = '#fef9c3';
                              e.currentTarget.style.borderColor = '#fef08a';
                              e.currentTarget.style.color = '#ca8a04';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (copiedId !== school.id) {
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.color = '#475569';
                            }
                          }}
                        >
                          {copiedId === school.id ? (
                            <>
                              <Check size={14} /> Kopiert!
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Einladungs-Link
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {editingSchoolId === school.id ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleUpdateSchoolName(school.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#22c55e',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => setEditingSchoolId(null)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#e2e8f0',
                                color: '#475569',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Abbrechen
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setEditingSchoolId(school.id);
                                setEditingSchoolName(school.name);
                              }}
                              style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ca8a04'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteSchool(school.id, school.name)}
                              style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Wrapper for both cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Right Side: Create School Form Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <Plus size={22} color="#eab308" /> Schule anlegen
            </h2>

            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Name der Schule *
                </label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="z.B. Musäk Bad Säckingen"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234, 179, 8, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Primäre Branding-Farbe
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newSchoolColor}
                    onChange={(e) => setNewSchoolColor(e.target.value)}
                    style={{
                      border: '1.5px solid #e2e8f0',
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
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
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      color: '#1e293b',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#eab308'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#eab308'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                style={{
                  marginTop: '10px',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #eab308 0%, #d97706 100%)',
                  border: 'none',
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(234, 179, 8, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(234, 179, 8, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 179, 8, 0.25)';
                }}
              >
                {creating ? 'Wird angelegt...' : (
                  <>
                    <Plus size={18} /> Neue Schule provisionieren
                  </>
                )}
              </button>
            </form>

            {/* User Guide Card */}
            <div style={{
              marginTop: '32px',
              padding: '20px',
              background: 'rgba(234, 179, 8, 0.04)',
              border: '1px solid rgba(234, 179, 8, 0.15)',
              borderRadius: '16px',
              fontSize: '0.85rem',
              color: '#b45309',
              lineHeight: '1.6',
              boxShadow: '0 2px 8px rgba(234, 179, 8, 0.01)'
            }}>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ca8a04', fontWeight: 800 }}>
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

          {/* Right Side: Master Admin Credentials Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <Shield size={22} color="#eab308" /> Master-Admin Zugang
            </h2>

            <form onSubmit={handleUpdateAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234, 179, 8, 0.15)';
                    setUsernameFocused(true);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                    setUsernameFocused(false);
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234, 179, 8, 0.15)';
                    setPasswordFocused(true);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
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
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.15)';
                }}
              >
                {updatingAdmin ? 'Wird gespeichert...' : 'Zugangsdaten speichern'}
              </button>
            </form>

            {adminUser && (
              <div style={{
                marginTop: '28px',
                padding: '24px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
              }}>
                <strong style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Master-Admin QR-Code
                </strong>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${adminUser.qr_token}`}
                  alt="Master Admin QR Badge"
                  style={{ width: '160px', height: '160px', borderRadius: '12px', border: '1px solid #f1f5f9' }}
                />
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center', lineHeight: '1.4', fontWeight: 600 }}>
                  Scanne diesen Code am Kiosk-Eingang für den sofortigen Zugang.
                </p>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {adminUser.qr_token}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
      
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
