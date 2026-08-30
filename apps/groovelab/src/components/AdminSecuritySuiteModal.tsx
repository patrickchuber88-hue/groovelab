import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Smartphone, Lock, RefreshCw, X, AlertTriangle, 
  CheckCircle, Trash2, Shield, Key, Search, UserCheck, Check
} from 'lucide-react';
import { 
  fetchSchoolSecurityOverview, 
  revokeClientSessionLease, 
  revokeAllSessionsForUser, 
  revokeAndRegenerateQRToken 
} from '../utils/sessionLeaseManager';
import { supabase } from '../lib/supabase';

interface AdminSecuritySuiteModalProps {
  schoolId: string;
  onClose: () => void;
}

export const AdminSecuritySuiteModal: React.FC<AdminSecuritySuiteModalProps> = ({ schoolId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'rate_limits' | 'token_revocation'>('devices');
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Token Revocation search state
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [revokedSuccessUser, setRevokedSuccessUser] = useState<string | null>(null);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const data = await fetchSchoolSecurityOverview(schoolId);
      setOverview(data);
    } catch (err) {
      console.error('Error loading security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      loadSecurityData();
    }
  }, [schoolId]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRevokeSingleDevice = async (leaseId: string) => {
    try {
      setActionLoading(leaseId);
      const success = await revokeClientSessionLease(leaseId);
      if (success) {
        showToast('Gerätesitzung erfolgreich widerrufen. Das Gerät wurde abgemeldet.');
        await loadSecurityData();
      } else {
        showToast('Fehler beim Widerrufen der Gerätesitzung.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Widerrufen.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllUserDevices = async (userId: string, userName: string) => {
    try {
      setActionLoading(`user_${userId}`);
      const count = await revokeAllSessionsForUser(userId);
      showToast(`Alle aktiven Sitzungen für ${userName} wurden beendet (${count} Geräte).`);
      await loadSecurityData();
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Beenden der Sitzungen.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Search users for token re-issuance
  useEffect(() => {
    if (activeTab === 'token_revocation' && schoolId) {
      const searchUsers = async () => {
        setLoadingStudents(true);
        try {
          let query = supabase
            .from('users')
            .select('id, first_name, last_name, role, instrument, qr_token')
            .eq('school_id', schoolId)
            .limit(20);

          if (searchTerm.trim()) {
            query = query.ilike('first_name', `%${searchTerm.trim()}%`);
          }

          const { data, error } = await query;
          if (!error && data) {
            setStudents(data);
          }
        } catch (e) {
          console.error('Error searching students:', e);
        } finally {
          setLoadingStudents(false);
        }
      };

      const timer = setTimeout(searchUsers, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, schoolId, searchTerm]);

  const handleRegenerateUserBadge = async (userId: string, userName: string) => {
    try {
      setActionLoading(`token_${userId}`);
      const result = await revokeAndRegenerateQRToken(userId);
      if (result?.success) {
        setRevokedSuccessUser(userId);
        showToast(`Ausweis für ${userName} sofort gesperrt und neu generiert! Alle alten Sitzungen wurden terminiert.`);
        await loadSecurityData();
      } else {
        showToast('Fehler bei der Neuausstellung des Ausweises.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Ausstellen.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const primaryRed = '#ea4335';
  const lightRedBg = '#fce8e6';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: lightRedBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: primaryRed
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Sicherheits- & Geräte-Zentrale
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                Zero-Trust Session Leases, Remote-Logout & Ausweis-Sofortsperre
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: 'none',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'background 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setActiveTab('devices')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'devices' ? primaryRed : 'transparent',
              color: activeTab === 'devices' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s'
            }}
          >
            <Smartphone size={14} /> Gekoppelte Geräte ({overview?.total_tracked_devices || 0})
          </button>

          <button
            onClick={() => setActiveTab('rate_limits')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'rate_limits' ? primaryRed : 'transparent',
              color: activeTab === 'rate_limits' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s'
            }}
          >
            <Lock size={14} /> Brute-Force Schutz
          </button>

          <button
            onClick={() => setActiveTab('token_revocation')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'token_revocation' ? primaryRed : 'transparent',
              color: activeTab === 'token_revocation' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={14} /> Ausweis-Sofortsperre
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          background: '#ffffff'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sicherheits-Status wird geladen...</div>
            </div>
          ) : (
            <>
              {/* TAB 1: CONNECTED DEVICES */}
              {activeTab === 'devices' && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                      Alle aktiven Geräte und Kiosk-Terminals dieser Musikschule:
                    </span>
                    <button
                      onClick={loadSecurityData}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: primaryRed,
                        fontSize: '0.76rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={12} /> Aktualisieren
                    </button>
                  </div>

                  {(!overview?.active_devices || overview.active_devices.length === 0) ? (
                    <div style={{
                      padding: '32px 16px',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.85rem'
                    }}>
                      Aktuell sind keine registrierten Gerätesitzungen hinterlegt.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {overview.active_devices.map((device: any) => (
                        <div
                          key={device.id}
                          style={{
                            padding: '14px 16px',
                            background: device.is_revoked ? '#f8fafc' : '#ffffff',
                            border: device.is_revoked ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            opacity: device.is_revoked ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: device.is_revoked ? '#e2e8f0' : lightRedBg,
                              color: device.is_revoked ? '#94a3b8' : primaryRed,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Smartphone size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                                  {device.user_name}
                                </span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: device.role === 'admin' ? '#fee2e2' : '#f1f5f9',
                                  color: device.role === 'admin' ? '#dc2626' : '#475569'
                                }}>
                                  {device.role === 'admin' ? 'Schulleitung' : device.role === 'teacher' ? 'Lehrkraft' : 'Schüler'}
                                </span>
                                {device.is_revoked && (
                                  <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>
                                    Abgemeldet
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                {device.device_name} • Zuletzt aktiv: {new Date(device.last_active_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>

                          {!device.is_revoked && (
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleRevokeSingleDevice(device.id)}
                                disabled={actionLoading === device.id}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#dc2626',
                                  fontSize: '0.74rem',
                                  fontWeight: 750,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s'
                                }}
                              >
                                {actionLoading === device.id ? 'Wird getrennt...' : 'Remote abmelden'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BRUTE-FORCE RATE LIMITS */}
              {activeTab === 'rate_limits' && (
                <div>
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <ShieldCheck size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                      <strong>Aktiver Schutz gegen Skript- und Brute-Force-Angriffe:</strong><br />
                      Falsche PIN-Eingaben werden serverseitig in PostgreSQL nach 5 Fehlversuchen für jeweils 60 Sekunden hart blockiert.
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginTop: '16px'
                  }}>
                    <div style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Aktuell aktive IP-/PIN-Sperren</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: overview?.blocked_attempts_count ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
                        {overview?.blocked_attempts_count || 0}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        {overview?.blocked_attempts_count ? 'Verdächtige Zugriffe blockiert' : 'Keine verdächtigen Angriffe aktiv'}
                      </div>
                    </div>

                    <div style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CSPRNG-Entropie</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                        128-Bit
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        Mathematisch unerratbare UUIDv4 Tokens
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TOKEN REVOCATION (LOST BADGE) */}
              {activeTab === 'token_revocation' && (
                <div>
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '16px'
                  }}>
                    <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.4 }}>
                      <strong>Ausweis verloren?</strong> Hier kannst du verlorene QR-Ausweise sofort sperren. Der alte Token wird augenblicklich ungültig und alle verbundenen Geräte werden abgemeldet.
                    </div>
                  </div>

                  {/* Search bar */}
                  <div style={{ marginBottom: '14px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Schüler oder Lehrkraft suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 36px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {loadingStudents ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      Suche läuft...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {students.map((user: any) => (
                        <div
                          key={user.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                              {user.first_name} {user.last_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                              {user.role === 'teacher' ? 'Lehrkraft' : 'Schüler'} {user.instrument ? `• ${user.instrument}` : ''}
                            </div>
                          </div>

                          <button
                            onClick={() => handleRegenerateUserBadge(user.id, `${user.first_name} ${user.last_name}`)}
                            disabled={actionLoading === `token_${user.id}`}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              background: revokedSuccessUser === user.id ? '#16a34a' : primaryRed,
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'background 0.2s'
                            }}
                          >
                            {actionLoading === `token_${user.id}` ? (
                              'Wird neu generiert...'
                            ) : revokedSuccessUser === user.id ? (
                              <>Ausweis neu ausgestellt <Check size={13} /></>
                            ) : (
                              <>Ausweis sperren & neu ausstellen <RefreshCw size={12} /></>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Toast Message */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toastMessage.type === 'success' ? '#0f172a' : '#dc2626',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <CheckCircle size={15} />
            {toastMessage.text}
          </div>
        )}
      </div>
    </div>
  );
};
