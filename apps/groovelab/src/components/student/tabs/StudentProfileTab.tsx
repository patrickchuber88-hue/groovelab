import React, { useState } from "react";
import { Building, Calendar, Camera, Clock, Flame, Lock, Pencil, QrCode, Star, Users, X } from "lucide-react";
import { QRCodeModal } from "../../QRCodeModal";
import { getInstrumentAvatarUrl, resolveCampusStudentAvatar } from "../../../utils/avatarHelper";
import { STUDENT_AVATARS } from "../studentAvatars.constants";
import { formatTeacherFullName } from "../../../utils/nameHelper";

export interface StudentProfileTabProps {
  activeTab: string;
  studentUser: any;
  studentId: string;
  avatar: any;
  editingProfile: any;
  setEditingProfile: React.Dispatch<React.SetStateAction<any>>;
  showEditProfile: boolean;
  setShowEditProfile: (show: boolean) => void;
  savingProfile: boolean;
  handleSaveProfile: (e: React.FormEvent) => void;
  showAvatarSelector: boolean;
  setShowAvatarSelector: (show: boolean) => void;
  avatarCategoryFilter: string;
  setAvatarCategoryFilter: (cat: string) => void;
  showSecondEmail: boolean;
  setShowSecondEmail: (show: boolean) => void;
  familyProfiles: any[];
  handleSwitchFamilyStudent: (student: any) => void;
  setIsAddSiblingModalOpen: (open: boolean) => void;
  showOwnQr: boolean;
  setShowOwnQr: (show: boolean) => void;
  studentSchedules: any[];
  monthlyFocusMinutes: number;
  fokusLogs: any[];
  sessionActive: boolean;
  secondsElapsed: number;
  isMusicStandMode?: boolean;
  flamesActive?: boolean;
  xpActive?: boolean;
}

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({
  activeTab,
  studentUser,
  studentId,
  avatar,
  editingProfile,
  setEditingProfile,
  showEditProfile,
  setShowEditProfile,
  savingProfile,
  handleSaveProfile,
  showAvatarSelector,
  setShowAvatarSelector,
  avatarCategoryFilter,
  setAvatarCategoryFilter,
  showSecondEmail,
  setShowSecondEmail,
  familyProfiles,
  handleSwitchFamilyStudent,
  setIsAddSiblingModalOpen,
  showOwnQr,
  setShowOwnQr,
  studentSchedules,
  monthlyFocusMinutes,
  fokusLogs,
  sessionActive,
  secondsElapsed,
  isMusicStandMode = false,
  flamesActive = true,
  xpActive = true,
}) => {
  const getSelectableAvatars = () => {
    if (!editingProfile) return [];
    const assigned = (editingProfile.resolved_instrument || editingProfile.instrument || "")
      .split(",")
      .map((i: string) => i.trim())
      .filter(Boolean);

    const CAMPUS_INSTRUMENT_AVATARS = [
      { id: "inst_gitarre_acoustic", label: "Gitarre", url: "/avatars/gitarre_avatar_new.png", category: "Gitarre" },
      { id: "inst_gitarre_electric", label: "E-Gitarre", url: "/avatars/egitarre_avatar.png", category: "Gitarre" },
      { id: "inst_piano_acoustic", label: "Klavier", url: "/avatars/klavier_avatar_new.png", category: "Piano" },
      { id: "inst_piano_electric", label: "E-Piano", url: "/avatars/piano_avatar.png", category: "Piano" },
      { id: "inst_drums_acoustic", label: "Schlagzeug", url: "/avatars/schlagzeug_avatar.png", category: "Schlagzeug" },
      { id: "inst_drums_electric", label: "E-Drums", url: "/avatars/drums_avatar.png", category: "Schlagzeug" },
      { id: "inst_bass_acoustic", label: "Kontrabass", url: "/avatars/kontrabass_avatar.png", category: "Bass" },
      { id: "inst_bass_electric", label: "E-Bass", url: "/avatars/ebass_avatar.png", category: "Bass" },
      { id: "inst_vocals", label: "Gesang", url: "/avatars/gesang_avatar.png", category: "Gesang" }
    ];

    if (assigned.length === 0) {
      const defaultUrl = resolveCampusStudentAvatar(editingProfile);
      return [{ id: "default_inst", label: "Standard-Avatar", url: defaultUrl, category: "Alle" }];
    }

    const list: Array<{ id: string; label: string; url: string; category?: string }> = [];

    assigned.forEach((inst: string) => {
      const lowerInst = inst.toLowerCase();
      let matchedCategory = "";
      if (lowerInst.includes("guitar") || lowerInst.includes("gitarre")) {
        matchedCategory = "Gitarre";
      } else if (lowerInst.includes("piano") || lowerInst.includes("klavier") || lowerInst.includes("keyboard") || lowerInst.includes("keys")) {
        matchedCategory = "Piano";
      } else if (lowerInst.includes("drum") || lowerInst.includes("schlagzeug")) {
        matchedCategory = "Schlagzeug";
      } else if (lowerInst.includes("bass")) {
        matchedCategory = "Bass";
      } else if (lowerInst.includes("vocal") || lowerInst.includes("gesang") || lowerInst.includes("stimme") || lowerInst.includes("singer")) {
        matchedCategory = "Gesang";
      }

      if (matchedCategory) {
        const matching = CAMPUS_INSTRUMENT_AVATARS.filter(av => av.category === matchedCategory);
        list.push(...matching);
      } else {
        const url = getInstrumentAvatarUrl(inst);
        list.push({
          id: `inst_${inst}`,
          label: inst,
          url: url,
          category: inst
        });
      }
    });

    const seen = new Set();
    return list.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  };

  return (
      <div style={{ display: (activeTab === 'profile' && studentUser) ? 'flex' : 'none', flexDirection: 'column', gap: '28px', maxWidth: '100%', margin: '0 auto', width: '100%' }} className="animation-slide-up">
        {activeTab === 'profile' && studentUser && (
          <>
            {/* Header Card with Premium Campus Green Gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #34a853 0%, #0d4d22 100%)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '32px',
            boxShadow: '0 12px 40px rgba(52, 168, 83, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            display: 'flex',
            overflow: 'visible',
            position: 'relative',
            minHeight: '240px',
            alignItems: 'center',
            padding: '32px 48px',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            {/* Floating Shielded Avatar Frame */}
            <div style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              border: '5px solid #ffffff',
              boxShadow: '0 12px 32px rgba(52, 168, 83, 0.2)',
              background: '#ffffff',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              transform: 'translateY(-10px)'
            }}>
              <img 
                src={
                  studentUser?.role === 'admin' || studentUser?.role === 'secretary'
                    ? '/campus_login_hero.png'
                    : studentUser.photo_url && studentUser.photo_url.includes('_avatar')
                    ? studentUser.photo_url
                    : resolveCampusStudentAvatar(studentUser)
                } 
                alt="" 
                style={{ width: '95%', height: '95%', objectFit: 'contain' }} 
              />
            </div>

            {/* Profile Identity Details */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#ffffff',
                  color: '#34a853', 
                  padding: '4px 14px', 
                  borderRadius: '10px',
                  fontSize: '0.7rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em'
                }}>
                  Campus Schüler
                </span>
                <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Building size={14} color="#ffffff" /> {studentUser.schools?.name || 'Campus-Groovelab'}
                </span>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', fontWeight: 500 }}>
                  • Mitglied seit {studentUser.created_at && !isNaN(new Date(studentUser.created_at).getTime()) ? new Date(studentUser.created_at).toLocaleDateString('de-DE') : 'unbekannt'}
                </span>
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: 950, color: '#ffffff', margin: '0 0 12px 0', letterSpacing: '-0.03em', fontFamily: "'Urbanist', sans-serif" }}>
                {(() => {
                  const firstName = (studentUser.first_name || (studentUser.name ? studentUser.name.split(' ')[0] : '') || '').trim();
                  const lastName = (studentUser.last_name || (studentUser.name && studentUser.name.split(' ').length > 1 ? studentUser.name.split(' ').slice(1).join(' ') : '') || '').trim();
                  
                  if (firstName && lastName) {
                    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
                  }
                  if (firstName) {
                    return firstName;
                  }
                  return 'Mein Profil';
                })()}
              </h1>

              {/* Active Instruments Badge List */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(studentUser.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                  <div key={inst} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons Area */}
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowOwnQr(true)}
                style={{ 
                  background: '#ffffff', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  color: '#34a853', 
                  fontSize: '0.85rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '12px 20px',
                  borderRadius: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span>Campus-Ausweis</span>
                <QrCode size={15} />
              </button>

              <button 
                onClick={() => {
                  setEditingProfile({ ...studentUser });
                  setAvatarCategoryFilter('Alle');
                  setShowSecondEmail(!!studentUser?.parent_email);
                  setShowAvatarSelector(false);
                  setShowEditProfile(true);
                }} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.15)', 
                  border: '1px solid rgba(255, 255, 255, 0.25)', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  color: '#ffffff', 
                  fontSize: '0.85rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '12px 20px',
                  borderRadius: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
              >
                <span>Profil bearbeiten</span>
                <Pencil size={15} />
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Metric 1: XP */}
            {xpActive && (
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.08)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Star size={22} fill="#34a853" />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Erfahrung (XP)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                    {avatar?.xp || 0} XP
                  </div>
                </div>
              </div>
            )}

            {/* Metric 2: Übe-Streak */}
            {flamesActive && (
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Flame size={22} fill="#ef4444" color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Übe-Streak</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                    {avatar?.streak_flame || 0} Tage
                  </div>
                </div>
              </div>
            )}

            {/* Metric 3: Focus Month */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(234, 179, 8, 0.08)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Fokus Diesen Monat</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {monthlyFocusMinutes} Min.
                </div>
              </div>
            </div>

            {/* Metric 4: Weekly Lessons */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Wochenstunden</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {studentSchedules.length} {studentSchedules.length === 1 ? 'Fach' : 'Fächer'}
                </div>
              </div>
            </div>
          </div>

          {/* Familien-Profile & Geschwister (Schnellwechsel) */}
          {familyProfiles.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
              borderRadius: '32px',
              padding: '28px 32px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '14px',
                    background: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Users size={20} color="#0284c7" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Urbanist', sans-serif" }}>
                      Familien-Profile &amp; Geschwister
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                      Blitzschneller 1-Tap Wechsel zwischen Profilen auf diesem Gerät – ohne PIN.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddSiblingModalOpen(true)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#0284c7',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <QrCode size={16} color="#0284c7" />
                  <span>+ Weiteres Kind (QR-Scan)</span>
                </button>
              </div>

              {/* Sibling items carousel / row */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                overflowX: 'auto',
                padding: '8px 4px 12px 4px'
              }} className="no-scrollbar">
                {familyProfiles.map((member) => {
                  const isCurrent = member.id === studentId;
                  const isPinProtected = Boolean(member.has_personal_pin || member.is_pin_activated);
                  const targetMember = isCurrent && !member.instrument ? { ...member, instrument: studentUser?.instrument } : member;
                  const defaultInstAvatar = resolveCampusStudentAvatar(targetMember);
                  
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
                        width: '92px',
                        flexShrink: 0,
                        textAlign: 'center'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => !isCurrent && handleSwitchFamilyStudent(member.id)}
                        style={{
                          position: 'relative',
                          width: '68px',
                          height: '68px',
                          borderRadius: '20px',
                          padding: 0,
                          border: isCurrent ? '3px solid #0284c7' : '2px solid #e2e8f0',
                          background: '#ffffff',
                          cursor: isCurrent ? 'default' : 'pointer',
                          boxShadow: isCurrent
                            ? '0 8px 24px -4px rgba(2, 132, 199, 0.35)'
                            : '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className={!isCurrent ? "hover-scale" : undefined}
                        title={isCurrent ? `${member.first_name} (Aktives Profil)` : isPinProtected ? `Zu ${member.first_name} wechseln (PIN-geschützt)` : `Zu ${member.first_name} wechseln`}
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
                            borderRadius: '17px',
                            pointerEvents: 'none'
                          }} />
                        )}
                        {isPinProtected && !isCurrent && (
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#0284c7',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            border: '1.5px solid #ffffff'
                          }}>
                            <Lock size={10} strokeWidth={2.5} />
                          </div>
                        )}
                      </button>

                      <div style={{
                        fontSize: '0.82rem',
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

                      {isCurrent ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          color: '#0284c7',
                          background: '#e0f2fe',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          marginTop: '4px'
                        }}>
                          ● Aktiv
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchFamilyStudent(member.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isPinProtected ? '#0284c7' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                            padding: '2px 4px',
                            marginTop: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          className="hover-underline"
                        >
                          {isPinProtected && <Lock size={10} strokeWidth={2.5} />}
                          <span>Wechseln →</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Additional Quick Add Tile */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '92px',
                  flexShrink: 0,
                  textAlign: 'center'
                }}>
                  <button
                    type="button"
                    onClick={() => setIsAddSiblingModalOpen(true)}
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '20px',
                      border: '2px dashed #94a3b8',
                      background: '#f8fafc',
                      color: '#0284c7',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className="hover-scale"
                    title="Weiteres Kind per QR-Ausweis hinzufügen"
                  >
                    <QrCode size={22} color="#0284c7" />
                  </button>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 750,
                    color: '#64748b',
                    marginTop: '8px'
                  }}>
                    + Kind
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weekly recurring schedules & Jahres-Statistik side-by-side */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', width: '100%', alignItems: 'stretch' }}>
            {/* Wöchentlicher Unterrichtsplan */}
            <div style={{ flex: '1 1 350px', background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: '#34a853' }} />
                Wöchentlicher Unterrichtsplan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {studentSchedules.length > 0 ? (
                  studentSchedules.map((sch) => {
                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    return (
                      <div key={sch.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '16px 20px', 
                        background: '#f8fafc', 
                        borderRadius: '16px', 
                        border: '1px solid #f1f5f9' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ height: '42px', width: '42px', borderRadius: '12px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.04)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            {getInstrumentAvatarUrl(sch.instrument).includes('piano') ? '🎹' : getInstrumentAvatarUrl(sch.instrument).includes('drums') ? '🥁' : getInstrumentAvatarUrl(sch.instrument).includes('vocals') ? '🎤' : '🎸'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 850, color: '#0f172a', fontSize: '0.9rem' }}>
                              {DAYS_DE[sch.day_of_week]}s, {sch.time_slot} Uhr
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                              {sch.teacher ? `Coach: ${formatTeacherFullName(sch.teacher)}` : 'Patrick Huber'} • {sch.rooms?.name || 'Raum 1'} ({sch.duration || 45} Min)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Keine wöchentlichen Termine hinterlegt.
                  </div>
                )}
              </div>
            </div>

            {/* Jahres-Statistik (Personal) */}
            <div style={{ flex: '1 1 350px', background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#e6f4ea', color: '#34a853', padding: '8px', borderRadius: '12px' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Urbanist', sans-serif" }}>
                    Jahres-Statistik
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
                    Übeminuten (Sep - Aug)
                  </p>
                </div>
              </div>

              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                const monthsList = [
                  { month: 8, label: 'Sep', year: startYear },
                  { month: 9, label: 'Okt', year: startYear },
                  { month: 10, label: 'Nov', year: startYear },
                  { month: 11, label: 'Dez', year: startYear },
                  { month: 0, label: 'Jan', year: startYear + 1 },
                  { month: 1, label: 'Feb', year: startYear + 1 },
                  { month: 2, label: 'Mrz', year: startYear + 1 },
                  { month: 3, label: 'Apr', year: startYear + 1 },
                  { month: 4, label: 'Mai', year: startYear + 1 },
                  { month: 5, label: 'Jun', year: startYear + 1 },
                  { month: 6, label: 'Jul', year: startYear + 1 },
                  { month: 7, label: 'Aug', year: startYear + 1 }
                ];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {monthsList.map(item => {
                        const logsForMonth = fokusLogs.filter(log => {
                          if (!log.created_at) return false;
                          const logDate = new Date(log.created_at);
                          return logDate.getMonth() === item.month && logDate.getFullYear() === item.year;
                        });
                        let totalSecs = logsForMonth.reduce((sum, log) => {
                          return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
                        }, 0);
                        
                        if (sessionActive && secondsElapsed > 0 && item.month === now.getMonth() && item.year === now.getFullYear()) {
                          totalSecs += secondsElapsed;
                        }

                        const minutes = Math.round(totalSecs / 60);
                        
                        // Heatmap Style Calculation
                        let bg = '#f8fafc';
                        let border = '1px solid #e2e8f0';
                        let labelColor = '#94a3b8';
                        let textColor = '#64748b';
                        let numColor = '#1e293b';
                        let shadow = 'none';

                        if (minutes > 0) {
                          if (minutes <= 15) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6fbf0 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 2px 6px rgba(52, 168, 83, 0.04)';
                          } else if (minutes <= 60) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 3px 8px rgba(52, 168, 83, 0.07)';
                          } else if (minutes <= 180) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                          } else {
                            bg = 'linear-gradient(135deg, #34a853 0%, #34a853 100%)';
                            border = '1px solid #34a853';
                            labelColor = 'rgba(255, 255, 255, 0.8)';
                            textColor = 'rgba(255, 255, 255, 0.9)';
                            numColor = '#ffffff';
                            shadow = '0 6px 15px rgba(52, 168, 83, 0.25)';
                          }
                        }

                        return (
                          <div 
                            key={`${item.month}-${item.year}`}
                            style={{
                              background: bg,
                              border: border,
                              borderRadius: '16px',
                              padding: '12px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              minHeight: '66px',
                              textAlign: 'center',
                              boxShadow: shadow,
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              if (minutes > 0) {
                                e.currentTarget.style.boxShadow = shadow.replace(/0\.\d+/, '0.3');
                              } else {
                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.04)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0px)';
                              e.currentTarget.style.boxShadow = shadow;
                              e.currentTarget.style.borderColor = border.split(' ')[2];
                            }}
                          >
                            <span style={{ 
                              fontSize: '0.62rem', 
                              fontWeight: 800, 
                              color: labelColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {item.label}
                            </span>
                            <span style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 900, 
                              color: numColor,
                              fontFamily: "'Urbanist', sans-serif"
                            }}>
                              {minutes}
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, marginLeft: '1px', color: textColor }}>m</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Heatmap Legend */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '4px', 
                      padding: '8px 10px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9',
                      fontSize: isMusicStandMode ? '0.78rem' : '0.70rem', 
                      color: '#64748b', 
                      fontWeight: 700
                    }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>Heatmap:</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0' }} /> 0m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6fbf0', border: '1px solid #e6f4ea' }} /> &lt;15m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6f4ea', border: '1px solid #e6f4ea' }} /> &lt;1h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6f4ea', border: '1px solid #e6f4ea' }} /> &lt;3h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34a853' }} /> 3h+
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {showOwnQr && studentUser?.qr_token && (
            <QRCodeModal user={studentUser} activePlatform="campus" onClose={() => setShowOwnQr(false)} />
          )}

          {/* 📦 Student Audio-Tresor Termination Backup Notice & 1-Click ZIP Exporter */}
          {(() => {
            const schoolObj = studentUser?.schools || (studentUser as any)?.school;
            let overridesData: any = {};
            try {
              const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
              const allOverrides = JSON.parse(overridesStr);
              const sId = studentUser?.school_id || schoolObj?.id;
              if (sId && allOverrides[sId]) overridesData = allOverrides[sId];
            } catch (e) {}

            const termStatus = overridesData.storage_termination_status ?? schoolObj?.storage_termination_status;
            const termDeadline = overridesData.storage_termination_deadline ?? schoolObj?.storage_termination_deadline;
            const isBackupDownloaded = localStorage.getItem(`campus_storage_backup_downloaded_${studentId}`) === 'true';
            const isDismissedForSession = sessionStorage.getItem(`campus_storage_backup_dismissed_${studentId}`) === 'true';

            if (termStatus !== 'active_grace_period' || isBackupDownloaded || isDismissedForSession) {
              return null;
            }

            const deadlineFormatted = termDeadline ? new Date(termDeadline).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'demnächst';

            return (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: '28px',
                  width: '100%',
                  maxWidth: '520px',
                  padding: '32px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                  border: '1.5px solid #e2e8f0',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.2)'
                  }}>
                    <span style={{ fontSize: '2rem' }}>📦</span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
                    Audio-Tresor Umstellung
                  </h3>

                  <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                    Deine Musikschule stellt den Cloud-Audio-Tresor zum <strong style={{ color: '#0f172a' }}>{deadlineFormatted}</strong> um.
                    Sichere dir jetzt alle deine persönlichen Songs, Loops und Meisterwerke mit einem Klick als geordnetes ZIP-Archiv auf dein Gerät!
                  </p>

                  {/* Folder Preview Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    textAlign: 'left',
                    marginBottom: '24px',
                    fontSize: '0.78rem',
                    color: '#334155'
                  }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>📁 Enthaltene Ordner in deiner ZIP-Datei:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#64748b' }}>
                      <span>⭐ <strong>/Meisterwerke</strong> (Konzerte &amp; Audio-Biografie)</span>
                      <span>🎛️ <strong>/Loopstation</strong> (Deine eigenen Beats &amp; Jam-Tracks)</span>
                      <span>🎙️ <strong>/Hausaufgaben</strong> (Unterrichts- &amp; Übungs-Aufnahmen)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { downloadStudentAudioBackup } = await import('../../../utils/audioBackupHelper');
                          const res = await downloadStudentAudioBackup({
                            studentId: studentId || (studentUser as any)?.id,
                            studentName: `${studentUser?.first_name || ''} ${studentUser?.last_name || ''}`.trim()
                          });
                          alert(`✅ Dein Audio-Archiv wurde erfolgreich heruntergeladen (${res.count} Aufnahmen gesichert)!`);
                        } catch (e: any) {
                          alert('Fehler beim Download: ' + e.message);
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '14px 20px',
                        fontWeight: 850,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(5, 150, 105, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>💾 Alle meine Aufnahmen herunterladen (ZIP)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem(`campus_storage_backup_dismissed_${studentId}`, 'true');
                        window.dispatchEvent(new Event('storage_backup_dismissed'));
                      }}
                      style={{
                        background: 'transparent',
                        color: '#64748b',
                        border: 'none',
                        padding: '10px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      Später erinnern • Weiter zum Dashboard
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Profile Edit Overlay Modal */}
          {showEditProfile && editingProfile && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 11000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <form onSubmit={handleSaveProfile} style={{
                background: 'white',
                border: '1px solid rgba(255,255,255,0.8)',
                borderRadius: '32px',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
                width: '100%',
                maxWidth: '540px',
                padding: '36px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative'
              }}>
                <button 
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={16} />
                </button>

                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                  Profil bearbeiten
                </h3>

                {/* Big Avatar Preview & Edit Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                  <div style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    border: '5px solid #ffffff',
                    boxShadow: '0 8px 24px rgba(52, 168, 83, 0.12)',
                    background: '#ffffff',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <img 
                      src={
                        editingProfile?.role === 'admin' || editingProfile?.role === 'secretary'
                          ? '/campus_login_hero.png'
                          : editingProfile.photo_url && editingProfile.photo_url.includes('_avatar')
                          ? editingProfile.photo_url
                          : resolveCampusStudentAvatar(editingProfile)
                      } 
                      alt="" 
                      style={{ width: '92%', height: '92%', objectFit: 'contain' }} 
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                    style={{
                      background: showAvatarSelector ? '#34a8530c' : '#ffffff',
                      border: `1.5px solid ${showAvatarSelector ? '#34a853' : 'rgba(0,0,0,0.08)'}`,
                      color: showAvatarSelector ? '#34a853' : '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={(e) => {
                      if (!showAvatarSelector) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!showAvatarSelector) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <Camera size={14} />
                    <span>Profilbild bearbeiten</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Vorname</label>
                      <input 
                        type="text" 
                        required
                        value={editingProfile.first_name || ''} 
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, first_name: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nachname</label>
                      <input 
                        type="text" 
                        required
                        value={editingProfile.last_name || ''} 
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, last_name: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>



                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Instrumente</label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '0.88rem',
                      color: '#64748b',
                      boxSizing: 'border-box'
                    }}>
                      <Lock size={14} style={{ color: '#94a3b8' }} />
                      <span style={{ fontWeight: 600 }}>{editingProfile.instrument || 'Keine Instrumente hinterlegt'}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                      Die Verwaltung legt deine Instrumente fest. Du kannst sie nicht selbst ändern.
                    </span>
                  </div>

                  {showAvatarSelector && (
                    <div className="animation-slide-down" style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px', 
                      marginTop: '4px',
                      padding: '16px',
                      background: 'rgba(52, 168, 83, 0.03)',
                      borderRadius: '20px',
                      border: '1.5px dashed rgba(52, 168, 83, 0.15)'
                    }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', display: 'block' }}>Wähle deinen neuen Instrumenten-Avatar</label>
                      
                      {/* Category Filter Tabs */}
                      {(() => {
                        const selectableAvatars = getSelectableAvatars();
                        const selectableCategories = Array.from(new Set(selectableAvatars.map(av => av.category).filter(Boolean))) as string[];
                        
                        if (selectableCategories.length <= 1) return null;
                        
                        return (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            {['Alle', ...selectableCategories].map(cat => {
                              const isCatSelected = avatarCategoryFilter === cat;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setAvatarCategoryFilter(cat)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    border: `1.5px solid ${isCatSelected ? '#34a853' : '#e2e8f0'}`,
                                    background: isCatSelected ? '#34a853' : 'white',
                                    color: isCatSelected ? 'white' : '#64748b',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Scrollable Grid of Avatars */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', 
                        gap: '12px', 
                        maxHeight: '180px', 
                        overflowY: 'auto',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                      }}>
                        {(() => {
                          const selectableAvatars = getSelectableAvatars();
                          return selectableAvatars.filter(av => avatarCategoryFilter === 'Alle' || av.category === avatarCategoryFilter).map((avatarItem) => {
                            const isSelected = editingProfile.photo_url === avatarItem.url;
                            return (
                              <button
                                key={avatarItem.id}
                                type="button"
                                onClick={() => setEditingProfile((prev: any) => ({ ...prev, photo_url: avatarItem.url }))}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px',
                                  borderRadius: '12px',
                                  border: `2.5px solid ${isSelected ? '#34a853' : 'transparent'}`,
                                  background: isSelected ? 'white' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  outline: 'none',
                                  boxShadow: isSelected ? '0 4px 10px rgba(52, 168, 83, 0.15)' : 'none'
                                }}
                              >
                                <div style={{ 
                                  width: '56px', 
                                  height: '56px', 
                                  borderRadius: '10px', 
                                  overflow: 'hidden', 
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                  background: 'white',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <img src={avatarItem.url} style={{ width: '90%', height: '90%', objectFit: 'contain' }} alt={avatarItem.label} loading="lazy" />
                                </div>
                                <span style={{ 
                                  fontSize: '0.62rem', 
                                  fontWeight: 750, 
                                  color: isSelected ? '#1e293b' : '#64748b',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%'
                                }} title={avatarItem.label}>
                                  {avatarItem.label.split(' (')[0]}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEditProfile(false)}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(52, 168, 83, 0.15)' }}
                  >
                    {savingProfile ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </button>
                </div>
              </form>
            </div>
          )}
          </>
        )}
      </div>
  );
};
