import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Clock, Disc, Lightbulb, Moon, Radio, ShieldCheck, Sliders, Sparkles, Sun, X, Fingerprint,
  Key, Lock, CheckCircle2, AlertCircle, Trash2, Eye, EyeOff, Loader2, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_QUIET_HOURS_CONFIG, QuietHoursConfig } from '../../utils/chatRespectGuard';
import { isWebAuthnSupported, registerBiometrics } from '../../utils/webauthn';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface TeacherSettingsViewProps {
  teacher: any;
  setTeacher: React.Dispatch<React.SetStateAction<any>>;
  schoolData: any;
  setSchoolData: React.Dispatch<React.SetStateAction<any>>;
  rooms: any[];
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string) => void;
  activeTeacherSettingsModal: any;
  setActiveTeacherSettingsModal: (modal: any) => void;
  setIsFeedbackModalOpen: (open: boolean) => void;
  setIsHelpCenterOpen: (open: boolean) => void;
  windowWidth: number;
}

export const TeacherSettingsView: React.FC<TeacherSettingsViewProps> = ({
  teacher,
  setTeacher,
  schoolData,
  setSchoolData,
  rooms,
  selectedRoomId,
  setSelectedRoomId,
  activeTeacherSettingsModal,
  setActiveTeacherSettingsModal,
  setIsFeedbackModalOpen,
  setIsHelpCenterOpen,
  windowWidth,
}) => {
  // Security, PIN & Passkey state
  const [securityOverview, setSecurityOverview] = useState<{
    has_personal_pin?: boolean;
    has_passkey?: boolean;
    passkey_count?: number;
    passkeys?: Array<{ id: string; device_name: string; created_at: string; counter?: number }>;
    ausweis_nummer?: string;
  } | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [pinSuccessMessage, setPinSuccessMessage] = useState<string | null>(null);
  const [pinErrorMessage, setPinErrorMessage] = useState<string | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [revokingPasskey, setRevokingPasskey] = useState(false);

  // Fetch security overview from authoritative server RPC
  const fetchSecurityOverview = useCallback(async () => {
    if (!teacher?.id) return;
    try {
      setLoadingSecurity(true);
      const { data, error } = await supabase.rpc('get_teacher_security_overview', {
        p_teacher_id: teacher.id
      });
      if (!error && data?.success) {
        setSecurityOverview(data);
      }
    } catch (err: any) {
      console.warn('[TeacherSettingsView] get_teacher_security_overview fallback:', err?.message || err);
    } finally {
      setLoadingSecurity(false);
    }
  }, [teacher?.id]);

  useEffect(() => {
    fetchSecurityOverview();
  }, [fetchSecurityOverview]);
  React.useEffect(() => {
    if (!activeTeacherSettingsModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTeacherSettingsModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTeacherSettingsModal, setActiveTeacherSettingsModal]);

  return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
                <Sliders size={22} strokeWidth={2.4} />
              </div>
              <span>GrooveLab Einstellungen</span>
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
              Konfiguriere Proberaum-Standards, Band-Repertoire, Musiker-Avatare und Sicherheit für dein Studio.
            </p>
          </div>

          {/* MODULAR COVER CARDS GRID */}
          {(() => {
            const groovelabSettings = schoolData?.opening_hours?.groovelab_settings || {
              stage_ready_threshold: 85,
              allow_student_song_proposals: true,
              auto_add_mastered_songs: true,
              kiosk_auto_timeout_minutes: 60
            };

            const currentPreferredRoom = rooms.find((r: any) => teacher?.preferred_room_ids?.includes(r.id)) || rooms[0];

            const modules = [
              {
                id: 'livelab',
                title: 'Live Lab & Proberaum',
                subtitle: currentPreferredRoom ? `${currentPreferredRoom.name || 'Proberaum'} aktiv` : 'Raum-Kopplung & Timeout',
                badge: currentPreferredRoom ? (currentPreferredRoom.name || 'Raum') : 'Standard',
                gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                shadowColor: 'rgba(234, 179, 8, 0.35)',
                icon: Radio
              },
              {
                id: 'repertoire',
                title: 'Repertoire & Songs',
                subtitle: `Stage-Ready ab ${groovelabSettings.stage_ready_threshold || 85}% XP`,
                badge: `${groovelabSettings.stage_ready_threshold || 85}% XP Schwelle`,
                gradient: 'linear-gradient(135deg, #facc15 0%, #d97706 100%)',
                shadowColor: 'rgba(250, 204, 21, 0.40)',
                icon: Disc
              },
              {
                id: 'profile',
                title: 'Coach-Profil & Avatar',
                subtitle: (teacher ? formatTeacherFullName(teacher) : '') || 'Musiker-Avatar & Rolle',
                badge: teacher?.instrument || 'Band-Coach',
                gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
                shadowColor: 'rgba(234, 179, 8, 0.35)',
                icon: Sparkles
              },
              {
                id: 'security',
                title: 'PIN & Login',
                subtitle: (securityOverview?.has_personal_pin || teacher?.has_personal_pin)
                  ? (securityOverview?.has_passkey ? '4-stellige PIN & Passkey aktiv' : '4-stellige PIN aktiv • Passkey hinzufügen')
                  : (securityOverview?.has_passkey ? 'Passkey aktiv • PIN einrichten' : 'PIN & Passkey einrichten'),
                badge: (securityOverview?.has_personal_pin || teacher?.has_personal_pin) ? 'PIN Aktiv ✓' : 'Sicherheit',
                gradient: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
                shadowColor: 'rgba(202, 138, 4, 0.40)',
                icon: ShieldCheck
              },
              {
                id: 'quiet_hours',
                title: 'Chat-Ruhezeiten',
                subtitle: teacher?.quiet_hours?.enabled !== false ? `${teacher?.quiet_hours?.start_time || '19:00'} – ${teacher?.quiet_hours?.end_time || '07:30'} Uhr` : 'Deaktiviert',
                badge: teacher?.quiet_hours?.enabled !== false ? 'Aktiv' : 'Aus',
                gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                shadowColor: 'rgba(99, 102, 241, 0.35)',
                icon: Moon
              },
              {
                id: 'feedback',
                title: 'Ideenschmiede',
                subtitle: 'Song-Wünsche & Feedback melden',
                badge: 'Mitgestalten',
                gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                shadowColor: 'rgba(245, 158, 11, 0.35)',
                icon: Lightbulb
              }
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: windowWidth < 640 ? 'repeat(2, 1fr)' : windowWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '18px',
                  width: '100%'
                }}>
                  {modules.map((module) => {
                    const IconComp = module.icon;
                    return (
                      <div
                        key={module.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${module.title} öffnen: ${module.subtitle}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (module.id === 'feedback') {
                              setIsFeedbackModalOpen(true);
                            } else {
                              setActiveTeacherSettingsModal(module.id as any);
                            }
                          }
                        }}
                        onClick={() => {
                          if (module.id === 'feedback') {
                            setIsFeedbackModalOpen(true);
                          } else {
                            setActiveTeacherSettingsModal(module.id as any);
                          }
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '24px 16px 20px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        className="hover-scale"
                      >
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: module.gradient,
                          boxShadow: `0 8px 18px -3px ${module.shadowColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.25)'
                        }}>
                          <IconComp size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                        </div>
                        <div style={{ marginTop: '14px', padding: '0 4px', width: '100%' }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                            {module.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginTop: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {module.subtitle}
                          </div>
                        </div>
                        {module.badge && (
                          <span style={{
                            marginTop: '10px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: '#854d0e',
                            background: '#fefce8',
                            border: '1px solid #fef08a',
                            padding: '2px 8px',
                            borderRadius: '100px'
                          }}>
                            {module.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* QUICK LINK: HANDBUCH & AKADEMIE */}
                <div style={{ 
                  background: '#fefce8', 
                  borderRadius: '20px', 
                  padding: '18px 24px', 
                  border: '1.5px solid #fef08a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#eab308', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#713f12' }}>
                        Coach-Akademie &amp; Unterrichts-Leitfäden
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#854d0e' }}>
                        Praxis-Tipps für Hausaufgaben-Protokoll, Play-Along Studio, Live Lab und Repertoire-Planer.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHelpCenterOpen(true)}
                    style={{
                      background: '#eab308',
                      color: '#0f172a',
                      border: 'none',
                      padding: '9px 18px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    <BookOpen size={14} /> Leitfäden öffnen
                  </button>
                </div>
              </div>
            );
          })()}

          {/* FOCUS MODAL FOR SELECTED SETTINGS CATEGORY */}
          {activeTeacherSettingsModal && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                boxSizing: 'border-box'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveTeacherSettingsModal(null);
              }}
            >
              <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="teacher-settings-modal-title"
                style={{
                  width: '100%',
                  maxWidth: '620px',
                  maxHeight: '90vh',
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                className="animate-scale-in"
              >
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: activeTeacherSettingsModal === 'quiet_hours' ? 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: activeTeacherSettingsModal === 'quiet_hours' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 4px 12px rgba(234, 179, 8, 0.3)'
                    }}>
                      {activeTeacherSettingsModal === 'livelab' && <Radio size={22} color="#ffffff" />}
                      {activeTeacherSettingsModal === 'repertoire' && <Disc size={22} color="#ffffff" />}
                      {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && <Sparkles size={22} color="#ffffff" />}
                      {activeTeacherSettingsModal === 'security' && <ShieldCheck size={22} color="#ffffff" />}
                      {activeTeacherSettingsModal === 'quiet_hours' && <Moon size={22} color="#ffffff" />}
                    </div>
                    <div>
                      <h3 id="teacher-settings-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        {activeTeacherSettingsModal === 'livelab' && 'Live Lab & Proberaum-Setup'}
                        {activeTeacherSettingsModal === 'repertoire' && 'Repertoire & Song-Standards'}
                        {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && 'Coach-Profil & Musiker-Avatar'}
                        {activeTeacherSettingsModal === 'security' && 'PIN & Login-Sicherheit'}
                        {activeTeacherSettingsModal === 'quiet_hours' && 'Chat-Ruhezeiten & Feierabend'}
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                        {activeTeacherSettingsModal === 'livelab' && 'Wähle deinen Standard-Proberaum und automatische Kiosk-Abmeldezeiten im Bandraum.'}
                        {activeTeacherSettingsModal === 'repertoire' && 'Definiere Schwellenwerte für bühnenreife Songs und Band-Vorschlagsrechte.'}
                        {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && 'Deine hinterlegten Stammdaten und Musiker-Avatar im GrooveLab-Modul.'}
                        {activeTeacherSettingsModal === 'security' && 'Verwalte deine 4-stellige persönliche PIN, biometrische Passkeys (Apple Touch ID / Face ID) und Sperrbildschirm-Freigaben.'}
                        {activeTeacherSettingsModal === 'quiet_hours' && 'Lege fest, wann deine didaktische Ruhezeit gilt. Außerhalb deiner Unterrichtszeiten bleibt deine Freizeit ungestört.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTeacherSettingsModal(null)}
                    aria-label="Einstellungen schließen"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(80vh - 140px)', textAlign: 'left' }}>
                  {/* TAB 1: LIVE LAB & PROBERAUM */}
                  {activeTeacherSettingsModal === 'livelab' && (() => {
                    const currentGrooveSettings = schoolData?.opening_hours?.groovelab_settings || {};
                    const selectedRoomId = (teacher?.preferred_room_ids && teacher.preferred_room_ids[0]) || (rooms[0]?.id || '');
                    const currentTimeout = currentGrooveSettings.kiosk_auto_timeout_minutes || 60;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Preferred Room Selector */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Radio size={18} color="#ca8a04" />
                            <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Bevorzugter Proberaum (Live Lab)</strong>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                            In diesem Raum startet dein Live Lab standardmäßig beim Login.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginTop: '6px' }}>
                            {rooms.map((r: any) => {
                              const isSelected = selectedRoomId === r.id;
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={async () => {
                                    if (!teacher?.id) return;
                                    try {
                                      const updatedRooms = [r.id];
                                      await supabase.from('users').update({ preferred_room_ids: updatedRooms }).eq('id', teacher.id);
                                      setTeacher((prev: any) => ({ ...prev, preferred_room_ids: updatedRooms }));
                                    } catch (err: any) {
                                      alert('Fehler beim Aktualisieren: ' + err.message);
                                    }
                                  }}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid #eab308' : '1px solid #e2e8f0',
                                    background: isSelected ? '#fefce8' : '#ffffff',
                                    color: isSelected ? '#854d0e' : '#1e293b',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.15s'
                                  }}
                                  className="hover-scale"
                                >
                                  {r.name || 'Proberaum'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Auto Session Timeout */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} color="#ca8a04" />
                            <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Kiosk Auto-Logout nach Inaktivität</strong>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                            Schützt Kiosk-iPads im Proberaum vor unbefugter Weiternutzung nach Probenende.
                          </p>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {[45, 60, 90, 120].map((mins) => {
                              const isSelected = currentTimeout === mins;
                              return (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={async () => {
                                    if (!teacher?.school_id || !schoolData) return;
                                    const updatedOpeningHours = {
                                      ...schoolData.opening_hours,
                                      groovelab_settings: {
                                        ...currentGrooveSettings,
                                        kiosk_auto_timeout_minutes: mins
                                      }
                                    };
                                    try {
                                      await supabase.from('schools').update({ opening_hours: updatedOpeningHours }).eq('id', teacher.school_id);
                                      setSchoolData((prev: any) => ({ ...prev, opening_hours: updatedOpeningHours }));
                                    } catch (err: any) {
                                      alert('Fehler beim Speichern: ' + err.message);
                                    }
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: isSelected ? '2px solid #eab308' : '1px solid #cbd5e1',
                                    background: isSelected ? '#fefce8' : '#ffffff',
                                    color: isSelected ? '#854d0e' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                  className="hover-scale"
                                >
                                  {mins} Minuten
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Geofence Status */}
                        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ShieldCheck size={24} color="#ca8a04" />
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#713f12', display: 'block' }}>Ortsgebundener Geofence Aktiv</strong>
                            <span style={{ fontSize: '0.72rem', color: '#a16207' }}>
                              Kiosk-Check-in und Stations-Sync sind sicher an die Koordinaten deiner Schule gebunden.
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB 2: REPERTOIRE & SONG STANDARDS */}
                  {activeTeacherSettingsModal === 'repertoire' && (() => {
                    const currentGrooveSettings = schoolData?.opening_hours?.groovelab_settings || {
                      stage_ready_threshold: 85,
                      allow_student_song_proposals: true,
                      auto_add_mastered_songs: true
                    };

                    const updateGrooveSetting = async (key: string, value: any) => {
                      if (!teacher?.school_id || !schoolData) return;
                      const updatedOpeningHours = {
                        ...schoolData.opening_hours,
                        groovelab_settings: {
                          ...currentGrooveSettings,
                          [key]: value
                        }
                      };
                      try {
                        await supabase.from('schools').update({ opening_hours: updatedOpeningHours }).eq('id', teacher.school_id);
                        setSchoolData((prev: any) => ({ ...prev, opening_hours: updatedOpeningHours }));
                      } catch (err: any) {
                        alert('Fehler beim Speichern: ' + err.message);
                      }
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Stage-Ready Threshold */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Disc size={18} color="#ca8a04" />
                            <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Stage-Ready Schwellenwert (Song-Meisterschaft)</strong>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                            Ab welchem Fortschrittswert gilt ein Song im Live Lab und Repertoire als bühnenreif?
                          </p>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            {[80, 85, 90, 95].map((thresh) => {
                              const isSelected = (currentGrooveSettings.stage_ready_threshold || 85) === thresh;
                              return (
                                <button
                                  key={thresh}
                                  type="button"
                                  onClick={() => updateGrooveSetting('stage_ready_threshold', thresh)}
                                  style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid #eab308' : '1px solid #cbd5e1',
                                    background: isSelected ? '#fefce8' : '#ffffff',
                                    color: isSelected ? '#854d0e' : '#64748b',
                                    fontWeight: 900,
                                    fontSize: '0.86rem',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                  }}
                                  className="hover-scale"
                                >
                                  {thresh}% XP
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Toggle: Student Song Proposals */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          borderRadius: '16px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          gap: '12px'
                        }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.86rem', fontWeight: 800, color: '#1e293b' }}>
                              Song-Vorschläge durch Schüler erlauben
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                              Schüler dürfen eigene Songwünsche für ihre Band vorschlagen.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateGrooveSetting('allow_student_song_proposals', currentGrooveSettings.allow_student_song_proposals === false ? true : false)}
                            className={`app-binary-switch ${currentGrooveSettings.allow_student_song_proposals !== false ? 'active' : ''}`}
                            style={{ backgroundColor: currentGrooveSettings.allow_student_song_proposals !== false ? '#eab308' : undefined, flexShrink: 0 }}
                          >
                            <div className="app-binary-switch-knob" />
                          </button>
                        </div>

                        {/* Toggle: Auto-Add Mastered Songs */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          borderRadius: '16px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          gap: '12px'
                        }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.86rem', fontWeight: 800, color: '#1e293b' }}>
                              Gemeisterte Songs automatisch ins Repertoire
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                              Sobald alle Band-Mitglieder einen Song gemeistert haben, wird er automatisch als Repertoire gelistet.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateGrooveSetting('auto_add_mastered_songs', currentGrooveSettings.auto_add_mastered_songs === false ? true : false)}
                            className={`app-binary-switch ${currentGrooveSettings.auto_add_mastered_songs !== false ? 'active' : ''}`}
                            style={{ backgroundColor: currentGrooveSettings.auto_add_mastered_songs !== false ? '#eab308' : undefined, flexShrink: 0 }}
                          >
                            <div className="app-binary-switch-knob" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB 3: COACH PROFILE & AVATAR */}
                  {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {/* Avatar Selection */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={18} color="#ca8a04" />
                          <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Musiker-Avatar (Live Lab &amp; Sidebar)</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(84px, 1fr))', gap: '12px', marginTop: '4px' }}>
                          {[
                            { url: '/avatars/gitarre_avatar_new.png', name: 'Gitarre' },
                            { url: '/avatars/egitarre_avatar.png', name: 'E-Gitarre' },
                            { url: '/avatars/ebass_avatar.png', name: 'E-Bass' },
                            { url: '/avatars/schlagzeug_avatar.png', name: 'Drums' },
                            { url: '/avatars/klavier_avatar_new.png', name: 'Klavier' },
                            { url: '/avatars/gesang_avatar.png', name: 'Gesang' },
                            { url: '/avatars/trompete_avatar_new.png', name: 'Trompete' },
                            { url: '/avatars/saxophon_avatar_new.png', name: 'Saxophon' },
                            { url: '/avatar_ghost.jpg', name: 'Geist' }
                          ].map((av) => {
                            const isSelected = teacher?.photo_url === av.url || teacher?.avatar_url === av.url;
                            return (
                              <div
                                key={av.url}
                                role="button"
                                tabIndex={0}
                                aria-label={`Musiker-Avatar: ${av.name}${isSelected ? ' (Ausgewählt)' : ''}`}
                                aria-pressed={isSelected}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (!teacher?.id) return;
                                    try {
                                      const { error } = await supabase
                                        .from('users')
                                        .update({ photo_url: av.url, avatar_url: av.url })
                                        .eq('id', teacher.id);
                                      if (error) throw error;
                                      setTeacher((prev: any) => ({ ...prev, photo_url: av.url, avatar_url: av.url }));
                                    } catch (err: any) {
                                      alert('Fehler beim Aktualisieren: ' + err.message);
                                    }
                                  }
                                }}
                                onClick={async () => {
                                  if (!teacher?.id) return;
                                  try {
                                    const { error } = await supabase
                                      .from('users')
                                      .update({ photo_url: av.url, avatar_url: av.url })
                                      .eq('id', teacher.id);
                                    if (error) throw error;
                                    setTeacher((prev: any) => ({ ...prev, photo_url: av.url, avatar_url: av.url }));
                                  } catch (err: any) {
                                    alert('Fehler beim Aktualisieren: ' + err.message);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '10px 6px',
                                  borderRadius: '14px',
                                  background: isSelected ? '#fefce8' : '#ffffff',
                                  border: isSelected ? '2px solid #eab308' : '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? '0 4px 14px rgba(234,179,8,0.25)' : 'none',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-scale"
                              >
                                <img
                                  src={av.url}
                                  alt={av.name}
                                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isSelected ? '#854d0e' : '#64748b', textAlign: 'center' }}>
                                  {av.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Coach Data */}
                      <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : '1fr 1fr', gap: '14px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                          <input 
                            type="text" 
                            readOnly 
                            value={teacher?.first_name || ''} 
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                          <input 
                            type="text" 
                            readOnly 
                            value={teacher?.last_name || ''} 
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: windowWidth < 640 ? 'span 1' : 'span 2' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Rolle</label>
                          <input 
                            type="text" 
                            readOnly 
                            value="GrooveLab Band-Coach" 
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PIN & LOGIN SICHERHEIT */}
                  {activeTeacherSettingsModal === 'security' && (() => {
                    const hasPin = Boolean(securityOverview?.has_personal_pin || teacher?.has_personal_pin);
                    const passkeyCount = securityOverview?.passkey_count || (securityOverview?.passkeys?.length || 0);
                    const hasPasskeys = Boolean(securityOverview?.has_passkey || passkeyCount > 0);

                    // Handler: Save 4-digit Personal PIN via authoritative Server RPC
                    const handleSavePin = async (e?: React.FormEvent) => {
                      if (e) e.preventDefault();
                      if (savingPin || !teacher?.id) return;
                      const cleanPin = newPinInput.trim();

                      if (!/^\d{4}$/.test(cleanPin)) {
                        setPinErrorMessage('Bitte gib eine gültige 4-stellige Zahlen-PIN ein (z. B. 4829).');
                        setPinSuccessMessage(null);
                        return;
                      }

                      const trivialPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
                      if (trivialPins.includes(cleanPin)) {
                        setPinErrorMessage('Diese PIN ist zu einfach zu erraten (bitte keine Reihen wie 1234 oder 0000 wählen).');
                        setPinSuccessMessage(null);
                        return;
                      }

                      setSavingPin(true);
                      setPinErrorMessage(null);
                      setPinSuccessMessage(null);

                      let rpcSuccess = false;
                      let rpcErrorMsg = '';

                      try {
                        // 1. Primary RPC: set_personal_pin(p_user_id, p_pin)
                        const { data: res1, error: err1 } = await supabase.rpc('set_personal_pin', {
                          p_user_id: teacher.id,
                          p_pin: cleanPin
                        });

                        if (!err1 && res1 === true) {
                          rpcSuccess = true;
                        } else if (err1) {
                          // 2. Secondary fallback RPC: set_personal_pin(p_user_id, p_new_pin)
                          const { data: res2, error: err2 } = await supabase.rpc('set_personal_pin', {
                            p_user_id: teacher.id,
                            p_new_pin: cleanPin
                          });
                          if (!err2 && res2 === true) {
                            rpcSuccess = true;
                          } else {
                            rpcErrorMsg = err2?.message || err1?.message || 'Serverfehler beim Speichern der PIN.';
                          }
                        } else {
                          rpcErrorMsg = 'Server hat die PIN-Aktualisierung nicht bestätigt.';
                        }
                      } catch (err: any) {
                        rpcErrorMsg = err?.message || 'Verbindungsfehler beim Speichern der PIN.';
                      } finally {
                        setSavingPin(false);
                      }

                      if (rpcSuccess) {
                        setPinSuccessMessage('Deine 4-stellige PIN wurde erfolgreich und sicher auf dem Server gespeichert!');
                        setNewPinInput('');
                        setTeacher((prev: any) => ({ ...prev, has_personal_pin: true }));
                        setSecurityOverview((prev: any) => prev ? { ...prev, has_personal_pin: true } : { has_personal_pin: true });
                        await fetchSecurityOverview();
                      } else {
                        setPinErrorMessage(rpcErrorMsg || 'Fehler beim Speichern der PIN. Bitte versuche es erneut.');
                      }
                    };

                    // Handler: Register Biometric Passkey (Touch ID / Face ID)
                    const handleRegisterPasskey = async () => {
                      if (registeringPasskey || !teacher?.id) return;
                      if (!isWebAuthnSupported()) {
                        alert('WebAuthn / Biometrie wird von diesem Browser oder Gerät leider nicht unterstützt.');
                        return;
                      }

                      setRegisteringPasskey(true);
                      try {
                        // 1. Request registration challenge from server
                        const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
                          p_user_id: teacher.id,
                          p_type: 'register'
                        });
                        if (chalErr || !chalData?.challenge) {
                          throw new Error('Sicherheits-Challenge konnte nicht bezogen werden: ' + (chalErr?.message || 'Serverfehler'));
                        }

                        const email = teacher.email || `lehrer.${teacher.id.substring(0, 8)}@campus-groovelab.local`;
                        const teacherName = formatTeacherFullName(teacher) || 'Lehrkraft';

                        const passkeyResult = await registerBiometrics(
                          email,
                          teacher.id,
                          chalData.challenge,
                          `${teacherName} (Lehrkraft)`
                        );

                        const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
                        const deviceName = isIOS ? 'Apple Touch ID / Face ID' : 'Passkey Authenticator';

                        const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
                          p_user_id: teacher.id,
                          p_credential_id: passkeyResult.id,
                          p_public_key: JSON.stringify(passkeyResult.response),
                          p_device_name: deviceName,
                          p_challenge: chalData.challenge
                        });

                        if (regErr || !regResult?.success) {
                          throw new Error(regErr?.message || regResult?.error || 'Registrierung fehlgeschlagen.');
                        }

                        alert('Erfolg: Dein biometrischer Passkey wurde erfolgreich auf diesem Gerät aktiviert!');
                        await fetchSecurityOverview();
                      } catch (err: any) {
                        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                          return;
                        }
                        alert('Passkey-Einrichtung fehlgeschlagen: ' + err.message);
                      } finally {
                        setRegisteringPasskey(false);
                      }
                    };

                    // Handler: Revoke all teacher passkeys
                    const handleRevokePasskeys = async () => {
                      if (revokingPasskey || !teacher?.id) return;
                      const teacherName = formatTeacherFullName(teacher) || 'dein Konto';
                      if (!confirm(`Möchtest du alle biometrischen Passkeys für ${teacherName} widerrufen? Dadurch werden alle verknüpften Passkey-Geräte gelöscht und aktive Sitzungen auf anderen Geräten zur Sicherheit beendet.`)) {
                        return;
                      }

                      setRevokingPasskey(true);
                      try {
                        const { data, error } = await supabase.rpc('revoke_teacher_passkeys', {
                          p_teacher_id: teacher.id
                        });
                        if (error) throw error;
                        alert(`Erfolg: ${data?.message || 'Alle Passkeys wurden erfolgreich widerrufen.'}`);
                        await fetchSecurityOverview();
                      } catch (err: any) {
                        alert('Fehler beim Widerrufen der Passkeys: ' + err.message);
                      } finally {
                        setRevokingPasskey(false);
                      }
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* 1. STATUS & ARCHITEKTUR BANNER */}
                        <div style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '18px',
                          padding: '20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '16px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              background: '#fefce8',
                              border: '1px solid #fef08a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ca8a04',
                              flexShrink: 0
                            }}>
                              <ShieldCheck size={26} strokeWidth={2.4} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>PIN &amp; Login-Sicherheitsstatus</strong>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  background: hasPin ? '#dcfce7' : '#fef3c7',
                                  color: hasPin ? '#15803d' : '#b45309',
                                  border: `1px solid ${hasPin ? '#bbf7d0' : '#fde68a'}`
                                }}>
                                  {hasPin ? 'PIN Aktiviert ✓' : 'PIN nicht hinterlegt'}
                                </span>
                                {hasPasskeys && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd'
                                  }}>
                                    {passkeyCount} Passkey(s) aktiv ✓
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                                Mit deiner persönlichen 4-stelligen PIN und Touch ID / Face ID entsperrst du deinen Arbeitsplatz nach Inaktivität (45-Minuten-Sperrbildschirm) sowie Proberaum-Kiosks sekundenschnell ohne Passworteingabe.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={fetchSecurityOverview}
                            disabled={loadingSecurity}
                            title="Sicherheitsstatus neu laden"
                            aria-label="Sicherheitsstatus neu laden"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#64748b',
                              fontSize: '0.76rem',
                              fontWeight: 750,
                              cursor: loadingSecurity ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <RefreshCw size={14} className={loadingSecurity ? 'animate-spin' : ''} />
                            <span>Aktualisieren</span>
                          </button>
                        </div>

                        {/* 2. PERSÖNLICHE 4-STELLIGE PIN VERWALTEN */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '18px',
                          padding: '22px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#fefce8',
                                border: '1px solid #fef08a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ca8a04'
                              }}>
                                <Key size={20} strokeWidth={2.3} />
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>Persönliche 4-stellige PIN</strong>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Schnell-Entsperrung für Bildschirmsperre &amp; Proberaum-iPads</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {hasPin ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '100px', border: '1px solid #bbf7d0' }}>
                                  <CheckCircle2 size={14} /> Aktiviert
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '3px 10px', borderRadius: '100px', border: '1px solid #fde68a' }}>
                                  <AlertCircle size={14} /> Keine PIN hinterlegt
                                </span>
                              )}
                            </div>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                            Lege eine 4-stellige PIN fest. Wird dein Bildschirm nach Inaktivität gesperrt, kannst du ihn mit dieser PIN in 2 Sekunden wieder entsperren.
                          </p>

                          {pinSuccessMessage && (
                            <div style={{
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#15803d',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                              <span>{pinSuccessMessage}</span>
                            </div>
                          )}

                          {pinErrorMessage && (
                            <div style={{
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#b91c1c',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <AlertCircle size={18} style={{ flexShrink: 0 }} />
                              <span>{pinErrorMessage}</span>
                            </div>
                          )}

                          <form onSubmit={handleSavePin} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                            <div style={{ position: 'relative', width: '180px' }}>
                              <input
                                type={showPin ? 'text' : 'password'}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="••••"
                                value={newPinInput}
                                onChange={(e) => {
                                  const filtered = e.target.value.replace(/\D/g, '').slice(0, 4);
                                  setNewPinInput(filtered);
                                  if (pinErrorMessage) setPinErrorMessage(null);
                                  if (pinSuccessMessage) setPinSuccessMessage(null);
                                }}
                                disabled={savingPin}
                                aria-label="Neue 4-stellige PIN"
                                style={{
                                  width: '100%',
                                  padding: '12px 42px 12px 16px',
                                  borderRadius: '12px',
                                  border: '1.5px solid #cbd5e1',
                                  background: '#ffffff',
                                  fontSize: '1.25rem',
                                  fontWeight: 900,
                                  textAlign: 'center',
                                  letterSpacing: '8px',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                aria-label={showPin ? 'PIN verbergen' : 'PIN anzeigen'}
                                style={{
                                  position: 'absolute',
                                  right: '10px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>

                            <button
                              type="submit"
                              disabled={savingPin || newPinInput.trim().length !== 4}
                              style={{
                                padding: '12px 22px',
                                minHeight: '46px',
                                borderRadius: '12px',
                                background: newPinInput.trim().length === 4 ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : '#e2e8f0',
                                color: newPinInput.trim().length === 4 ? '#0f172a' : '#94a3b8',
                                border: 'none',
                                fontWeight: 850,
                                fontSize: '0.86rem',
                                cursor: savingPin || newPinInput.trim().length !== 4 ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: newPinInput.trim().length === 4 ? '0 4px 14px rgba(234, 179, 8, 0.35)' : 'none',
                                transition: 'all 0.15s ease',
                                touchAction: 'manipulation'
                              }}
                            >
                              {savingPin ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                              <span>{hasPin ? 'Neue PIN speichern' : 'PIN aktivieren'}</span>
                            </button>
                          </form>
                        </div>

                        {/* 3. BIOMETRISCHER PASSKEY (APPLE TOUCH ID / FACE ID) */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '18px',
                          padding: '22px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#16a34a'
                              }}>
                                <Fingerprint size={22} strokeWidth={2.3} />
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>Biometrischer Passkey (Touch ID / Face ID)</strong>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Passwortloser Zugang mit Fingerabdruck oder Gesichtsscan</span>
                              </div>
                            </div>
                            <div>
                              {isWebAuthnSupported() ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                  Gerät unterstützt Biometrie ✓
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                  Nicht unterstützt
                                </span>
                              )}
                            </div>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                            Verknüpfe dieses Gerät (MacBook, iPad, iPhone oder Windows PC) mit deinem persönlichen biometrischen Passkey. Deine Biometrie verbleibt zu 100 % lokal auf deinem Endgerät und wird niemals über das Netzwerk übertragen (Art. 9 DSGVO / Zero-Biometrie-Transfer).
                          </p>

                          {/* LIST OF REGISTERED PASSKEYS */}
                          {securityOverview?.passkeys && securityOverview.passkeys.length > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px' }}>
                              <strong style={{ fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                                Registrierte Geräte &amp; Passkeys ({securityOverview.passkeys.length})
                              </strong>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {securityOverview.passkeys.map((cred: any, idx: number) => (
                                  <div key={cred.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Fingerprint size={16} color="#16a34a" />
                                      <span style={{ fontSize: '0.82rem', fontWeight: 750, color: '#0f172a' }}>{cred.device_name || 'Passkey-Gerät'}</span>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                                      {cred.created_at ? new Date(cred.created_at).toLocaleDateString('de-DE') : 'Aktiv'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleRegisterPasskey}
                              disabled={registeringPasskey || !isWebAuthnSupported()}
                              style={{
                                padding: '12px 20px',
                                minHeight: '46px',
                                borderRadius: '12px',
                                background: '#1e293b',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                cursor: registeringPasskey || !isWebAuthnSupported() ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                touchAction: 'manipulation',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                            >
                              {registeringPasskey ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                              <span>Touch ID / Face ID auf diesem Gerät aktivieren</span>
                            </button>

                            {hasPasskeys && (
                              <button
                                type="button"
                                onClick={handleRevokePasskeys}
                                disabled={revokingPasskey}
                                style={{
                                  padding: '12px 18px',
                                  minHeight: '46px',
                                  borderRadius: '12px',
                                  background: 'transparent',
                                  color: '#dc2626',
                                  border: '1.5px solid #fecaca',
                                  fontWeight: 750,
                                  fontSize: '0.82rem',
                                  cursor: revokingPasskey ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  touchAction: 'manipulation',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {revokingPasskey ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                <span>Alle Passkeys widerrufen</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 4. KOPPLUNG & KIOSK-INFOS */}
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>Kopplung &amp; Proberaum-Status</strong>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5 }}>
                            Schul-ID: <strong>{teacher?.school_id || 'Aktiv'}</strong><br />
                            Schulausweis-ID: <strong>{securityOverview?.ausweis_nummer || teacher?.ausweis_nummer || teacher?.id?.substring(0, 8) || '–'}</strong><br />
                            Rolle: <strong>GrooveLab Coach (Lehrkraft)</strong><br />
                            Sperrbildschirm-Schutz: <strong>Aktiviert (45 Min. Inaktivitätssperre)</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {activeTeacherSettingsModal === 'quiet_hours' && (() => {
                    const currentConfig: QuietHoursConfig = teacher?.quiet_hours || DEFAULT_QUIET_HOURS_CONFIG;
                    const isEnabled = currentConfig.enabled !== false;
                    const startTime = currentConfig.start_time || '19:00';
                    const endTime = currentConfig.end_time || '07:30';
                    const isWeekendAllDay = currentConfig.weekend_all_day !== false;

                    const updateConfig = async (newConfig: QuietHoursConfig) => {
                      if (!teacher?.id) return;
                      try {
                        await supabase.from('users').update({ quiet_hours: newConfig }).eq('id', teacher.id);
                        setTeacher((prev: any) => ({ ...prev, quiet_hours: newConfig }));
                      } catch (err: any) {
                        console.error('[TeacherSettings] Error updating quiet hours:', err);
                      }
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Toggle Active / Inactive */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isEnabled ? '#f0fdf4' : '#f8fafc',
                          border: `1.5px solid ${isEnabled ? '#86efac' : '#e2e8f0'}`,
                          borderRadius: '16px',
                          padding: '16px 18px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: isEnabled ? '#dcfce7' : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isEnabled ? '#16a34a' : '#64748b'
                            }}>
                              <Moon size={20} strokeWidth={2.4} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0f172a' }}>
                                Ruhezeit-Schutz aktivieren
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                {isEnabled ? 'Schutz aktiv – Schüler sehen außerhalb deiner Dienstzeiten den Abwesenheitshinweis' : 'Deaktiviert – Nachrichten werden ohne Ruhezeit-Banner empfangen'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateConfig({ ...currentConfig, enabled: !isEnabled })}
                            style={{
                              width: '46px',
                              height: '26px',
                              borderRadius: '100px',
                              border: 'none',
                              background: isEnabled ? '#16a34a' : '#cbd5e1',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s',
                              padding: 0
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              position: 'absolute',
                              top: '3px',
                              left: isEnabled ? '23px' : '3px',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                          </button>
                        </div>

                        {/* Time Pickers */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '14px',
                          opacity: isEnabled ? 1 : 0.45,
                          pointerEvents: isEnabled ? 'auto' : 'none'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Moon size={14} color="#64748b" />
                              <span>Beginn der Ruhezeit (abends):</span>
                            </label>
                            <input
                              type="time"
                              value={startTime}
                              onChange={(e) => updateConfig({ ...currentConfig, start_time: e.target.value })}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                outline: 'none',
                                background: '#ffffff'
                              }}
                            />
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Standard: 19:00 Uhr</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sun size={14} color="#f59e0b" />
                              <span>Ende der Ruhezeit (morgens):</span>
                            </label>
                            <input
                              type="time"
                              value={endTime}
                              onChange={(e) => updateConfig({ ...currentConfig, end_time: e.target.value })}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                outline: 'none',
                                background: '#ffffff'
                              }}
                            />
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Standard: 07:30 Uhr</span>
                          </div>
                        </div>

                        {/* Weekend Toggle */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '12px 16px',
                          opacity: isEnabled ? 1 : 0.45,
                          pointerEvents: isEnabled ? 'auto' : 'none'
                        }}>
                          <div>
                            <div style={{ fontWeight: 750, fontSize: '0.82rem', color: '#1e293b' }}>
                              Wochenende ganztägig geschützt
                            </div>
                            <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                              Samstag und Sonntag gilt durchgehend die Ruhezeit
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateConfig({ ...currentConfig, weekend_all_day: !isWeekendAllDay })}
                            style={{
                              width: '42px',
                              height: '24px',
                              borderRadius: '100px',
                              border: 'none',
                              background: isWeekendAllDay ? '#6366f1' : '#cbd5e1',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s',
                              padding: 0
                            }}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              position: 'absolute',
                              top: '3px',
                              left: isWeekendAllDay ? '21px' : '3px',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                          </button>
                        </div>

                        {/* Reset to Default Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <button
                            type="button"
                            onClick={() => updateConfig(DEFAULT_QUIET_HOURS_CONFIG)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #cbd5e1',
                              borderRadius: '10px',
                              padding: '6px 14px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#64748b',
                              cursor: 'pointer'
                            }}
                            className="hover-scale"
                          >
                            ↺ Auf Standard zurücksetzen (19:00–07:30 Uhr)
                          </button>
                        </div>

                        {/* Legal & Didactic Autonomy Card */}
                        <div style={{
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                          border: '1px solid #bbf7d0',
                          borderRadius: '14px',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.78rem', color: '#166534' }}>
                            <ShieldCheck size={16} color="#16a34a" />
                            <span>Didaktische Autonomie & geschützte Ruhezeiten</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d', lineHeight: 1.45 }}>
                            Außerhalb deiner Unterrichts- und Dienstzeiten besteht keine Pflicht zur ständigen Erreichbarkeit. Im Chatfenster von Schülern wird dein Feierabend-Banner eingeblendet:
                            <br />
                            <em style={{ display: 'block', marginTop: '6px', padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534' }}>
                              „<Moon size={13} color="#166534" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />{teacher ? formatTeacherFullName(teacher) : 'Lehrkraft'} hat Feierabend: Deine Nachricht wird zugestellt und am nächsten Schultag beantwortet. Dringende Absagen bitte direkt per E-Mail senden.“
                            </em>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setActiveTeacherSettingsModal(null)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    className="hover-scale"
                  >
                    Fertig
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

  );
};
