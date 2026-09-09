import React from 'react';
import { Users, QrCode, X, ShieldCheck } from 'lucide-react';
import { getInstrumentAvatarUrl, resolveCampusStudentAvatar, STUDENT_AVATARS } from '../studentAvatars.constants';

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
