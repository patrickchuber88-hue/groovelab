import React from 'react';
import {
  BookOpen, Clock, Disc, Lightbulb, Radio, ShieldCheck, Sliders, Sparkles, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
                subtitle: `${teacher?.first_name || ''} ${teacher?.last_name || ''}`.trim() || 'Musiker-Avatar & Rolle',
                badge: teacher?.instrument || 'Band-Coach',
                gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
                shadowColor: 'rgba(234, 179, 8, 0.35)',
                icon: Sparkles
              },
              {
                id: 'security',
                title: 'Sicherheit & Kiosk-PIN',
                subtitle: teacher?.personal_pin ? '4-stellige Coach-PIN aktiv' : 'Geräte-Pairing & PIN Schutz',
                badge: teacher?.personal_pin ? 'PIN Aktiv' : 'Geschützt',
                gradient: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
                shadowColor: 'rgba(202, 138, 4, 0.40)',
                icon: ShieldCheck
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
                            color: '#ca8a04',
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
                      background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                    }}>
                      {activeTeacherSettingsModal === 'livelab' && <Radio size={22} color="#ffffff" />}
                      {activeTeacherSettingsModal === 'repertoire' && <Disc size={22} color="#ffffff" />}
                      {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && <Sparkles size={22} color="#ffffff" />}
                      {activeTeacherSettingsModal === 'security' && <ShieldCheck size={22} color="#ffffff" />}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        {activeTeacherSettingsModal === 'livelab' && 'Live Lab & Proberaum-Setup'}
                        {activeTeacherSettingsModal === 'repertoire' && 'Repertoire & Song-Standards'}
                        {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && 'Coach-Profil & Musiker-Avatar'}
                        {activeTeacherSettingsModal === 'security' && 'Sicherheit & Kiosk-PIN'}
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                        {activeTeacherSettingsModal === 'livelab' && 'Wähle deinen Standard-Proberaum und automatische Kiosk-Abmeldezeiten im Bandraum.'}
                        {activeTeacherSettingsModal === 'repertoire' && 'Definiere Schwellenwerte für bühnenreife Songs und Band-Vorschlagsrechte.'}
                        {(activeTeacherSettingsModal === 'profile' || activeTeacherSettingsModal === 'avatar') && 'Deine hinterlegten Stammdaten und Musiker-Avatar im GrooveLab-Modul.'}
                        {activeTeacherSettingsModal === 'security' && '4-stellige Coach-PIN und Sicherheitsstatus für den Proberaum.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTeacherSettingsModal(null)}
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
                                    color: isSelected ? '#ca8a04' : '#1e293b',
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
                                    color: isSelected ? '#ca8a04' : '#64748b',
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
                                    color: isSelected ? '#ca8a04' : '#64748b',
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
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isSelected ? '#ca8a04' : '#64748b', textAlign: 'center' }}>
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

                  {/* TAB 4: SECURITY & KIOSK PIN */}
                  {activeTeacherSettingsModal === 'security' && (() => {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
                            <ShieldCheck size={24} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>DSGVO &amp; Datenschutz-Status</strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Dein Account ist mit TLS 1.3 Transport- und AES-256 Server-Verschlüsselung (Art. 32 DSGVO) geschützt.</span>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>Persönliche Coach-PIN (für Kiosk-Freigaben)</strong>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45 }}>
                            Mit dieser 4-stelligen PIN kannst du dich an Kiosk-iPads im Proberaum anmelden oder Schülersitzungen entsperren.
                          </span>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                            <input 
                              type="password"
                              maxLength={4}
                              placeholder="4-stellige PIN"
                              defaultValue={teacher?.personal_pin || ''}
                              id="groovelab_coach_pin_input"
                              style={{ width: '160px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, textAlign: 'center', letterSpacing: '4px' }}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const input = document.getElementById('groovelab_coach_pin_input') as HTMLInputElement;
                                if (!input || !teacher?.id) return;
                                const val = input.value.trim();
                                if (val.length !== 4 || !/^\d{4}$/.test(val)) {
                                  alert('Bitte gib eine gültige 4-stellige Zahlen-PIN ein.');
                                  return;
                                }
                                try {
                                  const { error } = await supabase.from('users').update({ personal_pin: val }).eq('id', teacher.id);
                                  if (error) throw error;
                                  setTeacher((prev: any) => ({ ...prev, personal_pin: val }));
                                  alert('Coach-PIN erfolgreich aktualisiert! 🛡️');
                                } catch (e: any) {
                                  alert('Fehler beim Speichern: ' + e.message);
                                }
                              }}
                              style={{ padding: '10px 18px', borderRadius: '10px', background: '#eab308', color: '#1e293b', border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                              className="hover-scale"
                            >
                              PIN speichern
                            </button>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>Kopplung &amp; Proberaum-Status</strong>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45 }}>
                            Schul-ID: <strong>{teacher?.school_id || 'Aktiv'}</strong><br />
                            Rolle: <strong>GrooveLab Coach (Band-Lehrkraft)</strong><br />
                            Zugriffsberechtigungen: <strong>Live Lab, Song-Bibliothek &amp; Repertoire-Planer</strong>
                          </span>
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
