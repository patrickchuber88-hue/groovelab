import React, { Suspense, lazy, useEffect } from 'react';
import { Megaphone, CheckCircle, User, X, Trash2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StudioAvatar } from '../StudioAvatar';

const BandProfileContent = lazy(() => import('../BandProfileContent'));
const ArtistGateway = lazy(() => import('../ArtistGateway').then(m => ({ default: m.ArtistGateway })));

export interface ProfileBandModalsHubProps {
  user: any;
  setUser: (user: any) => void;
  brandColor: string;
  width: number;
  activePlatform: string;
  supabase: SupabaseClient;
  fetchDashboardData: (userId: string, isSilent?: boolean) => Promise<any> | void;
  APP_INSTRUMENT_ICONS: Record<string, any>;
  APP_INSTRUMENT_COLORS: Record<string, any>;

  // Announcement Modal
  activeAnnouncement: any;
  handleAcknowledgeAnnouncement: (announcement: any) => void;

  // Edit Profile Modal
  showEditProfile: boolean;
  setShowEditProfile: (val: boolean) => void;
  editingProfile: any;
  setEditingProfile: (val: any) => void;
  handleUpdateProfile: (e: React.FormEvent) => void;

  // Student Preview Modal
  selectedStudentForPreview: any;
  setSelectedStudentForPreview: (val: any) => void;

  // Band Profile Fullscreen Modal
  showBandProfile: boolean;
  setShowBandProfile: (val: boolean) => void;
  selectedBandForProfile: any;
  setSelectedBandForProfile: (val: any) => void;
  bandProfileView: 'public' | 'backstage';
  setBandProfileView: (val: 'public' | 'backstage') => void;
  isSharedView?: boolean;

  // Edit Band Modal
  showEditBand: boolean;
  setShowEditBand: (val: boolean) => void;
  editingBand: any;
  setEditingBand: (val: any) => void;
  teachers: any[];

  // Avatar Picker Modal
  showAvatarPicker: boolean;
  setShowAvatarPicker: (val: boolean) => void;
  avatarPickerType: 'student' | 'band' | 'teacher';
  setAvatarPickerType: (val: any) => void;
  bandAvatarSizeFilter: 'Alle' | '3' | '4' | '5';
  setBandAvatarSizeFilter: (val: 'Alle' | '3' | '4' | '5') => void;
  avatarInstrumentFilter: any;
  setAvatarInstrumentFilter: (val: any) => void;
  BAND_AVATARS: any[];
  STUDENT_AVATARS: any[];
  TEACHER_AVATARS: any[];
  CAMPUS_AVATARS: any[];
  failedAvatarUrls: string[];

  // Artist Gateway Modal
  selectedBandForGateway: any;
  setSelectedBandForGateway: (val: any) => void;
  pendingFounding: any;
  setPendingFounding: (val: any) => void;
  gatewayJustClosed: React.MutableRefObject<boolean>;
  clearConfetti: () => void;
}

export const ProfileBandModalsHub: React.FC<ProfileBandModalsHubProps> = ({
  user,
  setUser,
  brandColor,
  width,
  activePlatform,
  supabase,
  fetchDashboardData,
  APP_INSTRUMENT_ICONS,
  APP_INSTRUMENT_COLORS,

  activeAnnouncement,
  handleAcknowledgeAnnouncement,

  showEditProfile,
  setShowEditProfile,
  editingProfile,
  setEditingProfile,
  handleUpdateProfile,

  selectedStudentForPreview,
  setSelectedStudentForPreview,

  showBandProfile,
  setShowBandProfile,
  selectedBandForProfile,
  setSelectedBandForProfile,
  bandProfileView,
  setBandProfileView,
  isSharedView,

  showEditBand,
  setShowEditBand,
  editingBand,
  setEditingBand,
  teachers,

  showAvatarPicker,
  setShowAvatarPicker,
  avatarPickerType,
  setAvatarPickerType,
  bandAvatarSizeFilter,
  setBandAvatarSizeFilter,
  avatarInstrumentFilter,
  setAvatarInstrumentFilter,
  BAND_AVATARS,
  STUDENT_AVATARS,
  TEACHER_AVATARS,
  CAMPUS_AVATARS,
  failedAvatarUrls,

  selectedBandForGateway,
  setSelectedBandForGateway,
  pendingFounding,
  setPendingFounding,
  gatewayJustClosed,
  clearConfetti
}) => {
  // Global Escape-Key-Listener for WCAG 2.2 AA Parity
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAvatarPicker) {
          setShowAvatarPicker(false);
        } else if (showEditBand) {
          setShowEditBand(false);
        } else if (showEditProfile) {
          setShowEditProfile(false);
        } else if (selectedStudentForPreview) {
          setSelectedStudentForPreview(null);
        } else if (showBandProfile) {
          setShowBandProfile(false);
        } else if (activeAnnouncement) {
          handleAcknowledgeAnnouncement(activeAnnouncement);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showAvatarPicker,
    showEditBand,
    showEditProfile,
    selectedStudentForPreview,
    showBandProfile,
    activeAnnouncement,
    setShowAvatarPicker,
    setShowEditBand,
    setShowEditProfile,
    setSelectedStudentForPreview,
    setShowBandProfile,
    handleAcknowledgeAnnouncement
  ]);

  return (
    <>
      {/* 📢 Announcement Notification Modal */}
      {activeAnnouncement && (() => {
        let parsed;
        try {
          parsed = JSON.parse(activeAnnouncement.content);
        } catch (e) {
          parsed = {
            title: 'Wichtige Mitteilung',
            target_type: 'all',
            target_user_ids: [],
            message: activeAnnouncement.content
          };
        }
        const senderName = activeAnnouncement.users ? `${activeAnnouncement.users.first_name || ''} ${activeAnnouncement.users.last_name || ''}`.trim() : 'GrooveLab';
        const senderPhoto = activeAnnouncement.users?.photo_url;
        
        return (
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Wichtige Mitteilung"
            style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
          >
            <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', maxWidth: '600px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilung</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>{parsed.title}</h2>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {senderPhoto ? <StudioAvatar src={senderPhoto} user={activeAnnouncement.users} /> : <User size={20} style={{ color: '#94a3b8' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{senderName}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    {new Date(activeAnnouncement.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr
                  </div>
                </div>
              </div>
              
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: 650, 
                color: '#475569', 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap', 
                maxHeight: '40vh', 
                overflowY: 'auto', 
                paddingRight: '8px' 
              }}>
                {parsed.message}
              </div>
              
              <button 
                type="button" 
                onClick={() => handleAcknowledgeAnnouncement(activeAnnouncement)} 
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '18px 24px', 
                  borderRadius: '20px', 
                  fontSize: '1rem', 
                  fontWeight: 850, 
                  cursor: 'pointer', 
                  boxShadow: '0 8px 20px rgba(59,130,246,0.3)', 
                  transition: 'all 0.2s', 
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                <CheckCircle size={20} />
                Gelesen & Schließen
              </button>
              
            </div>
          </div>
        );
      })()}

      {/* ✏️ Edit Profile Modal */}
      {showEditProfile && editingProfile && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Profil bearbeiten"
          style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)' }}
        >
          <form onSubmit={handleUpdateProfile} className="glass-panel animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255, 255, 255, 0.5)', padding: '36px', borderRadius: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1c1c1e', margin: 0, letterSpacing: '-0.02em' }}>Profil bearbeiten</h2>
              <button 
                type="button" 
                onClick={() => setShowEditProfile(false)} 
                aria-label="Schließen"
                style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#48484a', cursor: 'pointer', transition: 'background 0.2s', touchAction: 'manipulation' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {user?.role === 'student' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vorname</label>
                      <input required value={editingProfile.first_name || ''} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', minHeight: '44px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anfangsbuchstabe Nachname</label>
                      <input required maxLength={1} value={editingProfile.last_name || ''} onChange={e => {
                        const val = e.target.value.trim().substring(0, 1).toUpperCase();
                        setEditingProfile({...editingProfile, last_name: val});
                      }} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', minHeight: '44px' }} />
                    </div>
                  </div>

                  {user?.instrument && (user.instrument.toLowerCase().includes('guitar') || user.instrument.toLowerCase().includes('gitarre')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profilbild (Avatar)</label>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {[
                          { id: 'gitarre', label: 'Akustische Gitarre (Standard)', url: '/avatars/gitarre_avatar_new.png' },
                          { id: 'egitarre', label: 'E-Gitarre', url: '/avatars/egitarre_avatar.png' }
                        ].map((avatar) => {
                          const isSelected = editingProfile.photo_url === avatar.url || (!editingProfile.photo_url && avatar.id === 'gitarre');
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setEditingProfile({ ...editingProfile, photo_url: avatar.url })}
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '16px',
                                borderRadius: '16px',
                                border: `2px solid ${isSelected ? brandColor : 'rgba(0, 0, 0, 0.08)'}`,
                                background: isSelected ? `${brandColor}08` : 'rgba(255, 255, 255, 0.65)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                boxShadow: isSelected ? `0 8px 20px ${brandColor}15` : 'none',
                                touchAction: 'manipulation'
                              }}
                            >
                              <div style={{ width: '80px', height: '80px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <img src={avatar.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={avatar.label} />
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#1c1c1e' : '#48484a' }}>{avatar.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vorname</label>
                      <input required value={editingProfile.first_name || ''} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', minHeight: '44px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nachname</label>
                      <input required value={editingProfile.last_name || ''} onChange={e => setEditingProfile({...editingProfile, last_name: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', minHeight: '44px' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'block' }}>Instrumente (Icons anklicken):</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                      {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                        const isSelected = (editingProfile.groovelab_instrument || '').includes(inst);
                        return (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => {
                              const current = (editingProfile.groovelab_instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                              const next = current.includes(inst) ? current.filter((s: string) => s !== inst) : [...current, inst];
                              setEditingProfile({...editingProfile, groovelab_instrument: next.join(', ')});
                            }}
                            style={{
                              flex: 1,
                              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 8px', borderRadius: '12px', 
                              border: `1px solid ${isSelected ? brandColor : 'rgba(0, 0, 0, 0.08)'}`,
                              background: isSelected ? `${brandColor}10` : 'rgba(255, 255, 255, 0.65)',
                              color: isSelected ? '#1c1c1e' : '#48484a',
                              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                              boxShadow: isSelected ? `0 4px 12px ${brandColor}15` : 'none',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              minHeight: '44px',
                              touchAction: 'manipulation'
                            }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>{APP_INSTRUMENT_ICONS[inst]}</span> {inst === "Piano / Keys" ? "Piano" : inst}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Musikalischer Werdegang (Bio)</label>
                    <textarea placeholder="Erzähle etwas über deinen Werdegang..." value={editingProfile.bio || ''} onChange={e => setEditingProfile({...editingProfile, bio: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.5, transition: 'all 0.2s', outline: 'none', resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expertise & Stile</label>
                      <input placeholder="z.B. Jazz, Rock, Metal..." value={editingProfile.expertise || ''} onChange={e => setEditingProfile({...editingProfile, expertise: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', minHeight: '44px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bands & Projekte</label>
                      <input placeholder="Aktuelle Bands..." value={editingProfile.bands || ''} onChange={e => setEditingProfile({...editingProfile, bands: e.target.value})} onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25`; e.target.style.background = '#ffffff'; }} onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.65)'; }} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.65)', color: '#1c1c1e', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', minHeight: '44px' }} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: `0 8px 24px ${brandColor}25`, transition: 'all 0.2s', minHeight: '44px', touchAction: 'manipulation' }}>Speichern</button>
                <button type="button" onClick={() => setShowEditProfile(false)} style={{ flex: 1, background: 'rgba(0, 0, 0, 0.05)', color: '#48484a', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px', touchAction: 'manipulation' }}>Abbrechen</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 🔍 Student Quick Preview Modal */}
      {selectedStudentForPreview && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label={`Schüler-Vorschau: ${selectedStudentForPreview.first_name}`}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: '20px' }}
        >
          <div className="glass-panel animation-slide-up" style={{ background: 'white', borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '360px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-24px', position: 'relative', zIndex: 1 }}>
              <button 
                onClick={() => setSelectedStudentForPreview(null)} 
                aria-label="Schließen"
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', touchAction: 'manipulation' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '32px', margin: '0 auto 20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '4px solid white' }}>
                <StudioAvatar src={selectedStudentForPreview.photo_url} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>{selectedStudentForPreview.first_name}</h3>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {APP_INSTRUMENT_ICONS[selectedStudentForPreview.instrument as keyof typeof APP_INSTRUMENT_ICONS]} {selectedStudentForPreview.instrument}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Level</div>
                  <div style={{ fontWeight: 900, color: '#1e293b' }}>Pro</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontWeight: 900, color: '#34a853' }}>Ready</div>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedStudentForPreview(null)}
              style={{ width: '100%', padding: '16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', minHeight: '44px', touchAction: 'manipulation' }}
            >
              COOL!
            </button>
          </div>
        </div>
      )}

      {/* 🎸 Fullscreen Band Profile Overlay */}
      {showBandProfile && selectedBandForProfile && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label={`Bandprofil: ${selectedBandForProfile.name}`}
          style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#09090b', overflowY: "auto", WebkitOverflowScrolling: "touch", WebkitTransform: 'translate3d(0,0,0)', transform: 'translate3d(0,0,0)' }}
        >
          <Suspense fallback={null}>
            <BandProfileContent 
              selectedBandForProfile={selectedBandForProfile} 
              user={user} 
              bandProfileView={bandProfileView} 
              setBandProfileView={setBandProfileView} 
              brandColor={brandColor} 
              width={width} 
              APP_INSTRUMENT_COLORS={APP_INSTRUMENT_COLORS} 
              APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS} 
              setShowBandProfile={setShowBandProfile} 
              setEditingBand={setEditingBand} 
              setShowEditBand={setShowEditBand} 
              setShowAvatarPicker={setShowAvatarPicker}
              setAvatarPickerType={setAvatarPickerType}
              isSharedView={isSharedView}
              onRefresh={() => {
                if (user?.id) fetchDashboardData(user.id);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* 🛠️ Edit Band Modal */}
      {showEditBand && editingBand && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Bandprofil bearbeiten"
          style={{ position: 'fixed', inset: 0, zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <form onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from('bands').update({
              name: editingBand.name,
              bio: editingBand.bio,
              genre: editingBand.genre,
              photo_url: editingBand.photo_url,
              soundcloud_links: editingBand.soundcloud_links || [],
              youtube_links: editingBand.youtube_links || [],
              appointments: editingBand.appointments || [],
              coach_id: editingBand.coach_id
            }).eq('id', editingBand.id);
            if (error) {
              alert(error.message);
            } else {
              setShowEditBand(false);
              setSelectedBandForProfile({
                ...selectedBandForProfile,
                ...editingBand
              });
              if (user?.id) fetchDashboardData(user.id);
            }
          }} className="animation-slide-up" style={{ background: 'rgba(30, 30, 30, 0.95)', backdropFilter: 'blur(30px) saturate(150%)', WebkitBackdropFilter: 'blur(30px) saturate(150%)', border: '1px solid rgba(255,255,255,0.08)', padding: '40px', borderRadius: '32px', maxWidth: '640px', width: '100%', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 40px 100px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Bandprofil bearbeiten</h2>
              <button 
                type="button" 
                onClick={() => setShowEditBand(false)} 
                aria-label="Schließen"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bandname</label>
                <input required value={editingBand.name} onChange={e => setEditingBand({...editingBand, name: e.target.value})} style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }} />
              </div>

              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bandcoach (Lehrer)</label>
                  <select 
                    value={editingBand.coach_id || ''} 
                    onChange={e => setEditingBand({...editingBand, coach_id: e.target.value || null})} 
                    style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }}
                  >
                    <option value="">-- Kein Coach --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musikrichtung / Genre</label>
                <input value={editingBand.genre || ''} onChange={e => setEditingBand({...editingBand, genre: e.target.value})} style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }} placeholder="z.B. Rock, Jazz, Pop..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Über uns</label>
                <textarea rows={4} value={editingBand.bio || ''} onChange={e => setEditingBand({...editingBand, bio: e.target.value})} style={{ color: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', resize: 'none' }} placeholder="Erzählt eure Story..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Termine & Gigs</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {(editingBand.appointments || []).map((app: any, idx: number) => (
                     <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ flex: 1 }}>
                           <input 
                             placeholder="Titel" 
                             value={app.title} 
                             onChange={e => {
                               const newApps = [...editingBand.appointments];
                               newApps[idx].title = e.target.value;
                               setEditingBand({...editingBand, appointments: newApps});
                             }} 
                             style={{ color: 'white', background: 'transparent', border: 'none', fontWeight: 800, fontSize: '1.1rem', width: '100%', outline: 'none' }} 
                           />
                           <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                              <input 
                                type="date" 
                                value={app.date} 
                                onChange={e => {
                                  const newApps = [...editingBand.appointments];
                                  newApps[idx].date = e.target.value;
                                  setEditingBand({...editingBand, appointments: newApps});
                                }} 
                                style={{ color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }} 
                              />
                              <input 
                                placeholder="Ort" 
                                value={app.location} 
                                onChange={e => {
                                  const newApps = [...editingBand.appointments];
                                  newApps[idx].location = e.target.value;
                                  setEditingBand({...editingBand, appointments: newApps});
                                }} 
                                style={{ color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 600, outline: 'none', flex: 1 }} 
                              />
                           </div>
                        </div>
                        <button 
                          type="button" 
                          aria-label="Termin löschen"
                          onClick={() => {
                            const newApps = editingBand.appointments.filter((_: any, i: number) => i !== idx);
                            setEditingBand({...editingBand, appointments: newApps});
                          }} 
                          style={{ background: 'rgba(239,68,68,0.15)', padding: '12px', borderRadius: '12px', border: 'none', color: '#ff4d4f', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                        >
                          <Trash2 size={20} />
                        </button>
                     </div>
                   ))}
                   <button 
                     type="button" 
                     onClick={() => {
                       const newApps = [...(editingBand.appointments || []), { title: '', date: new Date().toISOString().split('T')[0], location: '' }];
                       setEditingBand({...editingBand, appointments: newApps});
                     }} 
                     style={{ padding: '16px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', minHeight: '44px', touchAction: 'manipulation' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                   >
                     + Termin hinzufügen
                   </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musik (MP3 Links)</label>
                {(editingBand.soundcloud_links || []).map((track: any, idx: number) => {
                  const trackData = typeof track === 'string' ? { title: '', url: track } : track;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        placeholder="Titel (z.B. Song Name)" 
                        value={trackData.title}
                        onChange={e => {
                          const newList = [...editingBand.soundcloud_links];
                          newList[idx] = { ...trackData, title: e.target.value };
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }}
                        style={{ color: 'white', flex: 1, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }}
                      />
                      <input 
                        placeholder="MP3 Link (Cloud URL)" 
                        value={trackData.url}
                        onChange={e => {
                          const newList = [...editingBand.soundcloud_links];
                          newList[idx] = { ...trackData, url: e.target.value };
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }}
                        style={{ color: 'white', flex: 2, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }}
                      />
                      <button 
                        type="button" 
                        aria-label="Track entfernen"
                        onClick={() => {
                          const newList = editingBand.soundcloud_links.filter((_: any, i: number) => i !== idx);
                          setEditingBand({...editingBand, soundcloud_links: newList});
                        }} 
                        style={{ background: 'rgba(239,68,68,0.15)', padding: '14px', borderRadius: '14px', border: 'none', color: '#ff4d4f', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  type="button" 
                  onClick={() => {
                    const newList = [...(editingBand.soundcloud_links || []), { title: '', url: '' }];
                    setEditingBand({...editingBand, soundcloud_links: newList});
                  }} 
                  style={{ padding: '14px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.9rem', minHeight: '44px', touchAction: 'manipulation' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  + Song hinzufügen
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Videos (YouTube Links)</label>
                {(editingBand.youtube_links || []).map((video: any, idx: number) => {
                  const videoData = typeof video === 'string' ? { title: '', url: video } : video;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        placeholder="Videotitel" 
                        value={videoData.title}
                        onChange={e => {
                          const newList = [...editingBand.youtube_links];
                          newList[idx] = { ...videoData, title: e.target.value };
                          setEditingBand({...editingBand, youtube_links: newList});
                        }}
                        style={{ color: 'white', flex: 1, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }}
                      />
                      <input 
                        placeholder="YouTube URL" 
                        value={videoData.url}
                        onChange={e => {
                          const newList = [...editingBand.youtube_links];
                          newList[idx] = { ...videoData, url: e.target.value };
                          setEditingBand({...editingBand, youtube_links: newList});
                        }}
                        style={{ color: 'white', flex: 2, padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', outline: 'none', minHeight: '44px' }}
                      />
                      <button 
                        type="button" 
                        aria-label="Video entfernen"
                        onClick={() => {
                          const newList = editingBand.youtube_links.filter((_: any, i: number) => i !== idx);
                          setEditingBand({...editingBand, youtube_links: newList});
                        }} 
                        style={{ background: 'rgba(239,68,68,0.15)', padding: '14px', borderRadius: '14px', border: 'none', color: '#ff4d4f', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  type="button" 
                  onClick={() => {
                    const newList = [...(editingBand.youtube_links || []), { title: '', url: '' }];
                    setEditingBand({...editingBand, youtube_links: newList});
                  }} 
                  style={{ padding: '14px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.9rem', minHeight: '44px', touchAction: 'manipulation' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  + Video hinzufügen
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                <button 
                  type="submit" 
                  style={{ flex: 1, background: brandColor, color: '#0f172a', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', boxShadow: `0 10px 30px ${brandColor}40`, transition: 'transform 0.2s', letterSpacing: '0.02em', minHeight: '44px', touchAction: 'manipulation' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Profil aktualisieren
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditBand(false)} 
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '18px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', transition: 'background 0.2s', minHeight: '44px', touchAction: 'manipulation' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 🖼️ Fullscreen Avatar Selection Gallery */}
      {showAvatarPicker && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Avatar auswählen"
          style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(30px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
        >
          <div className="animation-scale-up" style={{ width: '100%', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'white', margin: 0 }}>
                  {avatarPickerType === 'band' ? 'Wähle euer Band-Artwork' : 
                   (user?.role === 'teacher' || user?.role === 'admin' ? 'Wähle deinen Lehrer-Avatar' : 'Wähle deinen Avatar')}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginTop: '8px', fontWeight: 700 }}>
                  {avatarPickerType === 'band' ? 'Klicke auf ein Bild, um es als euer neues Bandprofilbild zu setzen.' : 'Personalisiere dein Profil mit einem neuen Bild.'}
                </p>
              </div>
              <button 
                onClick={() => setShowAvatarPicker(false)} 
                aria-label="Schließen"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
              >
                <X size={32} />
              </button>
            </div>

            {avatarPickerType === 'band' && (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '62px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  {(['Alle', '3', '4', '5'] as const).map(size => {
                    const isSelected = bandAvatarSizeFilter === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setBandAvatarSizeFilter(size)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '14px',
                          border: 'none',
                          background: isSelected ? brandColor : 'transparent',
                          color: isSelected ? '#0f172a' : 'rgba(255,255,255,0.7)',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? `0 0 15px ${brandColor}88` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '44px',
                          touchAction: 'manipulation'
                        }}
                      >
                        {size === 'Alle' ? '🌐 Alle Artworks' : `👥 ${size} Musiker`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {avatarPickerType !== 'band' && !(user?.role === 'teacher' || user?.role === 'admin') && (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '62px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  {(['Alle', 'E-Gitarre', 'E-Piano', 'E-Drum', 'E-Bass', 'Gesang'] as const).map(inst => {
                    const isSelected = avatarInstrumentFilter === inst;
                    return (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => setAvatarInstrumentFilter(inst)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '14px',
                          border: 'none',
                          background: isSelected ? brandColor : 'transparent',
                          color: isSelected ? '#0f172a' : 'rgba(255,255,255,0.7)',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? `0 0 15px ${brandColor}88` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '44px',
                          touchAction: 'manipulation'
                        }}
                      >
                        {inst === 'Alle' && '🌐'}
                        {inst === 'E-Gitarre' && '🎸'}
                        {inst === 'E-Piano' && '🎹'}
                        {inst === 'E-Drum' && '🥁'}
                        {inst === 'E-Bass' && '🎸'}
                        {inst === 'Gesang' && '🎤'}
                        {inst}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '32px', 
              justifyContent: 'center',
              overflowY: 'auto',
              padding: '24px',
              margin: '0 -24px',
              flex: 1
            }}>
              {(() => {
                if (avatarPickerType === 'band') {
                  let list = BAND_AVATARS;
                  if (bandAvatarSizeFilter !== 'Alle') {
                    const numSize = parseInt(bandAvatarSizeFilter, 10);
                    list = list.filter((av: any) => av.size === numSize);
                  }
                  return list.filter((av: any) => !failedAvatarUrls.includes(av.url));
                }
                
                const role = (user?.role || '').toLowerCase();
                let list: any[] = STUDENT_AVATARS;
                if (activePlatform === 'campus') {
                  if (role !== 'student') list = CAMPUS_AVATARS;
                } else if (role === 'teacher' || role === 'admin' || role === 'secretary' || avatarPickerType === 'teacher') {
                  list = TEACHER_AVATARS;
                }
                if (avatarInstrumentFilter !== 'Alle' && !(role === 'teacher' || role === 'admin' || role === 'secretary' || avatarPickerType === 'teacher')) {
                  list = list.filter((av: any) => av.category === avatarInstrumentFilter);
                }

                // Filter out broken images dynamically
                list = list.filter((av: any) => !failedAvatarUrls.includes(av.url));
                
                // Sort alternatingly by girl, boy, girl, boy...
                const getAvatarGender = (av: any) => {
                  const id = (av.id || '').toLowerCase();
                  const url = (av.url || '').toLowerCase();
                  if (id.includes('girl') || id.includes('female') || url.includes('girl') || url.includes('female')) return 'girl';
                  if (id.includes('boy') || id.includes('male') || url.includes('boy') || url.includes('male')) return 'boy';
                  if (id.includes('guitar_alt') || id.includes('eguitar_alt') || id.includes('drums_alt') || id.includes('bass_alt') || id.includes('vocals_alt')) return 'boy';
                  if (id.includes('piano_alt') || id.includes('tech_alt') || id.includes('producer')) return 'girl';
                  return 'neutral';
                };

                // Separate Sonstige/general avatars to place them at the very end
                const sonstige = list.filter((av: any) => av.category === 'Sonstige' || av.id.includes('general'));
                const others = list.filter((av: any) => av.category !== 'Sonstige' && !av.id.includes('general'));

                const girls = others.filter(av => getAvatarGender(av) === 'girl');
                const boys = others.filter(av => getAvatarGender(av) === 'boy');
                const neutral = others.filter(av => getAvatarGender(av) === 'neutral');
                
                const alternated: any[] = [];
                const maxLen = Math.max(girls.length, boys.length);
                for (let i = 0; i < maxLen; i++) {
                  if (i < girls.length) alternated.push(girls[i]);
                  if (i < boys.length) alternated.push(boys[i]);
                }
                alternated.push(...neutral);
                alternated.push(...sonstige);
                list = alternated;
                
                return list;
              })().map(av => {
                const isSelected = avatarPickerType === 'band' 
                  ? selectedBandForProfile?.photo_url === av.url 
                  : user?.photo_url === av.url;
                  
                return (
                  <div 
                    key={av.id} 
                    role="button"
                    tabIndex={0}
                    aria-label={`Avatar auswählen: ${av.id || 'Bild'}`}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                      }
                    }}
                    onClick={async () => {
                      try {
                        if (avatarPickerType === 'band') {
                          const { error } = await supabase.from('bands').update({ photo_url: av.url }).eq('id', selectedBandForProfile.id);
                          if (error) {
                            alert("Fehler beim Auswählen des Band-Profilbilds: " + error.message);
                          } else {
                            setSelectedBandForProfile({...selectedBandForProfile, photo_url: av.url});
                            if (editingBand && editingBand.id === selectedBandForProfile.id) {
                              setEditingBand({...editingBand, photo_url: av.url});
                            }
                            setShowAvatarPicker(false);
                            if (user?.id) fetchDashboardData(user.id);
                          }
                        } else {
                          const { error } = await supabase.from('users').update({ photo_url: av.url, avatar_url: av.url }).eq('id', user?.id);
                          if (!error) {
                            await supabase.from('avatars').update({ asset_path: av.url }).eq('user_id', user?.id);
                            setUser({...user, photo_url: av.url, avatar_url: av.url});
                            setShowAvatarPicker(false);
                            if (user?.id) fetchDashboardData(user.id);
                          }
                        }
                      } catch (err: any) {
                        console.error("Fehler beim Aktualisieren des Avatars:", err);
                      }
                    }}
                    style={{ 
                      width: '220px',
                      height: '220px',
                      borderRadius: '32px', 
                      overflow: 'hidden', 
                      border: isSelected ? `6px solid ${brandColor}` : '4px solid rgba(255,255,255,0.1)', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s',
                      boxShadow: isSelected ? `0 0 40px ${brandColor}66` : '0 10px 30px rgba(0,0,0,0.4)',
                      position: 'relative',
                      flexShrink: 0,
                      touchAction: 'manipulation'
                    }}
                    className="hover-scale"
                  >
                    <img 
                      src={av.url} 
                      loading="lazy"
                      decoding="async"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        display: 'block' 
                      }} 
                      alt=""
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Artist Gateway Modal */}
      <Suspense fallback={null}>
        <ArtistGateway 
          show={!!selectedBandForGateway || !!pendingFounding} 
          onClose={() => {
            gatewayJustClosed.current = true;
            setSelectedBandForGateway(null);
            setPendingFounding(null);
            clearConfetti();
            if (user?.id) {
              fetchDashboardData(user.id, false);
            }
            setTimeout(() => {
              gatewayJustClosed.current = false;
            }, 3000);
          }}
          user={user}
          pendingFounding={pendingFounding}
          selectedBandForGateway={selectedBandForGateway}
          APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS}
        />
      </Suspense>
    </>
  );
};

export default ProfileBandModalsHub;
