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

  // 0,1% Goldstandard: Auto-Merge des aktuell angemeldeten Schülers als Profil #1
  const effectiveProfiles = React.useMemo(() => {
    const list = [...(familyProfiles || [])];
    if (studentUser && studentId && !list.some(p => p.id === studentId)) {
      list.unshift({
        ...studentUser,
        id: studentId,
        first_name: studentUser.first_name || 'Aktiver Schüler',
        last_name: studentUser.last_name || '',
        instrument: studentUser.instrument || 'Instrument',
        photo_url: studentUser.photo_url || null
      });
    }
    return list;
  }, [familyProfiles, studentUser, studentId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Family Profiles Grid Stage */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        borderRadius: '22px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#0284c7" />
            <span>Verknüpfte Profile auf diesem Gerät ({effectiveProfiles.length})</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
            1-Tap Profilwechsel im Elternbereich
          </span>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          gap: '18px', 
          flexWrap: 'wrap', 
          marginTop: '4px' 
        }}>
          {effectiveProfiles.map((member: any) => {
            const isCurrent = member.id === studentId;
            const effectiveInstrument = member.instrument || (isCurrent ? studentUser?.instrument : undefined) || 'Gitarre';
            const targetMember = {
              ...member,
              instrument: effectiveInstrument
            };
            
            // 0,1% Goldstandard: Immer den autoritativen 3D-Instrumenten-Avatar verwenden (Zero-Photo Doktrin & KUG § 22)
            // Keine Personen-, Comic- oder Stockfotos von Kindern im Schüler-Profil
            const avatarSrc = resolveCampusStudentAvatar({
              ...targetMember,
              photo_url: undefined
            });

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
                      const fallback = resolveCampusStudentAvatar({ ...targetMember, photo_url: undefined });
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
                border: '2px dashed #0284c7',
                background: '#f0f9ff',
                color: '#0284c7',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: 'none',
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
              color: '#64748b',
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
              const isCurrent = Boolean(lease.is_current);
              const isTablet = (lease.device_name || '').toLowerCase().includes('ipad') || (lease.device_name || '').toLowerCase().includes('tablet');
              const isPhone = (lease.device_name || '').toLowerCase().includes('iphone') || (lease.device_name || '').toLowerCase().includes('android');

              return (
                <div
                  key={lease.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: isCurrent ? '#ecfdf5' : '#f8fafc',
                    border: isCurrent ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    boxShadow: isCurrent ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isCurrent ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCurrent ? '#ffffff' : '#64748b',
                      border: isCurrent ? 'none' : '1px solid rgba(0,0,0,0.06)'
                    }}>
                      {isTablet ? <Tablet size={18} /> : isPhone ? <Smartphone size={18} /> : <Laptop size={18} />}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{isCurrent ? 'Aktuelle Eltern-Sitzung' : (lease.device_name || 'Eltern-Sitzung')}</span>
                        {isCurrent && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 850,
                            padding: '2px 8px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            boxShadow: 'none'
                          }}>
                            🟢 Dieses Gerät (Aktiv)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        {isCurrent ? 'Jetzt autorisiert • ' : ''}Zuletzt aktiv: {new Date(lease.last_active_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingle(lease.id)}
                      aria-label={`${lease.device_name} remote abmelden`}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1.5px solid #fecaca',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        minHeight: '36px',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <LogOut size={13} />
                      <span>Remote abmelden</span>
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
                    padding: '8px 14px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '0.76rem',
                    fontWeight: 850,
                    cursor: isRevokingAll ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover-scale"
                >
                  <LogOut size={14} />
                  <span>Alle anderen {sessionLeases.filter(l => !l.is_current).length} Geräte abmelden</span>
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'none'
          }}>
            <CheckCircle2 size={15} color="#ffffff" aria-hidden="true" />
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
