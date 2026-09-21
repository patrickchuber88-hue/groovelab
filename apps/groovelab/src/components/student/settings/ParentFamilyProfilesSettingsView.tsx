import React, { useState, useEffect } from 'react';
import { Users, QrCode, X, ShieldCheck, Smartphone, Laptop, Tablet, LogOut, RefreshCw, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { getInstrumentAvatarUrl, resolveCampusStudentAvatar, STUDENT_AVATARS } from '../studentAvatars.constants';
import { fetchActiveUserSessionLeases, revokeClientSessionLease, revokeAllSessionsForUser, UserSessionLease } from '../../../utils/sessionLeaseManager';
import { scrubSharedDeviceCache } from '../../../utils/sharedDeviceScrubber';

export interface ParentFamilyProfilesSettingsViewProps {
  familyProfiles: any[];
  studentId: string;
  studentUser: any;
  handleSwitchFamilyStudent: (studentId: string) => void;
  handleRemoveFamilyProfile: (profileId: string, e: React.MouseEvent) => void;
  setIsAddSiblingModalOpen: (open: boolean) => void;
}

export const ParentFamilyProfilesSettingsView: React.FC<ParentFamilyProfilesSettingsViewProps> = ({
  familyProfiles,
  studentId,
  studentUser,
  handleSwitchFamilyStudent,
  handleRemoveFamilyProfile,
  setIsAddSiblingModalOpen,
}) => {
  const [sessionLeases, setSessionLeases] = useState<UserSessionLease[]>([]);
  const [isLoadingLeases, setIsLoadingLeases] = useState<boolean>(false);
  const [isRevokingAll, setIsRevokingAll] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubSuccessMessage, setScrubSuccessMessage] = useState<string | null>(null);

  const handleScrubDevice = async () => {
    setIsScrubbing(true);
    setScrubSuccessMessage(null);
    try {
      const result = await scrubSharedDeviceCache();
      setScrubSuccessMessage(`Säuberung abgeschlossen: ${result.purgedCachesCount} Cache(s) und ${result.purgedStorageKeysCount} Speicher-Einträge restlos entfernt.`);
      setTimeout(() => setScrubSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error scrubbing device:', err);
    } finally {
      setIsScrubbing(false);
    }
  };

  const loadSessions = async () => {
    if (!studentId) return;
    setIsLoadingLeases(true);
    try {
      const leases = await fetchActiveUserSessionLeases(studentId);
      setSessionLeases(leases);
    } catch (err) {
      console.warn('Failed to load session leases:', err);
    } finally {
      setIsLoadingLeases(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [studentId]);

  const handleRevokeSingle = async (leaseId: string) => {
    try {
      const ok = await revokeClientSessionLease(leaseId);
      if (ok) {
        setSessionLeases(prev => prev.filter(l => l.id !== leaseId));
      }
    } catch (err) {
      console.error('Error revoking session:', err);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!window.confirm('Möchtest du wirklich alle anderen Sitzungen auf Schul-Tablets und fremden Geräten beenden?')) {
      return;
    }
    setIsRevokingAll(true);
    try {
      await revokeAllSessionsForUser(studentId);
      await loadSessions();
    } catch (err) {
      console.error('Error revoking all sessions:', err);
    } finally {
      setIsRevokingAll(false);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Introduction Card */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        borderRadius: '22px',
        padding: '22px',
        border: '1.5px solid #bfdbfe',
        boxShadow: '0 4px 16px -2px rgba(2, 132, 199, 0.08)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            flexShrink: 0
          }}>
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Familien-Profile &amp; Geschwister
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
              Alle Kinder auf einem Gerät: Im Elternbereich wechselst du blitzschnell per Fingertipp – geschützt durch deine Eltern-PIN.
            </p>
          </div>
        </div>
      </div>

      {/* Family Profiles Grid Stage */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '22px 20px',
        borderRadius: '22px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <div style={{ fontSize: '0.90rem', fontWeight: 850, color: '#0f172a' }}>
          Verknüpfte Profile auf diesem Gerät ({familyProfiles.length})
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          gap: '18px', 
          flexWrap: 'wrap', 
          marginTop: '4px' 
        }}>
          {familyProfiles.map((member: any) => {
            const isCurrent = member.id === studentId;
            const targetMember = isCurrent && !member.instrument ? { ...member, instrument: studentUser?.instrument } : member;
            const defaultInstAvatar = resolveCampusStudentAvatar(targetMember);
            
            // Robust avatar URL resolution
            let avatarSrc = defaultInstAvatar;
            const rawPhoto = member.photo_url;
            if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() && rawPhoto !== '/campus_login_hero.png') {
              const p = rawPhoto.trim();
              if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:image/')) {
                avatarSrc = p;
              } else if (p.startsWith('/avatars/') || p.startsWith('/avatar_')) {
                avatarSrc = p;
              } else if (p.startsWith('/')) {
                avatarSrc = p;
              } else {
                const matched = STUDENT_AVATARS.find(a => a.id === p || a.url === p);
                if (matched) {
                  avatarSrc = matched.url;
                } else if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg')) {
                  avatarSrc = `/avatars/${p}`;
                }
              }
            }

            return (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '104px',
                  position: 'relative',
                  textAlign: 'center'
                }}
              >
                {/* Squircle Avatar Button */}
                <button
                  type="button"
                  onClick={() => !isCurrent && handleSwitchFamilyStudent(member.id)}
                  style={{
                    position: 'relative',
                    width: '76px',
                    height: '76px',
                    borderRadius: '22px',
                    padding: 0,
                    border: isCurrent ? '3.5px solid #0284c7' : '2.5px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: isCurrent ? 'default' : 'pointer',
                    boxShadow: isCurrent 
                      ? '0 8px 24px -4px rgba(2, 132, 199, 0.4), 0 2px 8px rgba(0,0,0,0.06)' 
                      : '0 4px 14px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className={!isCurrent ? "hover-scale" : undefined}
                  title={isCurrent ? `${member.first_name} (Aktives Profil)` : `Zu ${member.first_name} wechseln`}
                >
                  <img
                    src={avatarSrc}
                    alt={member.first_name || 'Schüler'}
                    onError={(e) => {
                      const img = e.currentTarget;
                      const fallback = resolveCampusStudentAvatar(targetMember);
                      if (img.src !== fallback && !img.src.endsWith(fallback)) {
                        img.src = fallback;
                      } else {
                        img.src = '/avatars/gitarre_avatar_new.png';
                      }
                    }}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      background: '#f1f5f9',
                      display: 'block'
                    }}
                  />
                  {isCurrent && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      border: '2px solid rgba(255,255,255,0.6)',
                      borderRadius: '18px',
                      pointerEvents: 'none'
                    }} />
                  )}
                </button>

                {/* Unlink Badge for non-current profiles */}
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFamilyProfile(member.id, e)}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '10px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#64748b',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      transition: 'all 0.15s ease',
                      zIndex: 2
                    }}
                    className="hover-scale"
                    title={`${member.first_name} von diesem Gerät entfernen`}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}

                {/* Profile Name */}
                <div style={{
                  fontSize: '0.86rem',
                  fontWeight: 850,
                  color: isCurrent ? '#0284c7' : '#0f172a',
                  marginTop: '8px',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2
                }}>
                  {member.first_name} {member.last_name ? member.last_name.trim().charAt(0) + '.' : ''}
                </div>

                {/* Status / Instrument Badge */}
                {isCurrent ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: '#0284c7',
                    background: '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    marginTop: '4px'
                  }}>
                    ● Aktiv
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 650,
                    color: '#64748b',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}>
                    {member.instrument || 'Schüler'}
                  </span>
                )}
              </div>
            );
          })}

          {/* Netflix-Style Iconic "+ Kind hinzufügen" Tile */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '104px',
            textAlign: 'center'
          }}>
            <button
              type="button"
              onClick={() => {
                setIsAddSiblingModalOpen(true);
              }}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '22px',
                border: '2px dashed #94a3b8',
                background: '#f8fafc',
                color: '#0284c7',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="hover-scale"
              title="Weiteres Kind per QR-Ausweis hinzufügen"
            >
              <QrCode size={26} color="#0284c7" />
            </button>

            <div style={{
              fontSize: '0.80rem',
              fontWeight: 850,
              color: '#0284c7',
              marginTop: '8px',
              lineHeight: 1.2
            }}>
              + Kind
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 650,
              color: '#94a3b8',
              marginTop: '2px'
            }}>
              QR-Scan
            </span>
          </div>
        </div>
      </div>

      {/* Active Devices & Rehearsal Room Sessions (Remote Session Kill) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '20px',
        borderRadius: '22px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tablet size={18} color="#0284c7" />
              <span>Angemeldete Geräte &amp; Proberäume</span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
              Übersicht aller Geräte, auf denen dieses Profil eingeloggt ist. Sitzungen können jederzeit mit einem Klick beendet werden.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSessions}
            disabled={isLoadingLeases}
            aria-label="Geräte aktualisieren"
            title="Geräte aktualisieren"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={15} style={{ animation: isLoadingLeases ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {sessionLeases.length === 0 ? (
          <div style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
            {isLoadingLeases ? 'Sitzungen werden geladen...' : 'Keine weiteren aktiven Sitzungen registriert.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionLeases.map((lease) => {
              const isTablet = lease.device_name.toLowerCase().includes('ipad') || lease.device_name.toLowerCase().includes('tablet');
              const isPhone = lease.device_name.toLowerCase().includes('iphone') || lease.device_name.toLowerCase().includes('android');

              return (
                <div
                  key={lease.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: lease.is_current ? '#f0fdf4' : '#f8fafc',
                    border: lease.is_current ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: lease.is_current ? '#dcfce7' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: lease.is_current ? '#16a34a' : '#64748b',
                      border: '1px solid rgba(0,0,0,0.06)'
                    }}>
                      {isTablet ? <Tablet size={17} /> : isPhone ? <Smartphone size={17} /> : <Laptop size={17} />}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{lease.device_name}</span>
                        {lease.is_current && (
                          <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '6px', background: '#22c55e', color: '#ffffff' }}>
                            Dieses Gerät
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                        Zuletzt aktiv: {new Date(lease.last_active_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                      </div>
                    </div>
                  </div>

                  {!lease.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingle(lease.id)}
                      aria-label={`${lease.device_name} abmelden`}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                    >
                      <LogOut size={12} />
                      <span>Abmelden</span>
                    </button>
                  )}
                </div>
              );
            })}

            {sessionLeases.filter(l => !l.is_current).length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleRevokeAllOther}
                  disabled={isRevokingAll}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #fca5a5',
                    color: '#dc2626',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <LogOut size={13} />
                  <span>Alle anderen Geräte abmelden</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🛡️ Forensische Daten-Souveränität: Zero-Trace Scrubber für dieses Gerät */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #fecaca'
            }}>
              <Trash2 size={18} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Gerätedaten restlos säubern (Zero-Trace)
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Löscht flüchtige Audio-Caches &amp; Schüler-Tokens auf diesem Gerät (DSGVO Art. 17).
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleScrubDevice}
            disabled={isScrubbing}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1.5px solid #f87171',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: isScrubbing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>{isScrubbing ? 'Wird bereinigt...' : 'Jetzt säubern'}</span>
          </button>
        </div>

        {scrubSuccessMessage && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{scrubSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Real-time sync status footer bar & Security Policy explanation */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        color: '#475569',
        fontSize: '0.78rem',
        fontWeight: 650,
        lineHeight: 1.45
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800 }}>
          <ShieldCheck size={16} color="#0284c7" style={{ flexShrink: 0 }} />
          <span>Eltern-Souveränität &amp; Geschwister-Schutz</span>
        </div>
        <div>
          Hier im Elternbereich hast du als Erziehungsberechtigte/r jederzeit direkten 1-Tap Zugriff auf alle verknüpften Kinder. 
          Im Schülerbereich deiner Kinder ist der Wechsel zu Profilen mit persönlicher PIN geschützt, um Privatsphäre (Chats &amp; Audioaufnahmen) zu wahren.
        </div>
      </div>
    </div>
  );
};
